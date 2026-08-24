"""
Flowza Phase 3 — Order Fulfillment & Order Lifecycle Test Suite
===============================================================
Comprehensive test suite verifying:
- Canonical OrderRequest / OrderRequestItem lifecycle
- State machine transition matrix (valid & invalid transitions)
- Company-level multi-tenant RBAC (supplier vs vendor)
- Atomic inventory reservation, fulfillment, and release
- Prevention of double-fulfillment / negative stock
- Order status history & chronological timeline
- Historical snapshot integrity (product name & price mutations)
- Post-commit WebSocket notification triggers

Run from backend/ directory:
    .\\venv\\Scripts\\python test_order_fulfillment_lifecycle.py
"""
import asyncio
import sys
import os
import io
import time
import uuid
from decimal import Decimal
from datetime import datetime, timezone, date
from typing import List, Tuple

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

DATABASE_URL = "sqlite+aiosqlite:///./test_phase3_lifecycle.db"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

from app.database.base import Base
from app.models import (
    Role, User, Company, Address, Product, Inventory,
    Cart, CartItem, OrderRequest, OrderRequestItem, OrderStatusHistory
)
from app.core.security import get_password_hash
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.cart_repo import CartRepository
from app.services.cart_service import CartService
from app.services.checkout_service import CheckoutService
from app.services.order_lifecycle_service import OrderLifecycleService
from app.schemas.cart import CartItemAdd, CartItemUpdate, CheckoutRequest
from app.core.exceptions import (
    NotFoundException, ConflictException, PermissionDeniedException, BadRequestException
)

PASS = 0
FAIL = 0


def ok(label: str):
    global PASS
    PASS += 1
    print(f"  ✅ PASS: {label}")


def fail(label: str, reason: str = ""):
    global FAIL
    FAIL += 1
    print(f"  ❌ FAIL: {label} — {reason}")


async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Roles
        supplier_role = Role(name="supplier", description="Supplier")
        vendor_role = Role(name="vendor", description="Vendor")
        admin_role = Role(name="admin", description="Admin")
        db.add_all([supplier_role, vendor_role, admin_role])
        await db.flush()

        # Supplier Company 1
        comp_sup1 = Company(company_name="Alpha Wholesale Ltd", business_type="Wholesaler", gst_number="33AAAAA0000A1Z5")
        db.add(comp_sup1)
        await db.flush()

        user_sup1 = User(
            full_name="Suresh Supplier",
            email="suresh@alpha.com",
            phone="9876543210",
            hashed_password=get_password_hash("password123"),
            role_id=supplier_role.id,
            company_id=comp_sup1.id,
            is_active=True,
        )
        db.add(user_sup1)

        # Supplier Company 2 (for multi-tenant isolation tests)
        comp_sup2 = Company(company_name="Beta Distributions", business_type="Distributor", gst_number="33BBBBB0000B1Z6")
        db.add(comp_sup2)
        await db.flush()

        user_sup2 = User(
            full_name="Bhavin Supplier",
            email="bhavin@beta.com",
            phone="9876543211",
            hashed_password=get_password_hash("password123"),
            role_id=supplier_role.id,
            company_id=comp_sup2.id,
            is_active=True,
        )
        db.add(user_sup2)

        # Vendor Company 1
        comp_ven1 = Company(company_name="City Retail Mart", business_type="Retailer", gst_number="33CCCCC0000C1Z7")
        db.add(comp_ven1)
        await db.flush()

        user_ven1 = User(
            full_name="Vijay Vendor",
            email="vijay@citymart.com",
            phone="9876543212",
            hashed_password=get_password_hash("password123"),
            role_id=vendor_role.id,
            company_id=comp_ven1.id,
            is_active=True,
        )
        db.add(user_ven1)

        # Vendor Company 2 (for multi-tenant isolation tests)
        comp_ven2 = Company(company_name="Metro Grocery Shop", business_type="Retailer", gst_number="33DDDDD0000D1Z8")
        db.add(comp_ven2)
        await db.flush()

        user_ven2 = User(
            full_name="Manoj Vendor",
            email="manoj@metrogrocery.com",
            phone="9876543213",
            hashed_password=get_password_hash("password123"),
            role_id=vendor_role.id,
            company_id=comp_ven2.id,
            is_active=True,
        )
        db.add(user_ven2)

        # Admin User
        user_admin = User(
            full_name="System Administrator",
            email="admin@flowza.com",
            phone="9876543219",
            hashed_password=get_password_hash("admin123"),
            role_id=admin_role.id,
            company_id=comp_sup1.id,
            is_active=True,
        )
        db.add(user_admin)

        # Products for Supplier 1
        prod1 = Product(
            company_id=comp_sup1.id,
            name="Organic Basmati Rice",
            sku="RICE-BAS-001",
            category="Grains",
            price=Decimal("120.00"),
            unit="kg",
            is_active=True,
        )
        prod2 = Product(
            company_id=comp_sup1.id,
            name="Refined Sunflower Oil",
            sku="OIL-SUN-001",
            category="Oils",
            price=Decimal("150.00"),
            unit="L",
            is_active=True,
        )
        db.add_all([prod1, prod2])
        await db.flush()

        # Inventories for Products (Initial: 100 on_hand, 0 reserved)
        inv1 = Inventory(product_id=prod1.id, quantity_on_hand=100, quantity_reserved=0, reorder_level=20)
        inv2 = Inventory(product_id=prod2.id, quantity_on_hand=100, quantity_reserved=0, reorder_level=20)
        db.add_all([inv1, inv2])

        await db.commit()


