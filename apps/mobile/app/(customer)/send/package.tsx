import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderStore } from '@store/order.store';
import { useAuthStore } from '@store/auth.store';
import { StepIndicator } from '@components/ui/StepIndicator';
import { Button } from '@components/ui/Button';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const STEPS = [{ label: 'Tuyến' }, { label: 'Xe' }, { label: 'Hàng hóa' }, { label: 'Xem lại' }];

interface Field { name: string; label: string; placeholder: string; icon: string; keyboardType?: string; required?: boolean }

const SENDER_FIELDS: Field[] = [
  { name: 'senderName', label: 'HỌ VÀ TÊN', placeholder: 'Nguyễn Văn A', icon: 'person-outline', required: true },
  { name: 'senderPhone', label: 'SỐ ĐIỆN THOẠI', placeholder: '0912 345 678', icon: 'call-outline', keyboardType: 'phone-pad', required: true },
  { name: 'senderAddress', label: 'ĐỊA CHỈ LẤY HÀNG', placeholder: 'Số nhà, đường, quận...', icon: 'location-outline' },
];

const RECEIVER_FIELDS: Field[] = [
  { name: 'receiverName', label: 'HỌ VÀ TÊN NGƯỜI NHẬN', placeholder: 'Trần Thị B', icon: 'person-outline', required: true },
  { name: 'receiverPhone', label: 'SỐ ĐIỆN THOẠI NGƯỜI NHẬN', placeholder: '0987 654 321', icon: 'call-outline', keyboardType: 'phone-pad', required: true },
  { name: 'receiverAddress', label: 'ĐỊA CHỈ NHẬN HÀNG', placeholder: '45 Lê Lợi, Q.1, TP.HCM', icon: 'location-outline' },
];

export default function SendStep3() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { draft, updateDraft } = useOrderStore();

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      senderName: user?.fullName ?? '',
      senderPhone: user?.phone ?? '',
      senderAddress: '',
      receiverName: draft.receiverName ?? '',
      receiverPhone: draft.receiverPhone ?? '',
      receiverAddress: draft.receiverAddress ?? '',
      goodsDescription: draft.goodsDescription ?? '',
      goodsValue: draft.goodsValue?.toString() ?? '',
    },
  });

  const onNext = (data: any) => {
    updateDraft({
      senderName: data.senderName,
      senderPhone: data.senderPhone,
      senderAddress: data.senderAddress,
      receiverName: data.receiverName,
      receiverPhone: data.receiverPhone,
      receiverAddress: data.receiverAddress,
      goodsDescription: data.goodsDescription,
      goodsValue: data.goodsValue ? parseFloat(data.goodsValue) : undefined,
    });
    router.push('/(customer)/send/review');
  };

  const renderField = (field: Field) => (
    <View key={field.name} style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{field.label}{field.required && <Text style={{ color: Colors.error }}> *</Text>}</Text>
      <Controller
        control={control}
        name={field.name as any}
        rules={field.required ? { required: 'Bắt buộc nhập' } : {}}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            <View style={[styles.inputWrap, error && styles.inputError]}>
              <Ionicons name={field.icon as any} size={18} color={error ? Colors.error : Colors.placeholder} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                keyboardType={(field.keyboardType as any) ?? 'default'}
                value={value}
                onChangeText={onChange}
              />
            </View>
            {error && <Text style={styles.errorText}>{error.message}</Text>}
          </>
        )}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <StepIndicator steps={STEPS} current={2} />

        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          {/* Người gửi */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông tin người gửi</Text>
            {SENDER_FIELDS.map(renderField)}
          </View>

          {/* Người nhận */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông tin người nhận</Text>
            {RECEIVER_FIELDS.map(renderField)}
          </View>

          {/* Chi tiết hàng */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chi tiết hàng gửi</Text>

            <Text style={styles.label}>MÔ TẢ HÀNG HÓA</Text>
            <Controller
              control={control}
              name="goodsDescription"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputWrap}>
                  <Ionicons name="pencil-outline" size={18} color={Colors.placeholder} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 3 áo sơ mi, hàng dễ vỡ..."
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>GIÁ TRỊ HÀNG HÓA (VNĐ)</Text>
            <Controller
              control={control}
              name="goodsValue"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputWrap}>
                  <Ionicons name="wallet-outline" size={18} color={Colors.placeholder} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập giá trị VNĐ..."
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
            <Text style={styles.hint}>* Dùng để tính bảo hiểm nếu có</Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.footerRow}>
            <Button label="← Quay lại" onPress={() => router.back()} variant="outline" fullWidth={false} style={{ flex: 1, marginRight: 8 }} />
            <Button label="Xem lại đơn →" onPress={handleSubmit(onNext)} style={{ flex: 2 }} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, ...Shadow.md },
  cardTitle: { ...Typography.h4, color: Colors.dark, marginBottom: 16 },
  label: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 8, letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Layout.radius,
    paddingHorizontal: 12, minHeight: Layout.inputHeight,
  },
  inputError: { borderColor: Colors.error },
  input: { flex: 1, ...Typography.body, color: Colors.primary, paddingVertical: 10 },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },
  hint: { ...Typography.caption, color: Colors.placeholder, marginTop: 6 },
  footer: { padding: Layout.padding, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md },
  footerRow: { flexDirection: 'row' },
});
