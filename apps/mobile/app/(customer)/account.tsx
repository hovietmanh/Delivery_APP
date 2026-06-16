import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const MENU_ITEMS = [
  { icon: '👤', label: 'Thông tin tài khoản', route: '/(customer)/profile-edit' },
  { icon: '📦', label: 'Lịch sử đơn hàng', route: '/(customer)/orders' },
  { icon: '🔔', label: 'Thông báo', route: '/(customer)/notifications' },
  { icon: '📍', label: 'Địa chỉ đã lưu', route: '/(customer)/saved-addresses' },
  { icon: '💳', label: 'Phương thức thanh toán', route: null },
  { icon: '🎁', label: 'Mã giảm giá của tôi', route: '/(customer)/my-vouchers' },
  { icon: '💬', label: 'Hỗ trợ & Liên hệ', route: null },
  { icon: '📋', label: 'Điều khoản sử dụng', route: '/(customer)/terms' },
];

export default function AccountScreen() {
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
          <Text style={styles.phone}>{user?.phone}</Text>
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

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Delilog v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: { backgroundColor: Colors.navy, alignItems: 'center', paddingBottom: 32, paddingHorizontal: Layout.padding },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, color: Colors.white, fontWeight: '700' },
  name: { ...Typography.h3, color: Colors.white },
  phone: { ...Typography.body, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
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
