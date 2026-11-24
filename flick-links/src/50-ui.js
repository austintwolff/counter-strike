// ───────── clubhouse stationery
const CREST='<svg viewBox="0 0 54 62" aria-hidden="true"><path d="M4 4h46v30c0 13-10 21-23 25C14 55 4 47 4 34z" fill="#14493a" stroke="#b9933b" stroke-width="2.5"/><path d="M9.500 9.500h35v24.500c0 9.500-7.500 16-17.500 19.500-10-3.500-17.500-10-17.500-19.500z" fill="none" stroke="#e6cf8a" stroke-width=".9"/><path d="M14 42l6-10 6 3 5-8 9 15z" fill="#cfcabb"/><path d="M20 32l6 3 5-8 2 3-6 9z" fill="#8f8a7b"/><path d="M27 13v14" stroke="#f4ecd6" stroke-width="1.6" stroke-linecap="round"/><path d="M27.500 13.500l9 3.200-9 3.200z" fill="#c9283a"/></svg>';
const HOW=`<div class="how">
<figure><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="24" r="9" fill="none" stroke="#e6cf8a" stroke-width="4"/><path d="M48 35v36" stroke="#f4ecd6" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/><path d="M41 62l7 9 7-9" fill="none" stroke="#f4ecd6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="48" cy="78" r="11" fill="#f4ecd6" opacity=".45"/></svg><figcaption>Pull back to aim. Farther means harder.</figcaption></figure>
<figure><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="50" r="26" fill="none" stroke="#0b2a21" stroke-opacity=".55" stroke-width="11"/><path d="M48 76A26 26 0 0 1 26 36" fill="none" stroke="#f4ecd6" stroke-width="7" stroke-linecap="round"/><path d="M48 76A26 26 0 0 0 70 36" fill="none" stroke="#f4ecd6" stroke-width="7" stroke-linecap="round"/><path d="M39 25.600A26 26 0 0 1 57 25.600" fill="none" stroke="#e6cf8a" stroke-width="11"/><path d="M48 62V40M41 47l7-8 7 8" fill="none" stroke="#e6cf8a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><figcaption>Flick up the moment the ring fills.</figcaption></figure>
<figure><svg viewBox="0 0 96 96" aria-hidden="true"><path d="M48 84V44" stroke="#f4ecd6" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/><path d="M48 84C48 56 42 34 24 14" fill="none" stroke="#c9283a" stroke-width="5" stroke-linecap="round"/><path d="M48 84C48 56 54 34 72 14" fill="none" stroke="#c9283a" stroke-width="5" stroke-linecap="round"/><text x="17" y="42" font-size="11" fill="#f4ecd6" font-family="Georgia,serif" font-style="italic">early</text><text x="60" y="42" font-size="11" fill="#f4ecd6" font-family="Georgia,serif" font-style="italic">late</text></svg><figcaption>Early hooks, late slices. Far too early shanks.</figcaption></figure></div>`;
// again is the function that redraws this sheet when fresh clubhouse data arrives; a redraw keeps its scroll and skips the entrance
let redrawFn=null;
function sheet(html,again){const c=$('card'),same=!!again&&redrawFn===again&&!$('scrim').hidden,top=c.scrollTop;c.classList.toggle('still',same);c.innerHTML=html;$('scrim').hidden=false;c.scrollTop=same?top:0;redrawFn=again||null;
  if(!same){const b=c.querySelector('input')||c.querySelector('.btn');if(b)try{b.focus({preventScroll:true})}catch(e){}}}
