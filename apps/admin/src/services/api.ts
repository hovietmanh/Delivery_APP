import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('admin-auth');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    } catch {}
  }
  return config;
});

export const ordersApi = {
  getAll: (status?: string) => api.get('/orders', { params: status ? { status } : undefined }).then(r => r.data),
  getOne: (id: string) => api.get(`/orders/${id}`).then(r => r.data),
  getStats: () => api.get('/orders/stats').then(r => r.data),
  getChart: () => api.get('/orders/chart').then(r => r.data),
};

export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
};

export const driversAdminApi = {
  getAll: () => api.get('/admin/drivers').then(r => r.data),
  create: (data: any) => api.post('/admin/drivers', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/admin/drivers/${id}`, data).then(r => r.data),
  approve: (id: string) => api.patch(`/admin/drivers/${id}/approve`).then(r => r.data),
  toggleActive: (id: string) => api.patch(`/admin/drivers/${id}/toggle-active`).then(r => r.data),
  resetPassword: (id: string, newPassword: string) => api.patch(`/admin/drivers/${id}/reset-password`, { newPassword }).then(r => r.data),
  remove: (id: string) => api.delete(`/admin/drivers/${id}`).then(r => r.data),
};

export const routesApi = {
  getAll: () => api.get('/trips/routes').then(r => r.data),
};

export const vouchersApi = {
  getAll: () => api.get('/vouchers/admin/all').then(r => r.data),
  create: (data: any) => api.post('/vouchers', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/vouchers/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/vouchers/${id}`).then(r => r.data),
};
