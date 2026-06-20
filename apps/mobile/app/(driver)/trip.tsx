import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { driverApi } from '@services/driver.api';
import { getTrackingSocket, disconnectSocket } from '@services/socket';
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

  const completeTrip = useMutation({
    mutationFn: () => driverApi.completeTrip(trip?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-trip'] });
      qc.invalidateQueries({ queryKey: ['driver-stats'] });
      Alert.alert('🎉 Hoàn tất chuyến xe!', 'Chuyến xe đã được ghi nhận. Xe sẵn sàng cho chuyến tiếp theo.', [
        { text: 'OK', onPress: () => router.replace('/(driver)/' as any) },
      ]);
    },
    onError: (e: any) => Alert.alert('Không thể hoàn tất', e?.response?.data?.message ?? 'Vui lòng thử lại'),
  });

  // GPS tracking — chỉ chạy khi trip đang IN_TRANSIT
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (trip?.status !== 'IN_TRANSIT' || !trip?.id) return;

    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) return;

      const socket = getTrackingSocket();

      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,   // emit mỗi 5 giây
          distanceInterval: 20, // hoặc mỗi 20m
        },
        (loc) => {
          socket.emit('driver:update_location', {
            tripId: trip.id,
            driverId: trip.driverId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed ? loc.coords.speed * 3.6 : undefined, // m/s → km/h
            heading: loc.coords.heading ?? undefined,
          });
        },
      );
    })();

    return () => {
      active = false;
      locationSub.current?.remove();
      locationSub.current = null;
    };
  }, [trip?.status, trip?.id]);

  // Dọn socket khi unmount
  useEffect(() => {
    return () => { disconnectSocket(); };
  }, []);

  const onCompleteTrip = () => {
    Alert.alert(
      '✅ Hoàn tất chuyến xe',
      'Xác nhận tất cả hàng đã được giao và xe sẵn sàng cho chuyến mới?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hoàn tất', style: 'default', onPress: () => completeTrip.mutate() },
      ],
    );
  };

  const BLOCK_STATUSES = ['PENDING', 'CONFIRMED', 'PICKING_UP'];
  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    CONFIRMED: 'Đã nhận, chưa lấy',
    PICKING_UP: 'Đang lấy hàng',
  };

  const blockedOrders = (trip?.orders ?? []).filter((o: any) =>
    BLOCK_STATUSES.includes(o.status)
  );

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
          <Text style={styles.noTripText}>Chưa có hành trình</Text>
          <Text style={styles.noTripSub}>Cập nhật tuyến hôm nay ở trang chủ để bắt đầu chuyến mới</Text>
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
            const isDeparted = cp.key === 'DEPARTED';
            const isBlocked = isNext && isDeparted && blockedOrders.length > 0;
            return (
              <View key={cp.key}>
                <View style={[styles.checkpointRow, i < CHECKPOINTS.length - 1 && !isBlocked && { borderBottomWidth: 1, borderBottomColor: Colors.bg }]}>
                  <View style={[styles.cpIcon, isDone && styles.cpIconDone, isNext && !isBlocked && styles.cpIconActive, isBlocked && styles.cpIconBlocked]}>
                    <Ionicons
                      name={isDone ? 'checkmark' : isBlocked ? 'lock-closed' : cp.icon}
                      size={isDone ? 16 : 18}
                      color={isDone || (isNext && !isBlocked) ? Colors.white : isBlocked ? Colors.white : Colors.placeholder}
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.cpLabel, isDone && { color: Colors.secondary }]}>{cp.label}</Text>
                    <Text style={styles.cpDesc}>{cp.desc}</Text>
                    {isDone && <Text style={styles.cpDone}>✓ Đã hoàn thành</Text>}
                  </View>
                  {isNext && (
                    <TouchableOpacity
                      style={[styles.cpBtn, isBlocked && styles.cpBtnBlocked]}
                      onPress={() => isBlocked
                        ? Alert.alert(
                            'Chưa thể xuất bến',
                            `Còn ${blockedOrders.length} đơn chưa xử lý. Vui lòng lấy hàng và xác nhận tại bến trước khi xuất phát.`,
                            [
                              { text: 'Đi xử lý đơn', onPress: () => router.push('/(driver)/' as any) },
                              { text: 'Đóng', style: 'cancel' },
                            ]
                          )
                        : onCheckpoint(cp)
                      }
                      disabled={updateCheckpoint.isPending}
                    >
                      {!isBlocked && <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
                      <Ionicons
                        name={isBlocked ? 'lock-closed-outline' : 'checkmark-circle-outline'}
                        size={14}
                        color={Colors.white}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.cpBtnText}>{isBlocked ? 'Bị khóa' : 'Cập nhật'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Warning banner khi bị khóa */}
                {isBlocked && (
                  <View style={styles.blockedBanner}>
                    <Ionicons name="warning-outline" size={15} color={Colors.warning} style={{ marginRight: 8, flexShrink: 0 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.blockedBannerTitle}>Còn {blockedOrders.length} đơn chưa xử lý:</Text>
                      {blockedOrders.map((o: any) => (
                        <TouchableOpacity
                          key={o.id}
                          onPress={() => router.push(`/(driver)/order/${o.id}` as any)}
                          style={styles.blockedOrderRow}
                        >
                          <Ionicons name="cube-outline" size={12} color={Colors.warning} style={{ marginRight: 5 }} />
                          <Text style={styles.blockedOrderText}>
                            #{o.trackingCode ?? o.id.slice(-6).toUpperCase()}
                            <Text style={styles.blockedOrderStatus}> — {STATUS_LABEL[o.status] ?? o.status}</Text>
                          </Text>
                          <Ionicons name="chevron-forward" size={12} color={Colors.warning} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {isBlocked && i < CHECKPOINTS.length - 1 && <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.bg }} />}
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
        {/* Nút QR + Hoàn tất chuyến — chỉ hiện khi trip ARRIVED */}
        {trip.status === 'ARRIVED' && (() => {
          const allDone = (trip.orders ?? []).every((o: any) =>
            ['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(o.status),
          );
          return (
            <>
              {/* QR scan — đặt trên nút hoàn tất */}
              <TouchableOpacity
                style={styles.qrFab}
                onPress={() => router.push('/(driver)/qr-scan' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="qr-code-outline" size={22} color="#fff" />
                <Text style={styles.qrFabText}>Quét QR giao hàng</Text>
              </TouchableOpacity>

              {/* Hoàn tất chuyến */}
              <TouchableOpacity
                style={[styles.completeBtn, !allDone && styles.completeBtnDisabled]}
                onPress={allDone ? onCompleteTrip : () => Alert.alert('Chưa thể hoàn tất', 'Vẫn còn đơn hàng chưa được giao xong.')}
                disabled={completeTrip.isPending}
              >
                <Ionicons name={allDone ? 'checkmark-circle' : 'lock-closed-outline'} size={22} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.completeBtnText}>
                  {completeTrip.isPending ? 'Đang xử lý...' : allDone ? 'Hoàn tất chuyến xe & Reset xe' : `Còn ${(trip.orders ?? []).filter((o: any) => !['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(o.status)).length} đơn chưa giao`}
                </Text>
              </TouchableOpacity>
            </>
          );
        })()}
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
  cpIconBlocked: { backgroundColor: Colors.warning },
  cpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' },
  cpBtnBlocked: { backgroundColor: Colors.warning },
  cpBtnText: { ...Typography.smallBold, color: Colors.white },

  blockedBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.warningBg, borderRadius: Layout.radiusSm, padding: 12, marginBottom: 10 },
  blockedBannerTitle: { ...Typography.smallBold, color: '#92400E', marginBottom: 8 },
  blockedOrderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  blockedOrderText: { ...Typography.small, color: '#92400E', flex: 1 },
  blockedOrderStatus: { ...Typography.caption, color: Colors.warning },

  orderItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  orderCode: { ...Typography.bodyBold, color: Colors.navy },
  orderReceiver: { ...Typography.small, color: Colors.secondary, marginTop: 3 },
  orderAddr: { ...Typography.caption, color: Colors.placeholder, marginLeft: 4 },
  deliverBtn: { backgroundColor: Colors.successBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  deliverBtnText: { ...Typography.smallBold, color: Colors.success },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success, borderRadius: Layout.radiusLg, padding: 16, marginBottom: 12, ...Shadow.md },
  completeBtnDisabled: { backgroundColor: Colors.secondary },
  completeBtnText: { ...Typography.bodyBold, color: Colors.white },

  qrFab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 15, marginBottom: 10, ...Shadow.blue,
  },
  qrFabText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  noTrip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(96,165,250,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  noTripText: { ...Typography.h4, color: Colors.dark, marginBottom: 8, textAlign: 'center' },
  noTripSub: { ...Typography.body, color: Colors.secondary, textAlign: 'center' },
});
