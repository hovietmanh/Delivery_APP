const primary = {
  navy: '#1A3566',
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueDark: '#1D4ED8',
};

const status = {
  success: '#16A34A',
  successLight: '#22C55E',
  successBg: '#F0FDF4',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  info: '#2563EB',
  infoBg: '#EFF6FF',
};

const neutral = {
  white: '#FFFFFF',
  bg: '#F3F4F6',
  border: '#E5E7EB',
  placeholder: '#9CA3AF',
  secondary: '#6B7280',
  primary: '#111827',
  dark: '#1F2937',
};

const accent = {
  orange: '#F59E0B',
  orangeBg: '#FFFBEB',
  green: '#16A34A',
  greenBg: '#DCFCE7',
  red: '#DC2626',
  redBg: '#FEE2E2',
};

export const Colors = {
  ...primary,
  ...status,
  ...neutral,
  ...accent,

  // Semantic
  header: primary.navy,
  headerText: '#FFFFFF',
  tabActive: primary.blue,
  tabInactive: '#9CA3AF',
  buttonPrimary: primary.blue,
  buttonSecondary: neutral.border,
  buttonSuccess: status.success,
  inputBg: '#F9FAFB',
  inputBorder: neutral.border,
  inputFocusBorder: primary.blue,
  cardBg: neutral.white,
  cardBorder: neutral.border,
  price: primary.blue,
  trackingDone: status.successLight,
  trackingActive: primary.blue,
  trackingPending: neutral.border,
};

export type ColorKey = keyof typeof Colors;
