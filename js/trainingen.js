'use strict';
/* ================= workouts ================= */
const TYPES={
  herstel:{name:'Herstelrit',hard:false,desc:'Losrijden op lage weerstand. Het doel is doorbloeding, geen trainingsprikkel. Houd het echt rustig.'},
  duur:{name:'Duurrit',hard:false,desc:'Rustig aeroob tempo waarbij je nog kunt praten. Dit bouwt de basis waar al het zwaardere werk op rust.'},
  souplesse:{name:'Souplesse',hard:false,desc:'Rustige rit met korte blokken op hoge cadans. Je benen leren sneller en soepeler ronddraaien, zodat je op hetzelfde vermogen minder kracht per trap zet.'},
  tempo:{name:'Tempoblokken',hard:true,desc:'Lange blokken net onder het punt waar het zwaar wordt. Goed voor uithoudingsvermogen en langer hard kunnen rijden.'},
  sweetspot:{name:'Sweet spot',hard:true,desc:'Blokken op 88 tot 92% van je FTP: veel trainingseffect voor relatief weinig vermoeidheid. De efficiëntste manier om je FTP te verhogen.'},
  drempel:{name:'Drempelblokken',hard:true,desc:'Blokken rond je FTP. Zwaar maar beheersbaar: je traint het vermogen dat je een uur kunt volhouden.'},
  vo2:{name:'VO2max-intervallen',hard:true,desc:'Korte, harde intervallen ruim boven je FTP met evenveel rust. Vergroot je maximale zuurstofopname.'},
  heuvels:{name:'Korte klimmen',hard:true,desc:'Herhaalde korte, steile klimmen van ongeveer twee minuten ruim boven je FTP, met rustig herstel ertussen. Zo train je het aanzetten op hellingen zoals in een heuveltocht.'},
  anaeroob:{name:'30/30-intervallen',hard:true,desc:'Dertig seconden hard, dertig seconden rustig. Traint herhaald versnellen en snel herstellen.'},
  klim:{name:'Klimkracht',hard:true,desc:'Blokken op lage cadans, zoals op een lange klim. Blijf zitten en houd je bovenlichaam stil.'},
  kracht:{name:'Krachtblokken',hard:true,desc:'Blokken op tempo met een zware versnelling en lage cadans van 50 tot 60 rpm. Blijf zitten, houd je bovenlichaam stil en duw de trappers rond. Bouwt kracht voor lange klimmen.'},
  sprint:{name:'Sprints',hard:true,desc:'Duurrit met korte sprints van 15 seconden. Traint explosiviteit zonder veel vermoeidheid.'},
  duurklim:{name:'Duurrit met klimblokken',hard:false,desc:'Lange duurrit met blokken op tempo en lage cadans, zoals op een klim midden in een lange tocht. Rustig tussen de blokken.'},
  duurtempo:{name:'Duurrit met tempofinale',hard:false,desc:'Lange duurrit die eindigt met een blok op tempo. Je leert doortrappen als de benen al moe zijn.'},
  duurheuvels:{name:'Duurrit met korte klimmen',hard:false,desc:'Lange duurrit met elk kwartier een korte, stevige klim. Je leert hellingen aanzetten als de benen al moe zijn, zoals laat in een heuveltocht.'},
  openers:{name:'Activatie',hard:false,desc:'Korte prikkels om de benen wakker te houden zonder vermoeidheid op te bouwen. Past in een herstelweek of de dag voor een zware rit.'},
  ramptest:{name:'FTP-test (ramptest)',hard:true,desc:'Elke minuut gaat het vermogen omhoog tot je niet meer kunt. Stop zodra je de cadans niet meer vasthoudt; je FTP wordt berekend uit je beste minuut.'}
};
/* nieuwe set (oktober 2026): meer afwisseling binnen elke soort prikkel; min = vanaf welk niveau de coach hem inplant */
Object.assign(TYPES,{
  overunder:{name:'Over-unders',hard:true,min:1,desc:'Blokken die wisselen tussen net onder en net boven je FTP: twee minuten onder, één minuut over. Je leert verzuring kwijtraken terwijl je doorrijdt, zoals wanneer het tempo in een groep even omhoog gaat.'},
  drempelramp:{name:'Oplopende drempelblokken',hard:true,min:1,desc:'Elk blok begint iets onder je FTP en eindigt er net boven. Rustig beginnen en sterk eindigen, zoals een klim die steeds steiler wordt.'},
  ssaanzet:{name:'Sweet spot met aanzetten',hard:true,desc:'Sweet-spotblokken met elke vier minuten een korte versnelling. Na elke versnelling direct terug naar je tempo, zoals bij het begin van een helling of na een bocht.'},
  oplopend:{name:'Oplopend tempo',hard:true,desc:'Vier trappen van rustig duurtempo naar net onder je FTP, zonder rust ertussen. Een rustige manier om lang werk op tempo en sweet spot te doen.'},
  tempocad:{name:'Tempo op hoge cadans',hard:true,desc:'Tempoblokken op 95 tot 105 rpm. Je spieren worden minder zwaar belast per omwenteling, zodat je lang kunt doorrijden zonder dat je benen verzuren. Goed voor vlakke tochten.'},
  i3015:{name:'30/15-intervallen',hard:true,min:1,desc:'Series van dertig seconden hard en vijftien seconden rustig. Door de korte rust blijft je hartslag hoog: veel tijd dicht bij je maximale zuurstofopname, zonder lange blokken.'},
  i4020:{name:'40/20-intervallen',hard:true,min:1,desc:'Series van veertig seconden hard en twintig seconden rustig. Zwaarder dan 30/30 omdat de rust korter is. Traint herhaald aanzetten met weinig herstel.'},
  piramide:{name:'Piramide',hard:true,min:1,desc:'Intervallen die eerst langer en daarna weer korter worden, met evenveel rust. Hoe korter het interval, hoe harder.'},
  microbursts:{name:'Microbursts',hard:true,min:1,desc:'Steeds vijftien seconden hard en vijftien seconden rustig, tien minuten achter elkaar. Traint snelle versnellingen en herstel binnen een paar seconden.'},
  groepsrit:{name:'Groepsrit',hard:true,min:1,desc:'Tempo zoals in een snelle groep, met elke drie minuten een korte versnelling om een gat dicht te rijden.'},
  fartlek:{name:'Fartlek',hard:true,desc:'Een speelse mix van korte en langere inspanningen op verschillende zwaartes, steeds met rust ertussen. Afwisselend en goed voor je algemene conditie.'},
  colsim:{name:'Lange col',hard:true,desc:'Eén lang blok net onder je drempel op lage cadans, met een zwaardere laatste kilometer. Bootst een lange col na: gelijkmatig rijden en niet te hard beginnen.'},
  staand:{name:'Staand klimmen',hard:true,desc:'Klimblokken waarin je elke minuut wisselt tussen zitten en staan. Zo leer je op een steile klim afwisselen zonder je ritme te verliezen.'},
  topsprint:{name:'Klimmen met sprint',hard:true,desc:'Korte klimmen net onder je FTP met een sprint van twintig seconden over de top. Zo rijd je weg na een helling, zoals in een heuveltocht.'},
  muurtjes:{name:'Muurtjes',hard:true,desc:'Korte, steile inspanningen van 45 tot 60 seconden op lage cadans met tempo ertussen, zonder echte rust. Zoals de Vlaamse en Limburgse hellingen die snel na elkaar komen.'},
  kasseien:{name:'Kasseien',hard:true,desc:'Blokken van twee à drie minuten rond je FTP op lage cadans, met tempo ertussen. Bootst kasseistroken na waarop je kracht moet blijven zetten.'},
  krachtsprint:{name:'Krachtsprints',hard:true,min:1,desc:'Sprints van tien seconden vanaf een lage cadans in een zware versnelling, met ruime rust. Bouwt kracht en explosiviteit zonder veel vermoeidheid.'},
  duurkracht:{name:'Duurrit met lage cadans',hard:false,desc:'Rustige duurrit met blokken op 55 tot 65 rpm. Licht genoeg om ervan te herstellen, maar je spieren wennen aan veel kracht per trap, zoals op een lange klim.'},
  cadansladder:{name:'Cadansladder',hard:false,desc:'Rustige rit met ladders van 80 naar 120 rpm, één minuut per trede. Je trapbeweging wordt soepeler en ronder.'}
});
/* ramptest als laatste in de bibliotheek */
{const t=TYPES.ramptest;delete TYPES.ramptest;TYPES.ramptest=t}
/* soort per training, voor de filter in de bibliotheek */
const CATS=[['','Alle'],['rustig','Rustig en lang'],['drempel','Tempo en drempel'],['vo2','Kort en hard'],['klim','Klimmen'],['kracht','Kracht en sprint'],['techniek','Cadans'],['test','Test']];
const CAT_OF={herstel:'rustig',duur:'rustig',openers:'rustig',duurklim:'rustig',duurtempo:'rustig',duurheuvels:'rustig',duurkracht:'rustig',
  souplesse:'techniek',cadansladder:'techniek',tempocad:'techniek',
  tempo:'drempel',sweetspot:'drempel',drempel:'drempel',overunder:'drempel',drempelramp:'drempel',ssaanzet:'drempel',oplopend:'drempel',
  vo2:'vo2',anaeroob:'vo2',i3015:'vo2',i4020:'vo2',piramide:'vo2',microbursts:'vo2',groepsrit:'vo2',fartlek:'vo2',
  klim:'klim',heuvels:'klim',colsim:'klim',staand:'klim',topsprint:'klim',muurtjes:'klim',
  kracht:'kracht',sprint:'kracht',kasseien:'kracht',krachtsprint:'kracht',ramptest:'test'};
