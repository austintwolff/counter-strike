#!/usr/bin/env python3
"""National Parks: one course, eighteen places (see COURSES.md, "A course in many places").

Every hole stands on its own piece of real ground, so each has its own terrain (data/cache/npNN.*), its own design
(data/npNN.design.json, one hole in it, numbered as on the card) and its own built map (data/npNN.json).
The places, and the box of ground fetched for each, are listed in data/np.design.json.

  python3 tools/parks.py fetch [n ...]     download the ground for every place (or the ones named) not yet in the cache
  python3 tools/parks.py build [n ...]     build every hole (or the ones named); with none named, write the card into COURSES
"""
import sys, os, json, io, contextlib
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, '..', 'data'); CACHE = os.path.join(DATA, 'cache')
sys.path.insert(0, HERE)

def sites(): return json.load(open(os.path.join(DATA, 'np.design.json')))['sites']
def sid(n): return 'np%02d' % int(n)

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''; want = [int(a) for a in sys.argv[2:]]; S = [s for s in sites() if not want or s['n'] in want]
    if cmd == 'fetch':
        import terrain
        for s in S:
            if os.path.exists(os.path.join(CACHE, sid(s['n']) + '.terrain.npz')) and not want: continue
            terrain.fetch(sid(s['n']), *s['box'])
    elif cmd == 'build':
        import fantasy
        rows = {}
        for s in S:
            p = os.path.join(DATA, sid(s['n']) + '.design.json')
            if not os.path.exists(p): print(sid(s['n']), 'has no design yet'); continue
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf): fantasy.build(p)
            out = buf.getvalue(); notes = [l for l in out.splitlines() if 'NOTE' in l]; card = json.load(open(os.path.join(DATA, sid(s['n']) + '.json')))['card'][str(s['n'])]
            rows[s['n']] = '[%s,%d,%d,%d,%d,%s]' % (json.dumps(card['name']), card['par'], card['yd'], card['hcp'] or 0, card['drop'], json.dumps(s['park']))
            print('%2d %-18s %-16s par %d %4d yd %s%s' % (s['n'], card['name'], s['park'], card['par'], card['yd'], ('drops %d ft' % card['drop']) if card['drop'] >= 0 else ('climbs %d ft' % -card['drop']), ''.join('\n    ' + l.strip() for l in notes)))
        if not want and len(rows) == 18:
            lines = ' holes:[' + ','.join(rows[n] for n in range(1, 10)) + '],\n more:[' + ','.join(rows[n] for n in range(10, 19)) + ']'
            # the card goes straight into the course list, between its two marks
            src = os.path.join(HERE, '..', 'src', '20-course.js'); js = open(src).read(); a, b = js.index('/*NP:BEGIN*/'), js.index('/*NP:END*/')
            open(src, 'w').write(js[:a] + '/*NP:BEGIN*/\n' + lines + '\n ' + js[b:]); print(' written to src/20-course.js')
            D = [json.load(open(os.path.join(DATA, sid(n) + '.json')))['card'][str(n)] for n in range(1, 19)]; print(' total', sum(c['yd'] for c in D), 'yd, par', sum(c['par'] for c in D))
    else: print(__doc__)
