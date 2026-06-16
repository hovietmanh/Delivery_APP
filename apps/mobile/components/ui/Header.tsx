import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@constants/Colors';
import { Typography } from '@constants/Layout';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  dark?: boolean;
}

export function Header({ title, subtitle, showBack = true, right, dark = false }: Props) {
  const insets = useSafeAreaInsets();
  const bg = dark ? Colors.navy : Colors.white;
  const textColor = dark ? Colors.white : Colors.dark;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: bg }]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backIcon, { color: dark ? Colors.white : Colors.dark }]}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.titleWrap}>
          <Text style={[Typography.h4, { color: textColor }]} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={[Typography.caption, { color: dark ? 'rgba(255,255,255,0.7)' : Colors.secondary }]}>{subtitle}</Text>}
        </View>
        <View style={styles.rightWrap}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, fontWeight: '600' },
  titleWrap: { flex: 1, alignItems: 'center' },
  rightWrap: { width: 44, alignItems: 'center' },
});
