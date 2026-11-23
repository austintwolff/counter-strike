// ───────── rules of this little world
const G=22,KW=0.18,CUP_R=0.28,CAP_V=4.2,MAX_OVER=5;
const MU={green:2.2,fringe:4,fairway:5,tee:5,rough:13,bunker:26,woods:15,ob:12,native:17,creekbed:15,water:13,rock:13};
const ROLLX={green:1.1,fringe:1,fairway:1,tee:1,rough:.35,bunker:.04,woods:.3,ob:.5,native:.18,creekbed:.5,water:0,rock:.6};
const LIE={green:'Green',fringe:'Fringe',fairway:'Fairway',tee:'Tee',rough:'Rough',bunker:'Bunker',native:'Native',creekbed:'Creek bed'};
// carry is a pure strike from a good lie, in yards; roll is added on top (a pure driver finishes near 290)
const CLUBS=[
  {id:'CH',name:'Chip',carry:38,loft:33,roll:.55,tw:90,sand:true},
  {id:'SW',name:'Sand Wedge',carry:85,loft:52,roll:.03,tw:82,sand:true},
  {id:'PW',name:'Wedge',carry:125,loft:47,roll:.04,tw:75,sand:true},
  {id:'8I',name:'8 Iron',carry:155,loft:41,roll:.05,tw:66},
  {id:'5I',name:'5 Iron',carry:192,loft:35,roll:.07,tw:58},
  {id:'3W',name:'3 Wood',carry:232,loft:30,roll:.09,tw:50,bomb:1.05},
  {id:'DR',name:'Driver',carry:262,loft:27,roll:.11,tw:45,bomb:1.05}]; // bomb: a pure strike with the long clubs flies this much farther
const PUTTER={id:'PT',name:'Putter',putt:true,tw:80};
const lieMult=(lie,c)=>lie==='rough'?.8:lie==='native'?.6:lie==='creekbed'?.7:lie==='bunker'?(c.sand?.8:.55):1;

// ───────── day, saves
const KEY='flicklinks:v2:',SHARE_URL='',BUILD_TS=__BUILD_TS__; // build.sh stamps the build time here
const pad=n=>String(n).padStart(2,'0');
const todayKey=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function dayNumber(k){const[y,m,d]=k.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(2026,10,22))/864e5)+1}
function store(k,v){try{v==null?localStorage.removeItem(KEY+k):localStorage.setItem(KEY+k,JSON.stringify(v))}catch(e){}}
function fetchKey(k){try{return JSON.parse(localStorage.getItem(KEY+k)||'null')}catch(e){return null}}
// one par 3, one par 4 and one par 5 drawn from every course, played in card order
function dailyIds(key){const r=mulberry32(hashStr('fl-day:'+key)),by=p=>ALL.map((e,i)=>e.def.par===p?i:-1).filter(i=>i>=0),pick=a=>a[Math.floor(r()*a.length)];
  return[pick(by(3)),pick(by(4)),pick(by(5))].sort((a,b)=>a-b)}

const S={mode:'title',key:'',day:1,holes:[],round:{type:'daily',ids:[0,1,2],scores:[]},hi:0,strokes:0,lie:'tee',clubs:[],ci:0,club:CLUBS[6],
  ball:{x:0,y:0,z:0,vx:0,vy:0,vz:0,air:false,spin:0,club:null,putt:false,gone:false,tree:null,rollK:1},prev:{x:0,y:0},g:null,trail:[],fx:[],parts:[],hintShots:0,muted:false,mark:{x:0,y:0},pmode:'aim',marks:[]};S.round.course='gr';
