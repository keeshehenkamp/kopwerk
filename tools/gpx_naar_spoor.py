#!/usr/bin/env python3
"""Maakt van een GPX-bestand het wegverloop voor een ontworpen route (js/routes/<id>-spoor.js).

Gebruik:  python3 tools/gpx_naar_spoor.py <bestand.gpx> <id> [--km 55] [--top 1909] [--tegels <map>]

Wat er gebeurt:
- het spoor wordt naar meters omgerekend (x = oost, y = noord, vanaf het eerste punt) en gesloten tot een ronde;
- knikken tussen de GPX-punten worden afgerond en bochten krapper dan --straal (standaard 9 m) iets verruimd,
  zodat camera en fietser niet schokken;
- de lengte wordt een heel aantal kilometers (--km, standaard afgerond): de wereld wordt per kilometer opgebouwd;
- de hoogte wordt gladgestreken (GPX-hoogtes haperen) en, met --top, zo geschaald dat het hoogste punt op die hoogte ligt;
  stukken steiler dan --steil (standaard 12,5%) zijn meestal meetfouten: het teveel wordt over de omgeving verdeeld;
- met --tegels komt de hoogte niet uit het GPX-bestand maar uit hoogtetegels (zie tools/hoogtetegels.py): dan ligt de weg
  precies op het land van tools/hoogte_naar_bin.py;
- het resultaat is één punt per 8 m, opgeslagen als verschillen in centimeters (klein bestand, exact terug te rekenen).

De waypoints uit het GPX-bestand komen mee als 'punten' (naam -> km langs de route): handig voor markeringen in het ontwerp.
Nodig: Python 3 met numpy.
"""
import re, math, sys, json, argparse
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('gpx'); ap.add_argument('id')
ap.add_argument('--km', type=float, default=0); ap.add_argument('--top', type=float, default=0)
ap.add_argument('--straal', type=float, default=9.0); ap.add_argument('--steil', type=float, default=12.5); ap.add_argument('--uit', default=''); ap.add_argument('--tegels', default='')
A = ap.parse_args()

t = open(A.gpx, encoding='utf-8').read()
P = np.array([(float(a), float(b), float(c)) for a, b, c in re.findall(r'<trkpt lat="([\d.\-]+)" lon="([\d.\-]+)">\s*<ele>([\d.\-]+)</ele>', t)])
W = [(float(a), float(b), n) for a, b, n in re.findall(r'<wpt lat="([\d.\-]+)" lon="([\d.\-]+)">\s*<name>([^<]+)</name>', t)]
lat0, lon0 = P[0, 0], P[0, 1]
ky = 111320.0; kx = ky * math.cos(math.radians(lat0))
x = (P[:, 1] - lon0) * kx; y = (P[:, 0] - lat0) * ky; e = P[:, 2]
# dubbele punten weg, ronde sluiten
keep = np.r_[True, np.hypot(np.diff(x), np.diff(y)) > .5]; x, y, e = x[keep], y[keep], e[keep]
gat = math.hypot(x[-1] - x[0], y[-1] - y[0])
if gat > 60: sys.exit(f'het spoor is geen ronde: begin en eind liggen {gat:.0f} m uit elkaar')
if gat < .5: x, y, e = x[:-1], y[:-1], e[:-1]

def dicht(x, y, e, stap=1.0):
    """gesloten lijn opnieuw bemonsteren op gelijke afstanden"""
    xs, ys, es = np.r_[x, x[0]], np.r_[y, y[0]], np.r_[e, e[0]]
    d = np.r_[0, np.cumsum(np.hypot(np.diff(xs), np.diff(ys)))]
    n = int(round(d[-1] / stap)); s = np.arange(n) * d[-1] / n
    return np.interp(s, d, xs), np.interp(s, d, ys), np.interp(s, d, es), d[-1]

def glad(v, sigma):
    """Gauss-filter rondom (de ronde loopt door)"""
    n = len(v); f = np.fft.rfftfreq(n); return np.fft.irfft(np.fft.rfft(v) * np.exp(-2 * (math.pi * f * sigma) ** 2), n)

def kromming(x, y):
    dx = (np.roll(x, -1) - np.roll(x, 1)) / 2; dy = (np.roll(y, -1) - np.roll(y, 1)) / 2
    ax = np.roll(x, -1) - 2 * x + np.roll(x, 1); ay = np.roll(y, -1) - 2 * y + np.roll(y, 1)
    return (dx * ay - dy * ax) / np.maximum(1e-9, (dx * dx + dy * dy) ** 1.5)

x1, y1, e1, L0 = dicht(x, y, e)
xs, ys = glad(x1, 5), glad(y1, 5)
for ronde in range(40):
    xs, ys, e1, Ls = dicht(xs, ys, e1)
    k = np.abs(kromming(xs, ys))
    if k.max() <= 1 / A.straal: break
    m = glad((k > 1 / A.straal).astype(float), 8); m = np.clip(m * 4, 0, 1)
    xs = xs * (1 - m) + glad(xs, 7) * m; ys = ys * (1 - m) + glad(ys, 7) * m
