import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, asc, String
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.api.v1.deps import get_current_active_user, verify_vendor, verify_supplier
from app.models.user import User
from app.models.company import Company
from app.models.address import Address
from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.order_status_history import OrderStatusHistory
from app.services.order_lifecycle_service import OrderLifecycleService
from app.core.exceptions import (
    NotFoundException,
    ConflictException,
    PermissionDeniedException,
    BadRequestException,
)
from app.core.websocket import manager as ws_manager

router = APIRouter()

# Pydantic Schemas
class OrderItemCreate(BaseModel):
    product_id: Optional[str] = None
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
    status: str  # accepted, processing, packed, shipped, delivered, completed, rejected, cancelled
    note: Optional[str] = None
    delivery_date: Optional[str] = None


def format_order_response(o: OrderRequest, vendor_user: Optional[User], supplier_user: Optional[User]):
    v_comp = o.vendor_company if hasattr(o, "vendor_company") and o.vendor_company else (vendor_user.company if vendor_user else None)
    v_addr = (v_comp.addresses[0] if (v_comp and hasattr(v_comp, "addresses") and v_comp.addresses) else None) or (v_comp.address if v_comp and hasattr(v_comp, "address") else None)
    s_comp = o.supplier_company if hasattr(o, "supplier_company") and o.supplier_company else (supplier_user.company if supplier_user else None)
    s_addr = (s_comp.addresses[0] if (s_comp and hasattr(s_comp, "addresses") and s_comp.addresses) else None) or (s_comp.address if s_comp and hasattr(s_comp, "address") else None)

    item_names = [item.product_name_snapshot or item.product_name for item in o.items] if o.items else [o.title]
    item_preview = ", ".join(item_names[:3])
    if len(item_names) > 3:
        item_preview += f" +{len(item_names) - 3} more"

    items_list = []
    if o.items:
        for idx, item in enumerate(o.items):
            # Prioritize historical snapshot fields
            unit_p = float(item.unit_price) if item.unit_price is not None else float(item.estimated_price or 0.0)
            subtot = unit_p * item.quantity
            items_list.append({
                "id": str(item.id),
                "index": idx + 1,
                "product_id": str(item.product_id) if item.product_id else None,
                "product_name": item.product_name_snapshot or item.product_name,
                "product_name_snapshot": item.product_name_snapshot or item.product_name,
                "quantity": item.quantity,
                "unit": item.unit or "kg",
                "unit_price": unit_p,
                "estimated_price": unit_p,
                "subtotal": subtot,
                "notes": item.notes,
            })

    total_est = float(o.estimated_price) if o.estimated_price is not None else sum(i["subtotal"] for i in items_list)

    # Format chronological status history timeline
    timeline = []
    if hasattr(o, "status_history") and o.status_history:
        for h in o.status_history:
            changed_user = h.changed_by_user if hasattr(h, "changed_by_user") else None
            timeline.append({
                "id": str(h.id),
                "from_status": h.from_status,
                "to_status": h.to_status,
                "changed_by": changed_user.full_name if changed_user else "System User",
                "changed_by_role": changed_user.role.name if (changed_user and changed_user.role) else "user",
                "note": h.note,
                "timestamp": h.created_at.isoformat() if h.created_at else None,
            })

    return {
        "id": f"ORD-2026-{str(o.id)[:6].upper()}",
        "raw_id": str(o.id),
        "title": o.title,
        "description": o.description,
        "status": o.status.lower(),  # pending, accepted, processing, packed, shipped, delivered, completed, rejected, cancelled
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
        "timeline": timeline,
        "supplier_response": o.supplier_response,
        "responded_at": o.responded_at.isoformat() if o.responded_at else None,
        "created_at": o.created_at.isoformat() if hasattr(o, "created_at") and o.created_at else datetime.now().isoformat(),
        "vendor": {
            "id": str(vendor_user.id) if vendor_user else str(o.created_by_user_id),
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
            "id": str(supplier_user.id) if supplier_user else "",
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
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    try:
        sup_uuid = uuid.UUID(req.supplier_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid supplier UUID format")

    # Fetch supplier user
    sup_res = await db.execute(
        select(User).options(selectinload(User.company).selectinload(Company.addresses)).where(User.id == sup_uuid)
    )
    supplier = sup_res.scalars().first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Vendor company
    v_comp_res = await db.execute(
        select(Company).options(selectinload(Company.addresses)).where(Company.id == current_user.company_id)
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

    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Vendor user must belong to a company to place orders")
    if not supplier.company_id:
        raise HTTPException(status_code=400, detail="Supplier user must belong to a company to receive orders")

    v_address_line = "45, MG Road, Coimbatore, Tamil Nadu - 641001"
    if vendor_company and vendor_company.addresses:
        v_address_line = vendor_company.addresses[0].address_line

    new_order = OrderRequest(
        vendor_company_id=current_user.company_id,
        supplier_company_id=supplier.company_id,
        created_by_user_id=current_user.id,
        title=req.title,
        description=req.description,
        quantity=total_qty,
        unit=req.items[0].unit if (req.items and len(req.items) > 0 and req.items[0].unit) else "kg",
        estimated_price=Decimal(str(total_price)) if total_price > 0 else None,
        delivery_date=parsed_date,
        delivery_address=req.delivery_address or v_address_line,
        priority=(req.priority or "medium").lower(),
        status="pending",
    )
    db.add(new_order)
    await db.flush()

    # Initial status history record
    init_history = OrderStatusHistory(
        order_request_id=new_order.id,
        from_status=None,
        to_status="pending",
        changed_by_user_id=current_user.id,
        note="Order placed by vendor",
    )
    db.add(init_history)

    # Add items with snapshots
    if req.items:
        for item in req.items:
            prod_uuid = None
            if item.product_id:
                try:
                    prod_uuid = uuid.UUID(item.product_id)
                except ValueError:
                    prod_uuid = None
            item_est = Decimal(str(item.estimated_price)) if item.estimated_price is not None else None
            db_item = OrderRequestItem(
                order_request_id=new_order.id,
                product_id=prod_uuid,
                product_name=item.product_name,
                product_name_snapshot=item.product_name,
                quantity=item.quantity,
                unit=item.unit or "kg",
                unit_price=item_est,
                estimated_price=item_est,
                notes=item.notes,
            )
            db.add(db_item)

    await db.commit()

    # Fetch loaded order with items & history
    ord_res = await db.execute(
        select(OrderRequest)
        .options(
            selectinload(OrderRequest.items),
            selectinload(OrderRequest.status_history).selectinload(OrderStatusHistory.changed_by_user),
            selectinload(OrderRequest.vendor_company).selectinload(Company.addresses),
            selectinload(OrderRequest.supplier_company).selectinload(Company.addresses),
        )
        .where(OrderRequest.id == new_order.id)
    )
    loaded_order = ord_res.scalars().first()

    vendor_city = vendor_company.addresses[0].city if (vendor_company and vendor_company.addresses) else "Coimbatore"
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
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(OrderRequest)
        .options(
            selectinload(OrderRequest.items),
            selectinload(OrderRequest.status_history).selectinload(OrderStatusHistory.changed_by_user),
            selectinload(OrderRequest.vendor_company).selectinload(Company.addresses),
            selectinload(OrderRequest.supplier_company).selectinload(Company.addresses),
        )
        .where(OrderRequest.supplier_company_id == current_user.company_id, OrderRequest.is_deleted == False)
    )

    if status_filter and status_filter.lower() != "all":
        target_status = OrderLifecycleService.normalize_status(status_filter)
        if target_status == "processing":
            stmt = stmt.where(func.lower(OrderRequest.status).in_(["processing", "in_progress"]))
        else:
            stmt = stmt.where(func.lower(OrderRequest.status) == target_status)

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

    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar_one()

    stmt = stmt.offset((page - 1) * limit).limit(limit)
    res = await db.execute(stmt)
    orders = res.scalars().all()

    formatted = []
    for o in orders:
        v_res = await db.execute(
            select(User).options(selectinload(User.company).selectinload(Company.addresses)).where(User.id == o.created_by_user_id)
        )
        vendor_user = v_res.scalars().first()
        formatted.append(format_order_response(o, vendor_user, current_user))

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
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(OrderRequest)
        .options(
            selectinload(OrderRequest.items),
            selectinload(OrderRequest.status_history).selectinload(OrderStatusHistory.changed_by_user),
            selectinload(OrderRequest.vendor_company).selectinload(Company.addresses),
            selectinload(OrderRequest.supplier_company).selectinload(Company.addresses),
        )
        .where(OrderRequest.vendor_company_id == current_user.company_id, OrderRequest.is_deleted == False)
    )

    if status_filter and status_filter.lower() != "all":
        target_status = OrderLifecycleService.normalize_status(status_filter)
        if target_status == "processing":
            stmt = stmt.where(func.lower(OrderRequest.status).in_(["processing", "in_progress"]))
        else:
            stmt = stmt.where(func.lower(OrderRequest.status) == target_status)

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
            select(User).options(selectinload(User.company).selectinload(Company.addresses)).where(User.company_id == o.supplier_company_id)
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
    user_filter = OrderRequest.supplier_company_id == current_user.company_id if is_supplier else OrderRequest.vendor_company_id == current_user.company_id

    total_stmt = select(func.count(OrderRequest.id)).where(user_filter, OrderRequest.is_deleted == False)
    pending_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "pending", OrderRequest.is_deleted == False)
    accepted_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "accepted", OrderRequest.is_deleted == False)
    processing_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status).in_(["processing", "in_progress"]), OrderRequest.is_deleted == False)
    packed_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "packed", OrderRequest.is_deleted == False)
    shipped_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "shipped", OrderRequest.is_deleted == False)
    delivered_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "delivered", OrderRequest.is_deleted == False)
    completed_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "completed", OrderRequest.is_deleted == False)
    rejected_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "rejected", OrderRequest.is_deleted == False)
    cancelled_stmt = select(func.count(OrderRequest.id)).where(user_filter, func.lower(OrderRequest.status) == "cancelled", OrderRequest.is_deleted == False)

    total_orders = (await db.execute(total_stmt)).scalar_one()
    pending_orders = (await db.execute(pending_stmt)).scalar_one()
    accepted_orders = (await db.execute(accepted_stmt)).scalar_one()
    processing_orders = (await db.execute(processing_stmt)).scalar_one()
    packed_orders = (await db.execute(packed_stmt)).scalar_one()
    shipped_orders = (await db.execute(shipped_stmt)).scalar_one()
    delivered_orders = (await db.execute(delivered_stmt)).scalar_one()
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
            "processing_orders": processing_orders,
            "in_progress_orders": processing_orders,
            "packed_orders": packed_orders,
            "shipped_orders": shipped_orders,
            "delivered_orders": delivered_orders,
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
        ord_uuid = None

    if ord_uuid:
        stmt = (
            select(OrderRequest)
            .options(
                selectinload(OrderRequest.items),
                selectinload(OrderRequest.status_history).selectinload(OrderStatusHistory.changed_by_user),
                selectinload(OrderRequest.vendor_company).selectinload(Company.addresses),
                selectinload(OrderRequest.supplier_company).selectinload(Company.addresses),
            )
            .where(OrderRequest.id == ord_uuid, OrderRequest.is_deleted == False)
        )
    else:
        stmt = (
            select(OrderRequest)
            .options(
                selectinload(OrderRequest.items),
                selectinload(OrderRequest.status_history).selectinload(OrderStatusHistory.changed_by_user),
                selectinload(OrderRequest.vendor_company).selectinload(Company.addresses),
                selectinload(OrderRequest.supplier_company).selectinload(Company.addresses),
            )
            .where(
                OrderRequest.id.cast(String).ilike(f"%{order_id}%"),
                OrderRequest.is_deleted == False,
            )
        )

    res = await db.execute(stmt)
    order = res.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order request not found")

    user_role = current_user.role.name.lower() if current_user.role else "vendor"
    if user_role != "admin" and current_user.company_id not in (order.vendor_company_id, order.supplier_company_id):
        raise HTTPException(status_code=403, detail="You do not have permission to view this order")

    v_res = await db.execute(
        select(User).options(selectinload(User.company).selectinload(Company.addresses)).where(User.id == order.created_by_user_id)
    )
    vendor_user = v_res.scalars().first()

    s_res = await db.execute(
        select(User).options(selectinload(User.company).selectinload(Company.addresses)).where(User.company_id == order.supplier_company_id)
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
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db),
):
    try:
        ord_uuid = uuid.UUID(order_id)
    except ValueError:
        # Search by substring if raw string ID passed
        ord_stmt = select(OrderRequest.id).where(
            OrderRequest.id.cast(String).ilike(f"%{order_id}%"),
            OrderRequest.is_deleted == False,
        )
        ord_res = await db.execute(ord_stmt)
        ord_uuid = ord_res.scalar_one_or_none()
        if not ord_uuid:
            raise HTTPException(status_code=404, detail="Order request not found")

    action_lower = req.action.lower()
    target_status = "accepted" if action_lower in ["accept", "accepted"] else "rejected"
    if action_lower == "suggest":
        target_status = "accepted"  # Suggest note handled via accept note

    lifecycle_svc = OrderLifecycleService(db)
    try:
        order = await lifecycle_svc.transition_order_status(
            order_id=ord_uuid,
            target_status_raw=target_status,
            current_user=current_user,
            note=req.response_note,
        )
    except (NotFoundException, ConflictException, PermissionDeniedException, BadRequestException) as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return {
        "success": True,
        "message": f"Order {order.status}! Counterparty has been notified.",
        "data": {
            "id": str(order.id),
            "status": order.status,
            "supplier_response": order.supplier_response,
            "responded_at": order.responded_at.isoformat() if order.responded_at else None,
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
    except ValueError:
        ord_stmt = select(OrderRequest.id).where(
            OrderRequest.id.cast(String).ilike(f"%{order_id}%"),
            OrderRequest.is_deleted == False,
        )
        ord_res = await db.execute(ord_stmt)
        ord_uuid = ord_res.scalar_one_or_none()
        if not ord_uuid:
            raise HTTPException(status_code=404, detail="Order request not found")

    parsed_delivery_date = None
    if req.delivery_date:
        try:
            parsed_delivery_date = datetime.strptime(req.delivery_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    lifecycle_svc = OrderLifecycleService(db)
    try:
        order = await lifecycle_svc.transition_order_status(
            order_id=ord_uuid,
            target_status_raw=req.status,
            current_user=current_user,
            note=req.note,
            delivery_date=parsed_delivery_date,
        )
    except (NotFoundException, ConflictException, PermissionDeniedException, BadRequestException) as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return {
        "success": True,
        "message": f"Order status updated to {order.status}",
        "data": {
            "id": str(order.id),
            "status": order.status,
            "supplier_response": order.supplier_response,
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
