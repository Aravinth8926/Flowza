"""
Phase 2B Tests — Inventory System
Run from backend/ directory:
    .\venv\Scripts\python test_inventory.py
"""
import asyncio
import sys
import os
import io
import uuid
import time

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker as async_sessionmaker_cls

DATABASE_URL = "sqlite+aiosqlite:///./test_inventory.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker_cls(engine, class_=AsyncSession, expire_on_commit=False)

from app.database.base import Base
from app.models import Role, User, Company, Address, Product, Inventory, Cart, CartItem, OrderRequest, OrderRequestItem
from app.core.security import get_password_hash
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.product_repo import ProductRepository
from app.services.inventory_service import InventoryService, compute_inventory_response
from app.schemas.inventory import InventoryUpdate, InventoryAdjust
from app.core.exceptions import NotFoundException, PermissionDeniedException, ConflictException

PASS = 0
FAIL = 0
SUFFIX = str(int(time.time()))[-6:]


def ok(label):
    global PASS
    PASS += 1
    print(f"  ✅ PASS: {label}")


def fail(label, reason=""):
    global FAIL
    FAIL += 1
    print(f"  ❌ FAIL: {label} — {reason}")


async def setup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Roles
        supplier_role = Role(name="supplier", description="Supplier")
        vendor_role = Role(name="vendor", description="Vendor")
        db.add_all([supplier_role, vendor_role])
        await db.flush()

        # Supplier A company + user
        comp_a = Company(company_name="Supplier A", business_type="Distributor")
        db.add(comp_a)
        await db.flush()

        user_a = User(
            full_name="Supplier A User", email=f"supplier_a_{SUFFIX}@test.com",
            hashed_password=get_password_hash("pass"), phone="1111111111",
            role_id=supplier_role.id, company_id=comp_a.id, is_active=True,
        )
        db.add(user_a)
        await db.flush()

        # Supplier B company + user
        comp_b = Company(company_name="Supplier B", business_type="Wholesaler")
        db.add(comp_b)
        await db.flush()

        user_b = User(
            full_name="Supplier B User", email=f"supplier_b_{SUFFIX}@test.com",
            hashed_password=get_password_hash("pass"), phone="2222222222",
            role_id=supplier_role.id, company_id=comp_b.id, is_active=True,
        )
        db.add(user_b)
        await db.flush()

        # Vendor
        comp_v = Company(company_name="Vendor Co", business_type="Retailer")
        db.add(comp_v)
        await db.flush()

        user_v = User(
            full_name="Vendor User", email=f"vendor_{SUFFIX}@test.com",
            hashed_password=get_password_hash("pass"), phone="3333333333",
            role_id=vendor_role.id, company_id=comp_v.id, is_active=True,
        )
        db.add(user_v)
        await db.flush()

        # Product for Supplier A
        prod_a = Product(company_id=comp_a.id, name="Rice A", sku=f"RICE-{SUFFIX}", price=100, unit="kg", is_active=True)
        db.add(prod_a)
        await db.flush()

        inv_a = Inventory(product_id=prod_a.id, quantity_on_hand=100, quantity_reserved=10, reorder_level=20, reorder_quantity=50)
        db.add(inv_a)
        await db.flush()

        # Product for Supplier B
        prod_b = Product(company_id=comp_b.id, name="Dal B", sku=f"DAL-{SUFFIX}", price=120, unit="kg", is_active=True)
        db.add(prod_b)
        await db.flush()

        inv_b = Inventory(product_id=prod_b.id, quantity_on_hand=50, quantity_reserved=0, reorder_level=10, reorder_quantity=30)
        db.add(inv_b)
        await db.flush()

        await db.commit()

        return {
            "comp_a": comp_a, "user_a": user_a, "prod_a": prod_a, "inv_a": inv_a,
            "comp_b": comp_b, "user_b": user_b, "prod_b": prod_b, "inv_b": inv_b,
            "comp_v": comp_v, "user_v": user_v,
        }


