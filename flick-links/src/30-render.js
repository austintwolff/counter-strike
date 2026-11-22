// ───────── drawing
let VR=[0,0,1,1],VIG=null;
function pat(name,scale,rot,tx,ty){const p=PAT[name];if(!p)return null;const c=Math.cos(rot||0)*scale,s=Math.sin(rot||0)*scale;
  try{p.setTransform(new DOMMatrix([c,s,-s,c,tx||0,ty||0]))}catch(e){return null}return p}
function texFill(path,name,alpha,scale,rot,tx,ty){if(alpha<.01||(Q<2&&name==='grain')||(Q<1&&(name==='far'||name==='cloud'||name==='rake')))return;const p=pat(name,scale,rot,tx,ty);if(!p)return;ctx.globalAlpha=alpha;ctx.fillStyle=p;
  if(path)ctx.fill(path);else ctx.fillRect(VR[0],VR[1],VR[2],VR[3]);ctx.globalAlpha=1}
function grass(path,base,tG,tF,m){ctx.fillStyle=base;if(path)ctx.fill(path);else ctx.fillRect(VR[0],VR[1],VR[2],VR[3]);
  texFill(path,'mottle',m,.35,.4);texFill(path,'far',.5*tF,.31);texFill(path,'grain',.55*tG,.0625)}
function inner(path,dx,dy,col,alpha,lw){ctx.save();ctx.clip(path);ctx.translate(dx,dy);ctx.strokeStyle=col;ctx.globalAlpha=alpha;ctx.lineWidth=lw;ctx.stroke(path);ctx.restore()}
function disc(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}
function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill()}
const vis=t=>t.x>VR[0]-14&&t.x<VR[0]+VR[2]+14&&t.y>VR[1]-14&&t.y<VR[1]+VR[3]+14;

