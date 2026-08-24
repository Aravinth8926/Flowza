import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}) => {
  return (
    <label
      className={twMerge(
        clsx(
          'inline-flex items-center space-x-2 cursor-pointer select-none',
          disabled && 'opacity-50 pointer-events-none',
          className
        )
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={clsx(
            'w-10 h-6 rounded-full transition-colors',
            checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'
          )}
        />
        <div
          className={clsx(
            'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm',
            checked ? 'transform translate-x-4' : ''
          )}
        />
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
      )}
    </label>
  );
};
