'use strict';
/* ================= Ontworpen routes =================
   Routes met een vast ontwerp (js/routes/*.js): de weg is met de hand uitgezet als rechte stukken en bochten,
   het land eromheen volgt uit de weg plus een paar getekende lijnen (beken, ruggen, toppen) en is één doorlopend
   hoogteveld. Daardoor sluit het land tussen twee benen van een haarspeldbocht vanzelf aan en herhaalt niets.

   Assen: x = oost, z = zuid (three.js), dus noord = -z. Koers h: 0 = noord, met de klok mee; vooruit = (sin h, -cos h),
   rechts = (cos h, sin h). Dat is dezelfde koers als in roadAt. */

/* ---------- 1. wegverloop ---------- */
/* stukken -> lijst van stukjes met lineair verlopende kromming (overgangsbogen, zodat camera en fietser niet schokken) */
function dzSegs(stukken,h0){
  const segs=[],marks=[];let s=0,hd=h0;
  const spiral=(R,A)=>Math.min(clamp(R*.5,6,30),Math.abs(A)*R);
  for(const p of stukken){const k=p[0];
    if(k==='S'||k==='S*'){segs.push({L:p[1],k0:0,k1:0,adj:k==='S*',s});s+=p[1]}
    else if(k==='B'||k==='Bh'||k==='HP'){
      let Ad,R;
      if(k==='B'){Ad=p[1];R=p[2]}
      else if(k==='Bh'){Ad=((p[1]-hd+180)%360+360)%360-180;R=p[2]}
      else{Ad=((p[2]-hd)%360+360)%360;if(p[1]==='L')Ad-=360;R=p[3]}
      hd+=Ad;const A=Ad*Math.PI/180,kap=(A>0?1:-1)/R,lt=spiral(R,A),Lc=Math.abs(A)*R-lt;
      if(k==='HP')marks.push(['hp',s+lt+Lc/2,R,A>0?1:-1]);
      segs.push({L:lt,k0:0,k1:kap,s});s+=lt;
      if(Lc>0){segs.push({L:Lc,k0:kap,k1:kap,s});s+=Lc}
      segs.push({L:lt,k0:kap,k1:0,s});s+=lt;
      const lab=k==='HP'?p[4]:p[3];if(lab)marks.push([lab,s-lt-Lc/2,R,A>0?1:-1]);
    }
    else if(k==='M')marks.push([p[1],s]);
  }
  return {segs,marks,L:s};
}
/* in stapjes van een halve meter optellen; uit: per stapje afstand, plaats, koers en kromming (in kaartassen: y = noord) */
function dzIntegrate(segs,h0){
  const n=Math.ceil(segs.reduce((a,g)=>a+g.L,0)/.5)+segs.length+2,S=new Float64Array(n),X=new Float64Array(n),Y=new Float64Array(n),H=new Float64Array(n),K=new Float64Array(n);
  let x=0,y=0,h=h0,s=0,i=0;S[0]=0;X[0]=0;Y[0]=0;H[0]=h;K[0]=0;
  for(const g of segs){const m=Math.max(1,Math.ceil(g.L/.5)),dl=g.L/m;
    for(let j=0;j<m;j++){const km=g.k0+(g.k1-g.k0)*(j+.5)/m,hm=h+km*dl/2;x+=Math.sin(hm)*dl;y+=Math.cos(hm)*dl;h+=km*dl;s+=dl;i++;S[i]=s;X[i]=x;Y[i]=y;H[i]=h;K[i]=g.k0+(g.k1-g.k0)*(j+1)/m}}
  return {S:S.subarray(0,i+1),X:X.subarray(0,i+1),Y:Y.subarray(0,i+1),H:H.subarray(0,i+1),K:K.subarray(0,i+1)};
}
/* De ronde sluiten: drie rechte stukken (S*) worden zo verlengd of ingekort dat het eind precies op het begin valt
   en de ronde precies km*1000 meter is. Dat is lineair, dus één keer oplossen is genoeg (drie keer voor de zekerheid). */
function dzClose(D){
  const P=D.stukken.map(p=>p.slice()),h0=D.koers*Math.PI/180,adj=[];P.forEach((p,i)=>{if(p[0]==='S*')adj.push(i)});
  for(let it=0;it<3&&adj.length===3;it++){
    const {segs}=dzSegs(P,D.koers),I=dzIntegrate(segs,h0),n=I.S.length-1,dirs=[];
    for(const g of segs)if(g.adj){let lo=0,hi=n;while(lo<hi){const m=(lo+hi)>>1;if(I.S[m]<g.s+.01)lo=m+1;else hi=m}dirs.push(I.H[lo])}
    const M=[dirs.map(Math.sin),dirs.map(Math.cos),[1,1,1]],r=[-I.X[n],-I.Y[n],D.km*1000-I.S[n]];
    const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]),d0=det(M);
    for(let c=0;c<3;c++){const Mc=M.map((row,ri)=>row.map((v,ci)=>ci===c?r[ri]:v));P[adj[c]][1]+=det(Mc)/d0}
  }
  return P;
}
/* 'markering' of 'markering+0.12' (km) of een getal (km) -> meters langs de weg */
function dzAt(v,marks){
  if(typeof v==='number')return v*1000;
  const m=/^([a-z0-9]+)([+-][0-9.]+)?$/.exec(v),mk=m&&marks.find(q=>q[0]===m[1]);
  if(!mk){console.warn('onbekende markering',v);return 0}
  return mk[1]+(m[2]?parseFloat(m[2])*1000:0);
}
/* hoogteprofiel per meter: stijging per stuk, haarspeldbochten iets vlakker (het verschil gaat naar de benen),
   zachte overgangen van 40 m, en de ronde sluit doordat de afdaling het verschil opvangt */
function dzProfile(D,marks,L){
  const n=Math.round(L),g=new Float64Array(n+1),pk=D.hoogte;
  for(let i=0;i<pk.length;i++){const a=Math.round(dzAt(pk[i][0],marks)),b=i+1<pk.length?Math.round(dzAt(pk[i+1][0],marks)):n;for(let s=Math.max(0,a);s<Math.min(n+1,b);s++)g[s]=pk[i][1]}
  const w=new Float64Array(n+1).fill(1);
  for(const m of marks)if(m[0]==='hp')for(let s=Math.max(0,Math.round(m[1]-18));s<Math.min(n+1,Math.round(m[1]+18));s++)w[s]=.62;
  for(const [a0,b0] of D.hpGroepen||[]){const a=Math.round(dzAt(a0,marks)),b=Math.round(dzAt(b0,marks));let sw=0;for(let s=a;s<b;s++)sw+=w[s];for(let s=a;s<b;s++)w[s]*=(b-a)/sw}
  for(let s=0;s<=n;s++)g[s]*=w[s];
  /* glijdend gemiddelde over 41 m (rondom: de ronde loopt door) */
  const sm=new Float64Array(n+1);{let acc=0;for(let j=-20;j<=20;j++)acc+=g[(j%n+n)%n];for(let s=0;s<=n;s++){sm[s]=acc/41;acc+=g[(s+21)%n]-g[((s-20)%n+n)%n]}}
  const integ=G=>{const y=new Float64Array(n+1);for(let s=1;s<=n;s++)y[s]=y[s-1]+(G[s-1]+G[s])/200;return y};
  let y=integ(sm);const err=y[n],a=dzAt(D.afdaling[0],marks),b=dzAt(D.afdaling[1],marks);
  let neg=0;for(let s=Math.round(a);s<Math.round(b);s++)if(sm[s]<0)neg-=sm[s];
  if(neg>0)for(let s=Math.round(a);s<Math.round(b);s++)if(sm[s]<0)sm[s]+=sm[s]/neg*err*100;
  y=integ(sm);return y;
}
/* ---------- 1b. wegverloop uit een spoor (GPX) ----------
   js/routes/<id>-spoor.js (gemaakt met tools/gpx_naar_spoor.py) geeft één punt per 8 m, als verschillen in centimeters.
   Hier wordt dat een vloeiende lijn met een punt per 4 m, met koers en kromming. Markeringen staan in het ontwerp als
   marks:{naam: km}. Haarspeldbochten worden herkend aan hun draaiing (meer dan 120 graden binnen 40 m) en krijgen de markering 'hp';
   met hpTussen:[[km, km], ...] alleen op die stukken (niet op een kruispunt in een dorp). */
function dzTrack(D,L,N){
  const S=ROUTE_SPOOR[D.spoor],n=S.x.length,st=S.stap,dd=a=>{const o=new Float64Array(n);let v=0,p=0;for(let i=0;i<n;i++){o[i]=p/100;v+=a[i];p+=v}return o},
    px=dd(S.x),py=dd(S.y),ph=new Float64Array(n);{let p=0;for(let i=0;i<n;i++){ph[i]=p/100;p+=S.h[i]}}
  if(Math.abs(n*st-L)>1)console.warn('spoor en km kloppen niet',n*st,L);
  const X=new Float32Array(N+1),Z=new Float32Array(N+1),HD=new Float32Array(N+1),K=new Float32Array(N+1),Y=new Float32Array(N+1),at=(A,i)=>A[((i%n)+n)%n];
  /* Catmull-Rom door de punten: plaats en richting */
  const cr=(A,i,u)=>{const p0=at(A,i-1),p1=at(A,i),p2=at(A,i+1),p3=at(A,i+2);return [.5*(2*p1+(p2-p0)*u+(2*p0-5*p1+4*p2-p3)*u*u+(3*p1-p0-3*p2+p3)*u*u*u),.5*((p2-p0)+2*(2*p0-5*p1+4*p2-p3)*u+3*(3*p1-p0-3*p2+p3)*u*u)]};
  let hp=0;
  for(let k=0;k<=N;k++){const f=k*STEP/st,i=Math.floor(f),u=f-i,[x,dx]=cr(px,i,u),[y,dy]=cr(py,i,u);X[k]=x;Z[k]=-y;Y[k]=cr(ph,i,u)[0];
    let h=Math.atan2(dx,dy);if(k)h+=Math.PI*2*Math.round((hp-h)/(Math.PI*2));HD[k]=hp=h}
  const turn=HD[N]-HD[0];for(let k=0;k<=N;k++){const a=k>0?HD[k-1]:HD[N-1]-turn,b=k<N?HD[k+1]:HD[1]+turn;K[k]=(b-a)/(2*STEP)}
  const marks=Object.entries(D.marks||{}).map(([nm,km])=>[nm,km*1000]);if(!marks.some(m=>m[0]==='start'))marks.push(['start',0]);
  const ok=d=>!D.hpTussen||D.hpTussen.some(([a,b])=>d>=a*1000&&d<=b*1000);
  for(let k=5;k<N-5;k++)if(Math.abs(HD[k+5]-HD[k-5])>2.1&&ok(k*STEP)){let b=k;for(let j=k;j<Math.min(N-5,k+14);j++)if(Math.abs(K[j])>Math.abs(K[b]))b=j;
    marks.push(['hp',b*STEP,clamp(1/Math.abs(K[b]),8,30),K[b]>0?1:-1]);k=b+30}
  marks.sort((a,b)=>a[1]-b[1]);
  return {X,Z,HD,K,Y,marks};
}
const DZ_CACHE={};
/* Bouwt een route-object C dat dezelfde velden heeft als buildCourse (X, Z, Y, HD, K, UP, ...) zodat rijden,
   hoogteprofiel en trainer niets merken van het verschil. */
function designCourse(R){
  const D=ROUTE_DESIGN[R.ontwerp],L=D.km*1000,N=Math.round(L/STEP),h0=(D.koers||0)*Math.PI/180;
  /* de weg komt uit een spoor (GPX, zie dzTrack) of uit met de hand uitgezette stukken */
  const TR=D.spoor?dzTrack(D,L,N):null,P=TR?null:dzClose(D),SG=TR?null:dzSegs(P,D.koers),marks=TR?TR.marks:SG.marks;
  const X=TR?TR.X:new Float32Array(N+1),Z=TR?TR.Z:new Float32Array(N+1),HD=TR?TR.HD:new Float32Array(N+1),K=TR?TR.K:new Float32Array(N+1),Y=TR?TR.Y:new Float32Array(N+1);
  if(!TR){const I=dzIntegrate(SG.segs,h0),y=dzProfile(D,marks,L);let j=0;const n=I.S.length-1;
    for(let k=0;k<=N;k++){const s=k*STEP*I.S[n]/L;while(j<n-1&&I.S[j+1]<s)j++;const u=clamp((s-I.S[j])/(I.S[j+1]-I.S[j]),0,1);
      X[k]=I.X[j]+(I.X[j+1]-I.X[j])*u;Z[k]=-(I.Y[j]+(I.Y[j+1]-I.Y[j])*u);HD[k]=I.H[j]+(I.H[j+1]-I.H[j])*u;K[k]=I.K[j]+(I.K[j+1]-I.K[j])*u;
      const si=Math.min(y.length-2,Math.floor(k*STEP));Y[k]=y[si]+(y[si+1]-y[si])*(k*STEP-si)}
    X[N]=X[0];Z[N]=Z[0];Y[N]=Y[0];K[N]=K[0]}
  const UP=new Float32Array(N+1);for(let k=1;k<=N;k++)UP[k]=UP[k-1]+Math.max(0,Y[k]-Y[k-1]);
  const seed=[...R.id].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7);
  const C={L,lap:L,lapKm:D.km,N,seed,ph:0,route:R,design:D,designed:true,X,Z,Y,HD,K,UP,UPlap:UP[N],marks,
    hp:marks.filter(m=>m[0]==='hp').map(m=>m[1]),villages:[],canals:[],
    zones:[{ty:D.decor||'bergen',a:0,b:L,v:0}]};
  C.mark=nm=>{const m=marks.find(q=>q[0]===nm);return m?m[1]:null};
  C.at=v=>dzAt(v,marks);
  /* secties: elk een eigen karakter, met een overgang van 150 m */
  C.sec=(D.secties||[]).map(([at,p])=>({a:((dzAt(at,marks)%L)+L)%L,p})).sort((x,y)=>x.a-y.a);
  if(!C.sec.length)C.sec=[{a:0,p:{land:'dal',breedte:6.4,lijn:'midden',rand:'paal',sfeer:'open',dicht:.5}}];
  C.secMix=d=>{d=((d%L)+L)%L;const S=C.sec,n=S.length;let i=n-1;for(let j=0;j<n;j++)if(S[j].a<=d)i=j;
    const nx=(i+1)%n,pv=(i-1+n)%n,toN=((S[nx].a-d)%L+L)%L||L,fromP=((d-S[i].a)%L+L)%L,B=75;
    if(toN<B){const w=.5-toN/B/2;return [[i,1-w],[nx,w]]}
    if(fromP<B){const w=.5-fromP/B/2;return [[i,1-w],[pv,w]]}
    return [[i,1]]};
  C.secP=d=>C.sec[C.secMix(d)[0][0]].p;
  C.secNum=(d,key,def)=>{let v=0;for(const [i,w] of C.secMix(d))v+=w*(C.sec[i].p[key]??def);return v};
  C.hwAt=d=>C.secNum(d,'breedte',6.4)/2;
  /* zijwegen en rotondes: alleen het begin hoort bij de route, de rest loopt een stukje door en verdwijnt uit zicht */
  const mkSide=(x0,z0,y0,h0deg,stukken,helling,breedte,soort)=>{
    const ext=stukken.concat([['S',70]]),{segs}=dzSegs(ext,h0deg),I=dzIntegrate(segs,h0deg*Math.PI/180),Ls=I.S[I.S.length-1],Ns=Math.floor(Ls/STEP);
    const S={N:Ns,L:Ns*STEP,vis:Ls-70,hw:breedte/2,soort:soort||'weg',X:new Float32Array(Ns+1),Z:new Float32Array(Ns+1),Y:new Float32Array(Ns+1),HD:new Float32Array(Ns+1),K:new Float32Array(Ns+1)};
    let j=0;for(let k=0;k<=Ns;k++){const s=k*STEP;while(j<I.S.length-2&&I.S[j+1]<s)j++;const u=clamp((s-I.S[j])/(I.S[j+1]-I.S[j]),0,1);
      S.X[k]=x0+I.X[j]+(I.X[j+1]-I.X[j])*u;S.Z[k]=z0-(I.Y[j]+(I.Y[j+1]-I.Y[j])*u);S.HD[k]=I.H[j]+(I.H[j+1]-I.H[j])*u;S.K[k]=I.K[j];
      /* helling pas na de eerste 10 m, zodat de aansluiting vlak ligt */
      S.Y[k]=y0+Math.max(0,s-10)*helling/100}
    return S};
  C.bridges=(D.punten||[]).filter(q=>q.soort==='brug'||q.soort==='vaartbrug').map(q=>{const d=dzAt(q.at,marks);return [d-(q.lengte||28)/2,d+(q.lengte||28)/2]});
  C.sideRoads=[];
  for(const z of D.zijwegen||[]){const d=dzAt(z.at,marks),p=roadAt(C,d);C.sideRoads.push(Object.assign(mkSide(p.x,p.z,p.y,p.h*180/Math.PI+z.hoek,z.stukken,z.helling||0,z.breedte||6,z.soort),{at:d,bord:z.bord}))}
  C.rounds=[];
  for(const ro of D.rotondes||[]){const m=marks.find(q=>q[0]===ro.mark);if(!m)continue;const p=roadAt(C,m[1]),sgn=m[3];
    /* middelpunt aan de binnenkant van de bocht */
    const cx=p.x+sgn*Math.cos(p.h)*ro.r,cz=p.z+sgn*Math.sin(p.h)*ro.r;C.rounds.push({x:cx,z:cz,y:p.y,r:ro.r,at:m[1]});
    for(const [br,len,hel] of ro.armen){const b=br*Math.PI/180,x=cx+Math.sin(b)*ro.r,z=cz-Math.cos(b)*ro.r;
      C.sideRoads.push(Object.assign(mkSide(x,z,p.y,br,[['S',len]],hel,6.2),{at:m[1],round:true}))}}
  /* klimmen voor het bord onderaan: aaneengesloten stukken die per 200 m meer dan 3% stijgen */
  C.climbs=[];if(D.klim||D.klimmen){for(const kl of D.klimmen||[D.klim]){const a=dzAt(kl[0],marks),b=dzAt(kl[1],marks);C.climbs.push({a,len:b-a,g:(Y[Math.round(b/STEP)]-Y[Math.round(a/STEP)])/(b-a)*100})}}
  else{let a=-1;for(let d=0;d<=L-200;d+=50){const gr=(Y[Math.round((d+200)/STEP)]-Y[Math.round(d/STEP)])/2;if(gr>3&&a<0)a=d;else if(gr<1.5&&a>=0){const len=d+200-a;if(len>800)C.climbs.push({a,len,g:(Y[Math.round((a+len)/STEP)]-Y[Math.round(a/STEP)])/len*100});a=-1}}}
  return C;
}

/* ---------- 1c. hoogtekaart ----------
   Een route kan een echte hoogtekaart hebben (terrein.hoogte, gemaakt met tools/hoogte_naar_bin.py): twee rasters met hoogtes
   boven zeeniveau, fijn rond de route en grof tot aan de horizon. Het land komt dan uit die kaart in plaats van uit getekende lijnen. */
async function dzLoadHoogte(id){
  const H=typeof ROUTE_HOOGTE!=='undefined'&&ROUTE_HOOGTE[id];if(!H||H.binnen.d||H.fout)return;
  if(!H.p)H.p=fetch(H.bestand).then(r=>{if(!r.ok)throw new Error('hoogtekaart');return r.arrayBuffer()}).then(b=>{const nb=H.binnen.nx*H.binnen.ny;H.binnen.d=new Uint16Array(b,0,nb);H.buiten.d=new Uint16Array(b,nb*2,H.buiten.nx*H.buiten.ny)}).catch(e=>{console.warn(e);H.fout=true});
  return H.p;
}
/* welke hoogtekaart hoort bij een route (of niets) */
const dzHoogteVan=rid=>{const R=ROUTES.find(x=>x.id===rid),D=R&&R.ontwerp&&ROUTE_DESIGN[R.ontwerp],k=D&&D.terrein&&D.terrein.hoogte,H=k&&typeof ROUTE_HOOGTE!=='undefined'&&ROUTE_HOOGTE[k];return H?k:null};
const dzHoogteKlaar=rid=>{const k=dzHoogteVan(rid);return !k||!!ROUTE_HOOGTE[k].binnen.d||!!ROUTE_HOOGTE[k].fout};
/* hoogte boven zeeniveau op een plek (x = oost, y = noord), vloeiend tussen de rasterpunten */
function dzDemAt(R,x,y){
  const fx=clamp((x-R.x0)/R.cel,1,R.nx-2.001),fy=clamp((y-R.y0)/R.cel,1,R.ny-2.001),i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j,A=R.d,nx=R.nx;
  const u0=((2-u)*u-1)*u/2,u1=((3*u-5)*u*u+2)/2,u2=((4-3*u)*u+1)*u/2,u3=(u-1)*u*u/2;let s=0;
  for(let b=0;b<4;b++){const r=(j-1+b)*nx+i-1,w=b===0?((2-v)*v-1)*v/2:b===1?((3*v-5)*v*v+2)/2:b===2?((4-3*v)*v+1)*v/2:(v-1)*v*v/2;s+=w*(A[r]*u0+A[r+1]*u1+A[r+2]*u2+A[r+3]*u3)}
  return s/4;
}
/* ---------- 2. het land: één hoogteveld rond de hele ronde ----------
   Raster van 8 m. Vast liggen: de weg (ook zijwegen), getekende beken en ruggen, toppen, meren en wanden langs de weg.
   De rest wordt glad ingevuld (Laplace: elk vrij punt wordt het gemiddelde van zijn buren), eerst grof en dan fijn.
   Tussen twee benen van een haarspeldbocht ontstaat zo vanzelf een gelijkmatige helling. Daarna reliëf erbovenop,
   dat dichtbij de weg wegvalt. */
