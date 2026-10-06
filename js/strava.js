'use strict';
/* ================= Strava ================= */
/* Tokens staan in state.strava (dus gesynchroniseerd, niet in back-ups); het geheim staat alleen in de Worker. */
const stravaReady=()=>!!(CONFIG.strava&&CONFIG.strava.clientId&&CONFIG.strava.worker);
const stravaRedirect=()=>location.origin+location.pathname;
let stravaBusy=false;
function stravaConnect(){
  const q=new URLSearchParams({client_id:CONFIG.strava.clientId,response_type:'code',redirect_uri:stravaRedirect(),approval_prompt:'auto',scope:'activity:read_all'});
  location.href='https://www.strava.com/oauth/authorize?'+q;
}
async function stravaTokenCall(body){
  const r=await fetch(CONFIG.strava.worker+'/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const t=await r.json().catch(()=>({}));if(!r.ok||!t.access_token)throw new Error('token');return t;
}
/* terugkomst van Strava na het koppelen: ?code=...&scope=... */
async function stravaCallback(){
  const q=new URLSearchParams(location.search);if(!q.has('code')&&!q.has('error'))return false;
  history.replaceState(null,'',stravaRedirect());
  if(q.get('error')||!/activity:read/.test(q.get('scope')||''))return toast('Strava is niet gekoppeld. Geef toegang tot je activiteiten om ritten op te halen.'),true;
  try{
    const t=await stravaTokenCall({code:q.get('code')});
    state.strava={access:t.access_token,refresh:t.refresh_token,exp:t.expires_at,name:t.athlete?[t.athlete.firstname,t.athlete.lastname].filter(Boolean).join(' '):'',since:Math.floor(Date.now()/1000)-60*86400};
    save();render();toast('Strava is gekoppeld. Je ritten van de laatste twee maanden worden opgehaald.');
    stravaFetch(true);
  }catch(e){toast('Koppelen met Strava lukte niet. Probeer het opnieuw.')}
  return true;
}
async function stravaGet(path){
  const s=state.strava;
  if(s.exp*1000<Date.now()+60000){const t=await stravaTokenCall({refresh_token:s.refresh});Object.assign(s,{access:t.access_token,refresh:t.refresh_token,exp:t.expires_at});save()}
  const r=await fetch(CONFIG.strava.worker+'/api/'+path,{headers:{Authorization:'Bearer '+s.access}});
  if(!r.ok)throw new Error('strava '+r.status);return r.json();
}
/* Haalt nieuwe fietsritten op. Ritten die al in Kopwerk staan (zelfde starttijd) worden overgeslagen. */
async function stravaFetch(manual){
  if(!state.strava||!stravaReady()||stravaBusy)return;
  stravaBusy=true;let n=0;
  try{
    const acts=(await stravaGet(`athlete/activities?after=${state.strava.since}&per_page=50`)).sort((a,b)=>a.start_date.localeCompare(b.start_date));
    for(const a of acts){
      const sport=a.sport_type||a.type||'',ts=Date.parse(a.start_date),id='s'+a.id;
      state.strava.since=Math.max(state.strava.since,Math.floor(ts/1000));
      if(!/Ride$/.test(sport)||/EBike/.test(sport))continue;
      if(state.rides.some(r=>r.id===id||(!r.sim&&Math.abs((r.ts||0)-ts)<30*60000))||(state.deleted||[]).includes(id))continue;
      const st=await stravaGet(`activities/${a.id}/streams?keys=time,watts,heartrate,cadence&key_by_type=true`);
      const T=(st.time&&st.time.data)||[],v=(k,i)=>st[k]&&st[k].data?st[k].data[i]:null;
      const res=resample(T.map((t,i)=>({t:ts/1000+t,p:v('watts',i),hr:v('heartrate',i),cad:v('cadence',i)})));
      if(res.rec.p.length<120)continue;
      const ride=makeRide({wo:{name:a.name||'Buitenrit',type:'buiten',sec:res.rec.p.length},ftp:state.profile.ftp,rec:res.rec,laps:[{l:'Rit',k:'steady',c:0,s:0}],sim:false,startTs:ts});
      ride.id=id;ride.adj=true;ride.strava=a.id;
      if(!res.hasP){const IF=EFFORT[1][0];ride.IF=IF;ride.tss=Math.round(ride.dur/3600*IF*IF*100);ride.noPower=true;ride.best={};ride.zones=[0,0,0,0,0,0,0]}
      markRecords(ride);state.rides.push(ride);await idb.put('s:'+id,res.rec);n++;
    }
    if(n)toast(`${n} ${n===1?'rit':'ritten'} van Strava opgehaald.`);else if(manual)toast('Geen nieuwe ritten op Strava.');
  }catch(e){if(manual)toast('Ophalen van Strava lukte niet. Probeer het later opnieuw.')}
  state.strava.checked=Date.now();save();stravaBusy=false;if(!P)render();
}
