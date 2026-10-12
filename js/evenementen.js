'use strict';
/* ================= evenementen =================
   Dertig grote toertochten en cyclo's in Europa. Afstanden en hoogtemeters zijn richtwaarden: de route verschilt
   per jaar iets. Per helling: naam, lengte in km, gemiddeld en steilste stijgingspercentage.
   v = afstanden (km, hoogtemeters, c = welke hellingen in die afstand zitten, als indexen in k; herhalen mag).
   groep = waar het in de keuzelijst staat; stijl = vast soort schema als er geen hellingen bekend zijn of als
   de hellingen alleen het beeld vertekenen; ruw = kasseien of grind. */
const HL=(n,km,pct,max)=>({naam:n,lengte_km:km,gemiddeld_pct:pct,max_pct:max||0});
const LIMB=[HL('Camerig',4.0,3.5,6),HL('Gulperberg',0.5,8.1,13),HL('Kruisberg',0.8,6.2,10),HL('Eyserbosweg',1.1,7.3,17),HL('Fromberg',1.6,4.0,7),HL('Keutenberg',1.2,6.4,22),HL('Bemelerberg',0.9,4.5,7),HL('Cauberg',1.2,5.8,12)];
const EVLIST=[
  /* ---------- klassiekers en heuvels ---------- */
  {id:'amstel',naam:'Amstel Gold Race Toerversie',land:'NL',maand:'half april, de zaterdag voor de profkoers',groep:'heuvels',
    tekst:'Ruim dertig korte, steile hellingen in Zuid-Limburg, de meeste korter dan twee kilometer. Steeds opnieuw vol aanzetten en daarna herstellen, op smalle wegen met veel bochten.',
    k:LIMB,v:[{km:240,hm:2700},{km:200,hm:2300},{km:150,hm:1700},{km:100,hm:1100}]},
  {id:'limburg',naam:'Limburgs Mooiste',land:'NL',maand:'eind mei',groep:'heuvels',
    tekst:'Heuvelachtige tocht door Zuid-Limburg en de grensstreek met veel korte hellingen. Lijkt op de Amstel, maar met wat meer vlakke stukken.',
    k:LIMB.slice(0,6),v:[{km:215,hm:2300},{km:150,hm:1600},{km:100,hm:1000}]},
  {id:'rvv',naam:'Ronde van Vlaanderen Cyclo',land:'BE',maand:'begin april, de zaterdag voor de koers',groep:'heuvels',ruw:'kassei',
    tekst:'Kasseien en korte, steile hellingen in de Vlaamse Ardennen, zoals de Oude Kwaremont, Paterberg en Koppenberg. Kracht zetten op de kasseien en steeds opnieuw vol aanzetten.',
    k:[HL('Oude Kwaremont',2.2,4.2,11.6),HL('Paterberg',0.36,12.9,20.3),HL('Koppenberg',0.6,11.6,22),HL('Taaienberg',0.53,6.6,15.8),HL('Kanarieberg',1.0,7.7,14),HL('Molenberg',0.46,7.0,14.2),HL('Berendries',0.94,7.0,12.3),HL('Valkenberg',0.54,8.1,12.8),HL('Eikenberg',1.3,6.2,11),HL('Wolvenberg',0.67,6.8,17.3)],
    v:[{km:247,hm:2000},{km:163,hm:1900},{km:133,hm:1600},{km:79,hm:900,c:[0,1,2,3]}]},
  {id:'gw',naam:'Gent-Wevelgem Cyclo',land:'BE',maand:'eind maart',groep:'heuvels',ruw:'kassei',
    tekst:'Grotendeels vlak door de Westhoek, met wind, een paar grindstroken en de korte, steile Heuvelland-hellingen. De Kemmelberg heeft kasseien en stukken boven 20%.',
    k:[HL('Kemmelberg',0.7,10.4,21.1),HL('Monteberg',1.3,7.1,12),HL('Baneberg',0.9,6.0,10)],
    v:[{km:220,hm:1500},{km:145,hm:1100},{km:105,hm:800},{km:60,hm:300,c:[]}]},
  {id:'lbl',naam:'Liège-Bastogne-Liège Challenge',land:'BE',maand:'eind april, de zaterdag voor de koers',groep:'heuvels',
    tekst:'Lange Ardennenklassieker met veel hellingen van één tot vier kilometer, vaak steiler dan 8%. Meer hoogtemeters dan je in België verwacht.',
    k:[HL('Côte de Wanne',2.7,7.3,12),HL('Côte de Stockeu',1.0,12.5,20),HL('Côte de la Haute-Levée',3.6,5.6,9),HL('Col du Rosier',4.4,5.9,9),HL('La Redoute',1.6,9.4,17),HL('Côte des Forges',1.3,7.8,11),HL('Roche-aux-Faucons',1.3,11.0,16)],
    v:[{km:250,hm:4400},{km:160,hm:2650,c:[2,3,4,5,6]},{km:80,hm:1250,c:[5,6]}]},
  {id:'eroica',naam:"L'Eroica",land:'IT',maand:'begin oktober',groep:'heuvels',ruw:'grind',stijl:'heuvels',
    tekst:'Op een klassieke stalen fiets over de witte grindwegen van Toscane. Veel korte, steile hellingen op grind: kracht en een rustige trapbeweging tellen meer dan topvermogen.',
    k:[],v:[{km:209,hm:3800},{km:135,hm:2300},{km:81,hm:1300}]},
  {id:'strade',naam:'Gran Fondo Strade Bianche',land:'IT',maand:'begin maart',groep:'heuvels',ruw:'grind',stijl:'heuvels',
    tekst:'Rond Siena, met ruim 40 km grindwegen in tien sectoren en de steile finish door de Via Santa Caterina naar de Piazza del Campo.',
    k:[HL('Colle Pinzuto',2.4,6.0,15),HL('Le Tolfe',1.1,9.7,18),HL('Via Santa Caterina',0.5,9.0,16)],
    v:[{km:140,hm:2000},{km:87,hm:1350,c:[2]}]},
  {id:'fred',naam:'Fred Whitton Challenge',land:'UK',maand:'half mei',groep:'heuvels',
    tekst:'Rondje door het Lake District over korte, extreem steile passen. Hardknott (tot 30%) en Wrynose komen pas na 150 km.',
    k:[HL('Kirkstone (The Struggle)',4.8,6.0,20),HL('Honister',2.3,10.0,25),HL('Newlands',1.8,9.0,20),HL('Whinlatter',3.3,5.0,15),HL('Hardknott',2.2,13.0,30),HL('Wrynose',2.5,9.0,25)],
    v:[{km:180,hm:3700}]},
  {id:'novecolli',naam:'Granfondo Nove Colli',land:'IT',maand:'eind mei',groep:'heuvels',
    tekst:'Negen heuvels in de Romagna, de meeste drie tot zeven kilometer lang. De Barbotto halverwege is met stukken tot 18% de zwaarste.',
    k:[HL('Polenta',3.0,5.5,9),HL('Ciola',4.6,5.6,10),HL('Barbotto',5.0,7.5,18),HL('Perticara',7.0,5.0,10),HL('Passo delle Siepi',5.0,6.0,12)],
    v:[{km:200,hm:3840},{km:130,hm:1900,c:[0,1,2]}]},
  {id:'lombardia',naam:'Gran Fondo Il Lombardia',land:'IT',maand:'begin oktober',groep:'heuvels',stijl:'middel',
    tekst:'Herfstklassieker in de heuvels rond Bergamo, met klimmen van een kwartier tot een half uur. De route wisselt per jaar.',
    k:[],v:[{km:110,hm:1700}]},
  /* ---------- bergen ---------- */
  {id:'marmotte',naam:'Marmotte Granfondo Alpes',land:'FR',maand:'eind juni of begin juli',groep:'bergen',
    tekst:"Vier lange cols: Glandon, Télégraphe, Galibier en tot slot de 21 bochten van Alpe d'Huez. Uren klimmen op een gelijkmatig vermogen; wie te hard begint, betaalt op de Alpe.",
    k:[HL('Col du Glandon',24,4.6,11),HL('Col du Télégraphe',11.8,7.1,10),HL('Col du Galibier',18.1,6.9,10),HL("Alpe d'Huez",13.8,8.1,11.5)],
    v:[{km:177,hm:5000}]},
  {id:'etape',naam:"L'Étape du Tour",land:'FR',maand:'juli',groep:'bergen',stijl:'bergen',
    tekst:'Een bergetappe van de Tour de France op afgesloten wegen. De route wisselt elk jaar; die van 2027 wordt op 22 oktober 2026 bekendgemaakt. Tot dan rekent de coach met een gemiddelde bergetappe.',
    k:[],v:[{km:165,hm:4000}]},
  {id:'alpedhuzes',naam:"Alpe d'HuZes",land:'FR',maand:'begin juni',groep:'bergen',
    tekst:"Tot zes keer Alpe d'Huez op één dag, voor KWF. Elke beklimming is 13,8 km met gemiddeld 8%, met de afdaling ertussen.",
    k:[HL("Alpe d'Huez",13.8,8.1,11.5)],
    v:[{km:166,hm:6600,c:[0,0,0,0,0,0],naam:'6 keer'},{km:110,hm:4400,c:[0,0,0,0],naam:'4 keer'},{km:55,hm:2200,c:[0,0],naam:'2 keer'},{km:28,hm:1100,c:[0],naam:'1 keer'}]},
  {id:'ventoux',naam:'Cinglés du Mont-Ventoux',land:'FR',maand:'zelf te kiezen, het hele seizoen',groep:'bergen',
    tekst:'De Mont Ventoux op één dag van alle drie de kanten: Bédoin, Malaucène en Sault. Elke klim duurt lang, met wind en hitte op de kale top.',
    k:[HL('Mont Ventoux vanuit Bédoin',21.5,7.5,12),HL('Mont Ventoux vanuit Malaucène',21.2,7.2,12),HL('Mont Ventoux vanuit Sault',25.7,4.7,10)],
    v:[{km:137,hm:4400,naam:'3 kanten'},{km:92,hm:3000,c:[0,1],naam:'2 kanten'},{km:45,hm:1600,c:[0],naam:'Vanuit Bédoin'}]},
  {id:'ballons',naam:'Les 3 Ballons',land:'FR',maand:'begin juni',groep:'bergen',
    tekst:'Door de Vogezen over onder meer de Ballon de Servance, de Grand Ballon en de Ballon d\'Alsace, met de finish boven op de Planche des Belles Filles (stukken boven 15%).',
    k:[HL("Ballon d'Alsace",9.0,6.9,10),HL('Planche des Belles Filles',5.5,8.8,20)],
    v:[{km:178,hm:4020},{km:93,hm:2200,c:[0]}]},
  {id:'tdmb',naam:'Tour du Mont-Blanc Cyclo',land:'FR',maand:'half juli',groep:'bergen',stijl:'bergen',
    tekst:'330 km rond de Mont Blanc door Frankrijk, Zwitserland en Italië, met onder meer de Grote en Kleine Sint-Bernhard en de Cormet de Roselend. Een van de zwaarste eendaagse tochten van Europa.',
    k:[],v:[{km:330,hm:8300},{km:175,hm:4000,naam:'duo, tweede deel'},{km:155,hm:4300,naam:'duo, eerste deel'}]},
  {id:'qh',naam:'Quebrantahuesos',land:'ES',maand:'half juni',groep:'bergen',
    tekst:'Grote Pyreneeëntocht met drie lange cols: Somport, Marie-Blanque en Portalet. De Marie-Blanque heeft een steil slot van ruim 10%.',
    k:[HL('Somport',30,2.7,6),HL('Col de Marie-Blanque',9.3,7.6,13),HL('Col du Portalet',29,4.5,8)],
    v:[{km:200,hm:3500},{km:85,hm:1350,c:[],naam:'Treparriscos'}]},
  {id:'mallorca',naam:'Mallorca 312',land:'ES',maand:'eind april',groep:'bergen',
    tekst:'Rondje Mallorca met de lange klimmen van de Serra de Tramuntana in de eerste helft en daarna veel vlakke kilometers. De volledige ronde is 312 km.',
    k:[HL('Coll de sa Batalla',7.7,5.2,8),HL('Puig Major',13.5,6.2,9),HL('Coll de Sóller',7.0,5.4,8)],
    v:[{km:312,hm:5000},{km:226,hm:4100},{km:167,hm:3400}]},
  {id:'maratona',naam:'Maratona dles Dolomites',land:'IT',maand:'begin juli',groep:'bergen',
    tekst:'Zeven Dolomietenpassen op afgesloten wegen, met de Passo Giau (bijna 10 km met 9%) als zwaarste. Klimmen van twintig minuten tot een uur, met korte afdalingen ertussen.',
    k:[HL('Passo Campolongo',5.8,6.1,10),HL('Passo Pordoi',9.2,6.9,10),HL('Passo Sella',5.5,7.9,10),HL('Passo Gardena',5.8,5.4,9),HL('Passo Giau',9.9,9.3,14),HL('Passo Falzarego',10.0,5.5,8),HL('Passo Valparola',1.1,7.5,10),HL('Mür dl Giat',0.36,13,19)],
    v:[{km:138,hm:4230,c:[0,1,2,3,0,4,5,6,7]},{km:106,hm:3130,c:[0,1,2,3,0,5,6,7]},{km:55,hm:1780,c:[0,1,2,3]}]},
  {id:'stelvio',naam:'Granfondo Stelvio Santini',land:'IT',maand:'begin juni',groep:'bergen',
    tekst:'Eindigt op de Passo dello Stelvio (2.758 m): ruim 21 km klimmen vanuit Bormio in ijle lucht. De lange route gaat eerst over de Mortirolo, een van de steilste cols van Italië.',
    k:[HL('Mortirolo',12.4,10.5,18),HL('Passo dello Stelvio',21.5,7.1,12)],
    v:[{km:140,hm:4100},{km:108,hm:3050,c:[1]},{km:64,hm:2280,c:[1]}]},
  {id:'coppi',naam:'Granfondo La Fausto Coppi',land:'IT',maand:'eind juni',groep:'bergen',
    tekst:'Hoge, stille cols in de Alpen bij Cuneo. De Colle Fauniera (2.481 m) is ruim 20 km klimmen op smalle wegen met stukken boven 10%.',
    k:[HL('Colle di Sampeyre',16,8.0,12),HL('Colle Fauniera',22,7.0,14),HL('Madonna del Colletto',7.3,6.5,13)],
    v:[{km:172,hm:4330},{km:111,hm:2550,c:[1,2]},{km:101,hm:2180,c:[1,2]}]},
  {id:'sportful',naam:'Sportful Dolomiti Race',land:'IT',maand:'half juni',groep:'bergen',stijl:'bergen',
    tekst:'Lange Dolomietentocht vanuit Feltre met onder meer de Passo Cereda en de Croce d\'Aune. Bijna 5.000 hoogtemeters op de lange route.',
    k:[],v:[{km:204,hm:4900},{km:125,hm:2600}]},
  {id:'oetztaler',naam:'Ötztaler Radmarathon',land:'AT',maand:'eind augustus',groep:'bergen',
    tekst:'Vier passen in Oostenrijk en Zuid-Tirol: Kühtai, Brenner, Jaufen en het Timmelsjoch. Het Timmelsjoch is na 180 km nog bijna 29 km klimmen.',
    k:[HL('Kühtai',18.5,6.6,13),HL('Brennerpass',36,2.2,5),HL('Jaufenpass',15.5,7.4,12),HL('Timmelsjoch',28.7,6.3,14)],
    v:[{km:227,hm:5500}]},
  {id:'dreilaender',naam:'Dreiländergiro',land:'AT',maand:'eind juni',groep:'bergen',
    tekst:'Rond het drielandenpunt van Oostenrijk, Italië en Zwitserland, met het Stilfser Joch vanaf Prad: 48 haarspeldbochten en ruim 24 km klimmen.',
    k:[HL('Stilfser Joch',24.3,7.4,12),HL('Ofenpass',14,5.4,10),HL('Norbertshöhe',8,6.0,10)],
    v:[{km:168,hm:3300},{km:120,hm:3000,c:[0]}]},
  {id:'arlberg',naam:'Arlberg Giro',land:'AT',maand:'begin augustus',groep:'bergen',stijl:'middel',
    tekst:'Vanuit St. Anton over de Arlbergpass en door Montafon en Paznaun. Tot 2030 via het Zeinisjoch, omdat de Silvretta-Hochalpenstraße dicht is.',
    k:[],v:[{km:142,hm:2400}]},
  {id:'alpenbrevet',naam:'Alpenbrevet',land:'CH',maand:'begin september',groep:'bergen',
    tekst:'Zwitserse Alpenpassen rond Andermatt. De Platinroute heeft vijf passen en 6.800 hoogtemeters op één dag.',
    k:[HL('Sustenpass',17.7,7.3,9),HL('Grimselpass',26,5.9,9),HL('Nufenenpass',13.4,7.4,10),HL('Lukmanierpass',40,4.0,9),HL('Oberalppass',21.7,4.2,8),HL('Furkapass',10,6.7,10)],
    v:[{km:267,hm:6800,c:[0,1,2,3,4],naam:'Platin'},{km:215,hm:5000,c:[4,3,2,5],naam:'Gold'},{km:107,hm:3100,c:[],naam:'Silber'},{km:64,hm:2100,c:[],naam:'Bronze'}]},
  /* ---------- vlak en snel ---------- */
  {id:'elfsteden',naam:'Fietselfstedentocht',land:'NL',maand:'Pinkstermaandag (mei of juni)',groep:'vlak',stijl:'vlak',
    tekst:'235 km langs de elf Friese steden, vlak en vaak met wind. Het gaat om lang achter elkaar een gelijkmatig tempo rijden, alleen of in een groepje.',
    k:[],v:[{km:235,hm:150}]},
  {id:'roubaix',naam:'Paris-Roubaix Challenge',land:'FR',maand:'half april, de zaterdag voor de koers',groep:'vlak',ruw:'kassei',
    tekst:"Vlak, maar met tientallen kilometers kasseien, waaronder het Bos van Wallers (Arenberg) en de Carrefour de l'Arbre. Lang kracht zetten op een lage cadans, en een sterke rug en armen.",
    k:[],v:[{km:170,hm:700},{km:145,hm:550},{km:70,hm:250}]},
  {id:'vaettern',naam:'Vätternrundan',land:'SE',maand:'half juni',groep:'vlak',stijl:'vlak',
    tekst:'315 km rond het Vättermeer met duizenden deelnemers. Vlak tot glooiend: het gaat om de afstand en om goed in een groep rijden, ook in de nacht.',
    k:[],v:[{km:315,hm:1900},{km:150,hm:800,naam:'Halvvättern'},{km:100,hm:500}]},
  {id:'cyclassics',naam:'ADAC Cyclassics Hamburg',land:'DE',maand:'half augustus',groep:'vlak',stijl:'vlak',
    tekst:'Snel en vlak door Hamburg en omgeving, op afgesloten wegen en in grote groepen, met de korte, steile Waseberg in Blankenese.',
    k:[HL('Waseberg',0.7,10,16)],v:[{km:110,hm:600},{km:60,hm:250,c:[]}]}
];
const EVBY=Object.fromEntries(EVLIST.map(e=>[e.id,e]));
const EVGROUPS=[['heuvels','Klassiekers en heuvels'],['bergen','Bergen'],['vlak','Vlak en snel']];
const evVar=(e,v)=>e.v[clamp(v|0,0,e.v.length-1)];
const evVarTxt=x=>`${x.naam?x.naam+' · ':''}${x.km} km · ${x.hm.toLocaleString('nl-NL')} hm`;
const evClimbs=(e,x)=>(x.c||e.k.map((_,i)=>i)).map(i=>e.k[i]).filter(Boolean);

