#!/usr/bin/env python3
"""
Simple HTTP server for the Malaniuk Archive Catalog
Serves files with proper CORS headers to avoid browser restrictions
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import unquote

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8000

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with CORS headers"""
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS request for CORS preflight"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom log format with emojis"""
        message = format % args
        if "GET" in message:
            if ".html" in message:
                print(f"📄 {message}")
            elif ".json" in message:
                print(f"📊 {message}")
            elif ".css" in message or ".js" in message:
                print(f"🎨 {message}")
            else:
                print(f"📁 {message}")
        else:
            print(f"ℹ️ {message}")

def start_server():
    """Start the HTTP server"""
    print("=" * 50)
    print("🚀 Malaniuk Archive Catalog Server")
    print("=" * 50)
    
    # Change to the directory containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print(f"✅ Server running at: http://localhost:{PORT}")
        print(f"📂 Serving directory: {os.getcwd()}")
        print("-" * 50)
        print("📌 Available catalogs:")
        print(f"   • http://localhost:{PORT}/archive_catalog_enhanced.html")
        print(f"   • http://localhost:{PORT}/archive_catalog_standalone.html")
        print(f"   • http://localhost:{PORT}/archive_catalog.html (original)")
        print("-" * 50)
        print("⚡ Press Ctrl+C to stop the server")
        print("=" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n" + "=" * 50)
            print("🛑 Server stopped")
            print("=" * 50)
            sys.exit(0)

if __name__ == "__main__":
    start_server()