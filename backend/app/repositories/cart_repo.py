from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.company import Company
from typing import Optional, List
import uuid


class CartRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_cart(
        self,
        vendor_company_id: uuid.UUID,
        supplier_company_id: uuid.UUID,
    ) -> Optional[Cart]:
        """Find the active cart for a vendor-supplier pair."""
        result = await self.db.execute(
            select(Cart)
            .options(
                selectinload(Cart.items).selectinload(CartItem.product),
                selectinload(Cart.supplier_company),
            )
            .where(
                Cart.vendor_company_id == vendor_company_id,
                Cart.supplier_company_id == supplier_company_id,
                Cart.is_deleted == False,
            )
        )
        return result.scalars().first()

    async def get_cart_by_id(self, cart_id: uuid.UUID, vendor_company_id: uuid.UUID) -> Optional[Cart]:
        """Load a specific cart, verifying ownership."""
        result = await self.db.execute(
            select(Cart)
            .options(
                selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory),
                selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.company),
                selectinload(Cart.supplier_company),
            )
            .where(
                Cart.id == cart_id,
                Cart.vendor_company_id == vendor_company_id,
                Cart.is_deleted == False,
            )
        )
        return result.scalars().first()

    async def list_carts(self, vendor_company_id: uuid.UUID) -> List[Cart]:
        """All non-empty active carts for a vendor company."""
        result = await self.db.execute(
            select(Cart)
            .options(
                selectinload(Cart.items).selectinload(CartItem.product),
                selectinload(Cart.supplier_company),
            )
            .where(
                Cart.vendor_company_id == vendor_company_id,
                Cart.is_deleted == False,
            )
            .order_by(Cart.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_or_create_cart(
        self,
        vendor_id: uuid.UUID,
        vendor_company_id: uuid.UUID,
        supplier_company_id: uuid.UUID,
    ) -> Cart:
        """Return existing active cart or create a new one."""
        cart = await self.get_cart(vendor_company_id, supplier_company_id)
        if cart:
            return cart

        # Check if a soft-deleted cart exists; reactivate it
        result = await self.db.execute(
            select(Cart).where(
                Cart.vendor_company_id == vendor_company_id,
                Cart.supplier_company_id == supplier_company_id,
                Cart.is_deleted == True,
            )
        )
        deleted_cart = result.scalars().first()
        if deleted_cart:
            deleted_cart.is_deleted = False
            deleted_cart.vendor_id = vendor_id
            await self.db.flush()
            return deleted_cart

        cart = Cart(
            vendor_id=vendor_id,
            vendor_company_id=vendor_company_id,
            supplier_company_id=supplier_company_id,
        )
        self.db.add(cart)
        await self.db.flush()
        return cart

    async def get_cart_item(self, cart_id: uuid.UUID, product_id: uuid.UUID) -> Optional[CartItem]:
        result = await self.db.execute(
            select(CartItem).where(
                CartItem.cart_id == cart_id,
                CartItem.product_id == product_id,
                CartItem.is_deleted == False,
            )
        )
        return result.scalars().first()

    async def get_any_cart_item(self, cart_id: uuid.UUID, product_id: uuid.UUID) -> Optional[CartItem]:
        """Find cart item regardless of soft-delete status (to avoid unique constraint violations)."""
        result = await self.db.execute(
            select(CartItem).where(
                CartItem.cart_id == cart_id,
                CartItem.product_id == product_id,
            )
        )
        return result.scalars().first()


    async def get_cart_item_by_id(self, item_id: uuid.UUID) -> Optional[CartItem]:
        result = await self.db.execute(
            select(CartItem)
            .options(selectinload(CartItem.cart))
            .where(CartItem.id == item_id, CartItem.is_deleted == False)
        )
        return result.scalars().first()

    async def add_item(self, cart_id: uuid.UUID, product_id: uuid.UUID, quantity: int, unit_price: float) -> CartItem:
        item = CartItem(
            cart_id=cart_id,
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price,
        )
        self.db.add(item)
        await self.db.flush()
        return item

    async def update_item_quantity(self, item: CartItem, quantity: int, unit_price: float) -> CartItem:
        item.quantity = quantity
        item.unit_price = unit_price
        await self.db.flush()
        return item

    async def remove_item(self, item: CartItem) -> None:
        item.is_deleted = True
        await self.db.flush()

    async def clear_cart_items(self, cart_id: uuid.UUID) -> None:
        """Soft-delete all items in a cart (used after checkout)."""
        result = await self.db.execute(
            select(CartItem).where(
                CartItem.cart_id == cart_id,
                CartItem.is_deleted == False,
            )
        )
        items = result.scalars().all()
        for item in items:
            item.is_deleted = True
        await self.db.flush()

    async def delete_cart(self, cart: Cart) -> None:
        cart.is_deleted = True
        await self.db.flush()
