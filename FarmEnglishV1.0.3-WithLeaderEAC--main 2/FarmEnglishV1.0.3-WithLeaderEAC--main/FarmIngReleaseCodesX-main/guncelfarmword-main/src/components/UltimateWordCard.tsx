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
import { getThemeOverlay, BORDER_STYLES } from '../data/cardThemes';

// ğŸŒ± Tohum gÃ¶rselleri - KÄ±rmÄ±zÄ±/SarÄ± ilerleme iÃ§in
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

// ğŸ¨ RENK SÄ°STEMÄ°: KÄ±rmÄ±zÄ± â†’ Turuncu â†’ SarÄ± â†’ YeÅŸil â†’ Envanter + Master seviyeleri
const THEMES = {
  // KÄ±rmÄ±zÄ±: wrongCount >= 10 (en dÃ¼ÅŸÃ¼k seviye - Ã§ok fazla yanlÄ±ÅŸ)
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
  // SarÄ±: wrongCount 1-4 (az yanlÄ±ÅŸ var)
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
  // YeÅŸil: wrongCount 0 (hasat edilebilir - hiÃ§ yanlÄ±ÅŸ yok)
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

// ğŸ’§ KART ÃœZERÄ° SU DAMLACIKLARI ANÄ°MASYONU - Seviye artÄ±ÅŸÄ±nda (performans Ã¶lÃ§ekli)
const CardWaterDrops = React.memo<{
  visible: boolean;
  onComplete?: () => void;
  performanceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'PERFECT';
  isProtected?: boolean; // ğŸ›¡ï¸ Master kart bÃ¶ceklerden korundu mu?
  // ğŸ® Yeni performans config'den gelen deÄŸerler
  dropCount?: number;
  duration?: number;
  showText?: boolean;
}>(({ visible, onComplete, performanceLevel = 'HIGH', isProtected = false, dropCount: configDropCount, duration = 1500, showText = true }) => {
  // ğŸ® PERFORMANSA GÃ–RE DAMLA SAYISI - Config'den gelirse onu kullan
  const dropCount = useMemo(() => {
    if (configDropCount !== undefined) return configDropCount;
    // Fallback: performanceLevel'e gÃ¶re
    switch(performanceLevel) {
      case 'LOW': return 0;
      case 'MEDIUM': return 0;
      case 'HIGH': return 2;
      case 'ULTRA': return 4;
      case 'PERFECT': return 6;
      default: return 4;
    }
  }, [performanceLevel, configDropCount]);

  // ğŸŒ§ï¸ Performansa gÃ¶re damla config - sadece dropCount > 0 ise
  const drops = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      anim: new Animated.Value(0),
      x: 10 + Math.random() * 80, // % pozisyon
      delay: i * 100, // Her damla arasÄ± 100ms
      size: 20 + Math.random() * 10, // 20-30px damlalar
      wave: Math.floor(i / 3),
    }))
  ).current;

  const splashAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const growTextAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // ğŸ® showText false ise hiÃ§ animasyon yapma
    if (!showText && dropCount === 0) {
      setTimeout(() => onComplete?.(), 50);
      return;
    }

    // DamlacÄ±klarÄ± sÄ±fÄ±rla
    drops.forEach(d => d.anim.setValue(0));
    splashAnim.setValue(0);
    glowAnim.setValue(0);
    growTextAnim.setValue(0);

    const animations: Animated.CompositeAnimation[] = [];

    // ğŸŒ§ï¸ SÄ±ralÄ± damla animasyonlarÄ± - sadece dropCount > 0 ise
    if (dropCount > 0) {
      const activeDrops = drops.slice(0, dropCount);
      const dropAnimations = activeDrops.map(drop =>
        Animated.sequence([
          Animated.delay(drop.delay),
          Animated.timing(drop.anim, {
            toValue: 1,
            duration: duration * 0.6, // Animasyon sÃ¼resinin %60'Ä± dÃ¼ÅŸÃ¼ÅŸ
            easing: Easing.bezier(0.2, 0.8, 0.3, 1),
            useNativeDriver: true,
          }),
        ])
      );
      animations.push(...dropAnimations);

      // ğŸ’« ParlaklÄ±k efekti - sadece dropCount > 0 ise
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

      // ğŸŒŠ Su birikintisi splash efekti
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

    // ğŸŒ± "BÜYÜYOR!" yazÄ±sÄ± animasyonu - showText true ise
    if (showText) {
      const textHoldDuration = Math.max(400, duration - 300); // Min 400ms gÃ¶rÃ¼nÃ¼r kal
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

    // AnimasyonlarÄ± Ã§alÄ±ÅŸtÄ±r
    Animated.parallel(animations).start(() => {
      setTimeout(() => onComplete?.(), 50);
    });
  }, [visible, dropCount, duration, showText]);

  if (!visible) return null;

  // ğŸ® Animasyon tamamen kapalÄ±ysa null dÃ¶ndÃ¼r
  if (!showText && dropCount === 0) return null;

  return (
    <View style={cardAnimStyles.waterContainer} pointerEvents="none">
      {/* ğŸŒ± "BÜYÜYOR!" veya ğŸ›¡ï¸ "Böceklerden korundu!" yazÄ±sÄ± - sadece showText true ise */}
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
          <Text style={cardAnimStyles.growTextEmoji}>{isProtected ? '\u{1F6E1}\uFE0F' : '\u{1F4A7}'}</Text>
          <Text style={[cardAnimStyles.growText, isProtected && { color: '#fbbf24' }]}>
            {isProtected ? 'Korundu!' : 'BUYUYOR!'}
          </Text>
        </Animated.View>
      )}

      {/* Su damlacÄ±klarÄ± - sadece dropCount > 0 ise */}
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

      {/* Alt kÄ±sÄ±mda su birikintisi efekti - sadece dropCount > 0 ise */}
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

      {/* ParlaklÄ±k efektleri - sadece dropCount > 0 ise */}
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
            {'\u2728'}
          </Animated.Text>
          <Animated.Text
            style={[
              cardAnimStyles.sparkle,
              { left: '70%', top: '50%' },
              {
                opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
            ]}
          >
            {'\u2728'}
          </Animated.Text>
        </>
      )}
    </View>
  );
});
CardWaterDrops.displayName = 'CardWaterDrops';

