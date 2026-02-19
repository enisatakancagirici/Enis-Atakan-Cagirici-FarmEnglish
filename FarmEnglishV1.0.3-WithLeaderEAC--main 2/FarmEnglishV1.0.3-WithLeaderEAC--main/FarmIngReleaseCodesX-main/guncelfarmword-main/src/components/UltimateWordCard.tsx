import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import type { WordModel } from '../models/types';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { usePerformanceStore } from '../store/performanceStore';
import { getThemeOverlay, BORDER_STYLES, DEFAULT_CUSTOMIZATION, type CardBounceIntensity } from '../data/cardThemes';
import { normalizeDisplayText } from '../utils/textNormalization';

// 🌱 Tohum görselleri - Kırmızı/Sarı ilerleme için
const SEED_SMALL_IMAGE = require('../../assets/images/maskot/tohumenkucuk.webp');
const SEED_MEDIUM_IMAGE = require('../../assets/images/maskot/tohumorta.webp');
const SEED_LARGE_IMAGE = require('../../assets/images/maskot/tohumenbuyuk.webp');

import {
  getFruitType,
  getFruitImageSource,
  getFruitSize,
  getFruitEmoji,
  FRUIT_COLORS,
  getTierName,
  getTierReward,
  TIER_SESSION_REQUIREMENTS,
  type FruitType,
} from '../utils/fruitSystem';
import {
  rs, rt,
  IS_TINY_SCREEN, IS_SMALL_SCREEN, IS_MEDIUM_SCREEN, IS_LARGE_SCREEN
} from '../ui/tokens/responsive';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = rs(8);

// 🎨 RENK SİSTEMİ: Kırmızı → Turuncu → Sarı → Yeşil → Envanter + Master seviyeleri
const THEMES = {
  // Kırmızı: wrongCount >= 10 (en düşük seviye - çok fazla yanlış)
  red: {
    gradient: ['rgba(127, 29, 29, 0.92)', 'rgba(153, 27, 27, 0.88)', 'rgba(127, 29, 29, 0.92)'] as const,
    glassOverlay: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(239, 68, 68, 0.7)',
    borderGlow: '#ef4444',
    textMain: '#fecaca',
    textSecondary: '#fca5a5',
    badgeBg: 'rgba(239, 68, 68, 0.3)',
    badgeText: '#fca5a5',
    barBg: 'rgba(0, 0, 0, 0.35)',
    barBorder: 'rgba(239, 68, 68, 0.5)',
    barFill: ['#ef4444', '#dc2626'] as const,
    btnGradient: ['#dc2626', '#b91c1c'] as const,
    emoji: '\u{1F534}',
    label: 'KIRMIZI',
    streakNeeded: 1,
    nextColor: 'TURUNCU',
  },
  // Turuncu: wrongCount 5-9
  orange: {
    gradient: ['rgba(124, 45, 18, 0.92)', 'rgba(154, 52, 18, 0.88)', 'rgba(124, 45, 18, 0.92)'] as const,
    glassOverlay: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(249, 115, 22, 0.7)',
    borderGlow: '#f97316',
    textMain: '#fed7aa',
    textSecondary: '#fdba74',
    badgeBg: 'rgba(249, 115, 22, 0.3)',
    badgeText: '#fdba74',
    barBg: 'rgba(0, 0, 0, 0.35)',
    barBorder: 'rgba(249, 115, 22, 0.5)',
    barFill: ['#f97316', '#ea580c'] as const,
    btnGradient: ['#ea580c', '#c2410c'] as const,
    emoji: '\u{1F7E0}',
    label: 'TURUNCU',
    streakNeeded: 1,
    nextColor: 'SARI',
  },
  // Sarı: wrongCount 1-4 (az yanlış var)
  yellow: {
    gradient: ['rgba(113, 63, 18, 0.92)', 'rgba(133, 77, 14, 0.88)', 'rgba(113, 63, 18, 0.92)'] as const,
    glassOverlay: 'rgba(255, 255, 255, 0.07)',
    border: 'rgba(234, 179, 8, 0.7)',
    borderGlow: '#eab308',
    textMain: '#fef08a',
    textSecondary: '#fde047',
    badgeBg: 'rgba(234, 179, 8, 0.3)',
    badgeText: '#fde047',
    barBg: 'rgba(0, 0, 0, 0.35)',
    barBorder: 'rgba(234, 179, 8, 0.5)',
    barFill: ['#eab308', '#ca8a04'] as const,
    btnGradient: ['#ca8a04', '#a16207'] as const,
    emoji: '\u{1F7E1}',
    label: 'SARI',
    streakNeeded: 1,
    nextColor: 'YESIL',
  },
  // Yeşil: wrongCount 0 (hasat edilebilir - hiç yanlış yok)
  green: {
    gradient: ['rgba(20, 83, 45, 0.92)', 'rgba(6, 95, 70, 0.88)', 'rgba(20, 83, 45, 0.92)'] as const,
    glassOverlay: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(34, 197, 94, 0.7)',
    borderGlow: '#22c55e',
    textMain: '#dcfce7',
    textSecondary: '#bbf7d0',
    badgeBg: 'rgba(34, 197, 94, 0.3)',
    badgeText: '#86efac',
    barBg: 'rgba(0, 0, 0, 0.35)',
    barBorder: 'rgba(34, 197, 94, 0.5)',
    barFill: ['#22c55e', '#10b981'] as const,
    btnGradient: ['#16a34a', '#059669'] as const,
    emoji: '\u{1F7E2}',
    label: 'YESIL',
    streakNeeded: 3,
    nextColor: 'ENVANTER',
  },
  // Master seviyeleri (envanterden gelen)
  master: {
    gradient: ['rgba(161, 98, 7, 0.92)', 'rgba(202, 138, 4, 0.88)', 'rgba(161, 98, 7, 0.92)'] as const,
    glassOverlay: 'rgba(255, 215, 0, 0.12)',
    border: 'rgba(250, 204, 21, 0.8)',
    borderGlow: '#ffd700',
    textMain: '#fef9c3',
    textSecondary: '#fef08a',
    badgeBg: 'rgba(250, 204, 21, 0.35)',
    badgeText: '#fef08a',
    barBg: 'rgba(0, 0, 0, 0.3)',
    barBorder: 'rgba(250, 204, 21, 0.6)',
    barFill: ['#facc15', '#eab308'] as const,
    btnGradient: ['#eab308', '#ca8a04'] as const,
    emoji: '\u{1F3C6}',
    label: 'ALTIN',
    streakNeeded: 3,
  },
  ultra: {
    gradient: ['rgba(8, 145, 178, 0.92)', 'rgba(6, 182, 212, 0.88)', 'rgba(59, 130, 246, 0.92)'] as const,
    glassOverlay: 'rgba(34, 211, 238, 0.15)',
    border: 'rgba(34, 211, 238, 0.85)',
    borderGlow: '#22d3ee',
    textMain: '#cffafe',
    textSecondary: '#a5f3fc',
    badgeBg: 'rgba(34, 211, 238, 0.35)',
    badgeText: '#67e8f9',
    barBg: 'rgba(0, 0, 0, 0.25)',
    barBorder: 'rgba(34, 211, 238, 0.6)',
    barFill: ['#22d3ee', '#06b6d4', '#0891b2'] as const,
    btnGradient: ['#06b6d4', '#0891b2'] as const,
    emoji: '\u{1F48E}',
    label: 'ELMAS',
    streakNeeded: 3,
  },
  perfect: {
    gradient: ['rgba(168, 85, 247, 0.92)', 'rgba(192, 132, 252, 0.88)', 'rgba(139, 92, 246, 0.92)'] as const,
    glassOverlay: 'rgba(192, 132, 252, 0.18)',
    border: 'rgba(192, 132, 252, 0.9)',
    borderGlow: '#c084fc',
    textMain: '#f3e8ff',
    textSecondary: '#e9d5ff',
    badgeBg: 'rgba(192, 132, 252, 0.4)',
    badgeText: '#e9d5ff',
    barBg: 'rgba(0, 0, 0, 0.2)',
    barBorder: 'rgba(192, 132, 252, 0.7)',
    barFill: ['#c084fc', '#a855f7', '#9333ea'] as const,
    btnGradient: ['#a855f7', '#9333ea'] as const,
    emoji: '\u{1F451}',
    label: 'KRALIYET',
    streakNeeded: 3,
  },
};

type ThemeKey = keyof typeof THEMES;

const SOIL_DOT_LAYOUT = [
  { left: '8%', top: '14%', size: 4 },
  { left: '22%', top: '38%', size: 3 },
  { left: '34%', top: '22%', size: 5 },
  { left: '46%', top: '58%', size: 4 },
  { left: '58%', top: '18%', size: 3 },
  { left: '70%', top: '42%', size: 5 },
  { left: '82%', top: '26%', size: 4 },
  { left: '16%', top: '68%', size: 3 },
  { left: '62%', top: '72%', size: 4 },
  { left: '78%', top: '64%', size: 3 },
] as const;

type ThemeVisualFx = {
  auraColor: string;
  auraOpacity: number;
  sweepColors: readonly [string, string, string];
  rainbowFilm?: readonly [string, string, string, string];
  sparkleColor?: string;
};

type ThemeMotionFx = {
  overlayPulsePeak: number;
  masterPulsePeak: number;
  pulseDuration: number;
  pressInScale: number;
};

type BounceIntensityFx = {
  amplitude: number;
  speed: number;
  pressDepth: number;
};

const DEFAULT_THEME_VISUAL_FX: ThemeVisualFx = {
  auraColor: '#f5d0fe',
  auraOpacity: 0.36,
  sweepColors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)'],
  sparkleColor: '#ffffff',
};

const DEFAULT_THEME_MOTION_FX: ThemeMotionFx = {
  overlayPulsePeak: 1.015,
  masterPulsePeak: 1.06,
  pulseDuration: 600,
  pressInScale: 0.94,
};

