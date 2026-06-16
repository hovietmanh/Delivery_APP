import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { vouchersApi } from '@services/vouchers.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

function formatExpiry(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function discountLabel(v: any) {
  if (v.discountType === 'PERCENT') {
    return `Giảm ${v.discountValue}%${v.maxDiscount ? ` tối đa ${(v.maxDiscount / 1000).toFixed(0)}K` : ''}`;
  }
  return `Giảm ${(v.discountValue / 1000).toFixed(0)}.000đ`;
}

export default function MyVouchersScreen() {
  const insets = useSafeAreaInsets();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['active-vouchers'],
    queryFn: vouchersApi.getActive,
  });

  const handleCopy = async (v: any) => {
    await Clipboard.setStringAsync(v.code);
    setCopiedId(v.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApply = () => {
    router.push('/(customer)/send' as any);
  };

  const isExpired = (v: any) => v.expiresAt && new Date(v.expiresAt) < new Date();
  const isFull = (v: any) => v.usedCount >= v.maxUses;
  const isAvailable = (v: any) => !isExpired(v) && !isFull(v);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mã giảm giá</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.blue} />
        </View>
      ) : vouchers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={styles.emptyTitle}>Chưa có mã giảm giá nào</Text>
          <Text style={styles.emptyDesc}>Các ưu đãi sẽ hiện ở đây khi có chương trình khuyến mãi</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}
        >
          <Text style={styles.subTitle}>{(vouchers as any[]).filter(isAvailable).length} mã đang có hiệu lực</Text>

          {(vouchers as any[]).map((v: any) => {
            const available = isAvailable(v);
            const copied = copiedId === v.id;

            return (
              <View key={v.id} style={[styles.card, !available && styles.cardUsed]}>
                {/* Left band */}
                <View style={[styles.band, !available && styles.bandUsed]}>
                  <Text style={styles.bandValue}>
                    {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${(v.discountValue / 1000).toFixed(0)}K`}
                  </Text>
                  <Text style={styles.bandLabel}>GIẢM</Text>
                </View>

                {/* Notch cutout effect */}
                <View style={styles.notchTop} />
                <View style={styles.notchBottom} />

                {/* Content */}
                <View style={styles.content}>
                  <View style={styles.codeRow}>
                    <Text style={[styles.code, !available && styles.codeUsed]}>{v.code}</Text>
                    {!available && (
                      <View style={styles.usedBadge}>
                        <Text style={styles.usedBadgeText}>
                          {isExpired(v) ? 'Hết hạn' : 'Hết lượt'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {v.description ? (
                    <Text style={styles.desc}>{v.description}</Text>
                  ) : null}

                  <Text style={styles.discount}>{discountLabel(v)}</Text>

                  <View style={styles.metaRow}>
                    {v.minOrderValue > 0 && (
                      <Text style={styles.meta}>Đơn từ {(v.minOrderValue / 1000).toFixed(0)}K</Text>
                    )}
                    {v.expiresAt && (
                      <Text style={[styles.meta, isExpired(v) && styles.metaExpired]}>
                        HSD: {formatExpiry(v.expiresAt)}
                      </Text>
                    )}
                  </View>

                  {/* Usage bar */}
                  <View style={styles.usageRow}>
                    <View style={styles.usageTrack}>
                      <View style={[
                        styles.usageFill,
                        { width: `${Math.min((v.usedCount / v.maxUses) * 100, 100)}%` as any },
                        !available && styles.usageFillUsed,
                      ]} />
                    </View>
                    <Text style={styles.usageText}>Còn {Math.max(v.maxUses - v.usedCount, 0)}/{v.maxUses} lượt</Text>
                  </View>

                  {/* Actions */}
                  {available && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.saveBtn, copied && styles.saveBtnCopied]}
                        onPress={() => handleCopy(v)}
                      >
                        <Text style={[styles.saveBtnText, copied && styles.saveBtnTextCopied]}>
                          {copied ? '✓ Đã sao chép' : 'Lưu mã'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                        <Text style={styles.applyBtnText}>Áp dụng →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.navy,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Layout.padding, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: Colors.white },
  headerTitle: { ...Typography.h3, color: Colors.white },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { ...Typography.h3, color: Colors.dark, textAlign: 'center' },
  emptyDesc: { ...Typography.body, color: Colors.secondary, textAlign: 'center', marginTop: 8 },

  subTitle: { ...Typography.small, color: Colors.secondary, marginBottom: 14 },

  card: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: Layout.radiusLg, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardUsed: { opacity: 0.6 },

  band: {
    width: 72, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20,
  },
  bandUsed: { backgroundColor: Colors.secondary },
  bandValue: { ...Typography.h2, color: Colors.white, fontSize: 22 },
  bandLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', fontSize: 9, letterSpacing: 1.5 },

  // Notch cutout circles on the divider
  notchTop: {
    position: 'absolute', left: 62, top: -10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.border,
  },
  notchBottom: {
    position: 'absolute', left: 62, bottom: -10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.border,
  },

  content: { flex: 1, padding: 14, paddingLeft: 18 },

  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  code: { ...Typography.h3, color: Colors.dark, letterSpacing: 1 },
  codeUsed: { color: Colors.secondary },

  usedBadge: { backgroundColor: Colors.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  usedBadgeText: { ...Typography.caption, color: Colors.secondary, fontSize: 10 },

  desc: { ...Typography.small, color: Colors.secondary, marginBottom: 4 },
  discount: { ...Typography.bodyBold, color: Colors.blue, marginBottom: 6 },

  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  meta: { ...Typography.caption, color: Colors.secondary, fontSize: 10 },
  metaExpired: { color: '#EF4444' },

  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  usageTrack: { flex: 1, height: 4, backgroundColor: Colors.bg, borderRadius: 2, overflow: 'hidden' },
  usageFill: { height: 4, backgroundColor: Colors.blue, borderRadius: 2 },
  usageFillUsed: { backgroundColor: Colors.secondary },
  usageText: { ...Typography.caption, color: Colors.secondary, fontSize: 10 },

  actions: { flexDirection: 'row', gap: 8 },
  saveBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.blue,
    borderRadius: Layout.radiusSm, paddingVertical: 8, alignItems: 'center',
  },
  saveBtnCopied: { backgroundColor: Colors.successBg, borderColor: Colors.success },
  saveBtnText: { ...Typography.smallBold, color: Colors.blue },
  saveBtnTextCopied: { color: Colors.success },
  applyBtn: {
    flex: 1, backgroundColor: Colors.blue,
    borderRadius: Layout.radiusSm, paddingVertical: 8, alignItems: 'center',
  },
  applyBtnText: { ...Typography.smallBold, color: Colors.white },
});
