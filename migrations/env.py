import logging
from logging.config import fileConfig

from flask import current_app

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

logger = logging.getLogger('alembic.env')


def get_engine():
    """Get database engine from Flask app."""
    try:
        # This will work when Flask app context is available
        return current_app.extensions['migrate'].db.get_engine()
    except RuntimeError:
        raise RuntimeError(
            'Cannot run migrations without Flask application context. '
            'Make sure to run migrations using "flask db" commands.'
        )


def get_engine_url():
    """Get database URL from Flask app."""
    try:
        return get_engine().url
    except RuntimeError:
        return None


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well. By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=get_metadata(),
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """

    # this callback is used to prevent an auto-migration from being generated
    # when there are no changes to the schema
    # reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, 'autogenerate', False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info('No changes in schema detected.')

    connectable = get_engine()

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            process_revision_directives=process_revision_directives,
            compare_type=True,
            compare_server_default=True,
            **current_app.extensions['migrate'].configure_args
        )

        with context.begin_transaction():
            context.run_migrations()


def get_metadata():
    """Get metadata from Flask-SQLAlchemy."""
    try:
        from flask import current_app
        return current_app.extensions['migrate'].db.metadata
    except RuntimeError:
        # Fallback for when no app context is available
        from models.database import db
        return db.metadata


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()