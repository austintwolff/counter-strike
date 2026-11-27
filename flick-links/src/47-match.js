// ───────── head to head
// A match (see server/core.js) is played as a round of type 'match'. Its holes are built from the match's own seed (S.hkey), so
// both players get the same pins and wind whenever they play. In their own time, each hole's score goes up as it is finished.
// Shot for shot, every shot goes up as the ball comes to rest and the server says whose turn is next; while it is the other's
// turn the swing is held (S.hold), the phone asks every two seconds whether they have played, and their shot is shown as it
// arrives: a second ball flying from where it lay to where it finished. MT.x is the server's latest copy of the match in play.
const MT={x:null,card:null,timer:null,ghost:null,opp:null,seen:0,asked:false,carded:-1};
const matchIds=x=>x.holes.map(h=>ALL.findIndex(e=>e.c.id===h.k.slice(0,2)&&e.k+1===+h.k.slice(2)));
const vsOf=x=>x[x.side==='a'?'bn':'an'],otherSide=x=>x.side==='a'?'b':'a',inMatch=()=>S.round&&S.round.type==='match',inLive=()=>inMatch()&&!!S.round.live;
const courseName=id=>{const c=COURSES.find(c=>c.id===id);return c?c.club:id};
// leaving a match round for anything else: stop asking, let go of the swing, and go back to the day's own pins
function matchQuit(){clearTimeout(MT.timer);MT.timer=null;MT.x=null;MT.ghost=null;MT.opp=null;MT.seen=0;MT.asked=false;MT.carded=-1;S.hold=false;if(S.hkey){S.hkey=null;S.holes=[]}}
// How a match stands over the holes both have played ("You lead by 2 after 3"), and once all n are in, how it ended.
function standing(mine,theirs,vs,n){const k=Math.min(mine.length,theirs.length),d=sum(theirs.slice(0,k))-sum(mine.slice(0,k)),end=k>=n;if(!k)return'';
  return(d===0?(end?'Match halved':'All square'):d>0?(end?'You won by ':'You lead by ')+d:vs+(end?' won by ':' leads by ')+(-d))+(end?'':' after '+k)}

// ───────── in the clubhouse
function matchLine(r){const said=r.st==='done'?(r.win==='tie'?'Halved':r.win==='me'?'Won':'Lost')+' '+sum(r.mine)+'–'+sum(r.theirs):r.end==='them'?'Call it off?':r.st==='open'&&!r.from?'Challenged you':r.turn==='me'?'Your turn':'Waiting';
  return`<li><button data-act="match" data-id="${r.id}"><span class="nm">${esc(r.vs)}</span><small>${r.n} at ${courseName(r.course)}${r.live?' · shot for shot':''}</small><em class="${r.turn==='me'?'go':''}">${said}</em></button></li>`}
function tabMatches(c){const M=C.me&&C.me.matches,rows=M?M.rows.filter(r=>r.club===c.code):[],vs=M?M.vs:[];
  return`<button class="btn green" data-act="mnew">Challenge a member</button>`+(rows.length?`<ul class="rec mt">${rows.map(matchLine).join('')}</ul>`:'<p class="fine">No matches yet.</p>')
    +(vs.length?`<p class="eyebrow">Head to head</p><table class="st"><tr><th>Against</th><th>Won</th><th>Lost</th><th>Halved</th></tr>${vs.map(v=>`<tr><td>${esc(v.nick)}</td><td><b>${v.w}</b></td><td>${v.l}</td><td>${v.t}</td></tr>`).join('')}</table>`:'')}
// on the front page: a match that is waiting on this player
function matchStrip(){const M=C.me&&C.me.matches,r=M&&M.rows.find(r=>r.turn==='me'&&r.st!=='done');
  return r?`<button class="strip" data-act="match" data-id="${r.id}"><span><b>Match v ${esc(r.vs)}</b><i>${r.end==='them'?'Wants to call it off':r.st==='open'&&!r.from?'A challenge':'Your turn'} · ${r.n} at ${courseName(r.course)}</i></span><em>Open</em></button>`:''}
