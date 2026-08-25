import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'emerald' | 'indigo' | 'cyan' | 'amber' | 'destructive' | 'outline' | 'success' | 'warning' | 'accent' | 'neutral';
  dot?: boolean;
  ping?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'emerald',
  dot = false,
  ping = false,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight select-none border transition-colors';
  
  const variants: Record<string, string> = {
    primary: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    accent: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    cyan: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    destructive: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60',
    neutral: 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80',
    outline: 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-transparent',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variants[variant] || variants.emerald, className))}
      {...props}
    >
      {(dot || ping) && (
        <span className="relative flex h-1.5 w-1.5">
          {ping && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          )}
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
        </span>
      )}
      {children}
    </span>
  );
};
