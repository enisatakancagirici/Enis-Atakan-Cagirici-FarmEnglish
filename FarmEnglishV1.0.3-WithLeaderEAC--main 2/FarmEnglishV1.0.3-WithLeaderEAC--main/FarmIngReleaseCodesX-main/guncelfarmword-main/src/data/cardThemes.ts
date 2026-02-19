// ═══════════════════════════════════════════════════════════════
// 🎨 KART TEMA SİSTEMİ - Mağaza + Koleksiyon + Kişiselleştirme
// ═══════════════════════════════════════════════════════════════

// ─── Rarity system ───
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<CardRarity, { bg: string; text: string; border: string; label: string }> = {
  common: { bg: 'rgba(156, 163, 175, 0.3)', text: '#d1d5db', border: '#9ca3af', label: 'Sıradan' },
  rare: { bg: 'rgba(59, 130, 246, 0.3)', text: '#93c5fd', border: '#3b82f6', label: 'Nadir' },
  epic: { bg: 'rgba(168, 85, 247, 0.3)', text: '#d8b4fe', border: '#a855f7', label: 'Epik' },
  legendary: { bg: 'rgba(245, 158, 11, 0.3)', text: '#fde68a', border: '#f59e0b', label: 'Efsanevi' },
};

// ─── Font style system ───
export type CardFontStyle = 'default' | 'serif' | 'mono' | 'rounded';

export const FONT_STYLES: Record<CardFontStyle, { label: string; fontFamily?: string; preview: string }> = {
  default: { label: 'Varsayılan', preview: 'Abc' },
  serif: { label: 'Klasik', fontFamily: 'serif', preview: 'Abc' },
  mono: { label: 'Kod', fontFamily: 'monospace', preview: 'Abc' },
  rounded: { label: 'Yuvarlak', preview: 'Abc' },
};

// ─── Border style system ───
export type CardBorderStyle = 'default' | 'glow' | 'sharp' | 'rounded' | 'none';
export type CardBackgroundStyle = 'default' | 'soil';
export type CardBounceIntensity = 'min' | 'normal' | 'max';
export type CardHeaderTheme = 'sunforge' | 'emerald' | 'neon' | 'royal';

export interface CardHeaderThemePreset {
  id: CardHeaderTheme;
  label: string;
  description: string;
  emoji: string;
  headerGradient: readonly [string, string, string];
  headerGlowGradient: readonly [string, string, string];
  headerBorderColor: string;
  brandGradient: readonly [string, string, string];
  brandBorderColor: string;
  logoGlowColor: string;
  questPanelBackground: string;
  questPanelBorderColor: string;
  questCardGradient: readonly [string, string, string];
  questCardBorderColor: string;
  questTitleColor: string;
  questPrimaryTextColor: string;
  questSecondaryTextColor: string;
  questActionTextColor: string;
  questMoreTextColor: string;
  questProgressTrackColor: string;
  questProgressTrackBorderColor: string;
  questProgressFillColor: string;
  questEmptyBackground: string;
  questEmptyBorderColor: string;
  questEmptyTextColor: string;
  farmInventoryHeaderGradient: readonly [string, string, string];
  filterActiveBackground: string;
  filterActiveBorderColor: string;
  filterAllActiveColor: string;
}

