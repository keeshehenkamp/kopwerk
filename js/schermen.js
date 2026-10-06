'use strict';
/* ================= views ================= */
const MINS=[0,30,45,60,75,90,120,150,180,240];
const sel=(attrs,opts,val)=>`<select ${attrs}>${opts.map(([v,t])=>`<option value="${v}"${String(v)===String(val)?' selected':''}>${t}</option>`).join('')}</select>`;
const watts=f=>Math.round(f*state.profile.ftp);
const rideOn=k=>{const l=state.rides.filter(r=>r.date===k);return l.length?l[l.length-1]:null};
const weekSum=p=>{let m=0,t=0;for(const d of p.days)if(d.wo){m+=d.wo.minutes;t+=d.wo.tss}return{m,t}};
const logo='<svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true"><rect x="0" y="12" width="5" height="8" rx="1" fill="var(--z2)"/><rect x="7" y="7" width="5" height="13" rx="1" fill="var(--z3)"/><rect x="14" y="0" width="5" height="20" rx="1" fill="var(--z5)"/><rect x="21" y="9" width="5" height="11" rx="1" fill="var(--z1)"/></svg>';

function shell(body){
  const tabs=[['schema','Schema'],['lib','Trainingen'],['analyse','Analyse'],['settings','Instellingen']];
  const cur=ui.view==='ride'?'analyse':ui.view;
  return `<header class="top"><div class="brand">${logo}Kopwerk</div>
    <nav class="nav" aria-label="Hoofdmenu">${tabs.map(([k,t])=>`<button data-act="nav" data-v="${k}"${cur===k?' aria-current="page"':''}>${t}</button>`).join('')}</nav>
    <div class="ftp">FTP <b>${state.profile.ftp}</b> W</div></header>
    <main class="stack">${ui.saveFail?'<p class="notice small">Opslaan lukt niet in deze browser. Je gegevens blijven staan tot je de pagina sluit; maak een back-up via Instellingen.</p>':''}${body}</main>`;
}

function settingsForm(first){
  const p=state.profile;
  return `<div class="card stack">
    <div><h2>${first?'Stel je schema in':'Jouw gegevens'}</h2>${first?'<p class="muted" style="margin-top:6px;max-width:60ch">Vul in wanneer je kunt fietsen en wat je wilt bereiken. Het schema wordt daaromheen gebouwd en je kunt alles later aanpassen.</p>':''}</div>
    <div class="form">
      <div><label class="f" for="s-ftp">FTP in watt</label><input type="number" id="s-ftp" min="60" max="600" value="${p.ftp}" style="width:120px"></div>
      <div><label class="f" for="s-w">Gewicht in kg</label><input type="number" id="s-w" min="35" max="200" value="${p.weight}" style="width:120px"></div>
      <div><label class="f" for="s-goal">Doel</label>${sel('id="s-goal"',Object.entries(GOALS).map(([k,g])=>[k,g.name]),p.goal)}</div>
      <div><label class="f" for="s-snd">Geluid bij blokwissel</label>${sel('id="s-snd"',[[1,'Aan'],[0,'Uit']],p.sound?1:0)}</div>
      <div><label class="f" for="s-mhr">Maximale hartslag (optioneel)</label><input type="number" id="s-mhr" min="120" max="230" value="${p.maxHr||''}" placeholder="bijv. 185" style="width:120px"></div>
    </div>
    <div class="form">
      <div><label class="f" for="s-evn">Evenement waar je naartoe traint (optioneel)</label><input type="text" id="s-evn" maxlength="40" value="${esc(state.event?state.event.name:'')}" placeholder="bijv. Amstel Gold Race" style="width:100%;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:8px 10px"></div>
      <div><label class="f" for="s-evd">Datum van het evenement</label><input type="date" id="s-evd" value="${state.event?state.event.date:''}" style="border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:7px 10px"></div>
    </div>
    <p class="small muted" style="max-width:66ch">Met een datum bouwt het schema ernaartoe: eerst basis, dan opbouw, twee piekweken, een afbouwweek en een rustige week van het evenement zelf. Zonder datum loopt het schema door in blokken van drie opbouwweken en een herstelweek.</p>
    <p class="small muted" style="max-width:66ch">Je FTP is het vermogen dat je ongeveer een uur kunt volhouden; alle trainingen worden daarvan afgeleid. Weet je het niet, begin dan met 200 W en rijd de FTP-test onder Trainingen.</p>
    <div><label class="f">${first?'Beschikbare tijd per dag in een gewone week':'Je standaardweek: beschikbare tijd per dag'}</label>
      <div class="avail">${DAYS.map((d,i)=>`<div><div class="small" style="font-weight:600;margin-bottom:4px">${d}</div>${sel(`id="s-a${i}" aria-label="${DAYS_L[i]}"`,MINS.map(m=>[m,m?durTxt(m):'Rust']),state.avail[i])}</div>`).join('')}</div></div>
    <p class="small muted" style="max-width:66ch">Dit is je uitgangspunt. In het schema vul je per week in wanneer je echt kunt.</p>
    <div><button class="btn pri big" data-act="saveSettings">${first?'Maak mijn schema':'Wijzigingen opslaan'}</button></div>
  </div>`;
}

