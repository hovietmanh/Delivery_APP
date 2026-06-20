import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@constants/Colors';

export default function QrScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const cooldown = useRef(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // Reset scanner mỗi lần màn hình được focus lại (sau khi back)
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      cooldown.current = false;
    }, []),
  );

  const handleBarcode = ({ data }: BarcodeScanningResult) => {
    if (cooldown.current) return;
    cooldown.current = true;
    setScanned(true);

    // Parse deep link: delilog://orders/{orderId}
    const match = data.match(/delilog:\/\/orders\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      Alert.alert('QR không hợp lệ', 'Mã QR này không phải đơn hàng Delilog.', [
        { text: 'Quét lại', onPress: () => { setScanned(false); cooldown.current = false; } },
        { text: 'Đóng', onPress: () => router.back() },
      ]);
      return;
    }

    const orderId = match[1];
    // Navigate to deliver screen với orderId
    router.replace(`/(driver)/deliver/${orderId}` as any);
  };

  if (!permission) {
    return <View style={styles.center}><Text style={styles.msg}>Đang kiểm tra quyền camera...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-off-outline" size={48} color={Colors.secondary} />
        <Text style={styles.msg}>Cần quyền camera để quét QR</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Cấp quyền camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Overlay UI */}
      <View style={[styles.overlay, { paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Quét mã QR đơn hàng</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            {/* 4 góc khung */}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <Text style={styles.hint}>Đưa mã QR vào khung để quét</Text>
        </View>
      </View>
    </View>
  );
}

const FRAME = 240;
const CORNER = 28;
const THICKNESS = 3;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 12, padding: 24 },
  msg: { fontSize: 15, color: Colors.secondary, textAlign: 'center' },
  permBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },

  viewfinderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  viewfinder: { width: FRAME, height: FRAME, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS, borderBottomRightRadius: 4 },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
});
