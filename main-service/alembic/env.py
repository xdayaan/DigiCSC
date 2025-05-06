import asyncio
from logging.config import fileConfig
import os
import sys
from pathlib import Path

# Add parent directory to Python path for imports to work
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import context

# Import models so that they are registered with SQLAlchemy
from app.db.postgres import Base
from app.core.config import settings

# This needs to be imported after adding parent directory to path
try:
    from app.models.user import User
except ImportError:
    # Create a minimal User model for migration if the real one is not available
    from sqlalchemy import Column, Integer, String, DateTime, Enum
    from sqlalchemy.sql import func
    import enum
    
    class UserType(str, enum.Enum):
        USER = "user"
        FREELANCER = "freelancer"
        
    class Language(str, enum.Enum):
        ENGLISH = "english"
        HINDI = "hindi"
        KUMAONI = "kumaoni"
        GHARWALI = "gharwali"
        
    class User(Base):
        __tablename__ = "users"
        
        id = Column(Integer, primary_key=True, index=True)
        user_type = Column(Enum(UserType), nullable=False)
        name = Column(String, nullable=False)
        phone = Column(String, nullable=False)
        email = Column(String, nullable=True)
        csc_id = Column(String, nullable=True)
        preferred_language = Column(Enum(Language), default=Language.ENGLISH, nullable=False)
        created_at = Column(DateTime(timezone=True), server_default=func.now())
        updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Override the sqlalchemy.url in alembic.ini with our DATABASE_URL
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = AsyncEngine(
        engine_from_config(
            config.get_section(config.config_ini_section),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            future=True,
        )
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())