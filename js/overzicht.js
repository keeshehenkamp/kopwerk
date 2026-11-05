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
/* oudere ritten: eenmalig uitrekenen uit de bewaarde vermogensgegevens */
async function fillKj(){
  if(ui.kjBusy)return;ui.kjBusy=true;let ch=false;
  for(const r of state.rides){if(r.sim||r.kjb!==undefined||(r.kj||0)<1000)continue;const rec=await idb.get('s:'+r.id);r.kjb=rec&&rec.p?kjBests(rec.p):{};ch=true}
  ui.kjBusy=false;if(ch){save(false);if(ui.view==='prestaties')render()}
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
  return `<div class="chart" style="height:200px"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label="Fitheid en vermoeidheid">
      <line x1="${xn}" x2="${xn}" y1="0" y2="200" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>
      ${ln('ctl','var(--acc)',2.2,0,0,now)}${ln('ctl','var(--acc)',2,1,now,N-1)}${ln('atl','var(--muted)',1.5,0,0,now)}${ln('atl','var(--muted)',1.5,1,now,N-1)}</svg>
      ${dateTick(all[0].d,0)}${now>0&&now<N-1?`<span class="xl" style="left:${now/(N-1)*100}%">vandaag</span>`:''}${dateTick(all[N-1].d,1)}</div>
    <div class="legend"><span><i style="background:var(--acc)"></i>Fitheid</span><span><i style="background:var(--muted)"></i>Vermoeidheid</span><span><i class="dash"></i>Verwacht</span></div>`;
}
/* ---------- Kalender: één lijst om doorheen te scrollen: deze en volgende week, daarna wat je echt reed ----------
   Verder vooruit plannen heeft geen zin: je tijd verandert elke week. */
const MISS_WHY={tijd:'geen tijd',moe:'te moe',ziek:'ziek'};
function calWhen(d){return `<span class="when"><b>${DAYS[dow(d)]}</b>${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</span>`}
const calRide=(r,cls='')=>`<button data-act="openRide" data-id="${r.id}" class="${cls}">${calWhen(parseISO(r.date))}<span class="dot done">${I.check}</span><span class="w"><b>${esc(r.name)}</b><span>${clock(r.dur)}${r.rpe?` · gevoel ${r.rpe}`:''}</span></span><span class="r">${r.tss} TSS</span></button>`;
function kalenderView(){
  if(!state.setup)return setupView();
  const today=new Date(),tk=iso(today),mon=mondayOf(today),real=state.rides.filter(r=>!r.sim),rep=state.missed||{};
  const planned=(m,title)=>{
    const k=iso(m),rows=planWeek(state,m,today).days.flatMap(d=>{
      const rs=real.filter(r=>r.date===d.iso),td=d.iso===tk?'today':'';
      if(rs.length)return rs.map(r=>calRide(r,td));
      if(d.event)return [`<div class="li ${td}">${calWhen(d.date)}<span class="dot ev"></span><span class="w"><b>${esc(d.event)}</b><span>Evenement</span></span></div>`];
      if(!d.wo)return [];
      const past=d.iso<tk,w=rep[d.iso]&&rep[d.iso].why;
      return [`<button data-act="openDay" data-iso="${d.iso}" class="${past?'miss':td}">${calWhen(d.date)}<span class="dot" style="background:var(--z${woZone(d.wo)})"></span><span class="w"><b>${esc(d.wo.name)}</b><span>${past?(w?`Niet gedaan · ${MISS_WHY[w]||w}`:'Nog invullen'):durTxt(d.wo.minutes)}</span></span><span class="r">${past?'':d.wo.tss+' TSS'}</span></button>`]});
    const open=ui.calEdit===k;
    return `<div class="wkh"><h2>${title}</h2><button class="ibtn${open?' on':''}" data-act="calEdit" data-k="${k}" aria-pressed="${open}" aria-label="Tijd per dag, ${title.toLowerCase()}" title="Tijd per dag">${ICO.tijd}</button></div>
      ${open?`<div class="card" style="margin-bottom:8px">${availEditor(k)}</div>`:''}
      <div class="card tl">${rows.length?`<div class="list">${rows.join('')}</div>`:'<p class="muted" style="padding:10px 6px">Geen trainingen.</p>'}</div>`};
  /* logboek: per week, nieuwste eerst; alleen weken waarin iets gebeurde */
  const weeks=new Map(),put=(k,x)=>{const w=iso(mondayOf(parseISO(k)));if(w<iso(mon)){if(!weeks.has(w))weeks.set(w,[]);weeks.get(w).push(x)}};
  for(const r of real)put(r.date,{k:r.date,ts:r.ts,r});
  for(const [k,v] of Object.entries(rep))if(!real.some(r=>r.date===k))put(k,{k,ts:parseISO(k).getTime(),why:v.why});
  let month='',log='';
  for(const w of [...weeks.keys()].sort().reverse()){
    const m=parseISO(w),l=weeks.get(w).sort((a,b)=>a.ts-b.ts),rs=l.filter(x=>x.r).map(x=>x.r),sec=rs.reduce((a,r)=>a+r.dur,0),tss=rs.reduce((a,r)=>a+r.tss,0);
    const mt=MONTHS[m.getMonth()].replace(/^./,c=>c.toUpperCase())+(m.getFullYear()!==today.getFullYear()?' '+m.getFullYear():'');
    if(mt!==month){month=mt;log+=`<div class="month">${mt}</div>`}
    const rows=l.map(x=>{if(x.r)return calRide(x.r);const pl=(state.plog||{})[x.k],n=pl&&TYPES[pl.t]?TYPES[pl.t].name:'Training';
      return `<div class="li miss">${calWhen(parseISO(x.k))}<span class="dot rest"></span><span class="w"><b>${esc(n)}</b><span>Niet gedaan · ${MISS_WHY[x.why]||x.why}</span></span></div>`}).join('');
    log+=`<div class="wkl"><span>Week ${weekNo(m)}</span><span>${rs.length?`${rs.length} ${rs.length===1?'rit':'ritten'} · ${durTxt(Math.round(sec/60))} · ${tss} TSS`:'Niet gereden'}</span></div><div class="card tl"><div class="list">${rows}</div></div>`;
  }
  const tools=`<div class="row">${state.strava&&stravaReady()?'<button class="btn" data-act="stravaFetch">Ophalen van Strava</button>':''}<button class="btn" data-act="openAdd">Buitenrit toevoegen</button></div>`;
  const strip=phaseStrip(today);
  return `<div class="head"><div><h1>Kalender</h1></div>${tools}</div><div class="timeline">${strip?`<div style="margin-bottom:6px">${strip}</div>`:''}
    ${planned(mon,'Deze week')}${planned(addDays(mon,7),'Volgende week')}
    ${log?`<div class="wkh"><h2>Eerder</h2></div>${log}`:''}</div>`;
}

