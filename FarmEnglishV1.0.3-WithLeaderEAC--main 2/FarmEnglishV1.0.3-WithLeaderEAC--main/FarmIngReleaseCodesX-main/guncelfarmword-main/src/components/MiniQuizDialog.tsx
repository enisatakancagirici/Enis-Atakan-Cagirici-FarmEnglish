import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  InteractionManager,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { X } from 'lucide-react-native';
import { WordModel } from '../models/types';
import { haptic, sound } from '../utils/sound';
import { getFirstMeaning } from '../utils/loadWords';
import { formatMeaningForQuiz } from '../utils/loadWords';
import { CorrectCelebration } from './Confetti';
import { useFarmStore } from '../store/farmStore';
import { ExampleSentence } from './ExampleSentence';
import { MASCOT_IMAGE } from '../utils/assetPreloader';
import { COLOR_TRANSITION_MESSAGES } from './TutorialManagerFixed';
import { usePerformanceStore } from '../store/performanceStore';
import { CardFeedbackAnimation } from './CardFeedbackAnimation';
import {
  BORDER_STYLES,
  DEFAULT_CUSTOMIZATION,
  getThemeOverlay,
  type CardFontStyle,
} from '../data/cardThemes';

// 📚 PHRASAL VERB HAVUZU - Quiz şıkları için SABİT kaynak
const PHRASAL_VERBS_POOL = require('../../assets/data/PHARASAL_VERBS_EXAMPLE.json');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 📱 Notch/Dynamic Island için güvenli alan - iOS için 50px, Android için StatusBar yüksekliği
const NOTCH_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);

// 💰 SORU BAŞINA ÖDÜL SİSTEMİ
// Her kategori için TOPLAM session ödülü ve soru sayısına göre bölünmüş değerler
type CategoryType = 'red' | 'orange' | 'yellow' | 'green' | 'master' | 'ultra' | 'perfect';

const REWARD_BY_CATEGORY: Record<CategoryType, { totalCoin: number; totalXp: number; questionsNeeded: number }> = {
  red: { totalCoin: 15, totalXp: 15, questionsNeeded: 5 },       // Per Q: 3 coin, 3 xp
  orange: { totalCoin: 20, totalXp: 20, questionsNeeded: 5 },    // Per Q: 4 coin, 4 xp
  yellow: { totalCoin: 25, totalXp: 25, questionsNeeded: 5 },    // Per Q: 5 coin, 5 xp
  green: { totalCoin: 30, totalXp: 30, questionsNeeded: 3 },     // Per Q: 10 coin, 10 xp
  master: { totalCoin: 35, totalXp: 35, questionsNeeded: 3 },    // Per Q: ~12 coin, ~12 xp
  ultra: { totalCoin: 40, totalXp: 40, questionsNeeded: 3 },     // Per Q: ~13 coin, ~13 xp
  perfect: { totalCoin: 50, totalXp: 50, questionsNeeded: 3 },   // Per Q: ~17 coin, ~17 xp
};

// 🎓 CEFR SEVİYESİNE GÖRE ÇARPAN - Zor kelimeler daha çok ödül verir
type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
const CEFR_MULTIPLIER: Record<CEFRLevel, number> = {
  'A1': 1.0,    // Temel kelimeler - normal ödül
  'A2': 1.2,    // Biraz zor - %20 bonus
  'B1': 1.5,    // Orta seviye - %50 bonus
  'B2': 1.8,    // İleri seviye - %80 bonus
  'C1': 2.2,    // Zor kelimeler - %120 bonus
  'C2': 2.5,    // En zor - %150 bonus
};

// 💰 Soru başına ödül hesapla (CEFR çarpanı ile)
const getPerQuestionReward = (category: CategoryType, cefrLevel?: string): { coin: number; xp: number } => {
  const reward = REWARD_BY_CATEGORY[category];
  const baseCoin = Math.round(reward.totalCoin / reward.questionsNeeded);
  const baseXp = Math.round(reward.totalXp / reward.questionsNeeded);
  
  // CEFR çarpanı uygula (varsa)
  const multiplier = cefrLevel ? (CEFR_MULTIPLIER[cefrLevel as CEFRLevel] || 1.0) : 1.0;
  
  return { 
    coin: Math.round(baseCoin * multiplier), 
    xp: Math.round(baseXp * multiplier) 
  };
};

//  KATEGORİ RENKLERİ - Toast ve UI'da kullanılıyor
const CATEGORY_COLORS: Record<CategoryType, {
  bg: readonly [string, string, string];
  border: string;
  badge: string;
  badgeBg: string;
  text: string;
  label: string;
  emoji: string;
  glow: string;
  comboGradient: readonly [string, string];
}> = {
  red: {
    bg: ['#7f1d1d', '#991b1b', '#7f1d1d'] as const,
    border: '#ef4444',
    badge: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.3)',
    text: '#fecaca',
    label: 'KIRMIZI',
    emoji: '🔴',
    glow: '#ff6b6b',
    comboGradient: ['rgba(239, 68, 68, 0.95)', 'rgba(185, 28, 28, 0.95)'] as const,
  },
  orange: {
    bg: ['#7c2d12', '#9a3412', '#7c2d12'] as const,
    border: '#f97316',
    badge: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.3)',
    text: '#fed7aa',
    label: 'TURUNCU',
    emoji: '🟠',
    glow: '#ff9f43',
    comboGradient: ['rgba(249, 115, 22, 0.95)', 'rgba(194, 65, 12, 0.95)'] as const,
  },
  yellow: {
    bg: ['#713f12', '#854d0e', '#713f12'] as const,
    border: '#eab308',
    badge: '#eab308',
    badgeBg: 'rgba(234, 179, 8, 0.3)',
    text: '#fef08a',
    label: 'SARI',
    emoji: '🟡',
    glow: '#feca57',
    comboGradient: ['rgba(234, 179, 8, 0.95)', 'rgba(161, 98, 7, 0.95)'] as const,
  },
  green: {
    bg: ['#14532d', '#166534', '#14532d'] as const,
    border: '#22c55e',
    badge: '#22c55e',
    badgeBg: 'rgba(34, 197, 94, 0.3)',
    text: '#bbf7d0',
    label: 'YEŞİL',
    emoji: '✅',
    glow: '#2ed573',
    comboGradient: ['rgba(34, 197, 94, 0.95)', 'rgba(22, 101, 52, 0.95)'] as const,
  },
  master: {
    bg: ['#78350f', '#92400e', '#78350f'] as const,
    border: '#fbbf24',
    badge: '#fbbf24',
    badgeBg: 'rgba(251, 191, 36, 0.3)',
    text: '#fef3c7',
    label: 'ALTIN',
    emoji: '🏆',
    glow: '#ffd700',
    comboGradient: ['rgba(251, 191, 36, 0.95)', 'rgba(180, 83, 9, 0.95)'] as const,
  },
  ultra: {
    bg: ['#1e1b4b', '#312e81', '#1e1b4b'] as const,
    border: '#a78bfa',
    badge: '#a78bfa',
    badgeBg: 'rgba(167, 139, 250, 0.3)',
    text: '#e0e7ff',
    label: 'ELMAS',
    emoji: '💎',
    glow: '#a78bfa',
    comboGradient: ['rgba(167, 139, 250, 0.95)', 'rgba(109, 40, 217, 0.95)'] as const,
  },
  perfect: {
    bg: ['#500724', '#831843', '#500724'] as const,
    border: '#f472b6',
    badge: '#f472b6',
    badgeBg: 'rgba(244, 114, 182, 0.3)',
    text: '#fce7f3',
    label: 'KRALİYET',
    emoji: '👑',
    glow: '#f472b6',
    comboGradient: ['rgba(244, 114, 182, 0.95)', 'rgba(157, 23, 77, 0.95)'] as const,
  },
};

const getCardSizeMultiplier = (compactMode: boolean, largeMode: boolean): number => {
  if (largeMode) return 1.16;
  if (compactMode) return 0.82;
  return 1;
};

const getFontStyle = (fontStyle: CardFontStyle) => {
  if (fontStyle === 'serif') return { fontFamily: 'serif' as const, letterSpacing: 0 };
  if (fontStyle === 'mono') {
    return {
      fontFamily: Platform.OS === 'ios' ? ('Menlo' as const) : ('monospace' as const),
      letterSpacing: 0,
    };
  }
  if (fontStyle === 'rounded') return { letterSpacing: 0.3 };
  return {};
};

// 🌱 MASCOT TEŞVİK MESAJLARI - Seviyeye göre
const MASCOT_ENCOURAGEMENTS = {
  // Renk seviyeleri (wrongCount)
  red: {
    emoji: '🔥',
    messages: [
      'Hadi ateşle! 🔥',
      'Bu kelime seni bekliyor!',
      'Turuncu hedefle! 🟠',
    ],
  },
  orange: {
    emoji: '💪',
    messages: [
      'İyi gidiyorsun! 💪',
      'Sarıya az kaldı! 🟡',
      'Devam et patron!',
    ],
  },
  yellow: {
    emoji: '⭐',
    messages: [
      'Yeşile rampa! 🟢',
      'Son hamle! ⭐',
      'Bu senin an!',
    ],
  },
  green: {
    emoji: '🏆',
    messages: [
      'MASTER zamanı! 🏆',
      'Altın hedefle! ✨',
      'Envantere git!',
    ],
  },
  // Master seviyeleri (masterLevel)
  master: {
    emoji: '💎',
    messages: [
      'ULTRA kas! 💎',
      'Elmas seni bekliyor!',
      'Patron modda! 👑',
    ],
  },
  ultra: {
    emoji: '👑',
    messages: [
      'PERFECT hedef! 👑',
      'Kraliyet yolu!',
      'Efsane ol! 🌟',
    ],
  },
  perfect: {
    emoji: '🌟',
    messages: [
      'KRALİYET! Tam gaz! 👑',
      'Efsane oldun! 🌟',
      'Sen bir PATRON!',
    ],
  },
};

// 💰 SORU BAŞINA ÖDÜL TOAST BİLEŞENİ
interface RewardToastData {
  coin: number;
  xp: number;
  visible: boolean;
}

