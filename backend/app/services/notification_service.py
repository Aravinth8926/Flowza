import uuid
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.notification import Notification, NotificationPreference
from app.models.user import User
from app.models.company import Company
from app.models.order_request import OrderRequest
from app.models.invoice import Invoice, PaymentRecord
from app.models.inventory import Inventory
from app.models.product import Product
from app.repositories.notification_repo import NotificationRepository
from app.core.websocket import manager as ws_manager

logger = logging.getLogger("flowza.notifications")

# Controlled notification types
class NotificationType:
    ORDER_CREATED = "ORDER_CREATED"
    ORDER_ACCEPTED = "ORDER_ACCEPTED"
    ORDER_REJECTED = "ORDER_REJECTED"
    ORDER_PROCESSING = "ORDER_PROCESSING"
    ORDER_PACKED = "ORDER_PACKED"
    ORDER_SHIPPED = "ORDER_SHIPPED"
    ORDER_DELIVERED = "ORDER_DELIVERED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    ORDER_CANCELLED = "ORDER_CANCELLED"

    INVOICE_GENERATED = "INVOICE_GENERATED"

    PAYMENT_RECORDED = "PAYMENT_RECORDED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"

    INVENTORY_LOW_STOCK = "INVENTORY_LOW_STOCK"
    INVENTORY_OUT_OF_STOCK = "INVENTORY_OUT_OF_STOCK"

    SYSTEM_NOTIFICATION = "SYSTEM_NOTIFICATION"


class NotificationPriority:
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


def _category_from_type(notif_type: str) -> str:
    """Determine preference category name from notification type string."""
    if notif_type.startswith("ORDER_"):
        return "order"
    elif notif_type.startswith("INVOICE_"):
        return "invoice"
    elif notif_type.startswith("PAYMENT_"):
        return "payment"
    elif notif_type.startswith("INVENTORY_"):
        return "inventory"
    return "system"


