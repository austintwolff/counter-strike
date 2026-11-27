#!/usr/bin/env python3
"""Real terrain for a course laid out on wild ground (see COURSES.md, "Fantasy courses").

  python3 tools/terrain.py fetch <id> <south> <west> <north> <east>
  python3 tools/terrain.py photo <id>          the photograph once more, a zoom level closer and twice as fine (for "fine" designs)

downloads, for that box, into data/cache/:
  elevation   Mapzen/AWS terrain tiles (for the US: USGS 3DEP, public domain)
  imagery     USGS National Map aerial photography (NAIP, public domain)
  the map     OpenStreetMap, for lakes, rivers, trails, glaciers and buildings
and resamples elevation and imagery onto one grid in the game's units: yards east (x) and south (y) of the box's centre,
STEP yards to a cell. Everything else (tools/fantasy.py) works from that grid: <id>.terrain.npz.

Needs numpy, scipy, Pillow.
"""
import sys, os, math, json, subprocess, time
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); CACHE = os.path.join(HERE, '..', 'data', 'cache'); TILES = os.path.join(CACHE, 'tiles')
YD = 1.09361; STEP = 3.0
UA = 'flick-links-course-import/1.0'
SRC = {'dem': 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
       'usgs': 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'}

def tile_xy(lat, lon, z):
    n = 2 ** z; return (lon + 180) / 360 * n, (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n

def fetch_tile(src, z, x, y):
    os.makedirs(TILES, exist_ok=True); p = os.path.join(TILES, f'{src}_{z}_{x}_{y}')
    if not os.path.exists(p) or os.path.getsize(p) < 200:
        for attempt in range(4):
            r = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, '-o', p, SRC[src].format(z=z, x=x, y=y)], capture_output=True)
            if r.returncode == 0 and os.path.exists(p) and os.path.getsize(p) > 200: break
            time.sleep(1.5 * (attempt + 1))
    return Image.open(p)

