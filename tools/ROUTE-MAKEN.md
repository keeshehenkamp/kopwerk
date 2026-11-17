# Een nieuwe 3D-route maken uit een GPX-bestand

Dit is de werkwijze waarmee de Mont Ventoux en de Ronde Hoep gemaakt zijn. Volg hem van boven naar beneden; elke stap zegt wat je
doet, waarmee, en waaraan je ziet dat het goed is. De twee bestaande routes zijn het voorbeeld en de maatstaf:

- **berg, met echte hoogtekaart:** `js/routes/ventoux.js` (+ `ventoux-spoor.js`, `ventoux-hoogte.js`, `models/ventoux-hoogte.bin`)
- **vlak land, met echte kaart:** `js/routes/hoep.js` (+ `hoep-spoor.js`, `hoep-kaart.js`)

Beelden van hoe het hoort te worden staan in `~/Desktop/Claude code/Kopwerk-beelden/`: `publiek-ventoux.jpg`, `publiek-hoep.jpg`,
`huizen-ventoux.jpg`, `huizen-hoep.jpg`, `details-ventoux.jpg`, `details-hoep.jpg`. Bekijk ze voordat je begint en leg je eigen
beelden er aan het eind naast.

## Wat Kees wil (niet over onderhandelen)

- **Stijl:** getekend en uit één stuk. Geen realisme, geen korrelige of pixelige texturen, geen ruis als detail. Eén hand: rustige
  kleuren, strakke randen, vlakken met een getekend patroon.
- **De omgeving is het belangrijkst.** Huizen gedetailleerd en gevarieerd (geen twee gelijk), tuinen, dorpen die op een dorp lijken.
- **Zo dicht mogelijk bij de echte route:** het wegverloop uit de GPX, het land uit echte hoogtes of de echte kaart, herkenningspunten
  op hun plek en met hun eigen naam.
- **Geen fietsers langs de weg als decor** (zie `CLAUDE.md`); publiek mag wel.
- **Taal in de app en in commentaar:** Nederlands, kort en nuchter. Lees `CLAUDE.md` en houd je eraan.
- **Vragen:** stel vooraf alleen wat je echt niet zelf kunt beslissen (vervangt de route een bestaande? mag je gegevens downloaden?).
  Binnen de opdracht voer je verbeteringen direct door.
- **Downloaden mag pas na een ja van Kees**, per bron en per route. De hulpjes halen zonder `--ja` niets op.
- **Online zetten:** vraag of je direct mag pushen. Pushen zet het meteen live.

## Stap 0. Testopzet

Het voorbeeldvenster van de Claude-app mag niet in de map Bureaublad lezen. Werk daarom met een kopie in je scratchpad:

```bash
tools/3d-test/sync.sh <scratchpad>/k3d
```

Zet in `~/Desktop/Claude code/.claude/launch.json` een configuratie die `python3 <scratchpad>/k3d/serve.py 8780 <scratchpad>/k3d/app
<scratchpad>/k3d/shot` start (naam bijvoorbeeld `kopwerk-3d`) en open die met het voorbeeldvenster. Zet het venster op 1024x768,
anders is het canvas 0 breed. Draai `sync.sh` opnieuw na elke wijziging en laad de pagina opnieuw.

In de pagina:

```js
eval(await (await fetch('/tools/3d-test/test-hulp.js')).text())
await TH.setup('ventoux')                       // route-id; MK bevat daarna de markeringen in meters
await TH.sheet('naam', [['bos','bos+3000'], ['top','top-60',{yaw:30,lift:3}]], 3, 700)   // blad naar <scratchpad>/k3d/shot/naam.jpg
TH.stats(9000)                                  // tekenopdrachten en driehoeken in het rijbeeld
await TH.bouwAlles('ventoux')                   // elke kilometer bouwen: fouten en langste stap
TH.rit(1200, 190)                               // een minuut rijden op 190 W: wat doen de andere fietsers
```

Lees de beelden met het Read-gereedschap en kijk er echt naar. Een schermafdruk van het venster zelf kan verouderd zijn (het venster
tekent niet door als het verborgen is); de bladen van `TH.sheet` zijn altijd actueel. Lange lussen (meer dan een paar seconden) in
één aanroep geven een fout: knip ze op.

Als bestanden in de scratchpad na een paar dagen weg zijn, heeft het systeem ze opgeruimd: draai `sync.sh` opnieuw.

## Stap 1. Het wegverloop

```bash
python3 tools/gpx_naar_spoor.py "<bestand.gpx>" <id> --km <heel getal>            # eerste keer: hoogte uit de GPX
```

