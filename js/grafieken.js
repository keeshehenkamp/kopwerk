'use strict';
/* ================= charts ================= */
function profileSVG(segs){
  const total=segs.reduce((x,s)=>x+s.d,0),maxI=Math.max(1.25,...segs.map(s=>Math.max(s.a,s.b)))*1.06;let x=0;
  const p=segs.map(s=>{const x0=x/total*1000,x1=(x+s.d)/total*1000;x+=s.d;
    return `<polygon${x1-x0<8?' class="n"':''} points="${x0.toFixed(1)},100 ${x0.toFixed(1)},${(100-s.a/maxI*100).toFixed(1)} ${x1.toFixed(1)},${(100-s.b/maxI*100).toFixed(1)} ${x1.toFixed(1)},100" fill="var(--z${zoneOf((s.a+s.b)/2)})"/>`}).join('');
  const y=(100-1/maxI*100).toFixed(1);
  return `<svg class="profile" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">${p}<line x1="0" x2="1000" y1="${y}" y2="${y}" stroke="var(--ink)" stroke-opacity=".35" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/></svg>`;
}
function buckets(arr,N,skipZero){
  const n=arr.length,out=[];
  for(let b=0;b<N;b++){const a=Math.floor(b*n/N),e=Math.max(a+1,Math.floor((b+1)*n/N));let s=0,c=0;for(let i=a;i<e&&i<n;i++){if(skipZero&&!arr[i])continue;s+=arr[i];c++}out.push(c?s/c:null)}
  return out;
}
const pathOf=(vals,y)=>{let d='',pen=false;const N=vals.length;vals.forEach((v,i)=>{if(v==null){pen=false;return}d+=`${pen?'L':'M'}${(i/(N-1||1)*1000).toFixed(1)},${y(v).toFixed(1)}`;pen=true});return d};
function rideChart(r,rec){
  const n=rec.p.length,N=Math.min(500,n);
  const pb=buckets(rec.p,N),hb=buckets(rec.hr,N,true),cb=buckets(rec.cad,N,true);
  const maxP=Math.max(r.ftp*1.25,...pb.filter(v=>v!=null),...rec.tgt.filter((_,i)=>i%5===0))*1.06;
  const yP=v=>300-v/maxP*300;
  const hv=hb.filter(v=>v!=null),h0=hv.length?Math.min(...hv)-8:0,h1=hv.length?Math.max(...hv)+8:1;
  const yH=v=>300-(v-h0)/(h1-h0)*290;
  const laps=lapStats(rec,r.laps);
  const tg=laps.map(l=>{const x0=l.s/n*1000,x1=(l.s+l.d)/n*1000;
    return `<polygon points="${x0.toFixed(1)},300 ${x0.toFixed(1)},${yP(l.t0).toFixed(1)} ${x1.toFixed(1)},${yP(l.t1).toFixed(1)} ${x1.toFixed(1)},300" fill="var(--z${zoneOf((l.t0+l.t1)/2/r.ftp)})" fill-opacity=".32"/>`}).join('');
  const yf=yP(r.ftp);
  const ticks=[0,.25,.5,.75,1].map(f=>`<span class="xl${f===0?' first':f===1?' last':''}" style="left:${f*100}%">${clock(f*n)}</span>`).join('');
  return `<div class="chart" id="ridechart">
    <svg viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" aria-label="Vermogen, doel en hartslag over de tijd">
      ${tg}
      <line x1="0" x2="1000" y1="${yf}" y2="${yf}" stroke="var(--muted)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>
      ${ui.showCad?`<path d="${pathOf(cb,v=>300-v/140*300)}" fill="none" stroke="var(--z2)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`:''}
      ${hv.length?`<path d="${pathOf(hb,yH)}" fill="none" stroke="var(--hr)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`:''}
      <path d="${pathOf(pb,yP)}" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    </svg>
    <span class="yl" style="top:${yf/3}%">FTP ${r.ftp} W</span>
    <span class="yl" style="top:${yP(maxP*.92)/3}%">${Math.round(maxP*.92)} W</span>
    ${ticks}<span class="cur"></span><span class="tip"></span>
  </div>
  <div class="legend"><span><i style="background:var(--ink)"></i>Vermogen</span><span><i style="background:var(--z3);opacity:.5;height:9px"></i>Doel, in zonekleur</span>${hv.length?'<span><i style="background:var(--hr)"></i>Hartslag</span>':''}${ui.showCad?'<span><i style="background:var(--z2)"></i>Cadans</span>':''}
    <button class="btn small" data-act="toggleCad" style="padding:4px 10px">${ui.showCad?'Cadans verbergen':'Cadans tonen'}</button></div>`;
}
function bindChart(){
  const c=document.getElementById('ridechart'),s=ui.streams;if(!c||!s)return;
  const cur=c.querySelector('.cur'),tip=c.querySelector('.tip'),rec=s.rec,n=rec.p.length;
  const move=e=>{
    const b=c.getBoundingClientRect(),f=clamp((e.clientX-b.left)/b.width,0,1),i=Math.min(n-1,Math.floor(f*n));
    const a=Math.max(0,i-2),z=Math.min(n,i+3),pw=Math.round(avg(rec.p.slice(a,z)));
    cur.style.display='block';cur.style.left=f*100+'%';tip.style.display='block';
    tip.textContent=`${clock(i)}   ${pw} W   doel ${rec.tgt[i]} W`+(rec.hr[i]?`   ${rec.hr[i]} bpm`:'')+(rec.cad[i]?`   ${rec.cad[i]} rpm`:'');
    if(f>.6){tip.style.left='';tip.style.right=(1-f)*100+1+'%'}else{tip.style.right='';tip.style.left=f*100+1+'%'}
  };
  c.addEventListener('pointermove',move);c.addEventListener('pointerdown',move);
  c.addEventListener('pointerleave',()=>{cur.style.display='none';tip.style.display='none'});
}