function dzNoise(seed){
  const hs=(i,j)=>{let h=(i*374761393+j*668265263+seed*144665)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296};
  const vn=(x,z)=>{const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
    return (hs(i,j)*(1-u)+hs(i+1,j)*u)*(1-v)+(hs(i,j+1)*(1-u)+hs(i+1,j+1)*u)*v};
  /* gewone ruis (-1..1) en ruggen-ruis (0..1, scherpe graten) */
  return {
    f:(x,z,oct=4)=>{let s=0,a=1,t=0,f=1;for(let o=0;o<oct;o++){s+=a*(vn(x*f,z*f)*2-1);t+=a;a*=.5;f*=2.03}return s/t},
    r:(x,z,oct=4)=>{let s=0,a=1,t=0,f=1;for(let o=0;o<oct;o++){const n=1-Math.abs(vn(x*f+o*17.3,z*f-o*9.1)*2-1);s+=a*n*n;t+=a;a*=.5;f*=2.1}return s/t}
  };
}
function designTerrain(C){
  if(C.T)return C.T;
  const t0=performance.now(),D=C.design,TD=D.terrein||{},cs=TD.cel||8,mg=TD.marge||1200;
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let k=0;k<C.N;k++){x0=Math.min(x0,C.X[k]);x1=Math.max(x1,C.X[k]);z0=Math.min(z0,C.Z[k]);z1=Math.max(z1,C.Z[k])}
  x0=Math.floor((x0-mg)/cs)*cs;z0=Math.floor((z0-mg)/cs)*cs;const nx=Math.ceil((x1+mg-x0)/cs)+1,nz=Math.ceil((z1+mg-z0)/cs)+1,n=nx*nz;
  /* vastzetten met een gewogen gemiddelde waar stempels overlappen; getekende lijnen (f) en de weg (r) apart, de weg wint.
     Weg-cellen onthouden ook het dichtstbijzijnde wegpunt (RK: index op de hoofdweg, of -2-i voor zijweg i) */
  const VF=new Float64Array(n),WF=new Float64Array(n),VR=new Float64Array(n),WR=new Float64Array(n),FX=new Uint8Array(n),VS=new Float64Array(n);
  const RK=new Int32Array(n).fill(-1),RD=new Float32Array(n).fill(1e9),SX=new Float32Array(n),SZ=new Float32Array(n),
    QK=new Int32Array(n).fill(-1),QD=new Float32Array(n).fill(1e9),QX=new Float32Array(n),QZ=new Float32Array(n);
  const stamp=(x,z,r,h,road,k)=>{const i0=Math.max(0,Math.floor((x-r-x0)/cs)),i1=Math.min(nx-1,Math.ceil((x+r-x0)/cs)),j0=Math.max(0,Math.floor((z-r-z0)/cs)),j1=Math.min(nz-1,Math.ceil((z+r-z0)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const dx=x0+i*cs-x,dz=z0+j*cs-z,dd=Math.hypot(dx,dz);if(dd>r)continue;const c=j*nx+i,w=1/(dd+1);
      if(road){VR[c]+=h*w;WR[c]+=w;if(k>=0){if(dd<RD[c]){RD[c]=dd;RK[c]=k;SX[c]=x;SZ[c]=z}}else if(dd<QD[c]){QD[c]=dd;QK[c]=k;QX[c]=x;QZ[c]=z}}else{VF[c]+=h*w;WF[c]+=w}}};
  /* punten in kaartmeters [x, noord, h], of vast aan de weg: ['markering', rechts, vooruit, h boven de weg daar] */
  const anchor=(m,ri,fw)=>{const p=roadAt(C,C.at(m));return [p.x+Math.cos(p.h)*ri+Math.sin(p.h)*fw,p.z+Math.sin(p.h)*ri-Math.cos(p.h)*fw,p.y]};
  const toW=p=>{if(typeof p[0]==='string'){const [x,z,y]=anchor(p[0],p[1],p[2]);return [x,z,y+(p[3]||0)]}return [p[0],-p[1],p[2]]};
  const rq=rng(C.seed^77);
  const line=(pts0,r,rond)=>{let pts=pts0.map(toW);
    /* een beek of rivier loopt in bochten, niet in knikken */
    if(rond)for(let it=0;it<2;it++){const Q=[pts[0]];for(let i=0;i<pts.length-1;i++){const A=pts[i],B=pts[i+1];Q.push(A.map((v,k)=>v*.75+B[k]*.25),A.map((v,k)=>v*.25+B[k]*.75))}Q.push(pts[pts.length-1]);pts=Q}
    /* kammen: tussen de getekende punten komen pieken en kerven, zodat een kam nergens een vlakke muur is */
    if(Math.max(...pts.map(q=>q[2]||0))>430){const out=[];for(let i=0;i<pts.length-1;i++){const A=pts[i],B=pts[i+1],len=Math.hypot(B[0]-A[0],B[1]-A[1]),n=Math.max(1,Math.round(len/170));
        for(let k=0;k<n;k++){const u=k/n,h=A[2]+(B[2]-A[2])*u;out.push([A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u,k?h*(1+(rq()-.45)*(TD.kamRuis??.28)):h])}}out.push(pts[pts.length-1]);pts=out}
    for(let i=0;i<pts.length-1;i++){const [ax,az,ah]=pts[i],[bx,bz,bh]=pts[i+1],len=Math.hypot(bx-ax,bz-az),m=Math.max(1,Math.ceil(len/4));
      for(let s=0;s<=m;s++){const u=s/m;stamp(ax+(bx-ax)*u,az+(bz-az)*u,r,ah+(bh-ah)*u,false)}}return pts};
  /* water: [nummer van de lijn, breedte in meters] */
  const WL=new Map(TD.water||[]),waters=[];
  (TD.lijnen||[]).forEach((L,i)=>{const w=WL.get(i),P=line(L,w?Math.max(9,w/2+5):9,!!w);if(w){let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;for(const q of P){bx0=Math.min(bx0,q[0]);bx1=Math.max(bx1,q[0]);bz0=Math.min(bz0,q[1]);bz1=Math.max(bz1,q[1])}waters.push({w,P,bb:[bx0-w-12,bx1+w+12,bz0-w-12,bz1+w+12]})}});
  /* een beek onder elke brug door: stroomopwaarts stijgend, stroomafwaarts dalend */
  for(const q of D.punten||[])if(q.soort==='brug'&&q.beek){const [side,lu,rise,ld,fall]=q.beek,d=C.at(q.at),pts=[];
    for(let t=-ld;t<=lu;t+=10){const u=t>0?Math.pow(t/lu,1.25)*rise:-Math.pow(-t/ld,.9)*fall;pts.push([q.at,side*t,0,-6.5+u])}line(pts,7)}
  /* de rand van het raster: achter de kammen zakt het land weer wat weg */
  if(TD.buitenrand!=null)for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)if(i<2||j<2||i>nx-3||j>nz-3){const c=j*nx+i;VF[c]+=TD.buitenrand;WF[c]+=1}
  for(const [x,y,h,r] of TD.toppen||[])stamp(x,-y,r,h,false);
  /* wanden en afgronden langs de weg */
  for(const [a0,b0,side,off,dh] of TD.randen||[]){const a=C.at(a0),b=C.at(b0);
    /* niet als een strakke plaat: hoogte en afstand golven langs de weg */
    for(let d=a;d<=b;d+=4){const p=roadAt(C,d),f=Math.min(1,(d-a)/60,(b-d)/60),v=.82+.3*Math.sin(d/23+side)+.18*Math.sin(d/8.7+off),o=side*(off+1.6*Math.sin(d/17.3));stamp(p.x+Math.cos(p.h)*o,p.z+Math.sin(p.h)*o,5,p.y+dh*f*v,false)}}
  /* dorpsplein en kerk: vlak land op weghoogte, anders verdwijnt het plaveisel onder de helling */
  for(const v of D.dorpen||[])if(v.plein){const d=C.at(v.plein),p=roadAt(C,d),ks=v.kant||-1,hw=C.hwAt(d),nx=Math.cos(p.h)*ks,nz=Math.sin(p.h)*ks,fx=Math.sin(p.h),fz=-Math.cos(p.h);
    for(let u=-18;u<=18;u+=6)for(let w=3;w<=27;w+=6)stamp(p.x+nx*(hw+w)+fx*u,p.z+nz*(hw+w)+fz*u,7,p.y-.05,false);
    stamp(p.x+nx*(hw+38),p.z+nz*(hw+38),13,p.y+.8,false)}
  /* de weg en zijwegen: hun cellen liggen precies op weghoogte */
  const roads=[C,...(C.sideRoads||[])];
  /* bij een brug ligt alleen het wegdek vast, zodat het land eronder weg kan zakken */
  const onBridge=d=>(C.bridges||[]).some(([b0,b1])=>d>b0&&d<b1);
  roads.forEach((W2,ri)=>{for(let k=0;k<=W2.N;k++){const hw=ri?W2.hw:C.hwAt(k*STEP);stamp(W2.X[k],W2.Z[k],!ri&&onBridge(k*STEP)?hw+.5:Math.max(hw+1.5,6,cs*.65),W2.Y[k]-.15,true,ri?-2-(ri-1):k)}});
  for(let c=0;c<n;c++){if(WR[c]){VS[c]=VR[c]/WR[c];FX[c]=1}else if(WF[c]){VS[c]=VF[c]/WF[c];FX[c]=1}}
  /* meren: bodem vast onder het peil, de oever net onder het peil */
  C.lakes=[];for(const M0 of TD.meren||[]){const M=Object.assign({},M0);if(M.peilAt!=null)M.peil=roadAt(C,C.at(M.peilAt)).y-(M.onder??2.5);const P=M.pt.map(q=>M.anker?toW([M.anker,q[0],q[1],0]).slice(0,2):toW(q).slice(0,2));C.lakes.push({P,peil:M.peil,riet:!!M.riet});
    let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;for(const [x,z] of P){bx0=Math.min(bx0,x);bx1=Math.max(bx1,x);bz0=Math.min(bz0,z);bz1=Math.max(bz1,z)}
    for(let j=Math.max(0,Math.floor((bz0-z0)/cs));j<=Math.min(nz-1,Math.ceil((bz1-z0)/cs));j++)for(let i=Math.max(0,Math.floor((bx0-x0)/cs));i<=Math.min(nx-1,Math.ceil((bx1-x0)/cs));i++){
      const x=x0+i*cs,z=z0+j*cs,c=j*nx+i;if(!dzInPoly(P,x,z)||WR[c])continue;VS[c]=M.peil-.8-clamp(dzPolyDist(P,x,z)/3,0,9);FX[c]=2}}
  /* twee velden: afstand tot de hoofdweg (RD, RK = wegpunt) en tot de zijwegen (QD, QK = -2-zijweg) */
  const prop=(D_,K_,X_,Z_)=>{const relax=(c,c2)=>{if(D_[c2]>=1e9)return;const x=x0+(c%nx)*cs,z=z0+Math.floor(c/nx)*cs,dd=Math.hypot(X_[c2]-x,Z_[c2]-z);if(dd<D_[c]){D_[c]=dd;K_[c]=K_[c2];X_[c]=X_[c2];Z_[c]=Z_[c2]}};
    for(let pass=0;pass<2;pass++){
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(i)relax(c,c-1);if(j){relax(c,c-nx);if(i)relax(c,c-nx-1);if(i<nx-1)relax(c,c-nx+1)}}
      for(let j=nz-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const c=j*nx+i;if(i<nx-1)relax(c,c+1);if(j<nz-1){relax(c,c+nx);if(i<nx-1)relax(c,c+nx+1);if(i)relax(c,c+nx-1)}}}};
  prop(RD,RK,SX,SZ);prop(QD,QK,QX,QZ);
  /* vlak land (polder): verder dan vlakAf van elke weg ligt het land vast op één hoogte; ertussen ontstaat vanzelf een dijktalud */
  if(TD.vlak!=null)for(let c=0;c<n;c++)if(!FX[c]&&Math.min(RD[c],QD[c])>(TD.vlakAf||16)){VS[c]=TD.vlak;FX[c]=1}
  /* Reliëf: ruggen en geulen op verschillende schalen, nul vlak bij de weg. Het wordt vóór het invullen van de vaste waarden
     afgetrokken en na afloop overal opgeteld: zo blijven weg, beken en ruggen precies op hun hoogte en krijgt de rest karakter. */
  const NZ=dzNoise(C.seed),A0=TD.ruis||20,NF=new Float32Array(n);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(FX[c]===2)continue;const x=x0+i*cs,z=z0+j*cs,dd=Math.min(RD[c],QD[c]),amp=clamp((dd-12)/150,0,1)*(1+(TD.ruisVer||0)*clamp((dd-260)/700,0,1)),fine=clamp((dd-7)/25,0,1);
    NF[c]=amp*A0*((NZ.r(x/620,z/620,3)*2.2-.95)+.6*(NZ.r(x/170+3.1,z/170-5.3,3)*1.6-.62))+fine*(NZ.f(x/48,z/48,2)*2.6+NZ.f(x/21,z/21,2)*1.5+NZ.f(x/14,z/14,1)*.5)}
  for(let c=0;c<n;c++)if(FX[c])VS[c]-=NF[c];
  /* met een hoogtekaart is er niets in te vullen: het land ligt vast, alleen rond de weg schuift het naar de weghoogte toe */
  const HK=TD.hoogte&&typeof ROUTE_HOOGTE!=='undefined'&&ROUTE_HOOGTE[TD.hoogte],DEM=HK&&HK.binnen.d?HK.binnen:null,zee=DEM?ROUTE_SPOOR[D.spoor].h0:0;
  /* grof naar fijn: Laplace met over-relaxatie */
  const lv=[{nx,nz,FX,V:VS}];
  while(!DEM&&lv[lv.length-1].nx>24&&lv[lv.length-1].nz>24){const A=lv[lv.length-1],bnx=Math.ceil(A.nx/2),bnz=Math.ceil(A.nz/2),bF=new Uint8Array(bnx*bnz),bV=new Float64Array(bnx*bnz),bW=new Float64Array(bnx*bnz);
    for(let j=0;j<A.nz;j++)for(let i=0;i<A.nx;i++){const c=j*A.nx+i;if(!A.FX[c])continue;const b=(j>>1)*bnx+(i>>1);bV[b]+=A.V[c];bW[b]++;bF[b]=1}
    for(let b=0;b<bnx*bnz;b++)if(bF[b])bV[b]/=bW[b];lv.push({nx:bnx,nz:bnz,FX:bF,V:bV})}
  let H=null;
  for(let l=DEM?-1:lv.length-1;l>=0;l--){const A=lv[l],w=A.nx,h=A.nz,U=new Float64Array(w*h);
    if(!H){let s=0,c=0;for(let q=0;q<w*h;q++)if(A.FX[q]){s+=A.V[q];c++}U.fill(c?s/c:0)}
    else{const B=lv[l+1];for(let j=0;j<h;j++)for(let i=0;i<w;i++){const fi=Math.min(B.nx-1.001,(i-.5)/2),fj=Math.min(B.nz-1.001,(j-.5)/2),ci=Math.max(0,Math.floor(fi)),cj=Math.max(0,Math.floor(fj)),u=clamp(fi-ci,0,1),v=clamp(fj-cj,0,1);
      U[j*w+i]=(H[cj*B.nx+ci]*(1-u)+H[cj*B.nx+ci+1]*u)*(1-v)+(H[(cj+1)*B.nx+ci]*(1-u)+H[(cj+1)*B.nx+ci+1]*u)*v}}
    for(let q=0;q<w*h;q++)if(A.FX[q])U[q]=A.V[q];
    const it=l===lv.length-1?400:l===0?45:70,om=1.85;
    for(let k=0;k<it;k++)for(let j=0;j<h;j++){const jm=j?j-1:1,jp=j<h-1?j+1:h-2;for(let i=0;i<w;i++){const q=j*w+i;if(A.FX[q])continue;const im=i?i-1:1,ip=i<w-1?i+1:w-2;
      const avg=(U[j*w+im]+U[j*w+ip]+U[jm*w+i]+U[jp*w+i])*.25;U[q]+=om*(avg-U[q])}}
    H=U}
  if(DEM){H=new Float64Array(n);const FR=TD.wegRand||170,dY=new Float32Array(C.N+1);for(let k=0;k<=C.N;k++)dY[k]=C.Y[k]-.15-(dzDemAt(DEM,C.X[k],-C.Z[k])-zee);
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(FX[c]){H[c]=VS[c];continue}const x=x0+i*cs,z=z0+j*cs,dd=RD[c];let h=dzDemAt(DEM,x,-z)-zee;
      if(dd<FR&&RK[c]>=0){const t=clamp((dd-cs*.7)/(FR-cs*.7),0,1);h+=dY[RK[c]]*(1-t*t*(3-2*t))}H[c]=h}}
  const Hf=new Float32Array(n);for(let c=0;c<n;c++)Hf[c]=H[c]+NF[c];
  C.lakeAt=(x,z)=>{for(const L of C.lakes)if(dzInPoly(L.P,x,z))return L;return null};
  const T={x0,z0,cs,nx,nz,H:Hf,RD,RK,QD,QK,QX,QZ,NZ,water:waters};
  /* afstand tot de oever van het dichtstbijzijnde stromende water (negatief = in het water) */
  T.waterAt=(x,z)=>{let m=99;for(const R of waters){if(x<R.bb[0]||x>R.bb[1]||z<R.bb[2]||z>R.bb[3])continue;const P=R.P;for(let i=0;i<P.length-1;i++){const ax=P[i][0],az=P[i][1],dx=P[i+1][0]-ax,dz=P[i+1][1]-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);m=Math.min(m,Math.hypot(ax+dx*t-x,az+dz*t-z)-R.w/2)}}return m};
  const cell=(x,z)=>clamp(Math.round((z-z0)/cs),0,nz-1)*nx+clamp(Math.round((x-x0)/cs),0,nx-1);
  T.distMain=(x,z)=>RD[cell(x,z)];T.distSide=(x,z)=>QD[cell(x,z)];T.dist=(x,z)=>{const c=cell(x,z);return Math.min(RD[c],QD[c])};
  T.near=(x,z)=>RK[cell(x,z)];
  /* precieze afstand tot de weg (het raster is 8 m grof): rond het dichtstbijzijnde wegpunt zoeken */
  T.exact=(x,z)=>{const c=cell(x,z);let best=Math.min(RD[c],QD[c]);
    if(RD[c]<40){const k0=RK[c];for(let k=k0-10;k<=k0+10;k++){const kk=((k%C.N)+C.N)%C.N;best=Math.min(best,Math.hypot(C.X[kk]-x,C.Z[kk]-z))}}
    if(QD[c]<40&&QK[c]<=-2){const S=C.sideRoads[-2-QK[c]];if(S)for(let k=0;k<=S.N;k++)best=Math.min(best,Math.hypot(S.X[k]-x,S.Z[k]-z)-(S.hw-3))}
    return best};
  T.slope=(x,z)=>Math.hypot(T.h(x+3,z)-T.h(x-3,z),T.h(x,z+3)-T.h(x,z-3))/6;
  /* bos: waar het niet te steil is en onder de boomgrens (die golft), in vlekken */
  const TL=TD.boomgrens||290;
  T.forest=(x,z,y)=>{const nn=NZ.f(x/260,z/260,3)*.75+NZ.f(x/60,z/60,2)*.25,tl=TL+NZ.f(x/500,z/500,2)*45,alt=y<(TD.bosVan??25)?(TD.bosLaag??.3):y<tl-60?-.2:y<tl?-.2+(y-(tl-60))/60*.9:9;
    /* heuvelland: bos vooral op de hellingen, de plateaus en dalbodems zijn open */
    const v=clamp((nn-alt)*4,0,1);return TD.bosHelling?v*clamp((T.slope(x,z)-TD.bosHelling)/.08+(nn>.45?.6:0),0,1):v};
  T.h=(x,z)=>{const fi=clamp((x-x0)/cs,0,nx-1.001),fj=clamp((z-z0)/cs,0,nz-1.001),i=Math.floor(fi),j=Math.floor(fj),u=fi-i,v=fj-j,c=j*nx+i;
    return (Hf[c]*(1-u)+Hf[c+1]*u)*(1-v)+(Hf[c+nx]*(1-u)+Hf[c+nx+1]*u)*v};
  C.T=T;T.ms=Math.round(performance.now()-t0);
  return T;
}
function dzInPoly(P,x,z){let in_=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)in_=!in_}return in_}
function dzPolyDist(P,x,z){let m=1e9;for(let i=0,j=P.length-1;i<P.length;j=i++){const [ax,az]=P[j],[bx,bz]=P[i],dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);m=Math.min(m,Math.hypot(ax+dx*t-x,az+dz*t-z))}return m}