- `<id>`: korte naam in kleine letters (wordt bestandsnaam en sleutel).
- `--km`: de lengte moet een heel aantal kilometers zijn (de wereld wordt per kilometer gebouwd); kies het dichtstbijzijnde hele
  getal, het spoor wordt een paar procent opgerekt of ingekort.
- Vlak land: `--plat 0.15` (GPX-hoogtes zijn daar vooral ruis). Bergen: straks opnieuw met `--tegels <map>`, dan ligt de weg precies
  op de hoogtekaart.
- Het spoor moet een ronde zijn (begin en eind binnen 60 m). Uitstapjes heen en terug over dezelfde weg worden vanzelf weggelaten.

Lees het verslag: lengte en schaal, stijging, steilste 100 m (boven ~13% is verdacht), krapste bocht (onder 9 m wordt verruimd),
de lijst haarspeldbochten, en de waypoints als km langs de route. Die laatste zijn je eerste markeringen.

## Stap 2. Het land

**Bergen en heuvels: hoogtekaart.** Vraag eerst of je de tegels mag ophalen (Terrain Tiles, open data, ongeveer 100 kB per tegel).

```bash
python3 tools/route_gegevens.py <id> tegels <map>          # toont hoeveel tegels
python3 tools/route_gegevens.py <id> tegels <map> --ja     # haalt ze op
python3 tools/gpx_naar_spoor.py "<bestand.gpx>" <id> --km <n> --tegels <map>     # weg op de hoogtekaart
python3 tools/hoogte_naar_bin.py <id> <map>                # models/<id>-hoogte.bin + js/routes/<id>-hoogte.js
```

**Vlak land met water en bebouwing: de kaart.** Vraag eerst of je OpenStreetMap mag ophalen.

```bash
python3 tools/route_gegevens.py <id> osm <bestand.json>        # toont de vraag en het gebied
python3 tools/route_gegevens.py <id> osm <bestand.json> --ja   # haalt op (kan tientallen MB zijn)
python3 tools/osm_naar_kaart.py <id> <bestand.json>            # js/routes/<id>-kaart.js
```

Het verslag van `osm_naar_kaart.py` noemt bruggen, molens, forten en kerken met km, kant en afstand: gebruik dat voor `punten`.
De kaart bevat ook de andere wegen rond de route en hun bruggen, en sloten die alleen als lijn op de kaart staan; de wereld tekent die vanzelf
(`dzKaartWegen` in `js/ontwerp.js`). De regel 'bruggen' in het verslag zijn plekken waar de route zelf boezemwater kruist. Kijk of het water daar
echt van kant wisselt (anders raakt de route alleen de oever) en zet er dan een `{soort:'vaartbrug',at:<km>,lengte:20}` in `punten`.
Controleer het water van bovenaf tegen OpenStreetMap: een rivier moet donker (boezem) zijn, een vaart in de polder licht (polderpeil).
Een route kan allebei hebben (heuvels met dorpen): dan `terrein.hoogte` én `terrein.kaart`. Dat is nog niet gedaan; controleer
dan extra goed of gebouwen op de helling staan en niet zweven.

De gegevens zelf (tegels, OSM-json) horen niet in git; alleen wat de hulpprogramma's ervan maken.

## Stap 3. Het ontwerp: `js/routes/<id>.js`

Begin met een kopie van `ventoux.js` (berg) of `hoep.js` (vlak) en pas aan. Wat erin staat:

