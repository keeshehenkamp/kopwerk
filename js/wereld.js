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

/* ---------- productdemo: twee minuten langs alle landschappen ---------- */
function demoWorkout(){
  const segs=[S(150,.5,.65,'Warming-up','warmup'),S(120,.75,null,'Tempo langs het meer','steady'),S(150,1.0,null,'Klim door de heuvels','work'),S(60,.55,null,'Herstel','rest'),
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
  const L=s+12000,N=Math.ceil(L/STEP)+2,Y=new Float32Array(N);
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
    if(P.wo.type==='demo'){const zi=zones.length;ty=['polder','meer','heuvels','bergen','bergen','heuvels','polder'][zi]||'polder';zones.push({ty,a:zd,b:zd+([1350,1250,900,1700,800,3000][zi]||3000)});zd=zones[zi].b;last=ty;continue}
    if(up/len>.2)ty=steep>up*.4?'bergen':'heuvels';
    else{if(!bag.length)bag=['polder','meer','heuvels','bergen'].sort(()=>r()-.5);ty=bag.pop();if(ty===last&&bag.length){bag.unshift(ty);ty=bag.pop()}}
    zones.push({ty,a:zd,b:zd+len});zd+=len;last=ty;
  }
  const C={S,H,n,L,N,Y:Ys,zones,seed,ph:r()*6};
  /* bochten: polder lang rechtdoor met af en toe een scherpe bocht, heuvels en bergen slingerend */
  const X=new Float32Array(N),Z=new Float32Array(N),HD=new Float32Array(N),K=new Float32Array(N);
  let hd=0,x=0,z=0,turn=0,amt=0,next=500,zig=null;const ph=C.ph;
  for(let k=0;k<N;k++){
    const d=k*STEP,ty=zoneAt(C,d).ty,gr=(Ys[Math.min(N-1,k+10)]-Ys[k])/40*100;let kap;
    /* haarspeldbochten: op een steile klim in de bergen zigzagt de weg tegen de helling op */
    if(!zig&&ty==='bergen'&&gr>4&&d>300)zig={a:hd-.35,tgt:hd,left:120+r()*120,arc:0,dk:0};
    if(zig&&!zig.arc&&(ty!=='bergen'||gr<2.5))zig=null;
    if(zig){
      if(zig.arc>0){kap=zig.dk;zig.arc-=STEP;if(zig.arc<=0){zig.arc=0;zig.left=200+r()*160}}
      else{
        kap=clamp((zig.tgt-hd)*.03,-.02,.02)+Math.sin(d/90+ph)/900;zig.left-=STEP;
        if(zig.left<=0){const nt=Math.abs(zig.tgt-(zig.a+.35))<.01?zig.a+Math.PI-.35:zig.a+.35;zig.dk=(nt-zig.tgt)/64;zig.arc=64;zig.tgt=nt}
      }
    }else if(ty==='polder'){
      kap=Math.sin(d/800+ph)/3000;
      if(d>=next){amt=(.7+r()*.7)*(hd>.2?-1:hd<-.2?1:(r()<.5?-1:1));turn=44;next=d+600+r()*900}
      if(turn>0){kap+=amt/44;turn-=STEP}
      kap-=hd*.0012;
    }else{const Rr=ty==='bergen'?120:ty==='heuvels'?190:300;kap=(.6*Math.sin(d/(Rr*1.8)+ph)+.4*Math.sin(d/(Rr*.8)+ph*2.3))/Rr-hd*(ty==='bergen'?.002:.0012)}
    X[k]=x;Z[k]=z;HD[k]=hd;K[k]=kap;
    x+=Math.sin(hd)*STEP;z-=Math.cos(hd)*STEP;hd+=kap*STEP;
  }
  Object.assign(C,{X,Z,HD,K});
  /* kanalen met een bruggetje in de polder */
  /* dorpen waar de weg doorheen loopt */
  const NAMES=['Oosterwold','Hoogveen','Kerkdriel','Molenhoek','Westerbroek','Zandvoorde','Lindewijk','Ellecom','Bergharen','Nieuwlande','Aldeboarn','Holterberg','Vierhouten','Oudemirdum','Wijnaldum','Boxmeer'].sort(()=>r()-.5);
  C.villages=[];for(const zn of zones){const d=zn.a+(zn.b-zn.a)*(.3+r()*.4),gr=Math.abs(Ys[Math.min(N-1,Math.round(d/STEP)+40)]-Ys[Math.round(d/STEP)])/160*100;
    if(P.wo.type==='demo'&&zn.ty!=='polder'&&!(zn.ty==='heuvels'&&zn.a>3000))continue;
    if(P.wo.type==='demo'||zn.ty==='polder'||zn.ty==='heuvels'||(zn.ty==='meer'&&r()<.6)||(zn.ty==='bergen'&&gr<3&&r()<.6))C.villages.push({d,len:170+r()*110,ty:zn.ty,name:NAMES[C.villages.length%NAMES.length]})}
  C.canals=[];for(const zn of zones)if(zn.ty==='polder')for(let d=zn.a+600+r()*400;d<zn.b-300;d+=1100+r()*700)if(Math.abs(K[Math.round(d/STEP)])<.004&&!C.villages.some(v=>Math.abs(v.d-d)<v.len/2+80))C.canals.push(d);
  return C;
}
function roadAt(C,d){
  const f=clamp(d/STEP,0,C.N-1.001),k=Math.floor(f),u=f-k,lerp=(A)=>A[k]+(A[k+1]-A[k])*u;
  return {x:lerp(C.X),y:lerp(C.Y),z:lerp(C.Z),h:lerp(C.HD),k:C.K[k]};
}
const distAt=(C,t)=>{const f=clamp(t,0,C.n-.001),k=Math.floor(f);return C.S[k]+(C.S[k+1]-C.S[k])*(f-k)};
function zoneAt(C,d){let lo=0,hi=C.zones.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(C.zones[m].a<=d)lo=m;else hi=m-1}return C.zones[lo]}
const villageW=(C,d)=>{let w=0;for(const v of C.villages){const t=1-clamp((Math.abs(d-v.d)-v.len/2)/50,0,1);if(t>w)w=t}return w};
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
  const ao=Math.abs(off),near=clamp((ao-4.4)/20,0,1),n=nz(d,off),sd=clamp(Math.sin(d/1300+C.ph)*3,-1,1);
  const side=Math.tanh(off/60)*60*sd,wall=t=>Math.pow(clamp((ao-t)/45,0,1),1.5);
  let h=0;
  if(mix.polder){const c=canalAt(C,d);h+=mix.polder*(-.6*near+(ao>11&&ao<14?-1.2:0)+(c!=null&&ao>4.2?-2.6*clamp((7-Math.abs(c))/2,0,1):0)+wall(60)*4)}
  h+=mix.heuvels*(near*(side*.25+3+5*n)+wall(35)*38*(.7+.3*n));
  h+=mix.bergen*(near*(side*.5+3+4*n)+wall(22)*80*(.6+.4*n));
  h+=mix.meer*(off<0?(ao>20?-2.6-near*2.5:-.4*near):near*(2+3*n)+wall(40)*30);
  const vw=villageW(C,d);if(vw>0)h*=1-vw*clamp((60-ao)/30,0,1);
  return ry+h-(ao<4.4?.08:.2)+(vw>0&&ao>4.4&&ao<7.2?vw*.2:0);
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
  G.hek=partsGeo([[new T.BoxGeometry(.1,1.1,.1),'#7a5b3e',M4(0,.55,0)],[new T.BoxGeometry(.06,.1,7),'#8a6a4a',M4(0,.9,3.5)],[new T.BoxGeometry(.06,.1,7),'#8a6a4a',M4(0,.5,3.5)]]);
  G.baal=partsGeo([[new T.CylinderGeometry(.75,.75,1.3,10),'#d9c27a',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(0,.75,0);return m})()]]);
  G.pol=partsGeo([0,1,2,3,4,5].map(i=>[new T.ConeGeometry(.07,.5+i%3*.18,3),i%2?'#5f9a3a':'#78ad48',(()=>{const m=new T.Matrix4().makeRotationZ((i-2.5)*.18);m.setPosition(Math.cos(i*1.1)*.12,.25,Math.sin(i*1.1)*.12);return m})()]));
  G.bloem=partsGeo([...[0,1,2,3,4,5,6].map(i=>[new T.ConeGeometry(.02,.35,3),'#5f9a3a',M4(Math.cos(i*.9)*.25,.17,Math.sin(i*.9)*.25)]),
    ...[0,1,2,3,4,5,6].map(i=>[new T.IcosahedronGeometry(.06,0),['#f4d03f','#ffffff','#c86dd7','#f08a24','#e04848'][i%5],M4(Math.cos(i*.9)*.25,.37,Math.sin(i*.9)*.25)])]);
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
  G.heg=partsGeo([[new T.BoxGeometry(.9,1.1,4.2),'#3f7a36',M4(0,.55,2)]]);
  G.tuinhek=partsGeo([0,1,2,3,4,5,6,7].map(i=>[new T.BoxGeometry(.07,.8,.08),'#f2f0ea',M4(0,.4,i*.5)]).concat([[new T.BoxGeometry(.05,.07,4),'#f2f0ea',M4(0,.6,1.75)]]));
  /* polder */
  G.knotwilg=partsGeo([[new T.CylinderGeometry(.35,.42,2.2,7),'#6d5a45',M4(0,1.1,0)],[new T.IcosahedronGeometry(1.5,1),'#8fa86a',M4(0,3.1,0,1.1,1,1.1)],[new T.IcosahedronGeometry(1,0),'#9db776',M4(.6,3.8,.2)]]);
  G.schaap=partsGeo([[new T.IcosahedronGeometry(.55,1),'#f1efe8',M4(0,.75,0,.9,.8,1.3)],[new T.BoxGeometry(.28,.3,.38),'#2b2b2b',M4(0,.95,.75)],...[[-.2,-.4],[.2,-.4],[-.2,.4],[.2,.4]].map(([x,z])=>[new T.BoxGeometry(.1,.45,.1),'#2b2b2b',M4(x,.22,z)])]);
  G.silo=partsGeo([[new T.CylinderGeometry(1.8,1.8,9,14),'#c9ccd1',M4(0,4.5,0)],[new T.SphereGeometry(1.8,14,6,0,Math.PI*2,0,Math.PI/2),'#9aa0a6',M4(0,9,0)]]);
  G.trekker=partsGeo([[new T.BoxGeometry(1.6,1,2.6),'#3f8a3a',M4(0,1.1,.2)],[new T.BoxGeometry(1.4,1.4,1.2),'#3f8a3a',M4(0,1.9,-.6)],[new T.BoxGeometry(1.3,1,1.1),'#a9cbd6',M4(0,2.2,-.6)],
    ...[-.95,.95].map(x=>[new T.CylinderGeometry(.75,.75,.45,14),'#222',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(x,.75,-.7);return m})()]),...[-.85,.85].map(x=>[new T.CylinderGeometry(.42,.42,.3,12),'#222',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(x,.42,1.2);return m})()])]);
  G.auto=partsGeo([[new T.BoxGeometry(1.75,.7,4.2),'#ffffff',M4(0,.6,0)],[new T.BoxGeometry(1.6,.6,2.2),'#ffffff',M4(0,1.2,-.1)],[new T.BoxGeometry(1.63,.36,1.9),'#2c3640',M4(0,1.24,-.1)],[new T.BoxGeometry(1.4,.37,2.24),'#2c3640',M4(0,1.24,-.1)],
    ...[[-.85,1.35],[.85,1.35],[-.85,-1.35],[.85,-1.35]].map(([x,z])=>[new T.CylinderGeometry(.33,.33,.22,12),'#1c1c1c',(()=>{const m=new T.Matrix4().makeRotationZ(Math.PI/2);m.setPosition(x,.33,z);return m})()])]);
  const arm=(x,a,b)=>{const m=new T.Matrix4().makeRotationZ(a);m.premultiply(new T.Matrix4().makeRotationX(b||0));m.setPosition(x,1.42,0);return m};
  const body=arms=>partsGeo([[new T.CylinderGeometry(.09,.07,.86,6),'#2d333b',M4(-.1,.43,0)],[new T.CylinderGeometry(.09,.07,.86,6),'#2d333b',M4(.1,.43,0)],[new T.CapsuleGeometry(.19,.34,3,8),'#ffffff',M4(0,1.13,0,1,1,.75)],
    ...arms.map(([x,a,b])=>[new T.CapsuleGeometry(.055,.42,2,6),'#ffffff',(()=>{const m=arm(x,a,b);m.multiply(new T.Matrix4().makeTranslation(0,.22,0));return m})()])]);
  G.mens=body([[-.22,.45],[.22,-.45]]);
  G.mens2=body([[-.22,2.7,.4],[.22,-2.7,.4]]);
  G.hoofd=partsGeo([[new T.SphereGeometry(.13,8,6),'#e3b08f',M4(0,1.62,0)],[new T.SphereGeometry(.135,8,4,0,Math.PI*2,0,Math.PI/2.4),'#4a3426',M4(0,1.66,-.01)]]);
  G.vlag=partsGeo([[new T.CylinderGeometry(.02,.02,2.6,4),'#ddd',M4(.35,1.6,0)],[new T.BoxGeometry(.9,.6,.02),'#ffffff',M4(.82,2.55,0)]]);
  G.erf=partsGeo([[new T.CircleGeometry(1,16).rotateX(-Math.PI/2),'#a39478',null]]);
  /* heuvels */
  G.muur=partsGeo([[new T.BoxGeometry(.7,.9,4.1),'#8c8478',M4(0,.45,2)],...[0,1,2,3].map(i=>[new T.BoxGeometry(.8,.18,1.05),i%2?'#9a9286':'#7f776c',M4(0,.98,.5+i)])]);
  G.fruitboom=partsGeo([[new T.CylinderGeometry(.12,.16,1.4,5),'#6b4a2f',M4(0,.7,0)],[new T.IcosahedronGeometry(1.2,1),'#6aa64a',M4(0,2.2,0,1,.85,1)],...[0,1,2,3,4].map(i=>[new T.IcosahedronGeometry(.1,0),'#d23b2f',M4(Math.cos(i*1.3)*1,2+Math.sin(i*2)*.4,Math.sin(i*1.3)*1)])]);
  G.kapel=partsGeo([[new T.BoxGeometry(2.4,2.6,3),'#efe9dd',M4(0,1.3,0)],[prism(2.4,1.6,3,.2),'#7a3b30',M4(0,2.6,0)],[new T.BoxGeometry(.9,1.6,.06),'#3b2b22',M4(0,.8,1.53)],[new T.BoxGeometry(.08,.9,.08),'#3b2b22',M4(0,4.7,1.2)],[new T.BoxGeometry(.5,.08,.08),'#3b2b22',M4(0,4.85,1.2)]]);
  G.berk=partsGeo([[new T.CylinderGeometry(.13,.18,4,6),'#e9e6df',M4(0,2,0)],[new T.BoxGeometry(.2,.08,.2),'#333',M4(0,1.4,0)],[new T.BoxGeometry(.2,.08,.2),'#333',M4(0,2.6,0)],[new T.IcosahedronGeometry(1.4,1),'#8db552',M4(0,4.6,0,1,1.4,1)]]);
  G.eik=partsGeo([[new T.CylinderGeometry(.35,.5,3,7),'#5e4632',M4(0,1.5,0)],[new T.IcosahedronGeometry(2.6,1),'#4b8a35',M4(0,4.4,0,1.2,.9,1.2)],[new T.IcosahedronGeometry(1.6,1),'#55963c',M4(1.4,5,.6)],[new T.IcosahedronGeometry(1.5,1),'#447f30',M4(-1.3,4.8,-.5)]]);
  /* bergen */
  G.vangrail=partsGeo([[new T.BoxGeometry(.12,.75,.12),'#8d949b',M4(0,.37,0)],[new T.BoxGeometry(.06,.32,4.1),'#c3c8cd',M4(.08,.6,2)]]);
  G.kmsteen=partsGeo([[new T.BoxGeometry(.4,.7,.25),'#f0ede6',M4(0,.35,0)],[new T.BoxGeometry(.42,.22,.27),'#c8392e',M4(0,.78,0)]]);
  G.rotsblok=partsGeo([[new T.DodecahedronGeometry(1.6,0),'#8a847d',M4(0,1,0,1,1.3,1.1)],[new T.DodecahedronGeometry(1.1,0),'#7d776f',M4(1.2,.6,.6)],[new T.DodecahedronGeometry(.9,0),'#968f88',M4(-1,.4,-.7)]]);
  /* meer */
  G.steiger=partsGeo([[new T.BoxGeometry(2,.12,16),'#9a7a55',M4(0,.6,-8)],...[0,1,2,3,4].map(i=>[new T.CylinderGeometry(.1,.1,2.4,5),'#6b5238',M4(-.9,-.2,-i*4)]),...[0,1,2,3,4].map(i=>[new T.CylinderGeometry(.1,.1,2.4,5),'#6b5238',M4(.9,-.2,-i*4)])]);
  G.zwaan=partsGeo([[new T.IcosahedronGeometry(.3,1),'#fafafa',M4(0,.15,0,1,.6,1.6)],[new T.CylinderGeometry(.05,.06,.5,5),'#fafafa',M4(0,.45,.35)],[new T.BoxGeometry(.06,.06,.15),'#f08a24',M4(0,.68,.45)]]);
  G.parasol=partsGeo([[new T.CylinderGeometry(.03,.03,2.2,5),'#ddd',M4(0,1.1,0)],[new T.ConeGeometry(1.3,.6,8),'#e04848',M4(0,2.2,0)]]);

  G.struik=partsGeo([[new T.IcosahedronGeometry(.8,0),'#3f7d34',M4(0,.5,0)],[new T.IcosahedronGeometry(.6,0),'#4d8f3d',M4(.5,.45,.2)],[new T.IcosahedronGeometry(.5,0),'#468638',M4(-.4,.4,-.2)]]);
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
/* blauw plaatsnaambord; bij het verlaten van het dorp met een rode streep */
function makePlace(name,out){
  const T=T3,g=new T.Group(),post=new T.Mesh(new T.CylinderGeometry(.05,.05,2.3,6),new T.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.15;g.add(post);
  const tex=canvasTex(256,96,(c,w,h)=>{c.fillStyle='#1d4f9c';c.fillRect(0,0,w,h);c.strokeStyle='#fff';c.lineWidth=6;c.strokeRect(6,6,w-12,h-12);c.fillStyle='#fff';c.font='bold 34px Figtree, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(name,w/2,h/2+2);
    if(out){c.strokeStyle='#d62828';c.lineWidth=9;c.beginPath();c.moveTo(14,h-12);c.lineTo(w-14,12);c.stroke()}});
  const b=new T.Mesh(new T.PlaneGeometry(1.8,.68),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));b.position.y=2.45;g.add(b);return g;
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
    c.lineWidth=12;c.strokeStyle='#d62828';c.lineJoin='round';c.stroke();c.fillStyle='#111';c.font='bold 34px Figtree, system-ui, sans-serif';c.textAlign='center';c.fillText(pct+'%',64,96)});
  const b=new T.Mesh(new T.PlaneGeometry(1.1,1.1),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide}));b.position.y=2.5;g.add(b);
  return g;
}
/* fietser met benen die met de cadans meedraaien; vooruit = -z */
function makeRider(jersey,ghost,frame){
  const T=T3,o={transparent:!!ghost,opacity:ghost?.62:1};
  const mt=(c,flat)=>new T.MeshLambertMaterial(Object.assign({color:c,flatShading:!!flat},o));
  const J=mt(jersey),K=mt('#1d222b'),S=mt('#e3a98a'),F=mt(frame||'#2a2f38'),Bk=mt('#15181d'),Rim=mt('#9aa1a9'),Wt=mt('#f2f2f2'),H=mt(ghost?jersey:'#f4f4f4');
  const g=new T.Group(),add=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  const spokes=(()=>{const parts=[];for(let i=0;i<12;i++){const m=new T.Matrix4().makeRotationX(i*Math.PI/6);m.multiply(new T.Matrix4().makeTranslation(0,.155,0));parts.push([new T.CylinderGeometry(.004,.004,.31,3),'#c8ccd2',m])}return partsGeo(parts)})();
  const wheel=z=>{const w=new T.Group();w.position.set(0,.34,z);
    const t=new T.Mesh(new T.TorusGeometry(.322,.022,6,28),Bk);t.rotation.y=Math.PI/2;w.add(t);
    const rim=new T.Mesh(new T.TorusGeometry(.3,.012,4,28),Rim);rim.rotation.y=Math.PI/2;w.add(rim);
    w.add(new T.Mesh(spokes,new T.MeshLambertMaterial(Object.assign({vertexColors:true},o))));
    const hub=new T.Mesh(new T.CylinderGeometry(.025,.025,.08,8),Rim);hub.rotation.z=Math.PI/2;w.add(hub);
    g.add(w);return w};
  const wr=wheel(.5),wf=wheel(-.52);
  const limb=(mat,r,len)=>{const m=new T.Mesh(len?new T.CapsuleGeometry(r,len-2*r,4,10):new T.CylinderGeometry(r,r*.85,1,8),mat);m.userData.len=len||0;g.add(m);return m};
  /* frame, voorvork, stuur en zadel */
  const tube=[[0,.34,.5,0,.3,.02],[0,.3,.02,0,.93,.12],[0,.93,.12,0,.96,-.4],[0,.3,.02,0,.96,-.4],[0,.34,.5,0,.93,.12],[0,.98,-.42,0,.34,-.52],[0,.96,-.4,0,1.01,-.47]];
  for(const t of tube)setLimb(limb(F,.02),t.slice(0,3),t.slice(3));
  setLimb(limb(Bk,.016),[-.2,1.01,-.47],[.2,1.01,-.47]);
  for(const x of[-.2,.2]){setLimb(limb(Bk,.014),[x,1.01,-.47],[x,1.0,-.56]);setLimb(limb(Bk,.014),[x,1.0,-.56],[x,.9,-.52])}
  const sad=add(new T.BoxGeometry(.11,.035,.27),Bk,0,.965,.15);sad.scale.x=.9;
  const ring=add(new T.CylinderGeometry(.1,.1,.012,18),Rim,.04,.3,.02);ring.rotation.z=Math.PI/2;
  /* lichaam */
  const torso=limb(J,.13,.55),neck=limb(S,.045),head=add(new T.SphereGeometry(.1,12,10),S,0,0,0);
  const helm=add(new T.SphereGeometry(.125,12,8,0,Math.PI*2,0,Math.PI/2),H,0,0,0);helm.scale.set(1,.9,1.3);
  const glas=add(new T.BoxGeometry(.17,.04,.03),Bk,0,0,0);
  const arms=[-1,1].map(s=>({s,up:limb(J,.048,.27),lo:limb(S,.036,.26)}));
  const legs=[-.095,.095].map(x=>({x,th:limb(K,.07,.47),sh:limb(S,.048,.4),sock:limb(Wt,.04),ft:add(new T.BoxGeometry(.085,.07,.26),Bk,0,0,0),cr:limb(Rim,.012)}));
  return {g,legs,arms,torso,neck,head,helm,glas,wr,wf,a:Math.random()*6,stand:0};
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
  R.stand+=((stand?1:0)-R.stand)*Math.min(1,dt*3);const st=R.stand;
  R.a+=cad/60*Math.PI*2*dt;const rot=spd*dt/.34;R.wr.rotation.x-=rot;R.wf.rotation.x-=rot;
  const BB=[0,.3,.02],sway=Math.sin(R.a)*st;
  const hip=[sway*.05,.99+st*.12,.15-st*.24],sh=[sway*.03,1.28+st*.06,-.33-st*.1];
  setLimb(R.torso,hip,sh);R.torso.scale.x=1.15;
  const hd=[sh[0],sh[1]+.12,sh[2]-.09];setLimb(R.neck,sh,hd);
  R.head.position.set(hd[0],hd[1]+.04,hd[2]-.03);R.helm.position.set(hd[0],hd[1]+.05,hd[2]-.02);R.glas.position.set(hd[0],hd[1]+.04,hd[2]-.125);
  for(const A of R.arms){const s=[sh[0]+A.s*.16,sh[1]-.03,sh[2]],hand=[A.s*.2,1.0,-.52],el=joint(s,hand,.27,.26,[A.s*.5,-.3,.5]);setLimb(A.up,s,el);setLimb(A.lo,el,hand)}
  R.legs.forEach((l,i)=>{
    const a=R.a+i*Math.PI,p=[l.x,BB[1]+.17*Math.cos(a),BB[2]-.17*Math.sin(a)],hp=[hip[0]+l.x,hip[1],hip[2]];
    const knee=joint(hp,p,.45,.44,[0,0,-1]),ank=[p[0],p[1]+.07,p[2]+.02];
    setLimb(l.th,hp,knee);setLimb(l.sh,knee,ank);setLimb(l.sock,[ank[0],ank[1]+.08,ank[2]],ank);setLimb(l.cr,[l.x*.6,BB[1],BB[2]],p);
    l.ft.position.set(l.x,p[1]+.01,p[2]-.03);
  });
  R.g.rotation.z+=sway*.1;
}

