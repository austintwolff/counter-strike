// The whole clubhouse server as one portable module. It needs only web-standard Request, Response and crypto,
// and a key-value store with get, put, del and list(prefix). The hosted site runs it behind /api with a database.
// The page also carries a copy, backed by browser storage, so a lone player has a working clubhouse offline.
//
// Who you are: a random session token, kept in an HttpOnly cookie and stored here only as a hash.
// There is no way to become a player by typing their name. The only other way in is a passkey that player saved.
const enc=new TextEncoder();
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const sha256=async d=>new Uint8Array(await crypto.subtle.digest('SHA-256',typeof d==='string'?enc.encode(d):d));
const hex=u=>[...u].map(b=>b.toString(16).padStart(2,'0')).join('');
const rand=n=>crypto.getRandomValues(new Uint8Array(n));
const total=a=>a.reduce((x,y)=>x+y,0);
const json=(o,status=200,headers={})=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const fail=(error,status=400)=>json({ok:false,error},status);
const cleanName=(s,max=16)=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const validDay=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!isNaN(Date.parse(d+'T00:00:00Z'))?d:null;
const dayNum=d=>Math.round(Date.parse(d+'T00:00:00Z')/864e5);
const numDay=n=>new Date(n*864e5).toISOString().slice(0,10);
const CODE='ABCDEFGHJKMNPQRSTUVWXYZ23456789',COOKIE='fl';

// ───────── a player's own numbers, all derived from their rounds (newest first)
// Handicap: the average of your best few of the last 20 rounds, in strokes over par, scaled from 3 holes to 18.
function handicap(rs){const d=rs.slice(0,20).map(r=>r.tot-r.par),n=d.length;if(n<3)return null;
  const use=n<6?1:n<9?2:n<12?3:n<15?4:n<17?5:n<19?6:n<20?7:8;d.sort((a,b)=>a-b);return Math.round(total(d.slice(0,use))/use*6*10)/10}
function streakOf(rs,day){const set=new Set(rs.map(r=>r.day));let d=dayNum(day),n=0;if(!set.has(day))d--;while(set.has(numDay(d))){n++;d--}return n}
function maxStreak(rs){const ds=[...new Set(rs.map(r=>dayNum(r.day)))].sort((a,b)=>a-b);let best=0,run=0,prev=null;for(const d of ds){run=prev!==null&&d===prev+1?run+1:1;best=Math.max(best,run);prev=d}return best}
function personal(rs,day){const tro={},add=(id,d)=>{(tro[id]=tro[id]||{id,n:0,day:d}).n++},sweep={};
  for(const r of[...rs].reverse()){const rel=r.scores.map((s,i)=>s-r.pars[i]);
    r.scores.forEach((s,i)=>{if(s===1)add('ace',r.day);else if(rel[i]<=-2)add('eagle',r.day);
      if(rel[i]<=-1){const c=r.holes[i].slice(0,2),a=sweep[c]=sweep[c]||[];if(!a.includes(r.holes[i]))a.push(r.holes[i])}});
    if(rel.every(x=>x<=-1))add('hat',r.day);if(rel.every(x=>x<=0))add('clean',r.day);if(r.tot<r.par)add('red',r.day)}
  const ms=maxStreak(rs);if(ms>=7)tro.week={id:'week',n:1};if(ms>=30)tro.month={id:'month',n:1};
  for(const c in sweep)if(sweep[c].length>=9)tro['sweep-'+c]={id:'sweep-'+c,n:1};
  const best=rs.reduce((b,r)=>!b||r.tot-r.par<b.tot-b.par?r:b,null);
  return{rounds:rs.length,hcp:handicap(rs),best:best&&{tot:best.tot,par:best.par,day:best.day},streak:streakOf(rs,day),trophies:Object.values(tro),sweep}}

