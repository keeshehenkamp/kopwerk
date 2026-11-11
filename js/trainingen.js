'use strict';
/* ================= workouts ================= */
const TYPES={
  herstel:{name:'Herstelrit',hard:false,desc:'Losrijden op lage weerstand. Het doel is doorbloeding, geen trainingsprikkel. Houd het echt rustig.'},
  duur:{name:'Duurrit',hard:false,desc:'Rustig tempo, onder in zone 2, waarbij je makkelijk kunt praten. Buiten of zonder vermogen rijd je op hartslag. Dit bouwt de basis waar al het zwaardere werk op rust.'},
  souplesse:{name:'Souplesse',hard:false,desc:'Rustige rit met korte blokken op hoge cadans. Je benen leren sneller en soepeler ronddraaien, zodat je op hetzelfde vermogen minder kracht per trap zet.'},
  tempo:{name:'Tempoblokken',hard:true,desc:'Lange blokken net onder het punt waar het zwaar wordt. Goed voor uithoudingsvermogen en langer hard kunnen rijden.'},
  sweetspot:{name:'Sweet spot',hard:true,desc:'Blokken net onder je drempel, op gevoel: stevig, maar je kunt nog korte zinnen zeggen. De watts zijn een richtlijn.'},
  drempel:{name:'Drempelblokken',hard:true,desc:'Blokken rond je FTP. Zwaar maar beheersbaar: je traint het vermogen dat je een uur kunt volhouden.'},
  vo2:{name:'VO2max-intervallen',hard:true,desc:'Korte, harde intervallen ruim boven je FTP met evenveel rust. Vergroot je maximale zuurstofopname.'},
  heuvels:{name:'Korte klimmen',hard:true,desc:'Herhaalde korte, steile klimmen van ongeveer twee minuten ruim boven je FTP, met rustig herstel ertussen. Zo train je het aanzetten op hellingen zoals in een heuveltocht.'},
  anaeroob:{name:'30/30-intervallen',hard:true,desc:'Dertig seconden hard, dertig seconden rustig. Traint herhaald versnellen en snel herstellen.'},
  klim:{name:'Klimkracht',hard:true,desc:'Blokken op lage cadans, zoals op een lange klim. Blijf zitten en houd je bovenlichaam stil.'},
  kracht:{name:'Krachtblokken',hard:true,desc:'Blokken op tempo met een zware versnelling en lage cadans van 50 tot 60 rpm. Blijf zitten, houd je bovenlichaam stil en duw de trappers rond. Bouwt kracht voor lange klimmen.'},
  sprint:{name:'Sprints',hard:true,desc:'Duurrit met korte sprints van 15 seconden. Traint explosiviteit zonder veel vermoeidheid.'},
  duurklim:{name:'Duurrit met klimblokken',hard:false,desc:'Lange duurrit met blokken op tempo en lage cadans, zoals op een klim midden in een lange tocht. Rustig tussen de blokken.'},
  duurtempo:{name:'Duurrit met tempofinale',hard:false,desc:'Lange duurrit die eindigt met een blok op tempo. Je leert doortrappen als de benen al moe zijn.'},
  duurheuvels:{name:'Duurrit met korte klimmen',hard:false,desc:'Lange duurrit met elk kwartier een korte, stevige klim. Je leert hellingen aanzetten als de benen al moe zijn, zoals laat in een heuveltocht.'},
  openers:{name:'Activatie',hard:false,desc:'Korte prikkels om de benen wakker te houden zonder vermoeidheid op te bouwen. Past in een herstelweek of de dag voor een zware rit.'},
  ramptest:{name:'FTP-test (ramptest)',hard:true,desc:'Elke minuut gaat het vermogen omhoog tot je niet meer kunt. Houd je een stap niet meer vast, dan stopt de test vanzelf en rij je vijf minuten uit. Je FTP is ongeveer 75% van je beste minuut, tot je een eigen verhouding hebt.'}
};
/* nieuwe set (oktober 2026): meer afwisseling binnen elke soort prikkel; min = vanaf welk niveau de coach hem inplant */
Object.assign(TYPES,{
  overunder:{name:'Over-unders',hard:true,min:1,desc:'Blokken die wisselen tussen net onder en net boven je FTP: twee minuten onder, één minuut over. Je leert verzuring kwijtraken terwijl je doorrijdt, zoals wanneer het tempo in een groep even omhoog gaat.'},
  drempelramp:{name:'Oplopende drempelblokken',hard:true,min:1,desc:'Elk blok begint iets onder je FTP en eindigt er net boven. Rustig beginnen en sterk eindigen, zoals een klim die steeds steiler wordt.'},
  ssaanzet:{name:'Sweet spot met aanzetten',hard:true,desc:'Sweet-spotblokken met elke vier minuten een korte versnelling. Na elke versnelling direct terug naar je tempo, zoals bij het begin van een helling of na een bocht.'},
  oplopend:{name:'Oplopend tempo',hard:true,desc:'Vier trappen van rustig duurtempo naar net onder je FTP, zonder rust ertussen. Een rustige manier om lang werk op tempo en sweet spot te doen.'},
  tempocad:{name:'Tempo op hoge cadans',hard:true,desc:'Tempoblokken op 95 tot 105 rpm. Je spieren worden minder zwaar belast per omwenteling, zodat je lang kunt doorrijden zonder dat je benen verzuren. Goed voor vlakke tochten.'},
  i3015:{name:'30/15-intervallen',hard:true,min:1,desc:'Series van dertig seconden hard en vijftien seconden rustig. Door de korte rust blijft je hartslag hoog: veel tijd dicht bij je maximale zuurstofopname, zonder lange blokken.'},
  i4020:{name:'40/20-intervallen',hard:true,min:1,desc:'Series van veertig seconden hard en twintig seconden rustig. Zwaarder dan 30/30 omdat de rust korter is. Traint herhaald aanzetten met weinig herstel.'},
  piramide:{name:'Piramide',hard:true,min:1,desc:'Intervallen die eerst langer en daarna weer korter worden, met evenveel rust. Hoe korter het interval, hoe harder.'},
  microbursts:{name:'Microbursts',hard:true,min:1,desc:'Steeds vijftien seconden hard en vijftien seconden rustig, tien minuten achter elkaar. Traint snelle versnellingen en herstel binnen een paar seconden.'},
  groepsrit:{name:'Groepsrit',hard:true,min:1,desc:'Tempo zoals in een snelle groep, met elke drie minuten een korte versnelling om een gat dicht te rijden.'},
  fartlek:{name:'Fartlek',hard:true,desc:'Een speelse mix van korte en langere inspanningen op verschillende zwaartes, steeds met rust ertussen. Afwisselend en goed voor je algemene conditie.'},
  colsim:{name:'Lange col',hard:true,desc:'Eén lang blok net onder je drempel op lage cadans, met een zwaardere laatste kilometer. Bootst een lange col na: gelijkmatig rijden en niet te hard beginnen.'},
  staand:{name:'Staand klimmen',hard:true,desc:'Klimblokken waarin je elke minuut wisselt tussen zitten en staan. Zo leer je op een steile klim afwisselen zonder je ritme te verliezen.'},
  topsprint:{name:'Klimmen met sprint',hard:true,desc:'Korte klimmen net onder je FTP met een sprint van twintig seconden over de top. Zo rijd je weg na een helling, zoals in een heuveltocht.'},
  muurtjes:{name:'Muurtjes',hard:true,desc:'Korte, steile inspanningen van 45 tot 60 seconden op lage cadans met tempo ertussen, zonder echte rust. Zoals de Vlaamse en Limburgse hellingen die snel na elkaar komen.'},
  kasseien:{name:'Kasseien',hard:true,desc:'Blokken van twee à drie minuten rond je FTP op lage cadans, met tempo ertussen. Bootst kasseistroken na waarop je kracht moet blijven zetten.'},
  krachtsprint:{name:'Krachtsprints',hard:true,min:1,desc:'Sprints van tien seconden vanaf een lage cadans in een zware versnelling, met ruime rust. Bouwt kracht en explosiviteit zonder veel vermoeidheid.'},
  duurkracht:{name:'Duurrit met lage cadans',hard:false,desc:'Rustige duurrit met blokken op 55 tot 65 rpm. Licht genoeg om ervan te herstellen, maar je spieren wennen aan veel kracht per trap, zoals op een lange klim.'},
  cadansladder:{name:'Cadansladder',hard:false,desc:'Rustige rit met ladders van 80 naar 120 rpm, één minuut per trede. Je trapbeweging wordt soepeler en ronder.'}
});
Object.assign(TYPES,{
  herstelcad:{name:'Herstel op hoge cadans',hard:false,desc:'Losrijden met weinig weerstand en een lichte, snelle trapbeweging. Houd het echt rustig.'},
  herstelgolf:{name:'Golvend herstel',hard:false,desc:'Losrijden met om de vijf minuten een klein beetje meer of minder vermogen. Blijft de hele rit licht.'},
  herstelspin:{name:'Herstel met spin-ups',hard:false,desc:'Losrijden met af en toe een minuut op hoge cadans, zonder meer kracht te zetten.'},
  duurgolf:{name:'Golvende duurrit',hard:false,desc:'Zone 2 met om de vijf minuten iets meer of minder vermogen, zoals op een licht golvende weg.'},
  duuropbouw:{name:'Oplopende duurrit',hard:false,desc:'Zone 2 in drie delen, elk iets steviger. Je begint rustig en eindigt iets steviger, nog steeds met makkelijk praten.'},
  duursprint:{name:'Duurrit met sprints',hard:false,desc:'Lange duurrit met elke twintig minuten een sprint van vijftien seconden. Zo blijven je benen wakker.'},
  duurss:{name:'Duurrit met sweet spot',hard:false,desc:'Lange duurrit met blokken net onder je drempel. Veel uren met daarin een stevige prikkel.'},
  spinups:{name:'Spin-ups',hard:false,desc:'Rustige rit met korte stukken waarin je de cadans opvoert tot zo hoog als je soepel haalt.'},
  cadansgolf:{name:'Cadansgolven',hard:false,desc:'Rustige rit waarin je om de drie minuten wisselt tussen lage en hoge cadans, op hetzelfde vermogen.'},
  openers30:{name:'Activatie 30 seconden',hard:false,desc:'Vier korte, stevige stukken met ruime rust. Maakt de benen wakker zonder vermoeidheid.'},
  scherp:{name:'Scherp blijven',hard:false,desc:'Drie blokken van drie minuten op je drempel met evenveel rust. Geschikt voor een rustige week.'},
  prikkels:{name:'Korte prikkels',hard:false,desc:'Zes versnellingen van vijftien seconden in een rustige rit. Licht, maar je voelt je benen weer.'},
  sslang:{name:'Lange sweet spot',hard:true,desc:'Eén lang blok net onder je drempel. Vraagt vooral geduld en een gelijkmatig vermogen.'},
  ssgolf:{name:'Sweet-spotgolven',hard:true,desc:'Blokken waarin je om de drie minuten wisselt tussen iets onder en iets boven sweet spot.'},
  drempelkort:{name:'Korte drempelblokken',hard:true,desc:'Veel korte blokken op je FTP met weinig rust. Zo maak je veel tijd op je drempel zonder één lang blok.'},
  tijdrit:{name:'Tijdrit',hard:true,desc:'Eén blok net onder je FTP, zo gelijkmatig mogelijk. Niet te hard beginnen.'},
  tempolang:{name:'Lang tempo',hard:true,desc:'Eén lang blok op tempo. Goed om te leren lang hetzelfde vermogen vast te houden.'},
  tempogolf:{name:'Tempo met versnellingen',hard:true,desc:'Tempoblokken met elke drie minuten een korte versnelling, waarna je direct terug gaat naar je tempo.'},
  vo2oplopend:{name:'Oplopende VO2max',hard:true,min:1,desc:'Harde intervallen die oplopen van net boven tot ver boven je FTP, met evenveel rust.'},
  minuut:{name:'Minuut aan, minuut uit',hard:true,desc:'Een minuut hard en een minuut rustig, steeds opnieuw. Eenvoudig, en het tikt snel aan.'},
  tabata:{name:'20/10-intervallen',hard:true,min:1,desc:'Series van twintig seconden voluit en tien seconden rust. Heel zwaar, maar kort.'},
  heuveltrein:{name:'Heuveltrein',hard:true,desc:'Korte klimmetjes van een minuut die elkaar snel opvolgen, zoals in de heuvels. Tussendoor net genoeg rust om door te gaan.'},
  klimtrappen:{name:'Klimtrappen',hard:true,desc:'Klimblokken op lage cadans in drie trappen, elke trap iets zwaarder. Je leert een klim rustig te beginnen.'},
  tweecols:{name:'Twee cols',hard:true,desc:'Twee lange klimblokken met een rustig stuk ertussen. Bij de tweede col merk je of je de eerste goed indeelde.'},
  heuvelstart:{name:'Aanzetten bergop',hard:true,min:1,desc:'Korte, harde stukken vanuit een zeer lage cadans, alsof je stilvalt op een steile helling en weer aanzet.'},
  zwaarlicht:{name:'Zwaar en licht',hard:true,desc:'Blokken waarin je om de twee minuten wisselt tussen lage en hoge cadans, op hetzelfde vermogen.'},
  langesprint:{name:'Lange sprints',hard:true,min:1,desc:'Sprints van dertig seconden met ruime rust. Je leert een sprint vol te houden tot de streep.'},
  sprintblok:{name:'Sprint na een blok',hard:true,desc:'Vier minuten stevig tempo met een sprint aan het eind, zoals een finale.'},
  kasseitempo:{name:'Tempo op lage cadans',hard:true,desc:'Blokken net onder je drempel op lage cadans, met korte stukken rust. Je blijft kracht zetten als het zwaar wordt.'},
  koersdag:{name:'Koersritme',hard:true,min:1,desc:'Series met wisselend tempo en korte versnellingen, zoals in een wedstrijd of snelle groep.'},
  demarrage:{name:'Demarrages',hard:true,min:1,desc:'Een harde aanval van dertig seconden en daarna drie minuten doorrijden om de voorsprong vast te houden.'},
  vier8:{name:'Blokken van 8 minuten',hard:true,min:1,desc:'Blokken van acht minuten met twee minuten rust. Zwaar maar vol te houden: zo hard dat je het laatste blok even goed rijdt als het eerste.'},
  test20:{name:'FTP-test (20 minuten)',hard:true,min:1,desc:'Na een opwarming twintig minuten zo hard als je gelijkmatig volhoudt. Het doel is een richtlijn, de trainer houdt het vermogen niet vast. Eén keer naast de ramptest: daaruit volgt je eigen verhouding.'}
});
/* de tests als laatste in de bibliotheek */
{const t=TYPES.test20;delete TYPES.test20;TYPES.test20=t}
{const t=TYPES.ramptest;delete TYPES.ramptest;TYPES.ramptest=t}
const isFtpTest=t=>t==='ramptest'||t==='test20';
/* soort per training, voor de filter in de bibliotheek */
const CATS=[['','Alle'],['rustig','Rustig en lang'],['drempel','Tempo en drempel'],['vo2','Kort en hard'],['klim','Klimmen'],['kracht','Kracht en sprint'],['techniek','Cadans'],['test','Test']];
const CAT_OF={herstel:'rustig',duur:'rustig',openers:'rustig',duurklim:'rustig',duurtempo:'rustig',duurheuvels:'rustig',duurkracht:'rustig',
  souplesse:'techniek',cadansladder:'techniek',tempocad:'techniek',spinups:'techniek',cadansgolf:'techniek',herstelcad:'rustig',herstelgolf:'rustig',herstelspin:'rustig',duurgolf:'rustig',duuropbouw:'rustig',duursprint:'rustig',duurss:'rustig',openers30:'rustig',scherp:'rustig',prikkels:'rustig',
  sslang:'drempel',ssgolf:'drempel',drempelkort:'drempel',tijdrit:'drempel',tempolang:'drempel',tempogolf:'drempel',vo2oplopend:'vo2',minuut:'vo2',tabata:'vo2',koersdag:'vo2',demarrage:'vo2',heuveltrein:'klim',klimtrappen:'klim',tweecols:'klim',heuvelstart:'kracht',zwaarlicht:'kracht',langesprint:'kracht',sprintblok:'kracht',kasseitempo:'kracht',
  tempo:'drempel',sweetspot:'drempel',drempel:'drempel',overunder:'drempel',drempelramp:'drempel',ssaanzet:'drempel',oplopend:'drempel',
  vo2:'vo2',anaeroob:'vo2',i3015:'vo2',i4020:'vo2',piramide:'vo2',microbursts:'vo2',groepsrit:'vo2',fartlek:'vo2',
  klim:'klim',heuvels:'klim',colsim:'klim',staand:'klim',topsprint:'klim',muurtjes:'klim',
  kracht:'kracht',sprint:'kracht',kasseien:'kracht',krachtsprint:'kracht',vier8:'vo2',ramptest:'test',test20:'test'};
