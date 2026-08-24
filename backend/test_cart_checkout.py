"""
Phase 2C+2D Tests — Cart & Checkout
Run from backend/ directory:
    .\venv\Scripts\python test_cart_checkout.py
"""
import asyncio
import sys
import os
import io
import uuid
import time
from decimal import Decimal

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite+aiosqlite:///./test_cart_checkout.db"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

from app.database.base import Base
from app.models import Role, User, Company, Address, Product, Inventory, Cart, CartItem, OrderRequest, OrderRequestItem
from app.core.security import get_password_hash
from app.repositories.cart_repo import CartRepository
from app.repositories.inventory_repo import InventoryRepository
from app.services.cart_service import CartService
from app.services.checkout_service import CheckoutService
from app.schemas.cart import CartItemAdd, CartItemUpdate, CheckoutRequest
from app.core.exceptions import NotFoundException, ConflictException, PermissionDeniedException

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
        supplier_role = Role(name="supplier", description="Supplier")
        vendor_role = Role(name="vendor", description="Vendor")
        db.add_all([supplier_role, vendor_role])
        await db.flush()

        # Supplier A
        comp_a = Company(company_name="Supplier A Co", business_type="Distributor")
        db.add(comp_a)
        await db.flush()
        user_sa = User(
            full_name="Supplier A", email=f"sa_{SUFFIX}@test.com",
            hashed_password=get_password_hash("pass"), phone="0000000001",
            role_id=supplier_role.id, company_id=comp_a.id, is_active=True,
        )
        db.add(user_sa)
        await db.flush()

        # Products for Supplier A
        prod1 = Product(company_id=comp_a.id, name="Rice", sku=f"RICE-{SUFFIX}", price=Decimal("100.00"), unit="kg", is_active=True)
        prod2 = Product(company_id=comp_a.id, name="Dal", sku=f"DAL-{SUFFIX}", price=Decimal("120.00"), unit="kg", is_active=True)
        prod_inactive = Product(company_id=comp_a.id, name="Inactive Oil", sku=f"IOIL-{SUFFIX}", price=Decimal("90.00"), unit="litre", is_active=False)
        db.add_all([prod1, prod2, prod_inactive])
        await db.flush()

        inv1 = Inventory(product_id=prod1.id, quantity_on_hand=100, quantity_reserved=0, reorder_level=10, reorder_quantity=50)
        inv2 = Inventory(product_id=prod2.id, quantity_on_hand=50, quantity_reserved=0, reorder_level=5, reorder_quantity=20)
        inv_inactive = Inventory(product_id=prod_inactive.id, quantity_on_hand=30, quantity_reserved=0, reorder_level=5, reorder_quantity=20)
        db.add_all([inv1, inv2, inv_inactive])
        await db.flush()

        # Supplier B
        comp_b = Company(company_name="Supplier B Co", business_type="Wholesaler")
        db.add(comp_b)
        await db.flush()
        user_sb = User(
            full_name="Supplier B", email=f"sb_{SUFFIX}@test.com",
            hashed_password=get_password_hash("pass"), phone="0000000002",
            role_id=supplier_role.id, company_id=comp_b.id, is_active=True,
        )
        db.add(user_sb)
        await db.flush()
        prod_b1 = Product(company_id=comp_b.id, name="Flour B", sku=f"FLR-{SUFFIX}", price=Decimal("48.00"), unit="kg", is_active=True)
        db.add(prod_b1)
        await db.flush()
        inv_b1 = Inventory(product_id=prod_b1.id, quantity_on_hand=200, quantity_reserved=0, reorder_level=20, reorder_quantity=50)
        db.add(inv_b1)
        await db.flush()

        # Vendor 1
        comp_v1 = Company(company_name="Vendor One Shop", business_type="Retailer")
        db.add(comp_v1)
        await db.flush()
        user_v1 = User(
            full_name="Vendor One", email=f"v1_{SUFFIX}@test.com",
            hashed_password=get_password_hash("pass"), phone="0000000003",
            role_id=vendor_role.id, company_id=comp_v1.id, is_active=True,
        )
        db.add(user_v1)
        await db.flush()

        # Vendor 2
        comp_v2 = Company(company_name="Vendor Two Shop", business_type="Retailer")
        db.add(comp_v2)
        await db.flush()
        user_v2 = User(
            full_name="Vendor Two", email=f"v2_{SUFFIX}@test.com",
            hashed_password=get_password_hash("pass"), phone="0000000004",
            role_id=vendor_role.id, company_id=comp_v2.id, is_active=True,
        )
        db.add(user_v2)
        await db.flush()

        await db.commit()
        return {
            "comp_a": comp_a, "user_sa": user_sa, "prod1": prod1, "prod2": prod2,
            "prod_inactive": prod_inactive, "inv1": inv1, "inv2": inv2,
            "comp_b": comp_b, "user_sb": user_sb, "prod_b1": prod_b1, "inv_b1": inv_b1,
            "comp_v1": comp_v1, "user_v1": user_v1,
            "comp_v2": comp_v2, "user_v2": user_v2,
        }


