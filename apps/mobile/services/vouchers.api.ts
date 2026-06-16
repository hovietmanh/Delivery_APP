import { api } from './api';

export const vouchersApi = {
  getActive: () => api.get('/vouchers').then((r) => r.data),
  validate: (code: string, total: number) =>
    api.get('/vouchers/validate', { params: { code, total } }).then((r) => r.data),
};
