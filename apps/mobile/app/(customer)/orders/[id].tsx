import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator, Image, Dimensions, PanResponder, Animated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@services/orders.api';
import { getTrackingSocket } from '@services/socket';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';
import { Button } from '@components/ui/Button';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

const CANCEL_REASONS = [
  'Đặt nhầm đơn hàng',
  'Muốn thay đổi thông tin giao hàng',
  'Tìm được giá tốt hơn',
  'Không cần gửi hàng nữa',
  'Nhà xe chưa liên hệ xác nhận',
  'Thay đổi phương thức thanh toán',
  'Lý do khác',
];

const cityCode = (c: string) => {
  if (!c) return '???';
  if (c === 'TP.HCM' || c === 'Hồ Chí Minh') return 'HCM';
  return c.split(' ').map(w => w[0]).join('').toUpperCase();
};

const STATUS_PROGRESS: Record<string, number> = {
  PENDING: 2, CONFIRMED: 10, PICKING_UP: 20,
  AT_STATION: 35, IN_TRANSIT: 55, ARRIVED: 85,
  OUT_FOR_DELIVERY: 92, DELIVERED: 100, CANCELLED: 0,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận',
  PICKING_UP: 'Đang lấy hàng', AT_STATION: 'Tại bến gửi',
  IN_TRANSIT: 'Đang vận chuyển', ARRIVED: 'Đến bến đích',
  OUT_FOR_DELIVERY: 'Đang giao nhà', DELIVERED: 'Đã giao xong',
  CANCELLED: 'Đã hủy', DISPUTED: 'Khiếu nại',
};

const GOODS_LABEL: Record<string, string> = {
  FASHION: 'Thời trang', BULKY: 'Cồng kềnh', FOOD: 'Thực phẩm',
  FRAGILE: 'Dễ vỡ', FROZEN: 'Đông lạnh', ELECTRONICS: 'Điện tử', OTHER: 'Khác',
};
const WEIGHT_LABEL: Record<string, string> = {
  UNDER_5KG: '< 5kg', FROM_5_TO_20KG: '5–20kg', FROM_20_TO_50KG: '20–50kg', OVER_50KG: '> 50kg',
};
const SERVICE_LABEL: Record<string, string> = {
  STATION_TO_STATION: 'Bến → Bến', DOOR_TO_STATION: 'Nhà → Bến',
  STATION_TO_DOOR: 'Bến → Nhà', DOOR_TO_DOOR: 'Nhà → Nhà',
};

const TIMELINE_STEPS = [
  { status: 'PENDING',          icon: 'clipboard-outline',       label: 'Đơn hàng đã tạo' },
  { status: 'CONFIRMED',        icon: 'checkmark-circle-outline', label: 'Nhà xe xác nhận' },
  { status: 'PICKING_UP',       icon: 'bicycle-outline',          label: 'Đang lấy hàng' },
  { status: 'AT_STATION',       icon: 'business-outline',         label: 'Hàng lên xe tại bến' },
  { status: 'IN_TRANSIT',       icon: 'bus-outline',              label: 'Đang vận chuyển' },
  { status: 'ARRIVED',          icon: 'location-outline',         label: 'Xe đến bến đích' },
  { status: 'OUT_FOR_DELIVERY', icon: 'walk-outline',             label: 'Đang giao đến nhà' },
  { status: 'DELIVERED',        icon: 'gift-outline',             label: 'Giao hàng thành công' },
];

const STATUS_ORDER = TIMELINE_STEPS.map(s => s.status);