const MiniQuizRewardToast = memo<{ 
  coin: number; 
  xp: number; 
  visible: boolean; 
  category: CategoryType;
  enableAnimation?: boolean;
}>(({ coin, xp, visible, category, enableAnimation = true }) => {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible || coin <= 0) return;

    let isCancelled = false;
    let timeout: NodeJS.Timeout | null = null;
    let enterAnimation: Animated.CompositeAnimation | null = null;
    let exitAnimation: Animated.CompositeAnimation | null = null;

    // Reset
    translateY.setValue(50);
    opacity.setValue(0);
    scale.setValue(0.5);

    if (enableAnimation) {
      // Animate in with bounce
      enterAnimation = Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 150,
          useNativeDriver: true,
        }),
      ]);
      enterAnimation.start();

      // Fade out after delay
      timeout = setTimeout(() => {
        if (isCancelled) return;
        exitAnimation = Animated.parallel([
          Animated.timing(translateY, {
            toValue: -30,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]);
        exitAnimation.start();
      }, 800);
    } else {
      // No animation - just show briefly
      opacity.setValue(1);
      scale.setValue(1);
      translateY.setValue(0);
      timeout = setTimeout(() => {
        if (isCancelled) return;
        opacity.setValue(0);
      }, 600);
    }

    return () => {
      isCancelled = true;
      enterAnimation?.stop();
      exitAnimation?.stop();
      if (timeout) clearTimeout(timeout);
    };
  }, [visible, coin, enableAnimation]);

  if (!visible || coin === 0) return null;

  const catColor = CATEGORY_COLORS[category]?.border || '#22c55e';

  return (
    <Animated.View
      style={[
        styles.rewardToast,
        {
          opacity,
          transform: [{ translateY }, { scale }],
          borderColor: catColor,
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
        style={styles.rewardToastGradient}
      >
        <View style={styles.rewardToastContent}>
          <Text style={styles.rewardToastEmoji}>💰</Text>
          <Text style={[styles.rewardToastText, { color: '#fbbf24' }]}>+{coin}</Text>
          <Text style={styles.rewardToastSeparator}>•</Text>
          <Text style={styles.rewardToastEmoji}>⚡</Text>
          <Text style={[styles.rewardToastText, { color: '#a78bfa' }]}>+{xp} XP</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// 🌱 Mascot Teşvik Bileşeni - GÖRSEL MASKOT İLE + PERFORMANS AYARLARI
const MascotEncouragement = memo<{ category: CategoryType; visible: boolean; enableBounce?: boolean }>(({ category, visible, enableBounce = true }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  const encouragement = MASCOT_ENCOURAGEMENTS[category] || MASCOT_ENCOURAGEMENTS.red;
  const randomMessage = useMemo(() => {
    const msgs = encouragement.messages;
    return msgs[Math.floor(Math.random() * msgs.length)];
  }, [category]);

  // Kategori renklerini belirle
  const categoryColors: Record<string, string[]> = {
    red: ['rgba(239, 68, 68, 0.95)', 'rgba(185, 28, 28, 0.95)'],
    orange: ['rgba(249, 115, 22, 0.95)', 'rgba(194, 65, 12, 0.95)'],
    yellow: ['rgba(234, 179, 8, 0.95)', 'rgba(161, 98, 7, 0.95)'],
    green: ['rgba(34, 197, 94, 0.95)', 'rgba(22, 163, 74, 0.95)'],
    master: ['rgba(251, 191, 36, 0.95)', 'rgba(180, 83, 9, 0.95)'],
    ultra: ['rgba(167, 139, 250, 0.95)', 'rgba(109, 40, 217, 0.95)'],
    perfect: ['rgba(244, 114, 182, 0.95)', 'rgba(157, 23, 77, 0.95)'],
  };

  useEffect(() => {
    if (visible) {
      // Bounce in - PERFORMANS KONTROLÜ
      if (enableBounce) {
        Animated.sequence([
          Animated.spring(scaleAnim, { toValue: 1.1, friction: 4, tension: 150, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        ]).start();
        
        // Continuous bounce - sadece enableBounce true ise
        const bounce = Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, { toValue: -3, duration: 600, useNativeDriver: true }),
            Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          ])
        );
        bounce.start();
        return () => bounce.stop();
      } else {
        // Basit fade-in
        scaleAnim.setValue(1);
        bounceAnim.setValue(0);
      }
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, enableBounce]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      mascotStyles.container,
      { transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] }
    ]}>
      <LinearGradient
        colors={categoryColors[category] as any}
        style={mascotStyles.bubble}
      >
        {/* 🌱 Gerçek Maskot Görseli */}
        <View style={mascotStyles.mascotCircle}>
          <Image source={MASCOT_IMAGE} style={mascotStyles.mascotImage} />
        </View>
        <Text style={mascotStyles.message}>{randomMessage}</Text>
        <Text style={mascotStyles.levelEmoji}>{encouragement.emoji}</Text>
      </LinearGradient>
      {/* Arrow pointing down */}
      <View style={[mascotStyles.arrow, { borderTopColor: categoryColors[category][1] }]} />
    </Animated.View>
  );
});

const mascotStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -65,
    left: 10,
    right: 10,
    zIndex: 100,
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mascotCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mascotImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  emoji: { fontSize: 20 },
  message: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  levelEmoji: { fontSize: 18 },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(22, 163, 74, 0.95)',
    marginTop: -1,
  },
});

// 💧 KART ÜZERİNDE SU DAMLACIKLARI ANİMASYONU - HAFİF VERSİYON (performans ayarlı)
const CardWaterDrops = memo(({ visible, onComplete, enabled = true }: { visible: boolean; onComplete?: () => void; enabled?: boolean }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const drop1Y = useRef(new Animated.Value(0)).current;
  const drop2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    let isCancelled = false;
    let timeout: NodeJS.Timeout | null = null;
    let dropAnimation: Animated.CompositeAnimation | null = null;

    const completeSafely = () => {
      if (!isCancelled) onComplete?.();
    };

    if (!enabled) {
      timeout = setTimeout(completeSafely, 50);
      return () => {
        isCancelled = true;
        if (timeout) clearTimeout(timeout);
      };
    }

    opacity.setValue(1);
    drop1Y.setValue(0);
    drop2Y.setValue(0);

    dropAnimation = Animated.parallel([
      Animated.timing(drop1Y, { toValue: -40, duration: 500, useNativeDriver: true }),
      Animated.timing(drop2Y, { toValue: -50, duration: 600, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]);
    dropAnimation.start();

    timeout = setTimeout(completeSafely, 650);
    return () => {
      isCancelled = true;
      dropAnimation?.stop();
      if (timeout) clearTimeout(timeout);
    };
  }, [visible, enabled, onComplete]);

  if (!visible || !enabled) return null;

  return (
    <View style={cardAnimationStyles.waterContainer} pointerEvents="none">
      <Animated.Text style={[cardAnimationStyles.waterDrop, { opacity, transform: [{ translateY: drop1Y }], left: '30%' }]}>💧</Animated.Text>
      <Animated.Text style={[cardAnimationStyles.waterDrop, { opacity, transform: [{ translateY: drop2Y }], left: '60%' }]}>✨</Animated.Text>
      <Animated.Text style={[cardAnimationStyles.growthText, { opacity }]}>🌱</Animated.Text>
    </View>
  );
});

// 🐛 KART ÜZERİNDE BÖCEK ANİMASYONU - HAFİF VERSİYON (performans ayarlı)
const CardBugCrawl = memo(({ visible, onComplete, enabled = true }: { visible: boolean; onComplete?: () => void; enabled?: boolean }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const bug1X = useRef(new Animated.Value(-20)).current;
  const bug2X = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    let isCancelled = false;
    let timeout: NodeJS.Timeout | null = null;
    let shakeAnimation: Animated.CompositeAnimation | null = null;
    let crawlAnimation: Animated.CompositeAnimation | null = null;

    const completeSafely = () => {
      if (!isCancelled) onComplete?.();
    };

    if (!enabled) {
      timeout = setTimeout(completeSafely, 50);
      return () => {
        isCancelled = true;
        if (timeout) clearTimeout(timeout);
      };
    }

    opacity.setValue(1);
    bug1X.setValue(-20);
    bug2X.setValue(20);

    shakeAnimation = Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]);
    shakeAnimation.start();

    crawlAnimation = Animated.parallel([
      Animated.timing(bug1X, { toValue: 15, duration: 500, useNativeDriver: true }),
      Animated.timing(bug2X, { toValue: -15, duration: 450, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]);
    crawlAnimation.start();

    timeout = setTimeout(completeSafely, 600);
    return () => {
      isCancelled = true;
      shakeAnimation?.stop();
      crawlAnimation?.stop();
      if (timeout) clearTimeout(timeout);
    };
  }, [visible, enabled, onComplete]);

  if (!visible || !enabled) return null;

  return (
    <Animated.View style={[cardAnimationStyles.bugContainer, { transform: [{ translateX: shakeAnim }] }]} pointerEvents="none">
      <Animated.Text style={[cardAnimationStyles.bugEmoji, { opacity, transform: [{ translateX: bug1X }], top: '30%', left: '20%' }]}>🐛</Animated.Text>
      <Animated.Text style={[cardAnimationStyles.bugEmoji, { opacity, transform: [{ translateX: bug2X }], top: '60%', right: '20%' }]}>🪲</Animated.Text>
      <Animated.Text style={[cardAnimationStyles.warningText, { opacity }]}>😢</Animated.Text>
    </Animated.View>
  );
});

// 💧🐛 Kart animasyonu stilleri
const cardAnimationStyles = StyleSheet.create({
  waterContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 100,
  },
  waterDrop: {
    position: 'absolute',
    fontSize: 20,
    textShadowColor: 'rgba(96, 165, 250, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  growthText: {
    position: 'absolute',
    bottom: -5,
    fontSize: 24,
    textShadowColor: 'rgba(74, 222, 128, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bugContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 100,
  },
  bugEmoji: {
    position: 'absolute',
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  warningText: {
    position: 'absolute',
    bottom: -5,
    fontSize: 24,
    textShadowColor: 'rgba(248, 113, 113, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
});

// 🎯 COMBO MESSAGES for extra juice - TikTok / Reels style
const COMBO_MESSAGES = [
  { min: 1, emoji: '✅', text: 'Doğru!', color: '#22c55e' },
  { min: 2, emoji: '🔥', text: 'Süper!', color: '#f97316' },
  { min: 3, emoji: '⚡', text: 'YANINDIN!', color: '#eab308' },
  { min: 4, emoji: '💥', text: 'ÇILDIRDIN!', color: '#ef4444' },
  { min: 5, emoji: '🌟', text: 'EFSANE!', color: '#a855f7' },
  { min: 6, emoji: '👑', text: 'EPIC!', color: '#ec4899' },
];

const getComboMessage = (streak: number) => {
  for (let i = COMBO_MESSAGES.length - 1; i >= 0; i--) {
    if (streak >= COMBO_MESSAGES[i].min) return COMBO_MESSAGES[i];
  }
  return COMBO_MESSAGES[0];
};

// UI akışını hızlandırırken animasyon görünümünü koruyan kısa geçiş süreleri
const QUIZ_FLOW_TIMINGS = {
  comboHoldMs: 340,
  completionMs: 349,
  nextQuestionMs: 300,
  wrongFeedMs: 400,
  wrongMasterMs: 520,
  wrongCloseMs: 520,
  colorMessageMs: 1800,
} as const;

interface MiniQuizDialogProps {
  word: WordModel | null;
  allWords: WordModel[];
  onClose: () => void;
  onAnswer: (correct: boolean, count?: number, wordId?: string) => void; // count: kaç doğru cevap verildi, wordId: hangi kelime
  feedMode?: boolean; // 🔥 Feed modu - yanlış cevap sonrası yeni kelimeye geç
  onNextWord?: () => WordModel | null; // Feed modunda yeni kelime al
}

// 💧 MİNİ SU DAMLASI EFEKTİ - Çok hafif, sadece 3 emoji
const MiniWaterDrops = memo(({ visible }: { visible: boolean }) => {
  const drop1Y = useRef(new Animated.Value(0)).current;
  const drop2Y = useRef(new Animated.Value(0)).current;
  const drop3Y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    drop1Y.setValue(0);
    drop2Y.setValue(0);
    drop3Y.setValue(0);
    opacity.setValue(1);

    // Animate drops floating up (negative = up)
    const dropAnimation = Animated.parallel([
      Animated.timing(drop1Y, { toValue: -60, duration: 600, useNativeDriver: true }),
      Animated.timing(drop2Y, { toValue: -80, duration: 700, useNativeDriver: true }),
      Animated.timing(drop3Y, { toValue: -50, duration: 500, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]);
    dropAnimation.start();

    return () => dropAnimation.stop();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={miniDropStyles.container} pointerEvents="none">
      <Animated.Text style={[miniDropStyles.drop, { transform: [{ translateY: drop1Y }], opacity, left: '35%' }]}>💧</Animated.Text>
      <Animated.Text style={[miniDropStyles.drop, { transform: [{ translateY: drop2Y }], opacity, left: '50%' }]}>💦</Animated.Text>
      <Animated.Text style={[miniDropStyles.drop, { transform: [{ translateY: drop3Y }], opacity, left: '65%' }]}>✨</Animated.Text>
    </View>
  );
});

const miniDropStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 100,
    zIndex: 100,
  },
  drop: {
    position: 'absolute',
    fontSize: 20,
  },
});

// CategoryType ve CATEGORY_COLORS yukarıda tanımlandı

const getCategoryFromWord = (word: WordModel): CategoryType => {
  const colorLevel = word.wrongCount || 0; // YENİ: 0=red, 1=yellow, 2+=green (turuncu kalktı)
  const masterLevel = word.masterLevel || 0;

  // Master seviyeleri
  if (masterLevel >= 3) return 'perfect';
  if (masterLevel >= 2) return 'ultra';
  if (masterLevel >= 1) return 'master';

  // Normal kategoriler - colorLevel: 0=red, 1=yellow, 2+=green (TURUNCU KALDIRILDI)
  if (colorLevel >= 2) return 'green';
  if (colorLevel >= 1) return 'yellow';
  return 'red';
};

const getRequiredCorrect = (cat: CategoryType): number => {
  // 🎯 SESSION SİSTEMİ:
  // Tüm kategorilerde 3 doğru = 1 session
  // Kırmızı: 1 session → Sarı
  // Sarı: 2 session → Yeşil
  // Yeşil: 3 session → Master
  return 3; // Tüm kategoriler için 3 doğru
};

const getNextCategory = (cat: CategoryType): string => {
  switch (cat) {
    case 'red': return 'Sarı'; // Turuncu kalktı, direkt sarıya
    case 'yellow': return 'Yeşil';
    case 'green': return 'Envanter';
    case 'master': return 'Elmas';
    case 'ultra': return 'Kraliyet';
    case 'perfect': return 'Envanter';
    default: return 'Envanter';
  }
};

