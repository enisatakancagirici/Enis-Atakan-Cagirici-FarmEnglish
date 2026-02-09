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
  showEmoji: boolean;
  showProgressBar: boolean;
  showLevel: boolean;
  compactMode: boolean;
}

export const DEFAULT_CUSTOMIZATION: CardCustomization = {
  fontStyle: 'default',
  borderStyle: 'default',
  showEmoji: true,
  showProgressBar: true,
  showLevel: true,
  compactMode: false,
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
];

// ═══════════════════════════════════════════════════════════════
// 🏆 KOLEKSİYON KARTLARI - Başarıya bağlı özel kartlar
// ═══════════════════════════════════════════════════════════════

export const COLLECTIBLE_CARDS: CollectibleCard[] = [
  // Milestone kartları
  { id: 'first_harvest', name: 'İlk Hasat', description: 'İlk kelimeni hasat ettin!', rarity: 'common', emoji: '🌾', unlockCondition: 'İlk kelimeyi hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 1 },
  { id: 'word_farmer', name: 'Kelime Çiftçisi', description: '50 kelime hasat ettin', rarity: 'common', emoji: '👨‍🌾', unlockCondition: '50 kelime hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 50 },
  { id: 'harvest_master', name: 'Hasat Ustası', description: '200 kelime hasat ettin', rarity: 'rare', emoji: '🏅', unlockCondition: '200 kelime hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 200 },
  { id: 'harvest_legend', name: 'Hasat Efsanesi', description: '500 kelime hasat ettin', rarity: 'epic', emoji: '🏆', unlockCondition: '500 kelime hasat et', unlockKey: 'lifetimeHarvests', unlockTarget: 500 },
  
  // Quiz kartları
  { id: 'quiz_starter', name: 'Quiz Başlangıcı', description: 'İlk quiz\'ini tamamladın', rarity: 'common', emoji: '📝', unlockCondition: 'İlk quiz\'i tamamla', unlockKey: 'totalQuizzes', unlockTarget: 1 },
  { id: 'quiz_addict', name: 'Quiz Tutkunu', description: '100 quiz tamamladın', rarity: 'rare', emoji: '🧠', unlockCondition: '100 quiz tamamla', unlockKey: 'totalQuizzes', unlockTarget: 100 },
  { id: 'quiz_master', name: 'Quiz Ustası', description: '500 quiz tamamladın', rarity: 'epic', emoji: '🎓', unlockCondition: '500 quiz tamamla', unlockKey: 'totalQuizzes', unlockTarget: 500 },
  
  // Combo kartları
  { id: 'combo_5', name: 'Combo Başlangıcı', description: '5 combo yaptın', rarity: 'common', emoji: '🔥', unlockCondition: '5 combo yap', unlockKey: 'bestStreak', unlockTarget: 5 },
  { id: 'combo_20', name: 'Combo Avcısı', description: '20 combo yaptın', rarity: 'rare', emoji: '⚡', unlockCondition: '20 combo yap', unlockKey: 'bestStreak', unlockTarget: 20 },
  { id: 'combo_50', name: 'Combo Kralı', description: '50 combo yaptın', rarity: 'epic', emoji: '👑', unlockCondition: '50 combo yap', unlockKey: 'bestStreak', unlockTarget: 50 },
  { id: 'combo_100', name: 'Combo Efsanesi', description: '100 combo yaptın!', rarity: 'legendary', emoji: '🌟', unlockCondition: '100 combo yap', unlockKey: 'bestStreak', unlockTarget: 100 },
  
  // Battle kartları
  { id: 'first_battle', name: 'İlk Zafer', description: 'İlk savaşını kazandın', rarity: 'common', emoji: '⚔️', unlockCondition: 'İlk battle\'ı kazan', unlockKey: 'battleWins', unlockTarget: 1 },
  { id: 'battle_veteran', name: 'Savaş Gazisi', description: '25 savaş kazandın', rarity: 'rare', emoji: '🛡️', unlockCondition: '25 battle kazan', unlockKey: 'battleWins', unlockTarget: 25 },
  { id: 'battle_champion', name: 'Şampiyon', description: '100 savaş kazandın', rarity: 'epic', emoji: '🏅', unlockCondition: '100 battle kazan', unlockKey: 'battleWins', unlockTarget: 100 },
  
  // Streak kartları
  { id: 'streak_7', name: 'Haftalık Seri', description: '7 günlük seri', rarity: 'rare', emoji: '📆', unlockCondition: '7 gün üst üste oyna', unlockKey: 'dailyStreak', unlockTarget: 7 },
  { id: 'streak_30', name: 'Aylık Seri', description: '30 günlük seri', rarity: 'epic', emoji: '🗓️', unlockCondition: '30 gün üst üste oyna', unlockKey: 'dailyStreak', unlockTarget: 30 },
  { id: 'streak_100', name: 'Yüz Gün!', description: '100 günlük seri!', rarity: 'legendary', emoji: '💯', unlockCondition: '100 gün üst üste oyna', unlockKey: 'dailyStreak', unlockTarget: 100 },
  
  // Coin kartları
  { id: 'rich_farmer', name: 'Zengin Çiftçi', description: '10.000 coin kazandın', rarity: 'rare', emoji: '💰', unlockCondition: '10.000 coin kazan', unlockKey: 'lifetimeCoins', unlockTarget: 10000 },
  { id: 'millionaire', name: 'Milyoner', description: '100.000 coin kazandın', rarity: 'legendary', emoji: '💎', unlockCondition: '100.000 coin kazan', unlockKey: 'lifetimeCoins', unlockTarget: 100000 },

  // Plant kartları
  { id: 'planter_100', name: 'Ekici', description: '100 kelime ektin', rarity: 'rare', emoji: '🌱', unlockCondition: '100 kelime ek', unlockKey: 'lifetimePlantedWords', unlockTarget: 100 },
  { id: 'planter_500', name: 'Baş Ekici', description: '500 kelime ektin', rarity: 'epic', emoji: '🌳', unlockCondition: '500 kelime ek', unlockKey: 'lifetimePlantedWords', unlockTarget: 500 },
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
