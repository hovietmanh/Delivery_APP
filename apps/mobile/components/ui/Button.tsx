import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@constants/Colors';
import { Typography, Layout } from '@constants/Layout';

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

export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, icon, style, fullWidth = true }: Props) {
  const bg: Record<Variant, string> = {
    primary: Colors.blue,
    secondary: Colors.bg,
    success: Colors.success,
    danger: Colors.error,
    outline: 'transparent',
    ghost: 'transparent',
  };
  const textColor: Record<Variant, string> = {
    primary: Colors.white,
    secondary: Colors.dark,
    success: Colors.white,
    danger: Colors.white,
    outline: Colors.blue,
    ghost: Colors.blue,
  };
  const heights: Record<Size, number> = { sm: 40, md: Layout.buttonHeight, lg: 56 };
  const textStyles: Record<Size, object> = { sm: Typography.small, md: Typography.bodyBold, lg: Typography.h4 };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: bg[variant], height: heights[size] },
        variant === 'outline' && styles.outline,
        (disabled || loading) && styles.disabled,
        !fullWidth && styles.auto,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <Text style={[textStyles[size], { color: textColor[variant] }]}>
          {icon ? `${icon}  ${label}` : label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Layout.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  outline: { borderWidth: 1.5, borderColor: Colors.blue },
  disabled: { opacity: 0.5 },
  auto: { alignSelf: 'flex-start' },
});
