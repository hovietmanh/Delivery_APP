import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '@services/orders.api';
import { Badge, getStatusLabel } from '@components/ui/Badge';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const TABS = [
  { key: '', label: 'Tất cả' },
  { key: 'IN_TRANSIT', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã nhận' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const GOODS_LABEL: Record<string, string> = {
  FASHION: 'Thời trang', BULKY: 'Cồng kềnh', FOOD: 'Thực phẩm',
  FRAGILE: 'Dễ vỡ', FROZEN: 'Đông lạnh', ELECTRONICS: 'Điện tử', OTHER: 'Khác',
};

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
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Đơn hàng</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search-outline" size={22} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Pill tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      >
        {!orders?.length ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={48} color={Colors.blue} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptyDesc}>Gửi hàng ngay để bắt đầu theo dõi đơn hàng của bạn</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(customer)/send')}>
              <Text style={styles.emptyBtnText}>Gửi hàng ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order: any) => (
            <TouchableOpacity
              key={order.id}
              style={styles.card}
              onPress={() => router.push(`/(customer)/orders/${order.id}` as any)}
              activeOpacity={0.88}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <Text style={styles.trackingCode}>#{order.trackingCode}</Text>
                <Badge status={order.status} size="sm" />
              </View>

              {/* Route row */}
              <View style={styles.routeRow}>
                <View style={styles.cityPill}>
                  <Ionicons name="location-outline" size={12} color={Colors.blue} style={{ marginRight: 4 }} />
                  <Text style={styles.cityText}>{order.fromCity}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.placeholder} style={{ marginHorizontal: 8 }} />
                <View style={styles.cityPill}>
                  <Ionicons name="flag-outline" size={12} color={Colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.cityText}>{order.toCity}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="cube-outline" size={13} color={Colors.secondary} />
                  <Text style={styles.goodsText}>{GOODS_LABEL[order.goodsType] ?? order.goodsType}</Text>
                </View>
                <Text style={styles.price}>{order.total?.toLocaleString('vi-VN')}đ</Text>
              </View>

              {/* Receiver */}
              <View style={styles.receiverRow}>
                <Ionicons name="person-outline" size={13} color={Colors.secondary} />
                <Text style={styles.receiverText}>{order.receiverName} · {order.receiverPhone}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white, paddingHorizontal: Layout.padding,
    paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { ...Typography.h2, color: Colors.dark },
  searchBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },

  tabsWrap: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent: { paddingHorizontal: Layout.padding, paddingVertical: 12, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.bg },
  tabActive: { backgroundColor: Colors.blue },
  tabText: { ...Typography.smallBold, color: Colors.secondary },
  tabTextActive: { color: Colors.white },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 28, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 8 },
  emptyDesc: { ...Typography.body, color: Colors.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.blue, borderRadius: Layout.radius, paddingHorizontal: 28, paddingVertical: 14, ...Shadow.blue },
  emptyBtnText: { ...Typography.bodyBold, color: Colors.white },

  card: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trackingCode: { ...Typography.bodyBold, color: Colors.navy, letterSpacing: 0.3 },

  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cityPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  cityText: { ...Typography.smallBold, color: Colors.dark },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goodsText: { ...Typography.small, color: Colors.secondary },
  price: { ...Typography.bodyBold, color: Colors.success },

  receiverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bg, borderRadius: 10, padding: 10 },
  receiverText: { ...Typography.small, color: Colors.secondary },
});
