'use strict';
/* ================= bluetooth ================= */
const live={power:null,cad:null,hr:null,tP:0,tH:0,hist:[]};
const ble={dev:null,cp:null,queue:Promise.resolve(),name:'',on:false,hrDev:null,hrName:'',hrOn:false,hrBusy:false,hrTry:0,crank:null,busy:false};
const now=()=>performance.now();
const NO_BLE='Deze browser ondersteunt geen Bluetooth. Open Kopwerk in Chrome of Edge op je laptop.';
/* rijden kan alleen met Web Bluetooth; op een telefoon of tablet zonder Bluetooth tonen we geen startknoppen */
const canRide=()=>!!navigator.bluetooth||!matchMedia('(pointer:coarse)').matches;
function onPower(w,cad){
  const t=now();live.power=Math.max(0,w);live.tP=t;
  if(cad!=null)live.cad=cad;
  live.hist.push({t,p:live.power});while(live.hist.length&&t-live.hist[0].t>3000)live.hist.shift();
}
function parseIBD(dv){
  try{
    const f=dv.getUint16(0,true);let o=2,cad=null,pw=null;
    if(!(f&1))o+=2;
    if(f&2)o+=2;
    if(f&4){cad=dv.getUint16(o,true)/2;o+=2}
    if(f&8)o+=2;
    if(f&16)o+=3;
    if(f&32)o+=2;
    if(f&64){pw=dv.getInt16(o,true);o+=2}
    if(f&128)o+=2;
    if(f&256)o+=5;
    if(f&512){const h=dv.getUint8(o);o+=1;if(h>0&&!ble.hrOn){live.hr=h;live.tH=now()}}
    if(pw!=null)onPower(pw,cad);else if(cad!=null)live.cad=cad;
  }catch(e){}
}
function parseCPS(dv){
  try{
    const f=dv.getUint16(0,true),pw=dv.getInt16(2,true);let o=4,cad=null;
    if(f&1)o+=1;if(f&4)o+=2;if(f&16)o+=6;
    if(f&32){
      const rev=dv.getUint16(o,true),t=dv.getUint16(o+2,true),c=ble.crank;
      if(c){const dr=(rev-c.rev)&0xffff,dt=((t-c.t)&0xffff)/1024;if(dr>0&&dt>0){cad=Math.round(dr/dt*60);c.at=now()}else if(now()-c.at>3000)cad=0;c.rev=rev;c.t=t}
      else ble.crank={rev,t,at:now()};
    }
    onPower(pw,cad);
  }catch(e){}
}
function cpWrite(bytes){
  if(!ble.cp)return;
  const cp=ble.cp;
  ble.queue=ble.queue.then(()=>cp.writeValueWithResponse?cp.writeValueWithResponse(bytes):cp.writeValue(bytes)).catch(()=>{});
}
function setPower(w){w=clamp(Math.round(w),0,2000);cpWrite(new Uint8Array([0x05,w&255,(w>>8)&255]))}
function setGrade(pct,cw=51){const b=new DataView(new ArrayBuffer(7));b.setUint8(0,0x11);b.setInt16(1,0,true);b.setInt16(3,Math.round(pct*100),true);b.setUint8(5,40);b.setUint8(6,clamp(Math.round(cw),0,255));cpWrite(new Uint8Array(b.buffer))}
async function setupTrainer(server){
  ble.cp=null;ble.crank=null;let ok=false;
  try{
    const ftms=await server.getPrimaryService(0x1826);
    const ibd=await ftms.getCharacteristic(0x2ad2);
    await ibd.startNotifications();
    ibd.addEventListener('characteristicvaluechanged',e=>parseIBD(e.target.value));
    ok=true;
    try{
      const cp=await ftms.getCharacteristic(0x2ad9);
      await cp.startNotifications();
      ble.cp=cp;
      cpWrite(new Uint8Array([0x00]));cpWrite(new Uint8Array([0x07]));
    }catch(e){ble.cp=null}
  }catch(e){}
  if(!ok){
    const cps=await server.getPrimaryService(0x1818);
    const m=await cps.getCharacteristic(0x2a63);
    await m.startNotifications();
    m.addEventListener('characteristicvaluechanged',e=>parseCPS(e.target.value));
  }
}
function bleError(e){
  if(!e)return '';
  if(e.name==='NotFoundError')return '';
  if(e.name==='SecurityError'||e.name==='NotAllowedError')return 'Bluetooth is geblokkeerd. Open Kopwerk in Chrome of Edge via het vaste adres en sta Bluetooth toe als de browser daarom vraagt.';
  return 'Koppelen is niet gelukt. Controleer of de trainer aan staat en niet met Zwift of een andere app verbonden is, en probeer het opnieuw.';
}
async function connectTrainer(){
  if(!navigator.bluetooth){ui.bleMsg=NO_BLE;return renderPlayer()}
  if(ble.busy)return;ble.busy=true;ui.bleMsg='';
  try{
    const dev=await navigator.bluetooth.requestDevice({
      filters:[{services:[0x1826]},{services:[0x1818]},{namePrefix:'Zwift'},{namePrefix:'KICKR'},{namePrefix:'Wahoo'},{namePrefix:'Tacx'}],
      optionalServices:[0x1826,0x1818,0x180d]});
    ble.dev=dev;ble.name=dev.name||'Trainer';
    dev.addEventListener('gattserverdisconnected',onTrainerLost);
    const server=await dev.gatt.connect();
    await setupTrainer(server);
    ble.on=true;
    if(!ble.cp)ui.bleMsg='Verbonden, maar deze trainer laat zich niet aansturen. Je ziet wel je vermogen; de weerstand regel je zelf.';
  }catch(e){ui.bleMsg=bleError(e);if(ble.dev&&!ble.on){try{ble.dev.gatt.disconnect()}catch(_){}}}
  ble.busy=false;renderPlayer();
}
async function onTrainerLost(){
  if(!ble.on)return;
  ble.on=false;ble.cp=null;
  if(P&&P.mode==='run'){P.mode='pause';toast('Verbinding met de trainer verbroken. De training is gepauzeerd.')}
  renderPlayer();
  for(let i=0;i<6&&ble.dev&&!ble.on;i++){
    await new Promise(r=>setTimeout(r,2000));
    try{const s=await ble.dev.gatt.connect();await setupTrainer(s);ble.on=true;if(P)P.sent=-1;toast('Trainer opnieuw verbonden.')}catch(e){}
  }
  renderPlayer();
}
/* hartslagmeting (0x2a37): bit 0 van de vlaggen zegt of de waarde 1 of 2 bytes is; 0 betekent geen contact */
function onHr(e){try{const v=e.target.value,f=v.getUint8(0),h=f&1?v.getUint16(1,true):v.getUint8(1);if(h>0){live.hr=h;live.tH=now()}}catch(_){}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
/* een Bluetooth-stap die blijft hangen (meter bezet of buiten bereik) na een tijd opgeven, anders zit koppelen voorgoed vast */
const inTime=(p,ms)=>Promise.race([p,wait(ms).then(()=>{throw new Error('timeout')})]);
/* elke koppelpoging krijgt een nummer: een oudere poging (of het automatisch opnieuw verbinden) stopt zodra er een nieuwe is */
async function setupHr(dev,n){
  const s=await inTime(dev.gatt.connect(),12000);
  if(n!==ble.hrTry)return false;
  const c=await inTime((async()=>(await s.getPrimaryService(0x180d)).getCharacteristic(0x2a37))(),8000);
  /* eerst luisteren, dan starten: anders kunnen de eerste metingen verloren gaan */
  c.removeEventListener('characteristicvaluechanged',onHr);c.addEventListener('characteristicvaluechanged',onHr);
  await inTime(c.startNotifications(),8000);
  if(n!==ble.hrTry)return false;
  ble.hrOn=true;return true;
}
/* een borstband weigert de eerste verbinding vaak: na een mislukte poging nog twee keer proberen */
async function setupHrRetry(dev,n){
  for(let k=0;k<3;k++){
    try{return await setupHr(dev,n)}catch(e){if(k===2||n!==ble.hrTry)throw e;try{dev.gatt.disconnect()}catch(_){}await wait(1000)}
  }
}
async function connectHr(){
  if(!navigator.bluetooth){ui.bleMsg=NO_BLE;return renderPlayer()}
  ui.bleMsg='';
  let dev;
  try{dev=await navigator.bluetooth.requestDevice({filters:[{services:[0x180d]}]})}
  catch(e){ui.bleMsg=e&&e.name==='NotFoundError'?'':bleError(e);return renderPlayer()}
  const n=++ble.hrTry;
  if(ble.hrDev&&ble.hrDev!==dev){ble.hrDev.removeEventListener('gattserverdisconnected',onHrLost);try{ble.hrDev.gatt.disconnect()}catch(_){}}
  ble.hrDev=dev;ble.hrName=dev.name||'Hartslagmeter';ble.hrOn=false;
  dev.removeEventListener('gattserverdisconnected',onHrLost);dev.addEventListener('gattserverdisconnected',onHrLost);
  ble.hrBusy=true;renderPlayer();
  try{await setupHrRetry(dev,n)}
  catch(e){
    if(n===ble.hrTry){try{dev.gatt.disconnect()}catch(_){}
      ui.bleMsg='Koppelen van de hartslagmeter is niet gelukt. Controleer of hij aan staat (een borstband even vochtig maken en omdoen) en niet met een andere app, horloge of fietscomputer verbonden is, en probeer het opnieuw.'}
  }
  if(n===ble.hrTry){ble.hrBusy=false;renderPlayer()}
}
/* verbinding met de hartslagmeter weg (borstband valt vaak even weg): een paar minuten lang zelf opnieuw verbinden */
async function onHrLost(){
  if(!ble.hrOn)return;
  ble.hrOn=false;renderPlayer();
  const dev=ble.hrDev,n=++ble.hrTry;
  for(let i=0;i<30&&n===ble.hrTry&&!ble.hrOn;i++){
    await wait(i<5?2000:5000);
    if(n!==ble.hrTry||ble.hrOn)break;
    try{if(await setupHr(dev,n))toast('Hartslagmeter opnieuw verbonden.')}catch(e){}
  }
  renderPlayer();
}
