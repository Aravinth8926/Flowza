from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.schemas.inventory import InventoryUpdate, InventoryAdjust, InventoryResponse, InventoryListResponse
from app.schemas.common import FlowzaResponse
from app.services.inventory_service import InventoryService
from app.api.v1.deps import verify_supplier
from app.models.user import User
import uuid

router = APIRouter()


@router.get("", response_model=FlowzaResponse[InventoryListResponse])
async def list_my_inventory(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Supplier: view inventory for all own products."""
    service = InventoryService(db)
    items, total = await service.list_inventory(current_user.company_id, page=page, limit=limit)
    return FlowzaResponse(
        success=True,
        message="Inventory retrieved successfully",
        data=InventoryListResponse(items=items, total=total),
    )


@router.get("/{product_id}", response_model=FlowzaResponse[InventoryResponse])
async def get_inventory(
    product_id: uuid.UUID,
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Supplier: view inventory for a specific product."""
    service = InventoryService(db)
    inv = await service.get_inventory(product_id, current_user.company_id)
    return FlowzaResponse(success=True, message="Inventory retrieved", data=inv)


@router.patch("/{product_id}", response_model=FlowzaResponse[InventoryResponse])
async def update_inventory(
    product_id: uuid.UUID,
    req: InventoryUpdate,
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Supplier: directly set inventory fields (on-hand, reorder levels)."""
    service = InventoryService(db)
    inv = await service.update_inventory(product_id, current_user.company_id, req)
    return FlowzaResponse(success=True, message="Inventory updated successfully", data=inv)


@router.post("/{product_id}/adjust", response_model=FlowzaResponse[InventoryResponse])
async def adjust_inventory(
    product_id: uuid.UUID,
    req: InventoryAdjust,
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db),
):
    """Supplier: adjust stock by a delta (positive = add, negative = remove).

    Rejects adjustments that would result in negative stock.
    """
    service = InventoryService(db)
    inv = await service.adjust_stock(product_id, current_user.company_id, req)
    return FlowzaResponse(success=True, message="Stock adjusted successfully", data=inv)
