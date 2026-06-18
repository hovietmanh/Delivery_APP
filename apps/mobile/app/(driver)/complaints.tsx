import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Image, Modal, FlatList,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverApi } from '@services/driver.api';
import { ordersApi } from '@services/orders.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';
import { Button } from '@components/ui/Button';

const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:            { label: 'Chờ xử lý',            color: Colors.warning,   icon: '⏳' },
  REVIEWING:          { label: 'Đang xem xét',          color: Colors.blue,      icon: '🔍' },
  AWAITING_BANK_INFO: { label: 'Chờ khách gửi TK ngân hàng', color: Colors.blue, icon: '🏦' },
  AWAITING_TRANSFER:  { label: 'Cần chuyển tiền',       color: Colors.warning,   icon: '💸' },
  RESOLVED_REFUND:    { label: 'Đã hoàn tiền',          color: Colors.success,   icon: '✅' },
  RESOLVED_REJECTED:  { label: 'Không chịu trách nhiệm', color: Colors.secondary, icon: '❌' },
};

function PhotosSection({ title, photos }: { title: string; photos: string[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!photos?.length) return null;
  return (
    <View style={styles.photoSection}>
      <Text style={styles.photoSectionTitle}>{title}</Text>
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
          <Text style={styles.previewClose}>✕ Đóng</Text>
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
  const info = STATUS_INFO[status] ?? { label: status, color: Colors.secondary, icon: '📋' };

  const resolve = useMutation({
    mutationFn: () => ordersApi.resolveComplaint(orderId, { verdict: verdict!, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-complaints'] });
      setShowForm(false);
      setMessage('');
      Alert.alert('✅ Đã xử lý', verdict === 'FAULT'
        ? 'Đã gửi lời xin lỗi và tạo voucher cho khách. Chờ khách gửi số tài khoản.'
        : 'Đã gửi kết quả — không chịu trách nhiệm.');
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể xử lý'),
  });

  const confirmTransfer = useMutation({
    mutationFn: () => ordersApi.confirmTransfer(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-complaints'] });
      Alert.alert('✅ Hoàn tất', 'Đã xác nhận chuyển tiền. Khiếu nại đã được đóng.');
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
      '💸 Xác nhận đã chuyển tiền?',
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
        <View>
          <Text style={styles.orderCode}>{complaint.order?.trackingCode}</Text>
          <Text style={styles.customerInfo}>
            👤 {complaint.customer?.user?.fullName} · {complaint.customer?.user?.phone}
          </Text>
          <Text style={styles.dateText}>{new Date(complaint.createdAt).toLocaleDateString('vi-VN')}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: info.color + '20' }]}>
          <Text style={{ fontSize: 16 }}>{info.icon}</Text>
          <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>

      {/* Nội dung khiếu nại */}
      <View style={styles.complaintBox}>
        <Text style={styles.complaintLabel}>⚠️ Lý do: {complaint.reason}</Text>
        <Text style={styles.complaintDesc}>{complaint.description}</Text>
        {complaint.requestedAmount > 0 && (
          <Text style={styles.refundReq}>Yêu cầu bồi thường: {complaint.requestedAmount?.toLocaleString('vi-VN')}đ</Text>
        )}
      </View>

      {/* Photos section */}
      <PhotosSection title="📸 Ảnh khi nhận hàng tại bến" photos={complaint.order?.pickupPhotos ?? []} />
      <PhotosSection title="📸 Ảnh khi giao hàng cho khách" photos={complaint.order?.deliveryPhotos ?? []} />

      {/* Driver verdict/response if already resolved */}
      {complaint.apologyMessage && (
        <View style={[styles.responseBlock, { borderLeftColor: Colors.warning }]}>
          <Text style={styles.responseLabel}>Lời xin lỗi đã gửi:</Text>
          <Text style={styles.responseText}>{complaint.apologyMessage}</Text>
          {complaint.apologyVoucherCode && (
            <Text style={styles.voucherInfo}>🎁 Voucher đã tạo: {complaint.apologyVoucherCode} (giảm 20%)</Text>
          )}
        </View>
      )}
      {complaint.resolution && (
        <View style={[styles.responseBlock, { borderLeftColor: Colors.secondary }]}>
          <Text style={styles.responseLabel}>Phản hồi đã gửi:</Text>
          <Text style={styles.responseText}>{complaint.resolution}</Text>
        </View>
      )}

      {/* AWAITING_TRANSFER: show bank info + confirm button */}
      {status === 'AWAITING_TRANSFER' && complaint.customerBankAccount && (
        <View style={styles.bankBox}>
          <Text style={styles.bankLabel}>🏦 Tài khoản nhận tiền của khách:</Text>
          <Text style={styles.bankValue}>{complaint.customerBankAccount}</Text>
          <Button
            label="💸 Đã chuyển tiền — Hoàn tất"
            onPress={onConfirmTransfer}
            variant="success"
            loading={confirmTransfer.isPending}
            style={{ marginTop: 10 }}
          />
        </View>
      )}

      {/* AWAITING_BANK_INFO: waiting state */}
      {status === 'AWAITING_BANK_INFO' && (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>⏳ Đang chờ khách cung cấp số tài khoản ngân hàng...</Text>
        </View>
      )}

      {/* Resolve form for PENDING/REVIEWING */}
      {(status === 'PENDING' || status === 'REVIEWING') && (
        showForm ? (
          <View style={styles.resolveForm}>
            <Text style={styles.resolveTitle}>Kết quả xử lý khiếu nại</Text>

            {/* Verdict buttons */}
            <View style={styles.verdictRow}>
              <TouchableOpacity
                style={[styles.verdictBtn, verdict === 'FAULT' && styles.verdictFaultActive]}
                onPress={() => {
                  setVerdict('FAULT');
                  setMessage('Kính gửi Quý khách, nhà xe xin chân thành xin lỗi về sự cố xảy ra với đơn hàng của bạn. Chúng tôi xác nhận trách nhiệm và sẽ thực hiện hoàn tiền trong thời gian sớm nhất.');
                }}
              >
                <Text style={styles.verdictBtnIcon}>❗</Text>
                <Text style={[styles.verdictBtnText, verdict === 'FAULT' && { color: Colors.error }]}>Hàng có vấn đề</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verdictBtn, verdict === 'NO_FAULT' && styles.verdictNoFaultActive]}
                onPress={() => {
                  setVerdict('NO_FAULT');
                  setMessage('Sau khi đối chiếu với ảnh ghi nhận khi nhận hàng và khi giao hàng, chúng tôi xác định hàng hóa không có vấn đề. Nhà xe không chịu trách nhiệm về khiếu nại này.');
                }}
              >
                <Text style={styles.verdictBtnIcon}>✅</Text>
                <Text style={[styles.verdictBtnText, verdict === 'NO_FAULT' && { color: Colors.success }]}>Không có vấn đề</Text>
              </TouchableOpacity>
            </View>

            {verdict && (
              <>
                <Text style={styles.msgLabel}>
                  {verdict === 'FAULT' ? '✉️ Lời xin lỗi gửi khách:' : '📋 Phản hồi gửi khách:'}
                </Text>
                <TextInput
                  style={styles.textarea}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  placeholder="Nhập nội dung..."
                />
                {verdict === 'FAULT' && (
                  <View style={styles.infoNote}>
                    <Text style={styles.infoNoteText}>
                      💡 Hệ thống sẽ tự động tạo voucher giảm 20% dành riêng cho khách này và yêu cầu họ cung cấp số tài khoản để hoàn tiền.
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
            <Text style={styles.openFormText}>🔍 Xem xét & Xử lý khiếu nại</Text>
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
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Khiếu nại</Text>
        {pending > 0 && (
          <View style={styles.countChip}>
            <Text style={styles.countText}>{pending} cần xử lý</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.secondary }}>Đang tải...</Text>
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>😊</Text>
          <Text style={styles.emptyText}>Không có khiếu nại nào</Text>
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
  header: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h3, color: Colors.dark },
  countChip: { backgroundColor: Colors.errorBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { ...Typography.smallBold, color: Colors.error },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderCode: { ...Typography.bodyBold, color: Colors.navy },
  customerInfo: { ...Typography.small, color: Colors.dark, marginTop: 2 },
  dateText: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: 'center', gap: 4 },
  statusText: { ...Typography.smallBold },

  complaintBox: { backgroundColor: Colors.errorBg, borderRadius: Layout.radiusSm, padding: 12, marginBottom: 12 },
  complaintLabel: { ...Typography.smallBold, color: Colors.error, marginBottom: 4 },
  complaintDesc: { ...Typography.small, color: Colors.dark, lineHeight: 20 },
  refundReq: { ...Typography.smallBold, color: Colors.error, marginTop: 6 },

  photoSection: { marginBottom: 12 },
  photoSectionTitle: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 8 },
  thumb: { width: 90, height: 90, borderRadius: Layout.radiusSm, backgroundColor: Colors.bg },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '95%', height: '80%' },
  previewClose: { ...Typography.bodyBold, color: Colors.white, marginTop: 16 },

  responseBlock: { borderLeftWidth: 3, borderRadius: Layout.radiusSm, backgroundColor: Colors.bg, padding: 10, marginBottom: 10 },
  responseLabel: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 4 },
  responseText: { ...Typography.small, color: Colors.dark, lineHeight: 20 },
  voucherInfo: { ...Typography.smallBold, color: Colors.success, marginTop: 6 },

  bankBox: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 14, marginBottom: 10 },
  bankLabel: { ...Typography.smallBold, color: Colors.blue, marginBottom: 6 },
  bankValue: { ...Typography.bodyBold, color: Colors.dark },

  waitingBox: { backgroundColor: Colors.warningBg, borderRadius: Layout.radiusSm, padding: 12, marginBottom: 10 },
  waitingText: { ...Typography.small, color: Colors.warning },

  openFormBtn: { backgroundColor: Colors.infoBg, borderRadius: Layout.radius, padding: 12, alignItems: 'center', marginTop: 4 },
  openFormText: { ...Typography.bodyBold, color: Colors.blue },

  resolveForm: { marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 14 },
  resolveTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 12 },
  verdictRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  verdictBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 12, alignItems: 'center', gap: 4 },
  verdictFaultActive: { borderColor: Colors.error, backgroundColor: Colors.errorBg },
  verdictNoFaultActive: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  verdictBtnIcon: { fontSize: 22 },
  verdictBtnText: { ...Typography.smallBold, color: Colors.secondary, textAlign: 'center' },
  msgLabel: { ...Typography.smallBold, color: Colors.dark, marginBottom: 8 },
  textarea: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 12, ...Typography.body, color: Colors.dark, minHeight: 90, textAlignVertical: 'top' },
  infoNote: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 10, marginTop: 8 },
  infoNoteText: { ...Typography.caption, color: Colors.blue, lineHeight: 18 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { ...Typography.body, color: Colors.secondary },
});
