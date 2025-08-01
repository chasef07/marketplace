"""
Database configuration and utilities for FastAPI
"""

import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

# Create base class for models
Base = declarative_base()

# Database session
SessionLocal = None
engine = None

logger = logging.getLogger(__name__)


def initialize_database(database_url: str):
    """Initialize database connection."""
    global SessionLocal, engine
    
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DatabaseManager:
    """Database connection and management utilities."""
    
    @staticmethod
    def test_connection(database_uri: str):
        """Test database connection."""
        try:
            test_engine = create_engine(database_uri)
            with test_engine.connect() as connection:
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
    def get_database_info(database_uri: str):
        """Get database connection information."""
        try:
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


__all__ = ['Base', 'SessionLocal', 'engine', 'initialize_database', 'get_db', 'DatabaseManager']