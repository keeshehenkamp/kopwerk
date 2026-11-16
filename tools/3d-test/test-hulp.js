/* Testhulp voor de 3D-wereld. Laden in de browser (console of javascript-tool), op de pagina van tools/3d-test/serve.py:
     eval(await (await fetch('/tools/3d-test/test-hulp.js')).text())
   TH.setup(route)            opent de demo op die route en zet de rit stil; MK = markeringen van de route (naam -> meters)
   TH.view(d, o)              zet de camera bij afstand d. o: {yaw, pitch (graden), lift, back, right (meters), top (recht van boven), rit:1 (gewone rijcamera)}
   TH.sheet(naam, lijst)      blad met beelden naar tools/3d-test/shot/<naam>.jpg. lijst: [[label, meters of 'markering+meters', opties]]
   TH.stats(d)                tekenopdrachten en driehoeken (x1000) in het gewone rijbeeld op afstand d
   TH.bouwAlles(route)        bouwt elke kilometer en meldt fouten en de langste bouwstap (moet onder ~45 ms blijven)
   TH.rit(n, watt)            rijdt n beelden van 50 ms met dat vermogen en meldt wat de andere fietsers doen
   TH.fietser(naam, d, lijst) de eigen fietser in vaste houdingen: [[label, camera, km/u, staan, bocht, crankstand]]
   De testbrowser tekent niet uit zichzelf door (geen eigen beeldlus als het paneel verborgen is): daarom roept alles hier worldStep zelf aan.
   Een schermafdruk van het paneel kan dus verouderd zijn; beelden via TH.sheet of TH.post zijn altijd actueel. */
