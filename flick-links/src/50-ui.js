// ───────── clubhouse stationery
const CREST='<svg viewBox="0 0 54 62" aria-hidden="true"><path d="M4 4h46v30c0 13-10 21-23 25C14 55 4 47 4 34z" fill="#14493a" stroke="#b9933b" stroke-width="2.5"/><path d="M9.500 9.500h35v24.500c0 9.500-7.500 16-17.500 19.500-10-3.500-17.500-10-17.500-19.500z" fill="none" stroke="#e6cf8a" stroke-width=".9"/><path d="M14 42l6-10 6 3 5-8 9 15z" fill="#cfcabb"/><path d="M20 32l6 3 5-8 2 3-6 9z" fill="#8f8a7b"/><path d="M27 13v14" stroke="#f4ecd6" stroke-width="1.6" stroke-linecap="round"/><path d="M27.500 13.500l9 3.200-9 3.200z" fill="#c9283a"/></svg>';
const HOW=`<div class="how">
<figure><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="24" r="9" fill="none" stroke="#e6cf8a" stroke-width="4"/><path d="M48 35v36" stroke="#f4ecd6" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/><path d="M41 62l7 9 7-9" fill="none" stroke="#f4ecd6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="48" cy="78" r="11" fill="#f4ecd6" opacity=".45"/></svg><figcaption>Pull back to aim. Farther means harder.</figcaption></figure>
<figure><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="24" r="9" fill="none" stroke="#e6cf8a" stroke-width="4"/><path d="M48 80V10" stroke="#e6cf8a" stroke-width="6" stroke-linecap="round"/><path d="M39 20l9-11 9 11" fill="none" stroke="#e6cf8a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><figcaption>Flick forward through the ring to hit.</figcaption></figure>
<figure><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="40" cy="24" r="9" fill="none" stroke="#e6cf8a" stroke-width="4"/><path d="M40 80C40 50 46 30 66 12" fill="none" stroke="#c9283a" stroke-width="6" stroke-linecap="round"/><path d="M40 80V40" stroke="#f4ecd6" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/></svg><figcaption>A crooked flick bends the shot.</figcaption></figure></div>`;
function sheet(html){$('card').innerHTML=html;$('scrim').hidden=false;$('card').scrollTop=0;const b=$('card').querySelector('.btn');if(b)try{b.focus({preventScroll:true})}catch(e){}}
function closeSheet(){$('scrim').hidden=true;$('card').innerHTML=''}
const rel=n=>n===0?'E':(n>0?'+':'−')+Math.abs(n);
function scoreName(s,par){if(s===1)return'Hole in one';const d=s-par;return d<=-3?'Albatross':d===-2?'Eagle':d===-1?'Birdie':d===0?'Par':d===1?'Bogey':d===2?'Double bogey':d===3?'Triple bogey':rel(d)+' on the hole'}
const emo=(s,par)=>s===1?'🎯':s-par<=-2?'🦅':s-par===-1?'🐦':s===par?'⚪':s-par===1?'🟧':'🟥';
const mk=(s,par)=>{const d=s-par,c=d<=-2?'eagle':d===-1?'birdie':d===1?'bogey':d>=2?'dbl':'';return`<span class="mk ${c}">${s}</span>`};
function scoreCard(ids,scores,note){const hs=ids.map(i=>S.holes[i]),wide=ids.length<=3,par=sum(hs.map(h=>h.par)),n=scores.filter(s=>s!=null).length,done=n>=ids.length;
  const toPar=n?rel(sum(scores.slice(0,n))-sum(hs.slice(0,n).map(h=>h.par))):'',d=new Date();
  const row=(cls,label,cells,out)=>`<tr class="${cls}"><th>${label}</th>${cells.map(c=>`<td>${c}</td>`).join('')}<td class="out">${out}</td></tr>`;
  return`<div class="card-sc"><div class="sc-head">${CREST}<b>${COURSE.club} · Front Nine</b><span>${note}</span></div>
<table class="sc${wide?' wide':''}">${row('h','Hole',hs.map(h=>h.n),wide?'Total':'Out')}${row('g',COURSE.tee,hs.map(h=>h.yards),sum(hs.map(h=>h.yards)))}
${row('k','Hcp',hs.map(h=>h.hcp),'')}${row('p','Par',hs.map(h=>h.par),par)}
${row('s','You',hs.map((h,i)=>scores[i]!=null?mk(scores[i],h.par):''),done?sum(scores):'')}</table>
<div class="sc-foot"><span>Date <i>${d.getMonth()+1}/${d.getDate()}</i></span><span>Scorer <i>You</i></span><span>To par <i>${toPar}</i></span></div></div>`}
const dateLine=()=>`No. ${S.day} · `+new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
function titleCard(){const ids=dailyIds(S.key),d=fetchKey(S.key),n=fetchKey(S.key+':nine'),seen=fetchKey('seen');
  S.mode='title';S.round={type:'daily',ids,scores:d&&d.scores?d.scores.slice():[]};S.hi=0;setBall(0,0);setupShot();overviewCam(.2,.3,true);hud();hintOff();
  const dGo=d&&!d.done&&(d.hi>0||d.strokes>0),nGo=n&&!n.done&&(n.hi>0||n.strokes>0);
  sheet(`<div class="mast">${CREST}<div><h1>Flick Links</h1><p>at ${COURSE.club} · ${COURSE.place}</p></div></div>
<div class="flourish"></div><p class="eyebrow">${dateLine()}</p>
${scoreCard(ids,d&&d.scores?d.scores:[],"Today's three")}
<div class="row"><button class="btn" data-act="daily">Today's three<small>${d&&d.done?'See your card':dGo?'Resume at No. '+S.holes[ids[d.hi]].n:'One try. Same holes for everyone.'}</small></button>
<button class="btn green" data-act="nine">Front nine<small>${n&&n.done?'See your card':nGo?'Resume at No. '+(n.hi+1):'Practice all nine holes'}</small></button></div>
${seen?'':HOW}<p class="fine">An unofficial tribute. Pars, yardages and handicaps follow the club's Gold-tee card. The hole designs are this game's own.</p>`)}
function helpCard(){sheet(`<h2>How to swing</h2>${HOW}
<p class="fine">The dotted line shows where a straight shot lands. Wind and the arrows on the green are not in that line, so allow for them. Water and the woods cost one stroke. A live oak in the rough will knock a low ball down.</p>
<button class="btn" data-act="close">Carry on</button>`)}
function holeCard(score){const h=cur(),last=S.hi>=S.round.ids.length-1,nx=last?null:S.holes[S.round.ids[S.hi+1]];
  sheet(`<p class="eyebrow">No. ${h.n} · ${h.name} · Par ${h.par}</p><h2>${scoreName(score,h.par)}</h2>
<p class="sub">${score===1?'One swing. Frame the card.':score+' strokes'+(score>=maxScore()?', the most a hole can cost.':'.')}</p>
${scoreCard(S.round.ids,S.round.scores,S.round.type==='nine'?'Practice':"Today's three")}
<button class="btn" data-act="${last?'results':'next'}">${last?'Sign the card':'On to No. '+nx.n+'<small>'+nx.name+' · Par '+nx.par+' · '+nx.yards+' yd</small>'}</button>`)}
function shareText(){const r=S.round,hs=r.ids.map(i=>S.holes[i]),par=sum(hs.map(h=>h.par)),tot=sum(r.scores);
  let t=r.type==='nine'?`⛳ Flick Links · front nine at ${COURSE.club}\n`+r.scores.map((s,i)=>emo(s,hs[i].par)).join('')+`\n${tot} strokes (${rel(tot-par)})`
    :`⛳ Flick Links No. ${S.day} · ${COURSE.club}\n`+r.scores.map((s,i)=>`#${hs[i].n} ${emo(s,hs[i].par)} ${s}`).join('   ')+`\n${tot} strokes (${rel(tot-par)})`;
  let url=SHARE_URL;try{if(!url&&window.top===window.self&&/^https?:$/.test(location.protocol))url=location.origin+location.pathname}catch(e){}
  return url?t+'\n'+url:t}