// holes are built the first time they are needed; the day's pins and wind are part of the build
const HOLE=i=>ALL[i]?S.holes[i]||(S.holes[i]=buildHole(i,S.key)):undefined;
const cur=()=>HOLE(S.round.ids[S.hi]);
const maxScore=()=>cur().par+MAX_OVER;
const nineKey=id=>S.key+':nine'+(id==='gr'?'':':'+id);
const saveKey=()=>S.round.type==='nine'?nineKey(S.round.course):S.key;
const onRange=()=>S.round.type==='range';
function save(){if(onRange())return;const n=S.round.ids.length;store(saveKey(),{ids:S.round.ids,scores:S.round.scores,hi:S.hi,strokes:S.strokes,bx:S.ball.x,by:S.ball.y,done:S.round.scores.length>=n})}

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
  tick:()=>tone(1500,1200,.03,'sine',.07),
  pure:()=>{tone(1320,1760,.12,'sine',.14,.02);tone(1760,2640,.16,'sine',.1,.1)},
  cup:()=>{tone(700,500,.06,'square',.12);tone(520,380,.07,'square',.12,.09);tone(880,1320,.25,'sine',.2,.2)},
  bad:()=>tone(220,120,.25,'sawtooth',.1)};

// ───────── camera: focus point sits at (W/2, H*ay); r rotates the target to straight up
const cam={x:0,y:0,s:1,r:0,ay:.5},camT={x:0,y:0,s:1,r:0,ay:.5};
function toScreen(x,y){const v=rotv(x-cam.x,y-cam.y,cam.r);return{x:W/2+v.x*cam.s,y:H*cam.ay+v.y*cam.s}}
function overviewCam(ay,frac,snap){const h=cur(),t=h.tee,p=h.pin,L=hyp(p.x-t.x,p.y-t.y)||1,ux=(p.x-t.x)/L,uy=(p.y-t.y)/L;
  let a0=0,a1=L,l0=0,l1=0;for(let i=0;i<h.route.pts.length;i+=4){const q=h.route.pts[i],dx=q.x-t.x,dy=q.y-t.y,al=dx*ux+dy*uy,la=-dx*uy+dy*ux;a0=Math.min(a0,al);a1=Math.max(a1,al);l0=Math.min(l0,la);l1=Math.max(l1,la)}
  const am=(a0+a1)/2,lm=(l0+l1)/2;
  camT.x=t.x+ux*am-uy*lm;camT.y=t.y+uy*am+ux*lm;camT.s=Math.min(H*frac/(a1-a0+56),W/(l1-l0+150));camT.r=-Math.PI/2-Math.atan2(uy,ux);camT.ay=ay;if(snap)Object.assign(cam,camT)}
const markDist=()=>hyp(S.mark.x-S.ball.x,S.mark.y-S.ball.y);
function reachOf(c){return c.putt?markDist():c.carry*lieMult(S.lie,c)*(1+c.roll)}
function aimCam(){const h=cur(),b=S.ball,d=hyp(b.x-h.pin.x,b.y-h.pin.y);
  const t=d<=285?h.pin:rAt(h.route,Math.min(h.total,rProj(h.route,b)+250));
  const view=S.club.putt?clamp(Math.max(d,markDist())*1.3,7,70):clamp(Math.min(d*1.18,reachOf(S.club)*1.15),7,430);
  camT.x=b.x;camT.y=b.y;camT.ay=.74;camT.s=H*.6/view;if(d>.02)camT.r=-Math.PI/2-Math.atan2(t.y-b.y,t.x-b.x)}
function updateCam(dt){
  if(S.mode==='flight'&&!S.ball.putt&&camT.s<5){camT.x=S.ball.x;camT.y=S.ball.y;camT.ay=.6}
  const k=1-Math.exp(-dt*(S.mode==='flight'?7:S.g?13:4.2)); // once a swing has begun the camera hurries to its place: the aim is read off the screen
  cam.x=lerp(cam.x,camT.x,k);cam.y=lerp(cam.y,camT.y,k);cam.s=lerp(cam.s,camT.s,k);cam.ay=lerp(cam.ay,camT.ay,k);cam.r=angTo(cam.r,camT.r,k);
  // once it is as good as there, snap to rest: the scenery can then be drawn crisp once and kept
  const dr=((camT.r-cam.r+Math.PI)%TAU+TAU)%TAU-Math.PI;if(hyp(cam.x-camT.x,cam.y-camT.y)*cam.s<1.5&&Math.abs(cam.s/camT.s-1)<.008&&Math.abs(dr)<.004&&Math.abs(cam.ay-camT.ay)<.003)Object.assign(cam,camT)}

