'use strict';
/* ================= planner ================= */
const GOALS={
  ftp:{name:'FTP verhogen',long:'duur',
    plan:'Sweet spot en drempelblokken doen het meeste werk, omdat tijd rond je FTP het vermogen verhoogt dat je een uur volhoudt. In de derde opbouwweek komt VO2max erbij om de bovengrens op te rekken.',
    slots:[['sweetspot','drempel','vo2'],['drempel','sweetspot','vo2'],['drempel','vo2','sweetspot']],
    why:{sweetspot:'Veel minuten vlak onder je FTP: de kern van dit doel, met weinig herstelschade.',drempel:'Rijden op je FTP zelf maakt precies dat vermogen houdbaarder en uiteindelijk hoger.',vo2:'Je FTP kan niet hoger dan je maximale zuurstofopname toelaat. Deze training tilt dat plafond op.',duur:'Rustige uren vergroten je aerobe basis, waardoor je meer drempelwerk aankunt.'}},
  klimmen:{name:'Beter klimmen',long:'duurklim',
    plan:'Klimmen is lang achter elkaar hoog vermogen leveren, vaak op lage cadans. Daarom staan klimkracht en drempel centraal, met VO2max voor steile stukken en een lange rit met klimblokken.',
    slots:[['klim','sweetspot','vo2'],['klim','drempel','vo2'],['drempel','klim','vo2']],
    why:{klim:'Lange blokken op lage cadans bootsen een klim na en trainen de kracht waarmee je zittend omhoog rijdt.',sweetspot:'Een lange klim rijd je net onder je drempel. Hier bouw je de minuten op dat vermogen op.',drempel:'Hoe hoger je drempelvermogen per kilo, hoe sneller je boven bent.',vo2:'Steile stroken en versnellingen bergop vragen vermogen boven je drempel.',duurklim:'Klimmen met vermoeide benen: tempoblokken op lage cadans midden in een lange rit.'}},
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
const WHY={herstel:'Herstel hoort bij het plan: hier zet je lichaam het werk van de zware dagen om in vooruitgang.',duur:'Rustige uren vormen de basis waarop de zware trainingen hun effect hebben.',openers:'In een herstelweek houden korte prikkels de benen scherp zonder nieuwe vermoeidheid.',ramptest:'Met een actuele FTP kloppen alle doelvermogens in je schema.'};
const NEED={tempo:3,klim:3,sweetspot:3,drempel:2,vo2:1,anaeroob:1,sprint:1};
const whyFor=(goal,type)=>((GOALS[goal]||GOALS.ftp).why||{})[type]||WHY[type]||'';
const PHASES=['Opbouwweek 1','Opbouwweek 2','Opbouwweek 3','Herstelweek'];

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
function planWeek(st,monday,today){
  const ctx=weekCtx(st,monday),rec=ctx.rec;
  const goal=GOALS[st.profile.goal]||GOALS.ftp;
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
  const act=days.filter(d=>d.minutes>=20);
  for(const d of act){d.T=d.minutes;if(ctx.vol<1&&d.o.minutes==null)d.T=Math.min(d.T,Math.max(30,Math.round(d.T*ctx.vol/5)*5))}
  if(evDay){
    /* week van het evenement: één korte prikkel vroeg in de week, activatie de dag ervoor, verder rustig */
    let keyDone=false;
    for(const d of act){
      const r=evDay.i-d.i;let type,T=d.T;
      if(d.o.type)type=d.o.type;
      else if(r<0){type='herstel';T=Math.min(T,45)}
      else if(r===1)type='openers';
      else if(r>=3&&!keyDone&&d.minutes>=30){type=goal.slots[2][0];keyDone=true;d.key=true}
      else type=T>=40?'duur':'herstel';
      d.wo=buildWorkout(type,T,0);
    }
  }else{
    let nHard=act.length>=5?3:act.length>=3?2:act.length>=1?1:0;
    nHard=Math.min(nHard,ctx.cap);
    if(fat.level===2&&nHard>1)nHard--;
    let long=null;
    if(act.length>=3)long=act.reduce((a,b)=>b.minutes>=a.minutes?b:a);
    const cands=act.filter(d=>d!==long&&d.minutes>=30);
    const hard=[];
    for(const d of cands)if(d.minutes>=45&&hard.length<nHard&&!hard.some(h=>Math.abs(h.i-d.i)<=1))hard.push(d);
    for(const d of cands)if(hard.length<nHard&&!hard.includes(d)&&!hard.some(h=>Math.abs(h.i-d.i)<=1))hard.push(d);
    for(const d of cands)if(hard.length<nHard&&!hard.includes(d))hard.push(d);
    hard.sort((a,b)=>a.i-b.i);
    /* kernsessies van deze fase; de blokken die tijd nodig hebben gaan naar de langste dagen */
    const src=ctx.kind==='base'?['sweetspot','tempo']:goal.slots[ctx.sp];
    const want=rec?[]:src.slice(0,hard.length).sort((x,y)=>NEED[y]-NEED[x]);
    const byTime=[...hard].sort((x,y)=>y.minutes-x.minutes);
    const assign=new Map();byTime.forEach((d,k)=>assign.set(d,want[k]));
    for(const d of act){
      let type;
      if(d.o.type)type=d.o.type;
      else if(hard.includes(d)){type=rec?'openers':assign.get(d);d.key=!rec}
      else if(d===long){type=(ctx.kind==='build'||ctx.kind==='peak')&&d.T>=75?goal.long:'duur';d.long=true}
      else type=d.T>=40?'duur':'herstel';
      d.wo=buildWorkout(type,d.T,L);
    }
  }
  /* gemiste kernsessies in de lopende week schuiven door naar een latere dag */
  if(today&&thisWeek===0){
    const tk=iso(today),has=k=>rides.some(r=>r.date===k);
    for(const d of days){
      if(!(d.iso<tk&&d.wo&&d.key&&!has(d.iso)))continue;
      d.missed=true;
      const cand=days.filter(x=>x.iso>=tk&&x.wo&&!x.key&&!x.o.type&&x.minutes>=30&&!(x.iso===tk&&has(tk)));
      if(!cand.length)continue;
      const keys=days.filter(x=>x.key&&x.iso>=tk).map(x=>x.i);
      const sc=x=>(keys.some(k=>Math.abs(k-x.i)<=1)?0:2)+(x.long?0:1)+x.minutes/1000;
      cand.sort((a,b)=>sc(b)-sc(a));
      const t=cand[0];
      t.wo=buildWorkout(d.wo.type,t.T,d.wo.L);t.key=true;t.long=false;t.movedFrom=d.i;d.movedTo=t.i;
    }
  }
  return {monday,ctx,label:ctx.label,L,days,custom:!!wk,fat};
}
