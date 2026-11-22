// ───────── the courses
// Pars, yardages and handicaps follow each club's card. The hole shapes are this game's own.
// Positions are (s, o): yards from the tee along the routing, and yards right (+) or left (−) of it.
// th is the look and feel of a course: what lies beyond the rough, ground colours, the mix and density of trees.
const COURSES=[{id:'gr',code:'GR',club:'Grey Rock',tee:'Gold',
 th:{out:'woods',floor:'#33512b',rough:'#4b7735',fair:'#69a547',stripe:1,cedar:.34,pine:0,dens:1,marker:'#e6cf8a',bloom:'bloom',blossom:0,bridge:'wood',cor:[[0,56],[.5,64],[1,60]]},holes:[
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
  fair:[[.13,.71,[[0,12],[.5,20],[1,16]]],[.8,.95,[[0,15],[.5,17],[1,9]]]],green:[14,13,0,91],slope:[180,.5],
  creek:[{w:5.5,p:[[160,76],[204,47],[226,22],[240,0],[250,-25],[256,-52],[266,-84]]}],
  bunk:[[190,-29,9,5.5,0],[200,31,8,5,0],[306,22,8,5,-50],[336,-6,8,4.5,0],[314,-23,6,4.5,50]],
  oak:[[130,-37,9],[150,39,9]],rock:[[232,12,2.6],[246,-12,3]],bloom:[[349,27,12,6],[352,-41,10,6]],
  path:[[-6,14],[100,48],[190,52],[226,40]],bridge:[[243,-6,0,14]],house:[378,-8]}]},

