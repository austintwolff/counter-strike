// Can a dogleg be cut? For every par 4 and 5: a pure full driver from the tee, aimed along the hole as designed and then straight
// at the pin and at angles between. Where does each come to rest, on what, and how far from the pin?
// A cut only counts against the hole if a slightly weak strike on the same line also stays in play: a carry that only a perfect
// drive makes is a gamble the hole is offering (shown as "gamble"), not a way round it.
//   node tools/check_doglegs.js <course id> ...
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => localStorage.setItem('flicklinks:v2:tut', '1'));
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html') + '#dev'); await p.waitForFunction(() => window.__fl && __fl.S.mode === 'title');
  const ids = process.argv.slice(2); let flagged = 0;
  for (const id of ids) for (const part of ['f', 'b']) for (let i = 0; i < 9; i++) {
    const r = await p.evaluate(([id, part, i]) => { const f = __fl, S = f.S; f.S.holes.length = 0; f.begin('nine', id, part); f.startHole(i); const h = f.cur(); if (h.par === 3) return null;
      const DR = S.clubs.find(c => c.id === 'DR') || S.clubs[S.clubs.length - 1], T = h.tee, R = h.route.pts, at = d => { let k = 0; while (k < R.length - 1 && Math.hypot(R[k].x - T.x, R[k].y - T.y) < d) k++; return R[k]; };
      const a1 = Math.atan2(at(230).y - T.y, at(230).x - T.x), a2 = Math.atan2(h.pin.y - T.y, h.pin.x - T.x); let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const shot = (a, str = 1) => { const ux = Math.cos(a), uy = Math.sin(a), flat = DR.carry * 1.05 * str, car = f.flightCarry(h, T, ux, uy, flat, DR.loft), L = { x: T.x + ux * car, y: T.y + uy * car }, l0 = f.lieAt(h, L);
        if (l0 === 'water' || l0 === 'void' || l0 === 'ob') return { lie: l0, left: null, car: Math.round(car) }; const run = f.runOut(h, L, ux, uy, flat, DR), E = { x: L.x + ux * run, y: L.y + uy * run }, l1 = f.lieAt(h, E);
        return { lie: l1 === 'water' || l1 === 'void' ? l1 : l1, land: l0, left: l1 === 'water' || l1 === 'void' || l1 === 'ob' ? null : Math.round(Math.hypot(h.pin.x - E.x, h.pin.y - E.y)), car: Math.round(car) }; };
      const line = shot(a1), cuts = [.5, .75, 1].map(k => ({ k, ...shot(a1 + da * k), weak: shot(a1 + da * k, .93).left == null }));
      return { hole: h.n + ' ' + h.name, par: h.par, yd: h.yards, direct: Math.round(Math.hypot(h.pin.x - T.x, h.pin.y - T.y)), bend: Math.round(Math.abs(da) * 180 / Math.PI), line, cuts }; }, [id, part, i]);
    if (!r) continue; const show = s => s.left == null ? s.lie.toUpperCase() : s.left + ' left (' + s.lie + (s.weak ? ', gamble' : '') + ')';
    const best = r.cuts.filter(c => c.left != null && !c.weak).sort((a, c) => a.left - c.left)[0], gain = best && r.line.left != null ? r.line.left - best.left : best ? 999 : 0;
    const bad = r.bend >= 18 && best && (best.left < 75 || gain > 70) && best.lie !== 'bunker'; if (bad) flagged++;
    console.log((id + ' ' + r.hole).padEnd(26) + ('p' + r.par + ' ' + r.yd + 'y direct ' + r.direct + ' bend ' + r.bend + '°').padEnd(32) + 'as designed: ' + show(r.line).padEnd(22) + ' cut ½: ' + show(r.cuts[0]).padEnd(28) + ' ¾: ' + show(r.cuts[1]).padEnd(28) + ' at pin: ' + show(r.cuts[2]).padEnd(28) + (bad ? '  <-- CUTTABLE' : ''));
  }
  console.log(flagged + ' holes can be cut'); await b.close(); })();
