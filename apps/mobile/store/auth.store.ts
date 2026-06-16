import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  // Driver-specific (populated when role=DRIVER)
  driverCode?: string;
  companyName?: string;
  vehiclePlate?: string;
  rating?: number;
  totalDeliveries?: number;
  totalTrips?: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  loginDriver: (driverCode: string, vehiclePlate: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync('accessToken', accessToken),
    SecureStore.setItemAsync('refreshToken', refreshToken),
  ]);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  login: async (phone, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      await saveTokens(data.accessToken, data.refreshToken);
      set({ user: data.user });
    } finally {
      set({ isLoading: false });
    }
  },

  loginDriver: async (driverCode, vehiclePlate, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login/driver', { driverCode, vehiclePlate, password });
      await saveTokens(data.accessToken, data.refreshToken);
      set({ user: data.user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await api.post('/auth/logout').catch(() => {});
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
    ]);
    set({ user: null });
  },

  loadUser: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      set({ user: null });
    }
  },

  updateUser: (data) => set(state => ({
    user: state.user ? { ...state.user, ...data } : null,
  })),
}));
