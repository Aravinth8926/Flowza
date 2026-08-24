import uuid
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, Numeric, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.company import Company
    from app.models.product import Product
    from app.models.order_status_history import OrderStatusHistory

class OrderRequest(Base):
    __tablename__ = "order_requests"

    vendor_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False)
    supplier_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit: Mapped[str] = mapped_column(String(20), default="units")
    estimated_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    delivery_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, accepted, processing, packed, shipped, delivered, completed, rejected, cancelled
    supplier_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    created_by_user: Mapped["User"] = relationship("User", foreign_keys=[created_by_user_id], back_populates="created_orders")
    vendor_company: Mapped["Company"] = relationship("Company", foreign_keys=[vendor_company_id], back_populates="vendor_orders")
    supplier_company: Mapped["Company"] = relationship("Company", foreign_keys=[supplier_company_id], back_populates="supplier_orders")
    items: Mapped[List["OrderRequestItem"]] = relationship("OrderRequestItem", back_populates="order_request", cascade="all, delete-orphan")
    status_history: Mapped[List["OrderStatusHistory"]] = relationship("OrderStatusHistory", back_populates="order_request", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at.asc()")


class OrderRequestItem(Base):
    __tablename__ = "order_request_items"

    order_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("order_requests.id"), nullable=False)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("products.id"), nullable=True)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    product_name_snapshot: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit: Mapped[str] = mapped_column(String(20), default="units")
    estimated_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    unit_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    order_request: Mapped["OrderRequest"] = relationship("OrderRequest", back_populates="items")
    product: Mapped[Optional["Product"]] = relationship("Product", back_populates="order_items")
