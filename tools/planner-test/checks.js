'use strict';
/* Controles op de inhoud van de trainingen. Elke klacht over een training wordt hier een regel, zodat dezelfde fout niet terugkomt.
   Open tools/planner-test/ via een lokale webserver; alles moet groen zijn voor een push. */
const CHECK_T=[45,60,75,90,120,150,180];
const LIGHT=new Set(['herstel','herstelcad','herstelgolf','herstelspin']);
const isWork=s=>s.kind==='work';
const body=w=>w.segs.filter(s=>s.kind!=='warmup'&&s.kind!=='cooldown');
const workMin=w=>w.segs.filter(isWork).reduce((a,s)=>a+s.d,0)/60;
function runChecks(){
  state=Object.assign(defaults(),{setup:true,profile:{ftp:200,weight:75,goal:'ftp',niveau:'gevorderd'}});
  const bad=[],types=Object.keys(TYPES).filter(t=>t!=='ramptest');
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
  return bad;
}
function showChecks(){
  const bad=runChecks(),per={};for(const b of bad)(per[b.regel]=per[b.regel]||[]).push(b);
  const el=document.createElement('pre');el.id='checks';
  el.textContent=(bad.length?`FOUT: ${bad.length} controles niet goed\n`:'ALLES GOED\n')+Object.entries(per).map(([r,l])=>`\n${r} (${l.length})\n`+l.slice(0,40).map(b=>`  ${b.t}: ${b.tekst}`).join('\n')).join('\n');
  document.body.prepend(el);window.CHECKS=bad;
}
showChecks();
