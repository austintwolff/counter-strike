// ───────── rules of this little world
const G=22,KW=0.18,CUP_R=0.28,CAP_V=4.2,MAX_OVER=5;
const MU={green:2.2,fringe:4,fairway:5,tee:5,rough:13,bunker:26,woods:15,ob:12,native:17,creekbed:15,water:13,rock:13,void:13,snow:30};
// A putt rolls on the green at MU.green. A ball that has been chipped or pitched there still has some check on it and slows faster
// (GREEN_IN), so one that lands short on fairway (5) or fringe (4) and runs on does not suddenly go half as far again.
const GREEN_IN=3.4,muFor=(lie,b)=>lie==='green'&&!b.putt?GREEN_IN:MU[lie];
const ROLLX={green:1.1,fringe:1,fairway:1,tee:1,rough:.35,bunker:.04,woods:.3,ob:.5,native:.18,creekbed:.5,water:0,rock:.6,void:0,snow:.03};
const LIE={green:'Green',fringe:'Fringe',fairway:'Fairway',tee:'Tee',rough:'Rough',bunker:'Bunker',native:'Native',creekbed:'Creek bed',snow:'Snow'};
// carry is a pure strike from a good lie, in yards; roll is added on top (a pure driver finishes near 290)
// The short game is its own kind of shot, as putting is. In chipping range the player picks how to play it:
//   bump and run  low, lands early and runs a long way: for a clear run of fairway and green. Poor out of sand.
//   chip          the standard: carries about two thirds of the way and rolls the rest
//   flop          high and soft, stops close to where it lands: over a bunker, or to a pin tucked just beyond one. The hardest to time.
// A full pull is not the shot's whole reach but a little past the pin (S.pk, see setPk), so a ten-yard chip uses most of the pull
// and can be judged finely enough to hole.
// Harder shots are also quicker. tempo is how fast the ring runs for a shot (1 is the standard 1.14 seconds to gold), and tw
// how wide the gold is. A bump and run is unhurried with plenty of gold; a flop is quick with little. The woods run a touch
// quick, and quicker again the harder they are swung (rush: the extra at full power, coming in from 70%).
const CHIPS=[{id:'CH',style:0,name:'Bump & run',carry:20,loft:14,roll:1.9,tw:110,tempo:.95},
  {id:'CH',style:1,name:'Chip',carry:38,loft:33,roll:.55,tw:90,sand:true},
  {id:'CH',style:2,name:'Flop',carry:48,loft:62,roll:.08,tw:44,tempo:1.2,fin:1,sand:true}]; // fin: a finesse shot. Mistimed, it is chunked (early) or bladed low and running (late)
const CLUBS=[
  CHIPS[1],
  {id:'SW',name:'Sand Wedge',carry:85,loft:52,roll:.03,tw:82,sand:true},
  {id:'PW',name:'Wedge',carry:125,loft:47,roll:.04,tw:75,sand:true},
  {id:'8I',name:'8 Iron',carry:155,loft:41,roll:.05,tw:66},
  {id:'5I',name:'5 Iron',carry:192,loft:35,roll:.07,tw:58},
  {id:'3W',name:'3 Wood',carry:232,loft:30,roll:.09,tw:50,bomb:1.05,tempo:1.03,rush:.06},
  {id:'DR',name:'Driver',carry:262,loft:27,roll:.11,tw:45,bomb:1.05,tempo:1.05,rush:.08}]; // bomb: a pure strike with the long clubs flies this much farther
const PUTTER={id:'PT',name:'Putter',putt:true,tw:80};
const lieMult=(lie,c)=>lie==='rough'?.8:lie==='native'?.6:lie==='snow'?.6:lie==='creekbed'?.7:lie==='bunker'?(c.sand?.8:.55):1;

// ───────── day, saves
const KEY='flicklinks:v2:',SHARE_URL='',BUILD_TS=__BUILD_TS__; // build.sh stamps the build time here
const pad=n=>String(n).padStart(2,'0');
const todayKey=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function dayNumber(k){const[y,m,d]=k.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(2026,10,22))/864e5)+1}
function store(k,v){try{v==null?localStorage.removeItem(KEY+k):localStorage.setItem(KEY+k,JSON.stringify(v))}catch(e){}}
function fetchKey(k){try{return JSON.parse(localStorage.getItem(KEY+k)||'null')}catch(e){return null}}
// one par 3, one par 4 and one par 5 drawn from every course, played in card order
// Today's three: the courses take the day in turn, and the day's course gives a par 3, a par 4 and a par 5, played in hole order.
function dailyIds(key){const r=mulberry32(hashStr('fl-day:'+key)),n=COURSES.length,c=COURSES[((dayNumber(key)-1)%n+n)%n],own=ALL.map((e,i)=>e.c===c?i:-1).filter(i=>i>=0),out=[];
  for(const p of[3,4,5]){const left=own.filter(i=>!out.includes(i)),a=left.filter(i=>ALL[i].def.par===p),from=a.length?a:left;out.push(from[Math.floor(r()*from.length)])}
  return out.sort((a,b)=>ALL[a].n-ALL[b].n)}

const S={mode:'title',key:'',day:1,holes:[],round:{type:'daily',ids:[0,1,2],scores:[]},hi:0,strokes:0,lie:'tee',clubs:[],ci:0,club:CLUBS[6],
  ball:{x:0,y:0,z:0,vx:0,vy:0,vz:0,air:false,spin:0,club:null,putt:false,gone:false,tree:null,rollK:1},prev:{x:0,y:0},g:null,trail:[],fx:[],parts:[],hintShots:0,chip:1,pk:1,muted:false,mark:{x:0,y:0},pmode:'aim',marks:[]};S.round.course='gr';
