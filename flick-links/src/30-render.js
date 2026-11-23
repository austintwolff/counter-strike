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

const seen=sh=>{const b=sh.bb;return b[2]>VR[0]&&b[0]<VR[0]+VR[2]&&b[3]>VR[1]&&b[1]<VR[1]+VR[3]};
const ROOFS=['#8b8478','#7c6f62','#9a8f7d','#6f7377','#94705a','#a39a8a','#5f6660'];
// Scenery. Everything here stands still, so it is drawn once and kept (see the scene cache below), not once a frame.
// RZ is the scale it is being drawn at, in CSS pixels per yard; the caller has set the transform and VR, the area to cover.
let RZ=1;
function drawScenery(h){const th=h.th,G=h.geo,z=RZ,now=0,tG=clamp((z-3)/8,0,1),tF=clamp(1.15-(z-2)/10,.2,1);ctx.lineJoin='round';ctx.lineCap='round';
  const native=th.out==='native';
  // the land: what lies outside the property, then the property itself
  if(G.boundary){grass(null,th.outer,tG*.5,tF,.6);ctx.strokeStyle=th.floor;ctx.globalAlpha=.5;ctx.lineWidth=5;ctx.stroke(G.boundary.path);ctx.globalAlpha=1;grass(G.boundary.path,th.floor,tG*.6,tF,native?.55:.7);if(native)texFill(G.boundary.path,'straw',.75,.09,.3)}
  else{grass(null,th.floor,tG*.6,tF,native?.55:.7);if(native)texFill(null,'straw',.75,.09,.3)}
  // streets and the neighbourhood
  for(const r of G.roads)if(seen2(r)){ctx.strokeStyle='#3d4038';ctx.lineWidth=r.w+1.6;ctx.stroke(r.path);ctx.strokeStyle='#5d5f58';ctx.lineWidth=r.w;ctx.stroke(r.path);
    if(r.w>=9&&z>1.6){ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(240,214,110,.7)';ctx.lineWidth=.35;ctx.stroke(r.path);ctx.setLineDash([])}}
  for(const s of G.parking)if(seen(s)){ctx.fillStyle='#62645d';ctx.fill(s.path);if(z>1.8){const b=s.bb;for(let x=b[0]+3;x<b[2]-3;x+=3.4)for(let y=b[1]+4;y<b[3]-4;y+=11){const q={x,y};if(((x*7+y*3)|0)%5<3&&inSh(s,q,-2.5)){ctx.fillStyle=['#d9d4c7','#7b2f33','#2f4a63','#1f1f1f','#b9b9b4'][((x*13+y*7)|0)%5];rrect(x-1.1,y-2.3,2.2,4.6,.5)}}}}
  // the rough: a mown band around every fairway, tee and green
  if(native){ctx.strokeStyle=th.rough;for(const[list,w]of[[G.fair,50],[G.green,56],[G.tee,24]]){ctx.lineWidth=w;for(const s of list)if(seen(s)){ctx.globalAlpha=.4;ctx.lineWidth=w+12;ctx.stroke(s.path);ctx.globalAlpha=1;ctx.lineWidth=w;ctx.stroke(s.path)}}
    for(const s of G.rough)if(seen(s))grass(s.path,th.rough,tG,tF,.75);
  }
  for(const s of G.woods)if(seen(s)){ctx.fillStyle=th.woods;ctx.fill(s.path);texFill(s.path,'mottle',.8,.35,.9)}
  for(const b of G.blooms)if(seen(b)){ctx.fillStyle='#3d6a3c';ctx.globalAlpha=.4;ctx.fill(b.path);ctx.globalAlpha=1;texFill(b.path,th.bloom,.95,.085,b.rot)}
  // dry creek beds and bare limestone
  for(const w of G.dry)if(seen(w)){ctx.strokeStyle='rgba(60,52,30,.5)';ctx.lineWidth=2;ctx.stroke(w.path);ctx.fillStyle='#cdc4a6';ctx.fill(w.path);texFill(w.path,'rake',.5,.09,.4);inner(w.path,SUN.x,SUN.y,'#7c7150',.5,1.6)}
  for(const s of G.rock)if(seen(s)){ctx.fillStyle='#d6d1c2';ctx.fill(s.path);texFill(s.path,'grain',.7,.11);inner(s.path,SUN.x*1.2,SUN.y*1.2,'#7d776a',.5,2.4);inner(s.path,-SUN.x,-SUN.y,'#ffffff',.5,1.4)}
  // paths: cart paths are pale concrete, park trails are crushed granite
  for(const w of G.paths)if(seen2(w)){ctx.strokeStyle='rgba(20,30,10,.28)';ctx.lineWidth=w.cart?3:2.5;ctx.stroke(w.path);ctx.strokeStyle=w.cart?K.path:'#c9b98f';ctx.lineWidth=w.cart?2.1:1.7;ctx.stroke(w.path)}
  // fairways: first cut, then cross-cut mowing stripes
  ctx.strokeStyle=K.cut;ctx.lineWidth=5.5;for(const f of G.fair)if(seen(f))ctx.stroke(f.path);
  for(const f of G.fair)if(seen(f)){ctx.fillStyle=th.fair;ctx.fill(f.path);texFill(f.path,'stripe',.075*th.stripe,1.75,h.axis+Math.PI/4);texFill(f.path,'stripe',.06*th.stripe,1.75,h.axis-Math.PI/4);
    texFill(f.path,'mottle',.45,.35,1.3);texFill(f.path,'grain',.45*tG,.0625)}
  for(const s of G.tee)if(seen(s)){ctx.strokeStyle=K.cut;ctx.lineWidth=2;ctx.stroke(s.path);ctx.fillStyle=K.tee;ctx.fill(s.path);texFill(s.path,'stripe',.06,.5,h.tee.a)}
  ctx.save();ctx.translate(h.tee.x,h.tee.y);ctx.rotate(h.tee.a);for(const v of[-4.2,4.2]){ctx.fillStyle='rgba(10,30,10,.4)';disc(.25,v+.3,.6);ctx.fillStyle=th.marker;disc(0,v,.55)}ctx.restore();
  // sports fields and pools beside the course
  for(const s of G.pitches)if(seen(s)){const hard=/tennis|basket|pickle/.test(s.sport);ctx.fillStyle=hard?'#3f7f6b':'#5f9f4a';ctx.fill(s.path);if(!hard)texFill(s.path,'stripe',.08,1.2,.2);ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=.35;ctx.stroke(s.path);
    ctx.beginPath();ctx.moveTo((s.bb[0]+s.bb[2])/2,s.y-s.ry*.5);ctx.lineTo((s.bb[0]+s.bb[2])/2,s.y+s.ry*.5);ctx.globalAlpha=.5;ctx.stroke();ctx.globalAlpha=1}
  for(const s of G.pool)if(seen(s)){ctx.fillStyle='#e6e1d2';ctx.strokeStyle='#e6e1d2';ctx.lineWidth=1.6;ctx.stroke(s.path);ctx.fillStyle='#4fb6d8';ctx.fill(s.path)}
  // water: a soft shade on the grass, a thin muddy rim, then the water with pale shallows along the bank
  ctx.strokeStyle='rgba(16,32,12,.2)';for(const w of G.water)if(seen(w)){ctx.lineWidth=w.pond?6:4;ctx.stroke(w.path)}
  for(const w of G.water)if(seen(w)){ctx.strokeStyle=K.bank;ctx.globalAlpha=.8;ctx.lineWidth=w.pond?1.5:1.1;ctx.stroke(w.path);ctx.globalAlpha=1;
    if(w.round){if(!w.grad){const g=ctx.createRadialGradient(w.x,w.y,0,w.x,w.y,w.R*1.05);g.addColorStop(0,K.deep);g.addColorStop(.62,K.water);g.addColorStop(1,'#2f8686');w.grad=g}ctx.fillStyle=w.grad}
    else ctx.fillStyle=K.water;
    ctx.fill(w.path);inner(w.path,0,0,K.shallow,.26,w.pond?7:2.6);inner(w.path,0,0,K.shallow,.2,w.pond?2.4:1);inner(w.path,SUN.x*1.5,SUN.y*1.5,'#031418',.38,2.4);
    texFill(w.path,'glint',.6,.2,.3,0,0);inner(w.path,0,0,'#eafffb',.2,.6);
    if(w.round&&w.area>150){const Rr=w.rx,sx=w.x-SUN.x*Rr*.3,sy=w.y-SUN.y*Rr*.3,gl=ctx.createRadialGradient(sx,sy,0,sx,sy,Rr*.7);gl.addColorStop(0,'rgba(255,250,215,.24)');gl.addColorStop(1,'rgba(255,250,215,0)');
      ctx.save();ctx.clip(w.path);ctx.globalAlpha=.8;ctx.fillStyle=gl;ctx.fillRect(sx-Rr,sy-Rr,2*Rr,2*Rr);ctx.restore()}}
  if(z>1.2)for(const l of G.lilies)if(vis(l)){ctx.fillStyle='#2f6a3a';ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.arc(l.x+.08,l.y+.1,l.r,l.a+.4,l.a+TAU);ctx.fill();
    ctx.fillStyle='#5a9f4e';ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.arc(l.x,l.y,l.r,l.a+.4,l.a+TAU);ctx.fill();ctx.fillStyle='rgba(215,245,160,.35)';disc(l.x-l.r*.25,l.y-l.r*.25,l.r*.38);
    if(l.fl){ctx.fillStyle='#fff3f7';disc(l.x+Math.cos(l.a)*l.r*.3,l.y+Math.sin(l.a)*l.r*.3,l.r*.34);ctx.fillStyle='#f4c84a';disc(l.x+Math.cos(l.a)*l.r*.3,l.y+Math.sin(l.a)*l.r*.3,l.r*.13)}}
  if(z>1.8){ctx.lineCap='round';for(const r of G.reeds)if(vis(r)){ctx.strokeStyle='#27481f';ctx.lineWidth=.22*r.s;ctx.beginPath();
      for(const da of[-.6,0,.6]){ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+Math.cos(r.a+da)*1.1*r.s,r.y+Math.sin(r.a+da)*1.1*r.s)}ctx.stroke();ctx.fillStyle='#6b4a2a';disc(r.x+Math.cos(r.a)*1.15*r.s,r.y+Math.sin(r.a)*1.15*r.s,.24*r.s)}
    for(const q of G.pebbles)if(vis(q)){ctx.fillStyle='rgba(20,24,16,.35)';disc(q.x+.12,q.y+.14,q.r);ctx.fillStyle='#bdb8a8';disc(q.x,q.y,q.r);ctx.fillStyle='#e4e0d3';disc(q.x-q.r*.25,q.y-q.r*.28,q.r*.5)}}
  for(const b of G.bridges)if(vis(b))drawBridge(b,b.wide>6?'road':th.bridge,now);
  // every green on the property, bunkers, then the one being played with its contours
  ctx.lineJoin='round';for(const s of G.green)if(seen(s)){ctx.strokeStyle=K.fringe;ctx.lineWidth=4.8;ctx.stroke(s.path);ctx.fillStyle=K.fringe;ctx.fill(s.path)}
  for(const b of G.bunker)if(seen(b)){ctx.strokeStyle='#2c4a1d';ctx.globalAlpha=.6;ctx.lineWidth=1.7;ctx.stroke(b.path);ctx.globalAlpha=1;ctx.fillStyle=K.sand;ctx.fill(b.path);
    texFill(b.path,'rake',.5*clamp(z/6,.3,1),.07,b.x*.1);inner(b.path,SUN.x,SUN.y,K.sandSh,.55,2.3);inner(b.path,-SUN.x*.8,-SUN.y*.8,'#fffdf2',.75,1.3)}
  if(z>2.2)for(const r of G.rakes)if(vis(r)){ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.a);ctx.lineCap='round';ctx.strokeStyle='rgba(10,20,8,.35)';ctx.lineWidth=.22;ctx.beginPath();ctx.moveTo(-1.3+.15,.18);ctx.lineTo(1.3+.15,.18);ctx.stroke();
    ctx.strokeStyle='#b08a55';ctx.lineWidth=.16;ctx.beginPath();ctx.moveTo(-1.3,0);ctx.lineTo(1.3,0);ctx.stroke();ctx.strokeStyle='#5d4a2c';ctx.lineWidth=.2;ctx.beginPath();ctx.moveTo(1.3,-.5);ctx.lineTo(1.3,.5);ctx.stroke();ctx.restore()}
  for(const s of G.green)if(seen(s)){ctx.fillStyle=K.green;ctx.fill(s.path);if(s!==h.green){texFill(s.path,'stripe',.04*clamp((z-1.5)/5,0,1),.42,s.x*.01);ctx.strokeStyle='rgba(20,60,20,.3)';ctx.lineWidth=.3;ctx.stroke(s.path)}}
  const g=h.green;if(!h.relief)h.relief=relief(h);
  ctx.save();ctx.clip(g.path);ctx.drawImage(h.relief.c,h.relief.x,h.relief.y,h.relief.s,h.relief.s);ctx.restore();
  texFill(g.path,'stripe',.04*clamp((z-1.5)/5,0,1),.42,h.axis+.5);texFill(g.path,'grain',.3*tG,.05);
  ctx.strokeStyle='rgba(20,60,20,.3)';ctx.lineWidth=.3;ctx.stroke(g.path);
  if(G.cart&&vis(G.cart))drawCart(G.cart.x,G.cart.y,G.cart.a);
  // roofs: a shadow, the footprint, then two slopes either side of the ridge, the one facing the sun lighter
  for(const s of G.building)if(seen(s)){const sv=rotv(SUN.x,SUN.y,-s.ax),lit=sv.y>0?-1:1,Rr=s.R+2;ctx.save();ctx.translate(SUN.x*2.6,SUN.y*2.6);ctx.fillStyle='rgba(5,15,10,.4)';ctx.fill(s.path);ctx.restore();
    ctx.fillStyle=ROOFS[Math.abs((s.x*3+s.y*7)|0)%ROOFS.length];ctx.fill(s.path);
    ctx.save();ctx.clip(s.path);ctx.translate(s.x,s.y);ctx.rotate(s.ax);ctx.fillStyle='rgba(255,244,214,.26)';ctx.fillRect(-Rr,lit>0?0:-Rr,2*Rr,Rr);ctx.fillStyle='rgba(10,8,4,.2)';ctx.fillRect(-Rr,lit>0?-Rr:0,2*Rr,Rr);
    if(z>3){ctx.fillStyle='rgba(0,0,0,.07)';for(let y=-Rr;y<Rr;y+=1.1)ctx.fillRect(-Rr,y,2*Rr,.18)}
    ctx.strokeStyle='rgba(30,24,16,.55)';ctx.lineWidth=.32;ctx.beginPath();ctx.moveTo(-Rr,0);ctx.lineTo(Rr,0);ctx.stroke();ctx.restore();
    ctx.strokeStyle='rgba(30,26,20,.6)';ctx.lineWidth=.4;ctx.lineJoin='miter';ctx.stroke(s.path);ctx.lineJoin='round'}
  // trees last: shadows, then canopies. Only the buckets in view are walked.
  const cells=[];for(let cx=Math.floor(VR[0]/120);cx<=Math.floor((VR[0]+VR[2])/120);cx++)for(let cy=Math.floor(VR[1]/120);cy<=Math.floor((VR[1]+VR[3])/120);cy++){const c=G.grid.get(cx+','+cy);if(c)cells.push(c)}
  for(const k of['trees','solid'])for(const c of cells)for(const t of c[k])ctx.drawImage(SPR.shadow,t.x-t.r*1.35+SUN.x*t.r*.75,t.y-t.r*1.35+SUN.y*t.r*.75,t.r*2.7,t.r*2.7);
  for(const k of['trees','solid'])for(const c of cells)for(const t of c[k])ctx.drawImage(SPR[t.kind][t.v],t.x-t.r*1.28,t.y-t.r*1.28,t.r*2.56,t.r*2.56);
  // cloud shadows lie still on the ground: a drifting layer cost a full-screen fill every frame
  if(Q>0)texFill(null,'cloud',.3,2.1,.4,0,0)}
