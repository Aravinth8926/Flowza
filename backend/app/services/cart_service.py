from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from typing import List, Tuple
import uuid

from app.repositories.cart_repo import CartRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.product_repo import ProductRepository
from app.schemas.cart import (
    CartResponse, CartItemResponse, CartItemAdd, CartItemUpdate,
    CartListResponse, SupplierInfo, ProductSnapshot,
)
from app.core.exceptions import NotFoundException, PermissionDeniedException, ConflictException
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.inventory import Inventory


def _build_cart_item_response(item: CartItem) -> CartItemResponse:
    product = item.product
    current_price = Decimal(str(product.price)) if product else None
    unit_price = Decimal(str(item.unit_price))
    price_changed = (
        current_price is not None and current_price != unit_price
    )

    product_snap = None
    if product:
        product_snap = ProductSnapshot(
            id=product.id,
            name=product.name,
            sku=product.sku,
            unit=product.unit,
            price=product.price,
            is_active=product.is_active,
            image_url=product.image_url,
        )

    return CartItemResponse(
        id=item.id,
        cart_id=item.cart_id,
        product_id=item.product_id,
        quantity=item.quantity,
        unit_price=unit_price,
        subtotal=unit_price * item.quantity,
        price_changed=price_changed,
        current_price=current_price,
        product=product_snap,
    )


def _build_cart_response(cart: Cart) -> CartResponse:
    active_items = [i for i in (cart.items or []) if not i.is_deleted]
    item_responses = [_build_cart_item_response(i) for i in active_items]

    subtotal = sum(ir.subtotal for ir in item_responses)
    has_price_changes = any(ir.price_changed for ir in item_responses)

    supplier_info = None
    if cart.supplier_company:
        supplier_info = SupplierInfo(
            id=cart.supplier_company.id,
            company_name=cart.supplier_company.company_name,
        )

    return CartResponse(
        id=cart.id,
        vendor_id=cart.vendor_id,
        vendor_company_id=cart.vendor_company_id,
        supplier_company_id=cart.supplier_company_id,
        supplier=supplier_info,
        items=item_responses,
        item_count=len(item_responses),
        subtotal=subtotal,
        has_price_changes=has_price_changes,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


class CartService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cart_repo = CartRepository(db)
        self.prod_repo = ProductRepository(db)
        self.inv_repo = InventoryRepository(db)

    # ---------- Helper ----------
    async def _load_and_validate_product(self, product_id: uuid.UUID) -> Product:
        product = await self.prod_repo.get_by_id(product_id)
        if not product:
            raise NotFoundException(detail="Product not found")
        if not product.is_active:
            raise ConflictException(detail="Product is not available")
        return product

    # ---------- Cart queries ----------
    async def list_carts(self, vendor_company_id: uuid.UUID) -> CartListResponse:
        carts = await self.cart_repo.list_carts(vendor_company_id)
        # Only return carts with at least one active item
        non_empty = [c for c in carts if any(not i.is_deleted for i in (c.items or []))]
        return CartListResponse(
            carts=[_build_cart_response(c) for c in non_empty],
            total=len(non_empty),
        )

    async def get_cart(
        self, cart_id: uuid.UUID, vendor_company_id: uuid.UUID
    ) -> CartResponse:
        cart = await self.cart_repo.get_cart_by_id(cart_id, vendor_company_id)
        if not cart:
            raise NotFoundException(detail="Cart not found")
        return _build_cart_response(cart)

    async def get_cart_for_supplier(
        self, vendor_company_id: uuid.UUID, supplier_company_id: uuid.UUID
    ) -> CartResponse:
        cart = await self.cart_repo.get_cart(vendor_company_id, supplier_company_id)
        if not cart:
            raise NotFoundException(detail="No cart found for this supplier")
        return _build_cart_response(cart)

    # ---------- Mutations ----------
    async def add_item(
        self,
        vendor_id: uuid.UUID,
        vendor_company_id: uuid.UUID,
        data: CartItemAdd,
    ) -> CartResponse:
        # Validate product
        product = await self._load_and_validate_product(data.product_id)
        supplier_company_id = product.company_id

        # Get or create cart
        cart = await self.cart_repo.get_or_create_cart(
            vendor_id, vendor_company_id, supplier_company_id
        )

        # Check for existing item (including soft-deleted)
        existing = await self.cart_repo.get_any_cart_item(cart.id, product.id)
        if existing:
            if existing.is_deleted:
                # Reactivate and set quantity to 1 with current price
                existing.is_deleted = False
                await self.cart_repo.update_item_quantity(
                    existing, 1, float(product.price)
                )
            else:
                # Increase quantity by 1, refresh price
                await self.cart_repo.update_item_quantity(
                    existing, existing.quantity + 1, float(product.price)
                )
        else:
            await self.cart_repo.add_item(cart.id, product.id, 1, float(product.price))

        await self.db.commit()

        # Reload cart for response
        refreshed = await self.cart_repo.get_cart_by_id(cart.id, vendor_company_id)
        return _build_cart_response(refreshed)

    async def update_item(
        self,
        item_id: uuid.UUID,
        vendor_company_id: uuid.UUID,
        data: CartItemUpdate,
    ) -> CartResponse:
        item = await self.cart_repo.get_cart_item_by_id(item_id)
        if not item:
            raise NotFoundException(detail="Cart item not found")
        if item.cart.vendor_company_id != vendor_company_id:
            raise PermissionDeniedException(detail="Not your cart item")

        # Load product for current price
        product = await self.prod_repo.get_by_id(item.product_id)
        if not product or not product.is_active:
            raise ConflictException(detail="Product is no longer available")

        await self.cart_repo.update_item_quantity(item, data.quantity, float(product.price))
        await self.db.commit()

        cart = await self.cart_repo.get_cart_by_id(item.cart_id, vendor_company_id)
        return _build_cart_response(cart)

    async def remove_item(
        self,
        item_id: uuid.UUID,
        vendor_company_id: uuid.UUID,
    ) -> CartResponse:
        item = await self.cart_repo.get_cart_item_by_id(item_id)
        if not item:
            raise NotFoundException(detail="Cart item not found")
        if item.cart.vendor_company_id != vendor_company_id:
            raise PermissionDeniedException(detail="Not your cart item")

        cart_id = item.cart_id
        await self.cart_repo.remove_item(item)
        await self.db.commit()

        cart = await self.cart_repo.get_cart_by_id(cart_id, vendor_company_id)
        return _build_cart_response(cart)

    async def clear_cart(
        self,
        cart_id: uuid.UUID,
        vendor_company_id: uuid.UUID,
    ) -> None:
        cart = await self.cart_repo.get_cart_by_id(cart_id, vendor_company_id)
        if not cart:
            raise NotFoundException(detail="Cart not found")
        await self.cart_repo.clear_cart_items(cart_id)
        await self.db.commit()
