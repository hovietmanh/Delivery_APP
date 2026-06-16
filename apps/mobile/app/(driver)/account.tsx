import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const MENU_ITEMS = [
  { icon: '🗺️', label: 'Quản lý tuyến & Giờ chạy', route: '/(driver)/routes' },
  { icon: '📊', label: 'Thống kê chuyến', route: null },
  { icon: '💰', label: 'Thu nhập & Hoa hồng', route: null },
  { icon: '🚌', label: 'Thông tin xe', route: null },
  { icon: '💬', label: 'Hỗ trợ kỹ thuật', route: null },
  { icon: '📋', label: 'Quy định vận chuyển', route: null },
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Profile header */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <View style={styles.driverBadge}>
            <Text style={styles.driverBadgeText}>🚌 Tài xế nhà xe</Text>
          </View>
          {user?.vehiclePlate && (
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{user.vehiclePlate}</Text>
            </View>
          )}
          {user?.companyName && (
            <Text style={styles.company}>{user.companyName}</Text>
          )}
        </View>

        {/* Driver stats */}
        <View style={styles.statsCard}>
          {[
            { value: user?.totalDeliveries ?? 0, label: 'Đơn đã giao' },
            { value: `${user?.rating?.toFixed(1) ?? '—'}⭐`, label: 'Đánh giá' },
            { value: user?.totalTrips ?? 0, label: 'Chuyến đi' },
          ].map(({ value, label }) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map(({ icon, label, route }, i) => (
            <TouchableOpacity
              key={label}
              style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              onPress={() => route && router.push(route as any)}
            >
              <Text style={styles.menuIcon}>{icon}</Text>
              <Text style={styles.menuLabel}>{label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Delilog Driver v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: { backgroundColor: Colors.navy, alignItems: 'center', paddingBottom: 32, paddingHorizontal: Layout.padding },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, color: Colors.white, fontWeight: '700' },
  name: { ...Typography.h3, color: Colors.white, marginBottom: 8 },
  driverBadge: { backgroundColor: Colors.blue + '40', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  driverBadgeText: { ...Typography.small, color: Colors.white },
  plateBadge: { backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  plateText: { ...Typography.bodyBold, color: Colors.navy, letterSpacing: 1 },
  company: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },

  statsCard: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Layout.padding, marginTop: -20, borderRadius: Layout.radiusLg, paddingVertical: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h4, color: Colors.dark },
  statLabel: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },

  menuCard: { backgroundColor: Colors.white, margin: Layout.padding, borderRadius: Layout.radiusLg, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.bg },
  menuIcon: { fontSize: 22, marginRight: 14 },
  menuLabel: { ...Typography.body, color: Colors.dark, flex: 1 },
  menuArrow: { fontSize: 20, color: Colors.secondary },

  logoutBtn: { marginHorizontal: Layout.padding, borderRadius: Layout.radius, padding: 16, backgroundColor: Colors.errorBg, alignItems: 'center' },
  logoutText: { ...Typography.bodyBold, color: Colors.error },
  version: { ...Typography.caption, color: Colors.placeholder, textAlign: 'center', marginTop: 16 },
});
