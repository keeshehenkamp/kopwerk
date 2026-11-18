# Kopwerk

Fietstrainingsapp in de browser: weekschema's, een workout player die een smart trainer via Bluetooth aanstuurt (FTMS, ERG-modus), analyse na de rit, import van .fit/.tcx en export naar Zwift (.zwo).

Live: https://keeshehenkamp.github.io/kopwerk/

## Opbouw

Geen build-stap. `index.html` laadt de bestanden hieronder als gewone scripts, in deze volgorde. Ze delen één globale ruimte, net als toen alles in één bestand stond.

| Bestand | Inhoud |
| --- | --- |
| `css/kopwerk.css` | Opmaak, kleuren, licht en donker |
| `js/hulp.js` | Datums, opmaak van getallen, vermogenszones |
| `js/trainingen.js` | Trainingstypes en het opbouwen van een training |
| `js/planner.js` | De coach: doelen en evenementen, fases, weekvolume, rustdagen en weekindeling |
| `js/analyse.js` | Analyse van een rit, records, conditie en vermoeidheid |
| `js/bestanden.js` | Import (.fit, .tcx), export (.zwo, zip), downloads |
| `js/opslag.js` | Opslag in de browser |
| `js/bluetooth.js` | Trainer en hartslagmeter via Web Bluetooth |
| `js/player.js` | De workout player en de demo-modus |
| `js/wereld.js` | 3D-rit (three.js): routes als rondjes met een eigen hoogteprofiel (`ROUTES`), snelheid uit vermogen, gewicht en helling, landschappen met dorpen en herkenningspunten, publiek, weer en tijd van de dag, tempomaker, andere fietsers met een eigen vermogen (rijden rechts, halen links in, geven windschaduw), een kaartje: een echte kaart rond je plek (OpenFreeMap via MapLibre, pas geladen bij een route met echte ligging) met plaatsnamen, de route, wat je gereden hebt en het dorp waar je doorheen rijdt, zoomen met + en − of het scrollwiel (`kopwerk.kaartzoom`), punten en sterren, productdemo. Een kilometer wereld wordt in stapjes van een paar ms opgebouwd (`chunkJob`), zodat het beeld niet hapert |
| `js/fietser.js` | De fietser: model uit Blender (`models/fietser.glb`, één animatie met drie houdingen: zittend, uit het zadel en diep over het stuur), tenue als plaatje per renner, en per beeld de houding (`poseRider`): crankstand, staan op steile stukken, laag boven de 40 km/u, hoofd de bocht in, pedalen waterpas bij uitrollen. Bron en scripts staan buiten deze map, in `Kopwerk-blender/` (`anim.py` maakt de houdingen, `uitrusting.py` helm en schoenen, `fiets_extra.py` het dichte kettingblad, `export.py` het GLB-bestand) |
| `js/gebouwen.js` | Gebouwen op maat (`dzBouwer`): elk huis wordt los opgebouwd op zijn eigen maat en met zijn eigen toeval, zodat geen twee gelijk zijn. Stijlen: Nederlands woonhuis, boerderij, schuur of loods, groot pand in een dorp, Provençaals huis, en twee kerken. Met ramen, luiken, deur met stoep, schoorsteen, dakkapellen, erker, aanbouw, regenpijp, zonnepanelen. Gebruikt voor de gebouwen van de kaart (Ronde Hoep, met een tuin eromheen), de dorpsstraten (`bouwstijl` in het ontwerp) en losse huizen via `details` (`bouw`) |
| `js/ontwerp.js` | Ontworpen routes: het wegverloop uit met de hand uitgezette stukken of uit een GPX-spoor (`dzTrack`), het land als één hoogteveld (uit getekende lijnen of uit een echte hoogtekaart), het grondmateriaal (gras, rots, bos van ver, berm), het asfalt, het water, en per kilometer de begroeiing, dorpen en herkenningspunten. Details langs de weg (bankjes, hekken, muurtjes, palen, steigers, zwanen) staan als regels in het ontwerp van een route (`details`), net als de kreten op het wegdek van een klim (`verf`), het publiek in groepjes met vlaggen, stoelen en campers (`publiek`) en de slingers over een dorpsstraat (`slingers` bij een dorp). Gebouwen van de kaart die groot zijn of ver van de weg staan, krijgen hun echte plattegrond met een zadeldak |
| `js/routes/ventoux.js` | Mont Ventoux (55 km): landschappen langs de weg, begroeiing, kavels, dorpen en herkenningspunten. `ventoux-spoor.js` (weg en hoogteprofiel) en `ventoux-hoogte.js` + `models/ventoux-hoogte.bin` (hoogtekaart) zijn gemaakt met de hulpprogramma's hieronder |
| `js/routes/hoep.js` | Ronde Hoep (17 km): de ringdijk om de polder bij Ouderkerk aan de Amstel. `hoep-spoor.js` (weg) komt uit een GPX-bestand, `hoep-kaart.js` (water, gebouwen, bomen op hun echte plek) uit OpenStreetMap | De andere wegen komen ook van de kaart (`dzKaartWegen` in `js/ontwerp.js`, in vakken van twee kilometer die na de start in stapjes worden gebouwd): dijkwegen op de kade, afritten die de dijk af lopen, en bruggetjes (vlak beton met een wit hek) alleen waar water doorloopt. Het land rond de sloten ligt op polderhoogte, zodat de ringsloot aan de voet van de dijk te zien is. Waar de route de rivier oversteekt, staat een `vaartbrug` in het ontwerp.
| `js/routes/heuvel.js` | Heuvelland, met de hand uitgezet en verzonnen (geen echte kaart). Sinds 16-11-2026 geen keuze meer en niet geladen; wie hem gekozen had, rijdt de Ronde Hoep. `js/routes/col.js` en `js/routes/polder.js` zijn de oude ontwerpen van De Col en de Polderronde: niet meer geladen, bewaard als voorbeeld (galerij, stuwmeer, brug, rotonde, vaartbrug, molens) |
| `tools/osm_naar_kaart.py` | Maakt van OpenStreetMap-gegevens (Overpass-API, `out geom`) de kaart rond een route: watervlakken (een rivier of vaart die voor een deel buiten de ronde ligt is boezemwater, een vaart in de polder niet), sloten die alleen als lijn op de kaart staan, de andere wegen rond de route (asfalt, rode fietspaden, erfpaden van betonplaten, karrensporen; geen voetpaden en parkeervakken) met hun bruggen, gebouwen en bomen. Kaartgegevens © [OpenStreetMap](https://www.openstreetmap.org/copyright)-bijdragers (ODbL) |
| `tools/ROUTE-MAKEN.md` | **De werkwijze voor een nieuwe route uit een GPX-bestand**, stap voor stap: testopzet, hulpprogramma's, de keuzelijst van een ontwerp, de controlelijst en de valkuilen. Begin hier |
| `tools/route_gegevens.py` | Haalt de open gegevens voor een route op: hoogtetegels of OpenStreetMap. Zonder `--ja` toont het alleen wat het zou ophalen |
| `tools/3d-test/` | Testopzet voor de 3D-wereld: `sync.sh` (testkopie buiten Bureaublad), `serve.py` (server die beelden bewaart) en `test-hulp.js` (camera zetten, bladen met beelden, driehoeken tellen, alle kilometers bouwen, een stuk rijden) |
| `tools/gpx_naar_spoor.py` | Maakt van een GPX-bestand het wegverloop van een route: `python3 tools/gpx_naar_spoor.py <gpx> <id> --km 55 --tegels <map>` |
| `tools/hoogte_naar_bin.py`, `tools/hoogtetegels.py` | Maakt de hoogtekaart rond een route uit kaarttegels. `python3 tools/hoogte_naar_bin.py <id> --welke` toont welke tegels je moet downloaden. Hoogtedata: [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (open data; bevat onder meer SRTM en EU-DEM, geproduceerd met Copernicus-gegevens) |
| `js/grafieken.js` | Grafieken |
| `models/kenney.bin`, `models/kenney.json` | 46 gratis 3D-modellen van [Kenney](https://kenney.nl) (CC0): bomen, struiken, rotsen, hout, bloemen en auto's, met ingebakken natuurlijke kleuren. Opnieuw maken met `python3 tools/kenney.py <map met uitgepakte Kenney-pakketten>` (Nature Kit en Car Kit) |
| `js/evenementen.js` | Dertig grote toertochten en cyclo's in Europa (afstanden, hoogtemeters, hellingen); hoe lang de hellingen voor jou duren, welk soort schema daarbij past (korte hellingen, middellange klimmen, lange cols, vlak, kasseien) en of het haalbaar is |
| `js/account.js` | Inloggen (Apple, Google, e-mail met wachtwoord), uitloggen en account verwijderen. Zonder account geen app: `acctGate` toont het inlogscherm in plaats van de app |
| `js/schermen.js` | Schermen en vensters |
| `js/acties.js` | Knoppen, toetsen en het opstarten van de app |

## Opslag

- localStorage-sleutel `kopwerk.v1`: instellingen, schema en ritten (`v: 1`).
- IndexedDB `kopwerk`, store `streams`: meetgegevens per rit (`s:<rit-id>`) en een lopende training (`active`).
- Sinds de coach bevat de state ook `event.kind` en `event.km` (soort en afstand van het evenement), `started` (eerste dag met een schema) en `plog` (wat er per voorbije dag gepland stond, zodat het verleden niet verschuift), en `prog` (trede per soort training op de opbouwladder, bijgewerkt na elke rit met je gevoel en de uitvoering). Ritten krijgen `lvl`, de trede waarop ze gereden zijn. Dit zijn toevoegingen; oude gegevens werken zonder migratie.

- Evenement uit de lijst: `event.id` en `event.v` (welke afstand); naam, afstand en hellingen komen uit `js/evenementen.js`. Een eigen evenement heeft `name`, `kind` en `km`. Een oud `event.profile` (van de vroegere AI-coach) wordt nog gelezen. De app verwijdert een oude sleutel `kopwerk.ai` bij het opstarten.
- `profile.niveau`: beginner, recreant, gevorderd of ervaren. Bepaalt het startvolume en de eerste trede; zodra je FTP bekend is, weegt je watt per kilo mee. De planlog bewaart per dag ook `b`, de blokduur van een lange rit met klimmen.

- Ritten krijgen `prog0`: de trede-stand vóór die rit, zodat een tijdelijke verlaging of verhoging niet als blijvend telt. `coachNo`: weken waarin je een voorstel van de coach afsloeg.
- `block`: het doelblok van twaalf weken zonder evenement (`goal`, `start`, `end`, `from`, `target`), door de coach gekozen in `ensureBlock`; afgeronde blokken staan in `blockLog` met `result`. De laatste week heet Testweek (`kind: 'test'`). Rond week 6 komt een tussentest; ligt die boven het schema, dan gaat `target` omhoog (`raised`, `tested`). `v: 2` = doel volgens de huidige regels.
- Een rit van buiten (bestand of Strava) wordt naast de training van die dag gelegd (`matchPlan`, `compareRide` in `js/analyse.js`): `cmp` met het cijfer, `as` met wat de rit was. Cijfer 7,5 of meer: de rit telt als die training.
- Hardlopen is een rit met `type: 'hardlopen'`, `manual: true` en `dist` in meters.
- `tools/planner-test/`: scenario's die de planner doorrekenen (`sim.js`) en controles op de inhoud van de trainingen (`checks.js`: lengte, geen staart, geen vlakke stukken, langer is meer werk, variatie binnen een pakket, vrije tijd blijft niet leeg) en op de week als geheel (`runWeekChecks`: wie het schema volgt krijgt de week die hij maandag zag, ook bij zestig willekeurige renners; de lange rit is de langste en groeit mee; een FTP-test staat op een frisse dag; afbouw zonder nieuwe trainingen; herstel na je evenement). Open `index.html` via een lokale webserver; bovenaan staat ALLES GOED of wat er fout is.

- `ftpCal`: je eigen verhouding tussen FTP en beste rampminuut (`r`), uit één 20-minutentest (`test20`, `calibrate`). `zin`: de ochtendvraag na 'Moe', per dag. Ritten krijgen `cal` als ze die verhouding gaven en `ownLine` als hun belasting uit je eigen lijn komt (`feelLine`).
- Ritten krijgen `prog1`: de stand op de ladder na die rit. Varianten van dezelfde prikkel delen hun opbouw: `progOf` (js/analyse.js) leest de stand uit de laatste rit van de familie. De planlog bewaart `x` bij een FTP-test die op een rustige dag kwam.
- `ftpGiven`: de dag waarop je bij de start zelf een FTP invulde. De coach telt dat als test, dus de eerste FTP-test komt pas na zes weken. Ritten krijgen `rpeAdj` als hun trede uit je gevoel komt; pas je je gevoel later aan, dan rekent de coach die trede opnieuw uit (zolang er geen nieuwere rit van die soort is beoordeeld).
- Eigen ritten vooruit inplannen (Kalender, Plannen): `overrides[datum].own = {m, e}` met de duur in minuten en de zwaarte (0 rustig tot 3 zeer zwaar, zoals `EFFORT`). De planner (`ownWo` in `js/planner.js`) zet zo'n rit vast in de week: als lange rit vanaf 100 minuten of vier vijfde van je lange rit, als zware dag bij zwaar of zeer zwaar. Hij schuift niet door als je hem mist, en een buitenrit op die dag blijft een buitenrit (geen training uit het schema). Ritten na volgende week staan in de Kalender onder Later, zonder schema eromheen.
- Te weinig gereden: `shortfall` in `js/planner.js` vergelijkt de planlog (`plog`, geplande minuten) met je ritten over de laatste twee weken zonder herstel, afbouw of ziekte. Onder 60% in beide weken zegt de coach het op Home.
- Van demo-ritten (`sim`) bewaart de app alleen de laatste. Ze tellen niet mee in het schema, de kalender of je beste ritten.

- Account: Kopwerk werkt alleen met een account (Firebase Auth: Apple, Google of e-mail met wachtwoord, `js/account.js`). `kopwerk.acct` onthoudt dat er op dit apparaat is ingelogd, zodat de app zonder verbinding gewoon opent. Uitloggen zet eerst alles online en maakt daarna dit apparaat leeg; account verwijderen wist `users/{uid}` met ritten en meetgegevens, trekt bij Apple de sleutels in en verwijdert het account. `firestore.rules`: ieder account leest en schrijft alleen zijn eigen `users/{uid}`.
- Synchronisatie (Firebase) kiest per kant het nieuwste op basis van `updatedAt`. Alleen echte wijzigingen verhogen die (`save()`); wat de app zelf afleidt, zoals de planlog en records, bewaart met `save(false)`. Terug in de app of het tabblad haalt de app wijzigingen van je andere apparaat op.

Verander deze namen of het formaat niet zonder migratie, anders zijn bestaande gegevens niet meer leesbaar. Alle opslag loopt via `js/opslag.js`. Daar kan later ook synchronisatie op aansluiten.

## Laptop en telefoon

Rijden met je trainer kan alleen in een browser met Web Bluetooth: Chrome of Edge op je laptop (of Chrome op Android). Op een telefoon of tablet zonder Bluetooth, zoals een iPhone, toont de app geen startknoppen: daar plan je, pas je je tijd aan en kijk je je ritten terug. Log op beide in met hetzelfde account, dan zie je overal hetzelfde.

## Routes

Een route in `ROUTES` (js/wereld.js) is een ronde van een heel aantal kilometers: landschappen (`zones`, in km) en klimmen (`klim`: begin km, lengte km, gemiddeld %). Na elke klim volgt vanzelf een afdaling, zodat de ronde op dezelfde hoogte sluit. De gekozen route staat per apparaat in localStorage (`kopwerk.route`). Het kaartje tijdens de rit gebruikt kaarten van [OpenFreeMap](https://openfreemap.org) (gratis, zonder sleutel; © OpenMapTiles, gegevens © OpenStreetMap-bijdragers). De ligging komt uit het spoor van de route (`lat0`, `lon0`, `schaal` in `js/routes/<id>-spoor.js`). Zonder ERG, en bij vrij rijden na de training, stuurt de app de helling van de route naar de trainer.

## Als app op je telefoon

Bij openen en bij terugkomen in de app kijkt Kopwerk of `index.html` een nieuwer versienummer heeft (`checkVersion` in `js/acties.js`). Zo ja, dan laadt hij de nieuwe versie, behalve tijdens een rit. Daarom altijd `?v=` ophogen bij een wijziging.


`manifest.webmanifest` en de iconen in `icons/` maken dat je Kopwerk via "Zet op beginscherm" als losse app kunt openen, zonder browserbalken. Let op: op een iPhone heeft die app een eigen opslag, los van Safari. Neem je gegevens mee met een back-up (Profiel, Je gegevens: downloaden in Safari, terugzetten in de app) of door op beide met hetzelfde account in te loggen.

## Lokaal testen

Start een eenvoudige webserver in deze map en open `http://localhost:8000`:

```bash
python3 -m http.server 8000
```

Web Bluetooth werkt alleen via https of op localhost, in Chrome of Edge. Zonder trainer kun je de demo-modus gebruiken (knop "Start demo" in de player).

## Publiceren

Elke push naar `main` werkt de site via GitHub Pages bij.

## Nieuwe versie uitrollen

Verhoog bij elke wijziging het `?v=`-nummer achter de scripts en het stylesheet in `index.html`. Anders laden browsers soms nog een oud bestand naast een nieuw bestand.
- Ritten krijgen `elev`: hoogtemeters. Uit een bestand (.fit veld 2/78, .tcx `AltitudeMeters`, .gpx `ele`; alleen stijgingen van 2 m of meer tellen, `climbOf`), van Strava (`total_elevation_gain`), uit de 3D-wereld (`W.climb`) of met de hand ingevuld. `prSeen`: de nieuwe records van die rit zijn op Prestaties getoond; daarna staan ze daar niet meer.
- Rijscherm: de grafiek onderaan is een venster van een kwartier rond nu (`P.win`, `#p-win` schuift mee), met de watt boven elk blok; wat je al reed staat lichter. Een training korter dan een kwartier staat er helemaal.
- Prestaties: onder de grafiek een doorlopende lijst per maand, met het jaar als tussenkop (`monthTable`): ritten, km, hoogtemeters en uren, alleen fietsen.
