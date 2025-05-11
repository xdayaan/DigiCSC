import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Ensure versions directory exists
versions_path = os.path.join(os.path.dirname(__file__), 'versions')
if not os.path.exists(versions_path):
    os.makedirs(versions_path)

# this is the Alembic Config object
config = context.config

# Import the app's config
from app.config import settings

# Use standard PostgreSQL URL for Alembic (not async)
postgres_url = settings.DATABASE_URL
if '+asyncpg' in postgres_url:
    postgres_url = postgres_url.replace('+asyncpg', '')

config.set_main_option('sqlalchemy.url', postgres_url)

# Import all models so Alembic can autogenerate migrations
from app.models.user import User

# Interpret the config file for Python logging
fileConfig(config.config_file_name)

# add your model's MetaData object here
from app.db.postgres import Base
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
