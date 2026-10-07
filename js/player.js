'use strict';
/* ================= player ================= */
let P=null,audio=null,wake=null;
function beep(freq,ms){
  if(!state.profile.sound||!audio)return;
  try{const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;o.connect(g);g.connect(audio.destination);
    const t=audio.currentTime;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+ms/1000);o.start(t);o.stop(t+ms/1000+.02)}catch(e){}
}
function openPlayer(wo){
  const starts=[];let t=0;for(const s of wo.segs){starts.push(t);t+=s.d}
  const maxI=Math.max(1.3,...wo.segs.map(s=>Math.max(s.a,s.b)))*1.08;
  wo=Object.assign({},wo,{segs:wo.segs.map(s=>Object.assign({},s))});
  P={wo,planned:wo.sec,tr:[],free:false,freeSec:0,ftp:state.profile.ftp,starts,total:t,maxI,mode:'ready',sim:false,speed:1,clock:0,pos:0,si:-1,bias:1,erg:true,grade:1,sent:-1,
     rec:{p:[],hr:[],cad:[],tgt:[]},game:gameNew(wo),laps:[],trace:'',last:now(),zero:0,auto:false,startTs:0,simP:0,simH:70,lastSave:0,stopArm:false,drawn:-1};
  ui.modal=null;ui.bleMsg='';
  P.timer=setInterval(tick,200);
  render();
}
function rebuild(){
  const starts=[];let t=0;for(const s of P.wo.segs){starts.push(t);t+=s.d}
  P.starts=starts;P.total=t;P.maxI=Math.max(1.3,...P.wo.segs.map(s=>Math.max(s.a,s.b)))*1.08;
  P.trace=P.tr.map(([x,v])=>`${(x/t*1000).toFixed(1)},${(100-clamp(v/P.maxI,0,1)*100).toFixed(1)}`).join(' ')+' ';
  P.sent=-1;P.drawn=-1;
}
function enterFree(){
  gameEndBlock();P.free=true;P.erg=false;P.zero=0;
  P.laps.push({l:'Vrij rijden',k:'steady',c:0,s:P.rec.p.length});
  if(ble.cp)setGrade(P.grade);
  beep(990,600);renderPlayer();
}
const segAt=pos=>{let i=Math.max(0,P.si);while(i<P.wo.segs.length-1&&pos>=P.starts[i+1])i++;while(i>0&&pos<P.starts[i])i--;return i};
const fracAt=(i,pos)=>{const s=P.wo.segs[i];return s.a+(s.b-s.a)*clamp((pos-P.starts[i])/s.d,0,1)};
const tgtAt=pos=>Math.round(fracAt(segAt(pos),pos)*P.ftp*P.bias);
function startRide(sim){
  if(!P||P.mode!=='ready')return;
  try{audio=audio||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}
  P.sim=!!sim;P.mode='run';P.startTs=Date.now();P.last=now();P.sent=-1;
  if(P.sim){P.simP=tgtAt(0)}
  try{if(navigator.wakeLock)navigator.wakeLock.request('screen').then(w=>{wake=w}).catch(()=>{})}catch(e){}
  renderPlayer();
}
function enterSeg(i){
  P.si=i;const s=P.wo.segs[i];
  P.laps.push({l:s.label,k:s.kind,c:s.cad||0,s:P.rec.p.length});
  if(P.laps.length>1&&P.speed===1)beep(880,420);
}
function stepSecond(){
  if(P.free){
    const fr=now()-live.tP<3000,fh2=now()-live.tH<5000;
    P.rec.p.push(fr&&live.power!=null?Math.round(live.power):0);P.rec.hr.push(fh2&&live.hr?live.hr:0);P.rec.cad.push(fr&&live.cad?Math.round(live.cad):0);P.rec.tgt.push(0);
    P.freeSec++;return;
  }
  const i=segAt(P.pos);if(i!==P.si)enterSeg(i);
  const tgt=Math.round(fracAt(i,P.pos)*P.ftp*P.bias);
  if(P.sim){
    P.simP+=(tgt-P.simP)/3;
    live.power=Math.max(0,Math.round(P.simP*(1+(Math.random()-.5)*.05)));
    live.cad=Math.round((P.wo.segs[i].cad||88)+(Math.random()-.5)*5);
    P.simH+=((64+live.power/P.ftp*104)-P.simH)/45;live.hr=Math.round(P.simH);
    live.tP=live.tH=now();
  }
  const fresh=now()-live.tP<3000,fh=now()-live.tH<5000;
  P.rec.p.push(fresh&&live.power!=null?Math.round(live.power):0);
  P.rec.hr.push(fh&&live.hr?live.hr:0);
  P.rec.cad.push(fresh&&live.cad?Math.round(live.cad):0);
  P.rec.tgt.push(tgt);
  gameStep(i,P.rec.p[P.rec.p.length-1],tgt);hrWatch(i,tgt);
  const v=P.rec.p[P.rec.p.length-1]/P.ftp;P.tr.push([P.pos,v]);
  P.trace+=`${(P.pos/P.total*1000).toFixed(1)},${(100-clamp(v/P.maxI,0,1)*100).toFixed(1)} `;
  P.pos+=1;
  const rem=P.starts[i]+P.wo.segs[i].d-P.pos;
  if(P.speed===1&&rem>=1&&rem<=3&&i<P.wo.segs.length-1&&P.wo.segs[i].d>=10)beep(660,120);
  if(P.pos>=P.total){if(P.sim)finishRide();else enterFree()}
}
/* Hartslag als controle: ligt je hartslag in een gelijkmatig blok een minuut lang duidelijk boven wat bij dit vermogen normaal is,
   dan verschijnt een melding. Pas na tweeënhalve minuut in het blok, omdat hartslag achterloopt; één keer per blok. */
