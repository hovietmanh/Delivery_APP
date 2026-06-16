import { api } from './api';

export const tripsApi = {
  search: (fromCity: string, toCity: string, date?: string) =>
    api.get('/trips', { params: { fromCity, toCity, date } }).then((r) => r.data),
  getAvailableDrivers: (fromCity: string, toCity: string) =>
    api.get('/trips/drivers', { params: { fromCity, toCity } }).then((r) => r.data),
  getRoutes: () => api.get('/trips/routes').then((r) => r.data),
  getTrip: (id: string) => api.get(`/trips/${id}`).then((r) => r.data),
};
