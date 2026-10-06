'use strict';
/* ================= 3D-rit en punten ================= */
/* De weg volgt de training: zware blokken gaan bergop, rustige blokken vlak of bergaf.
   three.js wordt pas geladen als je de 3D-weergave opent. */
const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const VIEW_KEY='kopwerk.view';
let W=null,T3=null;
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
  g.stars.push(st);g.pop={st,t:now()};
}
const gameResult=g=>g&&g.on&&g.stars.length?{pts:g.pts,stars:g.stars.reduce((a,b)=>a+b,0),max:g.stars.length*3,streak:g.best}:null;

/* ---------- route ---------- */
/* snelheid in m/s bij een vermogen en helling (rijder + fiets, gewone rijhouding) */
function speedFor(w,g){
  const m=(state.profile.weight||75)+9,a=.5*1.2*.32,th=Math.atan(g/100),F=m*9.81*(Math.sin(th)+.004*Math.cos(th));
  const f=v=>a*v*v*v+F*v-Math.max(0,w)*.97;
  let lo=F<0?Math.sqrt(-F/(3*a)):0,hi=30;if(f(lo)>0)return Math.max(1,lo);
  for(let k=0;k<40;k++){const mid=(lo+hi)/2;if(f(mid)>0)hi=mid;else lo=mid}
  return clamp(lo,1,25);
}
const gradeFor=s=>{const f=(s.a+s.b)/2;if(f<.8)return 0;return clamp((f-.7)*22,2,9)+(s.cad&&s.cad<70?2:0)};
const STEP=4;
function rng(seed){let x=seed|0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}}
function buildCourse(){
  const ftp=P.ftp,segs=P.wo.segs,n=Math.ceil(P.total)+1;
  const S=new Float32Array(n+1),H=new Float32Array(n+1);let s=0,h=0;
  for(let t=0;t<=n;t++){
    S[t]=s;H[t]=h;
    const i=Math.min(segs.length-1,segAt(Math.min(t,P.total-1))),sg=segs[i];
    let g=gradeFor(sg);if(!g&&h>6)g=-3.5;
    const v=speedFor(fracAt(i,Math.min(t,P.total-1))*ftp,g);
    s+=v;h=Math.max(0,h+v*g/100);
  }
  const L=s+25000,N=Math.ceil(L/STEP)+2,Y=new Float32Array(N);
  for(let k=0,t=0;k<N;k++){
    const d=k*STEP;while(t<n&&S[t+1]<d)t++;
    if(d>=S[n])Y[k]=Math.max(0,H[n]-(d-S[n])*.03);
    else{const f=S[t+1]>S[t]?clamp((d-S[t])/(S[t+1]-S[t]),0,1):0;Y[k]=H[t]+(H[t+1]-H[t])*f}
  }
  /* hoogte afvlakken zodat de overgang naar een klim niet hoekig is */
  const Ys=new Float32Array(N),R=8;let acc=0;
  for(let k=0;k<N;k++){acc+=Y[k];if(k>=2*R+1)acc-=Y[k-2*R-1];const lo=Math.max(0,k-2*R);Ys[Math.max(0,k-R)]=acc/(k-lo+1)}
  for(let k=N-R;k<N;k++)Ys[k]=Y[k];
  const yAt=d=>Ys[clamp(Math.round(d/STEP),0,N-1)];
  /* landschappen van 4 tot 5 km; stukken met veel klimmen worden heuvels of bergen, de rest wisselt per rit */
  const seed=[...(P.wo.name+P.startTs)].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7),r=rng(seed);
  const zones=[];let zd=0,bag=[],last='';
  while(zd<L){
    const len=4000+r()*1000;let up=0,steep=0;
    for(let d=zd;d<zd+len&&d<L-40;d+=40){const g=(yAt(d+40)-yAt(d))/40*100;if(g>2.5){up+=40;if(g>5)steep+=40}}
    let ty;
    if(up/len>.2)ty=steep>up*.4?'bergen':'heuvels';
    else{if(!bag.length)bag=['polder','meer','heuvels','bergen'].sort(()=>r()-.5);ty=bag.pop();if(ty===last&&bag.length){bag.unshift(ty);ty=bag.pop()}}
    zones.push({ty,a:zd,b:zd+len});zd+=len;last=ty;
  }
  const C={S,H,n,L,N,Y:Ys,zones,seed,ph:r()*6};
  /* bochten: polder lang rechtdoor met af en toe een scherpe bocht, heuvels en bergen slingerend */
  const X=new Float32Array(N),Z=new Float32Array(N),HD=new Float32Array(N),K=new Float32Array(N);
  let hd=0,x=0,z=0,turn=0,amt=0,next=500;const ph=C.ph;
  for(let k=0;k<N;k++){
    const d=k*STEP,ty=zoneAt(C,d).ty;let kap;
    if(ty==='polder'){
      kap=Math.sin(d/800+ph)/3000;
      if(d>=next){amt=(.7+r()*.7)*(hd>.2?-1:hd<-.2?1:(r()<.5?-1:1));turn=44;next=d+600+r()*900}
      if(turn>0){kap+=amt/44;turn-=STEP}
    }else{const Rr=ty==='bergen'?120:ty==='heuvels'?190:300;kap=(.6*Math.sin(d/(Rr*1.8)+ph)+.4*Math.sin(d/(Rr*.8)+ph*2.3))/Rr}
    kap-=hd*(ty==='bergen'?.002:.0012);
    X[k]=x;Z[k]=z;HD[k]=hd;K[k]=kap;
    x+=Math.sin(hd)*STEP;z-=Math.cos(hd)*STEP;hd+=kap*STEP;
  }
  Object.assign(C,{X,Z,HD,K});
  /* kanalen met een bruggetje in de polder */
  C.canals=[];for(const zn of zones)if(zn.ty==='polder')for(let d=zn.a+600+r()*400;d<zn.b-300;d+=1100+r()*700)if(Math.abs(K[Math.round(d/STEP)])<.004)C.canals.push(d);
  return C;
}
function roadAt(C,d){
  const f=clamp(d/STEP,0,C.N-1.001),k=Math.floor(f),u=f-k,lerp=(A)=>A[k]+(A[k+1]-A[k])*u;
  return {x:lerp(C.X),y:lerp(C.Y),z:lerp(C.Z),h:lerp(C.HD),k:C.K[k]};
}
const distAt=(C,t)=>{const f=clamp(t,0,C.n-.001),k=Math.floor(f);return C.S[k]+(C.S[k+1]-C.S[k])*(f-k)};
function zoneAt(C,d){let lo=0,hi=C.zones.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(C.zones[m].a<=d)lo=m;else hi=m-1}return C.zones[lo]}
const canalAt=(C,d)=>{for(const c of C.canals)if(Math.abs(c-d)<12)return d-c;return null};
/* gewicht per landschap rond een grens, zodat het ene landschap geleidelijk overgaat in het volgende */
function landMix(C,d){
  const z=zoneAt(C,d),i=C.zones.indexOf(z),m={polder:0,heuvels:0,bergen:0,meer:0},B=350;
  const toNext=z.b-d,fromPrev=d-z.a;
  if(toNext<B&&C.zones[i+1]){const w=.5-toNext/B/2;m[z.ty]+=1-w;m[C.zones[i+1].ty]+=w}
  else if(fromPrev<B&&i>0){const w=.5-fromPrev/B/2;m[z.ty]+=1-w;m[C.zones[i-1].ty]+=w}
  else m[z.ty]=1;
  return m;
}
const nz=(a,b)=>Math.sin(a*.013+b*.021)*.5+Math.sin(a*.031-b*.017+1.7)*.3+Math.sin(a*.071+b*.053+.3)*.2;
/* Hoogte van het land naast de weg (off = meters naar rechts). Het land klimt met de weg mee;
   in heuvels en bergen ligt de weg tegen een helling: aan de ene kant omhoog, aan de andere kant het dal in. */
