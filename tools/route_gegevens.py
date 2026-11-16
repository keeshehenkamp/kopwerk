#!/usr/bin/env python3
"""Haalt de open gegevens op die een route nodig heeft: hoogtetegels (voor bergen) en OpenStreetMap (voor vlak land).

Gebruik:  python3 tools/route_gegevens.py <id> tegels <map>            toont wat er opgehaald zou worden
          python3 tools/route_gegevens.py <id> tegels <map> --ja       haalt de ontbrekende tegels op
          python3 tools/route_gegevens.py <id> osm <bestand.json>       toont de vraag aan de Overpass-API
          python3 tools/route_gegevens.py <id> osm <bestand.json> --ja  haalt de gegevens op (kan een halve minuut duren)

Zonder --ja wordt er niets opgehaald: eerst aan Kees vragen of het mag (zie tools/ROUTE-MAKEN.md).
Leest js/routes/<id>-spoor.js (van tools/gpx_naar_spoor.py) voor de ligging van de route.
- tegels: Terrain Tiles (terrarium, zoom 12), dezelfde lijst als 'tools/hoogte_naar_bin.py <id> --welke'. Daarna: hoogte_naar_bin.py.
- osm: water, gebouwen, bos, bomenrijen, losse bomen, molens en forten binnen --rand meter (standaard 1000) rond de route,
  als 'out geom'. Daarna: osm_naar_kaart.py. (c) OpenStreetMap-bijdragers (ODbL).
"""
import sys, os, json, math, subprocess, argparse, urllib.request, urllib.parse
import numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('id'); ap.add_argument('wat', choices=['tegels', 'osm']); ap.add_argument('doel')
ap.add_argument('--ja', action='store_true'); ap.add_argument('--rand', type=float, default=1000)
A = ap.parse_args(); HIER = os.path.dirname(os.path.abspath(__file__)); UA = {'User-Agent': 'kopwerk-route/1.0 (hobbyproject)'}
if A.wat == 'tegels':
    uit = subprocess.run([sys.executable, os.path.join(HIER, 'hoogte_naar_bin.py'), A.id, '--welke'], capture_output=True, text=True, check=True).stdout
    lijst = [r.split('  ->  ') for r in uit.strip().splitlines() if '  ->  ' in r]; mis = [(u.strip(), n.strip()) for u, n in lijst if not os.path.exists(os.path.join(A.doel, n.strip()))]
    print(f'{len(lijst)} tegels nodig, {len(mis)} ontbreken in {A.doel} (elk ongeveer 100 kB, van s3.amazonaws.com/elevation-tiles-prod)')
    if not A.ja: sys.exit('niets opgehaald: voeg --ja toe als het mag')
    os.makedirs(A.doel, exist_ok=True)
    for i, (u, n) in enumerate(mis):
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r: open(os.path.join(A.doel, n), 'wb').write(r.read())
        print(f'\r{i + 1}/{len(mis)}', end='', flush=True)
    print('\nklaar')
else:
    t = open(f'js/routes/{A.id}-spoor.js', encoding='utf-8').read(); S = json.loads(t[t.index('={') + 1:t.rindex(';')])
    X = np.r_[0, np.cumsum(np.cumsum(S['x']))][:-1] / 100; Y = np.r_[0, np.cumsum(np.cumsum(S['y']))][:-1] / 100
    f = S['schaal']; ky = 111320.0; kx = ky * math.cos(math.radians(S['lat0'])); r = A.rand
    bb = f"{S['lat0'] + (Y.min() - r) / f / ky:.5f},{S['lon0'] + (X.min() - r) / f / kx:.5f},{S['lat0'] + (Y.max() + r) / f / ky:.5f},{S['lon0'] + (X.max() + r) / f / kx:.5f}"
    q = f"""[out:json][timeout:180][bbox:{bb}];
(way["natural"="water"];relation["natural"="water"];
 way["building"];relation["building"];way["amenity"="place_of_worship"];
 way["natural"~"^(wood|scrub|tree_row)$"];relation["natural"~"^(wood|scrub)$"];
 way["landuse"~"^(forest|orchard)$"];relation["landuse"~"^(forest|orchard)$"];
 node["natural"="tree"];node["man_made"="windmill"];way["man_made"="windmill"];way["historic"~"^(fort|castle|manor)$"];);
out geom;"""
    print(f'gebied {bb} ({(X.max() - X.min() + 2 * r) / 1000:.1f} x {(Y.max() - Y.min() + 2 * r) / 1000:.1f} km)\n{q}')
    if not A.ja: sys.exit('niets opgehaald: voeg --ja toe als het mag')
    fout = None
    for srv in ('https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter'):
        try:
            with urllib.request.urlopen(urllib.request.Request(srv, data=urllib.parse.urlencode({'data': q}).encode(), headers=UA), timeout=300) as rr: d = rr.read()
            json.loads(d); open(A.doel, 'wb').write(d); print(f'{A.doel}: {len(d) / 1e6:.1f} MB van {srv}'); break
        except Exception as e: fout = e; print('lukte niet bij', srv, e)
    else: sys.exit(f'geen gegevens: {fout}')
