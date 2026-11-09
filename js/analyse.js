'use strict';
/* ================= analysis ================= */
function normPower(p){
  const n=p.length;if(!n)return 0;
  if(n<30)return avg(p);
  let sum=0,acc=0,c=0;
  for(let i=0;i<n;i++){sum+=p[i];if(i>=30)sum-=p[i-30];if(i>=29){acc+=(sum/30)**4;c++}}
  return (acc/c)**.25;
}
function bestEffort(p,w){
  if(p.length<w)return 0;
  let s=0,b=0;
  for(let i=0;i<p.length;i++){s+=p[i];if(i>=w)s-=p[i-w];if(i>=w-1&&s>b)b=s}
  return Math.round(b/w);
}
const BESTS=[[5,'5 sec'],[15,'15 sec'],[30,'30 sec'],[60,'1 min'],[120,'2 min'],[300,'5 min'],[600,'10 min'],[1200,'20 min'],[1800,'30 min'],[3600,'60 min']];

function lapStats(rec,laps){
  const n=rec.p.length,out=[];
  for(let i=0;i<laps.length;i++){
    const a=laps[i].s,b=i<laps.length-1?laps[i+1].s:n;
    if(b<=a)continue;
    const p=rec.p.slice(a,b),t=rec.tgt.slice(a,b),h=rec.hr.slice(a,b).filter(x=>x>0),c=rec.cad.slice(a,b).filter(x=>x>0);
    const ap=avg(p),at=avg(t);
    out.push({label:laps[i].l,kind:laps[i].k,cadT:laps[i].c||0,s:a,d:b-a,p:Math.round(ap),t:Math.round(at),t0:t[0],t1:t[t.length-1],
      dev:at>0?(ap/at-1)*100:0,hr:h.length?Math.round(avg(h)):0,cad:c.length?Math.round(avg(c)):0});
  }
  return out;
}

/* sweet spot is een gebied dat je op gevoel invult, geen exact getal: daar telt pas een afwijking boven de 5% */
const tolOf=l=>/^Sweet spot/.test(l.label||'')?5:2;
function analyze(rec,ftp,laps,plannedSec,type){
  const p=rec.p,n=p.length;
  const np=normPower(p),IF=ftp?np/ftp:0;
  const hrv=rec.hr.filter(x=>x>0),cv=rec.cad.filter(x=>x>0);
  const zones=[0,0,0,0,0,0,0];
  for(const v of p)zones[zoneOf(v/ftp)-1]++;
  const best={};for(const[w]of BESTS)best[w]=bestEffort(p,w);
  let score=null,miss=null;
  if(!isFtpTest(type)&&type!=='vrij'){
    /* heeft de training werkblokken, dan bepalen die het cijfer; bij een duurrit telt het rustige rijden.
       Warming-up, herstel en cooling-down tellen nauwelijks mee. Elke procent afwijking boven de 2% kost 5 punten. */
    const LS=lapStats(rec,laps),hasWork=LS.some(l=>l.kind==='work'&&l.d>=20),KW=hasWork?{work:1}:{steady:1};let w=0,acc=0;
    for(const l of LS){
      if(l.d<20||l.t<=0)continue;
      const s=clamp(100-Math.max(0,Math.abs(l.dev)-tolOf(l))*5,0,100),k=l.d*(KW[l.kind]||(hasWork?.04:.3));
      acc+=s*k;w+=k;
    }
    if(w>0)score=Math.round(acc/w*Math.min(1,n/Math.max(1,plannedSec)));
    /* welke blokken duidelijk naast het doel zaten, voor de uitleg bij het cijfer */
    const tel=LS.filter(l=>l.d>=20&&l.t>0&&(hasWork?l.kind==='work':l.kind==='steady')),off=tel.filter(l=>Math.abs(l.dev)>tolOf(l)+4);
    if(tel.length)miss={n:off.length,N:tel.length,low:off.filter(l=>l.dev<0).length};
  }
  let decoup=null;
  if(['duur','herstel','souplesse'].includes(type)&&n>=1200&&hrv.length>n*.8){
    const h=Math.floor(n/2);
    const f=(a,b)=>{const pp=avg(p.slice(a,b)),hh=avg(rec.hr.slice(a,b).filter(x=>x>0));return hh?pp/hh:0};
    const e1=f(0,h),e2=f(h,n);
    if(e1>0&&e2>0)decoup=+((e1-e2)/e1*100).toFixed(1);
  }
  return {dur:n,avgP:Math.round(avg(p)),np:Math.round(np),IF:+IF.toFixed(2),tss:Math.round(n*np*IF/(ftp*3600)*100)||0,
    kj:Math.round(p.reduce((a,b)=>a+b,0)/1000),avgHr:hrv.length?Math.round(avg(hrv)):0,maxHr:hrv.length?Math.max(...hrv):0,
    avgCad:cv.length?Math.round(avg(cv)):0,zones,best,score,miss,decoup};
}

