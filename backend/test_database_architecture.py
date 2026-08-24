import asyncio
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.base import Base
from app.models import Role, Company, User, Address, Product, Inventory, Cart, CartItem, OrderRequest, OrderRequestItem

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

async def init_test_db():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    return engine, session_factory

async def setup_seed_data(session_factory):
    async with session_factory() as session:
        role_vendor = Role(name="vendor", description="Vendor")
        role_supplier = Role(name="supplier", description="Supplier")
        session.add_all([role_vendor, role_supplier])
        await session.flush()

        comp_vendor = Company(company_name="Supermarket Retailers A", business_type="Retailer")
        comp_supplier_1 = Company(company_name="Agro Supplier X", business_type="Distributor")
        comp_supplier_2 = Company(company_name="Dairy Supplier Y", business_type="Distributor")
        session.add_all([comp_vendor, comp_supplier_1, comp_supplier_2])
        await session.flush()

        user_vendor = User(
            full_name="Vendor Alice",
            email="alice@vendor.com",
            hashed_password="hash",
            phone="1234567890",
            role_id=role_vendor.id,
            company_id=comp_vendor.id
        )
        user_supplier_1 = User(
            full_name="Supplier Bob",
            email="bob@supplier.com",
            hashed_password="hash",
            phone="9876543210",
            role_id=role_supplier.id,
            company_id=comp_supplier_1.id
        )
        session.add_all([user_vendor, user_supplier_1])
        await session.commit()
        return {
            "comp_vendor_id": comp_vendor.id,
            "comp_supplier_1_id": comp_supplier_1.id,
            "comp_supplier_2_id": comp_supplier_2.id,
            "user_vendor_id": user_vendor.id,
            "user_supplier_1_id": user_supplier_1.id,
        }

async def test_sku_uniqueness(session_factory, ids):
    print("\n[TEST 2] Product SKU uniqueness per company (NOT globally unique)...")
    async with session_factory() as session:
        prod_sup1 = Product(
            company_id=ids["comp_supplier_1_id"],
            name="Basmati Rice 25kg",
            sku="RICE-001",
            price=Decimal("1500.00"),
            unit="bag"
        )
        session.add(prod_sup1)
        await session.commit()
        prod_sup1_id = prod_sup1.id

    async with session_factory() as session:
        # Same SKU for Supplier 2 -> MUST SUCCEED
        prod_sup2 = Product(
            company_id=ids["comp_supplier_2_id"],
            name="Organic Rice 25kg",
            sku="RICE-001",
            price=Decimal("1800.00"),
            unit="bag"
        )
        session.add(prod_sup2)
        await session.commit()
        print("  [OK] Different suppliers can use the same SKU ('RICE-001').")

    async with session_factory() as session:
        # Duplicate SKU for same supplier (Supplier 1) -> MUST FAIL with IntegrityError
        prod_dup = Product(
            company_id=ids["comp_supplier_1_id"],
            name="Another Rice 25kg",
            sku="RICE-001",
            price=Decimal("1600.00"),
            unit="bag"
        )
        session.add(prod_dup)
        duplicate_failed = False
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            duplicate_failed = True
        assert duplicate_failed, "Duplicate SKU within same company should have failed!"
        print("  [OK] Duplicate SKU within the same supplier correctly raised IntegrityError.")

    async with session_factory() as session:
        # Multiple products with NULL SKU -> MUST SUCCEED
        prod_null_1 = Product(company_id=ids["comp_supplier_1_id"], name="Loose Tomatoes", sku=None, price=Decimal("40.00"))
        prod_null_2 = Product(company_id=ids["comp_supplier_1_id"], name="Loose Potatoes", sku=None, price=Decimal("30.00"))
        session.add_all([prod_null_1, prod_null_2])
        await session.commit()
        print("  [OK] Multiple NULL SKUs allowed for the same supplier.")

    return prod_sup1_id