// ───────── shot setup
function setupShot(){const h=cur(),b=S.ball;let lie=lieAt(h,b);if(!LIE[lie])lie='rough';S.lie=lie;
  const d=hyp(b.x-h.pin.x,b.y-h.pin.y),long=CLUBS.filter(c=>c.id!=='DR'||lie==='tee');
  const pickClub=l=>{const i=l.findIndex(c=>!c.putt&&c.carry*lieMult(lie,c)*(1+c.roll)*.94>=d);return i<0?l.length-1:i};
  let list,ci;
  if(lie==='green'){list=[PUTTER];ci=0}
  else if(lie==='fringe'){list=[PUTTER,...long];ci=d<=13?0:pickClub(list)}
  else{list=long;ci=pickClub(list)}
  S.clubs=list;S.ci=ci;S.club=list[ci];placeMarker()}
// the aim marker starts a little past the cup on the straight line; tap-ins go straight to the stroke
function placeMarker(){const h=cur(),b=S.ball,dx=h.pin.x-b.x,dy=h.pin.y-b.y,d=hyp(dx,dy)||1,past=Math.min(.5,d*.25);
  S.mark={x:h.pin.x+dx/d*past,y:h.pin.y+dy/d*past};S.pmode=d<1.4?'stroke':'aim'}
function setBall(x,y){Object.assign(S.ball,{x,y,z:0,vx:0,vy:0,vz:0,air:false,spin:0,putt:false,gone:false,tree:null,rollK:1});S.trail.length=0}
function changeClub(d){if(S.mode!=='ready')return;S.ci=clamp(S.ci+d,0,S.clubs.length-1);S.club=S.clubs[S.ci];placeMarker();aimCam();hud()}

// ───────── swing
// Pull back to set aim and power. A ring at the touch point fills in TU ms, slowly at first and quicker toward the top,
// then drains in TD and fills again. Flick forward through the touch point as it tops out.
// How full the ring is at the flick decides the strike: the top is pure, the upper part is decent, the bottom third is a shank.
const DEAD=.045,FLICK_V=.5,TU=1235,TD=450,EASE=1.7,SHANK=.3;
const pullMax=()=>clamp(H*.18,84,132);
const timingWindow=()=>S.club.tw*(S.lie==='rough'?.8:S.lie==='bunker'||S.lie==='native'||S.lie==='creekbed'?.7:1);
function meterAt(g,t){if(!g.t0)return{f:0,e:-TU};const tau=(t-g.t0)%(TU+TD);return tau<TU?{f:Math.pow(tau/TU,EASE),e:tau-TU}:{f:1-(tau-TU)/TD,e:tau-TU}}
function gPos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cv.addEventListener('pointerdown',e=>{
  ac();
  if(S.mode==='intro'){clearTimeout(introT);S.mode='ready';aimCam();return}
  if(S.mode!=='ready'||S.g)return;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const p=gPos(e);hintOff();
  if(S.club.putt&&S.pmode==='aim'){S.g={id:e.pointerId,drag:true,x:p.x,y:p.y};return}
  S.g={id:e.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y,phase:'aim',power:0,aim:null,last:{t:e.timeStamp,d:0},peak:{x:p.x,y:p.y,d:0},fast:0,slow:0,top:null,pull:0,trail:[],t0:0,ft:0,e:0,frozen:null,tick:0,
    off:Math.abs(performance.now()-e.timeStamp)<3000?0:performance.now()-e.timeStamp}; // timing uses each touch's own timestamp, not when it was processed
  S.mode='aim'});
