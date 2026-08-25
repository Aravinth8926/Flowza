import asyncio
import sys
import os
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from sqlalchemy import select, func

# Ensure parent path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.session import AsyncSessionLocal, engine
from app.database.base import Base
from app.models import (
    Role,
    User,
    Company,
    Address,
    Product,
    Inventory,
    Cart,
    CartItem,
    OrderRequest,
    OrderRequestItem,
    OrderStatusHistory,
    Invoice,
    InvoiceItem,
    PaymentRecord,
    Notification,
    NotificationPreference,
)
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

        # ── 1. Admin ───────────────────────────────────────────────────────────
        admin_email = "admin@flowza.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalars().first()
        if not admin:
            print("[SEED] Creating demo admin user...")
            admin_comp = Company(
                company_name="Flowza Platform Inc.",
                business_type="Platform Admin",
                description="Core administration company for Flowza B2B services.",
            )
            db.add(admin_comp)
            await db.flush()

            db.add(Address(
                company_id=admin_comp.id, country="India", state="Karnataka",
                city="Bengaluru", address_line="Flowza HQ, Block 4, Koramangala",
                address_type="billing",
            ))
            await db.flush()

            admin = User(
                full_name="Flowza Admin", email=admin_email,
                hashed_password=get_password_hash("AdminPassword123!"),
                phone="9999999999", role_id=roles_dict["admin"].id,
                company_id=admin_comp.id, is_active=True,
            )
            db.add(admin)
            await db.flush()

        # ── 2. Suppliers ───────────────────────────────────────────────────────
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
        supplier_prods_map = {}
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

                # Products
                s_prods = []
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
                    s_prods.append(prod)
                supplier_prods_map[sdata["email"]] = s_prods
            else:
                # Load existing products
                p_res = await db.execute(select(Product).where(Product.company_id == s_user.company_id))
                supplier_prods_map[sdata["email"]] = p_res.scalars().all()

            supplier_users[sdata["email"]] = s_user

        # ── 3. Vendors ─────────────────────────────────────────────────────────
        vendors_data = [
            {
                "full_name": "My Supermarket Retailers",
                "email": "vendor@supermarket.com",
                "phone": "+91 9443322110",
                "company_name": "My Supermarket",
                "business_type": "Retail Supermarket Chain",
                "description": "Leading fresh grocery & FMCG retail supermarket chain in Tamil Nadu.",
                "gst_number": "33MYSUP9988A1Z9",
                "city": "Coimbatore",
                "state": "Tamil Nadu",
                "address_line": "45, MG Road, Coimbatore, Tamil Nadu - 641001",
            },
            {
                "full_name": "Metro Hypermarket Stores",
                "email": "metro@hypermarket.com",
                "phone": "+91 9443322111",
                "company_name": "Metro Hypermarket",
                "business_type": "Hypermarket",
                "description": "Large format modern retail hypermarket chain.",
                "gst_number": "33METHY7766B2Z8",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "address_line": "100, Anna Salai, Chennai, Tamil Nadu - 600002",
            }
        ]

        vendor_users = {}
        for vdata in vendors_data:
            res = await db.execute(select(User).where(User.email == vdata["email"]))
            v_user = res.scalars().first()
            if not v_user:
                print(f"[SEED] Creating demo vendor: {vdata['company_name']} ({vdata['email']})...")
                v_comp = Company(
                    company_name=vdata["company_name"],
                    business_type=vdata["business_type"],
                    description=vdata["description"],
                    gst_number=vdata["gst_number"],
                )
                db.add(v_comp)
                await db.flush()

                db.add(Address(
                    company_id=v_comp.id, country="India", state=vdata["state"],
                    city=vdata["city"], address_line=vdata["address_line"],
                    address_type="shipping",
                ))
                await db.flush()

                v_user = User(
                    full_name=vdata["full_name"], email=vdata["email"],
                    hashed_password=get_password_hash("Password123!"),
                    phone=vdata["phone"], role_id=roles_dict["vendor"].id,
                    company_id=v_comp.id, is_active=True,
                )
                db.add(v_user)
                await db.flush()
            vendor_users[vdata["email"]] = v_user

        # ── 4. Seed Rich Multi-Date Order Lifecycle, Invoices & Payments ───────
        v1 = vendor_users.get("vendor@supermarket.com")
        s1 = supplier_users.get("abc@distributors.com")
        s2 = supplier_users.get("xyz@manufacturers.com")
        s3 = supplier_users.get("pqr@wholesalers.com")

        if v1 and s1 and s2:
            existing_orders_count = (await db.execute(select(func.count(OrderRequest.id)))).scalar() or 0
            if existing_orders_count < 8:
                print("[SEED] Creating rich historical orders, invoices, and payments for analytics...")
                today = date.today()
                now = datetime.now(timezone.utc)

                # Order definitions across timeline
                orders_blueprint = [
                    # 1. Completed order 25 days ago with fully paid invoice
                    {
                        "vendor": v1, "supplier": s1,
                        "title": "Monthly Staples Restock - Batch 1",
                        "status": "completed", "priority": "high",
                        "created_days_ago": 25, "price": Decimal("18500.00"),
                        "items": [
                            {"name": "Basmati Rice Premium", "qty": 80, "price": Decimal("150.50"), "unit": "kg"},
                            {"name": "Toor Dal", "qty": 50, "price": Decimal("120.00"), "unit": "kg"},
                        ],
                        "invoice": {
                            "number": "INV-2026-000001", "subtotal": Decimal("18040.00"), "tax": Decimal("902.00"),
                            "total": Decimal("18942.00"), "paid": Decimal("18942.00"), "status": "paid",
                            "days_ago": 24, "payment_method": "bank_transfer",
                        }
                    },
                    # 2. Completed order 18 days ago with partially paid invoice
                    {
                        "vendor": v1, "supplier": s2,
                        "title": "FMCG Beverages & Flours Restock",
                        "status": "completed", "priority": "medium",
                        "created_days_ago": 18, "price": Decimal("24500.00"),
                        "items": [
                            {"name": "Wheat Flour (Atta)", "qty": 200, "price": Decimal("48.00"), "unit": "kg"},
                            {"name": "Instant Coffee Powder", "qty": 20, "price": Decimal("680.00"), "unit": "kg"},
                        ],
                        "invoice": {
                            "number": "INV-2026-000002", "subtotal": Decimal("23200.00"), "tax": Decimal("1160.00"),
                            "total": Decimal("24360.00"), "paid": Decimal("15000.00"), "status": "partially_paid",
                            "days_ago": 17, "payment_method": "upi",
                        }
                    },
                    # 3. Completed order 10 days ago with unpaid invoice
                    {
                        "vendor": v1, "supplier": s1,
                        "title": "Bulk Sugar & Cooking Oil Supply",
                        "status": "completed", "priority": "normal",
                        "created_days_ago": 10, "price": Decimal("14200.00"),
                        "items": [
                            {"name": "Refined Sunflower Oil", "qty": 100, "price": Decimal("98.00"), "unit": "litre"},
                            {"name": "White Sugar", "qty": 100, "price": Decimal("44.00"), "unit": "kg"},
                        ],
                        "invoice": {
                            "number": "INV-2026-000003", "subtotal": Decimal("14200.00"), "tax": Decimal("710.00"),
                            "total": Decimal("14910.00"), "paid": Decimal("0.00"), "status": "unpaid",
                            "days_ago": 9,
                        }
                    },
                    # 4. Shipped order 4 days ago
                    {
                        "vendor": v1, "supplier": s1,
                        "title": "Weekly Grains Replenishment",
                        "status": "shipped", "priority": "high",
                        "created_days_ago": 4, "price": Decimal("9030.00"),
                        "items": [
                            {"name": "Basmati Rice Premium", "qty": 60, "price": Decimal("150.50"), "unit": "kg"},
                        ],
                    },
                    # 5. Processing order 2 days ago
                    {
                        "vendor": v1, "supplier": s2,
                        "title": "Spices & Beverages Delivery",
                        "status": "processing", "priority": "normal",
                        "created_days_ago": 2, "price": Decimal("7800.00"),
                        "items": [
                            {"name": "Tea Leaves (CTC)", "qty": 20, "price": Decimal("320.00"), "unit": "kg"},
                        ],
                    },
                    # 6. Pending order placed today
                    {
                        "vendor": v1, "supplier": s1,
                        "title": "Fresh Vegetable & Dal Emergency Batch",
                        "status": "pending", "priority": "urgent",
                        "created_days_ago": 0, "price": Decimal("4800.00"),
                        "items": [
                            {"name": "Toor Dal", "qty": 40, "price": Decimal("120.00"), "unit": "kg"},
                        ],
                    },
                    # 7. Delivered order 1 day ago awaiting completion confirmation
                    {
                        "vendor": v1, "supplier": s3,
                        "title": "Moong Dal Wholesale Consignment",
                        "status": "delivered", "priority": "normal",
                        "created_days_ago": 6, "price": Decimal("11000.00"),
                        "items": [
                            {"name": "Moong Dal", "qty": 100, "price": Decimal("110.00"), "unit": "kg"},
                        ],
                    },
                    # 8. Cancelled order 14 days ago
                    {
                        "vendor": v1, "supplier": s1,
                        "title": "Surplus Trial Order (Cancelled by vendor)",
                        "status": "cancelled", "priority": "low",
                        "created_days_ago": 14, "price": Decimal("2500.00"),
                        "items": [
                            {"name": "White Sugar", "qty": 50, "price": Decimal("44.00"), "unit": "kg"},
                        ],
                    },
                ]

                for b in orders_blueprint:
                    c_time = now - timedelta(days=b["created_days_ago"])
                    ord_req = OrderRequest(
                        vendor_company_id=b["vendor"].company_id,
                        supplier_company_id=b["supplier"].company_id,
                        created_by_user_id=b["vendor"].id,
                        title=b["title"],
                        description=f"Generated seed demo procurement record for {b['title']}.",
                        quantity=sum(it["qty"] for it in b["items"]),
                        unit=b["items"][0]["unit"],
                        estimated_price=b["price"],
                        delivery_date=today + timedelta(days=5 - b["created_days_ago"]),
                        delivery_address="45, MG Road, Coimbatore, Tamil Nadu - 641001",
                        priority=b["priority"],
                        status=b["status"],
                        created_at=c_time,
                        updated_at=c_time,
                    )
                    db.add(ord_req)
                    await db.flush()

                    for it in b["items"]:
                        item_rec = OrderRequestItem(
                            order_request_id=ord_req.id,
                            product_name=it["name"],
                            product_name_snapshot=it["name"],
                            quantity=it["qty"],
                            unit=it["unit"],
                            estimated_price=it["price"],
                            unit_price=it["price"],
                            created_at=c_time,
                        )
                        db.add(item_rec)

                    # Status history
                    db.add(OrderStatusHistory(
                        order_request_id=ord_req.id,
                        changed_by_user_id=b["vendor"].id,
                        from_status=None,
                        to_status=b["status"],
                        note=f"Initial seeded status: {b['status']}",
                        created_at=c_time,
                    ))

                    # Seed Invoice and Payment if specified
                    if "invoice" in b:
                        inv_data = b["invoice"]
                        inv_date = today - timedelta(days=inv_data["days_ago"])
                        inv_rec = Invoice(
                            order_request_id=ord_req.id,
                            invoice_number=inv_data["number"],
                            supplier_company_id=b["supplier"].company_id,
                            vendor_company_id=b["vendor"].company_id,
                            created_by_user_id=b["supplier"].id,
                            invoice_date=inv_date,
                            due_date=inv_date + timedelta(days=15),
                            currency="INR",
                            subtotal=inv_data["subtotal"],
                            tax_amount=inv_data["tax"],
                            discount_amount=Decimal("0.00"),
                            total_amount=inv_data["total"],
                            paid_amount=inv_data["paid"],
                            status="generated",
                            payment_status=inv_data["status"],
                            supplier_company_name=b["supplier"].full_name,
                            vendor_company_name=b["vendor"].full_name,
                            created_at=c_time + timedelta(hours=2),
                        )
                        db.add(inv_rec)
                        await db.flush()

                        # Invoice items
                        for it in b["items"]:
                            db.add(InvoiceItem(
                                invoice_id=inv_rec.id,
                                product_name_snapshot=it["name"],
                                quantity=it["qty"],
                                unit=it["unit"],
                                unit_price=it["price"],
                                line_subtotal=it["price"] * it["qty"],
                                tax_rate=Decimal("0.05"),
                                tax_amount=(it["price"] * it["qty"] * Decimal("0.05")).quantize(Decimal("0.01")),
                                line_total=(it["price"] * it["qty"] * Decimal("1.05")).quantize(Decimal("0.01")),
                            ))

                        # Payment Record if paid > 0
                        if inv_data["paid"] > Decimal("0.00"):
                            db.add(PaymentRecord(
                                invoice_id=inv_rec.id,
                                amount=inv_data["paid"],
                                payment_date=inv_date + timedelta(days=2),
                                method=inv_data.get("payment_method", "bank_transfer"),
                                reference=f"PAY-UTR-{uuid.uuid4().hex[:8].upper()}",
                                notes="Seeded authentic business payment settlement.",
                                recorded_by_user_id=b["supplier"].id,
                                created_at=c_time + timedelta(days=2),
                            ))

        await db.commit()
        print("[SEED] Database seeding with analytics data completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
