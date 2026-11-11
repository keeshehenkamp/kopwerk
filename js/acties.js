'use strict';
/* ================= actions ================= */
function setOverride(k,patch){
  const o=Object.assign({},state.overrides[k],patch);
  for(const x of Object.keys(o))if(o[x]==null||o[x]===''||o[x]===false)delete o[x];
  if(Object.keys(o).length)state.overrides[k]=o;else delete state.overrides[k];
  save();render();
}
/* weergave: systeem, licht of donker; bewaard per apparaat */
const THEME_KEY='kopwerk.theme';
function getTheme(){try{return localStorage.getItem(THEME_KEY)||'auto'}catch(e){return 'auto'}}
function setTheme(t){try{if(t==='light'||t==='dark')localStorage.setItem(THEME_KEY,t);else localStorage.removeItem(THEME_KEY)}catch(e){}
  const r=document.documentElement;if(t==='light'||t==='dark')r.dataset.theme=t;else delete r.dataset.theme}
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(getTheme()==='auto'&&!P)render()});
/* elke FTP-wijziging met datum, voor de lijn in Vooruitgang (per dag alleen de laatste) */
function logFtp(w){const d=iso(new Date()),l=state.ftpLog||(state.ftpLog=[]),x=l.find(e=>e.d===d);if(x)x.w=w;else l.push({d,w})}
/* ---------- adres in de browser ----------
   Elk scherm heeft een eigen adres (#/kalender, #/rit/<id>, #/dag/<datum>). Daardoor werken terug en vooruit
   in de browser en op je telefoon, en blijf je na verversen op hetzelfde scherm. */
