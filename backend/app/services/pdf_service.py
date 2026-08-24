import io
from decimal import Decimal
from datetime import datetime, date
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from app.models.invoice import Invoice


class InvoicePDFService:
    @staticmethod
    def generate_invoice_pdf(invoice: Invoice) -> io.BytesIO:
        """Generate a crisp, publication-grade B2B PDF invoice using ReportLab."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
            pageCompression=0,
        )

        styles = getSampleStyleSheet()
        normal = styles["Normal"]

        # Custom Palette & Styles
        primary_color = colors.HexColor("#0f172a")  # Slate 900
        accent_color = colors.HexColor("#059669")   # Emerald 600
        muted_color = colors.HexColor("#64748b")    # Slate 500
        border_color = colors.HexColor("#e2e8f0")   # Slate 200
        bg_light = colors.HexColor("#f8fafc")       # Slate 50

        title_style = ParagraphStyle(
            "DocTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=primary_color,
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=muted_color,
        )
        meta_label_style = ParagraphStyle(
            "MetaLabel",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=muted_color,
            textTransform="uppercase",
        )
        meta_val_style = ParagraphStyle(
            "MetaVal",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=primary_color,
        )
        body_style = ParagraphStyle(
            "Body",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=primary_color,
        )
        table_hdr_style = ParagraphStyle(
            "TableHdr",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white,
        )
        table_hdr_right = ParagraphStyle(
            "TableHdrR",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=2,
        )
        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=normal,
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=primary_color,
        )
        table_cell_right = ParagraphStyle(
            "TableCellR",
            parent=normal,
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=primary_color,
            alignment=2,
        )
        table_cell_bold_right = ParagraphStyle(
            "TableCellBR",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=primary_color,
            alignment=2,
        )

        elements = []

        # ── 1. Top Header Banner ─────────────────────────────────────────
        header_data = [
            [
                Paragraph("<b>FLOWZA</b><br/><font size=8 color='#059669'>B2B PROCUREMENT PLATFORM</font>", title_style),
                Paragraph(
                    f"<b>TAX INVOICE</b><br/>"
                    f"<font size=10 color='#059669'><b>{invoice.invoice_number}</b></font><br/>"
                    f"<font size=8 color='#64748b'>Status: <b>{invoice.payment_status.upper()}</b></font>",
                    table_hdr_right,
                ),
            ]
        ]
        header_table = Table(header_data, colWidths=[3.5 * inch, 3.5 * inch])
        header_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ])
        )
        elements.append(header_table)
        elements.append(Spacer(1, 14))

        # ── 2. Meta Grid (Dates & Order Reference) ────────────────────────
        order_num = f"ORD-{str(invoice.order_request_id)[:8].upper()}"
        inv_date_str = invoice.invoice_date.strftime("%d %b %Y") if invoice.invoice_date else "N/A"
        due_date_str = invoice.due_date.strftime("%d %b %Y") if invoice.due_date else "N/A"

        meta_data = [
            [
                Paragraph("<b>INVOICE DATE</b>", meta_label_style),
                Paragraph("<b>PAYMENT DUE</b>", meta_label_style),
                Paragraph("<b>ORDER REFERENCE</b>", meta_label_style),
                Paragraph("<b>PAYMENT STATUS</b>", meta_label_style),
            ],
            [
                Paragraph(inv_date_str, meta_val_style),
                Paragraph(due_date_str, meta_val_style),
                Paragraph(order_num, meta_val_style),
                Paragraph(invoice.payment_status.upper(), meta_val_style),
            ],
        ]
        meta_table = Table(meta_data, colWidths=[1.75 * inch, 1.75 * inch, 1.75 * inch, 1.75 * inch])
        meta_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), bg_light),
                ("BOX", (0, 0), (-1, -1), 0.5, border_color),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # ── 3. Parties Box (Seller / Supplier vs Buyer / Vendor) ───────────
        supplier_gst = f"GSTIN: {invoice.supplier_gst_number}" if invoice.supplier_gst_number else "GSTIN: Unregistered"
        vendor_gst = f"GSTIN: {invoice.vendor_gst_number}" if invoice.vendor_gst_number else "GSTIN: Unregistered"

        parties_data = [
            [
                Paragraph("<b>SELLER (SUPPLIER)</b>", meta_label_style),
                Paragraph("<b>BILL TO & SHIP TO (BUYER)</b>", meta_label_style),
            ],
            [
                Paragraph(
                    f"<b>{invoice.supplier_company_name}</b><br/>"
                    f"{invoice.supplier_address or 'Address on file'}<br/>"
                    f"<b>{supplier_gst}</b>",
                    body_style,
                ),
                Paragraph(
                    f"<b>{invoice.vendor_company_name}</b><br/>"
                    f"{invoice.billing_address or invoice.vendor_address or 'Address on file'}<br/>"
                    f"<b>{vendor_gst}</b>",
                    body_style,
                ),
            ],
        ]
        parties_table = Table(parties_data, colWidths=[3.5 * inch, 3.5 * inch])
        parties_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.5, border_color),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        elements.append(parties_table)
        elements.append(Spacer(1, 16))

        # ── 4. Itemized Products Table ─────────────────────────────────────
        items_header = [
            Paragraph("#", table_hdr_style),
            Paragraph("PRODUCT DESCRIPTION", table_hdr_style),
            Paragraph("SKU", table_hdr_style),
            Paragraph("QTY", table_hdr_right),
            Paragraph("UNIT PRICE", table_hdr_right),
            Paragraph("TAX", table_hdr_right),
            Paragraph("TOTAL (INR)", table_hdr_right),
        ]
        items_rows = [items_header]

        for idx, it in enumerate(invoice.items, start=1):
            tax_desc = f"{it.tax_rate * 100:.0f}%" if it.tax_rate else "0%"
            items_rows.append([
                Paragraph(str(idx), table_cell_style),
                Paragraph(f"<b>{it.product_name_snapshot}</b>", table_cell_style),
                Paragraph(it.sku_snapshot or "N/A", table_cell_style),
                Paragraph(f"{it.quantity} {it.unit}", table_cell_right),
                Paragraph(f"₹{it.unit_price:,.2f}", table_cell_right),
                Paragraph(f"₹{it.tax_amount:,.2f} ({tax_desc})", table_cell_right),
                Paragraph(f"₹{it.line_total:,.2f}", table_cell_bold_right),
            ])

        col_widths = [0.4 * inch, 2.2 * inch, 1.0 * inch, 0.8 * inch, 0.9 * inch, 0.9 * inch, 1.1 * inch]
        items_table = Table(items_rows, colWidths=col_widths)
        items_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), primary_color),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("BOX", (0, 0), (-1, -1), 0.5, border_color),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ])
        )
        elements.append(items_table)
        elements.append(Spacer(1, 14))

        # ── 5. Financial Summary & Total Box ───────────────────────────────
        balance_due = max(Decimal("0.00"), invoice.total_amount - invoice.paid_amount)

        summary_data = [
            [Paragraph("<b>Notes / Instructions:</b>", meta_label_style), Paragraph("<b>Subtotal:</b>", table_cell_right), Paragraph(f"₹{invoice.subtotal:,.2f}", table_cell_bold_right)],
            [Paragraph(invoice.notes or "Payment due per B2B procurement contract.", body_style), Paragraph("<b>GST / Tax:</b>", table_cell_right), Paragraph(f"₹{invoice.tax_amount:,.2f}", table_cell_bold_right)],
            [Paragraph("", body_style), Paragraph("<b>Discount:</b>", table_cell_right), Paragraph(f"- ₹{invoice.discount_amount:,.2f}", table_cell_bold_right)],
            [Paragraph("", body_style), Paragraph("<b>Grand Total:</b>", table_hdr_right), Paragraph(f"<b>₹{invoice.total_amount:,.2f}</b>", table_hdr_right)],
            [Paragraph("", body_style), Paragraph("<b>Amount Paid:</b>", table_cell_right), Paragraph(f"₹{invoice.paid_amount:,.2f}", table_cell_bold_right)],
            [Paragraph("", body_style), Paragraph("<b>Balance Due:</b>", table_cell_right), Paragraph(f"<b>₹{balance_due:,.2f}</b>", table_cell_bold_right)],
        ]

        summary_table = Table(summary_data, colWidths=[3.5 * inch, 1.8 * inch, 1.9 * inch])
        summary_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (1, 3), (2, 3), primary_color),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        elements.append(summary_table)
        elements.append(Spacer(1, 24))

        # ── 6. Footer Stamp ────────────────────────────────────────────────
        elements.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceAfter=8))
        footer_text = (
            "This is an electronically generated and digitally stamped tax invoice generated on the Flowza Platform.<br/>"
            "All financial snapshots are historically locked."
        )
        elements.append(Paragraph(footer_text, subtitle_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer
