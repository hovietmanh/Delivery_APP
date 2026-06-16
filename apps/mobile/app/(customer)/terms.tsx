import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const SECTIONS = [
  {
    title: '1. Điều khoản chung',
    content: `Bằng cách sử dụng ứng dụng Delilog, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này. Delilog cung cấp nền tảng kết nối người gửi hàng và nhà xe liên tỉnh trên toàn quốc.

Người dùng phải đủ 18 tuổi hoặc được sự đồng ý của phụ huynh/người giám hộ để sử dụng dịch vụ.`,
  },
  {
    title: '2. Đăng ký tài khoản',
    content: `Bạn có trách nhiệm bảo mật thông tin tài khoản của mình. Thông tin đăng ký phải chính xác và cập nhật. Delilog có quyền tạm khóa hoặc xóa tài khoản vi phạm điều khoản.

Mỗi số điện thoại chỉ được đăng ký một tài khoản duy nhất.`,
  },
  {
    title: '3. Quyền và nghĩa vụ của người dùng',
    content: `Người dùng có quyền:
• Sử dụng dịch vụ gửi hàng liên tỉnh theo các tuyến có sẵn
• Tra cứu trạng thái đơn hàng theo thời gian thực
• Yêu cầu hỗ trợ từ đội ngũ chăm sóc khách hàng

Người dùng có nghĩa vụ:
• Khai báo đúng loại hàng hóa, trọng lượng và giá trị
• Không gửi hàng cấm theo quy định pháp luật
• Thanh toán đầy đủ phí dịch vụ theo thỏa thuận`,
  },
  {
    title: '4. Hàng hóa bị cấm',
    content: `Nghiêm cấm gửi các loại hàng hóa sau qua Delilog:
• Chất nổ, chất cháy, vũ khí
• Chất ma túy và các chất gây nghiện
• Tiền mặt, vàng bạc không có giấy tờ
• Động vật sống và các loài động thực vật quý hiếm
• Hàng hóa vi phạm bản quyền, hàng giả

Delilog có quyền từ chối và báo cáo cơ quan chức năng nếu phát hiện hàng cấm.`,
  },
  {
    title: '5. Phí dịch vụ và thanh toán',
    content: `Phí vận chuyển được tính dựa trên tuyến đường, trọng lượng và loại dịch vụ. Giá được hiển thị rõ ràng trước khi xác nhận đơn hàng.

Delilog chấp nhận thanh toán qua tiền mặt tại bến, chuyển khoản ngân hàng, VietQR và ví MoMo. Phí có thể thay đổi theo chính sách mà không cần thông báo trước.`,
  },
  {
    title: '6. Bảo hiểm hàng hóa',
    content: `Delilog cung cấp tùy chọn bảo hiểm hàng hóa có thu phí. Mức bồi thường tối đa theo gói bảo hiểm đã chọn. Hàng hóa không mua bảo hiểm sẽ được đền bù tối đa 3 lần phí vận chuyển trong trường hợp hư hỏng do lỗi của nhà xe.`,
  },
  {
    title: '7. Chính sách hủy đơn và hoàn tiền',
    content: `Đơn hàng có thể hủy miễn phí khi ở trạng thái Chờ xác nhận hoặc Đã xác nhận. Sau khi hàng đã được lấy (trạng thái Đang lấy hàng trở đi), không thể hủy đơn.

Hoàn tiền được xử lý trong vòng 3-7 ngày làm việc tùy phương thức thanh toán.`,
  },
  {
    title: '8. Bảo mật thông tin',
    content: `Delilog cam kết bảo vệ thông tin cá nhân theo Luật An toàn thông tin mạng. Thông tin của bạn chỉ được sử dụng để cung cấp dịch vụ và không được chia sẻ với bên thứ ba ngoại trừ đối tác vận chuyển liên quan trực tiếp đến đơn hàng của bạn.`,
  },
  {
    title: '9. Giải quyết tranh chấp',
    content: `Mọi tranh chấp sẽ được giải quyết thông qua kênh hỗ trợ của Delilog trước. Nếu không thể giải quyết, các bên thỏa thuận đưa ra Tòa án nhân dân có thẩm quyền tại TP. Hà Nội.`,
  },
  {
    title: '10. Cập nhật điều khoản',
    content: `Delilog có quyền cập nhật Điều khoản sử dụng bất kỳ lúc nào. Người dùng sẽ được thông báo qua ứng dụng. Việc tiếp tục sử dụng dịch vụ sau khi điều khoản được cập nhật đồng nghĩa với việc bạn chấp nhận điều khoản mới.

Phiên bản hiện tại: 1.0.0 · Cập nhật: 01/06/2026`,
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { requireAccept } = useLocalSearchParams<{ requireAccept?: string }>();
  const mustAccept = requireAccept === 'true';
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(!mustAccept);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {!mustAccept && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, mustAccept && { marginLeft: 0 }]}>Điều khoản sử dụng</Text>
        <View style={{ width: 40 }} />
      </View>

      {mustAccept && (
        <View style={styles.mustReadBanner}>
          <Text style={styles.mustReadText}>📜 Vui lòng đọc hết điều khoản để tiếp tục</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={200}
        contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + (mustAccept ? 100 : 24) }}
      >
        <Text style={styles.intro}>
          Chào mừng bạn đến với Delilog — nền tảng gửi hàng liên tỉnh nhanh chóng, an toàn và tiết kiệm. Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng dịch vụ.
        </Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionContent}>{s.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bằng cách sử dụng Delilog, bạn xác nhận đã đọc, hiểu và đồng ý với toàn bộ Điều khoản sử dụng trên.
          </Text>
        </View>
      </ScrollView>

      {mustAccept && (
        <View style={[styles.acceptBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => hasScrolledToBottom && setAccepted(v => !v)}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkLabel, !hasScrolledToBottom && { color: Colors.placeholder }]}>
              Tôi đã đọc và đồng ý với Điều khoản sử dụng
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, (!accepted || !hasScrolledToBottom) && styles.acceptBtnDisabled]}
            onPress={handleAccept}
            disabled={!accepted || !hasScrolledToBottom}
          >
            <Text style={styles.acceptBtnText}>Xác nhận & Tiếp tục</Text>
          </TouchableOpacity>
          {!hasScrolledToBottom && (
            <Text style={styles.scrollHint}>↓ Cuộn xuống hết để kích hoạt nút đồng ý</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.navy,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Layout.padding, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: Colors.white },
  headerTitle: { ...Typography.h3, color: Colors.white, flex: 1, textAlign: 'center' },

  mustReadBanner: {
    backgroundColor: '#FEF3C7', paddingVertical: 10, paddingHorizontal: Layout.padding,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  mustReadText: { ...Typography.small, color: '#92400E', textAlign: 'center', fontWeight: '600' },

  intro: {
    ...Typography.body, color: Colors.secondary,
    backgroundColor: Colors.infoBg, borderRadius: Layout.radiusSm,
    padding: 14, marginBottom: 16, lineHeight: 22,
  },

  section: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { ...Typography.bodyBold, color: Colors.dark, marginBottom: 10 },
  sectionContent: { ...Typography.body, color: Colors.secondary, lineHeight: 22 },

  footer: {
    backgroundColor: Colors.navy, borderRadius: Layout.radiusLg,
    padding: 16, marginTop: 8,
  },
  footerText: { ...Typography.body, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },

  acceptBar: {
    backgroundColor: Colors.white, paddingHorizontal: Layout.padding, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  checkmark: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  checkLabel: { ...Typography.body, color: Colors.dark, flex: 1 },
  acceptBtn: {
    backgroundColor: Colors.blue, borderRadius: Layout.radius,
    paddingVertical: 14, alignItems: 'center',
  },
  acceptBtnDisabled: { backgroundColor: Colors.border },
  acceptBtnText: { ...Typography.bodyBold, color: Colors.white },
  scrollHint: { ...Typography.caption, color: Colors.secondary, textAlign: 'center', marginTop: 8 },
});