let routeKey=null,routeIdx=0,routeLock=false;
const ROUTE_VIEWS=['kalender','prestaties','voortgang','profiel','lib'];
function routeOf(){
  const v=ui.view,d=ui.detail;
  if(v==='ride'&&ui.rideId)return '#/rit/'+encodeURIComponent(ui.rideId);
  if(v==='training'&&d)return d.kind==='day'?'#/dag/'+d.iso:`#/training/${d.type}/${d.min}`;
  return ROUTE_VIEWS.includes(v)?'#/'+v:'#/';
}
const routeState=()=>({view:ui.view,detail:ui.detail,rideId:ui.rideId,rideFrom:ui.rideFrom,i:routeIdx});
function routeParse(h){
  let p=[];try{p=(h||'').replace(/^#\/?/,'').split('/').map(decodeURIComponent)}catch(e){}
  if(p[0]==='rit'&&p[1]&&state.rides.some(r=>r.id===p[1]))return {view:'ride',rideId:p[1],rideFrom:'kalender'};
  if(p[0]==='dag'&&rideOn(p[1]))return {view:'ride',rideId:rideOn(p[1]).id,rideFrom:'kalender'};
  if(p[0]==='dag'&&/^\d{4}-\d{2}-\d{2}$/.test(p[1]||''))return {view:'training',detail:{kind:'day',iso:p[1],from:'vandaag'}};
  if(p[0]==='training'&&TYPES[p[1]])return {view:'training',detail:{kind:'wo',type:p[1],min:+p[2]||60,from:'lib'}};
  return {view:ROUTE_VIEWS.includes(p[0])?p[0]:'vandaag'};
}
/* na elke render: is het scherm veranderd, dan komt er een stap in de geschiedenis bij */
function routeSync(){
  if(!state.setup||P)return;
  const k=routeOf();if(k===routeKey)return;
  try{if(routeKey===null||routeLock)history.replaceState(routeState(),'',k);else{routeIdx++;history.pushState(routeState(),'',k)}}catch(e){}
  routeKey=k;
}
function routeApply(s){
  ui.view=s.view||'vandaag';ui.detail=s.detail||null;ui.modal=null;ui.confirm='';ui.draft=null;
  if(s.rideFrom)ui.rideFrom=s.rideFrom;
  routeLock=true;
  if(ui.view==='ride'&&s.rideId)openRide(s.rideId);else render();
  routeLock=false;
}
/* de terugknop in de app doet hetzelfde als die van de browser, zolang er een vorig scherm is */
function routeBack(){const s=history.state;if(s&&s.i>0&&!P){history.back();return true}return false}
window.addEventListener('popstate',e=>{
  const s=e.state,here=s&&typeof s.i==='number'?s.i:0;
  /* tijdens een rit blijf je waar je bent; een open venster sluit */
  if(P||ui.modal){routeIdx=here+1;try{history.pushState(routeState(),'',routeKey||'#/')}catch(_){}
    if(!P&&ui.modal){ui.modal=null;render()}return}
  routeIdx=here;routeApply(s&&s.view?s:routeParse(location.hash));
});
const actions={
  nav(d){ui.view=d.v;ui.modal=null;ui.confirm='';ui.draft=null;render();window.scrollTo(0,0)},
  back(d){if(routeBack())return;ui.view=(d&&d.v)||(ui.detail&&ui.detail.from)||'vandaag';render();window.scrollTo(0,0)},
  /* een dag waarop je reed: laat zien wat je echt deed, niet wat er gepland stond */
  openDay(d){const r=rideOn(d.iso);if(r)return actions.openRide({id:r.id});ui.detail={kind:'day',iso:d.iso,from:tabOf(ui.view)};ui.view='training';render();window.scrollTo(0,0)},
  /* je tijd per dag: dag kiezen, wiel bewaart zodra het stilstaat */
  /* de wekelijkse vraag: zonder wijziging telt de week zoals hij er staat (de vorige week) */
  wkAskDone(d){const k=d.k;if(!state.weeks[k]){state.weeks[k]=weekAvail(state,parseISO(k)).slice();save()}ui.wkAsk=null;ui.avSel=null;render();toast('Je schema voor week '+weekNo(parseISO(k))+' staat klaar.')},
  /* voorstel van de coach: een rit langer, of deze week niet */
  coachMore(d){setOverride(d.iso,{minutes:+d.m});toast('Je rit is langer gemaakt.')},
  coachNo(d){(state.coachNo=state.coachNo||{})[d.k]=1;save();render()},
  avDay(d){const i=+d.i;ui.avSel=ui.avSel&&ui.avSel.k===d.k&&ui.avSel.i===i?null:{k:d.k,i};avRefresh(d.k)},
  wheelTo(d,el){const w=el.closest('.wheel');if(w)w.scrollTo({top:+d.i*WROW,behavior:'smooth'})},
  avPick(d){
    const k=d.k,sel=ui.avSel;if(!sel||sel.k!==k)return;const m=+d.m,i=sel.i;
    if(k==='setup'){ui.setupAvail[i]=m;const t=document.querySelector('.aved[data-k="setup"] .avtot'),tot=ui.setupAvail.reduce((x,y)=>x+y,0);if(t)t.textContent=tot?durTxt(tot)+' beschikbaar':'Nog geen tijd gekozen';return}
    const w=avWeek(k);if(w.lock[i])return;w.mins[i]=m;state.weeks[k]=w.mins.slice();
    /* bezig met de wekelijkse vraag: die blijft staan tot je op Klaar tikt */
    if(document.querySelector('.wkask .aved[data-k="'+k+'"]'))ui.wkAsk=k;
    /* de week is nu de bron; losse aanpassingen per dag vervallen */
    const mon=parseISO(k);for(let j=0;j<7;j++){const kk=iso(addDays(mon,j)),o=state.overrides[kk];if(o){delete o.minutes;delete o.skip;if(!Object.keys(o).length)delete state.overrides[kk]}}
    save();render();
  },
  /* training niet gedaan, met een reden */
  openMissed(d){ui.modal={kind:'missed',iso:d.iso};render()},
  missedWhy(d){const k=ui.modal&&ui.modal.iso;if(!k)return;state.missed=state.missed||{};state.missed[k]={why:d.why,ts:Date.now()};
    if(d.why==='ziek'){ui.modal={kind:'health',from:k};save();return render()}
    ui.modal=null;save();render();toast(d.why==='tijd'?'Genoteerd. Als het past, schuift de training naar een andere dag.':'Genoteerd. De rest van de week is een stap lichter.')},
  undoMissed(d){if(state.missed)delete state.missed[d.iso];save();render()},
  /* ziek of geblesseerd */
  openHealth(){ui.modal={kind:'health'};render()},
  saveHealth(){const k=document.querySelector('input[name="hk"]:checked'),f=document.getElementById('h-from').value,tk=iso(new Date());
    if(!k||!HEALTH[k.value])return;state.health={kind:k.value,from:/^\d{4}-\d{2}-\d{2}$/.test(f)&&f<=tk?f:tk};ui.modal=null;save();render();window.scrollTo(0,0);
    toast(HEALTH[k.value].cap?'Doorgegeven. Je schema heeft nu alleen korte, rustige ritjes.':'Doorgegeven. Er staan geen trainingen meer gepland tot je weer beter bent.')},
  healthDrop(){state.health=null;ui.modal=null;save();render();toast('Melding ingetrokken')},
  /* een melding die je al had afgesloten toch intrekken: dan vervalt ook de opbouw daarna */
  healthUndo(d){state.healthLog=(state.healthLog||[]).filter(h=>h.from!==d.from);
    for(const [k,v] of Object.entries(state.missed||{}))if(v.why==='ziek'&&k>=d.from)delete state.missed[k];
    save();render();toast('Melding ingetrokken. Je schema is weer gewoon.')},
  healthBetter(){const h=state.health;if(!h)return;const y=iso(addDays(new Date(),-1));state.health=null;
    if(y>=h.from){h.to=y;(state.healthLog=state.healthLog||[]).push(h)}
    const n=y>=h.from?dayDiff(parseISO(h.from),parseISO(y))+1:0;save();render();window.scrollTo(0,0);
    toast(n<=3?'Fijn. Eerst rustig, daarna weer volgens schema.':n<=14?'Fijn. De komende week bouw je rustig op.':'Fijn. De komende weken bouw je rustig op, met daarna een FTP-test.')},
  openWo(d){ui.detail={kind:'wo',type:d.type,min:+d.m||ui.lib.min||60,from:'lib'};ui.view='training';render();window.scrollTo(0,0)},
  closeModal(){ui.modal=null;render()},
  veil(d,el,e){if(e.target===el){ui.modal=null;render()}},
  startDay(d){ui.detail={kind:'day',iso:d.iso,from:tabOf(ui.view)};const x=modalWo();if(x&&x.wo)openPlayer(x.wo)},
  startModal(){const x=modalWo();if(x&&x.wo)openPlayer(x.wo)},
  zwoModal(){const x=modalWo();if(x&&x.wo)saveZwo([{name:slug(x.wo.name),wo:x.wo}],slug(x.wo.name))},
  zwoWeek(){
    const mon=mondayOf(new Date()),p=planWeek(state,mon,new Date());
    const list=p.days.filter(d=>d.wo).map(d=>({name:`${d.i+1}-${DAYS[d.i]}-${slug(d.wo.name)}`,wo:d.wo}));
    if(!list.length)return toast('Deze week staat er niets gepland.');
    saveZwo(list,`kopwerk-week-${weekNo(mon)}`);
  },
  pickAlt(d){setOverride(ui.detail.iso,{type:d.t||null});window.scrollTo(0,0);toast(d.t?`${TYPES[d.t].name} staat nu op het schema.`:'Weer de training van het schema.')},
  ovType(d,el){setOverride(ui.detail.iso,{type:el.value||null})},
  libMin(d){ui.lib.min=ui.lib.min===+d.m?null:+d.m;render()},
  resetAdj(){state.levelAdj=0;save();render()},
  saveSettings(d,el,e,quiet){
    const g=id=>document.getElementById(id);
    const ftp=clamp(Math.round(+g('s-ftp').value)||200,60,600),w=clamp(+g('s-w').value||75,35,200);
    const val=id=>g(id)?g(id).value:'';
    const mh=g('s-mhr')?Math.round(+g('s-mhr').value)||0:state.profile.maxHr||0,evd=val('s-evd'),evn=val('s-evn').trim(),evid=val('s-evid');
    if(ftp!==state.profile.ftp)logFtp(ftp);
    const niv=NIVEAU[val('s-niv')]?val('s-niv'):state.profile.niveau;
    state.profile=Object.assign({ftp,weight:w,goal:g('s-goal').value,sound:g('s-snd')?g('s-snd').value==='1':state.profile.sound!==false,maxHr:mh?clamp(mh,120,230):0,ftpTest:g('s-ftest')?g('s-ftest').value:state.profile.ftpTest||'ramp'},niv?{niveau:niv}:{});
    const evk=val('s-evk'),evkm=Math.round(+val('s-evkm'))||0,date=/^\d{4}-\d{2}-\d{2}$/.test(evd)?evd:'';
    const old=state.event;
    /* uit de lijst: naam, afstand en hellingen komen uit de lijst. Zonder datum blijft je keuze staan, maar plant de coach nog niet naar het evenement. */
    if(EVBY[evid]){const v=old&&old.id&&old.id!==evid?0:clamp(+val('s-evv')||0,0,EVBY[evid].v.length-1);state.event={id:evid,v,name:EVBY[evid].naam,date}}
    else if(evid==='eigen'){
      const keep=old&&!old.id&&old.profile&&old.name===(evn||'Evenement')?{profile:old.profile}:{};
      state.event=Object.assign({name:evn||'Evenement',date},EVENTS[evk]?{kind:evk}:{},evkm?{km:clamp(evkm,20,400)}:{},keep);
    }else state.event=null;
    if(!state.setup&&ui.setupAvail)state.avail=ui.setupAvail.slice();
    if(!state.setup){state.setup=true;state.started=iso(new Date());if(g('s-ftp').value.trim())state.ftpGiven=state.started;state.planStart=iso(mondayOf(new Date()));state.weeks[state.planStart]=state.avail.slice();ui.view='vandaag'}
    ui.draft=null;save();
    /* in Profiel wordt elke wijziging meteen bewaard, zonder het scherm opnieuw op te bouwen (dan blijft je toetsenbord open) */
    if(quiet){const f=document.querySelector('.side .ftp b');if(f)f.textContent=state.profile.ftp;return toast('Opgeslagen')}
    render();toast(!state.avail.some(x=>x)?'Opgeslagen. Je hebt nog geen trainingsdagen gekozen.':state.event&&!state.event.date?'Opgeslagen. Vul nog de datum van je evenement in; tot dan volgt het schema je doel.':'Opgeslagen');
  },
  openRide(d){ui.modal=null;openRide(d.id)},
  /* training afronden: wat je deed, de gegevens, hoe zwaar het was. Daarna de analyse op het ritscherm */
  openLog(d){ui.modal={kind:'log',iso:d.iso||iso(new Date()),pick:!!d.p,step:0,rpe:null};render()},
  logHow(d){const M=ui.modal;M.how=d.how;M.step=1;render()},
  logBack(){const M=ui.modal;M.step--;M.ride=null;M.rec=null;render()},
  logNext(){
    const M=ui.modal,g=id=>document.getElementById(id),dEl=g('c-date');
    if(dEl){if(!/^\d{4}-\d{2}-\d{2}$/.test(dEl.value)||dEl.value>iso(new Date()))return toast('Kies een datum van vandaag of eerder.');M.iso=dEl.value}
    const min=clamp(Math.round(+g('c-min').value)||0,0,900),km=g('c-km')?+g('c-km').value||0:0;
    if(min<5)return toast('Vul in hoe lang je bezig was.');
    if(M.how==='hardlopen'&&km<.2)return toast('Vul in hoeveel kilometer je liep.');
    M.min=min;M.km=km;M.name=g('c-name')?g('c-name').value.trim():'';M.step=2;render();
  },
  logRpe(d,el){ui.modal.rpe=+d.n;el.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===el)))},
  logFile(d,el){
    const f=el.files&&el.files[0];if(!f)return;
    const isFit=/\.fit$/i.test(f.name),rd=new FileReader();
    rd.onload=()=>{
      try{
        const txt=rd.result,r=resample(isFit?parseFit(txt):/\.gpx$/i.test(f.name)?parseGpx(txt):parseTcx(txt));
        if(r.rec.p.length<120)throw 0;
        const start=r.start||Date.now(),ride=makeRide({wo:{name:'Buitenrit',type:'buiten',sec:r.rec.p.length},ftp:state.profile.ftp,rec:r.rec,dist:r.dist,laps:[{l:'Buitenrit',k:'steady',c:0,s:0}],sim:false,startTs:start});
        ride.id='i'+Math.round(start/1000).toString(36);ride.adj=true;ride.dist=r.dist;
        if(state.rides.some(x=>x.id===ride.id)){ui.modal=null;render();return toast('Deze rit staat er al in.')}
        if(!r.hasP){ride.noPower=true;ride.best={};ride.zones=[0,0,0,0,0,0,0]}
        else matchPlan(ride,r.rec);
        Object.assign(ui.modal,{ride,rec:r.rec,step:2,iso:ride.date});render();
      }catch(e){toast('Dit bestand kon niet worden gelezen. Gebruik een .fit-, .gpx- of .tcx-bestand van een rit.')}
    };
    if(isFit)rd.readAsArrayBuffer(f);else rd.readAsText(f);
  },
  async logSave(){
    const M=ui.modal;if(!M||M.kind!=='log')return;
    if(!M.rpe)return toast('Kies hoe zwaar het was.');
    const before=planSnap(),day=planWeek(state,mondayOf(parseISO(M.iso)),new Date()).days.find(x=>x.iso===M.iso),w=day&&day.wo&&!rideOn(M.iso)?day.wo:null;
    let ride=M.ride;
    if(!ride){
      const K=LOG_KIND[M.how];
      ride={id:'m'+Date.now().toString(36),dist:Math.round((M.km||0)*1000),date:M.iso,ts:parseISO(M.iso).getTime()+18*36e5,name:M.name||K.name,type:K.type,lvl:null,manual:true,planned:M.min*60,ftp:state.profile.ftp,sim:false,rpe:null,adj:true,laps:[],
        dur:M.min*60,avgP:0,np:0,IF:0,tss:0,kj:0,avgHr:0,maxHr:0,avgCad:0,zones:[0,0,0,0,0,0,0],best:{},score:null,decoup:null};
    }
    ride.rpe=M.rpe;
    if(ride.manual&&ride.type!=='buiten'&&w)ride.instead=w.name;
    matchFeel(ride);feelLoad(ride);
    if(M.rec&&!ride.noPower)learnHr(M.rec,ride.ftp);
    if(LADDER[ride.type]&&ride.lvl&&!ride.adj){applyProg(ride);ride.adj=true;ride.rpeAdj=true}
    if(!ride.manual)markRecords(ride);
    if(state.missed)delete state.missed[ride.date];
    state.rides.push(ride);ride.change=planDiff(before,ride);save();
    if(M.rec)await idb.put('s:'+ride.id,M.rec);
    ui.planBefore={id:ride.id,snap:before};ui.modal=null;ui.rideFrom=tabOf(ui.view);ui.deep=false;ui.rpeEdit=false;ui.streams=M.rec?{id:ride.id,rec:M.rec}:null;ui.view='ride';ui.rideId=ride.id;render();window.scrollTo(0,0);
  },
  repeat(){
    if(!P||P.mode==='ready'||P.free)return;
    const i=segAt(P.pos),sg=P.wo.segs,s=sg[i],nx=sg[i+1],pv=sg[i-1];
    const cp=x=>Object.assign({},x,{label:x.label.replace(/ \d+ van \d+$/,'')+' extra'});
    if(s.kind==='work')sg.splice(i+1,0,...(nx&&nx.kind==='rest'?[Object.assign({},nx),cp(s)]:[S(180,.55,null,'Herstel','rest'),cp(s)]));
    else if(s.kind==='rest'&&pv&&pv.kind==='work')sg.splice(i+1,0,cp(pv),Object.assign({},s));
    else return;
    rebuild();renderPlayer();toast('Extra blok toegevoegd.');
  },
  extend(){if(!P||P.mode==='ready'||P.free)return;P.wo.segs.push(S(300,.45,null,'Extra uitrijden','cooldown'));rebuild();renderPlayer();toast('5 minuten uitrijden toegevoegd.')},
  toggleCad(){ui.showCad=!ui.showCad;render()},
  deep(){ui.deep=!ui.deep;render()},
  rpeEdit(){ui.rpeEdit=!ui.rpeEdit;render()},
  rpe(d){
    const r=state.rides.find(x=>x.id===ui.rideId);if(!r)return;
    const before=ui.planBefore&&ui.planBefore.id===r.id?ui.planBefore.snap:planSnap();
    r.rpe=+d.n;matchFeel(r);feelLoad(r);
    /* je gevoel en de uitvoering bepalen de volgende trede van deze soort training;
       pas je je antwoord aan, dan telt het nieuwe zolang er nog geen nieuwere rit van deze soort is beoordeeld */
    const later=state.rides.some(x=>x!==r&&!x.sim&&x.type===r.type&&x.ts>r.ts&&x.rpe!=null);
    if(!r.sim&&LADDER[r.type]&&r.lvl&&(!r.adj||(r.rpeAdj&&!later))){
      applyProg(r,r.adj);r.adj=true;r.rpeAdj=true;
    }
    r.change=planDiff(before,r);ui.planBefore={id:r.id,snap:before};
    ui.rpeEdit=false;save();render();
  },
  /* een kortere afstand van hetzelfde evenement kiezen (vanuit de melding 'te zwaar') */
  evAlt(d){
    const el=document.getElementById('s-evv');if(el)el.value=d.v;(ui.draft=ui.draft||{})['s-evv']=String(d.v);
    if(state.setup&&ui.view==='profiel'){if(state.event)state.event.v=+d.v;save();toast('Afstand aangepast. Je schema is erop afgestemd.')}
    render();
  },
  libFilter(){ui.lib.open=!ui.lib.open;render()},
  libCat(d){const c=ui.lib.cats=ui.lib.cats||[],i=c.indexOf(d.c);if(i<0)c.push(d.c);else c.splice(i,1);render()},
  libZw(d){const z=ui.lib.zw=ui.lib.zw||[],i=z.indexOf(d.z);if(i<0)z.push(d.z);else z.splice(i,1);render()},
  libClear(){ui.lib.cats=[];ui.lib.zw=[];ui.lib.min=null;render()},
  /* wisselen: de volgende uit het pakket; na de laatste weer de training van het schema */
  swapWo(d){
    const day=planWeek(state,mondayOf(parseISO(d.iso)),new Date()).days.find(x=>x.iso===d.iso);if(!day||!day.wo||!day.planType)return;
    const p=packOf(day.planType,state),n=p[(p.indexOf(day.wo.type)+1)%p.length];
    setOverride(d.iso,{swap:n===day.planType?null:n});
  },
  syncLogin(){syncLogin()},
  syncHide(){try{localStorage.setItem('kopwerk.synchint','0')}catch(e){}render()},
  syncLogout(){syncLogout()},
  stravaConnect(){stravaConnect()},
  stravaFetch(){stravaFetch(true)},
  stravaOff(){delete state.strava;save();render();toast('Strava is ontkoppeld.')},
  calEdit(d){ui.calEdit=ui.calEdit===d.k?null:d.k;ui.avSel=null;render()},
  perf(d){ui.perf=+d.p;render()},
  theme(d,el){setTheme(el.value);render()},
  themeToggle(){setTheme(isDark()?'light':'dark');render()},
  setFtp(d){state.profile.ftp=+d.w;logFtp(+d.w);save();render();toast(`FTP is nu ${d.w} W. Alle trainingen zijn daarop aangepast.`)},
  async delRide(){
    if(ui.confirm!=='ride'){ui.confirm='ride';return render()}
    const id=ui.rideId;state.rides=state.rides.filter(r=>r.id!==id);state.deleted=(state.deleted||[]).concat(id);save();await idb.del('s:'+id);
    /* de verwijderde rit hoort niet in de geschiedenis: dit scherm vervangt hem */
    ui.confirm='';ui.view=ui.rideFrom||'kalender';ui.streams=null;routeLock=true;render();routeLock=false;
  },
  csv(){
    const r=state.rides.find(x=>x.id===ui.rideId),s=ui.streams;if(!r||!s)return;
    const rows=['seconde,vermogen_w,doel_w,hartslag,cadans'];
    for(let i=0;i<s.rec.p.length;i++)rows.push(`${i},${s.rec.p[i]},${s.rec.tgt[i]},${s.rec.hr[i]||''},${s.rec.cad[i]||''}`);
    saveFile(`kopwerk-${r.date}-${slug(r.name)}.csv`,rows.join('\n'));
  },
  async backup(){
    const streams={};for(const r of state.rides){const s=await idb.get('s:'+r.id);if(s)streams[r.id]=s}
    saveFile(`kopwerk-backup-${iso(new Date())}.json`,JSON.stringify({app:'kopwerk',v:1,state:Object.assign({},state,{strava:undefined}),streams}));
  },
  restore(d,el){
    const f=el.files&&el.files[0];if(!f)return;
    const rd=new FileReader();
    /* eerst lezen en controleren, dan vragen: terugzetten vervangt alles */
    rd.onload=()=>{
      try{
        const o=JSON.parse(rd.result);
        if(!o||o.app!=='kopwerk'||!o.state||!Array.isArray(o.state.rides)||!o.state.profile)throw 0;
        ui.modal={kind:'restore',o,name:f.name};render();
      }catch(e){el.value='';toast('Dit bestand is geen back-up van Kopwerk.')}
    };
    rd.readAsText(f);
  },
  async restoreGo(){
    const o=ui.modal&&ui.modal.kind==='restore'&&ui.modal.o;if(!o)return;
    state=Object.assign(defaults(),o.state,{strava:state.strava});save();
    for(const[id,s]of Object.entries(o.streams||{}))if(s&&Array.isArray(s.p))await idb.put('s:'+id,s);
    ui.modal=null;ui.streams=null;render();toast('Back-up teruggezet.');
  },
  wipe(){ui.modal={kind:'wipe'};render()},
  /* welkom: drie stappen; wat je invulde blijft staan (ui.draft en ui.setupAvail) */
  setupStep(d){ui.step=clamp(+d.s||0,0,2);render();window.scrollTo(0,0)},
  async wipeGo(){
    state=defaults();save();await idb.clear();ui.modal=null;ui.confirm='';ui.step=0;ui.view='vandaag';ui.detail=null;ui.streams=null;ui.pending=null;routeKey=null;render();
  },
  async pendSave(){const a=ui.pending;ui.pending=null;if(a){await storeRide(a);render()}},
  async pendDrop(){ui.pending=null;await idb.del('active');render()},
  /* player */
  connect(){connectTrainer()},
  connectHr(){connectHr()},
  go(){startRide(false)},
  goSim(){const s=document.getElementById('simspeed');P.speed=s?+s.value:1;startRide(true)},
  demo(){startDemo()},
  view3d(){setView3d(!view3d());renderPlayer()},
  view(d){setView3d(d.v==='3d');renderPlayer()},
  route(d,el){setRoute(el.value);if(SAMEN.host&&SAMEN.code)fb.F.setDoc(sRef(SAMEN.code),{route:el.value},{merge:true}).catch(()=>{});renderPlayer()},
  closePlayer(){if(P){if(P.vrij&&samenOn())samenStop(true);clearInterval(P.timer);P=null;render()}},
  vrij(){startVrij()},
  startTab(d){if(state.profile.kit==null){state.profile.kit=kitPick();save()}ui.startTab=d.v;renderPlayer()},
  kitSet(d){state.profile.kit=Object.assign(kitPick(),{[d.k]:d.v});save();kitApply();renderPlayer()},
  vrijLaps(d,el){P.wo.laps=+el.value;vrijSave('laps',+el.value);if(SAMEN.host&&SAMEN.code)fb.F.setDoc(sRef(SAMEN.code),{laps:+el.value},{merge:true}).catch(()=>{});renderPlayer()},
  vrijBots(d,el){P.wo.bots=+el.value;vrijSave('bots',+el.value);renderPlayer()},
  samenNew(){samenNew()},
  samenJoin(){const e=document.getElementById('samen-code');samenJoin(e?e.value:'')},
  samenLeave(){samenStop()},
  samenCopy(){samenCopy()},
  samenGo(){samenGo()},
  pause(){if(!P||P.end)return;if(P.mode==='run')P.mode='pause';else if(P.mode==='pause'){P.mode='run';P.last=now();P.sent=-1}P.stopArm=false;renderPlayer()},
  /* hoe je je vandaag voelt: nog een keer tikken haalt het weg; oude dagen hoeven niet bewaard */
  feel(d){const k=iso(new Date()),f=state.feel=state.feel||{};for(const x of Object.keys(f))if(x<iso(addDays(new Date(),-14)))delete f[x];
    if(f[k]===d.v)delete f[k];else f[k]=d.v;save();render();const w=planWeek(state,mondayOf(new Date()),new Date()).days.find(x=>x.iso===k);if(w&&w.adj)toast(w.adj)},
  zin(d){const k=iso(new Date()),z=state.zin=state.zin||{};for(const x of Object.keys(z))if(x<iso(addDays(new Date(),-14)))delete z[x];
    if(z[k]===d.v)delete z[k];else z[k]=d.v;save();render();const w=planWeek(state,mondayOf(new Date()),new Date()).days.find(x=>x.iso===k);if(w&&w.adj)toast(w.adj)},
  blockMore(d){if(!P||P.free||P.mode==='ready')return;P.wo.segs[segAt(Math.min(P.pos,P.total-1))].d+=+d.s;rebuild();renderPlayer();toast(`Dit blok duurt ${+d.s===60?'een minuut':'30 seconden'} langer.`)},
  skip(){if(!P||P.mode==='ready')return;const i=segAt(P.pos);if(i>=P.wo.segs.length-1)return finishRide();P.pos=P.starts[i+1];P.sent=-1;paintPlayer()},
  stop(){if(!P)return;endRide('stop')},
  /* eindscherm: cijfer voor het gevoel, opslaan (met dat cijfer) of toch doorrijden */
  endRpe(d){if(!P||!P.end)return;P.end.rpe=P.end.rpe===+d.n?null:+d.n;renderPlayer()},
  async endSave(){if(!P||!P.end)return;const n=P.end.rpe,sim=P.sim;await finishRide();if(n&&!sim&&ui.view==='ride')actions.rpe({n})},
  endResume(){if(!P||!P.end)return;const e=P.end;P.end=null;P.endDone=P.endDone||e.why==='finish';
    if(e.why==='finish'&&!P.free)enterFree();P.mode='run';P.last=now();P.sent=-1;if(P.free&&ble.cp&&!P.sim)simResend();renderPlayer()},
  hintLower(){if(!P||!P.hint)return;(P.hintOff=P.hintOff||{})[P.hint.i]=true;P.hint=null;actions.bias({d:-.05})},
  hintOk(){if(!P||!P.hint)return;(P.hintOff=P.hintOff||{})[P.hint.i]=true;P.hint=null;paintPlayer()},
  bias(d){if(!P)return;P.bias=clamp(Math.round((P.bias+(+d.d))*100)/100,.5,1.5);P.sent=-1;renderPlayer()},
  erg(){if(!P)return;P.erg=!P.erg;if(P.erg)P.sent=-1;else simResend();renderPlayer()},
  grade(d){if(!P)return;P.grade=clamp(P.grade+(+d.d),-5,15);simResend();renderPlayer()},
  shift(d){shift(+d.d)}
};
/* acties die je met één tik kunt terugdraaien: de melding erna krijgt 'Ongedaan maken' */
const UNDO=new Set(['stravaOff','healthDrop','healthUndo','healthBetter','saveHealth','missedWhy','setFtp']);
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const k=el.dataset.act,a=actions[k];if(!a)return;
  if(UNDO.has(k)){undoArm=JSON.stringify(state);try{a(el.dataset,el,e)}finally{undoArm=null}}
  else a(el.dataset,el,e);
});
/* getypte waarden in je gegevens bewaren tot je opslaat */
/* een week onder Geweest open of dicht: onthouden, zodat hij zo blijft als je terugkomt van een rit */
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.wk){const o=ui.calOpen=ui.calOpen||{};if(d.open)o[d.dataset.wk]=1;else delete o[d.dataset.wk]}},true);
document.addEventListener('input',e=>{const el=e.target;if(el&&el.id&&/^s-(?!theme)/.test(el.id))(ui.draft=ui.draft||{})[el.id]=el.value;if(el&&(el.id==='c-km'||el.id==='c-min'))runPreview()});
document.addEventListener('change',e=>{
  const id=e.target.id||'';
  /* evenement, afstand, datum en niveau veranderen wat er in het formulier staat (afstanden, haalbaarheid): opnieuw opbouwen */
  if(/^s-(evid|evv|evd|niv)$/.test(id)){
    /* de datum pas verwerken als je het veld verlaat (zie focusout hieronder) */
    if(id==='s-evd')return;
    if(id==='s-evid'&&ui.draft)delete ui.draft['s-evv'];
    if(state.setup&&ui.view==='profiel')actions.saveSettings(null,null,null,true);
    return render();
  }
  if(state.setup&&ui.view==='profiel'&&/^s-(goal|ftp|w|mhr|snd|ftest|evn|evk|evkm)$/.test(id))return actions.saveSettings(null,null,null,true);
  const el=e.target.closest('[data-chg]');if(!el)return;
  const a=actions[el.dataset.chg];if(a)a(el.dataset,el,e);
});
/* datum van je evenement: tijdens het typen is elke tussenstap al een 'geldige' datum (jaar 0002, 0020, 0202).
   Opnieuw opbouwen bij elke stap haalt het veld onder je vingers weg; daarom pas als je het veld verlaat,
   en alleen met een heel jaartal. Bij het instellen bewaart ui.draft de datum tot je opslaat. */
