/* ---------- fietser uit Blender (models/fietser.glb; mensmodel: Blender Human Base Meshes, CC0) ----------
   Eén model: racefiets + renner met skelet. De benen, het crankstel en de pedalen bewegen met de animatie 'zit' (zittend),
   'staan' (uit het zadel) en 'laag' (diep over het stuur, bij hoge snelheid); de stand van de crank kiest het moment in die animatie. De wielen draaien we zelf.
   Kleuren komen uit één plaatje per renner (kitAtlas): bovenin het shirt rondom, rechts het opschrift op de onderbuis,
   onderin vakjes met één kleur. In Blender wijst elk onderdeel naar het midden van zijn vakje. */
const PATCH=['huid','haar','broek','handschoen','sok','schoen','zool','shirt','boord','lip','oogwit','pupil','helm','helmstreep','bril','glas',
  'frame0','frame1','zwart','carbon','alu','band','bandzij','ketting','zadel','stuurlint','bidon','spaak','acc2','wit','logo','oog'];
function patchColors(k){
  return {huid:k.skin||'#e0a283',haar:k.hair||'#5a3b26',broek:'#16191f',handschoen:'#33373e',sok:'#f4f4f2',schoen:'#f4f4f2',zool:'#1b1d22',
    shirt:k.base,boord:k.acc,lip:'#a5493f',oogwit:'#f7f5ef',pupil:'#2a1d14',helm:k.helmet,helmstreep:k.hstripe,
    bril:'#1b1d22',glas:'#2b3440',frame0:k.frame[0],frame1:k.frame[1],zwart:'#16191f',carbon:'#22252b',alu:'#b9bec5',band:'#1a1a1a',bandzij:'#b8935e',
    ketting:'#3a3d44',zadel:'#141619',stuurlint:k.bar||'#16191f',bidon:k.bottle||'#ffffff',spaak:'#9a9fa5',acc2:k.acc2||'#ffffff',wit:'#ffffff',logo:k.frame[0]};
}
/* tekent het plaatje op een canvas van 512 x 512 (los van three, zodat Blender hetzelfde plaatje kan gebruiken) */
function drawAtlas(c,k){
  const sh=(col,l)=>{const m=/^#?(..)(..)(..)$/.exec(col);let [r,g,b]=[1,2,3].map(i=>parseInt(m[i],16)/255);
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,L=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=L>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}
    L=Math.min(1,Math.max(0,L+l));return `hsl(${h*360},${s*100}%,${L*100}%)`};
  /* shirt rondom (u 0 = voorkant, .25 linkerzij, .5 rug, .75 rechterzij), van boord (y 0) tot heup; daaronder het broekje */
  const yb=192;c.fillStyle=k.base;c.fillRect(0,0,512,256);
  c.fillStyle=sh(k.base,-.06);c.fillRect(512*.18,0,512*.13,yb);c.fillRect(512*.69,0,512*.13,yb);
  c.fillStyle=k.acc;
  if(k.pat==='band'){c.fillRect(0,256*.36,512,22);c.fillStyle=k.acc2;c.fillRect(0,256*.36-7,512,4);c.fillRect(0,256*.36+25,512,4)}
  else if(k.pat==='hoops')for(let i=0;i<5;i++)c.fillRect(0,256*.18+i*30,512,11);
  else if(k.pat==='sash'){c.save();c.beginPath();c.rect(0,0,512,yb);c.clip();for(const x0 of[0,256]){c.beginPath();c.moveTo(x0+40,0);c.lineTo(x0+110,0);c.lineTo(x0+230,yb);c.lineTo(x0+160,yb);c.fill()}c.restore();c.fillStyle=k.acc2;c.fillRect(0,256*.06,512,5)}
  else if(k.pat==='chevron'){c.lineWidth=18;c.strokeStyle=k.acc;for(const x0 of[0,512]){c.beginPath();c.moveTo(x0-110,256*.2);c.lineTo(x0,256*.5);c.lineTo(x0+110,256*.2);c.stroke()}c.strokeStyle=k.acc2;c.lineWidth=6;for(const x0 of[0,512]){c.beginPath();c.moveTo(x0-110,256*.3);c.lineTo(x0,256*.6);c.lineTo(x0+110,256*.3);c.stroke()}}
  else if(k.pat==='dots')for(let y=14;y<yb-6;y+=26)for(let x=(y/26%2)*16;x<512;x+=32){c.beginPath();c.arc(x,y,8,0,7);c.fill()}
  /* kraag, rits voor, achterzakken en naam op de rug */
  c.fillStyle=k.acc;c.fillRect(0,0,512,5);c.fillStyle=sh(k.base,-.12);c.fillRect(0,0,2,yb);c.fillRect(510,0,2,yb);
  c.strokeStyle=sh(k.base,-.12);c.lineWidth=2;for(const i of[-1,0,1])c.strokeRect(512*(.5+i*.07)-14,yb-40,28,34);
  if(k.logo){c.fillStyle=k.pat==='band'?k.acc2:k.acc;c.font='800 21px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(k.logo,256,256*.6)}
  /* broek: zwart */
  c.fillStyle='#16191f';c.fillRect(0,yb,512,256-yb);
  /* onderbuis: opschrift, rechts (boven) van trapas naar balhoofd, links (onder) andersom; beide gewoon leesbaar */
  c.fillStyle=k.frame[0];c.fillRect(256,256,256,128);
  c.fillStyle=k.frame[0]==='#f2f2f2'||k.frame[0]==='#ffffff'?k.frame[1]:'#ffffff';c.font='800 30px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.fillText('KOPWERK',384,290);c.fillText('KOPWERK',384,354);
  /* vakjes met één kleur: 16 per rij, 32 x 32, vanaf y 384 */
  const pc=patchColors(k);
  PATCH.forEach((n,i)=>{if(pc[n]){c.fillStyle=pc[n];c.fillRect((i%16)*32,384+Math.floor(i/16)*32,32,32)}});
  /* vak 'oog': één getekend oog waar beide oogbollen naar wijzen. Oogwit met de schaduw van het bovenste ooglid, iris met een donkere rand,
     pupil en een glansje; de oogbol heeft in dit vak een straal van 13 beeldpunten */
  {const i=PATCH.indexOf('oog'),x=(i%16)*32+16,y=384+Math.floor(i/16)*32+16,iris=k.oog||'#6a4a30';c.save();c.beginPath();c.rect(x-16,y-16,32,32);c.clip();
    c.fillStyle='#f4f1ea';c.fillRect(x-16,y-16,32,32);
    {const g=c.createLinearGradient(0,y-13,0,y+2);g.addColorStop(0,'rgba(92,66,58,.55)');g.addColorStop(1,'rgba(92,66,58,0)');c.fillStyle=g;c.fillRect(x-16,y-16,32,20)}
    c.fillStyle='#2a1d14';c.beginPath();c.arc(x,y,6.9,0,7);c.fill();
    {const g=c.createRadialGradient(x,y+1,1,x,y,6.2);g.addColorStop(0,sh(iris,.16));g.addColorStop(.7,iris);g.addColorStop(1,sh(iris,-.12));c.fillStyle=g;c.beginPath();c.arc(x,y,6.2,0,7);c.fill()}
    c.fillStyle='#120d0a';c.beginPath();c.arc(x,y,2.9,0,7);c.fill();
    c.fillStyle='rgba(255,255,255,.95)';c.beginPath();c.arc(x-2.3,y-2.6,1.35,0,7);c.fill();c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(x+2.4,y+2.2,.7,0,7);c.fill();c.restore()}
}
/* lijfplaatje: models/lijfkaart.png zegt per pixel welk kledingstuk het is (rood = kleurvak, 200 = shirt met patroon; groen en blauw =
   plek op het shirt). Hiermee kleuren we per tenue het lijf, met nette randen bij kraag, mouwen, broek en sokken.
   models/lijfao.png is de gebakken schaduw in plooien en holtes (neus, ogen, lippen); die maakt de kleuren daar donkerder. */
