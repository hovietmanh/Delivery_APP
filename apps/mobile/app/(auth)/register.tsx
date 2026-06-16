import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '@services/auth.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const schema = z.object({
  fullName: z.string().min(2, 'Nhập họ và tên'),
  phone: z.string().regex(/^(\+84|0)[3-9][0-9]{8}$/, 'Số điện thoại không hợp lệ'),
  password: z.string().min(6, 'Ít nhất 6 ký tự'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    try {
      await authApi.register({ fullName: data.fullName, phone: data.phone, password: data.password });
      Alert.alert('Đăng ký thành công!', 'Vui lòng đăng nhập để tiếp tục', [
        { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message ?? 'Đăng ký thất bại');
    }
  };

  const fields = [
    { name: 'fullName', label: 'HỌ VÀ TÊN', placeholder: 'Nguyễn Văn A', icon: '👤', type: 'default' },
    { name: 'phone', label: 'SỐ ĐIỆN THOẠI', placeholder: '0912 345 678', icon: '📱', type: 'phone-pad' },
    { name: 'password', label: 'MẬT KHẨU', placeholder: 'Ít nhất 6 ký tự', icon: '🔒', secure: true },
    { name: 'confirmPassword', label: 'XÁC NHẬN MẬT KHẨU', placeholder: 'Nhập lại mật khẩu', icon: '🔒', secure: true },
  ] as Array<{ name: 'fullName'|'phone'|'password'|'confirmPassword'; label: string; placeholder: string; icon: string; type?: string; secure?: boolean }>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Đăng ký để gửi hàng liên tỉnh</Text>
        </View>

        <View style={styles.form}>
          {fields.map(({ name, label, placeholder, icon, type, secure }) => (
            <View key={name} style={{ marginBottom: 16 }}>
              <Text style={styles.label}>{label}</Text>
              <Controller
                control={control}
                name={name}
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputWrap, errors[name] && styles.inputError]}>
                    <Text style={styles.icon}>{icon}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={placeholder}
                      keyboardType={(type as any) ?? 'default'}
                      secureTextEntry={secure}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                )}
              />
              {errors[name] && (
                <Text style={styles.errorText}>{errors[name]?.message as string}</Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>
              {isSubmitting ? 'Đang đăng ký...' : '✅ Đăng ký'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  header: {
    backgroundColor: Colors.navy,
    padding: Layout.paddingLg,
    paddingTop: 56,
    paddingBottom: 32,
  },
  backBtn: { marginBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', ...Typography.body },
  title: { ...Typography.h1, color: Colors.white },
  subtitle: { ...Typography.small, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form: { padding: Layout.padding, marginTop: 8 },
  label: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 8, letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Layout.radius,
    paddingHorizontal: 12, height: Layout.inputHeight,
  },
  inputError: { borderColor: Colors.error },
  icon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, ...Typography.body, color: Colors.primary },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },
  btn: {
    backgroundColor: Colors.blue, borderRadius: Layout.radius,
    height: Layout.buttonHeight, alignItems: 'center',
    justifyContent: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...Typography.h4, color: Colors.white },
});