/* cijfer van 1 tot 10 voor de uitvoering: hoe dicht je bij het doelvermogen bleef en of je de hele training reed */
const cijfer=r=>r&&r.score!=null?Math.max(1,r.score/10):null;
/* stap op de opbouwladder na een rit: terug bij te zwaar, omhoog als het goed ging */
/* Hoeveel een training de volgende keer verandert, in tredes. Beter word je door steeds iets meer te doen:
   voelt hij zoals verwacht, dan gaat hij langzaam omhoog. Alles rekent vanaf het verwachte gevoel van die soort training.
   Slecht uitgevoerd gaat voor; een hoge hartslag houdt de stap tegen, een lage geeft een extra duwtje. */
function progStep(r){
  if(r.score!=null&&r.score<70)return -1;
  if(r.score!=null&&r.score<85)return 0;
  const rel=r.rpe-(rpeExp(r.type)??6);
  let st=rel>=2?-1:rel===1?0:rel===0?.5:1;
  if(r.hrOff!=null){if(r.hrOff>=6)st=Math.min(st,0);else if(r.hrOff<=-6&&rel<=0)st+=.5}
  return st;
}
/* De nieuwe trede komt uit de stand vóór deze rit, niet uit de trede die je reed: zo telt een tijdelijke verlaging
   (moe, herstelweek) of verhoging (piek) niet als blijvend. Pas je je gevoel later aan, dan rekent hij vanaf dezelfde stand. */
function applyProg(r,again){
  state.prog=state.prog||{};
  if(r.prog0==null)r.prog0=!again&&state.prog[r.type]!=null?state.prog[r.type]:r.lvl;
  state.prog[r.type]=clamp(r.prog0+progStep(r),1,LADDER[r.type].steps.length);
}
/* Een FTP is een schatting. De marge is de herhaalfout van een test thuis (CV 3,7%, Matta 2022); een kleiner verschil dan 5 W nemen we niet vanzelf over. */
const ftpMargin=w=>Math.round((w||0)*.037);
const ftpAdopt=(e,old)=>e>=60&&Math.abs(e-old)>=5;
/* de verhouding tussen je beste rampminuut en je FTP: 75%, tot een 20-minutentest jouw eigen verhouding geeft (calibrate) */
const rampRatio=()=>(state.ftpCal&&state.ftpCal.r)||.75;
function ftpEstimate(r){
  if(r.sim)return 0;
  if(r.type==='ramptest')return r.best[60]?Math.round(r.best[60]*rampRatio()):0;
  if(r.type==='test20')return r.best[1200]?Math.round(r.best[1200]*.95):0;
  /* uit een gewone rit: beste 20 minuten x 0,95 of beste 60 minuten gaan voor; 5 minuten x 0,80 alleen als er niets langers is */
  return Math.round(Math.max((r.best[1200]||0)*.95,r.best[3600]||0)||(r.best[300]||0)*.8);
}
/* Eén 20-minutentest naast een ramptest van de vier weken ervoor: daaruit volgt je eigen verhouding. Te ver onder wat de ramp aangaf, dan was hij niet voluit en telt hij niet.
   De aanpak is eigen afleiding; dat de verhouding per persoon verschilt, is literatuur (Iannetta 2020). */
function calibrate(r,st){
  if(r.sim||r.type!=='test20'||!r.best||!r.best[1200])return false;
  const a=(st.rides||[]).filter(x=>!x.sim&&x.type==='ramptest'&&x.best&&x.best[60]&&x.date<=r.date&&dayDiff(parseISO(x.date),parseISO(r.date))<=28).sort((x,y)=>x.date<y.date?1:-1)[0];
  if(!a)return false;
  const t=r.best[1200]*.95;if(t<a.best[60]*.75*.85)return false;
  st.ftpCal={r:+clamp(t/a.best[60],.65,.85).toFixed(3),ramp:a.date,t20:r.date};return true;
}

