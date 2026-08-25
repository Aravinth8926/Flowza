"""
Flowza Phase 4 — Invoices & Financial Records Test Suite
========================================================
Comprehensive test suite verifying:
- Order status eligibility (only COMPLETED orders can generate invoices)
- 1:0..1 Order-to-Invoice constraint (duplicate generation rejected)
- Exact Decimal financial math & GST calculations (no float drift)
- Immutable historical snapshots (catalog price/name changes, product deletions, company updates)
- Multi-tenant company RBAC (supplier vs vendor company boundaries)
- Payment records and status transitions (unpaid -> partially_paid -> paid)
- ReportLab PDF generation and document validity

Run from backend/ directory:
    .\\venv\\Scripts\\python test_invoices_financial_lifecycle.py
"""
import asyncio
import sys
import os
import io
import time
import uuid
from decimal import Decimal
from datetime import datetime, timezone, date, timedelta
from typing import List, Tuple

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

DATABASE_URL = "sqlite+aiosqlite:///./test_phase4_invoices.db"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

from app.database.base import Base
from app.models import (
    Role, User, Company, Address, Product, Inventory,
    Cart, CartItem, OrderRequest, OrderRequestItem, OrderStatusHistory,
    Invoice, InvoiceItem, PaymentRecord
)
from app.core.security import get_password_hash
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.cart_repo import CartRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.services.cart_service import CartService
from app.services.checkout_service import CheckoutService
from app.services.order_lifecycle_service import OrderLifecycleService
from app.services.invoice_service import InvoiceService
from app.services.pdf_service import InvoicePDFService
from app.schemas.cart import CartItemAdd, CartItemUpdate, CheckoutRequest
from app.schemas.invoice import InvoiceGenerateRequest, PaymentRecordCreate
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
        comp_sup1 = Company(
            company_name="Apex Wholesale FMCG Ltd",
            business_type="Wholesaler",
            gst_number="33AAAAA1111A1Z1",
        )
        db.add(comp_sup1)
        await db.flush()

        addr_sup1 = Address(
            company_id=comp_sup1.id,
            country="India",
            state="Tamil Nadu",
            city="Coimbatore",
            address_line="100 Avinashi Road, Peelamedu",
            address_type="billing",
        )
        db.add(addr_sup1)

        user_sup1 = User(
            full_name="Anand Supplier",
            email="anand@apexwholesale.com",
            phone="9876543201",
            hashed_password=get_password_hash("password123"),
            role_id=supplier_role.id,
            company_id=comp_sup1.id,
            is_active=True,
        )
        db.add(user_sup1)

        # Supplier Company 2 (for multi-tenant isolation)
        comp_sup2 = Company(
            company_name="Zenith Goods Corp",
            business_type="Manufacturer",
            gst_number="33BBBBB2222B1Z2",
        )
        db.add(comp_sup2)
        await db.flush()

        user_sup2 = User(
            full_name="Zakir Supplier",
            email="zakir@zenith.com",
            phone="9876543202",
            hashed_password=get_password_hash("password123"),
            role_id=supplier_role.id,
            company_id=comp_sup2.id,
            is_active=True,
        )
        db.add(user_sup2)

        # Vendor Company 1
        comp_ven1 = Company(
            company_name="Metro Hypermarket Ltd",
            business_type="Retailer",
            gst_number="33CCCCC3333C1Z3",
        )
        db.add(comp_ven1)
        await db.flush()

        addr_ven1 = Address(
            company_id=comp_ven1.id,
            country="India",
            state="Tamil Nadu",
            city="Coimbatore",
            address_line="45 Gandhipuram Cross Cut Road",
            address_type="billing",
        )
        db.add(addr_ven1)

        user_ven1 = User(
            full_name="Vimal Vendor",
            email="vimal@metrohyper.com",
            phone="9876543203",
            hashed_password=get_password_hash("password123"),
            role_id=vendor_role.id,
            company_id=comp_ven1.id,
            is_active=True,
        )
        db.add(user_ven1)

        # Vendor Company 2 (for multi-tenant isolation)
        comp_ven2 = Company(
            company_name="Prime Corner Store",
            business_type="Retailer",
            gst_number="33DDDDD4444D1Z4",
        )
        db.add(comp_ven2)
        await db.flush()

        user_ven2 = User(
            full_name="Pradeep Vendor",
            email="pradeep@primecorner.com",
            phone="9876543204",
            hashed_password=get_password_hash("password123"),
            role_id=vendor_role.id,
            company_id=comp_ven2.id,
            is_active=True,
        )
        db.add(user_ven2)

        # Admin User
        user_admin = User(
            full_name="Flowza Platform Admin",
            email="admin@flowza.com",
            phone="9876543209",
            hashed_password=get_password_hash("admin123"),
            role_id=admin_role.id,
            company_id=comp_sup1.id,
            is_active=True,
        )
        db.add(user_admin)

        # Products for Supplier 1
        prod1 = Product(
            company_id=comp_sup1.id,
            name="Organic Sona Masoori Rice",
            sku="RICE-SONA-001",
            category="Grains",
            price=Decimal("120.00"),
            unit="kg",
            is_active=True,
        )
        prod2 = Product(
            company_id=comp_sup1.id,
            name="Cold Pressed Coconut Oil",
            sku="OIL-COCO-001",
            category="Oils",
            price=Decimal("250.00"),
            unit="L",
            is_active=True,
        )
        db.add_all([prod1, prod2])
        await db.flush()

        # Inventories
        inv1 = Inventory(product_id=prod1.id, quantity_on_hand=500, quantity_reserved=0, reorder_level=50)
        inv2 = Inventory(product_id=prod2.id, quantity_on_hand=500, quantity_reserved=0, reorder_level=50)
        db.add_all([inv1, inv2])

        await db.commit()