const S=(d,a,b,label,kind,cad)=>({d:Math.max(1,Math.round(d)),a,b:b==null?a:b,label,kind,cad:cad||0});
const pick=(arr,L)=>arr[clamp(L,0,2)];
/* Opbouw per soort training: elke trede iets meer of langer werk. [herhalingen, minuten aan, minuten rust, deel van FTP, cadans] */
const LADDER={
  sweetspot:{label:'Sweet spot',steps:[[3,8,4,.88],[3,10,4,.88],[3,12,4,.89],[2,18,5,.89],[3,15,4,.9],[2,20,5,.9],[3,18,4,.9],[2,25,5,.91],[3,20,5,.91],[2,30,5,.92]]},
  drempel:{label:'Drempel',steps:[[3,6,4,.95],[4,6,3,.96],[3,8,4,.96],[4,8,4,.97],[3,10,5,.98],[4,10,5,.98],[3,12,5,.99],[2,15,5,1],[3,15,5,1],[2,20,5,1]]},
  tempo:{label:'Tempo',steps:[[2,15,5,.78],[3,15,5,.8],[2,20,5,.8],[3,20,5,.82],[2,30,5,.82],[3,25,5,.83],[2,40,5,.84],[3,30,5,.85]]},
  vo2:{label:'VO2max',steps:[[5,2,2,1.15],[4,3,3,1.12],[6,2,2,1.17],[5,3,3,1.13],[6,3,3,1.14],[4,4,4,1.12],[5,4,4,1.13],[6,4,3,1.13],[5,5,4,1.12],[6,5,4,1.12]],pOff:.5},
  heuvels:{label:'Klim',steps:[[5,1.5,3,1.15],[6,1.5,3,1.17],[6,2,3,1.15],[8,2,3,1.15],[8,2,2.5,1.18],[10,2,2.5,1.18],[8,3,3,1.12],[10,3,3,1.12]],pOff:.5},
  klim:{label:'Klim',steps:[[3,8,4,.85,65],[3,10,4,.86,65],[4,10,4,.87,65],[3,12,4,.88,62],[4,12,4,.89,62],[3,15,5,.9,60],[4,15,5,.9,60],[3,20,5,.9,60]]},
  kracht:{label:'Kracht',steps:[[4,5,3,.8,55],[5,5,3,.82,55],[4,8,4,.82,55],[5,8,4,.84,55],[4,10,4,.85,52],[5,10,4,.86,52],[4,12,4,.88,50],[3,15,5,.88,50]]},
  souplesse:{label:'Souplesse',steps:[[6,1,2,.65,105],[8,1,2,.65,110],[6,2,2,.66,110],[8,2,2,.67,110],[6,3,3,.68,115],[8,3,2,.68,115]],pOff:.6},
  anaeroob:{steps:[[1,8],[1,10],[2,8],[2,10],[3,8],[2,12],[3,10],[3,12]]},
  sprint:{steps:[[4],[5],[6],[7],[8],[9],[10]]}
};
/* nieuwe soorten: elke trede is een lijst getallen; work = minuten werk inclusief rust, make = de blokken */
const RP=(n,f)=>{const o=[];for(let k=0;k<n;k++)o.push(...f(k));return o};
const restB=(i,n,sec,lab)=>i<n-1?[S(sec,.55,null,lab||'Herstel','rest')]:[];
const pyrP=m=>m<=1?1.2:m<=2?1.15:m<=3?1.12:m<=4?1.1:1.08;
Object.assign(LADDER,{
  overunder:{label:'Over-under',steps:[[2,2,1.05],[3,2,1.05],[2,3,1.05],[3,3,1.05],[2,4,1.06],[3,4,1.06],[2,5,1.08],[3,5,1.08]],
    work:s=>s[0]*s[1]*3+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]*3}`,
    make:([n,k,o])=>RP(n,i=>[...RP(k,()=>[S(120,.95,null,`Blok ${i+1}: onder`,'work'),S(60,o,null,`Blok ${i+1}: over`,'work')]),...restB(i,n,240)])},
  drempelramp:{label:'Drempel',steps:[[3,8],[3,10],[4,10],[3,12],[4,12],[3,15],[4,15]],
    work:s=>s[0]*s[1]+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,.92,1.04,`Blok ${i+1} van ${n}`,'work'),...restB(i,n,300)])},
  ssaanzet:{label:'Sweet spot',steps:[[2,8],[3,8],[2,12],[3,12],[2,16],[3,16],[2,20],[3,20]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(Math.round(m/4),()=>[S(15,1.3,null,'Aanzetten','work'),S(225,.9,null,`Sweet spot ${i+1} van ${n}`,'work')]),...restB(i,n,240)])},
  oplopend:{label:'Tempo',steps:[[5],[6],[8],[10],[12],[15]],
    work:s=>s[0]*4,tag:s=>`4×${s[0]}`,
    make:([m])=>[.7,.8,.88,.95].map((p,i)=>S(m*60,p,null,`Trap ${i+1} van 4`,i?'work':'steady'))},
  tempocad:{label:'Tempo',steps:[[2,10],[3,10],[2,15],[3,15],[2,20],[3,20],[2,30]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,.8,null,`Tempo ${i+1} van ${n}`,'work',100),...restB(i,n,240)])},
  i3015:{label:'VO2max',steps:[[2,9],[3,9],[3,11],[3,13],[4,11],[4,13]],
    work:s=>s[0]*s[1]*.75+(s[0]-1)*3,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,N])=>RP(n,i=>[...RP(N,j=>[S(30,1.25,null,`Hard ${j+1} van ${N}`,'work'),S(15,.5,null,'Rustig','rest')]),...restB(i,n,180,'Serierust')])},
  i4020:{label:'VO2max',steps:[[2,6],[2,8],[3,6],[3,8],[2,12],[3,10],[3,12]],
    work:s=>s[0]*s[1]+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,N])=>RP(n,i=>[...RP(N,j=>[S(40,1.2,null,`Hard ${j+1} van ${N}`,'work'),S(20,.5,null,'Rustig','rest')]),...restB(i,n,300,'Serierust')])},
  piramide:{label:'VO2max',steps:[[1,2,3,2,1],[1,2,3,4,3,2,1],[2,3,4,3,2],[1,2,3,4,5,4,3,2,1],[2,3,4,5,4,3,2]],
    work:s=>s.reduce((a,m)=>a+2*m,0)-s[s.length-1],tag:s=>s.join('-'),shrink:s=>s.length>3?s.slice(1,-1):s,
    make:s=>RP(s.length,i=>[S(s[i]*60,pyrP(s[i]),null,`${s[i]} min (${i+1} van ${s.length})`,'work'),...(i<s.length-1?[S(s[i]*60,.55,null,'Herstel','rest')]:[])])},
  microbursts:{label:'Microbursts',steps:[[2,6],[2,8],[2,10],[3,8],[3,10]],
    work:s=>s[0]*s[1]+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(m*2,j=>[S(15,1.4,null,`Burst ${j+1} van ${m*2}`,'work'),S(15,.5,null,'Rustig','rest')]),...restB(i,n,300,'Serierust')])},
  groepsrit:{label:'Groepsrit',steps:[[2,12],[2,15],[3,12],[2,21],[3,15],[3,21]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(Math.round(m/3),()=>[S(20,1.45,null,'Gat dichtrijden','work'),S(160,.8,null,`Groep ${i+1} van ${n}`,'work')]),...restB(i,n,240)])},
  colsim:{label:'Klim',steps:[[20,.84],[25,.85],[30,.86],[35,.86],[40,.87],[45,.87],[50,.88],[60,.88]],
    work:s=>s[0],tag:s=>`${s[0]} min`,shrink:s=>[s[0]-5,s[1]],
    make:([m,p])=>[S((m-3)*60,p-.02,p+.01,'Klim','work',70),S(180,.95,null,'Laatste kilometer','work',65)]},
  staand:{label:'Klim',steps:[[3,6],[3,8],[4,8],[3,10],[4,10],[3,14]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(m,j=>[S(60,j%2?.95:.9,null,j%2?`Staand (klim ${i+1})`:`Zittend (klim ${i+1})`,'work',j%2?60:70)]),...restB(i,n,240)])},
  topsprint:{label:'Klim',steps:[[3,3],[4,3],[4,4],[5,4],[6,4],[6,5]],
    work:s=>s[0]*(s[1]+1/3)+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,.98,null,`Klim ${i+1} van ${n}`,'work'),S(20,1.5,null,'Sprint over de top','work'),...restB(i,n,240)])},
  muurtjes:{label:'Muurtjes',steps:[[5,45],[6,45],[6,60],[8,45],[8,60],[10,60],[12,60]],
    work:s=>s[0]*s[1]/60+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]} s`,
    make:([n,sec])=>RP(n,i=>[S(sec,1.35,null,`Muur ${i+1} van ${n}`,'work',65),...(i<n-1?[S(240,.75,null,'Tussenstuk op tempo','steady')]:[])])},
  kasseien:{label:'Kasseien',steps:[[4,2],[5,2],[4,3],[6,2],[5,3],[6,3],[8,3]],
    work:s=>s[0]*s[1]+(s[0]-1)*3,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,1,null,`Kasseistrook ${i+1} van ${n}`,'work',75),...(i<n-1?[S(180,.7,null,'Asfalt','steady')]:[])])},
  krachtsprint:{label:'Kracht',steps:[[5],[6],[7],[8],[9],[10]],
    work:s=>s[0]*3,tag:s=>`${s[0]}×10 s`,
    make:([n])=>RP(n,i=>[S(10,1.9,null,`Krachtsprint ${i+1} van ${n}`,'work',50),S(170,.55,null,'Herstel','rest')])}
});
const ladderWork=(type,st)=>LADDER[type].work?LADDER[type].work(st):type==='anaeroob'?st[0]*st[1]+(st[0]-1)*5:type==='sprint'?st[0]*5:st[0]*st[1]+(st[0]-1)*st[2];
/* minuten die een trede nodig heeft, inclusief warming-up en cooling-down */
const ladderNeed=(type,lvl)=>{const st=LADDER[type].steps;return ladderWork(type,st[clamp(Math.round(lvl),1,st.length)-1])+15};
function ladderBuild(type,T,lvl){
  const Ld=LADDER[type],steps=Ld.steps;
  const wu=T>=60?10:T>=40?8:5,cd=T>=60?5:T>=40?4:3,room=T-wu-cd;
  let i=clamp(Math.round(lvl),1,steps.length)-1;
  while(i>0&&ladderWork(type,steps[i])>room)i--;
  const segs=[S(wu*60,.45,.75,'Warming-up','warmup')];let tag,used;
  if(Ld.make){
    let st=steps[i];
    for(let k=0;k<12&&ladderWork(type,st)>room;k++){const nx=Ld.shrink?Ld.shrink(st):st[0]>1?[st[0]-1,...st.slice(1)]:st;if(JSON.stringify(nx)===JSON.stringify(st)||ladderWork(type,nx)<=0)break;st=nx}
    segs.push(...Ld.make(st));used=ladderWork(type,st);tag=Ld.tag(st);
  }else if(type==='anaeroob'){
    let [sets,N]=steps[i];while(sets>1&&ladderWork(type,[sets,N])>room)sets--;while(N>4&&ladderWork(type,[sets,N])>room)N--;
    for(let s=0;s<sets;s++){
      for(let k=0;k<N;k++){segs.push(S(30,1.3,null,`Hard ${k+1} van ${N}`,'work'));segs.push(S(30,.5,null,'Rustig','rest'))}
      if(s<sets-1)segs.push(S(300,.55,null,'Serierust','rest'));
    }
    used=ladderWork(type,[sets,N]);tag=`${sets}×${N}`;
  }else if(type==='sprint'){
    let n=steps[i][0];while(n>1&&n*5>room)n--;
    for(let k=0;k<n;k++){segs.push(S(285,.65,null,'Duurtempo','steady'));segs.push(S(15,1.7,null,`Sprint ${k+1} van ${n}`,'work'))}
    used=n*5;tag=`${n}×15 s`;
  }else{
    let [reps,on,off,p,cad]=steps[i];while(reps>1&&ladderWork(type,[reps,on,off])>room)reps--;
    for(let k=0;k<reps;k++){
      segs.push(S(on*60,p,p,`${Ld.label} ${k+1} van ${reps}`,'work',cad));
      if(k<reps-1)segs.push(S(off*60,Ld.pOff||.55,null,'Herstel','rest'));
    }
    used=ladderWork(type,[reps,on,off]);tag=`${reps}×${nl(on)}`;
  }
  const left=room-used;
  if(left>=1)segs.push(S(left*60,.62,.62,'Rustig doorrijden','steady'));
  segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  return {segs,tag,lvl:i+1};
}
/* opt.b = blokduur in minuten, afgestemd op de klimmen van je evenement (lange rit met klimblokken of korte klimmen) */
function buildWorkout(type,T,L,lvl,opt){
  if(!TYPES[type])type='duur';
  T=clamp(Math.round(T),20,330);L=clamp(L|0,0,2);
  if((type==='duurklim'||type==='duurtempo'||type==='duurheuvels'||type==='duurkracht')&&T<45)type='duur';
  const ob=opt&&opt.b>0?opt.b:0;
  const wu=T>=60?10:T>=40?8:5, cd=T>=60?5:T>=40?4:3;
  let segs=[],tag='';
  if(LADDER[type]){
    const n=LADDER[type].steps.length;
    ({segs,tag,lvl}=ladderBuild(type,T,lvl==null?Math.round(n*[.3,.5,.7][L]):lvl));
  }else if(type==='herstel'){
    segs=[S(180,.4,.52,'Inrijden','warmup'),S((T-5)*60,.52,.52,'Losrijden','steady'),S(120,.52,.4,'Uitrijden','cooldown')];
  }else if(type==='duur'){
    const hi=pick([.68,.70,.72],L),lo=.64;
    segs.push(S(300,.45,.65,'Warming-up','warmup'));
    let left=T-5-cd,i=0;
    while(left>0){let d=Math.min(10,left);if(left-d<5)d=left;segs.push(S(d*60,i%2?hi:lo,null,'Duurtempo','steady'));left-=d;i++}
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='duurklim'){
    /* blokken zo lang als de klimmen van je evenement (10 tot 40 min), anders 10 min */
    const room=T-10-5,B=Math.min(ob?clamp(Math.round(ob/5)*5,10,40):10,Math.max(5,Math.floor((room-10)/5)*5)),n=clamp(Math.floor(room/(B+10)),1,B>=25?Math.max(1,L+1):L+2);
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(S(600,.66,null,'Duurtempo','steady'));segs.push(S(B*60,pick([.78,.80,.83],L)-(B>=25?.03:B>=15?.015:0),null,`Klimblok ${i+1} van ${n}`,'work',70))}
    const left=room-n*(B+10);tag=`${n}×${B}`;
    if(left>=1)segs.push(S(left*60,.64,null,'Duurtempo','steady'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='duurtempo'){
    const room=T-5-5,fin=Math.min(pick([15,20,25],L),Math.max(5,Math.floor(room/3)));
    segs.push(S(300,.45,.65,'Warming-up','warmup'));
    let left=room-fin,i=0;
    while(left>0){let d=Math.min(15,left);if(left-d<5)d=left;segs.push(S(d*60,i%2?.70:.65,null,'Duurtempo','steady'));left-=d;i++}
    segs.push(S(fin*60,pick([.78,.80,.82],L),null,'Tempofinale','work'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${fin} min`;
  }else if(type==='duurheuvels'){
    /* klimmetjes zo lang als de hellingen van je evenement (1 tot 5 min); hoe korter, hoe harder */
    const K=ob?clamp(Math.round(ob*2)*30,60,300):120,f=K<=60?.08:K<=90?.04:K>=240?-.06:K>=180?-.03:0;
    const room=T-10-5,n=clamp(Math.floor(room/15),1,pick([6,8,10],L));
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(S(900-K,.66,null,'Duurtempo','steady'));segs.push(S(K,pick([1.05,1.1,1.15],L)+f,null,`Klim ${i+1} van ${n}`,'work',K<=90?70:0))}
    const left=room-n*15;
    if(left>=1)segs.push(S(left*60,.64,null,'Duurtempo','steady'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${n}×${K%60?nl(K/60):K/60}`;
  }else if(type==='duurkracht'){
    const room=T-10-5,n=clamp(Math.floor(room/15),1,pick([3,4,5],L));
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(S(420,.65,null,'Duurtempo','steady'));segs.push(S(480,.7,null,`Lage cadans ${i+1} van ${n}`,'steady',60))}
    const left=room-n*15;
    if(left>=1)segs.push(S(left*60,.64,null,'Duurtempo','steady'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${n}×8`;
  }else if(type==='cadansladder'){
    let room=T-wu-cd,k=0;
    segs.push(S(wu*60,.45,.65,'Warming-up','warmup'));
    while(room>=8&&k<pick([3,4,5],L)){k++;
      for(const c of [80,90,100,110,120])segs.push(S(60,.62,null,`${c} rpm (ladder ${k})`,'steady',c));
      segs.push(S(180,.6,null,'Eigen cadans','steady'));room-=8}
    if(room>=1)segs.push(S(room*60,.62,null,'Rustig doorrijden','steady'));
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='fartlek'){
    const P=[[60,1.1],[120,.6],[180,.95],[120,.6],[30,1.3],[90,.6],[120,1.05],[120,.6],[300,.88],[120,.6],[20,1.5],[100,.6]],m=pick([.97,1,1.03],L);
    let room=(T-wu-cd)*60,i=0;
    segs.push(S(wu*60,.45,.75,'Warming-up','warmup'));
    while(room>=60){const [d,p]=P[i%P.length],dd=Math.min(d,room),hard=p>.7;
      segs.push(S(dd,hard?Math.round(p*m*100)/100:p,null,hard?`Inspanning ${Math.floor(i/2)+1}`:'Rustig',hard?'work':'rest'));room-=dd;i++}
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='openers'){
    let room=T-wu-cd;
    segs.push(S(wu*60,.45,.7,'Warming-up','warmup'));
    for(let i=0;i<3&&room>=3;i++){segs.push(S(60,1.05,null,`Prikkel ${i+1} van 3`,'work'));segs.push(S(120,.55,null,'Herstel','rest'));room-=3}
    for(let i=0;i<2&&room>=3;i++){segs.push(S(15,1.5,null,`Versnelling ${i+1} van 2`,'work'));segs.push(S(165,.55,null,'Herstel','rest'));room-=3}
    if(room>=1)segs.push(S(room*60,.6,null,'Rustig doorrijden','steady'));
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='ramptest'){
    segs.push(S(300,.45,.5,'Warming-up','warmup'));
    for(let i=0;i<21;i++)segs.push(S(60,.5+.06*i,null,`Stap ${i+1}`,'work'));
    segs.push(S(300,.5,.4,'Cooling-down','cooldown'));
  }
  const sec=segs.reduce((x,s)=>x+s.d,0);
  let p4=0;for(const s of segs){const m=(s.a+s.b)/2;p4+=s.d*m**4}
  const IF=(p4/sec)**.25;
  return {id:`${type}-${T}-${L}-${lvl||0}${ob?'-b'+ob:''}`,b:ob||undefined,type,L,lvl:LADDER[type]?lvl:null,lvlMax:LADDER[type]?LADDER[type].steps.length:null,name:TYPES[type].name+(tag?' '+tag:''),desc:TYPES[type].desc,segs,sec,minutes:Math.round(sec/60),IF,tss:Math.round(sec/3600*IF*IF*100)};
}