const matchLens=()=>{const c=COURSES.find(x=>x.id===$('mCourse').value),o=(v,l)=>`<option value="${v}">${l}</option>`;$('mLen').innerHTML=o('3','Three holes')+(c.more?o('f','Front nine')+o('b','Back nine')+o('a','Eighteen holes'):o('f','Nine holes'))};
function newMatchCard(){const c=C.club;if(!c)return;const others=c.standings.filter(m=>!m.me),opt=(v,l)=>`<option value="${v}">${l}</option>`;
  if(!others.length)return sheet(`<p class="eyebrow">${esc(c.name)}</p><h2>Challenge a member</h2><p class="fine">Nobody else is in this clubhouse yet.</p><div class="row"><button class="btn" data-act="invite">Invite friends</button><button class="btn ghost" data-act="tab" data-t="matches">Back</button></div><p class="fine" id="shareNote"></p>`);
  sheet(`<p class="eyebrow">${esc(c.name)}</p><h2>Challenge a member</h2>
<form id="matchForm" class="field" novalidate>
<label for="mTo">Against</label><select id="mTo">${others.map(m=>opt(m.id,esc(m.nick))).join('')}</select>
<label for="mCourse">Course</label><select id="mCourse">${COURSES.map(x=>opt(x.id,x.club)).join('')}</select>
<label for="mLen">Holes</label><select id="mLen"></select>
<label for="mLive">Play</label><select id="mLive">${opt('0','Each in your own time')}${opt('1','Shot for shot, together')}</select>
<p class="err" id="formErr" role="alert"></p>
<div class="row"><button class="btn" type="submit">Send challenge</button><button class="btn ghost" type="button" data-act="tab" data-t="matches">Back</button></div></form>`);matchLens()}
// three holes of a course for a short match: a par three, a four and a five where it has them, in playing order
function threeOf(cid){const ids=courseIds(cid,'a'),pick=[],rnd=a=>a[Math.floor(Math.random()*a.length)];for(const par of[3,4,5]){const c=ids.filter(i=>INFO(i).par===par);if(c.length)pick.push(rnd(c))}
  while(pick.length<3)pick.push(rnd(ids.filter(i=>!pick.includes(i))));return pick.sort((a,b)=>INFO(a).n-INFO(b).n)}
async function sendMatch(){const cid=$('mCourse').value,len=$('mLen').value,ids=len==='3'?threeOf(cid):courseIds(cid,len),btn=$('matchForm').querySelector('[type=submit]');btn.disabled=true;
  try{const j=await Net.call('POST','/match/new',{club:C.club.code,to:$('mTo').value,part:len==='3'?null:len,live:$('mLive').value==='1',holes:ids.map(i=>({k:holeKey(INFO(i)),par:INFO(i).par}))});if(!j.ok)throw j;await refresh();matchCard(j.match.id,j.match)}
  catch(e){btn.disabled=false;$('formErr').textContent=e&&e.error==='too_many'?'You have a dozen matches going already.':'That did not go through. Try again.'}}
// A finished match: the two totals side by side with the winner marked, and under the card the holes each took and the
// record between the two.
function finalBoard(x){const me=x.side,o=otherSide(x),par=sum(x.holes.map(h=>h.par)),box=(l,s,w)=>`<div class="${w?'w':''}"><span>${l}</span><b>${s}</b><i>${rel(s-par)}</i>${w?'<em>Winner</em>':''}</div>`;
  return`<div class="vsb">${box('You',sum(x.sc[me]),x.win===me)}${box(esc(vsOf(x)),sum(x.sc[o]),x.win===o)}</div>`}
function finalLines(x){const o=otherSide(x),mine=x.sc[x.side],theirs=x.sc[o],vs=esc(vsOf(x)),w=mine.filter((s,i)=>s<theirs[i]).length,l=mine.filter((s,i)=>s>theirs[i]).length,v=C.me&&C.me.matches&&C.me.matches.vs.find(v=>v.id===x[o]);
  return`<table class="st fin"><tr><th></th><th>You</th><th>${vs}</th><th>Halved</th></tr><tr><td>Holes won</td><td><b>${w}</b></td><td><b>${l}</b></td><td>${mine.length-w-l}</td></tr>${v?`<tr><td>Matches won</td><td><b>${v.w}</b></td><td><b>${v.l}</b></td><td>${v.t}</td></tr>`:''}</table>`}
