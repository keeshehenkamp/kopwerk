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
const LANDS=['polder','heuvels','bergen','meer'];
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
  const L=s+25000,N=Math.ceil(L/STEP)+2;
  const X=new Float32Array(N),Y=new Float32Array(N),Z=new Float32Array(N),HD=new Float32Array(N);
  let x=0,z=0,t=0;
  for(let k=0;k<N;k++){
    const d=k*STEP;
    while(t<n&&S[t+1]<d)t++;
    let y;if(d>=S[n])y=Math.max(0,H[n]-(d-S[n])*.03);
    else{const f=S[t+1]>S[t]?clamp((d-S[t])/(S[t+1]-S[t]),0,1):0;y=H[t]+(H[t+1]-H[t])*f}
    const hd=.55*Math.sin(d/1100)+.32*Math.sin(d/430+1.3)+.12*Math.sin(d/170+.4);
    X[k]=x;Z[k]=z;Y[k]=y;HD[k]=hd;x+=Math.sin(hd)*STEP;z-=Math.cos(hd)*STEP;
  }
  /* hoogte iets afvlakken zodat de overgang naar een klim niet hoekig is */
  const Ys=new Float32Array(N),R=8;let acc=0;
  for(let k=0;k<N;k++){acc+=Y[k];if(k>=2*R+1)acc-=Y[k-2*R-1];const lo=Math.max(0,k-2*R);Ys[Math.max(0,k-R)]=acc/(k-lo+1)}
  for(let k=N-R;k<N;k++)Ys[k]=Y[k];
  /* landschappen van 4 tot 5 km, volgorde per rit anders */
  const seed=[...(P.wo.name+P.startTs)].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7),r=rng(seed);
  const zones=[];let zd=0,bag=[],last='';
  while(zd<L){if(!bag.length)bag=LANDS.slice().sort(()=>r()-.5);let ty=bag.pop();if(ty===last&&bag.length){bag.unshift(ty);ty=bag.pop()}
    const len=4000+r()*1000;zones.push({ty,a:zd,b:zd+len,y:0});zd+=len;last=ty}
  const C={S,H,n,L,N,X,Y:Ys,Z,HD,zones,seed};
  for(const zn of zones)zn.y=roadAt(C,zn.a).y;
  return C;
}
function roadAt(C,d){
  const f=clamp(d/STEP,0,C.N-1.001),k=Math.floor(f),u=f-k,lerp=(A)=>A[k]+(A[k+1]-A[k])*u;
  return {x:lerp(C.X),y:lerp(C.Y),z:lerp(C.Z),h:lerp(C.HD)};
}
const distAt=(C,t)=>{const f=clamp(t,0,C.n-.001),k=Math.floor(f);return C.S[k]+(C.S[k+1]-C.S[k])*(f-k)};
function zoneAt(C,d){let lo=0,hi=C.zones.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(C.zones[m].a<=d)lo=m;else hi=m-1}return C.zones[lo]}
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
/* hoogte van het land naast de weg (off = meters naar rechts) */
function landH(C,d,off,mix,ry){
  const ao=Math.abs(off),near=clamp((ao-4)/30,0,1),n=nz(d,off);
  let h=0;
  h+=mix.polder*(ao>11&&ao<14?-1.4:0);
  h+=mix.heuvels*(near*(10+12*n)+near*near*ao*.05);
  h+=mix.bergen*(near*(8*n+6)+Math.pow(clamp((ao-25)/300,0,1),1.4)*170*(.7+.3*n));
  h+=mix.meer*(off<0?(ao>22?-3.5-near*2:0):near*(5+5*n));
  return ry*(1-near*.6)+h-(ao<4.5?.05:.25);
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
  return G;
}
function makeMill(){
  const T=T3,g=new T.Group(),mat=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
  g.add(new T.Mesh(partsGeo([[new T.CylinderGeometry(1.6,3,11,8),'#5b4636',M4(0,5.5,0)],[new T.ConeGeometry(2.1,2.6,8),'#3f3f45',M4(0,12.2,0)],[new T.CylinderGeometry(3.4,3.4,.4,10),'#7a6a58',M4(0,5,0)]]),mat));
  const sails=new T.Group();sails.position.set(0,11.2,2.2);
  for(let i=0;i<4;i++){const s=new T.Mesh(partsGeo([[new T.BoxGeometry(.25,7,.12),'#4b3a2c',M4(0,3.6,0)],[new T.BoxGeometry(1.3,5.4,.08),'#efe9dc',M4(.75,4.2,0)]]),mat);s.rotation.z=i*Math.PI/2;sails.add(s)}
  g.add(sails);g.userData.sails=sails;return g;
}
function makeArch(color,text){
  const T=T3,g=new T.Group(),m=new T.MeshLambertMaterial({color,flatShading:true});
  for(const x of[-4.6,4.6]){const p=new T.Mesh(new T.BoxGeometry(.4,5,.4),m);p.position.set(x,2.5,0);g.add(p)}
  const cv=document.createElement('canvas');cv.width=512;cv.height=64;const c=cv.getContext('2d');
  c.fillStyle=color;c.fillRect(0,0,512,64);c.fillStyle='#fff';c.font='bold 38px Figtree, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,34);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
  const b=new T.Mesh(new T.BoxGeometry(9.6,1.2,.4),[m,m,m,m,new T.MeshBasicMaterial({map:tex}),new T.MeshBasicMaterial({map:tex})]);
  b.position.y=5.2;g.add(b);return g;
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
async function worldOpen(){
  if(W){W.el.hidden=false;return}
  W={loading:true};
  try{T3=T3||await import(THREE_URL)}catch(e){W=null;setView3d(false);toast('De 3D-weergave kon niet laden. Je ziet nu de cijfers.');return renderPlayer()}
  if(!P){W=null;return}
  const T=T3,el=document.createElement('div');el.id='world';document.body.appendChild(el);
  let ren;try{ren=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}catch(e){el.remove();W=null;setView3d(false);toast('Deze browser kan geen 3D tonen. Je ziet nu de cijfers.');return renderPlayer()}
  ren.setPixelRatio(Math.min(devicePixelRatio||1,1.5));el.appendChild(ren.domElement);
  const scene=new T.Scene(),sky=new T.Color('#a9d6f2');scene.background=sky;scene.fog=new T.Fog(sky,140,520);
  scene.add(new T.HemisphereLight('#e8f4ff','#5c6b3a',1.6));const sun=new T.DirectionalLight('#fff4e0',2.2);sun.position.set(-60,120,40);scene.add(sun);
  const cam=new T.PerspectiveCamera(60,1,.3,1400);
  W={el,ren,scene,cam,G:propGeos(),root:null,C:null,total:-1,me:makeRider('#FF6A2B',false),pace:makeRider('#3D8BD4',true),
     disp:0,extra:0,gap:2,last:performance.now(),camP:null,mills:[],raf:0,hud:{}};
  scene.add(W.me.g,W.pace.g);
  const fit=()=>{const w=innerWidth,h=innerHeight;ren.setSize(w,h);cam.aspect=w/h;cam.fov=w<h?72:58;cam.setViewOffset(w,h,0,Math.round(h*(w<h?.12:.2)),w,h);cam.updateProjectionMatrix()};
  W.fit=fit;addEventListener('resize',fit);fit();
  worldBuild();W.raf=requestAnimationFrame(worldFrame);
}
function worldClose(){
  if(!W||W.loading)return;cancelAnimationFrame(W.raf);removeEventListener('resize',W.fit);
  W.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(m.map)m.map.dispose();m.dispose()})});
  W.ren.dispose();W.el.remove();W=null;
}
function worldBuild(){
  const T=T3;
  if(W.root){W.root.traverse(o=>{if(o.geometry&&!o.userData.shared)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(m.map)m.map.dispose();m.dispose()})});W.scene.remove(W.root)}
  const C=buildCourse(),root=new T.Group();W.C=C;W.root=root;W.total=P.total;W.segN=P.wo.segs.length;W.mills=[];
  const r=rng(C.seed+1),lam=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
  const OFF=[-460,-300,-200,-130,-85,-55,-36,-24,-15,-9,-4,4,9,15,24,36,55,85,130,200,300,460];
  const grass={polder:new T.Color('#7fb34d'),heuvels:new T.Color('#6aa443'),bergen:new T.Color('#5d8f45'),meer:new T.Color('#79ad55')};
  const rock=new T.Color('#8f8a86'),snow=new T.Color('#f3f5f8'),sand=new T.Color('#d8c99a'),tmp=new T.Color();
  const CH=1000,DS=12;
  for(let a=0;a<C.L;a+=CH){
    const rows=Math.ceil(Math.min(CH,C.L-a)/DS)+1,pos=[],col=[],idx=[];
    for(let j=0;j<rows;j++){
      const d=Math.min(C.L-1,a+j*DS),p=roadAt(C,d),mix=landMix(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const off of OFF){
        const y=landH(C,d,off,mix,p.y);pos.push(p.x+nx*off,y,p.z+nzv*off);
        tmp.setRGB(0,0,0);for(const k in mix)if(mix[k])tmp.r+=grass[k].r*mix[k],tmp.g+=grass[k].g*mix[k],tmp.b+=grass[k].b*mix[k];
        const v=nz(d*2,off*2)*.06;tmp.offsetHSL(0,0,v);
        const rel=y-p.y;if(mix.bergen>.3&&rel>40)tmp.lerp(rock,clamp((rel-40)/40,0,1));if(mix.bergen>.3&&rel>110)tmp.lerp(snow,clamp((rel-110)/30,0,1));
        if(mix.meer>.3&&off<0&&Math.abs(off)>15&&Math.abs(off)<30)tmp.lerp(sand,.7);
        col.push(tmp.r,tmp.g,tmp.b);
      }
    }
    const nc=OFF.length;
    for(let j=0;j<rows-1;j++)for(let i=0;i<nc-1;i++){if(OFF[i]===-4)continue;const q=j*nc+i;idx.push(q,q+1,q+nc,q+1,q+nc+1,q+nc)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
    root.add(new T.Mesh(g,lam));
    /* weg */
    const rp=[],ri=[],lp=[],li=[];
    for(let j=0;j<rows;j++){const d=Math.min(C.L-1,a+j*DS),p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const off of[-4,-2.8,2.8,4])rp.push(p.x+nx*off,p.y+(Math.abs(off)>3?-.05:0),p.z+nzv*off);
      if(j<rows-1){const q=j*4;for(let i=0;i<3;i++)ri.push(q+i,q+i+1,q+i+4,q+i+1,q+i+5,q+i+4)}
      if(j%2===0&&j<rows-1){const p2=roadAt(C,d+5),n=lp.length/3;
        for(const [pp,s] of[[p,1],[p2,1]])for(const o of[-.06,.06])lp.push(pp.x+Math.cos(pp.h)*o,pp.y+.03,pp.z+Math.sin(pp.h)*o);
        li.push(n,n+1,n+2,n+1,n+3,n+2)}}
    const rc=[];for(let j=0;j<rows;j++)rc.push(...[.62,.62,.62],...[.33,.35,.38],...[.33,.35,.38],...[.62,.62,.62]);
    const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(rp,3));rg.setAttribute('color',new T.Float32BufferAttribute(rc,3));rg.setIndex(ri);rg.computeVertexNormals();
    root.add(new T.Mesh(rg,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide})));
    const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(lp,3));lg.setIndex(li);
    root.add(new T.Mesh(lg,new T.MeshBasicMaterial({color:'#f3f1ea',side:T.DoubleSide})));
  }
  /* water bij het meer */
  for(const zn of C.zones)if(zn.ty==='meer'){
    const pos=[],idx=[];let j=0;
    for(let d=Math.max(0,zn.a-350);d<=Math.min(C.L-1,zn.b+350);d+=24,j++){const p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h),wy=p.y*.4+zn.y*.6-1.6;
      for(const off of[-21,-480])pos.push(p.x+nx*off,Math.min(wy,p.y-1.4),p.z+nzv*off);
      if(j)idx.push((j-1)*2,(j-1)*2+1,j*2,(j-1)*2+1,j*2+1,j*2)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    root.add(new T.Mesh(g,new T.MeshLambertMaterial({color:'#4f9cc9',side:T.DoubleSide,transparent:true,opacity:.92})));
  }
  /* bomen, huizen, koeien, molens */
  const lists={};const put=(k,x,y,z,s,ry,c)=>{(lists[k]=lists[k]||[]).push([x,y,z,s,ry,c])};
  for(let d=20;d<C.L-20;d+=7){
    const p=roadAt(C,d),mix=landMix(C,d),ty=zoneAt(C,d).ty,nx=Math.cos(p.h),nzv=Math.sin(p.h);
    for(const side of[-1,1]){
      if(r()>.55)continue;
      const off=side*(8+Math.pow(r(),1.6)*170),y=landH(C,d,off,mix,p.y),x=p.x+nx*off,z=p.z+nzv*off,u=r();
      if(ty==='meer'&&off<-20){if(u<.04&&Math.abs(off)>60)put('boot',x,p.y*.4+zoneAt(C,d).y*.6-1.6,z,1,r()*6);else if(Math.abs(off)<30&&u<.5)put('riet',x,y,z,.8+r()*.6,r()*6);continue}
      if(ty==='polder'){if(Math.abs(off)<16&&u<.35)put('populier',p.x+nx*side*16,landH(C,d,side*16,mix,p.y),p.z+nzv*side*16,.9+r()*.3,0);else if(u<.06)put('koe',x,y,z,1,r()*6);else if(u<.08)put(r()<.5?'huis':'schuur',x,y,z,1,-p.h+(r()<.5?0:Math.PI/2));else if(u<.16)put('boom',x,y,z,.7+r()*.5,r()*6)}
      else if(ty==='heuvels'){if(u<.42)put('boom',x,y,z,.7+r()*.6,r()*6);else if(u<.47)put('huis',x,y,z,1,-p.h+r()*.4);else if(u<.52)put('koe',x,y,z,1,r()*6);else if(u<.56)put('den',x,y,z,.8+r()*.4,0)}
      else if(ty==='bergen'){if(u<.55)put('den',x,y,z,.8+r()*.7,r()*6);else if(u<.68)put('rots',x,y,z,.6+r()*1.4,r()*6)}
      else if(u<.3)put('boom',x,y,z,.7+r()*.5,r()*6);else if(u<.36)put('huis',x,y,z,1,-p.h);
    }
    if(zoneAt(C,d).ty==='polder'&&d%900<7&&r()<.85){const side=r()<.5?-1:1,off=side*(45+r()*80),m=makeMill();m.position.set(p.x+nx*off,landH(C,d,off,mix,p.y),p.z+nzv*off);m.rotation.y=-p.h+(side>0?Math.PI:0)*0;root.add(m);W.mills.push(m.userData.sails)}
    if(d%160<7){const side=r()<.5?-1:1,b=mix.bergen;if(b>.5){const off=side*(520+r()*400),sc=150+r()*220;put('top',p.x+nx*off,p.y-10,p.z+nzv*off,sc,r()*6)}
      if(r()<.4){const off=(r()-.5)*900;put('wolk',p.x+nx*off,p.y+110+r()*60,p.z+nzv*off,1+r(),r()*6)}}
  }
  const im=new T.MeshLambertMaterial({vertexColors:true,flatShading:true}),mt=new T.Matrix4();
  for(const k in lists){
    const L=lists[k],m=new T.InstancedMesh(W.G[k],k==='wolk'?new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9,fog:false}):im,L.length);m.userData.shared=true;
    L.forEach(([x,y,z,s,ry],i)=>{m.setMatrixAt(i,k==='top'?M4(x,y,z,s*.9,s*.75,s*.9,ry):M4(x,y,z,s,s,s,ry))});
    m.frustumCulled=false;root.add(m);
  }
  /* bogen bij elk blok van minstens 20 seconden */
  const segs=P.wo.segs;
  segs.forEach((s,i)=>{if(s.d<20||(i>0&&segs[i-1].label===s.label&&s.kind!=='work'))return;
    const d=distAt(C,P.starts[i]),p=roadAt(C,d),f=(s.a+s.b)/2;
    const ar=makeArch(getComputedStyle(document.documentElement).getPropertyValue('--z'+zoneOf(f)).trim()||'#888',`${s.label.slice(0,26)} · ${Math.round(s.a*P.ftp)} W`);
    ar.position.set(p.x,p.y,p.z);ar.rotation.y=-p.h;root.add(ar)});
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
    const q2=roadAt(C,dd+3);R.g.rotation.x=Math.atan2(q2.y-q.y,3);poseRider(R,dt,cad,spd)};
  const spd=rate*(distAt(C,Math.min(pos+1,C.n-1))-distAt(C,pos))||(P.free&&run?speedFor(pw||0,0):0);
  const cad=now()-live.tP<3000&&live.cad?live.cad:0,seg=P.wo.segs[segAt(pos)];
  lane(W.me,d,.85,run?cad:0,spd);
  W.pace.g.visible=!P.free;lane(W.pace,d+W.gap,-.85,run?(seg&&seg.cad||90):0,spd);
  /* camera achter de fietser */
  const back=roadAt(C,Math.max(0,d-5.2)),ahead=roadAt(C,d+8);
  const cp=new T.Vector3(back.x+Math.cos(back.h)*.6,Math.max(back.y,p.y)+2.7,back.z+Math.sin(back.h)*.6);
  if(!W.camP)W.camP=cp.clone();else{W.camP.x=cp.x;W.camP.z=cp.z;W.camP.y+=(cp.y-W.camP.y)*Math.min(1,dt*3)}
  W.cam.position.copy(W.camP);W.cam.lookAt(ahead.x,ahead.y-.4,ahead.z);
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
