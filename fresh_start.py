#!/usr/bin/env python3

"""
Fresh start script - creates clean database and starts server
"""

import os
from app import app
from models.database import db

def fresh_start():
    """Create fresh database and start server"""
    
    # Remove any existing database files
    db_files = ['marketplace.db', 'marketplace.db-journal', 'marketplace.db-wal', 'marketplace.db-shm']
    for db_file in db_files:
        if os.path.exists(db_file):
            os.remove(db_file)
            print(f"🗑️ Removed {db_file}")
    
    # Create fresh database
    print("🔄 Creating fresh database...")
    with app.app_context():
        db.drop_all()  # Ensure clean slate
        db.create_all()
        
        # Verify tables were created
        import sqlite3
        conn = sqlite3.connect('marketplace.db')
        cursor = conn.cursor()
        
        # Check users table structure
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("✅ Users table columns:")
        for col in columns:
            print(f"   - {col[1]} ({col[2]})")
        
        # Check if personality columns exist
        column_names = [col[1] for col in columns]
        if 'seller_personality' in column_names and 'buyer_personality' in column_names:
            print("✅ Personality columns found!")
        else:
            print("❌ Personality columns missing!")
            
        conn.close()
    
    print("\n🚀 Database ready! Starting server...")
    print("📱 Open your browser to: http://localhost:8000")
    print("🛑 Press Ctrl+C to stop")
    print("-" * 50)
    
    # Start the server
    app.run(debug=True, host='127.0.0.1', port=8000)

if __name__ == '__main__':
    fresh_start()