// The hole stands in a haze. Near the line of play everything is sharp; further out the same ground goes soft and misty,
// and past the edge of what was built there is only the mist.
const mixHex=(a,b,t)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),A=p(a),B=p(b);return'rgb('+A.map((v,i)=>Math.round(lerp(v,B[i],t))).join()+')'};
function drawStatic(h){const B=h.geo.box;if(!h.fog){h.mist=mixHex(h.th.floor,'#dde4d0',.42);h.fog=fogOf(h)}
  ctx.fillStyle=h.mist;ctx.fillRect(VR[0],VR[1],VR[2],VR[3]);ctx.save();ctx.beginPath();ctx.rect(B[0],B[1],B[2],B[3]);ctx.clip();drawScenery(h);ctx.restore();
  ctx.drawImage(h.fog,B[0]-1,B[1]-1,B[2]+2,B[3]+2)}
function fogOf(h){const B=h.geo.box,u=4,w=Math.ceil(B[2]/u),hh=Math.ceil(B[3]/u),sm=t=>{t=clamp(t,0,1);return t*t*(3-2*t)},keepV=VR,keepZ=RZ;
  const world=x=>{x.setTransform(1/u,0,0,1/u,-B[0]/u,-B[1]/u);x.lineCap=x.lineJoin='round'};
  // rub a layer out along the line of play, leaving keep(d) of it at d yards from the line
  const rub=(x,d0,d1,keep)=>{const N=18;world(x);x.globalCompositeOperation='destination-out';x.strokeStyle='#000';x.beginPath();h.route.pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));
    let left=1;for(let i=0;i<N;i++){const t=keep(i===N-1?d0:lerp(d1,d0,(i+.5)/(N-1)));x.globalAlpha=left>0?clamp(1-t/left,0,1):0;left=Math.min(left,t);x.lineWidth=2*lerp(d1,d0,i/(N-1));x.stroke()}
    x.globalAlpha=1;x.globalCompositeOperation='source-over';x.setTransform(1,0,0,1,0,0)};
  // the ground out there, drawn small and passed down and back up through smaller pictures so it comes out blurred
  const small=tex(w,hh,()=>{});onCanvas(small,()=>{ctx.setTransform(1/u,0,0,1/u,-B[0]/u,-B[1]/u);VR=B;RZ=1;drawScenery(h)});VR=keepV;RZ=keepZ;
  const half=tex(Math.ceil(w/2),Math.ceil(hh/2),x=>x.drawImage(small,0,0,Math.ceil(w/2),Math.ceil(hh/2))),quarter=tex(Math.ceil(w/4),Math.ceil(hh/4),x=>x.drawImage(half,0,0,Math.ceil(w/4),Math.ceil(hh/4)));
  const soft=tex(Math.ceil(w/2),Math.ceil(hh/2),x=>{x.imageSmoothingQuality='high';x.drawImage(quarter,0,0,Math.ceil(w/2),Math.ceil(hh/2))});
  const mist=tex(w,hh,x=>{x.fillStyle=h.mist;x.fillRect(0,0,w,hh);rub(x,FADE0-14,FADE1+16,d=>.06+.94*sm((d-FADE0+14)/(FADE1-FADE0+30)))});
  return tex(w,hh,x=>{x.imageSmoothingQuality='high';x.drawImage(soft,0,0,w,hh);x.drawImage(mist,0,0);rub(x,FADE0,FADE0+46,d=>sm((d-FADE0)/46))})}
