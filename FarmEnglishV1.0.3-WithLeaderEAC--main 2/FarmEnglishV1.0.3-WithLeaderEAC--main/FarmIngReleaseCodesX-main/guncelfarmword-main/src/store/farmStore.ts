import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CardCustomization, CardFontStyle, CardBorderStyle } from '../data/cardThemes';
import { DEFAULT_CUSTOMIZATION, getThemeOverlay, checkCollectibleUnlock, COLLECTIBLE_CARDS, CARD_THEME_OVERLAYS } from '../data/cardThemes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  WordModel, Achievement, StoreItem, ActiveBoost, PhrasalVerb,
  DailyQuest, WeeklyQuest, RepeatableQuest, StoryQuest, AchievementQuest, MasteryPath,
  QuestType
} from '../models/types';
import { applyHintBonus, getPhrasalDiscountFactor } from '../utils/storePerks';
import { getFruitType, getTierReward, TIER_SESSION_REQUIREMENTS, calculateFruitGrowthStage, type FruitType } from '../utils/fruitSystem';
import { isNicknameClean } from '../utils/nicknameModeration';
import { traceEvent } from '../utils/debugTrace';
import { normalizeDisplayText } from '../utils/textNormalization';
import { updateUserStats as firebaseUpdateUserStats, db as firebaseDb } from '../utils/firebaseBattle';
import { doc as firestoreDoc, updateDoc as firestoreUpdateDoc } from 'firebase/firestore';

// Re-entry guard for harvestWord double-swipe protection
const _harvestInFlight = new Set<string>();
const _puzzleHarvestInFlight = new Set<string>();
const _claimQuestInFlight = new Set<string>();
const _plantInFlight = new Set<string>();
let _lastQuestClaimAt = 0;

// Prevent duplicate daily quest resets from multiple screens/focus effects firing together
let dailyQuestResetInFlight = false;
let lastQuestCheckTime = 0; // Debounce: at most every 30s
let questInitInFlight = false; // Guard for initializeAllQuests re-entry
let dailyQuestGenerationInFlight = false;
let lastDailyQuestGenerationAt = 0;
type QuestProgressMode = 'add' | 'max';
const QUEST_PROGRESS_FLUSH_MS = 180;
const _questProgressQueue = new Map<QuestType, { amount: number; mode: QuestProgressMode }>();
let _questProgressFlushTimer: ReturnType<typeof setTimeout> | null = null;

// 🔄 Cached Firebase updateUserStats — dynamic import her hasat'ta yapılmasın
let _cachedUpdateUserStats: ((odId: string, updates: any) => Promise<void>) | null = firebaseUpdateUserStats;
// 🔄 Cached Firebase db + firestore refs — nickname güncellemesi için
let _cachedDb: any = firebaseDb;
let _cachedFirestoreFns: { doc: any; updateDoc: any } | null = {
  doc: firestoreDoc,
  updateDoc: firestoreUpdateDoc,
};
// Firebase refs are statically imported to avoid dynamic bundle churn on harvest.
const VALID_CARD_THEME_IDS = new Set(CARD_THEME_OVERLAYS.map((theme) => theme.id));

function sanitizeOwnedCardThemes(input: unknown): string[] {
  const safe = toSafeArray<string>(input);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const themeId of safe) {
    if (!VALID_CARD_THEME_IDS.has(themeId)) continue;
    if (seen.has(themeId)) continue;
    seen.add(themeId);
    out.push(themeId);
  }
  return out;
}

function sanitizeActiveCardTheme(input: unknown, ownedThemes: string[]): string {
  const safeTheme = typeof input === 'string' ? input : 'default';
  if (safeTheme === 'default') return 'default';
  return ownedThemes.includes(safeTheme) && VALID_CARD_THEME_IDS.has(safeTheme) ? safeTheme : 'default';
}

/** Firebase modülünü bir kez import edip cache'le — tüm dynamic import'ları ortadan kaldırır */
function ensureFirebaseCache(): Promise<void> {
  if (!_cachedUpdateUserStats) _cachedUpdateUserStats = firebaseUpdateUserStats;
  if (!_cachedDb) _cachedDb = firebaseDb;
  if (!_cachedFirestoreFns) {
    _cachedFirestoreFns = {
      doc: firestoreDoc,
      updateDoc: firestoreUpdateDoc,
    };
  }
  return Promise.resolve();
}

/** Cached updateUserStats — null-safe fire-and-forget */
function safeSyncFirebase(odId: string, updates: any) {
  try {
    const safeOdId = typeof odId === 'string' ? odId.trim() : '';
    if (!safeOdId || !updates || typeof updates !== 'object') return;

    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'number' && !Number.isFinite(value)) return false;
        return true;
      })
    );
    if (Object.keys(sanitizedUpdates).length === 0) return;

    if (_cachedUpdateUserStats) {
      _cachedUpdateUserStats(safeOdId, sanitizedUpdates).catch(() => {});
    } else {
      ensureFirebaseCache().then(() => {
        _cachedUpdateUserStats?.(safeOdId, sanitizedUpdates)?.catch(() => {});
      });
    }
  } catch (e) {}
}

// 🛡️ Cached RewardToast reference + queue to avoid lost toasts under heavy burst
let _cachedShowRewardToast: ((type: string, value: number, message?: string) => void) | null = null;
let _toastImportPromise: Promise<void> | null = null;
const _pendingRewardToasts: Array<{ type: string; value: number; message?: string }> = [];
let _lastToastImportAttemptAt = 0;
const MAX_PENDING_REWARD_TOASTS = 18;

function flushPendingRewardToasts() {
  if (!_cachedShowRewardToast || _pendingRewardToasts.length === 0) return;
  const queue = _pendingRewardToasts.splice(0, _pendingRewardToasts.length);
  for (const pending of queue) {
    try {
      _cachedShowRewardToast(pending.type, pending.value, pending.message);
    } catch (e) {}
  }
}

function ensureRewardToastLoaded() {
  if (_cachedShowRewardToast || _toastImportPromise) return;
  const now = Date.now();
  if (now - _lastToastImportAttemptAt < 1500) return;
  _lastToastImportAttemptAt = now;
  _toastImportPromise = import('../components/RewardToast')
    .then(({ showRewardToast }) => {
      _cachedShowRewardToast = showRewardToast as any;
      flushPendingRewardToasts();
    })
    .catch(() => {})
    .finally(() => {
      _toastImportPromise = null;
    });
}

function safeShowRewardToast(type: any, value: number, message?: string) {
  try {
    const safeType = typeof type === 'string' && type.trim().length > 0 ? type : 'quest';
    const safeValue = toSafePositiveInt(value);
    const safeMessage = typeof message === 'string' && message.trim().length > 0 ? message.trim() : undefined;

    if (_cachedShowRewardToast) {
      _cachedShowRewardToast(safeType, safeValue, safeMessage);
      return;
    }

    if (_pendingRewardToasts.length >= MAX_PENDING_REWARD_TOASTS) {
      _pendingRewardToasts.shift();
    }
    _pendingRewardToasts.push({ type: safeType, value: safeValue, message: safeMessage });
    ensureRewardToastLoaded();
  } catch (e) {
    // Complete silent fail
  }
}

function toSafeNumber(value: unknown, fallback: number = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSafePositiveInt(value: unknown): number {
  return Math.max(0, Math.floor(toSafeNumber(value, 0)));
}

function toSafeLowerText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function toSafeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function toSafeObjectArray<T = any>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => !!item && typeof item === 'object') as T[];
}

function normalizeUiText(value: unknown, fallback = ''): string {
  const normalized = normalizeDisplayText(value);
  return normalized || fallback;
}
const BROKEN_ICON_PATTERN = /[A-Za-z-]/;
const QUEST_TYPE_ICON_MAP: Partial<Record<QuestType, string>> = {
  PLANT_WORDS: '🌱',
  HARVEST_WORDS: '🌾',
  HARVEST_PHRASAL: '📚',
  COMPLETE_PUZZLE: '🧩',
  SPEECH_PRACTICE: '🎤',
  COMPLETE_QUIZ: '📝',
  WIN_BATTLE: '⚔️',
  REACH_COMBO: '🔥',
  EARN_COINS: '💰',
};
function normalizeQuestIcon(value: unknown, type?: QuestType): string {
  const normalized = normalizeUiText(value, '');
  const isLikelyBroken = !normalized || BROKEN_ICON_PATTERN.test(normalized) || normalized.length > 5;
  if (!isLikelyBroken) return normalized;
  if (type && QUEST_TYPE_ICON_MAP[type]) return QUEST_TYPE_ICON_MAP[type] as string;
  return '🎯';
}

function normalizeGuidedMatchKey(value: unknown): string {
  return normalizeDisplayText(value).trim().toLowerCase();
}

function isGuidedTargetMatch(
  targetWordId?: string,
  targetWordText?: string,
  wordId?: string,
  wordText?: string
): boolean {
  const safeTargetId = typeof targetWordId === 'string' ? targetWordId.trim() : '';
  const safeWordId = typeof wordId === 'string' ? wordId.trim() : '';
  if (safeTargetId && safeWordId && safeTargetId === safeWordId) return true;

  const targetTextKey = normalizeGuidedMatchKey(targetWordText);
  const wordTextKey = normalizeGuidedMatchKey(wordText);
  return !!targetTextKey && !!wordTextKey && targetTextKey === wordTextKey;
}

function queueQuestProgressInternal(type: QuestType, amount: number, mode: QuestProgressMode) {
  const safeAmount = toSafeNumber(amount, 0);
  if (safeAmount <= 0) return;

  const current = _questProgressQueue.get(type);
  if (!current) {
    _questProgressQueue.set(type, { amount: safeAmount, mode });
    return;
  }

  if (mode === 'max' || current.mode === 'max') {
    _questProgressQueue.set(type, {
      amount: Math.max(current.amount, safeAmount),
      mode: 'max',
    });
    return;
  }

  _questProgressQueue.set(type, {
    amount: current.amount + safeAmount,
    mode: 'add',
  });
}

function flushQuestProgressQueue(getFn: () => FarmStore) {
  if (_questProgressQueue.size === 0) return;
  const entries = Array.from(_questProgressQueue.entries());
  _questProgressQueue.clear();

  for (const [type, payload] of entries) {
    try {
      getFn().updateQuestProgress(type, payload.amount, payload.mode);
    } catch (error) {}
  }
}

function scheduleQuestProgressFlush(getFn: () => FarmStore) {
  if (_questProgressFlushTimer) return;
  _questProgressFlushTimer = setTimeout(() => {
    _questProgressFlushTimer = null;
    flushQuestProgressQueue(getFn);
  }, QUEST_PROGRESS_FLUSH_MS);
}

function sanitizeQuestRecord<T extends Record<string, any>>(quest: T): T {
  if (!quest || typeof quest !== 'object') return quest;
  const next: any = { ...quest };
  if ('title' in next) next.title = normalizeUiText(next.title, 'Görev');
  if ('description' in next) next.description = normalizeUiText(next.description, '');
  if ('icon' in next) next.icon = normalizeQuestIcon(next.icon, next.type as QuestType | undefined);
  if ('hint' in next) next.hint = normalizeUiText(next.hint, '');
  if ('tutorialText' in next) next.tutorialText = normalizeUiText(next.tutorialText, '');
  if ('unlockRequirement' in next) next.unlockRequirement = normalizeUiText(next.unlockRequirement, '');
  return next as T;
}

function sanitizeQuestCollection<T extends Record<string, any>>(value: unknown): T[] {
  return toSafeObjectArray<T>(value).map((quest) => sanitizeQuestRecord(quest));
}

function sanitizeMasteryPathCollection(value: unknown): MasteryPath[] {
  return toSafeObjectArray<MasteryPath>(value).map((path) => ({
    ...path,
    name: normalizeUiText((path as any)?.name, ''),
    icon: normalizeUiText((path as any)?.icon, ''),
    description: normalizeUiText((path as any)?.description, ''),
    levels: toSafeObjectArray<any>((path as any)?.levels).map((level) => ({
      ...level,
    })),
  }));
}

function toSafeWordArray(value: unknown): WordModel[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WordModel => (
    !!item &&
    typeof item === 'object' &&
    typeof (item as any).id === 'string'
  ));
}

function sanitizePersistedUser(user: unknown): { odId: string; email?: string | null; nickname: string; avatarUrl?: string | null } | null {
  if (!user || typeof user !== 'object') return null;
  const safeOdId = typeof (user as any).odId === 'string' ? (user as any).odId.trim() : '';
  if (!safeOdId) return null;

  const safeNickname = typeof (user as any).nickname === 'string' && (user as any).nickname.trim().length > 0
    ? (user as any).nickname.trim()
    : 'Oyuncu';

  return {
    odId: safeOdId,
    email: typeof (user as any).email === 'string' || (user as any).email === null ? (user as any).email : null,
    nickname: safeNickname,
    avatarUrl: typeof (user as any).avatarUrl === 'string' || (user as any).avatarUrl === null ? (user as any).avatarUrl : null,
  };
}

// 🛡️ Achievement/mastery check debounce
let _achievementCheckTimer: any = null;
let _questRewardSyncTimer: any = null;

// 🛡️ checkAchievements debounce — birden fazla yerden çağrılır, 800ms birleştir
let _checkAchievementsDebounceTimer: any = null;
function debouncedCheckAchievements(getFn: () => any) {
  if (_checkAchievementsDebounceTimer) clearTimeout(_checkAchievementsDebounceTimer);
  _checkAchievementsDebounceTimer = setTimeout(() => {
    _checkAchievementsDebounceTimer = null;
    try { getFn().checkAchievements(); } catch (e) {}
  }, 800);
}

// 🎓 TUTORIAL STEPS - Kapsamlı interaktif rehber (20 adım)
export type TutorialStep =
  | 'NOT_STARTED'           // Henüz başlamadı
  | 'STEP_1_WELCOME'        // Açılış: "Çiftçi sensin"
  | 'STEP_2_NO_SEED'        // Tohum yok, Quiz'e zorla
  | 'STEP_3_FIRST_QUIZ'     // İlk Quiz (ilk yanlış bekle)
  | 'STEP_4_HOME_UNLOCK'    // Ana Sayfa açılır
  | 'STEP_5_FARM_ONLY'      // Sadece Çiftlik aktif
  | 'STEP_6_FARM_INTRO'     // Tarla tanıtımı, kırmızı kart
  | 'STEP_7_MINI_QUIZ'      // MiniQuiz modal açıklaması
  | 'STEP_8_CARD_PROGRESS'  // Kart üstü 0/x
  | 'STEP_9_SWIPE'          // Kaydırarak çalış
  | 'STEP_10_TO_GREEN'      // Yeşil'e kadar ilerletme
  | 'STEP_11_HARVEST'       // İlk hasat: Master → Envanter
  | 'STEP_12_INVENTORY'     // Envanter tanıtımı
  | 'STEP_13_SELECT_CARD'   // Envanterde kart seçtir (vurgulu)
  | 'STEP_14_REPLANT'       // Kartı tarlaya geri gönder
  | 'STEP_15_MASTER_GRIND'  // Tarlaya gitti bildirimi
  | 'STEP_16_ULTRA_REACHED' // Çiftlik açıklaması
  | 'STEP_17_PERFECT_GRIND' // Ana sayfa + sistem özeti
  | 'STEP_18_PERFECT_DONE'  // Final quiz bekle
  | 'STEP_19_FINAL_QUIZ'    // Final quiz sonuç (doğru)
  | 'STEP_19_FINAL_QUIZ_WRONG' // Final quiz sonuç (yanlış)
  | 'STEP_20_CELEBRATION'   // Tutorial tamamlandı kutlaması
  | 'COMPLETED';            // Tutorial tamamlandı

export type GuidedModeStep =
  | 'QUIZ_UNTIL_WRONG'
  | 'FARM_MASTER_TARGET'
  | 'PUZZLE_PRACTICE'
  | 'SESYAP_PRACTICE'
  | 'COMPLETED';

export type TransferEvent = {
  id: string;
  type: 'harvest' | 'plant';
  wordId: string;
  wordText: string;
  from: 'farm' | 'inventory' | 'phrasalVerbFarm' | 'phrasalVerbInventory';
  to: 'farm' | 'inventory' | 'phrasalVerbFarm' | 'phrasalVerbInventory';
  timestamp: number;
  // 💰 Hasat ödülleri
  coins?: number;
  xp?: number;
};

interface FarmStore {
  // State
  pool: WordModel[];
  farm: WordModel[];
  inventory: WordModel[];
  quizActive: boolean;
  quizWords: WordModel[];
  miniQuizFor?: string;
  feedVisible: boolean; // Feed açıkken swipe block
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  currentCombo: number; // 🗑️ DEPRECATED: Kullanılmıyor, backward compat için
  currentQuizCombo: number; // Quiz combo (Regular Quiz)
  currentPhrasalCombo: number; // Phrasal Verb Quiz combo
  totalQuizzes: number;
  totalCorrect: number;
  totalWrong: number;
  achievements: Achievement[];
  lastPlayedDate?: string;
  dailyGoal: number;
  dailyProgress: number;
  coins: number;
  lifetimeCoins: number;
  hintTokens: number;
  comboShields: number;
  activeBoosts: ActiveBoost[];
  ownedItems: string[];

  // 🔥 GÜNLÜK GİRİŞ SERİSİ (TAKVİM GÜNÜ BAZLI - 00:00'da yenilenir)
  dailyStreak: number; // Kaç gündür üst üste giriş yapılıyor
  lastStreakCheckDate?: string; // Son kontrol tarihi (YYYY-MM-DD) - bugün zaten kontrol edildiyse tekrar yapma

  // 🧩 YAPBOZ & 🎤 SESYAP SKORLARI
  puzzleScore: number; // Toplam yapboz puanı
  sesyapScore: number; // Toplam sesyap puanı

  // 🎤 SESYAP TARLA GEÇMİŞİ
  sesyapHistory: Array<{
    word: string;
    meaning_tr: string;
    example_en: string;
    example_tr: string;
    correct: boolean;
    timestamp: number;
  }>;

  // 🎯 KAPSAMLI GÖREV SİSTEMİ
  dailyQuests: DailyQuest[]; // Günlük görevler
  weeklyQuests: WeeklyQuest[]; // Haftalık görevler
  repeatableQuests: RepeatableQuest[]; // Tekrarlanabilir görevler (3 slot)
  storyQuests: StoryQuest[]; // Hikaye görevleri
  achievementQuests: AchievementQuest[]; // Başarım görevleri
  masteryPaths: MasteryPath[]; // Ustalık yolları

  // 🏆 Görev İstatistikleri
  trophies: number; // Toplam kupa
  totalQuestsCompleted: number; // Toplam tamamlanan görev
  dailyQuestStreak: number; // Günlük görev serisi

  // 📊 Lifetime Stats (Achievement tracking için)
  lifetimePlantedWords: number;
  lifetimeSpeechPractice: number;
  lifetimePuzzlesCompleted: number;
  lifetimePhrasalHarvested: number;
  lifetimeQuizAnswered: number;
  lifetimeBattlesWon: number;
  maxComboEver: number;

  // 🎨 KART TEMA SİSTEMİ
  ownedCardThemes: string[];       // Satın alınan tema id'leri
  activeCardTheme: string;          // Aktif tema ('default' = yok)
  cardCustomization: CardCustomization;
  collectedCards: string[];          // Kazanılan koleksiyon kartları

  // 🌱 KENDİ KELİME KARTI — Normal tarlaya eklenir
  addCustomWord: (word: { text: string; meaning: string; example?: string; exampleTr?: string; difficulty: string }) => { success: boolean; message: string };

  // 📅 Reset tarihleri
  lastQuestResetDate?: string; // Günlük reset
  lastWeeklyResetDate?: string; // Haftalık reset

  sfxEnabled: boolean;
  hapticEnabled: boolean;
  phrasalVerbs: PhrasalVerb[];
  unlockedPhrasalVerbs: string[];
  phrasalVerbFarm: WordModel[];
  phrasalVerbInventory: WordModel[];
  phrasalVerbQuizStats: {
    perfectQuizzes: number;
    maxCombo: number;
  };
  recentQuizWordIds: string[];
  transferEvent?: TransferEvent;

  // 📊 LIFETIME STATS - Achievement tracking
  lifetimeHarvests: number; // Toplam hasat sayısı (azalmaz)
  learnedWordIds: string[]; // En az 1 kez envantere hasat edilmiş kelimeler (puzzle hariç)

  // 👤 KULLANICI PROFİL
  nickname?: string;
  showNicknameModal?: boolean;
  setNickname: (name: string) => void;
  setShowNicknameModal: (show: boolean) => void;

  // 🎓 TUTORIAL STATE (14 adımlık interaktif rehber)
  tutorialStep: TutorialStep;
  tutorialFirstWrongWord?: { id: string; text: string; meaning: string };
  tutorialHighlightedWordId?: string; // Vurgulanan kart ID'si
  tutorialMiniQuizShown?: boolean; // MiniQuiz tutorial gösterildi mi
  tutorialEnvShown?: boolean; // Envanter tutorial gösterildi mi
  phrasalHintShown?: boolean; // Phrasal verbs hint gösterildi mi
  cloudTipsDismissed: Record<string, boolean>; // ☁️ Hangi cloudtip'ler kapatıldı
  tutorialInterrupted: boolean; // Uygulama arka plana giderse devam iste
  isTutorialOverlayActive: boolean; // 🔒 Overlay açılırken tüm interactions lock'la
  tutorialGreenCardSession?: { wordId: string; originalSessions: number }; // Tutorial'da yanlış yapılan yeşil kartın orijinal session'ı
  setTutorialStep: (step: TutorialStep) => void;
  setTutorialFirstWrongWord: (word: { id: string; text: string; meaning: string } | undefined) => void;
  setTutorialHighlightedWordId: (id: string | undefined) => void;
  setTutorialMiniQuizShown: (shown: boolean) => void;
  setTutorialEnvShown: (shown: boolean) => void;
  setPhrasalHintShown: (shown: boolean) => void;
  setCloudTipDismissed: (tipId: string, dismissed: boolean) => void;
  resetCloudTips: () => void; // Debug için cloudtip'leri sıfırla
  setTutorialInterrupted: (interrupted: boolean) => void;
  skipTutorial: () => void;
  resetTutorial: () => void; // 🎓 Tutorial'ı sıfırla

  // 🧭 Guided Mode (ayrı müfredat)
  guidedModeActive: boolean;
  guidedModeStep: GuidedModeStep;
  guidedModeTargetWordId?: string;
  guidedModeTargetWordText?: string;
  startGuidedMode: () => void;
  stopGuidedMode: () => void;
  setGuidedModeStep: (step: GuidedModeStep) => void;
  setGuidedModeTarget: (wordId?: string, wordText?: string) => void;

  // Actions
  startQuiz: () => void;
  answerQuiz: (wordId: string, correct: boolean) => void;
  openMiniQuiz: (wordId?: string) => void;
  answerMiniQuiz: (wordId: string, correct: boolean, correctCount?: number) => void;
  // 📊 Anlık quiz stat güncelleme (MiniQuiz yarıda bırakma için)
  updateQuizStat: (wordId: string, correct: boolean) => void;
  reviewFromInventory: (wordId: string) => void;
  plantFromInventory: (wordId: string) => void;
  checkAchievements: () => void;
  claimAchievementReward: (achievementId: string) => void;
  addCoins: (amount: number) => void;
  addXp: (amount: number) => void;
  addQuizReward: (xp: number) => void;
  addWrongStat: () => void;
  activateInsecticide: (price?: number) => void;
  addBattleSeeds: (words: { wordId?: string; wordText: string }[]) => number;

  // 🎨 Kart Tema Actions
  purchaseCardTheme: (themeId: string) => boolean;
  setActiveCardTheme: (themeId: string) => void;
  updateCardCustomization: (partial: Partial<CardCustomization>) => void;
  checkCollectibleCards: () => string[];  // yeni kilidi açılan kartları döndürür

  purchaseItem: (itemId: string, price: number, type: 'boost' | 'consumable' | 'permanent', duration?: number) => boolean;
  hasActiveBoost: (boostId: string) => boolean;
  cleanExpiredBoosts: () => void;
  useHintToken: () => boolean;
  useComboShield: () => boolean;
  toggleSfx: () => void;
  setSfx: (enabled: boolean) => void;
  toggleHaptic: () => void;
  setHaptic: (enabled: boolean) => void;
  toggleFavorite: (wordId: string) => void;
  loadWords: (words: WordModel[]) => void;
  fixDuplicates: () => void;
  resetProgress: () => void;
  buySeed: (wordId: string, price: number) => boolean;
  consumeTransferEvent: () => void;
  updateWordTimestamp: (wordId: string, timestamp: number) => void;

  // 🔥 GÜNLÜK GİRİŞ SERİSİ Actions
  checkDailyStreak: () => { isNewDay: boolean; currentStreak: number; reward: number; alreadyChecked: boolean };

  // 🧩 YAPBOZ & 🎤 SESYAP Actions
  addPuzzleScore: (points: number) => void;
  addSesyapScore: (points: number) => void;
  addSesyapHistory: (entry: { word: string; wordId?: string; meaning_tr: string; example_en: string; example_tr: string; correct: boolean; timestamp: number }) => void;
  clearSesyapHistory: () => void;

  // 🎯 KAPSAMLI GÖREV SİSTEMİ Actions
  // Günlük Görevler
  generateDailyQuests: () => void;
  checkAndResetDailyQuests: () => void;

  // Haftalık Görevler
  generateWeeklyQuests: () => void;
  checkAndResetWeeklyQuests: () => void;

  // Tekrarlanabilir Görevler
  generateRepeatableQuest: (category: 'fast' | 'medium' | 'long') => void;

  // Story Görevleri
  initializeStoryQuests: () => void;
  checkStoryQuestUnlocks: () => void;

  // Achievement Görevleri
  initializeAchievementQuests: () => void;
  checkAchievementProgress: () => void;

  // Toplu Quest Başlatma
  initializeAllQuests: () => void;

  // Mastery Yolları
  initializeMasteryPaths: () => void;
  checkMasteryProgress: () => void;

  // Ortak Actions
  updateQuestProgress: (type: QuestType, amount?: number, mode?: QuestProgressMode) => void;
  queueQuestProgress: (type: QuestType, amount?: number, mode?: QuestProgressMode) => void;
  claimQuestReward: (questId: string, questType: 'daily' | 'weekly' | 'repeatable' | 'story' | 'achievement' | 'mastery') => boolean;

  // Combo Actions (ikiye ayrıldı: Quiz vs Phrasal)
  setCurrentCombo: (combo: number) => void; // 🗑️ DEPRECATED
  incrementCombo: () => number; // 🗑️ DEPRECATED
  resetCombo: () => void; // 🗑️ DEPRECATED
  // Yeni ayrı combo fonksiyonları
  setCurrentQuizCombo: (combo: number) => void;
  incrementQuizCombo: () => number;
  resetQuizCombo: () => void;
  setCurrentPhrasalCombo: (combo: number) => void;
  incrementPhrasalCombo: () => number;
  resetPhrasalCombo: () => void;
  // UI State Actions
  setFeedVisible: (visible: boolean) => void;
  // 🧩 Puzzle Stats - Yapboz için ayrı ilerleme sistemi
  updateWordPuzzleStat: (wordId: string, correct: boolean) => void;
  // 🍎 MEYVE SİSTEMİ - Manuel hasat
  harvestWord: (wordId: string) => { success: boolean; coins: number; xp: number; newTier: number } | null;
  // 🧩 YAPBOZ MANUEL HASAT
  harvestPuzzleWord: (wordId: string) => { success: boolean; coins: number; xp: number; newTier: number } | null;
  // Phrasal Verb Actions
  loadPhrasalVerbs: () => void;
  unlockPhrasalVerb: (verbId: string, difficulty: string) => boolean;
  addPhrasalVerbToFarm: (verb: (PhrasalVerb & { wasCorrect?: boolean }) | string) => void;
  updatePhrasalVerbProgress: (verbId: string, correct: boolean) => void;
  // 📦 Envanter Quiz - Seviye düşürme
  demoteWordLevel: (wordId: string, isPhrasal: boolean) => void;
  // 📦 Envanter Quiz - Son quiz zamanı
  lastInventoryQuizTime?: number;
  setLastInventoryQuizTime: (time: number) => void;
  // 🧪 Böcek ilacı (Insecticide) sistem
  insecticideActive: boolean; // Böcek ilacı şu anda aktif mi
  cardsAddedSinceInsecticide: number; // Böcek ilacısından sonra eklenen kart sayısı
  setInsecticideActive: (active: boolean) => void;
  addCardsCounterForInsecticide: (count: number) => void; // Eklenen kart sayısını artır

  // 💧🐛 KART ANİMASYON FEEDBACK - Quiz/Puzzle sonrası kart animasyonu
  cardFeedback: { id: string; wordId: string; type: 'levelUp' | 'levelDown' | 'protected'; createdAt: number } | null;
  setCardFeedback: (feedback: { wordId: string; type: 'levelUp' | 'levelDown' | 'protected' } | null) => void;

  // ===============================
  // 👤 USER AUTHENTICATION STATE
  // ===============================
  user: {
    odId: string;
    email?: string | null;
    nickname: string;
    avatarUrl?: string | null;
  } | null;
  isAuthenticated: boolean;
  setUser: (user: { odId: string; email?: string | null; nickname: string; avatarUrl?: string | null } | null) => void;
  setIsAuthenticated: (authenticated: boolean) => void;

  // ===============================
  // ⚔️ BATTLE MODE STATE
  // ===============================
  battleState: 'idle' | 'searching' | 'matched' | 'countdown' | 'inProgress' | 'finished';
  battleId: string | null;
  battleQuestions: Array<{
    wordId: string;
    wordText: string;
    correctAnswer: string;
    options: string[];
  }>;
  battleRoundLog: Array<{
    odId: string;
    questionIndex: number;
    correct: boolean;
    timeMs: number;
    comboLevel: number;
  }>;
  opponentInfo: {
    odId: string;
    nickname: string;
    level: number;
    avatarUrl?: string;
    currentScore: number;
    currentCombo: number;
    currentQuestion: number;
  } | null;
  battleScore: number;
  battleCombo: number;
  battleCurrentQuestion: number;
  battleWins: number;
  battleLosses: number;
  bestBattleStreak: number;
  currentBattleStreak: number;
  battleHistory: Array<{
    id: string;
    odId: string;
    odName: string;
    result: 'win' | 'loss' | 'draw';
    myScore: number;
    opponentScore: number;
    timestamp: number;
  }>;
  matchmakingRequestId: string | null;

  // Battle Actions
  setBattleState: (state: 'idle' | 'searching' | 'matched' | 'countdown' | 'inProgress' | 'finished') => void;
  startMatchmaking: () => void;
  cancelMatchmaking: () => void;

  updateRemoteOpponentProgress: (info: { currentScore: number; currentCombo: number; currentQuestion: number }) => void;
  setBattleData: (data: {
    battleId: string;
    questions: Array<{ wordId: string; wordText: string; correctAnswer: string; options: string[] }>;
    opponentInfo: { odId: string; nickname: string; level: number; avatarUrl?: string };
  }) => void;
  submitBattleAnswer: (questionIndex: number, correct: boolean, timeMs: number) => void;
  endBattle: (result: 'win' | 'loss' | 'draw', opponentScore: number, isDisconnect?: boolean) => void;
  resetBattle: () => void;
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  // 🎯 BAŞLANGIÇ (5)
  { id: 'first_correct', title: 'İlk Adım', description: 'İlk doğru cevabını ver', icon: '🎯', requirement: 1, reward: { coins: 10, xp: 20 }, claimed: false, unlocked: false },
  { id: 'first_wrong', title: 'Hata Yapma Hakkı', description: 'İlk yanlış cevabını ver', icon: '💪', requirement: 1, reward: { coins: 5, xp: 10 }, claimed: false, unlocked: false },
  { id: 'first_harvest', title: 'İlk Hasat', description: 'İlk kelimeni hasat et', icon: '🌾', requirement: 1, reward: { coins: 15, xp: 30 }, claimed: false, unlocked: false },
  { id: 'first_quiz', title: 'Quiz Başlangıcı', description: 'İlk quizini tamamla', icon: '📝', requirement: 1, reward: { coins: 10, xp: 20 }, claimed: false, unlocked: false },
  { id: 'first_master', title: 'İlk Master', description: 'İlk master kelimeni oluştur', icon: 'P', requirement: 1, reward: { coins: 20, xp: 50 }, claimed: false, unlocked: false },

  // 🔥 COMBO MASTER SERİSİ (8)
  { id: 'combo_3', title: 'Combo Başlangıç', description: '3 combo yap', icon: '🔥', requirement: 3, reward: { coins: 10, xp: 20 }, claimed: false, unlocked: false },
  { id: 'combo_5', title: 'Combo Ustası', description: '5 combo yap', icon: '🔥', requirement: 5, reward: { coins: 20, xp: 40 }, claimed: false, unlocked: false },
  { id: 'combo_10', title: 'Combo Master', description: '10 combo yap', icon: '💎', requirement: 10, reward: { coins: 50, xp: 100 }, claimed: false, unlocked: false },
  { id: 'combo_15', title: 'Combo Pro', description: '15 combo yap', icon: '💎', requirement: 15, reward: { coins: 80, xp: 160 }, claimed: false, unlocked: false },
  { id: 'combo_25', title: 'Combo Legend', description: '25 combo yap', icon: '👑', requirement: 25, reward: { coins: 100, xp: 200 }, claimed: false, unlocked: false },
  { id: 'combo_50', title: 'Combo Efsanesi', description: '50 combo yap', icon: '🌟', requirement: 50, reward: { coins: 200, xp: 500 }, claimed: false, unlocked: false },
  { id: 'combo_75', title: 'Combo Kralı', description: '75 combo yap', icon: '👑', requirement: 75, reward: { coins: 300, xp: 800 }, claimed: false, unlocked: false },
  { id: 'combo_100', title: 'Combo İmparatoru', description: '100 combo yap', icon: '🦄', requirement: 100, reward: { coins: 500, xp: 1000 }, claimed: false, unlocked: false },

  // ⭐ SEVİYE SERİSİ (10)
  { id: 'level_2', title: 'Çaylak', description: 'Level 2\'ye ulaş', icon: '🌱', requirement: 2, reward: { coins: 10, xp: 20 }, claimed: false, unlocked: false },
  { id: 'level_5', title: 'Yükselen Yıldız', description: 'Level 5\'e ulaş', icon: 'P', requirement: 5, reward: { coins: 40, xp: 100 }, claimed: false, unlocked: false },
  { id: 'level_10', title: 'Deneyimli', description: 'Level 10\'a ulaş', icon: '🌙', requirement: 10, reward: { coins: 100, xp: 200 }, claimed: false, unlocked: false },
  { id: 'level_15', title: 'Gelişen', description: 'Level 15\'e ulaş', icon: '🌟', requirement: 15, reward: { coins: 150, xp: 300 }, claimed: false, unlocked: false },
  { id: 'level_20', title: 'Yetkin', description: 'Level 20\'ye ulaş', icon: '💫', requirement: 20, reward: { coins: 200, xp: 400 }, claimed: false, unlocked: false },
  { id: 'level_25', title: 'Uzman', description: 'Level 25\'e ulaş', icon: '💫', requirement: 25, reward: { coins: 300, xp: 600 }, claimed: false, unlocked: false },
  { id: 'level_50', title: 'Usta', description: 'Level 50\'ye ulaş', icon: '🏆', requirement: 50, reward: { coins: 600, xp: 1500 }, claimed: false, unlocked: false },
  { id: 'level_75', title: 'Büyükusta', description: 'Level 75\'e ulaş', icon: '👑', requirement: 75, reward: { coins: 1000, xp: 2500 }, claimed: false, unlocked: false },
  { id: 'level_100', title: 'Efsane', description: 'Level 100\'e ulaş', icon: '🦄', requirement: 100, reward: { coins: 2000, xp: 5000 }, claimed: false, unlocked: false },
  { id: 'level_150', title: 'İmparator', description: 'Level 150\'ye ulaş', icon: '👑', requirement: 150, reward: { coins: 4000, xp: 10000 }, claimed: false, unlocked: false },

