import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { ordersApi } from '@services/orders.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

function fmtDateTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${hh}:${mm}  ${dd}/${mo}/${yy}`;
}

function computeTimes(order: any) {
  const dep = order?.trip?.departureTime;
  const arr = order?.trip?.arrivalEta;
  if (!dep) return { departure: null, arrival: null };
  const departure = fmtDateTime(dep);
  // Use arrivalEta from DB if available, else +12h
  const arrival = arr
    ? fmtDateTime(arr)
    : fmtDateTime(new Date(new Date(dep).getTime() + 12 * 60 * 60 * 1000).toISOString());
  return { departure, arrival };
}

export default function SuccessScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, trackingCode } = useLocalSearchParams<{ orderId: string; trackingCode: string }>();

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: !!orderId,
  });

  const { departure, arrival } = computeTimes(order);

  const copyCode = async () => {
    await Clipboard.setStringAsync(trackingCode ?? '');
    Alert.alert('Đã sao chép', `Mã vận đơn ${trackingCode} đã được sao chép.`);
  };

  const shareCode = async () => {
    await Share.share({
      message: `Mã vận đơn LT-Move của bạn: ${trackingCode}\nTra cứu tại: delilog.vn/track/${trackingCode}`,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* ── Success header ── */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.title}>Đặt đơn thành công!</Text>
          <Text style={styles.subtitle}>
            Nhà xe sẽ xác nhận đơn trong vòng 30 phút
          </Text>
        </View>

        {/* ── Mã vận đơn ── */}
        <View style={styles.codeCard}>
          <View>
            <Text style={styles.codeLabel}>Mã vận đơn</Text>
            <Text style={styles.code}>{trackingCode}</Text>
          </View>
          <TouchableOpacity onPress={copyCode} style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* ── Thông tin vận chuyển ── */}
        {order && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Thông tin vận chuyển</Text>
              {[
                { label: 'Tuyến đường', value: `${order.fromCity} → ${order.toCity}` },
                { label: 'Giờ xuất bến', value: departure ?? '—' },
                { label: 'Dự kiến đến', value: arrival ?? '—' },
                { label: 'Cần thanh toán', value: `${order.total?.toLocaleString('vi-VN')}đ`, highlight: true },
              ].map(({ label, value, highlight }) => (
                <View key={label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={[styles.infoValue, highlight && styles.highlight]}>{value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Người nhận</Text>
              {[
                { label: 'Tên', value: order.receiverName },
                { label: 'SĐT', value: order.receiverPhone },
                { label: 'Giao tận', value: order.receiverAddress ?? 'Tự đến bến lấy' },
              ].map(({ label, value }) => (
                <View key={label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoValue}>{value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Chia sẻ mã ── */}
        <TouchableOpacity style={styles.shareRow} onPress={shareCode}>
          <Ionicons name="share-social-outline" size={18} color={Colors.blue} style={{ marginRight: 8 }} />
          <Text style={styles.shareText}>Chia sẻ mã vận đơn cho người nhận</Text>
        </TouchableOpacity>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => router.replace(`/(customer)/orders/${orderId}` as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="cube-outline" size={18} color={Colors.blue} style={{ marginRight: 8 }} />
            <Text style={styles.btnOutlineText}>Theo dõi đơn hàng</Text>
          </TouchableOpacity>
          <View style={{ height: 10 }} />
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.navigate('/(customer)' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="home-outline" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.btnPrimaryText}>Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  successHeader: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: Layout.padding },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: Colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    backgroundColor: Colors.successBg,
  },
  checkIcon: { fontSize: 36, color: Colors.success },
  title: { ...Typography.h2, color: Colors.dark, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.secondary, textAlign: 'center', marginTop: 8 },

  codeCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.navy, borderRadius: Layout.radiusLg,
    marginHorizontal: Layout.padding, padding: 16, marginBottom: 10,
  },
  codeLabel: { ...Typography.small, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  code: { ...Typography.h3, color: Colors.white, letterSpacing: 1 },
  copyBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: Layout.cardPadding, marginHorizontal: Layout.padding, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  infoLabel: { ...Typography.small, color: Colors.secondary },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, flex: 1, textAlign: 'right' },
  highlight: { color: Colors.success },

  shareRow: {
    margin: Layout.padding, borderRadius: Layout.radiusSm, padding: 14,
    backgroundColor: Colors.infoBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  shareText: { ...Typography.bodyBold, color: Colors.blue },

  actions: { paddingHorizontal: Layout.padding, marginTop: 8 },

  btnOutline: {
    height: Layout.buttonHeight, borderRadius: Layout.radius,
    borderWidth: 1.5, borderColor: Colors.blue,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { ...Typography.bodyBold, color: Colors.blue },

  btnPrimary: {
    height: Layout.buttonHeight, borderRadius: Layout.radius,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', ...Shadow.blue,
  },
  btnPrimaryText: { ...Typography.bodyBold, color: Colors.white },
});