function fitness(rides,today,span){
  const real=rides.filter(r=>!r.sim);
  const by={};for(const r of real)by[r.date]=(by[r.date]||0)+r.tss;
  let first=addDays(today,-span);
  for(const r of real){const d=parseISO(r.date);if(d<first)first=d}
  let ctl=0,atl=0;const series=[];
  const N=dayDiff(first,today);
  for(let i=0;i<=N;i++){
    const d=addDays(first,i),t=by[iso(d)]||0;
    ctl+=(t-ctl)/42;atl+=(t-atl)/7;
    if(N-i<=span)series.push({d,ctl,atl});
  }
  return {series,ctl:Math.round(ctl),atl:Math.round(atl),tsb:Math.round(ctl-atl)};
}

/* ---------- een rit buiten de app naast de training van die dag ----------
   Per werkblok uit de training zoeken we in de rit het beste stuk van dezelfde lengte (zonder overlap, zwaarste blok eerst).
   Gehaald als het gemiddelde minstens 93% van het doel is (korte blokken 90%). Zonder werkblokken (duurrit): lang genoeg
   en niet veel harder dan bedoeld. Het cijfer is voor de training die je zou doen; wat de rit wel was, telt apart. */
function compareRide(wo,p,ftp){
  const n=p.length,pre=new Float64Array(n+1);for(let i=0;i<n;i++)pre[i+1]=pre[i]+(p[i]||0);
  const work=wo.segs.filter(s=>s.kind==='work'&&s.d>=20).map(s=>({d:s.d,t:ftp*(s.a+s.b)/2})).sort((a,b)=>b.t-a.t),used=[];
  const dur=Math.min(1,n/Math.max(1,wo.sec));
  if(!work.length){
    const IF=ftp?normPower(p)/ftp:0,over=Math.max(0,IF-wo.IF-.08);
    return {score:Math.round(100*(.6*dur+.4*clamp(1-over*5,0,1))),hit:0,n:0};
  }
  let got=0,all=0,hit=0;
  for(const w of work){
    let best=0,at=-1;
    for(let i=0;i+w.d<=n;i+=5){if(used.some(([a,b])=>i<b&&i+w.d>a))continue;const v=(pre[i+w.d]-pre[i])/w.d;if(v>best){best=v;at=i}}
    /* gehaald telt volledig; een kwart of meer onder het doel telt niet */
    const need=w.d<60?.9:.93,c=w.t?clamp((best/(w.t*need)-.75)/.25,0,1):0;
    if(at>=0)used.push([at,at+w.d]);if(c>=1)hit++;got+=w.d*c;all+=w.d;
  }
  return {score:Math.round(100*(.75*got/all+.25*dur)),hit,n:work.length};
}
/* wat een rit buiten de app was, naar soort: telt mee bij het kiezen van wat je te weinig deed */
function rideKind(r){
  const z=(r.zones||[]).map(s=>s/60),hard=(z[4]||0)+(z[5]||0)+(z[6]||0);
  const b20=r.ftp&&r.best&&r.best[1200]?r.best[1200]/r.ftp:0;
  return hard>=6?'vo2':b20>=.95?'drempel':b20>=.86?'sweetspot':(z[2]||0)+(z[3]||0)>=25?'tempo':'duur';
}
/* een geïmporteerde rit koppelen aan de training van die dag. Lijkt hij er genoeg op (cijfer 7,5 of meer), dan telt hij
   als die training, ook voor de opbouw; anders blijft het een buitenrit met het cijfer voor de gemiste training */
function matchPlan(ride,rec){
  if(ride.sim||!rec||!rec.p||!rec.p.some(x=>x>0))return;
  ride.as=rideKind(ride);
  if(state.rides.some(r=>!r.sim&&r.date===ride.date&&r.id!==ride.id&&TYPES[r.type]))return;
  const d=planWeek(state,mondayOf(parseISO(ride.date)),new Date()).days.find(x=>x.iso===ride.date),wo=d&&d.wo;
  if(!wo||isFtpTest(wo.type))return;
  const c=compareRide(wo,rec.p,ride.ftp);
  ride.cmp={t:wo.type,name:wo.name,score:c.score,hit:c.hit,n:c.n};ride.score=c.score;ride.planned=wo.sec;
  if(c.score>=75){ride.type=wo.type;ride.lvl=wo.lvl||null;ride.name=wo.name;ride.outdoor=true;ride.adj=false}
}
/* zonder vermogen: lijkt een rit op de training van die dag? Tijd telt het zwaarst, daarna of het gevoel past bij die soort */
function feelScore(t,sec,plan,rpe){
  const f=sec/Math.max(1,plan),time=f>=.9?(f<=1.3?1:Math.max(.6,1-(f-1.3))):Math.max(0,f/.9),rel=Math.abs(rpe-(rpeExp(t)??5)),feel=rel<=1?1:rel===2?.6:.25;
  return Math.round(100*(.6*time+.4*feel));
}
function matchFeel(r){
  if(r.sim||r.rpe==null||!(r.manual||r.noPower)||(r.cmp?!r.cmp.feel:r.type!=='buiten'))return;
  if(!r.cmp){
    if(state.rides.some(x=>!x.sim&&x.date===r.date&&x.id!==r.id&&TYPES[x.type]))return;
    const d=planWeek(state,mondayOf(parseISO(r.date)),new Date()).days.find(x=>x.iso===r.date),wo=d&&d.wo;
    if(!wo||isFtpTest(wo.type))return;
    r.cmp={t:wo.type,name:wo.name,sec:wo.sec,feel:true};r.planned=wo.sec;
  }
  const c=r.cmp,s=feelScore(c.t,r.dur,c.sec,r.rpe),ok=s>=75;
  c.score=s;r.score=s;r.type=ok?c.t:'buiten';r.name=ok?c.name:'Buitenrit';r.outdoor=true;
}
/* Jouw eigen lijn: belasting per uur bij elk gevoelscijfer, uit je ritten met vermogen. Pas vanaf vijf ritten met drie verschillende cijfers;
   anders de algemene tabel. Duur maal gevoel volgt de belasting goed (Haddad 2017, Vermeire 2023), de ijking is eigen afleiding. Snelheid telt niet mee: wind en zog overheersen. */