/* ---------- wereld opbouwen ---------- */
/* licht en weer: past bij het tijdstip van de rit, af en toe bewolkt of een bui */
function pickMood(){
  const t=new Date(),h=t.getHours()+t.getMinutes()/60,u=rng(Math.floor(Date.now()/36e5)*7+3)();
  const m={top:'#3f86cc',hor:'#c8dcec',sun:'#ffe2b8',si:3.2,hemi:1.5,sky:'#dceaff',gr:'#4d5a32',dir:[-70,75,-120],disc:'#fff6d8',exp:1.25,ring:['#a9bfd2','#93abc0'],fog:[35,240],rain:false,disc_on:true,cloud:'#ffffff',name:'dag'};
  if(h>=5&&h<9.5)Object.assign(m,{top:'#5b8fc6',hor:'#f2dcc2',sun:'#ffcf96',si:2.9,hemi:1.3,dir:[-60,32,-140],disc:'#ffe2b0',ring:['#c4b9c4','#a9a9bd'],name:'ochtend'});
  else if(h>=18&&h<21.5)Object.assign(m,{top:'#3b5d98',hor:'#f6b788',sun:'#ffad6a',si:2.7,hemi:1.15,sky:'#ffd9b8',dir:[-60,20,-150],disc:'#ffb36b',ring:['#b79aa6','#8f7f99'],exp:1.3,cloud:'#ffd9c0',name:'avond'});
  else if(h>=21.5||h<5)Object.assign(m,{top:'#18264a',hor:'#5f6688',sun:'#b9c4ff',si:1.2,hemi:.85,sky:'#9aa8d8',gr:'#2a3024',dir:[-40,60,-120],ring:['#4a5070','#3a4060'],exp:1.45,disc_on:false,cloud:'#8890a8',name:'schemer'});
  if(m.name!=='schemer'&&u<.22){Object.assign(m,{top:'#8e9aa6',hor:'#c9ced3',si:m.si*.35,hemi:2.1,sky:'#e6ecf2',disc_on:false,ring:['#aeb6bf','#9aa3ad'],fog:[25,190],cloud:'#d5d9de',name:'bewolkt'});
    if(u<.08)Object.assign(m,{top:'#7d8792',hor:'#aeb4ba',fog:[20,150],rain:true,cloud:'#b8bdc3',name:'regen'})}
  return m;
}
async function worldOpen(){
  if(W){W.el.hidden=false;return}
  W={loading:true};
  try{T3=T3||await import(THREE_URL)}catch(e){W=null;setView3d(false);toast('De 3D-weergave kon niet laden. Je ziet nu de cijfers.');return renderPlayer()}
  if(!P){W=null;return}
  const T=T3,el=document.createElement('div');el.id='world';document.body.appendChild(el);
  let ren;try{ren=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}catch(e){el.remove();W=null;setView3d(false);toast('Deze browser kan geen 3D tonen. Je ziet nu de cijfers.');return renderPlayer()}
  const small=Math.min(innerWidth,innerHeight)<600,MO=pickMood();
  ren.setPixelRatio(Math.min(devicePixelRatio||1,small?1.25:1.5));ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=MO.exp;ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;el.appendChild(ren.domElement);
  const scene=new T.Scene();scene.background=new T.Color(MO.hor);scene.fog=new T.Fog(MO.hor,MO.fog[0],MO.fog[1]);
  scene.add(new T.HemisphereLight(MO.sky,MO.gr,MO.hemi));
  const sun=new T.DirectionalLight(MO.sun,MO.si);sun.castShadow=true;sun.shadow.mapSize.set(small?1024:2048,small?1024:2048);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:260});sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
  scene.add(sun,sun.target);
  const cam=new T.PerspectiveCamera(60,1,.3,2200);
  /* lucht: van diepblauw boven naar licht aan de horizon, met bergen in de verte die met je meereizen */
  const skyG=new T.SphereGeometry(1800,24,12),sc=[],ct=new T.Color(MO.top),ch=new T.Color(MO.hor),tc=new T.Color();
  for(let i=0;i<skyG.attributes.position.count;i++){const y=skyG.attributes.position.getY(i)/1800;tc.copy(ch).lerp(ct,clamp(y*1.6,0,1));sc.push(tc.r,tc.g,tc.b)}
  skyG.setAttribute('color',new T.Float32BufferAttribute(sc,3));
  const sky=new T.Mesh(skyG,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,fog:false,depthWrite:false}));sky.renderOrder=-2;scene.add(sky);
  const ring=new T.Group(),r=rng(11);
  for(const [R,col,hm] of[[1500,MO.ring[0],260],[1250,MO.ring[1],170]]){
    const pos=[],M=72;for(let i=0;i<=M;i++){const a=i/M*Math.PI*2,hh=hm*(.35+.65*Math.abs(Math.sin(i*1.7+R)*.6+Math.sin(i*.53+R)*.4))*(0.6+r()*.4);
      pos.push(Math.cos(a)*R,-60,Math.sin(a)*R,Math.cos(a)*R,hh,Math.sin(a)*R)}
    const idx=[];for(let i=0;i<M;i++)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);
    const m=new T.Mesh(g,new T.MeshBasicMaterial({color:col,fog:false,side:T.DoubleSide,depthWrite:false}));m.renderOrder=-1;ring.add(m)}
  scene.add(ring);
  const glow=canvasTex(256,256,(c,w,h)=>{const g=c.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,'rgba(255,252,235,1)');g.addColorStop(.12,'rgba(255,246,215,1)');g.addColorStop(.22,'rgba(255,230,180,.45)');g.addColorStop(1,'rgba(255,220,170,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
  const sunDisc=new T.Sprite(new T.SpriteMaterial({map:glow,color:MO.disc,fog:false,depthWrite:false,transparent:true,toneMapped:false}));sunDisc.scale.set(520,520,1);sunDisc.renderOrder=-1;sunDisc.visible=MO.disc_on;scene.add(sunDisc);
  /* regen: strepen rond de camera */
  let rain=null;if(MO.rain){const n=small?700:1400,pos=new Float32Array(n*6);for(let i=0;i<n;i++){const x=(Math.random()-.5)*50,y=Math.random()*25,z=(Math.random()-.5)*50;pos.set([x,y,z,x+.05,y+.7,z],i*6)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));rain=new T.LineSegments(g,new T.LineBasicMaterial({color:'#c9d3dc',transparent:true,opacity:.45}));rain.frustumCulled=false;scene.add(rain)}
  W={el,ren,scene,cam,sun,sky,ring,sunDisc,mood:MO,rain,lite:small,wind:{value:0},G:propGeos(),root:null,C:null,total:-1,me:makeRider('#FF6A2B',false),pace:makeRider('#3D8BD4',true),vs:0,
     npcs:[['#E04848','#f2f2f2'],['#2EAA6E','#1d222b'],['#F4D03F','#1d222b'],['#9B5DE5','#f2f2f2'],['#f2f2f2','#c22']].slice(0,small?3:5).map(([j,f])=>({R:makeRider(j,false,f),d:null,f:1,off:2.25,cad:82+Math.random()*14})),
     disp:0,extra:0,gap:2,last:performance.now(),camP:null,mills:[],raf:0,tex:worldTextures()};
  for(const R of[W.me,W.pace,...W.npcs.map(n=>n.R)]){R.g.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(R.g)}
  const fit=()=>{const w=innerWidth,h=innerHeight;ren.setSize(w,h);cam.aspect=w/h;cam.fov=w<h?72:58;cam.setViewOffset(w,h,0,Math.round(h*(w<h?.12:.2)),w,h);cam.updateProjectionMatrix()};
  W.fit=fit;addEventListener('resize',fit);fit();
  worldBuild();
  /* eerst een paar kilometer klaarzetten, met een laadbalk; de rest volgt tijdens het fietsen */
  const bar=()=>document.getElementById('p-load'),n=6;
  for(let ci=0;ci<n;ci++){if(!W||!P)return;buildChunk(ci);const b=bar();if(b){b.hidden=false;b.querySelector('i').style.width=Math.round((ci+1)/n*100)+'%'}await new Promise(r=>setTimeout(r,0))}
  const b=bar();if(b)b.hidden=true;W.ready=true;
  if(P.wo.type==='demo'&&P.mode==='ready'){P.speed=6;startRide(true)}
  W.raf=requestAnimationFrame(worldFrame);
}
/* fijne korrel op asfalt en gras, zodat vlakken niet egaal ogen */
function worldTextures(){
  const T=T3,noise=(n,base,spread,dots)=>canvasTex(n,n,(c,w,h)=>{c.fillStyle=base;c.fillRect(0,0,w,h);
    for(let i=0;i<dots;i++){const v=Math.round(128+(Math.random()-.5)*spread);c.fillStyle=`rgba(${v},${v},${v},.35)`;c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}});
  const gras=noise(128,'#ffffff',120,2600);
  const asf=canvasTex(256,512,(c,w,h)=>{c.fillStyle='#62666c';c.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){const v=Math.round(100+Math.random()*60);c.fillStyle=`rgba(${v},${v},${v+4},.4)`;c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}
    c.fillStyle='rgba(30,32,36,.1)';for(const x of[.22,.66])c.fillRect(x*w,0,.12*w,h);
    for(let i=0;i<3;i++){c.fillStyle=Math.random()<.5?'rgba(45,47,52,.22)':'rgba(150,150,150,.12)';c.fillRect(Math.random()*w*.8,Math.random()*h,15+Math.random()*50,20+Math.random()*60)}
    c.strokeStyle='rgba(30,30,34,.3)';c.lineWidth=.8;for(let i=0;i<4;i++){let x=Math.random()*w,y=Math.random()*h;c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=(Math.random()-.5)*30;y+=Math.random()*25;c.lineTo(x,y)}c.stroke()}});
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
  for(let k=0;k<C.N;k+=3){const key=Math.floor(C.X[k]/cell)*100003+Math.floor(C.Z[k]/cell);let a=m.get(key);if(!a)m.set(key,a=[]);a.push(k)}
  C.hash=m;C.cell=cell;
}
function intrudes(C,d,x,z,ao){
  const c=C.cell,r=Math.ceil(ao/c),cx=Math.floor(x/c),cz=Math.floor(z/c),lim=ao*ao*.9;
  for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){const a=C.hash.get((cx+i)*100003+cz+j);if(!a)continue;
    for(const k of a){if(Math.abs(k*STEP-d)<20)continue;const dx=C.X[k]-x,dz=C.Z[k]-z;if(dx*dx+dz*dz<lim)return k}}
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
  const C=buildCourse(),root=new T.Group();roadHash(C);W.C=C;W.root=root;W.total=P.total;W.segN=P.wo.segs.length;W.mills=[];W.chunks=new Map();
  if(!W.mat){const tree=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
    const crowd=new T.MeshLambertMaterial({vertexColors:true});
    crowd.onBeforeCompile=sh=>{sh.uniforms.uT=W.wind;sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);transformed.y+=max(0.,sin(uT*7.+ip.x*1.7+ip.z*.9))*.16;')};
    tree.onBeforeCompile=sh=>{sh.uniforms.uT=W.wind;sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sw=max(0.,position.y-.8)*.035;vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);transformed.x+=sin(uT*1.6+ip.x*.15+ip.z*.1)*sw;transformed.z+=cos(uT*1.3+ip.z*.15)*sw*.6;')};
    W.mat={tree,crowd,blob:new T.MeshBasicMaterial({color:'#000',transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),
    lam:new T.MeshLambertMaterial({vertexColors:true,map:W.tex.gras}),asf:new T.MeshLambertMaterial({map:W.tex.asf}),line:new T.MeshLambertMaterial({color:'#f2f0e8'}),
    water:new T.MeshLambertMaterial({color:'#4b97c5',transparent:true,opacity:.9,side:T.DoubleSide}),inst:new T.MeshLambertMaterial({vertexColors:true,flatShading:true}),
    wolk:new T.MeshBasicMaterial({vertexColors:true,color:W.mood.cloud,transparent:true,opacity:.9,fog:false})};if(W.mood.rain)W.mat.asf.color.setScalar(.72)}
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
  if(W.ready){const c=Math.floor((W.lastD||0)/CH);for(let ci=Math.max(0,c-1);ci<=c+2;ci++)buildChunk(ci)}
}
/* De wereld wordt per kilometer opgebouwd: alleen de stukken rond de fietser staan klaar. */
const CH=1000,DS=8;
function dropChunk(ci){
  const g=W.chunks.get(ci);if(!g)return;W.chunks.delete(ci);W.root.remove(g);
  const keep=new Set(Object.values(W.mat));
  g.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.sails)W.mills=W.mills.filter(s=>s!==o.userData.sails);if(o.geometry&&!o.userData.shared)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{if(!keep.has(m))m.dispose()})});
}
function buildChunk(ci){
  const T=T3,C=W.C,M=W.mat,a=ci*CH;if(a>=C.L||W.chunks.has(ci))return;
  const g=new T.Group(),r=rng(C.seed+ci*7919+3);
  const geo=(pos,idx,col,uv)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(col)g.setAttribute('color',new T.Float32BufferAttribute(col,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g};
  const lam=M.lam;
  const OFF=[-95,-78,-64,-53,-44,-36,-29,-23,-18,-14,-10.5,-7.5,-5.6,-4.4,4.4,5.6,7.5,10.5,14,18,23,29,36,44,53,64,78,95];
  const grass={polder:new T.Color('#7db04c'),heuvels:new T.Color('#69a243'),bergen:new T.Color('#5c8e46'),meer:new T.Color('#77ab55')};
  const FIELD=['#8fbf55','#a9c75c','#cdbb68','#857252','#6fa548','#b8cc6c','#9bbd4f'].map(c=>new T.Color(c)),rock=new T.Color('#8f8a86'),snow=new T.Color('#f3f5f8'),sand=new T.Color('#d8c99a'),berm=new T.Color('#9a9a7a'),pave=new T.Color('#b4aa9c'),tmp=new T.Color();
    const rows=Math.ceil(Math.min(CH,C.L-a)/DS)+1,pos=[],col=[],uv=[],idx=[];
    for(let j=0;j<rows;j++){
      const d=Math.min(C.L-1,a+j*DS),p=roadAt(C,d),mix=landMix(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      const bnd={'-1':clipOff(C,d,p,innerOff(-95,p.k)),'1':clipOff(C,d,p,innerOff(95,p.k))};
      for(const off0 of OFF){
        const [b,kb]=bnd[Math.sign(off0)],o1=innerOff(off0,p.k),off=Math.abs(o1)>Math.abs(b)?b:o1;
        let y=landH(C,d,off,mix,p.y);
        if(kb>=0){const t=Math.pow(Math.abs(off/b),2),mid=(p.y+C.Y[kb])/2+nz(d,off)*2;y=y*(1-t)+mid*t}
        const wx=p.x+nx*off,wz=p.z+nzv*off;pos.push(wx,y,wz);uv.push(wx/14,wz/14);
        tmp.setRGB(0,0,0);for(const k in mix)if(mix[k])tmp.r+=grass[k].r*mix[k],tmp.g+=grass[k].g*mix[k],tmp.b+=grass[k].b*mix[k];
        const ao=Math.abs(off);
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
    /* weg: asfalt met kantstrepen en middenstreep */
    const ap=[],au=[],ai=[],lp=[],li=[],RS=4,rr=Math.ceil(Math.min(CH,C.L-a)/RS)+1;
    for(let j=0;j<rr;j++){const d=Math.min(C.L-1,a+j*RS),p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const off of[-4.6,-3.2,3.2,4.6]){ap.push(p.x+nx*off,p.y+(Math.abs(off)>4?-.06:0),p.z+nzv*off);au.push((off+3.2)/6.4,d/12)}
      if(j<rr-1){const q=j*4;for(let i=0;i<3;i++)ai.push(q+i,q+i+1,q+i+4,q+i+1,q+i+5,q+i+4)}
      const line=(o,w)=>{const n=lp.length/3;for(const pp of[p,roadAt(C,d+RS)])for(const s of[-w,w])lp.push(pp.x+Math.cos(pp.h)*(o+s),pp.y+.025,pp.z+Math.sin(pp.h)*(o+s));li.push(n,n+1,n+2,n+1,n+3,n+2)};
      if(j<rr-1){line(-2.95,.07);line(2.95,.07);if(j%3===0)line(0,.06)}}
    const am=new T.Mesh(geo(ap,ai,null,au),M.asf);am.receiveShadow=true;g.add(am);
    const lm=new T.Mesh(geo(lp,li),M.line);lm.receiveShadow=true;g.add(lm);
  /* water bij het meer */
  for(const zn of C.zones)if(zn.ty==='meer'&&zn.b+60>a&&zn.a-60<a+CH){
    const pos=[],idx=[];let j=0;
    for(let d=Math.max(a,zn.a-60);d<=Math.min(C.L-1,zn.b+60,a+CH);d+=16,j++){const p=roadAt(C,d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
      for(const o0 of[-20,-420]){const o=clipOff(C,d,p,innerOff(o0,p.k))[0];pos.push(p.x+nx*o,p.y-1.9,p.z+nzv*o)}
      if(j)idx.push((j-1)*2,(j-1)*2+1,j*2,(j-1)*2+1,j*2+1,j*2)}
    if(idx.length)g.add(new T.Mesh(geo(pos,idx),M.water));
  }
  /* kanalen met een brug */
  const lists={};const put=(k,x,y,z,s,ry,col,sy,tl)=>{if(W.lite&&(k==='pol'||k==='bloem'||k==='struik'||k==='mens2')&&r()<.45)return;(lists[k]=lists[k]||[]).push([x,y,z,s,ry,col,sy,tl])};
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
  const tree=(k,x,y,z,s)=>{put(k,x,y,z,s,r()*6,tint(),s*(.85+r()*.35),(r()-.5)*.08);put('blob',x,y+.05,z,s*(BLOB[k]||2.2),0)};
  const face=(h,s)=>s>0?Math.atan2(-Math.cos(h),-Math.sin(h)):Math.atan2(Math.cos(h),Math.sin(h));
  let fence=0,wall=0,rail=0;
  for(let d=Math.max(20,a);d<Math.min(C.L-20,a+CH);d+=7){
    const p=roadAt(C,d),mix=landMix(C,d),zn=zoneAt(C,d),ty=zn.ty,nx=Math.cos(p.h),nzv=Math.sin(p.h),vw=villageW(C,d),vil=vw>.15;
    const at=o=>{const [oo,ko]=clipOff(C,d,p,innerOff(o,p.k));if(ko>=0)return [0,0,0,true];return [p.x+nx*oo,landH(C,d,oo,mix,p.y),p.z+nzv*oo,Math.abs(oo-o)>2]};
    const sd=Math.sign(Math.sin(d/1300+C.ph))||1;
    if(!vil&&d%42<7&&!nearCanal(d)&&!(ty==='bergen'&&rail>0))for(const o of[-4.9,4.9]){const [x,y,z,cl]=at(o);if(!cl)put('paal',x,y,z,1,-p.h)}
    /* hekken, stenen muurtjes en heggen langs de weg */
    if(!vil&&ty!=='bergen'){
      if(fence<=0&&wall<=0&&r()<.035){if(ty==='heuvels'&&r()<.6)wall=15+r()*25;else fence=15+r()*30}
      const sideF=ty==='meer'?1:(Math.floor(d/300)%2?1:-1);
      if(fence>0){fence--;const [x,y,z,cl]=at(sideF*7);if(!cl)put('hek',x,y,z,1,-p.h+Math.PI)}
      if(wall>0){wall--;for(const s2 of[-1,1]){const [x,y,z,cl]=at(s2*6.3);if(!cl)put(r()<.3&&ty==='heuvels'?'heg':'muur',x,y,z,1,-p.h+Math.PI,tint(.1,.02),1+(r()-.5)*.2)}}
    }
    /* vangrail aan de dalkant in de bergen, rotsblokken aan de bergkant */
    if(ty==='bergen'&&!vil){
      if(rail<=0&&r()<.06)rail=25+r()*40;
      if(rail>0){rail--;const [x,y,z,cl]=at(-sd*5.1);if(!cl)put('vangrail',x,y,z,1,-p.h+Math.PI)}
      if(r()<.35){const [x,y,z,cl]=at(sd*(7+r()*4));if(!cl)put('rotsblok',x,y-.6,z,.8+r()*1.4,r()*6,tint(.15,0),1+r()*1.2)}
      if(d%500<7){const [x,y,z,cl]=at(5.2);if(!cl)put('kmsteen',x,y,z,1,-p.h)}
    }
    /* publiek langs steile klimmen */
    if(!vil&&(ty==='bergen'||ty==='heuvels')&&(roadAt(C,d+10).y-p.y)/10>.05)for(const side of[-1,1])for(let i=0;i<3;i++){if(r()>.55)continue;
      const o=side*(5.4+r()*2.4),dd=d+r()*7,q=roadAt(C,dd),[o2,ko]=clipOff(C,dd,q,innerOff(o,q.k));if(ko>=0)continue;
      const x=q.x+Math.cos(q.h)*o2,z=q.z+Math.sin(q.h)*o2,y=landH(C,dd,o2,mix,q.y),ry=face(q.h,side)+(r()-.5)*.8,col=new T.Color().setHSL(r(),.55+r()*.3,.35+r()*.3),sc=.9+r()*.2;
      put(r()<.6?'mens':'mens2',x,y,z,sc,ry,col);put('hoofd',x,y,z,sc,ry);if(r()<.18)put('vlag',x,y,z,sc,ry,new T.Color().setHSL(r(),.8,.5))}
    /* bosrand of bomenrij achter de weg: dit sluit het beeld af */
    for(const side of[-1,1]){
      if(ty==='meer'&&side<0)continue;
      const rowOff=ty==='polder'?42+r()*6:30+r()*12,dense=ty==='polder'?.7:1;
      for(let i=0;i<(ty==='polder'?1:3);i++){if(r()>dense)continue;const o=side*(rowOff+i*9+r()*6),[x,y,z,cl]=at(o);if(cl)continue;
        const u=r(),k=ty==='bergen'?(u<.85?'den':'berk'):ty==='polder'?(u<.5?'populier':u<.8?'boom':'eik'):(u<.3?'den':u<.5?'eik':u<.62?'berk':'boom');tree(k,x,y,z,(ty==='polder'?1:1.05)+r()*.5)}
    }
    if(vil)continue;
    /* tussen weg en bosrand: weiden, akkers, losse bomen */
    for(const side of[-1,1]){
      if(r()>.5)continue;
      const off=side*(9+r()*26),[x,y,z,cl]=at(off),u=r();if(cl)continue;
      if(ty==='meer'&&off<-18){if(u<.08)put('boot',p.x+nx*side*(40+r()*80),p.y-1.9,p.z+nzv*side*(40+r()*80),1,r()*6);else if(u<.14)put('zwaan',p.x+nx*side*(24+r()*30),p.y-1.85,p.z+nzv*side*(24+r()*30),1,r()*6);else if(off>-30&&u<.6)put('riet',x,y,z,.8+r()*.6,r()*6);continue}
      if(ty==='polder'){if(u<.07)put('koe',x,y,z,1,r()*6,tint(.25,.05));else if(u<.13)put('schaap',x,y,z,1,r()*6);else if(u<.16)put('baal',x,y,z,1,r()*6);else if(u<.22&&!nearCanal(d))tree('boom',x,y,z,.7+r()*.4)}
      else if(ty==='heuvels'){if(u<.2)tree(u<.06?'eik':'boom',x,y,z,.7+r()*.5);else if(u<.25)put('koe',x,y,z,1,r()*6,tint(.25,.05));else if(u<.32)put('schaap',x,y,z,1,r()*6);else if(u<.35)put('baal',x,y,z,1,r()*6)}
      else if(ty==='bergen'){if(u<.3)tree('den',x,y,z,.7+r()*.6);else if(u<.45)put('rots',x,y,z,.5+r()*1.2,r()*6,tint(.2,0));else if(u<.5)put('koe',x,y,z,1,r()*6,new T.Color(.8,.6,.45))}
      else if(u<.2)tree('boom',x,y,z,.7+r()*.5);
    }
    /* knotwilgen langs de sloot in de polder */
    if(ty==='polder'&&!nearCanal(d)&&Math.floor(d/250)%3===0)for(const side of[-1,1]){if(r()<.75){const [x,y,z,cl]=at(side*(12.5+r()));if(!cl)tree('knotwilg',x,y-.3,z,.85+r()*.3)}}
    /* boerderij met erf, schuur, silo en trekker */
    if((ty==='polder'||ty==='heuvels')&&d%650<7&&r()<.75){const side=r()<.5?-1:1,o=side*(19+r()*6),[x,y,z,cl]=at(o);
      if(!cl){put('erf',x,y+.06,z,13,0);put('boerderij',x,y,z,1,face(p.h,side),tint(.1,.02));put('blob',x,y+.07,z,10,0);
        const [x2,y2,z2,c2]=at(o+side*14);if(!c2){put('schuur',x2,y2,z2,1,face(p.h,side)+Math.PI/2);put('silo',x2+nzv*8,y2,z2-nx*8,1,0)}
        put('trekker',x-nzv*9,y,z+nx*9,1,r()*6);tree('eik',x+nzv*12,y,z-nx*12,1.1)}}
    /* buurtschap: een paar huizen vlak langs de weg */
    if((ty==='polder'||ty==='heuvels'||ty==='bergen')&&d%800<7&&r()<.65){const side=r()<.5?-1:1,n=2+Math.floor(r()*3),list=ty==='bergen'?['chalet','wit']:['rood','wit','geel'];
      for(let i=0;i<n;i++){const dd=d+i*(11+r()*6),q=roadAt(C,dd),k=list[Math.floor(r()*list.length)],oo=side*(11+r()*4),[x,y,z,cl]=(()=>{const [o2,ko]=clipOff(C,dd,q,innerOff(oo,q.k));return ko>=0?[0,0,0,true]:[q.x+Math.cos(q.h)*o2,landH(C,dd,o2,landMix(C,dd),q.y),q.z+Math.sin(q.h)*o2,false]})();
        if(cl)continue;put('erf',x,y+.05,z,6,0);put(k,x,y,z,1,face(q.h,side),tint(.22,.08));put('blob',x,y+.07,z,5,0);if(r()<.5)tree(r()<.5?'eik':'berk',x+Math.cos(q.h)*side*-0+Math.sin(q.h)*7,y,z-Math.cos(q.h)*7,.9)}}
    /* boomgaard en kapelletje in de heuvels */
    if(ty==='heuvels'&&d%900<7&&r()<.7){const side=r()<.5?-1:1;for(let i=0;i<5;i++)for(let j=0;j<4;j++){const dd=d+i*6,oo=side*(13+j*5.5),q=roadAt(C,dd),y=landH(C,dd,oo,mix,q.y);
      tree('fruitboom',q.x+Math.cos(q.h)*oo,y,q.z+Math.sin(q.h)*oo,.8+r()*.3)}}
    if(ty==='heuvels'&&d%1300<7){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*7.5);if(!cl){put('kapel',x,y,z,1,face(p.h,side));tree('eik',x+nzv*5,y,z-nx*5,1)}}
    /* steiger met bootjes en een strandje bij het meer */
    if(ty==='meer'&&d%700<7){const [x,y,z]=at(-19);put('steiger',x,p.y-1.9,z,1,face(p.h,1)+Math.PI);put('boot',x+Math.cos(p.h)*-10+nzv*3,p.y-1.9,z+Math.sin(p.h)*-10-nx*3,1,-p.h)}
    if(ty==='meer'&&d%500<7)for(let i=0;i<3;i++){const [x,y,z]=at(-21-r()*6);put('parasol',x+nzv*(i*5),y,z-nx*(i*5),1,0,new T.Color().setHSL(r(),.6,.6))}
    if(ty==='polder'&&d%900<7&&r()<.85){const side=r()<.5?-1:1,[x,y,z,cl]=at(side*(28+r()*10));if(!cl){const m=makeMill();m.position.set(x,y,z);m.rotation.y=-p.h;g.add(m);W.mills.push(m.userData.sails);put('blob',x,y+.05,z,5,0)}}
    /* rafelige wegrand en bermen: graspollen, bloemen en struiken */
    for(const side of[-1,1]){
      for(let i=0;i<3;i++){const o=side*(4.7+r()*1.2),[x,y,z,cl]=at(o);if(!cl&&r()<.8)put('pol',x,y,z,.5+r()*.6,r()*6,tint(.2,.06))}
      for(let i=0;i<2;i++){const u=r();if(u>.8)continue;const o=side*(6+r()*22),[x,y,z,cl]=at(o);if(cl||(ty==='meer'&&o<-17))continue;
        if(u<.35)put('pol',x,y,z,.7+r()*.6,r()*6,tint(.2,.06));else if(u<.6&&mix.bergen<.5)put('bloem',x,y,z,.8+r()*.5,r()*6);else{put('struik',x,y,z,.6+r()*.7,r()*6,tint());put('blob',x,y+.05,z,1.4,0)}}
    }
    if(d%160<7&&r()<.4){const off=(r()-.5)*900;put('wolk',p.x+nx*off,p.y+120+r()*70,p.z+nzv*off,1+r(),r()*6)}
  }
  /* dorpen: huizen aan beide kanten van de weg, stoep, lantaarns, kerk, bushokje en plaatsnaamborden */
  const HUIS={polder:['rood','wit','rood','geel','rij','wit'],heuvels:['wit','rood','geel','wit','rij'],meer:['wit','geel','rood','wit'],bergen:['chalet','chalet','wit','chalet']},W2={rood:6,wit:5.4,geel:8,rij:15,winkel:8,chalet:8},D2={rood:8,wit:7,geel:9,rij:8,winkel:10,chalet:9};
  for(const v of C.villages){
    const v0=v.d-v.len/2,v1=v.d+v.len/2;if(v1<a||v0>=a+CH)continue;
    for(const side of[-1,1]){
      let dd=Math.max(v0,a)+r()*4;const kerkSide=side===(Math.floor(v.d)%2?1:-1);
      while(dd<Math.min(v1,a+CH)){
        const q=roadAt(C,dd),mix=landMix(C,dd),nearC=Math.abs(dd-v.d)<14;
        if(kerkSide&&nearC){if(dd<=v.d){const oo=side*21,x=q.x+Math.cos(q.h)*oo,z=q.z+Math.sin(q.h)*oo,y=landH(C,dd,oo,mix,q.y);put('kerk',x,y,z,1,face(q.h,side)+Math.PI/2);put('blob',x,y+.06,z,11,0);
          for(const k of[-1,1]){const o2=side*7.2,q2=roadAt(C,dd+k*6);put('bank',q2.x+Math.cos(q2.h)*o2,landH(C,dd+k*6,o2,mix,q2.y),q2.z+Math.sin(q2.h)*o2,1,face(q2.h,side))}}dd+=16;continue}
        if(r()<.12){const oo=side*(9+r()*4),x=q.x+Math.cos(q.h)*oo,z=q.z+Math.sin(q.h)*oo;tree(r()<.5?'berk':'eik',x,landH(C,dd,oo,mix,q.y),z,.8+r()*.3);dd+=7;continue}
        const list=HUIS[v.ty]||HUIS.polder,k=Math.abs(dd-v.d)<35&&r()<.4&&v.ty!=='bergen'?'winkel':list[Math.floor(r()*list.length)],w=W2[k],dp=D2[k],gard=k==='rij'||k==='winkel'?0:r()*3.5;
        const qc=roadAt(C,dd+w/2),oo=side*(7.6+gard+dp/2),x=qc.x+Math.cos(qc.h)*oo,z=qc.z+Math.sin(qc.h)*oo,y=landH(C,dd+w/2,oo,mix,qc.y);
        put(k,x,y,z,1,face(qc.h,side),tint(.22,.08));put('blob',x,y+.06,z,Math.max(w,dp)*.75,0);
        if(gard>1.5){const o2=side*7.5,q2=roadAt(C,dd+.3),x2=q2.x+Math.cos(q2.h)*o2,z2=q2.z+Math.sin(q2.h)*o2;put(r()<.5?'heg':'tuinhek',x2,landH(C,dd,o2,mix,q2.y),z2,1,-q2.h+Math.PI,tint(.1,.02),1,0)}
        dd+=w+1+r()*3.5;
      }
    }
    for(let dd=Math.max(v0,a)+8;dd<Math.min(v1,a+CH);dd+=9+r()*30){if(Math.abs(dd-v.d)<16)continue;const side=r()<.5?-1:1,q=roadAt(C,dd),oo=side*5.7;
      put('auto',q.x+Math.cos(q.h)*oo,landH(C,dd,oo,landMix(C,dd),q.y)+.05,q.z+Math.sin(q.h)*oo,1,-q.h+(side>0?0:Math.PI),new T.Color(['#d9d9d9','#1d1f22','#8a8f96','#b3262d','#1f4f8c','#f2f2f2','#3c5a3c','#5a5f66'][Math.floor(r()*8)]))}
    for(let dd=Math.max(v0,a);dd<Math.min(v1,a+CH);dd+=26){const side=Math.floor(dd/26)%2?1:-1,q=roadAt(C,dd),mix=landMix(C,dd),oo=side*6.6;put('lamp',q.x+Math.cos(q.h)*oo,landH(C,dd,oo,mix,q.y),q.z+Math.sin(q.h)*oo,1,face(q.h,-side))}
    if(v.d-40>=a&&v.d-40<a+CH){const q=roadAt(C,v.d-40),oo=6.6;put('bushok',q.x+Math.cos(q.h)*oo,landH(C,v.d-40,oo,landMix(C,v.d-40),q.y),q.z+Math.sin(q.h)*oo,1,face(q.h,-1))}
    for(const [dd,txt] of[[v0-12,v.name],[v1+12,v.name]])if(dd>=a&&dd<a+CH){const sg=makePlace(txt,dd>v.d),q=roadAt(C,dd);sg.position.set(q.x+Math.cos(q.h)*5.4,q.y,q.z+Math.sin(q.h)*5.4);sg.rotation.y=-q.h;g.add(sg)}
  }
  /* bocht-waarschuwingen */
  for(let d=Math.max(80,a);d<Math.min(C.L-80,a+CH);d+=20){const k1=C.K[Math.round((d+70)/STEP)],k0=C.K[Math.round(d/STEP)];
    if(Math.abs(k1)>.012&&Math.abs(k0)<.006&&!villageW(C,d)){const sg=makeBend(k1>0),q=roadAt(C,d);sg.position.set(q.x+Math.cos(q.h)*5.4,q.y,q.z+Math.sin(q.h)*5.4);sg.rotation.y=-q.h;g.add(sg);d+=200}}
  /* water in de sloten langs de polderweg */
  {const pos=[],idx=[];for(const side of[-1,1]){let j=-1,run=false;
    for(let d=a;d<=Math.min(C.L-1,a+CH);d+=8){const p=roadAt(C,d),mix=landMix(C,d);const ok=mix.polder>.7&&!nearCanal(d)&&!villageW(C,d);
      if(!ok){run=false;continue}
      const n0=pos.length/3;for(const o of[11.2,13.8]){const oo=innerOff(side*o,p.k);pos.push(p.x+Math.cos(p.h)*oo,p.y-1.05,p.z+Math.sin(p.h)*oo)}
      if(run)idx.push(n0-2,n0-1,n0,n0-1,n0+1,n0);run=true}}
    if(idx.length)g.add(new T.Mesh(geo(pos,idx),M.water));}
  const Mx=new T.Matrix4(),CROWD=new Set(['mens','mens2','hoofd','vlag']),WIND=new Set(['boom','den','populier','struik','pol','bloem','riet','knotwilg','berk','eik','fruitboom']);
    for(const key in lists){
    const L=lists[key],k=key,m=new T.InstancedMesh(W.G[k],k==='wolk'?M.wolk:k==='blob'?M.blob:WIND.has(k)?M.tree:CROWD.has(k)?M.crowd:M.inst,L.length);m.userData.shared=true;
    const wc=new T.Color(1,1,1),e=new T.Euler(),q=new T.Quaternion(),v=new T.Vector3(),sc=new T.Vector3();
    L.forEach(([x,y,z,s,ry,col,sy,tl],i)=>{e.set(tl||0,ry||0,(tl||0)*.7);q.setFromEuler(e);Mx.compose(v.set(x,y,z),q,sc.set(s,sy||s,s));m.setMatrixAt(i,Mx);m.setColorAt(i,col||wc)});
    if(k==='blob')m.receiveShadow=false;else if(k!=='wolk'&&k!=='pol'&&k!=='bloem')m.castShadow=false;
    m.computeBoundingSphere();if(k==='wolk')m.frustumCulled=false;g.add(m);
  }
  W.root.add(g);W.chunks.set(ci,g);
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
  const slope=dd=>(roadAt(C,dd+6).y-roadAt(C,dd).y)/6*100;
  const lane=(R,dd,off,cad,spd,stand)=>{const q=roadAt(C,dd);R.g.position.set(q.x+Math.cos(q.h)*off,q.y,q.z+Math.sin(q.h)*off);R.g.rotation.y=-q.h;
    const q2=roadAt(C,dd+3);R.g.rotation.x=Math.atan2(q2.y-q.y,3);R.g.rotation.z=clamp(-q.k*spd*spd*.012,-.25,.25);poseRider(R,dt,cad,spd,stand)};
  const spd=rate*(distAt(C,Math.min(pos+1,C.n-1))-distAt(C,pos))||(P.free&&run?speedFor(pw||0,0):0);
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
  const ahead=roadAt(C,d+18),back=d>=6.2?roadAt(C,d-6.2):(q=>({x:q.x-Math.sin(q.h)*(6.2-d),y:q.y,z:q.z+Math.cos(q.h)*(6.2-d),h:q.h}))(roadAt(C,0));
  const cp=new T.Vector3(back.x+Math.cos(back.h)*.6,Math.max(back.y,p.y)+2.85+(run?Math.sin(t/260)*.025:0),back.z+Math.sin(back.h)*.6);
  if(!W.camP)W.camP=cp.clone();else{W.camP.x=cp.x;W.camP.z=cp.z;W.camP.y=clamp(W.camP.y+(cp.y-W.camP.y)*Math.min(1,dt*3),cp.y-.4,cp.y+.4)}
  W.cam.position.copy(W.camP);W.cam.lookAt(ahead.x,ahead.y+.2,ahead.z);
  /* zon, lucht en verre bergen reizen mee */
  const md=W.mood.dir;W.sun.position.set(p.x+md[0],p.y+md[1],p.z+md[2]);W.wind.value=t/1000;
  {const L=Math.hypot(...md)/1100;W.sunDisc.position.set(W.cam.position.x+md[0]/L,W.cam.position.y+md[1]/L,W.cam.position.z+md[2]/L)}
  if(W.rain){W.rain.position.copy(W.cam.position);W.rain.position.y-=8;const a=W.rain.geometry.attributes.position,ar=a.array;for(let i=0;i<ar.length;i+=6){ar[i+1]-=24*dt;ar[i+4]-=24*dt;if(ar[i+1]<0){ar[i+1]+=25;ar[i+4]+=25}}a.needsUpdate=true}W.sun.target.position.set(p.x,p.y,p.z);
  W.sky.position.copy(W.cam.position);W.ring.position.set(W.cam.position.x,p.y,W.cam.position.z);
  for(const s of W.mills)s.rotation.z+=dt*.6;
  const ci=Math.floor(d/CH);
  if(!W.chunks.has(ci))buildChunk(ci);else for(let c=ci+1;c<=ci+5;c++)if(!W.chunks.has(c)){buildChunk(c);break}
  for(const c of W.chunks.keys())if(c<ci-2||c>ci+7)dropChunk(c);
  W.lastD=d;worldHud(d);
  W.ren.render(W.scene,W.cam);
}
function worldHud(d){
  const g=P.game,el=id=>document.getElementById(id);if(!g)return;
  const set=(id,v)=>{const e=el(id);if(e&&e.textContent!==String(v))e.textContent=v};
  set('p-km',nl((d/1000).toFixed(1))+' km');
  if(W&&W.C&&!P.free){
    /* aftellen in de laatste 3 seconden van een blok */
    const pos=Math.min(P.pos,P.total-1),i=segAt(pos),sg=P.wo.segs[i],rem=P.starts[i]+sg.d-P.pos,cd=el('p-cd');
    if(cd){const on=P.mode==='run'&&sg.d>=20&&P.wo.segs[i+1]&&rem>0&&rem<=3;cd.hidden=!on;if(on&&cd.textContent!==String(rem)){cd.textContent=rem;cd.style.animation='none';void cd.offsetWidth;cd.style.animation=''}}
    if(now()-(W.profT||0)>300){W.profT=now();drawProfile(d)}
  }
  if(!g.on)return;
  set('p-pts',g.pts.toLocaleString('nl-NL'));set('p-mult',g.streak>=5?`×${gameMult()} · reeks ${clock(g.streak)}`:'');
  set('p-stars','★ '+g.stars.reduce((a,b)=>a+b,0));
  const pop=el('p-pop');if(pop){const on=g.pop&&now()-g.pop.t<3500;pop.hidden=!on;if(on)set('p-pop','★'.repeat(g.pop.st)+'☆'.repeat(3-g.pop.st))}
}
/* hoogteprofiel van de komende anderhalve kilometer, in de kleur van de blokken */
const tAt=(C,d)=>{let lo=0,hi=C.n;if(d>=C.S[hi])return C.n;while(hi-lo>1){const m=(lo+hi)>>1;if(C.S[m]<=d)lo=m;else hi=m}return lo};
function drawProfile(d){
  const cv=document.getElementById('p-prof');if(!cv)return;const C=W.C,c=cv.getContext('2d'),w=cv.width,h=cv.height,a=d-120,b=d+1400,N=90;
  if(!W.zc){const cs=getComputedStyle(document.documentElement);W.zc=[0,1,2,3,4,5,6,7].map(z=>cs.getPropertyValue('--z'+z).trim()||'#888')}
  let lo=1e9,hi=-1e9;const ys=[];for(let i=0;i<=N;i++){const y=roadAt(C,a+(b-a)*i/N).y;ys.push(y);lo=Math.min(lo,y);hi=Math.max(hi,y)}
  hi=Math.max(hi,lo+25);const Y=y=>h-6-(y-lo)/(hi-lo)*(h-22);
  c.clearRect(0,0,w,h);
  for(let i=0;i<N;i++){const dd=a+(b-a)*(i+.5)/N,t=tAt(C,dd),sg=t<P.total?P.wo.segs[segAt(Math.min(t,P.total-1))]:null;
    c.fillStyle=sg?W.zc[zoneOf((sg.a+sg.b)/2)]:'rgba(255,255,255,.35)';c.globalAlpha=.85;
    c.beginPath();c.moveTo(i/N*w,h);c.lineTo(i/N*w,Y(ys[i]));c.lineTo((i+1)/N*w+.6,Y(ys[i+1]));c.lineTo((i+1)/N*w+.6,h);c.fill()}
  c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();ys.forEach((y,i)=>i?c.lineTo(i/N*w,Y(y)):c.moveTo(0,Y(y)));c.stroke();
  const x=(d-a)/(b-a)*w,yy=Y(roadAt(C,d).y);c.fillStyle='#FF6A2B';c.strokeStyle='#fff';c.lineWidth=2.5;c.beginPath();c.arc(x,yy,6,0,7);c.fill();c.stroke();
  /* tekst: de klim die eraan komt of waar je in zit */
  let s0=-1,s1=-1,rise=0;for(let dd=d;dd<d+3000;dd+=20){const g2=(roadAt(C,dd+20).y-roadAt(C,dd).y)/20*100;if(g2>2.5){if(s0<0)s0=dd;s1=dd+20}else if(s0>=0&&dd-s1>60)break}
  const lab=document.getElementById('p-proft');if(lab){let t='';if(s0>=0&&s0-d<1400){rise=roadAt(C,s1).y-roadAt(C,s0).y;const len=s1-s0,pct=rise/len*100;
    t=s0<=d+10?`Klim: nog ${s1-d>=1000?nl(((s1-d)/1000).toFixed(1))+' km':Math.round((s1-d)/10)*10+' m'} · ${nl(pct.toFixed(1))}%`:`Klim over ${Math.round((s0-d)/10)*10} m · ${len>=1000?nl((len/1000).toFixed(1))+' km':Math.round(len/10)*10+' m'} · ${nl(pct.toFixed(1))}%`}
    else t='Vlak';if(lab.textContent!==t)lab.textContent=t}
}
/* wordt na elke renderPlayer aangeroepen */
function worldSync(){
  if(P&&view3d()){if(!W)worldOpen();else if(!W.loading){W.el.hidden=false;worldHud(W.lastD||0)}}
  else if(W&&!W.loading)W.el.hidden=true;
}
