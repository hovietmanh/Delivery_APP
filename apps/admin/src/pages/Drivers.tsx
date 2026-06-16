import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversAdminApi } from '../services/api';

type ModalMode = 'create' | 'edit' | 'reset-password' | null;

const VEHICLE_TYPES = [
  'Xe giường nằm 40 chỗ',
  'Xe giường nằm 34 chỗ',
  'Xe ghế ngồi 45 chỗ',
  'Xe limousine 20 chỗ',
  'Xe limousine 9 chỗ',
  'Xe tải',
];

const CITIES = [
  'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Nghệ An', 'Huế', 'Nha Trang',
  'Cần Thơ', 'Hải Phòng', 'Đà Lạt', 'Vũng Tàu', 'Quy Nhơn',
  'Buôn Ma Thuột', 'Quảng Ngãi', 'Phan Thiết', 'Hội An', 'Pleiku',
  'Đồng Nai', 'Bình Dương',
];

const EMPTY_FORM = {
  fullName: '', phone: '', password: '',
  driverCode: '', companyName: '', vehiclePlate: '', vehicleType: VEHICLE_TYPES[0],
};

type Route = { fromCity: string; toCity: string };

export default function DriversPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeFrom, setRouteFrom] = useState(CITIES[0]);
  const [routeTo, setRouteTo] = useState(CITIES[1]);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: driversAdminApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: driversAdminApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-drivers'] }); closeModal(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Lỗi tạo tài khoản'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => driversAdminApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-drivers'] }); closeModal(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Lỗi cập nhật'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: driversAdminApi.toggleActive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-drivers'] }),
  });

  const approveMutation = useMutation({
    mutationFn: driversAdminApi.approve,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-drivers'] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) => driversAdminApi.resetPassword(id, pwd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-drivers'] }); closeModal(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Lỗi đặt lại mật khẩu'),
  });

  const removeMutation = useMutation({
    mutationFn: driversAdminApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-drivers'] }),
  });

  const filtered = drivers.filter((d: any) =>
    !search ||
    d.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    d.driverCode?.toLowerCase().includes(search.toLowerCase()) ||
    d.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    d.vehiclePlate?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setRoutes([]);
    setRouteFrom(CITIES[0]);
    setRouteTo(CITIES[1]);
    setError('');
    setModal('create');
  };

  const openEdit = (driver: any) => {
    setSelected(driver);
    setForm({
      fullName: driver.user?.fullName ?? '',
      phone: driver.user?.phone ?? '',
      password: '',
      driverCode: driver.driverCode,
      companyName: driver.companyName,
      vehiclePlate: driver.vehiclePlate,
      vehicleType: driver.vehicleType,
    });
    setRoutes(driver.routes?.map((r: any) => ({ fromCity: r.fromCity, toCity: r.toCity })) ?? []);
    setRouteFrom(CITIES[0]);
    setRouteTo(CITIES[1]);
    setError('');
    setModal('edit');
  };

  const openResetPassword = (driver: any) => {
    setSelected(driver);
    setNewPassword('');
    setError('');
    setModal('reset-password');
  };

  const closeModal = () => { setModal(null); setSelected(null); setError(''); };

  const addRoute = () => {
    if (routeFrom === routeTo) { setError('Điểm đi và điểm đến không được trùng nhau'); return; }
    const exists = routes.some(r => r.fromCity === routeFrom && r.toCity === routeTo);
    if (exists) { setError('Tuyến này đã được thêm'); return; }
    setRoutes(prev => [...prev, { fromCity: routeFrom, toCity: routeTo }]);
    setError('');
  };

  const removeRoute = (idx: number) => setRoutes(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setError('');
    if (modal === 'create') {
      if (!form.fullName || !form.phone || !form.password || !form.driverCode || !form.companyName || !form.vehiclePlate) {
        setError('Vui lòng điền đầy đủ thông tin'); return;
      }
      createMutation.mutate({ ...form, routes });
    } else if (modal === 'edit' && selected) {
      updateMutation.mutate({ id: selected.id, data: { ...form, routes } });
    } else if (modal === 'reset-password' && selected) {
      if (newPassword.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
      resetPasswordMutation.mutate({ id: selected.id, pwd: newPassword });
    }
  };

  const handleDelete = (driver: any) => {
    if (confirm(`Xóa tài khoản "${driver.user?.fullName}" (${driver.driverCode})? Thao tác này không thể hoàn tác.`)) {
      removeMutation.mutate(driver.id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || resetPasswordMutation.isPending;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🚌 Quản lý tài xế / Nhà xe</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <span>+</span> Thêm tài xế
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <input
          type="text"
          placeholder="🔍 Tìm tên, mã tài xế, nhà xe, biển số..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Tài xế', 'Mã TX', 'Nhà xe', 'Biển số', 'Loại xe', 'Tuyến hoạt động', 'Đánh giá', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((driver: any) => (
                  <tr key={driver.id} className={`hover:bg-gray-50 ${!driver.user?.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {driver.user?.fullName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{driver.user?.fullName}</p>
                          <p className="text-xs text-gray-400">{driver.user?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-700 font-semibold">{driver.driverCode}</td>
                    <td className="px-4 py-3 text-gray-700">{driver.companyName}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{driver.vehiclePlate}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{driver.vehicleType}</td>
                    <td className="px-4 py-3">
                      {driver.routes?.length > 0 ? (
                        <div className="flex flex-col gap-1 max-w-[180px]">
                          {driver.routes.slice(0, 2).map((r: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">
                              {r.fromCity} → {r.toCity}
                            </span>
                          ))}
                          {driver.routes.length > 2 && (
                            <span className="text-xs text-gray-400">+{driver.routes.length - 2} tuyến khác</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa có tuyến</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-yellow-500 font-semibold">⭐ {driver.rating?.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {driver.isApproved ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold w-fit">✓ Đã duyệt</span>
                        ) : (
                          <button
                            onClick={() => approveMutation.mutate(driver.id)}
                            className="px-2 py-0.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-full text-xs font-semibold w-fit transition-colors"
                          >
                            Chờ duyệt →
                          </button>
                        )}
                        {driver.user?.isActive ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs w-fit">Đang hoạt động</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs w-fit">Đã khóa</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(driver)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                          title="Sửa thông tin"
                        >✏️</button>
                        <button
                          onClick={() => openResetPassword(driver)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-medium transition-colors"
                          title="Đặt lại mật khẩu"
                        >🔑</button>
                        <button
                          onClick={() => toggleActiveMutation.mutate(driver.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            driver.user?.isActive
                              ? 'bg-red-50 hover:bg-red-100 text-red-600'
                              : 'bg-green-50 hover:bg-green-100 text-green-700'
                          }`}
                          title={driver.user?.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                        >{driver.user?.isActive ? '🔒' : '🔓'}</button>
                        <button
                          onClick={() => handleDelete(driver)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
                          title="Xóa tài khoản"
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Chưa có tài xế nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === 'create' && '➕ Thêm tài xế mới'}
                {modal === 'edit' && `✏️ Sửa thông tin — ${selected?.driverCode}`}
                {modal === 'reset-password' && `🔑 Đặt lại mật khẩu — ${selected?.driverCode}`}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  ⚠️ {error}
                </div>
              )}

              {modal === 'reset-password' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự..."
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Tài xế sẽ cần dùng mật khẩu này để đăng nhập lần tới.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Họ tên</label>
                      <input
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={form.fullName}
                        onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Số điện thoại</label>
                      <input
                        type="text"
                        placeholder="0912345678"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {modal === 'create' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mật khẩu</label>
                        <input
                          type="password"
                          placeholder="Tối thiểu 6 ký tự"
                          value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mã tài xế</label>
                      <input
                        type="text"
                        placeholder="TX-001"
                        value={form.driverCode}
                        onChange={e => setForm(f => ({ ...f, driverCode: e.target.value.toUpperCase() }))}
                        disabled={modal === 'edit'}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nhà xe</label>
                      <input
                        type="text"
                        placeholder="Xe Văn Minh"
                        value={form.companyName}
                        onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Biển số xe</label>
                      <input
                        type="text"
                        placeholder="29B-001.23"
                        value={form.vehiclePlate}
                        onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Loại xe</label>
                      <select
                        value={form.vehicleType}
                        onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Routes section */}
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">
                      🗺️ Tuyến đường hoạt động
                    </label>

                    {/* Add route row */}
                    <div className="flex gap-2 mb-3">
                      <select
                        value={routeFrom}
                        onChange={e => setRouteFrom(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="self-center text-gray-400 font-bold">→</span>
                      <select
                        value={routeTo}
                        onChange={e => setRouteTo(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={addRoute}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
                      >
                        + Thêm
                      </button>
                    </div>

                    {/* Route list */}
                    {routes.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-2">Chưa có tuyến nào được thêm</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {routes.map((r, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl">
                            <span className="text-sm font-medium text-blue-800">
                              {r.fromCity} → {r.toCity}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeRoute(i)}
                              className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                            >
                              ✕ Xóa
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {isPending ? 'Đang xử lý...' : modal === 'create' ? 'Tạo tài khoản' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
