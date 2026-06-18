import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderStore } from '@store/order.store';
import { tripsApi } from '@services/trips.api';
import { StepIndicator } from '@components/ui/StepIndicator';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const STEPS = [{ label: 'Tuyến' }, { label: 'Xe' }, { label: 'Hàng hóa' }, { label: 'Xem lại' }];

export default function SendStep2() {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useOrderStore();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['available-drivers', draft.fromCity, draft.toCity],
    queryFn: () => tripsApi.getAvailableDrivers(draft.fromCity!, draft.toCity!),
    enabled: !!(draft.fromCity && draft.toCity),
    staleTime: 0,
  });

  const canProceed = !!draft.tripId;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StepIndicator steps={STEPS} current={1} />

      {/* Route summary bar */}
      <View style={styles.routeBar}>
        <View style={styles.routeChip}>
          <Text style={styles.routeCity}>{draft.fromCity}</Text>
        </View>
        <Text style={styles.routeArrow}>→</Text>
        <View style={styles.routeChip}>
          <Text style={styles.routeCity}>{draft.toCity}</Text>
        </View>
        <Text style={styles.routeMeta}>⚖️ {draft.weightKg ? `${draft.weightKg}kg` : draft.weightRange?.replace(/_/g, ' ')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>

        {/* ── Danh sách xe ── */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.blue} />
            <Text style={styles.loadingText}>Đang tìm nhà xe phù hợp...</Text>
          </View>
        ) : drivers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="bus-outline" size={44} color={Colors.blueLight} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có xe đăng ký tuyến này</Text>
            <Text style={styles.emptyDesc}>
              Tuyến {draft.fromCity} → {draft.toCity} chưa có nhà xe đăng ký.{'\n'}
              Vui lòng thử lại sau hoặc chọn tuyến khác.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>🚌 Chọn nhà xe ({drivers.length} xe khả dụng)</Text>
            {drivers.map((driver: any) => {
              const isSelected = draft.tripId === driver.id;
              const times: string[] = driver.departureTimes ?? [];
              return (
                <TouchableOpacity
                  key={driver.id}
                  style={[styles.tripCard, isSelected && styles.tripCardActive]}
                  onPress={() => updateDraft({ tripId: driver.id, tripData: driver } as any)}
                >
                  {driver.isRecommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>⭐ Gợi ý</Text>
                    </View>
                  )}
                  <View style={styles.tripTop}>
                    <View style={styles.busIconWrap}>
                      <Ionicons name="bus" size={26} color={Colors.blue} />
                    </View>
                    <View style={styles.tripInfo}>
                      <Text style={styles.companyName}>{driver.companyName}</Text>
                      <Text style={styles.vehicleType}>{driver.vehicleType}</Text>
                      <Text style={styles.vehiclePlate}>{driver.vehiclePlate}</Text>
                    </View>
                    <View>
                      <Text style={styles.price}>
                        {((driver.pricePerKg ?? 15000) / 1000).toFixed(0)}.000đ
                      </Text>
                      <Text style={styles.priceUnit}>/kg</Text>
                    </View>
                  </View>
                  <View style={styles.tripMeta}>
                    <Text style={styles.metaItem}>⭐ {driver.rating?.toFixed(1)}</Text>
                    <Text style={styles.metaItem}>⏱ {driver.durationHours}h</Text>
                    <Text style={styles.metaItem}>📦 {driver.totalTrips} chuyến</Text>
                  </View>
                  {driver.departureTime && (
                    <View style={styles.timesRow}>
                      <View style={[styles.departureTag, isSelected && styles.departureTagSelected]}>
                        <Text style={[styles.departureTagText, isSelected && styles.departureTagTextSelected]}>
                          🕐 Xuất bến lúc {driver.departureTime}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Bảo hiểm ── */}
        {!isLoading && drivers.length > 0 && (
          <TouchableOpacity
            style={[styles.insuranceRow, draft.hasInsurance && styles.insuranceActive]}
            onPress={() => updateDraft({ hasInsurance: !draft.hasInsurance })}
          >
            <View style={[styles.insuranceCheck, draft.hasInsurance && styles.insuranceChecked]}>
              {draft.hasInsurance && <Text style={{ color: Colors.white, fontWeight: '700' }}>✓</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.insuranceTitle}>Bảo hiểm bảo vệ hàng hóa</Text>
              <Text style={styles.insuranceDesc}>Bảo vệ hàng hóa khỏi hư hại trong vận chuyển</Text>
            </View>
            <Text style={styles.insurancePrice}>5.000đ</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerRow}>
          <Button label="← Quay lại" onPress={() => router.back()} variant="outline" fullWidth={false} style={{ flex: 1, marginRight: 8 }} />
          <Button label="Tiếp theo →" onPress={() => router.push('/(customer)/send/package')} disabled={!canProceed} style={{ flex: 2 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  routeBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.navy, paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  routeChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  routeCity: { ...Typography.bodyBold, color: Colors.white },
  routeArrow: { color: Colors.white, fontSize: 18 },
  routeMeta: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', marginLeft: 4 },

  sectionTitle: { ...Typography.bodyBold, color: Colors.dark, marginBottom: 10 },

  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { ...Typography.body, color: Colors.secondary },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(96,165,250,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 8 },
  emptyDesc: { ...Typography.small, color: Colors.secondary, textAlign: 'center', lineHeight: 20 },

  tripCard: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: 16, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent', ...Shadow.md,
  },
  tripCardActive: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  recommendedBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: Colors.blue, borderTopRightRadius: Layout.radiusLg,
    borderBottomLeftRadius: Layout.radiusSm, paddingHorizontal: 10, paddingVertical: 4,
  },
  recommendedText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  tripTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  busIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  tripInfo: { flex: 1 },
  companyName: { ...Typography.h4, color: Colors.dark },
  vehicleType: { ...Typography.small, color: Colors.secondary, marginTop: 2 },
  vehiclePlate: { ...Typography.caption, color: Colors.blue, marginTop: 2 },
  price: { ...Typography.price, color: Colors.blue, textAlign: 'right' },
  priceUnit: { ...Typography.caption, color: Colors.secondary, textAlign: 'right' },
  tripMeta: { flexDirection: 'row', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  metaItem: { ...Typography.small, color: Colors.secondary },

  timesRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  departureTag: {
    alignSelf: 'flex-start', backgroundColor: Colors.bg,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  departureTagSelected: { backgroundColor: Colors.blue + '15', borderColor: Colors.blue },
  departureTagText: { ...Typography.small, color: Colors.secondary, fontWeight: '700' },
  departureTagTextSelected: { color: Colors.blue },

  insuranceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
  },
  insuranceActive: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  insuranceCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  insuranceChecked: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  insuranceTitle: { ...Typography.bodyBold, color: Colors.dark },
  insuranceDesc: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  insurancePrice: { ...Typography.bodyBold, color: Colors.dark },

  footer: { padding: Layout.padding, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
  footerRow: { flexDirection: 'row' },
});