function drawWorld(now){const h=cur(),z=cam.s,R=hyp(W,H)/z,tG=clamp((z-3)/8,0,1),tF=clamp(1.15-(z-2)/10,.2,1);VR=[cam.x-R,cam.y-R,2*R,2*R];
  ctx.save();ctx.translate(W/2,H*cam.ay);ctx.rotate(cam.r);ctx.scale(z,z);ctx.translate(-cam.x,-cam.y);ctx.lineJoin='round';ctx.lineCap='round';
  grass(null,K.floor,tG*.6,tF,.7);
  ctx.strokeStyle=K.rough;ctx.globalAlpha=.3;ctx.lineWidth=10;ctx.stroke(h.cor.path);ctx.globalAlpha=.55;ctx.lineWidth=4.5;ctx.stroke(h.cor.path);ctx.globalAlpha=1;
  grass(h.cor.path,K.rough,tG,tF,.75);
  for(const b of h.blooms){ctx.fillStyle='#3d6a3c';ctx.globalAlpha=.55;ctx.fill(b.path);ctx.globalAlpha=1;texFill(b.path,'bloom',.95,.085)}
  if(h.path){ctx.strokeStyle='rgba(20,30,10,.3)';ctx.lineWidth=3.1;ctx.stroke(h.path);ctx.strokeStyle=K.path;ctx.lineWidth=2.2;ctx.stroke(h.path)}
  // fairway: first cut, then cross-cut mowing stripes
  ctx.strokeStyle=K.cut;ctx.lineWidth=5.5;for(const f of h.fair)ctx.stroke(f.path);
  for(const f of h.fair){ctx.fillStyle=K.fair;ctx.fill(f.path);texFill(f.path,'stripe',.075,1.75,h.axis+Math.PI/4);texFill(f.path,'stripe',.06,1.75,h.axis-Math.PI/4);
    texFill(f.path,'mottle',.45,.35,1.3);texFill(f.path,'grain',.45*tG,.0625)}
  ctx.save();ctx.translate(h.tee.x,h.tee.y);ctx.rotate(h.tee.a);ctx.fillStyle=K.cut;rrect(-8,-7.5,15,15,2.5);ctx.fillStyle=K.tee;rrect(-7,-6.5,13,13,2);
  ctx.fillStyle='rgba(255,255,255,.07)';for(let x=-7;x<6;x+=3.25)ctx.fillRect(x,-6.5,1.6,13);
  for(const v of[-4.8,4.8]){ctx.fillStyle='rgba(10,30,10,.4)';disc(1.6+.25,v+.3,.6);ctx.fillStyle=K.gold;disc(1.6,v,.55)}ctx.restore();
  // water
  for(const w of h.water){ctx.strokeStyle=K.bank;ctx.lineWidth=w.pond?3:2.2;ctx.stroke(w.path);
    if(w.pond){if(!w.grad){const g=ctx.createRadialGradient(w.x,w.y,0,w.x,w.y,Math.max(w.rx,w.ry)*1.1);g.addColorStop(0,K.deep);g.addColorStop(.62,K.water);g.addColorStop(1,'#2f8686');w.grad=g}ctx.fillStyle=w.grad}
    else ctx.fillStyle=K.water;
    ctx.fill(w.path);inner(w.path,0,0,K.shallow,.3,w.pond?7:2.2);inner(w.path,SUN.x*1.5,SUN.y*1.5,'#031418',.45,2.6);
    texFill(w.path,'glint',.6,.2,.3,now*.0016*(1+h.wind.sp/8),Math.sin(now/2300)*3)}
  for(const i of h.isles){ctx.save();ctx.translate(SUN.x*1.6,SUN.y*1.6);ctx.strokeStyle='rgba(3,20,24,.55)';ctx.lineWidth=3.4;ctx.stroke(i.path);ctx.restore();
    ctx.strokeStyle='#6b6759';ctx.lineWidth=3.6;ctx.stroke(i.path);ctx.strokeStyle=K.stone;ctx.lineWidth=2.2;ctx.stroke(i.path);grass(i.path,K.rough,tG,tF,.75)}
  for(const b of h.bridges){const sv=rotv(SUN.x,SUN.y,-b.a),l=b.len;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);
    ctx.fillStyle='rgba(3,16,14,.4)';ctx.fillRect(-l/2+sv.x*1.4,-2+sv.y*1.4,l,4);ctx.fillStyle=K.wood;ctx.fillRect(-l/2,-1.9,l,3.8);
    ctx.fillStyle='rgba(40,25,10,.35)';for(let x=-l/2+.9;x<l/2;x+=1.1)ctx.fillRect(x,-1.9,.14,3.8);ctx.fillStyle='#5f4526';ctx.fillRect(-l/2,-1.95,l,.42);ctx.fillRect(-l/2,1.53,l,.42);ctx.restore()}
  for(const k of h.rocks)if(vis(k)){ctx.drawImage(SPR.shadow,k.x-k.r*1.3+SUN.x*k.r*.55,k.y-k.r*1.3+SUN.y*k.r*.55,k.r*2.6,k.r*2.6);ctx.drawImage(SPR.rock[k.v],k.x-k.r*1.25,k.y-k.r*1.25,k.r*2.5,k.r*2.5)}
  // green complex
  ctx.fillStyle=K.fringe;ctx.fill(h.fringe.path);texFill(h.fringe.path,'grain',.4*tG,.0625);
  for(const b of h.bunkers){ctx.strokeStyle='#2c4a1d';ctx.globalAlpha=.6;ctx.lineWidth=1.7;ctx.stroke(b.path);ctx.globalAlpha=1;ctx.fillStyle=K.sand;ctx.fill(b.path);
    texFill(b.path,'rake',.5*clamp(z/6,.3,1),.07,b.rot);inner(b.path,SUN.x,SUN.y,K.sandSh,.55,2.3);inner(b.path,-SUN.x*.8,-SUN.y*.8,'#fffdf2',.75,1.3)}
  const g=h.green;ctx.fillStyle=K.green;ctx.fill(g.path);
  if(!h.relief)h.relief=relief(h);
  ctx.save();ctx.clip(g.path);ctx.drawImage(h.relief.c,h.relief.x,h.relief.y,h.relief.s,h.relief.s);ctx.restore();
  texFill(g.path,'stripe',.04*clamp((z-1.5)/5,0,1),.42,g.rot+.5);texFill(g.path,'grain',.3*tG,.05);
  ctx.strokeStyle='rgba(20,60,20,.3)';ctx.lineWidth=.3;ctx.stroke(g.path);
  if(z>6)drawFlow(h,now);
  const cr=Math.max(.13,3.2/z);ctx.fillStyle='rgba(255,255,255,.85)';disc(h.pin.x,h.pin.y,cr*1.28);ctx.fillStyle='#07120b';disc(h.pin.x+cr*.08,h.pin.y+cr*.1,cr);
  for(const f of S.fx)if(f.type==='ring'){const a=(now-f.t0)/900;if(a<1){ctx.strokeStyle=f.water?'#d8f4f0':K.cream;ctx.globalAlpha=1-a;ctx.lineWidth=2/z;
    for(const m of[1,.55]){ctx.beginPath();ctx.arc(f.x,f.y,(4+a*26)*m/z,0,TAU);ctx.stroke()}ctx.globalAlpha=1}}
  if(h.house)drawHouse(h.house);
  // trees last: shadows, then canopies
  for(const t of h.trees)if(vis(t))ctx.drawImage(SPR.shadow,t.x-t.r*1.35+SUN.x*t.r*.75,t.y-t.r*1.35+SUN.y*t.r*.75,t.r*2.7,t.r*2.7);
  for(const t of h.oaks)ctx.drawImage(SPR.shadow,t.x-t.r*1.4+SUN.x*t.r*.8,t.y-t.r*1.4+SUN.y*t.r*.8,t.r*2.8,t.r*2.8);
  for(const t of h.trees)if(vis(t))ctx.drawImage(t.cedar?SPR.cedar[t.v%3]:SPR.oak[t.v],t.x-t.r*1.28,t.y-t.r*1.28,t.r*2.56,t.r*2.56);
  for(const t of h.oaks)ctx.drawImage(SPR.oak[t.v],t.x-t.r*1.28,t.y-t.r*1.28,t.r*2.56,t.r*2.56);
  ctx.globalCompositeOperation='multiply';texFill(null,'cloud',.4,2.1,.4,now*.004*(h.wind.x/7+.6),now*.004*(h.wind.y/7+.3));ctx.globalCompositeOperation='source-over';
  ctx.restore()}