// Lost Pines (once Wolfdancer): open prairie ridges, loblolly pines, sprawling bunkers. Miss the rough and you are in native grass, not the woods.
{id:'lp',code:'LP',club:'Lost Pines',tee:'Black',
 th:{out:'native',floor:'#978a4b',rough:'#557f39',fair:'#6ba748',stripe:1,cedar:.08,pine:.8,dens:.3,marker:'#1c1c1c',bloom:'bloomGold',blossom:0,bridge:'wood',cor:[[0,58],[.5,68],[1,62]]},holes:[
 {n:1,name:'Loblolly',par:4,yd:420,hcp:17,route:[[0,0],[10,150],[0,290],[-40,420]],
  fair:[[.11,.92,[[0,13],[.4,22],[.7,19],[1,11]]]],green:[15,14,0,101],slope:[190,.4],
  bunk:[[252,30,12,7,10],[282,-28,9,6,0],[400,21,9,6,-50],[416,-22,8,5,50]],oak:[[190,-40,7],[330,41,7]],bloom:[[40,35,12,7]],
  path:[[-6,13],[110,52],[260,58],[400,44]]},
 {n:2,name:'Prairie Ridge',par:4,yd:431,hcp:3,route:[[0,0],[-15,160],[0,280],[70,390],[100,431]],
  fair:[[.11,.92,[[0,12],[.45,20],[.7,17],[1,10]]]],green:[14,13,10,102],slope:[70,.45],
  bunk:[[264,33,22,10,25],[304,37,14,8,40],[240,-30,9,6,0],[428,22,9,5,-40]],pond:[[406,-37,22,15,20]],
  oak:[[150,-41,7],[330,-37,7]],rock:[[384,-20,3]],path:[[-6,-13],[120,-52],[280,-56],[380,-60]]},
 {n:3,name:'Long Horizon',par:5,yd:603,hcp:1,route:[[0,0],[20,170],[10,330],[-50,470],[-40,603]],cor:[[0,62],[.5,72],[1,64]],
  fair:[[.1,.5,[[0,12],[.5,21],[1,16]]],[.585,.93,[[0,15],[.4,19],[1,10]]]],green:[15,13,-10,103],slope:[170,.5],
  bunk:[[322,-18,8,6,0],[326,0,8,6,0],[322,18,8,6,0],[339,-9,6,5,0],[339,9,6,5,0],[245,31,11,6,0],[470,-31,11,7,20],[589,22,9,6,-40],[601,-23,8,5,40]],
  pond:[[540,36,24,14,10]],oak:[[130,-41,7],[420,39,8]],bloom:[[60,40,13,7]],path:[[-6,-13],[150,-56],[300,-60]]},
 {n:4,name:"Wolf's Den",par:3,yd:233,hcp:5,route:[[0,0],[-5,120],[0,233]],cor:[[0,46],[.32,32],[.62,50],[1,60]],
  fair:[],pad:[[196,0,22,16,0],[176,-23,14,10,20]],green:[16,15,0,104],slope:[200,.45],
  bunk:[[214,-25,10,6,60],[221,25,9,6,-60],[253,0,6,10,0]],rock:[[110,31,4],[118,-29,3.5],[100,-35,3],[126,36,3]],oak:[[60,34,7]]},
 {n:5,name:'Bastrop Run',par:5,yd:594,hcp:7,route:[[0,0],[-20,170],[-10,320],[60,450],[130,560],[150,594]],cor:[[0,62],[.5,70],[1,64]],
  fair:[[.1,.93,[[0,12],[.3,21],[.55,18],[.8,17],[1,10]]]],green:[14,14,0,105],slope:[230,.4],
  pond:[[402,50,60,25,30]],bunk:[[256,-31,11,7,0],[286,31,10,6,0],[472,-29,12,7,10],[576,-23,9,5,50],[591,22,8,5,-40]],
  oak:[[150,39,7],[350,-41,8]],rock:[[350,30,3],[452,26,3]],path:[[-6,-13],[140,-54],[320,-58],[480,-52]]},
 {n:6,name:'Pine Hollow',par:3,yd:166,hcp:15,route:[[0,0],[4,90],[0,166]],cor:[[0,48],[.6,62],[1,60]],
  fair:[],pad:[[150,-27,16,11,10]],green:[13,13,0,106],slope:[40,.5],
  pond:[[120,22,40,34,-15]],bunk:[[184,-14,8,5,40],[167,-23,6,5,0]],rock:[[151,7,3],[147,19,2.8],[84,30,3]],bloom:[[30,-31,12,8]]},
 {n:7,name:'Short Grass',par:4,yd:337,hcp:13,route:[[0,0],[-10,120],[10,240],[0,337]],
  fair:[[.13,.9,[[0,12],[.45,24],[.75,22],[1,10]]]],green:[12,13,0,107],slope:[150,.5],
  bunk:[[236,0,9,7,0],[251,-7,6,5,30],[301,-25,10,6,50],[306,25,10,6,-50],[353,0,7,10,0],[200,35,10,6,0]],oak:[[150,-42,7]],bloom:[[60,40,12,7]]},
 {n:8,name:'McKinney Roughs',par:4,yd:483,hcp:11,route:[[0,0],[5,170],[-10,330],[-5,483]],cor:[[0,60],[.5,70],[1,62]],
  fair:[[.1,.585,[[0,13],[.5,22],[1,18]]],[.66,.93,[[0,17],[.5,19],[1,10]]]],green:[16,14,0,108],slope:[200,.35],
  creek:[{w:6,p:[[250,-84],[280,-41],[296,-6],[304,27],[330,57],[352,92]]}],bunk:[[230,31,11,7,0],[396,-29,10,6,0],[469,23,9,6,-50],[481,-23,8,5,50]],
  oak:[[140,-41,7],[380,39,7]],rock:[[290,-22,3],[310,40,3]],bridge:[[300,10,0,15]],path:[[-6,13],[130,54],[250,58],[294,32]]},
 {n:9,name:'Colorado Bend',par:4,yd:428,hcp:9,route:[[0,0],[20,150],[10,280],[-60,380],[-95,428]],
  fair:[[.11,.92,[[0,12],[.45,20],[.75,17],[1,10]]]],green:[14,13,0,109],slope:[270,.45],
  pond:[[300,-52,62,29,-20],[432,-35,20,16,0]],bunk:[[256,31,11,7,10],[291,33,9,6,0],[421,21,9,6,-40]],
  oak:[[140,41,7]],rock:[[240,-22,3],[352,-24,3]],house:[492,8]}]},

