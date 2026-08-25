import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analyticsService';
import { DateRangePreset } from '../../types';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { KPICard } from '../../components/dashboard/KPICard';
import { DateRangeFilter } from '../../components/dashboard/DateRangeFilter';
import { TrendChart } from '../../components/dashboard/TrendChart';
import { StatusDistributionBar } from '../../components/dashboard/StatusDistributionBar';
import { TopRankingCard } from '../../components/dashboard/TopRankingCard';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';
import { ErrorState } from '../../components/dashboard/ErrorState';
import { Card, CardTitle, CardHeader, CardContent } from '../../components/ui/Card';
import {
  Users,
  Building2,
  Store,
  Truck,
  Package,
  ShoppingBag,
  IndianRupee,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Server,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DateRangePreset>('30d');

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'admin', 'overview', preset],
    queryFn: () => analyticsService.getAdminOverview({ preset }),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="Platform Administration">
        <DashboardSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper title="Platform Administration">
        <ErrorState onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  const {
    kpis,
    user_role_breakdown,
    company_type_breakdown,
    order_status_distribution,
    platform_financial_trend,
    operational_health,
    top_active_suppliers,
  } = data;

  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <PageWrapper title="Platform Administration">
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
              Platform Administration & System Health
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time platform metrics, supply-chain flow, company distribution, and operational diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <button
              type="button"
              onClick={() => navigate('/ai', { state: { initialPrompt: 'Give me a complete health check on platform trade volume, active suppliers, and unsettled balances.' } })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Flowza AI</span>
            </button>
            <DateRangeFilter
              selectedPreset={preset}
              onSelectPreset={(newPreset) => setPreset(newPreset)}
            />
          </div>
        </div>

        {/* 8 Admin KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <KPICard
            label="Total Platform Users"
            value={kpis.total_users}
            icon={<Users size={20} />}
            description="Verified authenticated accounts"
            iconBgClass="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60"
          />

          <KPICard
            label="Registered Companies"
            value={kpis.total_companies}
            icon={<Building2 size={20} />}
            description={`${kpis.supplier_companies_count} suppliers, ${kpis.vendor_companies_count} vendors`}
            iconBgClass="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60"
          />

          <KPICard
            label="Catalog Products"
            value={kpis.total_products}
            icon={<Package size={20} />}
            description="Active supplier inventory SKUs"
            iconBgClass="bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60"
          />

          <KPICard
            label="Platform Orders"
            value={kpis.total_orders}
            icon={<ShoppingBag size={20} />}
            description={`${kpis.active_orders} active, ${kpis.completed_orders} completed`}
            iconBgClass="bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/60"
          />

          <KPICard
            label="Total Invoiced Volume"
            value={formatCurrency(kpis.total_platform_invoiced)}
            icon={<IndianRupee size={20} />}
            description="Platform gross trade volume"
            iconBgClass="bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60"
          />

          <KPICard
            label="Total Settled Volume"
            value={formatCurrency(kpis.total_platform_collected)}
            icon={<CheckCircle2 size={20} />}
            description="Completed payment receipts"
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
          />

          <KPICard
            label="Platform Receivables Due"
            value={formatCurrency(kpis.platform_outstanding)}
            icon={<Clock size={20} />}
            description="Outstanding balance across network"
            iconBgClass="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
          />

          <KPICard
            label="Core System Status"
            value="100% Online"
            icon={<Activity size={20} className="animate-pulse" />}
            description="FastAPI & PostgreSQL operational"
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
          />
        </div>

        {/* Financial Flow & Status Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TrendChart
            title="Platform Financial Trade Volume"
            description="Daily gross invoiced volume vs completed settlements across all tenants"
            data={platform_financial_trend}
            primaryKey="invoiced_amount"
            secondaryKey="collected_amount"
            primaryLabel="Invoiced Volume (₹)"
            secondaryLabel="Settled Volume (₹)"
            className="lg:col-span-2"
          />

          <StatusDistributionBar
            distribution={order_status_distribution}
            title="Platform Order Lifecycle"
          />
        </div>

        {/* Operational Health Diagnostics & Top Active Suppliers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operational Health Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server size={18} className="text-primary-500" />
                Pipeline Health & Platform Alerts
              </CardTitle>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                Healthy
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400 font-heading">Pending Review</p>
                <p className="text-lg font-mono font-extrabold text-slate-900 dark:text-white mt-1">
                  {operational_health.pending_orders}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] uppercase font-bold text-blue-500 font-heading">Processing</p>
                <p className="text-lg font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {operational_health.processing_orders}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-[10px] uppercase font-bold text-indigo-500 font-heading">Packed</p>
                <p className="text-lg font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                  {operational_health.packed_orders}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30">
                <p className="text-[10px] uppercase font-bold text-cyan-500 font-heading">Shipped</p>
                <p className="text-lg font-mono font-extrabold text-cyan-600 dark:text-cyan-400 mt-1">
                  {operational_health.shipped_orders}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" /> Unpaid / Partially Paid Invoices:
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {operational_health.unpaid_invoices_count} invoices
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" /> Platform Low Stock Alerts:
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {operational_health.low_stock_alerts_count} SKUs
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <AlertOctagon size={14} className="text-rose-500" /> Platform Out of Stock Alerts:
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {operational_health.out_of_stock_alerts_count} SKUs
                </span>
              </div>
            </div>
          </Card>

          {/* Top Suppliers on Platform */}
          <TopRankingCard
            title="Top Active Platform Suppliers"
            type="suppliers"
            items={top_active_suppliers}
          />
        </div>

        {/* User Roles & Company Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* User Roles Card */}
          <Card className="p-6">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Users size={17} className="text-primary-500" />
              Users by System Role
            </CardTitle>
            <div className="space-y-3">
              {Object.entries(user_role_breakdown).map(([roleName, count]) => (
                <div
                  key={roleName}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                >
                  <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase font-heading">
                    {roleName}
                  </span>
                  <span className="font-mono font-bold text-xs bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {count} {count === 1 ? 'user' : 'users'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Company Business Types Card */}
          <Card className="p-6">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={17} className="text-primary-500" />
              Companies by Business Type
            </CardTitle>
            <div className="space-y-3">
              {Object.entries(company_type_breakdown).map(([typeName, count]) => (
                <div
                  key={typeName}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                >
                  <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                    {typeName}
                  </span>
                  <span className="font-mono font-bold text-xs bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {count} {count === 1 ? 'entity' : 'entities'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
