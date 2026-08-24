import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { InvoiceDetailsModal } from '../../components/invoices/InvoiceDetailsModal';
import { orderService } from '../../services/orderService';
import { invoiceService } from '../../services/invoiceService';
import { PurchaseOrder, OrderStatus, Invoice } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/auth';
import { toast } from 'sonner';
import {
  ShoppingBag,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Calendar,
  MapPin,
  Building,
  Truck,
  MessageSquare,
  Box,
  Ban,
  PackageCheck,
  FileCheck,
  FileText,
} from 'lucide-react';

function getRelativeTime(dateString: string): string {
  if (!dateString) return 'Just now';
  const now = new Date();
  const past = new Date(dateString);
  const diffInSecs = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSecs < 60) return 'Just now';
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)} min ago`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)} hours ago`;
  if (diffInSecs < 172800) return '1 day ago';
  return `${Math.floor(diffInSecs / 86400)} days ago`;
}

export const VendorOrders: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'value'>('newest');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch Vendor Stats
  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => orderService.getOrderStats(),
    refetchInterval: 30000,
  });

  // Fetch Sent Orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders', activeTab, searchQuery, sortBy],
    queryFn: () =>
      orderService.getMyOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery || undefined,
        sort_by: sortBy,
      }),
  });

  const orders: PurchaseOrder[] = useMemo(() => {
    return ordersData?.orders || [];
  }, [ordersData]);

  // Real-time WebSocket Handler for Vendor
  const handleWebSocketMessage = useCallback(
    (message: any) => {
      if (message.type === 'order_status_updated') {
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-stats'] });

        const supplierName = message.data.actor_name || 'Supplier';
        const st = message.data.status;
        const statusText =
          st === 'accepted'
            ? 'accepted your order!'
            : st === 'rejected'
            ? 'declined your order.'
            : st === 'shipped'
            ? 'dispatched your order!'
            : `updated order status to ${st.replace('_', ' ')}.`;

        if (st === 'accepted' || st === 'shipped' || st === 'completed') {
          toast.success(`🎉 ${supplierName} ${statusText}`, {
            description: `Order #${message.data.order_number || ''}`,
            duration: 6000,
          });
        } else if (st === 'rejected') {
          toast.error(`❌ Supplier ${statusText}`, {
            description: message.data.supplier_response ? `Reason: "${message.data.supplier_response}"` : undefined,
            duration: 6000,
          });
        } else {
          toast.info(`ℹ️ Order #${message.data.order_number || ''}: ${st.replace('_', ' ')}`);
        }
      }
    },
    [queryClient]
  );

  useWebSocket(handleWebSocketMessage);

  // Status Mutation (Cancel, Confirm Delivery, Complete)
  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status, note }: { orderId: string; status: OrderStatus; note?: string }) => {
      return await orderService.updateOrderStatus(orderId, status, note);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success(
        variables.status === 'cancelled'
          ? 'Order cancelled. Reserved inventory released.'
          : variables.status === 'delivered'
          ? 'Delivery confirmed! Please inspect goods and complete sign-off.'
          : 'Order successfully completed and settled!'
      );
      setIsCancelModalOpen(false);
      setIsDetailModalOpen(false);
      setCancelReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update order status');
    },
  });

  const [orderInvoice, setOrderInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  const handleOpenCancel = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleOpenDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleViewInvoice = async (order: PurchaseOrder) => {
    try {
      setIsLoadingInvoice(true);
      const inv = await invoiceService.getInvoiceByOrderId(order.raw_id);
      if (!inv) {
        toast.info('Invoice has not been generated by the supplier yet.');
        return;
      }
      setOrderInvoice(inv);
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to retrieve invoice');
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All Orders', count: stats?.total_orders },
    { id: 'pending', label: 'Pending', count: stats?.pending_orders },
    { id: 'accepted', label: 'Accepted', count: stats?.accepted_orders },
    { id: 'processing', label: 'Processing', count: stats?.processing_orders ?? stats?.in_progress_orders },
    { id: 'packed', label: 'Packed', count: stats?.packed_orders },
    { id: 'shipped', label: 'In Transit', count: stats?.shipped_orders },
    { id: 'delivered', label: 'Delivered', count: stats?.delivered_orders },
    { id: 'completed', label: 'Completed', count: stats?.completed_orders },
    { id: 'rejected', label: 'Rejected', count: stats?.rejected_orders },
    { id: 'cancelled', label: 'Cancelled', count: stats?.cancelled_orders },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Purchase Orders & Lifecycle
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Real-time Tracking
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track fulfillment lifecycle, confirm supplier deliveries, and settle inventory
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard/vendor/orders/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Request New Order
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Total Sent</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              {stats?.total_orders ?? orders.length}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">All-time purchase orders</p>
          </Card>
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-amber-500 uppercase tracking-wider">Pending Review</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {stats?.pending_orders ?? 0}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">Awaiting supplier accept</p>
          </Card>
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-indigo-500 uppercase tracking-wider">In Fulfillment</p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
              {(stats?.accepted_orders || 0) + (stats?.processing_orders || stats?.in_progress_orders || 0) + (stats?.packed_orders || 0) + (stats?.shipped_orders || 0)}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">Processing, packed & in transit</p>
          </Card>
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-emerald-500 uppercase tracking-wider">Completed</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {stats?.completed_orders ?? 0}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">Delivered and signed off</p>
          </Card>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">High Priority</option>
              <option value="value">Highest Value</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-mono">Loading purchase orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
              <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No purchase orders found</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab !== 'all' ? `No orders in stage "${activeTab}".` : 'Start by creating your first purchase order.'}
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              const statusNorm = ord.status.toLowerCase();
              const isPending = statusNorm === 'pending';
              const isAccepted = statusNorm === 'accepted';
              const isShipped = statusNorm === 'shipped';
              const isDelivered = statusNorm === 'delivered';
              const isCompleted = statusNorm === 'completed';
              const canCancel = isPending || isAccepted;

              return (
                <Card
                  key={ord.raw_id || ord.id}
                  className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-blue-500/30 transition-all rounded-2xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
                          {ord.id}
                        </span>
                        <Badge
                          variant={
                            statusNorm === 'pending'
                              ? 'warning'
                              : statusNorm === 'accepted'
                              ? 'primary'
                              : statusNorm === 'processing' || statusNorm === 'in_progress'
                              ? 'accent'
                              : statusNorm === 'packed'
                              ? 'primary'
                              : statusNorm === 'shipped'
                              ? 'accent'
                              : statusNorm === 'delivered'
                              ? 'primary'
                              : statusNorm === 'completed'
                              ? 'success'
                              : statusNorm === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          ● {statusNorm.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {ord.priority}
                        </Badge>
                        <span className="text-[11px] text-slate-400 ml-1 font-mono">
                          {getRelativeTime(ord.created_at)}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ord.title}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          <strong className="text-slate-900 dark:text-slate-200">
                            {ord.supplier?.company_name || 'Supplier Company'}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {ord.supplier?.city || 'Coimbatore'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Delivery: {ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString() : 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Items & Total */}
                    <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-6">
                      <div>
                        <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Items</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ord.item_count} items
                        </span>
                        <p className="text-[11px] text-slate-500 truncate max-w-[180px]" title={ord.item_preview}>
                          {ord.item_preview}
                        </p>
                      </div>

                      <div>
                        <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                        <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                          {ord.formatted_total}
                        </span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDetail(ord)} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Details
                      </Button>

                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCancel(ord)}
                          className="text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      )}

                      {isShipped && (
                        <Button
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: ord.raw_id,
                              status: 'delivered',
                              note: 'Vendor confirmed delivery receipt at store dock.',
                            })
                          }
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          disabled={statusMutation.isPending}
                        >
                          <PackageCheck className="w-3.5 h-3.5 mr-1" /> Confirm Delivery
                        </Button>
                      )}

                      {isDelivered && (
                        <Button
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: ord.raw_id,
                              status: 'completed',
                              note: 'Goods inspected and accepted. Order settled.',
                            })
                          }
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          disabled={statusMutation.isPending}
                        >
                          <FileCheck className="w-3.5 h-3.5 mr-1" /> Complete & Settle
                        </Button>
                      )}

                      {isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(ord)}
                          disabled={isLoadingInvoice}
                          className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> View Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Cancel Modal */}
        <Dialog
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel Purchase Order"
          description="Confirm order cancellation and release supplier inventory reservation"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-xxs font-bold text-rose-400 uppercase tracking-wider block">Cancelling:</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedOrder.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">Supplier: {selectedOrder.supplier?.company_name}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cancellation Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule changed, or duplicate order."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
                  Keep Order
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    statusMutation.mutate({
                      orderId: selectedOrder.raw_id,
                      status: 'cancelled',
                      note: cancelReason || 'Cancelled by ordering vendor.',
                    })
                  }
                  disabled={statusMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4"
                >
                  {statusMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation ✕'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Order Detail Modal with Timeline */}
        <Dialog
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order #${selectedOrder?.id || ''}`}
          description={`Created on ${selectedOrder ? new Date(selectedOrder.created_at).toLocaleString() : ''}`}
          size="xl"
        >
          {selectedOrder && (
            <div className="space-y-6 pt-1">
              {/* Order Timeline Stepper & History */}
              <OrderTimeline
                currentStatus={selectedOrder.status}
                timeline={selectedOrder.timeline}
                createdDate={selectedOrder.created_at}
              />

              {/* Supplier & Delivery Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                    Supplier Organization
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-600/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                      {selectedOrder.supplier?.company_name?.slice(0, 2).toUpperCase() || 'SP'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{selectedOrder.supplier?.company_name}</h4>
                      <p className="text-xxs text-slate-400">{selectedOrder.supplier?.full_name}</p>
                    </div>
                  </div>
                  <p className="text-xxs text-slate-400 flex items-center gap-1 mt-2">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    {selectedOrder.supplier?.city}, {selectedOrder.supplier?.state}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                    Delivery Specifications
                  </span>
                  <p className="text-xs text-slate-300">
                    <strong className="text-slate-400">Target Date:</strong>{' '}
                    {selectedOrder.delivery_date
                      ? new Date(selectedOrder.delivery_date).toLocaleDateString()
                      : 'Standard delivery'}
                  </p>
                  <p className="text-xxs text-slate-400 leading-relaxed">
                    <strong className="text-slate-400">Destination:</strong> {selectedOrder.delivery_address}
                  </p>
                </div>
              </div>

              {/* Items Table with Snapshot Names & Prices */}
              <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                <div className="p-3 bg-slate-900 border-b border-slate-800 font-bold text-slate-200 flex justify-between">
                  <span>Purchased Items ({selectedOrder.items?.length || 1})</span>
                  <span className="text-xxs font-mono text-slate-400">Locked Snapshots</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase bg-slate-950/80">
                      <th className="p-3 w-10">#</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-center">Unit</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-slate-500 text-center">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-200">
                          {item.product_name_snapshot || item.product_name}
                        </td>
                        <td className="p-3 text-center font-mono">{item.quantity}</td>
                        <td className="p-3 text-center text-slate-400">{item.unit || 'units'}</td>
                        <td className="p-3 text-right font-mono text-slate-400">
                          ₹{Number(item.unit_price || item.estimated_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-400">
                          ₹{Number(item.subtotal || (item.quantity * (item.unit_price || item.estimated_price || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900/80 font-bold border-t border-slate-800">
                      <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-slate-400 text-xs">
                        TOTAL PAYABLE
                      </td>
                      <td className="p-3 text-right text-sm font-black text-blue-400 font-mono">
                        {selectedOrder.formatted_total}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Actions in Modal */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  {(selectedOrder.status === 'pending' || selectedOrder.status === 'accepted') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenCancel(selectedOrder);
                      }}
                      className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    >
                      Cancel Order
                    </Button>
                  )}

                  {selectedOrder.status === 'shipped' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({
                          orderId: selectedOrder.raw_id,
                          status: 'delivered',
                          note: 'Vendor confirmed receipt of goods.',
                        })
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      Confirm Delivery
                    </Button>
                  )}

                  {selectedOrder.status === 'delivered' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({
                          orderId: selectedOrder.raw_id,
                          status: 'completed',
                          note: 'Final signoff completed.',
                        })
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Complete & Settle
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Dialog>

        {/* Invoice Details Modal */}
        <InvoiceDetailsModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          invoice={orderInvoice}
          isSupplier={false}
        />
      </div>
    </PageWrapper>
  );
};
