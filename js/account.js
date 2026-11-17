'use strict';
/* ================= account (Firebase Auth) =================
   Kopwerk werkt alleen met een account: Apple, Google of e-mail met wachtwoord.
   Na het inloggen komt eerst de synchronisatie (js/sync.js), daarna het instellen of de app zelf.
   Uitloggen zet eerst alles online en haalt het daarna van dit apparaat, zodat een volgende gebruiker niets van jou ziet.
   Account verwijderen wist alles online en op dit apparaat (Apple 5.1.1); bij Apple worden ook de sleutels ingetrokken.
   Een eerder inloggen op dit apparaat staat in `kopwerk.acct`, zodat de app zonder verbinding gewoon opent. */
const ACCT_KEY='kopwerk.acct';
const acct={fail:false,busy:'',err:'',note:'',mode:'',email:''};
const acctSaved=()=>{try{return JSON.parse(localStorage.getItem(ACCT_KEY)||'null')}catch(e){return null}};
function acctRemember(u){try{if(u)localStorage.setItem(ACCT_KEY,JSON.stringify({uid:u.uid}));else localStorage.removeItem(ACCT_KEY)}catch(e){}}
const PROV={'apple.com':'Apple','google.com':'Google',password:'E-mail'};

/* Wat er in plaats van de app komt: '' (de app), een leeg beginbeeld of het inlogscherm. */
function acctGate(){
  if(!CONFIG.firebase)return '';
  const u=syncInfo.user;
  if(u)return !state.setup&&!syncInfo.pulled?acctSplash():'';
  /* eerder ingelogd: niet wachten op het netwerk */
  if(acctSaved()&&!syncInfo.ready)return '';
  if(!syncInfo.ready&&!acct.fail)return acctSplash();
  return acctView();
}
const acctWrap=h=>`<main class="lmain"><div class="login">${h}</div></main>`;
const acctSplash=()=>acctWrap(`<div class="lbrand lsplash">${logo}<span>Kopwerk</span></div>`);

const LOGO_APPLE='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.8-1.42-.15-2.77.83-3.49.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.59-.75 2.99-.75 1.4 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.53 1.26-2.6-.03-.01-2.42-.93-2.45-3.69zM14.08 5.84c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.1 1.77-.96 2.82 1.02.08 2.07-.52 2.7-1.28z"/></svg>';
const LOGO_GOOGLE='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>';
const LOGO_MAIL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';

function acctView(){
  const err=acct.err?`<p class="lerr" role="alert">${esc(acct.err)}</p>`:'',note=acct.note?`<p class="lnote" role="status">${esc(acct.note)}</p>`:'';
  const busy=acct.busy?' disabled':'';
  if(!acct.mode)return acctWrap(`<div class="lbrand">${logo}<span>Kopwerk</span></div>
    <h1>Inloggen</h1>
    <div class="lbtns">${NATIVE?'':/* in de iOS-app volgt inloggen met Apple en Google via iOS zelf; pop-ups werken daar niet */`
      <button class="btn big lapple" data-act="acctApple"${busy}>${LOGO_APPLE}Doorgaan met Apple</button>
      <button class="btn big lgoogle" data-act="acctGoogle"${busy}>${LOGO_GOOGLE}Doorgaan met Google</button>`}
      <button class="btn big lmail" data-act="acctMode" data-m="mail"${busy}>${LOGO_MAIL}Doorgaan met e-mail</button>
    </div>${err}${acct.fail?'<button class="link small" data-act="acctRetry">Opnieuw proberen</button>':''}`);
  const m=acct.mode,T={mail:'Inloggen met e-mail',nieuw:'Nieuw account',reset:'Wachtwoord vergeten'}[m];
  const B={mail:'Inloggen',nieuw:'Account maken',reset:'Stuur een link'}[m];
  const pw=m==='reset'?'':`<div><label class="f" for="l-pw">Wachtwoord</label><input type="password" id="l-pw" autocomplete="${m==='nieuw'?'new-password':'current-password'}"${m==='nieuw'?' minlength="8" placeholder="minstens 8 tekens"':''}></div>`;
  const links=m==='mail'?`<button type="button" class="link small" data-act="acctMode" data-m="nieuw">Nieuw account</button><button type="button" class="link small" data-act="acctMode" data-m="reset">Wachtwoord vergeten</button>`
    :`<button type="button" class="link small" data-act="acctMode" data-m="mail">Ik heb al een account</button>`;
  return acctWrap(`<div class="loghd"><button class="ibtn plain" data-act="acctMode" data-m="" aria-label="Terug">${I.l}</button><h2>${T}</h2></div>
    <form class="lform" data-sub="acctSubmit" novalidate>
      <div><label class="f" for="l-mail">E-mailadres</label><input type="email" id="l-mail" autocomplete="email" inputmode="email" value="${esc(acct.email)}"></div>
      ${pw}${err}${note}
      <button class="btn pri big" type="submit"${busy}>${acct.busy?'Even wachten':B}</button>
    </form><div class="llinks">${links}</div>`);
}

