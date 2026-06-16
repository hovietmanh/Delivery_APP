import { api } from './api';

export const authApi = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }).then(r => r.data),
  loginDriver: (driverCode: string, vehiclePlate: string, password: string) =>
    api.post('/auth/login/driver', { driverCode, vehiclePlate, password }).then(r => r.data),
  register: (data: { phone: string; password: string; fullName: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  updateMe: (data: { fullName?: string; email?: string }) =>
    api.patch('/users/me', data).then(r => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/me/change-password', { currentPassword, newPassword }).then(r => r.data),
  getSavedAddresses: () => api.get('/users/me/addresses').then(r => r.data),
  updateSavedAddresses: (addresses: any[]) =>
    api.patch('/users/me/addresses', { addresses }).then(r => r.data),
};
