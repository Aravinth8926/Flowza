import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.product import Product

class Inventory(Base):
    __tablename__ = "inventories"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), unique=True, nullable=False, index=True)
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reorder_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("product_id", name="uq_inventory_product_id"),
        CheckConstraint("quantity_on_hand >= 0", name="chk_inventory_qoh_non_negative"),
        CheckConstraint("quantity_reserved >= 0", name="chk_inventory_qr_non_negative"),
        CheckConstraint("reorder_level >= 0", name="chk_inventory_rl_non_negative"),
        CheckConstraint("reorder_quantity >= 0", name="chk_inventory_rq_non_negative"),
        CheckConstraint("quantity_reserved <= quantity_on_hand", name="chk_inventory_reserved_lte_on_hand"),
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory")
