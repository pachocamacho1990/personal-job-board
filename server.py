#!/usr/bin/env python3
"""
Simple HTTP server for the job board application.
This allows localStorage to work properly (file:// URLs have security restrictions).
"""

import http.server
import socketserver
import os

PORT = 8000

os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"")
    print(f"✓ Job Board server running at http://localhost:{PORT}")
    print(f"✓ Open http://localhost:{PORT} in your browser")
    print(f"✓ Press Ctrl+C to stop the server")
    print(f"")
    httpd.serve_forever()