/* Pakketten: trainingen met hetzelfde doel, waartussen je wisselt met één knop. De eerste die in een pakket staat, bepaalt bij welk pakket een training hoort. */
const PACKS=[['herstel','herstelcad','herstelgolf','herstelspin'],['duur','duurgolf','duuropbouw','duurkracht'],['duurtempo','duurklim','duurheuvels','duursprint','duurss'],
  ['souplesse','cadansladder','spinups','cadansgolf'],['openers','openers30','scherp','prikkels'],['tempo','tempocad','tempolang','tempogolf'],['sweetspot','ssaanzet','oplopend','sslang','ssgolf'],
  ['drempel','overunder','drempelramp','drempelkort','tijdrit'],['vo2','i3015','piramide','vo2oplopend','vier8'],['anaeroob','i4020','microbursts','minuut','tabata'],['heuvels','topsprint','muurtjes','heuveltrein'],
  ['klim','staand','colsim','klimtrappen','tweecols'],['kracht','krachtsprint','heuvelstart','zwaarlicht'],['sprint','langesprint','sprintblok','krachtsprint'],['kasseien','kasseitempo','muurtjes','overunder'],['fartlek','groepsrit','koersdag','demarrage']];
const S=(d,a,b,label,kind,cad)=>({d:Math.max(1,Math.round(d)),a,b:b==null?a:b,label,kind,cad:cad||0});
const pick=(arr,L)=>arr[clamp(L,0,2)];
/* Opbouw per soort training: elke trede iets meer of langer werk. [herhalingen, minuten aan, minuten rust, deel van FTP, cadans] */
const LADDER={
  sweetspot:{label:'Sweet spot',steps:[[3,8,4,.88],[3,10,4,.88],[3,12,4,.89],[2,18,5,.89],[3,15,4,.9],[2,20,5,.9],[3,18,4,.9],[2,25,5,.91],[3,20,5,.91],[2,30,5,.92]]},
  drempel:{label:'Drempel',steps:[[3,6,4,.95],[4,6,3,.96],[3,8,4,.96],[4,8,4,.97],[3,10,5,.98],[4,10,5,.98],[3,12,5,.99],[2,15,5,1],[3,15,5,1],[2,20,5,1]]},
  tempo:{label:'Tempo',steps:[[2,15,5,.78],[3,15,5,.8],[2,20,5,.8],[3,20,5,.82],[2,30,5,.82],[3,25,5,.83],[2,40,5,.84],[3,30,5,.85]]},
  vo2:{label:'VO2max',steps:[[5,2,2,1.15],[4,3,3,1.12],[6,2,2,1.17],[5,3,3,1.13],[6,3,3,1.14],[4,4,4,1.12],[5,4,4,1.13],[6,4,3,1.13],[5,5,4,1.12],[6,5,4,1.12]],pOff:.5},
  heuvels:{label:'Klim',steps:[[5,1.5,3,1.15],[6,1.5,3,1.17],[6,2,3,1.15],[8,2,3,1.15],[8,2,2.5,1.18],[10,2,2.5,1.18],[8,3,3,1.12],[10,3,3,1.12]],pOff:.5},
  klim:{label:'Klim',steps:[[3,8,4,.85,65],[3,10,4,.86,65],[4,10,4,.87,65],[3,12,4,.88,62],[4,12,4,.89,62],[3,15,5,.9,60],[4,15,5,.9,60],[3,20,5,.9,60]]},
  kracht:{label:'Kracht',steps:[[4,5,3,.8,55],[5,5,3,.82,55],[4,8,4,.82,55],[5,8,4,.84,55],[4,10,4,.85,52],[5,10,4,.86,52],[4,12,4,.88,50],[3,15,5,.88,50]]},
  souplesse:{label:'Souplesse',steps:[[6,1,2,.65,105],[8,1,2,.65,110],[6,2,2,.66,110],[8,2,2,.67,110],[6,3,3,.68,115],[8,3,2,.68,115]],pOff:.6},
  anaeroob:{steps:[[1,8],[1,10],[2,8],[2,10],[3,8],[2,12],[3,10],[3,12]]},
  sprint:{steps:[[4],[5],[6],[7],[8],[9],[10]]},
  /* vier keer acht minuten, de vorm met de meeste winst bij recreatieve wielrenners (Seiler 2013). De percentages zijn een eigen keuze, de ladder bouwt daar naartoe op */
  vier8:{label:'Blok',steps:[[3,8,2,1],[3,8,2,1.02],[4,8,2,1],[4,8,2,1.02],[4,8,2,1.04],[4,8,2,1.06],[4,8,2,1.08]]}
};
/* nieuwe soorten: elke trede is een lijst getallen; work = minuten werk inclusief rust, make = de blokken */
const RP=(n,f)=>{const o=[];for(let k=0;k<n;k++)o.push(...f(k));return o};
const restB=(i,n,sec,lab)=>i<n-1?[S(sec,.55,null,lab||'Herstel','rest')]:[];
const pyrP=m=>m<=1?1.2:m<=2?1.15:m<=3?1.12:m<=4?1.1:1.08;
Object.assign(LADDER,{
  overunder:{label:'Over-under',steps:[[2,2,1.05],[3,2,1.05],[2,3,1.05],[3,3,1.05],[2,4,1.06],[3,4,1.06],[2,5,1.08],[3,5,1.08]],
    work:s=>s[0]*s[1]*3+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]*3}`,
    make:([n,k,o])=>RP(n,i=>[...RP(k,()=>[S(120,.95,null,`Blok ${i+1}: onder`,'work'),S(60,o,null,`Blok ${i+1}: over`,'work')]),...restB(i,n,240)])},
  drempelramp:{label:'Drempel',steps:[[3,8],[3,10],[4,10],[3,12],[4,12],[3,15],[4,15]],
    work:s=>s[0]*s[1]+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,.92,1.04,`Blok ${i+1} van ${n}`,'work'),...restB(i,n,300)])},
  ssaanzet:{label:'Sweet spot',steps:[[2,8],[3,8],[2,12],[3,12],[2,16],[3,16],[2,20],[3,20]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(Math.round(m/4),()=>[S(15,1.3,null,'Aanzetten','work'),S(225,.9,null,`Sweet spot ${i+1} van ${n}`,'work')]),...restB(i,n,240)])},
  oplopend:{label:'Tempo',steps:[[5],[6],[8],[10],[12],[15]],
    work:s=>s[0]*4,tag:s=>`4×${s[0]}`,
    make:([m])=>[.7,.8,.88,.95].map((p,i)=>S(m*60,p,null,`Trap ${i+1} van 4`,'work'))},
  tempocad:{label:'Tempo',steps:[[2,10],[3,10],[2,15],[3,15],[2,20],[3,20],[2,30]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,.8,null,`Tempo ${i+1} van ${n}`,'work',100),...restB(i,n,240)])},
  i3015:{label:'VO2max',steps:[[2,9],[3,9],[3,11],[3,13],[4,11],[4,13]],
    work:s=>s[0]*s[1]*.75+(s[0]-1)*3,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,N])=>RP(n,i=>[...RP(N,j=>[S(30,1.25,null,`Hard ${j+1} van ${N}`,'work'),S(15,.5,null,'Rustig','rest')]),...restB(i,n,180,'Serierust')])},
  i4020:{label:'VO2max',steps:[[2,6],[2,8],[3,6],[3,8],[2,12],[3,10],[3,12]],
    work:s=>s[0]*s[1]+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,N])=>RP(n,i=>[...RP(N,j=>[S(40,1.2,null,`Hard ${j+1} van ${N}`,'work'),S(20,.5,null,'Rustig','rest')]),...restB(i,n,300,'Serierust')])},
  piramide:{label:'VO2max',steps:[[1,2,3,2,1],[1,2,3,4,3,2,1],[2,3,4,3,2],[1,2,3,4,5,4,3,2,1],[2,3,4,5,4,3,2]],
    work:s=>s.reduce((a,m)=>a+2*m,0)-s[s.length-1],tag:s=>s.join('-'),shrink:s=>s.length>3?s.slice(1,-1):s,
    make:s=>RP(s.length,i=>[S(s[i]*60,pyrP(s[i]),null,`${s[i]} min (${i+1} van ${s.length})`,'work'),...(i<s.length-1?[S(s[i]*60,.55,null,'Herstel','rest')]:[])])},
  microbursts:{label:'Microbursts',steps:[[2,6],[2,8],[2,10],[3,8],[3,10]],
    work:s=>s[0]*s[1]+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(m*2,j=>[S(15,1.4,null,`Burst ${j+1} van ${m*2}`,'work'),S(15,.5,null,'Rustig','rest')]),...restB(i,n,300,'Serierust')])},
  groepsrit:{label:'Groepsrit',steps:[[2,12],[2,15],[3,12],[2,21],[3,15],[3,21]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(Math.round(m/3),()=>[S(20,1.45,null,'Gat dichtrijden','work'),S(160,.8,null,`Groep ${i+1} van ${n}`,'work')]),...restB(i,n,240)])},
  colsim:{label:'Klim',steps:[[20,.84],[25,.85],[30,.86],[35,.86],[40,.87],[45,.87],[50,.88],[60,.88]],
    work:s=>s[0],tag:s=>`${s[0]} min`,shrink:s=>[s[0]-5,s[1]],
    make:([m,p])=>[S((m-3)*60,p-.02,p+.01,'Klim','work',70),S(180,.95,null,'Laatste kilometer','work',65)]},
  staand:{label:'Klim',steps:[[3,6],[3,8],[4,8],[3,10],[4,10],[3,14]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(m,j=>[S(60,j%2?.95:.9,null,j%2?`Staand (klim ${i+1})`:`Zittend (klim ${i+1})`,'work',j%2?60:70)]),...restB(i,n,240)])},
  topsprint:{label:'Klim',steps:[[3,3],[4,3],[4,4],[5,4],[6,4],[6,5]],
    work:s=>s[0]*(s[1]+1/3)+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,.98,null,`Klim ${i+1} van ${n}`,'work'),S(20,1.5,null,'Sprint over de top','work'),...restB(i,n,240)])},
  muurtjes:{label:'Muurtjes',steps:[[5,45],[6,45],[6,60],[8,45],[8,60],[10,60],[12,60]],
    work:s=>s[0]*s[1]/60+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]} s`,
    make:([n,sec])=>RP(n,i=>[S(sec,1.35,null,`Muur ${i+1} van ${n}`,'work',65),...(i<n-1?[S(240,.75,null,'Tussenstuk op tempo','steady')]:[])])},
  kasseien:{label:'Kasseien',steps:[[4,2],[5,2],[4,3],[6,2],[5,3],[6,3],[8,3]],
    work:s=>s[0]*s[1]+(s[0]-1)*3,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,1,null,`Kasseistrook ${i+1} van ${n}`,'work',75),...(i<n-1?[S(180,.7,null,'Asfalt','steady')]:[])])},
  krachtsprint:{label:'Kracht',steps:[[5],[6],[7],[8],[9],[10]],
    work:s=>s[0]*3,tag:s=>`${s[0]}×10 s`,
    make:([n])=>RP(n,i=>[S(10,1.9,null,`Krachtsprint ${i+1} van ${n}`,'work',50),S(170,.55,null,'Herstel','rest')])},
  sslang:{label:'Sweet spot',steps:[[20,.88],[25,.88],[30,.89],[35,.89],[40,.9],[45,.9],[50,.91],[60,.91]],
    work:s=>s[0],tag:s=>`${s[0]} min`,shrink:s=>[s[0]-5,s[1]],
    make:([m,p])=>[S(m*60,p,null,'Sweet spot','work')]},
  ssgolf:{label:'Sweet spot',steps:[[2,9],[3,9],[2,12],[3,12],[2,15],[3,15],[2,21]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(Math.round(m/3),j=>[S(180,j%2?.95:.85,null,`Golf ${i+1} van ${n}`,'work')]),...restB(i,n,240)])},
  drempelkort:{label:'Drempel',steps:[[4,4],[5,4],[6,4],[5,5],[6,5],[7,5],[6,6],[8,5]],
    work:s=>s[0]*s[1]+(s[0]-1)*2,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,1,null,`Blok ${i+1} van ${n}`,'work'),...restB(i,n,120)])},
  tijdrit:{label:'Drempel',steps:[[12],[15],[20],[25],[30],[35],[40]],
    work:s=>s[0],tag:s=>`${s[0]} min`,shrink:s=>[s[0]-3],
    make:([m])=>[S(m*60,.96,null,'Tijdrit','work')]},
  tempolang:{label:'Tempo',steps:[[25],[30],[40],[50],[60],[75],[90]],
    work:s=>s[0],tag:s=>`${s[0]} min`,shrink:s=>[s[0]-5],
    make:([m])=>[S(m*60,.8,null,'Tempo','work')]},
  tempogolf:{label:'Tempo',steps:[[2,12],[3,12],[2,18],[3,18],[2,24],[3,24]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(Math.round(m/3),()=>[S(20,1.1,null,'Versnellen','work'),S(160,.8,null,`Tempo ${i+1} van ${n}`,'work')]),...restB(i,n,240)])},
  vo2oplopend:{label:'VO2max',steps:[[3,3],[4,3],[5,3],[4,4],[5,4],[6,4]],
    work:s=>s[0]*s[1]*2-s[1],tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,1.05,1.2,`Interval ${i+1} van ${n}`,'work'),...restB(i,n,m*60)])},
  minuut:{label:'VO2max',steps:[[6],[8],[10],[12],[14],[16]],
    work:s=>s[0]*2-1,tag:s=>`${s[0]}×1`,
    make:([n])=>RP(n,i=>[S(60,1.3,null,`Hard ${i+1} van ${n}`,'work'),...(i<n-1?[S(60,.5,null,'Rustig','rest')]:[])])},
  tabata:{label:'VO2max',steps:[[2,8],[2,10],[3,8],[3,10],[4,8],[4,10]],
    work:s=>s[0]*s[1]*.5+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,N])=>RP(n,i=>[...RP(N,j=>[S(20,1.5,null,`Voluit ${j+1} van ${N}`,'work'),S(10,.4,null,'Rustig','rest')]),...restB(i,n,300,'Serierust')])},
  heuveltrein:{label:'Klim',steps:[[2,4],[3,4],[2,6],[3,5],[3,6],[4,6]],
    work:s=>s[0]*s[1]*2+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,k])=>RP(n,i=>[...RP(k,j=>[S(60,1.2,null,`Klimmetje ${j+1} van ${k}`,'work',70),S(60,.7,null,'Tussenstuk','rest')]),...restB(i,n,300,'Serierust')])},
  klimtrappen:{label:'Klim',steps:[[2,9],[3,9],[2,12],[3,12],[2,15],[3,15]],
    work:s=>s[0]*s[1]+(s[0]-1)*5,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...[.82,.88,.94].map((p,j)=>S(m*20,p,null,`Klim ${i+1}: trap ${j+1} van 3`,'work',70)),...restB(i,n,300)])},
  tweecols:{label:'Klim',steps:[[12],[15],[18],[20],[25],[30]],
    work:s=>s[0]*2+8,tag:s=>`2×${s[0]}`,shrink:s=>[s[0]-3],
    make:([m])=>[S(m*60,.86,null,'Eerste col','work',70),S(480,.56,null,'Tussen de cols','rest'),S(m*60,.88,null,'Tweede col','work',70)]},
  heuvelstart:{label:'Kracht',steps:[[5],[6],[8],[10],[12]],
    work:s=>s[0]*4-3.5,tag:s=>`${s[0]}×30 s`,
    make:([n])=>RP(n,i=>[S(30,1.25,null,`Aanzetten ${i+1} van ${n}`,'work',50),...restB(i,n,210)])},
  zwaarlicht:{label:'Kracht',steps:[[2,8],[3,8],[2,12],[3,12],[2,16],[3,16]],
    work:s=>s[0]*s[1]+(s[0]-1)*4,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[...RP(Math.round(m/2),j=>[S(120,.82,null,j%2?`Licht (blok ${i+1})`:`Zwaar (blok ${i+1})`,'work',j%2?95:55)]),...restB(i,n,240)])},
  langesprint:{label:'Sprint',steps:[[3],[4],[5],[6],[7],[8]],
    work:s=>s[0]*5-4.5,tag:s=>`${s[0]}×30 s`,
    make:([n])=>RP(n,i=>[S(30,1.6,null,`Sprint ${i+1} van ${n}`,'work'),...restB(i,n,270)])},
  sprintblok:{label:'Sprint',steps:[[3],[4],[5],[6],[7],[8]],
    work:s=>s[0]*8.25-4,tag:s=>`${s[0]}×4`,
    make:([n])=>RP(n,i=>[S(240,.9,null,`Tempo ${i+1} van ${n}`,'work'),S(15,1.7,null,'Sprint','work'),...restB(i,n,240)])},
  kasseitempo:{label:'Kasseien',steps:[[3,4],[4,4],[5,4],[4,5],[5,5],[6,5]],
    work:s=>s[0]*s[1]+(s[0]-1)*2,tag:s=>`${s[0]}×${s[1]}`,
    make:([n,m])=>RP(n,i=>[S(m*60,.92,null,`Blok ${i+1} van ${n}`,'work',70),...restB(i,n,120)])},
  koersdag:{label:'Koers',steps:[[1],[2],[3],[4]],
    work:s=>s[0]*10+(s[0]-1)*5,tag:s=>`${s[0]}×10`,shrink:s=>[s[0]-1],
    make:([n])=>RP(n,i=>[S(120,.85,null,`Serie ${i+1}: meerijden`,'work'),S(30,1.4,null,'Versnellen','work'),S(150,.9,null,`Serie ${i+1}: doorrijden`,'work'),S(20,1.6,null,'Gat dichten','work'),S(100,.75,null,`Serie ${i+1}: in het wiel`,'work'),S(30,1.3,null,'Aanval','work'),S(150,.88,null,`Serie ${i+1}: doorrijden`,'work'),...restB(i,n,300)])},
  demarrage:{label:'Koers',steps:[[3],[4],[5],[6],[7],[8]],
    work:s=>s[0]*6.5-3,tag:s=>`${s[0]}×`,
    make:([n])=>RP(n,i=>[S(30,1.5,null,`Aanval ${i+1} van ${n}`,'work'),S(180,.92,null,'Voorsprong houden','work'),...restB(i,n,180)])}
});
/* een rustig stuk dat niet vlak is: om de paar minuten iets anders, zodat er geen lang eentonig stuk ontstaat */
/* rustig rijden tussen het werk: één stuk per kwartier, om en om iets lichter en iets steviger; geen blokjes van een paar minuten */
function easyRun(min,label){
  const sec=Math.round(min*60),n=Math.max(1,Math.ceil(sec/900-.01)),o=[];
  for(let i=0,l=sec;i<n;i++){const d=i===n-1?l:Math.round(sec/n);o.push(S(d,i%2?.66:.62,null,label||'Duurtempo','steady'));l-=d}
  return o;
}
/* Heb je meer tijd dan de blokken vragen, dan is de rit geen korte rit met duurtempo erachter: het eerste deel wordt langer,
   de blokken komen verder uit elkaar en er komt een tweede soort werk bij, passend bij de training. */
