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
const actions={
  nav(d){ui.view=d.v;ui.modal=null;ui.confirm='';ui.draft=null;render();window.scrollTo(0,0)},
  back(){ui.view=(ui.detail&&ui.detail.from)||'vandaag';render();window.scrollTo(0,0)},
  week(d){ui.weekOff=+d.d?ui.weekOff+(+d.d):0;render()},
  openDay(d){ui.detail={kind:'day',iso:d.iso,from:tabOf(ui.view)};ui.view='training';render();window.scrollTo(0,0)},
  /* je tijd per dag: dag kiezen, wiel bewaart zodra het stilstaat */
  avOpen(){ui.avOpen=!ui.avOpen;ui.avSel=ui.avOpen?ui.avSel:null;render()},
  avDay(d){const i=+d.i;ui.avSel=ui.avSel&&ui.avSel.k===d.k&&ui.avSel.i===i?null:{k:d.k,i};avRefresh(d.k)},
  wheelTo(d,el){const w=el.closest('.wheel');if(w)w.scrollTo({top:+d.i*WROW,behavior:'smooth'})},
  avPick(d){
    const k=d.k,sel=ui.avSel;if(!sel||sel.k!==k)return;const m=+d.m,i=sel.i;
    if(k==='setup'){ui.setupAvail[i]=m;const t=document.querySelector('.aved[data-k="setup"] .avtot'),tot=ui.setupAvail.reduce((x,y)=>x+y,0);if(t)t.textContent=tot?durTxt(tot)+' beschikbaar':'Nog geen tijd gekozen';return}
    const w=avWeek(k);if(w.lock[i])return;w.mins[i]=m;state.weeks[k]=w.mins.slice();
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
  openWo(d){ui.detail={kind:'wo',type:d.type,min:ui.lib.min,L:ui.lib.L,from:'lib'};ui.view='training';render();window.scrollTo(0,0)},
  closeModal(){ui.modal=null;render()},
  veil(d,el,e){if(e.target===el){ui.modal=null;render()}},
  startDay(d){ui.detail={kind:'day',iso:d.iso,from:tabOf(ui.view)};const x=modalWo();if(x&&x.wo)openPlayer(x.wo)},
  startModal(){const x=modalWo();if(x&&x.wo)openPlayer(x.wo)},
  zwoModal(){const x=modalWo();if(x&&x.wo)saveZwo([{name:slug(x.wo.name),wo:x.wo}],slug(x.wo.name))},
  zwoWeek(){
    const mon=addDays(mondayOf(new Date()),ui.weekOff*7),p=planWeek(state,mon,new Date());
    const list=p.days.filter(d=>d.wo).map(d=>({name:`${d.i+1}-${DAYS[d.i]}-${slug(d.wo.name)}`,wo:d.wo}));
    if(!list.length)return toast('Deze week staat er niets gepland.');
    saveZwo(list,`kopwerk-week-${weekNo(mon)}`);
  },
  ovType(d,el){setOverride(ui.detail.iso,{type:el.value||null})},
  libMin(d,el){ui.lib.min=+el.value;render()},
  libL(d,el){ui.lib.L=+el.value;render()},
  resetAdj(){state.levelAdj=0;save();render()},
  saveSettings(d,el,e,quiet){
    const g=id=>document.getElementById(id);
    const ftp=clamp(Math.round(+g('s-ftp').value)||200,60,600),w=clamp(+g('s-w').value||75,35,200);
    const mh=g('s-mhr')?Math.round(+g('s-mhr').value)||0:state.profile.maxHr||0,evd=g('s-evd').value,evn=g('s-evn').value.trim();
    if(ftp!==state.profile.ftp)logFtp(ftp);
    state.profile={ftp,weight:w,goal:g('s-goal').value,sound:g('s-snd')?g('s-snd').value==='1':state.profile.sound!==false,maxHr:mh?clamp(mh,120,230):0};
    const evk=g('s-evk').value,evkm=Math.round(+g('s-evkm').value)||0;
    const old=state.event,keep=old&&old.profile&&old.name===(evn||'Evenement')&&old.date===evd?{profile:old.profile}:{};
    state.event=/^\d{4}-\d{2}-\d{2}$/.test(evd)?Object.assign({name:evn||'Evenement',date:evd},EVENTS[evk]?{kind:evk}:{},evkm?{km:clamp(evkm,20,400)}:{},keep):null;
    if(!state.setup&&ui.setupAvail)state.avail=ui.setupAvail.slice();
    if(!state.setup){state.setup=true;state.started=iso(new Date());if(g('s-ftp').value.trim())state.ftpGiven=state.started;state.planStart=iso(mondayOf(new Date()));state.weeks[state.planStart]=state.avail.slice();ui.view='vandaag'}
    ui.draft=null;save();
    /* in Profiel wordt elke wijziging meteen bewaard, zonder het scherm opnieuw op te bouwen (dan blijft je toetsenbord open) */
    if(quiet){const f=document.querySelector('.side .ftp b');if(f)f.textContent=state.profile.ftp;return toast('Opgeslagen')}
    render();toast(state.avail.some(x=>x)?'Opgeslagen':'Opgeslagen. Je hebt nog geen trainingsdagen gekozen.');
  },
  openRide(d){ui.modal=null;openRide(d.id)},
  openAdd(){ui.modal={kind:'add'};render()},
  async saveManual(){
    const g=id=>document.getElementById(id),date=g('a-date').value,min=clamp(Math.round(+g('a-min').value)||0,0,900),pw=Math.round(+g('a-pw').value)||0;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>iso(new Date()))return toast('Kies een datum van vandaag of eerder.');
    if(min<10)return toast('Vul een duur van minstens 10 minuten in.');
    const ftp=state.profile.ftp,IF=pw?clamp(pw*1.05/ftp,.3,1.3):EFFORT[+g('a-eff').value][0],ts=parseISO(date).getTime()+12*36e5;
    const ride={id:'m'+Date.now().toString(36),date,ts,name:'Buitenrit',type:'buiten',manual:true,planned:min*60,ftp,sim:false,rpe:null,adj:true,laps:[],
      dur:min*60,avgP:pw,np:pw?Math.round(pw*1.05):0,IF:+IF.toFixed(2),tss:Math.round(min/60*IF*IF*100),kj:pw?Math.round(pw*min*60/1000):0,avgHr:0,maxHr:0,avgCad:0,zones:[0,0,0,0,0,0,0],best:{},score:null,decoup:null};
    state.rides.push(ride);save();ui.modal=null;render();toast(`Buitenrit toegevoegd: ${ride.tss} TSS.`);
  },
  importRide(d,el){
    const f=el.files&&el.files[0];if(!f)return;
    const eff=+document.getElementById('a-eff').value,isFit=/\.fit$/i.test(f.name),rd=new FileReader();
    rd.onload=async()=>{
      try{
        const r=resample(isFit?parseFit(rd.result):parseTcx(rd.result));
        if(r.rec.p.length<120)throw 0;
        const ftp=state.profile.ftp,start=r.start||Date.now();
        const ride=makeRide({wo:{name:'Buitenrit',type:'buiten',sec:r.rec.p.length},ftp,rec:r.rec,laps:[{l:'Buitenrit',k:'steady',c:0,s:0}],sim:false,startTs:start});
        ride.id='i'+Math.round(start/1000).toString(36);ride.adj=true;
        if(!r.hasP){const IF=EFFORT[eff][0];ride.IF=IF;ride.tss=Math.round(ride.dur/3600*IF*IF*100);ride.noPower=true;ride.best={};ride.zones=[0,0,0,0,0,0,0]}
        if(state.rides.some(x=>x.id===ride.id)){ui.modal=null;render();return toast('Deze rit staat er al in.')}
        if(r.hasP)learnHr(r.rec,ftp);markRecords(ride);state.rides.push(ride);save();
        await idb.put('s:'+ride.id,r.rec);
        ui.modal=null;ui.rideFrom=tabOf(ui.view);ui.streams={id:ride.id,rec:r.rec};ui.view='ride';ui.rideId=ride.id;render();window.scrollTo(0,0);
        if(!r.hasP)toast('Geen vermogen in dit bestand: de belasting is geschat.');
      }catch(e){toast('Dit bestand kon niet worden gelezen. Gebruik een .fit- of .tcx-bestand van een rit.')}
    };
    if(isFit)rd.readAsArrayBuffer(f);else rd.readAsText(f);
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
    r.rpe=+d.n;
    /* je gevoel en de uitvoering bepalen de volgende trede van deze soort training;
       pas je je antwoord aan, dan telt het nieuwe zolang er nog geen nieuwere rit van deze soort is beoordeeld */
    const later=state.rides.some(x=>x!==r&&!x.sim&&x.type===r.type&&x.ts>r.ts&&x.rpe!=null);
    if(!r.sim&&LADDER[r.type]&&r.lvl&&(!r.adj||(r.rpeAdj&&!later))){
      r.adj=true;r.rpeAdj=true;
      state.prog=state.prog||{};
      state.prog[r.type]=clamp(r.lvl+progStep(r),1,LADDER[r.type].steps.length);
    }
    ui.rpeEdit=false;save();render();
  },
  aiSaveKey(){
    const k=(document.getElementById('ai-key').value||'').trim();
    if(!/^sk-ant-/.test(k))return toast('Dit lijkt geen Claude-sleutel. Hij begint met sk-ant-.');
    if(!aiSetKey(k))return toast('Opslaan lukt niet in deze browser.');
    render();toast('Sleutel opgeslagen in deze browser.');
  },
  aiDelKey(){aiSetKey('');render();toast('Sleutel gewist.')},
  async aiResearch(){
    if(ui.aiBusy)return;
    const g=id=>document.getElementById(id);
    if(!g('s-evn').value.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(g('s-evd').value))return toast('Vul eerst de naam en de datum van je evenement in.');
    if(!aiKey())return toast('Vul eerst je Claude-sleutel in, onderaan deze pagina.');
    actions.saveSettings();
    ui.aiBusy=true;render();
    try{
      const ev=state.event,p=await aiResearchEvent(ev);
      p.at=iso(new Date());
      if(state.event&&state.event.name===ev.name&&state.event.date===ev.date){
        state.event.profile=p;state.event.kind=p.soort;if(!state.event.km)state.event.km=Math.round(p.afstand_km);
        save();toast('Je evenement is onderzocht. Het schema is erop aangepast.');
      }
    }catch(e){toast(aiError(e))}
    ui.aiBusy=false;render();
  },
  syncLogin(){syncLogin()},
  syncHide(){try{localStorage.setItem('kopwerk.synchint','0')}catch(e){}render()},
  syncLogout(){syncLogout()},
  stravaConnect(){stravaConnect()},
  stravaFetch(){stravaFetch(true)},
  stravaOff(){delete state.strava;save();render();toast('Strava is ontkoppeld.')},
  calNav(d){ui.calOff=+d.d?(ui.calOff||0)+(+d.d):0;render()},
  perf(d){ui.perf=+d.p;render()},
  theme(d,el){setTheme(el.value);render()},
  themeToggle(){setTheme(isDark()?'light':'dark');render()},
  setFtp(d){state.profile.ftp=+d.w;logFtp(+d.w);save();render();toast(`FTP is nu ${d.w} W. Alle trainingen zijn daarop aangepast.`)},
  async delRide(){
    if(ui.confirm!=='ride'){ui.confirm='ride';return render()}
    const id=ui.rideId;state.rides=state.rides.filter(r=>r.id!==id);state.deleted=(state.deleted||[]).concat(id);save();await idb.del('s:'+id);
    ui.confirm='';ui.view=ui.rideFrom||'kalender';ui.streams=null;render();
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
    rd.onload=async()=>{
      try{
        const o=JSON.parse(rd.result);
        if(!o||o.app!=='kopwerk'||!o.state||!Array.isArray(o.state.rides)||!o.state.profile)throw 0;
        state=Object.assign(defaults(),o.state,{strava:state.strava});save();
        for(const[id,s]of Object.entries(o.streams||{}))if(s&&Array.isArray(s.p))await idb.put('s:'+id,s);
        ui.streams=null;render();toast('Back-up teruggezet.');
      }catch(e){toast('Dit bestand is geen back-up van Kopwerk.')}
    };
    rd.readAsText(f);
  },
  async wipe(){
    if(ui.confirm!=='wipe'){ui.confirm='wipe';return render()}
    state=defaults();save();await idb.clear();ui.confirm='';ui.view='vandaag';ui.streams=null;ui.pending=null;render();
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
  closePlayer(){if(P){clearInterval(P.timer);P=null;render()}},
  pause(){if(!P)return;if(P.mode==='run')P.mode='pause';else if(P.mode==='pause'){P.mode='run';P.last=now();P.sent=-1}P.stopArm=false;renderPlayer()},
  skip(){if(!P||P.mode==='ready')return;const i=segAt(P.pos);if(i>=P.wo.segs.length-1)return finishRide();P.pos=P.starts[i+1];P.sent=-1;paintPlayer()},
  stop(){if(!P)return;if(!P.stopArm){P.stopArm=true;return renderPlayer()}finishRide()},
  hintLower(){if(!P||!P.hint)return;(P.hintOff=P.hintOff||{})[P.hint.i]=true;P.hint=null;actions.bias({d:-.05})},
  hintOk(){if(!P||!P.hint)return;(P.hintOff=P.hintOff||{})[P.hint.i]=true;P.hint=null;paintPlayer()},
  bias(d){if(!P)return;P.bias=clamp(Math.round((P.bias+(+d.d))*100)/100,.5,1.5);P.sent=-1;renderPlayer()},
  erg(){if(!P)return;P.erg=!P.erg;if(P.erg)P.sent=-1;else setGrade(P.grade);renderPlayer()},
  grade(d){if(!P)return;P.grade=clamp(P.grade+(+d.d),-5,15);setGrade(P.grade);renderPlayer()}
};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=actions[el.dataset.act];if(a)a(el.dataset,el,e);
});
/* getypte waarden in je gegevens bewaren tot je opslaat */
document.addEventListener('input',e=>{const el=e.target;if(el&&el.id&&/^s-(?!theme)/.test(el.id))(ui.draft=ui.draft||{})[el.id]=el.value});
document.addEventListener('change',e=>{
  if(state.setup&&ui.view==='profiel'&&/^s-(goal|ftp|w|mhr|snd|evn|evd|evk|evkm)$/.test(e.target.id||''))return actions.saveSettings(null,null,null,true);
  const el=e.target.closest('[data-chg]');if(!el)return;
  const a=actions[el.dataset.chg];if(a)a(el.dataset,el,e);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!P){if(ui.modal){ui.modal=null;render()}else if(ui.view==='training')actions.back()}
  if(e.code==='Space'&&P&&P.mode!=='ready'&&!/^(BUTTON|SELECT|INPUT)$/.test(e.target.tagName)){e.preventDefault();actions.pause()}
});
window.addEventListener('beforeunload',e=>{if(P&&(P.mode==='run'||P.mode==='pause')){e.preventDefault();e.returnValue=''}});

(async function init(){
  load();render();
  await idb.open();
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
  /* koppelingen: inloggen (synchroniseert vanzelf), terugkomst van Strava, en elk uur nieuwe Strava-ritten */
  fbInit().catch(()=>{});
  if(stravaReady()&&!(await stravaCallback())&&state.strava&&Date.now()-(state.strava.checked||0)>36e5)stravaFetch(false);
})();
