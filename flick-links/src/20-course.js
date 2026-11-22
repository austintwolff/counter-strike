// ───────── the front nine
// Pars, Gold-tee yardages and handicaps follow Grey Rock's card. The hole shapes are this game's own.
// Positions are (s, o): yards from the tee along the routing, and yards right (+) or left (−) of it.
const COURSE={club:'Grey Rock',place:'Austin, Texas',tee:'Gold',holes:[
 {n:1,name:'Circle C',par:4,yd:423,hcp:7,route:[[0,0],[-10,150],[5,280],[55,410]],
  fair:[[.12,.91,[[0,12],[.35,20],[.62,18],[.85,14],[1,10]]]],green:[15,12.5,15,11],slope:[180,.35],
  bunk:[[246,-27,9,5.5,10],[274,-25,7,5,-15],[402,-19,8,5,70],[436,9,7,4.5,0]],pond:[[366,35,22,15,20]],
  oak:[[180,34,9],[300,41,10],[120,-36,8]],bloom:[[-8,24,9,6],[62,-42,12,7]],path:[[-6,-12],[80,-45],[230,-50],[380,-46],[432,-27]]},
 {n:2,name:'Slaughter Creek',par:5,yd:509,hcp:9,route:[[0,0],[15,170],[-5,330],[-55,440],[-70,509]],cor:[[0,58],[.5,68],[1,62]],
  fair:[[.1,.6,[[0,12],[.5,20],[1,15]]],[.725,.955,[[0,13],[.5,17],[1,10]]]],green:[14,12,-20,21],slope:[150,.4],
  creek:[{w:5.5,p:[[60,-78],[150,-54],[250,-45],[312,-27],[338,0],[354,28],[400,45],[470,41],[530,30],[575,8]]}],pond:[[356,35,14,10,40]],
  bunk:[[236,27,9,5.5,5],[272,27,8,5,-10],[493,-19,8,5,60],[526,-4,7,4.5,10]],
  oak:[[110,37,9],[200,-31,8],[422,-33,10]],rock:[[330,-14,2.6],[346,14,3],[410,52,3]],bloom:[[30,-34,12,7]],
  path:[[-6,14],[100,50],[240,54],[318,40]],bridge:[[338,-9,0,14]]},
 {n:3,name:'Stock Tank',par:3,yd:193,hcp:15,route:[[0,0],[5,100],[0,193]],cor:[[0,50],[.6,64],[1,58]],
  fair:[],pad:[[150,-36,20,13,20],[166,-8,13,10,0]],green:[13,17,0,33],slope:[200,.5],
  pond:[[104,11,43,35,0]],bunk:[[213,-6,5,9,0],[187,25,6,5,0]],
  rock:[[147,-6,3.2],[150,7,2.6],[146,20,3.4],[61,31,3],[58,-12,2.6]],oak:[[70,-45,9]],bloom:[[28,-32,12,8]],path:[[-6,-12],[60,-50],[150,-54],[200,-34]]},
 {n:4,name:'Escarpment',par:4,yd:446,hcp:3,route:[[0,0],[20,160],[0,270],[-90,370],[-150,430]],cor:[[0,56],[.55,68],[1,58]],
  fair:[[.11,.93,[[0,12],[.4,19],[.62,21],[.85,15],[1,10]]]],green:[15,13,10,41],slope:[210,.45],
  bunk:[[270,29,10,6,20],[302,28,8,5,0],[356,2,5,25,12],[432,-18,8,5,50],[441,18,7,5,-40]],
  rock:[[250,-35,7],[263,-45,5],[240,-47,6],[277,-37,4],[232,-38,3.5]],oak:[[224,-30,10],[292,-31,9],[150,36,8]],
  bloom:[[100,-42,14,8],[332,46,12,7]],path:[[-6,13],[120,48],[250,56],[340,54],[440,38]]},
 {n:5,name:'Live Oak',par:4,yd:380,hcp:13,route:[[0,0],[-5,130],[10,260],[0,380]],
  fair:[[.12,.92,[[0,12],[.4,22],[.62,24],[.8,17],[1,10]]]],green:[13,14,0,51],slope:[90,.4],
  oak:[[236,0,13],[150,39,8],[300,-37,9]],pond:[[352,37,30,17,-10],[390,31,14,12,0]],
  bunk:[[228,-33,9,5,0],[366,-20,8,5,60],[403,-8,7,4.5,0]],rock:[[328,24,3],[372,20,2.6]],bloom:[[40,31,10,6]],
  path:[[-6,-12],[90,-46],[240,-52],[360,-44],[392,-26]]},
 {n:6,name:'Cedar Brake',par:4,yd:445,hcp:5,route:[[0,0],[-30,150],[-25,280],[30,380],[75,430]],cor:[[0,56],[.5,60],[1,56]],
  fair:[[.12,.92,[[0,12],[.45,19],[.75,17],[1,10]]]],green:[14,12,-10,61],slope:[70,.45],
  pond:[[250,66,105,40,8],[455,25,24,21,0]],bunk:[[256,-27,9,5,0],[291,-26,7,5,0],[432,-18,8,5,40]],
  rock:[[200,27,3],[330,31,3.5],[421,23,3],[120,40,3]],oak:[[140,-41,9],[360,-38,9]],bloom:[[60,-40,12,7]],
  path:[[-6,-12],[110,-48],[280,-52],[400,-46],[440,-28]]},
 {n:7,name:'Long Draw',par:5,yd:542,hcp:1,route:[[0,0],[-20,150],[-10,280],[60,390],[70,480],[40,542]],cor:[[0,58],[.5,68],[1,62]],
  fair:[[.11,.513,[[0,12],[.5,19],[1,15]]],[.565,.738,[[0,14],[.5,17],[1,14]]],[.8,.955,[[0,13],[.6,15],[1,10]]]],green:[14,13,20,71],slope:[160,.5],
  creek:[{w:5,p:[[236,-88],[268,-46],[288,-8],[296,30],[320,55],[370,53],[408,27],[418,-8],[436,-47],[462,-88]]}],pond:[[506,-31,18,13,30]],
  bunk:[[230,27,9,5.5,0],[356,-27,8,5,0],[536,20,8,5,-50],[563,-4,7,4.5,0]],
  oak:[[120,35,9],[190,-35,9],[466,35,10]],rock:[[300,40,3],[414,10,2.6],[284,-22,2.8]],bloom:[[40,-36,12,7],[340,-46,12,6]],
  path:[[-6,14],[110,50],[230,52],[282,26]],bridge:[[292,10,0,14],[418,-14,0,14]]},
 {n:8,name:'Grey Rock',par:3,yd:187,hcp:17,route:[[0,0],[0,187]],cor:[[0,52],[.6,68],[1,66]],
  fair:[],pad:[[92,0,16,13,0]],green:[14,15,0,83],slope:[200,.4],
  pond:[[178,0,58,50,0]],isle:[[187,0,24,25,0]],bunk:[[203,6,4,7,0]],
  rock:[[116,-20,5],[118,-6,4],[117,10,5],[120,24,4],[130,-44,5],[135,46,4],[240,-10,5],[238,14,4],[226,40,3.5]],
  bridge:[[187,-39,90,30]],bloom:[[40,35,12,8],[60,-37,10,7]],path:[[-6,-12],[70,-52],[150,-62],[188,-55]]},
 {n:9,name:'Homestead',par:4,yd:317,hcp:11,route:[[0,0],[8,120],[-6,230],[-30,317]],
  fair:[[.13,.86,[[0,12],[.5,20],[1,16]]],[.918,.95,[[0,10],[1,9]]]],green:[14,13,0,91],slope:[180,.5],
  creek:[{w:5.5,p:[[205,76],[249,47],[271,22],[285,0],[295,-25],[301,-52],[311,-84]]}],
  bunk:[[205,-29,9,5.5,0],[215,31,8,5,0],[306,22,8,5,-50],[336,-6,8,4.5,0],[314,-23,6,4.5,50]],
  oak:[[130,-37,9],[150,39,9]],rock:[[277,12,2.6],[291,-12,3]],bloom:[[349,27,12,6],[352,-41,10,6]],
  path:[[-6,14],[100,48],[210,52],[270,40]],bridge:[[288,-6,0,14]],house:[378,-8]}]};

