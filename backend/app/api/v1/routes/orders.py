import uuid
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.api.v1.deps import get_current_active_user
from app.models.user import User
from app.models.company import Company
from app.models.address import Address
from app.models.order_request import OrderRequest, OrderRequestItem
from app.core.websocket import manager as ws_manager

router = APIRouter()

# Pydantic Schemas
class OrderItemCreate(BaseModel):
    product_name: str
    quantity: int
    unit: Optional[str] = "kg"
    estimated_price: Optional[float] = None
    notes: Optional[str] = None

class OrderCreateRequest(BaseModel):
    supplier_id: str
    title: str
    description: Optional[str] = None
    items: Optional[List[OrderItemCreate]] = []
    delivery_date: Optional[str] = None
    delivery_address: Optional[str] = None
    priority: Optional[str] = "medium"

class OrderRespondRequest(BaseModel):
    action: str  # accept, reject, suggest
    response_note: Optional[str] = None
    new_total: Optional[str] = None

class OrderStatusUpdateRequest(BaseModel):
    status: str  # in_progress, completed, cancelled

def format_order_response(o: OrderRequest, vendor_user: Optional[User], supplier_user: Optional[User]):
    v_comp = vendor_user.company if vendor_user else None
    v_addr = v_comp.address if v_comp else None
    s_comp = supplier_user.company if supplier_user else None
    s_addr = s_comp.address if s_comp else None

    item_names = [item.product_name for item in o.items] if o.items else [o.title]
    item_preview = ", ".join(item_names[:3])
    if len(item_names) > 3:
        item_preview += f" +{len(item_names) - 3} more"

    items_list = []
    if o.items:
        for idx, item in enumerate(o.items):
            est_p = float(item.estimated_price) if item.estimated_price is not None else 0.0
            subtot = est_p * item.quantity
            items_list.append({
                "id": str(item.id),
                "index": idx + 1,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit": item.unit or "kg",
                "estimated_price": est_p,
                "subtotal": subtot,
                "notes": item.notes,
            })

    total_est = float(o.estimated_price) if o.estimated_price is not None else sum(i["subtotal"] for i in items_list)

    return {
        "id": f"ORD-2026-{str(o.id)[:6].upper()}",
        "raw_id": str(o.id),
        "title": o.title,
        "description": o.description,
        "status": o.status.lower(),  # pending, accepted, rejected, in_progress, completed, cancelled
        "priority": o.priority.lower() if o.priority else "medium",
        "quantity": o.quantity,
        "unit": o.unit,
        "estimated_value": total_est,
        "formatted_total": f"₹{total_est:,.2f}",
        "delivery_date": str(o.delivery_date) if o.delivery_date else None,
        "delivery_address": o.delivery_address,
        "item_count": len(o.items) if o.items else 1,
        "item_preview": item_preview,
        "items": items_list,
        "supplier_response": o.supplier_response,
        "responded_at": o.responded_at.isoformat() if o.responded_at else None,
        "created_at": o.created_at.isoformat() if hasattr(o, "created_at") and o.created_at else datetime.now().isoformat(),
        "vendor": {
            "id": str(vendor_user.id) if vendor_user else str(o.vendor_id),
            "company_name": v_comp.company_name if v_comp else (vendor_user.full_name if vendor_user else "Vendor Company"),
            "full_name": vendor_user.full_name if vendor_user else "Vendor Representative",
            "email": vendor_user.email if vendor_user else "",
            "phone": vendor_user.phone if vendor_user else "",
            "city": v_addr.city if v_addr else "Coimbatore",
            "state": v_addr.state if v_addr else "Tamil Nadu",
            "address_line": v_addr.address_line if v_addr else "45, MG Road, Coimbatore, Tamil Nadu - 641001",
            "gst_number": v_comp.gst_number if v_comp else None,
            "logo_url": v_comp.logo_url if v_comp else None,
        },
        "supplier": {
            "id": str(supplier_user.id) if supplier_user else str(o.supplier_id),
            "company_name": s_comp.company_name if s_comp else (supplier_user.full_name if supplier_user else "Supplier Company"),
            "business_type": s_comp.business_type if s_comp else "Wholesale Distributor",
            "full_name": supplier_user.full_name if supplier_user else "Supplier Representative",
            "email": supplier_user.email if supplier_user else "",
            "phone": supplier_user.phone if supplier_user else "",
            "city": s_addr.city if s_addr else "Coimbatore",
            "state": s_addr.state if s_addr else "Tamil Nadu",
            "address_line": s_addr.address_line if s_addr else "12, Industrial Estate, Coimbatore",
            "gst_number": s_comp.gst_number if s_comp else "33AABCU9603R1ZM",
            "logo_url": s_comp.logo_url if s_comp else None,
        },
    }