// The few things in the world that move, drawn every frame over the kept scenery.
function drawLive(h,now){const G=h.geo,z=cam.s;ctx.lineJoin='round';ctx.lineCap='round';
  // a fish rises now and then
  for(const w of G.water)if(w.pond&&w.area>150&&w.spots.length&&seen(w)){const T=5200,tt=now/T+Math.abs(w.x)*.01,k=Math.floor(tt),u=tt%1,q=w.spots[Math.floor(mulberry32(k*131+7)()*w.spots.length)];
    if(u<.5){ctx.strokeStyle='#eafffb';ctx.lineWidth=.16;for(const m of[1,.55]){ctx.globalAlpha=(1-u*2)*.5;ctx.beginPath();ctx.arc(q.x,q.y,(.4+u*9)*m,0,TAU);ctx.stroke()}ctx.globalAlpha=1}}
  // ducks idle round a spot out on the water, a slow turn every minute or so
  for(const d of G.ducks)if(seen(d.w)){const th=d.ph+now/d.T*TAU*d.dir,x=d.x+Math.cos(th)*d.rad,y=d.y+Math.sin(th)*d.rad*.7,hd=Math.atan2(Math.cos(th)*.7*d.dir,-Math.sin(th)*d.dir),sz=Math.max(.55,4.2/z);ctx.save();ctx.translate(x,y);ctx.rotate(hd);
    ctx.strokeStyle='rgba(234,255,251,.3)';ctx.lineWidth=sz*.12;ctx.beginPath();ctx.moveTo(-sz*.4,0);ctx.lineTo(-sz*2,sz*.7);ctx.moveTo(-sz*.4,0);ctx.lineTo(-sz*2,-sz*.7);ctx.stroke();
    ctx.fillStyle='rgba(3,20,24,.3)';ctx.beginPath();ctx.ellipse(sz*.12,sz*.16,sz,sz*.6,0,0,TAU);ctx.fill();ctx.fillStyle='#f4efe2';ctx.beginPath();ctx.ellipse(0,0,sz,sz*.58,0,0,TAU);ctx.fill();
    ctx.fillStyle='#d9d1bd';ctx.beginPath();ctx.ellipse(-sz*.25,0,sz*.55,sz*.36,0,0,TAU);ctx.fill();ctx.fillStyle='#2f5d3a';disc(sz*.85,0,sz*.36);ctx.fillStyle='#e9a23b';ctx.beginPath();ctx.ellipse(sz*1.25,0,sz*.2,sz*.12,0,0,TAU);ctx.fill();ctx.restore()}
  // the cup keeps its size on screen, so it is drawn here and not into a kept picture that may be magnified
  const cr=Math.max(.13,3.2/z);ctx.fillStyle='rgba(255,255,255,.85)';disc(h.pin.x,h.pin.y,cr*1.28);ctx.fillStyle='#07120b';disc(h.pin.x+cr*.08,h.pin.y+cr*.1,cr);
  if(z>6)drawFlow(h,now);
  for(const f of S.fx)if(f.type==='ring'){const a=(now-f.t0)/900;if(a<1){ctx.strokeStyle=f.water?'#d8f4f0':K.cream;ctx.globalAlpha=1-a;ctx.lineWidth=2/z;
    for(const m of[1,.55]){ctx.beginPath();ctx.arc(f.x,f.y,(4+a*26)*m/z,0,TAU);ctx.stroke()}ctx.globalAlpha=1}}
  for(const m of S.marks){if(m.t==='pitch'){ctx.fillStyle='rgba(20,50,20,.38)';disc(m.x,m.y,.13);ctx.fillStyle='rgba(255,255,220,.25)';disc(m.x-.05,m.y-.05,.06)}
    else{ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.a);ctx.fillStyle='#6f5a36';ctx.beginPath();ctx.ellipse(.5,0,.55,.2,0,0,TAU);ctx.fill();ctx.fillStyle='rgba(30,22,8,.4)';ctx.beginPath();ctx.ellipse(.42,.03,.38,.11,0,0,TAU);ctx.fill();ctx.restore()}}
  drawSky(now,h);}

