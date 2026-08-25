import api from './api';
import {
  DateRangePreset,
  SupplierOverviewResponse,
  VendorOverviewResponse,
  AdminOverviewResponse,
} from '../types';

export interface DateFilterQuery {
  preset?: DateRangePreset;
  start_date?: string;
  end_date?: string;
}

export const analyticsService = {
  // Supplier overview
  getSupplierOverview: async (params?: DateFilterQuery): Promise<SupplierOverviewResponse> => {
    const res = await api.get('/analytics/supplier/overview', { params });
    return res.data.data;
  },

  // Vendor overview
  getVendorOverview: async (params?: DateFilterQuery): Promise<VendorOverviewResponse> => {
    const res = await api.get('/analytics/vendor/overview', { params });
    return res.data.data;
  },

  // Admin overview
  getAdminOverview: async (params?: DateFilterQuery): Promise<AdminOverviewResponse> => {
    const res = await api.get('/analytics/admin/overview', { params });
    return res.data.data;
  },
};
