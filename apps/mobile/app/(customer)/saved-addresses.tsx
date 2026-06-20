import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@services/auth.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const ADDRESS_TYPES = [
  { key: 'home', icon: '🏠', label: 'Nhà riêng' },
  { key: 'work', icon: '🏢', label: 'Công ty' },
  { key: 'other', icon: '📍', label: 'Khác' },
];

const EMPTY_FORM = { label: '', type: 'home', address: '', city: '', name: '', phone: '' };

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['saved-addresses'],
    queryFn: authApi.getSavedAddresses,
  });

  const saveMutation = useMutation({
    mutationFn: (list: any[]) => authApi.updateSavedAddresses(list),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-addresses'] });
      closeModal();
    },
    onError: () => Alert.alert('Lỗi', 'Không thể lưu địa chỉ'),
  });

  const openAdd = () => {
    setEditIndex(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (i: number) => {
    const a = (addresses as any[])[i];
    setEditIndex(i);
    setForm({ label: a.label ?? '', type: a.type ?? 'home', address: a.address ?? '', city: a.city ?? '', name: a.name ?? '', phone: a.phone ?? '' });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditIndex(null); };

  const handleSave = () => {
    if (!form.address.trim() || !form.city.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ và thành phố');
      return;
    }
    const newAddr = { ...form, label: form.label || ADDRESS_TYPES.find(t => t.key === form.type)?.label };
    const list = [...(addresses as any[])];
    if (editIndex !== null) {
      list[editIndex] = newAddr;
    } else {
      list.push(newAddr);
    }
    saveMutation.mutate(list);
  };

  const handleDelete = (i: number) => {
    Alert.alert('Xóa địa chỉ', 'Bạn có chắc muốn xóa địa chỉ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: () => {
          const list = (addresses as any[]).filter((_, idx) => idx !== i);
          saveMutation.mutate(list);
        },
      },
    ]);
  };

  const typeInfo = (type: string) => ADDRESS_TYPES.find(t => t.key === type) ?? ADDRESS_TYPES[2];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/(customer)")} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Địa chỉ đã lưu</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Text style={styles.addIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.blue} /></View>
      ) : (addresses as any[]).length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>Chưa có địa chỉ nào</Text>
          <Text style={styles.emptyDesc}>Lưu địa chỉ để gửi hàng nhanh hơn</Text>
          <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}>
            <Text style={styles.addFirstText}>＋ Thêm địa chỉ đầu tiên</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
          {(addresses as any[]).map((addr: any, i: number) => {
            const t = typeInfo(addr.type);
            return (
              <View key={i} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.typeIcon}>
                    <Text style={styles.typeEmoji}>{t.icon}</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.addrLabel}>{addr.label ?? t.label}</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => openEdit(i)} style={styles.actionBtn}>
                        <Text style={styles.actionEdit}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(i)} style={styles.actionBtn}>
                        <Text style={styles.actionDelete}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.addrText}>{addr.address}</Text>
                  <Text style={styles.addrCity}>{addr.city}</Text>
                  {(addr.name || addr.phone) && (
                    <Text style={styles.addrContact}>
                      {[addr.name, addr.phone].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal thêm/sửa */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeModal} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{editIndex !== null ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}</Text>

          {/* Loại địa chỉ */}
          <View style={styles.typeRow}>
            {ADDRESS_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeChip, form.type === t.key && styles.typeChipActive]}
                onPress={() => setForm(f => ({ ...f, type: t.key }))}
              >
                <Text style={styles.typeChipIcon}>{t.icon}</Text>
                <Text style={[styles.typeChipLabel, form.type === t.key && styles.typeChipLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key: 'label', label: 'Tên gợi nhớ', placeholder: 'VD: Nhà ba mẹ', optional: true },
              { key: 'address', label: 'Địa chỉ *', placeholder: 'Số nhà, tên đường, phường/xã' },
              { key: 'city', label: 'Thành phố / Tỉnh *', placeholder: 'VD: Hà Nội, TP.HCM...' },
              { key: 'name', label: 'Tên liên hệ', placeholder: 'Tên người nhận tại địa chỉ này', optional: true },
              { key: 'phone', label: 'Số điện thoại liên hệ', placeholder: '0xxx xxx xxx', optional: true },
            ].map(({ key, label, placeholder, optional }) => (
              <View key={key} style={styles.inputWrap}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.placeholder}
                  keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, saveMutation.isPending && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.confirmText}>Lưu địa chỉ</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addIcon: { fontSize: 24, color: Colors.white, fontWeight: '300' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { ...Typography.h3, color: Colors.dark, textAlign: 'center' },
  emptyDesc: { ...Typography.body, color: Colors.secondary, textAlign: 'center', marginTop: 8 },
  addFirstBtn: {
    marginTop: 20, backgroundColor: Colors.blue, borderRadius: Layout.radius,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  addFirstText: { ...Typography.bodyBold, color: Colors.white },

  card: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: Layout.radiusLg, borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 12,
  },
  cardLeft: { marginRight: 12 },
  typeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center' },
  typeEmoji: { fontSize: 22 },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addrLabel: { ...Typography.bodyBold, color: Colors.dark },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 2 },
  actionEdit: { ...Typography.small, color: Colors.blue, fontWeight: '600' },
  actionDelete: { ...Typography.small, color: '#EF4444', fontWeight: '600' },
  addrText: { ...Typography.body, color: Colors.dark },
  addrCity: { ...Typography.small, color: Colors.secondary, marginTop: 2 },
  addrContact: { ...Typography.caption, color: Colors.secondary, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Layout.padding, paddingTop: 12,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { ...Typography.h3, color: Colors.dark, marginBottom: 16 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Layout.radiusSm, paddingVertical: 8,
  },
  typeChipActive: { borderColor: Colors.blue, backgroundColor: Colors.infoBg },
  typeChipIcon: { fontSize: 16 },
  typeChipLabel: { ...Typography.small, color: Colors.secondary, fontWeight: '600' },
  typeChipLabelActive: { color: Colors.blue },

  inputWrap: { marginBottom: 14 },
  inputLabel: { ...Typography.caption, color: Colors.secondary, marginBottom: 6 },
  input: {
    ...Typography.body, color: Colors.dark,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Layout.radiusSm, paddingHorizontal: 14, paddingVertical: 11,
  },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { ...Typography.bodyBold, color: Colors.secondary },
  confirmBtn: {
    flex: 2, backgroundColor: Colors.blue,
    borderRadius: Layout.radius, paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { ...Typography.bodyBold, color: Colors.white },
});
