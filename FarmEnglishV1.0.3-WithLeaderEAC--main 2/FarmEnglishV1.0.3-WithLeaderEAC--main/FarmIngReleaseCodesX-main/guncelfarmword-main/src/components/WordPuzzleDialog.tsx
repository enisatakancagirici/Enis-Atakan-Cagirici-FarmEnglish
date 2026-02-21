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
  Platform,
  StatusBar,
  TouchableOpacity,
  PanResponder,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Shuffle, RotateCcw, Check } from 'lucide-react-native';
import { WordModel } from '../models/types';
import { haptic, sound } from '../utils/sound';
import { useFarmStore } from '../store/farmStore';
import { usePerformanceStore } from '../store/performanceStore';
import { CardFeedbackAnimation } from './CardFeedbackAnimation';
import { normalizeDisplayText } from '../utils/textNormalization';
import {
  BORDER_STYLES,
  DEFAULT_CUSTOMIZATION,
  getThemeOverlay,
  type CardFontStyle,
} from '../data/cardThemes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NOTCH_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);

// 📱 Responsive breakpoints
const IS_TINY_SCREEN = SCREEN_HEIGHT < 680;
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 750;

// 🎯 COMBO MESSAGES - Apple/TikTok style minimal dopamine hits
const COMBO_MESSAGES = [
  { min: 1, emoji: '✨', text: 'Güzeeel!', color: '#22c55e' },
  { min: 2, emoji: '⚡', text: 'Harikaa!', color: '#3b82f6' },
  { min: 3, emoji: '\u{1F525}', text: 'Yanıyor!', color: '#f97316' },
  { min: 5, emoji: '\u{1F49C}', text: 'Efsaneee!', color: '#a855f7' },
  { min: 8, emoji: '\u{1F451}', text: 'Krallık!', color: '#fbbf24' },
  { min: 10, emoji: '\u{1F48E}', text: 'Mükemmel!', color: '#06b6d4' },
  { min: 15, emoji: '\u{1F984}', text: 'Efsanevi!', color: '#ec4899' },
];

const getComboMessage = (streak: number) => {
  for (let i = COMBO_MESSAGES.length - 1; i >= 0; i--) {
    if (streak >= COMBO_MESSAGES[i].min) return COMBO_MESSAGES[i];
  }
  return COMBO_MESSAGES[0];
};

// 🎨 Category color system matching MiniQuizDialog
type CategoryType = 'red' | 'orange' | 'yellow' | 'green' | 'master' | 'ultra' | 'perfect';

const CATEGORY_COLORS = {
  red: {
    bg: ['#7f1d1d', '#991b1b', '#7f1d1d'] as const,
    border: '#ef4444',
    badge: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.3)',
    text: '#fecaca',
    label: 'KIRMIZI',
    emoji: '\u{1F534}',
    glow: '#ff6b6b',
  },
  orange: {
    bg: ['#7c2d12', '#9a3412', '#7c2d12'] as const,
    border: '#f97316',
    badge: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.3)',
    text: '#fed7aa',
    label: 'TURUNCU',
    emoji: '\u{1F7E0}',
    glow: '#ff9f43',
  },
  yellow: {
    bg: ['#713f12', '#854d0e', '#713f12'] as const,
    border: '#eab308',
    badge: '#eab308',
    badgeBg: 'rgba(234, 179, 8, 0.3)',
    text: '#fef08a',
    label: 'SARI',
    emoji: '\u{1F7E1}',
    glow: '#feca57',
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
  },
  master: {
    bg: ['#78350f', '#92400e', '#78350f'] as const,
    border: '#fbbf24',
    badge: '#fbbf24',
    badgeBg: 'rgba(251, 191, 36, 0.3)',
    text: '#fef3c7',
    label: 'ALTIN',
    emoji: '\u{1F3C6}',
    glow: '#ffd700',
  },
  ultra: {
    bg: ['#1e1b4b', '#312e81', '#1e1b4b'] as const,
    border: '#a78bfa',
    badge: '#a78bfa',
    badgeBg: 'rgba(167, 139, 250, 0.3)',
    text: '#e0e7ff',
    label: 'ELMAS',
    emoji: '\u{1F48E}',
    glow: '#a78bfa',
  },
  perfect: {
    bg: ['#500724', '#831843', '#500724'] as const,
    border: '#f472b6',
    badge: '#f472b6',
    badgeBg: 'rgba(244, 114, 182, 0.3)',
    text: '#fce7f3',
    label: 'KRAL?YET',
    emoji: '\u{1F451}',
    glow: '#f472b6',
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

const getCategoryFromWord = (word: WordModel): CategoryType => {
  // 🧩 PUZZLE RENK SİSTEMİ - puzzleStats'a gre (TARLA'DAN BAĞIMSIZ!)
  const puzzleStats = (word as any).puzzleStats || { sessions: 0, puzzleMasterLevel: 0 };
  const puzzleSessions = puzzleStats.sessions || 0;
  const puzzleMasterLevel = puzzleStats.puzzleMasterLevel || 0; // Tarla masterLevel DEĞİL!

  // Puzzle Master seviyeleri (Tarla'dan bağımsız)
  if (puzzleMasterLevel >= 3) return 'perfect';
  if (puzzleMasterLevel >= 2) return 'ultra';
  if (puzzleMasterLevel >= 1) return 'master';

  // Puzzle session bazlı renkler
  if (puzzleSessions >= 3) return 'green';
  if (puzzleSessions >= 2) return 'yellow';
  if (puzzleSessions >= 1) return 'orange';
  return 'red'; // 0 session = kırmızı
};

// 🎯 CEFR SEVİYESİNE GÖRE ÇARPAN - Daha zor kelimeler daha fazla ödül verir
type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
const CEFR_MULTIPLIER: Record<CEFRLevel, number> = {
  'A1': 1.0,
  'A2': 1.2,
  'B1': 1.5,
  'B2': 1.8,
  'C1': 2.2,
  'C2': 2.5,
};

// 💰 KATEGORİYE GÖRE ÖDÜL - Her doğru cevap için
const REWARD_BY_CATEGORY: Record<CategoryType, { coin: number; xp: number }> = {
  red: { coin: 3, xp: 5 },
  orange: { coin: 4, xp: 6 },
  yellow: { coin: 5, xp: 7 },
  green: { coin: 6, xp: 8 },
  master: { coin: 8, xp: 10 },
  ultra: { coin: 10, xp: 12 },
  perfect: { coin: 12, xp: 15 },
};

// 💰 Her doğru puzzle cevabı için ödül hesapla (kategori + CEFR çarpanı)
const getPuzzleReward = (category: CategoryType, cefrLevel?: string): { coin: number; xp: number } => {
  const base = REWARD_BY_CATEGORY[category] || REWARD_BY_CATEGORY.red;
  const multiplier = CEFR_MULTIPLIER[cefrLevel as CEFRLevel] || 1.0;
  return {
    coin: Math.round(base.coin * multiplier),
    xp: Math.round(base.xp * multiplier),
  };
};

// 🎯 Sonraki seviye - MiniQuizDialog ile aynı
const getNextCategory = (cat: CategoryType): string => {
  switch (cat) {
    case 'red': return 'Turuncu';
    case 'orange': return 'Sarı';
    case 'yellow': return 'Yeşil';
    case 'green': return 'Altın';
    case 'master': return 'Elmas';
    case 'ultra': return 'Kraliyet';
    case 'perfect': return 'MAX';
    default: return 'İleri';
  }
};

// 💧 KART ÜZERİ SU DAMLACIKLARI ANİMASYONU - Seviye artışında (3-4 saniye)
const PuzzleCardWaterDrops = memo<{
  visible: boolean;
  onComplete?: () => void
}>(({ visible, onComplete }) => {
  // 🌧️ Daha fazla damla (16 adet) ve daha uzun süre
  const drops = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      anim: new Animated.Value(0),
      x: 10 + Math.random() * 80, // % pozisyon - daha geniş alan
      delay: i * 180, // Her damla arası 180ms (toplam ~3 saniye)
      size: 12 + Math.random() * 12,
    }))
  ).current;

  const splashAnim = useRef(new Animated.Value(0)).current;
  const growTextAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Damlacıkları sıfırla
    drops.forEach(d => d.anim.setValue(0));
    splashAnim.setValue(0);
    growTextAnim.setValue(0);

    // 🌧️ Sıralı damla animasyonları - daha yavaş düşüş
    const dropAnimations = drops.map(drop =>
      Animated.sequence([
        Animated.delay(drop.delay),
        Animated.timing(drop.anim, {
          toValue: 1,
          duration: 900, // Daha yavaş düşüş
          easing: Easing.bezier(0.2, 0.8, 0.3, 1),
          useNativeDriver: true,
        }),
      ])
    );

    // 🌊 Su birikintisi splash efekti
    const splashAnimation = Animated.sequence([
      Animated.delay(800),
      Animated.spring(splashAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]);

    // 🌱 "BUYUYOR!" yazisi animasyonu
    const textAnimation = Animated.sequence([
      Animated.timing(growTextAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(3500), // 3.5 saniye görünür kal
      Animated.timing(growTextAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);

    Animated.parallel([...dropAnimations, splashAnimation, textAnimation]).start(() => {
      setTimeout(() => onComplete?.(), 500);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={puzzleCardAnimStyles.waterContainer} pointerEvents="none">
      {/* 🌱 "BUYUYOR!" yazisi */}
      <Animated.View
        style={[
          puzzleCardAnimStyles.growTextContainer,
          {
            opacity: growTextAnim,
            transform: [
              { scale: growTextAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] }) },
            ],
          },
        ]}
      >
        <Text style={puzzleCardAnimStyles.growTextEmoji}>{'\u{1F331}'}</Text>
        <Text style={puzzleCardAnimStyles.growText}>BÜYÜYOR!</Text>
      </Animated.View>

      {/* Su damlacıkları */}
      {drops.map(drop => {
        const translateY = drop.anim.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [-30, 60, 70],
        });
        const opacity = drop.anim.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = drop.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 1, 0.3],
        });

        return (
          <Animated.Text
            key={drop.id}
            style={[
              puzzleCardAnimStyles.waterDrop,
              {
                left: `${drop.x}%`,
                fontSize: drop.size,
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
          >
            {'\u{1F4A7}'}
          </Animated.Text>
        );
      })}

      {/* Alt kısımda su birikintisi efekti */}
      <Animated.View
        style={[
          puzzleCardAnimStyles.splashEffect,
          {
            transform: [
              { scaleX: splashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.5] }) },
              { scaleY: splashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }) },
            ],
            opacity: splashAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.7, 0] }),
          },
        ]}
      >
        <Text style={puzzleCardAnimStyles.splashText}>{'\u{1F30A}'}</Text>
      </Animated.View>

      {/* Parlaklık efekti */}
      <Animated.Text
        style={[
          puzzleCardAnimStyles.sparkle,
          {
            opacity: splashAnim.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: splashAnim }],
          },
        ]}
      >
        {'('}
      </Animated.Text>
    </View>
  );
});
PuzzleCardWaterDrops.displayName = 'PuzzleCardWaterDrops';

