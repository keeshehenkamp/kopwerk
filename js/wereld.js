'use strict';
/* ================= 3D-rit en punten ================= */
/* De weg volgt de training: zware blokken gaan bergop, rustige blokken vlak of bergaf.
   three.js wordt pas geladen als je de 3D-weergave opent. */
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const VIEW_KEY='kopwerk.view';
let W=null,T3=null,ANISO=4;
const view3d=()=>{try{return localStorage.getItem(VIEW_KEY)!=='cijfers'}catch(e){return true}};
function setView3d(on){try{localStorage.setItem(VIEW_KEY,on?'3d':'cijfers')}catch(e){}}

/* ---------- punten, reeksen en sterren (ook zonder 3D) ---------- */
function gameNew(wo){return {on:wo.type!=='ramptest',pts:0,streak:0,best:0,stars:[],blk:null,pop:null}}
const gameMult=()=>Math.min(5,1+Math.floor(P.game.streak/30));
function gameStep(i,p,tgt){
  const g=P.game;if(!g||!g.on||!tgt)return;
  if(!g.blk||g.blk.i!==i){gameEndBlock();g.blk={i,n:0,a:0,b:0}}
  const e=Math.abs(p/tgt-1),b=g.blk;b.n++;
  if(e<=.05){b.a++;g.streak++;g.pts+=2*gameMult()}
  else if(e<=.10){b.b++;g.pts+=1}
  else g.streak=0;
  g.best=Math.max(g.best,g.streak);
}
/* sterren per blok van minstens 20 seconden: 3 = vrijwel steeds binnen 5% van het doel */
function gameEndBlock(){
  const g=P&&P.game,b=g&&g.blk;if(!b)return;g.blk=null;
  const s=P.wo.segs[b.i];if(!s||s.d<20||b.n<10)return;
  const ok=(b.a+b.b)/b.n,st=b.n/s.d<.5?0:b.a/b.n>=.85?3:ok>=.75?2:ok>=.5?1:0;
  g.stars.push(st);(g.by=g.by||{})[b.i]=st;g.pop={st,t:now()};
}
const gameResult=g=>g&&g.on&&g.stars.length?{pts:g.pts,stars:g.stars.reduce((a,b)=>a+b,0),max:g.stars.length*3,streak:g.best}:null;

/* ---------- productdemo: twee minuten langs alle landschappen ---------- */
function demoWorkout(){
  const segs=[S(150,.5,.65,'Warming-up','warmup'),S(120,.75,null,'Tempo door de Provence','steady'),S(150,1.0,null,'Klim door de heuvels','work'),S(60,.55,null,'Herstel','rest'),
    S(110,1.12,null,'Bergop met haarspeldbochten','work',70),S(50,.5,null,'Herstel','rest'),S(30,1.45,null,'Sprint naar de finish','work',105),S(100,.5,null,'Uitrijden','cooldown')];
  const sec=segs.reduce((x,s)=>x+s.d,0);return {id:'demo',type:'demo',name:'Kopwerk demo',desc:'',segs,sec,minutes:Math.round(sec/60),IF:.8,tss:0,lvl:null};
}
function startDemo(){setView3d(true);openPlayer(demoWorkout())}
/* ---------- route ---------- */
/* snelheid in m/s bij een vermogen en helling (rijder + fiets, gewone rijhouding) */
function speedFor(w,g){
  const m=(state.profile.weight||75)+9,a=.5*1.2*.32,th=Math.atan(g/100),F=m*9.81*(Math.sin(th)+.004*Math.cos(th));
  const f=v=>a*v*v*v+F*v-Math.max(0,w)*.97;
  let lo=F<0?Math.sqrt(-F/(3*a)):0,hi=30;if(f(lo)>0)return Math.max(1,lo);
  for(let k=0;k<40;k++){const mid=(lo+hi)/2;if(f(mid)>0)hi=mid;else lo=mid}
  return clamp(lo,1,25);
}
const STEP=4;
function rng(seed){let x=seed|0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}}
/* hoogteprofiel van een route, voor het startpaneel: één keer per route uitgerekend */
const ROUTE_PROF={};
function routeProfile(id){
  if(ROUTE_PROF[id])return ROUTE_PROF[id];
  const C=buildCourse(id);
  const n=160,ys=[];for(let i=0;i<=n;i++)ys.push(C.Y[Math.round(i/n*C.N)]);const hi=Math.max(20,...ys);
  const pts=ys.map((y,i)=>`${(i/n*300).toFixed(1)},${(46-y/hi*40).toFixed(1)}`).join(' ');
  return ROUTE_PROF[id]={km:C.route.km,hm:Math.round(C.UPlap/10)*10,svg:`<svg class="rprof" viewBox="0 0 300 50" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,50 ${pts} 300,50"/></svg>`};
}
/* ---------- routes: rondjes met een eigen hoogteprofiel ----------
   Elke route is een gesloten ronde van een heel aantal kilometers, dus elke ronde ziet er precies hetzelfde uit.
   De weg ligt vast; je vermogen en de helling bepalen hoe snel je gaat (speedFor), niet andersom.
   zones: landschappen in km. klim: [begin km, lengte km, gemiddeld %]; na elke klim volgt een afdaling, zodat de ronde op dezelfde hoogte sluit. */
const ROUTES=[
  {id:'polder',name:'Polderronde',km:14,zones:[['polder',5],['meer',4],['polder',5]],klim:[[9.4,.5,3]],roll:.6},
  {id:'bos',name:'Bossen en meren',km:18,zones:[['bos',5],['meer',4],['polder',4],['bos',5]],klim:[[2,1.2,2.5],[13.4,1,3.5]],roll:1.5},
  {id:'heuvel',name:'Heuvelland',km:22,zones:[['polder',3],['heuvels',8],['bos',4],['heuvels',7]],klim:[[3.6,1.6,4.5],[7.2,.9,8],[10.2,1.2,5],[16,2,5.5],[19.8,.7,9]],roll:3},
  {id:'provence',name:'Provence',km:26,zones:[['provence',9],['heuvels',6],['provence',11]],klim:[[2.5,5,4.2],[13.5,2.5,5.5],[20.5,1.4,3.5]],roll:2.5},
  {id:'col',name:'De Col',km:30,zones:[['bos',4.5],['bergen',16.5],['bos',4],['meer',5]],klim:[[4.5,9.5,6.8]],roll:1.5}
];
const ROUTE_KEY='kopwerk.route';
const routeId=()=>{let v='';try{v=localStorage.getItem(ROUTE_KEY)||''}catch(e){}return ROUTES.some(r=>r.id===v)?v:'heuvel'};
function setRoute(id){try{localStorage.setItem(ROUTE_KEY,id)}catch(e){}}
/* positie binnen de ronde, ook voor afstanden voorbij één ronde of (bij de camera) net voor de start */
const wrapD=(C,d)=>((d%C.L)+C.L)%C.L;
const kAt=(C,d)=>Math.round(wrapD(C,d)/STEP)%C.N;
function buildCourse(id){
  const R=ROUTES.find(x=>x.id===(id||routeId()))||ROUTES[0],L=R.km*1000,N=Math.round(L/STEP);
  const seed=[...R.id].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7),r=rng(seed),C={L,lap:L,lapKm:R.km,N,seed,ph:r()*6,route:R,hp:[]};
  const zones=[];let zd=0;for(const [ty,km] of R.zones){zones.push({ty,a:zd,b:zd+km*1000,v:r()});zd+=km*1000}zones[zones.length-1].b=L;C.zones=zones;
  /* hoogte: klimmen omhoog, daarna een afdaling tot hooguit 2,5 keer de klimlengte of tot de volgende klim; wat overblijft wordt over de ronde verdeeld */
  const G=new Float32Array(N+1),cl=R.klim.map(([a,len,g])=>({a:a*1000,len:len*1000,g})).sort((x,y)=>x.a-y.a);C.climbs=cl;
  cl.forEach((c,i)=>{const nx=i<cl.length-1?cl[i+1].a:L+cl[0].a,room=Math.max(200,Math.min(nx-(c.a+c.len)-150,c.len*2.5)),dg=c.len*c.g/room;
    for(let k=0;k<=N;k++){const d=k*STEP;if(d>=c.a&&d<c.a+c.len)G[k]+=c.g;else{const e=((d-(c.a+c.len))%L+L)%L;if(e<room)G[k]-=dg}}});
  const H=new Float32Array(N+1);for(let k=1;k<=N;k++)H[k]=H[k-1]+G[k-1]*STEP/100;
  const err=H[N];for(let k=0;k<=N;k++)H[k]-=err*k/N;
  /* glooiing: kleine heuvels die in de ronde passen (hele golven per ronde) */
  const waves=[0,1,2].map(()=>({m:Math.max(2,Math.round(L/(500+r()*900))),p:r()*6,a:.4+r()*.6}));
  for(let k=0;k<=N;k++){const u=k/N;let h=0;for(const w of waves)h+=w.a*Math.sin(u*Math.PI*2*w.m+w.p);H[k]+=h*R.roll/2}
  /* afvlakken rond (de ronde loopt door), en hoogte nooit onder nul */
  const Y=new Float32Array(N+1),RW=10;for(let k=0;k<N;k++){let s=0;for(let j=-RW;j<=RW;j++)s+=H[((k+j)%N+N)%N];Y[k]=s/(2*RW+1)}Y[N]=Y[0];
  let lo=1e9;for(const y of Y)lo=Math.min(lo,y);for(let k=0;k<=N;k++)Y[k]-=lo;
  const UP=new Float32Array(N+1);for(let k=1;k<=N;k++)UP[k]=UP[k-1]+Math.max(0,Y[k]-Y[k-1]);C.UPlap=UP[N];
  /* vorm: een gesloten bocht met een paar grote golven en, in heuvels, bos en bergen, kleinere slingers */
  const M=4096,amps=[2,3,4,5].map(k=>({k,a:(.05+r()*.07)/k,p:r()*6})),wig=[0,1,2].map(()=>{const m=Math.max(2,Math.round(L/(350+r()*500))),lam=L/m,amax=lam*lam/(4*Math.PI*Math.PI*130)/1.3;return {m,a:Math.min(amax,6+r()*16),p:r()*6}});
  const zoneW={polder:.2,meer:.35,provence:.6,heuvels:1,bos:.8,bergen:1.3},envAt=u=>{const d=u*L;let w=0,tot=0;for(const z of zones){let e=1e9;for(const sh of[-L,0,L])e=Math.min(e,Math.max(z.a+sh-d,d-z.b-sh,0));const t=1-clamp(e/400,0,1);w+=t*(zoneW[z.ty]??.6);tot+=t}return tot?w/tot:.5};
  const shape=R0=>{const P=[];for(let i=0;i<=M;i++){const t=i/M*Math.PI*2;let rr=1;for(const q of amps)rr+=q.a*Math.cos(q.k*t+q.p);P.push([R0*rr*Math.cos(t),R0*rr*Math.sin(t)])}
    /* slingers loodrecht op de weg */
    const Q=[];for(let i=0;i<=M;i++){const a=P[(i+M-1)%M],b=P[(i+1)%M],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,u=i/M;let w=0;for(const q of wig)w+=q.a*Math.sin(u*Math.PI*2*q.m+q.p);w*=envAt(u);Q.push([P[i][0]-dz/l*w,P[i][1]+dx/l*w])}
    Q[M]=Q[0];let len=0;for(let i=1;i<=M;i++)len+=Math.hypot(Q[i][0]-Q[i-1][0],Q[i][1]-Q[i-1][1]);return {Q,len}};
  let R0=L/(2*Math.PI),sh=shape(R0);R0*=L/sh.len;sh=shape(R0);R0*=L/sh.len;sh=shape(R0);
  /* gelijke stappen van STEP meter langs de weg */
  const X=new Float32Array(N+1),Z=new Float32Array(N+1),HD=new Float32Array(N+1),K=new Float32Array(N+1),Q=sh.Q;
  let acc=0,i=1;X[0]=Q[0][0];Z[0]=Q[0][1];
  for(let k=1;k<N;k++){const want=k*sh.len/N;while(i<M&&acc+Math.hypot(Q[i][0]-Q[i-1][0],Q[i][1]-Q[i-1][1])<want){acc+=Math.hypot(Q[i][0]-Q[i-1][0],Q[i][1]-Q[i-1][1]);i++}
    const sl=Math.hypot(Q[i][0]-Q[i-1][0],Q[i][1]-Q[i-1][1])||1,f=clamp((want-acc)/sl,0,1);X[k]=Q[i-1][0]+(Q[i][0]-Q[i-1][0])*f;Z[k]=Q[i-1][1]+(Q[i][1]-Q[i-1][1])*f}
  X[N]=X[0];Z[N]=Z[0];
  let prev=null;for(let k=0;k<=N;k++){const a=k<N?k:0,b=(a+1)%N;let h=Math.atan2(X[b]-X[a],-(Z[b]-Z[a]));if(prev!=null){while(h-prev>Math.PI)h-=Math.PI*2;while(h-prev<-Math.PI)h+=Math.PI*2}HD[k]=h;prev=h}
  for(let k=0;k<N;k++)K[k]=(HD[k+1]-HD[k])/STEP;K[N]=K[0];
  Object.assign(C,{X,Z,HD,K,Y,UP});
  /* dorpen waar de weg doorheen loopt (niet midden op een steile klim) */
  const NAMES2={heuvels:['Epen','Slenaken','Gulpen','Wahlwiller','Mechelen','Eys','Noorbeek'],provence:['Lourmarin','Bonnieux','Gordes','Ménerbes','Sault','Bédoin','Venasque'],bergen:['Saint-Véran','Valloire','Huez','Bourg-Doisans','Vaujany','Oz']},NAMES=['Oosterwold','Hoogveen','Kerkdriel','Molenhoek','Westerbroek','Zandvoorde','Lindewijk','Ellecom','Bergharen','Nieuwlande','Aldeboarn','Holterberg','Vierhouten','Oudemirdum','Wijnaldum','Boxmeer'].sort(()=>r()-.5);
  const grAt=d=>Math.abs(Y[kAt(C,d+160)]-Y[kAt(C,d)])/160*100;
  C.villages=[];for(const zn of zones){let d=zn.a+(zn.b-zn.a)*(.3+r()*.4);for(let t=0;t<8&&grAt(d)>3;t++)d=zn.a+(zn.b-zn.a)*(.15+r()*.7);
    if(grAt(d)<=3.5&&(zn.ty==='polder'||zn.ty==='heuvels'||zn.ty==='provence'||(zn.ty==='meer'&&r()<.6)||(zn.ty==='bergen'&&r()<.6)))C.villages.push({d,len:170+r()*110,ty:zn.ty,name:(NAMES2[zn.ty]||NAMES)[Math.floor(r()*(NAMES2[zn.ty]||NAMES).length)]})}
  /* herkenningspunten: een rij windmolens in de polder of bij het meer, een kasteel op een heuvel, luchtballonnen */
  C.marks=[];for(const zn of zones){const len=zn.b-zn.a;
    if((zn.ty==='polder'||zn.ty==='meer')&&zn.v<.65){const side=zn.ty==='meer'?1:(r()<.5?-1:1),n=3+Math.floor(r()*4),d0=zn.a+len*(.15+r()*.3);for(let i=0;i<n;i++)C.marks.push({k:'turbine',d:d0+i*(170+r()*60),off:side*(74+r()*14)})}
    if((zn.ty==='heuvels'||zn.ty==='provence')&&zn.v>.3)C.marks.push({k:'kasteel',d:zn.a+len*(.3+r()*.4),off:(r()<.5?-1:1)*(70+r()*12)});
    if(zn.ty!=='bergen'&&r()<.6)for(let i=0;i<1+Math.floor(r()*3);i++)C.marks.push({k:'ballon',d:zn.a+len*r(),off:(r()<.5?-1:1)*(110+r()*260),h:45+r()*110,c:r()});
  }
  C.canals=[];for(const zn of zones)if(zn.ty==='polder')for(let d=zn.a+600+r()*400;d<zn.b-300;d+=1100+r()*700)if(Math.abs(K[kAt(C,d)])<.004&&!C.villages.some(v=>Math.abs(v.d-d)<v.len/2+80))C.canals.push(d);
  return C;
}
/* Iets dat gemiddeld elke P meter terugkomt, maar op wisselende afstanden (van 0,35 tot 1,85 keer P) en per rit op andere plekken:
   een vast ritme (elke 650 m een boerderij) voelt al snel als dezelfde beelden. ev: ligt er een op [d, d+7)? run: zitten we in een stuk van len meter? */
function evList(C,key,P){const E=C.ev||(C.ev={});let a=E[key];if(a)return a;a=E[key]=[];
  const r=rng(C.seed^[...key].reduce((h,c)=>h*31+c.charCodeAt(0)|0,17));let x=P*r();while(x<C.L){a.push(x);x+=P*(.35+r()*1.5)}return a}
function ev(C,key,P,d){d=wrapD(C,d);const a=evList(C,key,P);let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<d)lo=m+1;else hi=m}return lo<a.length&&a[lo]<d+7}
function run(C,key,P,len,d){d=wrapD(C,d);const a=evList(C,key,P);let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<=d)lo=m+1;else hi=m}return lo>0&&d-a[lo-1]<len}
function roadAt(C,d){
  const f=clamp(wrapD(C,d)/STEP,0,C.N-.001),k=Math.floor(f),u=f-k,lerp=(A)=>A[k]+(A[k+1]-A[k])*u;
  return {x:lerp(C.X),y:lerp(C.Y),z:lerp(C.Z),h:lerp(C.HD),k:C.K[k]};
}
function zoneAt(C,d){d=wrapD(C,d);let lo=0,hi=C.zones.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(C.zones[m].a<=d)lo=m;else hi=m-1}return C.zones[lo]}
const villageW=(C,d)=>{d=wrapD(C,d);let w=0;for(const v of C.villages){let e=Math.abs(d-v.d);e=Math.min(e,C.L-e);const t=1-clamp((e-v.len/2)/50,0,1);if(t>w)w=t}return w};
const canalAt=(C,d)=>{d=wrapD(C,d);for(const c of C.canals)if(Math.abs(c-d)<12)return d-c;return null};
/* gewicht per landschap rond een grens, zodat het ene landschap geleidelijk overgaat in het volgende */
function landMix(C,d){
  d=wrapD(C,d);const z=zoneAt(C,d),i=C.zones.indexOf(z),m={polder:0,heuvels:0,bergen:0,meer:0,provence:0,bos:0},B=350;
  const toNext=z.b-d,fromPrev=d-z.a;
  const nZ=C.zones[(i+1)%C.zones.length],pZ=C.zones[(i-1+C.zones.length)%C.zones.length];
  if(toNext<B){const w=.5-toNext/B/2;m[z.ty]+=1-w;m[nZ.ty]+=w}
  else if(fromPrev<B){const w=.5-fromPrev/B/2;m[z.ty]+=1-w;m[pZ.ty]+=w}
  else m[z.ty]=1;
  return m;
}
const nz=(a,b)=>Math.sin(a*.013+b*.021)*.5+Math.sin(a*.031-b*.017+1.7)*.3+Math.sin(a*.071+b*.053+.3)*.2;
/* Hoogte van het land naast de weg (off = meters naar rechts). Het land klimt met de weg mee;
   in heuvels en bergen ligt de weg tegen een helling: aan de ene kant omhoog, aan de andere kant het dal in. */
function landH(C,d,off,mix,ry){
  const ao=Math.abs(off),near=clamp((ao-4.4)/20,0,1),n=nz(d,off),sd=clamp(Math.sin(d/1300+C.ph)*3,-1,1);
  const side=Math.tanh(off/60)*60*sd,wall=t=>Math.pow(clamp((ao-t)/45,0,1),1.5);
  let h=0;
  if(mix.polder){const c=canalAt(C,d);h+=mix.polder*(-.6*near+(ao>11&&ao<14?-1.2:0)+(c!=null&&ao>4.2?-2.6*clamp((7-Math.abs(c))/2,0,1):0)+wall(60)*4)}
  if(mix.heuvels){const hw=clamp((Math.sin(d/650+C.ph*2)-.55)/.2,0,1);h+=mix.heuvels*(near*(side*.25+3+5*n)+wall(35)*38*(.7+.3*n)+hw*clamp((ao-4.7)/1.6,0,1)*2.6)}
  h+=mix.provence*(near*(side*.12+1.5+3.5*n)+wall(45)*22*(.7+.3*n));
  h+=mix.bergen*(near*(side*.5+3+4*n)+wall(22)*80*(.6+.4*n));
  h+=mix.bos*(near*(side*.1+1+2.5*n)+wall(40)*14*(.7+.3*n));
  h+=mix.meer*(off<0?(ao>20?-2.6-near*2.5:-.4*near):near*(2+3*n)+wall(40)*30);
  const vw=villageW(C,d);if(vw>0)h*=1-vw*clamp((60-ao)/30,0,1);
  return ry+h-(ao<4.4?.08:.2)+(vw>0&&ao>4.4&&ao<7.2?vw*.2:0);
}

