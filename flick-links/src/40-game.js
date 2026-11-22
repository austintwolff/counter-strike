// ───────── rules of this little world
const G=22,KW=0.18,CUP_R=0.28,CAP_V=4.2,MAX_OVER=5;
const MU={green:2.2,fringe:4,fairway:5,tee:5,rough:13,bunker:26,woods:15,water:13,rock:13};
const ROLLX={green:1.1,fringe:1,fairway:1,tee:1,rough:.35,bunker:.04,woods:.3,water:0,rock:.6};
const LIE={green:'Green',fringe:'Fringe',fairway:'Fairway',tee:'Tee',rough:'Rough',bunker:'Bunker'};
const CLUBS=[
  {id:'CH',name:'Chip',carry:38,loft:33,roll:.55},
  {id:'PW',name:'Wedge',carry:95,loft:49,roll:.035},
  {id:'8I',name:'8 Iron',carry:135,loft:41,roll:.05},
  {id:'5I',name:'5 Iron',carry:170,loft:35,roll:.07},
  {id:'3W',name:'3 Wood',carry:205,loft:30,roll:.09},
  {id:'DR',name:'Driver',carry:240,loft:27,roll:.11}];
const PUTTS=[5,10,18,30,50].map(r=>({id:'P'+r,name:'Putter',putt:true,range:r}));
const lieMult=(lie,c)=>lie==='rough'?.8:lie==='bunker'?(c.id==='PW'||c.id==='CH'?.8:.55):1;

// ───────── day, saves
const KEY='flicklinks:v2:',SHARE_URL='',BUILD_TS=__BUILD_TS__; // build.sh stamps the build time here
const pad=n=>String(n).padStart(2,'0');
const todayKey=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function dayNumber(k){const[y,m,d]=k.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(2026,10,22))/864e5)+1}
function store(k,v){try{v==null?localStorage.removeItem(KEY+k):localStorage.setItem(KEY+k,JSON.stringify(v))}catch(e){}}
function fetchKey(k){try{return JSON.parse(localStorage.getItem(KEY+k)||'null')}catch(e){return null}}
// one par 3, one par 4 and one par 5 from the nine, played in card order
function dailyIds(key){const r=mulberry32(hashStr('fl-day:'+key)),by=p=>COURSE.holes.map((h,i)=>h.par===p?i:-1).filter(i=>i>=0),pick=a=>a[Math.floor(r()*a.length)];
  return[pick(by(3)),pick(by(4)),pick(by(5))].sort((a,b)=>a-b)}

const S={mode:'title',key:'',day:1,holes:[],round:{type:'daily',ids:[0,1,2],scores:[]},hi:0,strokes:0,lie:'tee',clubs:[],ci:0,club:CLUBS[5],
  ball:{x:0,y:0,z:0,vx:0,vy:0,vz:0,air:false,spin:0,club:null,putt:false,gone:false,tree:null,rollK:1},prev:{x:0,y:0},g:null,trail:[],fx:[],parts:[],hintShots:0,muted:false};
const cur=()=>S.holes[S.round.ids[S.hi]];
const maxScore=()=>cur().par+MAX_OVER;
const saveKey=()=>S.key+(S.round.type==='nine'?':nine':'');
function save(){const n=S.round.ids.length;store(saveKey(),{ids:S.round.ids,scores:S.round.scores,hi:S.hi,strokes:S.strokes,bx:S.ball.x,by:S.ball.y,done:S.round.scores.length>=n})}

// ───────── sound (starts on the first touch)
let AC=null;
function ac(){if(S.muted)return null;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function tone(f0,f1,d,type,vol,delay=0){const a=ac();if(!a)return;const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;
  o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.02)}
function hiss(d,vol,freq,q=1){const a=ac();if(!a)return;const n=Math.floor(a.sampleRate*d),buf=a.createBuffer(1,n,a.sampleRate),ch=buf.getChannelData(0);
  for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=buf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
  g.gain.value=vol;s.connect(f).connect(g).connect(a.destination);s.start()}