/* ---------- 3. kleur van de grond ---------- */
/* Kleur per punt plus drie gewichten voor de textuur (sp): rots, bos (kruinen van ver), sneeuw */
const DZC={};
/* hoeveel van het bos-uit-de-ruis echt bos is, per landschap langs de weg (op de alm en de pas bijna niets) */
/* open bergwei: hier komen extra graspollen, stenen en bloemen */
const ALPWEI=new Set(['alpen','pas','alm','boomgrens','rots','bosrand','weide','boomgaard','polder']);
/* loofbossen: altijd vol, met de lichte bomen uit de bibliotheek */
const LOOFBOS=new Set(['loofbos','hellingbos','holleweg']);
const DZFM={alpen:.15,pas:0,boomgrens:.55,alm:.6,dal:.6,westdal:.6,dorp:.25,rots:.85,bosrand:.9,weide:.5,akker:.3,boomgaard:.45,polder:.08,dijk:.05,hellingbos:1,holleweg:1};
function dzGround(C,x,z,y,out0,sp,land,fmul=1){
  const T=C.T,TH=T3,id=C.route.id;
  /* kleuren per route: de bergen grijs gesteente, het heuvelland lichte mergel */
  if(!DZC[id]){const P=Object.assign({wei:'#6f9e4b',bergwei:'#84a05a',alp:'#93a566',droog:'#b0a66c',fris:'#5a8e44',bos:'#3a5f2e',bodem:'#4a4a2e',rots:'#7f7b76',puin:'#a39c90',sneeuw:'#eef2f7'},C.design.grond||{});
    DZC[id]={};for(const [k,v] of Object.entries(P))DZC[id][k]=new TH.Color(v);
    DZC[id].velden=((C.design.velden||{}).kleuren||[]).map(v=>new TH.Color(v))}
  const DC=DZC[id],out=out0,TD0=C.design.terrein||{},KV=TD0.kaalVan??560;
  const sl=T.slope(x,z),n=T.NZ.f(x/38,z/38,2),n2=T.NZ.f(x/9,z/9,1);let f=T.forest(x,z,y)*fmul;
  if(land==='bos'||LOOFBOS.has(land))f=Math.max(f,.85);
  const kaal=land==='kaal'?1:land==='pas'?.55:land==='alpen'?.25:0;
  {const Z0=TD0.weiTot||[140,300];out.copy(DC.wei).lerp(DC.bergwei,clamp((y-Z0[0])/160,0,1)).lerp(DC.alp,clamp((y-Z0[1])/120,0,1))}
  /* vlekken: drogere en frissere stukken wei */
  const n3=T.NZ.f(x/130+7,z/130-3,2);if(n3>.15)out.lerp(DC.droog,clamp((n3-.15)*2.2,0,.6));else if(n3<-.2)out.lerp(DC.fris,clamp((-.2-n3)*2.2,0,.55));
  /* akkers en weilanden als lappendeken: lange smalle kavels onder een vaste hoek, elk een eigen gewas */
  let fw=0;const V=C.design.velden;if(V&&DC.velden.length&&!LOOFBOS.has(land)&&land!=='dorp'&&!(C.lakeAt&&C.lakeAt(x,z))){
    const K=dzParcel(C,x,z);if(K.crop>=0){fw=clamp((K.e-1.5)/4,0,1)*clamp((.32-sl)/.12,0,1)*clamp(1-f*1.6,0,1)*(V.tot!=null?clamp((V.tot-y)/30,0,1):1);out.lerp(DC.velden[K.crop%DC.velden.length],fw*.92)}}
  /* onder de bomen langs de weg een donkere bosbodem; bos van ver, rots en sneeuw kleurt het materiaal per pixel (dzSplatMat) */
  if(land)out.lerp(DC.bodem,f*.9);
  /* rots: vanaf ~32 graden komt de rots door het gras, op richels in banden (de ruis volgt de hoogte) */
  const band=T.NZ.f(x/90,y/7+z/90,2);
  const rock=clamp(clamp((sl-.62+band*.18)/.38,0,1)+clamp((y-KV)/110,0,1)*(TD0.kaalDicht??.7)+clamp((y-KV+180)/80,0,1)*clamp(n*1.5,0,.3)+n2*.08+kaal*clamp(n*1.8+.45,0,1),0,1);
  /* sneeuw: dicht boven ~600 m, daaronder vanaf ~300 m losse plekken (de laatste resten in kuilen en op flauwe stukken) */
  const vl=T.NZ.f(x/46+5,z/46-9,2),plek=clamp((y-300)/140,0,1)*clamp((vl-.32)*5,0,1)*clamp((.95-sl)/.4,0,1);
  const sn=C.design.nl||TD0.sneeuw===false?0:Math.max(clamp((y-(600+n*80))/40,0,1)*clamp((1.25-sl)/.4,0,1),plek*.95);
  /* oever van een meer: een rand van grijs grind en natte stenen net boven het peil */
  for(const L of C.lakes||[]){if(y>L.peil+3||y<L.peil-2)continue;const dd=dzPolyDist(L.P,x,z);if(dd<16){out.lerp(DZC.oever||(DZC.oever=new TH.Color('#9a958a')),clamp((16-dd)/10,0,1)*clamp((L.peil+3-y)/2,0,1)*.85)}}
  {const wd=T.waterAt(x,z);if(wd<7){out.lerp(DZC.oever||(DZC.oever=new TH.Color('#9a958a')),clamp((7-wd)/4,0,1)*.85);f*=clamp(wd/7,0,1)}}
  out.offsetHSL(0,0,n*.035+n2*.02);
  if(sp){sp[0]=rock;sp[1]=land?0:f;sp[2]=sn>.001?sn:-fw*.55}
  return out;
}
/* kavel op een plek: lange smalle stroken onder een vaste hoek. e = afstand tot de lange rand, crop = gewas (-1 = gras) */
function dzParcel(C,x,z){
  const V=C.design.velden,a=(V.hoek||0)*Math.PI/180,u=x*Math.cos(a)+z*Math.sin(a),v=-x*Math.sin(a)+z*Math.cos(a),bw=V.b||70,iu=Math.floor(u/bw);
  const hs=(i,j)=>{const q=Math.sin(i*127.1+j*311.7+C.seed*.013)*43758.5453;return q-Math.floor(q)},ll=(V.l||180)*(.7+hs(iu,3)*.9),iv=Math.floor((v+hs(iu,1)*ll)/ll),h=hs(iu,iv);
  const e=Math.min(u-iu*bw,(iu+1)*bw-u),ev=Math.min(((v+hs(iu,1)*ll)%ll+ll)%ll,ll-((v+hs(iu,1)*ll)%ll+ll)%ll);
  return {e,ev,iu,iv,rand:hs(iu+7,iv*3+1),crop:h<(V.kans??.6)?Math.floor(hs(iv,iu)*997):-1};
}
/* laagste grond onder een rotsblok: op een helling zakt het blok aan de lage kant anders niet in de grond en zweeft het */
function dzFoot(T,x,y,z,R){let m=y;for(let i=0;i<8;i++){const a=i*Math.PI/4;m=Math.min(m,T.h(x+Math.cos(a)*R,z+Math.sin(a)*R))}return m}
/* ---- grondmateriaal: per pixel gras, rots, bos-van-ver en sneeuw ----
   De kleur van de grond komt per hoekpunt (dzGround); rots, bos en sneeuw komen als gewicht mee (sp) en krijgen hier, per pixel,
   een grillige rand en hun eigen kleur. Fijne tekening (sprieten, scheuren) is er alleen dichtbij: van ver is het land rustig
   van kleur, met grote vlekken en gesteente in lagen, zoals in een tekening. */
/* rustige, herhaalbare ruis in drie kanalen (twee keer wolkig, één keer met ruggen) */
function dzNoiseTex(){
  if(W.tex.ruis)return W.tex.ruis;
  const TH=T3,n=256,d=new Uint8Array(n*n*4),hs=(i,j,s)=>{let h=(i*374761393+j*668265263+s*144665)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296};
  const vn=(x,y,p,s)=>{const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=i%p,b=j%p,a1=(a+1)%p,b1=(b+1)%p;
    return (hs(a,b,s)*(1-u)+hs(a1,b,s)*u)*(1-v)+(hs(a,b1,s)*(1-u)+hs(a1,b1,s)*u)*v};
  const fbm=(x,y,p,s,ridge)=>{let v=0,a=1,t=0;for(let o=0;o<4;o++){let q=vn(x*p/n,y*p/n,p,s+o*7);if(ridge)q=1-Math.abs(q*2-1);v+=a*q;t+=a;a*=.5;p*=2}return v/t};
  [[4,11,0],[6,23,0],[5,37,1]].forEach(([p,s,rg],c)=>{const f=new Float32Array(n*n);let lo=9,hi=-9;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=fbm(x,y,p,s,rg);f[y*n+x]=v;lo=Math.min(lo,v);hi=Math.max(hi,v)}
    for(let q=0;q<n*n;q++)d[q*4+c]=Math.round((f[q]-lo)/(hi-lo)*255)});
  for(let q=0;q<n*n;q++)d[q*4+3]=255;
  const t=new TH.DataTexture(d,n,n,TH.RGBAFormat);t.wrapS=t.wrapT=TH.RepeatWrapping;t.magFilter=TH.LinearFilter;t.minFilter=TH.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=ANISO;t.needsUpdate=true;return W.tex.ruis=t;
}
/* fijne tekening als grijswaarden rond 1: k = 1/gemiddelde, zodat de textuur de kleur niet lichter of donkerder maakt */
function dzDetailTex(n,draw){let k=1;const TH=T3,t=canvasTex(n,n,(c,w,h)=>{draw(c,w,h);const px=c.getImageData(0,0,w,h).data;let s=0;for(let i=0;i<px.length;i+=16)s+=Math.pow(px[i+1]/255,2.2);k=1/(s/(px.length/16))});
  t.wrapS=t.wrapT=TH.RepeatWrapping;t.colorSpace=TH.SRGBColorSpace;t.anisotropy=ANISO;t.userData.k=k;return t}
/* tekenen over de rand heen, zodat de textuur naadloos herhaalt */
const dzRep=(w,h,x,y,m,f)=>{for(const dx of x<m?[0,w]:x>w-m?[0,-w]:[0])for(const dy of y<m?[0,h]:y>h-m?[0,-h]:[0])f(x+dx,y+dy)};
function dzSplatMat(){
  const TH=T3;if(W.mat.splat)return W.mat.splat;
  const detail=dzDetailTex,rep=dzRep;
  if(!W.tex.gras2){
    W.tex.gras2=detail(256,(c,w,h)=>{c.fillStyle='#d2d2d2';c.fillRect(0,0,w,h);c.lineCap='round';
      for(let i=0;i<4200;i++){const v=Math.round(165+Math.random()*90),x=Math.random()*w,y=Math.random()*h,l=3+Math.random()*6,dx=(Math.random()-.5)*3;c.strokeStyle=`rgba(${v},${v},${v},.4)`;c.lineWidth=1+Math.random()*.8;
        rep(w,h,x,y,10,(X,Y)=>{c.beginPath();c.moveTo(X,Y);c.quadraticCurveTo(X+dx*.3,Y-l*.6,X+dx,Y-l);c.stroke()})}});
    /* bos van ver: ronde kruinen met het licht van linksboven */
    W.tex.kruin=detail(256,(c,w,h)=>{c.fillStyle='#868686';c.fillRect(0,0,w,h);
      for(let i=0;i<420;i++){const x=Math.random()*w,y=Math.random()*h,r=8+Math.random()*9;rep(w,h,x,y,18,(X,Y)=>{const g=c.createRadialGradient(X-r*.35,Y-r*.35,1,X,Y,r);g.addColorStop(0,'rgba(232,232,232,1)');g.addColorStop(.55,'rgba(168,168,168,1)');g.addColorStop(1,'rgba(100,100,100,0)');c.fillStyle=g;c.beginPath();c.arc(X,Y,r,0,7);c.fill()})}})}
  const U=W.splatU={tN:{value:dzNoiseTex()},tCan:{value:W.tex.kruin},uK:{value:new TH.Vector3(W.tex.gras2.userData.k,1,W.tex.kruin.userData.k)},
    uHaze:{value:new TH.Color(W.mood.hor)},uRock:{value:new TH.Color('#7f7b76')},uScree:{value:new TH.Color('#a39c90')},uSnow:{value:new TH.Color('#eef2f7')},uFor:{value:new TH.Color('#3a5f2e')},uLaag:{value:1},uBerm:{value:new TH.Color('#a39c90')}};
  const m=new TH.MeshLambertMaterial({vertexColors:true,map:W.tex.gras2});
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader='attribute vec3 sp;attribute float bm;\nvarying vec3 vSp,vWq,vNw;varying float vBm;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSp=sp;vBm=bm;vWq=(modelMatrix*vec4(transformed,1.)).xyz;vNw=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader=`uniform sampler2D tN,tCan;uniform vec3 uHaze,uRock,uScree,uSnow,uFor,uK,uBerm;uniform float uLaag;
varying vec3 vSp,vWq,vNw;varying float vBm;
float dzH(float i){return fract(sin(i*12.9898)*43758.5453);}
/* gesteente in lagen: elke laag een eigen tint; van ver vloeien de lagen in elkaar over in plaats van te flikkeren */
float dzLagen(float s){float i=floor(s),t=fract(s),w=clamp(fwidth(s)*1.5,.04,1.);return mix(dzH(i),dzH(i+1.),smoothstep(1.-w,1.,t));}
`+sh.fragmentShader
      /* luchtperspectief: hoe verder weg, hoe lichter en blauwer het land */
      .replace('#include <fog_fragment>','gl_FragColor.rgb=mix(gl_FragColor.rgb,uHaze,smoothstep(120.,5200.,length(vWq-cameraPosition))*.5);\n#include <fog_fragment>')
      .replace('#include <map_fragment>','')
      .replace('#include <color_fragment>',`
      float dq=length(vWq-cameraPosition),fNear=1.-smoothstep(12.,75.,dq),fMid=1.-smoothstep(250.,1400.,dq),fR=1.-smoothstep(40.,320.,dq);
      vec3 nW=normalize(vNw);
      /* drie schalen ruis: grote vlekken, middel, fijn (de fijne alleen dichtbij) */
      vec3 na=texture2D(tN,vWq.xz/397.).rgb,nb=texture2D(tN,vWq.xz/71.+.37).rgb,nc=texture2D(tN,vWq.xz/13.7+.11).rgb;
      float fine=(nc.r-.5)*fMid;
      /* gras: sprieten dichtbij, daarbuiten alleen grote vlekken warmer en koeler groen; akkers (sp.z < 0) zonder sprieten */
      vec3 gd=texture2D(map,vWq.xz/3.3).rgb*texture2D(map,vWq.xz/12.7).rgb*uK.x*uK.x;
      float gF=fNear*.42*(1.-clamp(-vSp.z,0.,1.));
      vec3 col=vColor.rgb*mix(vec3(1.),gd,gF)*mix(vec3(1.13,1.06,.78),vec3(.82,.95,.9),smoothstep(.28,.72,na.r*.55+nb.g*.45))*(.9+.2*nb.r);
      /* bos van ver: kruinen, met een grillige bosrand */
      float fo=smoothstep(.3,.55,vSp.y+(nb.g-.5)*.35+fine*.25);
      col=mix(col,uFor*mix(vec3(.9+.26*nb.r),texture2D(tCan,vWq.xz/85.).rgb*uK.z,fMid)*(.9+.2*na.g),fo);
      /* rots: grillige rand, tint per laag (de lagen volgen de hoogte en golven mee met de ruis) */
      float rk=smoothstep(.36,.6,vSp.x+(nb.b-.5)*.42+fine*.3);
      float sy=vWq.y/6.5+(nb.r-.5)*.9+(na.g-.5)*3.;
      float l1=dzLagen(sy),l2=dzLagen(sy*.19+7.3);
      vec3 rc=mix(uScree,uRock,clamp(.2+.75*nb.g+(l1-.5)*.5*uLaag,0.,1.))*mix(1.,.8+.22*l2+.14*l1,uLaag);
      /* puinhelling zonder lagen: losse stenen, lichter en donkerder door elkaar */
      rc*=1.+(1.-uLaag)*((nc.g-.5)*.2+(texture2D(tN,vWq.xz/2.3+.4).g-.5)*.22*fNear);
      {float st=smoothstep(.25,.6,1.-nW.y),hx=abs(nW.x)/(abs(nW.x)+abs(nW.z)+1e-4);vec3 rb=mix(texture2D(tN,vec2(vWq.x/260.,vWq.y/900.)).rgb,texture2D(tN,vec2(vWq.z/260.,vWq.y/900.)).rgb,smoothstep(.3,.7,hx));rc*=1.+st*((rb.b-.45)*.5+(rb.r-.5)*.2);}
      /* dunne lagen met een donkere naad ertussen: alleen dichtbij te zien, van ver vloeien ze weg */
      float s3=sy*4.1+(nc.b-.5)*.5,f3=fwidth(s3),a3=1.-smoothstep(.15,.6,f3),l3=dzLagen(s3),seam=(1.-smoothstep(0.,.07+f3,min(fract(s3),1.-fract(s3))))*step(.42,dzH(floor(s3+.5)*1.7));
      rc*=1.+a3*uLaag*((l3-.5)*.3-seam*.2);
      col=mix(col,rc,rk);
      /* sneeuw: scherpe, grillige rand */
      float sn=smoothstep(.42,.58,max(vSp.z,0.)+(nb.r-.5)*.3+fine*.2);
      col=mix(col,uSnow,sn);
      /* berm: een strook grind langs het asfalt, hier breed en daar smal */
      vec3 nd=texture2D(tN,vWq.xz/1.7+.6).rgb;
      float gv=smoothstep(.5,.62,vBm+(nd.r-.5)*.5+(nc.g-.5)*.25);
      col=mix(col,uBerm*(.84+.26*nd.g)*mix(1.,gd.g*1.03,fNear*.5),gv);
      diffuseColor.rgb*=col;
      float hBump=mix(dot(gd,vec3(.33))*gF*.5,((l3*.2-seam*.15)*a3+l1*.3*(1.-smoothstep(.2,.7,fwidth(sy))))*uLaag,rk)*(1.-sn);`)
      /* reliëf in het licht: de tekening als hoogte gebruiken en de normaal per pixel kantelen */
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      {vec3 vp=-vViewPosition,dpx=dFdx(vp),dpy=dFdy(vp);float dhx=dFdx(hBump),dhy=dFdy(hBump);
       vec3 r1=cross(dpy,normal),r2=cross(normal,dpx);float det=dot(dpx,r1);vec3 grd=sign(det)*(dhx*r1+dhy*r2);
       normal=normalize(abs(det)*normal-grd*1.);}`)};
  return W.mat.splat=m;
}
/* ---------- 4. het verre land: één net over het hele gebied, met een gat rond de weg (daar ligt het fijne land) ---------- */
function dzFarMesh(C){
  const T=C.T,TH=T3,st=W.lite?3:2,cs=T.cs*st,nx=Math.floor((T.nx-1)/st)+1,nz=Math.floor((T.nz-1)/st)+1,nv=nx*nz;
  const pos=new Float32Array(nv*3),col=new Float32Array(nv*3),uvs=new Float32Array(nv*2),spa=new Float32Array(nv*3),sp=[0,0,0],c=new TH.Color();
  /* rond de weg ligt dit net een stukje lager (een geul); daar ligt het fijne land overheen. Is dat stuk nog niet opgebouwd,
     dan zie je van ver een groef in de helling, met een grijze streep waar de weg loopt */
  const asf=new TH.Color('#7b7c80');
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const v=j*nx+i,ci=(j*st)*T.nx+i*st,x=T.x0+i*cs,z=T.z0+j*cs,dm=T.RD[ci],ds=T.QD[ci];let y=T.H[ci];
    /* onder het fijne land: het laagste punt in de buurt nemen, zodat het grove net in een geul nooit boven het echte land uitsteekt */
    if(dm<66){let mn=y;for(let dj=-st;dj<=st;dj++)for(let di=-st;di<=st;di++){const ii=i*st+di,jj=j*st+dj;if(ii>=0&&jj>=0&&ii<T.nx&&jj<T.nz)mn=Math.min(mn,T.H[jj*T.nx+ii])}
      y=dm<56?mn-.7:y+(mn-.7-y)*clamp((66-dm)/10,0,1)}
    if(dm<26&&T.RK[ci]>=0)y=Math.min(y,C.Y[T.RK[ci]]-1.6);
    if(ds<22){const sy=T.h(T.QX[ci],T.QZ[ci]);y=Math.min(y,sy-1.3)}
    /* bos van ver zoveel als er langs dat stuk weg echt bomen staan: geen donkere bosvlekken op een kale alm */
    let fm=1;if(T.RK[ci]>=0&&dm<320){const ld=C.secP(T.RK[ci]*STEP).land,v0=(C.design.bosDeel&&C.design.bosDeel[ld])??DZFM[ld];if(v0!=null)fm=v0+(1-v0)*clamp((dm-160)/160,0,1)}
    dzGround(C,x,z,T.H[ci],c,sp,undefined,fm);if(Math.min(dm,ds)<7){c.lerp(asf,.8);sp[1]=0}
    /* bos van ver: het net ligt op kruinhoogte, zodat bosranden en heuvels met bos een silhouet hebben */
    y+=13*sp[1]*clamp((Math.min(dm,ds)-70)/50,0,1);
    pos[v*3]=x;pos[v*3+1]=y;pos[v*3+2]=z;uvs[v*2]=x/14;uvs[v*2+1]=z/14;spa.set(sp,v*3);col[v*3]=c.r;col[v*3+1]=c.g;col[v*3+2]=c.b}
  const idx=[];for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,d=a+nx,e=d+1;idx.push(a,d,b,b,d,e)}
  const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(pos,3));g.setAttribute('color',new TH.BufferAttribute(col,3));g.setAttribute('uv',new TH.BufferAttribute(uvs,2));g.setAttribute('sp',new TH.BufferAttribute(spa,3));g.setIndex(idx);g.computeVertexNormals();
  const m=new TH.Mesh(g,dzSplatMat());m.receiveShadow=true;m.userData.far2=true;m.frustumCulled=false;
  {const DC=DZC[C.route.id],U=W.splatU;U.uRock.value.copy(DC.rots);U.uScree.value.copy(DC.puin);U.uSnow.value.copy(DC.sneeuw);U.uFor.value.copy(DC.bos);U.uLaag.value=C.design.lagen??1;U.uBerm.value.copy(DC.berm||DC.puin)}
  return m;
}
/* ---------- 4b. het land buiten het raster ----------
   Het hoogteveld houdt een eind voorbij de weg op. Daarbuiten loopt het land door als grof net: dalen lopen een paar kilometer
   verder en gaan dan over in hogere ketens, die in de waas verdwijnen. Zo is nergens een rand van de wereld te zien. */
