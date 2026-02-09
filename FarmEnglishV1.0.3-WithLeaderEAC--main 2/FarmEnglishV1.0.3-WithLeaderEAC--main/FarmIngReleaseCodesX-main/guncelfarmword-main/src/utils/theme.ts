// 🌌 Global neon backdrop shared by every screen
export const NEON_BACKGROUND = {
  gradient: ['#050008', '#150022', '#2a0045', '#050008'] as const,
  topShimmer: ['rgba(236,72,153,0.35)', 'rgba(147,51,234,0.18)', 'transparent'] as const,
  bottomShimmer: ['transparent', 'rgba(34,211,238,0.12)'] as const,
};

// 🎨 Premium Theme System - Exactly like web version
export const colors = {
  // Primary palette
  primary: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899', // Pink-500
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
  },
  
  // Background gradients (Global Neon Theme)
  background: {
    from: '#0f172a', // slate-900
    to: '#1e293b', // slate-800
    accent: '#ec4899', // Pink accent
  },
  
  // Card colors (difficulty-based)
  green: {
    bg: ['#14532d80', '#05573080', '#14532d80'], // from-green-900/80 via-emerald-900/70 to-green-900/80
    border: '#15803d80',
    badge: '#16a34a4d',
    text: '#bbf7d0',
    bar: '#14532d99',
    barFill: ['#22c55e', '#10b981'],
    button: ['#16a34a', '#10b981'],
    ready: {
      border: '#22c55e',
      shadow: '#22c55e80',
    }
  },
  
  yellow: {
    bg: ['#78350f80', '#92400e80', '#78350f80'],
    border: '#a16207',
    badge: '#ca8a044d',
    text: '#fef08a',
    bar: '#451a0399',
    barFill: ['#eab308', '#f59e0b'],
    button: ['#ca8a04', '#d97706'],
    ready: {
      border: '#eab308',
      shadow: '#eab30880',
    }
  },
  
  orange: {
    bg: ['#7c2d1280', '#9a3412b3', '#7c2d1280'],
    border: '#c2410c80',
    badge: '#ea580c4d',
    text: '#fed7aa',
    bar: '#43130b99',
    barFill: ['#f97316', '#fb923c'],
    button: ['#ea580c', '#f97316'],
    ready: {
      border: '#f97316',
      shadow: '#f9731680',
    }
  },
  
  red: {
    bg: ['#7f1d1d80', '#991b1bb3', '#7f1d1d80'],
    border: '#b9121280',
    badge: '#dc26264d',
    text: '#fecaca',
    bar: '#45050599',
    barFill: ['#ef4444', '#f87171'],
    button: ['#dc2626', '#ef4444'],
    ready: {
      border: '#ef4444',
      shadow: '#ef444480',
    }
  },
  
  // 🏆 MASTER CARDS
  master: {
    bg: ['#ca8a04e6', '#f59e0bcc', '#ca8a04e6'], // Golden
    border: '#facc15cc',
    badge: '#eab30866',
    text: '#fef9c3',
    bar: '#78350f99',
    barFill: ['#facc15', '#f59e0b'],
    button: ['#eab308', '#f59e0b'],
    ready: {
      border: '#fde047',
      shadow: '#facc15b3',
    }
  },
  
  ultra: {
    bg: ['#0891b2e6', '#3b82f6cc', '#9333eae6'], // Diamond blue-purple
    border: '#22d3eecc',
    badge: '#06b6d466',
    text: '#cffafe',
    bar: '#164e6399',
    barFill: ['#22d3ee', '#3b82f6', '#a855f7'],
    button: ['#06b6d4', '#3b82f6', '#9333ea'],
    ready: {
      border: '#22d3ee',
      shadow: '#22d3eeb3',
    }
  },
  
  perfect: {
    bg: ['#db2777e6', '#a855f7d9', '#4f46e5e6'], // Rainbow royal
    border: '#ec4899e6',
    badge: ['#ec489980', '#a855f780'],
    text: '#fce7f3',
    bar: '#831843b3',
    barFill: ['#f472b6', '#a855f7', '#6366f1'],
    button: ['#ec4899', '#a855f7', '#6366f1'],
    ready: {
      border: '#f472b6',
      shadow: '#f472b6cc',
    }
  },
  
  // UI Colors
  text: {
    primary: '#ffffff',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    muted: '#64748b',
  },
  
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
};

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};