const sfx={
  hit:p=>{hiss(.12,.25+.3*p,2400,.7);tone(420,110,.09,'triangle',.25+.2*p)},
  putt:()=>tone(900,500,.05,'triangle',.22),
  land:()=>hiss(.08,.2,500,1),
  sand:()=>hiss(.22,.35,1400,.6),
  leaf:()=>{hiss(.3,.4,3200,.8);tone(160,90,.08,'triangle',.2)},
  clack:()=>{tone(1900,900,.05,'square',.16);tone(700,300,.06,'triangle',.2)},
  splash:()=>{hiss(.5,.45,900,.5);tone(300,80,.3,'sine',.15)},
  cup:()=>{tone(700,500,.06,'square',.12);tone(520,380,.07,'square',.12,.09);tone(880,1320,.25,'sine',.2,.2)},
  bad:()=>tone(220,120,.25,'sawtooth',.1)};

// ───────── camera: focus point sits at (W/2, H*ay); r rotates the target to straight up
const cam={x:0,y:0,s:1,r:0,ay:.5},camT={x:0,y:0,s:1,r:0,ay:.5};
function toScreen(x,y){const v=rotv(x-cam.x,y-cam.y,cam.r);return{x:W/2+v.x*cam.s,y:H*cam.ay+v.y*cam.s}}
function overviewCam(ay,frac,snap){const h=cur(),t=h.tee,p=h.pin,L=hyp(p.x-t.x,p.y-t.y)||1,ux=(p.x-t.x)/L,uy=(p.y-t.y)/L;
  let a0=0,a1=L,l0=0,l1=0;for(let i=0;i<h.route.pts.length;i+=4){const q=h.route.pts[i],dx=q.x-t.x,dy=q.y-t.y,al=dx*ux+dy*uy,la=-dx*uy+dy*ux;a0=Math.min(a0,al);a1=Math.max(a1,al);l0=Math.min(l0,la);l1=Math.max(l1,la)}
  const am=(a0+a1)/2,lm=(l0+l1)/2;
  camT.x=t.x+ux*am-uy*lm;camT.y=t.y+uy*am+ux*lm;camT.s=Math.min(H*frac/(a1-a0+80),W/(l1-l0+110));camT.r=-Math.PI/2-Math.atan2(uy,ux);camT.ay=ay;if(snap)Object.assign(cam,camT)}
function reachOf(c){return c.putt?c.range:c.carry*lieMult(S.lie,c)*(1+c.roll)}
function aimCam(){const h=cur(),b=S.ball,d=hyp(b.x-h.pin.x,b.y-h.pin.y);
  const t=d<=255?h.pin:rAt(h.route,Math.min(h.total,rProj(h.route,b)+225));
  const view=clamp(Math.min(d*1.18,reachOf(S.club)*1.15),7,430);
  camT.x=b.x;camT.y=b.y;camT.ay=.74;camT.s=H*.56/view;if(d>.4)camT.r=-Math.PI/2-Math.atan2(t.y-b.y,t.x-b.x)}
function updateCam(dt){
  if(S.mode==='flight'&&!S.ball.putt){camT.x=S.ball.x;camT.y=S.ball.y;camT.ay=.6}
  const k=1-Math.exp(-dt*(S.mode==='flight'?7:4.2));
  cam.x=lerp(cam.x,camT.x,k);cam.y=lerp(cam.y,camT.y,k);cam.s=lerp(cam.s,camT.s,k);cam.ay=lerp(cam.ay,camT.ay,k);cam.r=angTo(cam.r,camT.r,k)}

