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
const p = await austin('POST', '/player', { name: '  Austin <b> ' }); assert.ok(p.ok); assert.match(p.cookieSet, /HttpOnly/); assert.match(p.cookieSet, /Secure/); assert.equal(p.session, undefined, 'token never returned to page script on the hosted site');
const club = await austin('POST', '/club', { name: 'Sunday Skins' }); assert.ok(club.ok); const code = club.code; assert.match(code, /^[A-Z2-9]{6}$/);
await sam('POST', '/player', { name: 'Sam' }); await kim('POST', '/player', { name: 'Kim' });
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
assert.equal(s.me.name, 'Austin b'); assert.equal(s.me.today.tot, 10); assert.deepEqual(s.me.stats.trophies.map(t => t.id).sort(), ['ace', 'clean', 'red']);
assert.equal(s.me.stats.hcp, null); assert.equal(s.me.stats.streak, 2); assert.deepEqual(s.me.stats.sweep, { lp: ['lp6'] });
assert.equal(s.club.count, 3); assert.equal(s.club.member, true); assert.equal(s.club.founder, true);
assert.deepEqual(s.club.today.map(t => [t.nick, t.round && t.round.tot]), [['Austin b', 10], ['Sam', 13], ['Kim', null]]);
assert.equal(s.club.standings.find(x => x.nick === 'Sam').wins, 1); assert.equal(s.club.standings.find(x => x.nick === 'Austin b').wins, 0);
assert.equal(s.club.records.low.nick, 'Sam'); assert.equal(s.club.records.holes.lp6.score, 1); assert.equal(s.club.records.holes.lp6.nick, 'Austin b'); assert.equal(s.club.records.holes.gr5.nick, 'Sam');
assert.deepEqual(s.club.records.feed.map(f => f.id + ':' + f.nick), ['ace:Austin b', 'hat:Sam']);
assert.equal((await stranger('GET', '/state?day=' + today + '&club=' + code)).club.member, false);
// handicap appears at three rounds: best differential of 3, times 6
const st2 = new MemStore(), solo = (() => { let c = ''; return async (m, pth, b) => { const r = await handle(new Request('https://golf.test/api' + pth, { method: m, headers: { cookie: c, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }), st2, { local: true }); const j = await r.json(); if (j.session) c = 'fl=' + j.session; return j; }; })();
assert.match((await solo('POST', '/player', { name: 'Solo' })).session, /^[a-f0-9]{64}$/);
for (const [k, sc] of [[-1, [5, 4, 6]], [0, [4, 4, 6]], [1, [4, 3, 6]]]) { const d = new Date(Date.now() + k * 864e5).toISOString().slice(0, 10); assert.ok((await solo('POST', '/round', { day: d, holes, pars, scores: sc })).ok); }
assert.equal((await solo('GET', '/state?day=' + today)).me.stats.hcp, 6);
assert.ok((await sam('POST', '/leave', { code })).ok); assert.equal((await sam('GET', '/state?day=' + today + '&club=' + code)).club.count, 2);
// the full record of play: kept once per round id, refused without a player, and bad shapes are dropped
const hole = (k, par, sc) => ({ k, par, s: sc, p: 2, pen: 0, sw: sc - 2, pure: 1, fw: par > 3 ? 1 : null, gir: 1, dr: par > 3 ? 255 : null, fp: 22, hf: 3, chip: 0 });
const rnd = (id, kind, extra = {}) => ({ id, kind, day: today, course: 'mu', part: 'f', holes: [hole('mu10', 4, 4), hole('mu11', 3, 2), hole('mu12', 5, 6)], t: Date.now(), b: 1, ...extra });
assert.equal((await stranger('POST', '/log', { rounds: [rnd('abcdef01', 'practice')] })).error, 'no_player');
assert.equal((await solo('POST', '/log', { rounds: [rnd('abcdef01', 'practice'), rnd('abcdef02', 'daily'), rnd('bad id!', 'daily'), rnd('abcdef03', 'cheat'), rnd('abcdef04', 'daily', { holes: [hole('mu10', 4, 40)] })] })).saved, 2);
assert.equal((await solo('POST', '/log', { rounds: [rnd('abcdef01', 'practice'), rnd('abcdef05', 'event')] })).saved, 1);
const kept = await st2.get('gi:' + (await solo('GET', '/state?day=' + today)).me.id); assert.deepEqual(kept, ['abcdef01', 'abcdef02', 'abcdef05']);
assert.equal((await st2.get('g:' + (await solo('GET', '/state?day=' + today)).me.id + ':abcdef01')).tot, 12);
console.log('server core: all checks passed');
