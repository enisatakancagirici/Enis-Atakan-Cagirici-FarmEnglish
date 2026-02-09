/**
 * 🍎 MEYVE SİSTEMİ - CEFR Seviyesine Göre Meyve Eşlemesi
 * 
 * CEFR → Meyve Eşlemesi:
 * - A1 → Muz (banana)
 * - A2 → Kiraz (cherry)
 * - B1 → Çilek (strawberry)
 * - B2 → Üzüm (grape)
 * - C1 → Elma (apple)
 * - C2 → Karpuz (watermelon) - Sadece Phrasal Verbs
 * 
 * Her meyve 4 tier görsele sahip:
 * - Tier 1 (Yeşil/Green): muz1.png - Yeşile ulaşan kartlar
 * - Tier 2 (Master): muz2.png - Master seviye
 * - Tier 3 (Ultra): muz3.png - Ultra Master
 * - Tier 4 (Perfect/Kraliyet): muz4.png - Perfect Master
 */

export type FruitType = 'banana' | 'cherry' | 'strawberry' | 'grape' | 'apple' | 'watermelon';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// 🍌 CEFR → Meyve Eşlemesi
export const CEFR_TO_FRUIT: Record<CEFRLevel, FruitType> = {
  'A1': 'banana',
  'A2': 'cherry',
  'B1': 'strawberry',
  'B2': 'grape',
  'C1': 'apple',
  'C2': 'watermelon', // Sadece phrasal verbs için
};

// 🎨 Meyve Renkleri (UI için)
export const FRUIT_COLORS: Record<FruitType, { primary: string; secondary: string; glow: string }> = {
  banana: { primary: '#FFE135', secondary: '#FFF59D', glow: 'rgba(255, 225, 53, 0.4)' },
  cherry: { primary: '#DC143C', secondary: '#FF6B6B', glow: 'rgba(220, 20, 60, 0.4)' },
  strawberry: { primary: '#FF4757', secondary: '#FF6B81', glow: 'rgba(255, 71, 87, 0.4)' },
  grape: { primary: '#8E44AD', secondary: '#A569BD', glow: 'rgba(142, 68, 173, 0.4)' },
  apple: { primary: '#27AE60', secondary: '#58D68D', glow: 'rgba(39, 174, 96, 0.4)' },
  watermelon: { primary: '#E74C3C', secondary: '#2ECC71', glow: 'rgba(231, 76, 60, 0.4)' },
};

// 🏆 Tier Ödülleri - DOĞRU DEĞERLER
export const TIER_REWARDS = {
  // Tier 1: Yeşil → Master Card (ilk hasat) - 150 coin, 300 xp
  1: { coins: 150, xp: 300 },
  // Tier 2: Master → Ultra Master - 300 coin, 500 xp
  2: { coins: 300, xp: 500 },
  // Tier 3: Ultra → Perfect Master - 500 coin, 800 xp
  3: { coins: 500, xp: 800 },
  // Tier 4: Perfect Master hasat (tek seferlik ödül) - 700 coin, 1000 xp
  4: { coins: 700, xp: 1000 },
};

// 🌱 Session Gereksinimleri (Her tier için kaç session gerekli)
// Kırmızı → Sarı: 1 session (3 doğru)
// Sarı → Yeşil: 2 session (3 doğru x 2 = 6 doğru cevap)
// Yeşil ve üzeri: 3 doğru = 1 session
export const TIER_SESSION_REQUIREMENTS: Record<number, number> = {
  // Yeşil → Master: 3 session (3 doğru x 3 = 9 doğru cevap)
  0: 3,
  // Master → Ultra Master: 4 session (3 doğru x 4 = 12 doğru cevap)
  1: 4,
  // Ultra Master → Perfect: 5 session (3 doğru x 5 = 15 doğru cevap)
  2: 5,
  // Perfect/Kraliyet: 6 SESSION! (ilk ödül için)
  // Ödül alındıktan sonra tekrar ekilirse 1 session olacak
  3: 6,
};

// 🍎 CEFR seviyesine göre meyve türü belirle
export function getFruitType(difficulty: CEFRLevel | string | number | undefined, isPhrasalVerb: boolean = false): FruitType {
  if (!difficulty) return 'banana';
  const key = typeof difficulty === 'string' ? difficulty.toUpperCase() : '';
  if (key && (key as CEFRLevel) in CEFR_TO_FRUIT) {
    return CEFR_TO_FRUIT[key as CEFRLevel];
  }
  return 'banana';
}

