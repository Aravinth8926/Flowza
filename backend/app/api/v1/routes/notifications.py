import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.repositories.notification_repo import NotificationRepository
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from app.core.exceptions import NotFoundException, PermissionDeniedException

router = APIRouter(prefix="/notifications", tags=["Notifications & Communication"])


def _build_notification_schema(n) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        recipient_user_id=n.recipient_user_id,
        recipient_company_id=n.recipient_company_id,
        type=n.type,
        title=n.title,
        message=n.message,
        entity_type=n.entity_type,
        entity_id=n.entity_id,
        is_read=n.is_read,
        read_at=n.read_at,
        priority=n.priority,
        extra_metadata=n.extra_metadata or {},
        created_at=n.created_at,
    )


@router.get("", response_model=dict)
async def list_notifications(
    is_read: Optional[bool] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List notifications for current authenticated user with filtering and pagination.
    Tenancy is strictly enforced: only current user's notifications are returned.
    """
    repo = NotificationRepository(db)
    items, total = await repo.list_for_user(
        user_id=current_user.id,
        is_read=is_read,
        notif_type=type,
        search=search,
        page=page,
        limit=limit,
    )

    total_pages = (total + limit - 1) // limit if total > 0 else 0

    return {
        "success": True,
        "data": {
            "items": [_build_notification_schema(item) for item in items],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
            },
        },
    }


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the total count of unread notifications for current user."""
    repo = NotificationRepository(db)
    count = await repo.get_unread_count(current_user.id)
    return {
        "success": True,
        "data": {
            "count": count,
        },
    }


@router.get("/preferences", response_model=dict)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch current user's notification preferences."""
    repo = NotificationRepository(db)
    pref = await repo.get_preference(current_user.id)
    if not pref:
        # Default all enabled
        return {
            "success": True,
            "data": {
                "user_id": str(current_user.id),
                "order_notifications_enabled": True,
                "invoice_notifications_enabled": True,
                "payment_notifications_enabled": True,
                "inventory_notifications_enabled": True,
                "system_notifications_enabled": True,
            },
        }

    return {
        "success": True,
        "data": {
            "user_id": str(pref.user_id),
            "order_notifications_enabled": pref.order_notifications_enabled,
            "invoice_notifications_enabled": pref.invoice_notifications_enabled,
            "payment_notifications_enabled": pref.payment_notifications_enabled,
            "inventory_notifications_enabled": pref.inventory_notifications_enabled,
            "system_notifications_enabled": pref.system_notifications_enabled,
        },
    }


@router.patch("/preferences", response_model=dict)
async def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's notification preferences."""
    repo = NotificationRepository(db)
    updates = payload.model_dump(exclude_unset=True)
    pref = await repo.upsert_preference(current_user.id, updates)
    await db.commit()

    return {
        "success": True,
        "data": {
            "user_id": str(pref.user_id),
            "order_notifications_enabled": pref.order_notifications_enabled,
            "invoice_notifications_enabled": pref.invoice_notifications_enabled,
            "payment_notifications_enabled": pref.payment_notifications_enabled,
            "inventory_notifications_enabled": pref.inventory_notifications_enabled,
            "system_notifications_enabled": pref.system_notifications_enabled,
        },
    }


@router.patch("/read-all", response_model=dict)
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread notifications of the current user as read."""
    repo = NotificationRepository(db)
    count = await repo.mark_all_as_read(current_user.id)
    await db.commit()
    return {
        "success": True,
        "data": {
            "marked_read_count": count,
        },
    }


@router.get("/{notification_id}", response_model=dict)
async def get_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single notification details with strict ownership verification."""
    repo = NotificationRepository(db)
    notif = await repo.get_by_id(notification_id)
    if not notif:
        raise NotFoundException(detail="Notification not found")

    if notif.recipient_user_id != current_user.id:
        raise PermissionDeniedException(detail="You do not have permission to access this notification")

    return {
        "success": True,
        "data": _build_notification_schema(notif),
    }


@router.patch("/{notification_id}/read", response_model=dict)
async def mark_notification_as_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark single notification as read (idempotent operation)."""
    repo = NotificationRepository(db)
    notif = await repo.get_by_id(notification_id)
    if not notif:
        raise NotFoundException(detail="Notification not found")

    if notif.recipient_user_id != current_user.id:
        raise PermissionDeniedException(detail="You do not have permission to modify this notification")

    updated = await repo.mark_as_read(notification_id, current_user.id)
    await db.commit()

    return {
        "success": True,
        "data": _build_notification_schema(updated or notif),
    }


@router.delete("/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a notification."""
    repo = NotificationRepository(db)
    notif = await repo.get_by_id(notification_id)
    if not notif:
        raise NotFoundException(detail="Notification not found")

    if notif.recipient_user_id != current_user.id:
        raise PermissionDeniedException(detail="You do not have permission to delete this notification")

    success = await repo.soft_delete(notification_id, current_user.id)
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": str(notification_id),
            "deleted": success,
        },
    }