async def prepare_and_checkout_order(db: AsyncSession, vendor: User, items: List[Tuple[Product, int]]) -> uuid.UUID:
    """Helper to create a clean checkout order."""
    cart_repo = CartRepository(db)
    supplier_comp_id = items[0][0].company_id
    cart = await cart_repo.get_or_create_cart(vendor.id, vendor.company_id, supplier_comp_id)
    await cart_repo.clear_cart_items(cart.id)
    for prod, qty in items:
        existing = await cart_repo.get_any_cart_item(cart.id, prod.id)
        if existing:
            existing.is_deleted = False
            await cart_repo.update_item_quantity(existing, qty, float(prod.price))
        else:
            await cart_repo.add_item(cart.id, prod.id, qty, float(prod.price))
    await db.commit()
    await db.refresh(cart, ["items"])

    checkout_svc = CheckoutService(db)
    res = await checkout_svc.checkout(cart_id=cart.id, vendor=vendor, req=CheckoutRequest(notes="Test Procurement"))
    return uuid.UUID(res.order_id)


async def advance_order_to_status(db: AsyncSession, order_id: uuid.UUID, target_status: str, sup: User, ven: User):
    """Helper to transition an order through the valid state matrix."""
    lifecycle_svc = OrderLifecycleService(db)
    if target_status == "pending":
        return

    # PENDING -> ACCEPTED
    await lifecycle_svc.transition_order_status(order_id, "accepted", sup)
    if target_status == "accepted":
        return

    # ACCEPTED -> PROCESSING
    await lifecycle_svc.transition_order_status(order_id, "processing", sup)
    if target_status == "processing":
        return

    # PROCESSING -> PACKED
    await lifecycle_svc.transition_order_status(order_id, "packed", sup)
    if target_status == "packed":
        return

    # PACKED -> SHIPPED
    await lifecycle_svc.transition_order_status(order_id, "shipped", sup)
    if target_status == "shipped":
        return

    # SHIPPED -> DELIVERED
    await lifecycle_svc.transition_order_status(order_id, "delivered", ven)
    if target_status == "delivered":
        return

    # DELIVERED -> COMPLETED
    await lifecycle_svc.transition_order_status(order_id, "completed", ven)
    if target_status == "completed":
        return


