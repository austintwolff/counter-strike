#!/usr/bin/env python3
"""Turn an OpenStreetMap extract of a golf course into the game's course data.

  python3 import_course.py <extract.osm> <id> [--holes 1-9] [--plot out.png] [--extra extra.json]

Coordinates come out in yards, x east and y south, around the middle of the chosen holes.
Only features near those holes are kept. Map data © OpenStreetMap contributors, ODbL.
"""
import sys, json, math, argparse
import xml.etree.ElementTree as ET

YD = 1.0936133
def load(path):
    root = ET.parse(path).getroot(); nodes, ways, rels, trees = {}, {}, [], []
    for el in root:
        t = {x.get('k'): x.get('v') for x in el.findall('tag')}
        if el.tag == 'node':
            nodes[el.get('id')] = (float(el.get('lat')), float(el.get('lon')))
            if t.get('natural') == 'tree': trees.append((el.get('id'), t))
        elif el.tag == 'way': ways[el.get('id')] = ([n.get('ref') for n in el.findall('nd')], t)
        elif el.tag == 'relation': rels.append(([(m.get('type'), m.get('ref'), m.get('role')) for m in el.findall('member')], t))
    return nodes, ways, rels, trees

def rdp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]; dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9; best, bi = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs((pts[i][0] - x1) * dy - (pts[i][1] - y1) * dx) / L
        if d > best: best, bi = d, i
    if best <= eps: return [pts[0], pts[-1]]
    return rdp(pts[:bi + 1], eps)[:-1] + rdp(pts[bi:], eps)
def simp_poly(pts, eps):
    if pts[0] == pts[-1]: pts = pts[:-1]
    if len(pts) < 4: return pts
    far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    out = rdp(pts[:far + 1], eps)[:-1] + rdp(pts[far:] + [pts[0]], eps)[:-1]
    return out if len(out) >= 3 else pts
def area(p): return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2
def bbox(p): xs = [q[0] for q in p]; ys = [q[1] for q in p]; return min(xs), min(ys), max(xs), max(ys)
def flat(p): return [round(v, 1) for q in p for v in q]
def length(p): return sum(math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) for i in range(len(p) - 1))

ROADW = {'motorway': 16, 'trunk': 14, 'primary': 13, 'secondary': 11, 'tertiary': 9, 'residential': 7.5, 'unclassified': 7, 'service': 4.5, 'motorway_link': 8, 'primary_link': 8}
PATHS = {'footway', 'path', 'cycleway', 'track', 'pedestrian', 'steps'}

def course_rings(nodes, ways, rels, name):
    """Outlines, in lat/lon, of the mapped golf course whose name best matches. A course is one closed way or a relation of outer ways."""
    words = lambda s: set(w for w in ''.join(ch.lower() if ch.isalnum() else ' ' for ch in s or '').split() if w not in ('golf', 'course', 'club', 'the', 'municipal', 'country'))
    want, found = words(name), []
    def stitch(segs):  # join ways end to end into closed rings
        segs = [list(s) for s in segs if len(s) > 1]; rings = []
        while segs:
            r = segs.pop(0)
            while r[0] != r[-1]:
                for i, s2 in enumerate(segs):
                    if s2[0] == r[-1]: r += s2[1:]; segs.pop(i); break
                    if s2[-1] == r[-1]: r += s2[-2::-1]; segs.pop(i); break
                else: break
            if r[0] == r[-1] and len(r) > 3: rings.append([nodes[i] for i in r if i in nodes])
        return rings
    for nd, t in ways.values():
        if t.get('leisure') == 'golf_course': found.append((len(want & words(t.get('name'))), stitch([nd])))
    for members, t in rels:
        if t.get('leisure') == 'golf_course': found.append((len(want & words(t.get('name'))), stitch([ways[ref][0] for typ, ref, role in members if typ == 'way' and role in ('outer', '') and ref in ways])))
    found = [f for f in found if f[0] and f[1]]
    return max(found, key=lambda f: f[0])[1] if found else []
def in_ring(ring, q):
    c = False
    for i in range(len(ring)):
        (y1, x1), (y2, x2) = ring[i], ring[(i + 1) % len(ring)]
        if (y1 > q[0]) != (y2 > q[0]) and q[1] < (x2 - x1) * (q[0] - y1) / (y2 - y1) + x1: c = not c
    return c

