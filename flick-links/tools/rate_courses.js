// Course ratings: what the house pro scores on every hole.
//
// A handicap measured against par says little here: some nines play ten strokes easier than others, and a good player beats par
// everywhere. So every hole has a rating, the average score of a computer player who never mistimes a swing and plays sensibly:
// for each shot it weighs every club, a few lines either side of the flag and how hard to hit, takes the one that should finish
// nearest the hole without finding trouble, and putts straight at the cup. It does not allow for wind or read the break, which is
// where it drops shots. Each hole is played on several days' pins and winds and the scores averaged.
//
//   node tools/rate_courses.js            rate every course and write the table into server/core.js
//   node tools/rate_courses.js sa tl      rate only these, leaving the rest of the table as it is
//
// Run it after adding a course, moving a tee or a green, or changing how the ball flies or rolls (and ./build.sh first: it
// plays the built page). It takes a few minutes.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DAYS = 16, CORE = path.join(__dirname, '..', 'server', 'core.js');
(async () => {
  const only = process.argv.slice(2), b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 200, height: 400 } })).newPage(); const errs = [];
  await p.addInitScript(() => localStorage.setItem('flicklinks:v2:tut', '1')); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html') + '#dev'); await p.waitForFunction(() => window.__fl && __fl.S.mode === 'title');
  const courses = await p.evaluate(() => __fl.COURSES.map(c => ({ id: c.id, club: c.club, n: __fl.courseIds(c.id, 'a').length })));
  await p.evaluate(() => { const f = __fl, S = f.S, Q = []; window.setTimeout = fn => { Q.push(fn); return 0; }; // nothing waits: what the game would do later is done at once
    const BAD = { water: 1, void: 1, ob: 1, woods: 1 }, COST = { green: -4, fringe: 0, fairway: 0, tee: 0, rough: 7, native: 11, bunker: 15, creekbed: 11, snow: 15 };
    // where a shot should finish, by the game's own reckoning (no wind)
    const fate = (h, b, c, p, a) => { const ux = Math.cos(a), uy = Math.sin(a), flat = p * c.carry * f.lieMult(S.lie, c) * (c.bomb || 1), car = f.flightCarry(h, b, ux, uy, flat, c.loft), L = { x: b.x + ux * car, y: b.y + uy * car }, l0 = f.lieAt(h, L);
      if (BAD[l0]) return null; const run = f.runOut(h, L, ux, uy, flat, c), E = { x: L.x + ux * run, y: L.y + uy * run }, l1 = f.lieAt(h, E); if (BAD[l1] || BAD[f.lieAt(h, { x: E.x + ux * 1.5, y: E.y + uy * 1.5 })]) return null;
      return { E, lie: l1, left: Math.hypot(h.pin.x - E.x, h.pin.y - E.y) }; };
    window.playHole = (id, day) => { S.key = day; S.holes.length = 0; S.round = { type: 'nine', ids: [id, id], scores: [], course: null, part: 'f', log: [] }; f.startHole(0); S.mode = 'ready'; Q.length = 0; let n = 0;
      while (S.round.scores[0] == null && n++ < 24) { const h = f.cur(), B = S.ball, dx = h.pin.x - B.x, dy = h.pin.y - B.y, d = Math.hypot(dx, dy) || 1e-6, a0 = Math.atan2(dy, dx);
        if (S.club.putt) { S.mark = { x: h.pin.x + dx / d * Math.min(.6, d * .1), y: h.pin.y + dy / d * Math.min(.6, d * .1) }; f.fire(1, { x: dx / d, y: dy / d }, 0, null, 0, 1); }
        else { let best = null; const list = S.clubs.filter(c => !c.putt).flatMap(c => c.style != null ? f.CHIPS : [c]);
          // how much of the hole is left from a point, measured along its line
          const R = h.route.pts, cum = [0]; for (let i = 1; i < R.length; i++) cum[i] = cum[i - 1] + Math.hypot(R[i].x - R[i - 1].x, R[i].y - R[i - 1].y); const total = cum[cum.length - 1];
          const near = q => { let bi = 0, bd = 1e9; for (let i = 0; i < R.length; i++) { const dd = Math.hypot(R[i].x - q.x, R[i].y - q.y); if (dd < bd) { bd = dd; bi = i; } } return { s: cum[bi], off: bd }; }, here = near(B).s;
          // A hole that doubles back (the way round is over a third longer than the way across, and still a quarter longer from
          // where the ball lies) is played along its line until the turn is behind: on Angels Landing the flag is across a thousand feet of air from most of the hole.
          const along = () => { for (const c of list) for (let s = here + 50; s <= Math.min(total, here + 520); s += 15) { let i = cum.findIndex(v => v >= s); if (i < 0) i = R.length - 1; const a = Math.atan2(R[i].y - B.y, R[i].x - B.x);
              for (const pw of [1, .94, .88, .82, .76, .7, .62, .54]) { const r = fate(h, B, c, pw, a); if (!r) continue; const e = near(r.E), cost = total - e.s + e.off + (COST[r.lie] == null ? 7 : COST[r.lie]); if (!best || cost < best.cost) best = { cost, c, pw, a }; } } };
          if (d > 150 && total > Math.hypot(h.pin.x - h.tee.x, h.pin.y - h.tee.y) * 1.35 && total - here > d * 1.25) along();
          else for (const c of list) for (const off of [0, -.07, .07, -.15, .15, -.26, .26, -.4, .4]) { const a = a0 + off, tries = [1];
            // the swing that should stop by the flag on this line, if the club can get there: found by halving
            { const far = fate(h, B, c, 1, a); if (far && Math.hypot(far.E.x - B.x, far.E.y - B.y) > d) { let lo = .12, hi = 1; for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2, r = fate(h, B, c, m, a); (!r || Math.hypot(r.E.x - B.x, r.E.y - B.y) < d) ? lo = m : hi = m; } tries.push(hi); } }
            for (const pw of [...tries, .88, .76]) { const r = fate(h, B, c, pw, a); if (!r) continue; const cost = r.left + (COST[r.lie] == null ? 7 : COST[r.lie]) + Math.abs(off) * 6; if (!best || cost < best.cost) best = { cost, c, pw, a }; } }
          if (!best) along(); // nowhere safe on any line near the flag's: play along the hole instead
          if (!best) best = { c: S.club, pw: Math.min(1, d / (S.club.carry * (1 + S.club.roll))), a: a0 }; // nowhere safe: straight at it
          if (window.__trace) __trace.push('shot ' + (S.strokes + 1) + ' from ' + S.lie + ', ' + Math.round(d) + ' to the pin: ' + best.c.name + ' at ' + Math.round(best.pw * 100) + '%' + (best.cost == null ? ' (nowhere safe)' : ''));
          S.club = best.c; f.fire(best.pw, { x: Math.cos(best.a), y: Math.sin(best.a) }, 0, null, 0, 1); }
        let k = 0; while (S.mode === 'flight' && k++ < 200000) f.stepBall(f.STEP);
        if (S.round.scores[0] == null) while (Q.length) Q.shift()(); // a penalty drop, taken at once
        if (S.mode !== 'ready' && S.round.scores[0] == null) break; }
      Q.length = 0; return S.round.scores[0] == null ? null : S.round.scores[0]; }; });
  // node tools/rate_courses.js --trace <id> <hole number>: one play of one hole, shot by shot
  if (process.argv[2] === '--trace') { console.log((await p.evaluate(([cid, n]) => { const f = __fl, id = f.courseIds(cid, 'a').find(i => f.INFO(i).n === n); window.__trace = []; const s = playHole(id, '2031-01-03'); return __trace.concat('score ' + s).join('\n'); }, [process.argv[3], +process.argv[4]]))); await b.close(); return; }
  const table = {}, t0 = Date.now();
  for (const c of courses) { if (only.length && !only.includes(c.id)) continue;
    const r = await p.evaluate(([cid, days]) => { const f = __fl, ids = f.courseIds(cid, 'a'), out = []; for (const id of ids) { const sc = []; for (let d = 0; d < days; d++) { const s = playHole(id, '2031-0' + (1 + d % 9) + '-' + String(3 + d * 2).padStart(2, '0')); if (s != null) sc.push(s); } out.push({ par: f.INFO(id).par, k: f.INFO(id).k, n: sc.length, mean: sc.reduce((a, b) => a + b, 0) / (sc.length || 1) }); } return out; }, [c.id, DAYS]);
    // The table is kept by each hole's place in the course's data (the k in a logged hole's key, 'mu3'), which is not always its
    // number: Lions stores its back nine first. r is in playing order, for the summary.
    table[c.id] = []; for (const h of r) table[c.id][h.k - 1] = h.rate = h.n ? +h.mean.toFixed(2) : h.par;
    const over = r.reduce((a, h) => a + h.rate - h.par, 0), nines = [r.slice(0, 9), r.slice(9)].filter(x => x.length).map(x => x.reduce((a, h) => a + h.rate - h.par, 0).toFixed(1));
    console.log(c.club.padEnd(18) + String(r.length).padStart(3) + ' holes   against par: ' + (over >= 0 ? '+' : '') + over.toFixed(1) + '   by nine: ' + nines.join(', ') + (r.some(h => h.n < DAYS) ? '   (some plays did not finish)' : '')); }
  console.log(((Date.now() - t0) / 1000).toFixed(0) + ' s' + (errs.length ? '   page errors: ' + errs.slice(0, 3).join(' | ') : ''));
  // write the table into the server, between its markers
  let src = fs.readFileSync(CORE, 'utf8'); const m = src.match(/\/\/ RATING:BEGIN[^\n]*\n([\s\S]*?)\/\/ RATING:END/);
  if (!m) { console.log('server/core.js has no RATING markers; table not written'); console.log(JSON.stringify(table)); }
  else { let old = {}; try { old = JSON.parse(m[1].replace(/^export const RATING=/, '').replace(/;\s*$/, '')); } catch (e) {} const all = { ...old, ...table };
    src = src.replace(m[0], '// RATING:BEGIN (written by tools/rate_courses.js; do not edit by hand)\nexport const RATING=' + JSON.stringify(all) + ';\n// RATING:END'); fs.writeFileSync(CORE, src); console.log('wrote ratings for', Object.keys(table).join(', ')); }
  await b.close(); })();
