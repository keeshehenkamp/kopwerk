'use strict';
/* ================= views ================= */
const sel=(attrs,opts,val)=>`<select ${attrs}>${opts.map(([v,t])=>`<option value="${v}"${String(v)===String(val)?' selected':''}>${t}</option>`).join('')}</select>`;
const watts=f=>Math.round(f*state.profile.ftp);
/* gereden op dag k; een demo telt niet, die zou de echte training van die dag verbergen */
const rideOn=k=>{const l=state.rides.filter(r=>r.date===k&&!r.sim);return l.length?l[l.length-1]:null};
const weekSum=p=>{let m=0,t=0;for(const d of p.days)if(d.wo){m+=d.wo.minutes;t+=d.wo.tss}return{m,t}};
const logo='<svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true"><rect x="0" y="12" width="5" height="8" rx="1" fill="var(--z2)"/><rect x="7" y="7" width="5" height="13" rx="1" fill="var(--z3)"/><rect x="14" y="0" width="5" height="20" rx="1" fill="var(--z5)"/><rect x="21" y="9" width="5" height="11" rx="1" fill="var(--z1)"/></svg>';
const ICON={
  vandaag:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 11.4 12 5l8 6.4V20h-5.2v-5H9.2v5H4z"/></svg>',
  schema:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 3h2v2h6V3h2v2h3v15H4V5h3zM6 10v8h12v-8z"/></svg>',
  ritten:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-9"/></svg>',
  lib:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 20V11h3.2v9zm6.4 0V4h3.2v16zM16.8 20v-6H20v6z"/></svg>',
  profiel:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20.5c0-4 3.6-6.2 8-6.2s8 2.2 8 6.2z"/></svg>'
};
const TABS=[['vandaag','Home'],['kalender','Kalender'],['prestaties','Prestaties'],['voortgang','Voortgang'],['profiel','Profiel']];
ICON.kalender=ICON.schema;ICON.prestaties=ICON.lib;ICON.voortgang=ICON.ritten;
const TAB_OF={ride:'kalender',schema:'kalender',ritten:'kalender',lib:'kalender',analyse:'voortgang',settings:'profiel'};
const tabOf=v=>v==='training'?TAB_OF[(ui.detail&&ui.detail.from)||'vandaag']||(ui.detail&&ui.detail.from)||'vandaag':v==='ride'?ui.rideFrom||'kalender':TAB_OF[v]||v;
const dayShort=d=>`${DAYS[dow(d)]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
/* zwaarste blok van een training, voor het gekleurde stipje */
const woZone=w=>{let f=0;for(const s of w.segs)if(s.d>=30)f=Math.max(f,(s.a+s.b)/2);return zoneOf(f||.5)};
const dotFor=(d,r)=>r?'<span class="dot done">✓</span>':d.event?'<span class="dot ev"></span>':d.wo?`<span class="dot" style="background:var(--z${woZone(d.wo)})"></span>`:'<span class="dot rest"></span>';
const metaOf=w=>`${durTxt(w.minutes)} · ${w.tss} TSS${w.lvl?` · trede ${w.lvl} van ${w.lvlMax}`:''}`;

function shell(body){
  const cur=tabOf(ui.view);
  return `<aside class="side${state.setup?'':' off'}"><div class="brand">${logo}Kopwerk</div>
    <nav class="tabs" aria-label="Hoofdmenu">${TABS.map(([k,t])=>`<button data-act="nav" data-v="${k}"${cur===k?' aria-current="page"':''}>${ICON[k]}<span>${t}</span></button>`).join('')}</nav>
    <div class="ftp"><div>FTP <b>${state.profile.ftp}</b> W</div><button class="link small" data-act="themeToggle" style="margin-top:10px">${isDark()?'Lichte weergave':'Donkere weergave'}</button></div></aside>
    <main class="main">${ui.saveFail?'<p class="notice small" style="margin-bottom:14px">Opslaan lukt niet in deze browser. Je gegevens blijven staan tot je de pagina sluit; maak een back-up via Profiel.</p>':''}${body}</main>`;
}

/* ---------- formulier met je gegevens (eerste keer en Profiel) ---------- */
function settingsForm(first){
  const p=state.profile,ev=state.event||{};
  const save=`<button class="btn pri big" data-act="saveSettings">Maak mijn schema</button>`;
  /* doelen: 'gewoon beter worden' voorop; een evenement is optioneel */
  const goals=['fit','ftp','klimmen','duur','koers'].filter(k=>GOALS[k]).map(k=>[k,GOALS[k].name]);
  const event=`<details class="evbox"${ev.date?' open':''}><summary>Ik train voor een evenement</summary>
      <div class="form" style="margin-top:12px">
        <div><label class="f" for="s-evn">Naam</label><input type="text" id="s-evn" maxlength="40" value="${esc(ev.name||'')}" placeholder="optioneel" style="width:100%"></div>
        <div><label class="f" for="s-evd">Datum</label><input type="date" id="s-evd" value="${ev.date||''}"></div>
        <div><label class="f" for="s-evk">Soort</label>${sel('id="s-evk"',EVENT_KINDS,ev.kind||'')}</div>
        <div><label class="f" for="s-evkm">Afstand in km</label><input type="number" id="s-evkm" min="20" max="400" value="${ev.km||''}" placeholder="optioneel" style="width:120px"></div>
      </div>${first?'':`<div class="row" style="margin-top:12px"><button class="btn" data-act="aiResearch"${ui.aiBusy?' disabled':''}>${ui.aiBusy?'De coach onderzoekt je evenement':'Laat de coach je evenement onderzoeken'}</button>${ui.aiBusy?'<span class="small muted">Een tot twee minuten</span>':''}</div>`}</details>`;
  return `<div class="stack">
    <div class="card stack"><h2>Wat wil je bereiken?</h2>
      <div class="form"><div><label class="f" for="s-goal">Doel</label>${sel('id="s-goal"',goals,p.goal||'fit')}</div></div>${event}</div>
    <div class="card stack"><h2>Jij</h2>
      <div class="form">
        <div><label class="f" for="s-ftp">FTP in watt</label><input type="number" id="s-ftp" min="60" max="600" value="${first&&!state.setup?'':p.ftp}" placeholder="weet ik niet" style="width:120px"></div>
        <div><label class="f" for="s-w">Gewicht in kg</label><input type="number" id="s-w" min="35" max="200" value="${p.weight}" style="width:120px"></div>
        ${first?'':`<div><label class="f" for="s-mhr">Maximale hartslag</label><input type="number" id="s-mhr" min="120" max="230" value="${p.maxHr||''}" placeholder="optioneel" style="width:120px"></div>
        <div><label class="f" for="s-snd">Geluid bij blokwissel</label>${sel('id="s-snd"',[[1,'Aan'],[0,'Uit']],p.sound?1:0)}</div>`}
      </div>
