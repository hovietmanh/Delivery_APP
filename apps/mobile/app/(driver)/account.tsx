import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@store/auth.store';
import { driverApi } from '@services/driver.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ── Revenue chart helpers ─────────────────────────────────────────────────────

function groupRevenueByDay(orders: any[]): { label: string; amount: number }[] {
  const map: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = 0;
  }
  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (key in map) map[key] = (map[key] ?? 0) + (o.total ?? 0);
  }
  return Object.entries(map).map(([date, amount]) => ({
    label: date.slice(5), // MM-DD
    amount,
  }));
}

function RevenueChart({ orders }: { orders: any[] }) {
  const data = groupRevenueByDay(orders);
  const maxAmt = Math.max(...data.map((d) => d.amount), 1);
  const total = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartTotalRow}>
        <View>
          <Text style={styles.chartTotalLabel}>Tổng doanh thu</Text>
          <Text style={styles.chartTotalValue}>{total.toLocaleString('vi-VN')}đ</Text>
        </View>
        <View style={styles.chartOrderCount}>
          <Ionicons name="cube-outline" size={14} color={Colors.blue} style={{ marginRight: 4 }} />
          <Text style={styles.chartOrderCountText}>{orders.length} đơn thành công</Text>
        </View>
      </View>

      <Text style={styles.chartSubTitle}>7 ngày gần nhất</Text>
      <View style={styles.barsRow}>
        {data.map(({ label, amount }) => {
          const pct = maxAmt > 0 ? amount / maxAmt : 0;
          const barH = Math.max(pct * 90, 4);
          return (
            <View key={label} style={styles.barCol}>
              <Text style={styles.barAmt}>
                {amount > 0 ? `${Math.round(amount / 1000)}k` : ''}
              </Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barFill,
                  { height: barH, backgroundColor: amount > 0 ? Colors.blue : Colors.border }
                ]} />
              </View>
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Vehicle Info ──────────────────────────────────────────────────────────────

function VehicleInfo({ user }: { user: any }) {
  const rows = [
    { icon: 'card-outline' as IoniconsName, label: 'Biển số xe', value: user?.vehiclePlate ?? '—' },
    { icon: 'call-outline' as IoniconsName, label: 'SĐT đăng ký', value: user?.phone ?? '—' },
    { icon: 'bus-outline' as IoniconsName, label: 'Loại xe', value: user?.vehicleType ?? '—' },
    { icon: 'business-outline' as IoniconsName, label: 'Hãng xe / Nhà xe', value: user?.companyName ?? '—' },
  ];
  return (
    <View style={styles.inlineSection}>
      {rows.map(({ icon, label, value }, i) => (
        <View key={label} style={[styles.infoRow, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.bg }]}>
          <View style={styles.infoIconWrap}>
            <Ionicons name={icon} size={16} color={Colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Regulations ───────────────────────────────────────────────────────────────

const REGULATIONS = [
  { icon: 'shield-checkmark-outline' as IoniconsName, title: 'Trách nhiệm với hàng hóa', body: 'Tài xế chịu trách nhiệm đảm bảo hàng hóa nguyên vẹn từ khi nhận tại bến gửi đến khi giao tận tay người nhận. Hàng hư hỏng do vận chuyển sẽ bị trừ điểm và yêu cầu bồi thường.' },
  { icon: 'time-outline' as IoniconsName, title: 'Thời gian giao hàng', body: 'Phải giao hàng đúng theo lịch trình đã đăng ký. Chậm trễ quá 2 giờ so với dự kiến cần thông báo cho hệ thống và khách hàng.' },
  { icon: 'camera-outline' as IoniconsName, title: 'Chụp ảnh bằng chứng', body: 'Bắt buộc chụp ảnh hàng hóa khi nhận tại bến và khi giao cho người nhận. Ảnh không rõ ràng hoặc thiếu ảnh sẽ ảnh hưởng đến quá trình giải quyết khiếu nại.' },
  { icon: 'cash-outline' as IoniconsName, title: 'Thu tiền và thanh toán', body: 'Thu đúng số tiền hiển thị trong ứng dụng. Nghiêm cấm thu thêm phí ngoài quy định. Tiền thu được phải nộp về nhà xe theo định kỳ hàng tuần.' },
  { icon: 'star-outline' as IoniconsName, title: 'Đánh giá & chất lượng', body: 'Điểm đánh giá dưới 3.5 sao trong 30 ngày liên tiếp sẽ bị tạm đình chỉ hoạt động để rà soát. Phục vụ khách hàng lịch sự và chuyên nghiệp.' },
];

function RegulationsContent() {
  return (
    <View style={styles.inlineSection}>
      {REGULATIONS.map(({ icon, title, body }, i) => (
        <View key={title} style={[styles.regItem, i < REGULATIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.bg }]}>
          <View style={styles.regIconWrap}>
            <Ionicons name={icon} size={18} color={Colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.regTitle}>{title}</Text>
            <Text style={styles.regBody}>{body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DriverAccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: driverApi.getStats,
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const { data: deliveredOrders = [] } = useQuery({
    queryKey: ['driver-orders', 'DELIVERED'],
    queryFn: () => driverApi.getOrders('DELIVERED'),
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const onLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const initials = user?.fullName?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const toggle = (key: string) => setExpanded((prev) => (prev === key ? null : key));

  const MENU_ITEMS: { icon: IoniconsName; label: string; route?: string; key?: string; color: string }[] = [
    { icon: 'navigate-outline', label: 'Quản lý tuyến & Giờ chạy', route: '/(driver)/routes', color: Colors.blue },
    { icon: 'cash-outline', label: 'Thu nhập & Doanh thu', key: 'revenue', color: Colors.success },
    { icon: 'bus-outline', label: 'Thông tin xe', key: 'vehicle', color: Colors.orange },
    { icon: 'document-text-outline', label: 'Quy định vận chuyển', key: 'regulations', color: Colors.secondary },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
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

        {/* Stats */}
        <View style={styles.statsCard}>
          {[
            { icon: 'cube-outline' as IoniconsName, value: `${stats?.delivered ?? user?.totalDeliveries ?? 0}`, label: 'Đã giao', color: Colors.blue },
            { icon: 'star' as IoniconsName, value: '5.0', label: 'Đánh giá', color: '#F59E0B' },
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
            {MENU_ITEMS.map(({ icon, label, route, key, color }, i) => {
              const isOpen = expanded === key;
              return (
                <View key={label}>
                  <TouchableOpacity
                    style={[styles.menuItem, (i < MENU_ITEMS.length - 1 && !isOpen) && styles.menuItemBorder]}
                    onPress={() => key ? toggle(key) : route && router.push(route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: `${color}1A` }]}>
                      <Ionicons name={icon} size={20} color={color} />
                    </View>
                    <Text style={styles.menuLabel}>{label}</Text>
                    {key
                      ? <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.placeholder} />
                      : <Ionicons name="chevron-forward" size={18} color={Colors.placeholder} />
                    }
                  </TouchableOpacity>

                  {/* Expandable: Revenue */}
                  {key === 'revenue' && isOpen && (
                    <View style={styles.expandedSection}>
                      <RevenueChart orders={deliveredOrders as any[]} />
                    </View>
                  )}

                  {/* Expandable: Vehicle */}
                  {key === 'vehicle' && isOpen && (
                    <View style={styles.expandedSection}>
                      <VehicleInfo user={user} />
                    </View>
                  )}

                  {/* Expandable: Regulations */}
                  {key === 'regulations' && isOpen && (
                    <View style={styles.expandedSection}>
                      <RegulationsContent />
                    </View>
                  )}

                  {isOpen && i < MENU_ITEMS.length - 1 && <View style={styles.menuItemBorder} />}
                </View>
              );
            })}
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
    borderRadius: Layout.radiusLg, paddingVertical: 18, ...Shadow.lg,
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

  expandedSection: { backgroundColor: Colors.bg, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },

  // Revenue chart
  chartWrap: { backgroundColor: Colors.white, borderRadius: Layout.radiusSm, padding: 14 },
  chartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartTotalLabel: { ...Typography.caption, color: Colors.secondary, marginBottom: 2 },
  chartTotalValue: { ...Typography.h3, color: Colors.success },
  chartOrderCount: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.infoBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  chartOrderCountText: { ...Typography.caption, color: Colors.blue },
  chartSubTitle: { ...Typography.caption, color: Colors.placeholder, marginBottom: 10 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 },
  barCol: { flex: 1, alignItems: 'center' },
  barAmt: { ...Typography.caption, color: Colors.blue, fontSize: 9, marginBottom: 3, textAlign: 'center' },
  barTrack: { width: 20, height: 90, justifyContent: 'flex-end', backgroundColor: Colors.bg, borderRadius: 4, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { ...Typography.caption, color: Colors.secondary, fontSize: 9, marginTop: 4, textAlign: 'center' },

  // Vehicle info
  inlineSection: { backgroundColor: Colors.white, borderRadius: Layout.radiusSm, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  infoIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoLabel: { ...Typography.caption, color: Colors.secondary },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, marginTop: 1 },

  // Regulations
  regItem: { flexDirection: 'row', padding: 12, gap: 12 },
  regIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  regTitle: { ...Typography.smallBold, color: Colors.dark, marginBottom: 4 },
  regBody: { ...Typography.caption, color: Colors.secondary, lineHeight: 18 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: Layout.padding, marginTop: 24,
    backgroundColor: Colors.errorBg, borderRadius: Layout.radiusLg,
    padding: 16, ...Shadow.sm,
  },
  logoutText: { ...Typography.bodyBold, color: Colors.error },
  version: { ...Typography.caption, color: Colors.placeholder, textAlign: 'center', marginTop: 16 },
});