/* ---------- bouwstenen ---------- */
function partsGeo(parts){
  const T=T3;let pos=[],nor=[],col=[],pat=[],hasPat=false;
  for(const [g0,c,m,pt] of parts){if(pt)hasPat=true;
    const g=(g0.index?g0.toNonIndexed():g0);if(m)g.applyMatrix4(m);if(!g.attributes.normal)g.computeVertexNormals();
    const p=g.attributes.position.array,nn=g.attributes.normal.array,cc=new T.Color(c),vc=g.attributes.color&&g.attributes.color.array;
    for(let i=0;i<p.length;i+=3){const ao=.68+.32*clamp(p[i+1]/1.6,0,1);pos.push(p[i],p[i+1],p[i+2]);nor.push(nn[i],nn[i+1],nn[i+2]);if(vc)col.push(vc[i]*ao,vc[i+1]*ao,vc[i+2]*ao);else col.push(cc.r*ao,cc.g*ao,cc.b*ao);pat.push(pt||0)}
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));if(hasPat)g.setAttribute('pat',new T.Float32BufferAttribute(pat,1));
  return g;
}
const M4=(x,y,z,sx,sy,sz,ry)=>{const T=T3,m=new T.Matrix4();m.compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,ry||0,0)),new T.Vector3(sx??1,sy??sx??1,sz??sx??1));return m};
function propGeos(){
  const T=T3,G={};
  G.huis=partsGeo([[new T.BoxGeometry(5,3,7),'#efe6d8',M4(0,1.5,0)],[new T.CylinderGeometry(2.9,2.9,7.2,3,1),'#a8463a',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2);m.premultiply(new T.Matrix4().makeRotationZ(Math.PI/2));m.setPosition(0,3.9,0);m.scale(new T.Vector3(1,.6,1));return m})()],[new T.BoxGeometry(.9,1.1,.1),'#3b4a5a',M4(1,1.6,3.52)]]);
  G.schuur=partsGeo([[new T.BoxGeometry(7,4,10),'#7c3b32',M4(0,2,0)],[new T.CylinderGeometry(4,4,10.2,3,1),'#3e3e44',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2);m.premultiply(new T.Matrix4().makeRotationZ(Math.PI/2));m.setPosition(0,5,0);m.scale(new T.Vector3(1,.5,1));return m})()]]);
  G.koe=partsGeo([[new T.BoxGeometry(.9,.9,1.9),'#f4f1ea',M4(0,1.05,0)],[new T.BoxGeometry(.5,.35,.6),'#2b2b2b',M4(.18,1.25,.2)],[new T.BoxGeometry(.5,.55,.55),'#2b2b2b',M4(0,1.35,1.15)],
    ...[[-.3,-.7],[.3,-.7],[-.3,.7],[.3,.7]].map(([x,z])=>[new T.BoxGeometry(.18,.6,.18),'#2b2b2b',M4(x,.3,z)])]);
  G.riet=partsGeo([0,1,2,3,4].map(i=>[new T.ConeGeometry(.12,1.8+i%3*.4,4),i%2?'#a9b25a':'#8e9a48',M4(Math.cos(i*1.3)*.5,.9,Math.sin(i*1.3)*.5)]));
  G.boot=partsGeo([[new T.BoxGeometry(1.6,.6,4.4),'#f2f2f2',M4(0,.3,0)],[new T.CylinderGeometry(.05,.05,5,4),'#555',M4(0,3,0)],[new T.ConeGeometry(1.7,4.4,3),'#ffffff',M4(0,3,-.6,.08,1,1)]]);
  G.top=partsGeo([[new T.ConeGeometry(1,1,7),'#7d8290',M4(0,.5,0)],[new T.ConeGeometry(.36,.36,7),'#f4f6fa',M4(0,.82,0)]]);
  G.wolk=partsGeo([[new T.IcosahedronGeometry(6,0),'#ffffff',M4(0,0,0)],[new T.IcosahedronGeometry(4.5,0),'#ffffff',M4(6,-1,1)],[new T.IcosahedronGeometry(4,0),'#ffffff',M4(-6,-1,-1)]]);
  G.paal=partsGeo([[new T.BoxGeometry(.12,1,.12),'#f4f4f0',M4(0,.5,0)],[new T.BoxGeometry(.125,.2,.125),'#222',M4(0,.78,0)],[new T.BoxGeometry(.13,.08,.04),'#ff8a1f',M4(0,.88,-.05)]]);
  G.reling=partsGeo([[new T.BoxGeometry(.1,1.1,.1),'#e8e8e8',M4(0,.55,0)],[new T.BoxGeometry(.08,.08,1.6),'#e8e8e8',M4(0,1.05,.8)],[new T.BoxGeometry(.06,.06,1.6),'#e8e8e8',M4(0,.6,.8)]]);
  G.brugwand=partsGeo([[new T.BoxGeometry(.5,2.6,2.1),'#9b5a43',M4(0,-1.3,0)]]);
  G.kerk=partsGeo([[new T.BoxGeometry(7,7,13),'#c9b9a3',M4(0,3.5,0)],[new T.CylinderGeometry(4.6,4.6,13.2,3,1),'#4a4d55',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2);m.premultiply(new T.Matrix4().makeRotationZ(Math.PI/2));m.setPosition(0,8.6,0);m.scale(new T.Vector3(1,.55,1));return m})()],
    [new T.BoxGeometry(4,15,4),'#c9b9a3',M4(0,7.5,-7.5)],[new T.ConeGeometry(3,9,4),'#4a4d55',M4(0,19.5,-7.5,1,1,1,Math.PI/4)]]);
  G.baal=partsGeo([[new T.CylinderGeometry(.75,.75,1.3,10),'#d9c27a',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(0,.75,0);return m})()]]);
  G.blob=new T.CircleGeometry(1,12).rotateX(-Math.PI/2);
  /* ---- gebouwen: voorgevel met ramen en deur richting +z ---- */
  const prism=(w,rh,len,ov)=>{const s=new T.Shape();s.moveTo(-w/2-ov,0);s.lineTo(w/2+ov,0);s.lineTo(0,rh);s.closePath();return new T.ExtrudeGeometry(s,{depth:len+ov*2,bevelEnabled:false}).translate(0,0,-len/2-ov)};
  const house=o=>{
    const {w,d,h,wall,roof,rh=3,gable=true,floors=Math.max(1,Math.floor(h/2.7)),door='#3d5a4a',frame='#f1ede4',chim=true}=o,P=[];
    P.push([new T.BoxGeometry(w,h,d),wall,M4(0,h/2,0)]);
    if(gable)P.push([prism(w,rh,d,.35),roof,M4(0,h,0)]);
    else{const m=new T.Matrix4().makeRotationY(Math.PI/2);m.setPosition(0,h,0);P.push([prism(d,rh,w,.35),roof,m])}
    const cols=Math.max(1,Math.round(w/2.2)),dx=w/cols;
    for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){
      const x=-w/2+dx*(c+.5),y=1.5+f*2.7;if(f===0&&c===Math.floor(cols/2)&&o.door!==false){P.push([new T.BoxGeometry(1,2.1,.08),door,M4(x,1.05,d/2+.03)]);continue}
      P.push([new T.BoxGeometry(1.05,1.3,.05),frame,M4(x,y,d/2+.02)],[new T.BoxGeometry(.85,1.1,.06),'#33404d',M4(x,y,d/2+.04)]);
      P.push([new T.BoxGeometry(1.05,1.3,.05),frame,M4(x,y,-d/2-.02)],[new T.BoxGeometry(.85,1.1,.06),'#33404d',M4(x,y,-d/2-.04)]);
    }
    if(gable&&h>3.5){P.push([new T.BoxGeometry(.8,1,.05),frame,M4(0,h+rh*.38,d/2+.37)],[new T.BoxGeometry(.6,.8,.06),'#33404d',M4(0,h+rh*.38,d/2+.39)])}
    if(chim)P.push([new T.BoxGeometry(.6,1.6,.6),'#7a4436',M4(w*.25,h+rh*.6,-d*.2)]);
    if(o.awning)P.push([new T.BoxGeometry(w*.9,.12,1.6),o.awning,(()=>{const m=new T.Matrix4().makeRotationX(.35);m.setPosition(0,2.9,d/2+.75);return m})()]);
    return partsGeo(P);
  };
  G.rood=house({w:6,d:8,h:5.6,wall:'#9c4a36',roof:'#3b3f46'});
  G.wit=house({w:5.4,d:7,h:5.8,wall:'#ece6da',roof:'#a8463a'});
  G.geel=house({w:8,d:9,h:3.1,wall:'#c8a777',roof:'#5a4a3f',gable:false,rh:2.6});
  G.rij=house({w:15,d:8,h:6.2,wall:'#8c4b3a',roof:'#3a3d44',gable:false,rh:3.2,door:'#2b3b55'});
  G.winkel=house({w:8,d:10,h:4.2,wall:'#d9d2c4',roof:'#4a4d55',gable:false,rh:2.2,awning:'#2e7d6b',door:'#2b2b2b',chim:false});
  G.boerderij=house({w:10,d:20,h:3.4,wall:'#93503d',roof:'#5d5248',rh:6.5,frame:'#e8e2d4',door:'#2f5d3a'});
  G.chalet=house({w:8,d:9,h:5,wall:'#8a5a35',roof:'#4d4b4b',rh:2.4,gable:true,frame:'#f2e8d8',door:'#5a3a22'});
  /* straatmeubilair */
  G.lamp=partsGeo([[new T.CylinderGeometry(.07,.1,5,6),'#3a3f46',M4(0,2.5,0)],[new T.BoxGeometry(.08,.08,1.2),'#3a3f46',M4(0,4.95,-.55)],[new T.BoxGeometry(.35,.15,.55),'#2f3439',M4(0,4.85,-1.1)],[new T.BoxGeometry(.28,.04,.45),'#fff4cc',M4(0,4.76,-1.1)]]);
  G.bushok=partsGeo([[new T.BoxGeometry(3.4,.12,1.6),'#3a3f46',M4(0,2.45,0)],[new T.BoxGeometry(3.3,2.3,.05),'#b8cfd8',M4(0,1.25,.7)],[new T.BoxGeometry(.05,2.3,1.4),'#b8cfd8',M4(-1.65,1.25,0)],
    [new T.BoxGeometry(.08,2.4,.08),'#3a3f46',M4(1.66,1.2,-.75)],[new T.BoxGeometry(2.4,.08,.45),'#7a5a3a',M4(0,.5,.35)],[new T.BoxGeometry(.6,1.2,.06),'#f2c230',M4(1.2,1.6,.73)]]);
  G.bank=partsGeo([[new T.BoxGeometry(1.8,.07,.45),'#8a6a4a',M4(0,.48,0)],[new T.BoxGeometry(1.8,.4,.06),'#8a6a4a',M4(0,.75,.2)],[new T.BoxGeometry(.08,.48,.4),'#3a3f46',M4(-.75,.24,0)],[new T.BoxGeometry(.08,.48,.4),'#3a3f46',M4(.75,.24,0)]]);
  G.heg=partsGeo([0,1,2,3,4].map(i=>[new T.IcosahedronGeometry(.62,1),i%2?'#3f8a36':'#4a9a3e',M4(0,.6,.4+i*.85,1,.95,1)]));
  G.tuinhek=partsGeo([0,1,2,3,4,5,6,7].map(i=>[new T.BoxGeometry(.07,.8,.08),'#f2f0ea',M4(0,.4,i*.5)]).concat([[new T.BoxGeometry(.05,.07,4),'#f2f0ea',M4(0,.6,1.75)]]));
  /* polder */
  G.schaap=partsGeo([[new T.IcosahedronGeometry(.55,1),'#f1efe8',M4(0,.75,0,.9,.8,1.3)],[new T.BoxGeometry(.28,.3,.38),'#2b2b2b',M4(0,.95,.75)],...[[-.2,-.4],[.2,-.4],[-.2,.4],[.2,.4]].map(([x,z])=>[new T.BoxGeometry(.1,.45,.1),'#2b2b2b',M4(x,.22,z)])]);
  G.silo=partsGeo([[new T.CylinderGeometry(1.8,1.8,9,14),'#c9ccd1',M4(0,4.5,0)],[new T.SphereGeometry(1.8,14,6,0,Math.PI*2,0,Math.PI/2),'#9aa0a6',M4(0,9,0)]]);
  G.trekker=partsGeo([[new T.BoxGeometry(1.6,1,2.6),'#3f8a3a',M4(0,1.1,.2)],[new T.BoxGeometry(1.4,1.4,1.2),'#3f8a3a',M4(0,1.9,-.6)],[new T.BoxGeometry(1.3,1,1.1),'#a9cbd6',M4(0,2.2,-.6)],
    ...[-.95,.95].map(x=>[new T.CylinderGeometry(.75,.75,.45,14),'#222',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(x,.75,-.7);return m})()]),...[-.85,.85].map(x=>[new T.CylinderGeometry(.42,.42,.3,12),'#222',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(x,.42,1.2);return m})()])]);
  /* auto met ronde vormen: carrosserie en dak als uitgerekt zijprofiel met afgeronde randen, ramen die de lucht weerspiegelen, wielen met velgen */
  const side=(pts,depth,bev)=>{const sh=new T.Shape();sh.moveTo(...pts[0]);for(const q of pts.slice(1))q.length>2?sh.quadraticCurveTo(...q):sh.lineTo(...q);sh.closePath();
    return new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelThickness:bev,bevelSize:bev*.8,bevelSegments:3,curveSegments:5}).translate(0,0,-depth/2).rotateY(Math.PI/2)};
  G.auto=partsGeo([[side([[-2.05,.3],[-2.05,.6],[-2.03,.82,-1.7,.88],[1.65,.92],[2.07,.88,2.08,.6],[2.08,.3]],1.5,.12),'#ffffff',null,1],
    [side([[-1.02,.9],[-.35,1.36],[.85,1.36],[1.55,.92]],1.36,.07),'#30455a',null,6],
    [side([[-.42,1.34],[-.38,1.44],[.86,1.44],[.92,1.34]],1.42,.05),'#ffffff',null,1],
    ...[-.69,.69].flatMap(x=>[[new T.BoxGeometry(.08,.46,.12),'#ffffff',M4(x,1.13,-.25),1],[new T.BoxGeometry(.08,.42,.14),'#ffffff',M4(x,1.12,-1.05),1]]),
    ...[-1,1].flatMap(sz=>[[new T.BoxGeometry(1.62,.16,.12),'#3a3d42',M4(0,.36,sz*2.16),1],...[-.55,.55].map(x=>[new T.BoxGeometry(.34,.13,.06),sz<0?'#d4232a':'#fff3c4',M4(x,.7,sz*2.13),1])]),
    ...[[-.8,1.32],[.8,1.32],[-.8,-1.32],[.8,-1.32]].flatMap(([x,z])=>[[new T.CylinderGeometry(.34,.34,.24,18),'#1c1c1c',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(x,.34,z);return m})(),1],
      [new T.CylinderGeometry(.2,.2,.25,10),'#c9ccd1',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(x*1.02,.34,z);return m})(),1]])]);
  /* toeschouwer: broek, schoenen, shirt, huid en haar of pet. Onderdelen met patroon 1 (shirt, pet, vlag) krijgen de kleur per persoon */
  const person=o=>{const P=[],skin='#e0aa86',{legs='#34405a',hair='#4a3426',cap=false,walk=0}=o,cy=(r0,r1)=>new T.CylinderGeometry(r0,r1,1,6,1,true);
    for(const s of[-1,1]){const sw=walk*s;P.push([cy(.072,.06),legs,tubeM([s*.09,.92,0],[s*.1,.1,sw*.2]),0],[new T.BoxGeometry(.1,.08,.24),'#2a2a2a',RM(s*.1,.05,sw*.2-.05),0])}
    P.push([new T.CapsuleGeometry(.16,.42,2,8),'#ffffff',RM(0,1.17,0,0,0,0,1.15,1,.72),1],[cy(.05,.055),skin,tubeM([0,1.42,0],[0,1.53,0]),0],[new T.SphereGeometry(.108,8,6),skin,RM(0,1.61,0,0,0,0,.95,1.06,1),0]);
    if(cap)P.push([new T.SphereGeometry(.116,8,4,0,Math.PI*2,0,Math.PI/2.1),'#ffffff',RM(0,1.635,0),1],[new T.CylinderGeometry(.1,.1,.015,8),'#ffffff',RM(0,1.64,-.1),1]);
    else P.push([new T.SphereGeometry(.115,8,4,0,Math.PI*2,0,Math.PI/2.2),hair,RM(0,1.625,.012),0]);
    for(const [s,el,ha] of o.arms){const sh=[s*.2,1.37,0];P.push([cy(.058,.052),'#ffffff',tubeM(sh,el),1],[cy(.045,.04),skin,tubeM(el,ha),0],[new T.IcosahedronGeometry(.05,0),skin,RM(...ha),0])}
    return partsGeo(P)};
  G.mens=person({arms:[[-1,[-.27,1.08,.02],[-.24,.83,-.1]],[1,[.27,1.08,.02],[.24,.83,-.1]]]});
  G.mens2=person({hair:'#c99a4e',legs:'#2b2f36',arms:[[-1,[-.36,1.62,-.03],[-.42,1.9,-.06]],[1,[.36,1.62,-.03],[.42,1.9,-.06]]]});
  G.mens3=person({cap:true,legs:'#8a7a5c',arms:[[-1,[-.27,1.08,.02],[-.2,.86,-.12]],[1,[.38,1.52,0],[.34,1.84,.04]]]});
  G.vlag=partsGeo([[new T.CylinderGeometry(.02,.02,2.6,4),'#ddd',M4(.35,1.6,0),0],[new T.BoxGeometry(.9,.6,.02),'#ffffff',M4(.82,2.55,0),1]]);
  G.erf=partsGeo([[new T.CircleGeometry(1,16).rotateX(-Math.PI/2),'#a39478',null]]);
  /* heuvels */
  G.kapel=partsGeo([[new T.BoxGeometry(2.4,2.6,3),'#efe9dd',M4(0,1.3,0)],[prism(2.4,1.6,3,.2),'#7a3b30',M4(0,2.6,0)],[new T.BoxGeometry(.9,1.6,.06),'#3b2b22',M4(0,.8,1.53)],[new T.BoxGeometry(.08,.9,.08),'#3b2b22',M4(0,4.7,1.2)],[new T.BoxGeometry(.5,.08,.08),'#3b2b22',M4(0,4.85,1.2)]]);
  /* bergen */
  G.kmsteen=partsGeo([[new T.BoxGeometry(.4,.7,.25),'#f0ede6',M4(0,.35,0)],[new T.BoxGeometry(.42,.22,.27),'#c8392e',M4(0,.78,0)]]);
  /* rotsblok: een paar grillige brokken met platte vlakken en mos op de bovenkant; het onderste deel zit in de grond */
  const rock=(parts,seed)=>{const r=rng(seed),out=[],c=new T.Color(),moss=new T.Color('#6f8f4a');
    for(const [x,y,z,s] of parts){const g=new T.IcosahedronGeometry(s,1),p=g.attributes.position,ph=r()*6;
      for(let j=0;j<p.count;j++){const vx=p.getX(j)/s,vy=p.getY(j)/s,vz=p.getZ(j)/s,k=1+.2*Math.sin(vx*3.8+ph)*Math.cos(vz*3.1-vy*2+ph)+.09*Math.sin(vy*7.3+ph);p.setXYZ(j,vx*k*s*1.15+x,vy*k*s*.72+y,vz*k*s+z)}
      g.computeVertexNormals();const n=g.attributes.normal,cl=[];
      for(let f=0;f<p.count;f+=3){const ny=n.getY(f);c.set('#8d8780').multiplyScalar(.85+.3*r());if(ny>.62)c.lerp(moss,.55);for(let k=0;k<3;k++)cl.push(c.r,c.g,c.b)}
      g.setAttribute('color',new T.Float32BufferAttribute(cl,3));out.push([g,'#ffffff',null])}
    return partsGeo(out)};
  G.rotsblok=rock([[0,.32,0,.9],[.8,.18,.45,.6],[-.7,.12,-.4,.5]],5);G.rots=rock([[0,.25,0,.8],[.6,.1,.3,.45]],9);
  /* meer */
  G.steiger=partsGeo([[new T.BoxGeometry(2,.12,16),'#9a7a55',M4(0,.6,-8)],...[0,1,2,3,4].map(i=>[new T.CylinderGeometry(.1,.1,2.4,5),'#6b5238',M4(-.9,-.2,-i*4)]),...[0,1,2,3,4].map(i=>[new T.CylinderGeometry(.1,.1,2.4,5),'#6b5238',M4(.9,-.2,-i*4)])]);
  G.zwaan=partsGeo([[new T.IcosahedronGeometry(.3,1),'#fafafa',M4(0,.15,0,1,.6,1.6)],[new T.CylinderGeometry(.05,.06,.5,5),'#fafafa',M4(0,.45,.35)],[new T.BoxGeometry(.06,.06,.15),'#f08a24',M4(0,.68,.45)]]);
  G.parasol=partsGeo([[new T.CylinderGeometry(.03,.03,2.2,5),'#ddd',M4(0,1.1,0)],[new T.ConeGeometry(1.3,.6,8),'#e04848',M4(0,2.2,0)]]);

  /* ===== animatiefilm-stijl: ronde, zachte vormen en warme kleuren ===== */
  const ball=(r,c,x,y,z,sx,sy,sz,det)=>[new T.IcosahedronGeometry(r,det??(r>3?2:r<.3?0:1)),c,M4(x,y,z,sx||1,sy||sx||1,sz||sx||1)];
  const stam=(r0,r1,h,c)=>[new T.CylinderGeometry(r0,r1,h,8),c||'#7a5236',M4(0,h/2,0)];
  /* ===== natuur: bomen met zachte, ronde kruinen ===== */
  /* kruin: een tros bobbelige bollen; licht van boven, donkerder van onder en binnen. De normalen wijzen deels vanuit het midden
     van de hele kruin naar buiten, zodat de kruin als één zacht volume oplicht. det 0 = eenvoudige versie voor bomen ver van de weg */
  const crown=(blobs,col,det)=>{
    let cx=0,cy=0,cz=0,ymin=1e9,ymax=-1e9,R=0;
    for(const b of blobs){cx+=b[0];cy+=b[1];cz+=b[2];ymin=Math.min(ymin,b[1]-b[3]*(b[5]||1));ymax=Math.max(ymax,b[1]+b[3]*(b[5]||1))}
    cx/=blobs.length;cy/=blobs.length;cz/=blobs.length;for(const b of blobs)R=Math.max(R,Math.hypot(b[0]-cx,b[1]-cy,b[2]-cz)+b[3]);
    const lo=new T.Color(col).offsetHSL(-.015,-.03,-.16),hi=new T.Color(col).offsetHSL(.03,.06,.1),c=new T.Color();
    /* bewust geen [x,y,z,r,sx=1,...]: Safari op de iPhone struikelt over standaardwaarden bij destructureren */
    return blobs.map(B=>{const x=B[0],y=B[1],z=B[2],r=B[3],sx=B[4]??1,sy=B[5]??1,sz=B[6]??1;
      const g=new T.IcosahedronGeometry(r,det===2?(r>=1.3?2:1):det),p=g.attributes.position,n=g.attributes.normal,cl=[],ph=x*3.1+z*1.7+y;
      for(let i=0;i<p.count;i++){let vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i);const k=1+.13*Math.sin(vx/r*4.1+vy/r*2.9+ph)*Math.cos(vz/r*3.7-vy/r*2.3+ph);
        vx=vx*k*sx+x;vy=vy*k*sy+y;vz=vz*k*sz+z;p.setXYZ(i,vx,vy,vz);
        const bx=vx-x,by=vy-y,bz=vz-z,bl=Math.hypot(bx,by,bz)||1,kx=vx-cx,ky=vy-cy,kz=vz-cz,kl=Math.hypot(kx,ky,kz)||1;
        const nx=bx/bl*.4+kx/kl*.6,ny=by/bl*.4+ky/kl*.6+.1,nz=bz/bl*.4+kz/kl*.6,nl=Math.hypot(nx,ny,nz);n.setXYZ(i,nx/nl,ny/nl,nz/nl);
        c.copy(lo).lerp(hi,clamp((vy-ymin)/(ymax-ymin)*.75+kl/R*.4-.1,0,1));cl.push(c.r,c.g,c.b)}
      g.setAttribute('color',new T.Float32BufferAttribute(cl,3));return [g,'#ffffff',null]});
  };
  /* stam of tak met vlekkerige schors; m = plaats en stand (standaard rechtop vanaf de grond) */
  let LO=false;const bark=(r0,r1,h,c1,c2,m,th=.15)=>{const g=new T.CylinderGeometry(r0,r1,h,LO?5:8,LO?1:4).translate(0,h/2,0),p=g.attributes.position,cl=[],a=new T.Color(c1),b=new T.Color(c2),c=new T.Color();
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);c.copy(a).lerp(b,Math.sin(x*9/r1+y*3.3)*Math.cos(z*8/r1-y*2.1)>th?1:0).multiplyScalar(.82+.18*y/h);cl.push(c.r,c.g,c.b)}
    g.setAttribute('color',new T.Float32BufferAttribute(cl,3));if(m)g.applyMatrix4(m);return [g,'#ffffff',null]};
  const tak=(x,y,z,lean,dir)=>new T.Matrix4().makeRotationZ(lean).premultiply(new T.Matrix4().makeRotationY(dir)).setPosition(x,y,z);
  /* naaldboom: lagen kegels die aan de rand iets hangen, onderaan donker */
  const tiers=(n,r0,h0,y0,col)=>{const out=[],lo=new T.Color(col).offsetHSL(0,-.03,-.12),hi=new T.Color(col).offsetHSL(.02,.04,.08),c=new T.Color();
    for(let i=0;i<n;i++){const r=r0*(1-i/(n+.6)),g=new T.ConeGeometry(r,h0*(1-i*.08),10,2),p=g.attributes.position,cl=[],yb=y0+i*h0*.5;
      for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j),rim=y<-h0*.4?1:0,a=Math.atan2(z,x);p.setXYZ(j,x*(1+.1*Math.sin(a*5+i)),y+yb+h0/2-rim*.18*(1+Math.sin(a*3+i)),z*(1+.1*Math.sin(a*5+i)));
        c.copy(lo).lerp(hi,clamp(.25+(y/h0+.5)*.6+i/n*.3,0,1));cl.push(c.r,c.g,c.b)}
      g.computeVertexNormals();g.setAttribute('color',new T.Float32BufferAttribute(cl,3));out.push([g,'#ffffff',null])}return out};
  const SP={
    boom:d=>[bark(.15,.25,2.9,'#7a5236','#5e3f29'),...crown([[0,3.5,0,1.2],[.95,3.85,.35,1],[-.9,3.75,-.3,1],[.25,4.6,-.45,.95],[-.35,4.5,.6,.9],[.55,4.95,.15,.75],[-.6,3.25,.75,.8],[.7,3.2,-.6,.75]],'#5aa83c',d)],
    eik:d=>[bark(.3,.5,3.6,'#6b4a32','#54392a'),bark(.12,.2,2.4,'#6b4a32','#54392a',tak(0,2.8,0,.75,.4)),bark(.11,.18,2.2,'#6b4a32','#54392a',tak(0,3,0,-.7,2.2)),
      ...crown([[0,5,0,1.7,1.15,.85,1.15],[1.7,5.4,.6,1.3],[-1.6,5.2,-.5,1.3],[.3,6.3,.2,1.2],[-.6,6.1,1.1,1],[1,6.1,-1,1],[-1.2,4.4,1.2,1],[1.3,4.4,-1.2,1],[0,4.3,1.6,.9],[2.2,4.6,-.3,.9],[-2.2,4.7,.4,.9]],'#4c9634',d)],
    berk:d=>[bark(.11,.17,4.6,'#efeae0','#3a3a3a',null,.62),...crown([[0,4.6,0,.85,1,1.3,1],[.45,5.4,.2,.7],[-.4,5.2,-.2,.7],[.1,6.1,0,.55],[.5,4.3,-.35,.6],[-.45,4.2,.35,.6]],'#9ccc5a',d)],
    populier:d=>[bark(.12,.17,1.7,'#7a5236','#5e3f29'),...crown(Array.from({length:7},(_,i)=>[Math.sin(i*2.1)*.15,1.9+i*.9,Math.cos(i*2.1)*.15,.78-Math.abs(i-2.5)*.06,1,1.25,1]),'#6cb245',d)],
    plataan:d=>[bark(.2,.3,5.2,'#d3cab0','#8f8a6c'),bark(.1,.16,2.6,'#d3cab0','#8f8a6c',tak(0,4.1,0,.62,.3)),bark(.1,.15,2.5,'#d3cab0','#8f8a6c',tak(0,4.3,0,-.6,2.6)),
      ...crown([[0,7,0,1.8,1.3,.75,1.3],[2,7.3,.6,1.4],[-1.9,7.1,-.5,1.4],[.4,8,.3,1.3],[-.8,7.9,1.3,1.1],[1.1,7.8,-1.3,1.1],[-1.5,6.5,1.5,1],[1.6,6.4,-1.5,1],[2.6,6.6,-.4,1],[-2.6,6.7,.5,1]],'#6f9e3c',d)],
    olijf:d=>[bark(.16,.27,1.5,'#857a66','#6b6252',tak(.1,0,0,.25,0)),bark(.1,.16,1.3,'#857a66','#6b6252',tak(-.15,1.1,0,-.55,0)),bark(.08,.13,1.1,'#857a66','#6b6252',tak(.1,1.2,.1,.4,1.6)),
      ...crown([[.3,2.4,0,.75,1.3,.7,1.2],[-.7,2.3,.4,.65,1.2,.7,1],[.9,2.7,-.4,.6,1.2,.7,1],[-.2,2.9,-.5,.6],[.1,2.6,.8,.55],[-1.1,2.6,-.3,.5],[1.2,2.2,.5,.5],[0,3.1,.2,.5]],'#97a873',d)],
    knotwilg:d=>[bark(.36,.44,2.2,'#7a6550','#5f4e3e'),...crown([[0,3,0,1.2,1.1,.9,1.1],[.7,3.5,.3,.8],[-.6,3.4,-.3,.8],[.1,3.9,-.2,.7],[-.2,3.6,.7,.65]],'#9bbd6c',d)],
    fruitboom:d=>[bark(.11,.16,1.5,'#7a5236','#5e3f29'),...crown([[0,2.2,0,.85,1,.85,1],[.6,2.4,.2,.6],[-.55,2.35,-.2,.6],[.1,2.8,0,.55],[.2,2,.6,.5]],'#6db84a',d),...[0,1,2,3,4,5].map(i=>ball(.11,'#e8402f',Math.cos(i*1.1)*.9,2+Math.sin(i*2)*.35,Math.sin(i*1.1)*.9))],
    struik:d=>[...crown([[0,.5,0,.65,1,.8,1],[.55,.45,.2,.5],[-.45,.42,-.2,.45],[.1,.75,-.15,.45]],'#4c9a38',d),...[0,1,2,3].map(i=>ball(.07,['#ff6fa0','#ffffff','#ffd23f'][i%3],Math.cos(i*1.6)*.6,.85,Math.sin(i*1.6)*.6))],
    cipres:()=>{const prof=[[0,.5],[.42,.9],[.72,1.8],[.78,2.9],[.66,4.3],[.42,5.6],[.18,6.5],[0,6.9]],g=new T.LatheGeometry(prof.map(([r,y])=>new T.Vector2(r,y)),10),p=g.attributes.position,cl=[],c=new T.Color(),lo=new T.Color('#24492b'),hi=new T.Color('#3f7a42');
      for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+.12*Math.sin(y*3.1+Math.atan2(z,x)*3);p.setXYZ(i,x*k,y,z*k);c.copy(lo).lerp(hi,clamp(y/7+.15*Math.sin(Math.atan2(z,x)+.5),0,1));cl.push(c.r,c.g,c.b)}
      g.computeVertexNormals();g.setAttribute('color',new T.Float32BufferAttribute(cl,3));return [bark(.1,.14,.9,'#5b4330','#46331f'),[g,'#ffffff',null]]},
    den:()=>[bark(.15,.22,1.8,'#6a4a30','#53381f'),...tiers(5,1.75,2.3,1.3,'#2f7a46')],
  };
  /* per soort drie versies: gewoon, ~ eenvoudig (verre bosrand), * extra rond (vlak langs de weg) */
  for(const k in SP){G[k]=partsGeo(SP[k](1));LO=true;G[k+'~']=partsGeo(SP[k](0));LO=false;if(['boom','eik','plataan','knotwilg'].includes(k))G[k+'*']=partsGeo(SP[k](2))}
  /* graspol: smalle sprieten die naar buiten buigen, onderaan donker en bovenaan licht, van twee kanten zichtbaar */
  const tuft=(n,h,c1,c2)=>{const pos=[],nor=[],cl=[],a=new T.Color(c1),b=new T.Color(c2);
    for(let i=0;i<n;i++){const ang=i*2.4+.3,lean=.25+(i%3)*.12,hh=h*(.6+((i*7)%5)/10),w=.03+((i*3)%4)*.008,dx=Math.cos(ang),dz=Math.sin(ang),ox=dx*.06*(i%2),oz=dz*.06*(i%2),v=[[ox-dz*w,0,oz+dx*w],[ox+dz*w,0,oz-dx*w],[ox+dx*hh*lean,hh,oz+dz*hh*lean]],nl=Math.hypot(dx*.35,1,dz*.35);
      for(const tri of[[0,1,2],[1,0,2]])for(const j of tri){pos.push(...v[j]);nor.push(dx*.35/nl,1/nl,dz*.35/nl);const c=j===2?b:a;cl.push(c.r,c.g,c.b)}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(cl,3));return g};
  G.pol=partsGeo([[tuft(11,.55,'#3d7a2b','#a3d35f'),'#ffffff',null]]);
  /* bloemen: sprieten met een bloemhoofdje op de punt */
  const flowers=(n,cols,h)=>partsGeo([[tuft(n,h,'#4a8533','#6fae45'),'#ffffff',null],...Array.from({length:n},(_,i)=>{const ang=i*2.4+.3,hh=h*(.6+((i*7)%5)/10),l=(.25+(i%3)*.12)*hh+.06*(i%2);return [new T.IcosahedronGeometry(.055,0),cols[i%cols.length],M4(Math.cos(ang)*l,hh+.02,Math.sin(ang)*l,1,.65,1)]})]);
  G.bloem=flowers(7,['#f4d03f','#ffffff','#c86dd7','#f08a24','#e04848'],.38);
  G.klaproos=flowers(6,['#e8322a','#d42a22','#f04a30'],.46);
  G.madelief=flowers(9,['#ffffff','#fff8d8','#ffe14a'],.2);
  /* gebouwen met afgeronde hoeken, dikke daken en ramen met kozijnen */
  const rbox=(w,h,d,rad)=>{const s=new T.Shape(),x=w/2-rad,z=d/2-rad;s.moveTo(-x,-d/2);s.lineTo(x,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-z);s.lineTo(w/2,z);s.quadraticCurveTo(w/2,d/2,x,d/2);s.lineTo(-x,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,z);s.lineTo(-w/2,-z);s.quadraticCurveTo(-w/2,-d/2,-x,-d/2);
    return new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:2,curveSegments:3}).rotateX(-Math.PI/2).translate(0,.12,0)};
  const roofG=(w,rh,len,ov)=>{const s=new T.Shape();s.moveTo(-w/2-ov,0);s.lineTo(w/2+ov,0);s.lineTo(0,rh);s.closePath();return new T.ExtrudeGeometry(s,{depth:len+ov*2,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:2}).translate(0,0,-len/2-ov)};
  /* schilddak: vier schuine vlakken naar één top */
  const hipRoof=(w,d,rh,ov)=>new T.ConeGeometry(Math.SQRT1_2,1,4).toNonIndexed().rotateY(Math.PI/4).translate(0,.5,0).scale(w+ov*2,rh,d+ov*2);
  const house2=o=>{
    const {w,d,h,wall,roof,rh=3.2,gable=true,trap=false,door='#2f6b55',frame='#fffaf0',glass='#30455a',shut=null,box=true,chim=true,pat=0,rpat=0,chimPat=2}=o,P=[],floors=Math.max(1,Math.floor(h/2.7));
    P.push([rbox(w,h,d,.35),wall,null,pat]);
    /* fundering die tot ruim onder de grond loopt, zodat een huis op een helling niet zweeft */
    P.push([new T.BoxGeometry(w+.1,2.6,d+.1),o.base?o.base.col:'#'+new T.Color(wall).multiplyScalar(.66).getHexString(),M4(0,-1.02,0),o.base?5:pat]);
    if(o.base)P.push([rbox(w+.14,o.base.h,d+.14,.4),o.base.col,null,5]);
    if(o.hip)P.push([hipRoof(w,d,rh,.45),roof,M4(0,h+.1,0),rpat]);
    else if(gable&&!trap)P.push([roofG(w,rh,d,.45),roof,M4(0,h+.1,0),rpat]);
    else if(trap){P.push([roofG(w-.6,rh,d,.3),roof,M4(0,h+.1,0),rpat]);for(let i=0;i<4;i++){const ww=w*(1-i*.24);P.push([new T.BoxGeometry(ww,rh/4+.05,.35),wall,M4(0,h+.1+rh/4*(i+.5),d/2+.05),pat]);P.push([new T.BoxGeometry(ww+.1,.12,.45),frame,M4(0,h+.1+rh/4*(i+1),d/2+.05),1])}}
    else{const m=new T.Matrix4().makeRotationY(Math.PI/2);m.setPosition(0,h+.1,0);P.push([roofG(d,rh,w,.45),roof,m,rpat])}
    const cols=Math.max(1,Math.round(w/2.3)),dx=w/cols;
    for(const side of[1,-1])for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){
      const x=-w/2+dx*(c+.5),y=1.55+f*2.65,zz=side*(d/2+.14);
      if(side>0&&f===0&&c===Math.floor(cols/2)){P.push([new T.BoxGeometry(1.15,2.25,.1),frame,M4(x,1.12,zz+side*.02),1],[new T.BoxGeometry(.95,2.1,.12),door,M4(x,1.05,zz+side*.04),1],[new T.BoxGeometry(1.4,.18,.6),'#b9b0a2',M4(x,.09,zz+side*.3),1]);continue}
      /* raam: kozijn, glas dat de lucht weerspiegelt, middenstijl en een vensterbank */
      P.push([new T.BoxGeometry(1.15,1.4,.08),frame,M4(x,y,zz),1],[new T.BoxGeometry(.9,1.15,.1),glass,M4(x,y,zz+side*.02),6],[new T.BoxGeometry(.06,1.15,.12),frame,M4(x,y,zz+side*.03),1],[new T.BoxGeometry(1.3,.08,.22),frame,M4(x,y-.72,zz+side*.09),1]);
      if(shut)for(const sx of[-.72,.72])P.push([new T.BoxGeometry(.4,1.3,.08),shut,M4(x+sx,y,zz+side*.03),1]);
      if(box&&side>0&&f===0)P.push([new T.BoxGeometry(1.1,.22,.3),'#8a5a3a',M4(x,y-.9,zz+side*.17),1],...[-.3,0,.3].map(bx=>[...ball(.13,['#ff5a6e','#ffd23f','#ff8ad0'][Math.abs(Math.round(bx*10))%3],x+bx,y-.72,zz+side*.18),1]));
    }
    if(gable&&h>3.5&&!trap&&!o.hip)P.push([new T.BoxGeometry(.95,1.05,.08),frame,M4(0,h+rh*.36,d/2+.5),1],[new T.BoxGeometry(.75,.85,.1),glass,M4(0,h+rh*.36,d/2+.52),6]);
    /* dakkapellen op het voordakvlak (bij een nok van links naar rechts) */
    if(o.dorm&&!gable&&!o.hip)for(let i=0;i<o.dorm;i++){const x=o.dorm===1?0:(i-(o.dorm-1)/2)*w/o.dorm,zf=d/2*.42,yb=h+.1+rh*.42;
      P.push([new T.BoxGeometry(1.5,1.1,1.6),wall,M4(x,yb+.4,zf-.2),1],[new T.BoxGeometry(1.15,.8,.06),frame,M4(x,yb+.45,zf+.62),1],[new T.BoxGeometry(.95,.65,.08),glass,M4(x,yb+.45,zf+.64),6],
        [new T.BoxGeometry(1.8,.14,1.9),roof,M4(x,yb+1.02,zf-.15),1])}
    if(chim)P.push([new T.BoxGeometry(.65,1.8,.65),'#a65a44',M4(w*.27,h+rh*.62,-d*.22),chimPat],[new T.BoxGeometry(.8,.15,.8),'#7d4434',M4(w*.27,h+rh*.62+.95,-d*.22),1]);
    if(o.extra)P.push(...o.extra(w,d,h).map(q=>q.length>3?q:[...q,1]));
    if(o.awning)P.push([new T.BoxGeometry(w*.9,.14,1.7),o.awning,(()=>{const m=new T.Matrix4().makeRotationX(.35);m.setPosition(0,3,d/2+.85);return m})(),1]);
    return partsGeo(P);
  };
  G.rood=house2({w:6,d:8.5,h:5.6,wall:'#c8603f',roof:'#4a4f5c',trap:true,door:'#2f6b55',pat:2,rpat:7});
  G.wit=house2({w:5.4,d:7.5,h:5.8,wall:'#fbf1df',roof:'#e0663a',door:'#3a6fb0',pat:3,rpat:7});
  G.geel=house2({w:8,d:9,h:3.2,wall:'#f0cf8a',roof:'#9c4a32',gable:false,rh:2.8,door:'#b03a3a',pat:2,rpat:7,dorm:1});
  G.rij=house2({w:15,d:8.5,h:6.4,wall:'#b8573c',roof:'#3f4552',gable:false,rh:3.4,door:'#1f4f8c',pat:2,rpat:7,dorm:3});
  G.winkel=house2({w:8,d:10,h:4.4,wall:'#fff4e2',roof:'#5a5f6c',gable:false,rh:2.4,awning:'#2f9c7a',door:'#2b2b2b',chim:false,box:false,pat:3,rpat:9});
  G.trapgevel=house2({w:6.5,d:9,h:7.2,wall:'#a94e35',roof:'#3f4552',trap:true,door:'#7a2f2f',pat:2,rpat:7});
  G.villa=house2({w:7.5,d:8,h:5.6,wall:'#b9603f',roof:'#3d434d',hip:true,rh:3.6,door:'#1f4f8c',shut:'#2f5d3a',pat:2,rpat:7});
  G.groen=house2({w:6,d:8,h:5.4,wall:'#fff7e8',roof:'#3f4552',door:'#2f6b3a',shut:'#2f7a4a',pat:3,rpat:9});
  G.chalet=house2({w:8,d:9,h:5.2,wall:'#a8703f',roof:'#5a4f48',rh:2.4,frame:'#fff2dc',door:'#5a3a22',shut:'#c2442f',pat:4,rpat:9,base:{h:1.5,col:'#a19a8f'},chimPat:5});
  G.boerderij=house2({w:10,d:20,h:3.6,wall:'#b25c40',roof:'#556070',rh:6.8,door:'#2f6b3a',box:false,pat:2,rpat:7});
  G.kerk=partsGeo([[rbox(8,8,14,.4),'#e9dcc4',null],[roofG(8,5,14,.4),'#4f5561',M4(0,8.1,0)],[rbox(4.4,16,4.4,.2),'#e9dcc4',M4(0,0,-8.6)],[new T.ConeGeometry(3.1,9,8),'#4f5561',M4(0,20.6,-8.6)],
    [new T.SphereGeometry(.9,16,12),'#f2f2f2',M4(0,12.6,-6.35,1,1,.2)],[new T.BoxGeometry(.06,.6,.06),'#222',M4(0,12.8,-6.15)],[new T.BoxGeometry(2,3.2,.12),'#6b3a2a',M4(0,1.6,7.08)],...[-2.4,2.4].map(x=>[new T.BoxGeometry(1.1,3.4,.1),'#8ec3e6',M4(x,4.4,7.06)])]);
  /* dorp: straten, plein, terras, fontein, voetgangers */
  G.straat=partsGeo([[new T.BoxGeometry(6,.07,34),'#b3a796',M4(0,.035,17)],[new T.BoxGeometry(.25,.15,34),'#d8d0c2',M4(-3.1,.07,17)],[new T.BoxGeometry(.25,.15,34),'#d8d0c2',M4(3.1,.07,17)]]);
  G.plein=partsGeo([[new T.BoxGeometry(36,.07,26),'#cdbfa8',M4(0,.035,0)],...[0,1,2,3,4,5,6,7,8].map(i=>[new T.BoxGeometry(36,.075,.12),'#b7a990',M4(0,.04,-12+i*3)])]);
  const merge=(...gs)=>{const out=new T.BufferGeometry();for(const k of['position','normal','color'])out.setAttribute(k,new T.Float32BufferAttribute(gs.flatMap(g=>[...g.attributes[k].array]),3));return out};
  G.loper=person({walk:1,hair:'#2e241c',arms:[[-1,[-.24,1.1,-.13],[-.22,.88,-.26]],[1,[.24,1.1,.13],[.22,.88,.22]]]});
  G.terras=partsGeo([[new T.CylinderGeometry(.45,.45,.05,14),'#ffffff',M4(0,.75,0)],[new T.CylinderGeometry(.04,.04,.75,6),'#444',M4(0,.37,0)],...[[.75,0],[-.75,0],[0,.75],[0,-.75]].map(([x,z])=>[new T.BoxGeometry(.4,.45,.4),'#3d6f9c',M4(x,.22,z)]),
    [new T.CylinderGeometry(.03,.03,2.4,5),'#ddd',M4(0,1.2,0)],[new T.ConeGeometry(1.5,.55,10),'#ffffff',M4(0,2.4,0)]]);
  G.fontein=partsGeo([[new T.CylinderGeometry(2.2,2.4,.6,24),'#d9cfbf',M4(0,.3,0)],[new T.CylinderGeometry(1.95,1.95,.08,24),'#5fb6e6',M4(0,.56,0)],[new T.CylinderGeometry(.25,.35,1.6,10),'#d9cfbf',M4(0,1.2,0)],[new T.CylinderGeometry(.9,.6,.25,16),'#d9cfbf',M4(0,2,0)],ball(.25,'#bfe6ff',0,2.4,0)]);
  G.fiets=partsGeo([[new T.TorusGeometry(.32,.03,5,14),'#222',(()=>{const m=new T.Matrix4().makeRotationY(Math.PI/2);m.setPosition(0,.34,.5);return m})()],[new T.TorusGeometry(.32,.03,5,14),'#222',(()=>{const m=new T.Matrix4().makeRotationY(Math.PI/2);m.setPosition(0,.34,-.5);return m})()],
    [new T.BoxGeometry(.05,.05,1),'#ffffff',M4(0,.6,0)],[new T.BoxGeometry(.05,.5,.05),'#ffffff',M4(0,.6,.15)],[new T.BoxGeometry(.4,.05,.05),'#333',M4(0,.9,-.45)]]);
  /* tulpenveld: een rij bloemen */
  G.tulpblad=partsGeo([[new T.BoxGeometry(.75,.3,10.2),'#4f9e3a',M4(0,.15,0)]]);
  G.tulpbloem=partsGeo([[new T.CapsuleGeometry(.24,9.6,2,6).rotateX(Math.PI/2),'#ffffff',M4(0,.42,0,1,.8,1)]]);
  /* ===== vier werelden ===== */
  G.wolk=partsGeo([ball(7,'#ffffff',0,0,0,1,.75,1),ball(5.5,'#ffffff',6.5,-.8,1),ball(5,'#ffffff',-6.5,-1,-1),ball(4.5,'#ffffff',2,3,0),ball(4,'#ffffff',-3,2.4,1.5)]);
  /* Provence */
  G.lavendel=partsGeo([...[0,1,2,3,4,5,6,7,8].map(i=>ball(.42,i%2?'#8f6ad3':'#9d7be0',0,.32,-4.8+i*1.2,1,.75,1.1,0)),[new T.BoxGeometry(.7,.2,10.4),'#6f8f4a',M4(0,.1,0)]]);
  G.zonnebloem=partsGeo([...[0,1,2,3,4,5].flatMap(i=>{const z=-4.5+i*1.8;return [[new T.CylinderGeometry(.03,.04,1.7,4),'#4f8a2e',M4(0,.85,z)],[new T.CylinderGeometry(.32,.32,.08,9),'#ffcd1f',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2-.3);m.setPosition(0,1.75,z+.05);return m})()],[new T.CylinderGeometry(.14,.14,.1,6),'#5a3a1a',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2-.3);m.setPosition(0,1.76,z+.08);return m})()],ball(.28,'#4f8a2e',0,.9,z,1,.5,1)]})]);
  G.mas=house2({w:9,d:8,h:4.4,wall:'#ecd2a4',roof:'#c8643c',gable:false,rh:1.8,shut:'#5b8fb0',door:'#5b8fb0',frame:'#f6ead2',chim:true,pat:3,rpat:8,chimPat:3});
  G.mas3=house2({w:5.6,d:7,h:7.6,wall:'#f0c49a',roof:'#c0603a',gable:false,rh:1.5,shut:'#6b8fb8',door:'#6b8fb8',frame:'#f6ead2',pat:3,rpat:8,chimPat:3});
  G.mas4=house2({w:8.5,d:8,h:5.2,wall:'#efe0c0',roof:'#c86a3e',hip:true,rh:2.2,shut:'#9a7ab8',door:'#9a7ab8',frame:'#f6ead2',pat:3,rpat:8,chimPat:3});
  G.mas2=house2({w:7,d:7.5,h:5.6,wall:'#e3bd8a',roof:'#b85a36',gable:false,rh:1.6,shut:'#6f9c62',door:'#6f9c62',frame:'#f6ead2',pat:3,rpat:8,chimPat:3});
  /* Limburg: vakwerk en mergel */
  const beams=(w,d,h)=>{const P=[],c='#4a3426',t=.13;for(const side of[1,-1]){const z=side*(d/2+.13);
    for(const x of[-w/2+.1,-w/4,0,w/4,w/2-.1])P.push([new T.BoxGeometry(t,h,.06),c,M4(x,h/2+.1,z)]);
    for(const y of[.25,h/2,h])P.push([new T.BoxGeometry(w,t,.06),c,M4(0,y,z)]);
    for(const [x0,s] of[[-w/2+.1,1],[w/4,1]]){const L=Math.hypot(w/4,h/2);const m=new T.Matrix4().makeRotationZ(-s*Math.atan2(w/4,h/2));m.setPosition(x0+w/8,h*.75,z);P.push([new T.BoxGeometry(t,L,.06),c,m])}}
    for(const side of[1,-1])for(const z of[-d/2+.1,0,d/2-.1])P.push([new T.BoxGeometry(.06,h,t),c,M4(side*(w/2+.13),h/2+.1,z)]);return P};
  G.vakwerk=house2({w:7,d:9,h:5.2,wall:'#f7f3ea',roof:'#3e4650',door:'#6b2f2a',frame:'#ffffff',shut:null,extra:beams,pat:3,rpat:9});
  G.mergel=house2({w:6.5,d:8,h:5.4,wall:'#efe1bd',roof:'#3e4650',door:'#2f5d3a',shut:'#2f5d3a',pat:5,rpat:9,chimPat:5});
  G.mergel2=house2({w:7.5,d:9,h:4.8,wall:'#e8d6a2',roof:'#3e4650',gable:false,rh:3,door:'#6b2f2a',shut:'#2f5d3a',pat:5,rpat:9,dorm:1,chimPat:5});
  G.vakhoeve=house2({w:10,d:18,h:4,wall:'#f7f3ea',roof:'#3e4650',rh:5.5,door:'#6b2f2a',box:false,extra:beams,pat:3,rpat:9});
  /* Alpen */
  G.chalet2=house2({w:9,d:10,h:6,wall:'#9a6a3e',roof:'#56504c',rh:2.6,frame:'#fff2dc',door:'#5a3a22',shut:'#2f6b3a',pat:4,rpat:9,base:{h:2.2,col:'#a39d93'},chimPat:5,extra:(w,d,h)=>{const P=[[new T.BoxGeometry(w+.4,.15,1.2),'#7a5232',M4(0,3,d/2+.7)],[new T.BoxGeometry(w+.4,.7,.06),'#7a5232',M4(0,3.4,d/2+1.3)]];
    for(let i=0;i<9;i++)P.push(ball(.14,['#e8312f','#ff6fae','#ffffff'][i%3],-w/2+.5+i*(w-1)/8,3.85,d/2+1.32));return P}});
  G.chalet3=house2({w:10,d:11,h:7,wall:'#8f5f36',roof:'#4f4a47',rh:3,frame:'#fff2dc',door:'#5a3a22',shut:'#c2442f',pat:4,rpat:9,base:{h:2.7,col:'#a8a197'},chimPat:5,extra:(w,d,h)=>[[new T.BoxGeometry(w+.4,.15,1.3),'#7a5232',M4(0,3.4,d/2+.75)],[new T.BoxGeometry(w+.4,.75,.06),'#7a5232',M4(0,3.85,d/2+1.4)],...[0,1,2,3,4,5,6,7,8].map(i=>[...ball(.14,['#e8312f','#ff6fae','#ffffff'][i%3],-w/2+.5+i*(w-1)/8,4.3,d/2+1.42),1])]});
  G.alpenkerk=partsGeo([[rbox(7,7,12,.4),'#f6f1e6',null],[roofG(7,4,12,.4),'#5c5a58',M4(0,7.1,0)],[rbox(3.8,14,3.8,.2),'#f6f1e6',M4(0,0,-7.6)],ball(2,'#4f7a5a',0,15.6,-7.6,1,1.25,1),[new T.ConeGeometry(.5,2.4,10),'#4f7a5a',M4(0,18,-7.6)],[new T.BoxGeometry(.05,.9,.05),'#c9a227',M4(0,19.6,-7.6)],[new T.SphereGeometry(.8,16,12),'#ffffff',M4(0,11.5,-5.65,1,1,.2)]]);
  G.hout=partsGeo([0,1,2,3,4,5,6,7,8].map(i=>[new T.CylinderGeometry(.17,.17,1.6,9),i%2?'#a97c4f':'#8f6540',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(0,.17+Math.floor(i/3)*.32,(i%3-1)*.35+(Math.floor(i/3)%2)*.17);return m})()]));
  G.piek=partsGeo([[new T.ConeGeometry(1,1,9),'#93a8c0',M4(0,.5,0)],[new T.ConeGeometry(.38,.38,9),'#f4f7fb',M4(0,.81,0)]]);
  /* finish */
  G.railpaal=partsGeo([[new T.BoxGeometry(.09,1.74,.13),'#8d949b',M4(0,-.15,0)],[new T.BoxGeometry(.1,.08,.14),'#c9ced3',M4(0,.73,0)]]);
  G.hekpaal=partsGeo([[new T.BoxGeometry(.13,1.55,.13),'#7a5b3e',M4(0,.35,0)],[new T.BoxGeometry(.15,.06,.15),'#5e4630',M4(0,1.13,0)]]);
  G.dranghek=partsGeo([[new T.BoxGeometry(.05,1.1,2.5),'#c9ced4',M4(0,.55,0)],[new T.BoxGeometry(.06,.06,2.5),'#e9ecef',M4(0,1.1,0)],[new T.BoxGeometry(.4,.05,.05),'#9aa0a6',M4(0,.02,-1.1)],[new T.BoxGeometry(.4,.05,.05),'#9aa0a6',M4(0,.02,1.1)]]);
  /* natuur dichtbij de weg */
  G.varen=partsGeo([0,1,2,3,4,5,6].map(i=>[new T.ConeGeometry(.16,1.1,4),i%2?'#3f8f3a':'#4fa246',(()=>{const m=new T.Matrix4().makeRotationY(i*.9);m.multiply(new T.Matrix4().makeRotationX(1.05));m.setPosition(Math.sin(i*.9)*.3,.35,Math.cos(i*.9)*.3);m.scale(new T.Vector3(1,1,.25));return m})()]));
  G.paddenstoel=partsGeo([[new T.CylinderGeometry(.05,.07,.22,8),'#f4efe4',M4(0,.11,0)],[new T.SphereGeometry(.15,9,4,0,Math.PI*2,0,Math.PI/2),'#d8322a',M4(0,.2,0)],...[0,1,2,3].map(i=>ball(.025,'#ffffff',Math.cos(i*1.6)*.09,.31,Math.sin(i*1.6)*.09)),
    [new T.CylinderGeometry(.04,.05,.16,8),'#f4efe4',M4(.25,.08,.1)],[new T.SphereGeometry(.1,7,3,0,Math.PI*2,0,Math.PI/2),'#a0602f',M4(.25,.15,.1)]]);
  G.stam=partsGeo([[new T.CylinderGeometry(.32,.36,4.5,10),'#6b4f36',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(0,.3,0);return m})()],ball(.3,'#5f8f3a',-1,.55,0,1.4,.4,1.1),ball(.25,'#6a9a40',1.2,.5,.1,1.3,.4,1)]);
  G.distel=partsGeo([[new T.CylinderGeometry(.02,.03,.7,5),'#6f8f4a',M4(0,.35,0)],ball(.11,'#9b59c9',0,.74,0),[new T.CylinderGeometry(.02,.02,.5,5),'#6f8f4a',M4(.15,.25,.05)],ball(.08,'#a96ad3',.15,.52,.05)]);
  G.keien=partsGeo([ball(.35,'#a9a39a',0,.12,0,1,.55,1.2),ball(.25,'#9b958c',.45,.08,.2,1,.5,1),ball(.2,'#b5afa6',-.4,.06,-.15,1,.5,1)]);
  G.stoeprand=partsGeo([[new T.BoxGeometry(.24,.17,2.02),'#d6d1c8',M4(0,.04,0)]]);
  G.paaltje=partsGeo([[new T.CylinderGeometry(.08,.09,.8,10),'#3a3f46',M4(0,.4,0)],[new T.SphereGeometry(.085,10,6,0,Math.PI*2,0,Math.PI/2),'#3a3f46',M4(0,.8,0)],[new T.CylinderGeometry(.09,.09,.06,10),'#e6e6e6',M4(0,.66,0)]]);
  return G;
}
/* windmolen van deze tijd: slanke witte mast met drie wieken (de wieken draaien mee met de molens) */
function makeTurbine(){
  const T=T3,g=new T.Group(),mat=new T.MeshLambertMaterial({vertexColors:true});
  g.add(new T.Mesh(partsGeo([[new T.CylinderGeometry(.7,1.5,48,12),'#f2f3f5',M4(0,24,0)],[new T.BoxGeometry(2,2,5),'#e9ebee',M4(0,48.6,-.6)]]),mat));
  const rot=new T.Group();rot.position.set(0,48.6,2.1);rot.add(new T.Mesh(partsGeo([[new T.SphereGeometry(1.05,10,8),'#e3e6ea',M4(0,0,.3,1,1,1.3)]]),mat));
  for(let i=0;i<3;i++){const b=new T.Mesh(partsGeo([[new T.BoxGeometry(1.3,23,.28),'#f6f7f9',M4(.25,12,0)],[new T.BoxGeometry(.8,6,.3),'#f6f7f9',M4(.5,3.5,0)]]),mat);b.rotation.z=i*Math.PI*2/3;rot.add(b)}
  rot.rotation.z=Math.random()*6;g.add(rot);g.userData.sails=rot;return g;
}
/* kasteel op een heuvel: muren met kantelen, vier hoektorens en een donjon */
function makeCastle(){
  const T=T3,mat=new T.MeshLambertMaterial({vertexColors:true,flatShading:true}),P=[],st='#b8ad98',dk='#9d927f',roof='#59443c';
  P.push([new T.BoxGeometry(26,8,1.6),st,M4(0,4,-10)],[new T.BoxGeometry(26,8,1.6),st,M4(0,4,10)],[new T.BoxGeometry(1.6,8,20),st,M4(-13,4,0)],[new T.BoxGeometry(1.6,8,20),st,M4(13,4,0)]);
  for(let x=-12;x<=12;x+=2.4)for(const z of[-10,10])P.push([new T.BoxGeometry(1.1,1.1,1.7),st,M4(x,8.5,z)]);
  for(const z of[-8.6,-6.2,-3.8,-1.4,1,3.4,5.8,8.2])for(const x of[-13,13])P.push([new T.BoxGeometry(1.7,1.1,1.1),st,M4(x,8.5,z)]);
  for(const [x,z] of[[-13,-10],[13,-10],[-13,10],[13,10]])P.push([new T.CylinderGeometry(2.8,3.1,13,10),dk,M4(x,6.5,z)],[new T.ConeGeometry(3.6,6,10),roof,M4(x,16,z)]);
  P.push([new T.BoxGeometry(8,19,8),st,M4(-3,9.5,-2)],[new T.ConeGeometry(6.4,7,4),roof,M4(-3,22.5,-2)],[new T.BoxGeometry(3.6,4.6,.5),'#3a2e27',M4(0,2.3,10.9)]);
  for(const [x,y] of[[-3,13],[-3,16]])P.push([new T.BoxGeometry(1,1.6,.3),'#2d2a2a',M4(x,y,2.1)]);
  const g=new T.Group();g.add(new T.Mesh(partsGeo(P),mat));return g;
}
/* luchtballon in banen van twee kleuren, met een mandje */
function makeBalloon(u){
  const T=T3,mat=new T.MeshLambertMaterial({vertexColors:true}),cs=[['#e8312f','#ffd23f'],['#3d8bd4','#f4f4f4'],['#2eaa6e','#f08a24'],['#9b5de5','#ffd23f'],['#f08a24','#3d8bd4']][Math.floor(u*5)],P=[];
  for(let i=0;i<8;i++)P.push([new T.SphereGeometry(8,4,14,i*Math.PI/4,Math.PI/4,0,Math.PI*.78),cs[i%2],M4(0,13,0,1,1.18,1)]);
  P.push([new T.CylinderGeometry(4.6,1.3,5,16,1,true),cs[0],M4(0,4.2,0)],[new T.BoxGeometry(1.8,1.3,1.8),'#7a5a36',M4(0,.2,0)]);
  const g=new T.Group();g.add(new T.Mesh(partsGeo(P),mat));return g;
}
function makeMill(){
  const T=T3,g=new T.Group(),mat=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
  g.add(new T.Mesh(partsGeo([[new T.CylinderGeometry(1.6,3,11,8),'#5b4636',M4(0,5.5,0)],[new T.ConeGeometry(2.1,2.6,8),'#3f3f45',M4(0,12.2,0)],[new T.CylinderGeometry(3.4,3.4,.4,10),'#7a6a58',M4(0,5,0)]]),mat));
  const sails=new T.Group();sails.position.set(0,11.2,2.2);
  for(let i=0;i<4;i++){const s=new T.Mesh(partsGeo([[new T.BoxGeometry(.25,7,.12),'#4b3a2c',M4(0,3.6,0)],[new T.BoxGeometry(1.3,5.4,.08),'#efe9dc',M4(.75,4.2,0)]]),mat);s.rotation.z=i*Math.PI/2;sails.add(s)}
  g.add(sails);g.userData.sails=sails;return g;
}
function canvasTex(w,h,draw){const T=T3,cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=ANISO;return t}
function makeArch(color,text,finish){
  const T=T3,g=new T.Group(),m=new T.MeshLambertMaterial({color:finish?'#20242c':color,flatShading:true});
  for(const x of[-4.5,4.5]){const p=new T.Mesh(new T.BoxGeometry(.3,4.6,.3),m);p.position.set(x,2.3,0);p.castShadow=true;g.add(p)}
  const tex=canvasTex(512,56,(c,w,h)=>{
    if(finish){for(let i=0;i<32;i++)for(let j=0;j<4;j++){c.fillStyle=(i+j)%2?'#fff':'#111';c.fillRect(i*16,j*14,16,14)}c.fillStyle='rgba(0,0,0,.55)';c.fillRect(150,0,212,h)}
    else{c.fillStyle=color;c.fillRect(0,0,w,h)}
    c.fillStyle='#fff';c.font='bold 34px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2+2)});
  const tm=new T.MeshBasicMaterial({map:tex}),b=new T.Mesh(new T.BoxGeometry(9.3,1,.25),[m,m,m,m,tm,tm]);
  b.position.y=4.5;b.castShadow=true;g.add(b);return g;
}
/* blauw plaatsnaambord; bij het verlaten van het dorp met een rode streep */
function makePlace(name,out,fr){
  const T=T3,g=new T.Group(),post=new T.Mesh(new T.CylinderGeometry(.05,.05,2.3,6),new T.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.15;g.add(post);
  const tex=canvasTex(256,96,(c,w,h)=>{c.fillStyle=fr?'#ffffff':'#1d4f9c';c.fillRect(0,0,w,h);c.strokeStyle=fr?'#d62828':'#fff';c.lineWidth=fr?9:6;c.strokeRect(6,6,w-12,h-12);c.fillStyle=fr?'#111':'#fff';c.font='bold 34px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(name,w/2,h/2+2);
    if(out){c.strokeStyle='#d62828';c.lineWidth=9;c.beginPath();c.moveTo(14,h-12);c.lineTo(w-14,12);c.stroke()}});
  const b=new T.Mesh(new T.PlaneGeometry(1.8,.68),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));b.position.y=2.45;g.add(b);return g;
}
/* spandoek op de dranghekken bij de finish */
function makeBanner(v){
  const T=T3,key='ban'+v;W.ban=W.ban||{};
  if(!W.ban[key])W.ban[key]=canvasTex(512,96,(c,w,h)=>{c.fillStyle=v?'#FF6A2B':'#1d4f9c';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font='800 54px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(v?'KOPWERK':'GA ERVOOR!',w/2,h/2+3)});
  W.banM=W.banM||{};W.banM[key]=W.banM[key]||new T.MeshBasicMaterial({map:W.ban[key],side:T.DoubleSide});W.banG=W.banG||new T.PlaneGeometry(2.48,.85);const m=new T.Mesh(W.banG,W.banM[key]);m.position.y=.62;m.userData.shared=true;const g=new T.Group();g.add(m);return g;
}
/* bordje bij een haarspeldbocht */
function makeVirage(n,alt){
  const T=T3,g=new T.Group(),post=new T.Mesh(new T.CylinderGeometry(.05,.05,2.3,6),new T.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.15;g.add(post);
  const tex=canvasTex(256,192,(c,w,h)=>{c.fillStyle='#f6f3ec';c.fillRect(0,0,w,h);c.strokeStyle='#1d4f9c';c.lineWidth=10;c.strokeRect(5,5,w-10,h-10);c.fillStyle='#1d4f9c';c.textAlign='center';c.textBaseline='middle';
    c.font='800 28px Inter, system-ui, sans-serif';c.fillText('VIRAGE',w/2,34);c.font='900 88px Inter, system-ui, sans-serif';c.fillText(n,w/2,102);c.font='700 22px Inter, system-ui, sans-serif';c.fillStyle='#3a3a3a';c.fillText('altitude '+alt+' m',w/2,162)});
  const b=new T.Mesh(new T.PlaneGeometry(1.1,.82),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));b.position.y=2.6;g.add(b);return g;
}
/* woorden voor op het asfalt, met verf die hier en daar is weggesleten */
function roadWords(){
  return canvasTex(1024,1024,(c,w,h)=>{c.textAlign='center';c.textBaseline='middle';
    ['ALLEZ','VAS-Y !','FORZA','KOPWERK','HOP HOP','ALLEZ ALLEZ','GO GO GO','ALLEZ KOPWERK'].forEach((t,i)=>{c.font=`900 ${t.length>9?66:88}px Inter, system-ui, sans-serif`;c.fillStyle=i%3===1?'rgba(255,214,64,.95)':'rgba(255,255,255,.93)';c.fillText(t,w/2,i*128+66)});
    c.globalCompositeOperation='destination-out';for(let i=0;i<26000;i++){c.fillStyle=`rgba(0,0,0,${Math.random()*.7})`;c.fillRect(Math.random()*w,Math.random()*h,2,2)}});
}
/* waarschuwing voor een bocht */
function makeBend(right){
  const T=T3,g=new T.Group(),post=new T.Mesh(new T.CylinderGeometry(.05,.05,2.2,6),new T.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.1;g.add(post);
  const tex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#fff';c.beginPath();c.moveTo(64,6);c.lineTo(122,116);c.lineTo(6,116);c.closePath();c.fill();c.lineWidth=12;c.strokeStyle='#d62828';c.lineJoin='round';c.stroke();
    c.strokeStyle='#111';c.lineWidth=9;c.beginPath();const s=right?1:-1;c.moveTo(64-s*12,100);c.lineTo(64-s*12,72);c.quadraticCurveTo(64-s*12,52,64+s*14,50);c.stroke();c.fillStyle='#111';c.beginPath();c.moveTo(64+s*26,50);c.lineTo(64+s*12,40);c.lineTo(64+s*12,60);c.closePath();c.fill()});
  const b=new T.Mesh(new T.PlaneGeometry(1.1,1.1),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));b.position.y=2.5;g.add(b);return g;
}
/* bord met het hellingspercentage aan het begin van een klim */
function makeSign(pct){
  const T=T3,g=new T.Group();
  const post=new T.Mesh(new T.CylinderGeometry(.05,.05,2.2,6),new T.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.1;g.add(post);
  const tex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#fff';c.beginPath();c.moveTo(64,6);c.lineTo(122,116);c.lineTo(6,116);c.closePath();c.fill();
    c.lineWidth=12;c.strokeStyle='#d62828';c.lineJoin='round';c.stroke();c.fillStyle='#111';c.font='bold 34px Inter, system-ui, sans-serif';c.textAlign='center';c.fillText(pct+'%',64,96)});
  const b=new T.Mesh(new T.PlaneGeometry(1.1,1.1),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));b.position.y=2.5;g.add(b);
  return g;
}
/* fietser: echte verhoudingen, een tenue met ontwerp, een gestroomlijnde helm met ventilatiegaten en een racefiets in twee kleuren; vooruit = -z.
   Wat samen beweegt is één vorm (17 tekenopdrachten per fietser). Shirt, helm en het opschrift op de fiets komen uit één plaatje per renner;
   de andere delen gebruiken een wit stukje van dat plaatje en hun eigen kleur per hoekpunt. */
