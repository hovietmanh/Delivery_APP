import { api } from './api';

export const ordersApi = {
  getMyOrders: (status?: string) =>
    api.get('/orders', { params: { status } }).then((r) => r.data),

  getOrder: (id: string) => api.get(`/orders/${id}`).then((r) => r.data),

  createOrder: (data: any) => api.post('/orders', data).then((r) => r.data),

  acceptOrder: (id: string) => api.patch(`/orders/${id}/accept`).then((r) => r.data),

  pickupOrder: (id: string) => api.patch(`/orders/${id}/pickup`).then((r) => r.data),

  completeOrder: (id: string) => api.patch(`/orders/${id}/complete`).then((r) => r.data),

  cancelOrder: (id: string, reason?: string) =>
    api.patch(`/orders/${id}/cancel`, { reason }).then((r) => r.data),

  submitReview: (id: string, data: {
    overallRating: number; goodsCareRating: number;
    staffRating: number; timeRating: number; comment?: string;
  }) => api.post(`/orders/${id}/review`, data).then((r) => r.data),

  getReview: (id: string) => api.get(`/orders/${id}/review`).then((r) => r.data).catch(() => null),

  submitComplaint: (id: string, data: {
    reason: string; description: string; requestedAmount?: number;
  }) => api.post(`/orders/${id}/complaint`, data).then((r) => r.data),

  getComplaint: (id: string) => api.get(`/orders/${id}/complaint`).then((r) => r.data).catch(() => null),

  resolveComplaint: (id: string, data: { verdict: 'FAULT' | 'NO_FAULT'; message: string }) =>
    api.patch(`/orders/${id}/complaint/resolve`, data).then((r) => r.data),

  submitBankInfo: (id: string, bankAccount: string) =>
    api.patch(`/orders/${id}/complaint/bank-info`, { bankAccount }).then((r) => r.data),

  confirmTransfer: (id: string) =>
    api.patch(`/orders/${id}/complaint/confirm-transfer`).then((r) => r.data),
};
