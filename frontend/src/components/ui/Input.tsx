import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, disabled, ...props }, ref) => {
    const inputId = id || React.useId();
    
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-700 dark:text-[#8896ab]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          disabled={disabled}
          className={twMerge(
            clsx(
              'block w-full rounded-md border px-3 py-2 text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-[#475569] focus:outline-none transition-all duration-150',
              'bg-white text-slate-900 border-slate-300 dark:bg-[#111827] dark:text-[#f1f5f9] dark:border-[#1e293b]',
              'disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-[#131b2c] dark:disabled:text-[#3d4a5c] dark:disabled:border-[#182234] disabled:cursor-not-allowed',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/20'
                : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:focus:border-blue-500 dark:focus:ring-blue-500/20',
              className
            )
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 dark:text-[#ef4444] mt-1 font-medium">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-500 dark:text-[#64748b] mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