/* foutcodes van Firebase in gewone taal */
function acctErr(e){
  const c=(e&&e.code||'').replace('auth/','');
  return {'invalid-credential':'E-mailadres of wachtwoord klopt niet.','wrong-password':'E-mailadres of wachtwoord klopt niet.','user-not-found':'E-mailadres of wachtwoord klopt niet.',
    'invalid-email':'Dit e-mailadres klopt niet.','missing-password':'Vul je wachtwoord in.','weak-password':'Kies een wachtwoord van minstens 8 tekens.',
    'email-already-in-use':'Er is al een account met dit e-mailadres. Log in of kies Wachtwoord vergeten.',
    'account-exists-with-different-credential':'Dit e-mailadres hoort bij een account met een andere manier van inloggen. Log daarmee in.',
    'too-many-requests':'Te vaak geprobeerd. Probeer het over een paar minuten opnieuw.','network-request-failed':'Geen verbinding.',
    'operation-not-allowed':'Deze manier van inloggen staat nog niet aan.','unauthorized-domain':'Inloggen kan niet vanaf dit adres.',
    'requires-recent-login':'Log opnieuw in om dit te bevestigen.','user-mismatch':'Log in met hetzelfde account.'}[c]||`Dat lukte niet (${c||'onbekend'}).`;
}
const acctSilent=e=>/popup-closed|cancelled-popup|user-cancelled/.test(e&&e.code||'');
/* scherm opnieuw opbouwen zonder wat je typte kwijt te raken */
function acctRender(){const g=id=>document.getElementById(id);if(g('l-mail'))acct.email=g('l-mail').value.trim();render()}