</div>
    ${first?`<div class="card"><h2 style="margin-bottom:12px">Wanneer kun je fietsen?</h2>${availEditor('setup')}</div>`:''}
    ${first?`<div>${save}</div>`:''}</div>`;
}
function setupView(){
  return `<div class="head"><div><h1>Welkom bij Kopwerk</h1></div></div>${settingsForm(true)}`;
}

/* ---------- je tijd per dag ----------
   Op één plek: de week op Home (en bij het instellen). Tik op een dag en scrol naar de tijd die je hebt;
   zodra het wiel stilstaat, staat het opgeslagen. Een week die je niet invult, neemt de vorige over. */
const WHEEL=[0,30,45,60,75,90,105,120,135,150,165,180,210,240,270,300],WROW=40;
const minShort=m=>m?(m>=60?(m%60?`${Math.floor(m/60)}u${m%60}`:`${m/60}u`):`${m}m`):'–';
const ICO={
  ziek:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
  tijd:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};
function avWeek(k){
  if(k==='setup'){const m=ui.setupAvail||(ui.setupAvail=state.avail.slice());return {mins:m,lock:m.map(()=>false)}}
  const tk=iso(new Date()),plan=planWeek(state,parseISO(k),new Date());
  return {mins:plan.days.map(d=>d.o.skip?0:(d.o.minutes!=null?d.o.minutes:d.base)),lock:plan.days.map(d=>d.iso<tk),dates:plan.days.map(d=>d.date),today:plan.days.map(d=>d.iso===tk)};
}
const wheelIdx=m=>{let b=0;WHEEL.forEach((v,i)=>{if(Math.abs(v-m)<Math.abs(WHEEL[b]-m))b=i});return b};
function availEditor(k){
  const w=avWeek(k),sel=ui.avSel&&ui.avSel.k===k&&!w.lock[ui.avSel.i]?ui.avSel.i:null,tot=w.mins.reduce((x,y)=>x+y,0);
  const tiles=w.mins.map((m,i)=>`<button class="avd${sel===i?' on':''}${w.today&&w.today[i]?' today':''}" data-act="avDay" data-k="${k}" data-i="${i}"${w.lock[i]?' disabled':''} aria-pressed="${sel===i}" aria-label="${DAYS_L[i]}: ${m?durTxt(m):'rust'}"><span>${DAYS[i]}${w.dates?' '+w.dates[i].getDate():''}</span><b>${minShort(m)}</b></button>`).join('');
  let pick='';
  if(sel!=null){const ix=wheelIdx(w.mins[sel]),d=w.dates&&w.dates[sel];
    pick=`<div class="avpick"><div class="avlbl"><b>${DAYS_L[sel].replace(/^./,c=>c.toUpperCase())}</b>${d?`<span>${d.getDate()} ${MONTHS[d.getMonth()]}</span>`:''}</div>
      <div class="wheelwrap"><div class="wheel" tabindex="0" role="listbox" aria-label="Tijd op ${DAYS_L[sel]}" data-k="${k}" data-idx="${ix}" data-cur="${ix}"><div class="wpad"></div>${WHEEL.map((m,i)=>`<button class="${i===ix?'on':''}" data-act="wheelTo" data-i="${i}" role="option" aria-selected="${i===ix}">${m?durTxt(m):'Rust'}</button>`).join('')}<div class="wpad"></div></div></div></div>`}
  return `<div class="aved" data-k="${k}"><div class="avdays">${tiles}</div>${pick}<div class="avtot">${tot?durTxt(tot)+' beschikbaar':'Nog geen tijd gekozen'}</div></div>`;
}
function avRefresh(k){const el=document.querySelector(`.aved[data-k="${k}"]`);if(el){el.outerHTML=availEditor(k);initWheels()}}
/* het wiel: scrollen kiest, stilstaan bewaart */
function initWheels(){
  for(const w of document.querySelectorAll('.wheel')){
    if(w.dataset.on)continue;w.dataset.on='1';w.scrollTop=+w.dataset.idx*WROW;let t=0;
    w.addEventListener('scroll',()=>{
      const n=clamp(Math.round(w.scrollTop/WROW),0,WHEEL.length-1);
      if(+w.dataset.cur!==n){w.dataset.cur=n;w.querySelectorAll('button').forEach((b,j)=>{b.classList.toggle('on',j===n);b.setAttribute('aria-selected',j===n)});
        const tile=w.closest('.aved').querySelector('.avd.on b');if(tile)tile.textContent=minShort(WHEEL[n])}
      clearTimeout(t);t=setTimeout(()=>{const c=+w.dataset.cur;if(c!==+w.dataset.idx){w.dataset.idx=c;actions.avPick({k:w.dataset.k,m:WHEEL[c]})}},300);
    },{passive:true});
    w.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();w.scrollBy({top:e.key==='ArrowDown'?WROW:-WROW,behavior:'smooth'})}});
  }
}

/* ---------- vandaag ---------- */
/* hoe je ervoor staat: gereedheid, ziek gemeld of een lichtere week; bovenaan, met ziek melden als icoon */
function statusCard(plan,today){
  const rd=readiness(today),f=rd.f,e=eftpAt(today),ftp=state.profile.ftp,H=state.health,fat=plan.fat,hs=H?null:healthOn(state,iso(today));
  const note=H||fat.health||fat.tired?'':fat.heavy>=2?'Twee trainingen voelden deze week zwaarder dan verwacht. De rest van de week is een stap lichter.':fat.heavy?'De rest van de week is een stap lichter.'
    :fat.level?`Je reed de laatste week ${fat.pct}% meer dan gewoonlijk. De zware trainingen zijn een stap lichter.`:'';
  const why=H?`${HEALTH[H.kind].label} sinds ${dateLong(parseISO(H.from))}. ${rd.why}`:rd.lvl==='ok'?'':rd.why;
  return `<div class="card ready ${rd.lvl}"><div class="sthead"><div><h2>${rd.label}</h2>${why?`<p class="small muted" style="margin-top:3px">${why}</p>`:''}${note?`<p class="small" style="margin-top:5px">${note}</p>`:''}</div>
      ${H?'':`<button class="ibtn" data-act="openHealth" aria-label="Ziek of geblesseerd melden" title="Ziek of geblesseerd">${ICO.ziek}</button>`}</div>
    ${H?`<div class="row" style="margin-top:12px"><button class="btn small pri" data-act="healthBetter">Ik ben weer beter</button><button class="btn small" data-act="openHealth">Aanpassen</button><button class="btn small" data-act="healthDrop">Intrekken</button></div>`
      :hs&&hs.ret?`<div class="row" style="margin-top:12px"><button class="btn small" data-act="healthUndo" data-from="${hs.h.from}">Melding intrekken</button></div>`:''}
    ${e&&e>ftp*1.02?`<p class="small" style="margin-top:10px">Je ritten wijzen op een hogere FTP. <button class="link" data-act="setFtp" data-w="${e}">FTP op ${e} W zetten</button></p>`:''}</div>`;
}
function dayCard(d,tk){
  const r=rideOn(d.iso);
  if(r)return `<button class="wcard" data-act="openRide" data-id="${r.id}"><div class="t"><div><h3>${esc(r.name)}</h3><div class="m">Gereden · ${clock(r.dur)} · ${r.tss} TSS${cijfer(r)!=null?` · cijfer ${nl(cijfer(r).toFixed(1))}`:''}</div></div><span class="chev">›</span></div></button>`;
  if(d.event)return `<div class="wcard"><h3>${esc(d.event)}</h3><div class="m">Evenement</div></div>`;
  if(d.wo){
    const why={tijd:'geen tijd',moe:'te moe',ziek:'ziek'}[d.why],miss=why?`Niet gedaan (${why})`:'Gemist';
    const note=d.missed?`<div class="note late">${d.movedTo!=null?miss+', verplaatst naar '+DAYS_L[d.movedTo]:d.why==='moe'?miss+'. De dagen erna zijn lichter.':miss}</div>`:d.movedFrom!=null?`<div class="note moved">Verplaatst van ${DAYS_L[d.movedFrom]}</div>`:'';
    const act=d.iso>tk?'':d.missed&&d.why?`<div class="row" style="margin-top:8px"><button class="link small" data-act="undoMissed" data-iso="${d.iso}">Toch niet: melding intrekken</button></div>`
      :d.iso===tk&&!d.missed?`<div class="row" style="margin-top:10px">${canRide()?`<button class="btn pri big" data-act="startDay" data-iso="${d.iso}" style="flex:1">Start training</button>`:''}<button class="btn big" data-act="openMissed" data-iso="${d.iso}">Lukt niet</button></div>`
      :`<div class="row" style="margin-top:8px"><button class="btn small" data-act="openMissed" data-iso="${d.iso}">Niet gedaan melden</button></div>`;
    return `<button class="wcard" data-act="openDay" data-iso="${d.iso}"><div class="t"><div><h3>${esc(d.wo.name)}</h3><div class="m">${metaOf(d.wo)}</div>${note}</div><span class="chev">›</span></div>${profileSVG(d.wo.segs)}</button>
      ${act}`;
  }
  const m=d.health&&d.health.during?`${healthWord(d.health.h).replace(/^./,c=>c.toUpperCase())} gemeld`:d.o.skip?'Overgeslagen':'';
  return `<div class="wcard"><div class="t"><div><h3>Rustdag</h3>${m?`<div class="m">${m}</div>`:''}</div><button class="btn small" data-act="openDay" data-iso="${d.iso}">Toch trainen</button></div></div>`;
}
/* waarom het schema er zo uitziet: ingeklapt onder de week */
function whyHTML(plan){
  const goal=GOALS[state.profile.goal]||GOALS.ftp,prof=plan.prof,sum=weekSum(plan),K=plan.ctx.kind;
  const phaseTxt={build:'Elke opbouwweek zit er iets meer werk in de zware blokken.',rec:'Minder en lichter, zodat het werk van de afgelopen weken kan landen.',base:'Basisfase: vooral rustige uren en lange blokken onder je drempel.',peak:'Piekfase: de zwaarste weken, gericht op precies wat je evenement vraagt.',taper:'Afbouw: korter trainen op dezelfde intensiteit, zodat je fris wordt zonder scherpte te verliezen.',event:'Alleen korte prikkels. De vorm zit er al in; nu gaat het om fris aan de start staan.'}[K];
  const C=plan.coach,availM=plan.days.reduce((a,d)=>a+(d.event?0:d.minutes),0),idealM=r5(C.weekH*60);
  const basis=C.hist==null?`Bij je FTP (${nl(C.wkg.toFixed(1))} W/kg) en ${prof===goal?'je doel':'je evenement'} past ongeveer ${durTxt(r5(C.ideal*60))} training per week.`:`De afgelopen vier weken reed je gemiddeld ${durTxt(r5(C.hist*60))} per week; het schema bouwt daar geleidelijk op voort.`;
  const ruimte=K==='event'?'':availM-sum.m>=60&&idealM-sum.m<45?` Je hebt ${durTxt(availM)} beschikbaar. Meer trainen helpt je deze week niet verder: de vrije dagen zijn nodig om te herstellen.`:idealM-sum.m>=45?` Met meer beschikbare tijd zou deze week ongeveer ${durTxt(idealM)} zijn.`:'';
  const pf=plan.ctx.toGo!=null&&state.event&&state.event.profile,PS=pf&&profileSummary(pf,state.profile.ftp,state.profile.weight||75);
  const pfTxt=PS?` Afgestemd op ${esc(pf.naam)}: ${Math.round(pf.afstand_km)} km${pf.hoogtemeters?`, ${Math.round(pf.hoogtemeters)} hoogtemeters`:''}${PS.climbs.length?`, ${PS.climbs.length} hellingen van meestal ${clock(PS.median*60)}`:''}.`:'';
  const adj=state.levelAdj?`<p class="small muted">De zware trainingen staan een stap ${state.levelAdj>0?'zwaarder':'lichter'}. <button class="link" data-act="resetAdj">Terugzetten</button></p>`:'';
  return `<details class="why"><summary>Waarom dit schema?</summary><div class="stack" style="margin-top:10px;max-width:80ch">
      <p class="small muted">${phaseTxt}</p>
      <p class="small"><b style="font-weight:600">${esc(prof===goal?'Doel: '+goal.name.replace(/^[A-Z](?=[a-z])/,c=>c.toLowerCase()):prof.name)}.</b> <span class="muted">${esc(prof.plan)}</span></p>
      <p class="small muted">${basis}${ruimte}${pfTxt}</p>${adj}</div></details>`;
}
/* de week: fase, voortgang, de dagen en je tijd per dag; met pijlen naar andere weken */
function weekCard(today){
  const tk=iso(today),mon=addDays(mondayOf(today),ui.weekOff*7),k=iso(mon),plan=planWeek(state,mon,today),sum=weekSum(plan);
  const planned=plan.days.filter(d=>d.wo),wk=state.rides.filter(r=>!r.sim&&r.date>=k&&r.date<=iso(addDays(mon,6))),doneM=Math.round(wk.reduce((a,r)=>a+r.dur,0)/60);
  const ev=state.event,evDate=ev&&ev.date?parseISO(ev.date):null,toEv=evDate?dayDiff(today,evDate):-1,sub=[esc(plan.label)];
  if(toEv>=0&&ui.weekOff===0)sub.push(`${esc(ev.name)} over ${toEv} ${toEv===1?'dag':'dagen'}`);
  else if(plan.ctx.toGo==null&&plan.ctx.kind==='build'){const ph=((((Math.floor(dayDiff(parseISO(state.planStart),mon)/7))%4)+4)%4)+1;sub.push(`herstelweek over ${4-ph} ${4-ph===1?'week':'weken'}`)}
  const rows=plan.days.map(d=>{
    const r=rideOn(d.iso),when=`<span class="when"><b>${DAYS[d.i]}</b>${d.date.getDate()} ${MONTHS[d.date.getMonth()].slice(0,3)}</span>`;
    if(d.event)return `<div class="drow">${when}${dotFor(d)}<span class="w"><b>${esc(d.event)}</b><span>Evenement</span></span><span></span><span></span></div>`;
    const st=r?`<span class="st ok">Gereden${cijfer(r)!=null?' · '+nl(cijfer(r).toFixed(1)):''}</span>`:d.missed?`<span class="st late">${d.why?'Niet gedaan':'Gemist'}</span>`:d.movedFrom!=null?`<span class="st">Van ${DAYS[d.movedFrom]}</span>`:d.wo?`<span class="st">${d.wo.tss} TSS</span>`:'<span class="st"></span>';
    return `<button class="drow${d.iso===tk?' today':''}" data-act="openDay" data-iso="${d.iso}">${when}${dotFor(d,r)}<span class="w"><b>${d.wo?esc(d.wo.name):'Rust'}</b><span>${d.wo?durTxt(d.wo.minutes):d.o.skip?'Overgeslagen':''}</span></span>${d.wo?profileSVG(d.wo.segs):'<span></span>'}${st}</button>`}).join('');
  const canEdit=ui.weekOff>=0,open=canEdit&&ui.avOpen;
  return `<div class="card wk"><div class="wkhead"><div><h2>Week ${weekNo(mon)}</h2><p class="small muted">${sub.join(' · ')}</p></div>
      <div class="wnav">${canEdit?`<button class="ibtn${open?' on':''}" data-act="avOpen" aria-pressed="${!!open}" aria-label="Tijd per dag" title="Tijd per dag">${ICO.tijd}</button>`:''}<button class="btn icon" data-act="week" data-d="-1" aria-label="Vorige week">‹</button>${ui.weekOff?'<button class="btn small" data-act="week" data-d="0">Nu</button>':''}<button class="btn icon" data-act="week" data-d="1" aria-label="Volgende week">›</button></div></div>
    <div class="prog"><i style="width:${sum.m?Math.min(100,Math.round(doneM/sum.m*100)):0}%"></i></div>
    <div class="kvl"><span><b>${Math.min(wk.length,planned.length)} van ${planned.length}</b> trainingen</span><span>${durTxt(doneM)} van ${durTxt(sum.m)}</span></div>
    ${open?`<div class="wkedit">${availEditor(k)}</div>`:''}
    <div class="wkrows">${rows}</div>
    <div class="row spread" style="margin-top:6px">${whyHTML(plan)}${canRide()?'<button class="btn small" data-act="zwoWeek">Zwift</button>':''}</div></div>`;
}
function vandaagView(){
  if(!state.setup)return setupView();
  const today=new Date(),tk=iso(today),mon=mondayOf(today),plan=planWeek(state,mon,today);
  logPlan(plan,today);
  const td=plan.days.find(d=>d.iso===tk);
  const pend=ui.pending?`<div class="notice row spread"><span>Onderbroken training: ${esc(ui.pending.wo.name)}, ${clock(ui.pending.rec.p.length)}</span><span class="row"><button class="btn small" data-act="pendSave">Opslaan</button><button class="btn small" data-act="pendDrop">Weggooien</button></span></div>`:'';
  let hide=false;try{hide=localStorage.getItem('kopwerk.synchint')==='0'}catch(e){}
  const sync=CONFIG.firebase&&syncInfo.ready&&!syncInfo.user&&!hide?`<div class="card row spread"><div><h3>Synchroniseren</h3><div class="small muted" style="margin-top:2px">Hetzelfde schema op je telefoon en laptop</div></div>
    <span class="row"><button class="btn small pri" data-act="syncLogin">Inloggen met Google</button><button class="btn small" data-act="syncHide" aria-label="Verbergen">×</button></span></div>`:'';
  const last=state.rides.filter(r=>!r.sim).sort((a,b)=>b.ts-a.ts).slice(0,3);
  const recent=last.length?`<div class="card"><h3 style="margin-bottom:4px">Recente ritten</h3><div class="list">${last.map(r=>{const d=new Date(r.ts);return `<button data-act="openRide" data-id="${r.id}"><span class="when"><b>${DAYS[dow(d)]}</b>${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</span><span class="w"><b>${esc(r.name)}</b><span>${clock(r.dur)} · ${r.tss} TSS${r.rpe?` · gevoel ${r.rpe}`:''}</span></span></button>`}).join('')}</div></div>`:'';
  return `<div class="home${recent?'':' one'}"><div class="stack">${pend}${sync}${statusCard(plan,today)}<div><div class="daylbl" style="margin-top:0">Vandaag</div>${dayCard(td,tk)}</div>${weekCard(today)}</div>
    <div class="stack">${recent}</div></div>`;
}

/* ---------- schema ---------- */
function phaseStrip(today){
  const ev=state.event;if(!ev||!ev.date||ev.date<iso(today))return '';
  const start=parseISO(state.planStart),end=mondayOf(parseISO(ev.date)),n=Math.round(dayDiff(start,end)/7)+1;
  if(n<2||n>60)return '';
  const cur=mondayOf(today),cells=[];
  for(let w=0;w<n;w++){const m=addDays(start,7*w),c=weekCtx(state,m);cells.push(`<i class="${c.kind}${iso(m)===iso(cur)?' now':''}" title="Week ${weekNo(m)}: ${c.label}"></i>`)}
  return `<div class="card"><div class="kvl"><span><b>${esc(ev.name)}</b></span><span>${parseISO(ev.date).getDate()} ${MONTHS[parseISO(ev.date).getMonth()]}</span></div>
    <div class="phase" style="margin-top:12px">${cells.join('')}</div>
    <div class="legend"><span><i style="background:var(--z2);opacity:.55"></i>Basis</span><span><i style="background:var(--z3)"></i>Opbouw</span><span><i style="background:var(--z1);opacity:.6"></i>Herstel</span><span><i style="background:var(--z5)"></i>Piek</span><span><i style="background:var(--z4)"></i>Afbouw</span></div></div>`;
}
/* ---------- een training in detail ---------- */
function segList(w){
  return `<div class="segs">${w.segs.map(s=>`<div><i style="background:var(--z${zoneOf((s.a+s.b)/2)})"></i><span>${esc(s.label)}${s.cad?` <span class="muted">op ${s.cad} rpm</span>`:''}</span><span class="muted">${clock(s.d)}</span><b>${s.a===s.b?watts(s.a):watts(s.a)+'–'+watts(s.b)} W</b></div>`).join('')}</div>`;
}
function modalWo(){
  const m=ui.detail;if(!m)return null;
  if(m.kind==='wo')return {wo:buildWorkout(m.type,m.min,m.L)};
  const d=parseISO(m.iso),plan=planWeek(state,mondayOf(d),new Date());
  const day=plan.days.find(x=>x.iso===m.iso);
  return {wo:day.wo,day};
}
function trainingView(){
  const x=modalWo();if(!x){ui.view='vandaag';return vandaagView()}
  const {wo:w,day}=x,from=TABS.find(t=>t[0]===((ui.detail&&ui.detail.from)||'vandaag'));
  const back=`<button class="back" data-act="back">‹ ${from?from[1]:'Terug'}</button>`;
  const title=day?dateLong(day.date).replace(/^./,c=>c.toUpperCase()):'Losse training';
  let adjust='';
  if(day){
    const types=[['','Automatisch']].concat(Object.entries(TYPES).filter(([k])=>k!=='ramptest').map(([k,t])=>[k,t.name]));
    adjust=`<div class="card stack"><h3>Aanpassen</h3>
      <div class="form"><div><label class="f" for="m-type">Soort training</label>${sel('id="m-type" data-chg="ovType"',w?types:[['','Rust']].concat(types.slice(1)),day.o.type||'')}</div></div></div>`;
  }
  if(!w)return `${back}<div class="head"><div><h1>Rustdag</h1><p>${title}</p></div></div>
    <div class="detail">${adjust}</div>`;
  const why=whyOn(day?day.date:new Date(),w.type),T=w.sec;
  const ticks=[0,.25,.5,.75,1].map(f=>`<span>${clock(f*T)}</span>`).join('');
  const zs=[...new Set(w.segs.filter(s=>s.kind==='work'||s.kind==='steady').map(s=>zoneOf((s.a+s.b)/2)))].sort();
  return `${back}<div class="head"><div><h1>${esc(w.name)}</h1><p>${title}</p></div></div>
    <div class="detail"><div class="stack">
      <div class="card">${profileSVG(w.segs)}<div class="axis">${ticks}</div></div>
      <div class="kv"><div><b>${durTxt(w.minutes)}</b><span>duur</span></div><div><b>${w.tss}</b><span>TSS</span></div><div><b>${nl(w.IF.toFixed(2))}</b><span>intensiteit</span></div><div><b>${w.lvl?w.lvl+'/'+w.lvlMax:'–'}</b><span>trede</span></div></div>
      <div class="card stack"><p>${esc(w.desc)}</p>${why?`<details class="why"><summary>Waarom deze training?</summary><p class="small muted" style="margin-top:8px">${esc(why)}</p></details>`:''}<div class="row">${zs.map(z=>`<span class="zchip"><i style="background:var(--z${z})"></i>${ZN[z]}</span>`).join('')}</div></div>
    </div><div class="stack">
      ${canRide()?`<div class="cta"><button class="btn pri big" data-act="startModal">Start training</button><button class="btn" data-act="zwoModal">Zwift</button></div>`:''}
      <div class="card"><h3 style="margin-bottom:4px">Blokken</h3>${segList(w)}</div>
      ${adjust}</div></div>`;
}

/* ---------- trainingen ---------- */
function libView(){
  const l=ui.lib;
  const cards=Object.keys(TYPES).map(k=>{const w=buildWorkout(k,l.min,l.L);
    return `<button class="wcard" data-act="openWo" data-type="${k}"><h3>${esc(w.name)}</h3><div class="m">${durTxt(w.minutes)} · ${w.tss} TSS</div>${profileSVG(w.segs)}</button>`}).join('');
  return `<div class="head"><div><h1>Trainingen</h1></div>
    <div class="row">${canRide()?'<button class="btn pri" data-act="demo">Bekijk de demo</button>':''}<label class="small muted">Duur ${sel('data-chg="libMin"',[30,45,60,75,90,120].map(m=>[m,durTxt(m)]),l.min)}</label>
    <label class="small muted">Zwaarte ${sel('data-chg="libL"',[[0,'Licht'],[1,'Normaal'],[2,'Zwaar']],l.L)}</label></div></div>
    <div class="grid">${cards}</div>`;
}

/* ---------- ritten ---------- */
/* Vooruitgang: je FTP door de weken, wat je ritten erover zeggen, en je trede per soort training. */
function progressCard(){
  const real=state.rides.filter(r=>!r.sim);if(!real.length)return '';
  const today=new Date(),mon=mondayOf(today),first=mondayOf(parseISO(real.reduce((a,r)=>r.date<a?r.date:a,real[0].date)));
  const NW=Math.min(26,Math.max(6,Math.round(dayDiff(first,mon)/7)+1)),log=(state.ftpLog||[]).slice().sort((a,b)=>a.d<b.d?-1:1),pts=[];
  for(let w=NW-1;w>=0;w--){const m=addDays(mon,-7*w),e=iso(addDays(m,6));
    /* ingestelde FTP aan het eind van die week; schatting uit je beste 20 minuten of een FTP-test in de zes weken ervoor */
    let f=null,fd='';for(const r of real)if(r.date<=e&&r.date>=fd&&r.ftp){f=r.ftp;fd=r.date}for(const x of log)if(x.d<=e&&x.d>=fd){f=x.w;fd=x.d}
    if(w===0)f=state.profile.ftp;
    const s0=iso(addDays(m,-35));let est=0;for(const r of real)if(r.date>=s0&&r.date<=e)est=Math.max(est,ftpEstimate(r));
    /* een schatting ver onder je FTP zegt alleen dat je niet voluit reed; die laten we weg */
    pts.push({m,f,est:est&&(!f||est>=f*.95)?est:null})}
  const vals=pts.flatMap(p=>[p.f,p.est]).filter(v=>v),lo=Math.min(...vals)*.85,hi=Math.max(...vals)*1.06,y=v=>200-(v-lo)/(hi-lo)*200,N=pts.length;
  const line=k=>{let d='',pen=false;pts.forEach((p,i)=>{const v=p[k];if(!v){pen=false;return}const X=(i/(N-1)*1000).toFixed(1);d+=k==='f'&&pen?`H${X}V${y(v).toFixed(1)}`:`${pen?'L':'M'}${X},${y(v).toFixed(1)}`;pen=true});return d};
  const tk=[0,.5,1].map(q=>{const m=pts[Math.round(q*(N-1))].m;return `<span class="xl${q===0?' first':q===1?' last':''}" style="left:${q*100}%">${m.getDate()} ${MONTHS[m.getMonth()].slice(0,3)}</span>`}).join('');
  const kg=state.profile.weight||75,now=state.profile.ftp,back=pts[Math.max(0,N-7)].f,est=pts[N-1].est;
  const diff=back&&N>=7?now-back:null,wkg=now/kg;
  /* trede per soort training: stijgt als je een training goed afrondt */
  const seen=new Set(),lv=Object.entries(state.prog||{}).filter(([t,v])=>LADDER[t]&&v).map(([t,v])=>({l:LADDER[t].label,v,n:LADDER[t].steps.length})).sort((a,b)=>b.v/b.n-a.v/a.n).filter(x=>!seen.has(x.l)&&seen.add(x.l));
  const lvHTML=lv.length?`<div class="card"><h3 style="margin-bottom:12px">Niveau per training</h3><div class="stack" style="gap:10px">${lv.map(x=>`<div><div class="kvl"><span>${x.l}</span><span><b>${Math.floor(x.v)}</b> van ${x.n}</span></div><div class="prog" style="margin:6px 0 0"><i style="width:${Math.round(x.v/x.n*100)}%"></i></div></div>`).join('')}</div></div>`:'';
  const ftpCard=`<div class="card"><div class="bignum"><span>FTP</span><b>${now}<i>W</i></b><small>${nl(wkg.toFixed(1))} W/kg · ${levelOf(wkg)}${diff?` · <em class="${diff>0?'up':'down'}">${diff>0?'+':''}${diff} W</em> in zes weken`:''}</small></div>
    <div class="chart" style="height:120px;margin-top:14px"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label="Je FTP door de weken">
      <path d="${line('est')}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>
      <path d="${line('f')}" fill="none" stroke="var(--acc)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>${tk}</div>
    <div class="legend"><span><i style="background:var(--acc)"></i>Ingesteld</span>${pts.some(p=>p.est)?`<span><i class="dash"></i>Geschat uit je ritten${est?` (nu ${est} W)`:''}</span>`:''}</div></div>`;
  return {ftpCard,lvHTML};
}
function recordsCard(sel,pl){
  const all=records(state.rides),recent=records(sel||state.rides.filter(r=>r.date>=iso(addDays(new Date(),-42))));pl=pl||'6 weken';
  const ds=BESTS.filter(([w])=>all[w]);
  if(!ds.length)return '';
  const kg=state.profile.weight||75,max=Math.max(...ds.map(([w])=>all[w].w))*1.08,N=BESTS.length;
  const x=i=>(i/(N-1)*1000),y=v=>200-v/max*200;
  const line=src=>{let d='',pen=false;BESTS.forEach(([w],i)=>{if(!src[w]){return}d+=`${pen?'L':'M'}${x(i).toFixed(1)},${y(src[w].w).toFixed(1)}`;pen=true});return d};
  const lbl=BESTS.map(([w,t],i)=>`${(i%2===0&&i<N-2)||i===N-1?`<span class="xl${i===0?' first':i===N-1?' last':''}" style="left:${i/(N-1)*100}%">${t}</span>`:''}`).join('');
  return `<div class="card"><h3 style="margin-bottom:10px">Vermogenscurve en records</h3><div class="cols">
    <div><div class="chart" style="height:200px"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label="Je beste vermogen per duur">
      <path d="${line(all)}" fill="none" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <path d="${line(recent)}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/></svg>${lbl}</div>
      <div class="legend"><span><i style="background:var(--ink)"></i>Beste ooit</span><span><i style="background:var(--acc)"></i>${pl.replace(/^./,c=>c.toUpperCase())}</span></div></div>
    <div class="scroll"><table><thead><tr><th>Duur</th><th>Record</th><th>W/kg</th><th>${pl.replace(/^./,c=>c.toUpperCase())}</th><th>Op</th></tr></thead><tbody>
      ${ds.map(([w,t])=>{const d=parseISO(all[w].date);return `<tr><td>${t}</td><td><b style="font-weight:600">${all[w].w} W</b></td><td>${nl((all[w].w/kg).toFixed(1))}</td><td>${recent[w]?recent[w].w+' W':'–'}</td><td><button class="link" data-act="openRide" data-id="${all[w].id}">${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</button></td></tr>`}).join('')}
    </tbody></table></div></div></div>`;
}
function addModal(){
  const t=iso(new Date());
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Buitenrit toevoegen">
    <div class="row spread"><h2>Buitenrit toevoegen</h2><button class="btn small" data-act="closeModal">Sluiten</button></div>
    <div class="stack" style="padding-bottom:18px;border-bottom:1px solid var(--line)"><h3>Bestand van je fietscomputer</h3>
      <div><label class="btn pri" style="cursor:pointer;display:inline-block">Kies .fit of .tcx<input type="file" accept=".fit,.tcx" data-chg="importRide" style="position:absolute;opacity:0;width:1px;height:1px"></label></div></div>
    <div class="stack"><h3>Of vul de rit zelf in</h3>
      <div class="form">
        <div><label class="f" for="a-date">Datum</label><input type="date" id="a-date" value="${t}" max="${t}"></div>
        <div><label class="f" for="a-min">Duur in minuten</label><input type="number" id="a-min" min="10" max="900" value="90" style="width:120px"></div>
        <div><label class="f" for="a-eff">Zwaarte</label>${sel('id="a-eff"',EFFORT.map((e,i)=>[i,e[1]]),1)}</div>
        <div><label class="f" for="a-pw">Gemiddeld vermogen</label><input type="number" id="a-pw" min="0" max="600" placeholder="optioneel" style="width:120px"></div>
      </div>
      <div><button class="btn pri" data-act="saveManual">Rit toevoegen</button></div></div>
  </div></div>`;
}
/* ---------- een gereden rit ----------
   Bovenaan wat ertoe doet: je cijfer met de uitleg van de coach en vier kerngetallen.
   Daaronder het verloop en je zones; de rest (per blok, alle inspanningen, hartslagzones) zit in de diepgaande analyse. */