xs, ys, e1, Ls = dicht(xs, ys, e1)
if A.tegels:
    sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
    from hoogtetegels import Tegels
    e1 = Tegels(A.tegels).hoogte(lat0 + ys / ky, lon0 + xs / kx)
km = A.km or round(Ls / 1000); L = km * 1000.0
if abs(L / 1000 - round(L / 1000)) > 1e-6: sys.exit('--km moet een heel getal zijn')
f = L / Ls
xs = (xs - xs[0]) * f; ys = (ys - ys[0]) * f
es = glad(e1, (60 if A.tegels else 35) / (Ls / len(e1)))
h0 = float(es[0]); fh = (A.top - h0) / (es.max() - h0) if A.top else 1.0
hs = (es - h0) * fh
# te steile stukken: de helling aftoppen en het teveel over de omgeving (een paar honderd meter) verdelen
ds = L / len(hs); g = np.diff(np.r_[hs, hs[0]]) / ds; gm = A.steil / 100
for it in range(60):
    c = np.clip(g, -gm, gm); ex = g - c
    if np.abs(ex).max() < 1e-4: break
    g = c + glad(ex, 220 / ds)
hs = np.r_[0, np.cumsum(g * ds)][:-1]; fh2 = (A.top - h0) / hs.max() if A.top else 1.0; hs *= fh2
# één punt per 8 m, in hele centimeters
n = int(round(L / 8)); d = np.r_[0, np.cumsum(np.hypot(np.diff(np.r_[xs, xs[0]]), np.diff(np.r_[ys, ys[0]])))]
s = np.arange(n) * d[-1] / n
X = np.rint(np.interp(s, d, np.r_[xs, xs[0]]) * 100).astype(int); Y = np.rint(np.interp(s, d, np.r_[ys, ys[0]]) * 100).astype(int)
H = np.rint(np.interp(s, d, np.r_[hs, hs[0]]) * 100).astype(int)
X -= X[0]; Y -= Y[0]; H -= H[0]
# eerste verschillen rondom (som = 0), daarvan weer de verschillen: kleine getallen
def dd(v):
    d1 = np.diff(np.r_[v, v[0]]); return [int(d1[0])] + [int(q) for q in np.diff(d1)]
uit = {'km': int(km), 'stap': 8, 'h0': round(h0, 2), 'schaal': round(f, 5), 'lat0': lat0, 'lon0': lon0, 'x': dd(X), 'y': dd(Y), 'h': [int(q) for q in np.diff(np.r_[H, H[0]])]}
# waypoints -> km langs de route
pts = {}
for la, lo, nm in W:
    wx = (lo - lon0) * kx * f; wy = (la - lat0) * ky * f; j = int(np.argmin((X / 100 - wx) ** 2 + (Y / 100 - wy) ** 2))
    pts[nm] = round(j * 8 / 1000, 2)
uit['punten'] = pts
pad = A.uit or f'js/routes/{A.id}-spoor.js'
open(pad, 'w', encoding='utf-8').write("'use strict';\n/* Gemaakt met tools/gpx_naar_spoor.py; niet met de hand aanpassen. Eén punt per 8 m: x en y als verschillen van\n   verschillen in centimeters (x = oost, y = noord), h als verschillen in centimeters boven het startpunt. */\n"
    + f"(window.ROUTE_SPOOR=window.ROUTE_SPOOR||{{}}).{A.id}=" + json.dumps(uit, ensure_ascii=False, separators=(',', ':')) + ";\n")
# verslag
hd = np.unwrap(np.arctan2(np.diff(np.r_[X, X[0]]), np.diff(np.r_[Y, Y[0]])))
g100 = (np.roll(H, -6) - np.roll(H, 6)) / 100 / 96 * 100
print(f'{pad}: {len(open(pad).read()) // 1024} kB')
print(f'lengte {Ls / 1000:.2f} km -> {km:.0f} km (schaal {f:.4f}), stijging {np.clip(np.diff(np.r_[H, H[0]]), 0, None).sum() / 100:.0f} m, hoogste punt {h0 + H.max() / 100:.0f} m (hoogtes x {fh:.3f})')
print(f'steilste 100 m: {g100.max():.1f}% omhoog, {g100.min():.1f}% omlaag; krapste bocht: straal {1 / np.abs(kromming(xs, ys)).max():.1f} m; draaiing van de ronde {(hd[-1] - hd[0]) / math.pi * 180:.0f} graden')
hp = []
for i in range(5, n - 5):
    if abs(hd[i + 5] - hd[i - 5]) > math.radians(120) and (not hp or i * 8 - hp[-1] > 120): hp.append(i * 8)
print('haarspeldbochten bij km:', ' '.join(f'{q / 1000:.2f}' for q in hp))
print('punten:', pts)