export const CARD_HEADER_THEME_PRESETS: Record<CardHeaderTheme, CardHeaderThemePreset> = {
  sunforge: {
    id: 'sunforge',
    label: 'Premium Altın',
    description: 'Mevcut premium header ve Sıradaki Görev teması',
    emoji: '🌅',
    headerGradient: ['rgba(51, 31, 6, 0.96)', 'rgba(66, 42, 12, 0.95)', 'rgba(30, 41, 59, 0.94)'],
    headerGlowGradient: ['rgba(251, 191, 36, 0.16)', 'rgba(245, 158, 11, 0.11)', 'rgba(30, 41, 59, 0.08)'],
    headerBorderColor: 'rgba(245, 158, 11, 0.35)',
    brandGradient: ['rgba(62, 41, 12, 0.9)', 'rgba(40, 28, 12, 0.9)', 'rgba(15, 23, 42, 0.88)'],
    brandBorderColor: 'rgba(251, 191, 36, 0.35)',
    logoGlowColor: '#f59e0b',
    questPanelBackground: 'rgba(15, 23, 42, 0.54)',
    questPanelBorderColor: 'rgba(250, 204, 21, 0.24)',
    questCardGradient: ['rgba(250, 204, 21, 0.2)', 'rgba(245, 158, 11, 0.16)', 'rgba(15, 23, 42, 0.72)'],
    questCardBorderColor: 'rgba(250, 204, 21, 0.2)',
    questTitleColor: '#fef3c7',
    questPrimaryTextColor: '#fff8d6',
    questSecondaryTextColor: 'rgba(255, 247, 208, 0.88)',
    questActionTextColor: '#fde68a',
    questMoreTextColor: '#fde68a',
    questProgressTrackColor: 'rgba(15, 23, 42, 0.76)',
    questProgressTrackBorderColor: 'rgba(253, 224, 71, 0.24)',
    questProgressFillColor: '#f59e0b',
    questEmptyBackground: 'rgba(15, 23, 42, 0.72)',
    questEmptyBorderColor: 'rgba(253, 224, 71, 0.18)',
    questEmptyTextColor: 'rgba(254, 243, 199, 0.9)',
    farmInventoryHeaderGradient: ['rgba(18, 18, 20, 0.98)', 'rgba(28, 28, 30, 0.95)', 'rgba(18, 18, 20, 0.98)'],
    filterActiveBackground: 'rgba(255,255,255,0.12)',
    filterActiveBorderColor: 'rgba(255,255,255,0.2)',
    filterAllActiveColor: '#fbbf24',
  },
  emerald: {
    id: 'emerald',
    label: 'Zümrüt Aura',
    description: 'Yeşil-altın çizgide doğal ama premium bir görünüm',
    emoji: '🌿',
    headerGradient: ['rgba(6, 40, 24, 0.96)', 'rgba(8, 63, 39, 0.95)', 'rgba(12, 74, 110, 0.9)'],
    headerGlowGradient: ['rgba(34, 197, 94, 0.18)', 'rgba(16, 185, 129, 0.12)', 'rgba(14, 116, 144, 0.1)'],
    headerBorderColor: 'rgba(74, 222, 128, 0.42)',
    brandGradient: ['rgba(5, 46, 22, 0.92)', 'rgba(6, 78, 59, 0.9)', 'rgba(15, 118, 110, 0.84)'],
    brandBorderColor: 'rgba(110, 231, 183, 0.42)',
    logoGlowColor: '#22c55e',
    questPanelBackground: 'rgba(6, 78, 59, 0.42)',
    questPanelBorderColor: 'rgba(52, 211, 153, 0.3)',
    questCardGradient: ['rgba(16, 185, 129, 0.2)', 'rgba(34, 197, 94, 0.16)', 'rgba(8, 47, 73, 0.74)'],
    questCardBorderColor: 'rgba(110, 231, 183, 0.28)',
    questTitleColor: '#d1fae5',
    questPrimaryTextColor: '#ecfdf5',
    questSecondaryTextColor: 'rgba(209, 250, 229, 0.86)',
    questActionTextColor: '#86efac',
    questMoreTextColor: '#6ee7b7',
    questProgressTrackColor: 'rgba(6, 95, 70, 0.6)',
    questProgressTrackBorderColor: 'rgba(110, 231, 183, 0.28)',
    questProgressFillColor: '#22c55e',
    questEmptyBackground: 'rgba(6, 78, 59, 0.62)',
    questEmptyBorderColor: 'rgba(110, 231, 183, 0.24)',
    questEmptyTextColor: 'rgba(209, 250, 229, 0.9)',
    farmInventoryHeaderGradient: ['rgba(5, 46, 22, 0.98)', 'rgba(6, 78, 59, 0.94)', 'rgba(8, 47, 73, 0.95)'],
    filterActiveBackground: 'rgba(34,197,94,0.18)',
    filterActiveBorderColor: 'rgba(110,231,183,0.45)',
    filterAllActiveColor: '#34d399',
  },
  neon: {
    id: 'neon',
    label: 'Neon Volt',
    description: 'Elektrikli mavi-cyan tema ile keskin vurgu',
    emoji: '⚡',
    headerGradient: ['rgba(7, 16, 42, 0.96)', 'rgba(13, 26, 63, 0.95)', 'rgba(7, 89, 133, 0.92)'],
    headerGlowGradient: ['rgba(34, 211, 238, 0.2)', 'rgba(45, 212, 191, 0.14)', 'rgba(14, 116, 144, 0.1)'],
    headerBorderColor: 'rgba(34, 211, 238, 0.46)',
    brandGradient: ['rgba(8, 47, 73, 0.9)', 'rgba(12, 74, 110, 0.88)', 'rgba(15, 23, 42, 0.86)'],
    brandBorderColor: 'rgba(103, 232, 249, 0.48)',
    logoGlowColor: '#22d3ee',
    questPanelBackground: 'rgba(8, 47, 73, 0.44)',
    questPanelBorderColor: 'rgba(34, 211, 238, 0.3)',
    questCardGradient: ['rgba(34, 211, 238, 0.22)', 'rgba(59, 130, 246, 0.16)', 'rgba(15, 23, 42, 0.76)'],
    questCardBorderColor: 'rgba(103, 232, 249, 0.3)',
    questTitleColor: '#cffafe',
    questPrimaryTextColor: '#ecfeff',
    questSecondaryTextColor: 'rgba(186, 230, 253, 0.9)',
    questActionTextColor: '#67e8f9',
    questMoreTextColor: '#67e8f9',
    questProgressTrackColor: 'rgba(8, 47, 73, 0.66)',
    questProgressTrackBorderColor: 'rgba(103, 232, 249, 0.3)',
    questProgressFillColor: '#22d3ee',
    questEmptyBackground: 'rgba(8, 47, 73, 0.66)',
    questEmptyBorderColor: 'rgba(103, 232, 249, 0.24)',
    questEmptyTextColor: 'rgba(207, 250, 254, 0.92)',
    farmInventoryHeaderGradient: ['rgba(8, 47, 73, 0.98)', 'rgba(13, 26, 63, 0.95)', 'rgba(15, 23, 42, 0.97)'],
    filterActiveBackground: 'rgba(34,211,238,0.2)',
    filterActiveBorderColor: 'rgba(103,232,249,0.45)',
    filterAllActiveColor: '#22d3ee',
  },
  royal: {
    id: 'royal',
    label: 'Kraliyet Moru',
    description: 'Mor-altın karışımı daha görkemli premium görünüm',
    emoji: '👑',
    headerGradient: ['rgba(49, 11, 74, 0.95)', 'rgba(76, 29, 149, 0.94)', 'rgba(30, 41, 59, 0.92)'],
    headerGlowGradient: ['rgba(192, 132, 252, 0.18)', 'rgba(251, 191, 36, 0.13)', 'rgba(76, 29, 149, 0.08)'],
    headerBorderColor: 'rgba(196, 181, 253, 0.44)',
    brandGradient: ['rgba(59, 7, 100, 0.9)', 'rgba(91, 33, 182, 0.88)', 'rgba(30, 41, 59, 0.86)'],
    brandBorderColor: 'rgba(216, 180, 254, 0.48)',
    logoGlowColor: '#a855f7',
    questPanelBackground: 'rgba(76, 29, 149, 0.36)',
    questPanelBorderColor: 'rgba(196, 181, 253, 0.3)',
    questCardGradient: ['rgba(168, 85, 247, 0.2)', 'rgba(251, 191, 36, 0.14)', 'rgba(30, 41, 59, 0.76)'],
    questCardBorderColor: 'rgba(216, 180, 254, 0.3)',
    questTitleColor: '#f3e8ff',
    questPrimaryTextColor: '#faf5ff',
    questSecondaryTextColor: 'rgba(233, 213, 255, 0.88)',
    questActionTextColor: '#fde68a',
    questMoreTextColor: '#f5d0fe',
    questProgressTrackColor: 'rgba(76, 29, 149, 0.58)',
    questProgressTrackBorderColor: 'rgba(216, 180, 254, 0.28)',
    questProgressFillColor: '#a855f7',
    questEmptyBackground: 'rgba(76, 29, 149, 0.56)',
    questEmptyBorderColor: 'rgba(216, 180, 254, 0.22)',
    questEmptyTextColor: 'rgba(243, 232, 255, 0.92)',
    farmInventoryHeaderGradient: ['rgba(59, 7, 100, 0.98)', 'rgba(76, 29, 149, 0.94)', 'rgba(30, 41, 59, 0.96)'],
    filterActiveBackground: 'rgba(168,85,247,0.22)',
    filterActiveBorderColor: 'rgba(216,180,254,0.46)',
    filterAllActiveColor: '#c084fc',
  },
};

