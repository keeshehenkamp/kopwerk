'use strict';
window.save=function(){};
function rng(s){return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const AV=[0,75,0,75,0,120,180];
function fresh(sc){
  const d=defaults();
  return Object.assign(d,{setup:true,started:'2026-11-09',planStart:'2026-11-09',ftpGiven:'2026-11-09',avail:sc.avail||AV,plog:{},prog:{},
    profile:{ftp:197,weight:75,goal:sc.goal||'fit',sound:false,maxHr:190,niveau:'recreant'},
    event:sc.noEvent?null:{id:'amstel',v:sc.v==null?2:sc.v,date:'2027-04-17',name:'Amstel Gold Race'}});
}
function run(sc){
  const R=rng(sc.seed||7);state=fresh(sc);
  const end=sc.noEvent?addDays(parseISO('2026-11-09'),7*sc.weeks):parseISO('2027-04-17');
  const weeks=[];let w=null,day=parseISO('2026-11-09');
  for(;day<end;day=addDays(day,1)){
    NOW=new RD(day.getFullYear(),day.getMonth(),day.getDate(),8).getTime();
    const today=new Date(NOW);if(sc.block)ensureBlock(state,today);const mon=mondayOf(today),plan=planWeek(state,mon,today);logPlan(plan,today);
    const wi=weeks.length;
    if(dow(today)===0){
      let tip='';try{tip=moreTimeTip(plan)}catch(e){tip='ERR '+e.message}
      w={i:wi+1,m:iso(mon),label:plan.label,kind:plan.ctx.kind,planMin:plan.days.reduce((a,d)=>a+(d.wo?d.wo.minutes:0),0),planTss:plan.days.reduce((a,d)=>a+(d.wo?d.wo.tss:0),0),
        nHard:plan.days.filter(d=>d.key).length,long:Math.max(0,...plan.days.filter(d=>d.long&&d.wo).map(d=>d.wo.minutes)),maxWo:Math.max(0,...plan.days.map(d=>d.wo?d.wo.minutes:0)),
        fat:plan.fat&&plan.fat.level||0,L:plan.L,types:plan.days.filter(d=>d.wo).map(d=>DAYS[d.i]+':'+d.wo.type+(d.wo.lvl?'#'+d.wo.lvl:'')+'/'+d.wo.minutes).join(' '),tip,doneMin:0,doneTss:0,rides:0,ideal:Math.round(plan.coach.weekH*60),hist:plan.coach.hist==null?null:Math.round(plan.coach.hist*60),coach:(()=>{try{const c=coachLine(plan,today,readiness(today));return c?c.t:''}catch(e){return 'ERR '+e.message}})()};
      weeks.push(w);
    }
    const d=plan.days[dow(today)];
    if(!d.wo||d.event)continue;
    const skip=sc.skip&&sc.skip(w.i,R,d);if(skip)continue;
    const f=sc.frac?sc.frac(w.i,d):1,wo=d.wo,exp=rpeExp(wo.type);
    const rpe=exp==null?null:clamp(exp+(sc.drpe?sc.drpe(w.i,wo.type):0),1,10);
    const hr=sc.hr?sc.hr(w.i):null;
    const r={id:'r'+NOW,date:iso(today),ts:NOW,name:wo.name,type:wo.type,lvl:wo.lvl||null,planned:wo.sec,ftp:state.profile.ftp,sim:false,rpe,adj:true,laps:[],dur:Math.round(wo.minutes*60*f),avgP:Math.round(state.profile.ftp*wo.IF*.95),np:Math.round(state.profile.ftp*wo.IF),IF:wo.IF,tss:Math.round(wo.tss*f),kj:0,zones:[0,0,0,0,0,0,0],best:{},score:sc.score?sc.score(w.i,wo.type):95,decoup:null};
    if(hr!=null)r.hrOff=hr;
    if(wo.type==='ramptest'){const g=sc.ftp?sc.ftp(state.profile.ftp,w.i):Math.round(state.profile.ftp*1.03);r.best={60:Math.round(g/rampRatio())};if(ftpAdopt(g,state.profile.ftp))state.profile.ftp=g;(w.tests=w.tests||[]).push(g)}
    if(wo.type==='test20'){r.best={1200:Math.round(state.profile.ftp/.95)};state.rides.push(r);calibrate(r,state);state.rides.pop();(w.tests=w.tests||[]).push('t20')}
    if(LADDER[wo.type]&&wo.lvl)applyProg(r);
    state.rides.push(r);w.doneMin+=r.dur/60;w.doneTss+=r.tss;w.rides++;
  }
  return weeks;
}
const SC={
 A_volgt:{},
 B_helft:{skip:(w,R)=>R()<.5},
 C_weinig_wk2_5:{skip:(w,R,d)=>w>=2&&w<=5&&!(d.long)},
 D_gat_wk4_6:{skip:w=>w>=4&&w<=6},
 E_steeds_zwaar_plus2:{drpe:()=>2},
 F_steeds_plus1:{drpe:()=>1},
 G_steeds_licht_min2:{drpe:()=>-2},
 H_hr_hoog:{hr:()=>8},
 I_hr_laag:{hr:()=>-8},
 J_korter_60pct:{frac:()=>.6},
 K_slecht_uitgevoerd:{score:()=>60},
 L_ftp_vast:{ftp:f=>f},
 R_lang_nooit:{skip:(w,R,d)=>d.long},
 S_hr_hoog_wk8_9:{hr:w=>w>=8&&w<=9?8:null},
 U_zwaar_wk8_9:{drpe:w=>w>=8&&w<=9?2:0},
 W_zwaar_laag:{drpe:w=>w>=8?2:0,hr:w=>w>=8?-8:null},
 X_zwaar_hoog:{drpe:w=>w>=8?2:0,hr:w=>w>=8?8:null},
 Y_licht_laag:{drpe:()=>-1,hr:()=>-8},
 T_noEvent_30wk:{noEvent:true,weeks:30,goal:'ftp'},
 Z_blok_ftp:{noEvent:true,weeks:26,goal:'ftp',block:true},
 Z_blok_sprint:{noEvent:true,weeks:14,goal:'sprint',block:true},
 Z_blok_snel:{noEvent:true,weeks:26,goal:'ftp',block:true,ftp:f=>Math.round(f*1.07)},
 M_noEvent_volgt:{noEvent:true,weeks:16,goal:'ftp'},
 N_noEvent_helft:{noEvent:true,weeks:16,goal:'ftp',skip:(w,R)=>R()<.5},
 O_noEvent_weinig:{noEvent:true,weeks:16,goal:'ftp',skip:(w,R)=>R()<.7},
 P_weinig_tijd:{avail:[0,60,0,60,0,0,120]},
 Q_veel_tijd:{avail:[60,90,60,90,60,180,240]},
};
function fmt(n,ws){return '### '+n+'\n'+ws.map(w=>[String(w.i).padStart(2),w.m.slice(5),w.label.padEnd(24),'plan',String(w.planMin).padStart(4)+'m',String(w.planTss).padStart(4)+'t','doel',String(w.ideal).padStart(4),'gedaan',String(Math.round(w.doneMin)).padStart(4)+'m',String(w.doneTss).padStart(4)+'t','hard',w.nHard,'lang',String(w.long).padStart(3),'fat',w.fat,'L',w.L,w.tests?'FTP'+w.tests.join(','):'',w.tip?'TIP':''].join(' ')).join('\n')}
const RES={};
try{for(const k in SC)RES[k]=run(SC[k])}catch(e){window.ERR=(window.ERR||[]).concat(e.stack)}
window.RES=RES;window.fmt=fmt;
document.getElementById('out').textContent=(window.ERR?('FOUT '+window.ERR.join('\n')+'\n'):'')+Object.keys(RES).map(k=>fmt(k,RES[k])).join('\n\n');
document.title='klaar';
