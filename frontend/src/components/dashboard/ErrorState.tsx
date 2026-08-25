import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load analytics',
  message = 'An unexpected error occurred while communicating with the analytics service. Please check your network connection and try again.',
  onRetry,
  className = '',
}) => {
  return (
    <Card className={`p-8 text-center border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="inline-flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw size={14} /> Retry Analytics Request
        </Button>
      )}
    </Card>
  );
};