// holes are built the first time they are needed; the day's pins and wind are part of the build
const HOLE=i=>ALL[i]?S.holes[i]||(S.holes[i]=buildHole(i,S.hkey||S.key)):undefined; // S.hkey: a match's own seed for pins and wind
const cur=()=>HOLE(S.round.ids[S.hi]);
const maxScore=()=>cur().par+MAX_OVER;
// where a round in progress is kept: the daily under its date; a practice round under its course and nine, whatever the day,
// so one saved today can be picked up tomorrow
const saveKey=()=>S.round.type==='nine'?'rd:'+S.round.course+':'+(S.round.part||'f'):S.round.type==='match'?'mt:'+S.round.mid:S.key;
const onRange=()=>S.round.type==='range';
function save(){if(onRange())return;const n=S.round.ids.length;store(saveKey(),{day:S.key,ids:S.round.ids,scores:S.round.scores,hi:S.hi,strokes:S.strokes,bx:S.ball.x,by:S.ball.y,done:S.round.scores.length>=n,hs:S.hs,log:S.round.log||[]})}
// ───────── the record of play
// Every finished round, daily or practice, is kept hole by hole, so that any table, record or badge thought of later can be worked
// out from what was actually played. For each hole (S.hs while it is in play):
//   s strokes, p putts, pen penalty strokes, sw full swings, pure pure strikes, fw fairway hit from the tee (par 4s and 5s),
//   gir on the green in regulation, dr the tee shot's length in yards, fp the first putt's length in feet,
//   hf the length in feet of the shot that went in (chip: 1 when that was not a putt). Not holed means the hole was picked up.
// Rounds go in the 'log' store with their kind ('daily' or 'practice'), so anything can be shown for either or both.
const newHs=()=>({p:0,pen:0,sw:0,pure:0,fw:null,gir:0,dr:null,fp:null,hf:null,chip:0,tee:false});
function noteRest(l){const hs=S.hs,h=cur();if(!hs||onRange())return;if(hs.tee){hs.tee=false;if(h.par>3){hs.dr=S.shot?Math.round(S.shot.d):null;hs.fw=l==='fairway'||l==='green'||l==='fringe'?1:0}}
  if(l==='green'&&S.strokes<=h.par-2)hs.gir=1}
function logRound(){const r=S.round,hs=r.log||[];if(hs.filter(Boolean).length<r.ids.length)return;const L=fetchKey('log')||[],c=INFO(r.ids[0]).course.id;
  L.push({v:1,id:Math.random().toString(36).slice(2,10)+Date.now().toString(36),kind:r.type==='daily'?'daily':r.type==='match'?'match':'practice',day:S.key,course:c,part:r.part||null,holes:hs,tot:sum(r.scores),par:sum(hs.map(x=>x.par)),t:Date.now(),b:BUILD_TS});
  while(L.length>400)L.shift();store('log',L)}

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
  turn:()=>{tone(660,660,.1,'sine',.16);tone(990,990,.18,'sine',.16,.12)},
  bad:()=>tone(220,120,.25,'sawtooth',.1)};

// ───────── camera: focus point sits at (W/2, H*ay); r rotates the target to straight up
const cam={x:0,y:0,s:1,r:0,ay:.5},camT={x:0,y:0,s:1,r:0,ay:.5};
function toScreen(x,y){const v=rotv(x-cam.x,y-cam.y,cam.r);return{x:W/2+v.x*cam.s,y:H*cam.ay+v.y*cam.s}}
function overviewCam(ay,frac,snap){const h=cur(),t=h.tee,p=h.pin,L=hyp(p.x-t.x,p.y-t.y)||1,ux=(p.x-t.x)/L,uy=(p.y-t.y)/L;
  let a0=0,a1=L,l0=0,l1=0;for(let i=0;i<h.route.pts.length;i+=4){const q=h.route.pts[i],dx=q.x-t.x,dy=q.y-t.y,al=dx*ux+dy*uy,la=-dx*uy+dy*ux;a0=Math.min(a0,al);a1=Math.max(a1,al);l0=Math.min(l0,la);l1=Math.max(l1,la)}
  const am=(a0+a1)/2,lm=(l0+l1)/2;
  camT.x=t.x+ux*am-uy*lm;camT.y=t.y+uy*am+ux*lm;camT.s=Math.min(H*frac/(a1-a0+56),W/(l1-l0+150));camT.r=-Math.PI/2-Math.atan2(uy,ux);camT.ay=ay;if(snap)Object.assign(cam,camT)}
const markDist=()=>hyp(S.mark.x-S.ball.x,S.mark.y-S.ball.y);
// ───────── real ground under the ball. A course on wild terrain carries a coarse grid of heights (yards above sea level), and a
// shot there flies over it: off a rim it keeps falling and goes much further, up a slope it comes down early.
function elevOf(m){const e=m.elev;if(!e)return null;if(!e.a){const s=atob(e.z),a=e.a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)}return e}
function groundAt(h,x,y){const e=h.geo.elev;if(!e)return 0;const fx=clamp((x-e.x0)/e.step,0,e.w-1.001),fy=clamp((y-e.y0)/e.step,0,e.h-1.001),i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j,a=e.a,o=j*e.w+i;
  return e.lo+e.k*(a[o]*(1-u)*(1-v)+a[o+1]*u*(1-v)+a[o+e.w]*(1-u)*v+a[o+e.w+1]*u*v)}
// Height of the ground at (x,y) against where the shot was struck (g0), as the flight feels it. A drop counts in full: off a rim
// the ball keeps falling. A climb counts for only UPHILL of itself. A golf ball rises about a hundred feet, so real headwalls of
// two and three hundred feet would simply be unplayable; the cliff is drawn as a hazard to carry instead, and the hole plays
// longer uphill without becoming impossible.
const UPHILL=.3,rise=(h,x,y,g0)=>{const d=groundAt(h,x,y)-g0;return d>0?d*UPHILL:d};
// how far a shot whose carry on the level would be `carry` really flies from p along (ux,uy)
function flightCarry(h,p,ux,uy,carry,loft){if(!h.geo.elev||carry<3)return carry;const th=loft*DEG,v=Math.sqrt(carry*G/Math.sin(2*th)),vx=v*Math.cos(th),vz=v*Math.sin(th),g0=groundAt(h,p.x,p.y);
  let pz=0,pg=0;for(let t=.05;t<40;t+=.05){const d=vx*t,z=vz*t-.5*G*t*t,g=rise(h,p.x+ux*d,p.y+uy*d,g0);if(z<=g)return vx*(t-.05+.05*(pz-pg)/(((pz-pg)-(z-g))||1));pz=z;pg=g}return vx*40}
