#!/usr/bin/env python3

"""
Fix database script - manually create the correct table
"""

import sqlite3
import os

def fix_database():
    """Manually create the correct users table with personality columns"""
    
    # Remove existing database
    if os.path.exists('marketplace.db'):
        os.remove('marketplace.db')
        print("🗑️ Removed old database")
    
    # Create new database with correct schema
    conn = sqlite3.connect('marketplace.db')
    cursor = conn.cursor()
    
    # Create users table with personality columns
    print("🔄 Creating users table...")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(128) NOT NULL,
            seller_personality VARCHAR(50) DEFAULT 'flexible',
            buyer_personality VARCHAR(50) DEFAULT 'fair',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create other tables
    print("🔄 Creating other tables...")
    
    # Items table
    cursor.execute("""
        CREATE TABLE items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            furniture_type VARCHAR(20) NOT NULL,
            starting_price FLOAT NOT NULL,
            min_price FLOAT NOT NULL,
            condition VARCHAR(50) DEFAULT 'good',
            image_path VARCHAR(200),
            is_sold BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Negotiations table
    cursor.execute("""
        CREATE TABLE negotiations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            seller_id INTEGER NOT NULL,
            buyer_id INTEGER,
            status VARCHAR(20) DEFAULT 'active',
            current_offer FLOAT,
            final_price FLOAT,
            round_number INTEGER DEFAULT 0,
            max_rounds INTEGER DEFAULT 10,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (item_id) REFERENCES items (id),
            FOREIGN KEY (seller_id) REFERENCES users (id),
            FOREIGN KEY (buyer_id) REFERENCES users (id)
        )
    """)
    
    # Offers table
    cursor.execute("""
        CREATE TABLE offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            negotiation_id INTEGER NOT NULL,
            offer_type VARCHAR(10) NOT NULL,
            price FLOAT NOT NULL,
            message TEXT,
            round_number INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (negotiation_id) REFERENCES negotiations (id)
        )
    """)
    
    conn.commit()
    
    # Verify tables
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    print("✅ Users table columns:")
    for col in columns:
        print(f"   - {col[1]} ({col[2]})")
        
    column_names = [col[1] for col in columns]
    if 'seller_personality' in column_names and 'buyer_personality' in column_names:
        print("✅ Personality columns confirmed!")
    else:
        print("❌ Still missing personality columns!")
    
    conn.close()
    print("✅ Database created successfully!")

if __name__ == '__main__':
    fix_database()