// 🎯 JUICY Option Button with epic animations - MEMO for performance
const OptionButton = memo<{
  text: string;
  isCorrect: boolean;
  index: number;
  disabled: boolean;
  showResult: boolean;
  isSelected: boolean;
  onPress: (index: number, isCorrect: boolean) => void;
  questionKey: number;
  category: CategoryType;
  isTinyScreen?: boolean;
  isSmallScreen?: boolean;
  enableGlow?: boolean;
  enableJuicyButtons?: boolean;
  enableCardEntryAnimation?: boolean;
  wordText?: string; // The English word to show on correct answer
}>(({ text, isCorrect, index, disabled, showResult, isSelected, onPress, questionKey, category, isTinyScreen, isSmallScreen, enableGlow = true, enableJuicyButtons = true, enableCardEntryAnimation = true, wordText }) => {
  const catColors = CATEGORY_COLORS[category];

  // 🌟 Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 🎬 Entry animation - staggered bounce in - RESET on questionKey change!
  useEffect(() => {
    // Reset all animation values
    scaleAnim.setValue(enableCardEntryAnimation ? 0 : 1);
    rotateAnim.setValue(enableCardEntryAnimation ? -0.05 : 0);
    pressAnim.setValue(1);
    shakeAnim.setValue(0);
    glowAnim.setValue(0);

    if (enableCardEntryAnimation) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 120,
          delay: index * 60, // Faster stagger
          useNativeDriver: true,
        }),
        Animated.spring(rotateAnim, {
          toValue: 0,
          friction: 4,
          tension: 80,
          delay: index * 60,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [questionKey, enableCardEntryAnimation]);

  // 🌟 Simple idle glow - only when not showing result + PERFORMANS KONTROLÜ
  useEffect(() => {
    if (!showResult && !disabled && enableGlow) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
    glowAnim.setValue(0);
  }, [showResult, disabled, enableGlow]);

  // 🎯 Press handlers - OPTIMIZED with useCallback + PERFORMANS KONTROLÜ
  const handlePressIn = useCallback(() => {
    haptic.optionPress();
    sound.playTap();
    if (enableJuicyButtons) {
      Animated.spring(pressAnim, { toValue: 0.92, speed: 50, useNativeDriver: true }).start();
    }
  }, [pressAnim, enableJuicyButtons]);

  const handlePressOut = useCallback(() => {
    if (enableJuicyButtons) {
      Animated.spring(pressAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    }
  }, [pressAnim, enableJuicyButtons]);

  const handlePress = useCallback(() => {
    if (disabled) return;

    // 💥 Wrong answer shake - PERFORMANS KONTROLÜ
    if (!isCorrect) {
      if (enableJuicyButtons) {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }
    } else {
      // ✨ Correct answer celebration bounce - PERFORMANS KONTROLÜ
      if (enableJuicyButtons) {
        Animated.sequence([
          Animated.spring(pressAnim, { toValue: 1.12, speed: 50, useNativeDriver: true }),
          Animated.spring(pressAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
      }
    }
    onPress(index, isCorrect);
  }, [disabled, isCorrect, index, onPress, shakeAnim, pressAnim, enableJuicyButtons]);

  // 🎨 Dynamic colors - MEMOIZED
  const bgColors = useMemo((): readonly [string, string, string] => {
    if (!showResult) return ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)'];
    if (isCorrect) return ['rgba(34, 197, 94, 0.4)', 'rgba(34, 197, 94, 0.5)', 'rgba(34, 197, 94, 0.4)'];
    if (isSelected) return ['rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0.4)'];
    return ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)'];
  }, [showResult, isCorrect, isSelected]);

  const borderColor = useMemo((): string => {
    if (!showResult) return `${catColors.badge}50`;
    if (isCorrect) return '#22c55e';
    if (isSelected) return '#ef4444';
    return 'rgba(255,255,255,0.1)';
  }, [showResult, isCorrect, isSelected, catColors.badge]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] });
  const rotation = rotateAnim.interpolate({ inputRange: [-0.05, 0], outputRange: ['-3deg', '0deg'] });

  return (
    <Animated.View style={[
      styles.optionWrapper,
      {
        transform: [
          { scale: Animated.multiply(scaleAnim, pressAnim) },
          { translateX: shakeAnim },
          { rotate: rotation },
        ],
        opacity: scaleAnim,
      }
    ]}>
      {/* Glow effect - PERFORMANS KONTROLÜ */}
      {!showResult && enableGlow && (
        <Animated.View style={[
          styles.optionGlow,
          { backgroundColor: catColors.glow, opacity: glowOpacity }
        ]} />
      )}

      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
        <LinearGradient
          colors={bgColors}
          style={[
            styles.optionButton, 
            { borderColor: borderColor }, 
            isSmallScreen && { paddingVertical: 7, paddingHorizontal: 9, minHeight: 38, gap: 7, borderRadius: 11 },
            isTinyScreen && { paddingVertical: 6, paddingHorizontal: 8, minHeight: 36, gap: 6, borderRadius: 10 }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Option letter badge */}
          <View style={[
            styles.optionBadge,
            isSmallScreen && { width: 24, height: 24, borderRadius: 12 },
            isTinyScreen && { width: 22, height: 22, borderRadius: 11 },
            {
              backgroundColor: showResult && isCorrect ? '#22c55e' :
                showResult && isSelected ? '#ef4444' :
                  `${catColors.badge}40`,
              borderColor: showResult && isCorrect ? '#22c55e' :
                showResult && isSelected ? '#ef4444' :
                  catColors.badge,
            }
          ]}>
            <Text style={[
              styles.optionBadgeText,
              isSmallScreen && { fontSize: 11 },
              isTinyScreen && { fontSize: 10 },
              { color: showResult ? '#fff' : catColors.badge }
            ]}>
              {String.fromCharCode(65 + index)}
            </Text>
          </View>

          <Text style={[
            styles.optionText,
            isSmallScreen && { fontSize: 12, lineHeight: 17 },
            isTinyScreen && { fontSize: 12, lineHeight: 16 },
            showResult && isCorrect && styles.optionTextCorrect,
            showResult && isSelected && !isCorrect && styles.optionTextWrong,
          ]} numberOfLines={2}>
            {showResult && isCorrect && wordText ? wordText : showResult && isSelected && !isCorrect && wordText ? wordText : text}
            {showResult && isCorrect && wordText && (
              <Text style={{ color: catColors.badge, fontWeight: '800' }}> ✓</Text>
            )}
            {showResult && isSelected && !isCorrect && wordText && (
              <Text style={{ color: '#ef4444', fontWeight: '800' }}> ✗</Text>
            )}
          </Text>

          {/* Result icons with animation */}
          {showResult && isCorrect && (
            <Animated.Text style={[styles.resultIcon, isTinyScreen && { fontSize: 14 }, { transform: [{ scale: pressAnim }] }]}>✨</Animated.Text>
          )}
          {showResult && isSelected && !isCorrect && (
            <Animated.Text style={[styles.resultIcon, isTinyScreen && { fontSize: 14 }, { transform: [{ scale: pressAnim }] }]}>❌</Animated.Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});
OptionButton.displayName = 'OptionButton';

// 🏆 Progress Dots with pulse - MEMO for performance
const ProgressDots = memo<{ current: number; total: number; color: string }>(({ current, total, color }) => {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i < current;
        const isCurrent = i === current;
        return (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: isActive ? color : 'rgba(255,255,255,0.2)',
                borderColor: isActive || isCurrent ? color : 'transparent',
                transform: [{ scale: isCurrent ? 1.3 : 1 }],
              }
            ]}
          />
        );
      })}
    </View>
  );
});
ProgressDots.displayName = 'ProgressDots';