// ───────── the scene cache
// Redrawing the whole course every frame is far too much for a phone. So the scenery is kept in two pictures:
//   far  — the whole hole, drawn once when the hole starts, used while the camera is moving
//   mid  — the green and its surrounds, sharp enough for putting, laid over the far picture when the camera moves up close
//   near — exactly what will be on screen once the camera arrives, drawn crisp ahead of time and used while it rests there
// Aiming, the swing ring and putting all happen with the camera at rest, so those frames cost one picture plus the ball.
const SC={far:null,farHole:null,box:null,mid:null,midHole:null,mbox:null,near:null,key:''};
function camOn(){ctx.translate(W/2,H*cam.ay);ctx.rotate(cam.r);ctx.scale(cam.s,cam.s);ctx.translate(-cam.x,-cam.y)}
function viewRect(){const R=hyp(W,H)/cam.s;return[cam.x-R,cam.y-R,2*R,2*R]}
function onCanvas(c,fn){const main=ctx;ctx=c.getContext('2d');try{fn()}finally{ctx=main}}
function ensureFar(h){if(SC.farHole===h)return;const[x0,y0,bw,bh]=h.geo.box,k=Math.min(2.4,Math.sqrt((Q>1?4.2e6:2.6e6)/(bw*bh)));SC.far=SC.far||document.createElement('canvas');SC.far.width=Math.ceil(bw*k);SC.far.height=Math.ceil(bh*k);
  onCanvas(SC.far,()=>{ctx.setTransform(k,0,0,k,-x0*k,-y0*k);VR=[x0,y0,bw,bh];RZ=k*.6;drawStatic(h)});SC.farHole=h;SC.box=[x0,y0,bw,bh]}
function ensureMid(h){if(SC.midHole===h)return;const g=h.green,R=g.R+34,x0=g.x-R,y0=g.y-R,k=Math.min(14,Math.sqrt(Q>1?2.2e6:1.2e6)/(2*R));SC.mid=SC.mid||document.createElement('canvas');SC.mid.width=SC.mid.height=Math.ceil(2*R*k);
  onCanvas(SC.mid,()=>{ctx.setTransform(k,0,0,k,-x0*k,-y0*k);VR=[x0,y0,2*R,2*R];RZ=k;drawStatic(h)});SC.midHole=h;SC.mbox=[x0,y0,2*R,2*R]}