// ğŸ› KART ÃœZERÄ° BÃ–CEK ANÄ°MASYONU - Seviye dÃ¼ÅŸÃ¼ÅŸÃ¼nde (TÃœM KARTLARA)
const CardBugCrawl = React.memo<{
  visible: boolean;
  onComplete?: () => void;
  performanceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'PERFECT';
  // ğŸ® Yeni performans config'den gelen deÄŸerler
  bugCount?: number;
  duration?: number;
  showText?: boolean;
}>(({ visible, onComplete, performanceLevel = 'HIGH', bugCount: configBugCount, duration = 1500, showText = true }) => {
  const bugTextAnim = useRef(new Animated.Value(0)).current;

  // ğŸ® PERFORMANSA GÃ–RE BÃ–CEK SAYISI - Config'den gelirse onu kullan
  const bugCount = useMemo(() => {
    if (configBugCount !== undefined) return configBugCount;
    // Fallback: performanceLevel'e gÃ¶re
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
      startX: i % 2 === 0 ? -20 : 120, // SaÄŸdan veya soldan giriÅŸ
      endX: 20 + Math.random() * 60,
      y: 15 + i * 12,
      delay: i * 120,
      emoji: ['\u{1F41B}', '\u{1FAB2}', '\u{1F41C}', '\u{1F577}\uFE0F', '\u{1F997}', '\u{1FAB3}'][i % 6],
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // ğŸ® showText false ise ve bugCount 0 ise hiÃ§ animasyon yapma
    if (!showText && bugCount === 0) {
      setTimeout(() => onComplete?.(), 50);
      return;
    }

    // SÄ±fÄ±rla
    bugs.forEach(b => {
      b.posAnim.setValue(0);
      b.wiggleAnim.setValue(0);
    });
    bugTextAnim.setValue(0);

    const animations: Animated.CompositeAnimation[] = [];

    // Sadece aktif bÃ¶cekleri animasyonla - bugCount > 0 ise
    if (bugCount > 0) {
      const activeBugs = bugs.slice(0, bugCount);
      const bugAnimations = activeBugs.map(bug => {
        // Ana hareket
        const moveAnim = Animated.sequence([
          Animated.delay(bug.delay),
          Animated.timing(bug.posAnim, {
            toValue: 1,
            duration: duration * 0.6, // Animasyon sÃ¼resinin %60'Ä±
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]);

        // KÄ±vrÄ±m hareketi
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

    // ğŸ“ "böceklendi" yazÄ±sÄ± animasyonu - showText true ise
    if (showText) {
      const textHoldDuration = Math.max(400, duration - 300); // Min 400ms gÃ¶rÃ¼nÃ¼r kal
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

    // AnimasyonlarÄ± Ã§alÄ±ÅŸtÄ±r
    Animated.parallel(animations).start(() => {
      setTimeout(() => onComplete?.(), 50);
    });
  }, [visible, bugCount, duration, showText]);

  if (!visible) return null;

  // ğŸ® Animasyon tamamen kapalÄ±ysa null dÃ¶ndÃ¼r
  if (!showText && bugCount === 0) return null;

  return (
    <View style={cardAnimStyles.bugContainer} pointerEvents="none">
      {/* BÃ¶cekler - sadece bugCount > 0 ise */}
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
                  { scaleX: bug.startX < 0 ? 1 : -1 }, // YÃ¶n
                ],
                opacity,
              },
            ]}
          >
            {bug.emoji}
          </Animated.Text>
        );
      })}

      {/* KÃ¶tÃ¼ his efekti - sadece bugCount > 0 ise */}
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

      {/* ğŸ› "böceklendi" yazÄ±sÄ± - sadece showText true ise */}
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
          <Text style={cardAnimStyles.bugText}>boceklendi!</Text>
        </Animated.View>
      )}
    </View>
  );
});
CardBugCrawl.displayName = 'CardBugCrawl';

// ğŸ¨ Kart Ã¼zeri animasyon stilleri
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
  isHighlighted?: boolean; // ğŸ“ Tutorial highlight
  levelFeedback?: { type: 'levelUp' | 'levelDown'; visible: boolean }; // ğŸ’§ğŸ› Seviye animasyonlarÄ±
  onLevelFeedbackComplete?: () => void; // Animasyon bitince callback
}

