import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverRoutesApi } from '@services/driver-routes.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const CITIES = [
  'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Nghệ An', 'Huế', 'Hải Phòng',
  'Cần Thơ', 'Nha Trang', 'Quảng Bình', 'Thanh Hóa', 'Buôn Ma Thuột',
  'Pleiku', 'Đồng Nai', 'Bình Dương', 'Vũng Tàu', 'Quảng Ngãi', 'Quy Nhơn', 'Đà Lạt',
];

const PRESET_TIMES = ['05:00', '06:00', '07:00', '08:00', '10:00', '10:30', '12:00', '14:00', '16:00', '18:00', '18:30', '20:00', '22:00', '23:00'];

export default function DriverTodayRouteScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [cityPicker, setCityPicker] = useState<'from' | 'to' | null>(null);
  const [customTime, setCustomTime] = useState('');

  const { data: todayRoute, isLoading } = useQuery({
    queryKey: ['today-route'],
    queryFn: driverRoutesApi.getTodayRoute,
    staleTime: 0,
  });

  useEffect(() => {
    if (todayRoute) {
      setFromCity(todayRoute.fromCity ?? '');
      setToCity(todayRoute.toCity ?? '');
      setDepartureTime(todayRoute.departureTime ?? '');
      setPriceInput(todayRoute.pricePerKg ? String(Math.round(todayRoute.pricePerKg / 1000)) : '');
    }
  }, [todayRoute]);

  const saveMutation = useMutation({
    mutationFn: driverRoutesApi.updateTodayRoute,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today-route'] });
      Alert.alert('✅ Đã lưu', 'Thông tin tuyến hôm nay đã được cập nhật. Khách hàng có thể tìm thấy bạn.');
    },
    onError: () => Alert.alert('Lỗi', 'Không thể lưu, vui lòng thử lại.'),
  });

  const clearMutation = useMutation({
    mutationFn: driverRoutesApi.clearTodayRoute,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today-route'] });
      setFromCity(''); setToCity(''); setDepartureTime(''); setPriceInput('');
      Alert.alert('Đã xóa', 'Tuyến hôm nay đã được xóa.');
    },
  });

  const handleSave = () => {
    if (!fromCity) { Alert.alert('Thiếu thông tin', 'Vui lòng chọn bến xuất phát.'); return; }
    if (!toCity) { Alert.alert('Thiếu thông tin', 'Vui lòng chọn bến đến.'); return; }
    if (fromCity === toCity) { Alert.alert('Lỗi', 'Bến xuất phát và bến đến không được trùng nhau.'); return; }
    if (!departureTime) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập giờ xuất bến.'); return; }
    saveMutation.mutate({
      fromCity,
      toCity,
      departureTime,
      pricePerKg: priceInput ? parseFloat(priceInput) * 1000 : undefined,
    });
  };

  const handleClear = () => {
    Alert.alert('Xóa tuyến hôm nay', 'Bạn có chắc? Xe của bạn sẽ không hiển thị với khách hàng nữa.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => clearMutation.mutate() },
    ]);
  };

  const addCustomTime = () => {
    const t = customTime.trim();
    if (!/^\d{2}:\d{2}$/.test(t)) { Alert.alert('Lỗi', 'Nhập đúng định dạng HH:MM'); return; }
    setDepartureTime(t);
    setCustomTime('');
  };

  const isSet = !!(todayRoute?.isSet);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Tuyến hôm nay</Text>
            <Text style={styles.headerSub}>Thiết lập tuyến để nhận đơn hàng</Text>
          </View>
          <View style={[styles.statusBadge, isSet ? styles.statusActive : styles.statusInactive]}>
            <View style={[styles.statusDot, { backgroundColor: isSet ? Colors.success : Colors.placeholder }]} />
            <Text style={styles.statusText}>{isSet ? 'Đang hoạt động' : 'Chưa thiết lập'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Warning banner if not set */}
      {!isSet && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Bạn chưa thiết lập tuyến hôm nay. Hãy điền thông tin bên dưới để nhận đơn hàng.
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 120 }}>

        {/* Current status card */}
        {isSet && (
          <View style={styles.activeCard}>
            <Text style={styles.activeCardLabel}>TUYẾN ĐANG CHẠY</Text>
            <Text style={styles.activeCardRoute}>{todayRoute?.fromCity} → {todayRoute?.toCity}</Text>
            <View style={styles.activeCardMeta}>
              <Text style={styles.activeMetaItem}>🕐 {todayRoute?.departureTime}</Text>
              {todayRoute?.pricePerKg && (
                <Text style={styles.activeMetaItem}>
                  💰 {(todayRoute.pricePerKg / 1000).toFixed(0)}.000đ/kg
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isSet ? 'Cập nhật thông tin tuyến' : 'Thiết lập tuyến hôm nay'}
          </Text>

          {/* From city */}
          <Text style={styles.fieldLabel}>Bến xuất phát *</Text>
          <TouchableOpacity style={styles.selectBox} onPress={() => setCityPicker('from')}>
            <Ionicons name="location-outline" size={18} color={Colors.blue} style={{ marginRight: 10 }} />
            <Text style={fromCity ? styles.selectText : styles.selectPlaceholder}>
              {fromCity || 'Chọn thành phố xuất phát...'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.placeholder} />
          </TouchableOpacity>

          {/* To city */}
          <Text style={styles.fieldLabel}>Bến đến *</Text>
          <TouchableOpacity style={styles.selectBox} onPress={() => setCityPicker('to')}>
            <Ionicons name="flag-outline" size={18} color={Colors.success} style={{ marginRight: 10 }} />
            <Text style={toCity ? styles.selectText : styles.selectPlaceholder}>
              {toCity || 'Chọn thành phố điểm đến...'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.placeholder} />
          </TouchableOpacity>

          {/* Departure time */}
          <Text style={styles.fieldLabel}>Giờ xuất bến *</Text>
          <View style={styles.presetTimes}>
            {PRESET_TIMES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.presetChip, departureTime === t && styles.presetChipActive]}
                onPress={() => setDepartureTime(t)}
              >
                <Text style={[styles.presetChipText, departureTime === t && styles.presetChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customTimeRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
              placeholder="Giờ khác (HH:MM)"
              value={customTime}
              onChangeText={setCustomTime}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <TouchableOpacity style={styles.addTimeBtn} onPress={addCustomTime}>
              <Text style={styles.addTimeBtnText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
          {departureTime ? (
            <View style={styles.selectedTime}>
              <Text style={styles.selectedTimeText}>🕐 Giờ xuất bến đã chọn: <Text style={{ color: Colors.blue, fontWeight: '700' }}>{departureTime}</Text></Text>
            </View>
          ) : null}

          {/* Price */}
          <Text style={styles.fieldLabel}>Giá hàng (nghìn đ/kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="vd: 15  →  15.000đ/kg"
            keyboardType="numeric"
            value={priceInput}
            onChangeText={setPriceInput}
          />
          <Text style={styles.fieldHint}>Để trống nếu thỏa thuận trực tiếp với khách</Text>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        {isSet && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} disabled={clearMutation.isPending}>
            <Text style={styles.clearBtnText}>Xóa tuyến</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.saveBtn, (!fromCity || !toCity || !departureTime) && styles.saveBtnDisabled, saveMutation.isPending && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!fromCity || !toCity || !departureTime || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.saveBtnText}>{isSet ? '💾 Cập nhật tuyến' : '✅ Xác nhận tuyến hôm nay'}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* City picker modal */}
      <Modal visible={!!cityPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.pickerTitle}>
              {cityPicker === 'from' ? '🚌 Chọn bến xuất phát' : '🏁 Chọn bến đến'}
            </Text>
            <FlatList
              data={CITIES}
              keyExtractor={(c) => c}
              renderItem={({ item: city }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    (cityPicker === 'from' ? fromCity : toCity) === city && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    if (cityPicker === 'from') setFromCity(city);
                    else setToCity(city);
                    setCityPicker(null);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    (cityPicker === 'from' ? fromCity : toCity) === city && styles.pickerItemTextActive,
                  ]}>{city}</Text>
                  {(cityPicker === 'from' ? fromCity : toCity) === city && (
                    <Text style={{ color: Colors.blue }}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setCityPicker(null)}>
              <Text style={styles.pickerCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Layout.padding, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { ...Typography.h3, color: Colors.white },
  headerSub: { ...Typography.caption, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
  statusInactive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  statusText: { ...Typography.caption, color: Colors.white, fontWeight: '600' },

  warningBanner: {
    backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B',
    padding: 14, marginHorizontal: Layout.padding, marginTop: 12, borderRadius: Layout.radiusSm,
  },
  warningText: { ...Typography.small, color: '#92400E', lineHeight: 18 },

  activeCard: {
    backgroundColor: Colors.blue, borderRadius: Layout.radiusLg,
    padding: 16, marginBottom: 14, ...Shadow.blue,
  },
  activeCardLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4 },
  activeCardRoute: { ...Typography.h3, color: Colors.white, marginBottom: 8 },
  activeCardMeta: { flexDirection: 'row', gap: 16 },
  activeMetaItem: { ...Typography.bodyBold, color: 'rgba(255,255,255,0.9)' },

  formCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: 16, ...Shadow.sm },
  formTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 14 },

  fieldLabel: { ...Typography.caption, color: Colors.secondary, marginBottom: 6, marginTop: 14 },
  fieldHint: { ...Typography.caption, color: Colors.placeholder, marginTop: 4 },

  selectBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 14,
  },
  selectText: { ...Typography.body, color: Colors.dark, flex: 1 },
  selectPlaceholder: { ...Typography.body, color: Colors.placeholder, flex: 1 },

  presetTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  presetChip: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  presetChipActive: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  presetChipText: { ...Typography.small, color: Colors.secondary, fontWeight: '600' },
  presetChipTextActive: { color: Colors.blue },

  customTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addTimeBtn: { backgroundColor: Colors.navy, borderRadius: Layout.radiusSm, paddingHorizontal: 14, paddingVertical: 12 },
  addTimeBtnText: { ...Typography.small, color: Colors.white, fontWeight: '700' },

  selectedTime: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 10, marginBottom: 4 },
  selectedTimeText: { ...Typography.small, color: Colors.secondary },

  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm,
    padding: 14, ...Typography.body, color: Colors.dark,
  },

  actionBar: {
    flexDirection: 'row', gap: 10, padding: Layout.padding,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
    ...Shadow.md,
  },
  clearBtn: {
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: Layout.radius,
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
  },
  clearBtnText: { ...Typography.bodyBold, color: Colors.error },
  saveBtn: { flex: 1, backgroundColor: Colors.blue, borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { ...Typography.bodyBold, color: Colors.white, fontSize: 15 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', padding: Layout.padding,
  },
  pickerTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 12 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerItemActive: { backgroundColor: Colors.infoBg },
  pickerItemText: { ...Typography.body, color: Colors.dark },
  pickerItemTextActive: { color: Colors.blue, fontWeight: '700' },
  pickerCancel: { marginTop: 12, alignItems: 'center', padding: 14 },
  pickerCancelText: { ...Typography.bodyBold, color: Colors.error },
});
