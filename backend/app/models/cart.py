import uuid
from decimal import Decimal
from typing import List, TYPE_CHECKING
from sqlalchemy import Integer, Numeric, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.company import Company
    from app.models.product import Product

class Cart(Base):
    __tablename__ = "carts"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    vendor_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)
    supplier_company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("vendor_company_id", "supplier_company_id", name="uq_carts_vendor_supplier"),
    )

    # Relationships
    vendor: Mapped["User"] = relationship("User", back_populates="carts")
    vendor_company: Mapped["Company"] = relationship(
        "Company", foreign_keys=[vendor_company_id], back_populates="vendor_carts"
    )
    supplier_company: Mapped["Company"] = relationship(
        "Company", foreign_keys=[supplier_company_id], back_populates="supplier_carts"
    )
    items: Mapped[List["CartItem"]] = relationship(
        "CartItem", back_populates="cart", cascade="all, delete-orphan"
    )


class CartItem(Base):
    __tablename__ = "cart_items"

    cart_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("carts.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", name="uq_cart_items_cart_product"),
        CheckConstraint("quantity > 0", name="chk_cart_items_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="chk_cart_items_unit_price_non_negative"),
    )

    # Relationships
    cart: Mapped["Cart"] = relationship("Cart", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="cart_items")
