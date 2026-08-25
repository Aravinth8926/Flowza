"""
FLOWZA PHASE 5 TEST SUITE: NOTIFICATIONS & COMMUNICATION SYSTEM
=================================================================
Automated verification suite validating persistent notifications,
transactional consistency, WebSocket dispatch, multi-tenant isolation,
unread counters, deduplication keys, and user preference enforcement.
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, delete

from app.database.base import Base
from app.models.role import Role
from app.models.user import User
from app.models.company import Company
from app.models.address import Address
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.order_status_history import OrderStatusHistory
from app.models.invoice import Invoice, InvoiceItem, PaymentRecord
from app.models.notification import Notification, NotificationPreference

from app.repositories.notification_repo import NotificationRepository
from app.services.notification_service import (
    NotificationService,
    NotificationType,
    NotificationPriority,
    serialize_notification,
)
from app.services.checkout_service import CheckoutService
from app.services.order_lifecycle_service import OrderLifecycleService
from app.services.invoice_service import InvoiceService
from app.services.inventory_service import InventoryService
from app.schemas.cart import CartItemAdd, CheckoutRequest
from app.schemas.invoice import InvoiceGenerateRequest, PaymentRecordCreate
from app.schemas.inventory import InventoryAdjust
from app.core.exceptions import NotFoundException, ConflictException, PermissionDeniedException, BadRequestException
from app.core.websocket import manager as ws_manager

PASS = 0
FAIL = 0

def report(desc: str, success: bool):
    global PASS, FAIL
    if success:
        PASS += 1
        print(f"  [PASS] {desc}")
    else:
        FAIL += 1
        print(f"  [FAIL] {desc}")


TEST_DB_URL = "sqlite+aiosqlite:///./test_phase5_notifications.db"


async def setup_test_db():
    if os.path.exists("test_phase5_notifications.db"):
        try:
            os.remove("test_phase5_notifications.db")
        except Exception:
            pass

    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    return engine, session_factory


async def seed_base_data(db: AsyncSession):
    # Roles
    admin_role = Role(id=uuid.uuid4(), name="admin", description="Platform Admin")
    supplier_role = Role(id=uuid.uuid4(), name="supplier", description="Supplier")
    vendor_role = Role(id=uuid.uuid4(), name="vendor", description="Vendor")
    db.add_all([admin_role, supplier_role, vendor_role])
    await db.flush()

    # Companies
    sup_company = Company(
        id=uuid.uuid4(),
        company_name="Apex Global Supplies Ltd",
        business_type="Wholesaler",
        gst_number="29AAACA1234A1Z5",
    )
    ven_company = Company(
        id=uuid.uuid4(),
        company_name="Urban Fresh Marts Pvt Ltd",
        business_type="Supermarket",
        gst_number="29BBBCA5678B1Z2",
    )
    other_ven_company = Company(
        id=uuid.uuid4(),
        company_name="Metro Store Co",
        business_type="Grocery",
    )
    db.add_all([sup_company, ven_company, other_ven_company])
    await db.flush()

    # Users
    admin_user = User(
        id=uuid.uuid4(),
        email="admin@flowza.com",
        phone="9999999999",
        hashed_password="hash",
        full_name="Platform Admin",
        role_id=admin_role.id,
        role=admin_role,
        is_active=True,
    )
    supplier_user_1 = User(
        id=uuid.uuid4(),
        email="supplier1@apex.com",
        phone="9876543211",
        hashed_password="hash",
        full_name="Rahul Supplier One",
        role_id=supplier_role.id,
        role=supplier_role,
        company_id=sup_company.id,
        company=sup_company,
        is_active=True,
    )
    supplier_user_2 = User(
        id=uuid.uuid4(),
        email="supplier2@apex.com",
        phone="9876543212",
        hashed_password="hash",
        full_name="Priya Supplier Two",
        role_id=supplier_role.id,
        role=supplier_role,
        company_id=sup_company.id,
        company=sup_company,
        is_active=True,
    )
    vendor_user_1 = User(
        id=uuid.uuid4(),
        email="vendor1@urbanfresh.com",
        phone="9876543213",
        hashed_password="hash",
        full_name="Vikram Vendor One",
        role_id=vendor_role.id,
        role=vendor_role,
        company_id=ven_company.id,
        company=ven_company,
        is_active=True,
    )
    vendor_user_2 = User(
        id=uuid.uuid4(),
        email="vendor2@urbanfresh.com",
        phone="9876543214",
        hashed_password="hash",
        full_name="Anita Vendor Two",
        role_id=vendor_role.id,
        role=vendor_role,
        company_id=ven_company.id,
        company=ven_company,
        is_active=True,
    )
    other_vendor_user = User(
        id=uuid.uuid4(),
        email="other@metrostore.com",
        phone="9876543215",
        hashed_password="hash",
        full_name="Sanjay Metro Vendor",
        role_id=vendor_role.id,
        role=vendor_role,
        company_id=other_ven_company.id,
        company=other_ven_company,
        is_active=True,
    )
    db.add_all([admin_user, supplier_user_1, supplier_user_2, vendor_user_1, vendor_user_2, other_vendor_user])
    await db.flush()

    # Product & Inventory
    product_1 = Product(
        id=uuid.uuid4(),
        company_id=sup_company.id,
        name="Basmati Royal Rice 25kg",
        sku="RIC-BAS-001",
        category="Grains",
        price=Decimal("1500.00"),
        unit="bag",
        is_active=True,
    )
    product_2 = Product(
        id=uuid.uuid4(),
        company_id=sup_company.id,
        name="Cold Pressed Mustard Oil 5L",
        sku="OIL-MUS-005",
        category="Oils",
        price=Decimal("800.00"),
        unit="can",
        is_active=True,
    )
    db.add_all([product_1, product_2])
    await db.flush()

    inv_1 = Inventory(
        id=uuid.uuid4(),
        product_id=product_1.id,
        quantity_on_hand=100,
        quantity_reserved=0,
        reorder_level=15,
        reorder_quantity=50,
    )
    inv_2 = Inventory(
        id=uuid.uuid4(),
        product_id=product_2.id,
        quantity_on_hand=50,
        quantity_reserved=0,
        reorder_level=10,
        reorder_quantity=30,
    )
    db.add_all([inv_1, inv_2])
    await db.commit()

    return {
        "admin": admin_user,
        "supplier_1": supplier_user_1,
        "supplier_2": supplier_user_2,
        "vendor_1": vendor_user_1,
        "vendor_2": vendor_user_2,
        "other_vendor": other_vendor_user,
        "sup_company": sup_company,
        "ven_company": ven_company,
        "product_1": product_1,
        "product_2": product_2,
        "inv_1": inv_1,
        "inv_2": inv_2,
    }


async def run_phase5_tests():
    print("=================================================================")
    print("FLOWZA PHASE 5 TEST SUITE: NOTIFICATIONS & COMMUNICATION SYSTEM")
    print("=================================================================\n")

    engine, session_factory = await setup_test_db()

    async with session_factory() as db:
        data = await seed_base_data(db)

    # -------------------------------------------------------------
    # SECTION 1: Order Lifecycle Notification Transitions
    # -------------------------------------------------------------
    print("Section 1: Order Lifecycle Notification Transitions")
    order_id = None
    async with session_factory() as db:
        checkout_svc = CheckoutService(db)
        notif_repo = NotificationRepository(db)

        # 1. Checkout order
        vendor_1 = data["vendor_1"]
        supplier_company_id = data["sup_company"].id

        cart = await checkout_svc.cart_repo.get_or_create_cart(
            vendor_1.id, vendor_1.company_id, supplier_company_id
        )
        await checkout_svc.cart_repo.add_item(
            cart.id, data["product_1"].id, 5, 1500.00
        )
        await db.refresh(cart, ["items"])

        checkout_resp = await checkout_svc.checkout(cart.id, vendor_1, CheckoutRequest(delivery_notes="Priority Delivery"))
        order_id = uuid.UUID(checkout_resp.order_id)

        # Verify notifications created for supplier users (both supplier 1 and supplier 2)
        sup1_notifs, sup1_count = await notif_repo.list_for_user(data["supplier_1"].id)
        sup2_notifs, sup2_count = await notif_repo.list_for_user(data["supplier_2"].id)

        report(
            "Checkout created ORDER_CREATED notification for Supplier 1",
            sup1_count == 1 and sup1_notifs[0].type == NotificationType.ORDER_CREATED
        )
        report(
            "Checkout created ORDER_CREATED notification for Supplier 2 (company broadcast)",
            sup2_count == 1 and sup2_notifs[0].type == NotificationType.ORDER_CREATED
        )
        report(
            "Notification entity linking points to ORDER and order_id",
            sup1_notifs[0].entity_type == "ORDER" and sup1_notifs[0].entity_id == order_id
        )

    # 2. Supplier Accepts Order -> Vendor notified
    async with session_factory() as db:
        lifecycle_svc = OrderLifecycleService(db)
        notif_repo = NotificationRepository(db)

        await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="accepted",
            current_user=data["supplier_1"],
            note="Order confirmed and scheduled for packing.",
        )

        ven1_notifs, _ = await notif_repo.list_for_user(data["vendor_1"].id, notif_type="ORDER")
        report(
            "Order acceptance created ORDER_ACCEPTED notification for Vendor 1",
            len(ven1_notifs) >= 1 and ven1_notifs[0].type == NotificationType.ORDER_ACCEPTED
        )

    # 3. Processing & Packed -> Vendor notified
    async with session_factory() as db:
        lifecycle_svc = OrderLifecycleService(db)
        notif_repo = NotificationRepository(db)

        await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="processing",
            current_user=data["supplier_1"],
            note="Processing in warehouse",
        )
        await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="packed",
            current_user=data["supplier_1"],
            note="Boxes sealed and labeled",
        )

        ven1_notifs, _ = await notif_repo.list_for_user(data["vendor_1"].id, notif_type="ORDER")
        types = [n.type for n in ven1_notifs]
        report(
            "Order processing and packing generated respective notifications",
            NotificationType.ORDER_PROCESSING in types and NotificationType.ORDER_PACKED in types
        )

    # 4. Shipped -> Vendor notified
    async with session_factory() as db:
        lifecycle_svc = OrderLifecycleService(db)
        notif_repo = NotificationRepository(db)

        await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="shipped",
            current_user=data["supplier_1"],
            note="Dispatched via BlueDart",
        )

        ven1_notifs, _ = await notif_repo.list_for_user(data["vendor_1"].id, notif_type="ORDER")
        report(
            "Order shipment generated ORDER_SHIPPED notification for vendor",
            ven1_notifs[0].type == NotificationType.ORDER_SHIPPED
        )

    # 5. Delivered & Completed -> Supplier notified
    async with session_factory() as db:
        lifecycle_svc = OrderLifecycleService(db)
        notif_repo = NotificationRepository(db)

        await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="delivered",
            current_user=data["vendor_1"],
            note="Goods received at unloading bay",
        )
        await lifecycle_svc.transition_order_status(
            order_id=order_id,
            target_status_raw="completed",
            current_user=data["vendor_1"],
            note="Audit passed, fully verified",
        )

        sup1_notifs, _ = await notif_repo.list_for_user(data["supplier_1"].id, notif_type="ORDER")
        types = [n.type for n in sup1_notifs]
        report(
            "Order delivery and completion created notifications for supplier",
            NotificationType.ORDER_DELIVERED in types and NotificationType.ORDER_COMPLETED in types
        )

    # 6. Order Rejection and Cancellation notifications
    async with session_factory() as db:
        checkout_svc = CheckoutService(db)
        lifecycle_svc = OrderLifecycleService(db)
        notif_repo = NotificationRepository(db)

        # Create 2nd order to test rejection
        vendor_1 = data["vendor_1"]
        cart2 = await checkout_svc.cart_repo.get_or_create_cart(
            vendor_1.id, vendor_1.company_id, data["sup_company"].id
        )
        await checkout_svc.cart_repo.add_item(cart2.id, data["product_2"].id, 2, 800.00)
        await db.refresh(cart2, ["items"])
        resp2 = await checkout_svc.checkout(cart2.id, vendor_1, CheckoutRequest())
        order2_id = uuid.UUID(resp2.order_id)

        # Supplier rejects
        await lifecycle_svc.transition_order_status(
            order_id=order2_id,
            target_status_raw="rejected",
            current_user=data["supplier_1"],
            note="Item out of season",
        )

        ven_rej_notifs, _ = await notif_repo.list_for_user(vendor_1.id, notif_type="ORDER_REJECTED")
        report(
            "Order rejection created ORDER_REJECTED notification with reason included",
            len(ven_rej_notifs) == 1 and "out of season" in ven_rej_notifs[0].message
        )

    # -------------------------------------------------------------
    # SECTION 2: Financial Notifications (Invoice & Payments)
    # -------------------------------------------------------------
    print("\nSection 2: Financial Notifications (Invoice & Payments)")
    invoice_id = None
    async with session_factory() as db:
        inv_svc = InvoiceService(db)
        notif_repo = NotificationRepository(db)

        # Generate invoice for completed order_id
        invoice = await inv_svc.generate_invoice_for_order(
            order_id=order_id,
            current_user=data["supplier_1"],
            req=InvoiceGenerateRequest(tax_rate=Decimal("0.05")),
        )
        invoice_id = invoice.id

        ven_inv_notifs, _ = await notif_repo.list_for_user(data["vendor_1"].id, notif_type="INVOICE_GENERATED")
        report(
            "Invoice generation created INVOICE_GENERATED notification for vendor",
            len(ven_inv_notifs) == 1 and ven_inv_notifs[0].entity_type == "INVOICE"
        )

    async with session_factory() as db:
        inv_svc = InvoiceService(db)
        notif_repo = NotificationRepository(db)

        # Record partial payment
        await inv_svc.record_payment(
            invoice_id=invoice_id,
            current_user=data["supplier_1"],
            req=PaymentRecordCreate(
                amount=Decimal("3000.00"),
                method="bank_transfer",
                reference="NEFT-00991122",
            ),
        )

        ven_pay_notifs, _ = await notif_repo.list_for_user(data["vendor_1"].id, notif_type="PAYMENT_RECORDED")
        report(
            "Partial payment recording created PAYMENT_RECORDED notification",
            len(ven_pay_notifs) == 1 and "₹3,000.00" in ven_pay_notifs[0].message
        )

        # Settle remainder
        inv_obj = await inv_svc.invoice_repo.get_by_id(invoice_id)
        remaining = inv_obj.total_amount - inv_obj.paid_amount
        await inv_svc.record_payment(
            invoice_id=invoice_id,
            current_user=data["supplier_1"],
            req=PaymentRecordCreate(
                amount=remaining,
                method="upi",
                reference="UPI-998877",
            ),
        )

        ven_comp_notifs, _ = await notif_repo.list_for_user(data["vendor_1"].id, notif_type="PAYMENT_COMPLETED")
        report(
            "Final payment settlement generated PAYMENT_COMPLETED notification",
            len(ven_comp_notifs) == 1 and "fully settled" in ven_comp_notifs[0].message
        )

    # -------------------------------------------------------------
    # SECTION 3: Inventory Stock Alerts & Deduplication
    # -------------------------------------------------------------
    print("\nSection 3: Inventory Stock Alerts & Deduplication")
    async with session_factory() as db:
        inventory_svc = InventoryService(db)
        notif_repo = NotificationRepository(db)

        # Adjust product 2 stock to drop below reorder level (reorder_level=10)
        # currently quantity_on_hand=50 -> adjust by -42 -> 8 units remaining
        await inventory_svc.adjust_stock(
            product_id=data["product_2"].id,
            company_id=data["sup_company"].id,
            data=InventoryAdjust(adjustment=-42),
        )

        low_notifs, _ = await notif_repo.list_for_user(data["supplier_1"].id, notif_type="INVENTORY_LOW_STOCK")
        report(
            "Stock dropping below reorder level triggered INVENTORY_LOW_STOCK notification",
            len(low_notifs) == 1 and "running low" in low_notifs[0].message
        )

        # Adjusting again by -1 while remaining below threshold should NOT create duplicate spam
        await inventory_svc.adjust_stock(
            product_id=data["product_2"].id,
            company_id=data["sup_company"].id,
            data=InventoryAdjust(adjustment=-1),
        )

        low_notifs_after, _ = await notif_repo.list_for_user(data["supplier_1"].id, notif_type="INVENTORY_LOW_STOCK")
        report(
            "Subsequent adjustment during low stock state did not create duplicate notification (Cooldown OK)",
            len(low_notifs_after) == 1
        )

        # Drop to 0 -> Out of stock alert
        await inventory_svc.adjust_stock(
            product_id=data["product_2"].id,
            company_id=data["sup_company"].id,
            data=InventoryAdjust(adjustment=-7),
        )

        oos_notifs, _ = await notif_repo.list_for_user(data["supplier_1"].id, notif_type="INVENTORY_OUT_OF_STOCK")
        report(
            "Zero stock reached triggered high priority INVENTORY_OUT_OF_STOCK notification",
            len(oos_notifs) == 1 and "out of stock" in oos_notifs[0].message
        )

    # -------------------------------------------------------------
    # SECTION 4: Transaction Safety & Rollback Isolation
    # -------------------------------------------------------------
    print("\nSection 4: Transaction Safety & Rollback Isolation")
    async with session_factory() as db:
        lifecycle_svc = OrderLifecycleService(db)
        notif_repo = NotificationRepository(db)

        # Attempt illegal transition on completed order -> ConflictException
        initial_notif_count = len((await notif_repo.list_for_user(data["vendor_1"].id))[0])
        raised_conflict = False

        try:
            await lifecycle_svc.transition_order_status(
                order_id=order_id,
                target_status_raw="processing",
                current_user=data["supplier_1"],
            )
        except ConflictException:
            raised_conflict = True

        post_fail_count = len((await notif_repo.list_for_user(data["vendor_1"].id))[0])
        report(
            "Failed business operation caused transaction rollback and created 0 phantom notifications",
            raised_conflict and initial_notif_count == post_fail_count
        )

    # -------------------------------------------------------------
    # SECTION 5: Multi-Tenant RBAC & Tenant Isolation
    # -------------------------------------------------------------
    print("\nSection 5: Multi-Tenant RBAC & Tenant Isolation")
    async with session_factory() as db:
        notif_repo = NotificationRepository(db)

        # Supplier 1 list only returns Supplier 1 notifications
        sup1_items, _ = await notif_repo.list_for_user(data["supplier_1"].id)
        other_user_notifs = [n for n in sup1_items if n.recipient_user_id != data["supplier_1"].id]
        report(
            "User only receives their own notifications (0 cross-tenant contamination)",
            len(other_user_notifs) == 0 and len(sup1_items) > 0
        )

        # Other Vendor user receives 0 notifications from Vendor 1's orders
        other_items, _ = await notif_repo.list_for_user(data["other_vendor"].id)
        report(
            "Independent third-party vendor received 0 notifications from unrelated company orders",
            len(other_items) == 0
        )

        # Attempt to mark another user's notification as read
        victim_notif = sup1_items[0]
        res = await notif_repo.mark_as_read(victim_notif.id, user_id=data["vendor_1"].id)
        report(
            "Attempting to mark another user's notification as read rejected",
            res is None
        )

    # -------------------------------------------------------------
    # SECTION 6: Notification Preferences Enforcement
    # -------------------------------------------------------------
    print("\nSection 6: Notification Preferences Enforcement")
    async with session_factory() as db:
        notif_svc = NotificationService(db)
        notif_repo = NotificationRepository(db)

        # Disable invoice notifications for Vendor 2
        await notif_repo.upsert_preference(
            user_id=data["vendor_2"].id,
            updates={"invoice_notifications_enabled": False}
        )
        await db.commit()

        # Send invoice notification to Vendor 2
        n = await notif_svc.create_notification(
            recipient_user_id=data["vendor_2"].id,
            notif_type=NotificationType.INVOICE_GENERATED,
            title="Test Invoice",
            message="Test invoice message",
        )
        report(
            "Disabled category preference prevented notification creation for user",
            n is None
        )

        # Send order notification (enabled) -> Should succeed
        n_order = await notif_svc.create_notification(
            recipient_user_id=data["vendor_2"].id,
            notif_type=NotificationType.ORDER_SHIPPED,
            title="Test Shipped",
            message="Test order message",
        )
        report(
            "Enabled category preference allows notification creation",
            n_order is not None and n_order.type == NotificationType.ORDER_SHIPPED
        )

    # -------------------------------------------------------------
    # SECTION 7: Unread Counters & Bulk Mark-As-Read Operations
    # -------------------------------------------------------------
    print("\nSection 7: Unread Counters & Bulk Mark-As-Read Operations")
    async with session_factory() as db:
        notif_repo = NotificationRepository(db)

        initial_unread = await notif_repo.get_unread_count(data["vendor_1"].id)
        report(
            "Unread count accurately reflects active unread notifications",
            initial_unread > 0
        )

        # Mark single as read
        ven1_items, _ = await notif_repo.list_for_user(data["vendor_1"].id, is_read=False)
        first_unread = ven1_items[0]
        await notif_repo.mark_as_read(first_unread.id, data["vendor_1"].id)
        await db.commit()

        post_single_unread = await notif_repo.get_unread_count(data["vendor_1"].id)
        report(
            "Marking single notification as read decrements unread counter by 1",
            post_single_unread == initial_unread - 1
        )

        # Mark all as read
        marked_count = await notif_repo.mark_all_as_read(data["vendor_1"].id)
        await db.commit()

        final_unread = await notif_repo.get_unread_count(data["vendor_1"].id)
        report(
            "Mark all as read sets unread counter to 0",
            final_unread == 0 and marked_count > 0
        )

        # Soft delete notification
        await notif_repo.soft_delete(first_unread.id, data["vendor_1"].id)
        await db.commit()

        deleted_item = await notif_repo.get_by_id(first_unread.id)
        report(
            "Soft-deleted notification is hidden from standard queries",
            deleted_item is None
        )

    # -------------------------------------------------------------
    # SECTION 8: WebSocket Real-Time Delivery & Offline Resilience
    # -------------------------------------------------------------
    print("\nSection 8: WebSocket Real-Time Delivery & Offline Resilience")
    async with session_factory() as db:
        notif_repo = NotificationRepository(db)
        notif_svc = NotificationService(db)

        # Serialize notification structure
        items, _ = await notif_repo.list_for_user(data["supplier_1"].id)
        sample = items[0]
        serialized = serialize_notification(sample)

        report(
            "WebSocket serialized payload contains required standardized fields",
            all(k in serialized for k in ("id", "type", "title", "message", "entity_type", "entity_id", "priority", "created_at"))
        )

        # Test offline persistence: Send notification when user has 0 WS connections
        offline_notif = await notif_svc.create_notification(
            recipient_user_id=data["other_vendor"].id,
            notif_type=NotificationType.SYSTEM_NOTIFICATION,
            title="System Maintenance Alert",
            message="Platform upgrade scheduled at midnight.",
            priority=NotificationPriority.NORMAL,
        )
        await db.commit()

        loaded_offline = await notif_repo.get_by_id(offline_notif.id)
        report(
            "Offline user successfully stored notification without WebSocket dependency",
            loaded_offline is not None and loaded_offline.title == "System Maintenance Alert"
        )

    print("\n=================================================================")
    print(f"RESULTS: {PASS} PASSED, {FAIL} FAILED")
    print("=================================================================")

    if FAIL > 0:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(run_phase5_tests())
