import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DateRangePreset(str, Enum):
    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"
    LAST_3_MONTHS = "3m"
    LAST_6_MONTHS = "6m"
    LAST_12_MONTHS = "12m"
    ALL = "all"
    CUSTOM = "custom"


class DateRangeFilterParams(BaseModel):
    preset: Optional[DateRangePreset] = DateRangePreset.LAST_30_DAYS
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class TrendDataPoint(BaseModel):
    date: str
    invoiced_amount: Decimal = Decimal("0.00")
    collected_amount: Decimal = Decimal("0.00")
    order_count: int = 0
    procurement_value: Decimal = Decimal("0.00")


class StatusCountItem(BaseModel):
    status: str
    count: int
    percentage: float


class TopProductItem(BaseModel):
    product_id: Optional[uuid.UUID] = None
    product_name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    total_units_sold: int
    total_revenue: Decimal
    order_count: int


class TopSupplierItem(BaseModel):
    supplier_company_id: uuid.UUID
    supplier_name: str
    business_type: Optional[str] = None
    total_spend: Decimal
    total_orders: int
    completed_orders: int


class AttentionItem(BaseModel):
    id: str
    type: str  # e.g., PENDING_ORDER, LOW_STOCK, OUT_OF_STOCK, UNPAID_INVOICE, OVERDUE_ORDER
    title: str
    message: str
    severity: str  # info, warning, urgent
    link: str
    entity_id: Optional[uuid.UUID] = None


class RecentOrderSummary(BaseModel):
    id: uuid.UUID
    order_number: str
    counterpart_company_name: str
    item_preview: str
    total_amount: Decimal
    status: str
    delivery_date: Optional[date] = None
    created_at: datetime


class OutstandingInvoiceSummary(BaseModel):
    id: uuid.UUID
    invoice_number: str
    counterpart_company_name: str
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    payment_status: str
    due_date: Optional[date] = None
    created_at: datetime


# -------------------------------------------------------------
# SUPPLIER SCHEMAS
# -------------------------------------------------------------

class SupplierKPIs(BaseModel):
    total_orders: int
    active_orders: int
    completed_orders: int
    total_invoiced: Decimal
    total_collected: Decimal
    outstanding_receivables: Decimal
    low_stock_products_count: int
    out_of_stock_products_count: int
    orders_trend_pct: Optional[float] = None
    invoiced_trend_pct: Optional[float] = None
    collected_trend_pct: Optional[float] = None


class SupplierInventoryOverview(BaseModel):
    total_products: int
    in_stock_count: int
    low_stock_count: int
    out_of_stock_count: int
    total_quantity_on_hand: int
    total_quantity_reserved: int
    total_quantity_available: int


class SupplierOverviewResponse(BaseModel):
    kpis: SupplierKPIs
    order_status_distribution: List[StatusCountItem]
    revenue_trend: List[TrendDataPoint]
    top_products: List[TopProductItem]
    inventory_summary: SupplierInventoryOverview
    recent_orders: List[RecentOrderSummary]
    attention_items: List[AttentionItem]


# -------------------------------------------------------------
# VENDOR SCHEMAS
# -------------------------------------------------------------

class VendorKPIs(BaseModel):
    total_orders: int
    active_orders: int
    completed_orders: int
    total_procurement_value: Decimal
    total_paid: Decimal
    outstanding_payables: Decimal
    active_suppliers_count: int
    pending_deliveries: int
    orders_trend_pct: Optional[float] = None
    procurement_trend_pct: Optional[float] = None


class VendorOverviewResponse(BaseModel):
    kpis: VendorKPIs
    order_status_distribution: List[StatusCountItem]
    procurement_trend: List[TrendDataPoint]
    top_suppliers: List[TopSupplierItem]
    outstanding_invoices: List[OutstandingInvoiceSummary]
    recent_orders: List[RecentOrderSummary]
    attention_items: List[AttentionItem]


# -------------------------------------------------------------
# ADMIN SCHEMAS
# -------------------------------------------------------------

class AdminKPIs(BaseModel):
    total_users: int
    total_companies: int
    vendor_companies_count: int
    supplier_companies_count: int
    total_products: int
    total_orders: int
    total_platform_invoiced: Decimal
    total_platform_collected: Decimal
    platform_outstanding: Decimal
    active_orders: int
    completed_orders: int


class AdminOperationalHealth(BaseModel):
    pending_orders: int
    processing_orders: int
    packed_orders: int
    shipped_orders: int
    unpaid_invoices_count: int
    low_stock_alerts_count: int
    out_of_stock_alerts_count: int


class AdminOverviewResponse(BaseModel):
    kpis: AdminKPIs
    user_role_breakdown: Dict[str, int]
    company_type_breakdown: Dict[str, int]
    order_status_distribution: List[StatusCountItem]
    platform_financial_trend: List[TrendDataPoint]
    operational_health: AdminOperationalHealth
    top_active_suppliers: List[TopSupplierItem]
