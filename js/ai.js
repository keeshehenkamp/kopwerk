'use strict';
/* ================= AI-coach (Claude) ================= */
/* De sleutel staat in een eigen localStorage-sleutel, los van de state: hij komt dus niet in back-ups terecht. */
const AI_KEY='kopwerk.ai';
const AI_MODEL='claude-opus-5-5';
const AI_SDK='https://esm.sh/@anthropic-ai/sdk@0.131.0';
const aiKey=()=>{try{return localStorage.getItem(AI_KEY)||''}catch(e){return ''}};
const aiSetKey=k=>{try{if(k)localStorage.setItem(AI_KEY,k);else localStorage.removeItem(AI_KEY);return true}catch(e){return false}};
let aiLib=null,aiClient=null,aiClientKey='';
async function aiGetClient(){
  const key=aiKey();if(!key)throw new Error('nokey');
  if(!aiLib)aiLib=(await import(AI_SDK)).default;
  if(!aiClient||aiClientKey!==key){aiClient=new aiLib({apiKey:key,dangerouslyAllowBrowser:true});aiClientKey=key}
  return aiClient;
}
function aiError(e){
  if(e&&e.message==='nokey')return 'Vul eerst je Claude-sleutel in bij Profiel.';
  if(aiLib&&e instanceof aiLib.AuthenticationError)return 'Claude herkent de sleutel niet. Controleer hem bij Profiel.';
  if(aiLib&&e instanceof aiLib.PermissionDeniedError)return 'Deze sleutel mag Claude niet gebruiken. Kijk op console.anthropic.com of je tegoed en rechten in orde zijn.';
  if(aiLib&&e instanceof aiLib.RateLimitError)return 'Claude is even te druk of je limiet is bereikt. Probeer het later opnieuw.';
  if(aiLib&&e instanceof aiLib.BadRequestError)return 'Claude kon de vraag niet verwerken. Is er nog tegoed op je account? ('+(e.message||'').slice(0,120)+')';
  if(aiLib&&e instanceof aiLib.APIConnectionError)return 'Geen verbinding met Claude. Controleer je internet.';
  if(aiLib&&e instanceof aiLib.APIError)return 'Claude gaf een fout ('+e.status+'). Probeer het later opnieuw.';
  if(e&&e.message==='refusal')return 'Claude wilde deze vraag niet beantwoorden.';
  if(e&&e.message==='noprofile')return 'Claude kon geen bruikbaar profiel van dit evenement maken. Controleer de naam en probeer het opnieuw.';
  return 'Het lukte niet om Claude te bereiken. Probeer het opnieuw.';
}

/* ---------- evenement onderzoeken ---------- */
const CLIMB={type:'object',additionalProperties:false,required:['naam','lengte_km','gemiddeld_pct','max_pct','km_in_route'],properties:{
  naam:{type:'string'},lengte_km:{type:'number',description:'lengte van de helling in km'},
  gemiddeld_pct:{type:'number',description:'gemiddeld stijgingspercentage'},max_pct:{type:'number',description:'steilste stuk in procent'},
  km_in_route:{type:'number',description:'bij welke kilometer de helling begint, 0 als onbekend'}}};
const EVENT_TOOL={name:'eventprofiel_opslaan',strict:true,
  description:'Sla het onderzochte profiel van het evenement op. Roep dit precies één keer aan, als laatste stap, met alleen gegevens die je in bronnen hebt gevonden.',
  input_schema:{type:'object',additionalProperties:false,
    required:['gevonden','naam','afstand_km','hoogtemeters','soort','klimmen','kenmerken','zekerheid','bronnen'],
    properties:{
      gevonden:{type:'boolean',description:'false als je het evenement niet met zekerheid kon vinden'},
      naam:{type:'string',description:'officiële naam, met de afstandsvariant'},
      afstand_km:{type:'number'},hoogtemeters:{type:'number',description:'totaal aantal hoogtemeters, 0 als onbekend'},
      soort:{type:'string',enum:['vlak','heuvels','bergen','koers'],description:'vlak = weinig klimwerk; heuvels = veel korte hellingen tot ongeveer 3 km; bergen = lange klimmen; koers = wedstrijd'},
      klimmen:{type:'array',items:CLIMB,description:'de belangrijkste hellingen in de route, hoogstens 25, in volgorde van de route'},
      kenmerken:{type:'string',description:'twee tot vier korte zinnen in het Nederlands over wat dit evenement fysiek vraagt, zonder opsmuk'},
      zekerheid:{type:'string',enum:['hoog','middel','laag']},
      bronnen:{type:'array',items:{type:'string'},description:'webadressen waar de gegevens vandaan komen'}}}};
