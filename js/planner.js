'use strict';
/* ================= planner ================= */
const GOALS={
  ftp:{name:'FTP verhogen',long:'duur',
    plan:'Sweet spot en drempelblokken doen het meeste werk, omdat tijd rond je FTP het vermogen verhoogt dat je een uur volhoudt. In de derde opbouwweek komt VO2max erbij om de bovengrens op te rekken.',
    slots:[['sweetspot','drempel','vo2'],['drempel','sweetspot','vo2'],['drempel','vo2','sweetspot']],
    why:{sweetspot:'Veel minuten vlak onder je FTP: de kern van dit doel, met weinig herstelschade.',drempel:'Rijden op je FTP zelf maakt precies dat vermogen houdbaarder en uiteindelijk hoger.',vo2:'Je FTP kan niet hoger dan je maximale zuurstofopname toelaat. Deze training tilt dat plafond op.',duur:'Rustige uren vergroten je aerobe basis, waardoor je meer drempelwerk aankunt.'}},
  klimmen:{name:'Beter klimmen',long:'duurklim',
    plan:'Klimmen is lang achter elkaar hoog vermogen leveren, vaak op lage cadans. Daarom staan klimkracht en drempel centraal, met VO2max voor steile stukken en een lange rit met klimblokken.',
    slots:[['kracht','sweetspot','vo2'],['klim','drempel','vo2'],['drempel','klim','vo2']],
    why:{kracht:'Lage cadans met veel weerstand bouwt de kracht op waarmee je een lange klim zittend omhoog duwt.',klim:'Lange blokken op lage cadans bootsen een klim na en trainen de kracht waarmee je zittend omhoog rijdt.',sweetspot:'Een lange klim rijd je net onder je drempel. Hier bouw je de minuten op dat vermogen op.',drempel:'Hoe hoger je drempelvermogen per kilo, hoe sneller je boven bent.',vo2:'Steile stroken en versnellingen bergop vragen vermogen boven je drempel.',duurklim:'Klimmen met vermoeide benen: tempoblokken op lage cadans midden in een lange rit.'}},
  duur:{name:'Lange tocht uitrijden',long:'duurtempo',
    plan:'Voor een lange tocht telt hoe lang je een stevig tempo volhoudt. Tempo en sweet spot bouwen dat op, en de lange rit eindigt op tempo zodat je leert doortrappen met vermoeide benen.',
    slots:[['tempo','sweetspot','tempo'],['sweetspot','tempo','tempo'],['tempo','sweetspot','drempel']],
    why:{tempo:'Dit is het tempo dat je tijdens een lange tocht urenlang wilt kunnen rijden.',sweetspot:'Verhoogt het vermogen waarop je lang comfortabel blijft, zodat hetzelfde tempo minder kost.',drempel:'Een hogere drempel geeft reserve op heuvels en bij tegenwind.',duurtempo:'De belangrijkste rit voor dit doel: veel uren, met aan het eind nog een blok op tempo.',duur:'Uren maken is voor dit doel de kern. Blijf rustig, dan houd je het vol.'}},
  koers:{name:'Wedstrijden en groepsritten',long:'duur',
    plan:'In een koers of snelle groep beslissen korte, harde inspanningen die steeds terugkomen. Daarom ligt de nadruk op VO2max, 30/30-intervallen en sprints, met drempelwerk om ertussen te herstellen.',
    slots:[['vo2','anaeroob','sprint'],['vo2','drempel','anaeroob'],['anaeroob','vo2','sprint']],
    why:{vo2:'Aanvallen pareren en gaten dichten duurt een paar minuten ver boven je drempel. Dat train je hier.',anaeroob:'Steeds opnieuw versnellen uit bochten en na demarrages, met weinig rust ertussen.',sprint:'Explosiviteit voor de sprint en om een wiel te pakken.',drempel:'Een hoge drempel betekent dat je tussen de versnellingen door herstelt in plaats van verder leegloopt.',duur:'De aerobe basis bepaalt hoe fris je de finale haalt.'}},
  fit:{name:'Fitter worden',long:'duur',
    plan:'Een brede mix: elke week een langer blok onder je drempel en een kortere, hardere prikkel. Zo ontwikkel je uithoudingsvermogen en snelheid tegelijk zonder je te specialiseren.',
    slots:[['sweetspot','vo2','sprint'],['drempel','anaeroob','tempo'],['vo2','sweetspot','sprint']],
    why:{sweetspot:'De efficiëntste manier om je algemene uithoudingsvermogen te verhogen.',vo2:'Korte harde intervallen verbeteren je conditie het snelst per geïnvesteerde minuut.',drempel:'Leert je lang een stevig tempo vast te houden.',anaeroob:'Maakt je beter in herhaald versnellen en snel herstellen.',sprint:'Houdt snelheid en explosiviteit erin.',tempo:'Stevig doorrijden zonder dat het echt zwaar wordt.'}}
};
const WHY={souplesse:'Hoge cadans maakt je trapbeweging soepeler, zodat hetzelfde vermogen minder kracht per trap kost.',herstel:'Herstel hoort bij het plan: hier zet je lichaam het werk van de zware dagen om in vooruitgang.',duur:'Rustige uren vormen de basis waarop de zware trainingen hun effect hebben.',openers:'In een herstelweek houden korte prikkels de benen scherp zonder nieuwe vermoeidheid.',ramptest:'Met een actuele FTP kloppen alle doelvermogens in je schema.'};
const NEED={tempo:3,klim:3,kracht:3,sweetspot:3,drempel:2,heuvels:2,vo2:1,anaeroob:1,sprint:1};

