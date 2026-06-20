import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Linking, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const METHOD_LABEL: Record<string, string> = {
  CASH_AT_STATION: 'Tiền mặt tại bến',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  VIET_QR: 'VietQR',
  MOMO: 'Ví MoMo',
};

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, trackingCode, method } = useLocalSearchParams<{
    orderId: string;
    trackingCode: string;
    method: string;
  }>();

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', orderId],
    queryFn: () => api.get(`/payments/${orderId}`).then(r => r.data),
    enabled: !!orderId,
    refetchInterval: method === 'MOMO' ? 3000 : false, // Poll MoMo every 3s
  });

  const goToSuccess = () => {
    router.replace({
      pathname: '/(customer)/success',
      params: { orderId, trackingCode },
    } as any);
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Đã sao chép', text);
  };

  const openMoMo = async () => {
    if (!payment?.momoPayUrl) return;
    const canOpen = await Linking.canOpenURL(payment.momoPayUrl);
    if (canOpen) {
      await Linking.openURL(payment.momoPayUrl);
    } else {
      Alert.alert('Không mở được MoMo', 'Vui lòng cài đặt app MoMo hoặc mở trình duyệt.');
    }
  };

  if (isLoading || !payment) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={Typography.body}>Đang tải thông tin thanh toán...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingTop: 28, paddingBottom: insets.bottom + 100 }}>

        {/* ── Header ── */}
        <LinearGradient colors={['#0F172A', '#1E3A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="cash-outline" size={28} color={Colors.blueLight} />
          </View>
          <Text style={styles.methodLabel}>{METHOD_LABEL[method] ?? method}</Text>
          <Text style={styles.amount}>{payment.amount?.toLocaleString('vi-VN')}đ</Text>
          <Text style={styles.refCode}>Mã tham chiếu: {payment.referenceCode}</Text>
        </LinearGradient>

        {/* ── CASH AT STATION ── */}
        {method === 'CASH_AT_STATION' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💵 Hướng dẫn thanh toán</Text>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>Mang hàng đến bến xe theo lịch hẹn</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>Đến quầy nhà xe, đưa mã vận đơn <Text style={{ color: Colors.blue, fontWeight: 'bold' }}>{trackingCode}</Text></Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepText}>Thanh toán <Text style={{ color: Colors.blue, fontWeight: 'bold' }}>{payment.amount?.toLocaleString('vi-VN')}đ</Text> và nhận biên lai</Text>
            </View>
            <View style={styles.note}>
              <Text style={styles.noteText}>⏰ Nhà xe sẽ xác nhận đơn sau khi nhận tiền mặt</Text>
            </View>
          </View>
        )}

        {/* ── BANK TRANSFER ── */}
        {method === 'BANK_TRANSFER' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏦 Thông tin chuyển khoản</Text>
            {[
              { label: 'Ngân hàng', value: payment.bankName },
              { label: 'Số tài khoản', value: payment.accountNumber, copy: true },
              { label: 'Chủ tài khoản', value: payment.accountName },
              { label: 'Số tiền', value: `${payment.amount?.toLocaleString('vi-VN')}đ` },
              { label: 'Nội dung CK', value: payment.referenceCode, copy: true, highlight: true },
            ].map(({ label, value, copy, highlight }) => (
              <View key={label} style={styles.bankRow}>
                <Text style={styles.bankLabel}>{label}</Text>
                <View style={styles.bankValueWrap}>
                  <Text style={[styles.bankValue, highlight && styles.highlightText]}>{value}</Text>
                  {copy && (
                    <TouchableOpacity onPress={() => copyToClipboard(value!)} style={styles.copyBtn}>
                      <Text style={styles.copyIcon}>📋</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            <View style={styles.note}>
              <Text style={styles.noteText}>⚠️ Nhập đúng nội dung chuyển khoản để hệ thống tự xác nhận</Text>
            </View>
          </View>
        )}

        {/* ── VIET QR ── */}
        {method === 'VIET_QR' && (
          <>
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text style={styles.cardTitle}>📷 Quét mã QR để thanh toán</Text>
              {payment.qrUrl ? (
                <Image
                  source={{ uri: payment.qrUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Text style={{ color: Colors.secondary }}>Đang tải mã QR...</Text>
                </View>
              )}
              <Text style={styles.qrHint}>Mở app ngân hàng → Quét QR → Xác nhận</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏦 Thông tin tài khoản</Text>
              {[
                { label: 'Ngân hàng', value: payment.bankName },
                { label: 'STK', value: payment.accountNumber },
                { label: 'Chủ TK', value: payment.accountName },
                { label: 'Nội dung', value: payment.referenceCode, copy: true },
              ].map(({ label, value, copy }) => (
                <View key={label} style={styles.bankRow}>
                  <Text style={styles.bankLabel}>{label}</Text>
                  <View style={styles.bankValueWrap}>
                    <Text style={styles.bankValue}>{value}</Text>
                    {copy && (
                      <TouchableOpacity onPress={() => copyToClipboard(value!)} style={styles.copyBtn}>
                        <Text style={styles.copyIcon}>📋</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── MOMO ── */}
        {method === 'MOMO' && (
          <View style={styles.card}>
            <View style={styles.momoHeader}>
              <Text style={styles.momoIcon}>📱</Text>
              <View>
                <Text style={styles.cardTitle}>Thanh toán qua MoMo</Text>
                <Text style={styles.momoSub}>Nhấn nút bên dưới để mở app MoMo</Text>
              </View>
            </View>
            <View style={styles.momoAmount}>
              <Text style={styles.momoAmountLabel}>Số tiền thanh toán</Text>
              <Text style={styles.momoAmountValue}>{payment.amount?.toLocaleString('vi-VN')}đ</Text>
            </View>
            <TouchableOpacity style={styles.momoBtn} onPress={openMoMo}>
              <Text style={styles.momoBtnText}>Mở MoMo thanh toán →</Text>
            </TouchableOpacity>
            <View style={styles.note}>
              <Text style={styles.noteText}>
                {payment.status === 'PAID'
                  ? '✅ Thanh toán thành công!'
                  : '⏳ Đang chờ xác nhận từ MoMo...'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Thời hạn ── */}
        {payment.expiredAt && method !== 'CASH_AT_STATION' && (
          <View style={styles.expiredNote}>
            <Text style={styles.expiredText}>
              ⏰ Thanh toán trước {new Date(payment.expiredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} hôm nay
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Footer buttons ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {method === 'MOMO' && payment.status === 'PAID' ? (
          <Button label="Xem chi tiết đơn hàng →" onPress={goToSuccess} variant="success" />
        ) : method === 'CASH_AT_STATION' ? (
          <Button label="Đã hiểu, xem đơn hàng →" onPress={goToSuccess} />
        ) : (
          <>
            <Button
              label="✅ Tôi đã thanh toán"
              onPress={goToSuccess}
              variant="success"
            />
            <View style={{ height: 8 }} />
            <Button
              label="Hủy & quay lại"
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(customer)')}
              variant="outline"
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderRadius: Layout.radiusLg,
    paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', marginBottom: 16, ...Shadow.blue,
  },
  headerIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  methodLabel: { ...Typography.small, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  amount: { ...Typography.h1, color: Colors.white, marginBottom: 10 },
  refCode: { ...Typography.caption, color: 'rgba(255,255,255,0.6)' },

  card: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: Layout.cardPadding, marginBottom: 12, ...Shadow.md,
  },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 14 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1,
  },
  stepNumText: { ...Typography.smallBold, color: Colors.white },
  stepText: { ...Typography.body, color: Colors.dark, flex: 1, lineHeight: 22 },

  bankRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  bankLabel: { ...Typography.small, color: Colors.secondary, width: 90 },
  bankValueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  bankValue: { ...Typography.bodyBold, color: Colors.dark, textAlign: 'right', flex: 1 },
  highlightText: { color: Colors.blue, fontSize: 16 },
  copyBtn: { marginLeft: 8, padding: 4 },
  copyIcon: { fontSize: 16 },

  qrImage: { width: 220, height: 220, marginVertical: 12 },
  qrPlaceholder: {
    width: 220, height: 220, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center', borderRadius: 8,
    marginVertical: 12,
  },
  qrHint: { ...Typography.small, color: Colors.secondary, textAlign: 'center', marginTop: 4 },

  momoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  momoIcon: { fontSize: 40, marginRight: 12 },
  momoSub: { ...Typography.small, color: Colors.secondary, marginTop: 2 },
  momoAmount: {
    backgroundColor: Colors.bg, borderRadius: Layout.radius,
    padding: 16, alignItems: 'center', marginBottom: 16,
  },
  momoAmountLabel: { ...Typography.small, color: Colors.secondary },
  momoAmountValue: { ...Typography.h2, color: Colors.navy, marginTop: 4 },
  momoBtn: {
    backgroundColor: '#AE2070', borderRadius: Layout.radius,
    paddingVertical: 14, alignItems: 'center',
  },
  momoBtnText: { ...Typography.h4, color: Colors.white },

  note: {
    backgroundColor: Colors.infoBg, borderRadius: Layout.radius,
    padding: 12, marginTop: 12,
  },
  noteText: { ...Typography.small, color: Colors.blue, lineHeight: 18 },

  expiredNote: {
    backgroundColor: Colors.warningBg ?? '#FFF7ED',
    borderRadius: Layout.radius, padding: 12, marginBottom: 12,
    alignItems: 'center',
  },
  expiredText: { ...Typography.small, color: '#D97706' },

  footer: {
    padding: Layout.padding, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md,
  },
});
