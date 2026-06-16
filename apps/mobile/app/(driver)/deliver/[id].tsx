import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, TextInput } from 'react-native';
import { useState, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { driverApi } from '@services/driver.api';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

export default function DeliverScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState('');
  const [codCollected, setCodCollected] = useState('');
  const [step, setStep] = useState<'photos' | 'signature' | 'cod'>('photos');

  const { data: order } = useQuery({
    queryKey: ['driver-order', id],
    queryFn: () => driverApi.getOrder(id),
  });

  const confirm = useMutation({
    mutationFn: () =>
      driverApi.confirmDelivery(id, {
        photos,
        signature,
        codCollected: codCollected ? Number(codCollected) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-orders', 'active-trip'] });
      Alert.alert('Giao hàng thành công! 🎉', `Đơn ${order?.trackingCode} đã hoàn thành`, [
        { text: 'OK', onPress: () => router.replace('/(driver)') },
      ]);
    },
    onError: () => Alert.alert('Lỗi', 'Không thể xác nhận giao hàng. Vui lòng thử lại.'),
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) setPhotos((p) => [...p, result.assets[0].uri]);
  };

  const canSubmit = photos.length >= 1 && signature.trim().length > 0;

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
        {(['photos', 'signature', 'cod'] as const).map((s, i) => (
          <TouchableOpacity key={s} style={styles.stepItem} onPress={() => setStep(s)}>
            <View style={[styles.stepDot, step === s && styles.stepDotActive, step !== s && i < ['photos', 'signature', 'cod'].indexOf(step) && styles.stepDotDone]}>
              <Text style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, step === s && { color: Colors.blue }]}>
              {['Ảnh', 'Chữ ký', 'COD'][i]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
        {/* Order summary */}
        {order && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCode}>{order.trackingCode}</Text>
            <Text style={styles.summaryReceiver}>📬 {order.receiverName} · {order.receiverAddress}</Text>
            {order.codAmount > 0 && (
              <View style={styles.codBadge}>
                <Text style={styles.codBadgeText}>💰 Thu hộ: {order.codAmount.toLocaleString('vi-VN')}đ</Text>
              </View>
            )}
          </View>
        )}

        {/* Step: Photos */}
        {step === 'photos' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Ảnh bằng chứng giao hàng</Text>
            <Text style={styles.cardSub}>Chụp ít nhất 1 ảnh: hàng trao tay hoặc tại điểm giao</Text>

            <View style={styles.photosGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                    <Text style={styles.removeX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 6 && (
                <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={styles.addPhotoText}>Chụp ảnh</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button
              label={`Tiếp theo →`}
              onPress={() => {
                if (!photos.length) { Alert.alert('Cần ít nhất 1 ảnh bằng chứng'); return; }
                setStep('signature');
              }}
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {/* Step: Signature */}
        {step === 'signature' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✍️ Xác nhận nhận hàng</Text>
            <Text style={styles.cardSub}>Người nhận xác nhận bằng họ tên đầy đủ</Text>

            <TextInput
              style={styles.signInput}
              placeholder="Nhập họ tên người nhận hàng..."
              value={signature}
              onChangeText={setSignature}
              autoCapitalize="words"
            />

            <View style={styles.signNote}>
              <Text style={styles.signNoteText}>
                Bằng cách nhập tên, người nhận xác nhận đã nhận hàng đúng tình trạng.
              </Text>
            </View>

            <View style={styles.stepBtns}>
              <Button label="← Quay lại" onPress={() => setStep('photos')} variant="outline" style={{ flex: 1, marginRight: 8 }} />
              <Button
                label="Tiếp theo →"
                onPress={() => {
                  if (!signature.trim()) { Alert.alert('Cần chữ ký xác nhận'); return; }
                  setStep('cod');
                }}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}

        {/* Step: COD */}
        {step === 'cod' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Thu tiền hộ (COD)</Text>

            {order?.codAmount > 0 ? (
              <>
                <View style={styles.codRequired}>
                  <Text style={styles.codRequiredLabel}>Số tiền cần thu:</Text>
                  <Text style={styles.codRequiredAmount}>{order.codAmount.toLocaleString('vi-VN')}đ</Text>
                </View>
                <TextInput
                  style={styles.signInput}
                  placeholder="Số tiền đã thu (để trống nếu chưa thu)"
                  value={codCollected}
                  onChangeText={setCodCollected}
                  keyboardType="number-pad"
                />
              </>
            ) : (
              <View style={styles.noCod}>
                <Text style={styles.noCodIcon}>✓</Text>
                <Text style={styles.noCodText}>Đơn này không có thu hộ</Text>
              </View>
            )}

            <View style={styles.stepBtns}>
              <Button label="← Quay lại" onPress={() => setStep('signature')} variant="outline" style={{ flex: 1, marginRight: 8 }} />
              <Button
                label="✓ Hoàn tất giao hàng"
                onPress={() => {
                  Alert.alert(
                    'Xác nhận hoàn tất',
                    'Bạn đã giao hàng thành công cho người nhận?',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      { text: 'Hoàn tất', onPress: () => confirm.mutate() },
                    ]
                  );
                }}
                variant="success"
                loading={confirm.isPending}
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
  summaryReceiver: { ...Typography.small, color: 'rgba(255,255,255,0.7)' },
  codBadge: { backgroundColor: Colors.warning + '30', borderRadius: Layout.radiusSm, padding: 6, marginTop: 8, alignSelf: 'flex-start' },
  codBadgeText: { ...Typography.smallBold, color: Colors.warning },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 6 },
  cardSub: { ...Typography.small, color: Colors.secondary, marginBottom: 14 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  photoWrap: { width: '30%', aspectRatio: 1, borderRadius: Layout.radius, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeX: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  addPhoto: { width: '30%', aspectRatio: 1, backgroundColor: Colors.bg, borderRadius: Layout.radius, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoText: { ...Typography.caption, color: Colors.secondary },

  signInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius, padding: 14, ...Typography.body, color: Colors.dark, marginBottom: 12 },
  signNote: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm, padding: 10, marginBottom: 16 },
  signNoteText: { ...Typography.small, color: Colors.secondary },

  stepBtns: { flexDirection: 'row' },

  codRequired: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.warningBg, padding: 12, borderRadius: Layout.radius, marginBottom: 12 },
  codRequiredLabel: { ...Typography.body, color: Colors.secondary },
  codRequiredAmount: { ...Typography.h4, color: Colors.warning },
  noCod: { alignItems: 'center', padding: 20 },
  noCodIcon: { fontSize: 36, color: Colors.success, marginBottom: 8 },
  noCodText: { ...Typography.body, color: Colors.secondary },
});
