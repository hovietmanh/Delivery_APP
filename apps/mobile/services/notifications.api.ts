import { api } from './api';

export const notificationsApi = {
  getAll: () => api.get('/notifications').then((r) => r.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then((r) => r.data.count as number),
  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
};
