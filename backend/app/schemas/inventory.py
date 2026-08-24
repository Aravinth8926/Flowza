from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from decimal import Decimal
from datetime import datetime


class ProductBasicInfo(BaseModel):
    id: uuid.UUID
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: str
    price: Decimal
    is_active: bool

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    """Direct set of inventory fields by supplier."""
    quantity_on_hand: Optional[int] = Field(None, ge=0, description="Physical stock on hand")
    reorder_level: Optional[int] = Field(None, ge=0, description="Low-stock threshold")
    reorder_quantity: Optional[int] = Field(None, ge=0, description="Typical reorder batch size")


class InventoryAdjust(BaseModel):
    """Safe stock adjustment (positive = add, negative = remove)."""
    adjustment: int = Field(..., description="Units to add (positive) or remove (negative)")
    reason: Optional[str] = Field(None, max_length=200, description="Reason for adjustment")


class InventoryResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity_on_hand: int
    quantity_reserved: int
    available_quantity: int          # computed: on_hand - reserved
    reorder_level: int
    reorder_quantity: int
    stock_status: str                # healthy | low_stock | out_of_stock
    created_at: datetime
    updated_at: datetime
    product: Optional[ProductBasicInfo] = None

    class Config:
        from_attributes = True


class InventoryListResponse(BaseModel):
    items: List[InventoryResponse]
    total: int
