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
      ['bedoin+0.3',{land:'wijn',breedte:6.4,lijn:'midden',rand:'paal',sfeer:'open',dicht:.3}],
      ['esteve-0.15',{land:'bosrand',breedte:6.2,lijn:'midden',rand:'paal',sfeer:'half',dicht:.7}],
      ['bos',{land:'bos',breedte:6,lijn:'midden',rand:'paal',sfeer:'besloten',dicht:1}],
      ['reynard-0.3',{land:'boomgrens',breedte:6.6,lijn:'midden',rand:'paal',sfeer:'open',dicht:.3}],
      ['kaal',{land:'kaal',breedte:6,lijn:'midden',rand:'sneeuw',sfeer:'open',dicht:0}],
      ['noord+0.9',{land:'boomgrens',breedte:6,lijn:'midden',rand:'rail',sfeer:'open',dicht:.4}],
      ['serein-2.4',{land:'bos',breedte:6,lijn:'midden',rand:'rail',sfeer:'besloten',dicht:.9}],
      ['serein-0.5',{land:'alm',breedte:6.2,lijn:'midden',rand:'paal',sfeer:'open',dicht:.35}],
      ['serein+0.9',{land:'bos',breedte:6,lijn:'midden',rand:'rail',sfeer:'besloten',dicht:.95}],
      ['garrigue',{land:'garrigue',breedte:6.2,lijn:'midden',rand:'muur',sfeer:'half',dicht:.55}],
      ['malaucene-0.7',{land:'dorp',breedte:6.6,lijn:'geen',rand:'stoep',sfeer:'besloten',dicht:.4}],
      ['malaucene+0.6',{land:'wijn',breedte:6.2,lijn:'midden',rand:'paal',sfeer:'open',dicht:.35}],
      ['madeleine-1.2',{land:'garrigue',breedte:6,lijn:'midden',rand:'paal',sfeer:'half',dicht:.55}],
      ['madeleine+1.3',{land:'wijn',breedte:6.2,lijn:'midden',rand:'paal',sfeer:'open',dicht:.3}]
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
      {van:'terug+0.1',tot:'bedoin+0.2',naam:'Bédoin',plein:'bedoin-0.15',kant:-1,kerk:'kerk',huizen:['mas','mas2','mas3','mas4','mas3','winkel']},
      {van:'colombe-0.12',tot:'colombe+0.14',naam:'Sainte-Colombe',klein:true,huizen:['mas','mas2','mas4']},
      {van:'bruns-0.1',tot:'bruns+0.1',naam:'Les Bruns',klein:true,huizen:['mas2','mas','mas4']},
      {van:'esteve-0.3',tot:'esteve-0.1',naam:'Saint-Estève',klein:true,huizen:['mas','mas4','mas2']},
      {van:'malaucene-0.55',tot:'malaucene+0.45',naam:'Malaucène',plein:'malaucene+0.05',kant:1,kerk:'kerk',huizen:['mas3','mas','mas2','mas4','mas3','winkel']}
    ],
    /* herkenningspunten */
    punten:[
      {soort:'gebouw',model:'herberg',at:'reynard',kant:1,af:16},
      {soort:'gebouw',model:'gedenksteen',at:'simpson',kant:1,af:6.5,schaduw:false},
      {soort:'gebouw',model:'ventouxtoren',at:'top+0.03',kant:1,af:30,vlek:18},
      {soort:'pas',at:'top',hoogte:1910},
      {soort:'gebouw',model:'chalet2',at:'serein-0.2',kant:1,af:20},
      {soort:'gebouw',model:'chalet',at:'serein+0.15',kant:-1,af:18},
      {soort:'pas',at:'madeleine',naam:'Col de la Madeleine',hoogte:448}
    ],
    /* Het land komt uit de echte hoogtekaart (js/routes/ventoux-hoogte.js); de weg ligt er precies op.
       bosVan/boomgrens/kaalVan: meters boven Bédoin. Bos tussen ongeveer 450 en 1450 m, daarboven de kale kalksteen. */
    terrein:{
      hoogte:'ventoux',cel:16,marge:1300,ruis:4,ruisVer:0,sneeuw:false,
      bosVan:140,boomgrens:1130,kaalVan:1150,kaalDicht:1.3,weiTot:[450,1000]
    },
    /* vaste sfeer: een heldere zomerochtend in de Provence */
    sfeer:{name:'ochtend',top:'#1c5fd0',hor:'#cfe0ee',sun:'#fff1da',si:3,hemi:2.3,sky:'#d8e6f6',gr:'#958f78',dir:[150,90,60],disc:'#fff4dc',exp:1.3,fog:[900,14000],fogAbs:true,cloud:'#ffffff'}
  };
})();
