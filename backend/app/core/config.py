"""
Configuration management for different environments
"""
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration class with common settings."""
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_timeout': 20,
        'max_overflow': 20
    }
    
    # File uploads
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
    
    # AI Services
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    
    # Pagination
    ITEMS_PER_PAGE = 20


class DevelopmentConfig(Config):
    """Development environment configuration."""
    
    DEBUG = True
    TESTING = False
    
    # SQLite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'marketplace_dev.db')
    
    # Development logging
    LOG_LEVEL = 'DEBUG'


class TestingConfig(Config):
    """Testing environment configuration."""
    
    DEBUG = False
    TESTING = True
    WTF_CSRF_ENABLED = False
    
    # In-memory SQLite for testing
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Testing logging
    LOG_LEVEL = 'WARNING'


class ProductionConfig(Config):
    """Production environment configuration."""
    
    DEBUG = False
    TESTING = False
    
    # PostgreSQL for production
    DB_USER = os.environ.get('DB_USER', 'marketplace_user')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_NAME = os.environ.get('DB_NAME', 'marketplace_prod')
    
    # URL encode password to handle special characters
    encoded_password = quote_plus(DB_PASSWORD) if DB_PASSWORD else DB_PASSWORD
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    
    # Production database settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,  # 1 hour
        'pool_timeout': 30,
        'max_overflow': 50,
        'pool_size': 20
    }
    
    # Production logging
    LOG_LEVEL = 'INFO'
    
    # Security headers
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


class StagingConfig(ProductionConfig):
    """Staging environment configuration (similar to production but with debug info)."""
    
    # Staging database
    DB_NAME = os.environ.get('DB_NAME', 'marketplace_staging')
    
    encoded_password = quote_plus(os.environ.get('DB_PASSWORD', '')) if os.environ.get('DB_PASSWORD') else ''
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('STAGING_DATABASE_URL') or \
        f'postgresql://{os.environ.get("DB_USER", "marketplace_user")}:{encoded_password}@{os.environ.get("DB_HOST", "localhost")}:{os.environ.get("DB_PORT", "5432")}/{DB_NAME}'
    
    # More verbose logging for staging
    LOG_LEVEL = 'DEBUG'
    
    # Less strict session settings for staging
    SESSION_COOKIE_SECURE = False


# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config():
    """Get configuration based on FLASK_ENV environment variable."""
    env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default'])