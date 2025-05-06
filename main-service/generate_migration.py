import os
import sys
import asyncio
from alembic.config import Config
from alembic import command

def run_migrations():
    """Run the initial migration to create the database tables"""
    alembic_cfg = Config("alembic.ini")
    command.revision(alembic_cfg, autogenerate=True, message="Initial migration")

if __name__ == "__main__":
    run_migrations()