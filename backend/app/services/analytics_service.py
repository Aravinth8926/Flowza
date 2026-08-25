import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.analytics_repo import AnalyticsRepository
from app.schemas.analytics import (
    DateRangePreset,
    SupplierOverviewResponse,
    SupplierKPIs,
    SupplierInventoryOverview,
    VendorOverviewResponse,
    VendorKPIs,
    AdminOverviewResponse,
    AdminKPIs,
    AdminOperationalHealth,
    TrendDataPoint,
    StatusCountItem,
    TopProductItem,
    TopSupplierItem,
    RecentOrderSummary,
    OutstandingInvoiceSummary,
    AttentionItem,
)
from app.core.exceptions import BadRequestException


def _calculate_trend_pct(current: Decimal | int | float, prior: Decimal | int | float) -> Optional[float]:
    c = float(current)
    p = float(prior)
    if p == 0:
        if c > 0:
            return 100.0
        return None
    return round(((c - p) / p) * 100.0, 1)


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AnalyticsRepository(db)

    def resolve_date_range(
        self,
        preset: Optional[DateRangePreset] = DateRangePreset.LAST_30_DAYS,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Tuple[Optional[date], Optional[date], Optional[date], Optional[date]]:
        """
        Resolves date range into (current_start, current_end, prior_start, prior_end).
        Supports presets: 7d, 30d, 3m, 6m, 12m, all, custom.
        """
        today = date.today()

        if preset == DateRangePreset.ALL:
            return None, None, None, None

        if preset == DateRangePreset.CUSTOM:
            if not start_date or not end_date:
                raise BadRequestException(detail="Both start_date and end_date are required for custom range.")
            if start_date > end_date:
                raise BadRequestException(detail="start_date cannot be later than end_date.")
            
            span_days = (end_date - start_date).days + 1
            prior_end = start_date - timedelta(days=1)
            prior_start = prior_end - timedelta(days=span_days - 1)
            return start_date, end_date, prior_start, prior_end

        days_map = {
            DateRangePreset.LAST_7_DAYS: 7,
            DateRangePreset.LAST_30_DAYS: 30,
            DateRangePreset.LAST_3_MONTHS: 90,
            DateRangePreset.LAST_6_MONTHS: 180,
            DateRangePreset.LAST_12_MONTHS: 365,
        }

        days = days_map.get(preset, 30)
        c_end = today
        c_start = today - timedelta(days=days - 1)
        
        p_end = c_start - timedelta(days=1)
        p_start = p_end - timedelta(days=days - 1)

        return c_start, c_end, p_start, p_end

    # =========================================================================
    # SUPPLIER SERVICE
    # =========================================================================

    async def get_supplier_overview(
        self,
        company_id: uuid.UUID,
        preset: Optional[DateRangePreset] = DateRangePreset.LAST_30_DAYS,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> SupplierOverviewResponse:
        c_start, c_end, p_start, p_end = self.resolve_date_range(preset, start_date, end_date)

        # 1. Current KPIs
        curr_kpis = await self.repo.get_supplier_kpis(company_id, c_start, c_end)

        # 2. Prior KPIs for period trend
        orders_trend = None
        invoiced_trend = None
        collected_trend = None
        if p_start and p_end:
            prior_kpis = await self.repo.get_supplier_kpis(company_id, p_start, p_end)
            orders_trend = _calculate_trend_pct(curr_kpis["total_orders"], prior_kpis["total_orders"])
            invoiced_trend = _calculate_trend_pct(curr_kpis["total_invoiced"], prior_kpis["total_invoiced"])
            collected_trend = _calculate_trend_pct(curr_kpis["total_collected"], prior_kpis["total_collected"])

        kpis = SupplierKPIs(
            total_orders=curr_kpis["total_orders"],
            active_orders=curr_kpis["active_orders"],
            completed_orders=curr_kpis["completed_orders"],
            total_invoiced=curr_kpis["total_invoiced"],
            total_collected=curr_kpis["total_collected"],
            outstanding_receivables=curr_kpis["outstanding_receivables"],
            low_stock_products_count=curr_kpis["low_stock_products_count"],
            out_of_stock_products_count=curr_kpis["out_of_stock_products_count"],
            orders_trend_pct=orders_trend,
            invoiced_trend_pct=invoiced_trend,
            collected_trend_pct=collected_trend,
        )

        # 3. Status distribution
        order_dist = await self.repo.get_supplier_order_distribution(company_id, c_start, c_end)

        # 4. Revenue trend (use default 30-day window if all)
        trend_start = c_start or (date.today() - timedelta(days=29))
        trend_end = c_end or date.today()
        trend = await self.repo.get_supplier_revenue_trend(company_id, trend_start, trend_end)

        # 5. Top products
        top_prods = await self.repo.get_supplier_top_products(company_id, c_start, c_end, limit=5)

        # 6. Inventory summary
        inv_summary = await self.repo.get_supplier_inventory_stats(company_id)

        # 7. Recent orders
        recent = await self.repo.get_supplier_recent_orders(company_id, limit=5)

        # 8. Attention items
        attention = await self.repo.get_supplier_attention_items(company_id)

        return SupplierOverviewResponse(
            kpis=kpis,
            order_status_distribution=[StatusCountItem(**d) for d in order_dist],
            revenue_trend=[TrendDataPoint(**t) for t in trend],
            top_products=[TopProductItem(**p) for p in top_prods],
            inventory_summary=SupplierInventoryOverview(**inv_summary),
            recent_orders=[RecentOrderSummary(**r) for r in recent],
            attention_items=[AttentionItem(**a) for a in attention],
        )

    # =========================================================================
    # VENDOR SERVICE
    # =========================================================================

    async def get_vendor_overview(
        self,
        company_id: uuid.UUID,
        preset: Optional[DateRangePreset] = DateRangePreset.LAST_30_DAYS,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> VendorOverviewResponse:
        c_start, c_end, p_start, p_end = self.resolve_date_range(preset, start_date, end_date)

        # 1. Current KPIs
        curr_kpis = await self.repo.get_vendor_kpis(company_id, c_start, c_end)

        # 2. Prior KPIs for period trend
        orders_trend = None
        procurement_trend = None
        if p_start and p_end:
            prior_kpis = await self.repo.get_vendor_kpis(company_id, p_start, p_end)
            orders_trend = _calculate_trend_pct(curr_kpis["total_orders"], prior_kpis["total_orders"])
            procurement_trend = _calculate_trend_pct(curr_kpis["total_procurement_value"], prior_kpis["total_procurement_value"])

        kpis = VendorKPIs(
            total_orders=curr_kpis["total_orders"],
            active_orders=curr_kpis["active_orders"],
            completed_orders=curr_kpis["completed_orders"],
            total_procurement_value=curr_kpis["total_procurement_value"],
            total_paid=curr_kpis["total_paid"],
            outstanding_payables=curr_kpis["outstanding_payables"],
            active_suppliers_count=curr_kpis["active_suppliers_count"],
            pending_deliveries=curr_kpis["pending_deliveries"],
            orders_trend_pct=orders_trend,
            procurement_trend_pct=procurement_trend,
        )

        # 3. Status distribution
        order_dist = await self.repo.get_vendor_order_distribution(company_id, c_start, c_end)

        # 4. Procurement trend
        trend_start = c_start or (date.today() - timedelta(days=29))
        trend_end = c_end or date.today()
        trend = await self.repo.get_vendor_procurement_trend(company_id, trend_start, trend_end)

        # 5. Top suppliers
        top_sups = await self.repo.get_vendor_top_suppliers(company_id, c_start, c_end, limit=5)

        # 6. Outstanding invoices
        outstanding_invs = await self.repo.get_vendor_outstanding_invoices(company_id, limit=5)

        # 7. Recent orders
        recent = await self.repo.get_vendor_recent_orders(company_id, limit=5)

        # 8. Attention items
        attention = await self.repo.get_vendor_attention_items(company_id)

        return VendorOverviewResponse(
            kpis=kpis,
            order_status_distribution=[StatusCountItem(**d) for d in order_dist],
            procurement_trend=[TrendDataPoint(**t) for t in trend],
            top_suppliers=[TopSupplierItem(**s) for s in top_sups],
            outstanding_invoices=[OutstandingInvoiceSummary(**i) for i in outstanding_invs],
            recent_orders=[RecentOrderSummary(**r) for r in recent],
            attention_items=[AttentionItem(**a) for a in attention],
        )

    # =========================================================================
    # ADMIN SERVICE
    # =========================================================================

    async def get_admin_overview(
        self,
        preset: Optional[DateRangePreset] = DateRangePreset.LAST_30_DAYS,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> AdminOverviewResponse:
        c_start, c_end, _, _ = self.resolve_date_range(preset, start_date, end_date)

        # 1. Admin KPIs
        kpis_data = await self.repo.get_admin_kpis(c_start, c_end)
        kpis = AdminKPIs(**kpis_data)

        # 2. Users & Companies Breakdown
        user_roles, comp_types = await self.repo.get_admin_user_company_breakdown()

        # 3. Status distribution
        order_dist = await self.repo.get_admin_order_distribution(c_start, c_end)

        # 4. Financial trend
        trend_start = c_start or (date.today() - timedelta(days=29))
        trend_end = c_end or date.today()
        trend = await self.repo.get_admin_financial_trend(trend_start, trend_end)

        # 5. Operational health
        health = await self.repo.get_admin_operational_health()

        # 6. Top active suppliers
        top_sups = await self.repo.get_admin_top_active_suppliers(limit=5)

        return AdminOverviewResponse(
            kpis=kpis,
            user_role_breakdown=user_roles,
            company_type_breakdown=comp_types,
            order_status_distribution=[StatusCountItem(**d) for d in order_dist],
            platform_financial_trend=[TrendDataPoint(**t) for t in trend],
            operational_health=AdminOperationalHealth(**health),
            top_active_suppliers=[TopSupplierItem(**s) for s in top_sups],
        )