function feelLine(st){
  const pts=(st.rides||[]).filter(r=>!r.sim&&!r.manual&&!r.noPower&&r.rpe!=null&&r.tss>0&&r.dur>=1200&&r.avgP>0&&!isFtpTest(r.type)).sort((a,b)=>b.ts-a.ts).slice(0,30).map(r=>[r.rpe,r.tss/(r.dur/3600)]);
  if(pts.length<5||new Set(pts.map(p=>p[0])).size<3)return null;
  const n=pts.length,sx=pts.reduce((a,p)=>a+p[0],0),sy=pts.reduce((a,p)=>a+p[1],0),sxx=pts.reduce((a,p)=>a+p[0]*p[0],0),sxy=pts.reduce((a,p)=>a+p[0]*p[1],0),d=n*sxx-sx*sx;
  if(d<=0)return null;
  const b=(n*sxy-sx*sy)/d;return b>0?{a:(sy-b*sx)/n,b,n}:null;
}
/* belasting per uur bij een gevoelscijfer */
function feelRate(rpe,st){
  const L=feelLine(st);if(L)return clamp(L.a+L.b*rpe,15,130);
  const f=FEEL_IF[clamp(Math.round(rpe),1,10)-1];return f*f*100;
}
/* zonder vermogen komt de belasting uit je gevoel; bij hardlopen ook uit je snelheid */
function feelLoad(r){
  if(r.rpe==null)return;
  if(r.type==='hardlopen'&&r.dist){const L=runLoad(r.dist/1000,r.dur/60,r.rpe);r.IF=+L.IF.toFixed(2);r.tss=L.tss}
  else if(r.type==='buiten'||r.outdoor||r.noPower){const v=feelRate(r.rpe,state);r.IF=+Math.sqrt(v/100).toFixed(2);r.tss=Math.round(r.dur/3600*v);r.ownLine=!!feelLine(state)}
  else if(r.manual){r.IF=FEEL_IF[r.rpe-1];r.tss=Math.round(r.dur/3600*r.IF*r.IF*100)}
}
/* het schema van vandaag tot over een week, om voor en na een rit te vergelijken */
function planSnap(){
  const t=new Date(),tk=iso(t),end=iso(addDays(t,7)),out={};
  for(const off of [0,7])for(const d of planWeek(state,addDays(mondayOf(t),off),t).days)
    if(d.iso>=tk&&d.iso<=end&&!d.event&&!d.done)out[d.iso]=d.wo?{n:d.wo.name,y:d.wo.type,m:d.wo.minutes,t:d.wo.tss}:null;
  return out;
}
/* wat er door deze rit veranderde: de dag, van wat naar wat en of het lichter of zwaarder werd */
function planDiff(a,r){
  const b=planSnap(),out=[];
  for(const k of Object.keys(b).sort()){
    if(k===r.date||!(k in a))continue;
    const x=a[k],y=b[k];
    if(!x&&!y)continue;
    if(x&&y&&x.y===y.y&&x.m===y.m&&Math.abs(x.t-y.t)<3)continue;
    out.push({iso:k,from:x?x.n:'Rust',to:y?y.n:'Rust',m:y?y.m:0,dir:(y?y.t:0)>(x?x.t:0)?1:-1});
  }
  return out;
}
/* Belasting van een stuk hardlopen. Je drempeltempo is geschat uit je FTP: FTP geeft je maximale zuurstofopname (ACSM-formules),
   en die de snelheid waarop je die haalt; je drempel ligt op ongeveer 85% daarvan. Omdat je loopvorm die schatting kan
   tegenspreken, telt je gevoel voor de helft mee. Belasting = uren x intensiteit in het kwadraat x 100, net als op de fiets. */