const toPin=()=>{const h=cur(),b=S.ball,d=hyp(h.pin.x-b.x,h.pin.y-b.y)||1;return{x:(h.pin.x-b.x)/d,y:(h.pin.y-b.y)/d}};
function reachOf(c){if(c.putt)return markDist();const u=toPin();return flightCarry(cur(),S.ball,u.x,u.y,c.carry*lieMult(S.lie,c),c.loft)+c.carry*lieMult(S.lie,c)*c.roll}
function aimCam(){const h=cur(),b=S.ball,d=hyp(b.x-h.pin.x,b.y-h.pin.y);
  const t=d<=285?h.pin:rAt(h.route,Math.min(h.total,rProj(h.route,b)+250));
  const view=S.club.putt?clamp(Math.max(d,markDist())*1.3,7,70):clamp(Math.min(d*1.18,reachOf(S.club)*1.15),7,960); // far enough back that the pin, or as far as the club goes, clears the plates even off Glacier Point
  camT.x=b.x;camT.y=b.y;camT.ay=.74;camT.s=H*.6/view;if(d>.02)camT.r=-Math.PI/2-Math.atan2(t.y-b.y,t.x-b.x)}
function updateCam(dt){
  const b=S.ball;let ease=0;
  if(S.mode==='flight'&&!b.putt){const h=cur(),d=hyp(b.x-h.pin.x,b.y-h.pin.y);
    if(!b.onGreen&&!b.air&&b.z<.6&&d<45&&inSh(h.fringe,b))b.onGreen=true;
    // once an approach has come down on the green the camera eases in on the cup, so the roll past it (or into it) can be watched
    if(b.onGreen&&d<45){const view=clamp(d*2.3+9,11,60);camT.x=lerp(h.pin.x,b.x,.4);camT.y=lerp(h.pin.y,b.y,.4);camT.ay=.5;camT.s=Math.max(camT.s,H*.6/view);ease=3}
    else if(camT.s<5){camT.x=b.x;camT.y=b.y;camT.ay=.6;if(b.s0&&b.s0<5)camT.s=b.s0/(1+Math.min(b.air?b.zv||0:0,45)/230)}} // and draws back a little as the ball climbs
  const k=1-Math.exp(-dt*(ease||(S.mode==='flight'?7:S.g?13:4.2))); // once a swing has begun the camera hurries to its place: the aim is read off the screen
  cam.x=lerp(cam.x,camT.x,k);cam.y=lerp(cam.y,camT.y,k);cam.s=lerp(cam.s,camT.s,k);cam.ay=lerp(cam.ay,camT.ay,k);cam.r=angTo(cam.r,camT.r,k);
  // once it is as good as there, snap to rest: the scenery can then be drawn crisp once and kept
  const dr=((camT.r-cam.r+Math.PI)%TAU+TAU)%TAU-Math.PI;if(hyp(cam.x-camT.x,cam.y-camT.y)*cam.s<1.5&&Math.abs(cam.s/camT.s-1)<.008&&Math.abs(dr)<.004&&Math.abs(cam.ay-camT.ay)<.003)Object.assign(cam,camT)}

// ───────── shot setup
function setupShot(){const h=cur(),b=S.ball;let lie=lieAt(h,b);if(!LIE[lie])lie='rough';S.lie=lie;
  const d=hyp(b.x-h.pin.x,b.y-h.pin.y),long=CLUBS.filter(c=>c.id!=='DR'||lie==='tee').map(c=>c.id==='CH'?CHIPS[S.chip]:c);
  S.lie=lie;const pickClub=l=>{const i=l.findIndex(c=>!c.putt&&reachOf(c)*(h.geo.elev?.98:.94)>=d);return i<0?l.length-1:i};
  let list,ci;
  if(lie==='green'){list=[PUTTER];ci=0}
  else if(lie==='fringe'){list=[PUTTER,...long];ci=d<=13?0:pickClub(list)}
  else{list=long;ci=pickClub(list)}
  S.clubs=list;S.ci=ci;S.club=list[ci];placeMarker();setPk()}
// How far a ball landing at p and heading along (ux,uy) runs on level ground. It lands with the energy for its club's roll on that
// surface, and spends it yard by yard at each surface's own rate, so a bump that lands on fairway and runs onto the green is read right.
function runOut(h,p,ux,uy,carry,c){const l0=lieAt(h,p);let E=muFor(l0,{})*carry*c.roll*ROLLX[l0],d=0;
  while(E>0&&d<90){const l=lieAt(h,{x:p.x+ux*(d+.5),y:p.y+uy*(d+.5)});if(l==='water'||l==='void')break;const m=muFor(l,{});if(E<m){d+=E/m;break}E-=m;d+=1}return d}
// how much of the shot's reach a full pull gives: all of it, except in the short game, where it is 1.6 times the way to the pin
function setPk(){const c=S.club,h=cur();S.pk=c.style!=null?clamp(hyp(S.ball.x-h.pin.x,S.ball.y-h.pin.y)*1.6/reachOf(c),.3,1):1}
function setChip(i){if(S.mode!=='ready'||S.club.style==null||S.g)return;S.chip=i;S.clubs=S.clubs.map(c=>c.id==='CH'?CHIPS[i]:c);S.club=S.clubs[S.ci];setPk();S.idle0=performance.now();aimCam();hud()}
// the aim marker starts a little past the cup on the straight line. Every putt starts on the aim, tap-ins too.
function placeMarker(){const h=cur(),b=S.ball,dx=h.pin.x-b.x,dy=h.pin.y-b.y,d=hyp(dx,dy)||1,past=Math.min(.5,d*.25);
  S.mark={x:h.pin.x+dx/d*past,y:h.pin.y+dy/d*past};S.pmode='aim'}
function setBall(x,y){Object.assign(S.ball,{x,y,z:0,zv:0,vx:0,vy:0,vz:0,air:false,spin:0,putt:false,gone:false,tree:null,rollK:1});S.trail.length=0}
function changeClub(d){if(S.mode!=='ready')return;S.ci=clamp(S.ci+d,0,S.clubs.length-1);S.club=S.clubs[S.ci];placeMarker();setPk();aimCam();hud()}