def build(path, cid, holes=range(1, 10), margin=150, extra=None, course=None):
    nodes, ways, rels, trees = load(path)
    # Two courses that share a property both have a hole 1. Keep the holes that lie inside the course that was asked for;
    # failing that, the ones that join up with their neighbours (a green sits near the next tee).
    cands = {}
    for wid, (nd, t) in ways.items():
        if t.get('golf') == 'hole' and (t.get('ref') or '').isdigit() and sum(i in nodes for i in nd) > 1: cands.setdefault(int(t['ref']), []).append(wid)
    if any(len(v) > 1 for v in cands.values()):
        rings = course_rings(nodes, ways, rels, course) if course else []
        ends = lambda wid: (lambda p: (p[0], p[len(p) // 2], p[-1]))([nodes[i] for i in ways[wid][0] if i in nodes])
        for n, v in cands.items():
            inside = [w for w in v if any(in_ring(r, ends(w)[1]) for r in rings)]
            if inside: v[:] = inside
        gap = lambda a, b: math.hypot(a[0] - b[0], (a[1] - b[1]) * math.cos(math.radians(a[0])))
        for n in sorted(cands):
            v = cands[n]
            if len(v) > 1:
                prev, nxt = cands.get(n - 1, []), cands.get(n + 1, [])
                v[:] = [min(v, key=lambda w: (gap(ends(prev[0])[2], ends(w)[0]) if len(prev) == 1 else 0) + (gap(ends(w)[2], ends(nxt[0])[0]) if len(nxt) == 1 else 0))]
    hole_ways = {n: v[0] for n, v in cands.items()}
    # the card, where the map carries it: par, handicap and the longest tee
    auto = {}
    for n, wid in hole_ways.items():
        t = ways[wid][1]; yd = [int(float(v.split()[0])) for k, v in t.items() if k.startswith('dist:') and v.split() and v.split()[0].replace('.', '').isdigit()]
        auto[n] = {'par': int(t['par']) if (t.get('par') or '').isdigit() else None, 'yd': max(yd) if yd else None, 'hcp': int(t['handicap']) if (t.get('handicap') or '').isdigit() else None}
    if extra and extra.get('origin'):  # hand-traced hole lines: yards east and south of a stated origin
        la, lo = extra['origin']; ex = math.cos(math.radians(la)) * 111320 * YD; ey = 110574 * YD
        for h in extra.get('holes', []): hole_ways[h['n']] = {'line': [(la - y / ey, lo + x / ex) for x, y in h['yd']]}
    want = [n for n in holes if n in hole_ways]
    def ll_of(n): h = hole_ways[n]; return [tuple(p) for p in h['line']] if isinstance(h, dict) else [nodes[i] for i in ways[h][0] if i in nodes]
    pts = [p for n in want for p in ll_of(n)]
    lat0 = (min(p[0] for p in pts) + max(p[0] for p in pts)) / 2; lon0 = (min(p[1] for p in pts) + max(p[1] for p in pts)) / 2
    kx = math.cos(math.radians(lat0)) * 111320 * YD; ky = 110574 * YD
    P = lambda ll: ((ll[1] - lon0) * kx, -(ll[0] - lat0) * ky)
    lines = {n: [P(p) for p in ll_of(n)] for n in want}
    X = [q[0] for l in lines.values() for q in l]; Y = [q[1] for l in lines.values() for q in l]
    box = (min(X) - margin, min(Y) - margin, max(X) + margin, max(Y) + margin)
    near = lambda p: (lambda b: b[2] >= box[0] and b[0] <= box[2] and b[3] >= box[1] and b[1] <= box[3])(bbox(p))
    way_pts = lambda wid: [P(nodes[i]) for i in ways[wid][0] if i in nodes]
    hp = [q for l in lines.values() for i in range(len(l) - 1) for q in [(l[i][0] + (l[i + 1][0] - l[i][0]) * k / 8, l[i][1] + (l[i + 1][1] - l[i][1]) * k / 8) for k in range(9)]]
    close_to_holes = lambda p, d: any((q[0] - a[0]) ** 2 + (q[1] - a[1]) ** 2 < d * d for q in p[::max(1, len(p) // 12)] + [p[-1]] for a in hp)
    G = {k: [] for k in ('fair', 'green', 'tee', 'bunker', 'rough', 'water', 'wood', 'scrub', 'rock', 'building', 'pitch', 'pool', 'parking')}
    streams, roads, paths, rails, boundary, seen = [], [], [], [], None, set()
    def add_poly(kind, p, eps=.5, tags=None):
        if len(p) < 4 or not near(p): return
        q = simp_poly(p, eps)
        if len(q) < 3 or area(q) < 3: return
        G[kind].append(flat(q) if kind not in ('pitch',) else {'p': flat(q), 'sport': (tags or {}).get('sport', '')})
    def classify(t):
        g = t.get('golf')
        if g == 'green': return 'green'
        if g == 'fairway': return 'fair'
        if g == 'tee': return 'tee'
        if g == 'bunker' or t.get('natural') == 'sand': return 'bunker'
        if g == 'rough': return 'rough'
        if g in ('water_hazard', 'lateral_water_hazard') or t.get('natural') == 'water': return 'water'
        if t.get('natural') == 'wood' or t.get('landuse') == 'forest': return 'wood'
        if t.get('natural') == 'scrub': return 'scrub'
        if t.get('natural') in ('bare_rock', 'rock', 'scree'): return 'rock'
        if t.get('building'): return 'building'
        if t.get('leisure') == 'pitch': return 'pitch'
        if t.get('leisure') == 'swimming_pool': return 'pool'
        if t.get('amenity') == 'parking': return 'parking'
    for wid, (nd, t) in ways.items():
        p = way_pts(wid); closed = len(nd) > 3 and nd[0] == nd[-1]
        if t.get('leisure') == 'golf_course' and closed and near(p):
            if boundary is None or area(p) > area(boundary): boundary = p
            continue
        k = classify(t)
        if k == 'building' and closed and not close_to_holes(p, 140): continue  # only the houses that edge the holes
        if k and closed: add_poly(k, p, .9 if k == 'building' else .3 if k in ('green', 'tee', 'bunker') else .6, t); seen.add(wid); continue
        if t.get('waterway') in ('stream', 'river', 'drain', 'ditch', 'canal') and len(p) > 1 and near(p):
            streams.append({'p': flat(rdp(p, .5)), 'w': {'river': 7, 'stream': 4, 'drain': 2.5, 'ditch': 2.5, 'canal': 6}[t['waterway']], 'dry': t.get('intermittent') == 'yes' or t['waterway'] in ('drain', 'ditch'), 'name': t.get('name', '')})
        hw = t.get('highway')
        if (t.get('golf') in ('cartpath', 'path') or hw in PATHS) and len(p) > 1 and near(p) and t.get('footway') != 'sidewalk' and close_to_holes(p, 90):
            paths.append({'p': flat(rdp(p, .6)), 'cart': t.get('golf') == 'cartpath' or t.get('golf') == 'path', 'bridge': t.get('bridge') in ('yes', 'boardwalk', 'viaduct')})
        elif t.get('railway') in ('rail', 'light_rail') and len(p) > 1 and near(p) and close_to_holes(p, 190): rails.append({'p': flat(rdp(p, .5))})
        elif hw in ROADW and len(p) > 1 and near(p) and close_to_holes(p, 190):
            roads.append({'p': flat(rdp(p, .6)), 'w': ROADW[hw], 'name': t.get('name', ''), 'bridge': t.get('bridge') == 'yes'})
    for members, t in rels:  # multipolygons: take each closed outer ring
        k = classify(t)
        if not k and t.get('leisure') != 'golf_course': continue
        for typ, ref, role in members:
            if typ == 'way' and role in ('outer', '') and ref in ways and ref not in seen:
                nd = ways[ref][0]; p = way_pts(ref)
                if len(nd) > 3 and nd[0] == nd[-1]:
                    if t.get('leisure') == 'golf_course':
                        if near(p) and (boundary is None or area(p) > area(boundary)): boundary = p
                    else: add_poly(k, p, .6, t)
    def centre(f): return (sum(f[0::2]) / (len(f) // 2), sum(f[1::2]) / (len(f) // 2))
    for n, l in lines.items():  # a hole line must end on a green: where the map has that green tagged as a tee, treat it as the green
        if any(math.hypot(centre(g)[0] - l[-1][0], centre(g)[1] - l[-1][1]) < 35 for g in G['green']): continue
        for i, t in enumerate(G['tee']):
            if len(t) >= 12 and math.hypot(centre(t)[0] - l[-1][0], centre(t)[1] - l[-1][1]) < 15: G['green'].append(G['tee'].pop(i)); print('hole', n, ': a tee at the end of the line is taken as its green'); break
    for n, l in lines.items():  # the card is played from the back tee: pick the mapped tee box that makes the hole closest to its card length
        card = ((extra or {}).get('card') or {}).get(str(n)) or (auto.get(n) or {}).get('yd')
        if not card: continue
        rest = length(l[1:]); best = None
        for t in G['tee']:
            c = centre(t)
            if math.hypot(c[0] - l[0][0], c[1] - l[0][1]) > 75: continue
            total = math.hypot(c[0] - l[1][0], c[1] - l[1][1]) + rest
            if best is None or abs(total - card) < abs(best[0] - card): best = (total, c)
        if best and abs(best[0] - card) < abs(length(l) - card): l[0] = best[1]
    def inside(poly, q):
        x, y = q; c = False
        for i in range(len(poly)):
            (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % len(poly)]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
        return c
    if boundary and not all(inside(boundary, l[0]) and inside(boundary, l[-1]) for l in lines.values()): boundary = None  # not the whole property: do without
    tr = []
    for nid, t in trees:
        x, y = P(nodes[nid])
        if box[0] <= x <= box[2] and box[1] <= y <= box[3]: tr.append([round(x, 1), round(y, 1), (t.get('species') or t.get('genus') or t.get('taxon') or t.get('leaf_type') or '')[:24]])
    for k, v in ((extra or {}).get('add') or {}).items():  # hand-traced additions, in lat/lon
        for item in v:
            p = [P(tuple(q)) for q in item]
            if k in G: G[k].append(flat(simp_poly(p, .3)))
    out = {'id': cid, 'origin': [round(lat0, 6), round(lon0, 6)], 'lines': {n: flat(rdp(lines[n], .8) if len(lines[n]) > 2 else lines[n]) for n in want}, 'len': {n: round(length(lines[n])) for n in want}, 'card': {n: auto[n] for n in want if n in auto},
           'boundary': flat(simp_poly(boundary, 1.2)) if boundary else None, 'streams': streams, 'roads': roads, 'paths': paths, 'rails': rails, 'trees': tr, **G}
    return out

def plot(c, path, scale=1.3):
    from PIL import Image, ImageDraw
    xs, ys = [], []
    for l in c['lines'].values(): xs += l[0::2]; ys += l[1::2]
    x0, y0, x1, y1 = min(xs) - 160, min(ys) - 160, max(xs) + 160, max(ys) + 160
    T = lambda f: [((f[i] - x0) * scale, (f[i + 1] - y0) * scale) for i in range(0, len(f), 2)]
    im = Image.new('RGB', (int((x1 - x0) * scale), int((y1 - y0) * scale)), (176, 160, 110)); d = ImageDraw.Draw(im)
    if c['boundary']: d.polygon(T(c['boundary']), fill=(86, 128, 62))
    col = {'wood': (40, 78, 44), 'scrub': (70, 100, 60), 'rough': (70, 118, 56), 'parking': (120, 120, 120), 'fair': (120, 180, 86), 'water': (50, 120, 170), 'rock': (200, 196, 180), 'tee': (150, 200, 120), 'green': (170, 232, 140), 'bunker': (240, 230, 190), 'building': (150, 110, 90), 'pool': (90, 190, 230)}
    for k in ('wood', 'scrub', 'rough', 'parking', 'fair', 'water', 'rock', 'tee', 'green', 'bunker', 'building', 'pool'):
        for p in c[k]: d.polygon(T(p), fill=col[k])
    for p in c['pitch']: d.polygon(T(p['p']), fill=(60, 150, 90), outline=(255, 255, 255))
    for s in c['streams']: d.line(T(s['p']), fill=(60, 130, 180), width=max(2, int(s['w'] * scale)))
    for r in c['roads']: d.line(T(r['p']), fill=(90, 90, 90), width=max(2, int(r['w'] * scale)))
    for p in c['paths']: d.line(T(p['p']), fill=(230, 215, 170) if not p['bridge'] else (150, 90, 40), width=2)
    for x, y, s in c['trees']: X, Y = (x - x0) * scale, (y - y0) * scale; d.ellipse((X - 5, Y - 5, X + 5, Y + 5), fill=(30, 70, 34))
    for n, l in c['lines'].items():
        t = T(l); d.line(t, fill=(255, 255, 255), width=2); d.ellipse((t[0][0] - 5, t[0][1] - 5, t[0][0] + 5, t[0][1] + 5), fill=(255, 220, 60)); mx, my = t[len(t) // 2]
        d.text((mx + 6, my - 6), f'{n} ({c["len"][n]}y)', fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    for gx in range(int(x0 // 100) * 100, int(x1), 100): X = (gx - x0) * scale; d.line([(X, 0), (X, 8)], fill=(255, 255, 255)); d.text((X + 2, 8), str(gx), fill=(255, 255, 255))
    for gy in range(int(y0 // 100) * 100, int(y1), 100): Y = (gy - y0) * scale; d.line([(0, Y), (8, Y)], fill=(255, 255, 255)); d.text((10, Y - 5), str(gy), fill=(255, 255, 255))
    im.save(path); print('plot', path, im.size)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('osm'); ap.add_argument('id'); ap.add_argument('--holes', default='1-9'); ap.add_argument('--plot'); ap.add_argument('--extra'); ap.add_argument('--out'); ap.add_argument('--margin', type=float, default=150)
    a = ap.parse_args(); lo, hi = map(int, a.holes.split('-')); extra = json.load(open(a.extra)) if a.extra else None
    c = build(a.osm, a.id, range(lo, hi + 1), a.margin, extra)
    print(a.id, 'holes', sorted(c['lines']), 'lengths', c['len'], {k: len(v) for k, v in c.items() if isinstance(v, list)}, 'boundary', bool(c['boundary']))
    s = json.dumps(c, separators=(',', ':')); print('size', len(s), 'bytes')
    if a.out: open(a.out, 'w').write(s)
    if a.plot: plot(c, a.plot)
