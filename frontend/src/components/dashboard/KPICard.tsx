import React from 'react';
import { Card } from '../ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trendPct?: number | null;
  trendLabel?: string;
  description?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  iconBgClass?: string;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon,
  trendPct,
  trendLabel = 'vs prior period',
  description,
  iconBgClass = 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800/60',
  className = '',
}) => {
  const hasTrend = trendPct !== undefined && trendPct !== null;
  const isPositive = (trendPct ?? 0) > 0;
  const isNegative = (trendPct ?? 0) < 0;

  return (
    <Card
      className={`p-5 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 ${className}`}
      role="region"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1 min-w-0 pr-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {value}
            </h3>
          </div>
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${iconBgClass} shadow-sm`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      {(hasTrend || description) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          {hasTrend && (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                    : isNegative
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isPositive ? (
                  <TrendingUp size={11} className="inline" />
                ) : isNegative ? (
                  <TrendingDown size={11} className="inline" />
                ) : (
                  <Minus size={11} className="inline" />
                )}
                {isPositive ? '+' : ''}
                {trendPct}%
              </span>
              <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate">
                {trendLabel}
              </span>
            </div>
          )}

          {description && (
            <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-auto">
              {description}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
