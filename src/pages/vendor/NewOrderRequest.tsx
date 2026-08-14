import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { supplierService, SupplierSummary } from '../../services/supplierService';
import { orderService } from '../../services/orderService';
import { useUserStore } from '../../store/user';
import { useAuthStore } from '../../store/auth';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Search,
  Building,
  MapPin,
  CheckCircle2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Tag,
  Receipt,
  FileText,
} from 'lucide-react';

interface OrderItemRow {
  id: string;
  product_name: string;
  quantity: number | string;
  unit: string;
  estimated_price: number | string;
}

export const NewOrderRequest: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { company, address, fetchCompany, fetchAddress } = useUserStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Supplier Selection
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');

  // Step 2: Order Details
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDescription, setOrderDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Step 3: Add Items
  const [items, setItems] = useState<OrderItemRow[]>([
    { id: '1', product_name: 'Tomatoes', quantity: 50, unit: 'kg', estimated_price: 40 },
    { id: '2', product_name: 'Onions', quantity: 30, unit: 'kg', estimated_price: 35 },
    { id: '3', product_name: 'Potatoes', quantity: 25, unit: 'kg', estimated_price: 30 },
  ]);

  // Fetch company and address on load
  useEffect(() => {
    fetchCompany().catch(() => {});
    fetchAddress().catch(() => {});
  }, [fetchCompany, fetchAddress]);

  // Pre-fill delivery address when address loads
  useEffect(() => {
    if (address && !deliveryAddress) {
      setDeliveryAddress(`${address.address_line}, ${address.city}, ${address.state} - 641001`);
    } else if (!deliveryAddress) {
      setDeliveryAddress('45, MG Road, Coimbatore, Tamil Nadu - 641001');
    }
  }, [address, deliveryAddress]);

  // Fetch Suppliers Query with TanStack Query
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getSuppliers(),
  });

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((sup) => {
    const term = supplierSearch.toLowerCase();
    return (
      sup.company_name.toLowerCase().includes(term) ||
      sup.city.toLowerCase().includes(term) ||
      sup.business_type.toLowerCase().includes(term) ||
      sup.description.toLowerCase().includes(term)
    );
  });

  // Auto-select first supplier if none selected
  useEffect(() => {
    if (!selectedSupplier && suppliers.length > 0) {
      setSelectedSupplier(suppliers[0]);
    }
  }, [suppliers, selectedSupplier]);

  // Calculate totals
  const totalItemsCount = items.filter((i) => i.product_name.trim() !== '').length;
  const totalEstimatedAmount = items.reduce((acc, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.estimated_price) || 0;
    return acc + q * p;
  }, 0);

  // Item row operations
  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        product_name: '',
        quantity: 10,
        unit: 'kg',
        estimated_price: '',
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof OrderItemRow, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Order must contain at least one item');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplier) throw new Error('Please select a supplier');
      if (!orderTitle.trim()) throw new Error('Please enter order title');
      if (items.length === 0 || !items[0].product_name) throw new Error('At least one item is required');

      const payload = {
        supplier_id: selectedSupplier.id,
        title: orderTitle,
        description: orderDescription,
        priority,
        delivery_date: deliveryDate,
        delivery_address: deliveryAddress,
        items: items
          .filter((i) => i.product_name.trim() !== '')
          .map((i) => ({
            product_name: i.product_name.trim(),
            quantity: Number(i.quantity) || 1,
            unit: i.unit || 'kg',
            estimated_price: Number(i.estimated_price) || 0,
          })),
      };

      return await orderService.createOrder(payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success(`Purchase order sent to ${selectedSupplier?.company_name}!`, {
        description: `Order value: ₹${totalEstimatedAmount.toLocaleString('en-IN')}`,
      });
      navigate('/dashboard/vendor/orders');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit purchase order request');
    },
  });

  // Step validation
  const handleNextFromStep1 = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier to proceed');
      return;
    }
    if (!orderTitle) {
      setOrderTitle(`Weekly Supply — ${new Date().toLocaleString('en-US', { month: 'long' })} Week ${Math.ceil(new Date().getDate() / 7)}`);
    }
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!orderTitle.trim()) {
      toast.error('Please enter an order title');
      return;
    }
    if (!deliveryDate) {
      toast.error('Please select a delivery date');
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }
    setCurrentStep(3);
  };

  const handleNextFromStep3 = () => {
    const validItems = items.filter((i) => i.product_name.trim() !== '' && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one product with name and quantity');
      return;
    }
    setCurrentStep(4);
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Back Link & Header */}
        <div>
          <Link
            to="/dashboard/vendor"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                New Purchase Order Request
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Send an itemized purchase request to your verified supplier network
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xxs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
              <Sparkles size={12} /> Real-Time Supplier Dispatch
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="bg-white dark:bg-[#0c111d] rounded-xl border border-slate-200 dark:border-[#1e293b] p-3 sm:p-4 shadow-xs">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Select Supplier' },
              { num: 2, label: 'Order Details' },
              { num: 3, label: 'Order Items' },
              { num: 4, label: 'Review & Send' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  className={`flex flex-col sm:flex-row items-center gap-2 p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/80 dark:border-blue-800/50'
                      : isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-400 dark:text-slate-600 font-medium'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-[#151d2e] text-slate-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={14} /> : step.num}
                  </div>
                  <span className="text-xxs sm:text-xs truncate text-center sm:text-left">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: Select Supplier */}
        {currentStep === 1 && (
          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardHeader className="border-b border-slate-100 dark:border-[#1e293b] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">Select Supplier</CardTitle>
                  <CardDescription className="text-xs">
                    Choose the verified supplier you want to send this purchase order to
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search by name, city, category..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-3">
              {isLoadingSuppliers ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading verified suppliers...</div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No suppliers found matching "{supplierSearch}".
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSuppliers.map((sup) => {
                    const isSelected = selectedSupplier?.id === sup.id;
                    return (
                      <div
                        key={sup.id}
                        onClick={() => setSelectedSupplier(sup)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0c111d]'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-[#151d2e] text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {sup.company_name?.slice(0, 2).toUpperCase() || 'SP'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {sup.company_name}
                              </h3>
                              <Badge variant="primary" className="text-xxs font-semibold">
                                {sup.business_type}
                              </Badge>
                              <span className="text-xxs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                <MapPin size={11} className="text-slate-400" /> {sup.city}, {sup.state}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-[#8896ab] mt-1 line-clamp-2">
                              "{sup.description}"
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end shrink-0">
                          {isSelected ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs">
                              <CheckCircle2 size={14} /> Selected
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSupplier(sup);
                              }}
                              className="text-xs font-semibold"
                            >
                              Select <ChevronRight size={14} className="ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-[#1e293b] mt-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/vendor')} className="text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={handleNextFromStep1}
                  disabled={!selectedSupplier}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Continue to Order Details <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Order Details */}
        {currentStep === 2 && (
          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardHeader className="border-b border-slate-100 dark:border-[#1e293b] pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Order Details & Specifications</CardTitle>
                  <CardDescription className="text-xs">
                    Define delivery timeframe, delivery location, and urgency priority
                  </CardDescription>
                </div>
                {selectedSupplier && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-[#151d2e] border border-slate-200/60 dark:border-[#1e293b]">
                    <div className="h-6 w-6 rounded bg-blue-600/10 text-blue-600 font-bold text-xxs flex items-center justify-center">
                      {selectedSupplier.company_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-right">
                      <p className="text-xxs font-bold text-slate-800 dark:text-white truncate max-w-[130px]">
                        {selectedSupplier.company_name}
                      </p>
                      <p className="text-xxs text-slate-400">{selectedSupplier.city}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xxs font-bold text-blue-600 hover:underline cursor-pointer ml-1"
                    >
                      [Change]
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              {/* Order Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                  Order Title / Reference <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Weekly Vegetable Supply — August Week 2"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="text-xs font-semibold"
                />
                <p className="text-xxs text-slate-400 mt-1">A short descriptive headline for the supplier to identify this batch.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                  Procurement Notes / Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={orderDescription}
                  onChange={(e) => setOrderDescription(e.target.value)}
                  placeholder="e.g. Need fresh vegetables for our supermarket branch in Coimbatore. Prefer hybrid varieties for tomatoes."
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-3 text-xs text-slate-900 dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Priority & Delivery Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1.5">
                    Order Priority <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'low', label: 'Low', color: 'border-slate-300 text-slate-700 dark:text-slate-300' },
                      { id: 'medium', label: 'Medium', color: 'border-blue-300 text-blue-700 dark:text-blue-400' },
                      { id: 'high', label: 'High', color: 'border-orange-300 text-orange-700 dark:text-orange-400' },
                      { id: 'urgent', label: 'Urgent', color: 'border-red-300 text-red-700 dark:text-red-400' },
                    ].map((p) => {
                      const isSelected = priority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id as any)}
                          className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-[#151d2e] hover:bg-slate-100 border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              p.id === 'urgent'
                                ? 'bg-red-400'
                                : p.id === 'high'
                                ? 'bg-orange-400'
                                : p.id === 'medium'
                                ? 'bg-blue-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1.5">
                    Expected Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                  Delivery Destination Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. 45, MG Road, Coimbatore, Tamil Nadu - 641001"
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-2.5 text-xs text-slate-900 dark:text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-[#1e293b] mt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)} className="text-xs">
                  ← Back to Supplier
                </Button>
                <Button
                  onClick={handleNextFromStep2}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Continue to Add Items <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Add Items */}
        {currentStep === 3 && (
          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardHeader className="border-b border-slate-100 dark:border-[#1e293b] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold">Order Items & Quantities</CardTitle>
                  <CardDescription className="text-xs">
                    List the exact items, quantities, packaging units, and estimated unit rates
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {totalItemsCount} Products • Est. Total: <span className="text-blue-600 dark:text-blue-400 font-extrabold">₹{totalEstimatedAmount.toLocaleString('en-IN')}</span>
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {/* Items Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1e293b]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#151d2e] border-b border-slate-200 dark:border-[#1e293b]">
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 w-10">#</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 min-w-[200px]">Product Name *</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 w-24">Qty *</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 w-28">Unit *</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 w-32">Est. Price (₹)</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 w-28 text-right">Subtotal</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e293b]">
                    {items.map((item, idx) => {
                      const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.estimated_price) || 0);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#151d2e]/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                          <td className="p-3">
                            <Input
                              placeholder="e.g. Tomatoes"
                              value={item.product_name}
                              onChange={(e) => handleUpdateItem(item.id, 'product_name', e.target.value)}
                              className="text-xs h-8 font-semibold"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                              className="text-xs h-8 font-semibold"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={item.unit}
                              onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                              className="w-full rounded-md border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
                            >
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="liters">liters</option>
                              <option value="units">units</option>
                              <option value="boxes">boxes</option>
                              <option value="bags">bags</option>
                              <option value="cans">cans</option>
                              <option value="packs">packs</option>
                              <option value="cartons">cartons</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="40.00"
                              value={item.estimated_price}
                              onChange={(e) => handleUpdateItem(item.id, 'estimated_price', e.target.value)}
                              className="text-xs h-8 font-semibold"
                            />
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-[#f1f5f9]">
                            ₹{lineSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              title="Delete Item"
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add row button */}
              <button
                type="button"
                onClick={handleAddItemRow}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-[#1e293b] hover:border-blue-400 dark:hover:border-blue-500 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-slate-50/50 dark:bg-[#151d2e]/30"
              >
                <Plus size={14} /> Add Another Item
              </button>

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#151d2e] border border-slate-200/60 dark:border-[#1e293b] flex items-center justify-between">
                <div>
                  <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Total Line Items</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{totalItemsCount} Products</p>
                </div>
                <div className="text-right">
                  <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Estimated Total Value</p>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    ₹{totalEstimatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#1e293b]">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)} className="text-xs">
                  ← Back to Details
                </Button>
                <Button
                  onClick={handleNextFromStep3}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Review Order Request <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Review & Submit */}
        {currentStep === 4 && (
          <Card className="border-slate-200 dark:border-[#1e293b]">
            <CardHeader className="border-b border-slate-100 dark:border-[#1e293b] pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Review Your Order Request</CardTitle>
                  <CardDescription className="text-xs">
                    Please verify all specifications before sending to the supplier
                  </CardDescription>
                </div>
                <Badge variant="warning" className="text-xxs font-semibold">
                  Awaiting Dispatch
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Parties Header Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TO (Supplier) */}
                <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                    TO (Supplier)
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{selectedSupplier?.company_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedSupplier?.business_type} • 📍 {selectedSupplier?.city}, {selectedSupplier?.state}
                  </p>
                  <p className="text-xxs text-slate-400 mt-1 italic line-clamp-1">"{selectedSupplier?.description}"</p>
                </div>

                {/* FROM (Vendor) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50/50 dark:bg-[#151d2e]/50">
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                    FROM (You - Vendor)
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {company?.company_name || user?.full_name || 'My Supermarket'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Vendor • 📍 {address?.city || 'Coimbatore'}, {address?.state || 'Tamil Nadu'}
                  </p>
                  <p className="text-xxs text-slate-400 mt-1 truncate">
                    {user?.email} • {user?.phone || '+91 9443322110'}
                  </p>
                </div>
              </div>

              {/* Specifications Overview */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Order Title</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{orderTitle}</span>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                    <Badge
                      variant={
                        priority === 'urgent'
                          ? 'destructive'
                          : priority === 'high'
                          ? 'accent'
                          : priority === 'medium'
                          ? 'primary'
                          : 'secondary'
                      }
                      className="text-xxs mt-0.5 uppercase"
                    >
                      ● {priority}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Expected Delivery</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                      <Calendar size={13} className="text-blue-500" />
                      {new Date(deliveryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#1e293b]">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Delivery Destination</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5 block flex items-start gap-1">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    {deliveryAddress}
                  </span>
                </div>

                {orderDescription && (
                  <div className="pt-2 border-t border-slate-100 dark:border-[#1e293b]">
                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Procurement Instructions</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 italic">"{orderDescription}"</p>
                  </div>
                )}
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-xl border border-slate-200 dark:border-[#1e293b] overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-[#151d2e] border-b border-slate-200 dark:border-[#1e293b] font-bold text-xs text-slate-800 dark:text-white">
                  Requested Items ({items.length})
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#1e293b] text-xxs font-bold text-slate-400 uppercase">
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-right">Est. Unit Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e293b]">
                    {items.map((item, idx) => {
                      const subtotal = (Number(item.quantity) || 0) * (Number(item.estimated_price) || 0);
                      return (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{item.product_name}</td>
                          <td className="p-3 text-center font-mono text-slate-700 dark:text-slate-300">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            ₹{Number(item.estimated_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50/70 dark:bg-[#151d2e]/60 font-bold border-t border-slate-200 dark:border-[#1e293b]">
                      <td colSpan={3} className="p-3 text-right text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Total Estimated Value
                      </td>
                      <td className="p-3 text-right text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                        ₹{totalEstimatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-[#1e293b]">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(3)} className="text-xs">
                  ← Edit Items
                </Button>
                <Button
                  onClick={() => createOrderMutation.mutate()}
                  disabled={createOrderMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md px-5 h-10 cursor-pointer"
                >
                  {createOrderMutation.isPending ? (
                    'Transmitting Order...'
                  ) : (
                    <>
                      <Send size={14} className="mr-1.5" /> Send Request 🚀
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
};
