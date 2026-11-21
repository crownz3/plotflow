"""Simple HTTP Server with SPA fallback routing for Angular HTML5 pushState routing."""
import http.server
import socketserver
import os
import sys

PORT = 4200
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'estate-broker-crm', 'browser')

class SPANavigationHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Resolve requested file path
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(os.path.join(path, 'index.html')):
            # Fallback to index.html for SPA routing
            self.path = '/index.html'
        return super().do_GET()

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SPANavigationHandler) as httpd:
        print(f"EstateFlow SPA Server running at http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()
