#!/usr/bin/env node
// Makes the pictures a shared link and a home screen need, from the game itself:
//   og.jpg                  1200x630, the preview a group chat shows for the link
//   apple-touch-icon.png    180, the icon on an iPhone home screen
//   icon-192.png, icon-512.png, icon-maskable-512.png, icon-32.png   for Android, desktop and the browser tab
//
//   ./build.sh && node tools/make_art.js
//
// The preview is a real view of a hole (the pond green at Jimmy Clay's 6th) with the crest and name over it.
// Needs Playwright with Chromium, and network access to Google Fonts for the display face.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = f => path.join(root, f);
const CREST = fs.readFileSync(path.join(root, 'src', '50-ui.js'), 'utf8').match(/const CREST='(<svg[\s\S]*?<\/svg>)';/)[1];
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus+SC&family=Playfair+Display:ital,wght@1,700&display=swap">';
(async () => {
  const b = await chromium.launch();
  // 1. the scenery: the game, with its panels hidden and the camera laid along the hole
  const g = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  await g.addInitScript(() => localStorage.setItem('flicklinks:v2:tut', '1'));
  await g.goto('file://' + out('index.html') + '#dev'); await g.waitForFunction(() => window.__fl && __fl.S.mode === 'title');
  await g.addStyleTag({ content: '.hud,#hint,#toast,#scrim,#coach{display:none!important}' });
  await g.evaluate(() => { const f = __fl; f.begin('nine', 'jc', 'f'); f.startHole(5); f.S.mode = 'ready'; const h = f.cur(), R = h.route.pts, a = R[Math.floor(R.length * .45)], e = R[R.length - 1];
    Object.assign(h.wind, { x: 0, y: 0, sp: 0 }); f.S.ball.gone = true;
    const c = { x: (a.x + e.x) / 2 + 40, y: (a.y + e.y) / 2 + 6, s: 3.5, r: -Math.atan2(e.y - a.y, e.x - a.x), ay: .5 }; Object.assign(f.camT, c); Object.assign(f.cam, c); });
  await g.waitForTimeout(900);
  const scene = (await g.screenshot({ type: 'jpeg', quality: 92 })).toString('base64');
  // 2. the preview card
  const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  await p.setContent(`<!doctype html><html><head>${FONTS}<style>
    body{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;background:#0b2a21 url(data:image/jpeg;base64,${scene}) center/cover}
    .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,28,21,.96) 0,rgba(7,28,21,.9) 30%,rgba(7,28,21,.45) 52%,rgba(7,28,21,0) 72%)}
    .rule{position:absolute;inset:22px;border:2px solid rgba(230,207,138,.75);border-radius:6px}
    .txt{position:absolute;left:78px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:26px}
    .txt svg{width:104px;height:120px}
    h1{margin:0;font:italic 700 104px/.92 'Playfair Display',Georgia,serif;color:#f4ecd6;letter-spacing:-.01em;text-shadow:0 3px 14px rgba(0,0,0,.45)}
    p{margin:0;font:400 27px/1.2 'Marcellus SC',Georgia,serif;letter-spacing:.14em;color:#e6cf8a;text-transform:uppercase}
  </style></head><body><div class="shade"></div><div class="rule"></div><div class="txt">${CREST}<h1>Breakfast<br>Ball</h1><p>Three holes a day &middot; real courses</p></div></body></html>`);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: out('og.jpg'), type: 'jpeg', quality: 86 });
  // 3. the icons: the crest on club green. The maskable one keeps the crest inside the middle so any mask shape clears it.
  const icon = async (file, size, crest, ring) => { const q = await (await b.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })).newPage();
    await q.setContent(`<!doctype html><html><head><style>body{margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:radial-gradient(circle at 50% 38%,#1f6a54,#0f3d30 62%,#0b2a21);position:relative}
      svg{height:${crest * 100}%;width:auto;filter:drop-shadow(0 ${size * .012}px ${size * .03}px rgba(0,0,0,.45))}i{position:absolute;inset:${size * .055}px;border:${Math.max(1, size * .012)}px solid rgba(230,207,138,.7);border-radius:${size * .16}px;display:${ring ? 'block' : 'none'}}</style></head><body><i></i>${CREST}</body></html>`);
    await q.screenshot({ path: out(file), type: 'png' }); await q.context().close(); };
  await icon('icon-512.png', 512, .64, true); await icon('icon-192.png', 192, .64, true); await icon('apple-touch-icon.png', 180, .66, false);
  await icon('icon-maskable-512.png', 512, .5, false); await icon('icon-32.png', 32, .86, false);
  await b.close();
  for (const f of ['og.jpg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon-32.png']) console.log(f, Math.round(fs.statSync(out(f)).size / 1024) + ' KB');
})();
