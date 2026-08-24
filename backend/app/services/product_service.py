from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.product_repo import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.core.exceptions import NotFoundException, PermissionDeniedException, ConflictException
from app.models.product import Product
from typing import Optional, List, Tuple
import uuid

class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.product_repo = ProductRepository(db)

    async def create_product(self, company_id: uuid.UUID, data: ProductCreate) -> Product:
        if data.sku:
            existing = await self.product_repo.get_by_sku(company_id, data.sku)
            if existing:
                raise ConflictException(detail=f"Product with SKU '{data.sku}' already exists for your company")

        product_data = data.model_dump()
        product_data["company_id"] = company_id
        product = await self.product_repo.create(product_data)
        await self.db.commit()
        return product

    async def update_product(
        self,
        product_id: uuid.UUID,
        company_id: uuid.UUID,
        data: ProductUpdate,
        is_admin: bool = False
    ) -> Product:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundException(detail="Product not found")

        if not is_admin and product.company_id != company_id:
            raise PermissionDeniedException(detail="You do not have permission to update this product")

        update_dict = data.model_dump(exclude_unset=True)

        if "sku" in update_dict and update_dict["sku"]:
            sku_val = update_dict["sku"]
            existing = await self.product_repo.get_by_sku(product.company_id, sku_val)
            if existing and existing.id != product_id:
                raise ConflictException(detail=f"Product with SKU '{sku_val}' already exists for your company")

        updated = await self.product_repo.update(product, update_dict)
        await self.db.commit()
        return updated

    async def delete_product(self, product_id: uuid.UUID, company_id: uuid.UUID, is_admin: bool = False) -> None:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundException(detail="Product not found")

        if not is_admin and product.company_id != company_id:
            raise PermissionDeniedException(detail="You do not have permission to delete this product")

        await self.product_repo.soft_delete(product)
        await self.db.commit()

    async def get_product(self, product_id: uuid.UUID) -> Product:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundException(detail="Product not found")
        return product

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
        return await self.product_repo.list_products(
            company_id=company_id,
            category=category,
            search=search,
            is_active=is_active,
            page=page,
            limit=limit
        )