function rideView(){
  const r=state.rides.find(x=>x.id===ui.rideId);
  if(!r){ui.view='kalender';return kalenderView()}
  const d=new Date(r.ts),rec=ui.streams&&ui.streams.id===r.id?ui.streams.rec:null,kg=state.profile.weight||75,outdoor=r.type==='buiten';
  const v=verdict(r,state.profile.ftp),est=ftpEstimate(r),c=cijfer(r);
  const ftpBtn=est&&Math.abs(est-state.profile.ftp)>=2&&(r.type==='ramptest'||est>state.profile.ftp*1.02)?`<button class="btn pri" data-act="setFtp" data-w="${est}">FTP bijwerken naar ${est} W</button>`:'';
  /* cijfer (of bij een FTP-test de uitkomst) met wat de coach ervan vindt */
  const mark=r.type==='ramptest'&&est?`<div class="grade"><b>${est}</b><span>W FTP</span></div>`:c!=null?`<div class="grade ${c>=7.5?'hi':c>=5.5?'mid':'lo'}"><b>${nl(c.toFixed(1))}</b><span>cijfer</span></div>`:'';
  const hero=v.length||mark?`<div class="card hero">${mark}<div class="herotxt"><p>${esc(v[0]||'')}</p>${v.slice(1).map(t=>`<p class="small muted">${esc(t)}</p>`).join('')}${ftpBtn?`<div style="margin-top:12px">${ftpBtn}</div>`:''}</div></div>`:'';
  const keys=`<div class="keys">
      <div><span>Duur</span><b>${clock(r.dur)}</b>${r.dist?`<small>${nl((r.dist/1000).toFixed(1))} km</small>`:!outdoor&&r.planned&&Math.abs(r.planned-r.dur)>30?`<small>van ${clock(r.planned)}</small>`:''}</div>
      <div><span>Gemiddeld</span><b>${r.avgP||'–'}<i>W</i></b>${r.np?`<small>genormaliseerd ${r.np} W</small>`:''}</div>
      <div><span>Hartslag</span><b>${r.avgHr||'–'}<i>${r.avgHr?'bpm':''}</i></b>${r.maxHr?`<small>max ${r.maxHr}</small>`:''}</div>
      <div><span>Belasting</span><b>${r.tss}<i>TSS</i></b></div></div>`;
  /* gevoel: eerst de vraag; na je antwoord een korte regel die je kunt aanpassen */
  const scale=`<div class="rpe">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-act="rpe" data-n="${n}" aria-pressed="${r.rpe===n}" aria-label="${n} van 10">${n}</button>`).join('')}</div><div class="rpel"><span>Moeiteloos</span><span>Alles gegeven</span></div>`;
  const rpe=r.sim?'':r.rpe==null?`<div class="card stack"><h3>Hoe zwaar voelde deze training?</h3>${scale}</div>`
    :`<div class="card"><div class="row spread"><span>Gevoel <b>${r.rpe}</b> van 10</span><button class="link small" data-act="rpeEdit">${ui.rpeEdit?'Klaar':'Aanpassen'}</button></div>${ui.rpeEdit?`<div class="stack" style="margin-top:12px">${scale}</div>`:''}</div>`;
  const prs=r.prs&&r.prs.length?`<div class="card prs"><h3>Nieuw record</h3>${r.prs.map(x=>`<div class="kvl"><span>${x.t}</span><span><b>${x.w} W</b> · was ${x.old} W</span></div>`).join('')}</div>`:'';
  /* tijd per zone als één balk */
  const zs=r.zones||[],tot=zs.reduce((a,b)=>a+b,0);
  const zones=tot?`<div class="card"><h3 style="margin-bottom:12px">Tijd per zone</h3><div class="zstack">${zs.map((s,i)=>s?`<i style="flex:${s};background:var(--z${i+1})" title="${ZN[i+1]}"></i>`:'').join('')}</div>
      <div class="zonelist">${zs.map((s,i)=>s/tot>=.005?`<div><i style="background:var(--z${i+1})"></i><span>${ZN[i+1]}</span><b>${clock(s)}</b><em>${Math.round(s/tot*100)}%</em></div>`:'').join('')}</div></div>`:'';
  const chart=r.manual?'':`<div class="card"><h3 style="margin-bottom:10px">Verloop</h3>${rec?rideChart(r,rec):'<p class="muted">Geen meetgegevens op dit apparaat.</p>'}</div>`;
  /* diepgaande analyse */
  let deep='';
  if(ui.deep){
    const prd=new Set((r.prs||[]).map(x=>x.d));
    const more=`<div class="keys">
        <div><span>Genormaliseerd</span><b>${r.np||'–'}<i>W</i></b>${r.np?`<small>${nl((r.np/kg).toFixed(1))} W/kg</small>`:''}</div>
        <div><span>Intensiteit</span><b>${nl(r.IF.toFixed(2))}</b><small>van je FTP</small></div>
        <div><span>Arbeid</span><b>${r.kj}<i>kJ</i></b></div>
        <div><span>Cadans</span><b>${r.avgCad||'–'}<i>${r.avgCad?'rpm':''}</i></b></div></div>`;
    const best=BESTS.filter(([w])=>r.best[w]).map(([w,t])=>`<tr><td>${t}${prd.has(w)?' <span class="badge" style="background:var(--z5);color:#fff">Record</span>':''}</td><td>${r.best[w]} W</td><td>${nl((r.best[w]/kg).toFixed(1))} W/kg</td><td>${Math.round(r.best[w]/r.ftp*100)}%</td></tr>`).join('');
    let hz='';
    if(rec&&r.avgHr){const mh=state.profile.maxHr;
      if(mh){const z=hrZones(rec.hr,mh),ht=z.reduce((a,b)=>a+b,0)||1;
        hz=`<div class="card"><h3 style="margin-bottom:10px">Tijd per hartslagzone</h3>${z.map((s,i)=>`<div class="zrow"><span>${HZN[i]}</span><span class="bar"><i style="width:${s/ht*100}%;background:var(--z${[1,2,3,5,6][i]})"></i></span><span>${clock(s)} &nbsp;${Math.round(s/ht*100)}%</span></div>`).join('')}
          ${r.maxHr>mh?`<p class="small muted" style="margin-top:10px">${r.maxHr} bpm gehaald, boven je maximum van ${mh}. Pas het aan bij Profiel.</p>`:''}</div>`}
      else hz=`<div class="card"><h3 style="margin-bottom:8px">Tijd per hartslagzone</h3><p class="muted">Vul je maximale hartslag in bij Profiel.</p></div>`}
    let laps='';
    if(rec){const ls=outdoor?[]:lapStats(rec,r.laps).filter(l=>l.d>=10),rows=ls.length>40?ls.filter(l=>l.kind!=='rest'):ls;
      /* per blok: wat je reed tegenover het doel; afwijkingen van meer dan 6% in rood */
      if(rows.length)laps=`<div class="card"><h3 style="margin-bottom:6px">Per blok</h3><div class="laps">
        ${rows.map(l=>{const dv=Math.abs(l.dev)<.05?'0,0%':(l.dev>0?'+':'−')+nl(Math.abs(l.dev).toFixed(1))+'%';
          return `<div class="lap${l.kind==='work'?' work':''}"><i style="background:var(--z${zoneOf(l.t/r.ftp)})"></i><span class="ln"><b>${esc(l.label)}</b><small>${clock(l.d)} · doel ${l.t} W${l.hr?' · '+l.hr+' bpm':''}${l.cad?' · '+l.cad+' rpm':''}</small></span><span class="lv"><b>${l.p} W</b><small class="${Math.abs(l.dev)>6?'bad':''}">${dv}</small></span></div>`}).join('')}
        </div></div>`}
    deep=`<div class="stack">${more}${laps}<div class="cols"><div class="card"><h3 style="margin-bottom:8px">Beste inspanningen</h3><table><tbody>${best||'<tr><td class="muted">Geen vermogensgegevens.</td></tr>'}</tbody></table></div>${hz||'<div></div>'}</div>
      ${rec?'<div><button class="btn" data-act="csv">Download meetgegevens</button></div>':''}</div>`;
  }
  const from=TABS.find(t=>t[0]===tabOf('ride'))||TABS[1];
  return `<button class="back" data-act="nav" data-v="${from[0]}">‹ ${from[1]}</button>
    <div class="head"><div><h1>${esc(r.name)}${r.sim?' <span class="badge" style="vertical-align:middle">Demo</span>':''}</h1><p>${dateLong(d)} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}</p></div></div>
    <div class="stack">${r.perf&&/[?&]meet/.test(location.search)?`<div class="card"><h3 style="margin-bottom:6px">Meting 3D-wereld</h3><p><b>${r.perf.fps}</b> beelden per seconde · ${r.perf.big} haperingen · ${r.perf.small} gemiste beelden</p>${r.perf.list.length?`<p class="small muted" style="margin-top:6px">Grootste haperingen: ${r.perf.list.map(x=>`${clock(x.t)} (${x.ms} ms${x.b?', bijbouwen':''})`).join(', ')}</p>`:''}</div>`:''}${hero}${keys}${r.rpe==null?rpe:''}${prs}${chart}${zones}
      <button class="btn deepbtn" data-act="deep" aria-expanded="${!!ui.deep}">Diepgaande analyse<span aria-hidden="true">${ui.deep?'▴':'▾'}</span></button>
      ${deep}${r.rpe!=null?rpe:''}
      <div><button class="btn warn" data-act="delRide">${ui.confirm==='ride'?'Klik nog eens om te verwijderen':'Rit verwijderen'}</button></div></div>`;
}

/* ---------- profiel ---------- */
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return ''}};
/* wat de coach over het evenement heeft gevonden; alle tekst komt van internet en wordt dus ge-escaped */
function profileCard(){
  const ev=state.event,p=ev&&ev.profile;if(!p)return '';
  const S=profileSummary(p,state.profile.ftp,state.profile.weight||75),at=p.at?parseISO(p.at):null;
  const rows=S.climbs.slice(0,15).map(c=>`<tr><td>${esc(c.naam)}</td><td>${nl((+c.lengte_km).toFixed(1))} km</td><td>${nl((+c.gemiddeld_pct).toFixed(1))}%${c.max_pct?` <span class="muted">max ${Math.round(c.max_pct)}%</span>`:''}</td><td>${clock(c.min*60)}</td><td>${c.watt} W</td></tr>`).join('');
  const src=(p.bronnen||[]).filter(u=>/^https?:\/\//.test(u)).slice(0,4).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(u))}</a>`).join(', ');
  return `<div class="card stack"><div class="row spread"><div><h2>${esc(p.naam)}</h2>
      <p class="muted small" style="margin-top:4px">${Math.round(p.afstand_km)} km${p.hoogtemeters?` · ${Math.round(p.hoogtemeters)} hoogtemeters`:''} · ${S.climbs.length} ${S.climbs.length===1?'helling':'hellingen'}${at?` · onderzocht op ${at.getDate()} ${MONTHS[at.getMonth()]}`:''}${p.zekerheid!=='hoog'?` · zekerheid ${esc(p.zekerheid)}`:''}</p></div>
      <button class="btn small" data-act="aiResearch"${ui.aiBusy?' disabled':''}>Opnieuw onderzoeken</button></div>
    <p style="max-width:70ch">${esc(p.kenmerken)}</p>
    ${rows?`<div class="scroll"><table><thead><tr><th>Helling</th><th>Lengte</th><th>Stijging</th><th>Jouw tijd</th><th>Richtvermogen</th></tr></thead><tbody>${rows}</tbody></table></div>${S.climbs.length>15?`<p class="small muted">En nog ${S.climbs.length-15} hellingen.</p>`:''}`:''}
    ${src?`<p class="small muted">Bronnen: ${src}</p>`:''}</div>`;
}
function aiCard(){
  const k=aiKey();
  return `<div class="card stack"><div><h2>AI-coach</h2><p class="small muted" style="margin-top:4px">Claude-sleutel om je evenement te onderzoeken. Blijft op dit apparaat.</p></div>
    <div class="row"><input type="password" id="ai-key" autocomplete="off" spellcheck="false" placeholder="${k?'Ingesteld, eindigt op '+esc(k.slice(-4)):'sk-ant-...'}" style="flex:1;min-width:200px;max-width:420px">
    <button class="btn" data-act="aiSaveKey">Opslaan</button>${k?'<button class="btn warn" data-act="aiDelKey">Wissen</button>':''}</div></div>`;
}
function linkCard(){
  if(!CONFIG.firebase&&!stravaReady())return '';
  const u=syncInfo.user,s=state.strava;
  const sync=!CONFIG.firebase?'':u?`<div class="li"><span class="w"><b>Synchronisatie aan</b><span>${esc(u.email)}${syncInfo.err?' · '+syncInfo.err:syncInfo.at?' · bijgewerkt om '+pad(new Date(syncInfo.at).getHours())+':'+pad(new Date(syncInfo.at).getMinutes()):''}</span></span><button class="btn small" data-act="syncLogout">Uitloggen</button></div>`
    :`<div class="li"><span class="w"><b>Synchronisatie</b><span>Je schema en ritten op al je apparaten.</span></span><button class="btn small" data-act="syncLogin">Inloggen met Google</button></div>`;
  const str=!stravaReady()?'':s?`<div class="li"><span class="w"><b>Strava gekoppeld${s.name?' · '+esc(s.name):''}</b><span>${s.checked?'Bijgewerkt om '+pad(new Date(s.checked).getHours())+':'+pad(new Date(s.checked).getMinutes()):'Ritten komen vanzelf binnen'}</span></span><span class="row"><button class="btn small" data-act="stravaFetch">Nu ophalen</button><button class="btn small warn" data-act="stravaOff">Ontkoppelen</button></span></div>`
    :`<div class="li"><span class="w"><b>Strava</b><span>Buitenritten vanzelf binnenhalen.</span></span><button class="btn small" data-act="stravaConnect">Koppel Strava</button></div>`;
  return `<div class="card"><h2 style="margin-bottom:6px">Koppelingen</h2><div class="list">${sync}${str}</div></div>`;
}
function profielView(){
  if(!state.setup)return setupView();
  return `<div class="head"><div><h1>Profiel</h1></div></div>
    <div class="stack">${settingsForm(false)}
    <div class="card stack"><h2>Weergave</h2><div class="form"><div><label class="f" for="s-theme">Licht of donker</label>${sel('id="s-theme" data-chg="theme"',[['auto','Zoals je apparaat'],['light','Licht'],['dark','Donker']],getTheme())}</div></div></div>
    ${profileCard()}${linkCard()}${aiCard()}
    <div class="card stack"><h2>Je gegevens</h2>
      <div class="row"><button class="btn" data-act="backup">Back-up downloaden</button><label class="btn" style="cursor:pointer">Back-up terugzetten<input type="file" accept=".json,application/json" data-chg="restore" style="position:absolute;opacity:0;width:1px;height:1px"></label>
      <button class="btn warn" data-act="wipe">${ui.confirm==='wipe'?'Klik nog eens om alles te wissen':'Alles wissen'}</button></div></div></div>`;
}

