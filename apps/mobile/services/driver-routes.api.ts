import { api } from './api';

export interface TodayRoute {
  fromCity: string | null;
  toCity: string | null;
  departureTime: string | null;
  pricePerKg: number | null;
  isSet: boolean;
}

export const driverRoutesApi = {
  getTodayRoute: (): Promise<TodayRoute> =>
    api.get('/driver/today-route').then((r) => r.data),

  updateTodayRoute: (data: {
    fromCity: string;
    toCity: string;
    departureTime: string;
    pricePerKg?: number;
  }): Promise<TodayRoute> =>
    api.put('/driver/today-route', data).then((r) => r.data),

  clearTodayRoute: (): Promise<{ isSet: boolean }> =>
    api.put('/driver/today-route/clear').then((r) => r.data),
};