function closeSheet(){$('scrim').hidden=true;$('card').innerHTML='';redrawFn=null}
function redraw(){if(redrawFn&&!$('scrim').hidden)redrawFn()}
const rel=n=>n===0?'E':(n>0?'+':'−')+Math.abs(n);
function scoreName(s,par){if(s===1)return'Hole in one';const d=s-par;return d<=-3?'Albatross':d===-2?'Eagle':d===-1?'Birdie':d===0?'Par':d===1?'Bogey':d===2?'Double bogey':d===3?'Triple bogey':rel(d)+' on the hole'}
const emo=(s,par)=>s===1?'🎯':s-par<=-2?'🦅':s-par===-1?'🐦':s===par?'⚪':s-par===1?'🟧':'🟥';
const mk=(s,par)=>{const d=s-par,c=d<=-2?'eagle':d===-1?'birdie':d===1?'bogey':d>=2?'dbl':'';return`<span class="mk ${c}">${s}</span>`};
// a round's card. Today's three can mix courses, so it carries a course row; a practice nine carries its tee.
function scoreCard(ids,scores){const hs=ids.map(INFO),wide=ids.length<=3,one=hs.every(h=>h.course===hs[0].course),all=ids.length>9,n=scores.filter(s=>s!=null).length,c=hs[0].course,d=new Date();
  const toPar=n?rel(sum(scores.slice(0,n))-sum(hs.slice(0,n).map(h=>h.par))):'';
  const row=(cls,label,cells,out)=>`<tr class="${cls}"><th>${label}</th>${cells.map(x=>`<td>${x}</td>`).join('')}<td class="out">${out}</td></tr>`;
  const table=(a,b,label)=>{const H=hs.slice(a,b),sc=scores.slice(a,b),full=H.every((h,i)=>sc[i]!=null);
    return`<table class="sc${wide?' wide':''}">${wide&&!one?row('h','Course',H.map(h=>h.course.club),''):''}${row(wide?'n':'h','Hole',H.map(h=>h.n),label)}
${row('g',wide?'Yards':c.tee,H.map(h=>h.yards),sum(H.map(h=>h.yards)))}${row('k','Hcp',H.map(h=>h.hcp),'')}${row('p','Par',H.map(h=>h.par),sum(H.map(h=>h.par)))}
${row('s','You',H.map((h,i)=>sc[i]!=null?mk(sc[i],h.par):''),full?sum(sc):'')}</table>`};
  return`<div class="card-sc"><div class="sc-head">${CREST}<b>${wide?"Today's Three":c.club}</b><span>${wide?(one?c.club+' · ':'')+'No. '+S.day:(all?'Eighteen':hs[0].n>9?'Back nine':'Front nine')+' · practice'}</span></div>
${wide?table(0,3,'Total'):all?table(0,9,'Out')+table(9,18,'In'):table(0,9,hs[0].n>9?'In':'Out')}
<div class="sc-foot"><span>Date <i>${d.getMonth()+1}/${d.getDate()}</i></span><span>${all?'Total':'Scorer'} <i>${all?(n?sum(scores.slice(0,n)):''):'You'}</i></span><span>To par <i>${toPar}</i></span></div></div>`}
const dateLine=()=>`No. ${S.day} · `+new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
// a day's saved round keeps the holes it was drawn with, so a later change to the draw cannot scramble it
const todaysIds=d=>d&&Array.isArray(d.ids)&&d.ids.length===3&&d.ids.every(i=>ALL[i])?d.ids:dailyIds(S.key);
function titleCard(){const d=fetchKey(S.key),ids=todaysIds(d),seen=fetchKey('seen');
  S.mode='title';S.round={type:'daily',ids,scores:d&&d.scores?d.scores.slice():[]};S.hi=0;setBall(cur().tee.x,cur().tee.y);setupShot();overviewCam(.2,.3,true);hud();hintOff();
  sheet(`<div class="mast">${CREST}<h1>Breakfast<br>Ball</h1>${meChip()}</div>
<div class="flourish"></div><p class="eyebrow stamp"><span>${dateLine()}</span><span id="buildAge">${buildAge()}</span></p>
${scoreCard(ids,d&&d.scores?d.scores:[])}
<button class="btn" data-act="daily">Today's three</button>
${saveStrip()}${clubStrip()}
<p class="eyebrow">Practice</p>
<div class="pick">${COURSES.map(c=>`<button class="btn green sm" data-act="course" data-c="${c.id}">${c.club}</button>`).join('')}</div>`,titleCard)}
// a course with both nines asks which to play
function courseCard(id){const c=COURSES.find(c=>c.id===id),opt=(p,l)=>{const hs=courseIds(id,p).map(INFO);
    return`<button class="btn green" data-act="nine" data-c="${id}" data-p="${p}">${l}<small>Par ${sum(hs.map(h=>h.par))} · ${sum(hs.map(h=>h.yards)).toLocaleString()} yd</small></button>`};
  sheet(`<p class="eyebrow">Practice</p><h2>${c.club}</h2>${opt('f','Front nine')}${opt('b','Back nine')}${opt('a','Eighteen holes')}<button class="btn ghost" data-act="title">Back</button>`)}