// Hancock: Austin's old nine-hole muni. Short, tight, shaded by big pecans and oaks, with Waller Creek wandering through it.
{id:'hk',code:'HK',club:'Hancock',tee:'Blue',
 th:{out:'woods',floor:'#2f4a28',rough:'#4f7a36',fair:'#6ea14b',stripe:.55,cedar:.1,pine:0,dens:1.2,marker:'#4f86e8',bloom:'bloomPink',blossom:0,bridge:'stone',cor:[[0,42],[.5,48],[1,46]]},holes:[
 {n:1,name:'Since 1899',par:3,yd:152,hcp:15,route:[[0,0],[3,80],[0,152]],
  fair:[],pad:[[88,0,14,10,0]],green:[11,11,0,201],slope:[190,.45],
  creek:[{w:6,p:[[98,-62],[108,-27],[118,0],[124,27],[122,62]]}],bunk:[[152,-17,6,5,0],[169,8,6,4,30]],oak:[[60,-30,9],[70,32,8]],bridge:[[119,4,0,13]]},
 {n:2,name:'Waller Creek',par:5,yd:462,hcp:1,route:[[0,0],[-10,150],[5,300],[30,400],[30,462]],
  fair:[[.1,.86,[[0,11],[.4,17],[.8,15],[1,12]]],[.925,.955,[[0,9],[1,8]]]],green:[11,10,0,202],slope:[160,.4],
  creek:[{w:6,p:[[40,62],[140,39],[250,37],[340,41],[400,31],[418,4],[424,-29],[442,-62]]}],bunk:[[250,-25,8,5,0],[471,-16,6,5,40]],
  oak:[[180,-28,10],[320,-30,9],[120,24,8]],rock:[[404,20,2.6],[428,-14,2.8]],bridge:[[419,-4,0,13]]},
 {n:3,name:'Red River',par:4,yd:357,hcp:5,route:[[0,0],[10,140],[0,240],[-50,320],[-70,357]],
  fair:[[.13,.92,[[0,11],[.45,17],[.7,16],[1,9]]]],green:[10,11,0,203],slope:[240,.5],
  oak:[[215,-24,12],[250,27,9],[130,-30,8]],pond:[[300,41,16,11,20]],bunk:[[346,14,7,5,-40],[363,-16,6,4,40]]},
 {n:4,name:'The Dell',par:3,yd:144,hcp:17,route:[[0,0],[-3,70],[0,144]],
  fair:[],pad:[[104,6,12,9,0]],green:[10,12,0,204],slope:[120,.55],
  pond:[[140,-27,13,10,10]],bunk:[[127,-4,5,8,0],[150,17,6,4,-30]],oak:[[80,-28,9],[95,30,9]],bloom:[[40,26,9,6]]},
 {n:5,name:'Short Four',par:4,yd:249,hcp:7,route:[[0,0],[5,120],[-5,249]],
  fair:[[.14,.76,[[0,11],[.5,16],[1,13]]]],pad:[[226,0,9,10,0]],green:[10,11,0,205],slope:[180,.5],
  creek:[{w:6,p:[[168,62],[196,30],[210,0],[214,-31],[204,-64]]}],bunk:[[251,-16,6,5,40],[263,10,6,4,0]],
  oak:[[120,-28,9],[150,27,9]],bridge:[[211,5,0,13]]},
 {n:6,name:'Pecan Row',par:4,yd:324,hcp:11,route:[[0,0],[-5,160],[5,324]],
  fair:[[.13,.92,[[0,11],[.5,17],[1,9]]]],green:[11,10,0,206],slope:[200,.4],
  oak:[[222,-22,11],[232,23,11],[110,28,8]],bunk:[[190,-24,8,5,0],[313,-15,6,5,50],[331,15,6,4,-40]]},
 {n:7,name:'Forty-First Street',par:4,yd:335,hcp:9,route:[[0,0],[-10,140],[0,230],[50,300],[70,335]],
  fair:[[.13,.92,[[0,11],[.45,17],[.7,15],[1,9]]]],green:[11,11,0,207],slope:[60,.5],
  pond:[[236,35,24,15,35]],bunk:[[210,-24,8,5,0],[329,-15,6,5,40]],oak:[[140,26,9],[280,-26,9]],rock:[[214,22,2.6]]},
 {n:8,name:'The Old Ditch',par:4,yd:346,hcp:3,route:[[0,0],[8,150],[-5,260],[-10,346]],
  fair:[[.13,.66,[[0,11],[.5,17],[1,13]]],[.79,.925,[[0,13],[1,9]]]],green:[11,10,0,208],slope:[100,.45],
  creek:[{w:6,p:[[30,-58],[120,-35],[200,-31],[236,-16],[252,4],[262,31],[300,41],[384,37]]}],bunk:[[336,-16,6,5,40]],
  oak:[[150,28,9],[300,-28,9]],rock:[[242,-10,2.6]],bridge:[[250,-3,0,13]]},
 {n:9,name:'Home',par:4,yd:264,hcp:13,route:[[0,0],[-5,130],[10,264]],
  fair:[[.14,.9,[[0,11],[.5,17],[1,10]]]],green:[11,11,0,209],slope:[180,.45],
  pond:[[220,41,18,12,10]],bunk:[[226,-18,8,5,30],[232,17,8,5,-30],[279,0,5,8,0]],oak:[[120,-27,9],[160,28,9]],house:[324,0]}]}];
