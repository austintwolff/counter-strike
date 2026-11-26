#!/usr/bin/env node
// Check a course in the built game before it ships.
//
//   ./build.sh && node tools/check_course.js <id> [f|b] [out-dir]      f the front nine (default), b the back nine
//
// For each of the nine holes it
//   1. builds the hole and times it (a slow build means too much geometry: look for a river running for miles),
//   2. saves a picture of the whole hole and of the first aiming view to out-dir (default: ./check-<id>),
//   3. hits a full tee shot straight down the default aim and reports a tree struck inside 60 yards (there should be none),
// then a simple bot plays all nine through the real game, and any script error on the page fails the run.
// Look at every picture afterwards: doubled creeks, blobs for houses, trees on tees and bare ground only show to the eye.
// Needs Playwright with Chromium (present in Claude Code cloud sessions).
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const id = process.argv[2], part = /^[fb]$/.test(process.argv[3] || '') ? process.argv[3] : 'f', out = path.resolve(process.argv[/^[fb]$/.test(process.argv[3] || '') ? 4 : 3] || 'check-' + id + '-' + part);
if (!id) { console.error('usage: node tools/check_course.js <course id> [f|b] [out-dir]'); process.exit(2); }
const page = 'file://' + path.resolve(__dirname, '..', 'index.html') + '#dev';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(), errs = [], problems = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })).newPage();
  await p.addInitScript(() => localStorage.setItem('flicklinks:v2:tut', '1'));
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(page); await p.waitForFunction(() => window.__fl && __fl.S.mode === 'title');
  const course = await p.evaluate(([id, part]) => { const c = __fl.COURSES.find(c => c.id === id); return c && { club: c.club, holes: __fl.courseIds(id, part).map(i => __fl.INFO(i)).map(h => [h.name, h.par, h.yards]) }; }, [id, part]);
  if (course && course.holes.length !== 9) { console.error(course.club + ' has no ' + (part === 'b' ? 'back' : 'front') + ' nine in the build.'); process.exit(2); }
  if (!course) { console.error('No course "' + id + '" in the build. Add it to COURSES in src/20-course.js and run ./build.sh.'); process.exit(2); }
  console.log(course.club + (part === 'b' ? ' back nine' : ' front nine') + ': par ' + course.holes.reduce((a, h) => a + h[1], 0) + ', ' + course.holes.reduce((a, h) => a + h[2], 0) + ' yards');
  for (let i = 0; i < 9; i++) {
    const info = await p.evaluate(([id, i, part]) => { const f = __fl; f.S.holes.length = 0; f.begin('nine', id, part); const t = performance.now(); f.startHole(i); const ms = Math.round(performance.now() - t), h = f.cur(), g = h.geo;
      Object.assign(h.wind, { x: 0, y: 0, sp: 0 });
      return { n: h.n, name: h.name, par: h.par, card: h.yards, line: Math.round(h.total), ms, water: g.water.length, trees: g.trees.length, solid: g.solid.length, bunkers: g.bunker.length, lieAtTee: f.lieAt(h, h.tee), lieAtPin: f.lieAt(h, h.pin) }; }, [id, i, part]);
    await p.waitForTimeout(700); await p.screenshot({ path: path.join(out, `${id}-${info.n}-hole.png`) });
    await p.mouse.click(195, 300); await p.waitForTimeout(2300); await p.screenshot({ path: path.join(out, `${id}-${info.n}-aim.png`) });
    const shot = await p.evaluate(async () => { const f = __fl, S = f.S, h = f.cur(), t = h.tee, a = -f.camT.r; let tree = null;
      f.fire(1, { x: Math.sin(a), y: -Math.cos(a) }, 0, null, 0); const t0 = performance.now();
      while (S.mode === 'flight' && performance.now() - t0 < 14000) { if (S.ball.tree && tree == null) tree = Math.round(Math.hypot(S.ball.x - t.x, S.ball.y - t.y)); await new Promise(r => setTimeout(r, 30)); }
      return { club: S.ball.club.id, tree }; });
    const notes = [];
    if (Math.abs(info.line - info.card) > Math.max(20, info.card * .08)) notes.push(`line measures ${info.line} yd against a card of ${info.card}`);
    if (info.ms > 250) notes.push(`slow to build (${info.ms} ms)`);
    if (info.lieAtPin !== 'green') notes.push('the pin is not on a green (' + info.lieAtPin + ')');
    if (shot.tree != null && shot.tree < 60) notes.push(`a straight tee shot hits a tree ${shot.tree} yd out`);
    notes.forEach(n => problems.push(`No. ${info.n}: ${n}`));
    console.log(`No. ${info.n} ${info.name} · par ${info.par} · ${info.card} yd (line ${info.line}) · built in ${info.ms} ms · ${info.water} water, ${info.bunkers} bunkers, ${info.trees}+${info.solid} trees` + (notes.length ? '   <-- ' + notes.join('; ') : ''));
  }
  // a bot plays the nine: full shots at the pin or up the line, putts at the cup
  await p.evaluate(([id, part]) => { const f = __fl, S = f.S; localStorage.removeItem('flicklinks:v2:rd:' + id + ':' + part); f.S.holes.length = 0; f.begin('nine', id, part);
    window.bot = async () => { const log = [], until = (fn, ms = 25000) => new Promise((res, rej) => { const t0 = Date.now(), i = setInterval(() => { if (fn()) { clearInterval(i); res(); } else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('stuck in mode ' + S.mode)); } }, 40); });
      await until(() => S.mode === 'ready' || S.mode === 'intro'); if (S.mode === 'intro') S.mode = 'ready'; let n = 0;
      while (S.mode === 'ready' && n++ < 18) { const h = f.cur(), b = S.ball, c = S.club, dx = h.pin.x - b.x, dy = h.pin.y - b.y, d = Math.hypot(dx, dy);
        if (c.putt) { S.mark = { x: h.pin.x + dx / d * Math.min(.6, d * .1), y: h.pin.y + dy / d * Math.min(.6, d * .1) }; log.push('P' + Math.round(d * 3)); f.fire(1, { x: dx / d, y: dy / d }, 0, null, 0); }
        else { const mult = S.lie === 'rough' ? .8 : S.lie === 'bunker' ? (c.sand ? .8 : .55) : 1, reach = c.carry * mult * (1 + c.roll); let tx = h.pin.x, ty = h.pin.y;
          if (d > reach) { const pts = h.route.pts; let bi = 0, bd = 1e9; pts.forEach((q, i) => { const dd = Math.hypot(q.x - b.x, q.y - b.y); if (dd < bd) { bd = dd; bi = i; } }); let j = bi; while (j < pts.length - 1 && Math.hypot(pts[j].x - b.x, pts[j].y - b.y) < reach * .9) j++; tx = pts[j].x; ty = pts[j].y; }
          const L = Math.hypot(tx - b.x, ty - b.y) || 1; log.push(c.id + '/' + S.lie.slice(0, 2) + Math.round(d)); f.fire(Math.min(1, L / reach), { x: (tx - b.x) / L, y: (ty - b.y) / L }, 0, null, 0); }
        await until(() => S.mode === 'ready' || !document.getElementById('scrim').hidden); }
      return { hole: f.cur().n, shots: log.join(' '), score: S.round.scores[S.hi] }; }; }, [id, part]);
  try {
    for (let i = 0; i < 9; i++) { const r = await p.evaluate(() => bot()); if (r.score == null) problems.push(`No. ${r.hole}: the bot did not finish the hole (${r.shots})`); console.log('bot  No. ' + r.hole + ': ' + r.score + '  ' + r.shots);
      await p.waitForSelector('#card [data-act]', { timeout: 8000 }); await p.click('#card [data-act]'); await p.waitForTimeout(300); }
    console.log('bot  ' + await p.textContent('#card h2'));
  } catch (e) { problems.push('the bot round stopped: ' + e.message.split('\n')[0]); }
  errs.forEach(e => problems.push('script error: ' + e));
  console.log(problems.length ? '\nTO LOOK AT:\n  ' + problems.join('\n  ') : '\nNo problems found by the checks. Now look at the pictures in ' + out);
  await b.close(); process.exit(problems.length ? 1 : 0);
})();
