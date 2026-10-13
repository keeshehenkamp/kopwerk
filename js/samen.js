'use strict';
/* ================= vrij rijden, samen rijden en windschaduw =================
   Vrij rijden: geen schema en geen doelvermogen. De trainer volgt de helling van de route; je kiest het aantal rondes
   en eventueel een groepje dat op een vast vermogen per kilo rijdt, waar je achter kunt aansluiten.
   Samen rijden: een groepsrit met een code van zes tekens. Iedereen rijdt dezelfde route. Elke rijder schrijft ongeveer
   elke twee seconden zijn plek naar Firestore (samen/{code}/rijders/{uid}); ertussen rekenen we door met zijn snelheid.
   Windschaduw: vlak achter een ander heb je tot een derde minder luchtweerstand. Dat telt in je snelheid (speedFor)
   en in de trainer, die dan minder windweerstand krijgt (setGrade). */
const VRIJ_KEY='kopwerk.vrij';
const vrijPrefs=()=>{try{return Object.assign({laps:1,bots:0},JSON.parse(localStorage.getItem(VRIJ_KEY)||'{}'))}catch(e){return {laps:1,bots:0}}};
function vrijSave(k,v){const p=vrijPrefs();p[k]=v;try{localStorage.setItem(VRIJ_KEY,JSON.stringify(p))}catch(e){}}
function vrijWorkout(){
  const p=vrijPrefs();
  return {id:'vrij',type:'vrij',name:'Vrij rijden',desc:'',segs:[S(6*3600,.6,null,'Vrij rijden','steady')],sec:0,minutes:0,IF:0,tss:0,lvl:null,laps:p.laps,bots:p.bots};
}
function startVrij(code){
  if(!canRide())return toast('Rijden doe je op je laptop, in Chrome of Edge.');
  setView3d(true);openPlayer(vrijWorkout());
  Object.assign(P,{free:true,erg:false,vrij:true});P.game.on=false;P.laps=[{l:'Vrij rijden',k:'steady',c:0,s:0}];
  if(code)ui.samenCode=String(code).toUpperCase();
  renderPlayer();
  if(code&&syncInfo.user)samenJoin(ui.samenCode);
}
const routeLen=()=>{const R=ROUTES.find(x=>x.id===routeId());return R?R.km*1000:10000};
/* windschaduw bij een afstand (m) tot de rijder voor je: een derde minder luchtweerstand op 1-2,5 m, weg na ~14 m */
const draftAt=gap=>gap<.4||gap>14?0:gap<=2.5?.32:.32*(1-(gap-2.5)/11.5);
const fmtGap=m=>Math.abs(m)<1000?Math.round(Math.abs(m))+' m':nl((Math.abs(m)/1000).toFixed(1))+' km';

/* ---------- het groepje: vier tot vijf rijders op een vast vermogen per kilo, als één pakketje ----------
   Ze rijden op een gewone fiets met gewone luchtweerstand, min wat het groepje onderling scheelt. */
const BOT_FORM=[[0,.3],[-1.9,1.05],[-1.9,-.45],[-3.8,.3],[-5.7,1.05]];
function botsStep(C,d,dt,rate,run,lane,slope){
  const wkg=P.wo.bots;if(!wkg)return null;
  const B=W.bots||(W.bots={d:d+6,v:0,t:0});
  /* de eerste twintig seconden houdt het groepje in tot je aansluit; daarna rijdt het zijn eigen tempo */
  if(run){B.t+=dt*rate;let vt=speedFor(wkg*75,slope(B.d),.18,75+9);if(B.t<20&&B.d-d>4)vt=Math.min(vt,(W.v||0)+.4);B.v+=(vt-B.v)*Math.min(1,dt*.7*Math.max(1,rate));B.d+=B.v*dt*rate}
  const out=[];
  W.npcs.forEach((n,i)=>{const f=BOT_FORM[i%BOT_FORM.length],bd=B.d+f[0];n.d=bd;n.off=f[1];
    lane(n.R,bd,f[1],run?n.cad:0,B.v,run&&slope(bd)>8);out.push({d:bd,off:f[1]})});
  return out;
}

