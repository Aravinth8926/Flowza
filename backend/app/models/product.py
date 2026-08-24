import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Text, Numeric, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.inventory import Inventory
    from app.models.order_request import OrderRequestItem
    from app.models.cart_item import CartItem

class Product(Base):
    __tablename__ = "products"

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="units", nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="products")
    inventory: Mapped[Optional["Inventory"]] = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")
    order_items: Mapped[List["OrderRequestItem"]] = relationship("OrderRequestItem", back_populates="product")
    cart_items: Mapped[List["CartItem"]] = relationship("CartItem", back_populates="product")

    __table_args__ = (
        UniqueConstraint("company_id", "sku", name="uq_company_sku"),
    )
