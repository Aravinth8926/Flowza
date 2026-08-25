from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import DateRangePreset
from app.core.exceptions import PermissionDeniedException


def _parse_preset(preset_str: Optional[str]) -> DateRangePreset:
    preset_map = {
        "7d": DateRangePreset.LAST_7_DAYS,
        "30d": DateRangePreset.LAST_30_DAYS,
        "month": DateRangePreset.THIS_MONTH,
        "last_month": DateRangePreset.LAST_MONTH,
        "quarter": DateRangePreset.THIS_QUARTER,
        "year": DateRangePreset.THIS_YEAR,
        "all": DateRangePreset.ALL_TIME,
    }
    return preset_map.get(str(preset_str).lower(), DateRangePreset.LAST_30_DAYS)


async def get_supplier_overview(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve high-level business performance, sales, and order KPIs for the supplier's company."""
    if current_user.role.name != "supplier" or not current_user.company_id:
        raise PermissionDeniedException("Only supplier users can access supplier overview analytics.")
    
    preset = _parse_preset(arguments.get("date_range", "30d"))
    service = AnalyticsService(db)
    res = await service.get_supplier_overview(current_user.company_id, preset=preset)
    return res.model_dump(mode="json")


async def get_vendor_overview(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve procurement spend, supplier count, and purchase order KPIs for the vendor's company."""
    if current_user.role.name != "vendor" or not current_user.company_id:
        raise PermissionDeniedException("Only vendor users can access vendor procurement analytics.")
    
    preset = _parse_preset(arguments.get("date_range", "30d"))
    service = AnalyticsService(db)
    res = await service.get_vendor_overview(current_user.company_id, preset=preset)
    return res.model_dump(mode="json")


async def get_admin_overview(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve platform-wide trade volume, user growth, and operational health metrics."""
    if current_user.role.name != "admin":
        raise PermissionDeniedException("Only platform administrators can access admin platform analytics.")
    
    preset = _parse_preset(arguments.get("date_range", "30d"))
    service = AnalyticsService(db)
    res = await service.get_admin_overview(preset=preset)
    return res.model_dump(mode="json")


async def get_top_products(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve top-selling products by units and revenue for the authenticated supplier."""
    if current_user.role.name != "supplier" or not current_user.company_id:
        raise PermissionDeniedException("Only supplier users can access top-selling product analytics.")
    
    limit = int(arguments.get("limit", 5))
    limit = max(1, min(limit, 20))
    preset = _parse_preset(arguments.get("date_range", "30d"))
    
    service = AnalyticsService(db)
    res = await service.get_supplier_top_products(current_user.company_id, preset=preset, limit=limit)
    return {"top_products": [p.model_dump(mode="json") for p in res.products]}


async def get_top_suppliers(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve top suppliers by procurement spend and order volume for the authenticated vendor."""
    if current_user.role.name != "vendor" or not current_user.company_id:
        raise PermissionDeniedException("Only vendor users can access supplier ranking analytics.")
    
    limit = int(arguments.get("limit", 5))
    limit = max(1, min(limit, 20))
    preset = _parse_preset(arguments.get("date_range", "30d"))
    
    service = AnalyticsService(db)
    res = await service.get_vendor_top_suppliers(current_user.company_id, preset=preset, limit=limit)
    return {"top_suppliers": [s.model_dump(mode="json") for s in res.suppliers]}