export const CARD_HEADER_THEME_OPTIONS: CardHeaderThemePreset[] = [
  CARD_HEADER_THEME_PRESETS.sunforge,
  CARD_HEADER_THEME_PRESETS.emerald,
  CARD_HEADER_THEME_PRESETS.neon,
  CARD_HEADER_THEME_PRESETS.royal,
];

const CARD_HEADER_THEME_ALIASES: Record<string, CardHeaderTheme> = {
  premium: 'sunforge',
  premiumgold: 'sunforge',
  premiumaltin: 'sunforge',
  gold: 'sunforge',
  altin: 'sunforge',
  default: 'sunforge',
  green: 'emerald',
  neonvolt: 'neon',
  royalpurple: 'royal',
};

export const getCardHeaderThemePreset = (themeId?: string): CardHeaderThemePreset => {
  const normalized = typeof themeId === 'string' ? themeId.trim().toLowerCase() : '';
  const compact = normalized.replace(/[-_\s]+/g, '');
  if (normalized && Object.prototype.hasOwnProperty.call(CARD_HEADER_THEME_PRESETS, normalized)) {
    return CARD_HEADER_THEME_PRESETS[normalized as CardHeaderTheme];
  }
  if (compact && Object.prototype.hasOwnProperty.call(CARD_HEADER_THEME_PRESETS, compact)) {
    return CARD_HEADER_THEME_PRESETS[compact as CardHeaderTheme];
  }
  if (normalized && CARD_HEADER_THEME_ALIASES[normalized]) {
    return CARD_HEADER_THEME_PRESETS[CARD_HEADER_THEME_ALIASES[normalized]];
  }
  if (compact && CARD_HEADER_THEME_ALIASES[compact]) {
    return CARD_HEADER_THEME_PRESETS[CARD_HEADER_THEME_ALIASES[compact]];
  }
  return CARD_HEADER_THEME_PRESETS.sunforge;
};

export const BORDER_STYLES: Record<CardBorderStyle, { label: string; borderRadius: number; borderWidth: number; shadowRadius: number }> = {
  default: { label: 'Normal', borderRadius: 20, borderWidth: 1.5, shadowRadius: 12 },
  glow: { label: 'Işıltılı', borderRadius: 20, borderWidth: 2, shadowRadius: 24 },
  sharp: { label: 'Keskin', borderRadius: 6, borderWidth: 2, shadowRadius: 4 },
  rounded: { label: 'Yumuşak', borderRadius: 28, borderWidth: 1, shadowRadius: 16 },
  none: { label: 'Çerçevesiz', borderRadius: 16, borderWidth: 0, shadowRadius: 0 },
};

