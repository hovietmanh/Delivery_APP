import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, RefreshControl, Modal,
} from 'react-native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { ordersApi } from '@services/orders.api';
import { vouchersApi } from '@services/vouchers.api';
import { notificationsApi } from '@services/notifications.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const POPULAR_ROUTES = [
  { from: 'Hà Nội', to: 'TP.HCM', price: '15.000đ', time: '28-30 tiếng', count: 3 },
  { from: 'Hà Nội', to: 'Đà Nẵng', price: '12.000đ', time: '12-16 tiếng', count: 5 },
  { from: 'TP.HCM', to: 'Đà Nẵng', price: '10.000đ', time: '14-18 tiếng', count: 4 },
  { from: 'Hà Nội', to: 'Nghệ An', price: '8.000đ', time: '5-7 tiếng', count: 6 },
];

const QUICK_ACTIONS = [
  { icon: '📦', label: 'Gửi hàng', route: '/(customer)/send' },
  { icon: '📋', label: 'Lịch sử', route: '/(customer)/orders' },
  { icon: '🔍', label: 'Tra cứu', route: null },
  { icon: '💬', label: 'Hỗ trợ', route: null },
] as const;

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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Xin chào, 👋</Text>
            <Text style={styles.name}>{user?.fullName ?? 'Bạn ơi'}</Text>
            <Text style={styles.subheading}>Giao hàng liên tỉnh nhanh chóng</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(customer)/notifications')}
            >
              <Text style={styles.iconEmoji}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick track */}
        <View style={styles.trackBox}>
          <Text style={styles.trackLabel}>TRA CỨU ĐƠN HÀNG NHANH</Text>
          <View style={styles.trackRow}>
            <TextInput
              style={styles.trackInput}
              placeholder="Nhập mã vận đơn..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={trackCode}
              onChangeText={setTrackCode}
              autoCapitalize="characters"
            />
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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Active order banner ── */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.push(`/(customer)/orders/${activeOrder.id}`)}
          >
            <View>
              <Text style={styles.activeBannerTitle}>🚌 Đơn đang vận chuyển</Text>
              <Text style={styles.activeBannerSub}>
                {activeOrder.fromCity} → {activeOrder.toCity} · #{activeOrder.trackingCode}
              </Text>
            </View>
            <Text style={styles.activeBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(({ icon, label, route }) => (
              <TouchableOpacity
                key={label}
                style={styles.actionBtn}
                onPress={() => route && router.push(route as any)}
              >
                <View style={styles.actionIcon}><Text style={styles.actionEmoji}>{icon}</Text></View>
                <Text style={styles.actionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Voucher section ── */}
        {vouchers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎁 Ưu đãi dành cho bạn</Text>
              <Text style={styles.voucherCount}>{vouchers.length} mã</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voucherScroll}>
              {(vouchers as any[]).map((v: any) => (
                <TouchableOpacity key={v.id} style={styles.voucherCard} onPress={() => { setCopied(false); setSelectedVoucher(v); }} activeOpacity={0.8}>
                  <View style={styles.voucherLeft}>
                    <Text style={styles.voucherValue}>
                      {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${(v.discountValue / 1000).toFixed(0)}K`}
                    </Text>
                    <Text style={styles.voucherValueLabel}>GIẢM</Text>
                  </View>
                  <View style={styles.voucherDivider} />
                  <View style={styles.voucherRight}>
                    <Text style={styles.voucherCode}>{v.code}</Text>
                    {v.description ? (
                      <Text style={styles.voucherDesc} numberOfLines={1}>{v.description}</Text>
                    ) : null}
                    {v.minOrderValue > 0 ? (
                      <Text style={styles.voucherMin}>Đơn từ {(v.minOrderValue / 1000).toFixed(0)}K</Text>
                    ) : (
                      <Text style={styles.voucherMin}>Không giới hạn đơn</Text>
                    )}
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
            <TouchableOpacity><Text style={styles.seeAll}>Xem tất cả</Text></TouchableOpacity>
          </View>

          {POPULAR_ROUTES.map((route, i) => (
            <TouchableOpacity
              key={i}
              style={styles.routeCard}
              onPress={() => router.push({ pathname: '/(customer)/send', params: { from: route.from, to: route.to } } as any)}
            >
              <Text style={styles.routeFlag}>🏙️</Text>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.from} → {route.to}</Text>
                <Text style={styles.routeMeta}>🚌 {route.count} xe · ⏱ {route.time}</Text>
              </View>
              <View>
                <Text style={styles.routePrice}>{route.price}</Text>
                <Text style={styles.routePriceUnit}>/kg</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Gửi hàng ngay ── */}
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={() => router.push('/(customer)/send')}
        >
          <Text style={styles.sendBtnText}>+ Gửi hàng ngay</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>

      {/* ── Voucher detail modal ── */}
      <Modal
        visible={!!selectedVoucher}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVoucher(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedVoucher(null)} />
        {selectedVoucher && (
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />

            {/* Band + code */}
            <View style={styles.modalHero}>
              <View style={styles.modalBand}>
                <Text style={styles.modalBandValue}>
                  {selectedVoucher.discountType === 'PERCENT'
                    ? `${selectedVoucher.discountValue}%`
                    : `${(selectedVoucher.discountValue / 1000).toFixed(0)}K`}
                </Text>
                <Text style={styles.modalBandLabel}>GIẢM</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCode}>{selectedVoucher.code}</Text>
                {selectedVoucher.description ? (
                  <Text style={styles.modalDesc}>{selectedVoucher.description}</Text>
                ) : null}
                <Text style={styles.modalDiscount}>
                  {selectedVoucher.discountType === 'PERCENT'
                    ? `Giảm ${selectedVoucher.discountValue}%${selectedVoucher.maxDiscount ? ` tối đa ${(selectedVoucher.maxDiscount / 1000).toFixed(0)}K` : ''}`
                    : `Giảm ${(selectedVoucher.discountValue / 1000).toFixed(0)}.000đ`}
                </Text>
              </View>
            </View>

            {/* Chi tiết */}
            <View style={styles.modalDetails}>
              {[
                { label: 'Đơn tối thiểu', value: selectedVoucher.minOrderValue > 0 ? `${(selectedVoucher.minOrderValue / 1000).toFixed(0)}.000đ` : 'Không giới hạn' },
                { label: 'Hạn sử dụng', value: selectedVoucher.expiresAt ? new Date(selectedVoucher.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn' },
                { label: 'Lượt còn lại', value: `${Math.max(selectedVoucher.maxUses - selectedVoucher.usedCount, 0)}/${selectedVoucher.maxUses} lượt` },
              ].map(({ label, value }) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
              {/* Usage bar */}
              <View style={styles.usageRow}>
                <View style={styles.usageTrack}>
                  <View style={[styles.usageFill, { width: `${Math.min((selectedVoucher.usedCount / selectedVoucher.maxUses) * 100, 100)}%` as any }]} />
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.copyBtn, copied && styles.copyBtnDone]}
                onPress={() => handleCopy(selectedVoucher.code)}
              >
                <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>
                  {copied ? '✓ Đã sao chép' : '📋 Lưu mã'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => { setSelectedVoucher(null); router.push('/(customer)/send' as any); }}
              >
                <Text style={styles.applyBtnText}>Áp dụng ngay →</Text>
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
    backgroundColor: Colors.navy,
    paddingHorizontal: Layout.padding,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { ...Typography.small, color: 'rgba(255,255,255,0.7)' },
  name: { ...Typography.h2, color: Colors.white },
  subheading: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerIcons: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  iconBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  iconEmoji: { fontSize: 20 },
  badge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 2, borderColor: Colors.navy,
  },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '700', lineHeight: 13 },

  trackBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Layout.radius, padding: 12 },
  trackLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: 1 },
  trackRow: { flexDirection: 'row', gap: 8 },
  trackInput: { flex: 1, ...Typography.body, color: Colors.white, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  trackBtn: { backgroundColor: Colors.blue, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  trackBtnText: { ...Typography.bodyBold, color: Colors.white },

  activeBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.infoBg, borderLeftWidth: 4, borderLeftColor: Colors.blue,
    margin: Layout.padding, borderRadius: Layout.radiusSm, padding: 14,
  },
  activeBannerTitle: { ...Typography.bodyBold, color: Colors.blue },
  activeBannerSub: { ...Typography.small, color: Colors.secondary, marginTop: 2 },
  activeBannerArrow: { fontSize: 20, color: Colors.blue },

  section: { paddingHorizontal: Layout.padding, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { ...Typography.h3, color: Colors.dark },
  seeAll: { ...Typography.small, color: Colors.blue, paddingTop: 2 },

  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIcon: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: Colors.white, alignItems: 'center',
    justifyContent: 'center', marginBottom: 6,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  actionEmoji: { fontSize: 28 },
  actionLabel: { ...Typography.small, color: Colors.dark, textAlign: 'center' },

  voucherCount: { ...Typography.small, color: Colors.secondary },
  voucherScroll: { marginHorizontal: -Layout.padding, paddingHorizontal: Layout.padding },
  voucherCard: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: Layout.radiusLg, borderWidth: 1, borderColor: Colors.border,
    marginRight: 12, overflow: 'hidden', width: 240,
  },
  voucherLeft: {
    backgroundColor: Colors.blue, width: 64,
    alignItems: 'center', justifyContent: 'center', padding: 10,
  },
  voucherValue: { ...Typography.h3, color: Colors.white, fontSize: 20 },
  voucherValueLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', fontSize: 9, letterSpacing: 1 },
  voucherDivider: { width: 1, backgroundColor: Colors.border },
  voucherRight: { flex: 1, padding: 10, justifyContent: 'center' },
  voucherCode: { ...Typography.bodyBold, color: Colors.dark, letterSpacing: 0.5 },
  voucherDesc: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  voucherMin: { ...Typography.caption, color: Colors.secondary, marginTop: 3, fontSize: 10 },
  voucherExp: { ...Typography.caption, color: Colors.warning ?? '#F59E0B', marginTop: 2, fontSize: 10 },

  routeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  routeFlag: { fontSize: 32, marginRight: 12 },
  routeInfo: { flex: 1 },
  routeName: { ...Typography.bodyBold, color: Colors.dark },
  routeMeta: { ...Typography.small, color: Colors.secondary, marginTop: 3 },
  routePrice: { ...Typography.price, color: Colors.blue, textAlign: 'right' },
  routePriceUnit: { ...Typography.caption, color: Colors.secondary, textAlign: 'right' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Layout.padding, paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  modalBand: {
    width: 72, height: 72, borderRadius: 16,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
  },
  modalBandValue: { ...Typography.h2, color: Colors.white, fontSize: 22 },
  modalBandLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', fontSize: 9, letterSpacing: 1.5 },
  modalCode: { ...Typography.h3, color: Colors.dark, letterSpacing: 1, marginBottom: 4 },
  modalDesc: { ...Typography.small, color: Colors.secondary, marginBottom: 4 },
  modalDiscount: { ...Typography.bodyBold, color: Colors.blue },
  modalDetails: {
    backgroundColor: Colors.bg, borderRadius: Layout.radiusSm,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  detailLabel: { ...Typography.body, color: Colors.secondary },
  detailValue: { ...Typography.bodyBold, color: Colors.dark },
  usageRow: { paddingVertical: 10 },
  usageTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  usageFill: { height: 4, backgroundColor: Colors.blue, borderRadius: 2 },
  modalActions: { flexDirection: 'row', gap: 10 },
  copyBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.blue,
    borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center',
  },
  copyBtnDone: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  copyBtnText: { ...Typography.bodyBold, color: Colors.blue },
  copyBtnTextDone: { color: Colors.success },
  applyBtn: {
    flex: 1, backgroundColor: Colors.blue,
    borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center',
  },
  applyBtnText: { ...Typography.bodyBold, color: Colors.white },

  sendBtn: {
    alignSelf: 'center',
    backgroundColor: Colors.blue, borderRadius: 28,
    paddingHorizontal: 40, paddingVertical: 16,
    marginTop: 24, marginBottom: 8,
    shadowColor: Colors.blue, shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  sendBtnText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },
});
