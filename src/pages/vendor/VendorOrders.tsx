import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { orderService } from '../../services/orderService';
import { PurchaseOrder } from '../../types';
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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export const VendorOrders: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch Vendor Stats
  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => orderService.getOrderStats(),
    refetchInterval: 30000,
  });

  // Fetch Sent Orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders', activeTab, searchQuery],
    queryFn: () =>
      orderService.getMyOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery || undefined,
      }),
  });

  const orders: PurchaseOrder[] = useMemo(() => {
    return ordersData?.orders || [];
  }, [ordersData]);

  // Real-time WebSocket Handler for Vendor
  const handleWebSocketMessage = useCallback(
    (message: any) => {
      if (message.type === 'order_status_updated') {
        // Refetch queries
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-stats'] });

        const supplierName = message.data.supplier_company || 'Supplier';
        const st = message.data.status;
        const statusText =
          st === 'accepted'
            ? 'accepted your order!'
            : st === 'rejected'
            ? 'declined your order.'
            : `updated order status to ${st}.`;

        if (st === 'accepted') {
          toast.success(`🎉 ${supplierName} ${statusText}`, {
            description: `Order: "${message.data.title || ''}"`,
            duration: 6000,
          });
        } else if (st === 'rejected') {
          toast.error(`❌ ${supplierName} ${statusText}`, {
            description: message.data.supplier_response ? `Reason: "${message.data.supplier_response}"` : undefined,
            duration: 6000,
          });
        } else {
          toast.info(`ℹ️ ${supplierName} ${statusText}`);
        }
      }
    },
    [queryClient]
  );

  useWebSocket(handleWebSocketMessage);

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sent Purchase Orders
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track real-time responses and fulfillment status of orders sent to suppliers
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard/vendor/orders/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <PlusCircle size={14} className="mr-1.5" /> Request New Order
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Total Sent</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats?.total_orders ?? orders.length}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xxs font-bold text-amber-600 uppercase tracking-wider">Awaiting Response</p>
                <h3 className="text-2xl font-black text-amber-600 mt-0.5">
                  {stats?.pending_orders ?? 0}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xxs font-bold text-emerald-600 uppercase tracking-wider">Accepted</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                  {stats?.accepted_orders ?? 0}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Completed</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats?.completed_orders ?? 0}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#151d2e] text-slate-600 flex items-center justify-center">
                <Truck size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs & Search */}
        <div className="bg-white dark:bg-[#0c111d] rounded-xl border border-slate-200 dark:border-[#1e293b] p-3 sm:p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            {['all', 'pending', 'accepted', 'in_progress', 'completed', 'rejected'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#151d2e] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' ? 'All Orders' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative pt-1 border-t border-slate-100 dark:border-[#1e293b]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search sent orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 dark:bg-[#111827]"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading purchase orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-3">
              <ShoppingBag size={28} className="text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">No purchase orders found</h3>
              <p className="text-xs text-slate-400">Start by creating a new purchase request to a supplier.</p>
              <Button
                size="sm"
                onClick={() => navigate('/dashboard/vendor/orders/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Create Order Request
              </Button>
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.raw_id || ord.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                      {ord.id}
                    </span>
                    <Badge
                      variant={
                        ord.status === 'pending'
                          ? 'warning'
                          : ord.status === 'accepted'
                          ? 'primary'
                          : ord.status === 'completed'
                          ? 'success'
                          : ord.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xxs uppercase font-extrabold"
                    >
                      ● {ord.status}
                    </Badge>
                  </div>
                  <span className="text-xxs text-slate-400">
                    Sent: {new Date(ord.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ord.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    TO: <span className="font-semibold text-slate-800 dark:text-slate-200">{ord.supplier?.company_name}</span> ({ord.supplier?.city})
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-xxs text-slate-400 uppercase font-bold block">Items</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{ord.item_count} items</span>
                  </div>
                  <div>
                    <span className="text-xxs text-slate-400 uppercase font-bold block">Estimated Total</span>
                    <span className="font-bold text-blue-600 font-mono">{ord.formatted_total}</span>
                  </div>
                  <div>
                    <span className="text-xxs text-slate-400 uppercase font-bold block">Delivery Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="text-right flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setIsDetailModalOpen(true);
                      }}
                      className="text-xs font-semibold"
                    >
                      <Eye size={13} className="mr-1" /> View Details
                    </Button>
                  </div>
                </div>

                {ord.supplier_response && (
                  <div className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-[#151d2e] border border-slate-200/60 dark:border-[#1e293b] flex items-start gap-1.5">
                    <MessageSquare size={13} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Supplier Response ({ord.supplier?.company_name}):
                      </span>
                      <p className="italic text-slate-600 dark:text-slate-400 mt-0.5">"{ord.supplier_response}"</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail Modal */}
        <Dialog
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order #${selectedOrder?.id || ''}`}
          description="Detailed purchase order specifications and timeline"
          size="lg"
        >
          {selectedOrder && (
            <div className="space-y-4 pt-1 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#151d2e] border border-slate-200/60 dark:border-[#1e293b] flex items-center justify-between">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase block">Status</span>
                  <Badge variant="primary" className="text-xs uppercase font-bold mt-0.5">
                    ● {selectedOrder.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-xxs font-bold text-slate-400 uppercase block">Supplier</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                    {selectedOrder.supplier?.company_name}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-[#1e293b] space-y-2">
                <span className="text-xxs font-bold text-slate-400 uppercase block">Order Specifications</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedOrder.title}</p>
                {selectedOrder.description && <p className="text-slate-600 dark:text-slate-400 italic">"{selectedOrder.description}"</p>}
                <p className="text-xxs text-slate-500">
                  Delivery Destination: {selectedOrder.delivery_address || 'Coimbatore'}
                </p>
              </div>

              {selectedOrder.supplier_response && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <span className="text-xxs font-bold text-blue-600 uppercase block">Supplier Response Note</span>
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mt-0.5">
                    "{selectedOrder.supplier_response}"
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </PageWrapper>
  );
};
