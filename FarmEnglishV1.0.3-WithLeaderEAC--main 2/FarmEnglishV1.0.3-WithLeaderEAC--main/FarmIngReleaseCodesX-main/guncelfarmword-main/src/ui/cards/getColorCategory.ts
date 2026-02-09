/**
 * 🎯 getColorCategory - Web'deki renk seçim mantığını port eder
 * masterLevel + wrongCount + level kurallarına göre tema seçimi
 */

import { ColorSchemeKey } from './colorSchemes';

export interface WordColorInput {
  masterLevel?: number;
  wrongCount?: number;
  correctCount?: number;
  level?: string;
  consecutiveCorrect?: number;
  totalHarvests?: number;
}

export interface ColorCategoryResult {
  category: ColorSchemeKey;
  streakNeeded: number;
  isMaster: boolean;
  isReady: boolean;
  progress: number;
  streak: number;
}

/**
 * 🎨 Kelime durumuna göre renk kategorisi belirle
 * 
 * Kurallar:
 * - masterLevel: 3 → perfect (👑)
 * - masterLevel: 2 → ultra (💎)
 * - masterLevel: 1 → master (🏆)
 * - wrongCount >= 10 → red (🔴)
 * - wrongCount >= 5 → orange (🟠)
 * - wrongCount >= 1 → yellow (🟡)
 * - wrongCount === 0 → green (🟢)
 */
export function getColorCategory(word: WordColorInput): ColorCategoryResult {
  const masterLevel = word.masterLevel ?? 0;
  const wrongCount = word.wrongCount ?? 0;
  const streak = word.consecutiveCorrect ?? 0;
  
  let category: ColorSchemeKey;
  let streakNeeded: number;
  let isMaster = false;

  // Master kartlar (envanterden gelmiş ve masterLevel > 0)
  if (masterLevel === 3) {
    category = 'perfect';
    streakNeeded = 3;
    isMaster = true;
  } else if (masterLevel === 2) {
    category = 'ultra';
    streakNeeded = 3;
    isMaster = true;
  } else if (masterLevel === 1) {
    category = 'master';
    streakNeeded = 3;
    isMaster = true;
  }
  // Normal kartlar - 4 renk: Kırmızı → Turuncu → Sarı → Yeşil
  else if (wrongCount >= 10) {
    category = 'red';
    streakNeeded = 5;
  } else if (wrongCount >= 5) {
    category = 'orange';
    streakNeeded = 5;
  } else if (wrongCount >= 1) {
    category = 'yellow';
    streakNeeded = 5;
  } else {
    category = 'green';
    streakNeeded = 3;
  }

  const progress = Math.min((streak / streakNeeded) * 100, 100);
  const isReady = streak >= streakNeeded;

  return {
    category,
    streakNeeded,
    isMaster,
    isReady,
    progress,
    streak,
  };
}

/**
 * 🎯 needsConsecutive - Ardışık doğru gerekiyor mu?
 * wrongCount > 0 && consecutiveCorrect < 5 ise true
 */
export function needsConsecutive(word: WordColorInput): boolean {
  const wrongCount = word.wrongCount ?? 0;
  const consecutiveCorrect = word.consecutiveCorrect ?? 0;
  return wrongCount > 0 && consecutiveCorrect < 5;
}

/**
 * 🌾 getHarvestsNeeded - Hasat için gereken sayı
 * Sabit: 3
 */
export function getHarvestsNeeded(): number {
  return 3;
}

/**
 * ✅ isHarvestReady - Hasat edilebilir mi?
 * lastAnswerCorrect !== false AND !needsConsecutive
 */
export function isHarvestReady(
  word: WordColorInput & { lastAnswerCorrect?: boolean }
): boolean {
  const needsStreak = needsConsecutive(word);
  const lastCorrect = word.lastAnswerCorrect !== false;
  return lastCorrect && !needsStreak;
}

/**
 * 📊 getPerformanceRatio - Başarı yüzdesi
 * correct / (correct + wrong) * 100
 */
export function getPerformanceRatio(word: WordColorInput): number {
  const correct = word.correctCount ?? 0;
  const wrong = word.wrongCount ?? 0;
  const total = correct + wrong;
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

/**
 * 🎨 getRatioColor - Başarı yüzdesine göre renk
 */
export function getRatioColor(ratio: number): string {
  if (ratio >= 80) return '#22c55e'; // green-500
  if (ratio >= 60) return '#eab308'; // yellow-500
  if (ratio >= 40) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}