const nearKey=(h,c)=>[h.course.id,h.n,c.x,c.y,c.s,c.r,c.ay,W,H,DPR,Q].join();
function ensureNear(h,c){const key=nearKey(h,c);if(SC.key===key)return;SC.near=SC.near||document.createElement('canvas');const was={...cam};Object.assign(cam,c);
  if(SC.near.width!==cv.width||SC.near.height!==cv.height){SC.near.width=cv.width;SC.near.height=cv.height}
  onCanvas(SC.near,()=>{ctx.setTransform(DPR,0,0,DPR,0,0);ctx.save();camOn();VR=viewRect();RZ=cam.s;drawStatic(h);ctx.restore();drawLight();drawVignette()});Object.assign(cam,was);SC.key=key}
const camAtRest=()=>cam.x===camT.x&&cam.y===camT.y&&cam.s===camT.s&&cam.r===camT.r&&cam.ay===camT.ay;
// Drawing the crisp picture takes a moment, long enough to make the swing ring stutter. So it is drawn for where the camera
// is heading as soon as that is known (the ball has just stopped, or a club was changed), never while a swing is being timed.
function drawScene(now){const h=cur(),rest=camAtRest();
  if(!S.g&&S.mode!=='flight'&&(S.mode!=='intro'||rest))ensureNear(h,camT);
  if(rest&&SC.key===nearKey(h,cam)){ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(SC.near,0,0);ctx.setTransform(DPR,0,0,DPR,0,0)}
  else{ensureFar(h);ctx.fillStyle=h.mist;ctx.fillRect(0,0,W,H);ctx.save();camOn();ctx.drawImage(SC.far,SC.box[0],SC.box[1],SC.box[2],SC.box[3]);
    if(cam.s>4.5){const g=h.green,R=hyp(W,H)/cam.s/2;if(hyp(cam.x-g.x,cam.y-g.y)<R+g.R+34){ensureMid(h);ctx.drawImage(SC.mid,SC.mbox[0],SC.mbox[1],SC.mbox[2],SC.mbox[3])}}
    ctx.restore();drawVignette()}
  ctx.save();camOn();VR=viewRect();drawLive(h,now);ctx.restore();drawWind(now,h)}
const seen2=seen;
// Bridges. Timber: an arched plank deck between stone footings, with posts and handrails, and piers under a long span.
// Stone: an old park bridge with a cobbled deck, parapet walls, capped pillars and the dark of an arch on the water either side.
function drawBridge(b,style,now){const sv=rotv(SUN.x,SUN.y,-b.a),l=b.len,hl=l/2,hw=style==='road'?b.wide/2+1.2:2.2,stone=style!=='wood';
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.lineCap='butt';
  // shadow on the water and banks, soft in two passes
  ctx.fillStyle='rgba(3,16,14,.2)';rrect(-hl+sv.x*2.2-.4,-hw+sv.y*2.2-.4,l+.8,hw*2+.8,.8);ctx.fillStyle='rgba(3,16,14,.3)';rrect(-hl+sv.x*1.5,-hw+sv.y*1.5,l,hw*2,.5);
  if(stone){
    for(const sd of[-1,1]){ctx.fillStyle='rgba(2,12,14,.55)';ctx.beginPath();ctx.ellipse(0,sd*(hw+.1),Math.min(3.2,hl*.5),1.1,0,sd>0?0:Math.PI,sd>0?Math.PI:TAU);ctx.fill()} // the arch
    const g=ctx.createLinearGradient(-hl,0,hl,0);g.addColorStop(0,'#9c978a');g.addColorStop(.5,'#c2bdaf');g.addColorStop(1,'#9c978a');ctx.fillStyle=style==='road'?'#5d5f58':g;rrect(-hl,-hw,l,hw*2,.4);if(style!=='road'){
    ctx.strokeStyle='rgba(60,56,48,.32)';ctx.lineWidth=.07;ctx.beginPath();for(let x=-hl+.6,i=0;x<hl;x+=.62,i++){ctx.moveTo(x,-hw+.6);ctx.lineTo(x,hw-.6);for(let y=-hw+.6+(i&1?.45:0);y<hw-.6;y+=.9){ctx.moveTo(x,y);ctx.lineTo(x+.62,y)}}ctx.stroke()} // cobbles
    for(const sd of[-1,1]){const y=sd*(hw-.3);ctx.fillStyle='rgba(20,18,12,.35)';ctx.fillRect(-hl+sv.x*.35,y-.3+sv.y*.35,l,.6);ctx.fillStyle='#d9d5c8';ctx.fillRect(-hl,y-.3,l,.6);ctx.fillStyle='#8d887b';ctx.fillRect(-hl,y+(sv.y>0?.14:-.3),l,.16);
      ctx.strokeStyle='rgba(60,56,48,.4)';ctx.lineWidth=.06;ctx.beginPath();for(let x=-hl+1;x<hl;x+=1.15){ctx.moveTo(x,y-.3);ctx.lineTo(x,y+.3)}ctx.stroke()} // parapets
    for(const ex of[-1,1])for(const sd of[-1,1]){const x=ex*(hl-.1),y=sd*(hw-.3);ctx.fillStyle='rgba(20,18,12,.4)';rrect(x-.55+sv.x*.5,y-.55+sv.y*.5,1.1,1.1,.15);ctx.fillStyle='#b9b4a6';rrect(x-.55,y-.55,1.1,1.1,.15);ctx.fillStyle='#e6e2d6';rrect(x-.38,y-.38,.76,.76,.12)}
  }else{
    if(l>20)for(let x=-hl+4.5;x<hl-3;x+=6.5)for(const sd of[-1,1]){const y=sd*(hw+.25);ctx.strokeStyle='rgba(234,255,251,.3)';ctx.lineWidth=.1;ctx.beginPath();ctx.arc(x,y,.7+.25*Math.sin(now/600+x),0,TAU);ctx.stroke();ctx.fillStyle='#3d2c18';disc(x,y,.38);ctx.fillStyle='#6b4f30';disc(x-.08,y-.08,.24)} // piers
    for(const ex of[-1,1]){const x=ex*(hl-.5);ctx.fillStyle='rgba(20,18,12,.35)';rrect(x-1+sv.x*.5,-hw-.5+sv.y*.5,2,hw*2+1,.5);ctx.fillStyle='#b6b1a3';rrect(x-1,-hw-.5,2,hw*2+1,.5);ctx.fillStyle='#dedacd';rrect(x-.8,-hw-.35,1.2,hw*2+.4,.4)} // stone footings
    const g=ctx.createLinearGradient(-hl,0,hl,0);g.addColorStop(0,'#6f5231');g.addColorStop(.5,'#b08a57');g.addColorStop(1,'#6f5231');ctx.fillStyle=g;ctx.fillRect(-hl+.6,-hw+.35,l-1.2,hw*2-.7); // the deck, lit along its crown
    for(let x=-hl+.6,i=0;x<hl-.6;x+=.5,i++){if(i%3===1){ctx.fillStyle='rgba(255,236,190,.09)';ctx.fillRect(x,-hw+.35,.5,hw*2-.7)}ctx.fillStyle='rgba(40,25,10,.4)';ctx.fillRect(x,-hw+.35,.07,hw*2-.7)}
    for(const sd of[-1,1]){const y=sd*(hw-.2);ctx.fillStyle='rgba(20,12,4,.38)';ctx.fillRect(-hl+.6+sv.x*.4,y-.17+sv.y*.4,l-1.2,.34);ctx.fillStyle='#5a4124';ctx.fillRect(-hl+.6,y-.17,l-1.2,.34);ctx.fillStyle='#8a6a43';ctx.fillRect(-hl+.6,y-.17,l-1.2,.12);
      for(let x=-hl+.9;x<=hl-.85;x+=Math.max(1.9,(l-1.8)/Math.round((l-1.8)/2.2))){ctx.fillStyle='rgba(20,12,4,.4)';rrect(x-.26+sv.x*.4,y-.26+sv.y*.4,.52,.52,.08);ctx.fillStyle='#4a3520';rrect(x-.26,y-.26,.52,.52,.08);ctx.fillStyle='#a17d50';rrect(x-.16,y-.16,.32,.32,.06)}} // rails and posts
  }
  ctx.restore()}
