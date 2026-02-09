import { create } from 'zustand';
import type { WordModel } from '@models/WordModel';
import { generateWordPool, pickQuizWords } from '@utils/randomWords';
import { pickRandomWords, pickQuizWordsFromJSON } from '@utils/loadWords';
import { calcHarvest } from '@utils/calcHarvest';
import { sound } from '@utils/sound';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  reward: { coins: number; xp: number };
  claimed: boolean;
  unlocked: boolean;
}

interface StoreItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  type: 'boost' | 'consumable' | 'permanent';
  duration?: number; // minutes for boosts
}

interface ActiveBoost {
  id: string;
  expiresAt: number; // timestamp
}

interface FarmStore {
  pool: WordModel[];
  farm: WordModel[]; // currently growing words
  inventory: WordModel[]; // mastered words that can be reviewed
  quizActive: boolean;
  quizWords: WordModel[];
  miniQuizFor?: string; // word id
  xp: number;
  level: number;
  streak: number; // current correct answer streak
  bestStreak: number; // all-time best streak
  totalQuizzes: number;
  totalCorrect: number;
  totalWrong: number;
  achievements: Achievement[]; // achievement objects with rewards
  lastPlayedDate?: string; // for daily tracking
  dailyGoal: number; // daily XP goal
  dailyProgress: number; // XP earned today
  coins: number; // 💰 NEW: In-game currency!
  hintTokens: number; // 💡 Hint tokens for quiz
  activeBoosts: ActiveBoost[]; // Active timed boosts
  ownedItems: string[]; // Permanent items owned
  sfxEnabled: boolean;
  phrasalVerbs: any[]; // 📚 Phrasal verbs pool
  unlockedPhrasalVerbs: string[]; // Unlocked phrasal verb IDs
  phrasalVerbFarm: any[]; // 🌱 Phrasal verbs currently learning (separate farm)
  phrasalVerbInventory: any[]; // 📦 Mastered phrasal verbs
  phrasalVerbQuizStats: { // 📊 Phrasal verb quiz tracking
    perfectQuizzes: number;
    maxCombo: number;
  };
  startQuiz: () => void;
  answerQuiz: (wordId: string, correct: boolean) => void;
  openMiniQuiz: (wordId: string) => void;
  answerMiniQuiz: (wordId: string, correct: boolean) => void;
  reviewFromInventory: (wordId: string) => void; // Move word back to farm for review
  checkAchievements: () => void;
  claimAchievementReward: (achievementId: string) => void;
  addCoins: (amount: number) => void;
  purchaseItem: (itemId: string, price: number, type: 'boost' | 'consumable' | 'permanent', duration?: number) => boolean;
  hasActiveBoost: (boostId: string) => boolean;
  cleanExpiredBoosts: () => void;
  useHintToken: () => boolean;
  unlockPhrasalVerb: (verbId: string, difficulty: string) => boolean; // 💰 Unlock with coins
  loadPhrasalVerbs: () => Promise<void>; // Load from JSON
  addPhrasalVerbToFarm: (phrasalVerbId: string) => void; // 🌱 Add phrasal verb to farm
  updatePhrasalVerbProgress: (verbId: string, correct: boolean) => void; // 📊 Update learning progress
  toggleSfx: () => void;
  setSfx: (enabled: boolean) => void;
  toggleFavorite: (wordId: string) => void; // ⭐ Toggle favorite status
}