// ───────── swing
// Pull back to set aim and power. A ring at the touch point fills in TU ms, slowly at first and quicker toward the top,
// then drains in TD and fills again. Flick forward through the touch point as it tops out.
// How full the ring is at the flick decides the strike: the top is pure, the upper part is decent, the bottom third is a shank.
// The ring quickens toward the top and the window is small: about six tenths of each club's nominal figure, never under 22 ms
// either side. A flick must also come back within two degrees of the line it was pulled along to count as straight.
// (These sit halfway between the first, forgiving ring and a strict one that proved too hard off the tee.)
const DEAD=.035,FLICK_V=.5,TU=1140,TD=415,EASE=2.05,WIN=.62,SHANK=.25;
const pullMax=()=>clamp(H*.18,84,132);
// The woods get wilder the harder they are swung: past 70% power the window narrows, the flick must be straighter, and a miss bends further.
const reachFor=pw=>S.club.bomb?clamp(((pw==null?(S.g?S.g.power:0):pw)-.7)/.3,0,1):0;
const timingWindow=pw=>Math.max(22,S.club.tw*(S.lie==='rough'?.8:S.lie==='bunker'||S.lie==='native'||S.lie==='creekbed'||S.lie==='snow'?.7:1)*WIN*(1-.35*reachFor(pw)));
// where the ring stands at time t: f how full it is, and e the timing error in ms (early is negative)
// The ring does not always run at the same speed (see tempo, above), and for the woods its speed changes with the pull. So the
// ring keeps a phase: ph, in standard milliseconds, as of time pt, moved on at the current rate each time the finger reports.
// A timing error is measured in phase, so at a quicker tempo the same slip of the thumb counts for more.
const rateAt=pw=>(S.club.tempo||1)*(1+(S.club.rush||0)*reachFor(pw));
const phaseAt=(g,t)=>Math.max(0,g.ph+(t-g.pt)*rateAt(g.power));
function meterOf(ph){const tau=ph%(TU+TD);return tau<TU?{f:Math.pow(tau/TU,EASE),e:tau-TU}:{f:1-(tau-TU)/TD,e:tau-TU}}
function meterAt(g,t){return g.t0?meterOf(phaseAt(g,t)):{f:0,e:-TU}}
// A flick inside the window is on time. Outside it, the strike is judged on how many windows off it was: six is as bad
// as it gets, and an early one that caught the ring still in the red is a shank.
function judge(te,tf,pw){const x=Math.abs(te)/timingWindow(pw);return{onTime:x<=1,q:clamp((x-1)/5,0,1),shank:te<0&&x>1&&tf<SHANK}}
function gPos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cv.addEventListener('pointerdown',e=>{
  ac();
  if(liveSkip())return; // watching the other player's shot in a match: a tap skips it
  if(S.mode==='intro'){clearTimeout(introT);S.mode='ready';aimCam();return}
  if(S.mode!=='ready'||S.g||S.hold)return; // hold: in a shot-for-shot match it is the other player's turn
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const p=gPos(e);hintOff();
  if(S.club.putt&&S.pmode==='aim'){S.g={id:e.pointerId,drag:true,x:p.x,y:p.y};return}
  S.g={id:e.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y,phase:'aim',power:0,aim:null,last:{t:e.timeStamp,d:0},peak:{x:p.x,y:p.y,d:0},anc:null,still:0,lp:null,ph:0,pt:0,fph:null,fast:0,slow:0,top:null,pull:0,trail:[],t0:0,ft:0,e:0,frozen:null,tick:0,
    off:0,cl:performance.now()-e.timeStamp};
  // Timing uses each touch's own timestamp, not when it was processed. Those timestamps are meant to share a clock with
  // performance.now(), which draws the ring, but on some devices (iPads among them) the two drift apart, and the ring then ran
  // out of step with the finger or did not fill at all. cl is the smallest gap seen between the two clocks during this
  // gesture; when the ring starts, anything more than ordinary delay (30 ms) is taken as the clocks' difference and allowed for.
  S.mode='aim'});
cv.addEventListener('pointermove',e=>{const g=S.g;if(!g||e.pointerId!==g.id)return;
  if(g.drag){const p=gPos(e),w=rotv(p.x-g.x,p.y-g.y,-cam.r),b=S.ball;g.x=p.x;g.y=p.y;
    let mx=S.mark.x+w.x/cam.s*.75,my=S.mark.y+w.y/cam.s*.75;const d=hyp(mx-b.x,my-b.y),k=d>70?70/d:d<.3?0:1;
    if(k){S.mark.x=b.x+(mx-b.x)*k;S.mark.y=b.y+(my-b.y)*k}hudClub();return}
  g.cl=Math.min(g.cl,performance.now()-e.timeStamp);const evs=e.getCoalescedEvents?e.getCoalescedEvents():[];
  for(const ev of(evs.length?evs:[e])){if(!S.g)break;const p=gPos(ev);sample(ev.timeStamp||e.timeStamp,p.x,p.y)}});
function aimFrom(g,x,y,len,t){g.power=clamp(len/pullMax(),0,1);g.aim=len>5?{x:(g.ox-x)/len,y:(g.oy-y)/len}:null;if(!g.t0&&len>14){g.off=g.cl>=0&&g.cl<30?0:g.cl;g.t0=g.pt=t+g.off;g.ph=0}}
function toSwing(g){const k=g.peak,m=g.fph!=null?meterOf(g.fph):meterAt(g,performance.now());g.phase='swing';g.slow=0;g.lp=null;g.top={x:k.x,y:k.y};g.pull=k.d;g.power=clamp(k.d/pullMax(),0,1);
  g.aim={x:(g.ox-k.x)/k.d,y:(g.oy-k.y)/k.d};g.trail=[{x:k.x,y:k.y}];g.e=m.e;g.frozen=m.f;
  if(S.tut&&S.tut.step==='pull'){g.e=0;g.frozen=1}} // the first lesson is the motion alone: any flick is a good one