const KITS={
  me:{base:'#FF6A2B',acc:'#16191f',acc2:'#ffffff',pat:'band',helmet:'#ffffff',hstripe:'#FF6A2B',frame:['#FF6A2B','#16191f'],bar:'#16191f',bottle:'#ffffff',logo:'KOPWERK',hair:'#5a3b26'},
  pace:{base:'#3D8BD4',acc:'#ffffff',acc2:'#1d2a44',pat:'band',helmet:'#3D8BD4',hstripe:'#ffffff',frame:['#3D8BD4','#1d2a44'],bar:'#ffffff',bottle:'#3D8BD4',logo:'TEMPO',hair:'#2e241c'},
  rood:{base:'#E04848',acc:'#ffffff',acc2:'#16191f',pat:'hoops',helmet:'#ffffff',hstripe:'#E04848',frame:['#f2f2f2','#E04848'],bar:'#E04848',bottle:'#ffffff',logo:'ROOD',hair:'#c99a4e'},
  groen:{base:'#2EAA6E',acc:'#16191f',acc2:'#f4d03f',pat:'sash',helmet:'#16191f',hstripe:'#2EAA6E',frame:['#16191f','#2EAA6E'],bar:'#16191f',bottle:'#2EAA6E',logo:'POLDER',hair:'#2e241c'},
  geel:{base:'#F4D03F',acc:'#16191f',acc2:'#16191f',pat:'plain',helmet:'#F4D03F',hstripe:'#16191f',frame:['#16191f','#F4D03F'],bar:'#F4D03F',bottle:'#16191f',logo:'',hair:'#7a4a2a'},
  paars:{base:'#9B5DE5',acc:'#ffffff',acc2:'#f15bb5',pat:'chevron',helmet:'#ffffff',hstripe:'#9B5DE5',frame:['#f2f2f2','#9B5DE5'],bar:'#ffffff',bottle:'#f15bb5',logo:'LAVENDEL',hair:'#3b2a1e'},
  bollen:{base:'#ffffff',acc:'#d62828',acc2:'#d62828',pat:'dots',helmet:'#ffffff',hstripe:'#d62828',frame:['#d62828','#ffffff'],bar:'#d62828',bottle:'#ffffff',logo:'',hair:'#c99a4e'}};