async def test_inventory_constraints(session_factory, product_id):
    print("\n[TEST 3] Inventory 1-to-1 relationship and constraints...")
    async with session_factory() as session:
        inv = Inventory(
            product_id=product_id,
            quantity_on_hand=100,
            quantity_reserved=20,
            reorder_level=15,
            reorder_quantity=50
        )
        session.add(inv)
        await session.commit()

    async with session_factory() as session:
        res = await session.execute(
            select(Product).options(selectinload(Product.inventory)).where(Product.id == product_id)
        )
        loaded_prod = res.scalars().first()
        assert loaded_prod.inventory is not None
        assert loaded_prod.inventory.quantity_on_hand == 100
        assert loaded_prod.inventory.quantity_reserved == 20
        print("  [OK] 1-to-1 Product-to-Inventory relationship verified.")

    async with session_factory() as session:
        # Duplicate inventory for same product -> MUST FAIL
        inv_dup = Inventory(product_id=product_id, quantity_on_hand=50)
        session.add(inv_dup)
        dup_failed = False
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            dup_failed = True
        assert dup_failed, "Duplicate inventory for same product should have failed!"
        print("  [OK] Second inventory for the same product correctly raised IntegrityError.")

async def test_cart_constraints(session_factory, ids, product_id):
    print("\n[TEST 4] Supplier-specific Cart and CartItem constraints...")
    async with session_factory() as session:
        cart_1 = Cart(
            vendor_id=ids["user_vendor_id"],
            vendor_company_id=ids["comp_vendor_id"],
            supplier_company_id=ids["comp_supplier_1_id"]
        )
        session.add(cart_1)
        await session.commit()
        cart_1_id = cart_1.id

    async with session_factory() as session:
        # Duplicate active cart for same vendor-company + supplier-company -> MUST FAIL
        cart_dup = Cart(
            vendor_id=ids["user_vendor_id"],
            vendor_company_id=ids["comp_vendor_id"],
            supplier_company_id=ids["comp_supplier_1_id"]
        )
        session.add(cart_dup)
        dup_failed = False
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            dup_failed = True
        assert dup_failed, "Duplicate cart for same vendor & supplier pair should have failed!"
        print("  [OK] Unique cart per vendor-company + supplier-company pair enforced.")

    async with session_factory() as session:
        # Separate active cart for a different supplier -> MUST SUCCEED
        cart_2 = Cart(
            vendor_id=ids["user_vendor_id"],
            vendor_company_id=ids["comp_vendor_id"],
            supplier_company_id=ids["comp_supplier_2_id"]
        )
        session.add(cart_2)
        await session.commit()
        print("  [OK] Vendor can have active carts with multiple distinct suppliers.")

    async with session_factory() as session:
        # Add Cart Item
        item_1 = CartItem(
            cart_id=cart_1_id,
            product_id=product_id,
            quantity=5,
            unit_price=Decimal("1500.00")
        )
        session.add(item_1)
        await session.commit()

    async with session_factory() as session:
        # Duplicate product in same cart -> MUST FAIL
        item_dup = CartItem(
            cart_id=cart_1_id,
            product_id=product_id,
            quantity=2,
            unit_price=Decimal("1500.00")
        )
        session.add(item_dup)
        dup_item_failed = False
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            dup_item_failed = True
        assert dup_item_failed, "Duplicate product in same cart should have failed!"
        print("  [OK] CartItem unique constraint (cart_id, product_id) verified.")