// A resting finger sends no events, so the gap before a sample is capped: whatever moved, moved within about a frame.
// A flick is read two ways. Fast: the finger is coming back toward where it started quicker than FLICK_V (a little less is asked of
// a short pull). Soft: from where it was resting (the anchor) it has come back most of the way within a sixth of a second, however
// gently, which is how people naturally flick a short shot. Distance back is measured along the pull, so a flick that carries
// on past the start still counts. The anchor follows the finger while it pulls out or rests, and not while it is on its way back:
// easing back slowly to take power off is never a flick.
const minPull=()=>Math.max(15,pullMax()*.1);
function softFlick(g,t,x,y,frac,least){const a=g.anc;if(!a||a.d<=minPull()||t-a.t>170)return false;
  const back=a.d-((x-g.ox)*(a.x-g.ox)+(y-g.oy)*(a.y-g.oy))/a.d;if(back<Math.max(least,a.d*frac))return false;
  g.peak={x:a.x,y:a.y,d:a.d};if(!g.fast)g.fph=a.ph+clamp(t-a.t,0,16)*rateAt(clamp(a.d/pullMax(),0,1));return true} // the flick began as the finger left the anchor
function sample(t,x,y){const g=S.g,len=hyp(x-g.ox,y-g.oy),dt=clamp(t-g.last.t,4,20);g.x=x;g.y=y;
  if(g.t0){const T=t+g.off;if(T>g.pt){g.ph+=(T-g.pt)*rateAt(g.power);g.pt=T}} // the ring moves on, at the rate for the pull as it was
  if(g.phase==='aim'){const pk=g.peak,past=pk.d>0&&(x-g.ox)*(pk.x-g.ox)+(y-g.oy)*(pk.y-g.oy)<0,sl=past?-len:len,vr=(g.last.d-sl)/dt,need=FLICK_V*clamp(.55+.9*pk.d/pullMax(),.55,1);
    g.last={t,d:sl};
    if(g.anc&&g.anc.live&&len<g.anc.d-1.5){g.anc.t=t-dt;g.anc.ph=g.ph-dt*rateAt(g.power);g.anc.live=false} // a resting finger sends nothing: it left the anchor about now
    if(softFlick(g,t,x,y,.6,13))toSwing(g);
    else if(vr>need&&pk.d>minPull()){if(!g.fast)g.fph=g.ph;g.fast++;if(g.fast>=2||pk.d-sl>pk.d*.25)toSwing(g)}
    else{g.fast=0;g.peak={x,y,d:len};g.last.d=len;g.still=Math.abs(vr)<.05?(g.still||0)+1:0;
      if(!g.anc||len>=g.anc.d-1.5||g.still>=2||past)g.anc={t,x,y,d:len,ph:g.ph||0,live:true};aimFrom(g,x,y,len,t)}}
  else g.last={t,d:len};
  if(g.phase==='swing'){const pr=(x-g.top.x)*g.aim.x+(y-g.top.y)*g.aim.y,vp=g.lp==null?1:(pr-g.lp)/dt;g.lp=pr;g.trail.push({x,y});
    if(pr>=g.pull)commit(x,y);
    else if(vp<.05){if(++g.slow>=3){g.phase='aim';g.fast=0;g.frozen=null;g.fph=null;g.lp=null;g.anc=null;g.peak={x,y,d:len};g.last.d=len;aimFrom(g,x,y,len,t)}}else g.slow=0}}
function commit(x,y){const g=S.g,fx=x-g.top.x,fy=y-g.top.y,b=S.ball;
  const dev=Math.atan2(g.aim.x*fy-g.aim.y*fx,g.aim.x*fx+g.aim.y*fy);let aw=rotv(g.aim.x,g.aim.y,-cam.r),p=g.power*S.pk;
  if(S.club.putt){const d=markDist()||1;aw={x:(S.mark.x-b.x)/d,y:(S.mark.y-b.y)/d};p=1}
  S.fx.push({type:'swing',pts:g.trail.slice(),t0:performance.now()});
  const te=g.e,tf=g.frozen;endGesture();fire(p,aw,dev,{x:g.ox,y:g.oy},te,tf)}
function endGesture(){const g=S.g;if(!g)return;try{cv.releasePointerCapture(g.id)}catch(_){}S.g=null;S.idle0=performance.now();if(S.mode==='aim')S.mode='ready'}
function onUp(e){const g=S.g;if(!g||e.pointerId!==g.id)return;
  if(g.drag){endGesture();aimCam();if(onRange())rangeDragged();hud();return}
  if(g.phase==='aim'&&(g.fast>0||softFlick(g,e.timeStamp+0,g.x,g.y,.4,10)))toSwing(g); // lifting off part-way through a flick still swings
  if(g.phase==='swing'){const prog=(g.x-g.top.x)*g.aim.x+(g.y-g.top.y)*g.aim.y;if(prog>=g.pull*.35)return commit(g.x,g.y)}
  // let go without flicking: the commonest slip. The ghost thumb shows the flick again, and on the range the coach says so.
  const strong=g.power>.3;endGesture();if(strong){S.nudge=performance.now();if(onRange())rangeLift()}if(S.club.putt)hud();else if(strong&&!onRange())hintOn('Flick up to swing')}
cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',e=>{if(S.g&&e.pointerId===S.g.id)endGesture()});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