// one match: both cards, how it stands, and what can be done about it
async function matchCard(id,x){if(!x){try{const j=await Net.call('GET','/match?id='+id);if(j.ok)x=j.match}catch(e){}}if(!x){C.tab='matches';return clubCard()}
  MT.card=x;const me=x.side,o=otherSide(x),ids=matchIds(x),n=ids.length,mine=x.sc[me],theirs=x.sc[o],vs=esc(vsOf(x)),done=x.st==='done',on=x.st==='on';
  const can=on||(x.st==='open'&&(me==='b'||!x.live)),left=x.live?!done:mine.length<n,play=can&&left&&!done,asks=on&&x.end===o,asked=on&&x.end===me;
  const said=done?standing(mine,theirs,vs,n):x.st==='off'?'Called off':asks?vs+' wants to call it off'
    :x.st==='open'&&me==='b'?vs+' has challenged you':x.st==='open'&&x.live?'Waiting for '+vs+' to take it up':play?(x.live&&x.turn!==me?vs+' to play':'Your turn'):'Waiting for '+vs;
  sheet(`<p class="eyebrow" data-mid="${x.id}">Match · ${n} at ${courseName(x.course)} · ${x.live?'shot for shot':'own time'}</p><h2>${said}</h2>
${done?finalBoard(x):''}${ids.every(i=>i>=0)?scoreCard(ids,mine,{vs:vsOf(x),theirs}):''}${done?finalLines(x):''}
${asks?'<div class="row"><button class="btn" data-act="moff">Call it off</button><button class="btn ghost" data-act="mon">Play on</button></div>':play?`<button class="btn" data-act="mplay">${x.st==='open'&&me==='b'?'Take it up':mine.length||x.pos[me]?'Carry on':'Play'}</button>`:''}
${asked?`<p class="fine">You have asked to call it off. ${vs} has to agree.</p>`:''}
<div class="row">${x.st==='open'?`<button class="btn ghost" data-act="mno">${me==='b'?'Decline':'Withdraw'}</button>`:asked?'<button class="btn ghost" data-act="mon">Take it back</button>':on&&!asks?'<button class="btn ghost" data-act="moff">Call it off</button>':''}<button class="btn ghost" data-act="tab" data-t="matches">Back</button></div>`);
  // While this card is the one on show and the match is not over, look again every few seconds.
  const showing=()=>!$('scrim').hidden&&!!$('card').querySelector('[data-mid="'+x.id+'"]'),look=()=>{clearTimeout(MT.timer);MT.timer=setTimeout(async()=>{if(!showing())return;
      try{const j=await Net.call('GET','/match?id='+id);if(j.ok&&j.match.seq!==x.seq&&showing()){await refresh();return showing()?matchCard(id,j.match):null}}catch(e){}if(showing())look()},3000)};
  if(x.st==='open'||on)look()}
async function answerMatch(yes){const x=MT.card;if(!x)return;try{await Net.call('POST','/match/answer',{id:x.id,yes})}catch(e){}await refresh();C.tab='matches';clubCard()}
async function playMatch(){let x=MT.card;if(!x)return;try{if(x.st==='open'&&x.side==='b'){const j=await Net.call('POST','/match/answer',{id:x.id,yes:true});if(j.ok)x=j.match}}catch(e){}
  if(x.live&&x.st!=='on')return matchCard(x.id);closeSheet();beginMatch(x)}

// ───────── calling it off
// It takes both players. One asks, from the leave sheet or the match's card; the other is asked on their phone (at once when
// playing shot for shot, otherwise on the match's card and the next hole card) and agrees or plays on.
async function matchEnd(yes){const playing=inMatch(),id=playing?S.round.mid:MT.card&&MT.card.id,r=S.round;if(!id)return;let x=null;
  try{const j=await Net.call('POST','/match/end',{id,yes});if(j.ok)x=j.match;else if(j.error==='no_match'){const k=await Net.call('GET','/match?id='+id);if(k.ok)x=k.match}}catch(e){}
  if(!x)return toast('That did not go through');if(!playing){await refresh();return matchCard(id,x)}if(S.round!==r)return;
  MT.x=x;MT.seen=Math.max(MT.seen,x.seq);MT.asked=false;if(x.st!=='on')return x.st==='off'?matchOff():matchResults();closeSheet();hud();if(yes)toast('Asked '+r.vs,'They have to agree',2200)}
// the match in play has been called off: nothing of it is kept
function matchOff(){const vs=esc(S.round.vs);store(saveKey(),null);clearTimeout(MT.timer);S.hold=true;
  sheet(`<p class="eyebrow">Match v ${vs}</p><h2>Match called off</h2><button class="btn" data-act="mback">Back to the clubhouse</button>`)}
// they have asked: put the question, once, when there is no swing in hand and no other sheet up
function endAsk(){const x=MT.x;if(!x||!inMatch()||x.end!==otherSide(x)||MT.asked||!$('scrim').hidden||S.g||(S.mode!=='ready'&&S.mode!=='wait'))return;MT.asked=true;const vs=esc(S.round.vs);
  sheet(`<p class="eyebrow">Match v ${vs}</p><h2>${vs} wants to call it off</h2><div class="row"><button class="btn" data-act="moff">Call it off</button><button class="btn ghost" data-act="mon">Play on</button></div>`)}