// ───────── storage helpers
const roundsOf=async(store,pid)=>(await store.list('r:'+pid+':')).map(x=>x.v).sort((a,b)=>a.day<b.day?1:-1);
async function session(req,store){const m=/(?:^|;\s*)fl=([a-f0-9]{64})/.exec(req.headers.get('cookie')||''),tok=m?m[1]:(req.headers.get('x-fl-session')||'');
  if(!/^[a-f0-9]{64}$/.test(tok))return null;const s=await store.get('s:'+hex(await sha256(tok)));if(!s)return null;
  const player=await store.get('p:'+s.pid);return player?{pid:s.pid,player}:null}
async function newSession(store,pid){const tok=hex(rand(32));await store.put('s:'+hex(await sha256(tok)),{pid,t:Date.now()});return tok}
const cookieFor=(tok,url)=>`${COOKIE}=${tok}; Path=/; Max-Age=34560000; HttpOnly; SameSite=Lax${url.protocol==='https:'?'; Secure':''}`;

// ───────── what a clubhouse shows
async function clubView(store,club,pid,day){const ms=await store.list('m:'+club.code+':'),members=[];
  for(const{k,v}of ms){const id=k.split(':')[2];members.push({id,nick:v.nick,rounds:await roundsOf(store,id)})}
  // a day is won by the lowest score among members, once the day is over and at least two played
  const byDay={},wins={};for(const m of members)for(const r of m.rounds)if(r.day<day)(byDay[r.day]=byDay[r.day]||[]).push({id:m.id,tot:r.tot});
  for(const d in byDay){const a=byDay[d];if(a.length<2)continue;const best=Math.min(...a.map(x=>x.tot));for(const x of a)if(x.tot===best)wins[x.id]=(wins[x.id]||0)+1}
  const today=members.map(m=>{const r=m.rounds.find(x=>x.day===day);return{id:m.id,nick:m.nick,me:m.id===pid,round:r?{holes:r.holes,pars:r.pars,scores:r.scores,tot:r.tot,par:r.par}:null}})
    .sort((a,b)=>(a.round?a.round.tot-a.round.par:99)-(b.round?b.round.tot-b.round.par:99)||a.nick.localeCompare(b.nick));
  const standings=members.map(m=>{const p=personal(m.rounds,day);return{id:m.id,nick:m.nick,me:m.id===pid,hcp:p.hcp,rounds:p.rounds,wins:wins[m.id]||0,streak:p.streak,best:p.best}})
    .sort((a,b)=>(a.hcp==null?999:a.hcp)-(b.hcp==null?999:b.hcp)||b.wins-a.wins||b.rounds-a.rounds||a.nick.localeCompare(b.nick));
  const holes={},feed=[];let low=null;const all=[];for(const m of members)for(const r of m.rounds)all.push({m,r});
  all.sort((a,b)=>a.r.day<b.r.day?-1:a.r.day>b.r.day?1:a.r.ts-b.r.ts);
  for(const{m,r}of all){r.holes.forEach((h,i)=>{const s=r.scores[i];if(!holes[h]||s<holes[h].score)holes[h]={score:s,par:r.pars[i],nick:m.nick,day:r.day};
      if(s===1)feed.push({id:'ace',nick:m.nick,day:r.day,hole:h});else if(s-r.pars[i]<=-2)feed.push({id:'eagle',nick:m.nick,day:r.day,hole:h})});
    if(r.scores.every((s,i)=>s<r.pars[i]))feed.push({id:'hat',nick:m.nick,day:r.day});
    if(!low||r.tot-r.par<low.tot-low.par)low={tot:r.tot,par:r.par,nick:m.nick,day:r.day}}
  return{code:club.code,name:club.name,founder:club.owner===pid,member:members.some(m=>m.id===pid),count:members.length,today,standings,records:{holes,low,feed:feed.reverse().slice(0,12)}}}