// a little cream golf cart with a green roof and a bag on the back
function drawCart(x,y,a){const sv=rotv(SUN.x,SUN.y,-a);ctx.save();ctx.translate(x,y);ctx.rotate(a);
  ctx.fillStyle='rgba(5,15,10,.35)';rrect(-1.5+sv.x*.6,-.85+sv.y*.6,3,1.7,.4);ctx.fillStyle='#22241f';for(const[wx,wy]of[[-1,-.85],[-1,.85],[1,-.85],[1,.85]])rrect(wx-.28,wy-.14,.56,.28,.1);
  ctx.fillStyle='#efe6cd';rrect(-1.5,-.78,3,1.56,.4);ctx.fillStyle='#5d4a2c';rrect(-1.45,-.5,.5,1,.15);ctx.fillStyle='#c9283a';disc(-1.2,-.25,.14);ctx.fillStyle='#e6cf8a';disc(-1.2,.25,.14);
  ctx.fillStyle='#14493a';rrect(-.75,-.72,1.75,1.44,.3);ctx.fillStyle='rgba(255,255,255,.14)';rrect(-.75,-.72,1.75,.5,.3);ctx.restore()}
// a small, distant flock across a corner of the widest views only, and specks carried on the wind
function drawSky(now,h){const z=cam.s,R=hyp(W,H)/z*.62,T=17000,k=Math.floor(now/T),u=(now%T)/T;
  if(u<.5&&z<2.6){const r=mulberry32(k*977+h.n*31),ang=r()*TAU,off=(r()<.5?-1:1)*R*(.52+r()*.16),t=u*4-1,ca=Math.cos(ang),sa=Math.sin(ang),bx=cam.x-sa*off+ca*t*R*1.2,by=cam.y+ca*off+sa*t*R*1.2,sz=3.2/z;
    ctx.lineCap='round';ctx.lineJoin='round';for(let i=0;i<3;i++){const x=bx-ca*i*sz*2.4-sa*(i===1?1:i===2?-1:0)*sz*1.6,y=by-sa*i*sz*2.4+ca*(i===1?1:i===2?-1:0)*sz*1.6,fl=Math.sin(now/95+i*1.7)*.55;
      for(const[ox,oy,col,lw]of[[SUN.x*sz*5,SUN.y*sz*5,'rgba(6,18,8,.22)',.34],[0,0,'#f6f1e2',.26]]){ctx.strokeStyle=col;ctx.lineWidth=sz*lw;ctx.beginPath();
        const wing=sgn=>{const wa=ang+sgn*(1.95+fl);return[x+ox+Math.cos(wa)*sz*1.25,y+oy+Math.sin(wa)*sz*1.25]},L=wing(1),Rr=wing(-1);ctx.moveTo(L[0],L[1]);ctx.lineTo(x+ox,y+oy);ctx.lineTo(Rr[0],Rr[1]);ctx.stroke()}}}
}
// The wind, as pale streaks drifting across the screen the way it blows as the camera sees it. Their pace follows the wind
// alone, not the zoom, and their drift is added up frame by frame so a turning camera or a new hole never makes them jump.
let windX=0,windY=0,windT=0;
function drawWind(now,h){const dt=Math.min(.05,(now-windT)/1000||0);windT=now;if(!h.wind.sp)return;const v=rotv(h.wind.x,h.wind.y,cam.r),sp=h.wind.sp,ux=v.x/sp,uy=v.y/sp,len=12+sp*1.5,L=Math.max(W,H)+80,mod=(a,m)=>(a%m+m)%m;
  windX+=v.x*8*dt;windY+=v.y*8*dt;ctx.strokeStyle='#fff8e0';ctx.lineWidth=1.2;ctx.lineCap='round';
  for(let i=0;i<14;i++){const x=mod(i*.618034*L+windX,L)-40,y=mod(i*.754878*L+windY,L)-40;ctx.globalAlpha=.14+.18*Math.abs(Math.sin(now/700+i));ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-ux*len,y-uy*len);ctx.stroke()}ctx.globalAlpha=1}
// late-afternoon light: warm from the sun's side, cool in the far corner
let GRADE=null;
function drawLight(){if(Q<2)return;if(!GRADE){GRADE=ctx.createLinearGradient(0,0,W,H);GRADE.addColorStop(0,'rgba(255,216,150,.5)');GRADE.addColorStop(.55,'rgba(255,236,200,.08)');GRADE.addColorStop(1,'rgba(40,70,120,.42)')}
  ctx.globalCompositeOperation='soft-light';ctx.fillStyle=GRADE;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
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
function relief(h){const g=h.green,R=g.R+3,N=128;return{x:g.x-R,y:g.y-R,s:2*R,c:tex(N,N,x2=>{const im=x2.createImageData(N,N),d=im.data;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const a=slopeAt(h,{x:g.x-R+(i+.5)/N*2*R,y:g.y-R+(j+.5)/N*2*R}),v=-(a.x*SUN.x+a.y*SUN.y)*.62,k=(j*N+i)*4;
    if(v>0){d[k]=255;d[k+1]=255;d[k+2]=200}else{d[k]=0;d[k+1]=34;d[k+2]=16}d[k+3]=Math.min(165,Math.abs(v)*255)}x2.putImageData(im,0,0)})}}
