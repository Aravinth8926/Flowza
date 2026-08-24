from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.database.session import get_db
from app.schemas.cart import (
    CartItemAdd, CartItemUpdate, CartResponse, CartListResponse,
    CheckoutRequest, CheckoutResponse,
)
from app.schemas.common import FlowzaResponse
from app.services.cart_service import CartService
from app.services.checkout_service import CheckoutService
from app.api.v1.deps import verify_vendor
from app.models.user import User

router = APIRouter()


# -------------------------
# Cart endpoints (vendor)
# -------------------------

@router.get("", response_model=FlowzaResponse[CartListResponse])
async def list_carts(
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Vendor: list all supplier-specific carts with active items."""
    service = CartService(db)
    result = await service.list_carts(current_user.company_id)
    return FlowzaResponse(success=True, message="Carts retrieved successfully", data=result)


@router.get("/{cart_id}", response_model=FlowzaResponse[CartResponse])
async def get_cart(
    cart_id: uuid.UUID,
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Vendor: get a specific cart (must belong to the authenticated vendor)."""
    service = CartService(db)
    cart = await service.get_cart(cart_id, current_user.company_id)
    return FlowzaResponse(success=True, message="Cart retrieved", data=cart)


@router.post("/items", response_model=FlowzaResponse[CartResponse], status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    req: CartItemAdd,
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Vendor: add a product to the appropriate supplier-specific cart.
    
    The supplier is automatically derived from the product's company_id.
    If a cart does not exist for that supplier, it is created automatically.
    If the product is already in the cart, quantity is incremented by 1.
    """
    service = CartService(db)
    cart = await service.add_item(
        vendor_id=current_user.id,
        vendor_company_id=current_user.company_id,
        data=req,
    )
    return FlowzaResponse(success=True, message="Item added to cart", data=cart)


@router.patch("/items/{item_id}", response_model=FlowzaResponse[CartResponse])
async def update_cart_item(
    item_id: uuid.UUID,
    req: CartItemUpdate,
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Vendor: update the quantity of an item in the cart (must be >= 1)."""
    service = CartService(db)
    cart = await service.update_item(item_id, current_user.company_id, req)
    return FlowzaResponse(success=True, message="Cart item updated", data=cart)


@router.delete("/items/{item_id}", response_model=FlowzaResponse[CartResponse])
async def remove_cart_item(
    item_id: uuid.UUID,
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Vendor: remove an item from the cart."""
    service = CartService(db)
    cart = await service.remove_item(item_id, current_user.company_id)
    return FlowzaResponse(success=True, message="Item removed from cart", data=cart)


@router.delete("/{cart_id}", response_model=FlowzaResponse[None])
async def clear_cart(
    cart_id: uuid.UUID,
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Vendor: clear all items from a supplier-specific cart."""
    service = CartService(db)
    await service.clear_cart(cart_id, current_user.company_id)
    return FlowzaResponse(success=True, message="Cart cleared", data=None)


# -------------------------
# Checkout endpoint (vendor)
# -------------------------

@router.post("/{cart_id}/checkout", response_model=FlowzaResponse[CheckoutResponse])
async def checkout(
    cart_id: uuid.UUID,
    req: CheckoutRequest,
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    """Vendor: checkout a supplier-specific cart.
    
    Atomically:
    - Validates all products (active, not deleted)
    - Detects price changes and requires re-confirmation (409)
    - Checks inventory availability
    - Reserves inventory (quantity_reserved += qty)
    - Creates OrderRequest and OrderRequestItems (with historical snapshots)
    - Clears cart items
    - Commits everything in one transaction
    - Notifies supplier via WebSocket (only after commit)
    
    On any failure, everything is rolled back and the cart is preserved.
    """
    service = CheckoutService(db)
    result = await service.checkout(cart_id, current_user, req)
    return FlowzaResponse(
        success=True,
        message=result.message,
        data=result,
    )
