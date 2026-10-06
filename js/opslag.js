'use strict';
/* ================= state & storage ================= */
const KEY='kopwerk.v1';
const defaults=()=>({v:1,setup:false,profile:{ftp:200,weight:75,goal:'ftp',sound:true,maxHr:0},event:null,avail:[0,60,0,60,0,90,120],planStart:iso(mondayOf(new Date())),overrides:{},weeks:{},levelAdj:0,rides:[],missed:{},health:null,healthLog:[],ftpLog:[]});
let state=defaults();
const ui={view:'vandaag',selDay:null,detail:null,weekOff:0,rideId:null,lib:{min:60,L:1},modal:null,streams:null,showCad:false,saveFail:false,bleMsg:'',pending:null,confirm:''};
function load(){try{const r=localStorage.getItem(KEY);if(r){const o=JSON.parse(r);if(o&&o.v===1)state=Object.assign(defaults(),o)}}catch(e){ui.saveFail=true}}
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(state));ui.saveFail=false}catch(e){ui.saveFail=true}}
/* elke wijziging krijgt een tijdstip, zodat de synchronisatie weet welke kant het nieuwst is */
function save(){state.updatedAt=Date.now();saveLocal();if(typeof syncSoon==='function')syncSoon()}

const idb={db:null,mem:new Map(),
  open(){return new Promise(res=>{try{const r=indexedDB.open('kopwerk',1);r.onupgradeneeded=()=>r.result.createObjectStore('streams');r.onsuccess=()=>{idb.db=r.result;res()};r.onerror=()=>res();r.onblocked=()=>res()}catch(e){res()}})},
  tx(mode,fn){return new Promise(res=>{if(!idb.db)return res(undefined);try{const t=idb.db.transaction('streams',mode);const q=fn(t.objectStore('streams'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>res(undefined);t.onabort=()=>res(undefined)}catch(e){res(undefined)}})},
  async put(k,v){if(!idb.db){idb.mem.set(k,v);return}await idb.tx('readwrite',s=>s.put(v,k))},
  async get(k){if(!idb.db)return idb.mem.get(k);return idb.tx('readonly',s=>s.get(k))},
  async del(k){if(!idb.db){idb.mem.delete(k);return}await idb.tx('readwrite',s=>s.delete(k))},
  async clear(){idb.mem.clear();await idb.tx('readwrite',s=>s.clear())}
};
