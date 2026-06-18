import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '@services/orders.api';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const CRITERIA = [
  { key: 'overallRating',   label: 'Đánh giá tổng thể', icon: '⭐' },
  { key: 'goodsCareRating', label: 'Chăm sóc hàng hóa',  icon: '📦' },
  { key: 'staffRating',     label: 'Thái độ nhân viên',   icon: '👤' },
  { key: 'timeRating',      label: 'Đúng giờ giao hàng',  icon: '⏱️' },
] as const;

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)}>
          <Text style={{ fontSize: 32, opacity: star <= value ? 1 : 0.25 }}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [ratings, setRatings] = useState({ overallRating: 5, goodsCareRating: 5, staffRating: 5, timeRating: 5 });
  const [comment, setComment] = useState('');

  const { data: existing } = useQuery({
    queryKey: ['review', id],
    queryFn: () => ordersApi.getReview(id),
  });

  const submit = useMutation({
    mutationFn: () => ordersApi.submitReview(id, { ...ratings, comment: comment.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id], exact: false });
      Alert.alert('🎉 Cảm ơn bạn!', 'Đánh giá của bạn đã được ghi nhận.', [
        { text: 'Về đơn hàng', onPress: () => router.back() },
      ]);
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể gửi đánh giá'),
  });

  const setRating = (key: keyof typeof ratings, val: number) =>
    setRatings((prev) => ({ ...prev, [key]: val }));

  const avgRating = Math.round((ratings.overallRating + ratings.goodsCareRating + ratings.staffRating + ratings.timeRating) / 4);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá nhà xe</Text>
        <View style={{ width: 36 }} />
      </View>

      {existing ? (
        /* Already reviewed */
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
          <View style={styles.doneCard}>
            <Text style={styles.doneIcon}>✅</Text>
            <Text style={styles.doneTitle}>Bạn đã đánh giá đơn này</Text>
            {CRITERIA.map((c) => (
              <View key={c.key} style={styles.doneRow}>
                <Text style={styles.doneLabel}>{c.icon} {c.label}</Text>
                <Text style={styles.doneStars}>{'⭐'.repeat(existing[c.key] ?? 0)}</Text>
              </View>
            ))}
            {existing.comment && (
              <View style={styles.commentDisplay}>
                <Text style={styles.doneLabel}>💬 Nhận xét</Text>
                <Text style={styles.commentText}>{existing.comment}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
          {/* Overall visual */}
          <View style={styles.heroCard}>
            <Text style={styles.heroStars}>{'⭐'.repeat(avgRating)}</Text>
            <Text style={styles.heroLabel}>Đánh giá trung bình: {avgRating}/5</Text>
          </View>

          {/* Ratings */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chấm điểm từng tiêu chí</Text>
            {CRITERIA.map((c) => (
              <View key={c.key} style={styles.criteriaRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.criteriaLabel}>{c.icon} {c.label}</Text>
                </View>
                <StarRow value={ratings[c.key]} onChange={(v) => setRating(c.key, v)} />
              </View>
            ))}
          </View>

          {/* Comment */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💬 Nhận xét (không bắt buộc)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Chia sẻ trải nghiệm của bạn về chuyến hàng này..."
              placeholderTextColor={Colors.placeholder}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>
        </ScrollView>
      )}

      {!existing && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            label="⭐ Gửi đánh giá"
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            variant="success"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: 22, color: Colors.dark },
  headerTitle: { ...Typography.h4, color: Colors.dark },

  heroCard: { backgroundColor: Colors.navy, borderRadius: Layout.radiusLg, padding: 24, marginBottom: 12, alignItems: 'center' },
  heroStars: { fontSize: 36, marginBottom: 8 },
  heroLabel: { ...Typography.bodyBold, color: Colors.white },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 16 },

  criteriaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  criteriaLabel: { ...Typography.body, color: Colors.dark },

  commentInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 14, ...Typography.body, color: Colors.dark, minHeight: 100, textAlignVertical: 'top' },
  charCount: { ...Typography.caption, color: Colors.secondary, textAlign: 'right', marginTop: 6 },

  doneCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  doneIcon: { fontSize: 48, marginBottom: 12 },
  doneTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 20 },
  doneRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  doneLabel: { ...Typography.small, color: Colors.secondary },
  doneStars: { ...Typography.body },
  commentDisplay: { width: '100%', marginTop: 12 },
  commentText: { ...Typography.body, color: Colors.dark, marginTop: 6 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row' },
});
