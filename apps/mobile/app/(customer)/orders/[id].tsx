import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { ordersApi } from '@services/orders.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';
import { Button } from '@components/ui/Button';

const CANCEL_REASONS = [
  'Đặt nhầm đơn hàng',
  'Muốn thay đổi thông tin giao hàng',
  'Tìm được giá tốt hơn',
  'Không cần gửi hàng nữa',
  'Nhà xe chưa liên hệ xác nhận',
  'Thay đổi phương thức thanh toán',
  'Lý do khác',
];

// Mã viết tắt sân bay/bến xe
const CITY_CODE: Record<string, string> = {
  'Hà Nội': 'HAN', 'TP.HCM': 'SGN', 'Đà Nẵng': 'DAD',
  'Nghệ An': 'VII', 'Huế': 'HUI', 'Nha Trang': 'NHA',
  'Cần Thơ': 'VCA', 'Hải Phòng': 'HPH', 'Vinh': 'VII',
};

const cityCode = (city: string) =>
  CITY_CODE[city] ?? city?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) ?? '???';

// Tiến độ theo trạng thái
const STATUS_PROGRESS: Record<string, number> = {
  PENDING: 2, CONFIRMED: 10, PICKING_UP: 20,
  AT_STATION: 35, IN_TRANSIT: 55, ARRIVED: 85,
  OUT_FOR_DELIVERY: 92, DELIVERED: 100, CANCELLED: 0,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận',
  PICKING_UP: 'Đang lấy hàng', AT_STATION: 'Tại bến gửi',
  IN_TRANSIT: 'Đang vận chuyển', ARRIVED: 'Đến bến đích',
  OUT_FOR_DELIVERY: 'Đang giao nhà', DELIVERED: 'Đã giao xong',
  CANCELLED: 'Đã hủy', DISPUTED: 'Khiếu nại',
};

const GOODS_LABEL: Record<string, string> = {
  FASHION: 'Thời trang', BULKY: 'Cồng kềnh', FOOD: 'Thực phẩm',
  FRAGILE: 'Dễ vỡ', FROZEN: 'Đông lạnh', ELECTRONICS: 'Điện tử', OTHER: 'Khác',
};

const WEIGHT_LABEL: Record<string, string> = {
  UNDER_5KG: '< 5kg', FROM_5_TO_20KG: '5–20kg',
  FROM_20_TO_50KG: '20–50kg', OVER_50KG: '> 50kg',
};

const SERVICE_LABEL: Record<string, string> = {
  STATION_TO_STATION: 'Bến → Bến', DOOR_TO_STATION: 'Nhà → Bến',
  STATION_TO_DOOR: 'Bến → Nhà', DOOR_TO_DOOR: 'Nhà → Nhà',
};

const TIMELINE_STEPS = [
  { status: 'PENDING',          icon: '📋', label: 'Đơn hàng đã tạo' },
  { status: 'CONFIRMED',        icon: '✅', label: 'Nhà xe xác nhận' },
  { status: 'PICKING_UP',       icon: '🛵', label: 'Đang lấy hàng' },
  { status: 'AT_STATION',       icon: '🏢', label: 'Hàng lên xe tại bến' },
  { status: 'IN_TRANSIT',       icon: '🚌', label: 'Đang vận chuyển' },
  { status: 'ARRIVED',          icon: '📍', label: 'Xe đến bến đích' },
  { status: 'OUT_FOR_DELIVERY', icon: '🏃', label: 'Đang giao đến nhà' },
  { status: 'DELIVERED',        icon: '🎉', label: 'Giao hàng thành công' },
];

const STATUS_ORDER = TIMELINE_STEPS.map(s => s.status);