function drawHouse(p){const sv=rotv(SUN.x,SUN.y,-p.a),lit=sv.x>0;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);
  ctx.fillStyle='#cdc4aa';ctx.fillRect(-17,-31,18,62);ctx.fillStyle='rgba(0,0,0,.09)';for(let y=-31;y<31;y+=4)ctx.fillRect(-17,y,18,.25);
  [[-9,-21,K.claret],[-9,-7,K.cream],[-9,7,K.claret],[-9,21,K.cream]].forEach(([x,y,c])=>{ctx.fillStyle='rgba(5,15,10,.3)';disc(x+sv.x*1.2,y+sv.y*1.2,3.3);ctx.fillStyle=c;disc(x,y,3.1);ctx.fillStyle='rgba(0,0,0,.3)';disc(x,y,.4)});
  const roofs=[[0,-39,34,78],[27,-54,24,36],[27,18,24,36]];
  ctx.fillStyle='rgba(5,15,10,.42)';for(const[x,y,w,hh]of roofs)ctx.fillRect(x+sv.x*5,y+sv.y*5,w,hh);
  for(const[x,y,w,hh]of roofs){ctx.fillStyle=lit?'#8b8478':'#6a645a';ctx.fillRect(x,y,w/2,hh);ctx.fillStyle=lit?'#6a645a':'#8b8478';ctx.fillRect(x+w/2,y,w/2,hh);
    ctx.strokeStyle='rgba(30,26,20,.55)';ctx.lineWidth=.5;ctx.strokeRect(x,y,w,hh);ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w/2,y+hh);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.05)';for(let yy=y+2;yy<y+hh;yy+=3)ctx.fillRect(x,yy,w,.3)}
  ctx.fillStyle='#b9b2a2';ctx.fillRect(12,-20,3.5,3.5);ctx.fillRect(12,14,3.5,3.5);ctx.restore()}
// Hillshade of the green: slopes that face the sun are lit, slopes that fall away from it are shaded.
function relief(h){const g=h.green,R=g.R+3,N=112;return{x:g.x-R,y:g.y-R,s:2*R,c:tex(N,N,x2=>{const im=x2.createImageData(N,N),d=im.data;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=slopeAt(h,{x:g.x-R+(i+.5)/N*2*R,y:g.y-R+(j+.5)/N*2*R}),v=-(a.x*SUN.x+a.y*SUN.y)*.62,k=(j*N+i)*4;
    if(v>0){d[k]=255;d[k+1]=255;d[k+2]=200}else{d[k]=0;d[k+1]=34;d[k+2]=16}d[k+3]=Math.min(165,Math.abs(v)*255)}x2.putImageData(im,0,0)})}}