const FEEL_IF=[.5,.5,.55,.6,.65,.7,.75,.8,.88,.95];
function runLoad(km,min,rpe){
  const p=state.profile,kg=clamp(p.weight||75,35,200),vo2=(p.ftp/.75)*10.8/kg+7,thr=(vo2-3.5)/.2*.06*.85,kmh=km/(min/60);
  const bySpeed=kmh/thr,IF=clamp(rpe?(bySpeed+FEEL_IF[rpe-1])/2:bySpeed,.4,1.2),s=Math.round(60*min/km);
  return {kmh,pace:`${Math.floor(s/60)}:${pad(s%60)}`,IF,tss:Math.round(min/60*IF*IF*100)};
}
/* schatting uit een rit die niet voluit ging: je beste blok, gecorrigeerd voor hoe zwaar het voelde.
   Alleen voor de lijn bij Voortgang; je FTP zelf verandert hier niet door. */
const FEEL={5:.8,6:.84,7:.88,8:.92,9:.96,10:1};
function ftpFromFeel(r){
  if(r.sim||r.manual||!FEEL[r.rpe]||isFtpTest(r.type)||!r.best)return 0;
  return Math.max((r.best[1200]||0)*.95,(r.best[600]||0)*.9,(r.best[300]||0)*.8)/FEEL[r.rpe];
}
/* ---------- gevoel en hartslag als controle ----------
   Verwachte zwaarte (1-10) per soort training. Voelt een training twee punten of meer zwaarder, dan is dat een signaal. */
const RPE_EXP={vier8:8,ssaanzet:6,oplopend:6,tempocad:5,herstelcad:2,herstelgolf:2,herstelspin:2,duursprint:6,duurss:6,tempolang:5,tempogolf:5,sslang:6,ssgolf:6,herstel:2,duur:4,souplesse:4,openers:4,tempo:5,kracht:6,sweetspot:6,duurtempo:6,duurklim:6,duurheuvels:6,klim:7,drempel:7,sprint:7,heuvels:8,vo2:8,anaeroob:8};
/* verwacht gevoel: per soort, anders naar de groep; alleen voor trainingen uit de app, niet voor de FTP-test */
const RPE_CAT={rustig:4,techniek:4,drempel:7,vo2:8,klim:7,kracht:7};
const rpeExp=t=>RPE_EXP[t]??(TYPES[t]?RPE_CAT[CAT_OF[t]]:undefined);
const rpeHeavy=r=>!r.sim&&r.rpe!=null&&rpeExp(r.type)!=null&&r.rpe>=rpeExp(r.type)+2;
/* Wat één rit zegt: gevoel tegenover het verwachte gevoel van die soort training (f) en hartslag tegenover normaal bij dit vermogen (h).
   1 is zwaarder of hoger, -1 lichter of lager. */
function rideSignal(r){
  const e=r.rpe!=null?rpeExp(r.type):null,rel=e==null?null:r.rpe-e;
  return {f:rel==null?0:rel>=2?1:rel<=-1?-1:0,h:r.hrOff==null?0:r.hrOff>=6?1:r.hrOff<=-6?-1:0,known:rel!=null||r.hrOff!=null};
}
/* Zwaar gevoel dat zich herhaalt: twee ritten zwaar met een lage hartslag, of drie zwaar met een normale. Dan eerst een paar lichtere dagen en
   daarna opnieuw kijken, in plaats van meteen een hele herstelweek: herstel kan binnen dagen komen (Hammes 2016, Decroix 2018). Stateless uit je ritten.
   De ritten tot en met de lichtere dagen tellen daarna niet meer mee. De regel zelf is eigen afleiding. */
