import api from './api';
import {
  NotificationItem,
  NotificationListResponse,
  NotificationPreferences,
} from '../types';

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  is_read?: boolean;
  type?: string;
  search?: string;
}

export const notificationService = {
  /**
   * Fetch paginated list of notifications for authenticated user
   */
  getNotifications: async (params?: NotificationQueryParams): Promise<NotificationListResponse> => {
    const res = await api.get('/api/v1/notifications', { params });
    return res.data?.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/api/v1/notifications/unread-count');
    return res.data?.data?.count ?? 0;
  },

  /**
   * Get single notification details
   */
  getNotification: async (id: string): Promise<NotificationItem> => {
    const res = await api.get(`/api/v1/notifications/${id}`);
    return res.data?.data;
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<NotificationItem> => {
    const res = await api.patch(`/api/v1/notifications/${id}/read`);
    return res.data?.data;
  },

  /**
   * Mark all unread notifications as read
   */
  markAllAsRead: async (): Promise<{ marked_read_count: number }> => {
    const res = await api.patch('/api/v1/notifications/read-all');
    return res.data?.data;
  },

  /**
   * Soft-delete a notification
   */
  deleteNotification: async (id: string): Promise<boolean> => {
    const res = await api.delete(`/api/v1/notifications/${id}`);
    return res.data?.data?.deleted ?? false;
  },

  /**
   * Get user notification preferences
   */
  getPreferences: async (): Promise<NotificationPreferences> => {
    const res = await api.get('/api/v1/notifications/preferences');
    return res.data?.data;
  },

  /**
   * Update user notification preferences
   */
  updatePreferences: async (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const res = await api.patch('/api/v1/notifications/preferences', data);
    return res.data?.data;
  },
};
