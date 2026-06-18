import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@constants/Colors';
import { Typography } from '@constants/Layout';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  dark?: boolean;
  gradient?: boolean;
}

export function Header({ title, subtitle, showBack = true, right, dark = false, gradient = false }: Props) {
  const insets = useSafeAreaInsets();
  const isColored = dark || gradient;
  const textColor = isColored ? Colors.white : Colors.dark;
  const subColor = isColored ? 'rgba(255,255,255,0.65)' : Colors.secondary;

  const content = (
    <View style={[styles.row]}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={isColored ? Colors.white : Colors.dark} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtn} />
      )}
      <View style={styles.titleWrap}>
        <Text style={[Typography.h4, { color: textColor }]} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={[Typography.caption, { color: subColor, marginTop: 1 }]}>{subtitle}</Text>}
      </View>
      <View style={styles.rightWrap}>{right}</View>
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={[Colors.navy, Colors.navyMid]}
        style={[styles.container, { paddingTop: insets.top + 8 }]}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top + 8, backgroundColor: dark ? Colors.navy : Colors.white },
      !dark && styles.lightBorder,
    ]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 14 },
  lightBorder: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  rightWrap: { width: 44, alignItems: 'center', justifyContent: 'center' },
});