window.TH={
  async setup(route='ventoux'){
    setRoute(route);if(!P)startDemo();
    for(let i=0;i<600;i++){if(W&&W.ready)break;await new Promise(r=>setTimeout(r,100))}
    if(!W||!W.ready)return 'niet klaar';
    for(let i=0;i<200&&W.C.route.id!==route;i++){worldStep(performance.now());await new Promise(r=>setTimeout(r,100))}
    P.mode='pause';cancelAnimationFrame(W.raf);const o={};for(const m of W.C.marks)if(m[0]!=='hp')o[m[0]]=m[1];window.MK=o;W.pace.g.visible=false;TH.t=performance.now();
    return 'klaar '+W.C.L+' m, terrein '+(W.C.T&&W.C.T.ms)+' ms';
  },
  view(d,o={}){
    const C=W.C,ci=Math.floor(d/1000);W.dist=d;W.v=0;W.lastD=null;W.camP=null;W.lookP=null;
    for(let c=Math.max(0,ci-(o.rond==null?1:o.rond));c<=ci+(o.ver==null?5:o.ver);c++)if(!W.chunks.has(c))buildChunk(c);
    const q=roadAt(C,d),f=[Math.sin(q.h),-Math.cos(q.h)],r=[Math.cos(q.h),Math.sin(q.h)];
    W.camHook=o.rit?null:()=>{const back=o.back==null?6:o.back,lift=o.lift==null?2.2:o.lift,rt=o.right||0;
      const px=q.x-f[0]*back+r[0]*rt,pz=q.z-f[1]*back+r[1]*rt,py=q.y+lift;W.cam.position.set(px,py,pz);
      if(o.top){W.cam.position.set(q.x,q.y+o.top,q.z+1);W.cam.lookAt(q.x,q.y,q.z);return}
      const ya=(o.yaw||0)*Math.PI/180,pa=(o.pitch||0)*Math.PI/180,dx=f[0]*Math.cos(ya)+r[0]*Math.sin(ya),dz=f[1]*Math.cos(ya)+r[1]*Math.sin(ya);
      W.cam.lookAt(px+dx*100*Math.cos(pa),py+Math.sin(pa)*100,pz+dz*100*Math.cos(pa))};
    for(let i=0;i<3;i++)worldStep(TH.t+=16);
    return {d,y:Math.round(q.y)};
  },
  grab(crop){worldStep(TH.t+=16);const s=W.ren.domElement,cr=crop||[0,0,1,1];return [s,s.width*cr[0],s.height*cr[1],s.width*cr[2],s.height*cr[3]]},
  async post(name,c,q=.84){const b=await new Promise(r=>c.toBlob(r,'image/jpeg',q));await fetch('/shot/'+name+'.jpg',{method:'POST',body:b});return name+' '+b.size},
  dist(v){if(typeof v==='number')return v;const m=/^([a-z0-9]+)([+-]\d+)?$/.exec(v);return MK[m[1]]+(+m[2]||0)},
  label(x,X,Y,lab){x.fillStyle='#000';x.fillRect(X,Y,9+lab.length*7,17);x.fillStyle='#fff';x.font='12px sans-serif';x.fillText(lab,X+4,Y+12)},
  async sheet(name,list,cols=2,w=768){const h=Math.round(w*innerHeight/innerWidth),rows=Math.ceil(list.length/cols),c=document.createElement('canvas');c.width=cols*w;c.height=rows*h;const x=c.getContext('2d');
    list.forEach(([lab,d,o],i)=>{o=o||{};this.view(this.dist(d),o);const [s,sx,sy,sw,sh]=this.grab(o.crop);const X=(i%cols)*w,Y=Math.floor(i/cols)*h;x.drawImage(s,sx,sy,sw,sh,X,Y,w,h);this.label(x,X,Y,lab)});
    return this.post(name,c)},
  stats(d){this.view(d,{rit:1});const i=W.ren.info;i.autoReset=false;i.reset();worldStep(TH.t+=16);const o={opdrachten:i.render.calls,driehoeken:Math.round(i.render.triangles/1000)};i.autoReset=true;return o},
  async bouwAlles(route){await this.setup(route);let err=0,msg='',stap=0;
    for(let ci=0;ci<W.C.L/1000;ci++){try{if(!W.chunks.has(ci)){const j=chunkJob(ci);let q;do{const t=performance.now();q=j.next();stap=Math.max(stap,performance.now()-t)}while(!q.done)}}catch(e){err++;msg=String(e).slice(0,200)+' km'+ci+' '+(e.stack||'').split('\n')[1]}}
    return route+': fouten '+err+' '+msg+', langste stap '+Math.round(stap)+' ms'},
  rit(n,w){W.camHook=null;P.mode='run';P.sim=true;P.speed=1;let err='',minOff=9,maxOff=-9;const log=[];
    for(let i=0;i<n;i++){live.power=w;try{worldStep(TH.t+=50)}catch(e){err=String(e)+(e.stack||'').split('\n')[1];break}for(const q of W.npcs){minOff=Math.min(minOff,q.off);maxOff=Math.max(maxOff,q.off)}
      if(i%600===599)log.push('ik '+(W.v*3.6).toFixed(0)+' km/u | '+W.npcs.map(q=>Math.round(q.d-W.dist)+' m, '+((q.v||0)*3.6).toFixed(0)+' km/u, plek '+q.off.toFixed(2)+(q.lead?' (in het wiel)':'')).join(' ; '))}
    P.mode='pause';return 'fout: '+(err||'geen')+'; plek op de weg tussen '+minOff.toFixed(2)+' en '+maxOff.toFixed(2)+' || '+log.join(' || ')},
  async fietser(name,D,shots,cols=4,w=700){const h=Math.round(w*.75),c=document.createElement('canvas');c.width=cols*w;c.height=Math.ceil(shots.length/cols)*h;const x=c.getContext('2d');
    shots.forEach(([lab,o,kmh,st,b,a],i)=>{this.view(D,o);const R=W.me,rz=R.g.rotation.z;for(let k=0;k<120;k++){R.g.rotation.z=rz;poseRider(R,.05,0,0,st,b,kmh)}R.a=a??1.2;R.g.rotation.z=rz;poseRider(R,0,0,0,st,b,kmh);W.pace.g.visible=false;if(W.comp)W.comp.render(0);else W.ren.render(W.scene,W.cam);
      const s=W.ren.domElement,X=(i%cols)*w,Y=Math.floor(i/cols)*h;x.drawImage(s,0,0,s.width,s.height,X,Y,w,h);this.label(x,X,Y,lab)});
    return this.post(name,c)}
};
'testhulp geladen';