function resultsCard(){const r=S.round,sv=fetchKey(saveKey());if(sv&&sv.scores)r.scores=sv.scores;
  const hs=r.ids.map(i=>S.holes[i]),d=sum(r.scores)-sum(hs.map(h=>h.par)),m=fetchKey('meta'),nine=r.type==='nine';
  S.mode='done';S.hi=r.ids.length-1;setBall(0,0);setupShot();hud();hintOff();store('seen',1);overviewCam(.16,.24,false);
  sheet(`<p class="eyebrow">${nine?'Practice round · front nine':dateLine()}</p><h2>${sum(r.scores)} strokes, ${d===0?'even par':d<0?Math.abs(d)+' under':d+' over'}</h2>
${scoreCard(r.ids,r.scores,nine?'Practice':"Today's three")}
<textarea id="shareText" readonly rows="3" aria-label="Your result, ready to paste">${shareText()}</textarea>
<div class="row"><button class="btn" data-act="share">Share score</button><button class="btn ghost" data-act="${nine?'again':'title'}">${nine?'Play it again':'Clubhouse'}</button></div>
${nine?'<button class="btn ghost" data-act="title">Clubhouse</button>':''}
<p class="fine" id="shareNote">${nine?'Practice rounds do not change today\'s card.':(m&&m.streak>1?`Day streak <b>${m.streak}</b>. `:'')+'New holes in <b id="countdown">--:--:--</b>.'}</p>`);tickClock()}
async function share(){const ta=$('shareText'),text=ta.value,note=$('shareNote');let top=false;try{top=window.top===window.self}catch(e){}
  if(top&&navigator.share){try{await navigator.share({text});return}catch(e){if(e&&e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(text);note.textContent='Copied. Paste it in the group chat.'}
  catch(e){ta.focus();ta.select();note.textContent='Press and hold the score above to copy it.'}}
function tickClock(){const e=$('countdown');if(!e)return;const n=new Date(),next=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1),s=Math.max(0,Math.floor((next-n)/1000));
  e.textContent=pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60)}
