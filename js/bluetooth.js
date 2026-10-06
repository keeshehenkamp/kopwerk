'use strict';
/* ================= bluetooth ================= */
const live={power:null,cad:null,hr:null,tP:0,tH:0,hist:[]};
const ble={dev:null,cp:null,queue:Promise.resolve(),name:'',on:false,hrDev:null,hrName:'',hrOn:false,crank:null,busy:false};
const now=()=>performance.now();
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
function setGrade(pct){const b=new DataView(new ArrayBuffer(7));b.setUint8(0,0x11);b.setInt16(1,0,true);b.setInt16(3,Math.round(pct*100),true);b.setUint8(5,40);b.setUint8(6,51);cpWrite(new Uint8Array(b.buffer))}
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
  if(e.name==='SecurityError'||e.name==='NotAllowedError')return 'Bluetooth is in deze weergave geblokkeerd. Vraag in de chat om de app als los bestand en open dat rechtstreeks in Chrome.';
  return 'Koppelen is niet gelukt. Controleer of de trainer aan staat en niet met Zwift of een andere app verbonden is, en probeer het opnieuw.';
}
async function connectTrainer(){
  if(!navigator.bluetooth){ui.bleMsg='Deze browser ondersteunt geen Bluetooth. Gebruik Chrome of Edge op je laptop.';return renderPlayer()}
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
async function connectHr(){
  if(!navigator.bluetooth){ui.bleMsg='Deze browser ondersteunt geen Bluetooth. Gebruik Chrome of Edge op je laptop.';return renderPlayer()}
  ui.bleMsg='';
  try{
    const dev=await navigator.bluetooth.requestDevice({filters:[{services:[0x180d]}]});
    ble.hrDev=dev;ble.hrName=dev.name||'Hartslagmeter';
    dev.addEventListener('gattserverdisconnected',()=>{ble.hrOn=false;renderPlayer()});
    const s=await dev.gatt.connect();
    const c=await(await s.getPrimaryService(0x180d)).getCharacteristic(0x2a37);
    await c.startNotifications();
    c.addEventListener('characteristicvaluechanged',e=>{try{const v=e.target.value,f=v.getUint8(0);live.hr=f&1?v.getUint16(1,true):v.getUint8(1);live.tH=now()}catch(_){}});
    ble.hrOn=true;
  }catch(e){ui.bleMsg=bleError(e)}
  renderPlayer();
}
