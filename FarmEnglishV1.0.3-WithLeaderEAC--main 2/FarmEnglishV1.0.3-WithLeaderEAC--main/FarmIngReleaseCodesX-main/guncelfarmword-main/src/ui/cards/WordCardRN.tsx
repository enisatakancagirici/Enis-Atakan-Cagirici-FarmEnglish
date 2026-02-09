/**
 * 🎴 WordCardRN - Modern, Responsive, No-Overflow Design
 * Best Practices: Flexbox, Dynamic Sizing, Pixel Perfect
 * Tüm iPhone/Android cihazlarda mükemmel görünüm
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Easing,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Trophy } from 'lucide-react-native';
import { haptic } from '../../utils/sound';
import { getTierReward, getFruitEmoji, getFruitType, type FruitType } from '../../utils/fruitSystem';
import { usePerformanceStore } from '../../store/performanceStore';
import { useFarmStore } from '../../store/farmStore';
import { getThemeOverlay } from '../../data/cardThemes';

// 🎯 WordModel interface
export interface WordModel {
  id: string;
  text: string;
  meaning?: string;
  xp?: number;
  correctCount?: number;
  wrongCount?: number;
  quizCorrect?: number;
  quizWrong?: number;
  harvestedCount?: number;
  consecutiveCorrect?: number;
  lastAnswerCorrect?: boolean;
  masterLevel?: number;
  totalHarvests?: number;
  isFavorite?: boolean;
  isPhrasalVerb?: boolean;
  difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  level?: number;
  puzzleStats?: { sessions?: number; puzzleMasterLevel?: number };
  isPuzzleMaster?: boolean;
  // 🍎 Meyve Sistemi
  fruitType?: FruitType;
  fruitGrowthStage?: number;
}

export interface WordCardRNProps {
  w: WordModel;
  onHarvest?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onPreview?: (word: WordModel) => void;
  onPlantToFarm?: (id: string) => void;
  showAddToFarm?: boolean;
  index?: number;
  globalStreak?: number;
  ctaText?: string;
}

type CardTheme = {
  bgGradient: readonly [string, string, string];
  border: string;
  textPrimary: string;
  textSecondary: string;
  badgeBg: string;
  badgeText: string;
  buttonGradient: readonly [string, string, string];
  starActive: string;
  starInactive: string;
};

const BUTTON_GRADIENT = ['#e056a0', '#c044a0', '#9c3090'] as const;

const THEMES: Record<string, CardTheme> = {
  green: {
    bgGradient: ['#2e7d32', '#43a047', '#1b5e20'],
    border: 'rgba(34, 197, 94, 0.65)',
    textPrimary: '#052e16',
    textSecondary: '#14532d',
    badgeBg: 'rgba(6, 95, 70, 0.9)',
    badgeText: '#bbf7d0',
    buttonGradient: BUTTON_GRADIENT,
    starActive: '#fbbf24',
    starInactive: 'rgba(20, 83, 45, 0.35)',
  },
  yellow: {
    bgGradient: ['#d4a012', '#c9950b', '#b8860b'],
    border: 'rgba(234, 179, 8, 0.65)',
    textPrimary: '#4a3500',
    textSecondary: '#6b5000',
    badgeBg: '#3d2800',
    badgeText: '#ffd700',
    buttonGradient: BUTTON_GRADIENT,
    starActive: '#fbbf24',
    starInactive: 'rgba(139, 105, 20, 0.4)',
  },
  orange: {
    bgGradient: ['#c2410c', '#ea580c', '#9a3412'],
    border: 'rgba(249, 115, 22, 0.65)',
    textPrimary: '#431407',
    textSecondary: '#7c2d12',
    badgeBg: 'rgba(67, 20, 7, 0.92)',
    badgeText: '#ffedd5',
    buttonGradient: BUTTON_GRADIENT,
    starActive: '#fbbf24',
    starInactive: 'rgba(124, 45, 18, 0.35)',
  },
  red: {
    bgGradient: ['#991b1b', '#ef4444', '#7f1d1d'],
    border: 'rgba(239, 68, 68, 0.65)',
    textPrimary: '#450a0a',
    textSecondary: '#7f1d1d',
    badgeBg: 'rgba(69, 10, 10, 0.92)',
    badgeText: '#fee2e2',
    buttonGradient: BUTTON_GRADIENT,
    starActive: '#fbbf24',
    starInactive: 'rgba(127, 29, 29, 0.35)',
  },
  master: {
    bgGradient: ['#d4a012', '#c9950b', '#b8860b'],
    border: 'rgba(251, 191, 36, 0.8)',
    textPrimary: '#4a3500',
    textSecondary: '#6b5000',
    badgeBg: '#3d2800',
    badgeText: '#ffd700',
    buttonGradient: BUTTON_GRADIENT,
    starActive: '#fbbf24',
    starInactive: 'rgba(139, 105, 20, 0.4)',
  },
  ultra: {
    bgGradient: ['#0e7490', '#22d3ee', '#164e63'],
    border: 'rgba(34, 211, 238, 0.75)',
    textPrimary: '#042f2e',
    textSecondary: '#134e4a',
    badgeBg: 'rgba(4, 47, 46, 0.9)',
    badgeText: '#a5f3fc',
    buttonGradient: BUTTON_GRADIENT,
    starActive: '#fbbf24',
    starInactive: 'rgba(19, 78, 74, 0.35)',
  },
  perfect: {
    bgGradient: ['#831843', '#f472b6', '#500724'],
    border: 'rgba(244, 114, 182, 0.75)',
    textPrimary: '#500724',
    textSecondary: '#831843',
    badgeBg: 'rgba(80, 7, 36, 0.9)',
    badgeText: '#fce7f3',
    buttonGradient: BUTTON_GRADIENT,
    starActive: '#fbbf24',
    starInactive: 'rgba(131, 24, 67, 0.35)',
  },
};

const getBaseCategory = (wrongCount: number): 'red' | 'orange' | 'yellow' | 'green' => {
  if (wrongCount >= 15) return 'red';
  if (wrongCount >= 10) return 'orange';
  if (wrongCount >= 5) return 'yellow';
  return 'green';
};

const getThemeForWord = (w: WordModel): { theme: CardTheme; label: string; premium: boolean } => {
  const masterLevel = w.masterLevel ?? 0;
  if (masterLevel >= 3) return { theme: THEMES.perfect, label: 'PERFECT', premium: true };
  if (masterLevel >= 2) return { theme: THEMES.ultra, label: 'ULTRA', premium: true };
  if (masterLevel >= 1) return { theme: THEMES.master, label: 'MASTER', premium: true };

  const base = getBaseCategory(w.wrongCount ?? 0);
  return { theme: THEMES[base], label: 'CARD', premium: false };
};

// 🏆 Tier XP değerleri - YENİ DEĞERLER: Master: 300, Ultra: 500, Perfect: 800
const TIER_XP_VALUES: Record<number, number> = {
  0: 100,    // Normal
  1: 300,    // Master (Yeşil → Master)
  2: 500,    // Ultra (Master → Ultra)
  3: 800,    // Perfect (Ultra → Perfect)
};

const computeXpPreview = (w: WordModel, globalStreak: number | undefined): number => {
  const masterLevel = w.masterLevel ?? 0;
  
  // 🏆 Master/Ultra/Perfect tier XP değerleri
  if (masterLevel >= 1) {
    return TIER_XP_VALUES[Math.min(masterLevel, 3)];
  }
  
  // Normal kartlar için eski hesaplama
  const wrongCount = w.wrongCount ?? 0;
  const currentStreak = w.consecutiveCorrect ?? 0;
  const globalNext = (globalStreak ?? 0) + 1;
  const streakBonus = Math.floor(globalNext / 5) * 10;
  const newStreak = currentStreak + 1;

  const color = getBaseCategory(wrongCount);
  if (color === 'green') {
    if (newStreak >= 3) return 100 + streakBonus;
    return 35 + streakBonus;
  }
  if (newStreak >= 5) return 50 + streakBonus;
  return 15 + streakBonus;
};

// 📐 Responsive Helper - Dynamic scaling based on screen
const useResponsiveStyles = () => {
  const { width, height } = useWindowDimensions();
  
  // Screen type detection - daha hassas
  const isTiny = height < 680 || width < 360;
  const isSmall = !isTiny && (height < 750 || width < 400);
  const isMedium = !isTiny && !isSmall && height < 900;
  const isTablet = width > 700;
  
  return useMemo(() => ({
    // Card dimensions
    cardPadding: isTiny ? 10 : isSmall ? 12 : 14,
    cardRadius: isTiny ? 14 : isSmall ? 16 : 18,
    cardMargin: isTiny ? 4 : isSmall ? 6 : 8,
    cardMinHeight: isTiny ? 165 : isSmall ? 175 : isMedium ? 185 : 195,
    
    // Typography - orantılı
    wordSize: isTiny ? 15 : isSmall ? 16 : isMedium ? 18 : 20,
    labelSize: isTiny ? 9 : isSmall ? 10 : 11,
    statsSize: isTiny ? 10 : isSmall ? 11 : 12,
    badgeSize: isTiny ? 8 : isSmall ? 9 : 10,
    buttonSize: isTiny ? 11 : isSmall ? 12 : 13,
    
    // Spacing - tutarlı
    gap: isTiny ? 6 : isSmall ? 8 : 10,
    badgeGap: isTiny ? 3 : isSmall ? 4 : 5,
    
    // Icon sizes
    starSize: isTiny ? 12 : isSmall ? 13 : 14,
    trophySize: isTiny ? 11 : isSmall ? 12 : 14,
    
    // Badge padding
    badgePadH: isTiny ? 6 : isSmall ? 7 : 8,
    badgePadV: isTiny ? 3 : isSmall ? 4 : 5,
    
    // Button - yapbozdaki gibi estetik
    buttonPadV: isTiny ? 9 : isSmall ? 10 : 12,
    buttonRadius: isTiny ? 10 : isSmall ? 11 : 12,
    
    // Flags
    isTiny,
    isSmall,
    isTablet,
  }), [width, height, isTiny, isSmall, isMedium, isTablet]);
};

/**
 * 🎴 WordCardRN - Main component
 */