const SHIRT_R=200,LIP_I=9;
function mixHex(a,b,t){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((x,i)=>Math.round(x+(B[i]-x)*t).toString(16).padStart(2,'0')).join('')}
/* De kaart kent de plek op het shirt maar in 256 stappen; daardoor kreeg de opdruk een kartelrand. shirtUV maakt die plek vloeiend:
   per pixel het gemiddelde van de buren die op hetzelfde stuk shirt liggen (rondom telt door over de naad, van 255 naar 0). */
function shirtUV(kaart){
  const W=kaart.width,H=kaart.height,s=kaart.data,U=new Float32Array(W*H),V=new Float32Array(W*H),R=3;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,j=i*4;if(s[j]!==SHIRT_R)continue;const g=s[j+1],b=s[j+2];let su=0,sv=0,n=0;
    for(let dy=-R;dy<=R;dy++){const yy=y+dy;if(yy<0||yy>=H)continue;for(let dx=-R;dx<=R;dx++){const xx=x+dx;if(xx<0||xx>=W)continue;const q=(yy*W+xx)*4;if(s[q]!==SHIRT_R)continue;
      let du=s[q+1]-g;if(du>128)du-=256;else if(du<-128)du+=256;const dv=s[q+2]-b;if(du>7||du<-7||dv>7||dv<-7)continue;su+=du;sv+=dv;n++}}
    U[i]=g+su/n;V[i]=b+sv/n}
  return {U,V};
}
function drawLijf(c,k,kaart,atlas,ao,uv){
  const W=kaart.width,H=kaart.height,src=kaart.data,out=c.createImageData(W,H),o=out.data,pat=atlas.data,AW=atlas.width,AS=AW/512,pc=patchColors(k),sh=ao&&ao.data;
  pc.lip=mixHex(pc.huid,'#9c4a45',.45);
  const rgb=PATCH.map(n=>{const h=pc[n]||'#ff00ff';return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16))});
  for(let i=0;i<W*H;i++){const j=i*4,r=src[j];let R,G,B;
    if(r===SHIRT_R){
      /* plek op het shirt, vloeiend (uv) en tussen vier beeldpunten van het patroon in gemengd: strakke randen aan strepen en letters */
      const fu=((uv?uv.U[i]:src[j+1])/255*512*AS%AW+AW)%AW,fv=Math.max(0,Math.min(256*AS-1.001,(1-(uv?uv.V[i]:src[j+2])/255)*512*AS)),x0=Math.floor(fu),y0=Math.floor(fv),tx=fu-x0,ty=fv-y0,x1=(x0+1)%AW,
        a=(y0*AW+x0)*4,b=(y0*AW+x1)*4,cq=((y0+1)*AW+x0)*4,d=((y0+1)*AW+x1)*4,mx=(n)=>(pat[a+n]*(1-tx)+pat[b+n]*tx)*(1-ty)+(pat[cq+n]*(1-tx)+pat[d+n]*tx)*ty;
      R=mx(0);G=mx(1);B=mx(2)}
    else{const cc=rgb[r]||rgb[0];R=cc[0];G=cc[1];B=cc[2];
      /* huid en lippen: groen in de kaart = blos (wangen, neus, oren, knieën), blauw = een donkere lijn (wimpers, tussen de lippen) */
      if(r===0||r===LIP_I){const bl=src[j+1]/255*.3,ln=src[j+2]/255*.72;if(bl>0){G*=1-bl*.26;B*=1-bl*.3;R=Math.min(255,R*(1+bl*.03))}if(ln>0){R+=(52-R)*ln;G+=(36-G)*ln;B+=(30-B)*ln}}}
    /* gebakken schaduw: op de huid voluit (neus, ogen, lippen), op kleding veel lichter, anders tekenen de spieren zich af in het shirt */
    const kl=r===SHIRT_R||(r>=2&&r<=8),f=sh?(kl?0.8+0.2*sh[j]/255:0.4+0.6*sh[j]/255):1;o[j]=R*f;o[j+1]=G*f;o[j+2]=B*f;o[j+3]=255}
  c.putImageData(out,0,0);
}

