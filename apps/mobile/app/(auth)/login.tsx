import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

type Role = 'CUSTOMER' | 'DRIVER';

const customerSchema = z.object({
  phone: z.string().regex(/^(\+84|0)[3-9][0-9]{8}$/, 'Số điện thoại không hợp lệ'),
  password: z.string().min(6, 'Ít nhất 6 ký tự'),
});

const driverSchema = z.object({
  driverCode: z.string().min(2, 'Nhập mã tài xế'),
  password: z.string().min(6, 'Ít nhất 6 ký tự'),
  vehiclePlate: z.string().min(4, 'Nhập biển số xe'),
});

export default function LoginScreen() {
  const [role, setRole] = useState<Role>('CUSTOMER');
  const { login, loginDriver, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();

  const customerForm = useForm({ resolver: zodResolver(customerSchema) });
  const driverForm = useForm({ resolver: zodResolver(driverSchema) });

  const onCustomerLogin = async (data: any) => {
    try {
      await login(data.phone, data.password);
      router.replace('/(customer)');
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.message ?? 'Vui lòng thử lại');
    }
  };

  const onDriverLogin = async (data: any) => {
    try {
      await loginDriver(data.driverCode, data.vehiclePlate, data.password);
      router.replace('/(driver)');
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.message ?? 'Vui lòng thử lại';
      Alert.alert('Đăng nhập thất bại', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚌</Text>
          <Text style={styles.appName}>Delilog</Text>
          <Text style={styles.tagline}>
            {role === 'CUSTOMER' ? 'Giao hàng liên tỉnh nhanh chóng' : 'Cổng quản lý dành cho tài xế'}
          </Text>
        </View>

        {/* Role Toggle */}
        <View style={styles.toggleWrap}>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'CUSTOMER' && styles.toggleActive]}
            onPress={() => setRole('CUSTOMER')}
          >
            <Text style={[styles.toggleText, role === 'CUSTOMER' && styles.toggleTextActive]}>
              👤 Người dùng
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'DRIVER' && styles.toggleActive]}
            onPress={() => setRole('DRIVER')}
          >
            <Text style={[styles.toggleText, role === 'DRIVER' && styles.toggleTextActive]}>
              🚌 Nhà xe
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer Form */}
        {role === 'CUSTOMER' && (
          <View style={styles.form}>
            <Text style={styles.label}>SỐ ĐIỆN THOẠI</Text>
            <Controller
              control={customerForm.control}
              name="phone"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                  <View style={[styles.inputWrap, error && styles.inputError]}>
                    <Text style={styles.inputIcon}>📱</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0912 345 678"
                      keyboardType="phone-pad"
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>MẬT KHẨU</Text>
            <Controller
              control={customerForm.control}
              name="password"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                  <View style={[styles.inputWrap, error && styles.inputError]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập mật khẩu..."
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />

            <TouchableOpacity onPress={() => {}} style={styles.forgotWrap}>
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitDisabled]}
              onPress={customerForm.handleSubmit(onCustomerLogin)}
              disabled={isLoading}
            >
              <Text style={styles.submitText}>
                {isLoading ? 'Đang đăng nhập...' : '🚀 Đăng nhập'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc đăng nhập với</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              {['Google', 'Facebook', 'Apple'].map((name) => (
                <TouchableOpacity key={name} style={styles.socialBtn}>
                  <Text style={styles.socialText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerText}>
                Chưa có tài khoản?{' '}
                <Text style={{ color: Colors.blue, fontWeight: '600' }}>Đăng ký ngay</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Driver Form */}
        {role === 'DRIVER' && (
          <View style={styles.form}>
            <Text style={styles.label}>MÃ TÀI XẾ</Text>
            <Controller
              control={driverForm.control}
              name="driverCode"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                  <View style={[styles.inputWrap, error && styles.inputError]}>
                    <Text style={styles.inputIcon}>🪪</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="TX-088"
                      autoCapitalize="characters"
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>MẬT KHẨU</Text>
            <Controller
              control={driverForm.control}
              name="password"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                  <View style={[styles.inputWrap, error && styles.inputError]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập mật khẩu..."
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>BIỂN SỐ XE PHỤ TRÁCH</Text>
            <Controller
              control={driverForm.control}
              name="vehiclePlate"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                  <View style={[styles.inputWrap, error && styles.inputError]}>
                    <Text style={styles.inputIcon}>🚌</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="29A-001.23"
                      autoCapitalize="characters"
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {error && <Text style={styles.errorText}>{error.message}</Text>}
                </>
              )}
            />

            <TouchableOpacity onPress={() => {}} style={styles.forgotWrap}>
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, styles.submitDriver, isLoading && styles.submitDisabled]}
              onPress={driverForm.handleSubmit(onDriverLogin)}
              disabled={isLoading}
            >
              <Text style={styles.submitText}>
                {isLoading ? 'Đang đăng nhập...' : '🔑 Đăng nhập nhà xe'}
              </Text>
            </TouchableOpacity>

            <View style={styles.driverNote}>
              <Text style={styles.driverNoteText}>
                ℹ️  Tài khoản do nhà xe cấp. Liên hệ quản lý nếu cần hỗ trợ.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.white },
  header: {
    backgroundColor: Colors.navy,
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  logo: { fontSize: 56 },
  appName: { ...Typography.h1, color: Colors.white, marginTop: 8 },
  tagline: { ...Typography.small, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  toggleWrap: {
    flexDirection: 'row',
    margin: Layout.padding,
    backgroundColor: Colors.bg,
    borderRadius: Layout.radius,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Layout.radiusSm,
  },
  toggleActive: { backgroundColor: Colors.blue },
  toggleText: { ...Typography.bodyBold, color: Colors.secondary },
  toggleTextActive: { color: Colors.white },

  form: { paddingHorizontal: Layout.padding },
  label: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 8, letterSpacing: 0.5 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Layout.radius,
    paddingHorizontal: 12,
    height: Layout.inputHeight,
  },
  inputError: { borderColor: Colors.error },
  inputIcon: { fontSize: 20, marginRight: 10 },
  input: { flex: 1, ...Typography.body, color: Colors.primary },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },

  forgotWrap: { alignItems: 'flex-end', marginTop: 8, marginBottom: 4 },
  forgot: { ...Typography.small, color: Colors.blue },

  submitBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Layout.radius,
    height: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitDriver: { backgroundColor: Colors.navy },
  submitDisabled: { opacity: 0.6 },
  submitText: { ...Typography.h4, color: Colors.white },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.small, color: Colors.secondary, marginHorizontal: 12 },

  socialRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  socialBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Layout.radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  socialText: { ...Typography.bodyBold, color: Colors.dark },

  registerText: { ...Typography.body, color: Colors.secondary, textAlign: 'center', marginTop: 8 },

  driverNote: {
    backgroundColor: Colors.bg,
    borderRadius: Layout.radiusSm,
    padding: 12,
    marginTop: 20,
  },
  driverNoteText: { ...Typography.small, color: Colors.secondary, textAlign: 'center' },
});