const shadeC=(c,l)=>'#'+new T3.Color(c).offsetHSL(0,0,l).getHexString();
/* plaatje per renner: boven het shirt (rondom: voorkant, linkerzij, rug, rechterzij), linksonder de helm, rechtsonder het opschrift en een wit vlak */
function kitTex(k){
  return canvasTex(512,512,(c,w,h)=>{
    const yb=256*(1-.25);c.fillStyle=k.base;c.fillRect(0,0,512,256);
    c.fillStyle=shadeC(k.base,-.16);c.fillRect(512*.18,0,512*.13,yb);c.fillRect(512*.69,0,512*.13,yb);
    c.fillStyle=k.acc;
    if(k.pat==='band'){c.fillRect(0,256*.36,512,22);c.fillStyle=k.acc2;c.fillRect(0,256*.36-7,512,4);c.fillRect(0,256*.36+25,512,4)}
    else if(k.pat==='hoops')for(let i=0;i<5;i++)c.fillRect(0,256*.18+i*30,512,11);
    else if(k.pat==='sash'){c.save();c.beginPath();c.rect(0,0,512,yb);c.clip();for(const x0 of[0,256]){c.beginPath();c.moveTo(x0+40,0);c.lineTo(x0+110,0);c.lineTo(x0+230,yb);c.lineTo(x0+160,yb);c.fill()}c.restore();c.fillStyle=k.acc2;c.fillRect(0,256*.06,512,5)}
    else if(k.pat==='chevron'){c.lineWidth=18;c.strokeStyle=k.acc;for(const x0 of[256,0,512]){c.beginPath();c.moveTo(x0-110,256*.2);c.lineTo(x0,256*.5);c.lineTo(x0+110,256*.2);c.stroke()}c.strokeStyle=k.acc2;c.lineWidth=6;for(const x0 of[256,0,512]){c.beginPath();c.moveTo(x0-110,256*.3);c.lineTo(x0,256*.6);c.lineTo(x0+110,256*.3);c.stroke()}}
    else if(k.pat==='dots')for(let y=14;y<yb-6;y+=26)for(let x=(y/26%2)*16;x<512;x+=32){c.beginPath();c.arc(x,y,8,0,7);c.fill()}
    /* kraag, rits, achterzakken en naam op de rug */
    c.fillStyle=k.acc;c.fillRect(0,0,512,13);c.fillStyle=shadeC(k.base,-.3);c.fillRect(0,0,3,yb);c.fillRect(509,0,3,yb);
    c.strokeStyle=shadeC(k.base,-.25);c.lineWidth=2;for(const i of[-1,0,1])c.strokeRect(512*(.5+i*.07)-14,yb-38,28,32);
    if(k.logo){c.fillStyle=k.pat==='band'?k.acc2:k.acc;c.font='800 21px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(k.logo,256,256*.62)}
    /* broek: zwart met een zijpaneel in de kleur van het shirt */
    c.fillStyle='#16191f';c.fillRect(0,yb,512,256-yb);c.fillStyle=k.base;c.fillRect(512*.23,yb,16,256-yb);c.fillRect(512*.75,yb,16,256-yb);
    /* helm: grondkleur, een streep van voor naar achter, ventilatiegaten en een donkere rand */
    c.fillStyle=k.helmet;c.fillRect(0,256,256,256);c.fillStyle=k.hstripe;for(const x of[64,192])c.fillRect(x-9,256,18,150);
    c.fillStyle='#1b1d22';for(const x of[64,192])for(const dx of[-26,26,-46,46])for(let y=282;y<372;y+=24){c.beginPath();c.ellipse(x+dx,y,5,9,0,0,7);c.fill()}
    c.fillRect(0,388,256,14);
    /* opschrift voor de onderbuis, op beide zijkanten */
    c.fillStyle=k.frame[0];c.fillRect(256,256,256,128);c.fillStyle=k.frame[0]==='#f2f2f2'||k.frame[0]==='#ffffff'?k.frame[1]:'#ffffff';c.font='800 26px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';
    /* rechterkant: verticaal gespiegeld, linkerkant: horizontaal gespiegeld, zodat het op de buis van beide kanten leesbaar is */
    c.save();c.translate(384,352);c.scale(1,-1);c.fillText('KOPWERK',0,0);c.restore();c.save();c.translate(384,288);c.scale(-1,1);c.fillText('KOPWERK',0,0);c.restore();
    c.fillStyle='#ffffff';c.fillRect(256,384,256,128)});
}
function riderMat(k,ghost){
  const T=T3,m=new T.MeshPhongMaterial({map:kitTex(k),vertexColors:true,shininess:42,specular:'#5c5c5c',transparent:!!ghost,opacity:ghost?.6:1});
  /* glans per onderdeel: lak en metaal glimmen, huid en stof nauwelijks */
  m.onBeforeCompile=sh=>{sh.vertexShader='attribute float spec;\nvarying float vSpec;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSpec=spec;');
    sh.fragmentShader='varying float vSpec;\n'+sh.fragmentShader.replace('#include <specularmap_fragment>','#include <specularmap_fragment>\nspecularStrength=vSpec;')};
  return m;
}
/* onderdelen samenvoegen: [vorm, kleur, matrix, glans, uv] — uv = functie die de eigen uv omzet naar het plaatje, anders het witte vlak */
function riderGeo(parts){
  const T=T3,pos=[],nor=[],col=[],spe=[],uvs=[],cc=new T.Color();
  for(const [g0,c,m,s,uvf] of parts){
    const g=g0.index?g0.toNonIndexed():g0;if(m)g.applyMatrix4(m);if(!g.attributes.normal)g.computeVertexNormals();
    const p=g.attributes.position.array,n=g.attributes.normal.array,vc=g.attributes.color&&g.attributes.color.array,uv=g.attributes.uv&&g.attributes.uv.array;if(!vc)cc.set(c);
    for(let i=0,j=0;i<p.length;i+=3,j+=2){pos.push(p[i],p[i+1],p[i+2]);nor.push(n[i],n[i+1],n[i+2]);if(vc)col.push(vc[i],vc[i+1],vc[i+2]);else col.push(cc.r,cc.g,cc.b);spe.push(s??.3);
      if(uvf&&uv){const [u,v]=uvf(uv[j],uv[j+1]);uvs.push(u,v)}else uvs.push(.75,.12)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));
  g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setAttribute('spec',new T.Float32BufferAttribute(spe,1));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));return g;
}
/* matrix voor een buis van a naar b, zoals setLimb die zet */
const tubeM=(a,b)=>{const T=T3,A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),len=d.length();
  return new T.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()),new T.Vector3(1,len,1))};
const RM=(x,y,z,rx,ry,rz,sx,sy,sz)=>new T3.Matrix4().compose(new T3.Vector3(x,y,z),new T3.Quaternion().setFromEuler(new T3.Euler(rx||0,ry||0,rz||0)),new T3.Vector3(sx??1,sy??1,sz??1));
function makeRider(k,ghost){
  const T=T3,mat=riderMat(k,ghost),g=new T.Group(),c=new T.Color();
  const K='#16191f',S='#e0a283',Bk='#141619',Cb='#22252b',Al='#b9bec5',Wt='#f4f4f2',Gl='#1b1d22',F0=k.frame[0],F1=k.frame[1],ACC=k.acc==='#ffffff'?k.base:k.acc;
  const mesh=(parts,parent,len)=>{const m=new T.Mesh(riderGeo(parts),mat);m.userData.len=len||0;(parent||g).add(m);return m};
  /* ledemaat langs y met kleur per ring (mouw, boord, broekspijp, sok) en eventueel per kant (zijpaneel); L = lengte */
  const lathe=(prof,L,side)=>{const geo=new T.LatheGeometry(prof.map(([r,y])=>new T.Vector2(r,(y-.5)*L)),16),cl=[],np=prof.length,seg=16;
    for(let i=0;i<geo.attributes.position.count;i++){const j=i%np,ph=Math.floor(i/np)/seg*Math.PI*2;c.set(side&&prof[j][3]&&Math.abs(Math.sin(ph)-side)<.05?prof[j][3]:prof[j][2]);cl.push(c.r,c.g,c.b)}
    geo.setAttribute('color',new T.Float32BufferAttribute(cl,3));return geo};
  /* buis in twee kleuren lak: van voor naar achter verloopt de kleur */
  const tube=(r,a,b,c0,c1,s)=>{const geo=new T.CylinderGeometry(r,r,1,12).applyMatrix4(tubeM(a,b)),p=geo.attributes.position,cl=[],A=new T.Color(c0),B=new T.Color(c1||c0);
    for(let i=0;i<p.count;i++){c.copy(A).lerp(B,clamp((p.getZ(i)+.35)/.75,0,1));cl.push(c.r,c.g,c.b)}geo.setAttribute('color',new T.Float32BufferAttribute(cl,3));return [geo,null,null,s??1]};
  const cyl=(r,a,b,col,s)=>[new T.CylinderGeometry(r,r,1,10),col,tubeM(a,b),s];
  /* wielen: band met bruine zijkant, hoge carbon velg met opdruk, spaken, naaf, cassette of remschijf */
  const wheel=(z,rear)=>{const tyre=new T.TorusGeometry(.322,.016,10,48),tp=tyre.attributes.position,tc=[];
      for(let i=0;i<tp.count;i++){c.set(Math.hypot(tp.getX(i),tp.getY(i))>.331?'#1a1a1a':'#b8935e');tc.push(c.r,c.g,c.b)}tyre.setAttribute('color',new T.Float32BufferAttribute(tc,3));
    const rim=sx=>{const r=new T.RingGeometry(.25,.307,48,2),rp=r.attributes.position,rc=[];for(let i=0;i<rp.count;i++){const a=Math.atan2(rp.getY(i),rp.getX(i)),rr=Math.hypot(rp.getX(i),rp.getY(i));
        c.set(rr>.262&&rr<.296&&(Math.abs(Math.sin(a))>.92)?'#f2f2f2':Cb);rc.push(c.r,c.g,c.b)}r.setAttribute('color',new T.Float32BufferAttribute(rc,3));return [r,null,RM(sx*.012,0,0,0,sx*Math.PI/2),.8]};
    const P=[[tyre,null,RM(0,0,0,0,Math.PI/2),.15],[new T.CylinderGeometry(.307,.307,.024,48,1,true),Cb,RM(0,0,0,0,0,Math.PI/2),.8],rim(1),rim(-1),[new T.CylinderGeometry(.03,.03,.1,12),Al,RM(0,0,0,0,0,Math.PI/2),1]];
    for(let i=0;i<20;i++){const m=new T.Matrix4().makeRotationX(i*Math.PI/10);m.multiply(new T.Matrix4().makeTranslation(0,.13,0));P.push([new T.CylinderGeometry(.003,.003,.25,3),'#9a9fa5',m,.6])}
    if(rear)for(let i=0;i<6;i++)P.push([new T.CylinderGeometry(.03+i*.008,.03+i*.008,.004,16),'#c9ced4',RM(.03+i*.006,0,0,0,0,Math.PI/2),1]);
    P.push([new T.CylinderGeometry(.075,.075,.003,24),'#c3c7cc',RM(-.045,0,0,0,0,Math.PI/2),1]);
    const w=mesh(P);w.position.set(0,.34,z);return w};
  const wr=wheel(.5,true),wf=wheel(-.52,false);
  /* frame in twee kleuren: zitbuis tot een eind onder het zadel (daarboven de zadelpen), licht aflopende bovenbuis, balhoofd,
     onderbuis met opschrift, achtervork, voorvork met twee poten; stuur een paar centimeter lager dan het zadel */
  const BB=[0,.3,.02],SC=[0,.785,.1],HT=[0,.855,-.405],HB=[0,.685,-.445];
  const dt=new T.CylinderGeometry(.037,.037,1,14);dt.setAttribute('color',new T.Float32BufferAttribute(new Array(dt.attributes.position.count*3).fill(1),3));
  const B=[[dt,null,tubeM(BB,HB),1,(u,v)=>[.5+v*.5,.25+u*.25]],tube(.028,BB,SC,F0,F1),tube(.027,SC,HT,F0,F1),tube(.035,HT,HB,F0,F0)];
  for(const x of[-.04,.04])B.push(tube(.013,[x,.34,.5],[x*.4,.3,.03],F1,F1),tube(.012,[x,.34,.5],[x*.4,.775,.1],F1,F1),tube(.017,[x*.4,.675,-.45],[x*1.15,.34,-.52],F0,F0));
  B.push(cyl(.014,[0,.775,.1],[0,.975,.145],Bk,.5),cyl(.02,[0,.855,-.405],[0,.915,-.42],Bk,.5),cyl(.018,[0,.915,-.42],[0,.94,-.52],Bk,.5),[new T.CylinderGeometry(.038,.033,.04,12),F0,RM(0,.86,-.406,-.22),1]);
  B.push(cyl(.015,[-.21,.94,-.52],[.21,.94,-.52],k.bar,.3));
  for(const x of[-.2,.2])B.push([new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(x,.94,-.52),new T.Vector3(x,.94,-.6),new T.Vector3(x,.88,-.635),new T.Vector3(x,.83,-.6),new T.Vector3(x,.83,-.54)]),14,.015,8),k.bar,null,.3],
    [new T.CapsuleGeometry(.018,.05,3,8),Bk,RM(x,.965,-.6,.5),.4],[new T.BoxGeometry(.006,.07,.012),Al,RM(x*1.08,.92,-.615,.4),1]);
  /* zadel met streep, bidon op de onderbuis */
  B.push([new T.CapsuleGeometry(.05,.18,4,12),Bk,RM(0,.988,.15,Math.PI/2,0,0,1.3,1,.45),.35],[new T.BoxGeometry(.03,.012,.2),ACC,RM(0,1.012,.15),.4],
    [new T.CylinderGeometry(.036,.036,.21,14),k.bottle,RM(0,.52,-.15,-.88),.5],[new T.CylinderGeometry(.02,.02,.03,10),Bk,RM(0,.6,-.245,-.88),.4]);
  /* ketting: boven van blad naar tandwiel, onder via de twee wieltjes van de achterderailleur; voorderailleur en remklauwen */
  B.push(cyl(.006,[.05,.4,.03],[.055,.375,.5],Gl,1),cyl(.006,[.05,.2,.03],[.065,.197,.55],Gl,1),cyl(.006,[.065,.197,.55],[.065,.29,.53],Gl,1),cyl(.006,[.065,.29,.53],[.06,.305,.505],Gl,1),
    ...[[.215,.545],[.29,.515]].map(([y,z])=>[new T.CylinderGeometry(.019,.019,.012,12),'#2a2d33',RM(.067,y,z,0,0,Math.PI/2),.8]),
    cyl(.004,[.074,.215,.545],[.074,.29,.515],'#3a3d44',.8),[new T.BoxGeometry(.02,.05,.035),'#2a2d33',RM(.07,.325,.505),.8],
    [new T.BoxGeometry(.012,.04,.055),'#2a2d33',RM(.04,.41,.04),.8],[new T.BoxGeometry(.03,.04,.05),'#2a2d33',RM(-.05,.35,.46),.8],[new T.BoxGeometry(.03,.04,.05),'#2a2d33',RM(-.05,.36,-.5),.8]);
  mesh(B);
  /* crankstel: beide cranks en het blad draaien samen rond de trapas */
  const crank=mesh([cyl(.012,[-.059,0,0],[-.095,.17,0],'#2a2d33',.8),cyl(.012,[.059,0,0],[.095,-.17,0],'#2a2d33',.8),[new T.CylinderGeometry(.1,.1,.008,32),'#2a2d33',RM(.05,0,0,0,0,Math.PI/2),.9],[new T.CylinderGeometry(.075,.075,.009,24),Al,RM(.054,0,0,0,0,Math.PI/2),1]]);crank.position.set(0,.3,.02);
  /* romp: van heup tot hals een ronde doorsnede die breder wordt naar de schouders, met het shirt erop */
  const tor=new T.Group();g.add(tor);
  {const R=[[-.12,0,0,-.02],[-.08,.11,.085,-.015],[0,.152,.118,-.01],[.1,.162,.124,0],[.22,.154,.116,.012],[.34,.15,.11,.02],[.48,.164,.118,.024],[.62,.192,.132,.02],[.76,.212,.138,.01],[.86,.204,.13,-.004],[.94,.16,.104,-.02],[1,.075,.062,-.03],[1.03,0,0,-.035]];
    const seg=22,pos=[],uv=[],idx=[];
    R.forEach(([y,a,b,zc],j)=>{for(let i=0;i<=seg;i++){const ph=i/seg*Math.PI*2,x=-Math.sin(ph)*a,z=-Math.cos(ph)*b+zc;pos.push(x,y*.5,z);uv.push(i/seg,.5+.5*clamp(y,0,1))}
      if(j)for(let i=0;i<seg;i++){const q=(j-1)*(seg+1)+i,q2=q+seg+1;idx.push(q,q+1,q2,q+1,q2+1,q2)}});
    const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(pos,3));tg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));tg.setIndex(idx);tg.computeVertexNormals();
    mesh([[tg,'#ffffff',null,.25,(u,v)=>[u,v]]],tor)}
  const neck=mesh([[new T.CylinderGeometry(.05,.05,1,10),S,null,.1]],null,1);
  /* hoofd: gezicht, oren, haar in de nek, helm met strepen en gaten, zonnebril */
  const head=new T.Group();g.add(head);
  {const hg=new T.SphereGeometry(.128,26,14,0,Math.PI*2,0,Math.PI*.54),hp=hg.attributes.position;
    for(let i=0;i<hp.count;i++){const z=hp.getZ(i);hp.setZ(i,z*(1+.22*clamp((z-.03)/.1,0,1)))}hg.computeVertexNormals();
    mesh([[new T.SphereGeometry(.093,18,14),S,RM(0,-.012,0,0,0,0,.95,1.08,1.05),.1],...[-1,1].map(s=>[new T.SphereGeometry(.022,8,6),S,RM(s*.085,-.015,.01,0,0,0,.5,1,.8),.1]),
      [new T.SphereGeometry(.09,12,6,Math.PI/2-1.25,2.5,Math.PI*.4,Math.PI*.32),k.hair,RM(0,-.008,.012,0,0,0,1,1,1.05),.15],
      [hg,'#ffffff',RM(0,.012,.015,0,0,0,1,.9,1.15),.8,(u,v)=>[u*.5,v*.5]],
      [new T.TorusGeometry(.097,.02,8,24,Math.PI*.9),'#2b3a6b',RM(0,.02,-.005,Math.PI/2+.1,0,Math.PI*.55),1]],head)}
  /* bovenarm met mouw en boord, onderarm met handschoen */
  const B0=k.base;
  const arms=[-1,1].map(s=>({s,up:mesh([[lathe([[0,0,B0],[.056,.018,B0],[.058,.2,B0],[.055,.38,B0],[.0546,.386,ACC],[.054,.45,ACC],[.0515,.456,S],[.05,.6,S],[.042,.97,S],[0,1,S]],1),null,null,.2]],null,1),
    lo:mesh([[lathe([[0,0,S],[.04,.04,S],[.045,.3,S],[.035,.86,S],[.036,.87,Bk],[.034,.95,Bk],[0,1,Bk]],.28),null,null,.15],[new T.SphereGeometry(.04,12,10),Bk,RM(0,.14,0),.3]],null,.28)}));
  /* bovenbeen met broekspijp, zijpaneel en boord; onderbeen met sok; witte schoen met zwarte zool */
  const legs=[-.095,.095].map(x=>{const l={x,th:mesh([[lathe([[0,0,K,B0],[.084,.03,K,B0],[.092,.25,K,B0],[.083,.55,K,B0],[.0795,.6,ACC],[.0765,.69,ACC],[.0723,.702,S],[.058,.95,S],[0,1,S]],1,x>0?1:-1),null,null,.3]],null,1),
    sh:mesh([[lathe([[0,0,S],[.048,.03,S],[.06,.28,S],[.05,.55,S],[.0386,.83,S],[.039,.834,ACC],[.038,.87,ACC],[.037,.874,Wt],[.036,.92,Wt],[.034,.985,Wt],[0,1,Wt]],1),null,null,.1]],null,1),ftg:new T.Group()};
    g.add(l.ftg);mesh([[new T.CapsuleGeometry(.043,.17,4,10),Wt,RM(0,.026,-.03,Math.PI/2,0,0,1,1,.78),.5],[new T.BoxGeometry(.075,.018,.25),'#1b1d22',RM(0,-.005,-.03),.4],[new T.BoxGeometry(.03,.012,.12),ACC,RM(x>0?.035:-.035,.03,-.05),.5],[new T.BoxGeometry(.09,.015,.07),Gl,RM(0,-.03,0),1]],l.ftg);return l});
  return {g,legs,arms,tor,neck,head,wr,wf,crank,a:Math.random()*6,stand:0,t:0};
}
function setLimb(m,a,b){
  const T=T3,A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),len=d.length(),L=m.userData.len||0;
  m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());m.scale.y=L?len/L:len;
}
/* twee-segment-ketting: knie of elleboog in het vlak, naar de kant van 'pref' */
function joint(a,b,l1,l2,pref){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],d=Math.min(l1+l2-.001,Math.hypot(dx,dy,dz)),ux=dx/d,uy=dy/d,uz=dz/d;
  const k=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-k*k));
  let px=pref[0],py=pref[1],pz=pref[2];const dp=px*ux+py*uy+pz*uz;px-=dp*ux;py-=dp*uy;pz-=dp*uz;const pl=Math.hypot(px,py,pz)||1;
  return [a[0]+ux*k+px/pl*h,a[1]+uy*k+py/pl*h,a[2]+uz*k+pz/pl*h];
}
function poseRider(R,dt,cad,spd,stand){
  R.stand+=((stand?1:0)-R.stand)*Math.min(1,dt*3);const st=R.stand;R.t+=dt;
  R.a+=cad/60*Math.PI*2*dt;const rot=spd*dt/.34;R.wr.rotation.x-=rot;R.wf.rotation.x-=rot;
  const BB=[0,.3,.02],sway=Math.sin(R.a)*st,rock=cad?Math.sin(R.a*2)*.012:0;
  const hip=[sway*.05,1+st*.12,.15-st*.24],sh=[sway*.03,1.36+st*.06+rock,-.21-st*.12];
  /* romp van heup naar schouders */
  const T=T3,dir=new T.Vector3(sh[0]-hip[0],sh[1]-hip[1],sh[2]-hip[2]),len=dir.length();
  R.tor.position.set(...hip);R.tor.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());R.tor.scale.set(1,len/.5,1);R.tor.rotateY(sway*.25);
  const hd=[sh[0],sh[1]+.13,sh[2]-.09];setLimb(R.neck,[sh[0],sh[1]-.03,sh[2]-.01],hd);
  R.head.position.set(hd[0],hd[1]+.05,hd[2]-.03);R.head.rotation.set(-.05+st*.1,0,sway*.08);
  for(const A of R.arms){const s=[sh[0]+A.s*.17,sh[1]-.02,sh[2]+.02],hand=[A.s*.2,.99-st*.02,-.6],el=joint(s,hand,.3,.28,[A.s*.12,-.3,.5]);
    setLimb(A.up,s,el);setLimb(A.lo,el,hand)}
  R.crank.rotation.x=-R.a;
  R.legs.forEach((l,i)=>{
    const a=R.a+i*Math.PI,p=[l.x,BB[1]+.17*Math.cos(a),BB[2]-.17*Math.sin(a)],hp=[hip[0]+l.x*.95,hip[1]-.02,hip[2]];
    const ank=[p[0],p[1]+.075,p[2]+.035],knee=joint(hp,ank,.46,.42,[0,0,-1]);
    setLimb(l.th,hp,knee);setLimb(l.sh,knee,ank);
    l.ftg.position.set(l.x,p[1]+.03,p[2]);l.ftg.rotation.x=-.12+.22*Math.sin(a+.6);
  });
  R.g.rotation.z+=sway*.1;
}

