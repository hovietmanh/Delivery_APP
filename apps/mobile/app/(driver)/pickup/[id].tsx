import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { driverApi } from '@services/driver.api';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const REQUIRED_PHOTOS = 3;

export default function PickupConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<string[]>([]);

  const confirm = useMutation({
    mutationFn: () => driverApi.confirmPickup(id, photos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-orders'] });
      Alert.alert('Thành công', 'Đã xác nhận lấy hàng', [
        { text: 'OK', onPress: () => router.replace('/(driver)') },
      ]);
    },
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onConfirm = () => {
    if (photos.length < REQUIRED_PHOTOS) {
      Alert.alert('Cần thêm ảnh', `Vui lòng chụp đủ ${REQUIRED_PHOTOS} ảnh hàng hóa trước khi xác nhận`);
      return;
    }
    Alert.alert('Xác nhận lấy hàng', 'Bạn đã nhận hàng từ người gửi?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: () => confirm.mutate() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận lấy hàng</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }}>
        {/* Instruction */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionIcon}>📸</Text>
          <Text style={styles.instructionTitle}>Chụp ảnh hàng hóa</Text>
          <Text style={styles.instructionText}>
            Chụp ít nhất {REQUIRED_PHOTOS} ảnh rõ ràng: mặt trên, mặt trước và toàn bộ hàng.
            Ảnh sẽ được dùng làm bằng chứng nếu có khiếu nại.
          </Text>
        </View>

        {/* Photos grid */}
        <View style={styles.photosGrid}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
                <Text style={styles.removeX}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < 8 && (
            <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, photos.length >= REQUIRED_PHOTOS && { color: Colors.success }]}>
            {photos.length >= REQUIRED_PHOTOS ? '✓ ' : ''}{photos.length}/{REQUIRED_PHOTOS} ảnh tối thiểu
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Lưu ý quan trọng:</Text>
          <Text style={styles.noteItem}>• Chụp đủ các góc cạnh của hàng hóa</Text>
          <Text style={styles.noteItem}>• Đảm bảo ảnh rõ ràng, không bị mờ</Text>
          <Text style={styles.noteItem}>• Ghi nhận tình trạng hàng trước khi nhận</Text>
          <Text style={styles.noteItem}>• Không nhận hàng nghi vấn cấm vận chuyển</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          label={`✓ Xác nhận đã lấy hàng (${photos.length}/${REQUIRED_PHOTOS} ảnh)`}
          onPress={onConfirm}
          variant={photos.length >= REQUIRED_PHOTOS ? 'success' : 'secondary'}
          loading={confirm.isPending}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: 22, color: Colors.dark },
  headerTitle: { ...Typography.h4, color: Colors.dark },

  instructionCard: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusLg, padding: 16, marginBottom: 16, alignItems: 'center' },
  instructionIcon: { fontSize: 36, marginBottom: 8 },
  instructionTitle: { ...Typography.h4, color: Colors.blue, marginBottom: 6 },
  instructionText: { ...Typography.small, color: Colors.secondary, textAlign: 'center', lineHeight: 20 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  photoWrap: { width: '30%', aspectRatio: 1, borderRadius: Layout.radius, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeX: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  addPhoto: { width: '30%', aspectRatio: 1, backgroundColor: Colors.white, borderRadius: Layout.radius, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoIcon: { fontSize: 28, marginBottom: 4 },
  addPhotoText: { ...Typography.caption, color: Colors.secondary },

  progressRow: { marginBottom: 16 },
  progressText: { ...Typography.bodyBold, color: Colors.warning },

  noteCard: { backgroundColor: Colors.warningBg, borderRadius: Layout.radius, padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  noteTitle: { ...Typography.bodyBold, color: Colors.warning, marginBottom: 8 },
  noteItem: { ...Typography.small, color: Colors.secondary, marginBottom: 4 },

  bottomBar: { backgroundColor: Colors.white, padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border },
});
