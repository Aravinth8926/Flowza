import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order_request import OrderRequest


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    order_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("order_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    order_request: Mapped["OrderRequest"] = relationship(
        "OrderRequest", back_populates="status_history"
    )
    changed_by_user: Mapped["User"] = relationship("User")