async function acctFb(){
  const f=await fbInit().catch(()=>null);
  if(!f){acct.fail=true;acct.err='Geen verbinding. Kopwerk heeft internet nodig om in te loggen.';render();return null}
  acct.fail=false;return f;
}
function acctProvider(f,id){
  if(id==='apple.com'){const p=new f.U.OAuthProvider('apple.com');p.addScope('email');p.setCustomParameters({locale:'nl_NL'});return p}
  const p=new f.U.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});return p;
}
async function acctPopup(id){
  const f=fb||await acctFb();if(!f)return;
  acct.err='';acct.note='';
  try{await f.U.signInWithPopup(f.auth,acctProvider(f,id))}
  catch(e){
    /* pop-up geblokkeerd (sommige browsers en apps op het beginscherm): dan via een doorverwijzing */
    if(/popup-blocked|operation-not-supported-in-this-environment/.test(e&&e.code||''))return f.U.signInWithRedirect(f.auth,acctProvider(f,id));
    if(!acctSilent(e)){acct.err=acctErr(e);acctRender()}
  }
}
async function acctSubmit(){
  const g=id=>document.getElementById(id),mail=(g('l-mail')||{}).value||'',pw=(g('l-pw')||{}).value||'',m=acct.mode;
  acct.email=mail.trim();acct.err='';acct.note='';
  if(!/^\S+@\S+\.\S+$/.test(acct.email)){acct.err='Vul je e-mailadres in.';return render()}
  if(m!=='reset'&&!pw){acct.err='Vul je wachtwoord in.';return render()}
  if(m==='nieuw'&&pw.length<8){acct.err='Kies een wachtwoord van minstens 8 tekens.';return render()}
  const f=fb||await acctFb();if(!f)return;
  acct.busy=m;render();
  try{
    if(m==='mail')await f.U.signInWithEmailAndPassword(f.auth,acct.email,pw);
    else if(m==='nieuw'){const c=await f.U.createUserWithEmailAndPassword(f.auth,acct.email,pw);f.U.sendEmailVerification(c.user).catch(()=>{})}
    else{await f.U.sendPasswordResetEmail(f.auth,acct.email);acct.note='Als er een account met dit adres is, staat er nu een link in je mail.'}
  }catch(e){acct.err=acctErr(e)}
  acct.busy='';
  if(m==='mail'||m==='nieuw'){if(!acct.err){acct.mode='';acct.email=''}}
  render();
}