async function state(store,ses,day,code){const out={me:null,club:null};
  if(ses){const rs=await roundsOf(store,ses.pid),clubs=[];for(const c of ses.player.clubs||[]){const cl=await store.get('c:'+c);if(cl)clubs.push({code:c,name:cl.name})}
    out.me={id:ses.pid,name:ses.player.name,passkey:!!(ses.player.keys&&ses.player.keys.length),clubs,stats:personal(rs,day),today:rs.find(r=>r.day===day)||null}}
  if(code){const club=await store.get('c:'+String(code).toUpperCase());if(club)out.club=await clubView(store,club,ses&&ses.pid,day)}
  return out}

// ───────── passkeys (WebAuthn): the server keeps a public key; the phone proves it holds the private one
function derToRaw(der){let o=der[1]&0x80?2+(der[1]&0x7f):2;const int=()=>{if(der[o++]!==2)throw new Error('der');const len=der[o++];let v=der.slice(o,o+len);o+=len;
    while(v.length>32&&v[0]===0)v=v.slice(1);const out=new Uint8Array(32);out.set(v,32-v.length);return out};
  const r=int(),s=int(),raw=new Uint8Array(64);raw.set(r);raw.set(s,32);return raw}
async function importKey(k){const spki=unb64u(k.spki);
  if(k.alg===-7)return crypto.subtle.importKey('spki',spki,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(k.alg===-257)return crypto.subtle.importKey('spki',spki,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  throw new Error('alg')}
async function checkClientData(store,cdj,type,origin){let c;try{c=JSON.parse(new TextDecoder().decode(cdj))}catch(e){return null}
  if(c.type!==type||c.origin!==origin||typeof c.challenge!=='string')return null;
  const ch=await store.get('ch:'+c.challenge);if(!ch)return null;await store.del('ch:'+c.challenge);return Date.now()-ch.t<3e5?ch:null}

// ───────── the API
export async function handle(req,store,opts={}){const url=new URL(req.url),path=url.pathname.replace(/^\/api/,''),m=req.method,origin=url.protocol+'//'+url.host;
  try{
    if(m==='GET'&&path==='/ping')return json({ok:true,v:1});
    let ses=await session(req,store);
    if(m==='GET'&&path==='/state'){const day=validDay(url.searchParams.get('day'))||numDay(Math.floor(Date.now()/864e5));return json({ok:true,...await state(store,ses,day,url.searchParams.get('club'))})}
    if(m!=='POST')return fail('not_found',404);
    const o=req.headers.get('origin');if(o&&o!==origin&&!opts.local)return fail('bad_origin',403);
    const b=await req.json().catch(()=>({})),head={},extra={};
    const signIn=async pid=>{const tok=await newSession(store,pid);head['set-cookie']=cookieFor(tok,url);if(opts.local)extra.session=tok};
    const done=(o={})=>json({ok:true,...o,...extra},200,head);
    switch(path){
      case'/player':{const name=cleanName(b.name);if(name.length<1)return fail('name');
        if(ses){ses.player.name=name;await store.put('p:'+ses.pid,ses.player)}
        else{const pid=b64u(rand(9));await store.put('p:'+pid,{id:pid,name,created:Date.now(),clubs:[],keys:[]});await signIn(pid)}
        return done()}
      case'/club':{if(!ses)return fail('no_player',401);const name=cleanName(b.name,24),nick=cleanName(b.nick)||ses.player.name;if(name.length<2)return fail('name');
        if((ses.player.clubs||[]).length>=8)return fail('too_many');
        let code;do{code=[...rand(6)].map(x=>CODE[x%CODE.length]).join('')}while(await store.get('c:'+code));
        await store.put('c:'+code,{code,name,owner:ses.pid,created:Date.now()});await store.put('m:'+code+':'+ses.pid,{nick,joined:Date.now()});
        ses.player.clubs=[...(ses.player.clubs||[]),code];await store.put('p:'+ses.pid,ses.player);return done({code})}
      case'/join':{if(!ses)return fail('no_player',401);const code=String(b.code||'').toUpperCase(),club=await store.get('c:'+code),nick=cleanName(b.nick)||ses.player.name;if(!club)return fail('no_club',404);
        const ms=await store.list('m:'+code+':'),mine=ms.find(x=>x.k==='m:'+code+':'+ses.pid);
        if(!mine&&ms.length>=50)return fail('full');if(ms.some(x=>x!==mine&&x.v.nick.toLowerCase()===nick.toLowerCase()))return fail('taken');
        await store.put('m:'+code+':'+ses.pid,{nick,joined:mine?mine.v.joined:Date.now()});
        if(!(ses.player.clubs||[]).includes(code)){if((ses.player.clubs||[]).length>=8)return fail('too_many');ses.player.clubs=[...(ses.player.clubs||[]),code];await store.put('p:'+ses.pid,ses.player)}
        return done({code})}
      case'/leave':{if(!ses)return fail('no_player',401);const code=String(b.code||'').toUpperCase();await store.del('m:'+code+':'+ses.pid);
        ses.player.clubs=(ses.player.clubs||[]).filter(c=>c!==code);await store.put('p:'+ses.pid,ses.player);return done()}
      case'/round':{if(!ses)return fail('no_player',401);const day=validDay(b.day),h=b.holes,p=b.pars,s=b.scores;
        if(!day||Math.abs(dayNum(day)-Math.floor(Date.now()/864e5))>1)return fail('day');
        if(![h,p,s].every(a=>Array.isArray(a)&&a.length===3)||!h.every(x=>/^[a-z]{2}([1-9]|1[0-8])$/.test(x))||new Set(h).size!==3)return fail('holes');
        if(!p.every(x=>x===3||x===4||x===5)||!s.every((x,i)=>Number.isInteger(x)&&x>=1&&x<=p[i]+5))return fail('scores');
        const key='r:'+ses.pid+':'+day;if(!(await store.get(key)))await store.put(key,{day,holes:h,pars:p,scores:s,tot:total(s),par:total(p),ts:Date.now()}); // the first card of the day stands
        return done()}
      // the full record of rounds, daily and practice, hole by hole. Kept as sent (after checking its shape) so that later tables can be built from it.
      case'/log':{if(!ses)return fail('no_player',401);const rs=b.rounds;if(!Array.isArray(rs)||rs.length>25)return fail('rounds');
        const num=(v,lo,hi)=>v==null?null:Number.isFinite(+v)?Math.min(hi,Math.max(lo,Math.round(+v))):null,idx=(await store.get('gi:'+ses.pid))||[];let saved=0;
        for(const r of rs){if(!r||typeof r.id!=='string'||!/^[a-z0-9]{6,24}$/.test(r.id)||!['daily','practice','event'].includes(r.kind)||!validDay(r.day)||!Array.isArray(r.holes)||r.holes.length<1||r.holes.length>18||idx.includes(r.id))continue;
          const holes=r.holes.map(h=>h&&/^[a-z]{2}([1-9]|1[0-8])$/.test(h.k)&&(h.par===3||h.par===4||h.par===5)&&Number.isInteger(h.s)&&h.s>=1&&h.s<=h.par+5?{k:h.k,par:h.par,s:h.s,p:num(h.p,0,12),pen:num(h.pen,0,10),sw:num(h.sw,0,12),pure:num(h.pure,0,12),fw:h.fw==null?null:h.fw?1:0,gir:h.gir?1:0,dr:num(h.dr,0,450),fp:num(h.fp,0,400),hf:num(h.hf,0,1500),chip:h.chip?1:0}:null);
          if(holes.some(h=>!h))continue;
          await store.put('g:'+ses.pid+':'+r.id,{id:r.id,kind:r.kind,day:r.day,course:/^[a-z]{2}$/.test(r.course||'')?r.course:null,part:/^[fba]$/.test(r.part||'')?r.part:null,holes,tot:total(holes.map(h=>h.s)),par:total(holes.map(h=>h.par)),t:num(r.t,0,4e12),b:num(r.b,0,4e12),ts:Date.now()});idx.push(r.id);saved++}
        if(saved)await store.put('gi:'+ses.pid,idx.slice(-3000));return done({saved})}
      case'/passkey/options':{const challenge=b64u(rand(32));await store.put('ch:'+challenge,{pid:ses?ses.pid:null,t:Date.now()});
        if(b.kind==='create'){if(!ses)return fail('no_player',401);
          return done({publicKey:{challenge,rp:{name:'Breakfast Ball',id:url.hostname},user:{id:b64u(enc.encode(ses.pid)),name:ses.player.name,displayName:ses.player.name},
            pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{residentKey:'required',userVerification:'preferred'},attestation:'none',timeout:60000}})}
        return done({publicKey:{challenge,rpId:url.hostname,userVerification:'preferred',timeout:60000}})}
      case'/passkey/create':{if(!ses)return fail('no_player',401);const ch=await checkClientData(store,unb64u(b.clientDataJSON),'webauthn.create',origin);
        if(!ch||ch.pid!==ses.pid)return fail('challenge');const key={id:String(b.id||''),spki:String(b.spki||''),alg:b.alg};
        if(!/^[\w-]{8,400}$/.test(key.id)||await store.get('k:'+key.id))return fail('key');await importKey(key);
        ses.player.keys=[...(ses.player.keys||[]),key].slice(-5);await store.put('p:'+ses.pid,ses.player);await store.put('k:'+key.id,{pid:ses.pid});return done()}
      case'/passkey/login':{const ref=await store.get('k:'+String(b.id||''));if(!ref)return fail('unknown_key',401);const player=await store.get('p:'+ref.pid),key=player&&(player.keys||[]).find(k=>k.id===b.id);if(!key)return fail('unknown_key',401);
        const cdj=unb64u(b.clientDataJSON),auth=unb64u(b.authenticatorData),sig=unb64u(b.signature);if(!(await checkClientData(store,cdj,'webauthn.get',origin)))return fail('challenge',401);
        if(hex(auth.slice(0,32))!==hex(await sha256(url.hostname))||!(auth[32]&1))return fail('auth_data',401);
        const data=new Uint8Array(auth.length+32);data.set(auth);data.set(await sha256(cdj),auth.length);
        const ok=key.alg===-7?await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},await importKey(key),derToRaw(sig),data):await crypto.subtle.verify('RSASSA-PKCS1-v1_5',await importKey(key),sig,data);
        if(!ok)return fail('signature',401);await signIn(ref.pid);return done()}
    }
    return fail('not_found',404)
  }catch(e){return fail('server_error',500)}}

