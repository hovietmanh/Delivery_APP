import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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


export default function SendStep4() {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft, submitOrder, resetDraft, isSubmitting } = useOrderStore();

  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: string; code: string; discount: number;
    remainingUses: number; expiresAt: string | null;
  } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  const tripData = (draft as any).tripData;
  const pricePerKg = tripData?.pricePerKg ?? 45000;
  const weightKg = PRICE_PER_KG[draft.weightRange ?? 'UNDER_5KG'];
  const shippingFee = pricePerKg * weightKg;
  const doorFee = DOOR_FEE[draft.serviceType ?? 'STATION_TO_STATION'];
  const insuranceFee = draft.hasInsurance ? 5000 : 0;
  const baseTotal = shippingFee + doorFee + insuranceFee;
  const discount = appliedVoucher?.discount ?? 0;
  const total = baseTotal - discount;

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError('');
    try {
      const result = await vouchersApi.validate(voucherCode.trim().toUpperCase(), baseTotal);
      setAppliedVoucher({
        id: result.voucher.id,
        code: result.voucher.code,
        discount: result.discountAmount,
        remainingUses: result.voucher.maxUses - result.voucher.usedCount - 1, // -1 vì lượt này sắp dùng
        expiresAt: result.voucher.expiresAt ?? null,
      });
    } catch (e: any) {
      setVoucherError(e.response?.data?.message ?? 'Mã không hợp lệ');
      setAppliedVoucher(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
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
      router.replace({
        pathname: '/(customer)/payment',
        params: { orderId: order.id, trackingCode: order.trackingCode, method: paymentMethod },
      } as any);
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.message ?? 'Không thể tạo đơn hàng';
      // Voucher became invalid between apply and submit
      if (msg.includes('voucher') || msg.includes('Voucher')) {
        setAppliedVoucher(null);
        setVoucherCode('');
        setVoucherError(msg);
        Alert.alert('Voucher không hợp lệ', msg);
      } else {
        Alert.alert('Lỗi', msg);
      }
    }
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
            <Ionicons name="gift-outline" size={22} color={Colors.success} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.couponAppliedCode}>{appliedVoucher.code}</Text>
              <Text style={styles.couponAppliedSave}>
                Tiết kiệm {appliedVoucher.discount.toLocaleString('vi-VN')}đ
              </Text>
              <View style={styles.couponMeta}>
                {appliedVoucher.remainingUses > 0 ? (
                  <Text style={styles.couponMetaText}>
                    Còn {appliedVoucher.remainingUses} lượt sau khi bạn dùng
                  </Text>
                ) : (
                  <Text style={[styles.couponMetaText, { color: '#F59E0B' }]}>
                    Đây là lượt sử dụng cuối cùng!
                  </Text>
                )}
                {appliedVoucher.expiresAt && (
                  <Text style={styles.couponMetaText}>
                    · HSD: {new Date(appliedVoucher.expiresAt).toLocaleDateString('vi-VN')}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={removeVoucher} style={styles.couponRemove}>
              <Ionicons name="close-circle" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.couponRow}>
            <Ionicons name="gift-outline" size={20} color={Colors.secondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.couponInput}
              placeholder="Nhập mã giảm giá..."
              placeholderTextColor={Colors.secondary}
              value={voucherCode}
              onChangeText={t => { setVoucherCode(t.toUpperCase()); setVoucherError(''); }}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.couponBtn, !voucherCode.trim() && { opacity: 0.5 }]}
              onPress={applyVoucher}
              disabled={!voucherCode.trim() || voucherLoading}
            >
              {voucherLoading
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={styles.couponBtnText}>Áp dụng</Text>
              }
            </TouchableOpacity>
          </View>
        )}
        {voucherError ? (
          <Text style={styles.couponError}>{voucherError}</Text>
        ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  tripSummaryCard: {
    borderRadius: Layout.radiusLg,
    padding: Layout.cardPadding, marginBottom: 10, ...Shadow.blue,
  },
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

  couponRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border,
  },
  couponInput: { ...Typography.body, color: Colors.dark, flex: 1, paddingVertical: 4 },
  couponBtn: {
    backgroundColor: Colors.blue, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  couponBtnText: { ...Typography.smallBold, color: Colors.white },
  couponError: { ...Typography.small, color: Colors.error ?? '#EF4444', marginBottom: 10, paddingHorizontal: 4 },
  couponApplied: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.successBg ?? '#F0FDF4', borderRadius: Layout.radiusLg,
    padding: 14, marginBottom: 4,
    borderWidth: 1.5, borderColor: Colors.success,
  },
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
});
