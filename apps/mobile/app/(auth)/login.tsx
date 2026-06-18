import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/auth.store';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

type Role = 'CUSTOMER' | 'DRIVER';

// ── Customer form (RHF works fine here) ──────────────────────────────────────

const customerSchema = z.object({
  phone: z.string().min(1, 'Nhập số điện thoại').regex(/^(\+84|0)[3-9][0-9]{8}$/, 'Số điện thoại không hợp lệ'),
  password: z.string().min(6, 'Ít nhất 6 ký tự'),
});

function CustomerField({ control, name, label, placeholder, keyboardType, secureTextEntry, icon }: any) {
  const [show, setShow] = useState(false);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.label}>{label}</Text>
          <View style={[styles.inputWrap, error && styles.inputError]}>
            <Ionicons name={icon} size={18} color={error ? Colors.error : Colors.placeholder} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={Colors.placeholder}
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry && !show}
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
            {secureTextEntry && (
              <TouchableOpacity onPress={() => setShow(s => !s)}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.placeholder} />
              </TouchableOpacity>
            )}
          </View>
          {error && <Text style={styles.errorText}>{error.message}</Text>}
        </View>
      )}
    />
  );
}

// ── Driver form (plain useState — no RHF) ────────────────────────────────────

function DriverLoginForm({ onSubmit, isLoading }: {
  onSubmit: (driverCode: string, vehiclePlate: string, password: string) => void;
  isLoading: boolean;
}) {
  const [driverCode, setDriverCode] = useState('');
  const [password, setPassword] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ driverCode?: string; password?: string; vehiclePlate?: string }>({});

  const handleSubmit = () => {
    const e: typeof errors = {};
    if (!driverCode.trim()) e.driverCode = 'Nhập mã tài xế';
    if (password.length < 6) e.password = password.length === 0 ? 'Nhập mật khẩu' : 'Ít nhất 6 ký tự';
    if (!vehiclePlate.trim()) e.vehiclePlate = 'Nhập biển số xe';
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    onSubmit(driverCode.trim(), vehiclePlate.trim(), password);
  };

  return (
    <>
      {/* Mã tài xế */}
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.label}>Mã tài xế</Text>
        <View style={[styles.inputWrap, errors.driverCode && styles.inputError]}>
          <Ionicons name="id-card-outline" size={18} color={errors.driverCode ? Colors.error : Colors.placeholder} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="TX-088"
            placeholderTextColor={Colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            value={driverCode}
            onChangeText={(t) => { setDriverCode(t); if (errors.driverCode) setErrors(p => ({ ...p, driverCode: undefined })); }}
          />
        </View>
        {errors.driverCode && <Text style={styles.errorText}>{errors.driverCode}</Text>}
      </View>

      {/* Mật khẩu */}
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={[styles.inputWrap, errors.password && styles.inputError]}>
          <Ionicons name="lock-closed-outline" size={18} color={errors.password ? Colors.error : Colors.placeholder} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu..."
            placeholderTextColor={Colors.placeholder}
            secureTextEntry={!showPw}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={(t) => { setPassword(t); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
          />
          <TouchableOpacity onPress={() => setShowPw(s => !s)}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.placeholder} />
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      {/* Biển số xe */}
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.label}>Biển số xe</Text>
        <View style={[styles.inputWrap, errors.vehiclePlate && styles.inputError]}>
          <Ionicons name="bus-outline" size={18} color={errors.vehiclePlate ? Colors.error : Colors.placeholder} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="29A-001.23"
            placeholderTextColor={Colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            value={vehiclePlate}
            onChangeText={(t) => { setVehiclePlate(t); if (errors.vehiclePlate) setErrors(p => ({ ...p, vehiclePlate: undefined })); }}
          />
        </View>
        {errors.vehiclePlate && <Text style={styles.errorText}>{errors.vehiclePlate}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, isLoading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[Colors.navy, Colors.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <Text style={styles.submitText}>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập nhà xe'}</Text>
        {!isLoading && <Ionicons name="arrow-forward" size={20} color={Colors.white} style={{ marginLeft: 8 }} />}
      </TouchableOpacity>

      <View style={[styles.driverNote, { marginTop: 20 }]}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} style={{ marginRight: 8 }} />
        <Text style={styles.driverNoteText}>Tài khoản do nhà xe cấp. Liên hệ quản lý nếu cần hỗ trợ.</Text>
      </View>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [role, setRole] = useState<Role>('CUSTOMER');
  const { login, loginDriver, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();

  const customerForm = useForm({
    resolver: zodResolver(customerSchema),
    mode: 'onTouched',
    defaultValues: { phone: '', password: '' },
  });

  const onCustomerLogin = async (data: any) => {
    try {
      await login(data.phone, data.password);
      router.replace('/(customer)');
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.message ?? 'Vui lòng thử lại');
    }
  };

  const onDriverLogin = async (driverCode: string, vehiclePlate: string, password: string) => {
    try {
      await loginDriver(driverCode, vehiclePlate, password);
      router.replace('/(driver)');
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.response?.data?.message ?? e.message ?? 'Vui lòng thử lại');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[Colors.navy, '#1E3A8A']} style={[styles.hero, { paddingTop: insets.top + 32 }]}>
          <View style={styles.logoCircle}>
            <Ionicons name="bus" size={40} color={Colors.white} />
          </View>
          <Text style={styles.appName}>LT - Move</Text>
          <Text style={styles.tagline}>
            {role === 'CUSTOMER' ? 'Giao hàng liên tỉnh nhanh chóng' : 'Cổng quản lý dành cho tài xế'}
          </Text>

          <View style={styles.toggleWrap}>
            {(['CUSTOMER', 'DRIVER'] as Role[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.toggleBtn, role === r && styles.toggleActive]}
                onPress={() => setRole(r)}
              >
                <Ionicons
                  name={r === 'CUSTOMER' ? 'person' : 'bus'}
                  size={14}
                  color={role === r ? Colors.white : 'rgba(255,255,255,0.65)'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.toggleText, role === r && styles.toggleTextActive]}>
                  {r === 'CUSTOMER' ? 'Người dùng' : 'Nhà xe'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          {role === 'CUSTOMER' ? (
            <>
              <CustomerField control={customerForm.control} name="phone" label="Số điện thoại" placeholder="0912 345 678" keyboardType="phone-pad" icon="call-outline" />
              <CustomerField control={customerForm.control} name="password" label="Mật khẩu" placeholder="Nhập mật khẩu..." secureTextEntry icon="lock-closed-outline" />
              <TouchableOpacity onPress={() => {}} style={styles.forgotWrap}>
                <Text style={styles.forgot}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitDisabled]}
                onPress={customerForm.handleSubmit(onCustomerLogin)}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[Colors.blueDark, Colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Text style={styles.submitText}>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
                {!isLoading && <Ionicons name="arrow-forward" size={20} color={Colors.white} style={{ marginLeft: 8 }} />}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>hoặc</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                {[
                  { name: 'Google', icon: 'logo-google' },
                  { name: 'Facebook', icon: 'logo-facebook' },
                ].map(({ name, icon }) => (
                  <TouchableOpacity key={name} style={styles.socialBtn}>
                    <Ionicons name={icon as any} size={18} color={Colors.secondary} style={{ marginRight: 8 }} />
                    <Text style={styles.socialText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerWrap}>
                <Text style={styles.registerText}>
                  Chưa có tài khoản? <Text style={styles.registerLink}>Đăng ký ngay</Text>
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <DriverLoginForm onSubmit={onDriverLogin} isLoading={isLoading} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },

  hero: {
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: Layout.padding,
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { ...Typography.h1, color: Colors.white, marginBottom: 6 },
  tagline: { ...Typography.small, color: 'rgba(255,255,255,0.7)', marginBottom: 28 },

  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 4,
    width: '100%',
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10,
  },
  toggleActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  toggleText: { ...Typography.smallBold, color: 'rgba(255,255,255,0.65)' },
  toggleTextActive: { color: Colors.white },

  formCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: Layout.paddingLg,
    paddingTop: 32,
    paddingBottom: 8,
    ...Shadow.md,
  },

  label: { ...Typography.smallBold, color: Colors.secondary, marginBottom: 8, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Layout.radius,
    paddingHorizontal: 14,
    height: Layout.inputHeight,
  },
  inputError: { borderColor: Colors.error },
  input: { flex: 1, ...Typography.body, color: Colors.primary },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },

  forgotWrap: { alignItems: 'flex-end', marginBottom: 20, marginTop: -6 },
  forgot: { ...Typography.small, color: Colors.blue },

  submitBtn: {
    flexDirection: 'row',
    borderRadius: Layout.radius,
    height: Layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadow.blue,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { ...Typography.h4, color: Colors.white },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.small, color: Colors.secondary, marginHorizontal: 14 },

  socialRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Layout.radius, paddingVertical: 12,
    ...Shadow.sm,
    backgroundColor: Colors.white,
  },
  socialText: { ...Typography.bodyBold, color: Colors.dark },

  registerWrap: { alignItems: 'center', paddingVertical: 8 },
  registerText: { ...Typography.body, color: Colors.secondary },
  registerLink: { color: Colors.blue, fontWeight: '600' },

  driverNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.bg, borderRadius: Layout.radiusSm,
    padding: 14,
  },
  driverNoteText: { ...Typography.small, color: Colors.secondary, flex: 1 },
});
