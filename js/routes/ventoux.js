'use strict';
/* ================= Route: Mont Ventoux =================
   De echte ronde over de Mont Ventoux: van Bédoin omhoog via Saint-Estève en Chalet Reynard naar de top (1909 m),
   aan de noordkant omlaag langs Mont Serein naar Malaucène en over de Col de la Madeleine terug naar Bédoin.

   Het wegverloop en het hoogteprofiel komen uit een GPX-bestand (js/routes/ventoux-spoor.js, gemaakt met
   tools/gpx_naar_spoor.py). Dit bestand beschrijft wat eromheen ligt: het land, de landschappen langs de weg,
   de dorpen en de herkenningspunten. Plaatsen staan in meters vanaf de start in Bédoin (x = oost, y = noord),
   hoogtes in meters boven zeeniveau; m() rekent ze om naar wat de motor verwacht. */
(()=>{
  const S=ROUTE_SPOOR.ventoux,H0=S.h0,f=S.schaal;
  /* punt op de kaart: [meters oost, meters noord, hoogte boven zee] */
  const m=(x,y,h)=>[x*f,y*f,h-H0];
  (window.ROUTE_DESIGN=window.ROUTE_DESIGN||{}).ventoux={
    km:S.km,spoor:'ventoux',naam:'Mont Ventoux',hoogteDorp:Math.round(H0),
    /* huizen in de dorpen worden op maat gebouwd in deze stijl (js/gebouwen.js) */
    bouwstijl:'provence',
    /* markeringen: km langs de route */
    marks:{bedoin:.35,colombe:3.05,bruns:4.3,esteve:5.44,bos:6.1,reynard:14.98,kaal:15.5,simpson:19.75,tempetes:20.5,top:21.14,
      noord:22.3,serein:26.9,belvedere:31.56,garrigue:36.6,malaucene:42.26,madeleine:48.1,terug:54.3},
    /* haarspeldbochten met een genummerd bord alleen op de berg, niet op kruispunten in de dorpen */
    hpTussen:[[5,41]],
    /* de klim voor de kilometerpaaltjes en het bord onderaan */
    klim:['bedoin','top'],klimmen:[['bedoin','top'],['malaucene+2.2','madeleine']],
    /* landschappen langs de weg. rand 'sneeuw' = de geel-zwarte sneeuwpalen van de kale top */
    secties:[
      ['terug',{land:'dorp',breedte:6.6,lijn:'geen',rand:'stoep',sfeer:'besloten',dicht:.4}],
      ['bedoin+0.3',{land:'wijn',breedte:6.4,lijn:'rive',rand:'paal',sfeer:'open',dicht:.3}],
      ['esteve-0.15',{land:'bosrand',breedte:6.2,lijn:'rive',rand:'paal',sfeer:'half',dicht:.7}],
      ['bos',{land:'bos',breedte:6,lijn:'rive',rand:'paal',sfeer:'besloten',dicht:1}],
      ['reynard-0.3',{land:'boomgrens',breedte:6.6,lijn:'midden',rand:'paal',sfeer:'open',dicht:.3}],
      ['kaal',{land:'kaal',breedte:6,lijn:'midden',rand:'sneeuw',sfeer:'open',dicht:0}],
      ['noord+0.9',{land:'boomgrens',breedte:6,lijn:'midden',rand:'rail',sfeer:'open',dicht:.4}],
      ['serein-2.4',{land:'bos',breedte:6,lijn:'midden',rand:'rail',sfeer:'besloten',dicht:.9}],
      ['serein-0.5',{land:'alm',breedte:6.2,lijn:'midden',rand:'paal',sfeer:'open',dicht:.35}],
      ['serein+0.9',{land:'bos',breedte:6,lijn:'midden',rand:'rail',sfeer:'besloten',dicht:.95}],
      ['garrigue',{land:'garrigue',breedte:6.2,lijn:'rive',rand:'muur',sfeer:'half',dicht:.55}],
      ['malaucene-0.7',{land:'dorp',breedte:6.6,lijn:'geen',rand:'stoep',sfeer:'besloten',dicht:.4}],
      ['malaucene+0.6',{land:'wijn',breedte:6.2,lijn:'rive',rand:'paal',sfeer:'open',dicht:.35}],
      ['madeleine-1.2',{land:'garrigue',breedte:6,lijn:'midden',rand:'paal',sfeer:'half',dicht:.55}],
      ['madeleine+1.3',{land:'wijn',breedte:6.2,lijn:'rive',rand:'paal',sfeer:'open',dicht:.3}]
    ],
    /* wat er groeit, per landschap: [kans op boom in bos, kans op boom in open land, soorten] */
    groen:{dorp:[.2,.06,['plataan','cipres','plataan','olijf']],wijn:[.35,.012,['cipres','olijf','steeneik','parasolden','eik','cipres']],
      bosrand:[.85,.1,['steeneik','parasolden','eik','pine','steeneik']],bos:[1,.5,['ceder','pine','ceder','eik','pine','den','steeneik']],
      boomgrens:[.5,.05,['pine','ceder','pine']],kaal:[0,0,['pine']],alm:[.5,.03,['pine','ceder']],garrigue:[.7,.1,['steeneik','parasolden','steeneik','olijf','cipres']]},
    /* hoeveel van het bos op de kaart er langs dit soort weg echt staat; in welk open land graspollen en bloemen staan */
    bosDeel:{wijn:.2,kaal:0,garrigue:.7},weiland:['wijn','garrigue'],
    /* kleuren: droog gras, donker cederbos, witte kalksteen; lagen = hoe sterk gesteente in lagen getekend wordt (de top is los puin) */
    grond:{wei:'#93a35b',bergwei:'#86a05a',alp:'#a3a777',droog:'#c2b37c',fris:'#7a9a4e',bos:'#35573a',bodem:'#5a5134',rots:'#c6c2b6',puin:'#dedacd',berm:'#b3a88f'},lagen:.15,
    /* kavels in de vlakte, tot ongeveer 640 m: wijngaarden, lavendel, olijfgaarden en kersen */
    velden:{hoek:20,b:60,l:170,kans:.8,rijen:.12,rijboom:['cipres','cipres','steeneik'],tot:330,
      kleuren:['#b49a68','#b9a06c','#9aa55c','#a89a86','#a9a765','#93a35b'],gewas:['wijn','wijn',null,'lavendel','olijf','kers']},
    dorpen:[
      {van:'terug+0.1',tot:'bedoin+0.2',naam:'Bédoin',slingers:38,plein:'bedoin-0.15',kant:-1,kerk:'kerk',huizen:['mas','mas2','mas3','mas4','mas3','winkel']},
      {van:'colombe-0.12',tot:'colombe+0.14',naam:'Sainte-Colombe',klein:true,huizen:['mas','mas2','mas4']},
      {van:'bruns-0.1',tot:'bruns+0.1',naam:'Les Bruns',klein:true,huizen:['mas2','mas','mas4']},
      {van:'esteve-0.3',tot:'esteve-0.1',naam:'Saint-Estève',klein:true,huizen:['mas','mas4','mas2']},
      {van:'malaucene-0.55',tot:'malaucene+0.45',naam:'Malaucène',slingers:44,plein:'malaucene+0.05',kant:1,kerk:'kerk',huizen:['mas3','mas','mas2','mas4','mas3','winkel']}
    ],
    /* namen en kreten op het wegdek: in het bos af en toe, op de kale top steeds vaker */
    verf:[{van:'bos',tot:'kaal',elke:420},{van:'kaal',tot:'top-1',elke:190},{van:'top-1',tot:'top',elke:55}],
    bloemen:.5,
    /* publiek (zie dzExtras in js/ontwerp.js): rustig in de vlakte, groepjes met campers in het bos, drukker bij Chalet Reynard
       en op de kale top steeds voller tot aan de dranghekken */
    publiek:[
      {land:['dorp'],elke:42,n:[2,4],af:[.7,1.7],op:.13,zit:.15,vlag:['fan7']},
      {van:'bedoin+0.3',tot:'esteve',elke:520,n:[2,4],zit:.3,parasol:.3,helling:.5},
      {van:'esteve-0.05',tot:'esteve+0.12',elke:14,n:[2,5],vlag:['fan7','fan9']},
      {van:'bos',tot:'reynard-0.3',elke:300,n:[2,6],zit:.2,vlag:['fan7','fan8','fan9'],camper:.35,parasol:.15},
      {van:'reynard-0.3',tot:'reynard+0.2',elke:13,n:[2,6],zit:.1,vlag:['fan7','fan8','fan9']},
      {van:'kaal',tot:'simpson',elke:150,n:[2,6],zit:.15,vlag:['fan7','fan8','fan9'],camper:.3,parasol:.1,helling:.7},
      {van:'simpson-0.04',tot:'simpson+0.04',elke:9,n:[2,4]},
      {van:'simpson',tot:'top-0.5',elke:55,n:[2,6],zit:.1,vlag:['fan7','fan8','fan9'],camper:.2,helling:.8},
      {van:'top-0.5',tot:'top-0.22',elke:7,n:[2,5],vlag:['fan7','fan8','fan9'],helling:1.2},
      {van:'top-0.22',tot:'top+0.03',elke:1.3,n:[2,4],af:[1.1,3.6],vlag:['fan7','fan8','fan9'],zit:0,helling:2.5},
      {van:'serein-0.2',tot:'serein+0.3',elke:120,n:[2,4],zit:.3,parasol:.3},
      {van:'malaucene+0.6',tot:'madeleine-0.3',elke:700,n:[2,3],zit:.4,parasol:.3,helling:.5},
      {van:'madeleine-0.3',tot:'madeleine+0.05',elke:40,n:[2,5],vlag:['fan7']},
      {van:'madeleine+0.3',tot:'terug',elke:800,n:[2,3],zit:.4,helling:.5}
    ],
    /* details langs de weg (zie dzExtras in js/ontwerp.js) */
    details:[
      /* de vlakte: palen langs de weg, gestapelde muurtjes, veldhuisjes, cipressen en olijfbomen, een wegkruis */
      {m:'elektrapaal',land:['wijn'],van:'bedoin+0.3',tot:'esteve',elke:58,vast:true,kant:1,af:[2.3,2.3],draai:'weg',tint:false},
      {m:'elektrapaal',land:['wijn'],van:'malaucene+0.6',tot:'terug',elke:58,vast:true,kant:-1,af:[2.3,2.3],draai:'weg',tint:false},
      {m:'stapelmuur',land:['wijn','garrigue'],elke:150,af:[4.2,7],draai:'weg',rij:[5,5.9]},
      {m:'cabanon',land:['wijn'],elke:650,af:[16,38],draai:'naarweg'},
      /* losse boerderijen (mas) tussen de wijngaarden en in de garrigue, elk met cipressen en een plataan bij het erf */
      {bouw:'provence',land:['wijn'],elke:520,af:[20,46],w:[6.5,8.5],d:[10,16],bomen:['cipres','cipres','plataan']},
      {bouw:'provence',land:['garrigue'],elke:1100,af:[18,40],w:[6,8],d:[9,13],bomen:['cipres','steeneik']},
      {m:'wegkruis',land:['wijn'],elke:2600,af:[3,3.6],draai:'naarweg',tint:false},
      {m:'cipres',boom:true,land:['wijn','garrigue'],elke:70,af:[5,16],schaal:[.9,1.3]},
      {m:'olijf',boom:true,land:['wijn','garrigue'],elke:55,af:[5,20],schaal:[.9,1.2]},
      {m:['struik','struik','keien'],land:['wijn','garrigue'],elke:16,af:[3.5,14],schaal:[.6,1.2]},
      {m:'bank',land:['wijn','garrigue'],elke:1900,af:[2.6,3.2],draai:'naarweg',tint:false},
      /* de dorpen: platanen langs de straat, bankjes, terrassen, fietsen */
      {m:'plataan',boom:true,land:['dorp'],elke:17,vast:true,kant:1,af:[1.7,1.7],schaal:[.85,1]},
      {m:'plataan',boom:true,land:['dorp'],elke:17,vast:true,kant:-1,af:[1.7,1.7],schaal:[.85,1]},
      {m:'bank',land:['dorp'],elke:60,af:[1.9,2.1],draai:'naarweg',tint:false},
      {m:'terras',land:['dorp'],elke:75,af:[2.7,3.1],groep:[3,6],kleur:['#c94f3d','#3d6f9c','#e0b23c','#3f8a5a']},
      {m:'fiets',land:['dorp'],elke:55,af:[2.2,2.4],draai:'weg',kleur:['#b3262d','#1f4f8c','#2f6b3a','#d9d9d9']},
      /* het bos: varens, struiken, omgevallen stammen, houtstapels, rotsblokken, paddenstoelen, een picknickplek */
      {m:'varen',land:['bos','bosrand'],elke:11,af:[3.4,13],groep:[3,5],schaal:[.6,1.2]},
      {m:'struik',land:['bos','bosrand','boomgrens','alm'],elke:22,af:[3.6,12],schaal:[.6,1.3]},
      {m:'stam',land:['bos','bosrand'],elke:170,af:[5,15]},
      {m:'hout',land:['bos'],elke:520,af:[4,6],draai:'weg',tint:false},
      {m:['rotsblok','rots'],land:['bos','bosrand','boomgrens'],elke:95,af:[4,16],schaal:[.6,1.5]},
      {m:'paddenstoel',land:['bos'],elke:70,af:[3.4,7],groep:[3,2]},
      {m:'picknick',land:['bos','boomgrens'],elke:2300,af:[6,9],draai:'naarweg',tint:false},
      /* de kale top: steenmannetjes, rotspartijen en losse blokken in het puin */
      {m:'steenman',land:['kaal'],elke:420,af:[5,14],schaal:[.7,1.1]},
      {m:['rotspartij','rotspartij2'],land:['kaal'],elke:160,af:[11,34],schaal:[1.2,2.8],helling:1.2},
      {m:['rotsblok','rots','keien'],land:['kaal'],elke:38,af:[4.5,26],schaal:[.5,1.5],helling:1.2},
      /* Chalet Reynard: geparkeerde auto's en een terras; de top: dranghekken langs de laatste meters en auto's op de parkeerplaats */
      {m:'auto',van:'reynard-0.06',tot:'reynard+0.1',elke:5.6,vast:true,kant:1,af:[4.6,4.6],draai:'weg',kleur:['#d9d9d9','#2a2d33','#8a8f96','#b3262d','#1f4f8c','#f2f2f2','#3f6a4a','#c9a227','#5a7fa8']},
      {m:'terras',van:'reynard-0.03',tot:'reynard+0.03',elke:4.5,kant:1,af:[8.5,12],kleur:['#c94f3d','#e0b23c','#3d6f9c']},
      {m:'dranghek',van:'top-0.22',tot:'top+0.03',elke:2.6,vast:true,kant:1,af:[.5,.5],draai:'weg',tint:false,helling:2},
      {m:'dranghek',van:'top-0.22',tot:'top+0.03',elke:2.6,vast:true,kant:-1,af:[.5,.5],draai:'weg',tint:false,helling:2},
      {m:'kraam',van:'top-0.2',tot:'top-0.02',elke:16,vast:true,kant:-1,af:[5.5,6.5],draai:'naarweg',kleur:['#d94b3d','#3d7fbf','#f4d03f','#3f9a5a'],helling:.8},
      {m:'kraam',van:'reynard-0.1',tot:'reynard-0.07',elke:9,vast:true,kant:1,af:[5,5.5],draai:'naarweg',kleur:['#d94b3d','#3d7fbf','#f4d03f']},
      {m:'auto',van:'top+0.04',tot:'top+0.16',elke:5.6,vast:true,kant:-1,af:[3.6,3.6],draai:'weg',kleur:['#d9d9d9','#2a2d33','#8a8f96','#b3262d','#1f4f8c','#f2f2f2','#3f6a4a','#c9a227','#5a7fa8'],helling:2}
    ],
    /* herkenningspunten */
    punten:[
      {soort:'gebouw',model:'herberg',at:'reynard',kant:1,af:16},
      {soort:'gebouw',model:'gedenksteen',at:'simpson',kant:1,af:6.5,schaduw:false},
      {soort:'gebouw',model:'ventouxtoren',at:'top+0.03',kant:1,af:30,vlek:18},
      {soort:'pas',at:'top',hoogte:1910},
      {soort:'gebouw',model:'chalet2',at:'serein-0.2',kant:1,af:20},
      {soort:'gebouw',model:'chalet',at:'serein+0.15',kant:-1,af:18},
      {soort:'koeien',van:'serein-0.45',tot:'serein+0.8',af:14},
      {soort:'pas',at:'madeleine',naam:'Col de la Madeleine',hoogte:448}
    ],
    /* Het land komt uit de echte hoogtekaart (js/routes/ventoux-hoogte.js); de weg ligt er precies op.
       bosVan/boomgrens/kaalVan: meters boven Bédoin. Bos tussen ongeveer 450 en 1450 m, daarboven de kale kalksteen. */
    terrein:{
      hoogte:'ventoux',cel:16,marge:1300,ruis:4,ruisVer:0,sneeuw:false,
      bosVan:140,boomgrens:1130,kaalVan:1150,kaalDicht:1.3,weiTot:[450,1000]
    },
    /* vaste sfeer: een heldere zomerochtend in de Provence */
    sfeer:{name:'ochtend',top:'#1c5fd0',hor:'#cfe0ee',sun:'#fff1da',si:3,hemi:2.3,sky:'#d8e6f6',gr:'#958f78',dir:[150,90,60],disc:'#fff4dc',exp:1.3,fog:[1500,24000],fogAbs:true,cloud:'#ffffff'}
  };
})();
