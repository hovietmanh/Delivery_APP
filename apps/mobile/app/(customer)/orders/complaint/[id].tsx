import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '@services/orders.api';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const REASONS = [
  'Hàng bị hư hỏng',
  'Hàng bị mất / thiếu',
  'Giao sai hàng',
  'Thu sai phí / thu thiếu tiền thừa',
  'Nhân viên thái độ không tốt',
  'Giao hàng trễ hẹn',
  'Hàng bị ướt / bẩn',
  'Lý do khác',
];

const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:            { label: 'Chờ nhà xe xem xét',        color: Colors.warning,   icon: '⏳' },
  REVIEWING:          { label: 'Đang xem xét',               color: Colors.blue,      icon: '🔍' },
  AWAITING_BANK_INFO: { label: 'Nhà xe xác nhận lỗi — Cần gửi TK ngân hàng', color: Colors.blue, icon: '🏦' },
  AWAITING_TRANSFER:  { label: 'Chờ nhà xe chuyển tiền',    color: Colors.blue,      icon: '💰' },
  RESOLVED_REFUND:    { label: 'Đã hoàn tiền thành công',   color: Colors.success,   icon: '✅' },
  RESOLVED_REJECTED:  { label: 'Nhà xe không chịu trách nhiệm', color: Colors.secondary, icon: '❌' },
};

