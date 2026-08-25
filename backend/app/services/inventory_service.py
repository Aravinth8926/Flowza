from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.product_repo import ProductRepository
from app.schemas.inventory import InventoryResponse, InventoryUpdate, InventoryAdjust, ProductBasicInfo
from app.core.exceptions import NotFoundException, PermissionDeniedException
from app.models.inventory import Inventory
from app.models.product import Product
import uuid
from typing import List, Tuple


def compute_inventory_response(inv: Inventory) -> InventoryResponse:
    """Build InventoryResponse with derived fields."""
    available = max(0, inv.quantity_on_hand - inv.quantity_reserved)
    if available <= 0:
        status = "out_of_stock"
    elif available <= inv.reorder_level:
        status = "low_stock"
    else:
        status = "healthy"

    product_info = None
    if inv.product:
        product_info = ProductBasicInfo(
            id=inv.product.id,
            name=inv.product.name,
            sku=inv.product.sku,
            category=inv.product.category,
            unit=inv.product.unit,
            price=inv.product.price,
            is_active=inv.product.is_active,
        )

    return InventoryResponse(
        id=inv.id,
        product_id=inv.product_id,
        quantity_on_hand=inv.quantity_on_hand,
        quantity_reserved=inv.quantity_reserved,
        available_quantity=available,
        reorder_level=inv.reorder_level,
        reorder_quantity=inv.reorder_quantity,
        stock_status=status,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
        product=product_info,
    )


class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.inv_repo = InventoryRepository(db)
        self.prod_repo = ProductRepository(db)

    async def _resolve_and_authorize(
        self, product_id: uuid.UUID, company_id: uuid.UUID
    ) -> Inventory:
        """Load product + inventory, verify supplier ownership."""
        product = await self.prod_repo.get_by_id(product_id)
        if not product:
            raise NotFoundException(detail="Product not found")
        if product.company_id != company_id:
            raise PermissionDeniedException(
                detail="You do not have permission to manage inventory for this product"
            )
        inv = await self.inv_repo.get_by_product_id(product_id)
        if not inv:
            # Auto-create if missing (handles pre-phase-2B products)
            inv = await self.inv_repo.create(product_id)
            await self.db.flush()
        return inv

    async def get_inventory(self, product_id: uuid.UUID, company_id: uuid.UUID) -> InventoryResponse:
        inv = await self._resolve_and_authorize(product_id, company_id)
        return compute_inventory_response(inv)

    async def list_inventory(
        self, company_id: uuid.UUID, page: int = 1, limit: int = 50
    ) -> Tuple[List[InventoryResponse], int]:
        items, total = await self.inv_repo.list_by_company(company_id, page=page, limit=limit)
        return [compute_inventory_response(i) for i in items], total

    async def update_inventory(
        self, product_id: uuid.UUID, company_id: uuid.UUID, data: InventoryUpdate
    ) -> InventoryResponse:
        inv = await self._resolve_and_authorize(product_id, company_id)
        updates = data.model_dump(exclude_unset=True)
        if updates:
            await self.inv_repo.update_fields(inv, updates)

        product = await self.prod_repo.get_by_id(product_id)
        available = max(0, inv.quantity_on_hand - inv.quantity_reserved)
        if available <= inv.reorder_level or available <= 0:
            from app.services.notification_service import NotificationService
            notif_service = NotificationService(self.db)
            await notif_service.notify_inventory_stock_alert(
                product=product,
                inventory=inv,
                available=available,
                is_out_of_stock=(available <= 0),
            )

        await self.db.commit()
        return compute_inventory_response(inv)

    async def adjust_stock(
        self, product_id: uuid.UUID, company_id: uuid.UUID, data: InventoryAdjust
    ) -> InventoryResponse:
        from app.core.exceptions import ConflictException
        inv = await self._resolve_and_authorize(product_id, company_id)
        try:
            await self.inv_repo.adjust_stock(inv, data.adjustment)
        except ValueError as e:
            raise ConflictException(detail=str(e))

        product = await self.prod_repo.get_by_id(product_id)
        available = max(0, inv.quantity_on_hand - inv.quantity_reserved)
        if available <= inv.reorder_level or available <= 0:
            from app.services.notification_service import NotificationService
            notif_service = NotificationService(self.db)
            await notif_service.notify_inventory_stock_alert(
                product=product,
                inventory=inv,
                available=available,
                is_out_of_stock=(available <= 0),
            )

        await self.db.commit()
        return compute_inventory_response(inv)
