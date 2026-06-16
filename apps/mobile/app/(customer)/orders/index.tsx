import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '@services/orders.api';
import { OrderCard } from '@components/order/OrderCard';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'IN_TRANSIT', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã nhận' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function OrderHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders, refetch } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => ordersApi.getMyOrders(activeTab || undefined),
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Lịch sử đơn hàng</Text>
          <TouchableOpacity><Text style={styles.searchIcon}>🔍</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
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
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!orders?.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(customer)/send')}>
              <Text style={styles.emptyBtnText}>Gửi hàng ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              showActions
              onComplaint={() => router.push(`/(customer)/orders/${order.id}?tab=complaint` as any)}
              onReview={() => router.push(`/(customer)/orders/${order.id}?tab=review` as any)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.white, paddingHorizontal: Layout.padding, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { ...Typography.h2, color: Colors.dark },
  searchIcon: { fontSize: 22 },
  tabs: { marginBottom: 12 },
  tab: { marginRight: 16, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.blue },
  tabText: { ...Typography.bodyBold, color: Colors.secondary },
  tabTextActive: { color: Colors.blue },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { ...Typography.body, color: Colors.secondary },
  emptyBtn: { marginTop: 16, backgroundColor: Colors.blue, borderRadius: Layout.radius, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { ...Typography.bodyBold, color: Colors.white },
});