function landH(C,d,off,mix,ry){
  const ao=Math.abs(off),near=clamp((ao-4.4)/26,0,1),n=nz(d,off),sd=clamp(Math.sin(d/1300+C.ph)*3,-1,1);
  const side=Math.tanh(off/140)*140*sd;
  let h=0;
  if(mix.polder){const c=canalAt(C,d);h+=mix.polder*(-.6*near+(ao>11&&ao<14?-1.2:0)+(c!=null&&ao>4.2?-2.6*clamp((7-Math.abs(c))/2,0,1):0))}
  h+=mix.heuvels*(near*(side*.2+5+8*n)+near*near*Math.max(0,ao-60)*.06);
  h+=mix.bergen*(near*(side*.45+4+6*n)+Math.pow(clamp((ao-70)/260,0,1),1.5)*190*(.65+.35*n));
  h+=mix.meer*(off<0?(ao>20?-2.6-near*2.5:-.4*near):near*(3+4*n));
  return ry+h-(ao<4.4?.08:.2);
}

/* ---------- bouwstenen ---------- */
function partsGeo(parts){
  const T=T3;let pos=[],nor=[],col=[];
  for(const [g0,c,m] of parts){
    const g=(g0.index?g0.toNonIndexed():g0);if(m)g.applyMatrix4(m);g.computeVertexNormals();
    const p=g.attributes.position.array,nn=g.attributes.normal.array,cc=new T.Color(c);
    for(let i=0;i<p.length;i+=3){pos.push(p[i],p[i+1],p[i+2]);nor.push(nn[i],nn[i+1],nn[i+2]);col.push(cc.r,cc.g,cc.b)}
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));
  return g;
}
const M4=(x,y,z,sx,sy,sz,ry)=>{const T=T3,m=new T.Matrix4();m.compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,ry||0,0)),new T.Vector3(sx??1,sy??sx??1,sz??sx??1));return m};
function propGeos(){
  const T=T3,G={};
  G.boom=partsGeo([[new T.CylinderGeometry(.18,.25,2,5),'#6b4a2f',M4(0,1,0)],[new T.IcosahedronGeometry(1.7,0),'#4f8f3a',M4(0,3.2,0)],[new T.IcosahedronGeometry(1.1,0),'#5fa046',M4(.6,4.2,.3)]]);
  G.den=partsGeo([[new T.CylinderGeometry(.15,.2,1.4,5),'#5a3d26',M4(0,.7,0)],[new T.ConeGeometry(1.6,3,6),'#2f6b3f',M4(0,2.6,0)],[new T.ConeGeometry(1.2,2.4,6),'#357a46',M4(0,4,0)],[new T.ConeGeometry(.8,1.8,6),'#3c8650',M4(0,5.2,0)]]);
  G.populier=partsGeo([[new T.CylinderGeometry(.12,.16,1.2,5),'#6b4a2f',M4(0,.6,0)],[new T.IcosahedronGeometry(1,0),'#5d9a3e',M4(0,4.2,0,.9,3.4,.9)]]);
  G.huis=partsGeo([[new T.BoxGeometry(5,3,7),'#efe6d8',M4(0,1.5,0)],[new T.CylinderGeometry(2.9,2.9,7.2,3,1),'#a8463a',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2);m.premultiply(new T.Matrix4().makeRotationZ(Math.PI/2));m.setPosition(0,3.9,0);m.scale(new T.Vector3(1,.6,1));return m})()],[new T.BoxGeometry(.9,1.1,.1),'#3b4a5a',M4(1,1.6,3.52)]]);
  G.schuur=partsGeo([[new T.BoxGeometry(7,4,10),'#7c3b32',M4(0,2,0)],[new T.CylinderGeometry(4,4,10.2,3,1),'#3e3e44',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2);m.premultiply(new T.Matrix4().makeRotationZ(Math.PI/2));m.setPosition(0,5,0);m.scale(new T.Vector3(1,.5,1));return m})()]]);
  G.koe=partsGeo([[new T.BoxGeometry(.9,.9,1.9),'#f4f1ea',M4(0,1.05,0)],[new T.BoxGeometry(.5,.35,.6),'#2b2b2b',M4(.18,1.25,.2)],[new T.BoxGeometry(.5,.55,.55),'#2b2b2b',M4(0,1.35,1.15)],
    ...[[-.3,-.7],[.3,-.7],[-.3,.7],[.3,.7]].map(([x,z])=>[new T.BoxGeometry(.18,.6,.18),'#2b2b2b',M4(x,.3,z)])]);
  G.rots=partsGeo([[new T.DodecahedronGeometry(1.4,0),'#8a8580',M4(0,.6,0,1,.7,1.2)]]);
  G.riet=partsGeo([0,1,2,3,4].map(i=>[new T.ConeGeometry(.12,1.8+i%3*.4,4),i%2?'#a9b25a':'#8e9a48',M4(Math.cos(i*1.3)*.5,.9,Math.sin(i*1.3)*.5)]));
  G.boot=partsGeo([[new T.BoxGeometry(1.6,.6,4.4),'#f2f2f2',M4(0,.3,0)],[new T.CylinderGeometry(.05,.05,5,4),'#555',M4(0,3,0)],[new T.ConeGeometry(1.7,4.4,3),'#ffffff',M4(0,3,-.6,.08,1,1)]]);
  G.top=partsGeo([[new T.ConeGeometry(1,1,7),'#7d8290',M4(0,.5,0)],[new T.ConeGeometry(.36,.36,7),'#f4f6fa',M4(0,.82,0)]]);
  G.wolk=partsGeo([[new T.IcosahedronGeometry(6,0),'#ffffff',M4(0,0,0)],[new T.IcosahedronGeometry(4.5,0),'#ffffff',M4(6,-1,1)],[new T.IcosahedronGeometry(4,0),'#ffffff',M4(-6,-1,-1)]]);
  G.paal=partsGeo([[new T.BoxGeometry(.12,1,.12),'#f4f4f0',M4(0,.5,0)],[new T.BoxGeometry(.125,.2,.125),'#222',M4(0,.78,0)],[new T.BoxGeometry(.13,.08,.04),'#ff8a1f',M4(0,.88,-.05)]]);
  G.reling=partsGeo([[new T.BoxGeometry(.1,1.1,.1),'#e8e8e8',M4(0,.55,0)],[new T.BoxGeometry(.08,.08,1.6),'#e8e8e8',M4(0,1.05,.8)],[new T.BoxGeometry(.06,.06,1.6),'#e8e8e8',M4(0,.6,.8)]]);
  G.brugwand=partsGeo([[new T.BoxGeometry(.5,2.6,2.1),'#9b5a43',M4(0,-1.3,0)]]);
  G.kerk=partsGeo([[new T.BoxGeometry(7,7,13),'#c9b9a3',M4(0,3.5,0)],[new T.CylinderGeometry(4.6,4.6,13.2,3,1),'#4a4d55',(()=>{const m=new T.Matrix4().makeRotationX(Math.PI/2);m.premultiply(new T.Matrix4().makeRotationZ(Math.PI/2));m.setPosition(0,8.6,0);m.scale(new T.Vector3(1,.55,1));return m})()],
    [new T.BoxGeometry(4,15,4),'#c9b9a3',M4(0,7.5,-7.5)],[new T.ConeGeometry(3,9,4),'#4a4d55',M4(0,19.5,-7.5,1,1,1,Math.PI/4)]]);
  G.hek=partsGeo([[new T.BoxGeometry(.1,1.1,.1),'#7a5b3e',M4(0,.55,0)],[new T.BoxGeometry(.06,.1,3),'#8a6a4a',M4(0,.9,1.5)],[new T.BoxGeometry(.06,.1,3),'#8a6a4a',M4(0,.5,1.5)]]);
  G.baal=partsGeo([[new T.CylinderGeometry(.75,.75,1.3,10),'#d9c27a',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(0,.75,0);return m})()]]);
  return G;
}
function makeMill(){
  const T=T3,g=new T.Group(),mat=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
  g.add(new T.Mesh(partsGeo([[new T.CylinderGeometry(1.6,3,11,8),'#5b4636',M4(0,5.5,0)],[new T.ConeGeometry(2.1,2.6,8),'#3f3f45',M4(0,12.2,0)],[new T.CylinderGeometry(3.4,3.4,.4,10),'#7a6a58',M4(0,5,0)]]),mat));
  const sails=new T.Group();sails.position.set(0,11.2,2.2);
  for(let i=0;i<4;i++){const s=new T.Mesh(partsGeo([[new T.BoxGeometry(.25,7,.12),'#4b3a2c',M4(0,3.6,0)],[new T.BoxGeometry(1.3,5.4,.08),'#efe9dc',M4(.75,4.2,0)]]),mat);s.rotation.z=i*Math.PI/2;sails.add(s)}
  g.add(sails);g.userData.sails=sails;return g;
}
function canvasTex(w,h,draw){const T=T3,cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
function makeArch(color,text,finish){
  const T=T3,g=new T.Group(),m=new T.MeshLambertMaterial({color:finish?'#20242c':color,flatShading:true});
  for(const x of[-4.5,4.5]){const p=new T.Mesh(new T.BoxGeometry(.3,4.6,.3),m);p.position.set(x,2.3,0);p.castShadow=true;g.add(p)}
  const tex=canvasTex(512,56,(c,w,h)=>{
    if(finish){for(let i=0;i<32;i++)for(let j=0;j<4;j++){c.fillStyle=(i+j)%2?'#fff':'#111';c.fillRect(i*16,j*14,16,14)}c.fillStyle='rgba(0,0,0,.55)';c.fillRect(150,0,212,h)}
    else{c.fillStyle=color;c.fillRect(0,0,w,h)}
    c.fillStyle='#fff';c.font='bold 34px Figtree, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2+2)});
  const tm=new T.MeshBasicMaterial({map:tex}),b=new T.Mesh(new T.BoxGeometry(9.3,1,.25),[m,m,m,m,tm,tm]);
  b.position.y=4.5;b.castShadow=true;g.add(b);return g;
}
/* bord met het hellingspercentage aan het begin van een klim */
function makeSign(pct){
  const T=T3,g=new T.Group();
  const post=new T.Mesh(new T.CylinderGeometry(.05,.05,2.2,6),new T.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.1;g.add(post);
  const tex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#fff';c.beginPath();c.moveTo(64,6);c.lineTo(122,116);c.lineTo(6,116);c.closePath();c.fill();
    c.lineWidth=12;c.strokeStyle='#d62828';c.lineJoin='round';c.stroke();c.fillStyle='#111';c.font='bold 34px Figtree, system-ui, sans-serif';c.textAlign='center';c.fillText(pct+'%',64,96)});
  const b=new T.Mesh(new T.PlaneGeometry(1.1,1.1),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));b.position.y=2.5;g.add(b);
  return g;
}
/* fietser met benen die met de cadans meedraaien; vooruit = -z */
function makeRider(jersey,ghost){
  const T=T3,o={transparent:!!ghost,opacity:ghost?.62:1,flatShading:true};
  const mt=c=>new T.MeshLambertMaterial(Object.assign({color:c},o));
  const J=mt(jersey),K=mt('#1d222b'),S=mt('#e7b28f'),F=mt('#2a2f38'),Wh=mt('#15181d');
  const g=new T.Group(),add=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  const wheel=z=>{const w=new T.Group();w.position.set(0,.34,z);
    const t=new T.Mesh(new T.TorusGeometry(.33,.03,5,18),Wh);t.rotation.y=Math.PI/2;w.add(t);
    for(let i=0;i<2;i++){const sp=new T.Mesh(new T.BoxGeometry(.01,.64,.012),F);sp.rotation.x=i*Math.PI/2;w.add(sp)}
    g.add(w);return w};
  const wr=wheel(.5),wf=wheel(-.52);
  const limb=(mat,r)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r*.85,1,6),mat);g.add(m);return m};
  const tube=[[0,.34,.5,0,.3,.02],[0,.3,.02,0,.95,.14],[0,.95,.14,0,.98,-.42],[0,.3,.02,0,.98,-.42],[0,.34,.5,0,.95,.14],[0,.98,-.42,0,.34,-.52]];
  for(const t of tube)setLimb(limb(F,.022),t.slice(0,3),t.slice(3));
  add(new T.BoxGeometry(.12,.04,.26),K,0,.99,.16);add(new T.BoxGeometry(.46,.03,.05),K,0,1.0,-.45);
  const torso=limb(J,.16);setLimb(torso,[0,1.0,.15],[0,1.36,-.26]);torso.scale.x=1.1;
  add(new T.SphereGeometry(.11,8,6),S,0,1.46,-.38);
  const helm=add(new T.SphereGeometry(.13,8,5,0,Math.PI*2,0,Math.PI/2),mt(ghost?jersey:'#f4f4f4'),0,1.5,-.38);helm.scale.z=1.25;
  for(const x of[-.17,.17]){setLimb(limb(J,.05),[x,1.33,-.24],[x*1.05,1.13,-.36]);setLimb(limb(S,.04),[x*1.05,1.13,-.36],[x*1.1,1.0,-.46])}
  const legs=[-.1,.1].map(x=>({x,th:limb(K,.075),sh:limb(S,.055),ft:add(new T.BoxGeometry(.09,.06,.24),K,0,0,0),cr:limb(F,.015)}));
  return {g,legs,wr,wf,a:Math.random()*6};
}
function setLimb(m,a,b){
  const T=T3,A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),len=d.length();
  m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());m.scale.y=len;
}
function poseRider(R,dt,cad,spd){
  R.a+=cad/60*Math.PI*2*dt;const rot=spd*dt/.34;R.wr.rotation.x-=rot;R.wf.rotation.x-=rot;
  const BB=[0,.3,.02],L1=.45,L2=.45;
  R.legs.forEach((l,i)=>{
    const a=R.a+i*Math.PI,p=[l.x,BB[1]+.17*Math.cos(a),BB[2]-.17*Math.sin(a)],hp=[l.x,.99,.15];
    const dy=p[1]-hp[1],dz=p[2]-hp[2],d=Math.min(L1+L2-.001,Math.hypot(dy,dz)),uy=dy/d,uz=dz/d;
    const k=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-k*k));
    /* knie altijd naar voren (kleinere z) */
    const c1=[l.x,hp[1]+uy*k-uz*h,hp[2]+uz*k+uy*h],c2=[l.x,hp[1]+uy*k+uz*h,hp[2]+uz*k-uy*h],knee=c1[2]<c2[2]?c1:c2;
    setLimb(l.th,hp,knee);setLimb(l.sh,knee,p);setLimb(l.cr,[l.x*.6,BB[1],BB[2]],p);
    l.ft.position.set(l.x,p[1]-.03,p[2]-.04);
  });
}