async def test_order_and_snapshots(session_factory, ids, product_id):
    print("\n[TEST 5] OrderRequest & OrderRequestItem pricing and name snapshots...")
    async with session_factory() as session:
        order_req = OrderRequest(
            vendor_company_id=ids["comp_vendor_id"],
            supplier_company_id=ids["comp_supplier_1_id"],
            created_by_user_id=ids["user_vendor_id"],
            title="Monthly Rice & Produce Supply",
            description="High quality grain batch",
            quantity=15,
            unit="kg",
            estimated_price=Decimal("7900.00"),
            status="pending"
        )
        session.add(order_req)
        await session.flush()

        item_catalog = OrderRequestItem(
            order_request_id=order_req.id,
            product_id=product_id,
            product_name="Basmati Rice 25kg",
            product_name_snapshot="Basmati Rice 25kg",
            quantity=5,
            unit="bag",
            unit_price=Decimal("1500.00"),
            estimated_price=Decimal("1500.00")
        )

        item_freetext = OrderRequestItem(
            order_request_id=order_req.id,
            product_id=None,
            product_name="Custom Packing Material (Free Text)",
            product_name_snapshot=None,
            quantity=10,
            unit="units",
            unit_price=Decimal("40.00"),
            estimated_price=Decimal("40.00"),
            notes="Special wooden crates"
        )
        session.add_all([item_catalog, item_freetext])
        await session.commit()
        order_id = order_req.id
        print("  [OK] Created OrderRequest with buyer company, seller company, creator user, catalog item, and free-text item.")

    # Modify catalog product price and name
    async with session_factory() as session:
        res = await session.execute(select(Product).where(Product.id == product_id))
        prod = res.scalars().first()
        prod.price = Decimal("2200.00")
        prod.name = "Super Premium Basmati Rice 25kg (Renamed)"
        await session.commit()

    # Verify historical order remains UNCHANGED
    async with session_factory() as session:
        res = await session.execute(
            select(OrderRequest)
            .options(
                selectinload(OrderRequest.items),
                selectinload(OrderRequest.vendor_company),
                selectinload(OrderRequest.supplier_company),
                selectinload(OrderRequest.created_by_user)
            )
            .where(OrderRequest.id == order_id)
        )
        loaded_order = res.scalars().first()
        assert loaded_order.vendor_company_id == ids["comp_vendor_id"]
        assert loaded_order.supplier_company_id == ids["comp_supplier_1_id"]
        assert loaded_order.created_by_user_id == ids["user_vendor_id"]
        assert loaded_order.vendor_company.company_name == "Supermarket Retailers A"
        assert loaded_order.supplier_company.company_name == "Agro Supplier X"
        assert loaded_order.created_by_user.full_name == "Vendor Alice"

        loaded_cat_item = next(i for i in loaded_order.items if i.product_id == product_id)
        assert loaded_cat_item.unit_price == Decimal("1500.00"), "Historical price snapshot must NOT change when catalog price changes!"
        assert loaded_cat_item.product_name_snapshot == "Basmati Rice 25kg", "Historical name snapshot must NOT change when product is renamed!"
        print("  [OK] Price snapshot (Rs 1,500.00) and name snapshot ('Basmati Rice 25kg') preserved despite catalog changes.")

        loaded_ft_item = next(i for i in loaded_order.items if i.product_id is None)
        assert loaded_ft_item.product_name == "Custom Packing Material (Free Text)"
        assert loaded_ft_item.product_id is None
        print("  [OK] Free-text backward compatibility verified (product_id is NULL).")

async def test_decimal_precision(session_factory, product_id):
    print("\n[TEST 6] Decimal monetary field precision verification...")
    async with session_factory() as session:
        res = await session.execute(select(Product).where(Product.id == product_id))
        prod = res.scalars().first()
        assert isinstance(prod.price, Decimal)
        calc = prod.price * Decimal("3.5")
        assert calc == Decimal("7700.00")
        print(f"  [OK] Monetary values are Python Decimal instances ({type(prod.price).__name__}). Exact precision confirmed.")

async def test_relationships(session_factory, ids):
    print("\n[TEST 7] Company & User Relationship Collections...")
    async with session_factory() as session:
        res = await session.execute(
            select(Company)
            .options(
                selectinload(Company.products),
                selectinload(Company.vendor_orders),
                selectinload(Company.supplier_orders),
                selectinload(Company.vendor_carts),
                selectinload(Company.supplier_carts)
            )
            .where(Company.id == ids["comp_supplier_1_id"])
        )
        loaded_sup1 = res.scalars().first()
        assert len(loaded_sup1.products) >= 1
        assert len(loaded_sup1.supplier_orders) >= 1
        assert len(loaded_sup1.supplier_carts) >= 1
        print("  [OK] Company relationships (products, supplier_orders, supplier_carts) verified.")

    async with session_factory() as session:
        res = await session.execute(
            select(User)
            .options(selectinload(User.carts), selectinload(User.created_orders))
            .where(User.id == ids["user_vendor_id"])
        )
        loaded_u = res.scalars().first()
        assert len(loaded_u.carts) >= 1
        assert len(loaded_u.created_orders) >= 1
        print("  [OK] User relationships (carts, created_orders) verified.")

async def run_all_tests():
    print("\n" + "="*70)
    print("FLOWZA -- RUNNING DATABASE ARCHITECTURE & ER REFACTOR TEST SUITE")
    print("="*70)

    engine, session_factory = await init_test_db()
    ids = await setup_seed_data(session_factory)
    product_id = await test_sku_uniqueness(session_factory, ids)
    await test_inventory_constraints(session_factory, product_id)
    await test_cart_constraints(session_factory, ids, product_id)
    await test_order_and_snapshots(session_factory, ids, product_id)
    await test_decimal_precision(session_factory, product_id)
    await test_relationships(session_factory, ids)

    await engine.dispose()
    print("\n" + "="*70)
    print("ALL 7 ARCHITECTURAL TEST SUITES PASSED PERFECTLY!")
    print("="*70 + "\n")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