// 🖼️ Meyve görsel yolunu al - OPTİMİZE WEBP DOSYALARI
// Tüm görseller assets/images/maskot/ klasöründe, düşük KB webp formatında
// Tier 1 = Yeşil kart, Tier 2 = Master, Tier 3 = Ultra, Tier 4 = Perfect
const FRUIT_IMAGES: Record<FruitType, Record<number, any>> = {
  banana: {
    1: require('../../assets/images/maskot/muz1.webp'),
    2: require('../../assets/images/maskot/muz2.webp'),
    3: require('../../assets/images/maskot/muz3.webp'),
    4: require('../../assets/images/maskot/muz4.webp'),
  },
  cherry: {
    1: require('../../assets/images/maskot/kiraz1.webp'),
    2: require('../../assets/images/maskot/kiraz2.webp'),
    3: require('../../assets/images/maskot/kiraz3.webp'),
    4: require('../../assets/images/maskot/kiraz4.webp'),
  },
  strawberry: {
    1: require('../../assets/images/maskot/cilek1.webp'),
    2: require('../../assets/images/maskot/cilek2.webp'),
    3: require('../../assets/images/maskot/cilek3.webp'),
    4: require('../../assets/images/maskot/cilek4.webp'),
  },
  grape: {
    1: require('../../assets/images/maskot/uzum1.webp'),
    2: require('../../assets/images/maskot/uzum2.webp'),
    3: require('../../assets/images/maskot/uzum3.webp'),
    4: require('../../assets/images/maskot/uzum4.webp'),
  },
  apple: {
    1: require('../../assets/images/maskot/elma1.webp'),
    2: require('../../assets/images/maskot/elma2.webp'),
    3: require('../../assets/images/maskot/elma3.webp'),
    4: require('../../assets/images/maskot/elma4.webp'),
  },
  watermelon: {
    1: require('../../assets/images/maskot/karpuz1.webp'),
    2: require('../../assets/images/maskot/karpuz2.webp'),
    3: require('../../assets/images/maskot/karpuz3.webp'),
    4: require('../../assets/images/maskot/karpuz4.webp'),
  },
};

export function getFruitImageSource(fruitType: FruitType | string | undefined, tier: number): any {
  const safeFruit = (fruitType && (fruitType as FruitType) in FRUIT_IMAGES) ? (fruitType as FruitType) : 'banana';
  const tierNumber = Math.min(Math.max(tier, 1), 4); // 1-4 aras?? s??n??rla
  return FRUIT_IMAGES[safeFruit][tierNumber];
}

// 🖼️ Tüm meyve görsellerinin listesi - Prefetch için
export function getAllFruitImages(): any[] {
  const images: any[] = [];
  for (const fruitType of Object.keys(FRUIT_IMAGES) as FruitType[]) {
    for (const tier of [1, 2, 3]) {
      images.push(FRUIT_IMAGES[fruitType][tier]);
    }
  }
  return images;
}

// 🌱 Meyve büyüme aşamasını hesapla (session bazlı)
// Tier'a göre farklı session gereksinimleri var:
// - Yeşil → Master: 3 session
// - Master → Ultra: 5 session  
// - Ultra → Perfect: 8 session
export function calculateFruitGrowthStage(sessionsCompleted: number, requiredSessions: number): number {
  if (requiredSessions === Infinity) return 3; // Perfect tier - her zaman max
  
  // Yüzdelik ilerlemeye göre 0-3 arası stage
  // 0%  = stage 0 (tomurcuk)
  // 33% = stage 1 (küçük meyve)
  // 66% = stage 2 (büyüyen meyve)
  // 100% = stage 3 (olgun - hasat hazır)
  const progress = sessionsCompleted / requiredSessions;
  
  if (progress >= 1) return 3;
  if (progress >= 0.66) return 2;
  if (progress >= 0.33) return 1;
  return 0;
}

// 🍎 Meyve boyutunu hesapla (growth stage'e göre)
export function getFruitSize(growthStage: number, baseSize: number = 60): number {
  // Stage 0: %60 boyut (küçük)
  // Stage 1: %80 boyut (orta)
  // Stage 2: %100 boyut (büyük)
  // Stage 3: %120 boyut (max - hasat hazır, glow efekti ile)
  const sizeMultipliers = [0.6, 0.8, 1.0, 1.2];
  const multiplier = sizeMultipliers[Math.min(growthStage, 3)];
  return Math.round(baseSize * multiplier);
}

// 🌟 Hasat hazır mı?
export function isReadyToHarvest(sessionsCompleted: number, requiredSessions: number): boolean {
  if (requiredSessions === Infinity) return false; // Perfect tier - hasat yok
  return sessionsCompleted >= requiredSessions;
}

// 💰 Tier'a göre ödül al (Perfect bonus için tier 4 de desteklenir)
export function getTierReward(tier: number): { coins: number; xp: number } {
  const validTier = Math.min(Math.max(tier, 1), 4) as 1 | 2 | 3 | 4;
  return TIER_REWARDS[validTier];
}

// 🎯 Bir sonraki tier'ı al
export function getNextTier(currentTier: number): number | null {
  if (currentTier >= 3) return null; // Max tier
  return currentTier + 1;
}

// 📊 İlerleme yüzdesini hesapla
export function calculateProgress(sessionsCompleted: number, requiredSessions: number): number {
  if (requiredSessions === Infinity) return 100; // Perfect - her zaman 100%
  return Math.min((sessionsCompleted / requiredSessions) * 100, 100);
}

// 🏷️ Tier ismini al (Türkçe)
export function getTierName(tier: number): string {
  const names: Record<number, string> = {
    0: 'Normal',
    1: 'Master',
    2: 'Ultra Master',
    3: 'Kraliyet',
  };
  return names[tier] || 'Normal';
}

// 🍎 Meyve ismini al (Türkçe)
export function getFruitName(fruitType: FruitType): string {
  const names: Record<FruitType, string> = {
    banana: 'Muz',
    cherry: 'Kiraz',
    strawberry: 'Çilek',
    grape: 'Üzüm',
    apple: 'Elma',
    watermelon: 'Karpuz',
  };
  return names[fruitType];
}

// 🎨 Meyve emoji'si
export function getFruitEmoji(fruitType: FruitType): string {
  const emojis: Record<FruitType, string> = {
    banana: '🍌',
    cherry: '🍒',
    strawberry: '🍓',
    grape: '🍇',
    apple: '🍎',
    watermelon: '🍉',
  };
  return emojis[fruitType];
}
