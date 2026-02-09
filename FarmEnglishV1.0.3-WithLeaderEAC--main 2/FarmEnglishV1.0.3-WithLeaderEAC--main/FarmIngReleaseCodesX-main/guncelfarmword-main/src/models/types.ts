export interface WordModel {
  id: string;
  text: string;
  verb?: string;
  meaning: string;
  example?: string;
  example_tr?: string; // 🇹🇷 Türkçe örnek cümle çevirisi
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  type: string;
  level: number; // Growth level (0-2 for farm words)
  correctCount: number;
  wrongCount: number; // 🎨 Renk seviyesi: 0=kırmızı, 1=turuncu, 2=sarı, 3=yeşil
  consecutiveCorrect: number;
  lastAnswerCorrect?: boolean;
  harvestedCount: number; // How many times harvested from farm (used for green->inventory transition)
  totalHarvests: number; // Total harvests across all time (used for master tiers)
  masterLevel: number; // 0=normal, 1=master(3), 2=perfect master(8), 3=ultra perfect master(16)
  consecutiveMasterSessions?: number; // Consecutive successful mini-quiz sessions (3/3 or 5/5) for master progression
  isFavorite?: boolean;
  favoriteAddedAt?: number; // ⭐ Favoriye eklenme zamanı (LIFO sıralama için)
  lastReviewed?: number; // timestamp
  isPhrasalVerb?: boolean;
  plantedFromInventory?: boolean; // 📌 Envanterden tarlaya dikildi mi - sıralamada öncelik için
  lastPlantedAt?: number; // 📌 Son dikilme zamanı (timestamp)
  phrasalVerbId?: string;
  category?: string;
  // 📊 Quiz İstatistikleri - Gerçek doğru/yanlış sayaçları
  quizCorrect?: number; // Toplam doğru cevap sayısı
  quizWrong?: number; // Toplam yanlış cevap sayısı
  
  // 🍎 MEYVE SİSTEMİ - Master kartlar için görsel progresyon
  fruitType?: 'banana' | 'cherry' | 'strawberry' | 'grape' | 'apple' | 'watermelon';
  fruitGrowthStage?: number; // 0-3: Meyve büyüme aşaması (her session sonunda artar)
  isHarvestReady?: boolean; // Hasat butonu görünecek mi?
  rewardClaimedPerfect?: boolean; // Perfect tier ödülü alındı mı? (sadece 1 kez) - Kelime/Phrasal
  puzzleRewardClaimedPerfect?: boolean; // 🧩 Yapboz Perfect tier ödülü alındı mı? (sadece 1 kez)
  originalWordId?: string; // 🔗 Orijinal kelimeye referans - Tekrar Ek için!
  harvestedAt?: number; // 📅 Hasat zamanı - sıralama için
  normalHarvested?: boolean; // 🌾 Hasat edildi mi - tarlada görünmez ama kalır
  isCustom?: boolean; // 🌱 Kullanıcının kendi oluşturduğu kelime kartı
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  reward: { coins: number; xp: number };
  claimed: boolean;
  unlocked: boolean;
}

// 🎯 GÜNLÜK GÖREV SİSTEMİ
export type QuestType = 
  | 'PLANT_WORDS'          // X kelime ek
  | 'HARVEST_WORDS'        // X kelime hasat et
  | 'HARVEST_PHRASAL'      // X phrasal verb hasat et
  | 'COMPLETE_PUZZLE'      // X yapboz tamamla
  | 'SPEECH_PRACTICE'      // X cümle pratiği yap
  | 'COMPLETE_QUIZ'        // X quiz tamamla
  | 'WIN_BATTLE'           // X battle kazan
  | 'REACH_COMBO'          // X combo yap
  | 'EARN_COINS'           // X coin kazan
  | 'MATCH_WORDS'          // X kelime eşleştir (Pratik Merkezi)
  | 'FILL_BLANK'           // X boşluk doldur (Pratik Merkezi)
  | 'LEARN_COLLOCATIONS'   // X tamlama öğren (Pratik Merkezi)
  | 'LEARN_IDIOMS'         // X deyim öğren (Pratik Merkezi)
  | 'YDS_QUIZ';            // X YDS sorusu çöz (Pratik Merkezi)

// 🎯 BASE QUEST - Tüm questlerin ortak özellikleri
export interface BaseQuest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  reward: {
    trophy: number;
    coins: number;
    xp: number;
    badge?: string;
  };
  completed: boolean;
  claimed: boolean;
  screen?: string;
  hint?: string;
}

// 🌅 DAILY QUEST - Günlük görevler
export interface DailyQuest extends BaseQuest {
  date: string; // YYYY-MM-DD
}

// 📅 WEEKLY QUEST - Haftalık görevler  
export interface WeeklyQuest extends BaseQuest {
  weekType: number; // 0-3 (4 farklı hafta tipi)
  weekStartDate: string; // YYYY-MM-DD
}

// 🔄 REPEATABLE QUEST - Tekrarlanabilir görevler
export interface RepeatableQuest extends BaseQuest {
  category: 'fast' | 'medium' | 'long';
  completionCount: number; // Kaç kez tamamlandı
  lastCompletedAt?: number; // Son tamamlanma zamanı
}

// 📖 STORY QUEST - Hikaye görevleri (Oyunu öğretir)
export interface StoryQuest extends BaseQuest {
  chapter: number; // 1-5 (5 bölüm)
  order: number; // Bölüm içi sıra
  unlockRequirement?: string; // Önceki quest id
  tutorialText?: string; // Öğretici metin
  isUnlocked: boolean;
}

// 🏆 ACHIEVEMENT QUEST - Başarım görevleri (Lifetime)
export interface AchievementQuest extends BaseQuest {
  category: 'vocabulary' | 'harvest' | 'battle' | 'speaking' | 'puzzle' | 'phrasal' | 'combo' | 'coins' | 'quiz' | 'speech' | 'plant';
  tier: number; // 1-6 (6 seviye)
  nextTierId?: string; // Sonraki tier'ın id'si
}

// ⭐ MASTERY PATH - Ustalık yolları
export interface MasteryPath {
  id: string;
  name: string;
  icon: string;
  description: string;
  currentLevel: number; // 0-25
  maxLevel: number; // 25
  totalProgress: number; // Toplam ilerleme
  levels: MasteryLevel[];
  badge?: string; // Level 25'te kazanılan badge
}

export interface MasteryLevel {
  level: number;
  target: number;
  reward: {
    trophy: number;
    coins: number;
    xp: number;
  };
  unlocked: boolean;
  claimed: boolean;
}

// 🎉 SPECIAL EVENT - Özel etkinlikler
export interface SpecialEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'weekend' | 'holiday' | 'monthly';
  startDate: string;
  endDate: string;
  quests: BaseQuest[];
  bonusMultiplier?: number; // Bonus çarpanı (1.5x, 2x vs)
  isActive: boolean;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  type: 'boost' | 'consumable' | 'permanent';
  duration?: number; // minutes for boosts
}

export interface ActiveBoost {
  id: string;
  expiresAt: number; // timestamp
}

export interface PhrasalVerb {
  id: string;
  verb: string;
  meaning: string;
  example: string;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category?: string;
  mastery?: number;
  correctCount?: number;
  wrongCount?: number;
  nextReview?: string;
  lastReviewed?: string;
  reviewInterval?: number;
  isFavorite?: boolean;
}
