import asyncio
import sys
import os
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

# Ensure parent path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database.base import Base
from app.models.role import Role
from app.models.user import User
from app.models.company import Company
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.invoice import Invoice, InvoiceItem, PaymentRecord
from app.schemas.analytics import DateRangePreset
from app.repositories.analytics_repo import AnalyticsRepository
from app.services.analytics_service import AnalyticsService
from app.core.exceptions import PermissionDeniedException, BadRequestException

TEST_DB_URL = "sqlite+aiosqlite:///./test_phase6_analytics.db"


async def setup_test_db():
    if os.path.exists("./test_phase6_analytics.db"):
        os.remove("./test_phase6_analytics.db")

    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, session_factory


async def run_all_tests():
    print("=" * 65)
    print("FLOWZA PHASE 6 TEST SUITE: DASHBOARDS, ANALYTICS & BI")
    print("=" * 65)

    engine, session_factory = await setup_test_db()
    passed = 0
    failed = 0

    def record(name: str, success: bool, msg: str = ""):
        nonlocal passed, failed
        if success:
            passed += 1
            print(f"  [PASS] {name}")
        else:
            failed += 1
            print(f"  [FAIL] {name}: {msg}")

    async with session_factory() as db:
        # Seed test companies & users
        role_sup = Role(name="supplier", description="Supplier")
        role_ven = Role(name="vendor", description="Vendor")
        role_adm = Role(name="admin", description="Admin")
        db.add_all([role_sup, role_ven, role_adm])
        await db.flush()

        comp_s1 = Company(company_name="Supplier Alpha Ltd", business_type="Distributor")
        comp_s2 = Company(company_name="Supplier Beta Corp", business_type="Manufacturer")
        comp_v1 = Company(company_name="Vendor Retail One", business_type="Supermarket")
        comp_v2 = Company(company_name="Vendor Retail Two", business_type="Hypermarket")
        comp_adm = Company(company_name="Flowza Platform Inc", business_type="Platform Admin")
        db.add_all([comp_s1, comp_s2, comp_v1, comp_v2, comp_adm])
        await db.flush()

        u_s1 = User(full_name="Alpha Supplier User", email="s1@alpha.com", phone="9876543201", hashed_password="pw", role_id=role_sup.id, company_id=comp_s1.id)
        u_s2 = User(full_name="Beta Supplier User", email="s2@beta.com", phone="9876543202", hashed_password="pw", role_id=role_sup.id, company_id=comp_s2.id)
        u_v1 = User(full_name="Vendor One User", email="v1@retail.com", phone="9876543203", hashed_password="pw", role_id=role_ven.id, company_id=comp_v1.id)
        u_v2 = User(full_name="Vendor Two User", email="v2@retail.com", phone="9876543204", hashed_password="pw", role_id=role_ven.id, company_id=comp_v2.id)
        u_adm = User(full_name="Admin User", email="adm@flowza.com", phone="9876543205", hashed_password="pw", role_id=role_adm.id, company_id=comp_adm.id)
        db.add_all([u_s1, u_s2, u_v1, u_v2, u_adm])
        await db.flush()

        # Seed products & inventory for Supplier 1
        p1 = Product(company_id=comp_s1.id, name="Organic Wheat Flour", sku="SKU-WHEAT-01", category="Grains", price=Decimal("50.00"), unit="kg")
        p2 = Product(company_id=comp_s1.id, name="Cold Pressed Coconut Oil", sku="SKU-OIL-01", category="Oils", price=Decimal("200.00"), unit="litre")
        p3 = Product(company_id=comp_s1.id, name="Raw Brown Sugar", sku="SKU-SUG-01", category="Sweeteners", price=Decimal("60.00"), unit="kg")
        db.add_all([p1, p2, p3])
        await db.flush()

        inv1 = Inventory(product_id=p1.id, quantity_on_hand=100, quantity_reserved=10, reorder_level=20, reorder_quantity=50)  # Available = 90 (In Stock)
        inv2 = Inventory(product_id=p2.id, quantity_on_hand=15, quantity_reserved=5, reorder_level=15, reorder_quantity=20)   # Available = 10 (Low Stock)
        inv3 = Inventory(product_id=p3.id, quantity_on_hand=5, quantity_reserved=5, reorder_level=10, reorder_quantity=20)    # Available = 0 (Out of Stock)
        db.add_all([inv1, inv2, inv3])
        await db.flush()

        # Seed products & inventory for Supplier 2
        p_beta = Product(company_id=comp_s2.id, name="Beta Tea Leaves", sku="SKU-BTEA-01", category="Beverages", price=Decimal("300.00"), unit="kg")
        db.add(p_beta)
        await db.flush()
        inv_beta = Inventory(product_id=p_beta.id, quantity_on_hand=50, quantity_reserved=0, reorder_level=10, reorder_quantity=20)
        db.add(inv_beta)
        await db.flush()

        # Seed Orders for Supplier 1 & Vendor 1
        today = date.today()
        now = datetime.now(timezone.utc)

        # Order 1: Completed 15 days ago with Paid Invoice
        ord1 = OrderRequest(
            vendor_company_id=comp_v1.id, supplier_company_id=comp_s1.id, created_by_user_id=u_v1.id,
            title="Completed Order 1", quantity=40, unit="kg", estimated_price=Decimal("2000.00"),
            status="completed", created_at=now - timedelta(days=15),
        )
        db.add(ord1)
        await db.flush()
        item1 = OrderRequestItem(
            order_request_id=ord1.id, product_id=p1.id, product_name="Organic Wheat Flour",
            product_name_snapshot="Organic Wheat Flour", quantity=40, unit="kg",
            estimated_price=Decimal("50.00"), unit_price=Decimal("50.00"), created_at=now - timedelta(days=15),
        )
        db.add(item1)

        inv_rec1 = Invoice(
            order_request_id=ord1.id, invoice_number="INV-TEST-001", supplier_company_id=comp_s1.id,
            vendor_company_id=comp_v1.id, created_by_user_id=u_s1.id, invoice_date=today - timedelta(days=15),
            due_date=today + timedelta(days=5), total_amount=Decimal("2100.00"), paid_amount=Decimal("2100.00"),
            subtotal=Decimal("2000.00"), tax_amount=Decimal("100.00"), status="generated", payment_status="paid",
            supplier_company_name="Supplier Alpha Ltd", vendor_company_name="Vendor Retail One",
            created_at=now - timedelta(days=15),
        )
        db.add(inv_rec1)
        await db.flush()
        pay1 = PaymentRecord(
            invoice_id=inv_rec1.id, amount=Decimal("2100.00"), payment_date=today - timedelta(days=14),
            method="bank_transfer", reference="UTR-TEST-001", recorded_by_user_id=u_s1.id,
            created_at=now - timedelta(days=14),
        )
        db.add(pay1)

        # Order 2: Completed 5 days ago with Partially Paid Invoice
        ord2 = OrderRequest(
            vendor_company_id=comp_v1.id, supplier_company_id=comp_s1.id, created_by_user_id=u_v1.id,
            title="Completed Order 2", quantity=20, unit="litre", estimated_price=Decimal("4000.00"),
            status="completed", created_at=now - timedelta(days=5),
        )
        db.add(ord2)
        await db.flush()
        item2 = OrderRequestItem(
            order_request_id=ord2.id, product_id=p2.id, product_name="Cold Pressed Coconut Oil",
            product_name_snapshot="Cold Pressed Coconut Oil", quantity=20, unit="litre",
            estimated_price=Decimal("200.00"), unit_price=Decimal("200.00"), created_at=now - timedelta(days=5),
        )
        db.add(item2)

        inv_rec2 = Invoice(
            order_request_id=ord2.id, invoice_number="INV-TEST-002", supplier_company_id=comp_s1.id,
            vendor_company_id=comp_v1.id, created_by_user_id=u_s1.id, invoice_date=today - timedelta(days=5),
            due_date=today + timedelta(days=10), total_amount=Decimal("4200.00"), paid_amount=Decimal("2000.00"),
            subtotal=Decimal("4000.00"), tax_amount=Decimal("200.00"), status="generated", payment_status="partially_paid",
            supplier_company_name="Supplier Alpha Ltd", vendor_company_name="Vendor Retail One",
            created_at=now - timedelta(days=5),
        )
        db.add(inv_rec2)
        await db.flush()
        pay2 = PaymentRecord(
            invoice_id=inv_rec2.id, amount=Decimal("2000.00"), payment_date=today - timedelta(days=4),
            method="upi", reference="UTR-TEST-002", recorded_by_user_id=u_s1.id,
            created_at=now - timedelta(days=4),
        )
        db.add(pay2)

        # Order 3: Active (Processing) placed 2 days ago
        ord3 = OrderRequest(
            vendor_company_id=comp_v1.id, supplier_company_id=comp_s1.id, created_by_user_id=u_v1.id,
            title="Processing Order 3", quantity=10, unit="kg", estimated_price=Decimal("500.00"),
            status="processing", created_at=now - timedelta(days=2),
        )
        db.add(ord3)
        await db.flush()
        item3 = OrderRequestItem(
            order_request_id=ord3.id, product_id=p1.id, product_name="Organic Wheat Flour",
            product_name_snapshot="Organic Wheat Flour", quantity=10, unit="kg",
            estimated_price=Decimal("50.00"), unit_price=Decimal("50.00"), created_at=now - timedelta(days=2),
        )
        db.add(item3)

        # Order 4: Cancelled placed 8 days ago
        ord4 = OrderRequest(
            vendor_company_id=comp_v1.id, supplier_company_id=comp_s1.id, created_by_user_id=u_v1.id,
            title="Cancelled Order 4", quantity=5, unit="kg", estimated_price=Decimal("300.00"),
            status="cancelled", created_at=now - timedelta(days=8),
        )
        db.add(ord4)

        # Order 5: For Supplier 2 from Vendor 2
        ord_beta = OrderRequest(
            vendor_company_id=comp_v2.id, supplier_company_id=comp_s2.id, created_by_user_id=u_v2.id,
            title="Beta Supplier Order", quantity=15, unit="kg", estimated_price=Decimal("4500.00"),
            status="completed", created_at=now - timedelta(days=3),
        )
        db.add(ord_beta)
        await db.flush()
        item_beta = OrderRequestItem(
            order_request_id=ord_beta.id, product_id=p_beta.id, product_name="Beta Tea Leaves",
            product_name_snapshot="Beta Tea Leaves", quantity=15, unit="kg",
            estimated_price=Decimal("300.00"), unit_price=Decimal("300.00"), created_at=now - timedelta(days=3),
        )
        db.add(item_beta)

        inv_beta = Invoice(
            order_request_id=ord_beta.id, invoice_number="INV-BETA-001", supplier_company_id=comp_s2.id,
            vendor_company_id=comp_v2.id, created_by_user_id=u_s2.id, invoice_date=today - timedelta(days=3),
            due_date=today + timedelta(days=15), total_amount=Decimal("4725.00"), paid_amount=Decimal("4725.00"),
            subtotal=Decimal("4500.00"), tax_amount=Decimal("225.00"), status="generated", payment_status="paid",
            supplier_company_name="Supplier Beta Corp", vendor_company_name="Vendor Retail Two",
            created_at=now - timedelta(days=3),
        )
        db.add(inv_beta)

        await db.commit()

        # =====================================================================
        # SECTION 1: SUPPLIER ANALYTICS TESTS
        # =====================================================================
        print("\nSection 1: Supplier Analytics & Calculations")
        svc = AnalyticsService(db)
        s1_overview = await svc.get_supplier_overview(company_id=comp_s1.id, preset=DateRangePreset.LAST_30_DAYS)

        # 1. Total Orders
        record(
            "Supplier 1 Total Orders count matches database (4 orders)",
            s1_overview.kpis.total_orders == 4,
            f"Expected 4, got {s1_overview.kpis.total_orders}",
        )

        # 2. Active Orders
        record(
            "Supplier 1 Active Orders matches (1 processing order)",
            s1_overview.kpis.active_orders == 1,
            f"Expected 1, got {s1_overview.kpis.active_orders}",
        )

        # 3. Completed Orders
        record(
            "Supplier 1 Completed Orders matches (2 completed orders)",
            s1_overview.kpis.completed_orders == 2,
            f"Expected 2, got {s1_overview.kpis.completed_orders}",
        )

        # 4. Total Invoiced
        expected_inv = Decimal("6300.00")  # 2100.00 + 4200.00
        record(
            "Supplier 1 Total Invoiced calculation exact Decimal match (6300.00)",
            s1_overview.kpis.total_invoiced == expected_inv,
            f"Expected {expected_inv}, got {s1_overview.kpis.total_invoiced}",
        )

        # 5. Total Collected
        expected_coll = Decimal("4100.00")  # 2100.00 + 2000.00
        record(
            "Supplier 1 Total Collected calculation exact Decimal match (4100.00)",
            s1_overview.kpis.total_collected == expected_coll,
            f"Expected {expected_coll}, got {s1_overview.kpis.total_collected}",
        )

        # 6. Outstanding Receivables
        expected_out = Decimal("2200.00")  # 6300.00 - 4100.00
        record(
            "Supplier 1 Outstanding Receivables exact Decimal match (2200.00)",
            s1_overview.kpis.outstanding_receivables == expected_out,
            f"Expected {expected_out}, got {s1_overview.kpis.outstanding_receivables}",
        )

        # 7. Inventory stock thresholds
        record(
            "Supplier 1 Low Stock products count is 1 (Coconut Oil)",
            s1_overview.kpis.low_stock_products_count == 1,
            f"Expected 1, got {s1_overview.kpis.low_stock_products_count}",
        )
        record(
            "Supplier 1 Out of Stock products count is 1 (Brown Sugar)",
            s1_overview.kpis.out_of_stock_products_count == 1,
            f"Expected 1, got {s1_overview.kpis.out_of_stock_products_count}",
        )
        record(
            "Supplier 1 Available units calculation matches on_hand - reserved (90 + 10 + 0 = 100)",
            s1_overview.inventory_summary.total_quantity_available == 100,
            f"Expected 100, got {s1_overview.inventory_summary.total_quantity_available}",
        )

        # 8. Top Products ranking (Units sold on valid orders)
        top_p1 = s1_overview.top_products[0]
        record(
            "Supplier 1 Top Product is Wheat Flour with 50 units (40 on completed + 10 on processing)",
            top_p1.product_name == "Organic Wheat Flour" and top_p1.total_units_sold == 50,
            f"Got {top_p1.product_name} with {top_p1.total_units_sold} units",
        )

        # =====================================================================
        # SECTION 2: MULTI-TENANT ISOLATION TESTS
        # =====================================================================
        print("\nSection 2: Multi-Tenant Tenant Isolation & Security")

        # 9. Supplier A cannot see Supplier B's data
        record(
            "Supplier 1 analytics excludes Supplier 2 orders and invoices completely",
            s1_overview.kpis.total_orders == 4 and s1_overview.kpis.total_invoiced == Decimal("6300.00"),
            "Supplier 1 received data from Supplier 2!",
        )

        s2_overview = await svc.get_supplier_overview(company_id=comp_s2.id, preset=DateRangePreset.LAST_30_DAYS)
        record(
            "Supplier 2 analytics contains only Supplier 2 records (1 order, 4725.00 invoiced)",
            s2_overview.kpis.total_orders == 1 and s2_overview.kpis.total_invoiced == Decimal("4725.00"),
            f"Got orders={s2_overview.kpis.total_orders}, inv={s2_overview.kpis.total_invoiced}",
        )

        # =====================================================================
        # SECTION 3: VENDOR ANALYTICS TESTS
        # =====================================================================
        print("\nSection 3: Vendor Analytics & Procurement Calculations")
        v1_overview = await svc.get_vendor_overview(company_id=comp_v1.id, preset=DateRangePreset.LAST_30_DAYS)

        # 10. Vendor 1 Total Procurement
        # Excludes cancelled order 4 (300.00). Total valid orders = 2000.00 + 4000.00 + 500.00 = 6500.00
        record(
            "Vendor 1 Total Procurement Value excludes cancelled order (6500.00)",
            v1_overview.kpis.total_procurement_value == Decimal("6500.00"),
            f"Expected 6500.00, got {v1_overview.kpis.total_procurement_value}",
        )

        # 11. Vendor 1 Total Paid & Payables
        record(
            "Vendor 1 Total Paid matches payment records (4100.00)",
            v1_overview.kpis.total_paid == Decimal("4100.00"),
            f"Expected 4100.00, got {v1_overview.kpis.total_paid}",
        )
        record(
            "Vendor 1 Outstanding Payables matches balance due (2200.00)",
            v1_overview.kpis.outstanding_payables == Decimal("2200.00"),
            f"Expected 2200.00, got {v1_overview.kpis.outstanding_payables}",
        )

        # 12. Vendor 1 Top Suppliers
        top_sup_v1 = v1_overview.top_suppliers[0]
        record(
            "Vendor 1 Top Supplier correctly identified as Supplier Alpha Ltd",
            top_sup_v1.supplier_name == "Supplier Alpha Ltd" and top_sup_v1.total_spend == Decimal("6500.00"),
            f"Got {top_sup_v1.supplier_name} with spend {top_sup_v1.total_spend}",
        )

        # 13. Vendor isolation: Vendor 2 data
        v2_overview = await svc.get_vendor_overview(company_id=comp_v2.id, preset=DateRangePreset.LAST_30_DAYS)
        record(
            "Vendor 2 analytics isolated: 1 order, 4500.00 spend, 4725.00 paid",
            v2_overview.kpis.total_orders == 1 and v2_overview.kpis.total_procurement_value == Decimal("4500.00"),
            f"Got orders={v2_overview.kpis.total_orders}, spend={v2_overview.kpis.total_procurement_value}",
        )

        # =====================================================================
        # SECTION 4: ADMIN PLATFORM OVERVIEW TESTS
        # =====================================================================
        print("\nSection 4: Admin Platform Overview & Health")
        adm_overview = await svc.get_admin_overview(preset=DateRangePreset.LAST_30_DAYS)

        # 14. Total Platform Invoiced & Settled
        # Total platform invoiced = 6300.00 (Alpha) + 4725.00 (Beta) = 11025.00
        # Total platform collected = 4100.00 (Alpha) + 4725.00 (Beta) = 8825.00
        record(
            "Admin Platform Total Invoiced matches across all companies (11025.00)",
            adm_overview.kpis.total_platform_invoiced == Decimal("11025.00"),
            f"Expected 11025.00, got {adm_overview.kpis.total_platform_invoiced}",
        )
        record(
            "Admin Platform Total Collected matches across all companies (8825.00)",
            adm_overview.kpis.total_platform_collected == Decimal("8825.00"),
            f"Expected 8825.00, got {adm_overview.kpis.total_platform_collected}",
        )
        record(
            "Admin Platform Total Orders count matches system-wide total (5 orders)",
            adm_overview.kpis.total_orders == 5,
            f"Expected 5, got {adm_overview.kpis.total_orders}",
        )
        record(
            "Admin Platform Total Users count matches (5 users)",
            adm_overview.kpis.total_users == 5,
            f"Expected 5, got {adm_overview.kpis.total_users}",
        )
        record(
            "Admin Platform Total Companies count matches (5 companies)",
            adm_overview.kpis.total_companies == 5,
            f"Expected 5, got {adm_overview.kpis.total_companies}",
        )

        # =====================================================================
        # SECTION 5: DATE FILTERING TESTS
        # =====================================================================
        print("\nSection 5: Date Filtering & Presets")

        # 15. Last 7 Days preset
        s1_7d = await svc.get_supplier_overview(company_id=comp_s1.id, preset=DateRangePreset.LAST_7_DAYS)
        # Order 1 was 15 days ago, so excluded. Orders in last 7 days: Order 2 (5d ago), Order 3 (2d ago) -> 2 orders
        record(
            "Supplier 1 Last 7 Days preset filters out older orders (2 orders in last 7d)",
            s1_7d.kpis.total_orders == 2,
            f"Expected 2, got {s1_7d.kpis.total_orders}",
        )

        # 16. Custom Date Range
        custom_start = today - timedelta(days=6)
        custom_end = today - timedelta(days=4)
        s1_custom = await svc.get_supplier_overview(
            company_id=comp_s1.id,
            preset=DateRangePreset.CUSTOM,
            start_date=custom_start,
            end_date=custom_end,
        )
        # Only Order 2 (5d ago) falls in this window
        record(
            "Supplier 1 Custom Date Range returns exact matching slice (1 order)",
            s1_custom.kpis.total_orders == 1 and s1_custom.kpis.total_invoiced == Decimal("4200.00"),
            f"Expected 1 order & 4200.00, got orders={s1_custom.kpis.total_orders}, inv={s1_custom.kpis.total_invoiced}",
        )

        # =====================================================================
        # SECTION 6: ORDER STATUS DISTRIBUTION TESTS
        # =====================================================================
        print("\nSection 6: Order Status Distribution")

        # 17. Verify all 9 status categories present
        dist_statuses = [d.status for d in s1_overview.order_status_distribution]
        all_expected = ["PENDING", "ACCEPTED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED", "REJECTED", "CANCELLED"]
        record(
            "Status distribution contains all 9 canonical order lifecycle states",
            dist_statuses == all_expected,
            f"Status mismatch: {dist_statuses}",
        )

        # =====================================================================
        # SECTION 7: EMPTY DATASET & EDGE CASE TESTS
        # =====================================================================
        print("\nSection 7: Empty Dataset & Zero State Safety")

        # Create a brand new company with 0 records
        empty_comp = Company(company_name="Brand New Supplier", business_type="Distributor")
        db.add(empty_comp)
        await db.flush()

        empty_overview = await svc.get_supplier_overview(company_id=empty_comp.id, preset=DateRangePreset.LAST_30_DAYS)
        record(
            "Empty supplier dataset returns valid zero responses without 500 error",
            empty_overview.kpis.total_orders == 0
            and empty_overview.kpis.total_invoiced == Decimal("0.00")
            and empty_overview.kpis.total_collected == Decimal("0.00")
            and empty_overview.kpis.outstanding_receivables == Decimal("0.00")
            and len(empty_overview.top_products) == 0,
            "Failed on empty dataset",
        )

        # =====================================================================
        # SECTION 8: ROLE-BASED ACCESS CONTROL (RBAC) GUARDS
        # =====================================================================
        print("\nSection 8: RBAC & Role Verification Guards")
        from app.api.v1.routes.analytics import _verify_supplier, _verify_vendor, _verify_admin

        # Test supplier guard
        try:
            _verify_supplier(u_v1)
            record("Vendor user is blocked from supplier analytics", False, "Should have raised PermissionDeniedException")
        except PermissionDeniedException:
            record("Vendor user is blocked from supplier analytics", True)

        # Test vendor guard
        try:
            _verify_vendor(u_s1)
            record("Supplier user is blocked from vendor analytics", False, "Should have raised PermissionDeniedException")
        except PermissionDeniedException:
            record("Supplier user is blocked from vendor analytics", True)

        # Test admin guard
        try:
            _verify_admin(u_s1)
            record("Non-admin user is blocked from admin platform analytics", False, "Should have raised PermissionDeniedException")
        except PermissionDeniedException:
            record("Non-admin user is blocked from admin platform analytics", True)

    print("\n" + "=" * 65)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
