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
| `js/wereld.js` | 3D-rit (three.js): routes als rondjes met een eigen hoogteprofiel (`ROUTES`), snelheid uit vermogen, gewicht en helling, landschappen met dorpen en herkenningspunten, publiek, weer en tijd van de dag, tempomaker, punten en sterren, productdemo. Een kilometer wereld wordt in stapjes van een paar ms opgebouwd (`chunkJob`), zodat het beeld niet hapert |
| `js/grafieken.js` | Grafieken |
| `models/kenney.bin`, `models/kenney.json` | 46 gratis 3D-modellen van [Kenney](https://kenney.nl) (CC0): bomen, struiken, rotsen, hout, bloemen en auto's, met ingebakken natuurlijke kleuren. Opnieuw maken met `python3 tools/kenney.py <map met uitgepakte Kenney-pakketten>` (Nature Kit en Car Kit) |
| `js/ai.js` | AI-coach: Claude onderzoekt het evenement (route, hoogtemeters, hellingen); richtvermogen per helling |
| `js/schermen.js` | Schermen en vensters |
| `js/acties.js` | Knoppen, toetsen en het opstarten van de app |

## Opslag

- localStorage-sleutel `kopwerk.v1`: instellingen, schema en ritten (`v: 1`).
- IndexedDB `kopwerk`, store `streams`: meetgegevens per rit (`s:<rit-id>`) en een lopende training (`active`).
- Sinds de coach bevat de state ook `event.kind` en `event.km` (soort en afstand van het evenement), `started` (eerste dag met een schema) en `plog` (wat er per voorbije dag gepland stond, zodat het verleden niet verschuift), en `prog` (trede per soort training op de opbouwladder, bijgewerkt na elke rit met je gevoel en de uitvoering). Ritten krijgen `lvl`, de trede waarop ze gereden zijn. Dit zijn toevoegingen; oude gegevens werken zonder migratie.

- localStorage-sleutel `kopwerk.ai`: de Claude API-sleutel, los van de state zodat hij niet in back-ups komt. Het onderzochte evenement staat in `event.profile`.

- `ftpGiven`: de dag waarop je bij de start zelf een FTP invulde. De coach telt dat als test, dus de eerste FTP-test komt pas na zes weken. Ritten krijgen `rpeAdj` als hun trede uit je gevoel komt; pas je je gevoel later aan, dan rekent de coach die trede opnieuw uit (zolang er geen nieuwere rit van die soort is beoordeeld).
- Van demo-ritten (`sim`) bewaart de app alleen de laatste. Ze tellen niet mee in het schema, de kalender of je beste ritten.

- Synchronisatie (Firebase, inloggen met Google) kiest per kant het nieuwste op basis van `updatedAt`. Alleen echte wijzigingen verhogen die (`save()`); wat de app zelf afleidt, zoals de planlog en records, bewaart met `save(false)`. Terug in de app of het tabblad haalt de app wijzigingen van je andere apparaat op.

Verander deze namen of het formaat niet zonder migratie, anders zijn bestaande gegevens niet meer leesbaar. Alle opslag loopt via `js/opslag.js`. Daar kan later ook synchronisatie op aansluiten.

## Laptop en telefoon

Rijden met je trainer kan alleen in een browser met Web Bluetooth: Chrome of Edge op je laptop (of Chrome op Android). Op een telefoon of tablet zonder Bluetooth, zoals een iPhone, toont de app geen startknoppen: daar plan je, pas je je tijd aan en kijk je je ritten terug. Log op beide in met Google, dan zie je overal hetzelfde.

## Routes

Een route in `ROUTES` (js/wereld.js) is een ronde van een heel aantal kilometers: landschappen (`zones`, in km) en klimmen (`klim`: begin km, lengte km, gemiddeld %). Na elke klim volgt vanzelf een afdaling, zodat de ronde op dezelfde hoogte sluit. De gekozen route staat per apparaat in localStorage (`kopwerk.route`). Zonder ERG, en bij vrij rijden na de training, stuurt de app de helling van de route naar de trainer.

## Als app op je telefoon

`manifest.webmanifest` en de iconen in `icons/` maken dat je Kopwerk via "Zet op beginscherm" als losse app kunt openen, zonder browserbalken. Let op: op een iPhone heeft die app een eigen opslag, los van Safari. Neem je gegevens mee met een back-up (Profiel, Je gegevens: downloaden in Safari, terugzetten in de app) of door in te loggen met Google (Profiel, Koppelingen).

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
