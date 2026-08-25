import React from 'react';
import { Loader2, Database } from 'lucide-react';

interface ToolActivityBadgeProps {
  toolName?: string;
  isInvestigating?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  get_low_stock_products: 'Checking Warehouse Stock Levels...',
  get_out_of_stock_products: 'Scanning Out-of-Stock Products...',
  get_inventory_summary: 'Aggregating Inventory Metrics...',
  get_supplier_overview: 'Analyzing Sales & Revenue Performance...',
  get_vendor_overview: 'Computing Procurement Spend...',
  get_admin_overview: 'Calculating Platform Trade Volume...',
  get_top_products: 'Ranking Top-Selling Products...',
  get_top_suppliers: 'Ranking Top Suppliers...',
  get_active_orders: 'Querying Active Purchase Orders...',
  get_recent_orders: 'Fetching Recent Orders...',
  get_orders_by_status: 'Filtering Order Lifecycle States...',
  get_outstanding_invoices: 'Reviewing Outstanding Invoices...',
  get_recent_invoices: 'Querying Financial Invoices...',
  get_payment_summary: 'Auditing Payment Settlements...',
  search_products: 'Searching Product Catalog...',
};

export const ToolActivityBadge: React.FC<ToolActivityBadgeProps> = ({
  toolName,
  isInvestigating = false,
}) => {
  const label = toolName
    ? TOOL_LABELS[toolName] || `Executing ${toolName}...`
    : 'Flowza AI is reasoning over your business data...';

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-xs font-medium font-mono animate-pulse shadow-sm">
      {isInvestigating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      )}
      <span>{label}</span>
    </div>
  );
};