/* Het soort evenement bepaalt waar de trainingen op gericht zijn, zodra er een evenement gepland staat. */
const EVENTS={
  vlak:{name:'Vlakke tocht',kmh:27,long:'duurtempo',
    plan:'Een vlakke tocht rijd je urenlang op een stevig, gelijkmatig tempo, vaak met wind. Tempo en sweet spot bouwen dat op, en de lange rit eindigt op tempo zodat je leert doortrappen met vermoeide benen.',
    slots:[['tempo','sweetspot','drempel'],['sweetspot','tempo','drempel'],['sweetspot','drempel','tempo']],
    why:{tempo:'Dit is het tempo dat je in een vlakke tocht urenlang wilt kunnen rijden.',sweetspot:'Verhoogt het vermogen waarop je lang comfortabel blijft, zodat hetzelfde tempo minder kost.',drempel:'Een hogere drempel geeft reserve bij tegenwind en als het tempo omhoog gaat.',duurtempo:'De belangrijkste rit voor dit evenement: lang onderweg, met aan het eind nog een blok op tempo.',duur:'Uren maken is de basis voor een lange tocht. Blijf rustig, dan houd je het vol.'}},
  heuvels:{name:'Heuvelachtige tocht',kmh:23,long:'duurheuvels',
    plan:'Een heuvelachtige tocht bestaat uit veel korte, steile hellingen achter elkaar. Je traint daarom korte, harde inspanningen boven je FTP en het herstel ertussen, met een lange rit vol korte klimmen.',
    slots:[['heuvels','sweetspot','vo2'],['vo2','heuvels','drempel'],['heuvels','anaeroob','vo2']],
    why:{heuvels:'Precies wat een heuveltocht vraagt: steeds opnieuw een korte, steile helling op en daarna snel herstellen.',vo2:'Op een steile helling rijd je een paar minuten ver boven je drempel. Deze training vergroot dat vermogen.',anaeroob:'Herhaald aanzetten met weinig rust ertussen, zoals op hellingen die elkaar snel opvolgen.',sweetspot:'Een hoge basis onder je drempel zorgt dat je tussen de hellingen door herstelt.',drempel:'Hoe hoger je drempel, hoe minder elke helling je kost.',duurheuvels:'Lang onderweg en toch steeds hellingen aanzetten: zo voelt de tweede helft van een heuveltocht.',duur:'Uren in de benen zijn nodig om de hele tocht fris te blijven.'}},
  bergen:{name:'Bergtocht',kmh:19,long:'duurklim',
    plan:'In de bergen klim je lang achter elkaar, vaak op lage cadans. Klimkracht en drempel staan centraal, met VO2max voor de steile stukken en een lange rit met klimblokken.',
    slots:[['kracht','klim','vo2'],['klim','drempel','vo2'],['drempel','klim','vo2']],
    why:{kracht:'Lage cadans met veel weerstand bouwt de kracht op voor cols waar je lang op een zware versnelling zit.',klim:'Lange blokken op lage cadans bootsen een col na en trainen de kracht waarmee je zittend omhoog rijdt.',sweetspot:'Een lange klim rijd je net onder je drempel. Hier bouw je de minuten op dat vermogen op.',drempel:'Hoe hoger je drempelvermogen per kilo, hoe sneller en makkelijker je boven bent.',vo2:'Steile stroken en haarspeldbochten vragen vermogen boven je drempel.',duurklim:'Klimmen met vermoeide benen: blokken op lage cadans midden in een lange rit.',duur:'Een bergtocht duurt lang. Rustige uren zorgen dat je de laatste col nog haalt.'}},
  koers:Object.assign({},GOALS.koers,{kmh:34})
};
const EVENT_KINDS=[['','Weet ik niet'],['vlak','Vlak, lange afstand'],['heuvels','Heuvelachtig, korte steile hellingen'],['bergen','Bergen, lange klimmen'],['koers','Wedstrijd of snelle groepsrit']];
const EVENT_KM={vlak:150,heuvels:150,bergen:120,koers:100};
/* Met een evenement in het vooruitzicht volgt het schema het evenement, anders je doel. */
const coachFor=(st,ctx)=>{const k=st.event&&st.event.kind;return ctx&&ctx.toGo!=null&&EVENTS[k]?EVENTS[k]:(GOALS[st.profile.goal]||GOALS.ftp)};
const whyFor=(prof,type)=>((prof&&prof.why)||{})[type]||WHY[type]||'';
const whyOn=(date,type)=>whyFor(coachFor(state,weekCtx(state,mondayOf(date))),type);

