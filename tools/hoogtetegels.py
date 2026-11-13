"""Hoogtes uit kaarttegels (Terrarium-formaat, zoom 12, bestandsnaam 12-<x>-<y>.png).

De tegels komen uit de open dataset Terrain Tiles (https://registry.opendata.aws/terrain-tiles/), bijvoorbeeld
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/<x>/<y>.png. Hoogte = R*256 + G + B/256 - 32768 meter.
Nodig: numpy en Pillow.
"""
import math, os
import numpy as np
from PIL import Image

class Tegels:
    def __init__(self, map_, zoom=12):
        self.map, self.z, self.cache = map_, zoom, {}

    def _tegel(self, tx, ty):
        k = (tx, ty)
        if k not in self.cache:
            p = os.path.join(self.map, f'{self.z}-{tx}-{ty}.png')
            if not os.path.exists(p): raise SystemExit(f'tegel ontbreekt: {p}')
            a = np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
            self.cache[k] = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
        return self.cache[k]

    def welke(self, lat0, lat1, lon0, lon1):
        """tegelnummers die een gebied bedekken (om te downloaden)"""
        n = 2 ** self.z; fx = lambda lo: int((lo + 180) / 360 * n)
        fy = lambda la: int((1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * n)
        return [(x, y) for x in range(fx(lon0), fx(lon1) + 1) for y in range(fy(lat1), fy(lat0) + 1)]

    def hoogte(self, lat, lon):
        """hoogte in meters voor rijen van breedte- en lengtegraden (tussen de pixels gemiddeld)"""
        lat = np.asarray(lat, float); lon = np.asarray(lon, float); n = 2 ** self.z * 256
        px = (lon + 180) / 360 * n - .5; py = (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n - .5
        x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); u = px - x0; v = py - y0
        def pix(x, y):
            out = np.empty(x.shape); tx = x // 256; ty = y // 256
            for k in set(zip(tx.ravel().tolist(), ty.ravel().tolist())):
                m = (tx == k[0]) & (ty == k[1]); out[m] = self._tegel(*k)[y[m] % 256, x[m] % 256]
            return out
        return (pix(x0, y0) * (1 - u) + pix(x0 + 1, y0) * u) * (1 - v) + (pix(x0, y0 + 1) * (1 - u) + pix(x0 + 1, y0 + 1) * u) * v
