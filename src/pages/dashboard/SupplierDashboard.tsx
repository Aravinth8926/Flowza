import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user';
import { useAuthStore } from '../../store/auth';
import { useOrdersStore, PurchaseOrder } from '../../store/orders';
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
  LayoutGrid,
  Bell,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  PackageCheck,
  Truck,
  Check,
  X,
  MessageSquare,
  Search,
  Package,
  Clock,
} from 'lucide-react';

export const SupplierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { company, address, fetchCompany, fetchAddress } = useUserStore();
  const { orders, products, acceptOrder, rejectOrder, suggestChanges, addProduct } = useOrdersStore();

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isIncomingOrdersOpen, setIsIncomingOrdersOpen] = useState(false);

  // Order action modals
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestedNotes, setSuggestedNotes] = useState('');
  const [suggestedTotal, setSuggestedTotal] = useState('');

  // Add Product Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Grains & Pulses');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('Bags');

  // Search state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [ordersSearch, setOrdersSearch] = useState('');

  // Real-time WebSocket Event Handler
  const handleWebSocketMessage = useCallback((msg: any) => {
    if (msg.type === 'new_order_request') {
      toast.info(`🔔 New purchase order request received from ${msg.data.vendor_company}: "${msg.data.title}"`, {
        duration: 6000,
      });
    }
  }, []);

  useWebSocket(handleWebSocketMessage);

  useEffect(() => {
    fetchCompany().catch(() => {});
    fetchAddress().catch(() => {});
  }, [fetchCompany, fetchAddress]);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdStock) {
      toast.error('Please enter product name, price, and stock quantity');
      return;
    }

    addProduct({
      name: newProdName,
      category: newProdCategory,
      price: newProdPrice.startsWith('₹') ? newProdPrice : `₹${newProdPrice}/${newProdUnit.toLowerCase().slice(0, -1)}`,
      stock: parseInt(newProdStock) || 100,
      unit: newProdUnit,
      supplierName: company?.company_name || user?.full_name || 'Supplier',
    });

    toast.success(`Product "${newProdName}" added to wholesale catalog!`);
    setIsAddProductOpen(false);

    // Reset
    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
  };

  const handleAcceptOrder = async (po: PurchaseOrder) => {
    acceptOrder(po.id);
    if (po.raw_id) {
      orderService.respondToOrder(po.raw_id, 'accept', 'Order accepted and queued for dispatch.').catch(() => {});
    }
    toast.success(`Order ${po.id} from ${po.vendorName} accepted! Status set to Accepted.`);
  };

  const handleConfirmReject = async () => {
    if (!selectedOrder) return;
    if (!rejectReason) {
      toast.error('Please enter a reason for rejecting the order');
      return;
    }

    rejectOrder(selectedOrder.id, rejectReason);
    if (selectedOrder.raw_id) {
      orderService.respondToOrder(selectedOrder.raw_id, 'reject', rejectReason).catch(() => {});
    }
    toast.error(`Order ${selectedOrder.id} rejected with note to vendor.`);
    setIsRejectOpen(false);
    setSelectedOrder(null);
    setRejectReason('');
  };

  const handleConfirmSuggestChanges = async () => {
    if (!selectedOrder) return;
    if (!suggestedNotes) {
      toast.error('Please enter your suggested changes or counter-offer notes');
      return;
    }

    suggestChanges(selectedOrder.id, suggestedNotes, suggestedTotal);
    if (selectedOrder.raw_id) {
      orderService.respondToOrder(selectedOrder.raw_id, 'suggest', suggestedNotes).catch(() => {});
    }
    toast.info(`Counter-offer submitted for order ${selectedOrder.id}!`);
    setIsSuggestOpen(false);
    setSelectedOrder(null);
    setSuggestedNotes('');
    setSuggestedTotal('');
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(ordersSearch.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(ordersSearch.toLowerCase()) ||
      o.items.toLowerCase().includes(ordersSearch.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Supplier Workspace', active: true }]} />

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-[#1e293b] bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-[#151d2e] dark:to-[#0f172a] text-white dark:text-[#f1f5f9] p-6 md:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-white/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border dark:border-emerald-500/20 text-white backdrop-blur-xs mb-3">
                <ShieldCheck size={12} /> Verified Supplier Workspace
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Welcome back, {company?.company_name || user?.full_name || 'Supplier'}
              </h1>
              <p className="text-emerald-100 dark:text-[#8896ab] text-xs mt-1">{currentDate}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsAddProductOpen(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500 font-semibold text-xs border-0 cursor-pointer shadow-xs"
              >
                <PlusCircle size={14} className="mr-1.5" /> Add Product Listing
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Connected Vendors</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#f1f5f9] mt-1">24</h3>
                <p className="text-xxs font-medium text-emerald-600 dark:text-[hsl(160_84%_65%)] mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> +5 this week
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-[#1c2740] text-emerald-600 dark:text-[hsl(160_84%_65%)] flex items-center justify-center">
                <Building size={20} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Catalog SKUs</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#f1f5f9] mt-1">{products.length} SKUs</h3>
                <p className="text-xxs font-medium text-blue-600 dark:text-[hsl(217_91%_65%)] mt-1">Wholesale Active</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-[#1c2740] text-blue-600 dark:text-[hsl(217_91%_65%)] flex items-center justify-center">
                <PackageCheck size={20} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Order Revenue</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-[#f1f5f9] mt-1">₹3,80,000</h3>
                <p className="text-xxs font-medium text-emerald-600 dark:text-[hsl(160_84%_65%)] mt-1">B2B Volume</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-[#1c2740] text-emerald-600 dark:text-[hsl(160_84%_65%)] flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">Supplier Status</p>
                <h3 className="text-sm font-bold text-emerald-600 dark:text-[hsl(160_84%_65%)] mt-1">Active Seller</h3>
                <p className="text-xxs font-medium text-slate-400 dark:text-[#64748b] mt-0.5">Role: Supplier</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-[#1c2740] text-emerald-600 dark:text-[hsl(160_84%_65%)] flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Supplier Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Supplier Quick Actions</CardTitle>
                <CardDescription className="text-xs">Quick shortcuts for catalog & inventory distribution</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setIsAddProductOpen(true)}
                  className="flex items-center gap-2 rounded-lg text-xs font-semibold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <PlusCircle size={15} />
                  Add Product Listing
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCatalogOpen(true)}
                  className="flex items-center gap-2 rounded-lg text-xs font-semibold"
                >
                  <LayoutGrid size={15} />
                  Manage Wholesale Catalog ({products.length})
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/supplier/orders/incoming')}
                  className="flex items-center gap-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <Eye size={15} />
                  Incoming Retail Purchase Orders ({orders.length})
                </Button>
              </CardContent>
            </Card>

            {/* Incoming Retail Purchase Orders Queue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200/60 dark:border-[#1e293b]">
                <div>
                  <CardTitle className="text-base font-bold">Incoming Retail Purchase Orders</CardTitle>
                  <CardDescription className="text-xs">Accept, reject, or suggest changes for vendor orders</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/dashboard/supplier/orders/incoming')}
                    className="text-xxs font-semibold"
                  >
                    Open Dedicated Page →
                  </Button>
                  <Badge variant="primary" className="text-xxs">{orders.length} Total</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Items Requested</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((ord) => (
                      <TableRow key={ord.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-[#f1f5f9]">{ord.id}</TableCell>
                        <TableCell className="font-semibold text-slate-800 dark:text-[#e2e8f0] text-xs">{ord.vendorName}</TableCell>
                        <TableCell className="text-slate-600 dark:text-[#8896ab] text-xs max-w-[180px]">
                          <div>{ord.items}</div>
                          {ord.notes && <div className="text-xxs text-amber-500 italic mt-0.5">Note: "{ord.notes}"</div>}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-[#f1f5f9] text-xs">{ord.total}</TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right">
                          {ord.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleAcceptOrder(ord)}
                                title="Accept Purchase Order"
                                className="p-1.5 rounded-lg bg-emerald-100 dark:bg-[hsl(160_84%_15%_/0.4)] text-emerald-600 dark:text-[hsl(160_84%_65%)] hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setIsSuggestOpen(true);
                                }}
                                title="Suggest Changes / Counter-offer"
                                className="p-1.5 rounded-lg bg-blue-100 dark:bg-[hsl(217_91%_16%_/0.4)] text-blue-600 dark:text-[hsl(217_91%_70%)] hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                              >
                                <MessageSquare size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setIsRejectOpen(true);
                                }}
                                title="Reject Purchase Order"
                                className="p-1.5 rounded-lg bg-red-100 dark:bg-[hsl(0_72%_16%_/0.4)] text-red-600 dark:text-[hsl(0_72%_65%)] hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xxs text-slate-400 font-medium">Updated</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Wholesale Profile Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200/60 dark:border-[#1e293b]">
                <div>
                  <CardTitle className="text-lg font-bold">Wholesale Profile Overview</CardTitle>
                  <CardDescription className="text-xs">Your registered merchant & distribution profile</CardDescription>
                </div>
                <Building className="text-emerald-600 dark:text-[hsl(160_84%_65%)] h-6 w-6" />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Supplier / Company Name</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-[#f1f5f9] mt-1 block">
                      {company?.company_name || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider">Distribution Category</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-[#f1f5f9] mt-1 block">
                      {company?.business_type || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">GST Registration</span>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${company?.gst_number ? 'bg-emerald-100 text-emerald-800 dark:bg-[hsl(160_84%_15%_/0.4)] dark:text-[hsl(160_84%_65%)]' : 'bg-amber-100 text-amber-800 dark:bg-[hsl(38_92%_18%_/0.4)] dark:text-[hsl(38_92%_65%)]'}`}>
                      {company?.gst_number ? `Verified: ${company.gst_number}` : 'Pending / Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Distribution Base</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-[#e2e8f0] flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-500" />
                      {address ? `${address.city}, ${address.state}, ${address.country}` : 'Not set'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-8">
            {/* Stock Capacity Allocation */}
            <Card>
              <CardHeader className="border-b border-slate-200/60 dark:border-[#1e293b] pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Warehouse Capacity</span>
                  <Truck size={18} className="text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <Progress label="Grains & Staple Stock (85% Allocated)" value={85} variant="success" showLabel />
                <Progress label="Oils & Edibles (60% Allocated)" value={60} variant="info" showLabel />
                <Progress label="Packaged Goods (40% Allocated)" value={40} variant="primary" showLabel />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-slate-200/60 dark:border-[#1e293b] pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Supplier Inbox & Activity</span>
                  <Bell size={16} className="text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                {orders.slice(0, 3).map((ord) => (
                  <div key={ord.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#151d2e] border border-slate-200/50 dark:border-[#1e293b] flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-[#1c2740] text-emerald-600 dark:text-[hsl(160_84%_65%)] shrink-0">
                      <Clock size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-[#f1f5f9]">{ord.id} from {ord.vendorName}</p>
                      <p className="text-xxs text-slate-500 dark:text-[#8896ab] mt-0.5">{ord.items} • {ord.status}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add New Product Listing */}
      <Dialog
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add Product Listing to Wholesale Catalog"
        description="Publish inventory items for verified retail vendors to order"
        size="lg"
      >
        <form onSubmit={handleAddProductSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Product Name</label>
            <Input
              placeholder="e.g. Premium Sona Masoori Rice (25kg)"
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Product Category</label>
              <select
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#f1f5f9]"
              >
                <option value="Grains & Pulses">Grains & Pulses</option>
                <option value="Edible Oils">Edible Oils</option>
                <option value="Spices & Condiments">Spices & Condiments</option>
                <option value="Dairy & Refrigerated">Dairy & Refrigerated</option>
                <option value="Packaged Foods">Packaged Foods</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Wholesale Price (₹)</label>
              <Input
                placeholder="e.g. ₹850/bag"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Available Stock Qty</label>
              <Input
                placeholder="e.g. 500"
                type="number"
                value={newProdStock}
                onChange={(e) => setNewProdStock(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Packaging Unit</label>
              <select
                value={newProdUnit}
                onChange={(e) => setNewProdUnit(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#f1f5f9]"
              >
                <option value="Bags">Bags (25kg/50kg)</option>
                <option value="Cans">Cans (5L/15L)</option>
                <option value="Packs">Packs / Cartons</option>
                <option value="Boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1e293b]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Publish Product Listing
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL 2: Manage Wholesale Catalog */}
      <Dialog
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        title="Wholesale Product Catalog"
        description="View and manage live inventory product listings available to retail vendors"
        size="xl"
      >
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-64 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search catalog products..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-9 py-1.5 text-xs"
              />
            </div>
            <Button size="sm" onClick={() => { setIsCatalogOpen(false); setIsAddProductOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              + Add Product
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Wholesale Price</TableHead>
                <TableHead>Stock Quantity</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold text-xs text-slate-900 dark:text-[#f1f5f9] flex items-center gap-2">
                    <Package size={14} className="text-emerald-500" /> {p.name}
                  </TableCell>
                  <TableCell><Badge variant="primary" className="text-xxs">{p.category}</Badge></TableCell>
                  <TableCell className="font-bold text-xs text-emerald-600 dark:text-[hsl(160_84%_65%)]">{p.price}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-[#e2e8f0]">{p.stock} {p.unit}</TableCell>
                  <TableCell className="text-xs text-slate-500">{p.supplierName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCatalogOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 3: View Incoming Orders */}
      <Dialog
        isOpen={isIncomingOrdersOpen}
        onClose={() => setIsIncomingOrdersOpen(false)}
        title="Incoming Retail Purchase Orders Queue"
        description="Review, accept, reject, or suggest changes for incoming purchase orders"
        size="xl"
      >
        <div className="space-y-4 pt-1">
          <div className="w-full sm:w-64 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search incoming orders..."
              value={ordersSearch}
              onChange={(e) => setOrdersSearch(e.target.value)}
              className="pl-9 py-1.5 text-xs"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Items Requested</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((ord) => (
                <TableRow key={ord.id}>
                  <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-[#f1f5f9]">{ord.id}</TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-[#e2e8f0] text-xs">{ord.vendorName}</TableCell>
                  <TableCell className="text-slate-600 dark:text-[#8896ab] text-xs max-w-[180px]">
                    <div>{ord.items}</div>
                    {ord.notes && <div className="text-xxs text-amber-500 italic mt-0.5">Note: "{ord.notes}"</div>}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-[#f1f5f9] text-xs">{ord.total}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right">
                    {ord.status === 'Pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAcceptOrder(ord)}
                          title="Accept Purchase Order"
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-xxs font-semibold hover:bg-emerald-700 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setIsSuggestOpen(true);
                          }}
                          title="Suggest Changes"
                          className="px-2 py-1 rounded bg-blue-600 text-white text-xxs font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          Suggest
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setIsRejectOpen(true);
                          }}
                          title="Reject"
                          className="px-2 py-1 rounded bg-red-600 text-white text-xxs font-semibold hover:bg-red-700 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xxs text-slate-400 font-medium">Updated</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsIncomingOrdersOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 4: Reject Order Confirmation */}
      <Dialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title={`Reject Purchase Order ${selectedOrder?.id || ''}`}
        description="Specify rejection reason to notify vendor"
        size="md"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Rejection Reason</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Stock temporarily out of stock. Expected replenishment on August 10th."
              className="w-full rounded-md border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-2.5 text-xs text-slate-900 dark:text-[#f1f5f9]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e293b]">
            <Button variant="outline" size="sm" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmReject} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 5: Suggest Changes / Counter Offer */}
      <Dialog
        isOpen={isSuggestOpen}
        onClose={() => setIsSuggestOpen(false)}
        title={`Suggest Order Changes for ${selectedOrder?.id || ''}`}
        description="Propose adjusted quantity, price, or delivery schedule"
        size="md"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Original Requested Items</label>
            <p className="text-xs font-semibold text-slate-900 dark:text-[#f1f5f9] p-2.5 rounded-lg bg-slate-100 dark:bg-[#151d2e]">
              {selectedOrder?.items} (Total: {selectedOrder?.total})
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Adjusted Order Total (Optional)</label>
            <Input
              placeholder="e.g. ₹32,000 (Adjusted for available 35 bags)"
              value={suggestedTotal}
              onChange={(e) => setSuggestedTotal(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#8896ab] mb-1">Counter-Offer Details & Notes</label>
            <textarea
              rows={3}
              value={suggestedNotes}
              onChange={(e) => setSuggestedNotes(e.target.value)}
              placeholder="e.g. We can dispatch 35 bags immediately tomorrow, and remaining 15 bags next Monday."
              className="w-full rounded-md border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-2.5 text-xs text-slate-900 dark:text-[#f1f5f9]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#1e293b]">
            <Button variant="outline" size="sm" onClick={() => setIsSuggestOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmSuggestChanges} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Send Counter-Offer
            </Button>
          </div>
        </div>
      </Dialog>
    </PageWrapper>
  );
};
