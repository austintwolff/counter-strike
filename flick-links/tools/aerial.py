# Fetch and stitch map or aerial tiles for a lat/lon box, for looking at a course while tracing or checking it.
# Usage: aerial.py <osm|esri|usgs> <zoom> <south> <west> <north> <east> <out.jpg>   (usgs imagery is public domain)
import sys, os, math, time, subprocess, io
from PIL import Image
SRC = {'osm': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
       'esri': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
       'usgs': 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'}
def xy(lat, lon, z):
    n = 2 ** z; return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
def tile(src, z, x, y, cache):
    p = os.path.join(cache, f'{src}_{z}_{x}_{y}')
    if not os.path.exists(p) or os.path.getsize(p) < 200:
        for attempt in range(3):
            r = subprocess.run(['curl', '-sS', '-m', '40', '-A', 'flick-links-dev/1.0 (golf course research)', '-o', p, SRC[src].format(z=z, x=x, y=y)], capture_output=True)
            if r.returncode == 0 and os.path.exists(p) and os.path.getsize(p) > 200: break
            time.sleep(1.5)
        if src == 'osm': time.sleep(0.25)
    try: return Image.open(p).convert('RGB')
    except Exception: return Image.new('RGB', (256, 256), (40, 40, 40))
def main():
    src, z = sys.argv[1], int(sys.argv[2]); s, w, n, e = map(float, sys.argv[3:7]); out = sys.argv[7]
    cache = os.path.join(os.path.dirname(os.path.abspath(out)), 'cache'); os.makedirs(cache, exist_ok=True)
    x0, y0 = xy(n, w, z); x1, y1 = xy(s, e, z); tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
    img = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1): img.paste(tile(src, z, tx, ty, cache), ((tx - tx0) * 256, (ty - ty0) * 256))
    img = img.crop((int((x0 - tx0) * 256), int((y0 - ty0) * 256), int((x1 - tx0) * 256), int((y1 - ty0) * 256)))
    mpp = 156543.03392 * math.cos(math.radians((s + n) / 2)) / 2 ** z
    img.save(out, quality=88); print(out, img.size, f'{mpp:.2f} m/px = {mpp*1.09361:.2f} yd/px', f'tiles {(tx1-tx0+1)*(ty1-ty0+1)}')
main()
