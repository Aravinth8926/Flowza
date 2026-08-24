import React from 'react';
import { motion } from 'framer-motion';
import { OrderStatus, OrderStatusHistoryEntry } from '../../types';
import { Badge } from '../ui/Badge';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Box,
  Check,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react';

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  timeline?: OrderStatusHistoryEntry[];
  createdDate?: string;
}

const LIFECYCLE_STEPS: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'accepted', label: 'Accepted', icon: Check },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'packed', label: 'Packed', icon: Box },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

function getStepIndex(status: OrderStatus): number {
  const norm = status.toLowerCase();
  if (norm === 'in_progress') return 2; // processing
  const idx = LIFECYCLE_STEPS.findIndex((s) => s.key === norm);
  return idx !== -1 ? idx : 0;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  currentStatus,
  timeline = [],
  createdDate,
}) => {
  const isTerminalNegative = currentStatus === 'rejected' || currentStatus === 'cancelled';
  const currentStepIdx = getStepIndex(currentStatus);

  return (
    <div className="space-y-6">
      {/* ── Visual Stepper Progression Bar ─────────────────────────────── */}
      {!isTerminalNegative ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Fulfillment Progress
          </h4>

          <div className="relative flex items-center justify-between">
            {/* Background progress bar line */}
            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-800 rounded-full z-0" />
            {/* Active progress bar line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${(currentStepIdx / (LIFECYCLE_STEPS.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute top-1/2 left-4 -translate-y-1/2 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full z-0"
              style={{ maxWidth: 'calc(100% - 2rem)' }}
            />

            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const isUpcoming = idx > currentStepIdx;
              const Icon = step.icon;

              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center group">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30 scale-110'
                        : isPast
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-medium transition-colors text-center ${
                      isCurrent
                        ? 'text-emerald-400 font-semibold'
                        : isPast
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={`rounded-2xl p-4 border flex items-center gap-3 ${
            currentStatus === 'rejected'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {currentStatus === 'rejected' ? (
            <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
          )}
          <div>
            <h4 className="text-sm font-semibold capitalize">Order {currentStatus}</h4>
            <p className="text-xs opacity-80">
              {currentStatus === 'rejected'
                ? 'This purchase order was declined by the supplier. Inventory reservations have been released.'
                : 'This order was cancelled. Reserved stock has been returned to available inventory.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Chronological Event Timeline Log ─────────────────────────── */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          Status History & Audit Trail
        </h4>

        {timeline.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-2">
            Order created on {createdDate ? new Date(createdDate).toLocaleString() : 'recently'}.
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {timeline.map((entry, idx) => (
              <div key={entry.id || idx} className="relative group">
                {/* Node Beacon */}
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-emerald-400 group-hover:scale-125 transition-transform" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 capitalize">
                      {entry.to_status.replace('_', ' ')}
                    </span>
                    {entry.from_status && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        (from <span className="capitalize">{entry.from_status.replace('_', ' ')}</span>)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {entry.timestamp
                      ? new Date(entry.timestamp).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Just now'}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>
                    {entry.changed_by}{' '}
                    <span className="text-slate-600">({entry.changed_by_role})</span>
                  </span>
                </div>

                {entry.note && (
                  <div className="mt-2 text-xs text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 font-sans leading-relaxed">
                    <span className="text-slate-500 font-medium">Note:</span> {entry.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
