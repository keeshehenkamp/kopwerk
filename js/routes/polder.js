'use strict';
/* ================= Route: Polderronde =================
   12 km vlak land: Rietveen aan een vaart, kaarsrechte polderwegen met sloten en knotwilgen, haaks de hoek om, langs een rij
   windturbines, dan bijna vier kilometer over de dijk langs de boezemvaart met drie molens, en over een tocht terug naar het dorp.
   De wind en de windschaduw maken hier het verschil, niet de hellingen. Zelfde opbouw als js/routes/col.js. */
(window.ROUTE_DESIGN=window.ROUTE_DESIGN||{}).polder={
  km:12,koers:90,nl:true,water:'#3d6e7c',
  stukken:[
    ["M","start"],
    ["S",200],
    ["M","vaartbrug1"],
    ["S",250],
    ["M","dorpuit"],
    ["S",400],
    ["Bh",92,900],
    ["S*",900],
    ["Bh",88,900],
    ["S",200],
    ["M","hoek1"],
    ["Bh",0,20],
    ["S",300],
    ["M","turb"],
    ["S*",900],
    ["Bh",355,600],
    ["S",150],
    ["M","dijkop"],
    ["Bh",290,45],
    ["S",250],
    ["Bh",280,500],
    ["S",400],
    ["M","molens"],
    ["Bh",262,600],
    ["S",500],
    ["Bh",255,700],
    ["S",350],
    ["M","gemaal"],
    ["Bh",272,500],
    ["S",450],
    ["Bh",290,600],
    ["S",300],
    ["Bh",268,500],
    ["S",250],
    ["M","dijkaf"],
    ["Bh",180,35],
    ["S",350],
    ["M","vaartbrug2"],
    ["S",300],
    ["S*",500],
    ["Bh",175,800],
    ["S",150],
    ["M","hoek3"],
    ["Bh",90,22],
    ["S",600],
    ["M","boerderijen"],
    ["S",700],
    ["M","dorpin"],
    ["S",150]],
  /* plat, met een bult over elke brug en drie meter de dijk op en af */
  hoogte:[[0,0],['vaartbrug1-0.05',5],['vaartbrug1',-5],['vaartbrug1+0.05',0],['dijkop-0.12',3],['dijkop',0],
    ['dijkaf',-3],['dijkaf+0.12',0],['vaartbrug2-0.05',4.5],['vaartbrug2',-4.5],['vaartbrug2+0.05',0]],
  afdaling:['dijkaf','dijkaf+0.12'],
  secties:[
    ['dorpin+0.03',{land:'dorp',breedte:6,lijn:'geen',rand:'stoep',sfeer:'besloten',dicht:.3}],
    ['dorpuit+0.04',{land:'polder',breedte:4.8,lijn:'kant',rand:'paal',sfeer:'open',dicht:.2}],
    ['dijkop-0.1',{land:'dijk',breedte:5.4,lijn:'midden',rand:'paal',sfeer:'open',dicht:.05}],
    ['dijkaf+0.1',{land:'polder',breedte:4.8,lijn:'kant',rand:'paal',sfeer:'open',dicht:.2}]
  ],
  zijwegen:[
    {at:'hoek1',hoek:0,stukken:[['S',300]],helling:0,breedte:4.6,bord:[['Rietveen 2',-1],['Oosterbroek 5',1]]},
    {at:'dijkop',hoek:92,stukken:[['S',250],['B',-6,600],['S',150]],helling:0,breedte:5,soort:'weg',bord:[['Rietveen 6',-1],['Molenkade',1]]},
    {at:'hoek3',hoek:5,stukken:[['S',300]],helling:0,breedte:4.6,bord:[['Rietveen 2',-1],['Zuidwijk 3',1]]},
    {at:'start+0.36',hoek:90,stukken:[['S',60],['B',-10,120],['S',60]],helling:0,breedte:4.6,soort:'straat'},
    {at:'boerderijen-0.25',hoek:90,stukken:[['S',150]],helling:0,breedte:3.4,soort:'grind'}
  ],
  naam:'Polderronde',
  dorpen:[{van:'dorpin-0.08',tot:'dorpuit+0.02',naam:'Rietveen',plein:'start+0.32',kant:-1,kerk:'kerk',huizen:['trapgevel','trapgevel','winkel','villa','trapgevel','boerderij','villa']}],
  punten:[
    {soort:'vaartbrug',at:'vaartbrug1',lengte:30},
    {soort:'vaartbrug',at:'vaartbrug2',lengte:34},
    {soort:'molen',at:'molens',kant:1,af:104,schaal:1.6},
    {soort:'molen',at:'molens+0.38',kant:1,af:104,schaal:1.6,draai:.4},
    {soort:'molen',at:'molens+0.74',kant:1,af:104,schaal:1.6,draai:-.3},
    {soort:'molen',at:'vaartbrug1+0.12',kant:-1,af:26,schaal:1.3},
    {soort:'turbines',at:'turb+0.1',kant:1,af:380,n:5,tussen:290,schuin:20,wind:30},
    {soort:'boten',van:'molens-0.4',tot:'dijkaf-0.4',kant:1,af:40,n:5},
    {soort:'boerderij',at:'boerderijen',kant:1,af:42,huis:'boerderij',schuur:'schuur',silo:true},
    {soort:'boerderij',at:'turb+0.55',kant:-1,af:46,huis:'boerderij',schuur:'schuur'},
    {soort:'boerderij',at:'dijkaf+0.75',kant:1,af:40,huis:'boerderij',schuur:'schuur',silo:true},
    {soort:'koeien',van:'dorpuit+0.2',tot:'hoek1-0.1',af:10,bont:true},
    {soort:'koeien',van:'vaartbrug2+0.2',tot:'hoek3-0.1',af:12,bont:true},
    {soort:'schapen',van:'dijkop+0.3',tot:'dijkaf-0.4',kant:-1,af:5}
  ],
  sloten:{af:4.4,breed:1.8,lang:250,wilgen:.4},
  velden:{hoek:0,b:62,l:520,kans:.38,rijen:.06,rijboom:['populier','knotwilg'],kleuren:['#86b452','#9cc35e','#cdb763','#6f9f42','#a88d5e','#8fbc55']},
  terrein:{
    lijnen:[
      /* kade aan de overkant van de boezemvaart */
      [["dijkop+0.1",108,-420,-1],["dijkop+0.1",108,0,-1],["dijkop+0.35",108,0,-1],["dijkop+0.6",108,0,-1],["dijkop+0.85",108,0,-1],["dijkop+1.1",108,0,-1],["dijkop+1.35",108,0,-1],["dijkop+1.6",108,0,-1],["dijkop+1.85",108,0,-1],["dijkop+2.1",108,0,-1],["dijkop+2.35",108,0,-1],["dijkop+2.6",108,0,-1],["dijkop+2.85",108,0,-1],["dijkop+3.1",108,0,-1],["dijkop+3.35",108,0,-1],["dijkop+3.6",108,0,-1],["dijkaf-0.1",108,420,-1]]
    ],
    vlak:-1.2,vlakAf:16,marge:1500,buitenrand:-1.2,ruis:.6,
    meren:[
      /* de boezemvaart langs de dijk */
      {pt:[["dijkop+0.1",11,-420],["dijkop+0.1",11,0],["dijkop+0.35",11,0],["dijkop+0.6",11,0],["dijkop+0.85",11,0],["dijkop+1.1",11,0],["dijkop+1.35",11,0],["dijkop+1.6",11,0],["dijkop+1.85",11,0],["dijkop+2.1",11,0],["dijkop+2.35",11,0],["dijkop+2.6",11,0],["dijkop+2.85",11,0],["dijkop+3.1",11,0],["dijkop+3.35",11,0],["dijkop+3.6",11,0],["dijkaf-0.1",11,420],["dijkaf-0.1",95,420],["dijkop+3.6",95,0],["dijkop+3.35",95,0],["dijkop+3.1",95,0],["dijkop+2.85",95,0],["dijkop+2.6",95,0],["dijkop+2.35",95,0],["dijkop+2.1",95,0],["dijkop+1.85",95,0],["dijkop+1.6",95,0],["dijkop+1.35",95,0],["dijkop+1.1",95,0],["dijkop+0.85",95,0],["dijkop+0.6",95,0],["dijkop+0.35",95,0],["dijkop+0.1",95,0],["dijkop+0.1",95,-420]],peil:2.1,riet:true},
      /* vaart door Rietveen en de tocht bij de tweede brug */
      {anker:'vaartbrug1',pt:[[-520,-11],[520,-11],[520,11],[-520,11]],peilAt:'vaartbrug1-0.06',onder:1.6,riet:true},
      {anker:'vaartbrug2',pt:[[-650,-14],[650,-14],[650,14],[-650,14]],peilAt:'vaartbrug2-0.06',onder:1.8,riet:true}
    ]
  },
  grond:{wei:'#78b24a',bergwei:'#78b24a',fris:'#62a03e',droog:'#a9ad62',bodem:'#4d5a30'},
  /* heldere ochtend met een hoge lucht; de zon laag in het oosten */
  sfeer:{name:'polder',top:'#3a72cf',hor:'#dde7f1',sun:'#fff3df',si:3.1,hemi:1.9,sky:'#e2ebf5',gr:'#5d7a44',dir:[150,70,-90],disc:'#fff4dc',exp:1.3,fog:[500,6500],fogAbs:true,cloud:'#ffffff'}
};