/* ---------- model laden (één keer) en per renner een kopie met eigen tenue ---------- */
const RIDER_V='20261116b';
let RIDER=null;
async function loadRider(){
  if(RIDER)return RIDER;
  const T=T3,img=src=>new Promise((ok,nee)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>nee(new Error('plaatje '+src));i.src=src+'?v='+RIDER_V});
  const pix=(i,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0,w,h);return x.getImageData(0,0,w,h)};
  const [{GLTFLoader},SKU,kaart,ao,nrm]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/utils/SkeletonUtils.js'),
    img('models/lijfkaart.png'),img('models/lijfao.png'),img('models/lijfnormaal.jpg')]);
  const g=await new GLTFLoader().loadAsync('models/fietser.glb?v='+RIDER_V);
  const clip=g.animations[0],sub=(n,a,b)=>T.AnimationUtils.subclip(clip,n,a,b,24);
  /* het reliëf komt van een bloot lijf: onder shirt, broek, sokken en handschoenen vlakken we het af, zodat de stof glad valt en je geen spieren door het shirt ziet */
  const nc=document.createElement('canvas');nc.width=nrm.width;nc.height=nrm.height;
  {const x=nc.getContext('2d',{willReadFrequently:true});x.drawImage(nrm,0,0);const nd=x.getImageData(0,0,nc.width,nc.height),p=nd.data,kc=document.createElement('canvas');kc.width=nc.width;kc.height=nc.height;
    const kx=kc.getContext('2d',{willReadFrequently:true});kx.imageSmoothingEnabled=false;kx.drawImage(kaart,0,0,nc.width,nc.height);const kd=kx.getImageData(0,0,nc.width,nc.height).data;
    for(let i=0;i<p.length;i+=4){const r=kd[i];if((r>=2&&r<=8)||r>150){const w=.82;p[i]+=(128-p[i])*w;p[i+1]+=(128-p[i+1])*w;p[i+2]+=(255-p[i+2])*w}}
    x.putImageData(nd,0,0)}
  const normal=new T.CanvasTexture(nc);normal.flipY=false;normal.colorSpace=T.NoColorSpace;normal.needsUpdate=true;
  RIDER={scene:g.scene,SKU,uv:null,Q:[new T.Quaternion(),new T.Quaternion(),new T.Quaternion()],UP:new T.Vector3(0,1,0),clips:{zit:sub('zit',0,25),staan:sub('staan',30,55),laag:sub('laag',60,85)},kaart:pix(kaart,kaart.width,kaart.height),ao:pix(ao,kaart.width,kaart.height),normal,tex:new Map()};
  return RIDER;
}
/* plaatjes per tenue (gedeeld door renners met hetzelfde tenue) */
function kitTextures(k){
  const key=JSON.stringify(k);let t=RIDER.tex.get(key);if(t)return t;
  const T=T3,mk=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d',{willReadFrequently:true}),c);
    const x=new T.CanvasTexture(c);x.flipY=false;x.colorSpace=T.SRGBColorSpace;x.anisotropy=ANISO;x.wrapS=T.RepeatWrapping;return x};
  /* het kleurenplaatje twee keer zo groot getekend: scherpere letters op shirt en onderbuis */
  const atlas=mk(1024,1024,c=>{c.scale(2,2);drawAtlas(c,k)});
  if(!RIDER.uv)RIDER.uv=shirtUV(RIDER.kaart);
  const lijf=mk(RIDER.kaart.width,RIDER.kaart.height,c=>drawLijf(c,k,RIDER.kaart,atlas.image.getContext('2d').getImageData(0,0,1024,1024),RIDER.ao,RIDER.uv));
  t={atlas,lijf};RIDER.tex.set(key,t);return t;
}
function riderMats(k,ghost){
  const T=T3,t=kitTextures(k),o={transparent:!!ghost,opacity:ghost?.6:1,depthWrite:!ghost};
  return {mat_huid:new T.MeshStandardMaterial({map:t.lijf,normalMap:RIDER.normal,roughness:.72,metalness:0,...o}),
    mat_lijf:new T.MeshStandardMaterial({map:t.atlas,roughness:.8,metalness:0,...o}),
    mat_lak:new T.MeshStandardMaterial({map:t.atlas,roughness:.38,metalness:.05,...o})};
}
/* een renner: g = alles (op de weg zetten en draaien), mixer speelt 'zit'/'staan' op de stand van de crank, wielen draaien we zelf */
function makeRider(k,ghost){
  const T=T3,g=new T.Group(),m=RIDER.SKU.clone(RIDER.scene),mats=riderMats(k,ghost);g.add(m);
  m.traverse(o=>{if(o.isMesh){o.material=mats[o.material.name]||mats.mat_lijf;if(o.isSkinnedMesh)o.frustumCulled=false}});
  const mixer=new T.AnimationMixer(m),zit=mixer.clipAction(RIDER.clips.zit),staan=mixer.clipAction(RIDER.clips.staan),laag=mixer.clipAction(RIDER.clips.laag);
  for(const a of[zit,staan,laag]){a.play();a.paused=true}
  staan.setEffectiveWeight(0);laag.setEffectiveWeight(0);mixer.update(0);
  return {g,mixer,zit,staan,aLaag:laag,hoofd:m.getObjectByName('hoofd'),nek:m.getObjectByName('nek'),wr:m.getObjectByName('wiel_achter'),wf:m.getObjectByName('wiel_voor'),a:Math.random()*6,stand:0,laag:0,look:0,t:0};
}
/* bocht: hoe ver het hoofd de bocht in draait (radialen, + = links); kmh: echte snelheid, bepaalt of hij diep over het stuur gaat */
function poseRider(R,dt,cad,spd,stand,bocht=0,kmh=0){
  R.stand+=((stand?1:0)-R.stand)*Math.min(1,dt*3);const st=R.stand;R.t+=dt;
  /* boven de 40 km/u (afdaling, sprint) zakt hij diep over het stuur, ellebogen gebogen */
  R.laag+=((stand?0:clamp((kmh-38)/10,0,1))-R.laag)*Math.min(1,Math.max(0,dt)*1.2);const lg=R.laag=clamp(R.laag,0,1);
  R.a+=cad/60*Math.PI*2*dt;const rot=spd*dt/.34;R.wr.rotation.x-=rot;R.wf.rotation.x-=rot;
  /* trapt hij niet terwijl hij rijdt (uitrollen, afdalen), dan komen de pedalen rustig waterpas te staan */
  if(cad<5&&kmh>8){const w=Math.round(R.a/Math.PI)*Math.PI;R.a+=(w-R.a)*Math.min(1,dt*3)}
  /* moment in de animatie = stand van de crank (0 = rechterpedaal vooruit). Eén omwenteling is precies 24 beelden = 1 s;
     niet de duur van de clip gebruiken: 'zit' loopt één beeld door in de overgang naar staan, dat gaf een hapering per omwenteling */
  const f=((R.a/(Math.PI*2))%1+1)%1;
  R.zit.time=f;R.staan.time=f;R.aLaag.time=f;
  R.zit.setEffectiveWeight((1-st)*(1-lg));R.aLaag.setEffectiveWeight((1-st)*lg);R.staan.setEffectiveWeight(st);R.mixer.update(0);
  /* het hoofd kijkt de bocht in: nek en hoofd draaien samen om de as recht omhoog, na de animatie */
  R.look+=(bocht-R.look)*Math.min(1,dt*2.5);
  /* de mixer schrijft een bot alleen opnieuw als de animatie verandert (stilstaande pedalen: niet). Daarom onthouden we per bot de stand
     uit de animatie (b0) en wat wij er zelf van maakten (b1): staat b1 er nog, dan beginnen we weer bij b0, anders is b0 de nieuwe stand */
  if(R.hoofd){const [q1,q2,q3]=RIDER.Q;for(const [b,w] of[[R.nek,.4],[R.hoofd,.6]]){const u=b.userData;if(!u.b0){u.b0=b.quaternion.clone();u.b1=b.quaternion.clone()}
    if(b.quaternion.equals(u.b1))b.quaternion.copy(u.b0);else u.b0.copy(b.quaternion);
    if(Math.abs(R.look)>.004){b.parent.getWorldQuaternion(q1);q2.setFromAxisAngle(RIDER.UP,R.look*w);b.quaternion.premultiply(q3.copy(q1).invert().multiply(q2).multiply(q1))}
    u.b1.copy(b.quaternion)}}
  /* de fiets wiegt mee met de trapbeweging: licht als hij zit, duidelijk als hij staat */
  R.g.rotation.z+=Math.sin(R.a)*(st*.1+(1-st)*.012*Math.min(1,cad/80));
}
