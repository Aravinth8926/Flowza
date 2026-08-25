import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: uuid.UUID
    recipient_user_id: uuid.UUID
    recipient_company_id: Optional[uuid.UUID] = None
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    is_read: bool
    read_at: Optional[datetime] = None
    priority: str
    extra_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPagination(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    pagination: NotificationPagination


class UnreadCountResponse(BaseModel):
    count: int


class NotificationPreferenceResponse(BaseModel):
    user_id: uuid.UUID
    order_notifications_enabled: bool
    invoice_notifications_enabled: bool
    payment_notifications_enabled: bool
    inventory_notifications_enabled: bool
    system_notifications_enabled: bool

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    order_notifications_enabled: Optional[bool] = None
    invoice_notifications_enabled: Optional[bool] = None
    payment_notifications_enabled: Optional[bool] = None
    inventory_notifications_enabled: Optional[bool] = None
    system_notifications_enabled: Optional[bool] = None
