#!/usr/bin/env python3
"""Testserver voor de 3D-wereld: serveert de app zonder tussenopslag en bewaart beelden die de testhulp opstuurt.

Gebruik:  python3 serve.py [poort] [map met de app] [map voor beelden]
Standaard: poort 8779 (of de omgevingsvariabele PORT, die het voorbeeldvenster zet), de app twee mappen boven dit bestand, beelden in 'shot' naast dit bestand.

Let op (Claude-desktopapp): het voorbeeldvenster mag niet in de map Bureaublad lezen. Zet daarom een kopie van de app en van dit
bestand in je scratchpad (tools/3d-test/sync.sh doet dat) en start de server daar. Zie tools/ROUTE-MAKEN.md.
"""
import os, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
HIER = os.path.dirname(os.path.abspath(__file__)); A = sys.argv[1:]
POORT = int(os.environ.get('PORT') or (A[0] if A else 8779)); APP = A[1] if len(A) > 1 else os.path.join(HIER, '..', '..'); SHOT = A[2] if len(A) > 2 else os.path.join(HIER, 'shot')
os.makedirs(SHOT, exist_ok=True); os.chdir(APP)
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open(os.path.join(SHOT, os.path.basename(self.path)), 'wb') as f: f.write(body)
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', POORT), H).serve_forever()
