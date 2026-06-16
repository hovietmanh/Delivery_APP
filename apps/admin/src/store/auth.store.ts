import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1';

interface User {
  id: string;
  fullName: string;
  phone: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (phone, password) => {
        const { data } = await axios.post(`${API_URL}/auth/login`, { phone, password });
        if (data.user.role !== 'ADMIN') throw new Error('Admin access only');
        set({ user: data.user, token: data.accessToken });
      },
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'admin-auth' },
  ),
);