/* ---------- wereld opbouwen ---------- */
/* licht en weer: past bij het tijdstip van de rit, af en toe bewolkt of een bui */
function pickMood(){
  const t=new Date(),h=t.getHours()+t.getMinutes()/60,u=rng(Math.floor(Date.now()/36e5)*7+3)();
  const m={top:'#2f8ae6',hor:'#cfe8f7',sun:'#ffdcae',si:3.3,hemi:1.55,sky:'#e2f0ff',gr:'#566a32',dir:[-70,75,-120],disc:'#fff6d8',exp:1.25,ring:['#a9bfd2','#93abc0'],fog:[70,330],rain:false,disc_on:true,cloud:'#ffffff',name:'dag'};
  if(h>=5&&h<9.5)Object.assign(m,{top:'#5b8fc6',hor:'#f2dcc2',sun:'#ffcf96',si:2.9,hemi:1.3,dir:[-60,32,-140],disc:'#ffe2b0',ring:['#c4b9c4','#a9a9bd'],name:'ochtend'});
  else if(h>=18&&h<21.5)Object.assign(m,{top:'#3b5d98',hor:'#f6b788',sun:'#ffad6a',si:2.7,hemi:1.15,sky:'#ffd9b8',dir:[-60,20,-150],disc:'#ffb36b',ring:['#b79aa6','#8f7f99'],exp:1.3,cloud:'#ffd9c0',name:'avond'});
  else if(h>=21.5||h<5)Object.assign(m,{top:'#18264a',hor:'#5f6688',sun:'#b9c4ff',si:1.2,hemi:.85,sky:'#9aa8d8',gr:'#2a3024',dir:[-40,60,-120],ring:['#4a5070','#3a4060'],exp:1.45,disc_on:false,cloud:'#8890a8',name:'schemer'});
  if(m.name!=='schemer'&&u<.22){Object.assign(m,{top:'#8e9aa6',hor:'#c9ced3',si:m.si*.35,hemi:2.1,sky:'#e6ecf2',disc_on:false,ring:['#aeb6bf','#9aa3ad'],fog:[45,230],cloud:'#d5d9de',name:'bewolkt'});
    if(u<.08)Object.assign(m,{top:'#7d8792',hor:'#aeb4ba',fog:[20,150],rain:true,cloud:'#b8bdc3',name:'regen'})}
  return m;
}
/* ---------- lucht, wolken en een geschilderd decor aan de horizon ---------- */
/* golvende rand rond de cirkel; alleen hele frequenties, zodat het naadloos rondloopt */
const ridge=(u,seed,fr,sharp)=>{let v=0,a=1,s=0;fr.forEach((f,o)=>{const w=Math.sin(u*Math.PI*2*f+seed*(1.3+o)+o*1.9);v+=a*(sharp?1-Math.abs(w):w*.5+.5);s+=a;a*=.52});return v/s};
/* per wereld lagen van ver naar dichtbij; verre lagen lossen op in de nevelkleur van de lucht */
function paintDecor(ty,MO){
  const T=T3,hz=new T.Color(MO.hor),mx=(c,t)=>'#'+new T.Color(c).lerp(hz,t).getHexString();
  return canvasTex(4096,512,(c,w,h)=>{
    const hy=h-62,r=rng(ty.length*97+11);
    const lay=o=>{const N=w/2,ys=new Float32Array(N+1);let top=hy;
      for(let i=0;i<=N;i++){ys[i]=hy-(o.base||0)-o.amp*Math.pow(ridge(i/N,o.seed,o.fr,o.sharp),o.pow||1)-(o.add?o.add(i/N):0);top=Math.min(top,ys[i])}
      c.beginPath();c.moveTo(0,h);for(let i=0;i<=N;i++)c.lineTo(i*2,ys[i]);c.lineTo(w,h);c.closePath();
      const g=c.createLinearGradient(0,top,0,hy+4);g.addColorStop(0,o.col);g.addColorStop(1,o.low||o.col);c.fillStyle=g;c.fill();
      /* schaduwkant van hellingen die van het licht af liggen */
      if(o.shade){c.fillStyle=o.shade;for(let i=0;i<N;i++){const dy=ys[i+1]-ys[i];if(dy>.12){c.globalAlpha=Math.min(.8,dy*.32);c.fillRect(i*2,ys[i],2.4,(hy-ys[i])*(o.sd||.7))}}c.globalAlpha=1}
      /* sneeuw boven een rafelige grens, in de schaduw blauwig */
      if(o.snow!=null)for(let i=0;i<N;i++){const sl=hy-o.snow-ridge(i/N,o.seed+5,[23,41,83],false)*22;if(ys[i]<sl){c.fillStyle=ys[i+1]-ys[i]>.12?o.snowS:o.snowL;c.fillRect(i*2,ys[i]-.5,2.4,sl-ys[i]+1)}}
      /* bomen op de rand: bolletjes of dennetjes */
      if(o.trees){c.fillStyle=o.tcol;for(let x=0;x<w;x+=o.trees[0]*(.6+r()*.8)){const y=ys[Math.min(N,Math.round(x/2))],s=o.trees[1]*(.6+r()*.8);if(o.gap&&ridge(x/w,o.seed+3,[3,7],false)<o.gap)continue;c.beginPath();
        if(o.cone){c.moveTo(x-s*.55,y+3);c.lineTo(x,y-s*1.7);c.lineTo(x+s*.55,y+3)}else c.arc(x,y+s*.25,s,0,7);c.fill()}}
      return ys};
    if(ty==='bergen'){
      lay({amp:330,base:40,fr:[2,5,11,23],sharp:true,pow:1.5,seed:3,col:mx('#a9bad3',.42),low:MO.hor,shade:mx('#7487a8',.38),sd:.6,snow:150,snowL:mx('#f7f9fd',.22),snowS:mx('#c7d2e6',.3)});
      lay({amp:235,base:8,fr:[3,7,13,29],sharp:true,pow:1.6,seed:8,col:mx('#7d8ba4',.24),low:mx('#8d9aae',.5),shade:mx('#55627c',.18),sd:.55,snow:118,snowL:mx('#ffffff',.1),snowS:mx('#bccadf',.14)});
      lay({amp:84,base:-8,fr:[4,9,19,37],seed:13,col:mx('#467452',.28),low:mx('#527d5a',.42),trees:[4,6],tcol:mx('#325c40',.28),cone:true});
    }else if(ty==='provence'){
      /* een kale Mont Ventoux met witte top, de lange ruggen van de Luberon en lage heuvels met struiken */
      lay({amp:70,base:0,fr:[1,2,5],pow:2.2,seed:5,add:u=>235*Math.exp(-Math.pow((u-.32)/.085,2))+60*Math.exp(-Math.pow((u-.43)/.06,2)),col:mx('#9296bb',.42),low:MO.hor,shade:mx('#7c80a8',.35),sd:.5,snow:150,snowL:mx('#efebe4',.25),snowS:mx('#d5d2da',.3)});
      lay({amp:74,base:8,fr:[2,3,7,15],pow:1.3,seed:9,col:mx('#8d88ae',.3),low:mx('#9d9db9',.5),shade:mx('#78739d',.28),sd:.5});
      lay({amp:26,base:-6,fr:[5,11,23],seed:17,col:mx('#939d5e',.2),low:mx('#9aa368',.32),trees:[8,4],tcol:mx('#5f7042',.22),gap:.35});
    }else if(ty==='heuvels'||ty==='meer'){
      lay({amp:96,base:10,fr:[2,3,7],seed:4,col:mx('#82a097',.52),low:MO.hor});
      lay({amp:64,base:0,fr:[3,5,11,19],seed:7,col:mx('#71a05d',.36),low:mx('#7ba366',.48),trees:[7,5],tcol:mx('#58834a',.34),gap:.3});
      if(ty==='heuvels')lay({amp:36,base:-6,fr:[4,9,17],seed:12,col:mx('#7fae55',.2),low:mx('#88b25c',.3),trees:[10,6],tcol:mx('#4f8c3e',.22),gap:.25});
    }else{
      /* polder: verre bomenrijen met boerderijen, kerktorens en molens */
      const ys=lay({amp:10,base:2,fr:[7,13,29,61],pow:1.5,seed:2,col:mx('#6f8e76',.52),low:MO.hor,trees:[4,4],tcol:mx('#6b8b72',.5),gap:.3});
      c.fillStyle=mx('#62806b',.48);
      for(let i=0;i<9;i++){const x=(i+.2+r()*.6)*w/9,y=ys[Math.round(x/2)]+3;
        if(i%3===0){c.fillRect(x-5,y-14,10,14);c.beginPath();c.moveTo(x-4,y-14);c.lineTo(x,y-46-r()*14);c.lineTo(x+4,y-14);c.fill()}
        else if(i%3===1){c.beginPath();c.moveTo(x-5,y);c.lineTo(x-3,y-22);c.lineTo(x+3,y-22);c.lineTo(x+5,y);c.fill();c.save();c.translate(x,y-22);c.rotate(r());c.fillRect(-1,-15,2,30);c.fillRect(-15,-1,30,2);c.restore()}
        else{c.fillRect(x-10,y-7,20,7);c.beginPath();c.moveTo(x-12,y-7);c.lineTo(x,y-14);c.lineTo(x+12,y-7);c.fill()}}
      lay({amp:16,base:-3,fr:[5,11,23,47],pow:1.8,seed:6,col:mx('#5f8b54',.34),low:mx('#6f9a5c',.42),trees:[5,5],tcol:mx('#56824b',.32),gap:.45});
    }
  });
}
/* wolken: vier stapelwolken in één plaatje, met een lichte bovenkant en een blauwgrijze onderkant */
function paintClouds(){
  return canvasTex(1024,512,(c,w,h)=>{
    for(let k=0;k<4;k++){const ox=(k%2)*512,oy=Math.floor(k/2)*256,r=rng(k*31+7),P=[],n=8+Math.floor(r()*5);
      for(let i=0;i<n;i++){const t=i/(n-1),R=(28+r()*32)*(1-Math.abs(t-.5)*.8)+12;P.push([ox+512*(.14+.72*t)+(r()-.5)*24,oy+179-R*.5-r()*16,R])}
      for(let i=0;i<3+k;i++){const R=30+r()*30;P.push([ox+512*(.3+r()*.4),oy+179-50-r()*38,R])}
      for(const [x,y,R] of P){const g=c.createRadialGradient(x,y,R*.25,x,y,R);g.addColorStop(0,'rgba(184,198,220,1)');g.addColorStop(.8,'rgba(190,203,224,.95)');g.addColorStop(1,'rgba(190,203,224,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,R,0,7);c.fill()}
      for(const [x,y,R] of P){const cx=x-R*.18,cy=y-R*.3,g=c.createRadialGradient(cx-R*.15,cy-R*.2,R*.05,cx,cy,R*.82);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.75,'rgba(255,252,248,.96)');g.addColorStop(1,'rgba(255,252,248,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,R*.82,0,7);c.fill()}
      c.save();c.globalCompositeOperation='destination-out';const gb=c.createLinearGradient(0,oy+168,0,oy+196);gb.addColorStop(0,'rgba(0,0,0,0)');gb.addColorStop(1,'rgba(0,0,0,1)');c.fillStyle=gb;c.fillRect(ox,oy+168,512,88);c.restore()}
  });
}
function makeClouds(MO){
  const T=T3,n=MO.name==='bewolkt'||MO.name==='regen'?30:MO.name==='schemer'?9:15,rr=rng(5),pos=[],uv=[],idx=[],Rc=1650;
  for(let i=0;i<n;i++){const az=i/n*Math.PI*2+rr()*.25,el=.045+rr()*rr()*.3,wq=(420+rr()*480)*(n>20?1.2:1),hq=wq*.5,k=Math.floor(rr()*4),col=k%2,row=Math.floor(k/2);
    const cx=Math.cos(az)*Rc,cz=Math.sin(az)*Rc,cy=Math.tan(el)*Rc,tx=-Math.sin(az),tz=Math.cos(az),b=pos.length/3;
    for(const [a,v] of[[-1,-1],[1,-1],[1,1],[-1,1]]){pos.push(cx+tx*a*wq/2,cy+v*hq/2+hq*.2,cz+tz*a*wq/2);uv.push((col+(a+1)/2)/2,1-(row+(1-v)/2)/2)}
    idx.push(b,b+1,b+2,b,b+2,b+3)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const m=new T.Mesh(g,new T.MeshBasicMaterial({map:paintClouds(),color:MO.cloud,transparent:true,opacity:.96,depthWrite:false,fog:false,side:T.DoubleSide}));m.renderOrder=-2;m.frustumCulled=false;return m;
}
/* decor voor elke wereld die in deze rit voorkomt */
function decorFor(C){
  const T=T3,bd=W.ring.userData.bd;
  for(const ty of new Set(C.zones.map(z=>z.ty)))if(!bd[ty]){const tex=paintDecor(ty,W.mood);tex.wrapS=T.RepeatWrapping;tex.repeat.x=2;
    const m=new T.Mesh(new T.CylinderGeometry(1500,1500,520,180,1,true),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.BackSide,fog:false,depthWrite:false}));
    m.position.y=200;m.visible=false;m.frustumCulled=false;W.ring.add(m);bd[ty]=m}
}
/* het decor van de wereld waar je bent; bij een overgang schuift het volgende decor er geleidelijk overheen */
function decorMix(mix){
  const bd=W.ring.userData.bd,ws=Object.keys(bd).map(k=>[k,mix[k]||0]).sort((a,b)=>b[1]-a[1]);
  ws.forEach(([k,w],i)=>{const m=bd[k];m.visible=i===0||w>.01;m.material.opacity=i===0?1:Math.min(1,w*2);m.renderOrder=i===0?-1:-.9})
}
/* ---------- gratis 3D-modellen van Kenney (kenney.nl, CC0) ----------
   Bomen, struiken, rotsen, hout, bloemen en auto's, vooraf omgezet naar één bestand met ingebakken kleuren (tools/kenney.py).
   Ze komen tussen de eigen modellen te staan, zodat je niet steeds dezelfde boom of auto ziet. Lukt het laden niet, dan rijd je gewoon zonder. */
const KN_SCALE={loof:4.5,herfst:4.5,naald:5.5,struik:6,rots:4.5,hout:3.5,bloem:2,auto:1.6};
let KN=null;
async function loadKenney(){
  if(KN)return KN;
  try{const [man,bin]=await Promise.all([fetch('models/kenney.json?v=1').then(r=>{if(!r.ok)throw 0;return r.json()}),fetch('models/kenney.bin?v=1').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()})]);KN={man:man.modellen,bin}}
  catch(e){KN={man:{},bin:null}}
  return KN;
}
function kenneyGeos(){
  const T=T3,out={},cats={},catOf={};if(!KN||!KN.bin)return {out,cats,catOf};
  const lin=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};
  for(const [nm,e] of Object.entries(KN.man)){
    const g=new T.BufferGeometry(),sc=KN_SCALE[e.cat]||1,p=new Float32Array(KN.bin,e.p,e.v*3).slice(),c8=new Uint8Array(KN.bin,e.c,e.v*3),c=new Float32Array(e.v*3);
    for(let i=0;i<p.length;i++)p[i]*=sc;for(let i=0;i<c.length;i++)c[i]=lin(c8[i]);
    g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(new Int8Array(KN.bin,e.n,e.v*3).slice(),3,true));
    g.setAttribute('color',new T.BufferAttribute(c,3));g.setIndex(new T.BufferAttribute(new Uint16Array(KN.bin,e.x,e.i).slice(),1));
    g.computeBoundingSphere();g.userData.shared=true;
    const key='k_'+nm;out[key]=out[key+'~']=out[key+'*']=g;(cats[e.cat]=cats[e.cat]||[]).push(key);catOf[key]=e.cat;
  }
  return {out,cats,catOf};
}
/* Laden kan op een telefoon misgaan (te weinig geheugen, trage verbinding). Dan nooit een leeg blauw scherm laten staan:
   alles opruimen en verder met alleen cijfers. De reden staat in de melding. */
async function worldOpen(){
  if(W)return;
  const tok={loading:true};W=tok;
  const dog=()=>{if(tok.ready)return;if(W!==tok)return worldDrop(tok);if(document.hidden)return setTimeout(dog,5000);worldFail(tok,new Error('laden duurde te lang'))};
  setTimeout(dog,25000);
  try{await worldLoad(tok)}catch(e){console.error(e);worldFail(tok,e)}
}
function worldFail(tok,e){
  const cur=W===tok;worldDrop(tok);if(!cur)return;
  W=null;setView3d(false);
  const why=String(e&&e.message||e||'').slice(0,80);
  toast(`3D lukt niet op dit toestel${why?` (${why})`:''}. Verder met cijfers.`);
  if(P)renderPlayer();
}
/* alles van een (half) geladen wereld vrijgeven; mag vaker worden aangeroepen */
function worldDrop(w){
  try{cancelAnimationFrame(w.raf);if(w.fit)removeEventListener('resize',w.fit);
    if(w.scene)w.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(m.map)m.map.dispose();m.dispose()})});
    if(w.ren){w.ren.dispose();w.ren.forceContextLoss()}}catch(e){}
  if(w.el)w.el.remove();w.el=w.ren=w.scene=null;
}
async function worldLoad(tok){
  /* afgebroken (player dicht of wereld gesloten): opruimen wat er al staat */
  const gone=()=>{if(W===tok&&P)return false;worldDrop(tok);if(W===tok)W=null;return true};
  const kn=loadKenney();T3=T3||await import('three');await kn;
  if(gone())return;
  const T=T3,el=document.createElement('div');el.id='world';el.hidden=!view3d();document.body.appendChild(el);tok.el=el;
  const ren=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});tok.ren=ren;
  /* valt het beeld weg (de telefoon neemt het geheugen terug) en komt het binnen een paar seconden niet terug, dan verder met de cijfers */
  ren.domElement.addEventListener('webglcontextlost',()=>{tok.lost=now();const chk=()=>{if(W!==tok||!tok.lost)return;if(document.hidden)tok.lost=now();if(now()-tok.lost<4000)return setTimeout(chk,1000);worldFail(tok,new Error('het beeld viel weg'))};setTimeout(chk,1000)});
  ren.domElement.addEventListener('webglcontextrestored',()=>{tok.lost=0});
  const small=Math.min(innerWidth,innerHeight)<600,MO=pickMood();
  /* laptop: scherp tot 2x; zakt de beeldsnelheid, dan gaat dit vanzelf omlaag (zie worldFrame) */
  ren.setPixelRatio(Math.min(devicePixelRatio||1,small?1.25:2));ANISO=small?4:ren.capabilities.getMaxAnisotropy();ren.toneMapping=T.NeutralToneMapping;ren.toneMappingExposure=MO.exp*.8;ren.shadowMap.enabled=true;ren.shadowMap.type=small?T.PCFSoftShadowMap:T.PCFShadowMap;el.appendChild(ren.domElement);
  const scene=new T.Scene();scene.background=new T.Color(MO.hor);scene.fog=new T.Fog(MO.hor,MO.fog[0]*(small?1:1.5),MO.fog[1]*(small?1:1.8));
  scene.add(new T.HemisphereLight(MO.sky,MO.gr,MO.hemi));
  const sun=new T.DirectionalLight(MO.sun,MO.si);sun.castShadow=true;sun.shadow.mapSize.set(small?1024:2048,small?1024:2048);
  Object.assign(sun.shadow.camera,small?{left:-30,right:30,top:30,bottom:-30,near:1,far:260}:{left:-38,right:38,top:38,bottom:-38,near:1,far:300});sun.shadow.radius=small?1:2.6;sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
  scene.add(sun,sun.target);
  /* randlicht van achteren: geeft fietsers en bomen een lichte rand, zoals in een animatiefilm */
  const rim=new T.DirectionalLight(MO.name==='schemer'?'#8fa0ff':'#cfe6ff',MO.name==='bewolkt'||MO.name==='regen'?.4:1.1);rim.position.set(60,40,140);scene.add(rim);
  const cam=new T.PerspectiveCamera(60,1,.3,2200);
  /* lucht: verloop van diepblauw naar een heldere horizon, met een warme gloed rond de zon */
  const sky=new T.Mesh(new T.SphereGeometry(1800,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{top:{value:new T.Color(MO.top)},hor:{value:new T.Color(MO.hor)},glow:{value:new T.Color(MO.disc_on?MO.disc:MO.hor)},sd:{value:new T.Vector3(...MO.dir).normalize()}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top,hor,glow,sd;varying vec3 vP;
      void main(){vec3 d=normalize(vP);float h=max(d.y,0.),s=max(dot(d,sd),0.);
        vec3 c=mix(hor,top,pow(smoothstep(0.,.65,h),.62));
        c+=glow*(pow(s,5.)*.2+pow(s,40.)*.28)*(1.-h*.6);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}));
  sky.renderOrder=-3;scene.add(sky);
  /* decor aan de horizon (wordt per wereld geschilderd zodra de route bekend is) en wolken; beide reizen met je mee */
  const ring=new T.Group();ring.userData.bd={};scene.add(ring);
  const clouds=makeClouds(MO);scene.add(clouds);
  const glow=canvasTex(256,256,(c,w,h)=>{const g=c.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,'rgba(255,252,235,1)');g.addColorStop(.12,'rgba(255,246,215,1)');g.addColorStop(.22,'rgba(255,230,180,.45)');g.addColorStop(1,'rgba(255,220,170,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
  const sunDisc=new T.Sprite(new T.SpriteMaterial({map:glow,color:MO.disc,fog:false,depthWrite:false,transparent:true,toneMapped:false}));sunDisc.scale.set(520,520,1);sunDisc.renderOrder=-2.5;sunDisc.visible=MO.disc_on;scene.add(sunDisc);
  /* regen: strepen rond de camera */
  let rain=null;if(MO.rain){const n=small?700:1400,pos=new Float32Array(n*6);for(let i=0;i<n;i++){const x=(Math.random()-.5)*50,y=Math.random()*25,z=(Math.random()-.5)*50;pos.set([x,y,z,x+.05,y+.7,z],i*6)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));rain=new T.LineSegments(g,new T.LineBasicMaterial({color:'#c9d3dc',transparent:true,opacity:.45}));rain.frustumCulled=false;scene.add(rain)}
  /* zachte gloed rond lichte vlakken (alleen op grotere schermen) */
  let comp=null;
  if(!small){try{const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all(['postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/UnrealBloomPass.js','postprocessing/OutputPass.js'].map(f=>import('three/addons/'+f)));
    comp=new EffectComposer(ren,new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples:4}));comp.addPass(new RenderPass(scene,cam));comp.addPass(new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.3,.5,.9));comp.addPass(new OutputPass())}catch(e){comp=null}}
  if(gone())return;
  Object.assign(tok,{el,ren,scene,cam,sun,sky,ring,clouds,sunDisc,mood:MO,rain,lite:small,comp,wind:{value:0},G:propGeos(),root:null,C:null,total:-1,me:makeRider(KITS.me,false),pace:makeRider(KITS.pace,true),vs:0,
     npcs:[KITS.rood,KITS.groen,KITS.geel,KITS.paars,KITS.bollen].slice(0,small?3:5).map(kt=>({R:makeRider(kt,false),d:null,f:1,off:2.25,cad:82+Math.random()*14})),
     disp:0,extra:0,gap:2,last:performance.now(),camP:null,mills:[],raf:0,jobs:new Map(),tex:worldTextures(small)});
  delete tok.loading;
  {const kg=kenneyGeos();Object.assign(tok.G,kg.out);tok.KC=kg.cats;tok.KCAT=kg.catOf}
  for(const R of[W.me,W.pace,...W.npcs.map(n=>n.R)]){R.g.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(R.g)}
  const fit=()=>{const w=innerWidth,h=innerHeight;ren.setSize(w,h);if(comp)comp.setSize(w,h);cam.aspect=w/h;cam.fov=w<h?70:55;cam.setViewOffset(w,h,0,Math.round(h*(w<h?.04:.02)),w,h);cam.updateProjectionMatrix()};
  W.fit=fit;addEventListener('resize',fit);fit();
  worldBuild();
  /* eerst een paar kilometer klaarzetten, met een laadbalk; de rest volgt tijdens het fietsen */
  const bar=()=>document.getElementById('p-load'),n=small?4:6;
  for(let ci=0;ci<n;ci++){if(gone())return;buildChunk(ci);const b=bar();if(b){b.hidden=false;b.querySelector('i').style.width=Math.round((ci+1)/n*100)+'%'}await new Promise(r=>setTimeout(r,0))}
  if(gone())return;
  worldWarm();await new Promise(r=>setTimeout(r,0));if(gone())return;
  const b=bar();if(b)b.hidden=true;W.ready=true;el.hidden=!view3d();
  if(P.wo.type==='demo'&&P.mode==='ready'){P.speed=6;startRide(true)}
  W.raf=requestAnimationFrame(worldFrame);
}
/* Alles wat tijdens de rit kan verschijnen één keer tekenen tijdens het laden, zodat de grafische chip
   zijn tekeninstructies al klaar heeft. Anders hapert het beeld de eerste keer dat er bijvoorbeeld een dorp in beeld komt. */
function worldWarm(){
  const T=T3,tmp=new T.Group(),p=roadAt(W.C,30),box=new T.BoxGeometry(.1,.1,.1),made=[];
  for(const key in W.G){const m=instMesh(key,[[p.x,p.y,p.z,.01,0,null,.01,0]]);m.castShadow=true;m.frustumCulled=false;tmp.add(m);made.push(m)}
  for(const k in W.mat){const m=new T.Mesh(box,W.mat[k]);m.position.set(p.x,p.y,p.z);m.castShadow=true;m.frustumCulled=false;tmp.add(m)}
  for(const o of[makeMill(),makeTurbine(),makeCastle(),makeBalloon(0)]){o.position.set(p.x,p.y,p.z);o.scale.setScalar(.01);o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.frustumCulled=false}});tmp.add(o)}
  W.scene.add(tmp);W.cam.position.set(p.x,p.y+2,p.z+5);W.cam.lookAt(p.x,p.y,p.z);
  if(W.comp)W.comp.render(.016);else W.ren.render(W.scene,W.cam);
  W.scene.remove(tmp);for(const m of made)m.dispose();box.dispose();
}
/* samenvatting van de meting voor bij de rit (zichtbaar met ?meet achter het adres) */
function meetSummary(){const m=W&&W.meet;if(!m||m.n<100)return null;return {fps:Math.round(m.n/(m.s/1000)),small:m.small,big:m.big,list:m.list.sort((a,b)=>b.ms-a.ms).slice(0,8)}}
/* fijne korrel op asfalt en gras, zodat vlakken niet egaal ogen */
function worldTextures(lite){
  const T=T3,noise=(n,base,spread,dots)=>canvasTex(n,n,(c,w,h)=>{c.fillStyle=base;c.fillRect(0,0,w,h);
    for(let i=0;i<dots;i++){const v=Math.round(128+(Math.random()-.5)*spread);c.fillStyle=`rgba(${v},${v},${v},.35)`;c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}});
  const gras=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#ffffff';c.fillRect(0,0,w,h);
    for(let i=0;i<5200;i++){const v=Math.round(150+Math.random()*105),x=Math.random()*w,y=Math.random()*h,l=2+Math.random()*5;c.strokeStyle=`rgba(${v},${v},${v},.55)`;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+(Math.random()-.5)*2,y-l);c.stroke()}});
  /* asfalt over de volle breedte (u) en 48 m lengte (v): fijne korrel, bandensporen, scheuren met teer, grovere rand */
  const asf=canvasTex(lite?256:512,lite?1024:2048,(c,w,h)=>{const k=w/512;c.fillStyle='#676b74';c.fillRect(0,0,w,h);
    for(let i=0;i<70000*k*k;i++){const v=Math.random(),x=Math.random()*w,y=Math.random()*h,sz=(.8+Math.random()*1.4)*k;c.fillStyle=v<.55?`rgba(38,40,46,${.12+v*.22})`:`rgba(196,196,200,${(v-.55)*.32})`;c.fillRect(x,y,sz,sz)}
    for(const u of[.25,.424,.576,.75]){const g=c.createLinearGradient((u-.055)*w,0,(u+.055)*w,0);g.addColorStop(0,'rgba(28,30,36,0)');g.addColorStop(.5,'rgba(28,30,36,.2)');g.addColorStop(1,'rgba(28,30,36,0)');c.fillStyle=g;c.fillRect((u-.055)*w,0,.11*w,h)}
    for(const [u0,u1] of[[0,.07],[.93,1]])for(let i=0;i<5000*k*k;i++){const x=(u0+Math.random()*(u1-u0))*w,y=Math.random()*h;c.fillStyle=Math.random()<.5?'rgba(150,146,138,.35)':'rgba(30,30,32,.3)';c.fillRect(x,y,2.4*k,2.4*k)}
    c.lineCap='round';c.lineJoin='round';
    const crack=(x,y,len,dx,dy,wd)=>{c.strokeStyle='rgba(24,24,28,.42)';c.lineWidth=wd*k;c.beginPath();c.moveTo(x,y);for(let s2=0;s2<len;s2+=10*k){x+=dx*10*k+(Math.random()-.5)*7*k;y+=dy*10*k+(Math.random()-.5)*7*k;c.lineTo(x,y)}c.stroke()};
    crack(w*.62,h*.1,h*.12,0,1,1.8);crack(w*.06,h*.55,h*.2,0,1,2);crack(w*.93,h*.2,h*.16,0,1,2);
    for(let i=0;i<5;i++)crack(w*(.15+Math.random()*.7),h*(.1+Math.random()*.8),w*(.08+Math.random()*.18),Math.random()<.5?1:-1,(Math.random()-.5)*.4,1.2+Math.random()*1.1);
    for(let i=0;i<14;i++){c.strokeStyle='rgba(25,25,30,.35)';c.lineWidth=1*k;let x=Math.random()*w,y=h*(.05+Math.random()*.9);c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=(Math.random()-.5)*16*k;y+=(Math.random()-.5)*16*k;c.lineTo(x,y)}c.stroke()}});
  for(const t of[asf,gras]){t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.NoColorSpace}
  gras.colorSpace=T.SRGBColorSpace;asf.colorSpace=T.SRGBColorSpace;
  const klinker=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#8a6b5a';c.fillRect(0,0,w,h);
    for(let y=0;y<16;y++)for(let x=-1;x<9;x++){const v=Math.random()*30-15;c.fillStyle=`rgb(${165+v},${92+v*.6},${70+v*.5})`;c.fillRect(x*32+(y%2)*16+1,y*16+1,30,14)}});
  klinker.wrapS=klinker.wrapT=T.RepeatWrapping;
  const tegel=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#9a958c';c.fillRect(0,0,w,h);for(let y=0;y<4;y++)for(let x=0;x<4;x++){const v=Math.random()*14-7;c.fillStyle=`rgb(${196+v},${190+v},${180+v})`;c.fillRect(x*32+1.5,y*32+1.5,29,29)}});
  tegel.wrapS=tegel.wrapT=T.RepeatWrapping;
  const steen=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#8f877a';c.fillRect(0,0,w,h);for(let y=0;y<8;y++)for(let x=-1;x<5;x++){const v=Math.random()*24-12;c.fillStyle=`rgb(${205+v},${192+v},${168+v})`;c.fillRect(x*64+(y%2)*32+2,y*32+2,60,28)}});
  steen.wrapS=steen.wrapT=T.RepeatWrapping;
  return {asf,gras,klinker,tegel,steen};
}
/* bergtop in de verte: grillige kegel met graten, rots met sneeuw erboven; licht en nevel zitten al in de kleur */
function peakGeo(MO,seed){
  const T=T3,g=new T.ConeGeometry(1,1,11,6,true).translate(0,.5,0).toNonIndexed(),p=g.attributes.position,r=rng(seed+1),ph=[r()*6,r()*6,r()*6];
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);if(y>.999)continue;
    const k=1+.2*Math.sin(a*3+ph[0])+.2*Math.sin(a*5+ph[1]+y*4)+.13*Math.sin(a*9+ph[2]-y*7);p.setXYZ(i,x*k,y*(1+.07*Math.sin(a*7+ph[1])),z*k)}
  g.computeVertexNormals();
  const n=g.attributes.normal,cl=[],c=new T.Color(),hz=new T.Color(MO.hor),sd=new T.Vector3(...MO.dir).normalize();
  for(let f=0;f<p.count;f+=3){const cy=(p.getY(f)+p.getY(f+1)+p.getY(f+2))/3,lit=n.getX(f)*sd.x+n.getY(f)*sd.y+n.getZ(f)*sd.z,sl=.48+.1*Math.sin(f*1.7+seed);
    c.set(cy>sl&&n.getY(f)>.12?(lit>.15?'#f6f8fc':'#c2cee2'):cy<.14?(lit>.15?'#5f7d55':'#4b6548'):(lit>.15?'#8c95a3':'#69738a'));c.lerp(hz,.3);for(let k=0;k<3;k++)cl.push(c.r,c.g,c.b)}
  g.setAttribute('color',new T.Float32BufferAttribute(cl,3));return g;
}
function worldClose(){
  if(!W)return;const w=W;W=null;worldDrop(w);
}
/* binnenkant van een bocht: het land niet verder laten reiken dan de straal, anders schuift het over zichzelf */
const innerOff=(off,k)=>{if(off*k<=0)return off;const lim=Math.max(8,.8/Math.abs(k));return Math.sign(off)*lim*Math.tanh(Math.abs(off)/lim)};
/* Waar de weg na een paar bochten weer dichtbij komt, mag het land van het ene stuk niet over het andere heen liggen:
   het land wordt dan ingekort tot halverwege beide stukken weg. */
