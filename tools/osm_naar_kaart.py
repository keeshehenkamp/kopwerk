#!/usr/bin/env python3
"""Maakt van OpenStreetMap-gegevens de kaart rond een route: js/routes/<id>-kaart.js.

Gebruik:  python3 tools/osm_naar_kaart.py <id> <osm.json> [--water 900] [--gebouwen 260] [--bomen 300]

<osm.json> komt van de Overpass-API (out geom) met water, waterlopen, gebouwen, bos, bomenrijen en losse bomen
rond de route. Leest js/routes/<id>-spoor.js voor de ligging. Alles wordt omgerekend naar meters van de route
(x = oost, y = noord), vereenvoudigd en beperkt tot wat je vanaf de weg ziet:
- water: vlakken; 'hoog' = boezemwater buiten de ronde (rivieren langs de dijk), 'laag' = sloten en plassen in de polder;
- gebouwen: plaats, breedte, diepte, richting en soort (0 huis, 1 boerderij, 2 grote schuur, 3 kerk);
- bomen: losse punten uit bosvlakken, bomenrijen en losse bomen (soort 0 loofboom, 1 rij, 2 struik, 3 fruit).
Coördinaten in halve meters, per lijn als beginpunt plus verschillen. Het verslag noemt bruggen (waar de route boezemwater
kruist) en bijzondere punten (molen, fort, kerk) als km langs de route, kant (1 = rechts) en afstand tot de weg.
© OpenStreetMap-bijdragers (ODbL). Nodig: numpy.
"""
import sys, json, math, argparse
import numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('id'); ap.add_argument('osm')
ap.add_argument('--water', type=float, default=900); ap.add_argument('--gebouwen', type=float, default=260); ap.add_argument('--bomen', type=float, default=300)
A = ap.parse_args()
t = open(f'js/routes/{A.id}-spoor.js', encoding='utf-8').read(); S = json.loads(t[t.index('={') + 1:t.rindex(';')])
RX = np.r_[0, np.cumsum(np.cumsum(S['x']))][:-1] / 100; RY = np.r_[0, np.cumsum(np.cumsum(S['y']))][:-1] / 100; NR = len(RX)
f = S['schaal']; ky = 111320.0; kx = ky * math.cos(math.radians(S['lat0']))
xy = lambda g: np.array([((p['lon'] - S['lon0']) * kx * f, (p['lat'] - S['lat0']) * ky * f) for p in g])

def afst(P):
    """per punt: afstand tot de route, index van het dichtstbijzijnde routepunt"""
    P = np.atleast_2d(P); d = np.empty(len(P)); k = np.empty(len(P), int)
    for i in range(0, len(P), 4000):
        q = P[i:i + 4000]; D = (q[:, None, 0] - RX[None, :]) ** 2 + (q[:, None, 1] - RY[None, :]) ** 2; k[i:i + 4000] = D.argmin(1); d[i:i + 4000] = np.sqrt(D.min(1))
    return d, k
def opp(P): return .5 * float(np.sum(P[:, 0] * np.roll(P[:, 1], -1) - np.roll(P[:, 0], -1) * P[:, 1]))
def binnen(P, x, y):
    inn = False; j = len(P) - 1
    for i in range(len(P)):
        if (P[i, 1] > y) != (P[j, 1] > y) and x < (P[j, 0] - P[i, 0]) * (y - P[i, 1]) / (P[j, 1] - P[i, 1]) + P[i, 0]: inn = not inn
        j = i
    return inn
def dp(P, tol):
    """Douglas-Peucker: punten weglaten die minder dan tol van de lijn afwijken"""
    if len(P) < 3: return P
    if np.allclose(P[0], P[-1]):   # gesloten ring: in twee helften, vanaf het verste punt
        m = int(np.hypot(*(P - P[0]).T).argmax()); return np.vstack([dp(P[:m + 1], tol), dp(P[m:], tol)[1:]])
    keep = np.zeros(len(P), bool); keep[0] = keep[-1] = True; st = [(0, len(P) - 1)]
    while st:
        a, b = st.pop()
        if b - a < 2: continue
        v = P[b] - P[a]; L = math.hypot(*v) or 1e-9; d = np.abs((P[a + 1:b, 0] - P[a, 0]) * v[1] - (P[a + 1:b, 1] - P[a, 1]) * v[0]) / L; i = int(d.argmax())
        if d[i] > tol: keep[a + 1 + i] = True; st += [(a, a + 1 + i), (a + 1 + i, b)]
    return P[keep]
