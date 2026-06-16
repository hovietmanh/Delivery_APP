import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../services/api';

const TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'IN_TRANSIT', label: 'Đang chạy' },
  { key: 'DELIVERED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B', CONFIRMED: '#3B82F6', PICKING_UP: '#8B5CF6',
  AT_STATION: '#06B6D4', IN_TRANSIT: '#2563EB', ARRIVED: '#10B981',
  OUT_FOR_DELIVERY: '#22C55E', DELIVERED: '#16A34A', CANCELLED: '#EF4444', DISPUTED: '#DC2626',
};

const STATUS_VN: Record<string, string> = {
  PENDING: 'Chờ duyệt', CONFIRMED: 'Đã nhận', PICKING_UP: 'Đang lấy',
  AT_STATION: 'Tại bến', IN_TRANSIT: 'Đang chạy', ARRIVED: 'Đến bến',
  OUT_FOR_DELIVERY: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', DISPUTED: 'Khiếu nại',
};

export default function OrdersPage() {
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', tab],
    queryFn: () => ordersApi.getAll(tab || undefined),
  });

  const filtered = orders.filter((o: any) =>
    !search || o.trackingCode?.includes(search.toUpperCase()) ||
    o.senderName?.toLowerCase().includes(search.toLowerCase()) ||
    o.receiverName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📦 Quản lý đơn hàng</h1>
        <span className="text-sm text-gray-500">{filtered.length} đơn</span>
      </div>

      {/* Search + tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <input
          type="text"
          placeholder="🔍 Tìm mã vận đơn, tên người gửi/nhận..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-3' : 'xl:grid-cols-1'}`}>
        {/* Table */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${selected ? 'xl:col-span-2' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Mã vận đơn', 'Tuyến đường', 'Người gửi', 'Người nhận', 'Loại DV', 'Trạng thái', 'Tổng tiền'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((order: any) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelected(selected?.id === order.id ? null : order)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === order.id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700 whitespace-nowrap">{order.trackingCode}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{order.fromCity} → {order.toCity}</td>
                      <td className="px-4 py-3 text-gray-700">{order.senderName}<br /><span className="text-xs text-gray-400">{order.senderPhone}</span></td>
                      <td className="px-4 py-3 text-gray-700">{order.receiverName}<br /><span className="text-xs text-gray-400">{order.receiverPhone}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{order.serviceType?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: (STATUS_COLORS[order.status] ?? '#6B7280') + '20', color: STATUS_COLORS[order.status] ?? '#6B7280' }}
                        >
                          {STATUS_VN[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{order.total?.toLocaleString('vi-VN')}đ</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Không có đơn hàng nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order detail panel */}
        {selected && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 h-fit">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Chi tiết đơn</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="bg-[#1A3566] rounded-xl p-4 text-white text-center">
              <p className="text-xs text-blue-300 mb-1">Mã vận đơn</p>
              <p className="font-mono font-bold text-xl">{selected.trackingCode}</p>
              <p className="text-blue-200 text-sm mt-1">{selected.fromCity} → {selected.toCity}</p>
            </div>

            {[
              { label: 'Trạng thái', value: STATUS_VN[selected.status] ?? selected.status },
              { label: 'Người gửi', value: `${selected.senderName} · ${selected.senderPhone}` },
              { label: 'Người nhận', value: `${selected.receiverName} · ${selected.receiverPhone}` },
              { label: 'Địa chỉ giao', value: selected.receiverAddress ?? 'Tự đến bến' },
              { label: 'Loại hàng', value: selected.goodsType },
              { label: 'Trọng lượng', value: selected.weightRange?.replace(/_/g, ' ') },
              { label: 'Dịch vụ', value: selected.serviceType?.replace(/_/g, ' ') },
              { label: 'Thanh toán', value: selected.paymentMethod?.replace(/_/g, ' ') },
              { label: 'Cước phí', value: `${selected.shippingFee?.toLocaleString('vi-VN')}đ` },
              { label: 'Tổng cộng', value: `${selected.total?.toLocaleString('vi-VN')}đ`, bold: true },
            ].map(({ label, value, bold }: any) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-xs ${bold ? 'font-bold text-green-600' : 'text-gray-800'}`}>{value}</span>
              </div>
            ))}

            <div className="text-xs text-gray-400 text-center">
              Tạo lúc: {selected.createdAt ? new Date(selected.createdAt).toLocaleString('vi-VN') : '—'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
