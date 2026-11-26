// ───────── birds
// One kind of bird belongs to each course (th.bird), and now and then it crosses the wider views. Each is painted once, from
// above, flying toward +x, two units from wing-tip to wing-tip, as two pictures: the wings, and the body that lies over them, so
// the wings can be foreshortened as they beat. Each picture has a blurred copy for the shadow on the ground.
//
// A wing is given by its outline: lead, the leading edge from the shoulder as bezier curves out to the front of the hand;
// hand, the line the primaries root on; prim, the tips of the primaries front to back; edge, the trailing edge (x at each y).
const knots=p=>y=>{let i=0;while(i<p.length-2&&y>p[i+1][0])i++;const a=p[i],b=p[i+1],u=clamp((y-a[0])/(b[0]-a[0]),0,1);return lerp(a[1],b[1],.5-.5*Math.cos(Math.PI*u))};
function plume(g,s,bx,by,tx,ty,w0,w1){const dx=tx-bx,dy=ty-by,d=hyp(dx,dy)||1,nx=-dy/d,ny=dx/d;g.moveTo(bx+nx*w0,(by+ny*w0)*s);g.lineTo(tx+nx*w1,(ty+ny*w1)*s);g.quadraticCurveTo(tx+dx/d*w1*1.9,(ty+dy/d*w1*1.9)*s,tx-nx*w1,(ty-ny*w1)*s);g.lineTo(bx-nx*w0,(by-ny*w0)*s)}
const primRoot=(w,i)=>{const u=w.prim.length>1?i/(w.prim.length-1):0;return[lerp(w.hand[0],w.hand[2],u),lerp(w.hand[1],w.hand[3],u)]};
// the closed outlines that make one wing: the arm, then each primary rooted well inside it
function wingParts(g,s,w){const P=[()=>{g.moveTo(w.lead[0],w.y0*s);for(let i=1;i<w.lead.length;i++){const c=w.lead[i];g.bezierCurveTo(c[0],c[1]*s,c[2],c[3]*s,c[4],c[5]*s)}g.lineTo(w.hand[2],w.hand[3]*s);
    const n=w.ns||9,ya=w.hand[3];for(let i=n-1;i>=0;i--){const y0=lerp(w.y0,ya,(i+1)/n),y1=lerp(w.y0,ya,i/n),m=(y0+y1)/2;g.quadraticCurveTo(w.edge(m)-(w.sc==null?.012:w.sc),m*s,w.edge(y1),y1*s)}}];
  w.prim.forEach((t,i)=>P.push(()=>{const b=primRoot(w,i),dx=t[0]-b[0],dy=t[1]-b[1],d=hyp(dx,dy)||1;plume(g,s,b[0]-dx/d*.06,b[1]-dy/d*.06,t[0],t[1],w.pw[0],w.pw[1])}));return P}
const fillParts=(g,P,col,rim)=>{if(rim){g.strokeStyle=rim[0];g.lineWidth=rim[1];g.lineJoin='round';for(const f of P){g.beginPath();f();g.closePath();g.stroke()}}g.fillStyle=col;for(const f of P){g.beginPath();f();g.closePath();g.fill()}};
// the lines between the secondaries, from the coverts back to the trailing edge, and the shafts of the primaries
function wingLines(g,s,w,x0,col,lw,shaft){g.lineCap='round';g.strokeStyle=col;g.lineWidth=lw;const n=w.ns||9;for(let i=1;i<n;i++){const y=lerp(w.y0,w.hand[3],i/n);g.beginPath();g.moveTo(typeof x0==='function'?x0(y):x0,(y-.006)*s);g.lineTo(w.edge(y),y*s);g.stroke()}
  if(shaft){g.strokeStyle=shaft;w.prim.forEach((t,i)=>{const b=primRoot(w,i);g.beginPath();g.moveTo(b[0],b[1]*s);g.lineTo(lerp(b[0],t[0],.92),lerp(b[1],t[1],.92)*s);g.stroke()})}}
// a tail spread from a point inside the body: n feathers, their tips scalloping the end
function tailPath(g,xb,wb,len,ha,n){const px=xb+len*.25,R=len*1.25,at=a=>[px-R*Math.cos(a),R*Math.sin(a)];g.moveTo(xb,-wb);let p=at(-ha);g.lineTo(p[0],p[1]);for(let i=0;i<n;i++){const a0=lerp(-ha,ha,i/n),a1=lerp(-ha,ha,(i+1)/n),m=at((a0+a1)/2),q=at(a1);g.quadraticCurveTo(px-(R+len*.05)*Math.cos((a0+a1)/2),m[1]*1.02,q[0],q[1])}g.lineTo(xb,wb)}
function tailLines(g,xb,len,ha,n,col,lw){const px=xb+len*.25,R=len*1.25;g.strokeStyle=col;g.lineWidth=lw;for(let i=1;i<n;i++){const a=lerp(-ha,ha,i/n);g.beginPath();g.moveTo(px-len*.35*Math.cos(a),len*.35*Math.sin(a));g.lineTo(px-R*.98*Math.cos(a),R*.98*Math.sin(a));g.stroke()}}
const oval=(g,x,y,rx,ry)=>{g.moveTo(x+rx,y);g.ellipse(x,y,rx,ry,0,0,TAU)};
const tint=(g,x0,y0,x1,y1,stops,box)=>{const l=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,c])=>l.addColorStop(o,c));g.fillStyle=l;g.fillRect(box[0],box[1],box[2],box[3])};
const atop=g=>{g.globalCompositeOperation='source-atop'},over=g=>{g.globalCompositeOperation='source-over'};
const ALLBOX=[-2,-2,4,4];

