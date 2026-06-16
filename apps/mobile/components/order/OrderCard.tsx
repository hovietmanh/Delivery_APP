import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Badge } from '@components/ui/Badge';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

interface Order {
  id: string;
  trackingCode: string;
  fromCity: string;
  toCity: string;
  status: string;
  total: number;
  goodsType: string;
  weightRange: string;
  createdAt: string;
  tripDeparture?: string;
}

interface Props {
  order: Order;
  showActions?: boolean;
  onComplaint?: () => void;
  onReview?: () => void;
}

const GOODS_LABELS: Record<string, string> = {
  FASHION: 'Thời trang', BULKY: 'Cồng kềnh', FOOD: 'Thực phẩm',
  FRAGILE: 'Dễ vỡ', FROZEN: 'Đông lạnh', ELECTRONICS: 'Điện tử', OTHER: 'Khác',
};

const WEIGHT_LABELS: Record<string, string> = {
  UNDER_5KG: '< 5kg', FROM_5_TO_20KG: '5-20kg',
  FROM_20_TO_50KG: '20-50kg', OVER_50KG: '> 50kg',
};

export function OrderCard({ order, showActions, onComplaint, onReview }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(customer)/orders/${order.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <Text style={styles.code}>#{order.trackingCode}</Text>
        <Badge status={order.status} />
      </View>

      <View style={styles.routeRow}>
        <Text style={styles.city}>{order.fromCity}</Text>
        <Text style={styles.arrow}> → </Text>
        <Text style={styles.city}>{order.toCity}</Text>
      </View>

      <Text style={styles.meta}>
        📦 {GOODS_LABELS[order.goodsType] ?? order.goodsType} · ⚖️ {WEIGHT_LABELS[order.weightRange] ?? order.weightRange}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={styles.price}>{order.total.toLocaleString('vi-VN')}đ</Text>
        {order.status === 'IN_TRANSIT' && (
          <TouchableOpacity
            onPress={() => router.push(`/(customer)/orders/${order.id}`)}
            style={styles.trackBtn}
          >
            <Text style={styles.trackBtnText}>Theo dõi ngay</Text>
          </TouchableOpacity>
        )}
      </View>

      {showActions && order.status === 'DELIVERED' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.complaintBtn} onPress={onComplaint}>
            <Text style={styles.complaintText}>Khiếu nại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
            <Text style={styles.reviewText}>Đánh giá</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: Layout.cardPadding, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  code: { ...Typography.smallBold, color: Colors.dark },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  city: { ...Typography.h4, color: Colors.dark },
  arrow: { ...Typography.body, color: Colors.secondary },
  meta: { ...Typography.small, color: Colors.secondary, marginBottom: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { ...Typography.price, color: Colors.blue },
  trackBtn: {
    backgroundColor: Colors.blue, borderRadius: Layout.radiusSm,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  trackBtnText: { ...Typography.smallBold, color: Colors.white },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  complaintBtn: {
    flex: 1, borderRadius: Layout.radiusSm, paddingVertical: 10,
    backgroundColor: Colors.errorBg, alignItems: 'center',
  },
  complaintText: { ...Typography.smallBold, color: Colors.error },
  reviewBtn: {
    flex: 1, borderRadius: Layout.radiusSm, paddingVertical: 10,
    backgroundColor: Colors.warningBg, alignItems: 'center',
  },
  reviewText: { ...Typography.smallBold, color: Colors.warning },
});
