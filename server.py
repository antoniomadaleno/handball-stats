#!/usr/bin/env python3
"""
Servidor de desenvolvimento — Handball Stats
Corre com: python3 serve.py
Abre no browser: http://localhost:8000
Hot-reload automático quando ficheiros mudam.
"""

import http.server
import socketserver
import webbrowser
import threading
import os
import json
import time
from pathlib import Path

PORT = 8080
DIR  = Path(__file__).parent.resolve()

# ── Hot-reload via Server-Sent Events ──────
_clients = []
_clients_lock = threading.Lock()

def notify_reload():
    with _clients_lock:
        dead = []
        for q in _clients:
            try:
                q.put('reload')
            except Exception:
                dead.append(q)
        for q in dead:
            _clients.remove(q)

def watch_files():
    """Observa alterações em .html, .css, .js e notifica clientes."""
    import queue
    watched = {}
    exts = {'.html', '.css', '.js'}

    def get_mtimes():
        mtimes = {}
        for path in DIR.rglob('*'):
            if path.suffix in exts and '.git' not in path.parts:
                try:
                    mtimes[str(path)] = path.stat().st_mtime
                except:
                    pass
        return mtimes

    watched = get_mtimes()
    while True:
        time.sleep(0.5)
        current = get_mtimes()
        changed = [f for f, t in current.items() if watched.get(f) != t]
        new_files = [f for f in current if f not in watched]
        if changed or new_files:
            for f in changed + new_files:
                rel = Path(f).relative_to(DIR)
                print(f"  ↻  {rel}")
            notify_reload()
        watched = current


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIR), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Endpoint SSE para hot-reload
        if self.path == '/__reload__':
            import queue
            q = queue.Queue()
            with _clients_lock:
                _clients.append(q)
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            try:
                while True:
                    try:
                        msg = q.get(timeout=30)
                        self.wfile.write(b'data: reload\n\n')
                        self.wfile.flush()
                    except queue.Empty:
                        # Keepalive ping
                        self.wfile.write(b': ping\n\n')
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                with _clients_lock:
                    if q in _clients:
                        _clients.remove(q)
            return
        super().do_GET()

    def log_message(self, format, *args):
        path = args[0] if args else ''
        if any(ext in str(path) for ext in ['.css', '.ico', '.png', '.jpg', '.svg', 'fonts', '__reload__']):
            return
        print(f"  {args[0]} {args[1]}")


def inject_reload_script(html):
    """Injeta o script de hot-reload no HTML antes de </body>."""
    script = b'''<script>
(function(){
  var es = new EventSource('/__reload__');
  es.onmessage = function(e){
    if(e.data === 'reload') {
      console.log('[dev] reload');
      location.reload();
    }
  };
  es.onerror = function(){
    setTimeout(function(){ location.reload(); }, 1000);
  };
})();
</script>'''
    return html.replace(b'</body>', script + b'</body>')


# Patch para injetar script no HTML
_orig_copyfile = http.server.SimpleHTTPRequestHandler.copyfile

def patched_copyfile(self, source, outputfile):
    if hasattr(self, 'path') and (self.path == '/' or self.path.endswith('.html') or self.path == ''):
        content = source.read()
        if b'</body>' in content:
            content = inject_reload_script(content)
        import io
        outputfile.write(content)
    else:
        _orig_copyfile(self, source, outputfile)

Handler.copyfile = patched_copyfile


def open_browser():
    time.sleep(0.6)
    webbrowser.open(f'http://localhost:{PORT}')


if __name__ == '__main__':
    os.chdir(DIR)
    print(f"\n  🤾 Handball Stats — servidor de desenvolvimento")
    print(f"  URL:      http://localhost:{PORT}")
    print(f"  Reload:   automático ao guardar ficheiros")
    print(f"  Stop:     Ctrl+C\n")

    threading.Thread(target=watch_files, daemon=True).start()
    threading.Thread(target=open_browser, daemon=True).start()

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n  Servidor parado.\n")