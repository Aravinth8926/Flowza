import api from './api';
import {
  Invoice,
  InvoiceStats,
  InvoiceGeneratePayload,
  RecordPaymentPayload,
} from '../types';

export interface InvoiceQueryFilters {
  payment_status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const invoiceService = {
  generateInvoice: async (orderId: string, payload: InvoiceGeneratePayload = {}): Promise<Invoice> => {
    const response = await api.post(`/api/v1/invoices/orders/${orderId}`, payload);
    return response.data.data;
  },

  getInvoices: async (
    filters: InvoiceQueryFilters = {}
  ): Promise<{ invoices: Invoice[]; total: number; page: number; limit: number }> => {
    const response = await api.get('/api/v1/invoices', { params: filters });
    return response.data.data;
  },

  getInvoiceById: async (invoiceId: string): Promise<Invoice> => {
    const response = await api.get(`/api/v1/invoices/${invoiceId}`);
    return response.data.data;
  },

  getInvoiceByOrderId: async (orderId: string): Promise<Invoice | null> => {
    try {
      const response = await api.get(`/api/v1/invoices/order/${orderId}`);
      return response.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  getInvoiceStats: async (): Promise<InvoiceStats> => {
    const response = await api.get('/api/v1/invoices/stats');
    return response.data.data;
  },

  updatePaymentStatus: async (invoiceId: string, paymentStatus: string): Promise<Invoice> => {
    const response = await api.patch(`/api/v1/invoices/${invoiceId}/payment-status`, {
      payment_status: paymentStatus,
    });
    return response.data.data;
  },

  recordPayment: async (invoiceId: string, payload: RecordPaymentPayload): Promise<Invoice> => {
    const response = await api.post(`/api/v1/invoices/${invoiceId}/payments`, payload);
    return response.data.data;
  },

  downloadInvoicePdf: async (invoiceId: string, invoiceNumber: string): Promise<void> => {
    const response = await api.get(`/api/v1/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
