#!/usr/bin/env python3

"""
Database initialization script for marketplace application.

This script handles database setup for different environments:
- Development: SQLite database
- Production: PostgreSQL database
- Testing: In-memory SQLite database

Usage:
    python init_db.py [--env=development|production|staging] [--force]
"""

import os
import sys
import argparse
from flask import Flask
from config import get_config
from database import DatabaseManager
from models.database import db, User, Item, Negotiation, Offer
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database(env='development', force=False):
    """Initialize database for the specified environment."""
    
    # Set environment
    os.environ['FLASK_ENV'] = env
    
    # Create Flask app with proper configuration
    app = Flask(__name__)
    config_class = get_config()
    app.config.from_object(config_class)
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        logger.info(f"Initializing database for environment: {env}")
        logger.info(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        
        try:
            # Test connection first
            if not DatabaseManager.test_connection():
                logger.error("Cannot connect to database. Check your configuration.")
                return False
            
            # Get database info
            db_info = DatabaseManager.get_database_info()
            logger.info(f"Database info: {db_info}")
            
            # Create database if it doesn't exist (PostgreSQL only)
            if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgresql'):
                if not DatabaseManager.create_database_if_not_exists():
                    logger.error("Failed to create database")
                    return False
            
            # Drop existing tables if force is specified
            if force:
                logger.warning("Force flag specified - dropping all existing tables")
                db.drop_all()
                logger.info("All tables dropped")
            
            # Create all tables
            logger.info("Creating database tables...")
            db.create_all()
            logger.info("Database tables created successfully")
            
            # Verify tables were created
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            logger.info(f"Created tables: {tables}")
            
            # Create sample data for development
            if env == 'development' and force:
                create_sample_data()
            
            logger.info("Database initialization completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            return False


def create_sample_data():
    """Create sample data for development environment."""
    logger.info("Creating sample data for development...")
    
    try:
        # Create sample user
        if not User.query.filter_by(username='admin').first():
            admin_user = User(
                username='admin',
                email='admin@marketplace.com',
                seller_personality='flexible',
                buyer_personality='fair'
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            
        if not User.query.filter_by(username='testuser').first():
            test_user = User(
                username='testuser',
                email='test@marketplace.com',
                seller_personality='tough',
                buyer_personality='aggressive'
            )
            test_user.set_password('test123')
            db.session.add(test_user)
        
        db.session.commit()
        
        # Create sample items if users were created
        admin_user = User.query.filter_by(username='admin').first()
        if admin_user and not Item.query.filter_by(user_id=admin_user.id).first():
            sample_items = [
                Item(
                    user_id=admin_user.id,
                    name='Vintage Leather Sofa',
                    description='Beautiful vintage leather sofa in excellent condition',
                    furniture_type='couch',
                    starting_price=500.00,
                    min_price=350.00,
                    condition='excellent'
                ),
                Item(
                    user_id=admin_user.id,
                    name='Oak Dining Table',
                    description='Solid oak dining table seats 6 people',
                    furniture_type='dining_table',
                    starting_price=300.00,
                    min_price=200.00,
                    condition='good'
                ),
                Item(
                    user_id=admin_user.id,
                    name='Modern Bookshelf',
                    description='Contemporary bookshelf with adjustable shelves',
                    furniture_type='bookshelf',
                    starting_price=150.00,
                    min_price=100.00,
                    condition='like_new'
                )
            ]
            
            for item in sample_items:
                db.session.add(item)
            
            db.session.commit()
            logger.info("Sample data created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create sample data: {e}")
        db.session.rollback()


def check_database_health():
    """Check database health and connection."""
    env = os.environ.get('FLASK_ENV', 'development')
    
    # Create Flask app
    app = Flask(__name__)
    config_class = get_config()
    app.config.from_object(config_class)
    
    db.init_app(app)
    
    with app.app_context():
        health_info = DatabaseManager.check_database_health()
        
        print(f"Database Health Check - Environment: {env}")
        print(f"Connection: {'✅' if health_info['connection'] else '❌'}")
        print(f"Tables exist: {'✅' if health_info['tables_exist'] else '❌'}")
        print(f"Sample query: {'✅' if health_info['sample_query'] else '❌'}")
        print(f"Migration status: {health_info['migration_status']}")
        
        if 'error' in health_info:
            print(f"Error: {health_info['error']}")
        
        return health_info['connection'] and health_info['tables_exist']


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description='Initialize marketplace database')
    parser.add_argument('--env', choices=['development', 'production', 'staging'], 
                       default='development', help='Environment to initialize')
    parser.add_argument('--force', action='store_true', 
                       help='Force recreation of tables (WARNING: destroys existing data)')
    parser.add_argument('--check', action='store_true', 
                       help='Check database health instead of initializing')
    
    args = parser.parse_args()
    
    if args.check:
        success = check_database_health()
        sys.exit(0 if success else 1)
    else:
        success = init_database(args.env, args.force)
        if success:
            print(f"✅ Database initialized successfully for {args.env} environment")
        else:
            print(f"❌ Database initialization failed for {args.env} environment")
        
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()