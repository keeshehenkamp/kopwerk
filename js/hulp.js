'use strict';
/* ================= helpers ================= */
const DAYS=['ma','di','wo','do','vr','za','zo'];
const DAYS_L=['maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag','zondag'];
const MONTHS=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const pad=n=>String(n).padStart(2,'0');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseISO=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const addDays=(d,n)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x};
const dow=d=>(d.getDay()+6)%7;
const mondayOf=d=>addDays(d,-dow(d));
const dayDiff=(a,b)=>Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/864e5);
const weekNo=d=>{const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));t.setUTCDate(t.getUTCDate()-((t.getUTCDay()+6)%7)+3);const j=new Date(Date.UTC(t.getUTCFullYear(),0,4));return 1+Math.round(((t-j)/864e5-3+((j.getUTCDay()+6)%7))/7)};
const clock=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;return h?`${h}:${pad(m)}:${pad(r)}`:`${m}:${pad(r)}`};
const durTxt=min=>{min=Math.round(min);const h=Math.floor(min/60),m=min%60;return h?(m?`${h} u ${pad(m)}`:`${h} uur`):`${m} min`};
const dateLong=d=>`${DAYS_L[dow(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nl=n=>String(n).replace('.',',');
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;

/* ================= zones ================= */
const ZN=['','Herstel','Duur','Tempo','Drempel','VO2max','Anaeroob','Sprint'];
const zoneOf=f=>f<=.55?1:f<=.75?2:f<=.90?3:f<=1.05?4:f<=1.20?5:f<=1.50?6:7;
