import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../services/api';

export default function UsersPage() {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: usersApi.getAll,
  });

  const filtered = users.filter((u: any) =>
    !search ||
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const customerCount = users.filter((u: any) => u.role === 'CUSTOMER').length;
  const driverCount = users.filter((u: any) => u.role === 'DRIVER').length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">👥 Người dùng</h1>
        <div className="flex gap-3 text-sm">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">👤 {customerCount} KH</span>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">🚌 {driverCount} TX</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <input
          type="text"
          placeholder="🔍 Tìm tên, số điện thoại, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Người dùng', 'Số điện thoại', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                          {user.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono">{user.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{user.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'DRIVER' ? 'bg-green-100 text-green-700' :
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role === 'CUSTOMER' ? '👤 Khách hàng' : user.role === 'DRIVER' ? '🚌 Tài xế' : '🛡️ Admin'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span> Hoạt động
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span> Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Chưa có người dùng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