// ───────── shot setup
function setupShot(){const h=cur(),b=S.ball;let lie=lieAt(h,b);if(!LIE[lie])lie='rough';S.lie=lie;
  const d=hyp(b.x-h.pin.x,b.y-h.pin.y),long=CLUBS.filter(c=>c.id!=='DR'||lie==='tee');
  const pickPutt=l=>{let i=l.findIndex(c=>c.putt&&c.range>=d*1.22),last=-1;l.forEach((c,j)=>{if(c.putt)last=j});return i<0?last:i};
  const pickClub=l=>{const i=l.findIndex(c=>!c.putt&&c.carry*lieMult(lie,c)*(1+c.roll)*.94>=d);return i<0?l.length-1:i};
  let list,ci;
  if(lie==='green'){list=PUTTS;ci=pickPutt(list)}
  else if(lie==='fringe'){list=[PUTTS[1],PUTTS[2],...long];ci=d<=13?pickPutt(list):pickClub(list)}
  else{list=long;ci=pickClub(list)}
  S.clubs=list;S.ci=ci;S.club=list[ci]}
function setBall(x,y){Object.assign(S.ball,{x,y,z:0,vx:0,vy:0,vz:0,air:false,spin:0,putt:false,gone:false,tree:null,rollK:1});S.trail.length=0}
function changeClub(d){if(S.mode!=='ready')return;S.ci=clamp(S.ci+d,0,S.clubs.length-1);S.club=S.clubs[S.ci];aimCam();hud()}

// ───────── swing: pull back sets aim and power, a fast flick back through the start point hits
const DEAD=.045,FLICK_V=.5;
const pullMax=()=>clamp(H*.27,120,230);
function gPos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cv.addEventListener('pointerdown',e=>{
  ac();
  if(S.mode==='intro'){clearTimeout(introT);S.mode='ready';aimCam();return}
  if(S.mode!=='ready'||S.g)return;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const p=gPos(e);S.g={id:e.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y,phase:'aim',power:0,aim:null,last:{t:e.timeStamp,d:0},peak:{x:p.x,y:p.y,d:0},fast:0,slow:0,top:null,pull:0,trail:[]};S.mode='aim';hintOff()});
cv.addEventListener('pointermove',e=>{const g=S.g;if(!g||e.pointerId!==g.id)return;
  const evs=e.getCoalescedEvents?e.getCoalescedEvents():[];
  for(const ev of(evs.length?evs:[e])){if(!S.g)break;const p=gPos(ev);sample(ev.timeStamp||e.timeStamp,p.x,p.y)}});
function aimFrom(g,x,y,len){g.power=clamp(len/pullMax(),0,1);g.aim=len>5?{x:(g.ox-x)/len,y:(g.oy-y)/len}:null}
function toSwing(g){const k=g.peak;g.phase='swing';g.slow=0;g.top={x:k.x,y:k.y};g.pull=k.d;g.power=clamp(k.d/pullMax(),0,1);g.aim={x:(g.ox-k.x)/k.d,y:(g.oy-k.y)/k.d};g.trail=[{x:k.x,y:k.y}]}
// A resting finger sends no events, so the gap before a sample is capped: whatever moved, moved within about a frame.
function sample(t,x,y){const g=S.g,len=hyp(x-g.ox,y-g.oy),vr=(g.last.d-len)/clamp(t-g.last.t,4,20);
  g.x=x;g.y=y;g.last={t,d:len};
  if(g.phase==='aim'){
    if(vr>FLICK_V&&g.peak.d>pullMax()*.1){g.fast++;if(g.fast>=2||g.peak.d-len>g.peak.d*.25)toSwing(g)}
    else{g.fast=0;g.peak={x,y,d:len};aimFrom(g,x,y,len)}}
  if(g.phase==='swing'){g.trail.push({x,y});
    if((x-g.top.x)*g.aim.x+(y-g.top.y)*g.aim.y>=g.pull)commit(x,y);
    else if(vr<.05){if(++g.slow>=3){g.phase='aim';g.fast=0;g.peak={x,y,d:len};aimFrom(g,x,y,len)}}else g.slow=0}}
function commit(x,y){const g=S.g,fx=x-g.top.x,fy=y-g.top.y;
  const dev=Math.atan2(g.aim.x*fy-g.aim.y*fx,g.aim.x*fx+g.aim.y*fy),aw=rotv(g.aim.x,g.aim.y,-cam.r);
  S.fx.push({type:'swing',pts:g.trail.slice(),t0:performance.now()});
  const p=g.power;endGesture();fire(p,aw,dev,{x:g.ox,y:g.oy})}