function helpCard(){sheet(`<h2>How to play</h2>${HOW}
<p class="fine"><b>Putting.</b> Drag the marker to where a flat putt should stop. Press Putt, then flick on gold. The streaks run downhill.</p>
<p class="fine"><b>Trouble.</b> Water: drop at the edge, +1. Out of bounds or lost: replay, +1.</p>
<p class="fine">© OpenStreetMap contributors.</p>
<div class="row"><button class="btn" data-act="close">Carry on</button><button class="btn ghost" data-act="range">Practice range</button></div>`)}
function holeCard(score){const h=cur(),last=S.hi>=S.round.ids.length-1,nx=last?null:INFO(S.round.ids[S.hi+1]);
  sheet(`<p class="eyebrow">${h.course.club} No. ${h.n} · ${h.name} · Par ${h.par}</p><h2>${scoreName(score,h.par)}</h2>
${scoreCard(S.round.ids,S.round.scores)}
<button class="btn" data-act="${last?'results':'next'}">${last?'Sign the card':'On to '+(S.round.type==='nine'?'':nx.course.club+' ')+'No. '+nx.n+'<small>'+nx.name+' · Par '+nx.par+' · '+nx.yards+' yd</small>'}</button>`)}
function shareText(){const r=S.round,hs=r.ids.map(INFO),par=sum(hs.map(h=>h.par)),tot=sum(r.scores),em=(a,b)=>r.scores.slice(a,b).map((s,i)=>emo(s,hs[a+i].par)).join('');
  let t=r.type==='nine'?`⛳ Breakfast Ball · ${hs.length>9?'eighteen':hs[0].n>9?'back nine':'front nine'} at ${hs[0].course.club}\n`+(hs.length>9?em(0,9)+'\n'+em(9,18):em(0,9))+`\n${tot} strokes (${rel(tot-par)})`
    :`⛳ Breakfast Ball No. ${S.day}${hs.every(h=>h.course===hs[0].course)?' · '+hs[0].course.club:''}\n`+r.scores.map((s,i)=>`${hs.every(h=>h.course===hs[0].course)?'No. ':hs[i].course.code}${hs[i].n} ${emo(s,hs[i].par)} ${s}`).join('   ')+`\n${tot} strokes (${rel(tot-par)})`;
  let url=SHARE_URL;try{if(!url&&window.top===window.self&&/^https?:$/.test(location.protocol))url=location.origin+location.pathname+(Net.remote&&C.code?'?c='+C.code:'')}catch(e){}
  return url?t+'\n'+url:t}
function resultsCard(){const r=S.round,sv=fetchKey(saveKey());if(sv&&sv.scores)r.scores=sv.scores;
  const hs=r.ids.map(INFO),d=sum(r.scores)-sum(hs.map(h=>h.par)),m=fetchKey('meta'),nine=r.type==='nine';
  S.mode='done';S.hi=r.ids.length-1;setBall(cur().tee.x,cur().tee.y);setupShot();hud();hintOff();store('seen',1);overviewCam(.16,.24,false);
  sheet(`<p class="eyebrow">${nine?'Practice round · '+hs[0].course.club:dateLine()}</p><h2>${sum(r.scores)} strokes, ${d===0?'even par':d<0?Math.abs(d)+' under':d+' over'}</h2>
${scoreCard(r.ids,r.scores)}
<textarea id="shareText" readonly rows="${shareText().split('\n').length}" aria-label="Your result, ready to paste">${shareText()}</textarea>
<div class="row"><button class="btn" data-act="share">Share score</button><button class="btn ghost" data-act="${nine?'again':'title'}">${nine?'Play it again':'Home'}</button></div>
${nine?'':saveStrip()}${nine?'<button class="btn ghost" data-act="title">Home</button>':C.club&&C.club.member?'<p class="eyebrow">'+esc(C.club.name)+' today</p>'+tabToday(C.club)+'<button class="btn green" data-act="club">Open the clubhouse</button>':clubStrip()}
<p class="fine" id="shareNote">${nine?'':(m&&m.streak>1?`Day streak <b>${m.streak}</b>. `:'')+'New holes in <b id="countdown">--:--:--</b>.'}</p>`,nine?null:resultsCard);tickClock()}
async function share(){const ta=$('shareText'),text=ta.value,note=$('shareNote');let top=false;try{top=window.top===window.self}catch(e){}
  if(top&&navigator.share){try{await navigator.share({text});return}catch(e){if(e&&e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(text);note.textContent='Copied.'}
  catch(e){ta.focus();ta.select();note.textContent='Press and hold the score to copy.'}}
function buildAge(){const m=Math.floor((Date.now()-BUILD_TS)/6e4);return'Updated '+(m<1?'just now':m<60?m+' min ago':m<1440?Math.floor(m/60)+' hr ago':Math.floor(m/1440)+' d ago')}
function tickClock(){const a=$('buildAge');if(a)a.textContent=buildAge();const e=$('countdown');if(!e)return;const n=new Date(),next=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1),s=Math.max(0,Math.floor((next-n)/1000));
  e.textContent=pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60)}