// 🐛 KART ÜZERİ BÖCEK ANİMASYONU - Seviye düşüşünde
const PuzzleCardBugCrawl = memo<{
  visible: boolean;
  onComplete?: () => void
}>(({ visible, onComplete }) => {
  const bugs = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      posAnim: new Animated.Value(0),
      wiggleAnim: new Animated.Value(0),
      startX: i % 2 === 0 ? -20 : 120, // Sağdan veya soldan giriş
      endX: 20 + Math.random() * 60,
      y: 20 + i * 15,
      delay: i * 150,
      emoji: ['\u{1F41B}', '\u{1FAB2}', '\u{1F41C}', '\u{1F577}️', '\u{1F997}'][i % 5],
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Sıfırla
    bugs.forEach(b => {
      b.posAnim.setValue(0);
      b.wiggleAnim.setValue(0);
    });

    const bugAnimations = bugs.map(bug => {
      // Ana hareket
      const moveAnim = Animated.sequence([
        Animated.delay(bug.delay),
        Animated.timing(bug.posAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]);

      // Kıvrım hareketi
      const wiggleAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(bug.wiggleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bug.wiggleAnim, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bug.wiggleAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      );

      return Animated.parallel([moveAnim, wiggleAnim]);
    });

    Animated.parallel(bugAnimations).start(() => {
      setTimeout(() => onComplete?.(), 300);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={puzzleCardAnimStyles.bugContainer} pointerEvents="none">
      {bugs.map(bug => {
        const translateX = bug.posAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [bug.startX, bug.endX],
        });
        const rotate = bug.wiggleAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: ['-15deg', '0deg', '15deg'],
        });
        const opacity = bug.posAnim.interpolate({
          inputRange: [0, 0.1, 0.8, 1],
          outputRange: [0, 1, 1, 0.3],
        });

        return (
          <Animated.Text
            key={bug.id}
            style={[
              puzzleCardAnimStyles.bugEmoji,
              {
                top: `${bug.y}%`,
                transform: [
                  { translateX },
                  { rotate },
                  { scaleX: bug.startX < 0 ? 1 : -1 }, // Yön
                ],
                opacity,
              },
            ]}
          >
            {bug.emoji}
          </Animated.Text>
        );
      })}

      {/* Kötü his efekti */}
      <Animated.Text
        style={[
          puzzleCardAnimStyles.badVibe,
          {
            opacity: bugs[0].posAnim.interpolate({
              inputRange: [0, 0.3, 0.7, 1],
              outputRange: [0, 0.8, 0.8, 0],
            }),
          },
        ]}
      >
        😰
      </Animated.Text>
    </View>
  );
});
PuzzleCardBugCrawl.displayName = 'PuzzleCardBugCrawl';

// 🎨 Kart üzeri animasyon stilleri
const puzzleCardAnimStyles = StyleSheet.create({
  waterContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 100,
  },
  waterDrop: {
    position: 'absolute',
    top: 0,
  },
  splashEffect: {
    position: 'absolute',
    bottom: 5,
    left: '50%',
    marginLeft: -20,
  },
  splashText: {
    fontSize: 28,
  },
  sparkle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
    fontSize: 24,
  },
  growTextContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    flexDirection: 'row',
  },
  growTextEmoji: {
    fontSize: 24,
    marginRight: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  growText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00C853',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bugContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 100,
  },
  bugEmoji: {
    position: 'absolute',
    fontSize: 18,
    left: 0,
  },
  badVibe: {
    position: 'absolute',
    bottom: 5,
    right: 10,
    fontSize: 20,
  },
});

