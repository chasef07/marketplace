"""
Marketplace Flask Application Factory
"""

import os
import logging
import logging.handlers
from datetime import datetime, timezone

from flask import Flask, jsonify
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_cors import CORS

from .core.config import get_config
from .core.database import db, DatabaseManager, setup_database_logging
from .models import User
from .api import api


def create_app(config_name=None):
    """Application factory pattern for better testing and deployment."""
    app = Flask(__name__)
    
    # Load configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    config_class = get_config()
    app.config.from_object(config_class)
    
    # Set up logging
    setup_logging(app)
    
    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)
    
    # Set up database logging
    with app.app_context():
        setup_database_logging()
    
    # Enable CORS for frontend
    CORS(app, 
         origins=app.config['CORS_ORIGINS'], 
         supports_credentials=True, 
         allow_headers=['Content-Type', 'Authorization'])
    
    # Setup Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'api.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.session_protection = 'strong'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Register blueprints
    app.register_blueprint(api)
    
    # Add health check endpoint
    @app.route('/health')
    def health_check():
        """Health check endpoint for load balancers."""
        health_info = DatabaseManager.check_database_health()
        
        status_code = 200 if health_info['connection'] else 503
        
        return jsonify({
            'status': 'healthy' if health_info['connection'] else 'unhealthy',
            'database': health_info,
            'config_env': config_name,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), status_code
    
    # Add database info endpoint (development only)
    if app.config.get('DEBUG'):
        @app.route('/db-info')
        def db_info():
            """Database information endpoint (development only)."""
            return jsonify(DatabaseManager.get_database_info())
    
    # Initialize database if needed
    with app.app_context():
        try:
            # Create database if it doesn't exist (PostgreSQL)
            DatabaseManager.create_database_if_not_exists()
            
            # Test connection
            if not DatabaseManager.test_connection():
                app.logger.error("Database connection failed during startup")
                
            # Create tables
            DatabaseManager.initialize_database()
            
        except Exception as e:
            app.logger.error(f"Database initialization failed: {e}")
            if not app.config.get('DEBUG'):
                raise  # Re-raise in production
    
    return app


def setup_logging(app):
    """Configure application logging."""
    if not app.debug and not app.testing:
        # Production logging setup
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = logging.handlers.RotatingFileHandler(
            'logs/marketplace.log', 
            maxBytes=10240000, 
            backupCount=10
        )
        
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        
        file_handler.setLevel(getattr(logging, app.config.get('LOG_LEVEL', 'INFO')))
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(getattr(logging, app.config.get('LOG_LEVEL', 'INFO')))
        app.logger.info('Marketplace application startup')