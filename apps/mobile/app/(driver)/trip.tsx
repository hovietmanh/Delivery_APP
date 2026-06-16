import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverApi } from '@services/driver.api';
import { Badge } from '@components/ui/Badge';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const CHECKPOINTS = [
  { key: 'DEPARTED', label: 'Đã xuất bến', icon: '🚌', status: 'AT_STATION' },
  { key: 'MIDPOINT', label: 'Điểm dừng giữa đường', icon: '⛽', status: 'IN_TRANSIT' },
  { key: 'ARRIVED_STATION', label: 'Đến bến đích', icon: '🏁', status: 'ARRIVED' },
];

export default function TripScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ['active-trip'],
    queryFn: driverApi.getActiveTrip,
    refetchInterval: 60_000,
  });

  const updateCheckpoint = useMutation({
    mutationFn: ({ checkpoint }: { checkpoint: string }) =>
      driverApi.updateTripCheckpoint(trip?.id, checkpoint),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-trip'] }),
  });

  const onCheckpoint = (checkpoint: { key: string; label: string }) => {
    Alert.alert(
      'Cập nhật hành trình',
      `Xác nhận: "${checkpoint.label}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => updateCheckpoint.mutate({ checkpoint: checkpoint.key }) },
      ]
    );
  };

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Đang tải...</Text></View>;
  }

  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Hành trình</Text>
        </View>
        <View style={styles.noTrip}>
          <Text style={styles.noTripIcon}>🗺️</Text>
          <Text style={styles.noTripText}>Không có hành trình đang diễn ra</Text>
          <Text style={styles.noTripSub}>Hành trình sẽ xuất hiện sau khi bạn xác nhận lấy hàng</Text>
        </View>
      </View>
    );
  }

  const currentIdx = CHECKPOINTS.findIndex((c) => c.status === trip.currentStatus);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Hành trình đang chạy</Text>
        <View style={styles.liveChip}>
          <Text style={styles.liveDot}>●</Text>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
        {/* Trip info card */}
        <View style={styles.tripCard}>
          <View style={styles.routeRow}>
            <View>
              <Text style={styles.routeLabel}>Xuất phát</Text>
              <Text style={styles.routeCity}>{trip.fromCity}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
              <Text style={styles.busEmoji}>🚌</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.routeLabel}>Điểm đến</Text>
              <Text style={styles.routeCity}>{trip.toCity}</Text>
            </View>
          </View>

          <View style={styles.tripStatsRow}>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>{trip.ordersCount ?? 0}</Text>
              <Text style={styles.tripStatLabel}>Đơn hàng</Text>
            </View>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>{trip.departureTime}</Text>
              <Text style={styles.tripStatLabel}>Xuất bến</Text>
            </View>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>{trip.estimatedArrival}</Text>
              <Text style={styles.tripStatLabel}>Dự kiến đến</Text>
            </View>
          </View>
        </View>

        {/* Checkpoints */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Cập nhật hành trình</Text>
          {CHECKPOINTS.map((cp, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx;
            return (
              <TouchableOpacity
                key={cp.key}
                style={[styles.checkpointRow, isDone && styles.checkpointDone]}
                onPress={() => !isDone && onCheckpoint(cp)}
                disabled={isDone}
              >
                <View style={[styles.checkpointIcon, isDone && styles.checkpointIconDone, isActive && styles.checkpointIconActive]}>
                  <Text style={{ fontSize: 18 }}>{isDone ? '✓' : cp.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkpointLabel, isDone && { color: Colors.secondary }]}>{cp.label}</Text>
                  {isDone && <Text style={styles.checkpointTime}>Đã cập nhật</Text>}
                  {isActive && <Text style={styles.checkpointActive}>Nhấn để cập nhật</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Orders on this trip */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Đơn hàng trên chuyến ({trip.orders?.length ?? 0})</Text>
          {trip.orders?.map((order: any) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderItem}
              onPress={() => router.push(`/(driver)/order/${order.id}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.orderCode}>{order.trackingCode}</Text>
                <Text style={styles.orderReceiver}>{order.receiverName} · {order.receiverPhone}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge status={order.status} />
                {order.status === 'ARRIVED' && (
                  <TouchableOpacity
                    style={styles.deliverBtn}
                    onPress={() => router.push(`/(driver)/deliver/${order.id}` as any)}
                  >
                    <Text style={styles.deliverBtnText}>Giao hàng →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.navy, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Layout.padding, paddingBottom: 16 },
  headerTitle: { ...Typography.h3, color: Colors.white },
  liveChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error + '30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { color: Colors.error, marginRight: 4, fontSize: 10 },
  liveText: { ...Typography.smallBold, color: Colors.error },

  tripCard: { backgroundColor: Colors.navy, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  routeLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },
  routeCity: { ...Typography.h3, color: Colors.white },
  progressTrack: { flex: 1, marginHorizontal: 12, height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, position: 'relative', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, width: '50%', height: '100%', backgroundColor: Colors.blue, borderRadius: 4 },
  busEmoji: { position: 'absolute', left: '45%', fontSize: 22, top: -8 },
  tripStatsRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 14 },
  tripStat: { alignItems: 'center' },
  tripStatValue: { ...Typography.h4, color: Colors.white },
  tripStatLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 14 },

  checkpointRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  checkpointDone: { opacity: 0.7 },
  checkpointIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkpointIconDone: { backgroundColor: Colors.successBg },
  checkpointIconActive: { backgroundColor: Colors.infoBg, borderWidth: 2, borderColor: Colors.blue },
  checkpointLabel: { ...Typography.bodyBold, color: Colors.dark },
  checkpointTime: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  checkpointActive: { ...Typography.caption, color: Colors.blue, marginTop: 2 },

  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  orderCode: { ...Typography.bodyBold, color: Colors.navy },
  orderReceiver: { ...Typography.small, color: Colors.secondary, marginTop: 2 },
  deliverBtn: { marginTop: 4, backgroundColor: Colors.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Layout.radiusSm },
  deliverBtnText: { ...Typography.smallBold, color: Colors.success },

  noTrip: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noTripIcon: { fontSize: 60, marginBottom: 16 },
  noTripText: { ...Typography.h4, color: Colors.dark, marginBottom: 8 },
  noTripSub: { ...Typography.body, color: Colors.secondary, textAlign: 'center', paddingHorizontal: 32 },
});