// p is power 0..1, aim a world direction, dev the flick's angle off the pull line,
// te the timing error in ms (early is negative) and tf how full the ring was (1 at the top)
function fire(p,aim,dev,at,te,tf){const b=S.ball,c=S.club;te=te||0;if(tf==null)tf=1;
  p=clamp(p,.03,1);S.prev={x:b.x,y:b.y};S.shot=null;$('hLast').hidden=true;if(!onRange())S.strokes++;S.hintShots++;
  if(S.hs&&!onRange()){const hs=S.hs,d=hyp(b.x-cur().pin.x,b.y-cur().pin.y);S.from={d,putt:!!c.putt};if(c.putt){if(!hs.p++)hs.fp=Math.max(1,Math.round(d*3))}else{hs.sw++;hs.tee=S.strokes===1&&S.lie==='tee'}}
  save();
  const wild=1+.7*reachFor(p),dead=DEAD/(1+.4*reachFor(p)),{onTime,q,shank}=judge(te,tf,p),ts=Math.sign(te);
  const ad=Math.abs(dev),kf=ad<=dead?0:Math.sign(dev)*clamp((ad-dead)/.35,0,1),over=Math.sign(dev)*Math.max(0,ad-dead),pure=onTime&&kf===0;
  b.club=c;b.putt=!!c.putt;b.z=0;b.zv=0;b.g0=groundAt(cur(),b.x,b.y);b.gone=false;b.onGreen=false;b.rollK=1;b.rocked=false;S.trail.length=0;b.dry={x:b.x,y:b.y};
  b.tree=cur().oaks.find(t=>hyp(b.x-t.x,b.y-t.y)<t.r)||null; // a ball already under an oak can be played out from beneath it
  let word,sub=onTime?'Perfect tempo':shank?(ts<0?'Far too early':'Far too late'):(q<.3?'A touch ':'')+(ts<0?'early':'late');
  if(c.putt){const pace=shank?.4:onTime?1:ts<0?.95-.27*q:1.05+.25*q,d=rotv(aim.x,aim.y,over*.6+(onTime?0:ts*(.01+q*.06))),v=Math.sqrt(2*MU.green*markDist()*p*pace);b.vx=d.x*v;b.vy=d.y*v;b.vz=0;b.air=false;b.spin=0;
    word=pure?'Pure roll':shank?'Stubbed':kf>0?'Pushed':kf<0?'Pulled':ts<0?'Left short':'Hit firm';sfx.putt();store('putts',(fetchKey('putts')||0)+1)}
  else{const fin=c.fin&&!onTime&&!shank?Math.min(1,.12+q*2.6):0,fat=fin&&ts<0,thin=fin&&ts>0; // how badly a finesse shot was missed, and which way
    const th=(shank?c.loft*.6:thin?lerp(c.loft,22,fin):c.loft)*DEG,carry=p*c.carry*lieMult(S.lie,c)*(shank?.4:fat?1-.5*fin:thin?1+.45*fin:pure?c.bomb||1:onTime?.985:.965-.28*Math.pow(q,1.3)),v=Math.sqrt(carry*G/Math.sin(2*th)),
      k=shank?0:clamp((kf*1.1+(onTime?0:ts*(.07+q*.8)))*wild,-1.5,1.5),d=rotv(aim.x,aim.y,shank?.6:(over*.33+(onTime?0:ts*(.01+q*.06)))*(1+.5*(wild-1))); // a shank squirts low and hard right
    b.vx=d.x*v*Math.cos(th);b.vy=d.y*v*Math.cos(th);b.vz=v*Math.sin(th);b.vz0=b.vz;b.s0=camT.s;b.air=true;b.spin=k*.16*G/Math.tan(th);if(thin)b.rollK=1+5*fin;
    if(c.style!=null)store('chips',(fetchKey('chips')||0)+1);
    word=pure?(c.bomb?'Bombed it':'Pured it'):shank?'Shank':fat?(fin>.6?'Chunked':'Fat'):thin?(fin>.6?'Bladed':'Thin'):Math.abs(k)<.06?'Straight':Math.abs(k)<.3?(k>0?'Fade':'Draw'):(k>0?'Slice':'Hook');shank?sfx.bad():sfx.hit(p);
    if(S.lie==='bunker'){burst(b.x,b.y,K.sand,22,10,7);sfx.sand()}else if(S.lie!=='tee'){burst(b.x,b.y,'#5a8d3d',8,6,5);if(S.lie==='fairway'&&p>.3)S.marks.push({t:'divot',x:b.x,y:b.y,a:Math.atan2(d.y,d.x)})}}
  if(pure&&!c.putt&&S.hs&&!onRange())S.hs.pure++;
  S.last={shank,q,early:ts<0,pure,putt:!!c.putt,te};b.pure=pure;if(pure)sfx.pure();
  if(at)S.fx.push({type:'word',text:word,sub,good:pure,bad:shank,x:at.x,y:at.y-44,t0:performance.now()});
  try{navigator.vibrate&&navigator.vibrate(pure?[10,40,10]:shank?60:25)}catch(_){}
  S.mode='flight';hud()}

// ───────── ball physics, fixed 240 Hz steps
const STEP=1/240;
function stepBall(dt){const b=S.ball,h=cur();
  if(b.air){const sp=hyp(b.vx,b.vy)||1,px=-b.vy/sp,py=b.vx/sp;
    b.vx+=(h.wind.x*KW+px*b.spin)*dt;b.vy+=(h.wind.y*KW+py*b.spin)*dt;b.vz-=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
    {const l=lieAt(h,b);if(l!=='water'&&l!=='woods'&&l!=='ob'&&l!=='void')b.dry={x:b.x,y:b.y}} // the last dry ground the ball passed over
    const gz=h.geo.elev?rise(h,b.x,b.y,b.g0):0,up=b.z-gz,hv=up*(b.vz0?.7+.65*clamp(.5-.5*b.vz/b.vz0,0,1):1);b.zv=hv<45?hv:45+(hv-45)*.12; // height over the ground below, drawn as a real shot climbs (low launch, late peak, steep fall) and compressed when very great
    for(const t of h.oaks)if(b.tree!==t&&up>2.5&&up<t.h&&hyp(b.x-t.x,b.y-t.y)<t.r*.85){b.tree=t;b.vx*=.12;b.vy*=.12;b.vz=Math.min(b.vz,0)-1;b.spin=0;b.rollK=.2;sfx.leaf();burst(b.x,b.y,'#4b8134',16,10,5);toast('Into the oak',1000)}
    if(b.z<=gz){b.z=0;b.zv=0;b.g0=groundAt(h,b.x,b.y);let lie=lieAt(h,b);
      if(lie==='water'||lie==='void')return hazard(lie);
      if(hyp(b.x-h.pin.x,b.y-h.pin.y)<CUP_R)return holed();
      if(lie==='creekbed'&&b.vz<-5&&!b.rocked){b.rocked=true;const a=(hashStr(Math.round(b.x*8)+':'+Math.round(b.y*8))%1000/1000-.5)*1.7,d=rotv(b.vx,b.vy,a);
        b.vx=d.x*.42;b.vy=d.y*.42;b.vz=Math.min(15,-b.vz*.5);b.z=.02;b.spin=0;b.rollK=.3;sfx.clack();burst(b.x,b.y,K.stone,8,7,5);return}
      const carry=hyp(b.x-S.prev.x,b.y-S.prev.y),v=Math.sqrt(2*muFor(lie,b)*carry*b.club.roll*ROLLX[lie]*b.rollK),s2=hyp(b.vx,b.vy)||1;
      b.vx=b.vx/s2*v;b.vy=b.vy/s2*v;b.vz=Math.min(9,-b.vz*.22)*(lie==='bunker'?0:lie==='fairway'||lie==='green'||lie==='fringe'||lie==='tee'?1:.5);b.air=false;
      if(lie==='bunker'){sfx.sand();burst(b.x,b.y,K.sand,18,8,6)}else{sfx.land();if(lie==='green'&&S.marks.length<40)S.marks.push({t:'pitch',x:b.x,y:b.y})}}
    return}
  if(b.z>0||b.vz>0){b.vz-=G*dt;b.z+=b.vz*dt;if(b.z<=0){b.z=0;b.vz=-b.vz*.4;if(b.vz<1.2)b.vz=0}}b.zv=b.z;
  const lie=lieAt(h,b),mu=muFor(lie,b);
  if((lie==='water'||lie==='void')&&b.z<=.01)return hazard(lie);
  if(lie!=='woods'&&lie!=='ob')b.dry={x:b.x,y:b.y};
  if(lie==='green'||lie==='fringe'){const a=slopeAt(h,b);b.vx+=a.x*dt;b.vy+=a.y*dt}
  const sp=hyp(b.vx,b.vy);
  if(b.z<.05&&sp<CAP_V&&hyp(b.x-h.pin.x,b.y-h.pin.y)<CUP_R)return holed();
  if(sp<=mu*dt){b.vx=b.vy=0;if(b.z<=0&&b.vz<=0)return atRest()}
  else{const k=(sp-mu*dt)/sp;b.vx*=k;b.vy*=k}
  b.x+=b.vx*dt;b.y+=b.vy*dt}