const EX={tempo:{p:.82,lab:'Tempo',tag:'tempo',max:25},ss:{p:.88,lab:'Sweet spot',tag:'sweet spot',max:20},klim:{p:.8,lab:'Klim op lage cadans',tag:'klimblok',cad:65,max:25},
  kracht:{p:.78,lab:'Zware versnelling',tag:'kracht',cad:58,max:20},cad:{p:.76,lab:'Tempo op hoge cadans',tag:'hoge cadans',cad:100,max:20}};
/* per training een eigen tweede soort werk, zodat lange ritten binnen een pakket niet op elkaar lijken */
const EXTRA_OF={tempo:'ss',tempocad:'klim',tempolang:'kracht',tempogolf:'ss',sweetspot:'tempo',ssaanzet:'klim',oplopend:'cad',sslang:'kracht',ssgolf:'tempo',
  drempel:'ss',overunder:'tempo',drempelramp:'klim',drempelkort:'ss',tijdrit:'cad',vo2:'ss',i3015:'tempo',piramide:'ss',vo2oplopend:'klim',
  anaeroob:'tempo',i4020:'ss',microbursts:'cad',minuut:'klim',tabata:'tempo',heuvels:'klim',topsprint:'tempo',muurtjes:'kracht',heuveltrein:'ss',
  klim:'tempo',staand:'klim',colsim:'ss',klimtrappen:'cad',tweecols:'tempo',kracht:'tempo',krachtsprint:'kracht',heuvelstart:'klim',zwaarlicht:'ss',
  sprint:'kracht',langesprint:'tempo',sprintblok:'ss',kasseien:'tempo',kasseitempo:'ss',groepsrit:'tempo',koersdag:'ss',demarrage:'cad',vier8:'tempo'};
