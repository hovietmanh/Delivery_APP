import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ordersApi } from '../services/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B', CONFIRMED: '#3B82F6', PICKING_UP: '#8B5CF6',
  AT_STATION: '#06B6D4', IN_TRANSIT: '#2563EB', ARRIVED: '#10B981',
  OUT_FOR_DELIVERY: '#22C55E', DELIVERED: '#16A34A', CANCELLED: '#EF4444',
};

const STATUS_VN: Record<string, string> = {
  PENDING: 'Chờ duyệt', CONFIRMED: 'Đã nhận', PICKING_UP: 'Đang lấy',
  AT_STATION: 'Tại bến', IN_TRANSIT: 'Đang chạy', ARRIVED: 'Đến bến',
  OUT_FOR_DELIVERY: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy',
};

const MOCK_CHART = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (6 - i));
  return { date: `${d.getDate()}/${d.getMonth() + 1}`, orders: 20 + Math.round(Math.random() * 40), revenue: (150 + Math.round(Math.random() * 300)) * 1000 };
});

export default function DashboardPage() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: ordersApi.getStats });
  const { data: allOrders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: () => ordersApi.getAll() });

  const statCards = [
    { label: 'Tổng đơn hàng', value: stats?.total ?? allOrders.length, icon: '📦', color: 'blue' },
    { label: 'Đang vận chuyển', value: stats?.inTransit ?? allOrders.filter((o: any) => ['IN_TRANSIT', 'PICKING_UP', 'AT_STATION', 'ARRIVED', 'OUT_FOR_DELIVERY'].includes(o.status)).length, icon: '🚌', color: 'purple' },
    { label: 'Đã giao hôm nay', value: stats?.todayOrders ?? allOrders.filter((o: any) => o.status === 'DELIVERED').length, icon: '✅', color: 'green' },
    { label: 'Doanh thu', value: stats?.revenue ? `${(stats.revenue / 1000000).toFixed(1)}M đ` : '—', icon: '💰', color: 'yellow' },
  ];

  const statusGroups = allOrders.reduce((acc: any, order: any) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(statusGroups).map(([status, count]) => ({
    status: STATUS_VN[status] ?? status,
    count,
    fill: STATUS_COLORS[status] ?? '#6B7280',
  }));

  const recentOrders = [...allOrders].slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-sm text-gray-500">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>
              <span className="text-2xl">{icon}</span>
            </div>
            <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Order trend chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Đơn hàng 7 ngày qua</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={MOCK_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [v, 'Đơn hàng']} />
              <Area type="monotone" dataKey="orders" stroke="#2563EB" fill="#EFF6FF" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Trạng thái đơn</h2>
          {statusChartData.length > 0 ? (
            <div className="space-y-2">
              {statusChartData.map(({ status, count, fill }: any) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fill }} />
                  <span className="text-sm text-gray-600 flex-1">{status}</span>
                  <span className="text-sm font-semibold text-gray-900">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">🕐 Đơn hàng gần đây</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Mã vận đơn', 'Tuyến', 'Người gửi', 'Người nhận', 'Trạng thái', 'Giá trị'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{order.trackingCode}</td>
                  <td className="px-4 py-3 text-gray-700">{order.fromCity} → {order.toCity}</td>
                  <td className="px-4 py-3 text-gray-700">{order.senderName}</td>
                  <td className="px-4 py-3 text-gray-700">{order.receiverName}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: (STATUS_COLORS[order.status] ?? '#6B7280') + '20', color: STATUS_COLORS[order.status] ?? '#6B7280' }}
                    >
                      {STATUS_VN[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{order.total?.toLocaleString('vi-VN')}đ</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có đơn hàng</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
