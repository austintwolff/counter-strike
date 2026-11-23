#!/usr/bin/env python3
"""Add a real golf course to the game in one step.

  python3 tools/add_course.py "Lions Municipal Golf Course, Austin" lm
  python3 tools/add_course.py "Some Club, City" id --holes 10-18

It finds the course on OpenStreetMap, downloads the map data around it, and writes data/<id>.json
(the game's course file) and data/<id>.preview.png (a check drawing). It then prints the entry to
paste into src/20-course.js. Run ./build.sh afterwards.

If the map has no numbered hole lines, it writes data/<id>.trace.jpg instead: an aerial photo with
a yard grid. Trace each hole on it (tee, bends, green) into data/<id>.extra.json and run this again.
The extra file can also carry the scorecard yardages so tees are set back to match:
  {"origin": [lat, lon], "card": {"1": 423}, "holes": [{"n": 1, "yd": [[x, y], ...]}]}
Needs network access to nominatim.openstreetmap.org, api.openstreetmap.org and, for tracing,
basemap.nationalmap.gov. Map data © OpenStreetMap contributors (ODbL): keep the credit in the game.
"""
import sys, os, json, subprocess, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); DATA = os.path.join(ROOT, 'data'); CACHE = os.path.join(DATA, 'cache')
sys.path.insert(0, HERE)
import import_course as ic
UA = 'flick-links-course-import/1.0'
def curl(url, out=None, args=()):
    r = subprocess.run(['curl', '-sS', '-m', '180', '-A', UA, *args, *(['-o', out] if out else []), url], capture_output=True, text=not out)
    if r.returncode: sys.exit('download failed: ' + (r.stderr if isinstance(r.stderr, str) else r.stderr.decode())[:300])
    return r.stdout
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('name'); ap.add_argument('id'); ap.add_argument('--holes', default='1-9'); ap.add_argument('--refresh', action='store_true', help='download the map data again')
    a = ap.parse_args(); os.makedirs(CACHE, exist_ok=True); osm = os.path.join(CACHE, a.id + '.osm'); meta = os.path.join(CACHE, a.id + '.place.json')
    if a.refresh or not os.path.exists(osm) or os.path.getsize(osm) < 1000:
        hits = json.loads(curl('https://nominatim.openstreetmap.org/search', args=['-G', '--data-urlencode', 'q=' + a.name, '--data-urlencode', 'format=json', '--data-urlencode', 'limit=5']))
        hit = next((h for h in hits if h.get('type') == 'golf_course'), hits[0] if hits else None)
        if not hit: sys.exit('No place found for "%s". Try the name as OpenStreetMap shows it.' % a.name)
        s, n, w, e = map(float, hit['boundingbox']); pad = 0.0015; print('found:', hit['display_name'])
        json.dump({'name': hit['display_name'], 'box': [s - pad, w - pad, n + pad, e + pad]}, open(meta, 'w'))
        curl('https://api.openstreetmap.org/api/0.6/map?bbox=%f,%f,%f,%f' % (w - pad, s - pad, e + pad, n + pad), out=osm)
    place = json.load(open(meta)); extra_path = os.path.join(DATA, a.id + '.extra.json'); extra = json.load(open(extra_path)) if os.path.exists(extra_path) else None
    lo, hi = map(int, a.holes.split('-'))
    try: c = ic.build(osm, a.id, range(lo, hi + 1), 150, extra, course=place['name'].split(',')[0])
    except ValueError: c = None
    if not c or len(c['lines']) < hi - lo + 1:
        s, w, n, e = place['box']; img = os.path.join(CACHE, a.id + '.aerial.jpg'); out = os.path.join(DATA, a.id + '.trace.jpg')
        subprocess.run([sys.executable, os.path.join(HERE, 'aerial.py'), 'usgs', '17', str(s), str(w), str(n), str(e), img], check=True)
        subprocess.run([sys.executable, os.path.join(HERE, 'trace_overlay.py'), osm, img, str(s), str(w), str(n), str(e), str((s + n) / 2), str((w + e) / 2), out], check=True)
        sys.exit('The map has hole lines for only %d of the holes asked for.\nTrace them on %s (yards east and south of [%f, %f]) into %s, then run this again.' % (len(c['lines']) if c else 0, out, (s + n) / 2, (w + e) / 2, extra_path))
    json.dump(c, open(os.path.join(DATA, a.id + '.json'), 'w'), separators=(',', ':')); ic.plot(c, os.path.join(DATA, a.id + '.preview.png'))
    print('wrote data/%s.json (%d KB). Holes and measured yards: %s' % (a.id, os.path.getsize(os.path.join(DATA, a.id + '.json')) // 1024, c['len']))
    card = (extra or {}).get('card', {}); auto = c.get('card', {})
    val = lambda n, k, d: (auto.get(n) or {}).get(k) or d
    print("\nPaste into COURSES in src/20-course.js, then set the hole names and the look (th). Par, yards and handicap come from the map where it has them:\n")
    print("{id:'%s',code:'%s',club:'%s',tee:'Back',\n th:{out:'rough',floor:'#527c38',rough:'#527c38',fair:'#6ea14b',stripe:1,outer:'#56633f',woods:'#2e4927',mix:[['liveoak',.5],['elm',.3],['juniper',.2]],marker:'#e6cf8a',bloom:'bloom',bridge:'wood',cart:true,houses:false},\n holes:[%s]}," % (
        a.id, a.id.upper(), a.name.split(',')[0], ','.join("['Hole %d',%s,%s,%d]" % (n, val(n, 'par', 4), card.get(str(n)) or val(n, 'yd', c['len'][n]), val(n, 'hcp', n)) for n in sorted(c['lines']))))
if __name__ == '__main__': main()
