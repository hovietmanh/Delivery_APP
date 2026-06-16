import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vouchersApi } from '../services/api';

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
  discountValue: '',
  minOrderValue: '',
  maxDiscount: '',
  maxUses: '100',
  expiresAt: '',
  isActive: true,
};

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function VouchersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: vouchersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: vouchersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-vouchers'] }); closeModal(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => vouchersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-vouchers'] }); closeModal(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Có lỗi xảy ra'),
  });

  const deleteMutation = useMutation({
    mutationFn: vouchersApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-vouchers'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => vouchersApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-vouchers'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      code: v.code,
      description: v.description ?? '',
      discountType: v.discountType,
      discountValue: String(v.discountValue),
      minOrderValue: String(v.minOrderValue ?? ''),
      maxDiscount: String(v.maxDiscount ?? ''),
      maxUses: String(v.maxUses),
      expiresAt: v.expiresAt ? v.expiresAt.slice(0, 10) : '',
      isActive: v.isActive,
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); setError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      maxUses: Number(form.maxUses),
      expiresAt: form.expiresAt || undefined,
      isActive: form.isActive,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isExpired = (v: any) => v.expiresAt && new Date(v.expiresAt) < new Date();
  const isFull = (v: any) => v.usedCount >= v.maxUses;

  const statusBadge = (v: any) => {
    if (!v.isActive) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Tắt</span>;
    if (isExpired(v)) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Hết hạn</span>;
    if (isFull(v)) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">Hết lượt</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-600">● Đang chạy</span>;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎁 Quản lý Voucher</h1>
          <p className="text-sm text-gray-500 mt-1">{vouchers.length} mã giảm giá</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          + Tạo mã mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Đang tải...</div>
        ) : vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <span className="text-4xl">🎁</span>
            <p>Chưa có voucher nào. Tạo mã đầu tiên!</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Mã code</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Giảm giá</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Đơn tối thiểu</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Lượt dùng</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Hết hạn</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600">Trạng thái</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vouchers.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-blue-700 tracking-wider">{v.code}</div>
                    {v.description && <div className="text-xs text-gray-400 mt-0.5">{v.description}</div>}
                  </td>
                  <td className="px-4 py-4 font-semibold text-green-600">
                    {v.discountType === 'PERCENT'
                      ? `${v.discountValue}%${v.maxDiscount ? ` (tối đa ${(v.maxDiscount / 1000).toFixed(0)}K)` : ''}`
                      : `${(v.discountValue / 1000).toFixed(0)}K`}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {v.minOrderValue > 0 ? `${(v.minOrderValue / 1000).toFixed(0)}K` : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-20">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min((v.usedCount / v.maxUses) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{v.usedCount}/{v.maxUses}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">{formatDate(v.expiresAt)}</td>
                  <td className="px-4 py-4">{statusBadge(v)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => toggleMutation.mutate({ id: v.id, isActive: !v.isActive })}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          v.isActive
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {v.isActive ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        onClick={() => openEdit(v)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Xóa voucher này?')) deleteMutation.mutate(v.id); }}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo / chỉnh sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? '✏️ Chỉnh sửa voucher' : '🎁 Tạo mã giảm giá mới'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã code *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="VD: GIAM50K"
                    required
                    disabled={!!editing}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="VD: Ưu đãi tháng 6"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm *</label>
                  <select
                    value={form.discountType}
                    onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PERCENT">Theo % (phần trăm)</option>
                    <option value="FIXED">Số tiền cố định</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị giảm * {form.discountType === 'PERCENT' ? '(%)' : '(đ)'}
                  </label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                    placeholder={form.discountType === 'PERCENT' ? '10' : '50000'}
                    required
                    min={0}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn tối thiểu (đ)</label>
                  <input
                    type="number"
                    value={form.minOrderValue}
                    onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))}
                    placeholder="0"
                    min={0}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {form.discountType === 'PERCENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giảm tối đa (đ)</label>
                    <input
                      type="number"
                      value={form.maxDiscount}
                      onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))}
                      placeholder="100000"
                      min={0}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượt dùng tối đa</label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                  <span className="text-sm text-gray-700">Kích hoạt ngay sau khi tạo</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