// every hole of every course in one list; a round is a set of indexes into it
const ALL=[];for(const c of COURSES)c.holes.forEach(def=>ALL.push({c,def}));
const courseIds=id=>ALL.map((e,i)=>e.c.id===id?i:-1).filter(i=>i>=0);


function buildHole(def,course,dayKey){const th=course.th;
  const ctrl=def.route.map(([e,n])=>({x:e,y:-n})),k=def.yd/mkRoute(catmull(ctrl,3)).len;
  const r=mkRoute(catmull(ctrl.map(p=>({x:p.x*k,y:p.y*k})),3)),L=r.len,rng=mulberry32(def.n*9973+7);
  const P=(s,o)=>{const q=rAt(r,s);return{x:q.x-q.dy*o,y:q.y+q.dx*o,a:Math.atan2(q.dy,q.dx)}};
  const B=(v,seed,amp)=>{const p=P(v[0],v[1]);return blob(p.x,p.y,v[2],v[3],p.a+(v[4]||0)*DEG,def.n*100+seed,amp)};
  const end=rAt(r,L),ea=Math.atan2(end.dy,end.dx),g=def.green;
  const h={def,course,th,n:def.n,name:def.name,par:def.par,yards:def.yd,hcp:def.hcp,route:r,total:L,tee:P(0,0),axis:ea};
  h.green=blob(end.x,end.y,g[0],g[1],ea+g[2]*DEG,g[3],.07);h.fringe=grown(h.green,2.4);
  h.cor=ribbon(r,-30,L+34,def.cor||th.cor);
  h.fair=(def.fair||[]).map(f=>ribbon(r,f[0]*L,f[1]*L,f[2])).concat((def.pad||[]).map((v,i)=>B(v,40+i,.1)));
  h.bunkers=(def.bunk||[]).map((v,i)=>B(v,10+i,.16));
  h.water=(def.pond||[]).map((v,i)=>{const b=B(v,20+i,.13);b.pond=true;return b});
  for(const c of def.creek||[]){const cr=mkRoute(catmull(c.p.map(([s,o])=>P(s,o)),3)),n=Math.round(cr.len/22),prof=[];
    for(let i=0;i<=n;i++)prof.push([i/n,c.w/2*(.75+rng()*.6)]);const rb=ribbon(cr,0,cr.len,prof);rb.line=cr;h.water.push(rb)}
  h.isles=(def.isle||[]).map((v,i)=>B(v,30+i,.08));
  h.rocks=(def.rock||[]).map(([s,o,rr],i)=>({...P(s,o),r:rr,v:i%3}));
  h.blooms=(def.bloom||[]).map((v,i)=>B(v,50+i,.2));
  h.bridges=(def.bridge||[]).map(([s,o,rot,len])=>{const p=P(s,o);return{x:p.x,y:p.y,a:p.a+rot*DEG,len}});
  h.house=def.house?P(def.house[0],def.house[1]):null;
  if(def.path){const pp=catmull(def.path.map(([s,o])=>P(s,o)),4);h.path=new Path2D();pp.forEach((q,i)=>i?h.path.lineTo(q.x,q.y):h.path.moveTo(q.x,q.y));
    const c0=pp[Math.min(3,pp.length-2)],c1=pp[Math.min(4,pp.length-1)],ca=Math.atan2(c1.y-c0.y,c1.x-c0.x);h.cart={x:c0.x-Math.sin(ca)*2.6,y:c0.y+Math.cos(ca)*2.6,a:ca}}
  h.oaks=(def.oak||[]).map(([s,o,rr],i)=>({...P(s,o),r:rr,h:rr*1.15+3,v:i%4,solid:true,kind:th.pine>.5?'pine':'oak'}));
  // beyond the rough: woods on a parkland course, scattered pines over native grass on a prairie one
  const wf=profile(def.cor||th.cor);h.trees=[];
  for(let s=-52;s<L+62;s+=6.5)for(const side of[-1,1])for(let j=0,n=Math.floor(th.dens*(1.2+rng()*2.4)+rng());j<n;j++){
    const rr=lerp(4.2,9.5,rng()*rng()+.12),o=side*(wf(clamp((s+30)/(L+64),0,1))+rr*.55+rng()*rng()*70),p=P(s+rng()*6,o),u=rng();
    if(inSh(h.cor,p,rr*.4)||h.water.some(w=>inSh(w,p,rr+2))||(h.house&&hyp(p.x-h.house.x,p.y-h.house.y)<46))continue;
    const kind=u<th.pine?'pine':u<th.pine+th.cedar?'cedar':'oak';
    h.trees.push({x:p.x,y:p.y,r:rr,v:Math.floor(rng()*4),kind:kind==='oak'&&th.blossom&&(Math.abs(p.x*7+p.y*13)|0)%th.blossom===0?'blossom':kind})}
  h.trees.sort((a,b)=>a.r-b.r);
  // small things that make it a place: lily pads, reeds and ducks on ponds, pebbles on creek banks, a rake by each bunker, wildflowers
  const ar=mulberry32(def.n*4441+course.id.charCodeAt(0)*31+course.id.charCodeAt(1));h.lilies=[];h.reeds=[];h.ducks=[];h.pebbles=[];h.rakes=[];
  for(const w of h.water){if(w.pond){const n=w.poly.length,big=Math.max(w.rx,w.ry);
      for(let i=0,k=Math.round(3+big/6);i<k;i++){const q=w.poly[Math.floor(ar()*n)],f=lerp(.58,.9,ar());h.lilies.push({x:w.x+(q.x-w.x)*f,y:w.y+(q.y-w.y)*f,r:lerp(.7,1.4,ar()),a:ar()*TAU,fl:ar()<.35})}
      for(let i=0;i<n;i++)if(ar()<.22){const q=w.poly[i],a=Math.atan2(q.y-w.y,q.x-w.x);h.reeds.push({x:q.x+Math.cos(a)*.5,y:q.y+Math.sin(a)*.5,a,s:lerp(.8,1.4,ar())})}
      if(big>17)for(let i=0,k=1+(ar()<.5?1:0);i<k;i++)h.ducks.push({w,ph:ar()*TAU,f:lerp(.3,.55,ar()),dir:ar()<.5?1:-1})}
    else for(const q of w.c)for(const sd of[-1,1])if(ar()<.42)h.pebbles.push({x:q.x+q.nx*sd*(q.w+.2+ar()*.9),y:q.y+q.ny*sd*(q.w+.2+ar()*.9),r:lerp(.3,.85,ar())})}
  for(const b of h.bunkers){const q=b.poly[Math.floor(ar()*b.poly.length)],a=Math.atan2(q.y-b.y,q.x-b.x);h.rakes.push({x:q.x+Math.cos(a)*1.3,y:q.y+Math.sin(a)*1.3,a:a+1.2+ar()})}
  for(let i=0;i<4;i++){const sd=ar()<.5?-1:1,s=lerp(20,L-20,ar()),o=sd*(wf(clamp((s+30)/(L+64),0,1))*(th.out==='native'?lerp(1.08,1.5,ar()):lerp(.78,.95,ar())));const p=P(s,o);
    if(!h.water.some(w=>inSh(w,p,10))&&!h.bunkers.some(b=>inSh(b,p,8)))h.blooms.push(blob(p.x,p.y,lerp(6,11,ar()),lerp(3.5,6.5,ar()),ar()*TAU,def.n*100+70+i,.22))}
  // conditions of the day: pin sheet and wind
  const dr=mulberry32(hashStr('fl-cond:'+dayKey+':'+def.n)),pins=[[-.42,.25],[.44,-.3],[.05,.5],[.3,.38],[-.3,-.42]],pn=pins[Math.floor(dr()*pins.length)];
  const pv=rotv(pn[0]*g[0],pn[1]*g[1],h.green.rot);h.pin={x:end.x+pv.x,y:end.y+pv.y};
  const wsp=Math.round(lerp(0,14,dr())),wa=dr()*TAU;h.wind={x:Math.cos(wa)*wsp,y:Math.sin(wa)*wsp,sp:wsp};
  // the putting surface: a gentle overall tilt plus a few humps and hollows, fixed for each green
  const sa=ea+def.slope[0]*DEG,sm=def.slope[1]*.6;h.slope={x:Math.cos(sa)*sm,y:Math.sin(sa)*sm,m:sm};
  const fr=mulberry32(def.n*7717+3),gr=Math.min(g[0],g[1]);h.bumps=[];
  for(let i=0,n=3+Math.floor(fr()*2);i<n;i++){const a=fr()*TAU,d=Math.sqrt(fr())*gr*.85,sg=lerp(3.4,6.2,fr()),peak=lerp(.28,.72,fr())*(fr()<.5?-1:1);
    h.bumps.push({x:end.x+Math.cos(a)*d,y:end.y+Math.sin(a)*d,s:sg,a:peak*sg/.607})}
  return h}