document.addEventListener('focusout',e=>{
  if(e.target.id!=='s-evd'||!state.setup||ui.view!=='profiel')return;
  const v=e.target.value;
  if((v&&+v.slice(0,4)<2000)||v===((state.event&&state.event.date)||''))return;
  actions.saveSettings(null,null,null,true);render();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!P){if(ui.modal){ui.modal=null;render()}else if(ui.view==='training')actions.back()}
  if(e.code==='Space'&&P&&P.mode!=='ready'&&!/^(BUTTON|SELECT|INPUT)$/.test(e.target.tagName)){e.preventDefault();actions.pause()}
  /* schakelen: pijl omhoog of + is zwaarder, pijl omlaag of - is lichter */
  if(P&&gearOn()&&!/^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)){
    const d={ArrowUp:1,'+':1,'=':1,ArrowDown:-1,'-':-1}[e.key];if(d){e.preventDefault();shift(d)}}
});
window.addEventListener('beforeunload',e=>{if(P&&(P.mode==='run'||P.mode==='pause')){e.preventDefault();e.returnValue=''}});

(async function init(){
  load();
  /* de AI-coach is weg: een eventueel bewaarde Claude-sleutel van dit apparaat verwijderen */
  try{localStorage.removeItem('kopwerk.ai')}catch(e){}
  /* verversen of een bewaard adres: open het scherm dat in de adresbalk staat */
  if(state.setup){const s=routeParse(location.hash),h=history.state;routeIdx=h&&typeof h.i==='number'?h.i:0;
    ui.view=s.view;ui.detail=s.detail||null;if(s.rideId){ui.rideId=s.rideId;ui.rideFrom=(h&&h.rideFrom)||s.rideFrom}}
  render();
  await idb.open();
  if(ui.view==='ride'&&ui.rideId&&!P)openRide(ui.rideId);
  try{
    let ch=false;
    for(const r of state.rides){
      if(r.manual||r.noPower||!r.best||r.best[3600]!==undefined)continue;
      const s=await idb.get('s:'+r.id);
      if(s&&Array.isArray(s.p)){for(const[w]of BESTS)r.best[w]=bestEffort(s.p,w);ch=true}
    }
    if(ch){save(false);if(!P)render()}
  }catch(e){}
  try{const a=await idb.get('active');if(a&&a.rec&&a.rec.p&&a.rec.p.length>=60&&a.wo){ui.pending=a;if(!P)render()}}catch(e){}
  checkVersion();
  /* koppelingen: inloggen (synchroniseert vanzelf), terugkomst van Strava, en elk uur nieuwe Strava-ritten */
  fbInit().catch(()=>{});
  /* net bijgewerkt (zie checkVersion): het versienummer weer uit de adresbalk */
  if(new URLSearchParams(location.search).has('u'))history.replaceState(history.state,'',location.pathname+location.hash);
  /* uitnodiging voor een groepsrit: ?samen=CODE */
  {const sc=new URLSearchParams(location.search).get('samen');if(sc){history.replaceState(history.state,'',location.pathname+location.hash);if(state.setup)startVrij(sc)}}
  if(stravaReady()&&!(await stravaCallback())&&state.strava&&Date.now()-(state.strava.checked||0)>36e5)stravaFetch(false);
})();
/* ---------- nieuwe versie ----------
   Een app op je beginscherm of in een eigen venster houdt de pagina vast. Bij openen en bij terugkomen kijkt Kopwerk
   of er een nieuwere versie online staat; zo ja, dan laadt hij die meteen. Niet tijdens een rit. */
const APP_V=((document.querySelector('script[src*="acties.js"]')||{}).src||'').split('v=')[1]||'';
let verLast=0;
async function checkVersion(){
  if(!APP_V||P||Date.now()-verLast<6e4||!/^https?:$/.test(location.protocol))return;verLast=Date.now();
  try{
    const t=await(await fetch('./',{cache:'reload'})).text(),nv=(t.match(/acties\.js\?v=([\w.]+)/)||[])[1];
    if(!nv||nv===APP_V)return;
    /* één poging per versie, zodat een trage server geen lus geeft */
    let tried='';try{tried=sessionStorage.getItem('kopwerk.nv')||''}catch(e){}
    if(tried===nv)return;try{sessionStorage.setItem('kopwerk.nv',nv)}catch(e){}
    location.replace(location.pathname+'?u='+nv+location.hash);
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkVersion()});