/* ---------- vensters ---------- */
/* training niet gedaan: waarom? */
function missedModal(){
  const d=parseISO(ui.modal.iso),tk=iso(new Date());
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Training niet gedaan">
    <div><p class="muted">${dateLong(d).replace(/^./,c=>c.toUpperCase())}</p><h2>${ui.modal.iso===tk?'Lukt het vandaag niet?':'Training niet gedaan'}</h2></div>
    <div class="stack"><button class="btn big" data-act="missedWhy" data-why="tijd">Geen tijd</button><button class="btn big" data-act="missedWhy" data-why="moe">Te moe</button><button class="btn big" data-act="missedWhy" data-why="ziek">Ziek of geblesseerd</button></div>
    <div><button class="btn" data-act="closeModal">Annuleren</button></div></div></div>`;
}
/* ziek of geblesseerd melden of aanpassen */
function healthModal(){
  const H=state.health,cur=(H&&H.kind)||'ziekL',from=(H&&H.from)||ui.modal.from||iso(new Date());
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Ziek of geblesseerd">
    <h2>Ziek of geblesseerd</h2>
    <div class="stack">${Object.entries(HEALTH).map(([k,h])=>`<label class="row" style="gap:10px;align-items:center"><input type="radio" name="hk" value="${k}"${k===cur?' checked':''}><span>${h.label}<span class="small muted"> · ${h.cap?'alleen kort en rustig':'niet trainen'}</span></span></label>`).join('')}</div>
    <div><label class="f" for="h-from">Sinds</label><input type="date" id="h-from" value="${from}" max="${iso(new Date())}"></div>
    <div class="row spread"><div class="row"><button class="btn pri" data-act="saveHealth">Opslaan</button>${H?'<button class="btn" data-act="healthDrop">Melding intrekken</button>':''}</div><button class="btn" data-act="closeModal">Annuleren</button></div></div></div>`;
}
function modalHTML(){
  if(ui.modal&&ui.modal.kind==='missed')return missedModal();
  if(ui.modal&&ui.modal.kind==='health')return healthModal();
  if(ui.modal&&ui.modal.kind==='add')return addModal();
  return '';
}