// ğŸš€ OPTIMIZED: React.memo ile gereksiz render'larÄ± Ã¶nle
export const UltimateWordCard: React.FC<UltimateWordCardProps> = React.memo(({ word, onPress, onQuizPress, index = 0, isHighlighted = false, levelFeedback: propLevelFeedback, onLevelFeedbackComplete }) => {
  const windowDims = useWindowDimensions();

  // ğŸ® PERFORMANS AYARLARI - Store'dan al
  const config = usePerformanceStore(s => s.config);
  const performanceLevel = usePerformanceStore(s => s.level); // 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'PERFECT'
  const enableAnimations = config.enableCardEntryAnimation;
  const enableShimmer = config.enableShimmer;
  const enableGlow = config.enableGlow;
  const enableFloatingParticles = config.enableFloatingParticles;

  // ğŸ“± DYNAMIC LAYOUT - Tablet landscape/portrait optimize
  const isTinyScreen = windowDims.height < 600 || windowDims.width < 360; // 4.7" ve kÃ¼Ã§Ã¼k ekranlar
  const isSmallScreen = windowDims.height < 700 || windowDims.width < 400;
  const isTabletLandscape = windowDims.width > 700 && windowDims.height < 550;
  const isTabletPortrait = windowDims.width < 550 && windowDims.height > 700;

  // ğŸ¯ Store actions
  const toggleFavorite = useFarmStore(s => s.toggleFavorite);
  const harvestWord = useFarmStore(s => s.harvestWord);
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const tutorialGreenCardSession = useFarmStore(s => s.tutorialGreenCardSession);
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  const activeThemeId = useFarmStore(s => s.activeCardTheme);
  const cardCustomization = useFarmStore(s => s.cardCustomization);
  const isFavorite = word.isFavorite || false;

  // ğŸ’§ğŸ› STORE'DAN KART ANÄ°MASYON FEEDBACK - Quiz/Puzzle sonrasÄ±
  const cardFeedback = useFarmStore(s => s.cardFeedback);
  const setCardFeedback = useFarmStore(s => s.setCardFeedback);

  // ğŸ’§ğŸ› LOCAL STATE - Animasyonu kaÃ§Ä±rmamak iÃ§in
  const [localFeedback, setLocalFeedback] = useState<'levelUp' | 'levelDown' | 'protected' | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0); // Her yeni feedback iÃ§in yeni key
  const lastProcessedIdRef = useRef<string | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ğŸ® Animasyon sÃ¼resini config'den al (veya default)
  const ANIMATION_DURATION_MS = config.cardFeedbackDuration || 1500;

  // ğŸ’§ğŸ› Store'dan feedback geldiğinde LOCAL STATE'e aktar
  // NOT: Feedback artÄ±k MiniQuiz kapandÄ±ktan SONRA geliyor (performans iÃ§in)
  useEffect(() => {
    // ğŸ® Performans ayarÄ±na gÃ¶re animasyonu atla
    if (!config.enableCardFeedbackAnimations) {
      // Feedback'i hemen temizle
      if (cardFeedback?.wordId === word.id) {
        setCardFeedback(null);
      }
      return;
    }

    if (cardFeedback?.wordId === word.id && cardFeedback?.id) {
      // SADECE farklÄ± bir feedback ID ise iÅŸle
      if (lastProcessedIdRef.current !== cardFeedback.id) {
        // Ã–nceki timeout'u temizle
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }

        lastProcessedIdRef.current = cardFeedback.id;
        setFeedbackKey(k => k + 1); // Yeni key = yeni animasyon
        setLocalFeedback(cardFeedback.type);

        // Animasyon sÃ¼resince bekle, sonra temizle
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

  // ğŸ’§ğŸ› Animasyon iÃ§in local feedback kullan
  const feedbackType = localFeedback;

  // ğŸ’§ğŸ› Animasyon tamamlandÄ±ÄŸÄ±nda - artÄ±k timeout ile otomatik temizleniyor
  const handleFeedbackComplete = useCallback(() => {
    // Animasyon component'i callback Ã§aÄŸÄ±rabilir ama biz timeout ile yÃ¶netiyoruz
    // Bu callback'i boÅŸ bÄ±rakÄ±yoruz Ã§Ã¼nkÃ¼ timeout zaten temizliyor
  }, []);

  // ğŸ”’ TUTORIAL: STEP_8'de Ã§alÄ±ÅŸ butonunu kilitle - saÄŸa kaydÄ±rmayÄ± Ã¶ÄŸretiyoruz
  const isButtonLocked = tutorialStep === 'STEP_8_CARD_PROGRESS';

  // ğŸ¯ ANÄ°MASYONLAR - Press & entrance + MASTER EXCLUSIVE loops + MEYVE
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; // ğŸš€ BaÅŸlangÄ±Ã§ta 1 - tab deÄŸiÅŸiminde blur Ã¶nleme
  const translateAnim = useRef(new Animated.Value(0)).current; // ğŸš€ BaÅŸlangÄ±Ã§ta 0 - anÄ±nda gÃ¶rÃ¼nÃ¼r
  // ğŸ‘‘ MASTER EXCLUSIVE - Sadece master kartlar iÃ§in premium efektler
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // ğŸ MEYVE ANÄ°MASYONLARI
  const fruitScaleAnim = useRef(new Animated.Value(1)).current;
  const fruitGlowAnim = useRef(new Animated.Value(0)).current;

  // ğŸ“ Phrasal Verb kontrolÃ¼
  const isPhrasalVerb = word.isPhrasalVerb || false;

  // ğŸ·ï¸ Custom kelime kontrolÃ¼
  const isCustomWord = (word as any).isCustom === true;

  const safeCustomization = cardCustomization || ({
    fontStyle: 'default',
    borderStyle: 'default',
    backgroundStyle: 'default',
    showEmoji: true,
    showProgressBar: true,
    showLevel: true,
    compactMode: false,
    largeMode: false,
  } as const);
  const isDefaultCustomization =
    (safeCustomization.fontStyle || 'default') === 'default' &&
    (safeCustomization.borderStyle || 'default') === 'default' &&
    (safeCustomization.backgroundStyle || 'default') === 'default' &&
    !!safeCustomization.showEmoji === true &&
    !!safeCustomization.showProgressBar === true &&
    !!safeCustomization.showLevel === true &&
    !!safeCustomization.compactMode === false &&
    !!safeCustomization.largeMode === false;
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
  const fontStyleOverride = getFontStyle(safeCustomization.fontStyle || 'default');
  const isSoilBackground = safeCustomization.backgroundStyle === 'soil';

  // ğŸ¨ MEYVE + TEMA SÄ°STEMÄ°
  const cardData = useMemo(() => {
    const masterLevel = word.masterLevel || 0;
    const wrongCount = word.wrongCount || 0;
    const streak = word.consecutiveCorrect || 0;
    const masterSessions = word.consecutiveMasterSessions || 0;
    const isFromInventory = word.totalHarvests > 0;

    // ğŸ“Š Quiz istatistikleri
    const quizCorrect = word.quizCorrect || 0;
    const quizWrong = word.quizWrong || 0;
    const totalQuizAnswers = quizCorrect + quizWrong;
    const successRate = totalQuizAnswers > 0 ? Math.round((quizCorrect / totalQuizAnswers) * 100) : 0;

    // ğŸ MEYVE SÄ°STEMÄ°
    const rawFruitType = word.fruitType || getFruitType(word.difficulty, !!word.isPhrasalVerb);
    const fruitType = (rawFruitType && (rawFruitType as any) in FRUIT_COLORS) ? (rawFruitType as any) : 'banana';
    const fruitGrowthStage = word.fruitGrowthStage || 0;
    const isHarvestReady = word.isHarvestReady || false;
    const rewardClaimedPerfect = word.rewardClaimedPerfect || false;

    // ğŸŒ± Session gereksinimleri (tier'a gÃ¶re deÄŸiÅŸiyor):
    // YeÅŸil â†’ Master: 3 session
    // Master â†’ Ultra: 4 session
    // Ultra â†’ Perfect: 5 session
    // Perfect: 6 session (ilk Ã¶dÃ¼l iÃ§in), 1 session (Ã¶dÃ¼l alÄ±ndÄ±ysa)
    // ğŸ“ TUTORIAL Ã–ZEL: tutorialFirstWrongWord iÃ§in SADECE YEÅÄ°LE KADAR 1 session
    const isTutorialActive = tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED';
    const isTutorialCard = isTutorialActive && tutorialFirstWrongWord?.id === word.id;

    // Tutorial kartÄ±ysa VE yeÅŸildeyse (masterLevel=0) 1 session, deÄŸilse normal
    const baseSessions = (isTutorialCard && masterLevel === 0) ? 1 : (TIER_SESSION_REQUIREMENTS[masterLevel] || 3);
    // Perfect kartta Ã¶dÃ¼l alÄ±nmÄ±ÅŸsa 1 session yeterli
    const requiredSessions = (masterLevel === 3 && rewardClaimedPerfect) ? 1 : baseSessions;

    // ğŸ MEYVE SADECE YEÅÄ°L VE ÃœZERÄ° KARTLARDA GÃ–RÃœNECEK
    // KÄ±rmÄ±zÄ±/SarÄ±: Sprout gÃ¶rseli (TURUNCU KALDIRILDI)
    // YeÅŸil (wrongCount >= 2, masterLevel = 0): meyve_1
    // Master/Ultra/Perfect: meyve_2, meyve_3, meyve_4
    const showFruit = wrongCount >= 2 || masterLevel > 0;

    let category: ThemeKey;
    let streakNeeded: number;
    let displayStreak: number;
    let showInfinity = false;

    // ğŸ¯ YENÄ° SÄ°STEM: Tier'a gÃ¶re deÄŸiÅŸen session gereksinimleri
    if (masterLevel === 3) {
      category = 'perfect';
      streakNeeded = requiredSessions; // Perfect tier - 1 session
      displayStreak = masterSessions;
      showInfinity = false; // ğŸš« Asla sonsuz gÃ¶sterme - her zaman 0/1
    } else if (masterLevel === 2) {
      category = 'ultra';
      streakNeeded = requiredSessions; // Ultra â†’ Perfect iÃ§in 8 session
      displayStreak = masterSessions;
    } else if (masterLevel === 1) {
      category = 'master';
      streakNeeded = requiredSessions; // Master â†’ Ultra iÃ§in 4 session
      displayStreak = masterSessions;
    } else if (wrongCount >= 2) {
      // YENÄ°: wrongCount >= 2 = yeÅŸil (TURUNCU KALDIRILDI)
      category = 'green';
      streakNeeded = requiredSessions; // YeÅŸil â†’ Master iÃ§in 3 session
      displayStreak = masterSessions;
    } else if (wrongCount >= 1) {
      // YENÄ°: wrongCount = 1 = sarÄ± (turuncu kalktÄ±)
      category = 'yellow';
      streakNeeded = isTutorialCard ? 1 : 2; // SarÄ± â†’ YeÅŸil iÃ§in 2 session (tutorial'da 1)
      displayStreak = masterSessions;
    } else {
      category = 'red';
      streakNeeded = 1; // KÄ±rmÄ±zÄ± â†’ SarÄ± iÃ§in 1 session
      displayStreak = masterSessions;
    }

    const theme = THEMES[category];

    // ğŸ¨ KART TEMA OVERLAY - KullanÄ±cÄ±nÄ±n seÃ§tiÄŸi tema varsa Ã¼stÃ¼ne tint uygula
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
    // isReady: Session tamamlandÄ± mÄ±? (ama isHarvestReady olmadan "Tamamlanıyor" yazÄ±lmasÄ±n - direkt HASAT bekliyoruz)
    // Perfect kartlar iÃ§in: isHarvestReady true olduÄŸunda hasat butonu gÃ¶ster, diÄŸer tÃ¼rlÃ¼ "Çalış" kalsÄ±n
    const isReady = isHarvestReady; // Sadece hasat hazÄ±rsa "ready" say
    const isMaster = masterLevel > 0;

    // ğŸ“Š SAYAÃ‡ DÃœZELTME: displayStreak asla streakNeeded'den bÃ¼yÃ¼k gÃ¶sterilmemeli
    const cappedDisplayStreak = showInfinity ? displayStreak : Math.min(displayStreak, streakNeeded);

    // ğŸ HASAT BUTONU - Sadece isHarvestReady true ise gÃ¶ster
    let buttonText = 'CALIS';
    let showHarvestButton = false;

    if (isHarvestReady) {
      showHarvestButton = true;
      if (masterLevel === 3) {
        // Perfect kart - Ã¶dÃ¼l alÄ±nmÄ±ÅŸ mÄ± kontrol et
        buttonText = rewardClaimedPerfect ? 'Saga Kaydir - Hasat' : 'Saga Kaydir - Hasat (Kraliyet)';
      } else {
        const nextTierName = getTierName(masterLevel + 1);
        buttonText = `Saga Kaydir - Hasat (${nextTierName})`;
      }
    } else if (isReady && !isHarvestReady) {
      // Session tamamlandÄ± ama hasat henÃ¼z hazÄ±r deÄŸil
      buttonText = 'Tamamlaniyor...';
    }

    // ğŸ’° Hasat Ã¶dÃ¼lÃ¼ hesapla (master kartlar iÃ§in)
    // - YeÅŸilâ†’Master: tier 1 (150/300)
    // - Masterâ†’Ultra: tier 2 (300/500)
    // - Ultraâ†’Perfect: tier 3 (500/800)
    // - Perfect Ä°LK hasat: tier 4 (700/1000)
    // - Perfect sonraki hasatlar: Ã–DÃœLSÃœZ
    const isPerfectCard = masterLevel === 3;
    // Perfect kartlarda: rewardClaimedPerfect FALSE ise ilk hasat (tier 4), TRUE ise tekrar hasat (Ã¶dÃ¼lsÃ¼z)
    // DiÄŸer kartlarda: masterLevel + 1 tier'Ä±
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
      // ğŸ Meyve sistemi
      fruitType,
      fruitGrowthStage,
      isHarvestReady,
      showFruit,
      showHarvestButton,
      rewardClaimedPerfect,
      // ğŸ’° Hasat Ã¶dÃ¼lÃ¼
      harvestReward,
    };
  }, [word.masterLevel, word.wrongCount, word.consecutiveCorrect, word.consecutiveMasterSessions,
      word.totalHarvests, word.quizCorrect, word.quizWrong, word.fruitType, word.fruitGrowthStage,
      word.isHarvestReady, word.rewardClaimedPerfect, word.difficulty, word.isPhrasalVerb, word.id,
      tutorialStep, tutorialGreenCardSession, activeThemeId, isSoilBackground]);

  const { theme, themeOverlay, category, streak, displayStreak, streakNeeded, progress, isReady, isMaster,
          buttonText, showInfinity, quizCorrect, quizWrong, successRate,
          fruitType, fruitGrowthStage, isHarvestReady, showFruit, showHarvestButton, rewardClaimedPerfect, harvestReward } = cardData;

  // ğŸš€ SMOOTH ENTRANCE: ArtÄ±k giriÅŸ animasyonu devre dÄ±ÅŸÄ± - tab deÄŸiÅŸiminde blur Ã¶nleme
  // Kartlar anÄ±nda gÃ¶rÃ¼nÃ¼r, entrance delay/animasyon kaldÄ±rÄ±ldÄ±
  useEffect(() => {
    // ğŸ® Animasyon devre dÄ±ÅŸÄ± - kartlar hemen gÃ¶rÃ¼nÃ¼r
    fadeAnim.setValue(1);
    translateAnim.setValue(0);
  }, [index, fadeAnim, translateAnim]);

  // âœ¨ SHIMMER EFEKTÄ° - SADECE MASTER KARTLAR iÃ§in (elitlik!) + PERFORMANS KONTROLÃœ
  useEffect(() => {
    if (isMaster && config.enableShimmer) {
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
  }, [isMaster, shimmerAnim, config.enableShimmer]);

  // ğŸŒŸ GLOW PULSE - SADECE MASTER KARTLAR iÃ§in (premium his) + PERFORMANS KONTROLÃœ
  useEffect(() => {
    if (isMaster && config.enableGlow) {
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
  }, [isMaster, glowAnim, config.enableGlow]);

  // ğŸ’“ PULSE - SADECE MASTER KARTLAR iÃ§in (nabÄ±z efekti) + PERFORMANS KONTROLÃœ
  useEffect(() => {
    if (isMaster && config.enablePulseAnimations) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06, // ğŸ® DAHA BÃœYÃœK PULSE: 1.03 -> 1.06
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.sin),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.in(Easing.sin),
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isMaster, pulseAnim, config.enablePulseAnimations]);

  // Shimmer interpolation (master only)
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-dynamicCardWidth * 2, dynamicCardWidth * 2],
  });

  // ğŸ MEYVE BÃœYÃœME ANÄ°MASYONU - Session tamamlandÄ±ÄŸÄ±nda
  useEffect(() => {
    if (showFruit && fruitGrowthStage > 0) {
      // Meyve bÃ¼yÃ¼me animasyonu
      Animated.sequence([
        Animated.spring(fruitScaleAnim, {
          toValue: 1.3,
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
    }
  }, [fruitGrowthStage, showFruit]);

  // ğŸ HASAT HAZIR GLOW - Hasat hazÄ±r olduÄŸunda pulse
  useEffect(() => {
    if (isHarvestReady && !rewardClaimedPerfect) {
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
  }, [isHarvestReady, rewardClaimedPerfect, fruitGlowAnim]);

  // â­ Favori toggle handler
  const handleFavoritePress = useCallback(() => {
    // ğŸ”’ Tutorial sÄ±rasÄ±nda favori butonu kilitli
    if (tutorialStep !== 'COMPLETED') {
      haptic.error();
      return;
    }

    haptic.light();
    toggleFavorite?.(word.id);
  }, [toggleFavorite, word.id, tutorialStep]);

  // ğŸŒ¾ HASAT handler
  const handleHarvest = useCallback(() => {
    if (!showHarvestButton) return;

    haptic.harvestCelebration();
    sound.playEpicHarvest?.();

    // ğŸ® ULTRA ARCADE - AnlÄ±k hasat animasyonu
    Animated.sequence([
      Animated.spring(fruitScaleAnim, {
        toValue: 1.4,
        friction: 8,
        tension: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fruitScaleAnim, {
        toValue: 0,
        duration: 60, // ğŸš€ ULTRA FAST: 100 -> 60ms
        useNativeDriver: true,
        easing: Easing.in(Easing.back(2)),
      }),
    ]).start(() => {
      // Hasat iÅŸlemi - ANINDA
      const result = harvestWord?.(word.id);
      if (result?.success) {
        // Reset animasyon
        fruitScaleAnim.setValue(1);

        // ğŸ“ TUTORIAL: Hasat edilince STEP_12_INVENTORY'e geÃ§
        if (tutorialStep === 'STEP_10_TO_GREEN' || tutorialStep === 'STEP_11_HARVEST') {
          setTimeout(() => setTutorialStep('STEP_12_INVENTORY'), 500);
        }
      }
    });
  }, [showHarvestButton, harvestWord, word.id, fruitScaleAnim, tutorialStep, setTutorialStep]);

  // ğŸ¯ Press handlers - ULTRA JUICY
  const handlePressIn = useCallback(() => {
    haptic.light();
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 8,
      tension: 200,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          width: dynamicCardWidth,
          opacity: fadeAnim,
          transform: [
            { translateY: translateAnim },
            { scale: isMaster ? Animated.multiply(scaleAnim, pulseAnim) : scaleAnim },
          ],
        },
        // ğŸ“ TUTORIAL HIGHLIGHT - YeÅŸil parlak border
        isHighlighted && {
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
      {/* ğŸŒŸ GLOW EFFECT - Master: animated, Ready: static, Highlighted: green */}
      {isHighlighted ? (
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
      ) : isMaster ? (
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
      ) : null}

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
              shadowRadius: dynamicShadowRadius,
              shadowOpacity: dynamicShadowRadius > 0 ? (isMaster ? 0.42 : 0.35) : 0,
              shadowOffset: { width: 0, height: dynamicShadowRadius > 0 ? rs(8) : 0 },
              elevation: dynamicShadowRadius > 0 ? 10 : 0,
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

            {/* ğŸ¨ TEMA OVERLAY TINT - KullanÄ±cÄ± temasÄ± varsa gradient tint uygula */}
            {themeOverlay && (
              <LinearGradient
                colors={[...themeOverlay.gradientTint] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
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

            {/* âœ¨ SHIMMER EFFECT - Master kartlar iÃ§in ANIMATED! + PERFORMANS KONTROLÃœ */}
            {isMaster && config.enableShimmer && (
              <Animated.View
                style={[
                  styles.shimmerEffect,
                  {
                    transform: [{ translateX: shimmerTranslate }],
                  },
                ]}
              />
            )}

            {/* ğŸ’§ Su damlacÄ±klarÄ± animasyonu - Seviye artÄ±ÅŸÄ±nda veya korunma (LOCAL STATE) */}
            <CardWaterDrops
              key={`water-${feedbackKey}`}
              visible={feedbackType === 'levelUp' || feedbackType === 'protected'}
              onComplete={handleFeedbackComplete}
              performanceLevel={performanceLevel}
              isProtected={feedbackType === 'protected'}
              dropCount={config.cardFeedbackDropCount}
              duration={config.cardFeedbackDuration}
              showText={config.enableCardFeedbackText}
            />

            {/* ğŸ› BÃ¶cek animasyonu - Seviye dÃ¼ÅŸÃ¼ÅŸÃ¼nde (LOCAL STATE) */}
            <CardBugCrawl
              key={`bug-${feedbackKey}`}
              visible={feedbackType === 'levelDown'}
              onComplete={handleFeedbackComplete}
              performanceLevel={performanceLevel}
              bugCount={config.cardFeedbackDropCount}
              duration={config.cardFeedbackDuration}
              showText={config.enableCardFeedbackText}
            />

            {/* ğŸ MEYVE veya ğŸŒ± SPROUT - Arka planda */}
            {(() => {
              const masterLevel = word.masterLevel || 0;
              const wrongCount = word.wrongCount || 0;

              // ğŸ MEYVE GÃ–RSELÄ° - YEÅÄ°L (wrongCount >= 2) VE ÃœSTÃœ KARTLARDA
              if (showFruit) {
                // ğŸ“ Kart boyutuna gÃ¶re MAX meyve boyutu - MEYVE TÃœRÃœNe GÃ–RE FARKLILANDI
                let cardMaxSize: number;
                if (fruitType === 'watermelon') {
                  // ğŸ‰ KARPUZ - TÃœM SEVÄ°YELERDE KÃœÃ‡ÃœK
                  cardMaxSize = isTinyScreen ? 180 : isSmallScreen ? 200 : 240;
                } else {
                  // ğŸŒ MEYVE (Muz, Kiraz, Ã‡ilek, ÃœzÃ¼m, Elma) - NORMAL BOYUT
                  cardMaxSize = isTinyScreen ? 250 : isSmallScreen ? 290 : 340;
                }

                // ğŸ¯ TIER VISUAL HESAPLAMA:
                // masterLevel 0 (YeÅŸil) = tier 1 â†’ meyve_1
                // masterLevel 1 (Master) = tier 2 â†’ meyve_2
                // masterLevel 2 (Ultra) = tier 3 â†’ meyve_3
                // masterLevel 3 (Perfect) = tier 4 â†’ meyve_4
                const tierVisual = masterLevel === 0 ? 1 : masterLevel + 1; // YeÅŸil = 1, Master = 2, Ultra = 3, Perfect = 4

                // ğŸ‘‘ PERFECT KART Ä°Ã‡Ä°N Ã–ZEL BOYUT - KartÄ±n iÃ§inde kalmalÄ±!
                let fruitSize: number;
                if (masterLevel === 3) {
                  // ğŸŒŸ PERFECT: Seviye Ã¶zel boyut
                  let perfectMultiplier: number;
                  if (fruitType === 'watermelon') {
                    // ğŸ‰ KARPUZ4: Biraz daha bÃ¼yÃ¼k
                    perfectMultiplier = isHarvestReady ? 0.99 : 0.94;
                  } else if (fruitType === 'banana') {
                    // ğŸŒ MUZ4: KÃ¼Ã§Ã¼ltÃ¼lmÃ¼ÅŸ (sadece tier 4 iÃ§in)
                    perfectMultiplier = isHarvestReady ? 0.90 : 0.82;
                  } else {
                    // ğŸ DÄ°ÄER MEYVELER: Normal
                    perfectMultiplier = isHarvestReady ? 1.00 : 0.92;
                  }
                  fruitSize = Math.round(cardMaxSize * perfectMultiplier);
                } else {
                  // ğŸŒ± TIER 1-3: Growth multipliers
                  let growthMultipliers: number[];
                  if (fruitType === 'watermelon') {
                    // ğŸ‰ KARPUZ: TÃ¼m tier'lerde kÃ¼Ã§Ã¼k
                    growthMultipliers = [0.68, 0.78, 0.88, 0.98];
                  } else {
                    // ğŸŒ DÄ°ÄER MEYVELER: Normal growth
                    growthMultipliers = [0.85, 0.95, 1.05, 1.15];
                  }
                  const currentMultiplier = growthMultipliers[Math.min(fruitGrowthStage, 3)];
                  fruitSize = Math.round(cardMaxSize * currentMultiplier);
                }

                const fruitColors = FRUIT_COLORS[fruitType];

                return (
                  <View style={styles.sproutContainer} pointerEvents="none">
                    {/* Hasat hazÄ±r glow - Perfect kartlarda her zaman gÃ¶ster */}
                    {isHarvestReady && (
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
                    {/* ğŸ¯ Perfect kart iÃ§in aÅŸaÄŸÄ±ya kaydÄ±rÄ±lmÄ±ÅŸ - ortalanmÄ±ÅŸ */}
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

              // ğŸŒ± TOHUM GÃ–RSELÄ° - KÄ±rmÄ±zÄ±/SarÄ± kartlarda ilerlemeye gÃ¶re
              // KÄ±rmÄ±zÄ±: tohumenkucuk
              // SarÄ± 0/2: tohumorta
              // SarÄ± 1/2+: tohumenbuyuk
              let seedSource = SEED_SMALL_IMAGE;
              let seedSize: number;
              let seedOpacity: number;

              if (wrongCount >= 1) {
                const yellowProgress = Math.min(displayStreak || 0, streakNeeded || 0);
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

            {/* ğŸ“š PV BADGE - Sol Ã¼st kÃ¶ÅŸe (mor) */}
            {isPhrasalVerb && (
              <View style={styles.pvBadge}>
                <Text style={styles.pvBadgeText}>PV</Text>
              </View>
            )}

            {/* ğŸ·ï¸ MY BADGE - Sol Ã¼st kÃ¶ÅŸe (altÄ±n) - Kendi kelimelerim */}
            {isCustomWord && !isPhrasalVerb && (
              <View style={styles.myBadge}>
                <Text style={styles.myBadgeText}>MY</Text>
              </View>
            )}

            {/* â­ FAVORÄ° BUTONU - SaÄŸ Ã¼st kÃ¶ÅŸe */}
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

            {/* ğŸ MEYVE ETÄ°KETÄ° - KALDIRILDI - Meyve zaten arka planda gÃ¶steriliyor */}

            {/* Content */}
            <View style={styles.content}>
              {/* Word - Ana kelime (ortalanmÄ±ÅŸ) */}
              <Text style={[
                styles.wordText,
                { color: theme.textMain },
                fontStyleOverride,
              ]} numberOfLines={2}>
                {word.text}
              </Text>

              {/* ğŸ¯ STREAK COUNTER */}
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
                  {safeCustomization.showEmoji && isReady && !showInfinity && <Text style={styles.readyEmoji}>{'\u2728'}</Text>}
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

              {/* ğŸ HASAT ET veya Ã‡ALIÅ Butonu */}
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
                  {/* ğŸ’° Hasat Ã–dÃ¼lÃ¼ GÃ¶sterimi */}
                  {harvestReward && (
                    <View style={styles.harvestRewardContainer}>
                      <Text style={styles.harvestRewardText}>
                        {'\u{1F4B0}'} {harvestReward.coins} {'\u2022'} {'\u2B50'} {harvestReward.xp} XP
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
            {isMaster && (
              <View style={[styles.masterIndicator, { backgroundColor: theme.borderGlow }]} />
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // ğŸš€ Custom comparison - sadece Ã¶nemli deÄŸiÅŸikliklerde re-render
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
    prevProps.index === nextProps.index
  );
});

const styles = StyleSheet.create({
  cardWrapper: {
    // width: dynamic (inline style)
    marginBottom: rs(14),
    marginHorizontal: CARD_MARGIN / 2,
  },
  // ğŸŒŸ GLOW EFFECT - Premium parlama
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
    minHeight: IS_TINY_SCREEN ? rs(150) : IS_SMALL_SCREEN ? rs(165) : IS_MEDIUM_SCREEN ? rs(180) : rs(195), // ğŸ® DAHA BÃœYÃœK KARTLAR
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
  // âœ¨ ANIMATED SHIMMER - Master kartlar iÃ§in premium efekt
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: rs(40),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  // ğŸ“š PV BADGE - Sol Ã¼st kÃ¶ÅŸe (mor) - RESPONSIVE
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
  // ğŸ·ï¸ MY BADGE - Sol Ã¼st kÃ¶ÅŸe (altÄ±n) - RESPONSIVE
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
  // ğŸŒ± SPROUT CONTAINER - Arka plan ikonu
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
  // â­ FAVORÄ° BUTONU (SABÄ°T DEÄERLER - kÃ¼Ã§Ã¼k ve kÃ¶ÅŸede)
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
  // ğŸ¯ STREAK COUNTER - Belirgin ve BÃ¼yÃ¼k (responsive)
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
  // ğŸ FRUIT SYSTEM STYLES
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
  // ğŸ MEYVE ETÄ°KETÄ° - SaÄŸ Ã¼stte favorilerin altÄ±nda
  fruitBadge: {
    position: 'absolute',
    top: IS_TINY_SCREEN ? rs(32) : IS_SMALL_SCREEN ? rs(36) : rs(40), // Favorilerin altÄ±nda
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
