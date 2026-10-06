'use strict';
/* ================= workouts ================= */
const TYPES={
  herstel:{name:'Herstelrit',hard:false,desc:'Losrijden op lage weerstand. Het doel is doorbloeding, geen trainingsprikkel. Houd het echt rustig.'},
  duur:{name:'Duurrit',hard:false,desc:'Rustig aeroob tempo waarbij je nog kunt praten. Dit bouwt de basis waar al het zwaardere werk op rust.'},
  tempo:{name:'Tempoblokken',hard:true,desc:'Lange blokken net onder het punt waar het zwaar wordt. Goed voor uithoudingsvermogen en langer hard kunnen rijden.'},
  sweetspot:{name:'Sweet spot',hard:true,desc:'Blokken op 88 tot 92% van je FTP: veel trainingseffect voor relatief weinig vermoeidheid. De efficiëntste manier om je FTP te verhogen.'},
  drempel:{name:'Drempelblokken',hard:true,desc:'Blokken rond je FTP. Zwaar maar beheersbaar: je traint het vermogen dat je een uur kunt volhouden.'},
  vo2:{name:'VO2max-intervallen',hard:true,desc:'Korte, harde intervallen ruim boven je FTP met evenveel rust. Vergroot je maximale zuurstofopname.'},
  anaeroob:{name:'30/30-intervallen',hard:true,desc:'Dertig seconden hard, dertig seconden rustig. Traint herhaald versnellen en snel herstellen.'},
  klim:{name:'Klimkracht',hard:true,desc:'Blokken op lage cadans, zoals op een lange klim. Blijf zitten en houd je bovenlichaam stil.'},
  sprint:{name:'Sprints',hard:true,desc:'Duurrit met korte sprints van 15 seconden. Traint explosiviteit zonder veel vermoeidheid.'},
  duurklim:{name:'Duurrit met klimblokken',hard:false,desc:'Lange duurrit met blokken op tempo en lage cadans, zoals op een klim midden in een lange tocht. Rustig tussen de blokken.'},
  duurtempo:{name:'Duurrit met tempofinale',hard:false,desc:'Lange duurrit die eindigt met een blok op tempo. Je leert doortrappen als de benen al moe zijn.'},
  openers:{name:'Activatie',hard:false,desc:'Korte prikkels om de benen wakker te houden zonder vermoeidheid op te bouwen. Past in een herstelweek of de dag voor een zware rit.'},
  ramptest:{name:'FTP-test (ramptest)',hard:true,desc:'Elke minuut gaat het vermogen omhoog tot je niet meer kunt. Stop zodra je de cadans niet meer vasthoudt; je FTP wordt berekend uit je beste minuut.'}
};
const S=(d,a,b,label,kind,cad)=>({d:Math.max(1,Math.round(d)),a,b:b==null?a:b,label,kind,cad:cad||0});
const pick=(arr,L)=>arr[clamp(L,0,2)];
const half=x=>Math.max(1,Math.floor(x*2)/2);

function repeatBlock(T,wu,cd,o){
  const {frac,pref,off,pOn,pOff=.55,label,maxReps=8,cad,maxOn=99}=o;
  const room=T-wu-cd,work=room*frac;
  let reps=clamp(Math.round(work/pref),1,maxReps);
  let on=work/reps;on=Math.min(maxOn,on>=4?Math.floor(on):half(on));
  while(reps*on+(reps-1)*off>room&&on>1)on-=.5;
  const segs=[S(wu*60,.45,.75,'Warming-up','warmup')];
  for(let i=0;i<reps;i++){
    segs.push(S(on*60,pOn,pOn,`${label} ${i+1} van ${reps}`,'work',cad));
    if(i<reps-1)segs.push(S(off*60,pOff,pOff,'Herstel','rest'));
  }
  const left=room-(reps*on+(reps-1)*off);
  if(left>=.5)segs.push(S(left*60,.62,.62,'Rustig doorrijden','steady'));
  segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  return {segs,tag:`${reps}×${nl(on)}`};
}

function buildWorkout(type,T,L){
  if(!TYPES[type])type='duur';
  T=clamp(Math.round(T),20,300);L=clamp(L|0,0,2);
  if((type==='duurklim'||type==='duurtempo')&&T<45)type='duur';
  const wu=T>=60?10:T>=40?8:5, cd=T>=60?5:T>=40?4:3;
  let segs=[],tag='';
  if(type==='herstel'){
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
  }else if(type==='tempo'){
    ({segs,tag}=repeatBlock(T,wu,cd,{frac:pick([.65,.75,.85],L),pref:15,off:4,pOn:pick([.80,.83,.85],L),label:'Tempo'}));
  }else if(type==='sweetspot'){
    ({segs,tag}=repeatBlock(T,wu,cd,{frac:pick([.6,.7,.8],L),pref:12,off:4,pOn:pick([.88,.90,.92],L),label:'Sweet spot'}));
  }else if(type==='drempel'){
    ({segs,tag}=repeatBlock(T,wu,cd,{frac:pick([.55,.65,.75],L),pref:10,off:4,pOn:pick([.95,.98,1],L),label:'Drempel',maxReps:6}));
  }else if(type==='vo2'){
    const pref=pick([2.5,3,3.5],L);
    ({segs,tag}=repeatBlock(T,wu,cd,{frac:pick([.4,.45,.48],L),pref,off:pref,pOn:pick([1.12,1.15,1.17],L),pOff:.5,label:'VO2max',maxReps:pick([5,6,7],L),maxOn:pref+.5}));
  }else if(type==='klim'){
    ({segs,tag}=repeatBlock(T,wu,cd,{frac:pick([.5,.6,.7],L),pref:10,off:4,pOn:pick([.86,.90,.94],L),label:'Klim',cad:65,maxReps:6}));
  }else if(type==='anaeroob'){
    const room=T-wu-cd;let N=pick([8,10,12],L);
    if(room<N)N=Math.max(4,Math.floor(room));
    const sets=clamp(Math.floor((room+5)/(N+5)),1,3);
    segs.push(S(wu*60,.45,.75,'Warming-up','warmup'));
    for(let s=0;s<sets;s++){
      for(let i=0;i<N;i++){segs.push(S(30,1.3,null,`Hard ${i+1} van ${N}`,'work'));segs.push(S(30,.5,null,'Rustig','rest'))}
      if(s<sets-1)segs.push(S(300,.55,null,'Serierust','rest'));
    }
    const left=room-(sets*N+(sets-1)*5);
    if(left>=1)segs.push(S(left*60,.62,null,'Rustig doorrijden','steady'));
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
    tag=`${sets}×${N}`;
  }else if(type==='sprint'){
    const room=T-wu-cd,n=clamp(Math.floor(room/5),1,pick([6,8,10],L));
    segs.push(S(wu*60,.45,.7,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(S(285,.65,null,'Duurtempo','steady'));segs.push(S(15,1.7,null,`Sprint ${i+1} van ${n}`,'work'))}
    const left=room-n*5;
    if(left>=1)segs.push(S(left*60,.62,null,'Rustig doorrijden','steady'));
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
    tag=`${n}×15 s`;
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
  return {id:`${type}-${T}-${L}`,type,L,name:TYPES[type].name+(tag?' '+tag:''),desc:TYPES[type].desc,segs,sec,minutes:Math.round(sec/60),IF,tss:Math.round(sec/3600*IF*IF*100)};
}
