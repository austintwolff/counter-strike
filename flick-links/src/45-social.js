// ───────── the clubhouse
// The page talks to the clubhouse server over /api when the game is on its own web address.
// Anywhere else it runs the same server code in the page, on browser storage: a solo clubhouse.
const TROPHY={ace:['1','Ace','A hole in one'],eagle:['−2','Eagle','Two under on one hole'],hat:['III','Hat Trick','Three birdies in a round'],clean:['✓','Clean Card','A round without a bogey'],
  red:['−','In the Red','A round under par'],week:['7','Regular','Seven days running'],month:['30','Fixture','Thirty days running']};
COURSES.forEach(c=>TROPHY['sweep-'+c.id]=[c.code,'Swept '+c.club,'A birdie on all nine']);
const MSG={name:'Enter a name.',taken:'Someone in this clubhouse already has that name.',full:'This clubhouse is full.',no_club:'That clubhouse no longer exists.',too_many:'You are in the most clubhouses one player can join.'};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const hcpStr=h=>h==null?'–':h<0?'+'+(-h).toFixed(1):h.toFixed(1);
const holeKey=h=>h.course.id+h.n;
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
  const hs=d.ids.map(HOLE),j=await Net.call('POST','/round',{day:S.key,holes:hs.map(holeKey),pars:hs.map(h=>h.par),scores:d.scores.slice(0,3)});return!!(j&&j.ok)}
async function refresh(posted){const code=C.invite||C.code;
  try{const j=await Net.call('GET','/state?day='+S.key+(code?'&club='+encodeURIComponent(code):''));
    if(j&&j.ok){C.me=j.me;C.club=j.club;
      if(C.invite&&(!C.club||C.club.member)){if(C.club)pickClub(C.invite);endInvite()}
      if(!C.invite&&C.code&&(!C.club||!C.club.member)){pickClub(C.me&&C.me.clubs.length?C.me.clubs[0].code:'');C.club=null;if(C.code)return refresh(posted)}
      if(!C.invite&&!C.code&&C.me&&C.me.clubs.length){pickClub(C.me.clubs[0].code);return refresh(posted)}
      if(!posted&&await postToday())return refresh(true)}}catch(e){}
  redraw()}

// ───────── pieces
function rankOf(list,i){const r=list[i].round;return 1+list.filter(x=>x.round&&x.round.tot-x.round.par<r.tot-r.par).length}
const tabToday=c=>`<ol class="lb">${c.today.map((m,i)=>{const r=m.round;return`<li class="${m.me?'me':''}"><span class="rk">${r?rankOf(c.today,i):''}</span><span class="nm">${esc(m.nick)}</span>${
  r?`<span class="hs">${r.scores.map((s,j)=>mk(s,r.pars[j])).join('')}</span><span class="tt">${r.tot}<small>${rel(r.tot-r.par)}</small></span>`:'<span class="wait">yet to play</span>'}</li>`}).join('')}</ol>`;
const tabStandings=c=>`<table class="st"><tr><th>Member</th><th>Hcp</th><th>Rounds</th><th>Wins</th><th>Streak</th></tr>${c.standings.map(m=>
  `<tr class="${m.me?'me':''}"><td>${esc(m.nick)}</td><td><b>${hcpStr(m.hcp)}</b></td><td>${m.rounds}</td><td>${m.wins}</td><td>${m.streak}</td></tr>`).join('')}</table>
<p class="fine">Handicap needs three rounds. A day is won by the lowest card once the day is over.</p>`;
function tabRecords(c){const rec=c.records,by={};for(const k in rec.holes)(by[k.slice(0,2)]=by[k.slice(0,2)]||[]).push(k);
  const courses=COURSES.filter(x=>by[x.id]).map(x=>`<p class="eyebrow">${x.club}</p><ul class="rec">${by[x.id].sort().map(k=>{const r=rec.holes[k];
    return`<li><span>No. ${k.slice(2)}</span>${mk(r.score,r.par)}<span class="nm">${esc(r.nick)}</span><small>${shortDay(r.day)}</small></li>`}).join('')}</ul>`).join('');
  return(rec.low?`<div class="stats"><div><b>${rec.low.tot} <small>${rel(rec.low.tot-rec.low.par)}</small></b><span>Low round · ${esc(rec.low.nick)} · ${shortDay(rec.low.day)}</span></div></div>`:'<p class="fine">No rounds on the board yet. Records appear as members play.</p>')
    +(rec.feed.length?`<p class="eyebrow">On the honours board</p><ul class="rec">${rec.feed.map(f=>`<li><i class="mono">${TROPHY[f.id][0]}</i><span class="nm">${esc(f.nick)}</span><span>${TROPHY[f.id][1]}</span><small>${shortDay(f.day)}</small></li>`).join('')}</ul>`:'')
    +(courses?'<p class="fine">Best score by a member on each hole played so far.</p>'+courses:'')}
