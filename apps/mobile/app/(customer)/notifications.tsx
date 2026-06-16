import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { notificationsApi } from '@services/notifications.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

const TYPE_ICONS: Record<string, string> = {
  order_update: '🚌',
  payment: '💳',
  promotion: '🎁',
  complaint: '⚠️',
};

function groupByDate(notifications: any[]) {
  const groups: Record<string, any[]> = {};
  notifications.forEach((n) => {
    const date = new Date(n.createdAt).toLocaleDateString('vi-VN');
    if (!groups[date]) groups[date] = [];
    groups[date].push(n);
  });
  return groups;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const groups = groupByDate(notifications);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Thông báo</Text>
        <TouchableOpacity onPress={() => markAllRead.mutate()}>
          <Text style={styles.markAll}>Đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {Object.keys(groups).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          </View>
        ) : (
          Object.entries(groups).map(([date, items]) => (
            <View key={date}>
              <Text style={styles.dateLabel}>{date}</Text>
              {items.map((n) => (
                <TouchableOpacity key={n.id} style={[styles.item, !n.isRead && styles.itemUnread]}>
                  <View style={[styles.iconWrap, !n.isRead && styles.iconWrapUnread]}>
                    <Text style={styles.icon}>{TYPE_ICONS[n.type] ?? '📢'}</Text>
                  </View>
                  <View style={styles.content}>
                    <Text style={styles.itemTitle}>{n.title}</Text>
                    <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
                  </View>
                  <Text style={styles.time}>
                    {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: Layout.padding, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { fontSize: 22, color: Colors.dark },
  title: { ...Typography.h3, color: Colors.dark },
  markAll: { ...Typography.small, color: Colors.blue },
  dateLabel: { ...Typography.smallBold, color: Colors.secondary, padding: Layout.padding, paddingBottom: 8, letterSpacing: 0.5 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white, paddingHorizontal: Layout.padding,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.bg,
  },
  itemUnread: { backgroundColor: Colors.infoBg },
  iconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconWrapUnread: { backgroundColor: Colors.blue + '20' },
  icon: { fontSize: 22 },
  content: { flex: 1, marginRight: 8 },
  itemTitle: { ...Typography.bodyBold, color: Colors.dark },
  itemBody: { ...Typography.small, color: Colors.secondary, marginTop: 3 },
  time: { ...Typography.caption, color: Colors.secondary, marginTop: 3 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { ...Typography.body, color: Colors.secondary },
});
