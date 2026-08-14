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
  getSuppliers: async (filters: SupplierFilters = {}): Promise<SupplierSummary[]> => {
    try {
      const response = await api.get('/api/v1/suppliers', { params: filters });
      return response.data.data.suppliers;
    } catch (error) {
      console.warn('Backend API offline or error, using local fallback suppliers list');
      // Local fallback suppliers list if backend API server is offline
      const localUsers = JSON.parse(localStorage.getItem('flowza_local_users') || '[]');
      const registeredSuppliers = localUsers
        .filter((u: any) => u.role_name === 'supplier')
        .map((u: any) => ({
          id: u.id,
          full_name: u.full_name,
          company_name: u.company_name || u.full_name,
          business_type: u.business_type || 'Wholesale Distributor',
          description: u.description || 'Verified registered wholesale supplier on Flowza network.',
          city: u.city || 'Bengaluru',
          state: u.state || 'Karnataka',
          country: u.country || 'India',
          rating: 4.9,
          total_orders: 0,
          joined_date: '2026-08-01',
        }));

      const defaultSuppliers: SupplierSummary[] = [
        { id: 'sup-1', full_name: 'GreenEarth Organics', company_name: 'GreenEarth Organics', business_type: 'Grains & Pulses', description: 'Certified organic basmati rice and pulse wholesaler.', city: 'Bengaluru', state: 'Karnataka', country: 'India', rating: 4.9, total_orders: 142 },
        { id: 'sup-2', full_name: 'SunPure Distributors', company_name: 'SunPure Distributors', business_type: 'Edible Oils & Fats', description: 'Cold-pressed sunflower, mustard, and groundnut oil distribution.', city: 'Mumbai', state: 'Maharashtra', country: 'India', rating: 4.8, total_orders: 98 },
        { id: 'sup-3', full_name: 'Metro Agro Wholesalers', company_name: 'Metro Agro Wholesalers', business_type: 'Spices & Condiments', description: 'Direct spice plantation processing & packaging.', city: 'Chennai', state: 'Tamil Nadu', country: 'India', rating: 4.7, total_orders: 210 },
        { id: 'sup-4', full_name: 'Apex Dairy & Poultry', company_name: 'Apex Dairy & Poultry', business_type: 'Dairy & Refrigerated', description: 'Bulk ghee, butter, and fresh dairy supply.', city: 'Pune', state: 'Maharashtra', country: 'India', rating: 4.9, total_orders: 85 },
      ];

      return [...registeredSuppliers, ...defaultSuppliers];
    }
  },

  getSupplierDetails: async (id: string) => {
    try {
      const response = await api.get(`/api/v1/suppliers/${id}`);
      return response.data.data;
    } catch (error) {
      return null;
    }
  },
};
