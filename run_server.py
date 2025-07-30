#!/usr/bin/env python3

"""
Simple script to run the marketplace app on different ports
"""

import subprocess
import sys
from app import app

def find_free_port():
    """Find an available port"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

if __name__ == '__main__':
    ports_to_try = [8000, 5000, 3000, 8080, 9000]
    
    for port in ports_to_try:
        try:
            print(f"\n🚀 Starting marketplace on port {port}")
            print(f"📱 Open your browser and go to: http://localhost:{port}")
            print("🛑 Press Ctrl+C to stop the server")
            print("-" * 50)
            
            app.run(debug=True, host='127.0.0.1', port=port)
            break
        except OSError as e:
            print(f"❌ Port {port} is busy: {e}")
            continue
    else:
        # If all ports are busy, find a free one
        free_port = find_free_port()
        print(f"\n🚀 All common ports busy, using port {free_port}")
        print(f"📱 Open your browser and go to: http://localhost:{free_port}")
        app.run(debug=True, host='127.0.0.1', port=free_port)