def serialize_notification(n: Notification) -> Dict[str, Any]:
    """Serialize notification model to standardized dictionary for API and WebSocket."""
    return {
        "id": str(n.id),
        "recipient_user_id": str(n.recipient_user_id),
        "recipient_company_id": str(n.recipient_company_id) if n.recipient_company_id else None,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "entity_type": n.entity_type,
        "entity_id": str(n.entity_id) if n.entity_id else None,
        "is_read": n.is_read,
        "read_at": n.read_at.isoformat() if n.read_at else None,
        "priority": n.priority,
        "extra_metadata": n.extra_metadata or {},
        "created_at": n.created_at.isoformat() if n.created_at else datetime.now(timezone.utc).isoformat(),
    }


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    async def is_notification_enabled_for_user(self, user_id: uuid.UUID, notif_type: str) -> bool:
        """Check if user has enabled notifications for this category."""
        category = _category_from_type(notif_type)
        pref = await self.repo.get_preference(user_id)
        if not pref:
            return True  # Default enabled

        if category == "order":
            return pref.order_notifications_enabled
        elif category == "invoice":
            return pref.invoice_notifications_enabled
        elif category == "payment":
            return pref.payment_notifications_enabled
        elif category == "inventory":
            return pref.inventory_notifications_enabled
        elif category == "system":
            return pref.system_notifications_enabled
        return True

    async def create_notification(
        self,
        recipient_user_id: uuid.UUID,
        notif_type: str,
        title: str,
        message: str,
        recipient_company_id: Optional[uuid.UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        priority: str = NotificationPriority.NORMAL,
        extra_metadata: Optional[dict] = None,
        event_key: Optional[str] = None,
        dispatch_ws: bool = True,
    ) -> Optional[Notification]:
        """
        Create and persist a single notification with deduplication and preference check.
        Best-effort WebSocket delivery is triggered post-creation.
        """
        # Deduplication check
        if event_key and await self.repo.exists_by_event_key(event_key):
            logger.info(f"Skipping duplicate notification for event_key={event_key}")
            return None

        # User preference check
        is_enabled = await self.is_notification_enabled_for_user(recipient_user_id, notif_type)
        if not is_enabled:
            logger.info(f"User {recipient_user_id} disabled notifications for type {notif_type}")
            return None

        notif = Notification(
            id=uuid.uuid4(),
            recipient_user_id=recipient_user_id,
            recipient_company_id=recipient_company_id,
            type=notif_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            priority=priority,
            extra_metadata=extra_metadata or {},
            event_key=event_key,
            is_read=False,
            is_deleted=False,
            created_at=datetime.now(timezone.utc),
        )

        await self.repo.create(notif)
        await self.db.flush()

        # Best-effort WebSocket dispatch
        if dispatch_ws:
            payload = serialize_notification(notif)
            try:
                await ws_manager.send_notification_event(str(recipient_user_id), payload)
            except Exception as e:
                logger.warning(f"WebSocket delivery failed for user {recipient_user_id}: {e}")

        return notif

    async def notify_company(
        self,
        company_id: uuid.UUID,
        notif_type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        priority: str = NotificationPriority.NORMAL,
        extra_metadata: Optional[dict] = None,
        event_key_prefix: Optional[str] = None,
        dispatch_ws: bool = True,
    ) -> List[Notification]:
        """Send notification to all active users belonging to a company."""
        result = await self.db.execute(
            select(User).where(User.company_id == company_id, User.is_active == True)
        )
        users = list(result.scalars().all())
        notifications = []

        for user in users:
            event_key = f"{event_key_prefix}:{user.id}" if event_key_prefix else None
            n = await self.create_notification(
                recipient_user_id=user.id,
                recipient_company_id=company_id,
                notif_type=notif_type,
                title=title,
                message=message,
                entity_type=entity_type,
                entity_id=entity_id,
                priority=priority,
                extra_metadata=extra_metadata,
                event_key=event_key,
                dispatch_ws=dispatch_ws,
            )
            if n:
                notifications.append(n)
        return notifications

    # -------------------------------------------------------------
    # Domain-Specific Helper Methods
    # -------------------------------------------------------------

    async def notify_order_created(
        self,
        order: OrderRequest,
        vendor_company_name: str,
    ):
        """Notify supplier company users when vendor checks out a new order."""
        title = "New order received"
        order_num = getattr(order, "order_number", None) or f"ORD-2026-{str(order.id)[:6].upper()}"
        message = f"A new order {order_num} has been placed by {vendor_company_name}."
        
        await self.notify_company(
            company_id=order.supplier_company_id,
            notif_type=NotificationType.ORDER_CREATED,
            title=title,
            message=message,
            entity_type="ORDER",
            entity_id=order.id,
            priority=NotificationPriority.HIGH,
            extra_metadata={"order_number": order_num, "status": "PENDING"},
            event_key_prefix=f"ORDER_CREATED:{order.id}",
        )

    async def notify_order_status_change(
        self,
        order: OrderRequest,
        from_status: str,
        to_status: str,
        actor: User,
        supplier_company_name: str,
        vendor_company_name: str,
        rejection_reason: Optional[str] = None,
    ):
        """Notify counterpart company users when order status progresses."""
        to_upper = to_status.upper()
        order_num = getattr(order, "order_number", None) or f"ORD-2026-{str(order.id)[:6].upper()}"

        # Map status to target recipient and message templates
        if to_upper == "ACCEPTED":
            await self.notify_company(
                company_id=order.vendor_company_id,
                notif_type=NotificationType.ORDER_ACCEPTED,
                title="Order accepted",
                message=f"Your order {order_num} has been accepted by {supplier_company_name}.",
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.HIGH,
                extra_metadata={"order_number": order_num, "status": to_status},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )
        elif to_upper == "REJECTED":
            msg = f"Your order {order_num} was rejected by {supplier_company_name}."
            if rejection_reason:
                msg += f" Reason: {rejection_reason}"
            await self.notify_company(
                company_id=order.vendor_company_id,
                notif_type=NotificationType.ORDER_REJECTED,
                title="Order rejected",
                message=msg,
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.HIGH,
                extra_metadata={"order_number": order_num, "status": to_status, "reason": rejection_reason},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )
        elif to_upper == "PROCESSING":
            await self.notify_company(
                company_id=order.vendor_company_id,
                notif_type=NotificationType.ORDER_PROCESSING,
                title="Order processing",
                message=f"Your order {order_num} is now being processed by {supplier_company_name}.",
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.NORMAL,
                extra_metadata={"order_number": order_num, "status": to_status},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )
        elif to_upper == "PACKED":
            await self.notify_company(
                company_id=order.vendor_company_id,
                notif_type=NotificationType.ORDER_PACKED,
                title="Order packed",
                message=f"Your order {order_num} has been packed and is ready for dispatch.",
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.NORMAL,
                extra_metadata={"order_number": order_num, "status": to_status},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )
        elif to_upper == "SHIPPED":
            await self.notify_company(
                company_id=order.vendor_company_id,
                notif_type=NotificationType.ORDER_SHIPPED,
                title="Order shipped",
                message=f"Your order {order_num} has been shipped by {supplier_company_name}.",
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.HIGH,
                extra_metadata={"order_number": order_num, "status": to_status},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )
        elif to_upper == "DELIVERED":
            await self.notify_company(
                company_id=order.supplier_company_id,
                notif_type=NotificationType.ORDER_DELIVERED,
                title="Order delivered",
                message=f"Order {order_num} has been marked as delivered by {vendor_company_name}.",
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.NORMAL,
                extra_metadata={"order_number": order_num, "status": to_status},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )
        elif to_upper == "COMPLETED":
            await self.notify_company(
                company_id=order.supplier_company_id,
                notif_type=NotificationType.ORDER_COMPLETED,
                title="Order completed",
                message=f"Order {order_num} has been completed and verified.",
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.NORMAL,
                extra_metadata={"order_number": order_num, "status": to_status},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )
        elif to_upper == "CANCELLED":
            # Determine counterparty: if actor is supplier, notify vendor; else notify supplier
            target_company_id = (
                order.vendor_company_id
                if actor.company_id == order.supplier_company_id
                else order.supplier_company_id
            )
            msg = f"Order {order_num} has been cancelled."
            if rejection_reason:
                msg += f" Note: {rejection_reason}"
            await self.notify_company(
                company_id=target_company_id,
                notif_type=NotificationType.ORDER_CANCELLED,
                title="Order cancelled",
                message=msg,
                entity_type="ORDER",
                entity_id=order.id,
                priority=NotificationPriority.HIGH,
                extra_metadata={"order_number": order_num, "status": to_status, "reason": rejection_reason},
                event_key_prefix=f"ORDER_STATUS:{order.id}:{to_upper}",
            )

    async def notify_invoice_generated(self, invoice: Invoice, order: Optional[OrderRequest] = None):
        """Notify vendor company users when invoice is generated for their order."""
        inv_num = invoice.invoice_number
        order_num = getattr(order, "order_number", None) or (f"ORD-2026-{str(order.id)[:6].upper()}" if order else f"ORD-2026-{str(invoice.order_request_id)[:6].upper()}")
        
        await self.notify_company(
            company_id=invoice.vendor_company_id,
            notif_type=NotificationType.INVOICE_GENERATED,
            title="Invoice generated",
            message=f"Invoice {inv_num} has been generated for order {order_num}.",
            entity_type="INVOICE",
            entity_id=invoice.id,
            priority=NotificationPriority.HIGH,
            extra_metadata={
                "invoice_number": inv_num,
                "order_number": order_num,
                "total_amount": str(invoice.total_amount),
            },
            event_key_prefix=f"INVOICE_GENERATED:{invoice.id}",
        )

    async def notify_payment_recorded(
        self,
        invoice: Invoice,
        payment: PaymentRecord,
        is_completed: bool,
    ):
        """Notify vendor when a payment is recorded against an invoice."""
        inv_num = invoice.invoice_number
        formatted_amount = f"₹{payment.amount:,.2f}"

        # 1. Payment recorded notification
        await self.notify_company(
            company_id=invoice.vendor_company_id,
            notif_type=NotificationType.PAYMENT_RECORDED,
            title="Payment recorded",
            message=f"A payment of {formatted_amount} has been recorded against invoice {inv_num}.",
            entity_type="INVOICE",
            entity_id=invoice.id,
            priority=NotificationPriority.HIGH,
            extra_metadata={
                "invoice_number": inv_num,
                "amount": str(payment.amount),
                "payment_id": str(payment.id),
            },
            event_key_prefix=f"PAYMENT_RECORDED:{payment.id}",
        )

        # 2. Payment completed notification if fully settled
        if is_completed:
            await self.notify_company(
                company_id=invoice.vendor_company_id,
                notif_type=NotificationType.PAYMENT_COMPLETED,
                title="Payment completed",
                message=f"Invoice {inv_num} has been fully settled and paid.",
                entity_type="INVOICE",
                entity_id=invoice.id,
                priority=NotificationPriority.HIGH,
                extra_metadata={"invoice_number": inv_num},
                event_key_prefix=f"PAYMENT_COMPLETED:{invoice.id}",
            )

    async def notify_inventory_stock_alert(
        self,
        product: Product,
        inventory: Inventory,
        available: int,
        is_out_of_stock: bool = False,
    ):
        """
        Notify supplier inventory managers when stock drops below threshold.
        Includes cooldown/deduplication key to prevent spamming on every item increment/decrement.
        """
        if is_out_of_stock or available <= 0:
            notif_type = NotificationType.INVENTORY_OUT_OF_STOCK
            title = "Product Out of Stock"
            message = f"{product.name} is now out of stock (0 units remaining)."
            priority = NotificationPriority.URGENT
            event_key = f"STOCK_ALERT_OOS:{product.id}"
        else:
            notif_type = NotificationType.INVENTORY_LOW_STOCK
            title = "Low Stock Alert"
            message = f"{product.name} is running low. Available stock: {available} units (Reorder level: {inventory.reorder_level})."
            priority = NotificationPriority.HIGH
            event_key = f"STOCK_ALERT_LOW:{product.id}:{inventory.reorder_level}"

        await self.notify_company(
            company_id=product.company_id,
            notif_type=notif_type,
            title=title,
            message=message,
            entity_type="INVENTORY",
            entity_id=product.id,
            priority=priority,
            extra_metadata={
                "product_name": product.name,
                "sku": product.sku,
                "available": available,
                "reorder_level": inventory.reorder_level,
            },
            event_key_prefix=event_key,
        )
