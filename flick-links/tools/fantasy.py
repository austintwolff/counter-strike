#!/usr/bin/env python3
"""Build a course that never existed on ground that does (see COURSES.md, "Fantasy courses").

  python3 tools/fantasy.py view <terrain id> <out.jpg> [x0 y0 x1 y1] [--scale px-per-yard] [--design file ...]
      a gridded picture of the real ground (yards east and south of the terrain's centre) to lay holes out on
  python3 tools/fantasy.py build <design.json>
      writes data/<id>.json for the game from a design: hole lines on that ground, with their greens, tees and bunkers
  python3 tools/fantasy.py room <design.json> <x> <y> [radius]
      the nearest ground clear enough for a tee or a green, and the widest clear pockets near that point
  python3 tools/fantasy.py plan <id> <out.jpg> [x0 y0 x1 y1 scale]
      what was built, drawn on the painted ground with a grid; ground too steep to mow is tinted amber

The ground comes from tools/terrain.py. Needs numpy, scipy, contourpy, shapely, Pillow.
"""
import sys, os, math, json, base64, io
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from terrain import Terrain, CACHE

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

# ───────── the map
def osm(cid, T):
    """Features of the downloaded map, in the terrain's yards."""
    r = ET.parse(os.path.join(CACHE, cid + '.osm')).getroot(); nodes = {}; ways = {}; F = {k: [] for k in ('water', 'stream', 'path', 'road', 'glacier', 'building', 'point', 'rapid', 'sand', 'scree', 'wood', 'cliff', 'rock')}
    for n in r.iter('node'):
        nodes[n.get('id')] = T.P(float(n.get('lat')), float(n.get('lon'))); t = {x.get('k'): x.get('v') for x in n.iter('tag')}
        if t.get('name') and (t.get('natural') or t.get('place') or t.get('tourism') or t.get('waterway') or t.get('amenity')): F['point'].append((nodes[n.get('id')], t.get('name'), t.get('natural') or t.get('tourism') or t.get('waterway') or ''))
        if t.get('waterway') in ('rapids', 'waterfall') or t.get('whitewater'): F['rapid'].append((nodes[n.get('id')], t.get('name', ''), t.get('waterway', '')))
    def kind(t):
        if t.get('natural') == 'water' or t.get('waterway') == 'riverbank': return 'water'
        if t.get('natural') == 'glacier': return 'glacier'
        if t.get('building'): return 'building'
        if t.get('natural') in ('sand', 'beach', 'shingle'): return 'sand'
        if t.get('natural') == 'scree': return 'scree'
        if t.get('natural') == 'bare_rock': return 'rock'
        if t.get('natural') == 'wood' or t.get('landuse') == 'forest': return 'wood'
    for w in r.iter('way'):
        nd = [x.get('ref') for x in w.iter('nd')]; t = {x.get('k'): x.get('v') for x in w.iter('tag')}; ways[w.get('id')] = (nd, t); p = [nodes[i] for i in nd if i in nodes]
        if len(p) < 2: continue
        k = kind(t)
        if k and nd[0] == nd[-1] and len(p) > 3: F[k].append({'p': p[:-1], 'name': t.get('name', ''), 'tags': t})
        elif t.get('waterway') in ('stream', 'river', 'canal', 'drain', 'ditch'): F['stream'].append({'p': p, 'name': t.get('name', ''), 'river': t['waterway'] == 'river', 'dry': t.get('intermittent') == 'yes'})
        elif t.get('waterway') in ('rapids', 'waterfall'): F['rapid'].append((p[len(p) // 2], t.get('name', ''), t['waterway']))
        elif t.get('highway') in ('path', 'footway', 'track', 'bridleway', 'steps', 'cycleway'): F['path'].append({'p': p, 'name': t.get('name', ''), 'bridge': t.get('bridge') in ('yes', 'suspension', 'boardwalk')})
        elif t.get('highway'): F['road'].append({'p': p, 'name': t.get('name', '')})
        elif t.get('natural') == 'cliff': F['cliff'].append({'p': p})
    for rel in r.iter('relation'):  # multipolygons: stitch the outer ways into rings
        t = {x.get('k'): x.get('v') for x in rel.iter('tag')}; k = kind(t)
        if not k: continue
        for role in ('outer', 'inner'):
            segs = [list(ways[m.get('ref')][0]) for m in rel.iter('member') if m.get('type') == 'way' and (m.get('role') or 'outer') == role and m.get('ref') in ways]
            while segs:
                ring = segs.pop(0)
                while ring[0] != ring[-1]:
                    for i, s2 in enumerate(segs):
                        if s2[0] == ring[-1]: ring += s2[1:]; segs.pop(i); break
                        if s2[-1] == ring[-1]: ring += s2[-2::-1]; segs.pop(i); break
                    else: break
                p = [nodes[i] for i in ring if i in nodes]
                if len(p) > 3: F[k].append({'p': p[:-1] if ring[0] == ring[-1] else p, 'name': t.get('name', ''), 'tags': t, 'inner': role == 'inner', 'open': ring[0] != ring[-1]})
    return F

# ───────── a picture to design on
def view(cid, out, win=None, scale=None, designs=(), slope=False):
    T = Terrain(cid); F = osm(cid, T); x0, y0, x1, y1 = win or (T.x0, T.y0, T.x0 + T.W * T.step, T.y0 + T.H * T.step)
    i0, j0 = map(int, T.ij(x0, y0)); i1, j1 = map(int, T.ij(x1, y1)); i0, j0 = max(i0, 0), max(j0, 0); i1, j1 = min(i1, T.H), min(j1, T.W)
    sh = T.shade()[i0:i1, j0:j1]; rgb = T.rgb[i0:i1, j0:j1].astype(np.float32); img = (rgb * (.45 + .75 * sh[..., None])).clip(0, 255).astype(np.uint8)
    if slope:  # where the ground is too steep to play: red over 33 degrees, amber from 22
        sl = T.slope()[0][i0:i1, j0:j1]; img = img.astype(np.float32); img[sl > 33] = img[sl > 33] * .45 + np.array([200, 30, 30]) * .55; m = (sl > 22) & (sl <= 33); img[m] = img[m] * .6 + np.array([230, 170, 20]) * .4; img = img.astype(np.uint8)
    k = scale or min(1.0, 1500 / (x1 - x0)); im = Image.fromarray(img).resize((int((x1 - x0) * k), int((y1 - y0) * k)), Image.LANCZOS); d = ImageDraw.Draw(im, 'RGBA')
    X = lambda p: [((q[0] - x0) * k, (q[1] - y0) * k) for q in p]
    for f in F['water']: d.polygon(X(f['p']), fill=(40, 120, 200, 90), outline=(120, 200, 255, 255))
    for f in F['glacier']: d.polygon(X(f['p']), outline=(255, 255, 255, 255))
    for f in F['sand']: d.polygon(X(f['p']), outline=(255, 230, 150, 255))
    for f in F['stream']: d.line(X(f['p']), fill=(90, 190, 255, 255), width=3 if f['river'] else 2)
    for f in F['path']: d.line(X(f['p']), fill=(255, 235, 120, 255) if not f['bridge'] else (255, 120, 60, 255), width=2)
    for f in F['road']: d.line(X(f['p']), fill=(255, 255, 255, 200), width=2)
    for f in F['building']: d.polygon(X(f['p']), fill=(255, 80, 80, 255))
    for f in F['cliff']: d.line(X(f['p']), fill=(255, 60, 200, 255), width=1)
    step = 100 if (x1 - x0) < 1800 else 250
    for gx in range(int(math.ceil(x0 / step)) * step, int(x1), step):
        big = gx % (step * 2 if step == 250 else 500) == 0; d.line([((gx - x0) * k, 0), ((gx - x0) * k, im.size[1])], fill=(255, 255, 255, 110 if big else 45)); d.text(((gx - x0) * k + 2, 2), str(gx), fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    for gy in range(int(math.ceil(y0 / step)) * step, int(y1), step):
        big = gy % (step * 2 if step == 250 else 500) == 0; d.line([(0, (gy - y0) * k), (im.size[0], (gy - y0) * k)], fill=(255, 255, 255, 110 if big else 45)); d.text((2, (gy - y0) * k + 2), str(gy), fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    for (p, name, what) in F['point']:
        if x0 < p[0] < x1 and y0 < p[1] < y1: q = X([p])[0]; d.ellipse((q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3), fill=(255, 255, 0, 255)); d.text((q[0] + 5, q[1] - 5), name[:26], fill=(255, 255, 160, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    for f in F['water'] + F['stream'] + F['glacier']:
        if f['name']: c = (sum(q[0] for q in f['p']) / len(f['p']), sum(q[1] for q in f['p']) / len(f['p']))
        else: continue
        if x0 < c[0] < x1 and y0 < c[1] < y1: q = X([c])[0]; d.text(q, f['name'][:26], fill=(170, 230, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    for (p, name, what) in F['rapid']:
        if x0 < p[0] < x1 and y0 < p[1] < y1: q = X([p])[0]; d.text(q, '~' + (name or what)[:20], fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 80, 255))
    for path in designs:  # holes already laid out
        for n, h in json.load(open(path))['holes'].items():
            L = X(h['line']); d.line(L, fill=(255, 255, 255, 255), width=3); d.ellipse((L[0][0] - 5, L[0][1] - 5, L[0][0] + 5, L[0][1] + 5), fill=(255, 220, 0, 255)); d.ellipse((L[-1][0] - 6, L[-1][1] - 6, L[-1][0] + 6, L[-1][1] + 6), fill=(60, 255, 90, 255))
            d.text((L[len(L) // 2][0] + 6, L[len(L) // 2][1] - 8), str(n), fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0, 255))
    im.convert('RGB').save(out, quality=86); print(out, im.size, 'window', [round(v) for v in (x0, y0, x1, y1)], 'yd, %.2f px/yd' % k)

if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'view':
        opts = {}; rest = []; i = 1
        while i < len(a):
            if a[i] == '--scale': opts['scale'] = float(a[i + 1]); i += 2
            elif a[i] == '--slope': opts['slope'] = True; i += 1
            elif a[i] == '--design': opts.setdefault('designs', []).append(a[i + 1]); i += 2
            else: rest.append(a[i]); i += 1
        view(rest[0], rest[1], tuple(map(float, rest[2:6])) if len(rest) >= 6 else None, **opts)
    elif not a or a[0] not in ('build', 'plan', 'room'): print(__doc__)

# ───────── building the course
def catmull(P, n=10):
    """A smooth line through the points (uniform Catmull-Rom), n steps to a span."""
    P = [np.array(p, float) for p in P]; Q = [P[0]] + P + [P[-1]]; out = []
    for i in range(1, len(Q) - 2):
        a, b, c, d = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for k in range(n): t = k / n; out.append(.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
    out.append(P[-1]); return np.array(out)
def along(L):
    d = np.hypot(*np.diff(L, axis=0).T); return np.concatenate([[0], np.cumsum(d)])
def at_dist(L, S, s):
    s = min(max(s, 0), S[-1]); i = min(np.searchsorted(S, s, 'right') - 1, len(L) - 2); u = (s - S[i]) / max(S[i + 1] - S[i], 1e-9); p = L[i] + (L[i + 1] - L[i]) * u; t = L[i + 1] - L[i]; return p, t / (np.hypot(*t) or 1)
def rng_for(*key):
    import zlib; return np.random.default_rng(zlib.crc32(repr(key).encode()))
def blob(x, y, rx, ry, rot, rng, wob=.16, n=28):
    """An organic outline: an ellipse with a few slow waves in its radius."""
    a = np.linspace(0, 2 * math.pi, n, endpoint=False); ph = rng.uniform(0, 6.28, 3); r = 1 + wob * (.6 * np.sin(2 * a + ph[0]) + .3 * np.sin(3 * a + ph[1]) + .2 * np.sin(5 * a + ph[2]))
    px, py = np.cos(a) * rx * r, np.sin(a) * ry * r; c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot)); return np.stack([x + px * c - py * s, y + px * s + py * c], 1)
def flat(p, nd=1): return [round(float(v), nd) for q in p for v in q[:2]]

def build(path, probe=None):
    import shapely.geometry as sg, shapely.ops as so, contourpy
    from shapely import affinity
    from scipy import ndimage as ndi
    D = json.load(open(path)); cid = D['id']; T = Terrain(D['terrain']); F = osm(D['terrain'], T); look = D.get('look', 'canyon'); pad = D.get('pad', 230); st = T.step
    if look == 'photo': look = 'alpine'
    # What the design leaves out of the map, or adds to it (a course in many places needs this: see COURSES.md).
    #   "without": ["trails", "creeks", "buildings"]   the map's own, left out altogether (a boardwalk the photograph already shows)
    #   "skip_water": [names], "only_water": [names]  waters by name
    #   "sea": feet                                    everything at or below this height is sea
    #   "pools": [[x, y, rx, ry, rot] or {"p": [[x, y], ...]}]   water the map does not carry
    #   "buildings": [[[x, y], ...], ...]              roofs the map does not carry, or carries as one block
    #   "land": [[[x, y], ...], ...]                   the land, traced by hand: all else is sea (a low key the heights cannot find)
    for k_, f_ in (('trails', 'path'), ('creeks', 'stream'), ('buildings', 'building')):
        if k_ in D.get('without', []): F[f_] = []
    if D.get('only_water') is not None: F['water'] = [f for f in F['water'] if f.get('name') in D['only_water']]
    F['water'] = [f for f in F['water'] if f.get('name') not in D.get('skip_water', [])]
    F['building'] += [{'p': [tuple(q) for q in b]} for b in D.get('buildings', [])]
    holes = {int(n): h for n, h in D['holes'].items()}; ctr = {n: catmull(h['line']) for n, h in holes.items()}
    region = so.unary_union([sg.LineString(h['line']).buffer(pad) for h in holes.values()]); bx0, by0, bx1, by1 = region.bounds
    i0, j0 = map(int, T.ij(bx0, by0)); i1, j1 = map(int, T.ij(bx1, by1)); i0, j0, i1, j1 = max(i0, 1), max(j0, 1), min(i1, T.H - 1), min(j1, T.W - 1)
    xs = T.x0 + np.arange(j0, j1) * st; ys = T.y0 + np.arange(i0, i1) * st; E = T.elev[i0:i1, j0:j1].astype(np.float64); RGB = T.rgb[i0:i1, j0:j1].astype(np.float32)
    # relief_z: low dunes or a salt pan want their few feet of relief drawn larger
    SL, DX, DY = T.slope(); SL = SL[i0:i1, j0:j1]; SH = T.shade(alt=42, z=D.get('relief_z', 1.0))[i0:i1, j0:j1]; XX, YY = np.meshgrid(xs, ys)
    def raster(geom):  # which cells lie inside a shape
        if geom.is_empty: return np.zeros(E.shape, bool)
        im = Image.new('L', (E.shape[1], E.shape[0]), 0); d = ImageDraw.Draw(im)
        for g in (geom.geoms if hasattr(geom, 'geoms') else [geom]):
            if g.geom_type != 'Polygon': continue
            d.polygon([((x - xs[0]) / st, (y - ys[0]) / st) for x, y in g.exterior.coords], fill=1)
            for r in g.interiors: d.polygon([((x - xs[0]) / st, (y - ys[0]) / st) for x, y in r.coords], fill=0)
        return np.asarray(im, bool)
    def shapes_of(mask, tol=1.5, min_area=90, soft=1.1):  # outlines, with holes, of the cells that are set
        z = ndi.gaussian_filter(np.pad(mask.astype(np.float32), 2), soft); px = np.concatenate([[xs[0] - 2 * st, xs[0] - st], xs, [xs[-1] + st, xs[-1] + 2 * st]]); py = np.concatenate([[ys[0] - 2 * st, ys[0] - st], ys, [ys[-1] + st, ys[-1] + 2 * st]])
        pts, offs = contourpy.contour_generator(x=px, y=py, z=z, fill_type=contourpy.FillType.OuterOffset).filled(.5, 9); out = []
        for P, O in zip(pts, offs):
            rings = [P[O[i]:O[i + 1]] for i in range(len(O) - 1)]; g = sg.Polygon(rings[0], [r for r in rings[1:] if len(r) > 3]).buffer(0).simplify(tol)
            for q in (g.geoms if hasattr(g, 'geoms') else [g]):
                if q.geom_type == 'Polygon' and q.area > min_area: out.append(q)
        return out
    def pack(g, nd=1):  # a shape for the game: its outline, and its holes if it has any
        o = {'p': flat(list(g.exterior.coords)[:-1], nd)}; hs = [flat(list(r.coords)[:-1], nd) for r in g.interiors if sg.Polygon(r).area > 40]
        if hs: o['h'] = hs
        return o if hs else o['p']
    # "level": true on a hole says its line runs along a crest narrower than the heights can hold (a rock fin with a trail along its
    # top): the ground under its tee, its fairways and its green is taken as level, whatever slope the grid reads there. Everything
    # to either side stays as steep as it is, so the fairway is a ribbon with the cliff on both hands.
    lev_ = []
    for n, h in holes.items():
        if not h.get('level'): continue
        L_ = ctr[n]; S_ = along(L_); gr_0 = h.get('green') or [15, 12.5, None]
        lev_.append(sg.Point(*L_[0]).buffer(17)); lev_.append(sg.Point(*L_[-1]).buffer(max(gr_0[0], gr_0[1]) + 14))
        for s0, s1, w in (h.get('fw') or []): lev_.append(sg.LineString([tuple(at_dist(L_, S_, s_)[0]) for s_ in np.arange(s0, s1 + .1, 5)]).buffer(w + 11))
    LV = raster(so.unary_union(lev_)) if lev_ else np.zeros(E.shape, bool); SL = np.where(LV, np.minimum(SL, 9), SL)
    # water: lakes and rivers from the map, with their islands
    # A long river's outline runs far past the downloaded map and comes in unclosed. Its two loose ends are both out there, so
    # joining them closes it harmlessly, as long as they really are outside this course's ground.
    far = lambda q: not (bx0 - 400 < q[0] < bx1 + 400 and by0 - 400 < q[1] < by1 + 400)
    # ... or, when one end is nearer, as long as the straight join between the two ends passes clear of everything that is built
    clear_ = lambda f: not sg.LineString([f['p'][0], f['p'][-1]]).intersects(sg.box(bx0 - 30, by0 - 30, bx1 + 30, by1 + 30))
    joins = lambda f: (far(f['p'][0]) and far(f['p'][-1])) or clear_(f)
    for f in F['water']:
        if f.get('open') and not joins(f): print('  NOTE an unclosed water outline ends inside the course:', f.get('name'), [round(v) for v in f['p'][0]], [round(v) for v in f['p'][-1]])
    ok = lambda f: len(f['p']) > 2 and (not f.get('open') or joins(f))
    outer = [sg.Polygon(f['p']).buffer(0) for f in F['water'] if not f.get('inner') and ok(f)]; inner = [sg.Polygon(f['p']).buffer(0) for f in F['water'] if f.get('inner') and ok(f)]
    water = so.unary_union(outer).difference(so.unary_union(inner)) if outer else sg.Polygon()
    if D.get('sea') is not None:
        # the sea is not on the map as water; the heights say where it is. Small pools the tide leaves are not sea.
        low = ndi.binary_closing(ndi.binary_opening(E * 3 <= D['sea'], iterations=1), iterations=1); lab_, n_ = ndi.label(low); size_ = ndi.sum(low, lab_, range(1, n_ + 1)); low = np.isin(lab_, [k + 1 for k, v in enumerate(size_) if v >= 900])
        water = so.unary_union([water] + shapes_of(low, 1.2, 300)); E = np.where(low, max(D['sea'], 0) / 3, np.maximum(E, D['sea'] / 3))
    # "land": [[[x, y], ...], ...]: where the heights cannot tell a low island from the sea round it, the land is traced by hand and
    # everything else is sea
    if D.get('land'): water = so.unary_union([water, sg.box(bx0 - 5, by0 - 5, bx1 + 5, by1 + 5).difference(so.unary_union([sg.Polygon(q).buffer(0) for q in D['land']]))])
    pools_ = [sg.Polygon(b['p']).buffer(0) if isinstance(b, dict) else sg.Polygon(blob(b[0], b[1], b[2], b[3], b[4], rng_for(cid, 'pool', b[0]), .08, 30)) for b in D.get('pools', [])]
    if pools_: water = so.unary_union([water] + pools_)
    water = water.intersection(sg.box(bx0 - 5, by0 - 5, bx1 + 5, by1 + 5)); W = raster(water)
    # ground too steep to play: cliffs, crags and the walls of the gorge
    lim = D.get('steep', 33); steep = ndi.binary_closing(ndi.binary_opening(SL > lim, iterations=1), iterations=2) & ~W; lab, n = ndi.label(steep); size = ndi.sum(steep, lab, range(1, n + 1)); steep = np.isin(lab, [k + 1 for k, v in enumerate(size) if v >= D.get('crag', 150)])
    # "under": feet. On a mesa or a fin the level ground far below is not somewhere to play from: a ball that goes over the edge and
    # comes to rest a thousand feet down could never be got back up. Ground more than this far below the nearest point of a hole's
    # line is cliff, like the faces above it. (Under a shot that leaps a gap the line's own ground is low, so nothing is lost.)
    if D.get('under'):
        onl = np.zeros(E.shape, bool)
        for n_, L_ in ctr.items():
            S_ = along(L_)
            for s_ in np.arange(0, S_[-1] + .1, 2.0):
                q_ = at_dist(L_, S_, s_)[0]; i_, j_ = int((q_[1] - ys[0]) / st), int((q_[0] - xs[0]) / st)
                if 0 <= i_ < E.shape[0] and 0 <= j_ < E.shape[1]: onl[i_, j_] = True
        ix_ = ndi.distance_transform_edt(~onl, return_distances=False, return_indices=True); steep |= (E * 3 < E[ix_[0], ix_[1]] * 3 - D['under']) & ~W & ~LV
    # snow and ice: the mapped glacier, and whatever the photograph shows as bright and colourless high up
    snow = raster(so.unary_union([sg.Polygon(f['p']).buffer(0) for f in F['glacier'] if len(f['p']) > 2])) if F['glacier'] else np.zeros(E.shape, bool)
    if look == 'alpine':
        mx, mn = RGB.max(2), RGB.min(2); white = (mn > D.get('snowmin', 205)) & ((mx - mn) < 22) & ~W; white = ndi.binary_opening(white, iterations=1); snow |= ndi.binary_closing(white, iterations=2)
    for b in D.get('snow', []): snow |= raster(sg.Polygon(blob(b[0], b[1], b[2], b[3], b[4], rng_for(cid, 'snowpatch', b[0]), .22, 26)))  # patches seen in the photograph but too small for it to pick out
    if D.get('snowline'):  # snowfields that last the summer: north-facing hollows above the snowline, as the ground says they lie
        rs_ = rng_for(cid, 'snow'); nz = ndi.gaussian_filter(rs_.random(E.shape), 7); nz = (nz - nz.mean()) / nz.std(); gyE = np.gradient(E, st)[0]
        field = (E * 3 > D['snowline'] + 160 * nz) & (gyE > .2) & (SL > 15) & (SL < 44) & ~W; snow |= ndi.binary_closing(ndi.binary_opening(field, iterations=2), iterations=2)
    steep &= ~snow
    # A scrap of gentler ground wholly inside a cliff is cliff too: left as it was, it showed as a pale blob in the rock face,
    # like a bunker, with a bush growing on it.
    lab, n = ndi.label(~steep); size = ndi.sum(~steep, lab, range(1, n + 1)); edge_ = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    steep |= np.isin(lab, [k + 1 for k, v in enumerate(size) if v < D.get('islet', 170) and (k + 1) not in edge_]) & ~W & ~snow
    # holes: tees, fairways, greens, bunkers
    G = {k: [] for k in ('fair', 'green', 'tee', 'bunker')}; card = {}; tilt = {}; lines = {}; keep_clear = []; notes = []
    Es = ndi.gaussian_filter(E, 5); gy, gx = np.gradient(Es, st)
    # running creeks are kept clear of turf too: a fairway is cut where one crosses it, and no green or tee sits in one
    runs = [sg.LineString(f['p']).buffer(D.get('creeks', {}).get(f['name'], 5 if f['name'] else 3.2) / 2 + 2.5) for f in F['stream'] if not (f['river'] or ((f['dry'] or (D.get('dry_unnamed') and not f['name'])) and f['name'] not in D.get('wet', [])))]
    wet = so.unary_union([water.buffer(4)] + runs); crag = so.unary_union(shapes_of(steep, 2, 60)) if steep.any() else sg.Polygon(); cold = so.unary_union(shapes_of(snow, 2, 60)) if snow.any() else sg.Polygon(); # Nothing mown may lie on ground that would make it look pasted on: slopes too steep to hold a fairway, trails, buildings and
    # dry washes are all kept clear, with room to spare from a cliff's edge. A trail or a wash that crosses a fairway cuts it.
    box_ = sg.box(bx0, by0, bx1, by1); SLs = ndi.gaussian_filter(SL, 1.0); tilted = so.unary_union(shapes_of(SLs >= D.get('gentle', 21), 1.5, 40, .8)) if (SLs >= D.get('gentle', 21)).any() else sg.Polygon()
    trails = so.unary_union([sg.LineString(f['p']).buffer(2.4) for f in F['path'] if sg.LineString(f['p']).intersects(region)] or [sg.Polygon()]).intersection(box_)
    built = [f for f in F['building'] if len(f['p']) > 2 and sg.Polygon(f['p']).buffer(0).intersects(region) and not sg.Polygon(f['p']).buffer(0).intersects(crag)]  # a cabin the ground model puts on a cliff is left out, not drawn hanging there
    houses = so.unary_union([sg.Polygon(f['p']).buffer(0).buffer(5) for f in built] or [sg.Polygon()])
    washes = so.unary_union([sg.LineString(f['p']).buffer(D.get('creeks', {}).get(f['name'], 5 if f['name'] else 3.2) / 2 + 2.5) for f in F['stream'] if not f['river'] and sg.LineString(f['p']).intersects(region)] or [sg.Polygon()]).intersection(box_)
    # "beaches": true keeps the map's sand as beach: it plays as sand, and nothing is mown on it
    strand = so.unary_union([sg.Polygon(f['p']).buffer(0) for f in F['sand'] if len(f['p']) > 2] or [sg.Polygon()]).intersection(box_).difference(water) if D.get('beaches') else sg.Polygon()
    if not strand.is_empty: houses = so.unary_union([houses, strand])
    seen = so.unary_union([wet, crag.buffer(6), cold.buffer(3), trails, houses, washes])
    bad = so.unary_union([wet, crag.buffer(6), cold.buffer(3), tilted, trails, houses, washes]); edge_g = so.unary_union([water.buffer(1.5), crag.buffer(6), cold.buffer(3), tilted, trails, houses, washes] + runs)
    # what a green keeps its distance from: six yards of ground between it and water, ten from a cliff's edge, less from the rest
    gr_ = D.get('green_room', 4.5); edge_far = so.unary_union([water.buffer(1.5 + gr_), crag.buffer(6 + gr_), cold.buffer(3 + gr_ * .7), tilted.buffer(1.5), trails.buffer(3), houses.buffer(3), washes.buffer(2)] + [r.buffer(3) for r in runs])
    if probe:  # where is there room? the widest clear pockets near a point, for placing a green (about 16 yd) or a tee (about 8)
        # the shapes are widened first: a trail is thinner than the grid
        px, py, R = probe; room = ndi.distance_transform_edt(~raster(edge_g.buffer(2.5))) * st - 2.5; peak = (room == ndi.maximum_filter(room, 7)) & (np.hypot(XX - px, YY - py) <= R) & (room >= 6)
        dd = np.hypot(XX - px, YY - py); i, j = np.unravel_index(np.argmin(dd), dd.shape); roomg = ndi.distance_transform_edt(~raster(edge_far.buffer(2.5))) * st - 2.5
        print('  at the point itself: room for a tee %s, for a green of %d yd' % ('yes' if room[i, j] >= 8 else 'no', max(roomg[i, j], 0)))
        for need, what, rm in ((8, 'a tee', room), (11.5, 'a small green (10 yd)', roomg), (17, 'a full green (15 yd)', roomg)):
            ok = np.where(rm >= need, dd, 1e9); i, j = np.unravel_index(np.argmin(ok), ok.shape)
            if ok[i, j] < 1e9: print('  nearest room for %s: [%d, %d], %d yd away' % (what, xs[j], ys[i], ok[i, j]))
        peak = (roomg == ndi.maximum_filter(roomg, 7)) & (dd <= R) & (roomg >= 8); seen_ = []
        for i, j in sorted(zip(*np.nonzero(peak)), key=lambda q: -roomg[q]):
            if all(math.hypot(xs[j] - a_, ys[i] - b_) > 12 for a_, b_ in seen_) and len(seen_) < 8: seen_.append((xs[j], ys[i])); print('  a green of up to %2d yd fits at [%d, %d]  (%d yd from the point, %d ft)' % (roomg[i, j], xs[j], ys[i], dd[i, j], E[i, j] * 3))
        return
    mine = {}  # which of the shapes belong to which hole
    for n, h in sorted(holes.items()):
        was = {k: len(G[k]) for k in G}
        L = ctr[n]; S = along(L); total = S[-1]; par = h['par']; rng = rng_for(cid, n); end = L[-1]; t_end = at_dist(L, S, total - 1)[1]
        # the green: across the line of play unless told otherwise
        gr = h.get('green') or [15 + (2 if par == 5 else 0), 12.5, None]; rot = gr[2] if gr[2] is not None else math.degrees(math.atan2(t_end[1], t_end[0])) + 90 + rng.uniform(-25, 25)
        # A green is never trimmed to fit, and never crowds an edge: the whole shape must sit with room to spare (edge_far) from
        # water, rock, snow, slopes, trails and creeks. Where it does not, it is made smaller, down to about half its area.
        whole = sg.Polygon(blob(end[0], end[1], gr[0], gr[1], rot, rng, .13)); green = whole; k_ = 1.0
        while green.intersects(edge_far) and k_ > .72: k_ -= .04; green = affinity.scale(whole, k_, k_, origin=(end[0], end[1]))
        if green.intersects(edge_far):
            notes.append('hole %d: the green at %s is crowded: room for a green of %d yd there, and the smallest this one goes is %d. Move it (fantasy.py room finds where) or give it a smaller "green"' % (n, [round(v) for v in end], sg.Point(*end).distance(edge_far), max(gr[0], gr[1]) * .72 * 1.12))
            green = green.difference(edge_g).buffer(-1.5).buffer(1.5)
            if green.geom_type != 'Polygon': green = max(green.geoms, key=lambda q: q.area)
        G['green'].append(green)
        # tees: two or three boxes stepping forward along the line
        t0 = at_dist(L, S, 0)[1]; a0 = math.degrees(math.atan2(t0[1], t0[0]))
        for k in range(h.get('tees', 3)):
            c = L[0] + t0 * (k * 13) + np.array([-t0[1], t0[0]]) * ((k % 2) * 2 - 1) * (4 if k else 0) * (1 if k else 0); box = affinity.rotate(sg.box(c[0] - 5.5, c[1] - 4, c[0] + 5.5, c[1] + 4), a0, origin=(c[0], c[1]))
            if k == 0: box0 = box
            if k == 0 or not box.intersects(bad): G['tee'].append(box)
        if box0.buffer(1.5).intersects(bad): notes.append('hole %d: the tee at %s touches %s' % (n, [round(v) for v in L[0]], ', '.join(k for k, g in (('water or a creek', wet), ('a cliff', crag.buffer(6)), ('snow', cold.buffer(3)), ('a slope', tilted), ('a trail', trails), ('a building', houses), ('a wash', washes)) if box0.buffer(1.5).intersects(g))))
        # fairway: a ribbon along the line where the ground allows, in one piece or several
        segs = h.get('fw'); segs = segs if segs is not None else ([] if par == 3 and total < 235 else [[max(95, min(150, total * .3)), total - 24, h.get('w', 30)]])
        fair = []
        for s0, s1, w in segs:
            discs = []; ph = rng.uniform(0, 6.28, 2)
            for s in np.arange(s0, s1 + .1, 5): p, _ = at_dist(L, S, s); u = (s - s0) / max(s1 - s0, 1); r = w * (.82 + .26 * math.sin(u * 5.5 + ph[0]) + .1 * math.sin(u * 13 + ph[1])) * min(1, .55 + 3 * u, .6 + 3 * (1 - u)); discs.append(sg.Point(*p).buffer(r, 8))
            if discs: fair.append(so.unary_union(discs))
        if fair:
            # Cut by everything it may not touch, then healed: a pocket of steeper ground under 16 yards across is mown over (a
            # fairway with small bites out of it for no visible reason looks as wrong as one painted up a slope), but nothing
            # that can be seen (water, rock, snow, a trail, a wash, a roof) is ever covered again.
            ribbon = so.unary_union(fair); fw = ribbon.difference(bad).difference(green.buffer(1)).buffer(-5).buffer(5)
            fw = fw.buffer(8).buffer(-8).intersection(ribbon).difference(seen).difference(green.buffer(1)).buffer(-4).buffer(4).simplify(.8)
            for q in (fw.geoms if hasattr(fw, 'geoms') else [fw]):
                if q.geom_type == 'Polygon' and q.area > 500:
                    G['fair'].append(sg.Polygon(q.exterior))
                    if any(sg.Polygon(r).area > 60 for r in q.interiors): notes.append('hole %d: something the fairway may not touch lies wholly inside it and will be mown over; move the line or narrow the fairway there' % n)
        if par > 3:
            cover = sum(1 for sx in np.arange(150, total - 30, 6) if any(q.contains(sg.Point(*at_dist(L, S, sx)[0])) for q in G['fair'])) / max(1, len(np.arange(150, total - 30, 6)))
            if cover < .5: notes.append('hole %d: only %d%% of the line from 150 yd on is fairway (slopes, washes, trails or cliffs take the rest)' % (n, cover * 100))
        # bunkers: placed by hand as [x, y, rx, ry, rot], or [along, side, rx, ry, rot] with "rel"
        for b in h.get('bunkers', []):
            if len(b) > 5 and b[5] == 'rel': p, t = at_dist(L, S, b[0] if b[0] >= 0 else total + b[0]); c = p + np.array([-t[1], t[0]]) * b[1]; rot = math.degrees(math.atan2(t[1], t[0])) + b[4]
            else: c = np.array(b[:2], float); rot = b[4]
            placed = False
            for step in range(5):  # a bunker is never sliced by a cliff, a shore or a slope: it is nudged toward the line of play, or left out
                cc = c + (at_dist(L, S, float(np.clip((c - L[0]) @ t0, 0, total)))[0] - c) * (step * .16); bk = sg.Polygon(blob(cc[0], cc[1], b[2], b[3], rot, rng_for(cid, n, tuple(b[:2])), .2, 22))
                if not bk.intersects(bad.buffer(1.5)): G['bunker'].append(bk.difference(green.buffer(.5)).buffer(0)); placed = True; break
            if not placed: notes.append('hole %d: a bunker near %s had no clean ground and was left out' % (n, [round(v) for v in c]))
            if placed and G['bunker'][-1].geom_type != 'Polygon': G['bunker'][-1] = max(G['bunker'][-1].geoms, key=lambda q: q.area)
        # the card, the fall from tee to green, and which way the green really tilts
        gi, gj = int((end[1] - ys[0]) / st), int((end[0] - xs[0]) / st); gxv, gyv = gx[gi, gj], gy[gi, gj]; m = math.hypot(gxv, gyv); sm = min(.34, .16 + math.degrees(math.atan(m)) * .012)  # a green is built flatter than the ground it sits on, but falls the same way
        tilt[n] = [round(-gxv / (m or 1) * sm, 3), round(-gyv / (m or 1) * sm, 3)]; drop = round((T.at(*L[0]) - T.at(*end)) * 3)
        card[n] = {'par': par, 'yd': int(round(total)), 'hcp': h.get('hcp'), 'drop': drop, 'name': h.get('name', '')}; lines[n] = flat(h['line'])
        mine[n] = {k: list(range(was[k], len(G[k]))) for k in G}
    # One hole's ground is not another's. A tee must stand clear of every other hole's green and off every fairway (the forward
    # tees give way quietly; the back tee is reported, to be moved). A fairway stops short of any other hole's green. A bunker that
    # lands on another hole's tee or green is left out. Greens keep apart.
    drop_ = {k: set() for k in G}; at_ = lambda g: [round(v) for v in g.centroid.coords[0]]
    for n in mine:
        for j, ti in enumerate(mine[n]['tee']):
            t = G['tee'][ti]; why = [('%d yd from the green of hole %d' % (t.distance(G['green'][mine[m]['green'][0]]), m)) for m in mine if m != n and t.distance(G['green'][mine[m]['green'][0]]) < 14]
            why += ['on the fairway of hole %d' % m for m in mine if any(t.buffer(3).intersects(G['fair'][fi]) for fi in mine[m]['fair'])]
            # nor in another hole's line of play: within 18 yards of its line anywhere past its own tee ground
            for m in mine:
                if m != n:
                    Lm = ctr[m]; Sm = along(Lm); way = sg.LineString([tuple(at_dist(Lm, Sm, d_)[0]) for d_ in np.arange(60, Sm[-1] + 1, 6)]) if Sm[-1] > 70 else None
                    if way is not None and t.distance(way) < 18 and not any('hole %d' % m in w_ for w_ in why): why.append('in the line of play of hole %d' % m)
            if why and j: drop_['tee'].add(ti)
            elif why: notes.append('hole %d: the tee at %s is %s. Move it' % (n, at_(t), ' and '.join(why)))
        for bi in mine[n]['bunker']:
            b = G['bunker'][bi]
            if any(b.intersects(G['tee'][ti].buffer(2)) for m in mine for ti in mine[m]['tee']) or any(b.intersects(G['green'][mine[m]['green'][0]].buffer(1)) for m in mine if m != n): drop_['bunker'].add(bi); notes.append('hole %d: a bunker near %s lay on another hole and was left out' % (n, at_(b)))
        others = so.unary_union([G['green'][mine[m]['green'][0]].buffer(5) for m in mine if m != n] or [sg.Polygon()])
        for fi in mine[n]['fair']:
            if G['fair'][fi].intersects(others):
                cut = G['fair'][fi].difference(others).buffer(-4).buffer(4); cut = max(cut.geoms, key=lambda q: q.area) if hasattr(cut, 'geoms') and len(cut.geoms) else cut
                if cut.is_empty or cut.area < 500: drop_['fair'].add(fi)
                else: G['fair'][fi] = sg.Polygon(cut.exterior)
        for m in mine:
            if m > n and G['green'][mine[n]['green'][0]].distance(G['green'][mine[m]['green'][0]]) < 10: notes.append('holes %d and %d: their greens are %d yd apart. Move one' % (n, m, G['green'][mine[n]['green'][0]].distance(G['green'][mine[m]['green'][0]])))
    for k in drop_: G[k] = [q for i, q in enumerate(G[k]) if i not in drop_[k]]
    fairs = so.unary_union(G['fair']); greens = so.unary_union(G['green']); tees = so.unary_union(G['tee']); sands = so.unary_union(G['bunker']); turf = so.unary_union([fairs, greens.buffer(5), tees.buffer(3), sands.buffer(1)])
    # nothing steep or snowy is left inside the playing surfaces
    TM = raster(turf.buffer(2)); steep &= ~TM; snow &= ~TM & ~W
    out = {'id': cid, 'src': {'terrain': D['terrain'], 'gentle': D.get('gentle', 21)}, 'origin': [round(T.lat0, 6), round(T.lon0, 6)], 'lines': lines, 'len': {n: c['yd'] for n, c in card.items()}, 'card': card, 'boundary': None, 'roads': [], 'rails': [], 'walls': [], 'piers': [], 'trees': [],
           'rough': [], 'wood': [], 'scrub': [], 'rock': [], 'pitch': [], 'pool': [], 'parking': [], 'beach': [], 'marsh': [], 'bed': [], 'tilt': tilt}
    for k in G: out[k] = [flat(list(q.exterior.coords)[:-1]) for q in G[k]]
    out['water'] = [pack(q) for q in (water.simplify(.7).geoms if hasattr(water, 'geoms') else [water.simplify(.7)]) if q.geom_type == 'Polygon' and q.area > 12]  # every lake in the picture, so none is left as a blue stain in the paint
    out['void'] = [pack(q) for q in shapes_of(steep, 1.6, 90) if q.intersects(region)]
    if not strand.is_empty: out['beach'] = [pack(q) for q in (strand.simplify(.8).geoms if hasattr(strand, 'geoms') else [strand.simplify(.8)]) if q.geom_type == 'Polygon' and q.area > 60 and q.intersects(region)]
    out['snow'] = [pack(q) for q in shapes_of(snow, 1.4, 70) if q.intersects(region)]
    # creeks: dry washes where the map says so; white water wherever the creek really falls steeply
    out['streams'] = []; out['falls'] = []; near = region.buffer(60)
    for f in F['stream']:
        ls = sg.LineString(f['p'])
        if f['river'] and water.buffer(3).contains(ls) or not ls.intersects(near): continue
        ls = ls.intersection(sg.box(bx0, by0, bx1, by1))
        for q in (ls.geoms if hasattr(ls, 'geoms') else [ls]):
            if q.geom_type != 'LineString' or q.length < 15: continue
            # 'wet' in the design names creeks the map calls seasonal that in fact run all year
            P = np.array(q.simplify(.6).coords); dry = (f['dry'] if not D.get('dry_unnamed') else (f['dry'] or not f['name'])) and f['name'] not in D.get('wet', []); w = D.get('creeks', {}).get(f['name'], 5 if f['name'] else 3.2)
            out['streams'].append({'p': flat(P), 'w': w, 'dry': bool(dry), 'name': f['name']})
            if dry: continue
            S2 = along(P); run = None
            for s in np.arange(0, S2[-1], 6):
                a, _ = at_dist(P, S2, s); b, _ = at_dist(P, S2, s + 6); fall = abs(T.at(*a) - T.at(*b)) / 6 > D.get('cascade', .17) and not sg.Point(*a).within(water)
                if fall: run = (run or [a]) + [b]
                if (not fall or s + 6 >= S2[-1]) and run:
                    if len(run) > 2: out['falls'].append({'p': flat(run), 'w': w})
                    run = None
    # trails as mapped, less the stubs: a spur a few yards long that stops in the open (the cabin it led to is not drawn, or the
    # mapper stopped) reads as a path that has been cut off
    ways = [(f, sg.LineString(f['p'])) for f in F['path'] if sg.LineString(f['p']).intersects(region.buffer(30))]; cabins = so.unary_union([sg.Polygon(f['p']).buffer(0).buffer(6) for f in built] or [sg.Polygon()])
    def loose(i, e): q = sg.Point(*e); return not cabins.contains(q) and all(m.distance(q) > 6 for j, (_, m) in enumerate(ways) if j != i)
    out['paths'] = [{'p': flat(l.simplify(.7).coords), 'cart': False, 'bridge': f['bridge']} for i, (f, l) in enumerate(ways) if not (l.length < 45 and (loose(i, l.coords[0]) or loose(i, l.coords[-1])))]
    out['building'] = [flat(f['p']) for f in built]
    # what grows there, read off the photograph and scattered where it really is
    rngv = rng_for(cid, 'veg'); r_, g_, b_ = RGB[..., 0], RGB[..., 1], RGB[..., 2]; lum = (r_ + g_ + b_) / 3; exg = (2 * g_ - r_ - b_) / (lum + 30); kinds = D.get('plants', ['pine']); sc = []
    free = ~raster(turf.buffer(3)) & ~W & ~snow & ~steep & ~raster(crag.buffer(3)) & ~raster(trails) & ~raster(houses.buffer(-3)) & ~raster(so.unary_union(runs + [washes])); dstream = ndi.distance_transform_edt(~raster(so.unary_union([sg.LineString(np.array(s['p']).reshape(-1, 2)).buffer(4) for s in out['streams'] if not s['dry']] + [water]) if out['streams'] or not water.is_empty else sg.Polygon())) * st
    solid_ = []
    def strew(mask, kind, rmin, rmax, cell, chance, solid=False):
        k = kinds.index(kind) if not solid else 0; c = max(1, int(cell / st))
        for i in range(0, mask.shape[0] - c, c):
            for j in range(0, mask.shape[1] - c, c):
                if mask[i:i + c, j:j + c].mean() > chance[0] and rngv.random() < chance[1]:
                    x = xs[j] + rngv.random() * cell; y = ys[i] + rngv.random() * cell
                    if region.contains(sg.Point(x, y)): (solid_ if solid else sc).append([int(round(x)), int(round(y)), kind] if solid else [int(round(x)), int(round(y)), round(float(rngv.uniform(rmin, rmax)) * 2) / 2, k])
    D2 = D.get('veg', {})
    if D.get('strew') is not None:
        # The design says what grows where, for a place neither of the two looks was written for. Each rule:
        #   {"kind": a plant in "plants", "on": "dark" | "meadow" | "green" | "free" | "patchy", "r": [smallest, largest], "cell": yd,
        #    "need": share of the cell that must match, "p": chance, "near"/"far": yd from water, "above"/"below": feet, "flat": steepest slope,
        #    "solid": true for trees a ball cannot pass through (they go to the game as single trees, by species)}
        g1 = (exg > D2.get('green', .05)) & (lum > 30) & free; nz = ndi.gaussian_filter(rngv.random(E.shape), 9); nz = (nz - nz.mean()) / nz.std()
        masks = {'dark': g1 & (lum < D2.get('dark', 92)), 'meadow': (exg > D2.get('meadow', .1)) & (lum >= D2.get('dark', 92)) & free, 'green': g1, 'free': free, 'patchy': free & (nz > -.4), 'dim': free & (lum < D2.get('dark', 92)), 'pale': free & (lum >= D2.get('dark', 92))}
        for r in D['strew']:
            m = masks[r.get('on', 'green')] & (SL < r.get('flat', 90))
            if 'near' in r: m = m & (dstream < r['near'])
            if 'far' in r: m = m & (dstream >= r['far'])
            if 'above' in r: m = m & (E * 3 >= r['above'])
            if 'below' in r: m = m & (E * 3 < r['below'])
            strew(m, r['kind'], r.get('r', [3, 5])[0], r.get('r', [3, 5])[1], r.get('cell', 10), (r.get('need', .4), r.get('p', .6)), bool(r.get('solid')))
    elif look == 'canyon':
        green_ = (exg > D2.get('green', .09)) & (lum > 35) & free
        if 'cottonwood' in kinds: strew(green_ & (dstream < 45), 'cottonwood', 4.5, 8, 12, (.3, .8))
        if 'mesquite' in kinds: strew(green_ & (dstream >= 45) & (SL < 25), 'mesquite', 3, 5, 12, (.35, .5))
        nz = ndi.gaussian_filter(rngv.random(E.shape), 9); nz = (nz - nz.mean()) / nz.std()
        if 'brush' in kinds: strew(free & (SL < 24) & (nz > -.4), 'brush', 1.3, 2.5, 9, (.9, D2.get('brush', .34)))
        if 'agave' in kinds: strew(free & (SL < 28) & (nz < .2), 'agave', 1.1, 1.7, 15, (.9, D2.get('agave', .1)))
    else:
        dark = (exg > D2.get('green', .05)) & (lum < D2.get('dark', 92)) & free; meadow = (exg > D2.get('meadow', .1)) & (lum >= D2.get('dark', 92)) & free
        if 'pine' in kinds: strew(dark, 'pine', 3.2, 6.2, 9, (.34, .85))
        if 'willow' in kinds: strew(meadow & (dstream < 30), 'willow', 1.6, 3, 9, (.5, .4))
    # The masks above are on a three-yard grid, which a trail or a creek can slip through. Each plant is checked again against
    # the true outlines: none stands on a trail, in a creek or the water, on a roof, on a cliff or on anything mown.
    from shapely.prepared import prep
    off_ = prep(so.unary_union([trails.buffer(.8), houses.buffer(-3), water.buffer(1), crag.buffer(2), washes, turf.buffer(2)] + runs)); sc = [q for q in sc if not off_.contains(sg.Point(q[0], q[1]))]
    out['scatter'] = sc; out['kinds'] = kinds
    # single trees that stop a ball (the big ones), kept a little further off the turf so none stands in a fairway
    if solid_: far_ = prep(turf.buffer(7)); out['trees'] = [q for q in solid_ if not off_.contains(sg.Point(q[0], q[1])) and not far_.contains(sg.Point(q[0], q[1]))]
    if D.get('ground') == 'sand': out['sandy'] = True  # everything that is not mown is sand: the dunes, the salt
    if D.get('th'): out['th'] = D['th']  # this place's own look, over the course's (a course in many places)
    # small things that belong to the place, set down where they really are: a mule train on a named trail, rafts drawn up where a
    # trail meets the river, a tent, white water. In the design: {"kind": "mules", "trail": name, "near": [x, y], "n": 6},
    # {"kind": "rafts", "trail": name, "n": 3}, {"kind": "tent" or "rapid", "at": [x, y], "a": degrees, "r": size}
    props = []
    for pr in D.get('props', []):
        trail = [f for f in F['path'] if f['name'] == pr.get('trail')]
        if pr['kind'] == 'mules' and trail:
            tr = min(trail, key=lambda f: sg.LineString(f['p']).distance(sg.Point(*pr['near']))); ls = sg.LineString(tr['p']); long_ = pr.get('n', 6) * 3.7; s0 = max(0, min(ls.project(sg.Point(*pr['near'])), ls.length - long_ - 1))
            # a mule train keeps to a stretch of trail well clear of anything mown: it is moved along the trail to the nearest such
            clear_ = lambda a: all(ls.interpolate(a + k * 3.7).distance(turf) >= 12 for k in range(pr.get('n', 6)))
            ok_ = [a for a in np.arange(0, max(1, ls.length - long_), 4) if clear_(a)]
            if not ok_: notes.append('the mule train on %s has no stretch clear of the holes and was left out' % pr.get('trail')); continue
            s0 = min(ok_, key=lambda a: abs(a - s0))
            for k in range(pr.get('n', 6)): a = ls.interpolate(s0 + k * 3.7); b = ls.interpolate(s0 + k * 3.7 + 1); props.append({'k': 'mule', 'x': round(a.x, 1), 'y': round(a.y, 1), 'a': round(math.atan2(b.y - a.y, b.x - a.x), 2), 'v': k})
        elif pr['kind'] == 'rafts' and (trail or 'near' in pr) and not water.is_empty:
            edge = water.boundary; best = sg.Point(*pr['near']) if 'near' in pr else min((sg.Point(*q) for f in trail for q in f['p']), key=lambda q: edge.distance(q)); s0 = edge.project(best)
            for k in range(pr.get('n', 3)):
                a = edge.interpolate(s0 + (k - 1) * 7.5); b = edge.interpolate(s0 + (k - 1) * 7.5 + 1); nx, ny = -(b.y - a.y), b.x - a.x; side = 1 if water.contains(sg.Point(a.x + nx * 2, a.y + ny * 2)) else -1
                props.append({'k': 'raft', 'x': round(a.x + nx * side * 1.2, 1), 'y': round(a.y + ny * side * 1.2, 1), 'a': round(math.atan2(ny * side, nx * side), 2), 'v': k})
        elif 'at' in pr and sg.Point(*pr['at']).distance(turf) < (0 if pr['kind'] == 'rapid' else 8): notes.append('the %s at %s is on or beside something mown and was left out' % (pr['kind'], pr['at']))
        elif pr['kind'] == 'floe' and not water.buffer(-pr.get('r', 5) - 2).contains(sg.Point(*pr['at'])): pass  # ice floats: a floe set down on the shore is left out
        elif 'at' in pr: props.append({'k': pr['kind'], 'x': pr['at'][0], 'y': pr['at'][1], 'a': round(math.radians(pr.get('a', 0)), 2), 'r': pr.get('r', 30), 'v': len(props)})
    out['props'] = props
    # the ground itself, painted from the elevation (and, in the mountains, from the photograph's own colours)
    rr = rng_for(cid, 'paint'); ft = E * 3; fine = ndi.gaussian_filter(rr.random(E.shape), 1.2); fine = (fine - fine.mean()) / fine.std(); slow = ndi.gaussian_filter(rr.random(E.shape), 14); slow = (slow - slow.mean()) / slow.std()
    if look == 'canyon':
        # The canyon's colours. Steep faces show the rock, layer by layer with height: dark schist in the Inner Gorge, the brown
        # Tapeats rim under the platform, grey-green shale and Muav above it, the red Redwall, red-orange Supai. Gentle ground shows
        # what lies on it: river sand at the bottom, the sage of the Tonto platform, red soil higher up.
        face = D.get('strata') or [[2300, [60, 50, 60]], [3150, [78, 62, 68]], [3330, [128, 92, 72]], [3600, [142, 104, 78]], [3700, [164, 150, 116]], [4250, [170, 152, 118]], [4400, [174, 92, 68]], [4950, [182, 98, 70]], [5200, [194, 118, 82]], [5800, [206, 146, 102]]]
        flatc = D.get('ground') or [[2300, [198, 174, 132]], [2700, [186, 160, 122]], [3300, [176, 166, 128]], [3600, [184, 179, 140]], [4150, [186, 178, 138]], [4450, [190, 140, 104]], [5800, [200, 150, 110]]]
        f2 = ft + slow * 14; ramp = lambda tab: np.stack([np.interp(f2, [t[0] for t in tab], [t[1][c] for t in tab]) for c in range(3)], -1)
        wf = np.clip((SL - 13) / 15, 0, 1)[..., None]; col = ramp(flatc) * (1 - wf) + ramp(face) * wf
        band = .5 + .5 * np.sin(ft / 6.5 + slow * .8); k = np.clip((SL - 22) / 18, 0, 1); lit = (.5 + .72 * SH) * (1 - .2 * k * band) * (1 - .16 * np.clip((SL - 30) / 25, 0, 1)) * (1 + .03 * fine)
        # depth: ground far below the nearest rim sinks into blue shadow, so a gorge reads as a gorge
        deep = np.clip((ndi.maximum_filter(Es, size=int(360 / st)) - Es) * 3 / D.get('depth', 1100), 0, 1); deep = ndi.gaussian_filter(deep, 3)
        col = col * (1 - .42 * deep[..., None]) + np.array([38, 44, 70]) * (.42 * deep[..., None])
    else:
        sm = np.stack([ndi.median_filter(RGB[..., c], 5) for c in range(3)], -1); sm = ndi.gaussian_filter(sm, (1.5, 1.5, 0)); L0 = sm.mean(2, keepdims=True) + 1; tgt = D.get('tone', 158) + D.get('keep', .32) * (L0 - 150); col = sm / L0 * tgt  # keep: how much of the photograph's own light and dark is left (lifting deep shade all the way to mid-tone turns it blue)
        near_w = ndi.binary_dilation(W, iterations=9); blue = (sm[..., 2] > sm[..., 0] + 6) & (sm[..., 2] >= sm[..., 1] - 2); stain = W | (near_w & blue) | ndi.binary_dilation(W, iterations=2); okc = (~(near_w & blue) & ~W).astype(np.float32)
        wsum = ndi.gaussian_filter(okc, 10) + 1e-4; land = np.stack([ndi.gaussian_filter(col[..., c] * okc, 10) / wsum for c in range(3)], -1); col = np.where(stain[..., None], land, col)
        grey = col.mean(2, keepdims=True); col = grey + (col - grey) * D.get('sat', 1.25)
        # "wash": [r, g, b, amount] pulls the photograph's colours toward one of the place's own, keeping its light and dark:
        # for a photograph taken out of season, or with a cast
        if D.get('wash'): wr_ = np.array(D['wash'][:3], float); g_ = col.mean(2, keepdims=True); col = col * (1 - D['wash'][3]) + g_ / wr_.mean() * wr_ * D['wash'][3]
        # "strata": [[feet, [r, g, b]], ...] paints the steep faces by height, in bands, over the photograph's colours on the level
        # ground: layered rock that an aerial photograph at this scale blurs to one tone (badlands, hoodoos, canyon walls)
        if D.get('strata'):
            f2 = ft + slow * 14; tab = D['strata']; rock_ = np.stack([np.interp(f2, [t[0] for t in tab], [t[1][c] for t in tab]) for c in range(3)], -1)
            wf = np.clip((SL - D.get('strata_from', 14)) / D.get('strata_over', 13), 0, 1)[..., None] * D.get('strata_mix', .85); band = (.5 + .5 * np.sin(ft / D.get('band', 6.5) + slow * .8))[..., None]
            col = col * (1 - wf) + rock_ * (1 - .2 * band) * wf
        # "depth": feet. Ground that far below the nearest high ground sinks into blue shadow, so a gorge reads as a gorge
        if D.get('depth'):
            deep = np.clip((ndi.maximum_filter(Es, size=int(360 / st)) - Es) * 3 / D['depth'], 0, 1); deep = ndi.gaussian_filter(deep, 3)[..., None]; col = col * (1 - .42 * deep) + np.array([38, 44, 70]) * (.42 * deep)
        lit = (.56 + .6 * SH) * (1 - .12 * np.clip((SL - 30) / 25, 0, 1)) * (1 + .03 * fine)
    if D.get('dunes'):
        # "dunes": [wavelength yd, wind bearing degrees, strength]: dune crests the heights are too coarse to hold, drawn as light and
        # shade across the wind: a long lit slope up to each crest and a short dark slip face beyond it
        lam_, ang_, amp_ = D['dunes']; ca_, sa_ = math.cos(math.radians(ang_)), math.sin(math.radians(ang_)); ph_ = (XX * ca_ + YY * sa_) / lam_ * 6.283 + 2.6 * slow + .5 * fine
        lit = lit * (1 + amp_ * (np.cos(ph_) + .55 * np.cos(2 * ph_ + .9) + .25 * np.cos(3 * ph_ + 1.7)))
    img = (col * lit[..., None]).clip(0, 255).astype(np.uint8); rs = D.get('relief_step', 3); im = Image.fromarray(img).resize((int(len(xs) * st / rs), int(len(ys) * st / rs)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=D.get('quality', 78), method=6); out['relief'] = {'box': [round(float(xs[0]), 1), round(float(ys[0]), 1), round(len(xs) * st, 1), round(len(ys) * st, 1)], 'src': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()}
    im.save(os.path.join(CACHE, cid + '.relief.png'))
    # ledges: level lines across the steep faces only, which is where the rock shows its layers
    face = crag.buffer(-1.5)
    lev = np.arange(math.floor(E.min() * 3 / 50) * 50, E.max() * 3, D.get('ledge', 30)); cg = contourpy.contour_generator(x=xs, y=ys, z=ndi.gaussian_filter(E, .8) * 3); ledges = []; rock = ndi.binary_dilation(SL > D.get('ledge_slope', 26), iterations=1) if look == 'canyon' else ndi.binary_dilation(steep, iterations=1)
    for lvl in lev:
        for ln in cg.lines(float(lvl)):
            ii = ((ln[:, 1] - ys[0]) / st).astype(int).clip(0, E.shape[0] - 1); jj = ((ln[:, 0] - xs[0]) / st).astype(int).clip(0, E.shape[1] - 1); on = rock[ii, jj]; a = 0
            while a < len(ln):
                if not on[a]: a += 1; continue
                b = a
                while b < len(ln) and on[b]: b += 1
                if b - a > 4:
                    # only on the cliff itself: a stroke that runs out over open ground reads as a path that has been cut off
                    g = sg.LineString(ln[a:b]).simplify(D.get('ledge_tol', 1.6)).intersection(face)
                    for q in (g.geoms if hasattr(g, 'geoms') else [g]):
                        if q.geom_type == 'LineString' and q.length > 25 and q.intersects(region): ledges.append(flat(q.coords))
                a = b
    out['ledges'] = ledges
    # heights, coarse, for the flight of the ball: one byte a cell
    es = 4; Eg = Es[::es, ::es]; lo, hi = float(Eg.min()), float(Eg.max()); q = np.round((Eg - lo) / max(hi - lo, 1e-6) * 255).astype(np.uint8)
    out['elev'] = {'x0': round(float(xs[0]), 1), 'y0': round(float(ys[0]), 1), 'step': st * es, 'w': int(q.shape[1]), 'h': int(q.shape[0]), 'lo': round(lo, 2), 'k': round((hi - lo) / 255, 4), 'z': base64.b64encode(q.tobytes()).decode()}
    s = json.dumps(out, separators=(',', ':')); open(os.path.join(DATA, cid + '.json'), 'w').write(s)
    print(cid, '%d KB' % (len(s) // 1024), {k: len(out[k]) for k in ('fair', 'green', 'tee', 'bunker', 'water', 'void', 'snow', 'streams', 'falls', 'paths', 'building', 'scatter', 'ledges', 'props')}, 'ledge points %d' % sum(len(l) // 2 for l in out['ledges']), 'relief %d KB' % (len(out['relief']['src']) // 1024), im.size, 'elev %d KB' % (len(out['elev']['z']) // 1024))
    for n, c in sorted(card.items()): print('  %2d %-22s par %d  %4d yd  %s' % (n, c['name'], c['par'], c['yd'], ('drops %d ft' % c['drop']) if c['drop'] > 0 else ('climbs %d ft' % -c['drop'])))
    print('  holes:[' + ','.join("[%s,%d,%d,%d,%d]" % (json.dumps(c['name']), c['par'], c['yd'], c['hcp'] or 0, c['drop']) for n, c in sorted(card.items())) + ']')
    print('  total', sum(c['yd'] for c in card.values()), 'yd, par', sum(c['par'] for c in card.values())); [print('  NOTE', x) for x in notes]

if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[1] == 'build': build(sys.argv[2])
if __name__ == '__main__' and len(sys.argv) > 4 and sys.argv[1] == 'room': build(sys.argv[2], (float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]) if len(sys.argv) > 5 else 60))

# ───────── a plan of what was built, to check the holes against the ground
def plan(cid, out, win=None, scale=1.0):
    d = json.load(open(os.path.join(DATA, cid + '.json'))); bx, by, bw, bh = d['relief']['box']; x0, y0, x1, y1 = win or (bx, by, bx + bw, by + bh); k = scale
    rel = Image.open(os.path.join(CACHE, cid + '.relief.png')).convert('RGB'); kr = rel.size[0] / bw
    im = rel.crop((int((x0 - bx) * kr), int((y0 - by) * kr), int((x1 - bx) * kr), int((y1 - by) * kr))).resize((int((x1 - x0) * k), int((y1 - y0) * k)), Image.LANCZOS)
    if d.get('src'):  # ground too steep to mow, in amber: nothing green may touch it
        from scipy import ndimage as ndi
        T = Terrain(d['src']['terrain']); i0, j0 = map(int, T.ij(x0, y0)); i1, j1 = map(int, T.ij(x1, y1)); sl = ndi.gaussian_filter(T.slope()[0], 1.0)[max(i0, 0):i1, max(j0, 0):j1] >= d['src']['gentle']
        m = Image.fromarray((sl * 255).astype(np.uint8)).resize(im.size, Image.NEAREST); im.paste(Image.new('RGB', im.size, (240, 150, 30)), (0, 0), m.point(lambda v: 95 if v else 0))
    dr = ImageDraw.Draw(im, 'RGBA')
    X = lambda f: [((f[i] - x0) * k, (f[i + 1] - y0) * k) for i in range(0, len(f), 2)]; P = lambda o: o['p'] if isinstance(o, dict) else o
    for v in d.get('void', []):
        dr.polygon(X(P(v)), fill=(60, 10, 10, 90), outline=(255, 60, 60, 230))
        for h in (v.get('h', []) if isinstance(v, dict) else []): dr.polygon(X(h), fill=(200, 200, 160, 60), outline=(255, 60, 60, 230))
    for v in d.get('snow', []): dr.polygon(X(P(v)), fill=(255, 255, 255, 200))
    for w in d['water']:
        dr.polygon(X(P(w)), fill=(40, 110, 190, 220), outline=(170, 220, 255, 255))
        for h in (w.get('h', []) if isinstance(w, dict) else []): dr.polygon(X(h), fill=(150, 150, 110, 255))
    for s in d['streams']: dr.line(X(s['p']), fill=(150, 130, 100, 255) if s['dry'] else (90, 180, 255, 255), width=2)
    for s in d.get('falls', []): dr.line(X(s['p']), fill=(255, 255, 255, 255), width=3)
    for s in d['paths']: dr.line(X(s['p']), fill=(250, 230, 120, 200), width=1)
    for b in d['building']: dr.polygon(X(b), fill=(220, 70, 70, 255))
    for f in d['fair']: dr.polygon(X(f), fill=(90, 190, 80, 235))
    for f in d['bunker']: dr.polygon(X(f), fill=(250, 225, 170, 255))
    for f in d['tee']: dr.polygon(X(f), fill=(190, 255, 150, 255))
    for f in d['green']:
        if len(f) >= 6: dr.polygon(X(f), fill=(150, 255, 130, 255), outline=(20, 90, 20, 255))
    for t in d['scatter']: q = ((t[0] - x0) * k, (t[1] - y0) * k); r = max(1, t[2] * k * .8); dr.ellipse((q[0] - r, q[1] - r, q[0] + r, q[1] + r), fill=(30, 80, 30, 200) if d['kinds'][t[3]] not in ('brush', 'agave') else (70, 80, 50, 120))
    for n, l in d['lines'].items():
        L = X(l); dr.line(L, fill=(255, 255, 255, 230), width=2); c = d['card'][n]; mid = L[len(L) // 2]
        dr.text((L[0][0] + 6, L[0][1] - 6), '%s  p%d %dy %+dft' % (n, c['par'], c['yd'], -c['drop']), fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0, 255))
    step = 100
    for gx in range(int(math.ceil(x0 / step)) * step, int(x1), step): dr.line([((gx - x0) * k, 0), ((gx - x0) * k, im.size[1])], fill=(255, 255, 255, 70 if gx % 500 == 0 else 26)); dr.text(((gx - x0) * k + 2, 2), str(gx), fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    for gy in range(int(math.ceil(y0 / step)) * step, int(y1), step): dr.line([(0, (gy - y0) * k), (im.size[0], (gy - y0) * k)], fill=(255, 255, 255, 70 if gy % 500 == 0 else 26)); dr.text((2, (gy - y0) * k + 2), str(gy), fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    im.convert('RGB').save(out, quality=88); print(out, im.size)

if __name__ == '__main__' and len(sys.argv) > 3 and sys.argv[1] == 'plan':
    a = [x for x in sys.argv[2:] if not x.startswith('--')]; plan(a[0], a[1], tuple(map(float, a[2:6])) if len(a) >= 6 else None, float(a[6]) if len(a) > 6 else 1.0)