const EASE_DAYS=4;
function easeWalk(st,upto){
  const a=iso(addDays(parseISO(upto),-42)),rs=(st.rides||[]).filter(r=>!r.sim&&r.date>=a&&r.date<upto).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:0);
  let until='',kind='',zl=[],hv=[];const at=[];
  for(const r of rs){
    if(r.date<=until)continue;
    const s=rideSignal(r),w=iso(addDays(parseISO(r.date),-14));
    if(s.f>0&&s.h<0)zl.push(r.date);else if(s.f>0&&s.h===0)hv.push(r.date);
    zl=zl.filter(d=>d>=w);hv=hv.filter(d=>d>=w);
    if(zl.length>=2||hv.length>=3){kind=zl.length>=2?'diep':'zwaar';until=iso(addDays(parseISO(r.date),EASE_DAYS));at.push(r.date);zl=[];hv=[]}
  }
  const last=at[at.length-1],prev=at[at.length-2],twice=!!prev&&dayDiff(parseISO(prev),parseISO(last))<=21&&dayDiff(parseISO(last),parseISO(upto))<=10;
  return {until,kind,twice};
}
/* Gevoel en hartslag samen, over de ritten van de twee weken vóór 'upto'. Tegenstrijdige signalen zijn de nuttigste:
   zwaar met een lage hartslag wijst op diepe vermoeidheid, licht met een lage hartslag op groei. */
function coachRead(st,upto){
  const E=easeWalk(st,upto),from=[iso(addDays(parseISO(upto),-14)),E.until?iso(addDays(parseISO(E.until),1)):''].sort().pop();
  const S=(st.rides||[]).filter(r=>!r.sim&&r.date>=from&&r.date<upto).map(rideSignal).filter(s=>s.known);
  const n=fn=>S.filter(fn).length,zl=n(s=>s.f>0&&s.h<0),zh=n(s=>s.f>0&&s.h>0),heavy=n(s=>s.f>0),hi=n(s=>s.f<=0&&s.h>0),ll=n(s=>s.f<0&&s.h<0),light=n(s=>s.f<0&&s.h<=0);
  const out={k:'',n:S.length,rest:false,lighter:false,more:false,fresh:false,test:false};
  /* na de lichtere dagen van een reeks zware ritten: nu pas een test. Herhaalt het zich binnen drie weken, dan alsnog een herstelweek */
  if(E.kind==='zwaar'&&upto>E.until&&dayDiff(parseISO(E.until),parseISO(upto))<=7)out.test=true;
  if(E.twice){out.k=E.kind;out.rest=true;return out}
  if(upto<=E.until){out.k=E.kind;out.ease=true;return out}
  if(S.length<2)return out;
  const clean=!heavy&&!hi;
  out.fresh=clean&&S.length>=3&&light>=2;
  if(zh&&zl+zh>=2){out.k='moe';out.rest=true}
  else if(heavy>=2){out.k='zwaar';out.lighter=true}
  else if(hi>=2){out.k='hoog';out.lighter=true}
  else if(clean&&ll>=2){out.k='gegroeid';out.more=true}
  else if(clean&&light>=3){out.k='kanmeer';out.more=true}
  else out.k='goed';
  return out;
}
/* gemiddelden per minuut van rustige stukken (vermogen een paar minuten gelijk, na de eerste acht minuten) */
function hrPairs(rec,ftp){
  const p=rec.p,h=rec.hr||[],M=Math.floor(p.length/60),mp=[],mh=[],out=[];
  for(let m=0;m<M;m++){let sp=0,sh=0,c=0;for(let i=m*60;i<m*60+60;i++)if(h[i]>0){sp+=p[i];sh+=h[i];c++}mp.push(c>=50?sp/c:0);mh.push(c>=50?sh/c:0)}
  for(let m=8;m<M;m++){const w=mp[m];if(!w||!mh[m]||w<ftp*.45||w>ftp*1.05)continue;
    if([1,2,3].every(k=>mp[m-k]&&Math.abs(mp[m-k]-w)<w*.08))out.push([w,mh[m]])}
  return out;
}
/* hartslag = a + b × vermogen, uit je eigen ritten; oudere ritten tellen steeds minder mee */
function learnHr(rec,ftp){
  if(!rec||!rec.hr||!rec.hr.some(x=>x>0))return;
  const pr=hrPairs(rec,ftp);if(pr.length<5)return;
  const m=state.hrm||(state.hrm={sx:0,sy:0,sxx:0,sxy:0,n:0,rides:0,lo:1e9,hi:0});
  for(const k of['sx','sy','sxx','sxy','n'])m[k]*=.85;
  for(const [x,y] of pr){m.sx+=x;m.sy+=y;m.sxx+=x*x;m.sxy+=x*y;m.n++;m.lo=Math.min(m.lo,x);m.hi=Math.max(m.hi,x)}
  m.rides++;
}
/* normale hartslag bij vermogen w; null zolang er te weinig ritten zijn of w buiten wat je al reed valt */
function hrExpect(w){
  const m=state.hrm;if(!m||m.rides<3||m.n<20||w<m.lo*.9||w>m.hi*1.1)return null;
  const d=m.n*m.sxx-m.sx*m.sx;if(d<=0)return null;
  const b=(m.n*m.sxy-m.sx*m.sy)/d,a=(m.sy-b*m.sx)/m.n;
  return b>0&&b<1?a+b*w:null;
}
/* hoeveel slagen je hartslag in deze rit gemiddeld afweek van normaal bij hetzelfde vermogen */
function hrOffset(rec,ftp){
  if(!rec||!rec.hr)return null;const pr=hrPairs(rec,ftp);if(pr.length<10)return null;
  let s=0,c=0;for(const [w,h] of pr){const e=hrExpect(w);if(e){s+=h-e;c++}}
  return c>=10?Math.round(s/c):null;
}
/* Een rit veel langer dan je langste van de afgelopen dertig dagen. Komt uit onderzoek bij hardlopers (Frandsen 2025), voor fietsers niet bevestigd: alleen een melding.
   Vanaf 30% en een half uur langer, als er minstens drie eerdere ritten zijn. */
