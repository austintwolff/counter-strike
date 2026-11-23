// ───────── the courses
// Every course is built from real map data (see tools/import_course.py and data/*.json): its true hole lines, greens,
// fairways, tees, bunkers, water, woods, trees, paths, streets and buildings. Map data © OpenStreetMap contributors.
// What is written here by hand is only what a map cannot say: the card, the names, and the look of the place.
// th: the lie beyond the mown rough, ground colours, and the mix of native trees that fills the woods.
//     first: the number of the first hole in `holes`: 10 where the back nine was added first (the map data is keyed by real hole numbers).
//     belt: trees fill everything further than this many yards from a fairway. clumps, clumpAt: how full and how common the
//     loose clumps of trees are on open ground (with a belt, clumps only appear when asked for).
const COURSES=[
{id:'gr',code:'GR',club:'Grey Rock',tee:'Gold',
 // Hill Country south-west of Austin: live oak and Ashe juniper, dry limestone creek beds, holes threaded between neighbourhoods and under Highway 45
 th:{out:'native',floor:'#70783f',rough:'#4b7735',fair:'#69a547',stripe:1,outer:'#59663f',woods:'#2f4a26',mix:[['liveoak',.46],['juniper',.36],['elm',.18]],marker:'#e6cf8a',bloom:'bloom',bridge:'wood',cart:true,belt:30,houses:false},
 holes:[['Underpass',4,423,7],['Danz Creek',5,509,9],['Stock Tank',3,193,15],['Escarpment',4,446,3],['The Far Corner',4,380,13],['Cedar Brake',4,445,5],['Long Draw',5,542,1],['Grey Rock',3,187,17],['Homestead',4,317,11]]},
{id:'lp',code:'LP',club:'Lost Pines',tee:'Black',
 // prairie ridges above the Colorado River: post oak and cedar elm mottes, loblolly pine, native grass, sprawling white bunkers
 th:{out:'native',floor:'#978a4b',rough:'#557f39',fair:'#6ba748',stripe:1,outer:'#978a4b',woods:'#33502b',mix:[['postoak',.32],['elm',.2],['juniper',.14],['pine',.16],['pecan',.1],['mesquite',.08]],marker:'#1c1c1c',bloom:'bloomGold',bridge:'wood',cart:true,houses:false},
 holes:[['Loblolly',4,420,17],['Prairie Ridge',4,431,3],['Long Horizon',5,603,1],["Wolf's Den",3,233,5],['Bastrop Run',5,594,7],['Pine Hollow',3,166,15],['Short Grass',4,337,13],['McKinney Roughs',4,483,11],['The Perch',4,428,9]],
 // the back nine drops off the ridge to the pecan bottoms along the Colorado
 more:[['River Road',4,473,6],['Colorado',4,352,8],['Pecan Bottom',3,191,16],['The Long Walk',5,636,2],['Lost Pines',4,401,12],['Wilbarger',4,345,14],['Little Wolf',3,155,18],['Wolfdancer',4,470,4],['Riverside',5,586,10]]},
{id:'hk',code:'HK',club:'Hancock',tee:'Blue',
 // a city park since 1899: nine holes side by side in one block of Hyde Park, old pecans and live oaks, Waller Creek through the middle, a trail around the edge
 th:{out:'rough',floor:'#527c38',rough:'#527c38',fair:'#6ea14b',stripe:.55,outer:'#56633f',woods:'#2e4927',mix:[['pecan',.3],['liveoak',.36],['elm',.26],['juniper',.08]],marker:'#4f86e8',bloom:'bloomPink',bridge:'stone',cart:false,houses:true},
 holes:[['First Tee',4,324,11],['Red River',4,335,9],['The Slant',4,346,3],['The Pond',4,264,13],['Limestone',3,152,15],['Waller Creek',5,462,1],['Peck Avenue',4,357,5],['The Corner',3,144,17],['Home',4,249,7]]},
{id:'jc',code:'JC',club:'Jimmy Clay',tee:'Black',
 // Austin's 1974 muni in the fork of Onion and Williamson creeks: open parkland, rows and clumps of old pecan, live oak and cedar elm
 // between the holes, thick bottomland woods all round the edge, a green set in a pond at the 6th, McKinney Falls limestone over the creek
 th:{out:'rough',floor:'#62803b',rough:'#62803b',fair:'#72a648',stripe:.8,outer:'#5a6a3e',woods:'#2f4a26',mix:[['pecan',.3],['liveoak',.3],['elm',.3],['juniper',.1]],marker:'#1c1c1c',bloom:'bloomGold',bridge:'wood',cart:true,belt:46,clumps:.8,clumpAt:.45,houses:false},
 holes:[['Dove Springs',4,408,7],['Nuckols',3,155,15],['Williamson Creek',4,392,3],['The Long Bend',5,564,9],['The Point',3,114,17],['Pond Green',4,316,11],['Onion Creek',5,502,13],['Pecan Row',4,444,1],["Clay's Way",4,407,5]],
 more:[['The Turn',5,519,8],['Roy Kizer',4,426,10],['Long Iron',3,227,14],['McKinney Falls',4,405,6],['Cedar Elm',3,204,12],['Pleasant Valley',4,378,16],['Three Shotter',5,559,18],['Bottomland',4,437,4],['Last Light',4,474,2]]},
{id:'mu',code:'MU',club:'Muni',tee:'Blue',first:10,
 // Lions Municipal, Tarrytown, 1924: short, tight holes cut through thick live oak woods, open stands of big oaks over dry ground
 // between the fairways, small dark ponds, hardly a bunker, city streets on three sides. The 16th is Hogan's Hole.
 th:{out:'rough',floor:'#687d3c',rough:'#687d3c',fair:'#74a14a',stripe:.5,outer:'#5c6740',woods:'#2c4724',mix:[['liveoak',.52],['elm',.22],['pecan',.14],['juniper',.12]],marker:'#4f86e8',bloom:'bloom',bridge:'stone',cart:true,clumps:.34,clumpAt:-.5,houses:true},
 holes:[['Enfield',4,287,16],['Tarrytown',4,320,8],['Brackenridge',5,493,4],['Short Carry',3,146,12],['Lake Austin',5,509,10],['Deep Eddy',3,128,14],["Hogan's Hole",4,395,2],['Live Oak',3,166,6],['Clubhouse Turn',4,301,18]],
 // `holes` is the back nine here, since that was built first; `more` is holes 1 to 9
 more:[['Opening Drive',4,359,5],['Exposition',5,495,9],['Old Oak',4,393,3],['West Austin',3,155,15],['The Doke',4,375,7],['The Hard One',4,367,1],['Lions Club',3,157,11],['Long Way Round',5,467,17],['Since 1924',4,312,13]]},
{id:'om',code:'OM',club:'Olmos Basin',tee:'Blue',
 // San Antonio's flood basin behind Olmos Dam: flat, open parkland of scattered live oak, pecan and mesquite, Olmos Creek and its
 // drainage washes wandering through, a railroad cutting the course in two, Highway 281 along the east side
 th:{out:'rough',floor:'#6c8540',rough:'#6c8540',fair:'#70a548',stripe:.6,outer:'#636f40',woods:'#2f4a26',mix:[['liveoak',.4],['pecan',.2],['mesquite',.22],['elm',.18]],marker:'#4f86e8',bloom:'bloomGold',bridge:'wood',cart:true,clumps:.4,clumpAt:-.2,houses:true},
 holes:[['The Basin',4,410,3],['McCullough',4,434,1],['Mesquite Flat',3,198,5],['Across the Tracks',4,280,11],['Two Eighty-One',5,532,17],['Whistle Stop',3,195,9],['Basse Road',4,376,13],['Huisache',4,400,7],['Green Tank',5,526,15]],
 more:[['Olmos Creek',4,380,10],['Dam Site',5,381,16],['Channel',3,200,8],['The Terrace',4,366,4],['Long Three',3,221,2],['Floodplain',4,380,6],['Alamo Heights',4,378,14],['San Antonio',4,393,12],['The Quarry',5,518,18]]}];