| Onderdeel | Wat het doet |
|---|---|
| `km`, `spoor`, `naam`, `hoogteDorp` | lengte, welk spoor, naam op borden, hoogte van de start boven zee (voor borden) |
| `nl:true` | Nederland: geen rotsen, Nederlandse borden |
| `bouwstijl` | stijl van de huizen in de dorpen: `'provence'`; zonder dit de kant-en-klare modellen. Kaartgebouwen krijgen altijd de Nederlandse stijlen |
| `marks` | markeringen: naam -> km. Alles hieronder verwijst ernaar als `'naam'`, `'naam+0.3'` (km) |
| `hpTussen` | tussen welke km haarspeldbochten een genummerd bord krijgen |
| `klim`, `klimmen` | klimmen voor kilometerborden en het bord onderaan |
| `secties` | landschap langs de weg vanaf een markering: `land`, `breedte` (m), `lijn` (`geen`, `midden`, `kant`, `beide`, `rive` = midden + onderbroken kant, `kantstreep` = alleen onderbroken kant), `rand` (`paal`, `rail`, `muur`, `stoep`, `sneeuw`, `geen`), `hek`, `sfeer` (`open`, `half`, `besloten`), `dicht` |
| `groen`, `bosDeel`, `weiland` | wat er groeit per landschap, hoeveel van het bos echt staat, waar graspollen en bloemen |
| `grond` | kleuren: `wei`, `bergwei`, `alp`, `droog`, `fris`, `bos`, `bodem`, `rots`, `puin`, `berm`, `oever` |
| `lagen`, `bloemen`, `berm` | gesteente in lagen (0-1), bloemen in het gras (0-1), breedte van de grindberm (1 = breed, 0.3 = smal) |
| `velden` | kavels: `hoek`, `b`, `l`, `kleuren`, `gewas` (`wijn`, `lavendel`, `olijf`, `kers`), `tot` (hoogte) |
| `dorpen` | `van`, `tot`, `naam`, `plein`, `kant`, `kerk`, `klein`, `huizen`, `slingers` (afstand in m), `echt:true` = huizen komen van de kaart |
| `verf` | kreten op het wegdek: `van`, `tot`, `elke` |
| `publiek` | groepjes toeschouwers: `van`, `tot`, `elke`, `n:[min,max]`, `kant`, `af`, `zit`, `vlag` (`fan7` Frankrijk, `fan8` Nederland, `fan9` België), `camper`, `parasol`, `land`, `helling`, `op` |
| `details` | losse voorwerpen volgens regels: `m` (model), `land`, `van`, `tot`, `elke`, `vast`, `kant`, `af`, `draai`, `schaal`, `groep`, `rij`, `op:'water'`, `zoek:'oever'`, `terug`, `boom`, `kleur`, `helling`; of `bouw:'provence'` met `w`, `d`, `bomen` voor een los huis op maat |
| `punten` | herkenningspunten: `soort` (`gebouw` met `model`, `pas`, `molen`, `koeien`, `schapen`, `boten`, `kapel`, `kasteel`, `brug`, `klimbord`, ...), `at` of `van`/`tot`, `kant`, `af` |
| `terrein` | `hoogte` (id van de hoogtekaart), `kaart` (id van de kaart), `cel`, `marge`, `ruis`, `bosVan`, `boomgrens`, `kaalVan`, `weiTot`, `sneeuw`; vlak land: `vlak`, `vlakAf`, `peil`, `kade`, `kadeBreed`, `buiten` |
| `sfeer` | vast licht: luchtkleuren, zon (`dir`), `fog`, belichting. Kies een zonnestand die lange schaduwen over de weg geeft |

De uitleg per optie staat als commentaar bij de code: zoek in `js/ontwerp.js` op de naam. Modellen staan in `js/wereld.js`
(`propGeos`, `G.<naam>`), huizen op maat in `js/gebouwen.js`.

Aanmelden: in `js/wereld.js` bij `ROUTES` (`{id, name, km, ontwerp}`), in `index.html` de script-regels (spoor, hoogte of kaart,
dan het ontwerp; allemaal met dezelfde `?v=`), en in `README.md` een regel. Vervangt de route een bestaande, laat `routeId` de
oude keuze dan omzetten (zie hoe `'col'` naar `'ventoux'` gaat) en laat het oude ontwerp staan als voorbeeld.

### Volgorde van werken

1. Kaal ontwerp: secties, terrein, sfeer. Kijk of weg en land kloppen (bovenaanzichten met `{top:60}` bij krappe bochten).
2. Grondkleuren, begroeiing, velden.
3. Dorpen en herkenningspunten op hun echte plek; zoek op hoe ze er echt uitzien (een toren is geen vuurtoren).
4. Details langs de weg, per landschap.
5. Publiek: weinig in het vlakke, groepjes op de klim, vol bij de top of de finish.
6. Nalopen met de lijst hieronder.

## Stap 4. Nakijken (pas klaar als dit allemaal klopt)

Maak per route minstens twaalf beelden verspreid over de ronde, plus dichtbij-beelden van dorpen en herkenningspunten.

