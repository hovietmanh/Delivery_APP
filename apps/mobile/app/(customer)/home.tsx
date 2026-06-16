import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@services/orders.api';
import { useAuthStore } from '@store/auth.store';

export default function CustomerHome() {
  const { user, logout } = useAuthStore();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getMyOrders(),
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.newOrderBtn}
        onPress={() => router.push('/(customer)/new-order')}
      >
        <Text style={styles.newOrderBtnText}>+ Tạo đơn giao hàng mới</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Đơn hàng của bạn</Text>

      {isLoading && <Text style={styles.loading}>Đang tải...</Text>}

      {orders?.map((order: any) => (
        <TouchableOpacity
          key={order.id}
          style={styles.orderCard}
          onPress={() => router.push(`/(customer)/order/${order.id}`)}
        >
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
            <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
              <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
            </View>
          </View>
          <Text style={styles.address} numberOfLines={1}>{order.deliveryAddress}</Text>
          <Text style={styles.price}>{order.total.toLocaleString('vi-VN')}đ</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Chờ tài xế',
    ACCEPTED: 'Đã nhận',
    PICKING_UP: 'Đang lấy hàng',
    IN_TRANSIT: 'Đang giao',
    DELIVERED: 'Đã giao',
    CANCELLED: 'Đã hủy',
  };
  return labels[status] ?? status;
}

function getStatusStyle(status: string) {
  const colors: Record<string, object> = {
    PENDING: { backgroundColor: '#fef3c7' },
    ACCEPTED: { backgroundColor: '#dbeafe' },
    IN_TRANSIT: { backgroundColor: '#dcfce7' },
    DELIVERED: { backgroundColor: '#d1fae5' },
    CANCELLED: { backgroundColor: '#fee2e2' },
  };
  return colors[status] ?? {};
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 24, backgroundColor: '#fff',
  },
  greeting: { color: '#6b7280', fontSize: 14 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  logout: { color: '#FF6B35', fontWeight: '500' },
  newOrderBtn: {
    margin: 16, backgroundColor: '#FF6B35',
    borderRadius: 16, padding: 20, alignItems: 'center',
  },
  newOrderBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', margin: 16, color: '#111' },
  loading: { textAlign: 'center', color: '#9ca3af', marginTop: 32 },
  orderCard: {
    backgroundColor: '#fff', margin: 8, marginHorizontal: 16,
    borderRadius: 12, padding: 16, elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontWeight: '600', color: '#374151' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  address: { color: '#6b7280', marginBottom: 8 },
  price: { fontWeight: '700', color: '#FF6B35', fontSize: 16 },
});
