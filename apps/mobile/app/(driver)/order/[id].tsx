import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverApi } from '@services/driver.api';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-orders'] }); router.back(); },
  });

  const reject = useMutation({
    mutationFn: (reason: string) => driverApi.rejectOrder(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver-orders'] }); router.back(); },
  });

  const onAccept = () => {
    Alert.alert('Xác nhận nhận đơn', `Nhận đơn ${order?.trackingCode}?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Nhận đơn', onPress: () => accept.mutate() },
    ]);
  };

  const onReject = () => {
    Alert.alert('Từ chối đơn', 'Lý do từ chối?', [
      { text: 'Quá tải hàng', onPress: () => reject.mutate('Quá tải hàng') },
      { text: 'Sai tuyến đường', onPress: () => reject.mutate('Sai tuyến đường') },
      { text: 'Hàng cấm vận chuyển', onPress: () => reject.mutate('Hàng cấm vận chuyển') },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  if (isLoading || !order) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Đang tải...</Text></View>;
  }

  const isPending = order.status === 'PENDING';
  const isConfirmed = order.status === 'CONFIRMED';
  const canPickup = isConfirmed;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <Badge status={order.status} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
        {/* Route card */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View>
              <Text style={styles.cityLabel}>Xuất phát</Text>
              <Text style={styles.city}>{order.fromCity}</Text>
            </View>
            <Text style={styles.routeArrow}>→</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cityLabel}>Điểm đến</Text>
              <Text style={styles.city}>{order.toCity}</Text>
            </View>
          </View>
          <Text style={styles.trackingCode}>{order.trackingCode}</Text>
        </View>

        {/* Package info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Thông tin hàng hóa</Text>
          {[
            { label: 'Loại hàng', value: GOODS_LABELS[order.goodsType] ?? order.goodsType },
            { label: 'Trọng lượng', value: order.weightKg ? `${order.weightKg} kg` : (WEIGHT_LABELS[order.weightRange] ?? order.weightRange) },
            { label: 'Dịch vụ', value: SERVICE_LABELS[order.serviceType] ?? order.serviceType },
            { label: 'Mô tả', value: order.goodsDescription ?? '—' },
            { label: 'Giá trị khai báo', value: order.goodsValue ? `${order.goodsValue.toLocaleString('vi-VN')}đ` : '—' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Sender */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Người gửi</Text>
          {[
            { label: 'Họ tên', value: order.senderName },
            { label: 'SĐT', value: order.senderPhone },
            { label: 'Địa chỉ', value: order.senderAddress ?? `Bến xe ${order.fromCity}` },
          ].map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Receiver */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📬 Người nhận</Text>
          {[
            { label: 'Họ tên', value: order.receiverName },
            { label: 'SĐT', value: order.receiverPhone },
            { label: 'Địa chỉ', value: order.receiverAddress ?? `Bến xe ${order.toCity}` },
          ].map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Thanh toán</Text>
          {[
            { label: 'Cước vận chuyển', value: `${order.shippingFee?.toLocaleString('vi-VN')}đ` },
            { label: 'Tổng cộng', value: `${order.total?.toLocaleString('vi-VN')}đ`, bold: true },
            { label: 'Phương thức', value: order.paymentMethod },
            ...(order.codAmount ? [{ label: 'Thu hộ (COD)', value: `${order.codAmount.toLocaleString('vi-VN')}đ`, bold: true }] : []),
          ].map(({ label, value, bold }: any) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={[styles.infoValue, bold && { color: Colors.success, fontWeight: '700' }]}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action buttons */}
      {isPending && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button label="Từ chối" onPress={onReject} variant="danger" style={{ flex: 1, marginRight: 8 }} loading={reject.isPending} />
          <Button label="✓ Nhận đơn" onPress={onAccept} variant="success" style={{ flex: 2 }} loading={accept.isPending} />
        </View>
      )}

      {canPickup && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button
            label="📷 Xác nhận lấy hàng"
            onPress={() => router.push(`/(driver)/pickup/${id}` as any)}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: 22, color: Colors.dark },
  headerTitle: { ...Typography.h4, color: Colors.dark },

  routeCard: { backgroundColor: Colors.navy, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cityLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },
  city: { ...Typography.h3, color: Colors.white },
  routeArrow: { ...Typography.h2, color: 'rgba(255,255,255,0.4)' },
  trackingCode: { ...Typography.small, color: Colors.blueLight, textAlign: 'center' },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  infoLabel: { ...Typography.small, color: Colors.secondary, flex: 1 },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, flex: 2, textAlign: 'right' },

  bottomBar: { flexDirection: 'row', backgroundColor: Colors.white, padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border },
});
