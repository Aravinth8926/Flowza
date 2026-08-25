import React from 'react';
import { Card, CardTitle } from '../ui/Card';
import { TopProductItem, TopSupplierItem } from '../../types';
import { Package, Truck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopRankingCardProps {
  title: string;
  type: 'products' | 'suppliers';
  items: (TopProductItem | TopSupplierItem)[];
  viewAllLink?: string;
  className?: string;
}

export const TopRankingCard: React.FC<TopRankingCardProps> = ({
  title,
  type,
  items,
  viewAllLink,
  className = '',
}) => {
  const isProduct = type === 'products';

  if (!items || items.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </CardTitle>
        </div>
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
          {isProduct ? <Package size={24} className="mb-2 opacity-50" /> : <Truck size={24} className="mb-2 opacity-50" />}
          <span>No ranking records available for this period.</span>
        </div>
      </Card>
    );
  }

  // Find max metric value for proportional bar width
  const maxMetric = Math.max(
    ...items.map((it) => {
      if ('total_units_sold' in it) return it.total_units_sold;
      return Number(it.total_spend || 0);
    }),
    1
  );

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {isProduct ? <Package size={17} className="text-primary-500" /> : <Truck size={17} className="text-primary-500" />}
          {title}
        </CardTitle>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={13} />
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => {
          if ('total_units_sold' in item) {
            // Top Product Item
            const prod = item as TopProductItem;
            const barWidth = Math.max(5, (prod.total_units_sold / maxMetric) * 100);
            return (
              <div key={prod.product_id || idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {prod.product_name}
                    </span>
                    {prod.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hidden sm:inline">
                        {prod.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {prod.total_units_sold.toLocaleString()} units
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      (₹{Number(prod.total_revenue).toLocaleString()})
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${barWidth}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          } else {
            // Top Supplier Item
            const sup = item as TopSupplierItem;
            const spend = Number(sup.total_spend || 0);
            const barWidth = Math.max(5, (spend / maxMetric) * 100);
            return (
              <div key={sup.supplier_company_id || idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {sup.supplier_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{spend.toLocaleString()}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      ({sup.total_orders} orders)
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${barWidth}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          }
        })}
      </div>
    </Card>
  );
};