  // 🌾 HASAT SERİSİ (8)
  { id: 'harvest_5', title: 'Bahçıvan', description: '5 kelime hasat et', icon: '🌿', requirement: 5, reward: { coins: 15, xp: 30 }, claimed: false, unlocked: false },
  { id: 'harvest_10', title: 'Çiftçi', description: '10 kelime hasat et', icon: '🌾', requirement: 10, reward: { coins: 30, xp: 60 }, claimed: false, unlocked: false },
  { id: 'harvest_25', title: 'Hasatçı', description: '25 kelime hasat et', icon: '🌻', requirement: 25, reward: { coins: 60, xp: 120 }, claimed: false, unlocked: false },
  { id: 'harvest_50', title: 'Hasat Ustası', description: '50 kelime hasat et', icon: '🌻', requirement: 50, reward: { coins: 100, xp: 200 }, claimed: false, unlocked: false },
  { id: 'harvest_100', title: 'Çiftlik Baronu', description: '100 kelime hasat et', icon: '🏡', requirement: 100, reward: { coins: 200, xp: 500 }, claimed: false, unlocked: false },
  { id: 'harvest_250', title: 'Hasat Kralı', description: '250 kelime hasat et', icon: '🤴', requirement: 250, reward: { coins: 500, xp: 1200 }, claimed: false, unlocked: false },
  { id: 'harvest_500', title: 'Kelime İmparatoru', description: '500 kelime hasat et', icon: '👑', requirement: 500, reward: { coins: 1000, xp: 2000 }, claimed: false, unlocked: false },
  { id: 'harvest_1000', title: 'Hasat Ustası', description: '1000 kelime hasat et', icon: '🌟', requirement: 1000, reward: { coins: 2000, xp: 5000 }, claimed: false, unlocked: false },

  // 📚 KELİME HAZNESİ (6)
  { id: 'words_25', title: 'Kelime Meraklısı', description: '25 farklı kelime öğren', icon: '📕', requirement: 25, reward: { coins: 15, xp: 35 }, claimed: false, unlocked: false },
  { id: 'words_50', title: 'Kelime Toplayıcı', description: '50 farklı kelime öğren', icon: '📕', requirement: 50, reward: { coins: 30, xp: 70 }, claimed: false, unlocked: false },
  { id: 'words_100', title: 'Kelime Avcısı', description: '100 farklı kelime öğren', icon: '📖', requirement: 100, reward: { coins: 60, xp: 150 }, claimed: false, unlocked: false },
  { id: 'words_250', title: 'Kelime Ustası', description: '250 farklı kelime öğren', icon: '📚', requirement: 250, reward: { coins: 150, xp: 350 }, claimed: false, unlocked: false },
  { id: 'words_500', title: 'Sözlük', description: '500 farklı kelime öğren', icon: '📚', requirement: 500, reward: { coins: 300, xp: 700 }, claimed: false, unlocked: false },
  { id: 'words_1000', title: 'Ansiklopedi', description: '1000 farklı kelime öğren', icon: '🎓', requirement: 1000, reward: { coins: 1000, xp: 2000 }, claimed: false, unlocked: false },

  //  MASTER SERİSİ (7)
  { id: 'master_1', title: 'İlk Master', description: '1 master kelime', icon: '🌟', requirement: 1, reward: { coins: 20, xp: 50 }, claimed: false, unlocked: false },
  { id: 'master_5', title: 'Master Başlangıç', description: '5 master kelime', icon: '🥉', requirement: 5, reward: { coins: 50, xp: 100 }, claimed: false, unlocked: false },
  { id: 'master_10', title: 'Master Koleksiyoncu', description: '10 master kelime', icon: '🥈', requirement: 10, reward: { coins: 100, xp: 200 }, claimed: false, unlocked: false },
  { id: 'master_25', title: 'Master Avcısı', description: '25 master kelime', icon: '🥈', requirement: 25, reward: { coins: 200, xp: 400 }, claimed: false, unlocked: false },
  { id: 'master_50', title: 'Master Ustası', description: '50 master kelime', icon: '🥇', requirement: 50, reward: { coins: 500, xp: 1000 }, claimed: false, unlocked: false },
  { id: 'master_100', title: 'Master Ustası', description: '100 master kelime', icon: '🏆', requirement: 100, reward: { coins: 1000, xp: 2000 }, claimed: false, unlocked: false },
  { id: 'master_200', title: 'Master İmparatoru', description: '200 master kelime', icon: '👑', requirement: 200, reward: { coins: 2000, xp: 5000 }, claimed: false, unlocked: false },

  // 💎 PERFECT SERİSİ (6)
  { id: 'perfect_1', title: 'İlk Perfect', description: '1 perfect master kelime', icon: '💎', requirement: 1, reward: { coins: 40, xp: 100 }, claimed: false, unlocked: false },
  { id: 'perfect_5', title: 'Perfect Başlangıç', description: '5 perfect master kelime', icon: '💎', requirement: 5, reward: { coins: 100, xp: 250 }, claimed: false, unlocked: false },
  { id: 'perfect_10', title: 'Perfect Avcısı', description: '10 perfect master kelime', icon: '💎', requirement: 10, reward: { coins: 200, xp: 500 }, claimed: false, unlocked: false },
  { id: 'perfect_25', title: 'Perfect Ustası', description: '25 perfect master kelime', icon: '💠', requirement: 25, reward: { coins: 500, xp: 1200 }, claimed: false, unlocked: false },
  { id: 'perfect_50', title: 'Perfect Koleksiyoncu', description: '50 perfect master kelime', icon: '🔮', requirement: 50, reward: { coins: 1000, xp: 2500 }, claimed: false, unlocked: false },
  { id: 'perfect_100', title: 'Perfect İmparatoru', description: '100 perfect master kelime', icon: '👑', requirement: 100, reward: { coins: 2000, xp: 5000 }, claimed: false, unlocked: false },

  // 🎓 PHRASAL VERB SERİSİ (6)
  { id: 'phrasal_5', title: 'Phrasal Verb Çaylağı', description: '5 phrasal verb öğren', icon: '📗', requirement: 5, reward: { coins: 40, xp: 80 }, claimed: false, unlocked: false },
  { id: 'phrasal_10', title: 'Phrasal Verb Meraklısı', description: '10 phrasal verb öğren', icon: '📘', requirement: 10, reward: { coins: 80, xp: 160 }, claimed: false, unlocked: false },
  { id: 'phrasal_25', title: 'Phrasal Verb Ustası', description: '25 phrasal verb öğren', icon: '📘', requirement: 25, reward: { coins: 150, xp: 300 }, claimed: false, unlocked: false },
  { id: 'phrasal_50', title: 'Phrasal Verb Uzmanı', description: '50 phrasal verb öğren', icon: '📙', requirement: 50, reward: { coins: 300, xp: 700 }, claimed: false, unlocked: false },
  { id: 'phrasal_100', title: 'Phrasal Verb Efsanesi', description: '100 phrasal verb öğren', icon: '📕', requirement: 100, reward: { coins: 600, xp: 1500 }, claimed: false, unlocked: false },
  { id: 'phrasal_200', title: 'Phrasal Verb İmparatoru', description: '200 phrasal verb öğren', icon: '👑', requirement: 200, reward: { coins: 1500, xp: 3000 }, claimed: false, unlocked: false },

  // 💰 ZENGİNLİK SERİSİ (6) - Kazanılan coin toplamı
  { id: 'coins_500', title: 'Tasarrufcu', description: '500 coin kazan', icon: '🪙', requirement: 500, reward: { coins: 10, xp: 20 }, claimed: false, unlocked: false },
  { id: 'coins_1000', title: 'Biriktirici', description: '1000 coin kazan', icon: '🪙', requirement: 1000, reward: { coins: 20, xp: 40 }, claimed: false, unlocked: false },
  { id: 'coins_5000', title: 'Zengin', description: '5000 coin kazan', icon: '💰', requirement: 5000, reward: { coins: 100, xp: 200 }, claimed: false, unlocked: false },
  { id: 'coins_25000', title: 'Milyoner', description: '25000 coin kazan', icon: '💎', requirement: 25000, reward: { coins: 500, xp: 1000 }, claimed: false, unlocked: false },
  { id: 'coins_50000', title: 'Multimilyoner', description: '50000 coin kazan', icon: '👑', requirement: 50000, reward: { coins: 1000, xp: 2000 }, claimed: false, unlocked: false },
  { id: 'coins_100000', title: 'Milyarder', description: '100000 coin kazan', icon: '👑', requirement: 100000, reward: { coins: 2000, xp: 5000 }, claimed: false, unlocked: false },
];

function sanitizeAchievementCollection(value: unknown): Achievement[] {
  const persistedById = new Map<string, Partial<Achievement>>();

  for (const item of toSafeObjectArray<Partial<Achievement>>(value)) {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    if (!id) continue;
    persistedById.set(id, item);
  }

  return INITIAL_ACHIEVEMENTS.map((base) => {
    const persisted = persistedById.get(base.id);
    const claimed = persisted?.claimed === true;
    const unlocked = claimed || persisted?.unlocked === true;

    // Keep progress flags from persist, always rebuild display fields from clean canonical source.
    return {
      ...base,
      claimed,
      unlocked,
    };
  });
}