function schemaView(){
  if(!state.setup)return settingsForm(true);
  const today=new Date(),tk=iso(today),mon=addDays(mondayOf(today),ui.weekOff*7),plan=planWeek(state,mon,today),sum=weekSum(plan);
  const planCard=(m,title,text)=>{const pw=planWeek(state,m,today);return `<div class="card stack" style="border-color:var(--ink)">
      <div><h2>${title}</h2><p class="muted" style="margin-top:6px;max-width:62ch">${text}</p></div>
      <div class="avail">${pw.days.map(d=>`<div><div class="small" style="margin-bottom:4px"><b style="font-weight:600">${DAYS[d.i]}</b> <span class="muted">${d.date.getDate()} ${MONTHS[d.date.getMonth()].slice(0,3)}</span></div>${sel(`id="n-a${d.i}" aria-label="${DAYS_L[d.i]}"`,MINS.map(v=>[v,v?durTxt(v):'Rust']),d.base)}</div>`).join('')}</div>
      <div><button class="btn pri big" data-act="saveWeek" data-mon="${iso(m)}" data-p="n">Trainingen klaarzetten</button></div></div>`};
  const nextMon=addDays(mondayOf(today),7);
  let prep='';
  if(ui.weekOff===0&&dow(today)===6&&!state.weeks[iso(nextMon)])prep=planCard(nextMon,`Het is zondag: zet week ${weekNo(nextMon)} klaar`,'Vul in wanneer je komende week kunt fietsen. De trainingen worden daarna ingedeeld op je doel en op de tijd die je per dag hebt.');
  else if(ui.weekOff>=0&&!plan.custom)prep=planCard(mon,`Zet week ${weekNo(mon)} klaar`,'Voor deze week heb je nog geen beschikbaarheid ingevuld. Vul in wanneer je kunt fietsen; de trainingen worden daarna ingedeeld op je doel en op de tijd die je per dag hebt.');
  const goal=GOALS[state.profile.goal]||GOALS.ftp;
  let hero='';
  if(ui.weekOff===0){
    const d=plan.days.find(x=>x.iso===tk),r=rideOn(tk);
    if(r)hero=`<div class="card row spread"><div><p class="muted">Vandaag, ${dateLong(today)}</p><h1 style="margin-top:6px">${esc(r.name)} gereden</h1></div><button class="btn pri big" data-act="openRide" data-id="${r.id}">Bekijk de analyse</button></div>`;
    else if(d&&d.event)hero=`<div class="card"><p class="muted">Vandaag, ${dateLong(today)}</p><h1 style="margin-top:6px">${esc(d.event)}</h1><p class="muted" style="margin-top:6px">De dag waar je naartoe hebt getraind. Veel succes.</p></div>`;
    else if(d&&d.wo){const w=d.wo;hero=`<div class="card hero">
      <div><p class="muted">Vandaag, ${dateLong(today)}</p><h1>${esc(w.name)}</h1>${d.movedFrom!=null?`<p style="color:var(--z5);font-weight:600;margin-bottom:6px">Verplaatst van ${DAYS_L[d.movedFrom]}, omdat je die training hebt gemist.</p>`:''}<p class="muted" style="max-width:54ch">${esc(w.desc)}</p>${whyFor(state.profile.goal,w.type)?`<p style="max-width:54ch;margin-top:8px"><b style="font-weight:600">Voor je doel:</b> ${esc(whyFor(state.profile.goal,w.type))}</p>`:''}
        <div class="kv" style="margin:18px 0"><div><b>${durTxt(w.minutes)}</b><span>duur</span></div><div><b>${w.tss}</b><span>belasting (TSS)</span></div><div><b>${nl(w.IF.toFixed(2))}</b><span>intensiteit</span></div></div>
        <div class="row"><button class="btn pri big" data-act="startDay" data-iso="${d.iso}">Start training</button><button class="btn" data-act="openDay" data-iso="${d.iso}">Details en aanpassen</button></div></div>
      <div>${profileSVG(w.segs)}</div></div>`}
    else{const nx=plan.days.find(x=>x.iso>tk&&x.wo);hero=`<div class="card row spread"><div><p class="muted">Vandaag, ${dateLong(today)}</p><h1 style="margin-top:6px">Rustdag</h1><p class="muted" style="margin-top:6px">${nx?`Eerstvolgende training: ${esc(nx.wo.name)} op ${DAYS_L[nx.i]}.`:'Deze week staat er niets meer gepland.'}</p></div><button class="btn" data-act="openDay" data-iso="${tk}">Toch trainen</button></div>`}
  }
  const pend=ui.pending?`<div class="notice row spread"><span>Er staat een onderbroken training klaar: ${esc(ui.pending.wo.name)}, ${clock(ui.pending.rec.p.length)} gereden.</span><span class="row"><button class="btn" data-act="pendSave">Opslaan</button><button class="btn" data-act="pendDrop">Weggooien</button></span></div>`:'';
  const adj=state.levelAdj?`<p class="small muted">De zware trainingen staan nu een stap ${state.levelAdj>0?'zwaarder':'lichter'}, op basis van hoe je laatste trainingen aanvoelden. <button class="btn small" style="padding:3px 9px" data-act="resetAdj">Terugzetten</button></p>`:'';
  const cards=plan.days.map(d=>{
    const r=rideOn(d.iso),cls=`day${d.iso===tk?' today':''}${d.wo?'':' rest'}`;
    const head=`<span class="dh"><b>${DAYS[d.i]}</b><span>${d.date.getDate()} ${MONTHS[d.date.getMonth()].slice(0,3)}</span></span>`;
    if(d.event)return `<div class="${cls}" style="border-style:solid;border-color:var(--z5)">${head}<span class="dn">${esc(d.event)}</span><span class="rst">Dag van je evenement</span></div>`;
    if(!d.wo)return `<button class="${cls}" data-act="openDay" data-iso="${d.iso}">${head}<span class="rst">${r?'<span class="done">'+esc(r.name)+' gereden</span>':d.o.skip?'Overgeslagen':'Rust'}</span></button>`;
    const note=d.missed&&!r?`<span class="small" style="color:var(--z6);font-weight:600">${d.movedTo!=null?'Gemist, verplaatst naar '+DAYS[d.movedTo]:'Gemist'}</span>`:d.movedFrom!=null?`<span class="small" style="color:var(--z5);font-weight:600">Verplaatst van ${DAYS[d.movedFrom]}</span>`:'';
    return `<button class="${cls}" data-act="openDay" data-iso="${d.iso}"${d.missed&&!r?' style="opacity:.6"':''}>${head}<span class="dn">${esc(d.wo.name)}</span>${note}${profileSVG(d.wo.segs)}
      <span class="dm"><span>${durTxt(d.wo.minutes)}</span>${r?`<span class="done">Gereden${r.score!=null?' '+r.score:''}</span>`:`<span>${d.wo.tss} TSS</span>`}</span></button>`}).join('');
  const K=plan.ctx.kind,phaseTxt={build:'Elke opbouwweek zit er iets meer werk in de zware blokken.',rec:'Minder en lichter, zodat het werk van de afgelopen weken kan landen.',base:'Basisfase: vooral rustige uren en lange blokken onder je drempel.',peak:'Piekfase: de zwaarste weken, gericht op precies wat je evenement vraagt.',taper:'Afbouw: korter trainen op dezelfde intensiteit, zodat je fris wordt zonder scherpte te verliezen.',event:'Alleen korte prikkels. De vorm zit er al in; nu gaat het om fris aan de start staan.'}[K];
  const evTxt=plan.ctx.toGo!=null?`<p><b style="font-weight:600">${esc(state.event.name)}:</b> <span class="muted">${plan.ctx.toGo===0?'deze week':plan.ctx.toGo===1?'volgende week':'nog '+plan.ctx.toGo+' weken'}.</span></p>`:'';
  const fatTxt=plan.fat.level?`<p class="notice small">Je belasting van de laatste 7 dagen ligt ${plan.fat.pct}% boven je gemiddelde van de vier weken ervoor. ${plan.fat.level===2?'De zware trainingen zijn daarom een stap lichter en er is één kernsessie vervangen door een duurrit.':'De zware trainingen zijn daarom een stap lichter.'}</p>`:'';
  return `${pend}${prep}${hero}
    <div class="row spread" style="margin-top:34px"><div><h2>Week ${weekNo(mon)}, ${plan.label.toLowerCase()}</h2>
      <p class="muted small" style="margin-top:4px">${phaseTxt} Gepland: ${durTxt(sum.m)}, ${sum.t} TSS.</p></div>
      <div class="row"><button class="btn icon" data-act="week" data-d="-1" aria-label="Vorige week">‹</button>${ui.weekOff?'<button class="btn" data-act="week" data-d="0">Deze week</button>':''}<button class="btn icon" data-act="week" data-d="1" aria-label="Volgende week">›</button>
      ${plan.custom?`<button class="btn" data-act="openAvail" data-mon="${iso(mon)}">Beschikbaarheid aanpassen</button>`:''}
      <button class="btn" data-act="zwoWeek">Download week voor Zwift</button></div></div>
    <p style="max-width:80ch"><b style="font-weight:600">Doel: ${esc(goal.name.toLowerCase())}.</b> <span class="muted">${esc(goal.plan)}</span></p>
    ${!plan.custom&&ui.weekOff>=0?`<p class="small muted">Hieronder staat een voorlopige indeling op basis van je standaardweek.</p>`:''}
    ${evTxt}${fatTxt}${adj}<div class="week">${cards}</div>`;
}

