from decimal import Decimal
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.user import User
from app.models.invoice import Invoice
from app.core.exceptions import PermissionDeniedException


async def get_outstanding_invoices(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve unpaid, partially paid, or overdue invoices for the authenticated user's company."""
    stmt = (
        select(Invoice)
        .where(
            Invoice.is_deleted == False,
            Invoice.payment_status.in_(["unpaid", "partially_paid", "overdue"]),
        )
        .order_by(desc(Invoice.invoice_date))
        .limit(20)
    )

    if current_user.role.name == "supplier":
        stmt = stmt.where(Invoice.supplier_company_id == current_user.company_id)
    elif current_user.role.name == "vendor":
        stmt = stmt.where(Invoice.vendor_company_id == current_user.company_id)
    elif current_user.role.name != "admin":
        raise PermissionDeniedException("Unauthorized to view invoice records.")

    result = await db.execute(stmt)
    records = result.scalars().all()

    invoices = []
    total_outstanding = Decimal("0.00")
    for inv in records:
        balance = inv.total_amount - inv.paid_amount
        total_outstanding += balance
        invoices.append({
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.strftime("%Y-%m-%d"),
            "due_date": inv.due_date.strftime("%Y-%m-%d"),
            "total_amount": str(inv.total_amount),
            "paid_amount": str(inv.paid_amount),
            "balance_due": str(balance),
            "payment_status": inv.payment_status,
            "supplier_name": inv.supplier_company_name,
            "vendor_name": inv.vendor_company_name,
        })

    return {
        "count": len(invoices),
        "total_outstanding": str(total_outstanding),
        "invoices": invoices,
    }


async def get_recent_invoices(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve the most recent invoices issued or received."""
    limit = int(arguments.get("limit", 10))
    limit = max(1, min(limit, 25))

    stmt = (
        select(Invoice)
        .where(Invoice.is_deleted == False)
        .order_by(desc(Invoice.invoice_date))
        .limit(limit)
    )

    if current_user.role.name == "supplier":
        stmt = stmt.where(Invoice.supplier_company_id == current_user.company_id)
    elif current_user.role.name == "vendor":
        stmt = stmt.where(Invoice.vendor_company_id == current_user.company_id)
    elif current_user.role.name != "admin":
        raise PermissionDeniedException("Unauthorized to view invoice records.")

    result = await db.execute(stmt)
    records = result.scalars().all()

    invoices = []
    for inv in records:
        invoices.append({
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.strftime("%Y-%m-%d"),
            "due_date": inv.due_date.strftime("%Y-%m-%d"),
            "total_amount": str(inv.total_amount),
            "paid_amount": str(inv.paid_amount),
            "payment_status": inv.payment_status,
        })

    return {
        "count": len(invoices),
        "invoices": invoices,
    }


async def get_payment_summary(db: AsyncSession, current_user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Retrieve aggregated financial totals (total invoiced, total paid, and total outstanding balance). Strictly read-only."""
    stmt = select(Invoice).where(Invoice.is_deleted == False)

    if current_user.role.name == "supplier":
        stmt = stmt.where(Invoice.supplier_company_id == current_user.company_id)
    elif current_user.role.name == "vendor":
        stmt = stmt.where(Invoice.vendor_company_id == current_user.company_id)
    elif current_user.role.name != "admin":
        raise PermissionDeniedException("Unauthorized to view financial records.")

    result = await db.execute(stmt)
    records = result.scalars().all()

    total_invoiced = sum((inv.total_amount for inv in records), Decimal("0.00"))
    total_paid = sum((inv.paid_amount for inv in records), Decimal("0.00"))
    total_outstanding = total_invoiced - total_paid

    unpaid_count = sum(1 for inv in records if inv.payment_status == "unpaid")
    partial_count = sum(1 for inv in records if inv.payment_status == "partially_paid")
    paid_count = sum(1 for inv in records if inv.payment_status == "paid")

    return {
        "total_invoices": len(records),
        "total_invoiced": str(total_invoiced),
        "total_paid": str(total_paid),
        "total_outstanding": str(total_outstanding),
        "unpaid_invoices_count": unpaid_count,
        "partially_paid_invoices_count": partial_count,
        "paid_invoices_count": paid_count,
    }
