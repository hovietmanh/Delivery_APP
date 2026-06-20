import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  TextInput, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useOrderStore } from '@store/order.store';
import { vouchersApi } from '@services/vouchers.api';
import { StepIndicator } from '@components/ui/StepIndicator';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const STEPS = [{ label: 'Tuyến' }, { label: 'Xe' }, { label: 'Hàng hóa' }, { label: 'Xem lại' }];

const PRICE_PER_KG: Record<string, number> = {
  UNDER_5KG: 2.5, FROM_5_TO_20KG: 12, FROM_20_TO_50KG: 35, OVER_50KG: 60,
};
const DOOR_FEE: Record<string, number> = {
  STATION_TO_STATION: 0, DOOR_TO_STATION: 30000, STATION_TO_DOOR: 30000, DOOR_TO_DOOR: 60000,
};
const WEIGHT_LABELS: Record<string, string> = {
  UNDER_5KG: '< 5kg', FROM_5_TO_20KG: '5-20kg', FROM_20_TO_50KG: '20-50kg', OVER_50KG: '> 50kg',
};

type AppliedVoucher = { id: string; code: string; discount: number; remainingUses: number; expiresAt: string | null };

export default function SendStep4() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { draft, updateDraft, submitOrder, resetDraft, isSubmitting } = useOrderStore();

  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const tripData = (draft as any).tripData;
  const pricePerKg = tripData?.pricePerKg ?? 45000;
  const weightKg = PRICE_PER_KG[draft.weightRange ?? 'UNDER_5KG'];
  const shippingFee = pricePerKg * weightKg;
  const doorFee = DOOR_FEE[draft.serviceType ?? 'STATION_TO_STATION'];
  const insuranceFee = draft.hasInsurance ? 5000 : 0;
  const baseTotal = shippingFee + doorFee + insuranceFee;
  const discount = appliedVoucher?.discount ?? 0;
  const total = baseTotal - discount;

  const { data: availableVouchers = [], isLoading: vouchersLoading } = useQuery({
    queryKey: ['vouchers-active'],
    queryFn: vouchersApi.getActive,
    enabled: pickerVisible,
    staleTime: 60_000,
  });

  const applyManual = async () => {
    if (!manualCode.trim()) return;
    setManualLoading(true);
    setManualError('');
    try {
      const result = await vouchersApi.validate(manualCode.trim().toUpperCase(), baseTotal);
      setAppliedVoucher({
        id: result.voucher.id,
        code: result.voucher.code,
        discount: result.discountAmount,
        remainingUses: result.voucher.maxUses - result.voucher.usedCount - 1,
        expiresAt: result.voucher.expiresAt ?? null,
      });
      setPickerVisible(false);
      setManualCode('');
    } catch (e: any) {
      setManualError(e.response?.data?.message ?? 'Mã không hợp lệ');
    } finally {
      setManualLoading(false);
    }
  };

  const applyFromList = async (voucher: any) => {
    setApplyingId(voucher.id);
    try {
      const result = await vouchersApi.validate(voucher.code, baseTotal);
      setAppliedVoucher({
        id: result.voucher.id,
        code: result.voucher.code,
        discount: result.discountAmount,
        remainingUses: result.voucher.maxUses - result.voucher.usedCount - 1,
        expiresAt: result.voucher.expiresAt ?? null,
      });
      setPickerVisible(false);
    } catch (e: any) {
      Alert.alert('Không thể áp dụng', e.response?.data?.message ?? 'Voucher không hợp lệ cho đơn này');
    } finally {
      setApplyingId(null);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setManualError('');
  };

  const onSubmit = async () => {
    try {
      const paymentMethod = 'CASH_AT_STATION' as const;
      updateDraft({
        shippingFee, doorFee, insuranceFee, discount, total,
        paymentMethod,
        ...(appliedVoucher ? { voucherId: appliedVoucher.id } : {}),
      } as any);
      const order = await submitOrder();
      resetDraft();
      qc.invalidateQueries({ queryKey: ['orders'] });
      router.replace({
        pathname: '/(customer)/payment',
        params: { orderId: order.id, trackingCode: order.trackingCode, method: paymentMethod },
      } as any);
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.message ?? 'Không thể tạo đơn hàng';
      if (msg.includes('voucher') || msg.includes('Voucher')) {
        setAppliedVoucher(null);
        setManualError(msg);
        Alert.alert('Voucher không hợp lệ', msg);
      } else {
        Alert.alert('Lỗi', msg);
      }
    }
  };

  const renderVoucherCard = ({ item: v }: { item: any }) => {
    const discountLabel = v.discountType === 'PERCENT'
      ? `Giảm ${v.discountValue}%${v.maxDiscount ? ` (tối đa ${v.maxDiscount.toLocaleString('vi-VN')}đ)` : ''}`
      : `Giảm ${v.discountValue?.toLocaleString('vi-VN')}đ`;
    const remaining = v.maxUses - v.usedCount;
    const isApplying = applyingId === v.id;
    const isApplied = appliedVoucher?.id === v.id;

    return (
      <View style={styles.voucherCard}>
        <View style={styles.voucherCardLeft}>
          <View style={styles.voucherCodeBadge}>
            <Text style={styles.voucherCardCode}>{v.code}</Text>
          </View>
          <Text style={styles.voucherCardDiscount}>{discountLabel}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <Text style={styles.voucherCardMeta}>
              Còn {remaining} lượt
            </Text>
            {v.expiresAt && (
              <Text style={styles.voucherCardMeta}>
                HSD: {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
              </Text>
            )}
            {v.minOrderValue > 0 && (
              <Text style={styles.voucherCardMeta}>
                Đơn tối thiểu {v.minOrderValue.toLocaleString('vi-VN')}đ
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.voucherSelectBtn, isApplied && styles.voucherSelectBtnApplied]}
          onPress={() => applyFromList(v)}
          disabled={isApplying || isApplied}
        >
          {isApplying
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.voucherSelectBtnText}>{isApplied ? 'Đã chọn' : 'Chọn'}</Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StepIndicator steps={STEPS} current={3} />

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
        {/* ── Thông tin chuyến ── */}
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.tripSummaryCard}>
          <View style={styles.tripHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="bus" size={16} color={Colors.blueLight} style={{ marginRight: 6 }} />
              <Text style={styles.tripLabel}>{tripData?.companyName ?? 'Nhà xe'} · {draft.departureTime}</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.editBtn}>Sửa</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.routeRow}>
            <View>
              <Text style={styles.cityCode}>{draft.fromCity?.slice(0, 2).toUpperCase()}</Text>
              <Text style={styles.cityName}>{draft.fromCity}</Text>
            </View>
            <View style={styles.durationWrap}>
              <Text style={styles.durationLine}>──── ~{tripData?.durationHours ?? '?'}h ────</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cityCode}>{draft.toCity?.slice(0, 2).toUpperCase()}</Text>
              <Text style={styles.cityName}>{draft.toCity}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cube-outline" size={13} color="rgba(255,255,255,0.6)" style={{ marginRight: 5 }} />
              <Text style={styles.metaItem}>{draft.goodsType}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="scale-outline" size={13} color="rgba(255,255,255,0.6)" style={{ marginRight: 5 }} />
              <Text style={styles.metaItem}>{(draft as any).weightKg ? `${(draft as any).weightKg} kg` : WEIGHT_LABELS[draft.weightRange ?? '']}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Người gửi → Nhận ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Người gửi → Người nhận</Text>
          {[
            { label: 'Gửi', value: `${draft.senderName} · ${draft.senderPhone}` },
            { label: 'Nhận', value: `${draft.receiverName} · ${draft.receiverPhone}` },
            { label: 'Địa chỉ', value: draft.receiverAddress ?? 'Tự đến bến lấy' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Mã giảm giá ── */}
        {appliedVoucher ? (
          <View style={styles.couponApplied}>
            <View style={[styles.couponAppliedIconWrap]}>
              <Ionicons name="gift-outline" size={22} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.couponAppliedCode}>{appliedVoucher.code}</Text>
              <Text style={styles.couponAppliedSave}>
                Tiết kiệm {appliedVoucher.discount.toLocaleString('vi-VN')}đ
              </Text>
              <View style={styles.couponMeta}>
                {appliedVoucher.remainingUses > 0 ? (
                  <Text style={styles.couponMetaText}>Còn {appliedVoucher.remainingUses} lượt sau khi bạn dùng</Text>
                ) : (
                  <Text style={[styles.couponMetaText, { color: '#F59E0B' }]}>Đây là lượt sử dụng cuối cùng!</Text>
                )}
                {appliedVoucher.expiresAt && (
                  <Text style={styles.couponMetaText}>
                    · HSD: {new Date(appliedVoucher.expiresAt).toLocaleDateString('vi-VN')}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={removeVoucher} style={styles.couponRemove}>
              <Ionicons name="close-circle" size={22} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.couponTrigger} onPress={() => setPickerVisible(true)} activeOpacity={0.75}>
            <View style={styles.couponTriggerLeft}>
              <Ionicons name="gift-outline" size={20} color={Colors.blue} style={{ marginRight: 10 }} />
              <Text style={styles.couponTriggerText}>Chọn hoặc nhập mã giảm giá</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
          </TouchableOpacity>
        )}

        {/* ── Bảng giá ── */}
        <View style={styles.card}>
          {[
            { label: 'Phí vận chuyển', value: shippingFee },
            { label: `Phí dịch vụ (${draft.serviceType?.replace(/_/g, ' ')})`, value: doorFee },
            { label: 'Phí bảo hiểm', value: insuranceFee },
            ...(discount > 0 ? [{ label: `Voucher (${appliedVoucher?.code})`, value: -discount }] : []),
          ].map(({ label, value }) => (
            <View key={label} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{label}</Text>
              <Text style={[styles.priceValue, value < 0 && styles.discount]}>
                {value < 0 ? '-' : ''}{Math.abs(value).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ))}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* ── Phương thức thanh toán ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phương thức thanh toán</Text>
          <View style={styles.paymentOption}>
            <View style={styles.paymentIconWrap}>
              <Ionicons name="cash-outline" size={24} color={Colors.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.paymentLabel}>Tiền mặt tại bến</Text>
              <Text style={styles.paymentDesc}>Nộp tiền khi giao hàng cho nhà xe</Text>
            </View>
            <View style={[styles.radio, styles.radioActive]}>
              <View style={styles.radioInner} />
            </View>
          </View>
          <View style={styles.secureNote}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.success} style={{ marginRight: 5 }} />
            <Text style={styles.secureText}>Giao dịch an toàn tuyệt đối</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={`Xác nhận thanh toán · ${total.toLocaleString('vi-VN')}đ`}
          onPress={onSubmit}
          loading={isSubmitting}
          variant="success"
        />
      </View>

      {/* ── Voucher Picker Modal ── */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: insets.bottom + 24 }]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mã giảm giá</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            {/* Manual input */}
            <View style={styles.manualRow}>
              <View style={[styles.manualInputWrap, manualError ? { borderColor: Colors.error } : null]}>
                <Ionicons name="ticket-outline" size={18} color={Colors.secondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.manualInput}
                  placeholder="Nhập mã thủ công..."
                  placeholderTextColor={Colors.placeholder}
                  value={manualCode}
                  onChangeText={t => { setManualCode(t.toUpperCase()); setManualError(''); }}
                  autoCapitalize="characters"
                />
              </View>
              <TouchableOpacity
                style={[styles.manualApplyBtn, (!manualCode.trim() || manualLoading) && { opacity: 0.5 }]}
                onPress={applyManual}
                disabled={!manualCode.trim() || manualLoading}
              >
                {manualLoading
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.manualApplyText}>Áp dụng</Text>
                }
              </TouchableOpacity>
            </View>
            {manualError ? <Text style={styles.manualError}>{manualError}</Text> : null}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc chọn từ danh sách</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Voucher list */}
            {vouchersLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={Colors.blue} />
                <Text style={{ ...Typography.small, color: Colors.secondary, marginTop: 10 }}>Đang tải voucher...</Text>
              </View>
            ) : availableVouchers.length === 0 ? (
              <View style={styles.emptyVoucher}>
                <Ionicons name="gift-outline" size={40} color={Colors.border} />
                <Text style={styles.emptyVoucherText}>Bạn chưa có voucher nào</Text>
                <Text style={styles.emptyVoucherSub}>Nhập mã thủ công ở trên nếu đã có mã</Text>
              </View>
            ) : (
              <FlatList
                data={availableVouchers}
                keyExtractor={(v: any) => v.id}
                renderItem={renderVoucherCard}
                style={{ maxHeight: 340 }}
                contentContainerStyle={{ gap: 10 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tripSummaryCard: { borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, ...Shadow.blue },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tripLabel: { ...Typography.bodyBold, color: Colors.white },
  editBtn: { ...Typography.bodyBold, color: Colors.blueLight },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cityCode: { ...Typography.h2, color: Colors.white },
  cityName: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },
  durationWrap: { flex: 1, alignItems: 'center' },
  durationLine: { ...Typography.caption, color: 'rgba(255,255,255,0.5)' },
  metaRow: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  metaItem: { ...Typography.small, color: 'rgba(255,255,255,0.7)' },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, ...Shadow.md },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  infoLabel: { ...Typography.small, color: Colors.secondary, width: 60 },
  infoValue: { ...Typography.body, color: Colors.dark, flex: 1, textAlign: 'right' },

  couponTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.blue,
    ...Shadow.md,
  },
  couponTriggerLeft: { flexDirection: 'row', alignItems: 'center' },
  couponTriggerText: { ...Typography.body, color: Colors.blue },

  couponApplied: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.successBg, borderRadius: Layout.radiusLg,
    padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: Colors.success, ...Shadow.md,
  },
  couponAppliedIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.success + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  couponAppliedCode: { ...Typography.bodyBold, color: Colors.success },
  couponAppliedSave: { ...Typography.small, color: Colors.success, marginTop: 2 },
  couponMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 2 },
  couponMetaText: { ...Typography.caption, color: Colors.secondary },
  couponRemove: { padding: 4 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  priceLabel: { ...Typography.small, color: Colors.secondary },
  priceValue: { ...Typography.small, color: Colors.dark },
  discount: { color: Colors.success },
  totalRow: { borderTopWidth: 1.5, borderTopColor: Colors.border, marginTop: 6, paddingTop: 12 },
  totalLabel: { ...Typography.bodyBold, color: Colors.dark },
  totalValue: { ...Typography.price, color: Colors.blue },

  paymentOption: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.blue,
    borderRadius: Layout.radius, padding: 12, marginBottom: 8,
    backgroundColor: Colors.infoBg,
  },
  paymentIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  paymentLabel: { ...Typography.bodyBold, color: Colors.dark },
  paymentDesc: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.blue },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.blue },
  secureNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secureText: { ...Typography.small, color: Colors.success },

  footer: { padding: Layout.padding, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { ...Typography.h4, color: Colors.dark },
  modalCloseBtn: { padding: 4 },

  manualRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  manualInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radius,
    paddingHorizontal: 12, height: 48,
  },
  manualInput: { flex: 1, ...Typography.body, color: Colors.dark },
  manualApplyBtn: {
    backgroundColor: Colors.blue, borderRadius: Layout.radius,
    paddingHorizontal: 16, height: 48, alignItems: 'center', justifyContent: 'center',
  },
  manualApplyText: { ...Typography.smallBold, color: Colors.white },
  manualError: { ...Typography.small, color: Colors.error, marginBottom: 8 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, color: Colors.secondary },

  voucherCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg, borderRadius: Layout.radius,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  voucherCardLeft: { flex: 1, marginRight: 12 },
  voucherCodeBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.infoBg,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.blue + '40',
  },
  voucherCardCode: { ...Typography.smallBold, color: Colors.blue, letterSpacing: 0.5 },
  voucherCardDiscount: { ...Typography.bodyBold, color: Colors.dark },
  voucherCardMeta: { ...Typography.caption, color: Colors.secondary },
  voucherSelectBtn: {
    backgroundColor: Colors.blue, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 60, alignItems: 'center',
  },
  voucherSelectBtnApplied: { backgroundColor: Colors.success },
  voucherSelectBtnText: { ...Typography.smallBold, color: Colors.white },

  emptyVoucher: { alignItems: 'center', paddingVertical: 32 },
  emptyVoucherText: { ...Typography.bodyBold, color: Colors.dark, marginTop: 12 },
  emptyVoucherSub: { ...Typography.small, color: Colors.secondary, marginTop: 6 },
});