cv.addEventListener('pointermove',e=>{const g=S.g;if(!g||e.pointerId!==g.id)return;
  if(g.drag){const p=gPos(e),w=rotv(p.x-g.x,p.y-g.y,-cam.r),b=S.ball;g.x=p.x;g.y=p.y;
    let mx=S.mark.x+w.x/cam.s*.75,my=S.mark.y+w.y/cam.s*.75;const d=hyp(mx-b.x,my-b.y),k=d>70?70/d:d<.3?0:1;
    if(k){S.mark.x=b.x+(mx-b.x)*k;S.mark.y=b.y+(my-b.y)*k}hudClub();return}
  const evs=e.getCoalescedEvents?e.getCoalescedEvents():[];
  for(const ev of(evs.length?evs:[e])){if(!S.g)break;const p=gPos(ev);sample(ev.timeStamp||e.timeStamp,p.x,p.y)}});
function aimFrom(g,x,y,len,t){g.power=clamp(len/pullMax(),0,1);g.aim=len>5?{x:(g.ox-x)/len,y:(g.oy-y)/len}:null;if(!g.t0&&len>14)g.t0=t+g.off}
function toSwing(g){const k=g.peak,m=meterAt(g,g.ft||performance.now());g.phase='swing';g.slow=0;g.top={x:k.x,y:k.y};g.pull=k.d;g.power=clamp(k.d/pullMax(),0,1);
  g.aim={x:(g.ox-k.x)/k.d,y:(g.oy-k.y)/k.d};g.trail=[{x:k.x,y:k.y}];g.e=m.e;g.frozen=m.f}
// A resting finger sends no events, so the gap before a sample is capped: whatever moved, moved within about a frame.
function sample(t,x,y){const g=S.g,len=hyp(x-g.ox,y-g.oy),vr=(g.last.d-len)/clamp(t-g.last.t,4,20);
  g.x=x;g.y=y;g.last={t,d:len};
  if(g.phase==='aim'){
    if(vr>FLICK_V&&g.peak.d>pullMax()*.16){if(!g.fast)g.ft=t+g.off;g.fast++;if(g.fast>=2||g.peak.d-len>g.peak.d*.25)toSwing(g)}
    else{g.fast=0;g.peak={x,y,d:len};aimFrom(g,x,y,len,t)}}
  if(g.phase==='swing'){g.trail.push({x,y});
    if((x-g.top.x)*g.aim.x+(y-g.top.y)*g.aim.y>=g.pull)commit(x,y);
    else if(vr<.05){if(++g.slow>=3){g.phase='aim';g.fast=0;g.frozen=null;g.peak={x,y,d:len};aimFrom(g,x,y,len,t)}}else g.slow=0}}
function commit(x,y){const g=S.g,fx=x-g.top.x,fy=y-g.top.y,b=S.ball;
  const dev=Math.atan2(g.aim.x*fy-g.aim.y*fx,g.aim.x*fx+g.aim.y*fy);let aw=rotv(g.aim.x,g.aim.y,-cam.r),p=g.power;
  if(S.club.putt){const d=markDist()||1;aw={x:(S.mark.x-b.x)/d,y:(S.mark.y-b.y)/d};p=1}
  S.fx.push({type:'swing',pts:g.trail.slice(),t0:performance.now()});
  const te=g.e,tf=g.frozen;endGesture();fire(p,aw,dev,{x:g.ox,y:g.oy},te,tf)}
function endGesture(){const g=S.g;if(!g)return;try{cv.releasePointerCapture(g.id)}catch(_){}S.g=null;if(S.mode==='aim')S.mode='ready'}
function onUp(e){const g=S.g;if(!g||e.pointerId!==g.id)return;
  if(g.drag){endGesture();aimCam();hud();return}
  if(g.phase==='aim'&&g.fast>0)toSwing(g);
  if(g.phase==='swing'){const prog=(g.x-g.top.x)*g.aim.x+(g.y-g.top.y)*g.aim.y;if(prog>=g.pull*.35)return commit(g.x,g.y)}
  const strong=g.power>.3;endGesture();if(S.club.putt)hud();else if(strong&&!onRange())hintOn('Flick up to swing')}
cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',e=>{if(S.g&&e.pointerId===S.g.id)endGesture()});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

