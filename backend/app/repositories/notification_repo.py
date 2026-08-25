import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, update
from sqlalchemy.orm import selectinload

from app.models.notification import Notification, NotificationPreference


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, notification_id: uuid.UUID) -> Optional[Notification]:
        """Fetch notification by primary key without deleted items."""
        result = await self.db.execute(
            select(Notification)
            .options(
                selectinload(Notification.recipient_user),
                selectinload(Notification.recipient_company),
            )
            .where(Notification.id == notification_id, Notification.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def exists_by_event_key(self, event_key: str) -> bool:
        """Check if a notification with this event_key already exists (deduplication/idempotency)."""
        if not event_key:
            return False
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.event_key == event_key,
                Notification.is_deleted == False,
            )
        )
        count = result.scalar() or 0
        return count > 0

    async def create(self, notification: Notification) -> Notification:
        """Add notification to session."""
        self.db.add(notification)
        return notification

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        is_read: Optional[bool] = None,
        notif_type: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Notification], int]:
        """List paginated notifications for a specific recipient user."""
        offset = (page - 1) * limit
        query = select(Notification).where(
            Notification.recipient_user_id == user_id,
            Notification.is_deleted == False,
        )

        if is_read is not None:
            query = query.where(Notification.is_read == is_read)

        if notif_type and notif_type.upper() != "ALL":
            # Match specific or category prefix (e.g. ORDER_ matches ORDER_CREATED, ORDER_SHIPPED, etc.)
            type_upper = notif_type.upper()
            if type_upper in ["ORDER", "INVOICE", "PAYMENT", "INVENTORY", "SYSTEM"]:
                query = query.where(Notification.type.startswith(type_upper))
            else:
                query = query.where(Notification.type == type_upper)

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Notification.title.ilike(search_pattern),
                    Notification.message.ilike(search_pattern),
                )
            )

        # Count total
        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar() or 0

        # Fetch records
        result = await self.db.execute(
            query.order_by(desc(Notification.created_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        """Get total unread notifications for recipient user."""
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.recipient_user_id == user_id,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
        )
        return result.scalar() or 0

    async def mark_as_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Notification]:
        """Mark single notification as read if owned by user."""
        notif = await self.get_by_id(notification_id)
        if not notif or notif.recipient_user_id != user_id:
            return None

        if not notif.is_read:
            notif.is_read = True
            notif.read_at = datetime.now(timezone.utc)
            await self.db.flush()
        return notif

    async def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        """Mark all unread notifications of a user as read."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.recipient_user_id == user_id,
                Notification.is_read == False,
                Notification.is_deleted == False,
            )
            .values(is_read=True, read_at=now)
        )
        return result.rowcount

    async def soft_delete(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Soft delete notification if owned by user."""
        notif = await self.get_by_id(notification_id)
        if not notif or notif.recipient_user_id != user_id:
            return False

        notif.is_deleted = True
        await self.db.flush()
        return True

    async def get_preference(self, user_id: uuid.UUID) -> Optional[NotificationPreference]:
        """Fetch notification preferences for a user."""
        result = await self.db.execute(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def upsert_preference(self, user_id: uuid.UUID, updates: dict) -> NotificationPreference:
        """Get or create user notification preferences and apply updates."""
        pref = await self.get_preference(user_id)
        if not pref:
            pref = NotificationPreference(user_id=user_id, **updates)
            self.db.add(pref)
        else:
            for k, v in updates.items():
                if hasattr(pref, k) and v is not None:
                    setattr(pref, k, v)
        await self.db.flush()
        return pref
