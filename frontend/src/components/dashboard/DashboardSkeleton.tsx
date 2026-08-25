import React from 'react';
import { Card } from '../ui/Card';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        </div>
        <div className="h-9 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-7 w-28 bg-slate-300 dark:bg-slate-700 rounded-md" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </Card>
        ))}
      </div>

      {/* Main Charts & Distribution Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 h-80 bg-slate-100/60 dark:bg-slate-800/40" />
        <Card className="p-6 h-80 bg-slate-100/60 dark:bg-slate-800/40" />
      </div>

      {/* Secondary Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72 bg-slate-100/60 dark:bg-slate-800/40" />
        <Card className="p-6 h-72 bg-slate-100/60 dark:bg-slate-800/40" />
      </div>
    </div>
  );
};