// p is power 0..1, aim a world direction, dev the flick's angle off the pull line,
// te the timing error in ms (early is negative) and tf how full the ring was (1 at the top)
function fire(p,aim,dev,at,te,tf){const b=S.ball,c=S.club;te=te||0;if(tf==null)tf=1;
  p=clamp(p,.03,1);S.prev={x:b.x,y:b.y};S.shot=null;$('hLast').hidden=true;if(!onRange())S.strokes++;S.hintShots++;save();
  const onTime=Math.abs(te)<=timingWindow(),ts=Math.sign(te),shank=!onTime&&tf<SHANK,q=onTime?0:clamp((1-tf)/(1-SHANK),0,1);
  const ad=Math.abs(dev),kf=ad<=DEAD?0:Math.sign(dev)*clamp((ad-DEAD)/.35,0,1),over=Math.sign(dev)*Math.max(0,ad-DEAD),pure=onTime&&kf===0;
  b.club=c;b.putt=!!c.putt;b.z=0;b.gone=false;b.rollK=1;b.rocked=false;S.trail.length=0;b.dry={x:b.x,y:b.y};
  b.tree=cur().oaks.find(t=>hyp(b.x-t.x,b.y-t.y)<t.r)||null; // a ball already under an oak can be played out from beneath it
  let word,sub=onTime?'Perfect tempo':shank?(ts<0?'Far too early':'Far too late'):(q<.3?'A touch ':'')+(ts<0?'early':'late');
  if(c.putt){const pace=shank?.4:onTime?1:ts<0?.95-.27*q:1.05+.25*q,d=rotv(aim.x,aim.y,over*.6+(onTime?0:ts*(.01+q*.06))),v=Math.sqrt(2*MU.green*markDist()*p*pace);b.vx=d.x*v;b.vy=d.y*v;b.vz=0;b.air=false;b.spin=0;
    word=pure?'Pure roll':shank?'Stubbed':kf>0?'Pushed':kf<0?'Pulled':ts<0?'Left short':'Hit firm';sfx.putt();store('putts',(fetchKey('putts')||0)+1)}
  else{const th=(shank?c.loft*.6:c.loft)*DEG,carry=p*c.carry*lieMult(S.lie,c)*(shank?.38:pure?c.bomb||1:onTime?.985:.955-.3*Math.pow(q,1.3)),v=Math.sqrt(carry*G/Math.sin(2*th)),
      k=shank?0:clamp(kf*1.15+(onTime?0:ts*(.1+q*.9)),-1.3,1.3),d=rotv(aim.x,aim.y,shank?.6:over*.36+(onTime?0:ts*(.012+q*.07))); // a shank squirts low and hard right
    b.vx=d.x*v*Math.cos(th);b.vy=d.y*v*Math.cos(th);b.vz=v*Math.sin(th);b.air=true;b.spin=k*.16*G/Math.tan(th);
    word=pure?(c.bomb?'Bombed it':'Pured it'):shank?'Shank':Math.abs(k)<.06?'Straight':Math.abs(k)<.3?(k>0?'Fade':'Draw'):(k>0?'Slice':'Hook');shank?sfx.bad():sfx.hit(p);
    if(S.lie==='bunker'){burst(b.x,b.y,K.sand,22,10,7);sfx.sand()}else if(S.lie!=='tee'){burst(b.x,b.y,'#5a8d3d',8,6,5);if(S.lie==='fairway'&&p>.3)S.marks.push({t:'divot',x:b.x,y:b.y,a:Math.atan2(d.y,d.x)})}}
  S.last={shank,q,early:ts<0,pure,putt:!!c.putt};if(pure)sfx.pure();
  if(at)S.fx.push({type:'word',text:word,sub,good:pure,bad:shank,x:at.x,y:at.y-44,t0:performance.now()});
  try{navigator.vibrate&&navigator.vibrate(pure?[10,40,10]:shank?60:25)}catch(_){}
  S.mode='flight';hud()}

