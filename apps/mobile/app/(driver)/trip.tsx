import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverApi } from '@services/driver.api';
import { Badge } from '@components/ui/Badge';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const CHECKPOINTS = [
  {
    key: 'DEPARTED',
    label: 'Bắt đầu di chuyển',
    desc: 'Xe xuất bến — thông báo khách hàng',
    icon: 'bus' as const,
    confirmMsg: 'Xác nhận xe đã xuất bến? Tất cả đơn sẽ chuyển sang "Đang vận chuyển" và khách hàng được thông báo.',
  },
  {
    key: 'ARRIVED_STATION',
    label: 'Xe đã đến bến đích',
    desc: 'Thông báo khách đến lấy hàng',
    icon: 'flag' as const,
    confirmMsg: 'Xác nhận xe đã đến bến đích? Khách hàng sẽ nhận thông báo đến lấy hàng.',
  },
];

function fmtTime(v: string | null | undefined): string {
  if (!v) return '--:--';
  if (v.includes('T') || v.includes('Z')) {
    return new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return v;
}

const STATUS_TO_IDX: Record<string, number> = { BOARDING: 0, IN_TRANSIT: 1, ARRIVED: 2 };

export default function TripScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ['active-trip'],
    queryFn: driverApi.getActiveTrip,
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const updateCheckpoint = useMutation({
    mutationFn: ({ checkpoint }: { checkpoint: string }) =>
      driverApi.updateTripCheckpoint(trip?.id, checkpoint),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-trip'] }),
  });

  const onCheckpoint = (cp: typeof CHECKPOINTS[0]) => {
    Alert.alert('Cập nhật hành trình', cp.confirmMsg, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: () => updateCheckpoint.mutate({ checkpoint: cp.key }) },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Hành trình</Text>
        </LinearGradient>
        <View style={styles.noTrip}>
          <Text style={{ ...Typography.body, color: Colors.secondary }}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Hành trình</Text>
        </LinearGradient>
        <View style={styles.noTrip}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="map-outline" size={44} color={Colors.blueLight} />
          </View>
          <Text style={styles.noTripText}>Không có hành trình đang diễn ra</Text>
          <Text style={styles.noTripSub}>Hành trình sẽ xuất hiện sau khi bạn xác nhận lấy hàng</Text>
        </View>
      </View>
    );
  }

  const currentIdx = STATUS_TO_IDX[trip.status] ?? 0;
  const progress = trip.progressPercent ?? (currentIdx === 0 ? 5 : currentIdx === 1 ? 50 : 95);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.headerTitle}>Hành trình đang chạy</Text>
          <View style={styles.liveChip}>
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
        {/* Trip info card */}
        <LinearGradient
          colors={[Colors.blueDark, Colors.blue]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.tripCard}
        >
          <View style={styles.routeRow}>
            <View>
              <Text style={styles.routeLabel}>Xuất phát</Text>
              <Text style={styles.routeCity}>{trip.route?.fromCity ?? trip.fromCity}</Text>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                <View style={[styles.busIcon, { left: `${Math.min(progress, 85)}%` as any }]}>
                  <Ionicons name="bus" size={12} color={Colors.white} />
                </View>
              </View>
              <Text style={styles.progressPct}>{progress}%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.routeLabel}>Điểm đến</Text>
              <Text style={styles.routeCity}>{trip.route?.toCity ?? trip.toCity}</Text>
            </View>
          </View>

          <View style={styles.tripStats}>
            {[
              { label: 'Đơn hàng', value: `${trip.orders?.length ?? 0}` },
              { label: 'Xuất bến', value: fmtTime(trip.departureTime) },
              { label: 'Dự kiến đến', value: fmtTime(trip.arrivalEta) },
            ].map(({ label, value }) => (
              <View key={label} style={styles.tripStat}>
                <Text style={styles.tripStatValue}>{value}</Text>
                <Text style={styles.tripStatLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Checkpoints */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cập nhật hành trình</Text>
          {CHECKPOINTS.map((cp, i) => {
            const isDone = i < currentIdx;
            const isNext = i === currentIdx;
            return (
              <View key={cp.key} style={[styles.checkpointRow, i < CHECKPOINTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.bg }]}>
                <View style={[styles.cpIcon, isDone && styles.cpIconDone, isNext && styles.cpIconActive]}>
                  <Ionicons
                    name={isDone ? 'checkmark' : cp.icon}
                    size={isDone ? 16 : 18}
                    color={isDone || isNext ? Colors.white : Colors.placeholder}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.cpLabel, isDone && { color: Colors.secondary }]}>{cp.label}</Text>
                  <Text style={styles.cpDesc}>{cp.desc}</Text>
                  {isDone && <Text style={styles.cpDone}>✓ Đã hoàn thành</Text>}
                </View>
                {isNext && (
                  <TouchableOpacity
                    style={styles.cpBtn}
                    onPress={() => onCheckpoint(cp)}
                    disabled={updateCheckpoint.isPending}
                  >
                    <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Text style={styles.cpBtnText}>Cập nhật</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Orders on trip */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đơn hàng trên chuyến ({trip.orders?.length ?? 0})</Text>
          {(trip.orders ?? []).map((order: any) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderItem}
              onPress={() => router.push(`/(driver)/order/${order.id}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.orderCode}>#{order.trackingCode}</Text>
                <Text style={styles.orderReceiver}>{order.receiverName} · {order.receiverPhone}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="location-outline" size={11} color={Colors.secondary} />
                  <Text style={styles.orderAddr}>{order.receiverAddress ?? `Bến xe ${order.toCity}`}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Badge status={order.status} size="sm" />
                {(order.status === 'ARRIVED' || order.status === 'OUT_FOR_DELIVERY') && (
                  <TouchableOpacity
                    style={[styles.deliverBtn, order.status === 'OUT_FOR_DELIVERY' && { backgroundColor: Colors.infoBg }]}
                    onPress={() => router.push(`/(driver)/deliver/${order.id}` as any)}
                  >
                    <Text style={[styles.deliverBtnText, order.status === 'OUT_FOR_DELIVERY' && { color: Colors.blue }]}>
                      {order.status === 'ARRIVED' ? 'Giao cho khách →' : 'Hoàn tất giao →'}
                    </Text>
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
  header: { paddingHorizontal: Layout.padding, paddingBottom: 18 },
  headerTitle: { ...Typography.h3, color: Colors.white },
  liveChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.error },
  liveText: { ...Typography.smallBold, color: Colors.error },

  tripCard: { borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.blue },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  routeLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  routeCity: { ...Typography.h3, color: Colors.white },
  progressSection: { flex: 1, marginHorizontal: 14, alignItems: 'center' },
  progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 6, position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 3 },
  busIcon: { position: 'absolute', top: -9, width: 22, height: 22, backgroundColor: Colors.white, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  progressPct: { ...Typography.caption, color: 'rgba(255,255,255,0.75)' },
  tripStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  tripStat: { alignItems: 'center' },
  tripStatValue: { ...Typography.h4, color: Colors.white },
  tripStatLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 16 },

  checkpointRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  cpIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cpIconDone: { backgroundColor: Colors.success },
  cpIconActive: { backgroundColor: Colors.blue },
  cpLabel: { ...Typography.bodyBold, color: Colors.dark },
  cpDesc: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  cpDone: { ...Typography.caption, color: Colors.success, marginTop: 4, fontWeight: '600' },
  cpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' },
  cpBtnText: { ...Typography.smallBold, color: Colors.white },

  orderItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  orderCode: { ...Typography.bodyBold, color: Colors.navy },
  orderReceiver: { ...Typography.small, color: Colors.secondary, marginTop: 3 },
  orderAddr: { ...Typography.caption, color: Colors.placeholder, marginLeft: 4 },
  deliverBtn: { backgroundColor: Colors.successBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  deliverBtnText: { ...Typography.smallBold, color: Colors.success },

  noTrip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(96,165,250,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  noTripText: { ...Typography.h4, color: Colors.dark, marginBottom: 8, textAlign: 'center' },
  noTripSub: { ...Typography.body, color: Colors.secondary, textAlign: 'center' },
});