setInterval(()=>{tickClock();if(S.key&&todayKey()!==S.key&&(S.mode==='done'||S.mode==='title'))initDay()},1000);
$('card').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;ac();
  if(a==='daily'||a==='nine')begin(a);
  else if(a==='again'){store(S.key+':nine',null);begin('nine')}
  else if(a==='close')closeSheet();
  else if(a==='next'){closeSheet();startHole(S.hi+1)}
  else if(a==='results')resultsCard();
  else if(a==='title')titleCard();
  else if(a==='share')share()});

// ───────── flow
let introT=0;
function startHole(i,sv){closeSheet();S.hi=i;const h=cur();S.strokes=sv?sv.strokes||0:0;setBall(sv&&sv.strokes?sv.bx:h.tee.x,sv&&sv.strokes?sv.by:h.tee.y);setupShot();
  if(S.strokes>=maxScore())return finishHole(maxScore());
  overviewCam(.5,.7,false);S.mode='intro';hud();toast(`No. ${h.n} · ${h.name}`,`Par ${h.par} · ${h.yards} yards · Handicap ${h.hcp}`,2000);
  if(S.hintShots<3&&!fetchKey('seen'))hintOn('Pull back to aim, then flick forward');
  clearTimeout(introT);introT=setTimeout(()=>{if(S.mode==='intro'){S.mode='ready';aimCam()}},1900);save()}
function begin(type){const ids=type==='nine'?COURSE.holes.map((_,i)=>i):dailyIds(S.key);S.round={type,ids,scores:[]};const sv=fetchKey(saveKey());
  if(sv&&sv.done&&Array.isArray(sv.scores)){S.round.scores=sv.scores;return resultsCard()}
  if(sv&&Array.isArray(sv.scores)&&sv.hi>=0&&sv.hi<ids.length){S.round.scores=sv.scores.slice(0,sv.hi);startHole(sv.hi,sv)}else startHole(0)}
function initDay(){S.key=todayKey();S.day=dayNumber(S.key);S.holes=COURSE.holes.map(d=>buildHole(d,S.key));S.muted=!!fetchKey('muted');
  $('btnSound').setAttribute('aria-pressed',String(!S.muted));titleCard()}
resize();initDay();resize();requestAnimationFrame(frame);
if(location.hash==='#dev')window.__fl={S,cam,camT,fire,cur,lieAt,begin,startHole,overviewCam,closeSheet,COURSE};
