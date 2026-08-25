"""
Phase 3 — Order Lifecycle & Fulfillment Service
================================================
Centralized state machine and fulfillment engine for Flowza Purchase Orders.

Enforces:
1. Strict transition validation matrix
2. Multi-tenant company authorization (supplier vs vendor)
3. Atomic inventory side effects:
   - REJECTED / CANCELLED: releases reserved quantity
   - COMPLETED: decrements on_hand & reserved quantity (final settlement)
   - Reservation preserved during ACCEPTED, PROCESSING, PACKED, SHIPPED, DELIVERED
4. Historical snapshot integrity (never alters snapshot fields)
5. Chronological status history audit logging
6. Post-commit targeted WebSocket notifications
"""
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.order_status_history import OrderStatusHistory
from app.models.user import User
from app.models.company import Company
from app.repositories.inventory_repo import InventoryRepository
from app.core.exceptions import (
    NotFoundException,
    ConflictException,
    PermissionDeniedException,
    BadRequestException,
)
from app.core.websocket import manager as ws_manager


class OrderLifecycleService:
    # State Transition Rules Matrix
    # Current status -> {target_status: {"allowed_role": str, "inventory_effect": str}}
    VALID_TRANSITIONS: Dict[str, Dict[str, Dict[str, str]]] = {
        "pending": {
            "accepted": {"allowed_role": "supplier", "inventory_effect": "none"},
            "rejected": {"allowed_role": "supplier", "inventory_effect": "release"},
            "cancelled": {"allowed_role": "vendor", "inventory_effect": "release"},
        },
        "accepted": {
            "processing": {"allowed_role": "supplier", "inventory_effect": "none"},
            "in_progress": {"allowed_role": "supplier", "inventory_effect": "none"},  # alias
            "cancelled": {"allowed_role": "vendor", "inventory_effect": "release"},
        },
        "processing": {
            "packed": {"allowed_role": "supplier", "inventory_effect": "none"},
        },
        "in_progress": {  # alias support
            "packed": {"allowed_role": "supplier", "inventory_effect": "none"},
        },
        "packed": {
            "shipped": {"allowed_role": "supplier", "inventory_effect": "none"},
        },
        "shipped": {
            "delivered": {"allowed_role": "vendor", "inventory_effect": "none"},
        },
        "delivered": {
            "completed": {"allowed_role": "vendor", "inventory_effect": "fulfill"},
        },
        "completed": {},
        "rejected": {},
        "cancelled": {},
    }

    def __init__(self, db: AsyncSession):
        self.db = db
        self.inv_repo = InventoryRepository(db)

    @staticmethod
    def normalize_status(st: str) -> str:
        """Normalize status string to lowercase canonical name."""
        s = st.strip().lower()
        if s == "in_progress":
            return "processing"
        if s in ("accept", "accepts"):
            return "accepted"
        if s in ("reject", "rejects"):
            return "rejected"
        if s in ("cancel", "cancels"):
            return "cancelled"
        if s in ("pack", "packs"):
            return "packed"
        if s in ("ship", "ships"):
            return "shipped"
        if s in ("deliver", "delivers"):
            return "delivered"
        if s in ("complete", "completes"):
            return "completed"
        return s

    async def get_order_with_relations(self, order_id: uuid.UUID) -> Optional[OrderRequest]:
        """Fetch order with items, companies, creator, and chronological status history."""
        stmt = (
            select(OrderRequest)
            .options(
                selectinload(OrderRequest.items),
                selectinload(OrderRequest.status_history).selectinload(OrderStatusHistory.changed_by_user),
                selectinload(OrderRequest.vendor_company).selectinload(Company.addresses),
                selectinload(OrderRequest.supplier_company).selectinload(Company.addresses),
                selectinload(OrderRequest.created_by_user),
            )
            .where(OrderRequest.id == order_id, OrderRequest.is_deleted == False)
        )
        res = await self.db.execute(stmt)
        return res.scalars().first()

    async def transition_order_status(
        self,
        order_id: uuid.UUID,
        target_status_raw: str,
        current_user: User,
        note: Optional[str] = None,
        delivery_date: Optional[date] = None,
    ) -> OrderRequest:
        """
        Execute a validated, company-authorized, transactional order status transition.
        Applies inventory side effects atomically, records status history, commits,
        and broadcasts WebSocket notifications.
        """
        order = await self.get_order_with_relations(order_id)
        if not order:
            raise NotFoundException(detail="Order not found")

        current_status = self.normalize_status(order.status)
        target_status = self.normalize_status(target_status_raw)

        # 1. Check if order is already in a terminal state
        if current_status in ("completed", "rejected", "cancelled"):
            raise ConflictException(
                detail=f"Cannot transition order: order is already in terminal state '{current_status}'"
            )

        # 2. Check if transition is defined in state machine
        valid_targets = self.VALID_TRANSITIONS.get(current_status, {})
        rule = valid_targets.get(target_status)

        if not rule:
            raise ConflictException(
                detail=f"Invalid status transition from '{current_status}' to '{target_status}'"
            )

        allowed_role = rule["allowed_role"]
        inventory_effect = rule["inventory_effect"]

        # 3. Company-level authorization check
        user_role = "vendor"
        if "role" in current_user.__dict__ and current_user.role is not None:
            user_role = current_user.role.name.lower()
        elif current_user.role_id is not None:
            from app.models.role import Role
            role_res = await self.db.execute(select(Role.name).where(Role.id == current_user.role_id))
            r_name = role_res.scalar_one_or_none()
            if r_name:
                user_role = r_name.lower()

        is_admin = user_role == "admin"

        if allowed_role == "supplier":
            if not is_admin and (current_user.company_id != order.supplier_company_id or user_role != "supplier"):
                raise PermissionDeniedException(
                    detail="Only the assigned supplier company may perform this transition"
                )
        elif allowed_role == "vendor":
            if not is_admin and (current_user.company_id != order.vendor_company_id or user_role != "vendor"):
                raise PermissionDeniedException(
                    detail="Only the ordering vendor company may perform this transition"
                )

        # 4. Apply transactional inventory side effects
        if inventory_effect == "release":
            # Release reserved stock for items with products
            for item in order.items:
                if item.product_id:
                    inv = await self.inv_repo.get_by_product_id_with_lock(item.product_id)
                    if inv:
                        try:
                            await self.inv_repo.release_reserved_stock(inv, item.quantity)
                        except ValueError as e:
                            raise ConflictException(
                                detail=f"Inventory release failed for {item.product_name_snapshot or item.product_name}: {str(e)}"
                            )

        elif inventory_effect == "fulfill":
            # Deduct on_hand and reserved stock (final inventory settlement)
            for item in order.items:
                if item.product_id:
                    inv = await self.inv_repo.get_by_product_id_with_lock(item.product_id)
                    if inv:
                        try:
                            await self.inv_repo.fulfill_stock(inv, item.quantity)
                        except ValueError as e:
                            raise ConflictException(
                                detail=f"Inventory fulfillment failed for {item.product_name_snapshot or item.product_name}: {str(e)}"
                            )

        # 5. Record status history entry
        history_entry = OrderStatusHistory(
            order_request_id=order.id,
            from_status=current_status,
            to_status=target_status,
            changed_by_user_id=current_user.id,
            note=note,
        )
        self.db.add(history_entry)

        # 6. Update OrderRequest fields
        order.status = target_status
        if note:
            if target_status in ("accepted", "rejected"):
                order.supplier_response = note
                order.responded_at = datetime.now(timezone.utc)
            elif not order.supplier_response and allowed_role == "supplier":
                order.supplier_response = note

        if delivery_date:
            order.delivery_date = delivery_date

        # Resolve company names for human-readable notifications
        supplier_name = "Supplier"
        vendor_name = "Vendor"
        from app.models.company import Company
        supp_res = await self.db.execute(select(Company.company_name).where(Company.id == order.supplier_company_id))
        s_row = supp_res.scalar_one_or_none()
        if s_row:
            supplier_name = s_row

        vend_res = await self.db.execute(select(Company.company_name).where(Company.id == order.vendor_company_id))
        v_row = vend_res.scalar_one_or_none()
        if v_row:
            vendor_name = v_row

        from app.services.notification_service import NotificationService
        notif_service = NotificationService(self.db)
        await notif_service.notify_order_status_change(
            order=order,
            from_status=current_status,
            to_status=target_status,
            actor=current_user,
            supplier_company_name=supplier_name,
            vendor_company_name=vendor_name,
            rejection_reason=note if target_status in ("rejected", "cancelled") else None,
        )

        # 7. Commit database transaction atomically (including notifications)
        await self.db.commit()
        await self.db.refresh(order)

        # 8. Send real-time WebSocket notifications AFTER successful commit
        await self._send_transition_notification(order, current_status, target_status, current_user, note)

        return order

    async def _send_transition_notification(
        self,
        order: OrderRequest,
        from_status: str,
        to_status: str,
        actor: User,
        note: Optional[str] = None,
    ) -> None:
        """Broadcast post-commit real-time event to the appropriate counterparty users."""
        order_number = f"ORD-2026-{str(order.id)[:6].upper()}"

        # Determine target user IDs
        recipient_user_ids: List[str] = []

        if actor.company_id == order.supplier_company_id:
            # Supplier acted -> Notify vendor
            recipient_user_ids.append(str(order.created_by_user_id))
            # Also notify any active users in vendor company
            vendor_users_res = await self.db.execute(
                select(User.id).where(User.company_id == order.vendor_company_id, User.is_active == True)
            )
            for uid in vendor_users_res.scalars().all():
                if str(uid) not in recipient_user_ids:
                    recipient_user_ids.append(str(uid))
        else:
            # Vendor acted -> Notify supplier users
            supplier_users_res = await self.db.execute(
                select(User.id).where(User.company_id == order.supplier_company_id, User.is_active == True)
            )
            for uid in supplier_users_res.scalars().all():
                recipient_user_ids.append(str(uid))

        actor_role_name = "user"
        if "role" in actor.__dict__ and actor.role is not None:
            actor_role_name = actor.role.name
        elif actor.role_id is not None:
            from app.models.role import Role
            role_res = await self.db.execute(select(Role.name).where(Role.id == actor.role_id))
            r_name = role_res.scalar_one_or_none()
            if r_name:
                actor_role_name = r_name

        payload = {
            "type": "order_status_updated",
            "data": {
                "id": str(order.id),
                "order_number": order_number,
                "title": order.title,
                "from_status": from_status,
                "status": to_status,
                "note": note,
                "actor_name": actor.full_name,
                "actor_role": actor_role_name,
                "supplier_response": order.supplier_response,
                "responded_at": order.responded_at.isoformat() if order.responded_at else None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

        for uid in recipient_user_ids:
            try:
                await ws_manager.send_to_user(uid, payload)
            except Exception:
                # WebSocket delivery failure should never rollback committed business transactions
                pass
