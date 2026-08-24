import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<'button'>>, HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'indigo' | 'outline' | 'ghost' | 'destructive' | 'glass' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  glow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, glow, children, disabled, ...props }, ref) => {
    const baseStyles = 'btn-alive inline-flex items-center justify-center font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';
    
    const variants = {
      primary: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-md shadow-emerald-900/20 border border-emerald-400/20 focus:ring-emerald-500',
      indigo: 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-900/20 border border-indigo-400/20 focus:ring-indigo-500',
      secondary: 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 focus:ring-slate-400',
      outline: 'border border-slate-300 dark:border-slate-700/90 bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 focus:ring-slate-500',
      ghost: 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white focus:ring-slate-500',
      glass: 'glass-panel text-slate-900 dark:text-white hover:border-emerald-500/40 hover:bg-white/90 dark:hover:bg-slate-800/90 focus:ring-emerald-500',
      destructive: 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 shadow-md shadow-red-900/20 focus:ring-red-500',
      link: 'bg-transparent text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline p-0 focus:ring-transparent focus:ring-offset-0',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs tracking-tight gap-1.5',
      md: 'h-10 px-4 py-2 text-sm tracking-tight gap-2',
      lg: 'h-12 px-6 text-base tracking-tight gap-2.5',
      xl: 'h-14 px-8 text-base font-semibold tracking-tight gap-3',
    };

    const glowClass = glow ? (variant === 'indigo' ? 'glow-indigo' : 'glow-emerald') : '';

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02, y: disabled || isLoading ? 0 : -1 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], glowClass, className))}
        {...props}
      >
        {isLoading && (
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children as React.ReactNode}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';