const THEME_VISUAL_FX: Record<string, ThemeVisualFx> = {
  holographic: {
    auraColor: '#fde047',
    auraOpacity: 0.58,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.62)', 'rgba(255,255,255,0)'],
    rainbowFilm: ['rgba(255,0,122,0.2)', 'rgba(0,194,255,0.2)', 'rgba(166,255,0,0.18)', 'rgba(255,189,0,0.2)'],
    sparkleColor: '#fef08a',
  },
  royal: {
    auraColor: '#c084fc',
    auraOpacity: 0.52,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(216,180,254,0.62)', 'rgba(255,255,255,0)'],
    rainbowFilm: ['rgba(192,132,252,0.2)', 'rgba(139,92,246,0.24)', 'rgba(167,139,250,0.18)', 'rgba(192,132,252,0.2)'],
    sparkleColor: '#e9d5ff',
  },
  diamond: {
    auraColor: '#67e8f9',
    auraOpacity: 0.5,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(125,211,252,0.62)', 'rgba(255,255,255,0)'],
    rainbowFilm: ['rgba(125,211,252,0.2)', 'rgba(45,212,191,0.2)', 'rgba(191,219,254,0.18)', 'rgba(125,211,252,0.2)'],
    sparkleColor: '#e0f2fe',
  },
  cyberpunk: {
    auraColor: '#22d3ee',
    auraOpacity: 0.5,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(34,211,238,0.58)', 'rgba(255,255,255,0)'],
    rainbowFilm: ['rgba(34,211,238,0.16)', 'rgba(236,72,153,0.2)', 'rgba(34,211,238,0.16)', 'rgba(236,72,153,0.18)'],
    sparkleColor: '#67e8f9',
  },
  neon: {
    auraColor: '#00ffd5',
    auraOpacity: 0.48,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(0,255,213,0.55)', 'rgba(255,255,255,0)'],
    sparkleColor: '#5eead4',
  },
  aurora: {
    auraColor: '#34d399',
    auraOpacity: 0.46,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(52,211,153,0.5)', 'rgba(255,255,255,0)'],
    rainbowFilm: ['rgba(52,211,153,0.18)', 'rgba(56,189,248,0.18)', 'rgba(99,102,241,0.16)', 'rgba(16,185,129,0.18)'],
    sparkleColor: '#6ee7b7',
  },
  dragon: {
    auraColor: '#fb7185',
    auraOpacity: 0.46,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(248,113,113,0.56)', 'rgba(255,255,255,0)'],
    sparkleColor: '#fecaca',
  },
  phoenix: {
    auraColor: '#fbbf24',
    auraOpacity: 0.5,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(251,191,36,0.56)', 'rgba(255,255,255,0)'],
    sparkleColor: '#fde68a',
  },
  voltstorm: {
    auraColor: '#22d3ee',
    auraOpacity: 0.62,
    sweepColors: ['rgba(255,255,255,0)', 'rgba(34,211,238,0.72)', 'rgba(255,255,255,0)'],
    rainbowFilm: ['rgba(34,211,238,0.2)', 'rgba(6,182,212,0.2)', 'rgba(168,85,247,0.24)', 'rgba(34,211,238,0.2)'],
    sparkleColor: '#67e8f9',
  },
};

const THEME_MOTION_FX: Record<string, ThemeMotionFx> = {
  neon: { overlayPulsePeak: 1.03, masterPulsePeak: 1.11, pulseDuration: 470, pressInScale: 0.91 },
  cyberpunk: { overlayPulsePeak: 1.032, masterPulsePeak: 1.12, pulseDuration: 430, pressInScale: 0.9 },
  dragon: { overlayPulsePeak: 1.026, masterPulsePeak: 1.1, pulseDuration: 500, pressInScale: 0.92 },
  phoenix: { overlayPulsePeak: 1.028, masterPulsePeak: 1.1, pulseDuration: 520, pressInScale: 0.91 },
  holographic: { overlayPulsePeak: 1.034, masterPulsePeak: 1.13, pulseDuration: 410, pressInScale: 0.89 },
  voltstorm: { overlayPulsePeak: 1.04, masterPulsePeak: 1.14, pulseDuration: 380, pressInScale: 0.88 },
};

function getThemeVisualFx(themeId?: string | null): ThemeVisualFx {
  if (!themeId) return DEFAULT_THEME_VISUAL_FX;
  return THEME_VISUAL_FX[themeId] || DEFAULT_THEME_VISUAL_FX;
}

function getThemeMotionFx(themeId?: string | null): ThemeMotionFx {
  if (!themeId) return DEFAULT_THEME_MOTION_FX;
  return THEME_MOTION_FX[themeId] || DEFAULT_THEME_MOTION_FX;
}

function getBounceIntensityFx(level: CardBounceIntensity): BounceIntensityFx {
  switch (level) {
    case 'min':
      return { amplitude: 0.52, speed: 1.35, pressDepth: 0.58 };
    case 'max':
      return { amplitude: 1.72, speed: 0.76, pressDepth: 1.36 };
    default:
      return { amplitude: 1, speed: 1, pressDepth: 1 };
  }
}

function applyBounceIntensity(motion: ThemeMotionFx, level: CardBounceIntensity): ThemeMotionFx {
  const fx = getBounceIntensityFx(level);
  const tunedOverlayPeak = 1 + (motion.overlayPulsePeak - 1) * fx.amplitude;
  const tunedMasterPeak = 1 + (motion.masterPulsePeak - 1) * fx.amplitude;
  const tunedPressIn = 1 - (1 - motion.pressInScale) * fx.pressDepth;
  return {
    overlayPulsePeak: Math.max(1.003, Math.min(tunedOverlayPeak, 1.2)),
    masterPulsePeak: Math.max(1.01, Math.min(tunedMasterPeak, 1.22)),
    pulseDuration: Math.max(240, Math.round(motion.pulseDuration * fx.speed)),
    pressInScale: Math.max(0.8, Math.min(tunedPressIn, 0.985)),
  };
}

function getCardSizeMultiplier(compactMode: boolean, largeMode: boolean): number {
  if (largeMode) return 1.16;
  if (compactMode) return 0.92;
  return 1;
}

function getFontStyle(fontStyle: 'default' | 'serif' | 'mono' | 'rounded') {
  if (fontStyle === 'serif') return { fontFamily: 'serif' as const, letterSpacing: 0 };
  if (fontStyle === 'mono') {
    return {
      fontFamily: Platform.OS === 'ios' ? ('Menlo' as const) : ('monospace' as const),
      letterSpacing: 0,
    };
  }
  if (fontStyle === 'rounded') return { letterSpacing: 0.3 };
  return {};
}

// 💧 KART ÜZERİ SU DAMLACIKLARI ANİMASYONU - Seviye artışında (performans ölçekli)
const CardWaterDrops = React.memo<{
  visible: boolean;
  onComplete?: () => void;
  performanceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'PERFECT';
  isProtected?: boolean; // 🛡️ Master kart böceklerden korundu mu?
  // 🎮 Yeni performans config'den gelen değerler
  dropCount?: number;
  duration?: number;
  showText?: boolean;
}>(({ visible, onComplete, performanceLevel = 'HIGH', isProtected = false, dropCount: configDropCount, duration = 1500, showText = true }) => {
  // 🎮 PERFORMANSA GÖRE DAMLA SAYISI - Config'den gelirse onu kullan
  const dropCount = useMemo(() => {
    if (configDropCount !== undefined) return configDropCount;
    // Fallback: performanceLevel'e göre
    switch(performanceLevel) {
      case 'LOW': return 0;
      case 'MEDIUM': return 0;
      case 'HIGH': return 2;
      case 'ULTRA': return 4;
      case 'PERFECT': return 6;
      default: return 4;
    }
  }, [performanceLevel, configDropCount]);

  // 🌧️ Performansa göre damla config - sadece dropCount > 0 ise
  const drops = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      anim: new Animated.Value(0),
      x: 10 + Math.random() * 80, // % pozisyon
      delay: i * 100, // Her damla arası 100ms
      size: 20 + Math.random() * 10, // 20-30px damlalar
      wave: Math.floor(i / 3),
    }))
  ).current;

  const splashAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const growTextAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let completeTimeout: NodeJS.Timeout | null = null;
    let combinedAnimation: Animated.CompositeAnimation | null = null;
    let isCancelled = false;

    if (!visible) return;

    // 🎮 showText false ise hiç animasyon yapma
    if (!showText && dropCount === 0) {
      completeTimeout = setTimeout(() => {
        if (!isCancelled) onComplete?.();
      }, 50);
      return () => {
        isCancelled = true;
        if (completeTimeout) clearTimeout(completeTimeout);
      };
    }

    // Damlacıkları sıfırla
    drops.forEach(d => d.anim.setValue(0));
    splashAnim.setValue(0);
    glowAnim.setValue(0);
    growTextAnim.setValue(0);

    const animations: Animated.CompositeAnimation[] = [];

    // 🌧️ Sıralı damla animasyonları - sadece dropCount > 0 ise
    if (dropCount > 0) {
      const activeDrops = drops.slice(0, dropCount);
      const dropAnimations = activeDrops.map(drop =>
        Animated.sequence([
          Animated.delay(drop.delay),
          Animated.timing(drop.anim, {
            toValue: 1,
            duration: duration * 0.6, // Animasyon süresinin %60'ı düşüş
            easing: Easing.bezier(0.2, 0.8, 0.3, 1),
            useNativeDriver: true,
          }),
        ])
      );
      animations.push(...dropAnimations);

      // 💫 Parlaklık efekti - sadece dropCount > 0 ise
      const glowIterations = Math.max(2, Math.floor(duration / 400));
      animations.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.4, duration: 200, useNativeDriver: true }),
          ]),
          { iterations: glowIterations }
        )
      );

      // 🌊 Su birikintisi splash efekti
      animations.push(
        Animated.sequence([
          Animated.delay(200),
          Animated.spring(splashAnim, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }),
        ])
      );
    }

    // 🌱 "BUYUYOR!" yazisi animasyonu - showText true ise
    if (showText) {
      const textHoldDuration = Math.max(400, duration - 300); // Min 400ms görünür kal
      animations.push(
        Animated.sequence([
          Animated.timing(growTextAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.delay(textHoldDuration),
          Animated.timing(growTextAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ])
      );
    }

    // Animasyonları çalıştır
    combinedAnimation = Animated.parallel(animations);
    combinedAnimation.start(() => {
      completeTimeout = setTimeout(() => {
        if (!isCancelled) onComplete?.();
      }, 50);
    });

    return () => {
      isCancelled = true;
      combinedAnimation?.stop();
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [visible, dropCount, duration, showText, onComplete]);

  if (!visible) return null;

  // 🎮 Animasyon tamamen kapalıysa null döndür
  if (!showText && dropCount === 0) return null;

  return (
    <View style={cardAnimStyles.waterContainer} pointerEvents="none">
      {/* 🌱 "BUYUYOR!" veya 🛡️ "Boceklerden korundu!" yazisi - sadece showText true ise */}
      {showText && (
        <Animated.View
          style={[
            cardAnimStyles.growTextContainer,
            {
              opacity: growTextAnim,
              transform: [
                { scale: growTextAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] }) },
              ],
            },
          ]}
        >
          <Text style={cardAnimStyles.growTextEmoji}>{isProtected ? '\u{1F6E1}️' : '\u{1F4A7}'}</Text>
          <Text style={[cardAnimStyles.growText, isProtected && { color: '#fbbf24' }]}>
            {isProtected ? 'Korundu!' : 'BÜYÜYOR!'}
          </Text>
        </Animated.View>
      )}

      {/* Su damlacıkları - sadece dropCount > 0 ise */}
      {dropCount > 0 && drops.slice(0, dropCount).map(drop => {
        const translateY = drop.anim.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [-40, 80, 100], // Daha uzun mesafe
        });
        const opacity = drop.anim.interpolate({
          inputRange: [0, 0.15, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = drop.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.6, 1.2, 0.4],
        });

        return (
          <Animated.Text
            key={drop.id}
            style={[
              cardAnimStyles.waterDrop,
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

      {/* Alt kısımda su birikintisi efekti - sadece dropCount > 0 ise */}
      {dropCount > 0 && (
        <Animated.View
          style={[
            cardAnimStyles.splashEffect,
            {
              transform: [
                { scaleX: splashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2] }) },
                { scaleY: splashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }) },
              ],
              opacity: splashAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.9, 0] }),
            },
          ]}
        >
          <Text style={cardAnimStyles.splashText}>{'\u{1F30A}'}</Text>
        </Animated.View>
      )}

      {/* Parlaklık efektleri - sadece dropCount > 0 ise */}
      {dropCount > 0 && (
        <>
          <Animated.Text
            style={[
              cardAnimStyles.sparkle,
              { left: '20%', top: '30%' },
              {
                opacity: glowAnim,
                transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }],
              },
            ]}
          >
            {'\u{2728}'}
          </Animated.Text>
          <Animated.Text
            style={[
              cardAnimStyles.sparkle,
              { left: '70%', top: '50%' },
              {
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
            ]}
          >
            {'\u{2728}'}
          </Animated.Text>
        </>
      )}
    </View>
  );
});
CardWaterDrops.displayName = 'CardWaterDrops';