// Where to drop after water: a couple of yards back from the point of entry, on the line toward where the shot was played.
function dropSpot(){const h=cur(),d=S.ball.dry,p=S.prev,L=hyp(p.x-d.x,p.y-d.y);if(L<4)return p;const ux=(p.x-d.x)/L,uy=(p.y-d.y)/L;
  for(let k=2.5;k<Math.min(L,40);k+=2.5){const q={x:d.x+ux*k,y:d.y+uy*k},l=lieAt(h,q);if(l!=='water'&&l!=='woods'&&l!=='ob'&&l!=='bunker'&&l!=='void'&&l!=='snow'&&!h.geo.water.some(w=>inSh(w,q,2))&&!h.geo.void.some(w=>inSh(w,q,2)))return q}return p} // two clear yards from the bank
const shotLen=()=>({d:hyp(S.ball.x-S.prev.x,S.ball.y-S.prev.y),ft:S.club.putt});
function hazard(kind){const b=S.ball,fell=kind==='void',water=kind==='water'||fell,spot=water?dropSpot():S.prev,back=spot===S.prev;S.mode='wait';S.shot=back?null:shotLen();b.gone=true;
  if(onRange()){S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now(),water});water?sfx.splash():sfx.bad();return setTimeout(()=>rangeAfter(false,water?'In the water.':'Out of play.'),900)}
  S.strokes++;if(S.hs){S.hs.pen++;if(S.hs.tee){S.hs.tee=false;if(cur().par>3)S.hs.fw=0}}
  S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now(),water:water&&!fell});
  if(fell){sfx.clack();burst(b.x,b.y,'#c9a184',18,9,8)}else if(water){sfx.splash();burst(b.x,b.y,'#d8f4f0',22,9,9)}else sfx.bad();
  toast(fell?'Over the edge':water?'In the water':kind==='ob'?'Out of bounds':'Lost in the trees',(water&&!back?'Drop':'Replay')+' · +1',1900);hud();
  S.hzT=setTimeout(()=>{setBall(spot.x,spot.y);afterShot()},1500)} // startHole cancels this: a drop must not land in the next hole
function atRest(){const l=lieAt(cur(),S.ball);if(!onRange()&&(l==='woods'||l==='ob'))return hazard(l);S.shot=shotLen();noteRest(l);afterShot()} // on the range a wild one is just fetched back
function afterShot(){if(onRange())return rangeAfter(false);if(S.strokes>=maxScore()){toast('Picked up','Max '+maxScore(),1600);return finishHole(maxScore())}
  setupShot();
  S.mode='ready';aimCam();hud();save();if(inLive())liveShot(false)}
function holed(){const b=S.ball,h=cur();b.x=h.pin.x;b.y=h.pin.y;b.vx=b.vy=b.vz=b.z=0;b.air=false;b.gone=true;sfx.cup();burst(b.x,b.y,K.gold,26,5,11);burst(b.x,b.y,'#fff8e0',12,3,8);
  S.fx.push({type:'ring',x:b.x,y:b.y,t0:performance.now()});
  if(S.hs&&!onRange()&&S.from){S.hs.hf=Math.max(1,Math.round(S.from.d*3));S.hs.chip=S.from.putt?0:1;if(S.strokes<=h.par-2)S.hs.gir=1}
  finishHole(S.strokes)}
function finishHole(score){if(onRange()){S.mode='wait';return setTimeout(()=>rangeAfter(true),700)}S.mode='wait';S.round.scores[S.hi]=score;S.strokes=0;const n=S.round.ids.length,last=S.hi>=n-1,h=cur(),hs=S.hs||newHs();
  (S.round.log=S.round.log||[])[S.hi]={k:h.course.id+h.k,par:h.par,s:score,p:hs.p,pen:hs.pen,sw:hs.sw,pure:hs.pure,fw:hs.fw,gir:hs.gir,dr:hs.dr,fp:hs.fp,hf:hs.hf,chip:hs.chip};S.hs=null;
  store(saveKey(),{day:S.key,ids:S.round.ids,scores:S.round.scores,hi:Math.min(n-1,S.hi+1),strokes:0,bx:0,by:0,done:last,hs:null,log:S.round.log});
  if(last)logRound();
  if(last){if(S.round.type==='daily')bumpStreak();refresh()} // refresh posts the finished card to the clubhouse
  if(inLive())return void liveShot(true,score); // shot for shot: the hole's card waits until both are in
  if(inMatch())matchPush();
  setTimeout(()=>holeCard(score),900)}
