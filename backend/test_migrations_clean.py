import asyncio
import os
import shutil
import tempfile
from alembic.config import Config
from alembic import command

def test_clean_migration_lifecycle():
    print("\n[MIGRATION TEST] Testing full migration lifecycle on a clean SQLite database...")
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_clean.db").replace("\\", "/")
    db_url = f"sqlite+aiosqlite:///{db_path}"

    backend_dir = os.path.abspath(os.path.dirname(__file__))
    alembic_ini_path = os.path.join(backend_dir, "alembic.ini")

    alembic_cfg = Config(alembic_ini_path)
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Upgrade from scratch to head
    print("  -> Running alembic upgrade head...")
    command.upgrade(alembic_cfg, "head")
    print("  [OK] Clean upgrade to head succeeded.")

    # 2. Downgrade by 1 step (to e79cefdf04df)
    print("  -> Running alembic downgrade -1...")
    command.downgrade(alembic_cfg, "-1")
    print("  [OK] Downgrade -1 succeeded.")

    # 3. Upgrade back to head
    print("  -> Running alembic upgrade head again...")
    command.upgrade(alembic_cfg, "head")
    print("  [OK] Re-upgrade to head succeeded.")

    shutil.rmtree(temp_dir, ignore_errors=True)
    print("[SUCCESS] Full migration lifecycle test passed successfully!\n")

if __name__ == "__main__":
    test_clean_migration_lifecycle()
