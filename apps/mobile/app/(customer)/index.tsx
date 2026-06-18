import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, RefreshControl, Modal,
} from 'react-native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { ordersApi } from '@services/orders.api';
import { vouchersApi } from '@services/vouchers.api';
import { notificationsApi } from '@services/notifications.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const POPULAR_ROUTES = [
  { from: 'Hà Nội', to: 'TP.HCM', price: '15.000đ', time: '28–30 tiếng', icon: 'bus-outline' },
  { from: 'Hà Nội', to: 'Đà Nẵng', price: '12.000đ', time: '12–16 tiếng', icon: 'bus-outline' },
  { from: 'TP.HCM', to: 'Đà Nẵng', price: '10.000đ', time: '14–18 tiếng', icon: 'bus-outline' },
  { from: 'Hà Nội', to: 'Nghệ An', price: '8.000đ', time: '5–7 tiếng', icon: 'bus-outline' },
];

const QUICK_ACTIONS = [
  { icon: 'cube' as const, label: 'Gửi hàng', route: '/(customer)/send', color: Colors.blue, bg: Colors.infoBg },
  { icon: 'list' as const, label: 'Lịch sử', route: '/(customer)/orders', color: '#8B5CF6', bg: Colors.purpleBg },
  { icon: 'search' as const, label: 'Tra cứu', route: null, color: '#F97316', bg: Colors.orangeBg },
  { icon: 'headset' as const, label: 'Hỗ trợ', route: null, color: '#10B981', bg: Colors.greenBg },
];

