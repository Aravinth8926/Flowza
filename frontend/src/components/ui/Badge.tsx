import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'primary',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none';
  
  const variants = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-[hsl(217_91%_16%_/0.4)] dark:text-[hsl(217_91%_70%)] dark:border-[hsl(217_91%_26%_/0.4)]',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[hsl(217_25%_14%)] dark:text-[hsl(215_20%_65%)] dark:border-[hsl(217_25%_20%)]',
    accent: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-[hsl(38_92%_18%_/0.4)] dark:text-[hsl(38_92%_65%)] dark:border-[hsl(38_92%_28%_/0.4)]',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-[hsl(160_84%_15%_/0.4)] dark:text-[hsl(160_84%_65%)] dark:border-[hsl(160_84%_25%_/0.4)]',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-[hsl(38_92%_18%_/0.4)] dark:text-[hsl(38_92%_65%)] dark:border-[hsl(38_92%_28%_/0.4)]',
    destructive: 'bg-red-50 text-red-700 border border-red-200 dark:bg-[hsl(0_72%_16%_/0.4)] dark:text-[hsl(0_72%_65%)] dark:border-[hsl(0_72%_26%_/0.4)]',
    outline: 'text-slate-700 border border-slate-300 dark:text-[hsl(215_20%_65%)] dark:border-[hsl(217_25%_20%)] bg-transparent',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variants[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
};