/* het profiel van je evenement: uit de lijst, of (oudere gegevens) wat de AI-coach vroeger vond */
function evProfile(ev){
  if(!ev)return null;
  const e=EVBY[ev.id];
  if(e){const x=evVar(e,ev.v);return {naam:e.naam+(e.v.length>1?` (${x.naam||x.km+' km'})`:''),afstand_km:x.km,hoogtemeters:x.hm,klimmen:evClimbs(e,x),kenmerken:e.tekst,ruw:e.ruw||'',stijl:e.stijl||'',lijst:true}}
  return ev.profile||null;
}

/* ---------- hellingen doorrekenen ---------- */
/* snelheid op een helling bij een vermogen: zwaartekracht, rolweerstand en luchtweerstand (renner + 9 kg fiets) */
function climbSpeed(P,grade,mass){
  const g=9.81,crr=.004,cda=.35,rho=1.2,th=Math.atan(grade),eff=.97;
  let v=5;for(let k=0;k<30;k++){const f=mass*g*v*(Math.sin(th)+crr*Math.cos(th))+.5*rho*cda*v*v*v-P*eff,df=mass*g*(Math.sin(th)+crr*Math.cos(th))+1.5*rho*cda*v*v;v=Math.max(.5,v-f/df)}
  return v;
}
/* richtvermogen per helling: hoe korter de klim, hoe verder boven je FTP; in een lange tocht iets voorzichtiger */
const climbFrac=min=>min<2?1.15:min<5?1.05:min<10?.98:min<20?.92:min<40?.88:.82;
function climbPlan(c,ftp,weight,longEvent){
  const mass=weight+9,km=Math.max(.05,c.lengte_km||0),gr=clamp((c.gemiddeld_pct||0)/100,0,.25);
  let f=.95,min=0;
  for(let k=0;k<3;k++){const v=climbSpeed(ftp*f,gr,mass);min=km*1000/v/60;f=climbFrac(min)*(longEvent?.95:1)}
  return {min,watt:Math.round(ftp*f),pct:Math.round(f*100)};
}
/* hoe lang de hellingen voor jou duren */
function profileSummary(p,ftp,weight){
  const long=(p.afstand_km||0)>=120;
  const cs=(p.klimmen||[]).filter(c=>c.lengte_km>0).map(c=>Object.assign({},c,climbPlan(c,ftp,weight,long)));
  const mins=cs.map(c=>c.min).sort((a,b)=>a-b);
  return {climbs:cs,median:mins.length?mins[Math.floor(mins.length/2)]:0,longest:mins.length?mins[mins.length-1]:0,climbMin:mins.reduce((a,b)=>a+b,0)};
}

