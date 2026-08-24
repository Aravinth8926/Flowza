import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Invoice } from '../../types';
import { invoiceService } from '../../services/invoiceService';
import { toast } from 'sonner';
import { CreditCard, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentRecorded: (updatedInvoice: Invoice) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<string>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (invoice) {
      const balance = invoice.balance_due ?? (invoice.total_amount - (invoice.paid_amount || 0));
      setAmount(balance > 0 ? balance.toString() : '0');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setMethod('bank_transfer');
      setReference('');
      setNotes('');
    }
  }, [invoice]);

  if (!invoice) return null;

  const balance = invoice.balance_due ?? (invoice.total_amount - (invoice.paid_amount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (numAmount > balance) {
      toast.error(`Payment amount cannot exceed remaining balance (₹${balance.toFixed(2)})`);
      return;
    }

    try {
      setIsLoading(true);
      const updated = await invoiceService.recordPayment(invoice.id, {
        amount: numAmount,
        payment_date: paymentDate,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Payment of ₹${numAmount.toLocaleString('en-IN')} recorded successfully`);
      onPaymentRecorded(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Record Payment Receipt" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-slate-900 dark:text-slate-100">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Invoice Reference:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-500">Total Invoiced:</span>
            <span className="font-mono font-semibold">₹{Number(invoice.total_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-500">Outstanding Balance:</span>
            <span className="font-mono font-bold text-rose-500">₹{balance.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Payment Amount (INR ₹) *
          </label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Date *
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Method *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
              <option value="upi_manual">UPI / QR Payment</option>
              <option value="cheque">Cheque / Demand Draft</option>
              <option value="cash">Cash Settlement</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Transaction Reference / UTR #
          </label>
          <Input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UTR-99881122 or CHQ-00123"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Settlement Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Received via HDFC corporate current account"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            {isLoading ? 'Recording...' : 'Confirm Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
