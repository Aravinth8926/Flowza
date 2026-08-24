import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof HTMLMotionProps<'div'>>, HTMLMotionProps<'div'> {
  spotlight?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, spotlight = true, onMouseMove, ...props }, ref) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (spotlight) {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
      onMouseMove?.(e);
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        style={
          spotlight
            ? ({
                '--mouse-x': `${mousePos.x}px`,
                '--mouse-y': `${mousePos.y}px`,
              } as React.CSSProperties)
            : undefined
        }
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={twMerge(
          'glass-card spotlight-card rounded-2xl p-0 transition-all duration-300 relative overflow-hidden',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex flex-col space-y-1.5 p-6 relative z-10', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={twMerge('font-heading text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-50', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={twMerge('text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge('p-6 pt-0 relative z-10', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex items-center p-6 pt-3 border-t border-slate-100 dark:border-white/5 mt-2 text-xs text-slate-500 dark:text-slate-400 relative z-10', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export interface StatCardProps extends CardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  badgeText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  badgeText,
  className,
  ...props
}) => (
  <Card className={twMerge('p-6', className)} {...props}>
    <div className="flex items-center justify-between mb-3 relative z-10">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-heading">
        {title}
      </span>
      {icon && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {icon}
        </div>
      )}
    </div>
    <div className="flex items-baseline justify-between relative z-10">
      <div className="text-2xl lg:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
        {value}
      </div>
      {change && (
        <span
          className={twMerge(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono',
            isPositive
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-500/30'
          )}
        >
          {isPositive ? '↑' : '↓'} {change}
        </span>
      )}
    </div>
    {badgeText && (
      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium relative z-10">
        {badgeText}
      </div>
    )}
  </Card>
);


