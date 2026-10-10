'use strict';
/* ================= Route: De Col =================
   Een vast ontwerp, elke ronde precies hetzelfde. Dorp in het dal, 6 km klimmen langs de oostflank van een bergrug,
   over de pas en ruim 4 km afdalen langs de westflank terug naar het dorp.

   Het wegverloop staat als opeenvolgende stukken (zie js/ontwerp.js):
     ['S', m]            recht stuk
     ['S*', m]           recht stuk waarvan de lengte wordt bijgesteld zodat de ronde precies sluit
     ['B', graden, r]    bocht (+ rechts, - links) met straal r in meters
     ['Bh', koers, r]    bocht naar een vaste koers (0 = noord, 90 = oost), de kortste kant op
     ['HP', 'L'|'R', koers, r]  haarspeldbocht naar links of rechts tot een vaste koers (krijgt een genummerd bord)
     ['M', naam]         markering op deze plek (voor kruispunten en herkenningspunten)
   Het hoogteprofiel: [km, stijging in %], geldt tot de volgende knoop. */
(window.ROUTE_DESIGN=window.ROUTE_DESIGN||{}).col={
  km:11,koers:90,
  stukken:[
    /* dorp, oostwaarts */
    ['M','start'],['S',60],['Bh',97,300],['S',75],['Bh',85,220],['S',110],
    /* T-splitsing: linksaf het zijdal in; de dalweg loopt rechtdoor verder */
    ['M','tsplits'],['Bh',14,24],
    /* zijdal, langs de westkant van de beek */
    ['S',90],['Bh',38,260],['Bh',12,190],['S*',80],['Bh',40,300],['S',30],
    /* steile strook schuin de flank op */
    ['M','flank'],['Bh',-55,90],['S',70],['Bh',-72,60],['S',120],['Bh',-28,45],['S',45],['Bh',-35,90],['S',85],
    /* balkonweg langs de rotswand */
    ['M','balkon'],['Bh',0,150],['S',140],['Bh',6,600],
    /* een zijkloof in: bocht die steeds krapper wordt, stenen brug achterin, er aan de overkant weer uit */
    ['M','kloof'],['Bh',-45,70],['Bh',-85,32],['S',10],['Bh',0,28],['M','brug'],['S',22],['Bh',70,36],['S',25],['Bh',8,60],
    /* vier haarspeldbochten door het bos */
    ['M','hp1'],['S',260],['HP','L',194,12],['S',195],['HP','R',4,17],['S',135],['HP','L',192,9],['S',80],['Bh',183,260],['S',95],['HP','R',352,14],['S',40],
    /* bos, glooiend en dan steil en bochtig */
    ['M','bos'],['Bh',-50,160],['S',60],['Bh',-78,220],['S',50],['Bh',-45,60],['S',85],['Bh',-85,50],['S',125],['Bh',-25,120],
    /* lawinegalerij langs de wand */
    ['M','galerij'],['S',110],['Bh',15,200],['S',80],
    /* even omlaag naar het stuwmeer, langs de oever */
    ['Bh',-4,140],['M','meer'],['S',120],['Bh',-15,300],['S',60],
    /* zes haarspeldbochten tegen de kopwand boven het meer */
    ['M','hp2'],['Bh',-95,35],['S',130],['HP','R',76,11],['S',95],['Bh',88,300],['S',50],['HP','L',281,15],['S',175],['HP','R',96,9],['S',70],['HP','L',284,13],['S',90],['Bh',271,220],['S',35],['HP','R',82,17],['S',125],['HP','L',268,10],['S',60],
    /* laatste stuk naar de pas */
    ['M','top'],['S',95],['Bh',262,200],['S',80],
    /* pashoogte */
    ['M','pas'],['S',70],['Bh',225,120],['S',50],
    /* afdaling langs de westflank */
    ['M','afd'],['Bh',190,90],['S',140],['Bh',230,70],['S',80],['Bh',140,55],['S',120],['Bh',105,160],['S*',180],['Bh',200,48],['S',70],['Bh',165,300],['S*',200],
    ['Bh',95,65],['S',130],['Bh',190,70],['S',160],['Bh',150,400],['S',140],['Bh',230,60],['S',100],['Bh',200,90],['S',70],['Bh',165,140],['S',100],['Bh',120,200],['S',140],['Bh',172,90],['S',40],['Bh',186,200],['S',30],
    /* dalweg oostwaarts terug naar het dorp, met een rotonde */
    ['M','tsplits2'],['Bh',95,30],['S',90],['M','rotonde'],['B',45,24],['B',-90,14,'rotondemidden'],['B',45,24],['S',70],['Bh',90,300],['S',60]
  ],
  /* knopen mogen ook bij een markering liggen: 'flank' of 'flank+0.12' (km na de markering) */
  hoogte:[[0,1],['tsplits',3],['tsplits+0.25',5.5],['flank-0.12',4.5],['flank',9.8],['flank+0.45',6],['balkon',2.5],['kloof+0.12',-3.5],['brug+0.03',5],['hp1',7.4],['bos',4],['bos+0.3',10.2],['galerij-0.05',6.5],
    ['meer-0.12',-2.5],['meer+0.05',.5],['hp2',6.1],['top',7.5],['pas',1],['pas+0.1',0],
    ['afd',-7],['afd+0.35',-9.5],['afd+0.75',-5],['afd+1.0',-9.5],['afd+1.5',1.5],['afd+1.6',-4],['afd+1.8',-10],['afd+2.55',-8],['afd+2.9',-9.5],['tsplits2-0.5',-6],['tsplits2-0.1',-1],['rotonde',1.5]],
  hpGroepen:[['hp1','bos'],['hp2','top']],
  afdaling:['afd','tsplits2'],
  /* de klim voor het bord onderaan */
  klim:['tsplits','pas']
  ,
  /* Secties: elk stuk van de ronde heeft een eigen karakter. Ze lopen over 150 m in elkaar over.
     land: dorp, dal, bosrand, rots, bos, boomgrens, alpen, pas, alm, loofbos, westdal
     breedte: weg in meters; lijn: midden (onderbroken middenstreep), kant (kantstrepen), beide, geen
     rand: wat er langs de weg staat (muur = stenen borstwering, rail = vangrail, paal = reflectorpaaltjes, stoep); hek: weidehek (hout of draad)
     sfeer: open (uitzicht) of besloten (bos, wand, dorpsstraat); dicht: hoeveel begroeiing (0-1) */
  secties:[
    ['rotonde-0.1',{land:'dorp',breedte:7,lijn:'geen',rand:'stoep',sfeer:'besloten',dicht:.4}],
    ['tsplits+0.05',{land:'dal',breedte:6.6,lijn:'midden',rand:'paal',hek:'hout',sfeer:'open',dicht:.35}],
    ['flank',{land:'bosrand',breedte:6,lijn:'kant',rand:'rail',sfeer:'half',dicht:.7}],
    ['balkon-0.08',{land:'rots',breedte:5.6,lijn:'kant',rand:'muur',sfeer:'open',dicht:.3}],
    ['hp1',{land:'bos',breedte:5.8,lijn:'geen',rand:'rail',sfeer:'besloten',dicht:1}],
    ['bos+0.4',{land:'boomgrens',breedte:6,lijn:'midden',rand:'muur',sfeer:'open',dicht:.45}],
    ['meer+0.2',{land:'alpen',breedte:5.6,lijn:'kant',rand:'paal',hek:'draad',sfeer:'open',dicht:.25}],
    ['top',{land:'pas',breedte:6.4,lijn:'midden',rand:'paal',sfeer:'open',dicht:.1}],
    ['afd+0.4',{land:'alm',breedte:6,lijn:'midden',rand:'rail',hek:'draad',sfeer:'open',dicht:.35}],
    ['afd+1.9',{land:'loofbos',breedte:6.2,lijn:'beide',rand:'paal',sfeer:'besloten',dicht:.9}],
    ['tsplits2-0.6',{land:'westdal',breedte:6.6,lijn:'midden',rand:'paal',hek:'hout',sfeer:'open',dicht:.4}]
  ],
  /* zijwegen: vanaf een plek op de route, onder een hoek met de rijrichting (+ rechts), met eigen stukken en helling (%) */
  zijwegen:[
    {at:'tsplits',hoek:0,stukken:[['S',120],['B',8,400],['S',160]],helling:-.6,breedte:6.4},
    {at:.11,hoek:90,stukken:[['S',40],['B',-15,120],['S',50]],helling:-2,breedte:5,soort:'straat'},
    {at:.11,hoek:-90,stukken:[['S',50],['B',20,80],['S',70]],helling:7,breedte:5,soort:'straat'},
    {at:'tsplits2+0.045',hoek:180,stukken:[['S',150],['B',-6,500],['S',170]],helling:.4,breedte:6.4},
    {at:'meer-0.08',hoek:85,stukken:[['S',235]],helling:0,breedte:4,soort:'dam'},
    {at:'bos+0.22',hoek:-55,stukken:[['S',60],['B',-25,60],['S',90]],helling:3,breedte:3.6,soort:'grind'},
    {at:'afd+1.52',hoek:65,stukken:[['S',50],['B',30,40],['S',60]],helling:-4,breedte:4,soort:'straat'}
  ],
  /* rotonde rond het midden van een gemarkeerde bocht; armen: [kompasrichting, lengte, helling %] */
  rotondes:[{mark:'rotondemidden',r:14,armen:[[0,130,5],[180,110,-1]]}],
  /* dorpen langs de route: huizen aan weerszijden, een plein met kerk aan één kant (kant: -1 links, 1 rechts) */
  naam:'Col de la Traverse',hoogteDorp:1240,
  dorpen:[{van:'rotonde+0.05',tot:'start+0.25',naam:'Valbrenne',plein:'start+0.07',kant:-1,huizen:['chalet','chalet2','chalet3','steenhuis','herberg','steenhuis']},
    {van:'afd+1.46',tot:'afd+1.63',naam:'Les Granges',klein:true,huizen:['chalet','hooischuur','steenhuis','chalet3']}],
  /* herkenningspunten: elk precies één keer, op een vaste plek */
  punten:[
    /* beek: [kant waar hij vandaan komt, meters stroomop, stijging, meters stroomaf, daling] */
    {soort:'brug',at:'brug',beek:[-1,150,85,230,48]},
    {soort:'kapel',hp:3},
    {soort:'galerij',van:'galerij+0.03',tot:'galerij+0.16'},
    {soort:'dam'},
    {soort:'berghut',hp:7,af:22},
    {soort:'pas',at:'pas+0.03'},
    {soort:'waterval',at:'afd+0.62',kant:-1},
    {soort:'zagerij',at:'afd+2.5',kant:1},
    {soort:'boerderij',at:'tsplits+0.42',kant:1,af:34},
    {soort:'boerderij',at:'tsplits2-0.28',kant:-1,af:30},
    {soort:'koeien',van:'afd+0.45',tot:'afd+1.3'},
    {soort:'koeien',van:'hp2-0.05',tot:'hp2+0.3'}
  ],
  /* Het land: getekende lijnen in kaartmeters (x = oost, y = noord, vanaf het startpunt) met een hoogte in meters boven het dorp.
     Een punt kan ook vastzitten aan de weg: ['markering', meters rechts, meters vooruit, meters boven de weg].
     Tussen deze lijnen en de weg wordt het land glad ingevuld; daarna komt er reliëf overheen. */
  terrein:{
    lijnen:[
      /* rivier in het hoofddal (stroomt naar het oosten) en de dalbodem ten zuiden ervan */
      [[-2600,-220,-6],[-1500,-190,-10],[-750,-160,-12],[0,-150,-13],[600,-150,-14],[1500,-170,-17],[2600,-200,-20]],
      [[-2600,-430,0],[-1200,-420,-3],[0,-440,-4],[1200,-430,-6],[2600,-450,-8]],
      [[-2600,-680,140],[-1000,-650,110],[300,-700,150],[2600,-690,130]],
      /* beek in het oostelijke zijdal, van de stuwdam naar de rivier */
      [['meer',140,-115,-32],[-150,2300,205],[150,2150,150],[450,1900,85],[550,1500,55],[700,1150,30],[850,800,12],[800,400,0],[650,50,-8],[600,-150,-14]],
      /* beek in het westelijke dal */
      [[-1650,3050,320],[-1680,2500,250],[-1380,2000,170],[-1220,1500,120],[-1070,1000,60],[-950,500,15],[-800,100,-6],[-750,-160,-12]],
      /* de bergrug binnen de ronde, van het dorp naar de pas */
      [[0,250,70],[30,600,190],[-60,1000,290],[-250,1600,400],[-560,2050,460],[-760,2400,500],[-850,2700,540],[-920,2960,430]],
      /* oostwand: beboste helling, een schouder met alpenweides en dan de kam (met twee toppen) */
      [[1100,-250,120],[1180,400,190],[1150,1100,260],[1000,1800,330],[650,2450,420],[200,2950,470]],
      [[1350,-300,260],[1420,450,330],[1400,1150,400],[1250,1900,460],[900,2650,560],[400,3150,600]],
      [[1650,-350,520],[1720,500,640],[1680,950,820],[1650,1350,690],[1520,2000,720],[1250,2650,880],[700,3250,760],[150,3480,820]],
      /* noordkam achter de kopwand en de pas */
      [[150,3480,820],[-250,3560,900],[-700,3600,980],[-1150,3640,860],[-1600,3660,800],[-2100,3700,760]],
      [[-200,3300,560],[-650,3360,640],[-1150,3420,560],[-1650,3450,520]],
      /* westwand: helling, schouder, kam */
      [[-1950,-250,110],[-2000,500,170],[-1980,1300,250],[-1950,2100,320],[-1950,2900,420]],
      [[-2200,-300,250],[-2250,450,320],[-2250,1250,390],[-2250,2050,450],[-2200,2900,520]],
      [[-2480,-350,500],[-2520,450,610],[-2520,1150,780],[-2520,1900,660],[-2480,2700,740],[-2450,3500,800]],
      /* zuidwand achter het dorp */
      [[-2600,-1150,600],[-1500,-1050,540],[-500,-1150,690],[500,-1000,520],[1500,-1100,620],[2600,-1200,640]]
    ],
    /* toppen: [x, y, hoogte, straal] */
    toppen:[[-700,3650,1040,26],[1700,900,860,24],[-2520,1150,820,24],[1250,2650,930,24]],
    marge:1450,buitenrand:580,
    /* stuwmeer: oever in meters rechts/vooruit vanaf de markering 'meer', peil zoveel meter onder de weg */
    meren:[{anker:'meer',pt:[[16,-62],[120,-58],[225,-52],[270,10],[275,110],[215,200],[100,240],[25,205],[14,90]],peilAt:'meer+0.05',onder:2.2}],
    /* steile wand of afgrond langs de weg: [van, tot, kant (-1 links, 1 rechts), meters opzij, meters hoger(+)/lager(-)] */
    randen:[['balkon-0.05','kloof',-1,9,14],['balkon-0.05','kloof',1,13,-20],['galerij-0.02','galerij+0.36',-1,8,16],['galerij-0.02','galerij+0.36',1,14,-16],
      ['flank+0.2','flank+0.5',-1,10,10],['afd+0.56','afd+0.7',-1,9,26]],
    ruis:24
  },
  /* vaste sfeer: heldere, koele ochtend; de zon staat laag in het oosten */
  sfeer:{name:'ochtend',top:'#1f5bc4',hor:'#c9dcee',sun:'#fff0d8',si:3.4,hemi:1.25,sky:'#d4e4f6',gr:'#4f6638',dir:[160,72,70],disc:'#fff4dc',exp:1.3,fog:[700,10500],fogAbs:true,cloud:'#ffffff'}
};