// ───────── stores
// In memory, optionally mirrored somewhere by a save callback (the page mirrors it to browser storage).
export class MemStore{constructor(data,save){this.m=new Map(Object.entries(data||{}));this.save=save||(()=>{})}
  async get(k){return this.m.has(k)?JSON.parse(this.m.get(k)):null}
  async put(k,v){this.m.set(k,JSON.stringify(v));this.save(Object.fromEntries(this.m))}
  async del(k){this.m.delete(k);this.save(Object.fromEntries(this.m))}
  async list(p){return[...this.m.keys()].filter(k=>k.startsWith(p)).sort().map(k=>({k,v:JSON.parse(this.m.get(k))}))}}
// A Cloudflare D1 (SQLite) database used as one key-value table.
export class D1Store{constructor(db){this.db=db}
  async init(){await this.db.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)').run()}
  async get(k){const r=await this.db.prepare('SELECT v FROM kv WHERE k=?').bind(k).first();return r?JSON.parse(r.v):null}
  async put(k,v){await this.db.prepare('INSERT INTO kv (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(k,JSON.stringify(v)).run()}
  async del(k){await this.db.prepare('DELETE FROM kv WHERE k=?').bind(k).run()}
  async list(p){const r=await this.db.prepare('SELECT k,v FROM kv WHERE k>=? AND k<? ORDER BY k').bind(p,p+'￿').all();return(r.results||[]).map(x=>({k:x.k,v:JSON.parse(x.v)}))}}
