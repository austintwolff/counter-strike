# Draw mapped golf features and a yard grid over a stitched satellite image.
# overlay.py <osm> <image> <south> <west> <north> <east> <lat0> <lon0> <out> [scale]
import sys, math, xml.etree.ElementTree as ET
from PIL import Image, ImageDraw
osm, img, s, w, n, e, lat0, lon0, out = sys.argv[1], sys.argv[2], *map(float, sys.argv[3:9]), sys.argv[9]; up = float(sys.argv[10]) if len(sys.argv) > 10 else 1
im = Image.open(img).convert('RGB'); W, H = im.size
if up != 1: im = im.resize((int(W * up), int(H * up)), Image.LANCZOS); W, H = im.size
def merc(lat): return math.asinh(math.tan(math.radians(lat)))
T = lambda lat, lon: ((lon - w) / (e - w) * W, (merc(n) - merc(lat)) / (merc(n) - merc(s)) * H)
kx = math.cos(math.radians(lat0)) * 111320 * 1.0936133; ky = 110574 * 1.0936133
Y = lambda x, y: T(lat0 - y / ky, lon0 + x / kx)   # yards (x east, y south) to pixels
d = ImageDraw.Draw(im); root = ET.parse(osm).getroot(); nodes = {el.get('id'): (float(el.get('lat')), float(el.get('lon'))) for el in root.findall('node')}
gi = ti = 0
for el in root.findall('way'):
    t = {x.get('k'): x.get('v') for x in el.findall('tag')}; g = t.get('golf'); p = [T(*nodes[r.get('ref')]) for r in el.findall('nd') if r.get('ref') in nodes]
    if len(p) < 2: continue
    if g == 'green': d.line(p, fill=(120, 255, 120), width=2); gi += 1; cx = sum(q[0] for q in p) / len(p); cy = sum(q[1] for q in p) / len(p); d.text((cx + 8, cy - 8), 'G', fill=(180, 255, 180), stroke_width=2, stroke_fill=(0, 0, 0))
    elif g == 'tee': d.line(p, fill=(255, 240, 60), width=2)
    elif g == 'bunker' or t.get('natural') == 'sand': d.line(p, fill=(255, 255, 255), width=1)
    elif g == 'fairway': d.line(p, fill=(200, 255, 120), width=1)
    elif g == 'hole': d.line(p, fill=(255, 80, 80), width=2); d.text(p[len(p) // 2], t.get('ref', ''), fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
x0 = (w - lon0) * kx; x1 = (e - lon0) * kx; y0 = -(n - lat0) * ky; y1 = -(s - lat0) * ky
for gx in range(int(math.ceil(x0 / 100)) * 100, int(x1), 100):
    a, b = Y(gx, y0), Y(gx, y1); d.line([a, b], fill=(255, 255, 255, 60) if gx % 500 else (255, 220, 0), width=1); d.text((a[0] + 2, 2), str(gx), fill=(255, 255, 0), stroke_width=2, stroke_fill=(0, 0, 0))
for gy in range(int(math.ceil(y0 / 100)) * 100, int(y1), 100):
    a, b = Y(x0, gy), Y(x1, gy); d.line([a, b], fill=(255, 255, 255), width=1); d.text((2, a[1] + 2), str(gy), fill=(255, 255, 0), stroke_width=2, stroke_fill=(0, 0, 0))
im.save(out, quality=88); print(out, im.size)