const BIRDS={
  // California condor (Grand Canyon): long plank wings ending in splayed fingers, a short square tail, the bare pink head and
  // the pale bar along each upper wing. It never flaps where it can soar.
  condor:{sz:24,way:'soar',span:21,high:3.4,
    wing:{y0:.03,lead:[.11,[.15,.2,.185,.4,.17,.54],[.165,.62,.15,.69,.12,.74]],hand:[.115,.725,-.145,.645],prim:[[.135,.99],[.07,1.01],[.005,1],[-.06,.975],[-.12,.935],[-.172,.88],[-.21,.805]],pw:[.03,.012],edge:y=>-.222+.0052*Math.pow(Math.abs(y-.34)/.1,2),ns:11},
    wings(g){const w=this.wing;for(const s of[1,-1])fillParts(g,wingParts(g,s,w),'#1b1815');atop(g);
      tint(g,.19,0,-.09,0,[[0,'rgba(122,108,92,.55)'],[.55,'rgba(84,74,64,.3)'],[1,'rgba(60,52,46,0)']],[-.1,-1.05,.3,2.1]);tint(g,.2,-1,-.2,1,[[0,'rgba(255,240,215,.1)'],[.5,'rgba(255,240,215,0)'],[1,'rgba(0,0,0,.2)']],ALLBOX);
      for(const s of[1,-1]){wingLines(g,s,w,-.06,'rgba(0,0,0,.42)',.006,'rgba(150,138,120,.22)');
        g.strokeStyle='rgba(232,226,208,.5)';g.lineWidth=.011;g.setLineDash([.038,.012]);g.beginPath();g.moveTo(-.05,.13*s);g.quadraticCurveTo(-.075,.38*s,-.045,.6*s);g.stroke();g.setLineDash([])}},
    body(g){fillParts(g,[()=>{g.moveTo(-.15,.055);g.quadraticCurveTo(-.26,.075,-.335,.105);g.quadraticCurveTo(-.365,0,-.335,-.105);g.quadraticCurveTo(-.26,-.075,-.15,-.055)},()=>oval(g,-.03,0,.195,.08),()=>oval(g,.165,0,.05,.045),()=>oval(g,.232,0,.045,.033)],'#1b1815');atop(g);
      g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=.006;for(const a of[-.07,-.035,0,.035,.07]){g.beginPath();g.moveTo(-.19,a*.55);g.lineTo(-.345,a*1.35);g.stroke()}
      const bg=g.createRadialGradient(0,-.02,.01,-.03,0,.2);bg.addColorStop(0,'rgba(96,86,76,.5)');bg.addColorStop(1,'rgba(40,34,30,0)');g.fillStyle=bg;g.beginPath();oval(g,-.03,0,.195,.08);g.fill();
      g.fillStyle='#0f0d0c';g.beginPath();oval(g,.168,0,.046,.043);g.fill();g.fillStyle='#d98860';g.beginPath();oval(g,.232,0,.045,.033);g.fill();g.fillStyle='rgba(255,220,190,.45)';g.beginPath();oval(g,.236,-.009,.022,.012);g.fill();
      over(g);g.fillStyle='#e9dfc6';g.beginPath();g.moveTo(.266,-.015);g.quadraticCurveTo(.312,0,.266,.015);g.closePath();g.fill()}},

  // Red-tailed hawk (Texas, Georgia): broad brown wings with a darker trailing edge, pale spots in a V down the back, and
  // the brick-red tail fanned as it turns in circles on the warm air.
  hawk:{sz:17,way:'circle',span:25,high:3,lap:9.5,ring:46,
    wing:{y0:.06,lead:[.17,[.2,.2,.27,.38,.265,.52],[.26,.6,.235,.67,.19,.72]],hand:[.19,.72,-.17,.665],prim:[[.2,.975],[.115,1],[.03,.995],[-.055,.96],[-.135,.905],[-.2,.83]],pw:[.042,.017],edge:knots([[.06,-.25],[.2,-.31],[.36,-.335],[.5,-.3],[.6,-.235],[.665,-.17]]),ns:9},
    wings(g){const w=this.wing;for(const s of[1,-1])fillParts(g,wingParts(g,s,w),'#553a23');atop(g);
      // warm brown coverts over the front of the wing; flight feathers darker, barred, darkest at the tips and along the back edge
      tint(g,.28,0,-.1,0,[[0,'rgba(150,108,66,.95)'],[.5,'rgba(126,88,52,.75)'],[1,'rgba(110,76,44,0)']],[-.12,-1.05,.42,2.1]);
      for(const s of[1,-1]){for(const[o,a,lw]of[[.022,.5,.03],[.075,.3,.012],[.118,.26,.011]]){g.strokeStyle='rgba(34,20,10,'+a+')';g.lineWidth=lw;g.beginPath();for(let y=w.y0;y<=.67;y+=.03){const x=w.edge(y)+o;y===w.y0?g.moveTo(x,y*s):g.lineTo(x,y*s)}g.stroke()}
        wingLines(g,s,w,-.03,'rgba(30,18,8,.4)',.006,'rgba(190,150,110,.25)');
        g.fillStyle='rgba(22,13,8,.55)';w.prim.forEach(t=>{g.beginPath();g.ellipse(t[0]*.99,t[1]*.965*s,.03,.045,0,0,TAU);g.fill()});
        // pale flecks across the coverts
        const r=mulberry32(7+(s>0?1:2));g.fillStyle='rgba(232,204,160,.5)';for(let i=0;i<16;i++){const y=.12+r()*.5,x=.02+r()*.2;g.beginPath();g.ellipse(x,y*s,.012,.007,r()*3,0,TAU);g.fill()}}
      tint(g,.2,-1,-.2,1,[[0,'rgba(255,236,200,.14)'],[.5,'rgba(255,236,200,0)'],[1,'rgba(0,0,0,.2)']],ALLBOX)},
    body(g){fillParts(g,[()=>tailPath(g,-.2,.085,.33,.6,11)],'#a9502c');fillParts(g,[()=>oval(g,.03,0,.25,.138),()=>oval(g,.27,0,.112,.1)],'#6a4628');atop(g);
      // the tail: brick red, lighter down the middle, a narrow dark band near the end and a pale tip
      {const px=-.2+.33*.25,R=.33*1.25,rg=g.createRadialGradient(px,0,R*.3,px,0,R*1.05);rg.addColorStop(0,'rgba(214,122,70,0)');rg.addColorStop(.83,'rgba(214,122,70,.0)');rg.addColorStop(.87,'rgba(50,26,14,.85)');rg.addColorStop(.91,'rgba(50,26,14,.85)');rg.addColorStop(.94,'rgba(244,222,186,.9)');rg.addColorStop(1,'rgba(244,222,186,.9)');
        g.save();g.beginPath();g.rect(-.9,-.5,.72,1);g.clip();g.fillStyle=rg;g.fillRect(-1,-1,2,2);tint(g,0,-.2,0,.2,[[0,'rgba(84,34,14,.4)'],[.5,'rgba(206,124,76,.4)'],[1,'rgba(84,34,14,.4)']],[-.9,-.5,.72,1]);tailLines(g,-.2,.33,.6,11,'rgba(70,28,10,.4)',.006);g.restore()}
      // back and head: brown, paler over the rump, with the buff spots that make a V
      const bg=g.createRadialGradient(.06,-.03,.02,.03,0,.27);bg.addColorStop(0,'rgba(150,108,68,.7)');bg.addColorStop(1,'rgba(70,44,24,0)');g.fillStyle=bg;g.fillRect(-.24,-.2,.64,.4);
      g.fillStyle='rgba(232,208,166,.7)';g.beginPath();oval(g,-.185,0,.028,.055);g.fill();
      {const r=mulberry32(21);for(const s of[1,-1])for(let i=0;i<9;i++){const u=i/8+(r()-.5)*.08;g.fillStyle='rgba(238,216,174,'+(.4+r()*.35).toFixed(2)+')';g.beginPath();g.ellipse(lerp(.15,-.12,u)+(r()-.5)*.02,(lerp(.11,.04,u)+(r()-.5)*.016)*s,.011+r()*.008,.007+r()*.004,-.5*s+r()*.6,0,TAU);g.fill()}}
      g.fillStyle='rgba(58,36,20,.5)';g.beginPath();oval(g,.29,0,.085,.074);g.fill();
      over(g);g.fillStyle='#e3be46';g.beginPath();oval(g,.375,0,.02,.027);g.fill();g.fillStyle='#231d19';g.beginPath();g.moveTo(.382,-.022);g.quadraticCurveTo(.44,0,.382,.022);g.closePath();g.fill();
      g.fillStyle='#17110d';for(const s of[1,-1]){g.beginPath();g.arc(.318,.07*s,.012,0,TAU);g.fill()}}},

  // Great egret (the Florida lagoons): all white, neck drawn back in an S, a yellow dagger of a bill, long black legs trailing.
  // Slow, deep wingbeats.
  egret:{sz:19,way:'line',span:22,high:2.2,flap:{hz:2.1,deg:40,fold:.22},ext:1.12,
    wing:{y0:.05,lead:[.13,[.17,.22,.215,.42,.2,.58],[.19,.68,.15,.76,.1,.8]],hand:[.1,.8,-.2,.675],prim:[[.085,.985],[.02,1],[-.05,.985],[-.115,.945],[-.17,.89],[-.215,.82]],pw:[.048,.021],edge:knots([[.05,-.2],[.2,-.265],[.4,-.29],[.55,-.265],[.675,-.2]]),ns:10,sc:.01},
    wings(g){const w=this.wing;for(const s of[1,-1])fillParts(g,wingParts(g,s,w),'#fdfdf9',['rgba(70,98,112,.55)',.016]);atop(g);
      // cool shade toward the back edge and the tips, so the white has form
      tint(g,.2,0,-.3,0,[[0,'rgba(120,150,170,0)'],[.5,'rgba(120,150,170,.08)'],[1,'rgba(120,150,170,.34)']],ALLBOX);
      for(const s of[1,-1]){wingLines(g,s,w,-.1,'rgba(120,146,162,.36)',.005,'rgba(150,170,184,.34)');
        g.strokeStyle='rgba(140,165,180,.42)';g.lineWidth=.007;g.beginPath();g.moveTo(-.04,.07*s);g.quadraticCurveTo(-.07,.4*s,-.03,.7*s);g.stroke();
        g.strokeStyle='rgba(140,165,180,.3)';g.beginPath();g.moveTo(.06,.07*s);g.quadraticCurveTo(.06,.38*s,.09,.66*s);g.stroke()}
      tint(g,.2,-1,-.2,1,[[0,'rgba(255,250,235,.2)'],[.5,'rgba(255,255,255,0)'],[1,'rgba(90,120,140,.16)']],ALLBOX)},
    body(g){const legs=()=>{g.moveTo(-.3,.028);g.lineTo(-.74,.022);g.lineTo(-.88,.04);g.lineTo(-.9,.012);g.lineTo(-.9,-.012);g.lineTo(-.88,-.04);g.lineTo(-.74,-.022);g.lineTo(-.3,-.028)}; // held together, the feet spreading a little at the end
      fillParts(g,[legs],'#1c1d1b');g.strokeStyle='rgba(120,124,120,.5)';g.lineWidth=.006;g.beginPath();g.moveTo(-.32,0);g.lineTo(-.86,0);g.stroke();
      fillParts(g,[()=>{g.moveTo(-.41,0);for(const s of[1,-1]){if(s<0)g.lineTo(.415,0);const q=s>0?[[-.32,.05,-.16,.105,.02,.105],[.11,.105,.15,.072,.21,.076],[.265,.08,.275,.046,.33,.048],[.39,.05,.41,.03,.415,0]]:[[.41,-.03,.39,-.05,.33,-.048],[.275,-.046,.265,-.08,.21,-.076],[.15,-.072,.11,-.105,.02,-.105],[-.16,-.105,-.32,-.05,-.41,0]];for(const c of q)g.bezierCurveTo(c[0],c[1],c[2],c[3],c[4],c[5])}}],'#fdfdf9',['rgba(70,98,112,.55)',.016]);
      atop(g);const bg=g.createRadialGradient(.02,-.015,.02,0,0,.27);bg.addColorStop(0,'rgba(255,255,255,0)');bg.addColorStop(.6,'rgba(140,165,182,.1)');bg.addColorStop(1,'rgba(120,150,170,.42)');g.fillStyle=bg;g.fillRect(-.44,-.14,.9,.28);tint(g,0,-.11,0,.11,[[0,'rgba(110,140,160,.3)'],[.3,'rgba(110,140,160,0)'],[.7,'rgba(110,140,160,0)'],[1,'rgba(110,140,160,.34)']],[-.44,-.14,.9,.28]);
      // the fold of the neck, and the fine plumes that trail over the tail
      g.strokeStyle='rgba(120,148,166,.5)';g.lineWidth=.008;g.beginPath();g.moveTo(.155,-.07);g.quadraticCurveTo(.125,0,.155,.07);g.stroke();g.beginPath();g.moveTo(.275,-.044);g.quadraticCurveTo(.255,0,.275,.044);g.stroke();g.strokeStyle='rgba(120,148,166,.3)';g.beginPath();g.moveTo(.17,0);g.lineTo(.26,0);g.stroke();
      g.strokeStyle='rgba(150,172,186,.45)';g.lineWidth=.005;for(const a of[-.045,-.022,0,.022,.045]){g.beginPath();g.moveTo(-.12,a*.8);g.quadraticCurveTo(-.26,a*1.3,-.385,a*1.05);g.stroke()}
      over(g);
      // the bill: yellow, a little dusky at the tip, with green skin back to the eye
      g.fillStyle='#b9c56c';g.beginPath();oval(g,.395,0,.024,.03);g.fill();
      const bl=g.createLinearGradient(.4,0,.6,0);bl.addColorStop(0,'#f6bd2f');bl.addColorStop(.75,'#efa62a');bl.addColorStop(1,'#8c6a2a');g.fillStyle=bl;g.beginPath();g.moveTo(.4,-.028);g.quadraticCurveTo(.5,-.02,.6,0);g.quadraticCurveTo(.5,.02,.4,.028);g.closePath();g.fill();
      g.strokeStyle='rgba(120,80,20,.5)';g.lineWidth=.004;g.beginPath();g.moveTo(.41,0);g.lineTo(.585,0);g.stroke();
      g.fillStyle='#15140f';for(const s of[1,-1]){g.beginPath();g.arc(.372,.036*s,.01,0,TAU);g.fill()}}},

  // Brown pelican (the Monterey coast): heavy silver-grey wings with dark flight feathers, a white head laid back on the
  // shoulders and that long bill. They go by in a line, close together, beating one after another and then gliding.
  pelican:{sz:19,way:'line',span:21,high:1.9,n:3,gap:2.5,flap:{hz:1.9,deg:32,fold:.16,beats:5,glide:2.6,lag:.26},ext:1.12,
    wing:{y0:.07,lead:[.14,[.2,.2,.3,.36,.3,.5],[.3,.6,.24,.68,.17,.74]],hand:[.17,.74,-.14,.645],prim:[[.1,.99],[.03,1],[-.04,.985],[-.11,.95],[-.17,.9],[-.215,.83]],pw:[.042,.017],edge:knots([[.07,-.2],[.25,-.225],[.45,-.205],[.645,-.14]]),ns:10},
    wings(g){const w=this.wing;for(const s of[1,-1])fillParts(g,wingParts(g,s,w),'#2e2924');atop(g);
      // silver-grey coverts streaked with brown over the front two thirds of the arm; the hand and the back edge stay dark
      for(const s of[1,-1]){g.save();g.beginPath();g.moveTo(.4,.02*s);g.lineTo(.4,.76*s);g.lineTo(.16,.76*s);g.quadraticCurveTo(-.02,.6*s,-.085,.36*s);g.lineTo(-.075,.02*s);g.closePath();g.clip();
        tint(g,.3,0,-.1,0,[[0,'#b4ada0'],[.6,'#9d968a'],[1,'#817a70']],ALLBOX);const r=mulberry32(s>0?11:12);g.strokeStyle='rgba(70,60,50,.5)';g.lineWidth=.006;g.lineCap='round';for(let i=0;i<60;i++){const y=.08+r()*.64,x=-.06+r()*.34;g.beginPath();g.moveTo(x,y*s);g.lineTo(x-.035,(y+.004)*s);g.stroke()}
        g.strokeStyle='rgba(236,230,216,.45)';g.lineWidth=.008;g.beginPath();g.moveTo(-.07,.08*s);g.quadraticCurveTo(-.09,.36*s,-.02,.6*s);g.stroke();g.restore();
        wingLines(g,s,w,-.08,'rgba(0,0,0,.45)',.006,'rgba(170,160,146,.3)')}
      tint(g,.2,-1,-.2,1,[[0,'rgba(255,240,215,.12)'],[.5,'rgba(255,240,215,0)'],[1,'rgba(0,0,0,.22)']],ALLBOX)},
    body(g){fillParts(g,[()=>{g.moveTo(-.24,.06);g.lineTo(-.37,.088);g.quadraticCurveTo(-.39,0,-.37,-.088);g.lineTo(-.24,-.06)}],'#3a342e');
      fillParts(g,[()=>oval(g,-.02,0,.28,.14)],'#8f887c');
      // the bill lies along the top of everything, long and pale with a hooked red tip; the head is white, yellowing on the crown
      atop(g);const bg=g.createRadialGradient(.03,-.02,.03,-.02,0,.28);bg.addColorStop(0,'rgba(190,182,168,.75)');bg.addColorStop(1,'rgba(70,62,54,.25)');g.fillStyle=bg;g.fillRect(-.31,-.15,.58,.3);
      {const r=mulberry32(5);g.strokeStyle='rgba(62,52,44,.45)';g.lineWidth=.006;g.lineCap='round';for(let i=0;i<44;i++){const x=-.24+r()*.36,y=(r()-.5)*.2;g.beginPath();g.moveTo(x,y);g.lineTo(x-.04,y*1.04);g.stroke()}}
      over(g);
      g.fillStyle='#4e2e1b';g.beginPath();g.moveTo(.2,-.03);g.quadraticCurveTo(.08,-.045,.02,0);g.quadraticCurveTo(.08,.045,.2,.03);g.closePath();g.fill(); // the chestnut back of the neck
      g.fillStyle='#f4efe2';g.beginPath();oval(g,.255,0,.085,.06);g.fill();const cg=g.createRadialGradient(.27,0,.005,.27,0,.06);cg.addColorStop(0,'rgba(236,208,110,.95)');cg.addColorStop(1,'rgba(236,208,110,0)');g.fillStyle=cg;g.beginPath();oval(g,.255,0,.085,.06);g.fill();
      const bl=g.createLinearGradient(.3,0,.71,0);bl.addColorStop(0,'#d6c9b4');bl.addColorStop(.8,'#bfae98');bl.addColorStop(.93,'#c0603c');bl.addColorStop(1,'#d9b25a');g.fillStyle=bl;g.beginPath();g.moveTo(.3,-.042);g.quadraticCurveTo(.5,-.04,.66,-.022);g.quadraticCurveTo(.715,0,.66,.022);g.quadraticCurveTo(.5,.04,.3,.042);g.closePath();g.fill();
      g.strokeStyle='rgba(90,70,54,.6)';g.lineWidth=.006;g.beginPath();g.moveTo(.31,0);g.lineTo(.68,0);g.stroke();g.strokeStyle='rgba(60,46,36,.55)';g.lineWidth=.005;g.beginPath();g.moveTo(.3,-.042);g.quadraticCurveTo(.5,-.04,.66,-.022);g.moveTo(.3,.042);g.quadraticCurveTo(.5,.04,.66,.022);g.stroke();
      g.fillStyle='#15120f';for(const s of[1,-1]){g.beginPath();g.arc(.295,.04*s,.009,0,TAU);g.fill()}}},

  // Northern gannet (the Fife coast; Bass Rock is just across the firth): dazzling white, long narrow wings dipped in black,
  // a golden head, pointed at both ends. Stiff shallow beats, then a long glide.
  gannet:{sz:20,way:'line',span:21,high:2.4,flap:{hz:2.6,deg:24,fold:.1,beats:6,glide:2.2},
    wing:{y0:.055,lead:[.1,[.14,.15,.215,.3,.205,.43],[.195,.6,.09,.86,-.02,1.005]],hand:[-.02,1.005,-.045,.99],prim:[],pw:[0,0],edge:knots([[.055,-.14],[.35,-.155],[.6,-.14],[.85,-.09],[.99,-.045]]),ns:13,sc:.006},
    wings(g){const w=this.wing;for(const s of[1,-1])fillParts(g,wingParts(g,s,w),'#fefefb',['rgba(60,90,110,.55)',.016]);atop(g);
      tint(g,.2,0,-.16,0,[[0,'rgba(120,150,172,0)'],[.55,'rgba(120,150,172,.06)'],[1,'rgba(120,150,172,.3)']],ALLBOX);
      for(const s of[1,-1]){wingLines(g,s,w,-.03,'rgba(120,146,164,.42)',.005);
        // the black hand: every primary and its coverts, cut clean across the wing
        g.fillStyle='#17181b';g.beginPath();g.moveTo(.26,.5*s);g.quadraticCurveTo(.05,.5*s,-.2,.635*s);g.lineTo(-.2,1.1*s);g.lineTo(.3,1.1*s);g.closePath();g.fill();
        g.strokeStyle='rgba(120,126,140,.4)';g.lineWidth=.005;for(let i=0;i<6;i++){const u=i/5;g.beginPath();g.moveTo(lerp(.17,-.1,u),lerp(.56,.66,u)*s);g.lineTo(lerp(-.005,-.07,u),lerp(.985,.86,u)*s);g.stroke()}}
      tint(g,.2,-1,-.2,1,[[0,'rgba(255,250,235,.16)'],[.5,'rgba(255,255,255,0)'],[1,'rgba(80,110,130,.14)']],ALLBOX)},
    body(g){fillParts(g,[()=>{g.moveTo(-.26,.052);g.quadraticCurveTo(-.4,.04,-.53,0);g.quadraticCurveTo(-.4,-.04,-.26,-.052)},()=>oval(g,0,0,.32,.08),()=>oval(g,.335,0,.08,.052)],'#fefefb',['rgba(60,90,110,.55)',.016]);atop(g);
      const bg=g.createRadialGradient(.02,-.015,.02,0,0,.33);bg.addColorStop(0,'rgba(255,255,255,0)');bg.addColorStop(.55,'rgba(130,158,178,.08)');bg.addColorStop(1,'rgba(110,140,162,.4)');g.fillStyle=bg;g.fillRect(-.56,-.12,.98,.24);
      g.strokeStyle='rgba(120,146,164,.4)';g.lineWidth=.005;for(const a of[-.02,0,.02]){g.beginPath();g.moveTo(-.3,a);g.lineTo(-.5,a*.3);g.stroke()}
      // the head and nape washed gold
      const hg=g.createRadialGradient(.33,0,.01,.28,0,.2);hg.addColorStop(0,'rgba(236,196,88,1)');hg.addColorStop(.42,'rgba(238,204,110,.85)');hg.addColorStop(1,'rgba(240,214,140,0)');g.fillStyle=hg;g.fillRect(.08,-.1,.36,.2);
      over(g);const bl=g.createLinearGradient(.39,0,.6,0);bl.addColorStop(0,'#aebfca');bl.addColorStop(1,'#d5dfe4');g.fillStyle=bl;g.beginPath();g.moveTo(.395,-.026);g.lineTo(.6,0);g.lineTo(.395,.026);g.closePath();g.fill();
      g.strokeStyle='rgba(30,36,42,.7)';g.lineWidth=.005;g.beginPath();g.moveTo(.4,0);g.lineTo(.58,0);g.moveTo(.395,-.026);g.lineTo(.395,.026);g.stroke();
      g.fillStyle='#14161a';for(const s of[1,-1]){g.beginPath();g.arc(.375,.034*s,.011,0,TAU);g.fill();g.fillStyle='#dfe9ee';g.beginPath();g.arc(.375,.034*s,.0045,0,TAU);g.fill();g.fillStyle='#14161a'}}},

  // Clark's nutcracker (the high Sierra, wherever there is whitebark pine): ash grey, with black wings that flash a white
  // panel along the back edge and a black tail edged white. Strong, steady beats.
  nutcracker:{sz:12,way:'line',span:15,high:2,flap:{hz:4.6,deg:52,fold:.3,beats:9,glide:.5},
    wing:{y0:.09,lead:[.16,[.22,.25,.3,.4,.285,.55],[.275,.66,.22,.75,.15,.8]],hand:[.15,.8,-.2,.7],prim:[[.13,.985],[.06,1],[-.02,.985],[-.1,.945],[-.165,.89],[-.22,.82]],pw:[.052,.023],edge:knots([[.09,-.26],[.3,-.33],[.5,-.32],[.7,-.2]]),ns:8},
    wings(g){const w=this.wing;for(const s of[1,-1])fillParts(g,wingParts(g,s,w),'#17181b');atop(g);
      for(const s of[1,-1]){ // the white panel: the tips of the inner flight feathers
        g.fillStyle='#f6f6f0';g.beginPath();g.moveTo(-.4,.09*s);for(let y=.09;y<=.56;y+=.03)g.lineTo(w.edge(y)+.135-.05*Math.pow(Math.max(0,(y-.4)/.16),2),y*s);g.lineTo(-.4,.56*s);g.closePath();g.fill();
        wingLines(g,s,w,-.06,'rgba(74,80,96,.55)',.006,'rgba(86,92,110,.4)')}
      tint(g,.3,0,-.05,0,[[0,'rgba(96,108,150,.38)'],[1,'rgba(96,108,150,0)']],[-.06,-1.05,.4,2.1]);tint(g,.2,-1,-.2,1,[[0,'rgba(255,255,255,.1)'],[.5,'rgba(255,255,255,0)'],[1,'rgba(0,0,0,.18)']],ALLBOX)},
    body(g){fillParts(g,[()=>tailPath(g,-.24,.075,.31,.34,10)],'#f6f6f0',['rgba(40,50,60,.5)',.014]);fillParts(g,[()=>oval(g,.02,0,.29,.142),()=>oval(g,.33,0,.12,.106)],'#b3b1a9');atop(g);
      // the middle of the tail is black
      g.save();g.beginPath();g.rect(-.9,-.5,.67,1);g.clip();g.fillStyle='#17181b';g.beginPath();tailPath(g,-.24,.04,.31,.13,4);g.closePath();g.fill();tailLines(g,-.24,.31,.34,10,'rgba(90,96,110,.45)',.006);g.restore();
      const bg=g.createRadialGradient(.08,-.03,.02,.04,0,.32);bg.addColorStop(0,'rgba(214,212,204,.85)');bg.addColorStop(1,'rgba(120,118,112,.35)');g.fillStyle=bg;g.fillRect(-.3,-.16,.78,.32);
      g.fillStyle='rgba(238,237,230,.75)';g.beginPath();oval(g,.4,0,.05,.07);g.fill(); // paler about the face
      over(g);g.fillStyle='#17181b';g.beginPath();g.moveTo(.43,-.045);g.quadraticCurveTo(.53,-.032,.585,0);g.quadraticCurveTo(.53,.032,.43,.045);g.closePath();g.fill();
      for(const s of[1,-1]){g.beginPath();g.arc(.385,.072*s,.014,0,TAU);g.fill()}}}
};