//  KART ÜZERİ BÖCEK ANİMASYONU - Seviye düşüşünde (TÜM KARTLARA)
const CardBugCrawl = React.memo<{
  visible: boolean;
  onComplete?: () => void;
  performanceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'PERFECT';
  //  Yeni performans config'den gelen değerler
  bugCount?: number;
  duration?: number;
  showText?: boolean;
}>(({ visible, onComplete, performanceLevel = 'HIGH', bugCount: configBugCount, duration = 1500, showText = true }) => {
  const bugTextAnim = useRef(new Animated.Value(0)).current;

  //  PERFORMANSA GÖRE BÖCEK SAYISI - Config'den gelirse onu kullan
  const bugCount = useMemo(() => {
    if (configBugCount !== undefined) return configBugCount;
    // Fallback: performanceLevel'e göre
    switch(performanceLevel) {
      case 'LOW': return 0;
      case 'MEDIUM': return 0;
      case 'HIGH': return 2;
      case 'ULTRA': return 4;
      case 'PERFECT': return 6;
      default: return 4;
    }
  }, [performanceLevel, configBugCount]);

  const bugs = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      posAnim: new Animated.Value(0),
      wiggleAnim: new Animated.Value(0),
      startX: i % 2 === 0 ? -20 : 120, // Sağdan veya soldan giriş
      endX: 20 + Math.random() * 60,
      y: 15 + i * 12,
      delay: i * 120,
      emoji: ['\u{1F41B}', '\u{1FAB2}', '\u{1F41C}', '\u{1F577}️', '\u{1F997}', '\u{1FAB3}'][i % 6],
    }))
  ).current;

  useEffect(() => {
    let completeTimeout: NodeJS.Timeout | null = null;
    let combinedAnimation: Animated.CompositeAnimation | null = null;
    let isCancelled = false;

    if (!visible) return;

    //  showText false ise ve bugCount 0 ise hiç animasyon yapma
    if (!showText && bugCount === 0) {
      completeTimeout = setTimeout(() => {
        if (!isCancelled) onComplete?.();
      }, 50);
      return () => {
        isCancelled = true;
        if (completeTimeout) clearTimeout(completeTimeout);
      };
    }

    // Sıfırla
    bugs.forEach(b => {
      b.posAnim.setValue(0);
      b.wiggleAnim.setValue(0);
    });
    bugTextAnim.setValue(0);

    const animations: Animated.CompositeAnimation[] = [];

    // Sadece aktif böcekleri animasyonla - bugCount > 0 ise
    if (bugCount > 0) {
      const activeBugs = bugs.slice(0, bugCount);
      const bugAnimations = activeBugs.map(bug => {
        // Ana hareket
        const moveAnim = Animated.sequence([
          Animated.delay(bug.delay),
          Animated.timing(bug.posAnim, {
            toValue: 1,
            duration: duration * 0.6, // Animasyon süresinin %60'ı
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
      animations.push(...bugAnimations);
    }

    // "Boceklendi" yazisi animasyonu - showText true ise
    if (showText) {
      const textHoldDuration = Math.max(400, duration - 300); // Min 400ms görünür kal
      animations.push(
        Animated.sequence([
          Animated.timing(bugTextAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.delay(textHoldDuration),
          Animated.timing(bugTextAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ])
      );
    }

    // Animasyonları çalıştır
    combinedAnimation = Animated.parallel(animations);
    combinedAnimation.start(() => {
      completeTimeout = setTimeout(() => {
        if (!isCancelled) onComplete?.();
      }, 50);
    });

    return () => {
      isCancelled = true;
      combinedAnimation?.stop();
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [visible, bugCount, duration, showText, onComplete]);

  if (!visible) return null;

  //  Animasyon tamamen kapalıysa null döndür
  if (!showText && bugCount === 0) return null;

  return (
    <View style={cardAnimStyles.bugContainer} pointerEvents="none">
      {/* Böcekler - sadece bugCount > 0 ise */}
      {bugCount > 0 && bugs.slice(0, bugCount).map(bug => {
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
              cardAnimStyles.bugEmoji,
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

      {/* Kötü his efekti - sadece bugCount > 0 ise */}
      {bugCount > 0 && (
        <Animated.Text
          style={[
            cardAnimStyles.badVibe,
            {
              opacity: bugs[0].posAnim.interpolate({
                inputRange: [0, 0.3, 0.7, 1],
                outputRange: [0, 0.8, 0.8, 0],
              }),
            },
          ]}
        >
          {'\u{1F630}'}
        </Animated.Text>
      )}

      {/* "Boceklendi" yazisi - sadece showText true ise */}
      {showText && (
        <Animated.View
          style={[
            cardAnimStyles.bugTextContainer,
            {
              opacity: bugTextAnim,
              transform: [
                { scale: bugTextAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) },
              ],
            },
          ]}
        >
          <Text style={cardAnimStyles.bugTextEmoji}>{'\u{1F41B}'}</Text>
          <Text style={cardAnimStyles.bugText}>Boceklendi!</Text>
        </Animated.View>
      )}
    </View>
  );
});
CardBugCrawl.displayName = 'CardBugCrawl';

//  Kart üzeri animasyon stilleri
const cardAnimStyles = StyleSheet.create({
  waterContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 100,
    borderRadius: 20,
  },
  waterDrop: {
    position: 'absolute',
    top: 0,
  },
  growTextContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  growTextEmoji: {
    fontSize: 36,
    textAlign: 'center',
  },
  growText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#22c55e',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  splashEffect: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    marginLeft: -20,
  },
  splashText: {
    fontSize: 24,
  },
  sparkle: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
    fontSize: 22,
  },
  bugContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 100,
    borderRadius: 20,
  },
  bugEmoji: {
    position: 'absolute',
    fontSize: 16,
    left: 0,
  },
  badVibe: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    fontSize: 18,
  },
  bugTextContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  bugTextEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  bugText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
});

interface UltimateWordCardProps {
  word: WordModel;
  onPress: () => void;
  onQuizPress?: () => void;
  index?: number;
  suspendHeavyEffects?: boolean; // MiniQuiz açıkken arka plan FX'leri dondur
  isHighlighted?: boolean; //  Tutorial highlight
  levelFeedback?: { type: 'levelUp' | 'levelDown'; visible: boolean }; // 💧 Seviye animasyonları
  onLevelFeedbackComplete?: () => void; // Animasyon bitince callback
}

// 🚀 OPTIMIZED: React.memo ile gereksiz render'ları önle
export const UltimateWordCard: React.FC<UltimateWordCardProps> = React.memo(({ word, onPress, onQuizPress, index = 0, suspendHeavyEffects = false, isHighlighted = false, levelFeedback: propLevelFeedback, onLevelFeedbackComplete }) => {
  const windowDims = useWindowDimensions();

  //  PERFORMANS AYARLARI - Store'dan al
  const config = usePerformanceStore(s => s.config);
  const performanceLevel = usePerformanceStore(s => s.level); // 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'PERFECT'
  const isFxSuspended = suspendHeavyEffects;
  const enableAnimations = config.enableCardEntryAnimation;
  const enableShimmer = config.enableShimmer;
  const enableGlow = config.enableGlow;
  const enableFloatingParticles = config.enableFloatingParticles;

  // 📱 DYNAMIC LAYOUT - Tablet landscape/portrait optimize
  const isTinyScreen = windowDims.height < 600 || windowDims.width < 360; // 4.7" ve küçük ekranlar
  const isSmallScreen = windowDims.height < 700 || windowDims.width < 400;
  const isTabletLandscape = windowDims.width > 700 && windowDims.height < 550;
  const isTabletPortrait = windowDims.width < 550 && windowDims.height > 700;

  //  Store actions
  const toggleFavorite = useFarmStore(s => s.toggleFavorite);
  const harvestWord = useFarmStore(s => s.harvestWord);
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const tutorialGreenCardSession = useFarmStore(s => s.tutorialGreenCardSession);
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  const activeThemeId = useFarmStore(s => s.activeCardTheme);
  const cardCustomization = useFarmStore(s => s.cardCustomization);
  const isFavorite = word.isFavorite || false;

  // 💧 STORE'DAN KART ANİMASYON FEEDBACK - Quiz/Puzzle sonrası
  const cardFeedback = useFarmStore(s => s.cardFeedback);
  const setCardFeedback = useFarmStore(s => s.setCardFeedback);

  // 💧 LOCAL STATE - Animasyonu kaçırmamak için
  const [localFeedback, setLocalFeedback] = useState<'levelUp' | 'levelDown' | 'protected' | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0); // Her yeni feedback için yeni key
  const lastProcessedIdRef = useRef<string | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tutorialTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  //  Animasyon süresini config'den al (veya default)
  const ANIMATION_DURATION_MS = config.cardFeedbackDuration || 1500;

  // 💧 Store'dan feedback geldiinde LOCAL STATE'e aktar
  // NOT: Feedback artık MiniQuiz kapandıktan SONRA geliyor (performans için)
  useEffect(() => {
    //  Performans ayarına göre animasyonu atla
    if (!config.enableCardFeedbackAnimations) {
      // Feedback'i hemen temizle
      if (cardFeedback?.wordId === word.id) {
        setCardFeedback(null);
      }
      return;
    }

    if (cardFeedback?.wordId === word.id && cardFeedback?.id) {
      // SADECE farklı bir feedback ID ise işle
      if (lastProcessedIdRef.current !== cardFeedback.id) {
        // Önceki timeout'u temizle
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }

        lastProcessedIdRef.current = cardFeedback.id;
        setFeedbackKey(k => k + 1); // Yeni key = yeni animasyon
        setLocalFeedback(cardFeedback.type);

        // Animasyon süresince bekle, sonra temizle
        animationTimeoutRef.current = setTimeout(() => {
          setLocalFeedback(null);
          // Store'u temizle
          if (cardFeedback?.wordId === word.id) {
            setCardFeedback(null);
          }
        }, ANIMATION_DURATION_MS);
      }
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [cardFeedback, word.id, setCardFeedback]);

  useEffect(() => {
    return () => {
      if (tutorialTransitionTimeoutRef.current) {
        clearTimeout(tutorialTransitionTimeoutRef.current);
      }
    };
  }, []);

  // 💧 Animasyon için local feedback kullan
  const feedbackType = localFeedback;

  // 💧 Animasyon tamamlandığında - artık timeout ile otomatik temizleniyor
  const handleFeedbackComplete = useCallback(() => {
    // Animasyon component'i callback çağırabilir ama biz timeout ile yönetiyoruz
    // Bu callback'i boş bırakıyoruz çünkü timeout zaten temizliyor
  }, []);

  // 🔒 TUTORIAL: STEP_8'de çalış butonunu kilitle - sağa kaydırmayı öğretiyoruz
  const isButtonLocked = tutorialStep === 'STEP_8_CARD_PROGRESS';

  //  ANİMASYONLAR - Press & entrance + MASTER EXCLUSIVE loops + MEYVE
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; // 🚀 Başlangıçta 1 - tab değişiminde blur önleme
  const translateAnim = useRef(new Animated.Value(0)).current; // 🚀 Başlangıçta 0 - anında görünür
  // 👑 MASTER EXCLUSIVE - Sadece master kartlar için premium efektler
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const themeBounceAnim = useRef(new Animated.Value(1)).current;
  const themeSweepAnim = useRef(new Animated.Value(0)).current;
  const themeAuraAnim = useRef(new Animated.Value(0.4)).current;
  const themeSparkAnim = useRef(new Animated.Value(0.5)).current;
  //  MEYVE ANİMASYONLARI
  const fruitScaleAnim = useRef(new Animated.Value(1)).current;
  const fruitGlowAnim = useRef(new Animated.Value(0)).current;
  const previousSessionProgressRef = useRef<number | null>(null);

  //  Phrasal Verb kontrolü
  const isPhrasalVerb = word.isPhrasalVerb || false;
  const verbText = (word as any).verb;

  //  Custom kelime kontrolü
  const isCustomWord = (word as any).isCustom === true;
  const displayWordText = useMemo(
    () => normalizeDisplayText(word.text || verbText || ''),
    [word.text, verbText]
  );

  const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
  const allowGlowFx = safeCustomization.enableCardGlow !== false;
  const allowBounceFx = safeCustomization.enableCardBounce !== false;
  const allowBurstFx = safeCustomization.enableCardBurstFx !== false;
  const bounceIntensityLevel = safeCustomization.cardBounceIntensity || 'normal';
  const isDefaultCustomization =
    (safeCustomization.fontStyle || 'default') === 'default' &&
    (safeCustomization.borderStyle || 'default') === 'default' &&
    (safeCustomization.backgroundStyle || 'default') === 'default' &&
    !!safeCustomization.showEmoji === true &&
    !!safeCustomization.showProgressBar === true &&
    !!safeCustomization.showLevel === true &&
    !!safeCustomization.compactMode === false &&
    !!safeCustomization.largeMode === false &&
    safeCustomization.enableCardGlow !== false &&
    safeCustomization.enableCardBounce !== false &&
    safeCustomization.enableCardBurstFx !== false &&
    (safeCustomization.cardBounceIntensity || 'normal') === 'normal';
  const shouldShowStatusEmojiBadge =
    !!safeCustomization.showEmoji && (!isDefaultCustomization || activeThemeId !== 'default');
  const cardSizeMultiplier = getCardSizeMultiplier(!!safeCustomization.compactMode, !!safeCustomization.largeMode);
  const gridColumns = safeCustomization.largeMode ? 1 : safeCustomization.compactMode ? 3 : 2;
  const gridSidePadding = rs(8);
  const totalHorizontalMargins = gridColumns * CARD_MARGIN;
  const baseGridCardWidth = Math.max(
    rs(94),
    (windowDims.width - gridSidePadding * 2 - totalHorizontalMargins) / gridColumns
  );
  const dynamicCardWidth = safeCustomization.largeMode
    ? Math.min(Math.max(rs(220), baseGridCardWidth), rs(560))
    : baseGridCardWidth;
  const dynamicCardPadding = (IS_TINY_SCREEN ? rs(12) : IS_SMALL_SCREEN ? rs(14) : rs(16)) * cardSizeMultiplier;
  const dynamicCardMinHeight = (IS_TINY_SCREEN ? rs(150) : IS_SMALL_SCREEN ? rs(165) : IS_MEDIUM_SCREEN ? rs(180) : rs(195)) * cardSizeMultiplier;
  const borderPreset = BORDER_STYLES[safeCustomization.borderStyle || 'default'] || BORDER_STYLES.default;
  const dynamicCardRadius = rs(borderPreset.borderRadius);
  const dynamicBorderWidth = rs(borderPreset.borderWidth);
  const dynamicShadowRadius = rs(borderPreset.shadowRadius);
  const effectiveShadowRadius = isFxSuspended || !allowGlowFx ? 0 : dynamicShadowRadius;
  const fontStyleOverride = getFontStyle(safeCustomization.fontStyle || 'default');
  const isSoilBackground = safeCustomization.backgroundStyle === 'soil';

  //  MEYVE + TEMA SİSTEMİ
  const cardData = useMemo(() => {
    const masterLevel = word.masterLevel || 0;
    const wrongCount = word.wrongCount || 0;
    const streak = word.consecutiveCorrect || 0;
    const masterSessions = word.consecutiveMasterSessions || 0;
    const isFromInventory = word.totalHarvests > 0;

    // 📊 Quiz istatistikleri
    const quizCorrect = word.quizCorrect || 0;
    const quizWrong = word.quizWrong || 0;
    const totalQuizAnswers = quizCorrect + quizWrong;
    const successRate = totalQuizAnswers > 0 ? Math.round((quizCorrect / totalQuizAnswers) * 100) : 0;

    //  MEYVE SİSTEMİ
    const rawFruitType = word.fruitType || getFruitType(word.difficulty, !!word.isPhrasalVerb);
    const fruitType: FruitType =
      rawFruitType && rawFruitType in FRUIT_COLORS ? (rawFruitType as FruitType) : 'banana';
    const fruitGrowthStage = word.fruitGrowthStage || 0;
    const isHarvestReady = word.isHarvestReady || false;
    const rewardClaimedPerfect = word.rewardClaimedPerfect || false;

    // 🌱 Session gereksinimleri (tier'a göre değişiyor):
    // Yeşil → Master: 3 session
    // Master -> Ultra: 4 session
    // Ultra -> Perfect: 5 session
    // Perfect: 6 session (ilk ödül için), 1 session (ödül alındıysa)
    //  TUTORIAL ÖZEL: tutorialFirstWrongWord için SADECE YEİLE KADAR 1 session
    const isTutorialActive = tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED';
    const isTutorialCard = isTutorialActive && tutorialFirstWrongWord?.id === word.id;

    // Tutorial kartıysa VE yeşildeyse (masterLevel=0) 1 session, değilse normal
    const baseSessions = (isTutorialCard && masterLevel === 0) ? 1 : (TIER_SESSION_REQUIREMENTS[masterLevel] || 3);
    // Perfect kartta ödül alınmışsa 1 session yeterli
    const requiredSessions = (masterLevel === 3 && rewardClaimedPerfect) ? 1 : baseSessions;

    //  MEYVE SADECE YEİL VE ÜZERİ KARTLARDA GÖRÜNECEK
    // Kırmızı/Sarı: Sprout görseli (TURUNCU KALDIRILDI)
    // Yeşil (wrongCount >= 2, masterLevel = 0): meyve_1
    // Master/Ultra/Perfect: meyve_2, meyve_3, meyve_4
    const showFruit = wrongCount >= 2 || masterLevel > 0;

    let category: ThemeKey;
    let streakNeeded: number;
    let displayStreak: number;
    let showInfinity = false;

    //  YENİ SİSTEM: Tier'a göre değişen session gereksinimleri
    if (masterLevel === 3) {
      category = 'perfect';
      streakNeeded = requiredSessions; // Perfect tier - 1 session
      displayStreak = masterSessions;
      showInfinity = false; // 🚫 Asla sonsuz gösterme - her zaman 0/1
    } else if (masterLevel === 2) {
      category = 'ultra';
      streakNeeded = requiredSessions; // Ultra → Perfect için 8 session
      displayStreak = masterSessions;
    } else if (masterLevel === 1) {
      category = 'master';
      streakNeeded = requiredSessions; // Master → Ultra için 4 session
      displayStreak = masterSessions;
    } else if (wrongCount >= 2) {
      // YENİ: wrongCount >= 2 = yeşil (TURUNCU KALDIRILDI)
      category = 'green';
      streakNeeded = requiredSessions; // Yeşil → Master için 3 session
      displayStreak = masterSessions;
    } else if (wrongCount >= 1) {
      // YENİ: wrongCount = 1 = sarı (turuncu kalktı)
      category = 'yellow';
      streakNeeded = isTutorialCard ? 1 : 2; // Sarı → Yeşil için 2 session (tutorial'da 1)
      displayStreak = masterSessions;
    } else {
      category = 'red';
      streakNeeded = 1; // Kırmızı → Sarı için 1 session
      displayStreak = masterSessions;
    }

    const theme = THEMES[category];

    //  KART TEMA OVERLAY - Kullanıcının seçtiği tema varsa üstüne tint uygula
    const overlay = !isSoilBackground && activeThemeId !== 'default' ? getThemeOverlay(activeThemeId) : null;
    const mergedTheme = overlay ? {
      ...theme,
      border: overlay.borderColor,
      borderGlow: overlay.borderGlow,
    } : theme;

    const soilTheme = isSoilBackground ? {
      ...mergedTheme,
      gradient: ['rgba(36, 20, 13, 0.98)', 'rgba(58, 36, 30, 0.96)', 'rgba(28, 16, 11, 0.98)'] as const,
      glassOverlay: 'rgba(0, 0, 0, 0.24)',
      textMain: '#f7efe4',
      textSecondary: '#ddc7ae',
      border: 'rgba(121, 85, 72, 0.85)',
      borderGlow: '#6d4c41',
      badgeBg: 'rgba(93, 64, 55, 0.5)',
      badgeText: '#f2e5d4',
      barBg: 'rgba(0, 0, 0, 0.45)',
      barBorder: 'rgba(161, 136, 127, 0.7)',
      barFill: ['#a1887f', '#6d4c41'] as const,
      btnGradient: ['#8d6e63', '#5d4037'] as const,
    } : mergedTheme;

    const progress = showInfinity ? 100 : (streakNeeded > 0 ? Math.min((displayStreak / streakNeeded) * 100, 100) : 100);
    // isReady: Session tamamlandı mı? (ama isHarvestReady olmadan "Tamamlanyor" yazılmasın - direkt HASAT bekliyoruz)
    // Perfect kartlar için: isHarvestReady true olduğunda hasat butonu göster, diğer türlü "al" kalsın
    const isReady = isHarvestReady; // Sadece hasat hazırsa "ready" say
    const isMaster = masterLevel > 0;

    // 📊 SAYAÇ DÜZELTME: displayStreak asla streakNeeded'den büyük gösterilmemeli
    const cappedDisplayStreak = showInfinity ? displayStreak : Math.min(displayStreak, streakNeeded);

    //  HASAT BUTONU - Sadece isHarvestReady true ise göster
    let buttonText = 'ÇALIŞ';
    let showHarvestButton = false;

    if (isHarvestReady) {
      showHarvestButton = true;
      if (masterLevel === 3) {
        // Perfect kart - ödül alınmış mı kontrol et
        buttonText = rewardClaimedPerfect ? 'Saga Kaydir - Hasat' : 'Saga Kaydir - Hasat (Kraliyet)';
      } else {
        const nextTierName = getTierName(masterLevel + 1);
        buttonText = `Saga Kaydir - Hasat (${nextTierName})`;
      }
    } else if (isReady && !isHarvestReady) {
      // Session tamamlandı ama hasat henüz hazır değil
      buttonText = 'Tamamlaniyor...';
    }

    // 💰 Hasat ödülü hesapla (master kartlar için)
    // - Yeşil→Master: tier 1 (150/300)
    // - Master->Ultra: tier 2 (300/500)
    // - Ultra->Perfect: tier 3 (500/800)
    // - Perfect İLK hasat: tier 4 (700/1000)
    // - Perfect sonraki hasatlar: ÖDÜLSÜZ
    const isPerfectCard = masterLevel === 3;
    // Perfect kartlarda: rewardClaimedPerfect FALSE ise ilk hasat (tier 4), TRUE ise tekrar hasat (ödülsüz)
    // Diğer kartlarda: masterLevel + 1 tier'ı
    const nextTier = isPerfectCard ? 4 : Math.min(masterLevel + 1, 3);
    const shouldShowReward = isPerfectCard ? !rewardClaimedPerfect : true;
    const harvestReward = isHarvestReady && shouldShowReward ? getTierReward(nextTier) : null;

    return {
      theme: soilTheme,
      themeOverlay: overlay,
      category,
      streak,
      displayStreak: cappedDisplayStreak,
      streakNeeded,
      progress,
      isReady,
      isMaster,
      isFromInventory,
      buttonText,
      showInfinity,
      quizCorrect,
      quizWrong,
      successRate,
      //  Meyve sistemi
      fruitType,
      fruitGrowthStage,
      isHarvestReady,
      showFruit,
      showHarvestButton,
      rewardClaimedPerfect,
      // 💰 Hasat ödülü
      harvestReward,
    };
  }, [word.masterLevel, word.wrongCount, word.consecutiveCorrect, word.consecutiveMasterSessions,
      word.totalHarvests, word.quizCorrect, word.quizWrong, word.fruitType, word.fruitGrowthStage,
      word.isHarvestReady, word.rewardClaimedPerfect, word.difficulty, word.isPhrasalVerb, word.id,
      tutorialStep, tutorialGreenCardSession, activeThemeId, isSoilBackground]);

  const { theme, themeOverlay, category, streak, displayStreak, streakNeeded, progress, isReady, isMaster,
          buttonText, showInfinity, quizCorrect, quizWrong, successRate,
          fruitType, fruitGrowthStage, isHarvestReady, showFruit, showHarvestButton, rewardClaimedPerfect, harvestReward } = cardData;
  const themeVisualFx = useMemo(() => getThemeVisualFx(themeOverlay?.id), [themeOverlay?.id]);
  const baseThemeMotionFx = useMemo(() => getThemeMotionFx(themeOverlay?.id), [themeOverlay?.id]);
  const themeMotionFx = useMemo(
    () => applyBounceIntensity(baseThemeMotionFx, bounceIntensityLevel),
    [baseThemeMotionFx, bounceIntensityLevel]
  );
  // Kart teması animasyonları pahalıdır; çok kartlı listede yalnızca sınırlı sayıda karta uygula.
  const shouldAnimateThemeFx =
    !!themeOverlay &&
    !isSoilBackground &&
    config.enableGlow &&
    allowGlowFx &&
    performanceLevel !== 'LOW' &&
    performanceLevel !== 'MEDIUM' &&
    !isFxSuspended &&
    index < 6;
  const enableMasterShimmerFx = isMaster && config.enableShimmer && allowGlowFx && !isFxSuspended;
  const enableMasterGlowFx = isMaster && config.enableGlow && allowGlowFx && !isFxSuspended;
  const enableMasterPulseFx = isMaster && config.enablePulseAnimations && allowBounceFx && !isFxSuspended;
  const enableThemeBounceFx =
    !!themeOverlay &&
    !isSoilBackground &&
    config.enablePulseAnimations &&
    allowBounceFx &&
    performanceLevel !== 'LOW' &&
    !isFxSuspended &&
    index < 4;
  const enableFruitGlowFx = isHarvestReady && !rewardClaimedPerfect && allowGlowFx && !isFxSuspended;

  useEffect(() => {
    if (!shouldAnimateThemeFx) {
      themeSweepAnim.stopAnimation();
      themeAuraAnim.stopAnimation();
      themeSparkAnim.stopAnimation();
      themeSweepAnim.setValue(0);
      themeAuraAnim.setValue(0.4);
      themeSparkAnim.setValue(0.5);
      return;
    }

    const sweep = Animated.loop(
      Animated.timing(themeSweepAnim, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const aura = Animated.loop(
      Animated.sequence([
        Animated.timing(themeAuraAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(themeAuraAnim, {
          toValue: 0.45,
          duration: 900,
          easing: Easing.in(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(themeSparkAnim, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(themeSparkAnim, {
          toValue: 0.3,
          duration: 550,
          easing: Easing.in(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    sweep.start();
    aura.start();
    sparkle.start();

    return () => {
      sweep.stop();
      aura.stop();
      sparkle.stop();
    };
  }, [
    shouldAnimateThemeFx,
    themeSweepAnim,
    themeAuraAnim,
    themeSparkAnim,
  ]);

  useEffect(() => {
    if (!enableThemeBounceFx) {
      themeBounceAnim.setValue(1);
      return;
    }

    const overlayPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(themeBounceAnim, {
          toValue: themeMotionFx.overlayPulsePeak,
          duration: Math.max(260, Math.floor(themeMotionFx.pulseDuration * 0.9)),
          useNativeDriver: true,
          easing: Easing.out(Easing.sin),
        }),
        Animated.timing(themeBounceAnim, {
          toValue: 1,
          duration: Math.max(260, Math.floor(themeMotionFx.pulseDuration * 1.15)),
          useNativeDriver: true,
          easing: Easing.in(Easing.sin),
        }),
      ])
    );
    overlayPulse.start();

    return () => {
      overlayPulse.stop();
    };
  }, [enableThemeBounceFx, themeBounceAnim, themeMotionFx.overlayPulsePeak, themeMotionFx.pulseDuration]);

  // 🚀 SMOOTH ENTRANCE: Artık giriş animasyonu devre dışı - tab değişiminde blur önleme
  // Kartlar anında görünür, entrance delay/animasyon kaldırıldı
  useEffect(() => {
    //  Animasyon devre dışı - kartlar hemen görünür
    fadeAnim.setValue(1);
    translateAnim.setValue(0);
  }, [index, fadeAnim, translateAnim]);

  // ✨ SHIMMER EFEKTİ - SADECE MASTER KARTLAR için (elitlik!) + PERFORMANS KONTROLÜ
  useEffect(() => {
    if (enableMasterShimmerFx) {
      const shimmer = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      );
      shimmer.start();
      return () => shimmer.stop();
    }
    shimmerAnim.setValue(-1);
  }, [enableMasterShimmerFx, shimmerAnim]);

  // 🌟 GLOW PULSE - SADECE MASTER KARTLAR için (premium his) + PERFORMANS KONTROLÜ
  useEffect(() => {
    if (enableMasterGlowFx) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.9,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.out(Easing.sin),
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.in(Easing.sin),
          }),
        ])
      );
      glow.start();
      return () => glow.stop();
    }
    glowAnim.setValue(0.4);
  }, [enableMasterGlowFx, glowAnim]);

  // 💓 PULSE - SADECE MASTER KARTLAR için (nabız efekti) + PERFORMANS KONTROLÜ
  useEffect(() => {
    if (enableMasterPulseFx) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: themeMotionFx.masterPulsePeak,
            duration: themeMotionFx.pulseDuration,
            useNativeDriver: true,
            easing: Easing.out(Easing.sin),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: themeMotionFx.pulseDuration,
            useNativeDriver: true,
            easing: Easing.in(Easing.sin),
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [enableMasterPulseFx, pulseAnim, themeMotionFx.masterPulsePeak, themeMotionFx.pulseDuration]);

  // Shimmer interpolation (master only)
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-dynamicCardWidth * 2, dynamicCardWidth * 2],
  });
  const themeSweepTranslate = themeSweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-dynamicCardWidth, dynamicCardWidth * 1.45],
  });
  const themeAuraOpacity = themeAuraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [themeVisualFx.auraOpacity * 0.75, themeVisualFx.auraOpacity],
  });
  const themeSparkOpacity = themeSparkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0.95],
  });

  const playFruitGrowPulse = useCallback((stage: number = fruitGrowthStage) => {
    if (!allowBounceFx) return;
    const safeStage = Math.max(0, Math.min(Number.isFinite(stage) ? Math.floor(stage) : 0, 3));
    const sessionProgressRatio = streakNeeded > 0
      ? Math.max(0, Math.min(displayStreak / streakNeeded, 1))
      : 1;
    const peakByStage = [1.28, 1.4, 1.52, 1.64];
    const progressBoost = (isMaster ? 0.07 : 0.05) * sessionProgressRatio;
    const peakScale = Math.min((peakByStage[safeStage] || 1.4) + progressBoost, 1.72);
    Animated.sequence([
      Animated.spring(fruitScaleAnim, {
        toValue: peakScale,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(fruitScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [allowBounceFx, fruitScaleAnim, fruitGrowthStage, displayStreak, streakNeeded, isMaster]);

  //  MEYVE BÜYÜME ANİMASYONU - Session tamamlandığında
  useEffect(() => {
    if (showFruit && fruitGrowthStage > 0) {
      playFruitGrowPulse(fruitGrowthStage);
    }
  }, [fruitGrowthStage, showFruit, playFruitGrowPulse]);

  //  Session arttığında da meyve animasyonu tetikle (stage aynı kalsa bile)
  useEffect(() => {
    if (!showFruit) {
      previousSessionProgressRef.current = null;
      return;
    }

    const currentProgress = Math.max(0, Math.floor(Number(displayStreak) || 0));
    const previousProgress = previousSessionProgressRef.current;
    previousSessionProgressRef.current = currentProgress;

    if (previousProgress === null) return;
    if (currentProgress <= previousProgress) return;

    playFruitGrowPulse(fruitGrowthStage);
  }, [displayStreak, showFruit, playFruitGrowPulse, fruitGrowthStage]);

  //  HASAT HAZIR GLOW - Hasat hazır olduğunda pulse
  useEffect(() => {
    if (enableFruitGlowFx) {
      const glowPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(fruitGlowAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.sin),
          }),
          Animated.timing(fruitGlowAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.in(Easing.sin),
          }),
        ])
      );
      glowPulse.start();
      return () => glowPulse.stop();
    }
    fruitGlowAnim.setValue(0);
  }, [enableFruitGlowFx, fruitGlowAnim]);

  //  Favori toggle handler
  const handleFavoritePress = useCallback(() => {
    // 🔒 Tutorial sırasında favori butonu kilitli
    if (tutorialStep !== 'COMPLETED') {
      haptic.error();
      return;
    }

    haptic.light();
    toggleFavorite?.(word.id);
  }, [toggleFavorite, word.id, tutorialStep]);

  // 🌾 HASAT handler
  const handleHarvest = useCallback(() => {
    if (!showHarvestButton) return;

    haptic.harvestCelebration();
    sound.playEpicHarvest?.();

    //  ULTRA ARCADE - Anlık hasat animasyonu
    Animated.sequence([
      Animated.spring(fruitScaleAnim, {
        toValue: 1.4,
        friction: 8,
        tension: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fruitScaleAnim, {
        toValue: 0,
        duration: 60, // 🚀 ULTRA FAST: 100 -> 60ms
        useNativeDriver: true,
        easing: Easing.in(Easing.back(2)),
      }),
    ]).start(() => {
      // Hasat işlemi - ANINDA
      const result = harvestWord?.(word.id);
      if (result?.success) {
        // Reset animasyon
        fruitScaleAnim.setValue(1);

        //  TUTORIAL: Hasat edilince STEP_12_INVENTORY'e geç
        if (tutorialStep === 'STEP_10_TO_GREEN' || tutorialStep === 'STEP_11_HARVEST') {
          if (tutorialTransitionTimeoutRef.current) {
            clearTimeout(tutorialTransitionTimeoutRef.current);
          }
          tutorialTransitionTimeoutRef.current = setTimeout(() => {
            setTutorialStep('STEP_12_INVENTORY');
            tutorialTransitionTimeoutRef.current = null;
          }, 500);
        }
      }
    });
  }, [showHarvestButton, harvestWord, word.id, fruitScaleAnim, tutorialStep, setTutorialStep]);

  //  Press handlers - ULTRA JUICY
  const handlePressIn = useCallback(() => {
    haptic.light();
    if (!allowBounceFx) return;
    Animated.spring(scaleAnim, {
      toValue: themeMotionFx.pressInScale,
      useNativeDriver: true,
      friction: 8,
      tension: 200,
    }).start();
  }, [allowBounceFx, scaleAnim, themeMotionFx.pressInScale]);

  const handlePressOut = useCallback(() => {
    if (!allowBounceFx) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  }, [allowBounceFx, scaleAnim]);

  useEffect(() => {
    if (!allowBounceFx) {
      scaleAnim.setValue(1);
    }
  }, [allowBounceFx, scaleAnim]);

  const baseScaleAnim = isMaster ? Animated.multiply(scaleAnim, pulseAnim) : scaleAnim;
  const cardScaleAnim = Animated.multiply(baseScaleAnim, themeBounceAnim);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          width: dynamicCardWidth,
          opacity: fadeAnim,
          transform: [
            { translateY: translateAnim },
            { scale: cardScaleAnim },
          ],
        },
        //  TUTORIAL HIGHLIGHT - Yeşil parlak border
        isHighlighted && !isFxSuspended && {
          borderWidth: 3,
          borderColor: '#22c55e',
          borderRadius: dynamicCardRadius + rs(6),
          shadowColor: '#22c55e',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 15,
        },
      ]}
    >
      {/* 🌟 GLOW EFFECT - MiniQuiz açıkken tamamen kapalı */}
      {!isFxSuspended && (isHighlighted ? (
        <View
          style={[
            styles.glowEffect,
            {
              opacity: 0.9,
              backgroundColor: '#22c55e',
              shadowColor: '#22c55e',
              borderRadius: dynamicCardRadius + rs(6),
            },
          ]}
        />
      ) : allowGlowFx ? (isMaster ? (
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowAnim,
              backgroundColor: theme.borderGlow,
              shadowColor: theme.borderGlow,
              borderRadius: dynamicCardRadius + rs(6),
            },
          ]}
        />
      ) : isReady ? (
        <View
          style={[
            styles.glowEffect,
            {
              opacity: 0.65,
              backgroundColor: theme.borderGlow,
              shadowColor: theme.borderGlow,
              borderRadius: dynamicCardRadius + rs(6),
            },
          ]}
        />
      ) : null) : null)}

      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={showHarvestButton ? handleHarvest : onPress}
        style={[styles.touchable, { borderRadius: dynamicCardRadius }]}
      >
        {/* Main Card with Glow Border */}
        <View
          style={[
            styles.cardBorder,
            {
              borderRadius: dynamicCardRadius,
              borderWidth: dynamicBorderWidth,
              borderColor: theme.border,
              shadowColor: theme.borderGlow,
              shadowRadius: effectiveShadowRadius,
              shadowOpacity: effectiveShadowRadius > 0 ? (isMaster ? 0.42 : 0.35) : 0,
              shadowOffset: { width: 0, height: effectiveShadowRadius > 0 ? rs(8) : 0 },
              elevation: effectiveShadowRadius > 0 ? 10 : 0,
            }
          ]}
        >
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardGradient, { padding: dynamicCardPadding, minHeight: dynamicCardMinHeight, borderRadius: dynamicCardRadius }]}
          >
            {/* Glass Overlay - Static */}
            <View style={[styles.glassOverlay, { backgroundColor: theme.glassOverlay, borderRadius: dynamicCardRadius }]} />

            {/*  TEMA OVERLAY TINT - Kullanıcı teması varsa gradient tint uygula */}
            {themeOverlay && (
              <LinearGradient
                colors={[...themeOverlay.gradientTint] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            )}
            {themeOverlay && !isSoilBackground && shouldAnimateThemeFx && (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.themeFxAura,
                    {
                      borderRadius: dynamicCardRadius,
                      borderColor: themeVisualFx.auraColor,
                      shadowColor: themeVisualFx.auraColor,
                      opacity: themeAuraOpacity,
                    },
                  ]}
                />
                {themeVisualFx.rainbowFilm && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.themeFxRainbow,
                      {
                        borderRadius: dynamicCardRadius,
                        opacity: themeAuraOpacity,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[...themeVisualFx.rainbowFilm] as [string, string, string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                )}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.themeFxSweep,
                    {
                      opacity: themeSparkOpacity,
                      transform: [{ translateX: themeSweepTranslate }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[...themeVisualFx.sweepColors] as [string, string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                {themeVisualFx.sparkleColor && (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.themeFxSparkle,
                        {
                          left: '14%',
                          top: '24%',
                          backgroundColor: themeVisualFx.sparkleColor,
                          shadowColor: themeVisualFx.sparkleColor,
                          opacity: themeSparkOpacity,
                        },
                      ]}
                    />
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.themeFxSparkle,
                        {
                          left: '79%',
                          top: '29%',
                          width: rs(6),
                          height: rs(6),
                          borderRadius: rs(3),
                          backgroundColor: themeVisualFx.sparkleColor,
                          shadowColor: themeVisualFx.sparkleColor,
                          opacity: themeSparkOpacity,
                          transform: [{ scale: 0.85 }],
                        },
                      ]}
                    />
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.themeFxSparkle,
                        {
                          left: '67%',
                          top: '72%',
                          width: rs(5),
                          height: rs(5),
                          borderRadius: rs(2.5),
                          backgroundColor: themeVisualFx.sparkleColor,
                          shadowColor: themeVisualFx.sparkleColor,
                          opacity: themeSparkOpacity,
                          transform: [{ scale: 0.7 }],
                        },
                      ]}
                    />
                  </>
                )}
              </>
            )}

            {isSoilBackground && (
              <View style={[styles.soilOverlay, { borderRadius: dynamicCardRadius }]} pointerEvents="none">
                <LinearGradient
                  colors={['rgba(22,12,8,0.72)', 'rgba(36,21,14,0.7)', 'rgba(54,33,27,0.66)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.soilGrassStripe} />
                {SOIL_DOT_LAYOUT.map((dot, index) => (
                  <View
                    key={`soil-dot-${index}`}
                    style={[
                      styles.soilDot,
                      {
                        left: dot.left,
                        top: dot.top,
                        width: dot.size,
                        height: dot.size,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* ✨ SHIMMER EFFECT - Master kartlar için ANIMATED! + PERFORMANS KONTROLÜ */}
            {enableMasterShimmerFx && (
              <Animated.View
                style={[
                  styles.shimmerEffect,
                  {
                    transform: [{ translateX: shimmerTranslate }],
                  },
                ]}
              />
            )}

            {/* 💧 Su damlacıkları animasyonu - Seviye artışında veya korunma (LOCAL STATE) */}
            <CardWaterDrops
              key={`water-${feedbackKey}`}
              visible={allowBurstFx && (feedbackType === 'levelUp' || feedbackType === 'protected')}
              onComplete={handleFeedbackComplete}
              performanceLevel={performanceLevel}
              isProtected={feedbackType === 'protected'}
              dropCount={config.cardFeedbackDropCount}
              duration={config.cardFeedbackDuration}
              showText={config.enableCardFeedbackText}
            />

            {/*  Böcek animasyonu - Seviye düşüşünde (LOCAL STATE) */}
            <CardBugCrawl
              key={`bug-${feedbackKey}`}
              visible={allowBurstFx && feedbackType === 'levelDown'}
              onComplete={handleFeedbackComplete}
              performanceLevel={performanceLevel}
              bugCount={config.cardFeedbackDropCount}
              duration={config.cardFeedbackDuration}
              showText={config.enableCardFeedbackText}
            />

            {/*  MEYVE veya 🌱 SPROUT - Arka planda */}
            {(() => {
              const masterLevel = word.masterLevel || 0;

              //  MEYVE GÖRSELİ - YEİL (wrongCount >= 2) VE ÜSTÜ KARTLARDA
              if (showFruit) {
                //  Kart boyutuna göre MAX meyve boyutu - MEYVE TÜRÜNe GÖRE FARKLILANDI
                let cardMaxSize: number;
                if (fruitType === 'watermelon') {
                  //  KARPUZ - TÜM SEVİYELERDE KÜÇÜK
                  cardMaxSize = isTinyScreen ? 180 : isSmallScreen ? 200 : 240;
                } else {
                  //  MEYVE (Muz, Kiraz, Çilek, Üzüm, Elma) - NORMAL BOYUT
                  cardMaxSize = isTinyScreen ? 250 : isSmallScreen ? 290 : 340;
                }

                //  TIER VISUAL HESAPLAMA:
                // masterLevel 0 (Yeşil) = tier 1 → meyve_1
                // masterLevel 1 (Master) = tier 2 -> meyve_2
                // masterLevel 2 (Ultra) = tier 3 -> meyve_3
                // masterLevel 3 (Perfect) = tier 4 -> meyve_4
                const tierVisual = masterLevel === 0 ? 1 : masterLevel + 1; // Yeşil = 1, Master = 2, Ultra = 3, Perfect = 4

                // 👑 PERFECT KART İÇİN ÖZEL BOYUT - Kartın içinde kalmalı!
                let fruitSize: number;
                const sessionProgressRatio = streakNeeded > 0
                  ? Math.max(0, Math.min(displayStreak / streakNeeded, 1))
                  : 1;
                const sessionGrowthBoost = (masterLevel > 0
                  ? (fruitType === 'watermelon' ? 0.05 : 0.08)
                  : (fruitType === 'watermelon' ? 0.03 : 0.055)) * sessionProgressRatio;
                if (masterLevel === 3) {
                  // 🌟 PERFECT: Seviye özel boyut
                  let perfectMultiplier: number;
                  if (fruitType === 'watermelon') {
                    //  KARPUZ4: Biraz daha büyük
                    perfectMultiplier = isHarvestReady ? 0.99 : 0.94;
                  } else if (fruitType === 'banana') {
                    //  MUZ4: Küçültülmüş (sadece tier 4 için)
                    perfectMultiplier = isHarvestReady ? 0.90 : 0.82;
                  } else {
                    //  DİER MEYVELER: Normal
                    perfectMultiplier = isHarvestReady ? 1.00 : 0.92;
                  }
                  const boostedPerfectMultiplier = Math.min(
                    perfectMultiplier + sessionGrowthBoost,
                    fruitType === 'watermelon' ? 1.08 : 1.12
                  );
                  fruitSize = Math.round(cardMaxSize * boostedPerfectMultiplier);
                } else {
                  // 🌱 TIER 1-3: Growth multipliers
                  let growthMultipliers: number[];
                  if (fruitType === 'watermelon') {
                    //  KARPUZ: Tüm tier'lerde küçük
                    growthMultipliers = [0.68, 0.86, 1.03, 1.17];
                  } else {
                    //  DİER MEYVELER: Normal growth
                    growthMultipliers = [0.86, 1.06, 1.24, 1.36];
                  }
                  const currentMultiplier = growthMultipliers[Math.min(fruitGrowthStage, 3)];
                  const boostedMultiplier = Math.min(
                    currentMultiplier + sessionGrowthBoost,
                    fruitType === 'watermelon' ? 1.22 : 1.42
                  );
                  fruitSize = Math.round(cardMaxSize * boostedMultiplier);
                }

                const fruitColors = FRUIT_COLORS[fruitType];

                return (
                  <View style={styles.sproutContainer} pointerEvents="none">
                    {/* Hasat hazır glow - Perfect kartlarda her zaman göster */}
                    {isHarvestReady && !isFxSuspended && (
                      <Animated.View
                        style={[
                          styles.fruitGlow,
                          {
                            opacity: fruitGlowAnim,
                            backgroundColor: fruitColors.glow,
                            width: fruitSize + 40,
                            height: fruitSize + 40,
                            borderRadius: (fruitSize + 40) / 2,
                          }
                        ]}
                      />
                    )}
                    {/*  Perfect kart için aşağıya kaydırılmış - ortalanmış */}
                    <Animated.View style={[
                      { transform: [{ scale: fruitScaleAnim }] },
                      masterLevel === 3 && { marginTop: isTinyScreen ? 10 : isSmallScreen ? 12 : 15 }
                    ]}>
                      <Image
                        source={getFruitImageSource(fruitType, tierVisual)}
                        style={{ width: fruitSize, height: fruitSize, opacity: masterLevel === 3 ? 0.95 : 0.9 }}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        priority="high"
                        transition={0}
                        placeholder={getFruitImageSource(fruitType, tierVisual)}
                      />
                    </Animated.View>
                  </View>
                );
              }

              // 🌱 TOHUM GÖRSELİ - Kırmızı/Sarı kartlarda ilerlemeye göre
              // Kırmızı: tohumenkucuk
              // Sarı 0/2: tohumorta
              // Sarı 1/2+: tohumenbuyuk
              let seedSource = SEED_SMALL_IMAGE;
              let seedSize: number;
              let seedOpacity: number;

              if (category === 'yellow') {
                const yellowProgress = Math.max(0, Math.min(displayStreak || 0, streakNeeded || 0));
                const isYellowAdvanced = yellowProgress >= 1;
                seedSource = isYellowAdvanced ? SEED_LARGE_IMAGE : SEED_MEDIUM_IMAGE;
                seedSize = isYellowAdvanced
                  ? (isTinyScreen ? 185 : isSmallScreen ? 215 : 250)
                  : (isTinyScreen ? 155 : isSmallScreen ? 185 : 220);
                seedOpacity = 0.78;
              } else {
                seedSource = SEED_SMALL_IMAGE;
                seedSize = isTinyScreen ? 120 : isSmallScreen ? 145 : 175;
                seedOpacity = 0.62;
              }

              return (
                <View style={[styles.sproutContainer, { opacity: seedOpacity }]} pointerEvents="none">
                  <Image
                    source={seedSource}
                    style={{ width: seedSize, height: seedSize }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                </View>
              );
            })()}

            {/* 📚 PV BADGE - Sol üst köşe (mor) */}
            {isPhrasalVerb && (
              <View style={styles.pvBadge}>
                <Text style={styles.pvBadgeText}>PV</Text>
              </View>
            )}

            {/*  MY BADGE - Sol üst köşe (altın) - Kendi kelimelerim */}
            {isCustomWord && !isPhrasalVerb && (
              <View style={styles.myBadge}>
                <Text style={styles.myBadgeText}>MY</Text>
              </View>
            )}

            {/*  FAVORİ BUTONU - Sağ üst köşe */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Star
                size={isTinyScreen ? rs(14) : isSmallScreen ? rs(16) : rs(18)}
                color={isFavorite ? '#fbbf24' : 'rgba(255, 255, 255, 0.5)'}
                fill={isFavorite ? '#fbbf24' : 'transparent'}
              />
            </TouchableOpacity>

            {shouldShowStatusEmojiBadge && (
              <View style={[styles.statusEmojiBadge, { backgroundColor: `${theme.badgeBg}`, borderColor: theme.border }]}>
                <Text style={[styles.statusEmojiText, { color: theme.badgeText }]}>{theme.emoji}</Text>
              </View>
            )}

            {/*  MEYVE ETİKETİ - KALDIRILDI - Meyve zaten arka planda gösteriliyor */}

            {/* Content */}
            <View style={styles.content}>
              {/* Word - Ana kelime (ortalanmış) */}
              <Text style={[
                styles.wordText,
                { color: theme.textMain },
                fontStyleOverride,
              ]} numberOfLines={2}>
                {displayWordText}
              </Text>

              {/*  STREAK COUNTER */}
              {safeCustomization.showLevel && (
                <View style={[
                  styles.streakCounter,
                  { backgroundColor: theme.badgeBg, borderColor: theme.border },
                ]}>
                  <Text style={[
                    styles.streakNumber,
                    { color: theme.textMain },
                    fontStyleOverride,
                  ]}>
                    {displayStreak}
                  </Text>
                  <Text style={[
                    styles.streakSlash,
                    { color: theme.textSecondary },
                    fontStyleOverride,
                  ]}>
                    /{showInfinity ? '∞' : streakNeeded}
                  </Text>
                  {safeCustomization.showEmoji && showInfinity && <Text style={styles.readyEmoji}>{'\u{1F451}'}</Text>}
                  {safeCustomization.showEmoji && isReady && !showInfinity && <Text style={styles.readyEmoji}>{'\u{2728}'}</Text>}
                </View>
              )}

              {/* Progress Bar */}
              {safeCustomization.showProgressBar && (
                <View style={styles.progressBarWrapper}>
                  <View style={[
                    styles.progressBarContainer,
                    { borderColor: theme.barBorder, backgroundColor: theme.barBg, flex: 1 },
                  ]}>
                    <LinearGradient
                      colors={theme.barFill}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={[styles.progressBarFill, { width: `${successRate}%` }]}
                    />
                  </View>
                </View>
              )}

              {/*  HASAT ET veya ÇALI Butonu */}
              {showHarvestButton ? (
                <>
                  <TouchableOpacity onPress={handleHarvest} activeOpacity={0.85}>
                    <LinearGradient
                      colors={['#f59e0b', '#d97706', '#b45309']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.actionButton,
                        styles.harvestButton,
                        { borderColor: '#fbbf24' },
                      ]}
                    >
                      <Text style={[styles.harvestButtonText, fontStyleOverride]}>
                        {buttonText}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {/* 💰 Hasat Ödülü Gösterimi */}
                  {harvestReward && (
                    <View style={styles.harvestRewardContainer}>
                      <Text style={styles.harvestRewardText}>
                        {'\u{1F4B0}'} {harvestReward.coins} {'•'} {'⭐'} {harvestReward.xp} XP
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  onPress={isButtonLocked ? undefined : (onQuizPress || onPress)}
                  activeOpacity={isButtonLocked ? 1 : 0.85}
                  disabled={isButtonLocked}
                >
                  <LinearGradient
                    colors={isButtonLocked
                      ? ['rgba(100, 100, 100, 0.3)', 'rgba(80, 80, 80, 0.3)']
                      : (isReady ? ['#16a34a', '#059669'] : theme.btnGradient)
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.actionButton,
                      {
                        borderColor: isButtonLocked ? '#666' : (isReady ? '#22c55e' : theme.border),
                        opacity: isButtonLocked ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text style={[
                      styles.actionButtonText,
                      isButtonLocked && { color: '#999' },
                      fontStyleOverride,
                    ]}>
                      {isButtonLocked ? 'KILITLI' : buttonText}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Master Card Indicator */}
            {isMaster && allowGlowFx && !isFxSuspended && (
              <View style={[styles.masterIndicator, { backgroundColor: theme.borderGlow }]} />
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // 🚀 Custom comparison - sadece önemli değişikliklerde re-render
  return (
    prevProps.word.text === nextProps.word.text &&
    prevProps.word.consecutiveCorrect === nextProps.word.consecutiveCorrect &&
    prevProps.word.wrongCount === nextProps.word.wrongCount &&
    prevProps.word.masterLevel === nextProps.word.masterLevel &&
    prevProps.word.totalHarvests === nextProps.word.totalHarvests &&
    prevProps.word.isFavorite === nextProps.word.isFavorite &&
    prevProps.word.isPhrasalVerb === nextProps.word.isPhrasalVerb &&
    prevProps.word.quizCorrect === nextProps.word.quizCorrect &&
    prevProps.word.quizWrong === nextProps.word.quizWrong &&
    prevProps.word.fruitType === nextProps.word.fruitType &&
    prevProps.word.fruitGrowthStage === nextProps.word.fruitGrowthStage &&
    prevProps.word.isHarvestReady === nextProps.word.isHarvestReady &&
    prevProps.word.rewardClaimedPerfect === nextProps.word.rewardClaimedPerfect &&
    prevProps.index === nextProps.index &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.suspendHeavyEffects === nextProps.suspendHeavyEffects
  );
});

const styles = StyleSheet.create({
  cardWrapper: {
    // width: dynamic (inline style)
    marginBottom: rs(14),
    marginHorizontal: CARD_MARGIN / 2,
  },
  // 🌟 GLOW EFFECT - Premium parlama
  glowEffect: {
    position: 'absolute',
    top: rs(-6),
    left: rs(-6),
    right: rs(-6),
    bottom: rs(-6),
    borderRadius: rs(24),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: rs(20),
    elevation: 12,
  },
  touchable: {
    borderRadius: rs(18),
  },
  cardBorder: {
    borderRadius: rs(18),
    borderWidth: rs(1.5),
    overflow: 'hidden',
    // 3D shadow - enhanced
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.4,
    shadowRadius: rs(12),
    elevation: 10,
  },
  cardGradient: {
    padding: IS_TINY_SCREEN ? rs(12) : IS_SMALL_SCREEN ? rs(14) : rs(16),
    minHeight: IS_TINY_SCREEN ? rs(150) : IS_SMALL_SCREEN ? rs(165) : IS_MEDIUM_SCREEN ? rs(180) : rs(195), //  DAHA BÜYÜK KARTLAR
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: rs(16),
  },
  soilOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  soilGrassStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(4),
    backgroundColor: 'rgba(85, 139, 47, 0.55)',
  },
  soilDot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(109, 76, 65, 0.62)',
  },
  // ✨ ANIMATED SHIMMER - Master kartlar için premium efekt
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: rs(40),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  themeFxAura: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: rs(1.6),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: rs(16),
    zIndex: 2,
  },
  themeFxRainbow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  themeFxSweep: {
    position: 'absolute',
    top: -rs(24),
    bottom: -rs(24),
    width: rs(66),
    zIndex: 3,
    transform: [{ skewX: '-18deg' }],
  },
  themeFxSparkle: {
    position: 'absolute',
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    zIndex: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: rs(8),
  },
  // 📚 PV BADGE - Sol üst köşe (mor) - RESPONSIVE
  pvBadge: {
    position: 'absolute',
    top: IS_TINY_SCREEN ? 4 : 6,
    left: IS_TINY_SCREEN ? 4 : 6,
    backgroundColor: '#a855f7',
    paddingHorizontal: IS_TINY_SCREEN ? 4 : IS_SMALL_SCREEN ? 5 : 6,
    paddingVertical: IS_TINY_SCREEN ? 1.5 : 2,
    borderRadius: IS_TINY_SCREEN ? 4 : 5,
    borderWidth: 1,
    borderColor: '#c084fc',
    zIndex: 25,
  },
  pvBadgeText: {
    fontSize: IS_TINY_SCREEN ? 7 : IS_SMALL_SCREEN ? 8 : 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  //  MY BADGE - Sol üst köşe (altın) - RESPONSIVE
  myBadge: {
    position: 'absolute',
    top: IS_TINY_SCREEN ? 4 : 6,
    left: IS_TINY_SCREEN ? 4 : 6,
    backgroundColor: '#d97706',
    paddingHorizontal: IS_TINY_SCREEN ? 4 : IS_SMALL_SCREEN ? 5 : 6,
    paddingVertical: IS_TINY_SCREEN ? 1.5 : 2,
    borderRadius: IS_TINY_SCREEN ? 4 : 5,
    borderWidth: 1,
    borderColor: '#fbbf24',
    zIndex: 25,
  },
  myBadgeText: {
    fontSize: IS_TINY_SCREEN ? 7 : IS_SMALL_SCREEN ? 8 : 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // 🌱 SPROUT CONTAINER - Arka plan ikonu
  sproutContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  //  FAVORİ BUTONU (SABİT DEERLER - küçük ve köşede)
  favoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  statusEmojiBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  statusEmojiText: {
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    zIndex: 10,
    flex: 1,
  },
  wordText: {
    fontSize: IS_TINY_SCREEN ? rt(16) : IS_SMALL_SCREEN ? rt(18) : rt(20),
    fontWeight: '800',
    marginTop: IS_TINY_SCREEN ? rs(6) : rs(8),
    marginBottom: IS_TINY_SCREEN ? rs(6) : IS_SMALL_SCREEN ? rs(8) : rs(10),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  //  STREAK COUNTER - Belirgin ve Büyük (responsive)
  streakCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: IS_TINY_SCREEN ? rs(10) : IS_SMALL_SCREEN ? rs(12) : rs(16),
    paddingVertical: IS_TINY_SCREEN ? rs(4) : IS_SMALL_SCREEN ? rs(6) : rs(8),
    borderRadius: IS_TINY_SCREEN ? rs(8) : IS_SMALL_SCREEN ? rs(10) : rs(12),
    borderWidth: rs(1),
    marginBottom: IS_TINY_SCREEN ? rs(6) : IS_SMALL_SCREEN ? rs(8) : rs(10),
    gap: rs(2),
  },
  streakNumber: {
    fontSize: IS_TINY_SCREEN ? rt(20) : IS_SMALL_SCREEN ? rt(24) : rt(28),
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streakSlash: {
    fontSize: IS_TINY_SCREEN ? rt(14) : IS_SMALL_SCREEN ? rt(16) : rt(18),
    fontWeight: '700',
    opacity: 0.8,
  },
  readyEmoji: {
    fontSize: IS_TINY_SCREEN ? rt(16) : IS_SMALL_SCREEN ? rt(18) : rt(20),
    marginLeft: IS_TINY_SCREEN ? rs(2) : rs(4),
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_TINY_SCREEN ? rs(4) : IS_SMALL_SCREEN ? rs(5) : rs(6),
    marginBottom: IS_TINY_SCREEN ? rs(6) : IS_SMALL_SCREEN ? rs(8) : rs(10),
  },
  progressBarContainer: {
    height: IS_TINY_SCREEN ? rs(8) : IS_SMALL_SCREEN ? rs(9) : rs(10),
    borderRadius: IS_TINY_SCREEN ? rs(4) : rs(5),
    borderWidth: rs(1),
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: IS_TINY_SCREEN ? rs(3) : rs(4),
  },
  actionButton: {
    paddingVertical: IS_TINY_SCREEN ? rs(7) : IS_SMALL_SCREEN ? rs(8) : rs(10),
    borderRadius: IS_TINY_SCREEN ? rs(8) : IS_SMALL_SCREEN ? rs(9) : rs(10),
    alignItems: 'center',
    borderWidth: rs(1),
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: IS_TINY_SCREEN ? rt(10) : IS_SMALL_SCREEN ? rt(11) : rt(12),
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  masterIndicator: {
    position: 'absolute',
    top: rs(8),
    right: rs(8),
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    opacity: 0.8,
  },
  //  FRUIT SYSTEM STYLES
  fruitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: IS_TINY_SCREEN ? rs(4) : IS_SMALL_SCREEN ? rs(6) : rs(8),
  },
  fruitGlow: {
    position: 'absolute',
    width: IS_TINY_SCREEN ? rs(60) : IS_SMALL_SCREEN ? rs(70) : rs(80),
    height: IS_TINY_SCREEN ? rs(60) : IS_SMALL_SCREEN ? rs(70) : rs(80),
    borderRadius: IS_TINY_SCREEN ? rs(30) : IS_SMALL_SCREEN ? rs(35) : rs(40),
  },
  //  MEYVE ETİKETİ - Sağ üstte favorilerin altında
  fruitBadge: {
    position: 'absolute',
    top: IS_TINY_SCREEN ? rs(32) : IS_SMALL_SCREEN ? rs(36) : rs(40), // Favorilerin altında
    right: IS_TINY_SCREEN ? rs(6) : rs(8),
    backgroundColor: '#FF9500',
    borderRadius: IS_TINY_SCREEN ? rs(10) : rs(12),
    paddingHorizontal: IS_TINY_SCREEN ? rs(6) : rs(8),
    paddingVertical: IS_TINY_SCREEN ? rs(3) : rs(4),
    borderWidth: rs(1.5),
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fruitBadgeText: {
    fontSize: IS_TINY_SCREEN ? rt(8) : IS_SMALL_SCREEN ? rt(9) : rt(10),
    fontWeight: '800',
    color: '#ffffff',
  },
  harvestButton: {
    paddingVertical: IS_TINY_SCREEN ? rs(7) : IS_SMALL_SCREEN ? rs(8) : rs(10),
    borderRadius: IS_TINY_SCREEN ? rs(8) : IS_SMALL_SCREEN ? rs(9) : rs(10),
    alignItems: 'center',
    borderWidth: rs(1),
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  harvestButtonText: {
    color: '#ffffff',
    fontSize: IS_TINY_SCREEN ? rt(10) : IS_SMALL_SCREEN ? rt(11) : rt(12),
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  harvestRewardContainer: {
    marginTop: IS_TINY_SCREEN ? rs(4) : rs(6),
    alignItems: 'center',
    paddingVertical: IS_TINY_SCREEN ? rs(2) : rs(3),
  },
  harvestRewardText: {
    fontSize: IS_TINY_SCREEN ? rt(9) : IS_SMALL_SCREEN ? rt(10) : rt(11),
    fontWeight: '700',
    color: '#fbbf24',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default UltimateWordCard;