function hrWatch(i,tgt){
  const s=P.wo.segs[i],into=P.pos-P.starts[i],n=P.rec.p.length;
  if(P.free||!tgt||s.d<180||into<150||tgt>P.ftp*1.05||(P.hintOff&&P.hintOff[i])||(P.hint&&P.hint.i===i)){if(P.hint&&P.hint.i!==i)P.hint=null;P.hrHi=0;return}
  if(n<60)return;let sp=0,sh=0,c=0;for(let k=n-60;k<n;k++)if(P.rec.hr[k]>0){sp+=P.rec.p[k];sh+=P.rec.hr[k];c++}
  const e=c>=50?hrExpect(sp/c):null;if(!e)return;
  P.hrHi=sh/c-e>=Math.max(8,e*.05)?(P.hrHi||0)+1:0;
  if(P.hrHi>=60)P.hint={i,hr:Math.round(sh/c),exp:Math.round(e)};
}
function tick(){
  if(!P)return;
  const t=now(),dt=Math.min(5,(t-P.last)/1000);P.last=t;
  if(P.mode==='run'){
    if(!P.sim&&ble.on){
      const lp=t-live.tP<3000?live.power:0;
      if(!lp)P.zero+=dt;else P.zero=0;
      if(P.free&&P.zero>120)return finishRide();
      const a=P.zero>4;
      if(a!==P.auto){P.auto=a;renderPlayer();return}
    }else P.auto=false;
    if(!P.auto){
      P.clock+=dt*(P.sim?P.speed:1);
      let guard=0;
      while(P&&P.mode==='run'&&P.rec.p.length<Math.floor(P.clock)&&guard++<600)stepSecond();
      if(!P||P.mode!=='run')return;
      if(ble.cp&&!P.sim){
        if(P.erg&&!P.free){const w=tgtAt(Math.min(P.pos,P.total-1));if(w!==P.sent){setPower(w);P.sent=w}}
      }
      if(t-P.lastSave>30000&&P.rec.p.length>60){P.lastSave=t;idb.put('active',{wo:P.wo,planned:P.planned,ftp:P.ftp,rec:P.rec,laps:P.laps,sim:P.sim,startTs:P.startTs})}
    }
  }
  paintPlayer();
}
function dispPower(){
  if(P.sim)return P.mode==='ready'?null:live.power;
  if(now()-live.tP>3000||!live.hist.length)return null;
  return Math.round(avg(live.hist.map(h=>h.p)));
}
function paintPlayer(){
  const el=id=>document.getElementById(id);
  if(!P||!el('p-power'))return;
  const pos=Math.min(P.pos,P.total-1),i=segAt(pos),s=P.wo.segs[i],tgt=tgtAt(pos),pw=dispPower();
  const fh=now()-live.tH<5000,fp=now()-live.tP<3000;
  el('p-elapsed').textContent=clock(P.rec.p.length);
  if(el('p-prog')){el('p-prog').style.width=Math.min(100,P.pos/P.total*100)+'%';const rs=el('p-rest');if(rs)rs.textContent=clock(Math.max(0,P.total-P.pos));if(!P.free)paintList(segAt(Math.min(P.pos,P.total-1)))}
  const rp=el('p-repeat');if(rp)rp.hidden=P.free||!(s.kind==='work'||s.kind==='rest');
  if(P.free){
    el('p-target').textContent='–';el('p-power').textContent=pw==null?'–':pw;
    el('p-cad').textContent=fp&&live.cad?Math.round(live.cad):'–';el('p-hr').textContent=fh&&live.hr?live.hr:'–';
    el('p-cadl').textContent='Cadans';el('p-seg').textContent='Vrij rijden';el('p-left').textContent=clock(P.freeSec);
    el('p-next').textContent='Training klaar · vrij rijden';
    el('p-zone').style.background='var(--z3)';el('p-dot').style.left='50%';
    el('p-cur').setAttribute('x1',1000);el('p-cur').setAttribute('x2',1000);
    if(P.drawn!==P.tr.length){P.drawn=P.tr.length;el('p-trace').setAttribute('points',P.trace)}
    return;
  }
  el('p-target').textContent=tgt;
  el('p-power').textContent=pw==null?'–':pw;
  el('p-cad').textContent=fp&&live.cad?Math.round(live.cad):'–';
  el('p-cadl').textContent=s.cad?`Cadans, doel ${s.cad}`:'Cadans';
  el('p-hr').textContent=fh&&live.hr?live.hr:'–';
  el('p-seg').textContent=s.label+(s.cad?` op ${s.cad} rpm`:'');
  el('p-left').textContent=clock(P.starts[i]+s.d-P.pos);
  const nx=P.wo.segs[i+1];
  el('p-next').textContent=nx?`Hierna: ${nx.label}, ${clock(nx.d)} op ${Math.round(nx.a*P.ftp*P.bias)} W`:'Laatste blok';
  el('p-zone').style.background=`var(--z${zoneOf(fracAt(i,pos))})`;
  const dev=pw==null||!tgt?0:clamp((pw/tgt-1)*100,-20,20);
  el('p-dot').style.left=(50+dev*2.5)+'%';
  const hb=el('p-hint');if(hb){const on=!!P.hint&&P.hint.i===i;hb.hidden=!on;if(on)el('p-hintt').textContent=`Hartslag ${P.hint.hr}, normaal ${P.hint.exp}`}
  el('p-cur').setAttribute('x1',P.pos/P.total*1000);el('p-cur').setAttribute('x2',P.pos/P.total*1000);
  if(P.drawn!==P.tr.length){P.drawn=P.tr.length;el('p-trace').setAttribute('points',P.trace)}
}
function playerHTML(){
  const w=P.wo,ready=P.mode==='ready',run=P.mode==='run',pause=P.mode==='pause',v3=view3d();
  let x=0;
  const polys=w.segs.map(s=>{const x0=x/P.total*1000,x1=(x+s.d)/P.total*1000;x+=s.d;const y0=100-s.a/P.maxI*100,y1=100-s.b/P.maxI*100;
    return `<polygon${x1-x0<8?' class="n"':''} points="${x0.toFixed(1)},100 ${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},100" fill="var(--z${zoneOf((s.a+s.b)/2)})"/>`}).join('');
  const tr=ble.on?`<span class="dotst on"></span>${esc(ble.name)}`:`<span class="dotst"></span>Geen trainer gekoppeld`;
  const hr=ble.hrOn?`<span class="dotst on"></span>${esc(ble.hrName)}`:'';
  const status=P.sim?'<span class="badge">Demo zonder trainer</span>':`<span class="small muted">${tr}${hr?' &nbsp; '+hr:''}</span>`;
  const readyBox=ready?`<div class="pready stack">
      <div class="seg" role="group" aria-label="Weergave"><button class="btn small" data-act="view" data-v="3d" aria-pressed="${v3}">3D-wereld</button><button class="btn small" data-act="view" data-v="cijfers" aria-pressed="${!v3}">Alleen cijfers</button></div>
      <div class="row">
        <button class="btn" data-act="connect">${ble.on?'Andere trainer':'Trainer koppelen'}</button>
        <button class="btn" data-act="connectHr">${ble.hrOn?'Andere hartslagmeter':'Hartslagmeter koppelen'}</button>
        <button class="btn pri big" data-act="go" ${ble.on?'':'disabled'}>Start training</button>
      </div>
      ${ui.bleMsg?`<p class="notice small">${esc(ui.bleMsg)}</p>`:''}
      <div class="row small">
        <button class="btn small" data-act="goSim">Demo zonder trainer</button>
        <select id="simspeed" aria-label="Snelheid van de demo"><option value="1">1×</option><option value="10">10×</option><option value="60" selected>60×</option></select>
      </div></div>`:'';
  const ctl=ready?'':`<div class="row">
        <button class="btn icon" data-act="bias" data-d="-0.05" aria-label="Lichter">−</button>
        <span class="num" style="font-size:22px;min-width:58px;text-align:center">${Math.round(P.bias*100)}%</span>
        <button class="btn icon" data-act="bias" data-d="0.05" aria-label="Zwaarder">+</button>
        ${ble.cp&&!P.sim?`${P.free?'<span class="small muted">Helling</span>':`<button class="btn" data-act="erg">${P.erg?'ERG aan':'ERG uit'}</button>`}${P.erg?'':`<button class="btn icon" data-act="grade" data-d="-1" aria-label="Minder helling">−</button><span class="num" style="font-size:20px">${P.grade}%</span><button class="btn icon" data-act="grade" data-d="1" aria-label="Meer helling">+</button>`}`:''}
      </div>
      <div class="row">
        ${P.auto?'<span class="badge">Gepauzeerd: begin met trappen</span>':''}
        <button class="btn pri big" data-act="pause">${pause?'Verder':'Pauze'}</button>
        ${P.free?'':`<button class="btn" data-act="repeat" id="p-repeat" hidden>Blok herhalen</button><button class="btn" data-act="skip">Volgend blok</button><button class="btn" data-act="extend">+5 min uitrijden</button>`}
        <button class="btn warn" data-act="stop">${P.stopArm?'Klik nog eens om te stoppen':'Stoppen en opslaan'}</button>
      </div>`;
  const hud=v3&&P.game.on?`<div class="phud"><b id="p-pts">0</b><span>punten</span><span id="p-mult" class="pmult"></span><span id="p-stars" class="pstars">★ 0</span></div><div class="ppop" id="p-pop" hidden></div>`:'';
  const load=v3?'<div class="pload" id="p-load" hidden><span>Wereld laden</span><b><i></i></b></div><div class="pprof"><canvas id="p-prof" width="360" height="84"></canvas><span id="p-proft"></span></div><div class="pcd" id="p-cd" hidden></div>':'';
  if(v3)return `<div class="player w3">
    <div class="zpow"><i class="zband" id="p-zone"></i><div class="zp1"><b id="p-power">–</b><i>W</i></div>
      <div class="zp2"><span><b id="p-cad">–</b><i>rpm</i></span><span><b id="p-hr">–</b><i>bpm</i></span></div>
      <div class="zgauge" aria-hidden="true"><span class="ok"></span><span class="mid"></span><span class="dot" id="p-dot"></span></div><span id="p-cadl" hidden></span></div>
    <div class="zbar"><div class="zb1"><span><b id="p-spd">0</b><i>km/u</i></span><span><b id="p-km">0,0</b><i>km</i></span><span><b id="p-hm">0</b><i>m</i></span><span><b id="p-elapsed">0:00</b><i>/ ${clock(P.total)}${P.free?' +':''}</i></span></div>
      <div class="zprog"><i id="p-prog"></i></div>
      <div class="zb2"><span class="zname">${esc(w.name)}</span>${status}<span class="zbtns">${ready?'<button class="btn small" data-act="closePlayer">Sluiten</button>':'<button class="btn small" data-act="view3d">Alleen cijfers</button>'}</span></div></div>
    <div class="zlist"><div class="zlh"><b>Schema</b><span>nog <b id="p-rest">${clock(P.total)}</b></span></div><div id="p-list"></div>
      <div class="zcur"><span id="p-seg"></span><div class="zct"><span><b id="p-target">–</b><i>W</i></span><b id="p-left"></b></div><span id="p-next" class="znext"></span></div></div>
    ${hud?`<div class="zside">${hud}</div>`:''}${load}
    ${readyBox?`<div class="zready">${readyBox}</div>`:''}
    <div class="zchart"><svg viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label="Verloop van de training">${polys}<polyline id="p-trace" points=""/><line id="p-cur" x1="0" x2="0" y1="0" y2="100"/></svg></div>
    <div class="phint" id="p-hint" hidden><span id="p-hintt"></span><span class="row"><button class="btn small pri" data-act="hintLower">Stap lager</button><button class="btn small" data-act="hintOk">Gaat goed</button></span></div>
    <div class="pctl zctl" id="p-ctl">${ctl}</div>
  </div>`;
  return `<div class="player${ready?' isready':''}">
    <div class="pzone" id="p-zone"></div>
    <div class="ptop">
      <div><h2>${esc(w.name)}</h2>${status}${v3?' <span class="small" id="p-km"></span>':''}</div>
      <div class="pclock"><span id="p-elapsed" style="color:var(--ink);font-size:34px;font-weight:600">0:00</span><span> / ${clock(P.total)}${P.free?' +':''}</span></div>
      <div class="row">${ready?'<button class="btn" data-act="closePlayer">Sluiten</button>':'<button class="btn" data-act="view3d">3D-wereld</button>'}</div>
    </div>
    ${hud}${load}
    <div class="pmain">
      ${readyBox}
      <div class="pseg"><span id="p-seg"></span><span id="p-left"></span></div>
      <div class="pnums">
        <div class="pnum"><label>Doel</label><b id="p-target">–</b><i>W</i></div>
        <div class="pnum big"><label>Vermogen</label><b id="p-power">–</b><i>W</i></div>
        <div class="pnum"><label id="p-cadl">Cadans</label><b id="p-cad">–</b><i>rpm</i></div>
        <div class="pnum"><label>Hartslag</label><b id="p-hr">–</b><i>bpm</i></div>
      </div>
      <div class="gauge" aria-hidden="true"><span class="ok"></span><span class="mid"></span><span class="dot" id="p-dot"></span></div>
      <div class="pnext"><span id="p-next"></span></div>
    </div>
    <div class="pchart"><svg viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label="Verloop van de training">${polys}<polyline id="p-trace" points=""/><line id="p-cur" x1="0" x2="0" y1="0" y2="100"/></svg></div>
    <div class="phint" id="p-hint" hidden><span id="p-hintt"></span><span class="row"><button class="btn small pri" data-act="hintLower">Stap lager</button><button class="btn small" data-act="hintOk">Gaat goed</button></span></div>
    <div class="pctl">${ctl}</div>
  </div>`;
}
/* 3D: schema als lijst, het huidige blok uitgelicht, sterren bij afgeronde blokken */
function paintList(i){
  const el=document.getElementById('p-list');if(!el)return;
  const g=P.game||{},key=i+'|'+(g.stars?g.stars.length:0);if(el.dataset.k===key)return;el.dataset.k=key;
  const segs=P.wo.segs,a=Math.max(0,i-2),b=Math.min(segs.length,a+8);
  el.innerHTML=segs.slice(a,b).map((s,j)=>{const k=a+j,st=g.by&&g.by[k];
    return `<div class="zrow${k===i?' on':''}${k<i?' done':''}"><i style="background:var(--z${zoneOf((s.a+s.b)/2)})"></i><span>${st!=null?'<em>'+'★'.repeat(st)+'</em>':''}${esc(s.label)}</span><b>${clock(s.d)}</b><b>${Math.round(s.a*P.ftp*P.bias)} W</b></div>`}).join('');
}
function renderPlayer(){if(!P)return;document.getElementById('app').innerHTML=playerHTML();P.drawn=-1;paintPlayer();worldSync()}
function markRecords(ride){
  if(ride.sim)return;
  const old=records(state.rides),prs=[];
  for(const[w,t]of BESTS){const v=ride.best[w]||0;if(v&&old[w]&&v>old[w].w)prs.push({d:w,t,w:v,old:old[w].w})}
  ride.prs=prs;
  if(prs.length)setTimeout(()=>toast(`Nieuw record: ${prs[prs.length-1].t} op ${prs[prs.length-1].w} W`),600);
}
function makeRide(a){
  const an=analyze(a.rec,a.ftp,a.laps,a.planned||a.wo.sec,a.wo.type);
  const d=new Date(a.startTs||Date.now());
  const hrOff=a.sim?null:hrOffset(a.rec,a.ftp);
  return Object.assign({id:'r'+(a.startTs||Date.now()).toString(36),date:iso(d),ts:d.getTime(),name:a.wo.name,type:a.wo.type,lvl:a.wo.lvl||null,planned:a.planned||a.wo.sec,ftp:a.ftp,sim:!!a.sim,rpe:null,adj:false,laps:a.laps,game:gameResult(a.game),kjb:a.sim?{}:kjBests(a.rec.p)},hrOff!=null?{hrOff}:{},an);
}
async function storeRide(a){
  const ride=makeRide(a);if(!a.sim)learnHr(a.rec,a.ftp);
  state.rides=state.rides.filter(r=>r.id!==ride.id);
  markRecords(ride);
  state.rides.push(ride);save();
  await idb.put('s:'+ride.id,a.rec);await idb.del('active');
  ui.streams={id:ride.id,rec:a.rec};ui.view='ride';ui.rideId=ride.id;
}
async function finishRide(){
  if(!P||P.mode==='done')return;
  gameEndBlock();const a=P;a.mode='done';clearInterval(a.timer);
  if(ble.cp&&!a.sim)setGrade(0);
  try{if(wake){wake.release();wake=null}}catch(e){}
  if(a.wo.type==='demo'){P=null;toast('Demo afgelopen');return render()}
  if(a.rec.p.length<60){await idb.del('active');P=null;toast('Korter dan een minuut gereden: niet opgeslagen.');return render()}
  await storeRide(a);P=null;render();
}