async def run_tests():
    ctx = await setup()
    comp_a = ctx["comp_a"]
    user_a = ctx["user_a"]
    prod_a = ctx["prod_a"]
    inv_a = ctx["inv_a"]
    comp_b = ctx["comp_b"]
    user_b = ctx["user_b"]
    prod_b = ctx["prod_b"]
    inv_b = ctx["inv_b"]

    print("\n[TEST] Phase 2B — Inventory\n")

    # ── T1: Supplier can view own inventory
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        try:
            inv = await svc.get_inventory(prod_a.id, comp_a.id)
            assert inv.quantity_on_hand == 100
            assert inv.quantity_reserved == 10
            assert inv.available_quantity == 90
            ok("T1: Supplier can view own inventory")
        except Exception as e:
            fail("T1: Supplier can view own inventory", str(e))

    # ── T2: Supplier CANNOT view another supplier's inventory
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        try:
            await svc.get_inventory(prod_b.id, comp_a.id)
            fail("T2: Supplier cannot view other supplier inventory (no error raised)")
        except PermissionDeniedException:
            ok("T2: Supplier cannot view another supplier's inventory")
        except Exception as e:
            fail("T2: Supplier cannot view other supplier inventory", str(e))

    # ── T3: Available quantity = on_hand - reserved
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod_a.id)
        avail = inv.quantity_on_hand - inv.quantity_reserved
        if avail == 90:
            ok("T3: available_quantity = on_hand - reserved (90)")
        else:
            fail("T3: available_quantity", f"expected 90, got {avail}")

    # ── T4: Low stock detection
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod_a.id)
        # available=90  reorder_level=20 → healthy
        resp = compute_inventory_response(inv)
        if resp.stock_status == "healthy":
            ok("T4: Stock status = healthy when available > reorder_level")
        else:
            fail("T4: Stock status", f"expected healthy, got {resp.stock_status}")

    # ── T5: Low stock when available <= reorder_level
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod_a.id)
        inv.quantity_on_hand = 25
        inv.quantity_reserved = 10  # available = 15 < reorder_level=20 → low_stock
        await db.flush()
        resp = compute_inventory_response(inv)
        if resp.stock_status == "low_stock":
            ok("T5: Stock status = low_stock when available <= reorder_level")
        else:
            fail("T5: Stock status", f"expected low_stock, got {resp.stock_status}")
        # Restore
        inv.quantity_on_hand = 100
        inv.quantity_reserved = 10
        await db.commit()

    # ── T6: Out-of-stock when available = 0
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod_a.id)
        inv.quantity_on_hand = 10
        inv.quantity_reserved = 10  # available = 0 → out_of_stock
        await db.flush()
        resp = compute_inventory_response(inv)
        if resp.stock_status == "out_of_stock":
            ok("T6: Stock status = out_of_stock when available = 0")
        else:
            fail("T6: Stock status", f"expected out_of_stock, got {resp.stock_status}")
        inv.quantity_on_hand = 100
        inv.quantity_reserved = 10
        await db.commit()

    # ── T7: Supplier can adjust own stock (positive)
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        inv_r = await svc.adjust_stock(prod_a.id, comp_a.id, InventoryAdjust(adjustment=25, reason="Stock received"))
        if inv_r.quantity_on_hand == 125:
            ok("T7: Stock adjusted +25 (100→125)")
        else:
            fail("T7: Positive adjustment", f"expected 125, got {inv_r.quantity_on_hand}")

    # ── T8: Negative adjustment
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        inv_r = await svc.adjust_stock(prod_a.id, comp_a.id, InventoryAdjust(adjustment=-10, reason="Damaged"))
        if inv_r.quantity_on_hand == 115:
            ok("T8: Stock adjusted -10 (125→115)")
        else:
            fail("T8: Negative adjustment", f"expected 115, got {inv_r.quantity_on_hand}")

    # ── T9: Negative resulting stock is rejected
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        try:
            await svc.adjust_stock(prod_a.id, comp_a.id, InventoryAdjust(adjustment=-9999, reason="Test"))
            fail("T9: Negative resulting stock not rejected")
        except ConflictException:
            ok("T9: Adjustment that makes stock negative is rejected")
        except Exception as e:
            fail("T9: Negative resulting stock rejected", str(e))

    # ── T10: Supplier CANNOT adjust another supplier's inventory
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        try:
            await svc.adjust_stock(prod_b.id, comp_a.id, InventoryAdjust(adjustment=5, reason="Test"))
            fail("T10: Cross-supplier adjustment not rejected")
        except PermissionDeniedException:
            ok("T10: Supplier cannot adjust another supplier's inventory")
        except Exception as e:
            fail("T10: Cross-supplier adjustment rejected", str(e))

    # ── T11: Reserve stock reduces available
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod_b.id)
        before_reserved = inv.quantity_reserved
        await inv_repo.reserve_stock(inv, 10)
        await db.commit()
        if inv.quantity_reserved == before_reserved + 10:
            ok(f"T11: reserve_stock: reserved {before_reserved}→{inv.quantity_reserved}")
        else:
            fail(f"T11: reserve_stock", f"expected {before_reserved + 10}, got {inv.quantity_reserved}")

    # ── T12: Reserve more than available is rejected
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod_b.id)
        try:
            await inv_repo.reserve_stock(inv, 9999)
            fail("T12: Oversell reservation not rejected")
        except ValueError:
            ok("T12: reservation > available is rejected")

    # ── T13: Product creation auto-creates inventory
    async with AsyncSessionLocal() as db:
        from app.services.product_service import ProductService
        from app.schemas.product import ProductCreate
        from decimal import Decimal
        svc = ProductService(db)
        p = await svc.create_product(
            comp_a.id,
            ProductCreate(name="Auto Inv Product", sku=f"AUTO-{SUFFIX}", price=Decimal("55.00"), unit="units"),
        )
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(p.id)
        if inv is not None and inv.quantity_on_hand == 0:
            ok("T13: Product creation auto-creates Inventory (quantity_on_hand=0)")
        else:
            fail("T13: Auto-inventory for new product", f"inv={inv}")

    # ── T14: Supplier can list own inventory
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        items, total = await svc.list_inventory(comp_a.id)
        if total >= 1:
            ok(f"T14: Supplier can list own inventory ({total} records)")
        else:
            fail("T14: List inventory", f"total={total}")

    # ── T15: Update inventory fields
    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)
        updated = await svc.update_inventory(
            prod_a.id, comp_a.id,
            InventoryUpdate(reorder_level=30, reorder_quantity=100)
        )
        if updated.reorder_level == 30 and updated.reorder_quantity == 100:
            ok("T15: Supplier can update reorder_level and reorder_quantity")
        else:
            fail("T15: Update inventory fields")


async def main():
    try:
        await run_tests()
    finally:
        await engine.dispose()
        db_path = os.path.join(os.path.dirname(__file__), "test_inventory.db")
        if os.path.exists(db_path):
            os.remove(db_path)

    total = PASS + FAIL
    print(f"\n{'='*50}")
    print(f"  Results: {PASS}/{total} passed")
    if FAIL > 0:
        print(f"  ⚠️  {FAIL} test(s) FAILED")
    else:
        print("  🎉 All inventory tests passed!")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    asyncio.run(main())