/* ---------- welk soort schema past bij dit evenement ----------
   Niet de hoogtemeters beslissen, maar hoe lang de klimmen voor jou duren:
   veel korte hellingen (Amstel) vragen iets anders dan een paar lange cols (Marmotte). */
function evStyle(ev,ftp,weight){
  const p=evProfile(ev);
  if(!p)return ev&&EVENTS[ev.kind]?ev.kind:'';
  const km=p.afstand_km||0,hm=p.hoogtemeters||0,mpk=km?hm/km:0;
  let s=p.stijl||'';
  if(!s){
    const S=profileSummary(p,ftp,weight),tot=S.climbMin;
    if(tot>0&&mpk>=6){
      const share=f=>S.climbs.filter(f).reduce((a,c)=>a+c.min,0)/tot;
      s=share(c=>c.min>=20)>=.5?'bergen':share(c=>c.min<8)>=.5?'heuvels':'middel';
    }else s=mpk>=20?'bergen':mpk>=12?'middel':mpk>=6?'heuvels':'vlak';
  }
  if(p.ruw&&s==='vlak')s='kassei';
  return s;
}
const evRough=ev=>{const p=evProfile(ev);return p&&p.ruw||''};
/* blokduur in de lange rit, afgestemd op de klimmen van je evenement */
function evClimbMin(ev,ftp,weight){
  const p=evProfile(ev);if(!p)return 0;
  const S=profileSummary(p,ftp,weight);return S.climbs.length?S.median:0;
}