// ───────── ball physics, fixed 240 Hz steps
const STEP=1/240;
function stepBall(dt){const b=S.ball,h=cur();
  if(b.air){const sp=hyp(b.vx,b.vy)||1,px=-b.vy/sp,py=b.vx/sp;
    b.vx+=(h.wind.x*KW+px*b.spin)*dt;b.vy+=(h.wind.y*KW+py*b.spin)*dt;b.vz-=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
    {const l=lieAt(h,b);if(l!=='water'&&l!=='woods'&&l!=='ob')b.dry={x:b.x,y:b.y}} // the last dry ground the ball passed over
    for(const t of h.oaks)if(b.tree!==t&&b.z>2.5&&b.z<t.h&&hyp(b.x-t.x,b.y-t.y)<t.r*.85){b.tree=t;b.vx*=.12;b.vy*=.12;b.vz=Math.min(b.vz,0)-1;b.spin=0;b.rollK=.2;sfx.leaf();burst(b.x,b.y,'#4b8134',16,10,5);toast('Into the oak',1000)}
    if(b.z<=0){b.z=0;let lie=lieAt(h,b);
      if(lie==='water')return hazard('water');
      if(hyp(b.x-h.pin.x,b.y-h.pin.y)<CUP_R)return holed();
      if(lie==='creekbed'&&b.vz<-5&&!b.rocked){b.rocked=true;const a=(hashStr(Math.round(b.x*8)+':'+Math.round(b.y*8))%1000/1000-.5)*1.7,d=rotv(b.vx,b.vy,a);
        b.vx=d.x*.42;b.vy=d.y*.42;b.vz=Math.min(15,-b.vz*.5);b.z=.02;b.spin=0;b.rollK=.3;sfx.clack();burst(b.x,b.y,K.stone,8,7,5);return}
      const carry=hyp(b.x-S.prev.x,b.y-S.prev.y),v=Math.sqrt(2*MU[lie]*carry*b.club.roll*ROLLX[lie]*b.rollK),s2=hyp(b.vx,b.vy)||1;
      b.vx=b.vx/s2*v;b.vy=b.vy/s2*v;b.vz=Math.min(9,-b.vz*.22)*(lie==='bunker'?0:lie==='fairway'||lie==='green'||lie==='fringe'||lie==='tee'?1:.5);b.air=false;
      if(lie==='bunker'){sfx.sand();burst(b.x,b.y,K.sand,18,8,6)}else{sfx.land();if(lie==='green'&&S.marks.length<40)S.marks.push({t:'pitch',x:b.x,y:b.y})}}
    return}
  if(b.z>0||b.vz>0){b.vz-=G*dt;b.z+=b.vz*dt;if(b.z<=0){b.z=0;b.vz=-b.vz*.4;if(b.vz<1.2)b.vz=0}}
  const lie=lieAt(h,b),mu=MU[lie];
  if(lie==='water'&&b.z<=.01)return hazard('water');
  if(lie!=='woods'&&lie!=='ob')b.dry={x:b.x,y:b.y};
  if(lie==='green'||lie==='fringe'){const a=slopeAt(h,b);b.vx+=a.x*dt;b.vy+=a.y*dt}
  const sp=hyp(b.vx,b.vy);
  if(b.z<.05&&sp<CAP_V&&hyp(b.x-h.pin.x,b.y-h.pin.y)<CUP_R)return holed();
  if(sp<=mu*dt){b.vx=b.vy=0;if(b.z<=0&&b.vz<=0)return atRest()}
  else{const k=(sp-mu*dt)/sp;b.vx*=k;b.vy*=k}
  b.x+=b.vx*dt;b.y+=b.vy*dt}
// Where to drop after water: a couple of yards back from the point of entry, on the line toward where the shot was played.
function dropSpot(){const h=cur(),d=S.ball.dry,p=S.prev,L=hyp(p.x-d.x,p.y-d.y);if(L<4)return p;const ux=(p.x-d.x)/L,uy=(p.y-d.y)/L;
  for(let k=2.5;k<Math.min(L,40);k+=2.5){const q={x:d.x+ux*k,y:d.y+uy*k},l=lieAt(h,q);if(l!=='water'&&l!=='woods'&&l!=='ob'&&l!=='bunker'&&!h.geo.water.some(w=>inSh(w,q,2)))return q}return p} // two clear yards from the bank