def mosaic(src, z, s, w, n, e):
    """All tiles covering the box as one array, and the tile coordinates of its top-left corner."""
    x0, y0 = tile_xy(n, w, z); x1, y1 = tile_xy(s, e, z); tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
    out = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256, 3), np.uint8)
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            out[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = np.asarray(fetch_tile(src, z, tx, ty).convert('RGB'))
    return out, tx0, ty0

def fetch(cid, s, w, n, e, zdem=14, zimg=15):
    from scipy.ndimage import map_coordinates
    lat0, lon0 = (s + n) / 2, (w + e) / 2; kx = math.cos(math.radians(lat0)) * 111320 * YD; ky = 110574 * YD
    W = int((e - w) * kx / STEP); H = int((n - s) * ky / STEP)
    xs = (np.arange(W) - W / 2) * STEP; ys = (np.arange(H) - H / 2) * STEP          # yards east, yards south of the centre
    lon = lon0 + xs / kx; lat = lat0 - ys / ky; LON, LAT = np.meshgrid(lon, lat)
    # elevation, in yards above sea level
    m, tx0, ty0 = mosaic('dem', zdem, s - .002, w - .002, n + .002, e + .002); m = m.astype(np.float64)
    metres = m[..., 0] * 256 + m[..., 1] + m[..., 2] / 256 - 32768
    px, py = tile_xy(LAT, LON, zdem); elev = map_coordinates(metres, [(py - ty0) * 256 - .5, (px - tx0) * 256 - .5], order=3, mode='nearest') * YD
    # imagery
    im, ix0, iy0 = mosaic('usgs', zimg, s - .001, w - .001, n + .001, e + .001)
    px, py = tile_xy(LAT, LON, zimg); rgb = np.stack([map_coordinates(im[..., c].astype(np.float32), [(py - iy0) * 256 - .5, (px - ix0) * 256 - .5], order=1, mode='nearest') for c in range(3)], -1).clip(0, 255).astype(np.uint8)
    np.savez_compressed(os.path.join(CACHE, cid + '.terrain.npz'), elev=elev.astype(np.float32), rgb=rgb, origin=np.array([lat0, lon0]), step=STEP, box=np.array([s, w, n, e]))
    # the map
    osm = os.path.join(CACHE, cid + '.osm')
    if not os.path.exists(osm) or os.path.getsize(osm) < 1000:
        r = subprocess.run(['curl', '-sS', '-m', '240', '-A', UA, '-o', osm, 'https://api.openstreetmap.org/api/0.6/map?bbox=%f,%f,%f,%f' % (w, s, e, n)]); print('map', r.returncode, os.path.getsize(osm) if os.path.exists(osm) else 0, 'bytes')
    json.dump({'name': cid, 'box': [s, w, n, e]}, open(os.path.join(CACHE, cid + '.place.json'), 'w'))
    print(cid, 'grid', W, 'x', H, 'cells of', STEP, 'yd; elevation', round(float(elev.min()) * 3), 'to', round(float(elev.max()) * 3), 'ft; origin', round(lat0, 6), round(lon0, 6))

def fetch_photo(cid, z=16, k=2):
    """The photograph again, one zoom level closer, on a grid k times as fine as the terrain's: each of the terrain's cells is
    k by k of these, centred on it. Saved as <id>.photo.npz; the ground is painted from it when a design asks for "fine"
    (see COURSES.md)."""
    from scipy.ndimage import map_coordinates
    d = np.load(os.path.join(CACHE, cid + '.terrain.npz')); s, w, n, e = map(float, d['box']); lat0, lon0 = map(float, d['origin']); H, W = d['elev'].shape; step = float(d['step']) / k
    kx = math.cos(math.radians(lat0)) * 111320 * YD; ky = 110574 * YD
    xs = (np.arange(W * k) - W * k / 2 - (k - 1) / 2) * step; ys = (np.arange(H * k) - H * k / 2 - (k - 1) / 2) * step; LON, LAT = np.meshgrid(lon0 + xs / kx, lat0 - ys / ky)
    im, ix0, iy0 = mosaic('usgs', z, s - .001, w - .001, n + .001, e + .001)
    px, py = tile_xy(LAT, LON, z); rgb = np.stack([map_coordinates(im[..., c].astype(np.float32), [(py - iy0) * 256 - .5, (px - ix0) * 256 - .5], order=1, mode='nearest') for c in range(3)], -1).clip(0, 255).astype(np.uint8)
    np.savez_compressed(os.path.join(CACHE, cid + '.photo.npz'), rgb=rgb, k=k, z=z); print(cid, 'photograph at zoom', z, rgb.shape[1], 'x', rgb.shape[0], 'cells of', step, 'yd')

class Terrain:
    """The saved grid, with lookups in the game's coordinates."""
    def __init__(self, cid):
        d = np.load(os.path.join(CACHE, cid + '.terrain.npz')); self.elev = d['elev']; self.rgb = d['rgb']; self.lat0, self.lon0 = map(float, d['origin']); self.step = float(d['step'])
        self.H, self.W = self.elev.shape; self.x0 = -self.W / 2 * self.step; self.y0 = -self.H / 2 * self.step
        self.kx = math.cos(math.radians(self.lat0)) * 111320 * YD; self.ky = 110574 * YD
    def P(self, lat, lon): return ((lon - self.lon0) * self.kx, -(lat - self.lat0) * self.ky)
    def ll(self, x, y): return (self.lat0 - y / self.ky, self.lon0 + x / self.kx)
    def ij(self, x, y): return ((y - self.y0) / self.step, (x - self.x0) / self.step)
    def at(self, x, y):
        i, j = self.ij(x, y); i = min(max(i, 0), self.H - 1.001); j = min(max(j, 0), self.W - 1.001); a, b = int(i), int(j); u, v = i - a, j - b; e = self.elev
        return float(e[a, b] * (1 - u) * (1 - v) + e[a, b + 1] * (1 - u) * v + e[a + 1, b] * u * (1 - v) + e[a + 1, b + 1] * u * v)
    def slope(self):
        """Steepness in degrees and the downhill direction (unit vector, x east, y south) at every cell."""
        gy, gx = np.gradient(self.elev, self.step); mag = np.hypot(gx, gy); return np.degrees(np.arctan(mag)), -gx / (mag + 1e-9), -gy / (mag + 1e-9)
    def shade(self, sun=(-.62, -.78), alt=40, z=1.0):
        """Hillshade with the game's light: the sun to the north-west (shadows fall toward +x, +y)."""
        gy, gx = np.gradient(self.elev * z, self.step); a = math.radians(alt); lx, ly, lz = sun[0] * math.cos(a), sun[1] * math.cos(a), math.sin(a)
        n = np.sqrt(gx * gx + gy * gy + 1); return ((-gx * lx - gy * ly + lz) / n).clip(0, 1)

if __name__ == '__main__':
    if len(sys.argv) >= 7 and sys.argv[1] == 'fetch': fetch(sys.argv[2], *map(float, sys.argv[3:7]))
    elif len(sys.argv) >= 3 and sys.argv[1] == 'photo': fetch_photo(sys.argv[2])
    else: print(__doc__)