function bumpStreak(){const m=fetchKey('meta')||{last:0,streak:0};if(m.last===S.day)return;m.streak=m.last===S.day-1?m.streak+1:1;m.last=S.day;store('meta',m)}

// ───────── frame loop
// A struck ball leaves fast and slows all the way: the same flight is played quicker off the club and gentler coming down.
// Only the pace changes; where it goes does not. A ball falling far below where it was struck (off a rim) is not held back.
const pace=b=>{if(!b.air||b.putt||!b.vz0)return 1;const k=1.06+.4*clamp(b.vz/b.vz0,-1,1);return b.z<0?lerp(k,1.15,clamp(-b.z/25,0,1)):k};
let last=0,acc=0,simT=0,hudTick=0,windDeg=1e9,Q=2,slowFrames=0;const LOCKQ=location.hash==='#dev';
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!cur())return;
  if(S.mode==='flight'){acc+=dt*pace(S.ball);while(acc>=STEP&&S.mode==='flight'){stepBall(STEP);acc-=STEP;simT+=STEP}
    const b=S.ball;S.trail.push({x:b.x,y:b.y,z:b.zv||0,t:simT});
    if((hudTick+=dt)>.1){hudTick=0;hudDist()}}else acc=0;
  // step the picture quality down on a phone that cannot hold thirty frames a second
  if(dt>.034)slowFrames++;else slowFrames=Math.max(0,slowFrames-2);if(slowFrames>70&&Q>0&&!LOCKQ){Q--;slowFrames=0;resize()}
  const g=S.g;if(g&&!g.drag&&g.t0&&g.phase==='aim'){const tk=Math.floor((phaseAt(g,performance.now())+TD)/(TU+TD));if(tk>g.tick){g.tick=tk;sfx.tick()}}
  updateCam(dt);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  drawScene(now);drawPreview(now);drawFlag(now);drawOpp(now);drawBall(dt);drawGesture(now);drawDemo(now);
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
  else if(c.style!=null)$('clubMax').textContent='to '+Math.round(reachOf(c)*S.pk)+' yd · '+(LIE[S.lie]||'Rough');
  else $('clubMax').textContent=Math.round(c.carry*m)+' yd · '+(LIE[S.lie]||'Rough')+(m<1?' −'+Math.round((1-m)*100)+'%':'')}
function hud(){const h=cur(),c=S.club,n=S.round.ids.length,ready=S.mode==='ready'||S.mode==='aim'||S.mode==='intro';
  $('hHole').textContent=`${S.round.type==='nine'?'No.':h.course.code} ${h.n} · Par ${h.par} · ${h.yards} yd`;$('hName').textContent=h.name;
  $('hStroke').textContent='Shot '+(S.mode==='flight'||S.mode==='wait'?Math.max(1,S.strokes):S.strokes+1)+(S.round.type==='nine'?'':' · hole '+(S.hi+1)+' of '+n)+(Math.abs(h.drop)>=60?' · '+(h.drop>0?'drops ':'climbs ')+Math.abs(h.drop).toLocaleString()+' ft':'');
  {const v=$('hVs'),live=inLive()&&!!MT.x;v.hidden=!live;$('app').classList.toggle('live',live);if(live)v.innerHTML=(S.hold?'':'<i>Your turn</i>')+esc(liveLine())}
  $('app').classList.toggle('tut',onRange());$('coach').hidden=!onRange();$('btnExit').hidden=onRange();S.fresh=!fetchKey('seen');S.fewPutts=(fetchKey('putts')||0)<2;
  $('btnPutt').classList.toggle('pulse',!!(onRange()&&S.tut&&S.tut.step==='mark'&&S.tut.moved&&S.pmode==='aim'));$('hWind').textContent=h.wind.sp;hudDist();hudLast();hudClub();
  $('clubPrev').disabled=S.ci<=0;$('clubNext').disabled=S.ci>=S.clubs.length-1;
  const pb=$('btnPutt');pb.hidden=!(c.putt&&ready);pb.textContent=S.pmode==='aim'?'Putt':'Aim';
  const cs=$('chipSeg'),chipping=c.style!=null&&ready&&!onRange();cs.hidden=!chipping;for(const x of cs.children)x.setAttribute('aria-pressed',String(+x.dataset.s===c.style));
  if(chipping&&(fetchKey('chips')||0)<3){hintOn('Run, Chip or Flop: pick the shot');S.chipHint=true;return}
  if(S.chipHint){S.chipHint=false;hintOff()}
  // the first few putts name the controls; after that the green is left to be read from its streaks. The range has its own card.
  if(c.putt&&ready&&!onRange()&&(fetchKey('putts')||0)<4)hintOn(S.pmode==='aim'?'Drag the marker, then press Putt':'Pull back, flick on gold');else if(c.putt||onRange())hintOff()}
let toastT=0;function toast(s,sub,ms,big){if(typeof sub==='number'){ms=sub;sub=''}const t=$('toast');t.textContent=s;t.classList.toggle('big',!!big);if(sub){const e=document.createElement('small');e.textContent=sub;t.appendChild(e)}
  t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),ms||1400)}
function hintOn(s){const e=$('hint');e.textContent=s;e.style.opacity=1}
function hintOff(){$('hint').style.opacity=0}
$('chipSeg').onclick=e=>{const b=e.target.closest('[data-s]');if(b){ac();setChip(+b.dataset.s)}};
$('clubPrev').onclick=()=>changeClub(-1);$('clubNext').onclick=()=>changeClub(1);
$('btnSound').onclick=()=>{S.muted=!S.muted;$('btnSound').setAttribute('aria-pressed',String(!S.muted));store('muted',S.muted);if(!S.muted)sfx.putt()};
$('btnHelp').onclick=()=>{if(S.mode==='ready')helpCard()};$('btnExit').onclick=()=>{if(S.mode==='ready')leaveCard()};
$('btnPutt').onclick=()=>{if(S.mode!=='ready'||!S.club.putt)return;S.pmode=S.pmode==='aim'?'stroke':'aim';S.idle0=performance.now();aimCam();if(onRange())rangePutt();hud()};
