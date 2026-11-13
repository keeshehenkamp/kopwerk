#!/usr/bin/env python3
"""Maakt de hoogtekaart van het land rond een route: models/<id>-hoogte.bin en js/routes/<id>-hoogte.js.

Gebruik:  python3 tools/hoogte_naar_bin.py <id> <map met tegels> [--rand 1600] [--ver 12000]
          python3 tools/hoogte_naar_bin.py <id> --welke        (toont welke tegels nodig zijn)

Leest js/routes/<id>-spoor.js (van tools/gpx_naar_spoor.py) voor de ligging van de route. Twee rasters in meters van de route
(x = oost, y = noord, vanaf de start): 'binnen' om de 32 m tot --rand meter voorbij de route, 'buiten' om de 160 m tot --ver meter
(voor de bergen aan de horizon). Hoogtes als hele getallen van 0,25 m boven zeeniveau (Uint16), eerst binnen en dan buiten,
rij voor rij van zuid naar noord.
"""
import sys, json, math, argparse, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hoogtetegels import Tegels

ap = argparse.ArgumentParser(); ap.add_argument('id'); ap.add_argument('tegels', nargs='?', default='')
ap.add_argument('--rand', type=float, default=1600); ap.add_argument('--ver', type=float, default=12000); ap.add_argument('--welke', action='store_true')
A = ap.parse_args()
t = open(f'js/routes/{A.id}-spoor.js', encoding='utf-8').read(); S = json.loads(t[t.index('={') + 1:t.rindex(';')])
d1 = np.cumsum(S['x']); X = np.r_[0, np.cumsum(d1)][:-1] / 100; d1 = np.cumsum(S['y']); Y = np.r_[0, np.cumsum(d1)][:-1] / 100
f = S['schaal']; ky = 111320.0; kx = ky * math.cos(math.radians(S['lat0']))
ll = lambda x, y: (S['lat0'] + y / f / ky, S['lon0'] + x / f / kx)

def raster(rand, cel):
    x0 = math.floor((X.min() - rand) / cel) * cel; y0 = math.floor((Y.min() - rand) / cel) * cel
    nx = int(math.ceil((X.max() + rand - x0) / cel)) + 1; ny = int(math.ceil((Y.max() + rand - y0) / cel)) + 1
    return dict(x0=x0, y0=y0, cel=cel, nx=nx, ny=ny)
B, U = raster(A.rand, 32), raster(A.ver, 160)
T = Tegels(A.tegels)
if A.welke:
    la0, lo0 = ll(U['x0'], U['y0']); la1, lo1 = ll(U['x0'] + U['nx'] * U['cel'], U['y0'] + U['ny'] * U['cel'])
    for x, y in T.welke(la0, la1, lo0, lo1): print(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/{x}/{y}.png  ->  12-{x}-{y}.png')
    sys.exit()
delen = []
for R in (B, U):
    gx, gy = np.meshgrid(R['x0'] + np.arange(R['nx']) * R['cel'], R['y0'] + np.arange(R['ny']) * R['cel'])
    la, lo = ll(gx, gy); h = T.hoogte(la, lo)
    delen.append(np.clip(np.rint(h * 4), 0, 65535).astype('<u2')); R['min'] = round(float(h.min())); R['max'] = round(float(h.max()))
open(f'models/{A.id}-hoogte.bin', 'wb').write(b''.join(d.tobytes() for d in delen))
open(f'js/routes/{A.id}-hoogte.js', 'w', encoding='utf-8').write("'use strict';\n/* Gemaakt met tools/hoogte_naar_bin.py; niet met de hand aanpassen. Ligging van de hoogtekaart in models/"
    + f"{A.id}-hoogte.bin:\n   twee rasters (binnen fijn, buiten grof) in meters van de route, hoogtes in stappen van 0,25 m boven zeeniveau. */\n"
    + f"(window.ROUTE_HOOGTE=window.ROUTE_HOOGTE||{{}}).{A.id}=" + json.dumps({'bestand': f'models/{A.id}-hoogte.bin', 'binnen': B, 'buiten': U}, separators=(',', ':')) + ";\n")
print(f"models/{A.id}-hoogte.bin: {os.path.getsize(f'models/{A.id}-hoogte.bin') // 1024} kB; binnen {B['nx']}x{B['ny']} ({B['min']}-{B['max']} m), buiten {U['nx']}x{U['ny']} ({U['min']}-{U['max']} m)")
