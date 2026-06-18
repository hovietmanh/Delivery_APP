import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { driverApi } from '@services/driver.api';
import { uploadPhotos } from '@services/upload';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const REQUIRED_PHOTOS = 3;

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

  // Tự động chuyển ARRIVED → OUT_FOR_DELIVERY khi mở màn hình
  const startDelivery = useMutation({
    mutationFn: () => driverApi.startDelivery(id),
    onError: () => {}, // Nếu đã là OUT_FOR_DELIVERY thì bỏ qua
  });

  useEffect(() => {
    if (order?.status === 'ARRIVED') {
      startDelivery.mutate();
    }
  }, [order?.status]);

  const confirm = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        const urls = await uploadPhotos(photos);
        return driverApi.confirmDelivery(id, {
          photos: urls,
          receiverName: receiverName.trim() || (order?.receiverName ?? ''),
          amountCollected: amountCollected ? Number(amountCollected) : undefined,
        });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-orders', 'active-trip', 'driver-stats'] });
      Alert.alert('🎉 Giao hàng thành công!', `Đơn ${order?.trackingCode} đã hoàn tất`, [
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
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((p) => [...p, result.assets[0].uri]);
    }
  };

  const onConfirm = () => {
    if (photos.length < REQUIRED_PHOTOS) {
      Alert.alert('Cần thêm ảnh', `Vui lòng chụp đủ ${REQUIRED_PHOTOS} ảnh bằng chứng giao hàng`);
      return;
    }
    if (order?.total > 0 && !amountCollected) {
      Alert.alert('Chưa nhập số tiền', 'Vui lòng nhập số tiền đã thu của khách trước khi hoàn tất');
      return;
    }
    Alert.alert(
      '✅ Xác nhận hoàn tất giao hàng',
      `Đơn: ${order?.trackingCode}\nNgười nhận: ${receiverName || order?.receiverName}\nSố tiền thu: ${amountCollected ? `${Number(amountCollected).toLocaleString('vi-VN')}đ` : 'Không có'}`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hoàn tất', style: 'default', onPress: () => confirm.mutate() },
      ]
    );
  };

  if (isLoading || !order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận giao hàng</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {(['photos', 'confirm'] as const).map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, step === s && styles.stepDotActive, i < (['photos', 'confirm'] as string[]).indexOf(step) && styles.stepDotDone]}>
              <Text style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, step === s && { color: Colors.blue }]}>
              {['Chụp ảnh', 'Thu tiền'][i]}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
        {/* Order summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCode}>{order.trackingCode}</Text>
          <Text style={styles.summaryReceiver}>📬 {order.receiverName}</Text>
          <Text style={styles.summaryAddr}>📍 {order.receiverAddress ?? `Bến xe ${order.toCity}`}</Text>
          <Text style={styles.summaryPhone}>📞 {order.receiverPhone}</Text>
          <View style={styles.summaryAmountRow}>
            <Text style={styles.summaryAmountLabel}>Số tiền cần thu:</Text>
            <Text style={styles.summaryAmount}>{order.total?.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Step 1: Photos */}
        {step === 'photos' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Chụp ảnh bằng chứng ({photos.length}/{REQUIRED_PHOTOS})</Text>
            <Text style={styles.cardSub}>Chụp ít nhất {REQUIRED_PHOTOS} ảnh: hàng trao tay, tình trạng hàng, và người nhận</Text>

            <View style={styles.photosGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                    <Text style={styles.removeX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 8 && (
                <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={styles.addPhotoText}>Chụp ảnh</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.progressRow, photos.length >= REQUIRED_PHOTOS && styles.progressDone]}>
              <Text style={[styles.progressText, photos.length >= REQUIRED_PHOTOS && { color: Colors.success }]}>
                {photos.length >= REQUIRED_PHOTOS ? '✓ Đủ ảnh' : `Cần thêm ${REQUIRED_PHOTOS - photos.length} ảnh nữa`}
              </Text>
            </View>

            <Button
              label="Tiếp theo: Thu tiền →"
              onPress={() => {
                if (photos.length < REQUIRED_PHOTOS) {
                  Alert.alert('Cần thêm ảnh', `Chụp đủ ${REQUIRED_PHOTOS} ảnh trước khi tiếp tục`);
                  return;
                }
                setStep('confirm');
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* Step 2: Thu tiền + tên người nhận */}
        {step === 'confirm' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Thu tiền & Xác nhận</Text>

            <Text style={styles.fieldLabel}>Họ tên người nhận hàng</Text>
            <TextInput
              style={styles.input}
              placeholder={order.receiverName}
              value={receiverName}
              onChangeText={setReceiverName}
              autoCapitalize="words"
            />

            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Số tiền cần thu từ khách:</Text>
              <Text style={styles.amountValue}>{order.total?.toLocaleString('vi-VN')}đ</Text>
            </View>

            <Text style={styles.fieldLabel}>Số tiền đã thu (đ)</Text>
            <TextInput
              style={styles.input}
              placeholder={`${order.total?.toLocaleString('vi-VN')}đ`}
              value={amountCollected}
              onChangeText={setAmountCollected}
              keyboardType="number-pad"
            />

            <View style={styles.noteCard}>
              <Text style={styles.noteText}>📸 {photos.length} ảnh đã chụp</Text>
              <Text style={styles.noteText}>👤 Người nhận: {receiverName || order.receiverName}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button label="← Quay lại" onPress={() => setStep('photos')} variant="outline" style={{ flex: 1 }} />
              <Button
                label={uploading ? '☁️ Đang upload...' : '✅ Hoàn tất giao hàng'}
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
  header: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: 22, color: Colors.dark },
  headerTitle: { ...Typography.h4, color: Colors.dark },

  stepBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepItem: { alignItems: 'center' },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepDotActive: { backgroundColor: Colors.blue },
  stepDotDone: { backgroundColor: Colors.success },
  stepNum: { ...Typography.bodyBold, color: Colors.white },
  stepLabel: { ...Typography.caption, color: Colors.secondary },

  summaryCard: { backgroundColor: Colors.navy, borderRadius: Layout.radiusLg, padding: 14, marginBottom: 10 },
  summaryCode: { ...Typography.h4, color: Colors.white, marginBottom: 4 },
  summaryReceiver: { ...Typography.bodyBold, color: 'rgba(255,255,255,0.9)', marginBottom: 2 },
  summaryAddr: { ...Typography.small, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  summaryPhone: { ...Typography.small, color: Colors.blueLight, marginBottom: 8 },
  summaryAmountRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Layout.radiusSm, padding: 10, marginTop: 4 },
  summaryAmountLabel: { ...Typography.body, color: 'rgba(255,255,255,0.7)' },
  summaryAmount: { ...Typography.h4, color: Colors.warning },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 6 },
  cardSub: { ...Typography.small, color: Colors.secondary, marginBottom: 14 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  photoWrap: { width: '30%', aspectRatio: 1, borderRadius: Layout.radius, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeX: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  addPhoto: { width: '30%', aspectRatio: 1, backgroundColor: Colors.bg, borderRadius: Layout.radius, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoText: { ...Typography.caption, color: Colors.secondary },
  progressRow: { backgroundColor: Colors.warningBg, borderRadius: Layout.radiusSm, padding: 8, marginBottom: 4 },
  progressDone: { backgroundColor: Colors.successBg },
  progressText: { ...Typography.bodyBold, color: Colors.warning, textAlign: 'center' },

  fieldLabel: { ...Typography.caption, color: Colors.secondary, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radiusSm, padding: 14, ...Typography.body, color: Colors.dark },

  amountBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 12, marginTop: 14 },
  amountLabel: { ...Typography.body, color: Colors.secondary },
  amountValue: { ...Typography.h4, color: Colors.blue },

  noteCard: { backgroundColor: Colors.bg, borderRadius: Layout.radiusSm, padding: 12, marginTop: 14, gap: 4 },
  noteText: { ...Typography.small, color: Colors.secondary },
});
