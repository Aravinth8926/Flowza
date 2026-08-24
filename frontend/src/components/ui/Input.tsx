import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || React.useId();
    
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            className={twMerge(
              clsx(
                'block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all duration-200',
                'bg-white text-slate-900 border-slate-200 dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-800',
                'disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900/40 dark:disabled:text-slate-600 disabled:cursor-not-allowed',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium tracking-tight mt-1">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