function roadHash(C){
  const cell=200,m=new Map();
  for(let k=0;k<C.N;k+=3){const key=Math.floor(C.X[k]/cell)*100003+Math.floor(C.Z[k]/cell);let a=m.get(key);if(!a)m.set(key,a=[]);a.push(k)}
  C.hash=m;C.cell=cell;
}
function intrudes(C,d,x,z,ao){
  const c=C.cell,r=Math.ceil(ao/c),cx=Math.floor(x/c),cz=Math.floor(z/c),lim=ao*ao*.9;
  for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){const a=C.hash.get((cx+i)*100003+cz+j);if(!a)continue;
    for(const k of a){let e=Math.abs(k*STEP-wrapD(C,d));e=Math.min(e,C.L-e);if(e<20)continue;const dx=C.X[k]-x,dz=C.Z[k]-z;if(dx*dx+dz*dz<lim)return k}}
  return -1;
}
function clipOff(C,d,p,off){
  const nx=Math.cos(p.h),nz2=Math.sin(p.h),ao=Math.abs(off);
  let kk=ao<15?-1:intrudes(C,d,p.x+nx*off,p.z+nz2*off,ao);if(kk<0)return [off,-1];
  let lo=0,hi=off;for(let i=0;i<8;i++){const m=(lo+hi)/2,k=intrudes(C,d,p.x+nx*m,p.z+nz2*m,Math.abs(m));if(k>=0){hi=m;kk=k}else lo=m}
  return [lo,kk];
}
function worldBuild(){
  const T=T3;
  if(W.root){for(const ci of [...W.chunks.keys()])dropChunk(ci);W.root.traverse(o=>{if(o.geometry&&!o.userData.shared)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(m.map&&m.map!==W.tex.asf&&m.map!==W.tex.gras)m.map.dispose();m.dispose()})});W.scene.remove(W.root)}
  W.jobs=new Map();const C=buildCourse(),root=new T.Group();roadHash(C);C.finish=-1e9;W.C=C;decorFor(C);W.root=root;W.mills=[];W.chunks=new Map();W.dist=12;W.v=0;W.lastD=0;
  if(!W.mat){const tree=new T.MeshPhongMaterial({vertexColors:true,shininess:12,specular:'#1a1a1a'});
    const crowd=new T.MeshLambertMaterial({vertexColors:true});
    const tintPart=v=>'attribute float pat;\n'+v.replace('#include <color_vertex>','vColor=vec3(1.);\n#ifdef USE_COLOR\nvColor*=color;\n#endif\n#ifdef USE_INSTANCING_COLOR\nvColor.xyz*=mix(vec3(1.),instanceColor.xyz,pat);\n#endif');
    crowd.onBeforeCompile=sh=>{sh.uniforms.uT=W.wind;sh.vertexShader='uniform float uT;\n'+tintPart(sh.vertexShader).replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);transformed.y+=max(0.,sin(uT*7.+ip.x*1.7+ip.z*.9))*.16;')};
    const walk=new T.MeshLambertMaterial({vertexColors:true});walk.onBeforeCompile=sh=>{sh.vertexShader=tintPart(sh.vertexShader)};
    tree.onBeforeCompile=sh=>{sh.uniforms.uT=W.wind;sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sw=max(0.,position.y-.8)*.035;vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);transformed.x+=sin(uT*1.6+ip.x*.15+ip.z*.1)*sw;transformed.z+=cos(uT*1.3+ip.z*.15)*sw*.6;')};
    /* gevels en daken: patroon per vlak, langs de muur gemeten zodat stenen niet uitrekken als het huis gedraaid staat;
       ramen spiegelen de lucht en vangen soms de zon */
    const HSH={uTop:{value:new T.Color(W.mood.top)},uHor:{value:new T.Color(W.mood.hor)},uSun:{value:new T.Vector3(...W.mood.dir).normalize()},uSunC:{value:new T.Color(W.mood.disc_on?W.mood.sun:W.mood.hor)},uNight:{value:W.mood.name==='schemer'?1:W.mood.name==='avond'?.3:0}};
    const facade=(mt,U=HSH)=>{mt.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
      sh.vertexShader='attribute float pat;\nvarying vec3 vWP;varying float vPat,vLY;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;vPat=pat;vLY=transformed.y;');
      sh.fragmentShader='varying vec3 vWP;varying float vPat,vLY;uniform vec3 uTop,uHor,uSun,uSunC;uniform float uNight;\nfloat hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}\nfloat vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y);}\n'
        +sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 nn=normalize(cross(dFdx(vWP),dFdy(vWP)));float ny=abs(nn.y);int P=int(vPat+.5);if(P==0)P=ny<.35?2:ny<.95?7:1;
        float u=dot(vWP.xz,normalize(vec2(-nn.z,nn.x)+1e-4));
        if(ny<.35){
          if(P==2){float row=floor(vLY/.27),s=u+mod(row,2.)*.45;diffuseColor.rgb=mix(diffuseColor.rgb*(.9+.17*hh(vec2(row,floor(s/.9)))),vec3(.6,.58,.54),.7*max(step(fract(s/.9),.04),step(fract(vLY/.27),.1)));}
          else if(P==3){diffuseColor.rgb*=.9+.13*vn(vec2(u,vLY)*1.7)+.06*hh(floor(vec2(u,vLY)*38.))-.13*step(vLY,.42);}
          else if(P==4){float row=floor(vLY/.22);diffuseColor.rgb*=mix(.84+.22*hh(vec2(row,floor(u/2.6+row*.37))),.55,step(fract(vLY/.22),.09));}
          else if(P==5){float row=floor(vLY/.34),s=u+mod(row,2.)*.31;diffuseColor.rgb*=mix(.8+.3*hh(vec2(row,floor(s/.62))),.66,max(step(fract(s/.62),.05),step(fract(vLY/.34),.1)));}}
        else if(ny<.95){
          if(P==7){float row=floor(vLY/.3);diffuseColor.rgb*=mix(.87+.17*hh(vec2(row,floor(u/.45))),.7,step(fract(vLY/.3),.16));}
          else if(P==8){diffuseColor.rgb*=(.76+.32*sin(fract(u/.24)*3.1416))*(.9+.14*hh(vec2(floor(u/.24),floor(vLY/.42))));}
          else if(P==9){float row=floor(vLY/.2),s=u+mod(row,2.)*.14;diffuseColor.rgb*=mix(.84+.2*hh(vec2(row,floor(s/.28))),.64,max(step(fract(vLY/.2),.12),step(fract(s/.28),.05)));}}`)
        .replace('#include <opaque_fragment>',`if(P==6){vec3 V=normalize(vWP-cameraPosition),N=dot(V,nn)>0.?-nn:nn,R=reflect(V,N);float fr=.3+.7*pow(1.-abs(dot(V,N)),3.);
          vec3 sk=mix(uHor,uTop,pow(clamp(R.y,0.,1.),.55))+uSunC*pow(max(dot(R,uSun),0.),220.)*3.;outgoingLight=mix(outgoingLight,sk,fr*.82);
          /* 's avonds brandt hier en daar licht achter de ramen */
          outgoingLight+=uNight*vec3(1.,.66,.32)*1.5*step(.5,hh(floor(vWP.xz*.45)+floor(vLY/2.6)*7.));}
        #include <opaque_fragment>`)}};
    const house=new T.MeshPhongMaterial({vertexColors:true,shininess:10,specular:'#202020'});facade(house);
    const car=new T.MeshPhongMaterial({vertexColors:true,shininess:80,specular:'#8a8a8a'});facade(car,{...HSH,uNight:{value:0}});
    const ds={side:T.DoubleSide};
    W.mat={edgeStone:new T.MeshLambertMaterial({...ds,map:W.tex.steen,vertexColors:true}),edgeHedge:new T.MeshLambertMaterial({...ds,map:W.tex.gras,vertexColors:true}),edgeWood:new T.MeshLambertMaterial({...ds,vertexColors:true}),
      edgeRail:new T.MeshPhongMaterial({...ds,vertexColors:true,shininess:70,specular:'#777777'}),tree,crowd,walk,house,car,tegel:new T.MeshLambertMaterial({map:W.tex.tegel}),blob:new T.MeshBasicMaterial({color:'#000',transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),
    lam:new T.MeshLambertMaterial({vertexColors:true,map:W.tex.gras}),asf:new T.MeshLambertMaterial({map:W.tex.asf,vertexColors:true}),rood:new T.MeshLambertMaterial({map:W.tex.asf,color:new T.Color(2.3,.62,.44),polygonOffset:true,polygonOffsetFactor:-1}),
    lap:new T.MeshLambertMaterial({map:W.tex.asf,color:new T.Color(.8,.8,.82),polygonOffset:true,polygonOffsetFactor:-1}),naad:new T.MeshLambertMaterial({color:'#36373c',polygonOffset:true,polygonOffsetFactor:-1}),
    woord:new T.MeshLambertMaterial({map:roadWords(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}),line:new T.MeshLambertMaterial({color:'#f2f0e8'}),
    water:new T.MeshPhongMaterial({color:'#3aa6e0',shininess:90,specular:'#cfefff',transparent:true,opacity:.9,side:T.DoubleSide}),inst:new T.MeshPhongMaterial({vertexColors:true,shininess:22,specular:'#262626'}),
    piek:new T.MeshBasicMaterial({vertexColors:true,fog:false,transparent:true}),
    klinker:new T.MeshLambertMaterial({map:W.tex.klinker}),steen:new T.MeshLambertMaterial({map:W.tex.steen}),
    wolk:new T.MeshBasicMaterial({vertexColors:true,color:W.mood.cloud,transparent:true,opacity:.9,fog:false})};if(W.mood.rain)for(const k of['asf','rood','lap'])W.mat[k].color.multiplyScalar(.72)}
  /* start/finish van de ronde, en onderaan elke klim een bord met het gemiddelde stijgingspercentage */
  const arch=(ar,d)=>{const p=roadAt(C,d);ar.position.set(p.x,p.y,p.z);ar.rotation.y=-p.h;root.add(ar)};
  arch(makeArch('#20242c',C.route.name.toUpperCase(),true),0);
  for(const c of C.climbs){if(c.g<3)continue;const sg=makeSign(Math.round(c.g)),p=roadAt(C,c.a-30);sg.position.set(p.x+Math.cos(p.h)*5.4,p.y,p.z+Math.sin(p.h)*5.4);sg.rotation.y=-p.h;root.add(sg)}
  W.scene.add(root);
  if(W.ready){const c=Math.floor((W.lastD||0)/CH);for(let ci=Math.max(0,c-1);ci<=c+2;ci++)buildChunk(ci)}
}
/* De wereld wordt per kilometer opgebouwd: alleen de stukken rond de fietser staan klaar. */
const CH=1000,DS=8;
function dropChunk(ci){
  const g=W.chunks.get(ci);if(!g)return;W.chunks.delete(ci);W.root.remove(g);
  const keep=new Set(Object.values(W.mat));
  g.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.sails)W.mills=W.mills.filter(s=>s!==o.userData.sails);if(o.geometry&&!o.userData.shared)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(!keep.has(m))m.dispose()})});
}
/* Een kilometer wereld bouwen kost op een MacBook Air 10 tot 40 ms: te lang voor één beeld.
   Daarom is de opbouw een reeks stapjes (yield) die over meerdere beelden wordt verdeeld; zie chunkStep. */
