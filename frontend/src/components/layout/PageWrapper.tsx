import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageWrapperProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  breadcrumbs,
  actions,
  children,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex mb-4 text-xs font-medium text-slate-500 dark:text-[#8896ab]" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            {breadcrumbs.map((item, idx) => (
              <li key={idx} className="inline-flex items-center">
                {idx > 0 && (
                  <svg className="w-3 h-3 mx-1 text-slate-400 dark:text-[#64748b]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {item.path ? (
                  <Link to={item.path} className="hover:text-blue-600 dark:hover:text-[#f1f5f9] transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-slate-700 dark:text-[#f1f5f9]">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header */}
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {title && (
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#f1f5f9]">
              {title}
            </h1>
          )}
          {actions && <div className="flex items-center gap-2 self-start sm:self-auto">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className="w-full">{children}</div>
    </div>
  );
};