setInterval(()=>{tickClock();if(S.key&&todayKey()!==S.key&&(S.mode==='done'||S.mode==='title'))initDay()},1000);
$('card').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;ac();
  if(a==='daily'||a==='nine')begin(a,b.dataset.c,b.dataset.p);
  else if(a==='course'){const c=COURSES.find(c=>c.id===b.dataset.c);c&&c.more?courseCard(c.id):begin('nine',b.dataset.c,'f')}
  else if(a==='again'){store(saveKey(),null);begin('nine',S.round.course,S.round.part)}
  else if(a==='close')closeSheet();
  else if(a==='next'){closeSheet();startHole(S.hi+1)}
  else if(a==='results')resultsCard();
  else if(a==='title')titleCard();
  else if(a==='share')share();
  else if(a==='range')startRange();
  else if(a==='me')meCard();
  else if(a==='club'){C.tab='today';clubCard()}
  else if(a==='clubform')formCard('club');
  else if(a==='joinform')formCard('join');
  else if(a==='rename')formCard('name');
  else if(a==='tab'){C.tab=b.dataset.t;clubCard()}
  else if(a==='pick'){pickClub(b.dataset.c);refresh()}
  else if(a==='invite')invite();
  else if(a==='passkey')savePasskey();
  else if(a==='signin')signIn();
  else if(a==='guest')guest()});

// ───────── flow
let introT=0;
function startHole(i,sv){closeSheet();S.hi=i;S.marks=[];S.shot=null;S.from=null;S.hs=sv&&sv.strokes&&sv.hs?sv.hs:newHs();const h=cur();S.strokes=sv?sv.strokes||0:0;setBall(sv&&sv.strokes?sv.bx:h.tee.x,sv&&sv.strokes?sv.by:h.tee.y);setupShot();
  if(S.strokes>=maxScore())return finishHole(maxScore());
  overviewCam(.5,.76,false);S.mode='intro';hud();toast(`No. ${h.n} · ${h.name}`,h.course.club,1800);
  hintOff();if(S.hintShots<3&&!fetchKey('seen'))hintOn('Pull back to aim, flick up on gold');
  clearTimeout(introT);introT=setTimeout(()=>{if(S.mode==='intro'){S.mode='ready';aimCam()}},1900);save()}
function begin(type,course,part){const nine=type==='nine';if(nine&&!COURSES.some(c=>c.id===course))course='gr';if(nine&&(!COURSES.find(c=>c.id===course).more||!/^[fba]$/.test(part||'')))part='f';
  S.round={type,course:nine?course:null,part:nine?part:null,ids:[],scores:[],log:[]};const sv=fetchKey(saveKey());if(sv&&Array.isArray(sv.log))S.round.log=sv.log;S.round.ids=nine?courseIds(course,part):todaysIds(sv);const ids=S.round.ids;
  if(sv&&sv.done&&Array.isArray(sv.scores)){S.round.scores=sv.scores;return resultsCard()}
  if(sv&&Array.isArray(sv.scores)&&sv.hi>=0&&sv.hi<ids.length){S.round.scores=sv.scores.slice(0,sv.hi);startHole(sv.hi,sv)}else startHole(0)}
function initDay(){S.key=todayKey();S.day=dayNumber(S.key);S.holes=[];S.muted=!!fetchKey('muted');
  $('btnSound').setAttribute('aria-pressed',String(!S.muted));titleCard()}
// ───────── the practice range
// A first visit starts here: hit balls until one is struck well, then roll a putt close. Nothing counts and Skip is always there.
const RANGE_HOLE=()=>courseIds('lp','f')[7];   // a wide, straight hole to hit down
function coach(step,title,text,next,ready){$('coachStep').textContent='Driving range · '+step;$('coachTitle').textContent=title;$('coachText').textContent=text;const n=$('coachNext');n.textContent=next;n.disabled=!ready}
function rangeSpot(){const h=cur();if(S.tut.step==='swing')return h.tee;const dx=h.tee.x-h.pin.x,dy=h.tee.y-h.pin.y,d=hyp(dx,dy);for(const k of[7,5.5,4,3]){const p={x:h.pin.x+dx/d*k,y:h.pin.y+dy/d*k};if(inSh(h.green,p,-1))return p}return{x:h.green.x,y:h.green.y}}
function rangeSet(){const p=rangeSpot();setBall(p.x,p.y);S.strokes=0;setupShot();S.mode='ready';aimCam();hud()}
function startRange(){closeSheet();S.round={type:'range',ids:[RANGE_HOLE()],scores:[],course:null};S.hi=0;S.marks=[];S.tut={step:'swing',good:false};const h=cur();h.wind.x=h.wind.y=0;h.wind.sp=0;
  rangeSet();hintOff();overviewCam(.5,.76,true);aimCam();coach('1 of 2','The swing','Pull back to aim. Flick up when the ring reaches gold.','Putting',false)}
