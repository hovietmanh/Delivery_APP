import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { routesApi } from '../services/api';

export default function RoutesPage() {
  const [search, setSearch] = useState('');

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['admin-routes'],
    queryFn: routesApi.getAll,
  });

  const filtered = routes.filter((r: any) =>
    !search ||
    r.fromCity?.toLowerCase().includes(search.toLowerCase()) ||
    r.toCity?.toLowerCase().includes(search.toLowerCase()) ||
    r.fromStation?.toLowerCase().includes(search.toLowerCase()) ||
    r.toStation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🗺️ Tuyến đường</h1>
        <span className="text-sm text-gray-500">{filtered.length} tuyến</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <input
          type="text"
          placeholder="🔍 Tìm thành phố, bến xe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 flex items-center justify-center py-16 text-gray-400 bg-white rounded-2xl">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 flex items-center justify-center py-16 text-gray-400 bg-white rounded-2xl">
            Chưa có tuyến đường nào. Tạo đơn hàng đầu tiên để hệ thống tự sinh tuyến.
          </div>
        ) : (
          filtered.map((route: any) => (
            <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 text-blue-700 rounded-lg px-3 py-1 text-sm font-bold">{route.fromCity}</div>
                    <span className="text-gray-400">→</span>
                    <div className="bg-green-100 text-green-700 rounded-lg px-3 py-1 text-sm font-bold">{route.toCity}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${route.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {route.isActive ? '● Hoạt động' : '● Tạm dừng'}
                </span>
              </div>

              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <p>📍 {route.fromStation}</p>
                <p>📍 {route.toStation}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{route.distanceKm?.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">km</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{route.durationHours}h</p>
                  <p className="text-xs text-gray-500">thời gian</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{(route.pricePerKg / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-gray-500">/kg</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
