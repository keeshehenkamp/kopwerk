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
const DZ_CACHE={};
/* Bouwt een route-object C dat dezelfde velden heeft als buildCourse (X, Z, Y, HD, K, UP, ...) zodat rijden,
   hoogteprofiel en trainer niets merken van het verschil. */
function designCourse(R){
  const D=ROUTE_DESIGN[R.ontwerp],L=D.km*1000,N=Math.round(L/STEP),h0=D.koers*Math.PI/180;
  const P=dzClose(D),{segs,marks}=dzSegs(P,D.koers),I=dzIntegrate(segs,h0),y=dzProfile(D,marks,L);
  const X=new Float32Array(N+1),Z=new Float32Array(N+1),HD=new Float32Array(N+1),K=new Float32Array(N+1),Y=new Float32Array(N+1);
  let j=0;const n=I.S.length-1;
  for(let k=0;k<=N;k++){const s=k*STEP*I.S[n]/L;while(j<n-1&&I.S[j+1]<s)j++;const u=clamp((s-I.S[j])/(I.S[j+1]-I.S[j]),0,1);
    X[k]=I.X[j]+(I.X[j+1]-I.X[j])*u;Z[k]=-(I.Y[j]+(I.Y[j+1]-I.Y[j])*u);HD[k]=I.H[j]+(I.H[j+1]-I.H[j])*u;K[k]=I.K[j]+(I.K[j+1]-I.K[j])*u;
    const si=Math.min(y.length-2,Math.floor(k*STEP));Y[k]=y[si]+(y[si+1]-y[si])*(k*STEP-si)}
  X[N]=X[0];Z[N]=Z[0];Y[N]=Y[0];K[N]=K[0];
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
  C.bridges=(D.punten||[]).filter(q=>q.soort==='brug').map(q=>{const d=dzAt(q.at,marks);return [d-(q.lengte||28)/2,d+(q.lengte||28)/2]});
  C.sideRoads=[];
  for(const z of D.zijwegen||[]){const d=dzAt(z.at,marks),p=roadAt(C,d);C.sideRoads.push(Object.assign(mkSide(p.x,p.z,p.y,p.h*180/Math.PI+z.hoek,z.stukken,z.helling||0,z.breedte||6,z.soort),{at:d}))}
  C.rounds=[];
  for(const ro of D.rotondes||[]){const m=marks.find(q=>q[0]===ro.mark);if(!m)continue;const p=roadAt(C,m[1]),sgn=m[3];
    /* middelpunt aan de binnenkant van de bocht */
    const cx=p.x+sgn*Math.cos(p.h)*ro.r,cz=p.z+sgn*Math.sin(p.h)*ro.r;C.rounds.push({x:cx,z:cz,y:p.y,r:ro.r,at:m[1]});
    for(const [br,len,hel] of ro.armen){const b=br*Math.PI/180,x=cx+Math.sin(b)*ro.r,z=cz-Math.cos(b)*ro.r;
      C.sideRoads.push(Object.assign(mkSide(x,z,p.y,br,[['S',len]],hel,6.2),{at:m[1],round:true}))}}
  /* klimmen voor het bord onderaan: aaneengesloten stukken die per 200 m meer dan 3% stijgen */
  C.climbs=[];if(D.klim){const a=dzAt(D.klim[0],marks),b=dzAt(D.klim[1],marks);C.climbs.push({a,len:b-a,g:(Y[Math.round(b/STEP)]-Y[Math.round(a/STEP)])/(b-a)*100})}
  else{let a=-1;for(let d=0;d<=L-200;d+=50){const gr=(Y[Math.round((d+200)/STEP)]-Y[Math.round(d/STEP)])/2;if(gr>3&&a<0)a=d;else if(gr<1.5&&a>=0){const len=d+200-a;if(len>800)C.climbs.push({a,len,g:(Y[Math.round((a+len)/STEP)]-Y[Math.round(a/STEP)])/len*100});a=-1}}}
  return C;
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
  const t0=performance.now(),D=C.design,TD=D.terrein||{},cs=8,mg=TD.marge||1200;
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
  const line=(pts0,r)=>{let pts=pts0.map(toW);
    /* kammen: tussen de getekende punten komen pieken en kerven, zodat een kam nergens een vlakke muur is */
    if(Math.max(...pts.map(q=>q[2]||0))>430){const out=[];for(let i=0;i<pts.length-1;i++){const A=pts[i],B=pts[i+1],len=Math.hypot(B[0]-A[0],B[1]-A[1]),n=Math.max(1,Math.round(len/170));
        for(let k=0;k<n;k++){const u=k/n,h=A[2]+(B[2]-A[2])*u;out.push([A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u,k?h*(1+(rq()-.45)*.28):h])}}out.push(pts[pts.length-1]);pts=out}
    for(let i=0;i<pts.length-1;i++){const [ax,az,ah]=pts[i],[bx,bz,bh]=pts[i+1],len=Math.hypot(bx-ax,bz-az),m=Math.max(1,Math.ceil(len/4));
      for(let s=0;s<=m;s++){const u=s/m;stamp(ax+(bx-ax)*u,az+(bz-az)*u,r,ah+(bh-ah)*u,false)}}};
  for(const L of TD.lijnen||[])line(L,9);
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
  /* de weg en zijwegen: hun cellen liggen precies op weghoogte */
  const roads=[C,...(C.sideRoads||[])];
  /* bij een brug ligt alleen het wegdek vast, zodat het land eronder weg kan zakken */
  const onBridge=d=>(C.bridges||[]).some(([b0,b1])=>d>b0&&d<b1);
  roads.forEach((W2,ri)=>{for(let k=0;k<=W2.N;k++){const hw=ri?W2.hw:C.hwAt(k*STEP);stamp(W2.X[k],W2.Z[k],!ri&&onBridge(k*STEP)?hw+.5:Math.max(hw+1.5,6),W2.Y[k]-.15,true,ri?-2-(ri-1):k)}});
  for(let c=0;c<n;c++){if(WR[c]){VS[c]=VR[c]/WR[c];FX[c]=1}else if(WF[c]){VS[c]=VF[c]/WF[c];FX[c]=1}}
  /* meren: bodem vast onder het peil, de oever net onder het peil */
  C.lakes=[];for(const M0 of TD.meren||[]){const M=Object.assign({},M0);if(M.peilAt!=null)M.peil=roadAt(C,C.at(M.peilAt)).y-(M.onder??2.5);const P=M.pt.map(q=>M.anker?toW([M.anker,q[0],q[1],0]).slice(0,2):toW(q).slice(0,2));C.lakes.push({P,peil:M.peil});
    let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;for(const [x,z] of P){bx0=Math.min(bx0,x);bx1=Math.max(bx1,x);bz0=Math.min(bz0,z);bz1=Math.max(bz1,z)}
    for(let j=Math.max(0,Math.floor((bz0-z0)/cs));j<=Math.min(nz-1,Math.ceil((bz1-z0)/cs));j++)for(let i=Math.max(0,Math.floor((bx0-x0)/cs));i<=Math.min(nx-1,Math.ceil((bx1-x0)/cs));i++){
      const x=x0+i*cs,z=z0+j*cs,c=j*nx+i;if(!dzInPoly(P,x,z)||WR[c])continue;VS[c]=M.peil-.8-clamp(dzPolyDist(P,x,z)/3,0,9);FX[c]=2}}
  /* twee velden: afstand tot de hoofdweg (RD, RK = wegpunt) en tot de zijwegen (QD, QK = -2-zijweg) */
  const prop=(D_,K_,X_,Z_)=>{const relax=(c,c2)=>{if(D_[c2]>=1e9)return;const x=x0+(c%nx)*cs,z=z0+Math.floor(c/nx)*cs,dd=Math.hypot(X_[c2]-x,Z_[c2]-z);if(dd<D_[c]){D_[c]=dd;K_[c]=K_[c2];X_[c]=X_[c2];Z_[c]=Z_[c2]}};
    for(let pass=0;pass<2;pass++){
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(i)relax(c,c-1);if(j){relax(c,c-nx);if(i)relax(c,c-nx-1);if(i<nx-1)relax(c,c-nx+1)}}
      for(let j=nz-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const c=j*nx+i;if(i<nx-1)relax(c,c+1);if(j<nz-1){relax(c,c+nx);if(i<nx-1)relax(c,c+nx+1);if(i)relax(c,c+nx-1)}}}};
  prop(RD,RK,SX,SZ);prop(QD,QK,QX,QZ);
  /* Reliëf: ruggen en geulen op verschillende schalen, nul vlak bij de weg. Het wordt vóór het invullen van de vaste waarden
     afgetrokken en na afloop overal opgeteld: zo blijven weg, beken en ruggen precies op hun hoogte en krijgt de rest karakter. */
  const NZ=dzNoise(C.seed),A0=TD.ruis||20,NF=new Float32Array(n);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const c=j*nx+i;if(FX[c]===2)continue;const x=x0+i*cs,z=z0+j*cs,dd=Math.min(RD[c],QD[c]),amp=clamp((dd-12)/150,0,1),fine=clamp((dd-7)/25,0,1);
    NF[c]=amp*A0*((NZ.r(x/620,z/620,3)*2.2-.95)+.6*(NZ.r(x/170+3.1,z/170-5.3,3)*1.6-.62))+fine*(NZ.f(x/48,z/48,2)*2.6+NZ.f(x/14,z/14,1)*.5)}
  for(let c=0;c<n;c++)if(FX[c])VS[c]-=NF[c];
  /* grof naar fijn: Laplace met over-relaxatie */
  const lv=[{nx,nz,FX,V:VS}];
  while(lv[lv.length-1].nx>24&&lv[lv.length-1].nz>24){const A=lv[lv.length-1],bnx=Math.ceil(A.nx/2),bnz=Math.ceil(A.nz/2),bF=new Uint8Array(bnx*bnz),bV=new Float64Array(bnx*bnz),bW=new Float64Array(bnx*bnz);
    for(let j=0;j<A.nz;j++)for(let i=0;i<A.nx;i++){const c=j*A.nx+i;if(!A.FX[c])continue;const b=(j>>1)*bnx+(i>>1);bV[b]+=A.V[c];bW[b]++;bF[b]=1}
    for(let b=0;b<bnx*bnz;b++)if(bF[b])bV[b]/=bW[b];lv.push({nx:bnx,nz:bnz,FX:bF,V:bV})}
  let H=null;
  for(let l=lv.length-1;l>=0;l--){const A=lv[l],w=A.nx,h=A.nz,U=new Float64Array(w*h);
    if(!H){let s=0,c=0;for(let q=0;q<w*h;q++)if(A.FX[q]){s+=A.V[q];c++}U.fill(c?s/c:0)}
    else{const B=lv[l+1];for(let j=0;j<h;j++)for(let i=0;i<w;i++){const fi=Math.min(B.nx-1.001,(i-.5)/2),fj=Math.min(B.nz-1.001,(j-.5)/2),ci=Math.max(0,Math.floor(fi)),cj=Math.max(0,Math.floor(fj)),u=clamp(fi-ci,0,1),v=clamp(fj-cj,0,1);
      U[j*w+i]=(H[cj*B.nx+ci]*(1-u)+H[cj*B.nx+ci+1]*u)*(1-v)+(H[(cj+1)*B.nx+ci]*(1-u)+H[(cj+1)*B.nx+ci+1]*u)*v}}
    for(let q=0;q<w*h;q++)if(A.FX[q])U[q]=A.V[q];
    const it=l===lv.length-1?400:l===0?45:70,om=1.85;
    for(let k=0;k<it;k++)for(let j=0;j<h;j++){const jm=j?j-1:1,jp=j<h-1?j+1:h-2;for(let i=0;i<w;i++){const q=j*w+i;if(A.FX[q])continue;const im=i?i-1:1,ip=i<w-1?i+1:w-2;
      const avg=(U[j*w+im]+U[j*w+ip]+U[jm*w+i]+U[jp*w+i])*.25;U[q]+=om*(avg-U[q])}}
    H=U}
  /* afstand tot de hoofdweg en het dichtstbijzijnde wegpunt, voor elk punt van het raster (twee vegen over het raster) */
  const Hf=new Float32Array(n);for(let c=0;c<n;c++)Hf[c]=H[c]+NF[c];
  C.lakeAt=(x,z)=>{for(const L of C.lakes)if(dzInPoly(L.P,x,z))return L;return null};
  const T={x0,z0,cs,nx,nz,H:Hf,RD,RK,QD,QK,QX,QZ,NZ};
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
  T.forest=(x,z,y)=>{const nn=NZ.f(x/260,z/260,3)*.75+NZ.f(x/60,z/60,2)*.25,tl=TL+NZ.f(x/500,z/500,2)*45,alt=y<25?.3:y<tl-60?-.2:y<tl?-.2+(y-(tl-60))/60*.9:9;return clamp((nn-alt)*4,0,1)};
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
function dzGround(C,x,z,y,out,sp,land){
  const T=C.T,TH=T3;if(!DZC.wei)for(const [k,v] of Object.entries({wei:'#6caa45',bergwei:'#86a653',alp:'#93ad5c',droog:'#b3ab68',fris:'#5f9c3f',bos:'#3a5f2e',bodem:'#4a4a2e',rots:'#7f7b76',puin:'#a39c90',sneeuw:'#eef2f7'}))DZC[k]=new TH.Color(v);
  const sl=T.slope(x,z),n=T.NZ.f(x/38,z/38,2),n2=T.NZ.f(x/9,z/9,1);let f=T.forest(x,z,y);
  if(land==='bos'||land==='loofbos')f=Math.max(f,.85);
  const kaal=land==='pas'?.55:land==='alpen'?.25:0;
  out.copy(DZC.wei).lerp(DZC.bergwei,clamp((y-140)/160,0,1)).lerp(DZC.alp,clamp((y-300)/120,0,1));
  /* vlekken: drogere en frissere stukken wei */
  const n3=T.NZ.f(x/130+7,z/130-3,2);if(n3>.15)out.lerp(DZC.droog,clamp((n3-.15)*2.2,0,.6));else if(n3<-.2)out.lerp(DZC.fris,clamp((-.2-n3)*2.2,0,.55));
  out.lerp(land?DZC.bodem:DZC.bos,f*(land?.9:.8));
  const rock=clamp(clamp((sl-.92)/.4,0,1)+clamp((y-560)/110,0,1)*.7+clamp((y-380)/80,0,1)*clamp(n*1.5,0,.3)+n2*.08+kaal*clamp(n*1.8+.45,0,1),0,1);
  out.lerp(DZC.puin,clamp(rock*.7,0,1)).lerp(DZC.rots,clamp(rock*1.2-.3,0,1));
  const sn=clamp((y-(660+n*70))/35,0,1)*clamp((1.2-sl)/.35,0,1);out.lerp(DZC.sneeuw,sn);
  out.offsetHSL(0,0,n*.035+n2*.02);
  if(sp){sp[0]=rock;sp[1]=land?0:f*(1-rock);sp[2]=sn}
  return out;
}
/* splat-materiaal: gras, rots (op steile vlakken van opzij geprojecteerd) en boomkruinen gemengd per hoekpunt */
function dzSplatMat(){
  const TH=T3;if(W.mat.splat)return W.mat.splat;
  if(!W.tex.rots){W.tex.rots=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#9a958e';c.fillRect(0,0,w,h);
      for(let i=0;i<2600;i++){const v=Math.random();c.fillStyle=v<.5?`rgba(60,58,56,${.08+v*.25})`:`rgba(235,232,226,${(v-.5)*.3})`;c.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*5,1+Math.random()*3)}
      for(let y=0;y<h;y+=10+Math.random()*16){c.strokeStyle='rgba(50,48,46,.35)';c.lineWidth=1+Math.random()*1.5;c.beginPath();c.moveTo(0,y);for(let x=0;x<=w;x+=16)c.lineTo(x,y+(Math.random()-.5)*6);c.stroke()}
      for(let i=0;i<14;i++){c.strokeStyle='rgba(40,38,36,.4)';c.lineWidth=1.2;let x=Math.random()*w,y=0;c.beginPath();c.moveTo(x,y);while(y<h){y+=8;x+=(Math.random()-.5)*6;c.lineTo(x,y)}c.stroke()}});
    W.tex.kruin=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#4a6340';c.fillRect(0,0,w,h);
      for(let i=0;i<520;i++){const x=Math.random()*w,y=Math.random()*h,r=5+Math.random()*9;for(const [dx,dy] of[[0,0],[w,0],[-w,0],[0,h],[0,-h]]){const g=c.createRadialGradient(x+dx-r*.3,y+dy-r*.3,1,x+dx,y+dy,r);g.addColorStop(0,'#a9c09a');g.addColorStop(.6,'#6f8a5e');g.addColorStop(1,'rgba(40,60,36,0)');c.fillStyle=g;c.beginPath();c.arc(x+dx,y+dy,r,0,7);c.fill()}}});
    for(const t of[W.tex.rots,W.tex.kruin]){t.wrapS=t.wrapT=TH.RepeatWrapping;t.colorSpace=TH.SRGBColorSpace;t.anisotropy=ANISO}}
  const m=new TH.MeshLambertMaterial({vertexColors:true,map:W.tex.gras});
  m.onBeforeCompile=sh=>{sh.uniforms.tRock={value:W.tex.rots};sh.uniforms.tCan={value:W.tex.kruin};
    sh.vertexShader='attribute vec3 sp;\nvarying vec3 vSp;\nvarying vec3 vWq;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSp=sp;vWq=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader='uniform sampler2D tRock,tCan;\nvarying vec3 vSp;\nvarying vec3 vWq;\n'+sh.fragmentShader.replace('#include <map_fragment>',`
      vec4 tg=texture2D(map,vMapUv);vec3 nq=normalize(cross(dFdx(vWq),dFdy(vWq)));
      vec2 ur=abs(nq.x)>abs(nq.z)?vec2(vWq.z,vWq.y*1.6):vec2(vWq.x,vWq.y*1.6);
      vec3 tr=texture2D(tRock,ur/11.).rgb*1.15;tr=mix(tr,texture2D(tRock,vWq.xz/13.).rgb*1.15,clamp(abs(nq.y)*1.6-.9,0.,1.));
      vec3 tc=texture2D(tCan,vWq.xz/26.).rgb*1.12;
      vec3 tt=mix(tg.rgb,tr,clamp(vSp.x,0.,1.));tt=mix(tt,tc,clamp(vSp.y,0.,1.));tt=mix(tt,vec3(1.),clamp(vSp.z,0.,1.));
      diffuseColor.rgb*=tt;`)};
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
      y=dm<56?mn-1.6:y+(mn-1.6-y)*clamp((66-dm)/10,0,1)}
    if(dm<26&&T.RK[ci]>=0)y=Math.min(y,C.Y[T.RK[ci]]-1.6);
    if(ds<22){const sy=T.h(T.QX[ci],T.QZ[ci]);y=Math.min(y,sy-1.3)}
    dzGround(C,x,z,T.H[ci],c,sp);if(Math.min(dm,ds)<7){c.lerp(asf,.8);sp[1]=0}
    /* bos van ver: het net ligt op kruinhoogte, zodat bosranden en heuvels met bos een silhouet hebben */
    y+=13*sp[1]*clamp((Math.min(dm,ds)-70)/50,0,1);
    pos[v*3]=x;pos[v*3+1]=y;pos[v*3+2]=z;uvs[v*2]=x/14;uvs[v*2+1]=z/14;spa.set(sp,v*3);col[v*3]=c.r;col[v*3+1]=c.g;col[v*3+2]=c.b}
  const idx=[];for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,d=a+nx,e=d+1;idx.push(a,d,b,b,d,e)}
  const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(pos,3));g.setAttribute('color',new TH.BufferAttribute(col,3));g.setAttribute('uv',new TH.BufferAttribute(uvs,2));g.setAttribute('sp',new TH.BufferAttribute(spa,3));g.setIndex(idx);g.computeVertexNormals();
  const m=new TH.Mesh(g,dzSplatMat());m.receiveShadow=true;m.userData.far2=true;m.frustumCulled=false;return m;
}
/* meren als vlak water op het peil */
function dzLakes(C){
  const TH=T3,out=[];for(const L of C.lakes||[]){const sh=new TH.Shape(L.P.map(([x,z])=>new TH.Vector2(x,-z)));
    const g=new TH.ShapeGeometry(sh,8);g.rotateX(-Math.PI/2);g.translate(0,L.peil,0);const m=new TH.Mesh(g,W.mat.water);m.userData.far2=true;out.push(m)}
  return out;
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
  const tmp=new TH.Color(),berm=new TH.Color('#8a8a6c'),pave=new TH.Color('#a59f94');
  /* --- fijn land langs de weg, tot 56 m opzij; in een haarspeldbocht afgekapt halverwege het andere been --- */
  {const REL=[-.25,.6,1.7,3.2],ABS=[7.5,10.5,14,19,25,32,40,48,56],rows=Math.ceil((end-a)/DS)+1,pos=[],col=[],uv=[],idx=[],spl=[],sp=[0,0,0];let nc=0;
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
        dzGround(C,x,z,y,tmp,sp,land);if(ao<hw+.7){tmp.lerp(berm,.45);sp[0]*=.3}if(land==='dorp'&&ao<hw+2.8)tmp.lerp(pave,.8);
        col.push(tmp.r,tmp.g,tmp.b);spl.push(sp[0],sp[1],sp[2])}}
    for(let j=0;j<rows-1;j++)for(let i=0;i<nc-1;i++){if(i===nc/2-1)continue;const q=j*nc+i;idx.push(q,q+1,q+nc,q+1,q+nc+1,q+nc)}
    const tg=geo(pos,idx,col,uv);tg.setAttribute('sp',new TH.Float32BufferAttribute(spl,3));const tm=new TH.Mesh(tg,dzSplatMat());tm.receiveShadow=true;g.add(tm)}
  yield;
  /* --- de weg: breedte en tint per sectie --- */
  const TINT={dorp:[1.02,1,.98],dal:[1,1,1.02],bosrand:[.97,.98,1],rots:[1.04,1.04,1.06],bos:[.95,.96,.98],boomgrens:[1.03,1.03,1.05],alpen:[1.05,1.05,1.07],pas:[1.08,1.07,1.08],alm:[1.02,1.02,1.04],loofbos:[.96,.97,.98],westdal:[1,1,1.02]};
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
    const uvs=[];for(let i=0;i<pa.count;i++)uvs.push(pa.getX(i)/9,pa.getZ(i)/48);ring.setAttribute('uv',new TH.Float32BufferAttribute(uvs,2));ring.setAttribute('color',new TH.Float32BufferAttribute(new Array(pa.count*3).fill(1),3));ring.computeVertexNormals();
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
  const tree=(k,x,y,z,s,near)=>{k+=near?'*':W.G[k+'~']?'~':'';put(k,x,y-.15,z,s,r()*6,tint(),s*(.85+r()*.35),(r()-.5)*.06);if(near)put('blob',x,y+.05,z,s*2.2,0)};
  const FARP=[KN('pineTallA'),KN('pineTallB'),KN('cone')].filter(Boolean);
  /* wat er groeit, per landschap: [kans op boom bij vol bos, kans op boom in de wei, soorten] */
  const VEG={dorp:[.2,.06,['boom','fruitboom','berk','loof']],dal:[.55,.05,['boom','eik','berk','loof','fruitboom']],westdal:[.55,.05,['populier','boom','eik','loof']],
    bosrand:[.85,.12,['den','pine','loof','berk']],rots:[.85,.04,['den','pine','den']],bos:[1,.5,['den','pine','pine','den','pine','den','pine','berk']],boomgrens:[.55,.06,['den','pine','alp']],
    alpen:[.2,.02,['alp']],pas:[0,0,['alp']],alm:[.6,.04,['den','pine','alp']],loofbos:[.95,.4,['loof','eik','boom','berk','den','loof']]};
  let bx0=1e9,bx1=-1e9,bz0=1e9,bz1=-1e9;for(let k=k0;k<=k1;k++){bx0=Math.min(bx0,C.X[k]);bx1=Math.max(bx1,C.X[k]);bz0=Math.min(bz0,C.Z[k]);bz1=Math.max(bz1,C.Z[k])}
  const owns=(x,z)=>{const k=T.near(x,z);return k>=k0&&k<k1};
  /* hoogte van de grond vlak naast de weg, precies zoals het fijne land hierboven */
  const yAt=(p,hw,ao,x,z)=>{if(ao<=hw+.3)return p.y-.1;const t=clamp((ao-hw-.3)/3.4,0,1),th=T.h(x,z);return p.y-.12+(th-p.y+.12)*t*t*(3-2*t)};
  /* bomen: Poisson-schijf, daarna per punt kijken of hier bos, wei of rots is */
  const PT=yield* dzPoisson(bx0-60,bz0-60,bx1+60,bz1+60,W.lite?6:4.6,r);yield;
  let cnt=0;
  for(const [x,z] of PT){if(++cnt%400===0)yield;
    if(!owns(x,z))continue;const dm=T.distMain(x,z),ds=T.distSide(x,z);if(dm>57)continue;
    const k=T.near(x,z),d=k*STEP,P=C.secP(d),hw=C.hwAt(d);if(dm<30&&T.exact(x,z)<hw+2.6)continue;if(ds<12&&T.exact(x,z)<hw+2.6)continue;if(C.lakeAt&&C.lakeAt(x,z))continue;
    const pp=roadAt(C,d),y=dm<hw+4?yAt(pp,hw,dm,x,z):T.h(x,z),sl=T.slope(x,z),V=VEG[P.land]||VEG.dal,u=r();
    let F=T.forest(x,z,y);if(P.land==='bos'||P.land==='loofbos')F=Math.max(F,.9);
    const ptree=F*V[0]*(.55+.45*(P.dicht??.5))*1.15+V[1];
    if(sl<1.25&&u<ptree){const kind=pick(V[2]),near=dm<22,s=.85+r()*.5;
      if((kind==='pine'||kind==='den')&&!near&&dm>34&&FARP.length&&r()<.6)put(pick(FARP)+'~',x,y-.1,z,s*1.15,r()*6,tint(.14,.03),s*(1.1+r()*.35));
      else if(kind==='pine'&&PINES.length)put(pick(PINES)+(near?'*':'~'),x,y-.1,z,s*1.05,r()*6,tint(.14,.03),s*(1+r()*.3));
      else if(kind==='loof'&&LOOF.length)put(pick(LOOF)+(near?'*':'~'),x,y-.1,z,s,r()*6,tint(.16,.05),s*(.9+r()*.3));
      else if(kind==='alp'&&ALP.length)put(pick(ALP),x,y-.1,z,s*(.45+r()*.35),r()*6,tint(.12,.03));
      else tree(kind,x,y,z,s,near);continue}
    /* geen boom: soms een rots, struik of keien */
    const v=r();
    /* rotsen in groepjes: waar de ruis het zegt, en vooral op steile of hoge plekken */
    const rc=T.NZ.f(x/70+11,z/70-4,2),rp=(rc>.2?.55:.03)*clamp((sl-.45)*2+(y>320?.6:0),0,1);
    if(v<rp&&sl<1.7){const R2=r()<.55?'rotsblok':'rots',sc=(.7+r()*1.5)*(sl>1.3?1.5:1);put(R2,x,y-.45*sc,z,sc,r()*6,tint(.1,0),sc*(.6+r()*.7))}
    else if((P.land==='pas'||P.land==='alpen')&&v<(P.land==='pas'?.07:.025)&&dm>hw+5){const sc=2+r()*3.5;put('rotsblok',x,y-.5*sc,z,sc,r()*6,tint(.08,0),sc*(.5+r()*.6))}
    else if(v<.1&&P.land!=='pas'){put(SHR.length&&r()<.6?pick(SHR):'struik',x,y,z,.6+r()*.7,r()*6,tint())}
    else if(v<.13&&y>250&&rc>0)put('keien',x,y,z,.7+r(),r()*6,tint(.15,0));
  }
  yield;
  /* berm: graspollen, bloemen en paaltjes */
  for(let d=a+2;d<end;d+=2.2+r()*2){const p=roadAt(C,d),hw=C.hwAt(d),P=C.secP(d),nx=Math.cos(p.h),nzv=Math.sin(p.h);
    for(const s of[-1,1]){if(r()<.25)continue;const o=s*(hw+.4+r()*2.2),x=p.x+nx*o,z=p.z+nzv*o;if(T.near(x,z)<k0||T.near(x,z)>=k1||T.distSide(x,z)<3)continue;
      const y=yAt(p,hw,Math.abs(o),x,z);if(W.lite&&r()<.5)continue;
      if(P.land==='pas'&&r()<.5)put('keien',x,y,z,.5+r()*.6,r()*6,tint(.15,0));else put('pol',x,y,z,.45+r()*.7,r()*6,tint(.2,.06));
      if(P.land!=='pas'&&P.land!=='dorp'&&r()<.07)put(r()<.5?'bloem':'madelief',x,y,z,.8+r()*.4,r()*6)}}
  /* reflectorpaaltjes op wisselende afstanden */
  for(let d=a+r()*30;d<end;d+=28+r()*40){const P=C.secP(d);if(P.rand==='stoep')continue;const p=roadAt(C,d),hw=C.hwAt(d);
    for(const s of[-1,1]){const o=s*(hw+.55),x=p.x+Math.cos(p.h)*o,z=p.z+Math.sin(p.h)*o;if(T.distSide(x,z)<6)continue;put('paal',x,yAt(p,hw,hw+.55,x,z),z,1,-p.h+(s<0?Math.PI:0))}}
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
  G.pilaar=partsGeo([[new TH.BoxGeometry(.7,5.4,.9),'#b7b3ab',M4(0,2.7,0)],[new TH.BoxGeometry(1.1,.4,1.3),'#a9a59d',M4(0,5.3,0)]]);
  /* richtingbord: gele Franse wegwijzer op twee palen */
  G.paalgrijs=partsGeo([[new TH.CylinderGeometry(.05,.05,2.6,6),'#9aa0a6',M4(0,1.3,0)]]);
  /* telescoop op het uitkijkpunt en een stenen steenman */
  G.kijker=partsGeo([[new TH.CylinderGeometry(.06,.08,1.1,8),'#5c636b',M4(0,.55,0)],[new TH.CylinderGeometry(.13,.16,.7,10),'#2d6d9e',(()=>{const m=new TH.Matrix4().makeRotationX(1.2);m.setPosition(0,1.25,.05);return m})()]]);
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
/* gele wegwijzer op een paal, met pijl */
function dzDirSign(lines){
  const TH=T3,g=new TH.Group(),post=new TH.Mesh(new TH.CylinderGeometry(.05,.05,2.6,6),new TH.MeshLambertMaterial({color:'#9aa0a6'}));post.position.y=1.3;g.add(post);
  lines.forEach(([txt,dir],i)=>{const tex=canvasTex(320,64,(c,w,h)=>{c.fillStyle='#f2c230';c.beginPath();if(dir<0){c.moveTo(0,h/2);c.lineTo(28,0);c.lineTo(w,0);c.lineTo(w,h);c.lineTo(28,h)}else{c.moveTo(w,h/2);c.lineTo(w-28,0);c.lineTo(0,0);c.lineTo(0,h);c.lineTo(w-28,h)}c.closePath();c.fill();
      c.fillStyle='#1b1b1b';c.font='800 26px Inter, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,w/2+(dir<0?10:-10),h/2+1)});
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
  /* --- borden --- */
  const alt=y=>Math.round((D.hoogteDorp||1000)+y);
  hps.forEach((m,i)=>{const d=m[1]-26;if(!inChunk(d))return;place(makeVirage(hps.length-i,alt(roadAt(C,m[1]).y)),d,C.hwAt(d)+1.3)});
  if(D.klim){const top=C.at(D.klim[1]),bot=C.at(D.klim[0]);for(let n=1;top-n*1000>bot;n++){const d=top-n*1000;if(!inChunk(d))continue;
    const pct=(roadAt(C,d+1000).y-roadAt(C,d).y)/10;place(dzKmSign(D.naam||C.route.name,n,nl(pct.toFixed(1)),alt(roadAt(C,d).y)),d,C.hwAt(d)+1.1,0).rotation.y+=.25}}
  for(let d=Math.max(80,a);d<Math.min(L-80,end);d+=10){const k1=C.K[kAt(C,d+60)],k0=C.K[kAt(C,d)];
    if(Math.abs(k1)>1/55&&Math.abs(k0)<1/400&&C.secP(d).rand!=='stoep'&&!hps.some(m=>Math.abs(m[1]-d)<90)){place(makeBend(k1>0),d,C.hwAt(d)+1.2);d+=260}}
  for(const S of C.sideRoads)if(!S.round&&S.soort==='weg'&&inChunk(S.at-45)){const out=S.at>C.L/2;
    place(dzDirSign(out?[[C.route.name.replace(/^De /,'')+' · Valbrenne',-1]]:[[D.naam||'Col',-1],['Vallée',1]]),S.at-45,C.hwAt(S.at)+1.4)}
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
    if(q.soort==='kapel'&&inChunk(q.d)){const m=hps[q.hp-1],s=-m[3],o=s*(C.hwAt(q.d)+7),A=at(q.d,o);
      put('kapel',A.x,A.y,A.z,1,face(A.q.h,s));put('bank',A.x+Math.cos(A.q.h)*-s*3.2,A.y,A.z+Math.sin(A.q.h)*-s*3.2+2.5,1,face(A.q.h,s));tree('berk',A.x-Math.sin(A.q.h)*7,A.y,A.z+Math.cos(A.q.h)*7,1,true)}
    if(q.soort==='berghut'&&inChunk(q.d)){const m=hps[q.hp-1],s=-m[3],o=s*(C.hwAt(q.d)+(q.af||18)),A=at(q.d,o);
      put('berghut',A.x,A.y-.3,A.z,1,face(A.q.h,s));for(let i=0;i<5;i++){const B=at(q.d+(r()-.5)*14,s*(C.hwAt(q.d)+6+r()*6));put('loper',B.x,B.y,B.z,1,r()*6,new TH.Color().setHSL(r(),.6,.5))}}
    if(q.soort==='galerij'){const d0=Math.max(galR[0],a),d1=Math.min(galR[1],end);if(d1>d0){
      /* lawinegalerij: dak van beton over de weg, pijlers aan de dalkant, de bergkant is de rotswand */
      const pos=[],idx=[],side=1;for(let d=d0,i=0;d<=d1+.01;d+=2,i++){const p=roadAt(C,d),hw=C.hwAt(d),nx=Math.cos(p.h),nz=Math.sin(p.h),yt=p.y+5.6;
        for(const [o,dy] of[[-hw-3,.9],[-hw-1.6,.5],[hw+1.4,.5],[hw+1.4,-.3],[hw+1.4,-.6],[-hw-3,-.6]])pos.push(p.x+nx*o,yt+dy,p.z+nz*o);
        if(i){const b=(i-1)*6;for(let k=0;k<5;k++)idx.push(b+k,b+k+6,b+k+1,b+k+1,b+k+6,b+k+7)}
        if(i%3===0){const o=side*(hw+1.05);put('pilaar',p.x+nx*o,p.y,p.z+nz*o,1,-p.h)}}
      const gm=new TH.Mesh(geo(pos,idx),M.beton||(M.beton=new TH.MeshLambertMaterial({color:'#b9b5ad',side:TH.DoubleSide})));gm.castShadow=gm.receiveShadow=true;g.add(gm)}}
    if(q.soort==='dam'){const S=C.sideRoads.find(x=>x.soort==='dam');if(S&&inChunk(S.at)){
      /* stuwdam onder de weg over de kruin: meerkant steil, dalkant lang en hol naar de beek */
      const prof=[[-3.2,-12],[-2.6,-.6],[-2.4,.95],[-2.1,.95],[-2.1,.1],[2.1,.1],[2.1,.95],[2.4,.95],[2.6,-.6],[5,-6],[9,-14],[12,-24],[13,-34]];
      const pos=[],idx=[],n=Math.ceil(S.vis/STEP);for(let k=0;k<=n;k++){const nx=Math.cos(S.HD[k]),nz=Math.sin(S.HD[k]);for(const [o,dy] of prof)pos.push(S.X[k]+nx*o,S.Y[k]+dy,S.Z[k]+nz*o);
        if(k){const b=(k-1)*prof.length;for(let j=0;j<prof.length-1;j++)idx.push(b+j,b+j+prof.length,b+j+1,b+j+1,b+j+prof.length,b+j+prof.length+1)}}
      const dm=new TH.Mesh(geo(pos,idx),M.beton||(M.beton=new TH.MeshLambertMaterial({color:'#b9b5ad',side:TH.DoubleSide})));dm.castShadow=dm.receiveShadow=true;g.add(dm)}}
    if(q.soort==='pas'&&inChunk(q.d)){const hw=C.hwAt(q.d);place(dzPassSign(D.naam||C.route.name,alt(roadAt(C,q.d).y)),q.d,hw+3.2);
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
    if(q.soort==='zagerij'&&inChunk(q.d)){const s=q.kant||1,A=at(q.d,s*(C.hwAt(q.d)+12));put('zagerij',A.x,A.y-.1,A.z,1,face(A.q.h,s)+Math.PI/2);
      const KH=(W.KC&&W.KC.hout)||[];for(let i=0;i<4;i++){const B=at(q.d-14+i*3.4,s*(C.hwAt(q.d)+5+r()*2));put(KH.length?KH[i%KH.length]:'hout',B.x,B.y,B.z,1.2,-B.q.h+(r()-.5)*.3)}
      const Cq=at(q.d+12,s*(C.hwAt(q.d)+6));put('auto',Cq.x,Cq.y,Cq.z,1,face(Cq.q.h,s)+Math.PI/2,new TH.Color('#2d5d3a'))}
    if(q.soort==='boerderij'&&inChunk(q.d)){const s=q.kant||1,A=at(q.d,s*(C.hwAt(q.d)+(q.af||30)));put('chalet2',A.x,A.y-.2,A.z,1,face(A.q.h,s),tint(.1,.02));
      const B=at(q.d+16,s*(C.hwAt(q.d)+(q.af||30)+4));put('hooischuur',B.x,B.y-.3,B.z,1,face(B.q.h,s)+Math.PI/2,tint(.1,.02));
      for(let i=0;i<4;i++){const E=at(q.d-10-i*4,s*(C.hwAt(q.d)+12+r()*8));put('baal',E.x,E.y,E.z,1,r()*6)}
      for(let i=0;i<5;i++){const E=at(q.d-30+r()*60,s*(C.hwAt(q.d)+40+r()*10));put('koe',E.x,E.y,E.z,1,r()*6,new TH.Color(.82,.62,.45))}}
    if(q.soort==='koeien'){const d0=Math.max(C.at(q.van),a),d1=Math.min(C.at(q.tot),end);for(let d=d0;d<d1;d+=18+r()*40){const s=r()<.5?-1:1,E=at(d,s*(C.hwAt(d)+9+r()*30));if(T.slope(E.x,E.z)<.5)put('koe',E.x,E.y,E.z,1,r()*6,new TH.Color().setHSL(.07,.35,.35+r()*.35))}}
  }
  yield;
  /* --- dorpen: huizen langs de straat, stoepen met tegels, een plein met kerk, lantaarns en mensen --- */
  for(const v of D.dorpen||[]){let v0=C.at(v.van),v1=C.at(v.tot);v0=((v0%L)+L)%L;v1=((v1%L)+L)%L;if(v1<v0)v1+=L;
    for(const sh of[0,-L]){const s0=Math.max(v0+sh,a),s1=Math.min(v1+sh,end);if(s1<=s0)continue;yield;
      const pl=v.plein?((C.at(v.plein)%L)+L)%L:-1e9,ks=v.kant||-1,list=v.huizen||['chalet'];
      const WD={chalet:8,chalet2:9,chalet3:10,steenhuis:7,herberg:11,hooischuur:8},DP={chalet:9,chalet2:11.5,chalet3:11,steenhuis:8.5,herberg:10,hooischuur:11};
      for(const side of[-1,1])for(let row=0;row<(v.klein?1:2);row++){let d=s0+r()*4;
        while(d<s1){const k=list[Math.floor(r()*list.length)],w=WD[k]||8,dp=DP[k]||9,hw=C.hwAt(d);
          if(side===ks&&Math.abs(d-pl)<32&&row===0){d=pl+32;continue}
          const off=side*(hw+(v.klein?5:3.4)+row*(dp+6)+r()*(row?6:2.2)+dp/2),A=at(d+w/2,off);
          if(T.distSide(A.x,A.z)<dp/2+4||(C.rounds||[]).some(R0=>Math.hypot(R0.x-A.x,R0.z-A.z)<R0.r+dp)){d+=4;continue}
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
        if(pl>=s0&&pl<s1){const hw=C.hwAt(pl),A=at(pl,ks*(hw+17));put('plein',A.x,A.y+.03,A.z,1.2,face(A.q.h,ks));
          const K=at(pl,ks*(hw+38));put('alpenkerk',K.x,T.h(K.x,K.z)-.4,K.z,1,face(K.q.h,ks));put('blob',K.x,K.y+.06,K.z,11,0);
          const F=at(pl,ks*(hw+15));put('fontein',F.x,F.y+.05,F.z,1,0);
          for(const dd of[-11,-7,8,12]){const E=at(pl+dd,ks*(hw+9+r()*3));put('terras',E.x,E.y+.05,E.z,1,r()*6,new TH.Color().setHSL([0,.08,.55,.33][Math.floor(r()*4)],.65,.55));if(r()<.7)put('loper',E.x+.8,E.y,E.z,1,r()*6,new TH.Color().setHSL(r(),.6,.5))}
          for(const dd of[-16,16]){const E=at(pl+dd,ks*(hw+24));tree('boom',E.x,E.y,E.z,.9,true)}
          for(let i=0;i<5;i++){const E=at(pl+10+i*.8,ks*(hw+3.6));put('fiets',E.x,E.y,E.z,1,face(E.q.h,ks)+Math.PI/2+.25,new TH.Color().setHSL(r(),.6,.5))}}}
      /* plaatsnaamborden */
      for(const [dd,out] of[[v0-14,false],[v1+14,true]])for(const sh2 of[0,-L])if(dd+sh2>=a&&dd+sh2<end&&dd+sh2>=0){place(makePlace(v.naam,out,true),dd+sh2,C.hwAt(dd+sh2)+1.3)}
    }
  }
  /* --- grote rotsblokken aan de voet van rotswanden --- */
  for(const [a0,b0,side,off,dh] of (D.terrein&&D.terrein.randen)||[]){if(dh<=0)continue;const ra=C.at(a0),rb=C.at(b0);
    for(let d=Math.max(ra,a)+r()*10;d<Math.min(rb,end);d+=9+r()*16){const o=side*(C.hwAt(d)+1.6+r()*2.4),A=at(d,o),sc=1.2+r()*2.2;put('rotsblok',A.x,A.y-.4*sc,A.z,sc,r()*6,tint(.08,0),sc*(.6+r()*.5))}}
  /* --- rotonde: middeneiland met fontein en bloemen --- */
  for(const R0 of C.rounds)if(inChunk(R0.at)){put('fontein',R0.x,R0.y+.35,R0.z,1.3,0);for(let i=0;i<26;i++){const t=i/26*Math.PI*2,rr=R0.r-5.2-r()*2;put(r()<.5?'klaproos':'bloem',R0.x+Math.cos(t)*rr,R0.y+.35,R0.z+Math.sin(t)*rr,.9+r()*.4,r()*6)}}
}