// ─── Card theme overlay definition ───
// These overlay the progression-based theme (red/yellow/green/master etc.)
// They modify gradient hue, border style, and add special effects
export interface CardThemeOverlay {
  id: string;
  name: string;
  description: string;
  rarity: CardRarity;
  price: number;             // 0 = achievement-unlocked or free
  unlockRequirement?: string; // e.g. 'harvest_100', 'combo_50', 'battle_win_10'
  unlockDescription?: string; // Turkish text for unlock condition
  // Visual overrides — these tint/modify the progression theme
  gradientTint: readonly [string, string];  // overlaid on top with low opacity
  borderColor: string;                       // overrides border
  borderGlow: string;
  particleColor?: string;                    // optional particle effect color
  cardOverlayImage?: string;                 // optional pattern overlay
  emoji: string;                             // shop preview emoji
  previewGradient: readonly [string, string, string]; // preview card gradient
}

// ─── Card customization state ───
export interface CardCustomization {
  fontStyle: CardFontStyle;
  borderStyle: CardBorderStyle;
  backgroundStyle: CardBackgroundStyle;
  headerTheme: CardHeaderTheme;
  showEmoji: boolean;
  showProgressBar: boolean;
  showLevel: boolean;
  compactMode: boolean;
  largeMode: boolean;
  enableCardGlow: boolean;
  enableCardBounce: boolean;
  enableCardBurstFx: boolean;
  cardBounceIntensity: CardBounceIntensity;
}

export const DEFAULT_CUSTOMIZATION: CardCustomization = {
  fontStyle: 'default',
  borderStyle: 'default',
  backgroundStyle: 'default',
  headerTheme: 'sunforge',
  showEmoji: true,
  showProgressBar: true,
  showLevel: true,
  compactMode: false,
  largeMode: false,
  enableCardGlow: true,
  enableCardBounce: true,
  enableCardBurstFx: true,
  cardBounceIntensity: 'normal',
};

// ─── Collectible card definition ───
export interface CollectibleCard {
  id: string;
  name: string;
  description: string;
  rarity: CardRarity;
  emoji: string;
  unlockCondition: string;  // description
  unlockKey: string;        // programmatic key to check
  unlockTarget: number;     // target value
  rewardThemeId?: string;   // optional theme reward unlock
}

// ═══════════════════════════════════════════════════════════════
// 🛒 MAĞAZA TEMALARİ - 18 tema, 4 rarity
// ═══════════════════════════════════════════════════════════════

