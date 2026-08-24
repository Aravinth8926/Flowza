import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.invoice_service import InvoiceService, _build_invoice_response, _build_invoice_detail_response
from app.services.pdf_service import InvoicePDFService
from app.schemas.invoice import (
    InvoiceGenerateRequest,
    PaymentRecordCreate,
    PaymentStatusUpdate,
    InvoiceResponse,
    InvoiceDetailResponse,
    InvoiceListResponse,
    InvoiceStatsResponse,
)
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/invoices", tags=["Invoices & Financial Records"])


@router.post("/orders/{order_id}", response_model=dict, status_code=status.HTTP_201_CREATED)
async def generate_invoice_for_order(
    order_id: uuid.UUID,
    req: Optional[InvoiceGenerateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an official, immutable B2B tax invoice for a COMPLETED procurement order.
    Restricted to the assigned Supplier company or platform Admin.
    """
    service = InvoiceService(db)
    invoice = await service.generate_invoice_for_order(order_id, current_user, req)
    return {
        "success": True,
        "message": f"Invoice {invoice.invoice_number} generated successfully",
        "data": _build_invoice_detail_response(invoice),
    }


@router.get("", response_model=dict)
async def list_invoices(
    payment_status: Optional[str] = Query(None, description="Filter by payment status: unpaid, partially_paid, paid, overdue"),
    search: Optional[str] = Query(None, description="Search by invoice number, company name, or notes"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List company invoices with status filtering, search, and pagination.
    Suppliers see issued sales invoices; Vendors see billed procurement invoices.
    """
    service = InvoiceService(db)
    invoices, total = await service.list_invoices(
        current_user=current_user,
        payment_status=payment_status,
        search=search,
        page=page,
        limit=limit,
    )

    items = [_build_invoice_response(inv) for inv in invoices]
    return {
        "success": True,
        "data": {
            "invoices": items,
            "total": total,
            "page": page,
            "limit": limit,
        },
    }


@router.get("/stats", response_model=dict)
async def get_invoice_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get financial summary totals and count breakdown for current company."""
    service = InvoiceService(db)
    stats_data = await service.get_stats(current_user)
    return {
        "success": True,
        "data": stats_data,
    }


@router.get("/order/{order_id}", response_model=dict)
async def get_invoice_by_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lookup invoice for a specific purchase order."""
    service = InvoiceService(db)
    invoice = await service.get_invoice_by_order_id(order_id, current_user)
    if not invoice:
        raise NotFoundException(detail="No invoice generated for this order yet")

    return {
        "success": True,
        "data": _build_invoice_detail_response(invoice),
    }


@router.get("/{invoice_id}", response_model=dict)
async def get_invoice_details(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full details of a specific invoice with items, payments, and company snapshots."""
    service = InvoiceService(db)
    invoice = await service.get_invoice_by_id(invoice_id, current_user)
    return {
        "success": True,
        "data": _build_invoice_detail_response(invoice),
    }


@router.get("/{invoice_id}/download")
async def download_invoice_pdf(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download publication-grade B2B PDF invoice.
    Enforces company-level authorization (supplier or vendor).
    """
    service = InvoiceService(db)
    invoice = await service.get_invoice_by_id(invoice_id, current_user)

    pdf_buffer = InvoicePDFService.generate_invoice_pdf(invoice)
    filename = f"{invoice.invoice_number}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.patch("/{invoice_id}/payment-status", response_model=dict)
async def update_payment_status(
    invoice_id: uuid.UUID,
    req: PaymentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update invoice payment status directly (Supplier / Admin only)."""
    service = InvoiceService(db)
    invoice = await service.update_payment_status(invoice_id, current_user, req)
    return {
        "success": True,
        "message": f"Payment status updated to {invoice.payment_status}",
        "data": _build_invoice_detail_response(invoice),
    }


@router.post("/{invoice_id}/payments", response_model=dict, status_code=status.HTTP_201_CREATED)
async def record_invoice_payment(
    invoice_id: uuid.UUID,
    req: PaymentRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record an incoming payment transaction against an invoice."""
    service = InvoiceService(db)
    invoice = await service.record_payment(invoice_id, current_user, req)
    return {
        "success": True,
        "message": f"Payment of ₹{req.amount} recorded successfully",
        "data": _build_invoice_detail_response(invoice),
    }
