#!/usr/bin/env python3

"""
Management script for marketplace application.

Provides database management commands similar to Django's manage.py:
- Database initialization
- Migrations
- User management
- Development server
"""

import os
import sys
import click
from flask.cli import with_appcontext
from flask import Flask
from flask_migrate import Migrate, init, migrate, upgrade, downgrade

from config import get_config
from database import DatabaseManager
from models.database import db, User, Item
from app import create_app


# Create app instance for CLI
app = create_app()
migrate_instance = Migrate(app, db)


@app.cli.command()
@click.option('--env', default='development', help='Environment to use')
@click.option('--force', is_flag=True, help='Force recreation of tables')
def init_db(env, force):
    """Initialize the database."""
    os.environ['FLASK_ENV'] = env
    
    if force:
        click.confirm('This will destroy all existing data. Continue?', abort=True)
    
    with app.app_context():
        try:
            # Create database if needed
            DatabaseManager.create_database_if_not_exists()
            
            if force:
                db.drop_all()
                click.echo('Dropped all tables')
            
            db.create_all()
            click.echo(f'Database initialized for {env} environment')
            
        except Exception as e:
            click.echo(f'Error initializing database: {e}', err=True)
            sys.exit(1)


@app.cli.command()
def check_db():
    """Check database health."""
    with app.app_context():
        health_info = DatabaseManager.check_database_health()
        
        click.echo(f"Database Health Check:")
        click.echo(f"Connection: {'✅' if health_info['connection'] else '❌'}")
        click.echo(f"Tables exist: {'✅' if health_info['tables_exist'] else '❌'}")
        click.echo(f"Sample query: {'✅' if health_info['sample_query'] else '❌'}")
        click.echo(f"Migration status: {health_info['migration_status']}")
        
        if not health_info['connection']:
            sys.exit(1)


@app.cli.command()
@click.option('--username', prompt=True, help='Username for the user')
@click.option('--email', prompt=True, help='Email for the user')
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True, help='Password for the user')
def create_user(username, email, password):
    """Create a new user."""
    with app.app_context():
        if User.query.filter_by(username=username).first():
            click.echo(f'User {username} already exists', err=True)
            return
        
        if User.query.filter_by(email=email).first():
            click.echo(f'User with email {email} already exists', err=True)
            return
        
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        click.echo(f'User {username} created successfully')


@app.cli.command()
@click.option('--username', prompt=True, help='Username to make admin')
def make_admin(username):
    """Make a user an admin (placeholder for future role system)."""
    with app.app_context():
        user = User.query.filter_by(username=username).first()
        if not user:
            click.echo(f'User {username} not found', err=True)
            return
        
        # For now, just confirm the user exists
        # In the future, this would set admin role
        click.echo(f'User {username} found (admin role system not yet implemented)')


@app.cli.command()
def list_users():
    """List all users."""
    with app.app_context():
        users = User.query.all()
        
        if not users:
            click.echo('No users found')
            return
        
        click.echo('Users:')
        for user in users:
            click.echo(f'  {user.id}: {user.username} ({user.email}) - Created: {user.created_at}')


@app.cli.command()
def db_info():
    """Show database information."""
    with app.app_context():
        info = DatabaseManager.get_database_info()
        
        click.echo('Database Information:')
        for key, value in info.items():
            click.echo(f'  {key}: {value}')


@app.cli.command()
@click.option('--host', default='0.0.0.0', help='Host to bind to')
@click.option('--port', default=8000, help='Port to bind to')
@click.option('--debug', is_flag=True, help='Enable debug mode')
def runserver(host, port, debug):
    """Run the development server."""
    app.run(host=host, port=port, debug=debug)


@app.cli.command()
def create_sample_data():
    """Create sample data for development."""
    with app.app_context():
        # Create sample users if they don't exist
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', email='admin@marketplace.com')
            admin.set_password('admin123')
            db.session.add(admin)
            
        if not User.query.filter_by(username='testuser').first():
            testuser = User(username='testuser', email='test@marketplace.com')
            testuser.set_password('test123')
            db.session.add(testuser)
        
        db.session.commit()
        
        # Create sample items
        admin = User.query.filter_by(username='admin').first()
        if admin and not Item.query.filter_by(user_id=admin.id).first():
            sample_items = [
                Item(
                    user_id=admin.id,
                    name='Vintage Leather Sofa',
                    description='Beautiful vintage leather sofa in excellent condition',
                    furniture_type='couch',
                    starting_price=500.00,
                    min_price=350.00,
                    condition='excellent'
                ),
                Item(
                    user_id=admin.id,
                    name='Oak Dining Table',
                    description='Solid oak dining table seats 6 people',
                    furniture_type='dining_table',
                    starting_price=300.00,
                    min_price=200.00,
                    condition='good'
                )
            ]
            
            for item in sample_items:
                db.session.add(item)
        
        db.session.commit()
        click.echo('Sample data created successfully')


@app.cli.command()
@click.argument('message')
def db_migrate(message):
    """Create a new migration."""
    from flask_migrate import migrate as migrate_cmd
    migrate_cmd(message=message)
    click.echo(f'Migration created: {message}')


@app.cli.command()
def db_upgrade():
    """Apply migrations to upgrade database."""
    from flask_migrate import upgrade as upgrade_cmd
    upgrade_cmd()
    click.echo('Database upgraded')


@app.cli.command()
def db_downgrade():
    """Downgrade database by one migration."""
    from flask_migrate import downgrade as downgrade_cmd
    downgrade_cmd()
    click.echo('Database downgraded')


if __name__ == '__main__':
    app.cli()