@router.post("")
async def create_order(
    req: OrderCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        sup_uuid = uuid.UUID(req.supplier_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid supplier UUID format")

    # Fetch supplier user
    sup_res = await db.execute(
        select(User).options(selectinload(User.company).selectinload(Company.address)).where(User.id == sup_uuid)
    )
    supplier = sup_res.scalars().first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Vendor company
    v_comp_res = await db.execute(
        select(Company).options(selectinload(Company.address)).where(Company.user_id == current_user.id)
    )
    vendor_company = v_comp_res.scalars().first()

    supplier_company = supplier.company

    # Parse delivery date
    parsed_date = None
    if req.delivery_date:
        try:
            parsed_date = datetime.strptime(req.delivery_date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = None

    # Calculate total quantity and estimated price
    total_qty = sum(item.quantity for item in req.items) if req.items else 1
    total_price = sum((item.estimated_price or 0.0) * item.quantity for item in req.items) if req.items else 0.0

    new_order = OrderRequest(
        vendor_id=current_user.id,
        supplier_id=supplier.id,
        vendor_company_id=vendor_company.id if vendor_company else None,
        supplier_company_id=supplier_company.id if supplier_company else None,
        title=req.title,
        description=req.description,
        quantity=total_qty,
        unit=req.items[0].unit if (req.items and len(req.items) > 0 and req.items[0].unit) else "kg",
        estimated_price=total_price if total_price > 0 else None,
        delivery_date=parsed_date,
        delivery_address=req.delivery_address or (vendor_company.address.address_line if (vendor_company and vendor_company.address) else "45, MG Road, Coimbatore, Tamil Nadu - 641001"),
        priority=(req.priority or "medium").lower(),
        status="pending",
    )
    db.add(new_order)
    await db.flush()

    # Add items if present
    if req.items:
        for item in req.items:
            db_item = OrderRequestItem(
                order_request_id=new_order.id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit=item.unit or "kg",
                estimated_price=item.estimated_price,
                notes=item.notes,
            )
            db.add(db_item)

    await db.commit()

    # Fetch loaded order with items
    ord_res = await db.execute(
        select(OrderRequest).options(selectinload(OrderRequest.items)).where(OrderRequest.id == new_order.id)
    )
    loaded_order = ord_res.scalars().first()

    vendor_city = vendor_company.address.city if (vendor_company and vendor_company.address) else "Coimbatore"
    vendor_cname = vendor_company.company_name if vendor_company else current_user.full_name

    # Real-time WebSocket event to supplier
    await ws_manager.send_to_user(str(supplier.id), {
        "type": "new_order_request",
        "data": {
            "id": str(new_order.id),
            "order_number": f"ORD-2026-{str(new_order.id)[:6].upper()}",
            "title": new_order.title,
            "vendor_company": vendor_cname,
            "vendor_city": vendor_city,
            "item_count": len(req.items) if req.items else 1,
            "priority": new_order.priority,
            "delivery_date": str(new_order.delivery_date) if new_order.delivery_date else None,
            "estimated_value": total_price,
            "created_at": datetime.now().isoformat(),
        }
    })

    formatted = format_order_response(loaded_order, current_user, supplier)

    return {
        "success": True,
        "message": f"Purchase order sent to {supplier_company.company_name if supplier_company else supplier.full_name}!",
        "data": formatted,
    }


@router.get("/incoming")
async def get_incoming_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("newest"),  # newest, oldest, priority, value
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(OrderRequest)
        .options(selectinload(OrderRequest.items))
        .where(OrderRequest.supplier_id == current_user.id, OrderRequest.is_deleted == False)
    )

    if status_filter and status_filter.lower() != "all":
        stmt = stmt.where(func.lower(OrderRequest.status) == status_filter.lower())

    if search:
        s_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                OrderRequest.title.ilike(s_pattern),
                OrderRequest.description.ilike(s_pattern),
            )
        )

    if sort_by == "oldest":
        stmt = stmt.order_by(asc(OrderRequest.id))
    elif sort_by == "priority":
        stmt = stmt.order_by(desc(OrderRequest.priority), desc(OrderRequest.id))
    elif sort_by == "value":
        stmt = stmt.order_by(desc(OrderRequest.estimated_price), desc(OrderRequest.id))
    else:  # newest
        stmt = stmt.order_by(desc(OrderRequest.id))

    # Pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar_one()

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    res = await db.execute(stmt)
    orders = res.scalars().all()

    formatted = []
    for o in orders:
        # Fetch vendor user info
        v_res = await db.execute(
            select(User).options(selectinload(User.company).selectinload(Company.address)).where(User.id == o.vendor_id)
        )
        vendor_user = v_res.scalars().first()
        formatted.append(format_order_response(o, vendor_user, current_user))

    # Calculate status counts for quick tabs
    return {
        "success": True,
        "data": {
            "orders": formatted,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
            },
        },
    }


