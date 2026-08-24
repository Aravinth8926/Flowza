import { create } from 'zustand';
import { User, Company, Address } from '../types';
import { userService } from '../services/user.service';
import { companyService } from '../services/company.service';
import { useAuthStore } from './auth';

const nowIso = new Date().toISOString();

interface UserState {
  profile: User | null;
  company: Company | null;
  address: Address | null;
  isLoading: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  fetchCompany: () => Promise<void>;
  updateCompany: (data: Partial<Company>) => Promise<void>;
  fetchAddress: () => Promise<void>;
  updateAddress: (data: Partial<Address>) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  company: null,
  address: null,
  isLoading: false,
  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const res = await userService.getProfile();
      set({ profile: res.data, isLoading: false });
      useAuthStore.getState().setUser(res.data);
    } catch (err) {
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        set({ profile: authUser, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },
  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const res = await userService.updateProfile(data);
      set({ profile: res.data, isLoading: false });
      useAuthStore.getState().setUser(res.data);
    } catch (err) {
      const current = get().profile || useAuthStore.getState().user;
      if (current) {
        const updated = { ...current, ...data };
        set({ profile: updated, isLoading: false });
        useAuthStore.getState().setUser(updated);
      } else {
        set({ isLoading: false });
      }
    }
  },
  fetchCompany: async () => {
    set({ isLoading: true });
    try {
      const res = await companyService.getCompany();
      set({ company: res.data, isLoading: false });
    } catch (err) {
      const savedSessionRaw = localStorage.getItem('flowza_current_session');
      if (savedSessionRaw) {
        try {
          const parsed = JSON.parse(savedSessionRaw);
          if (parsed.company) {
            set({ company: parsed.company, isLoading: false });
            return;
          }
        } catch (e) {}
      }
      set({ isLoading: false });
    }
  },
  updateCompany: async (data) => {
    set({ isLoading: true });
    try {
      const res = await companyService.updateCompany(data);
      set({ company: res.data, isLoading: false });
    } catch (err) {
      const current = get().company;
      if (current) {
        set({ company: { ...current, ...data }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },
  fetchAddress: async () => {
    set({ isLoading: true });
    try {
      const res = await companyService.getAddress();
      set({ address: res.data, isLoading: false });
    } catch (err) {
      const savedSessionRaw = localStorage.getItem('flowza_current_session');
      if (savedSessionRaw) {
        try {
          const parsed = JSON.parse(savedSessionRaw);
          if (parsed.address) {
            set({ address: parsed.address, isLoading: false });
            return;
          }
        } catch (e) {}
      }

      const defaultAddress: Address = {
        id: 'addr-default',
        company_id: 'comp-default',
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        address_line: 'MG Road, Indiranagar',
        address_type: 'billing',
        created_at: nowIso,
        updated_at: nowIso,
      };
      set({ address: defaultAddress, isLoading: false });
    }
  },
  updateAddress: async (data) => {
    set({ isLoading: true });
    try {
      const res = await companyService.updateAddress(data);
      set({ address: res.data, isLoading: false });
    } catch (err) {
      const current = get().address;
      if (current) {
        set({ address: { ...current, ...data }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },
}));
