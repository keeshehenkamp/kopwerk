'use strict';
/* Controles op de inhoud van de trainingen. Elke klacht over een training wordt hier een regel, zodat dezelfde fout niet terugkomt.
   Open tools/planner-test/ via een lokale webserver; alles moet groen zijn voor een push. */
const CHECK_T=[45,60,75,90,120,150,180];
const LIGHT=new Set(['herstel','herstelcad','herstelgolf','herstelspin']);
const isWork=s=>s.kind==='work';
const body=w=>w.segs.filter(s=>s.kind!=='warmup'&&s.kind!=='cooldown');
const workMin=w=>w.segs.filter(isWork).reduce((a,s)=>a+s.d,0)/60;
/* Regels uit de onderbouwing (voorstellen 3, 4, 7-13). Elke regel zet zijn eigen stand op; een fout in de code telt als foute controle. */
function runCoachChecks(add){
  const rideOf=(date,type,o)=>Object.assign({id:'c'+date+type,date,ts:parseISO(date).getTime()+9*36e5,name:type,type,sim:false,dur:3600,tss:60,IF:.75,rpe:null,zones:[0,0,0,0,0,0,0],best:{},score:95,avgP:150,np:150,laps:[],ftp:197},o||{});
  const base=o=>Object.assign(defaults(),{setup:true,started:'2026-06-01',planStart:'2026-06-01',ftpGiven:'2026-06-01',plog:{},overrides:{},missed:{},prog:{},weeks:{},rides:[],avail:[60,90,0,90,0,120,180],profile:{ftp:197,weight:85,goal:'ftp',niveau:'gevorderd',sound:false},event:null},o||{});
  const at=k=>{NOW=parseISO(k).getTime()+8*36e5;return new Date(NOW)};
  const plan=d=>planWeek(state,mondayOf(d),d);
  /* drie ritten per week van 'van' tot en met 'tot' */
  const steady=(van,tot,o)=>{const l=[];for(let d=parseISO(van);iso(d)<=tot;d=addDays(d,1))if([1,3,5].includes(dow(d)))l.push(rideOf(iso(d),'duur',o));return l};
  const T=(regel,tekst,fn)=>{try{if(!fn())add(regel,'coach',tekst)}catch(e){add(regel,'coach',tekst+' (fout: '+e.message+')')}};
  /* ---------- 3. FTP als schatting ---------- */
  T('ftp-marge','197 W heeft een marge van 7 W',()=>ftpMargin(197)===7);
  T('ftp-marge','een verschil onder 5 W gaat niet vanzelf',()=>!ftpAdopt(199,197)&&!ftpAdopt(193,197)&&ftpAdopt(203,197)&&ftpAdopt(191,197));
  T('ftp-marge','de ramp rekent met je eigen verhouding',()=>{state=base();const r=rideOf('2026-11-01','ramptest',{best:{60:260}}),a=ftpEstimate(r);state.ftpCal={r:.8};return a===195&&ftpEstimate(r)===208});
  T('ftp-marge','uit een rit gaat 20 minuten voor op 5 minuten',()=>{state=base();return ftpEstimate(rideOf('2026-11-01','duur',{best:{1200:200,300:300}}))===190&&ftpEstimate(rideOf('2026-11-01','duur',{best:{300:300}}))===240});
  T('ftp-marge','20-minutentest geeft je verhouding',()=>{state=base({rides:[rideOf('2026-11-01','ramptest',{best:{60:260}})]});const ok=calibrate(rideOf('2026-11-09','test20',{best:{1200:215}}),state);return ok&&Math.abs(state.ftpCal.r-.786)<.002});
  T('ftp-marge','een 20-minutentest die niet voluit was, telt niet',()=>{state=base({rides:[rideOf('2026-11-01','ramptest',{best:{60:260}})]});return !calibrate(rideOf('2026-11-09','test20',{best:{1200:150}}),state)&&!state.ftpCal});
  const na=o=>base(Object.assign({started:'2026-10-26',planStart:'2026-10-26',ftpGiven:null,rides:[...steady('2026-10-26','2026-11-02',{}),rideOf('2026-11-03','ramptest',{best:{60:263}})]},o||{}));
  const heeft=(d,t)=>plan(d).days.some(x=>x.wo&&x.wo.type===t);
  T('ftp-marge','na een ramptest komt eenmalig de 20-minutentest',()=>{state=na();const d=at('2026-11-09');return heeft(d,'test20')});
  T('ftp-marge','met een eigen verhouding geen 20-minutentest meer',()=>{state=na({ftpCal:{r:.78}});return !heeft(at('2026-11-09'),'test20')});
  /* ---------- 4. buitenritten: duur maal gevoel ---------- */
  const lijn=[[4,40],[5,55],[6,70],[7,85],[8,100],[8,100]].map(([rpe,tss],i)=>rideOf(iso(addDays(parseISO('2026-10-20'),i)),'sweetspot',{rpe,tss}));
  T('buiten','eigen lijn uit trainerritten',()=>{state=base({rides:lijn});return Math.abs(feelRate(6,state)-70)<3});
  T('buiten','te weinig ritten: de algemene tabel',()=>{state=base({rides:lijn.slice(0,4)});return Math.abs(feelRate(6,state)-49)<1});
  T('buiten','buitenrit krijgt belasting uit de eigen lijn',()=>{state=base({rides:lijn});const r=rideOf('2026-11-01','buiten',{manual:true,rpe:6,dur:3600,tss:0,avgP:0});feelLoad(r);return Math.abs(r.tss-70)<3});
  /* ---------- 7. ratio en vorm zijn informatie ---------- */
  const piek=extra=>[...steady('2026-10-05','2026-11-01',{tss:70}),rideOf('2026-11-05','duur',{tss:500}),...(extra||[])];
  T('ratio','belasting omhoog zonder zwaar gevoel verandert niets',()=>{state=base({rides:piek()});return fatigue(state,at('2026-11-09')).level===0});
  T('ratio','buiten schema en zwaar: wel lichter',()=>{state=base({rides:piek([rideOf('2026-11-07','sweetspot',{rpe:9,tss:80})])});return fatigue(state,at('2026-11-09')).level>0});
  T('ratio','volgens schema: ook bij zwaar gevoel geen ratio',()=>{const pl={};for(const k of['2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08'])pl[k]={t:'duur',m:200};state=base({plog:pl,rides:piek([rideOf('2026-11-07','sweetspot',{rpe:9,tss:80})])});return fatigue(state,at('2026-11-09')).level===0});
  T('vorm','een lage vorm alleen maakt niets lichter',()=>{const rides=[...steady('2026-08-03','2026-11-01',{tss:60}),...['2026-11-05','2026-11-06','2026-11-07','2026-11-08'].map(k=>rideOf(k,'duur',{tss:300,rpe:4}))];
    state=base({rides});const d=at('2026-11-09');if(fitness(rides,d,84).tsb>=-25)throw new Error('vorm niet laag genoeg');
    for(const k of['2026-11-09','2026-11-10','2026-11-12','2026-11-14','2026-11-15']){const x=at(k),p=plan(x).days.find(y=>y.iso===k);if(p.adj&&/vorm/.test(p.adj))return false}return true});
  T('lange rit','veel langer dan de langste van 30 dagen',()=>{state=base({rides:steady('2026-10-20','2026-11-08',{dur:5400})});return longJump(150,'2026-11-09',state)===90&&longJump(100,'2026-11-09',state)===0});
  T('lange rit','te weinig eerdere ritten: geen melding',()=>{state=base({rides:[rideOf('2026-11-03','duur',{dur:3600})]});return longJump(200,'2026-11-09',state)===0});
  /* ---------- 8. niet testen als het zwaar voelt ---------- */
  const zwaar=(k,o)=>rideOf(k,'sweetspot',Object.assign({rpe:8},o||{}));
  T('zwaar','drie ritten zwaar: eerst lichtere dagen, geen test',()=>{state=base({rides:[...steady('2026-10-01','2026-10-31',{rpe:4}),zwaar('2026-11-03'),zwaar('2026-11-05'),zwaar('2026-11-08')]});const p=plan(at('2026-11-09'));return p.days.filter(x=>x.iso<='2026-11-12').every(x=>!x.key&&!x.long&&!x.test)});
  T('zwaar','na de lichtere dagen wel de test',()=>{state=base({rides:[...steady('2026-10-01','2026-10-31',{rpe:4}),zwaar('2026-11-03'),zwaar('2026-11-05'),zwaar('2026-11-08')]});for(const k of['2026-11-09','2026-11-10','2026-11-11','2026-11-12']){const d=at(k);logPlan(plan(d),d)}return plan(at('2026-11-13')).days.some(x=>x.test&&x.iso>='2026-11-13')});
  T('zwaar','zwaar met lage hartslag: geen hele herstelweek',()=>{state=base({rides:[...steady('2026-10-01','2026-10-31',{rpe:4}),zwaar('2026-11-05',{hrOff:-8}),zwaar('2026-11-08',{hrOff:-8})]});const d=at('2026-11-09'),p=plan(d);return !p.ctx.rec&&!(p.read&&p.read.rest)&&p.days.filter(x=>x.iso<='2026-11-12').every(x=>!x.key)});
  T('zwaar','komt het terug binnen drie weken: alsnog herstel',()=>{state=base({rides:[...steady('2026-10-01','2026-10-31',{rpe:4}),zwaar('2026-11-03',{hrOff:-8}),zwaar('2026-11-05',{hrOff:-8}),zwaar('2026-11-11',{hrOff:-8}),zwaar('2026-11-13',{hrOff:-8})]});return coachRead(state,'2026-11-14').rest});
  T('zwaar','geen test vlak na een rit die zwaar voelde',()=>{state=base({rides:[...steady('2026-10-01','2026-11-06',{rpe:4}),zwaar('2026-11-08')]});return plan(at('2026-11-09')).days.filter(x=>x.iso<='2026-11-11').every(x=>!x.test)});
  T('zwaar','moe en geen zin: vandaag rustig',()=>{state=base({rides:steady('2026-10-01','2026-11-13',{rpe:4}),feel:{'2026-11-14':'moe'},zin:{'2026-11-14':'nee'}});const p=plan(at('2026-11-14')).days[5];return p.wo&&p.wo.type==='herstel'});
  /* ---------- 9. winst als bandbreedte ---------- */
  T('doel','geen sprongen tussen niveaus',()=>{state=base();let v=0;for(let w=150;w<=400;w++){state.profile.ftp=w;const t=blockTarget(state,'ftp',w);if(t<v)return false;v=t}return true});
  T('doel','jouw 12% blijft staan',()=>{state=base();return blockTarget(state,'ftp',197)===220});
  T('doel','onder 2 uur per week een lager doel',()=>{state=base({avail:[60,0,0,0,0,0,60]});const a=blockTarget(state,'ftp',197);state.avail=[60,0,0,0,0,0,0];return blockTarget(state,'ftp',197)<a});
  T('doel','een eindtest binnen de marge telt als gehaald',()=>{const b={goal:'ftp',from:197,target:215},m=blockBand(b);return m.lo===205&&m.hi===225&&blockHit(b,206)&&!blockHit(b,204)});
  T('doel','sprintwinst alleen met sprintwerk',()=>{state=base({profile:{ftp:197,weight:85,goal:'sprint',niveau:'gevorderd'},block:{goal:'sprint',start:'2026-10-05',end:'2026-12-27',from:800,target:850,v:2},rides:steady('2026-10-05','2026-11-08',{best:{15:800}})});ensureBlock(state,at('2026-11-09'));return state.block.noSprint&&state.block.target<=820});
  T('doel','met sprintwerk blijft het sprintdoel staan',()=>{state=base({profile:{ftp:197,weight:85,goal:'sprint',niveau:'gevorderd'},block:{goal:'sprint',start:'2026-10-05',end:'2026-12-27',from:800,target:850,v:2},rides:steady('2026-10-05','2026-11-08',{}).map(r=>Object.assign(r,{type:'sprint',best:{15:800}}))});ensureBlock(state,at('2026-11-09'));return !state.block.noSprint&&state.block.target===850});
  /* ---------- 10. minder leunen op sweet spot ---------- */
  T('8 min','blokken van 8 minuten: vier keer acht',()=>{const w=buildWorkout('vier8',60,1,4);return w.segs.filter(s=>s.kind==='work').length===4&&w.segs.filter(s=>s.kind==='work').every(s=>s.d===480)});
  const vast=(g,niv)=>['2026-11-09','2026-11-16'].map(k=>{state=base({started:'2026-10-19',planStart:'2026-10-19',ftpGiven:'2026-10-19',rides:steady('2026-10-19',iso(addDays(parseISO(k),-1)),{rpe:4}),profile:{ftp:197,weight:85,goal:g,niveau:niv||'gevorderd'}});const p=plan(at(k)),h=p.days.some(x=>x.wo&&x.wo.type==='vier8');return niv?h:p.ctx.rec||h});
  T('8 min','vaste plek bij doel FTP',()=>vast('ftp').every(Boolean));
  T('8 min','vaste plek bij gewoon beter worden',()=>vast('fit').every(Boolean));
  T('8 min','niet voor een beginner',()=>!vast('ftp','beginner').some(Boolean));
  T('zone 2','duurritten op het onderste deel van zone 2',()=>['duur','duurgolf','duuropbouw'].every(t=>buildWorkout(t,120,2).segs.filter(s=>s.kind==='steady').every(s=>s.a<=.67))&&easyRun(30).every(s=>s.a<=.67));
  T('sweet spot','sweet spot is een gebied, geen getal',()=>{const n=1200,p=new Array(n).fill(184),rec={p,hr:new Array(n).fill(0),cad:new Array(n).fill(0),tgt:new Array(n).fill(177)};return analyze(rec,197,[{l:'Sweet spot 1 van 1',k:'work',c:0,s:0}],n,'sweetspot').score>=98});
  T('sweet spot','geen beloftes in de uitleg',()=>!/efficiëntste/.test(TYPES.sweetspot.desc));
  /* ---------- 11. lange rit en afbouw ---------- */
  T('afbouw','één getal voor de lange rit',()=>evLongH(6)===3&&evLongH(1)===1.5&&evLongH(10)===3.5);
  T('afbouw','de check gebruikt hetzelfde getal',()=>{state=base();const c=evCheck(state,{date:'2027-06-01',km:150,kind:'vlak'},at('2026-11-09'));return c&&c.need===evLongH(c.h)});
  const ev=eind=>base(Object.assign({started:'2026-10-01',planStart:'2026-10-01',avail:[60,60,60,60,60,120,120],event:{date:'2026-11-28',name:'Tocht',km:120,kind:'vlak'},rides:(()=>{const l=[];for(let d=parseISO('2026-10-12');iso(d)<=eind;d=addDays(d,1))if([0,1,3,5,6].includes(dow(d)))l.push(rideOf(iso(d),'duur',{rpe:4,tss:50}));return l})()}));
  T('afbouw','afbouwweek: ongeveer evenveel ritten',()=>{state=ev('2026-11-15');const p=plan(at('2026-11-16'));return p.ctx.kind==='taper'&&p.days.filter(x=>x.wo).length>=4});
  T('afbouw','afbouwweek: een korte, harde prikkel',()=>{state=ev('2026-11-15');return plan(at('2026-11-16')).days.some(x=>x.key&&x.wo&&isSharp(x.wo.type))});
  T('afbouw','evenementweek: een korte, harde prikkel',()=>{state=ev('2026-11-22');return plan(at('2026-11-23')).days.some(x=>x.key&&x.wo&&isSharp(x.wo.type))});
  T('afbouw','evenementweek: ongeveer evenveel ritten',()=>{state=ev('2026-11-22');return plan(at('2026-11-23')).days.filter(x=>x.wo).length>=3});
  /* ---------- 12. terugkomen na een gat ---------- */
  const gat=(n,o)=>{const end=parseISO('2026-11-09');return base(Object.assign({rides:steady('2026-08-03',iso(addDays(end,-n)),{rpe:4}).concat(rideOf(iso(addDays(end,-n)),'duur',{rpe:4}))},o||{}))};
  T('terugkomen','6 dagen: niets aan de hand',()=>{state=gat(6);const p=plan(at('2026-11-09'));return p.fat.back==null&&!p.fat.restart});
  T('terugkomen','10 dagen: rustige start, geen stap terug',()=>{state=gat(10);const p=plan(at('2026-11-09'));return p.fat.restart===10&&!p.fat.level&&p.days.filter(x=>x.iso<='2026-11-11').every(x=>!x.key&&!x.long)});
  T('terugkomen','20 dagen: stap terug en lichtere week',()=>{state=gat(20);const p=plan(at('2026-11-09'));return p.fat.level===2&&p.fat.steps===1});
  T('terugkomen','ook de dagen na de eerste rit terug',()=>{state=gat(20);state.rides.push(rideOf('2026-11-09','duur',{rpe:4}));return plan(at('2026-11-12')).fat.level===2});
  T('terugkomen','35 dagen: twee stappen terug',()=>{state=gat(35);return plan(at('2026-11-09')).fat.steps===2});
  T('terugkomen','35 dagen: nieuwe FTP-test na een week',()=>{state=gat(35);state.rides.push(rideOf('2026-11-09','duur',{rpe:4}),rideOf('2026-11-11','duur',{rpe:4}));return plan(at('2026-11-16')).days.some(x=>x.test)});
  T('terugkomen','één rit per week is gewoon je ritme',()=>{const l=[];for(let d=parseISO('2026-09-06');iso(d)<='2026-11-08';d=addDays(d,7))l.push(rideOf(iso(d),'duur',{rpe:4}));state=base({rides:l});const p=plan(at('2026-11-09'));return !p.fat.restart&&p.fat.back==null});
  T('terugkomen','een gemeld gat loopt via ziekte',()=>{state=gat(20,{healthLog:[{kind:'ziekZ',from:'2026-10-21',to:'2026-11-08'}]});return plan(at('2026-11-09')).fat.back==null});
  /* ---------- 13. opbouw ---------- */
  T('opbouw','percentage daalt naarmate je meer rijdt',()=>buildPct(3)<.25&&buildPct(3)>buildPct(7)&&buildPct(7)>buildPct(12));
  T('opbouw','voor 7 uur nauwelijks anders',()=>Math.abs(7*(1+buildPct(7))-8.2)<.2);
}
function runChecks(){
  state=Object.assign(defaults(),{setup:true,profile:{ftp:200,weight:75,goal:'ftp',niveau:'gevorderd'}});
  const bad=[],types=Object.keys(TYPES).filter(t=>!isFtpTest(t));
  const add=(regel,t,tekst)=>bad.push({regel,t,tekst});
  for(const t of types){
    const hard=TYPES[t].hard,lvls=LADDER[t]?[1,Math.ceil(LADDER[t].steps.length/2),LADDER[t].steps.length]:[undefined];
    for(const T of CHECK_T)for(const lv of lvls){
      const w=buildWorkout(t,T,1,lv);if(w.type!==t)continue;
      /* 1. lengte klopt */
      if(Math.abs(w.minutes-T)>6)add('lengte',t,`${T} min gevraagd, ${w.minutes} min gebouwd`);
      /* 2. geen staart: na het laatste werkblok hooguit tien minuten rustig (plus cooling-down) */
      if(hard){const b=body(w);let i=b.length-1,tail=0;while(i>=0&&!isWork(b[i])){tail+=b[i].d;i--}
        if(tail/60>10)add('staart',t,`${T} min, trede ${lv}: ${Math.round(tail/60)} min rustig achteraan geplakt`)}
      /* geen snippers: rustige stukjes korter dan anderhalve minuut horen alleen bij cadansoefeningen */
      if(CAT_OF[t]!=='techniek'&&!LIGHT.has(t)){const k=body(w).find((s,i,l)=>s.kind==='steady'&&s.d<90&&i>0&&i<l.length-1);if(k)add('snipper',t,`${T} min, trede ${lv}: ${k.d} s ${k.label}`)}
      /* 3. geen lang vlak stuk: hooguit twaalf minuten rustig op hetzelfde vermogen en dezelfde cadans */
      if(!LIGHT.has(t)){let run=0,prev=null;for(const s of body(w)){const same=prev&&!isWork(s)&&!isWork(prev)&&s.a===s.b&&Math.abs(s.a-prev.a)<.02&&(s.cad||0)===(prev.cad||0);run=same?run+s.d:(isWork(s)?0:s.d);prev=s;
        if(run/60>12){add('vlak',t,`${T} min, trede ${lv}: ${Math.round(run/60)} min vlak op ${Math.round(s.a*100)}%`);break}}}
    }
    /* 4. langer is meer werk: een rit van 2 uur is geen rit van 1 uur met duurtempo erachter */
    if(hard){const lv=LADDER[t]?Math.ceil(LADDER[t].steps.length/2):undefined,a=buildWorkout(t,60,1,lv),b=buildWorkout(t,120,1,lv);
      if(a.type===t&&b.type===t&&workMin(b)<workMin(a)*1.25)add('meer werk',t,`1 uur ${Math.round(workMin(a))} min werk, 2 uur ${Math.round(workMin(b))} min werk`)}
  }
  /* 5. variatie binnen een pakket: geen twee trainingen met dezelfde blokken */
  const sig=t=>{const w=buildWorkout(t,60,1,LADDER[t]?Math.ceil(LADDER[t].steps.length/2):undefined);return w.segs.filter(isWork).map(s=>s.d+'@'+s.a.toFixed(2)+'-'+(s.cad||0)).join(' ')||w.segs.map(s=>s.d+'@'+s.a.toFixed(2)+'-'+(s.cad||0)).join(' ')};
  for(const p of PACKS)for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)if(sig(p[i])===sig(p[j]))add('pakket',p[i],`zelfde blokken als ${p[j]}`);
  /* 5b. ook de lange ritten van een pakket lijken niet op elkaar: geen twee met dezelfde blokken en minstens twee soorten extra werk */
  const sig2=t=>buildWorkout(t,120,1,LADDER[t]?Math.ceil(LADDER[t].steps.length/2):undefined);
  for(const p of PACKS){const hard=p.filter(t=>TYPES[t].hard);if(hard.length<2)continue;
    const names=new Set(hard.map(t=>sig2(t).segs.filter(s=>isWork(s)&&s.d>=300).map(s=>s.label.replace(/\d+/g,'')).pop()));
    if(names.size<2)add('pakket',p[0],`alle lange ritten eindigen met hetzelfde: ${[...names].join(', ')}`)}
  /* 6. elk pakket heeft minstens vier trainingen, elke training zit in een pakket */
  for(const p of PACKS)if(p.length<4)add('pakket',p[0],`maar ${p.length} trainingen`);
  for(const t of types)if(!PACKS.flat().includes(t))add('pakket',t,'zit in geen pakket');
  /* 7. vrije tijd blijft niet leeg: een gemiste training mag latere tijd niet opeten */
  for(const sun of [75,90,120]){NOW=new RD(2026,10,7,9).getTime();
    state=Object.assign(defaults(),{setup:true,started:'2026-11-02',planStart:'2026-11-02',ftpGiven:'2026-11-02',plog:{},overrides:{},missed:{},profile:{ftp:197,weight:85,goal:'ftp',niveau:'gevorderd'},avail:[0,60,45,45,0,0,sun],weeks:{'2026-11-02':[0,60,45,45,0,0,sun]}});
    for(const k of ['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06']){NOW=parseISO(k).getTime()+8*36e5;const d=new Date(NOW);logPlan(planWeek(state,mondayOf(d),d),d)}
    NOW=new RD(2026,10,7,9).getTime();const d=new Date(NOW),z=planWeek(state,mondayOf(d),d).days[6];
    if(!z.wo)add('vrije tijd','zondag',`${sun} min vrij, geen training`);else if(z.wo.minutes<sun-20)add('vrije tijd','zondag',`${sun} min vrij, maar ${z.wo.minutes} min gepland`)}
  /* 8. de coach zegt niet dat je je tijd moet nakijken: zo'n vaste tekst helpt niet */
  if(/Klopt je tijd|Tik op de klok/.test(coachLine.toString()))add('coachregel','tijd','vaste tekst over de klok staat er weer in');
  /* 9. buitenrit zonder vermogen: op tijd en met het verwachte gevoel telt hij als de training van die dag, te kort niet */
  NOW=new RD(2026,10,9,18).getTime();
  state=Object.assign(defaults(),{setup:true,started:'2026-11-02',planStart:'2026-11-02',ftpGiven:'2026-11-02',plog:{},overrides:{},missed:{},profile:{ftp:197,weight:85,goal:'ftp',niveau:'gevorderd'},avail:[60,60,60,60,60,60,60],weeks:{}});
  const wd=planWeek(state,mondayOf(new Date(NOW)),new Date(NOW)).days.find(d=>d.iso==='2026-11-09'),wf=wd&&wd.wo;
  if(!wf)add('buitenrit','maandag','geen training gepland om mee te vergelijken');
  else{const rit=(min,rpe)=>{const r={id:'x'+min+rpe,date:'2026-11-09',type:'buiten',name:'Buitenrit',manual:true,dur:min*60,rpe};matchFeel(r);feelLoad(r);return r};
    const e=rpeExp(wf.type)??5,goed=rit(wf.minutes,e),kort=rit(Math.round(wf.minutes*.3),e),licht=rit(wf.minutes,clamp(e-4,1,10));
    if(goed.type!==wf.type)add('buitenrit',wf.type,`op tijd met gevoel ${e} telt niet als de training (${goed.score})`);
    if(goed.lvl)add('buitenrit',wf.type,'zonder vermogen hoort de ladder niet te bewegen');
    if(kort.type!=='buiten')add('buitenrit',wf.type,`30% van de tijd telt toch als de training (${kort.score})`);
    if(licht.score>=goed.score)add('buitenrit',wf.type,'veel lichter dan bedoeld scoort niet lager');
    if(!(goed.tss>0))add('buitenrit',wf.type,'geen belasting uit tijd en gevoel')}
  /* 10. rijtijd uit een bestand: een gat waarin je vooruitkwam telt mee, echte stilstand niet */
  const t0=1e9,gaps=resample([0,10,20,30].map((s,i)=>({t:t0+s,dm:i*80}))),stil=resample([{t:t0,dm:0},{t:t0+600,dm:0}]);
  if(gaps.rec.p.length<30)add('rijtijd','bestand',`30 s rijden met een punt per 10 s telt als ${gaps.rec.p.length} s`);
  if(stil.rec.p.length>5)add('rijtijd','bestand',`10 min stilstand telt als ${stil.rec.p.length} s`);
  if(gaps.dist!==240)add('rijtijd','bestand',`afstand ${gaps.dist} m in plaats van 240 m`);
  runCoachChecks(add);
  return bad;
}
function showChecks(){
  const bad=runChecks(),per={};for(const b of bad)(per[b.regel]=per[b.regel]||[]).push(b);
  const el=document.createElement('pre');el.id='checks';
  el.textContent=(bad.length?`FOUT: ${bad.length} controles niet goed\n`:'ALLES GOED\n')+Object.entries(per).map(([r,l])=>`\n${r} (${l.length})\n`+l.slice(0,40).map(b=>`  ${b.t}: ${b.tekst}`).join('\n')).join('\n');
  document.body.prepend(el);window.CHECKS=bad;
}
showChecks();
