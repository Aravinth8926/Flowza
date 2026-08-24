import api from './api';
import { CompanyResponse, AddressResponse, Company, Address } from '../types';

export const companyService = {
  async getCompany(): Promise<CompanyResponse> {
    const res = await api.get<CompanyResponse>('/api/v1/companies/me');
    return res.data;
  },

  async updateCompany(data: Partial<Company>): Promise<CompanyResponse> {
    const res = await api.patch<CompanyResponse>('/api/v1/companies/me', data);
    return res.data;
  },

  async uploadLogo(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ success: boolean; data: { url: string } }>('/api/v1/companies/me/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async getAddress(): Promise<AddressResponse> {
    const res = await api.get<AddressResponse>('/api/v1/companies/me/address');
    return res.data;
  },

  async updateAddress(data: Partial<Address>): Promise<AddressResponse> {
    const res = await api.patch<AddressResponse>('/api/v1/companies/me/address', data);
    return res.data;
  },
};