/* ---------- wereld opbouwen ---------- */
const SKY_TOP='#4f97d6',SKY_HOR='#cfe3f1';
async function worldOpen(){
  if(W){W.el.hidden=false;return}
  W={loading:true};
  try{T3=T3||await import(THREE_URL)}catch(e){W=null;setView3d(false);toast('De 3D-weergave kon niet laden. Je ziet nu de cijfers.');return renderPlayer()}
  if(!P){W=null;return}
  const T=T3,el=document.createElement('div');el.id='world';document.body.appendChild(el);
  let ren;try{ren=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}catch(e){el.remove();W=null;setView3d(false);toast('Deze browser kan geen 3D tonen. Je ziet nu de cijfers.');return renderPlayer()}
  const small=Math.min(innerWidth,innerHeight)<600;
  ren.setPixelRatio(Math.min(devicePixelRatio||1,1.5));ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;el.appendChild(ren.domElement);
  const scene=new T.Scene();scene.background=new T.Color(SKY_HOR);scene.fog=new T.Fog(SKY_HOR,170,640);
  scene.add(new T.HemisphereLight('#eaf4ff','#5f6f3c',1.35));
  const sun=new T.DirectionalLight('#fff1d6',2.6);sun.castShadow=true;sun.shadow.mapSize.set(small?1024:2048,small?1024:2048);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:260});sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
  scene.add(sun,sun.target);
  const cam=new T.PerspectiveCamera(60,1,.3,2200);
  /* lucht: van diepblauw boven naar licht aan de horizon, met bergen in de verte die met je meereizen */
  const skyG=new T.SphereGeometry(1800,24,12),sc=[],ct=new T.Color(SKY_TOP),ch=new T.Color(SKY_HOR),tc=new T.Color();
  for(let i=0;i<skyG.attributes.position.count;i++){const y=skyG.attributes.position.getY(i)/1800;tc.copy(ch).lerp(ct,clamp(y*1.6,0,1));sc.push(tc.r,tc.g,tc.b)}
  skyG.setAttribute('color',new T.Float32BufferAttribute(sc,3));
  const sky=new T.Mesh(skyG,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-2;scene.add(sky);
  const ring=new T.Group(),r=rng(11);
  for(const [R,col,hm] of[[1500,'#a9bfd2',260],[1250,'#93abc0',170]]){
    const pos=[],M=72;for(let i=0;i<=M;i++){const a=i/M*Math.PI*2,hh=hm*(.35+.65*Math.abs(Math.sin(i*1.7+R)*.6+Math.sin(i*.53+R)*.4))*(0.6+r()*.4);
      pos.push(Math.cos(a)*R,-60,Math.sin(a)*R,Math.cos(a)*R,hh,Math.sin(a)*R)}
    const idx=[];for(let i=0;i<M;i++)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);
    const m=new T.Mesh(g,new T.MeshBasicMaterial({color:col,fog:false,side:T.DoubleSide,depthWrite:false}));m.renderOrder=-1;ring.add(m)}
  scene.add(ring);
  W={el,ren,scene,cam,sun,sky,ring,G:propGeos(),root:null,C:null,total:-1,me:makeRider('#FF6A2B',false),pace:makeRider('#3D8BD4',true),
     disp:0,extra:0,gap:2,last:performance.now(),camP:null,mills:[],raf:0,tex:worldTextures()};
  for(const R of[W.me,W.pace])R.g.traverse(o=>{if(o.isMesh)o.castShadow=true});
  scene.add(W.me.g,W.pace.g);
  const fit=()=>{const w=innerWidth,h=innerHeight;ren.setSize(w,h);cam.aspect=w/h;cam.fov=w<h?72:58;cam.setViewOffset(w,h,0,Math.round(h*(w<h?.12:.2)),w,h);cam.updateProjectionMatrix()};
  W.fit=fit;addEventListener('resize',fit);fit();
  worldBuild();W.raf=requestAnimationFrame(worldFrame);
}
/* fijne korrel op asfalt en gras, zodat vlakken niet egaal ogen */
function worldTextures(){
  const T=T3,noise=(n,base,spread,dots)=>canvasTex(n,n,(c,w,h)=>{c.fillStyle=base;c.fillRect(0,0,w,h);
    for(let i=0;i<dots;i++){const v=Math.round(128+(Math.random()-.5)*spread);c.fillStyle=`rgba(${v},${v},${v},.35)`;c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}});
  const asf=noise(256,"#6b6f75",70,7000),gras=noise(128,'#ffffff',120,2600);
  for(const t of[asf,gras]){t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.NoColorSpace}
  gras.colorSpace=T.SRGBColorSpace;asf.colorSpace=T.SRGBColorSpace;
  return {asf,gras};
}
function worldClose(){
  if(!W||W.loading)return;cancelAnimationFrame(W.raf);removeEventListener('resize',W.fit);
  W.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(m.map)m.map.dispose();m.dispose()})});
  W.ren.dispose();W.el.remove();W=null;
}
/* binnenkant van een bocht: het land niet verder laten reiken dan de straal, anders schuift het over zichzelf */
const innerOff=(off,k)=>{if(off*k<=0)return off;const lim=Math.max(8,.8/Math.abs(k));return Math.sign(off)*lim*Math.tanh(Math.abs(off)/lim)};
/* Waar de weg na een paar bochten weer dichtbij komt, mag het land van het ene stuk niet over het andere heen liggen:
   het land wordt dan ingekort tot halverwege beide stukken weg. */
