import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverApi } from '@services/driver.api';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const GOODS_LABELS: Record<string, string> = {
  FASHION: 'Thời trang', BULKY: 'Cồng kềnh', FOOD: 'Thực phẩm',
  FRAGILE: 'Dễ vỡ', FROZEN: 'Đông lạnh', ELECTRONICS: 'Điện tử', OTHER: 'Khác',
};
const WEIGHT_LABELS: Record<string, string> = {
  UNDER_5KG: '< 5kg', FROM_5_TO_20KG: '5–20kg', FROM_20_TO_50KG: '20–50kg', OVER_50KG: '> 50kg',
};
const SERVICE_LABELS: Record<string, string> = {
  STATION_TO_STATION: 'Bến → Bến', DOOR_TO_STATION: 'Nhà → Bến',
  STATION_TO_DOOR: 'Bến → Nhà', DOOR_TO_DOOR: 'Nhà → Nhà',
};

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && { color: Colors.success }]}>{value}</Text>
    </View>
  );
}

export default function DriverOrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['driver-order', id],
    queryFn: () => driverApi.getOrder(id),
  });

  const accept = useMutation({
    mutationFn: () => driverApi.acceptOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-orders'] });
      qc.invalidateQueries({ queryKey: ['driver-order', id] });
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể nhận đơn'),
  });

  const reject = useMutation({
    mutationFn: (reason: string) => driverApi.rejectOrder(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-orders'] }); router.back(); },
  });

  const startPickup = useMutation({
    mutationFn: () => driverApi.startPickup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-orders'] });
      qc.invalidateQueries({ queryKey: ['driver-order', id] });
      Alert.alert('✅ Đã thông báo', 'Khách hàng được thông báo chuẩn bị hàng. Hãy đến lấy hàng!');
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể cập nhật'),
  });

  const onAccept = () => Alert.alert('Xác nhận nhận đơn', `Nhận đơn ${order?.trackingCode}?`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Nhận đơn', onPress: () => accept.mutate(), style: 'default' },
  ]);

  const onReject = () => Alert.alert('Từ chối đơn', 'Lý do từ chối?', [
    { text: 'Quá tải hàng', onPress: () => reject.mutate('Quá tải hàng') },
    { text: 'Sai tuyến đường', onPress: () => reject.mutate('Sai tuyến đường') },
    { text: 'Hàng cấm vận chuyển', onPress: () => reject.mutate('Hàng cấm vận chuyển') },
    { text: 'Hủy', style: 'cancel' },
  ]);

  const onStartPickup = () => Alert.alert(
    'Bắt đầu đi lấy hàng?',
    `Khách hàng sẽ nhận thông báo chuẩn bị hàng tại:\n${order?.senderAddress ?? `Bến xe ${order?.fromCity}`}`,
    [{ text: 'Hủy', style: 'cancel' }, { text: 'Xác nhận', onPress: () => startPickup.mutate() }]
  );

  if (isLoading || !order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <Text style={{ ...Typography.body, color: Colors.secondary }}>Đang tải...</Text>
      </View>
    );
  }

  const isPending = order.status === 'PENDING';
  const isConfirmed = order.status === 'CONFIRMED';
  const isPickingUp = order.status === 'PICKING_UP';
  const isArrived = order.status === 'ARRIVED';
  const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
  const hasAction = isPending || isConfirmed || isPickingUp || isArrived || isOutForDelivery;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <Badge status={order.status} size="sm" />
        </View>

        {/* Route display */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View>
              <Text style={styles.cityLabel}>Xuất phát</Text>
              <Text style={styles.city}>{order.fromCity}</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.4)" />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cityLabel}>Điểm đến</Text>
              <Text style={styles.city}>{order.toCity}</Text>
            </View>
          </View>
          <Text style={styles.trackingCode}>{order.trackingCode}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + (hasAction ? 100 : 24) }}>
        {/* Goods info */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.infoBg }]}>
              <Ionicons name="cube-outline" size={18} color={Colors.blue} />
            </View>
            <Text style={styles.cardTitle}>Thông tin hàng hóa</Text>
          </View>
          <InfoRow label="Loại hàng" value={GOODS_LABELS[order.goodsType] ?? order.goodsType} />
          <InfoRow label="Trọng lượng" value={order.actualWeightKg ? `${order.actualWeightKg} kg` : (WEIGHT_LABELS[order.weightRange] ?? order.weightRange)} />
          <InfoRow label="Dịch vụ" value={SERVICE_LABELS[order.serviceType] ?? order.serviceType} />
          {!!order.goodsDescription && <InfoRow label="Mô tả" value={order.goodsDescription} />}
          {!!order.goodsValue && <InfoRow label="Giá trị khai báo" value={`${order.goodsValue.toLocaleString('vi-VN')}đ`} />}
        </View>

        {/* Sender */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.purpleBg }]}>
              <Ionicons name="arrow-up-circle-outline" size={18} color={Colors.purple} />
            </View>
            <Text style={styles.cardTitle}>Người gửi</Text>
          </View>
          <InfoRow label="Họ tên" value={order.senderName} />
          <InfoRow label="SĐT" value={order.senderPhone} />
          <InfoRow label="Địa chỉ" value={order.senderAddress ?? `Bến xe ${order.fromCity}`} />
        </View>

        {/* Receiver */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.successBg }]}>
              <Ionicons name="arrow-down-circle-outline" size={18} color={Colors.success} />
            </View>
            <Text style={styles.cardTitle}>Người nhận</Text>
          </View>
          <InfoRow label="Họ tên" value={order.receiverName} />
          <InfoRow label="SĐT" value={order.receiverPhone} />
          <InfoRow label="Địa chỉ" value={order.receiverAddress ?? `Bến xe ${order.toCity}`} />
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.orangeBg }]}>
              <Ionicons name="cash-outline" size={18} color={Colors.orange} />
            </View>
            <Text style={styles.cardTitle}>Thanh toán</Text>
          </View>
          <InfoRow label="Cước vận chuyển" value={`${order.shippingFee?.toLocaleString('vi-VN')}đ`} />
          <InfoRow label="Tổng cộng" value={`${order.total?.toLocaleString('vi-VN')}đ`} highlight />
          <InfoRow label="Phương thức" value={order.paymentMethod} />
          {!!order.codAmount && <InfoRow label="Thu hộ (COD)" value={`${order.codAmount.toLocaleString('vi-VN')}đ`} highlight />}
        </View>
      </ScrollView>

      {/* Action bar */}
      {isPending && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button label="Từ chối" onPress={onReject} variant="danger" style={{ flex: 1, marginRight: 8 }} loading={reject.isPending} />
          <Button label="Nhận đơn" icon="✓" onPress={onAccept} variant="success" style={{ flex: 2 }} loading={accept.isPending} />
        </View>
      )}
      {isConfirmed && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button label="Bắt đầu đi lấy hàng" icon="🚗" onPress={onStartPickup} style={{ flex: 1, backgroundColor: Colors.warning }} loading={startPickup.isPending} />
        </View>
      )}
      {isPickingUp && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button label="Chụp ảnh xác nhận lấy hàng" icon="📸" onPress={() => router.push(`/(driver)/pickup/${id}` as any)} style={{ flex: 1 }} />
        </View>
      )}
      {isArrived && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button label="Bắt đầu giao cho người nhận" icon="📦" onPress={() => router.push(`/(driver)/deliver/${id}` as any)} variant="success" style={{ flex: 1 }} />
        </View>
      )}
      {isOutForDelivery && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button label="Hoàn tất giao hàng (chụp ảnh)" icon="📸" onPress={() => router.push(`/(driver)/deliver/${id}` as any)} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Layout.padding, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  headerTitle: { ...Typography.h4, color: Colors.white, flex: 1, marginLeft: 8 },

  routeCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Layout.radiusLg, padding: 16 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cityLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  city: { ...Typography.h3, color: Colors.white },
  trackingCode: { ...Typography.smallBold, color: Colors.blueLight, textAlign: 'center', letterSpacing: 0.5 },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardTitle: { ...Typography.h4, color: Colors.dark },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  infoLabel: { ...Typography.small, color: Colors.secondary, flex: 1 },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, flex: 2, textAlign: 'right' },

  bottomBar: {
    flexDirection: 'row', backgroundColor: Colors.white,
    padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border,
    ...Shadow.md,
  },
});
