import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { driverApi } from '@services/driver.api';
import { uploadPhotos } from '@services/upload';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const REQUIRED_PHOTOS = 3;

export default function PickupConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const confirm = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        const urls = await uploadPhotos(photos);
        return driverApi.confirmPickup(id, urls);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-orders'] });
      Alert.alert('✅ Thành công', 'Đã xác nhận lấy hàng và lưu ảnh', [
        { text: 'OK', onPress: () => router.replace('/(driver)') },
      ]);
    },
    onError: () => Alert.alert('Lỗi', 'Không thể upload ảnh. Kiểm tra kết nối mạng và thử lại.'),
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
      <LinearGradient colors={['#0F172A', '#1E293B']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận lấy hàng</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

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

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          label={uploading ? '☁️ Đang upload ảnh...' : photos.length >= REQUIRED_PHOTOS ? '✅ Xác nhận lấy hàng' : `Cần thêm ${REQUIRED_PHOTOS - photos.length} ảnh nữa (${photos.length}/${REQUIRED_PHOTOS})`}
          onPress={onConfirm}
          variant={photos.length >= REQUIRED_PHOTOS ? 'success' : 'secondary'}
          loading={confirm.isPending || uploading}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 14 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  headerTitle: { ...Typography.h4, color: Colors.white },

  instructionCard: { backgroundColor: Colors.infoBg, borderRadius: Layout.radiusLg, padding: 18, marginBottom: 16, alignItems: 'center', ...Shadow.sm },
  instructionIcon: { fontSize: 40, marginBottom: 10 },
  instructionTitle: { ...Typography.h4, color: Colors.blue, marginBottom: 6 },
  instructionText: { ...Typography.small, color: Colors.secondary, textAlign: 'center', lineHeight: 20 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  photoWrap: { width: '30%', aspectRatio: 1, borderRadius: Layout.radiusSm, overflow: 'hidden', position: 'relative', ...Shadow.sm },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeX: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  addPhoto: { width: '30%', aspectRatio: 1, backgroundColor: Colors.white, borderRadius: Layout.radiusSm, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoIcon: { fontSize: 28, marginBottom: 4 },
  addPhotoText: { ...Typography.caption, color: Colors.secondary },

  progressRow: { marginBottom: 16 },
  progressText: { ...Typography.bodyBold, color: Colors.warning },

  noteCard: { backgroundColor: Colors.warningBg, borderRadius: Layout.radiusLg, padding: 14, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  noteTitle: { ...Typography.bodyBold, color: Colors.warning, marginBottom: 8 },
  noteItem: { ...Typography.small, color: Colors.secondary, marginBottom: 4 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: Layout.padding, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
});
