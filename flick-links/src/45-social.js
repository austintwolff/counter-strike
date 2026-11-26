// ───────── the clubhouse
// The page talks to the clubhouse server over /api when the game is on its own web address.
// Anywhere else it runs the same server code in the page, on browser storage: a solo clubhouse.
// Trophies are earned in any round, daily or practice (Three for Three is the daily's own; the two streaks count days played).
const TROPHY={ace:['1','Ace','A hole in one'],alb:['−3','Albatross','Three under on one hole'],five:['V','Five in a Row','Five birdies running'],hat:['III','Three for Three','Birdie all of the daily three'],
  clean:['✓','Clean Card','Eighteen holes, no bogeys'],fair:['↑','Fairway Finder','Every fairway in eighteen'],green:['◉','Dance Floor','Every green in a round'],snake:['S','Snake','A putt holed from 40 feet'],
  bomb:['◎','Holed Out','Holed from 50 yards out'],week:['7','Regular','Seven days running'],month:['30','Fixture','Thirty days running'],tour:[String(COURSES.length),'Grand Tour','A full round on every course']};
const MSG={name:'Enter a name.',taken:'Someone in this clubhouse already has that name.',full:'This clubhouse is full.',no_club:'That clubhouse no longer exists.',too_many:'You are in the most clubhouses one player can join.',user:'Usernames are 3 to 16 letters, numbers or underscores.',user_taken:'That username is taken.'};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const hcpStr=h=>h==null?'–':h<0?'+'+(-h).toFixed(1):h.toFixed(1);
const holeKey=h=>h.course.id+h.k; // the hole's fixed place in its course, 1 to 18, which is not always its number
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
const shortDay=d=>{const[y,m,dd]=d.split('-').map(Number);return new Date(y,m-1,dd).toLocaleDateString(undefined,{month:'short',day:'numeric'})};
const toB64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const C={me:null,club:null,code:fetchKey('club')||'',invite:'',tab:'today'};
const Net={remote:false,token:fetchKey('tok')||'',mem:null,ready:null,
  async init(){let alone=false;try{alone=window.top===window.self&&/^https?:$/.test(location.protocol)}catch(e){}
    if(alone)try{const j=await(await fetch('api/ping',{cache:'no-store'})).json();this.remote=!!(j&&j.ok)}catch(e){}
    if(!this.remote)this.mem=new LocalServer.MemStore(fetchKey('srv')||{},d=>store('srv',d))},
  async call(method,path,body){await this.ready;
    if(this.remote)return(await fetch('api'+path,{method,cache:'no-store',credentials:'same-origin',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined})).json();
    const r=await LocalServer.handle(new Request('https://solo.invalid/api'+path,{method,headers:{'content-type':'application/json','x-fl-session':this.token},body:body?JSON.stringify(body):undefined}),this.mem,{local:true}),j=await r.json();
    if(j.session){this.token=j.session;store('tok',this.token)}return j}};
const pickClub=code=>{C.code=code||'';store('club',C.code)};
// an invite link has done its job once it is answered: drop it from the address so a reload is clean
const endInvite=()=>{C.invite='';try{if(location.search)history.replaceState(null,'',location.pathname+location.hash)}catch(e){}};
// post today's finished card once; the server keeps the first card of the day
async function postToday(){if(!C.me||C.me.today)return false;const d=fetchKey(S.key);if(!d||!d.done||!Array.isArray(d.ids)||d.ids.length!==3||!d.ids.every(i=>ALL[i]))return false;
  const hs=d.ids.map(INFO),j=await Net.call('POST','/round',{day:S.key,holes:hs.map(holeKey),pars:hs.map(h=>h.par),scores:d.scores.slice(0,3)});return!!(j&&j.ok)}
