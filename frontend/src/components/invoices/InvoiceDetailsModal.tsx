import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Invoice } from '../../types';
import { invoiceService } from '../../services/invoiceService';
import { toast } from 'sonner';
import {
  Download,
  Printer,
  Building,
  MapPin,
  ShieldCheck,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  isSupplier?: boolean;
  onOpenRecordPayment?: (invoice: Invoice) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  onClose,
  invoice,
  isSupplier = false,
  onOpenRecordPayment,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      await invoiceService.downloadInvoicePdf(invoice.id, invoice.invoice_number);
      toast.success('Invoice PDF downloaded successfully');
    } catch (err: any) {
      toast.error('Failed to download invoice PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const isPaid = invoice.payment_status === 'paid';
  const isPartiallyPaid = invoice.payment_status === 'partially_paid';
  const isUnpaid = invoice.payment_status === 'unpaid';
  const isOverdue = invoice.payment_status === 'overdue';

  const orderNum = `ORD-${invoice.order_request_id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
    >
      <div className="space-y-6 pt-1 text-slate-900 dark:text-slate-100">
        {/* ── Document Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">FLOWZA</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-md">
                B2B Tax Invoice
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Official B2B Commercial Procurement Record</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-mono font-bold text-emerald-400 block">{invoice.invoice_number}</span>
            <div className="flex items-center sm:justify-end gap-2 mt-1">
              <Badge
                variant={
                  isPaid ? 'success' : isPartiallyPaid ? 'primary' : isOverdue ? 'destructive' : 'warning'
                }
                className="text-xxs uppercase font-extrabold"
              >
                ● {invoice.payment_status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Meta Info Grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Invoice Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Due Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Purchase Order</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{orderNum}</span>
          </div>
          <div>
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Currency</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {invoice.currency || 'INR'} (₹)
            </span>
          </div>
        </div>

        {/* ── Seller & Buyer Company Cards ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Supplier (Seller) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2">
            <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
              Seller (Supplier)
            </span>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                {invoice.supplier_company_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{invoice.supplier_company_name}</h4>
                <p className="text-xxs text-slate-400">
                  {invoice.supplier_gst_number ? `GSTIN: ${invoice.supplier_gst_number}` : 'GST: Unregistered'}
                </p>
              </div>
            </div>
            <p className="text-xxs text-slate-500 dark:text-slate-400 flex items-start gap-1 mt-1 leading-relaxed">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              {invoice.supplier_address || 'Address on file'}
            </p>
          </div>

          {/* Vendor (Buyer) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2">
            <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
              Bill To & Ship To (Buyer)
            </span>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-600/10 text-blue-600 font-bold text-xs flex items-center justify-center">
                {invoice.vendor_company_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{invoice.vendor_company_name}</h4>
                <p className="text-xxs text-slate-400">
                  {invoice.vendor_gst_number ? `GSTIN: ${invoice.vendor_gst_number}` : 'GST: Unregistered'}
                </p>
              </div>
            </div>
            <p className="text-xxs text-slate-500 dark:text-slate-400 flex items-start gap-1 mt-1 leading-relaxed">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              {invoice.billing_address || invoice.vendor_address || 'Address on file'}
            </p>
          </div>
        </div>

        {/* ── Line Items Table ───────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white flex justify-between">
            <span>Itemized Breakdown ({invoice.items?.length || 0})</span>
            <span className="text-xxs font-mono text-slate-400">Historical Lock</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xxs font-bold text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-900/50">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Product Description</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Tax (GST)</th>
                <th className="p-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoice.items?.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="p-3 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{item.product_name_snapshot}</td>
                  <td className="p-3 font-mono text-slate-400">{item.sku_snapshot || 'N/A'}</td>
                  <td className="p-3 text-center font-mono">
                    {item.quantity} <span className="text-slate-400 text-xxs">{item.unit}</span>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    ₹{Number(item.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xxs text-slate-400">({(Number(item.tax_rate) * 100).toFixed(0)}%)</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    ₹{Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Financial Totals Summary Box ───────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="space-y-1 max-w-sm">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Notes & Terms</span>
            <p className="text-slate-600 dark:text-slate-400 italic">
              {invoice.notes || 'Payment terms: 30 days net from invoice date.'}
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">
                ₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>GST / Tax:</span>
              <span className="font-mono font-semibold">
                ₹{Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-500">
                <span>Discount:</span>
                <span className="font-mono font-semibold">
                  -₹{Number(invoice.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                ₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-600">
                ₹{Number(invoice.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>Balance Due:</span>
              <span className="font-mono text-rose-500">
                ₹{Number(invoice.balance_due || (invoice.total_amount - (invoice.paid_amount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Payment Audit Trail Log (If any payments) ─────────────── */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Recorded Payments & Settlement Log
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoice.payments.map((p, idx) => (
                <div key={p.id || idx} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {p.method.replace('_', ' ')}
                    </span>
                    {p.reference && <span className="text-slate-400 ml-1.5 font-mono text-xxs">Ref: {p.reference}</span>}
                    <p className="text-xxs text-slate-400">
                      {new Date(p.payment_date).toLocaleDateString()} {p.notes ? `• "${p.notes}"` : ''}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Buttons Footer ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {isSupplier && !isPaid && onOpenRecordPayment && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenRecordPayment(invoice);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Record Payment
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              {isDownloading ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