// Every hole of every course in one list; a round is a set of indexes into it. A course's first nine is `holes`, drawn from
// data/<id>.json; its other nine, if it has one, is `more`, drawn from data/<id>2.json. The second nines are added after all the
// first ones so that the index of a hole never changes once it has been published (saved rounds keep indexes).
//   k  0 to 17, the hole's fixed place in its course (used for seeds and for the key sent to the clubhouse server)
//   n  the number on the tee sign
const ALL=[];
for(const c of COURSES)c.holes.forEach((d,k)=>ALL.push({c,k,n:k+(c.first||1),map:c.id,def:{name:d[0],par:d[1],yd:d[2],hcp:d[3]}}));
for(const c of COURSES)(c.more||[]).forEach((d,k)=>ALL.push({c,k:k+9,n:k+((c.first||1)===1?10:1),map:c.id+'2',def:{name:d[0],par:d[1],yd:d[2],hcp:d[3]}}));
// the indexes of a course's holes in playing order: part 'f' the front nine, 'b' the back nine, 'a' all eighteen
const courseIds=(id,part)=>ALL.map((e,i)=>e.c.id===id&&(part==='a'||(part==='b')===(e.n>9))?i:-1).filter(i=>i>=0).sort((a,b)=>ALL[a].n-ALL[b].n);
// what a scorecard needs to know about a hole, without building it
const INFO=i=>{const e=ALL[i];return{course:e.c,n:e.n,k:e.k+1,name:e.def.name,par:e.def.par,yards:e.def.yd,hcp:e.def.hcp}};
const holeNo=(id,key)=>{const e=ALL.find(e=>e.c.id===id&&e.k+1===key);return e?e.n:key};
const pts=f=>{const a=[];for(let i=0;i<f.length;i+=2)a.push({x:f[i],y:f[i+1]});return a};
const SPECIES=[[/quercus|oak/i,'liveoak'],[/carya|pecan/i,'pecan'],[/ulmus|elm/i,'elm'],[/juniper|cedar|needle/i,'juniper'],[/taxodium|cypress/i,'cypress'],[/prosopis|mesquite/i,'mesquite'],[/pinus|pine/i,'pine']];

// ───────── a course's ground, built once
// Only the hole being played is built: its own ground and whatever of the course lies within sight of it.
// Past FADE0 yards from the line of play the picture fades out, and by FADE1 it is gone (and the ball is off the map).
const FADE0=94,FADE1=165,PAD=FADE1+30;
function buildGeo(e){const c=e.c,k=e.k,m=MAPS[e.map],th=c.th,g={},rng=mulberry32(hashStr('geo:'+c.id+k)),R=g.route=mkRoute(catmull(pts(m.lines[e.n]),3));
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of R.pts){x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y)}
  g.box=[x0-PAD,y0-PAD,x1-x0+2*PAD,y1-y0+2*PAD];
  const local=f=>{const P=f.p||f;let a=1e9,b=1e9,c2=-1e9,d=-1e9;for(let i=0;i<P.length;i+=2){a=Math.min(a,P[i]);b=Math.min(b,P[i+1]);c2=Math.max(c2,P[i]);d=Math.max(d,P[i+1])}return c2>x0-PAD&&a<x1+PAD&&d>y0-PAD&&b<y1+PAD};
  const shp=f=>polyShape(pts(f.p||f)),box=f=>polyShape(pts(f.p||f),true),shapes=(list,mk)=>list.filter(local).map(mk);
  // which 30-yard squares lie within reach of a hole: one lookup then rules out far-off ground
  const NEAR=FADE1+8,CELL=30,reach=d=>{const set=new Set(),n=Math.ceil(d/CELL);for(let i=0;i<R.pts.length;i+=2){const q=R.pts[i];
      for(let a=-n;a<=n;a++)for(let b=-n;b<=n;b++)if(a*a+b*b<=(n+.7)*(n+.7))set.add((Math.floor(q.x/CELL)+a)+','+(Math.floor(q.y/CELL)+b))}return p=>set.has(Math.floor(p.x/CELL)+','+Math.floor(p.y/CELL))};
  const nearHoles=reach(NEAR),inPlay=reach(PAD+60);
  for(const k of['fair','green','bunker','rough','rock'])g[k]=shapes(m[k],shp);for(const k of['tee','pool','parking'])g[k]=shapes(m[k],box);
  g.woods=shapes(m.wood.concat(m.scrub),shp);g.pitches=shapes(m.pitch,o=>Object.assign(box(o),{sport:o.sport}));g.boundary=m.boundary?shp(m.boundary):null;
  // buildings keep their straight walls and get a roof ridge along their longest side. Where houses are switched off, only large ones stay.
  g.building=shapes(m.building,box).filter(s=>th.houses||s.area>650);
  for(const s of g.building){let best=0;s.poly.forEach((p,i)=>{const q=s.poly[(i+1)%s.poly.length],l=hyp(q.x-p.x,q.y-p.y);if(l>best){best=l;s.ax=Math.atan2(q.y-p.y,q.x-p.x)}})}
  // water: ponds are outlines; creeks are lines given a width. A creek the map marks as seasonal is drawn as a dry limestone bed.
  g.water=shapes(m.water,f=>Object.assign(shp(f),{pond:true}));g.dry=[];
  // a river can run for miles past the course: keep only the stretches that pass the holes
  const runs=[];for(const s of m.streams){let run=null;for(const q of pts(s.p)){if(inPlay(q)){if(!run)runs.push(run={...s,P:[]});run.P.push(q)}else run=null}}
  for(const s of runs){if(s.P.length<2)continue;const r=mkRoute(catmull(s.P,3));if(r.len<8)continue;const n=Math.max(1,Math.round(r.len/22)),prof=[];for(let i=0;i<=n;i++)prof.push([i/n,s.w/2*(s.dry?1.1+rng()*1.1:.9+rng()*.3)]);
    const rb=ribbon(r,0,r.len,prof);rb.line=r;rb.x=r.pts[0].x;rb.y=r.pts[0].y;(s.dry?g.dry:g.water).push(rb)}
  // The map often draws one stretch of water several times over (a creek as a line and as its banks, a pond as water and as a hazard),
  // and long rivers come in pieces. All of it is merged into clean outlines, one per body of water, so nothing overlaps or shows a seam.
  if(g.water.length){const rw=mulberry32(hashStr('water:'+c.id+k));g.water=mergeShapes(g.water,g.box).map(o=>{const w=polyShape(o.outer,false,o.holes);
      let per=0;for(let i=0;i<o.outer.length;i++){const a=o.outer[i],b=o.outer[(i+1)%o.outer.length];per+=hyp(b.x-a.x,b.y-a.y)}
      for(const h of o.holes)w.area-=Math.abs(ringArea(h));w.per=per;w.wide=2*w.area/per;w.pond=w.wide>9;w.round=w.area/(Math.PI*w.R*w.R)>.3;
      // a few spots well out from the bank, for lilies, rising fish and ducks
      w.spots=[];for(let i=0;i<70&&w.spots.length<9;i++){const p={x:lerp(w.bb[0],w.bb[2],rw()),y:lerp(w.bb[1],w.bb[3],rw())};if(inSh(w,p,-Math.min(5,w.wide*.3)))w.spots.push(p)}
      return w})}
  const wet=(p,d)=>g.water.some(w=>inSh(w,p,d)),line=f=>{const P=pts(f.p),path=new Path2D();let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;P.forEach((q,i)=>{i?path.lineTo(q.x,q.y):path.moveTo(q.x,q.y);x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y)});return{...f,pts:P,path,bb:[x0-9,y0-9,x1+9,y1+9]}};
  g.roads=m.roads.filter(r=>local(r)&&(th.houses||r.w>=9)).map(line);g.rails=shapes(m.rails||[],f=>line({...f,w:4}));g.paths=shapes(m.paths,line);
  // a bridge wherever a path or road runs over water
  g.bridges=[];for(const w of g.paths.concat(g.roads)){const r=mkRoute(w.pts);let a=null;for(let s=0;s<=r.len;s+=1.5){const q=rAt(r,s),in1=wet(q,0);if(in1&&a===null)a=s;if((!in1||s+1.5>r.len)&&a!==null){if(s-a>2&&s-a<70){const p0=rAt(r,a-2.5),p1=rAt(r,s+1);
        g.bridges.push({x:(p0.x+p1.x)/2,y:(p0.y+p1.y)/2,a:Math.atan2(p1.y-p0.y,p1.x-p0.x),len:hyp(p1.x-p0.x,p1.y-p0.y),wide:w.w||0})}a=null}}}
  // trees. Mapped single trees stand where they really are and stop a low ball. Woods are filled with the course's native mix.
  const pick=()=>{let u=rng();for(const[k,w]of th.mix)if((u-=w)<0)return k;return th.mix[0][0]},tree=(x,y,kind,r,solid)=>({x,y,kind,r:r*TREES[kind].size,v:Math.floor(rng()*4),solid,h:r*1.15+3});
  g.solid=m.trees.filter(([x,y])=>nearHoles({x,y})).map(([x,y,sp])=>{const k=(SPECIES.find(([re])=>re.test(sp))||[0,pick()])[1];return tree(x,y,wet({x,y},9)&&k!=='pecan'?'cypress':k,lerp(6,9.5,rng()),true)});
  // The way off the tee stays open. A tee shot is still climbing for its first fifty yards, so a tree standing there cannot be cleared:
  // none is kept on the tee or along that stretch of the line of play, and nothing leafy is scattered over it either.
  // "The line" is both the way the hole runs and the straight line the camera first aims down, which differ on a dogleg.
  const T0=R.pts[0],E=R.pts[R.pts.length-1],A=hyp(E.x-T0.x,E.y-T0.y)<=285?E:rAt(R,Math.min(R.len,250)),AL=hyp(A.x-T0.x,A.y-T0.y)||1,ux=(A.x-T0.x)/AL,uy=(A.y-T0.y)/AL;
  const inWay=(p,r,len,half)=>{const vx=p.x-T0.x,vy=p.y-T0.y;if(hyp(vx,vy)>len+half+r)return false;const al=vx*ux+vy*uy;
    return(al>-half-r&&al<len&&Math.abs(vx*uy-vy*ux)<half+r)||(rProj(R,p)<len&&distLine(R.pts,p)<half+r)};
  g.solid=g.solid.filter(t=>!inWay(t,t.r*.85,55,12));
  // One pass over the ground near the holes, a tree-sized step at a time. Each spot is asked the cheapest questions first.
  //   mapped woods      filled with the course's native mix
  //   past the fence    leafy yards
  //   belt courses      everything a set distance from the fairways is a tree belt, with the odd clearing
  //   open ground       clumps here and there
  g.trees=[];const inBox=(w,p,d)=>p.x>w.bb[0]-d&&p.x<w.bb[2]+d&&p.y>w.bb[1]-d&&p.y<w.bb[3]+d,any=(list,p,d)=>{for(const s of list)if(inSh(s,p,d))return true;return false};
  const lineNear=(list,p,d)=>{for(const w of list)if(inBox(w,p,d)&&distLine(w.pts,p)<w.w*.5+d)return true;return false};
  const noise=p=>Math.sin(p.x*.031+c.id.length)+Math.sin(p.y*.027+1.3)+Math.sin((p.x+p.y)*.017);
  const inWood=p=>any(g.woods,p,0),inB=p=>!g.boundary||inSh(g.boundary,p),clear=(p,r)=>!any(g.fair,p,r)&&!any(g.green,p,r+4)&&!any(g.tee,p,r+2)&&!any(g.bunker,p,r)&&!any(g.building,p,r*.5);
  const paths=g.paths.map(w=>({...w,w:5}));
  for(let x=x0-NEAR;x<x1+NEAR;x+=10.5)for(let y=y0-NEAR;y<y1+NEAR;y+=10.5){const p={x:x+rng()*10.5,y:y+rng()*10.5},r=lerp(4.6,9.5,rng()*rng()+.1),u=rng();
    if(!nearHoles(p)||inWay(p,r*.6,50,8))continue;
    if(inWood(p)){if(u<.14||wet(p,r*.5)||!clear(p,r*.45))continue}
    else{if(wet(p,r*.5)||lineNear(g.roads,p,r*.4)||lineNear(g.rails,p,r*.5+2)||lineNear(paths,p,r*.2)||any(g.dry,p,2))continue;
      if(!inB(p)){if(u>.3||any(g.building,p,r*.35))continue}
      else if(th.belt&&!any(g.fair,p,th.belt)&&!any(g.green,p,th.belt+6)){if(noise(p)<-1.1||any(g.tee,p,16)||any(g.bunker,p,8)||any(g.rough,p,4)||any(g.building,p,r*.35))continue}
      else if(th.belt&&!th.clumps)continue;
      else{if(u>(th.clumps||.5)||noise(p)<(th.clumpAt||1.05)||any(g.fair,p,14)||any(g.rough,p,0)||!clear(p,7))continue}}
    g.trees.push(tree(p.x,p.y,wet(p,12)&&rng()<.7?'cypress':pick(),r,false))}
  g.trees.sort((a,b)=>a.r-b.r);
  // small things that make it a place
  g.lilies=[];g.reeds=[];g.ducks=[];g.pebbles=[];g.rakes=[];g.blooms=[];
  // along each bank: reeds round the ponds, pebbles down the creeks. out is the way off the water at that point of the outline.
  const rd=mulberry32(hashStr('bank:'+c.id+k));
  for(const w of g.water){const big=Math.sqrt(w.area/Math.PI);
    for(const ring of[w.poly,...(w.holes||[])])for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],L=hyp(b.x-a.x,b.y-a.y)||1,nx=(b.y-a.y)/L,ny=-(b.x-a.x)/L,sg=inSh(w,{x:(a.x+b.x)/2+nx*.6,y:(a.y+b.y)/2+ny*.6})?-1:1;
      for(let t=rd()*3;t<L;t+=w.pond?3.4:1.5){const q={x:a.x+(b.x-a.x)*t/L,y:a.y+(b.y-a.y)*t/L},u=rd(),v=rd();
        if(w.pond){if(u<.22&&w.area>120)g.reeds.push({x:q.x+nx*sg*.3,y:q.y+ny*sg*.3,a:Math.atan2(ny*sg,nx*sg),s:lerp(.8,1.4,v)})}
        else if(u<.3)g.pebbles.push({x:q.x+nx*sg*(.3+v*.9),y:q.y+ny*sg*(.3+v*.9),r:lerp(.3,.8,rd())})}}
    if(w.pond&&w.area>120){for(const p of w.spots)if(rd()<.55&&inSh(w,p,-1.6))for(let i=0,n=1+Math.floor(rd()*3);i<n;i++){const q={x:p.x+(rd()-.5)*5,y:p.y+(rd()-.5)*5};if(inSh(w,q,-1.6))g.lilies.push({...q,r:lerp(.7,1.4,rd()),a:rd()*TAU,fl:rd()<.35})}
      // a duck or two, idling in a small circle well out from the bank
      if(big>14&&w.spots.length)for(let i=0,n=1+(rd()<.4?1:0);i<n;i++){const p=w.spots[Math.floor(rd()*w.spots.length)];g.ducks.push({w,x:p.x,y:p.y,rad:lerp(1.2,2.2,rd()),T:lerp(50,80,rd())*1000,ph:rd()*TAU,dir:rd()<.5?1:-1})}}}
  for(const w of g.dry)for(const q of w.c)for(let i=0;i<3;i++)if(rng()<.6)g.pebbles.push({x:q.x+q.nx*(rng()*2-1)*(q.w+.3),y:q.y+q.ny*(rng()*2-1)*(q.w+.3),r:lerp(.35,1.5,Math.pow(rng(),1.6))});
  for(const b of g.bunker){if(b.area<25)continue;const q=b.poly[Math.floor(rng()*b.poly.length)],a=Math.atan2(q.y-b.y,q.x-b.x);g.rakes.push({x:q.x+Math.cos(a)*1.3,y:q.y+Math.sin(a)*1.3,a:a+1.2+rng()})}
  for(let i=0;i<7;i++){const r=R,sd=rng()<.5?-1:1,q=rAt(r,lerp(20,r.len-20,rng())),d=lerp(32,58,rng()),p={x:q.x-q.dy*sd*d,y:q.y+q.dx*sd*d};
    if(clear(p,10)&&!wet(p,6)&&!inWood(p)&&inB(p))g.blooms.push(blob(p.x,p.y,lerp(6,11,rng()),lerp(3.5,6.5,rng()),rng()*TAU,g.blooms.length+7,.22))}
  if(th.cart){const w=g.paths.find(w=>w.cart&&w.pts.length>3)||g.paths[0];if(w){const a=w.pts[1],b=w.pts[2],ca=Math.atan2(b.y-a.y,b.x-a.x);g.cart={x:a.x-Math.sin(ca)*2.6,y:a.y+Math.cos(ca)*2.6,a:ca}}}
  // buckets so only what is on screen is drawn
  g.grid=new Map();const put=(t,k)=>{const key=Math.floor(t.x/120)+','+Math.floor(t.y/120);let c2=g.grid.get(key);if(!c2)g.grid.set(key,c2={trees:[],solid:[]});c2[k].push(t)};
  g.trees.forEach(t=>put(t,'trees'));g.solid.forEach(t=>put(t,'solid'));return g}