- [ ] `TH.bouwAlles(id)`: 0 fouten, langste stap onder ~45 ms. Ook voor de andere routes (ze delen de motor).
- [ ] Niets op de rijbaan: geen huis, dakrand, auto, hek, boom of mens binnen de wegbreedte; in een dorp ook niet op de stoep.
- [ ] Geen zwevende of ingegraven dingen: huizen op een helling, steigers, palen in het water.
- [ ] Geen platte, kale of zwarte vlakken van dichtbij; geen korrel of pixels in gras, berm, puin en asfalt.
- [ ] Huizen: gevarieerd in maat, kleur en dak; ramen ook in de zijgevels; tuin of stoep ervoor.
- [ ] Bochten en strepen vloeiend; strepen aan beide kanten.
- [ ] Zwaarte: tot ongeveer 2,6 miljoen driehoeken en 360 tekenopdrachten in het rijbeeld (`TH.stats`) op het drukste punt.
- [ ] Telefoon: venster op 375x812, route laden, beeld bekijken (`W.lite` is dan waar: minder detail, zachtere schaduw).
- [ ] `TH.rit(1200, 190)`: andere fietsers blijven op de weg (plek tussen ongeveer -1,7 en 2) en halen links in.
- [ ] Console zonder fouten.

Zeg in je verslag eerlijk wat je niet getest hebt. Een hele rit op echte snelheid, een echte telefoon en een echte trainer kun je
vanuit het voorbeeldvenster niet testen.

## Stap 5. Online zetten

1. `?v=` in `index.html` ophogen bij elke wijziging aan css of js (alle regels hetzelfde nummer; datum plus letter).
2. `README.md` bijwerken.
3. Committen met een korte Nederlandse omschrijving, `docs/` niet meenemen: `git add -A . ':!docs'`.
4. Pushen: `GIT_SSH_COMMAND="ssh -i ~/.ssh/github_takenlijst -o IdentitiesOnly=yes" git push origin main`
5. Wachten tot `https://keeshehenkamp.github.io/kopwerk/` het nieuwe `?v=` toont, dan daar de route laden en de console nakijken.
6. De planner-test (`tools/planner-test/`) is alleen nodig als je planner of trainingen raakt.

## Valkuilen die al eens tijd gekost hebben

- **Coördinaten:** x = oost, z = zuid (noord = -z). Koers h: 0 = noord, met de klok mee. Vooruit = (sin h, -cos h), rechts = (cos h, sin h).
  De voorkant van een model is +z; `face(h, kant)` draait die naar de weg.
- **Losse netten met het gevelmateriaal** (`W.mat.gevel`) hebben een attribuut `pat` nodig; `instanceMatrix` bestaat alleen in
  geïnstanceerde netten.
- **De animatiemixer** schrijft een bot alleen als de animatie verandert. Wie daarna een bot bijdraait, moet de stand uit de animatie
  onthouden (zie `poseRider`), anders stapelt de draai zich op zodra de pedalen stilstaan.
- **Tijdstap:** de testhulp telt zijn eigen tijd door (`TH.t`); een tijd die terugspringt gaf vroeger negatieve stappen.
- **Lange stappen bij het bouwen** geven een hapering tijdens het rijden: `yield` vaak genoeg in `dzChunkJob`/`dzExtras`.
- **Bolle of ronde netten met een streep erover:** leg de polen van de bol zo dat de randen langs de streep lopen (zie de helm in
  `Kopwerk-blender/uitrusting.py`), anders krijg je een kartelrand.
- **Kleuren onder ACES-toonmapping:** donkere kleuren worden snel zwart in de schaduw. Kies middentonen en kijk naar de schaduwkant.
- **Gebouwen van de kaart** staan soms op de weg of de stoep: laat ze opschuiven of weg (zie `vrijH` in `dzExtras`).
- **Overpass:** de hoofdserver weigert soms (406); het hulpje probeert eerst `overpass.kumi.systems`.
- **Vervangen met een script:** controleer dat je zoektekst precies één keer voorkomt en dat een eindanker direct na het blok staat.
  Twee keer is er zo een heel stuk code tussenuit gevallen.

## De fietser

De fietser komt uit Blender (`~/Desktop/Claude code/Kopwerk-blender/`). Blender hoeft niet open:

```bash
cd ~/Desktop/Claude\ code/Kopwerk-blender
/Applications/Blender.app/Contents/MacOS/Blender --background fietser.blend --python anim.py          # houdingen (zit, staan, laag)
/Applications/Blender.app/Contents/MacOS/Blender --background fietser.blend --python uitrusting.py    # helm en schoenen
/Applications/Blender.app/Contents/MacOS/Blender --background fietser.blend --python export.py -- <pad>/fietser.glb
```

Daarna het bestand naar `models/fietser.glb` en `RIDER_V` in `js/fietser.js` ophogen. Eisen van Kees aan de fietser: frame onder
zadelhoogte, armen niet naar buiten, ketting via de derailleur, hoofd en wenkbrauwen zichtbaar onder de helm, geen vrouwversie.
Maak altijd eerst een kopie van `fietser.blend`.