/* ---------- Profiel ---------- */
function acctCard(){
  const u=syncInfo.user;if(!CONFIG.firebase||!u)return '';
  const t=syncInfo.at?pad(new Date(syncInfo.at).getHours())+':'+pad(new Date(syncInfo.at).getMinutes()):'';
  const sub=[PROV[u.prov]||'',syncInfo.err||(t?'bijgewerkt om '+t:'')].filter(Boolean).join(' · ');
  const ver=u.prov==='password'&&!u.verified?`<div class="li"><span class="w"><b>Bevestig je e-mail</b></span><button class="btn small" data-act="acctVerify">Mail opnieuw</button></div>`:'';
  return `<div class="card"><div style="margin-bottom:6px">${sech('tblue',I.user,'Account')}</div><div class="list">
    <div class="li"><span class="w"><b>${esc(u.email||'Ingelogd')}</b><span>${sub}</span></span><button class="btn small" data-act="acctLogout">Uitloggen</button></div>${ver}
    <div class="li"><span class="w"><b>Account verwijderen</b></span><button class="btn small warn" data-act="acctDel">Verwijderen</button></div></div></div>`;
}
function acctDelModal(){
  const n=state.rides.filter(r=>!r.sim).length,u=syncInfo.user||{},M=ui.modal;
  const how=u.prov==='password'?`<div><label class="f" for="d-pw">Wachtwoord</label><input type="password" id="d-pw" autocomplete="current-password"></div>`
    :`<p class="small muted">Je logt nog één keer in met ${PROV[u.prov]||'je account'} om het te bevestigen.</p>`;
  return `<div class="veil" data-act="veil"><div class="modal narrow stack" role="dialog" aria-modal="true" aria-label="Account verwijderen">
    <h2>Account verwijderen?</h2>
    <p>Je account, je schema${n?` en ${ritTxt(n)}`:''} worden verwijderd, online en op dit apparaat. Dit kun je niet terugdraaien.</p>
    ${how}${M.err?`<p class="lerr" role="alert">${esc(M.err)}</p>`:''}
    <div class="row"><button class="btn danger" data-act="acctDelGo"${M.busy?' disabled':''}>${M.busy?'Bezig met verwijderen':'Verwijderen'}</button><button class="btn" data-act="backup">Eerst een back-up</button><button class="btn" data-act="closeModal">Annuleren</button></div></div></div>`;
}
/* dit apparaat leeg: na uitloggen of verwijderen */
async function acctClearDevice(){
  clearTimeout(syncT);
  state=defaults();saveLocal();await idb.clear();
  try{localStorage.removeItem(SYNC_KEY);localStorage.removeItem('kopwerk.synchint')}catch(e){}
  acctRemember(null);
  Object.assign(ui,{modal:null,confirm:'',step:0,view:'vandaag',detail:null,streams:null,pending:null,rideId:null,draft:null,setupAvail:null});
  if(typeof routeKey!=='undefined')routeKey=null;
  syncInfo.pulled=false;syncInfo.at=0;syncInfo.err='';
}
async function acctLogout(){
  if(!fb||!syncInfo.user)return;
  /* eerst alles online, anders gaat er iets verloren */
  try{await syncPush()}catch(e){return toast('Niet alles staat online. Probeer het opnieuw met verbinding.')}
  await acctClearDevice();
  await fb.U.signOut(fb.auth).catch(()=>{});
  syncInfo.user=null;acct.mode='';acct.err='';render();window.scrollTo(0,0);
}
/* alles van deze gebruiker in Firestore: users/{uid}, en de ritten en meetgegevens eronder */
async function acctWipeOnline(uid){
  const F=fb.F;
  for(const c of ['rides','streams']){
    const snap=await F.getDocs(F.collection(fb.db,'users',uid,c));
    let b=F.writeBatch(fb.db),n=0;
    for(const d of snap.docs){b.delete(d.ref);if(++n>=400){await b.commit();b=F.writeBatch(fb.db);n=0}}
    if(n)await b.commit();
  }
  await F.deleteDoc(F.doc(fb.db,'users',uid));
}
async function acctDelGo(){
  const M=ui.modal,u=fb&&fb.auth.currentUser;if(!M||!u)return;
  const prov=(syncInfo.user||{}).prov,U=fb.U;M.err='';
  let token=null;
  /* eerst opnieuw bevestigen; de pop-up moet direct na de tik komen */
  try{
    if(prov==='password'){const pw=(document.getElementById('d-pw')||{}).value||'';if(!pw){M.err='Vul je wachtwoord in.';return render()}
      await U.reauthenticateWithCredential(u,U.EmailAuthProvider.credential(u.email,pw))}
    else{const r=await U.reauthenticateWithPopup(u,acctProvider(fb,prov));
      if(prov==='apple.com'){const c=U.OAuthProvider.credentialFromResult(r);token=c&&c.accessToken}}
  }catch(e){if(!acctSilent(e)){M.err=acctErr(e);render()}return}
  M.busy=true;render();
  try{
    await acctWipeOnline(u.uid);
    /* Apple eist dat de koppeling met Kopwerk ook bij Apple verdwijnt */
    if(token&&U.revokeAccessToken)await U.revokeAccessToken(fb.auth,token).catch(()=>{});
    await U.deleteUser(u);
  }catch(e){M.busy=false;M.err=acctErr(e);return render()}
  await acctClearDevice();syncInfo.user=null;acct.mode='';render();window.scrollTo(0,0);
  toast('Je account is verwijderd.');
}

const ACCT_ACTIONS={
  acctApple(){acctPopup('apple.com')},
  acctGoogle(){acctPopup('google.com')},
  acctMode(d){acct.mode=d.m||'';acct.err='';acct.note='';acctRender();const el=document.getElementById('l-mail');if(el&&!el.value)el.focus()},
  acctRetry(){acct.err='';acctFb().then(f=>{if(f)render()})},
  acctLogout(){acctLogout()},
  acctVerify(){const u=fb&&fb.auth.currentUser;if(u)fb.U.sendEmailVerification(u).then(()=>toast('Er staat een nieuwe link in je mail.'),e=>toast(acctErr(e)))},
  acctDel(){ui.modal={kind:'acctDel'};render()},
  acctDelGo(){acctDelGo()}
};
/* inloggen met e-mail is een echt formulier, zodat Enter en wachtwoordbeheerders werken */
document.addEventListener('submit',e=>{const f=e.target;if(f&&f.dataset&&f.dataset.sub==='acctSubmit'){e.preventDefault();acctSubmit()}});