/* bij deze trainingen komt het extra werk eerst: het hoofdblok rij je dan op vermoeide benen */
const EXTRA_FIRST=new Set(['tempolang','sslang','oplopend','tijdrit','drempelramp','klimtrappen','colsim','tempogolf','ssgolf','zwaarlicht','kasseitempo']);
function shapeLong(type,main,left){
  if(left<=.05)return {segs:main,tag:''};
  const ex=TYPES[type].hard&&EX[EXTRA_OF[type]||'tempo'],pre=ex&&left>=12?Math.min(left*.25,8):left<=5?left:Math.min(left*.3,10);
  let l=left-pre;
  /* net te weinig voor een extra blok: rustiger beginnen, want achteraan plakken doen we niet */
  if(ex&&l<12)return {segs:[...easyRun(left,'Inrijden'),...main],tag:''};
  /* hard werk: één of twee extra blokken (de tweede van een andere soort); rustig werk: alleen variatie */
  const nB=!ex?0:l>=60?2:1,B=nB?clamp(Math.round(l*.4/nB),5,ex.max):0,ex2=ex===EX.ss?EX.tempo:ex===EX.kracht?EX.cad:ex===EX.cad?EX.tempo:EX.ss;
  l-=nB*B;
  /* de blokken uit elkaar: bij een rustpauze in het midden komt een deel van de rustige tijd */
  const rests=main.map((x,i)=>x.kind==='rest'&&x.d>=60?i:-1).filter(i=>i>=0),mid=rests[Math.floor((rests.length-1)/2)];
  const inMain=rests.length&&l>=8?l*(nB?.5:.6):0;l-=inMain;
  const body=[];main.forEach((x,i)=>{body.push(x);if(i===mid&&inMain)body.push(...easyRun(inMain))});
  const out=[...easyRun(pre,'Inrijden')],gap=nB?l/nB:0,block=(e,k)=>S(B*60,e.p,null,e.lab,'work',e.cad||0);
  if(!nB){out.push(...body);if(l>.05)out.push(...easyRun(l))}
  else if(EXTRA_FIRST.has(type)){out.push(block(ex));out.push(...easyRun(gap));out.push(...body);if(nB>1){out.push(...easyRun(gap));out.push(block(ex2))}}
  else{out.push(...body);out.push(...easyRun(gap));out.push(block(ex));if(nB>1){out.push(...easyRun(gap));out.push(block(ex2))}}
  return {segs:out,tag:nB?` + ${ex.tag}`:''};
}
/* rustige trainingen die de hele tijd vullen: niet zwaarder per trede. Krijgen de duur tussen warming-up en cooling-down (min) */
const FILL={
  duurgolf:min=>{const o=[];for(let i=0,l=min;l>0;i++){const d=Math.min(5,l);o.push(S(d*60,i%2?.66:.58,null,'Duurtempo','steady'));l-=d}return o},
  duuropbouw:min=>[.56,.6,.64].flatMap((p,i)=>{const n=Math.max(1,Math.ceil(min/3/15-.01));return Array.from({length:n},(_,j)=>S(min/3/n*60,j%2?p:p+.025,null,`Deel ${i+1} van 3`,'steady'))}),
  herstelcad:min=>[S(min*60,.5,null,'Losrijden op hoge cadans','steady',95)],
  herstelgolf:min=>{const o=[];for(let i=0,l=min;l>0;i++){const d=Math.min(5,l);o.push(S(d*60,i%2?.55:.45,null,'Losrijden','steady'));l-=d}return o},
  herstelspin:min=>{const o=[];for(let l=min;l>0;){const d=Math.min(7,l);o.push(S(d*60,.5,null,'Losrijden','steady'));l-=d;if(l>=1){o.push(S(60,.5,null,'Hoge cadans','steady',110));l--}}return o},
  spinups:min=>{const o=[];for(let l=min;l>0;){const d=Math.min(4,l);o.push(S(d*60,.6,null,'Rustig doorrijden','steady'));l-=d;if(l>=1){o.push(S(30,.6,null,'Cadans omhoog','steady',105),S(30,.6,null,'Zo hoog als het soepel gaat','steady',120));l--}}return o},
  cadansgolf:min=>{const o=[];for(let i=0,l=min;l>0;i++){const d=Math.min(3,l);o.push(S(d*60,.62,null,i%2?'Hoge cadans':'Lage cadans','steady',i%2?100:70));l-=d}return o},
  openers30:min=>{const o=[];let l=min;for(let i=0;i<4&&l>=2;i++){o.push(S(30,1.2,null,`Prikkel ${i+1} van 4`,'work'),S(90,.55,null,'Herstel','rest'));l-=2}if(l>=1)o.push(...easyRun(l));return o},
  scherp:min=>{const o=[];let l=min;for(let i=0;i<3&&l>=6;i++){o.push(S(180,1,null,`Blok ${i+1} van 3`,'work'),S(180,.55,null,'Herstel','rest'));l-=6}if(l>=1)o.push(...easyRun(l));return o},
  prikkels:min=>{const o=[];let l=min;for(let i=0;i<6&&l>=3;i++){o.push(S(15,1.4,null,`Prikkel ${i+1} van 6`,'work'),S(165,.58,null,'Rustig','rest'));l-=3}if(l>=1)o.push(...easyRun(l));return o}
};
const ladderWork=(type,st)=>LADDER[type].work?LADDER[type].work(st):type==='anaeroob'?st[0]*st[1]+(st[0]-1)*5:type==='sprint'?st[0]*5:st[0]*st[1]+(st[0]-1)*st[2];
/* minuten die een trede nodig heeft, inclusief warming-up en cooling-down */
const ladderNeed=(type,lvl)=>{const st=LADDER[type].steps;return ladderWork(type,st[clamp(Math.round(lvl),1,st.length)-1])+15};
function ladderBuild(type,T,lvl){
  const Ld=LADDER[type],steps=Ld.steps;
  const wu=T>=60?10:T>=40?8:5,cd=T>=60?5:T>=40?4:3,room=T-wu-cd;
  let i=clamp(Math.round(lvl),1,steps.length)-1;
  while(i>0&&ladderWork(type,steps[i])>room)i--;
  const segs=[];let tag,used;
  if(Ld.make){
    let st=steps[i];
    for(let k=0;k<12&&ladderWork(type,st)>room;k++){const nx=Ld.shrink?Ld.shrink(st):st[0]>1?[st[0]-1,...st.slice(1)]:st;if(JSON.stringify(nx)===JSON.stringify(st)||ladderWork(type,nx)<=0)break;st=nx}
    segs.push(...Ld.make(st));used=ladderWork(type,st);tag=Ld.tag(st);
  }else if(type==='anaeroob'){
    let [sets,N]=steps[i];while(sets>1&&ladderWork(type,[sets,N])>room)sets--;while(N>4&&ladderWork(type,[sets,N])>room)N--;
    for(let s=0;s<sets;s++){
      for(let k=0;k<N;k++){segs.push(S(30,1.3,null,`Hard ${k+1} van ${N}`,'work'));segs.push(S(30,.5,null,'Rustig','rest'))}
      if(s<sets-1)segs.push(S(300,.55,null,'Serierust','rest'));
    }
    used=ladderWork(type,[sets,N]);tag=`${sets}×${N}`;
  }else if(type==='sprint'){
    let n=steps[i][0];while(n>1&&n*5>room)n--;
    for(let k=0;k<n;k++){segs.push(S(285,.65,null,'Duurtempo','steady'));segs.push(S(15,1.7,null,`Sprint ${k+1} van ${n}`,'work'))}
    used=n*5;tag=`${n}×15 s`;
  }else{
    let [reps,on,off,p,cad]=steps[i];while(reps>1&&ladderWork(type,[reps,on,off])>room)reps--;
    for(let k=0;k<reps;k++){
      segs.push(S(on*60,p,p,`${Ld.label} ${k+1} van ${reps}`,'work',cad));
      if(k<reps-1)segs.push(S(off*60,Ld.pOff||.55,null,'Herstel','rest'));
    }
    used=ladderWork(type,[reps,on,off]);tag=`${reps}×${nl(on)}`;
  }
  const shaped=shapeLong(type,segs,room-used);
  return {segs:[S(wu*60,.45,.75,'Warming-up','warmup'),...shaped.segs,S(cd*60,.6,.4,'Cooling-down','cooldown')],tag:tag+shaped.tag,lvl:i+1};
}
/* opt.b = blokduur in minuten, afgestemd op de klimmen van je evenement (lange rit met klimblokken of korte klimmen) */
function buildWorkout(type,T,L,lvl,opt){
  if(!TYPES[type])type='duur';
  T=clamp(Math.round(T),20,330);L=clamp(L|0,0,2);
  if(['duurklim','duurtempo','duurheuvels','duurkracht','duursprint','duurss'].includes(type)&&T<45)type='duur';
  const ob=opt&&opt.b>0?opt.b:0;
  const wu=T>=60?10:T>=40?8:5, cd=T>=60?5:T>=40?4:3;
  let segs=[],tag='';
  if(LADDER[type]){
    const n=LADDER[type].steps.length;
    ({segs,tag,lvl}=ladderBuild(type,T,lvl==null?Math.round(n*[.3,.5,.7][L]):lvl));
  }else if(FILL[type]){
    const light=/^herstel/.test(type),a=light?3:wu,z=light?2:cd;
    segs=[S(a*60,light?.4:.45,light?.5:.65,light?'Inrijden':'Warming-up','warmup'),...FILL[type](T-a-z),S(z*60,light?.5:.6,.4,light?'Uitrijden':'Cooling-down','cooldown')];
  }else if(type==='duursprint'){
    const room=T-10-5,n=Math.floor(room/20);
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(...easyRun(19.75));segs.push(S(15,1.6,null,`Sprint ${i+1} van ${n}`,'work'))}
    const left=room-n*20;if(left>=1)segs.push(...easyRun(left));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));tag=`${n}×15 s`;
  }else if(type==='duurss'){
    const room=T-10-5,B=pick([12,15,20],L),n=clamp(Math.floor(room/(B+15)),1,pick([2,3,3],L));
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    for(let i=0;i<n;i++){segs.push(...easyRun(15));segs.push(S(B*60,.88,null,`Sweet spot ${i+1} van ${n}`,'work'))}
    const left=room-n*(B+15);if(left>=1)segs.push(...easyRun(left));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));tag=`${n}×${B}`;
  }else if(type==='herstel'){
    segs=[S(180,.4,.52,'Inrijden','warmup'),S((T-5)*60,.52,.52,'Losrijden','steady'),S(120,.52,.4,'Uitrijden','cooldown')];
  }else if(type==='duur'){
    const hi=pick([.62,.64,.66],L),lo=.58;
    segs.push(S(300,.45,.65,'Warming-up','warmup'));
    const left=T-5-cd,n=Math.max(1,Math.ceil(left/15-.01));
    for(let i=0;i<n;i++)segs.push(S(left/n*60,i%2?hi:lo,null,'Duurtempo','steady'));
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='duurklim'){
    /* blokken zo lang als de klimmen van je evenement (10 tot 40 min), anders 10 min */
    const room=T-10-5,B=Math.min(ob?clamp(Math.round(ob/5)*5,10,40):10,Math.max(5,Math.floor((room-10)/5)*5)),n=clamp(Math.floor(room/(B+10)),1,B>=25?Math.max(1,L+1):L+2);
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    /* de blokken verdeeld over de hele rit, niet achter elkaar met een lange staart */
    const gap=(room-n*B)/(n+.25);
    for(let i=0;i<n;i++){segs.push(...easyRun(gap));segs.push(S(B*60,pick([.78,.80,.83],L)-(B>=25?.03:B>=15?.015:0),null,`Klimblok ${i+1} van ${n}`,'work',70))}
    segs.push(...easyRun(gap*.25));tag=`${n}×${B}`;
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='duurtempo'){
    const room=T-5-5,fin=Math.min(pick([15,20,25],L),Math.max(5,Math.floor(room/3)));
    segs.push(S(300,.45,.65,'Warming-up','warmup'));
    let left=room-fin,i=0;
    if(left>0)segs.push(...easyRun(left));
    segs.push(S(fin*60,pick([.78,.80,.82],L),null,'Tempofinale','work'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${fin} min`;
  }else if(type==='duurheuvels'){
    /* klimmetjes zo lang als de hellingen van je evenement (1 tot 5 min); hoe korter, hoe harder */
    const K=ob?clamp(Math.round(ob*2)*30,60,300):120,f=K<=60?.08:K<=90?.04:K>=240?-.06:K>=180?-.03:0;
    const room=T-10-5,n=clamp(Math.floor(room/15),1,pick([6,8,10],L));
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    const gap=(room-n*K/60)/(n+.25);
    for(let i=0;i<n;i++){segs.push(...easyRun(gap));segs.push(S(K,pick([1.05,1.1,1.15],L)+f,null,`Klim ${i+1} van ${n}`,'work',K<=90?70:0))}
    const left=gap*.25;
    if(left>=1)segs.push(S(left*60,.64,null,'Duurtempo','steady'));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${n}×${K%60?nl(K/60):K/60}`;
  }else if(type==='duurkracht'){
    const room=T-10-5,n=clamp(Math.floor(room/15),1,pick([3,4,5],L));
    segs.push(S(600,.45,.66,'Warming-up','warmup'));
    const gap=(room-n*8)/(n+.25);
    for(let i=0;i<n;i++){segs.push(...easyRun(gap));segs.push(S(480,.7,null,`Lage cadans ${i+1} van ${n}`,'steady',60))}
    segs.push(...easyRun(gap*.25));
    segs.push(S(300,.6,.4,'Cooling-down','cooldown'));
    tag=`${n}×8`;
  }else if(type==='cadansladder'){
    let room=T-wu-cd,k=0;
    segs.push(S(wu*60,.45,.65,'Warming-up','warmup'));
    while(room>=8&&k<pick([3,4,5],L)){k++;
      for(const c of [80,90,100,110,120])segs.push(S(60,.62,null,`${c} rpm (ladder ${k})`,'steady',c));
      segs.push(S(180,.6,null,'Eigen cadans','steady'));room-=8}
    if(room>=1)segs.push(...easyRun(room));
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='fartlek'){
    const P=[[60,1.1],[120,.6],[180,.95],[120,.6],[30,1.3],[90,.6],[120,1.05],[120,.6],[300,.88],[120,.6],[20,1.5],[100,.6]],m=pick([.97,1,1.03],L);
    let room=(T-wu-cd)*60,i=0;
    segs.push(S(wu*60,.45,.75,'Warming-up','warmup'));
    while(room>=60){const [d,p]=P[i%P.length],dd=Math.min(d,room),hard=p>.7;
      segs.push(S(dd,hard?Math.round(p*m*100)/100:p,null,hard?`Inspanning ${Math.floor(i/2)+1}`:'Rustig',hard?'work':'rest'));room-=dd;i++}
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='openers'){
    let room=T-wu-cd;
    segs.push(S(wu*60,.45,.7,'Warming-up','warmup'));
    for(let i=0;i<3&&room>=3;i++){segs.push(S(60,1.05,null,`Prikkel ${i+1} van 3`,'work'));segs.push(S(120,.55,null,'Herstel','rest'));room-=3}
    for(let i=0;i<2&&room>=3;i++){segs.push(S(15,1.5,null,`Versnelling ${i+1} van 2`,'work'));segs.push(S(165,.55,null,'Herstel','rest'));room-=3}
    if(room>=1)segs.push(...easyRun(room));
    segs.push(S(cd*60,.6,.4,'Cooling-down','cooldown'));
  }else if(type==='ramptest'){
    segs.push(S(300,.45,.5,'Warming-up','warmup'));
    for(let i=0;i<21;i++)segs.push(S(60,.5+.06*i,null,`Stap ${i+1}`,'work'));
    segs.push(S(300,.5,.4,'Cooling-down','cooldown'));
  }else if(type==='test20'){
    segs.push(S(600,.45,.7,'Warming-up','warmup'));
    for(let i=0;i<3;i++){segs.push(S(60,1.05,null,`Prikkel ${i+1} van 3`,'work'));segs.push(S(120,.55,null,'Herstel','rest'))}
    segs.push(S(300,.55,null,'Rustig','rest'));
    segs.push(S(1200,1,null,'Twintig minuten voluit','work'));
    segs.push(S(600,.5,.4,'Cooling-down','cooldown'));
  }
  const sec=segs.reduce((x,s)=>x+s.d,0);
  let p4=0;for(const s of segs){const m=(s.a+s.b)/2;p4+=s.d*m**4}
  const IF=(p4/sec)**.25;
  return {id:`${type}-${T}-${L}-${lvl||0}${ob?'-b'+ob:''}`,b:ob||undefined,type,L,lvl:LADDER[type]?lvl:null,lvlMax:LADDER[type]?LADDER[type].steps.length:null,name:TYPES[type].name+(tag?' '+tag:''),desc:TYPES[type].desc,segs,sec,minutes:Math.round(sec/60),IF,tss:Math.round(sec/3600*IF*IF*100)};
}
