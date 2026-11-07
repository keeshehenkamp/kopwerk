'use strict';
/* ================= views ================= */
const sel=(attrs,opts,val)=>`<select ${attrs}>${opts.map(([v,t])=>`<option value="${v}"${String(v)===String(val)?' selected':''}>${t}</option>`).join('')}</select>`;
const watts=f=>Math.round(f*state.profile.ftp);
/* gereden op dag k; een demo telt niet, die zou de echte training van die dag verbergen */
const rideOn=k=>{const l=state.rides.filter(r=>r.date===k&&!r.sim&&r.type!=='vrij');return l.length?l[l.length-1]:null};
const weekSum=p=>{let m=0,t=0;for(const d of p.days)if(d.wo){m+=d.wo.minutes;t+=d.wo.tss}return{m,t}};
const logo='<svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true"><rect x="0" y="12" width="5" height="8" rx="1" fill="var(--z2)"/><rect x="7" y="7" width="5" height="13" rx="1" fill="var(--z3)"/><rect x="14" y="0" width="5" height="20" rx="1" fill="var(--z5)"/><rect x="21" y="9" width="5" height="11" rx="1" fill="var(--z1)"/></svg>';
/* één iconenset: Lucide (lucide.dev, ISC-licentie). Lijnen van 2 px in de kleur van de tekst. */
const ic=p=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I={
  l:ic('<path d="m15 18-6-6 6-6"/>'),r:ic('<path d="m9 18 6-6-6-6"/>'),
  up:ic('<path d="m18 15-6-6-6 6"/>'),down:ic('<path d="m6 9 6 6 6-6"/>'),
  x:ic('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),check:ic('<path d="M20 6 9 17l-5-5"/>')
};
const ICON={
  vandaag:ic('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  schema:ic('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'),
  ritten:ic('<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>'),
  lib:ic('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
  profiel:ic('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>')
};
/* vijf tabs: Trainingen heeft een eigen plek; Prestaties is een onderdeel van Voortgang (wissel bovenaan dat scherm) */
const TABS=[['vandaag','Home'],['kalender','Kalender'],['lib','Trainingen'],['voortgang','Voortgang'],['profiel','Profiel']];
ICON.kalender=ICON.schema;ICON.voortgang=ICON.ritten;
ICON.lib=ic('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>');
/* wissel tussen de twee schermen onder de tab Voortgang */
const vtabs=()=>`<div class="vtabs" role="group" aria-label="Onderdeel">${[['voortgang','Fitheid'],['prestaties','Prestaties']].map(([v,t])=>`<button data-act="nav" data-v="${v}" aria-pressed="${ui.view===v}">${t}</button>`).join('')}</div>`;
const TAB_OF={ride:'kalender',schema:'kalender',ritten:'kalender',prestaties:'voortgang',analyse:'voortgang',settings:'profiel'};
const tabOf=v=>v==='training'?TAB_OF[(ui.detail&&ui.detail.from)||'vandaag']||(ui.detail&&ui.detail.from)||'vandaag':v==='ride'?ui.rideFrom||'kalender':TAB_OF[v]||v;
const dayShort=d=>`${DAYS[dow(d)]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
/* zwaarste blok van een training, voor het gekleurde stipje */
const woZone=w=>{let f=0;for(const s of w.segs)if(s.d>=30)f=Math.max(f,(s.a+s.b)/2);return zoneOf(f||.5)};
/* elke rit op een dag, ook vrij rijden */
const realOn=k=>{const l=state.rides.filter(r=>r.date===k&&!r.sim);return l.length?l[l.length-1]:null};
/* gereden: vinkje; geplande training die voorbij is en niet gereden: kruisje */
const dotFor=(d,r)=>r?'<span class="dot done">'+I.check+'</span>':d.wo&&!d.event&&d.iso<iso(new Date())?'<span class="dot miss">'+I.x+'</span>':d.event?'<span class="dot ev"></span>':d.wo?`<span class="dot" style="background:var(--z${woZone(d.wo)})"></span>`:'<span class="dot rest"></span>';
const metaOf=w=>`${durTxt(w.minutes)} · ${w.tss} TSS`;

let enterMain=false,lastScreen='',lastModal='';
function shell(body){
  const cur=tabOf(ui.view);
  return `<aside class="side${state.setup?'':' off'}"><div class="brand">${logo}Kopwerk</div>
    <nav class="tabs" aria-label="Hoofdmenu">${TABS.map(([k,t])=>`<button data-act="nav" data-v="${k}"${cur===k?' aria-current="page"':''}>${ICON[k]}<span>${t}</span></button>`).join('')}</nav>
    <div class="ftp"><div>FTP <b>${state.profile.ftp}</b> W</div><button class="link small" data-act="themeToggle" style="margin-top:10px">${isDark()?'Lichte weergave':'Donkere weergave'}</button></div></aside>
    <main class="main${enterMain?' enter':''}">${ui.saveFail?'<p class="notice small" style="margin-bottom:14px">Opslaan lukt niet in deze browser. Je gegevens blijven staan tot je de pagina sluit; maak een back-up via Profiel.</p>':''}${body}</main>`;
}

/* ---------- evenement in het formulier ---------- */
/* wat er nu in het formulier staat: je laatste keuze (ui.draft) of wat er opgeslagen is */
function formEvent(){
  const ev=state.event||{},d=ui.draft||{};
  const id=d['s-evid']!=null?d['s-evid']:ev.id||(ev.name||ev.date?'eigen':'');
  const v=d['s-evv']!=null&&id===ev.id?+d['s-evv']:id===ev.id?ev.v|0:d['s-evv']!=null?+d['s-evv']:0;
  return {id,v:EVBY[id]?clamp(v,0,EVBY[id].v.length-1):0,date:d['s-evd']!=null?d['s-evd']:ev.date||'',
    kind:d['s-evk']!=null?d['s-evk']:ev.kind||'',km:+(d['s-evkm']!=null?d['s-evkm']:ev.km||0)||0};
}
/* haalbaar? met wat je net invulde in het formulier (niveau, FTP, gewicht) */
/* het doelblok in één regel: van, naar en tot wanneer */
const dtShort=d=>`${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
function blockVal(b,v){const kg=state.profile.weight||75;return blockKind(b.goal)==='wkg'?`${nl((v/kg).toFixed(1))} W/kg`:blockKind(b.goal)==='sprint'?`${v} W over 15 sec`:`${v} W`}
function blockLine(){
  const b=state.block;if(!b||(state.event&&state.event.date&&state.event.date>=iso(new Date())))return '';
  const what=blockKind(b.goal)==='sprint'?'Sprint':blockKind(b.goal)==='wkg'?'Klimmen':'FTP';
  return `<p class="small muted">${b.from?`${what} van ${blockVal(b,b.from)} naar ${blockVal(b,b.target)}`:'Je doel volgt uit je eerste sprints'}, in twaalf weken tot ${dtShort(parseISO(b.end))}. Halverwege en in de laatste week test je${blockKind(b.goal)==='sprint'?'':'; loop je voor, dan gaat het doel omhoog'}.</p>`;
}
function evNotice(cur){
  if(!cur.id||!/^\d{4}-\d{2}-\d{2}$/.test(cur.date))return '';
  const d=ui.draft||{},P=Object.assign({},state.profile);
  if(d['s-niv'])P.niveau=d['s-niv'];if(+d['s-ftp'])P.ftp=clamp(+d['s-ftp'],60,600);if(+d['s-w'])P.weight=clamp(+d['s-w'],35,200);
  if(!P.niveau&&!state.setup)P.niveau='recreant';
  /* bij het instellen: de tijd per dag die je in stap 3 kiest (ui.setupAvail) */
  const st=Object.assign({},state,{profile:P},!state.setup?{avail:ui.setupAvail||state.avail,weeks:{}}:{}),ev=Object.assign({},cur,cur.id==='eigen'?{id:undefined}:{});
  const r=evCheck(st,ev,new Date());if(!r)return '';
  const h=m=>durTxt(r5(m*60)),E=EVBY[cur.id];
  if(r.st==='ok')return `<p class="small muted" style="margin-top:10px">Haalbaar. Op de dag ben je ongeveer ${h(r.h)} onderweg. Je langste trainingsrit groeit tot ongeveer ${h(Math.min(r.reach,r.need*1.1))}.${r.day?` Plan wel minstens één dag van ${h(r.dayNeed)}; je langste dag is nu ${h(r.day)}.`:''}</p>`;
  const alt=r.alt?`<button class="btn small" data-act="evAlt" data-v="${r.alt.i}">Kies de ${E.v[r.alt.i].naam?esc(E.v[r.alt.i].naam)+' ('+r.alt.km+' km)':r.alt.km+' km'}</button>`:'';
  return `<div class="notice small stack" style="margin-top:12px;gap:8px"><p><b style="font-weight:600">${r.st==='krap'?'Krap.':'Waarschijnlijk te zwaar.'}</b> Op de dag ben je ongeveer ${h(r.h)} onderweg. Het advies is een langste trainingsrit van ${h(r.need)}; in ${Math.round(r.weeks)} weken kom je naar verwachting tot ongeveer ${h(r.reach)}.${r.day?` Je langste dag in je week is nu ${h(r.day)}.`:''}</p>
    <p class="muted">${r.alt?'Een kortere afstand van hetzelfde evenement past wel.':E&&E.v.length>1?'Ook de kortere afstanden zijn krap. Kies een evenement later in het jaar, of rijd rustig en neem de tijd.':'Kies een evenement later in het jaar, of een kortere tocht.'}</p>${alt?`<div>${alt}</div>`:''}</div>`;
}
/* ---------- formulier met je gegevens (eerste keer en Profiel) ---------- */
function settingsForm(first){
  const p=state.profile,ev=state.event||{};
  /* de eerste keer in drie stappen; alle velden blijven in de pagina staan, alleen de stap van nu is zichtbaar */
  const st=first?ui.step||0:-1,hid=i=>first&&st!==i?' hidden':'';
  const save=`<div class="row spread setupnav">${st>0?`<button class="btn big" data-act="setupStep" data-s="${st-1}">Terug</button>`:'<span></span>'}${st<2?`<button class="btn pri big" data-act="setupStep" data-s="${st+1}">Verder</button>`:'<button class="btn pri big" data-act="saveSettings">Maak mijn schema</button>'}</div>`;
  /* doelen: 'gewoon beter worden' voorop; een evenement is optioneel */
  const goals=['fit','ftp','klimmen','sprint','duur','koers'].filter(k=>GOALS[k]).map(k=>[k,GOALS[k].name]);
  /* evenement: kies uit de lijst, of 'Ander evenement' en vul het zelf in. Wat je net koos (ui.draft) gaat voor. */
  const cur=formEvent(),E=EVBY[cur.id];
  const opts=`<option value="">Kies een evenement</option>${EVGROUPS.map(([g,t])=>`<optgroup label="${t}">${EVLIST.filter(e=>e.groep===g).map(e=>`<option value="${e.id}"${cur.id===e.id?' selected':''}>${esc(e.naam)} · ${e.land}</option>`).join('')}</optgroup>`).join('')}<option value="eigen"${cur.id==='eigen'?' selected':''}>Ander evenement</option>`;
  const event=`<details class="evbox"${cur.id?' open':''}><summary>Ik train voor een evenement</summary>
      <div class="form" style="margin-top:12px">
        <div class="wide"><label class="f" for="s-evid">Evenement</label><select id="s-evid">${opts}</select></div>
        ${E&&E.v.length>1?`<div><label class="f" for="s-evv">Afstand</label>${sel('id="s-evv"',E.v.map((x,i)=>[i,evVarTxt(x)]),cur.v)}</div>`:''}
        ${cur.id==='eigen'?`<div><label class="f" for="s-evn">Naam</label><input type="text" id="s-evn" maxlength="40" value="${esc(ev.id?'':ev.name||'')}" placeholder="optioneel" style="width:100%"></div>`:''}
        ${cur.id?`<div><label class="f" for="s-evd">Datum</label><input type="date" id="s-evd" value="${cur.date||''}" min="2000-01-01" max="2099-12-31"></div>`:''}
        ${cur.id==='eigen'?`<div><label class="f" for="s-evk">Soort</label>${sel('id="s-evk"',EVENT_KINDS,ev.id?'':ev.kind||'')}</div>
        <div><label class="f" for="s-evkm">Afstand in km</label><input type="number" id="s-evkm" min="20" max="400" value="${ev.id?'':ev.km||''}" placeholder="optioneel"></div>`:''}
      </div>
      ${E?`<p class="small muted" style="margin-top:10px">${E.v.length===1?evVarTxt(E.v[0])+'. ':''}Meestal ${esc(E.maand)}. Afstand en hoogtemeters zijn richtwaarden; controleer de datum en route van jouw editie.</p>`:''}
      ${first?'':evNotice(cur)}</details>`;
  const niv=p.niveau||'',nivNow=NIVEAU[(ui.draft&&ui.draft['s-niv'])||niv||(first?'recreant':'')];
  return `<div class="stack">
    <div class="card stack"${hid(0)}><h2>Wat wil je bereiken?</h2>
      <div class="form"><div><label class="f" for="s-goal">Doel</label>${sel('id="s-goal"',goals,p.goal||'fit')}</div></div>${first?'':blockLine()}${event}</div>
    <div class="card stack"${hid(1)}><h2>${first?'Over jou':'Jij'}</h2>${first?'<p class="small muted">Weet je je FTP niet? Laat het veld leeg, dan plant de coach eerst een FTP-test.</p>':''}
      <div class="form">
        <div class="wide"><label class="f" for="s-niv">Niveau</label>${sel('id="s-niv"',(niv||first?[]:[['','Nog niet gekozen']]).concat(NIV_KEYS.map(k=>[k,NIVEAU[k].name])),niv||(first?'recreant':''))}${nivNow?`<p class="small muted" style="margin-top:6px">${nivNow.desc}</p>`:''}</div>
        <div><label class="f" for="s-ftp">FTP in watt</label><input type="number" id="s-ftp" min="60" max="600" value="${first&&!state.setup?'':p.ftp}" placeholder="weet ik niet"></div>
        <div><label class="f" for="s-w">Gewicht in kg</label><input type="number" id="s-w" min="35" max="200" value="${p.weight}"></div>
 ${first?'':`<div><label class="f" for="s-mhr">Maximale hartslag</label><input type="number" id="s-mhr" min="120" max="230" value="${p.maxHr||''}" placeholder="optioneel"></div>
        <div><label class="f" for="s-snd">Geluid bij blokwissel</label>${sel('id="s-snd"',[[1,'Aan'],[0,'Uit']],p.sound?1:0)}</div>`}
      </div>${first?evNotice(cur):''}
</div>
    ${first?`<div class="card"${hid(2)}><h2 style="margin-bottom:4px">Wanneer kun je fietsen?</h2><p class="small muted" style="margin-bottom:12px">Tik op een dag en kies hoeveel tijd je hebt. Dit pas je later per week aan.</p>${availEditor('setup')}</div>`:''}
    ${first?save:''}</div>`;
}
function setupView(){
  const st=ui.step||0;
  return `<div class="setup"><div class="head"><div><h1>Welkom bij Kopwerk</h1><p>Stap ${st+1} van 3</p></div></div>
    <div class="steps" aria-hidden="true">${[0,1,2].map(i=>`<i class="${i<=st?'on':''}"></i>`).join('')}</div>${settingsForm(true)}</div>`;
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
/* één tik: hoe voel je je vandaag? Alleen als er vandaag een training staat die je nog niet reed */
function feelHTML(plan,today,H){
  const k=iso(today),d=plan.days.find(x=>x.iso===k);
  if(H||!d||!d.wo||d.event||realOn(k)||(state.missed||{})[k])return '';
  const v=(state.feel||{})[k];
  return `<div class="feel"><span class="small muted">Hoe voel je je?</span><div class="seg" role="group" aria-label="Hoe voel je je vandaag">${[['goed','Goed'],['moe','Moe'],['slecht','Slecht']].map(([x,t])=>`<button class="btn small" data-act="feel" data-v="${x}" aria-pressed="${v===x}">${t}</button>`).join('')}</div></div>`;
}
/* de coach zegt één ding tegelijk: wat hij zag en wat er daardoor verandert; meer tijd vragen doet hij zelden */
function coachLine(plan,today,rd){
  const fat=plan.fat,R=plan.read,tk=iso(today),k=iso(plan.monday),hs=healthOn(state,tk);
  if(fat.health||fat.tired||(hs&&hs.ret)||plan.ctx.kind==='event')return null;
  const test=plan.days.some(d=>d.test&&d.iso>=tk);
  if(plan.ctx.kind==='test')return {t:'Laatste week van je blok: rustiger, met een test om te zien wat het opleverde.'};
  const last=(state.blockLog||[]).slice(-1)[0],b=state.block;
  if(b&&b.raised&&dayDiff(parseISO(b.raised.date),today)<7)return {t:`Je loopt voor op schema: nieuw doel ${blockVal(b,b.target)}.`};
  if(last&&b&&last.result&&dayDiff(parseISO(b.start),today)<7)return {t:`Blok klaar: ${blockVal(last,last.from)} naar ${blockVal(last,last.result)}${last.result>=last.target?', doel gehaald':''}. Nieuw doel: ${blockVal(b,b.target)}.`};
  if(fat.back!=null)return {t:fat.back>=14?`${fat.back} dagen niet gereden: je bouwt rustig weer op.`:'Weinig gereden de laatste weken: je bouwt rustig weer op.'};
  if(R&&R.k==='diep')return {t:'Het voelt zwaar en je hartslag blijft laag: je bent waarschijnlijk diep vermoeid. Deze week rustiger.'};
  if(R&&R.k==='moe')return {t:'Het voelt zwaar en je hartslag is hoog: je lichaam vraagt om rust. Deze week minder.'};
  if(R&&R.k==='zwaar')return {t:`De laatste trainingen voelden zwaarder dan verwacht. Deze week een stap lichter.${test?' De FTP-test laat zien of je FTP te hoog staat.':''}`};
  if(R&&R.k==='hoog')return {t:'Je hartslag is al een paar ritten hoger dan normaal. De zware trainingen zijn een stap lichter.'};
  if(fat.level&&fat.pct)return {t:fat.plan?'Je belasting liep snel op. De zware trainingen zijn een stap lichter.':`Je reed de laatste week ${fat.pct}% meer dan gewoonlijk. De zware trainingen zijn een stap lichter.`};
  const nx=plan.days.find(d=>d.adj&&d.iso>tk);if(nx)return {t:`${nx.adj.split(':')[0]}: ${DAYS_L[nx.i]} een stap lichter.`};
  const log=state.plog||{},from=iso(addDays(today,-14)),wanted=Object.keys(log).filter(x=>x>=from&&x<tk&&log[x].t),ridden=x=>state.rides.some(r=>!r.sim&&r.date===x);
  if(wanted.length>=4&&wanted.filter(ridden).length<wanted.length/2)return {t:'Je reed de afgelopen twee weken minder dan gepland, dus het schema gaat mee omlaag. Klopt je tijd nog? Tik op de klok bij je week.'};
  if(R&&R.k==='gegroeid')return {t:`Het voelt lichter en je hartslag is lager: je wordt sterker. De trainingen gaan omhoog.${test?' Deze week test je je FTP.':''}`};
  if(R&&R.k==='kanmeer'){
    const d=!(state.coachNo||{})[k]&&plan.days.find(x=>x.long&&x.wo&&x.iso>=tk&&!x.logged&&plan.coach.longT>x.minutes&&x.wo.minutes>=x.minutes-5);
    return d?{t:`Het voelt lichter dan verwacht: je kunt meer aan. Heb je ${DAYS_L[d.i]} een half uur extra?`,btn:`<button class="btn small" data-act="coachMore" data-iso="${d.iso}" data-m="${d.minutes+30}">Ja, ${durTxt(d.minutes+30)}</button><button class="btn small" data-act="coachNo" data-k="${k}">Nee</button>`}:{t:'Het voelt lichter dan verwacht: je kunt meer aan. De trainingen gaan omhoog.'};
  }
  /* echt te weinig tijd: eens in de vier weken noemen, niet elke week */
  const tip=weekNo(plan.monday)%4===0?moreTimeTip(plan):'';if(tip)return {t:tip};
  if(rd.lvl==='ok'&&state.rides.filter(r=>!r.sim&&r.date>=from).length>=2)return {t:'Lekker bezig. Zo doorgaan.'};
  return null;
}
function statusCard(plan,today){
  const rd=readiness(today),f=rd.f,e=eftpAt(today),ftp=state.profile.ftp,H=state.health,fat=plan.fat,hs=H?null:healthOn(state,iso(today));
  const coach=H?null:coachLine(plan,today,rd);
  const why=H?`Sinds ${dateLong(parseISO(H.from))} · ${HEALTH[H.kind].cap?'alleen korte, rustige ritjes':'niet trainen'}`:rd.lvl==='ok'?'':rd.why;
  /* cijfers voorop: vorm, fitheid en FTP; bij een ziekmelding alleen de melding */
  const sg=n=>n>0?'+'+n:n<0?'−'+(-n):'0';
  const nums=H?'':`<div class="nums"><div><span>Vorm</span><b>${sg(f.tsb)}</b></div><div><span>Fitheid</span><b>${f.ctl}</b></div><div><span>FTP</span><b>${ftp}<i>W</i></b></div></div>`;
  return `<div class="card"><div class="sthead"><div><p class="stat ${rd.lvl}"><i></i>${rd.label}</p>${why?`<p class="small muted" style="margin-top:4px">${why}</p>`:''}${coach?`<p class="small coachl">${coach.t}</p>${coach.btn?`<div class="row coachb">${coach.btn}</div>`:''}`:''}</div>
      ${H?'':`<button class="ibtn" data-act="openHealth" aria-label="Ziek of geblesseerd melden" title="Ziek of geblesseerd">${ICO.ziek}</button>`}</div>${nums}
    ${H?`<div class="hbtns"><button class="btn small pri" data-act="healthBetter">Ik ben weer beter</button><button class="btn small" data-act="openHealth">Aanpassen</button><button class="btn small" data-act="healthDrop">Intrekken</button></div>`
      :hs&&hs.ret?`<div class="row" style="margin-top:12px"><button class="btn small" data-act="healthUndo" data-from="${hs.h.from}">Melding intrekken</button></div>`:''}
    ${feelHTML(plan,today,H)}
    ${e&&e>ftp*1.02?`<p class="small" style="margin-top:10px">Je ritten wijzen op een hogere FTP. <button class="link" data-act="setFtp" data-w="${e}">FTP op ${e} W zetten</button></p>`:''}</div>`;
}
/* zonder de app: gefietst (een rit toevoegen, die wordt naast de training gelegd) of iets anders (hardlopen, kracht) */
const otherLine=d=>`<p class="small muted" style="margin-top:10px"><button class="link" data-act="openAdd" data-iso="${d.iso}">Rit toevoegen</button> · <button class="link" data-act="openCheck" data-iso="${d.iso}" data-m="other">Iets anders gedaan</button></p>`;
function dayCard(d,tk){
  const r=rideOn(d.iso);
  if(r)return `<button class="wcard" data-act="openRide" data-id="${r.id}"><div class="t"><div><h3>${esc(r.name)}</h3><div class="m">${r.type==='hardlopen'?'Gelopen':'Gereden'} · ${clock(r.dur)} · ${r.tss} TSS${cijfer(r)!=null?` · cijfer ${nl(cijfer(r).toFixed(1))}`:''}</div></div><span class="chev">${I.r}</span></div></button>`;
  if(d.event)return `<div class="wcard"><h3>${esc(d.event)}</h3><div class="m">Evenement</div></div>`;
  if(d.wo){
    const why={tijd:'geen tijd',moe:'te moe',ziek:'ziek'}[d.why],miss=why?`Niet gedaan (${why})`:'Gemist';
    const note=d.adj?`<div class="note moved">${esc(d.adj)}</div>`:d.missed?`<div class="note late">${d.movedTo!=null?miss+', verplaatst naar '+DAYS_L[d.movedTo]:d.why==='moe'?miss+'. De dagen erna zijn lichter.':miss}</div>`:d.movedFrom!=null?`<div class="note moved">Verplaatst van ${DAYS_L[d.movedFrom]}</div>`:'';
    const already=otherLine(d);
    const act=d.iso>tk?'':d.missed&&d.why?`<div class="row" style="margin-top:8px"><button class="link small" data-act="undoMissed" data-iso="${d.iso}">Toch niet: melding intrekken</button></div>`
      :d.iso===tk&&!d.missed?(canRide()?`<div class="row" style="margin-top:10px"><button class="btn pri big" data-act="startDay" data-iso="${d.iso}" style="flex:1">Start training</button>${swapBtn(d,'btn big')}<button class="btn big" data-act="openMissed" data-iso="${d.iso}">Lukt niet</button></div>${already}`
        :`<div class="noride"><span class="small muted">Rijden met je trainer doe je op je laptop, in Chrome of Edge.</span><span class="row">${swapBtn(d)}<button class="btn" data-act="openMissed" data-iso="${d.iso}">Lukt niet</button></span></div>${already}`)
      :`<div class="row" style="margin-top:8px"><button class="btn small" data-act="openMissed" data-iso="${d.iso}">Niet gedaan melden</button></div>`;
    return `<button class="wcard" data-act="openDay" data-iso="${d.iso}"><div class="t"><div><h3>${esc(d.wo.name)}</h3><div class="m">${metaOf(d.wo)}</div>${note}</div><span class="chev">${I.r}</span></div>${profileSVG(d.wo.segs)}</button>
      ${act}`;
  }
  const m=d.health&&d.health.during?`${healthWord(d.health.h).replace(/^./,c=>c.toUpperCase())} gemeld`:d.o.skip?'Overgeslagen':'';
  return `<div class="wcard"><div class="t"><div><h3>Rustdag</h3>${m?`<div class="m">${m}</div>`:''}</div><span class="row">${canRide()?'<button class="btn small" data-act="vrij">Vrij rijden</button>':''}<button class="btn small" data-act="openDay" data-iso="${d.iso}">Toch trainen</button></span></div></div>${d.iso===tk&&!(d.health&&d.health.during)?otherLine(d):''}`;
}
/* na een geplande training die voorbij is en waarvan de app niets weet: buiten gereden, iets anders gedaan, of niet gedaan.
   Geen vraag als je die dag reed, als je dezelfde training die week op een andere dag deed, of als hij is doorgeschoven.
   Alleen de laatste zeven dagen, de nieuwste eerst. */
function openChecks(today){
  const tk=iso(today),from=iso(addDays(today,-7)),rep=state.missed||{},out=[];
  for(const off of[-7,0])for(const d of planWeek(state,addDays(mondayOf(today),off),today).days)
    if(d.wo&&!d.event&&d.iso<tk&&d.iso>=from&&(!state.started||d.iso>=state.started)&&!rep[d.iso]&&!(d.health&&d.health.during)&&d.movedTo==null&&!state.rides.some(r=>!r.sim&&(r.date===d.iso||(r.type===d.wo.type&&iso(mondayOf(parseISO(r.date)))===iso(mondayOf(d.date))))))out.push(d);
  return out.sort((a,b)=>a.iso<b.iso?1:-1);
}
const checkBtns=k=>`<div class="cbtns"><button class="btn" data-act="openAdd" data-iso="${k}">Gefietst</button><button class="btn" data-act="openCheck" data-iso="${k}" data-m="other">Iets anders</button><button class="btn" data-act="openMissed" data-iso="${k}">Niet gedaan</button></div>`;
function checkCard(today){
  const l=openChecks(today);if(!l.length)return '';
  const d=l[0],y=d.iso===iso(addDays(today,-1)),when=y?'Gisteren':dateLong(d.date).replace(/^./,c=>c.toUpperCase());
  return `<div class="card"><h2>Hoe ging je training?</h2><p class="small muted" style="margin-top:3px">${when} · ${esc(d.wo.name)} · ${durTxt(d.wo.minutes)}</p>
    ${checkBtns(d.iso)}${l.length>1?`<p class="small muted" style="margin-top:10px">Nog ${l.length-1} ${l.length===2?'training':'trainingen'} zonder antwoord.</p>`:''}</div>`;
}
/* je tijd per week: elke week vraagt de app opnieuw hoeveel tijd je hebt. Op zondag voor volgende week,
   anders voor deze week als die nog niet is ingevuld. Tot je op Klaar tikt blijft de vraag staan (ui.wkAsk). */
function wkAskKey(today){
  const w=state.weeks||{},cur=iso(mondayOf(today)),next=iso(addDays(mondayOf(today),7));
  if(ui.wkAsk&&(ui.wkAsk===cur||ui.wkAsk===next))return ui.wkAsk;
  if(dow(today)===6&&!w[next])return next;
  return w[cur]?null:cur;
}
function weekAskCard(today){
  const k=wkAskKey(today);if(!k)return '';
  const mon=parseISO(k),sun=addDays(mon,6),nxt=k!==iso(mondayOf(today));
  const span=`${mon.getDate()}${mon.getMonth()!==sun.getMonth()?' '+MONTHS[mon.getMonth()].slice(0,3):''} – ${sun.getDate()} ${MONTHS[sun.getMonth()].slice(0,3)}`;
  return `<div class="card wkask"><div class="sthead"><div><h2>Hoeveel tijd heb je ${nxt?'volgende week':'deze week'}?</h2>
      <p class="small muted" style="margin-top:3px">Week ${weekNo(mon)} · ${span}. ${state.weeks[k]?'Tik op een dag om aan te passen.':'Nu ingevuld zoals de vorige week; tik op een dag om aan te passen.'}</p></div></div>
    <div style="margin-top:14px">${availEditor(k)}</div>
    <div class="row" style="margin-top:12px"><button class="btn pri" data-act="wkAskDone" data-k="${k}">Klaar</button></div></div>`;
}
/* waarom het schema er zo uitziet: ingeklapt onder de week, per onderwerp één of twee korte zinnen */
const joinEn=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' en '+a[a.length-1],cap=t=>t.replace(/^./,c=>c.toUpperCase());
function whyHTML(plan){
  const goal=GOALS[state.profile.goal]||GOALS.ftp,prof=plan.prof,sum=weekSum(plan),K=plan.ctx.kind,C=plan.coach;
  const phaseTxt={build:'Elke opbouwweek komt er iets meer werk bij in de zware blokken.',rec:'Minder en lichter, zodat het werk van de afgelopen weken kan landen.',base:'Vooral rustige uren en lange blokken onder je drempel.',peak:'De zwaarste weken, gericht op wat je evenement vraagt.',taper:'Korter trainen op dezelfde zwaarte, zodat je fris wordt en scherp blijft.',test:'Lichter, zodat je fris bent voor de test die laat zien wat het blok opleverde.',event:'Alleen korte prikkels. De vorm zit er al in, nu gaat het om fris aan de start staan.'}[K];
  const availM=plan.days.reduce((a,d)=>a+(d.event?0:d.minutes),0),idealM=r5(C.weekH*60),free=availM-sum.m;
  const basis=C.hist==null?`Bij jouw niveau past ongeveer ${durTxt(r5(C.ideal*60))} per week.`:`Je reed de laatste vier weken gemiddeld ${durTxt(r5(C.hist*60))} per week. Daar bouwen we op voort.`;
  const tijd=K==='event'||!sum.m?'':`Je hebt ${durTxt(availM)}, er staat ${durTxt(sum.m)} gepland.${free>=60&&idealM-sum.m<45?' Meer helpt deze week niet: je lichaam heeft de vrije dagen nodig.':free>=30?' De rest is rust: een korte rit vlak na een zware dag levert weinig op.':''}`;
  const pf=plan.ctx.toGo!=null&&evProfile(state.event),PS=pf&&profileSummary(pf,state.profile.ftp,state.profile.weight||75);
  const chk=plan.ctx.toGo!=null&&evCheck(state,state.event,new Date());
  const evt=PS?`${esc(pf.naam)}: ${Math.round(pf.afstand_km)} km${pf.hoogtemeters?`, ${Math.round(pf.hoogtemeters).toLocaleString('nl-NL')} hoogtemeters`:''}${PS.climbs.length?`, ${PS.climbs.length} hellingen van meestal ${durTxt(Math.max(1,Math.round(PS.median)))}`:''}.`:'';
  const evc=chk&&chk.st!=='ok'?`${chk.st==='krap'?'Krap':'Waarschijnlijk te zwaar'}: je bent op de dag ongeveer ${durTxt(r5(chk.h*60))} onderweg. Bij Profiel kun je een kortere afstand kiezen.`:'';
  const tr=plan.trend,ftpT=tr?`Van ${tr.from} naar ${tr.to} W. ${plan.stalled?'Weinig groei, dus deze weken ligt het accent anders.':tr.stall?'Weinig groei.':'Dit werkt, dus we gaan door.'}`:'';
  const bk=plan.ctx.toGo==null&&state.block,bkTxt=bk?blockLine().replace(/<[^>]+>/g,''):'';
  const rows=[['Deze week',esc(plan.label)+'. '+phaseTxt],['Doel',bkTxt],[prof===goal?goal.name:prof.name,esc(prof.plan)],['Jouw tijd',`${basis} ${tijd}`],['Evenement',[evt,evc].filter(Boolean).join(' ')],['Aangepast',rodeTxt(plan)],['FTP-test',ftpT],
    ['Zwaarte',state.levelAdj?`De zware trainingen staan een stap ${state.levelAdj>0?'zwaarder':'lichter'}. <button class="link" data-act="resetAdj">Terugzetten</button>`:'']].filter(r=>r[1]);
  return `<details class="why"><summary>Waarom dit schema?</summary><dl class="whyl">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl></details>`;
}
/* aangepast aan wat je echt deed: zwaarder of rustiger dan gepland */
function rodeTxt(plan){
  const on=fn=>joinEn(plan.days.filter(fn).map(d=>DAYS_L[d.i])),hard=on(d=>d.unplanned&&d.done.hard),long=on(d=>d.unplanned&&!d.done.hard&&d.done.long),swap=on(d=>d.easier&&d.done.long),easy=on(d=>d.easier&&!d.done.long);
  return [hard&&`${cap(hard)} trainde je zwaar, dus de dag erna is rustig en er valt een zware training af.`,long&&`${cap(long)} reed je lang, dus de dag erna is rustig.`,
    swap&&`${cap(swap)} reed je lang in plaats van de zware training.`,easy&&`${cap(easy)} ging rustiger dan gepland.`,swap||easy?'De zware training komt later in de week terug als dat past.':''].filter(Boolean).join(' ');
}
/* meer tijd adviseren alleen als het echt nodig is: voor je evenement, of ruim onder wat je doel vraagt */
function moreTimeTip(plan){
  if(state.health||plan.ctx.rec||['rec','taper','test','event'].includes(plan.ctx.kind))return '';
  const chk=plan.ctx.toGo!=null&&state.event&&evCheck(state,state.event,new Date());
  /* kort, zonder uitleg: alleen wat zou helpen */
  if(chk&&chk.st!=='ok')return chk.day?`Plan als het kan één dag van ${durTxt(r5(chk.dayNeed*60))}.`:`Je langste rit moet naar ${durTxt(r5(chk.need*60))}.`;
  const av=plan.days.reduce((a,d)=>a+(d.event?0:d.minutes),0),ideal=Math.round(plan.coach.ideal*2)*30;
  if(!av||ideal-av<60||av>=ideal*.6)return '';
  return plan.days.some(d=>d.minutes>=90)?`Meer tijd helpt: ongeveer ${durTxt(ideal)} per week.`:'Meer tijd helpt: één rit van anderhalf uur.';
}
/* de week: fase, voortgang, de dagen en je tijd per dag; met pijlen naar andere weken */
function weekCard(today){
  const tk=iso(today),mon=mondayOf(today),k=iso(mon),plan=planWeek(state,mon,today),sum=weekSum(plan);
  const planned=plan.days.filter(d=>d.wo),wk=state.rides.filter(r=>!r.sim&&r.date>=k&&r.date<=iso(addDays(mon,6))),doneM=Math.round(wk.reduce((a,r)=>a+r.dur,0)/60);
  const ev=state.event,evDate=ev&&ev.date?parseISO(ev.date):null,toEv=evDate?dayDiff(today,evDate):-1,sub=[esc(plan.label)];
  if(toEv>=0)sub.push(`${esc(ev.name)} over ${toEv} ${toEv===1?'dag':'dagen'}`);
  else if(state.block&&state.block.target)sub.push(`doel ${blockVal(state.block,state.block.target)} op ${dtShort(parseISO(state.block.end))}`);
  /* de week in één regel: de dagen zelf staan in de Kalender */
  const strip=plan.days.map(d=>`<button class="wsd${d.iso===tk?' today':''}" ${d.event?'disabled':realOn(d.iso)?`data-act="openRide" data-id="${realOn(d.iso).id}"`:`data-act="openDay" data-iso="${d.iso}"`} aria-label="${DAYS_L[d.i]} ${d.date.getDate()}: ${realOn(d.iso)?esc(realOn(d.iso).name)+', gereden':d.event?esc(d.event):d.wo?esc(d.wo.name):'rust'}"><span>${DAYS[d.i]}</span><b>${d.date.getDate()}</b>${dotFor(d,realOn(d.iso))}</button>`).join('');
  const open=ui.avOpen&&wkAskKey(today)!==k;
  return `<div class="card wk"><div class="wkhead"><div><h2>Week ${weekNo(mon)}</h2><p class="small muted">${sub.join(' · ')}</p></div>
      <div class="wnav"><button class="ibtn${open?' on':''}" data-act="avOpen" aria-pressed="${!!open}" aria-label="Tijd per dag" title="Tijd per dag">${ICO.tijd}</button></div></div>
    <div class="prog"><i style="width:${sum.m?Math.min(100,Math.round(doneM/sum.m*100)):0}%"></i></div>
    <div class="kvl"><span><b>${Math.min(wk.length,planned.length)} van ${planned.length}</b> trainingen</span><span>${durTxt(doneM)} van ${durTxt(sum.m)}</span></div>
    ${open?`<div class="wkedit">${availEditor(k)}</div>`:''}
    <div class="wstrip">${strip}</div>
    <div class="row spread" style="margin-top:6px;align-items:flex-start;flex-wrap:nowrap">${whyHTML(plan)}${canRide()?'<button class="btn small" data-act="zwoWeek">Zwift</button>':''}</div></div>`;
}
function vandaagView(){
  if(!state.setup)return setupView();
  const today=new Date(),tk=iso(today),mon=mondayOf(today),plan=planWeek(state,mon,today);
  logPlan(plan,today);
  const td=plan.days.find(d=>d.iso===tk);
  const pend=ui.pending?`<div class="notice row spread"><span>Onderbroken training: ${esc(ui.pending.wo.name)}, ${clock(ui.pending.rec.p.length)}</span><span class="row"><button class="btn small" data-act="pendSave">Opslaan</button><button class="btn small" data-act="pendDrop">Weggooien</button></span></div>`:'';
  let hide=false;try{hide=localStorage.getItem('kopwerk.synchint')==='0'}catch(e){}
  const sync=CONFIG.firebase&&syncInfo.ready&&!syncInfo.user&&!hide?`<div class="card row spread"><div><h3>Synchroniseren</h3><div class="small muted" style="margin-top:2px">Hetzelfde schema op je telefoon en laptop</div></div>
    <span class="row"><button class="btn small pri" data-act="syncLogin">Inloggen met Google</button><button class="btn small icon" data-act="syncHide" aria-label="Verbergen">${I.x}</button></span></div>`:'';
  return `<div class="head"><div><h1>Vandaag</h1><p>${dateLong(today).replace(/^./,c=>c.toUpperCase())}</p></div></div>
    <div class="home"><div class="stack">${pend}${sync}${statusCard(plan,today)}${checkCard(today)}${weekAskCard(today)}<div>${dayCard(td,tk)}</div>${weekCard(today)}</div></div>`;
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
  if(m.kind==='wo')return {wo:libWo(m.type,m.min)};
  const d=parseISO(m.iso),plan=planWeek(state,mondayOf(d),new Date());
  const day=plan.days.find(x=>x.iso===m.iso);
  return {wo:day.wo,day};
}
/* één knop: een andere training uit hetzelfde pakket, op dezelfde plek */
function swapBtn(d,cls='btn'){
  if(!d||!d.wo||!d.planType||d.logged||d.iso<iso(new Date())||packOf(d.planType,state).length<2)return '';
  return `<button class="${cls}" data-act="swapWo" data-iso="${d.iso}">Wissel</button>`;
}
function trainingView(){
  const x=modalWo();if(!x){ui.view='vandaag';return vandaagView()}
  const {wo:w,day}=x,from=TABS.find(t=>t[0]===((ui.detail&&ui.detail.from)||'vandaag'));
  const back=`<button class="back" data-act="back">${I.l}${from?from[1]:'Terug'}</button>`;
  const title=day?dateLong(day.date).replace(/^./,c=>c.toUpperCase()):'Losse training';
  let adjust='';
  if(day){
    const types=[['','Automatisch']].concat(Object.entries(TYPES).filter(([k])=>k!=='ramptest').map(([k,t])=>[k,t.name]));
    const ty=`<div class="form"><div><label class="f" for="m-type">Soort training</label>${sel('id="m-type" data-chg="ovType"',w?types:[['','Rust']].concat(types.slice(1)),day.o.type||'')}</div></div>`;
    adjust=w?(day.o.type?'<button class="link small" data-act="pickAlt" data-t="">Terug naar de training van het schema</button>':''):`<div class="card stack"><h3>Toch trainen</h3>${ty}</div>`;
  }
  if(!w)return `${back}<div class="head"><div><h1>Rustdag</h1><p>${title}</p></div></div>
    <div class="detail">${adjust}</div>`;
  const why=whyOn(day?day.date:new Date(),w.type),T=w.sec;
  const ticks=[0,.25,.5,.75,1].map(f=>`<span>${clock(f*T)}</span>`).join('');
  return `${back}<div class="head"><div><h1>${esc(w.name)}</h1><p>${title}</p></div></div>
    <div class="stack">
      <div>${profileSVG(w.segs)}<div class="axis">${ticks}</div></div>
      <div><div class="nrow"><div><b>${durTxt(w.minutes)}</b><span>duur</span></div><div><b>${w.tss}</b><span>TSS</span></div></div>
        </div>
      ${day&&day.iso<iso(new Date())&&!rideOn(day.iso)?`<div class="card"><h3>Hoe ging deze training?</h3>${state.missed&&state.missed[day.iso]?'<p class="small muted" style="margin-top:3px">Je meldde hem als niet gedaan. Toch gereden? Vul het hieronder in.</p>':''}${checkBtns(day.iso)}</div>`
      :canRide()?`<div class="cta"><button class="btn pri big" data-act="startModal">Start training</button>${swapBtn(day)}<button class="btn" data-act="zwoModal">Zwift</button></div>`:`<div class="noride"><span class="small muted">Rijden met je trainer doe je op je laptop, in Chrome of Edge.</span>${swapBtn(day)}</div>`}
      <div class="card stack"><p>${esc(w.desc)}</p>${why?`<details class="why"><summary>Waarom deze training?</summary><p class="small muted" style="margin-top:8px">${esc(why)}</p></details>`:''}</div>
      <details class="card fold"><summary>Specificatie</summary><div style="margin-top:8px">${segList(w)}</div></details>
      ${adjust}</div>`;
}

/* ---------- trainingen ---------- */
/* een losse training volgt je eigen niveau: geen keuze voor zwaarte, wel de trede die bij jou past */
function libWo(t,min){
  const mon=mondayOf(new Date()),ctx=weekCtx(state,mon),fat={level:0},C=coachTargets(state,mon,ctx,fat);
  return buildWorkout(t,min,1,lvlFor(state,t,C,ctx,fat));
}
/* zwaarte van een soort training: uit het gevoel dat erbij hoort (1-10) */
const ZWAAR=[['licht','Licht'],['middel','Gemiddeld'],['zwaar','Zwaar']],zwaarOf=t=>{const e=t==='ramptest'?10:rpeExp(t)??5;return e<=4?'licht':e<=6?'middel':'zwaar'};
const LIB_MIN=[30,45,60,75,90,120];
function libView(){
  const l=ui.lib,on=l.cats||[],zw=l.zw||[],n=on.length+zw.length;
  const keys=Object.keys(TYPES).filter(k=>(!on.length||on.includes(CAT_OF[k]))&&(!zw.length||zw.includes(zwaarOf(k))));
  const grp=(title,items)=>`<div class="libgrp" role="group" aria-label="${title}"><span>${title}</span><div>${items}</div></div>`;
  const cards=keys.map(k=>{const w=libWo(k,l.min);
    return `<button class="wcard" data-act="openWo" data-type="${k}"><h3>${esc(w.name)}</h3><div class="m">${durTxt(w.minutes)} · ${w.tss} TSS</div>${profileSVG(w.segs)}</button>`}).join('');
  return `<div class="head"><div><h1>Trainingen</h1></div>
    ${canRide()?'<div class="row"><button class="btn pri" data-act="vrij">Vrij rijden</button></div>':''}</div>
    <div class="libbar"><button class="btn small" data-act="libFilter" aria-expanded="${!!l.open}">Filter${n?` · ${n}`:''}</button><span class="small muted">${keys.length} trainingen · ${durTxt(l.min)}</span>${n?'<button class="link small" data-act="libClear">Wissen</button>':''}</div>
    ${l.open?`<div class="libfil">${grp('Soort',CATS.filter(([k])=>k).map(([k,t])=>`<button class="btn small" data-act="libCat" data-c="${k}" aria-pressed="${on.includes(k)}">${t}</button>`).join(''))}
      ${grp('Zwaarte',ZWAAR.map(([k,t])=>`<button class="btn small" data-act="libZw" data-z="${k}" aria-pressed="${zw.includes(k)}">${t}</button>`).join(''))}
      ${grp('Tijd',LIB_MIN.map(m=>`<button class="btn small" data-act="libMin" data-m="${m}" aria-pressed="${l.min===m}">${durTxt(m)}</button>`).join(''))}</div>`:''}
    <div class="grid">${cards}</div>${canRide()?'<p style="margin-top:18px"><button class="link small" data-act="demo">Bekijk de demo</button></p>':''}`;
}

/* ---------- ritten ---------- */
/* Vooruitgang: je FTP door de weken, wat je ritten erover zeggen en waar het schema je naartoe brengt. */
function progressCard(){
  const real=state.rides.filter(r=>!r.sim);if(!real.length)return '';
  const today=new Date(),mon=mondayOf(today),first=mondayOf(parseISO(real.reduce((a,r)=>r.date<a?r.date:a,real[0].date)));
  const NW=Math.min(26,Math.max(6,Math.round(dayDiff(first,mon)/7)+1)),N0=NW,log=(state.ftpLog||[]).slice().sort((a,b)=>a.d<b.d?-1:1),pts=[];
  for(let w=NW-1;w>=0;w--){const m=addDays(mon,-7*w),e=iso(addDays(m,6));
    /* ingestelde FTP aan het eind van die week; schatting uit je beste 20 minuten of een FTP-test in de zes weken ervoor */
    let f=null,fd='';for(const r of real)if(r.date<=e&&r.date>=fd&&r.ftp){f=r.ftp;fd=r.date}for(const x of log)if(x.d<=e&&x.d>=fd){f=x.w;fd=x.d}
    if(w===0)f=state.profile.ftp;
    const s0=iso(addDays(m,-35)),inW=real.filter(r=>r.date>=s0&&r.date<=e);
    /* de hoogste van: wat je echt voluit reed, en het midden van wat je ritten en je gevoel erover aangeven */
    const hard=Math.max(0,...inW.map(ftpEstimate)),soft=inW.map(ftpFromFeel).filter(v=>v).sort((a,b)=>a-b),mid=soft.length?soft[Math.floor(soft.length/2)]:0;
    const est=Math.round(Math.max(hard,mid));
    /* een schatting ver onder je FTP zegt alleen dat je niet voluit reed; die laten we weg */
    pts.push({m,f,est:est&&(!f||est>=f*.85)?est:null})}
  const kg=state.profile.weight||75,now=state.profile.ftp,est=pts[N0-1].est,bl=state.block&&blockKind(state.block.goal)!=='sprint'&&state.block.target&&!(state.event&&state.event.date>=iso(today))?state.block:null,goal=bl?bl.target:0;
  const e0=pts.slice(0,Math.max(1,N0-6)).reverse().map(p=>p.est).find(v=>v),grow=est&&e0&&N0>=7?est-e0:null,head=est||now,hk=head/kg;
  /* verwacht: als je het schema volgt. Groei per week hangt af van je niveau (hoe sterker, hoe trager) en van of je fitheid
     volgens het schema stijgt of daalt; samen nooit meer dan 12% erbij. Een schatting, geen belofte. */
  /* verwacht: met een doelblok het pad van het blok (van je FTP bij de start naar het doel op de einddatum);
     anders volgt het je schema: groei per week naar niveau en fitheid, samen nooit meer dan 12%. Een schatting, geen belofte. */
  let FW;
  if(bl){FW=Math.max(1,Math.round(dayDiff(mon,mondayOf(parseISO(bl.end)))/7));for(let k=1;k<=FW;k++){const m=addDays(mon,7*k);pts.push({m,fut:blockPath(bl,addDays(m,6))})}}
  else{FW=clamp(Math.round(horizonDays(today)/7),6,16);const path=fitnessPath(today,FW*7),c0=Math.max(path.now.ctl,15),g0=hk<2.5?.008:hk<3.2?.006:hk<4?.004:.0025;let fv=head;
    for(let k=1;k<=FW;k++){const p=path.fut[Math.min(path.fut.length-1,k*7-1)],ratio=p?p.ctl/c0:1;fv=Math.min(head*1.12,fv*(1+g0*clamp((ratio-.8)/.2,-.5,1.5)));pts.push({m:addDays(mon,7*k),fut:Math.round(fv)})}}
  const N=pts.length,vals=pts.flatMap(p=>[p.f,p.est,p.fut]).concat(goal?[goal]:[]).filter(v=>v),lo=Math.min(...vals)*.9,hi=Math.max(...vals)*1.05,y=v=>200-(v-lo)/(hi-lo)*200,X=i=>(i/(N-1)*1000).toFixed(1);
  const line=k=>{let d='',pen=false;pts.forEach((p,i)=>{const v=p[k];if(!v){pen=false;return}d+=k==='f'&&pen?`H${X(i)}V${y(v).toFixed(1)}`:`${pen?'L':'M'}${X(i)},${y(v).toFixed(1)}`;pen=true});return d};
  /* met een blok: het schema vanaf de start van het blok, ook het stuk dat al voorbij is; anders vanaf vandaag */
  const b0=bl?Math.max(0,pts.findIndex(p=>iso(addDays(p.m,6))>=bl.start)):N0-1;
  const futLine=bl?pts.slice(b0).map((p,j)=>`${j?'L':'M'}${X(b0+j)},${y(p.fut||blockPath(bl,addDays(p.m,6))).toFixed(1)}`).join(''):`M${X(N0-1)},${y(head).toFixed(1)}`+pts.slice(N0).map((p,j)=>`L${X(N0+j)},${y(p.fut).toFixed(1)}`).join('');
  const dt=m=>`${m.getDate()} ${MONTHS[m.getMonth()].slice(0,3)}`,q=(N0-1)/(N-1);
  const tk=`<span class="xl first" style="left:0">${dt(pts[0].m)}</span><span class="xl" style="left:${q*100}%">vandaag</span><span class="xl last" style="left:100%">${dt(pts[N-1].m)}</span>`;
  /* een los punt (nog geen lijn): als stip */
  const dots=pts.map((p,i)=>p.est&&!(pts[i-1]&&pts[i-1].est)&&!(pts[i+1]&&pts[i+1].est)?`<path d="M${X(i)},${y(p.est).toFixed(1)}h.01" stroke="var(--acc)" stroke-width="9" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`:'').join('');
  /* op schema? Alleen te zeggen na een FTP-test in dit blok: een schatting uit gewone ritten is daar te grof voor */
  const tst=bl?real.filter(r=>r.type==='ramptest'&&r.date>=bl.start&&ftpEstimate(r)).sort((a,b)=>a.date<b.date?1:-1)[0]:null,gap=tst?ftpEstimate(tst)-blockPath(bl,parseISO(tst.date)):null;
  const goalTxt=!bl?'':now>=goal?` · doel ${goal} W gehaald`:` · doel ${goal} W op ${dt(parseISO(bl.end))}${gap==null?'':gap>=-3?' · op schema':` · ${-gap} W achter`}`;
  SCRUB.ftp=f=>{
    const i=Math.round(f*(N-1)),p=pts[i],v=p.fut||p.est||p.f;
    return {x:i/(N-1),html:`<span>Week ${weekNo(p.m)} · ${dt(p.m)}${i===N0-1?' · nu':''}</span><span><b>${v||'–'} W</b> ${p.fut?(bl?'volgens schema':'verwacht'):p.est?'geschat':'ingesteld'}</span>${goal&&v&&goal>v?`<span>Nog ${goal-v} W tot je doel</span>`:p.est&&p.f?`<span>Ingesteld ${p.f} W</span>`:''}`};
  };
  const ftpCard=`<div class="card"><div class="bignum"><span>${est?'Geschatte FTP':'FTP'}</span><b>${head}<i>W</i></b><small>${nl(hk.toFixed(1))} W/kg · ${levelOf(hk)}${grow?` · <em class="${grow>0?'up':'down'}">${grow>0?'+':''}${grow} W</em> in zes weken`:''}${goalTxt}</small></div>
    <div class="chart" data-scrub="ftp" style="height:170px;margin-top:14px"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" aria-label="Je FTP: was, nu en verwacht">
      <line x1="${X(N0-1)}" x2="${X(N0-1)}" y1="0" y2="200" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>
      ${goal?`<line x1="0" x2="1000" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}" stroke="var(--ink)" stroke-opacity=".45" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/>`:''}
      <path d="${line('f')}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>
      <path d="${line('est')}" fill="none" stroke="var(--acc)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>${dots}
      <path d="${futLine}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/></svg>
      ${goal?`<span class="yl" style="top:${y(goal)/2}%">Doel ${goal} W</span>`:''}${tk}${scrubMarks}</div>
    <div class="legend">${pts.some(p=>p.est)?'<span><i style="background:var(--acc)"></i>Geschat</span>':''}<span><i class="dash"></i>Ingesteld</span><span><i class="dash" style="border-color:var(--acc)"></i>${bl?'Schema naar je doel':'Verwacht'}</span></div>
    ${est?'':'<p class="small muted" style="margin-top:10px">Nog geen schatting. Die komt uit een FTP-test, een stevig blok of je gevoel na een rit.</p>'}</div>`;
  return {ftpCard};
}
function addModal(){
  const t=iso(new Date()),k=ui.modal.iso||t,d=planWeek(state,mondayOf(parseISO(k)),new Date()).days.find(x=>x.iso===k),w=d&&d.wo&&!rideOn(k)?d.wo:null;
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Rit toevoegen">
    <div class="row spread"><h2>Rit toevoegen</h2><button class="btn small" data-act="closeModal">Sluiten</button></div>
    <div class="stack" style="padding-bottom:18px;border-bottom:1px solid var(--line)"><div><h3>Bestand van je fietscomputer</h3><p class="small muted" style="margin-top:3px">${w?`We leggen de rit naast ${esc(w.name)} en geven er een cijfer voor.`:'Een .fit- of .tcx-bestand, bijvoorbeeld van Garmin, Wahoo of Strava.'}</p></div>
      <div><label class="btn pri" style="cursor:pointer;display:inline-block">Kies .fit of .tcx<input type="file" accept=".fit,.tcx" data-chg="importRide" style="position:absolute;opacity:0;width:1px;height:1px"></label></div></div>
    <div class="stack"><h3>Of vul de rit zelf in</h3>
      <div class="form">
        <div><label class="f" for="a-date">Datum</label><input type="date" id="a-date" value="${k}" max="${t}"></div>
        <div><label class="f" for="a-min">Duur in minuten</label><input type="number" id="a-min" min="10" max="900" value="90"></div>
        <div><label class="f" for="a-eff">Hoe zwaar voelde het?</label>${sel('id="a-eff"',EFFORT.map((e,i)=>[i,e[1]]),1)}</div>
        <div><label class="f" for="a-pw">Gemiddeld vermogen</label><input type="number" id="a-pw" min="0" max="600" placeholder="optioneel"></div>
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
  const fs=r.ftpSet&&state.profile.ftp===r.ftpSet.to?r.ftpSet:null;
  const ftpBtn=fs?`<p class="small">Je FTP is bijgewerkt van ${fs.from} naar ${fs.to} W. Alle trainingen zijn daarop aangepast. <button class="link" data-act="setFtp" data-w="${fs.from}">Terugzetten naar ${fs.from} W</button></p>`
    :est&&Math.abs(est-state.profile.ftp)>=2&&(r.type==='ramptest'||est>state.profile.ftp*1.02)?`<button class="btn pri" data-act="setFtp" data-w="${est}">FTP bijwerken naar ${est} W</button>`:'';
  /* cijfer (of bij een FTP-test de uitkomst) met wat de coach ervan vindt */
  const mark=r.type==='ramptest'&&est?`<div class="grade"><b>${est}</b><span>W FTP</span></div>`:c!=null?`<div class="grade ${c>=7.5?'hi':c>=5.5?'mid':'lo'}"><b>${nl(c.toFixed(1))}</b><span>cijfer</span></div>`:'';
  const hero=v.length||mark?`<div class="card hero">${mark}<div class="herotxt"><p>${esc(v[0]||'')}</p>${v.slice(1).map(t=>`<p class="small muted">${esc(t)}</p>`).join('')}${ftpBtn?`<div style="margin-top:12px">${ftpBtn}</div>`:''}</div></div>`:'';
  /* met de hand ingevoerd: alleen wat je invulde; iets anders dan een training uit het schema heeft geen geplande duur */
  const other=r.manual&&!TYPES[r.type];
  const run=r.type==='hardlopen'&&r.dist;
  const keyN=[run?[nl((r.dist/1000).toFixed(1)),'km']:null,[clock(r.dur),!outdoor&&!other&&r.planned&&Math.abs(r.planned-r.dur)>30?`tijd · van ${clock(r.planned)}`:'tijd'],r.avgP?[r.avgP,'watt gemiddeld']:null,[r.tss,'TSS']].filter(Boolean);
  const keyM=[r.dist?`${nl((r.dist/1000).toFixed(1))} km`:'',r.np?`${r.np} W genormaliseerd`:'',r.avgHr?`♥ ${r.avgHr} bpm${r.maxHr?`, max ${r.maxHr}`:''}`:''].filter(Boolean).join(' · ');
  const keys=`<div class="nrow md">${keyN.map(([v,k])=>`<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>`;
  /* gevoel: eerst de vraag; na je antwoord een korte regel die je kunt aanpassen */
  const scale=`<div class="rpe">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-act="rpe" data-n="${n}" aria-pressed="${r.rpe===n}" aria-label="${n} van 10">${n}</button>`).join('')}</div><div class="rpel"><span>Moeiteloos</span><span>Alles gegeven</span></div>`;
  const rpe=r.sim?'':r.rpe==null?`<div class="card stack"><h3>Hoe zwaar voelde deze training?</h3>${scale}</div>`
    :`<div class="card"><div class="row spread"><span>Gevoel <b>${r.rpe}</b> van 10</span><button class="link small" data-act="rpeEdit">${ui.rpeEdit?'Klaar':'Aanpassen'}</button></div>${ui.rpeEdit?`<div class="stack" style="margin-top:12px">${scale}</div>`:''}</div>`;
  const prs=recordsHTML(r.prs);
  /* tijd per zone als één balk */
  const zs=r.zones||[],tot=zs.reduce((a,b)=>a+b,0);
  const zones=tot?`<div class="card"><h3 style="margin-bottom:12px">Tijd per zone</h3><div class="zstack">${zs.map((s,i)=>s?`<i style="flex:${s};background:var(--z${i+1})" title="${ZN[i+1]}"></i>`:'').join('')}</div>
      <div class="zonelist">${zs.map((s,i)=>s/tot>=.005?`<div><i style="background:var(--z${i+1})"></i><span>${ZN[i+1]}</span><b>${clock(s)}</b><em>${Math.round(s/tot*100)}%</em></div>`:'').join('')}</div></div>`:'';
  const chart=r.manual?'':`<div class="card"><h3 style="margin-bottom:10px">Verloop</h3>${rec?rideChart(r,rec):'<p class="muted">Geen meetgegevens op dit apparaat.</p>'}</div>`;
  /* diepgaande analyse */
  let deep='';
  if(ui.deep){
    const prd=new Set((r.prs||[]).map(x=>x.d));
    const more=`<div class="nrow sm"><div><b>${nl(r.IF.toFixed(2))}</b><span>intensiteit</span></div><div><b>${r.kj}</b><span>kJ</span></div>${r.avgCad?`<div><b>${r.avgCad}</b><span>rpm gemiddeld</span></div>`:''}</div>`;
    /* beste inspanningen: 1, 5 en 20 minuten, plus wat in deze rit een record was */
    const best=BESTS.filter(([w])=>r.best[w]&&(w===60||w===300||w===1200||prd.has(w))).map(([w,t])=>`<tr><td>${t}${prd.has(w)?' <span class="badge" style="background:var(--z5);color:#fff">Record</span>':''}</td><td>${r.best[w]} W</td></tr>`).join('');
    let hz='';
    if(rec&&r.avgHr){const mh=state.profile.maxHr;
      if(mh){const z=hrZones(rec.hr,mh),ht=z.reduce((a,b)=>a+b,0)||1;
        hz=`<div class="card"><h3 style="margin-bottom:10px">Tijd per hartslagzone</h3>${z.map((s,i)=>`<div class="zrow"><span>${HZN[i]}</span><span class="bar"><i style="width:${s/ht*100}%;background:var(--z${[1,2,3,5,6][i]})"></i></span><span>${clock(s)} &nbsp;${Math.round(s/ht*100)}%</span></div>`).join('')}
          ${r.maxHr>mh?`<p class="small muted" style="margin-top:10px">${r.maxHr} bpm gehaald, boven je maximum van ${mh}. Pas het aan bij Profiel.</p>`:''}</div>`}
      else hz=`<div class="card"><h3 style="margin-bottom:8px">Tijd per hartslagzone</h3><p class="muted">Vul je maximale hartslag in bij Profiel.</p></div>`}
    const why=verdictMore(r).map(t=>`<p class="small muted">${esc(t)}</p>`).join('');
    deep=`<div class="stack">${why?`<div class="stack" style="gap:6px">${why}</div>`:''}${keyM?`<p class="small muted">${keyM}</p>`:''}${more}<div class="cols"><div class="card"><h3 style="margin-bottom:8px">Beste inspanningen</h3><table><tbody>${best||'<tr><td class="muted">Geen vermogensgegevens.</td></tr>'}</tbody></table></div>${hz||'<div></div>'}</div>
      ${rec?'<div><button class="btn" data-act="csv">Download meetgegevens</button></div>':''}</div>`;
  }
  const from=TABS.find(t=>t[0]===tabOf('ride'))||TABS[1];
  return `<button class="back" data-act="back" data-v="${from[0]}">${I.l}${from[1]}</button>
    <div class="head"><div><h1>${esc(r.name)}${r.sim?' <span class="badge" style="vertical-align:middle">Demo</span>':''}</h1><p>${dateLong(d)} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}</p></div></div>
    <div class="stack">${r.perf&&/[?&]meet/.test(location.search)?`<div class="card"><h3 style="margin-bottom:6px">Meting 3D-wereld</h3><p><b>${r.perf.fps}</b> beelden per seconde · ${r.perf.big} haperingen · ${r.perf.small} gemiste beelden</p>${r.perf.list.length?`<p class="small muted" style="margin-top:6px">Grootste haperingen: ${r.perf.list.map(x=>`${clock(x.t)} (${x.ms} ms${x.b?', bijbouwen':''})`).join(', ')}</p>`:''}</div>`:''}${hero}${prs}${keys}${rpe}${chart}${zones}
      ${r.manual?'':`<button class="btn deepbtn" data-act="deep" aria-expanded="${!!ui.deep}">Meer cijfers<span aria-hidden="true">${ui.deep?I.up:I.down}</span></button>`}
      ${deep}
      <div><button class="link small down" data-act="delRide">${ui.confirm==='ride'?'Klik nog eens om te verwijderen':'Rit verwijderen'}</button></div></div>`;
}

/* ---------- profiel ---------- */
/* je evenement: de hellingen met hoe lang ze voor jou duren en met welk vermogen; en welk soort schema daarbij hoort */
function profileCard(){
  const ev=state.event,p=evProfile(ev);if(!p)return '';
  const S=profileSummary(p,state.profile.ftp,state.profile.weight||75),k=evKind(state),K=EVENTS[k];
  const rows=S.climbs.slice(0,15).map(c=>`<tr><td>${esc(c.naam)}</td><td>${nl((+c.lengte_km).toFixed(1))} km</td><td>${nl((+c.gemiddeld_pct).toFixed(1))}%${c.max_pct?` <span class="muted">max ${Math.round(c.max_pct)}%</span>`:''}</td><td>${clock(c.min*60)}</td><td>${c.watt} W</td></tr>`).join('');
  const how=S.climbs.length?`De hellingen duren voor jou meestal ${durTxt(Math.max(1,Math.round(S.median)))}${S.longest>S.median*1.5?`, de langste ${durTxt(Math.round(S.longest))}`:''}.`:'';
  return `<div class="card stack"><div><h2>${esc(p.naam)}</h2>
      <p class="muted small" style="margin-top:4px">${Math.round(p.afstand_km)} km${p.hoogtemeters?` · ${Math.round(p.hoogtemeters).toLocaleString('nl-NL')} hoogtemeters`:''}${S.climbs.length?` · ${S.climbs.length} ${S.climbs.length===1?'helling':'hellingen'}`:''}</p></div>
    <p style="max-width:70ch">${esc(p.kenmerken)}</p>
    ${K?`<p class="small" style="max-width:70ch"><b style="font-weight:600">Je schema: ${esc(K.name.toLowerCase())}.</b> <span class="muted">${how}</span></p>`:''}
    ${rows?`<div class="scroll"><table><thead><tr><th>Helling</th><th>Lengte</th><th>Stijging</th><th>Jouw tijd</th><th>Richtvermogen</th></tr></thead><tbody>${rows}</tbody></table></div>${S.climbs.length>15?`<p class="small muted">En nog ${S.climbs.length-15} hellingen.</p>`:''}`:''}
    ${p.lijst?'<p class="small muted">Richtwaarden; de route verschilt per jaar iets.</p>':''}</div>`;
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
    ${profileCard()}${linkCard()}
    <div class="card stack"><div><h2>Je gegevens</h2><p class="small muted" style="margin-top:4px">Een back-up bevat je schema, je instellingen en al je ritten.</p></div>
      <div class="row"><button class="btn" data-act="backup">Back-up downloaden</button><label class="btn" style="cursor:pointer">Back-up terugzetten<input type="file" accept=".json,application/json" data-chg="restore" style="position:absolute;opacity:0;width:1px;height:1px"></label></div></div>
    <div class="card dzone"><div><h3>Alles wissen</h3><p class="small muted" style="margin-top:3px">Verwijdert je schema, je instellingen en al je ritten.</p></div>
      <button class="btn warn" data-act="wipe">Alles wissen</button></div></div>`;
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
/* buiten gereden of iets anders gedaan: duur en hoe zwaar het voelde */
const CHECK_KIND={hardlopen:['Hardgelopen','Hardlopen','hardlopen'],training:['Een andere training','',''],buiten:['Buiten gefietst','Buitenrit','buiten'],fitness:['Krachttraining','Krachttraining','fitness'],anders:['Iets anders','Iets anders','anders']};
/* wat je invult bij hardlopen: snelheid, tempo en de belasting die daaruit volgt */
function runPreview(){
  const el=document.getElementById('c-run');if(!el)return;
  const km=+document.getElementById('c-km').value,min=+document.getElementById('c-min').value;
  if(!(km>0&&min>0)){el.textContent='';return}
  const L=runLoad(km,min,ui.modal&&ui.modal.rpe);
  el.innerHTML=`<b>${nl(L.kmh.toFixed(1))} km/u</b> · ${L.pace} per km · ongeveer <b>${L.tss} TSS</b>`;
}
function checkModal(){
  const M=ui.modal,day=planWeek(state,mondayOf(parseISO(M.iso)),new Date()).days.find(x=>x.iso===M.iso),w=day&&day.wo;
  const out=M.m==='buiten',when=dateLong(day.date).replace(/^./,c=>c.toUpperCase());
  return `<div class="veil" data-act="veil"><div class="modal narrow stack" role="dialog" aria-modal="true" aria-label="${out?'Buiten gereden':'Iets anders gedaan'}">
    <div><h2>${out?'Buiten gereden':'Iets anders gedaan'}</h2><p class="small muted" style="margin-top:3px">${M.pick?'Geen fietsrit: die voeg je toe met Rit toevoegen.':when+(out||!w?'':' · in plaats van '+esc(w.name))}</p></div>
    ${M.pick?`<div><label class="f" for="c-date">Wanneer?</label><input type="date" id="c-date" value="${M.iso}" max="${iso(new Date())}"></div>`:''}
    ${out?'':`<div class="opts">${Object.entries(CHECK_KIND).filter(([k])=>k!=='buiten'&&k!=='training').map(([k,v],i)=>`<label class="opt"><input type="radio" name="ck" value="${k}"${i?'':' checked'}><span><b>${v[0]}</b></span></label>`).join('')}</div>
    <div class="ckrun"><label class="f" for="c-km">Afstand in km</label><input type="number" id="c-km" min="0" max="100" step="0.1" inputmode="decimal" value="5" style="width:120px"></div>
    <div class="ckwo"><label class="f" for="c-wo">Welke training?</label><select id="c-wo" style="width:100%">${CATS.filter(([c])=>c&&c!=='test').map(([c,t])=>`<optgroup label="${t}">${Object.keys(TYPES).filter(k=>CAT_OF[k]===c&&!(w&&k===w.type)).map(k=>`<option value="${k}">${esc(TYPES[k].name)}</option>`).join('')}</optgroup>`).join('')}</select></div>`}
    <div><label class="f" for="c-min">Duur in minuten</label><input type="number" id="c-min" min="5" max="900" value="${out?(w?w.minutes:60):30}" style="width:120px"></div>
    ${out?'':'<p class="small ckrun" id="c-run"></p>'}
    <div><div class="f">Hoe zwaar voelde het?</div><div class="rpe">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-act="chkRpe" data-n="${n}" aria-pressed="${M.rpe===n}" aria-label="${n} van 10">${n}</button>`).join('')}</div>
      <div class="rpel" style="margin-top:6px"><span>Moeiteloos</span><span>Alles gegeven</span></div></div>
    <div class="mfoot"><button class="btn pri" data-act="saveCheck">Opslaan</button><button class="btn" data-act="closeModal">Annuleren</button></div></div></div>`;
}
/* ziek of geblesseerd melden of aanpassen */
function healthModal(){
  const H=state.health,cur=(H&&H.kind)||'ziekL',from=(H&&H.from)||ui.modal.from||iso(new Date());
  return `<div class="veil" data-act="veil"><div class="modal stack" role="dialog" aria-modal="true" aria-label="Ziek of geblesseerd">
    <h2>Ziek of geblesseerd</h2>
    <div class="opts">${Object.entries(HEALTH).map(([k,h])=>`<label class="opt"><input type="radio" name="hk" value="${k}"${k===cur?' checked':''}><span><b>${h.label}</b><small>${h.cap?'Alleen kort en rustig':'Niet trainen'}</small></span></label>`).join('')}</div>
    <div><label class="f" for="h-from">Sinds</label><input type="date" id="h-from" value="${from}" max="${iso(new Date())}"></div>
    <div class="mfoot"><button class="btn pri" data-act="saveHealth">Opslaan</button>${H?'<button class="btn" data-act="healthDrop">Melding intrekken</button>':''}<button class="btn" data-act="closeModal">Annuleren</button></div></div></div>`;
}
/* bevestigen voordat er iets verdwijnt: een back-up terugzetten of alles wissen */
const ritTxt=n=>`${n} ${n===1?'rit':'ritten'}`;
function restoreModal(){
  const n=state.rides.filter(r=>!r.sim).length,m=ui.modal.o.state.rides.filter(r=>!r.sim).length;
  return `<div class="veil" data-act="veil"><div class="modal narrow stack" role="dialog" aria-modal="true" aria-label="Back-up terugzetten">
    <h2>Back-up terugzetten?</h2>
    <p>Alles wat nu in Kopwerk staat${n?` (${ritTxt(n)})`:''} wordt vervangen door de back-up${m?` met ${ritTxt(m)}`:''}.</p>
    ${ui.modal.name?`<p class="small muted">${esc(ui.modal.name)}</p>`:''}
    <div class="row"><button class="btn danger" data-act="restoreGo">Vervangen</button><button class="btn" data-act="closeModal">Annuleren</button></div></div></div>`;
}
function wipeModal(){
  const n=state.rides.filter(r=>!r.sim).length;
  return `<div class="veil" data-act="veil"><div class="modal narrow stack" role="dialog" aria-modal="true" aria-label="Alles wissen">
    <h2>Alles wissen?</h2>
    <p>Je schema, je instellingen${n?` en ${ritTxt(n)}`:''} worden verwijderd. Dit kun je niet terugdraaien.</p>
    <div class="row"><button class="btn danger" data-act="wipeGo">Alles wissen</button><button class="btn" data-act="backup">Eerst een back-up</button><button class="btn" data-act="closeModal">Annuleren</button></div></div></div>`;
}
function modalHTML(){
  if(ui.modal&&ui.modal.kind==='restore')return restoreModal();
  if(ui.modal&&ui.modal.kind==='wipe')return wipeModal();
  if(ui.modal&&ui.modal.kind==='missed')return missedModal();
  if(ui.modal&&ui.modal.kind==='health')return healthModal();
  if(ui.modal&&ui.modal.kind==='add')return addModal();
  if(ui.modal&&ui.modal.kind==='check')return checkModal();
  return '';
}

function render(){
  const app=document.getElementById('app');
  if(ensureBlock(state,new Date()))save(false);
  if(P){renderPlayer();document.getElementById('modal').innerHTML='';return}
  if(W)worldClose();
  const views={vandaag:vandaagView,kalender:kalenderView,schema:kalenderView,ritten:kalenderView,prestaties:prestatiesView,voortgang:voortgangView,analyse:voortgangView,ride:rideView,lib:libView,profiel:profielView,settings:profielView,training:trainingView};
  const v=views[ui.view]||vandaagView,fe=document.activeElement,fid=fe&&fe.id&&/^(INPUT|SELECT|TEXTAREA)$/.test(fe.tagName)?fe.id:'';
  const body=v(),scr=typeof routeOf==='function'?routeOf():ui.view;
  enterMain=!!lastScreen&&scr!==lastScreen;lastScreen=scr;
  app.innerHTML=shell(body);
  if(fid){const el=document.getElementById(fid);if(el)el.focus({preventScroll:true})}
  /* wat je in het formulier had getypt, blijft staan als het scherm opnieuw wordt opgebouwd */
  if(ui.draft){for(const [id,val] of Object.entries(ui.draft)){const el=document.getElementById(id);if(el)el.value=val}
    const ev=document.querySelector('.evbox');if(ev&&Object.keys(ui.draft).some(k=>/^s-ev/.test(k)))ev.open=true}
  const mk=ui.modal?ui.modal.kind:'',mEl=document.getElementById('modal');
  mEl.innerHTML=modalHTML();
  /* een venster dat net opengaat komt zacht in beeld en krijgt de focus, zodat Tab binnen het venster begint */
  if(mk&&mk!==lastModal){const v=mEl.querySelector('.veil'),m=mEl.querySelector('.modal');if(v)v.classList.add('enter');if(m){m.tabIndex=-1;m.focus({preventScroll:true})}}
  lastModal=mk;
  initWheels();
  if(ui.view==='ride')bindChart();
  bindScrubs();if(ui.modal&&ui.modal.kind==='check')runPreview();
  routeSync();
}
async function openRide(id){
  if(ui.view!=='ride')ui.rideFrom=tabOf(ui.view);
  if(ui.rideId!==id){ui.deep=false;ui.rpeEdit=false}
  ui.view='ride';ui.rideId=id;ui.confirm='';
  if(!ui.streams||ui.streams.id!==id){ui.streams=null;render();const rec=await idb.get('s:'+id)||await syncGetStream(id);if(rec&&ui.rideId===id){ui.streams={id,rec};render()}}
  else render();
  window.scrollTo(0,0);
}