export const MiniQuizDialog: React.FC<MiniQuizDialogProps> = memo(({ word, allWords, onClose, onAnswer, feedMode = false, onNextWord }) => {
  // 📱 Android system navigation bar ile çakışma önleme
  const insets = useSafeAreaInsets();
  
  // 🎮 PERFORMANS AYARLARI - shallow comparison ile optimize
  const config = usePerformanceStore(s => s.config);

  // 🔄 Store'dan SADECE gerekli değerleri al - SELECTOR ile OPTIMIZE!
  // ⚡ farm/inventory abonelikleri KALDIRILDI — her store değişikliğinde 
  // MiniQuizDialog re-render oluyordu (kasma nedeni #1). Sadece word değiştiğinde
  // getState() ile tek seferlik okuma yapılır (aşağıda initialWordRef bloğunda).
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  const addCoins = useFarmStore(s => s.addCoins);
  const coins = useFarmStore(s => s.coins);
  const setCardFeedback = useFarmStore(s => s.setCardFeedback);
  const activeCardTheme = useFarmStore(s => s.activeCardTheme);
  const cardCustomization = useFarmStore(s => s.cardCustomization);

  // 🚨 TUTORIAL: FullScreen modal adımlarında MiniQuiz KAPANMALI - Modal çakışması önle
  const prevTutorialStepRef = useRef(tutorialStep);
  useEffect(() => {
    // Tutorial step değiştiğinde kontrol et
    if (prevTutorialStepRef.current !== tutorialStep) {
      const fullScreenSteps = [
        'STEP_8_CARD_PROGRESS', 
        'STEP_10_TO_GREEN',
        'STEP_12_INVENTORY',
        'STEP_15_MASTER_GRIND',
        'STEP_16_ULTRA_REACHED',
        'STEP_18_PERFECT_DONE',
        'STEP_19_FINAL_QUIZ',
        'STEP_20_CELEBRATION',
      ];
      
      // FullScreen modal açılacak bir adıma geçildiyse MiniQuiz'i HEMEN kapat
      if (fullScreenSteps.includes(tutorialStep) && word) {
        onClose();
      }
      
      prevTutorialStepRef.current = tutorialStep;
    }
  }, [tutorialStep, word, onClose]);

  // 🌱 Tutorial: MiniQuiz açıldığında STEP_7'ye geç (STEP_6'dan sonra)
  // NOT: STEP_6'da zaten WAIT_CARD_TAP ile STEP_7'ye geçiyor, bu sadece güvenlik için
  useEffect(() => {
    if (word && (tutorialStep === 'STEP_6_FARM_INTRO' || tutorialStep === 'STEP_7_MINI_QUIZ')) {
      if (tutorialStep === 'STEP_6_FARM_INTRO') {
        setTutorialStep('STEP_7_MINI_QUIZ');
      }
    }
  }, [word, tutorialStep, setTutorialStep]);

  // 📌 İlk açılışta word'ü sabitle - quiz boyunca değişmesin
  const initialWordRef = useRef<WordModel | null>(null);
  const lastWordIdRef = useRef<string | null>(null);
  const quizOpenCountRef = useRef<number>(0); // 🔄 Quiz açılış sayacı - aynı kelimeye tekrar tıklandığında güncelle
  const optionPoolSnapshotRef = useRef<WordModel[]>([]);

  // 🔥 Feed mode - current word state
  const [feedWord, setFeedWord] = useState<WordModel | null>(null);

  // Word değiştiğinde (yeni quiz açıldığında) ref'i güncelle
  const activeWord = feedMode ? (feedWord || word) : word;

  // 🔄 Quiz her açıldığında (word truthy olduğunda) store'dan güncel veriyi al
  // Aynı kelimeye tekrar tıklansa bile güncel değeri almalı!
  if (activeWord) {
    const shouldUpdate = activeWord.id !== lastWordIdRef.current || !initialWordRef.current;
    
    if (shouldUpdate) {
      lastWordIdRef.current = activeWord.id;
      optionPoolSnapshotRef.current = Array.isArray(allWords) ? allWords : [];
      // ⚡ Store'dan getState() ile tek seferlik okuma — abonelik yok, re-render yok
      const state = useFarmStore.getState();
      const farm = state.farm || [];
      const phrasalVerbFarm = state.phrasalVerbFarm || [];
      const inventory = state.inventory || [];
      const phrasalVerbInventory = state.phrasalVerbInventory || [];
      const farmWord = farm.find(w => w.id === activeWord.id && !(w as any).normalHarvested) || farm.find(w => w.id === activeWord.id);
      const phrasalWord = phrasalVerbFarm.find(w => w.id === activeWord.id && !(w as any).normalHarvested) || phrasalVerbFarm.find(w => w.id === activeWord.id);
      const invWord = inventory.find(w => w.id === activeWord.id);
      const phrasalInvWord = phrasalVerbInventory.find(w => w.id === activeWord.id);
      initialWordRef.current = farmWord || phrasalWord || invWord || phrasalInvWord || activeWord;
    }
  }

  // Word null olduğunda ref'i temizle - böylece aynı kelimeye tekrar tıklandığında güncel değer alınır
  if (!activeWord) {
    initialWordRef.current = null;
    lastWordIdRef.current = null; // 🔄 ID'yi de temizle!
    optionPoolSnapshotRef.current = [];
  }

  const currentWord = initialWordRef.current;

  // 🎯 SERİ SİSTEMİ: Seri tamamlanana kadar quiz açık kalır
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);
  const [localStreak, setLocalStreak] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [localColorLevel, setLocalColorLevel] = useState(0);
  const [colorTransitionMessage, setColorTransitionMessage] = useState<string | null>(null);
  const [showWordMeaning, setShowWordMeaning] = useState(false);
  
  // 💧 MİNİ SU DAMLASI - ref ile optimize (state yerine)
  const [showMiniDrops, setShowMiniDrops] = useState(false);
  const miniDropKey = useRef(0);
  
  // 💧🐛 SEVİYE DEĞİŞİM ANİMASYONU
  const [levelFeedback, setLevelFeedback] = useState<{ type: 'levelUp' | 'levelDown' | 'protected'; visible: boolean }>({ 
    type: 'levelUp', 
    visible: false 
  });
  
  // 🛡️ SESSION YANLIŞI TAKİBİ
  const [sessionHadWrong, setSessionHadWrong] = useState(false);
  
  // 💰 ÖDÜL TOAST - state
  const [rewardToast, setRewardToast] = useState<{ coin: number; xp: number; visible: boolean; key: number }>({ 
    coin: 0, 
    xp: 0, 
    visible: false,
    key: 0 
  });
  const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
  const fontStyleOverride = useMemo(
    () => getFontStyle(safeCustomization.fontStyle || 'default'),
    [safeCustomization.fontStyle]
  );
  const borderPreset = useMemo(
    () => BORDER_STYLES[safeCustomization.borderStyle || 'default'] || BORDER_STYLES.default,
    [safeCustomization.borderStyle]
  );
  const cardScaleMultiplier = 1;
  const isSoilBackground = safeCustomization.backgroundStyle === 'soil';
  const overlayTheme = useMemo(
    () => (!isSoilBackground && activeCardTheme !== 'default' ? getThemeOverlay(activeCardTheme) : null),
    [activeCardTheme, isSoilBackground]
  );
  
  // 📱 RESPONSIVE - SABİT DEĞERLER KULLAN (performans için)
  // Dimensions.get yerine sabit SCREEN değerleri - layout shift önle
  const screenWidth = SCREEN_WIDTH;
  const screenHeight = SCREEN_HEIGHT;
  
  // 🎯 Responsive değerleri useMemo ile stabilize et
  const responsiveValues = useMemo(() => {
    const isTinyScreen = screenHeight < 680; // iPhone SE, 8, mini
    const isSmallScreen = screenHeight < 750; // iPhone 11/12/13/14 standart
    const isMediumScreen = screenHeight < 850; // iPhone Pro modelleri
    const isLargeScreen = screenHeight >= 850; // Pro Max, Plus modelleri
    const isTabletPortrait = screenWidth < 550 && screenHeight > 900;
    const isTabletLandscape = screenWidth > 700 && screenHeight < 550;
    const compactModal = isTinyScreen || isSmallScreen || isTabletPortrait || isTabletLandscape;
    
    const safeAreaPadding = isTinyScreen ? 2 : isSmallScreen ? 2 : isMediumScreen ? 3 : 4;
    const dialogPaddingBase = isTinyScreen ? 3 : isSmallScreen ? 4 : isMediumScreen ? 5 : 6;
    const dialogPadding = Math.max(3, Math.round(dialogPaddingBase * cardScaleMultiplier));
    // 📱 Notch safeArea'da zaten paddingTop ile karşılanıyor, modalMaxHeight bunun dışında kalmalı
    // safeArea.paddingTop = NOTCH_HEIGHT, safeArea.padding = 4
    // Yani modal'ın kullanabileceği alan: screenHeight - NOTCH_HEIGHT - 8 (üst/alt padding)
    const usableHeight = screenHeight - NOTCH_HEIGHT - 8;
    // Hepsi için maksimum alan kullan - scroll engellensin
    const modalMaxHeight = usableHeight;
    const baseModalMaxWidth = isTabletLandscape ? Math.min(screenWidth * 0.85, 650) : Math.min(screenWidth - 12, 480);
    const modalWidthScale = 1;
    const modalMaxWidth = Math.min(screenWidth - 8, baseModalMaxWidth * modalWidthScale);
    
    return {
      isTinyScreen,
      isSmallScreen,
      isMediumScreen,
      isLargeScreen,
      isTabletPortrait,
      isTabletLandscape,
      compactModal,
      safeAreaPadding,
      dialogPadding,
      modalMaxHeight,
      modalMaxWidth,
    };
  }, [screenWidth, screenHeight, cardScaleMultiplier, safeCustomization.largeMode, safeCustomization.compactMode]);
  
  const { 
    isTinyScreen, isSmallScreen, isMediumScreen, isLargeScreen,
    isTabletPortrait, isTabletLandscape, compactModal,
    safeAreaPadding, dialogPadding, modalMaxHeight, modalMaxWidth 
  } = responsiveValues;

  // 🎯 Streak word'den başlıyor (store'dan güncel versiyondan)
  const initialStreak = currentWord?.consecutiveCorrect || 0;

  // 🎬 Animation refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0.1)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const wordPulseAnim = useRef(new Animated.Value(1)).current;
  const headerBounceAnim = useRef(new Animated.Value(0)).current;
  const glowPulseAnim = useRef(new Animated.Value(0)).current;
  const comboScaleAnim = useRef(new Animated.Value(0)).current;
  const comboOpacityAnim = useRef(new Animated.Value(0)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const wordPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const category = useMemo((): CategoryType => {
    if (!currentWord) return 'yellow';
    return getCategoryFromWord(currentWord);
  }, [currentWord]);

  // 🔥 Memoize derived values to prevent re-renders
  const catColors = useMemo(() => {
    const base = CATEGORY_COLORS[category];
    const overlayBase = overlayTheme
      ? {
        ...base,
        border: overlayTheme.borderColor,
        glow: overlayTheme.borderGlow,
      }
      : base;

    if (isSoilBackground) {
      return {
        ...overlayBase,
        bg: ['#24150f', '#3d2a24', '#1c120d'] as const,
        border: 'rgba(121, 85, 72, 0.86)',
        badge: '#a1887f',
        badgeBg: 'rgba(93, 64, 55, 0.55)',
        text: '#f7efe4',
        glow: '#6d4c41',
        comboGradient: ['rgba(141, 110, 99, 0.95)', 'rgba(93, 64, 55, 0.95)'] as const,
      };
    }

    return overlayBase;
  }, [category, overlayTheme, isSoilBackground]);
  const required = useMemo(() => getRequiredCorrect(category), [category]);
  const isMaster = useMemo(() => category === 'master', [category]);

  // Toplam streak (başlangıç + local)
  const totalStreak = initialStreak + localStreak;

  // 🎯 Combo message - memoized for performance
  const comboMessage = useMemo(() => getComboMessage(totalStreak), [totalStreak]);

  // 🎨 Color level data - memoized to prevent map recreation (Turuncu kalktı!)
  const colorLevelData = useMemo(() => {
    const colorLevel = currentWord?.wrongCount || 0;
    // Yeni sistem: Kırmızı (0) → Sarı (1) → Yeşil (2+)
    // colorLevel: 0=red, 1=yellow, 2+=green
    return (['red', 'yellow', 'green'] as const).map((color, i) => ({
      color,
      isActive: colorLevel >= i,
      isCurrent: (i === 0 && colorLevel === 0) || (i === 1 && colorLevel === 1) || (i === 2 && colorLevel >= 2),
      bg: { red: '#ef4444', yellow: '#eab308', green: '#22c55e' }[color],
      label: { red: 'Kırmızı', yellow: 'Sarı', green: 'Yeşil' }[color],
    }));
  }, [currentWord?.wrongCount]);

  // 🏆 Master tier data - memoized to prevent map recreation
  const masterTierData = useMemo(() => {
    const currentMasterLevel = currentWord?.masterLevel || 0;
    const currentSessions = currentWord?.consecutiveMasterSessions || 0;
    const rewardClaimedPerfect = currentWord?.rewardClaimedPerfect || false;
    // Perfect için: ödül alınmamışsa 6, alınmışsa 1
    const perfectRequired = rewardClaimedPerfect ? 1 : 6;
    
    // 🎓 TUTORIAL: Artık yeşil kartlar için de normal 3 session gerekli (0/1 kaldırıldı)
    const greenRequired = 3;
    
    return [
      { level: 0, emoji: '✅', label: 'Yeşil', color: '#22c55e', required: greenRequired },
      { level: 1, emoji: '🏆', label: 'Altın', color: '#fbbf24', required: 4 },
      { level: 2, emoji: '💎', label: 'Elmas', color: '#a78bfa', required: 5 },
      { level: 3, emoji: '👑', label: 'Kraliyet', color: '#f472b6', required: perfectRequired },
    ].map((tier, i) => ({
      ...tier,
      isCurrentTier: currentMasterLevel === tier.level && currentMasterLevel < 3,
      isCompleted: currentMasterLevel > tier.level,
      isActive: currentMasterLevel === tier.level && currentMasterLevel < 3 || currentMasterLevel > tier.level,
      progress: currentSessions,
      isLast: i === 3,
    }));
  }, [currentWord?.masterLevel, currentWord?.consecutiveMasterSessions, currentWord?.rewardClaimedPerfect, currentWord?.wrongCount, tutorialStep]);

  const options = useMemo(() => {
    if (!currentWord) return [];
    // ";ı" ile ayrılmış anlamları ", " ile göster
    const correct = { text: formatMeaningForQuiz(currentWord.meaning), isCorrect: true, wordText: currentWord.text };
    
    // 🚨 PHRASAL VERB İÇİN ÖZEL HAVUZ KULLAN!
    const isPhrasalVerb = currentWord.isPhrasalVerb || (currentWord as any).verb;
    const optionPool = isPhrasalVerb
      ? PHRASAL_VERBS_POOL
      : (optionPoolSnapshotRef.current.length > 0 ? optionPoolSnapshotRef.current : allWords);
    
    // 🚨 PERFORMANS: Fisher-Yates shuffle yerine random sample (daha hızlı)
    const poolLength = optionPool.length;
    const usedIndices = new Set<number>();
    const wrongs: { text: string; isCorrect: boolean; wordText: string }[] = [];
    const currentId = currentWord.id || (currentWord as any).verb;
    
    // 3 yanlış şık bul (random sampling - O(1) per item)
    let attempts = 0;
    while (wrongs.length < 3 && attempts < 20) {
      const idx = Math.floor(Math.random() * poolLength);
      if (usedIndices.has(idx)) { attempts++; continue; }
      
      const w = optionPool[idx];
      const wordId = w.id || w.verb;
      const wordMeaning = w.meaning || '';
      
      if (wordId !== currentId && wordMeaning !== currentWord.meaning) {
        usedIndices.add(idx);
        wrongs.push({ text: formatMeaningForQuiz(wordMeaning), isCorrect: false, wordText: w.text || w.verb || '' });
      }
      attempts++;
    }
    
    // Şıkları karıştır (sadece 4 eleman - çok hızlı)
    const allOptions = [correct, ...wrongs];
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    return allOptions;
  }, [currentWord, questionKey]); // questionKey ile yeni şıklar

  // 🎬 EPIC Entry Animation
  useEffect(() => {
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | null = null;
    let isCancelled = false;

    if (currentWord) {
      // Reset states
      setSelected(null);
      setShowResult(false);
      setLocalStreak(0);
      setLocalColorLevel(0); // 🎨 Quiz içi renk takibini sıfırla
      setQuestionKey(0);
      setColorTransitionMessage(null); // 🎨 Renk geçiş mesajını sıfırla
      setShowWordMeaning(false); // 🎓 Kelime bilgisini sıfırla
      setSessionHadWrong(false); // 🛡️ Session yanlış takibini sıfırla
      progressAnim.setValue(initialStreak / required);
      meaningSpokenRef.current = null;

      // Reset animations - hızlı setValue çağrıları
      slideAnim.setValue(SCREEN_HEIGHT);
      scaleAnim.setValue(config.enableModalAnimations ? 0.5 : 1); // LOW modda animasyon yok
      rotateAnim.setValue(config.enableModalAnimations ? 0.1 : 0);
      backdropAnim.setValue(0);
      headerBounceAnim.setValue(1); // Hemen 1'e set et - sonra animasyon yapma

      //  Ses ve haptic HEMEN çal - animasyon başlangıcında
      haptic.quizOpen();
      sound.playQuizStart();

      // 🗣️ Kelime seslendirilmesi - 300ms sonra (opening animation sırasında)
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => {
        if (currentWord?.text) {
          sound.speakWord(currentWord.text, 'en-US');
        }
        speechTimeoutRef.current = null;
      }, 300);

      // 🎮 SMOOTH ENTRANCE - Yumuşak spring animation (sadece MEDIUM/HIGH)
      if (config.enableModalAnimations) {
        Animated.parallel([
          // Backdrop fade - hızlı
          Animated.timing(backdropAnim, { toValue: 1, duration: 165, useNativeDriver: true }),
          // Slide up with juicy spring
          Animated.spring(slideAnim, { 
            toValue: 0, 
            friction: 9,  // %10 daha yavaşlatıldı
            tension: 85,  // %10 daha yavaşlatıldı
            useNativeDriver: true 
          }),
          // Scale up with snappy bounce
          Animated.spring(scaleAnim, { 
            toValue: 1, 
            friction: 8,  // %10 daha yavaşlatıldı
            tension: 72,  // %10 daha yavaşlatıldı
            useNativeDriver: true 
          }),
          // Rotate to 0 quickly
          Animated.spring(rotateAnim, { 
            toValue: 0, 
            friction: 9, 
            tension: 85, 
            useNativeDriver: true 
          }),
        ]).start();
      } else {
        // LOW mod - anında açılış, animasyon yok
        backdropAnim.setValue(1);
        slideAnim.setValue(0);
        scaleAnim.setValue(1);
        rotateAnim.setValue(0);
      }

      // 🚀 Glow ve pulse loop'ları SONRA başlat (açılış kasmasını önle)
      interactionTask = InteractionManager.runAfterInteractions(() => {
        if (isCancelled) return;

        // Simple glow pulse - managed loop - PERFORMANS KONTROLÜ
        glowLoopRef.current?.stop();
        if (config.enableGlow) {
          glowPulseAnim.setValue(0);
          glowLoopRef.current = Animated.loop(
            Animated.sequence([
              Animated.timing(glowPulseAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
              Animated.timing(glowPulseAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
          );
          glowLoopRef.current.start();
        } else {
          glowPulseAnim.setValue(0);
        }

        // Word pulse loop - subtle breathing - PERFORMANS KONTROLÜ
        wordPulseLoopRef.current?.stop();
        if (config.enablePulseAnimations) {
          wordPulseAnim.setValue(1);
          wordPulseLoopRef.current = Animated.loop(
            Animated.sequence([
              Animated.timing(wordPulseAnim, { toValue: 1.04, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
              Animated.timing(wordPulseAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
          );
          wordPulseLoopRef.current.start();
        } else {
          wordPulseAnim.setValue(1);
        }
      });
    } else {
      // 🎮 ARCADE: Daha hızlı exit animation
      glowLoopRef.current?.stop();
      wordPulseLoopRef.current?.stop();
      
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      ]).start();
    }

    return () => {
      isCancelled = true;
      interactionTask?.cancel?.();
      glowLoopRef.current?.stop();
      wordPulseLoopRef.current?.stop();
      // 🗣️ word değiştiğinde (kapanış dahil) TTS'i durdur + timeout temizle
      if (speechTimeoutRef.current) { clearTimeout(speechTimeoutRef.current); speechTimeoutRef.current = null; }
      sound.stopSpeaking();
    };
  }, [word, initialStreak, required]);

  // 🎯 SERİ SİSTEMİ: Seri tamamlanana kadar quiz açık kalır
  // 🔒 Performans için ref'ler - çoklu tıklama ve animasyon çakışmasını önle
  const isProcessingRef = useRef(false);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nextQuestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rewardToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const miniDropTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorMsgTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrongAnswerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeBuildUpTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const yanindinPulseTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const meaningSpokenRef = useRef<string | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 🗣️ Açılış speech timeout
  const runAfterInteractionsSafely = useCallback((callback: () => void) => {
    // Deterministic state flow: critical quiz result updates must run immediately.
    // InteractionManager defers could be canceled on unmount and drop session progression.
    callback();
  }, []);

  const clearCloseBuildUpHaptics = useCallback(() => {
    if (closeBuildUpTimeoutsRef.current.length === 0) return;
    closeBuildUpTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    closeBuildUpTimeoutsRef.current = [];
  }, []);

  const runCloseBuildUpHaptics = useCallback(() => {
    // "Yanindin" -> kapanis arasina tatmin edici bir buildup.
    clearCloseBuildUpHaptics();
    closeBuildUpTimeoutsRef.current.push(
      setTimeout(() => haptic.rigid(), 120),
      setTimeout(() => haptic.heavy(), 220),
      setTimeout(() => { haptic.success(); haptic.rigid(); }, 315),
    );
  }, [clearCloseBuildUpHaptics]);

  const clearYanindinPulseHaptics = useCallback(() => {
    if (yanindinPulseTimeoutsRef.current.length === 0) return;
    yanindinPulseTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    yanindinPulseTimeoutsRef.current = [];
  }, []);

  const triggerYanindinPulseHaptic = useCallback(() => {
    clearYanindinPulseHaptics();
    // Fire exactly when "YANINDIN!" appears, then a short heavy rumble.
    haptic.heavy();
    haptic.rigid();
    yanindinPulseTimeoutsRef.current.push(
      setTimeout(() => haptic.success(), 48),
      setTimeout(() => { haptic.heavy(); haptic.rigid(); }, 96),
      setTimeout(() => haptic.comboMega(0.18), 152),
    );
  }, [clearYanindinPulseHaptics]);
  
  // 🧹 Cleanup timeouts + TTS - MEMORY LEAK ÖNLEMİ
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
      if (rewardToastTimeoutRef.current) clearTimeout(rewardToastTimeoutRef.current);
      if (miniDropTimeoutRef.current) clearTimeout(miniDropTimeoutRef.current);
      if (colorMsgTimeoutRef.current) clearTimeout(colorMsgTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (wrongAnswerTimeoutRef.current) clearTimeout(wrongAnswerTimeoutRef.current);
      clearCloseBuildUpHaptics();
      clearYanindinPulseHaptics();
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      // 🗣️ Unmount'ta SADECE açılış speech'i durdur — kapanış TTS'i (Türkçe anlam) devam etsin
      // sound.stopSpeaking() KALDIRILDI — kapanışta başlayan Türkçe TTS'i öldürüyordu
    };
  }, [clearCloseBuildUpHaptics, clearYanindinPulseHaptics]);

  useEffect(() => {
    if (!showCombo || comboMessage.text !== 'YANINDIN!') return;
    triggerYanindinPulseHaptic();
    return clearYanindinPulseHaptics;
  }, [showCombo, comboMessage.text, triggerYanindinPulseHaptic, clearYanindinPulseHaptics]);

  const speakFirstMeaningOnce = useCallback((wordToSpeak?: { id?: string; meaning?: string } | null) => {
    if (!wordToSpeak?.meaning) return;
    const firstMeaning = getFirstMeaning(wordToSpeak.meaning);
    if (!firstMeaning) return;
    const speakKey = wordToSpeak.id || firstMeaning;
    if (meaningSpokenRef.current === speakKey) return;
    meaningSpokenRef.current = speakKey;
    sound.speakWord(firstMeaning, 'tr-TR');
  }, []);

  const triggerMiniQuizCloseHaptic = useCallback(() => {
    // Strong close pulse + old satisfying drrrr pattern.
    haptic.rigid();
    haptic.heavy();
    haptic.success();
    haptic.comboMega(1.15);
  }, []);

  const handleOptionPress = useCallback((index: number, isCorrect: boolean) => {
    // 🔒 Çoklu tıklama koruması - hızlı cevaplarda sapıtmayı önle
    if (showResult || isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    setSelected(index);
    setShowResult(true);

    if (isCorrect) {
      const newLocalStreak = localStreak + 1;
      const nextTotalStreak = initialStreak + newLocalStreak;
      setLocalStreak(newLocalStreak);

      // 💰 ÖDÜL VER - Her doğru cevapta coin ve XP ekle (CEFR seviyesine göre çarpan uygulanır)
      const perQuestionReward = getPerQuestionReward(category, currentWord?.difficulty);
      addCoins(perQuestionReward.coin);
      // XP direkt store'da güncelleniyor - useFarmStore'dan getState ile set yapalım
      useFarmStore.setState(state => ({ xp: state.xp + perQuestionReward.xp }));
      
      // 💧 MİNİ SU DAMLASI EFEKTİ - Her doğru cevapta (hafif, performanslı)
      miniDropKey.current += 1;
      setShowMiniDrops(true);
      if (miniDropTimeoutRef.current) clearTimeout(miniDropTimeoutRef.current);
      miniDropTimeoutRef.current = setTimeout(() => setShowMiniDrops(false), 800);
      
      // 💧 Kart feedback'i (store'a bildir - UltimateWordCard için)
      if (currentWord?.id) {
        setCardFeedback({ wordId: currentWord.id, type: 'levelUp' });
      }
      
      // 💰 Ödül toast'ını göster - performans ayarlarına bağlı
      if (config.enableRewardToast) {
        // Önceki toast timeout'unu iptal et
        if (rewardToastTimeoutRef.current) {
          clearTimeout(rewardToastTimeoutRef.current);
        }
        
        setRewardToast(prev => ({
          coin: perQuestionReward.coin,
          xp: perQuestionReward.xp,
          visible: true,
          key: prev.key + 1,
        }));
        // Toast'ı 1 saniye sonra gizle (animation kendi de gizliyor ama state temizliği için)
        rewardToastTimeoutRef.current = setTimeout(() => {
          setRewardToast(prev => ({ ...prev, visible: false }));
          rewardToastTimeoutRef.current = null;
        }, 1200);
      }

      // ⚡⚡⚡ SES VE HAPTİC - ANINDA ÇALIŞ! ⚡⚡⚡
      // Haptic HEMEN çalsın - await yok, bloklanma yok!
      haptic.correctAnswer(nextTotalStreak);
      // Ses de HEMEN çalsın - yeni player ile!
      sound.playStreak(nextTotalStreak);

      // 🔥 MEGA COMBO ANIMATION - Optimize edildi + PERFORMANS KONTROLÜ
      // Önceki combo timeout'unu iptal et
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
      
      // Combo display - sadece config.enableComboToast ise göster
      if (config.enableComboToast && nextTotalStreak >= config.comboToastThreshold) {
        setShowCombo(true);
        comboScaleAnim.setValue(0);
        comboOpacityAnim.setValue(0);

        // Epic bounce-in with overshoot - kısaltılmış + PERFORMANS KONTROLÜ
        if (config.enableJuicyButtons) {
          Animated.sequence([
            Animated.parallel([
              Animated.spring(comboScaleAnim, {
                toValue: 1.12,
                friction: 4,
                tension: 180,
                useNativeDriver: true,
              }),
              Animated.timing(comboOpacityAnim, {
                toValue: 1,
                duration: 80,
                useNativeDriver: true,
              }),
            ]),
            Animated.spring(comboScaleAnim, {
              toValue: 1,
              friction: 5,
              tension: 150,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          // Basit fade-in
          comboScaleAnim.setValue(1);
          comboOpacityAnim.setValue(1);
        }

        // Combo fade out - optimize edilmiş timing
        comboTimeoutRef.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(comboScaleAnim, {
              toValue: 0.5,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(comboOpacityAnim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => setShowCombo(false));
        }, QUIZ_FLOW_TIMINGS.comboHoldMs);
      }

      // 🎊 Confetti - PERFORMANS KONTROLÜ
      if (config.celebrationIntensity > 0) {
        setConfettiKey(k => k + 1);
      }

      // Progress bar animasyonu - HAFİF (useNativeDriver: false zorunlu)
      Animated.timing(progressAnim, {
        toValue: nextTotalStreak / required,
        duration: 200,
        useNativeDriver: false
      }).start();

      // 🎯 Seri tamamlandı mı?
      if (nextTotalStreak >= required) {
        // 🏆 SUCCESS! Seri tamamlandı
        const masterLevel = currentWord?.masterLevel || 0;
        
        // 🛡️ MASTER KART + YANLIŞ VARSA: "Böceklerden korundu" göster
        if (masterLevel > 0 && sessionHadWrong) {
          setLevelFeedback({ type: 'protected', visible: true });
        } else {
          // 💧 SULAMA ANİMASYONU - Kart büyüyor!
          setLevelFeedback({ type: 'levelUp', visible: true });
        }
        
        // Bitiş haptic'i ekran kapanışıyla senkron tetiklenecek (onClose anında).
        sound.playHarvest(); // 🎉 Başarı sesi - harvest!
        if (!feedMode) {
          runCloseBuildUpHaptics();
        }

        // 🎓 TUTORIAL: Renk değişikliği kontrolleri
        // colorLevel = başlangıç değeri + quiz içinde yapılan RENK değişimleri
        const initialColorLevel = currentWord?.wrongCount || 0;
        const colorLevel = initialColorLevel + localColorLevel; // Mevcut gerçek renk seviyesi
        // masterLevel zaten yukarıda tanımlandı
        
        // 🎨 SESSION KONTROLÜ - Kırmızı/Sarı kartlarda session sayısını kontrol et!
        // Kırmızı (colorLevel=0): 1 session gerekli
        // Sarı (colorLevel=1): 2 session gerekli
        // Bu session'dan sonraki session sayısı (store henüz güncellenmedi, +1 ekle)
        const currentSessions = (currentWord?.consecutiveMasterSessions || 0) + 1;
        
        // 🎓 TUTORIAL ÖZEL: tutorialFirstWrongWord için tüm session gereksinimleri 1
        const isTutorialCardForSession = (tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED') && tutorialFirstWrongWord?.id === currentWord?.id;
        const requiredSessionsForColor = isTutorialCardForSession ? 1 : (colorLevel === 0 ? 1 : 2); // Tutorial'da hep 1, Kırmızı:1, Sarı:2
        
        // 🎨 RENK DEĞİŞİMİ SADECE:
        // 1. masterLevel=0 (yeşil altı kart)
        // 2. colorLevel<2 (henüz yeşil değil)
        // 3. Yeterli session tamamlandı!
        const willColorChange = masterLevel === 0 && colorLevel < 2 && currentSessions >= requiredSessionsForColor;
        const nextColorLevel = willColorChange ? colorLevel + 1 : colorLevel;
        
        // 🎨 Local renk seviyesini SADECE renk değiştiğinde artır!
        if (willColorChange) {
          setLocalColorLevel(prev => prev + 1);
        }
        
        // 🎓 TUTORIAL STEP GEÇİŞLERİ - Hangi step'e geçileceğini belirle
        // NOT: STEP_7_MINI_QUIZ her renk değişiminde kullanılıyor (CONTINUE_QUIZ sonrası geri dönüş)
        let nextTutorialStep: string | null = null;
        
        // Tutorial aktif mi kontrol et (STEP_7 veya STEP_8 - button lock step'i)
        const isTutorialActive = tutorialStep === 'STEP_7_MINI_QUIZ' || 
                                 tutorialStep === 'STEP_8_CARD_PROGRESS';
        
        // 🎓 Master grind tutorial aktif mi?
        const isMasterGrindActive = tutorialStep === 'STEP_15_MASTER_GRIND' ||
                                    tutorialStep === 'STEP_16_ULTRA_REACHED' ||
                                    tutorialStep === 'STEP_17_PERFECT_GRIND';
        
        if (isTutorialActive && willColorChange) {
          // Renk değişimine göre modal step'e geç - SADECE RENK DEĞİŞTİĞİNDE!
          // YENİ SİSTEM: 0=kırmızı, 1=sarı, 2+=yeşil (TURUNCU KALDIRILDI)
          if (nextColorLevel === 1) {
            // Kırmızı (0) → Sarı (1)
            nextTutorialStep = 'STEP_8_CARD_PROGRESS';
          } else if (nextColorLevel >= 2) {
            // Sarı (1) → Yeşil (2+)
            nextTutorialStep = 'STEP_10_TO_GREEN';
          }
        } else if (isMasterGrindActive) {
          // 🎓 Master grind step geçişleri
          // MasterLevel kontrolü burada yapılıyor
          // NOT: masterLevel henüz güncellenmedi, HASAT ile güncelleniyor
          // Yeşil olduktan SONRA HASAT yapılınca masterLevel artar
          // YENİ SİSTEM: 0=kırmızı, 1=sarı, 2+=yeşil
          if (nextColorLevel >= 2 && masterLevel === 0) {
            // İlk yeşil = Hasat edilince Master olacak, zaten STEP_15'teyiz bekle
          } else if (nextColorLevel >= 2 && masterLevel === 1) {
            // Master → Ultra geçişi için yeşil olduk, hasat edilince ULTRA
            // Hasat edilince FarmScreen STEP_16'ya geçirecek
          } else if (nextColorLevel >= 2 && masterLevel === 2) {
            // Ultra → Perfect geçişi için yeşil olduk
            // Hasat edilince FarmScreen STEP_18'e geçirecek
          }
        }
        
        let transitionMsg: string | null = null;
        if (masterLevel === 0 && willColorChange) {
          // Normal renk geçişleri - SADECE RENK DEĞİŞTİĞİNDE!
          // YENİ SİSTEM: 0=kırmızı, 1=sarı, 2+=yeşil
          if (colorLevel === 0) {
            // Kırmızı → Sarı
            const msgs = COLOR_TRANSITION_MESSAGES.toYellow;
            transitionMsg = msgs[Math.floor(Math.random() * msgs.length)];
          } else if (colorLevel === 1) {
            // Sarı → Yeşil - ÖĞRENDİN!
            const msgs = COLOR_TRANSITION_MESSAGES.toGreen;
            transitionMsg = msgs[Math.floor(Math.random() * msgs.length)];
            setShowWordMeaning(true); // 🎓 Kelime bilgisini göster
          }
        } else if (masterLevel >= 1) {
          // Master/Ultra/Perfect - session tamamlandığında mesaj
          if (masterLevel === 1) {
            const msgs = COLOR_TRANSITION_MESSAGES.toMaster;
            transitionMsg = msgs[Math.floor(Math.random() * msgs.length)];
          } else if (masterLevel === 2) {
            const msgs = COLOR_TRANSITION_MESSAGES.toUltra;
            transitionMsg = msgs[Math.floor(Math.random() * msgs.length)];
          } else if (masterLevel >= 3) {
            const msgs = COLOR_TRANSITION_MESSAGES.toPerfect;
            transitionMsg = msgs[Math.floor(Math.random() * msgs.length)];
          }
        }
        // NOT: Yeşil kartta (masterLevel=0, colorLevel>=2) session tamamlamak mesaj göstermez!
        
        if (transitionMsg) {
          setColorTransitionMessage(transitionMsg);
          if (colorMsgTimeoutRef.current) clearTimeout(colorMsgTimeoutRef.current);
          colorMsgTimeoutRef.current = setTimeout(() => setColorTransitionMessage(null), QUIZ_FLOW_TIMINGS.colorMessageMs);
        }

        // 🎯 COMBO GÖRÜNSÜN - Önceki timeout'ları iptal et
        if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
        
        // 📦 Feedback bilgisini kaydet (onClose SONRASI gönderilecek)
        const feedbackType: 'levelUp' | 'protected' = 
          (currentWord?.masterLevel || 0) > 0 && sessionHadWrong ? 'protected' : 'levelUp';
        const feedbackWordId = currentWord?.id;
        
        completionTimeoutRef.current = setTimeout(() => {
          isProcessingRef.current = false;
          
          // 🎓 TUTORIAL: Renk değişiminde ÖNCE store güncelle, SONRA MiniQuiz kapat, SONRA step geçişi
          // Bu sıralama kritik - Modal çakışmasını önler
          
          if (nextTutorialStep) {
            // MiniQuiz final "drrrr" hissi - kapanışla senkron.
            triggerMiniQuizCloseHaptic();
            onClose();
            
            // 🚀 Store güncellemelerini animasyon SONRASI yap (kasma önleme)
            runAfterInteractionsSafely(() => {
              onAnswer(true, newLocalStreak, currentWord?.id);
              if (feedbackWordId) {
                setCardFeedback({ wordId: feedbackWordId, type: feedbackType });
              }
              setTutorialStep(nextTutorialStep as any);
            });
            return;
          }
          
          // Feed modunda yeni kelimeye geç
          if (feedMode && onNextWord) {
            const nextWord = onNextWord();
            if (nextWord) {
              // 🚀 Store güncellemesini arka planda yap
              runAfterInteractionsSafely(() => {
                onAnswer(true, newLocalStreak, currentWord?.id);
                if (feedbackWordId) {
                  setCardFeedback({ wordId: feedbackWordId, type: feedbackType });
                }
              });
              setFeedWord(nextWord);
              setSelected(null);
              setShowResult(false);
              setLocalStreak(0);
              setQuestionKey(k => k + 1);
              return;
            }
          }
          
          // Normal kapanış - final haptic kapanışla senkron.
          triggerMiniQuizCloseHaptic();
          onClose();
          
          // 🚀 Store güncellemelerini animasyon bittikten SONRA yap
          runAfterInteractionsSafely(() => {
            onAnswer(true, newLocalStreak, currentWord?.id);
            if (feedbackWordId) {
              setCardFeedback({ wordId: feedbackWordId, type: feedbackType });
            }
          });
        }, QUIZ_FLOW_TIMINGS.completionMs); // Combo animasyonu görünsün
      } else {
        // ✅ Doğru ama seri bitmedi - HEMEN yeni soru göster
        if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
        
        nextQuestionTimeoutRef.current = setTimeout(() => {
          // Önce combo'yu kapat, sonra yeni soru
          setShowCombo(false);
          comboScaleAnim.setValue(0);
          comboOpacityAnim.setValue(0);

          setSelected(null);
          setShowResult(false);
          setQuestionKey(k => k + 1);
          isProcessingRef.current = false; // 🔓 Yeni soru için kilidi aç
          haptic.light();
          sound.playNextQuestion();
        }, QUIZ_FLOW_TIMINGS.nextQuestionMs);
      }
    } else {
      // 💔 Wrong answer
      // 🛡️ Session'da yanlış olduğunu işaretle (master kartlar için)
      setSessionHadWrong(true);
      
      // 🐛 BÖCEK ANMASYONU veya 🛡️ KORUMA ANMASYONU
      const masterLevel = currentWord?.masterLevel || 0;
      if (masterLevel === 0) {
        // Normal kart - böcek animasyonu (seviye düşer)
        setLevelFeedback({ type: 'levelDown', visible: true });
        // NOT: setCardFeedback aşağıda onAnswer sonrası çağrılacak
      } else {
        // 🛡️ MASTER KART - Seviye düşmüyor ama session sıfırlanıyor
        // "Böceklerden korundu" animasyonu göster
        setLevelFeedback({ type: 'protected', visible: true });
        // NOT: setCardFeedback aşağıda onAnswer sonrası çağrılacak
      }
      
      haptic.wrongAnswer();
      sound.playWrong();

      // Progress reset animation
      Animated.timing(progressAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

      // 🔥 Feed modunda - yanlış cevap sonrası yeni kelimeye geç!
      if (feedMode && onNextWord) {
        // 📦 Feed mode'da feedback bilgisini kaydet
        const feedbackType: 'levelDown' | 'protected' = 
          (currentWord?.masterLevel || 0) > 0 ? 'protected' : 'levelDown';
        const feedbackWordId = currentWord?.id;
        
        if (wrongAnswerTimeoutRef.current) clearTimeout(wrongAnswerTimeoutRef.current);
        wrongAnswerTimeoutRef.current = setTimeout(() => {
          isProcessingRef.current = false;
          
          const nextWord = onNextWord();
          if (nextWord) {
            // 🚀 Store güncellemesini arka planda yap
            runAfterInteractionsSafely(() => {
              onAnswer(false, undefined, currentWord?.id);
              if (feedbackWordId) {
                setCardFeedback({ wordId: feedbackWordId, type: feedbackType });
              }
            });
            setFeedWord(nextWord);
            setSelected(null);
            setShowResult(false);
            setLocalStreak(0);
            setLocalColorLevel(0); // 🎨 Yanlış cevap - renk takibini sıfırla
            setQuestionKey(k => k + 1);
          } else {
            // Quiz kapanıyor
            onClose();
            runAfterInteractionsSafely(() => {
              onAnswer(false, undefined, currentWord?.id);
              if (feedbackWordId) {
                setCardFeedback({ wordId: feedbackWordId, type: feedbackType });
              }
            });
          }
        }, QUIZ_FLOW_TIMINGS.wrongFeedMs);
      } else {
        // 🛡️ MASTER KART - Yanlış bilse bile quiz kapanmaz, streak sıfırlanır, yeni soru gelir
        const masterLevel = currentWord?.masterLevel || 0;
        if (masterLevel > 0) {
          // Master kart - quiz devam eder, sadece streak sıfırlanır
          const feedbackWordId = currentWord?.id;
          if (wrongAnswerTimeoutRef.current) clearTimeout(wrongAnswerTimeoutRef.current);
          wrongAnswerTimeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            
            // 🗣️ Master kart yanlış — Türkçe anlamı söyle (dedup bypass, aynı kelime)
            if (currentWord?.meaning) {
              const turkishMeaning = getFirstMeaning(currentWord.meaning);
              if (turkishMeaning) sound.speakWord(turkishMeaning, 'tr-TR');
            }
            
            // Streak sıfırla ve yeni soru - ÖNCE UI güncelle
            setSelected(null);
            setShowResult(false);
            setLocalStreak(0);
            setLocalColorLevel(0); // 🎨 Yanlış cevap - renk takibini sıfırla
            setQuestionKey(k => k + 1);
            
            // 🚀 Store güncellemelerini arka planda yap (kasma önleme)
            runAfterInteractionsSafely(() => {
              onAnswer(false, undefined, currentWord?.id);
              if (feedbackWordId) {
                setCardFeedback({ wordId: feedbackWordId, type: 'protected' });
              }
            });
          }, QUIZ_FLOW_TIMINGS.wrongMasterMs);
        } else {
          // Normal kart - quiz kapanır (seviye düştü)
          const feedbackWordId = currentWord?.id;
          if (wrongAnswerTimeoutRef.current) clearTimeout(wrongAnswerTimeoutRef.current);
          wrongAnswerTimeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            // TTS parent (FarmScreen/PhrasalVerb) tarafından onClose callback'inde çağrılacak
            onClose();
            runAfterInteractionsSafely(() => {
              onAnswer(false, undefined, currentWord?.id);
              if (feedbackWordId) {
                setCardFeedback({ wordId: feedbackWordId, type: 'levelDown' });
              }
            });
          }, QUIZ_FLOW_TIMINGS.wrongCloseMs);
        }
      }
    }
  }, [showResult, localStreak, initialStreak, required, onAnswer, onClose, progressAnim, comboScaleAnim, comboOpacityAnim, feedMode, onNextWord, currentWord, runAfterInteractionsSafely, triggerMiniQuizCloseHaptic, runCloseBuildUpHaptics]);

  if (!currentWord) return null;

  // Debug log

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const rotation = rotateAnim.interpolate({ inputRange: [0, 0.1], outputRange: ['0deg', '6deg'] });
  const glowOpacity = glowPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const headerScale = headerBounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <Modal visible={!!currentWord} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* 💧🐛 Seviye Değişim Animasyonu - Quiz bitişinde gösterilir */}
      <CardFeedbackAnimation
        type={levelFeedback.type}
        visible={levelFeedback.visible}
        onComplete={() => setLevelFeedback(prev => ({ ...prev, visible: false }))}
      />
      
      {/* 💧 Mini su damlası efekti - her doğru cevapta */}
      <MiniWaterDrops key={miniDropKey.current} visible={showMiniDrops} />
      
      {/* Animated backdrop - PERFORMANS İÇİN HAFİF */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 4) }]} pointerEvents="box-none">
        <Animated.View style={[
          styles.dialogWrapper,
          {
            maxWidth: modalMaxWidth,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
              { rotate: rotation },
            ]
          }
        ]}>
          {/* Mascot Teşvik kaldırıldı - temiz görünüm */}

          {/* Outer glow */}
          <Animated.View style={[
            styles.outerGlow,
            {
              backgroundColor: catColors.glow,
              opacity: glowOpacity,
              borderRadius: borderPreset.borderRadius + 6,
            }
          ]} />

          <LinearGradient
            colors={catColors.bg}
            style={[
              styles.dialog,
              {
                borderColor: catColors.border,
                maxHeight: modalMaxHeight,
                padding: dialogPadding,
                borderRadius: borderPreset.borderRadius,
                borderWidth: borderPreset.borderWidth,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={[
                styles.dialogContent,
                compactModal && styles.dialogContent_compact,
                isTinyScreen && styles.dialogContent_tiny,
              ]}
            >
              {/* 🌾 Header */}
              <Animated.View style={[styles.header, isSmallScreen && styles.header_tiny, isTinyScreen && styles.header_tiny, { transform: [{ scale: headerScale }] }]}>
                {safeCustomization.showEmoji && (
                  <Text style={[styles.headerEmoji, isSmallScreen && { fontSize: 12 }, isTinyScreen && { fontSize: 11 }]}>🌾</Text>
                )}
                <Text style={[styles.headerTitle, isSmallScreen && { fontSize: 12 }, isTinyScreen && { fontSize: 11 }, fontStyleOverride]}>HASAT QUİZ</Text>
                {safeCustomization.showEmoji && (
                  <Text style={[styles.headerEmoji, isSmallScreen && { fontSize: 12 }, isTinyScreen && { fontSize: 11 }]}>{catColors.emoji}</Text>
                )}
              </Animated.View>

              {/* 💰 COİN GÖSTERGESİ - Sol üst */}
              <View style={[styles.coinDisplay, isSmallScreen && styles.coinDisplay_compact, isTinyScreen && styles.coinDisplay_tiny]}>
                <Text style={[styles.coinEmoji, isSmallScreen && { fontSize: 14 }, isTinyScreen && { fontSize: 12 }]}>💰</Text>
                <Text style={[styles.coinAmount, isSmallScreen && { fontSize: 13 }, isTinyScreen && { fontSize: 11 }]}>{coins.toLocaleString()}</Text>
              </View>

              {/* ❌ Close Button - Top Right */}
              <Pressable
                onPress={onClose}
                style={[styles.closeButton, isSmallScreen && styles.closeButton_tiny, isTinyScreen && styles.closeButton_tiny, { borderColor: catColors.border + '40' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={isTinyScreen ? 16 : isSmallScreen ? 18 : 22} color={catColors.text} strokeWidth={3} />
              </Pressable>

              {/* Category Badge */}
              <View style={[styles.categoryBadge, isTinyScreen && { paddingHorizontal: 7, paddingVertical: 2 }, { backgroundColor: catColors.badgeBg, borderColor: catColors.badge }]}>
                {safeCustomization.showEmoji && (
                  <Text style={[styles.categoryDot, isTinyScreen && { fontSize: 10 }]}>{catColors.emoji}</Text>
                )}
                <Text style={[styles.categoryText, isTinyScreen && { fontSize: 9 }, { color: catColors.badge }, fontStyleOverride]}>{catColors.label}</Text>
              </View>

              {/* 📝 Word Card with pulse */}
              <Animated.View style={[styles.wordCard, isSmallScreen && styles.wordCard_compact, isTinyScreen && styles.wordCard_tiny, { transform: [{ scale: wordPulseAnim }], overflow: 'visible' }]}>
                {/* 💧 Su damlacıkları ve Böcek animasyonu CardFeedbackAnimation ile global yönetiliyor - Performans için kapatıldı 
                <CardWaterDrops 
                  visible={levelFeedback.type === 'levelUp' && levelFeedback.visible}
                  onComplete={() => setLevelFeedback(prev => ({ ...prev, visible: false }))}
                  enabled={config.enableQuizFeedbackAnimations}
                />
                <CardBugCrawl 
                  visible={levelFeedback.type === 'levelDown' && levelFeedback.visible}
                  onComplete={() => setLevelFeedback(prev => ({ ...prev, visible: false }))}
                  enabled={config.enableQuizFeedbackAnimations}
                />
                */}
                
                <Text style={[styles.wordLabel, isSmallScreen && { fontSize: 8 }, isTinyScreen && { fontSize: 8 }, fontStyleOverride]}>KELİME</Text>
                <View style={styles.wordWithLevelContainer}>
                  <Text style={[styles.wordText, isSmallScreen && { fontSize: 20 }, isTinyScreen && { fontSize: 18 }, { color: catColors.text, textShadowColor: catColors.glow }, fontStyleOverride]}>{currentWord.text}</Text>
                  {!!currentWord.difficulty && (
                    <View style={[styles.cefrBadge, { backgroundColor: catColors.badgeBg, borderColor: catColors.badge }]}>
                      <Text style={[styles.cefrText, { color: catColors.badge }, fontStyleOverride]}>{currentWord.difficulty}</Text>
                    </View>
                  )}
                </View>

                {/* 📖 Örnek Cümle - Cloud tooltip ile anlam göster */}
                {!!currentWord.example && (
                  <View style={[styles.exampleWrapper, isSmallScreen && { marginTop: 4, paddingTop: 4 }]}>
                    <ExampleSentence
                      sentence={currentWord.example}
                      targetWord={currentWord.text}
                      categoryColor={catColors.badge}
                      compact={isSmallScreen}
                      ultraCompact={false}
                    />
                  </View>
                )}
              </Animated.View>

              {/* 📊 Progress Section */}
              <View style={[styles.progressSection, isTinyScreen && styles.progressSection_tiny, isSmallScreen && { padding: 5, marginBottom: 3 }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressTitle, isTinyScreen && { fontSize: 10 }, isSmallScreen && { fontSize: 10 }, fontStyleOverride]}>İlerleme</Text>
                  <Text style={[styles.progressCount, isTinyScreen && { fontSize: 13 }, isSmallScreen && { fontSize: 13 }, { color: catColors.badge }, fontStyleOverride]}>{totalStreak}/{required}</Text>
                </View>

                {/* Progress bar */}
                {safeCustomization.showProgressBar && (
                  <>
                    <View style={[styles.progressTrack, isTinyScreen && { height: 4, marginBottom: 3 }, isSmallScreen && { height: 5, marginBottom: 3 }, { borderColor: catColors.border }]}>
                      <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: catColors.badge }]}>
                        <View style={[styles.progressShine, { backgroundColor: catColors.glow }]} />
                      </Animated.View>
                    </View>

                    {/* Progress dots */}
                    <ProgressDots current={totalStreak} total={required} color={catColors.badge} />
                  </>
                )}

                {/* 🎨 Color Level Indicator - using memoized data */}
                {(currentWord?.masterLevel || 0) === 0 && currentWord?.wrongCount < 3 && (
                  <View style={styles.colorLevelContainer}>
                    {colorLevelData.map((item) => (
                      <View
                        key={item.color}
                        style={[
                          styles.colorLevelItem,
                          item.isCurrent && { borderColor: item.bg, borderWidth: 2 },
                        ]}
                      >
                        <View style={[
                          styles.colorLevelDot,
                          { backgroundColor: item.isActive ? item.bg : 'rgba(255,255,255,0.2)' }
                        ]} />
                        <Text style={[
                          styles.colorLevelLabel,
                          { color: item.isActive ? '#fff' : 'rgba(255,255,255,0.4)' }
                        ]}>
                          {item.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Next level hint - Session bilgisi ile */}
                {(currentWord?.masterLevel || 0) === 0 && (currentWord?.wrongCount || 0) < 2 && (
                  <View style={[styles.masterProgressContainer, isTinyScreen && styles.masterProgressContainer_tiny, isTabletPortrait && { marginTop: 6 }]}>
                    <View style={styles.masterProgressHeader}>
                      <Text style={[styles.masterProgressTitle, isTabletPortrait && { fontSize: 10 }, fontStyleOverride]}>
                        🔥 {getNextCategory(category)} kategoriye yüksel!
                      </Text>
                      <Text style={[styles.masterProgressCount, isTabletPortrait && { fontSize: 12 }]}>
                        {currentWord?.consecutiveMasterSessions || 0} / {category === 'red' ? 1 : 2} session
                      </Text>
                    </View>
                    {/* Session Progress Bar */}
                    <View style={[styles.sessionProgressBar, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <View style={[
                        styles.sessionProgressFill,
                        {
                          width: `${((currentWord?.consecutiveMasterSessions || 0) / (category === 'red' ? 1 : 2)) * 100}%`,
                          backgroundColor: category === 'red' ? '#ef4444' : '#eab308',
                        }
                      ]} />
                    </View>
                  </View>
                )}
                
                {/* Yeşil kart session gösterimi (wrongCount >= 2 ve masterLevel = 0) */}
                {(currentWord?.masterLevel || 0) === 0 && (currentWord?.wrongCount || 0) >= 2 && (
                  <Text style={[styles.nextLevelHint, isTinyScreen && { fontSize: 10, marginTop: 3 }, fontStyleOverride]}>
                    🔥 {required} art arda doğru → Envanter'e gönder! ({currentWord?.consecutiveMasterSessions || 0}/3 session)
                  </Text>
                )}

                {/* 🏆 Master Progression UI - Sadece yeşil ve üstü kartlar */}
                {((currentWord?.wrongCount || 0) >= 2 || (currentWord?.masterLevel || 0) > 0) && (
                  <View style={[styles.masterProgressContainer, isTinyScreen && styles.masterProgressContainer_tiny, isTabletPortrait && { marginTop: 6 }]}>
                    <View style={styles.masterProgressHeader}>
                      <Text style={[styles.masterProgressTitle, isTabletPortrait && { fontSize: 10 }, fontStyleOverride]}>🏆 Master İlerleme</Text>
                      <Text style={[styles.masterProgressCount, isTabletPortrait && { fontSize: 12 }]}>
                        {currentWord.consecutiveMasterSessions || 0} / {
                          // Session sayıları: kırmızı=1, sarı=2, yeşil=3, master=4, ultra=5, perfect=6 (claimed=1)
                          (currentWord?.masterLevel || 0) === 0 ? (
                            // Kırmızı/Sarı/Yeşil kartlar (masterLevel = 0)
                            (currentWord?.wrongCount || 0) === 0 ? 1 :  // Kırmızı: 1 session
                            (currentWord?.wrongCount || 0) === 1 ? 2 :  // Sarı: 2 session
                            3  // Yeşil: 3 session (tutorial'da da aynı)
                          ) :
                            (currentWord?.masterLevel || 0) === 1 ? 4 :
                              (currentWord?.masterLevel || 0) === 2 ? 5 :
                                (currentWord?.rewardClaimedPerfect ? 1 : 6)
                        } session
                      </Text>
                    </View>

                    {/* Master tier indicators - using memoized data */}
                    <View style={styles.masterTierContainer}>
                      {masterTierData.map((tier) => (
                        <View
                          key={tier.level}
                          style={[
                            styles.masterTierItem,
                            tier.isCurrentTier && { borderColor: tier.color, borderWidth: 2 },
                            isTinyScreen && styles.masterTierItem_tiny,
                          ]}
                        >
                          <Text style={[
                            styles.masterTierEmoji,
                            isTinyScreen && { fontSize: 14 },
                            !tier.isActive && { opacity: 0.3 }
                          ]}>
                            {tier.emoji}
                          </Text>
                          <Text style={[
                            styles.masterTierLabel,
                            isTinyScreen && { fontSize: 8 },
                            { color: tier.isActive ? '#fff' : 'rgba(255,255,255,0.4)' }
                          ]}>
                            {tier.label}
                          </Text>
                          {tier.isCurrentTier && tier.required > 0 && (
                            <View style={[styles.masterTierProgress, { backgroundColor: tier.color + '30' }]}>
                              <View style={[
                                styles.masterTierProgressFill,
                                {
                                  width: `${(tier.progress / tier.required) * 100}%`,
                                  backgroundColor: tier.color,
                                }
                              ]} />
                            </View>
                          )}
                          {tier.isCompleted && (
                            <Text style={styles.masterTierCheck}>✓</Text>
                          )}
                          {!tier.isLast && (
                            <View style={[styles.masterTierArrow, !tier.isActive && { opacity: 0.2 }]}>
                              <Text style={styles.masterTierArrowText}>→</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>

                    {/* Next tier hint */}
                    {(currentWord?.masterLevel || 0) < 3 && (
                      <Text style={[styles.masterProgressHint, isTinyScreen && { fontSize: 10 }, fontStyleOverride]}>
                        {(currentWord?.masterLevel || 0) === 0 && '⭐ 3 başarılı session → Altın Master!'}
                        {(currentWord?.masterLevel || 0) === 1 && '💎 4 başarılı session → Elmas Master!'}
                        {(currentWord?.masterLevel || 0) === 2 && '👑 5 başarılı session → Kraliyet Master!'}
                      </Text>
                    )}
                    {(currentWord?.masterLevel || 0) >= 3 && (
                      <Text style={[styles.masterProgressHint, isTinyScreen && { fontSize: 10 }, { color: '#f472b6' }, fontStyleOverride]}>
                        👑 {currentWord?.rewardClaimedPerfect ? '1 session sonra hasat!' : '6 session sonra ilk ödül!'} ✨
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* 🎯 Question */}
              <Text style={[styles.questionTitle, compactModal && styles.questionTitle_compact, isSmallScreen && { fontSize: 11, marginBottom: 4 }, isTinyScreen && { fontSize: 10, marginBottom: 3 }, fontStyleOverride]}>
                Doğru anlamı seç:
              </Text>

              {/* 🔘 Options */}
              <View style={[styles.optionsWrap, compactModal && styles.optionsWrap_compact, isSmallScreen && { gap: 4, marginBottom: 4 }, isTinyScreen && { gap: 3, marginBottom: 3 }]}>
                {options.map((opt, i) => (
                  <OptionButton
                    key={`option-${questionKey}-${i}`}
                    text={opt.text}
                    isCorrect={opt.isCorrect}
                    index={i}
                    disabled={showResult}
                    showResult={showResult}
                    isSelected={selected === i}
                    onPress={handleOptionPress}
                    questionKey={questionKey}
                    category={category}
                    isTinyScreen={isTinyScreen}
                    isSmallScreen={isSmallScreen}
                    enableGlow={config.enableOptionGlow}
                    enableJuicyButtons={config.enableJuicyButtons}
                    enableCardEntryAnimation={config.enableCardEntryAnimation}
                    wordText={opt.wordText}
                  />
                ))}
              </View>

              {/* ⚠️ Warning */}
              <View style={styles.warningBox}>
                <Text style={[styles.warningText, compactModal && styles.warningText_compact, isTinyScreen && { fontSize: 10 }]}>
                  ⚠️ Yanlış → ilerleme sıfırlanır!
                </Text>
              </View>
            </ScrollView>

            {/* 🎊 Confetti */}
            {confettiKey > 0 && <CorrectCelebration trigger={confettiKey} />}

            {/* 🔥 MEGA COMBO DISPLAY - Instagram Reels Style */}
            {showCombo && totalStreak > 0 && (
              <Animated.View style={[
                styles.comboContainer,
                {
                  transform: [
                    { scale: comboScaleAnim },
                    {
                      rotate: comboScaleAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: ['-10deg', '5deg', '0deg'],
                      })
                    },
                  ],
                  opacity: comboOpacityAnim,
                }
              ]}>
                {/* Glow ring */}
                <View style={[
                  styles.comboGlowRing,
                  { backgroundColor: comboMessage.color }
                ]} />

                <LinearGradient
                  colors={[
                    comboMessage.color + 'F0',
                    comboMessage.color + 'CC',
                  ]}
                  style={[styles.comboGradient, {
                    shadowColor: comboMessage.color,
                    borderColor: comboMessage.color,
                  }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.comboEmoji}>{comboMessage.emoji}</Text>
                  <Text style={[styles.comboText, { textShadowColor: comboMessage.color }]}>
                    {comboMessage.text}
                  </Text>
                  <View style={styles.comboStreakBadge}>
                    <Text style={styles.comboStreakX}>×</Text>
                    <Text style={styles.comboStreakNumber}>{totalStreak}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {/* 💰 ÖDÜL TOAST - Her doğru cevapta göster */}
            <MiniQuizRewardToast
              key={rewardToast.key}
              coin={rewardToast.coin}
              xp={rewardToast.xp}
              visible={rewardToast.visible}
              category={category}
              enableAnimation={config.enableRewardToast}
            />

            {/* 🎨 RENK GEÇİŞ KUTLAMASI - KALDIRILDI */}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)'
  },
  // 💰 Reward Toast Styles
  rewardToast: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  rewardToastGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  rewardToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardToastEmoji: {
    fontSize: 18,
  },
  rewardToastText: {
    fontSize: 18,
    fontWeight: '800',
  },
  rewardToastSeparator: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginHorizontal: 4,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    paddingTop: NOTCH_HEIGHT, // Çentik/Dynamic Island için
    // paddingBottom dinamik olarak hook ile eklenecek
  },
  dialogWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  outerGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 24,
  },
  dialog: {
    borderRadius: 14,
    padding: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  dialogContent: {
    paddingBottom: 2,
  },
  dialogContent_compact: {
    paddingBottom: 1,
  },
  dialogContent_tiny: {
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    gap: 4,
  },
  header_tiny: {
    marginBottom: 0,
    gap: 2,
  },
  headerEmoji: { fontSize: 14 },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // 💰 COİN GÖSTERGESİ
  coinDisplay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    gap: 4,
  },
  coinDisplay_compact: {
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coinDisplay_tiny: {
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  coinEmoji: {
    fontSize: 16,
  },
  coinAmount: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: '800',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 100,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton_tiny: {
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 4,
    gap: 3,
  },
  categoryDot: { fontSize: 10 },
  categoryText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  wordCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  wordCard_compact: {
    padding: 6,
    marginBottom: 4,
    borderRadius: 10,
  },
  wordCard_tiny: {
    padding: 4,
    marginBottom: 2,
    borderRadius: 8,
  },
  wordLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  wordText: {
    fontSize: 20,
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  wordWithLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cefrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    alignSelf: 'center',
  },
  cefrText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exampleWrapper: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  // 🎙️ TELAFFUZ BUTONU
  pronunciationButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    alignItems: 'center',
  },
  pronunciationButton_compact: {
    marginTop: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pronunciationButton_tiny: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  pronunciationButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  progressSection: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 6,
    marginBottom: 4,
  },
  progressSection_tiny: {
    padding: 4,
    marginBottom: 3,
    borderRadius: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  progressTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressShine: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: '100%',
    opacity: 0.5,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  // 🎨 Color Level Indicator Styles
  colorLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  colorLevelItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colorLevelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 3,
  },
  colorLevelLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  nextLevelHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 4,
  },
  // 🏆 Master Progression Styles
  masterProgressContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  masterProgressContainer_tiny: {
    marginTop: 6,
    paddingTop: 6,
  },
  masterProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  masterProgressTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  masterProgressCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fbbf24',
  },
  masterTierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  masterTierItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  masterTierItem_tiny: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRadius: 6,
  },
  masterTierEmoji: {
    fontSize: 14,
    marginBottom: 1,
  },
  masterTierLabel: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  masterTierProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  masterTierProgressFill: {
    height: '100%',
  },
  masterTierCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
    color: '#22c55e',
  },
  masterTierArrow: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -8,
  },
  masterTierArrowText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  masterProgressHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 4,
  },
  questionTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  questionTitle_compact: {
    fontSize: 10,
    marginBottom: 3,
  },
  optionsWrap: {
    gap: 4,
    marginBottom: 4,
  },
  optionsWrap_compact: {
    gap: 3,
  },
  optionWrapper: {
    position: 'relative',
  },
  optionGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
    minHeight: 44,
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  optionText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 19,
  },
  optionTextCorrect: {
    color: '#4ade80',
    fontWeight: '800',
  },
  optionTextWrong: {
    color: '#f87171',
    fontWeight: '800',
  },
  resultIcon: {
    fontSize: 16,
  },
  warningBox: {
    alignItems: 'center',
  },
  warningText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
  },
  warningText_compact: {
    fontSize: 9,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  lottie: { width: 100, height: 100 },
  successEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  successSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  successBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  successBadgeText: {
    fontSize: 14,
    fontWeight: '900',
  },
  // 🔥 MEGA COMBO STYLES - Instagram Reels Style
  comboContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  comboGlowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  comboGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
    gap: 4,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  comboEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  comboText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  comboStreakBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  comboStreakX: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  comboStreakNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  // 🎨 RENK GEÇİŞ KUTLAMASI STİLLERİ
  colorTransitionOverlay: {
    position: 'absolute',
    bottom: '15%',
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
  },
  colorTransitionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  colorTransitionMascot: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  colorTransitionContent: {
    flex: 1,
    gap: 6,
  },
  colorTransitionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  wordMeaningBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  wordMeaningWord: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  wordMeaningText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  // Session Progress Bar (Kırmızı/Sarı kartlar için)
  sessionProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  sessionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