def code(P):
    q = np.rint(P * 2).astype(int); d = np.diff(q, axis=0); return [int(q[0, 0]), int(q[0, 1])] + [int(v) for v in d.ravel()]
def kant(P0):
    """km langs de route, kant (1 rechts, -1 links) en afstand voor één punt"""
    d, k = afst(P0); k = int(k[0]); a = np.array([RX[(k + 1) % NR] - RX[k - 1], RY[(k + 1) % NR] - RY[k - 1]]); v = np.array([P0[0] - RX[k], P0[1] - RY[k]])
    return round(k * 8 / 1000, 2), (1 if a[0] * v[1] - a[1] * v[0] < 0 else -1), round(float(d[0]))

E = json.load(open(A.osm, encoding='utf-8'))['elements']
ROUTE = np.c_[RX, RY]; links = opp(ROUTE) > 0   # tegen de klok in: binnenkant ligt links
water, gebouwen, bomen, punten = [], [], [], []
rng = np.random.default_rng(7)
def ringen(e):
    if e['type'] == 'way' and 'geometry' in e: return [xy(e['geometry'])]
    if e['type'] == 'relation': return [xy(m['geometry']) for m in e.get('members', []) if m.get('role') == 'outer' and 'geometry' in m and len(m['geometry']) > 3 and m['geometry'][0] == m['geometry'][-1]]
    return []
for e in E:
    T = e.get('tags', {})
    if e['type'] == 'node':
        p = np.array([(e['lon'] - S['lon0']) * kx * f, (e['lat'] - S['lat0']) * ky * f])
        if T.get('man_made') == 'windmill': punten.append(('molen ' + T.get('name', ''),) + kant(p))
        elif T.get('natural') == 'tree' and afst(p)[0][0] < A.bomen: bomen.append((p[0], p[1], 0))
        continue
    if T.get('natural') == 'water':
        for P in ringen(e):
            if len(P) < 4: continue
            a = abs(opp(P)); d = afst(P)[0].min()
            if a < 30 or d > (A.water * 1.7 if a > 3000 else A.water * .7): continue
            c = P[:-1].mean(0); buiten = not binnen(ROUTE, c[0], c[1])
            hoog = buiten and (a > 2500 or T.get('water') in ('river', 'canal'))
            Q = dp(P, 1.5 if a > 3000 else 1.0)
            if len(Q) >= 4: water.append((1 if hoog else 0, a, Q))
    elif 'building' in T or T.get('amenity') == 'place_of_worship':
        P = xy(e['geometry']) if 'geometry' in e else None
        if P is None or len(P) < 4: continue
        c = P[:-1].mean(0); d = afst(c)[0][0]
        if d > A.gebouwen: continue
        best = None   # kleinste omhullende rechthoek langs een van de zijden
        for i in range(len(P) - 1):
            v = P[i + 1] - P[i]; L = math.hypot(*v)
            if L < .5: continue
            u = v / L; n = np.array([-u[1], u[0]]); a = P @ u; b = P @ n; w, h = a.max() - a.min(), b.max() - b.min()
            if best is None or w * h < best[0]: best = (w * h, w, h, math.atan2(u[1], u[0]), (a.max() + a.min()) / 2 * u + (b.max() + b.min()) / 2 * n)
        if best is None: continue
        _, w, h, ang, mid = best
        if w < h: w, h = h, w; ang += math.pi / 2          # ang = richting van de lange zijde
        if w * h < (10 if d < 45 else 28): continue
        b = T.get('building', '')
        srt = 3 if b in ('church', 'chapel', 'cathedral') or T.get('amenity') == 'place_of_worship' else 1 if b in ('farm', 'farm_auxiliary', 'barn', 'stable', 'cowshed') and w > 12 else 2 if w * h > 420 else 0
        if T.get('man_made') == 'windmill' or b == 'windmill': punten.append(('molen ' + T.get('name', ''),) + kant(mid)); continue
        if srt == 3: punten.append(('kerk ' + T.get('name', ''),) + kant(mid) + (round(w), round(h)))
        gebouwen.append([int(round(mid[0] * 2)), int(round(mid[1] * 2)), int(round(h * 10)), int(round(w * 10)), int(round(math.degrees(ang))) % 180, srt])
    elif T.get('natural') in ('wood', 'scrub') or T.get('landuse') in ('forest', 'orchard'):
        srt = 2 if T.get('natural') == 'scrub' else 3 if T.get('landuse') == 'orchard' else 0
        for P in ringen(e):
            if len(P) < 4 or afst(P)[0].min() > A.bomen: continue
            x0, y0 = P.min(0); x1, y1 = P.max(0); stap = 5 if srt == 2 else 7.5
            for x in np.arange(x0, x1, stap):
                for y in np.arange(y0, y1, stap):
                    q = (x + rng.uniform(0, stap * .8), y + rng.uniform(0, stap * .8))
                    if binnen(P, *q): bomen.append((q[0], q[1], srt))
    elif T.get('natural') == 'tree_row' and 'geometry' in e:
        P = xy(e['geometry'])
        if afst(P)[0].min() > A.bomen: continue
        d = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
        for s in np.arange(0, d[-1], 9): bomen.append((float(np.interp(s, d, P[:, 0])), float(np.interp(s, d, P[:, 1])), 1))
    elif T.get('historic') in ('fort', 'castle', 'manor') and 'geometry' in e:
        punten.append((T['historic'] + ' ' + T.get('name', ''),) + kant(xy(e['geometry'])[:-1].mean(0)))
