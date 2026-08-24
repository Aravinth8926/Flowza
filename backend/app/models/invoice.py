import uuid
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import String, Text, Integer, Numeric, Date, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.company import Company
    from app.models.product import Product
    from app.models.order_request import OrderRequest, OrderRequestItem


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("order_request_id", name="uq_invoice_order_request_id"),
        UniqueConstraint("invoice_number", name="uq_invoice_number"),
    )

    order_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("order_requests.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)

    vendor_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    supplier_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    invoice_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    currency: Mapped[str] = mapped_column(String(10), default="INR")
    status: Mapped[str] = mapped_column(String(30), default="generated")  # generated, cancelled
    payment_status: Mapped[str] = mapped_column(String(30), default="unpaid", index=True)  # unpaid, partially_paid, paid, overdue

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    billing_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shipping_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Immutable Company Snapshot Audit Trail
    supplier_company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    supplier_gst_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    supplier_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    vendor_company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    vendor_gst_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    vendor_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    order_request: Mapped["OrderRequest"] = relationship("OrderRequest", back_populates="invoice")
    vendor_company: Mapped["Company"] = relationship("Company", foreign_keys=[vendor_company_id])
    supplier_company: Mapped["Company"] = relationship("Company", foreign_keys=[supplier_company_id])
    created_by_user: Mapped["User"] = relationship("User", foreign_keys=[created_by_user_id])
    items: Mapped[List["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceItem.created_at.asc()"
    )
    payments: Mapped[List["PaymentRecord"]] = relationship(
        "PaymentRecord", back_populates="invoice", cascade="all, delete-orphan", order_by="PaymentRecord.payment_date.asc()"
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_request_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("order_request_items.id", ondelete="SET NULL"), nullable=True
    )
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )

    # Immutable Historical Product & Pricing Snapshots
    product_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    sku_snapshot: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit: Mapped[str] = mapped_column(String(20), default="units")

    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("0.0000"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
    order_request_item: Mapped[Optional["OrderRequestItem"]] = relationship("OrderRequestItem")
    product: Mapped[Optional["Product"]] = relationship("Product")


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str] = mapped_column(String(50), default="bank_transfer")  # bank_transfer, cash, cheque, upi_manual, neft_rtgs
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="payments")
    recorded_by_user: Mapped["User"] = relationship("User", foreign_keys=[recorded_by_user_id])
