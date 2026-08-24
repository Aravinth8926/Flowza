import asyncio
import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import select

# Ensure parent path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.session import AsyncSessionLocal, engine
from app.database.base import Base
from app.models import Role, User, Company, Address, Product, Inventory, Cart, CartItem, OrderRequest, OrderRequestItem
from app.core.security import get_password_hash


async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("[SEED] Checking/Seeding system roles...")
        role_names = ["vendor", "supplier", "admin"]
        roles_dict = {}
        for rname in role_names:
            result = await db.execute(select(Role).where(Role.name == rname))
            role = result.scalars().first()
            if not role:
                print(f"[SEED] Creating role: {rname}")
                role = Role(name=rname, description=f"{rname.capitalize()} role")
                db.add(role)
                await db.flush()
            roles_dict[rname] = role

        # ── Admin ──────────────────────────────────────────────────────────────
        admin_email = "admin@flowza.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalars().first()
        if not admin:
            print("[SEED] Creating demo admin user...")
            company = Company(
                company_name="Flowza Platform Inc.",
                business_type="Platform Admin",
                description="Core administration company for Flowza B2B services.",
            )
            db.add(company)
            await db.flush()
            db.add(Address(
                company_id=company.id, country="India", state="Karnataka",
                city="Bengaluru", address_line="Flowza HQ, Block 4, Koramangala",
                address_type="billing",
            ))
            await db.flush()
            db.add(User(
                full_name="Flowza Admin", email=admin_email,
                hashed_password=get_password_hash("AdminPassword123!"),
                phone="9999999999", role_id=roles_dict["admin"].id,
                company_id=company.id, is_active=True,
            ))
            await db.flush()

        # ── Suppliers ──────────────────────────────────────────────────────────
        suppliers_data = [
            {
                "full_name": "ABC Distributors",
                "email": "abc@distributors.com",
                "phone": "+91 9876543210",
                "company_name": "ABC Distributors",
                "business_type": "Distributor",
                "description": "Fresh vegetables and grocery wholesale supply with direct farm procurement.",
                "gst_number": "33AABCU9603R1ZM",
                "city": "Coimbatore",
                "state": "Tamil Nadu",
                "address_line": "12, Industrial Estate, Peelamedu, Coimbatore - 641004",
                "products": [
                    {"name": "Basmati Rice Premium", "sku": "ABC-RICE-001", "category": "Grains",
                     "price": "150.50", "unit": "kg", "on_hand": 200, "reserved": 20, "reorder_level": 30},
                    {"name": "Toor Dal", "sku": "ABC-DAL-001", "category": "Pulses",
                     "price": "120.00", "unit": "kg", "on_hand": 150, "reserved": 10, "reorder_level": 25},
                    {"name": "Refined Sunflower Oil", "sku": "ABC-OIL-001", "category": "Oils",
                     "price": "98.00", "unit": "litre", "on_hand": 80, "reserved": 5, "reorder_level": 20},
                    {"name": "White Sugar", "sku": "ABC-SUG-001", "category": "Sweeteners",
                     "price": "44.00", "unit": "kg", "on_hand": 18, "reserved": 5, "reorder_level": 20},
                    {"name": "Tomatoes (Fresh)", "sku": "ABC-TOM-001", "category": "Vegetables",
                     "price": "40.00", "unit": "kg", "on_hand": 0, "reserved": 0, "reorder_level": 15},
                ],
            },
            {
                "full_name": "XYZ Manufacturers",
                "email": "xyz@manufacturers.com",
                "phone": "+91 9876543211",
                "company_name": "XYZ Manufacturers",
                "business_type": "Manufacturer",
                "description": "Packaged food products, staples and FMCG manufacturing & distribution.",
                "gst_number": "33XYZM1234F1ZN",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "address_line": "88, Mount Road, Guindy, Chennai - 600032",
                "products": [
                    {"name": "Wheat Flour (Atta)", "sku": "XYZ-FLOUR-001", "category": "Grains",
                     "price": "48.00", "unit": "kg", "on_hand": 300, "reserved": 30, "reorder_level": 50},
                    {"name": "Instant Coffee Powder", "sku": "XYZ-COF-001", "category": "Beverages",
                     "price": "680.00", "unit": "kg", "on_hand": 60, "reserved": 5, "reorder_level": 10},
                    {"name": "Tea Leaves (CTC)", "sku": "XYZ-TEA-001", "category": "Beverages",
                     "price": "320.00", "unit": "kg", "on_hand": 12, "reserved": 0, "reorder_level": 15},
                    {"name": "Turmeric Powder", "sku": "XYZ-TUR-001", "category": "Spices",
                     "price": "220.00", "unit": "kg", "on_hand": 0, "reserved": 0, "reorder_level": 10},
                ],
            },
            {
                "full_name": "PQR Wholesalers",
                "email": "pqr@wholesalers.com",
                "phone": "+91 9876543212",
                "company_name": "PQR Wholesalers",
                "business_type": "Wholesaler",
                "description": "Bulk grocery, grains, pulses, and household items wholesale trader.",
                "gst_number": "33PQRW5678K1ZP",
                "city": "Madurai",
                "state": "Tamil Nadu",
                "address_line": "25, West Veli Street, Madurai - 625001",
                "products": [
                    {"name": "Moong Dal", "sku": "PQR-DAL-001", "category": "Pulses",
                     "price": "110.00", "unit": "kg", "on_hand": 180, "reserved": 15, "reorder_level": 30},
                    {"name": "Mustard Seeds", "sku": "PQR-MUS-001", "category": "Spices",
                     "price": "85.00", "unit": "kg", "on_hand": 20, "reserved": 3, "reorder_level": 25},
                    {"name": "Coconut Oil", "sku": "PQR-CNOT-001", "category": "Oils",
                     "price": "175.00", "unit": "litre", "on_hand": 0, "reserved": 0, "reorder_level": 20},
                ],
            },
        ]

        supplier_users = {}
        for sdata in suppliers_data:
            res = await db.execute(select(User).where(User.email == sdata["email"]))
            s_user = res.scalars().first()
            if not s_user:
                print(f"[SEED] Creating supplier: {sdata['company_name']} ({sdata['email']})...")
                s_comp = Company(
                    company_name=sdata["company_name"],
                    business_type=sdata["business_type"],
                    description=sdata["description"],
                    gst_number=sdata["gst_number"],
                )
                db.add(s_comp)
                await db.flush()

                db.add(Address(
                    company_id=s_comp.id, country="India",
                    state=sdata["state"], city=sdata["city"],
                    address_line=sdata["address_line"], address_type="billing",
                ))
                await db.flush()

                s_user = User(
                    full_name=sdata["full_name"], email=sdata["email"],
                    hashed_password=get_password_hash("Password123!"),
                    phone=sdata["phone"], role_id=roles_dict["supplier"].id,
                    company_id=s_comp.id, is_active=True,
                )
                db.add(s_user)
                await db.flush()

                # Seed Products + Inventory for this supplier
                print(f"[SEED]   Seeding {len(sdata['products'])} products for {sdata['company_name']}...")
                for pd in sdata["products"]:
                    prod = Product(
                        company_id=s_comp.id,
                        name=pd["name"], sku=pd["sku"],
                        category=pd["category"],
                        price=Decimal(pd["price"]),
                        unit=pd["unit"], is_active=True,
                    )
                    db.add(prod)
                    await db.flush()

                    inv = Inventory(
                        product_id=prod.id,
                        quantity_on_hand=pd["on_hand"],
                        quantity_reserved=pd["reserved"],
                        reorder_level=pd["reorder_level"],
                        reorder_quantity=50,
                    )
                    db.add(inv)
                    await db.flush()

            supplier_users[sdata["email"]] = s_user

        # ── Vendor ─────────────────────────────────────────────────────────────
        vendor_email = "vendor@supermarket.com"
        res = await db.execute(select(User).where(User.email == vendor_email))
        vendor_user = res.scalars().first()
        if not vendor_user:
            print("[SEED] Creating demo vendor: My Supermarket (vendor@supermarket.com)...")
            v_comp = Company(
                company_name="My Supermarket",
                business_type="Retail Supermarket Chain",
                description="Leading fresh grocery & FMCG retail supermarket chain in Tamil Nadu.",
                gst_number="33MYSUP9988A1Z9",
            )
            db.add(v_comp)
            await db.flush()

            db.add(Address(
                company_id=v_comp.id, country="India", state="Tamil Nadu",
                city="Coimbatore",
                address_line="45, MG Road, Coimbatore, Tamil Nadu - 641001",
                address_type="shipping",
            ))
            await db.flush()

            vendor_user = User(
                full_name="My Supermarket Retailers", email=vendor_email,
                hashed_password=get_password_hash("Password123!"),
                phone="+91 9443322110", role_id=roles_dict["vendor"].id,
                company_id=v_comp.id, is_active=True,
            )
            db.add(vendor_user)
            await db.flush()

        # ── Legacy demo orders for ABC Distributors ────────────────────────────
        abc_supplier = supplier_users.get("abc@distributors.com")
        if abc_supplier and vendor_user:
            orders_res = await db.execute(
                select(OrderRequest).where(
                    OrderRequest.supplier_company_id == abc_supplier.company_id
                )
            )
            existing_orders = orders_res.scalars().all()
            if not existing_orders:
                print("[SEED] Creating realistic demo purchase orders for ABC Distributors...")
                today = date.today()

                ord1 = OrderRequest(
                    vendor_company_id=vendor_user.company_id,
                    supplier_company_id=abc_supplier.company_id,
                    created_by_user_id=vendor_user.id,
                    title="Weekly Vegetable Supply — August Week 2",
                    description="Need fresh vegetables for our supermarket branch in Coimbatore. Prefer hybrid varieties for tomatoes.",
                    quantity=105, unit="kg",
                    estimated_price=Decimal("3800.00"),
                    delivery_date=today + timedelta(days=4),
                    delivery_address="45, MG Road, Coimbatore, Tamil Nadu - 641001",
                    priority="medium", status="pending",
                )
                db.add(ord1)
                await db.flush()
                db.add_all([
                    OrderRequestItem(order_request_id=ord1.id, product_name="Tomatoes", quantity=50, unit="kg", estimated_price=Decimal("40.00")),
                    OrderRequestItem(order_request_id=ord1.id, product_name="Onions", quantity=30, unit="kg", estimated_price=Decimal("35.00")),
                    OrderRequestItem(order_request_id=ord1.id, product_name="Potatoes", quantity=25, unit="kg", estimated_price=Decimal("30.00")),
                ])

                ord2 = OrderRequest(
                    vendor_company_id=vendor_user.company_id,
                    supplier_company_id=abc_supplier.company_id,
                    created_by_user_id=vendor_user.id,
                    title="Monthly Grocery Restock — August",
                    description="Standard grocery stock replenishment for Coimbatore branch.",
                    quantity=170, unit="kg",
                    estimated_price=Decimal("15200.00"),
                    delivery_date=today + timedelta(days=9),
                    delivery_address="45, MG Road, Coimbatore, Tamil Nadu - 641001",
                    priority="high", status="pending",
                )
                db.add(ord2)
                await db.flush()
                db.add_all([
                    OrderRequestItem(order_request_id=ord2.id, product_name="Sona Masoori Rice", quantity=100, unit="kg", estimated_price=Decimal("75.00")),
                    OrderRequestItem(order_request_id=ord2.id, product_name="Toor Dal", quantity=40, unit="kg", estimated_price=Decimal("120.00")),
                    OrderRequestItem(order_request_id=ord2.id, product_name="Refined Sunflower Oil", quantity=30, unit="liters", estimated_price=Decimal("96.67")),
                ])

                ord3 = OrderRequest(
                    vendor_company_id=vendor_user.company_id,
                    supplier_company_id=abc_supplier.company_id,
                    created_by_user_id=vendor_user.id,
                    title="Fresh Fruits — Mango Season Special",
                    description="Alphonso and Banganapalli seasonal mango batch delivery.",
                    quantity=60, unit="kg",
                    estimated_price=Decimal("9500.00"),
                    delivery_date=today + timedelta(days=1),
                    delivery_address="45, MG Road, Coimbatore, Tamil Nadu - 641001",
                    priority="medium", status="accepted",
                    supplier_response="Confirmed. Will deliver by 12th morning.",
                    responded_at=datetime.now() - timedelta(hours=18),
                )
                db.add(ord3)
                await db.flush()
                db.add_all([
                    OrderRequestItem(order_request_id=ord3.id, product_name="Alphonso Mangoes", quantity=35, unit="kg", estimated_price=Decimal("180.00")),
                    OrderRequestItem(order_request_id=ord3.id, product_name="Banganapalli Mangoes", quantity=25, unit="kg", estimated_price=Decimal("128.00")),
                ])

                ord4 = OrderRequest(
                    vendor_company_id=vendor_user.company_id,
                    supplier_company_id=abc_supplier.company_id,
                    created_by_user_id=vendor_user.id,
                    title="Regular Stock — Week 31",
                    description="Fulfilled regular inventory batch for Week 31.",
                    quantity=80, unit="kg",
                    estimated_price=Decimal("12400.00"),
                    delivery_date=today - timedelta(days=5),
                    delivery_address="45, MG Road, Coimbatore, Tamil Nadu - 641001",
                    priority="low", status="completed",
                    supplier_response="Delivered and verified by store manager on 6 Aug 2026.",
                    responded_at=datetime.now() - timedelta(days=5),
                )
                db.add(ord4)
                await db.flush()
                db.add_all([
                    OrderRequestItem(order_request_id=ord4.id, product_name="Wheat Flour (Atta)", quantity=50, unit="kg", estimated_price=Decimal("48.00")),
                    OrderRequestItem(order_request_id=ord4.id, product_name="White Sugar", quantity=30, unit="kg", estimated_price=Decimal("44.00")),
                ])

        await db.commit()
        print("[SEED] Database seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
