'use strict';
/* ================= overzicht: Kalender, Prestaties en Voortgang, en de metingen die Home gebruikt ================= */

/* ---------- metingen ---------- */
/* eFTP: de schatting uit je beste 20 minuten (×0,95) of een FTP-test, over de zes weken tot en met dag t */
function eftpAt(t){const e=iso(t),s=iso(addDays(t,-42));let v=0;for(const r of state.rides)if(!r.sim&&r.date>=s&&r.date<=e)v=Math.max(v,ftpEstimate(r));return v||null}
/* niveau in woorden, op basis van watt per kilo bij je (geschatte) FTP */
const LEVELS=[[2,'beginner'],[2.5,'recreant'],[3,'getrainde recreant'],[3.5,'sterk'],[4,'zeer sterk'],[4.6,'wedstrijdniveau'],[99,'elite']];
const levelOf=wkg=>LEVELS.find(([t])=>wkg<t)[1];
const formOf=tsb=>tsb>5?'fris':tsb<-25?'zwaar vermoeid':tsb<-8?'vermoeid':'in balans';
/* gereedheid: hoe klaar je vandaag bent, uit meldingen, je gevoel en hartslag bij de laatste ritten en je vorm */
function readiness(today){
  const tk=iso(today),f=fitness(state.rides,today,84),H=state.health;
  if(H)return {lvl:'stop',label:healthWord(H)==='ziek'?'Ziek gemeld':'Geblesseerd',why:HEALTH[H.kind].cap?'Alleen korte, rustige ritjes tot je weer beter bent.':'Geen trainingen tot je weer beter bent.',f};
  const hs=healthOn(state,tk),recent=state.rides.filter(r=>!r.sim&&r.date>=iso(addDays(today,-2))&&r.date<=tk);
  const tired=Object.entries(state.missed||{}).some(([k,v])=>v.why==='moe'&&k>=iso(addDays(today,-2))&&k<=tk);
  if(tired)return {lvl:'warn',label:'Neem het rustig',why:'Je meldde dat je te moe was. De komende dagen zijn lichter.',f};
  if(recent.some(rpeHeavy))return {lvl:'warn',label:'Neem het rustig',why:'Je laatste training voelde zwaarder dan verwacht.',f};
  if(hs&&hs.ret)return {lvl:'warn',label:'Rustig opbouwen',why:`Na ${healthWord(hs.h)==='ziek'?'je ziekte':'je blessure'}: ${hs.cap!=null?'eerst alleen rustige ritten':'deze week minder zware trainingen'}.`,f};
  if(f.tsb<-25)return {lvl:'warn',label:'Veel vermoeidheid',why:'De trainingen van de afgelopen dagen zitten nog in je benen.',f};
  if(recent.some(r=>r.hrOff!=null&&r.hrOff>=6))return {lvl:'warn',label:'Let op je herstel',why:'Je hartslag lag bij je laatste rit hoger dan normaal.',f};
  return {lvl:'ok',label:f.tsb>5?'Fris':'Klaar om te trainen',why:f.tsb>5?'Je bent uitgerust.':f.tsb<-8?'Je bent wat vermoeid, zoals hoort als je opbouwt.':'Je vorm is in balans.',f};
}
/* vermogen na werk: beste 1, 5 en 20 minuten vanaf het moment dat je 1.000 of 2.000 kJ had geleverd */
const KJ_STEPS=[1000,2000],KJ_DUR=[[60,'1 min'],[300,'5 min'],[1200,'20 min']];
function kjBests(p){
  const out={},at={};let acc=0;
  for(let i=0;i<p.length;i++){acc+=p[i];for(const k of KJ_STEPS)if(at[k]==null&&acc>=k*1000)at[k]=i}
  for(const k of KJ_STEPS)if(at[k]!=null){const rest=p.slice(at[k]),o={};for(const [w] of KJ_DUR)if(rest.length>=w)o[w]=bestEffort(rest,w);out[k]=o}
  return out;
}
/* fitheid en vermoeidheid van je eerste rit tot vandaag, en daarna met de trainingen die gepland staan */
function fitnessPath(today,ahead){
  const real=state.rides.filter(r=>!r.sim),first=real.length?real.reduce((a,r)=>r.date<a?r.date:a,real[0].date):iso(today);
  const f=fitness(state.rides,today,Math.max(42,dayDiff(parseISO(first),today)+1)),last=f.series[f.series.length-1]||{ctl:0,atl:0};
  let ctl=last.ctl,atl=last.atl;const fut=[],cache={};
  for(let i=1;i<=ahead;i++){const d=addDays(today,i),m=mondayOf(d),k=iso(m),p=cache[k]||(cache[k]=planWeek(state,m,today)),day=p.days.find(x=>x.iso===iso(d)),t=day&&day.wo?day.wo.tss:0;
    ctl+=(t-ctl)/42;atl+=(t-atl)/7;fut.push({d,ctl,atl})}
  return {past:f.series,fut,now:f};
}
/* tot je evenement (als dat binnen een halfjaar ligt), anders zes weken vooruit */
const horizonDays=today=>{const ev=state.event&&state.event.date?parseISO(state.event.date):null,n=ev?dayDiff(today,ev):0;return n>0&&n<=182?n:42};
const dateTick=(d,q,txt)=>`<span class="xl${q===0?' first':q===1?' last':''}" style="left:${q*100}%">${txt||`${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`}</span>`;

/* ---------- grafieken voor Voortgang ---------- */
/* fitheid en vermoeidheid: doorgetrokken tot vandaag, gestippeld waar je schema je naartoe brengt */
function fitChart(path){
  const all=path.past.concat(path.fut),N=all.length,now=path.past.length-1;if(N<2)return '';
  const max=Math.max(20,...all.map(x=>Math.max(x.ctl,x.atl)))*1.1,y=v=>200-v/max*200,part=(k,a,b)=>all.map((x,i)=>i>=a&&i<=b?x[k]:null);
  const ln=(k,c,w,dash,a,b)=>`<path d="${pathOf(part(k,a,b),y)}" fill="none" stroke="${c}" stroke-width="${w}"${dash?' stroke-dasharray="5 4"':''} vector-effect="non-scaling-stroke"/>`;
  const xn=(now/(N-1)*1000).toFixed(1);
  SCRUB.fit=f=>{
    const i=Math.round(f*(N-1)),p=all[i],t=Math.round(p.ctl-p.atl);
    return {x:i/(N-1),html:`<span>${p.d.getDate()} ${MONTHS[p.d.getMonth()].slice(0,3)}${i===now?' · vandaag':i>now?' · verwacht':''}</span><span><b>${Math.round(p.ctl)}</b> fitheid</span><span>Vermoeidheid ${Math.round(p.atl)} · vorm ${t>0?'+':t<0?'−':''}${Math.abs(t)}</span>`};
  };
  return `<div class="chart" data-scrub="fit" style="height:200px"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label="Fitheid en vermoeidheid">
      <line x1="${xn}" x2="${xn}" y1="0" y2="200" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>
      ${ln('ctl','var(--acc)',2.2,0,0,now)}${ln('ctl','var(--acc)',2,1,now,N-1)}${ln('atl','var(--muted)',1.5,0,0,now)}${ln('atl','var(--muted)',1.5,1,now,N-1)}</svg>
      ${dateTick(all[0].d,0)}${now>0&&now<N-1?`<span class="xl" style="left:${now/(N-1)*100}%">vandaag</span>`:''}${dateTick(all[N-1].d,1)}${scrubMarks}</div>
    <div class="legend"><span><i style="background:var(--acc)"></i>Fitheid</span><span><i style="background:var(--muted)"></i>Vermoeidheid</span><span><i class="dash"></i>Verwacht</span></div>`;
}
/* ---------- Kalender: één lijst om doorheen te scrollen: bovenaan wat nog komt, daaronder alles wat geweest is ----------
   Verder vooruit plannen heeft geen zin: je tijd verandert elke week. */
const MISS_WHY={tijd:'geen tijd',moe:'te moe',ziek:'ziek'};
function calWhen(d){return `<span class="when"><b>${DAYS[dow(d)]}</b>${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</span>`}
const calRide=(r,cls='')=>`<button data-act="openRide" data-id="${r.id}" class="${cls}">${calWhen(parseISO(r.date))}<span class="dot done">${I.check}</span><span class="w"><b>${esc(r.name)}</b><span>${clock(r.dur)}${r.type==='hardlopen'&&r.dist?` · ${nl((r.dist/1000).toFixed(1))} km`:''}${r.rpe?` · gevoel ${r.rpe}`:''}</span></span><span class="r">${r.tss} TSS</span></button>`;
function kalenderView(){
  if(!state.setup)return setupView();
  const today=new Date(),tk=iso(today),mon=mondayOf(today),real=state.rides.filter(r=>!r.sim),rep=state.missed||{};
  const planned=(m,title,edit)=>{
    /* vandaag staat op Home; hier wat daarna komt */
    const k=iso(m),rows=planWeek(state,m,today).days.filter(d=>d.iso>tk).flatMap(d=>{
      if(d.event)return [`<div class="li">${calWhen(d.date)}<span class="dot ev"></span><span class="w"><b>${esc(d.event)}</b><span>Evenement</span></span></div>`];
      if(!d.wo)return [];
      return [`<button data-act="openDay" data-iso="${d.iso}">${calWhen(d.date)}<span class="dot" style="background:var(--z${woZone(d.wo)})"></span><span class="w"><b>${esc(d.wo.name)}</b><span>${durTxt(d.wo.minutes)}</span></span><span class="r">${d.wo.tss} TSS</span></button>`]});
    const open=ui.calEdit===k;
    return `<div class="wkh"><h2>${title}</h2>${edit?`<button class="ibtn${open?' on':''}" data-act="calEdit" data-k="${k}" aria-pressed="${open}" aria-label="Tijd per dag, ${title.toLowerCase()}" title="Tijd per dag">${ICO.tijd}</button>`:''}</div>
      ${open?`<div class="card" style="margin-bottom:8px">${availEditor(k)}</div>`:''}
      <div class="card tl">${rows.length?`<div class="list">${rows.join('')}</div>`:'<p class="muted" style="padding:10px 0">Geen trainingen meer.</p>'}</div>`};
  /* geweest: per week, nieuwste eerst, ook de voorbije dagen van deze week; alleen weken waarin iets gebeurde */
  const weeks=new Map(),put=(k,x)=>{if(k>tk)return;const w=iso(mondayOf(parseISO(k)));if(!weeks.has(w))weeks.set(w,[]);weeks.get(w).push(x)};
  for(const r of real)put(r.date,{k:r.date,ts:r.ts,r});
  for(const [k,v] of Object.entries(rep))if(!real.some(r=>r.date===k))put(k,{k,ts:parseISO(k).getTime(),why:v.why});
  /* geplande trainingen van de afgelopen dagen zonder rit en zonder antwoord: nog in te vullen, verplaatst of ziek */
  {const seen=new Set();for(const off of[-7,0])for(const d of planWeek(state,addDays(mon,off),today).days)
    if(d.wo&&!d.event&&d.iso<tk&&d.iso>=iso(addDays(today,-7))&&(!state.started||d.iso>=state.started)&&!rep[d.iso]&&!real.some(r=>r.date===d.iso)&&!seen.has(d.iso)){seen.add(d.iso);put(d.iso,{k:d.iso,ts:d.date.getTime(),plan:d})}}
  let month='',log='';
  for(const w of [...weeks.keys()].sort().reverse()){
    const m=parseISO(w),l=weeks.get(w).sort((a,b)=>b.ts-a.ts),rs=l.filter(x=>x.r).map(x=>x.r),sec=rs.reduce((a,r)=>a+r.dur,0),tss=rs.reduce((a,r)=>a+r.tss,0);
    const mt=MONTHS[m.getMonth()].replace(/^./,c=>c.toUpperCase())+(m.getFullYear()!==today.getFullYear()?' '+m.getFullYear():'');
    if(mt!==month){month=mt;log+=`<div class="month">${mt}</div>`}
    const rows=l.map(x=>{if(x.r)return calRide(x.r);
      if(x.plan){const d=x.plan,info=d.movedTo!=null?`Verplaatst naar ${DAYS_L[d.movedTo]}`:d.health&&d.health.during?'Ziek of geblesseerd':'Nog invullen';
        return `<button data-act="openDay" data-iso="${d.iso}" class="miss">${calWhen(d.date)}<span class="dot miss">${I.x}</span><span class="w"><b>${esc(d.wo.name)}</b><span>${info}</span></span></button>`}
      const pl=(state.plog||{})[x.k],n=pl&&TYPES[pl.t]?TYPES[pl.t].name:'Training';
      return `<div class="li miss">${calWhen(parseISO(x.k))}<span class="dot miss">${I.x}</span><span class="w"><b>${esc(n)}</b><span>Niet gedaan · ${MISS_WHY[x.why]||x.why}</span></span></div>`}).join('');
    log+=`<div class="wkl"><span>Week ${weekNo(m)}</span><span>${rs.length?`${rs.length} ${rs.length===1?'rit':'ritten'} · ${durTxt(Math.round(sec/60))} · ${tss} TSS`:'Niet gereden'}</span></div><div class="card tl"><div class="list">${rows}</div></div>`;
  }
  const tools=`<div class="row">${state.strava&&stravaReady()?'<button class="btn" data-act="stravaFetch">Ophalen van Strava</button>':''}<button class="btn" data-act="openAdd">Buitenrit toevoegen</button><button class="btn" data-act="openCheck" data-iso="${tk}" data-m="other" data-p="1">Iets anders</button></div>`;
  const strip=phaseStrip(today);
  return `<div class="head"><div><h1>Kalender</h1></div>${tools}</div><div class="timeline">${strip?`<div style="margin-bottom:6px">${strip}</div>`:''}
    ${planned(mon,'Deze week')}${planned(addDays(mon,7),'Volgende week',true)}
    ${log?`<div class="wkh"><h2>Geweest</h2></div>${log}`:''}</div>`;
}

/* ---------- Prestaties: vermogenscurve, vermogen na werk en records ---------- */
const PERIODS=[[42,'6 weken'],[91,'3 maanden'],[365,'1 jaar'],[0,'Alles']];
function prestatiesView(){
  if(!state.setup)return setupView();
  const head=`<div class="head"><div><h1>Prestaties</h1></div>${vtabs()}</div>`,real=state.rides.filter(r=>!r.sim);
  if(!real.length)return `${head}<div class="card"><p class="muted">Je records verschijnen na je eerste rit.</p></div>`;
  const per=ui.perf??91,cut=per?iso(addDays(new Date(),-per)):'',sel=real.filter(r=>!cut||r.date>=cut);
  const chips=`<div class="seg" role="group" aria-label="Periode">${PERIODS.map(([v,t])=>`<button class="btn small" data-act="perf" data-p="${v}" aria-pressed="${v===per}">${t}</button>`).join('')}</div>`;
  /* word je sterker? je beste 1, 5 en 20 minuten, en het verschil met de periode ervoor */
  const now=records(sel),prev=per?records(real.filter(r=>r.date<cut&&r.date>=iso(addDays(new Date(),-2*per)))):{};
  const nums=[[60,'1 min'],[300,'5 min'],[1200,'20 min']].map(([w,t])=>{const v=now[w]&&now[w].w,o=prev[w]&&prev[w].w,d=v&&o?v-o:0;
    return `<div><b>${v||'–'}${v?'<i>W</i>':''}</b><span>${t}${d?` · <em class="${d>0?'up':'down'}" style="font-style:normal;font-weight:600">${d>0?'+':'−'}${Math.abs(d)} W</em>`:''}</span></div>`}).join('');
  const kg=state.profile.weight||75,perKg=[[60,'1 min'],[300,'5 min'],[1200,'20 min']].filter(([w])=>now[w]).map(([w,t])=>`${t} ${nl((now[w].w/kg).toFixed(1))}`).join(' · ');
  /* nieuwste records, de laatste drie: groot, en een tik opent de rit */
  const prs=sel.filter(r=>r.prs&&r.prs.length).sort((a,b)=>b.ts-a.ts).flatMap(r=>r.prs.map(x=>({x,r}))).slice(0,3);
  const prHTML=prs.length?`<div class="prs"><h3>Nieuwe records</h3><div class="prg">${prs.map(({x,r})=>{const d=parseISO(r.date);
    return `<button class="prb" data-act="openRide" data-id="${r.id}"><b>${x.w} W</b><span>${x.t} · <em>+${x.w-x.old} W</em></span><span>${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</span></button>`}).join('')}</div></div>`:'';
  return `${head}<div class="stack">${chips}<div><div class="nrow prow">${nums}</div>${perKg?`<p class="small muted" style="margin-top:8px">Per kilo: ${perKg} W/kg</p>`:''}</div>${prHTML}${curveChart(now,prev,per)}</div>`;
}
/* je beste vermogen per duur: hoe lang je hoeveel watt volhield */
function curveChart(now,prev,per){
  const ds=BESTS.filter(([w])=>now[w]);if(ds.length<2)return '';
  const a=Math.log(ds[0][0]),z=Math.log(ds[ds.length-1][0]),X=w=>(Math.log(w)-a)/(z-a),pv=ds.filter(([w])=>prev[w]);
  const vals=ds.map(([w])=>now[w].w).concat(pv.map(([w])=>prev[w].w)),hi=Math.max(...vals)*1.08,lo=Math.min(...vals)*.7,y=v=>200-(v-lo)/(hi-lo)*200;
  const line=(l,G)=>l.map(([w],i)=>`${i?'L':'M'}${(X(w)*1000).toFixed(1)},${y(G[w].w).toFixed(1)}`).join('');
  const ticks=ds.filter(([w],i)=>[5,60,300].includes(w)||i===ds.length-1).map(([w,t])=>{const q=X(w);return `<span class="xl${q===0?' first':q===1?' last':''}" style="left:${q*100}%">${t}</span>`}).join('');
  const kg=state.profile.weight||75;
  SCRUB.curve=f=>{
    const [w,t]=ds.reduce((p,c)=>Math.abs(X(c[0])-f)<Math.abs(X(p[0])-f)?c:p),d=parseISO(now[w].date),o=prev[w];
    return {x:X(w),html:`<span>${t}</span><span><b>${now[w].w} W</b> ${nl((now[w].w/kg).toFixed(1))} W/kg</span><span>${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}${o?` · ervoor ${o.w} W`:''}</span>`};
  };
  return `<div class="card"><h3>Beste vermogen per duur</h3><p class="small muted" style="margin-top:2px">Hoeveel watt je hoe lang volhield.</p>
    <div class="chart" data-scrub="curve" style="height:170px;margin-top:12px"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label="Beste vermogen per duur">
      <path d="${line(ds,now)}L1000,200L0,200Z" fill="var(--acc)" fill-opacity=".14"/>
      ${pv.length>1?`<path d="${line(pv,prev)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`:''}
      <path d="${line(ds,now)}" fill="none" stroke="var(--acc)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>${ticks}${scrubMarks}</div>
    ${pv.length>1?`<div class="legend"><span><i style="background:var(--acc)"></i>${PERIODS.find(p=>p[0]===per)[1]}</span><span><i class="dash"></i>De periode ervoor</span></div>`:''}</div>`;
}

/* ---------- Voortgang: fitheid, vermoeidheid, vorm, eFTP en niveau door de tijd ---------- */
function voortgangView(){
  if(!state.setup)return setupView();
  const today=new Date(),head=`<div class="head"><div><h1>Voortgang</h1></div>${vtabs()}</div>`;
  if(!state.rides.some(r=>!r.sim))return `${head}<div class="card"><p class="muted">Je voortgang verschijnt na je eerste rit.</p></div>`;
  const path=fitnessPath(today,horizonDays(today)),f=path.now;
  const pc=progressCard()||{ftpCard:''};
  /* fitheid en vermoeidheid: de stand van nu groot, de lijn eronder; vorm is het verschil */
  const fit=`<div class="card"><div class="trio"><div class="bignum"><span>Fitheid</span><b>${f.ctl}</b></div><div class="bignum"><span>Vermoeidheid</span><b>${f.atl}</b></div><div class="bignum"><span>Vorm</span><b>${f.tsb>0?'+':f.tsb<0?'−':''}${Math.abs(f.tsb)}</b><small>${formOf(f.tsb)}</small></div></div>${fitChart(path)}</div>`;
  /* belasting per week: gereden tegenover gepland */
  const mon=mondayOf(today),bars=[];let mx=1;
  for(let w=7;w>=0;w--){const m=addDays(mon,-7*w),s=iso(m),en=iso(addDays(m,6));
    const done=state.rides.filter(r=>!r.sim&&r.date>=s&&r.date<=en).reduce((a,r)=>a+r.tss,0),pl=s>=state.planStart?weekSum(planWeek(state,m)).t:0;
    mx=Math.max(mx,done,pl);bars.push({m,done,pl})}
  const load=`<div class="card"><h3 style="margin-bottom:14px">Belasting per week</h3><div class="bars">${bars.map(b=>`<div class="b"><span class="num">${b.done||''}</span><div class="col" style="height:${Math.max(2,Math.max(b.pl,b.done)/mx*100)}%${b.pl?'':';border-color:transparent'}"><i style="height:${Math.round(b.done/Math.max(1,Math.max(b.pl,b.done))*100)}%"></i></div><span>wk ${weekNo(b.m)}</span></div>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--acc)"></i>Gereden</span><span><i class="box"></i>Gepland</span></div></div>`;
  return `${head}<div class="stack"><div class="cols">${pc.ftpCard}${fit}</div>${load}</div>`;
}
