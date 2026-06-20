import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Animated, Easing, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
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

type StatusInfo = { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] };

const STATUS_INFO: Record<string, StatusInfo> = {
  PENDING:            { label: 'Chờ nhà xe xem xét',                         color: Colors.warning,   icon: 'time-outline' },
  REVIEWING:          { label: 'Đang xem xét',                                color: Colors.blue,      icon: 'search-outline' },
  AWAITING_BANK_INFO: { label: 'Nhà xe xác nhận lỗi — Cần gửi TK ngân hàng', color: Colors.blue,      icon: 'card-outline' },
  AWAITING_TRANSFER:  { label: 'Chờ nhà xe chuyển tiền',                     color: Colors.blue,      icon: 'cash-outline' },
  RESOLVED_REFUND:    { label: 'Đã hoàn tiền thành công',                    color: Colors.success,   icon: 'checkmark-circle-outline' },
  RESOLVED_REJECTED:  { label: 'Nhà xe không chịu trách nhiệm',              color: Colors.secondary, icon: 'close-circle-outline' },
};

function CardTitle({ icon, label, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color?: string }) {
  return (
    <View style={styles.cardTitleRow}>
      <Ionicons name={icon} size={18} color={color ?? Colors.dark} style={{ marginRight: 8 }} />
      <Text style={[styles.cardTitle, color ? { color } : null]}>{label}</Text>
    </View>
  );
}

