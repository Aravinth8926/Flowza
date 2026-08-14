import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { orderService } from '../../services/orderService';
import { PurchaseOrder, OrderStatus } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/auth';
import { toast } from 'sonner';
import {
  Package,
  Bell,
  CheckCircle2,
  Truck,
  Search,
  ArrowUpDown,
  Clock,
  MapPin,
  Building,
  Check,
  X,
  Eye,
  Calendar,
  AlertCircle,
  FileText,
  Sparkles,
  Phone,
  Mail,
  ChevronRight,
  ShieldCheck,
  Receipt,
  User as UserIcon,
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

  // Track newly arrived order IDs to show "✨ NEW" badge for 60 seconds
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Form notes state
  const [acceptNote, setAcceptNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

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
        // Invalidate queries so TanStack Query immediately refetches
        queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-stats'] });

        const orderId = message.data.id;
        const vendorCompany = message.data.vendor_company || 'Vendor';
        const itemCount = message.data.item_count || 1;
        const estValue = message.data.estimated_value ? `₹${Number(message.data.estimated_value).toLocaleString('en-IN')}` : '';

        // Add to newOrderIds set for 60s
        setNewOrderIds((prev) => new Set(prev).add(orderId));
        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        }, 60000);

        // Toast notification
        toast.info(`🔔 New purchase order from ${vendorCompany}!`, {
          description: `${itemCount} items • ${estValue}`,
          duration: 7000,
          action: {
            label: 'View',
            onClick: () => {
              orderService.getOrderById(orderId).then((ord) => {
                if (ord) {
                  setSelectedOrder(ord);
                  setIsDetailModalOpen(true);
                }
              });
            },
          },
        });
      } else if (message.type === 'order_status_updated') {
        queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-stats'] });

        if (message.data.status === 'cancelled') {
          toast.warning('An incoming order was cancelled by the vendor.');
        }
      }
    },
    [queryClient]
  );

  useWebSocket(handleWebSocketMessage);

  // Accept Order Mutation
  const acceptMutation = useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      return await orderService.respondToOrder(orderId, 'accept', note || 'Order accepted and queued for fulfillment.');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success('Order accepted! Vendor has been notified in real-time.');
      setIsAcceptModalOpen(false);
      setIsDetailModalOpen(false);
      setAcceptNote('');
    },
    onError: () => {
      toast.error('Failed to accept order. Please try again.');
    },
  });

  // Reject Order Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      return await orderService.respondToOrder(orderId, 'reject', reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.error('Order rejected. Vendor has been notified.');
      setIsRejectModalOpen(false);
      setIsDetailModalOpen(false);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Failed to reject order. Please try again.');
    },
  });

  // Mark Completed Mutation
  const completeMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await orderService.updateOrderStatus(orderId, 'completed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success('Order marked as Completed!');
      setIsDetailModalOpen(false);
    },
  });

  const handleOpenAccept = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setAcceptNote('Prices confirmed as quoted. Will deliver on schedule.');
    setIsAcceptModalOpen(true);
  };

  const handleOpenReject = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleOpenDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Incoming Retail Purchase Orders
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Purchase requests from retail vendors that require your immediate response
            </p>
          </div>
        </div>

        {/* Component A: Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Received */}
          <Card className="border-slate-200 dark:border-[#1e293b] hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Received
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats?.total_orders ?? orders.length}
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">All time requests</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#151d2e] text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <Package size={20} />
              </div>
            </CardContent>
          </Card>

          {/* New Requests (Amber + Pulse) */}
          <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <p className="text-xxs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    New Requests
                  </p>
                </div>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 transition-all">
                  {stats?.pending_orders ?? 0}
                </h3>
                <p className="text-xxs font-medium text-amber-600/80 dark:text-amber-400/80 mt-0.5">Requires response</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Bell size={20} className="animate-bounce" />
              </div>
            </CardContent>
          </Card>

          {/* Accepted */}
          <Card className="border-slate-200 dark:border-[#1e293b] hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xxs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Accepted
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats?.accepted_orders ?? 0}
                </h3>
                <p className="text-xxs text-blue-600 dark:text-blue-400 font-medium mt-0.5">In fulfillment</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="border-slate-200 dark:border-[#1e293b] hover:shadow-xs transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xxs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Completed
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats?.completed_orders ?? 0}
                </h3>
                <p className="text-xxs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Dispatched & delivered</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Truck size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Component B: Filter Tabs & Search Controls */}
        <div className="bg-white dark:bg-[#0c111d] rounded-xl border border-slate-200 dark:border-[#1e293b] p-3 sm:p-4 space-y-3 shadow-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            {[
              { id: 'all', label: 'All', count: stats?.total_orders },
              { id: 'pending', label: 'Pending', count: stats?.pending_orders, badgeColor: 'amber' },
              { id: 'accepted', label: 'Accepted', count: stats?.accepted_orders },
              { id: 'in_progress', label: 'In Progress', count: stats?.in_progress_orders },
              { id: 'completed', label: 'Completed', count: stats?.completed_orders },
              { id: 'rejected', label: 'Rejected', count: stats?.rejected_orders },
              { id: 'cancelled', label: 'Cancelled', count: stats?.cancelled_orders },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const hasCount = tab.count !== undefined && tab.count !== null;
              const isPendingBadge = tab.id === 'pending' && (tab.count || 0) > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isPendingBadge
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                      : 'bg-slate-100/80 dark:bg-[#151d2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1e293b]'
                  }`}
                >
                  {isPendingBadge && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />}
                  <span>{tab.label}</span>
                  {hasCount && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-xxs font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isPendingBadge
                          ? 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 font-bold'
                          : 'bg-slate-200/80 dark:bg-[#1f2b42] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Sort Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-[#1e293b]">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search by vendor name or order title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 dark:bg-[#111827]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xxs font-bold text-slate-400 uppercase shrink-0">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Highest Priority</option>
                <option value="value">Highest Value</option>
              </select>
            </div>
          </div>
        </div>

        {/* Component C & D: Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading incoming orders stream...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-[#151d2e] flex items-center justify-center text-slate-400 mx-auto">
                <Package size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No incoming orders found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeTab !== 'all'
                  ? `No orders matching status "${activeTab}". Try switching tabs or clearing filters.`
                  : 'No purchase orders have been submitted by retail vendors yet.'}
              </p>
            </div>
          ) : (
            orders.map((ord) => {
              const isPending = ord.status === 'pending';
              const isAccepted = ord.status === 'accepted';
              const isInProgress = ord.status === 'in_progress';
              const isCompleted = ord.status === 'completed';
              const isRejected = ord.status === 'rejected';
              const isCancelled = ord.status === 'cancelled';
              const isJustArrived = newOrderIds.has(ord.raw_id);

              // Border and background classes based on state
              const borderClass = isPending
                ? 'border-l-4 border-l-amber-500 bg-amber-500/[0.02] dark:bg-amber-500/[0.04]'
                : isAccepted
                ? 'border-l-4 border-l-blue-500 bg-blue-500/[0.02]'
                : isInProgress
                ? 'border-l-4 border-l-orange-500 bg-orange-500/[0.02]'
                : isCompleted
                ? 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.02]'
                : isRejected
                ? 'border-l-4 border-l-red-500 bg-red-500/[0.02]'
                : 'border-l-4 border-l-slate-400 bg-slate-50/50';

              return (
                <div
                  key={ord.raw_id || ord.id}
                  className={`rounded-xl border border-slate-200 dark:border-[#1e293b] ${borderClass} p-4 sm:p-5 transition-all hover:shadow-sm space-y-4`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPending && <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />}
                      {isAccepted && <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                      {isCompleted && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                      {isRejected && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}

                      <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                        {ord.id}
                      </span>

                      <Badge
                        variant={
                          isPending
                            ? 'warning'
                            : isAccepted
                            ? 'primary'
                            : isInProgress
                            ? 'accent'
                            : isCompleted
                            ? 'success'
                            : isRejected
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xxs uppercase font-extrabold tracking-wider"
                      >
                        {isPending && '🟡 PENDING'}
                        {isAccepted && '✅ ACCEPTED'}
                        {isInProgress && '🔄 IN PROGRESS'}
                        {isCompleted && '✅ COMPLETED'}
                        {isRejected && '❌ REJECTED'}
                        {isCancelled && 'CANCELLED'}
                      </Badge>

                      {isJustArrived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-black bg-amber-500 text-white animate-bounce shadow-xs">
                          <Sparkles size={11} /> ✨ NEW
                        </span>
                      )}
                    </div>

                    <div className="text-xxs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock size={12} className="text-slate-400" />
                      {getRelativeTime(ord.created_at)}
                    </div>
                  </div>

                  {/* Order Title */}
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {ord.title}
                    </h2>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-xs">
                    {/* FROM Vendor Card */}
                    <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1e293b] flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {ord.vendor?.company_name?.slice(0, 2).toUpperCase() || 'VN'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                          FROM (Vendor)
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {ord.vendor?.company_name}
                        </p>
                        <p className="text-xxs text-slate-500 dark:text-slate-400 flex items-center gap-0.5 truncate">
                          <MapPin size={10} className="shrink-0" /> {ord.vendor?.city || 'Coimbatore'}
                        </p>
                      </div>
                    </div>

                    {/* Priority & Delivery Date */}
                    <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1e293b]">
                      <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                        Priority & Delivery
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant={
                            ord.priority === 'urgent'
                              ? 'destructive'
                              : ord.priority === 'high'
                              ? 'accent'
                              : ord.priority === 'medium'
                              ? 'primary'
                              : 'secondary'
                          }
                          className="text-xxs uppercase font-bold"
                        >
                          ● {ord.priority}
                        </Badge>
                      </div>
                      <p className="text-xxs text-slate-600 dark:text-slate-300 font-semibold mt-1 flex items-center gap-1">
                        <Calendar size={11} className="text-blue-500" />
                        {ord.delivery_date
                          ? new Date(ord.delivery_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Standard Delivery'}
                      </p>
                    </div>

                    {/* Item Count & Preview */}
                    <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1e293b]">
                      <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                        Item Count
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {ord.item_count} items requested
                      </p>
                      <p className="text-xxs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={ord.item_preview}>
                        {ord.item_preview}
                      </p>
                    </div>

                    {/* Estimated Value */}
                    <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#1e293b]">
                      <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                        Estimated Value
                      </span>
                      <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                        {ord.formatted_total || `₹${Number(ord.estimated_value || 0).toLocaleString('en-IN')}`}
                      </p>
                      <p className="text-xxs text-slate-400">Total payable estimate</p>
                    </div>
                  </div>

                  {/* Description Preview if present */}
                  {ord.description && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-[#111827]/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-[#1e293b] italic line-clamp-2">
                      "{ord.description}"
                    </div>
                  )}

                  {/* Response note if accepted or rejected */}
                  {ord.supplier_response && (
                    <div
                      className={`text-xs p-2.5 rounded-lg border flex items-start gap-1.5 ${
                        isAccepted
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
                          : isRejected
                          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                          : 'bg-slate-100 dark:bg-[#151d2e] border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-bold shrink-0">Your Response:</span>
                      <span>"{ord.supplier_response}"</span>
                    </div>
                  )}

                  {/* Card Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-[#1e293b]/80">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(ord)}
                      className="text-xs font-semibold"
                    >
                      <Eye size={14} className="mr-1.5" /> View Details
                    </Button>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReject(ord)}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50 cursor-pointer"
                          >
                            <X size={14} className="mr-1" /> Reject
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleOpenAccept(ord)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer px-4"
                          >
                            <Check size={14} className="mr-1" /> Accept Order
                          </Button>
                        </>
                      )}

                      {isInProgress && (
                        <Button
                          size="sm"
                          onClick={() => completeMutation.mutate(ord.raw_id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 size={14} className="mr-1" /> Mark Completed
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL E: Accept Order Request Modal */}
        <Dialog
          isOpen={isAcceptModalOpen}
          onClose={() => setIsAcceptModalOpen(false)}
          title="Accept Order Request"
          description="Confirm order acceptance and notify the retail vendor"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <span className="text-xxs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  You're accepting:
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">"{selectedOrder.title}"</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  from {selectedOrder.vendor?.company_name} ({selectedOrder.vendor?.city}) • Value:{' '}
                  <span className="font-bold text-blue-600">{selectedOrder.formatted_total}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                  Response Note to Vendor (Optional)
                </label>
                <textarea
                  rows={3}
                  value={acceptNote}
                  onChange={(e) => setAcceptNote(e.target.value)}
                  placeholder="e.g. We can deliver by Aug 14th morning. Prices confirmed as quoted."
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-2.5 text-xs text-slate-900 dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <p className="text-xxs text-slate-500 dark:text-slate-400">
                By accepting, the vendor will be notified instantly via WebSocket and the order status will change to{' '}
                <span className="font-bold text-emerald-600">"Accepted"</span>.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e293b]">
                <Button variant="outline" size="sm" onClick={() => setIsAcceptModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptMutation.mutate({ orderId: selectedOrder.raw_id, note: acceptNote })}
                  disabled={acceptMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 cursor-pointer"
                >
                  {acceptMutation.isPending ? 'Confirming...' : 'Confirm & Accept ✓'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* MODAL F: Reject Order Request Modal */}
        <Dialog
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Reject Order Request"
          description="Provide a reason to inform the vendor"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                <span className="text-xxs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                  You're rejecting:
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">"{selectedOrder.title}"</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  from {selectedOrder.vendor?.company_name} ({selectedOrder.vendor?.city})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Currently out of stock on tomatoes and onions. Can fulfill next week."
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-2.5 text-xs text-slate-900 dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e293b]">
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
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 cursor-pointer"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection ✕'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* MODAL G: Order Detail Page / Modal */}
        <Dialog
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order #${selectedOrder?.id || ''}`}
          description={`Submitted on ${selectedOrder ? new Date(selectedOrder.created_at).toLocaleString() : ''}`}
          size="xl"
        >
          {selectedOrder && (
            <div className="space-y-6 pt-1">
              {/* Header Status Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#151d2e] border border-slate-200/60 dark:border-[#1e293b]">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                  <Badge
                    variant={
                      selectedOrder.status === 'pending'
                        ? 'warning'
                        : selectedOrder.status === 'accepted'
                        ? 'primary'
                        : selectedOrder.status === 'in_progress'
                        ? 'accent'
                        : selectedOrder.status === 'completed'
                        ? 'success'
                        : selectedOrder.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs uppercase font-extrabold mt-0.5"
                  >
                    ● {selectedOrder.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                  <Badge variant="outline" className="text-xs uppercase font-bold mt-0.5">
                    {selectedOrder.priority} Priority
                  </Badge>
                </div>
              </div>

              {/* Two Parties Cards (FROM & TO) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* FROM (Vendor) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-2">
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                    FROM (Vendor)
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 font-bold text-xs flex items-center justify-center">
                      {selectedOrder.vendor?.company_name?.slice(0, 2).toUpperCase() || 'VN'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedOrder.vendor?.company_name}
                      </h4>
                      <p className="text-xxs text-slate-500">Retail Supermarket Vendor</p>
                    </div>
                  </div>
                  <div className="pt-2 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      {selectedOrder.vendor?.city}, {selectedOrder.vendor?.state}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      {selectedOrder.vendor?.phone || '+91 9876543210'}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      {selectedOrder.vendor?.email || 'vendor@email.com'}
                    </p>
                  </div>
                </div>

                {/* TO (Supplier) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-2">
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                    TO (You - Supplier)
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                      {selectedOrder.supplier?.company_name?.slice(0, 2).toUpperCase() || 'SP'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedOrder.supplier?.company_name}
                      </h4>
                      <p className="text-xxs text-slate-500">{selectedOrder.supplier?.business_type}</p>
                    </div>
                  </div>
                  <div className="pt-2 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      {selectedOrder.supplier?.city}, {selectedOrder.supplier?.state}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
                      GST: {selectedOrder.supplier?.gst_number || '33AABCU9603R1ZM'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Details Description */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Title</span>
                    <span className="font-bold text-slate-900 dark:text-white block mt-0.5">{selectedOrder.title}</span>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Delivery Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {selectedOrder.delivery_date
                        ? new Date(selectedOrder.delivery_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Standard delivery'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#1e293b]">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Delivery Address</span>
                  <span className="text-slate-700 dark:text-slate-300 mt-0.5 block">
                    {selectedOrder.delivery_address || selectedOrder.vendor?.address_line}
                  </span>
                </div>

                {selectedOrder.description && (
                  <div className="pt-2 border-t border-slate-100 dark:border-[#1e293b]">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Description Notes</span>
                    <p className="text-slate-600 dark:text-slate-300 italic mt-0.5">"{selectedOrder.description}"</p>
                  </div>
                )}
              </div>

              {/* Items Ordered Table */}
              <div className="rounded-xl border border-slate-200 dark:border-[#1e293b] overflow-hidden text-xs">
                <div className="p-3 bg-slate-50 dark:bg-[#151d2e] border-b border-slate-200 dark:border-[#1e293b] font-bold text-slate-900 dark:text-white">
                  Items Ordered ({selectedOrder.items?.length || 1})
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#1e293b] text-xxs font-bold text-slate-400 uppercase bg-slate-50/50 dark:bg-[#151d2e]/50">
                      <th className="p-3 w-10">#</th>
                      <th className="p-3">Product</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-center">Unit</th>
                      <th className="p-3 text-right">Est. Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e293b]">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, idx) => {
                        const lineTotal = (item.quantity || 1) * (item.estimated_price || 0);
                        return (
                          <tr key={idx}>
                            <td className="p-3 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">{item.product_name}</td>
                            <td className="p-3 text-center font-mono">{item.quantity}</td>
                            <td className="p-3 text-center text-slate-500">{item.unit || 'kg'}</td>
                            <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              ₹{Number(item.estimated_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="p-3 text-center font-mono font-bold text-slate-400">1</td>
                        <td className="p-3 font-semibold">{selectedOrder.title}</td>
                        <td className="p-3 text-center font-mono">{selectedOrder.quantity}</td>
                        <td className="p-3 text-center">{selectedOrder.unit || 'units'}</td>
                        <td className="p-3 text-right font-mono">
                          ₹{Number(selectedOrder.estimated_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          ₹{Number(selectedOrder.estimated_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 dark:bg-[#151d2e] font-bold border-t border-slate-200 dark:border-[#1e293b]">
                      <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        TOTAL
                      </td>
                      <td className="p-3 text-right text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                        {selectedOrder.formatted_total}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Timeline */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">Order Timeline</h4>
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#1e293b]">
                  <div className="flex items-start gap-3 relative pl-6">
                    <span className="absolute left-0 top-1 h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xxs">
                      ✓
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">📤 Order Created</p>
                      <p className="text-xxs text-slate-400">
                        {new Date(selectedOrder.created_at).toLocaleString()} by {selectedOrder.vendor?.company_name}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.status === 'pending' ? (
                    <div className="flex items-start gap-3 relative pl-6">
                      <span className="absolute left-0 top-1 h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-xxs animate-pulse">
                        ⏳
                      </span>
                      <div>
                        <p className="font-bold text-amber-600">⏳ Awaiting Supplier Response</p>
                        <p className="text-xxs text-slate-400">Pending review and confirmation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 relative pl-6">
                      <span
                        className={`absolute left-0 top-1 h-4 w-4 rounded-full text-white flex items-center justify-center text-xxs ${
                          selectedOrder.status === 'accepted' || selectedOrder.status === 'completed'
                            ? 'bg-emerald-500'
                            : selectedOrder.status === 'rejected'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                      >
                        ✓
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize">
                          {selectedOrder.status === 'accepted' && '✅ Order Accepted'}
                          {selectedOrder.status === 'rejected' && '❌ Order Declined'}
                          {selectedOrder.status === 'completed' && '✅ Order Completed'}
                        </p>
                        {selectedOrder.responded_at && (
                          <p className="text-xxs text-slate-400">
                            {new Date(selectedOrder.responded_at).toLocaleString()}
                          </p>
                        )}
                        {selectedOrder.supplier_response && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5">
                            "{selectedOrder.supplier_response}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#1e293b]">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>

                {selectedOrder.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenReject(selectedOrder);
                      }}
                      className="text-xs font-semibold text-red-600 border-red-300"
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
                  </div>
                )}
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </PageWrapper>
  );
};