function segList(w){
  return `<div class="segs">${w.segs.map(s=>`<div><i style="background:var(--z${zoneOf((s.a+s.b)/2)})"></i><span>${esc(s.label)}${s.cad?` <span class="muted">op ${s.cad} rpm</span>`:''}</span><span class="muted">${clock(s.d)}</span><span>${s.a===s.b?watts(s.a):watts(s.a)+' → '+watts(s.b)} W</span></div>`).join('')}</div>`;
}
function modalWo(){
  const m=ui.modal;if(!m||m.kind==='avail'||m.kind==='add')return null;
  if(m.kind==='wo')return {wo:buildWorkout(m.type,m.min,m.L)};
  const d=parseISO(m.iso),plan=planWeek(state,mondayOf(d),new Date());
  const day=plan.days.find(x=>x.iso===m.iso);
  return {wo:day.wo,day};
}
function availModal(){
  const mon=parseISO(ui.modal.mon),plan=planWeek(state,mon,new Date());
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Beschikbaarheid week ${weekNo(mon)}">
    <div><p class="muted">${mon.getDate()} ${MONTHS[mon.getMonth()]} tot en met ${addDays(mon,6).getDate()} ${MONTHS[addDays(mon,6).getMonth()]}</p><h2>Wanneer kun je in week ${weekNo(mon)}?</h2>
      <p class="muted" style="margin-top:6px">Kies per dag hoeveel tijd je hebt. Het schema voor deze week wordt daarop opnieuw ingedeeld.</p></div>
    <div class="avail">${plan.days.map(d=>`<div><div class="small" style="margin-bottom:4px"><b style="font-weight:600">${DAYS[d.i]}</b> <span class="muted">${d.date.getDate()}</span></div>${sel(`id="w-a${d.i}" aria-label="${DAYS_L[d.i]}"`,MINS.map(m=>[m,m?durTxt(m):'Rust']),d.o.skip?0:(d.o.minutes!=null?d.o.minutes:d.base))}</div>`).join('')}</div>
    <div class="row spread"><div class="row"><button class="btn pri big" data-act="saveWeek" data-mon="${ui.modal.mon}" data-p="w">Trainingen klaarzetten</button>${plan.custom?'<button class="btn" data-act="resetWeek">Standaardweek gebruiken</button>':''}</div><button class="btn" data-act="closeModal">Sluiten</button></div>
  </div></div>`;
}
function modalHTML(){
  if(ui.modal&&ui.modal.kind==='avail')return availModal();
  if(ui.modal&&ui.modal.kind==='add')return addModal();
  const x=modalWo();if(!x)return '';
  const {wo:w,day}=x;
  let adjust='';
  if(day){
    const types=[['','Automatisch']].concat(Object.entries(TYPES).filter(([k])=>k!=='ramptest').map(([k,t])=>[k,t.name]));
    adjust=`<div class="form" style="padding-top:6px;border-top:1px solid var(--line)">
      <div><label class="f" for="m-min">Beschikbare tijd deze dag</label>${sel('id="m-min" data-chg="ovMin"',MINS.map(v=>[v,v?durTxt(v):'Rust']),day.o.skip?0:(day.o.minutes!=null?day.o.minutes:day.base))}</div>
      ${w?`<div><label class="f" for="m-type">Soort training</label>${sel('id="m-type" data-chg="ovType"',types,day.o.type||'')}</div>`:''}
    </div>`;
  }
  const title=day?`<p class="muted">${dateLong(day.date)}</p>`:'';
  if(!w)return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Rustdag">${title}<h2>Rustdag</h2><p class="muted">Kies hieronder hoeveel tijd je hebt als je toch wilt trainen.</p>${adjust}<div class="row"><button class="btn" data-act="closeModal">Sluiten</button></div></div></div>`;
  const zs=[...new Set(w.segs.filter(s=>s.kind==='work'||s.kind==='steady').map(s=>zoneOf((s.a+s.b)/2)))].sort();
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="${esc(w.name)}">
    <div>${title}<h2>${esc(w.name)}</h2><p class="muted" style="margin-top:6px">${esc(w.desc)}</p>${whyFor(state.profile.goal,w.type)?`<p style="margin-top:8px"><b style="font-weight:600">Voor je doel:</b> ${esc(whyFor(state.profile.goal,w.type))}</p>`:''}</div>
    ${profileSVG(w.segs)}
    <div class="row spread"><div class="kv"><div><b>${durTxt(w.minutes)}</b><span>duur</span></div><div><b>${w.tss}</b><span>belasting (TSS)</span></div><div><b>${nl(w.IF.toFixed(2))}</b><span>intensiteit</span></div></div>
      <div class="row">${zs.map(z=>`<span class="zchip"><i style="background:var(--z${z})"></i>${ZN[z]}</span>`).join('')}</div></div>
    ${segList(w)}${adjust}
    <div class="row spread"><div class="row"><button class="btn pri big" data-act="startModal">Start training</button><button class="btn" data-act="zwoModal">Download voor Zwift</button></div><button class="btn" data-act="closeModal">Sluiten</button></div>
  </div></div>`;
}

function libView(){
  const l=ui.lib;
  const cards=Object.keys(TYPES).map(k=>{const w=buildWorkout(k,l.min,l.L);
    return `<button class="wo" data-act="openWo" data-type="${k}"><h3>${esc(w.name)}</h3>${profileSVG(w.segs)}<span class="dm row spread small muted"><span>${durTxt(w.minutes)}</span><span>${w.tss} TSS</span></span><p>${esc(w.desc)}</p></button>`}).join('');
  return `<div class="row spread"><div><h1>Trainingen</h1><p class="muted" style="margin-top:6px">Losse trainingen, op maat van de tijd die je hebt.</p></div>
    <div class="row"><label class="small muted">Duur ${sel('data-chg="libMin"',[30,45,60,75,90,120].map(m=>[m,durTxt(m)]),l.min)}</label>
    <label class="small muted">Zwaarte ${sel('data-chg="libL"',[[0,'Licht'],[1,'Normaal'],[2,'Zwaar']],l.L)}</label></div></div>
    <div class="grid">${cards}</div>`;
}

function recordsCard(){
  const all=records(state.rides),cut=iso(addDays(new Date(),-42)),recent=records(state.rides.filter(r=>r.date>=cut));
  const ds=BESTS.filter(([w])=>all[w]);
  if(!ds.length)return '';
  const kg=state.profile.weight||75,max=Math.max(...ds.map(([w])=>all[w].w))*1.08,N=BESTS.length;
  const x=i=>(i/(N-1)*1000),y=v=>200-v/max*200;
  const line=src=>{let d='',pen=false;BESTS.forEach(([w],i)=>{if(!src[w]){return}d+=`${pen?'L':'M'}${x(i).toFixed(1)},${y(src[w].w).toFixed(1)}`;pen=true});return d};
  const lbl=BESTS.map(([w,t],i)=>`${i%2&&i!==N-1?'':`<span class="xl${i===0?' first':i===N-1?' last':''}" style="left:${i/(N-1)*100}%">${t}</span>`}`).join('');
  return `<div class="card"><h3 style="margin-bottom:10px">Vermogenscurve en records</h3><div class="cols">
    <div><div class="chart" style="height:200px"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label="Je beste vermogen per duur">
      <path d="${line(all)}" fill="none" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <path d="${line(recent)}" fill="none" stroke="var(--z5)" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/></svg>${lbl}</div>
      <div class="legend"><span><i style="background:var(--ink)"></i>Beste ooit</span><span><i style="background:var(--z5)"></i>Laatste 6 weken</span></div></div>
    <div class="scroll"><table><thead><tr><th>Duur</th><th>Record</th><th>W/kg</th><th>Laatste 6 weken</th><th>Gereden op</th></tr></thead><tbody>
      ${ds.map(([w,t])=>{const d=parseISO(all[w].date);return `<tr><td>${t}</td><td><b style="font-weight:600">${all[w].w} W</b></td><td>${nl((all[w].w/kg).toFixed(1))}</td><td>${recent[w]?recent[w].w+' W':'–'}</td><td><button class="btn" style="padding:2px 9px" data-act="openRide" data-id="${all[w].id}">${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</button></td></tr>`}).join('')}
    </tbody></table></div></div></div>`;
}
function addModal(){
  const t=iso(new Date());
  const inp='border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:7px 10px';
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Buitenrit toevoegen">
    <div><h2>Buitenrit toevoegen</h2><p class="muted" style="margin-top:6px">Zo telt een rit buiten mee in je belasting, je conditie en het schema.</p></div>
    <div class="stack" style="padding-bottom:18px;border-bottom:1px solid var(--line)"><h3>Bestand van je fietscomputer</h3>
      <p class="small muted">Een .fit- of .tcx-bestand van bijvoorbeeld Garmin, Wahoo of Strava. Met vermogensmeter krijg je de volledige analyse; zonder vermogen wordt de belasting geschat met de zwaarte hieronder.</p>
      <div><label class="btn pri" style="cursor:pointer;display:inline-block">Bestand kiezen<input type="file" accept=".fit,.tcx" data-chg="importRide" style="position:absolute;opacity:0;width:1px;height:1px"></label></div></div>
    <div class="stack"><h3>Of vul de rit zelf in</h3>
      <div class="form">
        <div><label class="f" for="a-date">Datum</label><input type="date" id="a-date" value="${t}" max="${t}" style="${inp}"></div>
        <div><label class="f" for="a-min">Duur in minuten</label><input type="number" id="a-min" min="10" max="900" value="90" style="width:120px"></div>
        <div><label class="f" for="a-eff">Zwaarte</label>${sel('id="a-eff"',EFFORT.map((e,i)=>[i,e[1]]),1)}</div>
        <div><label class="f" for="a-pw">Gemiddeld vermogen in watt (optioneel)</label><input type="number" id="a-pw" min="0" max="600" style="width:120px"></div>
      </div>
      <div class="row spread"><button class="btn pri" data-act="saveManual">Rit toevoegen</button><button class="btn" data-act="closeModal">Sluiten</button></div></div>
  </div></div>`;
}
function analyseView(){
  const rides=[...state.rides].sort((a,b)=>b.ts-a.ts);
  if(!rides.length)return `<h1>Analyse</h1><div class="card stack"><h2>Nog geen trainingen gereden</h2><p class="muted" style="max-width:60ch">Na elke training zie je hier je vermogen per blok, tijd per zone, je records en hoe je conditie zich ontwikkelt. Ritten die je buiten rijdt kun je toevoegen, zodat je belasting klopt.</p><div class="row"><button class="btn pri" data-act="nav" data-v="schema">Naar het schema</button><button class="btn" data-act="openAdd">Buitenrit toevoegen</button></div></div>`;
  const today=new Date(),f=fitness(state.rides,today,84),mon=mondayOf(today);
  const bars=[];let mx=1;
  for(let w=7;w>=0;w--){const m=addDays(mon,-7*w),e=iso(addDays(m,6)),s=iso(m);
    const done=state.rides.filter(r=>!r.sim&&r.date>=s&&r.date<=e).reduce((a,r)=>a+r.tss,0),pl=state.setup&&s>=state.planStart?weekSum(planWeek(state,m)).t:0;
    mx=Math.max(mx,done,pl);bars.push({m,done,pl})}
  const form=f.tsb>5?'Fris':f.tsb<-20?'Zwaar vermoeid':f.tsb<-8?'Vermoeid':'In balans';
  return `<h1>Analyse</h1>
    <div class="stats"><div><b>${f.ctl}</b><span>Conditie</span></div><div><b>${f.atl}</b><span>Vermoeidheid</span></div><div><b>${f.tsb>0?'+':''}${f.tsb}</b><span>Vorm: ${form.toLowerCase()}</span></div><div><b>${bars[7].done}<small>van ${bars[7].pl}</small></b><span>TSS deze week</span></div><div><b>${state.rides.filter(r=>!r.sim).length}</b><span>Trainingen gereden</span></div></div>
    <div class="cols">
      <div class="card"><h3 style="margin-bottom:10px">Conditie en vermoeidheid, 12 weken</h3>${trendChart(f)}</div>
      <div class="card"><h3 style="margin-bottom:14px">Belasting per week</h3><div class="bars">${bars.map(b=>`<div class="b"><span class="num">${b.done||''}</span><div class="col" style="height:${Math.max(2,Math.max(b.pl,b.done)/mx*100)}%${b.pl?'':';border-color:transparent'}"><i style="height:${Math.min(100,b.done/Math.max(1,b.pl,b.done)*100)}%"></i></div><span>wk ${weekNo(b.m)}</span></div>`).join('')}</div>
        <p class="small muted" style="margin-top:12px">Stippellijn: gepland. Gevuld: gereden. Demo-ritten tellen niet mee.</p></div>
    </div>
    ${recordsCard()}
    <div class="card"><div class="row spread" style="margin-bottom:6px"><h3>Gereden trainingen</h3><button class="btn" data-act="openAdd">Buitenrit toevoegen</button></div><div class="ridelist">${rides.map(r=>{const d=new Date(r.ts);
      return `<button data-act="openRide" data-id="${r.id}"><span class="muted">${DAYS[dow(d)]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}</span><span><b style="font-weight:600">${esc(r.name)}</b>${r.sim?' <span class="badge">Demo</span>':''}</span><span class="r">${clock(r.dur)}</span><span class="r hide">${r.np?r.np+' W':'–'}</span><span class="r hide">${r.tss} TSS</span><span class="r">${r.score!=null?r.score+' / 100':''}</span></button>`}).join('')}</div></div>`;
}

