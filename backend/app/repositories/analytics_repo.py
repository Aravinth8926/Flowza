import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    cast,
    Date,
    select,
    func,
    case,
    and_,
    or_,
    desc,
    asc,
    distinct,
)
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.order_status_history import OrderStatusHistory
from app.models.invoice import Invoice, InvoiceItem, PaymentRecord

ALL_ORDER_STATUSES = [
    "pending",
    "accepted",
    "processing",
    "packed",
    "shipped",
    "delivered",
    "completed",
    "rejected",
    "cancelled",
]

ACTIVE_ORDER_STATUSES = [
    "pending",
    "accepted",
    "processing",
    "packed",
    "shipped",
    "delivered",
]

COMPLETED_ORDER_STATUS = "completed"
EXCLUDED_FROM_SALES = ["rejected", "cancelled"]


def _quantize(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    try:
        return Decimal(str(val)).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")



def _to_date_obj(d: Any) -> Optional[date]:
    if not d:
        return None
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        try:
            return datetime.strptime(d[:10], "%Y-%m-%d").date()
        except Exception:
            return None
    return None

def _format_date_str(d: Any) -> Optional[str]:
    if not d:
        return None
    if hasattr(d, "strftime"):
        return d.strftime("%Y-%m-%d")
    return str(d)[:10]


class AnalyticsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # SUPPLIER ANALYTICS
    # =========================================================================

    async def get_supplier_kpis(
        self,
        company_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Compute authoritative KPIs for a specific supplier company."""
        # 1. Orders aggregations
        order_filters = [
            OrderRequest.supplier_company_id == company_id,
            OrderRequest.is_deleted == False,
        ]
        if start_date:
            order_filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            order_filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        order_stmt = select(
            func.count(OrderRequest.id).label("total_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status).in_(ACTIVE_ORDER_STATUSES), 1),
                    else_=None,
                )
            ).label("active_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status) == COMPLETED_ORDER_STATUS, 1),
                    else_=None,
                )
            ).label("completed_orders"),
        ).where(and_(*order_filters))

        order_res = (await self.db.execute(order_stmt)).mappings().one()

        # 2. Invoices & Receivables aggregations
        inv_filters = [
            Invoice.supplier_company_id == company_id,
            Invoice.is_deleted == False,
        ]
        if start_date:
            inv_filters.append(cast(Invoice.invoice_date, Date) >= _to_date_obj(start_date))
        if end_date:
            inv_filters.append(cast(Invoice.invoice_date, Date) <= _to_date_obj(end_date))

        inv_stmt = select(
            func.coalesce(func.sum(Invoice.total_amount), 0).label("total_invoiced"),
            func.coalesce(func.sum(Invoice.paid_amount), 0).label("total_collected"),
        ).where(and_(*inv_filters))

        inv_res = (await self.db.execute(inv_stmt)).mappings().one()

        total_invoiced = _quantize(inv_res["total_invoiced"])
        total_collected = _quantize(inv_res["total_collected"])
        outstanding = max(Decimal("0.00"), total_invoiced - total_collected)

        # 3. Stock threshold counts (Snapshot across active products)
        inv_stock_stmt = select(
            func.count(
                case(
                    (
                        and_(
                            (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= Inventory.reorder_level,
                            (Inventory.quantity_on_hand - Inventory.quantity_reserved) > 0,
                        ),
                        1,
                    ),
                    else_=None,
                )
            ).label("low_stock_count"),
            func.count(
                case(
                    (
                        (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= 0,
                        1,
                    ),
                    else_=None,
                )
            ).label("out_of_stock_count"),
        ).select_from(Inventory).join(Product, Inventory.product_id == Product.id).where(
            Product.company_id == company_id,
            Product.is_deleted == False,
            Product.is_active == True,
        )

        stock_res = (await self.db.execute(inv_stock_stmt)).mappings().one()

        return {
            "total_orders": order_res["total_orders"] or 0,
            "active_orders": order_res["active_orders"] or 0,
            "completed_orders": order_res["completed_orders"] or 0,
            "total_invoiced": total_invoiced,
            "total_collected": total_collected,
            "outstanding_receivables": outstanding,
            "low_stock_products_count": stock_res["low_stock_count"] or 0,
            "out_of_stock_products_count": stock_res["out_of_stock_count"] or 0,
        }

    async def get_supplier_order_distribution(
        self,
        company_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """Order lifecycle status breakdown for supplier."""
        filters = [
            OrderRequest.supplier_company_id == company_id,
            OrderRequest.is_deleted == False,
        ]
        if start_date:
            filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        stmt = select(
            func.lower(OrderRequest.status).label("status"),
            func.count(OrderRequest.id).label("count"),
        ).where(and_(*filters)).group_by(func.lower(OrderRequest.status))

        res = (await self.db.execute(stmt)).all()
        counts_map = {row.status: row.count for row in res}
        total = sum(counts_map.values())

        distribution = []
        for s in ALL_ORDER_STATUSES:
            count = counts_map.get(s, 0)
            pct = round((count / total * 100.0), 1) if total > 0 else 0.0
            distribution.append({
                "status": s.upper(),
                "count": count,
                "percentage": pct,
            })
        return distribution

    async def get_supplier_revenue_trend(
        self,
        company_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> List[Dict[str, Any]]:
        """Daily/periodic trend of invoiced and collected amounts."""
        s_str = start_date.strftime("%Y-%m-%d")
        e_str = end_date.strftime("%Y-%m-%d")

        # Query daily invoices
        inv_stmt = select(
            cast(Invoice.invoice_date, Date).label("inv_date"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("invoiced"),
            func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
            func.count(Invoice.id).label("invoice_count"),
        ).where(
            Invoice.supplier_company_id == company_id,
            Invoice.is_deleted == False,
            cast(Invoice.invoice_date, Date) >= _to_date_obj(start_date),
            cast(Invoice.invoice_date, Date) <= _to_date_obj(end_date),
        ).group_by(cast(Invoice.invoice_date, Date)).order_by(cast(Invoice.invoice_date, Date).asc())

        inv_rows = (await self.db.execute(inv_stmt)).all()
        inv_map = {
            _format_date_str(row.inv_date): {
                "invoiced": _quantize(row.invoiced),
                "collected": _quantize(row.collected),
                "count": row.invoice_count,
            }
            for row in inv_rows if row.inv_date
        }

        # Query daily order counts
        ord_stmt = select(
            cast(OrderRequest.created_at, Date).label("ord_date"),
            func.count(OrderRequest.id).label("order_count"),
        ).where(
            OrderRequest.supplier_company_id == company_id,
            OrderRequest.is_deleted == False,
            cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date),
            cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date),
        ).group_by(cast(OrderRequest.created_at, Date))

        ord_rows = (await self.db.execute(ord_stmt)).all()
        ord_map = {
            _format_date_str(row.ord_date): row.order_count
            for row in ord_rows if row.ord_date
        }

        # Construct continuous timeline
        trend_points = []
        curr = start_date
        while curr <= end_date:
            d_str = curr.strftime("%Y-%m-%d")
            inv_data = inv_map.get(d_str, {"invoiced": Decimal("0.00"), "collected": Decimal("0.00"), "count": 0})
            ord_count = ord_map.get(d_str, 0)
            trend_points.append({
                "date": d_str,
                "invoiced_amount": inv_data["invoiced"],
                "collected_amount": inv_data["collected"],
                "order_count": ord_count,
                "procurement_value": Decimal("0.00"),
            })
            curr += timedelta(days=1)

        return trend_points

    async def get_supplier_top_products(
        self,
        company_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Top products ranked by units sold on non-cancelled/rejected orders."""
        filters = [
            OrderRequest.supplier_company_id == company_id,
            OrderRequest.is_deleted == False,
            func.lower(OrderRequest.status).notin_(EXCLUDED_FROM_SALES),
            OrderRequestItem.is_deleted == False,
        ]
        if start_date:
            filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        stmt = select(
            OrderRequestItem.product_id,
            func.coalesce(
                OrderRequestItem.product_name_snapshot,
                OrderRequestItem.product_name,
            ).label("p_name"),
            func.coalesce(OrderRequestItem.sku_snapshot, Product.sku).label("p_sku"),
            Product.category.label("p_category"),
            func.sum(OrderRequestItem.quantity).label("units_sold"),
            func.coalesce(func.sum(OrderRequestItem.unit_price * OrderRequestItem.quantity), 0).label("revenue"),
            func.count(distinct(OrderRequest.id)).label("order_count"),
        ).select_from(OrderRequestItem).join(
            OrderRequest, OrderRequestItem.order_request_id == OrderRequest.id
        ).outerjoin(
            Product, OrderRequestItem.product_id == Product.id
        ).where(and_(*filters)).group_by(
            OrderRequestItem.product_id,
            func.coalesce(OrderRequestItem.product_name_snapshot, OrderRequestItem.product_name),
            func.coalesce(OrderRequestItem.sku_snapshot, Product.sku),
            Product.category,
        ).order_by(desc("units_sold"), desc("revenue")).limit(limit)

        rows = (await self.db.execute(stmt)).all()
        return [
            {
                "product_id": r.product_id,
                "product_name": r.p_name,
                "sku": r.p_sku,
                "category": r.p_category,
                "total_units_sold": int(r.units_sold or 0),
                "total_revenue": _quantize(r.revenue),
                "order_count": int(r.order_count or 0),
            }
            for r in rows
        ]

    async def get_supplier_inventory_stats(self, company_id: uuid.UUID) -> Dict[str, Any]:
        """Comprehensive warehouse inventory statistics."""
        stmt = select(
            func.count(Product.id).label("total_products"),
            func.coalesce(func.sum(Inventory.quantity_on_hand), 0).label("on_hand"),
            func.coalesce(func.sum(Inventory.quantity_reserved), 0).label("reserved"),
            func.count(
                case(
                    (
                        (Inventory.quantity_on_hand - Inventory.quantity_reserved) > Inventory.reorder_level,
                        1,
                    ),
                    else_=None,
                )
            ).label("in_stock"),
            func.count(
                case(
                    (
                        and_(
                            (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= Inventory.reorder_level,
                            (Inventory.quantity_on_hand - Inventory.quantity_reserved) > 0,
                        ),
                        1,
                    ),
                    else_=None,
                )
            ).label("low_stock"),
            func.count(
                case(
                    (
                        (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= 0,
                        1,
                    ),
                    else_=None,
                )
            ).label("out_of_stock"),
        ).select_from(Product).join(
            Inventory, Product.id == Inventory.product_id
        ).where(
            Product.company_id == company_id,
            Product.is_deleted == False,
            Product.is_active == True,
        )

        res = (await self.db.execute(stmt)).mappings().one()
        on_hand = int(res["on_hand"] or 0)
        reserved = int(res["reserved"] or 0)

        return {
            "total_products": res["total_products"] or 0,
            "in_stock_count": res["in_stock"] or 0,
            "low_stock_count": res["low_stock"] or 0,
            "out_of_stock_count": res["out_of_stock"] or 0,
            "total_quantity_on_hand": on_hand,
            "total_quantity_reserved": reserved,
            "total_quantity_available": max(0, on_hand - reserved),
        }

    async def get_supplier_recent_orders(
        self,
        company_id: uuid.UUID,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Recent incoming orders for supplier."""
        stmt = select(OrderRequest).options(
            selectinload(OrderRequest.vendor_company),
            selectinload(OrderRequest.items),
        ).where(
            OrderRequest.supplier_company_id == company_id,
            OrderRequest.is_deleted == False,
        ).order_by(OrderRequest.created_at.desc()).limit(limit)

        orders = (await self.db.execute(stmt)).scalars().all()
        result = []
        for o in orders:
            item_preview = ", ".join([i.product_name for i in o.items[:2]])
            if len(o.items) > 2:
                item_preview += f" +{len(o.items) - 2} more"
            
            v_name = o.vendor_company.company_name if o.vendor_company else "Vendor"
            result.append({
                "id": o.id,
                "order_number": getattr(o, "order_number", None) or f"ORD-2026-{str(o.id)[:6].upper()}",
                "counterpart_company_name": v_name,
                "item_preview": item_preview or o.title,
                "total_amount": _quantize(o.estimated_price),
                "status": (o.status or "pending").upper(),
                "delivery_date": o.delivery_date,
                "created_at": o.created_at,
            })
        return result

    async def get_supplier_attention_items(self, company_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Actionable alert items for supplier."""
        items: List[Dict[str, Any]] = []

        # 1. Pending Orders requiring response
        pending_stmt = select(OrderRequest).where(
            OrderRequest.supplier_company_id == company_id,
            func.lower(OrderRequest.status) == "pending",
            OrderRequest.is_deleted == False,
        ).order_by(OrderRequest.created_at.asc()).limit(3)
        pending_orders = (await self.db.execute(pending_stmt)).scalars().all()

        for o in pending_orders:
            ord_num = getattr(o, "order_number", None) or f"ORD-2026-{str(o.id)[:6].upper()}"
            items.append({
                "id": f"PENDING_{o.id}",
                "type": "PENDING_ORDER",
                "title": "Pending Order Request",
                "message": f"Order {ord_num} ({_quantize(o.estimated_price)}) is awaiting your review and acceptance.",
                "severity": "urgent",
                "link": "/dashboard/supplier/orders/incoming",
                "entity_id": o.id,
            })

        # 2. Out of stock products
        oos_stmt = select(Product, Inventory).join(
            Inventory, Product.id == Inventory.product_id
        ).where(
            Product.company_id == company_id,
            Product.is_deleted == False,
            Product.is_active == True,
            (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= 0,
        ).limit(3)
        oos_rows = (await self.db.execute(oos_stmt)).all()

        for p, inv in oos_rows:
            items.append({
                "id": f"OOS_{p.id}",
                "type": "OUT_OF_STOCK",
                "title": "Product Out of Stock",
                "message": f"{p.name} has 0 available units. Restock required.",
                "severity": "urgent",
                "link": "/dashboard/supplier/inventory",
                "entity_id": p.id,
            })

        # 3. Low stock products
        low_stmt = select(Product, Inventory).join(
            Inventory, Product.id == Inventory.product_id
        ).where(
            Product.company_id == company_id,
            Product.is_deleted == False,
            Product.is_active == True,
            (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= Inventory.reorder_level,
            (Inventory.quantity_on_hand - Inventory.quantity_reserved) > 0,
        ).limit(3)
        low_rows = (await self.db.execute(low_stmt)).all()

        for p, inv in low_rows:
            avail = inv.quantity_on_hand - inv.quantity_reserved
            items.append({
                "id": f"LOW_{p.id}",
                "type": "LOW_STOCK",
                "title": "Low Stock Warning",
                "message": f"{p.name} has only {avail} units remaining (reorder level: {inv.reorder_level}).",
                "severity": "warning",
                "link": "/dashboard/supplier/inventory",
                "entity_id": p.id,
            })

        return items

    # =========================================================================
    # VENDOR ANALYTICS
    # =========================================================================

    async def get_vendor_kpis(
        self,
        company_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Compute authoritative KPIs for a specific vendor company."""
        # 1. Orders aggregations
        order_filters = [
            OrderRequest.vendor_company_id == company_id,
            OrderRequest.is_deleted == False,
        ]
        if start_date:
            order_filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            order_filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        order_stmt = select(
            func.count(OrderRequest.id).label("total_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status).in_(ACTIVE_ORDER_STATUSES), 1),
                    else_=None,
                )
            ).label("active_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status) == COMPLETED_ORDER_STATUS, 1),
                    else_=None,
                )
            ).label("completed_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status).in_(["shipped", "packed"]), 1),
                    else_=None,
                )
            ).label("pending_deliveries"),
            func.count(distinct(OrderRequest.supplier_company_id)).label("active_suppliers"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            func.lower(OrderRequest.status).notin_(EXCLUDED_FROM_SALES),
                            OrderRequest.estimated_price,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("total_procurement"),
        ).where(and_(*order_filters))

        order_res = (await self.db.execute(order_stmt)).mappings().one()

        # 2. Invoices & Payables aggregations
        inv_filters = [
            Invoice.vendor_company_id == company_id,
            Invoice.is_deleted == False,
        ]
        if start_date:
            inv_filters.append(cast(Invoice.invoice_date, Date) >= _to_date_obj(start_date))
        if end_date:
            inv_filters.append(cast(Invoice.invoice_date, Date) <= _to_date_obj(end_date))

        inv_stmt = select(
            func.coalesce(func.sum(Invoice.total_amount), 0).label("total_invoiced"),
            func.coalesce(func.sum(Invoice.paid_amount), 0).label("total_paid"),
        ).where(and_(*inv_filters))

        inv_res = (await self.db.execute(inv_stmt)).mappings().one()

        total_invoiced = _quantize(inv_res["total_invoiced"])
        total_paid = _quantize(inv_res["total_paid"])
        outstanding = max(Decimal("0.00"), total_invoiced - total_paid)

        return {
            "total_orders": order_res["total_orders"] or 0,
            "active_orders": order_res["active_orders"] or 0,
            "completed_orders": order_res["completed_orders"] or 0,
            "total_procurement_value": _quantize(order_res["total_procurement"]),
            "total_paid": total_paid,
            "outstanding_payables": outstanding,
            "active_suppliers_count": order_res["active_suppliers"] or 0,
            "pending_deliveries": order_res["pending_deliveries"] or 0,
        }

    async def get_vendor_order_distribution(
        self,
        company_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """Order lifecycle status breakdown for vendor."""
        filters = [
            OrderRequest.vendor_company_id == company_id,
            OrderRequest.is_deleted == False,
        ]
        if start_date:
            filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        stmt = select(
            func.lower(OrderRequest.status).label("status"),
            func.count(OrderRequest.id).label("count"),
        ).where(and_(*filters)).group_by(func.lower(OrderRequest.status))

        res = (await self.db.execute(stmt)).all()
        counts_map = {row.status: row.count for row in res}
        total = sum(counts_map.values())

        distribution = []
        for s in ALL_ORDER_STATUSES:
            count = counts_map.get(s, 0)
            pct = round((count / total * 100.0), 1) if total > 0 else 0.0
            distribution.append({
                "status": s.upper(),
                "count": count,
                "percentage": pct,
            })
        return distribution

    async def get_vendor_procurement_trend(
        self,
        company_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> List[Dict[str, Any]]:
        """Daily/periodic trend of vendor procurement spend and completed orders."""
        s_str = start_date.strftime("%Y-%m-%d")
        e_str = end_date.strftime("%Y-%m-%d")

        ord_stmt = select(
            cast(OrderRequest.created_at, Date).label("ord_date"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            func.lower(OrderRequest.status).notin_(EXCLUDED_FROM_SALES),
                            OrderRequest.estimated_price,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("procurement"),
            func.count(OrderRequest.id).label("order_count"),
        ).where(
            OrderRequest.vendor_company_id == company_id,
            OrderRequest.is_deleted == False,
            cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date),
            cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date),
        ).group_by(cast(OrderRequest.created_at, Date)).order_by(cast(OrderRequest.created_at, Date).asc())

        ord_rows = (await self.db.execute(ord_stmt)).all()
        ord_map = {
            _format_date_str(row.ord_date): {
                "procurement": _quantize(row.procurement),
                "order_count": row.order_count,
            }
            for row in ord_rows if row.ord_date
        }

        # Daily payment trend
        inv_stmt = select(
            cast(Invoice.invoice_date, Date).label("inv_date"),
            func.coalesce(func.sum(Invoice.paid_amount), 0).label("paid"),
        ).where(
            Invoice.vendor_company_id == company_id,
            Invoice.is_deleted == False,
            cast(Invoice.invoice_date, Date) >= _to_date_obj(start_date),
            cast(Invoice.invoice_date, Date) <= _to_date_obj(end_date),
        ).group_by(cast(Invoice.invoice_date, Date))

        inv_rows = (await self.db.execute(inv_stmt)).all()
        inv_map = {
            _format_date_str(row.inv_date): _quantize(row.paid)
            for row in inv_rows if row.inv_date
        }

        trend_points = []
        curr = start_date
        while curr <= end_date:
            d_str = curr.strftime("%Y-%m-%d")
            ord_data = ord_map.get(d_str, {"procurement": Decimal("0.00"), "order_count": 0})
            paid_amount = inv_map.get(d_str, Decimal("0.00"))
            trend_points.append({
                "date": d_str,
                "invoiced_amount": Decimal("0.00"),
                "collected_amount": paid_amount,
                "order_count": ord_data["order_count"],
                "procurement_value": ord_data["procurement"],
            })
            curr += timedelta(days=1)

        return trend_points

    async def get_vendor_top_suppliers(
        self,
        company_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Top supplier partners ranked by procurement spend."""
        filters = [
            OrderRequest.vendor_company_id == company_id,
            OrderRequest.is_deleted == False,
            func.lower(OrderRequest.status).notin_(EXCLUDED_FROM_SALES),
        ]
        if start_date:
            filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        stmt = select(
            OrderRequest.supplier_company_id,
            Company.company_name.label("supplier_name"),
            Company.business_type,
            func.coalesce(func.sum(OrderRequest.estimated_price), 0).label("spend"),
            func.count(OrderRequest.id).label("total_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status) == COMPLETED_ORDER_STATUS, 1),
                    else_=None,
                )
            ).label("completed_orders"),
        ).select_from(OrderRequest).join(
            Company, OrderRequest.supplier_company_id == Company.id
        ).where(and_(*filters)).group_by(
            OrderRequest.supplier_company_id,
            Company.company_name,
            Company.business_type,
        ).order_by(desc("spend")).limit(limit)

        rows = (await self.db.execute(stmt)).all()
        return [
            {
                "supplier_company_id": r.supplier_company_id,
                "supplier_name": r.supplier_name,
                "business_type": r.business_type,
                "total_spend": _quantize(r.spend),
                "total_orders": int(r.total_orders or 0),
                "completed_orders": int(r.completed_orders or 0),
            }
            for r in rows
        ]

    async def get_vendor_outstanding_invoices(
        self,
        company_id: uuid.UUID,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Top outstanding bills awaiting vendor payment."""
        stmt = select(Invoice).options(
            selectinload(Invoice.supplier_company),
        ).where(
            Invoice.vendor_company_id == company_id,
            Invoice.is_deleted == False,
            func.lower(Invoice.payment_status) != "paid",
        ).order_by(Invoice.due_date.asc().nulls_last(), Invoice.created_at.desc()).limit(limit)

        invoices = (await self.db.execute(stmt)).scalars().all()
        result = []
        for inv in invoices:
            s_name = inv.supplier_company.company_name if inv.supplier_company else "Supplier"
            balance = max(Decimal("0.00"), inv.total_amount - inv.paid_amount)
            result.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "counterpart_company_name": s_name,
                "total_amount": _quantize(inv.total_amount),
                "paid_amount": _quantize(inv.paid_amount),
                "balance_due": balance,
                "payment_status": (inv.payment_status or "unpaid").upper(),
                "due_date": inv.due_date,
                "created_at": inv.created_at,
            })
        return result

    async def get_vendor_recent_orders(
        self,
        company_id: uuid.UUID,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Recent procurement orders placed by vendor."""
        stmt = select(OrderRequest).options(
            selectinload(OrderRequest.supplier_company),
            selectinload(OrderRequest.items),
        ).where(
            OrderRequest.vendor_company_id == company_id,
            OrderRequest.is_deleted == False,
        ).order_by(OrderRequest.created_at.desc()).limit(limit)

        orders = (await self.db.execute(stmt)).scalars().all()
        result = []
        for o in orders:
            item_preview = ", ".join([i.product_name for i in o.items[:2]])
            if len(o.items) > 2:
                item_preview += f" +{len(o.items) - 2} more"
            
            s_name = o.supplier_company.company_name if o.supplier_company else "Supplier"
            result.append({
                "id": o.id,
                "order_number": getattr(o, "order_number", None) or f"ORD-2026-{str(o.id)[:6].upper()}",
                "counterpart_company_name": s_name,
                "item_preview": item_preview or o.title,
                "total_amount": _quantize(o.estimated_price),
                "status": (o.status or "pending").upper(),
                "delivery_date": o.delivery_date,
                "created_at": o.created_at,
            })
        return result

    async def get_vendor_attention_items(self, company_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Actionable alert items for vendor."""
        items: List[Dict[str, Any]] = []

        # 1. Orders delivered and awaiting completion confirmation
        del_stmt = select(OrderRequest).where(
            OrderRequest.vendor_company_id == company_id,
            func.lower(OrderRequest.status) == "delivered",
            OrderRequest.is_deleted == False,
        ).order_by(OrderRequest.created_at.asc()).limit(3)
        del_orders = (await self.db.execute(del_stmt)).scalars().all()

        for o in del_orders:
            ord_num = getattr(o, "order_number", None) or f"ORD-2026-{str(o.id)[:6].upper()}"
            items.append({
                "id": f"DELIVERED_{o.id}",
                "type": "DELIVERY_CONFIRMATION",
                "title": "Goods Delivered — Action Required",
                "message": f"Order {ord_num} has arrived. Please inspect and mark as completed.",
                "severity": "urgent",
                "link": "/dashboard/vendor/orders",
                "entity_id": o.id,
            })

        # 2. Overdue/Unpaid invoices
        unpaid_stmt = select(Invoice).options(
            selectinload(Invoice.supplier_company),
        ).where(
            Invoice.vendor_company_id == company_id,
            Invoice.is_deleted == False,
            func.lower(Invoice.payment_status) != "paid",
        ).order_by(Invoice.due_date.asc().nulls_last()).limit(3)
        unpaid_invoices = (await self.db.execute(unpaid_stmt)).scalars().all()

        for inv in unpaid_invoices:
            s_name = inv.supplier_company.company_name if inv.supplier_company else "Supplier"
            bal = max(Decimal("0.00"), inv.total_amount - inv.paid_amount)
            items.append({
                "id": f"UNPAID_INV_{inv.id}",
                "type": "UNPAID_INVOICE",
                "title": f"Outstanding Bill ({inv.invoice_number})",
                "message": f"Balance of {_quantize(bal)} due to {s_name}.",
                "severity": "warning",
                "link": "/dashboard/vendor/invoices",
                "entity_id": inv.id,
            })

        return items

    # =========================================================================
    # ADMIN PLATFORM ANALYTICS
    # =========================================================================

    async def get_admin_kpis(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Compute platform-wide aggregate KPIs for admin."""
        # 1. Total users
        user_stmt = select(func.count(User.id)).where(User.is_deleted == False)
        total_users = (await self.db.execute(user_stmt)).scalar() or 0

        # 2. Total companies + breakdown
        comp_stmt = select(
            func.count(Company.id).label("total_companies"),
            func.count(
                case(
                    (func.lower(Company.business_type).in_(["wholesaler", "distributor", "manufacturer"]), 1),
                    else_=None,
                )
            ).label("supplier_count"),
            func.count(
                case(
                    (func.lower(Company.business_type).notin_(["wholesaler", "distributor", "manufacturer", "platform admin"]), 1),
                    else_=None,
                )
            ).label("vendor_count"),
        )
        comp_res = (await self.db.execute(comp_stmt)).mappings().one()

        # 3. Products count
        prod_stmt = select(func.count(Product.id)).where(Product.is_deleted == False)
        total_products = (await self.db.execute(prod_stmt)).scalar() or 0

        # 4. Orders aggregations
        ord_filters = [OrderRequest.is_deleted == False]
        if start_date:
            ord_filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            ord_filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        ord_stmt = select(
            func.count(OrderRequest.id).label("total_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status).in_(ACTIVE_ORDER_STATUSES), 1),
                    else_=None,
                )
            ).label("active_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status) == COMPLETED_ORDER_STATUS, 1),
                    else_=None,
                )
            ).label("completed_orders"),
        ).where(and_(*ord_filters))

        ord_res = (await self.db.execute(ord_stmt)).mappings().one()

        # 5. Financial volume aggregations
        inv_filters = [Invoice.is_deleted == False]
        if start_date:
            inv_filters.append(cast(Invoice.invoice_date, Date) >= _to_date_obj(start_date))
        if end_date:
            inv_filters.append(cast(Invoice.invoice_date, Date) <= _to_date_obj(end_date))

        inv_stmt = select(
            func.coalesce(func.sum(Invoice.total_amount), 0).label("invoiced_vol"),
            func.coalesce(func.sum(Invoice.paid_amount), 0).label("settled_vol"),
        ).where(and_(*inv_filters))

        inv_res = (await self.db.execute(inv_stmt)).mappings().one()
        invoiced_vol = _quantize(inv_res["invoiced_vol"])
        settled_vol = _quantize(inv_res["settled_vol"])

        return {
            "total_users": total_users,
            "total_companies": comp_res["total_companies"] or 0,
            "supplier_companies_count": comp_res["supplier_count"] or 0,
            "vendor_companies_count": comp_res["vendor_count"] or 0,
            "total_products": total_products,
            "total_orders": ord_res["total_orders"] or 0,
            "active_orders": ord_res["active_orders"] or 0,
            "completed_orders": ord_res["completed_orders"] or 0,
            "total_platform_invoiced": invoiced_vol,
            "total_platform_collected": settled_vol,
            "platform_outstanding": max(Decimal("0.00"), invoiced_vol - settled_vol),
        }

    async def get_admin_user_company_breakdown(self) -> Tuple[Dict[str, int], Dict[str, int]]:
        """User roles and company business types distributions."""
        # Roles breakdown
        role_stmt = select(Role.name, func.count(User.id)).select_from(Role).outerjoin(
            User, and_(Role.id == User.role_id, User.is_deleted == False)
        ).group_by(Role.name)
        role_rows = (await self.db.execute(role_stmt)).all()
        user_roles = {r[0].lower(): r[1] for r in role_rows}

        # Company types breakdown
        comp_stmt = select(Company.business_type, func.count(Company.id)).group_by(Company.business_type)
        comp_rows = (await self.db.execute(comp_stmt)).all()
        comp_types = {r[0]: r[1] for r in comp_rows if r[0]}

        return user_roles, comp_types

    async def get_admin_order_distribution(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """Platform-wide order lifecycle breakdown."""
        filters = [OrderRequest.is_deleted == False]
        if start_date:
            filters.append(cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date))
        if end_date:
            filters.append(cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date))

        stmt = select(
            func.lower(OrderRequest.status).label("status"),
            func.count(OrderRequest.id).label("count"),
        ).where(and_(*filters)).group_by(func.lower(OrderRequest.status))

        res = (await self.db.execute(stmt)).all()
        counts_map = {row.status: row.count for row in res}
        total = sum(counts_map.values())

        distribution = []
        for s in ALL_ORDER_STATUSES:
            count = counts_map.get(s, 0)
            pct = round((count / total * 100.0), 1) if total > 0 else 0.0
            distribution.append({
                "status": s.upper(),
                "count": count,
                "percentage": pct,
            })
        return distribution

    async def get_admin_financial_trend(
        self,
        start_date: date,
        end_date: date,
    ) -> List[Dict[str, Any]]:
        """Platform financial flow over time."""
        s_str = start_date.strftime("%Y-%m-%d")
        e_str = end_date.strftime("%Y-%m-%d")

        inv_stmt = select(
            cast(Invoice.invoice_date, Date).label("inv_date"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("invoiced"),
            func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
        ).where(
            Invoice.is_deleted == False,
            cast(Invoice.invoice_date, Date) >= _to_date_obj(start_date),
            cast(Invoice.invoice_date, Date) <= _to_date_obj(end_date),
        ).group_by(cast(Invoice.invoice_date, Date)).order_by(cast(Invoice.invoice_date, Date).asc())

        inv_rows = (await self.db.execute(inv_stmt)).all()
        inv_map = {
            _format_date_str(row.inv_date): {
                "invoiced": _quantize(row.invoiced),
                "collected": _quantize(row.collected),
            }
            for row in inv_rows if row.inv_date
        }

        # Daily orders
        ord_stmt = select(
            cast(OrderRequest.created_at, Date).label("ord_date"),
            func.count(OrderRequest.id).label("order_count"),
        ).where(
            OrderRequest.is_deleted == False,
            cast(OrderRequest.created_at, Date) >= _to_date_obj(start_date),
            cast(OrderRequest.created_at, Date) <= _to_date_obj(end_date),
        ).group_by(cast(OrderRequest.created_at, Date))

        ord_rows = (await self.db.execute(ord_stmt)).all()
        ord_map = {
            _format_date_str(row.ord_date): row.order_count
            for row in ord_rows if row.ord_date
        }

        trend_points = []
        curr = start_date
        while curr <= end_date:
            d_str = curr.strftime("%Y-%m-%d")
            inv_data = inv_map.get(d_str, {"invoiced": Decimal("0.00"), "collected": Decimal("0.00")})
            ord_count = ord_map.get(d_str, 0)
            trend_points.append({
                "date": d_str,
                "invoiced_amount": inv_data["invoiced"],
                "collected_amount": inv_data["collected"],
                "order_count": ord_count,
                "procurement_value": Decimal("0.00"),
            })
            curr += timedelta(days=1)

        return trend_points

    async def get_admin_operational_health(self) -> Dict[str, Any]:
        """System operational health indicators."""
        # 1. Pipeline stage bottlenecks
        pipeline_stmt = select(
            func.count(case((func.lower(OrderRequest.status) == "pending", 1), else_=None)).label("pending"),
            func.count(case((func.lower(OrderRequest.status) == "processing", 1), else_=None)).label("processing"),
            func.count(case((func.lower(OrderRequest.status) == "packed", 1), else_=None)).label("packed"),
            func.count(case((func.lower(OrderRequest.status) == "shipped", 1), else_=None)).label("shipped"),
        ).where(OrderRequest.is_deleted == False)

        p_res = (await self.db.execute(pipeline_stmt)).mappings().one()

        # 2. Unpaid invoices
        unpaid_stmt = select(func.count(Invoice.id)).where(
            Invoice.is_deleted == False,
            func.lower(Invoice.payment_status) != "paid",
        )
        unpaid_count = (await self.db.execute(unpaid_stmt)).scalar() or 0

        # 3. Platform inventory alerts
        inv_stmt = select(
            func.count(
                case(
                    (
                        and_(
                            (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= Inventory.reorder_level,
                            (Inventory.quantity_on_hand - Inventory.quantity_reserved) > 0,
                        ),
                        1,
                    ),
                    else_=None,
                )
            ).label("low_stock"),
            func.count(
                case(
                    (
                        (Inventory.quantity_on_hand - Inventory.quantity_reserved) <= 0,
                        1,
                    ),
                    else_=None,
                )
            ).label("out_of_stock"),
        ).select_from(Inventory).join(Product, Inventory.product_id == Product.id).where(
            Product.is_deleted == False,
            Product.is_active == True,
        )

        inv_res = (await self.db.execute(inv_stmt)).mappings().one()

        return {
            "pending_orders": p_res["pending"] or 0,
            "processing_orders": p_res["processing"] or 0,
            "packed_orders": p_res["packed"] or 0,
            "shipped_orders": p_res["shipped"] or 0,
            "unpaid_invoices_count": unpaid_count,
            "low_stock_alerts_count": inv_res["low_stock"] or 0,
            "out_of_stock_alerts_count": inv_res["out_of_stock"] or 0,
        }

    async def get_admin_top_active_suppliers(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Top performing suppliers across the platform."""
        stmt = select(
            OrderRequest.supplier_company_id,
            Company.company_name.label("supplier_name"),
            Company.business_type,
            func.coalesce(func.sum(OrderRequest.estimated_price), 0).label("spend"),
            func.count(OrderRequest.id).label("total_orders"),
            func.count(
                case(
                    (func.lower(OrderRequest.status) == COMPLETED_ORDER_STATUS, 1),
                    else_=None,
                )
            ).label("completed_orders"),
        ).select_from(OrderRequest).join(
            Company, OrderRequest.supplier_company_id == Company.id
        ).where(
            OrderRequest.is_deleted == False,
            func.lower(OrderRequest.status).notin_(EXCLUDED_FROM_SALES),
        ).group_by(
            OrderRequest.supplier_company_id,
            Company.company_name,
            Company.business_type,
        ).order_by(desc("spend")).limit(limit)

        rows = (await self.db.execute(stmt)).all()
        return [
            {
                "supplier_company_id": r.supplier_company_id,
                "supplier_name": r.supplier_name,
                "business_type": r.business_type,
                "total_spend": _quantize(r.spend),
                "total_orders": int(r.total_orders or 0),
                "completed_orders": int(r.completed_orders or 0),
            }
            for r in rows
        ]
