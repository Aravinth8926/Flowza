"""
Phase 2D — Checkout Service
===========================
Atomically:
  1. Validate all cart items (active, not deleted, stock available, price current)
  2. Reserve inventory with SELECT FOR UPDATE (safe for PostgreSQL)
  3. Create OrderRequest + OrderRequestItems (historical snapshots)
  4. Clear cart items
  5. Commit transaction
  6. Send WebSocket notification to supplier (only after commit)

On any failure: everything rolls back.
"""
from decimal import Decimal
from datetime import datetime
from typing import List
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.repositories.cart_repo import CartRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.product_repo import ProductRepository
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.order_status_history import OrderStatusHistory
from app.models.user import User
from app.schemas.cart import CheckoutRequest, CheckoutResponse, CheckoutItemResult
from app.core.exceptions import (
    NotFoundException, ConflictException, PermissionDeniedException
)


class CheckoutService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cart_repo = CartRepository(db)
        self.inv_repo = InventoryRepository(db)
        self.prod_repo = ProductRepository(db)

    async def checkout(
        self,
        cart_id: uuid.UUID,
        vendor: User,
        req: CheckoutRequest,
    ) -> CheckoutResponse:
        # 1. Load cart with ownership check
        cart = await self.cart_repo.get_cart_by_id(cart_id, vendor.company_id)
        if not cart:
            raise NotFoundException(detail="Cart not found")

        active_items = [i for i in (cart.items or []) if not i.is_deleted]
        if not active_items:
            raise ConflictException(detail="Cart is empty")

        # 2. Validate all products and detect price changes / stock issues
        price_changed_items: List[str] = []
        stock_issues: List[str] = []
        unavailable_items: List[str] = []

        validated: List[dict] = []

        for ci in active_items:
            product = ci.product
            if not product or product.is_deleted:
                unavailable_items.append(str(ci.product_id))
                continue
            if not product.is_active:
                unavailable_items.append(product.name)
                continue

            current_price = Decimal(str(product.price))
            cart_price = Decimal(str(ci.unit_price))

            if current_price != cart_price:
                price_changed_items.append(
                    f"{product.name} (was ₹{cart_price}, now ₹{current_price})"
                )

            # Load inventory with lock
            inv = await self.inv_repo.get_by_product_id_with_lock(product.id)
            if not inv:
                stock_issues.append(f"{product.name} (no inventory record)")
                continue

            available = inv.quantity_on_hand - inv.quantity_reserved
            if available < ci.quantity:
                stock_issues.append(
                    f"{product.name} (requested {ci.quantity}, available {available})"
                )

            validated.append({
                "cart_item": ci,
                "product": product,
                "inventory": inv,
                "unit_price": current_price,  # use CURRENT price for the order
            })

        # 3. Abort with clear messages on any issue
        if unavailable_items:
            raise ConflictException(
                detail=f"Some products are no longer available: {', '.join(unavailable_items)}"
            )
        if price_changed_items:
            raise ConflictException(
                detail=f"Prices have changed — please review and confirm: {'; '.join(price_changed_items)}"
            )
        if stock_issues:
            raise ConflictException(
                detail=f"Insufficient stock: {'; '.join(stock_issues)}"
            )

        # 4. All good — reserve inventory and build order within transaction
        supplier_company_id = cart.supplier_company_id

        total_qty = sum(v["cart_item"].quantity for v in validated)
        total_price = sum(v["unit_price"] * v["cart_item"].quantity for v in validated)

        # Determine delivery address
        delivery_addr = req.delivery_address or None

        # Build the OrderRequest title
        product_names = [v["product"].name for v in validated]
        title_preview = ", ".join(product_names[:2])
        if len(product_names) > 2:
            title_preview += f" +{len(product_names) - 2} more"
        title = f"Order: {title_preview}"

        # Parse delivery date
        from datetime import date as date_type
        parsed_date = None
        if req.delivery_date:
            try:
                from datetime import datetime as dt
                parsed_date = dt.strptime(req.delivery_date, "%Y-%m-%d").date()
            except ValueError:
                parsed_date = None

        # --- DATABASE TRANSACTION ---
        # Reserve inventory for each item
        for v in validated:
            inv: Inventory = v["inventory"]
            qty: int = v["cart_item"].quantity
            await self.inv_repo.reserve_stock(inv, qty)

        # Create OrderRequest
        new_order = OrderRequest(
            vendor_company_id=vendor.company_id,
            supplier_company_id=supplier_company_id,
            created_by_user_id=vendor.id,
            title=title,
            description=req.notes,
            quantity=total_qty,
            unit=validated[0]["product"].unit if validated else "units",
            estimated_price=total_price,
            delivery_date=parsed_date,
            delivery_address=delivery_addr,
            priority="medium",
            status="pending",
        )
        self.db.add(new_order)
        await self.db.flush()

        # Initial status history record
        init_history = OrderStatusHistory(
            order_request_id=new_order.id,
            from_status=None,
            to_status="pending",
            changed_by_user_id=vendor.id,
            note="Order placed via checkout",
        )
        self.db.add(init_history)

        # Create OrderRequestItems with historical snapshots
        order_items_result: List[CheckoutItemResult] = []
        for v in validated:
            product: Product = v["product"]
            ci: CartItem = v["cart_item"]
            unit_price: Decimal = v["unit_price"]
            subtotal = unit_price * ci.quantity

            db_item = OrderRequestItem(
                order_request_id=new_order.id,
                product_id=product.id,
                product_name=product.name,
                product_name_snapshot=product.name,
                sku_snapshot=product.sku,
                quantity=ci.quantity,
                unit=product.unit,
                unit_price=unit_price,
                estimated_price=unit_price,
                notes=None,
            )
            self.db.add(db_item)

            order_items_result.append(CheckoutItemResult(
                product_id=product.id,
                product_name=product.name,
                quantity=ci.quantity,
                unit=product.unit,
                unit_price=unit_price,
                subtotal=subtotal,
            ))

        # Clear cart items AFTER successful reservation and order creation
        await self.cart_repo.clear_cart_items(cart_id)

        # COMMIT everything atomically
        await self.db.commit()

        # 5. Send WebSocket notification ONLY after successful commit
        await self._notify_supplier(cart, new_order, vendor, total_price, len(validated))

        order_number = f"ORD-2026-{str(new_order.id)[:6].upper()}"
        supplier_name = "Supplier"
        if cart.supplier_company:
            supplier_name = cart.supplier_company.company_name

        return CheckoutResponse(
            order_id=str(new_order.id),
            order_number=order_number,
            supplier_company=supplier_name,
            status="pending",
            total=total_price,
            item_count=len(order_items_result),
            items=order_items_result,
            message=f"Order placed successfully with {supplier_name}!",
        )

    async def _notify_supplier(
        self, cart: Cart, order: OrderRequest, vendor: User, total: Decimal, item_count: int
    ):
        """Fire WebSocket notification to selected supplier users after commit."""
        from app.core.websocket import manager as ws_manager
        from sqlalchemy import select as sa_select
        from app.models.user import User as UserModel

        # Find supplier users belonging to the supplier company
        res = await self.db.execute(
            sa_select(UserModel).where(
                UserModel.company_id == cart.supplier_company_id,
                UserModel.is_active == True,
                UserModel.is_deleted == False,
            )
        )
        supplier_users = res.scalars().all()

        vendor_company_name = "Vendor Company"
        if cart.supplier_company:
            vendor_company_name = cart.supplier_company.company_name  # re-use cached

        # Reload vendor company name
        from app.models.company import Company
        vc_res = await self.db.execute(
            sa_select(Company).where(Company.id == vendor.company_id)
        )
        vendor_company = vc_res.scalars().first()
        vendor_company_name = vendor_company.company_name if vendor_company else vendor.full_name

        order_number = f"ORD-2026-{str(order.id)[:6].upper()}"
        payload = {
            "type": "new_order_request",
            "data": {
                "id": str(order.id),
                "order_number": order_number,
                "title": order.title,
                "vendor_company": vendor_company_name,
                "item_count": item_count,
                "priority": "medium",
                "estimated_value": float(total),
                "created_at": datetime.utcnow().isoformat(),
                "source": "cart_checkout",
            },
        }

        for su in supplier_users:
            await ws_manager.send_to_user(str(su.id), payload)