function rideView(){
  const r=state.rides.find(x=>x.id===ui.rideId);
  if(!r){ui.view='analyse';return analyseView()}
  const d=new Date(r.ts),rec=ui.streams&&ui.streams.id===r.id?ui.streams.rec:null,kg=state.profile.weight||75;
  const v=verdict(r,state.profile.ftp),est=ftpEstimate(r);
  const ftpBtn=est&&Math.abs(est-state.profile.ftp)>=2&&(r.type==='ramptest'||est>state.profile.ftp*1.02)?`<button class="btn pri" data-act="setFtp" data-w="${est}">FTP bijwerken naar ${est} W</button>`:'';
  const rpe=`<div class="card stack"><h3>${r.rpe==null?'Hoe zwaar voelde deze training?':'Zo zwaar voelde het'}</h3><div class="rpe">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-act="rpe" data-n="${n}" aria-pressed="${r.rpe===n}" aria-label="${n} van 10">${n}</button>`).join('')}</div><p class="small muted">1 is moeiteloos, 10 is alles gegeven. Je antwoord stuurt de zwaarte van de volgende zware trainingen bij.</p></div>`;
  const tot=r.zones.reduce((a,b)=>a+b,0)||1;
  const zones=r.zones.map((s,i)=>`<div class="zrow"><span>${ZN[i+1]}</span><span class="bar"><i style="width:${s/tot*100}%;background:var(--z${i+1})"></i></span><span>${clock(s)} &nbsp;${Math.round(s/tot*100)}%</span></div>`).join('');
  const prd=new Set((r.prs||[]).map(x=>x.d));
  const outdoor=r.type==='buiten';
  let hz='';
  if(rec&&r.avgHr){
    const mh=state.profile.maxHr;
    if(mh){const z=hrZones(rec.hr,mh),ht=z.reduce((a,b)=>a+b,0)||1;
      hz=`<div class="card"><h3 style="margin-bottom:10px">Tijd per hartslagzone</h3>${z.map((s,i)=>`<div class="zrow"><span>${HZN[i]}</span><span class="bar"><i style="width:${s/ht*100}%;background:var(--z${[1,2,3,5,6][i]})"></i></span><span>${clock(s)} &nbsp;${Math.round(s/ht*100)}%</span></div>`).join('')}
        <p class="small muted" style="margin-top:10px">Zones op basis van je maximale hartslag van ${mh}.${r.maxHr>mh?` In deze rit haalde je ${r.maxHr}; pas je maximum aan onder Instellingen.`:''}</p></div>`}
    else hz=`<div class="card"><h3 style="margin-bottom:8px">Tijd per hartslagzone</h3><p class="muted">Vul je maximale hartslag in onder Instellingen om je hartslagzones te zien.</p></div>`;
  }
  const best=BESTS.filter(([w])=>r.best[w]).map(([w,t])=>`<tr><td>${t}${prd.has(w)?' <span class="badge" style="background:var(--z5);color:#fff">Record</span>':''}</td><td>${r.best[w]} W</td><td>${nl((r.best[w]/kg).toFixed(1))} W/kg</td><td>${Math.round(r.best[w]/r.ftp*100)}% van FTP</td></tr>`).join('');
  let laps='';
  if(rec){
    const ls=outdoor?[]:lapStats(rec,r.laps).filter(l=>l.d>=10);
    const rows=ls.length>40?ls.filter(l=>l.kind!=='rest'):ls;
    if(rows.length)laps=`<div class="card"><h3 style="margin-bottom:8px">Per blok</h3><div class="scroll"><table><thead><tr><th>Blok</th><th>Duur</th><th>Doel</th><th>Gereden</th><th>Verschil</th><th>Cadans</th><th>Hartslag</th></tr></thead><tbody>
      ${rows.map(l=>`<tr><td><span class="zchip"><i style="background:var(--z${zoneOf(l.t/r.ftp)})"></i>${esc(l.label)}</span></td><td>${clock(l.d)}</td><td>${l.t} W</td><td>${l.p} W</td><td style="color:${Math.abs(l.dev)>6?'var(--z6)':'inherit'}">${Math.abs(l.dev)<.05?'0,0':(l.dev>0?'+':'')+nl(l.dev.toFixed(1))}%</td><td>${l.cad||'–'}</td><td>${l.hr||'–'}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  return `<div><button class="btn" data-act="nav" data-v="analyse">‹ Alle trainingen</button></div>
    <div class="row spread"><div><p class="muted">${dateLong(d)} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}</p><h1 style="margin-top:4px">${esc(r.name)}${r.sim?' <span class="badge" style="vertical-align:middle">Demo</span>':''}</h1></div>${ftpBtn}</div>
    ${r.prs&&r.prs.length?`<p class="notice" style="border-color:var(--z5)"><b style="font-weight:600">Nieuw record.</b> ${r.prs.map(x=>`${x.t}: ${x.w} W, was ${x.old} W`).join('. ')}.</p>`:''}
    ${r.rpe==null?rpe:''}
    <div class="stats">
      <div><b>${clock(r.dur)}</b><span>${outdoor?'Duur':'Duur, gepland '+clock(r.planned)}</span></div>
      ${r.score!=null?`<div><b>${r.score}<small>/ 100</small></b><span>Uitvoering</span></div>`:''}
      <div><b>${r.avgP||'–'}<small>W</small></b><span>Gemiddeld vermogen</span></div>
      <div><b>${r.np||'–'}<small>W</small></b><span>Genormaliseerd${r.np?', '+nl((r.np/kg).toFixed(1))+' W/kg':''}</span></div>
      <div><b>${nl(r.IF.toFixed(2))}</b><span>Intensiteit (IF)</span></div>
      <div><b>${r.tss}</b><span>Belasting (TSS)</span></div>
      <div><b>${r.kj}<small>kJ</small></b><span>Arbeid</span></div>
      <div><b>${r.avgHr||'–'}<small>${r.maxHr?'max '+r.maxHr:''}</small></b><span>Hartslag</span></div>
      <div><b>${r.avgCad||'–'}<small>rpm</small></b><span>Cadans</span></div>
    </div>
    ${v.length?`<div class="card verdict"><h3 style="margin-bottom:8px">Wat deze training zegt</h3>${v.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:''}
    ${r.manual?'':`<div class="card"><h3 style="margin-bottom:10px">Verloop</h3>${rec?rideChart(r,rec):'<p class="muted">De meetgegevens van deze training zijn niet beschikbaar in deze browser. De samenvatting hierboven klopt nog wel.</p>'}</div>`}
    <div class="cols"><div class="card"><h3 style="margin-bottom:10px">Tijd per zone</h3>${zones}</div>
      <div class="card"><h3 style="margin-bottom:8px">Beste inspanningen</h3><table><tbody>${best||'<tr><td class="muted">Geen vermogensgegevens voor piekwaarden.</td></tr>'}</tbody></table></div></div>
    ${hz}${laps}
    ${r.rpe!=null?rpe:''}
    <div class="row">${rec?'<button class="btn" data-act="csv">Download meetgegevens (CSV)</button>':''}<button class="btn warn" data-act="delRide">${ui.confirm==='ride'?'Klik nog eens om te verwijderen':'Training verwijderen'}</button></div>`;
}

function settingsView(){
  return `<h1>Instellingen</h1>${settingsForm(false)}
    <div class="card stack"><h2>Je gegevens</h2><p class="muted" style="max-width:66ch">Alles wordt in deze browser bewaard, op dit apparaat. Maak af en toe een back-up, zeker voordat je browsergegevens wist of van computer wisselt.</p>
      <div class="row"><button class="btn" data-act="backup">Back-up downloaden</button><label class="btn" style="cursor:pointer">Back-up terugzetten<input type="file" accept=".json,application/json" data-chg="restore" style="position:absolute;opacity:0;width:1px;height:1px"></label>
      <button class="btn warn" data-act="wipe">${ui.confirm==='wipe'?'Klik nog eens om alles te wissen':'Alles wissen'}</button></div></div>`;
}

function render(){
  const app=document.getElementById('app');
  if(P){renderPlayer();document.getElementById('modal').innerHTML='';return}
  const v={schema:schemaView,lib:libView,analyse:analyseView,ride:rideView,settings:settingsView}[ui.view]||schemaView;
  app.innerHTML=shell(v());
  document.getElementById('modal').innerHTML=modalHTML();
  if(ui.view==='ride')bindChart();
}
async function openRide(id){
  ui.view='ride';ui.rideId=id;ui.confirm='';
  if(!ui.streams||ui.streams.id!==id){ui.streams=null;render();const rec=await idb.get('s:'+id);if(rec&&ui.rideId===id){ui.streams={id,rec};render()}}
  else render();
  window.scrollTo(0,0);
}
