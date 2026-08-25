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
import { Card, CardTitle, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  IndianRupee,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Package,
  Boxes,
  Truck,
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

export const SupplierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [preset, setPreset] = useState<DateRangePreset>('30d');

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'supplier', 'overview', preset],
    queryFn: () => analyticsService.getSupplierOverview({ preset }),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="Supplier Dashboard">
        <DashboardSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper title="Supplier Dashboard">
        <ErrorState onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  const {
    kpis,
    order_status_distribution,
    revenue_trend,
    top_products,
    inventory_summary,
    recent_orders,
    attention_items,
  } = data;

  const formatCurrency = (val: number | string) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <PageWrapper title="Supplier Dashboard">
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
              Supplier Business Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Authoritative sales, order fulfillment, receivables, and inventory performance metrics.
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
            label="Total Orders"
            value={kpis.total_orders}
            icon={<ShoppingBag size={20} />}
            trendPct={kpis.orders_trend_pct}
            iconBgClass="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60"
          />

          <KPICard
            label="Active Orders"
            value={kpis.active_orders}
            icon={<Clock size={20} />}
            description="Pending, in processing, or in transit"
            iconBgClass="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60"
          />

          <KPICard
            label="Completed Orders"
            value={kpis.completed_orders}
            icon={<CheckCircle2 size={20} />}
            description="Successfully fulfilled & verified"
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
          />

          <KPICard
            label="Total Invoiced"
            value={formatCurrency(kpis.total_invoiced)}
            icon={<IndianRupee size={20} />}
            trendPct={kpis.invoiced_trend_pct}
            iconBgClass="bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60"
          />

          <KPICard
            label="Collected Revenue"
            value={formatCurrency(kpis.total_collected)}
            icon={<CheckCircle2 size={20} />}
            trendPct={kpis.collected_trend_pct}
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
          />

          <KPICard
            label="Outstanding Receivables"
            value={formatCurrency(kpis.outstanding_receivables)}
            icon={<IndianRupee size={20} />}
            description="Pending balance payment"
            iconBgClass="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
          />

          <KPICard
            label="Low Stock Items"
            value={kpis.low_stock_products_count}
            icon={<AlertTriangle size={20} />}
            description="At or below reorder threshold"
            iconBgClass="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
          />

          <KPICard
            label="Out of Stock"
            value={kpis.out_of_stock_products_count}
            icon={<AlertOctagon size={20} />}
            description="0 units available for fulfillment"
            iconBgClass="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
          />
        </div>

        {/* Actionable Alerts Panel */}
        {attention_items && attention_items.length > 0 && (
          <AttentionPanel items={attention_items} title="Priority Supplier Action Items" />
        )}

        {/* Main Charts & Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TrendChart
            title="Revenue & Receivables Trend"
            description="Comparison of invoiced total value vs collected cash receipts"
            data={revenue_trend}
            primaryKey="invoiced_amount"
            secondaryKey="collected_amount"
            primaryLabel="Invoiced (₹)"
            secondaryLabel="Collected (₹)"
            className="lg:col-span-2"
          />

          <StatusDistributionBar
            distribution={order_status_distribution}
            title="Order Lifecycle Breakdown"
          />
        </div>

        {/* Financial Flow & Warehouse Inventory Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancialSummaryCard
            invoiced={kpis.total_invoiced}
            collected={kpis.total_collected}
            outstanding={kpis.outstanding_receivables}
            role="supplier"
          />

          {/* Warehouse Inventory Health Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes size={18} className="text-primary-500" />
                Warehouse Inventory Health
              </CardTitle>
              <Link
                to="/dashboard/supplier/inventory"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 transition-colors"
              >
                Manage stock <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400 font-heading">On Hand</p>
                <p className="text-xl font-mono font-extrabold text-slate-900 dark:text-white mt-1">
                  {inventory_summary.total_quantity_on_hand.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <p className="text-[10px] uppercase font-bold text-amber-500 font-heading">Reserved</p>
                <p className="text-xl font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {inventory_summary.total_quantity_reserved.toLocaleString()}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-[10px] uppercase font-bold text-emerald-500 font-heading">Available</p>
                <p className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {inventory_summary.total_quantity_available.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> In Stock Products:
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {inventory_summary.in_stock_count} / {inventory_summary.total_products}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Low Stock Alerts:
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {inventory_summary.low_stock_count} products
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Out of Stock Alerts:
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {inventory_summary.out_of_stock_count} products
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Products & Recent Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TopRankingCard
            title="Top Selling Products"
            type="products"
            items={top_products}
            viewAllLink="/dashboard/supplier/products"
            className="lg:col-span-1"
          />

          {/* Recent Orders Table */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-primary-500" />
                Recent Incoming Purchase Orders
              </CardTitle>
              <Link
                to="/dashboard/supplier/orders/incoming"
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
                      <TableHead>Vendor</TableHead>
                      <TableHead>Items</TableHead>
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
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                            {ord.item_preview}
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
                              to="/dashboard/supplier/orders/incoming"
                              className="text-xs font-semibold text-primary-600 hover:underline inline-flex items-center gap-1"
                            >
                              Manage <ArrowRight size={12} />
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
                No incoming orders placed yet.
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
