import api from './api';

export interface SupplierSummary {
  id: string;
  full_name: string;
  company_name: string;
  business_type: string;
  description: string;
  logo_url?: string;
  city: string;
  state: string;
  country: string;
  rating?: number;
  total_orders: number;
  joined_date?: string;
}

export interface SupplierFilters {
  search?: string;
  city?: string;
  state?: string;
  business_type?: string;
  page?: number;
  limit?: number;
}

export const supplierService = {
  /**
   * Fetches verified suppliers from the real database.
   * No mock fallback — throws so the UI can show a proper error state.
   */
  getSuppliers: async (filters: SupplierFilters = {}): Promise<SupplierSummary[]> => {
    const response = await api.get('/api/v1/suppliers', { params: filters });
    return response.data.data.suppliers;
  },

  getSupplierDetails: async (id: string) => {
    const response = await api.get(`/api/v1/suppliers/${id}`);
    return response.data.data;
  },
};
