from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.product import Product
from app.models.inventory import Inventory
from app.core.exceptions import PermissionDeniedException


async def search_products(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Search authorized product catalog by name, category, or SKU."""
    query = str(arguments.get("query", "")).strip()
    category = arguments.get("category")
    limit = int(arguments.get("limit", 10))
    limit = max(1, min(limit, 25))

    stmt = (
        select(Product)
        .options(selectinload(Product.inventory), selectinload(Product.company))
        .where(Product.is_deleted == False, Product.is_active == True)
        .order_by(desc(Product.created_at))
        .limit(limit)
    )

    if current_user.role.name == "supplier":
        stmt = stmt.where(Product.company_id == current_user.company_id)

    if query:
        stmt = stmt.where(
            or_(
                Product.name.ilike(f"%{query}%"),
                Product.sku.ilike(f"%{query}%"),
                Product.category.ilike(f"%{query}%"),
            )
        )

    if category:
        stmt = stmt.where(Product.category.ilike(f"%{category}%"))

    result = await db.execute(stmt)
    records = result.scalars().all()

    products = []
    for p in records:
        inv = p.inventory
        available = (inv.quantity_on_hand - inv.quantity_reserved) if inv else None
        products.append({
            "id": str(p.id),
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "price": str(p.price),
            "unit": p.unit,
            "supplier_name": p.company.company_name if p.company else "N/A",
            "available_stock": available,
        })

    return {
        "count": len(products),
        "products": products,
    }
