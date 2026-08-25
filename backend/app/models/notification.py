import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Index, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.database.base import Base


class Notification(Base):
    """
    Persistent Notification Entity.
    The database is the authoritative source of truth;
    WebSocket delivery is the real-time notification push mechanism.
    """
    __tablename__ = "notifications"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Recipient user & company for tenant isolation
    recipient_user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    recipient_company_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Notification Classification
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Actionable Entity Linking
    entity_type = Column(String(50), nullable=True)  # e.g., ORDER, INVOICE, PAYMENT, INVENTORY, SYSTEM
    entity_id = Column(PG_UUID(as_uuid=True), nullable=True)

    # Read tracking
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Priority (LOW, NORMAL, HIGH, URGENT)
    priority = Column(String(20), default="NORMAL", nullable=False)

    # Flexible metadata (e.g. order_number, invoice_number)
    extra_metadata = Column(JSON, nullable=True)

    # Event key for deduplication and idempotency
    event_key = Column(String(255), nullable=True, index=True)

    # Soft deletion
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    # Relationships
    recipient_user = relationship("User", foreign_keys=[recipient_user_id], lazy="selectin")
    recipient_company = relationship("Company", foreign_keys=[recipient_company_id], lazy="selectin")

    __table_args__ = (
        Index("ix_notifications_user_read_created", "recipient_user_id", "is_read", "created_at"),
    )


class NotificationPreference(Base):
    """
    User-level notification delivery preferences.
    Controls which categories of business events generate notifications for the user.
    """
    __tablename__ = "notification_preferences"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    order_notifications_enabled = Column(Boolean, default=True, nullable=False)
    invoice_notifications_enabled = Column(Boolean, default=True, nullable=False)
    payment_notifications_enabled = Column(Boolean, default=True, nullable=False)
    inventory_notifications_enabled = Column(Boolean, default=True, nullable=False)
    system_notifications_enabled = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationship
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
