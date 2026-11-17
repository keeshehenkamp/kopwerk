'use strict';
/* ================= iOS-app (Capacitor) =================
   iOS heeft geen Web Bluetooth. In de app krijgt de rest van de code toch `navigator.bluetooth`, gebouwd op de native plugin
   (@capacitor-community/bluetooth-le), en `navigator.wakeLock` op @capacitor-community/keep-awake. Zo blijven
   js/bluetooth.js en js/player.js hetzelfde voor web en app. In een gewone browser doet dit bestand niets.
   Alleen wat Kopwerk gebruikt is nagebouwd: kiezen, verbinden, een service en characteristic opzoeken, meldingen en schrijven. */
const NATIVE=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
(function(){
  if(!NATIVE)return;
  const PL=Capacitor.Plugins||{},B=PL.BluetoothLe,KA=PL.KeepAwake;
  if(B&&!navigator.bluetooth){
    const uuid=n=>typeof n==='number'?'0000'+n.toString(16).padStart(4,'0')+'-0000-1000-8000-00805f9b34fb':String(n).toLowerCase();
    const toHex=b=>{const u=ArrayBuffer.isView(b)?new Uint8Array(b.buffer,b.byteOffset,b.byteLength):new Uint8Array(b);return Array.from(u,x=>x.toString(16).padStart(2,'0')).join('')};
    const fromHex=h=>{if(h&&typeof h==='object'&&h.buffer)return h;const s=String(h||'').replace(/[^0-9a-f]/gi,''),u=new Uint8Array(s.length>>1);for(let i=0;i<u.length;i++)u[i]=parseInt(s.substr(i*2,2),16);return new DataView(u.buffer)};
    const err=(name,msg)=>{const e=new Error(msg||name);e.name=name;return e};
    /* de plugin wil één opdracht tegelijk, net als zijn eigen BleClient */
    let q=Promise.resolve();
    const run=f=>{const p=q.then(f);q=p.catch(()=>{});return p};
    let ready=null;
    const init=()=>ready=ready||B.initialize({}).catch(e=>{ready=null;throw /permission/i.test(e&&e.message||'')?err('NotAllowedError','Bluetooth niet toegestaan'):err('NotSupportedError',e&&e.message)});
    class Char extends EventTarget{
      constructor(dev,svc,id){super();this.dev=dev;this.svc=svc;this.uuid=id;this.value=null}
      async startNotifications(){
        const d=this.dev,key=`notification|${d.id}|${this.svc}|${this.uuid}`;
        /* na opnieuw verbinden krijgt de nieuwe characteristic de meldingen, niet de oude */
        if(d.subs[key])try{await d.subs[key].remove()}catch(_){}
        d.subs[key]=await B.addListener(key,ev=>{this.value=fromHex(ev&&ev.value);this.dispatchEvent(new Event('characteristicvaluechanged'))});
        await run(()=>B.startNotifications({deviceId:d.id,service:this.svc,characteristic:this.uuid}));
        return this;
      }
      writeValueWithResponse(v){return run(()=>B.write({deviceId:this.dev.id,service:this.svc,characteristic:this.uuid,value:toHex(v)}))}
      writeValueWithoutResponse(v){return run(()=>B.writeWithoutResponse({deviceId:this.dev.id,service:this.svc,characteristic:this.uuid,value:toHex(v)}))}
      writeValue(v){return this.writeValueWithResponse(v)}
    }
    class Dev extends EventTarget{
      constructor(id,name){
        super();this.id=id;this.name=name||'';this.subs={};this.svcs=[];this.lost=null;
        const dev=this;
        const server={device:dev,connected:false,
          async getPrimaryService(u){
            const id=uuid(u),s=dev.svcs.find(x=>x.uuid===id);
            if(!s)throw err('NotFoundError','Service '+id+' niet gevonden');
            return {uuid:id,async getCharacteristic(c){const cid=uuid(c);if(!(s.characteristics||[]).some(x=>x.uuid===cid))throw err('NotFoundError','Characteristic '+cid+' niet gevonden');return new Char(dev,id,cid)}};
          }};
        this.gatt={get connected(){return server.connected},
          async connect(){
            await init();
            /* verbinding weg: zelfde gebeurtenis als in de browser, zodat bluetooth.js opnieuw verbindt */
            if(!dev.lost)dev.lost=await B.addListener('disconnected|'+dev.id,()=>{server.connected=false;dev.dispatchEvent(new Event('gattserverdisconnected'))});
            await run(()=>B.connect({deviceId:dev.id,timeout:15000}));
            const r=await run(()=>B.getServices({deviceId:dev.id}));
            dev.svcs=(r&&r.services)||[];server.connected=true;
            return server;
          },
          disconnect(){server.connected=false;run(()=>B.disconnect({deviceId:dev.id})).catch(()=>{})}};
      }
    }
    const devs={};
    Object.defineProperty(navigator,'bluetooth',{configurable:true,value:{
      /* iOS kent maar één soort filter per zoektocht: alle services uit de filters samen (een apparaat met één ervan telt) */
      async requestDevice(o){
        await init();
        const on=await B.isEnabled().then(r=>r&&r.value).catch(()=>true);
        if(!on)throw err('NotReadableError','Bluetooth staat uit');
        const services=[...new Set(((o&&o.filters)||[]).flatMap(f=>f.services||[]).map(uuid))];
        let d;
        try{d=await run(()=>B.requestDevice(Object.assign(services.length?{services}:{},{optionalServices:((o&&o.optionalServices)||[]).map(uuid)})))}
        catch(e){throw err('NotFoundError',e&&e.message)}
        return devs[d.deviceId]=devs[d.deviceId]||new Dev(d.deviceId,d.name);
      }}});
  }
  /* scherm aan tijdens een rit: navigator.wakeLock zoals in de browser, maar via iOS zelf */
  if(KA){
    Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{
      async request(){
        await KA.keepAwake();
        const s=new EventTarget();s.released=false;
        s.release=async()=>{if(s.released)return;s.released=true;await KA.allowSleep().catch(()=>{});s.dispatchEvent(new Event('release'))};
        return s;
      }}});
  }
})();