function endGesture(){const g=S.g;if(!g)return;try{cv.releasePointerCapture(g.id)}catch(_){}S.g=null;if(S.mode==='aim')S.mode='ready'}
function onUp(e){const g=S.g;if(!g||e.pointerId!==g.id)return;
  if(g.phase==='aim'&&g.fast>0)toSwing(g);
  if(g.phase==='swing'){const prog=(g.x-g.top.x)*g.aim.x+(g.y-g.top.y)*g.aim.y;if(prog>=g.pull*.35)return commit(g.x,g.y)}
  const strong=g.power>.15;endGesture();if(strong)hintOn('Flick forward through the ring to swing')}
cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',e=>{if(S.g&&e.pointerId===S.g.id)endGesture()});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

function fire(p,aim,dev,at){const b=S.ball,c=S.club;
  p=clamp(p,.03,1);S.prev={x:b.x,y:b.y};S.strokes++;S.hintShots++;save();
  const ad=Math.abs(dev),k=ad<=DEAD?0:Math.sign(dev)*clamp((ad-DEAD)/.35,0,1),over=Math.sign(dev)*Math.max(0,ad-DEAD);
  b.club=c;b.putt=!!c.putt;b.z=0;b.gone=false;b.rollK=1;S.trail.length=0;
  b.tree=cur().oaks.find(t=>hyp(b.x-t.x,b.y-t.y)<t.r)||null; // a ball already under an oak can be played out from beneath it
  let word;
  if(c.putt){const d=rotv(aim.x,aim.y,over*.5),v=Math.sqrt(2*MU.green*p*c.range);b.vx=d.x*v;b.vy=d.y*v;b.vz=0;b.air=false;b.spin=0;
    word=k===0?'Pure':k>0?'Pushed':'Pulled';sfx.putt()}
  else{const th=c.loft*DEG,carry=p*c.carry*lieMult(S.lie,c),v=Math.sqrt(carry*G/Math.sin(2*th)),d=rotv(aim.x,aim.y,over*.3);
    b.vx=d.x*v*Math.cos(th);b.vy=d.y*v*Math.cos(th);b.vz=v*Math.sin(th);b.air=true;b.spin=k*.16*G/Math.tan(th);
    word=k===0?'Pure':Math.abs(k)<.3?(k>0?'Fade':'Draw'):(k>0?'Slice':'Hook');sfx.hit(p);
    if(S.lie==='bunker'){burst(b.x,b.y,K.sand,22,10,7);sfx.sand()}else if(S.lie!=='tee')burst(b.x,b.y,'#5a8d3d',8,6,5)}
  if(at)S.fx.push({type:'word',text:word,good:k===0,x:at.x,y:at.y-34,t0:performance.now()});
  try{navigator.vibrate&&navigator.vibrate(k===0?12:25)}catch(_){}
  S.mode='flight';hud()}

