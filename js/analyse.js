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

function analyze(rec,ftp,laps,plannedSec,type){
  const p=rec.p,n=p.length;
  const np=normPower(p),IF=ftp?np/ftp:0;
  const hrv=rec.hr.filter(x=>x>0),cv=rec.cad.filter(x=>x>0);
  const zones=[0,0,0,0,0,0,0];
  for(const v of p)zones[zoneOf(v/ftp)-1]++;
  const best={};for(const[w]of BESTS)best[w]=bestEffort(p,w);
  let score=null;
  if(type!=='ramptest'){
    let w=0,acc=0;
    for(const l of lapStats(rec,laps)){
      if(l.d<20||l.t<=0)continue;
      const s=clamp(100-Math.max(0,Math.abs(l.dev)-2)*4,0,100);
      acc+=s*l.d;w+=l.d;
    }
    if(w>0)score=Math.round(acc/w*Math.min(1,n/Math.max(1,plannedSec)));
  }
  let decoup=null;
  if(type==='duur'&&n>=1200&&hrv.length>n*.8){
    const h=Math.floor(n/2);
    const f=(a,b)=>{const pp=avg(p.slice(a,b)),hh=avg(rec.hr.slice(a,b).filter(x=>x>0));return hh?pp/hh:0};
    const e1=f(0,h),e2=f(h,n);
    if(e1>0&&e2>0)decoup=+((e1-e2)/e1*100).toFixed(1);
  }
  return {dur:n,avgP:Math.round(avg(p)),np:Math.round(np),IF:+IF.toFixed(2),tss:Math.round(n*np*IF/(ftp*3600)*100)||0,
    kj:Math.round(p.reduce((a,b)=>a+b,0)/1000),avgHr:hrv.length?Math.round(avg(hrv)):0,maxHr:hrv.length?Math.max(...hrv):0,
    avgCad:cv.length?Math.round(avg(cv)):0,zones,best,score,decoup};
}

/* stap op de opbouwladder na een rit: terug bij te zwaar, omhoog als het goed ging */
function progStep(r){
  if(r.rpe>=9||(r.score!=null&&r.score<70))return -1;
  if(r.rpe>=8||(r.score!=null&&r.score<85))return 0;
  if(r.rpe<=5&&(r.score==null||r.score>=90))return 1;
  return .5;
}
function ftpEstimate(r){
  if(r.sim)return 0;
  if(r.type==='ramptest')return r.best[60]?Math.round(r.best[60]*.75):0;
  return r.best[1200]?Math.round(r.best[1200]*.95):0;
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

function verdict(r,ftp){
  const out=[];
  if(r.type==='ramptest'){
    if(r.sim){out.push('Dit was een demo. Een FTP volgt alleen uit een test die je echt op de trainer rijdt.');return out}
    const e=ftpEstimate(r);
    out.push(e?`Je beste minuut was ${r.best[60]} W. Daaruit volgt een FTP van ongeveer ${e} W.`:'De test was te kort om een FTP uit af te leiden. Rijd door tot je de cadans echt niet meer vasthoudt.');
    return out;
  }
  if(r.manual){out.push('Deze rit is met de hand ingevoerd. De belasting is een schatting op basis van duur en zwaarte.');return out}
  const done=r.dur/Math.max(1,r.planned);
  if(r.score!=null){
    if(r.score>=90)out.push('Strak uitgevoerd: je bleef in vrijwel elk blok dicht bij het doelvermogen.');
    else if(r.score>=75)out.push('Grotendeels volgens plan. In een paar blokken week je vermogen merkbaar af van het doel.');
    else out.push(done<.9?'Je bent eerder gestopt dan gepland, dus de training telt maar gedeeltelijk mee.':'Het doelvermogen was vandaag te hoog gegrepen: in meerdere blokken zat je er duidelijk onder of boven.');
  }
  if(done<.95&&r.score!=null&&r.score>=75)out.push(`Je reed ${Math.round(r.dur/60)} van de ${Math.round(r.planned/60)} geplande minuten.`);
  if(r.decoup!=null&&!r.sim){
    if(r.decoup>5)out.push(`In de tweede helft leverde je ${nl(r.decoup)}% minder vermogen per hartslag dan in de eerste. Dat wijst op vermoeidheid, warmte of te weinig drinken.`);
    else if(r.decoup>-5)out.push('Je hartslag bleef in verhouding tot je vermogen stabiel. Deze duur en intensiteit kun je goed aan.');
  }
  if(r.rpe!=null&&r.lvl&&LADDER[r.type]&&!r.sim){
    const st=progStep(r);
    out.push(st<0?'Dit was te zwaar. Deze training gaat de volgende keer een trede terug.':st===0?'Stevig, maar goed te doen. De volgende keer blijft deze training op dezelfde trede.':st<1?'Goed gedaan. De volgende keer wordt deze training iets zwaarder.':'Dit ging je makkelijk af. De volgende keer gaat deze training een trede omhoog.');
  }
  const e=ftpEstimate(r);
  if(e>ftp*1.02)out.push(`Je beste 20 minuten (${r.best[1200]} W) wijzen op een FTP van ongeveer ${e} W, hoger dan je ingestelde ${ftp} W.`);
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
