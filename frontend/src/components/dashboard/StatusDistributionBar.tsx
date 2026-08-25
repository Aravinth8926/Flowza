import React from 'react';
import { Card, CardTitle, CardHeader } from '../ui/Card';
import { StatusCountItem } from '../../types';

interface StatusDistributionBarProps {
  distribution: StatusCountItem[];
  title?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; dot: string; text: string }
> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-400', dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300' },
  ACCEPTED: { label: 'Accepted', bg: 'bg-blue-400', dot: 'bg-blue-400', text: 'text-blue-700 dark:text-blue-300' },
  PROCESSING: { label: 'Processing', bg: 'bg-indigo-500', dot: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
  PACKED: { label: 'Packed', bg: 'bg-purple-500', dot: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300' },
  SHIPPED: { label: 'Shipped', bg: 'bg-cyan-500', dot: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-300' },
  DELIVERED: { label: 'Delivered', bg: 'bg-teal-500', dot: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-500', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-400', dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400' },
};

export const StatusDistributionBar: React.FC<StatusDistributionBarProps> = ({
  distribution,
  title = 'Order Lifecycle Distribution',
  className = '',
}) => {
  const totalOrders = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
          {title}
        </CardTitle>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
          {totalOrders} Total Orders
        </span>
      </div>

      {/* Multi-segment Progress Bar */}
      <div
        className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner mb-5"
        role="progressbar"
        aria-valuenow={totalOrders}
        aria-valuemin={0}
        aria-valuemax={totalOrders}
        aria-label="Order Status Distribution"
      >
        {distribution.map((item) => {
          if (item.count === 0) return null;
          const conf = STATUS_CONFIG[item.status] || { bg: 'bg-slate-400' };
          const widthPct = totalOrders > 0 ? (item.count / totalOrders) * 100 : 0;
          return (
            <div
              key={item.status}
              style={{ width: `${widthPct}%` }}
              className={`${conf.bg} transition-all duration-500 hover:opacity-80`}
              title={`${item.status}: ${item.count} (${widthPct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Status Item Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        {distribution.map((item) => {
          const conf = STATUS_CONFIG[item.status] || {
            label: item.status,
            dot: 'bg-slate-400',
            text: 'text-slate-600',
          };
          return (
            <div
              key={item.status}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-2 truncate pr-1">
                <span className={`w-2 h-2 rounded-full ${conf.dot} shrink-0`} />
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                  {conf.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {item.count}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  ({item.percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