/* ---------- samen rijden ---------- */
const SAMEN={code:null,host:false,go:null,cd:0,riders:new Map(),unsub:[],sent:0,name:''};
const SAMEN_KITS=['groen','geel','paars','bollen','rood'];
const samenOn=()=>!!SAMEN.code;
function samenName(){const u=fb&&fb.auth&&fb.auth.currentUser;const n=(u&&(u.displayName||u.email))||'Fietser';return n.split(/[ @]/)[0].slice(0,14)}
const sRef=(...p)=>fb.F.doc(fb.db,'samen',...p);
async function samenNew(){
  if(!syncInfo.user)return toast('Log eerst in om samen te rijden.');
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code='';for(let i=0;i<6;i++)code+=A[Math.floor(Math.random()*A.length)];
  try{await fb.F.setDoc(sRef(code),{host:syncInfo.user.uid,route:routeId(),laps:P.wo.laps||0,made:Date.now(),go:0});SAMEN.host=true;await samenListen(code)}
  catch(e){toast(samenErr(e))}
}
async function samenJoin(code){
  code=String(code||'').trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code))return toast('Een code heeft zes letters of cijfers.');
  if(!syncInfo.user){ui.samenCode=code;return toast('Log eerst in om mee te doen.')}
  try{const s=await fb.F.getDoc(sRef(code));if(!s.exists())return toast('Er is geen groepsrit met deze code.');
    const g=s.data();SAMEN.host=g.host===syncInfo.user.uid;if(g.route)setRoute(g.route);P.wo.laps=g.laps||0;await samenListen(code)}
  catch(e){toast(samenErr(e))}
}
const samenErr=e=>/permission/i.test(e&&(e.code||e.message)||'')?'Samen rijden staat nog niet open in de database (Firestore-regels).':'Verbinden met de groepsrit lukte niet.';
async function samenListen(code){
  const host=SAMEN.host;samenStop(true);SAMEN.host=host;SAMEN.code=code;SAMEN.go=null;SAMEN.name=samenName();ui.samenCode='';
  const F=fb.F,me=syncInfo.user.uid;
  await F.setDoc(sRef(code,'rijders',me),{n:SAMEN.name,d:0,v:0,w:0,t:Date.now(),st:'wacht'});
  SAMEN.unsub.push(F.onSnapshot(sRef(code),s=>{
    const g=s.data();if(!g||!P)return;
    if(!SAMEN.host&&g.route&&g.route!==routeId()){setRoute(g.route);if(P.mode==='ready')renderPlayer()}
    if(!SAMEN.host)P.wo.laps=g.laps||0;
    /* de start voor iedereen: acht seconden na het moment dat je het bericht krijgt */
    if(SAMEN.go!==null&&g.go&&g.go!==SAMEN.go&&P.mode==='ready')samenCountdown();
    SAMEN.go=g.go||0;
  }));
  SAMEN.unsub.push(F.onSnapshot(F.collection(fb.db,'samen',code,'rijders'),qs=>{
    let roster=false;
    qs.docChanges().forEach(ch=>{
      const id=ch.doc.id;if(id===me)return;
      if(ch.type==='removed'){samenDrop(id);roster=true;return}
      const v=ch.doc.data(),r=SAMEN.riders.get(id);
      if(!r){SAMEN.riders.set(id,{n:v.n,d:v.d,v:v.v,w:v.w,st:v.st,at:now(),sd:v.d,kit:SAMEN_KITS[SAMEN.riders.size%SAMEN_KITS.length],R:null,off:[-.85,1.95,-1.9,.2][SAMEN.riders.size%4]});roster=true}
      else{if(r.st!==v.st||r.n!==v.n)roster=true;Object.assign(r,{n:v.n,d:v.d,v:v.v,w:v.w,st:v.st,at:now()})}
    });
    if(roster&&P&&P.mode==='ready')renderPlayer();
  }));
  if(P&&P.mode==='ready')renderPlayer();
}
function samenDrop(id){const r=SAMEN.riders.get(id);if(r&&r.R&&r.R.g.parent)r.R.g.parent.remove(r.R.g);SAMEN.riders.delete(id)}
/* weg uit de groepsrit; vóór de start ook je plek wissen, na een rit blijft 'klaar' staan */
function samenStop(quiet){
  for(const u of SAMEN.unsub)try{u()}catch(e){}
  SAMEN.unsub=[];for(const id of [...SAMEN.riders.keys()])samenDrop(id);
  if(SAMEN.code&&fb&&syncInfo.user){const ref=sRef(SAMEN.code,'rijders',syncInfo.user.uid);
    (P&&P.mode!=='ready'?fb.F.setDoc(ref,{st:'klaar',t:Date.now()},{merge:true}):fb.F.deleteDoc(ref)).catch(()=>{})}
  SAMEN.code=null;SAMEN.host=false;SAMEN.cd=0;
  if(!quiet&&P&&P.mode==='ready')renderPlayer();
}
async function samenGo(){
  if(!SAMEN.host||!SAMEN.code)return;
  try{await fb.F.setDoc(sRef(SAMEN.code),{go:Date.now()},{merge:true})}catch(e){return toast(samenErr(e))}
  samenCountdown();
}
function samenCountdown(){
  if(SAMEN.cd)return;SAMEN.cd=now()+8000;
  const iv=setInterval(()=>{
    const e=document.getElementById('samen-cd'),left=Math.ceil((SAMEN.cd-now())/1000);
    if(!P||P.mode!=='ready'||!SAMEN.cd){clearInterval(iv);SAMEN.cd=0;return}
    if(e)e.textContent=left>0?`Start over ${left}`:'Start';
    if(left<=0){clearInterval(iv);SAMEN.cd=0;if(ble.on)startRide(false);else{toast('Koppel je trainer en druk dan op Start.');renderPlayer()}}
  },200);
  renderPlayer();
}
function samenCopy(){
  const url=location.origin+location.pathname+'?samen='+SAMEN.code;
  (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Link gekopieerd. Stuur hem naar wie mee wil rijden.'),()=>toast(url));
}
/* elke ~2 seconden je plek doorgeven */
function samenSend(run){
  if(!SAMEN.code||!syncInfo.user||now()-SAMEN.sent<2000)return;SAMEN.sent=now();
  fb.F.setDoc(sRef(SAMEN.code,'rijders',syncInfo.user.uid),{n:SAMEN.name,d:Math.round((W.dist||0)*10)/10,v:Math.round((W.v||0)*100)/100,w:dispPower()||0,t:Date.now(),st:run?'rijdt':'pauze'}).catch(()=>{});
}
function samenRiders(C,d,dt,run,lane,slope){
  const out=[];
  for(const r of SAMEN.riders.values()){
    if(r.st==='wacht'){if(r.R)r.R.g.visible=false;continue}
    if(!r.R||r.R.w!==W){r.R=makeRider(KITS[r.kit],false);r.R.w=W;r.R.g.traverse(o=>{if(o.isMesh)o.castShadow=true});r.tag=nameTag(r.n);r.R.g.add(r.tag);W.scene.add(r.R.g)}
    /* naamkaartje even groot op het scherm, dichtbij en ver weg */
    {const k=clamp(W.cam.position.distanceTo(r.R.g.position)/9,1,7);r.tag.scale.set(1.5*k,.375*k,1);r.tag.position.y=2.1+.2*k}
    /* doorrekenen met de laatst bekende snelheid (hooguit 4 s), en zacht naar die plek toe schuiven */
    const lag=Math.min(4,(now()-r.at)/1000),want=r.d+(r.st==='rijdt'?r.v*lag:0);
    r.sd=Math.abs(want-r.sd)>60?want:r.sd+(want-r.sd)*Math.min(1,dt*2.5);
    r.R.g.visible=r.st!=='klaar';lane(r.R,r.sd,r.off,r.st==='rijdt'?88:0,r.st==='rijdt'?r.v:0,r.st==='rijdt'&&slope(r.sd)>8);
    if(r.st!=='klaar')out.push({d:r.sd,off:r.off});
  }
  return out;
}
function nameTag(n){
  const T=T3,cv=document.createElement('canvas');cv.width=256;cv.height=64;const c=cv.getContext('2d');
  c.font='600 34px Inter,system-ui,sans-serif';const w=Math.min(240,c.measureText(n).width+28);
  c.fillStyle='rgba(16,20,28,.78)';c.beginPath();c.roundRect((256-w)/2,8,w,48,10);c.fill();c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.fillText(n,128,33);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
  const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,transparent:true}));s.scale.set(1.5,.375,1);s.position.y=2.25;s.renderOrder=10;return s;
}

