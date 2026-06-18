import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@constants/Colors';

type Variant = 'pending' | 'confirmed' | 'pickup' | 'station' | 'transit' | 'arrived' | 'outfordelivery' | 'delivered' | 'cancelled' | 'disputed' | 'new' | 'info';

const config: Record<Variant, { bg: string; text: string; label: string; dot: string }> = {
  pending:        { bg: '#FFFBEB', text: '#B45309', label: 'Chờ xác nhận',     dot: '#F59E0B' },
  confirmed:      { bg: '#EFF6FF', text: '#1D4ED8', label: 'Đã xác nhận',      dot: '#3B82F6' },
  pickup:         { bg: '#F5F3FF', text: '#6D28D9', label: 'Đang lấy hàng',    dot: '#8B5CF6' },
  station:        { bg: '#F0FDF4', text: '#065F46', label: 'Tại bến',          dot: '#10B981' },
  transit:        { bg: '#EFF6FF', text: '#1E40AF', label: 'Đang vận chuyển',  dot: '#3B82F6' },
  arrived:        { bg: '#ECFDF5', text: '#047857', label: 'Đến bến đích',     dot: '#10B981' },
  outfordelivery: { bg: '#FFF7ED', text: '#C2410C', label: 'Đang giao nhà',    dot: '#F97316' },
  delivered:      { bg: '#ECFDF5', text: '#065F46', label: 'Đã giao ✓',        dot: '#10B981' },
  cancelled:      { bg: '#FEF2F2', text: '#B91C1C', label: 'Đã hủy',           dot: '#EF4444' },
  disputed:       { bg: '#FFF7ED', text: '#9A3412', label: 'Khiếu nại',        dot: '#F97316' },
  new:            { bg: '#FEF2F2', text: '#B91C1C', label: 'Mới',              dot: '#EF4444' },
  info:           { bg: '#EFF6FF', text: '#1D4ED8', label: '',                 dot: '#3B82F6' },
};

const ORDER_STATUS_MAP: Record<string, Variant> = {
  PENDING:          'pending',
  CONFIRMED:        'confirmed',
  PICKING_UP:       'pickup',
  AT_STATION:       'station',
  IN_TRANSIT:       'transit',
  ARRIVED:          'arrived',
  OUT_FOR_DELIVERY: 'outfordelivery',
  DELIVERED:        'delivered',
  CANCELLED:        'cancelled',
  DISPUTED:         'disputed',
};

interface Props {
  status?: string;
  variant?: Variant;
  label?: string;
  size?: 'sm' | 'md';
}

export function Badge({ status, variant, label, size = 'md' }: Props) {
  const v: Variant = variant ?? (status ? (ORDER_STATUS_MAP[status] ?? 'info') : 'info');
  const c = config[v];
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text style={[styles.text, { color: c.text }, isSmall && styles.textSm]}>
        {label ?? c.label}
      </Text>
    </View>
  );
}

export function getStatusLabel(status: string): string {
  const v: Variant = ORDER_STATUS_MAP[status] ?? 'info';
  return config[v]?.label ?? status;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    gap: 5,
  },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  textSm: { fontSize: 11 },
});
