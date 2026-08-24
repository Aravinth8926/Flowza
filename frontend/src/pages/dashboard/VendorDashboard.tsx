import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user';
import { useAuthStore } from '../../store/auth';
import { useOrdersStore } from '../../store/orders';
import { supplierService, SupplierSummary } from '../../services/supplierService';
import { orderService } from '../../services/orderService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { toast } from 'sonner';
import {
  Building,
  MapPin,
  Eye,
  PlusCircle,
  ShoppingBag,
  Bell,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Sparkles,
  Package,
  Search,
  Star,
  MessageSquare,
} from 'lucide-react';

export const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { company, address, fetchCompany, fetchAddress } = useUserStore();
  const { orders, createOrder } = useOrdersStore();

  // Suppliers state
  const [suppliersList, setSuppliersList] = useState<SupplierSummary[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Modals state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  // New Order Form state
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderSupplierName, setOrderSupplierName] = useState('');
  const [orderItem, setOrderItem] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [orderBudget, setOrderBudget] = useState('');
  const [orderUrgency, setOrderUrgency] = useState('Normal Delivery (3-5 days)');

  // History Filter state
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');

  // Load suppliers function
  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const data = await supplierService.getSuppliers();
      setSuppliersList(data);
      if (data.length > 0 && !orderSupplierName) {
        setOrderSupplierId(data[0].id);
        setOrderSupplierName(data[0].company_name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [orderSupplierName]);

  // Real-time WebSocket Event Handler
  const handleWebSocketMessage = useCallback((msg: any) => {
    if (msg.type === 'new_supplier') {
      toast.info(`🎉 New supplier joined: ${msg.data.company_name} (${msg.data.city})`, {
        duration: 5000,
      });
      loadSuppliers();
    } else if (msg.type === 'order_status_updated') {
      const statusMsg =
        msg.data.status === 'accepted'
          ? `✅ Your purchase order ${msg.data.id} was accepted by the supplier!`
          : msg.data.status === 'rejected'
          ? `❌ Your purchase order ${msg.data.id} was declined by the supplier.`
          : `ℹ️ Order status updated: ${msg.data.status}`;
      toast.info(statusMsg, { duration: 6000 });
    }
  }, [loadSuppliers]);

  useWebSocket(handleWebSocketMessage);

  useEffect(() => {
    fetchCompany().catch(() => {});
    fetchAddress().catch(() => {});
    loadSuppliers();

    // Fallback Polling (Every 30s)
    const pollInterval = setInterval(() => {
      loadSuppliers();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [fetchCompany, fetchAddress, loadSuppliers]);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lowStockItems = [
    { name: 'Organic Rice (25kg Bag)', stock: 4, minStock: 20, supplier: 'GreenEarth Organics' },
    { name: 'Cold-pressed Sunflower Oil (5L)', stock: 2, minStock: 15, supplier: 'SunPure Distributors' },
  ];

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderItem || !orderQty) {
      toast.error('Please enter product item and quantity');
      return;
    }

    const selectedSup = suppliersList.find((s) => s.id === orderSupplierId || s.company_name === orderSupplierName) || suppliersList[0];
    const supName = selectedSup ? selectedSup.company_name : orderSupplierName || 'GreenEarth Organics';
    const supId = selectedSup ? selectedSup.id : orderSupplierId;

    // Save to local Zustand store
    const created = createOrder({
      vendorName: company?.company_name || user?.full_name || 'Vendor Enterprise',
      supplierName: supName,
      items: `${orderQty}x ${orderItem}`,
      total: orderBudget ? `₹${parseInt(orderBudget).toLocaleString('en-IN')}` : '₹15,000',
      urgency: orderUrgency,
    });

    // Send API request if backend is connected
    orderService.createOrder({
      supplier_id: supId,
      title: `${orderQty}x ${orderItem}`,
      items: [{ product_name: orderItem, quantity: parseInt(orderQty) || 10, estimated_price: parseFloat(orderBudget) || 1500 }],
      priority: orderUrgency.includes('Urgent') ? 'urgent' : orderUrgency.includes('Priority') ? 'high' : 'medium',
      delivery_address: address ? `${address.address_line}, ${address.city}` : 'Vendor Office',
    }).catch(() => {});

    setIsNewOrderOpen(false);
    toast.success(`Purchase Order ${created.id} sent to ${supName}! Status set to Pending.`);

    // Reset form
    setOrderItem('');
    setOrderQty('');
    setOrderBudget('');
  };

  const filteredHistory = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(historySearch.toLowerCase()) ||
      o.items.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus = historyStatusFilter === 'ALL' || o.status === historyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PageWrapper>
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Vendor Workspace', active: true }]} />

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-[#1e293b] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#151d2e] dark:to-[#0f172a] text-white dark:text-[#f1f5f9] p-6 md:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-white/20 dark:bg-blue-500/15 dark:text-blue-400 dark:border dark:border-blue-500/20 text-white backdrop-blur-xs mb-3">
                <ShieldCheck size={12} /> Verified Vendor Workspace
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Welcome back, {company?.company_name || user?.full_name || 'Vendor'}
              </h1>
              <p className="text-blue-100 dark:text-[#8896ab] text-xs mt-1">{currentDate}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/dashboard/vendor/orders/new')}
                className="bg-white text-blue-700 hover:bg-blue-50 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 font-semibold text-xs border-0 cursor-pointer shadow-xs"
              >
                <PlusCircle size={14} className="mr-1.5" /> Request New Order
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Active Suppliers</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#f1f5f9] mt-1">{suppliersList.length}</h3>
                <p className="text-xxs font-medium text-emerald-600 dark:text-[hsl(160_84%_65%)] mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> Live Network
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-[#1c2740] text-blue-600 dark:text-[hsl(217_91%_65%)] flex items-center justify-center">
                <Building size={20} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Total Purchase Orders</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#f1f5f9] mt-1">{orders.length}</h3>
                <p className="text-xxs font-medium text-blue-600 dark:text-[hsl(217_91%_65%)] mt-1">Active fulfillment pipeline</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-[#1c2740] text-blue-600 dark:text-[hsl(217_91%_65%)] flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Procurement Budget</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#f1f5f9] mt-1">₹1,45,000</h3>
                <p className="text-xxs font-medium text-emerald-600 dark:text-[hsl(160_84%_65%)] mt-1">72% Budget Utilized</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-[#1c2740] text-blue-600 dark:text-[hsl(217_91%_65%)] flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Account Status</p>
                <h3 className="text-sm font-bold text-emerald-600 dark:text-[hsl(160_84%_65%)] mt-1">Verified</h3>
                <p className="text-xxs font-medium text-slate-400 dark:text-[#64748b] mt-0.5">Role: Vendor</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-[#1c2740] text-emerald-600 dark:text-[hsl(160_84%_65%)] flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols */}
          <div className="lg:col-span-2 space-y-8">
            {/* Vendor Quick Actions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Vendor Quick Actions</CardTitle>
                <CardDescription className="text-xs">Quick shortcuts for order placement and supplier discovery</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsBrowseOpen(true)}
                  className="flex items-center gap-2 rounded-lg text-xs font-semibold"
                >
                  <ShoppingBag size={15} />
                  Browse Suppliers ({suppliersList.length})
                </Button>

                <Button
                  onClick={() => navigate('/dashboard/vendor/orders/new')}
                  className="flex items-center gap-2 rounded-lg text-xs font-semibold shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusCircle size={15} />
                  New Purchase Order Request
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => navigate('/dashboard/vendor/orders')}
                  className="flex items-center gap-2 rounded-lg text-xs font-semibold"
                >
                  <Eye size={15} />
                  Sent Orders Tracker ({orders.length})
                </Button>
              </CardContent>
            </Card>

            {/* Live Purchase Orders Status Stream */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200/60 dark:border-[#1e293b]">
                <div>
                  <CardTitle className="text-base font-bold">Recent Purchase Orders & Supplier Responses</CardTitle>
                  <CardDescription className="text-xs">Real-time status updates from suppliers (Accepted, Rejected, Counter-offers)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} className="text-xxs">
                  View All ({orders.length})
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Items Requested</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status & Supplier Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 5).map((ord) => (
                      <TableRow key={ord.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-[#f1f5f9]">{ord.id}</TableCell>
                        <TableCell className="font-semibold text-xs text-slate-800 dark:text-[#e2e8f0]">{ord.supplierName}</TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-[#8896ab]">{ord.items}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-900 dark:text-[#f1f5f9]">{ord.total}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant={
                                ord.status === 'Accepted' || ord.status === 'Dispatched' || ord.status === 'Delivered'
                                  ? 'success'
                                  : ord.status === 'Processing'
                                  ? 'primary'
                                  : ord.status === 'Rejected'
                                  ? 'destructive'
                                  : ord.status === 'Changes Suggested'
                                  ? 'accent'
                                  : 'warning'
                              }
                              className="text-xxs"
                            >
                              {ord.status}
                            </Badge>
                            {ord.supplierNotes && (
                              <div className="text-xxs text-slate-700 dark:text-[#e2e8f0] bg-slate-100 dark:bg-[#151d2e] p-1.5 rounded border border-slate-200/50 dark:border-[#1e293b] flex items-start gap-1">
                                <MessageSquare size={11} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>"{ord.supplierNotes}"</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* AI Low Stock Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200/60 dark:border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-amber-500" size={18} />
                  <div>
                    <CardTitle className="text-base font-bold">AI Inventory Replenishment Alert</CardTitle>
                    <CardDescription className="text-xs">Items approaching safety threshold</CardDescription>
                  </div>
                </div>
                <Badge variant="warning" className="text-xxs">2 Items Low</Badge>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {lowStockItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-[#151d2e] border border-slate-200/60 dark:border-[#1e293b] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-[#f1f5f9] flex items-center gap-2">
                          <Package size={14} className="text-amber-500" />
                          {item.name}
                        </h4>
                        <p className="text-xxs text-slate-500 dark:text-[#8896ab] mt-0.5">Supplier: {item.supplier}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const sup = suppliersList.find((s) => s.company_name === item.supplier) || suppliersList[0];
                          if (sup) {
                            setOrderSupplierId(sup.id);
                            setOrderSupplierName(sup.company_name);
                          }
                          setOrderItem(item.name);
                          setOrderQty('20');
                          setIsNewOrderOpen(true);
                        }}
                        className="text-xxs font-semibold h-7 px-2.5"
                      >
                        Auto Restock
                      </Button>
                    </div>
                    <Progress
                      label={`Stock: ${item.stock} / Minimum safety stock: ${item.minStock}`}
                      value={(item.stock / item.minStock) * 100}
                      variant="warning"
                      size="sm"
                      showLabel
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Col */}
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader className="border-b border-slate-200/60 dark:border-[#1e293b] pb-3">
                <CardTitle className="text-base font-bold">Procurement Spend Budget</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <Progress label="Monthly Spending Limit (₹2,00,000)" value={72} variant="primary" showLabel />
                <p className="text-xxs text-slate-500 dark:text-[#8896ab]">
                  ₹1,45,000 allocated across {suppliersList.length} verified supplier contracts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-slate-200/60 dark:border-[#1e293b] pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Activity Log</span>
                  <Bell size={16} className="text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                {orders.slice(0, 3).map((ord) => (
                  <div key={ord.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-100/60 dark:bg-[#151d2e]">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-[#1c2740] text-blue-600 dark:text-blue-400 shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-[#f1f5f9]">{ord.id} ({ord.status})</h4>
                      <p className="text-xxs text-slate-500 dark:text-[#8896ab] mt-0.5">{ord.items} to {ord.supplierName}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL 1: Create Order Request */}
      <Dialog
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        title="Request New Purchase Order to Supplier"
        description="Select a registered supplier from the live B2B network and submit order details"
        size="lg"
      >
        <form onSubmit={handleCreateOrderSubmit} className="space-y-4 pt-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab]">
                Select Live Registered Supplier ({suppliersList.length} Active)
              </label>
              <span className="text-xxs font-semibold text-emerald-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Real-Time
              </span>
            </div>
            <select
              value={orderSupplierId}
              onChange={(e) => {
                const selected = suppliersList.find((s) => s.id === e.target.value);
                setOrderSupplierId(e.target.value);
                if (selected) setOrderSupplierName(selected.company_name);
              }}
              className="w-full rounded-md border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-[#f1f5f9]"
            >
              {suppliersList.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.company_name} ({sup.business_type} • {sup.city}, {sup.state})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Product / Item Name</label>
              <Input
                placeholder="e.g. Organic Basmati Rice (25kg Bag)"
                value={orderItem}
                onChange={(e) => setOrderItem(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Quantity & Unit</label>
              <Input
                placeholder="e.g. 50 Bags"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Estimated Budget (₹)</label>
              <Input
                placeholder="e.g. 45000"
                type="number"
                value={orderBudget}
                onChange={(e) => setOrderBudget(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Urgency Priority</label>
              <select
                value={orderUrgency}
                onChange={(e) => setOrderUrgency(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-[#f1f5f9]"
              >
                <option value="Normal Delivery (3-5 days)">Normal Delivery (3-5 days)</option>
                <option value="Priority Delivery (1-2 days)">Priority Delivery (1-2 days)</option>
                <option value="Urgent Express (Same Day)">Urgent Express (Same Day)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1e293b]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewOrderOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Send Order Request to Supplier
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: View Orders History */}
      <Dialog
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Purchase Orders History & Status Tracker"
        description="Track real-time supplier responses (Accepted, Rejected, Changes Suggested)"
        size="xl"
      >
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-64 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search orders, suppliers..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 py-1.5 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-1 text-xxs font-bold">
              {(['ALL', 'Pending', 'Accepted', 'Processing', 'Dispatched', 'Delivered', 'Changes Suggested', 'Rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                    historyStatusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-[#151d2e] text-slate-600 dark:text-[#8896ab] hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Items Requested</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status & Supplier Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-[#f1f5f9]">{ord.id}</TableCell>
                    <TableCell className="font-semibold text-xs text-slate-800 dark:text-[#e2e8f0]">{ord.supplierName}</TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-[#8896ab]">{ord.items}</TableCell>
                    <TableCell className="font-bold text-xs text-slate-900 dark:text-[#f1f5f9]">{ord.total}</TableCell>
                    <TableCell className="text-xxs text-slate-500">{ord.date}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={
                            ord.status === 'Accepted' || ord.status === 'Dispatched' || ord.status === 'Delivered'
                              ? 'success'
                              : ord.status === 'Processing'
                              ? 'primary'
                              : ord.status === 'Rejected'
                              ? 'destructive'
                              : ord.status === 'Changes Suggested'
                              ? 'accent'
                              : 'warning'
                          }
                          className="text-xxs"
                        >
                          {ord.status}
                        </Badge>
                        {ord.supplierNotes && (
                          <div className="text-xxs text-slate-700 dark:text-[#e2e8f0] bg-slate-100 dark:bg-[#151d2e] p-1.5 rounded border border-slate-200/60 dark:border-[#1e293b] flex items-start gap-1">
                            <MessageSquare size={11} className="text-blue-500 shrink-0 mt-0.5" />
                            <span>Supplier Note: "{ord.supplierNotes}"</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                    No purchase orders found matching filter criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 3: Browse Verified Suppliers */}
      <Dialog
        isOpen={isBrowseOpen}
        onClose={() => setIsBrowseOpen(false)}
        title="Live Verified Wholesale Suppliers Network"
        description="Connect and send purchase order requests directly to registered suppliers"
        size="xl"
      >
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suppliersList.map((sup) => (
              <div
                key={sup.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50/50 dark:bg-[#111827] space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#f1f5f9]">{sup.company_name}</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{sup.business_type}</p>
                    <p className="text-xxs text-slate-500 dark:text-[#8896ab] flex items-center gap-1 mt-1">
                      <MapPin size={12} /> {sup.city}, {sup.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-[hsl(38_92%_18%_/0.4)] px-2 py-0.5 rounded-full border border-amber-200 dark:border-[hsl(38_92%_28%_/0.4)]">
                    <Star size={12} className="fill-amber-500" />
                    {sup.rating || 4.9}
                  </div>
                </div>

                <p className="text-xxs text-slate-500 dark:text-[#8896ab] line-clamp-2">
                  {sup.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-[#1e293b]">
                  <span className="text-xxs text-slate-500 dark:text-[#8896ab]">
                    {sup.total_orders || 0} orders fulfilled
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsBrowseOpen(false);
                      setOrderSupplierId(sup.id);
                      setOrderSupplierName(sup.company_name);
                      setIsNewOrderOpen(true);
                    }}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 px-3"
                  >
                    Send PO Request
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsBrowseOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </PageWrapper>
  );
};
