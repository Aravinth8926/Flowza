import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'double-bezel' | 'flat' | 'outline' | 'glass';
  isInteractive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', isInteractive = false, children, ...props }, ref) => {
    if (variant === 'double-bezel') {
      return (
        <div
          ref={ref}
          className={twMerge(
            'double-bezel transition-all duration-200',
            isInteractive && 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer',
            className
          )}
          {...props}
        >
          <div className="double-bezel-inner p-5 md:p-6 overflow-hidden">
            {children}
          </div>
        </div>
      );
    }

    const variantStyles: Record<'default' | 'flat' | 'outline' | 'glass', string> = {
      default:
        'bg-white dark:bg-[#0E1015] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]',
      flat: 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60',
      outline: 'bg-transparent border border-slate-200 dark:border-slate-800',
      glass: 'glass-panel shadow-sm',
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          'rounded-2xl transition-all duration-200 relative overflow-hidden',
          variantStyles[variant as keyof typeof variantStyles] || variantStyles.default,
          isInteractive && 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md cursor-pointer hover:-translate-y-0.5',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex flex-col space-y-1.5 p-5 md:p-6 relative z-10', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={twMerge('font-heading text-lg md:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={twMerge('text-xs md:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge('p-5 md:p-6 pt-0 relative z-10', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex items-center p-5 md:p-6 pt-0 relative z-10 border-t border-slate-100 dark:border-slate-800/60 mt-4', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