function distLine(p,q){let m=1e9;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1,t=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/l2,0,1);m=Math.min(m,hyp(q.x-a.x-dx*t,q.y-a.y-dy*t))}return m}

// ───────── one hole, with the day's pin and wind
function buildHole(i,dayKey){const e=ALL[i],c=e.c,g=buildGeo(e),n=e.n,r=g.route,L=r.len,t0=rAt(r,0),end=rAt(r,L);
  const green=g.green.reduce((b,s)=>hyp(s.x-end.x,s.y-end.y)<hyp(b.x-end.x,b.y-end.y)?s:b);
  const h={course:c,th:c.th,geo:g,n,k:e.k+1,name:e.def.name,par:e.def.par,yards:e.def.yd,hcp:e.def.hcp,route:r,total:L,tee:{x:t0.x,y:t0.y,a:Math.atan2(t0.dy,t0.dx)},axis:Math.atan2(end.dy,end.dx),green,fringe:grown(green,2.4)};
  h.oaks=g.solid.filter(t=>distLine(r.pts,t)<160);
  // the day's pin: one of several spots well inside the green
  const dr=mulberry32(hashStr('fl-cond:'+dayKey+':'+c.id+n)),gr=green.rx,spots=[[0,0]];for(let k=0;k<6;k++)spots.push([Math.cos(k*1.047+.4)*gr*.5,Math.sin(k*1.047+.4)*gr*.5]);
  const ok=spots.map(([x,y])=>({x:green.x+x,y:green.y+y})).filter(p=>inSh(green,p,-3));h.pin=ok.length?ok[Math.floor(dr()*ok.length)]:{x:green.x,y:green.y};
  const wsp=Math.round(lerp(0,14,dr())),wa=dr()*TAU;h.wind={x:Math.cos(wa)*wsp,y:Math.sin(wa)*wsp,sp:wsp};
  // the putting surface: a gentle overall tilt plus a few humps and hollows, fixed for each green
  const fr=mulberry32(hashStr('green:'+c.id+n)),sa=fr()*TAU,sm=lerp(.18,.32,fr());h.slope={x:Math.cos(sa)*sm,y:Math.sin(sa)*sm,m:sm};h.bumps=[];
  for(let k=0,nb=3+Math.floor(fr()*2);k<nb;k++){const a=fr()*TAU,d=Math.sqrt(fr())*gr*.85,sg=lerp(3.2,5.8,fr())*clamp(gr/12,.7,1.1),peak=lerp(.28,.72,fr())*(fr()<.5?-1:1);
    h.bumps.push({x:green.x+Math.cos(a)*d,y:green.y+Math.sin(a)*d,s:sg,a:peak*sg/.607})}
  return h}
