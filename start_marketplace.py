#!/usr/bin/env python3

"""
Marketplace startup script with better network configuration
"""

import os
import sys
import socket
from app import app

def get_local_ip():
    """Get the local IP address"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except:
        return "127.0.0.1"

def test_server_running(host, port):
    """Test if server is accessible"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex((host, port))
            return result == 0
    except:
        return False

if __name__ == '__main__':
    print("🏪 AI Marketplace Starting...")
    print("=" * 50)
    
    # Get network info
    local_ip = get_local_ip()
    hostname = socket.gethostname()
    
    print(f"Computer: {hostname}")
    print(f"Local IP: {local_ip}")
    
    # Try different configurations
    configs = [
        ('127.0.0.1', 8000),
        ('localhost', 8000),
        ('0.0.0.0', 8000),
        ('127.0.0.1', 5000),
        ('0.0.0.0', 5000),
    ]
    
    for host, port in configs:
        try:
            print(f"\n🚀 Trying {host}:{port}")
            
            # Test if port is available
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind((host if host != 'localhost' else '127.0.0.1', port))
            
            print(f"✅ Port {port} is available")
            print(f"📱 Open your browser and visit:")
            print(f"   🔗 http://localhost:{port}")
            print(f"   🔗 http://127.0.0.1:{port}")
            if host == '0.0.0.0':
                print(f"   🔗 http://{local_ip}:{port}")
            print(f"🛑 Press Ctrl+C to stop")
            print("-" * 50)
            
            # Start the server
            app.run(
                debug=True,
                host=host,
                port=port,
                threaded=True,
                use_reloader=False  # Prevent double startup in debug mode
            )
            break
            
        except OSError as e:
            print(f"❌ Failed to bind to {host}:{port} - {e}")
            continue
        except KeyboardInterrupt:
            print("\n👋 Server stopped by user")
            break
        except Exception as e:
            print(f"❌ Error starting server: {e}")
            continue
    else:
        print("\n❌ Could not start server on any port")
        print("💡 Suggestions:")
        print("   1. Check if another application is using these ports")
        print("   2. Try running as administrator/sudo")
        print("   3. Check your firewall settings")