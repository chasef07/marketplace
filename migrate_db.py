#!/usr/bin/env python3

"""
Database migration script to add personality columns
"""

import sqlite3
from app import app

def migrate_database():
    """Add personality columns to existing users table"""
    
    # Connect to database
    conn = sqlite3.connect('marketplace.db')
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'seller_personality' not in columns:
            print("Adding seller_personality column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN seller_personality VARCHAR(50) DEFAULT 'flexible'
            """)
            
        if 'buyer_personality' not in columns:
            print("Adding buyer_personality column...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN buyer_personality VARCHAR(50) DEFAULT 'fair'
            """)
            
        # Update existing users with default values
        cursor.execute("""
            UPDATE users 
            SET seller_personality = 'flexible', buyer_personality = 'fair' 
            WHERE seller_personality IS NULL OR buyer_personality IS NULL
        """)
        
        conn.commit()
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()