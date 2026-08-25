import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { analyticsService } from '../../services/analyticsService';
import { DateRangePreset } from '../../types';
import { useAuthStore } from '../../store/auth';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { KPICard } from '../../components/dashboard/KPICard';
import { DateRangeFilter } from '../../components/dashboard/DateRangeFilter';
import { TrendChart } from '../../components/dashboard/TrendChart';
import { StatusDistributionBar } from '../../components/dashboard/StatusDistributionBar';
import { TopRankingCard } from '../../components/dashboard/TopRankingCard';
import { AttentionPanel } from '../../components/dashboard/AttentionPanel';
import { FinancialSummaryCard } from '../../components/dashboard/FinancialSummaryCard';
import { DashboardSkeleton } from '../../components/dashboard/DashboardSkeleton';
import { ErrorState } from '../../components/dashboard/ErrorState';
import { Card, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  IndianRupee,
  Truck,
  Building2,
  Receipt,
  ArrowRight,
  Package,
  PlusCircle,
} from 'lucide-react';

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'warning' | 'indigo' | 'cyan' | 'secondary' | 'success' | 'destructive' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  ACCEPTED: { label: 'Accepted', variant: 'indigo' },
  PROCESSING: { label: 'Processing', variant: 'indigo' },
  PACKED: { label: 'Packed', variant: 'cyan' },
  SHIPPED: { label: 'Shipped', variant: 'cyan' },
  DELIVERED: { label: 'Delivered', variant: 'secondary' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
};

export const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [preset, setPreset] = useState<DateRangePreset>('30d');

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'vendor', 'overview', preset],
    queryFn: () => analyticsService.getVendorOverview({ preset }),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="Vendor Dashboard">
        <DashboardSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper title="Vendor Dashboard">
        <ErrorState onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  const {
    kpis,
    order_status_distribution,
    procurement_trend,
    top_suppliers,
    outstanding_invoices,
    recent_orders,
    attention_items,
  } = data;

  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <PageWrapper title="Vendor Dashboard">
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
              Procurement & Spend Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Authoritative overview of your procurement spend, supplier orders, and outstanding invoices.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <DateRangeFilter
              selectedPreset={preset}
              onSelectPreset={(newPreset) => setPreset(newPreset)}
            />
          </div>
        </div>

        {/* 8 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <KPICard
            label="Total Orders Placed"
            value={kpis.total_orders}
            icon={<ShoppingBag size={20} />}
            trendPct={kpis.orders_trend_pct}
            iconBgClass="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60"
          />

          <KPICard
            label="Active Orders"
            value={kpis.active_orders}
            icon={<Clock size={20} />}
            description="Orders in progress"
            iconBgClass="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60"
          />

          <KPICard
            label="Completed Orders"
            value={kpis.completed_orders}
            icon={<CheckCircle2 size={20} />}
            description="Delivered & confirmed"
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
          />

          <KPICard
            label="Total Procurement Spend"
            value={formatCurrency(kpis.total_procurement_value)}
            icon={<IndianRupee size={20} />}
            trendPct={kpis.procurement_trend_pct}
            iconBgClass="bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60"
          />

          <KPICard
            label="Total Paid Bills"
            value={formatCurrency(kpis.total_paid)}
            icon={<CheckCircle2 size={20} />}
            description="Settled to suppliers"
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
          />

          <KPICard
            label="Outstanding Payables"
            value={formatCurrency(kpis.outstanding_payables)}
            icon={<IndianRupee size={20} />}
            description="Pending balance due"
            iconBgClass="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
          />

          <KPICard
            label="Active Suppliers"
            value={kpis.active_suppliers_count}
            icon={<Building2 size={20} />}
            description="Trading supplier partners"
            iconBgClass="bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60"
          />

          <KPICard
            label="Pending Deliveries"
            value={kpis.pending_deliveries}
            icon={<Truck size={20} />}
            description="Packed or in transit"
            iconBgClass="bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/60"
          />
        </div>

        {/* Actionable Alerts Panel */}
        {attention_items && attention_items.length > 0 && (
          <AttentionPanel items={attention_items} title="Priority Vendor Action Items" />
        )}

        {/* Main Charts & Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TrendChart
            title="Procurement Spend & Payment Flow"
            description="Daily trend of procurement purchase value vs invoice payments"
            data={procurement_trend}
            primaryKey="procurement_value"
            secondaryKey="collected_amount"
            primaryLabel="Procurement Spend (₹)"
            secondaryLabel="Payments (₹)"
            className="lg:col-span-2"
          />

          <StatusDistributionBar
            distribution={order_status_distribution}
            title="Procurement Lifecycle Breakdown"
          />
        </div>

        {/* Financial Flow & Top Suppliers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancialSummaryCard
            invoiced={kpis.total_procurement_value}
            collected={kpis.total_paid}
            outstanding={kpis.outstanding_payables}
            role="vendor"
          />

          <TopRankingCard
            title="Top Supplier Partners"
            type="suppliers"
            items={top_suppliers}
            viewAllLink="/dashboard/vendor/suppliers"
          />
        </div>

        {/* Outstanding Invoices & Recent Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outstanding Invoices Panel */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt size={18} className="text-primary-500" />
                Outstanding Bills & Invoices
              </CardTitle>
              <Link
                to="/dashboard/vendor/invoices"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 transition-colors"
              >
                View all bills <ArrowRight size={13} />
              </Link>
            </div>

            {outstanding_invoices && outstanding_invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstanding_invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-bold text-xs text-primary-600 dark:text-primary-400">
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell className="font-medium text-xs text-slate-800 dark:text-slate-200">
                          {inv.counterpart_company_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          ₹{Number(inv.total_amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                          ₹{Number(inv.balance_due).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            to="/dashboard/vendor/invoices"
                            className="text-xs font-semibold text-primary-600 hover:underline inline-flex items-center gap-1"
                          >
                            Pay <ArrowRight size={12} />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <CheckCircle2 size={24} className="mb-2 text-emerald-500 opacity-60" />
                All supplier invoices have been fully settled!
              </div>
            )}
          </Card>

          {/* Recent Orders Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag size={18} className="text-primary-500" />
                Recent Procurement Orders
              </CardTitle>
              <Link
                to="/dashboard/vendor/orders"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 transition-colors"
              >
                View all orders <ArrowRight size={13} />
              </Link>
            </div>

            {recent_orders && recent_orders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent_orders.map((ord) => {
                      const st = STATUS_BADGE_MAP[ord.status] || { label: ord.status, variant: 'secondary' };
                      return (
                        <TableRow key={ord.id}>
                          <TableCell className="font-mono font-bold text-xs text-primary-600 dark:text-primary-400">
                            {ord.order_number}
                          </TableCell>
                          <TableCell className="font-medium text-xs text-slate-800 dark:text-slate-200">
                            {ord.counterpart_company_name}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs">
                            ₹{Number(ord.total_amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={st.variant} className="text-[10px] px-2 py-0.5">
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              to="/dashboard/vendor/orders"
                              className="text-xs font-semibold text-primary-600 hover:underline inline-flex items-center gap-1"
                            >
                              Track <ArrowRight size={12} />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <ShoppingBag size={24} className="mb-2 opacity-50" />
                No procurement orders placed yet.
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
