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
| `js/planner.js` | Doelen, fases richting een evenement, weekindeling |
| `js/analyse.js` | Analyse van een rit, records, conditie en vermoeidheid |
| `js/bestanden.js` | Import (.fit, .tcx), export (.zwo, zip), downloads |
| `js/opslag.js` | Opslag in de browser |
| `js/bluetooth.js` | Trainer en hartslagmeter via Web Bluetooth |
| `js/player.js` | De workout player en de demo-modus |
| `js/grafieken.js` | Grafieken |
| `js/schermen.js` | Schermen en vensters |
| `js/acties.js` | Knoppen, toetsen en het opstarten van de app |

## Opslag

- localStorage-sleutel `kopwerk.v1`: instellingen, schema en ritten (`v: 1`).
- IndexedDB `kopwerk`, store `streams`: meetgegevens per rit (`s:<rit-id>`) en een lopende training (`active`).

Verander deze namen of het formaat niet zonder migratie, anders zijn bestaande gegevens niet meer leesbaar. Alle opslag loopt via `js/opslag.js`. Daar kan later ook synchronisatie op aansluiten.

## Lokaal testen

Start een eenvoudige webserver in deze map en open `http://localhost:8000`:

```bash
python3 -m http.server 8000
```

Web Bluetooth werkt alleen via https of op localhost, in Chrome of Edge. Zonder trainer kun je de demo-modus gebruiken (knop "Start demo" in de player).

## Publiceren

Elke push naar `main` werkt de site via GitHub Pages bij.
