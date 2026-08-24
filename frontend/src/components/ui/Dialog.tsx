import React, { useEffect } from 'react';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footerActions,
  size = 'md',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-[#03060c]/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-[#151d2e] border border-slate-200 dark:border-[#1e293b] rounded-xl shadow-xl overflow-hidden transition-all duration-200 z-10`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 dark:border-[#1e293b]">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-[#f1f5f9] leading-none">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-500 dark:text-[#8896ab]">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-[#8896ab] dark:hover:text-[#f1f5f9] h-7 w-7 p-0 min-w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#1e293b] cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh] text-slate-700 dark:text-[#e2e8f0] text-xs">
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div className="flex items-center justify-end gap-3 p-4 px-6 bg-slate-50 dark:bg-[#111827] border-t border-slate-100 dark:border-[#1e293b]">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};
