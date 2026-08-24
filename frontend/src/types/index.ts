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
export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled' | 'changes_suggested';

export interface OrderItem {
  id?: string;
  index?: number;
  product_name: string;
  quantity: number;
  unit: string;
  estimated_price?: number;
  subtotal?: number;
  notes?: string;
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
  in_progress_orders: number;
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
