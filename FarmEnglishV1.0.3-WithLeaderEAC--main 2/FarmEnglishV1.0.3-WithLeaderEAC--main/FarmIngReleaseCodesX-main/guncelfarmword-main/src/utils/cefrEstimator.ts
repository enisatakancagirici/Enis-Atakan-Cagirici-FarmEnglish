import type { WordModel } from '../models/types';

type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CEFR_WEIGHT: Record<CEFRLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toFinite = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCefr = (value: unknown): CEFRLevel => {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if ((CEFR_ORDER as string[]).includes(raw)) return raw as CEFRLevel;
  return 'A1';
};

const getBaseMasterBoost = (masterLevel: number): number => {
  if (masterLevel >= 3) return 0.28;
  if (masterLevel >= 2) return 0.22;
  if (masterLevel >= 1) return 0.14;
  return 0;
};

export interface CefrEstimate {
  level: CEFRLevel;
  score: number;
  confidence: number;
  knownWordCount: number;
  unknownWordCount: number;
  sampleSize: number;
  message: string;
}

export function estimateCefrLevel(
  words: WordModel[],
  sesyapHistory: Array<{ correct?: boolean }> = []
): CefrEstimate {
  const safeWords = Array.isArray(words) ? words.filter(Boolean) : [];

  const dedup = new Map<string, WordModel>();
  for (const word of safeWords) {
    const key = (word as any).originalWordId || word.id;
    if (!key) continue;
    if (!dedup.has(key)) dedup.set(key, word);
  }

  const uniqueWords = Array.from(dedup.values());
  if (uniqueWords.length === 0) {
    return {
      level: 'A1',
      score: 8,
      confidence: 10,
      knownWordCount: 0,
      unknownWordCount: 0,
      sampleSize: 0,
      message: 'Veri henuz az. Biraz quiz ve sesyap yaptikca tahmin netlesecek.',
    };
  }

  let weightedKnown = 0;
  let weightedTotal = 0;
  let totalAttempts = 0;
  let totalWrong = 0;
  let knownWordCount = 0;
  let unknownWordCount = 0;

  for (const word of uniqueWords) {
    const cefr = normalizeCefr(word.difficulty);
    const weight = CEFR_WEIGHT[cefr] / 6;

    const quizCorrect = toFinite(word.quizCorrect, 0);
    const quizWrong = toFinite(word.quizWrong, 0);
    const attempts = Math.max(0, quizCorrect + quizWrong);
    totalAttempts += attempts;
    totalWrong += quizWrong;

    const smoothedAccuracy = (quizCorrect + 1) / (attempts + 2);
    const masterBoost = getBaseMasterBoost(toFinite(word.masterLevel, 0));
    const harvestBoost = Math.min(0.15, toFinite(word.totalHarvests, 0) * 0.04);
    const greenBoost = toFinite(word.wrongCount, 0) >= 2 ? 0.08 : 0;

    const knownness = clamp(smoothedAccuracy * 0.62 + masterBoost + harvestBoost + greenBoost, 0.02, 0.99);

    weightedKnown += knownness * weight;
    weightedTotal += weight;

    if (knownness >= 0.62) {
      knownWordCount += 1;
    } else {
      unknownWordCount += 1;
    }
  }

  const lexicalMastery = weightedTotal > 0 ? weightedKnown / weightedTotal : 0;
  const coverage = clamp(uniqueWords.length / 160, 0, 1);

  const safeSpeech = Array.isArray(sesyapHistory) ? sesyapHistory : [];
  const speechSamples = safeSpeech.length;
  const speechCorrect = safeSpeech.filter(item => !!item?.correct).length;
  const speechAccuracy = speechSamples > 0 ? speechCorrect / speechSamples : 0.5;

  const consistency = totalAttempts > 0
    ? clamp(1 - totalWrong / Math.max(1, totalAttempts), 0, 1)
    : 0.6;

  const weightedScore = (
    lexicalMastery * 0.56 +
    coverage * 0.2 +
    speechAccuracy * 0.14 +
    consistency * 0.1
  ) * 100;

  const score = Math.round(clamp(weightedScore, 1, 99));

  let level: CEFRLevel = 'A1';
  if (score >= 82) level = 'C2';
  else if (score >= 70) level = 'C1';
  else if (score >= 56) level = 'B2';
  else if (score >= 42) level = 'B1';
  else if (score >= 27) level = 'A2';

  const sampleSize = uniqueWords.length + totalAttempts + speechSamples;
  const confidence = Math.round(clamp((sampleSize / 240) * 100, 12, 98));

  const message =
    confidence < 35
      ? `Tahmini seviye: ${level}. Veri arttikca tahmin hassasiyeti artacak.`
      : `Tahmini seviye: ${level}. Bilinen/bilinmeyen dagilimi ve performansina gore guncellendi.`;

  return {
    level,
    score,
    confidence,
    knownWordCount,
    unknownWordCount,
    sampleSize,
    message,
  };
}