function longJump(min,k,st){
  const a=iso(addDays(parseISO(k),-30)),l=(st.rides||[]).filter(r=>!r.sim&&r.date>=a&&r.date<k&&!['hardlopen','fitness','anders'].includes(r.type));
  if(l.length<3)return 0;
  const top=Math.max(...l.map(r=>(r.dur||0)/60));
  return min>=top*1.3&&min>=top+30?Math.round(top):0;
}
function verdict(r,ftp){
  const out=[];
  if(isFtpTest(r.type)){
    if(r.sim){out.push('Dit was een demo. Een FTP volgt alleen uit een test die je echt op de trainer rijdt.');return out}
    const e=ftpEstimate(r);
    if(r.type==='test20'){
      out.push(e?`Je beste 20 minuten waren ${r.best[1200]} W. Daaruit volgt een FTP van ${e} W, marge ±${ftpMargin(e)} W.`:'De test was te kort. Je moet de twintig minuten uitrijden.');
      if(r.cal)out.push(Math.round(r.cal*100)===75?'Je eigen verhouding is ook 75% van je beste minuut.':`Je ramptest rekent nu met ${Math.round(r.cal*100)}% van je beste minuut in plaats van 75%.`);else if(e)out.push('Te ver onder je ramptest om je verhouding op te baseren.');
      return out;
    }
    out.push(e?`Je beste minuut was ${r.best[60]} W. Daaruit volgt een FTP van ${e} W, marge ±${ftpMargin(e)} W.`:'De test was te kort om een FTP uit af te leiden. Rijd door tot je de cadans echt niet meer vasthoudt.');
    if(e&&!r.ftpSet&&Math.abs(e-(r.ftp||ftp))<5)out.push('Verschil kleiner dan 5 W: je FTP blijft staan.');
    return out;
  }
  /* zonder vermogen: vergeleken op tijd en gevoel */
  if(r.cmp&&r.cmp.feel){
    const c=r.cmp,e=rpeExp(c.t),off=r.rpe-e,short=r.dur<c.sec*.85;
    out.push(r.score>=75?`Telt als ${c.name}.`:`Telt niet als ${c.name}: ${short?'te kort':off>0?'zwaarder dan bedoeld':'lichter dan bedoeld'}.`);
    out.push(`${Math.round(r.dur/60)} van ${Math.round(c.sec/60)} min · gevoel ${r.rpe}, verwacht ${e}`);
    return out;
  }
  /* buiten gereden en vergeleken met de training van die dag */
  if(r.cmp){
    const c=r.cmp,w=c.n?`${c.hit} van ${c.n} ${c.n===1?'blok':'blokken'} gehaald`:c.score>=75?'lang genoeg en rustig genoeg':'te kort of te hard voor een rustige rit';
    out.push(`Vergeleken met ${c.name}: ${w}.`);
    if(TYPES[r.type]){if(r.rpe!=null&&r.lvl&&LADDER[r.type]){const st=progStep(r);out.push(st<0?'Volgende keer iets lichter.':st===0?'Volgende keer even zwaar.':'Volgende keer zwaarder.')}}
    else if(r.as)out.push(`Deze rit telt als ${TYPES[r.as].name.toLowerCase()}. De training zelf komt later terug als dat past.`);
    return out;
  }
  if(r.type==='vrij'){out.push(r.dist>200?`Vrij gereden: ${nl((r.dist/1000).toFixed(1))} km in ${clock(r.dur)}, gemiddeld ${r.avgP} W.`:`Vrij gereden: ${clock(r.dur)}, gemiddeld ${r.avgP} W.`);return out}
  if(r.type==='hardlopen'&&r.dist){const L=runLoad(r.dist/1000,r.dur/60);out.push(`${L.pace} per km, ${nl(L.kmh.toFixed(1))} km/u.`,`${r.instead?`In plaats van ${r.instead}. `:''}Telt mee in je vermoeidheid, niet in je FTP.`);return out}
  if(r.manual||r.noPower){out.push(r.type==='buiten'?(r.ownLine?'Belasting geschat uit tijd en gevoel, geijkt op je trainerritten.':'Belasting geschat uit tijd en gevoel.'):'Telt mee in je vermoeidheid, niet in je FTP.');if(r.instead)out.push(`In plaats van ${r.instead}.`);return out}
  const done=r.dur/Math.max(1,r.planned);
  if(r.score!=null)out.push(r.score>=90?'Strak uitgevoerd.':r.score>=75?'Grotendeels volgens plan.':done<.9?'Eerder gestopt, dus de training telt maar gedeeltelijk mee.':'Het doelvermogen was vandaag te hoog gegrepen.');
  if(r.rpe!=null&&!r.sim){
    if(r.lvl&&LADDER[r.type]){const st=progStep(r);out.push(st<0?'Volgende keer iets lichter.':st===0?'Volgende keer even zwaar.':st<1?'Volgende keer iets zwaarder.':'Volgende keer zwaarder.')}
    else if((r.type==='herstel'||r.type==='duur')&&r.rpe>rpeExp(r.type))out.push('Volgende keer rustiger, het doel is hier juist rustig blijven.');
  }
  if(rpeHeavy(r))out.push('Zwaarder dan verwacht: je volgende zware training wordt iets lichter.');
  else if(r.hrOff>=6&&!r.sim)out.push('Hartslag hoger dan normaal: je volgende zware training wordt iets lichter.');
  if(r.hrOff<=-6&&!r.sim)out.push('Hartslag lager dan normaal: hetzelfde werk kost je minder.');
  const e=ftpEstimate(r);
  if(e>=ftp+5)out.push(`Deze rit wijst op een FTP van ongeveer ${e} W.`);
  const lj=!r.sim&&longJump(r.dur/60,r.date,state);if(lj)out.push(`Veel langer dan je langste rit van de afgelopen 30 dagen (${durTxt(lj)}). Neem de dag erna rustig.`);
  return out;
}
/* de uitleg achter de conclusie: onder Meer cijfers */
function verdictMore(r){
  const out=[];if(r.sim||r.manual||isFtpTest(r.type)||r.type==='vrij')return out;
  const m=r.miss,done=r.dur/Math.max(1,r.planned);
  if(m&&m.n)out.push(`In ${m.n} van de ${m.N} ${m.N===1?'blok':'blokken'} zat je meer dan 6% ${m.low*2>=m.n?'onder':'boven'} het doel.`);
  if(done<.95)out.push(`Je reed ${Math.round(r.dur/60)} van de ${Math.round(r.planned/60)} geplande minuten.`);
  if(r.decoup!=null){
    if(r.decoup>5)out.push(`In de tweede helft leverde je ${nl(r.decoup)}% minder vermogen per hartslag dan in de eerste. Dat wijst op vermoeidheid, warmte of te weinig drinken.`);
    else if(r.decoup>-5)out.push('Je hartslag bleef in verhouding tot je vermogen stabiel.');
  }
  if(r.hrOff!=null){
    if(r.hrOff>=6)out.push(`Je hartslag lag gemiddeld ${r.hrOff} slagen hoger dan normaal bij dit vermogen. Warmte, weinig slaap, stress of een opkomende verkoudheid kunnen meespelen.`);
    else if(r.hrOff<=-6)out.push(`Je hartslag lag gemiddeld ${-r.hrOff} slagen lager dan normaal bij dit vermogen.`);
  }
  return out;
}

function records(rides){
  const out={};
  for(const r of rides){if(r.sim||!r.best)continue;for(const[w]of BESTS){const v=r.best[w]||0;if(v&&(!out[w]||v>out[w].w))out[w]={w:v,date:r.date,id:r.id}}}
  return out;
}
const HZN=['Z1 herstel','Z2 duur','Z3 tempo','Z4 drempel','Z5 maximaal'];
function hrZones(hr,max){
  const z=[0,0,0,0,0];
  for(const h of hr){if(!h)continue;const f=h/max;z[f<.6?0:f<.7?1:f<.8?2:f<.9?3:4]++}
  return z;
}
