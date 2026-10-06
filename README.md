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
| `js/grafieken.js` | Grafieken |
| `js/ai.js` | AI-coach: Claude onderzoekt het evenement (route, hoogtemeters, hellingen); richtvermogen per helling |
| `js/schermen.js` | Schermen en vensters |
| `js/acties.js` | Knoppen, toetsen en het opstarten van de app |

## Opslag

- localStorage-sleutel `kopwerk.v1`: instellingen, schema en ritten (`v: 1`).
- IndexedDB `kopwerk`, store `streams`: meetgegevens per rit (`s:<rit-id>`) en een lopende training (`active`).
- Sinds de coach bevat de state ook `event.kind` en `event.km` (soort en afstand van het evenement), `started` (eerste dag met een schema) en `plog` (wat er per voorbije dag gepland stond, zodat het verleden niet verschuift), en `prog` (trede per soort training op de opbouwladder, bijgewerkt na elke rit met je gevoel en de uitvoering). Ritten krijgen `lvl`, de trede waarop ze gereden zijn. Dit zijn toevoegingen; oude gegevens werken zonder migratie.

- localStorage-sleutel `kopwerk.ai`: de Claude API-sleutel, los van de state zodat hij niet in back-ups komt. Het onderzochte evenement staat in `event.profile`.

Verander deze namen of het formaat niet zonder migratie, anders zijn bestaande gegevens niet meer leesbaar. Alle opslag loopt via `js/opslag.js`. Daar kan later ook synchronisatie op aansluiten.

## Lokaal testen

Start een eenvoudige webserver in deze map en open `http://localhost:8000`:

```bash
python3 -m http.server 8000
```

Web Bluetooth werkt alleen via https of op localhost, in Chrome of Edge. Zonder trainer kun je de demo-modus gebruiken (knop "Start demo" in de player).

## Publiceren

Elke push naar `main` werkt de site via GitHub Pages bij.