function formatTime(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ── OSM tile map — smooth pan (Animated GPU) + zoom + reverse geocoding ────
const SCREEN_W = Dimensions.get('window').width;
const MAP_W    = SCREEN_W - 32;
const MAP_H    = 240;
const TILE_SZ  = Math.round(MAP_W / 3); // tile vuông = OSM 256×256
const SCALE    = TILE_SZ / 256;
const EXT      = 2; // render 5×5 tile buffer để pan mượt

function worldPx(lat: number, lng: number, zoom: number) {
  const n    = Math.pow(2, zoom) * 256;
  const x    = ((lng + 180) / 360) * n;
  const latR = (lat * Math.PI) / 180;
  const y    = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  return { x, y };
}

// Memoized tile image để tránh re-render không cần thiết
const TileImage = memo(({ uri, left, top }: { uri: string; left: number; top: number }) => (
  <Image
    source={{ uri }}
    fadeDuration={0}
    style={{ position: 'absolute', left, top, width: TILE_SZ, height: TILE_SZ }}
  />
));

function OsmMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [zoom, setZoom]           = useState(14);
  const [committed, setCommitted] = useState({ x: 0, y: 0 });
  const animPan  = useRef(new Animated.ValueXY()).current;
  const panBase  = useRef({ x: 0, y: 0 });

  // Animated.event → pan chạy trên UI thread, không block JS
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderMove: Animated.event(
      [null, { dx: animPan.x, dy: animPan.y }],
      { useNativeDriver: false },
    ),
    onPanResponderRelease: (_, g) => {
      const nx = panBase.current.x + g.dx;
      const ny = panBase.current.y + g.dy;
      panBase.current = { x: nx, y: ny };
      animPan.setValue({ x: 0, y: 0 }); // reset animation, tile grid đã ở đúng vị trí
      setCommitted({ x: nx, y: ny });   // reload tiles ở center mới
    },
  })).current;

  const dwp = useMemo(() => worldPx(latitude, longitude, zoom), [latitude, longitude, zoom]);

  // Tâm view trong world-px (dịch bởi committed pan)
  const vcX  = dwp.x - committed.x / SCALE;
  const vcY  = dwp.y - committed.y / SCALE;
  const ctX  = Math.floor(vcX / 256);
  const ctY  = Math.floor(vcY / 256);
  const subX = (vcX / 256 - ctX) * TILE_SZ;
  const subY = (vcY / 256 - ctY) * TILE_SZ;

  const tiles = useMemo(() => {
    const out = [];
    for (let dy = -EXT; dy <= EXT; dy++)
      for (let dx = -EXT; dx <= EXT; dx++)
        out.push({
          key:  `${zoom}-${ctX + dx}-${ctY + dy}`,
          uri:  `https://tile.openstreetmap.org/${zoom}/${ctX + dx}/${ctY + dy}.png`,
          left: MAP_W / 2 + committed.x + dx * TILE_SZ - subX,
          top:  MAP_H / 2 + committed.y + dy * TILE_SZ - subY,
        });
    return out;
  }, [zoom, ctX, ctY, subX, subY, committed]);

  const markerLeft = MAP_W / 2 + committed.x - 14;
  const markerTop  = MAP_H / 2 + committed.y - 30;

  const resetPan = () => {
    panBase.current = { x: 0, y: 0 };
    animPan.setValue({ x: 0, y: 0 });
    setCommitted({ x: 0, y: 0 });
  };

  const handleZoom = (d: number) => {
    setZoom(z => Math.min(18, Math.max(3, z + d)));
    resetPan();
  };

  const isFollowing = committed.x === 0 && committed.y === 0;

  return (
    <View
      style={{ width: MAP_W, height: MAP_H, borderRadius: 12, overflow: 'hidden', backgroundColor: '#d1d5db' }}
      {...panResponder.panHandlers}
    >
      {/* Canvas animated — toàn bộ tiles + marker translate cùng 1 lúc (GPU) */}
      <Animated.View style={{ transform: [{ translateX: animPan.x }, { translateY: animPan.y }] }}>
        {tiles.map(t => <TileImage key={t.key} uri={t.uri} left={t.left} top={t.top} />)}
        <View style={{ position: 'absolute', left: markerLeft, top: markerTop, alignItems: 'center' }}>
          <View style={mapStyles.markerBubble}><Ionicons name="bus" size={14} color="#fff" /></View>
          <View style={mapStyles.markerTail} />
        </View>
      </Animated.View>

      {/* Controls cố định trên màn hình (ngoài Animated canvas) */}
      {!isFollowing && (
        <TouchableOpacity style={mapStyles.centerBtn} onPress={resetPan} activeOpacity={0.85}>
          <Ionicons name="locate" size={16} color={Colors.primary} />
        </TouchableOpacity>
      )}
      <View style={mapStyles.zoomControls}>
        <TouchableOpacity style={mapStyles.zoomBtn} onPress={() => handleZoom(1)} activeOpacity={0.8}>
          <Text style={mapStyles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <View style={mapStyles.zoomDivider} />
        <TouchableOpacity style={mapStyles.zoomBtn} onPress={() => handleZoom(-1)} activeOpacity={0.8}>
          <Text style={mapStyles.zoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>
      <View style={mapStyles.zoomBadge}>
        <Text style={mapStyles.zoomBadgeText}>z{zoom}</Text>
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const qrRef = useRef<any>(null);

  const downloadQr = async () => {
    if (!qrRef.current) return;
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Không hỗ trợ', 'Thiết bị không hỗ trợ chia sẻ file.');
      return;
    }
    setSavingQr(true);
    qrRef.current.toDataURL(async (dataUrl: string) => {
      try {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const file = new File(Paths.cache, `qr-${order?.trackingCode ?? 'order'}.png`);
        file.create({ overwrite: true });
        file.write(bytes);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'image/png',
          dialogTitle: `QR đơn hàng ${order?.trackingCode}`,
          UTI: 'public.png',
        });
      } catch (e) {
        console.error('QR share error:', e);
        Alert.alert('Lỗi', 'Không thể chia sẻ ảnh. Vui lòng thử lại.');
      } finally {
        setSavingQr(false);
      }
    });
  };
  const [selectedReason, setSelectedReason] = useState('');

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    retry: false,
    refetchInterval: (q) => {
      const o = q.state.data as any;
      return !o || ['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(o.status) ? false : 10_000;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => ordersApi.cancelOrder(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', id] });
      setShowCancelModal(false);
      Alert.alert('Đã hủy đơn', 'Đơn hàng đã được hủy thành công.', [
        { text: 'Về lịch sử đơn', onPress: () => router.replace('/(customer)/orders' as any) },
      ]);
    },
    onError: () => Alert.alert('Lỗi', 'Không thể hủy đơn. Vui lòng thử lại.'),
  });

  // GPS tracking — subscribe khi đơn đang vận chuyển
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    timestamp?: Date;
  } | null>(null);

  const tripId = (order as any)?.tripId;
  const isInTransit = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ARRIVED'].includes((order as any)?.status);

  // Reverse geocoding — gọi Nominatim khi vị trí đổi đáng kể (~500m)
  const [geoAddress, setGeoAddress] = useState('Đang xác định vị trí...');
  const lastGeocoded = useRef({ lat: 0, lng: 0 });

  useEffect(() => {
    if (!driverLocation) return;
    const { latitude: lat, longitude: lng } = driverLocation;
    if (
      Math.abs(lat - lastGeocoded.current.lat) < 0.005 &&
      Math.abs(lng - lastGeocoded.current.lng) < 0.005
    ) return;
    lastGeocoded.current = { lat, lng };
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
      { headers: { 'User-Agent': 'Delilog/1.0' } },
    )
      .then(r => r.json())
      .then(data => {
        const a = data?.address ?? {};
        const parts = [
          a.village || a.suburb || a.quarter,
          a.district || a.city_district || a.county,
          a.city || a.town || a.state,
        ].filter(Boolean);
        setGeoAddress(parts.length ? parts.join(', ') : (data.display_name ?? ''));
      })
      .catch(() => {});
  }, [driverLocation]);

  useEffect(() => {
    if (!tripId || !isInTransit) return;

    const socket = getTrackingSocket();
    socket.emit('customer:watch_trip', { tripId });

    const handleLocation = (loc: typeof driverLocation) => {
      setDriverLocation(loc);
    };

    socket.on('driver:location', handleLocation);
    return () => { socket.off('driver:location', handleLocation); };
  }, [tripId, isInTransit]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, padding: 32 }}>
        <Ionicons name="search-outline" size={56} color={Colors.border} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.primary, marginTop: 16, textAlign: 'center' }}>
          Không tìm thấy đơn hàng
        </Text>
        <Text style={{ fontSize: 14, color: Colors.secondary, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          Mã vận đơn "{id}" không tồn tại hoặc đã bị xóa.{'\n'}Kiểm tra lại mã và thử lại.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24, backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = !['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(order.status);
  const progress = STATUS_PROGRESS[order.status] ?? 0;
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const trackingMap: Record<string, any> = {};
  (order.tracking ?? []).forEach((t: any) => { trackingMap[t.status] = t; });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Hero header */}
      <LinearGradient
        colors={['#0F172A', '#1E3A8A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.trackCode}>#{order.trackingCode}</Text>
            {isActive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.routeRow}>
          <View style={styles.cityBlock}>
            <Text style={styles.cityCode}>{cityCode(order.fromCity)}</Text>
            <Text style={styles.cityName}>{order.fromCity}</Text>
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
              <View style={[styles.busWrap, { left: `${Math.min(progress, 88)}%` as any }]}>
                <Ionicons name="bus" size={16} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.progressLabel}>{progress}% · {STATUS_LABEL[order.status] ?? order.status}</Text>
          </View>
          <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.cityCode}>{cityCode(order.toCity)}</Text>
            <Text style={styles.cityName}>{order.toCity}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Gửi', value: formatDate(order.createdAt) ?? '—' },
            { label: 'Hàng hóa', value: GOODS_LABEL[order.goodsType] ?? order.goodsType },
            { label: 'Dịch vụ', value: SERVICE_LABEL[order.serviceType] ?? order.serviceType },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

        {/* Bản đồ GPS — chỉ hiện khi đang vận chuyển */}
        {isInTransit && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <Ionicons name="locate" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Vị trí xe theo thời gian thực</Text>
              {driverLocation && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                  <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: '600' }}>Live</Text>
                </View>
              )}
            </View>

            {driverLocation ? (
              <>
                <OsmMap latitude={driverLocation.latitude} longitude={driverLocation.longitude} />
                {/* Info bar bên dưới map */}
                <View style={mapStyles.infoBar}>
                  <View style={mapStyles.infoItem}>
                    <Ionicons name="location" size={14} color={Colors.primary} />
                    <Text style={mapStyles.infoText} numberOfLines={1}>{geoAddress}</Text>
                  </View>
                  {driverLocation.speed !== undefined && driverLocation.speed > 0 && (
                    <View style={mapStyles.infoItem}>
                      <Ionicons name="speedometer-outline" size={14} color={Colors.primary} />
                      <Text style={mapStyles.infoText}>{Math.round(driverLocation.speed)} km/h</Text>
                    </View>
                  )}
                  <Text style={mapStyles.infoTime}>
                    {new Date(driverLocation.timestamp ?? Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ paddingVertical: 32, alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Đang chờ tín hiệu GPS từ tài xế...</Text>
              </View>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hành trình đơn hàng</Text>
          {TIMELINE_STEPS.map((step, i) => {
            const isDone = i < currentIdx;
            const isCurrentStep = i === currentIdx;
            const tracked = trackingMap[step.status];
            const isCancelled = order.status === 'CANCELLED';
            return (
              <View key={step.status} style={styles.timelineRow}>
                <View style={styles.dotCol}>
                  <View style={[
                    styles.dot,
                    isDone && styles.dotDone,
                    isCurrentStep && !isCancelled && styles.dotActive,
                  ]}>
                    <Ionicons
                      name={isDone ? 'checkmark' : (isCurrentStep && !isCancelled ? step.icon as any : 'ellipse-outline')}
                      size={isDone ? 14 : 12}
                      color={isDone || (isCurrentStep && !isCancelled) ? Colors.white : Colors.border}
                    />
                  </View>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <View style={[styles.connector, isDone && styles.connectorDone]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTopRow}>
                    <Text style={[
                      styles.timelineLabel,
                      isDone && styles.timelineLabelDone,
                      isCurrentStep && !isCancelled && styles.timelineLabelActive,
                    ]}>
                      {step.label}
                    </Text>
                    {(isDone || isCurrentStep) && (
                      <Text style={styles.timelineTime}>
                        {tracked ? `${formatDate(tracked.timestamp)} ${formatTime(tracked.timestamp)}` : isCurrentStep ? 'Vừa xong' : ''}
                      </Text>
                    )}
                  </View>
                  {(isDone || isCurrentStep) && tracked?.note && (
                    <Text style={styles.timelineNote}>{tracked.note}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Order details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chi tiết đơn hàng</Text>
          {[
            { label: 'Mã vận đơn', value: order.trackingCode },
            { label: 'Xe vận chuyển', value: order.assignedDriver?.vehiclePlate ?? order.trip?.driver?.vehiclePlate ?? '—' },
            { label: 'Trọng lượng', value: order.actualWeightKg ? `${order.actualWeightKg}kg` : (WEIGHT_LABEL[order.weightRange] ?? order.weightRange) },
            { label: 'Người gửi', value: `${order.senderName} · ${order.senderPhone}` },
            { label: 'Người nhận', value: `${order.receiverName} · ${order.receiverPhone}` },
            { label: 'Địa chỉ giao', value: order.receiverAddress ?? 'Tự đến bến lấy' },
            { label: 'Tổng tiền', value: `${order.total?.toLocaleString('vi-VN')}đ`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={[styles.infoValue, highlight && { color: Colors.blue }]} numberOfLines={2}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Actions after delivery */}
        {(order.status === 'DELIVERED' || order.status === 'DISPUTED') && (
          <View style={styles.actionsWrap}>
            {order.status === 'DELIVERED' && (
              order.review ? (
                <View style={styles.reviewedBadge}>
                  <Ionicons name="star" size={16} color={Colors.success} style={{ marginRight: 8 }} />
                  <Text style={styles.reviewedText}>Đã đánh giá {'⭐'.repeat(order.review.overallRating ?? 5)}</Text>
                </View>
              ) : (
                <Button
                  label="Đánh giá nhà xe"
                  icon="⭐"
                  onPress={() => router.push(`/(customer)/orders/review/${id}` as any)}
                  variant="outline"
                  style={{ marginBottom: 10 }}
                />
              )
            )}
            {order.complaint ? (
              <TouchableOpacity
                style={styles.complaintBanner}
                onPress={() => router.push(`/(customer)/orders/complaint/${id}` as any)}
              >
                <View style={[styles.complaintIconWrap, { backgroundColor: Colors.warningBg }]}>
                  <Ionicons name="warning-outline" size={20} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.complaintLabel}>Khiếu nại đang xử lý</Text>
                  <Text style={styles.complaintSub}>Nhấn để xem chi tiết →</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
              </TouchableOpacity>
            ) : order.status === 'DELIVERED' ? (
              <Button label="Khiếu nại đơn hàng" icon="⚠️" onPress={() => router.push(`/(customer)/orders/complaint/${id}` as any)} variant="danger" />
            ) : null}
          </View>
        )}

        {/* Nút xem QR — hiện khi đơn đang xử lý hoặc đang giao */}
        {!['CANCELLED', 'DELIVERED'].includes(order.status) && (
          <View style={styles.actionsWrap}>
            <TouchableOpacity style={qrStyles.qrBtn} onPress={() => setShowQrModal(true)} activeOpacity={0.85}>
              <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
              <Text style={qrStyles.qrBtnText}>Xem mã QR đơn hàng</Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'PENDING' && (
          <View style={styles.actionsWrap}>
            <Button label="Hủy đơn hàng" onPress={() => { setSelectedReason(''); setShowCancelModal(true); }} variant="danger" />
          </View>
        )}

        {order.status === 'CONFIRMED' && (
          <View style={styles.actionsWrap}>
            <Button
              label="Hủy đơn hàng"
              variant="danger"
              onPress={() =>
                Alert.alert(
                  'Không thể hủy đơn',
                  'Nhà xe đã xác nhận đơn hàng của bạn. Đơn hàng không thể hủy tại thời điểm này.\n\nNếu cần hỗ trợ, vui lòng liên hệ nhà xe hoặc bộ phận chăm sóc khách hàng.',
                  [
                    { text: 'Liên hệ hỗ trợ', onPress: () => router.push('/(customer)/support' as any) },
                    { text: 'Đóng', style: 'cancel' },
                  ]
                )
              }
            />
          </View>
        )}
      </ScrollView>

      {/* QR Modal */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowQrModal(false)} />
        <View style={qrStyles.qrSheet}>
          <View style={styles.modalHandle} />
          <Text style={qrStyles.qrTitle}>Mã QR đơn hàng</Text>
          <Text style={qrStyles.qrSub}>Cho tài xế quét mã này để xác nhận giao hàng</Text>
          <View style={qrStyles.qrBox}>
            <QRCode
              value={`delilog://orders/${order.id}`}
              size={200}
              color="#1A3566"
              backgroundColor="#fff"
              getRef={(ref) => { qrRef.current = ref; }}
            />
          </View>
          <Text style={qrStyles.trackText}>#{order.trackingCode}</Text>
          <Text style={qrStyles.recipientText}>{order.receiverName} · {order.receiverAddress ?? ''}</Text>

          {/* Nút tải về + Đóng */}
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <TouchableOpacity
              style={qrStyles.downloadBtn}
              onPress={downloadQr}
              activeOpacity={0.85}
              disabled={savingQr}
            >
              {savingQr
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <><Ionicons name="share-outline" size={18} color={Colors.primary} /><Text style={qrStyles.downloadBtnText}>Lưu / Chia sẻ</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity style={qrStyles.closeBtn} onPress={() => setShowQrModal(false)} activeOpacity={0.8}>
              <Text style={qrStyles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancel modal */}
      <Modal visible={showCancelModal} transparent animationType="slide" onRequestClose={() => setShowCancelModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCancelModal(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Lý do hủy đơn</Text>
          <Text style={styles.modalSub}>Vui lòng chọn lý do để chúng tôi cải thiện dịch vụ</Text>
          {CANCEL_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reasonRow, selectedReason === reason && styles.reasonRowActive]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={[styles.radioCircle, selectedReason === reason && styles.radioCircleActive]}>
                {selectedReason === reason && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.reasonText, selectedReason === reason && { color: Colors.blue, fontWeight: '600' }]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(false)}>
              <Text style={styles.cancelBtnText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedReason && { opacity: 0.5 }]}
              disabled={!selectedReason || cancelMutation.isPending}
              onPress={() => cancelMutation.mutate(selectedReason)}
            >
              {cancelMutation.isPending
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.confirmBtnText}>Xác nhận hủy</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, backgroundColor: '#EEF2FF',
  },
  qrBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  qrSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 20,
  },
  qrTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 8 },
  qrSub: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 20, textAlign: 'center' },
  qrBox: {
    padding: 20, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  trackText: { marginTop: 16, fontSize: 15, fontWeight: '700', color: '#1A3566', letterSpacing: 1 },
  recipientText: { marginTop: 4, fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  downloadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: '#EEF2FF',
  },
  downloadBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  closeBtn: {
    flex: 1, paddingVertical: 14, backgroundColor: Colors.primary,
    borderRadius: 12, alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const mapStyles = StyleSheet.create({
  markerBubble: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 3, elevation: 6,
  },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
    marginTop: -1,
  },
  centerBtn: {
    position: 'absolute',
    right: 54,
    bottom: 10,
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  zoomControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#374151',
    lineHeight: 24,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 6,
  },
  zoomBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zoomBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  infoTime: {
    marginLeft: 'auto',
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Layout.padding, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  trackCode: { ...Typography.h4, color: Colors.white },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveText: { ...Typography.caption, color: '#4ADE80', fontWeight: '700', letterSpacing: 1 },

  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cityBlock: { width: 60 },
  cityCode: { ...Typography.h2, color: Colors.white, fontSize: 22 },
  cityName: { ...Typography.caption, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  progressWrap: { flex: 1, marginHorizontal: 12 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 8, position: 'relative', overflow: 'visible' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#60A5FA', borderRadius: 3 },
  busWrap: { position: 'absolute', top: -10, width: 24, height: 24, backgroundColor: Colors.blue, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.65)', textAlign: 'center', fontSize: 10 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { ...Typography.bodyBold, color: Colors.white, fontSize: 13 },
  statLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.5)', marginTop: 3, fontSize: 10 },

  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, margin: 12, marginBottom: 0, marginTop: 12, ...Shadow.md },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 18 },

  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  dotCol: { width: 38, alignItems: 'center' },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Colors.success },
  dotActive: { backgroundColor: Colors.blue },
  connector: { width: 2, flex: 1, minHeight: 24, backgroundColor: Colors.border, marginVertical: 3 },
  connectorDone: { backgroundColor: Colors.success },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 18, justifyContent: 'center' },
  timelineTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineLabel: { ...Typography.body, color: Colors.placeholder, flex: 1 },
  timelineLabelDone: { color: Colors.dark, fontWeight: '500' },
  timelineLabelActive: { color: Colors.blue, fontWeight: '700' },
  timelineTime: { ...Typography.caption, color: Colors.secondary, marginLeft: 8 },
  timelineNote: { ...Typography.small, color: Colors.secondary, marginTop: 3, fontStyle: 'italic' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  infoLabel: { ...Typography.small, color: Colors.secondary, width: 90 },
  infoValue: { ...Typography.bodyBold, color: Colors.dark, flex: 1, textAlign: 'right' },

  actionsWrap: { paddingHorizontal: 12, marginTop: 12, marginBottom: 4 },
  reviewedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successBg, borderRadius: Layout.radius, padding: 14, marginBottom: 10 },
  reviewedText: { ...Typography.bodyBold, color: Colors.success },
  complaintBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningBg, borderRadius: Layout.radius, padding: 14, gap: 12 },
  complaintIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  complaintLabel: { ...Typography.bodyBold, color: Colors.warning },
  complaintSub: { ...Typography.small, color: Colors.secondary, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: Layout.padding, paddingTop: 14 },
  modalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { ...Typography.h3, color: Colors.dark, marginBottom: 6 },
  modalSub: { ...Typography.small, color: Colors.secondary, marginBottom: 18 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.bg },
  reasonRowActive: { backgroundColor: Colors.infoBg, marginHorizontal: -Layout.padding, paddingHorizontal: Layout.padding },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioCircleActive: { borderColor: Colors.blue },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.blue },
  reasonText: { ...Typography.body, color: Colors.dark, flex: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { ...Typography.bodyBold, color: Colors.secondary },
  confirmBtn: { flex: 1, backgroundColor: Colors.error, borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { ...Typography.bodyBold, color: Colors.white },
});