export const useFarmStore = create<FarmStore>()(
  persist(
    (set, get) => ({
      pool: [],
      farm: [],
      inventory: [],
      quizActive: false,
      quizWords: [],
      miniQuizFor: undefined,
      feedVisible: false,
      xp: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      currentCombo: 0,
      currentQuizCombo: 0,
      currentPhrasalCombo: 0,
      totalQuizzes: 0,
      totalCorrect: 0,
      totalWrong: 0,
      achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
      lastPlayedDate: new Date().toISOString().split('T')[0],
      dailyGoal: 500,
      dailyProgress: 0,
      coins: 0,
      lifetimeCoins: 0,
      hintTokens: 0,
      comboShields: 0,
      activeBoosts: [],
      ownedItems: [],
      sfxEnabled: true,
      hapticEnabled: true,
      phrasalVerbs: [],
      unlockedPhrasalVerbs: [],
      phrasalVerbFarm: [],
      phrasalVerbInventory: [],
      phrasalVerbQuizStats: { perfectQuizzes: 0, maxCombo: 0 },
      recentQuizWordIds: [],
      transferEvent: undefined,

      // 🔥 SERİ (STREAK) SİSTEMİ - TAKVİM GÜNÜ BAZLI (00:00'da yenilenir)
      dailyStreak: 0,
      lastStreakCheckDate: undefined, // Son kontrol tarihi (YYYY-MM-DD)

      // 🧩 YAPBOZ VE SESYAP SKORLARI
      puzzleScore: 0,
      sesyapScore: 0,
      sesyapHistory: [],

      // 🎯 KAPSAMLI GÖREV SİSTEMİ
      dailyQuests: [],
      weeklyQuests: [],
      repeatableQuests: [],
      storyQuests: [],
      achievementQuests: [],
      masteryPaths: [],

      // 🏆 Görev İstatistikleri
      trophies: 0,
      totalQuestsCompleted: 0,
      dailyQuestStreak: 0,

      // 📊 Lifetime Stats (Achievement tracking için)
      lifetimePlantedWords: 0,
      lifetimeSpeechPractice: 0,
      lifetimePuzzlesCompleted: 0,
      lifetimePhrasalHarvested: 0,
      lifetimeQuizAnswered: 0,
      lifetimeBattlesWon: 0,
      maxComboEver: 0,

      // 🎨 KART TEMA SİSTEMİ
      ownedCardThemes: [],
      activeCardTheme: 'default',
      cardCustomization: { ...DEFAULT_CUSTOMIZATION },
      collectedCards: [],



      // 📅 Reset tarihleri
      lastQuestResetDate: undefined,
      lastWeeklyResetDate: undefined,

      // 🐛 KART ANİMASYON FEEDBACK - Quiz/Puzzle sonrası kart animasyonu
      cardFeedback: null,
      setCardFeedback: (feedback) => {
        if (feedback) {
          const enriched = {
            id: `${feedback.wordId}-${feedback.type}-${Date.now()}`,
            wordId: feedback.wordId,
            type: feedback.type,
            createdAt: Date.now(),
          };
          set({ cardFeedback: enriched });
        } else {
          set({ cardFeedback: null });
        }
      },

      // 📊 LIFETIME STATS - Achievement tracking
      lifetimeHarvests: 0,
      learnedWordIds: [],

      // 👤 KULLANICI PROFİL
      nickname: undefined,
      showNicknameModal: false,
      setNickname: (name) => {
        try {
          const safeName = typeof name === 'string' ? name.trim() : '';
          if (!safeName) return;
          if (typeof isNicknameClean === 'function' && !isNicknameClean(safeName)) return;
          const safeNicknameLower = safeName.toLowerCase();

          set(prev => ({
            nickname: safeName,
            user: prev.user ? { ...prev.user, nickname: safeName } : prev.user,
          }));

          const state = get();
          const safeOdId = state.user?.odId;
          if (safeOdId && state.isAuthenticated) {
            // Firebase async guncelle (fire-and-forget) - cached, dynamic import yok
            try {
              if (_cachedDb && _cachedFirestoreFns) {
                const userRef = _cachedFirestoreFns.doc(_cachedDb, 'users', safeOdId);
                _cachedFirestoreFns.updateDoc(userRef, { nickname: safeName, nicknameLower: safeNicknameLower }).catch(() => {});
              } else {
                ensureFirebaseCache().then(() => {
                  const latestUserId = get().user?.odId;
                  if (_cachedDb && _cachedFirestoreFns && latestUserId) {
                    const userRef = _cachedFirestoreFns.doc(_cachedDb, 'users', latestUserId);
                    _cachedFirestoreFns.updateDoc(userRef, { nickname: safeName, nicknameLower: safeNicknameLower }).catch(() => {});
                  }
                }).catch(() => {});
              }
            } catch (e) {}
          }
        } catch (e) {
          console.error('[setNickname] Error:', e);
        }
      },
      setShowNicknameModal: (show) => set({ showNicknameModal: show }),

      // ===============================
      // 👤 USER AUTHENTICATION STATE
      // ===============================
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user }),
      setIsAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      // ===============================
      //  BATTLE MODE STATE
      // ===============================
      battleState: 'idle' as const,
      battleId: null,
      battleQuestions: [],
      battleRoundLog: [],
      opponentInfo: null,
      battleScore: 0,
      battleCombo: 0,
      battleCurrentQuestion: 0,
      battleWins: 0,
      battleLosses: 0,
      bestBattleStreak: 0,
      currentBattleStreak: 0,
      battleHistory: [],
      matchmakingRequestId: null,
      insecticideActive: false,
      cardsAddedSinceInsecticide: 0,

      // Battle Actions
      setBattleState: (state) => set({ battleState: state }),

      submitBattleAnswer: (questionIndex, correct, timeMs) => {
        set((state) => {
          const newScore = correct ? state.battleScore + 100 : state.battleScore;

          // Log ekle
          const newLog = [...state.battleRoundLog];
          newLog.push({
            odId: state.user?.odId || 'unknown',
            questionIndex,
            correct,
            timeMs,
            comboLevel: 0
          });

          return {
            battleScore: newScore,
            battleRoundLog: newLog,
            battleCurrentQuestion: questionIndex + 1
          };
        });
      },

      startMatchmaking: () => {
        const state = get();
        if (!state.isAuthenticated || !state.user) {
          console.warn('⚔️ Cannot start matchmaking: not authenticated');
          return;
        }
        set({
          battleState: 'searching',
          battleId: null,
          battleQuestions: [],
          battleScore: 0,
          battleCombo: 0,
          battleCurrentQuestion: 0,
          battleRoundLog: [],
          opponentInfo: null,
        });
        // Actual matchmaking would be triggered via Firebase listener
      },

      cancelMatchmaking: () => {
        set({
          battleState: 'idle',
          matchmakingRequestId: null,
        });
      },

      setBattleData: (data) => {
        set({
          battleId: data.battleId,
          battleQuestions: data.questions,
          opponentInfo: {
            ...data.opponentInfo,
            currentScore: 0,
            currentCombo: 0,
            currentQuestion: 0,
          },
          battleState: 'matched',
        });
      },



      updateRemoteOpponentProgress: (progress) => {
        set((state) => ({
          opponentInfo: state.opponentInfo ? {
            ...state.opponentInfo,
            ...progress,
          } : null,
        }));
      },

      endBattle: (result, opponentScore, isDisconnect = false) => {
        const state = get();
        // If disconnect, NO rewards (XP/Coins/Streak) but count as win/loss in stats
        const newWins = result === 'win' ? state.battleWins + 1 : state.battleWins;
        const newLosses = result === 'loss' ? state.battleLosses + 1 : state.battleLosses;
        const newStreak = result === 'win' && !isDisconnect ? state.currentBattleStreak + 1 : (result === 'loss' ? 0 : state.currentBattleStreak); // Disconnect win doesn't increase streak
        const bestStreak = Math.max(state.bestBattleStreak, newStreak);

        // Calculate rewards - ZERO if disconnect
        const baseXP = isDisconnect ? 0 : (result === 'win' ? 250 : result === 'draw' ? 100 : 50);
        const baseCoins = isDisconnect ? 0 : (result === 'win' ? 100 : result === 'draw' ? 50 : 25);
        const streakBonus = (!isDisconnect && result === 'win') ? newStreak * 10 : 0;

        const historyEntry = {
          id: state.battleId || `battle-${Date.now()}`,
          odId: state.opponentInfo?.odId || 'unknown',
          odName: state.opponentInfo?.nickname || 'Unknown',
          result,
          myScore: state.battleScore,
          opponentScore,
          timestamp: Date.now(),
        };

        set({
          battleState: 'finished',
          battleWins: newWins,
          battleLosses: newLosses,
          currentBattleStreak: newStreak,
          bestBattleStreak: bestStreak,
          battleHistory: [historyEntry, ...state.battleHistory].slice(0, 50),
          xp: state.xp + baseXP + streakBonus,
          coins: state.coins + baseCoins + streakBonus,
          lifetimeCoins: state.lifetimeCoins + baseCoins + streakBonus,
        });
      },

      resetBattle: () => {
        set({
          battleState: 'idle',
          battleId: null,
          battleQuestions: [],
          battleRoundLog: [],
          opponentInfo: null,
          battleScore: 0,
          battleCombo: 0,
          battleCurrentQuestion: 0,
          matchmakingRequestId: null,
        });
      },

      //  TUTORIAL STATE (14 adımlık interaktif rehber)
      tutorialStep: 'NOT_STARTED' as TutorialStep,
      tutorialFirstWrongWord: undefined,
      tutorialHighlightedWordId: undefined,
      tutorialMiniQuizShown: false,
      tutorialEnvShown: false,
      phrasalHintShown: false,
      cloudTipsDismissed: {},
      tutorialInterrupted: false,
      isTutorialOverlayActive: false,
      tutorialGreenCardSession: undefined,
      setTutorialStep: (step) => set((state) => ({
        tutorialStep: step,
        // Tutorial tamamlandığında session ayarını temizle
        tutorialGreenCardSession: step === 'COMPLETED' ? undefined : state.tutorialGreenCardSession,
      })),
      setTutorialFirstWrongWord: (word) => set({ tutorialFirstWrongWord: word }),
      setTutorialHighlightedWordId: (id) => set({ tutorialHighlightedWordId: id }),
      setTutorialMiniQuizShown: (shown) => set({ tutorialMiniQuizShown: shown }),
      setTutorialEnvShown: (shown) => set({ tutorialEnvShown: shown }),
      setPhrasalHintShown: (shown) => set({ phrasalHintShown: shown }),
      setCloudTipDismissed: (tipId, dismissed) => set((state) => ({
        cloudTipsDismissed: { ...state.cloudTipsDismissed, [tipId]: dismissed }
      })),
      resetCloudTips: () => set({ cloudTipsDismissed: {} }),
      setTutorialInterrupted: (interrupted) => set({ tutorialInterrupted: interrupted }),
      skipTutorial: () => set({
        tutorialStep: 'COMPLETED',
        tutorialFirstWrongWord: undefined,
        tutorialInterrupted: false,
        tutorialGreenCardSession: undefined, // Tutorial bitti, session ayarını temizle
        showNicknameModal: true,
      }),
      //  Tutorial'ı sıfırla (test için veya kullanıcı isterse)
      resetTutorial: () => set({
        tutorialStep: 'STEP_1_WELCOME',
        tutorialFirstWrongWord: undefined,
        tutorialHighlightedWordId: undefined,
        tutorialMiniQuizShown: false,
        tutorialEnvShown: false,
        phrasalHintShown: false,
        tutorialInterrupted: false,
        tutorialGreenCardSession: undefined, // Tutorial reset, session ayarını temizle
      }),

      guidedModeActive: false,
      guidedModeStep: 'QUIZ_UNTIL_WRONG' as GuidedModeStep,
      guidedModeTargetWordId: undefined,
      guidedModeTargetWordText: undefined,
      startGuidedMode: () => set({
        guidedModeActive: true,
        guidedModeStep: 'QUIZ_UNTIL_WRONG',
        guidedModeTargetWordId: undefined,
        guidedModeTargetWordText: undefined,
      }),
      stopGuidedMode: () => set({
        guidedModeActive: false,
        guidedModeStep: 'COMPLETED',
        guidedModeTargetWordId: undefined,
        guidedModeTargetWordText: undefined,
      }),
      setGuidedModeStep: (step) => set({
        guidedModeStep: step,
        guidedModeActive: step !== 'COMPLETED',
      }),
      setGuidedModeTarget: (wordId, wordText) => set({
        guidedModeTargetWordId: typeof wordId === 'string' && wordId.trim().length > 0 ? wordId.trim() : undefined,
        guidedModeTargetWordText: typeof wordText === 'string' && wordText.trim().length > 0 ? wordText.trim() : undefined,
      }),

      loadWords: (words) => set((state) => {
        // Yeni kelimelerle mevcut farm/inventory kelimelerini eşleştir
        // Kelime text'ine göre örnek cümle ekle
        const safeWords = Array.isArray(words) ? words.filter(Boolean) : [];
        const wordMap = new Map<string, WordModel>();
        safeWords.forEach((w) => {
          const key = toSafeLowerText((w as any)?.text);
          if (!key || wordMap.has(key)) return;
          wordMap.set(key, w);
        });

        const updatedFarm = state.farm.map(word => {
          const sourceKey = toSafeLowerText((word as any)?.text);
          if (!sourceKey) return word;
          const newWord = wordMap.get(sourceKey);
          if (newWord?.example) {
            return { ...word, example: newWord.example, meaning: newWord.meaning };
          }
          return word;
        });

        const updatedInventory = state.inventory.map(word => {
          const sourceKey = toSafeLowerText((word as any)?.text);
          if (!sourceKey) return word;
          const newWord = wordMap.get(sourceKey);
          if (newWord?.example) {
            return { ...word, example: newWord.example, meaning: newWord.meaning };
          }
          return word;
        });

        return {
          pool: safeWords,
          farm: updatedFarm,
          inventory: updatedInventory,
        };
      }),

      fixDuplicates: () => {
        set(state => {
          const seen = new Set();
          const uniqueInventory = state.inventory.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });

          const seenFarm = new Set();
          const uniqueFarm = state.farm.filter(item => {
            if (seenFarm.has(item.id)) return false;
            seenFarm.add(item.id);
            return true;
          });

          return { inventory: uniqueInventory, farm: uniqueFarm };
        });
      },

      startQuiz: () => {
        const state = get();
        const excludeIds = new Set([
          ...state.farm.map(w => w.id),
          ...state.inventory.map(w => w.id)
        ]);
        const askedSet = new Set(state.recentQuizWordIds);

        const basePool = state.pool.filter(w => !excludeIds.has(w.id));
        let candidatePool = basePool.filter(w => !askedSet.has(w.id));
        let historySnapshot = state.recentQuizWordIds;

        // If we exhausted the pool (not enough fresh words), reuse entire pool but reset history
        //  IMPROVED: Reset when less than 30% of pool is fresh (not just 20 words)
        const freshThreshold = Math.max(20, Math.floor(basePool.length * 0.3));
        if (candidatePool.length < freshThreshold && basePool.length >= 20) {
          candidatePool = basePool;
          historySnapshot = [];
        } else if (candidatePool.length === 0) {
          // Not enough words overall (probably because basePool < 20). Just use what we have.
          candidatePool = basePool;
        }

        const shuffled = [...candidatePool];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const desiredCount = Math.min(20, shuffled.length);
        const quizWords = shuffled.slice(0, desiredCount);

        const mergedHistory = [...historySnapshot, ...quizWords.map(w => w.id)];
        const dedupedHistory: string[] = [];
        const seenIds = new Set<string>();
        for (const id of mergedHistory) {
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          dedupedHistory.push(id);
        }

        //  IMPROVED: Keep history at 70% of pool for better variety
        // This ensures ~30% fresh words before reset, maximizing coverage
        const maxHistory = Math.floor((state.pool.length || 1000) * 0.7);
        const boundedHistory = dedupedHistory.slice(-maxHistory);

        set({ quizActive: quizWords.length > 0, quizWords, recentQuizWordIds: boundedHistory });
      },

      answerQuiz: (wordId, correct) => {
        try {
        const state = get();
        const safePool = toSafeWordArray(state.pool);
        const safeFarm = toSafeWordArray(state.farm);
        const w = safePool.find(w => w.id === wordId);
        if (!w) return;

        if (state.guidedModeActive && state.guidedModeStep === 'QUIZ_UNTIL_WRONG' && !correct) {
          set({
            guidedModeStep: 'FARM_MASTER_TARGET',
            guidedModeTargetWordId: w.id,
            guidedModeTargetWordText: w.text,
          });
          traceEvent('guided_mode_step', {
            from: 'QUIZ_UNTIL_WRONG',
            to: 'FARM_MASTER_TARGET',
            wordId: w.id,
            wordText: normalizeDisplayText(w.text),
          });
        }

        // Calculate streak and rewards
        const currentStreak = correct ? toSafeNumber(state.streak, 0) + 1 : 0;
        const streakBonus = Math.floor(currentStreak / 5) * 10;
        const baseXP = correct ? 10 : 0;
        let earnedXP = baseXP + streakBonus;
        let earnedCoins = correct ? 2 + Math.floor(currentStreak / 3) : 0;

        // console.log('📦 Store answerQuiz - correct:', correct, 'old streak:', state.streak, '→ new streak:', currentStreak);

        // Check if word is already in farm
        const already = safeFarm.some(f => f.id === wordId);
        if (!already) {
          //  RENK SİSTEMİ:
          // ✅ Doğru cevap → YEİL (wrongCount=3, hasat edilebilir meyve) 
          //  Yanlış cevap → KIRMIZI (wrongCount=0, tohum - en düşük seviye)
          set(state => ({
            farm: [...toSafeWordArray(state.farm), {
              ...w,
              correctCount: 0,
              wrongCount: correct ? 3 : 0, // Doğru=yeşil(3)=meyve, Yanlış=kırmızı(0)=tohum
              level: correct ? 1 : 0,
              consecutiveCorrect: 0,
              harvestedCount: 0,
              totalHarvests: 0,
              masterLevel: 0,
              originalMasterLevel: 0, // 🧩 Yapboz için orijinal seviye
              lastAnswerCorrect: correct,
              lastPlantedAt: Date.now(), // 📌 Quiz'den gelen kelime en üstte
              // 📊 Quiz istatistikleri başlat
              quizCorrect: correct ? 1 : 0,
              quizWrong: correct ? 0 : 1,
            }]
          }));

          //  GÜNLÜK GÖREV - Quiz'den kelime farm'a eklendi! (crash-safe)
          try { state.queueQuestProgress('PLANT_WORDS', 1, 'add'); } catch(e) {}
        } else {
          // 📊 Zaten farm'da olan kelime - istatistikleri güncelle + lastPlantedAt
          set(state => ({
            farm: toSafeWordArray(state.farm).map(f => f.id === wordId ? {
              ...f,
              lastPlantedAt: Date.now(), // 📌 Quiz'de cevaplanan kelime en üstte
              quizCorrect: (f.quizCorrect || 0) + (correct ? 1 : 0),
              quizWrong: (f.quizWrong || 0) + (correct ? 0 : 1),
            } : f),
          }));
        }

        // Update stats
        set(state => {
          const newXP = toSafeNumber(state.xp, 0) + earnedXP;
          const newLevel = Math.floor(newXP / 1000) + 1;

          return {
            totalQuizzes: toSafeNumber(state.totalQuizzes, 0) + 1,
            totalCorrect: correct ? toSafeNumber(state.totalCorrect, 0) + 1 : toSafeNumber(state.totalCorrect, 0),
            totalWrong: correct ? toSafeNumber(state.totalWrong, 0) : toSafeNumber(state.totalWrong, 0) + 1,
            streak: currentStreak,
            bestStreak: Math.max(toSafeNumber(state.bestStreak, 0), currentStreak),
            xp: newXP,
            coins: toSafeNumber(state.coins, 0) + earnedCoins,
            lifetimeCoins: toSafeNumber(state.lifetimeCoins, 0) + earnedCoins,
            level: newLevel,
          };
        });

        debouncedCheckAchievements(get);
        } catch (error) {
          console.error('[answerQuiz] Error:', error);
        }
      },

      openMiniQuiz: (wordId) => set({ miniQuizFor: wordId }),

      // 📊 Anlık quiz stat güncelleme (MiniQuiz yarıda bırakma için)
      updateQuizStat: (wordId, correct) => {
        const state = get();

        const normalWord = state.farm.find(f => f.id === wordId);
        const phrasalWord = state.phrasalVerbFarm.find(f => f.id === wordId);
        const inventoryWord = state.inventory.find(f => f.id === wordId);
        const phrasalInventoryWord = state.phrasalVerbInventory.find(f => f.id === wordId);

        if (normalWord) {
          set(state => ({
            farm: state.farm.map(f => f.id === wordId ? {
              ...f,
              quizCorrect: (f.quizCorrect || 0) + (correct ? 1 : 0),
              quizWrong: (f.quizWrong || 0) + (correct ? 0 : 1),
            } : f),
          }));
        } else if (phrasalWord) {
          set(state => ({
            phrasalVerbFarm: state.phrasalVerbFarm.map(f => f.id === wordId ? {
              ...f,
              quizCorrect: (f.quizCorrect || 0) + (correct ? 1 : 0),
              quizWrong: (f.quizWrong || 0) + (correct ? 0 : 1),
            } : f),
          }));
        } else if (inventoryWord) {
          set(state => ({
            inventory: state.inventory.map(f => f.id === wordId ? {
              ...f,
              quizCorrect: (f.quizCorrect || 0) + (correct ? 1 : 0),
              quizWrong: (f.quizWrong || 0) + (correct ? 0 : 1),
            } : f),
          }));
        } else if (phrasalInventoryWord) {
          set(state => ({
            phrasalVerbInventory: state.phrasalVerbInventory.map(f => f.id === wordId ? {
              ...f,
              quizCorrect: (f.quizCorrect || 0) + (correct ? 1 : 0),
              quizWrong: (f.quizWrong || 0) + (correct ? 0 : 1),
            } : f),
          }));
        }
      },

      answerMiniQuiz: (wordId, correct, correctCount = 1) => {
        try {
        const state = get();

        //  Önce AKTİF (görünür) kartı bulmaya çalış, yoksa herhangi birini al (duplicate bug fix)
        const normalWord = state.farm.find(f => f.id === wordId && !(f as any).normalHarvested) || state.farm.find(f => f.id === wordId);
        const phrasalWord = state.phrasalVerbFarm.find(f => f.id === wordId && !(f as any).normalHarvested) || state.phrasalVerbFarm.find(f => f.id === wordId);
        //  INVENTORY'DE DE ARA! Yeşil kartlar envanterde olabilir!
        const foundInInventory = state.inventory.find(f => f.id === wordId);
        const foundInPhrasalInventory = state.phrasalVerbInventory.find(f => f.id === wordId);

        const farmWord = normalWord || phrasalWord || foundInInventory || foundInPhrasalInventory;
        if (!farmWord) {
          // console.log(' answerMiniQuiz: word not found!', wordId);
          return set({ miniQuizFor: undefined });
        }

        const isPhrasal = !!(phrasalWord || foundInPhrasalInventory);
        const isInInventory = !!(foundInInventory || foundInPhrasalInventory);

        type ExtraUpdater = Partial<FarmStore> | ((state: FarmStore) => Partial<FarmStore>);

        const resolveExtra = (extra: ExtraUpdater, state: FarmStore) =>
          typeof extra === 'function' ? extra(state) : extra;

        const updateWord = (updater: (word: WordModel) => WordModel, extra: ExtraUpdater = {}) => {
          if (isInInventory) {
            // 📦 ENVANTER'DEKİ KARTI GÜNCELLE!
            if (isPhrasal) {
              set(state => ({
                ...resolveExtra(extra, state),
                phrasalVerbInventory: state.phrasalVerbInventory.map(f => f.id === wordId ? updater(f) : f),
              }));
            } else {
              set(state => ({
                ...resolveExtra(extra, state),
                inventory: state.inventory.map(f => f.id === wordId ? updater(f) : f),
              }));
            }
          } else if (isPhrasal) {
            set(state => ({
              ...resolveExtra(extra, state),
              phrasalVerbFarm: state.phrasalVerbFarm.map(f => f.id === wordId ? updater(f) : f),
            }));
          } else {
            set(state => ({
              ...resolveExtra(extra, state),
              farm: state.farm.map(f => f.id === wordId ? updater(f) : f),
            }));
          }
        };

        const moveWordToInventory = (inventoryWord: WordModel, extra: ExtraUpdater = {}) => {
          // ⚠ NORMAL TARLA HASADI - Kelime farm'da KALIR ama normalHarvested: true olur
          // Normal tarlada GÖRÜNMEZ, ama yapbozda puzzleHarvested değilse GÖRÜNÜR!
          // YAPBOZ SİSTEMİ TAMAMEN BAIMSIZ - etkilenmez!

          if (isPhrasal) {
            set(state => ({
              ...resolveExtra(extra, state),
              // 🌾 Kelime farm'da KALIR - normalHarvested: true ile işaretle
              //  masterLevel ve wrongCount da güncellenir!
              phrasalVerbFarm: state.phrasalVerbFarm.map(f => f.id === wordId ? {
                ...f,
                normalHarvested: true, // Normal tarlada GÖRÜNMEZ!
                masterLevel: inventoryWord.masterLevel, //  MASTER LEVELİ GÜNCELLE!
                wrongCount: inventoryWord.wrongCount, //  Renk için wrongCount
                totalHarvests: inventoryWord.totalHarvests, // 📊 Toplam hasat
                // Yapboz için puzzleStats ve puzzleHarvested KORUNUYOR!
              } : f),
              phrasalVerbInventory: [...state.phrasalVerbInventory, inventoryWord],
            }));
          } else {
            set(state => ({
              ...resolveExtra(extra, state),
              // 🌾 Kelime farm'da KALIR - normalHarvested: true ile işaretle
              //  masterLevel ve wrongCount da güncellenir!
              farm: state.farm.map(f => f.id === wordId ? {
                ...f,
                normalHarvested: true, // Normal tarlada GÖRÜNMEZ!
                masterLevel: inventoryWord.masterLevel, //  MASTER LEVELİ GÜNCELLE!
                wrongCount: inventoryWord.wrongCount, //  Renk için wrongCount
                totalHarvests: inventoryWord.totalHarvests, // 📊 Toplam hasat
                // Yapboz için puzzleStats ve puzzleHarvested KORUNUYOR!
              } : f),
              inventory: [...state.inventory, inventoryWord],
              transferEvent: {
                id: `${wordId}-${Date.now()}`,
                type: 'harvest',
                wordId,
                wordText: farmWord.text || 'Kelime',
                from: 'farm',
                to: 'inventory',
                timestamp: Date.now(),
              },
            }));
          }
        };
        const masterLevel = farmWord.masterLevel || 0;
        const wrongCount = farmWord.wrongCount || 0;
        const currentStreak = farmWord.consecutiveCorrect || 0;

        // Streak hesaplama
        const globalStreak = correct ? state.streak + 1 : 0;
        const streakBonus = Math.floor(globalStreak / 5) * 10;

        //  YANLI CEVAP
        if (!correct) {
          //  MASTER KARTLAR SEVİYE DÜMEMELİ!
          if (masterLevel > 0) {
            // console.log(' Master kart yanlış cevap - seviye korunuyor, sessions reset!');
            updateWord(f => ({
              ...f,
              consecutiveCorrect: 0,
              consecutiveMasterSessions: 0, // Reset session progress on failure
              lastAnswerCorrect: false,
              // 📊 Quiz istatistikleri güncelle
              quizWrong: (f.quizWrong || 0) + 1,
            }), {
              streak: 0,
              bestStreak: Math.max(state.bestStreak, state.streak),
              miniQuizFor: undefined,
            });
            return;
          }

          //  TUTORIAL: Yeşil karttan kırmızıya düşen kart için session 1 yapacağız
          const isGreenCard = wrongCount >= 2; // wrongCount >= 2 = yeşil
          const isTutorialActive = state.tutorialStep !== 'COMPLETED' && state.tutorialStep !== 'NOT_STARTED';

          if (isGreenCard && isTutorialActive && !state.tutorialGreenCardSession) {
            // Orijinal session sayısını kaydet (normalde 3)
            set({ tutorialGreenCardSession: { wordId, originalSessions: TIER_SESSION_REQUIREMENTS[0] || 3 } });
          }

          //  YANLI CEVAP = BİR ÖNCEKİ SEVİYEYE DÜ!
          // Yeşil -> Sarı, Sarı -> Kırmızı (wrongCount - 1)
          const newColorLevel = Math.max(0, wrongCount - 1); // Bir önceki seviyeye düş

          updateWord(f => ({
            ...f,
            wrongCount: newColorLevel,
            consecutiveCorrect: 0,
            consecutiveMasterSessions: 0, // Reset session progress
            lastAnswerCorrect: false,
            // 📊 Quiz istatistikleri güncelle
            quizWrong: (f.quizWrong || 0) + 1,
          }), {
            streak: 0,
            bestStreak: Math.max(state.bestStreak, state.streak),
            miniQuizFor: undefined,
          });
          return;
        }

        //  DORU CEVAP - correctCount kadar streak ekle
        const actualCorrectCount = correctCount || 1;
        const newStreak = currentStreak + actualCorrectCount;

        // Renk belirleme: YENİ SİSTEM - colorLevel 0=red, 1=yellow, 2+=green (TURUNCU KALDIRILDI)
        const getCurrentColor = (level: number) => {
          if (level >= 2) return 'green';
          if (level >= 1) return 'yellow';
          return 'red';
        };

        const currentColor = getCurrentColor(wrongCount);
        // console.log('✅ Doğru cevap! Streak:', newStreak, 'Renk:', currentColor, 'WrongCount:', wrongCount);

        // Yeşil kart (colorLevel>=2) veya master kartlar - 3 streak ile başarılı session
        if (currentColor === 'green' || masterLevel > 0) {
          if (newStreak >= 3) {
            //  BAARILI SESSİON! consecutiveMasterSessions artır + meyve büyüt
            const currentSessions = farmWord.consecutiveMasterSessions || 0;
            const newSessions = currentSessions + 1;

            //  HASAT HAZIR MI? - Her tier için farklı session gerekli:
            // Yeşil (masterLevel 0) → Master: 3 session
            // Master (masterLevel 1) → Ultra: 4 session  
            // Ultra (masterLevel 2) → Perfect: 5 session
            // Perfect (masterLevel 3): İLK HASAT için 6 SESSION, ÖDÜL ALINDIKTAN SONRA 1 SESSION!

            //  TUTORIAL ÖZEL: tutorialFirstWrongWord için yeşil karttan master'a 1 session yeterli
            const isTutorialActive = state.tutorialStep !== 'COMPLETED' && state.tutorialStep !== 'NOT_STARTED';
            const isTutorialCard = isTutorialActive && state.tutorialFirstWrongWord?.id === wordId;

            // Tutorial'da ve bu tutorial kartıysa: 1 session, değilse normal
            const baseSessions = (isTutorialCard && masterLevel === 0) ? 1 : (TIER_SESSION_REQUIREMENTS[masterLevel] || 3);
            // 👑 Perfect kart ve ödül alındıysa 1 session yeterli!
            const requiredSessions = (masterLevel === 3 && farmWord.rewardClaimedPerfect) ? 1 : baseSessions;
            // 🌾 Tüm kartlar hasat edilebilir! Perfect dahil (masterLevel <= 3)
            const isNowHarvestReady = newSessions >= requiredSessions;

            //  Meyve büyüme aşamasını hesapla (tier'a göre değişen session sayısına göre)
            const newGrowthStage = calculateFruitGrowthStage(newSessions, requiredSessions);

            //  Meyve tipini belirle (ilk kez yeşilden master'a geçerken)
            const isPhrasal = !!farmWord.isPhrasalVerb;
            const fruitType = farmWord.fruitType || getFruitType(farmWord.difficulty, isPhrasal);

            // Session başarılı - meyve büyüdü, belki hasat hazır
            updateWord(f => ({
              ...f,
              consecutiveCorrect: 0, // Reset streak after successful session
              consecutiveMasterSessions: newSessions,
              correctCount: (f.correctCount || 0) + actualCorrectCount,
              lastAnswerCorrect: true,
              //  Meyve sistemi
              fruitType: fruitType,
              fruitGrowthStage: newGrowthStage,
              isHarvestReady: isNowHarvestReady,
              // 📊 Quiz istatistikleri güncelle
              quizCorrect: (f.quizCorrect || 0) + actualCorrectCount,
            }), state => ({
              xp: state.xp + 35 + streakBonus,
              coins: state.coins + 5,
              lifetimeCoins: state.lifetimeCoins + 5,
              streak: globalStreak,
              bestStreak: Math.max(state.bestStreak, globalStreak),
              miniQuizFor: undefined,
            }));
          } else {
            // Yeşil ama henüz 3 streak değil
            updateWord(f => ({
              ...f,
              consecutiveCorrect: newStreak,
              correctCount: (f.correctCount || 0) + actualCorrectCount,
              lastAnswerCorrect: true,
              // 📊 Quiz istatistikleri güncelle
              quizCorrect: (f.quizCorrect || 0) + actualCorrectCount,
            }), state => ({
              xp: state.xp + 35 + streakBonus,
              coins: state.coins + 5,
              lifetimeCoins: state.lifetimeCoins + 5,
              streak: globalStreak,
              bestStreak: Math.max(state.bestStreak, globalStreak),
              miniQuizFor: undefined,
            }));
          }
        } else {
          //  Kırmızı/Sarı kartlar - SESSION bazlı ilerleme
          // Kırmızı: 1 session (3 doğru) → Sarı
          // Sarı: 2 session (6 doğru) → Yeşil
          // Session = 3 doğru cevap art arda (streak)
          if (newStreak >= 3) {
            // ✅ Session tamamlandı!
            const currentSessions = farmWord.consecutiveMasterSessions || 0;
            const newSessions = currentSessions + 1;

            //  TUTORIAL ÖZEL: tutorialFirstWrongWord için tüm session gereksinimleri 1
            const isTutorialActive = state.tutorialStep !== 'COMPLETED' && state.tutorialStep !== 'NOT_STARTED';
            const isTutorialCard = isTutorialActive && state.tutorialFirstWrongWord?.id === wordId;

            // Kırmızı = 1 session gerekli, Sarı = 2 session gerekli (Tutorial'da hep 1)
            const requiredSessionsForColor = isTutorialCard ? 1 : (wrongCount === 0 ? 1 : 2);

            if (newSessions >= requiredSessionsForColor) {
              // Yeterli session tamamlandı! Sonraki renge geç
              const newColorLevel = Math.min(2, wrongCount + 1);

              updateWord(f => ({
                ...f,
                wrongCount: newColorLevel,
                consecutiveCorrect: 0, // Session bitti, streak sıfırla
                consecutiveMasterSessions: 0, // Yeni renkte session sıfırla
                correctCount: (f.correctCount || 0) + actualCorrectCount,
                lastAnswerCorrect: true,
                // 📊 Quiz istatistikleri güncelle
                quizCorrect: (f.quizCorrect || 0) + actualCorrectCount,
              }), state => ({
                xp: state.xp + 50 + streakBonus,
                coins: state.coins + 5,
                lifetimeCoins: state.lifetimeCoins + 5,
                streak: globalStreak,
                bestStreak: Math.max(state.bestStreak, globalStreak),
                miniQuizFor: undefined,
              }));
            } else {
              // Session tamamlandı ama henüz yeterli değil, session sayısını artır
              updateWord(f => ({
                ...f,
                consecutiveCorrect: 0, // Streak sıfırla (yeni session başlayacak)
                consecutiveMasterSessions: newSessions, // Session sayısını artır
                correctCount: (f.correctCount || 0) + actualCorrectCount,
                lastAnswerCorrect: true,
                quizCorrect: (f.quizCorrect || 0) + actualCorrectCount,
              }), state => ({
                xp: state.xp + 35 + streakBonus,
                coins: state.coins + 5,
                lifetimeCoins: state.lifetimeCoins + 5,
                streak: globalStreak,
                bestStreak: Math.max(state.bestStreak, globalStreak),
                miniQuizFor: undefined,
              }));
            }
          } else {
            // Aynı renkte kal, streak artır (session ilerliyor)
            updateWord(f => ({
              ...f,
              consecutiveCorrect: newStreak,
              correctCount: (f.correctCount || 0) + actualCorrectCount,
              lastAnswerCorrect: true,
              // 📊 Quiz istatistikleri güncelle
              quizCorrect: (f.quizCorrect || 0) + actualCorrectCount,
            }), state => ({
              xp: state.xp + 15 + streakBonus,
              coins: state.coins + 2,
              lifetimeCoins: state.lifetimeCoins + 2,
              streak: globalStreak,
              bestStreak: Math.max(state.bestStreak, globalStreak),
              miniQuizFor: undefined,
            }));
          }
        }

        debouncedCheckAchievements(get);
        } catch (error) {
          console.error('[answerMiniQuiz] Error:', error);
          set({ miniQuizFor: undefined });
        }
      },

      reviewFromInventory: (wordId) => {
        const state = get();
        const normalWord = state.inventory.find(w => w.id === wordId);
        const phrasalWord = state.phrasalVerbInventory.find(w => w.id === wordId);
        const target = normalWord || phrasalWord;
        if (!target) return;

        const reviewed = {
          ...target,
          level: 1,
          wrongCount: 0,
          consecutiveCorrect: 0,
        };

        if (phrasalWord) {
          set(state => ({
            phrasalVerbInventory: state.phrasalVerbInventory.filter(w => w.id !== wordId),
            phrasalVerbFarm: [...state.phrasalVerbFarm, reviewed],
          }));
        } else {
          set(state => ({
            inventory: state.inventory.filter(w => w.id !== wordId),
            farm: [...state.farm, reviewed],
          }));
        }
      },

      // 🌱 Envanterden tarlaya dik (plant) - NORMAL + PHRASAL VERB SUPPORT
      plantFromInventory: (wordId) => {
        const safeWordId = typeof wordId === 'string' ? wordId.trim() : '';
        if (!safeWordId) return;
        if (_plantInFlight.has(safeWordId)) return;
        _plantInFlight.add(safeWordId);

        try {
          const state = get();
          const normalWord = state.inventory.find(w => w.id === safeWordId);
          const phrasalWord = state.phrasalVerbInventory.find(w => w.id === safeWordId);
          const word = normalWord || phrasalWord;
          if (!word) return;

          const isPhrasal = !!phrasalWord;
          const isPuzzleHarvested = (word as any).isPuzzleHarvested === true;

          const masterLevel = (word as any).masterLevel || 0;
          let plantRewardCoin = 0;
          let plantRewardXp = 0;

          if (masterLevel >= 3) {
            plantRewardCoin = 150;
            plantRewardXp = 150;
          } else if (masterLevel >= 2) {
            plantRewardCoin = 100;
            plantRewardXp = 100;
          } else if (masterLevel >= 1) {
            plantRewardCoin = 50;
            plantRewardXp = 50;
          }

          if (plantRewardCoin > 0) {
            set(s => ({
              coins: s.coins + plantRewardCoin,
              xp: s.xp + plantRewardXp,
            }));
          }

          if (isPuzzleHarvested) {
            const originalWordId = (word as any).originalWordId || safeWordId.replace(/-puzzle-.*$/, '');
            const puzzleStats = (word as any).puzzleStats || { sessions: 0, totalCorrect: 0, totalWrong: 0, consecutiveCorrect: 0, puzzleMasterLevel: 0, puzzleTotalHarvests: 0 };

            const resetPuzzleStats = {
              sessions: 0,
              totalCorrect: puzzleStats.totalCorrect || 0,
              totalWrong: puzzleStats.totalWrong || 0,
              consecutiveCorrect: 0,
              puzzleMasterLevel: puzzleStats.puzzleMasterLevel || 0,
              puzzleTotalHarvests: puzzleStats.puzzleTotalHarvests || 0,
            };

            if (isPhrasal) {
              const originalExists = state.phrasalVerbFarm.some(f => f.id === originalWordId);

              if (originalExists) {
                set(state => {
                  const originalWord = state.phrasalVerbFarm.find(f => f.id === originalWordId);
                  if (!originalWord) return state;

                  const updatedWord = {
                    ...originalWord,
                    puzzleHarvested: false,
                    puzzleStats: resetPuzzleStats,
                    lastPlantedAt: Date.now(),
                  };

                  const filteredFarm = state.phrasalVerbFarm.filter(f => f.id !== originalWordId);
                  return {
                    phrasalVerbInventory: state.phrasalVerbInventory.filter(w => w.id !== safeWordId),
                    phrasalVerbFarm: [updatedWord, ...filteredFarm],
                  };
                });
              } else {
                const newPuzzleWord = {
                  ...word,
                  id: originalWordId,
                  puzzleHarvested: false,
                  puzzleStats: resetPuzzleStats,
                  forPuzzleOnly: true,
                  masterLevel: 0,
                  consecutiveCorrect: 0,
                  consecutiveMasterSessions: 0,
                  level: 1,
                  lastPlantedAt: Date.now(),
                };
                set(state => ({
                  phrasalVerbInventory: state.phrasalVerbInventory.filter(w => w.id !== safeWordId),
                  phrasalVerbFarm: [newPuzzleWord, ...state.phrasalVerbFarm],
                }));
              }
            } else {
              const originalExists = state.farm.some(f => f.id === originalWordId);

              if (originalExists) {
                set(state => {
                  const originalWord = state.farm.find(f => f.id === originalWordId);
                  if (!originalWord) return state;

                  const updatedWord = {
                    ...originalWord,
                    puzzleHarvested: false,
                    puzzleStats: resetPuzzleStats,
                    lastPlantedAt: Date.now(),
                  };

                  const filteredFarm = state.farm.filter(f => f.id !== originalWordId);
                  return {
                    inventory: state.inventory.filter(w => w.id !== safeWordId),
                    farm: [updatedWord, ...filteredFarm],
                  };
                });
              } else {
                const newPuzzleWord = {
                  ...word,
                  id: originalWordId,
                  puzzleHarvested: false,
                  puzzleStats: resetPuzzleStats,
                  forPuzzleOnly: true,
                  masterLevel: 0,
                  consecutiveCorrect: 0,
                  consecutiveMasterSessions: 0,
                  level: 1,
                  lastPlantedAt: Date.now(),
                };
                set(state => ({
                  inventory: state.inventory.filter(w => w.id !== safeWordId),
                  farm: [newPuzzleWord, ...state.farm],
                }));
              }
            }
            return;
          }

          const targetId = word.originalWordId || safeWordId;

          const existingInFarm = isPhrasal
            ? state.phrasalVerbFarm.find(f => f.id === targetId)
            : state.farm.find(f => f.id === targetId);

          if (existingInFarm) {
            if (isPhrasal) {
              set(state => ({
                phrasalVerbInventory: state.phrasalVerbInventory.filter(w => w.id !== safeWordId),
                phrasalVerbFarm: state.phrasalVerbFarm.map(f => f.id === targetId ? {
                  ...f,
                  normalHarvested: false,
                  totalHarvests: Math.max(f.totalHarvests || 0, word.totalHarvests || 0),
                  consecutiveCorrect: 0,
                  consecutiveMasterSessions: 0,
                  lastPlantedAt: Date.now(),
                } : f),
                transferEvent: {
                  id: `${safeWordId}-${Date.now()}`,
                  type: 'plant',
                  wordId: safeWordId,
                  wordText: word.text || 'Kelime',
                  from: 'phrasalVerbInventory',
                  to: 'phrasalVerbFarm',
                  timestamp: Date.now(),
                },
              }));
            } else {
              set(state => ({
                inventory: state.inventory.filter(w => w.id !== safeWordId),
                farm: state.farm.map(f => f.id === targetId ? {
                  ...f,
                  normalHarvested: false,
                  totalHarvests: Math.max(f.totalHarvests || 0, word.totalHarvests || 0),
                  level: 1,
                  consecutiveCorrect: 0,
                  consecutiveMasterSessions: 0,
                  lastPlantedAt: Date.now(),
                } : f),
                transferEvent: {
                  id: `${safeWordId}-${Date.now()}`,
                  type: 'plant',
                  wordId: safeWordId,
                  wordText: word.text || 'Kelime',
                  from: 'inventory',
                  to: 'farm',
                  timestamp: Date.now(),
                },
              }));
            }
            return;
          }

          const newWord = {
            ...word,
            level: 1,
            wrongCount: word.wrongCount || 0,
            consecutiveCorrect: 0,
            consecutiveMasterSessions: 0,
            streak: 0,
            lastPlantedAt: Date.now(),
            plantedFromInventory: true,
            excludeFromPuzzle: true,
          };

          if (isPhrasal) {
            set(state => ({
              phrasalVerbInventory: state.phrasalVerbInventory.filter(w => w.id !== safeWordId),
              phrasalVerbFarm: [newWord, ...state.phrasalVerbFarm],
              transferEvent: {
                id: `${safeWordId}-${Date.now()}`,
                type: 'plant',
                wordId: safeWordId,
                wordText: word.text || 'Kelime',
                from: 'phrasalVerbInventory',
                to: 'phrasalVerbFarm',
                timestamp: Date.now(),
              },
            }));
          } else {
            set(state => ({
              inventory: state.inventory.filter(w => w.id !== safeWordId),
              farm: [newWord, ...state.farm],
              transferEvent: {
                id: `${safeWordId}-${Date.now()}`,
                type: 'plant',
                wordId: safeWordId,
                wordText: word.text || 'Kelime',
                from: 'inventory',
                to: 'farm',
                timestamp: Date.now(),
              },
            }));
          }
        } catch (error) {
          console.error('[plantFromInventory] Error:', error);
        } finally {
          _plantInFlight.delete(safeWordId);
        }
      },

      consumeTransferEvent: () => set({ transferEvent: undefined }),

      //  SERİ (STREAK) SİSTEMİ - TAKVİM GÜNÜ BAZLI (00:00'da yenilenir)
      checkDailyStreak: () => {
        const { lastStreakCheckDate, dailyStreak, user } = get();
        
        // Bugünün tarihi (YYYY-MM-DD formatında, lokal timezone)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        //  Bugün zaten kontrol edilmiş mi?
        if (lastStreakCheckDate === todayStr) {
          return { isNewDay: false, currentStreak: dailyStreak, reward: 0, alreadyChecked: true };
        }
        
        // Firebase sync helper - setTimeout ile sarmalı, hatada crash yapmasın
        const syncToFirebase = (streak: number, coins: number) => {
          setTimeout(() => {
            if (!user?.odId) return;
            import('../utils/firebase').then(({ createOrUpdateUserProfile }) => {
              createOrUpdateUserProfile(user.odId, { streak, coins }).catch(() => {});
            }).catch(() => {});
          }, 100);
        };
        
        // 📅 İlk giriş durumu (hiç kontrol edilmemiş)
        if (!lastStreakCheckDate) {
          const reward = 15; // İlk gün ödülü
          const newCoins = get().coins + reward;
          set(state => ({
            dailyStreak: 1,
            lastStreakCheckDate: todayStr,
            coins: newCoins,
            lifetimeCoins: state.lifetimeCoins + reward,
          }));
          syncToFirebase(1, newCoins);
          return { isNewDay: true, currentStreak: 1, reward, alreadyChecked: false };
        }
        
        // 📆 Tarih farkını hesapla
        const [lastYear, lastMonth, lastDay] = lastStreakCheckDate.split('-').map(Number);
        const lastDate = new Date(lastYear, lastMonth - 1, lastDay);
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Gün farkı (takvim günü bazlı)
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Durum 1: Ardışık gün (dün giriş yapılmış) → streak artır
        if (diffDays === 1) {
          const newStreak = dailyStreak + 1;
          const reward = 10 + (newStreak * 5); // Base 10 + (streak * 5)
          const newCoins = get().coins + reward;
          
          set(state => ({
            dailyStreak: newStreak,
            lastStreakCheckDate: todayStr,
            coins: newCoins,
            lifetimeCoins: state.lifetimeCoins + reward,
          }));
          
          syncToFirebase(newStreak, newCoins);
          return { isNewDay: true, currentStreak: newStreak, reward, alreadyChecked: false };
        }
        
        // Durum 2: 2+ gün geçmiş → streak kırıldı, 1'den başla
        const reward = 15; // Yeni başlangıç ödülü
        const newCoins = get().coins + reward;
        set(state => ({
          dailyStreak: 1,
          lastStreakCheckDate: todayStr,
          coins: newCoins,
          lifetimeCoins: state.lifetimeCoins + reward,
        }));
        
        syncToFirebase(1, newCoins);
        return { isNewDay: true, currentStreak: 1, reward, alreadyChecked: false };
      },

      // 🧩 YAPBOZ VE SESYAP SKORLARI
      addPuzzleScore: (points: number) => {
        const safePoints = toSafePositiveInt(points);
        if (safePoints <= 0) return;

        const newScore = toSafeNumber(get().puzzleScore, 0) + safePoints;
        set({ puzzleScore: newScore });

        // Firebase'e sync - cached, güvenli
        const user = get().user;
        if (user?.odId) {
          setTimeout(() => safeSyncFirebase(user.odId, { puzzleScore: newScore }), 100);
        }
      },

      addSesyapScore: (points: number) => {
        const safePoints = toSafePositiveInt(points);
        if (safePoints <= 0) return;

        const newScore = toSafeNumber(get().sesyapScore, 0) + safePoints;
        set({ sesyapScore: newScore });

        // Firebase'e sync - cached, güvenli
        const user = get().user;
        if (user?.odId) {
          setTimeout(() => safeSyncFirebase(user.odId, { sesyapScore: newScore }), 100);
        }
      },

      addSesyapHistory: (entry) => {
        let guidedCompletedPayload: { wordId?: string; wordText?: string } | null = null;

        set(state => {
          const incomingWord = toSafeLowerText(entry?.word);
          if (!incomingWord) {
            return state;
          }

          const safeEntry = {
            word: typeof entry?.word === 'string' ? entry.word.trim() : '',
            meaning_tr: typeof entry?.meaning_tr === 'string' ? entry.meaning_tr.trim() : '',
            example_en: typeof entry?.example_en === 'string' ? entry.example_en.trim() : '',
            example_tr: typeof entry?.example_tr === 'string' ? entry.example_tr.trim() : '',
            correct: !!entry?.correct,
            timestamp: toSafeNumber(entry?.timestamp, Date.now()),
          };
          const safeEntryWordId = typeof entry?.wordId === 'string' ? entry.wordId.trim() : '';
          const guidedTargetMatched = isGuidedTargetMatch(
            state.guidedModeTargetWordId,
            state.guidedModeTargetWordText,
            safeEntryWordId || undefined,
            safeEntry.word
          );

          const guidedCompleted =
            state.guidedModeActive &&
            state.guidedModeStep === 'SESYAP_PRACTICE' &&
            safeEntry.correct &&
            guidedTargetMatched;
          if (guidedCompleted) {
            guidedCompletedPayload = {
              wordId: safeEntryWordId || state.guidedModeTargetWordId,
              wordText: normalizeDisplayText(safeEntry.word || state.guidedModeTargetWordText),
            };
          } else if (
            state.guidedModeActive &&
            state.guidedModeStep === 'SESYAP_PRACTICE' &&
            safeEntry.correct
          ) {
            traceEvent('guided_mode_step_blocked', {
              from: 'SESYAP_PRACTICE',
              to: 'COMPLETED',
              wordId: safeEntryWordId,
              wordText: normalizeDisplayText(safeEntry.word),
              targetWordId: state.guidedModeTargetWordId,
              targetWordText: state.guidedModeTargetWordText,
            }, 'warn');
          }

          const safeHistory = Array.isArray(state.sesyapHistory) ? state.sesyapHistory : [];
          // Aynı kelime zaten varsa güncelle, yoksa ekle
          const existingIndex = safeHistory.findIndex(
            item => toSafeLowerText(item?.word) === incomingWord
          );

          let newHistory: typeof state.sesyapHistory;
          if (existingIndex !== -1) {
            // Kelime zaten var - durumu güncelle
            newHistory = [...safeHistory];
            newHistory[existingIndex] = {
              ...newHistory[existingIndex],
              word: safeEntry.word || newHistory[existingIndex]?.word || '',
              meaning_tr: safeEntry.meaning_tr || newHistory[existingIndex]?.meaning_tr || '',
              example_en: safeEntry.example_en || newHistory[existingIndex]?.example_en || '',
              example_tr: safeEntry.example_tr || newHistory[existingIndex]?.example_tr || '',
              correct: safeEntry.correct, // Son durumu yaz
              timestamp: safeEntry.timestamp,
            };
          } else {
            // Yeni kelime - ekle
            newHistory = [...safeHistory, safeEntry];
          }

          // Performans için son 50 kaydı tut
          if (newHistory.length > 50) {
            return {
              sesyapHistory: newHistory.slice(newHistory.length - 50),
              ...(guidedCompleted
                ? {
                    guidedModeActive: false,
                    guidedModeStep: 'COMPLETED' as GuidedModeStep,
                    guidedModeTargetWordId: undefined,
                    guidedModeTargetWordText: undefined,
                  }
                : {}),
            };
          }
          return {
            sesyapHistory: newHistory,
            ...(guidedCompleted
              ? {
                  guidedModeActive: false,
                  guidedModeStep: 'COMPLETED' as GuidedModeStep,
                  guidedModeTargetWordId: undefined,
                  guidedModeTargetWordText: undefined,
                }
              : {}),
          };
        });

        if (guidedCompletedPayload !== null) {
          const payload = guidedCompletedPayload as { wordId?: string; wordText?: string };
          traceEvent('guided_mode_step', {
            from: 'SESYAP_PRACTICE',
            to: 'COMPLETED',
            wordId: payload.wordId,
            wordText: payload.wordText,
          });
          traceEvent('guided_mode_completed', { source: 'sesyap' });
        } else if (entry?.correct && get().guidedModeStep === 'COMPLETED') {
          traceEvent('guided_mode_completed', { source: 'sesyap' });
        }
      },

      clearSesyapHistory: () => {
        set({ sesyapHistory: [] });
      },

      //  GÜNLÜK GÖREVLER Actions
      generateDailyQuests: () => {
        const startedAt = Date.now();
        if (dailyQuestGenerationInFlight) {
          traceEvent('daily_quests_generate_skipped', { reason: 'in_flight' }, 'warn');
          return;
        }
        if (startedAt - lastDailyQuestGenerationAt < 2500) {
          traceEvent('daily_quests_generate_skipped', { reason: 'throttle' }, 'warn');
          return;
        }
        dailyQuestGenerationInFlight = true;
        try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const state = get();

        // Bugün zaten unclaimed görevler var mı kontrol et
        const safeDailyQuests = Array.isArray(state.dailyQuests) ? state.dailyQuests : [];
        const unclaimedQuests = safeDailyQuests.filter(q => q && typeof q === 'object' && q.date === today && !q.claimed);
        if (unclaimedQuests.length > 0) {
          traceEvent('daily_quests_generate_skipped', { reason: 'has_unclaimed', count: unclaimedQuests.length });
          return; // Zaten bugünün claimed olmayan görevleri var
        }

        //  42 KAPSAMLI GÖREV PROFİLİ - 6 haftalık rotasyon
        // Profil 0-13: Kolay (4 görev)
        // Profil 14-27: Orta (5 görev)  
        // Profil 28-41: Zor (6 görev)
        type QuestDef = { type: QuestType; title: string; description: string; icon: string; target: number; reward: { trophy: number; coins: number; xp: number }; screen: string; hint: string };

        const questProfiles: QuestDef[][] = [
          // 
          // 🌱 KOLAY PROFİLLER (0-13) - 4 görev, düşük hedefler
          // 

          // Profil 0: Yeni Başlayanlar (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 5 soruya cevap ver', icon: '📝', target: 5, reward: { trophy: 20, coins: 600, xp: 240 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 3 yeni kelime öğren', icon: '🌱', target: 3, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 50 coin kazan', icon: '💰', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çöz ve kelime hasat et!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 1 cümleyi mükemmel söyle', icon: '🎤', target: 1, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 1: Dengeli (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'MATCH_WORDS', title: '🔗 Kelime Eşleştir', description: 'Pratik Merkezi\'nde 5 kelime eşleştir', icon: '🔗', target: 5, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'WordMatch', hint: 'Ana sayfada Pratik Merkezi\'ne git!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 2: Hasat Odaklı (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 6 soruya cevap ver', icon: '📝', target: 6, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 2 oyun bitir', icon: '🧩', target: 2, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 2 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 2, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
          ],
          // Profil 3: Quiz Odaklı (Kolay)
          [
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 600, xp: 240 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'FILL_BLANK', title: '📝 Boşluk Doldur', description: 'Pratik Merkezi\'nde 5 boşluk doldur', icon: '📝', target: 5, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'FillBlank', hint: 'at/in/on kullanımını öğren!' },
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 6 doğru cevap ver', icon: '🔥', target: 6, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
          ],
          // Profil 4: Phrasal Odaklı (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 7 soruya cevap ver', icon: '📝', target: 7, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 2 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 2, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 1 kartı hasat et', icon: '📚', target: 1, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
          ],
          // Profil 5: Yapboz Odaklı (Kolay)
          [
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 600, xp: 240 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'LEARN_COLLOCATIONS', title: '💬 Tamlama Öğren', description: 'Pratik Merkezi\'nde 5 tamlama öğren', icon: '💬', target: 5, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Collocations', hint: 'make a decision, heavy rain... gibi tamlamalar!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 1 cümleyi mükemmel söyle', icon: '🎤', target: 1, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 3 oyun bitir', icon: '🧩', target: 3, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git ve cümleleri tamamla!' },
          ],
          // Profil 6: Dengeli (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 6 soruya cevap ver', icon: '📝', target: 6, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'LEARN_IDIOMS', title: '🎭 Deyim Öğren', description: 'Pratik Merkezi\'nde 5 deyim öğren', icon: '🎭', target: 5, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Idioms', hint: 'break the ice, piece of cake... gibi deyimler!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 1 cümleyi mükemmel söyle', icon: '🎤', target: 1, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 7: Combo Odaklı (Kolay)
          [
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 3 yeni kelime öğren', icon: '🌱', target: 3, reward: { trophy: 20, coins: 600, xp: 240 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'MATCH_WORDS', title: '🔗 Kelime Eşleştir', description: 'Pratik Merkezi\'nde 8 kelime eşleştir', icon: '🔗', target: 8, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'WordMatch', hint: 'Ana sayfada Pratik Merkezi\'ne git!' },
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 7 doğru cevap ver', icon: '🔥', target: 7, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
          ],
          // Profil 8: Ses Odaklı (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 6 soruya cevap ver', icon: '📝', target: 6, reward: { trophy: 20, coins: 600, xp: 240 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 3 yeni kelime öğren', icon: '🌱', target: 3, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 50 coin kazan', icon: '💰', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap - her aktivite coin kazandırır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 40, coins: 1600, xp: 640 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 9: Hasat Festivali (Kolay)
          [
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 2 oyun bitir', icon: '🧩', target: 2, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 1 cümleyi mükemmel söyle', icon: '🎤', target: 1, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 3 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 3, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 1 kartı hasat et', icon: '📚', target: 1, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
          ],
          // Profil 10: Battle Odaklı (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 5 doğru cevap ver', icon: '🔥', target: 5, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakibini yenerek 1 maç kazan', icon: '⚔️', target: 1, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
          // Profil 11: Coin Odaklı (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 2 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 2, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 1 cümleyi mükemmel söyle', icon: '🎤', target: 1, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 100 coin kazan', icon: '💰', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap, konuş - her aktivite coin kazandırır!' },
          ],
          // Profil 12: Hafta Sonu (Kolay)
          [
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 3 yeni kelime öğren', icon: '🌱', target: 3, reward: { trophy: 20, coins: 600, xp: 240 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'FILL_BLANK', title: '📝 Boşluk Doldur', description: 'Pratik Merkezi\'nde 8 boşluk doldur', icon: '📝', target: 8, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'FillBlank', hint: 'at/in/on kullanımını öğren!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 2 oyun bitir', icon: '🧩', target: 2, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 13: Tüm Modlar (Kolay)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 5 soruya cevap ver', icon: '📝', target: 5, reward: { trophy: 20, coins: 600, xp: 240 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'MATCH_WORDS', title: '🔗 Kelime Eşleştir', description: 'Pratik Merkezi\'nde 6 kelime eşleştir', icon: '🔗', target: 6, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'WordMatch', hint: 'Ana sayfada Pratik Merkezi\'ne git!' },
            { type: 'FILL_BLANK', title: '📝 Boşluk Doldur', description: 'Pratik Merkezi\'nde 5 boşluk doldur', icon: '📝', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'FillBlank', hint: 'at/in/on kullanımını öğren!' },
            { type: 'LEARN_IDIOMS', title: '🎭 Deyim Öğren', description: 'Pratik Merkezi\'nde 3 deyim öğren', icon: '🎭', target: 3, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Idioms', hint: 'break the ice, piece of cake... gibi deyimler!' },
          ],

          // 
          // ⚡ ORTA PROFİLLER (14-27) - 5 görev, orta hedefler
          // 

          // Profil 14: Dengeli (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 12 soruya cevap ver', icon: '📝', target: 12, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'LEARN_COLLOCATIONS', title: '💬 Tamlama Öğren', description: 'Pratik Merkezi\'nde 8 tamlama öğren', icon: '💬', target: 8, reward: { trophy: 20, coins: 1300, xp: 520 }, screen: 'Collocations', hint: 'make a decision, heavy rain... gibi tamlamalar!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 4 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'MATCH_WORDS', title: '🔗 Kelime Eşleştir', description: 'Pratik Merkezi\'nde 10 kelime eşleştir', icon: '🔗', target: 10, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'WordMatch', hint: 'Ana sayfada Pratik Merkezi\'ne git!' },
          ],
          // Profil 15: Ses Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'FILL_BLANK', title: '📝 Boşluk Doldur', description: 'Pratik Merkezi\'nde 10 boşluk doldur', icon: '📝', target: 10, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'FillBlank', hint: 'at/in/on kullanımını öğren!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 3 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 3, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 4 cümleyi mükemmel söyle', icon: '🎤', target: 4, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 16: Battle Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 15 soruya cevap ver', icon: '📝', target: 15, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 10 doğru cevap ver', icon: '🔥', target: 10, reward: { trophy: 20, coins: 1300, xp: 520 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakibini yenerek 1 maç kazan', icon: '⚔️', target: 1, reward: { trophy: 40, coins: 2400, xp: 960 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
          // Profil 17: Phrasal Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 3 oyun bitir', icon: '🧩', target: 3, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 3 kartı hasat et', icon: '📚', target: 3, reward: { trophy: 40, coins: 2200, xp: 880 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
          ],
          // Profil 18: Yapboz Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 3 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 3, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 4 oyun bitir', icon: '🧩', target: 4, reward: { trophy: 40, coins: 1800, xp: 720 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git ve cümleleri tamamla!' },
          ],
          // Profil 19: Combo Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 3 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 3, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 12 doğru cevap vererek combo yap', icon: '🔥', target: 12, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
          ],
          // Profil 20: Hasat Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 3 oyun bitir', icon: '🧩', target: 3, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 5 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 5, reward: { trophy: 40, coins: 2200, xp: 880 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
          ],
          // Profil 21: Coin Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 12 soruya cevap ver', icon: '📝', target: 12, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'LEARN_IDIOMS', title: '🎭 Deyim Öğren', description: 'Pratik Merkezi\'nde 8 deyim öğren', icon: '🎭', target: 8, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Idioms', hint: 'break the ice, piece of cake... gibi deyimler!' },
            { type: 'MATCH_WORDS', title: '🔗 Kelime Eşleştir', description: 'Pratik Merkezi\'nde 12 kelime eşleştir', icon: '🔗', target: 12, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'WordMatch', hint: 'Ana sayfada Pratik Merkezi\'ne git!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'LEARN_COLLOCATIONS', title: '💬 Tamlama Öğren', description: 'Pratik Merkezi\'nde 10 tamlama öğren', icon: '💬', target: 10, reward: { trophy: 40, coins: 1500, xp: 600 }, screen: 'Collocations', hint: 'make a decision, heavy rain... gibi tamlamalar!' },
          ],
          // Profil 22: Battle Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 8 doğru cevap ver', icon: '🔥', target: 8, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakibini yenerek 1 maç kazan', icon: '⚔️', target: 1, reward: { trophy: 40, coins: 2400, xp: 960 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
          // Profil 23: Dengeli (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 3 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 3, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 3 oyun bitir', icon: '🧩', target: 3, reward: { trophy: 20, coins: 1300, xp: 520 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
          ],
          // Profil 24: Phrasal Odaklı (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 80 coin kazan', icon: '💰', target: 8, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap - her aktivite coin kazandırır!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 3 kartı hasat et', icon: '📚', target: 3, reward: { trophy: 40, coins: 2100, xp: 840 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
          ],
          // Profil 25: Yapboz ve Hasat (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 4 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 4, reward: { trophy: 20, coins: 1700, xp: 680 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 5 oyun bitir', icon: '🧩', target: 5, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git ve cümleleri tamamla!' },
          ],
          // Profil 26: Hafta Sonu (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 8 soruya cevap ver', icon: '📝', target: 8, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 4 yeni kelime öğren', icon: '🌱', target: 4, reward: { trophy: 20, coins: 700, xp: 280 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 2 oyun bitir', icon: '🧩', target: 2, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 3 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 3, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 27: Battle ve Combo (Orta)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 12 soruya cevap ver', icon: '📝', target: 12, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 2 cümleyi mükemmel söyle', icon: '🎤', target: 2, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 10 doğru cevap ver', icon: '🔥', target: 10, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakibini yenerek 1 maç kazan', icon: '⚔️', target: 1, reward: { trophy: 40, coins: 2600, xp: 1040 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],

          // 
          //  ZOR PROFİLLER (28-41) - 6 görev, yüksek hedefler
          // 

          // Profil 28: Dengeli (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 15 soruya cevap ver', icon: '📝', target: 15, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 8 yeni kelime öğren', icon: '🌱', target: 8, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 6 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 6, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 12 doğru cevap ver', icon: '🔥', target: 12, reward: { trophy: 40, coins: 1800, xp: 720 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 250 coin kazan', icon: '💰', target: 25, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap, konuş - her aktivite coin kazandırır!' },
          ],
          // Profil 29: Ses Odaklı (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 12 soruya cevap ver', icon: '📝', target: 12, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 4 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 10 doğru cevap ver', icon: '🔥', target: 10, reward: { trophy: 20, coins: 1300, xp: 520 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 150 coin kazan', icon: '💰', target: 15, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap - her aktivite coin kazandırır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Ustası', description: 'SesYap\'ta 5 cümleyi mükemmel söyle', icon: '🎤', target: 5, reward: { trophy: 60, coins: 2500, xp: 1000 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 30: Battle Odaklı (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 15 soruya cevap ver', icon: '📝', target: 15, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 4 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 12 doğru cevap ver', icon: '🔥', target: 12, reward: { trophy: 40, coins: 1800, xp: 720 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakiplerini yenerek 2 maç kazan', icon: '⚔️', target: 2, reward: { trophy: 80, coins: 4000, xp: 1600 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
          // Profil 31: Phrasal Odaklı (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 4 oyun bitir', icon: '🧩', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 120 coin kazan', icon: '💰', target: 12, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap - her aktivite coin kazandırır!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 4 kartı hasat et', icon: '📚', target: 4, reward: { trophy: 60, coins: 2800, xp: 1120 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
          ],
          // Profil 32: Yapboz Odaklı (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 5 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 5, reward: { trophy: 20, coins: 1700, xp: 680 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 10 doğru cevap ver', icon: '🔥', target: 10, reward: { trophy: 20, coins: 1300, xp: 520 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Ustası', description: 'Çiftlik Yapboz\'da 7 oyun bitir', icon: '🧩', target: 7, reward: { trophy: 60, coins: 2800, xp: 1120 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git ve cümleleri tamamla!' },
          ],
          // Profil 33: Combo Odaklı (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 18 soruya cevap ver', icon: '📝', target: 18, reward: { trophy: 20, coins: 1600, xp: 640 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 4 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 150 coin kazan', icon: '💰', target: 15, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap - her aktivite coin kazandırır!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Ustası', description: 'Quiz\'de art arda 18 doğru cevap ver', icon: '🔥', target: 18, reward: { trophy: 80, coins: 3600, xp: 1440 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
          ],
          // Profil 34: Hasat Odaklı (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 8 yeni kelime öğren', icon: '🌱', target: 8, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 4 oyun bitir', icon: '🧩', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 3 kartı hasat et', icon: '📚', target: 3, reward: { trophy: 40, coins: 2100, xp: 840 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
            { type: 'HARVEST_WORDS', title: '🌾 Hasat Ustası', description: 'Çiftlikte 8 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 8, reward: { trophy: 80, coins: 3600, xp: 1440 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
          ],
          // Profil 35: Coin Odaklı (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 15 soruya cevap ver', icon: '📝', target: 15, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 3 cümleyi mükemmel söyle', icon: '🎤', target: 3, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 5 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 5, reward: { trophy: 20, coins: 1700, xp: 680 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 10 doğru cevap ver', icon: '🔥', target: 10, reward: { trophy: 20, coins: 1300, xp: 520 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'EARN_COINS', title: '💰 Coin Ustası', description: 'Aktiviteler yaparak toplam 400 coin kazan', icon: '💰', target: 40, reward: { trophy: 60, coins: 3000, xp: 1200 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap, konuş - her aktivite coin kazandırır!' },
          ],
          // Profil 36: Tüm Modlar (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 12 soruya cevap ver', icon: '📝', target: 12, reward: { trophy: 20, coins: 1100, xp: 440 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 4 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 4 oyun bitir', icon: '🧩', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 4 cümleyi mükemmel söyle', icon: '🎤', target: 4, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakibini yenerek 1 maç kazan', icon: '⚔️', target: 1, reward: { trophy: 40, coins: 2400, xp: 960 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
          // Profil 37: Ses ve Phrasal (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 10 soruya cevap ver', icon: '📝', target: 10, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 5 yeni kelime öğren', icon: '🌱', target: 5, reward: { trophy: 20, coins: 800, xp: 320 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 8 doğru cevap ver', icon: '🔥', target: 8, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 100 coin kazan', icon: '💰', target: 10, reward: { trophy: 20, coins: 900, xp: 360 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap - her aktivite coin kazandırır!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 4 kartı hasat et', icon: '📚', target: 4, reward: { trophy: 40, coins: 2400, xp: 960 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Ustası', description: 'SesYap\'ta 5 cümleyi mükemmel söyle', icon: '🎤', target: 5, reward: { trophy: 60, coins: 2500, xp: 1000 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 38: Ultimate Challenge (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 15 soruya cevap ver', icon: '📝', target: 15, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 4 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Pratiği', description: 'SesYap\'ta 4 cümleyi mükemmel söyle', icon: '🎤', target: 4, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 15 doğru cevap ver', icon: '🔥', target: 15, reward: { trophy: 60, coins: 2600, xp: 1040 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakiplerini yenerek 2 maç kazan', icon: '⚔️', target: 2, reward: { trophy: 80, coins: 4000, xp: 1600 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
          // Profil 39: Hafta Sonu (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 15 soruya cevap ver', icon: '📝', target: 15, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Tamamla', description: 'Çiftlik Yapboz\'da 4 oyun bitir', icon: '🧩', target: 4, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Puzzle', hint: 'Çiftlik sekmesinde Yapboz tab\'ına git!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 5 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 5, reward: { trophy: 40, coins: 1800, xp: 720 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'EARN_COINS', title: '💰 Coin Biriktir', description: 'Aktiviteler yaparak toplam 200 coin kazan', icon: '💰', target: 20, reward: { trophy: 20, coins: 1500, xp: 600 }, screen: 'Quiz', hint: 'Quiz çöz, hasat yap - her aktivite coin kazandırır!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Ustası', description: 'SesYap\'ta 5 cümleyi mükemmel söyle', icon: '🎤', target: 5, reward: { trophy: 60, coins: 2500, xp: 1000 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
          ],
          // Profil 40: Üçlü Taç (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 12 soruya cevap ver', icon: '📝', target: 12, reward: { trophy: 20, coins: 1200, xp: 480 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'PLANT_WORDS', title: '🌱 Kelime Öğren', description: 'Quiz çözerek 6 yeni kelime öğren', icon: '🌱', target: 6, reward: { trophy: 20, coins: 1000, xp: 400 }, screen: 'Quiz', hint: 'Quiz çözdükçe yeni kelimeler öğrenirsin!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 5 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 5, reward: { trophy: 20, coins: 1700, xp: 680 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 12 doğru cevap ver', icon: '🔥', target: 12, reward: { trophy: 40, coins: 1800, xp: 720 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Ustası', description: 'SesYap\'ta 5 cümleyi mükemmel söyle', icon: '🎤', target: 5, reward: { trophy: 60, coins: 2500, xp: 1000 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakibini yenerek 1 maç kazan', icon: '⚔️', target: 1, reward: { trophy: 40, coins: 2400, xp: 960 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
          // Profil 41: Büyük Final (Zor)
          [
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Çöz', description: 'Ana Quiz\'de 15 soruya cevap ver', icon: '📝', target: 15, reward: { trophy: 20, coins: 1400, xp: 560 }, screen: 'Quiz', hint: 'Quiz sekmesine git ve soruları cevapla!' },
            { type: 'HARVEST_WORDS', title: '🌾 Kelime Hasat Et', description: 'Çiftlikte 6 yeşil kartı sağa kaydırarak hasat et', icon: '🌾', target: 6, reward: { trophy: 40, coins: 2000, xp: 800 }, screen: 'Farm', hint: 'Çiftlik sekmesinde yeşil kartları sağa kaydır!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Verb Hasat Et', description: 'Phrasal Verb Çiftliğinde 4 kartı hasat et', icon: '📚', target: 4, reward: { trophy: 60, coins: 2800, xp: 1120 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliği sekmesine git ve yeşil kartları hasat et!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Yap', description: 'Quiz\'de art arda 15 doğru cevap ver', icon: '🔥', target: 15, reward: { trophy: 60, coins: 2600, xp: 1040 }, screen: 'Quiz', hint: 'Quiz\'de hata yapmadan art arda doğru cevapla!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Telaffuz Ustası', description: 'SesYap\'ta 5 cümleyi mükemmel söyle', icon: '🎤', target: 5, reward: { trophy: 60, coins: 2500, xp: 1000 }, screen: 'SesYap', hint: 'SesYap sekmesine git ve mikrofona basarak konuş!' },
            { type: 'WIN_BATTLE', title: '⚔️ Battle Kazan', description: 'Battle modunda rakiplerini yenerek 2 maç kazan', icon: '⚔️', target: 2, reward: { trophy: 80, coins: 4000, xp: 1600 }, screen: 'Battle', hint: 'Battle sekmesine git ve rakibinle yarış!' },
          ],
        ];

        // Mulberry32 seeded random generator - daha iyi kombinasyon çeşitliliği
        const mulberry32 = (seed: number) => {
          return () => {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };
        };

        // Günün hash'ini hesapla - daha iyi varyasyon için
        const dayHash = parseInt(today.replace(/-/g, ''), 10);
        const random = mulberry32(dayHash);

        // 42 günlük rotasyon (6 hafta)
        const dayOfYear = Math.floor((new Date(today).getTime() - new Date(today.split('-')[0] + '-01-01').getTime()) / (1000 * 60 * 60 * 24));
        const profileIndex = dayOfYear % questProfiles.length; // 0-41 arası döner

        // Seçilen profili al
        const selectedProfile = questProfiles[profileIndex];

        // Seçilen görevleri oluştur
        const selectedQuests: DailyQuest[] = selectedProfile.map((quest, idx) => ({
          ...sanitizeQuestRecord(quest),
          id: `quest-${today}-${idx}-${profileIndex}`,
          progress: 0,
          completed: false,
          claimed: false,
          date: today
        }));

        set({
          dailyQuests: selectedQuests,
          lastQuestResetDate: today
        });
        lastDailyQuestGenerationAt = Date.now();
        traceEvent('daily_quests_generated', { count: selectedQuests.length });
        } catch (error) {
          traceEvent('daily_quests_generate_error', { error: String(error) }, 'error');
        } finally {
          dailyQuestGenerationInFlight = false;
        }
      },

      queueQuestProgress: (type: QuestType, amount: number = 1, mode: QuestProgressMode = 'add') => {
        const safeAmount = toSafeNumber(amount, 0);
        if (safeAmount <= 0) return;
        const safeMode: QuestProgressMode = mode === 'max' ? 'max' : 'add';
        queueQuestProgressInternal(type, safeAmount, safeMode);
        scheduleQuestProgressFlush(get);
      },

      updateQuestProgress: (type: QuestType, amount: number = 1, mode: QuestProgressMode = 'add') => {
        try {
        // 🛡 NaN/undefined guard
        const safeAmount = (typeof amount === 'number' && !isNaN(amount)) ? amount : 1;
        const safeMode: QuestProgressMode =
          mode === 'max' || (type === 'REACH_COMBO' && mode !== 'add') ? 'max' : 'add';
        const nextQuestProgress = (currentProgress: number, target: number) =>
          safeMode === 'max'
            ? Math.max(currentProgress, Math.min(safeAmount, target))
            : Math.min(currentProgress + safeAmount, target);
        const state = get();
        const today = new Date().toISOString().split('T')[0];

        // 🛡 Null-safe quest array references
        const safeDailyQuests = Array.isArray(state.dailyQuests) ? state.dailyQuests : [];
        const safeWeeklyQuests = Array.isArray(state.weeklyQuests) ? state.weeklyQuests : [];
        const safeRepeatableQuests = Array.isArray(state.repeatableQuests) ? state.repeatableQuests : [];
        const safeStoryQuests = Array.isArray(state.storyQuests) ? state.storyQuests : [];

        // ⚡ BATCHED UPDATE - Tüm değişiklikleri topla, TEK set() çağrısı yap
        let batchedUpdate: any = {};
        let questCompleted = false;
        let completedQuestTitle = '';

        // 📊 Lifetime stats güncelle
        switch (type) {
          case 'PLANT_WORDS':
            batchedUpdate.lifetimePlantedWords = (state.lifetimePlantedWords || 0) + safeAmount;
            break;
          case 'SPEECH_PRACTICE':
            batchedUpdate.lifetimeSpeechPractice = (state.lifetimeSpeechPractice || 0) + safeAmount;
            break;
          case 'COMPLETE_PUZZLE':
            batchedUpdate.lifetimePuzzlesCompleted = (state.lifetimePuzzlesCompleted || 0) + safeAmount;
            break;
          case 'HARVEST_WORDS':
            // lifetimeHarvests harvestWord() içinde zaten artırılıyor  burada ARTIRMA (çift artış bug'ı)
            break;
          case 'HARVEST_PHRASAL':
            batchedUpdate.lifetimePhrasalHarvested = (state.lifetimePhrasalHarvested || 0) + safeAmount;
            break;
          case 'WIN_BATTLE':
            batchedUpdate.lifetimeBattlesWon = (state.lifetimeBattlesWon || 0) + safeAmount;
            break;
          case 'COMPLETE_QUIZ':
            batchedUpdate.lifetimeQuizAnswered = (state.lifetimeQuizAnswered || 0) + safeAmount;
            break;
          case 'REACH_COMBO':
            if (safeAmount > (state.bestStreak || 0)) {
              batchedUpdate.bestStreak = safeAmount;
            }
            break;
        }

        // 📋 Günlük görevleri güncelle - SADECE ilgili type varsa
        if (safeDailyQuests.length > 0 && safeDailyQuests[0]?.date === today) {
          const hasMatchingQuest = safeDailyQuests.some(q => q.type === type && !q.completed);
          if (hasMatchingQuest) {
            batchedUpdate.dailyQuests = safeDailyQuests.map(quest => {
              if (quest.type === type && !quest.completed) {
                const safeTarget = Math.max(1, toSafePositiveInt(quest.target));
                const safeCurrentProgress = Math.max(0, toSafePositiveInt(quest.progress));
                const newProgress = nextQuestProgress(safeCurrentProgress, safeTarget);
                const isCompleted = newProgress >= safeTarget;
                if (isCompleted && !questCompleted) {
                  questCompleted = true;
                  completedQuestTitle = normalizeUiText(quest.title, 'Görev tamamlandı');
                }
                return { ...quest, progress: newProgress, completed: isCompleted };
              }
              return quest;
            });
          }
        }

        // 📅 Haftalık görevleri güncelle
        if (safeWeeklyQuests.length > 0) {
          const hasMatchingQuest = safeWeeklyQuests.some(q => q.type === type && !q.completed);
          if (hasMatchingQuest) {
            batchedUpdate.weeklyQuests = safeWeeklyQuests.map(quest => {
              if (quest.type === type && !quest.completed) {
                const safeTarget = Math.max(1, toSafePositiveInt(quest.target));
                const safeCurrentProgress = Math.max(0, toSafePositiveInt(quest.progress));
                const newProgress = nextQuestProgress(safeCurrentProgress, safeTarget);
                const isCompleted = newProgress >= safeTarget;
                if (isCompleted && !questCompleted) {
                  questCompleted = true;
                  completedQuestTitle = `${normalizeUiText(quest.title, 'Grev tamamland')} (Haftalık)`;
                }
                return { ...quest, progress: newProgress, completed: isCompleted };
              }
              return quest;
            });
          }
        }

        //  Tekrarlanabilir görevleri güncelle
        if (safeRepeatableQuests.length > 0) {
          const hasMatchingQuest = safeRepeatableQuests.some(q => q.type === type && !q.completed && !q.claimed);
          if (hasMatchingQuest) {
            batchedUpdate.repeatableQuests = safeRepeatableQuests.map(quest => {
              if (quest.type === type && !quest.completed && !quest.claimed) {
                const safeTarget = Math.max(1, toSafePositiveInt(quest.target));
                const safeCurrentProgress = Math.max(0, toSafePositiveInt(quest.progress));
                const newProgress = nextQuestProgress(safeCurrentProgress, safeTarget);
                return { ...quest, progress: newProgress, completed: newProgress >= safeTarget };
              }
              return quest;
            });
          }
        }

        // 📖 Hikaye görevlerini güncelle
        if (safeStoryQuests.length > 0) {
          const hasMatchingQuest = safeStoryQuests.some(q => q.type === type && q.isUnlocked && !q.completed && !q.claimed);
          if (hasMatchingQuest) {
            batchedUpdate.storyQuests = safeStoryQuests.map(quest => {
              if (quest.type === type && quest.isUnlocked && !quest.completed && !quest.claimed) {
                const safeTarget = Math.max(1, toSafePositiveInt(quest.target));
                const safeCurrentProgress = Math.max(0, toSafePositiveInt(quest.progress));
                const newProgress = nextQuestProgress(safeCurrentProgress, safeTarget);
                const isCompleted = newProgress >= safeTarget;
                if (isCompleted && !questCompleted) {
                  questCompleted = true;
                  completedQuestTitle = `${normalizeUiText(quest.title, 'Görev tamamlandı')} (Hikaye)`;
                }
                return { ...quest, progress: newProgress, completed: isCompleted };
              }
              return quest;
            });
          }
        }

        // ⚡ TEK SET ÇARISI - Tüm değişiklikler bir seferde
        if (Object.keys(batchedUpdate).length > 0) {
          set(batchedUpdate);
        }

        //  Görev tamamlandıysa toast göster  güvenli ve crash-safe
        if (questCompleted) {
          // 🛡 Quest completion toast  quiz aktifken GÖSTERMEYİZ (kasma ve odak bozma engeli)
          const isQuizActive = !!(get().miniQuizFor || get().feedVisible || get().quizActive);
          if (!isQuizActive) {
            setTimeout(() => {
              try {
                safeShowRewardToast('quest', 1, normalizeUiText(completedQuestTitle, 'Görev tamamlandı'));
              } catch (e) {}
            }, 1500);
          }

          //  Achievement ve Mastery progress kontrolü  debounced, crash-safe
          if (_achievementCheckTimer) clearTimeout(_achievementCheckTimer);
          _achievementCheckTimer = setTimeout(() => {
            _achievementCheckTimer = null;
            try {
              get().checkAchievementProgress();
            } catch (e) {}
            try {
              get().checkMasteryProgress();
            } catch (e) {}
          }, 3000);
        }
        } catch (e) {
          console.error('[updateQuestProgress] Error:', e);
        }
      },

      claimQuestReward: (questId: string, questType?: 'daily' | 'weekly' | 'repeatable' | 'story' | 'achievement' | 'mastery') => {
        let inFlightKey = '';
        try {
        const safeQuestId = typeof questId === 'string' ? questId.trim() : '';
        if (!safeQuestId) return false;
        const now = Date.now();
        if (now - _lastQuestClaimAt < 120) {
          traceEvent('quest_claim_throttled', { questId: safeQuestId, questType: questType || 'daily' }, 'warn');
          return false;
        }
        _lastQuestClaimAt = now;

        const state = get();
        const type = questType || 'daily';
        inFlightKey = `${type}:${safeQuestId}`;
        if (_claimQuestInFlight.has(inFlightKey)) return false;
        _claimQuestInFlight.add(inFlightKey);
        traceEvent('quest_claim_start', { questId: safeQuestId, questType: type });

        const safeDailyQuests = toSafeObjectArray<any>(state.dailyQuests);
        const safeWeeklyQuests = toSafeObjectArray<any>(state.weeklyQuests);
        const safeRepeatableQuests = toSafeObjectArray<any>(state.repeatableQuests);
        const safeStoryQuests = toSafeObjectArray<any>(state.storyQuests);
        const safeAchievementQuests = toSafeObjectArray<any>(state.achievementQuests);
        const safeMasteryPaths = toSafeObjectArray<any>(state.masteryPaths);

        let quest: any = null;

        switch (type) {
          case 'daily':
            quest = safeDailyQuests.find(q => q.id === safeQuestId);
            break;
          case 'weekly':
            quest = safeWeeklyQuests.find(q => q.id === safeQuestId);
            break;
          case 'repeatable':
            quest = safeRepeatableQuests.find(q => q.id === safeQuestId);
            break;
          case 'story':
            quest = safeStoryQuests.find(q => q.id === safeQuestId);
            break;
          case 'achievement':
            quest = safeAchievementQuests.find(q => q.id === safeQuestId);
            break;
          case 'mastery':
            for (const path of safeMasteryPaths) {
              const level = path.levels?.find((l: any) => l.level?.toString() === safeQuestId || `${path.id}-${l.level}` === safeQuestId);
              if (level) { quest = level; break; }
            }
            break;
          default:
            quest = safeDailyQuests.find(q => q.id === safeQuestId);
        }

        if (!quest || quest.completed !== true || quest.claimed === true) {
          return false;
        }

        const rewardCoins = toSafePositiveInt(quest.reward?.coins);
        const rewardXp = toSafePositiveInt(quest.reward?.xp);
        const rewardTrophy = toSafePositiveInt(quest.reward?.trophy);
        const safeQuestTitle = normalizeUiText(quest.title, 'Görev ödülü');

        set(prev => {
          const updates: any = {
            trophies: toSafeNumber(prev.trophies, 0) + rewardTrophy,
            coins: Math.max(0, toSafeNumber(prev.coins, 0) + rewardCoins),
            lifetimeCoins: toSafeNumber(prev.lifetimeCoins, 0) + rewardCoins,
            xp: toSafeNumber(prev.xp, 0) + rewardXp,
            totalQuestsCompleted: toSafeNumber(prev.totalQuestsCompleted, 0) + 1,
          };

          switch (type) {
            case 'daily':
              updates.dailyQuests = toSafeObjectArray<any>(prev.dailyQuests).map(q =>
                q.id === safeQuestId ? { ...q, claimed: true } : q
              );
              break;
            case 'weekly':
              updates.weeklyQuests = toSafeObjectArray<any>(prev.weeklyQuests).map(q =>
                q.id === safeQuestId ? { ...q, claimed: true } : q
              );
              break;
            case 'repeatable':
              updates.repeatableQuests = toSafeObjectArray<any>(prev.repeatableQuests).map(q =>
                q.id === safeQuestId ? {
                  ...q,
                  claimed: true,
                  completed: false,
                  progress: 0,
                  completionCount: toSafeNumber(q.completionCount, 0) + 1,
                } : q
              );
              break;
            case 'story':
              updates.storyQuests = toSafeObjectArray<any>(prev.storyQuests).map(q =>
                q.id === safeQuestId ? { ...q, claimed: true } : q
              );
              break;
            case 'achievement':
              updates.achievementQuests = toSafeObjectArray<any>(prev.achievementQuests).map(q =>
                q.id === safeQuestId ? { ...q, claimed: true } : q
              );
              break;
            case 'mastery':
              updates.masteryPaths = toSafeObjectArray<any>(prev.masteryPaths).map(path => ({
                ...path,
                levels: toSafeObjectArray<any>(path.levels).map((level: any) => {
                  const levelId = `${path.id}-${level.level}`;
                  const isMatch = level.level?.toString() === safeQuestId || levelId === safeQuestId;
                  return isMatch ? { ...level, claimed: true } : level;
                }),
              }));
              break;
          }

          return updates;
        });

        const rewardSummary = [
          rewardCoins > 0 ? `+${rewardCoins} coin` : '',
          rewardXp > 0 ? `+${rewardXp} XP` : '',
        ].filter(Boolean).join(' • ');
        safeShowRewardToast('quest', 1, rewardSummary ? `${safeQuestTitle} • ${rewardSummary}` : safeQuestTitle);

        if (type === 'daily') {
          const refreshedDailyQuests = toSafeObjectArray<any>(get().dailyQuests);
          const today = new Date().toISOString().split('T')[0];
          const allClaimedToday = refreshedDailyQuests.length > 0 &&
            refreshedDailyQuests.every(q => q.date === today && q.claimed === true);
          if (allClaimedToday) {
            setTimeout(() => {
              try {
                get().checkAndResetDailyQuests();
              } catch (error) {
                traceEvent('quest_claim_postcheck_error', { error: String(error) }, 'error');
              }
            }, 350);
          }
        }

        if (_questRewardSyncTimer) clearTimeout(_questRewardSyncTimer);
        _questRewardSyncTimer = setTimeout(() => {
          _questRewardSyncTimer = null;
          try {
            const current = get();
            const safeOdId = current.user?.odId;
            if (safeOdId) {
              safeSyncFirebase(safeOdId, {
                trophies: toSafeNumber(current.trophies, 0),
                coins: toSafeNumber(current.coins, 0),
                xp: toSafeNumber(current.xp, 0),
              });
            }
          } catch (e) {}
        }, 900);
        traceEvent('quest_claim_success', {
          questId: safeQuestId,
          questType: type,
          rewardCoins,
          rewardXp,
          rewardTrophy,
        });
        return true;
        } catch (e) {
          traceEvent('quest_claim_error', { questId: questId, questType, error: String(e) }, 'error');
          console.error('[claimQuestReward] Error:', e);
          return false;
        } finally {
          if (inFlightKey) {
            setTimeout(() => _claimQuestInFlight.delete(inFlightKey), 900);
          }
        }
      },

      checkAndResetDailyQuests: () => {
        if (dailyQuestResetInFlight) {
          traceEvent('daily_quest_check_skipped', { reason: 'in_flight' }, 'warn');
          return;
        }
        // Debounce: en fazla 30 saniyede bir kontrol et
        const now = Date.now();
        if (now - lastQuestCheckTime < 30000) {
          traceEvent('daily_quest_check_skipped', { reason: 'debounce' }, 'warn');
          return;
        }
        lastQuestCheckTime = now;
        dailyQuestResetInFlight = true;
        try {
          const today = new Date().toISOString().split('T')[0];
          const state = get();
          const safeDailyQuests = toSafeObjectArray<any>(state.dailyQuests);

          // Gün değişti mi ya da quest listesi boş mu?
          if (state.lastQuestResetDate !== today || safeDailyQuests.length === 0) {
            traceEvent('daily_quest_check_regenerate', { reason: 'date_or_empty' });
            get().generateDailyQuests();
            return;
          }

          // Aynı gün içinde tüm görevler claimed olduysa yenilerini generate et
          const allClaimedToday = safeDailyQuests.length > 0 &&
            safeDailyQuests.every(q => q.date === today && q.claimed);
          if (allClaimedToday) {
            traceEvent('daily_quest_check_regenerate', { reason: 'all_claimed' });
            get().generateDailyQuests();
          }
        } catch (e) {
          traceEvent('daily_quest_check_error', { error: String(e) }, 'error');
          console.error('[checkAndResetDailyQuests] Error:', e);
        } finally {
          dailyQuestResetInFlight = false;
        }
      },

      // 
      // 📅 HAFTALIK GÖREVLER - Her Pazartesi sıfırlanır
      // 
      generateWeeklyQuests: () => {
        const state = get();
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        const weekStartDate = monday.toISOString().split('T')[0];

        // Eğer bu haftanın görevleri varsa oluşturma
        const safeWeeklyQuests = Array.isArray(state.weeklyQuests) ? state.weeklyQuests : [];
        if (safeWeeklyQuests.length > 0 && safeWeeklyQuests[0]?.weekStartDate === weekStartDate) {
          const unclaimedQuests = safeWeeklyQuests.filter(q => !q.claimed);
          if (unclaimedQuests.length > 0) return;
        }

        // Haftanın tipi (4 haftalık rotasyon)
        const weekNumber = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weekType = (weekNumber % 4) as 0 | 1 | 2 | 3;

        type WeeklyQuestDef = { type: QuestType; title: string; description: string; icon: string; target: number; reward: { trophy: number; coins: number; xp: number }; screen: string; hint: string };

        // 4 farklı hafta tipi, her biri 7 görev
        const weeklyQuestSets: Record<0 | 1 | 2 | 3, WeeklyQuestDef[]> = {
          // Hafta 0: Dengeli Hafta
          0: [
            { type: 'PLANT_WORDS', title: '🌱 Haftalık Ekim', description: '30 kelime tarlaya ekle', icon: '🌱', target: 30, reward: { trophy: 5, coins: 800, xp: 80 }, screen: 'Quiz', hint: 'Haftada 30 kelime!' },
            { type: 'COMPLETE_QUIZ', title: '📝 Quiz Ustası', description: '50 quiz sorusu cevapla', icon: '📝', target: 50, reward: { trophy: 5, coins: 1000, xp: 100 }, screen: 'Quiz', hint: 'Haftada 50 soru!' },
            { type: 'HARVEST_WORDS', title: '🌾 Büyük Hasat', description: '20 kelime hasat et', icon: '🌾', target: 20, reward: { trophy: 6, coins: 1200, xp: 120 }, screen: 'Farm', hint: 'Haftada 20 hasat!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Ses Maratonu', description: '15 cümleyi mükemmel söyle', icon: '🎤', target: 15, reward: { trophy: 6, coins: 1400, xp: 140 }, screen: 'SesYap', hint: 'Haftada 15 cümle!' },
            { type: 'REACH_COMBO', title: '🔥 Haftalık Combo', description: '25 combo ulaş', icon: '🔥', target: 25, reward: { trophy: 5, coins: 1200, xp: 120 }, screen: 'Quiz', hint: '25 combo hedefi!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Haftası', description: '15 yapboz tamamla', icon: '🧩', target: 15, reward: { trophy: 5, coins: 1000, xp: 100 }, screen: 'Farm', hint: 'Haftada 15 yapboz!' },
            { type: 'EARN_COINS', title: '💰 Altın Hafta', description: '500 coin kazan', icon: '💰', target: 50, reward: { trophy: 4, coins: 800, xp: 80 }, screen: 'Quiz', hint: 'Haftada 500 coin!' },
          ],
          // Hafta 1: Ses & Phrasal Haftası
          1: [
            { type: 'SPEECH_PRACTICE', title: '🎤 Ses Efsanesi', description: '25 cümleyi mükemmel söyle', icon: '🎤', target: 25, reward: { trophy: 8, coins: 2000, xp: 200 }, screen: 'SesYap', hint: 'Ses master!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Master', description: '15 phrasal verb hasat et', icon: '📚', target: 15, reward: { trophy: 7, coins: 1800, xp: 180 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal uzmanı!' },
            { type: 'COMPLETE_QUIZ', title: '📝 Ses Desteği', description: '40 quiz sorusu cevapla', icon: '📝', target: 40, reward: { trophy: 4, coins: 800, xp: 80 }, screen: 'Quiz', hint: 'Quiz desteği!' },
            { type: 'PLANT_WORDS', title: '🌱 Ses Kelimeler', description: '25 kelime tarlaya ekle', icon: '🌱', target: 25, reward: { trophy: 4, coins: 600, xp: 60 }, screen: 'Quiz', hint: 'Kelime ekle!' },
            { type: 'HARVEST_WORDS', title: '🌾 Ses Hasadı', description: '15 kelime hasat et', icon: '🌾', target: 15, reward: { trophy: 5, coins: 1000, xp: 100 }, screen: 'Farm', hint: 'Hasat!' },
            { type: 'REACH_COMBO', title: '🔥 Ses Combo', description: '20 combo ulaş', icon: '🔥', target: 20, reward: { trophy: 4, coins: 800, xp: 80 }, screen: 'Quiz', hint: 'Combo!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Bonus Yapboz', description: '10 yapboz tamamla', icon: '🧩', target: 10, reward: { trophy: 3, coins: 600, xp: 60 }, screen: 'Farm', hint: 'Yapboz!' },
          ],
          // Hafta 2: Battle & Combo Haftası
          2: [
            { type: 'WIN_BATTLE', title: '⚔️ Savaş Efsanesi', description: '5 battle kazan', icon: '⚔️', target: 5, reward: { trophy: 10, coins: 2400, xp: 240 }, screen: 'Battle', hint: 'Haftalık savaşçı!' },
            { type: 'REACH_COMBO', title: '🔥 Combo Efsanesi', description: '30 combo ulaş', icon: '🔥', target: 30, reward: { trophy: 8, coins: 2000, xp: 200 }, screen: 'Quiz', hint: 'Efsane combo!' },
            { type: 'COMPLETE_QUIZ', title: '📝 Savaş Hazırlığı', description: '60 quiz sorusu cevapla', icon: '📝', target: 60, reward: { trophy: 5, coins: 1200, xp: 120 }, screen: 'Quiz', hint: 'Hazırlan!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Savaş Sesi', description: '12 cümleyi mükemmel söyle', icon: '🎤', target: 12, reward: { trophy: 5, coins: 1120, xp: 112 }, screen: 'SesYap', hint: 'SesYap!' },
            { type: 'PLANT_WORDS', title: '🌱 Silah Deposu', description: '25 kelime tarlaya ekle', icon: '🌱', target: 25, reward: { trophy: 4, coins: 600, xp: 60 }, screen: 'Quiz', hint: 'Kelime!' },
            { type: 'HARVEST_WORDS', title: '🌾 Savaş Hasadı', description: '15 kelime hasat et', icon: '🌾', target: 15, reward: { trophy: 4, coins: 800, xp: 80 }, screen: 'Farm', hint: 'Hasat!' },
            { type: 'EARN_COINS', title: '💰 Savaş Ganimetleri', description: '600 coin kazan', icon: '💰', target: 60, reward: { trophy: 4, coins: 800, xp: 80 }, screen: 'Quiz', hint: 'Coin!' },
          ],
          // Hafta 3: Hasat & Yapboz Haftası
          3: [
            { type: 'HARVEST_WORDS', title: '🌾 Hasat Kralı', description: '30 kelime hasat et', icon: '🌾', target: 30, reward: { trophy: 8, coins: 2000, xp: 200 }, screen: 'Farm', hint: 'Kral hasat!' },
            { type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Dehası', description: '25 yapboz tamamla', icon: '🧩', target: 25, reward: { trophy: 7, coins: 1600, xp: 160 }, screen: 'Farm', hint: 'Yapboz master!' },
            { type: 'HARVEST_PHRASAL', title: '📚 Phrasal Bonus', description: '10 phrasal verb hasat et', icon: '📚', target: 10, reward: { trophy: 6, coins: 1400, xp: 140 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal!' },
            { type: 'PLANT_WORDS', title: '🌱 Mega Ekim', description: '35 kelime tarlaya ekle', icon: '🌱', target: 35, reward: { trophy: 5, coins: 1000, xp: 100 }, screen: 'Quiz', hint: 'Mega ekim!' },
            { type: 'SPEECH_PRACTICE', title: '🎤 Hasat Şarkısı', description: '12 cümleyi mükemmel söyle', icon: '🎤', target: 12, reward: { trophy: 5, coins: 1120, xp: 112 }, screen: 'SesYap', hint: 'SesYap!' },
            { type: 'COMPLETE_QUIZ', title: '📝 Destek Quiz', description: '35 quiz sorusu cevapla', icon: '📝', target: 35, reward: { trophy: 4, coins: 720, xp: 72 }, screen: 'Quiz', hint: 'Quiz!' },
            { type: 'EARN_COINS', title: '💰 Hasat Hazinesi', description: '400 coin kazan', icon: '💰', target: 40, reward: { trophy: 3, coins: 600, xp: 60 }, screen: 'Quiz', hint: 'Coin!' },
          ],
        };

        const selectedQuests = weeklyQuestSets[weekType];

        const weeklyQuests: WeeklyQuest[] = selectedQuests.map((quest, idx) => ({
          ...sanitizeQuestRecord(quest),
          id: `weekly-${weekStartDate}-${idx}`,
          progress: 0,
          completed: false,
          claimed: false,
          weekType,
          weekStartDate
        }));

        set({
          weeklyQuests,
          lastWeeklyResetDate: weekStartDate
        });
      },

      checkAndResetWeeklyQuests: () => {
        const state = get();
        const safeWeeklyQuests = Array.isArray(state.weeklyQuests) ? state.weeklyQuests : [];
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        const weekStartDate = monday.toISOString().split('T')[0];

        // Hafta değişti mi?
        if (state.lastWeeklyResetDate !== weekStartDate) {
          get().generateWeeklyQuests();
        }

        // Tüm haftalık görevler claimed olduysa yenilerini generate et
        const allClaimed = safeWeeklyQuests.length > 0 &&
          safeWeeklyQuests.every(q => q.claimed);
        if (allClaimed) {
          get().generateWeeklyQuests();
        }
      },

      // 
      //  TEKRARLANAB&İLİR GÖREVLER - Bitince yenisi gelir
      // 
      generateRepeatableQuest: (category: 'fast' | 'medium' | 'long') => {
        const state = get();

        type RepeatableQuestDef = { type: QuestType; title: string; description: string; icon: string; target: number; reward: { trophy: number; coins: number; xp: number }; screen: string; hint: string };

        // Kategori bazlı görev havuzları
        const questPools: Record<'fast' | 'medium' | 'long', RepeatableQuestDef[]> = {
          // Hızlı görevler (5-10 dakika)
          fast: [
            { type: 'COMPLETE_QUIZ', title: '⚡ Hızlı Quiz', description: '5 quiz sorusu cevapla', icon: '⚡', target: 5, reward: { trophy: 1, coins: 5, xp: 10 }, screen: 'Quiz', hint: 'Hızlı quiz!' },
            { type: 'PLANT_WORDS', title: '⚡ Hızlı Ekim', description: '3 kelime tarlaya ekle', icon: '⚡', target: 3, reward: { trophy: 1, coins: 4, xp: 8 }, screen: 'Quiz', hint: 'Hızlı ekim!' },
            { type: 'SPEECH_PRACTICE', title: '⚡ Hızlı Ses', description: '1 cümleyi mükemmel söyle', icon: '⚡', target: 1, reward: { trophy: 1, coins: 6, xp: 12 }, screen: 'SesYap', hint: 'Hızlı SesYap!' },
            { type: 'REACH_COMBO', title: '⚡ Mini Combo', description: '5 combo ulaş', icon: '⚡', target: 5, reward: { trophy: 1, coins: 5, xp: 10 }, screen: 'Quiz', hint: 'Mini combo!' },
            { type: 'COMPLETE_PUZZLE', title: '⚡ Tek Yapboz', description: '1 yapboz tamamla', icon: '⚡', target: 1, reward: { trophy: 1, coins: 5, xp: 10 }, screen: 'Farm', hint: 'Tek yapboz!' },
            { type: 'HARVEST_WORDS', title: '⚡ Mini Hasat', description: '1 kelime hasat et', icon: '⚡', target: 1, reward: { trophy: 1, coins: 6, xp: 12 }, screen: 'Farm', hint: 'Mini hasat!' },
            { type: 'EARN_COINS', title: '⚡ Cep Harçlığı', description: '30 coin kazan', icon: '⚡', target: 3, reward: { trophy: 1, coins: 3, xp: 6 }, screen: 'Quiz', hint: 'Hızlı coin!' },
            { type: 'HARVEST_PHRASAL', title: '⚡ İlk Phrasal', description: '1 phrasal verb hasat et', icon: '⚡', target: 1, reward: { trophy: 1, coins: 8, xp: 16 }, screen: 'PhrasalVerbFarm', hint: 'Hızlı phrasal!' },
          ],
          // Orta görevler (15-30 dakika)
          medium: [
            { type: 'COMPLETE_QUIZ', title: '🎯 Orta Quiz', description: '15 quiz sorusu cevapla', icon: '🎯', target: 15, reward: { trophy: 2, coins: 14, xp: 28 }, screen: 'Quiz', hint: 'Orta quiz!' },
            { type: 'PLANT_WORDS', title: '🎯 Orta Ekim', description: '8 kelime tarlaya ekle', icon: '🎯', target: 8, reward: { trophy: 2, coins: 11, xp: 22 }, screen: 'Quiz', hint: 'Orta ekim!' },
            { type: 'SPEECH_PRACTICE', title: '🎯 Orta Ses', description: '3 cümleyi mükemmel söyle', icon: '🎯', target: 3, reward: { trophy: 2, coins: 16, xp: 32 }, screen: 'SesYap', hint: 'Orta SesYap!' },
            { type: 'REACH_COMBO', title: '🎯 Orta Combo', description: '10 combo ulaş', icon: '🎯', target: 10, reward: { trophy: 2, coins: 14, xp: 28 }, screen: 'Quiz', hint: 'Orta combo!' },
            { type: 'COMPLETE_PUZZLE', title: '🎯 Orta Yapboz', description: '4 yapboz tamamla', icon: '🎯', target: 4, reward: { trophy: 2, coins: 13, xp: 26 }, screen: 'Farm', hint: 'Orta yapboz!' },
            { type: 'HARVEST_WORDS', title: '🎯 Orta Hasat', description: '4 kelime hasat et', icon: '🎯', target: 4, reward: { trophy: 2, coins: 15, xp: 30 }, screen: 'Farm', hint: 'Orta hasat!' },
            { type: 'HARVEST_PHRASAL', title: '🎯 Orta Phrasal', description: '2 phrasal verb hasat et', icon: '🎯', target: 2, reward: { trophy: 2, coins: 17, xp: 34 }, screen: 'PhrasalVerbFarm', hint: 'Orta phrasal!' },
            { type: 'EARN_COINS', title: '🎯 Orta Hazine', description: '100 coin kazan', icon: '🎯', target: 10, reward: { trophy: 2, coins: 10, xp: 20 }, screen: 'Quiz', hint: 'Orta coin!' },
          ],
          // Uzun görevler (1+ saat)
          long: [
            { type: 'COMPLETE_QUIZ', title: '👑 Uzun Quiz', description: '30 quiz sorusu cevapla', icon: '👑', target: 30, reward: { trophy: 4, coins: 600, xp: 60 }, screen: 'Quiz', hint: 'Uzun quiz!' },
            { type: 'PLANT_WORDS', title: '👑 Uzun Ekim', description: '15 kelime tarlaya ekle', icon: '👑', target: 15, reward: { trophy: 4, coins: 480, xp: 48 }, screen: 'Quiz', hint: 'Uzun ekim!' },
            { type: 'SPEECH_PRACTICE', title: '👑 Uzun Ses', description: '6 cümleyi mükemmel söyle', icon: '👑', target: 6, reward: { trophy: 4, coins: 720, xp: 72 }, screen: 'SesYap', hint: 'Uzun SesYap!' },
            { type: 'REACH_COMBO', title: '👑 Uzun Combo', description: '20 combo ulaş', icon: '👑', target: 20, reward: { trophy: 4, coins: 640, xp: 64 }, screen: 'Quiz', hint: 'Uzun combo!' },
            { type: 'COMPLETE_PUZZLE', title: '👑 Uzun Yapboz', description: '8 yapboz tamamla', icon: '👑', target: 8, reward: { trophy: 4, coins: 560, xp: 56 }, screen: 'Farm', hint: 'Uzun yapboz!' },
            { type: 'HARVEST_WORDS', title: '👑 Uzun Hasat', description: '10 kelime hasat et', icon: '👑', target: 10, reward: { trophy: 4, coins: 720, xp: 72 }, screen: 'Farm', hint: 'Uzun hasat!' },
            { type: 'WIN_BATTLE', title: '👑 Savaş Lordu', description: '2 battle kazan', icon: '👑', target: 2, reward: { trophy: 5, coins: 880, xp: 88 }, screen: 'Battle', hint: 'Uzun savaş!' },
            { type: 'HARVEST_PHRASAL', title: '👑 Uzun Phrasal', description: '5 phrasal verb hasat et', icon: '👑', target: 5, reward: { trophy: 4, coins: 800, xp: 80 }, screen: 'PhrasalVerbFarm', hint: 'Uzun phrasal!' },
          ],
        };

        const pool = questPools[category];
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selectedQuest = pool[randomIndex];

        // Mevcut görev varsa ve unclaimed ise değiştirme
        const safeRepQuests = Array.isArray(state.repeatableQuests) ? state.repeatableQuests : [];
        const existingQuest = safeRepQuests.find(q => q.category === category && !q.claimed);
        if (existingQuest) return;

        const newQuest: RepeatableQuest = {
          ...sanitizeQuestRecord(selectedQuest),
          id: `repeatable-${category}-${Date.now()}`,
          progress: 0,
          completed: false,
          claimed: false,
          category,
          completionCount: 0
        };

        // Mevcut kategori görevini bul ve değiştir, yoksa ekle
        const existingIndex = safeRepQuests.findIndex(q => q.category === category);
        if (existingIndex >= 0) {
          const updatedQuests = [...safeRepQuests];
          updatedQuests[existingIndex] = newQuest;
          set({ repeatableQuests: updatedQuests });
        } else {
          set({ repeatableQuests: [...safeRepQuests, newQuest] });
        }
      },

      // 
      // 📖 HİKAYE GÖREVLERİ - Oyunu öğreten sıralı görevler
      // 
      initializeStoryQuests: () => {
        const state = get();

        // Zaten story quest varsa tekrar oluşturma
        if ((state.storyQuests || []).length > 0) return;

        type StoryQuestDef = {
          chapter: number;
          order: number;
          type: QuestType;
          title: string;
          description: string;
          icon: string;
          target: number;
          reward: { trophy: number; coins: number; xp: number };
          screen: string;
          hint: string;
          tutorialText?: string;
          unlockRequirement?: string;
        };

        // 50 Story Quest - 5 Bölüm
        const storyQuestDefs: StoryQuestDef[] = [
          // Bölüm 1: Başlangıç (Quest 1-10)
          { chapter: 1, order: 1, type: 'COMPLETE_QUIZ', title: '📖 İlk Adım', description: '3 quiz sorusu cevapla', icon: '📖', target: 3, reward: { trophy: 1, coins: 10, xp: 20 }, screen: 'Quiz', hint: 'Quiz moduna git!', tutorialText: 'Quiz modu, kelime bilgini test eder. Doğru cevabı seç!' },
          { chapter: 1, order: 2, type: 'PLANT_WORDS', title: '📖 İlk Tohum', description: '2 kelime tarlaya ekle', icon: '📖', target: 2, reward: { trophy: 1, coins: 12, xp: 24 }, screen: 'Quiz', hint: 'Doğru cevapladığın kelimeler tarlaya eklenir!', tutorialText: 'Her doğru cevap bir tohum eker!' },
          { chapter: 1, order: 3, type: 'SPEECH_PRACTICE', title: '📖 İlk Ses', description: '1 cümleyi mükemmel söyle', icon: '📖', target: 1, reward: { trophy: 1, coins: 14, xp: 28 }, screen: 'SesYap', hint: 'SesYap modunda mikrofona konuş!', tutorialText: 'SesYap modunda telaffuz pratik yap!' },
          { chapter: 1, order: 4, type: 'COMPLETE_QUIZ', title: '📖 Devam Et', description: '5 quiz sorusu cevapla', icon: '📖', target: 5, reward: { trophy: 1, coins: 11, xp: 22 }, screen: 'Quiz', hint: 'Daha fazla quiz çöz!' },
          { chapter: 1, order: 5, type: 'REACH_COMBO', title: '📖 İlk Combo', description: '3 combo ulaş', icon: '📖', target: 3, reward: { trophy: 1, coins: 13, xp: 26 }, screen: 'Quiz', hint: 'Art arda doğru cevapla!', tutorialText: 'Combo = art arda doğru cevap!' },
          { chapter: 1, order: 6, type: 'PLANT_WORDS', title: '📖 Büyüyen Tarla', description: '5 kelime tarlaya ekle', icon: '📖', target: 5, reward: { trophy: 1, coins: 15, xp: 30 }, screen: 'Quiz', hint: 'Daha fazla kelime ekle!' },
          { chapter: 1, order: 7, type: 'SPEECH_PRACTICE', title: '📖 Ses Pratiği', description: '2 cümleyi mükemmel söyle', icon: '📖', target: 2, reward: { trophy: 2, coins: 17, xp: 34 }, screen: 'SesYap', hint: 'Daha fazla SesYap!' },
          { chapter: 1, order: 8, type: 'COMPLETE_PUZZLE', title: '📖 İlk Yapboz', description: '1 yapboz tamamla', icon: '📖', target: 1, reward: { trophy: 1, coins: 12, xp: 24 }, screen: 'Farm', hint: 'Tarladaki bir karta tıkla ve yapboz çöz!', tutorialText: 'Yapboz = kelimeyi pekiştir!' },
          { chapter: 1, order: 9, type: 'HARVEST_WORDS', title: '📖 İlk Hasat', description: '1 kelime hasat et', icon: '📖', target: 1, reward: { trophy: 2, coins: 400, xp: 40 }, screen: 'Farm', hint: 'Yeşil kartları sağa kaydır!', tutorialText: 'Yeşil kart = hasat zamanı!' },
          { chapter: 1, order: 10, type: 'EARN_COINS', title: '📖 Hazine Başlangıcı', description: '100 coin kazan', icon: '📖', target: 10, reward: { trophy: 2, coins: 16, xp: 32 }, screen: 'Quiz', hint: 'Her aktivite coin verir!' },

          // Bölüm 2: Gelişim (Quest 11-20)
          { chapter: 2, order: 11, type: 'COMPLETE_QUIZ', title: '📗 Quiz Yolculuğu', description: '10 quiz sorusu cevapla', icon: '📗', target: 10, reward: { trophy: 2, coins: 18, xp: 36 }, screen: 'Quiz', hint: 'Quiz master yolunda!', unlockRequirement: 'Bölüm 1 tamamla' },
          { chapter: 2, order: 12, type: 'REACH_COMBO', title: '📗 Combo Yükselişi', description: '7 combo ulaş', icon: '📗', target: 7, reward: { trophy: 2, coins: 19, xp: 38 }, screen: 'Quiz', hint: 'Daha yüksek combo!' },
          { chapter: 2, order: 13, type: 'HARVEST_WORDS', title: '📗 Hasat Devam', description: '3 kelime hasat et', icon: '📗', target: 3, reward: { trophy: 2, coins: 440, xp: 44 }, screen: 'Farm', hint: 'Yeşil kartları topla!' },
          { chapter: 2, order: 14, type: 'SPEECH_PRACTICE', title: '📗 Ses Gelişimi', description: '3 cümleyi mükemmel söyle', icon: '📗', target: 3, reward: { trophy: 2, coins: 400, xp: 40 }, screen: 'SesYap', hint: 'SesYap ustası ol!' },
          { chapter: 2, order: 15, type: 'COMPLETE_PUZZLE', title: '📗 Yapboz Serisi', description: '3 yapboz tamamla', icon: '📗', target: 3, reward: { trophy: 2, coins: 17, xp: 34 }, screen: 'Farm', hint: 'Daha fazla yapboz!' },
          { chapter: 2, order: 16, type: 'PLANT_WORDS', title: '📗 Tarla Genişleme', description: '10 kelime tarlaya ekle', icon: '📗', target: 10, reward: { trophy: 2, coins: 400, xp: 40 }, screen: 'Quiz', hint: 'Tarlanı büyüt!' },
          { chapter: 2, order: 17, type: 'HARVEST_PHRASAL', title: '📗 İlk Phrasal', description: '1 phrasal verb hasat et', icon: '📗', target: 1, reward: { trophy: 2, coins: 480, xp: 48 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal Verb Çiftliğine git!', tutorialText: 'Phrasal verbler = ileri seviye!' },
          { chapter: 2, order: 18, type: 'WIN_BATTLE', title: '📗 İlk Savaş', description: '1 battle kazan', icon: '📗', target: 1, reward: { trophy: 3, coins: 600, xp: 60 }, screen: 'Battle', hint: 'Battle modunda savaş!', tutorialText: 'Battle = rakiple yarış!' },
          { chapter: 2, order: 19, type: 'REACH_COMBO', title: '📗 Combo Pro', description: '10 combo ulaş', icon: '📗', target: 10, reward: { trophy: 2, coins: 420, xp: 42 }, screen: 'Quiz', hint: '10 combo hedefi!' },
          { chapter: 2, order: 20, type: 'EARN_COINS', title: '📗 Hazine Büyümesi', description: '200 coin kazan', icon: '📗', target: 20, reward: { trophy: 2, coins: 400, xp: 40 }, screen: 'Quiz', hint: 'Coin biriktir!' },

          // Bölüm 3: Uzmanlık (Quest 21-30)
          { chapter: 3, order: 21, type: 'SPEECH_PRACTICE', title: '📘 Ses Ustası', description: '5 cümleyi mükemmel söyle', icon: '📘', target: 5, reward: { trophy: 3, coins: 520, xp: 52 }, screen: 'SesYap', hint: 'Ses ustası!', unlockRequirement: 'Bölüm 2 tamamla' },
          { chapter: 3, order: 22, type: 'COMPLETE_QUIZ', title: '📘 Quiz Expert', description: '15 quiz sorusu cevapla', icon: '📘', target: 15, reward: { trophy: 2, coins: 400, xp: 40 }, screen: 'Quiz', hint: 'Expert seviye!' },
          { chapter: 3, order: 23, type: 'HARVEST_WORDS', title: '📘 Hasat Ustası', description: '5 kelime hasat et', icon: '📘', target: 5, reward: { trophy: 3, coins: 560, xp: 56 }, screen: 'Farm', hint: 'Hasat pro!' },
          { chapter: 3, order: 24, type: 'HARVEST_PHRASAL', title: '📘 Phrasal Yolculuğu', description: '3 phrasal verb hasat et', icon: '📘', target: 3, reward: { trophy: 3, coins: 600, xp: 60 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal ustası!' },
          { chapter: 3, order: 25, type: 'COMPLETE_PUZZLE', title: '📘 Yapboz Expert', description: '5 yapboz tamamla', icon: '📘', target: 5, reward: { trophy: 2, coins: 440, xp: 44 }, screen: 'Farm', hint: 'Yapboz pro!' },
          { chapter: 3, order: 26, type: 'REACH_COMBO', title: '📘 Combo Master', description: '15 combo ulaş', icon: '📘', target: 15, reward: { trophy: 3, coins: 560, xp: 56 }, screen: 'Quiz', hint: 'Combo master!' },
          { chapter: 3, order: 27, type: 'WIN_BATTLE', title: '📘 Battle Expert', description: '2 battle kazan', icon: '📘', target: 2, reward: { trophy: 4, coins: 720, xp: 72 }, screen: 'Battle', hint: 'Battle ustası!' },
          { chapter: 3, order: 28, type: 'PLANT_WORDS', title: '📘 Mega Tarla', description: '15 kelime tarlaya ekle', icon: '📘', target: 15, reward: { trophy: 2, coins: 460, xp: 46 }, screen: 'Quiz', hint: 'Büyük tarla!' },
          { chapter: 3, order: 29, type: 'SPEECH_PRACTICE', title: '📘 Ses Pro', description: '6 cümleyi mükemmel söyle', icon: '📘', target: 6, reward: { trophy: 3, coins: 600, xp: 60 }, screen: 'SesYap', hint: 'Ses pro!' },
          { chapter: 3, order: 30, type: 'EARN_COINS', title: '📘 Hazine Expert', description: '300 coin kazan', icon: '📘', target: 30, reward: { trophy: 2, coins: 480, xp: 48 }, screen: 'Quiz', hint: 'Büyük hazine!' },

          // Bölüm 4: Ustalık (Quest 31-40)
          { chapter: 4, order: 31, type: 'WIN_BATTLE', title: '📙 Battle Master', description: '3 battle kazan', icon: '📙', target: 3, reward: { trophy: 5, coins: 880, xp: 88 }, screen: 'Battle', hint: 'Battle master!', unlockRequirement: 'Bölüm 3 tamamla' },
          { chapter: 4, order: 32, type: 'SPEECH_PRACTICE', title: '📙 Ses Virtuoso', description: '8 cümleyi mükemmel söyle', icon: '📙', target: 8, reward: { trophy: 4, coins: 760, xp: 76 }, screen: 'SesYap', hint: 'Ses virtuosu!' },
          { chapter: 4, order: 33, type: 'HARVEST_WORDS', title: '📙 Hasat Kralı', description: '8 kelime hasat et', icon: '📙', target: 8, reward: { trophy: 4, coins: 720, xp: 72 }, screen: 'Farm', hint: 'Hasat kralı!' },
          { chapter: 4, order: 34, type: 'REACH_COMBO', title: '📙 Combo Legend', description: '20 combo ulaş', icon: '📙', target: 20, reward: { trophy: 4, coins: 720, xp: 72 }, screen: 'Quiz', hint: 'Efsane combo!' },
          { chapter: 4, order: 35, type: 'HARVEST_PHRASAL', title: '📙 Phrasal Master', description: '5 phrasal verb hasat et', icon: '📙', target: 5, reward: { trophy: 4, coins: 800, xp: 80 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal master!' },
          { chapter: 4, order: 36, type: 'COMPLETE_QUIZ', title: '📙 Quiz Master', description: '25 quiz sorusu cevapla', icon: '📙', target: 25, reward: { trophy: 3, coins: 560, xp: 56 }, screen: 'Quiz', hint: 'Quiz master!' },
          { chapter: 4, order: 37, type: 'COMPLETE_PUZZLE', title: '📙 Yapboz Master', description: '10 yapboz tamamla', icon: '📙', target: 10, reward: { trophy: 3, coins: 640, xp: 64 }, screen: 'Farm', hint: 'Yapboz master!' },
          { chapter: 4, order: 38, type: 'PLANT_WORDS', title: '📙 Tarla İmparatoru', description: '25 kelime tarlaya ekle', icon: '📙', target: 25, reward: { trophy: 3, coins: 600, xp: 60 }, screen: 'Quiz', hint: 'Tarla imparatoru!' },
          { chapter: 4, order: 39, type: 'SPEECH_PRACTICE', title: '📙 Ses Efsanesi', description: '10 cümleyi mükemmel söyle', icon: '📙', target: 10, reward: { trophy: 5, coins: 1000, xp: 100 }, screen: 'SesYap', hint: 'Ses efsanesi!' },
          { chapter: 4, order: 40, type: 'EARN_COINS', title: '📙 Hazine Kralı', description: '500 coin kazan', icon: '📙', target: 50, reward: { trophy: 3, coins: 720, xp: 72 }, screen: 'Quiz', hint: 'Hazine kralı!' },

          // Bölüm 5: Efsane (Quest 41-50)
          { chapter: 5, order: 41, type: 'WIN_BATTLE', title: '📕 Battle Legend', description: '5 battle kazan', icon: '📕', target: 5, reward: { trophy: 8, coins: 1400, xp: 140 }, screen: 'Battle', hint: 'Battle efsanesi!', unlockRequirement: 'Bölüm 4 tamamla' },
          { chapter: 5, order: 42, type: 'SPEECH_PRACTICE', title: '📕 Ses İmparatoru', description: '15 cümleyi mükemmel söyle', icon: '📕', target: 15, reward: { trophy: 7, coins: 1280, xp: 128 }, screen: 'SesYap', hint: 'Ses imparatoru!' },
          { chapter: 5, order: 43, type: 'HARVEST_WORDS', title: '📕 Hasat Efsanesi', description: '15 kelime hasat et', icon: '📕', target: 15, reward: { trophy: 6, coins: 1120, xp: 112 }, screen: 'Farm', hint: 'Hasat efsanesi!' },
          { chapter: 5, order: 44, type: 'REACH_COMBO', title: '📕 Combo İmparatoru', description: '30 combo ulaş', icon: '📕', target: 30, reward: { trophy: 7, coins: 1200, xp: 120 }, screen: 'Quiz', hint: 'Combo imparatoru!' },
          { chapter: 5, order: 45, type: 'HARVEST_PHRASAL', title: '📕 Phrasal Efsane', description: '10 phrasal verb hasat et', icon: '📕', target: 10, reward: { trophy: 7, coins: 1400, xp: 140 }, screen: 'PhrasalVerbFarm', hint: 'Phrasal efsane!' },
          { chapter: 5, order: 46, type: 'COMPLETE_QUIZ', title: '📕 Quiz Efsanesi', description: '50 quiz sorusu cevapla', icon: '📕', target: 50, reward: { trophy: 6, coins: 1040, xp: 104 }, screen: 'Quiz', hint: 'Quiz efsanesi!' },
          { chapter: 5, order: 47, type: 'COMPLETE_PUZZLE', title: '📕 Yapboz Efsanesi', description: '20 yapboz tamamla', icon: '📕', target: 20, reward: { trophy: 6, coins: 1120, xp: 112 }, screen: 'Farm', hint: 'Yapboz efsanesi!' },
          { chapter: 5, order: 48, type: 'PLANT_WORDS', title: '📕 Tarla Efsanesi', description: '50 kelime tarlaya ekle', icon: '📕', target: 50, reward: { trophy: 5, coins: 960, xp: 96 }, screen: 'Quiz', hint: 'Tarla efsanesi!' },
          { chapter: 5, order: 49, type: 'SPEECH_PRACTICE', title: '📕 Ses Tanrısı', description: '20 cümleyi mükemmel söyle', icon: '📕', target: 20, reward: { trophy: 10, coins: 2000, xp: 200 }, screen: 'SesYap', hint: 'Ses tanrısı!' },
          { chapter: 5, order: 50, type: 'EARN_COINS', title: '📕 Final Hazine', description: '1000 coin kazan', icon: '📕', target: 100, reward: { trophy: 8, coins: 1600, xp: 160 }, screen: 'Quiz', hint: 'Final hazine!' },
        ];

        const storyQuests: StoryQuest[] = storyQuestDefs.map((quest, idx) => ({
          ...sanitizeQuestRecord(quest),
          id: `story-${quest.chapter}-${quest.order}`,
          progress: 0,
          completed: false,
          claimed: false,
          isUnlocked: quest.chapter === 1 && quest.order === 1 // Sadece ilk görev açık
        }));

        set({ storyQuests });
      },

      checkStoryQuestUnlocks: () => {
        const state = get();
        const safeStoryQuests = Array.isArray(state.storyQuests) ? state.storyQuests : [];
        if (safeStoryQuests.length === 0) return;

        // Her bölümün son görevi tamamlandıysa sonraki bölümü aç
        const updatedQuests = safeStoryQuests.map((quest, idx) => {
          if (quest.isUnlocked) return quest;

          // Önceki görevin claimed olup olmadığını kontrol et
          const previousQuest = safeStoryQuests.find(q => q.order === quest.order - 1);
          if (previousQuest && previousQuest.claimed) {
            return { ...quest, isUnlocked: true };
          }

          // Bölüm başıysa, önceki bölümün tamamını kontrol et
          if (quest.unlockRequirement) {
            const previousChapter = quest.chapter - 1;
            const previousChapterQuests = safeStoryQuests.filter(q => q.chapter === previousChapter);
            const allClaimed = previousChapterQuests.every(q => q.claimed);
            if (allClaimed) {
              return { ...quest, isUnlocked: true };
            }
          }

          return quest;
        });

        set({ storyQuests: updatedQuests });
      },

      // 
      //  BAARI GÖREVLERİ - Ömür boyu hedefler
      // 
      initializeAchievementQuests: () => {
        const state = get();

        // Zaten achievement quest varsa tekrar oluşturma
        if ((state.achievementQuests || []).length > 0) return;

        type AchievementDef = {
          category: AchievementQuest['category'];
          tier: 1 | 2 | 3 | 4 | 5 | 6;
          type: QuestType;
          title: string;
          description: string;
          icon: string;
          target: number;
          reward: { trophy: number; coins: number; xp: number };
        };

        // 8 kategori × 6 tier = 48 achievement
        const achievementDefs: AchievementDef[] = [
          // Kategori 1: Quiz Master
          { category: 'quiz', tier: 1, type: 'COMPLETE_QUIZ', title: '📝 Quiz Çaylağı', description: '50 quiz sorusu cevapla', icon: '📝', target: 50, reward: { trophy: 5, coins: 800, xp: 80 } },
          { category: 'quiz', tier: 2, type: 'COMPLETE_QUIZ', title: '📝 Quiz Öğrencisi', description: '200 quiz sorusu cevapla', icon: '📝', target: 200, reward: { trophy: 10, coins: 1600, xp: 160 } },
          { category: 'quiz', tier: 3, type: 'COMPLETE_QUIZ', title: '📝 Quiz Ustası', description: '500 quiz sorusu cevapla', icon: '📝', target: 500, reward: { trophy: 20, coins: 3200, xp: 320 } },
          { category: 'quiz', tier: 4, type: 'COMPLETE_QUIZ', title: '📝 Quiz Expert', description: '1000 quiz sorusu cevapla', icon: '📝', target: 1000, reward: { trophy: 40, coins: 6000, xp: 600 } },
          { category: 'quiz', tier: 5, type: 'COMPLETE_QUIZ', title: '📝 Quiz Master', description: '2500 quiz sorusu cevapla', icon: '📝', target: 2500, reward: { trophy: 80, coins: 12000, xp: 1200 } },
          { category: 'quiz', tier: 6, type: 'COMPLETE_QUIZ', title: '📝 Quiz Efsanesi', description: '5000 quiz sorusu cevapla', icon: '📝', target: 5000, reward: { trophy: 150, coins: 20000, xp: 2000 } },

          // Kategori 2: Ses Ustası
          { category: 'speech', tier: 1, type: 'SPEECH_PRACTICE', title: '🎤 Ses Çaylağı', description: '10 cümle mükemmel söyle', icon: '🎤', target: 10, reward: { trophy: 5, coins: 1000, xp: 100 } },
          { category: 'speech', tier: 2, type: 'SPEECH_PRACTICE', title: '🎤 Ses Öğrencisi', description: '50 cümle mükemmel söyle', icon: '🎤', target: 50, reward: { trophy: 12, coins: 2000, xp: 200 } },
          { category: 'speech', tier: 3, type: 'SPEECH_PRACTICE', title: '🎤 Ses Ustası', description: '150 cümle mükemmel söyle', icon: '🎤', target: 150, reward: { trophy: 25, coins: 4000, xp: 400 } },
          { category: 'speech', tier: 4, type: 'SPEECH_PRACTICE', title: '🎤 Ses Expert', description: '350 cümle mükemmel söyle', icon: '🎤', target: 350, reward: { trophy: 50, coins: 8000, xp: 800 } },
          { category: 'speech', tier: 5, type: 'SPEECH_PRACTICE', title: '🎤 Ses Master', description: '750 cümle mükemmel söyle', icon: '🎤', target: 750, reward: { trophy: 100, coins: 16000, xp: 1600 } },
          { category: 'speech', tier: 6, type: 'SPEECH_PRACTICE', title: '🎤 Ses Efsanesi', description: '1500 cümle mükemmel söyle', icon: '🎤', target: 1500, reward: { trophy: 200, coins: 30000, xp: 3000 } },

          // Kategori 3: Hasat Kralı
          { category: 'harvest', tier: 1, type: 'HARVEST_WORDS', title: '🌾 Hasat Çaylağı', description: '25 kelime hasat et', icon: '🌾', target: 25, reward: { trophy: 5, coins: 800, xp: 80 } },
          { category: 'harvest', tier: 2, type: 'HARVEST_WORDS', title: '🌾 Hasat Öğrencisi', description: '100 kelime hasat et', icon: '🌾', target: 100, reward: { trophy: 12, coins: 1800, xp: 180 } },
          { category: 'harvest', tier: 3, type: 'HARVEST_WORDS', title: '🌾 Hasat Ustası', description: '300 kelime hasat et', icon: '🌾', target: 300, reward: { trophy: 25, coins: 3600, xp: 360 } },
          { category: 'harvest', tier: 4, type: 'HARVEST_WORDS', title: '🌾 Hasat Expert', description: '700 kelime hasat et', icon: '🌾', target: 700, reward: { trophy: 50, coins: 7200, xp: 720 } },
          { category: 'harvest', tier: 5, type: 'HARVEST_WORDS', title: '🌾 Hasat Master', description: '1500 kelime hasat et', icon: '🌾', target: 1500, reward: { trophy: 100, coins: 14000, xp: 1400 } },
          { category: 'harvest', tier: 6, type: 'HARVEST_WORDS', title: '🌾 Hasat Efsanesi', description: '3000 kelime hasat et', icon: '🌾', target: 3000, reward: { trophy: 200, coins: 28000, xp: 2800 } },

          // Kategori 4: Savaşçı
          { category: 'battle', tier: 1, type: 'WIN_BATTLE', title: '⚔️ Çaylak Savaşçı', description: '5 battle kazan', icon: '⚔️', target: 5, reward: { trophy: 8, coins: 1200, xp: 120 } },
          { category: 'battle', tier: 2, type: 'WIN_BATTLE', title: '⚔️ Savaşçı', description: '20 battle kazan', icon: '⚔️', target: 20, reward: { trophy: 18, coins: 2400, xp: 240 } },
          { category: 'battle', tier: 3, type: 'WIN_BATTLE', title: '⚔️ Savaş Ustası', description: '50 battle kazan', icon: '⚔️', target: 50, reward: { trophy: 35, coins: 4800, xp: 480 } },
          { category: 'battle', tier: 4, type: 'WIN_BATTLE', title: '⚔️ Savaş Expert', description: '120 battle kazan', icon: '⚔️', target: 120, reward: { trophy: 70, coins: 10000, xp: 1000 } },
          { category: 'battle', tier: 5, type: 'WIN_BATTLE', title: '⚔️ Savaş Master', description: '250 battle kazan', icon: '⚔️', target: 250, reward: { trophy: 140, coins: 20000, xp: 2000 } },
          { category: 'battle', tier: 6, type: 'WIN_BATTLE', title: '⚔️ Savaş Efsanesi', description: '500 battle kazan', icon: '⚔️', target: 500, reward: { trophy: 300, coins: 40000, xp: 4000 } },

          // Kategori 5: Combo Ustası
          { category: 'combo', tier: 1, type: 'REACH_COMBO', title: '🔥 Combo Çaylağı', description: '10 combo ulaş', icon: '🔥', target: 10, reward: { trophy: 4, coins: 600, xp: 60 } },
          { category: 'combo', tier: 2, type: 'REACH_COMBO', title: '🔥 Combo Öğrencisi', description: '25 combo ulaş', icon: '🔥', target: 25, reward: { trophy: 10, coins: 1400, xp: 140 } },
          { category: 'combo', tier: 3, type: 'REACH_COMBO', title: '🔥 Combo Ustası', description: '50 combo ulaş', icon: '🔥', target: 50, reward: { trophy: 20, coins: 2800, xp: 280 } },
          { category: 'combo', tier: 4, type: 'REACH_COMBO', title: '🔥 Combo Expert', description: '100 combo ulaş', icon: '🔥', target: 100, reward: { trophy: 40, coins: 5600, xp: 560 } },
          { category: 'combo', tier: 5, type: 'REACH_COMBO', title: '🔥 Combo Master', description: '200 combo ulaş', icon: '🔥', target: 200, reward: { trophy: 80, coins: 12000, xp: 1200 } },
          { category: 'combo', tier: 6, type: 'REACH_COMBO', title: '🔥 Combo Efsanesi', description: '500 combo ulaş', icon: '🔥', target: 500, reward: { trophy: 160, coins: 24000, xp: 2400 } },

          // Kategori 6: Phrasal Expert
          { category: 'phrasal', tier: 1, type: 'HARVEST_PHRASAL', title: '📚 Phrasal Çaylağı', description: '10 phrasal verb hasat et', icon: '📚', target: 10, reward: { trophy: 6, coins: 1120, xp: 112 } },
          { category: 'phrasal', tier: 2, type: 'HARVEST_PHRASAL', title: '📚 Phrasal Öğrencisi', description: '40 phrasal verb hasat et', icon: '📚', target: 40, reward: { trophy: 14, coins: 2240, xp: 224 } },
          { category: 'phrasal', tier: 3, type: 'HARVEST_PHRASAL', title: '📚 Phrasal Ustası', description: '100 phrasal verb hasat et', icon: '📚', target: 100, reward: { trophy: 28, coins: 4400, xp: 440 } },
          { category: 'phrasal', tier: 4, type: 'HARVEST_PHRASAL', title: '📚 Phrasal Expert', description: '250 phrasal verb hasat et', icon: '📚', target: 250, reward: { trophy: 55, coins: 8800, xp: 880 } },
          { category: 'phrasal', tier: 5, type: 'HARVEST_PHRASAL', title: '📚 Phrasal Master', description: '500 phrasal verb hasat et', icon: '📚', target: 500, reward: { trophy: 110, coins: 18000, xp: 1800 } },
          { category: 'phrasal', tier: 6, type: 'HARVEST_PHRASAL', title: '📚 Phrasal Efsanesi', description: '1000 phrasal verb hasat et', icon: '📚', target: 1000, reward: { trophy: 220, coins: 36000, xp: 3600 } },

          // Kategori 7: Yapboz Dehası
          { category: 'puzzle', tier: 1, type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Çaylağı', description: '25 yapboz tamamla', icon: '🧩', target: 25, reward: { trophy: 5, coins: 720, xp: 72 } },
          { category: 'puzzle', tier: 2, type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Öğrencisi', description: '100 yapboz tamamla', icon: '🧩', target: 100, reward: { trophy: 11, coins: 1600, xp: 160 } },
          { category: 'puzzle', tier: 3, type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Ustası', description: '300 yapboz tamamla', icon: '🧩', target: 300, reward: { trophy: 22, coins: 3200, xp: 320 } },
          { category: 'puzzle', tier: 4, type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Expert', description: '700 yapboz tamamla', icon: '🧩', target: 700, reward: { trophy: 45, coins: 6400, xp: 640 } },
          { category: 'puzzle', tier: 5, type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Master', description: '1500 yapboz tamamla', icon: '🧩', target: 1500, reward: { trophy: 90, coins: 12800, xp: 1280 } },
          { category: 'puzzle', tier: 6, type: 'COMPLETE_PUZZLE', title: '🧩 Yapboz Efsanesi', description: '3000 yapboz tamamla', icon: '🧩', target: 3000, reward: { trophy: 180, coins: 26000, xp: 2600 } },

          // Kategori 8: Ekici
          { category: 'plant', tier: 1, type: 'PLANT_WORDS', title: '🌱 Ekici Çaylağı', description: '50 kelime tarlaya ekle', icon: '🌱', target: 50, reward: { trophy: 4, coins: 600, xp: 60 } },
          { category: 'plant', tier: 2, type: 'PLANT_WORDS', title: '🌱 Ekici Öğrencisi', description: '200 kelime tarlaya ekle', icon: '🌱', target: 200, reward: { trophy: 9, coins: 1400, xp: 140 } },
          { category: 'plant', tier: 3, type: 'PLANT_WORDS', title: '🌱 Ekici Ustası', description: '500 kelime tarlaya ekle', icon: '🌱', target: 500, reward: { trophy: 18, coins: 2800, xp: 280 } },
          { category: 'plant', tier: 4, type: 'PLANT_WORDS', title: '🌱 Ekici Expert', description: '1200 kelime tarlaya ekle', icon: '🌱', target: 1200, reward: { trophy: 36, coins: 5600, xp: 560 } },
          { category: 'plant', tier: 5, type: 'PLANT_WORDS', title: '🌱 Ekici Master', description: '2500 kelime tarlaya ekle', icon: '🌱', target: 2500, reward: { trophy: 72, coins: 11200, xp: 1120 } },
          { category: 'plant', tier: 6, type: 'PLANT_WORDS', title: '🌱 Ekici Efsanesi', description: '5000 kelime tarlaya ekle', icon: '🌱', target: 5000, reward: { trophy: 145, coins: 22000, xp: 2200 } },
        ];

        const achievementQuests: AchievementQuest[] = achievementDefs.map((quest) => ({
          ...sanitizeQuestRecord(quest),
          id: `achievement-${quest.category}-${quest.tier}`,
          progress: 0,
          completed: false,
          claimed: false,
          screen: 'Quiz',
          hint: `${quest.target} hedefine ulas!`,
          nextTierId: quest.tier < 6 ? `achievement-${quest.category}-${quest.tier + 1}` : undefined
        }));

        set({ achievementQuests });
      },

      checkAchievementProgress: () => {
        try {
        // ⚡ OPTIMIZE: Achievement'ları lifetime stats ile güncelle - sadece değişenler
        const state = get();
        
        // Eğer achievement yoksa çık
        const safeAchievementQuests = Array.isArray(state.achievementQuests) ? state.achievementQuests : [];
        if (safeAchievementQuests.length === 0) return;

        // Lifetime stats'ı önceden hesapla (her quest için tekrar hesaplama)
        const progressByCategory: Record<string, number> = {
          quiz: state.lifetimeQuizAnswered || 0,
          speech: state.lifetimeSpeechPractice || 0,
          harvest: state.lifetimeHarvests || 0,
          battle: state.lifetimeBattlesWon || 0,
          combo: state.bestStreak || 0,
          phrasal: state.lifetimePhrasalHarvested || 0,
          puzzle: state.lifetimePuzzlesCompleted || 0,
          plant: state.lifetimePlantedWords || 0,
        };

        let hasChanges = false;
        const updatedAchievements = safeAchievementQuests.map(quest => {
          // Zaten tamamlandıysa skip
          if (quest.completed) return quest;

          const currentProgress = progressByCategory[quest.category] || 0;
          const newProgress = Math.min(currentProgress, quest.target);
          const isCompleted = currentProgress >= quest.target;

          // Değişiklik var mı kontrol et
          if (quest.progress !== newProgress || quest.completed !== isCompleted) {
            hasChanges = true;
            return { ...quest, progress: newProgress, completed: isCompleted };
          }
          return quest;
        });

        // Sadece değişiklik varsa set çağır
        if (hasChanges) {
          set({ achievementQuests: updatedAchievements });
        }
        } catch (e) {
          console.error('[checkAchievementProgress] Error:', e);
        }
      },

      // 
      // 🚀 TOPLU QUEST BALATMA - Tek seferde tüm görevleri kontrol et
      // 
      initializeAllQuests: () => {
        if (questInitInFlight) return;
        questInitInFlight = true;
        try {
          // 1. Daily quests
          get().checkAndResetDailyQuests();

          // 2. Weekly quests
          get().checkAndResetWeeklyQuests();
          const s1 = get();
          if (!Array.isArray(s1.weeklyQuests) || s1.weeklyQuests.length === 0) {
            get().generateWeeklyQuests();
          }

          // 3. Repeatable quests (her kategoriden bir tane)
          const s2 = get();
          if (!Array.isArray(s2.repeatableQuests) || s2.repeatableQuests.length === 0) {
            get().generateRepeatableQuest('fast');
            get().generateRepeatableQuest('medium');
            get().generateRepeatableQuest('long');
          }

          // 4. Story quests
          const s3 = get();
          if (!Array.isArray(s3.storyQuests) || s3.storyQuests.length === 0) {
            get().initializeStoryQuests();
          } else {
            get().checkStoryQuestUnlocks();
          }

          // 5. Achievement quests
          const s4 = get();
          if (!Array.isArray(s4.achievementQuests) || s4.achievementQuests.length === 0) {
            get().initializeAchievementQuests();
          } else {
            get().checkAchievementProgress();
          }
        } catch (e) {
          console.error('[initializeAllQuests] Error:', e);
        } finally {
          questInitInFlight = false;
        }
      },

      // 
      //  MASTERY PATHS - 5 uzmanlaşma yolu
      // 
      initializeMasteryPaths: () => {
        const state = get();

        // Zaten mastery path varsa tekrar oluşturma
        if ((state.masteryPaths || []).length > 0) return;

        const pathDefs: { id: string; name: string; icon: string; description: string; levelTargets: number[] }[] = [
          {
            id: 'vocabulary',
            name: 'Kelime Ustası',
            icon: '📚',
            description: 'Kelime hasat ederek kelime ustası ol!',
            levelTargets: [10, 25, 50, 75, 100, 150, 200, 275, 350, 450, 550, 700, 850, 1000, 1200, 1400, 1650, 1900, 2200, 2500, 2850, 3200, 3600, 4000, 5000]
          },
          {
            id: 'speaking',
            name: 'Konuşma Ustası',
            icon: '🎤',
            description: 'Konuşma pratiği yaparak konuşma ustası ol!',
            levelTargets: [5, 15, 30, 50, 75, 100, 140, 180, 230, 280, 340, 400, 475, 550, 640, 730, 840, 950, 1080, 1210, 1360, 1510, 1680, 1850, 2000]
          },
          {
            id: 'battle',
            name: 'Savaş Ustası',
            icon: '⚔️',
            description: 'Battle kazanarak savaş ustası ol!',
            levelTargets: [3, 8, 15, 25, 40, 60, 85, 115, 150, 190, 235, 285, 340, 400, 470, 545, 630, 720, 820, 930, 1050, 1180, 1320, 1470, 1700]
          },
          {
            id: 'puzzle',
            name: 'Yapboz Ustası',
            icon: '🧩',
            description: 'Yapboz tamamlayarak yapboz ustası ol!',
            levelTargets: [10, 30, 60, 100, 150, 210, 280, 360, 450, 550, 670, 800, 950, 1100, 1280, 1470, 1680, 1910, 2160, 2430, 2720, 3030, 3360, 3710, 4500]
          },
          {
            id: 'phrasal',
            name: 'Phrasal Ustası',
            icon: '📖',
            description: 'Phrasal verb hasat ederek phrasal ustası ol!',
            levelTargets: [5, 15, 30, 50, 75, 105, 140, 180, 225, 275, 335, 400, 475, 555, 645, 745, 855, 975, 1105, 1245, 1395, 1555, 1725, 1905, 2200]
          },
        ];

        const masteryPaths: MasteryPath[] = pathDefs.map(path => ({
          id: path.id,
          name: path.name,
          icon: path.icon,
          description: path.description,
          currentLevel: 0,
          maxLevel: 25,
          totalProgress: 0,
          levels: path.levelTargets.map((target, idx) => ({
            level: idx + 1,
            target,
            reward: {
              trophy: Math.floor((idx + 1) * 2),
              coins: Math.floor((idx + 1) * 50),
              xp: Math.floor((idx + 1) * 100)
            },
            unlocked: idx === 0,
            claimed: false
          }))
        }));

        set({ masteryPaths });
      },

      checkMasteryProgress: () => {
        try {
        const state = get();

        // ⚡ OPTIMIZE: Mastery path yoksa çık
        const safeMasteryPaths = Array.isArray(state.masteryPaths) ? state.masteryPaths : [];
        if (safeMasteryPaths.length === 0) return;

        // Progress'leri önceden hesapla
        const progressById: Record<string, number> = {
          vocabulary: state.lifetimeHarvests || 0,
          speaking: state.lifetimeSpeechPractice || 0,
          battle: state.lifetimeBattlesWon || 0,
          puzzle: state.lifetimePuzzlesCompleted || 0,
          phrasal: state.lifetimePhrasalHarvested || 0,
        };

        let hasChanges = false;
        const updatedPaths = safeMasteryPaths.map(path => {
          const progress = progressById[path.id] || 0;

          // Progress değişmediyse skip
          if (path.totalProgress === progress) return path;

          hasChanges = true;

          // Seviyeleri güncelle
          const updatedLevels = (path.levels || []).map((level: any, idx: number) => {
            const isUnlocked = idx === 0 || ((path.levels || [])[idx - 1]?.claimed ?? false);
            return { ...level, unlocked: isUnlocked };
          });

          // Mevcut seviyeyi hesapla
          let currentLevel = 0;
          for (let i = 0; i < updatedLevels.length; i++) {
            if (progress >= updatedLevels[i].target && updatedLevels[i].claimed) {
              currentLevel = i + 1;
            } else {
              break;
            }
          }

          return { ...path, currentLevel, totalProgress: progress, levels: updatedLevels };
        });

        // Sadece değişiklik varsa set çağır
        if (hasChanges) {
          set({ masteryPaths: updatedPaths });
        }
        } catch (e) {
          console.error('[checkMasteryProgress] Error:', e);
        }
      },

      // Combo Actions - persists across quizzes
      setCurrentCombo: (combo: number) => set({ currentCombo: combo }),
      incrementCombo: () => {
        const newCombo = get().currentCombo + 1;
        set(state => ({
          currentCombo: newCombo,
          bestStreak: Math.max(state.bestStreak, newCombo)
        }));
        return newCombo;
      },
      resetCombo: () => set({ currentCombo: 0 }),

      // Quiz Combo (Regular Quiz - ayrı)
      setCurrentQuizCombo: (combo: number) => set({ currentQuizCombo: combo }),
      incrementQuizCombo: () => {
        const newCombo = get().currentQuizCombo + 1;
        set({ currentQuizCombo: newCombo });

        //  GÜNLÜK GÖREV - Combo arttı, quest'i güncelle! (crash-safe)
        try { get().queueQuestProgress('REACH_COMBO', newCombo, 'max'); } catch(e) {}

        return newCombo;
      },
      resetQuizCombo: () => set({ currentQuizCombo: 0 }),

      // Phrasal Combo (Phrasal Verb Quiz - ayrı)
      setCurrentPhrasalCombo: (combo: number) => set({ currentPhrasalCombo: combo }),
      incrementPhrasalCombo: () => {
        const newCombo = get().currentPhrasalCombo + 1;
        set({ currentPhrasalCombo: newCombo });

        //  GÜNLÜK GÖREV - Combo arttı, quest'i güncelle! (crash-safe)
        try { get().queueQuestProgress('REACH_COMBO', newCombo, 'max'); } catch(e) {}

        return newCombo;
      },
      resetPhrasalCombo: () => set({ currentPhrasalCombo: 0 }),

      // UI State Actions
      setFeedVisible: (visible: boolean) => set({ feedVisible: visible }),

      // 🧩 Puzzle Stats - Yapboz için ayrı ilerleme sistemi
      // Kırmızı (0) → Turuncu (1) → Sarı (2) → Yeşil (3) → Master/Altın (4+) → Ultra/Elmas → Perfect/Kraliyet
      // Master'dan önce 1 doğru = 1 session, Master'dan sonra 2 ardışık doğru = 1 session
      updateWordPuzzleStat: (wordId: string, correct: boolean) => {
        const safeWordId = typeof wordId === 'string' ? wordId.trim() : '';
        if (!safeWordId) return;
        const state = get();
        const safeFarm = toSafeWordArray(state.farm);
        const safePhrasalFarm = toSafeWordArray(state.phrasalVerbFarm);

        //  Önce farm'da ara, yoksa phrasalVerbFarm'da ara
        const wordInFarm = safeFarm.find(f => f.id === safeWordId);
        const wordInPhrasal = safePhrasalFarm.find(f => f.id === safeWordId);
        const word = wordInFarm || wordInPhrasal;
        const isPhrasalVerb = !wordInFarm && !!wordInPhrasal;

        if (!word) return;

        //  Hasat bekleyen karta tekrar cevap verilmemeli!
        if ((word as any).readyForPuzzleHarvest) {
          console.log('⚠️ Puzzle: Kart hasat bekliyor, session artırılmadı');
          return;
        }

        //  YAPBOZ İÇİN AYRI SİSTEM - Tarla'yı ETKİLEMEZ!
        // ⚠ originalMasterLevel: Kelime tarlaya ilk geldiğindeki masterLevel - DEİMEMELİ!
        const originalMasterLevel = (word as any).originalMasterLevel ?? word.masterLevel ?? 0;
        const currentStats = (word as any).puzzleStats || { sessions: 0, totalCorrect: 0, totalWrong: 0, consecutiveCorrect: 0, puzzleMasterLevel: 0, puzzleTotalHarvests: 0 };
        const currentPuzzleMasterLevel = currentStats.puzzleMasterLevel || 0;
        // 👑 Perfect ödülü alındı mı?
        const puzzleRewardClaimedPerfect = (word as any).puzzleRewardClaimedPerfect === true;
        const safeWordText = normalizeDisplayText((word as any)?.text || (word as any)?.verb || '');
        const guidedTargetMatched = isGuidedTargetMatch(
          state.guidedModeTargetWordId,
          state.guidedModeTargetWordText,
          safeWordId,
          safeWordText
        );

        if (correct) {
          if (state.guidedModeActive && state.guidedModeStep === 'PUZZLE_PRACTICE' && guidedTargetMatched) {
            set({ guidedModeStep: 'SESYAP_PRACTICE' });
            traceEvent('guided_mode_step', {
              from: 'PUZZLE_PRACTICE',
              to: 'SESYAP_PRACTICE',
              wordId: safeWordId,
              wordText: safeWordText,
            });
          } else if (state.guidedModeActive && state.guidedModeStep === 'PUZZLE_PRACTICE') {
            traceEvent('guided_mode_step_blocked', {
              from: 'PUZZLE_PRACTICE',
              to: 'SESYAP_PRACTICE',
              wordId: safeWordId,
              wordText: safeWordText,
              targetWordId: state.guidedModeTargetWordId,
              targetWordText: state.guidedModeTargetWordText,
            }, 'warn');
          }

          // Doğru cevap - session'ı artır
          //  Her doğru cevap = 1 session (master veya normal fark etmez!)
          const newSessions = currentStats.sessions + 1;

          //  PUZZLE MASTER LEVEL - HER SEVİYE İÇİN AYRI SESSION GEREKSİNİMİ
          // Level 0→1: 3 session = Master hasat
          // Level 1→2: 2 session = Ultra hasat (session 0'dan başlar)
          // Level 2→3: 2 session = Perfect hasat (session 0'dan başlar)
          // Level 3: 3 session (ilk hasat) veya 1 session (ödül alındıktan sonra)
          let newPuzzleMasterLevel = currentPuzzleMasterLevel;

          // HER SEVİYEDE SESSION 0'DAN BALIYOR!
          if (currentPuzzleMasterLevel === 0 && newSessions >= 3) {
            newPuzzleMasterLevel = 1; // 3 session = Master!
          } else if (currentPuzzleMasterLevel === 1 && newSessions >= 2) {
            newPuzzleMasterLevel = 2; // 2 session = Ultra!
          } else if (currentPuzzleMasterLevel === 2 && newSessions >= 2) {
            newPuzzleMasterLevel = 3; // 2 session = Perfect!
          }
          // Level 3 (Perfect/Kraliyet): Ödül alınmamışsa 3 session, alınmışsa 1 session

          // 🌾 HASAT KOULLARI - HER SEVİYE İÇİN AYRI
          // 1. Normal kartlar (Level 0): 3 session = Master hasat!
          // 2. Master (Level 1): 2 session = Ultra hasat
          // 3. Ultra (Level 2): 2 session = Perfect hasat
          // 4. Perfect (Level 3): 3 session (ilk) veya 1 session (ödül alındıktan sonra)
          // 👑 Perfect kart için gerekli session: ödül alınmamışsa 3, alınmışsa 1
          const perfectRequiredSessions = puzzleRewardClaimedPerfect ? 1 : 3;
          const shouldHarvest =
            (currentPuzzleMasterLevel === 0 && newSessions >= 3) || // 🌿 3 session = Master hasat!
            newPuzzleMasterLevel > currentPuzzleMasterLevel || // Seviye atlama
            (currentPuzzleMasterLevel === 3 && newSessions >= perfectRequiredSessions); // 👑 Kraliyet: 3 veya 1 session!

          //  Phrasal verb veya normal kelime için doğru array'i güncelle
          if (isPhrasalVerb) {
            if (shouldHarvest) {
              // 🌾 YAPBOZ HASADA HAZIR! Artık OTOMATİK envantere gitmez, MANUEL hasat gerekir!
              // ⚠ readyForPuzzleHarvest: true ayarla - kullanıcı manuel hasat edecek
              set(state => ({
                phrasalVerbFarm: toSafeWordArray(state.phrasalVerbFarm).map(f => f.id === safeWordId ? {
                  ...f,
                  readyForPuzzleHarvest: true, // 🌾 HASAT BEKLIYOR! Manuel hasat edilmeli
                  pendingPuzzleMasterLevel: newPuzzleMasterLevel, //  Hasat sonrası bu seviyeye geçecek
                  puzzleStats: {
                    sessions: newSessions,
                    totalCorrect: currentStats.totalCorrect + 1,
                    totalWrong: currentStats.totalWrong || 0,
                    consecutiveCorrect: 0,
                    puzzleMasterLevel: currentPuzzleMasterLevel, // Henüz seviye atlama YOK!
                    puzzleTotalHarvests: currentStats.puzzleTotalHarvests || 0,
                  },
                } : f),
              }));
            } else {
              //  Seviye atladığında lastPlantedAt GÜNCELLENMESİN - sıralama bozulmasın!
              set(state => ({
                phrasalVerbFarm: toSafeWordArray(state.phrasalVerbFarm).map(f => f.id === safeWordId ? {
                  ...f,
                  puzzleStats: {
                    sessions: newSessions,
                    totalCorrect: currentStats.totalCorrect + 1,
                    totalWrong: currentStats.totalWrong || 0, // Yanlış sayısı korunur
                    consecutiveCorrect: 0,
                    puzzleMasterLevel: newPuzzleMasterLevel,
                    puzzleTotalHarvests: currentStats.puzzleTotalHarvests || 0,
                  },
                  // lastPlantedAt güncellenmeyecek - kelime yerinde kalsın!
                } : f),
              }));
            }
          } else {
            if (shouldHarvest) {
              // 🌾 YAPBOZ HASADA HAZIR! Artık OTOMATİK envantere gitmez, MANUEL hasat gerekir!
              // ⚠ readyForPuzzleHarvest: true ayarla - kullanıcı manuel hasat edecek
              set(state => ({
                farm: toSafeWordArray(state.farm).map(f => f.id === safeWordId ? {
                  ...f,
                  readyForPuzzleHarvest: true, // 🌾 HASAT BEKLIYOR! Manuel hasat edilmeli
                  pendingPuzzleMasterLevel: newPuzzleMasterLevel, //  Hasat sonrası bu seviyeye geçecek
                  puzzleStats: {
                    sessions: newSessions,
                    totalCorrect: currentStats.totalCorrect + 1,
                    totalWrong: currentStats.totalWrong || 0,
                    consecutiveCorrect: 0,
                    puzzleMasterLevel: currentPuzzleMasterLevel, // Henüz seviye atlama YOK!
                    puzzleTotalHarvests: currentStats.puzzleTotalHarvests || 0,
                  },
                } : f),
              }));
            } else {
              //  Seviye atladığında lastPlantedAt GÜNCELLENMESİN - sıralama bozulmasın!
              set(state => ({
                farm: toSafeWordArray(state.farm).map(f => f.id === safeWordId ? {
                  ...f,
                  puzzleStats: {
                    sessions: newSessions,
                    totalCorrect: currentStats.totalCorrect + 1,
                    totalWrong: currentStats.totalWrong || 0, // Yanlış sayısı korunur
                    consecutiveCorrect: 0,
                    puzzleMasterLevel: newPuzzleMasterLevel,
                    puzzleTotalHarvests: currentStats.puzzleTotalHarvests || 0,
                  },
                  // lastPlantedAt güncellenmeyecek - kelime yerinde kalsın!
                } : f),
              }));
            }
          }
        } else {
          //  Yanlış cevap - consecutiveCorrect sıfırla, totalWrong artır
          if (isPhrasalVerb) {
            set(state => ({
              phrasalVerbFarm: toSafeWordArray(state.phrasalVerbFarm).map(f => f.id === safeWordId ? {
                ...f,
                puzzleStats: {
                  ...currentStats,
                  totalWrong: (currentStats.totalWrong || 0) + 1, // 📊 Yanlış sayısı artır!
                  consecutiveCorrect: 0,
                },
              } : f),
            }));
          } else {
            set(state => ({
              farm: toSafeWordArray(state.farm).map(f => f.id === safeWordId ? {
                ...f,
                puzzleStats: {
                  ...currentStats,
                  totalWrong: (currentStats.totalWrong || 0) + 1, // 📊 Yanlış sayısı artır!
                  consecutiveCorrect: 0,
                },
              } : f),
            }));
          }
        }
      },

      //  MEYVE SİSTEMİ - Manuel Hasat Fonksiyonu
      // Kullanıcı "Hasat Et" butonuna bastığında çağrılır
      harvestWord: (wordId: string) => {
        const safeWordId = typeof wordId === 'string' ? wordId.trim() : '';
        if (!safeWordId) return null;
        // Re-entry guard: double-swipe'i engelle
        if (_harvestInFlight.has(safeWordId)) {
          traceEvent('harvest_word_skipped', { wordId: safeWordId, reason: 'in_flight' }, 'warn');
          return null;
        }
        _harvestInFlight.add(safeWordId);
        traceEvent('harvest_word_start', { wordId: safeWordId });

        try {
        const state = get();
        const safeFarm = toSafeWordArray(state.farm);
        const safePhrasalFarm = toSafeWordArray(state.phrasalVerbFarm);

        // Kelimeyi bul (farm veya phrasalVerbFarm'da)
        //  Önce AKTİF (görünür) kartı bulmaya çalış, yoksa herhangi birini al
        const normalWord = safeFarm.find(f => f.id === safeWordId && !(f as any).normalHarvested) || safeFarm.find(f => f.id === safeWordId);
        const phrasalWord = safePhrasalFarm.find(f => f.id === safeWordId && !(f as any).normalHarvested) || safePhrasalFarm.find(f => f.id === safeWordId);
        const farmWord = normalWord || phrasalWord;
        const isPhrasal = !!phrasalWord;

        if (!farmWord) return null;

        // Hasat hazır mı kontrol et
        if (!farmWord.isHarvestReady) return null;

        const currentMasterLevel = farmWord.masterLevel || 0;

        //  Perfect tier için ÖZEL MANTIK:
        // Perfect kartlar SONSUZ hasat edilebilir ama ödül SADECE 1 KEZ verilir
        const isPerfectCard = currentMasterLevel >= 3;
        const willBecomePerfect = currentMasterLevel === 2; // Ultra→Perfect geçişi
        const alreadyClaimedPerfect = farmWord.rewardClaimedPerfect === true;

        //  Yeni tier hesapla (perfect'te aynı kalır)
        const newMasterLevel = isPerfectCard ? 3 : Math.min(currentMasterLevel + 1, 3);

        // 💰 Ödül hesapla:
        // - Yeşil→Master (level 0→1): tier 1 ödülü (150/300)
        // - Master→Ultra (level 1→2): tier 2 ödülü (300/500)
        // - Ultra→Perfect (level 2→3): tier 3 ödülü (500/800)
        // - Perfect İLK hasat (level 3, rewardClaimedPerfect=false): tier 4 ödülü (700/1000)
        // - Perfect SONRAKI hasatlar (level 3, rewardClaimedPerfect=true): ÖDÜLSÜZ
        let shouldGiveReward = true;
        let rewardTier = newMasterLevel; // Varsayılan: geçilen tier

        if (isPerfectCard) {
          // Perfect kart hasat ediliyor
          if (!alreadyClaimedPerfect) {
            //  Perfect kartın İLK HASATI = tier 4 ödülü (700/1000)
            shouldGiveReward = true;
            rewardTier = 4;
          } else {
            // Perfect kartın SONRAKI hasatları = ÖDÜLSÜZ
            shouldGiveReward = false;
            rewardTier = 4;
          }
        } else if (willBecomePerfect) {
          // Ultra→Perfect geçişi = tier 3 ödülü (500/800)
          shouldGiveReward = true;
          rewardTier = 3;
        }

        const rewards = shouldGiveReward ? getTierReward(rewardTier) : { coins: 0, xp: 0 };

        //  Meyve tipini güncelle
        const isPhrasalVerb = !!farmWord.isPhrasalVerb;
        const fruitType = farmWord.fruitType || getFruitType(farmWord.difficulty, isPhrasalVerb);

        // 📦 Envanter için hazırla - UNIQUE ID ile
        const newTotalHarvests = (farmWord.totalHarvests || 0) + 1;
        const uniqueInventoryId = `${farmWord.id}-inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const inventoryWord: WordModel = {
          ...farmWord,
          id: uniqueInventoryId, //  UNIQUE ID - duplicate key hatası çözümü
          originalWordId: farmWord.id, //  Orijinal kelimeye referans - Tekrar Ek için!
          level: 10,
          consecutiveCorrect: 0,
          consecutiveMasterSessions: 0, // Reset sessions
          lastAnswerCorrect: true,
          totalHarvests: newTotalHarvests,
          masterLevel: newMasterLevel,
          //  Meyve sistemi - yeni tier için reset
          fruitType: fruitType,
          fruitGrowthStage: 0, // Yeni tier'da baştan başla
          isHarvestReady: false,
          //  Perfect ödül flag:
          // - Ultra→Perfect: FALSE (Perfect ilk hasatı henüz yapılmadı, tier 4 ödülü bekliyor)
          // - Perfect hasatı: TRUE (tier 4 ödülü alındı, sonraki hasatlar ödülsüz)
          rewardClaimedPerfect: isPerfectCard ? true : false,
          harvestedAt: Date.now(), // 📅 Hasat zamanı - sıralama için
        };

        // 🌾 Kelimeyi envantere taşı
        if (isPhrasal) {
          set(state => {
            // 📊 Öğrenilen kelime ID'si (phrasal verb için orijinal ID kullan)
            const originalId = farmWord.id;
            const safeLearnedIds = toSafeArray<string>(state.learnedWordIds);
            const safePhrasalVerbFarm = toSafeWordArray(state.phrasalVerbFarm);
            const safePhrasalVerbInventory = toSafeWordArray(state.phrasalVerbInventory);
            const newLearnedIds = safeLearnedIds.includes(originalId)
              ? safeLearnedIds
              : [...safeLearnedIds, originalId];

            return {
              phrasalVerbFarm: safePhrasalVerbFarm.map(f => f.id === safeWordId ? {
                ...f,
                normalHarvested: true,
                masterLevel: newMasterLevel,
                fruitType: fruitType,
                fruitGrowthStage: 0,
                isHarvestReady: false,
                consecutiveMasterSessions: 0,
                //  FIX: Sadece ZATEN Perfect olan kartlar için true, Ultra→Perfect geçişinde false kalmalı!
                rewardClaimedPerfect: isPerfectCard ? true : f.rewardClaimedPerfect,
              } : f),
              phrasalVerbInventory: [inventoryWord, ...safePhrasalVerbInventory],
              // 💰 Ödüller
              coins: toSafeNumber(state.coins, 0) + rewards.coins,
              lifetimeCoins: toSafeNumber(state.lifetimeCoins, 0) + rewards.coins,
              xp: toSafeNumber(state.xp, 0) + rewards.xp,
              // 📊 Achievement tracking
              lifetimeHarvests: toSafeNumber(state.lifetimeHarvests, 0) + 1,
              learnedWordIds: newLearnedIds,
              // Transfer event
              transferEvent: {
                id: `${safeWordId}-${Date.now()}`,
                type: 'harvest',
                wordId: safeWordId,
                wordText: farmWord.text || 'Kelime',
                from: 'phrasalVerbFarm',
                to: 'phrasalVerbInventory',
                timestamp: Date.now(),
                coins: rewards.coins,
                xp: rewards.xp,
              },
              // 🧪 Böcek ilacı sayacı güncelle
              cardsAddedSinceInsecticide: state.insecticideActive
                ? Math.min(toSafeNumber(state.cardsAddedSinceInsecticide, 0) + 1, 10)
                : toSafeNumber(state.cardsAddedSinceInsecticide, 0),
              insecticideActive: state.insecticideActive && (toSafeNumber(state.cardsAddedSinceInsecticide, 0) + 1) < 10,
            };
          });
        } else {
          set(state => {
            // 📊 Öğrenilen kelime ID'si
            const originalId = farmWord.id;
            const safeLearnedIds = toSafeArray<string>(state.learnedWordIds);
            const safeFarmArray = toSafeWordArray(state.farm);
            const safeInventory = toSafeWordArray(state.inventory);
            const newLearnedIds = safeLearnedIds.includes(originalId)
              ? safeLearnedIds
              : [...safeLearnedIds, originalId];

            return {
              farm: safeFarmArray.map(f => f.id === safeWordId ? {
                ...f,
                normalHarvested: true,
                masterLevel: newMasterLevel,
                fruitType: fruitType,
                fruitGrowthStage: 0,
                isHarvestReady: false,
                consecutiveMasterSessions: 0,
                //  FIX: Sadece ZATEN Perfect olan kartlar için true, Ultra→Perfect geçişinde false kalmalı!
                rewardClaimedPerfect: isPerfectCard ? true : f.rewardClaimedPerfect,
              } : f),
              inventory: [inventoryWord, ...safeInventory],
              // 💰 Ödüller
              coins: toSafeNumber(state.coins, 0) + rewards.coins,
              lifetimeCoins: toSafeNumber(state.lifetimeCoins, 0) + rewards.coins,
              xp: toSafeNumber(state.xp, 0) + rewards.xp,
              // 📊 Achievement tracking
              lifetimeHarvests: toSafeNumber(state.lifetimeHarvests, 0) + 1,
              learnedWordIds: newLearnedIds,
              // Transfer event
              transferEvent: {
                id: `${safeWordId}-${Date.now()}`,
                type: 'harvest',
                wordId: safeWordId,
                wordText: farmWord.text || 'Kelime',
                from: 'farm',
                to: 'inventory',
                timestamp: Date.now(),
                coins: rewards.coins,
                xp: rewards.xp,
              },
              // 🧪 Böcek ilacı sayacı güncelle
              cardsAddedSinceInsecticide: state.insecticideActive
                ? Math.min(toSafeNumber(state.cardsAddedSinceInsecticide, 0) + 1, 10)
                : toSafeNumber(state.cardsAddedSinceInsecticide, 0),
              insecticideActive: state.insecticideActive && (toSafeNumber(state.cardsAddedSinceInsecticide, 0) + 1) < 10,
            };
          });
        }

        //  GÜNLÜK GÖREV - Hasat edildi!
        // setTimeout ile sarmalıyoruz ki mevcut set() tamamlansın
        try {
          state.queueQuestProgress(isPhrasal ? 'HARVEST_PHRASAL' : 'HARVEST_WORDS', 1, 'add');
        } catch (e) {
          console.log('Quest progress update error:', e);
        }

        //  Firebase'e lifetimeHarvests sync - dynamic import yok
        setTimeout(() => {
          try {
            const user = get().user;
            if (user?.odId) {
              safeSyncFirebase(user.odId, { lifetimeHarvests: get().lifetimeHarvests });
            }
          } catch(e) {}
        }, 200);

        // Başarımları kontrol et  debounced, üst üste çağrılar birleşir
        debouncedCheckAchievements(get);

        const guidedFarmTargetMatched = isGuidedTargetMatch(
          state.guidedModeTargetWordId,
          state.guidedModeTargetWordText,
          safeWordId,
          farmWord.text
        );
        if (
          state.guidedModeActive &&
          state.guidedModeStep === 'FARM_MASTER_TARGET' &&
          guidedFarmTargetMatched
        ) {
          set({
            guidedModeStep: 'PUZZLE_PRACTICE',
            guidedModeTargetWordId: safeWordId,
            guidedModeTargetWordText: farmWord.text || state.guidedModeTargetWordText,
          });
          traceEvent('guided_mode_step', {
            from: 'FARM_MASTER_TARGET',
            to: 'PUZZLE_PRACTICE',
            wordId: safeWordId,
            wordText: normalizeDisplayText(farmWord.text),
          });
        } else if (state.guidedModeActive && state.guidedModeStep === 'FARM_MASTER_TARGET') {
          traceEvent('guided_mode_step_blocked', {
            from: 'FARM_MASTER_TARGET',
            to: 'PUZZLE_PRACTICE',
            wordId: safeWordId,
            wordText: normalizeDisplayText(farmWord.text),
            targetWordId: state.guidedModeTargetWordId,
            targetWordText: state.guidedModeTargetWordText,
          }, 'warn');
        }

        traceEvent('harvest_word_success', {
          wordId: safeWordId,
          isPhrasal,
          rewardCoins: rewards.coins,
          rewardXp: rewards.xp,
          newMasterLevel,
        });

        return {
          success: true,
          coins: rewards.coins,
          xp: rewards.xp,
          newTier: newMasterLevel,
        };
        } catch (error) {
          traceEvent('harvest_word_error', { wordId: safeWordId, error: String(error) }, 'error');
          console.error('[harvestWord] Error:', error);
          return null;
        } finally {
          _harvestInFlight.delete(safeWordId);
        }
      },

      // 🧩 YAPBOZ MANUEL HASAT
      harvestPuzzleWord: (wordId: string) => {
        const safeWordId = typeof wordId === 'string' ? wordId.trim() : '';
        if (!safeWordId) return null;
        if (_puzzleHarvestInFlight.has(safeWordId)) return null;
        _puzzleHarvestInFlight.add(safeWordId);
        try {
        const state = get();
        const safeFarm = toSafeWordArray(state.farm);
        const safePhrasalFarm = toSafeWordArray(state.phrasalVerbFarm);

        // Kelimeyi bul (farm veya phrasalVerbFarm'da)
        const normalWord = safeFarm.find(f => f.id === safeWordId);
        const phrasalWord = safePhrasalFarm.find(f => f.id === safeWordId);
        const farmWord = normalWord || phrasalWord;
        const isPhrasal = !!phrasalWord;

        if (!farmWord) return null;

        // Yapboz hasada hazır mı kontrol et
        if (!(farmWord as any).readyForPuzzleHarvest) return null;

        const pendingPuzzleMasterLevel = (farmWord as any).pendingPuzzleMasterLevel || 1;
        const currentStats = (farmWord as any).puzzleStats || { sessions: 0, totalCorrect: 0, totalWrong: 0, consecutiveCorrect: 0, puzzleMasterLevel: 0, puzzleTotalHarvests: 0 };
        const newPuzzleTotalHarvests = (currentStats.puzzleTotalHarvests || 0) + 1;
        const currentPuzzleMasterLevel = currentStats.puzzleMasterLevel || 0;

        //  ÖDÜL SEVİYESİ HESAPLAMA - TARLA İLE AYNI!
        // Yeşil→Master (0→1): Tier 1 = 150 coin, 300 xp
        // Master→Ultra (1→2): Tier 2 = 300 coin, 500 xp
        // Ultra→Perfect (2→3): Tier 3 = 500 coin, 800 xp
        // Perfect hasat (3→3): Tier 4 = 700 coin, 1000 xp (TEK SEFERLİK!)
        const isPerfectHarvest = currentPuzzleMasterLevel === 3 && pendingPuzzleMasterLevel === 3;
        const alreadyClaimedPerfect = (farmWord as any).puzzleRewardClaimedPerfect === true;

        // Perfect hasat ise ve ödül zaten alındıysa, ödül VERİLMEZ!
        const shouldGiveReward = !isPerfectHarvest || !alreadyClaimedPerfect;

        // 💰 YAPBOZ HASAT ÖDÜLLERİ!
        // pendingPuzzleMasterLevel = geçilecek seviye
        // Perfect HASAT (zaten Perfect olan kartın hasadı) = Tier 4
        // Perfect'E GEÇİ (Ultra→Perfect) = Tier 3
        const rewardTier = isPerfectHarvest ? 4 : pendingPuzzleMasterLevel;
        const puzzleReward = shouldGiveReward ? getTierReward(rewardTier) : { coins: 0, xp: 0 };
        const puzzleCoins = puzzleReward.coins;
        const puzzleXp = puzzleReward.xp;

        const puzzleHarvestId = `${safeWordId}-puzzle-${Date.now()}`; //  Benzersiz ID!

        const harvestedWord = {
          ...farmWord,
          id: puzzleHarvestId, //  Farklı ID - çakışma olmaz!
          originalWordId: safeWordId, //  Orijinal kelimeye referans
          masterLevel: pendingPuzzleMasterLevel, //  YAPBOZ SEVİYESİ - Altın(1), Elmas(2), Kraliyet(3)!
          isPuzzleHarvested: true, // SADECE yapboz filtresinde görünsün!
          puzzleStats: {
            sessions: currentStats.sessions,
            totalCorrect: currentStats.totalCorrect,
            totalWrong: currentStats.totalWrong || 0,
            consecutiveCorrect: 0,
            puzzleMasterLevel: pendingPuzzleMasterLevel,
            puzzleTotalHarvests: newPuzzleTotalHarvests,
          },
          lastPlantedAt: Date.now(),
          harvestedAt: Date.now(), // 📅 Hasat zamanı - sıralama için
        };

        if (isPhrasal) {
          set(state => {
            // 📊 Öğrenilen kelime ID'si
            const originalId = (farmWord as any).id;
            const safeLearnedIds = toSafeArray<string>(state.learnedWordIds);
            const safePhrasalVerbFarm = toSafeWordArray(state.phrasalVerbFarm);
            const safePhrasalVerbInventory = toSafeWordArray(state.phrasalVerbInventory);
            const newLearnedIds = safeLearnedIds.includes(originalId)
              ? safeLearnedIds
              : [...safeLearnedIds, originalId];

            return {
              // 💰 COIN VE XP EKLE!
              coins: toSafeNumber(state.coins, 0) + puzzleCoins,
              xp: toSafeNumber(state.xp, 0) + puzzleXp,
              // 📊 Achievement tracking
              lifetimeHarvests: toSafeNumber(state.lifetimeHarvests, 0) + 1,
              learnedWordIds: newLearnedIds,
              // 🌾 Farm'daki kelime KALIR ama yapboz tarlasında GÖRÜNMEZ!
              phrasalVerbFarm: safePhrasalVerbFarm.map(f => f.id === safeWordId ? {
                ...f,
                readyForPuzzleHarvest: false, // 🌾 Hasat edildi!
                pendingPuzzleMasterLevel: undefined,
                puzzleHarvested: true, // Yapboz tarlasında görünmez
                puzzleRewardClaimedPerfect: isPerfectHarvest ? true : f.puzzleRewardClaimedPerfect, // 👑 Perfect HASAT ödülü alındı!
                puzzleStats: { sessions: 0, totalCorrect: 0, totalWrong: 0, consecutiveCorrect: 0, puzzleMasterLevel: 0, puzzleTotalHarvests: newPuzzleTotalHarvests },
              } : f),
              phrasalVerbInventory: [harvestedWord as any, ...safePhrasalVerbInventory],
              transferEvent: {
                id: `puzzle-harvest-${Date.now()}`,
                type: 'harvest',
                wordId: puzzleHarvestId,
                wordText: (farmWord as any).verb || farmWord.text || '',
                from: 'phrasalVerbFarm',
                to: 'phrasalVerbInventory',
                timestamp: Date.now(),
                coins: puzzleCoins,
                xp: puzzleXp,
              },
            };
          });
        } else {
          set(state => {
            // 📊 Öğrenilen kelime ID'si
            const originalId = farmWord.id;
            const safeLearnedIds = toSafeArray<string>(state.learnedWordIds);
            const safeFarmArray = toSafeWordArray(state.farm);
            const safeInventoryArray = toSafeWordArray(state.inventory);
            const newLearnedIds = safeLearnedIds.includes(originalId)
              ? safeLearnedIds
              : [...safeLearnedIds, originalId];

            return {
              // 💰 COIN VE XP EKLE!
              coins: toSafeNumber(state.coins, 0) + puzzleCoins,
              xp: toSafeNumber(state.xp, 0) + puzzleXp,
              // 📊 Achievement tracking
              lifetimeHarvests: toSafeNumber(state.lifetimeHarvests, 0) + 1,
              learnedWordIds: newLearnedIds,
              // 🌾 Farm'daki kelime KALIR ama yapboz tarlasında GÖRÜNMEZ!
              farm: safeFarmArray.map(f => f.id === safeWordId ? {
                ...f,
                readyForPuzzleHarvest: false, // 🌾 Hasat edildi!
                pendingPuzzleMasterLevel: undefined,
                puzzleHarvested: true, // Yapboz tarlasında görünmez
                puzzleRewardClaimedPerfect: isPerfectHarvest ? true : f.puzzleRewardClaimedPerfect, // 👑 Perfect HASAT ödülü alındı!
                puzzleStats: { sessions: 0, totalCorrect: 0, totalWrong: 0, consecutiveCorrect: 0, puzzleMasterLevel: 0, puzzleTotalHarvests: newPuzzleTotalHarvests },
              } : f),
              inventory: [harvestedWord, ...safeInventoryArray],
              transferEvent: {
                id: `puzzle-harvest-${Date.now()}`,
                type: 'harvest',
                wordId: puzzleHarvestId,
                wordText: farmWord.text || '',
                from: 'farm',
                to: 'inventory',
                timestamp: Date.now(),
                coins: puzzleCoins,
                xp: puzzleXp,
              },
            };
          });
        }

        // Başarımları kontrol et  debounced, üst üste çağrılar birleşir
        debouncedCheckAchievements(get);

        return {
          success: true,
          coins: puzzleCoins,
          xp: puzzleXp,
          newTier: pendingPuzzleMasterLevel,
        };
        } catch (error) {
          console.error('[harvestPuzzleWord] Error:', error);
          return null;
        } finally {
          _puzzleHarvestInFlight.delete(safeWordId);
        }
      },

      checkAchievements: () => {
        const state = get();
        let updated = false;

        // 🛡 Null-safe array guards  bozuk persist state'i crash yapmaz
        const safeAchievements = Array.isArray(state.achievements) ? state.achievements : [];
        const safeInventory = Array.isArray(state.inventory) ? state.inventory : [];
        const safeFarm = Array.isArray(state.farm) ? state.farm : [];
        const safePhrasalFarm = Array.isArray(state.phrasalVerbFarm) ? state.phrasalVerbFarm : [];
        const safePhrasalInv = Array.isArray(state.phrasalVerbInventory) ? state.phrasalVerbInventory : [];
        const safeLearnedIds = Array.isArray(state.learnedWordIds) ? state.learnedWordIds : [];

        if (safeAchievements.length === 0) return; // Boşsa kontrol gereksiz

        // İstatistikler - achievement kontrolleri için
        // 📊 lifetimeHarvests kullan - azalmayan toplam hasat sayısı
        const totalHarvested = state.lifetimeHarvests || (safeInventory.length + safePhrasalInv.length);
        // 📚 learnedWordIds kullan - benzersiz öğrenilmiş kelime sayısı (phrasal verb'ler de dahil)
        const learnedWords = safeLearnedIds.length;
        //  Phrasal verb sayısı  O(N) precomputed Set ile, O(N×M) spread/find döngüsü YOK
        const phrasalIdSet = new Set([...safePhrasalFarm, ...safePhrasalInv].flatMap(w => [w.id, (w as any).originalWordId].filter(Boolean)));
        const phrasalVerbCount = safeLearnedIds.filter(id => phrasalIdSet.has(id)).length;
        const masterCount = safeInventory.filter(w => (w.masterLevel || 0) >= 1).length;
        const perfectCount = safeInventory.filter(w => (w.masterLevel || 0) >= 3).length;
        const totalWords = safeFarm.length + safeInventory.length;

        const newAchievements = safeAchievements.map(ach => {
          if (ach.unlocked) return ach;

          let shouldUnlock = false;

          //  Başlangıç (5)
          if (ach.id === 'first_correct') shouldUnlock = state.totalCorrect >= 1;
          if (ach.id === 'first_wrong') shouldUnlock = state.totalWrong >= 1;
          if (ach.id === 'first_harvest') shouldUnlock = totalHarvested >= 1;
          if (ach.id === 'first_quiz') shouldUnlock = state.totalQuizzes >= 1;
          if (ach.id === 'first_master') shouldUnlock = masterCount >= 1;

          //  Combo serisi (8)
          if (ach.id === 'combo_3') shouldUnlock = state.bestStreak >= 3;
          if (ach.id === 'combo_5') shouldUnlock = state.bestStreak >= 5;
          if (ach.id === 'combo_10') shouldUnlock = state.bestStreak >= 10;
          if (ach.id === 'combo_15') shouldUnlock = state.bestStreak >= 15;
          if (ach.id === 'combo_25') shouldUnlock = state.bestStreak >= 25;
          if (ach.id === 'combo_50') shouldUnlock = state.bestStreak >= 50;
          if (ach.id === 'combo_75') shouldUnlock = state.bestStreak >= 75;
          if (ach.id === 'combo_100') shouldUnlock = state.bestStreak >= 100;

          //  Level serisi (10)
          if (ach.id === 'level_2') shouldUnlock = state.level >= 2;
          if (ach.id === 'level_5') shouldUnlock = state.level >= 5;
          if (ach.id === 'level_10') shouldUnlock = state.level >= 10;
          if (ach.id === 'level_15') shouldUnlock = state.level >= 15;
          if (ach.id === 'level_20') shouldUnlock = state.level >= 20;
          if (ach.id === 'level_25') shouldUnlock = state.level >= 25;
          if (ach.id === 'level_50') shouldUnlock = state.level >= 50;
          if (ach.id === 'level_75') shouldUnlock = state.level >= 75;
          if (ach.id === 'level_100') shouldUnlock = state.level >= 100;
          if (ach.id === 'level_150') shouldUnlock = state.level >= 150;

          // 🌾 Hasat serisi (8) - lifetimeHarvests kullan
          if (ach.id === 'harvest_5') shouldUnlock = totalHarvested >= 5;
          if (ach.id === 'harvest_10') shouldUnlock = totalHarvested >= 10;
          if (ach.id === 'harvest_25') shouldUnlock = totalHarvested >= 25;
          if (ach.id === 'harvest_50') shouldUnlock = totalHarvested >= 50;
          if (ach.id === 'harvest_100') shouldUnlock = totalHarvested >= 100;
          if (ach.id === 'harvest_250') shouldUnlock = totalHarvested >= 250;
          if (ach.id === 'harvest_500') shouldUnlock = totalHarvested >= 500;
          if (ach.id === 'harvest_1000') shouldUnlock = totalHarvested >= 1000;

          // 📚 Kelime haznesi (6) - benzersiz öğrenilmiş kelime sayısı (learnedWordIds)
          if (ach.id === 'words_25') shouldUnlock = learnedWords >= 25;
          if (ach.id === 'words_50') shouldUnlock = learnedWords >= 50;
          if (ach.id === 'words_100') shouldUnlock = learnedWords >= 100;
          if (ach.id === 'words_250') shouldUnlock = learnedWords >= 250;
          if (ach.id === 'words_500') shouldUnlock = learnedWords >= 500;
          if (ach.id === 'words_1000') shouldUnlock = learnedWords >= 1000;

          //  Master serisi (7)
          if (ach.id === 'master_1') shouldUnlock = masterCount >= 1;
          if (ach.id === 'master_5') shouldUnlock = masterCount >= 5;
          if (ach.id === 'master_25') shouldUnlock = masterCount >= 25;
          if (ach.id === 'master_50') shouldUnlock = masterCount >= 50;
          if (ach.id === 'master_100') shouldUnlock = masterCount >= 100;
          if (ach.id === 'master_200') shouldUnlock = masterCount >= 200;

          //  Perfect serisi (6)
          if (ach.id === 'perfect_1') shouldUnlock = perfectCount >= 1;
          if (ach.id === 'perfect_5') shouldUnlock = perfectCount >= 5;
          if (ach.id === 'perfect_10') shouldUnlock = perfectCount >= 10;
          if (ach.id === 'perfect_25') shouldUnlock = perfectCount >= 25;
          if (ach.id === 'perfect_50') shouldUnlock = perfectCount >= 50;
          if (ach.id === 'perfect_100') shouldUnlock = perfectCount >= 100;

          //  Phrasal Verb serisi (6)
          if (ach.id === 'phrasal_5') shouldUnlock = phrasalVerbCount >= 5;
          if (ach.id === 'phrasal_10') shouldUnlock = phrasalVerbCount >= 10;
          if (ach.id === 'phrasal_25') shouldUnlock = phrasalVerbCount >= 25;
          if (ach.id === 'phrasal_50') shouldUnlock = phrasalVerbCount >= 50;
          if (ach.id === 'phrasal_100') shouldUnlock = phrasalVerbCount >= 100;
          if (ach.id === 'phrasal_200') shouldUnlock = phrasalVerbCount >= 200;

          // 💰 Zenginlik serisi (6) - lifetimeCoins kullan
          if (ach.id === 'coins_500') shouldUnlock = state.lifetimeCoins >= 500;
          if (ach.id === 'coins_1000') shouldUnlock = state.lifetimeCoins >= 1000;
          if (ach.id === 'coins_5000') shouldUnlock = state.lifetimeCoins >= 5000;
          if (ach.id === 'coins_25000') shouldUnlock = state.lifetimeCoins >= 25000;
          if (ach.id === 'coins_50000') shouldUnlock = state.lifetimeCoins >= 50000;
          if (ach.id === 'coins_100000') shouldUnlock = state.lifetimeCoins >= 100000;

          if (shouldUnlock) {
            updated = true;
            return { ...ach, unlocked: true };
          }
          return ach;
        });

        if (updated) {
          set({ achievements: newAchievements });
        }
      },

      claimAchievementReward: (achievementId) => {
        set(state => {
          const ach = state.achievements.find(a => a.id === achievementId);
          if (!ach || !ach.unlocked || ach.claimed) return state;

          return {
            achievements: state.achievements.map(a =>
              a.id === achievementId ? { ...a, claimed: true } : a
            ),
            coins: state.coins + ach.reward.coins,
            xp: state.xp + ach.reward.xp,
          };
        });
      },

      addCoins: (amount) => {
        const safeAmount = toSafeNumber(amount, 0);
        if (safeAmount === 0) return;

        set(state => ({
          coins: Math.max(0, toSafeNumber(state.coins, 0) + safeAmount),
          lifetimeCoins: safeAmount > 0
            ? toSafeNumber(state.lifetimeCoins, 0) + safeAmount
            : toSafeNumber(state.lifetimeCoins, 0),
        }));

        // Coin kazandi -> gorev ilerlemesi (crash-safe)
        if (safeAmount > 0) {
          const progress = Math.floor(safeAmount / 10);
          if (progress > 0) {
            try { get().queueQuestProgress('EARN_COINS', progress, 'add'); } catch(e) {}
          }
        }
      },

      addQuizReward: (xp) => {
        const safeXp = toSafePositiveInt(xp);
        set(state => ({
          xp: toSafeNumber(state.xp, 0) + safeXp,
          totalCorrect: toSafeNumber(state.totalCorrect, 0) + 1,
          totalQuizzes: toSafeNumber(state.totalQuizzes, 0) + 1,
        }));
      },

      addXp: (amount) => {
        const safeAmount = toSafePositiveInt(amount);
        if (safeAmount <= 0) return;
        set(state => ({ xp: toSafeNumber(state.xp, 0) + safeAmount }));
      },

      addWrongStat: () => {
        set(state => ({
          totalWrong: toSafeNumber(state.totalWrong, 0) + 1,
          totalQuizzes: toSafeNumber(state.totalQuizzes, 0) + 1,
        }));
      },

      activateInsecticide: (price) => {
        const safePrice = toSafePositiveInt(price);
        const state = get();
        const totalCount =
          state.inventory.filter((w: any) => !w.isPuzzleHarvested).length +
          state.phrasalVerbInventory.filter((w: any) => !w.isPuzzleHarvested).length;
        const nextProtectionUntil = Math.ceil(totalCount / 10) * 10;

        set(s => ({
          coins: safePrice > 0 ? Math.max(0, toSafeNumber(s.coins, 0) - safePrice) : toSafeNumber(s.coins, 0),
          insecticideActive: true,
          cardsAddedSinceInsecticide: 0,
          lastInventoryQuizTime: nextProtectionUntil,
        }));
      },

      addBattleSeeds: (words) => {
        const state = get();
        const normalizeText = (t: string) => (t || '').toLowerCase().trim();
        const isInCollection = (arr: any[], id?: string, text?: string) =>
          arr.some(w => (id && w.id === id) || (text && normalizeText(w.text || w.verb || w.word) === normalizeText(text)));

        const newSeeds: any[] = [];
        words.forEach(w => {
          if (isInCollection(state.farm, w.wordId, w.wordText)) return;
          if (isInCollection(state.inventory, w.wordId, w.wordText)) return;
          const poolWord = state.pool.find(p => {
            if (w.wordId && p.id === w.wordId) return true;
            return normalizeText(p?.text || (p as any)?.verb || (p as any)?.word) === normalizeText(w.wordText);
          });
          if (!poolWord) return;
          newSeeds.push({
            ...poolWord,
            correctCount: 0, wrongCount: 0, level: 0,
            consecutiveCorrect: 0, harvestedCount: 0, totalHarvests: 0,
            masterLevel: 0, lastAnswerCorrect: false,
            lastPlantedAt: Date.now(), quizCorrect: 0, quizWrong: 1,
          });
        });

        if (newSeeds.length === 0) return 0;

        set(s => ({ farm: [...s.farm, ...newSeeds] }));
        try { get().queueQuestProgress('PLANT_WORDS', newSeeds.length, 'add'); } catch(e) {}
        return newSeeds.length;
      },

      // 🌱 SEED MARKET: Kelime satın al ve tarlaya ekle
      buySeed: (wordId, price) => {
        const safeWordId = typeof wordId === 'string' ? wordId.trim() : '';
        const safePrice = toSafePositiveInt(price);
        if (!safeWordId) return false;

        const state = get();
        const safePool = Array.isArray(state.pool) ? state.pool : [];
        const safeFarm = Array.isArray(state.farm) ? state.farm : [];
        const safeInventory = Array.isArray(state.inventory) ? state.inventory : [];
        const safeDailyQuests = Array.isArray(state.dailyQuests) ? state.dailyQuests : [];

        // Yeterli coin kontrolu
        if (toSafeNumber(state.coins, 0) < safePrice) return false;

        // Kelimeyi pool'dan bul
        const word = safePool.find(w => w.id === safeWordId);
        if (!word) return false;

        // Zaten tarlada mi kontrol et
        const alreadyInFarm = safeFarm.some(f => f.id === safeWordId);
        if (alreadyInFarm) return false;

        // Zaten envanterde mi kontrol et
        const alreadyInInventory = safeInventory.some(i => i.id === safeWordId);
        if (alreadyInInventory) return false;

        const newWord = {
          ...word,
          correctCount: 0,
          wrongCount: 0,
          level: 0,
          consecutiveCorrect: 0,
          harvestedCount: 0,
          totalHarvests: 0,
          masterLevel: 0,
          lastAnswerCorrect: false,
          lastPlantedAt: Date.now(),
        };

        const today = new Date().toISOString().split('T')[0];

        const updatedQuests = safeDailyQuests.map(quest => {
          if (quest.type === 'PLANT_WORDS' && !quest.completed && quest.date === today) {
            const target = Math.max(0, toSafeNumber(quest.target, 0));
            const newProgress = Math.min(toSafeNumber(quest.progress, 0) + 1, target);
            const isCompleted = newProgress >= target;
            return {
              ...quest,
              progress: newProgress,
              completed: isCompleted
            };
          }
          return quest;
        });

        set(current => ({
          coins: Math.max(0, toSafeNumber(current.coins, 0) - safePrice),
          farm: [newWord, ...(Array.isArray(current.farm) ? current.farm : [])],
          dailyQuests: updatedQuests,
        }));

        return true;
      },

      // 
      //  KENDİ KELİME KARTI SİSTEMİ Actions (Özerk Tarla)
      // 
      addCustomWord: ({ text, meaning, example, exampleTr, difficulty }) => {
        const state = get();
        const CUSTOM_WORD_PRICE = 2800;

        // 💰 Yeterli coin kontrolü
        if (state.coins < CUSTOM_WORD_PRICE) {
          return { success: false, message: 'Yeterli coinin yok! (2800 coin gerekli)' };
        }

        //  Normalize  case-insensitive kontrol
        const normalizedText = toSafeLowerText(text);
        if (!normalizedText || normalizedText.length < 2) {
          return { success: false, message: 'Kelime en az 2 karakter olmalı.' };
        }
        if (!meaning.trim()) {
          return { success: false, message: 'Anlam boş bırakılamaz.' };
        }

        // 🌾 Tarlada var mı kontrol et
        const inFarm = state.farm.some(w => toSafeLowerText((w as any)?.text) === normalizedText);
        if (inFarm) {
          return { success: false, message: `Bu tohum zaten tarlada var! 🌾` };
        }

        // 📦 Envanterde var mı kontrol et
        const inInventory = state.inventory.some(w => toSafeLowerText((w as any)?.text) === normalizedText);
        if (inInventory) {
          return { success: false, message: `Bu tohum zaten envanterde var! 📦` };
        }

        //  Tohum pazarında (pool'da) var mı kontrol et  daha ucuza alabilir
        const inPool = state.pool.some(w => toSafeLowerText((w as any)?.text) === normalizedText);
        if (inPool) {
          return { success: false, message: `Bu kelime tohum pazarında var! Oradan daha ucuza satın alabilirsin. 🏪` };
        }

        // ✅ Oluştur  benzersiz ID, normal tarlaya ekle
        const wordId = `custom-${normalizedText}-${Date.now()}`;
        const newWord: WordModel = {
          id: wordId,
          text: text.trim(),
          meaning: meaning.trim(),
          example: example?.trim() || undefined,
          example_tr: exampleTr?.trim() || undefined,
          difficulty: (difficulty as WordModel['difficulty']) || 'B1',
          type: 'custom',
          level: 0,
          correctCount: 0,
          wrongCount: 0,
          consecutiveCorrect: 0,
          harvestedCount: 0,
          totalHarvests: 0,
          masterLevel: 0,
          lastAnswerCorrect: false,
          lastPlantedAt: Date.now(),
          isPhrasalVerb: false,
          category: 'custom',
          isCustom: true,
        };

        set(s => ({
          coins: s.coins - CUSTOM_WORD_PRICE,
          farm: [newWord, ...s.farm],
        }));

        return { success: true, message: 'Kelimen tarlaya tohum olarak eklendi! 🌱' };
      },

      // 
      //  KART TEMA SİSTEMİ Actions
      // 
      purchaseCardTheme: (themeId) => {
        const state = get();
        const theme = getThemeOverlay(themeId);
        if (!theme) return false;
        if (state.ownedCardThemes.includes(themeId)) return false;
        if (theme.price > 0 && state.coins < theme.price) return false;

        set({
          ownedCardThemes: [...state.ownedCardThemes, themeId],
          coins: theme.price > 0 ? state.coins - theme.price : state.coins,
          activeCardTheme: themeId, // Satın alınca otomatik aktif et
        });
        return true;
      },

      setActiveCardTheme: (themeId) => {
        const state = get();
        if (themeId !== 'default' && !state.ownedCardThemes.includes(themeId)) return;
        set({ activeCardTheme: themeId });
      },

      updateCardCustomization: (partial) => {
        const state = get();
        set({
          cardCustomization: { ...state.cardCustomization, ...partial },
        });
      },

      checkCollectibleCards: () => {
        const state = get();
        const safeCollectedCards = toSafeArray<string>(state.collectedCards);
        const safeOwnedThemes = toSafeArray<string>(state.ownedCardThemes);
        const stats: Record<string, number> = {
          lifetimeHarvests: state.lifetimeHarvests || 0,
          totalQuizzes: state.totalQuizzes || 0,
          bestStreak: state.bestStreak || 0,
          battleWins: state.battleWins || 0,
          dailyStreak: state.dailyStreak || 0,
          lifetimeCoins: state.lifetimeCoins || 0,
          lifetimePlantedWords: state.lifetimePlantedWords || 0,
          lifetimeQuizAnswered: state.lifetimeQuizAnswered || 0,
          lifetimeBattlesWon: state.lifetimeBattlesWon || 0,
        };

        const newCards: string[] = [];
        const unlockedRewardThemes: string[] = [];
        for (const card of COLLECTIBLE_CARDS) {
          if (safeCollectedCards.includes(card.id)) continue;
          if (checkCollectibleUnlock(card.id, stats)) {
            newCards.push(card.id);
          }
        }

        const collectedSet = new Set([...safeCollectedCards, ...newCards]);
        for (const card of COLLECTIBLE_CARDS) {
          if (!collectedSet.has(card.id) || !card.rewardThemeId) continue;
          if (!getThemeOverlay(card.rewardThemeId)) continue;
          if (safeOwnedThemes.includes(card.rewardThemeId)) continue;
          if (unlockedRewardThemes.includes(card.rewardThemeId)) continue;
          unlockedRewardThemes.push(card.rewardThemeId);
        }

        if (newCards.length > 0 || unlockedRewardThemes.length > 0) {
          set({
            collectedCards: [...safeCollectedCards, ...newCards],
            ownedCardThemes: [...safeOwnedThemes, ...unlockedRewardThemes],
          });
        }
        return newCards;
      },

      purchaseItem: (itemId, price, type, duration) => {
        const state = get();
        if (state.coins < price) return false;

        const ownedBefore = state.ownedItems;

        const getOwnedTier = (prefix: string) => {
          let best = 0;
          for (const id of ownedBefore) {
            if (!id.startsWith(prefix)) continue;
            const n = Number.parseInt(id.slice(prefix.length), 10);
            if (Number.isFinite(n)) best = Math.max(best, n);
          }
          return best;
        };

        const getNewTier = (prefix: string) => {
          const n = Number.parseInt(itemId.slice(prefix.length), 10);
          return Number.isFinite(n) ? n : 0;
        };

        // Prevent duplicate permanent purchases (same exact item)
        if (type === 'permanent' && ownedBefore.includes(itemId)) return false;

        // Prevent downgrades / same-tier rebuys for tiered permanent upgrades
        if (type === 'permanent') {
          const tieredPrefixes = [
            'seed_discount_',
            'phrasal_discount_',
            'hint_bonus_',
            'coin_charm_',
            'xp_charm_',
          ];
          for (const prefix of tieredPrefixes) {
            if (!itemId.startsWith(prefix)) continue;
            const current = getOwnedTier(prefix);
            const next = getNewTier(prefix);
            if (current >= next && current > 0) return false;
          }
        }

        // Avoid stacking the exact same boost while it's still active
        if (type === 'boost' && state.activeBoosts.some(b => b.id === itemId && b.expiresAt > Date.now())) {
          return false;
        }

        const now = Date.now();

        // Consumable effects
        let hintTokenDelta = 0;
        let comboShieldDelta = 0;

        type BoostGrant = { id: string; minutes: number };
        const boostGrants: BoostGrant[] = [];

        if (type === 'consumable') {
          let baseHints = 0;

          if (itemId === 'hint_pack_1') baseHints = 1;
          else if (itemId === 'hint_pack_3') baseHints = 3;
          else if (itemId === 'hint_pack_10') baseHints = 10;
          else if (itemId === 'hint_pack_25') baseHints = 25;
          else if (itemId === 'hint_pack_60') baseHints = 60;

          // Combo Shield paketleri
          else if (itemId === 'combo_shield_1') comboShieldDelta = 1;
          else if (itemId === 'combo_shield_3') comboShieldDelta = 3;
          else if (itemId === 'combo_shield_5') comboShieldDelta = 5;
          else if (itemId === 'combo_shield_10') comboShieldDelta = 10;

          // Bundles (hint + boost)
          else if (itemId === 'bundle_quiz_starter') {
            baseHints = 5;
            boostGrants.push({ id: 'coin_boost_15', minutes: 15 });
          } else if (itemId === 'bundle_grind_pack') {
            baseHints = 10;
            boostGrants.push({ id: 'xp_boost_15', minutes: 15 });
          } else if (itemId === 'bundle_power_kit') {
            baseHints = 15;
            boostGrants.push({ id: 'mega_boost_30', minutes: 30 });
          }

          if (baseHints > 0) {
            hintTokenDelta = applyHintBonus(baseHints, ownedBefore);
          }
        }

        // Boost effects (duration can be permanently extended)
        const boostExtraMinutes = ownedBefore.includes('boost_plus_10') ? 10 : 0;
        const finalBoostDuration = type === 'boost' ? Math.max(0, (duration ?? 0) + boostExtraMinutes) : 0;

        set(s => {
          let nextOwnedItems = s.ownedItems;

          if (type === 'permanent') {
            // Tiered upgrades: keep only the best tier owned.
            const isSeedDiscount = itemId.startsWith('seed_discount_');
            const isPhrasalDiscount = itemId.startsWith('phrasal_discount_');
            const isHintBonus = itemId.startsWith('hint_bonus_');
            const isCoinCharm = itemId.startsWith('coin_charm_');
            const isXpCharm = itemId.startsWith('xp_charm_');

            nextOwnedItems = nextOwnedItems.filter(id => {
              if (isSeedDiscount && id.startsWith('seed_discount_')) return false;
              if (isPhrasalDiscount && id.startsWith('phrasal_discount_')) return false;
              if (isHintBonus && id.startsWith('hint_bonus_')) return false;
              if (isCoinCharm && id.startsWith('coin_charm_')) return false;
              if (isXpCharm && id.startsWith('xp_charm_')) return false;
              return true;
            });

            nextOwnedItems = [...nextOwnedItems, itemId];
          }

          let nextActiveBoosts = s.activeBoosts;

          if (type === 'boost' && finalBoostDuration > 0) {
            nextActiveBoosts = [...nextActiveBoosts, { id: itemId, expiresAt: now + finalBoostDuration * 60 * 1000 }];
          }

          if (type === 'consumable' && boostGrants.length > 0) {
            nextActiveBoosts = [...nextActiveBoosts];
            for (const grant of boostGrants) {
              const minutes = Math.max(0, grant.minutes + boostExtraMinutes);
              if (minutes <= 0) continue;

              const idx = nextActiveBoosts.findIndex(b => b.id === grant.id);
              if (idx >= 0 && nextActiveBoosts[idx].expiresAt > now) {
                // Extend existing
                const current = nextActiveBoosts[idx];
                nextActiveBoosts[idx] = { ...current, expiresAt: current.expiresAt + minutes * 60 * 1000 };
              } else {
                nextActiveBoosts.push({ id: grant.id, expiresAt: now + minutes * 60 * 1000 });
              }
            }
          }

          return {
            coins: s.coins - price,
            hintTokens: hintTokenDelta > 0 ? s.hintTokens + hintTokenDelta : s.hintTokens,
            comboShields: comboShieldDelta > 0 ? s.comboShields + comboShieldDelta : s.comboShields,
            activeBoosts: nextActiveBoosts,
            ownedItems: nextOwnedItems,
          };
        });

        return true;
      },

      hasActiveBoost: (boostId) => {
        const state = get();
        return state.activeBoosts.some(b => b.id === boostId && b.expiresAt > Date.now());
      },

      cleanExpiredBoosts: () => {
        set(state => ({
          activeBoosts: state.activeBoosts.filter(b => b.expiresAt > Date.now()),
        }));
      },

      useHintToken: () => {
        const state = get();
        if (state.hintTokens <= 0) return false;
        set(state => ({ hintTokens: state.hintTokens - 1 }));
        return true;
      },

      useComboShield: () => {
        const state = get();
        if (state.comboShields <= 0) return false;
        set(state => ({ comboShields: state.comboShields - 1 }));
        return true;
      },

      toggleSfx: () => set(state => ({ sfxEnabled: !state.sfxEnabled })),
      setSfx: (enabled) => set({ sfxEnabled: enabled }),
      toggleHaptic: () => set(state => ({ hapticEnabled: !state.hapticEnabled })),
      setHaptic: (enabled) => set({ hapticEnabled: enabled }),

      toggleFavorite: (wordId) => {
        const now = Date.now();
        set(state => {
          //  OrijinalID bulma - wordId ya kendisi ya da originalWordId
          const originalId = (() => {
            // Farm'da ara
            const farmWord = state.farm.find(w => w.id === wordId || (w as any).originalWordId === wordId);
            if (farmWord) return farmWord.id;

            // Inventory'de ara
            const invWord = state.inventory.find(w => w.id === wordId || (w as any).originalWordId === wordId);
            if (invWord) return (invWord as any).originalWordId || invWord.id;

            // PhrasalVerbFarm'da ara
            const pvFarmWord = state.phrasalVerbFarm.find(w => w.id === wordId || (w as any).originalWordId === wordId);
            if (pvFarmWord) return pvFarmWord.id;

            // PhrasalVerbInventory'de ara
            const pvInvWord = state.phrasalVerbInventory.find(w => w.id === wordId || (w as any).originalWordId === wordId);
            if (pvInvWord) return (pvInvWord as any).originalWordId || pvInvWord.id;

            return wordId; // Fallback
          })();

          //  TOGGLE DURUMUNU BEL - orijinalID'nin mevcut isFavorite state'i
          let isFavoriteNow = false;
          const farmWord = state.farm.find(w => w.id === originalId);
          if (farmWord) isFavoriteNow = farmWord.isFavorite || false;
          const invWord = state.inventory.find(w => (w as any).originalWordId === originalId);
          if (invWord) isFavoriteNow = invWord.isFavorite || false;
          const pvFarmWord = state.phrasalVerbFarm.find(w => w.id === originalId);
          if (pvFarmWord) isFavoriteNow = pvFarmWord.isFavorite || false;
          const pvInvWord = state.phrasalVerbInventory.find(w => (w as any).originalWordId === originalId);
          if (pvInvWord) isFavoriteNow = pvInvWord.isFavorite || false;

          const newFavoriteState = !isFavoriteNow;
          const favoriteTimestamp = newFavoriteState ? now : undefined;

          return {
            // Farm - orijinalID ve tüm çeşitlileri update et
            farm: state.farm.map(w => (w.id === originalId || w.id === wordId) ? {
              ...w,
              isFavorite: newFavoriteState,
              favoriteAddedAt: favoriteTimestamp
            } : w),
            // Inventory - orijinalID'ye ait tüm copy'leri update et
            inventory: state.inventory.map(w => (w.id === wordId || (w as any).originalWordId === originalId) ? {
              ...w,
              isFavorite: newFavoriteState,
              favoriteAddedAt: favoriteTimestamp
            } : w),
            // PhrasalVerbFarm - orijinalID'ye ait tüm update et
            phrasalVerbFarm: state.phrasalVerbFarm.map(w => (w.id === originalId || w.id === wordId) ? {
              ...w,
              isFavorite: newFavoriteState,
              favoriteAddedAt: favoriteTimestamp
            } : w),
            // PhrasalVerbInventory - orijinalID'ye ait tüm copy'leri update et
            phrasalVerbInventory: state.phrasalVerbInventory.map(w => (w.id === wordId || (w as any).originalWordId === originalId) ? {
              ...w,
              isFavorite: newFavoriteState,
              favoriteAddedAt: favoriteTimestamp
            } : w),
          };
        });
      },

      updateWordTimestamp: (wordId: string, timestamp: number) => {
        set(state => ({
          farm: state.farm.map(w => w.id === wordId ? { ...w, lastPlantedAt: timestamp } : w),
          inventory: state.inventory.map(w => w.id === wordId ? { ...w, lastPlantedAt: timestamp } : w),
        }));
      },

      resetProgress: () => {
        const today = new Date().toISOString().split('T')[0];
        set(() => ({
          farm: [],
          inventory: [],
          quizActive: false,
          quizWords: [],
          miniQuizFor: undefined,
          xp: 0,
          level: 1,
          streak: 0,
          bestStreak: 0,
          currentCombo: 0,
          totalQuizzes: 0,
          totalCorrect: 0,
          totalWrong: 0,
          achievements: INITIAL_ACHIEVEMENTS.map(ach => ({ ...ach })),
          lastPlayedDate: today,
          dailyGoal: 500,
          dailyProgress: 0,
          coins: 0,
          lifetimeCoins: 0,
          hintTokens: 0,
          comboShields: 0,
          activeBoosts: [],
          ownedItems: [],
          sfxEnabled: true,
          hapticEnabled: true,
          unlockedPhrasalVerbs: [],
          phrasalVerbFarm: [],
          phrasalVerbInventory: [],
          phrasalVerbQuizStats: { perfectQuizzes: 0, maxCombo: 0 },
          recentQuizWordIds: [],
          lastInventoryQuizTime: 0,
          insecticideActive: false,
          cardsAddedSinceInsecticide: 0,
          cardFeedback: null,
          lifetimeHarvests: 0,
          learnedWordIds: [],

        }));
      },

      // 📚 Phrasal Verb Actions
      loadPhrasalVerbs: () => {
        try {
          //  PHARASAL_VERBS_EXAMPLE.json kullan - example_tr içeriyor!
          const data = require('../../assets/data/PHARASAL_VERBS_EXAMPLE.json');
          if (!Array.isArray(data)) return;

          set(state => {
            if (state.phrasalVerbs.length > 0) return {};

            const normalized = data.map((pv: PhrasalVerb) => ({
              ...pv,
              text: pv.verb, //  verb'ı text olarak da ekle (uyumluluk için)
              mastery: pv.mastery ?? 0,
              correctCount: pv.correctCount ?? 0,
              wrongCount: pv.wrongCount ?? 0,
              reviewInterval: pv.reviewInterval ?? 1,
            }));

            const defaultUnlocked = state.unlockedPhrasalVerbs.length > 0
              ? state.unlockedPhrasalVerbs
              : normalized.filter(pv => pv.difficulty === 'A1').slice(0, 15).map(pv => pv.id);

            return {
              phrasalVerbs: normalized,
              unlockedPhrasalVerbs: defaultUnlocked,
            };
          });
        } catch (e) {
          // Silently fail
        }
      },

      unlockPhrasalVerb: (verbId: string, difficulty: string) => {
        const state = get();
        const prices: Record<string, number> = {
          A1: 50, A2: 100, B1: 200, B2: 400, C1: 800, C2: 1500,
        };
        const basePrice = prices[difficulty] || 100;
        const price = Math.max(1, Math.floor(basePrice * getPhrasalDiscountFactor(state.ownedItems)));

        if (state.coins < price) return false;
        if (state.unlockedPhrasalVerbs.includes(verbId)) return true;

        set(s => ({
          coins: s.coins - price,
          unlockedPhrasalVerbs: [...s.unlockedPhrasalVerbs, verbId],
        }));
        return true;
      },

      addPhrasalVerbToFarm: (verbInput) => {
        const state = get();
        let verb: PhrasalVerb | undefined;
        let wasCorrect: boolean | undefined;

        if (typeof verbInput === 'string') {
          verb = state.phrasalVerbs.find(pv => pv.id === verbInput);
        } else {
          verb = verbInput;
          wasCorrect = verbInput.wasCorrect;
        }

        if (!verb) return;
        if (typeof verbInput === 'string' && !state.unlockedPhrasalVerbs.includes(verb.id)) return;

        const alreadyMastered = state.phrasalVerbInventory.some(v => (v.phrasalVerbId || v.id) === verb.id);
        if (alreadyMastered) return;

        const existing = state.phrasalVerbFarm.find(v => (v.phrasalVerbId || v.id) === verb.id);
        const correctDelta = wasCorrect ? 1 : 0;
        const wrongDelta = wasCorrect === false ? 1 : 0;

        if (existing) {
          //  RENK SİSTEMİ: Normal kelime gibi çalışsın
          // Doğru cevap → wrongCount +1 (yeşile doğru)
          // Yanlış cevap → wrongCount -1 (kırmızıya doğru)
          const currentWrongCount = existing.wrongCount || 0;
          let newWrongCount = currentWrongCount;

          if (wasCorrect === true) {
            // Doğru cevap - wrongCount'u artır (max 3 = yeşil)
            newWrongCount = Math.min(3, currentWrongCount + 1);
          } else if (wasCorrect === false) {
            // Yanlış cevap - wrongCount'u azalt (min 0 = kırmızı)
            newWrongCount = Math.max(0, currentWrongCount - 1);
          }

          set(s => ({
            phrasalVerbFarm: s.phrasalVerbFarm.map(v =>
              (v.phrasalVerbId || v.id) === verb!.id
                ? {
                  ...v,
                  wrongCount: newWrongCount,
                  level: Math.max(0, Math.min(10, v.level + (wasCorrect ? 1 : wasCorrect === false ? -1 : 0))),
                  lastAnswerCorrect: wasCorrect ?? v.lastAnswerCorrect,
                  lastPlantedAt: Date.now(), // 📌 Quiz'den gelen kelime en üstte
                  // 📊 Quiz istatistikleri ayrı tutulur
                  quizCorrect: (v.quizCorrect || 0) + correctDelta,
                  quizWrong: (v.quizWrong || 0) + wrongDelta,
                }
                : v
            ),
          }));
          return;
        }

        //  Yeni kelime - renk sistemine göre başlat
        // Doğru cevap → wrongCount = 3 (yeşil - hasat edilebilir)
        // Yanlış cevap → wrongCount = 0 (kırmızı - en düşük seviye)
        const newWord: WordModel = {
          id: verb.id,
          phrasalVerbId: verb.id,
          text: verb.verb,
          verb: verb.verb,
          meaning: verb.meaning,
          example: verb.example,
          example_tr: (verb as any).example_tr, //  Türkçe örnek cümle ekle!
          difficulty: verb.difficulty,
          type: 'phrasal',
          level: wasCorrect ? 1 : 0,
          wrongCount: wasCorrect ? 3 : 0, // Doğru=yeşil(3), Yanlış=kırmızı(0)
          correctCount: wasCorrect ? 1 : 0, // Quiz istatistiği
          consecutiveCorrect: 0,
          harvestedCount: 0,
          totalHarvests: 0,
          masterLevel: 0,
          lastAnswerCorrect: wasCorrect,
          lastPlantedAt: Date.now(), // 📌 Quiz'den gelen kelime en üstte
          isPhrasalVerb: true,
          category: verb.category,
          // 📊 Quiz istatistikleri
          quizCorrect: correctDelta,
          quizWrong: wrongDelta,
        };

        set(s => ({ phrasalVerbFarm: [...s.phrasalVerbFarm, newWord] }));
      },

      updatePhrasalVerbProgress: (verbId, correct) => {
        const state = get();
        const idx = state.phrasalVerbs.findIndex(pv => pv.id === verbId);
        if (idx === -1) return;

        set(s => {
          const pv = s.phrasalVerbs[idx];
          const currentMastery = pv.mastery || 0;
          const masteryDelta = correct ? Math.max(5, 20 - Math.floor(currentMastery / 5)) : -10;
          const mastery = Math.max(0, Math.min(100, currentMastery + masteryDelta));

          const now = new Date();
          let intervalDays = 1;
          if (mastery >= 90) intervalDays = 30;
          else if (mastery >= 70) intervalDays = 14;
          else if (mastery >= 50) intervalDays = 7;
          else if (mastery >= 30) intervalDays = 3;

          const nextReview = new Date(now);
          nextReview.setDate(nextReview.getDate() + intervalDays);

          const updated = [...s.phrasalVerbs];
          updated[idx] = {
            ...pv,
            mastery,
            correctCount: (pv.correctCount || 0) + (correct ? 1 : 0),
            wrongCount: (pv.wrongCount || 0) + (correct ? 0 : 1),
            lastReviewed: now.toISOString(),
            nextReview: nextReview.toISOString(),
            reviewInterval: intervalDays,
          };

          return { phrasalVerbs: updated };
        });
      },

      // 📦 ENVANTER QUIZ - Seviye düşürme (Master→Yeşil, Ultra→Master, Perfect→Ultra)
      demoteWordLevel: (wordId, isPhrasal) => {
        set(s => {
          if (isPhrasal) {
            // Phrasal verb inventory
            const idx = s.phrasalVerbInventory.findIndex(w => w.id === wordId);
            if (idx === -1) return s;

            const word = s.phrasalVerbInventory[idx];
            const currentLevel = word.masterLevel || 1;
            const newLevel = currentLevel - 1;

            // Level 0'a düşerse → Envanterden çıkar, tarlaya ek
            if (newLevel <= 0) {
              // Envanterden çıkar
              const updatedInventory = s.phrasalVerbInventory.filter((_, i) => i !== idx);

              // Tarlaya en başa ekle (yeşil seviyede)
              const newFarmWord = {
                ...word,
                plantedAt: Date.now(),
                masterLevel: 0,
              };

              return {
                phrasalVerbInventory: updatedInventory,
                phrasalVerbFarm: [newFarmWord, ...s.phrasalVerbFarm]
              };
            }

            // Seviye düşür (Ultra→Master, Perfect→Ultra)
            const updated = [...s.phrasalVerbInventory];
            updated[idx] = {
              ...word,
              masterLevel: newLevel,
            };

            return { phrasalVerbInventory: updated };
          } else {
            // Normal word inventory
            const idx = s.inventory.findIndex(w => w.id === wordId);
            if (idx === -1) return s;

            const word = s.inventory[idx];
            const currentLevel = word.masterLevel || 1;
            const newLevel = currentLevel - 1;

            // Level 0'a düşerse → Envanterden çıkar, tarlaya ek
            if (newLevel <= 0) {
              // Envanterden çıkar
              const updatedInventory = s.inventory.filter((_, i) => i !== idx);

              // Tarlaya en başa ekle (yeşil seviyede)
              const newFarmWord = {
                ...word,
                plantedAt: Date.now(),
                masterLevel: 0,
              };

              return {
                inventory: updatedInventory,
                farm: [newFarmWord, ...s.farm]
              };
            }

            // Seviye düşür (Ultra→Master, Perfect→Ultra)
            const updated = [...s.inventory];
            updated[idx] = {
              ...word,
              masterLevel: newLevel,
            };

            return { inventory: updated };
          }
        });
      },

      // 📦 ENVANTER QUIZ - Son quiz zamanını kaydet
      setLastInventoryQuizTime: (time) => {
        set({ lastInventoryQuizTime: time });
      },

      // 🧪 BÖCEK İLACI - Böcek ilacı aktivasyonunu ayarla
      setInsecticideActive: (active) => {
        set({
          insecticideActive: active,
          // Aktif edildiğinde sayaç sıfırla
          cardsAddedSinceInsecticide: active ? 0 : undefined,
        });
      },

      // 🧪 BÖCEK İLACI - Eklenen kart sayısını güncelle
      addCardsCounterForInsecticide: (count) => {
        set((state) => {
          if (!state.insecticideActive) return state;
          const newCount = toSafeNumber(state.cardsAddedSinceInsecticide, 0) + toSafeNumber(count, 0);
          return {
            cardsAddedSinceInsecticide: newCount,
            // 10'a ulaştıysak böcek ilacısını kapat
            insecticideActive: newCount < 10,
          };
        });
      },
    }),
    {
      name: 'farmword-storage',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Record<string, unknown>) || {};
        const merged = {
          ...(currentState as any),
          ...persisted,
        } as any;

        merged.farm = toSafeWordArray(persisted.farm ?? merged.farm);
        merged.inventory = toSafeWordArray(persisted.inventory ?? merged.inventory);
        merged.phrasalVerbFarm = toSafeWordArray(persisted.phrasalVerbFarm ?? merged.phrasalVerbFarm);
        merged.phrasalVerbInventory = toSafeWordArray(persisted.phrasalVerbInventory ?? merged.phrasalVerbInventory);
        merged.learnedWordIds = toSafeArray<string>(persisted.learnedWordIds ?? merged.learnedWordIds);
        merged.recentQuizWordIds = toSafeArray<string>(persisted.recentQuizWordIds ?? merged.recentQuizWordIds);
        merged.ownedItems = toSafeArray<string>(persisted.ownedItems ?? merged.ownedItems);
        merged.ownedCardThemes = sanitizeOwnedCardThemes(persisted.ownedCardThemes ?? merged.ownedCardThemes);
        merged.collectedCards = toSafeArray<string>(persisted.collectedCards ?? merged.collectedCards);
        merged.activeBoosts = toSafeObjectArray<ActiveBoost>(persisted.activeBoosts ?? merged.activeBoosts);
        merged.battleHistory = toSafeObjectArray<any>(persisted.battleHistory ?? merged.battleHistory);
        merged.sesyapHistory = toSafeObjectArray<any>(persisted.sesyapHistory ?? merged.sesyapHistory);
        merged.dailyQuests = sanitizeQuestCollection<any>(persisted.dailyQuests ?? merged.dailyQuests);
        merged.weeklyQuests = sanitizeQuestCollection<any>(persisted.weeklyQuests ?? merged.weeklyQuests);
        merged.repeatableQuests = sanitizeQuestCollection<any>(persisted.repeatableQuests ?? merged.repeatableQuests);
        merged.storyQuests = sanitizeQuestCollection<any>(persisted.storyQuests ?? merged.storyQuests);
        merged.achievementQuests = sanitizeQuestCollection<any>(persisted.achievementQuests ?? merged.achievementQuests);
        merged.masteryPaths = sanitizeMasteryPathCollection(persisted.masteryPaths ?? merged.masteryPaths);
        merged.achievements = sanitizeAchievementCollection(persisted.achievements ?? merged.achievements);
        merged.activeCardTheme = sanitizeActiveCardTheme(
          persisted.activeCardTheme ?? merged.activeCardTheme,
          merged.ownedCardThemes
        );
        merged.cardCustomization = { ...DEFAULT_CUSTOMIZATION, ...(persisted.cardCustomization as any || merged.cardCustomization || {}) };
        merged.user = sanitizePersistedUser(persisted.user ?? merged.user);
        merged.isAuthenticated = !!merged.user && !!persisted.isAuthenticated;
        merged.coins = toSafePositiveInt(persisted.coins ?? merged.coins);
        merged.lifetimeCoins = toSafePositiveInt(persisted.lifetimeCoins ?? merged.lifetimeCoins);
        merged.xp = toSafePositiveInt(persisted.xp ?? merged.xp);
        merged.level = Math.max(1, toSafePositiveInt((persisted.level ?? merged.level ?? 1)));
        merged.streak = toSafePositiveInt(persisted.streak ?? merged.streak);
        merged.bestStreak = toSafePositiveInt(persisted.bestStreak ?? merged.bestStreak);
        merged.lifetimeHarvests = toSafePositiveInt(persisted.lifetimeHarvests ?? merged.lifetimeHarvests);
        merged.cardsAddedSinceInsecticide = toSafePositiveInt(persisted.cardsAddedSinceInsecticide ?? merged.cardsAddedSinceInsecticide);
        merged.guidedModeActive = !!persisted.guidedModeActive;
        const persistedGuidedStep = typeof persisted.guidedModeStep === 'string' ? persisted.guidedModeStep : 'QUIZ_UNTIL_WRONG';
        merged.guidedModeStep = merged.guidedModeActive ? persistedGuidedStep : 'COMPLETED';
        merged.guidedModeTargetWordId = typeof persisted.guidedModeTargetWordId === 'string'
          ? persisted.guidedModeTargetWordId
          : undefined;
        merged.guidedModeTargetWordText = typeof persisted.guidedModeTargetWordText === 'string'
          ? persisted.guidedModeTargetWordText
          : undefined;
        return merged;
      },
      partialize: (state) => ({
        // pool: state.pool, // 🚫 Static data - persist etme!
        farm: state.farm,
        inventory: state.inventory,
        xp: state.xp,
        level: state.level,
        streak: state.streak,
        bestStreak: state.bestStreak,
        currentCombo: state.currentCombo,
        totalQuizzes: state.totalQuizzes,
        totalCorrect: state.totalCorrect,
        totalWrong: state.totalWrong,
        achievements: state.achievements,
        lastPlayedDate: state.lastPlayedDate,
        dailyGoal: state.dailyGoal,
        dailyProgress: state.dailyProgress,
        coins: state.coins,
        lifetimeCoins: state.lifetimeCoins,
        hintTokens: state.hintTokens,
        comboShields: state.comboShields,
        activeBoosts: state.activeBoosts,
        ownedItems: state.ownedItems,
        sfxEnabled: state.sfxEnabled,
        hapticEnabled: state.hapticEnabled,
        // phrasalVerbs: state.phrasalVerbs, // 🚫 Static data - persist etme!
        unlockedPhrasalVerbs: state.unlockedPhrasalVerbs,
        phrasalVerbFarm: state.phrasalVerbFarm,
        phrasalVerbInventory: state.phrasalVerbInventory,
        phrasalVerbQuizStats: state.phrasalVerbQuizStats,
        recentQuizWordIds: state.recentQuizWordIds,
        lastInventoryQuizTime: state.lastInventoryQuizTime,
        insecticideActive: state.insecticideActive,
        cardsAddedSinceInsecticide: state.cardsAddedSinceInsecticide,
        lifetimeHarvests: state.lifetimeHarvests,
        learnedWordIds: state.learnedWordIds,
        nickname: state.nickname,
        phrasalHintShown: state.phrasalHintShown,
        cloudTipsDismissed: state.cloudTipsDismissed,
        //  Günlük görevler
        dailyQuests: state.dailyQuests,
        trophies: state.trophies,
        lastQuestResetDate: state.lastQuestResetDate,
        //  SesYap tarla geçmişi
        sesyapHistory: state.sesyapHistory,
        //  Günlük seri (streak) sistemi
        dailyStreak: state.dailyStreak,
        lastStreakCheckDate: state.lastStreakCheckDate,
        //  Tutorial state - persist edilmeli!
        tutorialStep: state.tutorialStep,
        tutorialMiniQuizShown: state.tutorialMiniQuizShown,
        tutorialEnvShown: state.tutorialEnvShown,
        tutorialFirstWrongWord: state.tutorialFirstWrongWord,
        tutorialHighlightedWordId: state.tutorialHighlightedWordId,
        guidedModeActive: state.guidedModeActive,
        guidedModeStep: state.guidedModeStep,
        guidedModeTargetWordId: state.guidedModeTargetWordId,
        guidedModeTargetWordText: state.guidedModeTargetWordText,
        //  Battle mode user data - persist!
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Battle stats
        battleWins: state.battleWins,
        battleLosses: state.battleLosses,
        bestBattleStreak: state.bestBattleStreak,
        currentBattleStreak: state.currentBattleStreak,
        battleHistory: state.battleHistory,
        // Haftalik gorevler
        weeklyQuests: state.weeklyQuests,
        lastWeeklyResetDate: state.lastWeeklyResetDate,
        // Tekrarlanabilir gorevler
        repeatableQuests: state.repeatableQuests,
        // Hikaye gorevleri
        storyQuests: state.storyQuests,
        // Basari gorevleri
        achievementQuests: state.achievementQuests,
        // Ustalik yollari
        masteryPaths: state.masteryPaths,
        // Gorev istatistikleri
        totalQuestsCompleted: state.totalQuestsCompleted,
        dailyQuestStreak: state.dailyQuestStreak,
        // Lifetime istatistikler
        lifetimePlantedWords: state.lifetimePlantedWords,
        lifetimeSpeechPractice: state.lifetimeSpeechPractice,
        lifetimePuzzlesCompleted: state.lifetimePuzzlesCompleted,
        lifetimePhrasalHarvested: state.lifetimePhrasalHarvested,
        lifetimeBattlesWon: state.lifetimeBattlesWon,
        lifetimeQuizAnswered: state.lifetimeQuizAnswered,
        maxComboEver: state.maxComboEver,
        // Kart tema sistemi
        ownedCardThemes: state.ownedCardThemes,
        activeCardTheme: state.activeCardTheme,
        cardCustomization: state.cardCustomization,
        collectedCards: state.collectedCards,

      }),
      onRehydrateStorage: () => (state) => {
        //  QUEST ARRAY VALIDATION: Corrupted AsyncStorage protection
        if (state) {
          state.farm = toSafeWordArray(state.farm);
          state.inventory = toSafeWordArray(state.inventory);
          state.phrasalVerbFarm = toSafeWordArray(state.phrasalVerbFarm);
          state.phrasalVerbInventory = toSafeWordArray(state.phrasalVerbInventory);
          state.learnedWordIds = toSafeArray<string>(state.learnedWordIds);
          state.recentQuizWordIds = toSafeArray<string>(state.recentQuizWordIds);
          state.ownedItems = toSafeArray<string>(state.ownedItems);
          state.activeBoosts = toSafeObjectArray<ActiveBoost>(state.activeBoosts);
          state.achievements = sanitizeAchievementCollection(state.achievements);
          state.user = sanitizePersistedUser(state.user);
          state.isAuthenticated = !!state.user && !!state.isAuthenticated;
          state.coins = toSafePositiveInt(state.coins);
          state.lifetimeCoins = toSafePositiveInt(state.lifetimeCoins);
          state.xp = toSafePositiveInt(state.xp);
          state.level = Math.max(1, toSafePositiveInt(state.level || 1));
          state.streak = toSafePositiveInt(state.streak);
          state.bestStreak = toSafePositiveInt(state.bestStreak);
          state.lifetimeHarvests = toSafePositiveInt(state.lifetimeHarvests);
          state.cardsAddedSinceInsecticide = toSafePositiveInt(state.cardsAddedSinceInsecticide);
          if (!Array.isArray(state.dailyQuests)) state.dailyQuests = [];
          if (!Array.isArray(state.weeklyQuests)) state.weeklyQuests = [];
          if (!Array.isArray(state.repeatableQuests)) state.repeatableQuests = [];
          if (!Array.isArray(state.storyQuests)) state.storyQuests = [];
          if (!Array.isArray(state.achievementQuests)) state.achievementQuests = [];
          if (!Array.isArray(state.masteryPaths)) state.masteryPaths = [];
          if (!Array.isArray(state.battleHistory)) state.battleHistory = [];
          if (!Array.isArray(state.sesyapHistory)) state.sesyapHistory = [];
          // 🌱 MIGRATION: customFarm/customInventory → normal farm/inventory
          const oldCustomFarm = Array.isArray((state as any).customFarm) ? (state as any).customFarm : [];
          const oldCustomInventory = Array.isArray((state as any).customInventory) ? (state as any).customInventory : [];
          if (oldCustomFarm.length > 0) {
            const existingIds = new Set((state.farm || []).map((w: any) => w.text?.toLowerCase()));
            const toMigrate = oldCustomFarm.filter((w: any) => !existingIds.has(w.text?.toLowerCase()));
            if (toMigrate.length > 0) {
              state.farm = [...toMigrate.map((w: any) => ({ ...w, isCustom: true })), ...state.farm];
            }
            delete (state as any).customFarm;
          }
          if (oldCustomInventory.length > 0) {
            const existingInvIds = new Set((state.inventory || []).map((w: any) => w.text?.toLowerCase()));
            const toMigrateInv = oldCustomInventory.filter((w: any) => !existingInvIds.has(w.text?.toLowerCase()));
            if (toMigrateInv.length > 0) {
              state.inventory = [...toMigrateInv.map((w: any) => ({ ...w, isCustom: true })), ...state.inventory];
            }
            delete (state as any).customInventory;
          }
          //  Card theme arrays
          state.ownedCardThemes = sanitizeOwnedCardThemes(state.ownedCardThemes);
          if (!Array.isArray(state.collectedCards)) state.collectedCards = [];
          state.activeCardTheme = sanitizeActiveCardTheme(state.activeCardTheme, state.ownedCardThemes);
          state.cardCustomization = { ...DEFAULT_CUSTOMIZATION, ...(state.cardCustomization || {}) };
        }
        if (state) {
          state.achievements = sanitizeAchievementCollection(state.achievements);
        }
      },
    }
  )
);