// ───────── playing one
function beginMatch(x){const ids=matchIds(x);if(ids.some(i=>i<0))return matchCard(x.id,x);matchQuit();S.hkey='x'+x.id;S.holes=[];
  S.round={type:'match',mid:x.id,live:!!x.live,side:x.side,vs:vsOf(x),course:x.course,part:x.part,ids,scores:x.sc[x.side].slice(),log:[]};MT.x=x;MT.seen=x.seq;
  const sv=fetchKey(saveKey());if(sv&&Array.isArray(sv.log))S.round.log=sv.log;
  if(!x.live){const hi=S.round.scores.length;if(hi>=ids.length)return matchCard(x.id,x);return startHole(hi,sv&&sv.hi===hi?sv:null)}
  // shot for shot: the server knows where my ball lies
  const p=x.pos[x.side];if(x.hi>=ids.length)return matchCard(x.id,x);startHole(x.hi,p&&!p.in?{strokes:p.n,bx:p.x,by:p.y,hs:sv&&sv.hi===x.hi?sv.hs:null}:null);
  if(p&&p.in){S.ball.gone=true;S.strokes=p.n;S.round.scores[x.hi]=p.n;S.mode='wait'}
  liveNext()}
// in your own time: send up every hole finished that the server does not have yet
async function matchPush(){const r=S.round;if(!inMatch()||r.live)return null;try{const j=await Net.call('GET','/match?id='+r.mid);if(!j.ok)return null;let x=j.match;
    for(let i=x.sc[x.side].length;i<r.scores.length&&x.st!=='off';i++){const k=await Net.call('POST','/match/score',{id:r.mid,hi:i,s:r.scores[i]});if(!k.ok)break;x=k.match}
    if(S.round===r){const was=MT.x,o=otherSide(x);MT.x=x;if(x.st==='off')matchOff();else if(!was||was.sc[o].length!==x.sc[o].length||was.end!==x.end)redraw()}return x}catch(e){return null}}
async function matchResults(){const r=S.round,id=r.mid,x=r.live?null:await matchPush();if(x&&x.st==='off')return;await refresh();matchCard(id,x||undefined)}

// ───────── shot for shot
// The other player on this hole, in the HUD's own terms: the shot they are about to play, or what they made.
function oppShot(){const x=MT.x;if(!x)return'';const o=otherSide(x),made=x.sc[o][S.hi],po=x.hi===S.hi?x.pos[o]:null;return made!=null?'in for '+made:'on shot '+((po?po.n:0)+1)}
const liveLine=()=>{const x=MT.x,vs=S.round.vs;if(!x)return'';return S.hold&&x.sc[otherSide(x)][S.hi]==null?vs+' to play · '+oppShot().slice(3):vs+' '+oppShot()};
function yourTurn(){toast('Your turn',S.round.vs+' '+oppShot(),2600,true);sfx.turn();try{if(navigator.vibrate)navigator.vibrate(70)}catch(e){}}
// my ball has come to rest (or dropped): tell the server, and learn whose turn it is
async function liveShot(holed,score){const r=S.round,b=S.ball,h=cur(),n=holed?score:S.strokes,to=holed?h.pin:b,far=hyp(to.x-S.prev.x,to.y-S.prev.y);S.hold=true;hud();
  const body={id:r.mid,hi:S.hi,n,x:+to.x.toFixed(1),y:+to.y.toFixed(1),fx:+S.prev.x.toFixed(1),fy:+S.prev.y.toFixed(1),d:holed?0:+hyp(b.x-h.pin.x,b.y-h.pin.y).toFixed(1),in:!!holed,c:(b.club&&b.club.name)||'',putt:!!b.putt,z:b.putt||!b.club?0:+(far*Math.tan((b.club.loft||30)*DEG)/4).toFixed(1)};
  for(let k=0;k<6&&inLive()&&r===S.round;k++){try{const j=await Net.call('POST','/match/shot',body);if(j.ok)return liveGot(j.match);if(j.error!=='turn')break}catch(e){}await new Promise(res=>setTimeout(res,1500))}
  livePoll()}
