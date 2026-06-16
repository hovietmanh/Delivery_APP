import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { driverApi } from '@services/driver.api';
import { driverRoutesApi } from '@services/driver-routes.api';
import { Badge } from '@components/ui/Badge';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const TABS = [
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã nhận' },
  { key: 'PICKING_UP', label: 'Đang lấy' },
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

  const { data: stats } = useQuery({ queryKey: ['driver-stats'], queryFn: driverApi.getStats });
  const { data: orders = [], refetch } = useQuery({
    queryKey: ['driver-orders', activeTab],
    queryFn: () => driverApi.getOrders(activeTab),
  });
  const { data: todayRoute } = useQuery({
    queryKey: ['today-route'],
    queryFn: driverRoutesApi.getTodayRoute,
    staleTime: 0,
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
          {user?.companyName && <Text style={styles.company}>🏢 {user.companyName}</Text>}
          {user?.vehiclePlate && <Text style={styles.plate}>🚌 {user.vehiclePlate}</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push('/(driver)/trip' as any)}>
          <View style={styles.activeTripBtn}>
            <Text style={styles.activeTripIcon}>🗺️</Text>
            <Text style={styles.activeTripText}>Hành trình</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Today route warning banner */}
      {todayRoute && !todayRoute.isSet && (
        <TouchableOpacity style={styles.routeWarning} onPress={() => router.push('/(driver)/routes' as any)}>
          <Text style={styles.routeWarningText}>
            ⚠️ Chưa thiết lập tuyến hôm nay — bạn sẽ không nhận được đơn!
          </Text>
          <Text style={styles.routeWarningAction}>Thiết lập ngay →</Text>
        </TouchableOpacity>
      )}
      {todayRoute?.isSet && (
        <TouchableOpacity style={styles.routeActive} onPress={() => router.push('/(driver)/routes' as any)}>
          <Text style={styles.routeActiveText}>
            🗺️ {todayRoute.fromCity} → {todayRoute.toCity} · 🕐 {todayRoute.departureTime}
          </Text>
          <Text style={styles.routeActiveEdit}>Sửa</Text>
        </TouchableOpacity>
      )}

      {/* Stats bar */}
      {stats && (
        <View style={styles.statsBar}>
          {[
            { value: stats.pending, label: 'Chờ duyệt', color: Colors.warning },
            { value: stats.today, label: 'Hôm nay', color: Colors.blue },
            { value: stats.delivered, label: 'Đã giao', color: Colors.success },
          ].map(({ value, label, color }) => (
            <View key={label} style={styles.statItem}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {orders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
          </View>
        ) : (
          orders.map((order: any) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/(driver)/order/${order.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.trackingCode}>{order.trackingCode}</Text>
                <Badge status={order.status} />
              </View>

              <View style={styles.routeRow}>
                <View style={styles.cityChip}><Text style={styles.cityText}>{order.fromCity}</Text></View>
                <Text style={styles.arrow}>→</Text>
                <View style={styles.cityChip}><Text style={styles.cityText}>{order.toCity}</Text></View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.goodsInfo}>
                  {GOODS_LABELS[order.goodsType] ?? order.goodsType}
                  {' · '}
                  {order.weightKg ? `${order.weightKg} kg` : (WEIGHT_LABELS[order.weightRange] ?? order.weightRange)}
                </Text>
                <Text style={styles.price}>{order.total?.toLocaleString('vi-VN')}đ</Text>
              </View>

              <View style={styles.receiverRow}>
                <Text style={styles.receiverText}>📬 {order.receiverName} · {order.receiverPhone}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.navy, paddingHorizontal: Layout.padding, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { ...Typography.body, color: 'rgba(255,255,255,0.7)' },
  name: { ...Typography.h3, color: Colors.white },
  company: { ...Typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  plate: { ...Typography.small, color: Colors.blueLight, marginTop: 2 },
  activeTripBtn: { backgroundColor: Colors.blue, borderRadius: Layout.radius, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  activeTripIcon: { fontSize: 20 },
  activeTripText: { ...Typography.caption, color: Colors.white },

  routeWarning: {
    backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B',
    paddingHorizontal: Layout.padding, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  routeWarningText: { ...Typography.caption, color: '#92400E', flex: 1 },
  routeWarningAction: { ...Typography.caption, color: '#B45309', fontWeight: '700', marginLeft: 8 },
  routeActive: {
    backgroundColor: '#ECFDF5', borderLeftWidth: 4, borderLeftColor: Colors.success,
    paddingHorizontal: Layout.padding, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  routeActiveText: { ...Typography.caption, color: '#065F46', flex: 1 },
  routeActiveEdit: { ...Typography.caption, color: Colors.blue, fontWeight: '700' },

  statsBar: { flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h3 },
  statLabel: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },

  tabs: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent: { paddingHorizontal: Layout.padding, paddingTop: 12 },
  tab: { marginRight: 24, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.blue },
  tabText: { ...Typography.bodyBold, color: Colors.secondary },
  tabTextActive: { color: Colors.blue },

  orderCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  trackingCode: { ...Typography.bodyBold, color: Colors.navy },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cityChip: { backgroundColor: Colors.infoBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  cityText: { ...Typography.bodyBold, color: Colors.blue },
  arrow: { marginHorizontal: 8, ...Typography.h3, color: Colors.secondary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  goodsInfo: { ...Typography.small, color: Colors.secondary },
  price: { ...Typography.bodyBold, color: Colors.success },
  receiverRow: { backgroundColor: Colors.bg, borderRadius: Layout.radiusSm, padding: 8 },
  receiverText: { ...Typography.small, color: Colors.secondary },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { ...Typography.body, color: Colors.secondary },
});
