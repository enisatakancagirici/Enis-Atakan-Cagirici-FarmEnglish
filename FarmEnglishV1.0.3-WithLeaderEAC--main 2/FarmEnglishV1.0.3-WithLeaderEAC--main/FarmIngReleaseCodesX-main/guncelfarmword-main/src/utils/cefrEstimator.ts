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
  knownThreshold: number;
  signals: {
    lexicalMasteryPct: number;
    quizAccuracyPct: number;
    speechAccuracyPct: number;
    puzzleMasteryPct: number;
    coveragePct: number;
    xpProgressPct: number;
  };
  weights: {
    lexicalPct: number;
    coveragePct: number;
    quizPct: number;
    speechPct: number;
    puzzlePct: number;
    consistencyPct: number;
    xpPct: number;
  };
}

export interface CefrEstimatorMetrics {
  quizAnswered?: number;
  quizCorrect?: number;
  quizWrong?: number;
  puzzleCompleted?: number;
  speechPracticeCount?: number;
  puzzleScore?: number;
  sesyapScore?: number;
  xp?: number;
}

export function estimateCefrLevel(
  words: WordModel[],
  sesyapHistory: Array<{ correct?: boolean }> = [],
  metrics?: CefrEstimatorMetrics
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
      knownThreshold: 62,
      signals: {
        lexicalMasteryPct: 0,
        quizAccuracyPct: 0,
        speechAccuracyPct: 0,
        puzzleMasteryPct: 0,
        coveragePct: 0,
        xpProgressPct: 0,
      },
      weights: {
        lexicalPct: 42,
        coveragePct: 13,
        quizPct: 16,
        speechPct: 11,
        puzzlePct: 9,
        consistencyPct: 6,
        xpPct: 3,
      },
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
  const speechAccuracy = speechSamples > 0 ? speechCorrect / speechSamples : 0.55;

  const safeMetrics = metrics || {};
  const quizAnswered = Math.max(0, toFinite(safeMetrics.quizAnswered, totalAttempts));
  const quizCorrect = Math.max(0, toFinite(safeMetrics.quizCorrect, totalAttempts - totalWrong));
  const quizWrong = Math.max(0, toFinite(safeMetrics.quizWrong, totalWrong));
  const puzzleCompleted = Math.max(0, toFinite(safeMetrics.puzzleCompleted, 0));
  const speechPracticeCount = Math.max(0, toFinite(safeMetrics.speechPracticeCount, speechSamples));
  const puzzleScore = Math.max(0, toFinite(safeMetrics.puzzleScore, 0));
  const sesyapScore = Math.max(0, toFinite(safeMetrics.sesyapScore, 0));
  const totalXp = Math.max(0, toFinite(safeMetrics.xp, 0));

  const consistency = totalAttempts > 0
    ? clamp(1 - totalWrong / Math.max(1, totalAttempts), 0, 1)
    : 0.6;

  const quizMastery = quizAnswered > 0
    ? clamp((quizCorrect + 1) / (quizAnswered + 2), 0, 1)
    : consistency;
  const puzzleMastery = clamp(
    puzzleScore / Math.max(1, puzzleCompleted * 120 + 600),
    0,
    1
  );
  const speechSkill = clamp(
    speechAccuracy * 0.8 + Math.min(1, sesyapScore / 5000) * 0.2,
    0,
    1
  );
  const xpMastery = clamp(Math.log10(totalXp + 10) / 5, 0, 1);

  const baseWeights = {
    lexical: 0.42,
    coverage: 0.13,
    quiz: 0.16,
    speech: 0.11,
    puzzle: 0.09,
    consistency: 0.06,
    xp: 0.03,
  };

  const reliability = {
    lexical: clamp(uniqueWords.length / 45, 0.45, 1),
    coverage: clamp(uniqueWords.length / 120, 0.3, 1),
    quiz: clamp(quizAnswered / 120, 0.3, 1),
    speech: clamp((speechSamples + speechPracticeCount) / 50, 0.25, 1),
    puzzle: clamp(puzzleCompleted / 60, 0.25, 1),
    consistency: clamp(totalAttempts / 80, 0.3, 1),
    xp: clamp(Math.log10(totalXp + 10) / 3, 0.25, 1),
  };

  const effectiveWeights = {
    lexical: baseWeights.lexical * reliability.lexical,
    coverage: baseWeights.coverage * reliability.coverage,
    quiz: baseWeights.quiz * reliability.quiz,
    speech: baseWeights.speech * reliability.speech,
    puzzle: baseWeights.puzzle * reliability.puzzle,
    consistency: baseWeights.consistency * reliability.consistency,
    xp: baseWeights.xp * reliability.xp,
  };

  const totalEffectiveWeight = Math.max(
    0.0001,
    effectiveWeights.lexical +
      effectiveWeights.coverage +
      effectiveWeights.quiz +
      effectiveWeights.speech +
      effectiveWeights.puzzle +
      effectiveWeights.consistency +
      effectiveWeights.xp
  );

  const normalizedWeights = {
    lexical: effectiveWeights.lexical / totalEffectiveWeight,
    coverage: effectiveWeights.coverage / totalEffectiveWeight,
    quiz: effectiveWeights.quiz / totalEffectiveWeight,
    speech: effectiveWeights.speech / totalEffectiveWeight,
    puzzle: effectiveWeights.puzzle / totalEffectiveWeight,
    consistency: effectiveWeights.consistency / totalEffectiveWeight,
    xp: effectiveWeights.xp / totalEffectiveWeight,
  };

  const weightedScore = (
    lexicalMastery * normalizedWeights.lexical +
    coverage * normalizedWeights.coverage +
    quizMastery * normalizedWeights.quiz +
    speechSkill * normalizedWeights.speech +
    puzzleMastery * normalizedWeights.puzzle +
    consistency * normalizedWeights.consistency +
    xpMastery * normalizedWeights.xp
  ) * 100;

  const score = Math.round(clamp(weightedScore, 1, 99));

  let level: CEFRLevel = 'A1';
  if (score >= 82) level = 'C2';
  else if (score >= 70) level = 'C1';
  else if (score >= 56) level = 'B2';
  else if (score >= 42) level = 'B1';
  else if (score >= 27) level = 'A2';

  const sampleSize = uniqueWords.length + totalAttempts + speechSamples + puzzleCompleted + speechPracticeCount;
  const confidence = Math.round(clamp((sampleSize / 260) * 100, 12, 99));

  const message =
    confidence < 35
      ? `Tahmini seviye: ${level}. Veri arttıkça tahmin hassasiyeti artacak.`
      : `Tahmini seviye: ${level}. Hesap; kelime ustalığı, quiz doğruluğu, sesyap performansı, yapboz ustalığı, kapsama, tutarlılık ve XP ivmesinin ağırlıklı toplamıdır.`;

  return {
    level,
    score,
    confidence,
    knownWordCount,
    unknownWordCount,
    sampleSize,
    message,
    knownThreshold: 62,
    signals: {
      lexicalMasteryPct: Math.round(lexicalMastery * 100),
      quizAccuracyPct: Math.round(quizMastery * 100),
      speechAccuracyPct: Math.round(speechSkill * 100),
      puzzleMasteryPct: Math.round(puzzleMastery * 100),
      coveragePct: Math.round(coverage * 100),
      xpProgressPct: Math.round(xpMastery * 100),
    },
    weights: {
      lexicalPct: Math.round(normalizedWeights.lexical * 100),
      coveragePct: Math.round(normalizedWeights.coverage * 100),
      quizPct: Math.round(normalizedWeights.quiz * 100),
      speechPct: Math.round(normalizedWeights.speech * 100),
      puzzlePct: Math.round(normalizedWeights.puzzle * 100),
      consistencyPct: Math.round(normalizedWeights.consistency * 100),
      xpPct: Math.round(normalizedWeights.xp * 100),
    },
  };
}
