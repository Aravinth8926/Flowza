import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.company import Company
    from app.models.cart_item import CartItem

class Cart(Base):
    __tablename__ = "carts"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    vendor_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False)
    supplier_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False)

    # Relationships
    vendor: Mapped["User"] = relationship("User", back_populates="carts")
    vendor_company: Mapped["Company"] = relationship("Company", foreign_keys=[vendor_company_id], back_populates="vendor_carts")
    supplier_company: Mapped["Company"] = relationship("Company", foreign_keys=[supplier_company_id], back_populates="supplier_carts")
    items: Mapped[List["CartItem"]] = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("vendor_company_id", "supplier_company_id", name="uq_vendor_supplier_cart"),
    )
