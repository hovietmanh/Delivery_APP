import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: { icon: IoniconsName; label: string; route: string | null; color: string }[] = [
  { icon: 'navigate-outline', label: 'Quản lý tuyến & Giờ chạy', route: '/(driver)/routes', color: Colors.blue },
  { icon: 'bar-chart-outline', label: 'Thống kê chuyến', route: null, color: '#8B5CF6' },
  { icon: 'cash-outline', label: 'Thu nhập & Hoa hồng', route: null, color: Colors.success },
  { icon: 'bus-outline', label: 'Thông tin xe', route: null, color: Colors.orange },
  { icon: 'headset-outline', label: 'Hỗ trợ kỹ thuật', route: null, color: '#10B981' },
  { icon: 'document-text-outline', label: 'Quy định vận chuyển', route: null, color: Colors.secondary },
];

export default function DriverAccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const onLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const initials = user?.fullName?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Driver profile header */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}
        >
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <View style={styles.driverBadge}>
            <Ionicons name="bus" size={13} color={Colors.blueLight} style={{ marginRight: 5 }} />
            <Text style={styles.driverBadgeText}>Tài xế nhà xe</Text>
          </View>
          {user?.vehiclePlate && (
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{user.vehiclePlate}</Text>
            </View>
          )}
          {user?.companyName && <Text style={styles.company}>{user.companyName}</Text>}
        </LinearGradient>

        {/* Stats card */}
        <View style={styles.statsCard}>
          {[
            { icon: 'cube-outline' as IoniconsName, value: `${user?.totalDeliveries ?? 0}`, label: 'Đã giao', color: Colors.blue },
            { icon: 'star' as IoniconsName, value: user?.rating ? `${user.rating.toFixed(1)}` : '—', label: 'Đánh giá', color: '#F59E0B' },
            { icon: 'map-outline' as IoniconsName, value: `${user?.totalTrips ?? 0}`, label: 'Chuyến đi', color: Colors.success },
          ].map(({ icon, value, label, color }) => (
            <View key={label} style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: `${color}1A` }]}>
                <Ionicons name={icon} size={18} color={color} />
              </View>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuWrap}>
          <Text style={styles.groupTitle}>Công cụ & Cài đặt</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map(({ icon, label, route, color }, i) => (
              <TouchableOpacity
                key={label}
                style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
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

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Delilog Driver v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: { alignItems: 'center', paddingBottom: 36, paddingHorizontal: Layout.padding },
  avatarRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59,130,246,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, color: Colors.white, fontWeight: '700' },
  name: { ...Typography.h3, color: Colors.white, marginBottom: 8 },
  driverBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(96,165,250,0.15)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  driverBadgeText: { ...Typography.smallBold, color: Colors.blueLight },
  plateBadge: { backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, marginBottom: 6 },
  plateText: { ...Typography.bodyBold, color: Colors.navy, letterSpacing: 2 },
  company: { ...Typography.caption, color: 'rgba(255,255,255,0.55)' },

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

  menuWrap: { paddingHorizontal: Layout.padding, marginTop: 24 },
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