export const WordCardRN: React.FC<WordCardRNProps> = React.memo(({
  w,
  onHarvest,
  onToggleFavorite,
  onPreview,
  onPlantToFarm,
  showAddToFarm = false,
  index = 0,
  globalStreak,
  ctaText,
}) => {
  const rs = useResponsiveStyles();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 48 - rs.cardMargin) / 2;

  const masterLevel = w.masterLevel ?? 0;
  
  // 🧩 Puzzle harvested words use puzzleStats, regular words use quizCorrect/quizWrong
  const isPuzzleHarvested = (w as any).isPuzzleHarvested === true;
  const puzzleStats = (w as any).puzzleStats as { 
    sessions?: number; 
    totalCorrect?: number; 
    totalWrong?: number; 
    puzzleMasterLevel?: number;
    puzzleTotalHarvests?: number; // 🌾 Yapboz hasat sayısı
  } | undefined;
  
  // 🌾 Hasat sayısı - Puzzle kelimeler için ayrı sayaç
  const totalHarvests = isPuzzleHarvested 
    ? (puzzleStats?.puzzleTotalHarvests ?? 1) // 🎯 En az 1 - envanterdeyse en az 1 kez hasat edilmiştir!
    : (w.totalHarvests ?? w.harvestedCount ?? 0);
    
  const quizCorrect = isPuzzleHarvested 
    ? (puzzleStats?.totalCorrect ?? 0) 
    : (w.quizCorrect ?? 0);
  const quizWrong = isPuzzleHarvested 
    ? (puzzleStats?.totalWrong ?? 0) // 📊 Artık totalWrong kullanılıyor!
    : (w.quizWrong ?? 0);
  
  const xp = computeXpPreview(w, globalStreak);
  const totalAnswers = quizCorrect + Math.max(0, quizWrong);
  const ratio = totalAnswers > 0 ? Math.round((quizCorrect / totalAnswers) * 100) : 0;
  
  // 🧩 Puzzle etiketi SADECE yapbozdan hasat edilmişse gösterilir!
  // Normal tarladan hasat edilen kelimeler puzzle etiketi ALMAZ!
  const showPuzzleBadge = isPuzzleHarvested === true;

  const { theme: baseTheme, label: tierLabel, premium } = getThemeForWord(w);

  // 🎨 KART TEMA OVERLAY
  const activeThemeId = useFarmStore(s => s.activeCardTheme);
  const overlay = activeThemeId !== 'default' ? getThemeOverlay(activeThemeId) : null;
  const theme = overlay ? {
    ...baseTheme,
    border: overlay.borderColor,
  } : baseTheme;

  // 🎬 Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // 🌱 Swipe to plant
  const hasTriggeredRef = useRef(false);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !!onPlantToFarm,
    onMoveShouldSetPanResponder: (_, g) => !!onPlantToFarm && g.dx < -20 && Math.abs(g.dx) > Math.abs(g.dy) * 3,
    onPanResponderGrant: () => { hasTriggeredRef.current = false; haptic.light(); },
    onPanResponderMove: (_, g) => {
      if (g.dx < -50 && !hasTriggeredRef.current && onPlantToFarm) {
        hasTriggeredRef.current = true;
        haptic.heavy();
        onPlantToFarm(w.id);
      }
    },
    onPanResponderRelease: () => { hasTriggeredRef.current = false; },
    onPanResponderTerminate: () => { hasTriggeredRef.current = false; },
  }), [onPlantToFarm, w.id]);

  // 🚀 Entrance animation + 🎯 Bounce animation (performans ayarına göre)
  const config = usePerformanceStore(s => s.config);
  useEffect(() => {
    const delay = (index % 10) * 25; // 🎮 ARCADE: 40 -> 25ms daha hızlı
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }), // 🎮 ARCADE: 280 -> 180ms
      Animated.spring(translateAnim, { toValue: 0, delay, friction: 10, tension: 120, useNativeDriver: true }), // 🎮 ARCADE: friction 8->10, tension 70->120
    ]).start();
    
    // 🎯 Subtle bounce loop - SADECE performans izin veriyorsa
    if (config.enablePulseAnimations) {
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.025, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }), // 🎮 1.015 -> 1.025
          Animated.timing(bounceAnim, { toValue: 1, duration: 1600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      bounceLoop.start();
      return () => bounceLoop.stop();
    }
  }, [index, config.enablePulseAnimations]);

  // ✨ Shimmer for premium cards - SADECE performans izin veriyorsa
  useEffect(() => {
    if (!premium || !config.enableShimmer) return;
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: true, easing: Easing.linear })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [premium, shimmerAnim, config.enableShimmer]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.96, friction: 8, tension: 200, useNativeDriver: true }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 150, useNativeDriver: true }).start();
  }, []);

  const handleFavoritePress = useCallback(() => onToggleFavorite?.(w.id), [w.id, onToggleFavorite]);
  const handleCardPress = useCallback(() => onPreview?.(w), [w, onPreview]);
  const handleHarvestPress = useCallback(() => onHarvest?.(w.id), [w.id, onHarvest]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-cardWidth * 1.5, cardWidth * 1.5],
  });

  // 📝 Word text - PV ise verb kullan
  const wordText = w.text || (w as any).verb || '';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        { marginBottom: rs.cardMargin, opacity: fadeAnim, transform: [{ translateY: translateAnim }, { scale: Animated.multiply(scaleAnim, bounceAnim) }] },
      ]}
    >
      <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handleCardPress}>
        <View style={[styles.card, { borderRadius: rs.cardRadius, borderColor: theme.border, overflow: 'hidden' }]}>
          <LinearGradient
            colors={theme.bgGradient}
            style={[styles.gradient, { padding: rs.cardPadding, minHeight: rs.cardMinHeight }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            {/* ✨ Shimmer Effect - SADECE performans izin veriyorsa */}
            {premium && config.enableShimmer && (
              <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }], width: cardWidth * 2 }]}>
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.12)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            )}

            {/* 🎨 TEMA OVERLAY TINT */}
            {overlay && (
              <LinearGradient
                colors={[...overlay.gradientTint] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            )}

            {/* ⭐ Favorite Button - SABİT sağ üst */}
            <TouchableOpacity
              style={[styles.favoriteBtn, { padding: rs.isTiny ? 4 : 5 }]}
              onPress={handleFavoritePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Star size={rs.starSize} color={w.isFavorite ? theme.starActive : theme.starInactive} fill={w.isFavorite ? theme.starActive : 'transparent'} strokeWidth={2.5} />
            </TouchableOpacity>
            
            {/* 🍎 MEYVE ETİKETİ - KALDIRILDI */}

            {/* 🌿 CEFR Badge - SOL ÜST KÖŞE */}
            {!!w.difficulty && (
              <View style={[styles.cefrCornerBadge, { paddingHorizontal: rs.badgePadH, paddingVertical: rs.badgePadV - 1 }]}>
                <Text style={[styles.cefrText, { fontSize: rs.badgeSize }]}>{w.difficulty}</Text>
              </View>
            )}

            {/* 🏆 Header: Tier Badge + Harvest Count */}
            <View style={[styles.header, { marginBottom: rs.gap }]}>
              <View style={[styles.tierBadge, { backgroundColor: theme.badgeBg, paddingHorizontal: rs.badgePadH, paddingVertical: rs.badgePadV, borderRadius: 14, gap: rs.badgeGap }]}>
                {premium && <Trophy size={rs.trophySize} color={theme.badgeText} strokeWidth={2.5} />}
                <Text style={[styles.tierText, { color: theme.badgeText, fontSize: rs.badgeSize }]}>{tierLabel}</Text>
              </View>
              <Text style={[styles.harvestText, { color: theme.textSecondary, fontSize: rs.labelSize }]}>
                ☆ {totalHarvests} Hasat
              </Text>
            </View>

            {/* 📝 Content Area - Flex grow ile dolduruyor */}
            <View style={styles.content}>
              {/* 🔤 Word Row - Kelime + Meyve + PV + 🧩 Badge'lar aynı satırda */}
              <View style={[styles.wordRow, { marginBottom: rs.gap - 2, gap: rs.badgeGap }]}>
                <Text
                  style={[styles.wordText, { color: theme.textPrimary, fontSize: rs.wordSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {wordText}
                </Text>
                
                {/* 🍎 Meyve İkonu - Kelimenin yanında */}
                {(() => {
                  const fruitType = w.fruitType || (w.difficulty ? getFruitType(w.difficulty, w.isPhrasalVerb) : null);
                  if (!fruitType) return null;
                  return (
                    <Text style={[styles.fruitEmoji, { fontSize: rs.wordSize - 2 }]}>
                      {getFruitEmoji(fruitType)}
                    </Text>
                  );
                })()}
                
                {/* 📚 PV Badge */}
                {w.isPhrasalVerb && (
                  <View style={[styles.inlineBadge, styles.pvBadge]}>
                    <Text style={[styles.pvText, { fontSize: rs.badgeSize }]}>PV</Text>
                  </View>
                )}
                
                {/* ✏️ Custom Word Badge */}
                {(w as any).isCustom && (
                  <View style={[styles.inlineBadge, styles.customBadge]}>
                    <Text style={[styles.customText, { fontSize: rs.badgeSize }]}>✏️</Text>
                  </View>
                )}
                
                {/* 🧩 Puzzle Badge - SADECE yapbozdan hasat edilmişse! */}
                {showPuzzleBadge && (
                  <View style={[styles.inlineBadge, styles.puzzleBadge]}>
                    <Text style={[styles.puzzleText, { fontSize: rs.badgeSize + 1 }]}>🧩</Text>
                  </View>
                )}
              </View>

              {/* 📊 Stats Line - XP ve Hasat Ödülü */}
              {(() => {
                // Envanterdeki kartın bir sonraki hasat ödülü gösterilmeli
                // masterLevel 0 → sonraki hasat tier 1 (150 coin, 300 xp)
                // masterLevel 1 → sonraki hasat tier 2 (300 coin, 500 xp)
                // masterLevel 2 → sonraki hasat tier 3 (500 coin, 800 xp)
                // masterLevel 3 → sonraki hasat tier 4 (700 coin, 1000 xp) - tek seferlik!
                const nextTier = Math.min((masterLevel || 0) + 1, 4);
                const harvestReward = getTierReward(nextTier);
                return (
                  <Text style={[styles.statsText, { color: theme.textPrimary, fontSize: rs.statsSize, marginBottom: rs.gap - 4 }]}>
                    💰{harvestReward?.coins || 0} • ⭐{harvestReward?.xp || 0}XP • ✓{quizCorrect} | ✗{quizWrong}
                  </Text>
                );
              })()}

              {/* 📈 Success Ratio Badge */}
              <View style={[styles.ratioBadge, { paddingHorizontal: rs.badgePadH, paddingVertical: rs.isTiny ? 2 : 3, marginBottom: rs.gap }]}>
                <Text style={[styles.ratioText, { color: theme.textSecondary, fontSize: rs.labelSize }]}>Başarı: {ratio}%</Text>
              </View>

              {/* 🎯 CTA Button - Yapbozdaki gibi güzel ve estetik */}
              <TouchableOpacity style={[styles.ctaBtn, { borderRadius: rs.buttonRadius }]} onPress={handleHarvestPress} activeOpacity={0.85}>
                <LinearGradient
                  colors={theme.buttonGradient}
                  style={[styles.ctaGradient, { paddingVertical: rs.buttonPadV, borderRadius: rs.buttonRadius }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[styles.ctaText, { fontSize: rs.buttonSize }]}>{ctaText ?? '🌱 TARLAYA GÖNDER'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prev, next) => {
  const p = prev.w, n = next.w;
  return p.id === n.id && p.xp === n.xp && p.quizCorrect === n.quizCorrect && p.quizWrong === n.quizWrong &&
    p.harvestedCount === n.harvestedCount && p.masterLevel === n.masterLevel && p.isFavorite === n.isFavorite &&
    p.isPuzzleMaster === n.isPuzzleMaster && p.isPhrasalVerb === n.isPhrasalVerb && prev.index === next.index &&
    prev.ctaText === next.ctaText;
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  gradient: {
    // minHeight dinamik olarak set ediliyor
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
  },
  header: {
    alignItems: 'center',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tierText: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fruitEmoji: {
    // Kelime yanında meyve ikonu
  },
  harvestText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end', // İçerik alta yaslanır, buton her zaman altta
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap', // Aynı satırda kal
    paddingRight: 28, // Favori butonu için alan bırak
  },
  wordText: {
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 1, // Kelime uzunsa küçült
    minWidth: 0,
  },
  inlineBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 4,
    flexShrink: 0, // Badge'lar küçülmesin
  },
  cefrCornerBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(34,197,94,0.25)',
    borderColor: 'rgba(34,197,94,0.6)',
    borderWidth: 1.5,
    borderRadius: 6,
  },
  cefrBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderColor: 'rgba(34,197,94,0.5)',
  },
  cefrText: {
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 0.3,
  },
  pvBadge: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: 'rgba(255,215,0,0.5)',
  },
  pvText: {
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.3,
  },
  customBadge: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: 'rgba(99,102,241,0.5)',
  },
  customText: {
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 0.3,
  },
  puzzleBadge: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderColor: 'rgba(168,85,247,0.5)',
  },
  puzzleMasterBadge: {
    backgroundColor: 'rgba(239,68,68,0.25)',
    borderColor: 'rgba(239,68,68,0.6)',
  },
  puzzleText: {
    // Emoji için style
  },
  statsText: {
    fontWeight: '600',
  },
  ratioBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
  },
  ratioText: {
    fontWeight: '600',
  },
  ctaBtn: {
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#9c3090', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
  },
  ctaGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  ctaText: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // 🍎 MEYVE ETİKETİ - Favorilerin altında
  fruitBadge: {
    position: 'absolute',
    top: 36,
    right: 6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 15,
  },
  fruitBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default WordCardRN;