/* ---------- Prestaties: vermogenscurve, vermogen na werk en records ---------- */
const PERIODS=[[42,'6 weken'],[91,'3 maanden'],[365,'1 jaar'],[0,'Alles']];
function prestatiesView(){
  if(!state.setup)return setupView();
  const head=`<div class="head"><div><h1>Prestaties</h1></div>${vtabs()}</div>`,real=state.rides.filter(r=>!r.sim);
  if(!real.length)return `${head}<div class="card"><p class="muted">Je records verschijnen na je eerste rit.</p></div>`;
  fillKj();
  const per=ui.perf??91,cut=per?iso(addDays(new Date(),-per)):'',sel=real.filter(r=>!cut||r.date>=cut),lbl=(PERIODS.find(([v])=>v===per)||PERIODS[1])[1];
  const chips=`<div class="seg" role="group" aria-label="Periode">${PERIODS.map(([v,t])=>`<button class="btn small" data-act="perf" data-p="${v}" aria-pressed="${v===per}">${t}</button>`).join('')}</div>`;
  /* vermogen na werk: frisse waarde tegenover na 1.000 en 2.000 kJ, in de gekozen periode */
  const fresh=records(sel),aft={};for(const k of KJ_STEPS){aft[k]={};for(const r of sel){const b=r.kjb&&r.kjb[k];if(b)for(const [w] of KJ_DUR)if(b[w]&&(!aft[k][w]||b[w]>aft[k][w]))aft[k][w]=b[w]}}
  const any=KJ_STEPS.some(k=>Object.keys(aft[k]).length);
  const cell=(k,w)=>{const v=aft[k][w],f=fresh[w]&&fresh[w].w;return v?`<b style="font-weight:600">${v} W</b>${f?` <span class="muted">${Math.round(v/f*100)}%</span>`:''}`:'–'};
  const dur=`<div class="card"><h3 style="margin-bottom:10px">Vermogen na lang rijden</h3>
    ${any?`<div class="scroll"><table><thead><tr><th>Duur</th><th>Fris</th><th>Na 1.000 kJ</th><th>Na 2.000 kJ</th></tr></thead><tbody>
      ${KJ_DUR.map(([w,t])=>`<tr><td>${t}</td><td>${fresh[w]?fresh[w].w+' W':'–'}</td><td>${cell(1000,w)}</td><td>${cell(2000,w)}</td></tr>`).join('')}</tbody></table></div>`
      :`<p class="small muted">Nog geen rit boven 1.000 kJ in deze periode.</p>`}</div>`;
  /* best uitgevoerd: de hoogste cijfers in de gekozen periode */
  const top=state.rides.filter(r=>cijfer(r)!=null&&!r.sim&&(!cut||r.date>=cut)).sort((a,b)=>b.score-a.score||b.ts-a.ts).slice(0,5);
  const best=top.length?`<div class="card"><h3 style="margin-bottom:6px">Best uitgevoerd</h3><div class="list">${top.map((r,i)=>{const d=new Date(r.ts);
    return `<button data-act="openRide" data-id="${r.id}"><span class="when"><b>${i+1}</b></span><span class="w"><b>${esc(r.name)}</b><span>${d.getDate()} ${MONTHS[d.getMonth()]}</span></span><span class="r"><b class="gr">${nl(cijfer(r).toFixed(1))}</b></span></button>`}).join('')}</div></div>`:'';
  return `${head}<div class="stack">${chips}${recordsCard(sel,lbl)||''}${best?`<div class="cols">${dur}${best}</div>`:dur}</div>`;
}

