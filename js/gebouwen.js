'use strict';
/* ================= Gebouwen op maat =================
   Elk huis wordt los opgebouwd uit vlakken, op zijn eigen maat en met zijn eigen toeval: muren, dak, ramen met kozijn en luiken,
   deur met stoep, schoorsteen, dakkapellen, erker, aanbouw. Geen twee huizen zijn daardoor gelijk, terwijl alles in één net per
   kilometer blijft (één tekenopdracht). Het materiaal is hetzelfde als van de kant-en-klare huizen (W.mat.gevel): baksteen,
   pleister, planken, dakpannen en spiegelend glas worden per vlak getekend aan de hand van het patroonnummer.

   Maten in meters. Elk gebouw heeft een eigen assenstelsel: u langs de lange zijde (de nok), v dwars, h omhoog vanaf de grond.

   const B=dzBouwer();  B.huis({x,y,z, ang, w, d, stijl, zaad, voor:[x,z]});  ...  const net=B.net();
   stijl: 'nl' (woonhuis), 'boerderij', 'schuur', 'pand' (groot, in een dorp), 'provence', 'kerknl', 'kerkprov'
   ang: richting van de lange zijde (0 = oost, tegen de klok in); voor: richting van het huis naar de weg */
const DZ_P={effen:1,steen:10,pleister:3,plank:4,natuursteen:12,glas:6,pan:7,romein:8,lei:9,damwand:11};
function dzBouwer(){
  const TH=T3,pos=[],col=[],pat=[],kl=new Map(),K=h=>{let c=kl.get(h);if(!c)kl.set(h,c=new TH.Color(h));return c};
  let ox=0,oy=0,oz=0,ux=1,uz=0,vx=0,vz=1,rnd=Math.random;
  /* één hoekpunt: plaats in de wereld, kleur (onderaan iets donkerder, zoals een huis dat in het gras staat) en patroon */
  const pt=(q,c,p,k)=>{pos.push(ox+ux*q[0]+vx*q[1],oy+q[2],oz+uz*q[0]+vz*q[1]);const f=k??(.74+.26*clamp(q[2]/1.8,0,1));col.push(c.r*f,c.g*f,c.b*f);pat.push(p)};
  const tri=(a,b,c2,kleur,p,k)=>{const c=K(kleur);pt(a,c,p,k);pt(b,c,p,k);pt(c2,c,p,k)};
  const vlak=(a,b,c2,d,kleur,p,k)=>{tri(a,b,c2,kleur,p,k);tri(a,c2,d,kleur,p,k)};
  /* veelhoek (bol, in één vlak) als waaier */
  const veel=(P,kleur,p,k)=>{for(let i=1;i<P.length-1;i++)tri(P[0],P[i],P[i+1],kleur,p,k)};
  const blok=(u0,u1,v0,v1,h0,h1,kleur,p,k)=>{vlak([u0,v0,h0],[u1,v0,h0],[u1,v0,h1],[u0,v0,h1],kleur,p,k);vlak([u1,v1,h0],[u0,v1,h0],[u0,v1,h1],[u1,v1,h1],kleur,p,k);
    vlak([u0,v1,h0],[u0,v0,h0],[u0,v0,h1],[u0,v1,h1],kleur,p,k);vlak([u1,v0,h0],[u1,v1,h0],[u1,v1,h1],[u1,v0,h1],kleur,p,k);vlak([u0,v0,h1],[u1,v0,h1],[u1,v1,h1],[u0,v1,h1],kleur,p,k)};
  /* een wand: midden O, richting T langs de wand, N naar buiten. R = rechthoek op de wand (off = hoe ver ervoor), D = doosje dat uitsteekt */
  const wand=(O,T,N,len)=>{const q=(s,h,off)=>[O[0]+T[0]*s+N[0]*off,O[1]+T[1]*s+N[1]*off,h];
    const R=(s0,s1,h0,h1,off,kleur,p,k)=>vlak(q(s0,h0,off),q(s1,h0,off),q(s1,h1,off),q(s0,h1,off),kleur,p,k);
    const D=(s0,s1,h0,h1,dep,kleur,p,k)=>{R(s0,s1,h0,h1,dep,kleur,p,k);vlak(q(s0,h0,0),q(s0,h0,dep),q(s0,h1,dep),q(s0,h1,0),kleur,p,k);vlak(q(s1,h0,dep),q(s1,h0,0),q(s1,h1,0),q(s1,h1,dep),kleur,p,k);
      vlak(q(s0,h1,0),q(s0,h1,dep),q(s1,h1,dep),q(s1,h1,0),kleur,p,k);vlak(q(s0,h0,dep),q(s0,h0,0),q(s1,h0,0),q(s1,h0,dep),kleur,p,k)};
    return {q,R,D,len,O,T,N}};
  /* raam: kozijn, glas, roeden, vensterbank en zo nodig luiken. o: {kozijn, luik, roede: 'kruis'|'T'|'geen', bank} */
  const raam=(Wd,s,hb,ww,wh,o)=>{const kz=o.kozijn||'#f6f2e8';
    Wd.R(s-ww/2-.08,s+ww/2+.08,hb-.08,hb+wh+.08,.03,kz,1,1);Wd.R(s-ww/2,s+ww/2,hb,hb+wh,.05,o.glas||'#30455a',6,1);
    if(o.roede!=='geen'){if(ww>.75)Wd.R(s-.028,s+.028,hb,hb+wh,.065,kz,1,1);const ht=o.roede==='T'?.7:.5;if(wh>.9)Wd.R(s-ww/2,s+ww/2,hb+wh*ht-.028,hb+wh*ht+.028,.065,kz,1,1)}
    if(o.bank!==false)Wd.D(s-ww/2-.14,s+ww/2+.14,hb-.16,hb-.08,.11,o.bankKl||kz,1,1);
    if(o.luik){const lw=Math.min(.5,ww*.5);for(const z of[-1,1])Wd.R(s+z*(ww/2+.09),s+z*(ww/2+.09+lw),hb-.02,hb+wh+.02,.045,o.luik,1,1)}
    if(o.bak){Wd.D(s-ww/2,s+ww/2,hb-.36,hb-.18,.24,'#8a5a3a',1,1);for(let i=0;i<4;i++){const x=s-ww/2+ww*(i+.5)/4;Wd.D(x-.11,x+.11,hb-.2,hb-.04,.22,['#e8405a','#ffd23f','#ff8ad0','#f4f4f4'][Math.floor(rnd()*4)],1,1)}}};
  const deur=(Wd,s,dw,dh,o)=>{const kz=o.kozijn||'#f6f2e8';Wd.R(s-dw/2-.09,s+dw/2+.09,0,dh+.09,.03,kz,1,1);Wd.R(s-dw/2,s+dw/2,.02,dh,.055,o.deur,1,1);
    if(o.ruit!==false)Wd.R(s-dw*.28,s+dw*.28,dh*.62,dh*.9,.07,'#30455a',6,1);
    if(o.boven)Wd.R(s-dw/2,s+dw/2,dh+.14,dh+.5,.05,'#30455a',6,1);
    Wd.D(s-dw/2-.25,s+dw/2+.25,-.3,.13,.5,'#b9b0a2',1,1);
    if(o.luifel)Wd.D(s-dw/2-.35,s+dw/2+.35,dh+(o.boven?.62:.22),dh+(o.boven?.72:.32),.75,kz,1,1)};
  /* zadeldak met de nok langs u. wolf: 0 = puntgevel, 0-1 = wolfseind (afgeknotte punt), 1 = schilddak. Geeft de nokhoogte terug */
  const dak=(hl,hv,h,rh,ov,og,kleur,p,wolf=0,muur,mp)=>{
    if(!wolf){const e=h-ov*rh/hv;for(const s of[-1,1])vlak([-hl-og,s*(hv+ov),e],[hl+og,s*(hv+ov),e],[hl+og,0,h+rh],[-hl-og,0,h+rh],kleur,p,1);
      if(muur)for(const s of[-1,1])tri([s*hl,-hv,h],[s*hl,hv,h],[s*hl,0,h+rh],muur,mp,1);
      /* windveer: lichte lijst langs de dakrand op de kopgevel */
      return h+rh}
    const HL=hl+ov,HV=hv+ov,e=h-ov*rh/hv,RH=rh+ov*rh/hv,ru=HL-wolf*HV,ht=e+RH*(1-wolf);
    for(const s of[-1,1])veel([[-HL,s*HV,e],[HL,s*HV,e],[HL,s*wolf*HV,ht],[ru,0,e+RH],[-ru,0,e+RH],[-HL,s*wolf*HV,ht]],kleur,p,1);
    for(const s of[-1,1]){tri([s*HL,-wolf*HV,ht],[s*HL,wolf*HV,ht],[s*ru,0,e+RH],kleur,p,1);
      if(muur&&wolf<1)veel([[s*hl,-hv,h],[s*hl,hv,h],[s*hl,wolf*hv,h+rh*(1-wolf)],[s*hl,-wolf*hv,h+rh*(1-wolf)]],muur,mp,1)}
    return e+RH};
  /* gebroken kap (mansarde): onder steil, boven flauw */
  const mansarde=(hl,hv,h,rh,ov,kleur,p,muur,mp)=>{const v1=hv*.7,h1=h+rh*.66;
    for(const s of[-1,1]){vlak([-hl-.25,s*(hv+ov),h-.12],[hl+.25,s*(hv+ov),h-.12],[hl+.25,s*v1,h1],[-hl-.25,s*v1,h1],kleur,p,1);vlak([-hl-.25,s*v1,h1],[hl+.25,s*v1,h1],[hl+.25,0,h+rh],[-hl-.25,0,h+rh],kleur,p,1);
      if(muur)veel([[s*hl,-hv,h],[s*hl,hv,h],[s*hl,v1,h1],[s*hl,0,h+rh],[s*hl,-v1,h1]],muur,mp,1)}
    return h+rh};
  /* hoogte van het dakvlak boven punt v (zadeldak) */
  const dakH=(hv,h,rh,v)=>h+rh*(1-Math.abs(v)/hv);
  const schoorsteen=(u,v,hv,h,rh,kleur,p,dik=.32)=>{const top=h+rh+.55;blok(u-dik,u+dik,v-dik,v+dik,dakH(hv,h,rh,v)-.4,top,kleur,p,1);blok(u-dik-.07,u+dik+.07,v-dik-.07,v+dik+.07,top,top+.12,'#6b6259',1,1);blok(u-.12,u+.12,v-.12,v+.12,top+.12,top+.34,'#a9603f',1,1)};
  /* dakkapel op het dakvlak aan kant s (1 of -1): kastje met een raam en een plat dakje */
  const dakkapel=(u,s,hv,h,rh,bw,o)=>{const vf=hv*.66,hb=dakH(hv,h,rh,vf),kh=1.2;if(rh<kh+1.1)return;const vb=Math.max(.15,hv*(1-(hb+kh-h)/rh)),Wd=wand([u,s*vf],[1,0],[0,s]);
    Wd.R(-bw/2,bw/2,hb-.1,hb+kh,0,o.wang||o.kozijn||'#f6f2e8',1,1);raam(Wd,0,hb+.14,bw-.36,kh-.36,{kozijn:o.kozijn,roede:bw>1.7?'kruis':'geen',bank:false});
    for(const z of[-1,1])tri([u+z*bw/2,s*vf,hb-.1],[u+z*bw/2,s*vf,hb+kh],[u+z*bw/2,s*vb,hb+kh],o.wang||'#e8e2d4',1,1);
    vlak([u-bw/2-.15,s*(vf+.18),hb+kh],[u+bw/2+.15,s*(vf+.18),hb+kh],[u+bw/2+.15,s*(vb-.1),hb+kh+.06],[u-bw/2-.15,s*(vb-.1),hb+kh+.06],o.dakje||'#5a5f66',1,1);
    vlak([u-bw/2-.15,s*(vf+.18),hb+kh-.1],[u+bw/2+.15,s*(vf+.18),hb+kh-.1],[u+bw/2+.15,s*(vf+.18),hb+kh],[u-bw/2-.15,s*(vf+.18),hb+kh],o.kozijn||'#f6f2e8',1,1)};
  /* klein werk aan de gevel en op het dak: regenpijp, buitenlamp, klimop, zonnepanelen, dakraam, nokpannen */
  const regenpijp=(Wd,s,h)=>{Wd.D(s-.045,s+.045,0,h,.08,'#8f959b',1,1);Wd.D(s-.07,s+.07,h-.12,h,.1,'#8f959b',1,1)};
  const lamp=(Wd,s,h)=>{Wd.D(s-.03,s+.03,h+.1,h+.16,.2,'#2b2f36',1,1);Wd.D(s-.08,s+.08,h-.12,h+.1,.26,'#fff1c4',1,1);Wd.D(s-.1,s+.1,h+.1,h+.14,.28,'#2b2f36',1,1)};
  const klimop=(Wd,s0,s1,h1)=>{const n=Math.round((s1-s0)*h1*3.2);for(let i=0;i<n;i++){const s=s0+rnd()*(s1-s0),top=h1*(.35+.65*rnd())*(1-.7*Math.abs((s-s0)/(s1-s0)-.5)),b=.22+rnd()*.3,hh=.2+rnd()*.32,h0=rnd()*top;
      Wd.R(s-b/2,s+b/2,h0,Math.min(h1,h0+hh),.03+rnd()*.03,['#4f7f3f','#5f8f4a','#456f38','#6a9a50'][Math.floor(rnd()*4)],1,.8+.2*rnd())}};
  const opDak=(u0,u1,s,va,vb,hv,h,rh,kleur,p)=>vlak([u0,s*va,dakH(hv,h,rh,va)+.05],[u1,s*va,dakH(hv,h,rh,va)+.05],[u1,s*vb,dakH(hv,h,rh,vb)+.05],[u0,s*vb,dakH(hv,h,rh,vb)+.05],kleur,p,1);
  const zonnepanelen=(u0,u1,s,hv,h,rh)=>{const n=Math.max(1,Math.floor((u1-u0)/1.05));for(let i=0;i<n;i++)opDak(u0+i*1.05,u0+i*1.05+1,s,hv*.72,hv*.3,hv,h,rh,'#1c2740',6)};
  const nokpan=(hl,h,rh,kleur)=>blok(-hl,hl,-.1,.1,h+rh-.05,h+rh+.07,kleur,1,1);
  const donker=(kleur,f=.8)=>'#'+K(kleur).clone().multiplyScalar(f).getHexString();
  const kies=(a)=>a[Math.floor(rnd()*a.length)%a.length];
  /* ramen verdelen over een wand: n per laag, op gelijke afstand; geeft de plekken (midden van elk raam langs de wand) */
  const plekken=(len,stap,rand=.9)=>{const n=Math.max(1,Math.floor((len-rand)/stap)),out=[];for(let i=0;i<n;i++)out.push((i+.5)*len/n-len/2);return out};

  /* ---------- Nederlands woonhuis ---------- */
  const NL_MUUR=[['#a5583f',10],['#b0694a',10],['#8d4f3c',10],['#9b5b45',10],['#c2a06a',10],['#efe9dc',3],['#7a473a',10],['#b8573c',10],['#e6dcc6',3],['#a8684f',10],['#d8c9a8',10],['#f4efe4',3]];
  const NL_DAK=[['#c0603c',7],['#4a4d52',7],['#a04a36',7],['#3f444c',9],['#b5553c',7],['#55504c',7]];
  const NL_DEUR=['#2f5d3a','#1f4f8c','#7a2f2f','#2b2f36','#f1ede4','#c9a227','#3f6a7a','#5a2f4a'];
  function nl(o,vw){
    const {w,d}=o,hl=d/2,hv=w/2,[muur,mp]=kies(NL_MUUR),[dk,dp]=o.riet?['#8c7b58',1]:kies(NL_DAK),kz=rnd()<.8?'#f6f2e8':'#e9e0c8',dr=kies(NL_DEUR),luik=rnd()<.28?kies(['#2f5d3a','#7a2f2f','#1f4f8c','#f1ede4']):null;
    const lagen=o.lagen||(w<6.2?1:2),vh=2.75,h=lagen*vh+.15,soort=lagen===1?(rnd()<.5?'zadel':'wolf'):w>8.2?(rnd()<.5?'schild':rnd()<.5?'mansarde':'wolf'):rnd()<.18?'mansarde':rnd()<.2?'schild':rnd()<.3?'wolf':'zadel';
    const rh=Math.min(5.6,hv*(soort==='schild'?.75:soort==='mansarde'?1.05:lagen===1?1.15:.95));
    blok(-hl,hl,-hv,hv,-2.6,h,muur,mp);
    /* plint: een donkere rand onderaan */
    const plint='#'+K(muur).clone().multiplyScalar(.62).getHexString();
    let nok;if(soort==='mansarde')nok=mansarde(hl,hv,h,rh,.3,dk,dp,muur,mp);else nok=dak(hl,hv,h,rh,.38,.3,dk,dp,soort==='schild'?1:soort==='wolf'?.32:0,muur,mp);
    if(soort==='zadel'&&dp!==1)nokpan(hl+.3,h,rh,donker(dk,.82));
    /* dakgoot en windveren in de kleur van het kozijn */
    for(const s of[-1,1]){blok(-hl-.3,hl+.3,s*(hv+.3)-.07,s*(hv+.3)+.07,h-.36,h-.24,kz,1,1);
      if(soort==='zadel')for(const z of[-1,1])vlak([s*(hl+.31),z*(hv+.38),h-.38*rh/hv-.02],[s*(hl+.31),0,h+rh-.02],[s*(hl+.31),0,h+rh-.24],[s*(hl+.31),z*(hv+.38),h-.38*rh/hv-.24],kz,1,1)}
    const WD=[wand([0,hv],[1,0],[0,1],d),wand([0,-hv],[-1,0],[0,-1],d),wand([hl,0],[0,-1],[1,0],w),wand([-hl,0],[0,1],[-1,0],w)];
    for(const Wd of WD)Wd.R(-Wd.len/2,Wd.len/2,0,.45,.02,plint,mp,1);
    const voor=WD[vw],groot=rnd()<.5,ro=kies(['kruis','T','T','geen']);let ds=0;
    for(let wi=0;wi<4;wi++){const Wd=WD[wi],kop=wi>1,isV=wi===vw,pl=plekken(Wd.len,kop?2.9:2.7),di=isV?Math.floor(rnd()*pl.length):-1;
      for(let f=0;f<lagen;f++)for(let i=0;i<pl.length;i++){const s=pl[i],hb=f*vh+.95;
        if(f===0&&i===di){ds=s;deur(Wd,s,1,2.15,{deur:dr,kozijn:kz,boven:rnd()<.5,luifel:rnd()<.4});continue}
        if(!isV&&rnd()<(kop?.3:.14))continue;
        const breed=f===0&&groot&&isV&&Wd.len/pl.length>3?1.9:1.1;raam(Wd,s,hb,breed,1.45,{kozijn:kz,roede:breed>1.5?'T':ro,luik:breed<1.5?luik:null,bak:isV&&f===0&&rnd()<.25});
        /* rollaag: een rij stenen op hun kant boven het raam */
        if(mp===10)Wd.R(s-breed/2-.1,s+breed/2+.1,hb+1.53,hb+1.68,.012,donker(muur,.84),1,1)}
      if(isV&&di>=0)lamp(Wd,pl[di]+(rnd()<.5?-.85:.85),1.95);
      if(!kop)regenpijp(Wd,Wd.len/2-.25,h-.3);
      /* zolderraam in de punt van de kopgevel */
      if(kop&&soort!=='schild'&&rh>2.7)raam(Wd,0,h+(soort==='wolf'?.25:.5),.8,Math.min(1,rh*.3),{kozijn:kz,roede:'geen'})}
    /* dakkapellen op de lange dakvlakken */
    if(soort==='zadel'||soort==='wolf'){const nk=lagen===1?Math.max(1,Math.round(d/4.5)):rnd()<.45?Math.round(d/5.5):0;
      for(const s of[1,-1]){if(s<0&&rnd()<.5)continue;for(let i=0;i<nk;i++)dakkapel((i+.5)*d/nk-hl,s,hv,h,rh,rnd()<.5?1.5:2.2,{kozijn:kz,dakje:dk})}}
    schoorsteen(hl*(rnd()<.5?-.55:.55),soort==='schild'?0:hv*.12,hv,h,rh,muur,mp);if(d>11&&rnd()<.5)schoorsteen(hl*.1,-hv*.1,hv,h,rh,muur,mp);
    /* zonnepanelen of een dakraam op een vrij dakvlak */
    if(soort==='zadel'&&lagen>1){const s=rnd()<.5?1:-1;if(rnd()<.3)zonnepanelen(-hl*.6,hl*.6,s,hv,h,rh);else if(rnd()<.4)opDak(-.45,.45,s,hv*.62,hv*.38,hv,h,rh,'#30455a',6)}
    if(mp===3&&rnd()<.3)klimop(voor,-voor.len/2,-voor.len/2+2.2,h*.8);
    /* erker aan de voorkant: een uitgebouwd raam met een plat dakje */
    if(rnd()<.3&&voor.len>6.5&&lagen>1){const s=voor.len*.25*(rnd()<.5?-1:1);voor.D(s-1.2,s+1.2,0,2.7,.8,muur,mp);voor.D(s-1.35,s+1.35,2.7,2.84,.95,kz,1,1);
      voor.R(s-1.03,s+1.03,.82,2.48,.83,kz,1,1);voor.R(s-.95,s+.95,.9,2.4,.85,'#30455a',6,1);for(const z of[-.32,.32])voor.R(s+z-.028,s+z+.028,.9,2.4,.865,kz,1,1);voor.R(s-.95,s+.95,1.92,1.98,.865,kz,1,1)}
    /* aanbouw: een lage uitbouw of garage aan een kopgevel */
    if(!o.krap&&rnd()<.38&&d<16){const s=rnd()<.5?1:-1,ab=2.8+rnd()*1.6,av=hv*(.55+rnd()*.35),hh=2.6;blok(s>0?hl:-hl-ab,s>0?hl+ab:-hl,-av,av,-2.6,hh,rnd()<.6?muur:'#efe9dc',rnd()<.6?mp:3);
      blok(s>0?hl-.05:-hl-ab-.15,s>0?hl+ab+.15:-hl+.05,-av-.15,av+.15,hh,hh+.14,'#55585e',1,1);
      const G=wand([s*(hl+ab),0],[0,-s],[s,0],av*2);if(rnd()<.5){G.R(-1.2,1.2,0,2.1,.04,kies(['#e9e4d8','#3a3f46','#2f5d3a']),4,1)}else raam(G,0,.95,1.3,1.3,{kozijn:kz,roede:'kruis'})}
    return {nok,voor,ds};
  }

  /* ---------- boerderij: woonhuis voor, stal achter onder één groot dak ---------- */
  function boerderij(o,vw){
    const {w,d}=o,hl=d/2,hv=w/2,muur=kies(['#9a5540','#8d4f3c','#a5583f','#7f4a3a']),riet=rnd()<.45,dk=riet?'#8c7b58':kies(['#4a4d52','#b5553c','#55504c']),dp=riet?1:7,kz='#f6f2e8',groen=kies(['#2f5d3a','#1f4a3a','#3a4f6a']);
    const h=3,rh=Math.min(6.5,hv*1.12),ku=vw===2?1:vw===3?-1:(rnd()<.5?1:-1);     /* ku: aan welke kop het woonhuis zit */
    blok(-hl,hl,-hv,hv,-2.6,h,muur,10);dak(hl,hv,h,rh,.45,.3,dk,dp,.38,muur,10);
    for(const s of[-1,1])blok(-hl-.4,hl+.4,s*(hv+.4)-.07,s*(hv+.4)+.07,h-.5,h-.38,kz,1,1);
    const lang=[wand([0,hv],[1,0],[0,1],d),wand([0,-hv],[-1,0],[0,-1],d)],kopV=wand([ku*hl,0],[0,-ku],[ku,0],w),kopA=wand([-ku*hl,0],[0,ku],[-ku,0],w),wl=Math.min(d*.42,9);
    /* voorhuis: kopgevel met deur en ramen met luiken, zolderraam erboven */
    let ds=0;{const pl=plekken(w,2.5),di=Math.floor(pl.length/2);ds=pl[di];pl.forEach((s,i)=>i===di?deur(kopV,s,1.05,2.2,{deur:groen,kozijn:kz,boven:true}):raam(kopV,s,.9,1.15,1.6,{kozijn:kz,roede:'kruis',luik:groen}));
      plekken(w*.6,2.4).forEach(s=>raam(kopV,s,h+.55,.95,1.25,{kozijn:kz,roede:'kruis'}))}
    for(const Wd of lang){const sg=Wd.T[0]*ku;      /* +1: s loopt naar het woonhuis toe */
      /* woongedeelte: ramen met luiken; stal: lage staldeurtjes en kleine ronde-boog-raampjes, een grote deeldeur */
      for(const s of plekken(wl,2.6))raam(Wd,sg*(d/2-wl/2)+s,.9,1.1,1.5,{kozijn:kz,roede:'kruis',luik:groen});
      const sl=d-wl-1;if(sl>4){const n=Math.max(2,Math.floor(sl/2.4));for(let i=0;i<n;i++){const s=-sg*(d/2-.5-(i+.5)*sl/n);if(i===Math.floor(n/2))Wd.R(s-.55,s+.55,0,2,.04,groen,4,1);else raam(Wd,s,1.5,.7,.6,{kozijn:kz,roede:'geen',bank:false})}}}
    /* achterkop: grote deeldeuren met witte lijsten */
    kopA.R(-1.7,1.7,0,3,.04,groen,4,1);kopA.R(-1.78,1.78,3,3.14,.05,kz,1,1);kopA.R(-.04,.04,0,3,.06,kz,1,1);for(const z of[-1,1]){kopA.R(z*1.7-.05,z*1.7+.05,0,3,.06,kz,1,1);raam(kopA,z*(1.7+Math.min(1.4,(w/2-1.7)/2+.2)),1.4,.7,.6,{kozijn:kz,roede:'geen',bank:false})}
    schoorsteen(ku*(hl-1.6),0,hv,h,rh,muur,10);if(wl>6)schoorsteen(ku*(hl-wl+.6),0,hv,h,rh,muur,10);
    for(const Wd of lang)regenpijp(Wd,Wd.len/2-.3,h-.4);lamp(kopV,ds+.9,2);
    return {nok:h+rh,voor:kopV,ds};
  }

  /* ---------- schuur of loods: planken of damwand, grote deuren, lichtstraat ---------- */
  function schuur(o){
    const {w,d}=o,hl=d/2,hv=w/2,groot=w>13,hout=!groot&&rnd()<.6,muur=hout?kies(['#3f4a44','#4a443e','#6f5a48','#2f3a36','#5a4a3c']):kies(['#71857a','#8a998e','#c9c2b0','#7d8a94','#a39d90','#5f6f66']),
      dk=groot?kies(['#7f8a8f','#8d9499','#6f7479']):kies(['#b5553c','#6f7479','#8b4a3a','#4a4d52']),dp=groot?1:kies([7,7,1]),h=o.h||clamp(w*.32,2.8,5.2),rh=hv*(groot?.34:.6),wit='#ece8dc';
    blok(-hl,hl,-hv,hv,-2.6,h,muur,11);if(!hout&&h>3.4)for(const s of[-1,1])wand([0,s*hv],[1,0],[0,s]).R(-hl,hl,0,1.1,.02,'#8f8a80',1,1);else if(hout)for(const s of[-1,1])wand([0,s*hv],[1,0],[0,s]).R(-hl,hl,0,.6,.02,'#8d4f3c',10,1);
    dak(hl,hv,h,rh,.35,.25,dk,dp,0,muur,11);
    for(const s of[-1,1])for(const z of[-1,1])vlak([s*(hl+.26),z*(hv+.35),h-.35*rh/hv-.02],[s*(hl+.26),0,h+rh-.02],[s*(hl+.26),0,h+rh-.22],[s*(hl+.26),z*(hv+.35),h-.35*rh/hv-.22],wit,1,1);
    /* kopgevels: grote deuren (soms open: donker), met witte lijsten */
    for(const s of[-1,1]){const Wd=wand([s*hl,0],[0,-s],[s,0],w),dw=Math.min(hv*.62,groot?2.6:1.7),dh=Math.min(h-.25,groot?4.2:2.9),open=rnd()<.25,k2=open?'#2a2d2c':hout?kies(['#e8e4d8','#2f5d3a','#6f5a48']):kies(['#e8e4d8','#55606a','#3f5a4a']);
      if(s>0||rnd()<.6){Wd.R(-dw,dw,0,dh,.04,k2,open?1:11,1);if(!open){Wd.R(-.04,.04,0,dh,.06,wit,1,1);Wd.R(-dw,dw,dh,dh+.1,.06,wit,1,1);
        /* kruis op elke deurhelft, zoals op een oude schuurdeur */
        if(hout)for(const z of[-1,1])for(const t of[-1,1])vlak(Wd.q(z*dw*.08,dh*.12+0,.06),Wd.q(z*dw*.08+.001,dh*.12+.1,.06),Wd.q(z*dw*.92,t>0?dh*.9:dh*.12+.1,.06),Wd.q(z*dw*.92,t>0?dh*.9-.1:dh*.12,.06),wit,1,1)}}
      else raam(Wd,0,1.3,1,1,{kozijn:wit,roede:'kruis'})}
    /* lange gevels: een rij kleine ramen hoog in de muur, hier en daar een loopdeur */
    for(const s of[-1,1]){const Wd=wand([0,s*hv],[s,0],[0,s],d),pl=plekken(d,groot?5.5:3.6),di=rnd()<.6?Math.floor(rnd()*pl.length):-1;
      pl.forEach((q,i)=>{if(i===di)Wd.R(q-.5,q+.5,0,2.05,.04,k3,11,1);else raam(Wd,q,h-1.3,groot?1.4:.9,.65,{kozijn:wit,roede:'geen',bank:false})});
      /* lichtstraat in het dak van een grote loods */
      if(groot){const v0=hv*.45,v1=hv*.3;vlak([-hl*.8,s*v0,dakH(hv,h,rh,v0)+.03],[hl*.8,s*v0,dakH(hv,h,rh,v0)+.03],[hl*.8,s*v1,dakH(hv,h,rh,v1)+.03],[-hl*.8,s*v1,dakH(hv,h,rh,v1)+.03],'#cfd8dc',1,1)}}
    return {nok:h+rh};
  }
  const k3='#e8e4d8';

  /* ---------- groot pand in een dorp: winkel of woningen boven elkaar ---------- */
  function pand(o,vw){
    const {w,d}=o,hl=d/2,hv=w/2,[muur,mp]=kies(NL_MUUR),[dk,dp]=kies(NL_DAK),kz='#f6f2e8',lagen=w>12?3:2,vh=2.9,h=lagen*vh+.2,rh=Math.min(4.2,hv*.6),plat=w>14&&rnd()<.5;
    blok(-hl,hl,-hv,hv,-2.6,h,muur,mp);if(plat){blok(-hl-.1,hl+.1,-hv-.1,hv+.1,h,h+.25,'#5a5f66',1,1)}else dak(hl,hv,h,rh,.35,.3,dk,dp,rnd()<.5?1:.3,muur,mp);
    const WD=[wand([0,hv],[1,0],[0,1],d),wand([0,-hv],[-1,0],[0,-1],d),wand([hl,0],[0,-1],[1,0],w),wand([-hl,0],[0,1],[-1,0],w)],winkel=rnd()<.6,zeil=kies(['#2f9c7a','#b3402f','#3d6f9c','#e0b23c','#3a3f46']);
    WD.forEach((Wd,wi)=>{const isV=wi===vw,pl=plekken(Wd.len,3);for(let f=0;f<lagen;f++)pl.forEach((s,i)=>{
        if(isV&&f===0&&winkel){if(i%3===1)deur(Wd,s,1.1,2.2,{deur:'#2b2f36',kozijn:kz,boven:true});else{raam(Wd,s,.5,2.3,2,{kozijn:kz,roede:'geen',bank:false});
          /* zonnescherm boven de etalage */
          vlak(Wd.q(s-1.3,2.75,.05),Wd.q(s+1.3,2.75,.05),Wd.q(s+1.3,2.35,1.1),Wd.q(s-1.3,2.35,1.1),zeil,1,1)}return}
        if(isV&&f===0&&i===Math.floor(pl.length/2)){deur(Wd,s,1.1,2.2,{deur:kies(NL_DEUR),kozijn:kz,boven:true,luifel:true});return}
        raam(Wd,s,f*vh+.95,1.3,1.55,{kozijn:kz,roede:'T'})})});
    if(!plat)schoorsteen(hl*.5,0,hv,h,rh,muur,mp);
    return {nok:h+rh,voor:WD[vw]};
  }

  /* ---------- Provence: gepleisterd huis met luiken, flauw dak van romeinse pannen, de goot naar de straat ---------- */
  const PR_MUUR=['#ecd2a4','#f0c49a','#efe0c0','#e3bd8a','#e8c9a8','#f2dfc2','#e0b08e','#d9c5a0','#f3e6cf','#e6b98f','#d8b48c'];
  const PR_LUIK=['#5b8fb0','#6b8fb8','#9a7ab8','#6f9c62','#8a9aa6','#a8584a','#3f6a5a','#7a8fb0','#b89a5a','#4f6f8f'];
  function provence(o,vw){
    const {w,d}=o,hl=d/2,hv=w/2,steen=rnd()<.16,muur=steen?kies(['#cdbb98','#c4b08a','#d6c6a4']):kies(PR_MUUR),mp=steen?12:3,dk=kies(['#c8643c','#c0603a','#b85a36','#c86a3e','#cf7448']),luik=kies(PR_LUIK),kz='#f6ead2';
    const lagen=o.lagen||(rnd()<.45?3:2),vh=2.85,h=lagen*vh+.25,rh=Math.max(.9,hv*.36);
    blok(-hl,hl,-hv,hv,-2.6,h,muur,mp);
    /* de nok loopt langs de lange zijde; staat het huis met zijn korte kant naar de straat, dan zie je de punt */
    dak(hl,hv,h,rh,.42,.12,dk,8,0,muur,mp);
    /* génoise: twee rijen pannen als lijst onder de goot */
    for(const s of[-1,1])for(const t of[0,1])blok(-hl-.1,hl+.1,s*(hv+.08+t*.1)-.06,s*(hv+.08+t*.1)+.06,h-.34+t*.13,h-.22+t*.13,dk,8,1);
    const WD=[wand([0,hv],[1,0],[0,1],d),wand([0,-hv],[-1,0],[0,-1],d),wand([hl,0],[0,-1],[1,0],w),wand([-hl,0],[0,1],[-1,0],w)],voor=WD[vw],winkel=o.winkel,zeil=kies(['#2f9c7a','#b3402f','#3d6f9c','#e0b23c','#c86a3e','#f1ede4']);
    /* sokkel in een donkerder tint, zoals opspattend regenwater dat achterlaat */
    for(const Wd of WD)Wd.R(-Wd.len/2,Wd.len/2,0,.5,.015,donker(muur,.82),mp,1);
    /* aan de straatkant: een lijst tussen de verdiepingen, een zinken regenpijp, soms klimop */
    if(!steen&&rnd()<.55)for(let f=1;f<lagen;f++)voor.R(-voor.len/2,voor.len/2,f*vh-.07,f*vh+.05,.02,'#f6ead2',1,1);
    regenpijp(voor,(rnd()<.5?-1:1)*(voor.len/2-.18),h-.3);if(rnd()<.2)klimop(voor,-voor.len/2,-voor.len/2+1.8+rnd()*1.5,h*.75);
    let ds=0;WD.forEach((Wd,wi)=>{if(o.blind&&o.blind.includes(wi))return;const isV=wi===vw,pl=plekken(Wd.len,2.45,.7),di=isV?Math.floor(rnd()*pl.length):-1,balk=isV&&lagen>1&&rnd()<.3?Math.floor(rnd()*pl.length):-1;
      for(let f=0;f<lagen;f++)pl.forEach((s,i)=>{const top=f===lagen-1&&lagen>2,hb=f*vh+(top?1.1:.85),wh=top?1.05:1.6;
        if(f===0&&isV&&winkel&&i!==di){raam(Wd,s,.55,1.9,1.95,{kozijn:'#3a3f46',roede:'geen',bank:false});vlak(Wd.q(s-1.1,2.8,.05),Wd.q(s+1.1,2.8,.05),Wd.q(s+1.1,2.4,1.15),Wd.q(s-1.1,2.4,1.15),zeil,1,1);Wd.R(s-1.1,s+1.1,2.86,3.2,.04,donker(zeil,.75),1,1);return}
        if(f===0&&i===di){
          /* voordeur: soms met een ronde boog erboven, altijd een drempel; een potplant ernaast */
          ds=s;deur(Wd,s,1.05,2.2,{deur:luik,kozijn:kz,ruit:rnd()<.4,boven:rnd()<.5});lamp(Wd,s+(rnd()<.5?-.9:.9),2.05);
          if(rnd()<.6){const z=rnd()<.5?-1:1;Wd.D(s+z*.95-.2,s+z*.95+.2,0,.38,.42,'#b8734f',1,1);Wd.D(s+z*.95-.3,s+z*.95+.3,.38,.95,.5,kies(['#3f7a3a','#4a8a3e','#5a8f4a']),1,1)}return}
        if(!isV&&rnd()<.3)return;
        raam(Wd,s,hb,.95,wh,{kozijn:kz,roede:top?'geen':'kruis',luik,bankKl:'#d9cdb4',bak:isV&&f>0&&rnd()<.22});
        /* balkon met een ijzeren hek op de eerste verdieping */
        if(f===1&&i===balk){Wd.D(s-1,s+1,hb-.42,hb-.3,.7,'#cfc3aa',1,1);for(let b=0;b<=8;b++)Wd.R(s-.95+b*.2375-.015,s-.95+b*.2375+.015,hb-.3,hb+.6,.68,'#2b2f36',1,1);Wd.R(s-1,s+1,hb+.58,hb+.64,.69,'#2b2f36',1,1)}})});
    schoorsteen(hl*(rnd()<.5?-.6:.6),hv*.3*(rnd()<.5?-1:1),hv,h,rh,muur,mp,.26);
    /* aanbouw met een lessenaarsdak, of een buitentrap */
    if(!o.rij&&rnd()<.35){const s=rnd()<.5?1:-1,ab=2.6+rnd()*1.8,av=hv*(.6+rnd()*.3),hh=2.7;blok(s>0?hl:-hl-ab,s>0?hl+ab:-hl,-av,av,-2.6,hh,muur,mp);
      vlak([s>0?hl:-hl,-av-.2,hh+.9],[s>0?hl:-hl,av+.2,hh+.9],[s*(hl+ab+.3),av+.2,hh-.05],[s*(hl+ab+.3),-av-.2,hh-.05],dk,8,1);
      raam(wand([s*(hl+ab),0],[0,-s],[s,0],av*2),0,.9,.9,1.2,{kozijn:kz,roede:'kruis',luik})}
    return {nok:h+rh,voor,ds};
  }

  /* ---------- kerk: 'kerknl' = bakstenen kerk met een hoge spits, 'kerkprov' = gepleisterde dorpskerk met een vierkante klokkentoren ---------- */
  const piramide=(u0,u1,v0,v1,h,top,kleur,p)=>{const mu=(u0+u1)/2,mv=(v0+v1)/2,T=[mu,mv,top];tri([u0,v0,h],[u1,v0,h],T,kleur,p,1);tri([u1,v0,h],[u1,v1,h],T,kleur,p,1);tri([u1,v1,h],[u0,v1,h],T,kleur,p,1);tri([u0,v1,h],[u0,v0,h],T,kleur,p,1)};
  function kerk(o,vw){
    const nlk=o.stijl==='kerknl',w=clamp(o.w,8,13),d=clamp(o.d,17,32),hl=d/2,hv=w/2,muur=nlk?kies(['#9b5540','#8d4f3c','#a35a43']):kies(['#e6d3ad','#d9c7a0','#e9dcc0']),mp=nlk?10:(rnd()<.4?12:3),dk=nlk?'#3f444c':kies(['#c0603a','#b85a36']),dp=nlk?9:8,
      h=nlk?w*.9:w*.78,rh=nlk?hv*1.3:hv*.42,licht=nlk?'#e9e2d0':'#f6ead2',glas='#2f3e55',tu=vw===3?-1:1;
    blok(-hl,hl,-hv,hv,-2.6,h,muur,mp);dak(hl,hv,h,rh,.3,.15,dk,dp,0,muur,mp);
    /* lange gevels: hoge smalle ramen (met een spitse boog in Nederland) en steunberen ertussen */
    for(const s of[-1,1]){const Wd=wand([0,s*hv],[s,0],[0,s],d),pl=plekken(d-1,nlk?3.6:4.6);
      pl.forEach(q=>{const b0=h*(nlk?.25:.42),b1=h*(nlk?.74:.8),bw=nlk?.55:.42;Wd.R(q-bw-.1,q+bw+.1,b0-.1,b1,.03,licht,1,1);Wd.R(q-bw,q+bw,b0,b1,.05,glas,6,1);
        if(nlk){tri(Wd.q(q-bw-.1,b1,.03),Wd.q(q+bw+.1,b1,.03),Wd.q(q,b1+bw*1.5+.1,.03),licht,1,1);tri(Wd.q(q-bw,b1,.05),Wd.q(q+bw,b1,.05),Wd.q(q,b1+bw*1.5,.05),glas,6,1);Wd.R(q-.03,q+.03,b0,b1,.065,licht,1,1)}
        else{Wd.D(q-bw-.1,q+bw+.1,b1,b1+.1,.06,licht,1,1)}});
      if(nlk)for(let i=0;i<=pl.length;i++){const q=(i/pl.length-.5)*(d-1);Wd.D(q-.3,q+.3,-.5,h*.86,.55,muur,mp);vlak(Wd.q(q-.3,h*.86,0),Wd.q(q+.3,h*.86,0),Wd.q(q+.3,h*.7,.6),Wd.q(q-.3,h*.7,.6),'#6b6259',1,1)}}
    /* toren: in Nederland midden voor de kopgevel, in de Provence op een hoek; galmgaten boven, wijzerplaat, spits */
    const tw=nlk?w*.52:w*.4,th=nlk?h*2.05:h*1.75,tc=tu*(hl+(nlk?tw/2-.6:-tw/2)),tv=nlk?0:(hv-tw/2)*(rnd()<.5?1:-1);
    blok(tc-tw/2,tc+tw/2,tv-tw/2,tv+tw/2,-2.6,th,muur,mp);
    for(const [O,T,N] of[[[tc,tv+tw/2],[1,0],[0,1]],[[tc,tv-tw/2],[-1,0],[0,-1]],[[tc+tw/2,tv],[0,-1],[1,0]],[[tc-tw/2,tv],[0,1],[-1,0]]]){const Wd=wand(O,T,N,tw),gw=tw*.2;
      Wd.R(-gw-.08,gw+.08,th-(nlk?4.2:3)-.08,th-1,.03,licht,1,1);Wd.R(-gw,gw,th-(nlk?4.2:3),th-1.08,.05,'#23262b',1,1);
      if(nlk){for(let i=1;i<5;i++)Wd.R(-gw,gw,th-4.2+i*.6,th-4.2+i*.6+.1,.07,'#5a5148',1,1);Wd.R(-.75,.75,th-6.4,th-4.9,.04,'#f4f1e6',1,1);Wd.R(-.05,.05,th-5.65,th-5.1,.06,'#23262b',1,1);Wd.R(-.05,.4,th-5.7,th-5.6,.06,'#23262b',1,1)}
      Wd.D(-tw/2-.12,tw/2+.12,th-.25,th,.12,licht,1,1)}
    if(nlk){piramide(tc-tw/2-.15,tc+tw/2+.15,tv-tw/2-.15,tv+tw/2+.15,th,th+tw*3.1,dk,9);blok(tc-.04,tc+.04,tv-.04,tv+.04,th+tw*3.1-.2,th+tw*3.1+1.2,'#c9a227',1,1);blok(tc-.3,tc+.3,tv-.04,tv+.04,th+tw*3.1+.7,th+tw*3.1+.78,'#c9a227',1,1)}
    else{piramide(tc-tw/2-.25,tc+tw/2+.25,tv-tw/2-.25,tv+tw/2+.25,th,th+tw*.42,dk,8);
      /* ijzeren klokkenstoel met een klok, zoals op de torens in de Provence: de mistral waait erdoorheen */
      const y0=th+tw*.42-.3,r=tw*.2;for(const [a,b] of[[-1,-1],[1,-1],[1,1],[-1,1]])blok(tc+a*r-.04,tc+a*r+.04,tv+b*r-.04,tv+b*r+.04,y0,y0+2.3,'#2b2f36',1,1);
      for(const hh of[1.1,2.3]){blok(tc-r,tc+r,tv-r-.03,tv-r+.03,y0+hh-.06,y0+hh,'#2b2f36',1,1);blok(tc-r,tc+r,tv+r-.03,tv+r+.03,y0+hh-.06,y0+hh,'#2b2f36',1,1);blok(tc-r-.03,tc-r+.03,tv-r,tv+r,y0+hh-.06,y0+hh,'#2b2f36',1,1);blok(tc+r-.03,tc+r+.03,tv-r,tv+r,y0+hh-.06,y0+hh,'#2b2f36',1,1)}
      piramide(tc-r,tc+r,tv-r,tv+r,y0+2.3,y0+3.1,'#2b2f36',1);blok(tc-.22,tc+.22,tv-.22,tv+.22,y0+1.3,y0+1.9,'#8a7a4a',1,1)}
    /* ingang in de kopgevel aan de torenkant: dubbele deur met een lichte omlijsting, daarboven een rond venster */
    const Kp=wand([tu*(hl+(nlk?tw-.6:0)),nlk?0:-tv*.35],[0,-tu],[tu,0],w),deurKl=nlk?'#3a5a3a':kies(['#6b4a2e','#5b6f8a','#7a3b30']);
    Kp.R(-1.25,1.25,0,3.3,.03,licht,1,1);Kp.R(-1.05,1.05,0,3.1,.05,deurKl,4,1);Kp.R(-.03,.03,0,3.1,.065,'#2b2f36',1,1);Kp.D(-1.6,1.6,-.3,.16,.9,'#b9b0a2',1,1);
    if(!nlk){Kp.R(-.7,.7,h*.62-.7,h*.62+.7,.03,licht,1,1);Kp.R(-.55,.55,h*.62-.55,h*.62+.55,.05,glas,6,1)}
    /* koor aan de andere kant: een lagere uitbouw */
    {const ku=-tu,kd=nlk?3.2:2.4,kh=h*.78,kv=hv*.72;blok(ku>0?hl:-hl-kd,ku>0?hl+kd:-hl,-kv,kv,-2.6,kh,muur,mp);piramide(ku>0?hl-.2:-hl-kd-.25,ku>0?hl+kd+.25:-hl+.2,-kv-.25,kv+.25,kh,kh+kv*(nlk?1:.5),dk,dp)}
    return {nok:th,voor:Kp,ds:0};
  }

  /* ---------- een gebouw neerzetten ---------- */
  function huis(o){
    ox=o.x;oy=o.y;oz=o.z;ux=Math.cos(o.ang);uz=-Math.sin(o.ang);vx=Math.sin(o.ang);vz=Math.cos(o.ang);
    let s=(o.zaad|0)||1;rnd=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000};for(let i=0;i<4;i++)rnd();
    /* welke wand kijkt naar de weg: 0 = +v, 1 = -v (lange zijden), 2 = +u, 3 = -u (kopgevels) */
    const f=o.voor||[vx,vz],fu=f[0]*ux+f[1]*uz,fv=f[0]*vx+f[1]*vz,vw=o.wand!=null?o.wand:Math.abs(fv)>=Math.abs(fu)*.8?(fv>0?0:1):(fu>0?2:3);
    const st=o.stijl,R=st==='boerderij'?boerderij(o,vw):st==='schuur'?schuur(o):st==='pand'?pand(o,vw):st==='provence'?provence(o,vw):st==='kerknl'||st==='kerkprov'?kerk(o,vw):nl(o,vw);
    /* punt en richting in de wereld, ook nog bruikbaar nadat er een volgend gebouw is gezet */
    {const X=ox,Y=oy,Z=oz,a=ux,b=uz,c2=vx,d2=vz;R.vw=vw;R.punt=(u,v,h)=>[X+a*u+c2*v,Y+h,Z+b*u+d2*v];R.richt=q=>[a*q[0]+c2*q[1],b*q[0]+d2*q[1]]}
    return R;
  }
  function net(){
    if(!pos.length)return null;const g=new TH.BufferGeometry();g.setAttribute('position',new TH.Float32BufferAttribute(pos,3));g.setAttribute('color',new TH.Float32BufferAttribute(col,3));g.setAttribute('pat',new TH.Float32BufferAttribute(pat,1));
    g.computeVertexNormals();const m=new TH.Mesh(g,W.mat.gevel);m.castShadow=!W.lite;m.receiveShadow=true;
    /* leegmaken: een volgende aanroep geeft alleen wat er daarna bij is gekomen */
    pos.length=col.length=pat.length=0;return m;
  }
  /* een pad over de grond langs de punten P ([x, y, z] in de wereld) */
  const strook=(P,breed,kleur)=>{const c=K(kleur);for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,nx=-dz/l*breed/2,nz=dx/l*breed/2,
      q=[[a[0]-nx,a[1],a[2]-nz],[a[0]+nx,a[1],a[2]+nz],[b[0]+nx,b[1],b[2]+nz],[b[0]-nx,b[1],b[2]-nz]];for(const j of[0,1,2,0,2,3]){pos.push(q[j][0],q[j][1],q[j][2]);col.push(c.r,c.g,c.b);pat.push(1)}}};
  return {huis,net,strook,get n(){return pos.length/9}};
}