// The first lesson is the motion, so on the range anything flicked near the top of the ring counts as a good strike.
function rangeAfter(holed,note){const t=S.tut,l=S.last||{},h=cur();
  if(t.step==='swing'){const ok=!note&&!l.shank&&Math.abs(l.te)<=150;t.good=t.good||ok;
    coach('1 of 2','The swing',note||(l.shank?'Shank. Wait for the ring to leave the red.':l.pure?'Pure.':ok?'Good strike.':l.early?'Early. Wait for gold.':'Late. Flick as it reaches gold.'),'Putting',t.good)}
  else{const ft=Math.round(hyp(S.ball.x-h.pin.x,S.ball.y-h.pin.y)*3),ok=holed||ft<=4;t.good=t.good||ok;
    coach('2 of 2','The putt',holed?'Holed.':ok?'Close: '+ft+' ft.':ft+' ft away. Move the marker to allow for the slope.','Play',t.good)}
  rangeSet()}
// After the range a new player is asked their name (or, arriving by an invite, to join that clubhouse), so play is recorded
// under a player from the first real round. Someone already known goes straight to the menu.
function endRange(){store('tut',1);$('app').classList.remove('tut');$('coach').hidden=true;hintOff();titleCard();
  Net.loaded.then(()=>{if(C.me||S.mode!=='title')return;C.invite&&C.club&&!C.club.member?formCard('join'):formCard('welcome')})}
$('coachSkip').onclick=endRange;
$('coachNext').onclick=()=>{const t=S.tut;if(!t||!t.good)return;if(t.step==='swing'){t.step='putt';t.good=false;S.last=null;rangeSet();coach('2 of 2','The putt','Drag the marker to where a flat putt should stop. Press Putt, then flick on gold.','Play',false)}else endRange()};

// ───────── boot, and staying current while a round is open
// A new build can arrive mid-round: the round is saved after every stroke, so it resumes where it stood.
const PLAYING=['intro','ready','aim','flight','wait'];
function start(d){resize();initDay();resize();let r=d&&d.playing?d:null;if(!r&&!fetchKey('tut'))return startRange();
  try{const s=JSON.parse(sessionStorage.getItem(KEY+'resume')||'null');sessionStorage.removeItem(KEY+'resume');if(s&&s.playing)r=s}catch(e){}
  if(r&&(r.type==='daily'||r.type==='nine')){begin(r.type,r.course,r.part);if(PLAYING.includes(S.mode))toast('Updated',1400)}}
const snap=()=>({type:S.round.type,course:S.round.course,part:S.round.part,playing:PLAYING.includes(S.mode)});
const hot=window.claude&&window.claude.hot;
try{if(hot&&hot.snapshot)hot.snapshot(snap)}catch(e){}
if(hot&&hot.ready)hot.ready(start);else start(hot&&hot.data||{});
try{const q=new URLSearchParams(location.search).get('c');if(q&&/^[A-Za-z0-9]{6}$/.test(q))C.invite=q.toUpperCase()}catch(e){}
Net.ready=Net.init();Net.loaded=Net.ready.then(()=>refresh()).catch(()=>{});
requestAnimationFrame(frame);
// On its own web address the page checks for a newer build every 20 seconds and reloads between shots.
let standalone=false;try{standalone=window.top===window.self&&/^https?:$/.test(location.protocol)}catch(e){}
if(standalone)setInterval(async()=>{if(document.hidden||S.mode==='aim'||S.mode==='flight')return;
  try{const t=await(await fetch(location.pathname+'?v='+Date.now(),{cache:'no-store'})).text(),m=t.match(/BUILD_TS=(\d{10,})/);
    if(m&&+m[1]>BUILD_TS){try{sessionStorage.setItem(KEY+'resume',JSON.stringify(snap()))}catch(e){}location.replace(location.pathname+'?v='+m[1]+location.hash)}}catch(e){}},20000);

if(location.hash==='#dev')window.__fl={S,cam,camT,fire,cur,lieAt,begin,startHole,overviewCam,closeSheet,COURSES,ALL,HOLE,INFO,courseIds,dailyIds,gameTable,C,Net,refresh,startRange};