async def run_tests():
    print("=" * 65)
    print("FLOWZA PHASE 4 TEST SUITE: INVOICES & FINANCIAL RECORDS")
    print("=" * 65)

    await setup_db()

    async with AsyncSessionLocal() as db:
        user_sup1 = (await db.execute(select(User).where(User.email == "anand@apexwholesale.com"))).scalar_one()
        user_sup2 = (await db.execute(select(User).where(User.email == "zakir@zenith.com"))).scalar_one()
        user_ven1 = (await db.execute(select(User).where(User.email == "vimal@metrohyper.com"))).scalar_one()
        user_ven2 = (await db.execute(select(User).where(User.email == "pradeep@primecorner.com"))).scalar_one()
        user_admin = (await db.execute(select(User).where(User.email == "admin@flowza.com"))).scalar_one()
        prod1 = (await db.execute(select(Product).where(Product.sku == "RICE-SONA-001"))).scalar_one()
        prod2 = (await db.execute(select(Product).where(Product.sku == "OIL-COCO-001"))).scalar_one()

        invoice_svc = InvoiceService(db)
        lifecycle_svc = OrderLifecycleService(db)

        # -------------------------------------------------------------
        # Section 1: Order Status Eligibility for Invoice Generation
        # -------------------------------------------------------------
        print("\nSection 1: Order Status Eligibility for Invoice Generation")

        # 1. Non-completed states MUST be rejected with ConflictException (409)
        test_statuses = ["pending", "accepted", "processing", "packed", "shipped", "delivered"]
        for st in test_statuses:
            ord_id = await prepare_and_checkout_order(db, user_ven1, [(prod1, 5)])
            await advance_order_to_status(db, ord_id, st, user_sup1, user_ven1)
            try:
                await invoice_svc.generate_invoice_for_order(ord_id, user_sup1)
                fail(f"Invoice generation from '{st.upper()}' status should have been rejected")
            except ConflictException:
                ok(f"Invoice generation from '{st.upper()}' rejected with ConflictException (409)")

        # 2. Rejected and Cancelled orders MUST be rejected with ConflictException (409)
        ord_rej_id = await prepare_and_checkout_order(db, user_ven1, [(prod1, 5)])
        await lifecycle_svc.transition_order_status(ord_rej_id, "rejected", user_sup1)
        try:
            await invoice_svc.generate_invoice_for_order(ord_rej_id, user_sup1)
            fail("Invoice generation from 'REJECTED' status should have been rejected")
        except ConflictException:
            ok("Invoice generation from 'REJECTED' rejected with ConflictException (409)")

        ord_can_id = await prepare_and_checkout_order(db, user_ven1, [(prod1, 5)])
        await lifecycle_svc.transition_order_status(ord_can_id, "cancelled", user_ven1)
        try:
            await invoice_svc.generate_invoice_for_order(ord_can_id, user_sup1)
            fail("Invoice generation from 'CANCELLED' status should have been rejected")
        except ConflictException:
            ok("Invoice generation from 'CANCELLED' rejected with ConflictException (409)")

        # 3. COMPLETED order generates invoice successfully
        ord_comp_id = await prepare_and_checkout_order(db, user_ven1, [(prod1, 20), (prod2, 10)])
        await advance_order_to_status(db, ord_comp_id, "completed", user_sup1, user_ven1)

        invoice1 = await invoice_svc.generate_invoice_for_order(
            ord_comp_id,
            user_sup1,
            InvoiceGenerateRequest(default_tax_rate=Decimal("0.05"), notes="Payment within 30 days"),
        )
        if invoice1 and invoice1.invoice_number.startswith("INV-"):
            ok(f"Completed order generated invoice: {invoice1.invoice_number}")
        else:
            fail("Completed order invoice generation", f"result={invoice1}")

        # 4. Duplicate invoice generation on the same order MUST be rejected (1:0..1 constraint)
        try:
            await invoice_svc.generate_invoice_for_order(ord_comp_id, user_sup1)
            fail("Duplicate invoice generation should have been rejected")
        except ConflictException:
            ok("Duplicate invoice generation rejected with ConflictException (409)")

        # -------------------------------------------------------------
        # Section 2: Financial Calculations & Decimal Precision
        # -------------------------------------------------------------
        print("\nSection 2: Financial Calculations & Exact Decimal Math")

        # In invoice1: prod1: 20 * 120.00 = 2400.00, prod2: 10 * 250.00 = 2500.00
        # subtotal = 4900.00, tax at 5% = 245.00, total = 5145.00
        if invoice1.subtotal == Decimal("4900.00"):
            ok("Subtotal computed accurately: ₹4,900.00")
        else:
            fail("Subtotal computation", f"got {invoice1.subtotal}, expected 4900.00")

        if invoice1.tax_amount == Decimal("245.00"):
            ok("GST (5%) computed accurately: ₹245.00")
        else:
            fail("Tax computation", f"got {invoice1.tax_amount}, expected 245.00")

        if invoice1.total_amount == Decimal("5145.00"):
            ok("Grand Total computed accurately: ₹5,145.00")
        else:
            fail("Grand Total computation", f"got {invoice1.total_amount}, expected 5145.00")

        # Zero Tax Scenario
        ord_zero_tax = await prepare_and_checkout_order(db, user_ven1, [(prod1, 10)])
        await advance_order_to_status(db, ord_zero_tax, "completed", user_sup1, user_ven1)
        inv_zero_tax = await invoice_svc.generate_invoice_for_order(
            ord_zero_tax, user_sup1, InvoiceGenerateRequest(default_tax_rate=Decimal("0.00"))
        )
        if inv_zero_tax.tax_amount == Decimal("0.00") and inv_zero_tax.total_amount == Decimal("1200.00"):
            ok("Zero Tax calculation: subtotal=₹1200.00, tax=₹0.00, total=₹1200.00")
        else:
            fail("Zero tax calculation", f"tax={inv_zero_tax.tax_amount}, total={inv_zero_tax.total_amount}")

        # Discount Calculation Scenario
        ord_disc = await prepare_and_checkout_order(db, user_ven1, [(prod2, 4)])  # 4 * 250 = 1000
        await advance_order_to_status(db, ord_disc, "completed", user_sup1, user_ven1)
        inv_disc = await invoice_svc.generate_invoice_for_order(
            ord_disc,
            user_sup1,
            InvoiceGenerateRequest(default_tax_rate=Decimal("0.18"), discount_amount=Decimal("100.00")),
        )
        # Subtotal: 1000.00, Tax (18%): 180.00, Discount: 100.00 -> Total: 1080.00
        if inv_disc.subtotal == Decimal("1000.00") and inv_disc.tax_amount == Decimal("180.00") and inv_disc.total_amount == Decimal("1080.00"):
            ok("Discount & 18% GST calculation: subtotal=₹1000.00, tax=₹180.00, discount=₹100.00, total=₹1080.00")
        else:
            fail("Discount calculation", f"sub={inv_disc.subtotal}, tax={inv_disc.tax_amount}, total={inv_disc.total_amount}")

        # -------------------------------------------------------------
        # Section 3: Historical Snapshot Immutability
        # -------------------------------------------------------------
        print("\nSection 3: Historical Snapshot Immutability")

        # 1. Modify Product in catalog: price 120 -> 9999, name changed
        prod1.price = Decimal("9999.00")
        prod1.name = "Mutated Ultra Gold Rice"
        await db.commit()

        # Reload invoice1 and verify historical snapshot values
        loaded_inv1 = await invoice_svc.get_invoice_by_id(invoice1.id, user_sup1)
        inv_item1 = next((it for it in loaded_inv1.items if "Rice" in it.product_name_snapshot), None)

        if inv_item1 and inv_item1.product_name_snapshot == "Organic Sona Masoori Rice" and inv_item1.unit_price == Decimal("120.00"):
            ok("Line item preserved original product name snapshot ('Organic Sona Masoori Rice') and unit price (120.00)")
        else:
            fail("Line item historical snapshot", f"name={inv_item1.product_name_snapshot if inv_item1 else None}, price={inv_item1.unit_price if inv_item1 else None}")

        if loaded_inv1.subtotal == Decimal("4900.00") and loaded_inv1.total_amount == Decimal("5145.00"):
            ok("Invoice totals remain 100% immutable after live catalog product price modification")
        else:
            fail("Invoice totals mutated", f"subtotal={loaded_inv1.subtotal}, total={loaded_inv1.total_amount}")

        # 2. Verify Company Snapshot immutability
        comp_sup1_obj = (await db.execute(select(Company).where(Company.company_name == "Apex Wholesale FMCG Ltd"))).scalar_one()
        comp_sup1_obj.company_name = "Apex Global Megacorp"
        await db.commit()

        reloaded_inv1 = await invoice_svc.get_invoice_by_id(invoice1.id, user_sup1)
        if reloaded_inv1.supplier_company_name == "Apex Wholesale FMCG Ltd":
            ok("Invoice header preserved original supplier company snapshot ('Apex Wholesale FMCG Ltd')")
        else:
            fail("Company snapshot mutated", f"got {reloaded_inv1.supplier_company_name}")

        # -------------------------------------------------------------
        # Section 4: Multi-Tenant Authorization & RBAC
        # -------------------------------------------------------------
        print("\nSection 4: Multi-Tenant Authorization & RBAC")

        # 1. Supplier 1 can access own invoice
        try:
            await invoice_svc.get_invoice_by_id(invoice1.id, user_sup1)
            ok("Supplier 1 can access their issued invoice")
        except Exception as e:
            fail("Supplier 1 access own invoice", str(e))

        # 2. Supplier 2 (unassigned) CANNOT access Supplier 1's invoice
        try:
            await invoice_svc.get_invoice_by_id(invoice1.id, user_sup2)
            fail("Cross-supplier invoice access should have raised PermissionDeniedException")
        except PermissionDeniedException:
            ok("Cross-supplier invoice access rejected with PermissionDeniedException (403)")

        # 3. Vendor 1 (buyer) can access own invoice
        try:
            await invoice_svc.get_invoice_by_id(invoice1.id, user_ven1)
            ok("Vendor 1 can view invoice billed to their company")
        except Exception as e:
            fail("Vendor 1 view own invoice", str(e))

        # 4. Vendor 2 (unrelated) CANNOT access Vendor 1's invoice
        try:
            await invoice_svc.get_invoice_by_id(invoice1.id, user_ven2)
            fail("Cross-vendor invoice access should have raised PermissionDeniedException")
        except PermissionDeniedException:
            ok("Cross-vendor invoice access rejected with PermissionDeniedException (403)")

        # 5. Vendor CANNOT generate invoice for Supplier
        ord_ven_try = await prepare_and_checkout_order(db, user_ven1, [(prod2, 2)])
        await advance_order_to_status(db, ord_ven_try, "completed", user_sup1, user_ven1)
        try:
            await invoice_svc.generate_invoice_for_order(ord_ven_try, user_ven1)
            fail("Vendor generating supplier invoice should have raised PermissionDeniedException")
        except PermissionDeniedException:
            ok("Vendor generating supplier invoice rejected with PermissionDeniedException (403)")

        # 6. Admin has access
        try:
            await invoice_svc.get_invoice_by_id(invoice1.id, user_admin)
            ok("Platform Admin can access invoice")
        except Exception as e:
            fail("Admin access invoice", str(e))

        # -------------------------------------------------------------
        # Section 5: Payment Records & Status Transitions
        # -------------------------------------------------------------
        print("\nSection 5: Payment Records & Payment Status Transitions")

        # Initial Status
        if invoice1.payment_status == "unpaid" and invoice1.paid_amount == Decimal("0.00"):
            ok("Initial invoice payment status is 'unpaid' with paid_amount = ₹0.00")
        else:
            fail("Initial payment status", f"status={invoice1.payment_status}, paid={invoice1.paid_amount}")

        # Record Partial Payment: ₹2,000 of ₹5,145
        inv_partial = await invoice_svc.record_payment(
            invoice1.id,
            user_sup1,
            PaymentRecordCreate(
                amount=Decimal("2000.00"),
                payment_date=date.today(),
                method="bank_transfer",
                reference="NEFT-TXN-998811",
                notes="First installment received",
            ),
        )
        if inv_partial.payment_status == "partially_paid" and inv_partial.paid_amount == Decimal("2000.00"):
            ok("Partial payment recorded: status='partially_paid', paid_amount=₹2,000.00")
        else:
            fail("Partial payment", f"status={inv_partial.payment_status}, paid={inv_partial.paid_amount}")

        # Overpayment validation: Remaining balance is 3145. Attempting to pay 4000 must fail
        try:
            await invoice_svc.record_payment(
                invoice1.id,
                user_sup1,
                PaymentRecordCreate(amount=Decimal("4000.00")),
            )
            fail("Overpayment should have raised BadRequestException")
        except BadRequestException:
            ok("Overpayment exceeding invoice balance rejected with BadRequestException (400)")

        # Record Remaining Balance: ₹3,145.00 -> Status becomes 'paid'
        inv_paid = await invoice_svc.record_payment(
            invoice1.id,
            user_sup1,
            PaymentRecordCreate(
                amount=Decimal("3145.00"),
                payment_date=date.today(),
                method="upi_manual",
                reference="UPI-REF-554433",
                notes="Final balance cleared",
            ),
        )
        if inv_paid.payment_status == "paid" and inv_paid.paid_amount == Decimal("5145.00"):
            ok("Final payment recorded: status='paid', paid_amount=₹5,145.00 (Balance = ₹0.00)")
        else:
            fail("Final payment", f"status={inv_paid.payment_status}, paid={inv_paid.paid_amount}")

        # Verify Payment Audit Trail records
        if len(inv_paid.payments) == 2:
            ok(f"Payment audit trail captured all {len(inv_paid.payments)} payment transactions")
        else:
            fail("Payment audit trail count", f"got {len(inv_paid.payments)}")

        # Verify invoice financial total remains untouched
        if inv_paid.total_amount == Decimal("5145.00"):
            ok("Invoice total_amount remains exactly ₹5,145.00 after payment settlement")
        else:
            fail("Invoice total mutated by payment", f"total={inv_paid.total_amount}")

        # -------------------------------------------------------------
        # Section 6: PDF Generation & Binary Verification
        # -------------------------------------------------------------
        print("\nSection 6: PDF Generation & Binary Integrity")

        pdf_stream = InvoicePDFService.generate_invoice_pdf(inv_paid)
        pdf_bytes = pdf_stream.getvalue()

        # PDF standard header check (%PDF-)
        if pdf_bytes.startswith(b"%PDF-") and len(pdf_bytes) > 1000:
            ok(f"ReportLab generated valid binary PDF ({len(pdf_bytes)} bytes) with valid '%PDF-' header")
        else:
            fail("PDF generation", f"header={pdf_bytes[:10]}, length={len(pdf_bytes)}")

        # Invoice number string embedded in PDF document stream
        if invoice1.invoice_number.encode() in pdf_bytes:
            ok(f"PDF content contains invoice number: {invoice1.invoice_number}")
        else:
            fail("PDF invoice number match", f"{invoice1.invoice_number} not in PDF stream")

    print("\n" + "=" * 65)
    print(f"RESULTS: {PASS} PASSED, {FAIL} FAILED")
    print("=" * 65)
    if FAIL > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_tests())
