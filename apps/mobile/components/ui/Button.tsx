import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const GRADIENT: Record<Variant, [string, string] | null> = {
  primary: [Colors.blueDark, Colors.blue],
  secondary: null,
  success: ['#059669', Colors.success],
  danger: ['#DC2626', Colors.error],
  outline: null,
  ghost: null,
};

const BG: Record<Variant, string> = {
  primary: Colors.blue,
  secondary: Colors.bg,
  success: Colors.success,
  danger: Colors.error,
  outline: 'transparent',
  ghost: 'transparent',
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: Colors.white,
  secondary: Colors.dark,
  success: Colors.white,
  danger: Colors.white,
  outline: Colors.blue,
  ghost: Colors.blue,
};

const HEIGHTS: Record<Size, number> = { sm: 40, md: Layout.buttonHeight, lg: 58 };
const TEXT_STYLES: Record<Size, object> = {
  sm: Typography.smallBold,
  md: Typography.bodyBold,
  lg: { ...Typography.h4, fontSize: 17 },
};

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, icon, style, fullWidth = true,
}: Props) {
  const gradient = GRADIENT[variant];
  const height = HEIGHTS[size];
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const hasShadow = !isOutline && !isGhost && !disabled;

  const containerStyle = [
    styles.base,
    { height },
    isOutline && styles.outline,
    (disabled || loading) && styles.disabled,
    !fullWidth && styles.auto,
    hasShadow && variant === 'primary' && Shadow.blue,
    hasShadow && variant !== 'primary' && Shadow.sm,
    style,
  ];

  const textStyle = [TEXT_STYLES[size], { color: TEXT_COLOR[variant] }];

  const content = loading
    ? <ActivityIndicator color={TEXT_COLOR[variant]} />
    : <Text style={textStyle}>{icon ? `${icon}  ${label}` : label}</Text>;

  if (gradient && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[containerStyle, { overflow: 'hidden' }]}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[containerStyle, !gradient && { backgroundColor: BG[variant] }]}
      activeOpacity={0.8}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Layout.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.blue,
  },
  disabled: { opacity: 0.5 },
  auto: { alignSelf: 'flex-start' },
});