export default function CustomerHome() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [trackCode, setTrackCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: recentOrders, refetch } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => ordersApi.getMyOrders(),
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ['active-vouchers'],
    queryFn: vouchersApi.getActive,
    staleTime: 5 * 60 * 1000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30000,
  });

  const activeOrder = recentOrders?.find(
    (o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status)
  );

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#0F172A', '#1E3A8A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.name}>{user?.fullName ?? 'Bạn ơi'}</Text>
            <Text style={styles.subheading}>Giao hàng liên tỉnh nhanh chóng</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/(customer)/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
            {(unreadCount as number) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{(unreadCount as number) > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Track input */}
        <View style={styles.trackBox}>
          <Text style={styles.trackLabel}>TRA CỨU VẬN ĐƠN</Text>
          <View style={styles.trackRow}>
            <View style={styles.trackInputWrap}>
              <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.trackInput}
                placeholder="Nhập mã vận đơn..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={trackCode}
                onChangeText={setTrackCode}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => {
                const code = trackCode.trim().toUpperCase();
                if (!code) return;
                router.push(`/(customer)/orders/${code}` as any);
              }}
            >
              <Text style={styles.trackBtnText}>Tra</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── Active order banner ── */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.push(`/(customer)/orders/${activeOrder.id}`)}
            activeOpacity={0.92}
          >
            <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={styles.activeBannerIcon}>
                <Ionicons name="bus" size={22} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBannerTitle}>Đơn đang vận chuyển</Text>
                <Text style={styles.activeBannerSub}>
                  {activeOrder.fromCity} → {activeOrder.toCity} · #{activeOrder.trackingCode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(({ icon, label, route, color, bg }) => (
              <TouchableOpacity
                key={label}
                style={styles.actionBtn}
                onPress={() => route && router.push(route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: bg }]}>
                  <Ionicons name={icon} size={26} color={color} />
                </View>
                <Text style={styles.actionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Voucher section ── */}
        {(vouchers as any[]).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ưu đãi dành cho bạn</Text>
              <View style={styles.countChip}>
                <Text style={styles.countText}>{(vouchers as any[]).length} mã</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voucherScroll} contentContainerStyle={{ paddingHorizontal: 2 }}>
              {(vouchers as any[]).map((v: any) => (
                <TouchableOpacity key={v.id} style={styles.voucherCard} onPress={() => { setCopied(false); setSelectedVoucher(v); }} activeOpacity={0.88}>
                  <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.voucherLeft}>
                    <Text style={styles.voucherValue}>
                      {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${(v.discountValue / 1000).toFixed(0)}K`}
                    </Text>
                    <Text style={styles.voucherValueLabel}>GIẢM</Text>
                  </LinearGradient>
                  <View style={styles.voucherRight}>
                    <Text style={styles.voucherCode}>{v.code}</Text>
                    {v.description ? <Text style={styles.voucherDesc} numberOfLines={1}>{v.description}</Text> : null}
                    <Text style={styles.voucherMin}>
                      {v.minOrderValue > 0 ? `Đơn từ ${(v.minOrderValue / 1000).toFixed(0)}K` : 'Không giới hạn'}
                    </Text>
                    {v.expiresAt && (
                      <Text style={styles.voucherExp}>
                        HSD: {new Date(v.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Popular Routes ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tuyến phổ biến</Text>
          </View>
          {POPULAR_ROUTES.map((route, i) => (
            <TouchableOpacity
              key={i}
              style={styles.routeCard}
              onPress={() => router.push({ pathname: '/(customer)/send', params: { from: route.from, to: route.to } } as any)}
              activeOpacity={0.88}
            >
              <View style={styles.routeIconWrap}>
                <Ionicons name={route.icon as any} size={22} color={Colors.blue} />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.from} → {route.to}</Text>
                <Text style={styles.routeMeta}>{route.time}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.routePrice}>{route.price}</Text>
                <Text style={styles.routePriceUnit}>/kg</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Send CTA ── */}
        <TouchableOpacity
          style={styles.sendCta}
          onPress={() => router.push('/(customer)/send')}
          activeOpacity={0.9}
        >
          <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <Ionicons name="cube-outline" size={22} color={Colors.white} style={{ marginRight: 10 }} />
          <Text style={styles.sendCtaText}>Gửi hàng ngay</Text>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Voucher modal ── */}
      <Modal visible={!!selectedVoucher} transparent animationType="slide" onRequestClose={() => setSelectedVoucher(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedVoucher(null)} />
        {selectedVoucher && (
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHero}>
              <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalBand}>
                <Text style={styles.modalBandValue}>
                  {selectedVoucher.discountType === 'PERCENT' ? `${selectedVoucher.discountValue}%` : `${(selectedVoucher.discountValue / 1000).toFixed(0)}K`}
                </Text>
                <Text style={styles.modalBandLabel}>GIẢM</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCode}>{selectedVoucher.code}</Text>
                {selectedVoucher.description ? <Text style={styles.modalDesc}>{selectedVoucher.description}</Text> : null}
                <Text style={styles.modalDiscount}>
                  {selectedVoucher.discountType === 'PERCENT'
                    ? `Giảm ${selectedVoucher.discountValue}%${selectedVoucher.maxDiscount ? ` tối đa ${(selectedVoucher.maxDiscount / 1000).toFixed(0)}K` : ''}`
                    : `Giảm ${(selectedVoucher.discountValue / 1000).toFixed(0)}.000đ`}
                </Text>
              </View>
            </View>

            <View style={styles.modalDetails}>
              {[
                { label: 'Đơn tối thiểu', value: selectedVoucher.minOrderValue > 0 ? `${(selectedVoucher.minOrderValue / 1000).toFixed(0)}.000đ` : 'Không giới hạn' },
                { label: 'Hạn sử dụng', value: selectedVoucher.expiresAt ? new Date(selectedVoucher.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn' },
                { label: 'Lượt còn lại', value: `${Math.max(selectedVoucher.maxUses - selectedVoucher.usedCount, 0)}/${selectedVoucher.maxUses}` },
              ].map(({ label, value }) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
              <View style={styles.usageRow}>
                <View style={styles.usageTrack}>
                  <View style={[styles.usageFill, { width: `${Math.min((selectedVoucher.usedCount / selectedVoucher.maxUses) * 100, 100)}%` as any }]} />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.copyBtn, copied && styles.copyBtnDone]}
                onPress={() => handleCopy(selectedVoucher.code)}
              >
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? Colors.success : Colors.blue} style={{ marginRight: 6 }} />
                <Text style={[styles.copyBtnText, copied && { color: Colors.success }]}>
                  {copied ? 'Đã sao chép' : 'Lưu mã'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => { setSelectedVoucher(null); router.push('/(customer)/send' as any); }}
              >
                <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Text style={styles.applyBtnText}>Áp dụng ngay</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Layout.padding,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { ...Typography.small, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  name: { ...Typography.h2, color: Colors.white, marginBottom: 2 },
  subheading: { ...Typography.caption, color: 'rgba(255,255,255,0.55)' },
  notifBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.error, borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2, borderWidth: 1.5, borderColor: Colors.navy,
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },

  trackBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Layout.radiusSm, padding: 14 },
  trackLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.55)', marginBottom: 10, letterSpacing: 1 },
  trackRow: { flexDirection: 'row', gap: 10 },
  trackInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  trackInput: { flex: 1, ...Typography.body, color: Colors.white },
  trackBtn: { backgroundColor: Colors.blue, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center', height: 44, ...Shadow.blue },
  trackBtnText: { ...Typography.bodyBold, color: Colors.white },

  activeBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Layout.padding, marginTop: 16,
    borderRadius: Layout.radiusLg, padding: 16,
    overflow: 'hidden', ...Shadow.blue,
  },
  activeBannerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  activeBannerTitle: { ...Typography.bodyBold, color: Colors.white, marginBottom: 3 },
  activeBannerSub: { ...Typography.caption, color: 'rgba(255,255,255,0.75)' },

  section: { paddingHorizontal: Layout.padding, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { ...Typography.h3, color: Colors.dark },
  countChip: { backgroundColor: Colors.blueGlass, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { ...Typography.caption, color: Colors.blue, fontWeight: '600' },

  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, ...Shadow.sm },
  actionLabel: { ...Typography.caption, color: Colors.dark, textAlign: 'center', fontWeight: '600' },

  voucherScroll: { marginHorizontal: -Layout.padding, paddingHorizontal: Layout.padding },
  voucherCard: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: Layout.radiusLg,
    marginRight: 12, overflow: 'hidden', width: 240,
    ...Shadow.md,
  },
  voucherLeft: { width: 70, alignItems: 'center', justifyContent: 'center', padding: 10 },
  voucherValue: { ...Typography.h3, color: Colors.white, fontSize: 22 },
  voucherValueLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', fontSize: 9, letterSpacing: 1.5 },
  voucherRight: { flex: 1, padding: 12, justifyContent: 'center' },
  voucherCode: { ...Typography.bodyBold, color: Colors.dark, letterSpacing: 0.5, marginBottom: 3 },
  voucherDesc: { ...Typography.caption, color: Colors.secondary },
  voucherMin: { ...Typography.caption, color: Colors.secondary, marginTop: 4, fontSize: 11 },
  voucherExp: { ...Typography.caption, color: Colors.warning, marginTop: 2, fontSize: 11 },

  routeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: 16, marginBottom: 10, ...Shadow.sm,
  },
  routeIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  routeInfo: { flex: 1 },
  routeName: { ...Typography.bodyBold, color: Colors.dark },
  routeMeta: { ...Typography.small, color: Colors.secondary, marginTop: 3 },
  routePrice: { ...Typography.price, color: Colors.blue },
  routePriceUnit: { ...Typography.caption, color: Colors.secondary, textAlign: 'right' },

  sendCta: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Layout.padding, marginTop: 24,
    borderRadius: Layout.radiusXl, padding: 18,
    overflow: 'hidden', ...Shadow.blue,
  },
  sendCtaText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Layout.padding, paddingTop: 14,
  },
  modalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 24 },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  modalBand: { width: 78, height: 78, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalBandValue: { ...Typography.h2, color: Colors.white, fontSize: 24 },
  modalBandLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', fontSize: 9, letterSpacing: 1.5 },
  modalCode: { ...Typography.h3, color: Colors.dark, letterSpacing: 1, marginBottom: 4 },
  modalDesc: { ...Typography.small, color: Colors.secondary, marginBottom: 4 },
  modalDiscount: { ...Typography.bodyBold, color: Colors.blue },
  modalDetails: { backgroundColor: Colors.bg, borderRadius: Layout.radiusSm, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { ...Typography.body, color: Colors.secondary },
  detailValue: { ...Typography.bodyBold, color: Colors.dark },
  usageRow: { paddingVertical: 12 },
  usageTrack: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: 5, backgroundColor: Colors.blue, borderRadius: 3 },
  modalActions: { flexDirection: 'row', gap: 10 },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.blue, borderRadius: Layout.radius, paddingVertical: 14 },
  copyBtnDone: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  copyBtnText: { ...Typography.bodyBold, color: Colors.blue },
  applyBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: Layout.radius, paddingVertical: 14, overflow: 'hidden', ...Shadow.blue },
  applyBtnText: { ...Typography.bodyBold, color: Colors.white },
});
