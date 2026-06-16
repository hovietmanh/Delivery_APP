import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@constants/Colors';
import { Typography } from '@constants/Layout';

type Variant = 'pending' | 'confirmed' | 'transit' | 'delivered' | 'cancelled' | 'disputed' | 'new' | 'info';

const config: Record<Variant, { bg: string; text: string; label: string }> = {
  pending:   { bg: Colors.warningBg,  text: Colors.warning,  label: 'Chờ xác nhận' },
  confirmed: { bg: Colors.infoBg,     text: Colors.blue,     label: 'Đã xác nhận'  },
  transit:   { bg: '#EDE9FE',         text: '#7C3AED',       label: 'Đang giao'    },
  delivered: { bg: Colors.successBg,  text: Colors.success,  label: 'Đã giao'      },
  cancelled: { bg: Colors.errorBg,    text: Colors.error,    label: 'Đã hủy'       },
  disputed:  { bg: '#FEF3C7',         text: '#92400E',       label: 'Khiếu nại'    },
  new:       { bg: Colors.errorBg,    text: Colors.error,    label: 'Mới'          },
  info:      { bg: Colors.infoBg,     text: Colors.blue,     label: ''             },
};

const ORDER_STATUS_MAP: Record<string, Variant> = {
  PENDING:          'pending',
  CONFIRMED:        'confirmed',
  PICKING_UP:       'confirmed',
  AT_STATION:       'confirmed',
  IN_TRANSIT:       'transit',
  ARRIVED:          'transit',
  OUT_FOR_DELIVERY: 'transit',
  DELIVERED:        'delivered',
  CANCELLED:        'cancelled',
  DISPUTED:         'disputed',
};

interface Props {
  status?: string;
  variant?: Variant;
  label?: string;
}

export function Badge({ status, variant, label }: Props) {
  const v: Variant = variant ?? (status ? (ORDER_STATUS_MAP[status] ?? 'info') : 'info');
  const c = config[v];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[Typography.smallBold, { color: c.text }]}>{label ?? c.label}</Text>
    </View>
  );
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING:          'Chờ xác nhận',
    CONFIRMED:        'Đã xác nhận',
    PICKING_UP:       'Đang đến lấy',
    AT_STATION:       'Đã lên xe',
    IN_TRANSIT:       'Đang trên đường',
    ARRIVED:          'Đến bến đích',
    OUT_FOR_DELIVERY: 'Đang giao',
    DELIVERED:        'Đã giao ✓',
    CANCELLED:        'Đã hủy',
    DISPUTED:         'Khiếu nại',
  };
  return labels[status] ?? status;
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
});