function clubStrip(){const c=C.club;
  if(C.invite&&c&&!c.member)return`<button class="strip" data-act="joinform"><span><b>${esc(c.name)}</b><i>You are invited · ${plural(c.count,'member')}</i></span><em>Join</em></button>`;
  if(c&&c.member){const played=c.today.filter(t=>t.round),lead=played[0];
    return`<button class="strip" data-act="club"><span><b>${esc(c.name)}</b><i>${lead?esc(lead.nick)+' leads at '+rel(lead.round.tot-lead.round.par)+' · '+played.length+' of '+c.count+' in':'Nobody has played yet today'}</i></span><em>Open</em></button>`}
  return`<button class="strip" data-act="clubform"><span><b>Start a clubhouse</b><i>Invite friends and keep a daily leaderboard</i></span><em>New</em></button>`}
const meChip=()=>`<button class="chip" data-act="me">${C.me?esc(C.me.name)+(C.me.stats.hcp!=null?' · '+hcpStr(C.me.stats.hcp):''):'Your card'}</button>`;

// ───────── sheets
function formCard(kind){const c=C.club,join=kind==='join',club=kind==='club';
  sheet(`<p class="eyebrow">${join?'Join the clubhouse':club?'A new clubhouse':'Your player'}</p><h2>${join?esc(c.name):club?'Name your clubhouse':'What should we call you?'}</h2>
<form id="socialForm" data-kind="${kind}" class="field" novalidate>
${club?'<label for="houseName">Clubhouse name</label><input id="houseName" maxlength="24" autocomplete="off" placeholder="Sunday Skins">':''}
<label for="nickName">${kind==='name'?'Your name':'Your name in this clubhouse'}</label><input id="nickName" maxlength="16" autocomplete="nickname" value="${esc(C.me?C.me.name:'')}">
<p class="fine err" id="formErr" role="alert"></p>
<div class="row"><button class="btn" type="submit">${join?'Join':club?'Open the doors':'Save'}</button><button class="btn ghost" type="button" data-act="title">Back</button></div>
${!C.me&&Net.remote&&window.PublicKeyCredential?'<button class="link" type="button" data-act="signin">Played before on another phone? Sign in</button>':''}</form>
<p class="fine">${Net.remote?(C.me?'':'Your phone will ask to save a passkey. That is your account: no password, and nobody else can post as you.'):'Solo for now: this clubhouse lives on this device. Friends can join once the game is on its own web address.'}</p>`)}
function clubCard(){const c=C.club;if(!c||!c.member)return titleCard();const t=C.tab,others=(C.me?C.me.clubs:[]).filter(x=>x.code!==c.code);
  sheet(`<p class="eyebrow">Clubhouse · ${plural(c.count,'member')}${Net.remote?'':' · this device only'}</p><h2>${esc(c.name)}</h2>
<div class="tabs" role="tablist">${[['today','Today'],['standings','Standings'],['records','Records']].map(([k,l])=>`<button role="tab" aria-selected="${t===k}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
${t==='today'?tabToday(c):t==='standings'?tabStandings(c):tabRecords(c)}
<div class="row"><button class="btn" data-act="invite">Invite friends</button><button class="btn ghost" data-act="title">Back</button></div>
<p class="fine" id="shareNote"></p>${others.length?`<p class="eyebrow">Your other clubhouses</p><div class="row">${others.map(x=>`<button class="btn ghost sm" data-act="pick" data-c="${x.code}">${esc(x.name)}</button>`).join('')}</div>`:''}`,clubCard)}
function meCard(){const m=C.me;if(!m)return formCard('name');const st=m.stats,won=Object.fromEntries(st.trophies.map(t=>[t.id,t]));
  sheet(`<p class="eyebrow">Your card</p><h2>${esc(m.name)}</h2>
<div class="stats four"><div><b>${hcpStr(st.hcp)}</b><span>Handicap</span></div><div><b>${st.rounds}</b><span>Rounds</span></div><div><b>${st.best?rel(st.best.tot-st.best.par):'–'}</b><span>Best</span></div><div><b>${st.streak}</b><span>Day streak</span></div></div>
<p class="fine">${st.hcp==null?'Your handicap arrives after three daily rounds. '+plural(Math.max(1,3-st.rounds),'round')+' to go.':'Your handicap is the best of your recent rounds, scaled to eighteen holes. Lower is better.'}</p>
<p class="eyebrow">Trophy case</p><div class="tro">${Object.keys(TROPHY).map(id=>{const[mono,name,what]=TROPHY[id],e=won[id],sw=id.startsWith('sweep-')?(st.sweep[id.slice(6)]||[]).length:null;
  return`<div class="${e?'won':''}"><i class="mono">${mono}</i><b>${name}${e&&e.n>1?' ×'+e.n:''}</b><span>${sw!=null&&!e?sw+' of 9 so far':what}</span></div>`}).join('')}</div>
${saveStrip()}<div class="row"><button class="btn ghost" data-act="rename">Change name</button><button class="btn ghost" data-act="title">Back</button></div>
<p class="fine" id="shareNote">${!Net.remote?'':m.passkey?'Saved with a passkey. Sign in on any phone to pick up where you left off.':canSave()?'':'This browser cannot save a passkey. Open the game in Safari or Chrome to save your player.'}</p>`,meCard)}
const canSave=()=>Net.remote&&!!window.PublicKeyCredential;
// only ask unprompted on a phone or laptop that has Face ID, a fingerprint reader or a screen lock to back the passkey
const canPrompt=async()=>{try{return canSave()&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()}catch(e){return false}};
const saveStrip=()=>C.me&&!C.me.passkey&&canSave()?'<button class="strip warn" data-act="passkey"><span><b>Save your player</b><i>One tap. Keeps your handicap if you change phones.</i></span><em>Save</em></button><p class="fine err" id="saveNote"></p>':'';
async function savePasskey(){const note=$('saveNote')||$('shareNote');try{const o=await Net.call('POST','/passkey/options',{kind:'create'});if(!o.ok)throw o;const pk=o.publicKey;pk.challenge=fromB64(pk.challenge);pk.user.id=fromB64(pk.user.id);
    const cred=await navigator.credentials.create({publicKey:pk}),r=cred.response,j=await Net.call('POST','/passkey/create',{id:cred.id,clientDataJSON:toB64(r.clientDataJSON),spki:toB64(r.getPublicKey()),alg:r.getPublicKeyAlgorithm()});
    if(!j.ok)throw j;await refresh()}catch(e){if(note)note.textContent=e&&e.name==='NotAllowedError'?'No passkey was saved.':'This device could not save a passkey.'}}
async function signIn(){const note=$('formErr');try{const o=await Net.call('POST','/passkey/options',{kind:'get'});if(!o.ok)throw o;const pk=o.publicKey;pk.challenge=fromB64(pk.challenge);
    const a=await navigator.credentials.get({publicKey:pk}),r=a.response,j=await Net.call('POST','/passkey/login',{id:a.id,clientDataJSON:toB64(r.clientDataJSON),authenticatorData:toB64(r.authenticatorData),signature:toB64(r.signature)});
    if(!j.ok)throw j;await refresh();titleCard()}catch(e){if(note)note.textContent='No saved player was found on this phone.'}}
async function invite(){const note=$('shareNote'),c=C.club;if(!Net.remote){note.textContent='Invites work once the game is on its own web address. For now this clubhouse lives on this device.';return}
  const url=location.origin+location.pathname+'?c='+c.code,text=`Join ${c.name} on Flick Links. Three holes a day.\n${url}`;
  if(navigator.share)try{await navigator.share({text});return}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(text);note.textContent='Invite copied. Paste it in the group chat.'}catch(e){note.textContent=url}}
$('card').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,kind=f.dataset.kind,say=m=>{$('formErr').textContent=m},nick=$('nickName').value.trim(),btn=f.querySelector('[type=submit]');
  const cname=kind==="club"?$("houseName").value.trim():"";if(!nick)return say(MSG.name);if(kind==='club'&&cname.length<2)return say('Give the clubhouse a name.');
  btn.disabled=true;
  try{const fresh=!C.me;if(fresh||kind==='name'){const j=await Net.call('POST','/player',{name:nick});if(!j.ok)throw j}
    // a new player is saved to the phone's passkey straight away, so two weeks of rounds never hang on a cookie
    if(fresh&&await canPrompt()){btn.textContent='Saving your player';await savePasskey()}
    if(kind==='club'){const j=await Net.call('POST','/club',{name:cname,nick});if(!j.ok)throw j;endInvite();pickClub(j.code)}
    if(kind==='join'){const j=await Net.call('POST','/join',{code:C.invite||C.code,nick});if(!j.ok)throw j;endInvite();pickClub(j.code)}
    await refresh();kind==='name'?meCard():(C.tab='today',clubCard())}
  catch(x){btn.disabled=false;say(MSG[x&&x.error]||'That did not go through. Try again.')}});
