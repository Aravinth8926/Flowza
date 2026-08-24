import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHomeIcon = true,
  className = '',
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <ol className="flex items-center space-x-1.5 flex-wrap">
        {showHomeIcon && (
          <li className="flex items-center">
            <Link
              to="/"
              className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <Home size={14} />
              <span className="sr-only">Home</span>
            </Link>
            <ChevronRight size={14} className="mx-1 text-slate-400 dark:text-slate-600 shrink-0" />
          </li>
        )}
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center">
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`font-semibold ${isLast ? 'text-slate-900 dark:text-white' : ''}`}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight size={14} className="mx-1 text-slate-400 dark:text-slate-600 shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
