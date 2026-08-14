import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.company import Company

class Address(Base):
    __tablename__ = "addresses"

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    address_line: Mapped[str] = mapped_column(Text, nullable=False)
    address_type: Mapped[str] = mapped_column(String(50), default="billing", nullable=False)

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="addresses")
