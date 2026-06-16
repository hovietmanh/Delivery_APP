import { api } from './api';

export const driverApi = {
  getStats: () => api.get('/driver/stats').then((r) => r.data),
  getOrders: (status?: string) =>
    api.get('/driver/orders', { params: status ? { status } : undefined }).then((r) => r.data),
  getOrder: (id: string) => api.get(`/driver/orders/${id}`).then((r) => r.data),
  acceptOrder: (id: string) => api.patch(`/driver/orders/${id}/accept`).then((r) => r.data),
  rejectOrder: (id: string, reason: string) =>
    api.patch(`/driver/orders/${id}/reject`, { reason }).then((r) => r.data),
  confirmPickup: (id: string, photos: string[]) =>
    api.patch(`/driver/orders/${id}/pickup`, { photos }).then((r) => r.data),
  confirmDelivery: (id: string, data: { photos: string[]; signature: string; codCollected?: number }) =>
    api.patch(`/driver/orders/${id}/deliver`, data).then((r) => r.data),
  getActiveTrip: () => api.get('/driver/trip/active').then((r) => r.data),
  updateTripCheckpoint: (tripId: string, checkpoint: string) =>
    api.patch(`/driver/trip/${tripId}/checkpoint`, { checkpoint }).then((r) => r.data),
  getComplaints: () => api.get('/driver/complaints').then((r) => r.data),
  respondComplaint: (id: string, response: string) =>
    api.patch(`/driver/complaints/${id}/respond`, { response }).then((r) => r.data),
};
