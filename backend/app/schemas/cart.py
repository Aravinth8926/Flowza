from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from decimal import Decimal
from datetime import datetime


class CartItemAdd(BaseModel):
    """Payload to add a product to the supplier-specific cart."""
    product_id: uuid.UUID


class CartItemUpdate(BaseModel):
    """Update quantity of an existing cart item."""
    quantity: int = Field(..., ge=1, description="New quantity (must be >= 1)")


class ProductSnapshot(BaseModel):
    id: uuid.UUID
    name: str
    sku: Optional[str] = None
    unit: str
    price: Decimal
    is_active: bool
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class CartItemResponse(BaseModel):
    id: uuid.UUID
    cart_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: Decimal           # price when added to cart
    subtotal: Decimal             # unit_price * quantity
    price_changed: bool = False   # True if product.price != unit_price
    current_price: Optional[Decimal] = None  # current live product price
    product: Optional[ProductSnapshot] = None

    class Config:
        from_attributes = True


class SupplierInfo(BaseModel):
    id: uuid.UUID
    company_name: str

    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    vendor_company_id: uuid.UUID
    supplier_company_id: uuid.UUID
    supplier: Optional[SupplierInfo] = None
    items: List[CartItemResponse] = []
    item_count: int
    subtotal: Decimal
    has_price_changes: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CartListResponse(BaseModel):
    carts: List[CartResponse]
    total: int


# ----- Checkout schemas -----

class CheckoutRequest(BaseModel):
    """Optional overrides for the checkout (delivery info)."""
    delivery_date: Optional[str] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = None


class CheckoutItemResult(BaseModel):
    product_id: uuid.UUID
    product_name: str
    quantity: int
    unit: str
    unit_price: Decimal
    subtotal: Decimal


class CheckoutResponse(BaseModel):
    order_id: str
    order_number: str
    supplier_company: str
    status: str
    total: Decimal
    item_count: int
    items: List[CheckoutItemResult]
    message: str