/* ---------- Voortgang: fitheid, vermoeidheid, vorm, eFTP en niveau door de tijd ---------- */
function voortgangView(){
  if(!state.setup)return setupView();
  const today=new Date(),head=`<div class="head"><div><h1>Voortgang</h1></div>${vtabs()}</div>`;
  if(!state.rides.some(r=>!r.sim))return `${head}<div class="card"><p class="muted">Je voortgang verschijnt na je eerste rit.</p></div>`;
  const path=fitnessPath(today,horizonDays(today)),f=path.now;
  const pc=progressCard()||{ftpCard:'',lvHTML:''};
  /* fitheid en vermoeidheid: de stand van nu groot, de lijn eronder; vorm is het verschil */
  const fit=`<div class="card"><div class="trio"><div class="bignum"><span>Fitheid</span><b>${f.ctl}</b></div><div class="bignum"><span>Vermoeidheid</span><b>${f.atl}</b></div><div class="bignum"><span>Vorm</span><b>${f.tsb>0?'+':f.tsb<0?'−':''}${Math.abs(f.tsb)}</b><small>${formOf(f.tsb)}</small></div></div>${fitChart(path)}</div>`;
  /* belasting per week: gereden tegenover gepland */
  const mon=mondayOf(today),bars=[];let mx=1;
  for(let w=7;w>=0;w--){const m=addDays(mon,-7*w),s=iso(m),en=iso(addDays(m,6));
    const done=state.rides.filter(r=>!r.sim&&r.date>=s&&r.date<=en).reduce((a,r)=>a+r.tss,0),pl=s>=state.planStart?weekSum(planWeek(state,m)).t:0;
    mx=Math.max(mx,done,pl);bars.push({m,done,pl})}
  const load=`<div class="card"><h3 style="margin-bottom:14px">Belasting per week</h3><div class="bars">${bars.map(b=>`<div class="b"><span class="num">${b.done||''}</span><div class="col" style="height:${Math.max(2,Math.max(b.pl,b.done)/mx*100)}%${b.pl?'':';border-color:transparent'}"><i style="height:${Math.round(b.done/Math.max(1,Math.max(b.pl,b.done))*100)}%"></i></div><span>wk ${weekNo(b.m)}</span></div>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--acc)"></i>Gereden</span><span><i class="box"></i>Gepland</span></div></div>`;
  return `${head}<div class="stack"><div class="cols">${pc.ftpCard}${fit}</div><div class="cols">${load}${pc.lvHTML||'<div></div>'}</div></div>`;
}
