// Runs the server module directly: several players, a clubhouse, a week of rounds.
import { handle, MemStore } from './core.js';
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
// handicap needs eighteen holes of any play: three daily threes are nine
const st2 = new MemStore(), solo = (() => { let c = ''; return async (m, pth, b) => { const r = await handle(new Request('https://golf.test/api' + pth, { method: m, headers: { cookie: c, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }), st2, { local: true }); const j = await r.json(); if (j.session) c = 'fl=' + j.session; return j; }; })();
assert.match((await solo('POST', '/player', { name: 'Solo', user: 'solo' })).session, /^[a-f0-9]{64}$/);
for (const [k, sc] of [[-1, [5, 4, 6]], [0, [4, 4, 6]], [1, [4, 3, 6]]]) { const d = new Date(Date.now() + k * 864e5).toISOString().slice(0, 10); assert.ok((await solo('POST', '/round', { day: d, holes, pars, scores: sc })).ok); }
{ const st = (await solo('GET', '/state?day=' + today)).me.stats; assert.equal(st.hcp, null); assert.equal(st.holes, 9); }
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
// handicap arithmetic: nine-hole stretches in the order played, doubled; the best 40% of them averaged
const st4 = new MemStore(), cap = (() => { let c = ''; return async (m, pth, b) => { const r = await handle(new Request('https://golf.test/api' + pth, { method: m, headers: { cookie: c, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }), st4, { local: true }); const j = await r.json(); if (j.session) c = 'fl=' + j.session; return j; }; })();
await cap('POST', '/player', { name: 'Cap', user: 'cap' }); const capHcp = async () => (await cap('GET', '/state?day=' + today)).me.stats;
await cap('POST', '/log', { rounds: [full('capaaaa1', 'hk', par => par + 1, 9)] }); assert.equal((await capHcp()).hcp, null, 'nine holes is not enough');
await cap('POST', '/log', { rounds: [full('capaaaa2', 'hk', par => par, 9)] }); assert.equal((await capHcp()).hcp, 0, 'stretches of +18 and 0: the better one'); assert.equal((await capHcp()).holes, 18);
await cap('POST', '/log', { rounds: [full('capaaaa3', 'hk', par => par - 1, 9)] }); assert.equal((await capHcp()).hcp, -18, 'three stretches: still the best one, a plus handicap');
await cap('POST', '/log', { rounds: [full('capaaaa4', 'hk', par => par + 2, 9), full('capaaaa5', 'hk', par => par + 2, 9)] }); assert.equal((await capHcp()).hcp, -9, 'five stretches: the best two averaged');
{ const st = (await solo('GET', '/state?day=' + today)).me.stats; assert.equal(st.holes, 15, 'two daily cards, and three logged threes (one of them the third daily card)'); assert.equal(st.hcp, null);
  await solo('POST', '/log', { rounds: [rnd('abcdef09', 'practice')] }); assert.equal(typeof (await solo('GET', '/state?day=' + today)).me.stats.hcp, 'number', 'daily threes and practice chain together to eighteen holes'); }
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
// course records in a clubhouse come from practice rounds: the full course and each nine, an eighteen counting for its nines
const pc = (await pro('POST', '/club', { name: 'Pros', nick: 'Pro' })).code, cr = (await pro('GET', '/state?day=' + today + '&club=' + pc)).club;
const rp = r => r && r.tot - r.par;
assert.deepEqual([rp(cr.records.courses.jc.f), rp(cr.records.courses.jc.a), rp(cr.records.courses.jc.b)], [-9, -9, -9], 'each nine birdied in a different round');
assert.deepEqual([rp(cr.records.courses.hk.f), cr.records.courses.hk.a], [-9, undefined], 'a nine-hole course has one record');
assert.deepEqual([rp(cr.records.courses.mu.f), rp(cr.records.courses.mu.a), rp(cr.records.courses.mu.b)], [1, 1, 0]); assert.equal(rp(cr.records.courses.lp.f), -1); assert.equal(cr.records.courses.jc.f.nick, 'Pro');
assert.equal(typeof cr.standings[0].hcp, 'number', 'practice rounds give a handicap in the standings');
console.log('server core: all checks passed');
