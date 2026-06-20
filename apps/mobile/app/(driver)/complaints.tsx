import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Image, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverApi } from '@services/driver.api';
import { ordersApi } from '@services/orders.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';
import { Button } from '@components/ui/Button';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_INFO: Record<string, { label: string; color: string; icon: IoniconsName }> = {
  PENDING:            { label: 'Chờ xử lý',                    color: Colors.warning,   icon: 'time-outline' },
  REVIEWING:          { label: 'Đang xem xét',                  color: Colors.blue,      icon: 'search-outline' },
  AWAITING_BANK_INFO: { label: 'Chờ khách gửi TK ngân hàng',   color: Colors.blue,      icon: 'business-outline' },
  AWAITING_TRANSFER:  { label: 'Cần chuyển tiền',               color: Colors.warning,   icon: 'cash-outline' },
  RESOLVED_REFUND:    { label: 'Đã hoàn tiền',                  color: Colors.success,   icon: 'checkmark-circle' },
  RESOLVED_REJECTED:  { label: 'Không chịu trách nhiệm',        color: Colors.secondary, icon: 'close-circle' },
};

function PhotosSection({ title, icon, photos }: { title: string; icon: IoniconsName; photos: string[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!photos?.length) return null;
  return (
    <View style={styles.photoSection}>
      <View style={styles.photoSectionTitleRow}>
        <Ionicons name={icon} size={15} color={Colors.secondary} style={{ marginRight: 6 }} />
        <Text style={styles.photoSectionTitle}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {photos.map((uri, i) => (
          <TouchableOpacity key={i} onPress={() => setPreview(uri)}>
            <Image source={{ uri }} style={styles.thumb} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!preview} transparent onRequestClose={() => setPreview(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreview(null)}>
          <Image source={{ uri: preview! }} style={styles.previewImg} resizeMode="contain" />
          <View style={styles.previewCloseBtn}>
            <Ionicons name="close" size={18} color={Colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.previewClose}>Đóng</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function ComplaintCard({ complaint, qc }: { complaint: any; qc: any }) {
  const [showForm, setShowForm] = useState(false);
  const [verdict, setVerdict] = useState<'FAULT' | 'NO_FAULT' | null>(null);
  const [message, setMessage] = useState('');

  const orderId = complaint.order?.id;
  const status = complaint.status as string;
  const info = STATUS_INFO[status] ?? { label: status, color: Colors.secondary, icon: 'document-outline' as IoniconsName };

  const resolve = useMutation({
    mutationFn: () => ordersApi.resolveComplaint(orderId, { verdict: verdict!, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-complaints'] });
      setShowForm(false);
      setMessage('');
      Alert.alert('Đã xử lý', verdict === 'FAULT'
        ? 'Đã gửi lời xin lỗi và tạo voucher cho khách. Chờ khách gửi số tài khoản.'
        : 'Đã gửi kết quả — không chịu trách nhiệm.');
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể xử lý'),
  });

  const confirmTransfer = useMutation({
    mutationFn: () => ordersApi.confirmTransfer(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-complaints'] });
      Alert.alert('Hoàn tất', 'Đã xác nhận chuyển tiền. Khiếu nại đã được đóng.');
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể xác nhận'),
  });

  const onResolve = () => {
    if (!verdict) { Alert.alert('Vui lòng chọn kết quả xử lý'); return; }
    if (!message.trim()) { Alert.alert('Vui lòng nhập nội dung phản hồi'); return; }
    const confirmTitle = verdict === 'FAULT' ? 'Xác nhận lỗi thuộc nhà xe?' : 'Xác nhận không chịu trách nhiệm?';
    const confirmMsg = verdict === 'FAULT'
      ? 'Hệ thống sẽ tạo voucher giảm 20% cho khách và yêu cầu họ cung cấp số tài khoản hoàn tiền.'
      : 'Khách sẽ được thông báo kết quả. Đơn hàng sẽ được đóng.';
    Alert.alert(confirmTitle, confirmMsg, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: () => resolve.mutate() },
    ]);
  };

  const onConfirmTransfer = () => {
    Alert.alert(
      'Xác nhận đã chuyển tiền?',
      `Tài khoản nhận:\n${complaint.customerBankAccount}\n\nSau khi xác nhận, khiếu nại sẽ được đóng.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đã chuyển', onPress: () => confirmTransfer.mutate() },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.orderCode}>{complaint.order?.trackingCode}</Text>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={13} color={Colors.secondary} style={{ marginRight: 5 }} />
            <Text style={styles.customerInfo}>
              {complaint.customer?.user?.fullName} · {complaint.customer?.user?.phone}
            </Text>
          </View>
          <View style={styles.customerRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.placeholder} style={{ marginRight: 5 }} />
            <Text style={styles.dateText}>{new Date(complaint.createdAt).toLocaleDateString('vi-VN')}</Text>
          </View>
        </View>
        <View style={[styles.statusChip, { backgroundColor: info.color + '20' }]}>
          <Ionicons name={info.icon} size={14} color={info.color} />
          <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>

      {/* Nội dung khiếu nại */}
      <View style={styles.complaintBox}>
        <View style={styles.complaintLabelRow}>
          <Ionicons name="warning-outline" size={15} color={Colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.complaintLabel}>Lý do: {complaint.reason}</Text>
        </View>
        <Text style={styles.complaintDesc}>{complaint.description}</Text>
      </View>

      {/* AI Verdict */}
      {complaint.aiVerdict ? (() => {
        const isDamaged = complaint.aiVerdict === 'DAMAGED';
        const isOk = complaint.aiVerdict === 'NOT_DAMAGED';
        const accentColor = isDamaged ? Colors.error : isOk ? Colors.success : Colors.warning;
        const verdictIcon: IoniconsName = isDamaged ? 'warning' : isOk ? 'checkmark-circle' : 'help-circle';
        const verdictLabel = isDamaged ? 'Phát hiện hư hỏng' : isOk ? 'Không phát hiện hư hỏng' : 'Chưa xác định rõ';
        return (
          <View style={[styles.aiCard, { borderLeftColor: accentColor }]}>
            <View style={styles.aiCardHeader}>
              <View style={styles.aiTitleRow}>
                <View style={[styles.aiIconWrap, { backgroundColor: Colors.infoBg }]}>
                  <Ionicons name="hardware-chip-outline" size={14} color={Colors.blue} />
                </View>
                <Text style={styles.aiCardTitle}>Kết quả AI</Text>
              </View>
              <Text style={styles.aiConfidenceText}>
                Tin cậy: {Math.round((complaint.aiConfidence ?? 0) * 100)}%
              </Text>
            </View>
            <View style={styles.aiVerdictRow}>
              <Ionicons name={verdictIcon} size={16} color={accentColor} style={{ marginRight: 6 }} />
              <Text style={[styles.aiVerdictText, { color: accentColor }]}>{verdictLabel}</Text>
            </View>
            {complaint.aiReason ? <Text style={styles.aiReasonText}>{complaint.aiReason}</Text> : null}
          </View>
        );
      })() : (
        <View style={styles.aiPendingCard}>
          <ActivityIndicator size="small" color={Colors.blue} />
          <Text style={styles.aiPendingText}>AI đang phân tích ảnh...</Text>
        </View>
      )}

      {/* Photos */}
      <PhotosSection
        title="Ảnh khi nhận hàng tại bến"
        icon="image-outline"
        photos={complaint.order?.pickupPhotos ?? []}
      />
      <PhotosSection
        title="Ảnh khi giao hàng cho khách"
        icon="camera-outline"
        photos={complaint.order?.deliveryPhotos ?? []}
      />

      {/* Đã có phản hồi */}
      {complaint.apologyMessage && (
        <View style={[styles.responseBlock, { borderLeftColor: Colors.warning }]}>
          <View style={styles.responseLabelRow}>
            <Ionicons name="mail-outline" size={14} color={Colors.warning} style={{ marginRight: 6 }} />
            <Text style={styles.responseLabel}>Lời xin lỗi đã gửi:</Text>
          </View>
          <Text style={styles.responseText}>{complaint.apologyMessage}</Text>
          {complaint.apologyVoucherCode && (
            <View style={styles.voucherRow}>
              <Ionicons name="gift-outline" size={14} color={Colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.voucherInfo}>Voucher đã tạo: {complaint.apologyVoucherCode} (giảm 20%)</Text>
            </View>
          )}
        </View>
      )}
      {complaint.resolution && (
        <View style={[styles.responseBlock, { borderLeftColor: Colors.secondary }]}>
          <View style={styles.responseLabelRow}>
            <Ionicons name="document-text-outline" size={14} color={Colors.secondary} style={{ marginRight: 6 }} />
            <Text style={styles.responseLabel}>Phản hồi đã gửi:</Text>
          </View>
          <Text style={styles.responseText}>{complaint.resolution}</Text>
        </View>
      )}

      {/* Cần chuyển tiền */}
      {status === 'AWAITING_TRANSFER' && complaint.customerBankAccount && (
        <View style={styles.bankBox}>
          <View style={styles.bankLabelRow}>
            <Ionicons name="business-outline" size={16} color={Colors.blue} style={{ marginRight: 8 }} />
            <Text style={styles.bankLabel}>Tài khoản nhận tiền của khách:</Text>
          </View>
          <Text style={styles.bankValue}>{complaint.customerBankAccount}</Text>
          <Button
            label="Đã chuyển tiền — Hoàn tất"
            onPress={onConfirmTransfer}
            variant="success"
            loading={confirmTransfer.isPending}
            style={{ marginTop: 10 }}
          />
        </View>
      )}

      {/* Chờ TK ngân hàng */}
      {status === 'AWAITING_BANK_INFO' && (
        <View style={styles.waitingBox}>
          <Ionicons name="time-outline" size={16} color={Colors.warning} style={{ marginRight: 8 }} />
          <Text style={styles.waitingText}>Đang chờ khách cung cấp số tài khoản ngân hàng...</Text>
        </View>
      )}

      {/* Form xử lý */}
      {(status === 'PENDING' || status === 'REVIEWING') && (
        showForm ? (
          <View style={styles.resolveForm}>
            <Text style={styles.resolveTitle}>Kết quả xử lý khiếu nại</Text>

            <View style={styles.verdictRow}>
              <TouchableOpacity
                style={[styles.verdictBtn, styles.verdictFaultBase, verdict === 'FAULT' && styles.verdictFaultActive]}
                onPress={() => {
                  setVerdict('FAULT');
                  setMessage('Kính gửi Quý khách, nhà xe xin chân thành xin lỗi về sự cố xảy ra với đơn hàng của bạn. Chúng tôi xác nhận trách nhiệm và sẽ thực hiện hoàn tiền trong thời gian sớm nhất.');
                }}
              >
                <View style={[styles.verdictIconWrap, { backgroundColor: verdict === 'FAULT' ? Colors.error + '25' : Colors.errorBg }]}>
                  <Ionicons name="alert-circle" size={24} color={Colors.error} />
                </View>
                <Text style={[styles.verdictBtnText, { color: Colors.error }]}>Hàng có vấn đề</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verdictBtn, styles.verdictNoFaultBase, verdict === 'NO_FAULT' && styles.verdictNoFaultActive]}
                onPress={() => {
                  setVerdict('NO_FAULT');
                  setMessage('Sau khi đối chiếu với ảnh ghi nhận khi nhận hàng và khi giao hàng, chúng tôi xác định hàng hóa không có vấn đề. Nhà xe không chịu trách nhiệm về khiếu nại này.');
                }}
              >
                <View style={[styles.verdictIconWrap, { backgroundColor: verdict === 'NO_FAULT' ? Colors.success + '25' : Colors.successBg }]}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                </View>
                <Text style={[styles.verdictBtnText, { color: Colors.success }]}>Không có vấn đề</Text>
              </TouchableOpacity>
            </View>

            {verdict && (
              <>
                <View style={styles.msgLabelRow}>
                  <Ionicons
                    name={verdict === 'FAULT' ? 'mail-outline' : 'document-text-outline'}
                    size={15} color={Colors.secondary} style={{ marginRight: 6 }}
                  />
                  <Text style={styles.msgLabel}>
                    {verdict === 'FAULT' ? 'Lời xin lỗi gửi khách:' : 'Phản hồi gửi khách:'}
                  </Text>
                </View>
                <TextInput
                  style={styles.textarea}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  placeholder="Nhập nội dung..."
                  placeholderTextColor={Colors.placeholder}
                />
                {verdict === 'FAULT' && (
                  <View style={styles.infoNote}>
                    <Ionicons name="information-circle-outline" size={15} color={Colors.blue} style={{ marginRight: 6, marginTop: 1 }} />
                    <Text style={styles.infoNoteText}>
                      Hệ thống sẽ tự động tạo voucher giảm 20% dành riêng cho khách này và yêu cầu họ cung cấp số tài khoản để hoàn tiền.
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button label="Hủy" onPress={() => { setShowForm(false); setVerdict(null); }} variant="outline" style={{ flex: 1 }} />
              <Button label="Gửi kết quả" onPress={onResolve} loading={resolve.isPending} style={{ flex: 2 }} />
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.openFormBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.blue} style={{ marginRight: 8 }} />
            <Text style={styles.openFormText}>Xem xét & Xử lý khiếu nại</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['driver-complaints'],
    queryFn: driverApi.getComplaints,
    refetchInterval: 30_000,
  });

  const pending = complaints.filter((c: any) => ['PENDING', 'REVIEWING', 'AWAITING_TRANSFER'].includes(c.status)).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Khiếu nại</Text>
            <Text style={styles.headerSub}>Quản lý phản hồi từ khách hàng</Text>
          </View>
          {pending > 0 && (
            <View style={styles.countChip}>
              <Ionicons name="alert-circle" size={14} color={Colors.error} style={{ marginRight: 5 }} />
              <Text style={styles.countText}>{pending} cần xử lý</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="checkmark-circle-outline" size={44} color={Colors.success} />
          </View>
          <Text style={styles.emptyText}>Không có khiếu nại nào</Text>
          <Text style={styles.emptyDesc}>Tất cả đơn hàng đang được xử lý tốt</Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => <ComplaintCard complaint={item} qc={qc} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Layout.padding, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { ...Typography.h3, color: Colors.white },
  headerSub: { ...Typography.caption, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  countChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  countText: { ...Typography.smallBold, color: Colors.error },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderCode: { ...Typography.bodyBold, color: Colors.navy, marginBottom: 4 },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  customerInfo: { ...Typography.small, color: Colors.dark },
  dateText: { ...Typography.caption, color: Colors.secondary },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: 'center', gap: 4 },
  statusText: { ...Typography.smallBold },

  complaintBox: { backgroundColor: Colors.errorBg, borderRadius: Layout.radiusSm, padding: 12, marginBottom: 12 },
  complaintLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  complaintLabel: { ...Typography.smallBold, color: Colors.error },
  complaintDesc: { ...Typography.small, color: Colors.dark, lineHeight: 20 },

  photoSection: { marginBottom: 12 },
  photoSectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  photoSectionTitle: { ...Typography.smallBold, color: Colors.secondary },
  thumb: { width: 90, height: 90, borderRadius: Layout.radiusSm, backgroundColor: Colors.bg },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '95%', height: '80%' },
  previewCloseBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  previewClose: { ...Typography.bodyBold, color: Colors.white },

  responseBlock: { borderLeftWidth: 3, borderRadius: Layout.radiusSm, backgroundColor: Colors.bg, padding: 10, marginBottom: 10 },
  responseLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  responseLabel: { ...Typography.smallBold, color: Colors.secondary },
  responseText: { ...Typography.small, color: Colors.dark, lineHeight: 20 },
  voucherRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  voucherInfo: { ...Typography.smallBold, color: Colors.success },

  bankBox: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 14, marginBottom: 10 },
  bankLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  bankLabel: { ...Typography.smallBold, color: Colors.blue },
  bankValue: { ...Typography.bodyBold, color: Colors.dark },

  waitingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningBg, borderRadius: Layout.radiusSm, padding: 12, marginBottom: 10 },
  waitingText: { ...Typography.small, color: Colors.warning, flex: 1 },

  aiCard: { borderLeftWidth: 3, borderRadius: Layout.radiusSm, backgroundColor: Colors.bg, padding: 12, marginBottom: 12 },
  aiCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  aiCardTitle: { ...Typography.smallBold, color: Colors.secondary },
  aiConfidenceText: { ...Typography.caption, color: Colors.secondary },
  aiVerdictRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  aiVerdictText: { ...Typography.bodyBold },
  aiReasonText: { ...Typography.small, color: Colors.dark, lineHeight: 18 },
  aiPendingCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 10, marginBottom: 12 },
  aiPendingText: { ...Typography.small, color: Colors.blue },

  openFormBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.infoBg, borderRadius: Layout.radius, padding: 12, marginTop: 4 },
  openFormText: { ...Typography.bodyBold, color: Colors.blue },

  resolveForm: { marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 14 },
  resolveTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 12 },
  verdictRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  verdictBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 12, alignItems: 'center', gap: 6 },
  verdictFaultBase: { borderColor: Colors.error + '60', backgroundColor: Colors.errorBg },
  verdictFaultActive: { borderColor: Colors.error, backgroundColor: Colors.error + '15' },
  verdictNoFaultBase: { borderColor: Colors.success + '60', backgroundColor: Colors.successBg },
  verdictNoFaultActive: { borderColor: Colors.success, backgroundColor: Colors.success + '15' },
  verdictIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verdictBtnText: { ...Typography.smallBold, color: Colors.secondary, textAlign: 'center' },
  msgLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  msgLabel: { ...Typography.smallBold, color: Colors.dark },
  textarea: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 12, ...Typography.body, color: Colors.dark, minHeight: 90, textAlignVertical: 'top' },
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 10, marginTop: 8 },
  infoNoteText: { ...Typography.caption, color: Colors.blue, lineHeight: 18, flex: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { ...Typography.h4, color: Colors.dark, marginBottom: 6, textAlign: 'center' },
  emptyDesc: { ...Typography.body, color: Colors.secondary, textAlign: 'center' },
});