const initialSfxEnabled = (() => {
  try {
    return sound.isEnabled();
  } catch {
    return true;
  }
})();

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_correct', title: 'İlk Adım', description: 'İlk doğru cevabını ver', icon: '🎯', requirement: 1, reward: { coins: 10, xp: 50 }, claimed: false, unlocked: false },
  { id: 'first_wrong', title: 'Hata Yapma Hakkı', description: 'İlk yanlış cevabını ver (hata yapmak öğrenmenin parçası)', icon: '❌', requirement: 1, reward: { coins: 5, xp: 10 }, claimed: false, unlocked: false },
  { id: 'wrong_10', title: 'Azimli', description: '10 yanlış cevap ver (pes etme!)', icon: '💪', requirement: 10, reward: { coins: 20, xp: 50 }, claimed: false, unlocked: false },
  { id: 'combo_5', title: 'Combo Master', description: '5 combo yap', icon: '🔥', requirement: 5, reward: { coins: 25, xp: 100 }, claimed: false, unlocked: false },
  { id: 'combo_10', title: 'Perfect 10', description: '10 combo yap', icon: '💎', requirement: 10, reward: { coins: 50, xp: 200 }, claimed: false, unlocked: false },
  { id: 'level_5', title: 'Yükselen Yıldız', description: 'Level 5\'e ulaş', icon: '⭐', requirement: 5, reward: { coins: 100, xp: 500 }, claimed: false, unlocked: false },
  { id: 'harvest_10', title: 'Çiftçi', description: '10 kelime hasat et', icon: '🌾', requirement: 10, reward: { coins: 75, xp: 250 }, claimed: false, unlocked: false },
  { id: 'speed_demon', title: 'Hız Şeytanı', description: '5 hızlı cevap ver', icon: '⚡', requirement: 5, reward: { coins: 50, xp: 150 }, claimed: false, unlocked: false },
  
  // 📚 PHRASAL VERB ACHIEVEMENTS
  { id: 'pv_unlock_10', title: 'Phrasal Keşif', description: '10 phrasal verb aç', icon: '📖', requirement: 10, reward: { coins: 50, xp: 100 }, claimed: false, unlocked: false },
  { id: 'pv_unlock_50', title: 'Phrasal Koleksiyoncu', description: '50 phrasal verb aç', icon: '📚', requirement: 50, reward: { coins: 200, xp: 500 }, claimed: false, unlocked: false },
  { id: 'pv_unlock_100', title: 'Phrasal Master', description: '100 phrasal verb aç', icon: '🎓', requirement: 100, reward: { coins: 500, xp: 1000 }, claimed: false, unlocked: false },
  { id: 'pv_unlock_all', title: 'Phrasal Efsane', description: 'Tüm phrasal verbleri aç (300)', icon: '👑', requirement: 300, reward: { coins: 2000, xp: 5000 }, claimed: false, unlocked: false },
  { id: 'pv_farm_10', title: 'Phrasal Çiftçi', description: '10 phrasal verb tarlaya ekle', icon: '🌱', requirement: 10, reward: { coins: 100, xp: 200 }, claimed: false, unlocked: false },
  { id: 'pv_quiz_perfect', title: 'Phrasal Deha', description: 'Phrasal quiz\'de 10/10 yap', icon: '💯', requirement: 1, reward: { coins: 150, xp: 300 }, claimed: false, unlocked: false },
  { id: 'pv_combo_10', title: 'Phrasal Ateş', description: 'Phrasal quiz\'de 10 combo yap', icon: '🔥', requirement: 1, reward: { coins: 200, xp: 400 }, claimed: false, unlocked: false },
];