const EVENT_SYSTEM=`Je onderzoekt wielerevenementen voor een trainingsapp. Zoek met web_search naar de route van het opgegeven evenement: afstand, hoogtemeters en de hellingen met lengte en stijgingspercentage. Gebruik bij voorkeur de officiële website van de organisatie, en daarnaast bronnen als Strava-segmenten, climbfinder of cyclingcols voor de hellingen.
Heeft het evenement meerdere afstanden, neem dan de afstand die de renner opgeeft, of anders de meest gereden toerafstand.
Gebruik alleen gegevens die je in bronnen vindt. Weet je iets niet, vul dan 0 in en zet zekerheid lager; verzin geen hellingen.
Roep tot slot eventprofiel_opslaan aan met het resultaat.`;

async function aiResearchEvent(ev){
  const client=await aiGetClient();
  const ask=`Evenement: ${ev.name}\nDatum: ${ev.date||'onbekend'}\nAfstand die ik rijd: ${ev.km?ev.km+' km':'onbekend'}`;
  const messages=[{role:'user',content:ask}];
  for(let round=0;round<6;round++){
    const msg=await client.beta.messages.stream({
      model:AI_MODEL,max_tokens:32000,
      betas:['server-side-fallback-2026-07-01'],fallbacks:'default',
      output_config:{effort:'high'},
      system:EVENT_SYSTEM,
      tools:[{type:'web_search_20260209',name:'web_search',max_uses:8},EVENT_TOOL],
      messages
    }).finalMessage();
    if(msg.stop_reason==='refusal')throw new Error('refusal');
    if(msg.stop_reason==='max_tokens')throw new Error('noprofile');
    const call=msg.content.find(b=>b.type==='tool_use'&&b.name===EVENT_TOOL.name);
    if(call){
      const p=call.input;
      if(!p||typeof p!=='object'||!p.gevonden||!(p.afstand_km>0)||!Array.isArray(p.klimmen))throw new Error('noprofile');
      return p;
    }
    messages.push({role:'assistant',content:msg.content});
    /* bij pause_turn hervat de server zelf; anders vragen we om het profiel op te slaan */
    if(msg.stop_reason!=='pause_turn')messages.push({role:'user',content:'Roep nu eventprofiel_opslaan aan met wat je hebt gevonden.'});
  }
  throw new Error('noprofile');
}

/* ---------- hellingen doorrekenen ---------- */
/* snelheid op een helling bij een vermogen: zwaartekracht, rolweerstand en luchtweerstand (renner + 9 kg fiets) */
function climbSpeed(P,grade,mass){
  const g=9.81,crr=.004,cda=.35,rho=1.2,th=Math.atan(grade),eff=.97;
  let v=5;for(let k=0;k<30;k++){const f=mass*g*v*(Math.sin(th)+crr*Math.cos(th))+.5*rho*cda*v*v*v-P*eff,df=mass*g*(Math.sin(th)+crr*Math.cos(th))+1.5*rho*cda*v*v;v=Math.max(.5,v-f/df)}
  return v;
}
/* richtvermogen per helling: hoe korter de klim, hoe verder boven je FTP; in een lange tocht iets voorzichtiger */
const climbFrac=min=>min<2?1.15:min<5?1.05:min<10?.98:min<20?.92:min<40?.88:.82;
function climbPlan(c,ftp,weight,longEvent){
  const mass=weight+9,km=Math.max(.05,c.lengte_km||0),gr=clamp((c.gemiddeld_pct||0)/100,0,.25);
  let f=.95,min=0;
  for(let k=0;k<3;k++){const v=climbSpeed(ftp*f,gr,mass);min=km*1000/v/60;f=climbFrac(min)*(longEvent?.95:1)}
  return {min,watt:Math.round(ftp*f),pct:Math.round(f*100)};
}
/* korte samenvatting voor de coach: hoe lang de hellingen duren */
function profileSummary(p,ftp,weight){
  const long=(p.afstand_km||0)>=120;
  const cs=(p.klimmen||[]).filter(c=>c.lengte_km>0).map(c=>Object.assign({},c,climbPlan(c,ftp,weight,long)));
  const mins=cs.map(c=>c.min).sort((a,b)=>a-b);
  return {climbs:cs,median:mins.length?mins[Math.floor(mins.length/2)]:0,climbMin:mins.reduce((a,b)=>a+b,0)};
}
