import React from 'react';
import { DateRangePreset } from '../../types';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  selectedPreset: DateRangePreset;
  onSelectPreset: (preset: DateRangePreset) => void;
  className?: string;
}

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
  { label: '6 Months', value: '6m' },
  { label: '1 Year', value: '12m' },
  { label: 'All Time', value: 'all' },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  selectedPreset,
  onSelectPreset,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm ${className}`}
      role="group"
      aria-label="Date Range Filter"
    >
      <div className="flex items-center px-2 text-slate-400 dark:text-slate-500 hidden sm:flex">
        <Calendar size={15} aria-hidden="true" />
      </div>
      {PRESETS.map((preset) => {
        const isActive = selectedPreset === preset.value;
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => onSelectPreset(preset.value)}
            aria-pressed={isActive}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              isActive
                ? 'bg-white dark:bg-primary-600 text-slate-900 dark:text-white shadow-sm font-bold scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
};
