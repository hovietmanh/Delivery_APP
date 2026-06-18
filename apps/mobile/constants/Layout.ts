export const Layout = {
  padding: 16,
  paddingLg: 24,
  radius: 14,
  radiusLg: 20,
  radiusSm: 10,
  radiusXl: 28,
  headerHeight: 56,
  tabBarHeight: 68,
  inputHeight: 54,
  buttonHeight: 54,
  cardPadding: 18,
};

export const Shadow = {
  sm: {
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  md: {
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  lg: {
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  blue: {
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
};

export const Typography = {
  h1: { fontSize: 30, fontWeight: '700' as const, lineHeight: 38, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  h3: { fontSize: 19, fontWeight: '600' as const, lineHeight: 27 },
  h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 23 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 23 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  smallBold: { fontSize: 13, fontWeight: '600' as const, lineHeight: 19 },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
  price: { fontSize: 19, fontWeight: '700' as const, lineHeight: 26 },
  priceLg: { fontSize: 30, fontWeight: '700' as const, lineHeight: 38 },
};
