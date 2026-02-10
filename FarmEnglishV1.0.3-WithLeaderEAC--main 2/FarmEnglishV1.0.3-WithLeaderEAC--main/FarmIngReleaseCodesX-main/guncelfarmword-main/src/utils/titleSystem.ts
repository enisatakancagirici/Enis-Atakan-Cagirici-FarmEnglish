/**
 * 🏆 ÜNVAN SİSTEMİ — Leaderboard Top 5 İçin Özel Ünvanlar
 * 
 * Savaşçılar (Battle) Tab:
 *   1. Efsane Savaşçı 🗡️
 *   2. Büyük Komutan ⚔️
 *   3. Rakipsavar 🛡️
 *   4. Şanlı Savaşçı 🔥
 *   5. Korkusuz Gladyatör ⚡
 * 
 * Çiftçiler (Harvest) Tab:
 *   1. Efsane Çiftçi 🌾
 *   2. Altın Orakçı 🥇
 *   3. Tarla Baronu 👑
 *   4. Usta Hasat Ustası 🌻
 *   5. Bereketli Eller 🍀
 * 
 * Genel Sıralama Tab:
 *   1. FarmIng Efsanesi 👑
 *   2. Süper Beyin 🧠
 *   3. Kelime Dehası 💎
 *   4. Dil Ustası ✨
 *   5. Büyük Bilge 📚
 *
 * Askeri rütbe sistemi (pozisyona göre) ayrıca devam eder.
 */

// ─────────────────────────────────────────
// 📦 TİPLER
// ─────────────────────────────────────────

export interface PlayerTitle {
  title: string;
  emoji: string;
  color: string;
  glowColor: string;
  tier: 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';
}

export type LeaderboardCategory = 'general' | 'battle' | 'harvest';

// ─────────────────────────────────────────
// 🗡️ SAVAŞÇI ÜNVANLARI (Battle Tab - Top 5)
// ─────────────────────────────────────────

const BATTLE_TITLES: Record<number, PlayerTitle> = {
  1: {
    title: 'Efsane Savaşçı',
    emoji: '🗡️',
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.4)',
    tier: 'legendary',
  },
  2: {
    title: 'Büyük Komutan',
    emoji: '⚔️',
    color: '#E5E7EB',
    glowColor: 'rgba(229, 231, 235, 0.3)',
    tier: 'epic',
  },
  3: {
    title: 'Rakipsavar',
    emoji: '🛡️',
    color: '#CD7F32',
    glowColor: 'rgba(205, 127, 50, 0.3)',
    tier: 'epic',
  },
  4: {
    title: 'Şanlı Savaşçı',
    emoji: '🔥',
    color: '#A78BFA',
    glowColor: 'rgba(167, 139, 250, 0.25)',
    tier: 'rare',
  },
  5: {
    title: 'Korkusuz Gladyatör',
    emoji: '⚡',
    color: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.2)',
    tier: 'rare',
  },
};

// ─────────────────────────────────────────
// 🌾 ÇİFTÇİ ÜNVANLARI (Harvest Tab - Top 5)
// ─────────────────────────────────────────

const HARVEST_TITLES: Record<number, PlayerTitle> = {
  1: {
    title: 'Efsane Çiftçi',
    emoji: '🌾',
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.4)',
    tier: 'legendary',
  },
  2: {
    title: 'Altın Orakçı',
    emoji: '🥇',
    color: '#E5E7EB',
    glowColor: 'rgba(229, 231, 235, 0.3)',
    tier: 'epic',
  },
  3: {
    title: 'Tarla Baronu',
    emoji: '👑',
    color: '#CD7F32',
    glowColor: 'rgba(205, 127, 50, 0.3)',
    tier: 'epic',
  },
  4: {
    title: 'Usta Hasat Ustası',
    emoji: '🌻',
    color: '#A78BFA',
    glowColor: 'rgba(167, 139, 250, 0.25)',
    tier: 'rare',
  },
  5: {
    title: 'Bereketli Eller',
    emoji: '🍀',
    color: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.2)',
    tier: 'rare',
  },
};

