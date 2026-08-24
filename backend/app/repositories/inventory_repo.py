from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.inventory import Inventory
from app.models.product import Product
from typing import Optional, List, Tuple
import uuid


class InventoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_product_id(self, product_id: uuid.UUID) -> Optional[Inventory]:
        result = await self.db.execute(
            select(Inventory)
            .options(selectinload(Inventory.product).selectinload(Product.company))
            .where(Inventory.product_id == product_id, Inventory.is_deleted == False)
        )
        return result.scalars().first()

    async def get_by_product_id_with_lock(self, product_id: uuid.UUID) -> Optional[Inventory]:
        """Load inventory with SELECT FOR UPDATE for checkout flow (PostgreSQL).
        SQLite ignores with_for_update() gracefully."""
        result = await self.db.execute(
            select(Inventory)
            .where(Inventory.product_id == product_id, Inventory.is_deleted == False)
            .with_for_update()
        )
        return result.scalars().first()

    async def list_by_company(
        self,
        company_id: uuid.UUID,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Inventory], int]:
        """List inventory records for all products belonging to a supplier company."""
        from sqlalchemy import func

        stmt = (
            select(Inventory)
            .join(Product, Inventory.product_id == Product.id)
            .options(selectinload(Inventory.product))
            .where(
                Product.company_id == company_id,
                Product.is_deleted == False,
                Inventory.is_deleted == False,
            )
            .order_by(Product.name.asc())
        )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one()

        stmt = stmt.offset((page - 1) * limit).limit(limit)
        res = await self.db.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def create(self, product_id: uuid.UUID) -> Inventory:
        inv = Inventory(
            product_id=product_id,
            quantity_on_hand=0,
            quantity_reserved=0,
            reorder_level=10,
            reorder_quantity=50,
        )
        self.db.add(inv)
        await self.db.flush()
        return inv

    async def update_fields(self, inv: Inventory, updates: dict) -> Inventory:
        for field, value in updates.items():
            setattr(inv, field, value)
        await self.db.flush()
        return inv

    async def adjust_stock(self, inv: Inventory, delta: int) -> Inventory:
        """Apply delta to quantity_on_hand. Raises ValueError if result < 0."""
        new_qty = inv.quantity_on_hand + delta
        if new_qty < 0:
            raise ValueError(
                f"Adjustment of {delta} would make stock negative "
                f"(current: {inv.quantity_on_hand})"
            )
        inv.quantity_on_hand = new_qty
        await self.db.flush()
        return inv

    async def reserve_stock(self, inv: Inventory, qty: int) -> Inventory:
        """Reserve qty units for a confirmed order. Raises ValueError if insufficient."""
        available = inv.quantity_on_hand - inv.quantity_reserved
        if available < qty:
            raise ValueError(
                f"Insufficient stock: {available} available, {qty} requested"
            )
        inv.quantity_reserved += qty
        await self.db.flush()
        return inv

    async def release_reserved_stock(self, inv: Inventory, qty: int) -> Inventory:
        """Release reserved stock on order cancellation or rejection."""
        if inv.quantity_reserved < qty:
            raise ValueError(
                f"Cannot release {qty} units: only {inv.quantity_reserved} reserved"
            )
        inv.quantity_reserved -= qty
        await self.db.flush()
        return inv

    async def fulfill_stock(self, inv: Inventory, qty: int) -> Inventory:
        """Finalize stock on order completion: deducts from both quantity_on_hand and quantity_reserved."""
        if inv.quantity_reserved < qty:
            raise ValueError(
                f"Cannot fulfill {qty} units: only {inv.quantity_reserved} reserved"
            )
        if inv.quantity_on_hand < qty:
            raise ValueError(
                f"Cannot fulfill {qty} units: only {inv.quantity_on_hand} on hand"
            )
        inv.quantity_on_hand -= qty
        inv.quantity_reserved -= qty
        await self.db.flush()
        return inv

