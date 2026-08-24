from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from app.models.product import Product
from typing import Optional, List, Dict, Any, Tuple
import uuid

class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, product_id: uuid.UUID) -> Optional[Product]:
        result = await self.db.execute(
            select(Product)
            .options(selectinload(Product.company))
            .where(Product.id == product_id, Product.is_deleted == False)
        )
        return result.scalars().first()

    async def get_by_sku(self, company_id: uuid.UUID, sku: str) -> Optional[Product]:
        result = await self.db.execute(
            select(Product)
            .where(
                Product.company_id == company_id,
                Product.sku == sku,
                Product.is_deleted == False
            )
        )
        return result.scalars().first()

    async def list_products(
        self,
        *,
        company_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Product], int]:
        stmt = select(Product).options(selectinload(Product.company)).where(Product.is_deleted == False)

        if company_id is not None:
            stmt = stmt.where(Product.company_id == company_id)
        if category is not None:
            stmt = stmt.where(Product.category == category)
        if is_active is not None:
            stmt = stmt.where(Product.is_active == is_active)
        if search:
            s_pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    Product.name.ilike(s_pattern),
                    Product.sku.ilike(s_pattern)
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one()

        # Pagination & Ordering
        stmt = stmt.order_by(Product.name.asc())
        stmt = stmt.offset((page - 1) * limit).limit(limit)

        res = await self.db.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    async def create(self, product_data: Dict[str, Any]) -> Product:
        product = Product(**product_data)
        self.db.add(product)
        await self.db.flush()
        return product

    async def update(self, product: Product, update_data: Dict[str, Any]) -> Product:
        for field, value in update_data.items():
            setattr(product, field, value)
        await self.db.flush()
        return product

    async def soft_delete(self, product: Product) -> None:
        product.is_deleted = True
        product.is_active = False
        await self.db.flush()