// The read: at each point of a grid a short streak runs downhill, faster and warmer where the ground is steeper.
function drawFlow(h,now){const g=h.green,z=cam.s,sp=z>26?1:z>12?2:3,n=Math.ceil((g.R+2)/sp),al=clamp((z-6)/5,0,1)*(S.club.putt?1:.5),lw=clamp(1.7/z,.03,.15);
  ctx.lineCap='round';
  for(let i=-n;i<=n;i++)for(let j=-n;j<=n;j++){const q={x:g.x+i*sp,y:g.y+j*sp};
    if(q.x<VR[0]||q.x>VR[0]+VR[2]||q.y<VR[1]||q.y>VR[1]+VR[3]||!inSh(g,q,-.3))continue;
    const a=slopeAt(h,q),m=hyp(a.x,a.y);
    if(m<.05){ctx.globalAlpha=al*.4;ctx.fillStyle='#fffbe6';disc(q.x,q.y,lw);continue}
    const ph=(now/1000*(.3+m*1.5)+((i*7+j*13)&7)/8)%1,L=sp*clamp(.3+m*.85,.35,.95),ux=a.x/m,uy=a.y/m,t1=ph*L,t0=Math.max(0,t1-L*.42);
    ctx.strokeStyle=m>.8?'#ff9c7a':m>.45?K.gold:'#fffbe6';ctx.globalAlpha=al*Math.sin(Math.PI*ph)*clamp(.4+m*.6,0,1);ctx.lineWidth=lw*(1+m*.8);
    ctx.beginPath();ctx.moveTo(q.x+ux*t0,q.y+uy*t0);ctx.lineTo(q.x+ux*t1,q.y+uy*t1);ctx.stroke()}
  ctx.globalAlpha=1}
function txt(s,x,y,size,color,align='center'){ctx.font=`800 ${size}px "Playfair Display",Georgia,serif`;ctx.textAlign=align;ctx.textBaseline='middle';
  ctx.lineWidth=4;ctx.strokeStyle='rgba(6,22,17,.8)';ctx.lineJoin='round';ctx.strokeText(s,x,y);ctx.fillStyle=color;ctx.fillText(s,x,y)}
function drawPreview(now){const g=S.g,b=S.ball,c=S.club,h=cur();
  if(c.putt){if(S.mode!=='ready'&&S.mode!=='aim')return;const p0=toScreen(b.x,b.y),pm=toScreen(S.mark.x,S.mark.y),aim=S.pmode==='aim',pu=aim?1+Math.sin(now/260)*.12:1;
    ctx.lineCap='round';ctx.strokeStyle='rgba(6,22,17,.5)';ctx.lineWidth=5;ctx.setLineDash([1,10]);ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(pm.x,pm.y);ctx.stroke();
    ctx.strokeStyle=K.cream;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(pm.x,pm.y);ctx.stroke();ctx.setLineDash([]);
    for(const[col,lw]of[['rgba(6,22,17,.65)',5.5],[K.gold,2.6]]){ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(pm.x,pm.y,12*pu,0,TAU);
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){ctx.moveTo(pm.x+dx*7,pm.y+dy*7);ctx.lineTo(pm.x+dx*19*pu,pm.y+dy*19*pu)}ctx.stroke()}
    ctx.fillStyle=K.gold;disc(pm.x,pm.y,2.2);txt(Math.round(markDist()*3)+' ft',pm.x+26,pm.y,16,K.cream,'left');return}
  if(!g||g.drag||!g.aim||g.power<.04)return;
  const aw=rotv(g.aim.x,g.aim.y,-cam.r),carry=g.power*c.carry*lieMult(S.lie,c),ll=lieAt(h,{x:b.x+aw.x*carry,y:b.y+aw.y*carry}),total=carry*(1+c.roll*ROLLX[ll]);
  const p0=toScreen(b.x,b.y),p1=toScreen(b.x+aw.x*carry,b.y+aw.y*carry),p2=toScreen(b.x+aw.x*total,b.y+aw.y*total);
  const col=ll==='water'?'#bfeee6':ll==='woods'?'#ff9a8a':ll==='bunker'?K.sand:K.cream;
  ctx.lineCap='round';ctx.strokeStyle='rgba(6,22,17,.5)';ctx.lineWidth=5.5;ctx.setLineDash([1,11]);ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();
  ctx.strokeStyle=K.cream;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.6;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(6,22,17,.65)';ctx.lineWidth=5.5;ctx.beginPath();ctx.arc(p1.x,p1.y,9,0,TAU);ctx.stroke();ctx.strokeStyle=col===K.cream?K.gold:col;ctx.lineWidth=3;ctx.stroke();
  txt(Math.round(carry)+' yd'+(ll==='water'?' · water':ll==='woods'?' · trees':ll==='bunker'?' · sand':''),p1.x+16,p1.y,17,col,'left')}
