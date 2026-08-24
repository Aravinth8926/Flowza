import api from './api';
import { User, UserResponse } from '../types';

export const userService = {
  async getProfile(): Promise<UserResponse> {
    const res = await api.get<UserResponse>('/api/v1/users/me');
    return res.data;
  },

  async updateProfile(data: Partial<User>): Promise<UserResponse> {
    const res = await api.patch<UserResponse>('/api/v1/users/me', data);
    return res.data;
  },

  async changePassword(data: any): Promise<void> {
    await api.post('/api/v1/users/me/change-password', data);
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/api/v1/users/me');
  },

  async uploadProfilePicture(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ success: boolean; data: { url: string } }>('/api/v1/users/me/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },
};
