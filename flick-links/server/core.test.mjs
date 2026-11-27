// Runs the server module directly: several players, a clubhouse, a week of rounds.
import { handle, MemStore, RATING } from './core.js';
import assert from 'node:assert/strict';
const store = new MemStore();
const today = new Date().toISOString().slice(0, 10), yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const mk = () => { let cookie = ''; return async (method, path, body) => { const r = await handle(new Request('https://golf.test/api' + path, { method, headers: { 'content-type': 'application/json', origin: 'https://golf.test', cookie }, body: body ? JSON.stringify(body) : undefined }), store);
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; return { status: r.status, cookieSet: sc, ...(await r.json()) }; }; };
const austin = mk(), sam = mk(), kim = mk(), stranger = mk();
assert.equal((await austin('GET', '/ping')).ok, true);
assert.equal((await austin('GET', '/state?day=' + today)).me, null);
assert.equal((await austin('POST', '/club', { name: 'Sunday Skins' })).error, 'no_player');
assert.equal((await austin('POST', '/player', { name: 'Austin' })).error, 'user'); assert.equal((await austin('POST', '/player', { name: 'Austin', user: 'a b' })).error, 'user');
const p = await austin('POST', '/player', { name: '  Austin <b> ', user: ' Austin_W ' }); assert.ok(p.ok); assert.match(p.cookieSet, /HttpOnly/); assert.match(p.cookieSet, /Secure/); assert.equal(p.session, undefined, 'token never returned to page script on the hosted site');
const club = await austin('POST', '/club', { name: 'Sunday Skins' }); assert.ok(club.ok); const code = club.code; assert.match(code, /^[A-Z2-9]{6}$/);
assert.equal((await sam('POST', '/player', { name: 'Sam', user: 'AUSTIN_W' })).error, 'user_taken');
await sam('POST', '/player', { name: 'Sam', user: 'sam' }); await kim('POST', '/player', { name: 'Kim', user: 'kim' });
assert.ok((await sam('POST', '/player', { name: 'Sammy', user: 'someone_else' })).ok); { const me = (await sam('GET', '/state?day=' + today)).me; assert.equal(me.user, 'sam', 'a username is chosen once'); assert.equal(me.name, 'Sammy'); } await sam('POST', '/player', { name: 'Sam' });
assert.equal((await sam('POST', '/join', { code, nick: 'austin b' })).error, 'taken');         // cannot take a member's name, whatever the capitals
assert.equal((await kim('POST', '/join', { code, nick: 'AUSTIN B' })).error, 'taken');
assert.ok((await kim('POST', '/join', { code: code.toLowerCase(), nick: 'Kim' })).ok);
assert.ok((await sam('POST', '/join', { code, nick: 'Sammy' })).ok); assert.ok((await sam('POST', '/join', { code, nick: 'Sam' })).ok); // join, then rename yourself
const holes = ['gr5', 'lp6', 'hk2'], pars = [4, 3, 5];
assert.equal((await stranger('POST', '/round', { day: today, holes, pars, scores: [4, 3, 5] })).error, 'no_player');
assert.equal((await sam('POST', '/round', { day: '2020-01-01', holes, pars, scores: [4, 3, 5] })).error, 'day');
assert.equal((await sam('POST', '/round', { day: today, holes, pars, scores: [0, 3, 5] })).error, 'scores');
assert.equal((await sam('POST', '/round', { day: today, holes, pars: [3, 4, 8], scores: [4, 3, 5] })).error, 'scores', 'no hole is a par 8');
assert.equal((await sam('POST', '/round', { day: today, holes: ['gr5', 'gr5', 'hk2'], pars, scores: [4, 3, 5] })).error, 'holes');
assert.ok((await austin('POST', '/round', { day: yest, holes, pars, scores: [4, 3, 6] })).ok);  // +1
assert.ok((await sam('POST', '/round', { day: yest, holes, pars, scores: [3, 2, 4] })).ok);     // -3, hat trick, wins the day
assert.ok((await austin('POST', '/round', { day: today, holes, pars, scores: [4, 1, 5] })).ok); // ace
assert.ok((await austin('POST', '/round', { day: today, holes, pars, scores: [1, 1, 1] })).ok); // second card ignored
assert.ok((await sam('POST', '/round', { day: today, holes, pars, scores: [5, 3, 5] })).ok);
// a forged cookie is nobody
const forged = await handle(new Request('https://golf.test/api/state?day=' + today, { headers: { cookie: 'fl=' + 'a'.repeat(64) } }), store); assert.equal((await forged.json()).me, null);
// a cross-site post is refused
const xs = await handle(new Request('https://golf.test/api/player', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/json' }, body: '{"name":"x"}' }), store); assert.equal(xs.status, 403);
const s = await austin('GET', '/state?day=' + today + '&club=' + code);
assert.equal(s.me.name, 'Austin b'); assert.equal(s.me.today.tot, 10); assert.deepEqual(s.me.stats.trophies.map(t => t.id).sort(), ['ace']);
assert.equal(s.me.stats.hcp, null); assert.equal(s.me.stats.streak, 2); assert.equal(s.me.stats.balls.lp.n, 1); assert.equal(s.me.stats.balls.lp.s, 0);
assert.equal(s.club.count, 3); assert.equal(s.club.member, true); assert.equal(s.club.founder, true);
assert.deepEqual(s.club.today.map(t => [t.nick, t.round && t.round.tot]), [['Austin b', 10], ['Sam', 13], ['Kim', null]]);
assert.equal(s.club.standings.find(x => x.nick === 'Sam').wins, 1); assert.equal(s.club.standings.find(x => x.nick === 'Austin b').wins, 0);
assert.equal(s.club.records.low.nick, 'Sam'); assert.deepEqual(s.club.records.courses, {}, 'no practice rounds yet, so no course records'); assert.equal(s.club.records.holes, undefined);
assert.deepEqual(s.club.records.feed.map(f => f.id + ':' + f.nick), ['ace:Austin b', 'hat:Sam']);
assert.equal((await stranger('GET', '/state?day=' + today + '&club=' + code)).club.member, false);
// handicap needs nine daily holes: three daily threes
const st2 = new MemStore(), solo = (() => { let c = ''; return async (m, pth, b) => { const r = await handle(new Request('https://golf.test/api' + pth, { method: m, headers: { cookie: c, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }), st2, { local: true }); const j = await r.json(); if (j.session) c = 'fl=' + j.session; return j; }; })();
assert.match((await solo('POST', '/player', { name: 'Solo', user: 'solo' })).session, /^[a-f0-9]{64}$/);
for (const [k, sc] of [[-1, [5, 4, 6]], [0, [4, 4, 6]], [1, [4, 3, 6]]]) { const d = new Date(Date.now() + k * 864e5).toISOString().slice(0, 10); assert.ok((await solo('POST', '/round', { day: d, holes, pars, scores: sc })).ok); }
{ const st = (await solo('GET', '/state?day=' + today)).me.stats; assert.equal(typeof st.hcp, 'number', 'three daily rounds give a handicap'); assert.equal(st.holes, 9); assert.equal(st.counted, 9); }
assert.ok((await sam('POST', '/leave', { code })).ok); assert.equal((await sam('GET', '/state?day=' + today + '&club=' + code)).club.count, 2);
// the full record of play: kept once per round id, refused without a player, and bad shapes are dropped
const hole = (k, par, sc) => ({ k, par, s: sc, p: 2, pen: 0, sw: sc - 2, pure: 1, fw: par > 3 ? 1 : null, gir: 1, dr: par > 3 ? 255 : null, fp: 22, hf: 3, chip: 0 });
const rnd = (id, kind, extra = {}) => ({ id, kind, day: today, course: 'mu', part: 'f', holes: [hole('mu10', 4, 4), hole('mu11', 3, 2), hole('mu12', 5, 6)], t: Date.now(), b: 1, ...extra });
assert.equal((await stranger('POST', '/log', { rounds: [rnd('abcdef01', 'practice')] })).error, 'no_player');
assert.equal((await solo('POST', '/log', { rounds: [rnd('abcdef01', 'practice'), rnd('abcdef02', 'daily'), rnd('bad id!', 'daily'), rnd('abcdef03', 'cheat'), rnd('abcdef04', 'daily', { holes: [hole('mu10', 4, 40)] })] })).saved, 2);
assert.equal((await solo('POST', '/log', { rounds: [rnd('abcdef01', 'practice'), rnd('abcdef05', 'event')] })).saved, 1);
const kept = await st2.get('gi:' + (await solo('GET', '/state?day=' + today)).me.id); assert.deepEqual(kept, ['abcdef01', 'abcdef02', 'abcdef05']);
assert.equal((await st2.get('g:' + (await solo('GET', '/state?day=' + today)).me.id + ':abcdef01')).tot, 12);
// trophies and balls come from the whole record of play, practice included
const st3 = new MemStore(), pro = (() => { let c = ''; return async (m, pth, b) => { const r = await handle(new Request('https://golf.test/api' + pth, { method: m, headers: { cookie: c, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }), st3, { local: true }); const j = await r.json(); if (j.session) c = 'fl=' + j.session; return j; }; })();
await pro('POST', '/player', { name: 'Pro', user: 'pro' });
const H18 = (c, f) => Array.from({ length: 18 }, (_, i) => { const par = [4, 3, 4, 5, 3, 4, 5, 4, 4][i % 9]; return { k: c + (i + 1), par, s: f(par, i), p: 1, pen: 0, sw: 2, pure: 2, fw: par > 3 ? 1 : null, gir: 1, dr: par > 3 ? 270 : null, fp: 10, hf: 10, chip: 0 }; });
const full = (id, c, f, n = 18) => ({ id, kind: 'practice', day: today, course: c, part: n > 9 ? 'a' : 'f', holes: H18(c, f).slice(0, n), t: 1, b: 1 });
assert.equal((await pro('POST', '/log', { rounds: [full('roundaa1', 'jc', (par, i) => i < 9 ? par - 1 : par), full('roundaa2', 'hk', par => par, 9), full('roundaa3', 'mu', (par, i) => i === 3 ? par + 1 : par)] })).saved, 3);
// handicap arithmetic: daily and event holes only, as strokes over the course rating for eighteen, averaged over the last 90 that
// count, in the order played
const st4 = new MemStore(), cap = (() => { let c = ''; return async (m, pth, b) => { const r = await handle(new Request('https://golf.test/api' + pth, { method: m, headers: { cookie: c, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }), st4, { local: true }); const j = await r.json(); if (j.session) c = 'fl=' + j.session; return j; }; })();
await cap('POST', '/player', { name: 'Cap', user: 'cap' }); const capHcp = async () => (await cap('GET', '/state?day=' + today)).me.stats;
const rate = h => { const r = RATING[h.k.slice(0, 2)]; return r ? r[+h.k.slice(2) - 1] : h.par - .55; }, per18 = hs => Math.round(hs.reduce((a, h) => a + h.s - rate(h), 0) / hs.length * 180) / 10;
const played = (id, kind, c, f, n, t) => ({ ...full(id, c, f, n), kind, t });
for (const c of ['gr', 'lp', 'hk', 'jc', 'mu', 'om', 'ts', 'an', 'pb', 'sa', 'ba', 'tl']) assert.ok(Array.isArray(RATING[c]) && RATING[c].length >= 9 && RATING[c].every(v => v > 1.5 && v < 7), 'every course is rated, hole by hole: ' + c);
const d6 = played('capaaaa1', 'daily', 'hk', par => par + 1, 6, 1), d3 = played('capaaaa2', 'daily', 'hk', par => par, 3, 2);
await cap('POST', '/log', { rounds: [d6] }); assert.equal((await capHcp()).hcp, null, 'six daily holes is not enough');
await cap('POST', '/log', { rounds: [d3] }); assert.equal((await capHcp()).hcp, per18([...d6.holes, ...d3.holes]), 'nine daily holes: every one counts, against its rating'); assert.equal((await capHcp()).counted, 9);
assert.ok((await capHcp()).hcp > 9, 'a stroke or so over par at Hancock is a long way behind the house pro, who is five or six under for the nine');
// practice does not count, however good; an event does
await cap('POST', '/log', { rounds: [played('capaaaa3', 'practice', 'jc', par => par - 2, 18, 3)] }); assert.equal((await capHcp()).hcp, per18([...d6.holes, ...d3.holes]), 'a practice round changes nothing'); assert.equal((await capHcp()).counted, 9); assert.equal((await capHcp()).holes, 27);
const ev = played('capaaaa4', 'event', 'hk', par => par - 1, 9, 4); await cap('POST', '/log', { rounds: [ev] }); assert.equal((await capHcp()).hcp, per18([...d6.holes, ...d3.holes, ...ev.holes]), 'an event counts'); assert.equal((await capHcp()).counted, 18);
// a course with no rating yet is taken at about what the pro averages everywhere
const z = played('capaaaa5', 'daily', 'zz', par => par, 18, 5); await cap('POST', '/log', { rounds: [z] }); assert.equal((await capHcp()).hcp, per18([...d6.holes, ...d3.holes, ...ev.holes, ...z.holes]));
// only the last 90 holes count, in the order they were played: by the day, then by the clock, not by when they arrived
{ const ten = Array.from({ length: 10 }, (_, i) => played('capbbbb' + i, 'daily', 'jc', par => par - 1, 9, 10 + i)); await cap('POST', '/log', { rounds: ten });
  assert.equal((await capHcp()).hcp, per18(ten.flatMap(r => r.holes)), 'the holes before the last 90 have dropped out'); assert.equal((await capHcp()).counted, 126);
  await cap('POST', '/log', { rounds: [played('capcccc1', 'daily', 'jc', par => par + 5, 18, .5)] }); assert.equal((await capHcp()).hcp, per18(ten.flatMap(r => r.holes)), 'a round that arrives late but was played first is still the oldest'); }
{ const st = (await solo('GET', '/state?day=' + today)).me.stats; assert.equal(st.holes, 15, 'two daily cards, and three logged threes (one of them the third daily card)'); assert.equal(st.counted, 12, 'the practice three is left out'); const was = st.hcp; assert.equal(typeof was, 'number');
  await solo('POST', '/log', { rounds: [rnd('abcdef09', 'practice')] }); const now = (await solo('GET', '/state?day=' + today)).me.stats; assert.equal(now.hcp, was, 'more practice leaves the handicap where it was'); assert.equal(now.holes, 18); }
let ps = (await pro('GET', '/state?day=' + today)).me.stats;
assert.deepEqual(ps.balls.jc, { b: 1, s: 0, g: 0, n: 9 }, 'nine under for eighteen: bronze, and nine holes toward silver');
assert.deepEqual(ps.balls.hk, { b: 0, s: 0, g: 0, n: 0 }, 'level par earns nothing'); assert.deepEqual(ps.balls.mu, { b: 0, s: 0, g: 0, n: 0 });
assert.deepEqual(ps.trophies.map(t => t.id).sort(), ['clean', 'fair', 'five', 'green'], 'jc: five running, no bogeys, every fairway and green; hk adds another green round; mu has a bogey');
assert.equal(ps.trophies.find(t => t.id === 'green').n, 3); assert.equal(ps.rounds, 0, 'practice does not count as a daily round');
await pro('POST', '/log', { rounds: [full('roundaa4', 'jc', (par, i) => i < 9 ? par : par - 1), full('roundaa5', 'hk', par => par - 1, 9), { ...full('roundaa6', 'lp', par => par, 18), holes: H18('lp', par => par).map((h, i) => i === 4 ? { ...h, s: 2, hf: 480, chip: 1 } : i === 7 ? { ...h, hf: 150 } : h) }] });
ps = (await pro('GET', '/state?day=' + today)).me.stats;
assert.deepEqual(ps.balls.jc, { b: 1, s: 1, g: 0, n: 18 }, 'the other nine birdied in a second round completes silver');
assert.deepEqual(ps.balls.hk, { b: 1, s: 1, g: 1, n: 9 }, 'nine under on a nine-hole course is gold');
assert.ok(ps.trophies.some(t => t.id === 'bomb') && ps.trophies.some(t => t.id === 'snake') && !ps.trophies.some(t => t.id === 'tour'));
assert.ok(ps.trophies.some(t => t.id === 'far') && !ps.trophies.some(t => t.id === 'far2'), 'holed from 160 yards: the hundred, not the two hundred');
// course records in a clubhouse come from practice rounds: the full course and each nine, an eighteen counting for its nines
const pc = (await pro('POST', '/club', { name: 'Pros', nick: 'Pro' })).code, cr = (await pro('GET', '/state?day=' + today + '&club=' + pc)).club;
const rp = r => r && r.tot - r.par;
assert.deepEqual([cr.records.out.yd, cr.records.out.nick, cr.records.out.k], [160, 'Pro', 'lp5'], 'the longest hole-out: putts do not count');
// a par 7 (Angels Landing) is a hole like any other; a par 8 is not
assert.equal((await pro('POST', '/log', { rounds: [{ ...full('roundpar7', 'np', par => par, 9), holes: H18('np', par => par).slice(0, 9).map((h, i) => i === 8 ? { ...h, par: 7, s: 6 } : h) }, { ...full('roundpar8', 'np', par => par, 9), holes: H18('np', par => par).slice(0, 9).map((h, i) => i === 8 ? { ...h, par: 8, s: 6 } : h) }] })).saved, 1);
await pro('POST', '/log', { rounds: [{ ...full('roundab1', 'ba', par => par, 18), kind: 'daily', holes: H18('ba', par => par).slice(0, 3).map((h, i) => i === 1 ? { ...h, s: 1, hf: 660, chip: 1 } : i === 2 ? { ...h, hf: 480, chip: 1 } : h) }] });
{ const s2 = (await pro('GET', '/state?day=' + today + '&club=' + pc)); assert.equal(s2.club.records.out.yd, 220, 'beaten by an ace from 220'); assert.equal(s2.club.records.out.k, 'ba2'); assert.equal(s2.me.stats.trophies.find(t => t.id === 'far2').n, 1); assert.equal(s2.me.stats.trophies.find(t => t.id === 'far').n, 3, 'the 220 counts for the hundred as well'); }
assert.deepEqual([rp(cr.records.courses.jc.f), rp(cr.records.courses.jc.a), rp(cr.records.courses.jc.b)], [-9, -9, -9], 'each nine birdied in a different round');
assert.deepEqual([rp(cr.records.courses.hk.f), cr.records.courses.hk.a], [-9, undefined], 'a nine-hole course has one record');
assert.deepEqual([rp(cr.records.courses.mu.f), rp(cr.records.courses.mu.a), rp(cr.records.courses.mu.b)], [1, 1, 0]); assert.equal(rp(cr.records.courses.lp.f), -1); assert.equal(cr.records.courses.jc.f.nick, 'Pro');
assert.equal(cr.standings.find(x => x.nick === 'Pro').hcp, null, 'practice alone gives no handicap in the standings');
// head to head: a challenge between two members, each in their own time or shot for shot
{ const st5 = new MemStore(), who = () => { let c = ''; return async (m, pth, b) => { const r = await handle(new Request('https://golf.test/api' + pth, { method: m, headers: { cookie: c, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }), st5, { local: true }); const j = await r.json(); if (j.session) c = 'fl=' + j.session; return j; }; };
  const ann = who(), bob = who(), cat = who(); await ann('POST', '/player', { name: 'Ann', user: 'ann' }); await bob('POST', '/player', { name: 'Bob', user: 'bob' }); await cat('POST', '/player', { name: 'Cat', user: 'cat' });
  const club = (await ann('POST', '/club', { name: 'Match Club', nick: 'Ann' })).code; await bob('POST', '/join', { code: club, nick: 'Bob' });
  const me = async w => (await w('GET', '/state?day=' + today)).me, bobId = (await me(bob)).id, catId = (await me(cat)).id, three = [{ k: 'hk2', par: 3 }, { k: 'hk5', par: 4 }, { k: 'hk7', par: 5 }];
  assert.equal((await ann('POST', '/match/new', { club, to: catId, holes: three })).error, 'member', 'only a member of the clubhouse can be challenged');
  assert.equal((await ann('POST', '/match/new', { club, to: bobId, holes: three.slice(0, 2) })).error, 'holes', 'three, nine or eighteen holes');
  // in their own time
  const m1 = (await ann('POST', '/match/new', { club, to: bobId, holes: three })).match; assert.equal(m1.st, 'open'); assert.equal(m1.side, 'a'); assert.equal(m1.an, 'Ann'); assert.equal(m1.bn, 'Bob');
  assert.equal((await me(bob)).matches.rows[0].turn, 'me'); assert.equal((await me(bob)).matches.rows[0].vs, 'Ann'); assert.equal((await cat('GET', '/match?id=' + m1.id)).error, 'no_match', 'nobody else can read it');
  assert.equal((await ann('POST', '/match/score', { id: m1.id, hi: 1, s: 4 })).error, 'score', 'holes in order');
  for (const [i, sc] of [3, 4, 5].entries()) assert.ok((await ann('POST', '/match/score', { id: m1.id, hi: i, s: sc })).ok);
  assert.ok((await ann('POST', '/match/score', { id: m1.id, hi: 2, s: 5 })).ok, 'a score sent twice is taken once'); assert.equal((await me(ann)).matches.rows[0].turn, 'them');
  assert.equal((await bob('POST', '/match/score', { id: m1.id, hi: 0, s: 2 })).match.st, 'on', 'playing takes the challenge up');
  await bob('POST', '/match/score', { id: m1.id, hi: 1, s: 4 }); const end = (await bob('POST', '/match/score', { id: m1.id, hi: 2, s: 5 })).match; assert.equal(end.st, 'done'); assert.equal(end.win, 'b');
  { const a = (await me(ann)).matches, b = (await me(bob)).matches; assert.deepEqual([a.w, a.l, a.t], [0, 1, 0]); assert.deepEqual([b.w, b.l, b.t], [1, 0, 0]); assert.deepEqual([a.vs[0].nick, a.vs[0].l], ['Bob', 1]); assert.equal(a.rows[0].win, 'them'); assert.equal(b.rows[0].win, 'me'); }
  // declined, and withdrawn
  const m2 = (await bob('POST', '/match/new', { club, to: (await me(ann)).id, holes: three })).match; assert.equal((await bob('POST', '/match/answer', { id: m2.id, yes: true })).error, 'not_yours', 'the challenger cannot take up their own challenge');
  assert.equal((await ann('POST', '/match/answer', { id: m2.id, yes: false })).match.st, 'off'); assert.equal((await me(ann)).matches.rows.some(r => r.id === m2.id), false, 'a declined match drops out of the list');
  // shot for shot: the honour on the tee, then whoever is further from the hole; the hole's winner has the next honour
  const m3 = (await ann('POST', '/match/new', { club, to: bobId, holes: three, live: true })).match; assert.equal(m3.turn, 'a'); const shot = (w, o) => w('POST', '/match/shot', { id: m3.id, ...o });
  assert.equal((await shot(ann, { hi: 0, n: 1, x: 1, y: 1, d: 30 })).error, 'no_match', 'not until it is taken up'); assert.equal((await bob('POST', '/match/answer', { id: m3.id, yes: true })).match.st, 'on');
  assert.equal((await shot(bob, { hi: 0, n: 1, x: 5, y: 5, d: 10 })).error, 'turn', 'Ann has the honour');
  assert.equal((await shot(ann, { hi: 0, n: 1, x: 1, y: 1, d: 30 })).match.turn, 'b', 'then Bob tees off');
  assert.equal((await shot(ann, { hi: 0, n: 1, x: 1, y: 1, d: 30 })).match.seq, (await ann('GET', '/match?id=' + m3.id)).match.seq, 'a shot sent twice is taken once');
  assert.equal((await shot(bob, { hi: 0, n: 1, x: 5, y: 5, d: 10 })).match.turn, 'a', 'Ann is further away');
  assert.equal((await shot(ann, { hi: 0, n: 2, x: 2, y: 2, d: 12 })).match.turn, 'a', 'and still is');
  assert.equal((await shot(ann, { hi: 0, n: 3, x: 3, y: 3, d: 2 })).match.turn, 'b');
  assert.equal((await shot(bob, { hi: 0, n: 2, x: 6, y: 6, d: 0, in: true })).match.turn, 'a', 'Bob is in; Ann plays on');
  { const x = (await shot(ann, { hi: 0, n: 4, x: 6, y: 6, d: 0, in: true })).match; assert.deepEqual([x.hi, x.turn, x.sc.a[0], x.sc.b[0], x.pos.a], [1, 'b', 4, 2, null], 'next hole, Bob to play first'); assert.equal(x.last.hi, 0); }
  for (const hi of [1, 2]) { await shot(bob, { hi, n: 1, x: 9, y: 9, d: 0, in: true }); await shot(ann, { hi, n: 1, x: 9, y: 9, d: 0, in: true }); }
  { const x = (await ann('GET', '/match?id=' + m3.id)).match; assert.deepEqual([x.st, x.win, x.turn], ['done', 'b', null]); const a = (await me(ann)).matches; assert.deepEqual([a.w, a.l, a.t], [0, 2, 0]); assert.equal(a.vs[0].l, 2); }
  // calling a match off takes both
  { const m0 = (await ann('POST', '/match/new', { club, to: bobId, holes: three })).match; assert.equal((await ann('POST', '/match/end', { id: m0.id, yes: true })).match.st, 'off', 'before it is taken up there is nobody to ask');
    const m4 = (await ann('POST', '/match/new', { club, to: bobId, holes: three })).match, end = (w, yes) => w('POST', '/match/end', { id: m4.id, yes }); await bob('POST', '/match/score', { id: m4.id, hi: 0, s: 3 });
    assert.equal((await cat('POST', '/match/end', { id: m4.id, yes: true })).error, 'no_match');
    { const x = (await end(ann, true)).match; assert.deepEqual([x.st, x.end], ['on', 'a'], 'asking alone ends nothing'); assert.equal((await end(ann, true)).match.st, 'on', 'nor does asking twice'); }
    { const r = (await me(bob)).matches.rows.find(r => r.id === m4.id); assert.deepEqual([r.end, r.turn], ['them', 'me'], 'it waits on Bob'); assert.equal((await me(ann)).matches.rows.find(r => r.id === m4.id).end, 'me'); }
    assert.equal((await end(bob, false)).match.end, null, 'Bob plays on'); assert.equal((await end(bob, true)).match.end, 'b'); assert.equal((await end(bob, false)).match.end, null, 'or takes his own request back');
    await end(bob, true); const x = (await end(ann, true)).match; assert.deepEqual([x.st, x.end], ['off', null], 'both agreed');
    const a = (await me(ann)).matches; assert.equal(a.rows.some(r => r.id === m4.id), false, 'it drops out of the list'); assert.deepEqual([a.w, a.l, a.t], [0, 2, 0], 'and counts for nobody');
    assert.equal((await bob('POST', '/match/score', { id: m4.id, hi: 1, s: 3 })).error, 'no_match', 'and cannot be played on'); }
  // a match round goes into the record of play but not the handicap
  assert.equal((await ann('POST', '/log', { rounds: [{ id: 'matchlog1', kind: 'match', day: today, course: 'hk', part: 'f', holes: H18('hk', par => par).slice(0, 9), t: 1, b: 1 }] })).saved, 1); assert.equal((await me(ann)).stats.counted, 0); assert.equal((await me(ann)).stats.holes, 9); }
console.log('server core: all checks passed');