// downhill pull on a rolling ball at a point, in yards per second squared, and the height potential behind it
function slopeAt(h,q){let x=h.slope.x,y=h.slope.y;for(const b of h.bumps){const dx=q.x-b.x,dy=q.y-b.y,e=b.a*Math.exp(-(dx*dx+dy*dy)/(2*b.s*b.s))/(b.s*b.s);x+=dx*e;y+=dy*e}return{x,y}}
function phiAt(h,q){let p=-(h.slope.x*(q.x-h.green.x)+h.slope.y*(q.y-h.green.y));for(const b of h.bumps){const dx=q.x-b.x,dy=q.y-b.y;p+=b.a*Math.exp(-(dx*dx+dy*dy)/(2*b.s*b.s))}return p}
// what the ball is lying on. The whole course is live: a neighbouring fairway is still fairway.
function lieAt(h,q){const g=h.geo,off=distLine(h.route.pts,q);
  if(off>FADE1-14)return'ob';
  if(inSh(h.green,q))return'green';
  for(const b of g.bunker)if(inSh(b,q))return'bunker';
  if(inSh(h.fringe,q))return'fringe';
  for(const w of g.water)if(inSh(w,q))return'water';
  if(hyp(q.x-h.tee.x,q.y-h.tee.y)<6)return'tee';
  for(const f of g.fair)if(inSh(f,q))return'fairway';
  for(const s of g.green)if(inSh(s,q))return'fairway';
  for(const s of g.tee)if(inSh(s,q))return'fairway';
  if((g.boundary&&!inSh(g.boundary,q))||g.building.some(b=>inSh(b,q)))return'ob';
  for(const w of g.dry)if(inSh(w,q))return'creekbed';
  for(const w of g.rock)if(inSh(w,q))return'creekbed';
  for(const w of g.woods)if(inSh(w,q))return'woods';
  if(h.th.out==='rough'||off<34||g.rough.some(s=>inSh(s,q))||g.fair.some(s=>inSh(s,q,24))||g.green.some(s=>inSh(s,q,26)))return'rough';
  return h.th.out}
