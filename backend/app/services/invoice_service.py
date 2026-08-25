import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.invoice import Invoice, InvoiceItem, PaymentRecord
from app.models.order_request import OrderRequest, OrderRequestItem
from app.models.company import Company
from app.models.user import User
from app.models.role import Role
from app.repositories.invoice_repo import InvoiceRepository
from app.schemas.invoice import (
    InvoiceGenerateRequest,
    PaymentRecordCreate,
    InvoiceResponse,
    InvoiceDetailResponse,
    InvoiceItemResponse,
    PaymentRecordResponse,
)
from app.core.exceptions import (
    NotFoundException,
    ConflictException,
    PermissionDeniedException,
    BadRequestException,
)


def _quantize_money(val: Decimal) -> Decimal:
    """Consistently round monetary amounts to 2 decimal places."""
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _build_invoice_response(inv: Invoice) -> InvoiceResponse:
    balance_due = max(Decimal("0.00"), inv.total_amount - inv.paid_amount)
    return InvoiceResponse(
        id=inv.id,
        order_request_id=inv.order_request_id,
        invoice_number=inv.invoice_number,
        vendor_company_id=inv.vendor_company_id,
        supplier_company_id=inv.supplier_company_id,
        vendor_company_name=inv.vendor_company_name,
        supplier_company_name=inv.supplier_company_name,
        invoice_date=inv.invoice_date,
        due_date=inv.due_date,
        currency=inv.currency,
        status=inv.status,
        payment_status=inv.payment_status,
        subtotal=inv.subtotal,
        tax_amount=inv.tax_amount,
        discount_amount=inv.discount_amount,
        total_amount=inv.total_amount,
        paid_amount=inv.paid_amount,
        balance_due=balance_due,
        item_count=len(inv.items) if inv.items else 0,
        created_at=inv.created_at,
    )


