'use strict';
/* ================= synchronisatie (Firebase) ================= */
/* users/{uid}: instellingen en schema (zonder ritten); users/{uid}/rides/{id}: één rit; users/{uid}/streams/{id}: meetgegevens. */
const FB='https://www.gstatic.com/firebasejs/12.19.0/';
const SYNC_KEY='kopwerk.sync';
let fb=null,syncT=0;
const syncInfo={user:null,at:0,busy:false,err:''};
const hashOf=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h};
const syncMeta=()=>{try{return Object.assign({lastPull:0,main:0,h:{},up:{}},JSON.parse(localStorage.getItem(SYNC_KEY)||'{}'))}catch(e){return {lastPull:0,main:0,h:{},up:{}}}};
const syncMetaSave=m=>{try{localStorage.setItem(SYNC_KEY,JSON.stringify(m))}catch(e){}};
async function fbInit(){
  if(fb||!CONFIG.firebase)return fb;
  const [A,U,F]=await Promise.all(['app','auth','firestore'].map(m=>import(FB+'firebase-'+m+'.js')));
  const app=A.initializeApp(CONFIG.firebase);
  fb={U,F,auth:U.getAuth(app),db:F.getFirestore(app)};
  U.onAuthStateChanged(fb.auth,u=>{syncInfo.user=u?{uid:u.uid,email:u.email}:null;syncInfo.ready=true;if(!P)render();if(u)syncPull()});
  return fb;
}
async function syncLogin(){
  const f=await fbInit().catch(()=>null);if(!f)return toast('Synchronisatie is nog niet ingesteld.');
  try{await f.U.signInWithPopup(f.auth,new f.U.GoogleAuthProvider())}
  catch(e){if(!/popup-closed|cancelled-popup/.test(e&&e.code||''))toast('Inloggen lukte niet ('+(e&&e.code||'onbekend')+').')}
}
async function syncLogout(){if(fb){await fb.U.signOut(fb.auth);syncInfo.user=null;try{localStorage.removeItem(SYNC_KEY)}catch(e){}render()}}
const uRef=(...p)=>fb.F.doc(fb.db,'users',syncInfo.user.uid,...p);
/* Haalt wijzigingen van andere apparaten op en voegt ze samen: ritten van beide kanten, de rest van de nieuwste kant. */
async function syncPull(){
  if(!syncInfo.user||syncInfo.busy)return;
  syncInfo.busy=true;syncLastPull=Date.now();
  try{
    const F=fb.F,meta=syncMeta();
    const main=await F.getDoc(uRef());
    const docs=await F.getDocs(F.query(F.collection(fb.db,'users',syncInfo.user.uid,'rides'),F.where('u','>',meta.lastPull)));
    const before=JSON.stringify(state);
    if(main.exists()){
      const remote=JSON.parse(main.data().j);
      const remoteWins=(remote.setup&&!state.setup)||((remote.updatedAt||0)>(state.updatedAt||0)&&!(state.setup&&!remote.setup));
      const del=[...new Set([...(state.deleted||[]),...(remote.deleted||[])])];
      if(remoteWins){const keep={rides:state.rides};state=Object.assign(defaults(),remote,keep)}
      state.deleted=del;meta.main=remoteWins?hashOf(main.data().j):meta.main;
    }
    docs.forEach(s=>{
      const d=s.data(),r=JSON.parse(d.j),cur=state.rides.find(x=>x.id===r.id);
      meta.lastPull=Math.max(meta.lastPull,d.u||0);
      if(cur&&meta.h[r.id]!==hashOf(JSON.stringify(cur)))return; /* hier gewijzigd en nog niet verstuurd: lokaal wint */
      state.rides=state.rides.filter(x=>x.id!==r.id).concat(r);meta.h[r.id]=hashOf(d.j);
    });
    const del=new Set(state.deleted||[]);state.rides=state.rides.filter(r=>!del.has(r.id));
    syncMetaSave(meta);
    if(JSON.stringify(state)!==before){saveLocal();if(!P)render()}
    await syncPush();
    syncInfo.err='';
  }catch(e){syncInfo.err='Synchroniseren lukte niet.'}
  syncInfo.busy=false;syncInfo.at=Date.now();
  if(!P&&ui.view==='profiel')render();
}
/* terug in de app of het tabblad: ophalen wat je op je andere apparaat deed (hooguit eens per halve minuut) */
let syncLastPull=0;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&syncInfo.user&&!P&&Date.now()-syncLastPull>30000)syncPull()});
function syncSoon(){if(!syncInfo.user)return;clearTimeout(syncT);syncT=setTimeout(()=>syncPush().catch(()=>{}),2000)}
/* Verstuurt alleen wat sinds de vorige keer veranderd is, plus meetgegevens die nog niet online staan. */
async function syncPush(){
  if(!syncInfo.user)return;
  const F=fb.F,meta=syncMeta(),now=Date.now();
  const {rides,...rest}=state,mj=JSON.stringify(rest);let batch=F.writeBatch(fb.db),n=0;
  const flush=async()=>{if(n){await batch.commit();batch=F.writeBatch(fb.db);n=0}};
  if(meta.main!==hashOf(mj)){batch.set(uRef(),{j:mj,u:now});meta.main=hashOf(mj);n++}
  for(const r of rides){const j=JSON.stringify(r),h=hashOf(j);if(meta.h[r.id]!==h){batch.set(uRef('rides',r.id),{j,u:now});meta.h[r.id]=h;if(++n>=400)await flush()}}
  for(const id of state.deleted||[])if(meta.h[id]!=='x'){batch.delete(uRef('rides',id));batch.delete(uRef('streams',id));meta.h[id]='x';n+=2}
  await flush();
  for(const r of rides){
    if(meta.up[r.id]||r.manual)continue;
    const rec=await idb.get('s:'+r.id);if(!rec)continue;
    await F.setDoc(uRef('streams',r.id),{j:JSON.stringify(rec)});meta.up[r.id]=1;
  }
  syncMetaSave(meta);syncInfo.at=now;
}
/* meetgegevens van een rit die op een ander apparaat is gereden */
async function syncGetStream(id){
  if(!syncInfo.user)return null;
  try{const s=await fb.F.getDoc(uRef('streams',id));if(!s.exists())return null;const rec=JSON.parse(s.data().j);await idb.put('s:'+id,rec);return rec}catch(e){return null}
}