export default function ComplaintScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (!existing?.aiVerdict) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinAnim.setValue(0);
    }
  }, [existing?.aiVerdict]);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => ordersApi.getComplaint(id),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const dispute = useMutation({
    mutationFn: () => ordersApi.disputeAiResult(id, disputeReason),
    onSuccess: () => {
      setDisputeVisible(false);
      setDisputeReason('');
      Alert.alert('Đã ghi nhận', 'Nhà xe sẽ nhận được thông báo và xem xét lại khiếu nại của bạn.');
    },
    onError: () => Alert.alert('Lỗi', 'Không thể gửi phản đối'),
  });

  const reanalyze = useMutation({
    mutationFn: () => ordersApi.reanalyzeComplaint(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      Alert.alert('Đã kích hoạt lại', 'AI đang phân tích ảnh, kết quả sẽ có sau ít phút.');
    },
    onError: () => Alert.alert('Lỗi', 'Không thể kích hoạt phân tích AI'),
  });

  const submitBank = useMutation({
    mutationFn: () => ordersApi.submitBankInfo(id, bankAccount.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      Alert.alert('Đã gửi', 'Nhà xe sẽ chuyển tiền trong thời gian sớm nhất và thông báo cho bạn.');
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể gửi'),
  });

  const submit = useMutation({
    mutationFn: () => ordersApi.submitComplaint(id, {
      reason,
      description: description.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id], exact: false });
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      Alert.alert('Đã gửi khiếu nại', 'Chúng tôi sẽ xem xét và phản hồi trong vòng 24 giờ.', [{ text: 'OK' }]);
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

  const verdictColor = existing?.aiVerdict === 'DAMAGED' ? Colors.error : existing?.aiVerdict === 'NOT_DAMAGED' ? Colors.success : Colors.warning;
  const verdictIcon: React.ComponentProps<typeof Ionicons>['name'] =
    existing?.aiVerdict === 'DAMAGED' ? 'alert-circle-outline' :
    existing?.aiVerdict === 'NOT_DAMAGED' ? 'checkmark-circle-outline' :
    'help-circle-outline';
  const verdictLabel =
    existing?.aiVerdict === 'DAMAGED' ? 'Có dấu hiệu hư hỏng' :
    existing?.aiVerdict === 'NOT_DAMAGED' ? 'Không phát hiện hư hỏng' :
    'Cần xem xét thêm';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient colors={['#7F1D1D', '#991B1B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khiếu nại đơn hàng</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      ) : existing ? (
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
          {/* Status card */}
          {(() => {
            const info: StatusInfo = STATUS_INFO[existing.status] ?? { label: existing.status, color: Colors.secondary, icon: 'document-outline' };
            return (
              <View style={[styles.statusCard, { borderLeftColor: info.color }]}>
                <View style={[styles.statusIconWrap, { backgroundColor: info.color + '18' }]}>
                  <Ionicons name={info.icon} size={26} color={info.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
                  <Text style={styles.statusDate}>
                    Gửi lúc {new Date(existing.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* AI Verdict */}
          {existing.aiVerdict ? (
            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: verdictColor }]}>
              <CardTitle icon="hardware-chip-outline" label="Phân tích AI" />
              <View style={styles.aiRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={verdictIcon} size={16} color={verdictColor} />
                  <Text style={[styles.aiVerdictText, { color: verdictColor }]}>{verdictLabel}</Text>
                </View>
                <Text style={styles.aiConfidence}>
                  Độ tin cậy: {Math.round((existing.aiConfidence ?? 0) * 100)}%
                </Text>
              </View>
              {existing.aiReason ? <Text style={styles.aiReason}>{existing.aiReason}</Text> : null}

              <View style={styles.aiActions}>
                {(existing.aiConfidence === 0 || existing.aiVerdict === 'UNCERTAIN') && (
                  <TouchableOpacity style={styles.reanalyzeBtn} onPress={() => reanalyze.mutate()} disabled={reanalyze.isPending}>
                    <Ionicons name={reanalyze.isPending ? 'hourglass-outline' : 'refresh-outline'} size={15} color={Colors.blue} style={{ marginRight: 6 }} />
                    <Text style={styles.reanalyzeBtnText}>
                      {reanalyze.isPending ? 'Đang phân tích...' : 'Phân tích lại'}
                    </Text>
                  </TouchableOpacity>
                )}
                {['PENDING', 'REVIEWING'].includes(existing.status) && (
                  <TouchableOpacity style={styles.disputeBtn} onPress={() => setDisputeVisible(true)}>
                    <Ionicons name="hand-left-outline" size={15} color={Colors.warning} style={{ marginRight: 6 }} />
                    <Text style={styles.disputeBtnText}>Không đồng ý với AI</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 28 }]}>
              <Animated.View style={{ marginBottom: 12, transform: [{ rotate: spin }] }}>
                <Ionicons name="hardware-chip-outline" size={40} color={Colors.blue} />
              </Animated.View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ActivityIndicator size="small" color={Colors.blue} />
                <Text style={{ ...Typography.bodyBold, color: Colors.dark }}>AI đang phân tích ảnh...</Text>
              </View>
              <Text style={{ ...Typography.small, color: Colors.secondary, textAlign: 'center', lineHeight: 20 }}>
                Hệ thống đang so sánh ảnh hàng{'\n'}lúc lên xe và khi giao. Kết quả sẽ có sau ít phút.
              </Text>
              <TouchableOpacity style={[styles.reanalyzeBtn, { marginTop: 16 }]} onPress={() => reanalyze.mutate()} disabled={reanalyze.isPending}>
                <Ionicons name={reanalyze.isPending ? 'hourglass-outline' : 'play-circle-outline'} size={15} color={Colors.blue} style={{ marginRight: 6 }} />
                <Text style={styles.reanalyzeBtnText}>
                  {reanalyze.isPending ? 'Đang phân tích...' : 'Kích hoạt phân tích'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Modal không đồng ý */}
          <Modal visible={disputeVisible} transparent animationType="slide" onRequestClose={() => setDisputeVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="hand-left-outline" size={20} color={Colors.warning} style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTitle, { color: Colors.warning }]}>Không đồng ý với kết quả AI</Text>
                </View>
                <Text style={styles.modalSub}>
                  Mô tả lý do bạn không đồng ý. Nhà xe sẽ được thông báo và xem xét lại thủ công.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Hàng thực sự bị vỡ, AI phân tích sai vì ảnh mờ..."
                  placeholderTextColor={Colors.placeholder}
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  multiline
                  numberOfLines={3}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDisputeVisible(false)}>
                    <Text style={styles.modalCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSendBtn, (!disputeReason.trim() || dispute.isPending) && { opacity: 0.5 }]}
                    onPress={() => {
                      if (!disputeReason.trim()) { Alert.alert('Vui lòng nhập lý do'); return; }
                      dispute.mutate();
                    }}
                    disabled={!disputeReason.trim() || dispute.isPending}
                  >
                    <Text style={styles.modalSendText}>{dispute.isPending ? 'Đang gửi...' : 'Gửi phản đối'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Nội dung khiếu nại */}
          <View style={styles.card}>
            <CardTitle icon="document-text-outline" label="Nội dung khiếu nại" />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lý do</Text>
              <Text style={styles.infoValue}>{existing.reason}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Mô tả</Text>
              <Text style={[styles.infoValue, { flex: 2 }]}>{existing.description}</Text>
            </View>
          </View>

          {/* Lời xin lỗi từ nhà xe */}
          {existing.apologyMessage && (
            <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: Colors.success }]}>
              <CardTitle icon="mail-open-outline" label="Lời xin lỗi từ nhà xe" color={Colors.success} />
              <View style={styles.responseBox}>
                <Text style={styles.responseText}>{existing.apologyMessage}</Text>
              </View>
              {existing.apologyVoucherCode && (
                <View style={styles.voucherBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="gift-outline" size={15} color={Colors.success} />
                    <Text style={styles.voucherLabel}>Voucher giảm 20% dành riêng cho bạn:</Text>
                  </View>
                  <Text style={styles.voucherCode}>{existing.apologyVoucherCode}</Text>
                  <Text style={styles.voucherNote}>Có thể dùng cho đơn hàng tiếp theo (HSD: 30 ngày)</Text>
                </View>
              )}
            </View>
          )}

          {/* AWAITING_BANK_INFO */}
          {existing.status === 'AWAITING_BANK_INFO' && (
            <View style={styles.card}>
              <CardTitle icon="card-outline" label="Cung cấp tài khoản nhận tiền" color={Colors.blue} />
              <Text style={styles.fieldSub}>Nhập đầy đủ: Tên ngân hàng — Số tài khoản — Tên chủ tài khoản</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Ví dụ: Vietcombank - 0123456789 - Nguyễn Văn A"
                placeholderTextColor={Colors.placeholder}
                value={bankAccount}
                onChangeText={setBankAccount}
              />
              <Button
                label="Gửi số tài khoản"
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
              <View style={[styles.waitingIconWrap, { backgroundColor: Colors.infoBg }]}>
                <Ionicons name="cash-outline" size={36} color={Colors.blue} />
              </View>
              <Text style={styles.waitingText}>Chờ nhà xe chuyển tiền</Text>
              <Text style={styles.waitingSub}>TK nhận: {existing.customerBankAccount}</Text>
              <Text style={[styles.waitingSub, { marginTop: 4 }]}>Thường trong vòng 1–3 ngày làm việc</Text>
            </View>
          )}

          {/* RESOLVED_REFUND */}
          {existing.status === 'RESOLVED_REFUND' && (
            <View style={[styles.waitingCard, { backgroundColor: Colors.successBg }]}>
              <View style={[styles.waitingIconWrap, { backgroundColor: Colors.success + '22' }]}>
                <Ionicons name="checkmark-circle-outline" size={36} color={Colors.success} />
              </View>
              <Text style={[styles.waitingText, { color: Colors.success }]}>Đã hoàn tiền thành công!</Text>
              <Text style={styles.waitingSub}>
                Hoàn tất lúc {existing.resolvedAt ? new Date(existing.resolvedAt).toLocaleDateString('vi-VN') : ''}
              </Text>
            </View>
          )}

          {/* Kết quả xem xét */}
          {existing.resolution && (
            <View style={styles.card}>
              <CardTitle icon="clipboard-outline" label="Kết quả xem xét" />
              <View style={[styles.responseBox, { backgroundColor: Colors.bg }]}>
                <Text style={styles.responseText}>{existing.resolution}</Text>
              </View>
            </View>
          )}

          {/* Waiting for driver (PENDING/REVIEWING) */}
          {['PENDING', 'REVIEWING'].includes(existing.status) && (
            <View style={styles.waitingCard}>
              <View style={[styles.waitingIconWrap, { backgroundColor: Colors.warningBg }]}>
                <Ionicons name="time-outline" size={36} color={Colors.warning} />
              </View>
              <Text style={styles.waitingText}>Đang chờ nhà xe xem xét</Text>
              <Text style={styles.waitingSub}>Thường trong vòng 24 giờ</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* Form tạo khiếu nại */
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          {/* Warning banner */}
          <View style={styles.warnCard}>
            <Ionicons name="warning-outline" size={20} color={Colors.warning} style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={styles.warnText}>
              Sau khi gửi khiếu nại, đơn hàng sẽ chuyển sang trạng thái "Đang tranh chấp" và tài xế sẽ được thông báo để phản hồi.
            </Text>
          </View>

          {/* Reason selection */}
          <View style={styles.card}>
            <CardTitle icon="list-outline" label="Lý do khiếu nại *" />
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
            <CardTitle icon="create-outline" label="Mô tả chi tiết *" />
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

        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {!existing && !isLoading && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            label="Gửi khiếu nại"
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
  statusIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  statusLabel: { ...Typography.bodyBold },
  statusDate: { ...Typography.caption, color: Colors.secondary, marginTop: 3 },

  warnCard: { flexDirection: 'row', backgroundColor: Colors.warningBg, borderRadius: Layout.radius, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: Colors.warning, alignItems: 'flex-start' },
  warnText: { ...Typography.small, color: '#92400E', flex: 1, lineHeight: 20 },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle: { ...Typography.h4, color: Colors.dark },

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
  infoRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  infoLabel: { ...Typography.small, color: Colors.secondary, width: 130 },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, flex: 1, textAlign: 'right' },

  responseBox: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 12 },
  responseText: { ...Typography.body, color: Colors.dark, lineHeight: 22 },
  voucherBox: { backgroundColor: Colors.successBg, borderRadius: Layout.radiusSm, padding: 12, marginTop: 12 },
  voucherLabel: { ...Typography.smallBold, color: Colors.success },
  voucherCode: { ...Typography.h3, color: Colors.success, letterSpacing: 1 },
  voucherNote: { ...Typography.caption, color: Colors.secondary, marginTop: 4 },

  aiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  aiVerdictText: { ...Typography.smallBold },
  aiConfidence: { ...Typography.caption, color: Colors.secondary },
  aiReason: { ...Typography.small, color: Colors.dark, lineHeight: 20, backgroundColor: Colors.bg, borderRadius: 8, padding: 10, marginBottom: 8 },
  aiActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, justifyContent: 'center' },
  reanalyzeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.infoBg, borderRadius: 20, borderWidth: 1, borderColor: Colors.blue },
  reanalyzeBtnText: { ...Typography.smallBold, color: Colors.blue },
  disputeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.warningBg, borderRadius: 20, borderWidth: 1, borderColor: Colors.warning },
  disputeBtnText: { ...Typography.smallBold, color: Colors.warning },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { ...Typography.h4 },
  modalSub: { ...Typography.small, color: Colors.secondary, lineHeight: 20, marginBottom: 14 },
  modalInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 12, ...Typography.body, color: Colors.dark, minHeight: 80, textAlignVertical: 'top' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: Layout.radius, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { ...Typography.bodyBold, color: Colors.secondary },
  modalSendBtn: { flex: 2, paddingVertical: 12, borderRadius: Layout.radius, backgroundColor: Colors.warning, alignItems: 'center' },
  modalSendText: { ...Typography.bodyBold, color: Colors.white },

  waitingCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: 32, alignItems: 'center', ...Shadow.md },
  waitingIconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  waitingText: { ...Typography.bodyBold, color: Colors.dark, marginBottom: 6 },
  waitingSub: { ...Typography.small, color: Colors.secondary },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
});
