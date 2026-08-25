import React from 'react';
import { Card, CardTitle } from '../ui/Card';
import { IndianRupee, CheckCircle2, Clock } from 'lucide-react';

interface FinancialSummaryCardProps {
  invoiced: number | string;
  collected: number | string;
  outstanding: number | string;
  role: 'supplier' | 'vendor' | 'admin';
  className?: string;
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  invoiced,
  collected,
  outstanding,
  role,
  className = '',
}) => {
  const invNum = Number(invoiced || 0);
  const collNum = Number(collected || 0);
  const outNum = Number(outstanding || 0);

  const collectedPct = invNum > 0 ? Math.min(100, Math.round((collNum / invNum) * 100)) : 0;

  const isSupplier = role === 'supplier';
  const isVendor = role === 'vendor';

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <IndianRupee size={18} className="text-emerald-500" />
          {isSupplier
            ? 'Revenue & Receivables Flow'
            : isVendor
            ? 'Procurement & Payables Balance'
            : 'Platform Financial Overview'}
        </CardTitle>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
          {collectedPct}% {isSupplier ? 'Collected' : isVendor ? 'Paid' : 'Settled'}
        </span>
      </div>

      {/* 3 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-heading">
            {isVendor ? 'Total Invoiced Bills' : 'Total Invoiced Value'}
          </p>
          <h4 className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            ₹{invNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-heading flex items-center gap-1">
            <CheckCircle2 size={12} /> {isSupplier ? 'Collected Revenue' : isVendor ? 'Total Paid Amount' : 'Platform Settled'}
          </p>
          <h4 className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            ₹{collNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-heading flex items-center gap-1">
            <Clock size={12} /> {isSupplier ? 'Outstanding Receivables' : isVendor ? 'Outstanding Payables' : 'Platform Balance Due'}
          </p>
          <h4 className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            ₹{outNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
        </div>
      </div>

      {/* Progress Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>Settlement Progress</span>
          <span className="font-mono">{collectedPct}% settled</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${collectedPct}%` }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
          />
        </div>
      </div>
    </Card>
  );
};