async function refresh(posted,synced){const code=C.invite||C.code;
  try{const j=await Net.call('GET','/state?day='+S.key+(code?'&club='+encodeURIComponent(code):''));
    if(j&&j.ok){C.me=j.me;C.club=j.club;
      if(C.invite&&(!C.club||C.club.member)){if(C.club)pickClub(C.invite);endInvite()}
      if(!C.invite&&C.code&&(!C.club||!C.club.member)){pickClub(C.me&&C.me.clubs.length?C.me.clubs[0].code:'');C.club=null;if(C.code)return refresh(posted,synced)}
      if(!C.invite&&!C.code&&C.me&&C.me.clubs.length){pickClub(C.me.clubs[0].code);return refresh(posted,synced)}
      if(!posted&&await postToday())return refresh(true,synced);if(!synced&&await syncLog())return refresh(posted,true)}}catch(e){} // then once more, so the stats shown include what was just sent
  redraw()}

// ───────── pieces
function rankOf(list,i){const r=list[i].round;return 1+list.filter(x=>x.round&&x.round.tot-x.round.par<r.tot-r.par).length}
const tabToday=c=>`<ol class="lb">${c.today.map((m,i)=>{const r=m.round;return`<li class="${m.me?'me':''}"><span class="rk">${r?rankOf(c.today,i):''}</span><span class="nm">${esc(m.nick)}</span>${
  r?`<span class="hs">${r.scores.map((s,j)=>mk(s,r.pars[j])).join('')}</span><span class="tt">${r.tot}<small>${rel(r.tot-r.par)}</small></span>`:'<span class="wait">yet to play</span>'}</li>`}).join('')}</ol>`;
const tabStandings=c=>`<table class="st"><tr><th>Member</th><th>Hcp</th><th>Rounds</th><th>Wins</th><th>Streak</th></tr>${c.standings.map(m=>
  `<tr class="${m.me?'me':''}"><td>${esc(m.nick)}</td><td><b>${hcpStr(m.hcp)}</b></td><td>${m.rounds}</td><td>${m.wins}</td><td>${m.streak}</td></tr>`).join('')}</table>
<p class="fine">Handicap counts every hole played, daily and practice.</p>`;
// Records: the best daily three there has been, then each course's record from practice rounds (the full course and each nine),
// then the honours board. The front nine is the holes numbered 1 to 9, whichever nine the course was built with first.
function tabRecords(c){const rec=c.records,cr=rec.courses||{},cell=r=>r?`<b>${rel(r.tot-r.par)}</b><small>${esc(r.nick)}</small>`:'<i>·</i>';
  const rows=COURSES.map(x=>{const r=cr[x.id]||{},flip=(x.first||1)!==1,nine=!x.more;
    return`<tr><td>${x.club}</td><td>${cell(r.f)}</td><td>${nine?'':cell(flip?r.b:r.a)}</td><td>${nine?'':cell(flip?r.a:r.b)}</td></tr>`}).join('');
  return(rec.low?`<div class="stats"><div><b>${rel(rec.low.tot-rec.low.par)}</b><span>Best daily three · ${esc(rec.low.nick)} · ${shortDay(rec.low.day)}</span></div></div>`:'<p class="fine">No daily three played yet.</p>')
    +`<p class="eyebrow">Course records</p><table class="st cr"><tr><th>Course</th><th>Full</th><th>Front</th><th>Back</th></tr>${rows}</table>
<p class="fine">Set in practice rounds. An eighteen counts for both nines.</p>`
    +(rec.feed.some(f=>TROPHY[f.id])?`<p class="eyebrow">On the honours board</p><ul class="rec">${rec.feed.filter(f=>TROPHY[f.id]).map(f=>`<li><i class="mono">${TROPHY[f.id][0]}</i><span class="nm">${esc(f.nick)}</span><span>${TROPHY[f.id][1]}</span><small>${shortDay(f.day)}</small></li>`).join('')}</ul>`:'')}
function clubStrip(){const c=C.club;
  if(C.invite&&c&&!c.member)return`<button class="strip" data-act="joinform"><span><b>${esc(c.name)}</b><i>You are invited · ${plural(c.count,'member')}</i></span><em>Join</em></button>`;
  if(c&&c.member){const played=c.today.filter(t=>t.round),lead=played[0];
    return`<button class="strip" data-act="club"><span><b>${esc(c.name)}</b><i>${lead?esc(lead.nick)+' leads at '+rel(lead.round.tot-lead.round.par)+' · '+played.length+' of '+c.count+' in':'Nobody has played yet today'}</i></span><em>Open</em></button>`}
  return`<button class="strip" data-act="clubform"><span><b>Start a clubhouse</b><i>A daily leaderboard with friends</i></span><em>New</em></button>`}
