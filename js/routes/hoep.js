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
    ['start',{land:'polder',breedte:4.8,lijn:'kant',rand:'paal',sfeer:'open',dicht:.1}],
    ['ouderkerk-0.45',{land:'dorp',breedte:5.6,lijn:'geen',rand:'paal',sfeer:'besloten',dicht:.3}],
    ['ouderkerk+0.55',{land:'polder',breedte:4.8,lijn:'kant',rand:'paal',sfeer:'open',dicht:.1}]
  ],
  /* bomen en struiken komen van de kaart, niet uit het toeval; in het open land wel graspollen en bloemen */
  groen:{polder:[0,0,['boom']],dorp:[0,0,['boom']]},bosDeel:{polder:0,dorp:0},
  /* lange, smalle kavels grasland, om en om iets anders van kleur */
  velden:{hoek:25,b:48,l:700,kans:.9,rijen:0,kleuren:['#86b452','#7dab4c','#93bb58','#79a84a','#8cb655']},
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