function roadHash(C){
  const cell=200,m=new Map();
  for(let k=0;k<C.N;k+=8){const key=Math.floor(C.X[k]/cell)*100003+Math.floor(C.Z[k]/cell);let a=m.get(key);if(!a)m.set(key,a=[]);a.push(k)}
  C.hash=m;C.cell=cell;
}
function intrudes(C,d,x,z,ao){
  const c=C.cell,r=Math.ceil(ao/c),cx=Math.floor(x/c),cz=Math.floor(z/c),lim=ao*ao*.81;
  for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){const a=C.hash.get((cx+i)*100003+cz+j);if(!a)continue;
    for(const k of a){if(Math.abs(k*STEP-d)<20)continue;const dx=C.X[k]-x,dz=C.Z[k]-z;if(dx*dx+dz*dz<lim)return true}}
  return false;
}
function clipOff(C,d,p,off){
  const nx=Math.cos(p.h),nz2=Math.sin(p.h),ao=Math.abs(off);
  if(ao<15||!intrudes(C,d,p.x+nx*off,p.z+nz2*off,ao))return off;
  let lo=0,hi=off;for(let i=0;i<5;i++){const m=(lo+hi)/2;if(intrudes(C,d,p.x+nx*m,p.z+nz2*m,Math.abs(m)))hi=m;else lo=m}
  return lo;
}
function worldBuild(){
  const T=T3;
  if(W.root){W.root.traverse(o=>{if(o.geometry&&!o.userData.shared)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(m.map&&m.map!==W.tex.asf&&m.map!==W.tex.gras)m.map.dispose();m.dispose()})});W.scene.remove(W.root)}
  const C=buildCourse(),root=new T.Group();roadHash(C);W.C=C;W.root=root;W.total=P.total;W.segN=P.wo.segs.length;W.mills=[];
  const r=rng(C.seed+1),geo=(pos,idx,col,uv)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(col)g.setAttribute('color',new T.Float32BufferAttribute(col,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g};
  const lam=new T.MeshLambertMaterial({vertexColors:true,flatShading:true,map:W.tex.gras});
  const OFF=[-400,-280,-190,-130,-88,-60,-40,-27,-18,-11,-6.5,-4.4,4.4,6.5,11,18,27,40,60,88,130,190,280,400];
  const grass={polder:new T.Color('#7db04c'),heuvels:new T.Color('#69a243'),bergen:new T.Color('#5c8e46'),meer:new T.Color('#77ab55')};
  const rock=new T.Color('#8f8a86'),snow=new T.Color('#f3f5f8'),sand=new T.Color('#d8c99a'),berm=new T.Color('#9a9a7a'),tmp=new T.Color();
  const CH=1000,DS=10,water=new T.MeshLambertMaterial({color:'#4b97c5',transparent:true,opacity:.9,side:T.DoubleSide});
  for(let a=0;a<C.L;a+=CH){
    const rows=Math.ceil(Math.min(CH,C.L-a)/DS)+1,pos=[],col=[],uv=[],idx=[];
    for(let j=0;j<rows;j++){
      const d=Math.min(C.L-1,a+j*DS),p=roadAt(C,d),mix=landMix(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const off0 of OFF){
        const off=clipOff(C,d,p,innerOff(off0,p.k)),y=landH(C,d,off,mix,p.y),wx=p.x+nx*off,wz=p.z+nzv*off;pos.push(wx,y,wz);uv.push(wx/14,wz/14);
        tmp.setRGB(0,0,0);for(const k in mix)if(mix[k])tmp.r+=grass[k].r*mix[k],tmp.g+=grass[k].g*mix[k],tmp.b+=grass[k].b*mix[k];
        tmp.offsetHSL(0,0,nz(d*2,off*2)*.06);
        const rel=y-p.y;if(mix.bergen>.3&&rel>35)tmp.lerp(rock,clamp((rel-35)/40,0,1));if(mix.bergen>.3&&rel>120)tmp.lerp(snow,clamp((rel-120)/30,0,1));
        if(mix.meer>.3&&off<-15&&off>-30)tmp.lerp(sand,.7);
        if(Math.abs(off0)<5)tmp.lerp(berm,.55);
        col.push(tmp.r,tmp.g,tmp.b);
      }
    }
    const nc=OFF.length;
    for(let j=0;j<rows-1;j++)for(let i=0;i<nc-1;i++){if(OFF[i]===-4.4)continue;const q=j*nc+i;idx.push(q,q+1,q+nc,q+1,q+nc+1,q+nc)}
    const tm=new T.Mesh(geo(pos,idx,col,uv),lam);tm.receiveShadow=true;root.add(tm);
    /* weg: asfalt met kantstrepen en middenstreep */
    const ap=[],au=[],ai=[],lp=[],li=[],RS=4,rr=Math.ceil(Math.min(CH,C.L-a)/RS)+1;
    for(let j=0;j<rr;j++){const d=Math.min(C.L-1,a+j*RS),p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const off of[-4.6,-3.2,3.2,4.6]){ap.push(p.x+nx*off,p.y+(Math.abs(off)>4?-.06:0),p.z+nzv*off);au.push((off+4.6)/2.4,d/9)}
      if(j<rr-1){const q=j*4;for(let i=0;i<3;i++)ai.push(q+i,q+i+1,q+i+4,q+i+1,q+i+5,q+i+4)}
      const line=(o,w)=>{const n=lp.length/3;for(const pp of[p,roadAt(C,d+RS)])for(const s of[-w,w])lp.push(pp.x+Math.cos(pp.h)*(o+s),pp.y+.025,pp.z+Math.sin(pp.h)*(o+s));li.push(n,n+1,n+2,n+1,n+3,n+2)};
      if(j<rr-1){line(-2.95,.07);line(2.95,.07);if(j%3===0)line(0,.06)}}
    const am=new T.Mesh(geo(ap,ai,null,au),new T.MeshLambertMaterial({map:W.tex.asf}));am.receiveShadow=true;root.add(am);
    const lm=new T.Mesh(geo(lp,li),new T.MeshLambertMaterial({color:'#f2f0e8'}));lm.receiveShadow=true;root.add(lm);
  }
  /* water bij het meer */
  for(const zn of C.zones)if(zn.ty==='meer'){
    const pos=[],idx=[];let j=0;
    for(let d=Math.max(0,zn.a-350);d<=Math.min(C.L-1,zn.b+350);d+=16,j++){const p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const o0 of[-20,-400]){const o=clipOff(C,d,p,innerOff(o0,p.k));pos.push(p.x+nx*o,p.y-1.9,p.z+nzv*o)}
      if(j)idx.push((j-1)*2,(j-1)*2+1,j*2,(j-1)*2+1,j*2+1,j*2)}
    root.add(new T.Mesh(geo(pos,idx),water));
  }
  /* kanalen met een brug */
  const lists={};const put=(k,x,y,z,s,ry)=>{(lists[k]=lists[k]||[]).push([x,y,z,s,ry])};
  for(const dc of C.canals){
    const p=roadAt(C,dc),nx=Math.cos(p.h),nzv=Math.sin(p.h),wm=new T.Mesh(new T.PlaneGeometry(800,12),water);
    wm.rotation.set(-Math.PI/2,-p.h,0,'YXZ');
    wm.position.set(p.x,p.y-2.1,p.z);root.add(wm);
    for(let d=dc-9;d<dc+9;d+=1.6){const q=roadAt(C,d);for(const o of[-4.3,4.3])put('reling',q.x+Math.cos(q.h)*o,q.y,q.z+Math.sin(q.h)*o,1,-q.h+Math.PI)}
    for(let d=dc-8;d<dc+8;d+=2){const q=roadAt(C,d);for(const o of[-4.4,4.4])put('brugwand',q.x+Math.cos(q.h)*o,q.y,q.z+Math.sin(q.h)*o,1,-q.h)}
  }
  /* bomen, huizen, koeien, molens, paaltjes */
  const nearCanal=d=>canalAt(C,d)!=null;
  let fence=0;
  for(let d=20;d<C.L-20;d+=7){
    const p=roadAt(C,d),mix=landMix(C,d),zn=zoneAt(C,d),ty=zn.ty,nx=Math.cos(p.h),nzv=Math.sin(p.h);
    const at=o=>{const oo=clipOff(C,d,p,innerOff(o,p.k));return [p.x+nx*oo,landH(C,d,oo,mix,p.y),p.z+nzv*oo,Math.abs(oo-o)>2]};
    if(d%42<7&&!nearCanal(d))for(const o of[-4.9,4.9]){const [x,y,z]=at(o);put('paal',x,y,z,1,-p.h)}
    if(ty==='heuvels'){if(fence<=0&&r()<.02)fence=30;if(fence>0){fence--;if(d%3<7)for(const o of[-6.5]){const [x,y,z]=at(o);put('hek',x,y,z,1,-p.h+Math.PI)}}}
    for(const side of[-1,1]){
      if(r()>.55)continue;
      const off=side*(8+Math.pow(r(),1.6)*170),[x,y,z,clipped]=at(off),u=r();if(clipped)continue;
      if(ty==='meer'&&off<-20){if(u<.04&&Math.abs(off)>60)put('boot',x,p.y-1.9,z,1,r()*6);else if(Math.abs(off)<30&&u<.5)put('riet',x,y,z,.8+r()*.6,r()*6);continue}
      if(ty==='polder'){if(Math.abs(off)<16&&u<.35&&!nearCanal(d)){const [a1,b1,c1]=at(side*16);put('populier',a1,b1,c1,.9+r()*.3,0)}else if(u<.06)put('koe',x,y,z,1,r()*6);else if(u<.08)put(r()<.5?'huis':'schuur',x,y,z,1,-p.h+(r()<.5?0:Math.PI/2));else if(u<.11)put('baal',x,y,z,1,r()*6);else if(u<.18)put('boom',x,y,z,.7+r()*.5,r()*6)}
      else if(ty==='heuvels'){if(u<.42)put('boom',x,y,z,.7+r()*.6,r()*6);else if(u<.47)put('huis',x,y,z,1,-p.h+r()*.4);else if(u<.52)put('koe',x,y,z,1,r()*6);else if(u<.55)put('baal',x,y,z,1,r()*6);else if(u<.59)put('den',x,y,z,.8+r()*.4,0)}
      else if(ty==='bergen'){if(u<.55)put('den',x,y,z,.8+r()*.7,r()*6);else if(u<.68)put('rots',x,y,z,.6+r()*1.4,r()*6)}
      else if(u<.3)put('boom',x,y,z,.7+r()*.5,r()*6);else if(u<.36)put('huis',x,y,z,1,-p.h);
    }
    if(ty==='polder'&&d%900<7&&r()<.85){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*(45+r()*80));if(!cl){const m=makeMill();m.position.set(x,y,z);m.rotation.y=-p.h;root.add(m);W.mills.push(m.userData.sails)}}
    if(d%160<7&&r()<.4){const off=(r()-.5)*900;put('wolk',p.x+nx*off,p.y+120+r()*70,p.z+nzv*off,1+r(),r()*6)}
  }
  /* een dorp met kerk in elk polder- en heuvelstuk */
  for(const zn of C.zones)if(zn.ty==='polder'||zn.ty==='heuvels'){
    const d=zn.a+(zn.b-zn.a)*(.35+r()*.3),p=roadAt(C,d),mix=landMix(C,d),side=p.k>0?-1:1,cOff=side*(70+r()*40);
    const nx=Math.cos(p.h),nzv=Math.sin(p.h),cx=p.x+nx*cOff,cz=p.z+nzv*cOff;
    put('kerk',cx,landH(C,d,cOff,mix,p.y),cz,1,-p.h+Math.PI/2);
    for(let i=0;i<11;i++){const a=r()*Math.PI*2,rad=16+r()*36,dd=d+Math.cos(a)*rad,oo=cOff+Math.sin(a)*rad;if(Math.abs(oo)<12)continue;
      const q=roadAt(C,dd),x=q.x+Math.cos(q.h)*oo,z=q.z+Math.sin(q.h)*oo;put('huis',x,landH(C,dd,oo,mix,q.y),z,.9+r()*.3,-p.h+Math.round(r()*4)*Math.PI/2)}
  }
  const im=new T.MeshLambertMaterial({vertexColors:true,flatShading:true}),M=new T.Matrix4();
  for(const k in lists){
    const L=lists[k],m=new T.InstancedMesh(W.G[k],k==='wolk'?new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9,fog:false}):im,L.length);m.userData.shared=true;
    L.forEach(([x,y,z,s,ry],i)=>m.setMatrixAt(i,M4(x,y,z,s,s,s,ry)));
    m.frustumCulled=false;root.add(m);
  }
  /* bogen bij elk nieuw blok (niet bij elke stap van de FTP-test), een finishboog en hellingsborden */
  const segs=P.wo.segs,zc=z=>getComputedStyle(document.documentElement).getPropertyValue('--z'+z).trim()||'#888';
  const arch=(ar,d)=>{const p=roadAt(C,d);ar.position.set(p.x,p.y,p.z);ar.rotation.y=-p.h;root.add(ar)};
  segs.forEach((s,i)=>{const pv=segs[i-1];
    if(s.d<20||(pv&&pv.kind===s.kind&&Math.abs(pv.d-s.d)<2&&(s.kind!=='work'||P.wo.type==='ramptest')))return;
    arch(makeArch(zc(zoneOf((s.a+s.b)/2)),`${s.label.slice(0,24)} · ${Math.round(s.a*P.ftp)} W`),distAt(C,P.starts[i]));
    const g=gradeFor(s);if(g>=3&&!(pv&&gradeFor(pv)>=3)){const sg=makeSign(Math.round(g)),d=Math.max(5,distAt(C,P.starts[i])-30),p=roadAt(C,d);
      sg.position.set(p.x+Math.cos(p.h)*5.4,p.y,p.z+Math.sin(p.h)*5.4);sg.rotation.y=-p.h;root.add(sg)}});
  arch(makeArch('#20242c','FINISH',true),distAt(C,P.total));
  W.scene.add(root);
}
function worldFrame(t){
  if(!W||W.loading)return;
  W.raf=requestAnimationFrame(worldFrame);
  if(!P){return worldClose()}
  if(W.el.hidden)return;
  if(P.total!==W.total||P.wo.segs.length!==W.segN)worldBuild();
  const dt=Math.min(.1,(t-W.last)/1000);W.last=t;const C=W.C,T=T3;
  const run=P.mode==='run'&&!P.auto,rate=run?(P.sim?P.speed:1):0;
  /* vloeiend tussen de seconden door */
  if(P.free){const pw=dispPower()||0;W.extra+=run?speedFor(pw,0)*dt:0;W.disp=P.total}
  else{W.disp+=rate*dt;const tgt=P.pos;if(Math.abs(tgt-W.disp)>20)W.disp=tgt;W.disp+=(tgt-W.disp)*Math.min(1,dt*1.5);W.disp=Math.min(W.disp,tgt+1)}
  const d=distAt(C,Math.min(W.disp,C.n-1))+W.extra,p=roadAt(C,d);
  const pos=Math.min(P.pos,P.total-1),tgt=P.free?0:tgtAt(pos),pw=dispPower();
  const dev=pw==null||!tgt?0:clamp(pw/tgt-1,-.3,.3),want=P.mode==='ready'?4:clamp(2-dev*150,-2.5,45);
  W.gap+=(want-W.gap)*Math.min(1,dt*.6);
  const lane=(R,dd,off,cad,spd)=>{const q=roadAt(C,dd);R.g.position.set(q.x+Math.cos(q.h)*off,q.y,q.z+Math.sin(q.h)*off);R.g.rotation.y=-q.h;
    const q2=roadAt(C,dd+3);R.g.rotation.x=Math.atan2(q2.y-q.y,3);R.g.rotation.z=clamp(-q.k*spd*spd*.012,-.25,.25);poseRider(R,dt,cad,spd)};
  const spd=rate*(distAt(C,Math.min(pos+1,C.n-1))-distAt(C,pos))||(P.free&&run?speedFor(pw||0,0):0);
  const cad=now()-live.tP<3000&&live.cad?live.cad:0,seg=P.wo.segs[segAt(pos)];
  lane(W.me,d,.85,run?cad:0,spd);
  W.pace.g.visible=!P.free;lane(W.pace,d+W.gap,-.85,run?(seg&&seg.cad||90):0,spd);
  /* camera achter de fietser */
  const back=roadAt(C,Math.max(0,d-6)),ahead=roadAt(C,d+18);
  const cp=new T.Vector3(back.x+Math.cos(back.h)*.6,Math.max(back.y,p.y)+2.9,back.z+Math.sin(back.h)*.6);
  if(!W.camP)W.camP=cp.clone();else{W.camP.x=cp.x;W.camP.z=cp.z;W.camP.y+=(cp.y-W.camP.y)*Math.min(1,dt*3)}
  W.cam.position.copy(W.camP);W.cam.lookAt(ahead.x,ahead.y+.2,ahead.z);
  /* zon, lucht en verre bergen reizen mee */
  W.sun.position.set(p.x-50,p.y+110,p.z+35);W.sun.target.position.set(p.x,p.y,p.z);
  W.sky.position.copy(W.cam.position);W.ring.position.set(W.cam.position.x,p.y,W.cam.position.z);
  for(const s of W.mills)s.rotation.z+=dt*.6;
  W.lastD=d;worldHud(d);
  W.ren.render(W.scene,W.cam);
}
function worldHud(d){
  const g=P.game,el=id=>document.getElementById(id);if(!g)return;
  const set=(id,v)=>{const e=el(id);if(e&&e.textContent!==String(v))e.textContent=v};
  set('p-km',nl((d/1000).toFixed(1))+' km');
  if(!g.on)return;
  set('p-pts',g.pts.toLocaleString('nl-NL'));set('p-mult',g.streak>=5?`×${gameMult()} · reeks ${clock(g.streak)}`:'');
  set('p-stars','★ '+g.stars.reduce((a,b)=>a+b,0));
  const pop=el('p-pop');if(pop){const on=g.pop&&now()-g.pop.t<3500;pop.hidden=!on;if(on)set('p-pop','★'.repeat(g.pop.st)+'☆'.repeat(3-g.pop.st))}
}
/* wordt na elke renderPlayer aangeroepen */
function worldSync(){
  if(P&&view3d()){if(!W)worldOpen();else if(!W.loading){W.el.hidden=false;worldHud(W.lastD||0)}}
  else if(W&&!W.loading)W.el.hidden=true;
}
