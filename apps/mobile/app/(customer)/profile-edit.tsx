import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useAuthStore } from '@store/auth.store';
import { authApi } from '@services/auth.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState((user as any)?.email ?? '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const saveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Tên không được để trống');
      return;
    }
    setProfileLoading(true);
    try {
      const updated = await authApi.updateMe({ fullName: fullName.trim(), email: email.trim() || undefined });
      updateUser({ fullName: updated.fullName });
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message ?? 'Không thể cập nhật');
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải ít nhất 6 ký tự');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Thành công', 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại nếu cần.');
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message ?? 'Không thể đổi mật khẩu');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin tài khoản</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 32 }}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.phone}>{user?.phone}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Đã xác thực</Text>
          </View>
        </View>

        {/* Thông tin cơ bản */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor={Colors.placeholder}
              />
            </View>
            <View style={[styles.field, { borderBottomWidth: 0 }]}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập email (tuỳ chọn)"
                placeholderTextColor={Colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, profileLoading && { opacity: 0.7 }]}
            onPress={saveProfile}
            disabled={profileLoading}
          >
            {profileLoading
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.saveBtnText}>Lưu thông tin</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Đổi mật khẩu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bảo mật</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Mật khẩu hiện tại</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Nhập mật khẩu hiện tại"
                  placeholderTextColor={Colors.placeholder}
                  secureTextEntry={!showCurrent}
                />
                <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showCurrent ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Ít nhất 6 ký tự"
                  placeholderTextColor={Colors.placeholder}
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthRow}>
                  {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[
                      styles.strengthBar,
                      newPassword.length >= i * 3 && {
                        backgroundColor: newPassword.length < 6 ? '#EF4444'
                          : newPassword.length < 9 ? '#F59E0B' : Colors.success,
                      },
                    ]} />
                  ))}
                  <Text style={styles.strengthLabel}>
                    {newPassword.length < 6 ? 'Yếu' : newPassword.length < 9 ? 'Trung bình' : 'Mạnh'}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.field, { borderBottomWidth: 0 }]}>
              <Text style={styles.fieldLabel}>Xác nhận mật khẩu mới</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={Colors.placeholder}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.mismatch}>Mật khẩu không khớp</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, styles.saveBtnSecondary, passwordLoading && { opacity: 0.7 }]}
            onPress={changePassword}
            disabled={passwordLoading}
          >
            {passwordLoading
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.saveBtnText}>Đổi mật khẩu</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Thông tin không thể thay đổi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{user?.phone}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Loại tài khoản</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Khách hàng</Text>
              </View>
            </View>
          </View>
          <Text style={styles.hint}>Số điện thoại là tên đăng nhập, không thể thay đổi.</Text>
        </View>
      </ScrollView>
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
  headerTitle: { ...Typography.h3, color: Colors.white },

  avatarWrap: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  avatarText: { fontSize: 36, color: Colors.white, fontWeight: '700' },
  phone: { ...Typography.bodyBold, color: Colors.dark },
  verifiedBadge: {
    marginTop: 6, backgroundColor: Colors.successBg,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  verifiedText: { ...Typography.caption, color: Colors.success, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionTitle: { ...Typography.bodyBold, color: Colors.secondary, marginBottom: 10, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.8 },

  card: {
    backgroundColor: Colors.white, borderRadius: Layout.radiusLg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  field: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  fieldLabel: { ...Typography.caption, color: Colors.secondary, marginBottom: 6 },
  input: { ...Typography.body, color: Colors.dark, paddingVertical: 0 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { padding: 4, marginLeft: 8 },
  eyeIcon: { fontSize: 18 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.bg },
  strengthLabel: { ...Typography.caption, color: Colors.secondary, fontSize: 10, marginLeft: 4 },
  mismatch: { ...Typography.caption, color: '#EF4444', marginTop: 4 },

  saveBtn: {
    backgroundColor: Colors.blue, borderRadius: Layout.radius,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  saveBtnSecondary: { backgroundColor: Colors.navy },
  saveBtnText: { ...Typography.bodyBold, color: Colors.white },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  infoLabel: { ...Typography.body, color: Colors.secondary },
  infoValue: { ...Typography.bodyBold, color: Colors.dark },
  roleBadge: { backgroundColor: Colors.infoBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  roleBadgeText: { ...Typography.caption, color: Colors.blue, fontWeight: '600' },
  hint: { ...Typography.caption, color: Colors.placeholder, marginTop: 8, paddingHorizontal: 4 },
});
