'use strict';
/* ================= Route: Ronde Hoep =================
   De echte ronde om de polder de Ronde Hoep, ten zuiden van Amsterdam: over de ringdijk langs de Oude Waver, de Waver en
   de Bullewijk naar Ouderkerk aan de Amstel en langs de Amstel terug. Zeventien kilometer vlak, met de wind als enige helling.

   Het wegverloop komt uit een GPX-bestand (js/routes/hoep-spoor.js, tools/gpx_naar_spoor.py); water, gebouwen en bomen
   liggen op hun echte plek (js/routes/hoep-kaart.js, tools/osm_naar_kaart.py, uit OpenStreetMap). Dit bestand beschrijft de rest.
   De weg ligt op de dijk (hoogte 0); het boezemwater staat een halve meter lager, de polder ruim drie en een halve meter. */
(window.ROUTE_DESIGN=window.ROUTE_DESIGN||{}).hoep={
  km:17,spoor:'hoep',naam:'Ronde Hoep',nl:true,hoogteDorp:-1,water:'#4a7684',
  /* markeringen: km langs de route */
  marks:{botshol:2.05,stokkelaar:4.6,ouderkerk:9.0,amstel:10.2,nes:14.3,fort:15.8},
  secties:[
    ['start',{land:'polder',breedte:4.8,lijn:'kant',rand:'paal',hek:'draad',sfeer:'open',dicht:.1}],
    ['ouderkerk-0.45',{land:'dorp',breedte:5.6,lijn:'geen',rand:'stoep',sfeer:'besloten',dicht:.3}],
    ['ouderkerk+0.55',{land:'polder',breedte:4.8,lijn:'kant',rand:'paal',hek:'draad',sfeer:'open',dicht:.1}]
  ],
  /* bomen en struiken komen van de kaart, niet uit het toeval; in het open land wel graspollen en bloemen */
  groen:{polder:[0,0,['boom']],dorp:[0,0,['boom']]},bosDeel:{polder:0,dorp:0},
  /* lange, smalle kavels grasland, om en om iets anders van kleur */
  velden:{hoek:25,b:48,l:700,kans:.9,rijen:0,kleuren:['#86b452','#7dab4c','#93bb58','#79a84a','#8cb655']},
  /* Ouderkerk: de huizen komen van de kaart (echt:true), stoepen, mensen en auto's van het dorp */
  dorpen:[{van:'ouderkerk-0.4',tot:'ouderkerk+0.5',naam:'Ouderkerk aan de Amstel',echt:true}],
  bloemen:1,
  /* details langs de weg (zie dzExtras in js/ontwerp.js) */
  details:[
    /* aan de polderkant: landhekken bij de dammen, rijen knotwilgen langs de ringsloot, hooibalen en een trekker in het land */
    {m:'landhek',land:['polder'],elke:170,kant:-1,af:[5.5,7.5],draai:'weg',helling:1.2,tint:false},
    {m:'knotwilg',boom:true,land:['polder'],elke:380,kant:-1,af:[13.5,13.5],rij:[6,9],schaal:[.9,1.15],helling:1.2},
    {m:'baal',land:['polder'],elke:1100,kant:-1,af:[28,60],groep:[6,34],tint:false},
    {m:'trekker',land:['polder'],elke:3400,kant:-1,af:[30,55],tint:false},
    {m:['struik','struik','pol'],land:['polder'],elke:14,af:[3,10],schaal:[.6,1.2],helling:1.2},
    /* aan de waterkant: bankjes met uitzicht, steigers, zwanen en eenden */
    {m:'bank',land:['polder'],elke:850,kant:1,af:[1.7,2.1],draai:'vanweg',tint:false,helling:1.2},
    {m:'steiger',land:['polder'],elke:900,kant:1,zoek:'oever',draai:'naarweg',dy:-.35,tint:false},
    {m:'zwaan',elke:330,kant:1,af:[8,30],op:'water',groep:[2,7],tint:false},
    {m:'eend',elke:140,kant:1,af:[5,22],op:'water',groep:[4,5],tint:false},
    /* Ouderkerk: lantaarns, bankjes, terrassen en fietsen */
    {m:'lamp',land:['dorp'],elke:36,vast:true,kant:1,af:[1.3,1.3],draai:'naarweg',tint:false},
    {m:'bank',land:['dorp'],elke:80,af:[1.9,2.1],draai:'naarweg',tint:false},
    {m:'terras',land:['dorp'],elke:110,af:[2.7,3.1],groep:[3,6],kleur:['#c94f3d','#3d6f9c','#e0b23c','#3f8a5a']},
    {m:'fiets',land:['dorp'],elke:40,af:[2.2,2.4],draai:'weg',kleur:['#b3262d','#1f4f8c','#2f6b3a','#d9d9d9','#1d1f22']}
  ],
  punten:[
    {soort:'molen',at:9.11,kant:1,af:1020,schaal:1.7},
    {soort:'koeien',van:.8,tot:1.8,kant:-1,af:26,bont:true},
    {soort:'schapen',van:3,tot:4.2,kant:-1,af:7},
    {soort:'koeien',van:5.6,tot:7.2,kant:-1,af:26,bont:true},
    {soort:'schapen',van:10.6,tot:11.6,kant:-1,af:7},
    {soort:'koeien',van:12,tot:13.6,kant:-1,af:26,bont:true},
    {soort:'boten',van:10.3,tot:14,kant:1,af:22,n:6},
    {soort:'boten',van:5.5,tot:8.4,kant:1,af:16,n:4}
  ],
  /* peil = boezemwater, vlak = het polderland, kade = hoe hoog de oever boven het peil ligt (alles in meters ten opzichte van de dijk) */
  terrein:{kaart:'hoep',vlak:-3.6,vlakAf:12,peil:-.5,kade:.5,kadeBreed:26,marge:1300,ruis:.4,
    buiten:{ver:6000,basis:-3.6,hoog:.01,dal:300}},
  grond:{wei:'#78b24a',bergwei:'#78b24a',fris:'#62a03e',droog:'#a9ad62',bodem:'#4d5a30',oever:'#7c9a4f',berm:'#a79f8a'},
  /* heldere ochtend met een hoge Hollandse lucht; de zon laag in het oosten */
  sfeer:{name:'polder',top:'#3a72cf',hor:'#dde7f1',sun:'#fff3df',si:3,hemi:2.1,sky:'#e2ebf5',gr:'#6f8457',dir:[150,70,-90],disc:'#fff4dc',exp:1.3,fog:[500,6500],fogAbs:true,cloud:'#ffffff'}
};
