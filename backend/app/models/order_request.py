import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, Numeric, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.company import Company
    from app.models.product import Product

class OrderRequest(Base):
    __tablename__ = "order_requests"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    vendor_company_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("companies.id"), nullable=True)
    supplier_company_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("companies.id"), nullable=True)
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit: Mapped[str] = mapped_column(String(20), default="units")
    estimated_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    delivery_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, accepted, rejected, in_progress, completed, cancelled
    supplier_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    vendor_company: Mapped[Optional["Company"]] = relationship(
        "Company", foreign_keys=[vendor_company_id], back_populates="vendor_orders"
    )
    supplier_company: Mapped[Optional["Company"]] = relationship(
        "Company", foreign_keys=[supplier_company_id], back_populates="supplier_orders"
    )
    created_by_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[created_by_user_id], back_populates="created_orders"
    )
    items: Mapped[List["OrderRequestItem"]] = relationship(
        "OrderRequestItem", back_populates="order_request", cascade="all, delete-orphan"
    )


class OrderRequestItem(Base):
    __tablename__ = "order_request_items"

    order_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("order_requests.id"), nullable=False)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("products.id"), nullable=True)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    product_name_snapshot: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit: Mapped[str] = mapped_column(String(20), default="units")
    unit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    estimated_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    order_request: Mapped["OrderRequest"] = relationship("OrderRequest", back_populates="items")
    product: Mapped[Optional["Product"]] = relationship("Product", back_populates="order_items")