function drawFlag(now){const h=cur(),p=toScreen(h.pin.x,h.pin.y),ph=clamp(18+cam.s*.9,24,58),near=hyp(S.ball.x-h.pin.x,S.ball.y-h.pin.y)<2&&!S.ball.gone;
  const ws=rotv(h.wind.x,h.wind.y,cam.r),dir=ws.x<0?-1:1,fl=ph*.5,wav=Math.sin(now/260)*2*(h.wind.sp/14+.25),sd=rotv(SUN.x,SUN.y,cam.r),sl=ph*.75;
  ctx.globalAlpha=near?.25:1;ctx.lineCap='round';
  ctx.strokeStyle='rgba(6,20,10,.35)';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+sd.x*sl,p.y+sd.y*sl);ctx.stroke();
  ctx.fillStyle='rgba(6,20,10,.3)';ctx.beginPath();ctx.moveTo(p.x+sd.x*sl,p.y+sd.y*sl);ctx.lineTo(p.x+sd.x*sl*.6+dir*fl*.7,p.y+sd.y*sl*.75);ctx.lineTo(p.x+sd.x*sl*.5,p.y+sd.y*sl*.5);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f6f1e2';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-ph);ctx.stroke();
  ctx.fillStyle='#c9283a';ctx.beginPath();ctx.moveTo(p.x,p.y-ph);ctx.lineTo(p.x+dir*fl,p.y-ph+fl*.3+wav);ctx.lineTo(p.x,p.y-ph+fl*.62);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.moveTo(p.x,p.y-ph);ctx.lineTo(p.x+dir*fl,p.y-ph+fl*.3+wav);ctx.lineTo(p.x,p.y-ph+fl*.2);ctx.closePath();ctx.fill();
  ctx.fillStyle=K.gold;disc(p.x,p.y-ph,1.8);ctx.globalAlpha=1}
function drawBall(dt){const b=S.ball,sd=rotv(SUN.x,SUN.y,cam.r);
  for(const q of S.parts){q.vz-=G*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z=Math.max(0,q.z+q.vz*dt);q.life-=dt;const p=toScreen(q.x,q.y);ctx.globalAlpha=clamp(q.life/q.max,0,1);ctx.fillStyle=q.col;disc(p.x,p.y-q.z*cam.s*.55,q.sz)}
  S.parts=S.parts.filter(q=>q.life>0);ctx.globalAlpha=1;
  if(b.gone)return;const rb=clamp(.11*cam.s,4.5,7.5);
  for(let i=1;i<S.trail.length;i++){const q=S.trail[i],p=toScreen(q.x,q.y);ctx.globalAlpha=i/S.trail.length*.5;ctx.fillStyle='#fff';disc(p.x,p.y-q.z*cam.s*.55,rb*.45*(1+q.z/45))}
  ctx.globalAlpha=1;const p=toScreen(b.x,b.y),lift=b.z*cam.s*.55,r=rb*(1+b.z/45),so=rb*.45+lift*.55,sr=rb*(1.5+b.z/60);
  ctx.globalAlpha=clamp(1-b.z/70,.35,1);ctx.drawImage(SPR.shadow,p.x+sd.x*so-sr,p.y+sd.y*so-sr,sr*2,sr*2);ctx.globalAlpha=1;
  const gr=ctx.createRadialGradient(p.x-r*.35,p.y-lift-r*.4,r*.1,p.x,p.y-lift,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.7,'#eef0ea');gr.addColorStop(1,'#b9c0b6');
  ctx.fillStyle=gr;disc(p.x,p.y-lift,r);ctx.strokeStyle='rgba(6,22,17,.5)';ctx.lineWidth=1;ctx.stroke()}
