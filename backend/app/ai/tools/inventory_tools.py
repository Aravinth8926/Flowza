from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.product import Product
from app.models.inventory import Inventory
from app.core.exceptions import PermissionDeniedException


async def get_low_stock_products(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve products where available stock (quantity_on_hand - quantity_reserved) is at or below the reorder level."""
    if current_user.role.name not in ["supplier", "admin"]:
        raise PermissionDeniedException("Only supplier or admin users can check inventory levels.")
    
    stmt = (
        select(Inventory)
        .join(Product, Inventory.product_id == Product.id)
        .options(selectinload(Inventory.product))
        .where(
            Product.is_deleted == False,
            Inventory.is_deleted == False,
            (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= Inventory.reorder_level,
        )
    )
    
    if current_user.role.name == "supplier":
        stmt = stmt.where(Product.company_id == current_user.company_id)
        
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    low_stock = []
    for inv in records:
        available = inv.quantity_on_hand - inv.quantity_reserved
        low_stock.append({
            "product_id": str(inv.product.id),
            "name": inv.product.name,
            "sku": inv.product.sku,
            "category": inv.product.category,
            "unit": inv.product.unit,
            "price": str(inv.product.price),
            "quantity_on_hand": inv.quantity_on_hand,
            "quantity_reserved": inv.quantity_reserved,
            "available_stock": available,
            "reorder_level": inv.reorder_level,
            "reorder_quantity": inv.reorder_quantity,
        })
        
    return {
        "count": len(low_stock),
        "low_stock_products": low_stock,
    }


async def get_out_of_stock_products(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve products where available stock (quantity_on_hand - quantity_reserved) is zero or negative."""
    if current_user.role.name not in ["supplier", "admin"]:
        raise PermissionDeniedException("Only supplier or admin users can check out-of-stock items.")
    
    stmt = (
        select(Inventory)
        .join(Product, Inventory.product_id == Product.id)
        .options(selectinload(Inventory.product))
        .where(
            Product.is_deleted == False,
            Inventory.is_deleted == False,
            (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= 0,
        )
    )
    
    if current_user.role.name == "supplier":
        stmt = stmt.where(Product.company_id == current_user.company_id)
        
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    out_of_stock = []
    for inv in records:
        out_of_stock.append({
            "product_id": str(inv.product.id),
            "name": inv.product.name,
            "sku": inv.product.sku,
            "category": inv.product.category,
            "unit": inv.product.unit,
            "price": str(inv.product.price),
            "quantity_on_hand": inv.quantity_on_hand,
            "quantity_reserved": inv.quantity_reserved,
            "available_stock": inv.quantity_on_hand - inv.quantity_reserved,
        })
        
    return {
        "count": len(out_of_stock),
        "out_of_stock_products": out_of_stock,
    }


async def get_inventory_summary(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve aggregated warehouse inventory metrics (total SKUs, total on-hand, reserved, available, and alert counts)."""
    if current_user.role.name not in ["supplier", "admin"]:
        raise PermissionDeniedException("Only supplier or admin users can access warehouse inventory summaries.")
    
    stmt = (
        select(Inventory)
        .join(Product, Inventory.product_id == Product.id)
        .where(
            Product.is_deleted == False,
            Inventory.is_deleted == False,
        )
    )
    
    if current_user.role.name == "supplier":
        stmt = stmt.where(Product.company_id == current_user.company_id)
        
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    total_skus = len(records)
    total_on_hand = sum(r.quantity_on_hand for r in records)
    total_reserved = sum(r.quantity_reserved for r in records)
    total_available = total_on_hand - total_reserved
    low_stock_count = sum(1 for r in records if (r.quantity_on_hand - r.quantity_reserved) <= r.reorder_level)
    out_of_stock_count = sum(1 for r in records if (r.quantity_on_hand - r.quantity_reserved) <= 0)
    
    return {
        "total_skus": total_skus,
        "total_on_hand": total_on_hand,
        "total_reserved": total_reserved,
        "total_available": total_available,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
    }