@router.get("/my-orders")
async def get_my_sent_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(OrderRequest)
        .options(selectinload(OrderRequest.items))
        .where(OrderRequest.vendor_id == current_user.id, OrderRequest.is_deleted == False)
    )

    if status_filter and status_filter.lower() != "all":
        stmt = stmt.where(func.lower(OrderRequest.status) == status_filter.lower())

    if search:
        s_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                OrderRequest.title.ilike(s_pattern),
                OrderRequest.description.ilike(s_pattern),
            )
        )

    stmt = stmt.order_by(desc(OrderRequest.id))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar_one()

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    res = await db.execute(stmt)
    orders = res.scalars().all()

    formatted = []
    for o in orders:
        s_res = await db.execute(
            select(User).options(selectinload(User.company).selectinload(Company.address)).where(User.id == o.supplier_id)
        )
        supplier_user = s_res.scalars().first()
        formatted.append(format_order_response(o, current_user, supplier_user))

    return {
        "success": True,
        "data": {
            "orders": formatted,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
            },
        },
    }


@router.get("/stats")
async def get_order_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role_name = current_user.role.name if current_user.role else "vendor"
    is_supplier = role_name == "supplier"
    user_filter = OrderRequest.supplier_id == current_user.id if is_supplier else OrderRequest.vendor_id == current_user.id

    # Fetch status counts
    total_stmt = select(func.count(OrderRequest.id)).where(user_filter, OrderRequest.is_deleted == False)
    pending_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "pending", OrderRequest.is_deleted == False)
    accepted_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "accepted", OrderRequest.is_deleted == False)
    in_progress_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "in_progress", OrderRequest.is_deleted == False)
    completed_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "completed", OrderRequest.is_deleted == False)
    rejected_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "rejected", OrderRequest.is_deleted == False)
    cancelled_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "cancelled", OrderRequest.is_deleted == False)

    total_orders = (await db.execute(total_stmt)).scalar_one()
    pending_orders = (await db.execute(pending_stmt)).scalar_one()
    accepted_orders = (await db.execute(accepted_stmt)).scalar_one()
    in_progress_orders = (await db.execute(in_progress_stmt)).scalar_one()
    completed_orders = (await db.execute(completed_stmt)).scalar_one()
    rejected_orders = (await db.execute(rejected_stmt)).scalar_one()
    cancelled_orders = (await db.execute(cancelled_stmt)).scalar_one()

    return {
        "success": True,
        "data": {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "new_requests": pending_orders,
            "accepted_orders": accepted_orders,
            "in_progress_orders": in_progress_orders,
            "completed_orders": completed_orders,
            "rejected_orders": rejected_orders,
            "cancelled_orders": cancelled_orders,
        },
    }


@router.get("/{order_id}")
async def get_order_by_id(
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        ord_uuid = uuid.UUID(order_id)
    except ValueError:
        # Try raw match or substring
        ord_uuid = None

    if ord_uuid:
        stmt = select(OrderRequest).options(selectinload(OrderRequest.items)).where(OrderRequest.id == ord_uuid)
    else:
        stmt = select(OrderRequest).options(selectinload(OrderRequest.items)).where(OrderRequest.id.cast(String).ilike(f"%{order_id}%"))

    res = await db.execute(stmt)
    order = res.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order request not found")

    # Fetch vendor & supplier
    v_res = await db.execute(
        select(User).options(selectinload(User.company).selectinload(Company.address)).where(User.id == order.vendor_id)
    )
    vendor_user = v_res.scalars().first()

    s_res = await db.execute(
        select(User).options(selectinload(User.company).selectinload(Company.address)).where(User.id == order.supplier_id)
    )
    supplier_user = s_res.scalars().first()

    return {
        "success": True,
        "data": format_order_response(order, vendor_user, supplier_user),
    }


@router.patch("/{order_id}/respond")
async def respond_to_order(
    order_id: str,
    req: OrderRespondRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        ord_uuid = uuid.UUID(order_id)
        stmt = select(OrderRequest).options(selectinload(OrderRequest.items)).where(OrderRequest.id == ord_uuid)
    except ValueError:
        stmt = select(OrderRequest).options(selectinload(OrderRequest.items)).where(OrderRequest.id.cast(String).ilike(f"%{order_id}%"))

    res = await db.execute(stmt)
    order = res.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order request not found")

    action_lower = req.action.lower()
    new_status = "accepted" if action_lower in ["accept", "accepted"] else "rejected"
    if action_lower == "suggest":
        new_status = "changes_suggested"

    order.status = new_status
    order.supplier_response = req.response_note
    order.responded_at = datetime.now()

    await db.commit()

    # Get supplier company name
    s_comp_res = await db.execute(
        select(Company).where(Company.user_id == current_user.id)
    )
    sup_comp = s_comp_res.scalars().first()
    supplier_cname = sup_comp.company_name if sup_comp else current_user.full_name

    # Real-time WebSocket notify to Vendor
    await ws_manager.send_to_user(str(order.vendor_id), {
        "type": "order_status_updated",
        "data": {
            "id": str(order.id),
            "order_number": f"ORD-2026-{str(order.id)[:6].upper()}",
            "title": order.title,
            "status": order.status,
            "supplier_company": supplier_cname,
            "supplier_response": order.supplier_response,
            "responded_at": order.responded_at.isoformat(),
        }
    })

    return {
        "success": True,
        "message": f"Order {new_status}! Vendor has been notified.",
        "data": {
            "id": str(order.id),
            "status": order.status,
            "supplier_response": order.supplier_response,
            "responded_at": order.responded_at.isoformat(),
        },
    }


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    req: OrderStatusUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        ord_uuid = uuid.UUID(order_id)
        stmt = select(OrderRequest).options(selectinload(OrderRequest.items)).where(OrderRequest.id == ord_uuid)
    except ValueError:
        stmt = select(OrderRequest).options(selectinload(OrderRequest.items)).where(OrderRequest.id.cast(String).ilike(f"%{order_id}%"))

    res = await db.execute(stmt)
    order = res.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order request not found")

    order.status = req.status.lower()
    await db.commit()

    # Notify other party
    other_party_id = str(order.vendor_id) if current_user.id == order.supplier_id else str(order.supplier_id)
    await ws_manager.send_to_user(other_party_id, {
        "type": "order_status_updated",
        "data": {
            "id": str(order.id),
            "order_number": f"ORD-2026-{str(order.id)[:6].upper()}",
            "title": order.title,
            "status": order.status,
        }
    })

    return {
        "success": True,
        "message": f"Order status updated to {order.status}",
        "data": {
            "id": str(order.id),
            "status": order.status,
        },
    }


@router.get("")
async def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    role_name = current_user.role.name if current_user.role else "vendor"
    if role_name == "supplier":
        return await get_incoming_orders(status_filter=status_filter, page=page, limit=limit, current_user=current_user, db=db)
    else:
        return await get_my_sent_orders(status_filter=status_filter, page=page, limit=limit, current_user=current_user, db=db)
