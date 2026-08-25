import React from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  ShoppingCart,
  Users,
  FileText,
  Truck,
  BarChart2,
  Building,
  PieChart,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { AISuggestedQuestion } from '../../types';

interface SuggestedPromptsProps {
  questions: AISuggestedQuestion[];
  onSelectPrompt: (question: string) => void;
  isLoading?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  AlertTriangle: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  TrendingUp: <TrendingUp className="w-4 h-4 text-emerald-500" />,
  Clock: <Clock className="w-4 h-4 text-indigo-500" />,
  DollarSign: <DollarSign className="w-4 h-4 text-emerald-500" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4 text-blue-500" />,
  Users: <Users className="w-4 h-4 text-purple-500" />,
  FileText: <FileText className="w-4 h-4 text-rose-500" />,
  Truck: <Truck className="w-4 h-4 text-sky-500" />,
  BarChart2: <BarChart2 className="w-4 h-4 text-emerald-500" />,
  Building: <Building className="w-4 h-4 text-violet-500" />,
  PieChart: <PieChart className="w-4 h-4 text-amber-500" />,
};

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  questions,
  onSelectPrompt,
  isLoading = false,
}) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Suggested Inquiries
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => onSelectPrompt(q.question)}
            className="group relative flex items-start gap-3 p-3.5 text-left rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-150 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 group-hover:bg-emerald-500/10 transition-colors shrink-0 mt-0.5">
              {ICON_MAP[q.icon] || <Sparkles className="w-4 h-4 text-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <span className="inline-block px-1.5 py-0.5 mb-1 text-[10px] font-semibold tracking-wide uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-mono">
                {q.category}
              </span>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                {q.question}
              </p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors absolute top-3.5 right-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
};
