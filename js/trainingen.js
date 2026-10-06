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
const ladderWork=(type,st)=>type==='anaeroob'?st[0]*st[1]+(st[0]-1)*5:type==='sprint'?st[0]*5:st[0]*st[1]+(st[0]-1)*st[2];
/* minuten die een trede nodig heeft, inclusief warming-up en cooling-down */
const ladderNeed=(type,lvl)=>{const st=LADDER[type].steps;return ladderWork(type,st[clamp(Math.round(lvl),1,st.length)-1])+15};
function ladderBuild(type,T,lvl){
  const Ld=LADDER[type],steps=Ld.steps;
  const wu=T>=60?10:T>=40?8:5,cd=T>=60?5:T>=40?4:3,room=T-wu-cd;
  let i=clamp(Math.round(lvl),1,steps.length)-1;
  while(i>0&&ladderWork(type,steps[i])>room)i--;
  const segs=[S(wu*60,.45,.75,'Warming-up','warmup')];let tag,used;
  if(type==='anaeroob'){
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
function buildWorkout(type,T,L,lvl){
  if(!TYPES[type])type='duur';
  T=clamp(Math.round(T),20,300);L=clamp(L|0,0,2);
  if((type==='duurklim'||type==='duurtempo'||type==='duurheuvels')&&T<45)type='duur';
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
    const room=T-10-5,n=clamp(Math.floor(room/20),1,L+2);
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(S(600,.66,null,'Duurtempo','steady'));segs.push(S(600,pick([.78,.80,.83],L),null,`Klimblok ${i+1} van ${n}`,'work',70))}
    const left=room-n*20;
    if(left>=1)segs.push(S(left*60,.64,null,'Duurtempo','steady'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${n}×10`;
  }else if(type==='duurtempo'){
    const room=T-5-5,fin=Math.min(pick([15,20,25],L),Math.max(5,Math.floor(room/3)));
    segs.push(S(300,.45,.65,'Warming-up','warmup'));
    let left=room-fin,i=0;
    while(left>0){let d=Math.min(15,left);if(left-d<5)d=left;segs.push(S(d*60,i%2?.70:.65,null,'Duurtempo','steady'));left-=d;i++}
    segs.push(S(fin*60,pick([.78,.80,.82],L),null,'Tempofinale','work'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${fin} min`;
  }else if(type==='duurheuvels'){
    const room=T-10-5,n=clamp(Math.floor(room/15),1,pick([6,8,10],L));
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(S(780,.66,null,'Duurtempo','steady'));segs.push(S(120,pick([1.05,1.1,1.15],L),null,`Klim ${i+1} van ${n}`,'work'))}
    const left=room-n*15;
    if(left>=1)segs.push(S(left*60,.64,null,'Duurtempo','steady'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${n}×2`;
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
  return {id:`${type}-${T}-${L}-${lvl||0}`,type,L,lvl:LADDER[type]?lvl:null,lvlMax:LADDER[type]?LADDER[type].steps.length:null,name:TYPES[type].name+(tag?' '+tag:''),desc:TYPES[type].desc,segs,sec,minutes:Math.round(sec/60),IF,tss:Math.round(sec/3600*IF*IF*100)};
}