const BIRDART={};
function birdArt(kind,big){if(BIRDART[kind]&&!big)return BIRDART[kind];const sp=BIRDS[kind],E=sp.ext||1.08,N=big||Math.round(clamp(sp.sz*9,150,280)); // big: a larger picture, for looking at the drawing itself
  const layer=f=>{const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');g.translate(N/2,N/2);g.scale(N/2/E,N/2/E);g.lineCap='round';f.call(sp,g);return c};
  // the shadow of a picture: itself drawn far to one side, so that only its blurred shadow lands on the canvas
  const soft=img=>{const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');g.shadowColor='rgb(6,18,8)';g.shadowBlur=N*.035;g.shadowOffsetX=N*3;g.drawImage(img,-N*3,0);return c};
  const wings=layer(sp.wings),body=layer(sp.body),art={wings,body,wingShade:soft(wings),bodyShade:soft(body),E};if(!big)BIRDART[kind]=art;return art}

// How far the wings reach, seen from above, at a moment in the beat: full at the middle of the stroke, least at the top
// and bottom, and drawn in on the way back up. Between bursts of beats the wings are held out flat.
function wingSpan(f,t){if(!f)return 1;const beats=f.beats||1e9,cyc=beats/f.hz+(f.glide||0),tt=((t%cyc)+cyc)%cyc;if(tt>=beats/f.hz)return 1;const p=(tt*f.hz)%1,th=f.deg*DEG;
  return p<.45?Math.cos(th*Math.cos(Math.PI*p/.45)):Math.cos(th*Math.cos(Math.PI*(p-.45)/.55))*(1-f.fold*Math.sin(Math.PI*(p-.45)/.55))}

// The sky. A bird is an occasion, not a fixture: about one hole in four has one, and it crosses once, a few seconds after the
// hole has come into view from far enough off. Where a course has a bird of its own it is that bird (or a line of them),
// soaring on a long curve, turning in circles, or beating straight across; elsewhere a small, distant flock crosses a corner.
const SKY={wait:1+Math.floor(Math.random()*4)}; // holes still to go before the next one
function drawSky(now,h){const zc=cam.s,sp=BIRDS[h.th.bird];
  let k=h.sky;if(!k){if(S.mode==='title')return;k=h.sky={on:--SKY.wait<=0,wide:0,last:now}; // the hole behind the title screen does not count
    if(k.on){SKY.wait=3+Math.floor(Math.random()*3);k.seed=Math.floor(Math.random()*1e9);k.lead=2.5+Math.random()*7}}
  if(!k.on||k.done)return;const dt=Math.min(.1,(now-k.last)/1000);k.last=now;
  // Its line across the sky is fixed in the world at the moment it sets out, from where the camera then was. After that it
  // flies on regardless: when the camera follows a ball or closes on the green, the bird is left where it really is.
  if(k.t0==null){if(zc<2.6&&(k.wide+=dt)>=k.lead){k.t0=now;k.cx=cam.x;k.cy=cam.y;k.z=zc}else return}
  const span=sp?sp.span:8.5,t0=(now-k.t0)/1000,u=t0/span;if(u>=1){k.done=true;return}
  // z: the scale it set out at, which fixes its size on the ground. R: past the corners of that view; M: its narrow side.
  // Once the camera has come down well below where it flies (closing on a green) it passes out of sight overhead.
  const z=k.z,cx=k.cx,cy=k.cy,R=hyp(W,H)/z*.62,M=Math.min(W,H)/z,fade=clamp((2.2-zc/z)/.7,0,1);if(fade<=0)return;
  if(sp){const art=birdArt(h.th.bird),E=art.E,sz=sp.sz/z;
    const r=mulberry32(k.seed),ang=r()*TAU,side=r()<.5?-1:1,ph=r()*TAU,ca=Math.cos(ang),sa=Math.sin(ang),fw=R*1.3;
    // where it is at a moment (seconds into its crossing), by the way it flies
    const at=sp.way==='circle'?(off=>t=>{const q=t/span*2-1,a=ph+side*TAU*t/sp.lap,rr=sp.ring/z;return[cx+ca*q*fw*.8-sa*off+Math.cos(a)*rr,cy+sa*q*fw*.8+ca*off+Math.sin(a)*rr]})(side*M*(.05+r()*.2))
      :sp.way==='soar'?(off=>t=>{const q=t/span*2-1,lat=off+R*.1*Math.sin(q*2.3+ph);return[cx+ca*q*fw-sa*lat,cy+sa*q*fw+ca*lat]})(side*M*(.12+r()*.26))
      :(off=>t=>{const q=t/span*2-1,lat=off+R*.03*Math.sin(q*3+ph);return[cx+ca*q*fw-sa*lat,cy+sa*q*fw+ca*lat]})(side*M*(.1+r()*.28)); // never further off the middle than the narrow side of the screen shows
    const n=sp.n||1,list=[];
    for(let i=0;i<n;i++){const t=t0-i*(sp.gap||0)*sp.sz/(2*fw*z/span),p=at(t),q=at(t+.05),hd=Math.atan2(q[1]-p[1],q[0]-p[0]),p2=at(t+.5),q2=at(t+.55);let turn=Math.atan2(q2[1]-p2[1],q2[0]-p2[0])-hd;turn=((turn+Math.PI)%TAU+TAU)%TAU-Math.PI;
      const bank=clamp(turn*2.2,-1,1),ox=i?-Math.sin(hd)*i*sz*.9*(i%2?1:.4):0,oy=i?Math.cos(hd)*i*sz*.9*(i%2?1:.4):0;
      list.push({x:p[0]+ox,y:p[1]+oy,hd,bank,fy:wingSpan(sp.flap,now/1000-i*((sp.flap&&sp.flap.lag)||0))*(1-.07*Math.abs(bank))*(sp.flap?1:1+.014*Math.sin(now/820))})}
    const put=(img,b,px,py,k2,a,fy)=>{ctx.save();ctx.translate(px,py);ctx.rotate(b.hd);ctx.globalAlpha=a*fade;ctx.scale(sz*k2,sz*k2);ctx.transform(1,0,.05*b.bank,1,0,0);ctx.scale(1,fy);ctx.drawImage(img,-E,-E,2*E,2*E);ctx.restore()};
    const d=sz*(sp.high||3);for(const b of list){put(art.wingShade,b,b.x+SUN.x*d,b.y+SUN.y*d,.86,.26,b.fy);put(art.bodyShade,b,b.x+SUN.x*d,b.y+SUN.y*d,.86,.26,1)}
    for(const b of list){put(art.wings,b,b.x,b.y,1,1,b.fy);put(art.body,b,b.x,b.y,1,1,1)}return}
  {const r=mulberry32(k.seed),ang=r()*TAU,off=(r()<.5?-1:1)*R*(.52+r()*.16),t=u*2-1,ca=Math.cos(ang),sa=Math.sin(ang),bx=cx-sa*off+ca*t*R*1.2,by=cy+ca*off+sa*t*R*1.2,sz=3.2/z;
    ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=fade;for(let i=0;i<3;i++){const x=bx-ca*i*sz*2.4-sa*(i===1?1:i===2?-1:0)*sz*1.6,y=by-sa*i*sz*2.4+ca*(i===1?1:i===2?-1:0)*sz*1.6,fl=Math.sin(now/95+i*1.7)*.55;
      for(const[ox,oy,col,lw]of[[SUN.x*sz*5,SUN.y*sz*5,'rgba(6,18,8,.22)',.34],[0,0,'#f6f1e2',.26]]){ctx.strokeStyle=col;ctx.lineWidth=sz*lw;ctx.beginPath();
        const wing=sgn=>{const wa=ang+sgn*(1.95+fl);return[x+ox+Math.cos(wa)*sz*1.25,y+oy+Math.sin(wa)*sz*1.25]},L=wing(1),Rr=wing(-1);ctx.moveTo(L[0],L[1]);ctx.lineTo(x+ox,y+oy);ctx.lineTo(Rr[0],Rr[1]);ctx.stroke()}}ctx.globalAlpha=1}
}
