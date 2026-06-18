import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderStore } from '@store/order.store';
import { StepIndicator } from '@components/ui/StepIndicator';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const STEPS = [
  { label: 'Tuyến' }, { label: 'Xe' }, { label: 'Hàng hóa' }, { label: 'Xem lại' },
];

const STATIONS: Record<string, string[]> = {
  'Hà Nội':         ['Bến xe Mỹ Đình', 'Bến xe Giáp Bát', 'Bến xe Nước Ngầm', 'Bến xe Gia Lâm', 'Bến xe Yên Nghĩa'],
  'TP.HCM':         ['Bến xe Miền Đông', 'Bến xe Miền Tây', 'Bến xe An Sương', 'Bến xe Ngã Tư Ga'],
  'Đà Nẵng':        ['Bến xe Đà Nẵng', 'Bến xe phía Nam Đà Nẵng'],
  'Nghệ An':        ['Bến xe Vinh', 'Bến xe Bến Thủy'],
  'Huế':            ['Bến xe phía Bắc Huế', 'Bến xe An Cựu'],
  'Nha Trang':      ['Bến xe phía Bắc Nha Trang', 'Bến xe phía Nam Nha Trang'],
  'Cần Thơ':        ['Bến xe Cần Thơ', 'Bến xe Hưng Lợi'],
  'Hải Phòng':      ['Bến xe Lạc Long', 'Bến xe Niệm Nghĩa'],
  'Đà Lạt':         ['Bến xe Đà Lạt'],
  'Vũng Tàu':       ['Bến xe Vũng Tàu'],
  'Quy Nhơn':       ['Bến xe Quy Nhơn'],
  'Buôn Ma Thuột':  ['Bến xe Buôn Ma Thuột'],
  'Quảng Ngãi':     ['Bến xe Quảng Ngãi'],
  'Phan Thiết':     ['Bến xe Phan Thiết'],
  'Hội An':         ['Bến xe Hội An'],
  'Pleiku':         ['Bến xe Pleiku'],
  'Đồng Nai':       ['Bến xe Biên Hòa', 'Bến xe Long Khánh'],
  'Bình Dương':     ['Bến xe Bình Dương', 'Bến xe Thủ Dầu Một'],
};

const CITIES = Object.keys(STATIONS);

const GOODS_TYPES = [
  { key: 'FASHION', icon: 'shirt-outline', label: 'Thời trang', color: '#8B5CF6' },
  { key: 'BULKY', icon: 'cube-outline', label: 'Cồng kềnh', color: '#F97316' },
  { key: 'FOOD', icon: 'nutrition-outline', label: 'Thực phẩm', color: '#10B981' },
  { key: 'FRAGILE', icon: 'warning-outline', label: 'Dễ vỡ', color: '#EF4444' },
  { key: 'FROZEN', icon: 'snow-outline', label: 'Đông lạnh', color: '#0EA5E9' },
  { key: 'OTHER', icon: 'add-circle-outline', label: 'Khác', color: Colors.secondary },
];

const WEIGHT_RANGES = [
  { key: 'UNDER_5KG', label: '< 5kg' },
  { key: 'FROM_5_TO_20KG', label: '5–20kg' },
  { key: 'FROM_20_TO_50KG', label: '20–50kg' },
  { key: 'OVER_50KG', label: '> 50kg' },
];

const SERVICE_TYPES = [
  { key: 'STATION_TO_STATION', label: 'Bến → Bến', desc: 'Tự mang ra bến & tự đến lấy' },
  { key: 'DOOR_TO_STATION', label: 'Nhà → Bến', desc: 'Lấy tận nơi, người nhận đến bến' },
  { key: 'STATION_TO_DOOR', label: 'Bến → Nhà', desc: 'Tự mang ra bến, giao tận nhà' },
  { key: 'DOOR_TO_DOOR', label: 'Nhà → Nhà', desc: 'Lấy & giao tận nơi' },
];

type PickerTarget = 'from' | 'to' | null;
type PickerStep = 'city' | 'station';