# bomen: niet verder dan gevraagd en niet op de weg
B = np.array(bomen) if bomen else np.zeros((0, 3)); d = afst(B[:, :2])[0] if len(B) else np.zeros(0); B = B[(d < A.bomen) & (d > 4.5)]
# bruggen: stukken van de route die door boezemwater lopen
hoog = [w for w in water if w[0]]
nat = np.array([any(binnen(Q, RX[i], RY[i]) for _, _, Q in hoog if Q[:, 0].min() < RX[i] < Q[:, 0].max() and Q[:, 1].min() < RY[i] < Q[:, 1].max()) for i in range(NR)])
bruggen = []; i = 0
while i < NR:
    if nat[i]:
        j = i
        while j < NR and nat[j]: j += 1
        bruggen.append((round((i + j) / 2 * 8 / 1000, 3), (j - i) * 8 + 10)); i = j
    else: i += 1
uit = {'water': [[h] + code(Q) for h, a, Q in sorted(water, key=lambda w: -w[1])], 'gebouwen': gebouwen,
       'bomen': [[int(round(x * 2)), int(round(y * 2)), int(s)] for x, y, s in B]}
pad = f'js/routes/{A.id}-kaart.js'
open(pad, 'w', encoding='utf-8').write("'use strict';\n/* Gemaakt met tools/osm_naar_kaart.py uit OpenStreetMap (© OpenStreetMap-bijdragers, ODbL); niet met de hand aanpassen.\n   Coördinaten in halve meters van de route. water: [hoog, x, y, dx, dy, ...]; gebouwen: [x, y, breedte, diepte (dm), richting lange zijde (graden), soort];\n   bomen: [x, y, soort]. */\n"
    + f"(window.ROUTE_KAART=window.ROUTE_KAART||{{}}).{A.id}=" + json.dumps(uit, separators=(',', ':')) + ";\n")
import os
print(f"{pad}: {os.path.getsize(pad) // 1024} kB; water {len(water)} vlakken ({len(hoog)} hoog, {sum(len(w[2]) for w in water)} punten), gebouwen {len(gebouwen)}, bomen {len(B)}")
print('bruggen (km, lengte):', bruggen)
for p in sorted(set(punten), key=lambda p: p[1]): print('punt:', p)
