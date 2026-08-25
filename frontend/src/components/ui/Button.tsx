import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'indigo' | 'outline' | 'ghost' | 'destructive' | 'glass' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  trailingIcon?: React.ReactNode;
  iconCircle?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, trailingIcon, iconCircle = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'group relative inline-flex items-center justify-center font-medium rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)] border border-emerald-500/30',
      indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.08)] border border-indigo-500/30',
      secondary: 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 shadow-sm',
      outline: 'border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60 shadow-sm',
      ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100',
      glass: 'glass-panel text-slate-900 dark:text-white hover:bg-white/90 dark:hover:bg-slate-800/90 shadow-sm',
      destructive: 'bg-red-600 hover:bg-red-500 text-white shadow-sm border border-red-500/20',
      link: 'bg-transparent text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline p-0 focus:ring-transparent focus:ring-offset-0',
    };

    const sizes = {
      sm: 'min-h-[34px] px-3 py-1 text-xs tracking-tight gap-1.5',
      md: 'min-h-[42px] px-4 py-2 text-sm tracking-tight gap-2',
      lg: 'min-h-[48px] px-6 py-2.5 text-base tracking-tight gap-2.5',
      xl: 'min-h-[54px] px-8 py-3 text-base font-semibold tracking-tight gap-3',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : null}
        
        <span>{children}</span>

        {trailingIcon && (
          iconCircle ? (
            <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              {trailingIcon}
            </span>
          ) : (
            <span className="transition-transform group-hover:translate-x-0.5">
              {trailingIcon}
            </span>
          )
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
