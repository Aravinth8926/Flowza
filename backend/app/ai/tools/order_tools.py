from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.order_status_history import OrderStatusHistory
from app.models.company import Company
from app.core.exceptions import PermissionDeniedException


ACTIVE_ORDER_STATUSES = ["pending", "accepted", "processing", "packed", "shipped"]


def _format_order_num(ord_id: Any) -> str:
    return f"ORD-{str(ord_id)[:8].upper()}"


async def get_active_orders(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve orders that are currently active in fulfillment lifecycle (pending, accepted, processing, packed, shipped)."""
    stmt = (
        select(OrderRequest)
        .options(
            selectinload(OrderRequest.items),
            selectinload(OrderRequest.vendor_company),
            selectinload(OrderRequest.supplier_company),
        )
        .where(
            OrderRequest.is_deleted == False,
            OrderRequest.status.in_(ACTIVE_ORDER_STATUSES),
        )
        .order_by(desc(OrderRequest.created_at))
        .limit(20)
    )

    if current_user.role.name == "supplier":
        stmt = stmt.where(OrderRequest.supplier_company_id == current_user.company_id)
    elif current_user.role.name == "vendor":
        stmt = stmt.where(OrderRequest.vendor_company_id == current_user.company_id)
    elif current_user.role.name != "admin":
        raise PermissionDeniedException("Unauthorized to view active orders.")

    result = await db.execute(stmt)
    records = result.scalars().all()

    orders = []
    for o in records:
        orders.append({
            "id": str(o.id),
            "order_number": _format_order_num(o.id),
            "title": o.title,
            "status": o.status,
            "priority": o.priority,
            "estimated_price": str(o.estimated_price),
            "created_at": o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else None,
            "delivery_date": o.delivery_date.strftime("%Y-%m-%d") if o.delivery_date else None,
            "vendor_name": o.vendor_company.company_name if o.vendor_company else "N/A",
            "supplier_name": o.supplier_company.company_name if o.supplier_company else "N/A",
            "item_count": len(o.items),
            "items_summary": ", ".join([f"{it.quantity} {it.unit} {it.product_name_snapshot}" for it in o.items[:3]]) + ("..." if len(o.items) > 3 else ""),
        })

    return {
        "count": len(orders),
        "orders": orders,
    }


async def get_recent_orders(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve the most recent purchase orders with status and amount."""
    limit = int(arguments.get("limit", 10))
    limit = max(1, min(limit, 25))

    stmt = (
        select(OrderRequest)
        .options(
            selectinload(OrderRequest.items),
            selectinload(OrderRequest.vendor_company),
            selectinload(OrderRequest.supplier_company),
        )
        .where(OrderRequest.is_deleted == False)
        .order_by(desc(OrderRequest.created_at))
        .limit(limit)
    )

    if current_user.role.name == "supplier":
        stmt = stmt.where(OrderRequest.supplier_company_id == current_user.company_id)
    elif current_user.role.name == "vendor":
        stmt = stmt.where(OrderRequest.vendor_company_id == current_user.company_id)
    elif current_user.role.name != "admin":
        raise PermissionDeniedException("Unauthorized to view order records.")

    result = await db.execute(stmt)
    records = result.scalars().all()

    orders = []
    for o in records:
        orders.append({
            "id": str(o.id),
            "order_number": _format_order_num(o.id),
            "title": o.title,
            "status": o.status,
            "priority": o.priority,
            "estimated_price": str(o.estimated_price),
            "created_at": o.created_at.strftime("%Y-%m-%d") if o.created_at else None,
            "vendor_name": o.vendor_company.company_name if o.vendor_company else "N/A",
            "supplier_name": o.supplier_company.company_name if o.supplier_company else "N/A",
            "item_count": len(o.items),
        })

    return {
        "count": len(orders),
        "orders": orders,
    }


async def get_orders_by_status(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Filter orders by specific canonical status (e.g. pending, shipped, completed, rejected)."""
    status = str(arguments.get("status", "pending")).lower()

    stmt = (
        select(OrderRequest)
        .options(
            selectinload(OrderRequest.items),
            selectinload(OrderRequest.vendor_company),
            selectinload(OrderRequest.supplier_company),
        )
        .where(
            OrderRequest.is_deleted == False,
            OrderRequest.status == status,
        )
        .order_by(desc(OrderRequest.created_at))
        .limit(20)
    )

    if current_user.role.name == "supplier":
        stmt = stmt.where(OrderRequest.supplier_company_id == current_user.company_id)
    elif current_user.role.name == "vendor":
        stmt = stmt.where(OrderRequest.vendor_company_id == current_user.company_id)
    elif current_user.role.name != "admin":
        raise PermissionDeniedException("Unauthorized to view order records.")

    result = await db.execute(stmt)
    records = result.scalars().all()

    orders = []
    for o in records:
        orders.append({
            "id": str(o.id),
            "order_number": _format_order_num(o.id),
            "title": o.title,
            "status": o.status,
            "priority": o.priority,
            "estimated_price": str(o.estimated_price),
            "created_at": o.created_at.strftime("%Y-%m-%d") if o.created_at else None,
            "item_count": len(o.items),
        })

    return {
        "status": status,
        "count": len(orders),
        "orders": orders,
    }
