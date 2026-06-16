import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverApi } from '@services/driver.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';
import { Button } from '@components/ui/Button';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Chờ xử lý', color: Colors.warning },
  IN_REVIEW: { label: 'Đang xem xét', color: Colors.blue },
  RESOLVED: { label: 'Đã giải quyết', color: Colors.success },
  DISMISSED: { label: 'Đã đóng', color: Colors.secondary },
};

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const { data: complaints = [] } = useQuery({
    queryKey: ['driver-complaints'],
    queryFn: driverApi.getComplaints,
  });

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      driverApi.respondComplaint(id, response),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-complaints'] });
      setRespondingId(null);
      setResponseText('');
      Alert.alert('Đã gửi phản hồi');
    },
  });

  const onRespond = (id: string) => {
    if (!responseText.trim()) { Alert.alert('Vui lòng nhập nội dung phản hồi'); return; }
    respond.mutate({ id, response: responseText });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Khiếu nại</Text>
        <View style={styles.countChip}>
          <Text style={styles.countText}>{complaints.filter((c: any) => c.status === 'OPEN').length} mới</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Layout.padding, paddingBottom: insets.bottom + 24 }}>
        {complaints.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>😊</Text>
            <Text style={styles.emptyText}>Không có khiếu nại nào</Text>
          </View>
        ) : (
          complaints.map((complaint: any) => {
            const statusInfo = STATUS_LABEL[complaint.status] ?? { label: complaint.status, color: Colors.secondary };
            const isResponding = respondingId === complaint.id;
            return (
              <View key={complaint.id} style={styles.complaintCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderCode}>{complaint.order?.trackingCode}</Text>
                    <Text style={styles.date}>{new Date(complaint.createdAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.contentBlock}>
                  <Text style={styles.contentLabel}>Nội dung khiếu nại:</Text>
                  <Text style={styles.contentText}>{complaint.description}</Text>
                </View>

                {complaint.driverResponse && (
                  <View style={styles.responseBlock}>
                    <Text style={styles.responseLabel}>✓ Phản hồi của bạn:</Text>
                    <Text style={styles.responseText}>{complaint.driverResponse}</Text>
                  </View>
                )}

                {complaint.status === 'OPEN' && !complaint.driverResponse && (
                  isResponding ? (
                    <View style={styles.respondForm}>
                      <TextInput
                        style={styles.respondInput}
                        placeholder="Nhập phản hồi của bạn..."
                        value={responseText}
                        onChangeText={setResponseText}
                        multiline
                        numberOfLines={3}
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <Button label="Hủy" onPress={() => setRespondingId(null)} variant="outline" style={{ flex: 1, marginRight: 8 }} />
                        <Button label="Gửi phản hồi" onPress={() => onRespond(complaint.id)} loading={respond.isPending} style={{ flex: 2 }} />
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => { setRespondingId(complaint.id); setResponseText(''); }}
                    >
                      <Text style={styles.replyBtnText}>💬 Phản hồi khiếu nại</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.padding, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h3, color: Colors.dark },
  countChip: { backgroundColor: Colors.errorBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { ...Typography.smallBold, color: Colors.error },

  complaintCard: { backgroundColor: Colors.white, borderRadius: Layout.radiusLg, padding: Layout.cardPadding, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderCode: { ...Typography.bodyBold, color: Colors.navy },
  date: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { ...Typography.smallBold },

  contentBlock: { backgroundColor: Colors.errorBg, borderRadius: Layout.radiusSm, padding: 10, marginBottom: 10 },
  contentLabel: { ...Typography.smallBold, color: Colors.error, marginBottom: 4 },
  contentText: { ...Typography.small, color: Colors.dark, lineHeight: 20 },

  responseBlock: { backgroundColor: Colors.successBg, borderRadius: Layout.radiusSm, padding: 10, marginBottom: 10 },
  responseLabel: { ...Typography.smallBold, color: Colors.success, marginBottom: 4 },
  responseText: { ...Typography.small, color: Colors.dark },

  respondForm: { marginTop: 8 },
  respondInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius, padding: 12, ...Typography.body, color: Colors.dark, minHeight: 80, textAlignVertical: 'top' },

  replyBtn: { backgroundColor: Colors.infoBg, borderRadius: Layout.radius, padding: 10, alignItems: 'center' },
  replyBtnText: { ...Typography.bodyBold, color: Colors.blue },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { ...Typography.body, color: Colors.secondary },
});