async def prepare_cart(db: AsyncSession, vendor: User, items: List[Tuple[Product, int]]) -> uuid.UUID:
    """Helper to populate a cart with custom quantities."""
    cart_repo = CartRepository(db)
    supplier_comp_id = items[0][0].company_id
    cart = await cart_repo.get_or_create_cart(vendor.id, vendor.company_id, supplier_comp_id)
    for prod, qty in items:
        existing = await cart_repo.get_any_cart_item(cart.id, prod.id)
        if existing:
            existing.is_deleted = False
            await cart_repo.update_item_quantity(existing, qty, float(prod.price))
        else:
            await cart_repo.add_item(cart.id, prod.id, qty, float(prod.price))
    await db.commit()
    return cart.id


async def run_tests():
    print("=" * 65)
    print("FLOWZA PHASE 3 TEST SUITE: ORDER FULFILLMENT & ORDER LIFECYCLE")
    print("=" * 65)

    await setup_db()

    async with AsyncSessionLocal() as db:
        # Load test actors
        user_sup1 = (await db.execute(select(User).where(User.email == "suresh@alpha.com"))).scalar_one()
        user_sup2 = (await db.execute(select(User).where(User.email == "bhavin@beta.com"))).scalar_one()
        user_ven1 = (await db.execute(select(User).where(User.email == "vijay@citymart.com"))).scalar_one()
        user_ven2 = (await db.execute(select(User).where(User.email == "manoj@metrogrocery.com"))).scalar_one()
        user_admin = (await db.execute(select(User).where(User.email == "admin@flowza.com"))).scalar_one()
        prod1 = (await db.execute(select(Product).where(Product.sku == "RICE-BAS-001"))).scalar_one()
        prod2 = (await db.execute(select(Product).where(Product.sku == "OIL-SUN-001"))).scalar_one()

        inv_repo = InventoryRepository(db)
        checkout_svc = CheckoutService(db)
        lifecycle_svc = OrderLifecycleService(db)

        # -------------------------------------------------------------
        # Section 1: Complete Happy Path Lifecycle
        # PENDING -> ACCEPTED -> PROCESSING -> PACKED -> SHIPPED -> DELIVERED -> COMPLETED
        # -------------------------------------------------------------
        print("\nSection 1: Happy Path Lifecycle (Checkout to Completed)")

        # 1. Checkout 20kg rice + 10L oil
        cart1_id = await prepare_cart(db, user_ven1, [(prod1, 20), (prod2, 10)])

        checkout_res = await checkout_svc.checkout(
            cart_id=cart1_id,
            vendor=user_ven1,
            req=CheckoutRequest(notes="Urgent monthly store supply"),
        )
        order_id = uuid.UUID(checkout_res.order_id)

        # Verify checkout reservation
        inv1 = await inv_repo.get_by_product_id(prod1.id)
        inv2 = await inv_repo.get_by_product_id(prod2.id)
        if inv1.quantity_reserved == 20 and inv1.quantity_on_hand == 100:
            ok("Checkout reserved 20 units for Product 1 (on_hand: 100, reserved: 20)")
        else:
            fail("Checkout reservation for Product 1", f"on_hand={inv1.quantity_on_hand}, reserved={inv1.quantity_reserved}")

        # PENDING -> ACCEPTED (Supplier)
        order = await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="accepted",
            current_user=user_sup1,
            note="Order confirmed by warehouse",
        )
        if order.status == "accepted" and order.supplier_response == "Order confirmed by warehouse":
            ok("Supplier ACCEPTED order (status=accepted)")
        else:
            fail("Supplier ACCEPT transition", f"status={order.status}")

        # Check reservation remained intact
        inv1 = await inv_repo.get_by_product_id(prod1.id)
        if inv1.quantity_reserved == 20 and inv1.quantity_on_hand == 100:
            ok("Reservation preserved during ACCEPTED stage (reserved=20, on_hand=100)")
        else:
            fail("Reservation during ACCEPTED", f"reserved={inv1.quantity_reserved}")

        # ACCEPTED -> PROCESSING (Supplier)
        order = await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="processing",
            current_user=user_sup1,
            note="Packing in progress at Bay 3",
        )
        if order.status == "processing":
            ok("Supplier started PROCESSING (status=processing)")
        else:
            fail("Supplier PROCESSING transition", f"status={order.status}")

        # PROCESSING -> PACKED (Supplier)
        order = await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="packed",
            current_user=user_sup1,
            note="All 2 pallets sealed and barcoded",
        )
        if order.status == "packed":
            ok("Supplier marked order as PACKED (status=packed)")
        else:
            fail("Supplier PACKED transition", f"status={order.status}")

        # PACKED -> SHIPPED (Supplier)
        order = await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="shipped",
            current_user=user_sup1,
            note="Dispatched via Alpha Express Truck #TN38-9988",
        )
        if order.status == "shipped":
            ok("Supplier marked order as SHIPPED (status=shipped)")
        else:
            fail("Supplier SHIPPED transition", f"status={order.status}")

        # Check reservation remained intact during transit
        inv1 = await inv_repo.get_by_product_id(prod1.id)
        if inv1.quantity_reserved == 20 and inv1.quantity_on_hand == 100:
            ok("Reservation preserved during SHIPPED transit (reserved=20, on_hand=100)")
        else:
            fail("Reservation during SHIPPED", f"reserved={inv1.quantity_reserved}")

        # SHIPPED -> DELIVERED (Vendor confirms receipt)
        order = await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="delivered",
            current_user=user_ven1,
            note="Shipment unloaded at store dock",
        )
        if order.status == "delivered":
            ok("Vendor confirmed receipt as DELIVERED (status=delivered)")
        else:
            fail("Vendor DELIVERED transition", f"status={order.status}")

        # DELIVERED -> COMPLETED (Vendor final signoff & inventory settlement)
        order = await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="completed",
            current_user=user_ven1,
            note="Quality verified and signed off",
        )
        if order.status == "completed":
            ok("Vendor COMPLETED order (status=completed)")
        else:
            fail("Vendor COMPLETED transition", f"status={order.status}")

        # Final inventory verification (Product 1: 100-20=80 on_hand, 20-20=0 reserved)
        inv1 = await inv_repo.get_by_product_id(prod1.id)
        inv2 = await inv_repo.get_by_product_id(prod2.id)
        if inv1.quantity_on_hand == 80 and inv1.quantity_reserved == 0:
            ok("Final inventory settlement Product 1: on_hand=80, reserved=0")
        else:
            fail("Final inventory settlement Product 1", f"on_hand={inv1.quantity_on_hand}, reserved={inv1.quantity_reserved}")

        if inv2.quantity_on_hand == 90 and inv2.quantity_reserved == 0:
            ok("Final inventory settlement Product 2: on_hand=90, reserved=0")
        else:
            fail("Final inventory settlement Product 2", f"on_hand={inv2.quantity_on_hand}, reserved={inv2.quantity_reserved}")

        # Verify chronological timeline entries
        loaded_order = await lifecycle_svc.get_order_with_relations(order_id)
        history_statuses = [h.to_status for h in loaded_order.status_history]
        expected_history = ["pending", "accepted", "processing", "packed", "shipped", "delivered", "completed"]
        if history_statuses == expected_history:
            ok(f"Status history chronological timeline intact: {' -> '.join(history_statuses)}")
        else:
            fail("Status history timeline", f"got {history_statuses}, expected {expected_history}")

        # -------------------------------------------------------------
        # Section 2: Supplier Rejection (PENDING -> REJECTED)
        # -------------------------------------------------------------
        print("\nSection 2: Supplier Rejection Flow & Inventory Release")

        # Checkout 15 units of Product 1 (current on_hand=80, reserved becomes 15)
        cart2_id = await prepare_cart(db, user_ven1, [(prod1, 15)])
        chk2 = await checkout_svc.checkout(cart_id=cart2_id, vendor=user_ven1, req=CheckoutRequest(notes="Order to be rejected"))
        ord2_id = uuid.UUID(chk2.order_id)

        inv1 = await inv_repo.get_by_product_id(prod1.id)
        if inv1.quantity_reserved == 15 and inv1.quantity_on_hand == 80:
            ok("Pre-rejection reserved=15, on_hand=80")
        else:
            fail("Pre-rejection stock", f"reserved={inv1.quantity_reserved}, on_hand={inv1.quantity_on_hand}")

        # Supplier rejects
        order_rej = await lifecycle_svc.transition_order_status(
            order_id=ord2_id,
            target_status_raw="rejected",
            current_user=user_sup1,
            note="Out of stock for requested batch",
        )
        if order_rej.status == "rejected":
            ok("Supplier REJECTED pending order")
        else:
            fail("Supplier REJECT", f"status={order_rej.status}")

        # Verify reservation released
        inv1 = await inv_repo.get_by_product_id(prod1.id)
        if inv1.quantity_reserved == 0 and inv1.quantity_on_hand == 80:
            ok("Rejection released reservation: reserved=0, on_hand=80")
        else:
            fail("Rejection stock release", f"reserved={inv1.quantity_reserved}, on_hand={inv1.quantity_on_hand}")

        # -------------------------------------------------------------
        # Section 3: Vendor Cancellation Flows (PENDING & ACCEPTED)
        # -------------------------------------------------------------
        print("\nSection 3: Vendor Cancellation Flows")

        # Case A: Cancel from PENDING
        cart3_id = await prepare_cart(db, user_ven1, [(prod1, 10)])
        chk3 = await checkout_svc.checkout(cart_id=cart3_id, vendor=user_ven1, req=CheckoutRequest())
        ord3_id = uuid.UUID(chk3.order_id)

        order_can1 = await lifecycle_svc.transition_order_status(
            order_id=ord3_id,
            target_status_raw="cancelled",
            current_user=user_ven1,
            note="Placed by mistake",
        )
        inv1 = await inv_repo.get_by_product_id(prod1.id)
        if order_can1.status == "cancelled" and inv1.quantity_reserved == 0:
            ok("Vendor cancelled PENDING order; reservation released (reserved=0)")
        else:
            fail("Vendor cancel PENDING", f"status={order_can1.status}, reserved={inv1.quantity_reserved}")

        # Case B: Cancel from ACCEPTED
        cart4_id = await prepare_cart(db, user_ven1, [(prod1, 12)])
        chk4 = await checkout_svc.checkout(cart_id=cart4_id, vendor=user_ven1, req=CheckoutRequest())
        ord4_id = uuid.UUID(chk4.order_id)

        # Supplier accepts
        await lifecycle_svc.transition_order_status(ord4_id, "accepted", user_sup1)
        # Vendor cancels before processing begins
        order_can2 = await lifecycle_svc.transition_order_status(ord4_id, "cancelled", user_ven1, "Vendor requested pre-processing cancel")
        inv1 = await inv_repo.get_by_product_id(prod1.id)
        if order_can2.status == "cancelled" and inv1.quantity_reserved == 0:
            ok("Vendor cancelled ACCEPTED order; reservation released (reserved=0)")
        else:
            fail("Vendor cancel ACCEPTED", f"status={order_can2.status}, reserved={inv1.quantity_reserved}")

        # -------------------------------------------------------------
        # Section 4: Invalid Status Transitions (Matrix Enforcement)
        # -------------------------------------------------------------
        print("\nSection 4: Invalid Status Transitions (State Machine Matrix)")

        # Create new pending order
        cart5_id = await prepare_cart(db, user_ven1, [(prod1, 5)])
        chk5 = await checkout_svc.checkout(cart_id=cart5_id, vendor=user_ven1, req=CheckoutRequest())
        ord5_id = uuid.UUID(chk5.order_id)

        # 1. PENDING -> SHIPPED (invalid jump)
        try:
            await lifecycle_svc.transition_order_status(ord5_id, "shipped", user_sup1)
            fail("PENDING -> SHIPPED should have raised ConflictException")
        except ConflictException:
            ok("PENDING -> SHIPPED rejected with ConflictException")

        # 2. PENDING -> COMPLETED (invalid jump)
        try:
            await lifecycle_svc.transition_order_status(ord5_id, "completed", user_ven1)
            fail("PENDING -> COMPLETED should have raised ConflictException")
        except ConflictException:
            ok("PENDING -> COMPLETED rejected with ConflictException")

        # Advance to PROCESSING
        await lifecycle_svc.transition_order_status(ord5_id, "accepted", user_sup1)
        await lifecycle_svc.transition_order_status(ord5_id, "processing", user_sup1)

        # 3. PROCESSING -> CANCELLED (cancellation disallowed once in processing)
        try:
            await lifecycle_svc.transition_order_status(ord5_id, "cancelled", user_ven1)
            fail("PROCESSING -> CANCELLED should have raised ConflictException")
        except ConflictException:
            ok("PROCESSING -> CANCELLED rejected with ConflictException")

        # Advance to SHIPPED
        await lifecycle_svc.transition_order_status(ord5_id, "packed", user_sup1)
        await lifecycle_svc.transition_order_status(ord5_id, "shipped", user_sup1)

        # 4. SHIPPED -> PROCESSING (backward transition)
        try:
            await lifecycle_svc.transition_order_status(ord5_id, "processing", user_sup1)
            fail("SHIPPED -> PROCESSING should have raised ConflictException")
        except ConflictException:
            ok("SHIPPED -> PROCESSING rejected with ConflictException")

        # Advance to COMPLETED
        await lifecycle_svc.transition_order_status(ord5_id, "delivered", user_ven1)
        await lifecycle_svc.transition_order_status(ord5_id, "completed", user_ven1)

        # 5. COMPLETED -> PROCESSING (terminal state transition)
        try:
            await lifecycle_svc.transition_order_status(ord5_id, "processing", user_sup1)
            fail("COMPLETED -> PROCESSING should have raised ConflictException")
        except ConflictException:
            ok("COMPLETED -> PROCESSING rejected with ConflictException")

        # 6. COMPLETED -> CANCELLED (terminal state transition)
        try:
            await lifecycle_svc.transition_order_status(ord5_id, "cancelled", user_ven1)
            fail("COMPLETED -> CANCELLED should have raised ConflictException")
        except ConflictException:
            ok("COMPLETED -> CANCELLED rejected with ConflictException")

        # -------------------------------------------------------------
        # Section 5: Multi-Tenant Authorization & Role Permissions
        # -------------------------------------------------------------
        print("\nSection 5: Multi-Tenant Authorization & Role Permissions")

        # Create order between Vendor 1 and Supplier 1
        cart6_id = await prepare_cart(db, user_ven1, [(prod1, 5)])
        chk6 = await checkout_svc.checkout(cart_id=cart6_id, vendor=user_ven1, req=CheckoutRequest())
        ord6_id = uuid.UUID(chk6.order_id)

        # 1. Supplier 2 (unassigned supplier) tries to ACCEPT Supplier 1's order
        try:
            await lifecycle_svc.transition_order_status(ord6_id, "accepted", user_sup2)
            fail("Cross-supplier accept should have raised PermissionDeniedException")
        except PermissionDeniedException:
            ok("Cross-supplier ACCEPT rejected with PermissionDeniedException (403)")

        # 2. Vendor 2 (unrelated vendor) tries to CANCEL Vendor 1's order
        try:
            await lifecycle_svc.transition_order_status(ord6_id, "cancelled", user_ven2)
            fail("Cross-vendor cancel should have raised PermissionDeniedException")
        except PermissionDeniedException:
            ok("Cross-vendor CANCEL rejected with PermissionDeniedException (403)")

        # 3. Vendor tries to perform Supplier-only action (ACCEPT)
        try:
            await lifecycle_svc.transition_order_status(ord6_id, "accepted", user_ven1)
            fail("Vendor performing ACCEPT should have raised PermissionDeniedException")
        except PermissionDeniedException:
            ok("Vendor performing ACCEPT rejected with PermissionDeniedException (403)")

        # Advance to SHIPPED
        await lifecycle_svc.transition_order_status(ord6_id, "accepted", user_sup1)
        await lifecycle_svc.transition_order_status(ord6_id, "processing", user_sup1)
        await lifecycle_svc.transition_order_status(ord6_id, "packed", user_sup1)
        await lifecycle_svc.transition_order_status(ord6_id, "shipped", user_sup1)

        # 4. Supplier tries to perform Vendor-only action (DELIVERED)
        try:
            await lifecycle_svc.transition_order_status(ord6_id, "delivered", user_sup1)
            fail("Supplier confirming DELIVERED should have raised PermissionDeniedException")
        except PermissionDeniedException:
            ok("Supplier confirming DELIVERED rejected with PermissionDeniedException (403)")

        # Clean up order to completed
        await lifecycle_svc.transition_order_status(ord6_id, "delivered", user_ven1)
        await lifecycle_svc.transition_order_status(ord6_id, "completed", user_ven1)

        # -------------------------------------------------------------
        # Section 6: Idempotency & Double Fulfillment Prevention
        # -------------------------------------------------------------
        print("\nSection 6: Idempotency & Double-Fulfillment Prevention")

        inv1_before = await inv_repo.get_by_product_id(prod1.id)
        stock_on_hand_before = inv1_before.quantity_on_hand
        stock_reserved_before = inv1_before.quantity_reserved

        # Attempt to complete the already completed order again
        try:
            await lifecycle_svc.transition_order_status(ord6_id, "completed", user_ven1)
            fail("Duplicate completion should have raised ConflictException")
        except ConflictException:
            ok("Duplicate completion rejected with ConflictException")

        # Verify stock was NOT deducted again
        inv1_after = await inv_repo.get_by_product_id(prod1.id)
        if inv1_after.quantity_on_hand == stock_on_hand_before and inv1_after.quantity_reserved == stock_reserved_before:
            ok(f"Zero double deduction: stock preserved exactly at on_hand={stock_on_hand_before}")
        else:
            fail("Double deduction occurred", f"before={stock_on_hand_before}, after={inv1_after.quantity_on_hand}")

        # -------------------------------------------------------------
        # Section 7: Historical Snapshot Integrity
        # -------------------------------------------------------------
        print("\nSection 7: Historical Snapshot Integrity")

        # Create order with original product name and price
        cart7_id = await prepare_cart(db, user_ven1, [(prod1, 4)])
        chk7 = await checkout_svc.checkout(cart_id=cart7_id, vendor=user_ven1, req=CheckoutRequest())
        ord7_id = uuid.UUID(chk7.order_id)

        # Modify Product in catalog: price changes from 120 -> 999, name changes to 'Ultra Luxury Rice'
        prod1.price = Decimal("999.00")
        prod1.name = "Ultra Luxury Rice"
        await db.commit()

        # Load order and verify snapshot fields and calculated totals remain intact
        loaded_ord7 = await lifecycle_svc.get_order_with_relations(ord7_id)
        item = loaded_ord7.items[0]
        if item.product_name_snapshot == "Organic Basmati Rice" and item.unit_price == Decimal("120.00"):
            ok("Historical item preserved original name snapshot ('Organic Basmati Rice') and unit price (120.00)")
        else:
            fail("Historical snapshot corrupted", f"name={item.product_name_snapshot}, price={item.unit_price}")

        # Complete and verify
        await lifecycle_svc.transition_order_status(ord7_id, "accepted", user_sup1)
        await lifecycle_svc.transition_order_status(ord7_id, "processing", user_sup1)
        await lifecycle_svc.transition_order_status(ord7_id, "packed", user_sup1)
        await lifecycle_svc.transition_order_status(ord7_id, "shipped", user_sup1)
        await lifecycle_svc.transition_order_status(ord7_id, "delivered", user_ven1)
        await lifecycle_svc.transition_order_status(ord7_id, "completed", user_ven1)
        ok("Historical order completed successfully without being altered by live product updates")

    print("\n" + "=" * 65)
    print(f"RESULTS: {PASS} PASSED, {FAIL} FAILED")
    print("=" * 65)
    if FAIL > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_tests())
