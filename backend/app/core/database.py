"""
Database configuration and utilities
"""

import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from flask import current_app
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy instance
db = SQLAlchemy()

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Database connection and management utilities."""
    
    @staticmethod
    def test_connection(database_uri=None):
        """Test database connection."""
        if not database_uri:
            database_uri = current_app.config['SQLALCHEMY_DATABASE_URI']
        
        try:
            engine = create_engine(database_uri)
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
        except OperationalError as e:
            logger.error(f"Database connection failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected database error: {e}")
            return False
    
    @staticmethod
    def create_database_if_not_exists(database_uri=None):
        """Create database if it doesn't exist (PostgreSQL only)."""
        if not database_uri:
            database_uri = current_app.config['SQLALCHEMY_DATABASE_URI']
        
        if not database_uri.startswith('postgresql'):
            logger.info("Skipping database creation for non-PostgreSQL database")
            return True
        
        try:
            # Parse database URI to get connection details
            from urllib.parse import urlparse
            parsed = urlparse(database_uri)
            
            # Connect to default postgres database to create our database
            admin_uri = f"postgresql://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}/postgres"
            admin_engine = create_engine(admin_uri)
            
            database_name = parsed.path[1:]  # Remove leading slash
            
            with admin_engine.connect() as connection:
                # Check if database exists
                result = connection.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                    {"db_name": database_name}
                )
                
                if not result.fetchone():
                    # Database doesn't exist, create it
                    connection.execution_options(autocommit=True).execute(
                        text(f"CREATE DATABASE {database_name}")
                    )
                    logger.info(f"Created database: {database_name}")
                else:
                    logger.info(f"Database {database_name} already exists")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create database: {e}")
            return False
    
    @staticmethod
    def initialize_database():
        """Initialize database with tables."""
        try:
            # Create all tables
            db.create_all()
            logger.info("Database tables created successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            return False
    
    @staticmethod
    def get_database_info():
        """Get database connection information."""
        try:
            database_uri = current_app.config['SQLALCHEMY_DATABASE_URI']
            
            if database_uri.startswith('sqlite'):
                return {
                    'type': 'SQLite',
                    'file': database_uri.replace('sqlite:///', ''),
                    'size': 'N/A'
                }
            elif database_uri.startswith('postgresql'):
                from urllib.parse import urlparse
                parsed = urlparse(database_uri)
                return {
                    'type': 'PostgreSQL',
                    'host': parsed.hostname,
                    'port': parsed.port,
                    'database': parsed.path[1:],
                    'username': parsed.username
                }
            else:
                return {'type': 'Unknown', 'uri': database_uri}
                
        except Exception as e:
            logger.error(f"Failed to get database info: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def check_database_health():
        """Perform basic database health checks."""
        health_info = {
            'connection': False,
            'tables_exist': False,
            'sample_query': False,
            'migration_status': 'unknown'
        }
        
        try:
            # Test basic connection
            health_info['connection'] = DatabaseManager.test_connection()
            
            if health_info['connection']:
                # Check if main tables exist
                from ..models import User, Item, Negotiation
                try:
                    User.query.first()
                    Item.query.first()
                    Negotiation.query.first()
                    health_info['tables_exist'] = True
                    health_info['sample_query'] = True
                except Exception as e:
                    logger.warning(f"Table check failed: {e}")
                
                # Check migration status (if flask-migrate is properly set up)
                try:
                    from flask_migrate import current
                    health_info['migration_status'] = 'current'
                except Exception:
                    health_info['migration_status'] = 'unavailable'
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health_info['error'] = str(e)
        
        return health_info


def setup_database_logging():
    """Configure database-related logging."""
    db_logger = logging.getLogger('sqlalchemy')
    
    if current_app.config.get('DEBUG'):
        db_logger.setLevel(logging.INFO)
    else:
        db_logger.setLevel(logging.WARNING)
    
    # Add database query logging in development
    if current_app.config.get('SQLALCHEMY_RECORD_QUERIES'):
        db_logger.setLevel(logging.DEBUG)


__all__ = ['db', 'DatabaseManager', 'setup_database_logging']