const meChip=()=>C.me?`<button class="chip two" data-act="me"><small>Your stats</small>${esc(C.me.name)+(C.me.stats.hcp!=null?' · '+hcpStr(C.me.stats.hcp):'')}</button>`:'<button class="chip" data-act="me">Your stats</button>';

// ───────── sheets
// kind: 'join' a clubhouse, start a 'club', change a 'name', or 'welcome' a new player straight after the practice range
// A player without a username yet (a new one, or one from before usernames) is asked for it on whichever form comes first.
function formCard(kind){const c=C.club,join=kind==='join',club=kind==='club',hi=kind==='welcome',needUser=!C.me||!C.me.user;
  sheet(`<p class="eyebrow">${join?'Join the clubhouse':club?'A new clubhouse':hi?'Welcome':'Your player'}</p><h2>${join?esc(c.name):club?'Name your clubhouse':hi?'Set up your player':'Your name'}</h2>
<form id="socialForm" data-kind="${kind}" class="field" novalidate>
${club?'<label for="houseName">Clubhouse name</label><input id="houseName" maxlength="24" autocomplete="off" placeholder="Sunday Skins">':''}
${needUser?'<label for="userName">Username</label><input id="userName" maxlength="16" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">':''}
<label for="nickName">${kind==='name'||hi?'Your name':'Your name in this clubhouse'}</label><input id="nickName" maxlength="16" autocomplete="nickname" value="${esc(C.me?C.me.name:'')}">
<p class="fine err" id="formErr" role="alert"></p>
<div class="row"><button class="btn" type="submit">${join?'Join':club?'Open the doors':'Save'}</button>${hi?'<button class="btn ghost" type="button" data-act="guest">Not now</button>':'<button class="btn ghost" type="button" data-act="title">Back</button>'}</div>
${!C.me&&Net.remote&&window.PublicKeyCredential?'<button class="link" type="button" data-act="signin">Played before on another phone? Sign in</button>':''}</form>
<p class="fine">${Net.remote?(C.me?'':'Your phone will ask to save a passkey. That is your account.'):'On this device only for now.'}</p>`)}
// Someone who would rather not give a name yet still gets a player, so that their rounds are kept from the first one.
async function guest(){try{for(let i=0;i<4&&!C.me;i++){const j=await Net.call('POST','/player',{name:'Guest',user:'guest'+Math.floor(1e4+Math.random()*9e4)});if(j.ok||j.error!=='user_taken')break}await refresh()}catch(e){}titleCard()}
function clubCard(){const c=C.club;if(!c||!c.member)return titleCard();const t=C.tab,others=(C.me?C.me.clubs:[]).filter(x=>x.code!==c.code);
  sheet(`<p class="eyebrow">Clubhouse · ${plural(c.count,'member')}${Net.remote?'':' · this device only'}</p><h2>${esc(c.name)}</h2>
<div class="tabs" role="tablist">${[['today','Today'],['standings','Standings'],['records','Records']].map(([k,l])=>`<button role="tab" aria-selected="${t===k}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
${t==='today'?tabToday(c):t==='standings'?tabStandings(c):tabRecords(c)}
<div class="row"><button class="btn" data-act="invite">Invite friends</button><button class="btn ghost" data-act="title">Back</button></div>
<p class="fine" id="shareNote"></p>${others.length?`<p class="eyebrow">Your other clubhouses</p><div class="row">${others.map(x=>`<button class="btn ghost sm" data-act="pick" data-c="${x.code}">${esc(x.name)}</button>`).join('')}</div>`:''}`,clubCard)}
// what the record of play says about a kind of round ('daily' or 'practice')
function gameStats(kind){const R=(fetchKey('log')||[]).filter(r=>r.kind===kind),H=R.flatMap(r=>r.holes||[]),n=H.length,pct=(a,b)=>b?Math.round(a/b*100)+'%':'–',fw=H.filter(h=>h.fw!=null);
  return{rounds:R.length,holes:n,birdies:H.filter(h=>h.s<h.par).length,fw:pct(fw.filter(h=>h.fw).length,fw.length),gir:pct(H.filter(h=>h.gir).length,n),putts:n?(sum(H.map(h=>h.p))/n).toFixed(1):'–',drive:Math.max(0,...H.map(h=>h.dr||0))||'–',pure:sum(H.map(h=>h.pure||0))}}
const gameTable=()=>{const d=gameStats('daily'),p=gameStats('practice');if(!d.rounds&&!p.rounds)return'';const row=(l,k)=>`<tr><td>${l}</td><td><b>${d[k]}</b></td><td><b>${p[k]}</b></td></tr>`;
  return`<p class="eyebrow">Your game</p><table class="st"><tr><th></th><th>Daily</th><th>Practice</th></tr>${row('Rounds','rounds')}${row('Birdies','birdies')}${row('Fairways','fw')}${row('Greens','gir')}${row('Putts a hole','putts')}${row('Longest drive','drive')}${row('Pure strikes','pure')}</table>`};
// rounds not yet on the server go up when there is one to send them to
async function syncLog(){if(!C.me)return false;const L=fetchKey('log')||[],todo=L.filter(r=>!r.up).slice(0,25);if(!todo.length)return false;
  try{const j=await Net.call('POST','/log',{rounds:todo.map(({up,...r})=>r)});if(j&&j.ok){const ids=new Set(todo.map(r=>r.id)),M=fetchKey('log')||[];M.forEach(r=>{if(ids.has(r.id))r.up=1});store('log',M);return true}}catch(e){}return false}
function meCard(){const m=C.me;if(!m)return formCard('name');const st=m.stats,won=Object.fromEntries(st.trophies.map(t=>[t.id,t]));
  sheet(`<p class="eyebrow">Your stats${m.user?' · @'+esc(m.user):''}</p><h2>${esc(m.name)}</h2>
<div class="stats four"><div><b>${hcpStr(st.hcp)}</b><span>Handicap</span></div><div><b>${st.rounds}</b><span>Rounds</span></div><div><b>${st.best?rel(st.best.tot-st.best.par):'–'}</b><span>Best</span></div><div><b>${st.streak}</b><span>Day streak</span></div></div>
<p class="fine">${st.hcp==null?'Handicap after '+plural(Math.max(1,18-(st.holes||0)),'more hole')+', daily or practice.':'Handicap: your best nine-hole stretches, as strokes over par for eighteen.'}</p>
${gameTable()}<p class="eyebrow">Balls</p><div class="balls">${COURSES.map(c=>{const b=(st.balls||{})[c.id]||{},n=courseIds(c.id,'a').length;
  return`<div><b>${c.club}</b><i class="ball bz${b.b?' on':''}"></i><i class="ball sv${b.s?' on':''}"></i><i class="ball gd${b.g?' on':''}"></i><small>${b.n||0}/${n}</small></div>`}).join('')}</div>
<p class="fine">Bronze: a full round under par. Silver: a birdie on every hole. Gold: ten under.</p>
<p class="eyebrow">Trophy case</p><div class="tro">${Object.keys(TROPHY).map(id=>{const[mono,name,what]=TROPHY[id],e=won[id];
  return`<div class="${e?'won':''}"><i class="mono">${mono}</i><b>${name}${e&&e.n>1?' ×'+e.n:''}</b><span>${what}</span></div>`}).join('')}</div>
${saveStrip()}<div class="row"><button class="btn ghost" data-act="rename">Change name</button><button class="btn ghost" data-act="title">Back</button></div>
<p class="fine" id="shareNote">${!Net.remote?'':m.passkey?'Saved with a passkey.':canSave()?'':'Open in Safari or Chrome to save your player.'}</p>`,meCard)}
const canSave=()=>Net.remote&&!!window.PublicKeyCredential;
// only ask unprompted on a phone or laptop that has Face ID, a fingerprint reader or a screen lock to back the passkey
const canPrompt=async()=>{try{return canSave()&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()}catch(e){return false}};
const saveStrip=()=>C.me&&!C.me.passkey&&canSave()?'<button class="strip warn" data-act="passkey"><span><b>Save your player</b><i>Keeps your handicap if you change phones</i></span><em>Save</em></button><p class="fine err" id="saveNote"></p>':'';
async function savePasskey(){const note=$('saveNote')||$('shareNote');try{const o=await Net.call('POST','/passkey/options',{kind:'create'});if(!o.ok)throw o;const pk=o.publicKey;pk.challenge=fromB64(pk.challenge);pk.user.id=fromB64(pk.user.id);
    const cred=await navigator.credentials.create({publicKey:pk}),r=cred.response,j=await Net.call('POST','/passkey/create',{id:cred.id,clientDataJSON:toB64(r.clientDataJSON),spki:toB64(r.getPublicKey()),alg:r.getPublicKeyAlgorithm()});
    if(!j.ok)throw j;await refresh()}catch(e){if(note)note.textContent=e&&e.name==='NotAllowedError'?'No passkey was saved.':'This device could not save a passkey.'}}
async function signIn(){const note=$('formErr');try{const o=await Net.call('POST','/passkey/options',{kind:'get'});if(!o.ok)throw o;const pk=o.publicKey;pk.challenge=fromB64(pk.challenge);
    const a=await navigator.credentials.get({publicKey:pk}),r=a.response,j=await Net.call('POST','/passkey/login',{id:a.id,clientDataJSON:toB64(r.clientDataJSON),authenticatorData:toB64(r.authenticatorData),signature:toB64(r.signature)});
    if(!j.ok)throw j;await refresh();titleCard()}catch(e){if(note)note.textContent='No saved player was found on this phone.'}}
async function invite(){const note=$('shareNote'),c=C.club;if(!Net.remote){note.textContent='Invites need the hosted site. This clubhouse is on this device only.';return}
  const url=location.origin+location.pathname+'?c='+c.code,text=`Join ${c.name} on Breakfast Ball. Three holes a day.\n${url}`;
  if(navigator.share)try{await navigator.share({text});return}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(text);note.textContent='Invite copied.'}catch(e){note.textContent=url}}
$('card').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,kind=f.dataset.kind,say=m=>{$('formErr').textContent=m},nick=$('nickName').value.trim(),uf=$('userName'),user=uf?uf.value.trim().toLowerCase():'',btn=f.querySelector('[type=submit]');
  const cname=kind==="club"?$("houseName").value.trim():"";if(uf&&!/^[a-z0-9_]{3,16}$/.test(user))return say(MSG.user);if(!nick)return say(MSG.name);if(kind==='club'&&cname.length<2)return say('Give the clubhouse a name.');
  btn.disabled=true;
  try{const fresh=!C.me;if(fresh||uf||kind==='name'||kind==='welcome'){const j=await Net.call('POST','/player',uf?{name:(kind==='join'||kind==='club')&&C.me?C.me.name:nick,user}:{name:nick});if(!j.ok)throw j}
    // a new player is saved to the phone's passkey straight away, so two weeks of rounds never hang on a cookie
    if(fresh&&await canPrompt()){btn.textContent='Saving your player';await savePasskey()}
    if(kind==='club'){const j=await Net.call('POST','/club',{name:cname,nick});if(!j.ok)throw j;endInvite();pickClub(j.code)}
    if(kind==='join'){const j=await Net.call('POST','/join',{code:C.invite||C.code,nick});if(!j.ok)throw j;endInvite();pickClub(j.code)}
    await refresh();kind==='welcome'?titleCard():kind==='name'?meCard():(C.tab='today',clubCard())}
  catch(x){btn.disabled=false;say(MSG[x&&x.error]||'That did not go through. Try again.')}});