export const useFarmStore = create<FarmStore>((set, get) => ({
  pool: pickRandomWords(4200), // 🎯 JSON'dan TÜM kelimeleri yükle! (4200+)
  farm: [],
  inventory: [],
  quizActive: false,
  quizWords: [],
  miniQuizFor: undefined,
  xp: 0,
  level: 1,
  streak: 0,
  bestStreak: 0,
  totalQuizzes: 0,
  totalCorrect: 0,
  totalWrong: 0,
  achievements: INITIAL_ACHIEVEMENTS,
  lastPlayedDate: new Date().toISOString().split('T')[0],
  dailyGoal: 500,
  dailyProgress: 0,
  coins: 100000,
  hintTokens: 0,
  activeBoosts: [],
  ownedItems: [],
  sfxEnabled: initialSfxEnabled,
  phrasalVerbs: [], // 📚 Will be loaded from JSON
  unlockedPhrasalVerbs: [], // A1 level unlocked by default
  phrasalVerbFarm: [], // 🌱 Phrasal verbs in learning
  phrasalVerbInventory: [], // 📦 Mastered phrasal verbs
  phrasalVerbQuizStats: {
    perfectQuizzes: 0,
    maxCombo: 0
  },

  startQuiz: () => {
    // 🚀 Exclude farm and inventory words for MAXIMUM VARIETY!
    const state = get();
    const excludeIds = [
      ...state.farm.map(w => w.id),
      ...state.inventory.map(w => w.id)
    ];
    set({ quizActive: true, quizWords: pickQuizWords(state.pool, 20, excludeIds) });
  },
  answerQuiz: (wordId, correct) => {
    const w = get().pool.find(w => w.id === wordId);
    if (!w) return;
    
    // Update daily progress
    const today = new Date().toISOString().split('T')[0];
    const lastPlayed = get().lastPlayedDate;
    const isNewDay = today !== lastPlayed;
    
    // Calculate streak and XP bonuses
    const prevState = get();
    const currentStreak = correct ? prevState.streak + 1 : 0;
    const streakBonus = Math.floor(currentStreak / 5) * 10; // +10 XP per 5 streak
    const baseXP = correct ? 10 : 0;
    let earnedXP = baseXP + streakBonus;
    let earnedCoins = correct ? 2 + Math.floor(currentStreak / 3) : 0; // 2 coins + bonus for streak
    
    // 🚀 Apply active boosts!
    if (get().hasActiveBoost('xp_boost')) {
      earnedXP = Math.floor(earnedXP * 1.5); // +50% XP
    }
    if (get().hasActiveBoost('double_coin')) {
      earnedCoins = earnedCoins * 2; // 2x Coins
    }
    
    // Update stats
    set(state => {
      const newXP = state.xp + earnedXP;
      const newLevel = Math.floor(newXP / 1000) + 1; // Level up every 1000 XP
      const levelUp = newLevel > state.level;
      
      const newDailyProgress = isNewDay ? earnedXP : state.dailyProgress + earnedXP;
      const wasUnderGoal = state.dailyProgress < state.dailyGoal;
      const dailyGoalComplete = wasUnderGoal && newDailyProgress >= state.dailyGoal;
      
      // Trigger level up UI
      if (levelUp && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('level-up', { detail: { level: newLevel } }));
      }
      
      // Trigger daily goal complete
      if (dailyGoalComplete && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily-goal-complete'));
        // Add bonus XP
        return {
          totalQuizzes: state.totalQuizzes + 1,
          totalCorrect: correct ? state.totalCorrect + 1 : state.totalCorrect,
          totalWrong: correct ? state.totalWrong : state.totalWrong + 1,
          streak: currentStreak,
          bestStreak: Math.max(state.bestStreak, currentStreak),
          xp: newXP + 200, // BONUS!
          coins: state.coins + earnedCoins,
          level: newLevel,
          lastPlayedDate: today,
          dailyProgress: newDailyProgress,
          dailyGoal: isNewDay ? 500 : state.dailyGoal
        };
      }
      
      const result = {
        totalQuizzes: state.totalQuizzes + 1,
        totalCorrect: correct ? state.totalCorrect + 1 : state.totalCorrect,
        totalWrong: correct ? state.totalWrong : state.totalWrong + 1,
        streak: currentStreak,
        bestStreak: Math.max(state.bestStreak, currentStreak),
        xp: newXP,
        coins: state.coins + earnedCoins,
        level: newLevel,
        lastPlayedDate: today,
        dailyProgress: newDailyProgress,
        dailyGoal: isNewDay ? 500 : state.dailyGoal
      };
      console.log('📊 Quiz answered:', { correct, earnedCoins, currentStreak, totalCorrect: result.totalCorrect, coins: result.coins });
      return result;
    });
    
    const already = get().farm.some(f => f.id === wordId);
    if (already) {
      set(state => ({
        farm: state.farm.map(f => f.id === wordId ? { 
          ...f, 
          correctCount: correct ? f.correctCount + 1 : f.correctCount, 
          wrongCount: correct ? f.wrongCount : f.wrongCount + 1,
          lastAnswerCorrect: correct // 🎯 Track last answer
        } : f)
      }));
      get().checkAchievements();
      return;
    }
    
    set(state => ({ 
      farm: [...state.farm, { 
        ...w, 
        correctCount: correct ? 1 : 0, 
        wrongCount: correct ? 0 : 3, // 🔴 Yanlış → KIRMIZI (wrongCount=3), 🌱 Doğru → YEŞİL (wrongCount=0)
        level: correct ? 1 : 0, // 🌱 Doğru → YEŞİL (level 1), 🔴 Yanlış → KIRMIZI (level 0)
        xp: 0,
        lastAnswerCorrect: correct,
        consecutiveCorrect: 0
      }] 
    }));
    
    // 🎯 IMMEDIATE Achievement Check - No delay!
    const newState = get();
    const achievementsToUnlock: Array<{id: string, icon: string, title: string, description: string}> = [];
    
    // Check for instant achievement unlocks AFTER state update
    if (correct && newState.totalCorrect === 1) {
      const firstAch = newState.achievements.find(a => a.id === 'first_correct');
      if (firstAch && !firstAch.unlocked) {
        achievementsToUnlock.push({
          id: firstAch.id,
          icon: firstAch.icon,
          title: firstAch.title,
          description: firstAch.description
        });
      }
    }
    
    // 🎯 CRITICAL: Check for first wrong answer achievement!
    if (!correct && newState.totalWrong === 1) {
      const firstWrongAch = newState.achievements.find(a => a.id === 'first_wrong');
      if (firstWrongAch && !firstWrongAch.unlocked) {
        achievementsToUnlock.push({
          id: firstWrongAch.id,
          icon: firstWrongAch.icon,
          title: firstWrongAch.title,
          description: firstWrongAch.description
        });
      }
    }
    
    // Check for 10 wrong answers achievement
    if (!correct && newState.totalWrong === 10) {
      const wrong10Ach = newState.achievements.find(a => a.id === 'wrong_10');
      if (wrong10Ach && !wrong10Ach.unlocked) {
        achievementsToUnlock.push({
          id: wrong10Ach.id,
          icon: wrong10Ach.icon,
          title: wrong10Ach.title,
          description: wrong10Ach.description
        });
      }
    }
    
    if (currentStreak === 5) {
      const combo5 = newState.achievements.find(a => a.id === 'combo_5');
      if (combo5 && !combo5.unlocked) {
        achievementsToUnlock.push({
          id: combo5.id,
          icon: combo5.icon,
          title: combo5.title,
          description: combo5.description
        });
      }
    }
    
    if (currentStreak === 10) {
      const combo10 = newState.achievements.find(a => a.id === 'combo_10');
      if (combo10 && !combo10.unlocked) {
        achievementsToUnlock.push({
          id: combo10.id,
          icon: combo10.icon,
          title: combo10.title,
          description: combo10.description
        });
      }
    }
    
    // 🔥 UPDATE achievements state and dispatch events!
    if (achievementsToUnlock.length > 0) {
      const achievementIds = achievementsToUnlock.map(a => a.id);
      
      set(state => ({
        achievements: state.achievements.map(a => 
          achievementIds.includes(a.id) ? { ...a, unlocked: true } : a
        )
      }));
      
      // Dispatch events IMMEDIATELY after state update
      if (typeof window !== 'undefined') {
        achievementsToUnlock.forEach(ach => {
          console.log('🏆 ACHIEVEMENT UNLOCKED IMMEDIATELY:', ach.title);
          window.dispatchEvent(new CustomEvent('achievement-unlock', { detail: ach }));
        });
      }
    }
    
    get().checkAchievements();
  },
  openMiniQuiz: (wordId) => set({ miniQuizFor: wordId }),
  answerMiniQuiz: (wordId, correct) => {
    const state = get();
    const farmWord = state.farm.find(f => f.id === wordId) || state.phrasalVerbFarm.find(f => f.id === wordId);
    if (!farmWord) return set({ miniQuizFor: undefined });
    const isPhrasalVerb = farmWord.isPhrasalVerb;
    const result = calcHarvest(farmWord, correct);
    
    // 🏆 MASTER CARD PROTECTION: Master kartlar için farklı mantık
    const isMasterCard = (farmWord.masterLevel || 0) > 0;
    
    if (isMasterCard) {
      // Master kartlar için sadece XP kazandır, seviye değiştirme
      if (correct) {
        // 🏆 Master Card Hasat - totalHarvests artır ve seviye kontrolü
        const currentTotalHarvests = farmWord.totalHarvests || 0;
        const newTotalHarvests = currentTotalHarvests + 1;
        let newMasterLevel = farmWord.masterLevel || 0;
        if (newTotalHarvests >= 13) newMasterLevel = 3; // 👑 Ultra Perfect Master
        else if (newTotalHarvests >= 8) newMasterLevel = 2; // 💎 Ultra Master
        else if (newTotalHarvests >= 3) newMasterLevel = 1; // 🏆 Master
        
        set(state => ({
          farm: isPhrasalVerb ? state.farm : state.farm.map(f => f.id === wordId ? { 
            ...f,
            correctCount: f.correctCount + 1,
            xp: f.xp + result.gainedXp,
            lastAnswerCorrect: true,
            totalHarvests: newTotalHarvests,
            masterLevel: newMasterLevel
          } : f),
          phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.map(f => f.id === wordId ? { 
            ...f,
            correctCount: f.correctCount + 1,
            xp: f.xp + result.gainedXp,
            lastAnswerCorrect: true,
            totalHarvests: newTotalHarvests,
            masterLevel: newMasterLevel
          } : f) : state.phrasalVerbFarm,
          xp: state.xp + result.gainedXp,
          miniQuizFor: undefined
        }));
      } else {
        // Yanlış cevap ama master seviyesi korunuyor
        set(state => ({
          farm: isPhrasalVerb ? state.farm : state.farm.map(f => f.id === wordId ? { 
            ...f,
            lastAnswerCorrect: false
          } : f),
          phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.map(f => f.id === wordId ? { 
            ...f,
            lastAnswerCorrect: false
          } : f) : state.phrasalVerbFarm,
          miniQuizFor: undefined
        }));
      }
      return;
    }
    
    // 🎯 MiniQuiz Session: correct=true → session tamamlandı (3 veya 5 doğru)
    //                      correct=false → yanlış yapıldı, reset
    
    if (!correct) {
      // Yanlış cevap - sadece reset et
      set(state => ({
        farm: isPhrasalVerb ? state.farm : state.farm.map(f => f.id === wordId ? { 
          ...f,
          wrongCount: f.wrongCount + 1,
          consecutiveCorrect: 0,
          lastAnswerCorrect: false
        } : f),
        phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.map(f => f.id === wordId ? { 
          ...f,
          wrongCount: f.wrongCount + 1,
          consecutiveCorrect: 0,
          lastAnswerCorrect: false
        } : f) : state.phrasalVerbFarm,
        miniQuizFor: undefined
      }));
      return;
    }
    
    // ✅ Session başarılı! Renk kategorisine göre yükselt
    const wrongCount = farmWord.wrongCount;
    const correctCount = farmWord.correctCount + 1;
    
    // Renk kategorisi belirleme - TUTARLI MANTIK!
    let currentColor: 'red' | 'orange' | 'yellow' | 'green';
    if (wrongCount >= 3) {
      currentColor = 'red';
    } else if (wrongCount === 2) {
      currentColor = 'orange';
    } else if (wrongCount === 1) {
      currentColor = farmWord.level === 2 ? 'yellow' : 'orange';
    } else {
      // wrongCount === 0
      currentColor = farmWord.level === 1 ? 'green' : 'yellow';
    }
    
    // Kategori yükseltme işlemleri
    if (true) {
      // Renk yükselt veya envantere gönder
      if (currentColor === 'green') {
        // YEŞİL → ENVANTER (3 doğru yeterli)
        // Golden Card Sistemi: totalHarvests artır ve masterLevel hesapla
        const currentTotalHarvests = farmWord.totalHarvests || 0;
        const newTotalHarvests = currentTotalHarvests + 1;
        let newMasterLevel = farmWord.masterLevel || 0;
        if (newTotalHarvests >= 13) newMasterLevel = 3; // 👑 Ultra Perfect Master
        else if (newTotalHarvests >= 8) newMasterLevel = 2; // 💎 Ultra Master
        else if (newTotalHarvests >= 3) newMasterLevel = 1; // 🏆 Master
        
        const masteredWord = { 
          ...farmWord, 
          level: 10, 
          xp: farmWord.xp + result.gainedXp,
          correctCount,
          wrongCount: 0,
          consecutiveCorrect: 0,
          lastAnswerCorrect: true,
          totalHarvests: newTotalHarvests,
          masterLevel: newMasterLevel
        };
        set(state => ({
          farm: isPhrasalVerb ? state.farm : state.farm.filter(f => f.id !== wordId),
          phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.filter(f => f.id !== wordId) : state.phrasalVerbFarm,
          inventory: isPhrasalVerb ? state.inventory : [...state.inventory, masteredWord],
          phrasalVerbInventory: isPhrasalVerb ? [...state.phrasalVerbInventory, masteredWord] : state.phrasalVerbInventory,
          xp: state.xp + result.gainedXp + 100,
          miniQuizFor: undefined
        }));
        
        if (typeof window !== 'undefined' && get().inventory.length === 1) {
          window.dispatchEvent(new CustomEvent('first-harvest', { detail: { word: masteredWord } }));
        }
        return;
      } else if (currentColor === 'yellow') {
        // SARI → YEŞİL (wrongCount 0, level 1 yap)
        set(state => ({
          farm: isPhrasalVerb ? state.farm : state.farm.map(f => f.id === wordId ? { 
            ...f,
            level: 1,
            wrongCount: 0,
            correctCount,
            consecutiveCorrect: 0,
            xp: f.xp + result.gainedXp,
            harvestCooldown: 0,
            lastHarvest: new Date().toISOString(),
            lastAnswerCorrect: true
          } : f),
          phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.map(f => f.id === wordId ? { 
            ...f,
            level: 1,
            wrongCount: 0,
            correctCount,
            consecutiveCorrect: 0,
            xp: f.xp + result.gainedXp,
            harvestCooldown: 0,
            lastHarvest: new Date().toISOString(),
            lastAnswerCorrect: true
          } : f) : state.phrasalVerbFarm,
          xp: state.xp + result.gainedXp,
          miniQuizFor: undefined
        }));
        return;
      } else if (currentColor === 'orange') {
        // TURUNCU → SARI (wrongCount 0 yap, level 0 veya 2+ bırak)
        set(state => ({
          farm: isPhrasalVerb ? state.farm : state.farm.map(f => f.id === wordId ? { 
            ...f,
            level: 2,
            wrongCount: 0,
            correctCount,
            consecutiveCorrect: 0,
            xp: f.xp + result.gainedXp,
            harvestCooldown: 0,
            lastHarvest: new Date().toISOString(),
            lastAnswerCorrect: true
          } : f),
          phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.map(f => f.id === wordId ? { 
            ...f,
            level: 2,
            wrongCount: 0,
            correctCount,
            consecutiveCorrect: 0,
            xp: f.xp + result.gainedXp,
            harvestCooldown: 0,
            lastHarvest: new Date().toISOString(),
            lastAnswerCorrect: true
          } : f) : state.phrasalVerbFarm,
          xp: state.xp + result.gainedXp,
          miniQuizFor: undefined
        }));
        return;
      } else if (currentColor === 'red') {
        // KIRMIZI → TURUNCU (wrongCount 1-2 arası yap)
        set(state => ({
          farm: isPhrasalVerb ? state.farm : state.farm.map(f => f.id === wordId ? { 
            ...f,
            wrongCount: 2,
            correctCount,
            consecutiveCorrect: 0,
            xp: f.xp + result.gainedXp,
            harvestCooldown: 0,
            lastHarvest: new Date().toISOString(),
            lastAnswerCorrect: true
          } : f),
          phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.map(f => f.id === wordId ? { 
            ...f,
            wrongCount: 2,
            correctCount,
            consecutiveCorrect: 0,
            xp: f.xp + result.gainedXp,
            harvestCooldown: 0,
            lastHarvest: new Date().toISOString(),
            lastAnswerCorrect: true
          } : f) : state.phrasalVerbFarm,
          xp: state.xp + result.gainedXp,
          miniQuizFor: undefined
        }));
        return;
      }
    }
    
    // Henüz yeterli doğru yok veya yanlış yapıldı - güncelle
    set(state => ({
      farm: isPhrasalVerb ? state.farm : state.farm.map(f => f.id === wordId ? { 
        ...f,
        correctCount,
        wrongCount,
        consecutiveCorrect: 0, // Reset consecutive on update
        xp: f.xp + result.gainedXp,
        harvestCooldown: 0,
        lastHarvest: new Date().toISOString(),
        lastAnswerCorrect: correct
      } : f),
      phrasalVerbFarm: isPhrasalVerb ? state.phrasalVerbFarm.map(f => f.id === wordId ? { 
        ...f,
        correctCount,
        wrongCount,
        consecutiveCorrect: 0, // Reset consecutive on update
        xp: f.xp + result.gainedXp,
        harvestCooldown: 0,
        lastHarvest: new Date().toISOString(),
        lastAnswerCorrect: correct
      } : f) : state.phrasalVerbFarm,
      xp: state.xp + result.gainedXp,
      miniQuizFor: undefined
    }));
  },
  
  reviewFromInventory: (wordId) => {
    const state = get();
    
    // Check both inventories (regular and phrasal verb)
    const word = state.inventory.find(w => w.id === wordId);
    const phrasalWord = state.phrasalVerbInventory.find(w => w.id === wordId);
    const isPhrasalVerb = !!phrasalWord;
    const targetWord = word || phrasalWord;
    
    if (!targetWord) return;
    
    // 🌱 Envanterden gelen kelime/phrasal verb YEŞİL olarak tarlaya ekilir
    const reviewWord = {
      ...targetWord,
      level: 1, // YEŞİL için level=1
      wrongCount: 0, // YEŞİL için wrongCount=0
      harvestedCount: 0,
      consecutiveCorrect: 0,
      lastHarvest: undefined,
      lastAnswerCorrect: true
    };
    
    if (isPhrasalVerb) {
      // Phrasal verb envanterden phrasal verb tarlasına
      set(state => ({
        phrasalVerbInventory: state.phrasalVerbInventory.filter(w => w.id !== wordId),
        phrasalVerbFarm: [...state.phrasalVerbFarm, reviewWord]
      }));
    } else {
      // Normal kelime envanterden normal tarlaya
      set(state => ({
        inventory: state.inventory.filter(w => w.id !== wordId),
        farm: [...state.farm, reviewWord]
      }));
    }
  },
  
  checkAchievements: () => {
    const state = get();
    const newAchievements: string[] = [];
    
    // Achievement definitions with metadata
    const achievements = [
      { id: 'first_word', condition: () => state.farm.length >= 1, icon: '🌱', title: 'İlk Adım', description: 'İlk kelimeni çiftliğe ekle' },
      { id: 'word_collector_10', condition: () => state.farm.length >= 10, icon: '🎯', title: 'Koleksiyoncu', description: '10 kelime topla' },
      { id: 'word_collector_50', condition: () => state.farm.length >= 50, icon: '🏆', title: 'Kelime Avcısı', description: '50 kelime topla' },
      { id: 'streak_5', condition: () => state.bestStreak >= 5, icon: '🔥', title: 'Ateşli', description: '5 seri yap' },
      { id: 'streak_10', condition: () => state.bestStreak >= 10, icon: '⚡', title: 'Şimşek', description: '10 seri yap' },
      { id: 'streak_25', condition: () => state.bestStreak >= 25, icon: '💫', title: 'Yıldız', description: '25 seri yap' },
      { id: 'master_5', condition: () => state.inventory.length >= 5, icon: '⭐', title: 'Usta', description: '5 kelimeyi masterla' },
      { id: 'master_20', condition: () => state.inventory.length >= 20, icon: '🌟', title: 'Büyük Usta', description: '20 kelimeyi masterla' },
      { id: 'level_5', condition: () => state.level >= 5, icon: '🎖️', title: 'Tecrübeli', description: 'Level 5\'e ulaş' },
      { id: 'level_10', condition: () => state.level >= 10, icon: '👑', title: 'Kral', description: 'Level 10\'a ulaş' },
      { id: 'perfectionist', condition: () => state.totalQuizzes >= 20 && (state.totalCorrect / state.totalQuizzes) >= 0.9, icon: '💎', title: 'Mükemmeliyetçi', description: '20+ quizde %90+ başarı' }
    ];
    
    // Check each achievement from store against conditions
    const updated = state.achievements.map(ach => {
      if (ach.unlocked) return ach;
      
      let shouldUnlock = false;
      if (ach.id === 'first_correct' && state.totalCorrect >= 1) shouldUnlock = true;
      if (ach.id === 'first_wrong' && state.totalWrong >= 1) shouldUnlock = true;
      if (ach.id === 'wrong_10' && state.totalWrong >= 10) shouldUnlock = true;
      if (ach.id === 'combo_5' && state.bestStreak >= 5) shouldUnlock = true;
      if (ach.id === 'combo_10' && state.bestStreak >= 10) shouldUnlock = true;
      if (ach.id === 'level_5' && state.level >= 5) shouldUnlock = true;
      if (ach.id === 'harvest_10' && state.inventory.length >= 10) shouldUnlock = true;
      if (ach.id === 'speed_demon' && state.totalCorrect >= 5) shouldUnlock = true;
      
      // 📚 PHRASAL VERB ACHIEVEMENTS (subtract initial 15 free A1 verbs)
      const manuallyUnlocked = Math.max(0, state.unlockedPhrasalVerbs.length - 15);
      if (ach.id === 'pv_unlock_10' && manuallyUnlocked >= 10) shouldUnlock = true;
      if (ach.id === 'pv_unlock_50' && manuallyUnlocked >= 50) shouldUnlock = true;
      if (ach.id === 'pv_unlock_100' && manuallyUnlocked >= 100) shouldUnlock = true;
      if (ach.id === 'pv_unlock_all' && manuallyUnlocked >= 285) shouldUnlock = true;
      if (ach.id === 'pv_farm_10' && state.farm.filter(w => w.isPhrasalVerb).length >= 10) shouldUnlock = true;
      if (ach.id === 'pv_quiz_perfect' && state.phrasalVerbQuizStats.perfectQuizzes >= 1) shouldUnlock = true;
      if (ach.id === 'pv_combo_10' && state.phrasalVerbQuizStats.maxCombo >= 10) shouldUnlock = true;
      
      if (shouldUnlock) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('achievement-unlock', { 
            detail: { 
              id: ach.id, 
              icon: ach.icon,
              title: ach.title,
              description: ach.description
            } 
          }));
        }
        return { ...ach, unlocked: true };
      }
      return ach;
    });
    
    set({ achievements: updated });
  },

  claimAchievementReward: (achievementId: string) => {
    const state = get();
    const ach = state.achievements.find(a => a.id === achievementId);
    
    if (!ach || !ach.unlocked || ach.claimed) return;
    
    const updated = state.achievements.map(a => 
      a.id === achievementId ? { ...a, claimed: true } : a
    );
    
    set(state => ({
      achievements: updated,
      coins: state.coins + ach.reward.coins,
      xp: state.xp + ach.reward.xp
    }));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reward-claimed', {
        detail: { coins: ach.reward.coins, xp: ach.reward.xp }
      }));
    }
  },

  addCoins: (amount: number) => {
    set(state => ({ coins: state.coins + amount }));
  },

  purchaseItem: (itemId: string, price: number, type: 'boost' | 'consumable' | 'permanent', duration?: number) => {
    const state = get();
    if (state.coins < price) return false;
    
    set(s => ({ coins: s.coins - price }));
    
    if (type === 'boost' && duration) {
      const expiresAt = Date.now() + (duration * 60 * 1000);
      set(s => ({
        activeBoosts: [...s.activeBoosts, { id: itemId, expiresAt }]
      }));
    } else if (type === 'consumable') {
      if (itemId === 'hint_token') {
        set(s => ({ hintTokens: s.hintTokens + 1 }));
      } else if (itemId === 'extra_spin') {
        // Will be handled in DailyWheel component
      }
    } else if (type === 'permanent') {
      set(s => ({ ownedItems: [...s.ownedItems, itemId] }));
    }
    
    return true;
  },

  hasActiveBoost: (boostId: string) => {
    const now = Date.now();
    const state = get();
    return state.activeBoosts.some(b => b.id === boostId && b.expiresAt > now);
  },

  cleanExpiredBoosts: () => {
    const now = Date.now();
    set(s => ({
      activeBoosts: s.activeBoosts.filter(b => b.expiresAt > now)
    }));
  },

  useHintToken: () => {
    const state = get();
    if (state.hintTokens <= 0) return false;
    set(s => ({ hintTokens: s.hintTokens - 1 }));
    return true;
  },

  // 📚 PHRASAL VERBS FEATURES
  loadPhrasalVerbs: async () => {
    try {
      const response = await fetch('/assets/PHRASAL_VERBS_CLEAN.json');
      const data = await response.json();
      
      // A1 level: Only first 15 unlocked by default
      const a1Verbs = data.filter((pv: any) => pv.difficulty === 'A1');
      const a1Ids = a1Verbs.slice(0, 15).map((pv: any) => pv.id);
      
      set({ 
        phrasalVerbs: data,
        unlockedPhrasalVerbs: a1Ids
      });
    } catch (error) {
      console.error('Failed to load phrasal verbs:', error);
    }
  },

  unlockPhrasalVerb: (verbId: string, difficulty: string) => {
    const prices: Record<string, number> = {
      'A1': 50,
      'A2': 100,
      'B1': 200,
      'B2': 400,
      'C1': 800,
      'C2': 1500
    };
    
    const price = prices[difficulty] || 100;
    const state = get();
    
    if (state.coins < price) return false;
    if (state.unlockedPhrasalVerbs.includes(verbId)) return false;
    
    set(s => ({
      coins: s.coins - price,
      unlockedPhrasalVerbs: [...s.unlockedPhrasalVerbs, verbId]
    }));
    
    return true;
  },

  addPhrasalVerbToFarm: (phrasalVerbIdOrObj: string | any) => {
    const state = get();
    
    // Support both ID string and full object from quiz
    let phrasalVerb: any;
    let verbId: string;
    let wasCorrect: boolean | null;
    
    if (typeof phrasalVerbIdOrObj === 'string') {
      // Called with ID (from button click)
      verbId = phrasalVerbIdOrObj;
      phrasalVerb = state.phrasalVerbs.find((pv: any) => pv.id === verbId);
      wasCorrect = null;
    } else {
      // Called from quiz with full object
      phrasalVerb = phrasalVerbIdOrObj;
      verbId = phrasalVerb.id;
      wasCorrect = phrasalVerb.wasCorrect;
    }
    
    if (!phrasalVerb) return;
    if (typeof phrasalVerbIdOrObj === 'string' && !state.unlockedPhrasalVerbs.includes(verbId)) return;
    
    // Check if already in phrasal verb farm (use text to match across formats)
    const verbText = phrasalVerb.verb || phrasalVerb.text;
    if (state.phrasalVerbFarm.some(w => (w.text === verbText || w.verb === verbText))) return;
    if (state.phrasalVerbInventory.some(w => (w.text === verbText || w.verb === verbText))) return;
    
    // Add to separate phrasal verb farm
    // Renk sistemi: level 0 + wrongCount 0 = SARI, level 1 + wrongCount 0 = YEŞİL
    const pvModel: any = {
      id: `phrasal-${verbId}-${Date.now()}`,
      text: verbText,
      meaning: phrasalVerb.meaning,
      difficulty: phrasalVerb.difficulty,
      example: phrasalVerb.example,
      category: phrasalVerb.category,
      level: wasCorrect ? 1 : 0, // 1 = yeşil, 0 = sarı/kırmızı
      xp: 0,
      harvestCooldown: 0,
      correctCount: wasCorrect ? 1 : 0, // Doğruysa 1 başla
      wrongCount: wasCorrect === false ? 1 : 0, // Yanlışsa 1 wrong başla (kırmızı)
      harvestedCount: 0,
      consecutiveCorrect: 0,
      lastAnswerCorrect: wasCorrect,
      isPhrasalVerb: true,
      phrasalVerbId: verbId,
      plantedAt: Date.now(),
      totalHarvests: 0,
      masterLevel: 0
    };
    
    set(state => ({
      phrasalVerbFarm: [...state.phrasalVerbFarm, pvModel]
    }));
  },

  updatePhrasalVerbProgress: (verbId: string, correct: boolean) => {
    const state = get();
    const pvIndex = state.phrasalVerbs.findIndex(pv => pv.id === verbId);
    if (pvIndex === -1) return;

    const pv = state.phrasalVerbs[pvIndex];
    const currentCorrect = pv.correctCount || 0;
    const currentWrong = pv.wrongCount || 0;
    const currentMastery = pv.mastery || 0;

    // Calculate new mastery (0-100)
    let newMastery = currentMastery;
    if (correct) {
      // Increase mastery (faster at low levels, slower at high)
      const increase = Math.max(5, 20 - Math.floor(currentMastery / 5));
      newMastery = Math.min(100, currentMastery + increase);
    } else {
      // Decrease mastery (penalty for wrong answer)
      newMastery = Math.max(0, currentMastery - 10);
    }

    // Spaced repetition: calculate next review date
    const now = new Date();
    let intervalDays = 1; // Default: review tomorrow
    
    if (newMastery >= 90) intervalDays = 30; // Mastered: monthly review
    else if (newMastery >= 70) intervalDays = 14; // Good: bi-weekly
    else if (newMastery >= 50) intervalDays = 7; // OK: weekly
    else if (newMastery >= 30) intervalDays = 3; // Poor: 3 days
    else intervalDays = 1; // Very poor: daily

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + intervalDays);

    // Update phrasal verb in the array
    const updatedPhrasalVerbs = [...state.phrasalVerbs];
    updatedPhrasalVerbs[pvIndex] = {
      ...pv,
      mastery: newMastery,
      correctCount: correct ? currentCorrect + 1 : currentCorrect,
      wrongCount: correct ? currentWrong : currentWrong + 1,
      lastReviewed: now.toISOString(),
      nextReview: nextReview.toISOString(),
      reviewInterval: intervalDays
    };

    set({ phrasalVerbs: updatedPhrasalVerbs });
  },

  toggleSfx: () => {
    set(state => {
      const next = !state.sfxEnabled;
      sound.setEnabled(next);
      return { sfxEnabled: next };
    });
  },

  setSfx: (enabled: boolean) => {
    sound.setEnabled(enabled);
    set({ sfxEnabled: enabled });
  },

  toggleFavorite: (wordId: string) => {
    set(state => ({
      farm: state.farm.map(w => w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w),
      inventory: state.inventory.map(w => w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w),
      phrasalVerbFarm: state.phrasalVerbFarm.map(w => w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w)
    }));
  }
}));