def _build_invoice_detail_response(inv: Invoice) -> InvoiceDetailResponse:
    balance_due = max(Decimal("0.00"), inv.total_amount - inv.paid_amount)
    items_resp = [
        InvoiceItemResponse(
            id=it.id,
            order_request_item_id=it.order_request_item_id,
            product_id=it.product_id,
            product_name_snapshot=it.product_name_snapshot,
            sku_snapshot=it.sku_snapshot,
            quantity=it.quantity,
            unit=it.unit,
            unit_price=it.unit_price,
            line_subtotal=it.line_subtotal,
            tax_rate=it.tax_rate,
            tax_amount=it.tax_amount,
            line_total=it.line_total,
        )
        for it in (inv.items or [])
    ]

    payments_resp = [
        PaymentRecordResponse(
            id=p.id,
            invoice_id=p.invoice_id,
            amount=p.amount,
            payment_date=p.payment_date,
            method=p.method,
            reference=p.reference,
            notes=p.notes,
            recorded_by_user_id=p.recorded_by_user_id,
            recorded_by_name=p.recorded_by_user.full_name if p.recorded_by_user else None,
            created_at=p.created_at,
        )
        for p in (inv.payments or [])
    ]

    return InvoiceDetailResponse(
        id=inv.id,
        order_request_id=inv.order_request_id,
        invoice_number=inv.invoice_number,
        vendor_company_id=inv.vendor_company_id,
        supplier_company_id=inv.supplier_company_id,
        created_by_user_id=inv.created_by_user_id,
        invoice_date=inv.invoice_date,
        due_date=inv.due_date,
        currency=inv.currency,
        status=inv.status,
        payment_status=inv.payment_status,
        subtotal=inv.subtotal,
        tax_amount=inv.tax_amount,
        discount_amount=inv.discount_amount,
        total_amount=inv.total_amount,
        paid_amount=inv.paid_amount,
        balance_due=balance_due,
        notes=inv.notes,
        billing_address=inv.billing_address,
        shipping_address=inv.shipping_address,
        supplier_company_name=inv.supplier_company_name,
        supplier_gst_number=inv.supplier_gst_number,
        supplier_address=inv.supplier_address,
        vendor_company_name=inv.vendor_company_name,
        vendor_gst_number=inv.vendor_gst_number,
        vendor_address=inv.vendor_address,
        items=items_resp,
        payments=payments_resp,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


class InvoiceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.invoice_repo = InvoiceRepository(db)

    async def _resolve_user_role(self, user: User) -> str:
        if "role" in user.__dict__ and user.role is not None:
            return user.role.name.lower()
        if user.role_id is not None:
            res = await self.db.execute(select(Role.name).where(Role.id == user.role_id))
            name = res.scalar_one_or_none()
            if name:
                return name.lower()
        return "vendor"

    async def generate_invoice_for_order(
        self,
        order_id: uuid.UUID,
        current_user: User,
        req: Optional[InvoiceGenerateRequest] = None,
    ) -> Invoice:
        """
        Transactional invoice generation:
        1. Verify order exists.
        2. Verify order status is COMPLETED.
        3. Authorize caller (Supplier or Admin).
        4. Enforce 1:0..1 constraint (invoice must not already exist).
        5. Extract historical snapshots and calculate Decimal totals.
        6. Persist atomically.
        """
        req = req or InvoiceGenerateRequest()

        # 1. Load order with all relations
        order_result = await self.db.execute(
            select(OrderRequest)
            .options(
                selectinload(OrderRequest.items).selectinload(OrderRequestItem.product),
                selectinload(OrderRequest.supplier_company).selectinload(Company.addresses),
                selectinload(OrderRequest.vendor_company).selectinload(Company.addresses),
            )
            .where(OrderRequest.id == order_id, OrderRequest.is_deleted == False)
        )
        order = order_result.scalars().first()
        if not order:
            raise NotFoundException(detail="Purchase order not found")

        # 2. Status eligibility check: ONLY COMPLETED orders can be invoiced
        current_order_status = (order.status or "").lower()
        if current_order_status != "completed":
            raise ConflictException(
                detail=f"Invoices can only be generated for COMPLETED orders (current status: '{current_order_status.upper()}')."
            )

        # 3. Role & Multi-Tenant Authorization Check
        user_role = await self._resolve_user_role(current_user)
        is_admin = user_role == "admin"
        if not is_admin:
            if current_user.company_id != order.supplier_company_id or user_role != "supplier":
                raise PermissionDeniedException(
                    detail="Only the assigned supplier organization may generate the invoice for this order"
                )

        # 4. Enforce UNIQUE 1:0..1 constraint
        existing_invoice = await self.invoice_repo.get_by_order_id(order_id)
        if existing_invoice:
            raise ConflictException(
                detail=f"An invoice ({existing_invoice.invoice_number}) has already been generated for this order"
            )

        if not order.items:
            raise BadRequestException(detail="Cannot generate an invoice for an order with no line items")

        # 5. Extract Company Snapshots
        sup_company = order.supplier_company
        ven_company = order.vendor_company

        sup_address_text = None
        if sup_company and sup_company.addresses:
            addr = sup_company.addresses[0]
            sup_address_text = f"{addr.address_line}, {addr.city}, {addr.state} - {addr.country}"

        ven_address_text = None
        if ven_company and ven_company.addresses:
            addr = ven_company.addresses[0]
            ven_address_text = f"{addr.address_line}, {addr.city}, {addr.state} - {addr.country}"

        today = date.today()
        due = req.due_date or (today + timedelta(days=30))
        tax_rate = _quantize_money(req.default_tax_rate or Decimal("0.00"))
        discount = _quantize_money(req.discount_amount or Decimal("0.00"))

        # Generate unique human-readable invoice number
        invoice_number = await self.invoice_repo.get_next_invoice_number(today.year)

        # 6. Build Invoice Header
        invoice = Invoice(
            order_request_id=order.id,
            invoice_number=invoice_number,
            vendor_company_id=order.vendor_company_id,
            supplier_company_id=order.supplier_company_id,
            created_by_user_id=current_user.id,
            invoice_date=today,
            due_date=due,
            currency="INR",
            status="generated",
            payment_status="unpaid",
            subtotal=Decimal("0.00"),  # will sum below
            tax_amount=Decimal("0.00"),
            discount_amount=discount,
            total_amount=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            notes=req.notes or f"Invoice for completed order ORD-{str(order.id)[:6].upper()}",
            billing_address=order.delivery_address or ven_address_text,
            shipping_address=order.delivery_address or ven_address_text,
            supplier_company_name=sup_company.company_name if sup_company else "Supplier Organization",
            supplier_gst_number=sup_company.gst_number if sup_company else None,
            supplier_address=sup_address_text,
            vendor_company_name=ven_company.company_name if ven_company else "Vendor Organization",
            vendor_gst_number=ven_company.gst_number if ven_company else None,
            vendor_address=ven_address_text,
        )

        # 7. Build Invoice Items using Historical Snapshots
        calculated_subtotal = Decimal("0.00")
        calculated_tax = Decimal("0.00")

        for item in order.items:
            # Strictly use item historical price & name snapshot
            unit_price = _quantize_money(
                Decimal(str(item.unit_price if item.unit_price is not None else item.estimated_price or 0))
            )
            qty = max(1, item.quantity)
            line_sub = _quantize_money(unit_price * qty)
            line_tax_val = _quantize_money(line_sub * tax_rate)
            line_tot = _quantize_money(line_sub + line_tax_val)

            # Historical SKU snapshot resolution
            sku = item.sku_snapshot or (item.product.sku if item.product else None)

            inv_item = InvoiceItem(
                invoice_id=invoice.id,
                order_request_item_id=item.id,
                product_id=item.product_id,
                product_name_snapshot=item.product_name_snapshot or item.product_name,
                sku_snapshot=sku,
                quantity=qty,
                unit=item.unit or "units",
                unit_price=unit_price,
                line_subtotal=line_sub,
                tax_rate=tax_rate,
                tax_amount=line_tax_val,
                line_total=line_tot,
            )
            invoice.items.append(inv_item)

            calculated_subtotal += line_sub
            calculated_tax += line_tax_val

        # Final Header totals
        invoice.subtotal = _quantize_money(calculated_subtotal)
        invoice.tax_amount = _quantize_money(calculated_tax)
        invoice.total_amount = _quantize_money(
            max(Decimal("0.00"), invoice.subtotal + invoice.tax_amount - invoice.discount_amount)
        )

        # Add invoice and create persistent notification within the transaction
        await self.invoice_repo.create_invoice(invoice)
        
        from app.services.notification_service import NotificationService
        notif_service = NotificationService(self.db)
        await notif_service.notify_invoice_generated(invoice=invoice, order=order)

        # Commit transaction atomically (including notifications)
        await self.db.commit()

        # Reload with all relations
        created = await self.invoice_repo.get_by_id(invoice.id)
        return created

    async def get_invoice_by_id(self, invoice_id: uuid.UUID, current_user: User) -> Invoice:
        """Fetch invoice with multi-tenant company authorization."""
        invoice = await self.invoice_repo.get_by_id(invoice_id)
        if not invoice:
            raise NotFoundException(detail="Invoice not found")

        user_role = await self._resolve_user_role(current_user)
        if user_role != "admin":
            if (
                current_user.company_id != invoice.supplier_company_id
                and current_user.company_id != invoice.vendor_company_id
            ):
                raise PermissionDeniedException(detail="You are not authorized to view this invoice")

        return invoice

    async def get_invoice_by_order_id(self, order_id: uuid.UUID, current_user: User) -> Optional[Invoice]:
        """Lookup invoice by order ID with multi-tenant authorization."""
        invoice = await self.invoice_repo.get_by_order_id(order_id)
        if not invoice:
            return None

        user_role = await self._resolve_user_role(current_user)
        if user_role != "admin":
            if (
                current_user.company_id != invoice.supplier_company_id
                and current_user.company_id != invoice.vendor_company_id
            ):
                raise PermissionDeniedException(detail="You are not authorized to view this invoice")

        return invoice

    async def list_invoices(
        self,
        current_user: User,
        payment_status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Invoice], int]:
        """List company invoices according to user role."""
        offset = max(0, (page - 1) * limit)
        user_role = await self._resolve_user_role(current_user)

        if user_role == "supplier":
            return await self.invoice_repo.list_for_supplier(
                supplier_company_id=current_user.company_id,
                payment_status=payment_status,
                search=search,
                limit=limit,
                offset=offset,
            )
        elif user_role == "vendor":
            return await self.invoice_repo.list_for_vendor(
                vendor_company_id=current_user.company_id,
                payment_status=payment_status,
                search=search,
                limit=limit,
                offset=offset,
            )
        else:
            # Admin lists all via supplier repo fallback or company
            return await self.invoice_repo.list_for_supplier(
                supplier_company_id=current_user.company_id,
                payment_status=payment_status,
                search=search,
                limit=limit,
                offset=offset,
            )

    async def record_payment(
        self,
        invoice_id: uuid.UUID,
        current_user: User,
        req: PaymentRecordCreate,
    ) -> Invoice:
        """
        Record a payment transaction against an invoice.
        Updates paid_amount and shifts payment_status (unpaid -> partially_paid -> paid).
        """
        invoice = await self.get_invoice_by_id(invoice_id, current_user)

        user_role = await self._resolve_user_role(current_user)
        if user_role != "admin" and current_user.company_id != invoice.supplier_company_id:
            raise PermissionDeniedException(detail="Only the supplier company or an admin may record payments")

        payment_amount = _quantize_money(req.amount)
        if payment_amount <= Decimal("0.00"):
            raise BadRequestException(detail="Payment amount must be greater than zero")

        outstanding = invoice.total_amount - invoice.paid_amount
        if payment_amount > outstanding:
            raise BadRequestException(
                detail=f"Payment amount (₹{payment_amount}) cannot exceed remaining balance (₹{outstanding})"
            )

        pay_date = req.payment_date or date.today()
        record = PaymentRecord(
            invoice_id=invoice.id,
            amount=payment_amount,
            payment_date=pay_date,
            method=req.method,
            reference=req.reference,
            notes=req.notes,
            recorded_by_user_id=current_user.id,
        )
        invoice.payments.append(record)

        # Update invoice totals
        invoice.paid_amount = _quantize_money(invoice.paid_amount + payment_amount)
        is_completed = (invoice.paid_amount >= invoice.total_amount)
        if is_completed:
            invoice.payment_status = "paid"
        else:
            invoice.payment_status = "partially_paid"

        # Create persistent notification within transaction
        from app.services.notification_service import NotificationService
        notif_service = NotificationService(self.db)
        await notif_service.notify_payment_recorded(
            invoice=invoice,
            payment=record,
            is_completed=is_completed,
        )

        await self.db.commit()
        return await self.invoice_repo.get_by_id(invoice.id)



    async def get_stats(self, current_user: User) -> dict:
        """Get summary stats for current company."""
        user_role = await self._resolve_user_role(current_user)
        is_supplier = user_role == "supplier"
        return await self.invoice_repo.get_stats_for_company(current_user.company_id, is_supplier=is_supplier)