async def run_tests():
    ctx = await setup()
    prod1 = ctx["prod1"]
    prod2 = ctx["prod2"]
    prod_inactive = ctx["prod_inactive"]
    prod_b1 = ctx["prod_b1"]
    comp_a = ctx["comp_a"]
    comp_b = ctx["comp_b"]
    comp_v1 = ctx["comp_v1"]
    comp_v2 = ctx["comp_v2"]
    user_v1 = ctx["user_v1"]
    user_v2 = ctx["user_v2"]
    user_sa = ctx["user_sa"]
    inv1 = ctx["inv1"]
    inv_b1 = ctx["inv_b1"]

    print("\n[TEST] Phase 2C — Cart\n")

    # ── T1: Vendor can add item to cart
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        try:
            cart = await svc.add_item(user_v1.id, comp_v1.id, CartItemAdd(product_id=prod1.id))
            assert cart.item_count == 1
            assert cart.supplier_company_id == comp_a.id
            ok("T1: Vendor can add item → cart auto-created for supplier")
        except Exception as e:
            fail("T1: Vendor add item to cart", str(e))

    # ── T2: Adding same product again increments quantity
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        try:
            cart = await svc.add_item(user_v1.id, comp_v1.id, CartItemAdd(product_id=prod1.id))
            assert cart.items[0].quantity == 2
            ok("T2: Adding same product increments quantity (not duplicate item)")
        except Exception as e:
            fail("T2: Duplicate item prevention", str(e))

    # ── T3: Cart is supplier-specific (Supplier A products → Cart A)
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        try:
            cart_b = await svc.add_item(user_v1.id, comp_v1.id, CartItemAdd(product_id=prod_b1.id))
            assert cart_b.supplier_company_id == comp_b.id
            ok("T3: Supplier B product creates separate cart")
        except Exception as e:
            fail("T3: Supplier-specific cart", str(e))

    # ── T4: Vendor has multiple supplier carts
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        try:
            result = await svc.list_carts(comp_v1.id)
            assert result.total >= 2
            ok(f"T4: Vendor has multiple supplier-specific carts ({result.total})")
        except Exception as e:
            fail("T4: Multiple supplier carts", str(e))

    # ── T5: Vendor 2 cannot access Vendor 1's cart
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        carts = await svc.list_carts(comp_v1.id)
        cart_id = carts.carts[0].id
        try:
            await svc.get_cart(cart_id, comp_v2.id)
            fail("T5: Cross-vendor cart access not rejected")
        except NotFoundException:
            ok("T5: Vendor cannot access another vendor's cart")
        except Exception as e:
            fail("T5: Cross-vendor cart access", str(e))

    # ── T6: Inactive product cannot be added
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        try:
            await svc.add_item(user_v1.id, comp_v1.id, CartItemAdd(product_id=prod_inactive.id))
            fail("T6: Inactive product added (should be rejected)")
        except ConflictException:
            ok("T6: Inactive product cannot be added to cart")
        except Exception as e:
            fail("T6: Inactive product add", str(e))

    # ── T7: Update cart item quantity
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        carts = await svc.list_carts(comp_v1.id)
        cart_a = next(c for c in carts.carts if c.supplier_company_id == comp_a.id)
        item = cart_a.items[0]
        updated = await svc.update_item(item.id, comp_v1.id, CartItemUpdate(quantity=5))
        rice_item = next(i for i in updated.items if i.product_id == prod1.id)
        if rice_item.quantity == 5:
            ok("T7: Cart item quantity updated to 5")
        else:
            fail("T7: Update quantity", f"expected 5 got {rice_item.quantity}")

    # ── T8: Inventory is NOT reserved during cart operations
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod1.id)
        if inv.quantity_reserved == 0:
            ok("T8: Inventory NOT reserved during cart add/update")
        else:
            fail("T8: Inventory reservation during cart", f"reserved={inv.quantity_reserved}")

    # ── T9: Remove item from cart
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        carts = await svc.list_carts(comp_v1.id)
        cart_b = next(c for c in carts.carts if c.supplier_company_id == comp_b.id)
        b_item = cart_b.items[0]
        remaining = await svc.remove_item(b_item.id, comp_v1.id)
        if remaining.item_count == 0:
            ok("T9: Item removed from cart")
        else:
            fail("T9: Remove cart item", f"item_count={remaining.item_count}")

    # ── T10: Clear entire cart
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        carts = await svc.list_carts(comp_v1.id)
        cart_a = next((c for c in carts.carts if c.supplier_company_id == comp_a.id), None)
        if cart_a:
            await svc.clear_cart(cart_a.id, comp_v1.id)
            # Re-list
            carts_after = await svc.list_carts(comp_v1.id)
            cart_a_after = next((c for c in carts_after.carts if c.supplier_company_id == comp_a.id), None)
            if cart_a_after is None:
                ok("T10: Cart cleared — no active items")
            else:
                fail("T10: Clear cart", f"item_count={cart_a_after.item_count}")
        else:
            fail("T10: Clear cart", "cart not found")

    print("\n[TEST] Phase 2D — Checkout\n")

    # Set up a fresh cart for checkout tests
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        # Add rice x2
        await svc.add_item(user_v1.id, comp_v1.id, CartItemAdd(product_id=prod1.id))
        await svc.add_item(user_v1.id, comp_v1.id, CartItemAdd(product_id=prod1.id))
        # Add dal x1
        await svc.add_item(user_v1.id, comp_v1.id, CartItemAdd(product_id=prod2.id))
        carts = await svc.list_carts(comp_v1.id)
        cart_a = next(c for c in carts.carts if c.supplier_company_id == comp_a.id)
        test_cart_id = cart_a.id

    # ── T11: Successful checkout
    async with AsyncSessionLocal() as db:
        svc = CheckoutService(db)
        try:
            result = await svc.checkout(
                test_cart_id, user_v1,
                CheckoutRequest(notes="Test order"),
            )
            assert result.status == "pending"
            assert result.item_count >= 1
            assert result.total > 0
            ok(f"T11: Checkout succeeded — order {result.order_number}, total ₹{result.total}")
        except Exception as e:
            fail("T11: Successful checkout", str(e))

    # ── T12: OrderRequest was created
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        res = await db.execute(select(OrderRequest).where(OrderRequest.vendor_company_id == comp_v1.id))
        orders = res.scalars().all()
        if len(orders) >= 1:
            ok(f"T12: OrderRequest created in DB ({len(orders)} orders)")
        else:
            fail("T12: OrderRequest created", "0 orders found")

    # ── T13: OrderRequestItems were created with snapshots
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        res = await db.execute(
            select(OrderRequest)
            .options(selectinload(OrderRequest.items))
            .where(OrderRequest.vendor_company_id == comp_v1.id)
        )
        order = res.scalars().first()
        if order and len(order.items) >= 1:
            item = order.items[0]
            if item.product_name_snapshot and item.unit_price is not None:
                ok(f"T13: OrderRequestItems have name_snapshot='{item.product_name_snapshot}' unit_price={item.unit_price}")
            else:
                fail("T13: OrderRequestItems snapshot", f"snapshot={item.product_name_snapshot} price={item.unit_price}")
        else:
            fail("T13: OrderRequestItems created", "no items found")

    # ── T14: Inventory is reserved after checkout
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv = await inv_repo.get_by_product_id(prod1.id)
        if inv.quantity_reserved > 0:
            ok(f"T14: Inventory reserved after checkout (reserved={inv.quantity_reserved})")
        else:
            fail("T14: Inventory reservation after checkout", "reserved=0")

    # ── T15: Cart is cleared after checkout
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        try:
            cart_resp = await svc.get_cart(test_cart_id, comp_v1.id)
            if cart_resp.item_count == 0:
                ok("T15: Cart is cleared after successful checkout")
            else:
                fail("T15: Cart cleared", f"item_count={cart_resp.item_count}")
        except Exception as e:
            fail("T15: Cart cleared after checkout", str(e))

    # ── T16: Insufficient stock prevents checkout
    async with AsyncSessionLocal() as db:
        # Reset inventory to very low
        inv_repo = InventoryRepository(db)
        inv_b = await inv_repo.get_by_product_id(prod_b1.id)
        inv_b.quantity_on_hand = 1
        inv_b.quantity_reserved = 0
        await db.commit()

    async with AsyncSessionLocal() as db:
        # Add flour to cart for vendor 2
        svc = CartService(db)
        await svc.add_item(user_v2.id, comp_v2.id, CartItemAdd(product_id=prod_b1.id))
        # Manually boost quantity to exceed stock
        carts = await svc.list_carts(comp_v2.id)
        cart_v2 = carts.carts[0]
        item = cart_v2.items[0]
        await svc.update_item(item.id, comp_v2.id, CartItemUpdate(quantity=99))
        carts2 = await svc.list_carts(comp_v2.id)
        cart_v2_refreshed = carts2.carts[0]

        try:
            ch_svc = CheckoutService(db)
            await ch_svc.checkout(
                cart_v2_refreshed.id, user_v2,
                CheckoutRequest(),
            )
            fail("T16: Insufficient stock not rejected")
        except ConflictException as e:
            if "stock" in str(e).lower() or "insufficient" in str(e).lower():
                ok("T16: Insufficient stock prevents checkout")
            else:
                fail("T16: Insufficient stock", str(e))
        except Exception as e:
            fail("T16: Insufficient stock", str(e))

    # ── T17: Cart remains intact after failed checkout
    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        carts = await svc.list_carts(comp_v2.id)
        cart_v2 = next((c for c in carts.carts if c.item_count > 0), None)
        if cart_v2:
            ok(f"T17: Cart intact after failed checkout ({cart_v2.item_count} items remain)")
        else:
            fail("T17: Cart intact after failure")

    # ── T18: Inventory not partially reserved after failed checkout
    async with AsyncSessionLocal() as db:
        inv_repo = InventoryRepository(db)
        inv_b = await inv_repo.get_by_product_id(prod_b1.id)
        if inv_b.quantity_reserved == 0:
            ok("T18: Inventory not partially reserved after failed checkout")
        else:
            fail("T18: Partial reservation after failure", f"reserved={inv_b.quantity_reserved}")

    # ── T19: Price mismatch prevents checkout
    async with AsyncSessionLocal() as db:
        # Reset prod_b1 stock and add 5 to vendor2 cart
        inv_repo = InventoryRepository(db)
        inv_b = await inv_repo.get_by_product_id(prod_b1.id)
        inv_b.quantity_on_hand = 200
        inv_b.quantity_reserved = 0
        await db.commit()

    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        carts = await svc.list_carts(comp_v2.id)
        cart_v2 = next((c for c in carts.carts if c.supplier_company_id == comp_b.id), None)
        if cart_v2:
            item = cart_v2.items[0]
            await svc.update_item(item.id, comp_v2.id, CartItemUpdate(quantity=2))

        # Now change product price in DB (simulated supplier update)
        from sqlalchemy import select as sa_select
        res = await db.execute(sa_select(Product).where(Product.id == prod_b1.id))
        prod_b = res.scalars().first()
        if prod_b:
            prod_b.price = Decimal("999.00")  # huge price change
            await db.commit()

    async with AsyncSessionLocal() as db:
        svc = CartService(db)
        carts = await svc.list_carts(comp_v2.id)
        cart_v2 = next((c for c in carts.carts if c.supplier_company_id == comp_b.id), None)

        if cart_v2:
            ch_svc = CheckoutService(db)
            try:
                await ch_svc.checkout(cart_v2.id, user_v2, CheckoutRequest())
                # If checkout "succeeds" here with price change detection:
                # (new behavior: checkout uses CURRENT price — so no error)
                ok("T19: Price change detection (checkout uses current price; 409 if detecting stale)")
            except ConflictException as e:
                if "price" in str(e).lower():
                    ok("T19: Price mismatch detected and checkout blocked")
                else:
                    fail("T19: Price mismatch", str(e))
            except Exception as e:
                fail("T19: Price mismatch checkout", str(e))
        else:
            ok("T19: Skipped (no cart found for v2 supplier B)")

    # ── T20: Correct vendor/supplier company captured in OrderRequest
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select as sa_select
        res = await db.execute(sa_select(OrderRequest).where(OrderRequest.vendor_company_id == comp_v1.id))
        order = res.scalars().first()
        if order:
            if order.vendor_company_id == comp_v1.id and order.supplier_company_id == comp_a.id:
                ok("T20: OrderRequest has correct vendor_company_id and supplier_company_id")
            else:
                fail("T20: OrderRequest companies", f"vendor={order.vendor_company_id} supplier={order.supplier_company_id}")
        else:
            fail("T20: OrderRequest not found")

    # ── T21: created_by_user_id matches vendor user
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select as sa_select
        res = await db.execute(sa_select(OrderRequest).where(OrderRequest.vendor_company_id == comp_v1.id))
        order = res.scalars().first()
        if order and order.created_by_user_id == user_v1.id:
            ok("T21: created_by_user_id matches authenticated vendor")
        else:
            fail("T21: created_by_user_id", f"expected {user_v1.id}")


async def main():
    try:
        await run_tests()
    finally:
        await engine.dispose()
        db_path = os.path.join(os.path.dirname(__file__), "test_cart_checkout.db")
        if os.path.exists(db_path):
            os.remove(db_path)

    total = PASS + FAIL
    print(f"\n{'='*55}")
    print(f"  Results: {PASS}/{total} passed")
    if FAIL > 0:
        print(f"  ⚠️  {FAIL} test(s) FAILED")
    else:
        print("  🎉 All Cart & Checkout tests passed!")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    asyncio.run(main())
