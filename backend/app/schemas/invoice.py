import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class InvoiceGenerateRequest(BaseModel):
    """Payload to trigger invoice generation for a completed order."""
    due_date: Optional[date] = None
    default_tax_rate: Optional[Decimal] = Field(default=Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("1.00"))
    discount_amount: Optional[Decimal] = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    notes: Optional[str] = None


class PaymentRecordCreate(BaseModel):
    """Payload to record an incoming/manual payment."""
    amount: Decimal = Field(..., gt=Decimal("0.00"), description="Payment amount in INR")
    payment_date: Optional[date] = None
    method: str = Field(default="bank_transfer", description="bank_transfer, cash, cheque, upi_manual, neft_rtgs")
    reference: Optional[str] = None
    notes: Optional[str] = None


class PaymentStatusUpdate(BaseModel):
    """Direct payment status adjustment."""
    payment_status: str = Field(..., pattern="^(unpaid|partially_paid|paid|overdue)$")


class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    order_request_item_id: Optional[uuid.UUID] = None
    product_id: Optional[uuid.UUID] = None
    product_name_snapshot: str
    sku_snapshot: Optional[str] = None
    quantity: int
    unit: str
    unit_price: Decimal
    line_subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True


class PaymentRecordResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    amount: Decimal
    payment_date: date
    method: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    recorded_by_user_id: uuid.UUID
    recorded_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    order_request_id: uuid.UUID
    invoice_number: str
    vendor_company_id: uuid.UUID
    supplier_company_id: uuid.UUID
    vendor_company_name: str
    supplier_company_name: str
    invoice_date: date
    due_date: date
    currency: str
    status: str
    payment_status: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    item_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceDetailResponse(BaseModel):
    id: uuid.UUID
    order_request_id: uuid.UUID
    invoice_number: str
    vendor_company_id: uuid.UUID
    supplier_company_id: uuid.UUID
    created_by_user_id: uuid.UUID
    invoice_date: date
    due_date: date
    currency: str
    status: str
    payment_status: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    notes: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None

    # Company Snapshots
    supplier_company_name: str
    supplier_gst_number: Optional[str] = None
    supplier_address: Optional[str] = None
    vendor_company_name: str
    vendor_gst_number: Optional[str] = None
    vendor_address: Optional[str] = None

    # Nested Line Items & Payments
    items: List[InvoiceItemResponse] = []
    payments: List[PaymentRecordResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total: int
    page: int
    limit: int


class InvoiceStatsResponse(BaseModel):
    total_invoices: int
    total_amount: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    unpaid_count: int
    partially_paid_count: int
    paid_count: int
    overdue_count: int