const shotLen=()=>({d:hyp(S.ball.x-S.prev.x,S.ball.y-S.prev.y),ft:S.club.putt});
function hazard(kind){const b=S.ball,water=kind==='water',spot=water?dropSpot():S.prev,back=spot===S.prev;S.mode='wait';S.shot=back?null:shotLen();b.gone=true;
  if(onRange()){S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now(),water});water?sfx.splash():sfx.bad();return setTimeout(()=>rangeAfter(false,water?'In the water.':'Out of play.'),900)}
  S.strokes++;
  S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now(),water});
  if(water){sfx.splash();burst(b.x,b.y,'#d8f4f0',22,9,9)}else sfx.bad();
  toast(water?'In the water':kind==='ob'?'Out of bounds':'Lost in the trees',(water&&!back?'Drop':'Replay')+' · +1',1900);hud();
  setTimeout(()=>{setBall(spot.x,spot.y);afterShot()},1500)}
function atRest(){const l=lieAt(cur(),S.ball);if(!onRange()&&(l==='woods'||l==='ob'))return hazard(l);S.shot=shotLen();afterShot()} // on the range a wild one is just fetched back
function afterShot(){if(onRange())return rangeAfter(false);if(S.strokes>=maxScore()){toast('Picked up','Max '+maxScore(),1600);return finishHole(maxScore())}
  setupShot();
  S.mode='ready';aimCam();hud();save()}
function holed(){const b=S.ball,h=cur();b.x=h.pin.x;b.y=h.pin.y;b.vx=b.vy=b.vz=b.z=0;b.air=false;b.gone=true;sfx.cup();burst(b.x,b.y,K.gold,26,5,11);burst(b.x,b.y,'#fff8e0',12,3,8);
  S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now()});finishHole(S.strokes)}
function finishHole(score){if(onRange()){S.mode='wait';return setTimeout(()=>rangeAfter(true),700)}S.mode='wait';S.round.scores[S.hi]=score;S.strokes=0;const n=S.round.ids.length,last=S.hi>=n-1;
  store(saveKey(),{ids:S.round.ids,scores:S.round.scores,hi:Math.min(n-1,S.hi+1),strokes:0,bx:0,by:0,done:last});
  if(last&&S.round.type==='daily'){bumpStreak();refresh()} // refresh posts the finished card to the clubhouse
  setTimeout(()=>holeCard(score),900)}
function bumpStreak(){const m=fetchKey('meta')||{last:0,streak:0};if(m.last===S.day)return;m.streak=m.last===S.day-1?m.streak+1:1;m.last=S.day;store('meta',m)}

// ───────── frame loop
let last=0,acc=0,hudTick=0,windDeg=1e9,Q=2,slowFrames=0;const LOCKQ=location.hash==='#dev';
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!cur())return;
  if(S.mode==='flight'){acc+=dt;while(acc>=STEP&&S.mode==='flight'){stepBall(STEP);acc-=STEP}
    const b=S.ball;S.trail.push({x:b.x,y:b.y,z:b.z});if(S.trail.length>(b.putt?10:26))S.trail.shift();
    if((hudTick+=dt)>.1){hudTick=0;hudDist()}}else acc=0;
  // step the picture quality down on a phone that cannot hold thirty frames a second
  if(dt>.034)slowFrames++;else slowFrames=Math.max(0,slowFrames-2);if(slowFrames>70&&Q>0&&!LOCKQ){Q--;slowFrames=0;resize()}
  const g=S.g;if(g&&!g.drag&&g.t0&&g.phase==='aim'){const tk=Math.floor((performance.now()-g.t0+TD)/(TU+TD));if(tk>g.tick){g.tick=tk;sfx.tick()}}
  updateCam(dt);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  drawScene(now);drawPreview(now);drawFlag(now);drawBall(dt);drawGesture(now);
  if(S.fx.length>12)S.fx.splice(0,S.fx.length-12);
  const ws=rotv(cur().wind.x,cur().wind.y,cam.r),deg=Math.round(Math.atan2(ws.y,ws.x)/DEG+90);
  if(deg!==windDeg){windDeg=deg;$('windArrow').style.transform=`rotate(${deg}deg)`}}