// 💰 PUZZLE ÖDÜL TOAST BİLEŞENİ - Her doğru cevapta gösterilir
const PuzzleRewardToast = memo<{
  coin: number;
  xp: number;
  visible: boolean;
  category: CategoryType;
}>(({ coin, xp, visible, category }) => {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible && coin > 0) {
      // Reset
      translateY.setValue(50);
      opacity.setValue(0);
      scale.setValue(0.5);

      // Animate in with bounce
      Animated.parallel([
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
      ]).start();

      // Fade out after delay
      const timeout = setTimeout(() => {
        Animated.parallel([
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
        ]).start();
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [visible, coin]);

  if (!visible || coin === 0) return null;

  const catColor = CATEGORY_COLORS[category]?.border || '#22c55e';

  return (
    <Animated.View
      style={[
        puzzleRewardToastStyles.container,
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
        style={puzzleRewardToastStyles.gradient}
      >
        <View style={puzzleRewardToastStyles.content}>
          <Text style={puzzleRewardToastStyles.emoji}>{'\u{1F4B0}'}</Text>
          <Text style={[puzzleRewardToastStyles.text, { color: '#fbbf24' }]}>+{coin}</Text>
          <Text style={puzzleRewardToastStyles.separator}>{'•'}</Text>
          <Text style={puzzleRewardToastStyles.emoji}>{'⚡'}</Text>
          <Text style={[puzzleRewardToastStyles.text, { color: '#a78bfa' }]}>+{xp} XP</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});
PuzzleRewardToast.displayName = 'PuzzleRewardToast';

const puzzleRewardToastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    zIndex: 1000,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  separator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 2,
  },
});

// 🧩 Word Token Button - Animated pill for word bank
const WordToken = memo<{
  word: string;
  index: number;
  isSelected: boolean;
  isInSentence: boolean;
  onPress: () => void;
  category: CategoryType;
  animKey: number;
}>(({ word, index, isSelected, isInSentence, onPress, category, animKey }) => {
  const catColors = CATEGORY_COLORS[category];
  const scaleAnim = useRef(new Animated.Value(isInSentence ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Entry animation - sadece seçili olmayan tokenlar için
  useEffect(() => {
    if (!isInSentence) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        delay: index * 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Seçili tokenlar için animasyon yok, direkt görünsün
      scaleAnim.setValue(1);
    }
  }, [animKey, isInSentence]);

  // Idle glow
  useEffect(() => {
    if (!isInSentence) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [isInSentence]);

  const handlePressIn = useCallback(() => {
    haptic.selection();
    Animated.spring(pressAnim, { toValue: 0.9, speed: 50, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, []);

  const handlePress = useCallback(() => {
    if (isInSentence) return;
    haptic.light();
    sound.playTap();
    // Bounce effect
    Animated.sequence([
      Animated.spring(pressAnim, { toValue: 1.15, speed: 50, useNativeDriver: true }),
      Animated.spring(pressAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress();
  }, [isInSentence, onPress]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

  return (
    <Animated.View style={[
      styles.tokenWrapper,
      {
        transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }],
        opacity: scaleAnim, // isInSentence olsa bile görünsün, sadece stil değişsin
      }
    ]}>
      {!isInSentence && (
        <Animated.View style={[
          styles.tokenGlow,
          { backgroundColor: catColors.glow, opacity: glowOpacity }
        ]} />
      )}
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isInSentence}
      >
        <LinearGradient
          colors={isInSentence
            ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)']
            : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
          style={[
            styles.tokenButton,
            { borderColor: isInSentence ? 'rgba(255,255,255,0.1)' : `${catColors.badge}60` }
          ]}
        >
          <Text style={[
            styles.tokenText,
            isInSentence && { color: 'rgba(255,255,255,0.3)' }
          ]}>{word}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});
WordToken.displayName = 'WordToken';

// 🧩 Sentence Token - Selected word in sentence area
const SentenceToken = memo<{
  word: string;
  index: number;
  onPress: () => void;
  category: CategoryType;
  isCorrect?: boolean | null;
}>(({ word, index, onPress, category, isCorrect }) => {
  const catColors = CATEGORY_COLORS[category];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, []);

  // Shake on wrong
  useEffect(() => {
    if (isCorrect === false) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [isCorrect]);

  const handlePress = useCallback(() => {
    if (isCorrect !== null) return; // Can't remove during check
    haptic.light();
    sound.playTap();
    onPress();
  }, [isCorrect, onPress]);

  const bgColor = isCorrect === true
    ? 'rgba(34, 197, 94, 0.4)'
    : isCorrect === false
      ? 'rgba(239, 68, 68, 0.4)'
      : `${catColors.badge}30`;

  const borderColor = isCorrect === true
    ? '#22c55e'
    : isCorrect === false
      ? '#ef4444'
      : catColors.badge;

  return (
    <Animated.View style={{
      transform: [
        { scale: Animated.multiply(scaleAnim, pressAnim) },
        { translateX: shakeAnim }
      ],
    }}>
      <Pressable onPress={handlePress}>
        <View style={[
          styles.sentenceToken,
          { backgroundColor: bgColor, borderColor }
        ]}>
          <Text style={[
            styles.sentenceTokenText,
            isCorrect === true && { color: '#22c55e' },
            isCorrect === false && { color: '#ef4444' },
          ]}>{word}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});
SentenceToken.displayName = 'SentenceToken';

interface WordPuzzleDialogProps {
  visible: boolean;
  words: WordModel[]; // Eligible words (from farm/inventory with examples)
  onClose: () => void;
  onComplete?: (stats: { correct: number; wrong: number; combo: number }) => void;
}

// 🔧 Tokenize sentence into words (preserving punctuation attached)
const tokenizeSentence = (sentence: string): string[] => {
  // Split by spaces, keep punctuation attached to words
  return sentence.split(/\s+/).filter(w => w.length > 0);
};

// 🔀 Fisher-Yates shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const WordPuzzleDialog: React.FC<WordPuzzleDialogProps> = memo(({ visible, words, onClose, onComplete }) => {
  // 🎯 Store - puzzle stat güncelleme ve coin ekleme
  const updateWordPuzzleStat = useFarmStore((state) => state.updateWordPuzzleStat);
  const addCoins = useFarmStore((state) => state.addCoins);
  const addXp = useFarmStore((state) => state.addXp);
  const setCardFeedback = useFarmStore((state) => state.setCardFeedback);
  const addPuzzleScore = useFarmStore((state) => state.addPuzzleScore);
  const queueQuestProgress = useFarmStore((state) => state.queueQuestProgress);
  const guidedModeActive = useFarmStore((state) => state.guidedModeActive);
  const guidedModeStep = useFarmStore((state) => state.guidedModeStep);
  const guidedModeTargetWordId = useFarmStore((state) => state.guidedModeTargetWordId);
  const guidedModeTargetWordText = useFarmStore((state) => state.guidedModeTargetWordText);
  const stopGuidedMode = useFarmStore((state) => state.stopGuidedMode);
  const activeCardTheme = useFarmStore((state) => state.activeCardTheme);
  const cardCustomization = useFarmStore((state) => state.cardCustomization);
  const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
  const cardScaleMultiplier = getCardSizeMultiplier(!!safeCustomization.compactMode, !!safeCustomization.largeMode);
  const borderPreset = BORDER_STYLES[safeCustomization.borderStyle || 'default'] || BORDER_STYLES.default;
  const fontStyleOverride = getFontStyle(safeCustomization.fontStyle || 'default');
  const isSoilBackground = safeCustomization.backgroundStyle === 'soil';
  const overlayTheme = !isSoilBackground && activeCardTheme !== 'default' ? getThemeOverlay(activeCardTheme) : null;

  // 📱 State
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]); // Index bazlı - "the the" bug fix
  const [shuffledTokens, setShuffledTokens] = useState<string[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0); // En yüksek combo
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; emoji: string }>>([]);
  const [showResultScreen, setShowResultScreen] = useState(false); // 🏆 Sonuç ekranı

  // 🌱 Son doğru cevap verilen kelime ID'si - Puzzle kapandığında çiftliğe feedback göndermek için
  const lastCorrectWordIdRef = useRef<string | null>(null);
  const lastEnglishPromptWordRef = useRef<string | null>(null);

  // 💧🐛 SEVİYE DEĞİŞİM ANİMASYONU - Yapboz bitişinde gösterilir
  const [levelFeedback, setLevelFeedback] = useState<{ type: 'levelUp' | 'levelDown'; visible: boolean }>({
    type: 'levelUp',
    visible: false
  });

  // 💰 ÖDÜL TOAST STATE - Her doğru cevapta gösterilir
  const [rewardToast, setRewardToast] = useState<{ coin: number; xp: number; visible: boolean; key: number }>({
    coin: 0,
    xp: 0,
    visible: false,
    key: 0
  });

  // Seçilen kelimeler (render için)
  const isGuidedPuzzleStep = guidedModeActive && guidedModeStep === 'PUZZLE_PRACTICE';
  const isGuidedPuzzleStepRef = useRef(isGuidedPuzzleStep);
  const guidedTargetWordKey = useMemo(
    () => normalizeDisplayText(guidedModeTargetWordText).trim().toLowerCase(),
    [guidedModeTargetWordText]
  );
  const isGuidedTargetWord = useCallback((word?: WordModel | null) => {
    const safeId = typeof (word as any)?.id === 'string' ? (word as any).id.trim() : '';
    if (guidedModeTargetWordId && safeId && safeId === guidedModeTargetWordId) return true;
    const safeText = normalizeDisplayText((word as any)?.text || (word as any)?.verb).trim().toLowerCase();
    return !!guidedTargetWordKey && !!safeText && guidedTargetWordKey === safeText;
  }, [guidedModeTargetWordId, guidedTargetWordKey]);

  useEffect(() => {
    isGuidedPuzzleStepRef.current = isGuidedPuzzleStep;
  }, [isGuidedPuzzleStep]);

  const selectedWords = useMemo(() => selectedIndices.map(i => shuffledTokens[i]), [selectedIndices, shuffledTokens]);

  // 🎬 Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const glowPulseAnim = useRef(new Animated.Value(0)).current;
  const comboScaleAnim = useRef(new Animated.Value(0)).current;
  const comboOpacityAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  // 👆 Swipe gesture - SADECE YATAY hareket için, dikey scroll'a karışma
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Başlangıçta false - scroll'a öncelik
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isGuidedPuzzleStepRef.current) return false;
        // Sadece yatay hareket belirgin olduğunda pan'i al
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
        return isHorizontal && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderTerminationRequest: () => true, // Scroll isterse bırak
      onPanResponderMove: (_, gestureState) => {
        if (isGuidedPuzzleStepRef.current) return;
        swipeAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isGuidedPuzzleStepRef.current) {
          Animated.spring(swipeAnim, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }).start();
          return;
        }
        const SWIPE_THRESHOLD = 80;

        if (gestureState.dx > SWIPE_THRESHOLD && currentWordIndex < words.length - 1) {
          // Sağa kaydır - sonraki kelime
          haptic.selection();
          Animated.timing(swipeAnim, { toValue: SCREEN_WIDTH, duration: 200, useNativeDriver: true }).start(() => {
            setCurrentWordIndex(i => i + 1);
            swipeAnim.setValue(-SCREEN_WIDTH);
            Animated.spring(swipeAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }).start();
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD && currentWordIndex > 0) {
          // Sola kaydır - önceki kelime
          haptic.selection();
          Animated.timing(swipeAnim, { toValue: -SCREEN_WIDTH, duration: 200, useNativeDriver: true }).start(() => {
            setCurrentWordIndex(i => i - 1);
            swipeAnim.setValue(SCREEN_WIDTH);
            Animated.spring(swipeAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }).start();
          });
        } else {
          // Yetersiz kaydırma, geri dön
          Animated.spring(swipeAnim, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Current word
  const currentWord = words[currentWordIndex];
  const getEnglishSpeechText = useCallback((word?: WordModel | null): string => {
    if (!word) return '';
    const sentenceEn = normalizeDisplayText((word as any).example);
    if (sentenceEn) return sentenceEn;
    return normalizeDisplayText((word as any).text || (word as any).verb || '');
  }, []);
  const speakEnglishSentence = useCallback((word?: WordModel | null) => {
    const speechText = getEnglishSpeechText(word);
    if (!speechText) return;
    sound.speakSentence(speechText, 'en-US', { rate: 0.96 });
  }, [getEnglishSpeechText]);
  const getTurkishSpeechText = useCallback((word?: WordModel | null): string => {
    if (!word) return '';
    const sentenceTr = normalizeDisplayText((word as any).example_tr);
    if (sentenceTr) return sentenceTr;
    const meaningTr = normalizeDisplayText((word as any).meaning);
    if (meaningTr) return meaningTr;
    return normalizeDisplayText((word as any).example);
  }, []);
  const speakTurkishMeaning = useCallback((word?: WordModel | null) => {
    const speechText = getTurkishSpeechText(word);
    if (!speechText) return;
    sound.speakSentence(speechText, 'tr-TR', { rate: 1.06 });
  }, [getTurkishSpeechText]);
  const category = currentWord ? getCategoryFromWord(currentWord) : 'yellow';
  const catColors = useMemo(() => {
    const base = CATEGORY_COLORS[category];
    const overlayBase = overlayTheme
      ? {
        ...base,
        border: overlayTheme.borderColor,
        glow: overlayTheme.borderGlow,
      }
      : base;

    if (!isSoilBackground) return overlayBase;

    return {
      ...overlayBase,
      bg: ['#24150f', '#3d2a24', '#1c120d'] as const,
      border: 'rgba(121, 85, 72, 0.86)',
      badge: '#a1887f',
      badgeBg: 'rgba(93, 64, 55, 0.55)',
      text: '#f7efe4',
      glow: '#6d4c41',
      emoji: '🌾',
      label: 'TOPRAK',
    };
  }, [category, overlayTheme, isSoilBackground]);

  // Correct sentence tokens
  const correctTokens = useMemo(() => {
    if (!currentWord?.example) return [];
    return tokenizeSentence(currentWord.example);
  }, [currentWord?.example]);

  // Initialize shuffled tokens when word changes
  useEffect(() => {
    if (currentWord?.example) {
      const tokens = tokenizeSentence(currentWord.example);
      setShuffledTokens(shuffleArray(tokens));
      setSelectedIndices([]); // Index bazlı reset
      setShowResult(null);
      setAnimKey(k => k + 1);
    }
  }, [currentWord?.id, currentWord?.example]);

  // 🎬 Entry/Exit animations - Optimized for performance
  useEffect(() => {
    let glowLoop: Animated.CompositeAnimation | null = null;

    if (visible && words.length > 0) {
      // Reset state
      setCurrentWordIndex(0);
      setCombo(0);
      setMaxCombo(0);
      setTotalCorrect(0);
      setTotalWrong(0);
      setParticles([]);
      setShowCombo(false);
      setShowResultScreen(false);
      swipeAnim.setValue(0);

      // 🔄 REF CACHE TEMİZLE - Eski kelime ID'si yeni puzzle'ı etkilemesin!
      lastCorrectWordIdRef.current = null;

      // Entry animation
      haptic.quizOpen();
      sound.playQuizStart();

      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();

      // Glow pulse loop
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowPulseAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      glowLoop.start();
    } else {
      // 🔄 Dialog kapandığında ref'i temizle - cache sorunu önlenir
      lastCorrectWordIdRef.current = null;
      lastEnglishPromptWordRef.current = null;
    }

    return () => {
      // Cleanup all animations on unmount/close
      if (glowLoop) glowLoop.stop();
      slideAnim.stopAnimation();
      scaleAnim.stopAnimation();
      backdropAnim.stopAnimation();
      cardSlideAnim.stopAnimation();
      shakeAnim.stopAnimation();
      flashAnim.stopAnimation();
      comboScaleAnim.stopAnimation();
      comboOpacityAnim.stopAnimation();
      swipeAnim.stopAnimation();
    };
  }, [visible, words.length, speakEnglishSentence]);

  useEffect(() => {
    if (!visible || !currentWord) return;
    const promptKey = currentWord.id || `word-${currentWordIndex}`;
    if (lastEnglishPromptWordRef.current === promptKey) return;
    lastEnglishPromptWordRef.current = promptKey;
    const timeout = setTimeout(() => {
      speakEnglishSentence(currentWord);
    }, 260);
    return () => clearTimeout(timeout);
  }, [visible, currentWord, currentWordIndex, speakEnglishSentence]);

  // 🚪 Final close - MiniQuizDialog gibi ANINDA kapat (animasyonsuz)
  const handleFinalClose = useCallback(() => {
    // Animasyon yok, direkt kapat
    setParticles([]);
    setShowCombo(false);
    setShowResultScreen(false);
    lastEnglishPromptWordRef.current = null;

    // 🌱 ÇİFTLİK KARTINA FEEDBACK - Puzzle kapandıktan SONRA gönder
    // MiniQuizDialog ile aynı mantık - onClose'dan sonra 50ms delay
    const wordIdToFeedback = lastCorrectWordIdRef.current;

    onClose();

    // Puzzle kapandıktan sonra feedback gönder
    if (wordIdToFeedback) {
      setTimeout(() => {
        setCardFeedback({ wordId: wordIdToFeedback, type: 'levelUp' });
        lastCorrectWordIdRef.current = null;
      }, 50);
    }
  }, [onClose, setCardFeedback]);

  // 🚪 X butonuna basınca - direkt kapat (result screen yok)
  const handleExit = useCallback(() => {
    if (isGuidedPuzzleStep) {
      Alert.alert(
        'Müfredatı Sonlandır',
        'Hedef kelime adımı bitmeden çıkarsan yönlendirme akışı kapanır.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sonlandır',
            style: 'destructive',
            onPress: () => {
              haptic.medium();
              stopGuidedMode();
              onComplete?.({ correct: totalCorrect, wrong: totalWrong, combo: maxCombo });
              handleFinalClose();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    haptic.medium();
    onComplete?.({ correct: totalCorrect, wrong: totalWrong, combo: maxCombo });
    handleFinalClose();
  }, [handleFinalClose, isGuidedPuzzleStep, maxCombo, onComplete, stopGuidedMode, totalCorrect, totalWrong]);

  // 🎯 Handle token selection from word bank (index bazlı)
  const handleTokenSelect = useCallback((tokenIndex: number) => {
    if (showResult) return;
    setSelectedIndices(prev => [...prev, tokenIndex]);
  }, [showResult]);

  // 🎯 Handle token removal from sentence (seçim sırasındaki index)
  const handleTokenRemove = useCallback((selectionIndex: number) => {
    if (showResult) return;
    setSelectedIndices(prev => prev.filter((_, i) => i !== selectionIndex));
  }, [showResult]);

  // 🔀 Reshuffle tokens - seçimleri koru
  const handleReshuffle = useCallback(() => {
    if (showResult) return;
    haptic.medium();
    sound.playTap();
    // Seçili kelimeleri hatırla
    const selectedWordTexts = selectedIndices.map(i => shuffledTokens[i]);
    const newShuffled = shuffleArray([...shuffledTokens]);
    setShuffledTokens(newShuffled);
    // Seçimleri yeni indexlere eşle
    const newIndices: number[] = [];
    const usedIndices = new Set<number>();
    selectedWordTexts.forEach(word => {
      const newIdx = newShuffled.findIndex((w, i) => w === word && !usedIndices.has(i));
      if (newIdx !== -1) {
        newIndices.push(newIdx);
        usedIndices.add(newIdx);
      }
    });
    setSelectedIndices(newIndices);
    setAnimKey(k => k + 1);
  }, [shuffledTokens, selectedIndices, showResult]);

  // 🔄 Reset current puzzle
  const handleReset = useCallback(() => {
    if (showResult) return;
    haptic.light();
    setSelectedIndices([]);
  }, [showResult]);

  // ✅ Check answer
  const handleCheck = useCallback(() => {
    if (selectedWords.length !== correctTokens.length) {
      haptic.warning();
      return;
    }

    const isCorrect = selectedWords.every((word, i) => word === correctTokens[i]);

    if (isCorrect) {
      // 🎉 CORRECT! - ULTRA PREMIUM DOPAMIN CELEBRATION
      setShowResult('correct');
      setTotalCorrect(c => c + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));

      // 🎯 GÜNLÜK GÖREV - Puzzle tamamlandı!
      setTimeout(() => {
        try {
          queueQuestProgress('COMPLETE_PUZZLE', 1, 'add');
        } catch (error) {
        }
      }, 0);

      // 🧩 PUZZLE STAT GÜNCELLE - Seviye atlama için!
      if (currentWord?.id) {
        try {
          updateWordPuzzleStat(currentWord.id, true);
        } catch (error) {
        }

        // 💧 SULAMA ANİMASYONU - Yapboz içi lokal animasyon
        setLevelFeedback({ type: 'levelUp', visible: true });

        // 🌱 Son doğru cevap verilen kelimeyi kaydet - Puzzle kapandığında çiftliğe feedback gönderilecek
        lastCorrectWordIdRef.current = currentWord.id;
      }

      // 💰 ÖDÜL VER - Her doğru cevap için coin ve XP (CEFR'e göre çarpan uygulanır)
      const category = getCategoryFromWord(currentWord);
      const reward = getPuzzleReward(category, currentWord?.difficulty);
      addCoins(reward.coin);
      addXp(reward.xp);

      // 🧩 PUZZLE SKORU GÜNCELLE (Firebase liderlik tablosu için)
      addPuzzleScore(reward.coin);

      // 💰 ÖDÜL TOAST GÖSTER
      setRewardToast(prev => ({
        coin: reward.coin,
        xp: reward.xp,
        visible: true,
        key: prev.key + 1
      }));

      // ⚡ IMMEDIATE MULTI-HAPTIC
      haptic.success();

      // 🔥 SCREEN FLASH - subtle
      flashAnim.setValue(0.6);
      Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();

      // 🎆 Minimal particles - sadece combo 3+ için ve performans ayarına göre
      const { config, getParticleCount } = usePerformanceStore.getState();
      if (newCombo >= 3 && config.particleCount > 0) {
        const minimalEmojis = ['✨', '💫'];
        const baseCount = Math.min(3, Math.floor(newCombo / 3));
        const particleCount = getParticleCount(baseCount);
        if (particleCount > 0) {
          const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: Date.now() + i,
            x: SCREEN_WIDTH * 0.2 + Math.random() * SCREEN_WIDTH * 0.6,
            y: 100 + Math.random() * 80,
            emoji: minimalEmojis[i % minimalEmojis.length],
          }));
          setParticles(newParticles);
        }
      }

      // 🔊 SOUND - combo bazlı
      if (newCombo >= 5) {
        sound.playStreak(newCombo);
      } else {
        sound.playCorrect();
      }

      // 🗣️ CÜMLE SESLENDIR - Doğru cevap verilince (örnek cümle)
      setTimeout(() => {
        speakTurkishMeaning(currentWord);
      }, 300);

      // ⚡ Haptic - sadeleştirilmiş
      if (newCombo >= 5) {
        setTimeout(() => haptic.heavy(), 80);
      }

      // 🏆 COMBO CELEBRATION - hızlı, minimal
      setShowCombo(true);
      comboScaleAnim.setValue(0.5);
      comboOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(comboScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 200,
          useNativeDriver: true
        }),
        Animated.timing(comboOpacityAnim, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true
        }),
      ]).start();

      // 🎯 MILESTONE - sadece haptic, particle yok
      if (newCombo > 0 && newCombo % 5 === 0) {
        setTimeout(() => haptic.celebration(), 100);
      }

      // Clean particles after celebration
      setTimeout(() => setParticles([]), 600);

      // Auto-advance to next word - guided adimda manuel onay zorunlu
      setTimeout(() => {
        if (isGuidedPuzzleStep && isGuidedTargetWord(currentWord)) {
          setShowCombo(false);
          const guidedWordLabel = normalizeDisplayText(
            (currentWord as any)?.text || (currentWord as any)?.verb || "hedef kelime"
          );
          Alert.alert(
            'Adım Tamamlandı',
            `"${guidedWordLabel}" için yapboz adımı bitti. Devam ile SesYap aşamasına geçeceğiz.`,
            [
              {
                text: "Devam",
                onPress: () => {
                  onComplete?.({
                    correct: totalCorrect + 1,
                    wrong: totalWrong,
                    combo: Math.max(maxCombo, newCombo),
                  });
                  handleFinalClose();
                },
              },
            ],
            { cancelable: false }
          );
          return;
        }

        setShowCombo(false);

        if (currentWordIndex < words.length - 1) {
          cardSlideAnim.setValue(0);
          haptic.light();
          setCurrentWordIndex(i => i + 1);
        } else {
          // ALL WORDS COMPLETED
          haptic.celebration();
          sound.playHarvest();

          setTimeout(() => haptic.success(), 100);

          setTimeout(() => {
            onComplete?.({ correct: totalCorrect + 1, wrong: totalWrong, combo: maxCombo });
            handleFinalClose();
          }, 300);
        }
      }, 400); // Daha hizli gecis

    } else {
      // ❌ WRONG! - ULTRA INTENSE FEEDBACK
      setShowResult('wrong');
      setTotalWrong(w => w + 1);
      setCombo(0);

      // 🐛 BÖCEK ANİMASYONU - Yapboz içi lokal animasyon
      // NOT: setCardFeedback KULLANILMIYOR - çiftlikteki kartları etkilemesin!
      setLevelFeedback({ type: 'levelDown', visible: true });

      // 🧩 PUZZLE STAT GÜNCELLE - Yanlış cevap
      if (currentWord?.id) {
        try {
          updateWordPuzzleStat(currentWord.id, false);
        } catch (error) {
        }
      }

      // Immediate double haptic burst
      haptic.error();
      setTimeout(() => haptic.heavy(), 40);
      sound.playWrong();

      // Extra staggered haptics for shake emphasis
      setTimeout(() => haptic.heavy(), 100);
      setTimeout(() => haptic.medium(), 180);
      setTimeout(() => haptic.light(), 260);

      // SCREEN SHAKE - daha kısa ve yoğun
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      // Reset after shake - yanlış kelime daha uzun gösterilsin
      setTimeout(() => {
        setShowResult(null);
        setSelectedIndices([]);
      }, 1600);
    }
  }, [selectedWords, correctTokens, combo, maxCombo, currentWordIndex, words.length, totalCorrect, totalWrong, handleExit, handleFinalClose, onComplete, currentWord, updateWordPuzzleStat, queueQuestProgress, isGuidedPuzzleStep, isGuidedTargetWord]);

  // 🎯 Navigate between words (swipe simulation)
  const handlePrevWord = useCallback(() => {
    if (currentWordIndex > 0) {
      haptic.selection();
      setCurrentWordIndex(i => i - 1);
    }
  }, [currentWordIndex]);

  const handleNextWord = useCallback(() => {
    if (currentWordIndex < words.length - 1) {
      haptic.selection();
      setCurrentWordIndex(i => i + 1);
    }
  }, [currentWordIndex, words.length]);

  const glowOpacity = glowPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  const comboMessage = getComboMessage(combo);

  // Güvenlik: visible ama word yoksa null dön
  if (!visible) return null;
  if (!currentWord && !showResultScreen) {
    // Açılma sırasında kısa gecikme olabilir, Modal'ı render et ama içi boş
    return (
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleExit}>
        <View style={styles.backdrop}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
      </Modal>
    );
  }

  const usableHeight = SCREEN_HEIGHT - NOTCH_HEIGHT - 16;
  const baseModalHeight = IS_TINY_SCREEN ? usableHeight : IS_SMALL_SCREEN ? usableHeight - 4 : usableHeight - 8;
  const modalMaxHeight = Math.min(
    usableHeight,
    baseModalHeight * (safeCustomization.largeMode ? 1.03 : safeCustomization.compactMode ? 0.94 : 1)
  );
  const dialogScale = safeCustomization.largeMode ? 1.04 : safeCustomization.compactMode ? 0.93 : 1;

  // 📊 Sonuç hesapları
  const totalAnswered = totalCorrect + totalWrong;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const resultEmoji = accuracy >= 90 ? '\u{1F3C6}' : accuracy >= 70 ? '\u{1F31F}' : accuracy >= 50 ? '\u{1F4AA}' : '\u{1F4DA}';
  const resultTitle = accuracy >= 90 ? 'MUHTEŞEM!' : accuracy >= 70 ? 'HARİKA!' : accuracy >= 50 ? 'İYİ!' : 'DEVAM ET!';
  const resultColor = accuracy >= 90 ? '#fbbf24' : accuracy >= 70 ? '#22c55e' : accuracy >= 50 ? '#3b82f6' : '#f97316';
  const resultGradient = accuracy >= 90
    ? ['#fbbf24', '#f59e0b', '#d97706'] as const
    : accuracy >= 70
      ? ['#22c55e', '#16a34a', '#15803d'] as const
      : accuracy >= 50
        ? ['#3b82f6', '#2563eb', '#1d4ed8'] as const
        : ['#f97316', '#ea580c', '#c2410c'] as const;

  // 🏆 COMPACT SONUÇ EKRANI - Quiz sonucu gibi basit
  if (showResultScreen) {
    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleFinalClose}>
        <View style={styles.resultBackdrop}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

          <View style={styles.compactResultCard}>
            <LinearGradient
              colors={['rgba(25,25,50,0.98)', 'rgba(15,15,40,0.99)']}
              style={styles.compactResultGradient}
            >
              {/* 🏆 Emoji + Title */}
              <Text style={styles.compactEmoji}>{resultEmoji}</Text>
              <Text style={styles.compactTitle}>{resultTitle}</Text>

              {/* ✨ Stats Row - Yapbozdaki doğru/yanlış */}
              <View style={styles.compactStatsRow}>
                <View style={styles.compactStatItem}>
                  <Text style={[styles.compactStatNum, { color: '#4ade80' }]}>{totalCorrect}</Text>
                  <Text style={styles.compactStatLabel}>{'✓'} Dogru</Text>
                </View>
                <View style={styles.compactStatDivider} />
                <View style={styles.compactStatItem}>
                  <Text style={[styles.compactStatNum, { color: '#f87171' }]}>{totalWrong}</Text>
                  <Text style={styles.compactStatLabel}>{'✗'} Yanlis</Text>
                </View>
                <View style={styles.compactStatDivider} />
                <View style={styles.compactStatItem}>
                  <Text style={[styles.compactStatNum, { color: '#c084fc' }]}>{maxCombo}x</Text>
                  <Text style={styles.compactStatLabel}>{'\u{1F525}'} Combo</Text>
                </View>
              </View>

              {/* 📊 Accuracy Bar */}
              <View style={styles.compactAccuracyWrap}>
                <Text style={[styles.compactAccuracyText, { color: resultColor }]}>%{accuracy} Basari</Text>
                <View style={styles.compactAccuracyBar}>
                  <View style={[styles.compactAccuracyFill, { width: `${accuracy}%`, backgroundColor: resultColor }]} />
                </View>
              </View>

              {/* 🎯 Buttons */}
              <View style={styles.compactButtons}>
                <TouchableOpacity
                  style={styles.compactSecondaryBtn}
                  onPress={() => {
                    haptic.light();
                    setCurrentWordIndex(0);
                    setTotalCorrect(0);
                    setTotalWrong(0);
                    setCombo(0);
                    setMaxCombo(0);
                    setShowResultScreen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.compactSecondaryText}>{'\u{1F504}'} Tekrar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.compactPrimaryBtn}
                  onPress={() => {
                    haptic.success();
                    handleFinalClose();
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={resultGradient} style={styles.compactPrimaryGradient}>
                    <Text style={styles.compactPrimaryText}>{'✓'} Tamamla</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleExit}>
      {/* 💧🐛 Seviye Değişim Animasyonu - Yapboz bitişinde gösterilir */}
      <CardFeedbackAnimation
        type={levelFeedback.type}
        visible={levelFeedback.visible}
        onComplete={() => setLevelFeedback(prev => ({ ...prev, visible: false }))}
      />

      {/* 💰 ÖDÜL TOAST - Her doğru cevapta gösterilir */}
      <PuzzleRewardToast
        key={rewardToast.key}
        coin={rewardToast.coin}
        xp={rewardToast.xp}
        visible={rewardToast.visible}
        category={category}
      />

      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleExit} />
      </Animated.View>

      {/* 🎆 Particle Effects - Limited for performance */}
      {particles.slice(0, 15).map((particle) => (
        <Animated.Text
          key={particle.id}
          style={[
            styles.particle,
            { left: particle.x, top: particle.y }
          ]}
        >
          {particle.emoji}
        </Animated.Text>
      ))}

      {/* ⚡ Flash Effect */}
      <Animated.View
        style={[
          styles.flash,
          { opacity: flashAnim, backgroundColor: showResult === 'correct' ? '#22c55e' : 'transparent' }
        ]}
        pointerEvents="none"
      />

      <View style={styles.safeArea} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dialogWrapper,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
                { scale: dialogScale },
                { translateX: Animated.add(Animated.add(cardSlideAnim, shakeAnim), swipeAnim) },
              ],
              maxHeight: modalMaxHeight,
            }
          ]}
          {...panResponder.panHandlers}
        >
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
                borderRadius: borderPreset.borderRadius,
                borderWidth: borderPreset.borderWidth,
              },
            ]}
          >
            <ScrollView
	              showsVerticalScrollIndicator={false}
	              bounces={false}
	              nestedScrollEnabled={true}
	              scrollEventThrottle={16}
	              contentContainerStyle={[
	                styles.dialogContent,
	                {
	                  padding: Math.max(10, Math.round((IS_TINY_SCREEN ? 12 : IS_SMALL_SCREEN ? 14 : 16) * cardScaleMultiplier)),
	                  paddingBottom: Math.max(16, Math.round(24 * cardScaleMultiplier)),
	                },
	              ]}
	            >
                            {/* Header */}
              <View style={styles.header}>
                {safeCustomization.showEmoji && <Text style={styles.headerEmoji}>{'\u{1F9E9}'}</Text>}
                <Text style={[styles.headerTitle, fontStyleOverride]}>KELİME YAPBOZU</Text>
                {safeCustomization.showEmoji && <Text style={styles.headerEmoji}>{'\u{1F9E9}'}</Text>}
              </View>

              {/* Close button */}
              <Pressable style={styles.closeButton} onPress={handleExit}>
                <X size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>

                            {/* Category Badge + Sonraki Seviye */}
              <View style={[styles.categoryBadge, { backgroundColor: catColors.badgeBg, borderColor: catColors.border }]}>
                {safeCustomization.showEmoji && <Text style={styles.categoryEmoji}>{catColors.emoji}</Text>}
                <Text style={[styles.categoryText, { color: catColors.text }, fontStyleOverride]}>{catColors.label}</Text>
                <Text style={[styles.nextLevelText, { color: `${catColors.text}99` }, fontStyleOverride]}>→ {getNextCategory(category)}</Text>
              </View>

              {safeCustomization.showProgressBar && (
                <View style={styles.progressContainer}>
                  <Text style={[styles.progressText, fontStyleOverride]}>
                    İlerleme: {currentWordIndex + 1}/{words.length}
                  </Text>
                  <View style={[styles.progressBar, { borderColor: `${catColors.badge}50` }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.round(((currentWordIndex + 1) / Math.max(1, words.length)) * 100)}%`,
                          backgroundColor: catColors.badge,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Word Display */}
              <View style={[styles.wordContainer, { overflow: 'visible' }]}>
                {/* 💧 Su damlacıkları animasyonu - Seviye artışında */}
                <PuzzleCardWaterDrops
                  visible={levelFeedback.type === 'levelUp' && levelFeedback.visible}
                  onComplete={() => setLevelFeedback(prev => ({ ...prev, visible: false }))}
                />

                {/* 🐛 Böcek animasyonu - Seviye düşüşünde */}
                <PuzzleCardBugCrawl
                  visible={levelFeedback.type === 'levelDown' && levelFeedback.visible}
                  onComplete={() => setLevelFeedback(prev => ({ ...prev, visible: false }))}
                />

                <Text style={[styles.wordText, { color: catColors.text }, fontStyleOverride]}>
                  {normalizeDisplayText(currentWord.text || currentWord.verb)}
                </Text>
                <Text style={[styles.wordMeaning, { color: `${catColors.text}99` }, fontStyleOverride]}>
                  {normalizeDisplayText(currentWord.meaning)}
                </Text>
              </View>

              {/* Turkish Hint */}
              <View style={[styles.hintContainer, { borderColor: `${catColors.badge}40` }]}>
                <Text style={[styles.hintLabel, fontStyleOverride]}>🇹🇷 Türkçe Cümle:</Text>
                <Text style={[styles.hintText, { color: catColors.text }, fontStyleOverride]}>
                  "{normalizeDisplayText(currentWord.example_tr)}"
                </Text>
              </View>

              {/* Sentence Building Area */}
              <View style={[styles.sentenceArea, { borderColor: `${catColors.badge}50` }]}>
                <Text style={[styles.sentenceLabel, fontStyleOverride]}>🔤 Cümleyi oluştur:</Text>
                <View style={styles.sentenceTokens}>
                  {selectedWords.length === 0 ? (
                    <Text style={[styles.placeholderText, fontStyleOverride]}>Kelimeler buraya gelecek...</Text>
                  ) : (
                    selectedWords.map((word, i) => (
                      <SentenceToken
                        key={`${word}-${i}`}
                        word={word}
                        index={i}
                        onPress={() => handleTokenRemove(i)}
                        category={category}
                        isCorrect={showResult === 'correct' ? true : showResult === 'wrong' ? (word === correctTokens[i]) : null}
                      />
                    ))
                  )}
                </View>
              </View>

              {/* Word Bank */}
              <View style={styles.wordBank}>
                <View style={styles.wordBankHeader}>
                  <Text style={[styles.wordBankLabel, fontStyleOverride]}>📚 Kelime Bankası</Text>
                  <View style={styles.wordBankActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleReshuffle}>
                      <Shuffle size={16} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
                      <RotateCcw size={16} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.tokenGrid}>
                  {shuffledTokens.map((word, i) => (
                    <WordToken
                      key={`token-${i}`}
                      word={word}
                      index={i}
                      isSelected={selectedIndices.includes(i)}
                      isInSentence={selectedIndices.includes(i)}
                      onPress={() => handleTokenSelect(i)}
                      category={category}
                      animKey={animKey}
                    />
                  ))}
                </View>
              </View>

              {/* Check Button */}
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  { backgroundColor: catColors.badge },
                  selectedWords.length !== correctTokens.length && styles.checkButtonDisabled
                ]}
                onPress={handleCheck}
                disabled={showResult !== null}
                activeOpacity={0.8}
              >
                <Check size={20} color="#fff" />
                <Text style={[styles.checkButtonText, fontStyleOverride]}>Kontrol Et</Text>
              </TouchableOpacity>

              {/* Combo Display */}
              {combo > 0 && (
                <View style={styles.comboContainer}>
                  <Text style={[styles.comboText, { color: comboMessage.color }, fontStyleOverride]}>
                    {comboMessage.emoji} {combo}x COMBO
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* 🔥 MEGA COMBO DISPLAY - MiniQuizDialog Toast Style (ekran kararmaz) */}
            {showCombo && combo > 0 && (
              <Animated.View style={[
                styles.comboToast,
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
                  <Text style={[styles.comboToastText, { textShadowColor: comboMessage.color }]}>
                    {comboMessage.text}
                  </Text>
                  <View style={styles.comboStreakBadge}>
                    <Text style={styles.comboStreakX}>{'×'}</Text>
                    <Text style={styles.comboStreakNumber}>{combo}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  particle: {
    position: 'absolute',
    fontSize: 28,
    zIndex: 1000,
    opacity: 0.8,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    paddingTop: NOTCH_HEIGHT,
  },
  dialogWrapper: {
    width: '100%',
    maxWidth: 440,
  },
  outerGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 22,
  },
  dialog: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT - NOTCH_HEIGHT - 40,
  },
  dialogContent: {
    padding: IS_TINY_SCREEN ? 12 : IS_SMALL_SCREEN ? 14 : 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  headerEmoji: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: IS_TINY_SCREEN ? 14 : 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nextLevelText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  wordText: {
    fontSize: IS_TINY_SCREEN ? 22 : 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  wordMeaning: {
    fontSize: IS_TINY_SCREEN ? 12 : 14,
    textAlign: 'center',
  },
  hintContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  hintLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  hintText: {
    fontSize: IS_TINY_SCREEN ? 13 : 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  sentenceArea: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    minHeight: 80,
  },
  sentenceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  sentenceTokens: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  placeholderText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
  sentenceToken: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  sentenceTokenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  wordBank: {
    marginBottom: 12,
  },
  wordBankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordBankLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  wordBankActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tokenWrapper: {
    position: 'relative',
  },
  tokenGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 10,
  },
  tokenButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  tokenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  comboContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  comboText: {
    fontSize: 16,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  // 🔥 COMBO TOAST - MiniQuizDialog Style (ekran kararmaz)
  comboToast: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
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
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  comboEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  comboToastText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  comboStreakBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  comboStreakX: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  comboStreakNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  // 🏆 ULTRA JUICY SONUÇ EKRANI STİLLERİ
  resultBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultParticle: {
    position: 'absolute',
  },
  resultCard: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  resultGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    opacity: 0.15,
    borderRadius: 100,
  },
  resultGradientBg: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 28,
  },
  resultEmojiContainer: {
    position: 'relative',
    marginBottom: 16,
    height: 90,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultEmojiGlow: {
    position: 'absolute',
    fontSize: 85,
    opacity: 0.4,
    textShadowColor: '#fbbf24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  resultEmojiMain: {
    fontSize: 72,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  resultTitleBadge: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  resultTitleText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  resultStatsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  resultStatCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    minWidth: 85,
    borderWidth: 2,
  },
  resultStatEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  resultStatNumber: {
    fontSize: 28,
    fontWeight: '900',
  },
  resultStatText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accuracyRing: {
    marginBottom: 20,
  },
  accuracyRingBorder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyRingInner: {
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: 'rgba(15,15,35,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyPercent: {
    fontSize: 38,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  accuracyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // 🏆 MEGA PREMIUM SONUÇ EKRANI YENİ STİLLER
  trophySection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  trophyRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 100,
    borderStyle: 'dashed',
  },
  resultTitleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultTitleEmoji: {
    fontSize: 18,
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 20,
    marginBottom: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  rewardItem: {
    alignItems: 'center',
    gap: 2,
  },
  rewardEmoji: {
    fontSize: 24,
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fbbf24',
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  rewardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },
  rewardDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  resultStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  resultStatBox: {
    width: '46%',
    maxWidth: 150,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  statBoxGradient: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statBoxEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  statBoxNumber: {
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginTop: 2,
  },
  accuracyCircleWrapper: {
    marginBottom: 24,
  },
  accuracyCircleBorder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyCircleInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(10,10,30,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyMainPercent: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  accuracyMainLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  accuracyArc: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  accuracyArcFill: {
    height: '100%',
    borderRadius: 3,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  resultSecondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  resultSecondaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
  },
  resultPrimaryButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  resultPrimaryGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  resultPrimaryText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resultProgressInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 24,
  },
  resultProgressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  resultButton: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resultButtonGradient: {
    paddingHorizontal: 56,
    paddingVertical: 16,
    borderRadius: 18,
  },
  resultButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // 🏆 COMPACT SONUÇ EKRANI STİLLERİ
  compactResultCard: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
  },
  compactResultGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
  },
  compactEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 1,
  },
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  compactStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  compactStatNum: {
    fontSize: 28,
    fontWeight: '900',
  },
  compactStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  compactStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  compactAccuracyWrap: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  compactAccuracyText: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  compactAccuracyBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  compactAccuracyFill: {
    height: '100%',
    borderRadius: 4,
  },
  compactButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  compactSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  compactSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  compactPrimaryBtn: {
    flex: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  compactPrimaryGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  compactPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});

export default WordPuzzleDialog;