/* ---------- per beeld, vanuit worldStep: groepje, anderen, windschaduw en waar jij op de weg rijdt ----------
   Geeft true terug als de gewone fietsers langs de weg niet nodig zijn (het groepje gebruikt ze). */
function vrijStep(C,d,dt,rate,run,lane,slope){
  const ahead=[],bots=botsStep(C,d,dt,rate,run,lane,slope);
  if(bots)ahead.push(...bots);
  if(samenOn()){ahead.push(...samenRiders(C,d,dt,run,lane,slope));if(P.mode!=='ready')samenSend(run)}
  /* de dichtstbijzijnde rijder vóór je bepaalt de windschaduw; zit er nog iemand vlak voor hem, dan iets meer */
  let best=null,n8=0;
  for(const a of ahead){const g=a.d-d;if(g>.3&&g<14){if(!best||g<best.g)best={g,off:a.off};if(g<8)n8++}}
  const dr=best?Math.min(.4,draftAt(best.g)+(n8>1?.05:0)):0;
  W.draft=(W.draft||0)+(dr-(W.draft||0))*Math.min(1,dt*2*Math.max(1,rate));
  /* je fietser stuurt zelf achter het wiel; kom je te dichtbij, dan ernaast om in te halen */
  let off=.85;if(best)off=best.g>1.7?best.off:best.off+(best.off>.4?-1.25:1.25);
  W.myOff=W.myOff==null?.85:W.myOff+clamp(off-W.myOff,-1.1*dt*Math.max(1,rate),1.1*dt*Math.max(1,rate));
  W.ahead=best;return !!bots;
}
/* paneel links in de 3D-wereld: ronde, groepje, anderen en windschaduw */
function vrijHud(d){
  const el=document.getElementById('p-list');if(!el||!W||!W.C)return;
  const C=W.C,L=C.L,laps=P.wo.laps||0,done=Math.max(0,d-12),lap=Math.min(laps||1e9,Math.floor(done/L)+1);
  const rows=[];
  rows.push(`<div class="vrow"><span>Ronde</span><b>${laps?`${lap} van ${laps}`:lap}</b></div>`);
  if(laps)rows.push(`<div class="vrow"><span>Nog</span><b>${fmtGap(Math.max(0,laps*L-done))}</b></div>`);
  if(W.bots){const g=W.bots.d-d;rows.push(`<div class="vrow"><span>Groepje ${nl(P.wo.bots.toFixed(1))} W/kg</span><b>${g>-6&&g<3?'je zit erin':(g>0?'+':'−')+fmtGap(g)}</b></div>`)}
  for(const r of SAMEN.riders.values()){if(r.st==='wacht')continue;const g=r.sd-d;
    rows.push(`<div class="vrow"><span>${esc(r.n)}${r.st==='klaar'?' · klaar':''}</span><b>${(g>=0?'+':'−')+fmtGap(g)}</b></div>`)}
  const dp=Math.round((W.draft||0)*100);
  rows.push(`<div class="vrow vdraft${dp>=5?' on':''}"><span>Windschaduw</span><b>${dp>=5?`−${dp}% wind`:'geen'}</b></div>`);
  const h=rows.join('');if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h}
  const pr=document.getElementById('p-prog');if(pr)pr.style.width=(laps?Math.min(100,done/(laps*L)*100):(done%L)/L*100)+'%';
  const rs=document.getElementById('p-rest');if(rs&&rs.textContent!==C.route.name)rs.textContent=C.route.name;
  if(now()-(W.profT||0)>300){W.profT=now();drawProfile(d)}
  const nx=document.getElementById('p-next');if(nx){const t=samenOn()?`Groepsrit ${SAMEN.code}`:'Geen schema, de trainer volgt de weg';if(nx.textContent!==t)nx.textContent=t}
}
/* het startpaneel voor vrij rijden */
function vrijReadyHTML(){
  const p=P.wo,inG=samenOn(),guest=inG&&!SAMEN.host;
  const laps=sel(`data-chg="vrijLaps"${guest?' disabled':''}`,[[1,'1 ronde'],[2,'2 rondes'],[3,'3 rondes'],[5,'5 rondes'],[10,'10 rondes'],[0,'Onbeperkt']],p.laps||0);
  const bots=sel('data-chg="vrijBots"',[[0,'Geen groepje'],[2,'Groepje 2,0 W/kg'],[2.5,'Groepje 2,5 W/kg'],[3,'Groepje 3,0 W/kg'],[3.5,'Groepje 3,5 W/kg'],[4,'Groepje 4,0 W/kg']],p.bots||0);
  let sam;
  if(!syncInfo.user)sam=`<div class="row small"><span class="muted">Samen rijden met een code kan als je bent ingelogd.</span><button class="btn small" data-act="syncLogin">Inloggen</button></div>`;
  else if(!inG)sam=`<div class="row small"><button class="btn small" data-act="samenNew">Groepsrit maken</button><span class="muted">of</span>
      <input id="samen-code" class="code" maxlength="6" placeholder="Code" value="${esc(ui.samenCode||'')}" autocomplete="off" aria-label="Code van de groepsrit"><button class="btn small" data-act="samenJoin">Meedoen</button></div>`;
  else{
    const list=[`<li><b>${esc(SAMEN.name)}</b> (jij)</li>`,...[...SAMEN.riders.values()].map(r=>`<li>${esc(r.n)}<span class="muted"> · ${r.st==='wacht'?'staat klaar':r.st==='klaar'?'klaar':'rijdt'}</span></li>`)].join('');
    sam=`<div class="samen"><div class="row small"><b>Groepsrit ${SAMEN.code}</b><button class="btn small" data-act="samenCopy">Link kopiëren</button><button class="btn small" data-act="samenLeave">Verlaten</button></div>
      <ul>${list}</ul>
      ${SAMEN.cd?'<b id="samen-cd" class="samencd">Start over 8</b>':SAMEN.host?`<div class="row small"><button class="btn small pri" data-act="samenGo"${ble.on?'':' disabled'}>Start voor iedereen</button><span class="muted">${ble.on?'Iedereen begint over 8 seconden op de startstreep.':'Koppel eerst je trainer.'}</span></div>`:'<span class="small muted">De maker van de groepsrit start voor iedereen. Koppel je trainer; je begint dan vanzelf.</span>'}</div>`;
  }
  return `<div class="vrij stack"><div class="row small">${laps}${bots}</div>${sam}</div>`;
}