// The read. From each point of a grid a line runs down the fall line, curving as the ground does.
// Its pace is the sideways drift a rolling ball would pick up there: still on flat ground, quick on a slope.
function drawFlow(h,now){const g=h.green,z=cam.s,putting=S.club.putt,sp=z>26?1:z>12?2:3,n=Math.ceil((g.R+2)/sp),al=clamp((z-6)/5,0,1)*(putting?1:.5),lw=clamp(1.7/z,.03,.15),LIFE=1.7,K=7,PACE=2.3;
  if(putting&&z>10){ctx.save();ctx.clip(g.path);ctx.strokeStyle='#fffbe6';ctx.globalAlpha=.07;ctx.lineWidth=clamp(1/z,.02,.08);ctx.beginPath(); // one-yard squares for scale
    for(let i=-Math.ceil(g.R);i<=g.R;i++){ctx.moveTo(g.x+i,g.y-g.R);ctx.lineTo(g.x+i,g.y+g.R);ctx.moveTo(g.x-g.R,g.y+i);ctx.lineTo(g.x+g.R,g.y+i)}ctx.stroke();ctx.restore()}
  ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=-n;i<=n;i++)for(let j=-n;j<=n;j++){const q={x:g.x+i*sp,y:g.y+j*sp};
    if(q.x<VR[0]||q.x>VR[0]+VR[2]||q.y<VR[1]||q.y>VR[1]+VR[3]||!inSh(g,q,-.3))continue;
    const a0=slopeAt(h,q),m=hyp(a0.x,a0.y);
    if(m<.05){ctx.globalAlpha=al*.4;ctx.fillStyle='#fffbe6';disc(q.x,q.y,lw);continue}
    const ph=(now/1000/LIFE+((i*7+j*13)&7)/8)%1,dt=ph*LIFE/K,tail=Math.floor(K*.55);let x=q.x,y=q.y;
    ctx.beginPath();for(let k=0;k<=K;k++){if(k>=tail)k===tail?ctx.moveTo(x,y):ctx.lineTo(x,y);const a=slopeAt(h,{x,y});x+=a.x*PACE*dt;y+=a.y*PACE*dt}
    const col=m>.8?'#ff9c7a':m>.45?K_GOLD:'#fffbe6';ctx.strokeStyle=col;ctx.globalAlpha=al*Math.sin(Math.PI*ph)*clamp(.45+m*.6,0,1);ctx.lineWidth=lw*(1+m*.8);ctx.stroke();ctx.fillStyle=col;disc(x,y,lw*(1.2+m))}
  ctx.globalAlpha=1}
const K_GOLD='#e6cf8a';
function txt(s,x,y,size,color,align='center'){ctx.font=`800 ${size}px "Playfair Display",Georgia,serif`;ctx.textAlign=align;ctx.textBaseline='middle';
  ctx.lineWidth=4;ctx.strokeStyle='rgba(6,22,17,.8)';ctx.lineJoin='round';ctx.strokeText(s,x,y);ctx.fillStyle=color;ctx.fillText(s,x,y)}
function drawPreview(now){const g=S.g,b=S.ball,c=S.club,h=cur();
  if(c.putt){if(S.mode!=='ready'&&S.mode!=='aim')return;const p0=toScreen(b.x,b.y),pm=toScreen(S.mark.x,S.mark.y),aim=S.pmode==='aim',pu=aim?1+Math.sin(now/260)*.12:1;
    ctx.lineCap='round';ctx.strokeStyle='rgba(6,22,17,.5)';ctx.lineWidth=5;ctx.setLineDash([1,10]);ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(pm.x,pm.y);ctx.stroke();
    ctx.strokeStyle=K.cream;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(pm.x,pm.y);ctx.stroke();ctx.setLineDash([]);
    for(const[col,lw]of[['rgba(6,22,17,.65)',5.5],[K.gold,2.6]]){ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(pm.x,pm.y,12*pu,0,TAU);
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){ctx.moveTo(pm.x+dx*7,pm.y+dy*7);ctx.lineTo(pm.x+dx*19*pu,pm.y+dy*19*pu)}ctx.stroke()}
    ctx.fillStyle=K.gold;disc(pm.x,pm.y,2.2);
    // how far the marker sits left or right of the cup, seen from behind the ball
    const dx=h.pin.x-b.x,dy=h.pin.y-b.y,d=hyp(dx,dy)||1,off=Math.round(((S.mark.x-h.pin.x)*-dy+(S.mark.y-h.pin.y)*dx)/d*36);
    txt(Math.round(markDist()*3)+' ft'+(Math.abs(off)>=1?' · '+Math.abs(off)+' in '+(off>0?'right':'left'):''),pm.x+26,pm.y,16,K.cream,'left');return}
  if(!g||g.drag||!g.aim||g.power<.04)return;
  const aw=rotv(g.aim.x,g.aim.y,-cam.r),carry=g.power*c.carry*lieMult(S.lie,c),ll=lieAt(h,{x:b.x+aw.x*carry,y:b.y+aw.y*carry}),total=carry*(1+c.roll*ROLLX[ll]);
  const p0=toScreen(b.x,b.y),p1=toScreen(b.x+aw.x*carry,b.y+aw.y*carry),p2=toScreen(b.x+aw.x*total,b.y+aw.y*total);
  const col=ll==='water'?'#bfeee6':ll==='woods'?'#ff9a8a':ll==='bunker'||ll==='native'?K.sand:K.cream;
  ctx.lineCap='round';ctx.strokeStyle='rgba(6,22,17,.5)';ctx.lineWidth=5.5;ctx.setLineDash([1,11]);ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();
  ctx.strokeStyle=K.cream;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.6;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.globalAlpha=1;
  ctx.strokeStyle='rgba(6,22,17,.65)';ctx.lineWidth=5.5;ctx.beginPath();ctx.arc(p1.x,p1.y,9,0,TAU);ctx.stroke();ctx.strokeStyle=col===K.cream?K.gold:col;ctx.lineWidth=3;ctx.stroke();
  txt(Math.round(carry)+' yd'+(ll==='water'?' · water':ll==='woods'?' · trees':ll==='bunker'?' · sand':ll==='native'?' · native':''),p1.x+16,p1.y,17,col,'left')}