export default function SendStep1() {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useOrderStore();
  const { from, to } = useLocalSearchParams<{ from?: string; to?: string }>();

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerStep, setPickerStep] = useState<PickerStep>('city');
  const [tempCity, setTempCity] = useState('');
  const [weightInput, setWeightInput] = useState(
    draft.weightKg ? String(draft.weightKg) : '',
  );

  useEffect(() => {
    if (from || to) {
      updateDraft({
        ...(from ? { fromCity: from, fromStation: '' } : {}),
        ...(to ? { toCity: to, toStation: '' } : {}),
      });
    }
  }, [from, to]);

  const rangeFromKg = (kg: number): typeof WEIGHT_RANGES[number]['key'] => {
    if (kg < 5) return 'UNDER_5KG';
    if (kg <= 20) return 'FROM_5_TO_20KG';
    if (kg <= 50) return 'FROM_20_TO_50KG';
    return 'OVER_50KG';
  };

  const handleWeightInput = (text: string) => {
    setWeightInput(text);
    const kg = parseFloat(text);
    if (!isNaN(kg) && kg > 0) {
      updateDraft({ weightKg: kg, weightRange: rangeFromKg(kg) as any });
    } else if (text === '') {
      updateDraft({ weightKg: undefined as any });
    }
  };

  const handleRangeSelect = (key: string) => {
    const defaults: Record<string, number> = {
      UNDER_5KG: 3, FROM_5_TO_20KG: 10, FROM_20_TO_50KG: 30, OVER_50KG: 60,
    };
    const kg = defaults[key];
    setWeightInput(String(kg));
    updateDraft({ weightRange: key as any, weightKg: kg });
  };

  const goodsOk = draft.goodsType && (draft.goodsType !== 'OTHER' || !!draft.goodsDescription?.trim());
  const canProceed = !!(
    draft.fromCity && draft.fromStation && draft.toCity && draft.toStation
    && draft.fromCity !== draft.toCity && goodsOk
    && draft.weightRange && draft.weightKg && draft.weightKg > 0
    && draft.serviceType
  );

  const openPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setPickerStep('city');
    setTempCity('');
  };

  const selectCity = (city: string) => {
    setTempCity(city);
    setPickerStep('station');
  };

  const selectStation = (station: string) => {
    if (pickerTarget === 'from') {
      updateDraft({ fromCity: tempCity, fromStation: station });
    } else {
      updateDraft({ toCity: tempCity, toStation: station });
    }
    setPickerTarget(null);
  };

  const swap = () => {
    updateDraft({
      fromCity: draft.toCity, fromStation: draft.toStation,
      toCity: draft.fromCity, toStation: draft.fromStation,
    });
  };

  const otherCity = pickerTarget === 'from' ? draft.toCity : draft.fromCity;
  const pickerTitle = pickerTarget === 'from' ? 'Điểm lấy hàng (Bến gửi)' : 'Điểm nhận hàng (Bến đến)';
  const accentColor = pickerTarget === 'from' ? '#2563EB' : '#DC2626';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StepIndicator steps={STEPS} current={0} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* ── Tuyến giao hàng ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tuyến giao hàng</Text>

          <Text style={styles.fieldLabel}>Điểm lấy hàng (Bến gửi)</Text>
          <TouchableOpacity
            style={[styles.picker, draft.fromCity && draft.fromStation ? styles.pickerFilled : styles.pickerEmpty]}
            onPress={() => openPicker('from')}
          >
            <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
            <View style={{ flex: 1 }}>
              {draft.fromCity && draft.fromStation ? (
                <>
                  <Text style={styles.pickerCityLabel}>{draft.fromCity}</Text>
                  <Text style={styles.pickerStationLabel}>{draft.fromStation}</Text>
                </>
              ) : (
                <Text style={styles.pickerPlaceholder}>Chọn tỉnh / bến xe gửi...</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.swapBtn} onPress={swap}>
            <Ionicons name="swap-vertical" size={22} color={Colors.blue} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Điểm nhận hàng (Bến đến)</Text>
          <TouchableOpacity
            style={[styles.picker, draft.toCity && draft.toStation ? styles.pickerFilled : styles.pickerEmpty]}
            onPress={() => openPicker('to')}
          >
            <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
            <View style={{ flex: 1 }}>
              {draft.toCity && draft.toStation ? (
                <>
                  <Text style={styles.pickerCityLabel}>{draft.toCity}</Text>
                  <Text style={styles.pickerStationLabel}>{draft.toStation}</Text>
                </>
              ) : (
                <Text style={styles.pickerPlaceholder}>Chọn tỉnh / bến xe nhận...</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* ── Dịch vụ giao ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dịch vụ giao hàng</Text>
          <View style={styles.serviceGrid}>
            {SERVICE_TYPES.map(({ key, label, desc }) => (
              <TouchableOpacity
                key={key}
                style={[styles.serviceItem, draft.serviceType === key && styles.serviceActive]}
                onPress={() => updateDraft({ serviceType: key as any })}
              >
                <Text style={[styles.serviceLabel, draft.serviceType === key && styles.serviceActiveText]}>{label}</Text>
                <Text style={[styles.serviceDesc, draft.serviceType === key && styles.serviceActiveDesc]}>{desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Loại hàng hóa ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Loại hàng hóa</Text>
          <View style={styles.goodsGrid}>
            {GOODS_TYPES.map(({ key, icon, label, color }) => {
              const active = draft.goodsType === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.goodsItem, active && styles.goodsActive]}
                  onPress={() => updateDraft({ goodsType: key as any })}
                >
                  <View style={[styles.goodsIconWrap, { backgroundColor: active ? color + '20' : Colors.bg }]}>
                    <Ionicons name={icon as any} size={24} color={active ? color : Colors.secondary} />
                  </View>
                  <Text style={[styles.goodsLabel, active && styles.goodsActiveLabel]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {draft.goodsType === 'OTHER' && (
            <TextInput
              style={styles.otherInput}
              placeholder="Mô tả loại hàng hóa của bạn..."
              placeholderTextColor={Colors.placeholder}
              value={draft.goodsDescription ?? ''}
              onChangeText={text => updateDraft({ goodsDescription: text })}
              maxLength={100}
            />
          )}
        </View>

        {/* ── Trọng lượng ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trọng lượng hàng hóa</Text>

          {/* Nhập kg chính xác */}
          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInput}
              placeholder="Nhập số kg..."
              placeholderTextColor={Colors.placeholder}
              value={weightInput}
              onChangeText={handleWeightInput}
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <View style={styles.weightUnit}>
              <Text style={styles.weightUnitText}>kg</Text>
            </View>
          </View>

          {/* Range nhanh */}
          <Text style={styles.weightRangeLabel}>Hoặc chọn nhanh:</Text>
          <View style={styles.weightRow}>
            {WEIGHT_RANGES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.weightChip, draft.weightRange === key && styles.weightChipActive]}
                onPress={() => handleRangeSelect(key)}
              >
                <Text style={[styles.weightText, draft.weightRange === key && styles.weightTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hiển thị range đang áp dụng */}
          {draft.weightKg && draft.weightKg > 0 && (
            <View style={styles.weightResult}>
              <Text style={styles.weightResultText}>
                {draft.weightKg} kg → nhóm "{WEIGHT_RANGES.find(r => r.key === draft.weightRange)?.label}"
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Tiếp theo — Chọn xe →"
          onPress={() => router.push('/(customer)/send/trip')}
          disabled={!canProceed}
        />
      </View>

      {/* ── 2-step picker Modal ── */}
      <Modal
        visible={pickerTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerTarget(null)}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: accentColor + '30' }]}>
            <TouchableOpacity
              onPress={() => {
                if (pickerStep === 'station') setPickerStep('city');
                else setPickerTarget(null);
              }}
            >
              <Text style={styles.modalBack}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <Text style={styles.modalSubtitle}>
                {pickerStep === 'city' ? 'Bước 1: Chọn tỉnh / thành phố' : `Bước 2: Chọn bến xe tại ${tempCity}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPickerTarget(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Step indicator dots */}
          <View style={styles.stepDots}>
            <View style={[styles.stepDot, { backgroundColor: accentColor }]} />
            <View style={styles.stepDotLine} />
            <View style={[styles.stepDot, pickerStep === 'station' ? { backgroundColor: accentColor } : styles.stepDotInactive]} />
          </View>

          {pickerStep === 'city' ? (
            <FlatList
              data={CITIES.filter(c => c !== otherCity)}
              keyExtractor={(item) => item}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item: city }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => selectCity(city)}>
                  <Text style={styles.listItemText}>{city}</Text>
                  <Text style={styles.listItemMeta}>{STATIONS[city].length} bến xe</Text>
                  <Text style={styles.listChevron}>›</Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <FlatList
              data={STATIONS[tempCity] ?? []}
              keyExtractor={(item) => item}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListHeaderComponent={
                <View style={styles.stationHeader}>
                  <Text style={styles.stationHeaderText}>Bến xe tại {tempCity}</Text>
                </View>
              }
              renderItem={({ item: station }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => selectStation(station)}>
                  <View style={[styles.stationDot, { backgroundColor: accentColor }]} />
                  <Text style={[styles.listItemText, { flex: 1 }]}>{station}</Text>
                  <Text style={styles.listChevron}>›</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, margin: 12, marginTop: 0, marginBottom: 10, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, ...Shadow.md },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 14 },
  fieldLabel: { ...Typography.small, color: Colors.secondary, marginBottom: 8 },

  picker: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Layout.radius, padding: 14,
  },
  pickerEmpty: { borderColor: Colors.border },
  pickerFilled: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  pickerCityLabel: { ...Typography.smallBold, color: Colors.secondary },
  pickerStationLabel: { ...Typography.bodyBold, color: Colors.dark, marginTop: 1 },
  pickerPlaceholder: { ...Typography.body, color: Colors.placeholder },
  swapBtn: { alignSelf: 'center', marginVertical: 8, padding: 10, backgroundColor: Colors.infoBg, borderRadius: 14 },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceItem: { width: '47%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 10 },
  serviceActive: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  serviceLabel: { ...Typography.smallBold, color: Colors.dark },
  serviceActiveText: { color: Colors.blue },
  serviceDesc: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  serviceActiveDesc: { color: Colors.blue },

  goodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goodsItem: {
    width: '30%', alignItems: 'center', padding: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Layout.radiusSm, backgroundColor: Colors.bg,
  },
  goodsActive: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  goodsIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  goodsLabel: { ...Typography.caption, color: Colors.secondary, textAlign: 'center' },
  goodsActiveLabel: { color: Colors.blue, fontWeight: '600' },

  otherInput: {
    marginTop: 12,
    borderWidth: 1.5, borderColor: Colors.blue,
    borderRadius: Layout.radiusSm,
    padding: 12,
    ...Typography.body,
    color: Colors.dark,
    backgroundColor: Colors.infoBg,
  },

  weightInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  weightInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.blue,
    borderTopLeftRadius: Layout.radius, borderBottomLeftRadius: Layout.radius,
    paddingHorizontal: 14, paddingVertical: 12,
    ...Typography.h4, color: Colors.dark,
    backgroundColor: Colors.infoBg,
  },
  weightUnit: {
    borderWidth: 1.5, borderLeftWidth: 0, borderColor: Colors.blue,
    borderTopRightRadius: Layout.radius, borderBottomRightRadius: Layout.radius,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.blue,
  },
  weightUnitText: { ...Typography.bodyBold, color: Colors.white },
  weightRangeLabel: { ...Typography.small, color: Colors.secondary, marginBottom: 8 },
  weightRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  weightChip: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  weightChipActive: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  weightText: { ...Typography.smallBold, color: Colors.secondary },
  weightTextActive: { color: Colors.blue },
  weightResult: {
    marginTop: 10, backgroundColor: Colors.successBg ?? '#F0FDF4',
    borderRadius: Layout.radiusSm, paddingHorizontal: 12, paddingVertical: 8,
  },
  weightResultText: { ...Typography.small, color: Colors.success },

  footer: { padding: Layout.padding, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, padding: Layout.padding, paddingTop: 20,
    borderBottomWidth: 2,
  },
  modalBack: { fontSize: 22, color: Colors.dark, paddingRight: 4, paddingLeft: 4 },
  modalTitle: { ...Typography.h4, color: Colors.dark },
  modalSubtitle: { ...Typography.small, color: Colors.secondary, marginTop: 2 },
  modalClose: { fontSize: 18, color: Colors.secondary, paddingLeft: 12 },

  stepDots: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Layout.padding, paddingVertical: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepDotInactive: { backgroundColor: Colors.border },
  stepDotLine: { flex: 0, width: 32, height: 2, backgroundColor: Colors.border, marginHorizontal: 6 },

  listItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: Layout.padding,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  listItemText: { ...Typography.body, color: Colors.dark, flex: 1 },
  listItemMeta: { ...Typography.caption, color: Colors.secondary, marginRight: 8 },
  listChevron: { fontSize: 20, color: Colors.secondary },

  stationHeader: { padding: Layout.padding, paddingBottom: 8 },
  stationHeaderText: { ...Typography.smallBold, color: Colors.secondary, letterSpacing: 0.5 },
  stationDot: { width: 8, height: 8, borderRadius: 4, marginRight: 14 },
});
