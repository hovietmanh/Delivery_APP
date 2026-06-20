import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '@services/auth.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;
      if (status === 409) {
        Alert.alert('Số điện thoại đã tồn tại', 'Số điện thoại này đã được đăng ký. Vui lòng dùng số khác hoặc đăng nhập.');
      } else if (serverMsg) {
        Alert.alert('Đăng ký thất bại', serverMsg);
      } else {
        Alert.alert('Đăng ký thất bại', 'Vui lòng kiểm tra lại thông tin và thử lại.');
      }
    }
  };

  const fields = [
    { name: 'fullName', label: 'HỌ VÀ TÊN', placeholder: 'Nguyễn Văn A', icon: 'person-outline', type: 'default' },
    { name: 'phone', label: 'SỐ ĐIỆN THOẠI', placeholder: '0912 345 678', icon: 'call-outline', type: 'phone-pad' },
    { name: 'password', label: 'MẬT KHẨU', placeholder: 'Ít nhất 6 ký tự', icon: 'lock-closed-outline' },
    { name: 'confirmPassword', label: 'XÁC NHẬN MẬT KHẨU', placeholder: 'Nhập lại mật khẩu', icon: 'shield-checkmark-outline' },
  ] as Array<{ name: 'fullName'|'phone'|'password'|'confirmPassword'; label: string; placeholder: string; icon: string; type?: string }>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={['#0F172A', '#1E3A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.white} />
            <Text style={styles.backText}>Quay lại</Text>
          </TouchableOpacity>
          <View style={styles.headerIconWrap}>
            <Ionicons name="person-add-outline" size={32} color={Colors.blueLight} />
          </View>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Đăng ký để gửi hàng liên tỉnh</Text>
        </LinearGradient>

        <View style={styles.form}>
          {fields.map(({ name, label, placeholder, icon, type }) => {
            const isPassword = name === 'password';
            const isConfirm = name === 'confirmPassword';
            const isSecureField = isPassword || isConfirm;
            const visible = isPassword ? showPassword : isConfirm ? showConfirm : true;
            const toggleVisible = isPassword
              ? () => setShowPassword((v) => !v)
              : isConfirm
              ? () => setShowConfirm((v) => !v)
              : undefined;

            return (
              <View key={name} style={{ marginBottom: 16 }}>
                <Text style={styles.label}>{label}</Text>
                <Controller
                  control={control}
                  name={name}
                  render={({ field: { onChange, value } }) => (
                    <View style={[styles.inputWrap, errors[name] && styles.inputError]}>
                      <Ionicons name={icon as any} size={18} color={Colors.placeholder} style={styles.icon} />
                      <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        keyboardType={(type as any) ?? 'default'}
                        secureTextEntry={isSecureField && !visible}
                        value={value}
                        onChangeText={onChange}
                        autoCapitalize="none"
                      />
                      {isSecureField && (
                        <TouchableOpacity onPress={toggleVisible} style={styles.eyeBtn}>
                          <Ionicons
                            name={visible ? 'eye-outline' : 'eye-off-outline'}
                            size={20}
                            color={Colors.placeholder}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                />
                {errors[name] && (
                  <Text style={styles.errorText}>{errors[name]?.message as string}</Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Ionicons name={isSubmitting ? 'hourglass-outline' : 'person-add-outline'} size={20} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>
              {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  header: {
    padding: Layout.paddingLg,
    paddingBottom: 36,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.8)', ...Typography.body, marginLeft: 4 },
  headerIconWrap: { width: 68, height: 68, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { ...Typography.h1, color: Colors.white },
  subtitle: { ...Typography.small, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form: { padding: Layout.padding, marginTop: 8, backgroundColor: Colors.bg },
  label: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 8, letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Layout.radius,
    paddingHorizontal: 12, height: Layout.inputHeight,
  },
  inputError: { borderColor: Colors.error },
  icon: { marginRight: 10 },
  eyeBtn: { padding: 4 },
  input: { flex: 1, ...Typography.body, color: Colors.primary },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },
  btn: {
    flexDirection: 'row', backgroundColor: Colors.blue, borderRadius: Layout.radius,
    height: Layout.buttonHeight, alignItems: 'center',
    justifyContent: 'center', marginTop: 8, ...Shadow.blue,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...Typography.h4, color: Colors.white },
});