export const CARD_THEME_OVERLAYS: CardThemeOverlay[] = [
  // ── COMMON (100-500 coins) ──
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Sade ve temiz bir görünüm',
    rarity: 'common',
    price: 100,
    gradientTint: ['rgba(241, 245, 249, 0.15)', 'rgba(226, 232, 240, 0.15)'],
    borderColor: 'rgba(203, 213, 225, 0.6)',
    borderGlow: '#cbd5e1',
    emoji: '⬜',
    previewGradient: ['#f1f5f9', '#e2e8f0', '#cbd5e1'],
  },
  {
    id: 'nature',
    name: 'Doğa',
    description: 'Yeşilin huzuru kartlarında',
    rarity: 'common',
    price: 200,
    gradientTint: ['rgba(34, 197, 94, 0.12)', 'rgba(16, 185, 129, 0.12)'],
    borderColor: 'rgba(34, 197, 94, 0.6)',
    borderGlow: '#22c55e',
    particleColor: '#86efac',
    emoji: '🌿',
    previewGradient: ['#14532d', '#065f46', '#14532d'],
  },
  {
    id: 'ocean',
    name: 'Okyanus',
    description: 'Derin denizlerin mavisi',
    rarity: 'common',
    price: 200,
    gradientTint: ['rgba(59, 130, 246, 0.12)', 'rgba(37, 99, 235, 0.12)'],
    borderColor: 'rgba(96, 165, 250, 0.6)',
    borderGlow: '#60a5fa',
    particleColor: '#93c5fd',
    emoji: '🌊',
    previewGradient: ['#1e3a5f', '#1e40af', '#1e3a5f'],
  },
  {
    id: 'sunset',
    name: 'Gün Batımı',
    description: 'Turuncu ve pembe tonları',
    rarity: 'common',
    price: 300,
    gradientTint: ['rgba(251, 146, 60, 0.12)', 'rgba(244, 63, 94, 0.12)'],
    borderColor: 'rgba(251, 146, 60, 0.6)',
    borderGlow: '#fb923c',
    particleColor: '#fdba74',
    emoji: '🌅',
    previewGradient: ['#7c2d12', '#9f1239', '#7c2d12'],
  },
  {
    id: 'forest',
    name: 'Orman',
    description: 'Koyu yeşil orman tonları',
    rarity: 'common',
    price: 300,
    gradientTint: ['rgba(21, 128, 61, 0.12)', 'rgba(5, 150, 105, 0.12)'],
    borderColor: 'rgba(74, 222, 128, 0.5)',
    borderGlow: '#4ade80',
    particleColor: '#bbf7d0',
    emoji: '🌲',
    previewGradient: ['#052e16', '#064e3b', '#052e16'],
  },
  {
    id: 'cherry',
    name: 'Kiraz Çiçeği',
    description: 'Bahar esintisi',
    rarity: 'common',
    price: 500,
    gradientTint: ['rgba(236, 72, 153, 0.12)', 'rgba(244, 114, 182, 0.12)'],
    borderColor: 'rgba(244, 114, 182, 0.6)',
    borderGlow: '#f472b6',
    particleColor: '#fbcfe8',
    emoji: '🌸',
    previewGradient: ['#831843', '#9d174d', '#831843'],
  },
  {
    id: 'obsidian',
    name: 'Obsidyen',
    description: 'Siyah cam ve metalik premium ışık',
    rarity: 'common',
    price: 450,
    gradientTint: ['rgba(17, 24, 39, 0.2)', 'rgba(71, 85, 105, 0.16)'],
    borderColor: 'rgba(148, 163, 184, 0.55)',
    borderGlow: '#94a3b8',
    particleColor: '#cbd5e1',
    emoji: '🪨',
    previewGradient: ['#020617', '#0f172a', '#111827'],
  },
  // ── RARE (1000-2000 coins) ──
  {
    id: 'neon',
    name: 'Neon',
    description: 'Parlak neon ışıklar',
    rarity: 'rare',
    price: 1000,
    gradientTint: ['rgba(0, 255, 128, 0.1)', 'rgba(0, 200, 255, 0.1)'],
    borderColor: 'rgba(0, 255, 170, 0.8)',
    borderGlow: '#00ffa9',
    particleColor: '#00ffd5',
    emoji: '💡',
    previewGradient: ['#0a1628', '#001a12', '#0a1628'],
  },
  {
    id: 'retro',
    name: 'Retro',
    description: '80\'ler stili retro dalga',
    rarity: 'rare',
    price: 1000,
    gradientTint: ['rgba(236, 72, 153, 0.15)', 'rgba(124, 58, 237, 0.15)'],
    borderColor: 'rgba(236, 72, 153, 0.75)',
    borderGlow: '#ec4899',
    particleColor: '#f9a8d4',
    emoji: '📼',
    previewGradient: ['#4a044e', '#1e1b4b', '#4a044e'],
  },
  {
    id: 'galaxy',
    name: 'Galaksi',
    description: 'Uzayın derinliklerinden',
    rarity: 'rare',
    price: 1500,
    gradientTint: ['rgba(99, 102, 241, 0.12)', 'rgba(168, 85, 247, 0.12)'],
    borderColor: 'rgba(165, 180, 252, 0.7)',
    borderGlow: '#a5b4fc',
    particleColor: '#c7d2fe',
    emoji: '🌌',
    previewGradient: ['#1e1b4b', '#312e81', '#1e1b4b'],
  },
  {
    id: 'crystal',
    name: 'Kristal',
    description: 'Buz kristali parlaklığı',
    rarity: 'rare',
    price: 1500,
    gradientTint: ['rgba(147, 197, 253, 0.15)', 'rgba(196, 181, 253, 0.15)'],
    borderColor: 'rgba(191, 219, 254, 0.8)',
    borderGlow: '#bfdbfe',
    particleColor: '#dbeafe',
    emoji: '🔮',
    previewGradient: ['#1e3a5f', '#312e81', '#1e3a5f'],
  },
  {
    id: 'amber',
    name: 'Kehribar',
    description: 'Antik kehribar tonları',
    rarity: 'rare',
    price: 2000,
    gradientTint: ['rgba(245, 158, 11, 0.12)', 'rgba(217, 119, 6, 0.12)'],
    borderColor: 'rgba(251, 191, 36, 0.7)',
    borderGlow: '#fbbf24',
    particleColor: '#fde68a',
    emoji: '🟤',
    previewGradient: ['#451a03', '#78350f', '#451a03'],
  },
  {
    id: 'voltstorm',
    name: 'Volt Fırtınası',
    description: 'Elektrik patlaması ve aşırı neon enerjisi',
    rarity: 'rare',
    price: 1800,
    gradientTint: ['rgba(6, 182, 212, 0.2)', 'rgba(168, 85, 247, 0.18)'],
    borderColor: 'rgba(34, 211, 238, 0.85)',
    borderGlow: '#22d3ee',
    particleColor: '#67e8f9',
    emoji: '⚡',
    previewGradient: ['#031525', '#0f172a', '#2e1065'],
  },
  {
    id: 'ionpulse',
    name: 'Ion Pulse',
    description: 'Yüksek voltajlı mavi-cyan darbe',
    rarity: 'rare',
    price: 1900,
    gradientTint: ['rgba(56, 189, 248, 0.18)', 'rgba(45, 212, 191, 0.18)'],
    borderColor: 'rgba(34, 211, 238, 0.86)',
    borderGlow: '#22d3ee',
    particleColor: '#67e8f9',
    emoji: '⚡',
    previewGradient: ['#042f2e', '#0c4a6e', '#111827'],
  },
  {
    id: 'toxicnova',
    name: 'Toxic Nova',
    description: 'Aşırı asidik neon patlama teması',
    rarity: 'rare',
    price: 2000,
    gradientTint: ['rgba(132, 204, 22, 0.18)', 'rgba(34, 197, 94, 0.14)'],
    borderColor: 'rgba(163, 230, 53, 0.8)',
    borderGlow: '#a3e635',
    particleColor: '#d9f99d',
    emoji: '☢️',
    previewGradient: ['#1a2e05', '#365314', '#1f2937'],
  },
  // ── EPIC (5000-10000 coins) ──
  {
    id: 'dragon',
    name: 'Ejderha',
    description: 'Ateş ve alevler',
    rarity: 'epic',
    price: 5000,
    gradientTint: ['rgba(239, 68, 68, 0.15)', 'rgba(249, 115, 22, 0.15)'],
    borderColor: 'rgba(248, 113, 113, 0.85)',
    borderGlow: '#f87171',
    particleColor: '#fca5a5',
    emoji: '🐉',
    previewGradient: ['#450a0a', '#7c2d12', '#450a0a'],
  },
  {
    id: 'phoenix',
    name: 'Anka Kuşu',
    description: 'Küllerinden doğan ateş',
    rarity: 'epic',
    price: 7500,
    gradientTint: ['rgba(251, 146, 60, 0.18)', 'rgba(250, 204, 21, 0.18)'],
    borderColor: 'rgba(251, 191, 36, 0.85)',
    borderGlow: '#fbbf24',
    particleColor: '#fef08a',
    emoji: '🦅',
    previewGradient: ['#78350f', '#713f12', '#78350f'],
  },
  {
    id: 'cyberpunk',
    name: 'Siberpunk',
    description: 'Gelecekten gelen teknoloji',
    rarity: 'epic',
    price: 10000,
    gradientTint: ['rgba(6, 182, 212, 0.15)', 'rgba(236, 72, 153, 0.15)'],
    borderColor: 'rgba(34, 211, 238, 0.85)',
    borderGlow: '#22d3ee',
    particleColor: '#67e8f9',
    emoji: '🤖',
    previewGradient: ['#083344', '#500724', '#083344'],
  },
  {
    id: 'aurora',
    name: 'Kuzey Işıkları',
    description: 'Gökyüzünün büyüsü',
    rarity: 'epic',
    price: 10000,
    gradientTint: ['rgba(34, 197, 94, 0.12)', 'rgba(59, 130, 246, 0.12)'],
    borderColor: 'rgba(52, 211, 153, 0.8)',
    borderGlow: '#34d399',
    particleColor: '#6ee7b7',
    emoji: '🌈',
    previewGradient: ['#022c22', '#172554', '#022c22'],
  },
  {
    id: 'plasmaforge',
    name: 'Plasma Forge',
    description: 'Patlamalı plasma çekirdeği ve sarsıcı glow',
    rarity: 'epic',
    price: 12000,
    gradientTint: ['rgba(251, 146, 60, 0.2)', 'rgba(236, 72, 153, 0.2)'],
    borderColor: 'rgba(251, 113, 133, 0.86)',
    borderGlow: '#fb7185',
    particleColor: '#fda4af',
    emoji: '💥',
    previewGradient: ['#3f0f1f', '#7f1d1d', '#3b0764'],
  },
  {
    id: 'neonmatrix',
    name: 'Neon Matrix',
    description: 'Arcade stili cyber grid ve ritmik bounce',
    rarity: 'epic',
    price: 11000,
    gradientTint: ['rgba(34, 211, 238, 0.18)', 'rgba(168, 85, 247, 0.18)'],
    borderColor: 'rgba(129, 140, 248, 0.86)',
    borderGlow: '#818cf8',
    particleColor: '#a5b4fc',
    emoji: '🕹️',
    previewGradient: ['#0b1120', '#111827', '#312e81'],
  },
  // ── LEGENDARY (achievements only, price=0) ──
  {
    id: 'diamond',
    name: 'Elmas',
    description: 'Parıldayan elmas deseni',
    rarity: 'legendary',
    price: 0,
    unlockRequirement: 'harvest_500',
    unlockDescription: '500 kelime hasat et',
    gradientTint: ['rgba(147, 197, 253, 0.2)', 'rgba(34, 211, 238, 0.2)'],
    borderColor: 'rgba(186, 230, 253, 0.95)',
    borderGlow: '#bae6fd',
    particleColor: '#e0f2fe',
    emoji: '💎',
    previewGradient: ['#0c4a6e', '#164e63', '#0c4a6e'],
  },
  {
    id: 'royal',
    name: 'Kraliyet',
    description: 'Soylu kraliyet deseni',
    rarity: 'legendary',
    price: 0,
    unlockRequirement: 'quiz_1000',
    unlockDescription: '1000 quiz sorusuna cevap ver',
    gradientTint: ['rgba(168, 85, 247, 0.2)', 'rgba(139, 92, 246, 0.2)'],
    borderColor: 'rgba(216, 180, 254, 0.95)',
    borderGlow: '#d8b4fe',
    particleColor: '#f3e8ff',
    emoji: '👑',
    previewGradient: ['#3b0764', '#4c1d95', '#3b0764'],
  },
  {
    id: 'holographic',
    name: 'Holografik',
    description: 'Göz alıcı hologram efekti',
    rarity: 'legendary',
    price: 0,
    unlockRequirement: 'combo_100',
    unlockDescription: '100 combo yap',
    gradientTint: ['rgba(251, 146, 60, 0.15)', 'rgba(34, 211, 238, 0.15)'],
    borderColor: 'rgba(253, 224, 71, 0.95)',
    borderGlow: '#fde047',
    particleColor: '#fef9c3',
    emoji: '🌟',
    previewGradient: ['#422006', '#083344', '#422006'],
  },
  {
    id: 'overdrive',
    name: 'Overdrive',
    description: 'Roket hızında elektrik ve alev karması',
    rarity: 'legendary',
    price: 0,
    unlockRequirement: 'battle_250',
    unlockDescription: '250 battle kazan',
    gradientTint: ['rgba(34, 211, 238, 0.22)', 'rgba(239, 68, 68, 0.2)'],
    borderColor: 'rgba(125, 211, 252, 0.96)',
    borderGlow: '#7dd3fc',
    particleColor: '#bae6fd',
    emoji: '🚀',
    previewGradient: ['#0f172a', '#1e3a8a', '#450a0a'],
  },
];

