export type UserRole = 'vendor' | 'supplier' | 'admin';

export interface LoginRequest {
  email: string;
  password?: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  role_name: 'vendor' | 'supplier';
  company_name: string;
  business_type: string;
  gst_number?: string;
  description?: string;
  country: string;
  state: string;
  city: string;
  address_line: string;
  address_type?: string;
}

export interface Role {
  id: string;
  name: UserRole;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role_id: string;
  role?: Role;
  profile_picture_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  business_type: string;
  gst_number?: string;
  description?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  company_id: string;
  country: string;
  state: string;
  city: string;
  address_line: string;
  address_type: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: User;
    company?: Company | null;
    address?: Address | null;
  };
}

export interface TokenResponse {
  success: boolean;
  message?: string;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
  };
}

export interface UserResponse {
  success: boolean;
  message?: string;
  data: User;
}

export interface CompanyResponse {
  success: boolean;
  message?: string;
  data: Company;
}

export interface AddressResponse {
  success: boolean;
  message?: string;
  data: Address;
}

export interface GenericResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
  };
}

// Purchase Orders & Real-Time Types
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'in_progress'
  | 'changes_suggested';

export interface OrderItem {
  id?: string;
  index?: number;
  product_id?: string | null;
  product_name: string;
  product_name_snapshot?: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  estimated_price?: number;
  subtotal?: number;
  notes?: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  from_status?: string | null;
  to_status: string;
  changed_by: string;
  changed_by_role: string;
  note?: string | null;
  timestamp: string;
}

export interface OrderParty {
  id: string;
  company_name: string;
  business_type?: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  address_line: string;
  gst_number?: string | null;
  logo_url?: string | null;
}

export interface PurchaseOrder {
  id: string;
  raw_id: string;
  title: string;
  description?: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  quantity: number;
  unit?: string;
  estimated_value: number;
  formatted_total: string;
  delivery_date?: string | null;
  delivery_address?: string | null;
  item_count: number;
  item_preview: string;
  items: OrderItem[];
  timeline?: OrderStatusHistoryEntry[];
  supplier_response?: string | null;
  responded_at?: string | null;
  created_at: string;
  vendor: OrderParty;
  supplier: OrderParty;
  isNew?: boolean;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  new_requests: number;
  accepted_orders: number;
  processing_orders?: number;
  in_progress_orders?: number;
  packed_orders?: number;
  shipped_orders?: number;
  delivered_orders?: number;
  completed_orders: number;
  rejected_orders: number;
  cancelled_orders: number;
}

export interface CreateOrderPayload {
  supplier_id: string;
  title: string;
  description?: string;
  items: {
    product_name: string;
    quantity: number;
    unit?: string;
    estimated_price?: number;
    notes?: string;
  }[];
  delivery_date?: string;
  delivery_address?: string;
  priority?: string;
}

// Invoices & Financial Records Types
export type InvoiceStatus = 'generated' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface InvoiceItem {
  id: string;
  order_request_item_id?: string | null;
  product_id?: string | null;
  product_name_snapshot: string;
  sku_snapshot?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  line_subtotal: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  recorded_by_user_id: string;
  recorded_by_name?: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  order_request_id: string;
  invoice_number: string;
  vendor_company_id: string;
  supplier_company_id: string;
  created_by_user_id?: string;
  vendor_company_name: string;
  supplier_company_name: string;
  supplier_gst_number?: string | null;
  supplier_address?: string | null;
  vendor_gst_number?: string | null;
  vendor_address?: string | null;
  invoice_date: string;
  due_date: string;
  currency: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  notes?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  item_count?: number;
  items?: InvoiceItem[];
  payments?: PaymentRecord[];
  created_at: string;
  updated_at?: string;
}

export interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  unpaid_count: number;
  partially_paid_count: number;
  paid_count: number;
  overdue_count: number;
}

export interface InvoiceGeneratePayload {
  due_date?: string;
  default_tax_rate?: number;
  discount_amount?: number;
  notes?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  payment_date?: string;
  method?: string;
  reference?: string;
  notes?: string;
}

// Product Catalog Types
export interface Product {
  id: string;
  company_id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  price: number;
  unit: string;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: Company | null;
}

export interface ProductCreatePayload {
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  price: number;
  unit: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductUpdatePayload {
  name?: string;
  sku?: string;
  description?: string;
  category?: string;
  price?: number;
  unit?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductListResponse {
  items: Product[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

// ── Inventory Types ──────────────────────────────────────────────────────────

export interface InventoryRecord {
  id: string;
  product_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  stock_status: 'healthy' | 'low_stock' | 'out_of_stock';
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    category?: string | null;
    unit: string;
    price: number;
    is_active: boolean;
  } | null;
}

export interface InventoryListResponse {
  items: InventoryRecord[];
  total: number;
}

export interface InventoryUpdatePayload {
  quantity_on_hand?: number;
  reorder_level?: number;
  reorder_quantity?: number;
}

export interface InventoryAdjustPayload {
  adjustment: number;
  reason?: string;
}

// ── Cart Types ───────────────────────────────────────────────────────────────

export interface CartProduct {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  price: number;
  is_active: boolean;
  image_url?: string | null;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  price_changed: boolean;
  current_price?: number | null;
  product?: CartProduct | null;
}

export interface CartSupplierInfo {
  id: string;
  company_name: string;
}

export interface Cart {
  id: string;
  vendor_id: string;
  vendor_company_id: string;
  supplier_company_id: string;
  supplier?: CartSupplierInfo | null;
  items: CartItem[];
  item_count: number;
  subtotal: number;
  has_price_changes: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartListResponse {
  carts: Cart[];
  total: number;
}

export interface CheckoutItemResult {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export interface CheckoutResult {
  order_id: string;
  order_number: string;
  supplier_company: string;
  status: string;
  total: number;
  item_count: number;
  items: CheckoutItemResult[];
  message: string;
}

export interface CheckoutPayload {
  delivery_date?: string;
  delivery_address?: string;
  notes?: string;
}

export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_PROCESSING'
  | 'ORDER_PACKED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_COMPLETED'
  | 'ORDER_REJECTED'
  | 'ORDER_CANCELLED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_COMPLETED'
  | 'INVENTORY_LOW_STOCK'
  | 'INVENTORY_OUT_OF_STOCK'
  | 'SYSTEM_NOTIFICATION';

export interface NotificationItem {
  id: string;
  recipient_user_id: string;
  recipient_company_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: 'ORDER' | 'INVOICE' | 'INVENTORY' | 'SYSTEM' | null;
  entity_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  extra_metadata?: Record<string, any>;
  created_at: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  pagination: NotificationPagination;
}

export interface NotificationPreferences {
  user_id: string;
  order_notifications_enabled: boolean;
  invoice_notifications_enabled: boolean;
  payment_notifications_enabled: boolean;
  inventory_notifications_enabled: boolean;
  system_notifications_enabled: boolean;
}

