import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  label,
  error,
  className,
}) => {
  return (
    <div className={twMerge('space-y-2', className)}>
      {label && (
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={clsx(
                'relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all-300',
                isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-col">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    {opt.label}
                  </span>
                  {opt.description && (
                    <span className="mt-1 flex items-center text-xs text-slate-500 dark:text-slate-400">
                      {opt.description}
                    </span>
                  )}
                </div>
                <div
                  className={clsx(
                    'h-4 w-4 rounded-full border flex items-center justify-center',
                    isSelected
                      ? 'border-primary text-primary'
                      : 'border-slate-350 dark:border-slate-600'
                  )}
                >
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};
