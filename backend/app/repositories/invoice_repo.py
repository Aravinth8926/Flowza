import uuid
from datetime import datetime, date
from typing import Optional, List, Tuple
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload
from app.models.invoice import Invoice, InvoiceItem, PaymentRecord
from app.models.order_request import OrderRequest, OrderRequestItem


class InvoiceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        """Fetch invoice with all relationships eager-loaded."""
        result = await self.db.execute(
            select(Invoice)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.payments).selectinload(PaymentRecord.recorded_by_user),
                selectinload(Invoice.order_request),
                selectinload(Invoice.supplier_company),
                selectinload(Invoice.vendor_company),
                selectinload(Invoice.created_by_user),
            )
            .where(Invoice.id == invoice_id, Invoice.is_deleted == False)
        )
        return result.scalars().first()

    async def get_by_order_id(self, order_id: uuid.UUID) -> Optional[Invoice]:
        """Find existing invoice for a specific order."""
        result = await self.db.execute(
            select(Invoice)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.payments),
                selectinload(Invoice.supplier_company),
                selectinload(Invoice.vendor_company),
            )
            .where(Invoice.order_request_id == order_id, Invoice.is_deleted == False)
        )
        return result.scalars().first()

    async def get_by_invoice_number(self, invoice_number: str) -> Optional[Invoice]:
        """Find invoice by human-readable invoice number."""
        result = await self.db.execute(
            select(Invoice).where(Invoice.invoice_number == invoice_number, Invoice.is_deleted == False)
        )
        return result.scalars().first()

    async def get_next_invoice_number(self, year: int) -> str:
        """Generate human-readable sequential invoice number (e.g. INV-2026-000001)."""
        prefix = f"INV-{year}-"
        result = await self.db.execute(
            select(func.count(Invoice.id)).where(Invoice.invoice_number.like(f"{prefix}%"))
        )
        count = result.scalar() or 0
        seq = count + 1
        return f"{prefix}{seq:06d}"

    async def list_for_supplier(
        self,
        supplier_company_id: uuid.UUID,
        payment_status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Invoice], int]:
        """List and search invoices issued by a supplier company."""
        query = select(Invoice).where(
            Invoice.supplier_company_id == supplier_company_id,
            Invoice.is_deleted == False,
        )

        if payment_status and payment_status.lower() != "all":
            query = query.where(Invoice.payment_status == payment_status.lower())

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Invoice.invoice_number.ilike(search_pattern),
                    Invoice.vendor_company_name.ilike(search_pattern),
                    Invoice.notes.ilike(search_pattern),
                )
            )

        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar() or 0

        result = await self.db.execute(
            query.options(
                selectinload(Invoice.items),
                selectinload(Invoice.payments),
                selectinload(Invoice.order_request),
                selectinload(Invoice.vendor_company),
            )
            .order_by(desc(Invoice.created_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total

    async def list_for_vendor(
        self,
        vendor_company_id: uuid.UUID,
        payment_status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Invoice], int]:
        """List and search invoices billed to a vendor company."""
        query = select(Invoice).where(
            Invoice.vendor_company_id == vendor_company_id,
            Invoice.is_deleted == False,
        )

        if payment_status and payment_status.lower() != "all":
            query = query.where(Invoice.payment_status == payment_status.lower())

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Invoice.invoice_number.ilike(search_pattern),
                    Invoice.supplier_company_name.ilike(search_pattern),
                    Invoice.notes.ilike(search_pattern),
                )
            )

        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar() or 0

        result = await self.db.execute(
            query.options(
                selectinload(Invoice.items),
                selectinload(Invoice.payments),
                selectinload(Invoice.order_request),
                selectinload(Invoice.supplier_company),
            )
            .order_by(desc(Invoice.created_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total

    async def get_stats_for_company(self, company_id: uuid.UUID, is_supplier: bool) -> dict:
        """Compute financial totals and counts for supplier or vendor."""
        filter_col = Invoice.supplier_company_id if is_supplier else Invoice.vendor_company_id
        
        result = await self.db.execute(
            select(
                func.count(Invoice.id).label("total_invoices"),
                func.coalesce(func.sum(Invoice.total_amount), Decimal("0.00")).label("total_amount"),
                func.coalesce(func.sum(Invoice.paid_amount), Decimal("0.00")).label("total_paid"),
                func.sum(func.case((Invoice.payment_status == "unpaid", 1), else_=0)).label("unpaid_count"),
                func.sum(func.case((Invoice.payment_status == "partially_paid", 1), else_=0)).label("partial_count"),
                func.sum(func.case((Invoice.payment_status == "paid", 1), else_=0)).label("paid_count"),
                func.sum(func.case((Invoice.payment_status == "overdue", 1), else_=0)).label("overdue_count"),
            ).where(filter_col == company_id, Invoice.is_deleted == False)
        )
        row = result.one()
        total_amt = Decimal(str(row.total_amount or 0))
        paid_amt = Decimal(str(row.total_paid or 0))
        outstanding_amt = max(Decimal("0.00"), total_amt - paid_amt)

        return {
            "total_invoices": row.total_invoices or 0,
            "total_amount": total_amt,
            "total_paid": paid_amt,
            "total_outstanding": outstanding_amt,
            "unpaid_count": row.unpaid_count or 0,
            "partially_paid_count": row.partial_count or 0,
            "paid_count": row.paid_count or 0,
            "overdue_count": row.overdue_count or 0,
        }

    async def create_invoice(self, invoice: Invoice) -> Invoice:
        """Persist invoice and its items."""
        self.db.add(invoice)
        await self.db.flush()
        return invoice

    async def add_payment(self, payment: PaymentRecord) -> PaymentRecord:
        """Persist payment record."""
        self.db.add(payment)
        await self.db.flush()
        return payment
