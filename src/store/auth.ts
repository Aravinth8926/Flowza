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
      const { access_token, refresh_token, user } = res.data;

      localStorage.setItem('flowza_logged_in', 'true');
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('flowza_current_user', JSON.stringify(user));
      if (refresh_token) {
        localStorage.setItem('flowza_refresh_token', refresh_token);
      }

      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authService.register(data);
      const { access_token, refresh_token, user } = res.data;

      localStorage.setItem('flowza_logged_in', 'true');
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('flowza_current_user', JSON.stringify(user));
      if (refresh_token) {
        localStorage.setItem('flowza_refresh_token', refresh_token);
      }

      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('flowza_logged_in');
      localStorage.removeItem('access_token');
      localStorage.removeItem('flowza_refresh_token');
      localStorage.removeItem('flowza_current_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshToken: async () => {
    const rf = localStorage.getItem('flowza_refresh_token');
    if (!rf) {
      // No refresh token — clear everything and force re-login
      localStorage.removeItem('flowza_logged_in');
      localStorage.removeItem('flowza_current_user');
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }
    try {
      const res = await authService.refreshToken(rf);
      const { access_token, refresh_token } = res.data;

      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('flowza_refresh_token', refresh_token);
      }
      set({ token: access_token, isAuthenticated: true });
    } catch {
      // Refresh token is invalid or expired — force re-login
      localStorage.removeItem('flowza_logged_in');
      localStorage.removeItem('access_token');
      localStorage.removeItem('flowza_refresh_token');
      localStorage.removeItem('flowza_current_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  setUser: (user) => {
    set({ user });
    localStorage.setItem('flowza_current_user', JSON.stringify(user));
  },

  setToken: (token) => set({ token, isAuthenticated: !!token }),

  initializeAuth: async () => {
    const loggedIn = localStorage.getItem('flowza_logged_in') === 'true';
    if (!loggedIn) return;

    set({ isLoading: true });

    // Restore user from localStorage immediately for fast UI render
    const storedUserRaw = localStorage.getItem('flowza_current_user');
    const storedToken = localStorage.getItem('access_token');
    if (storedUserRaw && storedToken) {
      try {
        const user = JSON.parse(storedUserRaw);
        set({ user, token: storedToken, isAuthenticated: true });
      } catch {
        // Corrupt local storage — reset
        set({ isLoading: false });
        return;
      }
    }

    // Validate session with the backend via refresh token rotation
    try {
      await get().refreshToken();
      const { useUserStore } = await import('./user');
      await useUserStore.getState().fetchProfile().catch(() => { });
    } catch {
      // refreshToken already clears state internally on failure
    } finally {
      set({ isLoading: false });
    }
  },
}));
