import React from 'react';
import { Card, CardTitle } from '../ui/Card';
import { AttentionItem } from '../../types';
import { AlertCircle, AlertTriangle, Info, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AttentionPanelProps {
  items: AttentionItem[];
  title?: string;
  className?: string;
}

export const AttentionPanel: React.FC<AttentionPanelProps> = ({
  items,
  title = 'Action Required',
  className = '',
}) => {
  if (!items || items.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            {title}
          </CardTitle>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          All operations are on schedule. No critical bottlenecks or overdue tasks requiring immediate attention.
        </p>
      </Card>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return {
          icon: <AlertCircle size={14} className="text-rose-500" />,
          badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={14} className="text-amber-500" />,
          badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        };
      default:
        return {
          icon: <Info size={14} className="text-blue-500" />,
          badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        };
    }
  };

  return (
    <Card className={`p-6 border-l-4 border-l-amber-500 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-500 animate-pulse" />
          {title}
        </CardTitle>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
          {items.length} {items.length === 1 ? 'alert' : 'alerts'}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const sev = getSeverityBadge(item.severity);
          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${sev.badge} transition-all hover:shadow-sm`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{sev.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>

              <Link
                to={item.link}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 self-start sm:self-center"
              >
                Take action <ArrowUpRight size={13} />
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
