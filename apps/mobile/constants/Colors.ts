const primary = {
  navy: '#0F172A',
  navyMid: '#1E293B',
  navyLight: '#334155',
  blue: '#3B82F6',
  blueLight: '#60A5FA',
  blueDark: '#1D4ED8',
  blueGlass: 'rgba(59,130,246,0.12)',
};

const status = {
  success: '#10B981',
  successLight: '#34D399',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
};

const neutral = {
  white: '#FFFFFF',
  bg: '#F1F5F9',
  border: '#E2E8F0',
  placeholder: '#94A3B8',
  secondary: '#64748B',
  primary: '#0F172A',
  dark: '#1E293B',
};

const accent = {
  orange: '#F97316',
  orangeBg: '#FFF7ED',
  green: '#10B981',
  greenBg: '#ECFDF5',
  red: '#EF4444',
  redBg: '#FEF2F2',
  purple: '#8B5CF6',
  purpleBg: '#F5F3FF',
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
  tabInactive: '#94A3B8',
  buttonPrimary: primary.blue,
  buttonSecondary: neutral.border,
  buttonSuccess: status.success,
  inputBg: '#F8FAFC',
  inputBorder: neutral.border,
  inputFocusBorder: primary.blue,
  cardBg: neutral.white,
  cardBorder: neutral.border,
  price: primary.blue,
  trackingDone: status.success,
  trackingActive: primary.blue,
  trackingPending: neutral.border,
};

export type ColorKey = keyof typeof Colors;
