import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string | null) => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await authService.login(credentials);
      set({
        user: res.data.user,
        token: res.data.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      localStorage.setItem('flowza_logged_in', 'true');
      localStorage.setItem('flowza_current_user', JSON.stringify(res.data.user));
      if (res.data.refresh_token) {
        localStorage.setItem('flowza_refresh_token', res.data.refresh_token);
      }
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authService.register(data);
      set({
        user: res.data.user,
        token: res.data.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      localStorage.setItem('flowza_logged_in', 'true');
      localStorage.setItem('flowza_current_user', JSON.stringify(res.data.user));
      if (res.data.refresh_token) {
        localStorage.setItem('flowza_refresh_token', res.data.refresh_token);
      }
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('flowza_logged_in');
      localStorage.removeItem('flowza_refresh_token');
      localStorage.removeItem('flowza_current_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
  refreshToken: async () => {
    const rf = localStorage.getItem('flowza_refresh_token');
    if (!rf) {
      const storedUserRaw = localStorage.getItem('flowza_current_user');
      if (storedUserRaw) {
        try {
          const user = JSON.parse(storedUserRaw);
          set({ token: 'mock-session-token', isAuthenticated: true, user });
          return;
        } catch (e) {}
      }
      set({ token: null, isAuthenticated: false, user: null });
      return;
    }
    try {
      const res = await authService.refreshToken(rf);
      set({
        token: res.data.access_token,
        isAuthenticated: true,
      });
      if (res.data.refresh_token) {
        localStorage.setItem('flowza_refresh_token', res.data.refresh_token);
      }
    } catch (err) {
      const storedUserRaw = localStorage.getItem('flowza_current_user');
      if (storedUserRaw) {
        try {
          const user = JSON.parse(storedUserRaw);
          set({ token: 'mock-session-token', isAuthenticated: true, user });
          return;
        } catch (e) {}
      }
      localStorage.removeItem('flowza_logged_in');
      localStorage.removeItem('flowza_refresh_token');
      localStorage.removeItem('flowza_current_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      throw err;
    }
  },
  setUser: (user) => {
    set({ user });
    if (user) {
      localStorage.setItem('flowza_current_user', JSON.stringify(user));
    }
  },
  setToken: (token) => set({ token, isAuthenticated: !!token }),
  initializeAuth: async () => {
    const loggedIn = localStorage.getItem('flowza_logged_in') === 'true';
    if (!loggedIn) return;

    const storedUserRaw = localStorage.getItem('flowza_current_user');
    let storedUser: User | null = null;
    if (storedUserRaw) {
      try {
        storedUser = JSON.parse(storedUserRaw);
        set({ user: storedUser, isAuthenticated: true, token: 'mock-session-token' });
      } catch (e) {}
    }

    set({ isLoading: true });
    try {
      await get().refreshToken();
      const { useUserStore } = await import('./user');
      await useUserStore.getState().fetchProfile().catch(() => {});
    } catch (e) {
      if (!get().user && storedUser) {
        set({ user: storedUser, isAuthenticated: true, token: 'mock-session-token' });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