// ───────── ball physics, fixed 240 Hz steps
const STEP=1/240;
function stepBall(dt){const b=S.ball,h=cur();
  if(b.air){const sp=hyp(b.vx,b.vy)||1,px=-b.vy/sp,py=b.vx/sp;
    b.vx+=(h.wind.x*KW+px*b.spin)*dt;b.vy+=(h.wind.y*KW+py*b.spin)*dt;b.vz-=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
    for(const t of h.oaks)if(b.tree!==t&&b.z>2.5&&b.z<t.h&&hyp(b.x-t.x,b.y-t.y)<t.r*.85){b.tree=t;b.vx*=.12;b.vy*=.12;b.vz=Math.min(b.vz,0)-1;b.spin=0;b.rollK=.2;sfx.leaf();burst(b.x,b.y,'#4b8134',16,10,5);toast('Into the oak',1000)}
    if(b.z<=0){b.z=0;let lie=lieAt(h,b);
      if(lie==='water')return hazard('water');
      if(hyp(b.x-h.pin.x,b.y-h.pin.y)<CUP_R)return holed();
      if(lie==='rock'&&b.vz<-5){const a=(hashStr(Math.round(b.x*8)+':'+Math.round(b.y*8))%1000/1000-.5)*1.7,d=rotv(b.vx,b.vy,a);
        b.vx=d.x*.42;b.vy=d.y*.42;b.vz=Math.min(15,-b.vz*.5);b.z=.02;b.spin=0;b.rollK=.3;sfx.clack();burst(b.x,b.y,K.stone,8,7,5);return}
      const carry=hyp(b.x-S.prev.x,b.y-S.prev.y),v=Math.sqrt(2*MU[lie]*carry*b.club.roll*ROLLX[lie]*b.rollK),s2=hyp(b.vx,b.vy)||1;
      b.vx=b.vx/s2*v;b.vy=b.vy/s2*v;b.vz=Math.min(9,-b.vz*.22)*(lie==='bunker'?0:lie==='rough'||lie==='woods'?.5:1);b.air=false;
      if(lie==='bunker'){sfx.sand();burst(b.x,b.y,K.sand,18,8,6)}else sfx.land()}
    return}
  if(b.z>0||b.vz>0){b.vz-=G*dt;b.z+=b.vz*dt;if(b.z<=0){b.z=0;b.vz=-b.vz*.4;if(b.vz<1.2)b.vz=0}}
  const lie=lieAt(h,b),mu=MU[lie];
  if(lie==='water'&&b.z<=.01)return hazard('water');
  if(lie==='green'){b.vx+=h.slope.x*dt;b.vy+=h.slope.y*dt}
  const sp=hyp(b.vx,b.vy);
  if(b.z<.05&&sp<CAP_V&&hyp(b.x-h.pin.x,b.y-h.pin.y)<CUP_R)return holed();
  if(sp<=mu*dt){b.vx=b.vy=0;if(b.z<=0&&b.vz<=0)return atRest()}
  else{const k=(sp-mu*dt)/sp;b.vx*=k;b.vy*=k}
  b.x+=b.vx*dt;b.y+=b.vy*dt}
function hazard(kind){const b=S.ball;S.mode='wait';b.gone=true;S.strokes++;
  S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now(),water:kind==='water'});
  if(kind==='water'){sfx.splash();burst(b.x,b.y,'#d8f4f0',22,9,9)}else sfx.bad();
  toast(kind==='water'?'In the water':'Lost in the trees','One stroke penalty',1700);hud();
  setTimeout(()=>{setBall(S.prev.x,S.prev.y);afterShot()},1500)}
function atRest(){if(lieAt(cur(),S.ball)==='woods')return hazard('woods');afterShot()}
function afterShot(){if(S.strokes>=maxScore()){toast('Picked up','The most a hole can cost is '+maxScore(),1600);return finishHole(maxScore())}
  const was=S.lie;setupShot();if(S.lie!==was&&(S.lie==='green'||S.lie==='bunker'))toast(S.lie==='green'?'On the green':'In the bunker','',1100);
  S.mode='ready';aimCam();hud();save()}
function holed(){const b=S.ball,h=cur();b.x=h.pin.x;b.y=h.pin.y;b.vx=b.vy=b.vz=b.z=0;b.air=false;b.gone=true;sfx.cup();
  S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now()});finishHole(S.strokes)}
function finishHole(score){S.mode='wait';S.round.scores[S.hi]=score;S.strokes=0;const n=S.round.ids.length,last=S.hi>=n-1;
  store(saveKey(),{ids:S.round.ids,scores:S.round.scores,hi:Math.min(n-1,S.hi+1),strokes:0,bx:0,by:0,done:last});
  if(last&&S.round.type==='daily')bumpStreak();setTimeout(()=>holeCard(score),900)}
function bumpStreak(){const m=fetchKey('meta')||{last:0,streak:0};if(m.last===S.day)return;m.streak=m.last===S.day-1?m.streak+1:1;m.last=S.day;store('meta',m)}

