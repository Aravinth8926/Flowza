import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.company import Company
    from app.models.cart import Cart
    from app.models.order_request import OrderRequest

class User(Base):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("companies.id"), nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="users")
    carts: Mapped[List["Cart"]] = relationship("Cart", back_populates="vendor")
    vendor_orders: Mapped[List["OrderRequest"]] = relationship(
        "OrderRequest", foreign_keys="[OrderRequest.vendor_id]", back_populates="vendor"
    )
    supplier_orders: Mapped[List["OrderRequest"]] = relationship(
        "OrderRequest", foreign_keys="[OrderRequest.supplier_id]", back_populates="supplier"
    )
    created_orders: Mapped[List["OrderRequest"]] = relationship(
        "OrderRequest", foreign_keys="[OrderRequest.created_by_user_id]", back_populates="created_by_user"
    )