function render(){
  const app=document.getElementById('app');
  if(P){renderPlayer();document.getElementById('modal').innerHTML='';return}
  if(W)worldClose();
  const views={vandaag:vandaagView,kalender:kalenderView,schema:kalenderView,ritten:kalenderView,prestaties:prestatiesView,voortgang:voortgangView,analyse:voortgangView,ride:rideView,lib:libView,profiel:profielView,settings:profielView,training:trainingView};
  const v=views[ui.view]||vandaagView,fe=document.activeElement,fid=fe&&fe.id&&/^(INPUT|SELECT|TEXTAREA)$/.test(fe.tagName)?fe.id:'';
  app.innerHTML=shell(v());
  if(fid){const el=document.getElementById(fid);if(el)el.focus({preventScroll:true})}
  /* wat je in het formulier had getypt, blijft staan als het scherm opnieuw wordt opgebouwd */
  if(ui.draft){for(const [id,val] of Object.entries(ui.draft)){const el=document.getElementById(id);if(el)el.value=val}
    const ev=document.querySelector('.evbox');if(ev&&Object.keys(ui.draft).some(k=>/^s-ev/.test(k)))ev.open=true}
  document.getElementById('modal').innerHTML=modalHTML();
  initWheels();
  if(ui.view==='ride')bindChart();
}
async function openRide(id){
  if(ui.view!=='ride')ui.rideFrom=tabOf(ui.view);
  if(ui.rideId!==id){ui.deep=false;ui.rpeEdit=false}
  ui.view='ride';ui.rideId=id;ui.confirm='';
  if(!ui.streams||ui.streams.id!==id){ui.streams=null;render();const rec=await idb.get('s:'+id)||await syncGetStream(id);if(rec&&ui.rideId===id){ui.streams={id,rec};render()}}
  else render();
  window.scrollTo(0,0);
}
