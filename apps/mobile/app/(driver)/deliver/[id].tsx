import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { driverApi } from '@services/driver.api';
import { uploadPhotos } from '@services/upload';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const REQUIRED_PHOTOS = 1;

export default function DeliverScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [photos, setPhotos] = useState<string[]>([]);
  const [receiverName, setReceiverName] = useState('');
  const [amountCollected, setAmountCollected] = useState('');
  const [step, setStep] = useState<'photos' | 'confirm'>('photos');
  const [uploading, setUploading] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['driver-order', id],
    queryFn: () => driverApi.getOrder(id),
  });

  const startDelivery = useMutation({
    mutationFn: () => driverApi.startDelivery(id),
    onError: () => {},
  });

  useEffect(() => {
    if (order?.status === 'ARRIVED') {
      startDelivery.mutate();
    }
  }, [order?.status]);

  const confirm = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let urls: string[] = [];
      try {
        urls = await uploadPhotos(photos);
      } catch {
        // Upload thất bại → tiếp tục không có ảnh (không block luồng giao hàng)
      } finally {
        setUploading(false);
      }
      return driverApi.confirmDelivery(id, {
        photos: urls,
        receiverName: receiverName.trim() || (order?.receiverName ?? ''),
        amountCollected: amountCollected ? Number(amountCollected) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-orders'] });
      qc.invalidateQueries({ queryKey: ['driver-stats'] });
      qc.invalidateQueries({ queryKey: ['active-trip'] });
      Alert.alert('Giao hàng thành công!', `Đơn ${order?.trackingCode} đã hoàn tất`, [
        { text: 'OK', onPress: () => router.replace('/(driver)') },
      ]);
    },
    onError: (e: any) => Alert.alert('Lỗi', e?.response?.data?.message ?? 'Không thể xác nhận giao hàng. Vui lòng thử lại.'),
  });

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền camera', 'Vui lòng cho phép ứng dụng truy cập camera trong Cài đặt.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotos((p) => [...p, result.assets[0].uri]);
    }
  };

  const onConfirm = () => {
    if (photos.length < REQUIRED_PHOTOS) {
      Alert.alert('Cần ảnh bằng chứng', `Vui lòng chụp ít nhất ${REQUIRED_PHOTOS} ảnh bằng chứng giao hàng`);
      return;
    }
    if (order?.total > 0 && !amountCollected) {
      Alert.alert('Chưa nhập số tiền', 'Vui lòng nhập số tiền đã thu của khách trước khi hoàn tất');
      return;
    }
    Alert.alert(
      'Xác nhận hoàn tất giao hàng',
      `Đơn: ${order?.trackingCode}\nNgười nhận: ${receiverName || order?.receiverName}\nSố tiền thu: ${amountCollected ? `${Number(amountCollected).toLocaleString('vi-VN')}đ` : 'Không có'}`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hoàn tất', style: 'default', onPress: () => confirm.mutate() },
      ]
    );
  };

  if (isLoading || !order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận giao hàng</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {(['photos', 'confirm'] as const).map((s, i) => {
          const isDone = i < (['photos', 'confirm'] as string[]).indexOf(step);
          const isActive = step === s;
          const icons: any[] = ['camera-outline', 'cash-outline'];
          return (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, isActive && styles.stepDotActive, isDone && styles.stepDotDone]}>
                {isDone
                  ? <Ionicons name="checkmark" size={16} color={Colors.white} />
                  : <Ionicons name={icons[i]} size={16} color={isActive ? Colors.white : Colors.placeholder} />
                }
              </View>
              <Text style={[styles.stepLabel, isActive && { color: Colors.blue, fontWeight: '600' }]}>
                {['Chụp ảnh', 'Thu tiền'][i]}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
        {/* Order summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="barcode-outline" size={16} color="rgba(255,255,255,0.6)" style={{ marginRight: 6 }} />
            <Text style={styles.summaryCode}>{order.trackingCode}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="person-outline" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.summaryReceiver}>{order.receiverName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.summaryAddr}>{order.receiverAddress ?? `Bến xe ${order.toCity}`}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="call-outline" size={15} color={Colors.blueLight} />
            <Text style={styles.summaryPhone}>{order.receiverPhone}</Text>
          </View>

          <View style={styles.summaryAmountRow}>
            <Text style={styles.summaryAmountLabel}>Số tiền cần thu:</Text>
            <Text style={styles.summaryAmount}>{order.total?.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Step 1: Photos */}
        {step === 'photos' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIcon, { backgroundColor: Colors.infoBg }]}>
                <Ionicons name="camera" size={18} color={Colors.blue} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Ảnh bằng chứng ({photos.length}/{REQUIRED_PHOTOS})</Text>
                <Text style={styles.cardSub}>Chụp ít nhất {REQUIRED_PHOTOS} ảnh: tình trạng hàng, trao tay khách</Text>
              </View>
            </View>

            <View style={styles.photosGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                    <Ionicons name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 8 && (
                <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
                  <Ionicons name="camera-outline" size={28} color={Colors.placeholder} />
                  <Text style={styles.addPhotoText}>Chụp ảnh</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.progressRow, photos.length >= REQUIRED_PHOTOS && styles.progressDone]}>
              <Ionicons
                name={photos.length >= REQUIRED_PHOTOS ? 'checkmark-circle' : 'alert-circle-outline'}
                size={16}
                color={photos.length >= REQUIRED_PHOTOS ? Colors.success : Colors.warning}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.progressText, photos.length >= REQUIRED_PHOTOS && { color: Colors.success }]}>
                {photos.length >= REQUIRED_PHOTOS ? 'Đã đủ ảnh bằng chứng' : `Cần thêm ${REQUIRED_PHOTOS - photos.length} ảnh nữa`}
              </Text>
            </View>

            <Button
              label="Tiếp theo: Thu tiền"
              onPress={() => {
                if (photos.length < REQUIRED_PHOTOS) {
                  Alert.alert('Cần ảnh bằng chứng', `Chụp đủ ${REQUIRED_PHOTOS} ảnh trước khi tiếp tục`);
                  return;
                }
                setStep('confirm');
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* Step 2: Thu tiền */}
        {step === 'confirm' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIcon, { backgroundColor: Colors.successBg }]}>
                <Ionicons name="cash" size={18} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Thu tiền & Xác nhận</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Họ tên người nhận hàng</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={Colors.placeholder} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={order.receiverName}
                placeholderTextColor={Colors.placeholder}
                value={receiverName}
                onChangeText={setReceiverName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.amountBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="wallet-outline" size={16} color={Colors.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.amountLabel}>Số tiền cần thu từ khách:</Text>
              </View>
              <Text style={styles.amountValue}>{order.total?.toLocaleString('vi-VN')}đ</Text>
            </View>

            <Text style={styles.fieldLabel}>Số tiền đã thu (đ)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="cash-outline" size={18} color={Colors.placeholder} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={String(order.total ?? 0)}
                placeholderTextColor={Colors.placeholder}
                value={amountCollected}
                onChangeText={setAmountCollected}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.noteCard}>
              <View style={styles.noteRow}>
                <Ionicons name="images-outline" size={15} color={Colors.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.noteText}>{photos.length} ảnh bằng chứng đã chụp</Text>
              </View>
              <View style={styles.noteRow}>
                <Ionicons name="person-circle-outline" size={15} color={Colors.secondary} style={{ marginRight: 6 }} />
                <Text style={styles.noteText}>Người nhận: {receiverName || order.receiverName}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button label="Quay lại" onPress={() => setStep('photos')} variant="outline" style={{ flex: 1 }} />
              <Button
                label={uploading ? 'Đang xử lý...' : 'Hoàn tất giao hàng'}
                onPress={onConfirm}
                variant="success"
                loading={confirm.isPending || uploading}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 14 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  headerTitle: { ...Typography.h4, color: Colors.white },

  stepBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: Colors.blue },
  stepDotDone: { backgroundColor: Colors.success },
  stepLabel: { ...Typography.caption, color: Colors.secondary },

  summaryCard: { backgroundColor: Colors.navy, borderRadius: Layout.radiusLg, padding: 16, marginBottom: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  summaryCode: { ...Typography.h4, color: Colors.white },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  summaryReceiver: { ...Typography.bodyBold, color: 'rgba(255,255,255,0.9)' },
  summaryAddr: { ...Typography.small, color: 'rgba(255,255,255,0.6)', flex: 1 },
  summaryPhone: { ...Typography.small, color: Colors.blueLight },
  summaryAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Layout.radiusSm, padding: 10, marginTop: 8 },
  summaryAmountLabel: { ...Typography.body, color: 'rgba(255,255,255,0.7)' },
  summaryAmount: { ...Typography.h4, color: Colors.warning },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...Typography.h4, color: Colors.dark },
  cardSub: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoWrap: { width: '30%', aspectRatio: 1, borderRadius: Layout.radius, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  addPhoto: { width: '30%', aspectRatio: 1, backgroundColor: Colors.bg, borderRadius: Layout.radius, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { ...Typography.caption, color: Colors.secondary },
  progressRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningBg, borderRadius: Layout.radiusSm, padding: 10, marginBottom: 4 },
  progressDone: { backgroundColor: Colors.successBg },
  progressText: { ...Typography.bodyBold, color: Colors.warning },

  fieldLabel: { ...Typography.caption, color: Colors.secondary, marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, paddingHorizontal: 12, paddingVertical: 2 },
  input: { flex: 1, ...Typography.body, color: Colors.dark, paddingVertical: 12 },

  amountBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 12, marginTop: 14 },
  amountLabel: { ...Typography.body, color: Colors.secondary },
  amountValue: { ...Typography.h4, color: Colors.blue },

  noteCard: { backgroundColor: Colors.bg, borderRadius: Layout.radiusSm, padding: 12, marginTop: 14, gap: 6 },
  noteRow: { flexDirection: 'row', alignItems: 'center' },
  noteText: { ...Typography.small, color: Colors.secondary },
});
