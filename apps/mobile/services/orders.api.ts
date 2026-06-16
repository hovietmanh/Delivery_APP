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
};
