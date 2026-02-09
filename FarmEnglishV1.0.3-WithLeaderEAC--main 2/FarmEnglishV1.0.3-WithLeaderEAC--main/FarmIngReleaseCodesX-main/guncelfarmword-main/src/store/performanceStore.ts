import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

/**
 * 🎮 PERFORMANS SEVİYELERİ
 * 
 * LOW     - En düşük grafik, maksimum akıcılık (eski/zayıf cihazlar)
 * MEDIUM  - Animasyonlar ve particle'lar azaltılmış ama görünür (performanslı)
 * HIGH    - Orta seviye telefonlar için ideal denge
 * ULTRA   - Tam grafik özellikleri, optimize hesaplamalar
 * PERFECT - Kusursuz grafik, tüm efektler maksimum (güçlü cihazlar)
 */
export type PerformanceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'PERFECT';

export interface PerformanceConfig {
  // 🎊 Particle/Confetti ayarları
  particleCount: number;          // Temel particle sayısı çarpanı
  confettiCount: number;          // Confetti sayısı çarpanı
  maxParticles: number;           // Maksimum particle sayısı
  
  // 🎬 Animasyon ayarları
  animationDuration: number;      // Animasyon süresi çarpanı (1 = normal)
  enableShimmer: boolean;         // Shimmer efektleri
  enableGlow: boolean;            // Glow efektleri
  enableFloatingParticles: boolean; // Floating particle'lar (kartlarda)
  enablePulseAnimations: boolean; // Pulse/breathing animasyonları
  
  // 🌟 Görsel efektler
  enableBlur: boolean;            // BlurView kullanımı
  blurIntensity: number;          // Blur yoğunluğu
  enableShadows: boolean;         // Gölgeler
  shadowQuality: 'low' | 'medium' | 'high'; // Gölge kalitesi
  
  // 🎉 Kutlama efektleri
  celebrationIntensity: number;   // Kutlama yoğunluğu çarpanı
  enableScreenFlash: boolean;     // Ekran flash efekti
  enableScreenShake: boolean;     // Ekran shake efekti
  
  // 📊 UI Genel
  enableToastAnimations: boolean; // Toast animasyonları
  reduceMotion: boolean;          // Hareket azaltma
  
  // 🔥 COMBO & TOAST AYARLARI
  enableComboToast: boolean;         // Combo toast göster
  comboToastThreshold: number;       // Kaç combo'dan sonra toast göster (2, 5, 10...)
  enableMilestoneToast: boolean;     // Milestone toast göster (10, 20, 30...)
  enableRewardToast: boolean;        // Ödül toast göster
  
  // 🎯 BUTON & UI ANİMASYONLARI
  enableJuicyButtons: boolean;       // Buton press/release animasyonları
  enableButtonScale: boolean;        // Buton scale animasyonları
  enableOptionGlow: boolean;         // Quiz option glow efekti
  enableStarEffects: boolean;        // Yıldız/sparkle efektleri
  enableCardEntryAnimation: boolean; // Kart giriş animasyonları
  enableSuccessAnimation: boolean;   // Başarı animasyonları (checkmark vs)
  
  // 🌊 GEÇİŞ ANİMASYONLARI
  enableTransitionAnimations: boolean; // Sayfa geçiş animasyonları
  enableListAnimations: boolean;       // Liste item animasyonları
  enableModalAnimations: boolean;      // Modal açılış/kapanış
  
  // 💧🐛 KART FEEDBACK ANİMASYONLARI (Yeni)
  enableCardFeedbackAnimations: boolean;  // "Büyüyor!", "Böceklendi!", "Korundu!" animasyonları
  cardFeedbackDropCount: number;          // Su damlası/böcek sayısı (0-6)
  cardFeedbackDuration: number;           // Animasyon süresi (ms)
  enableCardFeedbackText: boolean;        // Metin göster ("BÜYÜYOR!" vs)
  
  // 🎯 MINIQUIZ FEEDBACK ANİMASYONLARI (Yeni)
  enableQuizFeedbackAnimations: boolean;  // MiniQuiz içi feedback animasyonları
  enableQuizProgressAnimation: boolean;   // Progress bar animasyonu
  enableQuizComboAnimation: boolean;      // Combo gösterimi animasyonu
}

