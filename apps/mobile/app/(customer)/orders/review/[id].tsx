import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '@services/orders.api';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CRITERIA: { key: 'overallRating' | 'goodsCareRating' | 'staffRating' | 'timeRating'; label: string; icon: IoniconsName; color: string }[] = [
  { key: 'overallRating',   label: 'Đánh giá tổng thể', icon: 'star-outline',        color: '#F59E0B' },
  { key: 'goodsCareRating', label: 'Chăm sóc hàng hóa', icon: 'cube-outline',        color: Colors.blue },
  { key: 'staffRating',     label: 'Thái độ nhân viên',  icon: 'person-circle-outline', color: '#8B5CF6' },
  { key: 'timeRating',      label: 'Đúng giờ giao hàng', icon: 'time-outline',        color: Colors.success },
];

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)}>
          <Ionicons name={star <= value ? 'star' : 'star-outline'} size={28} color={star <= value ? '#F59E0B' : Colors.border} />
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
      Alert.alert('Cảm ơn bạn!', 'Đánh giá của bạn đã được ghi nhận.', [
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
      <LinearGradient colors={['#0F172A', '#1E3A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá nhà xe</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {existing ? (
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
          <View style={styles.doneCard}>
            <View style={styles.doneIconWrap}>
              <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
            </View>
            <Text style={styles.doneTitle}>Bạn đã đánh giá đơn này</Text>
            {CRITERIA.map((c) => (
              <View key={c.key} style={styles.doneRow}>
                <View style={styles.doneLabelRow}>
                  <View style={[styles.doneIconBadge, { backgroundColor: `${c.color}1A` }]}>
                    <Ionicons name={c.icon} size={14} color={c.color} />
                  </View>
                  <Text style={styles.doneLabel}>{c.label}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name={s <= (existing[c.key] ?? 0) ? 'star' : 'star-outline'} size={14} color={s <= (existing[c.key] ?? 0) ? '#F59E0B' : Colors.border} />
                  ))}
                </View>
              </View>
            ))}
            {existing.comment && (
              <View style={styles.commentDisplay}>
                <View style={styles.commentLabelRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.secondary} style={{ marginRight: 6 }} />
                  <Text style={styles.doneLabel}>Nhận xét của bạn</Text>
                </View>
                <Text style={styles.commentText}>{existing.comment}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
          {/* Hero rating */}
          <View style={styles.heroCard}>
            <View style={styles.heroStarsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= avgRating ? 'star' : 'star-outline'} size={32} color={s <= avgRating ? '#F59E0B' : 'rgba(255,255,255,0.3)'} />
              ))}
            </View>
            <Text style={styles.heroLabel}>Đánh giá trung bình: {avgRating}/5</Text>
          </View>

          {/* Ratings */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleIcon}>
                <Ionicons name="trophy-outline" size={16} color={Colors.blue} />
              </View>
              <Text style={styles.cardTitle}>Chấm điểm từng tiêu chí</Text>
            </View>
            {CRITERIA.map((c, i) => (
              <View key={c.key} style={[styles.criteriaRow, i === CRITERIA.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.criteriaLabelWrap}>
                  <View style={[styles.criteriaIcon, { backgroundColor: `${c.color}1A` }]}>
                    <Ionicons name={c.icon} size={16} color={c.color} />
                  </View>
                  <Text style={styles.criteriaLabel}>{c.label}</Text>
                </View>
                <StarRow value={ratings[c.key]} onChange={(v) => setRating(c.key, v)} />
              </View>
            ))}
          </View>

          {/* Comment */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.blue} />
              </View>
              <Text style={styles.cardTitle}>Nhận xét (không bắt buộc)</Text>
            </View>
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
          <TouchableOpacity
            style={[styles.submitBtn, submit.isPending && { opacity: 0.7 }]}
            onPress={() => submit.mutate()}
            disabled={submit.isPending}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>Gửi đánh giá</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 14 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  headerTitle: { ...Typography.h4, color: Colors.white },

  heroCard: { backgroundColor: Colors.navy, borderRadius: Layout.radiusLg, padding: 24, marginBottom: 14, alignItems: 'center', ...Shadow.blue },
  heroStarsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  heroLabel: { ...Typography.bodyBold, color: Colors.white },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitleIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardTitle: { ...Typography.h4, color: Colors.dark },

  criteriaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  criteriaLabelWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  criteriaIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  criteriaLabel: { ...Typography.body, color: Colors.dark },

  commentInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 14, ...Typography.body, color: Colors.dark, minHeight: 100, textAlignVertical: 'top' },
  charCount: { ...Typography.caption, color: Colors.secondary, textAlign: 'right', marginTop: 6 },

  doneCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, alignItems: 'center', ...Shadow.md },
  doneIconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  doneTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 20 },
  doneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  doneLabelRow: { flexDirection: 'row', alignItems: 'center' },
  doneIconBadge: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  doneLabel: { ...Typography.small, color: Colors.secondary },
  commentDisplay: { width: '100%', marginTop: 14 },
  commentLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentText: { ...Typography.body, color: Colors.dark, lineHeight: 22 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success, borderRadius: Layout.radiusLg, paddingVertical: 16 },
  submitBtnText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },
});
