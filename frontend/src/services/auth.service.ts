import api from './api';
import { LoginRequest, RegisterRequest, AuthResponse, TokenResponse } from '../types';

/**
 * Real authentication service — NO mock fallbacks.
 * Every method talks directly to the FastAPI backend.
 * If the backend is unreachable, errors propagate to the UI
 * so users see a clear "Server is offline" message rather than
 * silently logging them in with fake credentials.
 */
export const authService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const res = await api.post<AuthResponse>('/api/v1/auth/register', data);
      return res.data;
    } catch (err: any) {
      // Re-throw with a clean, user-readable message
      if (err.response?.data) {
        throw err; // FastAPI validation / business logic errors
      }
      throw new Error(
        'Cannot connect to the Flowza server. Please make sure the backend is running on port 8000.'
      );
    }
  },

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const res = await api.post<AuthResponse>('/api/v1/auth/login', credentials);
      return res.data;
    } catch (err: any) {
      if (err.response?.data) {
        throw err; // Incorrect credentials, account inactive, etc.
      }
      throw new Error(
        'Cannot connect to the Flowza server. Please make sure the backend is running on port 8000.'
      );
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // Swallow — we always clear local state on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('flowza_logged_in');
      localStorage.removeItem('flowza_refresh_token');
      localStorage.removeItem('flowza_current_user');
    }
  },

  async refreshToken(token: string): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/api/v1/auth/refresh', {
      refresh_token: token,
    });
    return res.data;
  },
};
