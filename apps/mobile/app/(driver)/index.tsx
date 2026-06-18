import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { driverApi } from '@services/driver.api';
import { driverRoutesApi } from '@services/driver-routes.api';
import { Badge } from '@components/ui/Badge';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const TABS = [
  { key: 'PENDING',    label: 'Chờ duyệt',  color: Colors.warning },
  { key: 'CONFIRMED',  label: 'Đã nhận',    color: Colors.blue },
  { key: 'PICKING_UP', label: 'Đang lấy',   color: '#8B5CF6' },
  { key: 'DELIVERING', label: 'Đang giao',  color: Colors.success },
];

const GOODS_LABELS: Record<string, string> = {
  FASHION: 'Thời trang', BULKY: 'Cồng kềnh', FOOD: 'Thực phẩm',
  FRAGILE: 'Dễ vỡ', FROZEN: 'Đông lạnh', ELECTRONICS: 'Điện tử', OTHER: 'Khác',
};
const WEIGHT_LABELS: Record<string, string> = {
  UNDER_5KG: '< 5kg', FROM_5_TO_20KG: '5–20kg', FROM_20_TO_50KG: '20–50kg', OVER_50KG: '> 50kg',
};

export default function DriverHomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: driverApi.getStats,
    refetchInterval: 10_000,
    staleTime: 0,
  });
  const { data: orders = [], refetch } = useQuery({
    queryKey: ['driver-orders', activeTab],
    queryFn: () => driverApi.getOrders(activeTab),
    refetchInterval: 10_000,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { data: todayRoute } = useQuery({
    queryKey: ['today-route'],
    queryFn: driverRoutesApi.getTodayRoute,
    staleTime: 0,
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const activeTabConfig = TABS.find(t => t.key === activeTab);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Gradient header */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.name}>{user?.fullName}</Text>
            {user?.vehiclePlate && (
              <View style={styles.plateChip}>
                <Ionicons name="bus" size={11} color={Colors.blueLight} style={{ marginRight: 5 }} />
                <Text style={styles.plateText}>{user.vehiclePlate}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.tripBtn}
            onPress={() => router.push('/(driver)/trip' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="map-outline" size={18} color={Colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.tripBtnText}>Hành trình</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            {[
              { value: stats.pending, label: 'Chờ duyệt', color: Colors.warning },
              { value: stats.today, label: 'Hôm nay', color: Colors.blueLight },
              { value: stats.delivered, label: 'Đã giao', color: Colors.success },
            ].map(({ value, label, color }) => (
              <View key={label} style={styles.statItem}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Route banner */}
      {todayRoute && !todayRoute.isSet && (
        <TouchableOpacity style={styles.routeWarning} onPress={() => router.push('/(driver)/routes' as any)}>
          <Ionicons name="warning-outline" size={18} color='#B45309' style={{ marginRight: 10 }} />
          <Text style={styles.routeWarningText}>Chưa thiết lập tuyến hôm nay — bạn sẽ không nhận được đơn!</Text>
          <Text style={styles.routeWarningAction}>Thiết lập →</Text>
        </TouchableOpacity>
      )}
      {todayRoute?.isSet && (
        <TouchableOpacity style={styles.routeActive} onPress={() => router.push('/(driver)/routes' as any)}>
          <Ionicons name="navigate" size={16} color={Colors.success} style={{ marginRight: 10 }} />
          <Text style={styles.routeActiveText}>{todayRoute.fromCity} → {todayRoute.toCity} · {todayRoute.departureTime}</Text>
          <Text style={styles.routeActiveEdit}>Sửa</Text>
        </TouchableOpacity>
      )}

      {/* Pill tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {TABS.map(({ key, label, color }) => {
            const count = (stats as any)?.tabCounts?.[key] ?? 0;
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, isActive && { backgroundColor: color }]}
                onPress={() => setActiveTab(key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                    <Text style={[styles.tabBadgeText, isActive && { color: Colors.white }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blueLight} />}
      >
        {(orders as any[]).length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="clipboard-outline" size={44} color={Colors.blueLight} />
            </View>
            <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
            <Text style={styles.emptyDesc}>Kéo để làm mới danh sách</Text>
          </View>
        ) : (
          (orders as any[]).map((order: any) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/(driver)/order/${order.id}` as any)}
              activeOpacity={0.88}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.trackingCode}>#{order.trackingCode}</Text>
                <Badge status={order.status} size="sm" />
              </View>

              <View style={styles.routeRow}>
                <View style={styles.cityChip}>
                  <Ionicons name="location-outline" size={12} color={Colors.blue} style={{ marginRight: 4 }} />
                  <Text style={styles.cityText}>{order.fromCity}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.placeholder} style={{ marginHorizontal: 8 }} />
                <View style={styles.cityChip}>
                  <Ionicons name="flag-outline" size={12} color={Colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.cityText}>{order.toCity}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.price}>{order.total?.toLocaleString('vi-VN')}đ</Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.goodsInfo}>
                  {GOODS_LABELS[order.goodsType] ?? order.goodsType}
                  {' · '}
                  {order.weightKg ? `${order.weightKg} kg` : (WEIGHT_LABELS[order.weightRange] ?? order.weightRange)}
                </Text>
              </View>

              <View style={styles.receiverRow}>
                <Ionicons name="person-outline" size={13} color={Colors.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.receiverText}>{order.receiverName} · {order.receiverPhone}</Text>
              </View>

              {/* Quick actions */}
              {(order.status === 'ARRIVED' || order.status === 'OUT_FOR_DELIVERY') && (
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: order.status === 'OUT_FOR_DELIVERY' ? Colors.infoBg : Colors.successBg }]}
                  onPress={(e) => { e.stopPropagation(); router.push(`/(driver)/deliver/${order.id}` as any); }}
                >
                  <Ionicons name={order.status === 'OUT_FOR_DELIVERY' ? 'camera-outline' : 'cube-outline'} size={15} color={order.status === 'OUT_FOR_DELIVERY' ? Colors.blue : Colors.success} style={{ marginRight: 6 }} />
                  <Text style={[styles.quickActionText, { color: order.status === 'OUT_FOR_DELIVERY' ? Colors.blue : Colors.success }]}>
                    {order.status === 'ARRIVED' ? 'Giao cho khách →' : 'Hoàn tất giao →'}
                  </Text>
                </TouchableOpacity>
              )}
              {order.status === 'PICKING_UP' && (
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: Colors.purpleBg }]}
                  onPress={(e) => { e.stopPropagation(); router.push(`/(driver)/pickup/${order.id}` as any); }}
                >
                  <Ionicons name="camera-outline" size={15} color={Colors.purple} style={{ marginRight: 6 }} />
                  <Text style={[styles.quickActionText, { color: Colors.purple }]}>Chụp ảnh lấy hàng →</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Layout.padding, paddingBottom: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  greeting: { ...Typography.small, color: 'rgba(255,255,255,0.6)' },
  name: { ...Typography.h3, color: Colors.white, marginBottom: 6 },
  plateChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  plateText: { ...Typography.caption, color: Colors.blueLight, fontWeight: '600', letterSpacing: 0.5 },
  tripBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, overflow: 'hidden', ...Shadow.blue },
  tripBtnText: { ...Typography.smallBold, color: Colors.white },

  statsRow: { flexDirection: 'row', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h3, fontSize: 22, fontWeight: '700' },
  statLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.55)', marginTop: 3 },

  routeWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: Layout.padding, paddingVertical: 12, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  routeWarningText: { ...Typography.caption, color: '#92400E', flex: 1 },
  routeWarningAction: { ...Typography.smallBold, color: '#B45309' },
  routeActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successBg, paddingHorizontal: Layout.padding, paddingVertical: 12, borderLeftWidth: 3, borderLeftColor: Colors.success },
  routeActiveText: { ...Typography.caption, color: '#065F46', flex: 1 },
  routeActiveEdit: { ...Typography.smallBold, color: Colors.blue },

  tabsWrap: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent: { paddingHorizontal: Layout.padding, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bg },
  tabText: { ...Typography.smallBold, color: Colors.secondary },
  tabTextActive: { color: Colors.white },
  tabBadge: { backgroundColor: Colors.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginLeft: 5 },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(96,165,250,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { ...Typography.h4, color: Colors.white, marginBottom: 6 },
  emptyDesc: { ...Typography.small, color: 'rgba(255,255,255,0.5)' },

  orderCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trackingCode: { ...Typography.bodyBold, color: Colors.navy, letterSpacing: 0.3 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cityChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  cityText: { ...Typography.smallBold, color: Colors.dark },
  price: { ...Typography.bodyBold, color: Colors.success },
  cardFooter: { marginBottom: 8 },
  goodsInfo: { ...Typography.small, color: Colors.secondary },
  receiverRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 10, padding: 10, marginBottom: 4 },
  receiverText: { ...Typography.small, color: Colors.secondary },
  quickAction: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, marginTop: 6 },
  quickActionText: { ...Typography.smallBold },
});