function resize(){const r=cv.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);DPR=Math.min([1,1.5,2][Q],window.devicePixelRatio||1);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);VIG=null;GRADE=null;
  if(S.key){if(S.mode==='ready')aimCam();else if(S.mode==='title')overviewCam(.2,.3,true)}}
addEventListener('resize',resize);

// ───────── plaques
function hudLast(){const e=$('hLast'),t=S.shot;e.hidden=!t;if(t)e.textContent='Last '+(t.ft?Math.max(1,Math.round(t.d*3))+' ft':Math.round(t.d)+' yd')}
function hudDist(){const h=cur(),b=S.ball,d=hyp(b.x-h.pin.x,b.y-h.pin.y),ft=d<20&&lieAt(h,b)==='green';
  $('hDist').textContent=ft?Math.max(1,Math.round(d*3)):Math.round(d);$('hUnit').textContent=ft?'ft to pin':'yd to pin'}
function hudClub(){const h=cur(),c=S.club,m=lieMult(S.lie,c);$('clubName').textContent=c.name;
  if(c.putt)$('clubMax').textContent=Math.round(markDist()*3)+' ft pace';
  else $('clubMax').textContent=Math.round(c.carry*m)+' yd · '+(LIE[S.lie]||'Rough')+(m<1?' −'+Math.round((1-m)*100)+'%':'')}
function hud(){const h=cur(),c=S.club,n=S.round.ids.length,ready=S.mode==='ready'||S.mode==='aim'||S.mode==='intro';
  $('hHole').textContent=`${S.round.type==='nine'?'No.':h.course.code} ${h.n} · Par ${h.par} · ${h.yards} yd`;$('hName').textContent=h.name;
  $('hStroke').textContent='Shot '+(S.mode==='flight'||S.mode==='wait'?Math.max(1,S.strokes):S.strokes+1)+(S.round.type==='nine'?'':' · hole '+(S.hi+1)+' of '+n);
  $('app').classList.toggle('tut',onRange());$('coach').hidden=!onRange();$('hWind').textContent=h.wind.sp;hudDist();hudLast();hudClub();
  $('clubPrev').disabled=S.ci<=0;$('clubNext').disabled=S.ci>=S.clubs.length-1;
  const pb=$('btnPutt');pb.hidden=!(c.putt&&ready);pb.textContent=S.pmode==='aim'?'Putt':'Aim';
  // the first few putts name the controls; after that the green is left to be read from its streaks. The range has its own card.
  if(c.putt&&ready&&!onRange()&&(fetchKey('putts')||0)<4)hintOn(S.pmode==='aim'?'Drag the marker, then press Putt':'Pull back, flick on gold');else if(c.putt||onRange())hintOff()}
let toastT=0;function toast(s,sub,ms){if(typeof sub==='number'){ms=sub;sub=''}const t=$('toast');t.textContent=s;if(sub){const e=document.createElement('small');e.textContent=sub;t.appendChild(e)}
  t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),ms||1400)}
function hintOn(s){const e=$('hint');e.textContent=s;e.style.opacity=1}
function hintOff(){$('hint').style.opacity=0}
$('clubPrev').onclick=()=>changeClub(-1);$('clubNext').onclick=()=>changeClub(1);
$('btnSound').onclick=()=>{S.muted=!S.muted;$('btnSound').setAttribute('aria-pressed',String(!S.muted));store('muted',S.muted);if(!S.muted)sfx.putt()};
$('btnHelp').onclick=()=>{if(S.mode==='ready')helpCard()};
$('btnPutt').onclick=()=>{if(S.mode!=='ready'||!S.club.putt)return;S.pmode=S.pmode==='aim'?'stroke':'aim';aimCam();hud()};
