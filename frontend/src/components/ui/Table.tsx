import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0E1015] shadow-sm">
      <table
        ref={ref}
        className={twMerge('w-full caption-bottom text-xs md:text-sm border-collapse', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={twMerge('border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/80', className)}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={twMerge('[&_tr:last-child]:border-0 divide-y divide-slate-100 dark:divide-slate-800/60', className)}
      {...props}
    />
  )
);
TableBody.displayName = 'TableBody';

export const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={twMerge('border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={twMerge(
        'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/60',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={twMerge(
        'h-10 px-4 text-left align-middle font-semibold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 [&:has([role=checkbox])]:pr-0 whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={twMerge(
        'p-4 align-middle text-slate-800 dark:text-slate-200 [&:has([role=checkbox])]:pr-0 whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={twMerge('mt-4 text-xs text-slate-500 dark:text-slate-400', className)}
      {...props}
    />
  )
);
TableCaption.displayName = 'TableCaption';
