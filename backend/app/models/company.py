import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.address import Address

class Company(Base):
    __tablename__ = "companies"

    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    business_type: Mapped[str] = mapped_column(String(100), nullable=False)
    gst_number: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="company")
    addresses: Mapped[List["Address"]] = relationship("Address", back_populates="company", cascade="all, delete-orphan")

    @property
    def address(self) -> Optional["Address"]:
        return self.addresses[0] if self.addresses else None
