// ───────── basics
const $=id=>document.getElementById(id);
const cv=$('c'),MAIN=cv.getContext('2d');let ctx=MAIN; // drawing code uses ctx; scenery is drawn once into its own canvas by pointing ctx there
let W=1,H=1,DPR=1;
const TAU=Math.PI*2,DEG=Math.PI/180;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,hyp=Math.hypot;
const sum=a=>a.reduce((x,y)=>x+y,0);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rotv(x,y,a){const c=Math.cos(a),s=Math.sin(a);return{x:x*c-y*s,y:x*s+y*c}}
function angTo(a,b,t){const d=((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI;return a+d*t}

// ───────── scene palette (a Hill Country summer: bermuda, white sand, limestone, tea-coloured water)
const K={floor:'#33512b',rough:'#4b7735',cut:'#5a8d3d',fair:'#69a547',fringe:'#70b04d',green:'#7bc05a',tee:'#72ad4c',
  sand:'#f0e7cd',sandSh:'#8c7a52',water:'#1d6470',deep:'#103d49',shallow:'#63b3a6',bank:'#34351f',path:'#d8ceb4',
  stone:'#cfcabb',wood:'#8a6a43',cream:'#f4ecd6',gold:'#e6cf8a',claret:'#9c2a3c',ink:'#0b2a21'}; // ground colours come from each course's theme
const SUN={x:.62,y:.78}; // shadows fall this way in the world; the sun sits to the north-west

// ───────── textures and sprites, drawn once
function tex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c}
function softDot(g,x,y,r,rgb,a){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${rgb},${a})`);gr.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r)}
function wrapDot(g,w,h,x,y,r,rgb,a){for(const ox of[-w,0,w])for(const oy of[-h,0,h])if(x+ox+r>0&&x+ox-r<w&&y+oy+r>0&&y+oy-r<h)softDot(g,x+ox,y+oy,r,rgb,a)}
const TEX=(()=>{const r=mulberry32(4242),T={};
  T.mottle=tex(256,256,(g,w,h)=>{for(let i=0;i<110;i++)wrapDot(g,w,h,r()*w,r()*h,14+r()*40,r()<.52?'10,30,0':'235,240,150',.07+r()*.09)});
  T.far=tex(128,128,(g,w,h)=>{for(let i=0;i<300;i++)wrapDot(g,w,h,r()*w,r()*h,2+r()*4.5,r()<.55?'0,25,0':'240,250,170',.1+r()*.14)});
  T.grain=tex(128,128,(g,w,h)=>{for(let i=0;i<1500;i++){g.fillStyle=r()<.55?`rgba(0,30,0,${.1+r()*.2})`:`rgba(235,255,170,${.08+r()*.16})`;const s=.8+r()*1.6;g.fillRect(r()*w,r()*h,s,s*(1+r()*1.6))}});
  T.stripe=tex(8,1,g=>{g.fillStyle='#fff';g.fillRect(0,0,4,1);g.fillStyle='#000';g.fillRect(4,0,4,1)});
  T.rake=tex(64,64,(g,w,h)=>{g.lineWidth=1;for(let y=-8;y<h+8;y+=5){g.strokeStyle=`rgba(120,100,60,${.25+r()*.2})`;g.beginPath();for(let x=0;x<=w;x+=4)g.lineTo(x,y+Math.sin(x/w*TAU*2+y)*2.2);g.stroke()}});
  T.glint=tex(128,128,(g,w,h)=>{g.lineCap='round';for(let i=0;i<70;i++){const x=r()*w,y=r()*h,l=3+r()*9;g.strokeStyle=`rgba(225,250,245,${.12+r()*.35})`;g.lineWidth=.8+r()*1.3;
    for(const ox of[-w,0,w]){g.beginPath();g.moveTo(x+ox,y);g.quadraticCurveTo(x+ox+l/2,y-1.6,x+ox+l,y);g.stroke()}}});
  T.cloud=tex(256,256,(g,w,h)=>{for(let i=0;i<9;i++)wrapDot(g,w,h,r()*w,r()*h,46+r()*56,'20,34,60',.3+r()*.22)});
  // wildflowers: bluebonnets, Indian blanket, evening primrose
  const flowers=(a,b)=>tex(64,64,(g,w,h)=>{for(let i=0;i<150;i++){g.fillStyle=r()<.78?a[Math.floor(r()*a.length)]:b;g.beginPath();g.arc(r()*w,r()*h,.9+r()*1.5,0,TAU);g.fill()}});
  T.bloom=flowers(['#4a5fd0','#5b74e6','#6a58c8'],'#f5f5ff');T.bloomGold=flowers(['#f2b22c','#e8862a','#d8482a'],'#fff3b0');T.bloomPink=flowers(['#f0a6c4','#e684ae','#f6d0e0'],'#fffaf0');
  // tufts for rough seen up close, and straw for prairie grass
  T.tuft=tex(128,128,(g,w,h)=>{g.lineCap='round';for(let i=0;i<420;i++){const x=r()*w,y=r()*h,l=2+r()*4,a=-1.57+(r()-.5)*1.1;g.strokeStyle=r()<.55?`rgba(8,34,6,${.16+r()*.2})`:`rgba(214,240,150,${.1+r()*.16})`;g.lineWidth=.8+r()*.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}});
  T.straw=tex(128,128,(g,w,h)=>{g.lineCap='round';for(let i=0;i<520;i++){const x=r()*w,y=r()*h,l=3+r()*7,a=.5+(r()-.5)*.9;g.strokeStyle=r()<.5?`rgba(90,70,20,${.14+r()*.2})`:`rgba(250,232,160,${.14+r()*.22})`;g.lineWidth=.7+r()*.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}});
  return T})();
const PAT={};for(const k in TEX)PAT[k]=ctx.createPattern(TEX[k],'repeat');
// Texas trees seen from above. Each is a cluster of leafy clumps lit from the north-west; the recipe sets its character:
// n clumps, how far they spread, how big each is, how lacy the crown is, and how large the tree grows.
const TREES={
  liveoak:{pal:['#1b3117','#2e4f25','#456b31','#6c8c45'],n:15,sp:.62,r0:.26,r1:.16,size:1.2},   // broad, dark, sprawling
  juniper:{pal:['#13271c','#1f4029','#2f5a37','#467a4a'],n:7,sp:.38,r0:.34,r1:.18,size:.76},    // Ashe juniper, the Hill Country "cedar"
  elm:{pal:['#284620','#3f6c31','#5c9042','#8cb85c'],n:8,sp:.44,r0:.3,r1:.16,size:.9},          // cedar elm, upright and lighter
  pecan:{pal:['#2a471d','#487730','#6c9d3f','#a2c75f'],n:17,sp:.68,r0:.19,r1:.12,size:1.32},    // tall and airy, yellow-green
  postoak:{pal:['#22371a','#385826','#547833','#7c9848'],n:10,sp:.5,r0:.3,r1:.16,size:1},       // the savanna oak of the Lost Pines
  mesquite:{pal:['#36462b','#55693d','#788d57','#a8b882'],n:30,sp:.72,r0:.09,r1:.07,size:.85,lacy:.82},
  montcyp:{pal:['#14241a','#203a26','#30523a','#4f7450'],n:12,sp:.66,r0:.22,r1:.13,size:1.12},     // Monterey cypress: dark, flat-topped, windswept
  gorse:{pal:['#2a381c','#41531f','#5f7226','#e0c63a'],n:9,sp:.52,r0:.3,r1:.14,size:.4},
  // wild ground (the fantasy courses): sizes are 1 because these are placed at their true size from the photograph
  cottonwood:{pal:['#2c4a1e','#4d7d2c','#7aa83c','#b6d466'],n:16,sp:.66,r0:.2,r1:.13,size:1},   // Fremont cottonwood, along the canyon's creeks
  brush:{pal:['#3a3d2b','#55583b','#70734c','#96986a'],n:6,sp:.4,r0:.34,r1:.16,size:1},          // blackbrush, the grey scrub of the Tonto platform
  willow:{pal:['#3a5a22','#5c8a30','#8cb444','#c4dc74'],n:7,sp:.45,r0:.32,r1:.14,size:1}};       // alpine willow, knee high beside the water          // whin: a low dark bush, in yellow flower // low, wide and see-through
function treeSprite(kind,seed){const t=TREES[kind];return tex(128,128,g=>{const r=mulberry32(seed),R=50,pal=t.pal,cl=[];
  for(let i=0;i<t.n;i++){const a=r()*TAU,d=Math.sqrt(r())*R*t.sp;cl.push({x:64+Math.cos(a)*d,y:64+Math.sin(a)*d,r:R*(t.r0+r()*t.r1)})}
  const lay=(col,k,sh)=>{g.fillStyle=col;for(const c of cl){g.beginPath();g.arc(c.x+sh*c.r,c.y+sh*c.r,c.r*k,0,TAU);g.fill()}};
  g.globalAlpha=t.lacy||1;lay(pal[0],1,.06);lay(pal[1],.9,-.02);lay(pal[2],.6,-.24);g.globalAlpha=.8*(t.lacy||1);lay(pal[3],.27,-.44);
  g.globalCompositeOperation='source-atop';g.globalAlpha=.4;for(let i=0;i<260;i++){const a=r()*TAU,d=Math.sqrt(r())*R;g.fillStyle=r()<.5?pal[0]:pal[3];g.fillRect(64+Math.cos(a)*d,64+Math.sin(a)*d,2,2)}})}
// conifers: a ragged star of boughs. Loblolly pine is dark and blue; bald cypress, along the water, is feathery and bright.
function starSprite(seed,pal,soft,kk){return tex(128,128,g=>{const r=mulberry32(seed),n=(soft?13:9)+Math.floor(r()*4),rot=r()*TAU;
  const star=(R,k,col,dx)=>{g.fillStyle=col;g.beginPath();for(let i=0;i<n*2;i++){const a=rot+i/(n*2)*TAU,d=i%2?R*k*(.85+r()*.3):R*(.86+r()*.14);g.lineTo(64+dx+Math.cos(a)*d,64+dx+Math.sin(a)*d)}g.closePath();g.fill()};
  const k=kk||(soft?.74:.58);star(50,k,pal[0],3);star(47,k-.02,pal[1],0);star(36,k-.08,pal[2],-4);g.globalAlpha=.85;star(22,k-.13,pal[3],-8);g.globalAlpha=1;g.fillStyle=pal[4];g.beginPath();g.arc(54,54,4,0,TAU);g.fill()})}
TREES.pine={size:.9};TREES.cypress={size:.84};TREES.palm={size:.62};TREES.agave={size:1};
const SPR={agave:[81,82,83,84].map(x=>starSprite(x,['#2f4036','#4a6656','#74947e','#b4cbaa','#d9c264'],false,.26)),palm:[71,72,73,74].map(x=>starSprite(x,['#1c3a1c','#2c6a2e','#4a973f','#84c45c','#8a7a4a'],false,.3)),pine:[41,42,43,44].map(x=>starSprite(x,['#12281c','#1e4028','#2c5a34','#44774a','#5c8c58'])),cypress:[61,62,63,64].map(x=>starSprite(x,['#1b3a20','#2c6431','#479043','#7cc061','#a6dc84'],true)),
  shadow:tex(64,64,g=>softDot(g,32,32,32,'6,18,8',.62)),
  rock:[31,32,33].map(s=>tex(96,96,g=>{const r=mulberry32(s),n=7+Math.floor(r()*3),p=[];for(let i=0;i<n;i++){const a=i/n*TAU+r()*.5,d=28+r()*13;p.push([48+Math.cos(a)*d,48+Math.sin(a)*d])}
    const poly=(dx,dy)=>{g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x+dx,y+dy):g.moveTo(x+dx,y+dy));g.closePath()};
    poly(0,0);g.fillStyle='#8f8a7b';g.fill();g.save();g.clip();poly(-5,-6);g.fillStyle='#c9c4b4';g.fill();poly(-12,-14);g.fillStyle='#e6e2d6';g.fill();
    g.strokeStyle='rgba(60,55,45,.5)';g.lineWidth=1.5;for(let i=0;i<3;i++){g.beginPath();g.moveTo(20+r()*56,20+r()*56);g.lineTo(20+r()*56,20+r()*56);g.stroke()}g.restore()}))};
for(const k of['liveoak','juniper','elm','pecan','postoak','mesquite','montcyp','gorse','cottonwood','brush','willow'])SPR[k]=[11,12,13,14].map(x=>treeSprite(k,x+k.length*10));

// ───────── geometry (world units are yards; +x east, +y south)
function catmull(P,step){const out=[];for(let i=0;i<P.length-1;i++){const a=P[Math.max(0,i-1)],b=P[i],c=P[i+1],d=P[Math.min(P.length-1,i+2)],n=Math.max(2,Math.ceil(hyp(c.x-b.x,c.y-b.y)/step));
  for(let j=0;j<n;j++){const t=j/n,t2=t*t,t3=t2*t,f=(p0,p1,p2,p3)=>.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);out.push({x:f(a.x,b.x,c.x,d.x),y:f(a.y,b.y,c.y,d.y)})}}
  out.push({x:P[P.length-1].x,y:P[P.length-1].y});return out}
function mkRoute(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+hyp(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));return{pts,cum,len:cum[cum.length-1]}}
function rAt(r,s){const p=r.pts,c=r.cum;let i=1;if(s>0)while(i<p.length-1&&c[i]<s)i++;
  const a=p[i-1],b=p[i],l=(c[i]-c[i-1])||1,dx=(b.x-a.x)/l,dy=(b.y-a.y)/l,t=s-c[i-1];return{x:a.x+dx*t,y:a.y+dy*t,dx,dy}}
function rProj(r,q){const p=r.pts;let best=1e9,bs=0;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1,t=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/l2,0,1),d=hyp(q.x-a.x-dx*t,q.y-a.y-dy*t);
  if(d<best){best=d;bs=r.cum[i-1]+t*Math.sqrt(l2)}}return bs}
// holes, if any, are wound the other way from the outline, so an ordinary fill leaves them empty
function fin(sh,smooth){const path=new Path2D();let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of sh.poly){x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y)}
  for(const p of sh.holes?[sh.poly,...sh.holes]:[sh.poly]){
    if(smooth){const n=p.length,m=i=>({x:(p[i%n].x+p[(i+1)%n].x)/2,y:(p[i%n].y+p[(i+1)%n].y)/2}),s=m(0);path.moveTo(s.x,s.y);for(let i=1;i<=n;i++){const c=p[i%n],e=m(i);path.quadraticCurveTo(c.x,c.y,e.x,e.y)}}
    else{path.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)path.lineTo(p[i].x,p[i].y)}
    path.closePath()}
  sh.path=path;sh.bb=[x0,y0,x1,y1];return sh}
const profile=prof=>t=>{let i=1;while(i<prof.length-1&&prof[i][0]<t)i++;const a=prof[i-1],b=prof[i],u=clamp((t-a[0])/((b[0]-a[0])||1),0,1);return lerp(a[1],b[1],u*u*(3-2*u))};
function ribbon(r,s0,s1,prof){const L=s1-s0,wf=profile(prof),n=Math.max(2,Math.ceil(L/3)),c=[],poly=[];
  for(let i=0;i<=n;i++){const q=rAt(r,s0+L*i/n);c.push({x:q.x,y:q.y,nx:-q.dy,ny:q.dx,w:wf(i/n)})}
  for(const q of c)poly.push({x:q.x+q.nx*q.w,y:q.y+q.ny*q.w});
  const e=c[n],ea=Math.atan2(e.ny,e.nx);for(let k=1;k<8;k++){const a=ea-Math.PI*k/8;poly.push({x:e.x+Math.cos(a)*e.w,y:e.y+Math.sin(a)*e.w})}
  for(let i=n;i>=0;i--){const q=c[i];poly.push({x:q.x-q.nx*q.w,y:q.y-q.ny*q.w})}
  const b=c[0],ba=Math.atan2(-b.ny,-b.nx);for(let k=1;k<8;k++){const a=ba-Math.PI*k/8;poly.push({x:b.x+Math.cos(a)*b.w,y:b.y+Math.sin(a)*b.w})}
  return fin({kind:'rib',c,poly},true)}
const bm=(sh,th)=>{let m=1;for(const[k,a,p]of sh.wob)m+=a*Math.cos(k*th+p);return m};
function blobPoly(sh,g){const out=[],c=Math.cos(sh.rot),s=Math.sin(sh.rot);for(let i=0;i<72;i++){const th=i/72*TAU,m=bm(sh,th);let u=Math.cos(th)*sh.rx*m,v=Math.sin(th)*sh.ry*m;
  if(g){const l=hyp(u,v)||1;u*=1+g/l;v*=1+g/l}out.push({x:sh.x+u*c-v*s,y:sh.y+u*s+v*c})}return out}
function blob(x,y,rx,ry,rot,seed,amp=.12){const r=mulberry32(seed*7919+13),wob=[];for(let k=2;k<=5;k++)wob.push([k,amp*(r()*.8+.4)/(k-1),r()*TAU]);
  const sh={kind:'blob',x,y,rx,ry,rot,wob,R:Math.max(rx,ry)*(1+amp*2.4)};sh.poly=blobPoly(sh,0);return fin(sh,true)}
// a mapped outline, as a list of points. x, y is its centre and R the reach from it.
function polyShape(pts,straight,holes){const sh=fin(holes&&holes.length?{kind:'poly',poly:pts,holes}:{kind:'poly',poly:pts},!straight&&pts.length>6);let a=0,cx=0,cy=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length],c=p.x*q.y-q.x*p.y;a+=c;cx+=(p.x+q.x)*c;cy+=(p.y+q.y)*c}
  if(Math.abs(a)<1e-6){cx=pts[0].x;cy=pts[0].y}else{cx/=3*a;cy/=3*a}sh.x=cx;sh.y=cy;sh.area=Math.abs(a)/2;sh.R=Math.max(...pts.map(p=>hyp(p.x-cx,p.y-cy)));sh.rx=sh.ry=Math.sqrt(sh.area/Math.PI);sh.rot=0;return sh}
// Ramer-Douglas-Peucker: drop the points of a closed outline that sit within eps of the line through their neighbours
function simplifyRing(p,eps){const n=p.length;if(n<8)return p;let far=0,fd=0;for(let i=1;i<n;i++){const d=hyp(p[i].x-p[0].x,p[i].y-p[0].y);if(d>fd){fd=d;far=i}}
  const keep=new Uint8Array(n+1),q=p.concat([p[0]]),st=[[0,far],[far,n]];keep[0]=keep[far]=1;
  while(st.length){const[a,b]=st.pop();if(b-a<2)continue;const A=q[a],B=q[b],dx=B.x-A.x,dy=B.y-A.y,l=hyp(dx,dy)||1;let m=-1,md=eps;
    for(let i=a+1;i<b;i++){const d=Math.abs((q[i].x-A.x)*dy-(q[i].y-A.y)*dx)/l;if(d>md){md=d;m=i}}if(m>0){keep[m]=1;st.push([a,m],[m,b])}}
  return p.filter((_,i)=>keep[i])}
const ringArea=p=>{let a=0;for(let i=0;i<p.length;i++){const u=p[i],v=p[(i+1)%p.length];a+=u.x*v.y-v.x*u.y}return a/2};
const inRing=(p,q)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i].y>q.y)!==(p[j].y>q.y)&&q.x<(p[j].x-p[i].x)*(q.y-p[i].y)/(p[j].y-p[i].y)+p[i].x)c=!c;return c};
// Many overlapping or touching shapes become clean outlines of what they cover together: they are painted into a small
// picture and its edge is traced back out. box limits the area; the result is a list of {outer, holes}, in yards.
function mergeShapes(list,box){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const s of list){x0=Math.min(x0,s.bb[0]);y0=Math.min(y0,s.bb[1]);x1=Math.max(x1,s.bb[2]);y1=Math.max(y1,s.bb[3])}
  x0=Math.max(x0-3,box[0]);y0=Math.max(y0-3,box[1]);x1=Math.min(x1+3,box[0]+box[2]);y1=Math.min(y1+3,box[1]+box[3]);if(x1-x0<1||y1-y0<1)return[];
  const k=Math.min(2,Math.sqrt(1.5e6/((x1-x0)*(y1-y0)))),W=Math.ceil((x1-x0)*k),H=Math.ceil((y1-y0)*k);
  const d=tex(W,H,c=>{c.setTransform(k,0,0,k,-x0*k,-y0*k);c.fillStyle='#000';for(const s of list)c.fill(s.path)}).getContext('2d').getImageData(0,0,W,H).data;
  // marching squares over the picture's alpha, with one empty row and column all round so every outline closes
  const T=128,v=(i,j)=>i<0||j<0||i>=W||j>=H?0:d[(j*W+i)*4+3],key=(i,j,vert)=>((j+1)*(W+2)+i+1)*2+vert,adj=new Map(),pos=new Map(),f=(a,b)=>(T-a)/(b-a);
  const link=(k1,p1,k2,p2)=>{pos.set(k1,p1);pos.set(k2,p2);(adj.get(k1)||adj.set(k1,[]).get(k1)).push(k2);(adj.get(k2)||adj.set(k2,[]).get(k2)).push(k1)};
  for(let j=-1;j<H;j++){let a=v(-1,j),e=v(-1,j+1);for(let i=-1;i<W;i++){const b=v(i+1,j),c=v(i+1,j+1),ix=(a>=T?8:0)|(b>=T?4:0)|(c>=T?2:0)|(e>=T?1:0);
      if(ix&&ix!==15){const t=()=>[key(i,j,0),{x:i+f(a,b),y:j}],r=()=>[key(i+1,j,1),{x:i+1,y:j+f(b,c)}],bo=()=>[key(i,j+1,0),{x:i+f(e,c),y:j+1}],l=()=>[key(i,j,1),{x:i,y:j+f(a,e)}],go=(u,w)=>link(u[0],u[1],w[0],w[1]),mid=(a+b+c+e)/4>=T;
        if(ix===1||ix===14)go(l(),bo());else if(ix===2||ix===13)go(bo(),r());else if(ix===3||ix===12)go(l(),r());else if(ix===4||ix===11)go(t(),r());else if(ix===6||ix===9)go(t(),bo());else if(ix===7||ix===8)go(t(),l());
        else if((ix===5)===mid){go(t(),l());go(bo(),r())}else{go(t(),r());go(l(),bo())}}
      a=b;e=c}}
  const rings=[],seen=new Set();
  for(const start of adj.keys()){if(seen.has(start))continue;const ring=[];let prev=-1,cur=start;
    while(cur!==undefined&&!seen.has(cur)){seen.add(cur);const q=pos.get(cur);ring.push({x:x0+(q.x+.5)/k,y:y0+(q.y+.5)/k});const n=adj.get(cur),nx=n[0]!==prev?n[0]:n[1];prev=cur;cur=nx}
    const sr=simplifyRing(ring,.28);if(sr.length>=4&&Math.abs(ringArea(sr))>5)rings.push(sr)}
  // an outline inside an odd number of others is a hole. Outlines are wound one way and holes the other.
  rings.sort((a,b)=>Math.abs(ringArea(b))-Math.abs(ringArea(a)));const depth=rings.map((r,i)=>rings.slice(0,i).filter(o=>inRing(o,r[0])).length),out=[];
  rings.forEach((r,i)=>{const hole=depth[i]%2===1;if((ringArea(r)<0)!==hole)r.reverse();if(!hole)out.push({outer:r,holes:[],i})});
  rings.forEach((r,i)=>{if(depth[i]%2===1){const par=out.filter(o=>o.i<i&&inRing(o.outer,r[0])).pop();if(par)par.holes.push(r)}});
  return out}
function edgeDist(pts,q){let m=1e9;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1,t=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/l2,0,1);m=Math.min(m,hyp(q.x-a.x-dx*t,q.y-a.y-dy*t))}return m}
function grown(sh,g){return sh.kind==='poly'?{kind:'grown',of:sh,g,bb:sh.bb,path:sh.path}:fin({kind:'grown',of:sh,g,poly:blobPoly(sh,g)},true)}
function inSh(sh,q,g=0){
  if(sh.kind==='grown')return inSh(sh.of,q,sh.g+g);
  if(sh.kind==='poly'){const b=sh.bb;if(q.x<b[0]-g||q.x>b[2]+g||q.y<b[1]-g||q.y>b[3]+g)return false;const rs=sh.holes?[sh.poly,...sh.holes]:[sh.poly];let c=false;
    for(const p of rs)for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i].y>q.y)!==(p[j].y>q.y)&&q.x<(p[j].x-p[i].x)*(q.y-p[i].y)/(p[j].y-p[i].y)+p[i].x)c=!c;
    if(g===0)return c;let ed=1e9;for(const p of rs)ed=Math.min(ed,edgeDist(p,q));return g>0?c||ed<=g:c&&ed>=-g}
  if(sh.kind==='blob'){const dx=q.x-sh.x,dy=q.y-sh.y;if(Math.abs(dx)>sh.R+g||Math.abs(dy)>sh.R+g)return false;
    const c=Math.cos(sh.rot),s=Math.sin(sh.rot),u=dx*c+dy*s,v=-dx*s+dy*c,th=Math.atan2(v/sh.ry,u/sh.rx),m=bm(sh,th);return hyp(u,v)<=hyp(Math.cos(th)*sh.rx*m,Math.sin(th)*sh.ry*m)+g}
  const b=sh.bb;if(q.x<b[0]-g||q.x>b[2]+g||q.y<b[1]-g||q.y>b[3]+g)return false;
  const c=sh.c;for(let i=1;i<c.length;i++){const a=c[i-1],e=c[i],dx=e.x-a.x,dy=e.y-a.y,l2=dx*dx+dy*dy||1,t=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/l2,0,1);
    if(hyp(q.x-a.x-dx*t,q.y-a.y-dy*t)<=lerp(a.w,e.w,t)+g)return true}return false}