// ─────────────────────────────────────────
// 👑 GENEL SIRALAMA ÜNVANLARI (General Tab - Top 5)
// ─────────────────────────────────────────

const GENERAL_TITLES: Record<number, PlayerTitle> = {
  1: {
    title: 'FarmIng Efsanesi',
    emoji: '👑',
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.4)',
    tier: 'legendary',
  },
  2: {
    title: 'Süper Beyin',
    emoji: '🧠',
    color: '#E5E7EB',
    glowColor: 'rgba(229, 231, 235, 0.3)',
    tier: 'epic',
  },
  3: {
    title: 'Kelime Dehası',
    emoji: '💎',
    color: '#CD7F32',
    glowColor: 'rgba(205, 127, 50, 0.3)',
    tier: 'epic',
  },
  4: {
    title: 'Dil Ustası',
    emoji: '✨',
    color: '#A78BFA',
    glowColor: 'rgba(167, 139, 250, 0.25)',
    tier: 'rare',
  },
  5: {
    title: 'Büyük Bilge',
    emoji: '📚',
    color: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.2)',
    tier: 'rare',
  },
};

// ─────────────────────────────────────────
// 🎖️ ASKERİ RÜTBE (Pozisyona Göre - tüm sıralama)
// ─────────────────────────────────────────

export interface MilitaryRank {
  title: string;
  badge: string;
  color: string;
  glow: string;
}

export function getMilitaryRank(position: number): MilitaryRank {
  if (position === 1)
    return { title: 'Mareşal', badge: '🎖️', color: '#ffd700', glow: 'rgba(255,215,0,0.3)' };
  if (position === 2)
    return { title: 'Orgeneral', badge: '⭐⭐⭐⭐', color: '#e5e7eb', glow: 'rgba(229,231,235,0.2)' };
  if (position === 3)
    return { title: 'Korgeneral', badge: '⭐⭐⭐', color: '#cd7f32', glow: 'rgba(205,127,50,0.2)' };
  if (position <= 5)
    return { title: 'Tümgeneral', badge: '⭐⭐', color: '#a78bfa', glow: 'rgba(167,139,250,0.15)' };
  if (position <= 10)
    return { title: 'Tuğgeneral', badge: '⭐', color: '#818cf8', glow: 'rgba(129,140,248,0.12)' };
  if (position <= 15)
    return { title: 'Albay', badge: '🎯', color: '#60a5fa', glow: 'rgba(96,165,250,0.1)' };
  if (position <= 25)
    return { title: 'Yarbay', badge: '🛡️', color: '#34d399', glow: 'rgba(52,211,153,0.1)' };
  if (position <= 35)
    return { title: 'Binbaşı', badge: '⚔️', color: '#fbbf24', glow: 'rgba(251,191,36,0.08)' };
  if (position <= 50)
    return { title: 'Yüzbaşı', badge: '🗡️', color: '#f97316', glow: 'rgba(249,115,22,0.08)' };
  if (position <= 75)
    return { title: 'Üsteğmen', badge: '🔰', color: '#94a3b8', glow: 'rgba(148,163,184,0.06)' };
  if (position <= 100)
    return { title: 'Teğmen', badge: '📌', color: '#94a3b8', glow: 'rgba(148,163,184,0.05)' };
  if (position <= 200)
    return { title: 'Asteğmen', badge: '🔹', color: '#64748b', glow: 'rgba(100,116,139,0.04)' };
  return { title: 'Er', badge: '🔸', color: '#475569', glow: 'rgba(71,85,105,0.03)' };
}

// ─────────────────────────────────────────
// 🔍 ANA FONKSİYONLAR
// ─────────────────────────────────────────

/**
 * Top 5 ünvanını al (leaderboard sıralamasına göre)
 * @param position 1-5 arası sıralama pozisyonu
 * @param category Hangi leaderboard kategorisi
 * @returns PlayerTitle veya null (top 5'te değilse)
 */