// downhill pull on a rolling ball at a point, in yards per second squared, and the height potential behind it
function slopeAt(h,q){let x=h.slope.x,y=h.slope.y;for(const b of h.bumps){const dx=q.x-b.x,dy=q.y-b.y,e=b.a*Math.exp(-(dx*dx+dy*dy)/(2*b.s*b.s))/(b.s*b.s);x+=dx*e;y+=dy*e}return{x,y}}
function phiAt(h,q){let p=-(h.slope.x*(q.x-h.green.x)+h.slope.y*(q.y-h.green.y));for(const b of h.bumps){const dx=q.x-b.x,dy=q.y-b.y;p+=b.a*Math.exp(-(dx*dx+dy*dy)/(2*b.s*b.s))}return p}
function lieAt(h,q){
  if(inSh(h.green,q))return'green';
  for(const b of h.bunkers)if(inSh(b,q))return'bunker';
  if(inSh(h.fringe,q))return'fringe';
  for(const i of h.isles)if(inSh(i,q))return'rough';
  for(const w of h.water)if(inSh(w,q))return'water';
  for(const k of h.rocks)if(hyp(q.x-k.x,q.y-k.y)<k.r*.8)return'rock';
  if(hyp(q.x-h.tee.x,q.y-h.tee.y)<6)return'tee';
  for(const f of h.fair)if(inSh(f,q))return'fairway';
  return inSh(h.cor,q)?'rough':h.th.out}