function buildHole(def,dayKey){
  const ctrl=def.route.map(([e,n])=>({x:e,y:-n})),k=def.yd/mkRoute(catmull(ctrl,3)).len;
  const r=mkRoute(catmull(ctrl.map(p=>({x:p.x*k,y:p.y*k})),3)),L=r.len,rng=mulberry32(def.n*9973+7);
  const P=(s,o)=>{const q=rAt(r,s);return{x:q.x-q.dy*o,y:q.y+q.dx*o,a:Math.atan2(q.dy,q.dx)}};
  const B=(v,seed,amp)=>{const p=P(v[0],v[1]);return blob(p.x,p.y,v[2],v[3],p.a+(v[4]||0)*DEG,def.n*100+seed,amp)};
  const end=rAt(r,L),ea=Math.atan2(end.dy,end.dx),g=def.green;
  const h={def,n:def.n,name:def.name,par:def.par,yards:def.yd,hcp:def.hcp,route:r,total:L,tee:P(0,0),axis:ea};
  h.green=blob(end.x,end.y,g[0],g[1],ea+g[2]*DEG,g[3],.07);h.fringe=grown(h.green,2.4);
  h.cor=ribbon(r,-30,L+34,def.cor||[[0,56],[.5,64],[1,60]]);
  h.fair=(def.fair||[]).map(f=>ribbon(r,f[0]*L,f[1]*L,f[2])).concat((def.pad||[]).map((v,i)=>B(v,40+i,.1)));
  h.bunkers=(def.bunk||[]).map((v,i)=>B(v,10+i,.16));
  h.water=(def.pond||[]).map((v,i)=>{const b=B(v,20+i,.13);b.pond=true;return b});
  for(const c of def.creek||[]){const cr=mkRoute(catmull(c.p.map(([s,o])=>P(s,o)),3)),n=Math.round(cr.len/22),prof=[];
    for(let i=0;i<=n;i++)prof.push([i/n,c.w/2*(.75+rng()*.6)]);const rb=ribbon(cr,0,cr.len,prof);rb.line=cr;h.water.push(rb)}
  h.isles=(def.isle||[]).map((v,i)=>B(v,30+i,.08));
  h.rocks=(def.rock||[]).map(([s,o,rr],i)=>({...P(s,o),r:rr,v:i%3}));
  h.oaks=(def.oak||[]).map(([s,o,rr],i)=>({...P(s,o),r:rr,h:rr*1.15+3,v:i%4,solid:true}));
  h.blooms=(def.bloom||[]).map((v,i)=>B(v,50+i,.2));
  h.bridges=(def.bridge||[]).map(([s,o,rot,len])=>{const p=P(s,o);return{x:p.x,y:p.y,a:p.a+rot*DEG,len}});
  h.house=def.house?P(def.house[0],def.house[1]):null;
  if(def.path){const pp=catmull(def.path.map(([s,o])=>P(s,o)),4);h.path=new Path2D();pp.forEach((q,i)=>i?h.path.lineTo(q.x,q.y):h.path.moveTo(q.x,q.y))}
  // the woods: live oaks and cedar outside the mown corridor
  const wf=profile(def.cor||[[0,56],[.5,64],[1,60]]);h.trees=[];
  for(let s=-52;s<L+62;s+=6.5)for(const side of[-1,1])for(let j=0,n=1+Math.floor(rng()*2.6);j<n;j++){
    const rr=lerp(4.2,9.5,rng()*rng()+.12),o=side*(wf(clamp((s+30)/(L+64),0,1))+rr*.55+rng()*rng()*70),p=P(s+rng()*6,o);
    if(inSh(h.cor,p,rr*.4)||h.water.some(w=>inSh(w,p,rr+2))||(h.house&&hyp(p.x-h.house.x,p.y-h.house.y)<46))continue;
    h.trees.push({x:p.x,y:p.y,r:rr,v:Math.floor(rng()*4),cedar:rng()<.34})}
  h.trees.sort((a,b)=>a.r-b.r);
  // conditions of the day: pin sheet and wind
  const dr=mulberry32(hashStr('fl-cond:'+dayKey+':'+def.n)),pins=[[-.42,.25],[.44,-.3],[.05,.5],[.3,.38],[-.3,-.42]],pn=pins[Math.floor(dr()*pins.length)];
  const pv=rotv(pn[0]*g[0],pn[1]*g[1],h.green.rot);h.pin={x:end.x+pv.x,y:end.y+pv.y};
  const wsp=Math.round(lerp(0,14,dr())),wa=dr()*TAU;h.wind={x:Math.cos(wa)*wsp,y:Math.sin(wa)*wsp,sp:wsp};
  const sa=ea+def.slope[0]*DEG,sm=def.slope[1];h.slope={x:Math.cos(sa)*sm,y:Math.sin(sa)*sm,m:sm};
  return h}
function lieAt(h,q){
  if(inSh(h.green,q))return'green';
  for(const b of h.bunkers)if(inSh(b,q))return'bunker';
  if(inSh(h.fringe,q))return'fringe';
  for(const i of h.isles)if(inSh(i,q))return'rough';
  for(const w of h.water)if(inSh(w,q))return'water';
  for(const k of h.rocks)if(hyp(q.x-k.x,q.y-k.y)<k.r*.8)return'rock';
  if(hyp(q.x-h.tee.x,q.y-h.tee.y)<6)return'tee';
  for(const f of h.fair)if(inSh(f,q))return'fairway';
  return inSh(h.cor,q)?'rough':'woods'}