export default function ComplaintScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  const { data: existing, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => ordersApi.getComplaint(id),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const submitBank = useMutation({
    mutationFn: () => ordersApi.submitBankInfo(id, bankAccount.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      Alert.alert('✅ Đã gửi', 'Nhà xe sẽ chuyển tiền trong thời gian sớm nhất và thông báo cho bạn.');
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể gửi'),
  });

  const submit = useMutation({
    mutationFn: () => ordersApi.submitComplaint(id, {
      reason,
      description: description.trim(),
      requestedAmount: requestedAmount ? Number(requestedAmount) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id], exact: false });
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      Alert.alert(
        '📨 Đã gửi khiếu nại',
        'Chúng tôi sẽ xem xét và phản hồi trong vòng 24 giờ.',
        [{ text: 'OK' }],
      );
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể gửi khiếu nại'),
  });

  const onSubmit = () => {
    if (!reason) { Alert.alert('Vui lòng chọn lý do khiếu nại'); return; }
    if (description.trim().length < 10) { Alert.alert('Mô tả cần ít nhất 10 ký tự'); return; }
    Alert.alert('Xác nhận gửi khiếu nại', `Lý do: ${reason}\n\nSau khi gửi, trạng thái đơn sẽ chuyển sang "Đang tranh chấp".`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Gửi', onPress: () => submit.mutate() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={['#7F1D1D', '#991B1B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khiếu nại đơn hàng</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.secondary }}>Đang tải...</Text>
        </View>
      ) : existing ? (
        /* Đã có khiếu nại — hiển thị trạng thái */
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
          {/* Status card */}
          {(() => {
            const info = STATUS_INFO[existing.status] ?? { label: existing.status, color: Colors.secondary, icon: '📋' };
            return (
              <View style={[styles.statusCard, { borderLeftColor: info.color }]}>
                <Text style={styles.statusIcon}>{info.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
                  <Text style={styles.statusDate}>
                    Gửi lúc {new Date(existing.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Complaint detail */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Nội dung khiếu nại</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lý do</Text>
              <Text style={styles.infoValue}>{existing.reason}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Mô tả</Text>
              <Text style={[styles.infoValue, { flex: 2 }]}>{existing.description}</Text>
            </View>
            {existing.requestedAmount > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Yêu cầu bồi thường</Text>
                <Text style={[styles.infoValue, { color: Colors.error }]}>
                  {existing.requestedAmount?.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            )}
          </View>

          {/* Apology + voucher (FAULT verdict) */}
          {existing.apologyMessage && (
            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: Colors.success }]}>
              <Text style={styles.cardTitle}>✉️ Lời xin lỗi từ nhà xe</Text>
              <View style={styles.responseBox}>
                <Text style={styles.responseText}>{existing.apologyMessage}</Text>
              </View>
              {existing.apologyVoucherCode && (
                <View style={styles.voucherBox}>
                  <Text style={styles.voucherLabel}>🎁 Voucher giảm 20% dành riêng cho bạn:</Text>
                  <Text style={styles.voucherCode}>{existing.apologyVoucherCode}</Text>
                  <Text style={styles.voucherNote}>Có thể dùng cho đơn hàng tiếp theo (HSD: 30 ngày)</Text>
                </View>
              )}
            </View>
          )}

          {/* AWAITING_BANK_INFO — form nhập tài khoản */}
          {existing.status === 'AWAITING_BANK_INFO' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏦 Cung cấp tài khoản nhận tiền</Text>
              <Text style={styles.fieldSub}>Nhập đầy đủ: Tên ngân hàng — Số tài khoản — Tên chủ tài khoản</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Ví dụ: Vietcombank - 0123456789 - Nguyễn Văn A"
                placeholderTextColor={Colors.placeholder}
                value={bankAccount}
                onChangeText={setBankAccount}
              />
              <Button
                label="✅ Gửi số tài khoản"
                onPress={() => {
                  if (!bankAccount.trim()) { Alert.alert('Vui lòng nhập thông tin tài khoản'); return; }
                  submitBank.mutate();
                }}
                loading={submitBank.isPending}
                variant="success"
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          {/* AWAITING_TRANSFER */}
          {existing.status === 'AWAITING_TRANSFER' && (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingIcon}>💰</Text>
              <Text style={styles.waitingText}>Chờ nhà xe chuyển tiền</Text>
              <Text style={styles.waitingSub}>TK nhận: {existing.customerBankAccount}</Text>
              <Text style={[styles.waitingSub, { marginTop: 4 }]}>Thường trong vòng 1–3 ngày làm việc</Text>
            </View>
          )}

          {/* RESOLVED_REFUND */}
          {existing.status === 'RESOLVED_REFUND' && (
            <View style={[styles.waitingCard, { backgroundColor: Colors.successBg }]}>
              <Text style={styles.waitingIcon}>🎉</Text>
              <Text style={[styles.waitingText, { color: Colors.success }]}>Đã hoàn tiền thành công!</Text>
              <Text style={styles.waitingSub}>
                Hoàn tất lúc {existing.resolvedAt ? new Date(existing.resolvedAt).toLocaleDateString('vi-VN') : ''}
              </Text>
            </View>
          )}

          {/* NO_FAULT response */}
          {existing.resolution && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 Kết quả xem xét</Text>
              <View style={[styles.responseBox, { backgroundColor: Colors.bg }]}>
                <Text style={styles.responseText}>{existing.resolution}</Text>
              </View>
            </View>
          )}

          {/* Waiting for driver (PENDING/REVIEWING) */}
          {['PENDING', 'REVIEWING'].includes(existing.status) && (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingIcon}>⏳</Text>
              <Text style={styles.waitingText}>Đang chờ nhà xe xem xét</Text>
              <Text style={styles.waitingSub}>Thường trong vòng 24 giờ</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* Form tạo khiếu nại */
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
          {/* Warning banner */}
          <View style={styles.warnCard}>
            <Text style={styles.warnIcon}>⚠️</Text>
            <Text style={styles.warnText}>
              Sau khi gửi khiếu nại, đơn hàng sẽ chuyển sang trạng thái "Đang tranh chấp" và tài xế sẽ được thông báo để phản hồi.
            </Text>
          </View>

          {/* Reason selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lý do khiếu nại *</Text>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonRow, reason === r && styles.reasonRowActive]}
                onPress={() => setReason(r)}
              >
                <View style={[styles.radio, reason === r && styles.radioActive]}>
                  {reason === r && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mô tả chi tiết *</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Mô tả cụ thể vấn đề bạn gặp phải (tối thiểu 10 ký tự)..."
              placeholderTextColor={Colors.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>

          {/* Requested amount */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Yêu cầu bồi thường (không bắt buộc)</Text>
            <Text style={styles.fieldSub}>Để trống nếu không yêu cầu bồi thường</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Ví dụ: 500000"
              placeholderTextColor={Colors.placeholder}
              value={requestedAmount}
              onChangeText={(v) => setRequestedAmount(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
            {requestedAmount ? (
              <Text style={styles.amountPreview}>= {Number(requestedAmount).toLocaleString('vi-VN')}đ</Text>
            ) : null}
          </View>
        </ScrollView>
      )}

      {!existing && !isLoading && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            label="⚠️ Gửi khiếu nại"
            onPress={onSubmit}
            loading={submit.isPending}
            variant="danger"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 14 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerTitle: { ...Typography.h4, color: Colors.white },

  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: 16, marginBottom: 12, ...Shadow.md, borderLeftWidth: 4 },
  statusIcon: { fontSize: 28, marginRight: 14 },
  statusLabel: { ...Typography.bodyBold },
  statusDate: { ...Typography.caption, color: Colors.secondary, marginTop: 3 },

  warnCard: { flexDirection: 'row', backgroundColor: Colors.warningBg, borderRadius: Layout.radius, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  warnIcon: { fontSize: 20, marginRight: 10, marginTop: 1 },
  warnText: { ...Typography.small, color: '#92400E', flex: 1, lineHeight: 20 },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 14 },

  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  reasonRowActive: { backgroundColor: Colors.infoBg, marginHorizontal: -Layout.cardPadding, paddingHorizontal: Layout.cardPadding },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioActive: { borderColor: Colors.blue },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.blue },
  reasonText: { ...Typography.body, color: Colors.dark, flex: 1 },
  reasonTextActive: { color: Colors.blue, fontWeight: '600' },

  textarea: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 14, ...Typography.body, color: Colors.dark, minHeight: 100, textAlignVertical: 'top' },
  charCount: { ...Typography.caption, color: Colors.secondary, textAlign: 'right', marginTop: 6 },
  fieldSub: { ...Typography.small, color: Colors.secondary, marginBottom: 10 },
  amountInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 14, ...Typography.body, color: Colors.dark },
  amountPreview: { ...Typography.bodyBold, color: Colors.success, marginTop: 8 },

  infoRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  infoLabel: { ...Typography.small, color: Colors.secondary, width: 130 },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, flex: 1, textAlign: 'right' },

  responseBox: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 12 },
  responseText: { ...Typography.body, color: Colors.dark, lineHeight: 22 },
  resolvedDate: { ...Typography.caption, color: Colors.secondary, marginTop: 8 },
  voucherBox: { backgroundColor: Colors.successBg, borderRadius: Layout.radiusSm, padding: 12, marginTop: 12 },
  voucherLabel: { ...Typography.smallBold, color: Colors.success, marginBottom: 6 },
  voucherCode: { ...Typography.h3, color: Colors.success, letterSpacing: 1 },
  voucherNote: { ...Typography.caption, color: Colors.secondary, marginTop: 4 },

  waitingCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: 32, alignItems: 'center', ...Shadow.md },
  waitingIcon: { fontSize: 40, marginBottom: 12 },
  waitingText: { ...Typography.bodyBold, color: Colors.dark, marginBottom: 6 },
  waitingSub: { ...Typography.small, color: Colors.secondary },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
});