function dzOuterMesh(C){
  const T=C.T,TH=T3,TDo=C.design.terrein||{},HKo=TDo.hoogte&&typeof ROUTE_HOOGTE!=='undefined'&&ROUTE_HOOGTE[TDo.hoogte],DO=HKo&&HKo.buiten.d?HKo.buiten:null,B=TDo.buiten||(DO?{}:null);if(!B)return null;
  const zee=DO?ROUTE_SPOOR[C.design.spoor].h0:0,R=DO?Math.min(T.x0-DO.x0,DO.x0+(DO.nx-1)*DO.cel-(T.x0+(T.nx-1)*T.cs),T.z0+DO.y0+(DO.ny-1)*DO.cel,-DO.y0-(T.z0+(T.nz-1)*T.cs))-400:B.ver||9000,X0=T.x0,X1=T.x0+(T.nx-1)*T.cs,Z0=T.z0,Z1=T.z0+(T.nz-1)*T.cs,NZ=T.NZ,TL=(C.design.terrein||{}).boomgrens||290;
  /* assen: langs de rand van het raster om de ~96 m, daarbuiten steeds grovere stappen */
  const axis=(a,b)=>{const n=Math.ceil((b-a)/96),mid=[],lo=[],hi=[];for(let i=0;i<=n;i++)mid.push(a+(b-a)*i/n);let s=64,p=b,q=a;while(p<b+R){p+=s;hi.push(p);q-=s;lo.unshift(q);s*=1.16}return {v:[...lo,...mid,...hi],i0:lo.length,i1:lo.length+n}};
  const AX=axis(X0,X1),AZ=axis(Z0,Z1),xs=AX.v,zs=AZ.v,nx=xs.length,nz=zs.length,base=B.basis??300,amp=B.hoog??1300,dal=B.dal||5200;
  const hOut=(x,z)=>{const cx=clamp(x,X0,X1),cz=clamp(z,Z0,Z1),t=Math.hypot(x-cx,z-cz);let he=T.h(cx,cz);if(t<=0)return he;
    /* met een hoogtekaart: het echte land, over de eerste 500 m aansluitend op de rand van het raster */
    if(DO){const o=dzDemAt(DO,x,-z)-zee,w=clamp(t/500,0,1);return he+(o-he)*w*w*(3-2*w)}
    /* verder van de rand telt het gemiddelde van een breder stuk rand: zo wordt een dal naar buiten toe breder en staan er geen muren langs */
    {const ax=cx!==x,q=ax?cz:cx;let s=0;for(const o of[-500,-250,0,250,500])s+=ax?T.h(cx,clamp(q+o,Z0,Z1)):T.h(clamp(q+o,X0,X1),cz);he+=(s/5-he)*clamp(t/700,0,1)}
    /* vlakte:[kompasrichting, afstand]: die kant op worden de bergen lager en gaat het land over in een vlakte */
    let am=amp;if(B.vlakte){const a=B.vlakte[0]*Math.PI/180,t=((x-(X0+X1)/2)*Math.sin(a)-(z-(Z0+Z1)/2)*Math.cos(a))/B.vlakte[1];am*=clamp(.55-t*.6,.06,1)}
    const m=base+am*Math.pow(NZ.r(x/3300+1.7,z/3300-2.3,4),1.25)+NZ.f(x/700,z/700,3)*90*am/amp,L=1700+(dal-1700)*clamp((160-he)/140,0,1),w=clamp(t/L,0,1);
    return he+(m-he)*w*w*(3-2*w)};
  const nv=nx*nz,pos=new Float32Array(nv*3),col=new Float32Array(nv*3),spa=new Float32Array(nv*3),uvs=new Float32Array(nv*2),sp=[0,0,0],c=new TH.Color(),DC=DZC[C.route.id];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const v=j*nx+i,x=xs[i],z=zs[j],inX=i>=AX.i0&&i<=AX.i1,inZ=j>=AZ.i0&&j<=AZ.i1;let y;
    if(inX&&inZ){y=T.h(x,z);dzGround(C,x,z,y,c,sp,undefined,1);
      /* één rij binnen de rand ligt dit net onder het verre land, zodat er geen kier tussen zit */
      if(i>AX.i0&&i<AX.i1&&j>AZ.i0&&j<AZ.i1)y-=30}
    else{y=hOut(x,z);const e=60,sl=Math.hypot(hOut(x+e,z)-hOut(x-e,z),hOut(x,z+e)-hOut(x,z-e))/(2*e),n=NZ.f(x/38,z/38,2);
      {const TD0=C.design.terrein||{},Z0=TD0.weiTot||[140,300],KV=TD0.kaalVan??560;c.copy(DC.wei).lerp(DC.bergwei,clamp((y-Z0[0])/160,0,1)).lerp(DC.alp,clamp((y-Z0[1])/120,0,1));
      sp[0]=clamp(clamp((sl-.5)/.4,0,1)+clamp((y-KV+40)/150,0,1)*.8,0,1)}
      sp[1]=clamp((NZ.f(x/260,z/260,3)+.3)*3,0,1)*clamp((TL-y)/60,0,1)*clamp((1.1-sl)/.3,0,1)*clamp((y-(TDo.bosVan??-1e9))/60+.25,0,1);
      sp[2]=C.design.nl||(C.design.terrein||{}).sneeuw===false?0:clamp((y-(600+n*80))/60,0,1)*clamp((1.3-sl)/.4,0,1)}
    pos[v*3]=x;pos[v*3+1]=y;pos[v*3+2]=z;uvs[v*2]=x/14;uvs[v*2+1]=z/14;spa.set(sp,v*3);col[v*3]=c.r;col[v*3+1]=c.g;col[v*3+2]=c.b}
  const idx=[];for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){if(i>AX.i0&&i+1<AX.i1&&j>AZ.i0&&j+1<AZ.i1)continue;const a=j*nx+i,b=a+1,d=a+nx,e=d+1;idx.push(a,d,b,b,d,e)}
  const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(pos,3));g.setAttribute('color',new TH.BufferAttribute(col,3));g.setAttribute('uv',new TH.BufferAttribute(uvs,2));g.setAttribute('sp',new TH.BufferAttribute(spa,3));g.setIndex(idx);g.computeVertexNormals();
  const m=new TH.Mesh(g,dzSplatMat());m.userData.far2=true;m.frustumCulled=false;return m;
}
/* meren als vlak water op het peil */
function dzLakes(C){
  const TH=T3,out=[];/* elke route zijn eigen waterkleur: bergmeer blauwgroen, vaart en slotgracht donkerder */W.mat.water.color.set(C.design.water||'#2c7d96');for(const L of C.lakes||[]){const sh=new TH.Shape(L.P.map(([x,z])=>new TH.Vector2(x,-z)));
    const g=new TH.ShapeGeometry(sh,8);g.rotateX(-Math.PI/2);g.translate(0,L.peil,0);const m=new TH.Mesh(g,W.mat.water);m.userData.far2=true;out.push(m)}
  /* beken en rivieren: een lint water dat de bedding volgt, iets lichter dan het meer */
  const RM=W.mat.rivier||(W.mat.rivier=Object.assign(W.mat.water.clone(),{polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));RM.color.copy(W.mat.water.color).lerp(new TH.Color('#dff2f4'),.3);
  for(const R of C.T.water||[]){const pts=[];for(let i=0;i<R.P.length-1;i++){const A=R.P[i],B=R.P[i+1],n=Math.max(1,Math.ceil(Math.hypot(B[0]-A[0],B[1]-A[1])/10));for(let k=0;k<n;k++)pts.push(A.map((v,q)=>v+(B[q]-v)*k/n))}pts.push(R.P[R.P.length-1]);
    const pos=[],idx=[];pts.forEach(([x,z,y],i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,nx=-dz/l*R.w/2,nz=dx/l*R.w/2;
      pos.push(x-nx,y+.35,z-nz,x+nx,y+.35,z+nz);if(i)idx.push(i*2-2,i*2,i*2-1,i*2-1,i*2,i*2+1)});
    const g=new TH.BufferGeometry();g.setAttribute('position',new TH.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new TH.Mesh(g,RM);m.userData.far2=true;m.frustumCulled=false;out.push(m)}
  return out;
}
/* ---------- het wegdek ----------
   Egaal asfalt met grote zachte vlekken, een fractie lichtere rijsporen en korrel die je alleen dichtbij ziet.
   Langs de rand ligt grind over het asfalt, met een grillige grens, zodat de weg niet als een strak lint op het gras ligt. */
function dzRoadShade(m){
  const TH=T3;
  if(!W.tex.korrel)W.tex.korrel=dzDetailTex(256,(c,w,h)=>{c.fillStyle='#b9b9b9';c.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){const v=Math.random(),s=1+Math.random()*1.6;c.fillStyle=v<.5?`rgba(60,60,64,${.18+v*.3})`:`rgba(236,236,240,${(v-.5)*.5})`;c.fillRect(Math.random()*w,Math.random()*h,s,s)}});
  m.map=W.tex.korrel;
  m.onBeforeCompile=sh=>{sh.uniforms.tN={value:dzNoiseTex()};sh.uniforms.uK={value:W.tex.korrel.userData.k};sh.uniforms.uGrav=W.splatU?W.splatU.uBerm:{value:new TH.Color('#a39c90')};sh.uniforms.uAsf={value:new TH.Color('#6d6f75')};
    sh.vertexShader='varying vec3 vWr;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWr=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader='uniform sampler2D tN;uniform float uK;uniform vec3 uGrav,uAsf;\nvarying vec3 vWr;\n'+sh.fragmentShader.replace('#include <map_fragment>',`
      float dq=length(vWr-cameraPosition),fN=1.-smoothstep(6.,45.,dq);
      vec3 nA=texture2D(tN,vWr.xz/47.).rgb,nB=texture2D(tN,vWr.xz/8.3+.21).rgb,nC=texture2D(tN,vWr.xz/1.3).rgb;
      vec3 ac=uAsf*(.93+.12*nA.r)*(.96+.08*nB.g)*mix(1.,texture2D(map,vWr.xz/1.9).r*uK,fN*.5);
      float u=vMapUv.x,tr=max(max(1.-abs(u-.2)/.07,1.-abs(u-.42)/.07),max(1.-abs(u-.58)/.07,1.-abs(u-.8)/.07));
      ac*=1.+.035*clamp(tr,0.,1.);
      float eg=smoothstep(.9,.99,abs(u-.5)*2.+(nC.r-.5)*.1+(nB.b-.5)*.06);
      diffuseColor.rgb*=mix(ac,uGrav*(.8+.35*nC.g),eg*.8);`)};
}
/* ---------- 5. per kilometer: fijn land, weg, belijning, randen en begroeiing ---------- */
/* Poisson-schijf in het platte vlak: punten die minstens r uit elkaar liggen, zonder vast patroon */
function* dzPoisson(x0,z0,x1,z1,r,rnd){
  const cs=r/Math.SQRT2,gw=Math.ceil((x1-x0)/cs)+1,gh=Math.ceil((z1-z0)/cs)+1,grid=new Int32Array(gw*gh).fill(-1),pts=[],act=[];
  const fits=(x,z)=>{if(x<x0||x>x1||z<z0||z>z1)return false;const gi=Math.floor((x-x0)/cs),gj=Math.floor((z-z0)/cs);
    for(let j=Math.max(0,gj-2);j<=Math.min(gh-1,gj+2);j++)for(let i=Math.max(0,gi-2);i<=Math.min(gw-1,gi+2);i++){const q=grid[j*gw+i];if(q>=0){const dx=pts[q][0]-x,dz=pts[q][1]-z;if(dx*dx+dz*dz<r*r)return false}}return true};
  const add=(x,z)=>{pts.push([x,z]);act.push(pts.length-1);grid[Math.floor((z-z0)/cs)*gw+Math.floor((x-x0)/cs)]=pts.length-1};
  add(x0+rnd()*(x1-x0),z0+rnd()*(z1-z0));
  /* ook verspreid nieuwe beginpunten, zodat losse delen (aan beide kanten van een bocht) gevuld worden */
  for(let t=0;t<40;t++){const x=x0+rnd()*(x1-x0),z=z0+rnd()*(z1-z0);if(fits(x,z))add(x,z)}
  let it=0;while(act.length){if(++it%700===0)yield;const ai=Math.floor(rnd()*act.length),[px,pz]=pts[act[ai]];let ok=false;
    for(let t=0;t<18;t++){const a=rnd()*Math.PI*2,d=r*(1+rnd()),x=px+Math.cos(a)*d,z=pz+Math.sin(a)*d;if(fits(x,z)){add(x,z);ok=true;break}}
    if(!ok){act[ai]=act[act.length-1];act.pop()}}
  return pts;
}
function* dzChunkJob(ci){
  const C=W.C,T=C.T,M=W.mat,TH=T3,cl=ci%C.lapKm,a=cl*CH;if(a>=C.L||W.chunks.has(ci))return;
  const g=new TH.Group(),r=rng(C.seed+cl*7919+3),end=Math.min(C.L,a+CH),k0=Math.round(a/STEP),k1=Math.round(end/STEP);
  const geo=(pos,idx,col,uv)=>{const q=new TH.BufferGeometry();q.setAttribute('position',new TH.Float32BufferAttribute(pos,3));if(col)q.setAttribute('color',new TH.Float32BufferAttribute(col,3));if(uv)q.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));q.setIndex(idx);q.computeVertexNormals();return q};
  const tmp=new TH.Color(),berm=new TH.Color('#a8a070'),pave=new TH.Color('#a59f94');
  /* --- fijn land langs de weg, tot 56 m opzij; in een haarspeldbocht afgekapt halverwege het andere been --- */
  {const REL=[-.25,.6,1.7,3.2],ABS=[7.5,10.5,14,19,25,32,40,48,56],rows=Math.ceil((end-a)/DS)+1,pos=[],col=[],uv=[],idx=[],spl=[],bml=[],sp=[0,0,0];let nc=0;
    for(let j=0;j<rows;j++){if(j%30===29)yield;
      const d=Math.min(C.L-.01,a+j*DS),p=roadAt(C,d),hw=C.hwAt(d),nx=Math.cos(p.h),nzv=Math.sin(p.h),land=C.secP(d).land,onBr=(C.bridges||[]).some(([b0,b1])=>d>b0+2&&d<b1-2);
      const bnd={'-1':clipOff(C,d,p,innerOff(-60,p.k)),'1':clipOff(C,d,p,innerOff(60,p.k))},OFF=[];
      for(const s of[-1,1]){const L=[...REL.map(o=>hw+o),...ABS].map(o=>s*o);if(s<0)OFF.push(...L.reverse());else OFF.push(...L)}
      nc=OFF.length;
      for(const off0 of OFF){const [b]=bnd[Math.sign(off0)],o1=innerOff(off0,p.k),off=Math.abs(o1)>Math.abs(b)?b:o1,ao=Math.abs(off0);
        const x=p.x+nx*off,z=p.z+nzv*off;let y;
        if(ao<=hw+.3)y=p.y-.1;else if(onBr)y=Math.min(p.y-.4,T.h(x,z));else{const t=clamp((ao-hw-.3)/3.4,0,1),th=T.h(x,z);y=p.y-.12+(th-p.y+.12)*t*t*(3-2*t)}
        if(ao>=55)y-=1.8;else if(ao>=47)y-=.3;
        pos.push(x,y,z);uv.push(x/14,z/14);
        dzGround(C,x,z,y,tmp,sp,land,(C.design.bosDeel&&C.design.bosDeel[land])??DZFM[land]??1);/* langs het asfalt: grind (bm, het materiaal tekent de rand) en daarnaast wat droger, platgereden gras */
        let bm=0;if(ao<hw+.7){tmp.lerp(berm,.3);sp[0]*=.3;sp[2]=0;bm=ao<hw?1:.47}else if(ao<hw+1.8&&land!=='dorp'){tmp.lerp(berm,.15);sp[2]*=.3}if(land==='dorp'){bm=0;if(ao<hw+2.8)tmp.lerp(pave,.8)}bml.push(bm);
        col.push(tmp.r,tmp.g,tmp.b);spl.push(sp[0],sp[1],sp[2])}}
    for(let j=0;j<rows-1;j++)for(let i=0;i<nc-1;i++){if(i===nc/2-1)continue;const q=j*nc+i;idx.push(q,q+1,q+nc,q+1,q+nc+1,q+nc)}
    const tg=geo(pos,idx,col,uv);tg.setAttribute('sp',new TH.Float32BufferAttribute(spl,3));tg.setAttribute('bm',new TH.Float32BufferAttribute(bml,1));const tm=new TH.Mesh(tg,dzSplatMat());tm.receiveShadow=true;g.add(tm)}
  yield;
  /* --- de weg: breedte en tint per sectie --- */
  const TINT={dorp:[1.02,1,.98],dal:[1,1,1.02],bosrand:[.97,.98,1],rots:[1.04,1.04,1.06],bos:[.95,.96,.98],boomgrens:[1.03,1.03,1.05],alpen:[1.05,1.05,1.07],pas:[1.08,1.07,1.08],alm:[1.02,1.02,1.04],loofbos:[.96,.97,.98],westdal:[1,1,1.02],weide:[1,1,1.02],akker:[1.03,1.02,1.01],boomgaard:[1,1,1.01],hellingbos:[.95,.96,.97],holleweg:[.92,.93,.94],polder:[1.03,1.03,1.05],dijk:[1.05,1.05,1.06]};
  {const ap=[],au=[],ac=[],ai=[],RS=4,rr=Math.ceil((end-a)/RS)+1;
    for(let j=0;j<rr;j++){const d=Math.min(C.L-.01,a+j*RS),p=roadAt(C,d),hw=C.hwAt(d),nx=Math.cos(p.h),nzv=Math.sin(p.h);let tr=0,tg=0,tb=0;
      for(const [i,w] of C.secMix(d)){const t=TINT[C.sec[i].p.land]||[1,1,1];tr+=t[0]*w;tg+=t[1]*w;tb+=t[2]*w}
      for(const o of[-hw,-hw+1.4,hw-1.4,hw]){ap.push(p.x+nx*o,p.y+(Math.abs(o)>hw-.1?-.06:0),p.z+nzv*o);au.push((o/hw+1)/2,d/48);ac.push(tr,tg,tb)}
      if(j<rr-1){const q=j*4;for(let i=0;i<3;i++)ai.push(q+i,q+i+1,q+i+4,q+i+1,q+i+5,q+i+4)}}
    const am=new TH.Mesh(geo(ap,ai,ac,au),M.asf);am.receiveShadow=true;g.add(am)}
  /* --- belijning --- */
  {const lp=[],li=[],strip=(d0,d1,o0,o1,yy)=>{const b0=lp.length/3,n=Math.max(1,Math.ceil((d1-d0)/2));for(let i=0;i<=n;i++){const dd=d0+(d1-d0)*i/n,q=roadAt(C,dd),cx=Math.cos(q.h),cz=Math.sin(q.h),hw=C.hwAt(dd);
      for(const o of[o0,o1]){const oo=o>0?Math.min(o,hw):Math.max(o,-hw),ry=Math.abs(oo)>hw-1.4?-.06*(Math.abs(oo)-(hw-1.4))/1.4:0;lp.push(q.x+cx*oo,q.y+ry+yy,q.z+cz*oo)}
      if(i)li.push(b0+i*2-2,b0+i*2-1,b0+i*2,b0+i*2-1,b0+i*2+1,b0+i*2)}};
    for(let d=a;d<end;d+=4){const L=C.secP(d).lijn,d1=Math.min(end,d+4),hw=C.hwAt(d);
      if(L==='kant'||L==='beide')for(const s of[-1,1])strip(d,d1,s*(hw-.32),s*(hw-.2),.022)}
    /* middenstreep: 3 m streep, 9 m gat (Frans), in een vast ritme langs de hele ronde */
    for(let d=Math.ceil(a/12)*12;d<end;d+=12){const L=C.secP(d).lijn;if(L==='midden'||L==='beide')strip(d,Math.min(d+3,C.L-.01),-.06,.06,.022)}
    if(li.length){const lm=new TH.Mesh(geo(lp,li),M.line);lm.receiveShadow=true;g.add(lm)}}
  yield;
  /* --- zijwegen en rotondes die hier beginnen --- */
  for(const S of C.sideRoads)if(S.at>=a&&S.at<end){
    const ap=[],au=[],ai=[],sk=[],ski=[],n=Math.ceil(S.vis/STEP);
    for(let k=0;k<=n;k++){const x=S.X[k],z=S.Z[k],y=S.Y[k]+.03,h=S.HD[k],nx=Math.cos(h),nzv=Math.sin(h),hw=S.hw*(k===n?.6:1);
      for(const o of[-hw,hw]){ap.push(x+nx*o,y,z+nzv*o);au.push(o>0?1:0,k*STEP/48)}
      for(const o of[-hw,hw])sk.push(x+nx*o,y,z+nzv*o,x+nx*o*1.12,y-1.4,z+nzv*o*1.12);
      if(k<n){const q=k*2;ai.push(q,q+2,q+1,q+1,q+2,q+3);const s0=k*4;ski.push(s0,s0+1,s0+4,s0+1,s0+5,s0+4,s0+2,s0+6,s0+3,s0+3,s0+6,s0+7)}}
    const m=new TH.Mesh(geo(ap,ai,new Array(ap.length).fill(.97),au),M.asf);m.receiveShadow=true;g.add(m);
    if(!M.skirt)M.skirt=new TH.MeshLambertMaterial({color:'#6b6553',side:TH.DoubleSide});g.add(new TH.Mesh(geo(sk,ski),M.skirt));
  }
  for(const R0 of C.rounds)if(R0.at>=a&&R0.at<end){
    /* ringweg en middeneiland met stoeprand en gras */
    const ring=new TH.RingGeometry(R0.r-3.6,R0.r+3.6,48,1);ring.rotateX(-Math.PI/2);
    const pa=ring.attributes.position;for(let i=0;i<pa.count;i++){const x=pa.getX(i)+R0.x,z=pa.getZ(i)+R0.z;pa.setXYZ(i,x,R0.y+.02,z)}
    const uvs=[];for(let i=0;i<pa.count;i++)uvs.push((Math.hypot(pa.getX(i)-R0.x,pa.getZ(i)-R0.z)-R0.r+3.6)/7.2,0);ring.setAttribute('uv',new TH.Float32BufferAttribute(uvs,2));ring.setAttribute('color',new TH.Float32BufferAttribute(new Array(pa.count*3).fill(1),3));ring.computeVertexNormals();
    const rm=new TH.Mesh(ring,M.asf);rm.receiveShadow=true;g.add(rm);
    const isl=new TH.CylinderGeometry(R0.r-3.7,R0.r-3.5,.3,40);const im=new TH.Mesh(isl,new TH.MeshLambertMaterial({color:'#c9c4b8'}));im.position.set(R0.x,R0.y+.15,R0.z);g.add(im);
    const gr=new TH.CylinderGeometry(R0.r-4.1,R0.r-4.1,.35,40);const gm=new TH.Mesh(gr,new TH.MeshLambertMaterial({color:'#5f9a3e'}));gm.position.set(R0.x,R0.y+.2,R0.z);gm.receiveShadow=true;g.add(gm);
  }
  yield;
  /* --- objecten --- */
  const lists={},put=(k,x,y,z,s,ry,col,sy,tl)=>{(lists[k]=lists[k]||[]).push([x,y,z,s,ry,col,sy,tl])};
  const tint=(l,h)=>{const c=new TH.Color(1,1,1);c.offsetHSL((r()-.5)*(h||.04),(r()-.5)*.15,(r()-.5)*(l||.18));return c};
  const KC=W.KC||{},pick=L=>L[Math.floor(r()*L.length)];
  const KN=n=>KC.naald&&KC.naald.find(k=>k.endsWith(n));
  const ALP=[KN('pineSmallA'),KN('cone'),KN('pineRoundA')].filter(Boolean),PINES=(KC.naald||[]).slice(),LOOF=(KC.loof||[]).slice(),SHR=(KC.struik||[]).slice(),ROCK=(KC.rots||[]).slice();
  /* dichtbij: volle boom met schaduw (*); verder weg: eenvoudige versie (~) zonder schaduw */
  const BIG={boom:1.45,eik:1.3,berk:1.35,populier:1.5,plataan:1.15,cipres:1.35,parasolden:1.3,ceder:1.5,steeneik:1.2};
  const tree=(k,x,y,z,s,near)=>{s*=BIG[k]||1;k+=near?'*':W.G[k+'~']?'~':'';put(k,x,y-.15,z,s,r()*6,tint(),s*(.85+r()*.35),(r()-.5)*.06);if(near)put('blob',x,y+.05,z,s*2.2,0)};
  const FARP=[KN('pineTallA'),KN('pineTallB'),KN('cone')].filter(Boolean);
  /* wat er groeit, per landschap: [kans op boom bij vol bos, kans op boom in de wei, soorten] */
  const VEG={dorp:[.2,.06,['boom','fruitboom','berk','loof']],dal:[.55,.05,['boom','eik','berk','loof','fruitboom']],westdal:[.55,.05,['populier','boom','eik','loof']],
    bosrand:[.85,.12,['den','pine','loof','berk']],rots:[.85,.04,['den','pine','den']],bos:[1,.5,['den','pine','pine','den','pine','den','pine','berk']],boomgrens:[.55,.06,['den','pine','alp']],
    alpen:[.2,.02,['alp']],pas:[0,0,['alp']],alm:[.6,.04,['den','pine','alp']],loofbos:[.95,.4,['loof','eik','boom','berk','den','loof']],
    weide:[.5,.035,['eik','boom','loof','fruitboom','berk']],akker:[.35,.008,['eik','boom','loof','populier']],boomgaard:[.35,.02,['fruitboom','eik','boom']],
    hellingbos:[1,.45,['eik','boom','loof','eik','berk','boom']],holleweg:[1,.7,['eik','loof','boom','eik']],polder:[.25,.004,['populier','knotwilg','boom']],dijk:[.1,.002,['populier','boom']]};
  let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;for(let k=k0;k<=k1;k++){bx0=Math.min(bx0,C.X[k]);bx1=Math.max(bx1,C.X[k]);bz0=Math.min(bz0,C.Z[k]);bz1=Math.max(bz1,C.Z[k])}
  const owns=(x,z)=>{const k=T.near(x,z);return k>=k0&&k<k1};
  /* hoogte van de grond vlak naast de weg, precies zoals het fijne land hierboven */
  const yAt=(p,hw,ao,x,z)=>{if(ao<=hw+.3)return p.y-.1;const t=clamp((ao-hw-.3)/3.4,0,1),th=T.h(x,z);return p.y-.12+(th-p.y+.12)*t*t*(3-2*t)};
  const foot=(x,y,z,R)=>dzFoot(T,x,y,z,R);
  /* bomen: Poisson-schijf, daarna per punt kijken of hier bos, wei of rots is */
  const D0=C.design,PT=yield* dzPoisson(bx0-60,bz0-60,bx1+60,bz1+60,W.lite?6:4.6,r);yield;
  let cnt=0;
  for(const [x,z] of PT){if(++cnt%400===0)yield;
    if(!owns(x,z))continue;const dm=T.distMain(x,z),ds=T.distSide(x,z);if(dm>57)continue;
    const k=T.near(x,z),d=k*STEP,P=C.secP(d),hw=C.hwAt(d);if(dm<30&&T.exact(x,z)<hw+2.6)continue;if(ds<12&&T.exact(x,z)<hw+2.6)continue;if(C.lakeAt&&C.lakeAt(x,z))continue;if(T.waterAt(x,z)<1.5)continue;
    const pp=roadAt(C,d),y=dm<hw+4?yAt(pp,hw,dm,x,z):T.h(x,z),sl=T.slope(x,z),V=(D0.groen&&D0.groen[P.land])||VEG[P.land]||VEG.dal,u=r(),KL=P.land==='kaal',WEI=ALPWEI.has(P.land)||(D0.weiland||[]).includes(P.land);
    let F=T.forest(x,z,y);if(P.land==='bos'||LOOFBOS.has(P.land))F=Math.max(F,.9);
    const ptree=F*V[0]*(.55+.45*(P.dicht??.5))*1.15+V[1];
    /* kavelgrenzen: hier en daar een rij bomen of een heg */
    if(D0.velden&&!LOOFBOS.has(P.land)&&P.land!=='dorp'&&sl<.4&&(D0.velden.tot==null||y<D0.velden.tot)){const K=dzParcel(C,x,z);if(K.e<2.6&&K.rand<(D0.velden.rijen??.3)){
      if(K.rand<(D0.velden.rijen??.3)*.45)put('heg',x,y,z,1.1+r()*.3,-(D0.velden.hoek||0)*Math.PI/180,tint(.12,.04));
      else tree(D0.velden.rijboom?pick(D0.velden.rijboom):pick(['eik','boom','eik','populier']),x,y,z,.95+r()*.35,dm<24);continue}}
    if(sl<1.25&&u<ptree){/* verder van de weg staat het bos wat ijler: dat scheelt veel tekenwerk en valt niet op */if(dm>36&&r()<.4)continue;const kind=pick(V[2]),near=dm<16,s=.85+r()*.5;
      if(LOOFBOS.has(P.land)&&dm<30&&r()<.45){const ux=x+(r()-.5)*3,uz=z+(r()-.5)*3;if(T.exact(ux,uz)>hw+2.4)put(r()<.5?'varen':(SHR.length&&r()<.5?pick(SHR):'struik'),ux,T.h(ux,uz),uz,.7+r()*.6,r()*6,tint(.25,.05))}
      /* naaldbomen: eigen sparren in drie vormen, verschillend van hoogte */
      if(kind==='pine'||kind==='den'){const sk=pick(['spar1','spar2','spar3','spar1','spar2']);put(sk+(near?'*':'~'),x,y-.1,z,s*(.8+r()*.55),r()*6,tint(.3,.06),s*(.9+r()*.6),(r()-.5)*.07);
        /* ondergroei onder bomen dicht bij de weg: varens en struiken */
        if(dm<26&&F>.4&&r()<.55){const ux=x+(r()-.5)*3.5,uz=z+(r()-.5)*3.5;if(T.exact(ux,uz)>hw+2.6)put('varen',ux,T.h(ux,uz),uz,.7+r()*.6,r()*6,tint(.2,.05))}}
      /* in het loofbos de bomen uit de bibliotheek (licht), in de bergen eigen loofbomen tussen de sparren */
      else if(kind==='loof'&&LOOFBOS.has(P.land)&&LOOF.length)put(pick(LOOF)+(near?'*':'~'),x,y-.1,z,s,r()*6,tint(.16,.05),s*(.9+r()*.3));
      else if(kind==='loof')tree(pick(['boom','berk','boom']),x,y,z,s*(.85+r()*.3),near);
      else if(kind==='alp'&&ALP.length)put(pick(ALP),x,y-.1,z,s*(.45+r()*.35),r()*6,tint(.12,.03));
      else tree(kind,x,y,z,s,near);continue}
    /* geen boom: soms een rots, struik of keien */
    const v=r();
    /* rotsen in groepjes: waar de ruis het zegt, en vooral op steile of hoge plekken */
    const rc=T.NZ.f(x/70+11,z/70-4,2),rp=(rc>.2?.55:.03)*clamp((sl-.45)*2+(y>320?.6:0),0,1);
    /* rotspartijen op steile hellingen; dicht bij de weg kleiner, zodat ze nooit over het wegdek hangen */
    if(!D0.nl&&sl>.85&&sl<2.2&&v<.1+rc*.22&&dm>hw+6){const sc=Math.min(2.6+r()*3.6,(dm-hw-2)*.45);put(r()<.5?'rotspartij':'rotspartij2',x,foot(x,y,z,sc*1.1)-.35*sc,z,sc,r()*6,tint(.08,0),sc*(.8+r()*.5));continue}
    if(v<rp&&sl<1.7&&!D0.nl){const R2=r()<.55?'rotsblok':'rots',sc=(.7+r()*1.5)*(sl>1.3?1.5:1);put(R2,x,foot(x,y,z,sc*.8)-.3*sc,z,sc,r()*6,tint(.1,0),sc*(.6+r()*.7))}
    else if((P.land==='pas'||P.land==='alpen'||KL)&&v<(P.land==='alpen'?.025:KL?.035:.07)&&dm>hw+9){const sc=Math.min(1.6+r()*2.6,(dm-hw-4)*.35);put(r()<.5?'rotspartij':'rotspartij2',x,foot(x,y,z,sc*1.1)-.4*sc,z,sc,r()*6,tint(.08,0),sc*(.5+r()*.6))}
    else if(v<.1&&P.land!=='pas'&&!KL){put('struik',x,y,z,.6+r()*.7,r()*6,tint())}
    else if(v<.13&&y>250&&rc>0&&!D0.nl)put('keien',x,y,z,.7+r(),r()*6,tint(.15,0));
    /* open wei: graspollen, stenen op de hellingen en bloemen in plekken, zodat een helling geen kaal groen vlak is */
    else if(KL){if(v<.3)put('keien',x,y-.05,z,.6+r()*1.2,r()*6,tint(.1,0))}
    else if(F<.5&&WEI&&!(C.lakeAt&&C.lakeAt(x,z))){const fl=T.NZ.f(x/40-3,z/40+8,2);
      {const w=r();if(sl>.35&&w<.22&&!D0.nl)put('keien',x,y-.05,z,.7+r()*1.1,r()*6,tint(.15,0));
        else if(fl>.25&&w<.75&&P.land!=='pas')put(r()<.5?'bloem':r()<.5?'madelief':'klaproos',x,y,z,.8+r()*.6,r()*6,tint(.1,.05));
        else if(w<.85)put('pol',x,y,z,.8+r()*.9,r()*6,tint(.2,.06))}}
  }
  yield;
  /* gewassen op de kavels, in rijen langs de lange kant: wijnranken, lavendel, olijfgaarden en kersenboomgaarden.
     velden.gewas loopt gelijk op met velden.kleuren: per kleur welk gewas (of niets) */
  if(D0.velden&&D0.velden.gewas){const V=D0.velden,a0=(V.hoek||0)*Math.PI/180,ca=Math.cos(a0),sa=Math.sin(a0),GW={wijn:['wijnrij',2.7,10],lavendel:['lavendel',2.4,10.4],olijf:['olijf',8.5,8.5],kers:['fruitboom',7,7]};
    let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const [x,z] of[[bx0-60,bz0-60],[bx1+60,bz0-60],[bx0-60,bz1+60],[bx1+60,bz1+60]]){const u=x*ca+z*sa,v=-x*sa+z*ca;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v)}
    for(const kind in GW){if(!V.gewas.includes(kind))continue;const [obj,du,dv]=GW[kind];let cnt2=0;
      for(let u=Math.ceil(u0/du)*du;u<u1;u+=du)for(let v=Math.ceil(v0/dv)*dv;v<v1;v+=dv){if(++cnt2%3000===0)yield;const x=u*ca-v*sa,z=u*sa+v*ca;
        if(!owns(x,z))continue;const dm=T.distMain(x,z);if(dm>57||T.distSide(x,z)<9)continue;const k=T.near(x,z),d=k*STEP,hw=C.hwAt(d);if(dm<40&&T.exact(x,z)<hw+6)continue;
        const y=T.h(x,z);if(V.tot!=null&&y>V.tot)continue;const P=C.secP(d);if(P.land==='dorp'||P.land==='bos'||T.slope(x,z)>.3||T.forest(x,z,y)>.45)continue;
        const K=dzParcel(C,x,z);if(K.crop<0||V.gewas[K.crop%V.gewas.length]!==kind||K.e<2.2||K.ev<3)continue;
        if(obj==='olijf'||obj==='fruitboom')tree(obj,x+(r()-.5),y,z+(r()-.5),.9+r()*.3,dm<22);else put(obj,x,y,z,1,-a0,tint(.1,.03))}}}
  yield;
  /* berm: graspollen, bloemen en paaltjes */
  for(let d=a+2;d<end;d+=2.2+r()*2){const p=roadAt(C,d),hw=C.hwAt(d),P=C.secP(d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
    for(const s of[-1,1]){if(r()<.25)continue;const o=s*(hw+.4+r()*2.2),x=p.x+nx*o,z=p.z+nzv*o;if(T.near(x,z)<k0||T.near(x,z)>=k1||T.distSide(x,z)<3)continue;
      const y=yAt(p,hw,Math.abs(o),x,z);if(W.lite&&r()<.5)continue;
      if(P.land==='kaal'){if(r()<.35)put('keien',x,y,z,.4+r()*.6,r()*6,tint(.1,0));continue}
      if(P.land==='pas'&&r()<.5)put('keien',x,y,z,.5+r()*.6,r()*6,tint(.15,0));else put('pol',x,y,z,.45+r()*.7,r()*6,tint(.2,.06));
      if(P.land!=='pas'&&P.land!=='dorp'&&r()<.07)put(r()<.5?'bloem':'madelief',x,y,z,.8+r()*.4,r()*6)}}
  /* reflectorpaaltjes op wisselende afstanden */
  for(let d=a+r()*30;d<end;d+=28+r()*40){const P=C.secP(d);if(P.rand==='stoep')continue;if(P.rand==='sneeuw')d-=14;const p=roadAt(C,d),hw=C.hwAt(d);
    for(const s of[-1,1]){const o=s*(hw+.55),x=p.x+Math.cos(p.h)*o,z=p.z+Math.sin(p.h)*o;if(T.distSide(x,z)<6)continue;put(P.rand==='sneeuw'?'sneeuwpaal':'paal',x,yAt(p,hw,hw+.55,x,z),z,1,-p.h+(s<0?Math.PI:0))}}
  yield* dzExtras({g,C,T,a,end,put,tree,tint,r,yAt});
  yield;
  let nk=0;for(const key in lists){if(!W.G[key]&&!W.G[key.replace(/[~*]$/,'')])continue;const im=instMesh(key,lists[key]);im.castShadow=key.endsWith('*')||key==='paal';g.add(im);if(++nk%6===0)yield}
  W.root.add(g);W.chunks.set(ci,g);
}

/* ---------- 6. eigen modellen voor de bergen: stenen huis, herberg, hooischuur, berghut, zagerij, paal van de galerij ---------- */
function dzGeos(){
  const TH=T3,G=W.G;if(G.steenhuis)return;
  const prism=(w,rh,len,ov=.4)=>{const s=new TH.Shape();s.moveTo(-w/2-ov,0);s.lineTo(w/2+ov,0);s.lineTo(0,rh);s.closePath();return new TH.ExtrudeGeometry(s,{depth:len+ov*2,bevelEnabled:false}).translate(0,0,-len/2-ov)};
  const win=(P,x,y,z,fr,ry)=>{const m=a=>{const q=M4(0,0,0);q.makeRotationY(ry||0);q.setPosition(x,y,z);return q.multiply(M4(0,0,a))};P.push([new TH.BoxGeometry(1,1.25,.06),fr,m(0)],[new TH.BoxGeometry(.8,1.05,.07),'#2f3b47',m(.01)],[new TH.BoxGeometry(.32,1.15,.08),'#6e3f24',m(-.01).multiply(M4(-.62,0,0))],[new TH.BoxGeometry(.32,1.15,.08),'#6e3f24',m(-.01).multiply(M4(.62,0,0))])};
  /* stenen huis met houten verdieping en een flauw dak met overstek */
  {const P=[],w=7,d=8.5;P.push([new TH.BoxGeometry(w,3.2,d),'#cdc3b2',M4(0,1.6,0)],[new TH.BoxGeometry(w+.1,2.6,d+.1),'#8a5a35',M4(0,4.5,0)],[prism(w+.6,2.4,d,.8),'#5a524c',M4(0,5.8,0)]);
    for(const x of[-2,2])win(P,x,1.9,d/2+.03,'#efe9de');win(P,-2,4.4,d/2+.06,'#e8dcc4');win(P,2,4.4,d/2+.06,'#e8dcc4');P.push([new TH.BoxGeometry(1.1,2.2,.08),'#5a3a22',M4(0,1.1,d/2+.04)],[new TH.BoxGeometry(w+.6,.12,1.3),'#7a5030',M4(0,3.3,d/2+.6)]);
    for(let i=0;i<9;i++)P.push([new TH.BoxGeometry(.07,.9,.07),'#7a5030',M4(-w/2+.1+i*(w-.2)/8,3.8,d/2+1.2)]);P.push([new TH.BoxGeometry(w+.6,.08,.08),'#7a5030',M4(0,4.25,d/2+1.2)]);
    P.push([new TH.BoxGeometry(.7,1.6,.7),'#8b8178',M4(1.8,7.2,-1.5)]);G.steenhuis=partsGeo(P)}
  /* herberg: groot, drie lagen, balkons rondom, uithangbord */
  {const P=[],w=11,d=10;P.push([new TH.BoxGeometry(w,3.4,d),'#ece4d4',M4(0,1.7,0)],[new TH.BoxGeometry(w,5.2,d),'#9a6a40',M4(0,6,0)],[prism(w+.8,3.2,d,1),'#4e4846',M4(0,8.6,0)]);
    for(const x of[-3.6,-1.2,1.2,3.6])win(P,x,1.9,d/2+.03,'#fff');for(const y of[4.6,7])for(const x of[-3.6,-1.2,1.2,3.6])win(P,x,y,d/2+.06,'#f1e6cc');
    for(const y of[3.5,5.9]){P.push([new TH.BoxGeometry(w+.4,.14,1.4),'#6e4426',M4(0,y,d/2+.7)]);for(let i=0;i<14;i++)P.push([new TH.BoxGeometry(.07,.95,.07),'#6e4426',M4(-w/2+i*w/13,y+.5,d/2+1.35)])}
    P.push([new TH.BoxGeometry(2.6,.7,.08),'#2e5d3a',M4(-3.2,3,d/2+.05)],[new TH.BoxGeometry(1.4,2.3,.08),'#4a2f1d',M4(0,1.15,d/2+.04)]);G.herberg=partsGeo(P)}
  /* hooischuur: donker hout op een stenen voet, grote deur */
  {const P=[],w=8,d=11;P.push([new TH.BoxGeometry(w,1.4,d),'#a9a093',M4(0,.7,0)],[new TH.BoxGeometry(w,4.2,d),'#5e3f27',M4(0,3.5,0)],[prism(w+.6,3,d,.7),'#47423f',M4(0,5.6,0)],[new TH.BoxGeometry(3.2,3,.1),'#4a3220',M4(0,3,d/2+.05)]);
    for(let i=0;i<8;i++)P.push([new TH.BoxGeometry(.05,4.1,.05),'#4a3220',M4(-w/2+.5+i,3.5,d/2+.04)]);G.hooischuur=partsGeo(P)}
  /* berghut: stenen begane grond, houten top, vlaggenmast, picknicktafels ervoor */
  {const P=[],w=9,d=7;P.push([new TH.BoxGeometry(w,3,d),'#b9b0a2',M4(0,1.5,0)],[new TH.BoxGeometry(w,2.4,d),'#7c4f2c',M4(0,4.2,0)],[prism(w+.6,2.6,d,.7),'#c23b2c',M4(0,5.4,0)]);
    for(const x of[-2.8,0,2.8])win(P,x,1.8,d/2+.03,'#fff');P.push([new TH.BoxGeometry(5,.5,.06),'#f4efe3',M4(0,3.7,d/2+.05)]);
    P.push([new TH.CylinderGeometry(.06,.06,8,6),'#d9d9d9',M4(-w/2-1.5,4,d/2+1)],[new TH.BoxGeometry(.04,1,1.6),'#d62828',M4(-w/2-1.5,7.4,d/2+1.82)]);
    for(const x of[-2.5,2.5]){P.push([new TH.BoxGeometry(2,.08,.8),'#8a6a4a',M4(x,.75,d/2+3)],[new TH.BoxGeometry(2,.06,.3),'#8a6a4a',M4(x,.45,d/2+2.4)],[new TH.BoxGeometry(2,.06,.3),'#8a6a4a',M4(x,.45,d/2+3.6)])}
    G.berghut=partsGeo(P)}
  /* zagerij: open loods op palen, stapels stammen, zaagbank */
  {const P=[],w=14,d=8;for(const x of[-6.5,-2.2,2.2,6.5])for(const z of[-3.5,3.5])P.push([new TH.BoxGeometry(.3,4,.3),'#5e4330',M4(x,2,z)]);
    P.push([prism(w,2.2,d,.8),'#5a524c',M4(0,4,0)],[new TH.BoxGeometry(w,.2,d),'#8a7a62',M4(0,.1,0)],[new TH.BoxGeometry(6,.9,1),'#6b5a48',M4(0,.6,0)],[new TH.CylinderGeometry(.9,.9,.05,24),'#c9ccd1',M4(.5,1.2,0,1,1,1)]);
    for(let i=0;i<5;i++)for(let j=0;j<3-(i>2?1:0);j++)P.push([new TH.CylinderGeometry(.32,.32,7,8),j%2?'#8a6240':'#9b7048',(()=>{const m=new TH.Matrix4().makeRotationX(Math.PI/2);m.setPosition(-9+i*.62,.32+j*.56,0);return m})()]);
    G.zagerij=partsGeo(P)}
  /* pijler van de lawinegalerij */
  /* pijler met voet en een schuine schoor naar het dak (zoals bij echte galerijen), beton met wat vlekken */
  {const sch=new TH.BoxGeometry(.5,2.4,.7);sch.rotateZ(.62);
    G.pilaar=partsGeo([[new TH.BoxGeometry(.8,5.4,1),'#a29d94',M4(0,2.7,0)],[new TH.BoxGeometry(1.2,.5,1.4),'#8e8a82',M4(0,.25,0)],[new TH.BoxGeometry(1.1,.45,1.3),'#97928a',M4(0,5.25,0)],[sch,'#a29d94',M4(-.75,4.4,0)]])}
  /* dwarsbalk onder het dak van de galerij */
  G.galbalk=partsGeo([[new TH.BoxGeometry(10.2,.6,.55),'#9b968e',M4(0,0,0)]]);
  /* richtingbord: gele Franse wegwijzer op twee palen */
  G.paalgrijs=partsGeo([[new TH.CylinderGeometry(.05,.05,2.6,6),'#9aa0a6',M4(0,1.3,0)]]);
  /* telescoop op het uitkijkpunt en een stenen steenman */
  G.kijker=partsGeo([[new TH.CylinderGeometry(.06,.08,1.1,8),'#5c636b',M4(0,.55,0)],[new TH.CylinderGeometry(.13,.16,.7,10),'#2d6d9e',(()=>{const m=new TH.Matrix4().makeRotationX(1.2);m.setPosition(0,1.25,.05);return m})()]]);
  /* wegkruis (Limburg): houten kruis met een dakje; brugleuning van een vaartbrug */
  G.wegkruis=partsGeo([[new TH.BoxGeometry(.7,.5,.5),'#9b958a',M4(0,.25,0)],[new TH.BoxGeometry(.16,3.4,.16),'#4a3626',M4(0,1.9,0)],[new TH.BoxGeometry(1.3,.14,.14),'#4a3626',M4(0,2.8,0)],
    [prism(.9,.35,.3,.12),'#3b2c20',M4(0,3.6,0)],[new TH.BoxGeometry(.12,.7,.06),'#e9e4da',M4(0,2.55,.11)],[new TH.BoxGeometry(.7,.08,.05),'#e9e4da',M4(0,2.78,.11)]]);
  G.brugpaal=partsGeo([[new TH.BoxGeometry(.14,1.1,.14),'#f2f2ef',M4(0,.55,0)]]);
  G.brugleuning=partsGeo([[new TH.BoxGeometry(.09,.09,2.05),'#f2f2ef',M4(0,0,0)],[new TH.BoxGeometry(.06,.06,2.05),'#f2f2ef',M4(0,-.45,0)]]);
  G.steenman=partsGeo([0,1,2,3,4,5].map(i=>[new TH.DodecahedronGeometry(.6-i*.08,0),'#9a958d',M4(Math.sin(i*2.3)*.1,.4+i*.55,Math.cos(i*1.7)*.1,1,.7,1,i)]));
}

/* ---------- 7. borden ---------- */
/* Frans kilometerpaaltje van een col: geel-wit, met afstand tot de top en de stijging van de komende kilometer */
function dzKmSign(name,rest,pct,alt){
  const TH=T3,g=new TH.Group();
  const tex=canvasTex(160,256,(c,w,h)=>{c.fillStyle='#f4f2ec';c.fillRect(0,0,w,h);c.fillStyle='#f2c230';c.fillRect(0,0,w,64);c.fillStyle='#1b1b1b';c.textAlign='center';c.textBaseline='middle';
    c.font='800 17px Inter, system-ui, sans-serif';const words=name.toUpperCase().split(' ');c.fillText(words.slice(0,2).join(' '),w/2,22);c.fillText(words.slice(2).join(' '),w/2,44);
    c.font='700 18px Inter, system-ui, sans-serif';c.fillText('Sommet',w/2,92);c.font='900 54px Inter, system-ui, sans-serif';c.fillText(rest,w/2,140);c.font='700 18px Inter, system-ui, sans-serif';c.fillText('km',w/2,176);
    c.fillStyle='#d62828';c.fillRect(18,196,w-36,30);c.fillStyle='#fff';c.font='800 20px Inter, system-ui, sans-serif';c.fillText(pct+' %',w/2,212);c.fillStyle='#555';c.font='600 14px Inter, system-ui, sans-serif';c.fillText('alt. '+alt+' m',w/2,242)});
  const body=new TH.Mesh(new TH.BoxGeometry(.5,1.05,.22),[0,0,0,0,0,0].map((_,i)=>i===4?new TH.MeshLambertMaterial({map:tex}):new TH.MeshLambertMaterial({color:'#f4f2ec'})));body.position.y=.53;body.castShadow=true;g.add(body);
  return g;
}
/* bord onderaan een klim: naam, lengte en gemiddelde stijging */
function dzClimbSign(name,len,pct){
  const TH=T3,g=new TH.Group(),post=new TH.Mesh(new TH.CylinderGeometry(.05,.05,2.4,6),new TH.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.2;g.add(post);
  const tex=canvasTex(256,160,(c,w,h)=>{c.fillStyle='#ffffff';c.fillRect(0,0,w,h);c.strokeStyle='#1d4f9c';c.lineWidth=8;c.strokeRect(5,5,w-10,h-10);c.fillStyle='#16191f';c.textAlign='center';c.textBaseline='middle';
    c.font='800 38px Inter, system-ui, sans-serif';c.fillText(name,w/2,52);c.font='700 30px Inter, system-ui, sans-serif';c.fillText(`${nl((len/1000).toFixed(1))} km · ${nl(pct.toFixed(1))}%`,w/2,108)});
  const b=new TH.Mesh(new TH.PlaneGeometry(1.4,.88),new TH.MeshBasicMaterial({map:tex,side:TH.DoubleSide}));b.position.y=2.3;g.add(b);return g;
}
/* gele wegwijzer op een paal, met pijl */
function dzDirSign(lines,nl){
  const TH=T3,g=new TH.Group(),post=new TH.Mesh(new TH.CylinderGeometry(.05,.05,2.6,6),new TH.MeshLambertMaterial({color:nl?'#f4f4f4':'#9aa0a6'}));post.position.y=1.3;g.add(post);
  /* Frans: geel met zwart; Nederlands: wit fietsbord met rode letters en rode rand */
  lines.forEach(([txt,dir],i)=>{const tex=canvasTex(320,64,(c,w,h)=>{c.fillStyle=nl?'#ffffff':'#f2c230';c.beginPath();if(dir<0){c.moveTo(0,h/2);c.lineTo(28,0);c.lineTo(w,0);c.lineTo(w,h);c.lineTo(28,h)}else{c.moveTo(w,h/2);c.lineTo(w-28,0);c.lineTo(0,0);c.lineTo(0,h);c.lineTo(w-28,h)}c.closePath();c.fill();if(nl){c.strokeStyle='#d62828';c.lineWidth=5;c.stroke()}
      c.fillStyle=nl?'#d62828':'#1b1b1b';c.font='800 26px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,w/2+(dir<0?10:-10),h/2+1)});
    const b=new TH.Mesh(new TH.PlaneGeometry(1.7,.34),new TH.MeshBasicMaterial({map:tex,transparent:true,side:TH.DoubleSide}));b.position.set(dir<0?-.75:.75,2.35-i*.42,0);g.add(b)});
  return g;
}
/* groot bord op de pas */
function dzPassSign(name,alt){
  const TH=T3,g=new TH.Group(),wood=new TH.MeshLambertMaterial({color:'#6b4a2f'});
  for(const x of[-1.5,1.5]){const p=new TH.Mesh(new TH.BoxGeometry(.18,3.4,.18),wood);p.position.set(x,1.7,0);p.castShadow=true;g.add(p)}
  const tex=canvasTex(512,256,(c,w,h)=>{c.fillStyle='#5b3f27';c.fillRect(0,0,w,h);for(let i=0;i<9;i++){c.fillStyle=i%2?'rgba(0,0,0,.08)':'rgba(255,255,255,.04)';c.fillRect(0,i*29,w,29)}
    c.strokeStyle='#e9dfc8';c.lineWidth=6;c.strokeRect(14,14,w-28,h-28);c.fillStyle='#f4ead2';c.textAlign='center';c.textBaseline='middle';
    const words=name.toUpperCase().split(' ');c.font='800 34px Inter, system-ui, sans-serif';c.fillText(words.slice(0,-1).join(' '),w/2,70);c.font='900 60px Inter, system-ui, sans-serif';c.fillText(words[words.length-1],w/2,128);
    c.font='700 30px Inter, system-ui, sans-serif';c.fillText('Altitude '+alt+' m',w/2,196)});
  const b=new TH.Mesh(new TH.BoxGeometry(3.6,1.8,.12),[0,0,0,0,1,1].map(i=>i?new TH.MeshLambertMaterial({map:tex}):wood));b.position.y=2.6;b.castShadow=true;g.add(b);return g;
}
/* driehoek met een symbool (rotonde of voorrang verlenen) */
function dzTriSign(kind){
  const TH=T3,g=new TH.Group(),post=new TH.Mesh(new TH.CylinderGeometry(.05,.05,2.2,6),new TH.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.1;g.add(post);
  const tex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#fff';c.beginPath();if(kind==='voorrang'){c.moveTo(6,10);c.lineTo(122,10);c.lineTo(64,118)}else{c.moveTo(64,6);c.lineTo(122,116);c.lineTo(6,116)}c.closePath();c.fill();c.lineWidth=12;c.strokeStyle='#d62828';c.lineJoin='round';c.stroke();
    if(kind==='rotonde'){c.strokeStyle='#111';c.lineWidth=6;c.beginPath();c.arc(64,82,16,0,Math.PI*1.6);c.stroke();c.fillStyle='#111';c.beginPath();c.moveTo(70,58);c.lineTo(82,66);c.lineTo(68,74);c.fill()}});
  const b=new TH.Mesh(new TH.PlaneGeometry(1.1,1.1),new TH.MeshBasicMaterial({map:tex,transparent:true,side:TH.DoubleSide}));b.position.y=2.5;g.add(b);return g;
}

/* ---------- 8. randen, borden, dorpen en herkenningspunten in één kilometer ---------- */
function* dzExtras(X){
  const {g,C,T,a,end,put,tree,tint,r,yAt}=X,TH=T3,M=W.mat,D=C.design,L=C.L;dzGeos();
  const geo=(pos,idx,col,uv)=>{const q=new TH.BufferGeometry();q.setAttribute('position',new TH.Float32BufferAttribute(pos,3));if(col)q.setAttribute('color',new TH.Float32BufferAttribute(col,3));if(uv)q.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));q.setIndex(idx);q.computeVertexNormals();return q};
  const inChunk=d=>{d=((d%L)+L)%L;return d>=a&&d<end};
  const at=(d,o)=>{const q=roadAt(C,d),x=q.x+Math.cos(q.h)*o,z=q.z+Math.sin(q.h)*o;return {q,x,z,y:yAt(q,C.hwAt(d),Math.abs(o),x,z)}};
  const place=(obj,d,o,dy=0)=>{const q=roadAt(C,d);obj.position.set(q.x+Math.cos(q.h)*o,q.y+dy,q.z+Math.sin(q.h)*o);obj.rotation.y=-q.h;obj.traverse(m=>{if(m.isMesh)m.castShadow=true});g.add(obj);return obj};
  const face=(h,s)=>s>0?Math.atan2(-Math.cos(h),-Math.sin(h)):Math.atan2(Math.cos(h),Math.sin(h));
  const hps=C.marks.filter(m=>m[0]==='hp'),onBr=d=>(C.bridges||[]).some(([b0,b1])=>d>b0&&d<b1);
  const P0=(D.punten||[]).map(q=>Object.assign({},q,{d:q.at!=null?C.at(q.at):q.hp?hps[q.hp-1][1]:q.van!=null?C.at(q.van):null}));
  const gal=P0.find(q=>q.soort==='galerij'),galR=gal?[C.at(gal.van),C.at(gal.tot)]:[-1,-1],inGal=d=>d>galR[0]&&d<galR[1];
  /* --- doorlopende randen: vangrail of stenen borstwering aan de dalkant, vangrail altijd aan de buitenkant van een haarspeld, muurtjes op de brug --- */
  {const B={rail:{pos:[],col:[],uv:[],idx:[]},muur:{pos:[],col:[],uv:[],idx:[]}},c=new TH.Color();
    const sweep=(G,pts,prof)=>{const n=pts.length,m=prof.length;
      for(let k=0;k<m-1;k++){const b0=G.pos.length/3;
        for(let i=0;i<n;i++){const q=pts[i];for(const [w,h,cl,bot] of[prof[k],prof[k+1]]){const y=(bot?q.yb:q.yt)+h;G.pos.push(q.x+q.nx*w,y,q.z+q.nz*w);c.set(cl).multiplyScalar(q.tone??1);G.col.push(c.r,c.g,c.b);G.uv.push(q.L/2.4,(y-q.yb)/2.4)}
          if(i)G.idx.push(b0+i*2-2,b0+i*2-1,b0+i*2,b0+i*2-1,b0+i*2+1,b0+i*2)}}};
    const kindAt=(d,s)=>{if(C.secP(d).rand==='stoep')return null;if(onBr(d))return 'muur';if(inGal(d))return null;
      const p=roadAt(C,d),hw=C.hwAt(d);for(const m of hps)if(Math.abs(m[1]-d)<34&&s===-m[3])return 'rail';
      const o=s*(hw+7),drop=p.y-T.h(p.x+Math.cos(p.h)*o,p.z+Math.sin(p.h)*o);if(drop<2.2)return null;
      const R=C.secP(d).rand;return R==='muur'?'muur':R==='rail'?'rail':drop>6?'rail':null};
    for(const s of[-1,1])for(const kind of['rail','muur']){let run=[];
      const close=()=>{if(run.length<3){run=[];return}let Lc=0;run.forEach((q,i)=>{if(i)Lc+=Math.hypot(q.x-run[i-1].x,q.z-run[i-1].z);q.L=Lc});
        if(kind==='rail'){sweep(B.rail,run,[[-.02,.43,'#9aa1a8'],[-.07,.5,'#d4d9de'],[-.03,.585,'#b9bfc6'],[-.07,.67,'#e3e7ea'],[-.02,.74,'#c4cad0'],[.02,.74,'#8d949b'],[.02,.43,'#8d949b'],[-.02,.43,'#9aa1a8']]);
          run.forEach((q,i)=>{if(i%2===0)put('railpaal',q.x+q.nx*.08,q.yt,q.z+q.nz*.08,1,-q.h)})}
        else{run.forEach(q=>{q.tone=.9+.12*Math.sin(q.L*.7)});sweep(B.muur,run,[[-.27,0,'#b9ad98',1],[-.25,.72,'#b9ad98'],[-.31,.72,'#9c917f'],[-.31,.84,'#9c917f'],[.31,.84,'#9c917f'],[.31,.72,'#9c917f'],[.25,.72,'#b9ad98'],[.27,0,'#b9ad98',1]])}
        run=[]};
      /* korte onderbrekingen (tot 12 m) dichten en stompjes korter dan 16 m weglaten, zodat een rand niet in losse brokken staat */
      const ds=[],ks=[];for(let d=Math.ceil(a/2)*2;d<=Math.min(end,L-.01);d+=2){ds.push(d);ks.push(kindAt(d,s)===kind)}
      for(let i=0;i<ks.length;i++)if(!ks[i]){let j=i;while(j<ks.length&&!ks[j])j++;if(i>0&&j<ks.length&&j-i<=6)for(let q=i;q<j;q++)ks[q]=true;i=j}
      for(let i=0;i<ks.length;i++)if(ks[i]){let j=i;while(j<ks.length&&ks[j])j++;if(j-i<8&&i>0&&j<ks.length)for(let q=i;q<j;q++)ks[q]=false;i=j}
      for(let ii=0;ii<ds.length;ii++){const d=ds[ii];
        if(ks[ii]){const p=roadAt(C,d),hw=C.hwAt(d),o=s*(hw+.42),x=p.x+Math.cos(p.h)*o,z=p.z+Math.sin(p.h)*o,gy=onBr(d)?p.y-1.2:Math.min(p.y,T.h(x,z));
          run.push({x,z,nx:Math.cos(p.h)*s,nz:Math.sin(p.h)*s,h:p.h,yt:p.y-.05,yb:kind==='muur'?gy-.6:p.y-1})}
        else close()}
      close()}
    /* weidehekken: houten hek in het dal, draadhek (palen met twee draden) bij de alpenweides; in blokken van wisselende lengte */
    {const hs=(i,k)=>{const x=Math.sin(i*127.1+k*311.7+C.seed*.0137)*43758.5453;return x-Math.floor(x)};B.hek={pos:[],col:[],uv:[],idx:[]};
      for(const s of[-1,1]){let run=[];const close=()=>{if(run.length>4){const kind=run.kind;let Lc=0;run.forEach((q,i)=>{if(i)Lc+=Math.hypot(q.x-run[i-1].x,q.z-run[i-1].z);q.L=Lc});
            if(kind==='hout'){for(const hh of[.5,.95])sweep(B.hek,run,[[-.04,hh-.06,'#7a5b3e'],[-.04,hh+.06,'#8f6d4b'],[.04,hh+.06,'#8f6d4b'],[.04,hh-.06,'#6e5238'],[-.04,hh-.06,'#7a5b3e']]);run.forEach((q,i)=>{if(i%1===0)put('hekpaal',q.x,q.yb,q.z,1,-q.h,tint(.12,.02))})}
            else{for(const hh of[.55,1])sweep(B.hek,run,[[0,hh-.012,'#5d5f62'],[0,hh+.012,'#8a8d91']]);run.forEach((q,i)=>{if(i%2===0)put('hekpaal',q.x,q.yb,q.z,.85,-q.h,new TH.Color(.75,.68,.6))})}}run=[]};
        for(let d=Math.ceil(a/2.4)*2.4;d<=Math.min(end,L-.01);d+=2.4){const P=C.secP(d),kind=P.hek;const blk=Math.floor(d/(70+40*hs(Math.floor(d/90),s)));
          const on=kind&&hs(blk,s+3)<.42&&!hps.some(m=>Math.abs(m[1]-d)<40)&&!onBr(d);
          if(on){const q=roadAt(C,d),hw=C.hwAt(d),o=s*(hw+3.6+hs(blk,7)*2.5),x=q.x+Math.cos(q.h)*o,z=q.z+Math.sin(q.h)*o;if(T.distSide(x,z)<6||Math.abs(T.h(x,z)-q.y)>3){close();continue}
            if(run.length&&run.kind!==kind)close();run.kind=kind;const gy=T.h(x,z);run.push({x,z,nx:Math.cos(q.h)*s,nz:Math.sin(q.h)*s,h:q.h,yt:gy,yb:gy})}else close()}
        close()}
      if(B.hek.idx.length){const m=new TH.Mesh(geo(B.hek.pos,B.hek.idx,B.hek.col,B.hek.uv),M.edgeWood);m.castShadow=m.receiveShadow=true;g.add(m)}}
    if(B.rail.idx.length){const m=new TH.Mesh(geo(B.rail.pos,B.rail.idx,B.rail.col,B.rail.uv),M.edgeRail);m.castShadow=m.receiveShadow=true;g.add(m)}
    if(B.muur.idx.length){const m=new TH.Mesh(geo(B.muur.pos,B.muur.idx,B.muur.col,B.muur.uv),M.edgeStone);m.castShadow=m.receiveShadow=true;g.add(m)}}
  yield;
  /* --- polder: sloten langs de weg en haaks erop, knotwilgen in rijen, riet langs het water --- */
  if(D.sloten){const SL=D.sloten,wp=[],wi=[],hs=(i,k)=>{const x=Math.sin(i*127.1+k*311.7+C.seed*.017)*43758.5453;return x-Math.floor(x)};
    const strip=pts=>{if(pts.length<2)return;const b0=wp.length/3;pts.forEach(([x,z,nx,nz,w],i)=>{const y=T.h(x,z)+.04;wp.push(x-nx*w/2,y,z-nz*w/2,x+nx*w/2,y,z+nz*w/2);if(i)wi.push(b0+i*2-2,b0+i*2,b0+i*2-1,b0+i*2-1,b0+i*2,b0+i*2+1)})};
    const isP=d=>C.secP(d).land==='polder';
    for(const s of[-1,1]){let run=[];
      for(let d=Math.ceil(a/4)*4;d<=Math.min(end,L-.01);d+=4){const ok=isP(d)&&!onBr(d)&&!(C.sideRoads||[]).some(S=>S.at!=null&&Math.abs(S.at-d)<10)&&!(C.rounds||[]).some(R0=>Math.abs(R0.at-d)<40);
        if(!ok){strip(run);run=[];continue}
        const q=roadAt(C,d),o=s*(C.hwAt(d)+(SL.af||4.2)),x=q.x+Math.cos(q.h)*o,z=q.z+Math.sin(q.h)*o;run.push([x,z,Math.cos(q.h)*s,Math.sin(q.h)*s,SL.breed||1.8]);
        if(r()<.22)put('riet',x+Math.cos(q.h)*s*(r()-.5)*1.4,T.h(x,z)+.04,z+Math.sin(q.h)*s*(r()-.5)*1.4,.38+r()*.3,r()*6,tint(.15,.06),.45+r()*.35);
        /* knotwilgen in blokken langs de sloot */
        const blk=Math.floor(d/120);if(hs(blk,s+5)<(SL.wilgen??.35)&&Math.floor(d)%9<4){const ow=s*(C.hwAt(d)+(SL.af||4.2)+2.2),wx=q.x+Math.cos(q.h)*ow,wz=q.z+Math.sin(q.h)*ow;tree('knotwilg',wx,T.h(wx,wz),wz,.9+r()*.25,true)}}
      strip(run)}
    /* haaks op de weg: de kavelsloten, om de 60-130 m */
    let pk=null;for(let d=Math.ceil(a/6)*6;d<end;d+=6){const q0=roadAt(C,d),K0=D.velden?dzParcel(C,q0.x,q0.z):null,key=K0?K0.iu+'/'+K0.iv:String(Math.floor(d/90)),chg=pk!==null&&key!==pk;pk=key;
      if(!chg||!isP(d)||onBr(d))continue;
      for(const s of[-1,1]){const q=roadAt(C,d),nx=Math.cos(q.h)*s,nz=Math.sin(q.h)*s,fx=Math.sin(q.h),fz=-Math.cos(q.h),pts=[];
        for(let o=C.hwAt(d)+(SL.af||4.2)+1;o<(SL.lang||260);o+=8){const x=q.x+nx*o,z=q.z+nz*o;if(T.distSide(x,z)<8||(C.lakeAt&&C.lakeAt(x,z)))break;pts.push([x,z,fx,fz,1.3]);if(o<70&&r()<.18)put('riet',x+fx*.9,T.h(x,z),z+fz*.9,.35+r()*.3,r()*6,tint(.15,.06),.4+r()*.3)}
        strip(pts)}}
    if(wi.length){const m=new TH.Mesh(geo(wp,wi),M.water);m.receiveShadow=true;g.add(m)}}
  /* riet langs de oevers van meren en vaarten */
  for(const Lk of C.lakes||[]){if(!Lk.riet)continue;const P=Lk.P;for(let i=0;i<P.length;i++){const [ax,az]=P[i],[bx,bz]=P[(i+1)%P.length],len=Math.hypot(bx-ax,bz-az);
    for(let t=0;t<len;t+=2.5){const x=ax+(bx-ax)*t/len,z=az+(bz-az)*t/len,k=T.near(x,z);if(!(k>=Math.round(a/STEP)&&k<Math.round(end/STEP))||r()<.55||T.exact(x,z)<C.hwAt(k*STEP)+6)continue;const n=1+Math.floor(r()*3);for(let j=0;j<n;j++)put('riet',x+(r()-.5)*2.4,Lk.peil-.15,z+(r()-.5)*2.4,.45+r()*.35,r()*6,tint(.15,.06),.5+r()*.4)}}}
  /* --- borden --- */
  const alt=y=>Math.round((D.hoogteDorp||1000)+y);
  hps.forEach((m,i)=>{const d=m[1]-26;if(!inChunk(d))return;place(makeVirage(hps.length-i,alt(roadAt(C,m[1]).y)),d,C.hwAt(d)+1.3)});
  if(D.klim){const top=C.at(D.klim[1]),bot=C.at(D.klim[0]);for(let n=1;top-n*1000>bot;n++){const d=top-n*1000;if(!inChunk(d))continue;
    const pct=(roadAt(C,d+1000).y-roadAt(C,d).y)/10;place(dzKmSign(D.naam||C.route.name,n,nl(pct.toFixed(1)),alt(roadAt(C,d).y)),d,C.hwAt(d)+1.1,0).rotation.y+=.25}}
  for(let d=Math.max(80,a);d<Math.min(L-80,end);d+=10){const k1=C.K[kAt(C,d+60)],k0=C.K[kAt(C,d)];
    if(Math.abs(k1)>1/55&&Math.abs(k0)<1/400&&C.secP(d).rand!=='stoep'&&!hps.some(m=>Math.abs(m[1]-d)<90)){place(makeBend(k1>0),d,C.hwAt(d)+1.2);d+=260}}
  for(const S of C.sideRoads)if(!S.round&&S.soort==='weg'&&inChunk(S.at-45)){const out=S.at>C.L/2;
    place(dzDirSign(S.bord||(out?[[C.route.name.replace(/^De /,'')+' · Valbrenne',-1]]:[[D.naam||'Col',-1],['Vallée',1]]),D.nl),S.at-45,C.hwAt(S.at)+1.4)}
  /* bord onderaan een klim (Nederland): naam, lengte en gemiddelde stijging */
  for(const q of D.punten||[])if(q.soort==='klimbord'){const d=C.at(q.at)-15;if(!inChunk(d))continue;const e=C.at(q.tot),len=e-d-15,pct=(roadAt(C,e).y-roadAt(C,d+15).y)/len*100;
    place(dzClimbSign(q.naam,len,pct),d,C.hwAt(d)+1.3).rotation.y+=.3}
  for(const R0 of C.rounds)if(inChunk(R0.at-70))place(dzTriSign('rotonde'),R0.at-70,C.hwAt(R0.at)+1.3);
  yield;
  /* --- herkenningspunten --- */
  for(const q of P0){if(q.d==null)continue;
    if(q.soort==='brug'&&inChunk(q.d)){
      /* stenen boogbrug over de beek in de kloof: een lichaam met een boog erdoor, onder het wegdek */
      const p=roadAt(C,q.d),hw=C.hwAt(q.d),low=Math.min(T.h(p.x+Math.cos(p.h)*12,p.z+Math.sin(p.h)*12),T.h(p.x-Math.cos(p.h)*12,p.z-Math.sin(p.h)*12),p.y-5),H=p.y-low+2,Rb=Math.min(4.2,H-2),Lb=Math.max(14,Rb*2+6),depth=hw*2+1.4;
      const sh=new TH.Shape();sh.moveTo(-Lb/2,-H);sh.lineTo(-Lb/2,0);sh.lineTo(Lb/2,0);sh.lineTo(Lb/2,-H);sh.lineTo(Rb,-H);sh.absarc(0,-H,Rb,0,Math.PI,false);sh.lineTo(-Lb/2,-H);
      const eg=new TH.ExtrudeGeometry(sh,{depth,bevelEnabled:false,curveSegments:16}).translate(0,-.12,-depth/2);
      const uvs=eg.attributes.uv;for(let i=0;i<uvs.count;i++)uvs.setXY(i,uvs.getX(i)/2.4,uvs.getY(i)/2.4);
      const m=new TH.Mesh(eg,M.steen);m.position.set(p.x,p.y,p.z);m.rotation.y=Math.PI/2-p.h;m.castShadow=m.receiveShadow=true;g.add(m)}
    if(q.soort==='kapel'&&inChunk(q.d)){const s=q.hp?-hps[q.hp-1][3]:q.kant||1,o=s*(C.hwAt(q.d)+(q.af||7)),A=at(q.d,o);
      put('kapel',A.x,A.y,A.z,1,face(A.q.h,s));put('bank',A.x+Math.cos(A.q.h)*-s*3.2,A.y,A.z+Math.sin(A.q.h)*-s*3.2+2.5,1,face(A.q.h,s));tree('berk',A.x-Math.sin(A.q.h)*7,A.y,A.z+Math.cos(A.q.h)*7,1,true)}
    if(q.soort==='berghut'&&inChunk(q.d)){const m=hps[q.hp-1],s=-m[3],o=s*(C.hwAt(q.d)+(q.af||18)),A=at(q.d,o);
      put('berghut',A.x,A.y-.3,A.z,1,face(A.q.h,s));for(let i=0;i<5;i++){const B=at(q.d+(r()-.5)*14,s*(C.hwAt(q.d)+6+r()*6));put('loper',B.x,B.y,B.z,1,r()*6,new TH.Color().setHSL(r(),.6,.5))}}
    if(q.soort==='galerij'){const d0=Math.max(galR[0],a),d1=Math.min(galR[1],end);if(d1>d0){
      /* lawinegalerij: dak van beton over de weg, pijlers aan de dalkant, de bergkant is de rotswand */
      const pos=[],idx=[],side=1;for(let d=d0,i=0;d<=d1+.01;d+=2,i++){const p=roadAt(C,d),hw=C.hwAt(d),nx=Math.cos(p.h),nz=Math.sin(p.h),yt=p.y+5.6;
        for(const [o,dy] of[[-hw-3,.9],[-hw-1.6,.5],[hw+1.4,.5],[hw+1.4,-.3],[hw+1.4,-.6],[-hw-3,-.6]])pos.push(p.x+nx*o,yt+dy,p.z+nz*o);
        if(i){const b=(i-1)*6;for(let k=0;k<5;k++)idx.push(b+k,b+k+6,b+k+1,b+k+1,b+k+6,b+k+7)}
        if(i%3===0){const o=side*(hw+1.05);put('pilaar',p.x+nx*o,p.y,p.z+nz*o,1,-p.h);
          /* dwarsbalk over de hele breedte, net onder het dak */
          const bo=-.8;put('galbalk',p.x+nx*bo,yt-.15,p.z+nz*bo,1,-p.h)}}
      const gm=new TH.Mesh(geo(pos,idx),M.beton||(M.beton=new TH.MeshLambertMaterial({color:'#b9b5ad',emissive:'#4a4740',side:TH.DoubleSide})));gm.castShadow=gm.receiveShadow=true;g.add(gm);
      /* op het dak ligt aarde met gras, met een rommelige rand aan de dalkant */
      {const tp=[],ti=[],tc=[],tu=[],cg=new TH.Color();for(let d=d0,i=0;d<=d1+.01;d+=2,i++){const p=roadAt(C,d),hw=C.hwAt(d),nx=Math.cos(p.h),nz=Math.sin(p.h),yt=p.y+5.6;
          for(const [o,dy] of[[-hw-3.2,1.05],[0,.95+.12*Math.sin(d*.7)],[hw+1.2+.25*Math.sin(d*1.3),.75]]){const x=p.x+nx*o,z=p.z+nz*o;tp.push(x,yt+dy,z);cg.set('#6d8a46').multiplyScalar(.85+.25*r());tc.push(cg.r,cg.g,cg.b);tu.push(x/14,z/14)}
          if(i){const b=(i-1)*3;for(let k=0;k<2;k++)ti.push(b+k,b+k+3,b+k+1,b+k+1,b+k+3,b+k+4)}}
        const tm=new TH.Mesh(geo(tp,ti,tc,tu),M.lam);tm.receiveShadow=true;g.add(tm)}}}
    if(q.soort==='dam'){const S=C.sideRoads.find(x=>x.soort==='dam');if(S&&inChunk(S.at)){
      /* stuwdam onder de weg over de kruin: meerkant steil, dalkant lang en hol naar de beek */
      const prof=[[-3.2,-12],[-2.6,-.6],[-2.4,.95],[-2.1,.95],[-2.1,.1],[2.1,.1],[2.1,.95],[2.4,.95],[2.6,-.6],[5,-6],[9,-14],[12,-24],[13,-34]];
      const pos=[],idx=[],n=Math.ceil(S.vis/STEP);for(let k=0;k<=n;k++){const nx=Math.cos(S.HD[k]),nz=Math.sin(S.HD[k]);for(const [o,dy] of prof)pos.push(S.X[k]+nx*o,S.Y[k]+dy,S.Z[k]+nz*o);
        if(k){const b=(k-1)*prof.length;for(let j=0;j<prof.length-1;j++)idx.push(b+j,b+j+prof.length,b+j+1,b+j+1,b+j+prof.length,b+j+prof.length+1)}}
      const dm=new TH.Mesh(geo(pos,idx),M.beton||(M.beton=new TH.MeshLambertMaterial({color:'#b9b5ad',side:TH.DoubleSide})));dm.castShadow=dm.receiveShadow=true;g.add(dm)}}
    if(q.soort==='pas'&&inChunk(q.d)){const hw=C.hwAt(q.d);place(dzPassSign(q.naam||D.naam||C.route.name,q.hoogte||alt(roadAt(C,q.d).y)),q.d,hw+3.2);
      const A=at(q.d+6,hw+5.5);put('steenman',A.x,A.y,A.z,1.2,r()*6);const B=at(q.d-8,hw+4.4);put('kijker',B.x,B.y,B.z,1,face(B.q.h,1)+Math.PI);put('bank',B.x+1.5,B.y,B.z+1.5,1,face(B.q.h,1)+Math.PI);
      for(let i=0;i<4;i++){const Cq=at(q.d+12+i*5.5,-(hw+4.5));put('auto',Cq.x,Cq.y+.05,Cq.z,1,face(Cq.q.h,-1)+Math.PI/2,new TH.Color(['#c9ccd1','#1d2a44','#9c2b2b','#f2f2f2'][i]))}
      for(let i=0;i<9;i++){const E=at(q.d-14+i*3.1,(r()<.5?-1:1)*(hw+1.4+r()*1.4));put(r()<.5?'mens':'mens2',E.x,E.y,E.z,.95,face(E.q.h,E.x>0?1:-1),new TH.Color().setHSL(r(),.6,.45))}}
    if(q.soort==='waterval'&&inChunk(q.d)){const s=q.kant||-1,hw=C.hwAt(q.d),p=roadAt(C,q.d),nx=Math.cos(p.h)*s,nz=Math.sin(p.h)*s;
      /* water over de rotswand: een strook met een stromend plaatje, onderaan een kom met nevel */
      if(!W.tex.val){W.tex.val=canvasTex(64,256,(c,w,h)=>{c.fillStyle='rgba(235,245,255,.75)';c.fillRect(0,0,w,h);for(let i=0;i<70;i++){c.fillStyle=`rgba(255,255,255,${.4+Math.random()*.6})`;c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,20+Math.random()*60)}for(let i=0;i<40;i++){c.fillStyle='rgba(150,180,205,.35)';c.fillRect(Math.random()*w,Math.random()*h,2,30+Math.random()*50)}});W.tex.val.wrapS=W.tex.val.wrapT=TH.RepeatWrapping;W.tex.val.repeat.set(1,3);(W.flows=W.flows||[]).push(W.tex.val)}
      const pos=[],uv=[],idx=[],steps=14;for(let i=0;i<=steps;i++){const t=i/steps,off=hw+3.2+t*7,x0=p.x+nx*off,z0=p.z+nz*off,top=T.h(x0,z0)+.4;
        for(const w of[-1.6-t*.6,1.6+t*.6]){pos.push(x0+Math.sin(p.h)*w,top,z0-Math.cos(p.h)*w);uv.push(w>0?1:0,t*4)}
        if(i)idx.push((i-1)*2,(i-1)*2+1,i*2,(i-1)*2+1,i*2+1,i*2)}
      const wm=new TH.Mesh(geo(pos,idx,null,uv),new TH.MeshLambertMaterial({map:W.tex.val,transparent:true,opacity:.92,side:TH.DoubleSide,depthWrite:false}));g.add(wm);
      const A=at(q.d,s*(hw+3.6)),pool=new TH.Mesh(new TH.CircleGeometry(2.4,20).rotateX(-Math.PI/2),M.water);pool.position.set(A.x,A.y-.25,A.z);g.add(pool);
      for(let i=0;i<6;i++){const B=at(q.d+(r()-.5)*8,s*(hw+2.6+r()*2.5));put('rotsblok',B.x,B.y-.3,B.z,.6+r()*.7,r()*6,tint(.1,0))}}
    /* een los gebouw of bouwwerk: {soort:'gebouw',model,at,kant,af (meters van de weg),draai (graden extra),op (meters hoger)} */
    if(q.soort==='gebouw'&&inChunk(q.d)){const s=q.kant||1;let af=q.af||12,A=at(q.d,s*(C.hwAt(q.d)+af));for(let i=0;i<6&&T.exact(A.x,A.z)<Math.min(af,14);i++){af+=7;A=at(q.d,s*(C.hwAt(q.d)+af))}put(q.model,A.x,T.h(A.x,A.z)-.2+(q.op||0),A.z,q.schaal||1,face(A.q.h,s)+(q.draai||0)*Math.PI/180);if(q.schaduw!==false)put('blob',A.x,T.h(A.x,A.z)+.06,A.z,q.vlek||9,0)}
    if(q.soort==='zagerij'&&inChunk(q.d)){const s=q.kant||1,A=at(q.d,s*(C.hwAt(q.d)+12));put('zagerij',A.x,A.y-.1,A.z,1,face(A.q.h,s)+Math.PI/2);
      const KH=(W.KC&&W.KC.hout)||[];for(let i=0;i<4;i++){const B=at(q.d-14+i*3.4,s*(C.hwAt(q.d)+5+r()*2));put(KH.length?KH[i%KH.length]:'hout',B.x,B.y,B.z,1.2,-B.q.h+(r()-.5)*.3)}
      const Cq=at(q.d+12,s*(C.hwAt(q.d)+6));put('auto',Cq.x,Cq.y,Cq.z,1,face(Cq.q.h,s)+Math.PI/2,new TH.Color('#2d5d3a'))}
    if(q.soort==='boerderij'&&inChunk(q.d)){const s=q.kant||1,af=q.af||30,A=at(q.d,s*(C.hwAt(q.d)+af));put(q.huis||'chalet2',A.x,T.h(A.x,A.z)-.2,A.z,1,face(A.q.h,s),tint(.1,.02));
      const B=at(q.d+(q.huis==='vakhoeve'||q.huis==='boerderij'?22:16),s*(C.hwAt(q.d)+af+4));put(q.schuur||'hooischuur',B.x,T.h(B.x,B.z)-.3,B.z,1,face(B.q.h,s)+Math.PI/2,tint(.1,.02));
      if(q.silo){const Cq=at(q.d-12,s*(C.hwAt(q.d)+af+6));put('silo',Cq.x,T.h(Cq.x,Cq.z),Cq.z,1,0)}
      for(let i=0;i<4;i++){const E=at(q.d-10-i*4,s*(C.hwAt(q.d)+12+r()*8));put('baal',E.x,T.h(E.x,E.z),E.z,1,r()*6)}
      const dier=q.dier||'koe';for(let i=0;i<(dier==='schaap'?9:5);i++){const E=at(q.d-30+r()*60,s*(C.hwAt(q.d)+af+10+r()*16));put(dier,E.x,T.h(E.x,E.z),E.z,1,r()*6,dier==='koe'?new TH.Color(.82,.62,.45):null)}}
    if(q.soort==='koeien'||q.soort==='schapen'){const sch=q.soort==='schapen',d0=Math.max(C.at(q.van),a),d1=Math.min(C.at(q.tot),end);
      for(let d=d0;d<d1;d+=(sch?8:18)+r()*(sch?14:40)){const s=q.kant||(r()<.5?-1:1),E=at(d,s*(C.hwAt(d)+(q.af||9)+r()*30));if(T.slope(E.x,E.z)<.5&&!(C.lakeAt&&C.lakeAt(E.x,E.z)))put(sch?'schaap':'koe',E.x,T.h(E.x,E.z),E.z,1,r()*6,sch?null:q.bont?new TH.Color().setHSL(0,0,r()<.5?.95:.25):new TH.Color().setHSL(.07,.35,.35+r()*.35))}}
    /* bootjes op een vaart of meer */
    if(q.soort==='boten'){const d0=C.at(q.van),d1=C.at(q.tot),s=q.kant||1;for(let i=0;i<(q.n||4);i++){const d=d0+(d1-d0)*(i+.3+r()*.4)/(q.n||4);if(!inChunk(d))continue;
      const A=at(d,s*(C.hwAt(d)+(q.af||40)+r()*20)),Lk=C.lakeAt&&C.lakeAt(A.x,A.z);if(Lk)put('boot',A.x,Lk.peil,A.z,1,-A.q.h+(r()<.5?0:Math.PI),new TH.Color().setHSL(r(),.5,.5))}}
    /* boomgaard: fruitbomen in rijen evenwijdig aan de weg */
    if(q.soort==='boomgaard'){const d0=Math.max(C.at(q.van),a),d1=Math.min(C.at(q.tot),end),s=q.kant||1;
      for(let d=d0;d<d1;d+=6.5){for(let o=q.af0||8;o<(q.af1||50);o+=6){const A=at(d+(o%13)*.3,s*(C.hwAt(d)+o));if(T.distSide(A.x,A.z)<5||T.exact(A.x,A.z)<C.hwAt(d)+3)continue;tree('fruitboom',A.x,T.h(A.x,A.z),A.z,.85+r()*.25,o<26)}}}
    /* wegkruis: houten kruis met een dakje, en een bankje */
    if(q.soort==='wegkruis'&&inChunk(q.d)){const s=q.kant||1,A=at(q.d,s*(C.hwAt(q.d)+2.4));put('wegkruis',A.x,A.y,A.z,1,face(A.q.h,s));if(q.boom!==false)tree('eik',A.x+Math.sin(A.q.h)*-5,A.y,A.z-Math.cos(A.q.h)*-5,1.1,true);put('bank',A.x-Math.sin(A.q.h)*2.2,A.y,A.z+Math.cos(A.q.h)*2.2,1,face(A.q.h,s))}
    /* molen, kasteel en windturbines: grote herkenningspunten op afstand van de weg */
    if((q.soort==='molen'||q.soort==='kasteel')&&inChunk(q.d)){const s=q.kant||1,A=at(q.d,s*(C.hwAt(q.d)+(q.af||40))),o=q.soort==='molen'?makeMill():makeCastle();
      o.position.set(A.x,(q.y!=null?q.y:T.h(A.x,A.z))-.3,A.z);o.rotation.y=face(A.q.h,s)+(q.draai||0);if(q.schaal)o.scale.setScalar(q.schaal);o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});g.add(o);if(o.userData.sails)W.mills.push(o.userData.sails)}
    if(q.soort==='turbines'&&inChunk(q.d)){const s=q.kant||1;for(let i=0;i<(q.n||4);i++){const A=at(q.d+i*(q.tussen||260),s*(C.hwAt(q.d)+(q.af||300)+i*(q.schuin||0)));const o=makeTurbine();o.position.set(A.x,T.h(A.x,A.z),A.z);o.rotation.y=(q.wind||0)*Math.PI/180;g.add(o);W.mills.push(o.userData.sails)}}
    if(q.soort==='vaartbrug'&&inChunk(q.d)){
      /* platte brug over een vaart: betonnen dek met witte leuningen */
      const L2=(q.lengte||28)/2,hw=C.hwAt(q.d);for(const s2 of[-1,1]){const pts=[];for(let dd=-L2;dd<=L2;dd+=2){const p=roadAt(C,q.d+dd),o=s2*(hw+.25);pts.push([p.x+Math.cos(p.h)*o,p.y,p.z+Math.sin(p.h)*o,p.h])}
        for(let i=0;i<pts.length;i++){const [x,y,z,h]=pts[i];put('brugpaal',x,y,z,1,-h);if(i)put('brugleuning',(x+pts[i-1][0])/2,y+1,(z+pts[i-1][2])/2,1,-h)}}
      const p=roadAt(C,q.d),dk=new TH.Mesh(new TH.BoxGeometry(hw*2+1,.6,q.lengte||28),M.beton||(M.beton=new TH.MeshLambertMaterial({color:'#b9b5ad',side:TH.DoubleSide})));dk.position.set(p.x,p.y-.42,p.z);dk.rotation.y=-p.h;dk.castShadow=dk.receiveShadow=true;g.add(dk)}
  }
  yield;
  /* --- dorpen: huizen langs de straat, stoepen met tegels, een plein met kerk, lantaarns en mensen --- */
  for(const v of D.dorpen||[]){let v0=C.at(v.van),v1=C.at(v.tot);v0=((v0%L)+L)%L;v1=((v1%L)+L)%L;if(v1<v0)v1+=L;
    for(const sh of[0,-L]){const s0=Math.max(v0+sh,a),s1=Math.min(v1+sh,end);if(s1<=s0)continue;yield;
      const pl=v.plein?((C.at(v.plein)%L)+L)%L:-1e9,ks=v.kant||-1,list=v.huizen||['chalet'];
      const WD={chalet:8,chalet2:9,chalet3:10,steenhuis:7,herberg:11,hooischuur:8,mergel:6.5,mergel2:7.5,vakwerk:7,vakhoeve:10,trapgevel:6.5,villa:7.5,winkel:8,boerderij:10,huis:5,schuur:7},
        DP={chalet:9,chalet2:11.5,chalet3:11,steenhuis:8.5,herberg:10,hooischuur:11,mergel:8,mergel2:9,vakwerk:9,vakhoeve:18,trapgevel:9,villa:8,winkel:10,boerderij:20,huis:7,schuur:10};
      for(const side of[-1,1])for(let row=0;row<(v.klein?1:2);row++){let d=s0+r()*4;
        while(d<s1){const k=list[Math.floor(r()*list.length)],w=WD[k]||8,dp=DP[k]||9,hw=C.hwAt(d);
          if(side===ks&&Math.abs(d-pl)<32&&row===0){d=pl+32;continue}
          const off=side*(hw+(v.klein?5:3.4)+row*(dp+6)+r()*(row?6:2.2)+dp/2),A=at(d+w/2,off);
          if(T.distSide(A.x,A.z)<dp/2+4||(C.lakeAt&&(C.lakeAt(A.x,A.z)||C.lakeAt(A.x+5,A.z)||C.lakeAt(A.x-5,A.z)))||(C.rounds||[]).some(R0=>Math.hypot(R0.x-A.x,R0.z-A.z)<R0.r+dp)){d+=4;continue}
          put(k,A.x,T.h(A.x,A.z)-.5,A.z,1,face(A.q.h,side)+(row?(r()-.5)*.25:0),tint(.16,.05));put('blob',A.x,T.h(A.x,A.z)+.05,A.z,Math.max(w,dp)*.6,0);
          if(row===0&&r()<.3){const B=at(d+w+1.2,side*(hw+2.6));put('lamp',B.x,B.y+.13,B.z,1,face(B.q.h,-side))}
          if(row===1&&r()<.4){const B=at(d+w/2,side*(hw+3.4+dp+3));tree(['berk','boom','fruitboom'][Math.floor(r()*3)],B.x,T.h(B.x,B.z),B.z,.8,false)}
          d+=w+(row?3+r()*9:1.2+r()*4)}}
      if(!v.klein){
        /* stoepen met tegels en stoepranden */
        const pos=[],uv=[],idx=[];for(const side of[-1,1]){let run=false;for(let d=s0;d<=s1;d+=4){const q=roadAt(C,d),hw=C.hwAt(d);
          if(C.sideRoads.some(S=>!S.round&&Math.hypot(S.X[2]-q.x,S.Z[2]-q.z)<8)){run=false;continue}const n0=pos.length/3;for(const o of[hw,hw+2.5]){const oo=side*o;pos.push(q.x+Math.cos(q.h)*oo,q.y+.13,q.z+Math.sin(q.h)*oo);uv.push(o/1.2,d/1.2)}
          if(run)idx.push(n0-2,n0-1,n0,n0-1,n0+1,n0);run=true;for(const dd of[d,d+2]){const q2=roadAt(C,dd),h2=C.hwAt(dd);put('stoeprand',q2.x+Math.cos(q2.h)*side*(h2+.05),q2.y,q2.z+Math.sin(q2.h)*side*(h2+.05),1,-q2.h)}}}
        if(idx.length){M.tegel2=M.tegel2||Object.assign(M.tegel.clone(),{side:TH.DoubleSide});const m=new TH.Mesh(geo(pos,idx,null,uv),M.tegel2);m.receiveShadow=true;g.add(m)}
        for(let d=s0+5;d<s1;d+=7+r()*12){const side=r()<.5?-1:1,A=at(d,side*(C.hwAt(d)+1.2+r()*1));put('loper',A.x,A.q.y+.13,A.z,.95+r()*.1,-A.q.h+(r()<.5?0:Math.PI),new TH.Color().setHSL(r(),.55,.45))}
        for(let d=s0+12;d<s1;d+=30+r()*40){const side=r()<.5?-1:1,A=at(d,side*(C.hwAt(d)-1.1));put('auto',A.x,A.q.y+.02,A.z,1,-A.q.h+(side>0?0:Math.PI),new TH.Color(['#d9d9d9','#1d1f22','#8a8f96','#b3262d','#1f4f8c','#f2f2f2'][Math.floor(r()*6)]))}
        /* plein met kerk, fontein, terras en bomen */
        if(pl>=s0&&pl<s1){const hw=C.hwAt(pl),A=at(pl,ks*(hw+13));/* op het laagste punt onder het plein, anders zweeft de rand boven een helling */put('plein',A.x,A.q.y+.03,A.z,.9,face(A.q.h,ks));
          const K=at(pl,ks*(hw+38));put(v.kerk||'alpenkerk',K.x,T.h(K.x,K.z)-.4,K.z,1,face(K.q.h,ks));put('blob',K.x,K.y+.06,K.z,11,0);
          const F=at(pl,ks*(hw+15));put('fontein',F.x,F.y+.05,F.z,1,0);
          for(const dd of[-11,-7,8,12]){const E=at(pl+dd,ks*(hw+9+r()*3));put('terras',E.x,E.y+.05,E.z,1,r()*6,new TH.Color().setHSL([0,.08,.55,.33][Math.floor(r()*4)],.65,.55));if(r()<.7)put('loper',E.x+.8,E.y,E.z,1,r()*6,new TH.Color().setHSL(r(),.6,.5))}
          for(const dd of[-16,16]){const E=at(pl+dd,ks*(hw+24));tree('boom',E.x,E.y,E.z,.9,true)}
          for(let i=0;i<5;i++){const E=at(pl+10+i*.8,ks*(hw+3.6));put('fiets',E.x,E.y,E.z,1,face(E.q.h,ks)+Math.PI/2+.25,new TH.Color().setHSL(r(),.6,.5))}}}
      /* plaatsnaamborden */
      for(const [dd,out] of[[v0-14,false],[v1+14,true]])for(const sh2 of[0,-L])if(dd+sh2>=a&&dd+sh2<end&&dd+sh2>=0){place(makePlace(v.naam,out,!D.nl),dd+sh2,C.hwAt(dd+sh2)+1.3)}
    }
  }
  /* --- grote rotsblokken aan de voet van rotswanden --- */
  for(const [a0,b0,side,off,dh] of (D.terrein&&D.terrein.randen)||[]){if(dh<=0||D.nl)continue;const ra=C.at(a0),rb=C.at(b0);
    const gal=((D.punten||[]).filter(q=>q.soort==='galerij')).map(q=>[C.at(q.van)-12,C.at(q.tot)+12]);
    for(let d=Math.max(ra,a)+r()*10;d<Math.min(rb,end);d+=9+r()*16){if(gal.some(([g0,g1])=>d>g0&&d<g1))continue;const o=side*(C.hwAt(d)+1.6+r()*2.4),A=at(d,o),sc=1.2+r()*2.2;put('rotsblok',A.x,dzFoot(C.T,A.x,A.y,A.z,sc*.8)-.3*sc,A.z,sc,r()*6,tint(.08,0),sc*(.6+r()*.5))}
    /* de wand zelf: rotspartijen over de hele hoogte, half in de helling, zodat het een grillige rotswand wordt in plaats van een vlak */
    for(let d=Math.max(ra,a)+r()*4;d<Math.min(rb,end);d+=9+r()*8){const hw=C.hwAt(d),n=Math.max(1,Math.round(dh/8));if(gal.some(([g0,g1])=>d>g0&&d<g1))continue;
      for(let j=0;j<n;j++){const o=side*(hw+2.2+off*(.05+1.1*(j+r()*.6)/n)),q=roadAt(C,d),x=q.x+Math.cos(q.h)*o,z=q.z+Math.sin(q.h)*o,y=C.T.h(x,z),sc=Math.min(1.7+r()*2.2,.8+(Math.abs(o)-hw)*.3);
        if(C.T.exact(x,z)<hw+2.4)continue;put(r()<.5?'rotspartij':'rotspartij2',x,y-.7*sc,z,sc,r()*6,tint(.08,0),sc*(.9+r()*.4))}}}
  /* --- rotonde: middeneiland met fontein en bloemen --- */
  for(const R0 of C.rounds)if(inChunk(R0.at)){put('fontein',R0.x,R0.y+.35,R0.z,1.3,0);for(let i=0;i<26;i++){const t=i/26*Math.PI*2,rr=R0.r-5.2-r()*2;put(r()<.5?'klaproos':'bloem',R0.x+Math.cos(t)*rr,R0.y+.35,R0.z+Math.sin(t)*rr,.9+r()*.4,r()*6)}}
}