/* ---------- haalbaarheid ----------
   Hoe lang je onderweg bent, wat je nu aankunt (je niveau of je langste ritten) en wat je tot de start kunt opbouwen.
   Voor een toertocht is het advies dat je langste trainingsrit ongeveer 60% van de tijd op de dag zelf duurt. */
function evHours(km,hm,wkg,kind){
  const f=clamp(wkg/3,.8,1.25)**.4;
  return km?(hm?km/(28*f)+hm/(1100*clamp(wkg/3,.8,1.3)):km/(((EVENTS[kind]||{}).kmh||25)*f)):0;
}
function longNow(st,today){
  const nv=NIVEAU[st.profile.niveau];
  const real=(st.rides||[]).filter(r=>!r.sim&&dayDiff(parseISO(r.date),today)<=42);
  const best=real.reduce((a,r)=>Math.max(a,r.dur||0),0)/3600;
  return Math.max(nv?nv.long/60:1.5,best);
}
function evCheck(st,ev,today){
  if(!ev||!ev.date)return null;
  const wkg=st.profile.ftp/clamp(st.profile.weight||75,35,200),weeks=dayDiff(today,parseISO(ev.date))/7;
  if(!(weeks>0))return null;
  const now=longNow(st,today),reach=Math.min(now*1.25**(Math.max(0,weeks-1)/4),now*3,8);
  const one=(km,hm)=>{const h=evHours(km,hm,wkg,ev.kind),need=Math.min(h*.6,7);return {h,need,st:reach>=need?'ok':reach>=need*.8?'krap':'zwaar'}};
  const e=EVBY[ev.id];
  const km=e?evVar(e,ev.v).km:ev.km||EVENT_KM[ev.kind]||0,hm=e?evVar(e,ev.v).hm:0;
  if(!km)return null;
  const r=Object.assign(one(km,hm),{reach,weeks,km});
  /* langste dag in je week: daar moet de lange rit op passen */
  const av=weekAvail(st,mondayOf(today)),maxDay=Math.max(0,...av)/60;
  r.day=maxDay&&maxDay<r.need*.9?maxDay:0;
  if(r.st!=='ok'&&e){
    const opts=e.v.map((x,i)=>Object.assign(one(x.km,x.hm),{i,km:x.km})).filter(o=>o.i!==(ev.v|0)&&o.km<km);
    r.alt=opts.find(o=>o.st==='ok')||null;
  }
  return r;
}