const CYCLE=ph=>ph===3?{label:'Herstelweek',kind:'rec',rec:true,L:0,sp:0,vol:.7,cap:1}:{label:`Opbouwweek ${ph+1}`,kind:'build',rec:false,L:ph,sp:ph,vol:1,cap:3};
function weekCtx(st,monday){
  const ev=st.event&&st.event.date?parseISO(st.event.date):null;
  if(ev&&!isNaN(ev)){
    const w=Math.round(dayDiff(monday,mondayOf(ev))/7);
    if(w>=0){
      const c=(()=>{
        if(w===0)return {label:'Week van je evenement',kind:'event',rec:false,L:0,sp:2,vol:.6,cap:1};
        if(w===1)return {label:'Afbouwweek',kind:'taper',rec:false,L:1,sp:2,vol:.75,cap:2};
        if(w<=3)return {label:`Piekweek ${4-w}`,kind:'peak',rec:false,L:2,sp:2,vol:1,cap:3};
        const k=w-4,ph=[3,2,1,0][k%4];
        if(k>=12&&ph!==3)return {label:`Basisweek ${ph+1}`,kind:'base',rec:false,L:ph,sp:ph,vol:1,cap:2};
        return CYCLE(ph);
      })();
      c.toGo=w;c.evIso=st.event.date;return c;
    }
  }
  const wi=Math.floor(dayDiff(parseISO(st.planStart),monday)/7);
  return CYCLE(((wi%4)+4)%4);
}
/* Belasting van de laatste 7 dagen tegenover het weekgemiddelde van de 4 weken ervoor. */
function fatigue(st,today){
  const real=(st.rides||[]).filter(r=>!r.sim);
  if(!real.length)return {level:0};
  const first=real.reduce((a,r)=>r.date<a?r.date:a,real[0].date);
  if(dayDiff(parseISO(first),today)<21)return {level:0};
  const sum=(a,b)=>real.reduce((x,r)=>{const n=dayDiff(parseISO(r.date),today);return n>=a&&n<b?x+r.tss:x},0);
  const acute=sum(0,7),chronic=sum(7,35)/4;
  if(chronic<80)return {level:0};
  const ratio=acute/chronic;
  return {level:ratio>=1.5?2:ratio>=1.3?1:0,pct:Math.round((ratio-1)*100)};
}
/* ================= coach ================= */
const r5=x=>Math.round(x/5)*5;
const LONG_TYPES=['duurklim','duurtempo','duurheuvels'];
const INTENSE=['vo2','anaeroob','sprint','heuvels'];
function combos(arr,k){
  const out=[];if(k<=0)return [[]];
  const go=(s,cur)=>{if(cur.length===k){out.push(cur.slice());return}for(let i=s;i<arr.length;i++){cur.push(arr[i]);go(i+1,cur);cur.pop()}};
  go(0,[]);return out;
}
/* Gemiddelde uren per week in de vier weken voor deze week; null zolang er minder dan drie weken aan ritten is. */
function recentHours(st,monday){
  const real=(st.rides||[]).filter(r=>!r.sim);
  if(!real.length)return null;
  const first=real.reduce((a,r)=>r.date<a?r.date:a,real[0].date);
  if(dayDiff(parseISO(first),monday)<21)return null;
  let s=0;for(const r of real){const n=dayDiff(parseISO(r.date),monday);if(n>=1&&n<=28)s+=r.dur}
  return s/3600/4;
}
/* Hoeveel en hoe lang: een weekvolume dat past bij je niveau, je doel, je evenement en de fase. */
function coachTargets(st,monday,ctx,fat){
  const p=st.profile,wkg=p.ftp/clamp(p.weight||75,35,200);
  const level=clamp(3+(wkg-1.5)*3,4,12);
  let ideal=level*(p.goal==='duur'?1.1:p.goal==='fit'?.9:1);
  const ev=ctx.toGo!=null&&st.event?st.event:null,ek=ev&&EVENTS[ev.kind]?ev.kind:'';
  const km=ev?(ev.km||EVENT_KM[ek]||0):0;
  const evH=km?km/((ek?EVENTS[ek].kmh:25)*clamp(wkg/3,.8,1.25)**.4):0;
  if(evH)ideal=Math.max(ideal,Math.min(level*1.4,evH*1.5));
  const now=mondayOf(new Date()),hist=recentHours(st,monday<now?monday:now);
  const base=hist==null?ideal*.85:hist<ideal?Math.min(ideal,hist*1.1+.5):Math.min(hist,ideal*1.25);
  const phase=k=>({build:[.92,1,1.08][ctx.L],base:[.95,1,1.05][ctx.L],peak:1.05,rec:.6,taper:.65,event:.4}[k]||1);
  const weekH=base*phase(ctx.kind)*(fat.level===2?.8:fat.level?.9:1);
  let longT=clamp(level*60*.3,90,210)*(p.goal==='duur'?1.25:1);
  if(evH){const evLong=clamp(evH*60*.75,120,330);if(evLong>longT)longT+=(evLong-longT)*clamp((14-ctx.toGo)/10,0,1)}
  longT*={build:[.9,1,1.1][ctx.L],base:[.9,1,1.05][ctx.L],peak:1.1,rec:.7,taper:.6}[ctx.kind]||1;
  longT=r5(Math.max(60,Math.min(longT,weekH*60*.45)));
  return {wkg,level,ideal,hist,evH,weekH,longT,
    keyT:r5(clamp(level*8+15,60,level>=10?105:90)),keyTi:r5(clamp(level*8+15,60,75)),easyCap:level>=9||p.goal==='duur'?150:120};
}
/* Trede per soort training: je eigen voortgang, met kleine stappen per fase en terug bij vermoeidheid. */
function lvlFor(st,t,C,ctx,fat){
  if(!LADDER[t])return null;
  const n=LADDER[t].steps.length,p=st.prog&&st.prog[t];
  const start=Math.max(1,Math.round(n*(C.level<6?.2:C.level<8?.3:C.level<10?.4:.5)));
  const bump={build:[-.5,0,.5][ctx.L],peak:1,taper:-1,rec:-1,event:-1}[ctx.kind]||0;
  return clamp(Math.round((p!=null?p:start)+bump-(fat.level?1:0)+(st.levelAdj||0)),1,n);
}
function planWeek(st,monday,today){
  const ctx=weekCtx(st,monday),rec=ctx.rec;
  const prof=coachFor(st,ctx);
  const rides=st.rides||[];
  const thisWeek=today?dayDiff(mondayOf(today),monday):-1;
  const fat=today&&(thisWeek===0||thisWeek===7)&&!rec&&ctx.kind!=='event'?fatigue(st,today):{level:0};
  const L=rec?0:clamp(ctx.L+(st.levelAdj||0)-(fat.level?1:0),0,2);
  const days=[],wk=(st.weeks||{})[iso(monday)];
  for(let i=0;i<7;i++){
    const d=addDays(monday,i),k=iso(d),o=st.overrides[k]||{},base=wk?wk[i]:st.avail[i];
    days.push({i,date:d,iso:k,o,base,minutes:o.skip?0:(o.minutes!=null?o.minutes:base),wo:null});
  }
  const evDay=ctx.kind==='event'?days.find(d=>d.iso===ctx.evIso):null;
  if(evDay){evDay.event=st.event.name||'Evenement';evDay.minutes=0}
  /* dagen die voorbij zijn houden wat er toen gepland stond */
  const tk=today?iso(today):null,plog=st.plog||{};
  for(const d of days)if(tk&&d.iso<tk&&plog[d.iso]&&!d.event)d.logged=plog[d.iso];
  const C=coachTargets(st,monday,ctx,fat);
  const lv=t=>lvlFor(st,t,C,ctx,fat);
  const keyLen=t=>t==='openers'||t==='ramptest'?45:LADDER[t]?Math.max(45,r5(ladderNeed(t,lv(t)))):INTENSE.includes(t)?C.keyTi:C.keyT;
  const lenFor=t=>LONG_TYPES.includes(t)?C.longT:t==='duur'?Math.min(C.easyCap,90):t==='herstel'?60:keyLen(t);
  /* zelf gekozen trainingen staan vast; de beschikbare tijd blijft een maximum */
  for(const d of days)if(d.logged&&d.logged.t&&TYPES[d.logged.t]){
    d.wo=buildWorkout(d.logged.t,d.logged.m,d.logged.L||0,d.logged.v);d.T=d.wo.minutes;d.key=!!d.logged.k;d.long=!!d.logged.l;
  }
  const forced=days.filter(d=>d.o.type&&!d.event&&!d.logged&&TYPES[d.o.type]);
  for(const d of forced){
    const t=d.o.type;d.T=d.minutes>=20?Math.min(d.minutes,lenFor(t)):lenFor(t);
    d.key=TYPES[t].hard&&t!=='ramptest';d.long=LONG_TYPES.includes(t);
    d.wo=buildWorkout(t,d.T,t==='ramptest'?0:L,lv(t));
  }
  forced.push(...days.filter(d=>d.logged&&d.wo));
  const free=days.filter(d=>!d.event&&!d.o.type&&!d.logged&&d.minutes>=20);
  if(evDay){
    /* week van het evenement: één korte prikkel vroeg in de week, activatie de dag ervoor, verder rustig */
    const r=d=>evDay.i-d.i,pref=[5,4,6,3];
    const opts=free.filter(d=>pref.includes(r(d))&&d.minutes>=45).sort((a,b)=>pref.indexOf(r(a))-pref.indexOf(r(b)));
    const key=forced.some(d=>d.key)?null:opts[0];
    if(key){const t=prof.slots[2][0];key.key=true;key.wo=buildWorkout(t,Math.min(key.minutes,60),0,lv(t))}
    const before=free.find(d=>r(d)===1);
    if(before)before.wo=buildWorkout('openers',Math.min(before.minutes,45),0);
    for(const d of free.filter(d=>!d.wo&&r(d)>=3&&r(d)<=4))d.wo=buildWorkout('duur',Math.min(d.minutes,r(d)===3?45:60),0);
    for(const d of free)if(!d.wo&&d.i-evDay.i>=2)d.wo=buildWorkout('herstel',Math.min(d.minutes,45),0);
  }else{
    let nDays=C.weekH<=3.5?3:C.weekH<=5.5?4:C.weekH<=8.5?5:6;
    if(rec)nDays=Math.min(nDays,4);
    let nHard=rec?1:ctx.kind==='base'||ctx.kind==='taper'?2:C.weekH<7?2:3;
    if(fat.level===2&&nHard>1)nHard--;
    /* met weinig dagen blijft er naast de lange rit ruimte voor een rustige dag */
    nHard=Math.min(nHard,Math.max(1,free.length+forced.length-2));
    nHard=Math.max(0,nHard-forced.filter(d=>d.key).length);
    nDays=Math.max(0,nDays-forced.length);
    const wantLong=!forced.some(d=>d.long);
    const fixed=forced.filter(d=>d.key||d.long).map(d=>d.i);
    /* zware dagen en lange rit: zo goed mogelijk passend in de beschikbare tijd en nooit twee zware dagen achter elkaar */
    let best=null;
    const td=tk&&days.find(d=>d.iso===tk),was=td&&plog[tk]?(plog[tk].l?'l':plog[tk].k?'k':'r'):null;
    for(const Ld of wantLong&&nDays>0?[null,...free.filter(d=>d.minutes>=60)]:[null]){
      const pool=free.filter(d=>d!==Ld&&d.minutes>=45),kmax=Math.max(0,Math.min(nHard,pool.length,nDays-(Ld?1:0)));
      /* liever een zware training minder dan twee zware dagen achter elkaar */
      for(const k of kmax>1||(kmax===1&&fixed.length)?[kmax,kmax-1]:[kmax])for(const H of combos(pool,k)){
        const S=[...fixed,...H.map(d=>d.i)].concat(Ld?[Ld.i]:[]).sort((a,b)=>a-b);
        let sc=k*20+(Ld?25:0);
        for(const d of H)sc+=Math.min(d.minutes,C.keyT)/C.keyT*10;
        if(Ld)sc+=Math.min(Ld.minutes,C.longT)/C.longT*12+(Ld.i>=5?8:0);
        /* wat er vandaag al stond, verandert niet zonder goede reden */
        if(was&&(Ld===td?'l':H.includes(td)?'k':'r')!==was)sc-=12;
        /* zwaar vlak na de lange rit is het slechtst, zwaar vlak ervoor het minst erg; zondag en maandag tellen ook als buren */
        for(let j=1;j<S.length;j++)if(S[j]-S[j-1]===1)sc-=Ld&&S[j-1]===Ld.i?40:Ld&&S[j]===Ld.i?25:34;
        if(S[0]===0&&S[S.length-1]===6&&S.length>1)sc-=Ld&&Ld.i===6?40:34;
        if(!best||sc>best.sc)best={sc,Ld,H};
      }
    }
    const Ld=best.Ld,H=best.H;
    /* rustige dagen: genoeg om het weekvolume te halen, met rustdagen ertussen */
    const E0=free.filter(d=>d!==Ld&&!H.includes(d)&&d.minutes>=30);
    const nE=Math.max(0,Math.min(E0.length,nDays-H.length-(Ld?1:0)));
    const stressAt=new Set([...fixed,...H.map(d=>d.i)].concat(Ld?[Ld.i]:[]));
    let bestE=null;
    for(const E of combos(E0,nE)){
      const on=new Array(7).fill(false);for(const i of stressAt)on[i]=true;for(const d of forced)on[d.i]=true;for(const d of E)on[d.i]=true;
      let sc=0,run=0;
      for(const d of E)sc+=Math.min(d.minutes,90)/90*3;
      for(let i=0;i<7;i++){run=on[i]?run+1:0;if(run>3)sc-=6}
      for(const i of stressAt)if(i>0&&!on[i-1])sc+=1;
      if(!bestE||sc>bestE.sc)bestE={sc,E};
    }
    let E=bestE?bestE.E:[];
    /* soorten training: de blokken die tijd nodig hebben gaan naar de dagen met de meeste tijd */
    const climb=prof===GOALS.klimmen||prof===EVENTS.bergen;
    const src=ctx.kind==='base'?(climb?['kracht','sweetspot']:['sweetspot','tempo']):prof.slots[ctx.sp];
    const want=rec?[]:src.slice(0,H.length).sort((x,y)=>NEED[y]-NEED[x]);
    const types=new Map();[...H].sort((x,y)=>y.minutes-x.minutes).forEach((d,k)=>types.set(d,rec?'openers':want[k]));
    const need=[...H].reduce((a,d)=>a+Math.min(d.minutes,rec?60:keyLen(types.get(d))),0)+(Ld?Math.min(Ld.minutes,C.longT):0);
    const budget=C.weekH*60-forced.reduce((a,d)=>a+d.wo.minutes,0),fit=need>budget?clamp(budget/need,.6,1):1;
    for(const d of H){
      const t=types.get(d);
      d.T=Math.min(d.minutes,Math.max(45,r5((rec?60:keyLen(t))*fit)));d.wo=buildWorkout(t,d.T,L,lv(t));d.key=!rec;
    }
    /* FTP-test: in de eerste week en daarna elke zes weken, in een rustige week zodat je fris bent */
    if(tk&&thisWeek>=0&&!['peak','taper','event'].includes(ctx.kind)){
      const tests=rides.filter(r=>!r.sim&&r.type==='ramptest').map(r=>r.date).sort(),last=tests[tests.length-1];
      const due=last?dayDiff(parseISO(last),addDays(monday,6))>=42&&(rec||ctx.kind==='base'):(rec||iso(monday)===st.planStart);
      const td=due&&H.filter(d=>d.iso>=tk).sort((a,b)=>a.i-b.i)[0];
      if(td){td.wo=buildWorkout('ramptest',45,0);td.key=true;td.test=true}
    }
    if(Ld){
      Ld.T=Math.min(Ld.minutes,Math.max(60,r5(C.longT*fit)));Ld.long=true;
      Ld.wo=buildWorkout((ctx.kind==='build'||ctx.kind==='peak')&&Ld.T>=75?prof.long:'duur',Ld.T,L);
    }
    let left=C.weekH*60-[...forced,...H].concat(Ld?[Ld]:[]).reduce((a,d)=>a+d.wo.minutes,0);
    E=E.slice().sort((a,b)=>a.minutes-b.minutes);
    while(E.length&&left/E.length<40)E.shift();
    E.sort((a,b)=>Math.min(a.minutes,C.easyCap)-Math.min(b.minutes,C.easyCap));let soup=false;
    E.forEach((d,k)=>{
      const T=r5(Math.min(d.minutes,C.easyCap,left/(E.length-k)));
      if(T<30)return;
      const after=stressAt.has(d.i-1);
      /* één rustige rit per week met souplesse-blokken */
      const t=T<=50||(after&&T<=60)?'herstel':!soup&&!rec?(soup=true,'souplesse'):'duur';
      d.T=T;d.wo=buildWorkout(t,T,L,lv(t));left-=d.wo.minutes;
    });
  }
  /* gemiste kernsessies in de lopende week schuiven door naar een latere dag */
  if(today&&thisWeek===0){
    const tk=iso(today),has=k=>rides.some(r=>r.date===k);
    for(const d of days){
      if(!(d.iso<tk&&d.wo&&d.key&&!has(d.iso)&&(!st.started||d.iso>=st.started)))continue;
      d.missed=true;
      /* alleen naar een dag die niet naast een andere zware dag of de lange rit ligt; anders vervalt hij */
      const keys=days.filter(x=>(x.key||x.long)&&x!==d).map(x=>x.i);
      const cand=days.filter(x=>x.iso>=tk&&!x.key&&!x.long&&!x.event&&!x.o.type&&x.minutes>=45&&!(x.iso===tk&&has(tk))&&!keys.some(k=>Math.abs(k-x.i)<=1));
      if(!cand.length)continue;
      const sc=x=>(x.wo?1:0)+x.minutes/1000;
      cand.sort((a,b)=>sc(b)-sc(a));
      const t=cand[0];
      t.T=Math.min(t.minutes,d.wo.minutes);t.wo=buildWorkout(d.wo.type,t.T,d.wo.L,d.wo.lvl);t.key=true;t.movedFrom=d.i;d.movedTo=t.i;
    }
  }
  return {monday,ctx,label:ctx.label,L,days,custom:!!wk,fat,coach:C,prof};
}
/* Legt vast wat er tot en met vandaag gepland staat; vandaag kan nog veranderen, eerdere dagen niet meer. */
function logPlan(plan,today){
  const tk=iso(today),log=state.plog||(state.plog={}),cut=iso(addDays(today,-120));let ch=false;
  for(const d of plan.days){
    if(d.iso>tk||d.event||(d.iso<tk&&log[d.iso]))continue;
    const e=d.wo?{t:d.wo.type,m:d.wo.minutes,L:d.wo.L}:{t:''};if(d.wo&&d.wo.lvl)e.v=d.wo.lvl;if(d.wo&&d.key)e.k=1;if(d.wo&&d.long)e.l=1;
    if(JSON.stringify(log[d.iso])!==JSON.stringify(e)){log[d.iso]=e;ch=true}
  }
  for(const k of Object.keys(log))if(k<cut){delete log[k];ch=true}
  if(ch)save();
}