// ═══════════════════════════════════════════════════════════════
// 🏆 KOLEKSİYON KARTLARI - Başarıya bağlı özel kartlar
// ═══════════════════════════════════════════════════════════════

export const COLLECTIBLE_CARDS: CollectibleCard[] = [
  // Milestone kartları
  { id: 'first_harvest', name: 'İlk Hasat', description: 'İlk kelimeni hasat ettin!', rarity: 'common', emoji: '🌾', unlockCondition: 'İlk kelimeyi hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 1, rewardThemeId: 'nature' },
  { id: 'word_farmer', name: 'Kelime Çiftçisi', description: '50 kelime hasat ettin', rarity: 'common', emoji: '👨‍🌾', unlockCondition: '50 kelime hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 50, rewardThemeId: 'forest' },
  { id: 'harvest_master', name: 'Hasat Ustası', description: '200 kelime hasat ettin', rarity: 'rare', emoji: '🏅', unlockCondition: '200 kelime hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 200, rewardThemeId: 'voltstorm' },
  { id: 'harvest_legend', name: 'Hasat Efsanesi', description: '500 kelime hasat ettin', rarity: 'epic', emoji: '🏆', unlockCondition: '500 kelime hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 500, rewardThemeId: 'dragon' },
  { id: 'harvest_titan', name: 'Hasat Titani', description: '1000 kelime hasat ettin', rarity: 'legendary', emoji: '🌋', unlockCondition: '1000 kelime hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 1000, rewardThemeId: 'plasmaforge' },
  
  // Quiz kartları
  { id: 'quiz_starter', name: 'Quiz Başlangıcı', description: 'İlk quiz\'ini tamamladın', rarity: 'common', emoji: '📝', unlockCondition: 'İlk quiz\'i tamamla', unlockKey: 'totalQuizzes', unlockTarget: 1, rewardThemeId: 'minimal' },
  { id: 'quiz_addict', name: 'Quiz Tutkunu', description: '100 quiz tamamladın', rarity: 'rare', emoji: '🧠', unlockCondition: '100 quiz tamamla', unlockKey: 'totalQuizzes', unlockTarget: 100, rewardThemeId: 'neon' },
  { id: 'quiz_master', name: 'Quiz Ustası', description: '500 quiz tamamladın', rarity: 'epic', emoji: '🎓', unlockCondition: '500 quiz tamamla', unlockKey: 'totalQuizzes', unlockTarget: 500, rewardThemeId: 'galaxy' },
  { id: 'quiz_legend', name: 'Quiz Efsanesi', description: '1000 quiz tamamladın', rarity: 'legendary', emoji: '🎯', unlockCondition: '1000 quiz tamamla', unlockKey: 'totalQuizzes', unlockTarget: 1000, rewardThemeId: 'neonmatrix' },
  
  // Combo kartları
  { id: 'combo_5', name: 'Combo Başlangıcı', description: '5 combo yaptın', rarity: 'common', emoji: '🔥', unlockCondition: '5 combo yap', unlockKey: 'bestStreak', unlockTarget: 5, rewardThemeId: 'sunset' },
  { id: 'combo_20', name: 'Combo Avcısı', description: '20 combo yaptın', rarity: 'rare', emoji: '⚡', unlockCondition: '20 combo yap', unlockKey: 'bestStreak', unlockTarget: 20, rewardThemeId: 'retro' },
  { id: 'combo_50', name: 'Combo Kralı', description: '50 combo yaptın', rarity: 'epic', emoji: '👑', unlockCondition: '50 combo yap', unlockKey: 'bestStreak', unlockTarget: 50, rewardThemeId: 'cyberpunk' },
  { id: 'combo_100', name: 'Combo Efsanesi', description: '100 combo yaptın!', rarity: 'legendary', emoji: '🌟', unlockCondition: '100 combo yap', unlockKey: 'bestStreak', unlockTarget: 100, rewardThemeId: 'holographic' },
  
  // Battle kartları
  { id: 'first_battle', name: 'İlk Zafer', description: 'İlk savaşını kazandın', rarity: 'common', emoji: '⚔️', unlockCondition: 'İlk battle\'ı kazan', unlockKey: 'battleWins', unlockTarget: 1, rewardThemeId: 'amber' },
  { id: 'battle_veteran', name: 'Savaş Gazisi', description: '25 savaş kazandın', rarity: 'rare', emoji: '🛡️', unlockCondition: '25 battle kazan', unlockKey: 'battleWins', unlockTarget: 25, rewardThemeId: 'crystal' },
  { id: 'battle_champion', name: 'Şampiyon', description: '100 savaş kazandın', rarity: 'epic', emoji: '🏅', unlockCondition: '100 battle kazan', unlockKey: 'battleWins', unlockTarget: 100, rewardThemeId: 'phoenix' },
  { id: 'battle_overdrive', name: 'Overdrive Generali', description: '250 savaş kazandın', rarity: 'legendary', emoji: '🚀', unlockCondition: '250 battle kazan', unlockKey: 'battleWins', unlockTarget: 250, rewardThemeId: 'overdrive' },
  
  // Streak kartları
  { id: 'streak_7', name: 'Haftalık Seri', description: '7 günlük seri', rarity: 'rare', emoji: '📆', unlockCondition: '7 gün üst üste oyna', unlockKey: 'dailyStreak', unlockTarget: 7, rewardThemeId: 'cherry' },
  { id: 'streak_30', name: 'Aylık Seri', description: '30 günlük seri', rarity: 'epic', emoji: '🗓️', unlockCondition: '30 gün üst üste oyna', unlockKey: 'dailyStreak', unlockTarget: 30, rewardThemeId: 'aurora' },
  { id: 'streak_100', name: 'Yüz Gün!', description: '100 günlük seri!', rarity: 'legendary', emoji: '💯', unlockCondition: '100 gün üst üste oyna', unlockKey: 'dailyStreak', unlockTarget: 100, rewardThemeId: 'royal' },
  { id: 'streak_180', name: 'Demir Seri', description: '180 günlük seri', rarity: 'legendary', emoji: '⚡', unlockCondition: '180 gün üst üste oyna', unlockKey: 'dailyStreak', unlockTarget: 180, rewardThemeId: 'ionpulse' },
  
  // Coin kartları
  { id: 'rich_farmer', name: 'Zengin Çiftçi', description: '10.000 coin kazandın', rarity: 'rare', emoji: '💰', unlockCondition: '10.000 coin kazan', unlockKey: 'lifetimeCoins', unlockTarget: 10000, rewardThemeId: 'diamond' },
  { id: 'millionaire', name: 'Milyoner', description: '100.000 coin kazandın', rarity: 'legendary', emoji: '💎', unlockCondition: '100.000 coin kazan', unlockKey: 'lifetimeCoins', unlockTarget: 100000, rewardThemeId: 'royal' },
  { id: 'coin_tycoon', name: 'Coin Patronu', description: '500.000 coin kazandın', rarity: 'legendary', emoji: '🪙', unlockCondition: '500.000 coin kazan', unlockKey: 'lifetimeCoins', unlockTarget: 500000, rewardThemeId: 'obsidian' },

  // Plant kartları
  { id: 'planter_100', name: 'Ekici', description: '100 kelime ektin', rarity: 'rare', emoji: '🌱', unlockCondition: '100 kelime ek', unlockKey: 'lifetimePlantedWords', unlockTarget: 100, rewardThemeId: 'ocean' },
  { id: 'planter_500', name: 'Baş Ekici', description: '500 kelime ektin', rarity: 'epic', emoji: '🌳', unlockCondition: '500 kelime ek', unlockKey: 'lifetimePlantedWords', unlockTarget: 500, rewardThemeId: 'voltstorm' },
  { id: 'planter_1500', name: 'Ekici Ustası', description: '1500 kelime ektin', rarity: 'legendary', emoji: '☢️', unlockCondition: '1500 kelime ek', unlockKey: 'lifetimePlantedWords', unlockTarget: 1500, rewardThemeId: 'toxicnova' },
];

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FONKSİYONLARI
// ═══════════════════════════════════════════════════════════════

/** Tema ID'sine göre tema overlayını bul */
export const getThemeOverlay = (themeId: string): CardThemeOverlay | undefined =>
  CARD_THEME_OVERLAYS.find(t => t.id === themeId);

/** Koleksiyon kartını bul */
export const getCollectibleCard = (cardId: string): CollectibleCard | undefined =>
  COLLECTIBLE_CARDS.find(c => c.id === cardId);

/** Rarity'ye göre temaları filtrele */
export const getThemesByRarity = (rarity: CardRarity): CardThemeOverlay[] =>
  CARD_THEME_OVERLAYS.filter(t => t.rarity === rarity);

/** Satın alınabilir temaları getir (price > 0) */
export const getPurchasableThemes = (): CardThemeOverlay[] =>
  CARD_THEME_OVERLAYS.filter(t => t.price > 0);

/** Achievement-unlocked temaları getir */
export const getAchievementThemes = (): CardThemeOverlay[] =>
  CARD_THEME_OVERLAYS.filter(t => t.price === 0 && t.unlockRequirement);

/** Unlock requirement kontrolü */
export const checkThemeUnlock = (
  themeId: string,
  stats: Record<string, number>
): boolean => {
  const theme = getThemeOverlay(themeId);
  if (!theme || !theme.unlockRequirement) return false;
  
  const [stat, targetStr] = theme.unlockRequirement.split('_');
  const target = parseInt(targetStr, 10);
  const statKeys: Record<string, string> = {
    harvest: 'lifetimeHarvests',
    quiz: 'lifetimeQuizAnswered',
    combo: 'bestStreak',
    battle: 'lifetimeBattlesWon',
  };
  
  const key = statKeys[stat];
  if (!key) return false;
  return (stats[key] || 0) >= target;
};

/** Collectible card unlock kontrolü */
export const checkCollectibleUnlock = (
  cardId: string,
  stats: Record<string, number>
): boolean => {
  const card = getCollectibleCard(cardId);
  if (!card) return false;
  return (stats[card.unlockKey] || 0) >= card.unlockTarget;
};