// ───────── frame loop
let last=0,acc=0,hudTick=0,windDeg=1e9,Q=2,slowFrames=0;const LOCKQ=location.hash==='#dev';
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!cur())return;
  if(S.mode==='flight'){acc+=dt;while(acc>=STEP&&S.mode==='flight'){stepBall(STEP);acc-=STEP}
    const b=S.ball;S.trail.push({x:b.x,y:b.y,z:b.z});if(S.trail.length>(b.putt?10:26))S.trail.shift();
    if((hudTick+=dt)>.1){hudTick=0;hudDist()}}else acc=0;
  // step the picture quality down on a phone that cannot hold thirty frames a second
  if(dt>.034)slowFrames++;else slowFrames=Math.max(0,slowFrames-2);if(slowFrames>70&&Q>0&&!LOCKQ){Q--;slowFrames=0;resize()}
  updateCam(dt);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  drawWorld(now);drawPreview();drawFlag(now);drawBall(dt);drawVignette();drawGesture(now);
  if(S.fx.length>12)S.fx.splice(0,S.fx.length-12);
  const ws=rotv(cur().wind.x,cur().wind.y,cam.r),deg=Math.round(Math.atan2(ws.y,ws.x)/DEG+90);
  if(deg!==windDeg){windDeg=deg;$('windArrow').style.transform=`rotate(${deg}deg)`}}
function resize(){const r=cv.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);DPR=Math.min([1,1.5,2][Q],window.devicePixelRatio||1);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);VIG=null;
  if(S.holes.length){if(S.mode==='ready')aimCam();else if(S.mode==='title')overviewCam(.2,.3,true)}}
addEventListener('resize',resize);

// ───────── plaques
function hudDist(){const h=cur(),b=S.ball,d=hyp(b.x-h.pin.x,b.y-h.pin.y),ft=d<20&&lieAt(h,b)==='green';
  $('hDist').textContent=ft?Math.max(1,Math.round(d*3)):Math.round(d);$('hUnit').textContent=ft?'ft to pin':'yd to pin'}
function hud(){const h=cur(),c=S.club,m=lieMult(S.lie,c),n=S.round.ids.length;
  $('hHole').textContent=`No. ${h.n} · ${S.round.type==='nine'?'Front nine':S.hi+1+' of '+n}`;$('hName').textContent=h.name;
  $('hPar').textContent=`Par ${h.par} · ${h.yards} yd`;
  $('hStroke').textContent='Shot '+(S.mode==='flight'||S.mode==='wait'?Math.max(1,S.strokes):S.strokes+1)+' · Hcp '+h.hcp;
  $('hWind').textContent=h.wind.sp;hudDist();
  $('hLie').textContent=(LIE[S.lie]||'Rough')+(m<1&&!c.putt?' · −'+Math.round((1-m)*100)+'%':'');
  $('clubName').textContent=c.name;$('clubMax').textContent=c.putt?`up to ${c.range*3} ft`:`up to ${Math.round(c.carry*m)} yd`;
  $('clubPrev').disabled=S.ci<=0;$('clubNext').disabled=S.ci>=S.clubs.length-1}
let toastT=0;function toast(s,sub,ms){if(typeof sub==='number'){ms=sub;sub=''}const t=$('toast');t.textContent=s;if(sub){const e=document.createElement('small');e.textContent=sub;t.appendChild(e)}
  t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),ms||1400)}
function hintOn(s){const e=$('hint');e.textContent=s;e.style.opacity=1}
function hintOff(){$('hint').style.opacity=0}
$('clubPrev').onclick=()=>changeClub(-1);$('clubNext').onclick=()=>changeClub(1);
$('btnSound').onclick=()=>{S.muted=!S.muted;$('btnSound').setAttribute('aria-pressed',String(!S.muted));store('muted',S.muted);if(!S.muted)sfx.putt()};
$('btnHelp').onclick=()=>{if(S.mode==='ready')helpCard()};
