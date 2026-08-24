import api from './api';
import { PurchaseOrder, OrderStats, CreateOrderPayload, OrderStatus } from '../types';

export interface OrderQueryFilters {
  status?: string;
  search?: string;
  sort_by?: 'newest' | 'oldest' | 'priority' | 'value';
  page?: number;
  limit?: number;
}

export const orderService = {
  createOrder: async (payload: CreateOrderPayload) => {
    const response = await api.post('/api/v1/orders', payload);
    return response.data;
  },

  getIncomingOrders: async (filters: OrderQueryFilters = {}): Promise<{ orders: PurchaseOrder[]; pagination: any }> => {
    const response = await api.get('/api/v1/orders/incoming', { params: filters });
    return response.data.data;
  },

  getMyOrders: async (filters: OrderQueryFilters = {}): Promise<{ orders: PurchaseOrder[]; pagination: any }> => {
    const response = await api.get('/api/v1/orders/my-orders', { params: filters });
    return response.data.data;
  },

  getOrderById: async (orderId: string): Promise<PurchaseOrder> => {
    const response = await api.get(`/api/v1/orders/${orderId}`);
    return response.data.data;
  },

  respondToOrder: async (orderId: string, action: 'accept' | 'reject' | 'suggest', responseNote?: string) => {
    const response = await api.patch(`/api/v1/orders/${orderId}/respond`, {
      action,
      response_note: responseNote,
    });
    return response.data;
  },

  updateOrderStatus: async (
    orderId: string,
    status: OrderStatus | string,
    note?: string,
    deliveryDate?: string
  ) => {
    const response = await api.patch(`/api/v1/orders/${orderId}/status`, {
      status,
      note,
      delivery_date: deliveryDate,
    });
    return response.data;
  },

  // Role-specific convenience methods
  acceptOrder: async (orderId: string, note?: string, deliveryDate?: string) => {
    return orderService.updateOrderStatus(orderId, 'accepted', note, deliveryDate);
  },

  rejectOrder: async (orderId: string, reason: string) => {
    return orderService.updateOrderStatus(orderId, 'rejected', reason);
  },

  startProcessing: async (orderId: string, note?: string) => {
    return orderService.updateOrderStatus(orderId, 'processing', note);
  },

  markPacked: async (orderId: string, note?: string) => {
    return orderService.updateOrderStatus(orderId, 'packed', note);
  },

  markShipped: async (orderId: string, note?: string) => {
    return orderService.updateOrderStatus(orderId, 'shipped', note);
  },

  confirmDelivered: async (orderId: string, note?: string) => {
    return orderService.updateOrderStatus(orderId, 'delivered', note);
  },

  completeOrder: async (orderId: string, note?: string) => {
    return orderService.updateOrderStatus(orderId, 'completed', note);
  },

  cancelOrder: async (orderId: string, reason?: string) => {
    return orderService.updateOrderStatus(orderId, 'cancelled', reason);
  },

  getOrderStats: async (): Promise<OrderStats> => {
    const response = await api.get('/api/v1/orders/stats');
    return response.data.data;
  },

  // Fallback for general list
  getOrders: async (statusFilter?: string) => {
    try {
      const response = await api.get('/api/v1/orders', { params: { status: statusFilter } });
      return response.data.data.orders;
    } catch (error) {
      return [];
    }
  },
};
