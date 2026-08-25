import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import models metadata
from app.database.base import Base
from app.models import (
    role,
    user,
    company,
    address,
    product,
    inventory,
    cart,
    order_request,
    order_status_history,
    invoice,
    notification,
)

target_metadata = Base.metadata

# Always override sqlalchemy.url from application environment settings
from app.core.config import settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    if url.startswith("sqlite+aiosqlite:"):
        url = url.replace("sqlite+aiosqlite:", "sqlite:")
    elif url.startswith("postgresql+asyncpg:"):
        url = url.replace("postgresql+asyncpg:", "postgresql:")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode with async engine."""
    connect_args = {}
    if "asyncpg" in settings.DATABASE_URL:
        connect_args = {
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        }
    elif "sqlite" in settings.DATABASE_URL:
        connect_args = {"check_same_thread": False}

    configuration = config.get_section(config.config_ini_section, {})
    
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