export function getPlayerTitle(
  position: number,
  category: LeaderboardCategory
): PlayerTitle | null {
  if (position < 1 || position > 5) return null;

  switch (category) {
    case 'battle':
      return BATTLE_TITLES[position] || null;
    case 'harvest':
      return HARVEST_TITLES[position] || null;
    case 'general':
      return GENERAL_TITLES[position] || null;
    default:
      return null;
  }
}

/**
 * Bir kullanıcının EN PRESİJLİ ünvanını al
 * Birden fazla leaderboard'da top 5'teyse en yüksek olanı döndür
 * @param positions { general?: number, battle?: number, harvest?: number }
 * @returns En iyi ünvan + kategori bilgisi veya null
 */
export function getBestPlayerTitle(positions: {
  general?: number;
  battle?: number;
  harvest?: number;
}): (PlayerTitle & { category: LeaderboardCategory }) | null {
  let bestTitle: (PlayerTitle & { category: LeaderboardCategory }) | null = null;
  let bestPosition = Infinity;

  const categories: LeaderboardCategory[] = ['general', 'battle', 'harvest'];
  // General > Battle > Harvest öncelik sırası
  const priority: Record<LeaderboardCategory, number> = { general: 0, battle: 1, harvest: 2 };

  for (const cat of categories) {
    const pos = positions[cat];
    if (pos && pos >= 1 && pos <= 5) {
      const title = getPlayerTitle(pos, cat);
      if (title) {
        // Daha küçük pozisyon daha iyi, eşitlerse priority'ye göre seç
        if (
          pos < bestPosition ||
          (pos === bestPosition && priority[cat] < priority[bestTitle?.category || 'harvest'])
        ) {
          bestTitle = { ...title, category: cat };
          bestPosition = pos;
        }
      }
    }
  }

  return bestTitle;
}

/**
 * Tier'a göre border gradient renkleri
 */
export function getTitleBorderColors(tier: PlayerTitle['tier']): readonly [string, string] {
  switch (tier) {
    case 'legendary':
      return ['#FFD700', '#FFA500'] as const;
    case 'epic':
      return ['#A78BFA', '#7C3AED'] as const;
    case 'rare':
      return ['#60A5FA', '#3B82F6'] as const;
    case 'uncommon':
      return ['#34D399', '#10B981'] as const;
    case 'common':
    default:
      return ['#94A3B8', '#64748B'] as const;
  }
}

// ─────────────────────────────────────────
// 💡 BATTLE İPUÇLARI
// ─────────────────────────────────────────

export const BATTLE_TIPS: string[] = [
  '💡 Hızlı cevap vermek combo bonusu kazandırır!',
  '🎯 Doğru cevaplar art arda gelirse streak bonusu alırsın.',
  '⚡ İlk 3 saniyede cevap versen ekstra puan kazanırsın!',
  '🧠 Emin olmadığın soruları es geçme, hızla tahmin et.',
  '🔥 5+ combo serisinde puan çarpanı 2x olur!',
  '📚 Her gün pratik yapan oyuncular %40 daha başarılı.',
  '🌾 Çiftçilik ve savaş puanların genel sıralamayı etkiler.',
  '🏆 Top 5\'e girersen özel bir ünvan kazanırsın!',
  '💎 Kelime hazneni genişlet, savaşta avantajlı ol!',
  '⭐ Günlük görevleri tamamla, bonus puan kazan.',
  '🎮 Rakibinin zayıf olduğu kelimelere odaklan.',
  '🛡️ Doğru cevap serisi koruman, kaybetmen durumunda sıfırlanır.',
  '🗡️ Her savaş galibiyeti 50 genel puan kazandırır.',
  '🌟 Mareşal olmak için tüm leaderboard\'larda aktif ol!',
  '⚔️ Arkadaşlarını davet et, oda kodu ile savaş!',
];

/**
 * Rastgele bir battle ipucu al
 */
export function getRandomBattleTip(): string {
  return BATTLE_TIPS[Math.floor(Math.random() * BATTLE_TIPS.length)];
}