// 🎯 Her seviye için preset değerler
export const PERFORMANCE_PRESETS: Record<PerformanceLevel, PerformanceConfig> = {
  LOW: {
    // En düşük - maksimum performans, TÜM ANİMASYONLAR KAPALI
    particleCount: 0,
    confettiCount: 0,
    maxParticles: 0,
    animationDuration: 0, // SIFIR - animasyon yok
    enableShimmer: false,
    enableGlow: false,
    enableFloatingParticles: false,
    enablePulseAnimations: false,
    enableBlur: false,
    blurIntensity: 0,
    enableShadows: false,
    shadowQuality: 'low',
    celebrationIntensity: 0,
    enableScreenFlash: false,
    enableScreenShake: false,
    enableToastAnimations: false,
    reduceMotion: true,
    // Combo & Toast - TÜM KAPALI
    enableComboToast: false,
    comboToastThreshold: 999999, // Asla gösterme
    enableMilestoneToast: false,
    enableRewardToast: false,
    // Buton & UI
    enableJuicyButtons: false,
    enableButtonScale: false,
    enableOptionGlow: false,
    enableStarEffects: false,
    enableCardEntryAnimation: false,
    enableSuccessAnimation: false,
    // Geçişler
    enableTransitionAnimations: false,
    enableListAnimations: false,
    enableModalAnimations: false,
    // 💧🐛 Kart Feedback - LOW'da tamamen kapalı
    enableCardFeedbackAnimations: false,
    cardFeedbackDropCount: 0,
    cardFeedbackDuration: 0,
    enableCardFeedbackText: false,
    // 🎯 MiniQuiz Feedback - LOW'da minimal
    enableQuizFeedbackAnimations: false,
    enableQuizProgressAnimation: false,
    enableQuizComboAnimation: false,
  },
  MEDIUM: {
    // Dengeli - temel animasyonlar, combo toast sadece milestone'larda
    particleCount: 0.3,
    confettiCount: 0.3,
    maxParticles: 5,
    animationDuration: 0.7,
    enableShimmer: false,
    enableGlow: true,
    enableFloatingParticles: false,
    enablePulseAnimations: true,
    enableBlur: true,
    blurIntensity: 10,
    enableShadows: true,
    shadowQuality: 'low',
    celebrationIntensity: 0.3,
    enableScreenFlash: true,
    enableScreenShake: false,
    enableToastAnimations: true,
    reduceMotion: false,
    // Combo & Toast - sadece büyük milestone'lar
    enableComboToast: true,
    comboToastThreshold: 10, // 10, 20, 30... gibi milestone'larda
    enableMilestoneToast: true,
    enableRewardToast: true,
    // Buton & UI - temel animasyonlar
    enableJuicyButtons: false,
    enableButtonScale: true,
    enableOptionGlow: false,
    enableStarEffects: false,
    enableCardEntryAnimation: true,
    enableSuccessAnimation: true,
    // Geçişler
    enableTransitionAnimations: true,
    enableListAnimations: false,
    enableModalAnimations: true,
    // 💧🐛 Kart Feedback - MEDIUM'da sadece metin, damla/böcek yok
    enableCardFeedbackAnimations: true,
    cardFeedbackDropCount: 0,
    cardFeedbackDuration: 800,
    enableCardFeedbackText: true,
    // 🎯 MiniQuiz Feedback - MEDIUM'da temel
    enableQuizFeedbackAnimations: true,
    enableQuizProgressAnimation: true,
    enableQuizComboAnimation: false,
  },
  HIGH: {
    // Orta seviye telefonlar için ideal denge
    particleCount: 0.6,
    confettiCount: 0.5,
    maxParticles: 12,
    animationDuration: 0.85,
    enableShimmer: true,
    enableGlow: true,
    enableFloatingParticles: true,
    enablePulseAnimations: true,
    enableBlur: true,
    blurIntensity: 15,
    enableShadows: true,
    shadowQuality: 'medium',
    celebrationIntensity: 0.6,
    enableScreenFlash: true,
    enableScreenShake: true,
    enableToastAnimations: true,
    reduceMotion: false,
    // Combo & Toast - 5'in katlarında
    enableComboToast: true,
    comboToastThreshold: 5,
    enableMilestoneToast: true,
    enableRewardToast: true,
    // Buton & UI
    enableJuicyButtons: true,
    enableButtonScale: true,
    enableOptionGlow: true,
    enableStarEffects: true,
    enableCardEntryAnimation: true,
    enableSuccessAnimation: true,
    // Geçişler
    enableTransitionAnimations: true,
    enableListAnimations: true,
    enableModalAnimations: true,
    // 💧🐛 Kart Feedback - HIGH'da az damla/böcek
    enableCardFeedbackAnimations: true,
    cardFeedbackDropCount: 2,
    cardFeedbackDuration: 1000,
    enableCardFeedbackText: true,
    // 🎯 MiniQuiz Feedback - HIGH'da tam
    enableQuizFeedbackAnimations: true,
    enableQuizProgressAnimation: true,
    enableQuizComboAnimation: true,
  },
  ULTRA: {
    // Tam grafik, optimize hesaplamalar
    particleCount: 0.85,
    confettiCount: 0.75,
    maxParticles: 20,
    animationDuration: 1,
    enableShimmer: true,
    enableGlow: true,
    enableFloatingParticles: true,
    enablePulseAnimations: true,
    enableBlur: true,
    blurIntensity: 20,
    enableShadows: true,
    shadowQuality: 'high',
    celebrationIntensity: 0.85,
    enableScreenFlash: true,
    enableScreenShake: true,
    enableToastAnimations: true,
    reduceMotion: false,
    // Combo & Toast - her 2 combo'da
    enableComboToast: true,
    comboToastThreshold: 2,
    enableMilestoneToast: true,
    enableRewardToast: true,
    // Buton & UI - tamamı açık
    enableJuicyButtons: true,
    enableButtonScale: true,
    enableOptionGlow: true,
    enableStarEffects: true,
    enableCardEntryAnimation: true,
    enableSuccessAnimation: true,
    // Geçişler
    enableTransitionAnimations: true,
    enableListAnimations: true,
    enableModalAnimations: true,
    // 💧🐛 Kart Feedback - ULTRA'da normal damla/böcek
    enableCardFeedbackAnimations: true,
    cardFeedbackDropCount: 4,
    cardFeedbackDuration: 1200,
    enableCardFeedbackText: true,
    // 🎯 MiniQuiz Feedback - ULTRA'da tam
    enableQuizFeedbackAnimations: true,
    enableQuizProgressAnimation: true,
    enableQuizComboAnimation: true,
  },
  PERFECT: {
    // Kusursuz grafik - tüm efektler maksimum
    particleCount: 1,
    confettiCount: 1,
    maxParticles: 40,
    animationDuration: 1,
    enableShimmer: true,
    enableGlow: true,
    enableFloatingParticles: true,
    enablePulseAnimations: true,
    enableBlur: true,
    blurIntensity: 25,
    enableShadows: true,
    shadowQuality: 'high',
    celebrationIntensity: 1,
    enableScreenFlash: true,
    enableScreenShake: true,
    enableToastAnimations: true,
    reduceMotion: false,
    // Combo & Toast - HER combo'da göster
    enableComboToast: true,
    comboToastThreshold: 2, // 2+ combo'da her zaman
    enableMilestoneToast: true,
    enableRewardToast: true,
    // Buton & UI - FULL
    enableJuicyButtons: true,
    enableButtonScale: true,
    enableOptionGlow: true,
    enableStarEffects: true,
    enableCardEntryAnimation: true,
    enableSuccessAnimation: true,
    // Geçişler - FULL
    enableTransitionAnimations: true,
    enableListAnimations: true,
    enableModalAnimations: true,
    // 💧🐛 Kart Feedback - PERFECT'te maksimum damla/böcek
    enableCardFeedbackAnimations: true,
    cardFeedbackDropCount: 6,
    cardFeedbackDuration: 1500,
    enableCardFeedbackText: true,
    // 🎯 MiniQuiz Feedback - PERFECT'te tam
    enableQuizFeedbackAnimations: true,
    enableQuizProgressAnimation: true,
    enableQuizComboAnimation: true,
  },
};

