#!/usr/bin/env python3

"""
Main entry point for the Marketplace Flask application - SIMPLIFIED VERSION
"""

import os
import sys
import socket

# Add the parent directory to Python path to import original modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the original working app
from app import app

if __name__ == '__main__':
    # Development server configuration
    hostname = socket.gethostname()
    print(f"🚀 Starting Restructured Marketplace Backend")
    print(f"Server running on {hostname}")
    print("Access the app at:")
    print("  - http://localhost:8000")
    print("  - http://127.0.0.1:8000")
    
    try:
        app.run(debug=app.config.get('DEBUG', False), host='0.0.0.0', port=8000)
    except OSError as e:
        print(f"Port 8000 might be in use: {e}")
        print("Trying port 5000...")
        app.run(debug=app.config.get('DEBUG', False), host='0.0.0.0', port=5000)