function drawGesture(now){const g=S.g;
  for(const f of S.fx){const a=(now-f.t0)/1500;if(a>=1)continue;
    if(f.type==='swing'&&f.pts.length>1){ctx.globalAlpha=Math.max(0,1-a*1.6)*.9;ctx.strokeStyle=K.gold;ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(f.pts[0].x,f.pts[0].y);for(const q of f.pts)ctx.lineTo(q.x,q.y);ctx.stroke();ctx.globalAlpha=1}
    if(f.type==='word'){const y=f.y-a*22;ctx.globalAlpha=1-a*a*a;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.strokeStyle='rgba(6,22,17,.85)';
      ctx.font='italic 700 32px "Playfair Display",Georgia,serif';ctx.lineWidth=5;ctx.strokeText(f.text,f.x,y);ctx.fillStyle=f.good?K.gold:K.cream;ctx.fillText(f.text,f.x,y);
      if(f.sub){ctx.font='400 12px Copperplate,"Marcellus SC",Georgia,serif';ctx.lineWidth=4;const t=f.sub.toUpperCase().split('').join('\u200a');ctx.strokeText(t,f.x,y+24);ctx.fillStyle=f.good?K.gold:K.cream;ctx.fillText(t,f.x,y+24)}
      ctx.globalAlpha=1}}
  if(!g||g.drag)return;const L=pullMax(),R=31,m=g.frozen!=null?{f:g.frozen,e:g.e}:meterAt(g,performance.now()),w=timingWindow(),hit=Math.abs(m.e)<=w,late=m.e>w;
  ctx.lineCap='round';ctx.strokeStyle='rgba(244,236,214,.28)';ctx.lineWidth=2;ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(g.ox,g.oy,L,0,TAU);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(244,236,214,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(g.ox,g.oy);ctx.lineTo(g.x,g.y);ctx.stroke();
  if(g.phase==='swing'&&g.trail.length>1){ctx.strokeStyle=K.gold;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(g.trail[0].x,g.trail[0].y);for(const q of g.trail)ctx.lineTo(q.x,q.y);ctx.stroke()}
  // the meter: two arcs climb from the bottom of the ring and meet at the gold notch on top
  ctx.lineCap='butt';ctx.strokeStyle='rgba(6,22,17,.72)';ctx.lineWidth=12;ctx.beginPath();ctx.arc(g.ox,g.oy,R,0,TAU);ctx.stroke();
  const ha=Math.max(.11,w/TU*Math.PI);ctx.strokeStyle=K.gold;ctx.globalAlpha=hit?1:.6;ctx.lineWidth=12;ctx.beginPath();ctx.arc(g.ox,g.oy,R,-Math.PI/2-ha,-Math.PI/2+ha);ctx.stroke();ctx.globalAlpha=1;
  if(m.f>.004){ctx.lineCap='round';ctx.strokeStyle=late?'#e0566a':hit?'#fff6c9':K.cream;ctx.lineWidth=7;const a0=Math.PI/2,sw=m.f*Math.PI;
    ctx.beginPath();ctx.arc(g.ox,g.oy,R,a0,a0+sw);ctx.stroke();ctx.beginPath();ctx.arc(g.ox,g.oy,R,a0,a0-sw,true);ctx.stroke()}
  if(hit){ctx.strokeStyle=K.gold;ctx.globalAlpha=.55;ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.ox,g.oy,R+11,0,TAU);ctx.stroke();ctx.globalAlpha=1}
  ctx.fillStyle='rgba(6,22,17,.45)';disc(g.ox,g.oy,R-7);ctx.fillStyle=K.gold;disc(g.ox,g.oy,3.5);
  ctx.fillStyle='rgba(244,236,214,.3)';disc(g.x,g.y,24);
  if(!S.club.putt&&g.power>.04)txt(Math.round(g.power*100)+'%',g.ox,g.oy-R-24,g.power>=1?28:24,g.power>=1?K.gold:K.cream)}
function drawVignette(){if(!VIG){VIG=ctx.createRadialGradient(W/2,H*.5,Math.min(W,H)*.35,W/2,H*.5,hyp(W,H)*.62);VIG.addColorStop(0,'rgba(8,24,14,0)');VIG.addColorStop(1,'rgba(8,24,14,.36)')}
  ctx.fillStyle=VIG;ctx.fillRect(0,0,W,H)}
function burst(x,y,col,n,sp,up){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=Math.random()*sp,l=.4+Math.random()*.5;S.parts.push({x,y,z:.2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:up*(.5+Math.random()),life:l,max:l,col,sz:1.2+Math.random()*1.8})}}