// A fresh copy from the server. If it carries a shot of theirs not yet seen, watch it; then see whose turn it is.
const sameShot=(p,q)=>!p&&!q||!!p&&!!q&&p.side===q.side&&p.hi===q.hi&&p.n===q.n;
function liveGot(x){const r=S.round;if(!inLive()||x.id!==r.mid||x.seq<MT.seen)return;const o=otherSide(x),L=x.last,was=MT.x,wl=was&&was.last;MT.x=x;MT.seen=x.seq;
  if(x.st==='off')return matchOff();
  if(was&&was.end===x.side&&!x.end)toast(r.vs+' wants to play on',2200);if(x.end!==o)MT.asked=false;
  // nothing new on the course, only talk of calling it off: the shot in hand is left alone
  if(was&&was.turn===x.turn&&was.hi===x.hi&&was.st===x.st&&sameShot(wl,L)){endAsk();return void livePoll()}
  if(L&&L.side===o&&L.hi===S.hi&&!(wl&&wl.side===o&&wl.hi===L.hi&&wl.n===L.n)){const far=hyp(L.x-L.fx,L.y-L.fy);MT.ghost={...L,t0:performance.now(),dur:L.putt?clamp(far*120+700,800,2200):clamp(far*9+1100,1300,3400)};MT.opp=null;
    // the camera takes in their whole shot, then comes back
    if(far>1){camT.x=(L.fx+L.x)/2;camT.y=(L.fy+L.y)/2;camT.ay=.5;camT.s=Math.min(60,H*.55/Math.max(far*1.25,14))}
    toast(r.vs,(L.in?'In the hole':L.c||'Played')+' · '+L.n,1600);return void setTimeout(liveNext,MT.ghost.dur+350)}
  liveNext()}
function liveNext(){const x=MT.x,r=S.round;if(!x||!inLive()||x.id!==r.mid)return;const o=otherSide(x),po=x.pos[o];MT.ghost=null;MT.opp=x.hi===S.hi&&po&&!po.in?{x:po.x,y:po.y}:null;
  if(x.hi>S.hi||x.st==='done'){S.hold=true;hud();livePoll();if(MT.carded!==S.hi){MT.carded=S.hi;setTimeout(()=>{if(inLive()&&S.round===r&&MT.x&&MT.x.st!=='off')holeCard(r.scores[S.hi])},500)}return} // both are in: the hole's card, once
  S.hold=x.turn!==x.side;hud();livePoll();if(!S.hold){if(S.mode==='ready')aimCam();yourTurn()}endAsk()}
// Keep asking: every two seconds while waiting on their shot, more slowly otherwise (there is then only a call to stop to hear of).
function livePoll(){clearTimeout(MT.timer);const r=S.round,x=MT.x,quick=S.hold&&x&&x.hi===S.hi&&x.st==='on'&&$('scrim').hidden;MT.timer=setTimeout(async()=>{if(!inLive()||S.round!==r)return;
    if(!document.hidden){try{const j=await Net.call('GET','/match?id='+r.mid);if(!inLive()||S.round!==r)return;if(j.ok&&j.match.seq!==MT.seen)return liveGot(j.match)}catch(e){}endAsk()}livePoll()},quick?2000:5000)}
// their ball: lying where it came to rest, or in the air on its way there
function drawOpp(now){if(!inLive())return;const g=MT.ghost,rb=clamp(.11*cam.s,4.5,7.5);let q=MT.opp,z=0;
  if(g){const u=clamp((now-g.t0)/g.dur,0,1),e=g.putt?1-(1-u)*(1-u):u;q={x:lerp(g.fx,g.x,e),y:lerp(g.fy,g.y,e)};z=(g.z||0)*4*u*(1-u);if(u>=1&&g.in)q=null}
  if(!q)return;const p=toScreen(q.x,q.y),sd=rotv(SUN.x,SUN.y,cam.r),lift=z*cam.s*.55,r=rb*.92*(1+z/28),so=rb*.45+lift*.55,sr=rb*(1.4+z/45);
  ctx.globalAlpha=clamp(1-z/80,.5,1);ctx.drawImage(SPR.shadow,p.x+sd.x*so-sr,p.y+sd.y*so-sr,sr*2,sr*2);ctx.globalAlpha=1;
  const gr=ctx.createRadialGradient(p.x-sd.x*r*.45,p.y-lift-sd.y*r*.45,r*.08,p.x,p.y-lift,r*1.05);gr.addColorStop(0,'#fff3d6');gr.addColorStop(.6,'#f2c14e');gr.addColorStop(1,'#a8741a');ctx.fillStyle=gr;disc(p.x,p.y-lift,r);
  ctx.strokeStyle='rgba(40,24,6,.6)';ctx.lineWidth=1;ctx.stroke()}
