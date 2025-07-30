#!/usr/bin/env python3
from app import app
import webbrowser
import threading
import time

def open_browser():
    """Open browser after a short delay"""
    time.sleep(2)
    print("🌐 Opening browser...")
    webbrowser.open('http://127.0.0.1:5555')

if __name__ == '__main__':
    print("🏪 Starting AI Marketplace...")
    print("🚀 Server will start on port 5555")
    print("🌐 Browser will open automatically")
    print("-" * 40)
    
    # Start browser in background
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Start server
    app.run(host='127.0.0.1', port=5555, debug=True, use_reloader=False)