function buildChunk(ci){W.built=true;const j=W.jobs.get(ci)||chunkJob(ci);W.jobs.delete(ci);while(!j.next().done);}
function chunkStep(ci,budget){
  W.built=true;let j=W.jobs.get(ci);if(!j){j=chunkJob(ci);W.jobs.set(ci,j)}
  const t0=performance.now();
  do{if(j.next().done){W.jobs.delete(ci);return true}}while(performance.now()-t0<budget);
  return false;
}
const INST={CROWD:new Set(['mens','mens2','mens3','vlag']),HOUSE:new Set(['villa','mas3','mas4','chalet3','mergel2','rood','wit','geel','rij','winkel','trapgevel','groen','boerderij','chalet','chalet2','mas','mas2','vakwerk','mergel','vakhoeve','kerk','alpenkerk','schuur','huis','kapel']),WIND:new Set(['varen','distel','boom','den','populier','struik','pol','bloem','klaproos','madelief','riet','knotwilg','berk','eik','fruitboom','plataan','olijf','cipres'])};
/* één soort object, vaak herhaald, als één InstancedMesh */
function instMesh(key,L){
  const T=T3,M=W.mat,{CROWD,HOUSE,WIND}=INST,Mx=new T.Matrix4(),k=key.replace('*',''),kb=k.replace('~','');
  const kc=W.KCAT&&W.KCAT[kb];
  const m=new T.InstancedMesh(W.G[key]||W.G[k],kc?(kc==='loof'||kc==='herfst'||kc==='naald'||kc==='struik'||kc==='bloem'?M.tree:M.inst):HOUSE.has(kb)?M.house:kb==='auto'?M.car:kb.startsWith('piek')?M.piek:kb==='wolk'?M.wolk:kb==='blob'?M.blob:WIND.has(kb)?M.tree:CROWD.has(kb)?M.crowd:kb==='loper'?M.walk:M.inst,L.length);m.userData.shared=true;
  const wc=new T.Color(1,1,1),e=new T.Euler(),q=new T.Quaternion(),v=new T.Vector3(),sc=new T.Vector3();
  L.forEach(([x,y,z,s,ry,col,sy,tl],i)=>{e.set(tl||0,ry||0,(tl||0)*.7);q.setFromEuler(e);Mx.compose(v.set(x,y,z),q,sc.set(s,sy||s,s));m.setMatrixAt(i,Mx);m.setColorAt(i,col||wc)});
  if(k.startsWith('piek')||k==='wolk')m.userData.far=true;if(k.startsWith('piek'))m.frustumCulled=false;if(k==='blob')m.receiveShadow=false;m.castShadow=key!==k||(HOUSE.has(kb)&&!W.lite);
  m.computeBoundingSphere();if(k==='wolk')m.frustumCulled=false;return m;
}
function* chunkJob(ci){
  const T=T3,C=W.C,M=W.mat,cl=ci%C.lapKm,a=cl*CH;if(a>=C.L||W.chunks.has(ci))return;
  const g=new T.Group(),r=rng(C.seed+cl*7919+3);
  const geo=(pos,idx,col,uv)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(col)g.setAttribute('color',new T.Float32BufferAttribute(col,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g};
  const lam=M.lam;
  const OFF=[-95,-78,-64,-53,-44,-36,-29,-23,-18,-14,-10.5,-7.5,-5.6,-4.4,4.4,5.6,7.5,10.5,14,18,23,29,36,44,53,64,78,95];
  const grass={polder:new T.Color('#79c24a'),heuvels:new T.Color('#6cb846'),bergen:new T.Color('#62a64a'),meer:new T.Color('#7cc552'),provence:new T.Color('#b4b263'),bos:new T.Color('#4f8a36')};
  const PFIELD=['#9a78d6','#e4c86a','#b3c262','#c9a868','#8f6ad0'].map(c=>new T.Color(c));
  const FIELD=['#8fd05a','#b0d860','#e6cf6a','#9a7a52','#72bd4a','#c6dc70','#a2cf52'].map(c=>new T.Color(c)),rock=new T.Color('#8f8a86'),snow=new T.Color('#f3f5f8'),sand=new T.Color('#d8c99a'),berm=new T.Color('#9a9a7a'),pave=new T.Color('#b4aa9c'),tmp=new T.Color();
    const rows=Math.ceil(Math.min(CH,C.L-a)/DS)+1,pos=[],col=[],uv=[],idx=[];
    for(let j=0;j<rows;j++){if(j%40===39)yield;
      const d=Math.min(C.L-1,a+j*DS),p=roadAt(C,d),mix=landMix(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      const bnd={'-1':clipOff(C,d,p,innerOff(-95,p.k)),'1':clipOff(C,d,p,innerOff(95,p.k))};
      for(const off0 of OFF){
        const [b,kb]=bnd[Math.sign(off0)],o1=innerOff(off0,p.k),off=Math.abs(o1)>Math.abs(b)?b:o1;
        let y=landH(C,d,off,mix,p.y);
        if(kb>=0){const t=Math.pow(Math.abs(off/b),2),mid=(p.y+C.Y[kb])/2+nz(d,off)*2;y=y*(1-t)+mid*t}
        const wx=p.x+nx*off,wz=p.z+nzv*off;pos.push(wx,y,wz);uv.push(wx/14,wz/14);
        tmp.setRGB(0,0,0);for(const k in mix)if(mix[k])tmp.r+=grass[k].r*mix[k],tmp.g+=grass[k].g*mix[k],tmp.b+=grass[k].b*mix[k];
        const ao=Math.abs(off);
        if(ao>11&&mix.provence>.3){const pl=Math.floor((d+off*.3)/70)*29+Math.floor(off/24)*5+ci,f=PFIELD[Math.abs(Math.floor(Math.sin(pl*9.7)*1e4))%PFIELD.length];tmp.lerp(f,.5*mix.provence)}
        if(ao>11&&(mix.polder>.3||mix.heuvels>.3)){const pl=Math.floor((d+off*.35)/75)*31+Math.floor(off/26)*7+ci,f=FIELD[Math.abs(Math.floor(Math.sin(pl*12.99)*1e4))%FIELD.length];tmp.lerp(f,.5*(mix.polder+mix.heuvels*.6))}
        tmp.offsetHSL(0,0,nz(d*2,off*2)*.06+nz(d*.25,off*.25)*.05);
        const rel=y-p.y;if(rel<-.5&&ao>6)tmp.multiplyScalar(.9);
        if(mix.bergen>.3&&rel>12)tmp.lerp(rock,clamp((rel-12)/22,0,.9));if(mix.bergen>.3&&rel>70)tmp.lerp(snow,clamp((rel-70)/12,0,1));
        if(mix.meer>.3&&off<-15&&off>-30)tmp.lerp(sand,.7);
        if(Math.abs(off0)<5)tmp.lerp(berm,.55);
        const vw=villageW(C,d);if(vw>.3&&ao<7.3)tmp.lerp(pave,vw);
        col.push(tmp.r,tmp.g,tmp.b);
      }
    }
    const nc=OFF.length;
    for(let j=0;j<rows-1;j++)for(let i=0;i<nc-1;i++){if(OFF[i]===-4.4)continue;const q=j*nc+i;idx.push(q,q+1,q+nc,q+1,q+nc+1,q+nc)}
    const tm=new T.Mesh(geo(pos,idx,col,uv),lam);tm.receiveShadow=true;g.add(tm);
    yield;
    /* weg: asfalt met een tint per wereld (Provence lichter en warmer) */
    const ap=[],au=[],ac=[],ai=[],RS=4,rr=Math.ceil(Math.min(CH,C.L-a)/RS)+1,end=Math.min(C.L-1,a+CH),TINT={polder:[.95,.96,1],heuvels:[1,1,1.02],meer:[1,1,1.02],provence:[1.13,1.09,1.02],bergen:[1.04,1.04,1.07],bos:[.97,.98,1]};
    for(let j=0;j<rr;j++){const d=Math.min(C.L-1,a+j*RS),p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h),mix=landMix(C,d);let tr=0,tg=0,tb=0;for(const k in mix)if(mix[k]){const t=TINT[k];tr+=t[0]*mix[k];tg+=t[1]*mix[k];tb+=t[2]*mix[k]}
      for(const off of[-4.6,-3.2,3.2,4.6]){ap.push(p.x+nx*off,p.y+(Math.abs(off)>4?-.06:0),p.z+nzv*off);au.push((off+4.6)/9.2,d/48);ac.push(tr,tg,tb)}
      if(j<rr-1){const q=j*4;for(let i=0;i<3;i++)ai.push(q+i,q+i+1,q+i+4,q+i+1,q+i+5,q+i+4)}}
    const am=new T.Mesh(geo(ap,ai,ac,au),M.asf);am.receiveShadow=true;g.add(am);
    /* vlak op het wegdek tussen d0 en d1, van o0 tot o1 meter uit het midden; volgt de bolling naar de rand */
    const ry0=o=>Math.abs(o)>3.2?-.06*(Math.abs(o)-3.2)/1.4:0;
    const strip=(P,I,U,d0,d1,o0,o1,y,n=1)=>{if(o0>o1)[o0,o1]=[o1,o0];const b0=P.length/3;for(let i=0;i<=n;i++){const dd=d0+(d1-d0)*i/n,q=roadAt(C,dd),cx=Math.cos(q.h),cz=Math.sin(q.h);for(const o of[o0,o1]){P.push(q.x+cx*o,q.y+ry0(o)+y,q.z+cz*o);if(U)U.push((o+4.6)/9.2,dd/48)}
      if(i)I.push(b0+i*2-2,b0+i*2-1,b0+i*2,b0+i*2-1,b0+i*2+1,b0+i*2)}};
    /* belijning per wereld (dorpen hebben klinkers zonder strepen):
       polder rode fietsstroken met onderbroken streep, Limburg onderbroken kantstrepen zonder middenstreep,
       Provence en Alpen een Franse middenstreep (3 m streep, 10 m gat) met doorgetrokken kantstrepen */
    const LN={polder:{e:[3.02,.065,1.5,1.5],red:1},heuvels:{e:[2.95,.07,3,3]},meer:{e:[2.95,.07],m:[4,8]},provence:{e:[2.95,.06],m:[3,10]},bergen:{e:[2.95,.07],m:[3,10]},bos:{e:[2.95,.07,3,3]}};
    const lp=[],li=[],rp=[],ru=[],ri=[],lnAt=d=>villageW(C,d)>=.5?null:LN[zoneAt(C,d).ty]||LN.meer;
    for(let d=a;d<end;d+=RS){const L=lnAt(d),d1=Math.min(end,d+RS);if(!L)continue;
      for(const s2 of[-1,1]){if(!L.e[2])strip(lp,li,null,d,d1,s2*L.e[0]-L.e[1],s2*L.e[0]+L.e[1],.025);if(L.red)strip(rp,ri,ru,d,d1,s2*(L.e[0]+L.e[1]),s2*4.42,.013)}}
    /* onderbroken strepen in een vast ritme langs de hele route, zodat ze over stukgrenzen netjes doorlopen */
    for(const ty in LN){const L=LN[ty],dash=(P0,on,o,wd)=>{for(let d0=Math.ceil(a/P0)*P0;d0<end;d0+=P0)if(lnAt(d0)===L)strip(lp,li,null,d0,Math.min(d0+on,C.L-1),o-wd,o+wd,.025)};
      if(L.e[2])for(const s2 of[-1,1])dash(L.e[2]+L.e[3],L.e[2],s2*L.e[0],L.e[1]);if(L.m)dash(L.m[0]+L.m[1],L.m[0],0,.065)}
    const lm=new T.Mesh(geo(lp,li),M.line);lm.receiveShadow=true;g.add(lm);yield;
    if(ri.length){const rm=new T.Mesh(geo(rp,ri,null,ru),M.rood);rm.receiveShadow=true;g.add(rm)}
    /* reparaties: donkerder vlakken met een teernaad, op willekeurige plekken in de rijbaan */
    {const pp=[],pu=[],pi=[],np=[],ni=[];for(let d=a+20+r()*60;d<end-8;d+=50+r()*110){if(villageW(C,d)>.3)continue;
      const len=2+r()*5,u=r(),o0=u<.4?.3+r()*.8:u<.75?-2.6+r()*1.2:-2.9,o1=u<.75?o0+1+r()*1.6:2.9;
      strip(np,ni,null,d-.03,d+len+.03,o0-.03,o1+.03,.006,2);strip(pp,pi,pu,d,d+len,o0,o1,.009,2)}
      if(pi.length){const m1=new T.Mesh(geo(np,ni),M.naad),m2=new T.Mesh(geo(pp,pi,null,pu),M.lap);m1.receiveShadow=m2.receiveShadow=true;g.add(m1,m2)}}
    /* aanmoedigingen op het asfalt van klimmen in de Alpen en Limburg */
    {const wp=[],wu=[],wi=[];for(let d=Math.ceil(a/10)*10;d<end-6;d+=10){const ty=zoneAt(C,d).ty;if((ty!=='bergen'&&ty!=='heuvels')||villageW(C,d)>0||(roadAt(C,d+30).y-roadAt(C,d).y)/30<.04||d%170>=10||r()>.65)continue;
      const k=Math.floor(r()*8),cx=r()<.5?0:1.25,b0=wp.length/3;for(let i=0;i<=3;i++){const dd=d+i*2.6,q=roadAt(C,dd),nx2=Math.cos(q.h),nz2=Math.sin(q.h);for(const o of[cx-2.8,cx+2.8]){wp.push(q.x+nx2*o,q.y+.02,q.z+nz2*o);wu.push(o<cx?0:1,1-(k+1-i/3)/8)}
        if(i)wi.push(b0+i*2-2,b0+i*2-1,b0+i*2,b0+i*2-1,b0+i*2+1,b0+i*2)}}
      if(wi.length){const m=new T.Mesh(geo(wp,wi,null,wu),M.woord);m.receiveShadow=true;g.add(m)}}
  yield;
  /* water bij het meer */
  for(const zn of C.zones)if(zn.ty==='meer'&&zn.b+60>a&&zn.a-60<a+CH){
    const pos=[],idx=[];let j=0;
    for(let d=Math.max(a,zn.a-60);d<=Math.min(C.L-1,zn.b+60,a+CH);d+=16,j++){const p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const o0 of[-20,-420]){const o=clipOff(C,d,p,innerOff(o0,p.k))[0];pos.push(p.x+nx*o,p.y-1.9,p.z+nzv*o)}
      if(j)idx.push((j-1)*2,(j-1)*2+1,j*2,(j-1)*2+1,j*2+1,j*2)}
    if(idx.length)g.add(new T.Mesh(geo(pos,idx),M.water));
  }
  /* kanalen met een brug */
  if(!W.G.piek0)for(let i=0;i<3;i++)W.G['piek'+i]=peakGeo(W.mood,i*7+3);
  const rk=rng(C.seed+cl*131+7),KSUB={boom:['loof',.5],eik:['loof',.45],plataan:['loof',.3],den:['naald',.55],struik:['struik',.5],rots:['rots',.6],stam:['hout',.7],auto:['auto',.75],bloem:['bloem',.35]};
  const lists={};const put=(k,x,y,z,s,ry,col,sy,tl)=>{if(W.lite&&(k==='pol'||k==='bloem'||k==='struik'||k==='mens2')&&r()<.45)return;
    const km=W.KC&&/^([a-z]+)([~*]?)$/.exec(k),sb=km&&KSUB[km[1]];
    if(sb&&W.KC[sb[0]]&&rk()<sb[1]){const L=sb[0]==='loof'&&W.KC.herfst&&rk()<.07?W.KC.herfst:W.KC[sb[0]];k=L[Math.floor(rk()*L.length)]+km[2];
      if(sb[0]==='auto')col=null;else{s*=.85;if(sy)sy*=.85}}
    (lists[k]=lists[k]||[]).push([x,y,z,s,ry,col,sy,tl])};
  for(const dc of C.canals)if(dc>=a&&dc<a+CH){
    const p=roadAt(C,dc),nx=Math.cos(p.h),nzv=Math.sin(p.h),wm=new T.Mesh(new T.PlaneGeometry(200,12),M.water);
    wm.rotation.set(-Math.PI/2,-p.h,0,'YXZ');
    wm.position.set(p.x,p.y-2.1,p.z);g.add(wm);
    for(let d=dc-9;d<dc+9;d+=1.6){const q=roadAt(C,d);for(const o of[-4.3,4.3])put('reling',q.x+Math.cos(q.h)*o,q.y,q.z+Math.sin(q.h)*o,1,-q.h+Math.PI)}
    for(let d=dc-8;d<dc+8;d+=2){const q=roadAt(C,d);for(const o of[-4.4,4.4])put('brugwand',q.x+Math.cos(q.h)*o,q.y,q.z+Math.sin(q.h)*o,1,-q.h)}
  }
  /* bomen, huizen, koeien, molens, paaltjes */
  const nearCanal=d=>canalAt(C,d)!=null;
  /* boom met eigen maat, kleur en scheefstand, plus een zachte schaduwvlek eronder */
  const tint=(l,h)=>{const c=new T.Color(1,1,1);c.offsetHSL((r()-.5)*(h||.04),(r()-.5)*.15,(r()-.5)*(l||.18));return c};
  const BLOB={populier:1.4,knotwilg:2,berk:1.8,eik:3.2,fruitboom:1.5};
  /* doorlopende randen per blok van ~50 m: polder en meer houten hekken, Limburg muurtjes en heggen (in de holle weg aan beide kanten bovenop),
     Provence lage stenen muurtjes (niet in de platanenlaan), Alpen een vangrail aan de dalkant en altijd aan de buitenkant van een haarspeldbocht */
  const ehs=(i,k)=>{const x=Math.sin(i*127.1+k*311.7+C.seed*.0137)*43758.5453;return x-Math.floor(x)},ehol=d=>clamp((Math.sin(d/650+C.ph*2)-.55)/.2,0,1);
  const EDGE={hek:d=>{const ty=zoneAt(C,d).ty;if(ty!=='polder'&&ty!=='meer')return null;const b=Math.floor(d/48);return ehs(b,1)<.4?{s:ty==='meer'?1:ehs(b,2)<.5?-1:1,o:7.4}:null},
    muur:d=>{const ty=zoneAt(C,d).ty;if(ty==='heuvels'){if(ehol(d)>.25)return null;const b=Math.floor(d/44);return ehs(b,3)<.3?{s:ehs(b,4)<.5?-1:1,o:6.9}:null}
      if(ty==='provence'){if(Math.sin(d/400+C.ph)>.35)return null;const b=Math.floor(d/52);return ehs(b,5)<.35?{s:ehs(b,6)<.5?-1:1,o:7.6}:null}return null},
    heg:d=>{if(zoneAt(C,d).ty!=='heuvels')return null;if(ehol(d)>.5)return {s:0,o:6.95};if(EDGE.muur(d))return null;const b=Math.floor(d/56);return ehs(b,7)<.25?{s:ehs(b,8)<.5?-1:1,o:6.9}:null},
    rail:d=>{if(zoneAt(C,d).ty!=='bergen')return null;for(let e=-48;e<=48;e+=16){const k2=C.K[kAt(C,d+e)];if(Math.abs(k2)>.02)return {s:-Math.sign(k2),o:5}}
      const b=Math.floor(d/64);return ehs(b,9)<.55?{s:-(Math.sign(Math.sin(d/1300+C.ph))||1),o:5}:null}};
  /* bomen vlak langs de weg werpen echte schaduw op het asfalt (alleen op de laptop); cp = het wegpunt waar we nu bouwen */
  let cp=null;const tree=(k,x,y,z,s,nr)=>{if(nr==null)nr=cp&&Math.hypot(x-cp.x,z-cp.z)<17;if(W.lite&&!k.endsWith('~'))k+='~';put(nr&&!W.lite?k+'*':k,x,y,z,s,r()*6,tint(),s*(.85+r()*.35),(r()-.5)*.08);put('blob',x,y+.05,z,s*(BLOB[k.replace('~','')]||2.2),0)};
  const face=(h,s)=>s>0?Math.atan2(-Math.cos(h),-Math.sin(h)):Math.atan2(Math.cos(h),Math.sin(h));
  yield;let step=0;
  for(let d=Math.max(20,a);d<Math.min(C.L-20,a+CH);d+=7){if(++step%5===0)yield;
    const p=roadAt(C,d),mix=landMix(C,d),zn=zoneAt(C,d),ty=zn.ty,nx=Math.cos(p.h),nzv=Math.sin(p.h),vw=villageW(C,d),vil=vw>.15;cp=p;
    const at=o=>{const [oo,ko]=clipOff(C,d,p,innerOff(o,p.k));if(ko>=0)return [0,0,0,true];return [p.x+nx*oo,landH(C,d,oo,mix,p.y),p.z+nzv*oo,Math.abs(oo-o)>2]};
    const sd=Math.sign(Math.sin(d/1300+C.ph))||1;
    if(!vil&&d%42<7&&!nearCanal(d)&&!EDGE.rail(d))for(const o of[-4.9,4.9]){const [x,y,z,cl]=at(o);if(!cl)put('paal',x,y,z,1,-p.h)}
    /* rotsblokken aan de bergkant (de vangrail aan de dalkant komt bij de doorlopende randen) */
    if(ty==='bergen'&&!vil){
      if(r()<.3){const [x,y,z,cl]=at(sd*(7.5+r()*5));if(!cl)put('rotsblok',x,y,z,.5+r()*.8,r()*6,tint(.12,0),.8+r()*.5)}
      if(ev(C,'e500_1',500,d)){const [x,y,z,cl]=at(5.8);if(!cl)put('kmsteen',x,y,z,1,-p.h)}
    }
    /* publiek langs steile klimmen: in groepjes, twee rijen dik, het drukst vlak voor de top */
    /* publiek langs klimmen: Limburgse klimmen zijn flauwer, dus daar is de drempel lager; in een holle weg alleen onderaan de wal */
    const climbG={heuvels:.025,provence:.035,bergen:.04}[ty];
    if(!vil&&climbG&&(roadAt(C,d+20).y-roadAt(C,d-10).y)/30>climbG){
      const top=(roadAt(C,d+80).y-roadAt(C,d+40).y)/40<climbG*.55,dens=top?.95:ty==='bergen'?(Math.floor(d/35)%4===0?.25:.75):(Math.floor(d/50)%3===0?.6:.1),hol=ty==='heuvels'&&clamp((Math.sin(d/650+C.ph*2)-.55)/.2,0,1)>.3;
      for(const side of[-1,1])for(let row=0;row<(hol?1:top?3:2);row++)for(let i=0;i<3;i++){if(r()>dens)continue;
        const o=side*(5.55+row*1.15+r()*.6),dd=d+i*2.3+r()*1.2,q=roadAt(C,dd),[o2,ko]=clipOff(C,dd,q,innerOff(o,q.k));if(ko>=0)continue;
        const x=q.x+Math.cos(q.h)*o2,z=q.z+Math.sin(q.h)*o2,y=landH(C,dd,o2,mix,q.y),ry=face(q.h,side)+(r()-.5)*.7,col=new T.Color().setHSL(r(),.55+r()*.3,.35+r()*.3),sc=.88+r()*.22;
        const u=r();put(u<.45?'mens':u<.8?'mens2':'mens3',x,y,z,sc,ry,col);if(r()<.15)put('vlag',x,y,z,sc,ry,new T.Color().setHSL(r(),.8,.5))}
    }
    /* Provence: platanenlanen, cipressen, olijfgaarden, lavendel en zonnebloemen */
    if(ty==='provence'&&!vil){
      if(Math.sin(d/400+C.ph)>.45&&d%14<7)for(const side of[-1,1]){const [x,y,z,cl]=at(side*6.3);if(!cl)tree('plataan',x,y,z,.95+r()*.15)}
      if(r()<.25){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*(9+r()*20));if(!cl)tree('cipres',x,y,z,.8+r()*.5)}
      if(ev(C,'e380_1',380,d)&&r()<.8){const side=r()<.5?-1:1,kind=r()<.6?'lavendel':'zonnebloem';
        for(let j=0;j<14;j++)for(let k=0;k<5;k++){const dd=d+k*10.6,q=roadAt(C,dd),o=side*(14+j*1.5),[o2,ko]=clipOff(C,dd,q,innerOff(o,q.k));if(ko>=0||Math.abs(o2-o)>1)continue;
          put(kind,q.x+Math.cos(q.h)*o2,landH(C,dd,o2,mix,q.y),q.z+Math.sin(q.h)*o2,1,-q.h,tint(.08,.02))}}
      if(ev(C,'e520_1',520,d)&&r()<.7){const side=r()<.5?-1:1;for(let i=0;i<4;i++)for(let j=0;j<3;j++){const dd=d+i*8,q=roadAt(C,dd),o=side*(13+j*7),[o2,ko]=clipOff(C,dd,q,innerOff(o,q.k));if(ko>=0)continue;tree('olijf',q.x+Math.cos(q.h)*o2,landH(C,dd,o2,mix,q.y),q.z+Math.sin(q.h)*o2,.9+r()*.3)}}
      if(ev(C,'e700_1',700,d)&&r()<.7){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*(18+r()*8));if(!cl){put('erf',x,y+.05,z,10,0);put(['mas','mas2','mas4'][Math.floor(r()*3)],x,y,z,1,face(p.h,side),tint(.12,.03));put('blob',x,y+.07,z,7,0);tree('cipres',x+nzv*7,y,z-nx*7,1);tree('olijf',x-nzv*8,y,z+nx*8,1)}}
    }
    if(ty==='heuvels'&&!vil){const hw=clamp((Math.sin(d/650+C.ph*2)-.55)/.2,0,1);if(hw>.5)for(const side of[-1,1]){const [x,y,z,cl]=at(side*6.6);if(!cl)put('heg',x,y,z,1,-p.h+Math.PI,tint(.1,.03),1.1)}}
    /* Alpen: houtstapels */
    if(ty==='bergen'&&ev(C,'e140_1',140,d))for(const side of[-1,1]){if(r()<.6){const o=side*(330+r()*200),sc=110+r()*120,x=p.x+nx*o,z=p.z+nzv*o;if(intrudes(C,d,x,z,sc*1.6+50)<0)put('piek'+Math.floor(r()*3),x,p.y-30+r()*20,z,sc,0,null,sc*(1.4+r()*.8))}}
    if(ty==='bergen'&&!vil&&ev(C,'e300_1',300,d)&&r()<.6){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*(8+r()*6));if(!cl)put('hout',x,y,z,1,-p.h)}
    /* bosrand of bomenrij achter de weg: dit sluit het beeld af */
    for(const side of[-1,1]){
      if(ty==='meer'&&side<0)continue;
      const rowOff=ty==='polder'?42+r()*6:ty==='bos'?11+r()*5:30+r()*12,dense=ty==='polder'?.7:1;
      for(let i=0;i<(ty==='polder'?1:ty==='bos'?4:2);i++){if(r()>dense)continue;const o=side*(rowOff+i*9+r()*6),[x,y,z,cl]=at(o);if(cl)continue;
        const u=r(),k=ty==='bergen'?(u<.85?'den':'berk'):ty==='polder'?(u<.5?'populier':u<.8?'boom':'eik'):ty==='provence'?(u<.35?'cipres':u<.6?'olijf':u<.8?'plataan':'eik'):(u<.3?'den':u<.5?'eik':u<.62?'berk':'boom');tree(i?k+'~':k,x,y,z,(ty==='polder'?1:1.05)+r()*.5)}
      if(ty!=='polder'&&r()<.55){const [x,y,z,cl]=at(side*(rowOff-3-r()*4));if(!cl){put('struik~',x,y,z,.9+r()*.8,r()*6,tint());put('blob',x,y+.05,z,1.6,0)}}
    }
    if(vil)continue;
    /* tussen weg en bosrand: weiden, akkers, losse bomen */
    for(const side of[-1,1])for(let tr=0;tr<(ty==='bos'?2:1);tr++){
      if(r()>(ty==='bos'?.85:.5))continue;
      const off=side*(9+r()*26),[x,y,z,cl]=at(off),u=r();if(cl)continue;
      if(ty==='meer'&&off<-18){if(u<.08)put('boot',p.x+nx*side*(40+r()*80),p.y-1.9,p.z+nzv*side*(40+r()*80),1,r()*6);else if(u<.14)put('zwaan',p.x+nx*side*(24+r()*30),p.y-1.85,p.z+nzv*side*(24+r()*30),1,r()*6);else if(off>-30&&u<.6)put('riet',x,y,z,.8+r()*.6,r()*6);continue}
      if(ty==='polder'){if(u<.07)put('koe',x,y,z,1,r()*6,tint(.25,.05));else if(u<.13)put('schaap',x,y,z,1,r()*6);else if(u<.16)put('baal',x,y,z,1,r()*6);else if(u<.22&&!nearCanal(d))tree('boom',x,y,z,.7+r()*.4)}
      else if(ty==='heuvels'){if(u<.2)tree(u<.06?'eik':'boom',x,y,z,.7+r()*.5);else if(u<.25)put('koe',x,y,z,1,r()*6,tint(.25,.05));else if(u<.32)put('schaap',x,y,z,1,r()*6);else if(u<.35)put('baal',x,y,z,1,r()*6)}
      else if(ty==='bergen'){if(u<.3)tree('den',x,y,z,.7+r()*.6);else if(u<.45)put('rots',x,y,z,.5+r()*.8,r()*6,tint(.15,0));else if(u<.5)put('koe',x,y,z,1,r()*6,new T.Color(.8,.6,.45))}
      else if(ty==='bos'){if(u<.5)tree(u<.18?'den':u<.3?'berk':u<.4?'eik':'boom',x,y,z,.8+r()*.5);else if(u<.7)put('varen',x,y,z,.8+r()*.6,r()*6,tint(.15,.04));else if(u<.75)put('paddenstoel',x,y,z,1+r()*.6,r()*6)}
      else if(u<.2)tree('boom',x,y,z,.7+r()*.5);
    }
    /* tulpenvelden in de polder: banen in felle kleuren */
    if(ty==='polder'&&mix.polder>.9&&ev(C,'e420_1',420,d)&&!nearCanal(d)&&r()<.75){const side=r()<.5?-1:1,TC=['#e8312f','#ffd23f','#ff6fae','#ff8c1a','#9b4dd6','#ffffff'],c0=Math.floor(r()*6);
      for(let j=0;j<16;j++){const col=new T.Color(TC[(c0+Math.floor(j/3))%6]);for(let k=0;k<5;k++){const dd=d+k*10.3,q=roadAt(C,dd),o=side*(15.5+j*1.25),[o2,ko]=clipOff(C,dd,q,innerOff(o,q.k));if(ko>=0||Math.abs(o2-o)>1)continue;
        const x=q.x+Math.cos(q.h)*o2,z=q.z+Math.sin(q.h)*o2,y=landH(C,dd,o2,mix,q.y);put('tulpblad',x,y,z,1,-q.h);put('tulpbloem',x,y,z,1,-q.h,col)}}}
    /* knotwilgen langs de sloot in de polder */
    if(ty==='polder'&&!nearCanal(d)&&run(C,'wilg',750,250,d))for(const side of[-1,1]){if(r()<.75){const [x,y,z,cl]=at(side*(12.5+r()));if(!cl)tree('knotwilg',x,y-.3,z,.85+r()*.3)}}
    /* boerderij met erf, schuur, silo en trekker */
    if((ty==='polder'||ty==='heuvels')&&ev(C,'e650_1',650,d)&&r()<.75){const side=r()<.5?-1:1,o=side*(19+r()*6),[x,y,z,cl]=at(o);
      if(!cl){put('erf',x,y+.06,z,13,0);put(ty==='heuvels'?'vakhoeve':'boerderij',x,y,z,1,face(p.h,side),tint(.1,.02));put('blob',x,y+.07,z,10,0);
        const [x2,y2,z2,c2]=at(o+side*14);if(!c2){put('schuur',x2,y2,z2,1,face(p.h,side)+Math.PI/2);put('silo',x2+nzv*8,y2,z2-nx*8,1,0)}
        put('trekker',x-nzv*9,y,z+nx*9,1,r()*6);tree('eik',x+nzv*12,y,z-nx*12,1.1)}}
    /* buurtschap: een paar huizen vlak langs de weg */
    if((ty==='polder'||ty==='heuvels'||ty==='bergen')&&ev(C,'e800_1',800,d)&&r()<.65&&!vil){const side=r()<.5?-1:1,n=2+Math.floor(r()*3),list=ty==='bergen'?['chalet','chalet2','chalet3']:ty==='heuvels'?['vakwerk','mergel','wit','mergel2']:['rood','wit','geel','trapgevel','villa'];
      for(let i=0;i<n;i++){const dd=d+i*(11+r()*6),q=roadAt(C,dd),k=list[Math.floor(r()*list.length)],oo=side*(11+r()*4),[x,y,z,cl]=(()=>{const [o2,ko]=clipOff(C,dd,q,innerOff(oo,q.k));return ko>=0?[0,0,0,true]:[q.x+Math.cos(q.h)*o2,landH(C,dd,o2,landMix(C,dd),q.y),q.z+Math.sin(q.h)*o2,false]})();
        if(cl)continue;put('erf',x,y+.05,z,6,0);put(k,x,y,z,1,face(q.h,side),tint(.22,.08));put('blob',x,y+.07,z,5,0);if(r()<.5)tree(r()<.5?'eik':'berk',x+Math.cos(q.h)*side*-0+Math.sin(q.h)*7,y,z-Math.cos(q.h)*7,.9)}}
    /* boomgaard en kapelletje in de heuvels */
    if(ty==='heuvels'&&ev(C,'e900_1',900,d)&&r()<.7){const side=r()<.5?-1:1;for(let i=0;i<5;i++)for(let j=0;j<4;j++){const dd=d+i*6,oo=side*(13+j*5.5),q=roadAt(C,dd),y=landH(C,dd,oo,mix,q.y);
      tree('fruitboom',q.x+Math.cos(q.h)*oo,y,q.z+Math.sin(q.h)*oo,.8+r()*.3)}}
    if(ty==='heuvels'&&ev(C,'e1300_1',1300,d)){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*7.5);if(!cl){put('kapel',x,y,z,1,face(p.h,side));tree('eik',x+nzv*5,y,z-nx*5,1)}}
    /* steiger met bootjes en een strandje bij het meer */
    if(ty==='meer'&&ev(C,'e700_2',700,d)){const [x,y,z]=at(-19);put('steiger',x,p.y-1.9,z,1,face(p.h,1)+Math.PI);put('boot',x+Math.cos(p.h)*-10+nzv*3,p.y-1.9,z+Math.sin(p.h)*-10-nx*3,1,-p.h)}
    if(ty==='meer'&&ev(C,'e500_2',500,d))for(let i=0;i<3;i++){const [x,y,z]=at(-21-r()*6);put('parasol',x+nzv*(i*5),y,z-nx*(i*5),1,0,new T.Color().setHSL(r(),.6,.6))}
    if(ty==='polder'&&ev(C,'e900_2',900,d)&&r()<.85){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*(28+r()*10));if(!cl){const m=makeMill();m.position.set(x,y,z);m.rotation.y=-p.h;g.add(m);W.mills.push(m.userData.sails);put('blob',x,y+.05,z,5,0)}}
    /* varens, paddenstoelen en boomstammen aan de bosrand; distels en keien in de berm */
    if(!vil)for(const side of[-1,1]){const u=r();if(u>.45)continue;const o=side*(6.2+r()*12),[x,y,z,cl]=at(o);if(cl||(ty==='meer'&&o<-17))continue;
      if(ty==='heuvels'||ty==='bergen'||ty==='bos'){if(u<.2)put('varen',x,y,z,.8+r()*.6,r()*6,tint(.15,.04));else if(u<.28)put('paddenstoel',x,y,z,1+r()*.6,r()*6);else if(u<.31&&Math.abs(landH(C,d,o+2.3,mix,p.y)-landH(C,d,o-2.3,mix,p.y))<.3)put('stam',x,y-.08,z,.8+r()*.4,-p.h+(r()-.5)*.3);else put('keien',x,y,z,.7+r(),r()*6,tint(.15,0))}
      else if(ty==='provence'){if(u<.25)put('keien',x,y,z,.8+r(),r()*6,tint(.1,.02));else put('distel',x,y,z,1+r()*.5,r()*6)}
      else{if(u<.25)put('distel',x,y,z,1+r()*.5,r()*6);else put('paddenstoel',x,y,z,.9,r()*6)}}
    /* rafelige wegrand en bermen: graspollen, bloemen en struiken */
    for(const side of[-1,1]){
      for(let i=0;i<(W.lite?3:8);i++){const o=side*(4.66+r()*(W.lite?1.2:1.9)),[x,y,z,cl]=at(o);if(!cl&&r()<.85)put('pol',x,y,z,.45+r()*.7,r()*6,tint(.2,.06))}
      if(!W.lite)for(let i=0;i<3;i++){const o=side*(6.5+r()*7),[x,y,z,cl]=at(o);if(!cl&&!(ty==='meer'&&o<-17))put('pol',x,y,z,.5+r()*.8,r()*6,tint(.2,.06))}
      if(!W.lite&&ty!=='bergen'&&d%63<7&&r()<.7){const kind=ty==='provence'||r()<.35?'klaproos':r()<.5?'madelief':'bloem',o0=side*(5.4+r()*6);for(let j=0;j<9;j++){const dd=d+(r()-.5)*4,q=roadAt(C,dd),[o2,ko]=clipOff(C,dd,q,innerOff(o0+(r()-.5)*2.4,q.k));if(ko<0&&Math.abs(o2)>4.9)put(kind,q.x+Math.cos(q.h)*o2,landH(C,dd,o2,mix,q.y),q.z+Math.sin(q.h)*o2,.8+r()*.5,r()*6)}}
      for(let i=0;i<2;i++){const u=r();if(u>.8)continue;const o=side*(6+r()*22),[x,y,z,cl]=at(o);if(cl||(ty==='meer'&&o<-17))continue;
        if(u<.35)put('pol',x,y,z,.7+r()*.6,r()*6,tint(.2,.06));else if(u<.6&&mix.bergen<.5)put('bloem',x,y,z,.8+r()*.5,r()*6);else{put('struik',x,y,z,.6+r()*.7,r()*6,tint());put('blob',x,y+.05,z,1.4,0)}}
    }
  }
  cp=null;
  /* dorpen: rijen huizen met dwarsstraten, een plein met kerk, terras en fontein, en mensen op straat */
  const HUIS={polder:['rood','trapgevel','wit','rood','geel','groen','trapgevel','villa'],heuvels:['vakwerk','mergel','vakwerk','wit','mergel','mergel2'],meer:['wit','groen','geel','rood','villa'],bergen:['chalet','chalet2','chalet3','chalet2'],provence:['mas','mas2','mas3','mas4','mas3']};
  const W2={villa:7.5,mas3:5.6,mas4:8.5,chalet3:10,mergel2:7.5,rood:6,wit:5.4,geel:8,rij:15,winkel:8,chalet:8,trapgevel:6.5,groen:6,vakwerk:7,mergel:6.5,chalet2:9,mas:9,mas2:7},D2={villa:8,mas3:7,mas4:8,chalet3:11,mergel2:9,rood:8.5,wit:7.5,geel:9,rij:8.5,winkel:10,chalet:9,trapgevel:9,groen:8,vakwerk:9,mergel:8,chalet2:11.5,mas:8,mas2:7.5};
  const at2=(dd,oo)=>{const q=roadAt(C,dd),mix=landMix(C,dd);return [q.x+Math.cos(q.h)*oo,landH(C,dd,oo,mix,q.y),q.z+Math.sin(q.h)*oo,q]};
  const PEOPLE=['#d9534f','#3a6fb0','#f2c14e','#4c9a5f','#8e5bb5','#ef7d3c','#2b2b2b','#f4f4f4'];
  const walker=(x,y,z,ry)=>{const sc=.9+r()*.2;put('loper',x,y,z,sc,ry,new T.Color(PEOPLE[Math.floor(r()*PEOPLE.length)]))};
  yield;
  for(const v of C.villages){yield;
    const v0=v.d-v.len/2,v1=v.d+v.len/2;if(v1<a||v0>=a+CH)continue;
    const ks=Math.floor(v.d)%2?1:-1,sq0=v.d-18,sq1=v.d+18,streets=[];
    for(let s0=v0+30+(Math.floor(v.d)%11);s0<v1-20;s0+=38+(Math.floor(s0)%13))if(s0<sq0-6||s0>sq1+6)streets.push(s0);
    const inStreet=dd=>streets.some(s0=>dd>s0-4.5&&dd<s0+4.5);
    for(const side of[-1,1])for(let row=0;row<3;row++){
      const core=[1,.85,.55][row],r0=Math.max(v0+v.len*(1-core)/2,a),r1=Math.min(v1-v.len*(1-core)/2,a+CH),base=[7.6,23,39][row];
      let dd=r0+r()*3;
      while(dd<r1){
        if(side===ks&&dd>sq0-3&&dd<sq1+3&&row<2){dd=sq1+3;continue}
        if(inStreet(dd)){dd+=3;continue}
        const list=HUIS[v.ty]||HUIS.polder,k=row===0&&Math.abs(dd-v.d)<45&&r()<.45&&v.ty!=='bergen'?'winkel':list[Math.floor(r()*list.length)],w=W2[k],dp=D2[k];
        if(inStreet(dd+w)){dd+=3;continue}
        const gard=row===0?(k==='winkel'?0:r()*2.5):r()*3,oo=side*(base+gard+dp/2),[x,y,z,q]=at2(dd+w/2,oo);
        put(k,x,y,z,1,face(q.h,side)+(row?(r()-.5)*.1:0),tint(.2,.08));put('blob',x,y+.06,z,Math.max(w,dp)*.7,0);
        if(row===0&&gard>1.3){const [x2,y2,z2,q2]=at2(dd+.3,side*7.5);put(r()<.5?'heg':'tuinhek',x2,y2,z2,1,-q2.h+Math.PI,tint(.1,.02),1,0)}
        if(row>0&&r()<.3){const [x3,y3,z3]=at2(dd+w/2,side*(base-2.5));tree(['berk','boom','fruitboom'][Math.floor(r()*3)],x3,y3,z3,.8)}
        dd+=w+(row===0?.5+r()*2:1.5+r()*4);
      }
    }
    /* dwarsstraten met een paar mensen */
    for(const s0 of streets)if(s0>=a&&s0<a+CH)for(const side of[-1,1]){const [x,y,z,q]=at2(s0,side*7.3);put('straat',x,y+.02,z,1,face(q.h,side)+Math.PI);if(r()<.6){const [x2,y2,z2]=at2(s0+(r()-.5)*3,side*(12+r()*14));walker(x2,y2,z2,r()*6)}}
    /* plein met kerk, fontein, terras, fietsen en bomen */
    if(v.d>=a&&v.d<a+CH){
      const [px,py,pz,q]=at2(v.d,ks*20.4),f=face(q.h,ks);put('plein',px,py+.03,pz,1,f);
      const [kx,ky,kz]=at2(v.d,ks*42);put(v.ty==='bergen'?'alpenkerk':'kerk',kx,ky,kz,1,f);put('blob',kx,ky+.06,kz,11,0);
      const [fx,fy,fz]=at2(v.d,ks*19);put('fontein',fx,fy+.05,fz,1,0);
      for(const dd of[v.d-12,v.d-8,v.d+8,v.d+12]){const [tx,ty,tz]=at2(dd,ks*(11+r()*3));put('terras',tx,ty+.05,tz,1,r()*6,new T.Color().setHSL([0,.08,.55,.33][Math.floor(r()*4)],.65,.55));if(r()<.7)walker(tx+.8,ty,tz,r()*6)}
      for(const dd of[v.d-15,v.d+15])for(const o of[13,28]){const [bx,by,bz]=at2(dd,ks*o);tree(v.ty==='provence'?'plataan':'boom',bx,by,bz,v.ty==='provence'?.75:.85,o<20)}
      for(let i=0;i<6;i++){const [cx,cy,cz,q2]=at2(v.d+10+i*.8,ks*8.4);put('fiets',cx,cy,cz,1,face(q2.h,ks)+Math.PI/2+.25,new T.Color(PEOPLE[i%PEOPLE.length]))}
      for(let i=0;i<7;i++){const [wx,wy,wz]=at2(v.d+(r()-.5)*30,ks*(14+r()*16));walker(wx,wy,wz,r()*6)}
      for(const dd of[v.d-6,v.d+4]){const [bx,by,bz,q3]=at2(dd,ks*30);put('bank',bx,by,bz,1,f)}
    }
    /* mensen op de stoep */
    for(let dd=Math.max(v0,a)+5;dd<Math.min(v1,a+CH);dd+=8+r()*10){const side=r()<.5?-1:1,[x,y,z,q]=at2(dd,side*(6+r()*1.2));walker(x,y,z,-q.h+(r()<.5?0:Math.PI)+(r()-.5)*.3)}
    for(let dd=Math.max(v0,a)+8;dd<Math.min(v1,a+CH);dd+=9+r()*30){const side=r()<.5?-1:1;if(Math.abs(dd-v.d)<22&&side===ks)continue;const q=roadAt(C,dd),oo=side*5.7;
      put('auto',q.x+Math.cos(q.h)*oo,landH(C,dd,oo,landMix(C,dd),q.y)+.05,q.z+Math.sin(q.h)*oo,1,-q.h+(side>0?0:Math.PI),new T.Color(['#d9d9d9','#1d1f22','#8a8f96','#b3262d','#1f4f8c','#f2f2f2','#3c5a3c','#5a5f66'][Math.floor(r()*8)]))}
    for(let dd=Math.max(v0,a);dd<Math.min(v1,a+CH);dd+=26){const side=Math.floor(dd/26)%2?1:-1,q=roadAt(C,dd),mix=landMix(C,dd),oo=side*6.6;put('lamp',q.x+Math.cos(q.h)*oo,landH(C,dd,oo,mix,q.y),q.z+Math.sin(q.h)*oo,1,face(q.h,-side))}
    if(v.d-40>=a&&v.d-40<a+CH){const q=roadAt(C,v.d-40),oo=6.6;put('bushok',q.x+Math.cos(q.h)*oo,landH(C,v.d-40,oo,landMix(C,v.d-40),q.y),q.z+Math.sin(q.h)*oo,1,face(q.h,-1))}
    for(const [dd,txt] of[[v0-12,v.name],[v1+12,v.name]])if(dd>=a&&dd<a+CH){const sg=makePlace(txt,dd>v.d,v.ty==='provence'||v.ty==='bergen'),q=roadAt(C,dd);sg.position.set(q.x+Math.cos(q.h)*5.4,q.y,q.z+Math.sin(q.h)*5.4);sg.rotation.y=-q.h;g.add(sg)}
  }
  /* herkenningspunten */
  for(const mk of C.marks||[])if(mk.d>=a&&mk.d<a+CH&&mk.d<C.L-20&&!villageW(C,mk.d)){
    const q=roadAt(C,mk.d);let off=mk.off;
    if(mk.k!=='ballon'){const io=innerOff(off,q.k),[o2,ko]=clipOff(C,mk.d,q,io);if(ko>=0||Math.abs(o2-io)>.5)continue;off=o2}
    const x=q.x+Math.cos(q.h)*off,z=q.z+Math.sin(q.h)*off,y=mk.k==='ballon'?q.y+mk.h:landH(C,mk.d,off,landMix(C,mk.d),q.y);
    const o=mk.k==='turbine'?makeTurbine():mk.k==='kasteel'?makeCastle():makeBalloon(mk.c);
    o.position.set(x,y-(mk.k==='kasteel'?.6:0),z);o.rotation.y=mk.k==='turbine'?-q.h+(off>0?-1:1)*Math.PI/2:-q.h+(off>0?Math.PI:0);
    if(o.userData.sails)W.mills.push(o.userData.sails);o.traverse(m=>{if(m.isMesh){m.castShadow=mk.k!=='ballon';m.receiveShadow=mk.k!=='ballon'}});g.add(o);
  }
  yield;
  /* klinkers in de dorpsstraat */
  {const pos=[],uv=[],idx=[];let run=false;
    for(let d=a;d<=Math.min(C.L-1,a+CH);d+=4){const vw=villageW(C,d);if(vw<.5){run=false;continue}
      const p=roadAt(C,d),n0=pos.length/3;for(const o of[-3.25,3.25]){pos.push(p.x+Math.cos(p.h)*o,p.y+.012,p.z+Math.sin(p.h)*o);uv.push((o+3.25)/1.6,d/1.6)}
      if(run)idx.push(n0-2,n0-1,n0,n0-1,n0+1,n0);run=true}
    if(idx.length){const vv=C.villages.find(v=>v.d+v.len/2>a&&v.d-v.len/2<a+CH),m=new T.Mesh(geo(pos,idx,null,uv),vv&&(vv.ty==='provence'||vv.ty==='bergen')?M.steen:M.klinker);m.receiveShadow=true;g.add(m)}}
  /* stoepen met tegels, stoepranden en paaltjes in de dorpen */
  {const pos=[],uv=[],idx=[];
    for(const side of[-1,1]){let run=false;
      for(let d=a;d<=Math.min(C.L-1,a+CH);d+=4){const vw=villageW(C,d);if(vw<.6){run=false;continue}
        const p=roadAt(C,d),n0=pos.length/3;for(const o of[3.47,7.2]){const oo=side*o;pos.push(p.x+Math.cos(p.h)*oo,p.y+.13,p.z+Math.sin(p.h)*oo);uv.push(o/1.2,d/1.2)}
        if(run)idx.push(n0-2,n0-1,n0,n0-1,n0+1,n0);run=true}}
    if(idx.length){const m=new T.Mesh(geo(pos,idx,null,uv),M.tegel);m.receiveShadow=true;g.add(m)}
    for(let d=a;d<Math.min(C.L-1,a+CH);d+=2){if(villageW(C,d)<.6)continue;const p=roadAt(C,d);for(const side of[-1,1]){const oo=side*3.35;put('stoeprand',p.x+Math.cos(p.h)*oo,p.y,p.z+Math.sin(p.h)*oo,1,-p.h)}
      if(d%6<2)for(const v of C.villages)if(Math.abs(d-v.d)<45&&Math.abs(d-v.d)>20)for(const side of[-1,1]){const oo=side*3.8;put('paaltje',p.x+Math.cos(p.h)*oo,p.y+.13,p.z+Math.sin(p.h)*oo,1,0)}}}
  /* finish: dranghekken met publiek en spandoeken */
  if(C.finish>a-130&&C.finish-120<a+CH){
    for(let dd=Math.max(a,C.finish-120);dd<Math.min(a+CH,C.finish+30);dd+=2.5)for(const side of[-1,1]){const [x,y,z,q]=at2(dd,side*4.95);put('dranghek',x,y,z,1,-q.h);
      for(let row=0;row<3;row++){if(r()<.25)continue;const [px,py,pz,q2]=at2(dd+r()*2,side*(5.6+row*.9+r()*.3)),ry=face(q2.h,side)+(r()-.5)*.6,col=new T.Color().setHSL(r(),.6,.35+r()*.3),sc=.88+r()*.2;
        const u=r();put(u<.45?'mens':u<.8?'mens2':'mens3',px,py,pz,sc,ry,col);if(r()<.12)put('vlag',px,py,pz,sc,ry,new T.Color().setHSL(r(),.8,.5))}}
    for(let dd=C.finish-118.75;dd<C.finish+30;dd+=2.5)if(dd>=a&&dd<a+CH)for(const side of[-1,1]){const sp=makeBanner(Math.floor(dd/7.5+(side>0?1:0))%2),q=roadAt(C,dd);
      sp.position.set(q.x+Math.cos(q.h)*side*4.92,landH(C,dd,side*4.92,landMix(C,dd),q.y),q.z+Math.sin(q.h)*side*4.92);sp.rotation.y=-q.h+(side>0?-Math.PI/2:Math.PI/2);g.add(sp)}
  }
  /* genummerde haarspeldbochten, aftellend naar de top zoals op de Alpe d'Huez */
  C.hp.forEach((dh,i)=>{const d=dh-22;if(d<a||d>=a+CH)return;const q=roadAt(C,d),sg=makeVirage(C.hp.length-i,900+Math.round(q.y*10)/10|0);sg.position.set(q.x+Math.cos(q.h)*5.3,q.y,q.z+Math.sin(q.h)*5.3);sg.rotation.y=-q.h;g.add(sg)});
  /* bocht-waarschuwingen */
  for(let d=Math.max(80,a);d<Math.min(C.L-80,a+CH);d+=20){const k1=C.K[kAt(C,d+70)],k0=C.K[kAt(C,d)];
    if(Math.abs(k1)>.012&&Math.abs(k0)<.006&&!villageW(C,d)){const sg=makeBend(k1>0),q=roadAt(C,d);sg.position.set(q.x+Math.cos(q.h)*5.4,q.y,q.z+Math.sin(q.h)*5.4);sg.rotation.y=-q.h;g.add(sg);d+=200}}
  /* water in de sloten langs de polderweg */
  {const pos=[],idx=[];for(const side of[-1,1]){let j=-1,run=false;
    for(let d=a;d<=Math.min(C.L-1,a+CH);d+=8){const p=roadAt(C,d),mix=landMix(C,d);const ok=mix.polder>.7&&!nearCanal(d)&&!villageW(C,d);
      if(!ok){run=false;continue}
      const n0=pos.length/3;for(const o of[11.2,13.8]){const oo=innerOff(side*o,p.k);pos.push(p.x+Math.cos(p.h)*oo,p.y-1.05,p.z+Math.sin(p.h)*oo)}
      if(run)idx.push(n0-2,n0-1,n0,n0-1,n0+1,n0);run=true}}
    if(idx.length)g.add(new T.Mesh(geo(pos,idx),M.water));}
  yield;
  /* ---- doorlopende randen: hekken, stenen muurtjes, heggen en vangrails ----
     Ze volgen de bocht en het getekende land, staan met hun voet in de grond en lopen over de grens van een kilometerstuk door.
     Of een rand er is, hangt af van vaste blokken langs de route (niet van toeval per stuk), zodat beide stukken hetzelfde besluiten. */
  {
    const OFFP=OFF.filter(o=>o>0),rowC=new Map(),e1=Math.min(C.L-1,a+CH);
    const rowAt=dr=>{let R=rowC.get(dr);if(!R){const p=roadAt(C,dr);R={p,mix:landMix(C,dr),bnd:{'-1':clipOff(C,dr,p,innerOff(-95,p.k)),'1':clipOff(C,dr,p,innerOff(95,p.k))}};rowC.set(dr,R)}return R};
    /* hoogte van een hoekpunt van het grondvlak, precies zoals het hierboven is opgebouwd */
    const tvY=(dr,o0)=>{const R=rowAt(dr),p=R.p,[b,kb]=R.bnd[Math.sign(o0)],o1=innerOff(o0,p.k),off=Math.abs(o1)>Math.abs(b)?b:o1;let y=landH(C,dr,off,R.mix,p.y);
      if(kb>=0){const t=Math.pow(Math.abs(off/b),2),mid=(p.y+C.Y[kb])/2+nz(dr,off)*2;y=y*(1-t)+mid*t}return y};
    const gy=(d,oN)=>{const s=Math.sign(oN),ao=Math.abs(oN);let i=0;while(i<OFFP.length-2&&OFFP[i+1]<ao)i++;const lo=OFFP[i],hi=OFFP[i+1],t=clamp((ao-lo)/(hi-lo),0,1);
      const d0=Math.min(C.L-1,Math.floor(d/DS)*DS),d1=Math.min(C.L-1,d0+DS),u=d1>d0?clamp((d-d0)/(d1-d0),0,1):0,h=dr=>tvY(dr,s*lo)*(1-t)+tvY(dr,s*hi)*t;return h(d0)*(1-u)+h(d1)*u};
    const B={stone:{pos:[],col:[],uv:[],idx:[]},hedge:{pos:[],col:[],uv:[],idx:[]},wood:{pos:[],col:[],uv:[],idx:[]},rail:{pos:[],col:[],uv:[],idx:[]}},c=new T.Color();
    /* profiel (doorsnede) langs de punten trekken; w = meters van de weg af, h = hoogte; 'b' = vanaf de voet (onder de grond) in plaats van vanaf de bovenlijn */
    const sweep=(G,pts,prof,us,vs)=>{const n=pts.length,m=prof.length;
      for(let k=0;k<m-1;k++){const b0=G.pos.length/3;
        for(let i=0;i<n;i++){const q=pts[i];for(const [w,h,cl,bot] of[prof[k],prof[k+1]]){const sc=q.sc??1,y=(bot?q.yb:q.yt)+h*(bot?1:sc);
            G.pos.push(q.x+q.nx*(w*sc+(q.fl||0)),y+(bot?0:q.dip||0),q.z+q.nz*(w*sc+(q.fl||0)));c.set(cl).multiplyScalar(q.tone??1);G.col.push(c.r,c.g,c.b);G.uv.push(q.L/us,(y-q.yb)/vs)}
          if(i)G.idx.push(b0+i*2-2,b0+i*2-1,b0+i*2,b0+i*2-1,b0+i*2+1,b0+i*2)}}};
    const cap=(G,q,prof)=>{const b0=G.pos.length/3;for(const [w,h,cl,bot] of prof){G.pos.push(q.x+q.nx*w*(q.sc??1),(bot?q.yb:q.yt)+h,q.z+q.nz*w*(q.sc??1));c.set(cl);G.col.push(c.r,c.g,c.b);G.uv.push(0,0)}for(let k=1;k<prof.length-1;k++)G.idx.push(b0,b0+k,b0+k+1)};
    const hsh=(i,k)=>{const x=Math.sin(i*127.1+k*311.7+C.seed*.0137)*43758.5453;return x-Math.floor(x)},hol=d=>clamp((Math.sin(d/650+C.ph*2)-.55)/.2,0,1);
    for(const kind of['hek','muur','heg','rail']){yield;const st=kind==='hek'?2.4:2;
      for(const s of[-1,1]){let run=[];
        const on=d=>{const v=villageW(C,d)>0||canalAt(C,d)!=null?null:EDGE[kind](d);return v&&(v.s===0||v.s===s)?v:null};
        const close=()=>{if(run.length<2){run=[];return}
          const n=run.length,first=run[0],last=run[n-1],c0=!on(first.d-st),c1=!on(last.d+st);let L=0;
          run.forEach((q,i)=>{if(i)L+=Math.hypot(q.x-run[i-1].x,q.z-run[i-1].z);q.L=L});
          /* voet: laagste grond rondom (nooit zwevend); bovenlijn: rustig gemiddelde */
          run.forEach((q,i)=>{let mn=1e9,sm=0,cn=0;for(let j=Math.max(0,i-2);j<=Math.min(n-1,i+2);j++){mn=Math.min(mn,run[j].g);sm+=run[j].g;cn++}q.yb=mn-.35;q.yt=sm/cn});
          if(kind==='rail'){run.forEach(q=>{q.yb=q.ry-1;q.yt=q.ry});const tl=6;
            run.forEach(q=>{const e=Math.min(c0?q.L:1e9,c1?L-q.L:1e9);if(e<tl){const t=e/tl;q.dip=-.82*(1-t)*(1-t);q.fl=.35*(1-t)*(1-t)}});
            sweep(B.rail,run,[[-.02,.43,'#9aa1a8'],[-.07,.5,'#d4d9de'],[-.03,.585,'#b9bfc6'],[-.07,.67,'#e3e7ea'],[-.02,.74,'#c4cad0'],[.02,.74,'#8d949b'],[.02,.43,'#8d949b'],[-.02,.43,'#9aa1a8']],3,1);
            run.forEach((q,i)=>{const e=Math.min(c0?q.L:1e9,c1?L-q.L:1e9);if(e>3)put('railpaal',q.x+q.nx*.08,q.ry,q.z+q.nz*.08,1,-q.h)})}
          else if(kind==='muur'){const ty=zoneAt(C,first.d).ty,cl=ty==='heuvels'?'#d9c99c':'#b8ab94',ct='#'+new T.Color(cl).multiplyScalar(.82).getHexString();
            run.forEach(q=>{q.tone=.92+.12*Math.sin(q.L*.7)});
            const P=[[-.28,0,cl,1],[-.26,.8,cl],[-.31,.8,ct],[-.31,.9,ct],[.31,.9,ct],[.31,.8,ct],[.26,.8,cl],[.28,0,cl,1]];
            sweep(B.stone,run,P,2.4,2.4);if(c0)cap(B.stone,first,P);if(c1)cap(B.stone,last,P)}
          else if(kind==='heg'){run.forEach(q=>{const e=Math.min(c0?q.L:1e9,c1?L-q.L:1e9);q.sc=(1+.09*Math.sin(q.L*1.3+s)+.05*Math.sin(q.L*3.1+1))*(e<1.4?.45+.55*e/1.4:1)});
            const P=[[-.44,0,'#2f6b2a',1],[-.47,.5,'#3a7d30'],[-.37,1,'#4a9038'],[-.13,1.22,'#5aa242'],[.13,1.22,'#5aa242'],[.37,1,'#4a9038'],[.47,.5,'#3a7d30'],[.44,0,'#2f6b2a',1]];
            sweep(B.hedge,run,P,1.6,1.6)}
          else{run.forEach(q=>{q.yb=q.g-.4;q.yt=q.g});
            for(const h of[.55,.98])sweep(B.wood,run,[[-.035,h-.06,'#7a5b3e'],[-.035,h+.06,'#8f6d4b'],[.035,h+.06,'#8f6d4b'],[.035,h-.06,'#6e5238'],[-.035,h-.06,'#7a5b3e']],1,1);
            for(const q of run)put('hekpaal',q.x,q.g,q.z,1,-q.h,tint(.12,.02))}
          run=[]};
        for(let d=Math.ceil(a/st)*st;d<=e1;d+=st){const v=on(d);let pt=null;
          if(v&&!(kind==='rail'&&Math.abs(d-C.finish+45)<85)){const q=roadAt(C,d),oN=s*v.o,io=innerOff(oN,q.k),[o2,ko]=clipOff(C,d,q,io);
            if(ko<0&&Math.abs(o2-io)<.3){const g=gy(d,oN);if(kind==='rail'||Math.abs(gy(d,oN+.6*s)-gy(d,oN-.6*s))<.45)pt={d,x:q.x+Math.cos(q.h)*o2,z:q.z+Math.sin(q.h)*o2,nx:Math.cos(q.h)*s,nz:Math.sin(q.h)*s,g,ry:q.y,h:q.h}}}
          if(pt)run.push(pt);else close()}
        close()}}
    const mk=(G,m)=>{if(!G.idx.length)return;const mesh=new T.Mesh(geo(G.pos,G.idx,G.col,G.uv),m);mesh.receiveShadow=true;mesh.castShadow=!W.lite;g.add(mesh)};
    mk(B.stone,M.edgeStone);mk(B.hedge,M.edgeHedge);mk(B.wood,M.edgeWood);mk(B.rail,M.edgeRail);
  }
  yield;
  let nk=0;for(const key in lists){g.add(instMesh(key,lists[key]));if(++nk%6===0)yield}
  W.root.add(g);W.chunks.set(ci,g);
}
function worldFrame(t){
  if(!W||W.loading)return;
  W.raf=requestAnimationFrame(worldFrame);
  if(!P){return worldClose()}
  if(W.el.hidden)return;
  /* meten hoe vloeiend het loopt: beelden die langer duren dan 25 ms (een beeld gemist) of 50 ms (een merkbare hapering) */
  const fdt=t-(W.lastT||t);W.lastT=t;
  if(P.mode==='run'&&!P.auto&&!document.hidden&&fdt>0&&fdt<2000){const m=W.meet||(W.meet={n:0,s:0,small:0,big:0,list:[]});m.n++;m.s+=fdt;
    if(fdt>25){if(fdt>50)m.big++;else m.small++;if(fdt>50&&m.list.length<40)m.list.push({t:P.rec.p.length,ms:Math.round(fdt),b:!!W.built})}}
  W.built=false;
  /* één fout beeld mag de rit niet stilzetten; blijft het misgaan, dan verder met de cijfers */
  const w=W;try{worldStep(t);w.errs=0}catch(e){console.error(e);w.errs=(w.errs||0)+1;if(w.errs>=10)worldFail(w,e)}
}
function worldStep(t){
  if(W.C.route.id!==routeId())worldBuild();
  const dt=Math.min(.1,(t-W.last)/1000);W.last=t;const C=W.C,T=T3;
  /* haalt de laptop geen ~42 beelden per seconde, dan iets minder scherp tekenen */
  if(!W.lite&&dt>0&&dt<.1){const f=W.perf||(W.perf={n:0,s:0});f.n++;f.s+=dt;if(f.n>=150){const pr=W.ren.getPixelRatio();if(f.s/f.n>1/42&&pr>1){const np=Math.max(1,pr-.25);W.ren.setPixelRatio(np);if(W.comp)W.comp.setPixelRatio(np);W.fit()}f.n=0;f.s=0}}
  const run=P.mode==='run'&&!P.auto,rate=run?(P.sim?P.speed:1):0;
  /* de route ligt vast: je snelheid volgt uit je vermogen, je gewicht en de helling (met wat traagheid, zoals op een echte fiets) */
  {const d0=W.dist||0,sl0=(roadAt(C,d0+8).y-roadAt(C,d0).y)/8*100,vt=run?speedFor(dispPower()||0,sl0):0;
    W.v=(W.v||0)+(vt-(W.v||0))*Math.min(1,dt*(vt<(W.v||0)?.5:.8));W.dist=d0+W.v*dt*(P.sim?P.speed:1)}
  const d=W.dist,p=roadAt(C,d);
  const pos=Math.min(P.pos,P.total-1),tgt=P.free?0:tgtAt(pos),pw=dispPower();
  const dev=pw==null||!tgt?0:clamp(pw/tgt-1,-.3,.3),want=P.mode==='ready'?4:clamp(2-dev*150,-2.5,45);
  W.gap+=(want-W.gap)*Math.min(1,dt*.6);
  const slope=dd=>(roadAt(C,dd+6).y-roadAt(C,dd).y)/6*100;
  const lane=(R,dd,off,cad,spd,stand)=>{const q=roadAt(C,dd);R.g.position.set(q.x+Math.cos(q.h)*off,q.y,q.z+Math.sin(q.h)*off);R.g.rotation.y=-q.h;
    const q2=roadAt(C,dd+3);R.g.rotation.x=Math.atan2(q2.y-q.y,3);R.g.rotation.z=clamp(-q.k*spd*spd*.012,-.25,.25);poseRider(R,dt,cad,spd,stand)};
  const spd=W.v*(P.sim?Math.min(P.speed,3):1);
  /* zonder ERG, of vrij rijden na de training, voelt de trainer de helling van de route */
  if(ble.cp&&!P.sim&&run&&(P.free||!P.erg)){const g=clamp(Math.round(slope(d)*2)/2,-10,20);if(g!==W.gs&&now()-(W.gt||0)>1000){setGrade(g);W.gs=g;W.gt=now()}}
  const cad=now()-live.tP<3000&&live.cad?live.cad:0,seg=P.wo.segs[segAt(pos)];
  /* uit het zadel bij steile stukken en harde inspanningen */
  const hard=!P.free&&seg&&(seg.a+seg.b)/2>1.25,stand=run&&(slope(d)>7.5||hard);
  lane(W.me,d,.85,run?cad:0,spd,stand);
  W.pace.g.visible=!P.free;lane(W.pace,d+W.gap,-.85,run?(seg&&seg.cad||90):0,spd,stand);
  /* andere fietsers: iets sneller of langzamer dan jij, zodat je ze inhaalt of zij jou */
  W.vs+=(spd-W.vs)*Math.min(1,dt*.8);
  for(const n of W.npcs){
    if(n.d==null||Math.abs(n.d-d)>230){n.f=.82+Math.random()*.36;n.d=n.f<1?d+150+Math.random()*70:d-60-Math.random()*40;n.off=Math.random()<.5?-2.25:2.25}
    n.d+=W.vs*n.f*dt*(run?1:0);
    lane(n.R,n.d,n.off,run?n.cad:0,W.vs*n.f,run&&slope(n.d)>8&&n.f>1);
  }
  /* camera achter de fietser */
  const CB=4.6,ahead=roadAt(C,d+20),back=d>=CB?roadAt(C,d-CB):(q=>({x:q.x-Math.sin(q.h)*(CB-d),y:q.y,z:q.z+Math.cos(q.h)*(CB-d),h:q.h}))(roadAt(C,0));
  const cp=new T.Vector3(back.x+Math.cos(back.h)*1.35,Math.max(back.y,p.y)+1.95+(run?Math.sin(t/260)*.025:0),back.z+Math.sin(back.h)*.6);
  if(!W.camP)W.camP=cp.clone();else{W.camP.x=cp.x;W.camP.z=cp.z;W.camP.y=clamp(W.camP.y+(cp.y-W.camP.y)*Math.min(1,dt*3),cp.y-.4,cp.y+.4)}
  W.cam.position.copy(W.camP);W.cam.lookAt(ahead.x+Math.cos(ahead.h)*.5,ahead.y+1.1,ahead.z+Math.sin(ahead.h)*.5);
  /* zon, lucht en verre bergen reizen mee */
  const md=W.mood.dir,sp=W.lite?p:roadAt(C,d+16);W.sun.position.set(sp.x+md[0],sp.y+md[1],sp.z+md[2]);W.wind.value=t/1000;
  {const L=Math.hypot(...md)/1100;W.sunDisc.position.set(W.cam.position.x+md[0]/L,W.cam.position.y+md[1]/L,W.cam.position.z+md[2]/L)}
  if(W.rain){W.rain.position.copy(W.cam.position);W.rain.position.y-=8;const a=W.rain.geometry.attributes.position,ar=a.array;for(let i=0;i<ar.length;i+=6){ar[i+1]-=24*dt;ar[i+4]-=24*dt;if(ar[i+1]<0){ar[i+1]+=25;ar[i+4]+=25}}a.needsUpdate=true}W.sun.target.position.set(sp.x,sp.y,sp.z);
  W.sky.position.copy(W.cam.position);W.ring.position.set(W.cam.position.x,p.y,W.cam.position.z);W.clouds.position.copy(W.cam.position);const mixNow=landMix(C,d);decorMix(mixNow);
  for(const s of W.mills)s.rotation.z+=dt*.6;
  const ci=Math.floor(d/CH);
  /* telefoon: minder kilometers vooruit klaarzetten, dat scheelt geheugen */
  const fwd=W.lite?3:5;
  /* de kilometer waar je nu rijdt moet er meteen zijn; de volgende bouwen we op de achtergrond, hooguit 4 ms per beeld */
  if(!W.chunks.has(ci))buildChunk(ci);else for(let c=ci+1;c<=ci+fwd;c++)if(!W.chunks.has(c)){chunkStep(c,4);break}
  for(const c of W.chunks.keys())if(c<ci-2||c>ci+fwd+2)dropChunk(c);
  /* verre bergtoppen alleen in de Alpen; ze komen geleidelijk op als je de Alpen in rijdt */
  const alps=(mixNow.bergen||0)>.35;W.mat.piek.opacity=clamp(((mixNow.bergen||0)-.35)*5,0,1);
  for(const [c,gr] of W.chunks){const near=c>=ci-1&&c<=ci+1,vis=near+'/'+alps;if(gr.userData.vis!==vis){gr.userData.vis=vis;for(const ch of gr.children)ch.visible=ch.userData.far?alps:near}}
  W.lastD=d;worldHud(d);
  if(W.comp)W.comp.render(dt);else W.ren.render(W.scene,W.cam);
}
function worldHud(d){
  const g=P.game,el=id=>document.getElementById(id);if(!g)return;
  const set=(id,v)=>{const e=el(id);if(e&&e.textContent!==String(v))e.textContent=v};
  set('p-km',nl((d/1000).toFixed(1)));
  if(W&&W.C){const C=W.C;set('p-spd',Math.round((W.v||0)*3.6));set('p-hm',Math.round(Math.floor(d/C.L)*C.UPlap+C.UP[kAt(C,d)]));
    const ctl=el('p-ctl');if(ctl)ctl.classList.toggle('hide',P.mode==='run'&&now()-(W.uiT||0)>4000)}
  if(W&&W.C&&!P.free){
    /* aftellen in de laatste 3 seconden van een blok */
    const pos=Math.min(P.pos,P.total-1),i=segAt(pos),sg=P.wo.segs[i],rem=P.starts[i]+sg.d-P.pos,cd=el('p-cd');
    if(cd){const on=P.mode==='run'&&sg.d>=20&&P.wo.segs[i+1]&&rem>0&&rem<=3;cd.hidden=!on;if(on&&cd.textContent!==String(rem)){cd.textContent=rem;cd.style.animation='none';void cd.offsetWidth;cd.style.animation=''}}
    if(now()-(W.profT||0)>300){W.profT=now();drawProfile(d)}
  }
  if(!g.on)return;
  set('p-pts',g.pts.toLocaleString('nl-NL'));set('p-mult',g.streak>=5?`${gameMult()>1?`×${gameMult()} · `:''}reeks ${clock(g.streak)}`:'');
  set('p-stars','★ '+g.stars.reduce((a,b)=>a+b,0));
  const pop=el('p-pop');if(pop){const on=g.pop&&now()-g.pop.t<3500;pop.hidden=!on;if(on)set('p-pop','★'.repeat(g.pop.st)+'☆'.repeat(3-g.pop.st))}
}
/* hoogteprofiel van de komende anderhalve kilometer, in de kleur van de blokken */
/* kleur bij een stijgingspercentage, zoals op een hoogteprofiel van een klim */
const gradeZone=g=>g<1?1:g<3?3:g<5?4:g<7?5:g<9?6:7;
function drawProfile(d){
  const cv=document.getElementById('p-prof');if(!cv)return;const C=W.C,c=cv.getContext('2d'),w=cv.width,h=cv.height,a=d-120,b=d+1400,N=90;
  if(!W.zc){const cs=getComputedStyle(document.documentElement);W.zc=[0,1,2,3,4,5,6,7].map(z=>cs.getPropertyValue('--z'+z).trim()||'#888')}
  let lo=1e9,hi=-1e9;const ys=[];for(let i=0;i<=N;i++){const y=roadAt(C,a+(b-a)*i/N).y;ys.push(y);lo=Math.min(lo,y);hi=Math.max(hi,y)}
  hi=Math.max(hi,lo+25);const Y=y=>h-6-(y-lo)/(hi-lo)*(h-22);
  c.clearRect(0,0,w,h);
  for(let i=0;i<N;i++){c.fillStyle=W.zc[gradeZone((ys[i+1]-ys[i])/((b-a)/N)*100)];c.globalAlpha=.85;
    c.beginPath();c.moveTo(i/N*w,h);c.lineTo(i/N*w,Y(ys[i]));c.lineTo((i+1)/N*w+.6,Y(ys[i+1]));c.lineTo((i+1)/N*w+.6,h);c.fill()}
  c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();ys.forEach((y,i)=>i?c.lineTo(i/N*w,Y(y)):c.moveTo(0,Y(y)));c.stroke();
  const x=(d-a)/(b-a)*w,yy=Y(roadAt(C,d).y);c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--acc').trim()||'#1D4ED8';c.strokeStyle='#fff';c.lineWidth=2.5;c.beginPath();c.arc(x,yy,6,0,7);c.fill();c.stroke();
  /* tekst: de klim die eraan komt of waar je in zit */
  const G=dd=>(roadAt(C,dd+20).y-roadAt(C,dd).y)/20*100,len=m=>m>=1000?nl((m/1000).toFixed(1))+' km':Math.round(m/10)*10+' m';
  let s0=-1,s1=-1;for(let dd=d;dd<d+3000;dd+=20){const g2=G(dd);if(s0<0?g2>2.5:g2>1.5){if(s0<0)s0=dd;s1=dd+20}else if(s0>=0&&dd-s1>60)break}
  const lab=document.getElementById('p-proft');if(lab){let t='Vlak';
    /* tijdens een afdaling eerst de afdaling, tenzij de klim er vlak achter begint */
    if(s0>=0&&s0-d<1400&&!(G(d)<-1.5&&s0-d>250)){const inC=s0<=d+10,a0=inC?d:s0,pct=(roadAt(C,s1).y-roadAt(C,a0).y)/(s1-a0)*100;
      t=inC?`Klim: nog ${len(s1-d)} · ${nl(pct.toFixed(1))}%`:`Klim over ${Math.round((s0-d)/10)*10} m · ${len(s1-s0)} · ${nl(pct.toFixed(1))}%`}
    else{let e1=-1;for(let dd=d;dd<d+3000;dd+=20){if(G(dd)<-1.5)e1=dd+20;else if(dd-Math.max(e1,d)>60)break}
      const drop=e1>d+40?roadAt(C,d).y-roadAt(C,e1).y:0;if(drop>3)t=`Afdaling: nog ${len(e1-d)} · ${nl((drop/(e1-d)*100).toFixed(1))}%`}
    if(lab.textContent!==t)lab.textContent=t}
}
addEventListener('pointermove',()=>{if(W)W.uiT=now()});addEventListener('pointerdown',()=>{if(W)W.uiT=now()});
/* wordt na elke renderPlayer aangeroepen */
function worldSync(){
  if(!P)return worldClose();
  if(view3d()){if(!W)worldOpen();else if(!W.loading){W.el.hidden=false;worldHud(W.lastD||0)}}
  else if(W&&W.el)W.el.hidden=true;
}