function formatTime(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    refetchInterval: (query) => {
      const o = query.state.data as any;
      if (!o) return 10_000;
      return ['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(o.status) ? false : 10_000;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => ordersApi.cancelOrder(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', id] });
      setShowCancelModal(false);
      Alert.alert(
        'Đã hủy đơn hàng',
        'Đơn hàng của bạn đã được hủy thành công.',
        [{ text: 'Về lịch sử đơn', onPress: () => router.replace('/(customer)/orders' as any) }],
      );
    },
    onError: () => Alert.alert('Lỗi', 'Không thể hủy đơn. Vui lòng thử lại.'),
  });

  if (isLoading || !order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <Text style={[Typography.body, { color: Colors.secondary }]}>Đang tải...</Text>
      </View>
    );
  }

  const isActive = !['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(order.status);
  const progress = STATUS_PROGRESS[order.status] ?? 0;
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  // Map tracking events từ API (có timestamp thực) vào các bước
  const trackingMap: Record<string, any> = {};
  (order.tracking ?? []).forEach((t: any) => {
    trackingMap[t.status] = t;
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* ── Header + Status card ── */}
      <View style={[styles.heroCard, { paddingTop: insets.top + 8 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.trackCode}>#{order.trackingCode}</Text>
            {isActive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.cityBlock}>
            <Text style={styles.cityCode}>{cityCode(order.fromCity)}</Text>
            <Text style={styles.cityName}>{order.fromCity}</Text>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
              {/* Bus icon trượt theo tiến độ */}
              <View style={[styles.busWrap, { left: `${Math.min(progress, 88)}%` }]}>
                <Text style={styles.busEmoji}>🚌</Text>
              </View>
            </View>
            <Text style={styles.progressLabel}>
              {progress}% · {STATUS_LABEL[order.status] ?? order.status}
            </Text>
          </View>

          <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.cityCode}>{cityCode(order.toCity)}</Text>
            <Text style={styles.cityName}>{order.toCity}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Gửi', value: formatDate(order.createdAt) ?? '—' },
            { label: 'Hàng hóa', value: GOODS_LABEL[order.goodsType] ?? order.goodsType },
            { label: 'Dịch vụ', value: SERVICE_LABEL[order.serviceType] ?? order.serviceType },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* ── Timeline ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Hành trình đơn hàng</Text>
          {TIMELINE_STEPS.map((step, i) => {
            const isDone = i < currentIdx;
            const isCurrentStep = i === currentIdx;
            const tracked = trackingMap[step.status];
            const isCancelled = order.status === 'CANCELLED';

            return (
              <View key={step.status} style={styles.timelineRow}>
                {/* Dot + Line */}
                <View style={styles.dotCol}>
                  <View style={[
                    styles.dot,
                    isDone && styles.dotDone,
                    isCurrentStep && !isCancelled && styles.dotActive,
                  ]}>
                    <Text style={styles.dotIcon}>
                      {isDone ? '✓' : isCurrentStep && !isCancelled ? step.icon : ''}
                    </Text>
                  </View>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <View style={[styles.connector, isDone && styles.connectorDone]} />
                  )}
                </View>

                {/* Content */}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTopRow}>
                    <Text style={[
                      styles.timelineLabel,
                      isDone && styles.timelineLabelDone,
                      isCurrentStep && !isCancelled && styles.timelineLabelActive,
                    ]}>
                      {step.label}
                    </Text>
                    {(isDone || isCurrentStep) && (
                      <Text style={styles.timelineTime}>
                        {tracked
                          ? `${formatDate(tracked.timestamp)} ${formatTime(tracked.timestamp)}`
                          : isCurrentStep ? 'Vừa xong' : ''}
                      </Text>
                    )}
                  </View>
                  {(isDone || isCurrentStep) && tracked?.note && (
                    <Text style={styles.timelineNote}>{tracked.note}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Thông tin đơn ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Chi tiết đơn hàng</Text>
          {[
            { label: 'Mã vận đơn', value: order.trackingCode },
            { label: 'Trọng lượng', value: WEIGHT_LABEL[order.weightRange] ?? order.weightRange },
            { label: 'Người gửi', value: `${order.senderName} · ${order.senderPhone}` },
            { label: 'Người nhận', value: `${order.receiverName} · ${order.receiverPhone}` },
            { label: 'Địa chỉ giao', value: order.receiverAddress ?? 'Tự đến bến lấy' },
            { label: 'Tổng tiền', value: `${order.total?.toLocaleString('vi-VN')}đ`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={[styles.infoValue, highlight && { color: Colors.blue }]} numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Actions ── */}
        {order.status === 'DELIVERED' && (
          <View style={styles.actionsWrap}>
            <Button label="⭐ Đánh giá nhà xe" onPress={() => {}} variant="outline" style={{ marginBottom: 8 }} />
            <Button label="⚠️ Khiếu nại đơn hàng" onPress={() => {}} variant="danger" />
          </View>
        )}
        {['PENDING', 'CONFIRMED'].includes(order.status) && (
          <View style={styles.actionsWrap}>
            <Button
              label="Hủy đơn hàng"
              onPress={() => { setSelectedReason(''); setShowCancelModal(true); }}
              variant="danger"
            />
          </View>
        )}
      </ScrollView>

      {/* ── Modal chọn lý do hủy ── */}
      <Modal visible={showCancelModal} transparent animationType="slide" onRequestClose={() => setShowCancelModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCancelModal(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Lý do hủy đơn</Text>
          <Text style={styles.modalSub}>Vui lòng chọn lý do để chúng tôi cải thiện dịch vụ</Text>

          {CANCEL_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reasonRow, selectedReason === reason && styles.reasonRowActive]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={[styles.radioCircle, selectedReason === reason && styles.radioCircleActive]}>
                {selectedReason === reason && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextActive]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(false)}>
              <Text style={styles.cancelBtnText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedReason && styles.confirmBtnDisabled]}
              disabled={!selectedReason || cancelMutation.isPending}
              onPress={() => cancelMutation.mutate(selectedReason)}
            >
              {cancelMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmBtnText}>Xác nhận hủy</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Layout.padding,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: Colors.white },
  titleWrap: { alignItems: 'center' },
  trackCode: { ...Typography.h4, color: Colors.white },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { ...Typography.caption, color: '#4ADE80', fontWeight: '700', letterSpacing: 1 },

  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cityBlock: { width: 60 },
  cityCode: { ...Typography.h2, color: Colors.white, fontSize: 22 },
  cityName: { ...Typography.caption, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  progressWrap: { flex: 1, marginHorizontal: 12 },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3, marginBottom: 8,
    position: 'relative', overflow: 'visible',
  },
  progressFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: '#60A5FA', borderRadius: 3,
  },
  busWrap: { position: 'absolute', top: -12 },
  busEmoji: { fontSize: 18 },
  progressLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 10 },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingTop: 16, borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { ...Typography.bodyBold, color: Colors.white, fontSize: 13 },
  statLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.5)', marginTop: 3, fontSize: 10 },

  card: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: Layout.cardPadding, margin: 12, marginBottom: 0, marginTop: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 16 },

  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  dotCol: { width: 40, alignItems: 'center' },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  dotActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  dotIcon: { fontSize: 13 },
  connector: { width: 2, flex: 1, minHeight: 24, backgroundColor: '#E5E7EB', marginVertical: 3 },
  connectorDone: { backgroundColor: Colors.success },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 20, justifyContent: 'center' },
  timelineTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineLabel: { ...Typography.body, color: '#9CA3AF', flex: 1 },
  timelineLabelDone: { color: Colors.dark, fontWeight: '500' },
  timelineLabelActive: { color: Colors.blue, fontWeight: '700' },
  timelineTime: { ...Typography.caption, color: Colors.secondary, marginLeft: 8 },
  timelineNote: { ...Typography.small, color: Colors.secondary, marginTop: 3, fontStyle: 'italic' },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  infoLabel: { ...Typography.small, color: Colors.secondary, width: 90 },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, flex: 1, textAlign: 'right' },

  actionsWrap: { paddingHorizontal: Layout.padding, marginTop: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Layout.padding, paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...Typography.h3, color: Colors.dark, marginBottom: 6 },
  modalSub: { ...Typography.small, color: Colors.secondary, marginBottom: 16 },

  reasonRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  reasonRowActive: { backgroundColor: Colors.infoBg, marginHorizontal: -Layout.padding, paddingHorizontal: Layout.padding },
  radioCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  radioCircleActive: { borderColor: Colors.blue },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.blue },
  reasonText: { ...Typography.body, color: Colors.dark, flex: 1 },
  reasonTextActive: { color: Colors.blue, fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { ...Typography.bodyBold, color: Colors.secondary },
  confirmBtn: {
    flex: 1, backgroundColor: '#EF4444',
    borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#FCA5A5' },
  confirmBtnText: { ...Typography.bodyBold, color: Colors.white },
});
