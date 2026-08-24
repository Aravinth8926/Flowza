import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardContent } from '../../components/ui/Card';
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
  Package,
  CheckCircle2,
  Truck,
  Box,
  Search,
  ArrowUpDown,
  Clock,
  MapPin,
  Check,
  X,
  Eye,
  Calendar,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  Building,
  RotateCcw,
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

export const IncomingOrders: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Filter and Search states
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'value'>('newest');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);

  // Form notes state
  const [acceptNote, setAcceptNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [shipNote, setShipNote] = useState('');

  // Fetch Stats Query
  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => orderService.getOrderStats(),
    refetchInterval: 30000,
  });

  // Fetch Orders Query
  const { data: ordersData, isLoading, isFetching } = useQuery({
    queryKey: ['incoming-orders', activeTab, searchQuery, sortBy],
    queryFn: () =>
      orderService.getIncomingOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery || undefined,
        sort_by: sortBy,
      }),
  });

  const orders: PurchaseOrder[] = useMemo(() => {
    return ordersData?.orders || [];
  }, [ordersData]);

  // Real-time WebSocket Handler
  const handleWebSocketMessage = useCallback(
    (message: any) => {
      if (message.type === 'new_order_request') {
        queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-stats'] });

        const vendorCompany = message.data.vendor_company || 'Vendor';
        const itemCount = message.data.item_count || 1;
        const estValue = message.data.estimated_value ? `₹${Number(message.data.estimated_value).toLocaleString('en-IN')}` : '';

        toast.info(`🔔 New purchase order from ${vendorCompany}!`, {
          description: `${itemCount} items • ${estValue}`,
          duration: 7000,
        });
      } else if (message.type === 'order_status_updated') {
        queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-stats'] });

        const orderNum = message.data.order_number || 'Order';
        const newSt = message.data.status;
        toast.info(`ℹ️ ${orderNum} status updated to ${newSt.replace('_', ' ')}`);
      }
    },
    [queryClient]
  );

  useWebSocket(handleWebSocketMessage);

  // Accept Order Mutation
  const acceptMutation = useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      return await orderService.acceptOrder(orderId, note || 'Order accepted and queued for fulfillment.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success('Order accepted! Vendor has been notified in real-time.');
      setIsAcceptModalOpen(false);
      setIsDetailModalOpen(false);
      setAcceptNote('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to accept order.');
    },
  });

  // Reject Order Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      return await orderService.rejectOrder(orderId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.error('Order rejected. Reserved stock released back to inventory.');
      setIsRejectModalOpen(false);
      setIsDetailModalOpen(false);
      setRejectReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to reject order.');
    },
  });

  // Generic Status Transition Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status, note }: { orderId: string; status: OrderStatus; note?: string }) => {
      return await orderService.updateOrderStatus(orderId, status, note);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success(`Order moved to ${variables.status.replace('_', ' ')}!`);
      setIsDetailModalOpen(false);
      setIsShipModalOpen(false);
      setShipNote('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update order status');
    },
  });

  const handleOpenAccept = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setAcceptNote('Order confirmed and queued for fulfillment.');
    setIsAcceptModalOpen(true);
  };

  const handleOpenReject = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const [orderInvoice, setOrderInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const handleOpenShip = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShipNote('Dispatched via regional freight logistics.');
    setIsShipModalOpen(true);
  };

  const handleOpenDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleViewOrGenerateInvoice = async (order: PurchaseOrder) => {
    try {
      setIsGeneratingInvoice(true);
      // Check if invoice exists
      let inv = await invoiceService.getInvoiceByOrderId(order.raw_id);
      if (!inv) {
        toast.info('Generating official tax invoice...');
        inv = await invoiceService.generateInvoice(order.raw_id);
        toast.success(`Invoice ${inv.invoice_number} generated successfully`);
      }
      setOrderInvoice(inv);
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to retrieve or generate invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All Orders', count: stats?.total_orders },
    { id: 'pending', label: 'Pending', count: stats?.pending_orders },
    { id: 'accepted', label: 'Accepted', count: stats?.accepted_orders },
    { id: 'processing', label: 'Processing', count: stats?.processing_orders ?? stats?.in_progress_orders },
    { id: 'packed', label: 'Packed', count: stats?.packed_orders },
    { id: 'shipped', label: 'Shipped', count: stats?.shipped_orders },
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
                Incoming Retail Orders & Fulfillment
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Fulfillment
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review, accept, pack, and ship procurement orders from your retail vendor network
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Total Received</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              {stats?.total_orders ?? orders.length}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">All-time order requests</p>
          </Card>
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-amber-500 uppercase tracking-wider">Awaiting Response</p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {stats?.pending_orders ?? 0}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">Pending accept/reject</p>
          </Card>
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-blue-500 uppercase tracking-wider">In Fulfillment</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
              {(stats?.accepted_orders || 0) + (stats?.processing_orders || stats?.in_progress_orders || 0) + (stats?.packed_orders || 0)}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">Accepted, processing & packed</p>
          </Card>
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <p className="text-xxs font-bold text-emerald-500 uppercase tracking-wider">Settled & Completed</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {stats?.completed_orders ?? 0}
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">Inventory fulfilled</p>
          </Card>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Scrollable Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white dark:bg-slate-950/30 dark:text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search vendor or PO#..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">High Priority</option>
              <option value="value">Highest Value</option>
            </select>
          </div>
        </div>

        {/* Order Cards List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-mono">Loading incoming orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No incoming orders found</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab !== 'all' ? `No orders in stage "${activeTab}".` : 'No orders from retail vendors yet.'}
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              const statusNorm = ord.status.toLowerCase();
              const isPending = statusNorm === 'pending';
              const isAccepted = statusNorm === 'accepted';
              const isProcessing = statusNorm === 'processing' || statusNorm === 'in_progress';
              const isPacked = statusNorm === 'packed';
              const isCompleted = statusNorm === 'completed';
              const isShipped = statusNorm === 'shipped';

              return (
                <Card
                  key={ord.raw_id}
                  className="p-5 border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-emerald-500/30 transition-all rounded-2xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: ID & Vendor info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
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
                            {ord.vendor?.company_name || 'Vendor Company'}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {ord.vendor?.city || 'Coimbatore'}
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
                          {ord.item_count} {ord.item_count === 1 ? 'item' : 'items'}
                        </span>
                        <p className="text-[11px] text-slate-500 truncate max-w-[180px]" title={ord.item_preview}>
                          {ord.item_preview}
                        </p>
                      </div>

                      <div>
                        <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                        <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {ord.formatted_total}
                        </span>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDetail(ord)} className="text-xs">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Details
                      </Button>

                      {isPending && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReject(ord)}
                            className="text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenAccept(ord)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Accept
                          </Button>
                        </>
                      )}

                      {isAccepted && (
                        <Button
                          size="sm"
                          onClick={() => statusMutation.mutate({ orderId: ord.raw_id, status: 'processing' })}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          disabled={statusMutation.isPending}
                        >
                          <Package className="w-3.5 h-3.5 mr-1" /> Start Processing
                        </Button>
                      )}

                      {isProcessing && (
                        <Button
                          size="sm"
                          onClick={() => statusMutation.mutate({ orderId: ord.raw_id, status: 'packed' })}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          disabled={statusMutation.isPending}
                        >
                          <Box className="w-3.5 h-3.5 mr-1" /> Mark Packed
                        </Button>
                      )}

                      {isPacked && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenShip(ord)}
                          className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
                        >
                          <Truck className="w-3.5 h-3.5 mr-1" /> Mark Shipped
                        </Button>
                      )}

                      {isCompleted && (
                        <Button
                          size="sm"
                          onClick={() => handleViewOrGenerateInvoice(ord)}
                          disabled={isGeneratingInvoice}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Accept Modal */}
        <Dialog
          isOpen={isAcceptModalOpen}
          onClose={() => setIsAcceptModalOpen(false)}
          title="Accept Purchase Order"
          description="Confirm order acceptance to notify retail vendor"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xxs font-bold text-emerald-400 uppercase tracking-wider block">Accepting:</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedOrder.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vendor: {selectedOrder.vendor?.company_name} • Total: <strong className="text-emerald-400">{selectedOrder.formatted_total}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmation Note to Vendor (Optional)
                </label>
                <textarea
                  rows={3}
                  value={acceptNote}
                  onChange={(e) => setAcceptNote(e.target.value)}
                  placeholder="e.g. Confirmed. We will pack and dispatch on schedule."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsAcceptModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptMutation.mutate({ orderId: selectedOrder.raw_id, note: acceptNote })}
                  disabled={acceptMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4"
                >
                  {acceptMutation.isPending ? 'Confirming...' : 'Confirm Acceptance ✓'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Reject Modal */}
        <Dialog
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Purchase Order"
          description="Provide a reason to inform the vendor and release reserved inventory"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-xxs font-bold text-rose-400 uppercase tracking-wider block">Declining:</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedOrder.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vendor: {selectedOrder.vendor?.company_name}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Rejection <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Currently out of stock on requested batch. Restocking next week."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsRejectModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      toast.error('Please enter a rejection reason');
                      return;
                    }
                    rejectMutation.mutate({ orderId: selectedOrder.raw_id, reason: rejectReason });
                  }}
                  disabled={rejectMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection ✕'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Ship Modal */}
        <Dialog
          isOpen={isShipModalOpen}
          onClose={() => setIsShipModalOpen(false)}
          title="Mark Order as Shipped"
          description="Confirm order dispatch and shipping notes for the vendor"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dispatch / Carrier Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={shipNote}
                  onChange={(e) => setShipNote(e.target.value)}
                  placeholder="e.g. Dispatched via Express Logistics Truck #TN38-9988. Expected tomorrow morning."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsShipModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    statusMutation.mutate({
                      orderId: selectedOrder.raw_id,
                      status: 'shipped',
                      note: shipNote,
                    })
                  }
                  disabled={statusMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4"
                >
                  {statusMutation.isPending ? 'Dispatching...' : 'Confirm Shipment 🚚'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Order Detail Modal with Timeline & Historical Snapshots */}
        <Dialog
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order #${selectedOrder?.id || ''}`}
          description={`Submitted on ${selectedOrder ? new Date(selectedOrder.created_at).toLocaleString() : ''}`}
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

              {/* Vendor & Delivery Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                    Vendor Company
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center">
                      {selectedOrder.vendor?.company_name?.slice(0, 2).toUpperCase() || 'VN'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{selectedOrder.vendor?.company_name}</h4>
                      <p className="text-xxs text-slate-400">{selectedOrder.vendor?.full_name}</p>
                    </div>
                  </div>
                  <p className="text-xxs text-slate-400 flex items-center gap-1 mt-2">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    {selectedOrder.vendor?.city}, {selectedOrder.vendor?.state}
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
                    <strong className="text-slate-400">Address:</strong> {selectedOrder.delivery_address}
                  </p>
                </div>
              </div>

              {/* Historical Order Items Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                <div className="p-3 bg-slate-900 border-b border-slate-800 font-bold text-slate-200 flex justify-between">
                  <span>Purchased Items ({selectedOrder.items?.length || 1})</span>
                  <span className="text-xxs font-mono text-slate-400">Historical Snapshot</span>
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
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ₹{Number(item.subtotal || (item.quantity * (item.unit_price || item.estimated_price || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900/80 font-bold border-t border-slate-800">
                      <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-slate-400 text-xs">
                        TOTAL ESTIMATE
                      </td>
                      <td className="p-3 text-right text-sm font-black text-emerald-400 font-mono">
                        {selectedOrder.formatted_total}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  {selectedOrder.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          handleOpenReject(selectedOrder);
                        }}
                        className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          handleOpenAccept(selectedOrder);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4"
                      >
                        Accept Order
                      </Button>
                    </>
                  )}

                  {selectedOrder.status === 'accepted' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({
                          orderId: selectedOrder.raw_id,
                          status: 'processing',
                        })
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                    >
                      Start Processing
                    </Button>
                  )}

                  {(selectedOrder.status === 'processing' || selectedOrder.status === 'in_progress') && (
                    <Button
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({
                          orderId: selectedOrder.raw_id,
                          status: 'packed',
                        })
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                    >
                      Mark Packed
                    </Button>
                  )}

                  {selectedOrder.status === 'packed' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenShip(selectedOrder);
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                    >
                      Mark Shipped
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
          isSupplier={true}
        />
      </div>
    </PageWrapper>
  );
};
