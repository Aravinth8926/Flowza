import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Invoice, InvoiceStats, PaymentStatus } from '../../types';
import { invoiceService } from '../../services/invoiceService';
import { InvoiceDetailsModal } from '../../components/invoices/InvoiceDetailsModal';
import { RecordPaymentModal } from '../../components/invoices/RecordPaymentModal';
import { toast } from 'sonner';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Download,
  Eye,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Building,
} from 'lucide-react';

export const SupplierInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invData, statsData] = await Promise.all([
        invoiceService.getInvoices({
          payment_status: activeTab !== 'all' ? activeTab : undefined,
          search: searchQuery.trim() || undefined,
        }),
        invoiceService.getInvoiceStats(),
      ]);

      setInvoices(invData.invoices || []);
      setStats(statsData);
    } catch (err: any) {
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenDetails = async (invoiceSummary: Invoice) => {
    try {
      const full = await invoiceService.getInvoiceById(invoiceSummary.id);
      setSelectedInvoice(full);
      setIsDetailsOpen(true);
    } catch (err) {
      setSelectedInvoice(invoiceSummary);
      setIsDetailsOpen(true);
    }
  };

  const handleOpenPayment = (invoice: Invoice) => {
    setPaymentTargetInvoice(invoice);
    setIsPaymentOpen(true);
  };

  const handlePaymentRecorded = (updated: Invoice) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
    if (selectedInvoice && selectedInvoice.id === updated.id) {
      setSelectedInvoice(updated);
    }
    fetchData();
  };

  const handleDownloadPDF = async (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toast.info(`Preparing PDF for ${inv.invoice_number}...`);
      await invoiceService.downloadInvoicePdf(inv.id, inv.invoice_number);
      toast.success('Downloaded invoice PDF');
    } catch (err) {
      toast.error('Failed to download invoice PDF');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-500" />
            Sales Invoices & Receivables
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track issued B2B invoices, payment receipts, and outstanding commercial balances.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="self-start text-xs font-semibold">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Financial Stats Overview Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Invoiced</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{Number(stats?.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xxs font-semibold text-slate-400 block">{stats?.total_invoices || 0} Invoices Issued</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Collected Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            ₹{Number(stats?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xxs font-semibold text-emerald-600/80 block">{stats?.paid_count || 0} Fully Paid</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Receivables Due</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            ₹{Number(stats?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xxs font-semibold text-slate-400 block">
            {stats?.unpaid_count || 0} Unpaid • {stats?.partially_paid_count || 0} Partial
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Invoices</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">{stats?.overdue_count || 0}</div>
          <span className="text-xxs font-semibold text-rose-500 block">Requires follow-up</span>
        </div>
      </div>

      {/* ── Filters & Search Header ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'unpaid', label: 'Unpaid' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'paid', label: 'Paid' },
            { id: 'overdue', label: 'Overdue' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Search
          </Button>
        </form>
      </div>

      {/* ── Invoices List Table ────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
            <p className="text-xs">Loading commercial invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Invoices Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Invoices are automatically generated when completed purchase orders are fulfilled and closed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xxs font-bold text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Customer (Vendor)</th>
                  <th className="p-3.5">Issue Date</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5 text-right">Total Amount</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => {
                  const isPaid = inv.payment_status === 'paid';
                  const isPart = inv.payment_status === 'partially_paid';
                  const isOver = inv.payment_status === 'overdue';
                  const balance = inv.balance_due ?? (inv.total_amount - (inv.paid_amount || 0));

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleOpenDetails(inv)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {inv.invoice_number}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        ORD-{inv.order_request_id.slice(0, 6).toUpperCase()}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {inv.vendor_company_name}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(inv.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(inv.due_date).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-500">
                        ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge
                          variant={isPaid ? 'success' : isPart ? 'primary' : isOver ? 'destructive' : 'warning'}
                          className="text-xxs uppercase font-extrabold"
                        >
                          {inv.payment_status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPayment(inv)}
                              className="h-7 px-2 text-xxs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            >
                              <CreditCard className="w-3 h-3 mr-1" /> Pay
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDownloadPDF(inv, e)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDetails(inv)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <InvoiceDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        invoice={selectedInvoice}
        isSupplier={true}
        onOpenRecordPayment={(inv) => {
          setIsDetailsOpen(false);
          handleOpenPayment(inv);
        }}
      />

      <RecordPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        invoice={paymentTargetInvoice}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  );
};
