import math
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.api.v1.deps import get_current_active_user, verify_vendor
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.address import Address
from app.models.order_request import OrderRequest

router = APIRouter()

@router.get("")
async def list_suppliers(
    search: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    business_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    # Query users with supplier role
    stmt = (
        select(User)
        .join(Role, User.role_id == Role.id)
        .outerjoin(Company, User.company_id == Company.id)
        .outerjoin(Address, Company.id == Address.company_id)
        .where(Role.name == "supplier", User.is_active == True)
        .options(selectinload(User.company).selectinload(Company.addresses))
    )

    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Company.company_name.ilike(search_pattern),
                Company.business_type.ilike(search_pattern),
                Company.description.ilike(search_pattern),
                Address.city.ilike(search_pattern),
                Address.state.ilike(search_pattern),
            )
        )

    if city:
        stmt = stmt.where(Address.city.ilike(f"%{city}%"))

    if state:
        stmt = stmt.where(Address.state.ilike(f"%{state}%"))

    if business_type:
        stmt = stmt.where(Company.business_type.ilike(f"%{business_type}%"))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total_suppliers = total_result.scalar_one()

    # Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    supplier_users = result.scalars().all()

    formatted = []
    for s in supplier_users:
        comp = s.company
        addr = comp.address if comp else None

        orders_count_stmt = select(func.count(OrderRequest.id)).where(
            OrderRequest.supplier_company_id == s.company_id, OrderRequest.status == "completed"
        )
        orders_res = await db.execute(orders_count_stmt)
        total_orders = orders_res.scalar_one_or_none() or 0

        formatted.append({
            "id": str(s.id),
            "full_name": s.full_name,
            "company_name": comp.company_name if comp else s.full_name,
            "business_type": comp.business_type if comp else "Wholesale Distributor",
            "description": comp.description if comp else "Verified wholesale supplier network merchant.",
            "logo_url": comp.logo_url if comp else None,
            "city": addr.city if addr else "Bengaluru",
            "state": addr.state if addr else "Karnataka",
            "country": addr.country if addr else "India",
            "rating": 4.9,
            "total_orders": total_orders,
            "joined_date": s.last_login_at.isoformat() if s.last_login_at else None,
        })

    total_pages = math.ceil(total_suppliers / limit) if total_suppliers > 0 else 1

    return {
        "success": True,
        "data": {
            "suppliers": formatted,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_suppliers,
                "total_pages": total_pages,
            },
        },
    }


@router.get("/{supplier_id}")
async def get_supplier_details(
    supplier_id: str,
    current_user: User = Depends(verify_vendor),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(User)
        .options(selectinload(User.company).selectinload(Company.addresses))
        .where(User.id == supplier_id)
    )
    res = await db.execute(stmt)
    supplier = res.scalars().first()

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    comp = supplier.company
    addr = comp.address if comp else None

    orders_count_stmt = select(func.count(OrderRequest.id)).where(
        OrderRequest.supplier_company_id == supplier.company_id
    )
    orders_res = await db.execute(orders_count_stmt)
    total_orders = orders_res.scalar_one_or_none() or 0

    return {
        "success": True,
        "data": {
            "id": str(supplier.id),
            "company_name": comp.company_name if comp else supplier.full_name,
            "business_type": comp.business_type if comp else "Distributor",
            "description": comp.description if comp else "Verified wholesale supplier",
            "contact_person": supplier.full_name,
            "email": supplier.email,
            "phone": supplier.phone,
            "city": addr.city if addr else "Bengaluru",
            "state": addr.state if addr else "Karnataka",
            "country": addr.country if addr else "India",
            "full_address": addr.address_line if addr else "Koramangala, Bengaluru",
            "gst_number": comp.gst_number if comp else None,
            "logo_url": comp.logo_url if comp else None,
            "rating": 4.9,
            "total_orders": total_orders,
            "joined_date": supplier.last_login_at.isoformat() if supplier.last_login_at else None,
        },
    }