function drawFlag(now){const h=cur(),p=toScreen(h.pin.x,h.pin.y),ph=clamp(18+cam.s*.9,24,58),near=hyp(S.ball.x-h.pin.x,S.ball.y-h.pin.y)<2&&!S.ball.gone;
  const ws=rotv(h.wind.x,h.wind.y,cam.r),dir=ws.x<0?-1:1,fl=ph*.5,wav=Math.sin(now/260)*2*(h.wind.sp/14+.25),sd=rotv(SUN.x,SUN.y,cam.r),sl=ph*.75;
  ctx.globalAlpha=near?.25:1;ctx.lineCap='round';
  ctx.strokeStyle='rgba(6,20,10,.35)';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+sd.x*sl,p.y+sd.y*sl);ctx.stroke();
  ctx.fillStyle='rgba(6,20,10,.3)';ctx.beginPath();ctx.moveTo(p.x+sd.x*sl,p.y+sd.y*sl);ctx.lineTo(p.x+sd.x*sl*.6+dir*fl*.7,p.y+sd.y*sl*.75);ctx.lineTo(p.x+sd.x*sl*.5,p.y+sd.y*sl*.5);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f6f1e2';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-ph);ctx.stroke();
  const w2=Math.sin(now/200+1.3)*fl*.09*(h.wind.sp/14+.3),tx=p.x+dir*fl,ty=p.y-ph+fl*.3+wav,flag=()=>{ctx.beginPath();ctx.moveTo(p.x,p.y-ph);ctx.quadraticCurveTo(p.x+dir*fl*.5,p.y-ph-fl*.06+w2,tx,ty);ctx.quadraticCurveTo(p.x+dir*fl*.5,p.y-ph+fl*.52-w2,p.x,p.y-ph+fl*.62);ctx.closePath()};
  flag();ctx.fillStyle='#c9283a';ctx.fill();ctx.save();flag();ctx.clip();ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(p.x-fl,p.y-ph-fl*.2,fl*2,fl*.42);ctx.fillStyle='rgba(60,0,10,.22)';ctx.fillRect(p.x+dir*fl*.45-fl*.09,p.y-ph-fl*.2,fl*.18,fl);ctx.restore();
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
      ctx.font='italic 700 32px "Playfair Display",Georgia,serif';ctx.lineWidth=5;ctx.strokeText(f.text,f.x,y);ctx.fillStyle=f.good?K.gold:f.bad?'#ff7d8e':K.cream;ctx.fillText(f.text,f.x,y);
      if(f.sub){ctx.font='400 12px Copperplate,"Marcellus SC",Georgia,serif';ctx.lineWidth=4;const t=f.sub.toUpperCase().split('').join('\u200a');ctx.strokeText(t,f.x,y+24);ctx.fillStyle=f.good?K.gold:K.cream;ctx.fillText(t,f.x,y+24)}
      ctx.globalAlpha=1}}
  if(!g||g.drag)return;const L=pullMax(),R=31,m=g.frozen!=null?{f:g.frozen,e:g.e}:meterAt(g,performance.now()),w=timingWindow(),hit=Math.abs(m.e)<=w,late=m.e>w;
  ctx.lineCap='round';ctx.strokeStyle='rgba(244,236,214,.28)';ctx.lineWidth=2;ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(g.ox,g.oy,L,0,TAU);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(244,236,214,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(g.ox,g.oy);ctx.lineTo(g.x,g.y);ctx.stroke();
  if(g.phase==='swing'&&g.trail.length>1){ctx.strokeStyle=K.gold;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(g.trail[0].x,g.trail[0].y);for(const q of g.trail)ctx.lineTo(q.x,q.y);ctx.stroke()}
  // the meter: two arcs climb from the bottom of the ring and meet at the gold notch on top.
  // The bottom third is the shank zone, marked red; the fill itself turns red while it is in there.
  const a0=Math.PI/2,shk=SHANK*Math.PI,low=m.f<SHANK;
  ctx.lineCap='butt';ctx.strokeStyle='rgba(6,22,17,.72)';ctx.lineWidth=12;ctx.beginPath();ctx.arc(g.ox,g.oy,R,0,TAU);ctx.stroke();
  ctx.strokeStyle='rgba(201,40,58,.55)';ctx.lineWidth=12;ctx.beginPath();ctx.arc(g.ox,g.oy,R,a0-shk,a0+shk);ctx.stroke();
  const ha=Math.max(.12,(1-Math.pow(1-w/TU,EASE))*Math.PI);ctx.strokeStyle=K.gold;ctx.globalAlpha=hit?1:.65;ctx.beginPath();ctx.arc(g.ox,g.oy,R,-a0-ha,-a0+ha);ctx.stroke();ctx.globalAlpha=1;
  if(m.f>.004){ctx.lineCap='round';ctx.strokeStyle=hit?'#fff6c9':low||late?'#ff7d8e':K.cream;ctx.lineWidth=7;const sw=m.f*Math.PI;
    ctx.beginPath();ctx.arc(g.ox,g.oy,R,a0,a0+sw);ctx.stroke();ctx.beginPath();ctx.arc(g.ox,g.oy,R,a0,a0-sw,true);ctx.stroke()}
  if(hit){ctx.strokeStyle=K.gold;ctx.globalAlpha=.55;ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.ox,g.oy,R+11,0,TAU);ctx.stroke();ctx.globalAlpha=1}
  ctx.fillStyle='rgba(6,22,17,.45)';disc(g.ox,g.oy,R-7);ctx.fillStyle=K.gold;disc(g.ox,g.oy,3.5);
  ctx.fillStyle='rgba(244,236,214,.3)';disc(g.x,g.y,24);
  if(!S.club.putt&&g.power>.04)txt(Math.round(g.power*100)+'%',g.ox,g.oy-R-24,g.power>=1?28:24,g.power>=1?K.gold:K.cream)}
function drawVignette(){if(!VIG){VIG=ctx.createRadialGradient(W/2,H*.5,Math.min(W,H)*.35,W/2,H*.5,hyp(W,H)*.62);VIG.addColorStop(0,'rgba(8,24,14,0)');VIG.addColorStop(1,'rgba(8,24,14,.36)')}
  ctx.fillStyle=VIG;ctx.fillRect(0,0,W,H)}
function burst(x,y,col,n,sp,up){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=Math.random()*sp,l=.4+Math.random()*.5;S.parts.push({x,y,z:.2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:up*(.5+Math.random()),life:l,max:l,col,sz:1.2+Math.random()*1.8})}}
