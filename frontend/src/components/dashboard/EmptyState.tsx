import React from 'react';
import { Card } from '../ui/Card';
import { Layers } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No business records found',
  message = 'Your analytics will populate dynamically as orders, invoices, and warehouse stock transactions occur.',
  icon,
  action,
  className = '',
}) => {
  return (
    <Card className={`p-8 text-center ${className}`}>
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
        {icon || <Layers size={22} />}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
        {message}
      </p>
      {action && <div className="flex justify-center">{action}</div>}
    </Card>
  );
};