// 🏷️ Seviye etiketleri (Türkçe)
export const PERFORMANCE_LABELS: Record<PerformanceLevel, { name: string; description: string; emoji: string }> = {
  LOW: {
    name: 'Düşük',
    description: 'Maksimum akıcılık, minimum efekt',
    emoji: '🐢',
  },
  MEDIUM: {
    name: 'Orta',
    description: 'Dengeli animasyonlar',
    emoji: '⚡',
  },
  HIGH: {
    name: 'Yüksek',
    description: 'Zengin görsel deneyim',
    emoji: '🔥',
  },
  ULTRA: {
    name: 'Ultra',
    description: 'Neredeyse tam grafik',
    emoji: '💎',
  },
  PERFECT: {
    name: 'Mükemmel',
    description: 'Kusursuz grafik kalitesi',
    emoji: '👑',
  },
};

interface PerformanceStore {
  // State
  level: PerformanceLevel;
  config: PerformanceConfig;
  isHydrated: boolean; // Store yüklendi mi?
  userManuallySet: boolean; // Kullanıcı manuel olarak ayarladı mı?
  
  // Actions
  setLevel: (level: PerformanceLevel, isManual?: boolean) => void;
  getConfig: () => PerformanceConfig;
  setHydrated: (value: boolean) => void;
  
