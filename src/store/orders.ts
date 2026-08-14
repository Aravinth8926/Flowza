import { create } from 'zustand';

export interface PurchaseOrder {
  id: string;
  raw_id?: string;
  vendorName: string;
  supplierName: string;
  items: string;
  total: string;
  date: string;
  status: 'Pending' | 'Accepted' | 'Processing' | 'Dispatched' | 'Delivered' | 'Rejected' | 'Changes Suggested';
  urgency?: string;
  notes?: string;
  supplierNotes?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  unit: string;
  supplierName: string;
}

interface OrdersState {
  orders: PurchaseOrder[];
  products: CatalogItem[];
  createOrder: (order: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => PurchaseOrder;
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  suggestChanges: (orderId: string, suggestedNotes: string, newTotal?: string) => void;
  addProduct: (product: Omit<CatalogItem, 'id'>) => void;
}

const INITIAL_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-2026-089',
    vendorName: 'Apex Retail Outlets',
    supplierName: 'GreenEarth Organics',
    items: '50x Organic Basmati Rice (25kg Bag)',
    total: '₹45,000',
    date: '2026-07-30',
    status: 'Pending',
    urgency: 'Normal Delivery (3-5 days)',
    notes: 'Please ensure Moisture < 12% certification tag is attached.',
  },
  {
    id: 'PO-2026-084',
    vendorName: 'City Supermart',
    supplierName: 'SunPure Distributors',
    items: '20x Cold-pressed Sunflower Oil (5L)',
    total: '₹18,500',
    date: '2026-07-28',
    status: 'Processing',
    urgency: 'Priority Delivery (1-2 days)',
  },
  {
    id: 'PO-2026-078',
    vendorName: 'Metro General Store',
    supplierName: 'Metro Agro Wholesalers',
    items: '100x Spices Premium Mix (500g)',
    total: '₹12,000',
    date: '2026-07-25',
    status: 'Dispatched',
  },
];

const INITIAL_PRODUCTS: CatalogItem[] = [
  { id: 'prod-1', name: 'Organic Basmati Rice (25kg Bag)', category: 'Grains & Pulses', price: '₹900/bag', stock: 450, unit: 'Bags', supplierName: 'GreenEarth Organics' },
  { id: 'prod-2', name: 'Cold-pressed Sunflower Oil (5L Can)', category: 'Edible Oils', price: '₹925/can', stock: 180, unit: 'Cans', supplierName: 'SunPure Distributors' },
  { id: 'prod-3', name: 'Premium Garam Masala (500g Pack)', category: 'Spices & Condiments', price: '₹120/pack', stock: 800, unit: 'Packs', supplierName: 'Metro Agro Wholesalers' },
  { id: 'prod-4', name: 'Pure Cow Ghee (1L Jar)', category: 'Dairy & Refrigerated', price: '₹650/jar', stock: 240, unit: 'Jars', supplierName: 'Apex Dairy & Poultry' },
];

const STORAGE_KEY_ORDERS = 'flowza_po_orders_v1';
const STORAGE_KEY_PRODUCTS = 'flowza_po_products_v1';

const loadOrders = (): PurchaseOrder[] => {
  const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return INITIAL_ORDERS;
};

const loadProducts = (): CatalogItem[] => {
  const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return INITIAL_PRODUCTS;
};

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: loadOrders(),
  products: loadProducts(),

  createOrder: (orderData) => {
    const newOrder: PurchaseOrder = {
      id: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      ...orderData,
    };

    const updated = [newOrder, ...get().orders];
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updated));
    set({ orders: updated });
    return newOrder;
  },

  acceptOrder: (orderId) => {
    const updated = get().orders.map((o) =>
      o.id === orderId ? { ...o, status: 'Accepted' as const, supplierNotes: 'Order accepted by supplier and queued for dispatch.' } : o
    );
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updated));
    set({ orders: updated });
  },

  rejectOrder: (orderId, reason) => {
    const updated = get().orders.map((o) =>
      o.id === orderId ? { ...o, status: 'Rejected' as const, supplierNotes: reason } : o
    );
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updated));
    set({ orders: updated });
  },

  suggestChanges: (orderId, suggestedNotes, newTotal) => {
    const updated = get().orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'Changes Suggested' as const,
            supplierNotes: suggestedNotes,
            total: newTotal || o.total,
          }
        : o
    );
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updated));
    set({ orders: updated });
  },

  addProduct: (productData) => {
    const newProduct: CatalogItem = {
      id: `prod-${Date.now()}`,
      ...productData,
    };
    const updated = [newProduct, ...get().products];
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
    set({ products: updated });
  },
}));
