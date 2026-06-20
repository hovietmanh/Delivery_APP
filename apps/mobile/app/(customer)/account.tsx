import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/auth.store';
import { ordersApi } from '@services/orders.api';
import { vouchersApi } from '@services/vouchers.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_GROUPS = [
  {
    title: 'Tài khoản',
    items: [
      { icon: 'person-circle-outline' as IoniconsName, label: 'Thông tin cá nhân', route: '/(customer)/profile-edit', color: Colors.blue },
      { icon: 'notifications-outline' as IoniconsName, label: 'Thông báo', route: '/(customer)/notifications', color: '#8B5CF6' },
      { icon: 'location-outline' as IoniconsName, label: 'Địa chỉ đã lưu', route: '/(customer)/saved-addresses', color: Colors.orange },
    ],
  },
  {
    title: 'Ưu đãi & Thanh toán',
    items: [
      { icon: 'pricetag-outline' as IoniconsName, label: 'Mã giảm giá của tôi', route: '/(customer)/my-vouchers', color: Colors.success },
      { icon: 'time-outline' as IoniconsName, label: 'Lịch sử đơn hàng', route: '/(customer)/orders', color: Colors.blue },
    ],
  },
  {
    title: 'Khác',
    items: [
      { icon: 'headset-outline' as IoniconsName, label: 'Hỗ trợ & Liên hệ', route: '/(customer)/support', color: '#10B981' },
      { icon: 'document-text-outline' as IoniconsName, label: 'Điều khoản sử dụng', route: '/(customer)/terms', color: Colors.secondary },
    ],
  },
];

const ACTIVE_STATUSES = ['CONFIRMED', 'PICKING_UP', 'AT_STATION', 'IN_TRANSIT', 'ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders', ''],
    queryFn: () => ordersApi.getMyOrders(),
    staleTime: 30_000,
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ['vouchers-active'],
    queryFn: vouchersApi.getActive,
    staleTime: 60_000,
  });

  const activeOrderCount = (allOrders as any[]).filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const voucherCount = (vouchers as any[]).length;
  const avgRating = user?.rating ?? 5.0;

  const onLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const initials = user?.fullName?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const stats = [
    { icon: 'cube-outline' as IoniconsName, value: String(activeOrderCount), label: 'Đơn gửi', color: Colors.blue },
    { icon: 'star-outline' as IoniconsName, value: avgRating.toFixed(1), label: 'Đánh giá', color: '#F59E0B' },
    { icon: 'pricetag-outline' as IoniconsName, value: String(voucherCount), label: 'Voucher', color: Colors.success },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <LinearGradient
          colors={['#0F172A', '#1E3A8A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}
        >
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
        </LinearGradient>

        {/* Quick stats */}
        <View style={styles.statsCard}>
          {stats.map(({ icon, value, label, color }) => (
            <View key={label} style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: `${color}1A` }]}>
                <Ionicons name={icon} size={18} color={color} />
              </View>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Menu groups */}
        {MENU_GROUPS.map((group) => (
          <View key={group.title} style={styles.groupWrap}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.menuCard}>
              {group.items.map(({ icon, label, route, color }, i) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.menuItem, i < group.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => route && router.push(route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: `${color}1A` }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <Text style={styles.menuLabel}>{label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.placeholder} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Delilog v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: { alignItems: 'center', paddingBottom: 36, paddingHorizontal: Layout.padding },
  avatarRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, color: Colors.white, fontWeight: '700' },
  name: { ...Typography.h3, color: Colors.white, marginBottom: 4 },
  phone: { ...Typography.body, color: 'rgba(255,255,255,0.65)' },

  statsCard: {
    flexDirection: 'row', backgroundColor: Colors.white,
    marginHorizontal: Layout.padding, marginTop: -20,
    borderRadius: Layout.radiusLg, paddingVertical: 18,
    ...Shadow.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { ...Typography.h4, color: Colors.dark },
  statLabel: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },

  groupWrap: { paddingHorizontal: Layout.padding, marginTop: 20 },
  groupTitle: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 10, letterSpacing: 0.5 },
  menuCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, overflow: 'hidden', ...Shadow.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.bg },
  menuIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { ...Typography.body, color: Colors.dark, flex: 1 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: Layout.padding, marginTop: 24,
    backgroundColor: Colors.errorBg, borderRadius: Layout.radiusLg,
    padding: 16, ...Shadow.sm,
  },
  logoutText: { ...Typography.bodyBold, color: Colors.error },
  version: { ...Typography.caption, color: Colors.placeholder, textAlign: 'center', marginTop: 16 },
});
