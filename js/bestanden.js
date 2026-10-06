'use strict';
/* ================= import van buitenritten ================= */
function parseFit(buf){
  const b=new Uint8Array(buf),dv=new DataView(buf);
  if(b.length<14||String.fromCharCode(b[8],b[9],b[10],b[11])!=='.FIT')throw new Error('fit');
  let pos=b[0];const end=Math.min(b.length,b[0]+dv.getUint32(4,true));
  const defs={},out=[];let lastTs=0;
  const read=(def,tsOff)=>{
    const le=def.le;let ts=null,p=null,hr=null,cad=null;
    for(const f of def.fields){
      if(def.g===20){
        if(f.n===253&&f.s===4)ts=dv.getUint32(pos,le);
        else if(f.n===7&&f.s===2){const v=dv.getUint16(pos,le);if(v!==0xFFFF)p=v}
        else if(f.n===3&&f.s===1){const v=b[pos];if(v!==0xFF)hr=v}
        else if(f.n===4&&f.s===1){const v=b[pos];if(v!==0xFF)cad=v}
      }else if(f.n===253&&f.s===4){const v=dv.getUint32(pos,le);if(v!==0xFFFFFFFF)lastTs=v}
      pos+=f.s;
    }
    pos+=def.dev;
    if(def.g===20){
      if(ts==null&&tsOff!=null){ts=(lastTs&~31)+tsOff;if(tsOff<(lastTs&31))ts+=32}
      if(ts!=null){lastTs=ts;out.push({t:ts+631065600,p,hr,cad})}
    }
  };
  while(pos<end){
    const h=b[pos++];
    if(h&0x80){const d=defs[(h>>5)&3];if(!d)throw new Error('fit');read(d,h&31)}
    else if(h&0x40){
      const le=b[pos+1]===0,g=dv.getUint16(pos+2,le),n=b[pos+4];pos+=5;
      const fields=[];for(let i=0;i<n;i++){fields.push({n:b[pos],s:b[pos+1]});pos+=3}
      let dev=0;if(h&0x20){const nd=b[pos++];for(let i=0;i<nd;i++){dev+=b[pos+1];pos+=3}}
      defs[h&15]={le,g,fields,dev};
    }else{const d=defs[h&15];if(!d)throw new Error('fit');read(d,null)}
  }
  return out;
}
function parseTcx(text){
  const doc=new DOMParser().parseFromString(text,'application/xml'),out=[];
  const all=doc.getElementsByTagName('*');
  for(const tp of all){
    if(tp.localName!=='Trackpoint')continue;
    let t=null,p=null,hr=null,cad=null;
    for(const e of tp.getElementsByTagName('*')){
      const v=e.textContent.trim();
      if(e.localName==='Time')t=Date.parse(v)/1000;
      else if(e.localName==='Watts')p=+v;
      else if(e.localName==='Cadence'&&e.parentNode===tp)cad=+v;
      else if(e.localName==='Value'&&e.parentNode.localName==='HeartRateBpm')hr=+v;
    }
    if(t)out.push({t,p,hr,cad});
  }
  return out;
}
/* Naar één meetpunt per seconde; stilstand van meer dan 5 seconden telt niet mee. */
function resample(pts){
  pts=pts.filter(x=>x.t>0).sort((a,b)=>a.t-b.t);
  const rec={p:[],hr:[],cad:[],tgt:[]};let hasP=false;
  for(let i=0;i<pts.length;i++){
    const x=pts[i],gap=i?Math.round(x.t-pts[i-1].t):1,n=gap>5||gap<1?1:gap;
    if(i&&gap<1)continue;
    if(x.p!=null)hasP=true;
    for(let k=0;k<n;k++){rec.p.push(Math.round(x.p||0));rec.hr.push(Math.round(x.hr||0));rec.cad.push(Math.round(x.cad||0));rec.tgt.push(0)}
  }
  return {rec,hasP,start:pts.length?pts[0].t*1000:0};
}
const EFFORT=[[.55,'Rustig, praattempo'],[.68,'Gemiddeld, stevig doorgereden'],[.8,'Zwaar, veel tempo of klimmen'],[.9,'Zeer zwaar, koers of alles gegeven']];

/* ================= export ================= */
function toZwo(wo){
  const f=x=>x.toFixed(2),x=[];
  for(const s of wo.segs){
    const cad=s.cad?` Cadence="${s.cad}"`:'';
    if(s.a===s.b)x.push(`    <SteadyState Duration="${s.d}" Power="${f(s.a)}"${cad}/>`);
    else if(s.kind==='warmup')x.push(`    <Warmup Duration="${s.d}" PowerLow="${f(s.a)}" PowerHigh="${f(s.b)}"/>`);
    else if(s.kind==='cooldown')x.push(`    <Cooldown Duration="${s.d}" PowerLow="${f(s.a)}" PowerHigh="${f(s.b)}"/>`);
    else x.push(`    <Ramp Duration="${s.d}" PowerLow="${f(s.a)}" PowerHigh="${f(s.b)}"/>`);
  }
  return `<workout_file>\n  <author>Kopwerk</author>\n  <name>${esc(wo.name)}</name>\n  <description>${esc(wo.desc)}</description>\n  <sportType>bike</sportType>\n  <tags/>\n  <workout>\n${x.join('\n')}\n  </workout>\n</workout_file>\n`;
}
const slug=s=>s.toLowerCase().replace(/×/g,'x').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=~0;for(let i=0;i<u.length;i++)c=crcT[(c^u[i])&255]^(c>>>8);return(~c)>>>0};
function zip(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  for(const f of files){
    const name=enc.encode(f.name),data=enc.encode(f.text),crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);
    h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
    parts.push(new Uint8Array(h.buffer),name,data);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);
    c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
    cen.push(new Uint8Array(c.buffer),name);
    off+=30+name.length+data.length;
  }
  let cs=0;for(const p of cen)cs+=p.length;
  const e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/zip'});
}

/* ================= downloads ================= */
let toastT=0;
function toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},3800)}
function saveFile(filename,data){
  const blob=data instanceof Blob?data:new Blob([data]);
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),8000);
}
/* Eén training gaat als los .zwo-bestand, een hele week samen in een zip. */
function saveZwo(list,zipName){
  const files=list.map(x=>({name:x.name+'.zwo',text:toZwo(x.wo)}));
  if(files.length>1)return saveFile(zipName+'.zip',zip(files));
  return saveFile(files[0].name,files[0].text);
}