  // Helpers
  getParticleCount: (baseCount: number) => number;
  getConfettiCount: (baseCount: number) => number;
  getAnimationDuration: (baseDuration: number) => number;
  shouldShowEffect: (effect: keyof PerformanceConfig) => boolean;
}

export const usePerformanceStore = create<PerformanceStore>()(
  persist(
    (set, get) => ({
      // Varsayılan: HIGH (çoğu telefon için ideal)
      level: 'HIGH',
      config: PERFORMANCE_PRESETS.HIGH,
      isHydrated: false,
      userManuallySet: false, // Kullanıcı henüz manuel değiştirmedi
      
      setLevel: (level: PerformanceLevel, isManual: boolean = false) => {
        set({
          level,
          config: PERFORMANCE_PRESETS[level],
          // Eğer manuel değişiklik ise flag'i true yap
          ...(isManual ? { userManuallySet: true } : {}),
        });
      },
      
      setHydrated: (value: boolean) => {
        set({ isHydrated: value });
      },
      
      getConfig: () => {
        return get().config;
      },
      
      // 🎊 Particle sayısı hesapla
      getParticleCount: (baseCount: number) => {
        const { config } = get();
        const count = Math.round(baseCount * config.particleCount);
        return Math.min(count, config.maxParticles);
      },
      
      // 🎉 Confetti sayısı hesapla
      getConfettiCount: (baseCount: number) => {
        const { config } = get();
        const count = Math.round(baseCount * config.confettiCount);
        return Math.min(count, config.maxParticles);
      },
      
      // 🎬 Animasyon süresi hesapla
      getAnimationDuration: (baseDuration: number) => {
        const { config } = get();
        return baseDuration * config.animationDuration;
      },
      
      // 🌟 Efekt gösterilmeli mi?
      shouldShowEffect: (effect: keyof PerformanceConfig) => {
        const { config } = get();
        const value = config[effect];
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value > 0;
        return true;
      },
    }),
    {
      name: 'performance-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        level: state.level,
        config: state.config,
      }),
      onRehydrateStorage: () => (state) => {
        // Store yüklendiğinde hydrated flag'i set et
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

// 🎯 Hook: Performans seviyesine göre particle sayısı
export const useParticleCount = (baseCount: number): number => {
  const { config } = usePerformanceStore();
  const count = Math.round(baseCount * config.particleCount);
  return Math.min(count, config.maxParticles);
};

// 🎉 Hook: Performans seviyesine göre confetti sayısı
export const useConfettiCount = (baseCount: number): number => {
  const { config } = usePerformanceStore();
  const count = Math.round(baseCount * config.confettiCount);
  return Math.min(count, config.maxParticles);
};

// 🌟 Hook: Efekt gösterilmeli mi?
export const useShouldShowEffect = (effect: keyof PerformanceConfig): boolean => {
  const { config } = usePerformanceStore();
  const value = config[effect];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return true;
};

/**
 * 📱 CİHAZ TABANLI OTOMATİK PERFORMANS SEVİYESİ
 * 
 * Apple Store / Google Play onayı için sorun olmaz çünkü:
 * - Platform.constants sadece temel cihaz bilgisini içerir
 * - Kişisel veri toplamaz, sadece model adı kullanılır
 * - expo-device gibi ek paket gerektirmez
 * 
 * iOS: Versiyon tabanlı tespit (Expo Go'da model ID unknown geliyor)
 * Android: Brand + Model tabanlı tespit
 */

// 🤖 Android performans mapping - Güvenli yaklaşım
// Android çok parçalı olduğu için varsayılan MEDIUM, sadece bilinen flagship'ler yükseltilir
const getAndroidPerformanceLevel = (): PerformanceLevel => {
  try {
    // Android'de model adını al - type-safe
    const constants = Platform.constants as Record<string, any>;
    const model = (constants?.Model || '').toLowerCase();
    const brand = (constants?.Brand || '').toLowerCase();
    
    // 🏆 PERFECT - Sadece 2023-2026 flagship'ler
    // Samsung
    if (brand === 'samsung') {
      if (model.includes('s24') || model.includes('s23')) return 'PERFECT';
      if (model.includes('z fold') || model.includes('z flip')) return 'PERFECT'; // Foldable'lar
      if (model.includes('s22') || model.includes('s21')) return 'ULTRA';
      if (model.includes('s20') || model.includes('note20')) return 'HIGH';
      if (model.includes('note10') || model.includes('s10')) return 'HIGH';
      // A serisi - dikkatli ol, çoğu orta segment
      if (model.includes('a54') || model.includes('a55')) return 'HIGH';
      if (model.includes('a53') || model.includes('a52')) return 'MEDIUM';
      // A70, A50, A30 vb. eski A serisi = LOW-MEDIUM arası
      if (model.includes('a7') || model.includes('a5') || model.includes('a3')) return 'LOW';
      // Diğer Samsung = MEDIUM (güvenli)
      return 'MEDIUM';
    }
    
    // Google Pixel
    if (brand === 'google') {
      if (model.includes('pixel 8') || model.includes('pixel 9')) return 'PERFECT';
      if (model.includes('pixel 7')) return 'ULTRA';
      if (model.includes('pixel 6')) return 'HIGH';
      return 'MEDIUM'; // Eski Pixel'ler
    }
    
    // OnePlus - genelde iyi optimize
    if (brand === 'oneplus') {
      if (model.includes('12') || model.includes('11') || model.includes('10')) return 'PERFECT';
      if (model.includes('9') || model.includes('8')) return 'ULTRA';
      if (model.includes('7') || model.includes('6')) return 'HIGH';
      return 'MEDIUM';
    }
    
    // Xiaomi / Redmi / POCO - çok geniş yelpaze, dikkatli ol
    if (brand === 'xiaomi' || brand === 'redmi' || brand === 'poco') {
      // Sadece kesin flagship'ler
      if (model.includes('14 ultra') || model.includes('13 ultra')) return 'PERFECT';
      if (model.includes('14 pro') || model.includes('13 pro')) return 'PERFECT';
      if (model.includes('12 pro') || model.includes('11 ultra')) return 'ULTRA';
      // POCO F serisi flagship killer
      if (model.includes('poco f5') || model.includes('poco f4')) return 'ULTRA';
      if (model.includes('poco f3')) return 'HIGH';
      // Redmi Note - orta segment
      if (model.includes('note 13') || model.includes('note 12')) return 'MEDIUM';
      if (model.includes('note')) return 'MEDIUM';
      // Diğer Xiaomi = MEDIUM (güvenli)
      return 'MEDIUM';
    }
    
    // Huawei
    if (brand === 'huawei') {
      if (model.includes('p60') || model.includes('mate 50')) return 'ULTRA';
      if (model.includes('p50') || model.includes('p40')) return 'HIGH';
      return 'MEDIUM';
    }
    
    // Oppo / Realme / Vivo - genelde orta segment ağırlıklı
    if (brand === 'oppo' || brand === 'realme' || brand === 'vivo') {
      if (model.includes('find x') || model.includes('gt')) return 'ULTRA';
      return 'MEDIUM';
    }
    
    // 🔒 Bilinmeyen Android - varsayılan MEDIUM (güvenli)
    // Bu sayede A70 gibi bilinmeyen cihazlar kasma yaşamaz
    return 'MEDIUM';
  } catch {
    return 'MEDIUM'; // Hata durumunda güvenli default
  }
};

// 📱 iOS performans seviyesini belirle
const getIOSPerformanceLevel = (): PerformanceLevel => {
  try {
    // iOS versiyonunu al
    const iosVersion = parseFloat(Platform.Version?.toString() || '0');
    
    /**
     * iOS Versiyon → Cihaz Eşleştirmesi
     * 
     * iOS 18+ → iPhone XS/XR ve üzeri → PERFECT
     * iOS 17  → iPhone XS/XR ve üzeri → PERFECT  
     * iOS 16  → iPhone 8, X ve üzeri → MEDIUM (8 eski, X orta)
     * iOS 15  → iPhone 6s, 7, SE(1) → LOW (iOS 16 alamadılar!)
     * iOS 14 ve altı → Çok eski → LOW
     */
    
    if (iosVersion >= 18) {
      // iOS 18+ = iPhone XS/XR ve üzeri = Güçlü cihazlar
      return 'PERFECT';
    }
    
    if (iosVersion >= 17) {
      // iOS 17 = iPhone XS/XR ve üzeri = Güçlü cihazlar
      return 'PERFECT';
    }
    
    if (iosVersion >= 16) {
      // iOS 16 = iPhone 8, X ve üzeri
      // iPhone 8 = eski, X = orta → MEDIUM güvenli
      return 'MEDIUM';
    }
    
    if (iosVersion >= 15) {
      // iOS 15 = iPhone 6s, 7, SE(1) - iOS 16 alamadılar!
      // Bu cihazlar eski → LOW
      return 'LOW';
    }
    
    // iOS 14 ve altı = Çok eski cihaz
    return 'LOW';
  } catch {
    return 'MEDIUM'; // Hata durumunda güvenli default
  }
};

/**
 * 🎯 Cihaza göre optimal performans seviyesini tespit et
 * İlk açılışta çağrılır ve sonucu cache'ler
 */
export const detectOptimalPerformanceLevel = (): PerformanceLevel => {
  if (Platform.OS === 'ios') {
    return getIOSPerformanceLevel();
  } else if (Platform.OS === 'android') {
    return getAndroidPerformanceLevel();
  }
  return 'HIGH'; // Web veya diğer platformlar
};

/**
 * 🚀 Uygulama açılışında otomatik performans kalibrasyonu
 * HER AÇILIŞTA çalışır ve cihaza göre ayar yapar
 */
export const initAutoPerformance = async (): Promise<PerformanceLevel> => {
  try {
    // Otomatik tespit
    const detectedLevel = detectOptimalPerformanceLevel();
    
    // Kullanıcı manuel ayarladıysa, onun tercihini koru
    const currentState = usePerformanceStore.getState();
    const currentLevel = currentState.level;
    const userManuallySet = currentState.userManuallySet;
    
    if (userManuallySet) {
      return currentLevel;
    }
    
    // Otomatik kalibrasyon (manuel değil)
    usePerformanceStore.getState().setLevel(detectedLevel, false);
    
    return detectedLevel;
  } catch (error) {
    // Hata durumunda MEDIUM ayarla (güvenli)
    usePerformanceStore.getState().setLevel('MEDIUM');
    return 'MEDIUM';
  }
};
