import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    DateRangePreset,
    SupplierOverviewResponse,
    VendorOverviewResponse,
    AdminOverviewResponse,
)
from app.core.exceptions import PermissionDeniedException, BadRequestException

router = APIRouter(prefix="/analytics", tags=["Dashboards & Analytics"])


def _verify_supplier(user: User) -> uuid.UUID:
    role_name = (user.role.name if user.role else "vendor").lower()
    if role_name not in ["supplier", "admin"]:
        raise PermissionDeniedException(detail="Supplier access required for this analytics dashboard.")
    if not user.company_id and role_name != "admin":
        raise BadRequestException(detail="User must be associated with a supplier company.")
    return user.company_id


def _verify_vendor(user: User) -> uuid.UUID:
    role_name = (user.role.name if user.role else "vendor").lower()
    if role_name not in ["vendor", "admin"]:
        raise PermissionDeniedException(detail="Vendor access required for this analytics dashboard.")
    if not user.company_id and role_name != "admin":
        raise BadRequestException(detail="User must be associated with a vendor company.")
    return user.company_id


def _verify_admin(user: User):
    role_name = (user.role.name if user.role else "vendor").lower()
    if role_name != "admin":
        raise PermissionDeniedException(detail="Platform administrator access required.")


# =========================================================================
# SUPPLIER ANALYTICS ENDPOINTS
# =========================================================================

@router.get("/supplier/overview", response_model=dict)
async def get_supplier_overview(
    preset: Optional[DateRangePreset] = Query(DateRangePreset.LAST_30_DAYS),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authoritative Supplier Dashboard Overview:
    KPIs, revenue trend, order status distribution, top products, inventory alerts, and recent orders.
    Tenant isolation is strictly enforced to current user's supplier company.
    """
    company_id = _verify_supplier(current_user)
    svc = AnalyticsService(db)
    overview = await svc.get_supplier_overview(
        company_id=company_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
    return {
        "success": True,
        "data": overview.model_dump(),
    }


# =========================================================================
# VENDOR ANALYTICS ENDPOINTS
# =========================================================================

@router.get("/vendor/overview", response_model=dict)
async def get_vendor_overview(
    preset: Optional[DateRangePreset] = Query(DateRangePreset.LAST_30_DAYS),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authoritative Vendor Dashboard Overview:
    KPIs, procurement spend trend, order status distribution, top suppliers, outstanding bills, and recent orders.
    Tenant isolation is strictly enforced to current user's vendor company.
    """
    company_id = _verify_vendor(current_user)
    svc = AnalyticsService(db)
    overview = await svc.get_vendor_overview(
        company_id=company_id,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
    return {
        "success": True,
        "data": overview.model_dump(),
    }


# =========================================================================
# ADMIN PLATFORM ANALYTICS ENDPOINTS
# =========================================================================

@router.get("/admin/overview", response_model=dict)
async def get_admin_overview(
    preset: Optional[DateRangePreset] = Query(DateRangePreset.LAST_30_DAYS),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Platform Administration Overview:
    Aggregate platform volume, active user/company counts, system-wide order lifecycle states, and operational health.
    Strictly restricted to Platform Admin role.
    """
    _verify_admin(current_user)
    svc = AnalyticsService(db)
    overview = await svc.get_admin_overview(
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
    return {
        "success": True,
        "data": overview.model_dump(),
    }
