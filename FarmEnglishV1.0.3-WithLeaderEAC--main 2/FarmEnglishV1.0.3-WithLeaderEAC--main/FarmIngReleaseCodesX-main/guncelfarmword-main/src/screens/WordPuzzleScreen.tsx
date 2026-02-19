import React, { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  PanResponder,
  Animated,
  InteractionManager,
  Easing,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { X, Heart, Puzzle, Zap, Star, Sprout, RotateCcw, Wheat, AlertCircle, Crown, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFarmStore } from '../store/farmStore';
import { WordPuzzleDialog } from '../components/WordPuzzleDialog';
import { haptic, sound } from '../utils/sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ensaglamDataWithTr from '../../assets/data/ensaglamdata_with_example_tr.json';
import phrasalVerbsWithTr from '../../assets/data/PHARASAL_VERBS_EXAMPLE.json';
import { showRewardToast, RewardToastContainer } from '../components/RewardToast';
import { usePerformanceStore } from '../store/performanceStore';
import { CuteCloudTip } from '../components/CuteCloudTip';
import {
  BORDER_STYLES,
  DEFAULT_CUSTOMIZATION,
  getThemeOverlay,
  type CardCustomization,
  type CardFontStyle,
} from '../data/cardThemes';
import { normalizeDisplayText } from '../utils/textNormalization';

const SEED_SMALL_IMAGE = require('../../assets/images/maskot/tohumenkucuk.webp');
const SEED_MEDIUM_IMAGE = require('../../assets/images/maskot/tohumorta.webp');
const SEED_LARGE_IMAGE = require('../../assets/images/maskot/tohumenbuyuk.webp');

import {
  getFruitType,
  getFruitImageSource,
  FRUIT_COLORS,
  type FruitType,
} from '../utils/fruitSystem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NOTCH_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 700;

// 📱 Tablet detection
const IS_TABLET = SCREEN_WIDTH > 768;
const FEED_CARD_MAX_WIDTH = IS_TABLET ? 500 : SCREEN_WIDTH - 40;

//  Renk paleti
const COLORS = {
  background: '#050810',
  backgroundAlt: '#0a0f1a',
  surface: 'rgba(15, 23, 42, 0.8)',
  accent: '#a855f7',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: 'rgba(51, 65, 85, 0.5)',
};

//  Türkçe çeviri lookup
const getTurkishMeaning = (wordText: string): string | null => {
  if (!wordText) return null;
  try {
    const items = (ensaglamDataWithTr as any)?.items;
    if (!items || !Array.isArray(items)) return null;
    const found = items.find((item: any) => item?.word?.toLowerCase() === wordText?.toLowerCase());
    return found?.tr || null;
  } catch { return null; }
};

const getTurkishExample = (wordText: string): string | null => {
  if (!wordText) return null;
  try {
    const items = (ensaglamDataWithTr as any)?.items;
    if (!items || !Array.isArray(items)) return null;
    const found = items.find((item: any) => item?.word?.toLowerCase() === wordText?.toLowerCase());
    return found?.example_tr || null;
  } catch { return null; }
};

const getPhrasalTurkishExample = (verbId: string, verbText: string): string | null => {
  if (!verbId && !verbText) return null;
  try {
    const phrasals = phrasalVerbsWithTr as any[];
    if (!phrasals || !Array.isArray(phrasals)) return null;
    const found = phrasals.find((pv: any) => pv?.id === verbId || pv?.verb?.toLowerCase() === verbText?.toLowerCase());
    return found?.example_tr || null;
  } catch { return null; }
};

//  Puzzle Theme
type PuzzleTheme = {
  gradient: readonly [string, string, string];
  border: string;
  accent: string;
  glow: string;
  emoji: string;
  label: string;
  textMain: string;
  textSecondary: string;
};

const getCardSizeMultiplier = (compactMode: boolean, largeMode: boolean): number => {
  if (largeMode) return 1.16;
  if (compactMode) return 0.92;
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

const applyPuzzleThemeCustomization = (
  theme: PuzzleTheme,
  activeThemeId: string,
  cardCustomization: CardCustomization | undefined
): PuzzleTheme => {
  const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
  const isSoilBackground = safeCustomization.backgroundStyle === 'soil';
  const overlay = !isSoilBackground && activeThemeId !== 'default' ? getThemeOverlay(activeThemeId) : null;

  const themedBase = overlay
    ? {
      ...theme,
      border: overlay.borderColor,
      glow: overlay.borderGlow,
    }
    : theme;

  if (!isSoilBackground) return themedBase;

  return {
    ...themedBase,
    gradient: ['#24150f', '#3d2a24', '#1c120d'] as const,
    border: 'rgba(121, 85, 72, 0.86)',
    accent: '#a1887f',
    glow: '#6d4c41',
    textMain: '#f7efe4',
    textSecondary: '#ddc7ae',
    emoji: '\u{1F33E}',
    label: 'TOPRAK',
  };
};

const getPuzzleTheme = (puzzleSessions: number, masterLevel: number = 0): PuzzleTheme => {
  if (masterLevel >= 3) return { gradient: ['#500724', '#831843', '#500724'] as const, border: '#f472b6', accent: '#f9a8d4', glow: '#f472b6', emoji: '\u{1F451}', label: 'KRALIYET', textMain: '#fce7f3', textSecondary: '#fbcfe8' };
  if (masterLevel >= 2) return { gradient: ['#1e1b4b', '#312e81', '#1e1b4b'] as const, border: '#a78bfa', accent: '#c4b5fd', glow: '#a78bfa', emoji: '\u{1F48E}', label: 'ELMAS', textMain: '#e0e7ff', textSecondary: '#c7d2fe' };
  if (masterLevel >= 1) return { gradient: ['#78350f', '#92400e', '#78350f'] as const, border: '#fbbf24', accent: '#fcd34d', glow: '#fbbf24', emoji: '\u{1F3C6}', label: 'ALTIN', textMain: '#fef3c7', textSecondary: '#fde68a' };
  if (puzzleSessions >= 3) return { gradient: ['#14532d', '#166534', '#14532d'] as const, border: '#22c55e', accent: '#4ade80', glow: '#22c55e', emoji: '\u{1F7E2}', label: 'YESIL', textMain: '#bbf7d0', textSecondary: '#86efac' };
  if (puzzleSessions >= 2) return { gradient: ['#713f12', '#854d0e', '#713f12'] as const, border: '#eab308', accent: '#fde047', glow: '#eab308', emoji: '\u{1F7E1}', label: 'SARI', textMain: '#fef9c3', textSecondary: '#fef08a' };
  if (puzzleSessions >= 1) return { gradient: ['#7c2d12', '#9a3412', '#7c2d12'] as const, border: '#f97316', accent: '#fb923c', glow: '#f97316', emoji: '\u{1F7E0}', label: 'TURUNCU', textMain: '#ffedd5', textSecondary: '#fed7aa' };
  return { gradient: ['#7f1d1d', '#991b1b', '#7f1d1d'] as const, border: '#ef4444', accent: '#f87171', glow: '#ef4444', emoji: '\u{1F534}', label: 'KIRMIZI', textMain: '#fecaca', textSecondary: '#fca5a5' };
};

// 📊 Oturum Gösterimi: x/y format
// Her seviyede session 0'dan başlyor (hasat sonras sfrlanyor)
// - Normal (Level 0): 3 session = Master hasat
// - Master (Level 1): 2 session = Ultra hasat
// - Ultra (Level 2): 2 session = Perfect hasat
// - Perfect (Level 3): 3 session (ilk) veya 1 session (ödül alndktan sonra)
const getSessionDisplay = (puzzleSessions: number, puzzleMasterLevel: number = 0, readyForPuzzleHarvest: boolean = false, puzzleRewardClaimedPerfect: boolean = false): string => {
  // 🌾 Hasat hazirsa checkmark goster
  if (readyForPuzzleHarvest) {
    return '\u2705 Hasat';
  }

  if (puzzleMasterLevel === 0) {
    // Normal kartlar: 3 session = Master hasat (0/3 → 1/3 → 2/3 → hasat)
    return `${puzzleSessions}/3`;
  } else if (puzzleMasterLevel === 1) {
    // Master kartlar: 2 session = Ultra hasat (0/2 -> 1/2 -> hasat)
    return `${puzzleSessions}/2`;
  } else if (puzzleMasterLevel === 2) {
    // Ultra kartlar: 2 session = Perfect hasat (0/2 -> 1/2 -> hasat)
    return `${puzzleSessions}/2`;
  } else {
    // s Perfect/Kraliyet:
    if (puzzleRewardClaimedPerfect) {
      // Odul alindiktan sonra: 1 session yeterli (0/1 -> hasat)
      return `${puzzleSessions}/1`;
    } else {
      // Ilk hasat: 3 session gerekli (0/3 -> 1/3 -> 2/3 -> hasat)
      return `${puzzleSessions}/3`;
    }
  }
};

const getPuzzleSeedVisual = (puzzleSessions: number): { source: any; size: number; opacity: number } => {
  const safeSessions = Math.max(0, Math.floor(Number.isFinite(puzzleSessions) ? puzzleSessions : 0));

  if (safeSessions >= 2) {
    return {
      source: SEED_LARGE_IMAGE,
      size: IS_SMALL_SCREEN ? 118 : 136,
      opacity: 0.74,
    };
  }

  if (safeSessions >= 1) {
    return {
      source: SEED_MEDIUM_IMAGE,
      size: IS_SMALL_SCREEN ? 98 : 114,
      opacity: 0.68,
    };
  }

  return {
    source: SEED_SMALL_IMAGE,
    size: IS_SMALL_SCREEN ? 78 : 90,
    opacity: 0.62,
  };
};

//  Grid Swipe Wrapper
const GridSwipeWrapper: React.FC<{ disabled?: boolean; onSwipeRight: () => void; children: React.ReactNode }> = ({ disabled, onSwipeRight, children }) => {
  const hasTriggeredRef = useRef(false);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
    onPanResponderGrant: () => { if (!disabled) { hasTriggeredRef.current = false; haptic.light(); } },
    onPanResponderMove: (_, gesture) => { if (!disabled && gesture.dx > 30 && !hasTriggeredRef.current) { hasTriggeredRef.current = true; haptic.heavy(); onSwipeRight(); } },
    onPanResponderRelease: () => { hasTriggeredRef.current = false; },
    onPanResponderTerminate: () => { hasTriggeredRef.current = false; },
  }), [disabled, onSwipeRight]);
  return <View {...panResponder.panHandlers}>{children}</View>;
};

// sc© Puzzle Grid Card
const PuzzleGridCard: React.FC<{
  word: any;
  onPress: () => void;
  onQuizPress: () => void;
  index: number;
  cardWidth: number;
  activeThemeId: string;
  cardCustomization?: CardCustomization;
}> = React.memo(({ word, onPress, onQuizPress, index, cardWidth, activeThemeId, cardCustomization }) => {
  //  PERFORMANS AYARLARI
  const config = usePerformanceStore(s => s.config);
  const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
  const cardScaleMultiplier = getCardSizeMultiplier(!!safeCustomization.compactMode, !!safeCustomization.largeMode);
  const borderPreset = BORDER_STYLES[safeCustomization.borderStyle || 'default'] || BORDER_STYLES.default;
  const fontStyleOverride = getFontStyle(safeCustomization.fontStyle || 'default');
  const dynamicCardMinHeight = Math.max(136, 180 * cardScaleMultiplier);
  const dynamicCardPadding = Math.max(8, Math.round(12 * cardScaleMultiplier));

  const toggleFavorite = useFarmStore(s => s.toggleFavorite);
  const harvestPuzzleWord = useFarmStore(s => s.harvestPuzzleWord);
  const cardFeedback = useFarmStore(s => s.cardFeedback);
  const setCardFeedback = useFarmStore(s => s.setCardFeedback);

  // FEEDBACK ANIMASYON STATE
  const [showFeedback, setShowFeedback] = useState<'levelUp' | 'levelDown' | 'protected' | null>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const feedbackProcessedRef = useRef<string | null>(null);

  // CardFeedback dinle - bu kart icin feedback geldi mi?
  useEffect(() => {
    if (cardFeedback && cardFeedback.wordId === word.id && config.enableCardFeedbackAnimations) {
      // Ayni feedback'i tekrar isleme
      const feedbackKey = `${cardFeedback.wordId}-${cardFeedback.type}-${Date.now()}`;
      if (feedbackProcessedRef.current === feedbackKey) return;
      feedbackProcessedRef.current = feedbackKey;

      setShowFeedback(cardFeedback.type);

      // Animasyonu baslat
      feedbackAnim.setValue(0);
      Animated.sequence([
        Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(config.cardFeedbackDuration || 1000),
        Animated.timing(feedbackAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setShowFeedback(null);
        setCardFeedback(null);
      });
    }
  }, [cardFeedback, word.id, config.enableCardFeedbackAnimations, config.cardFeedbackDuration, setCardFeedback]);

  const isFavorite = word.isFavorite || false;
  const readyForPuzzleHarvest = word.readyForPuzzleHarvest || false;
  const pendingPuzzleMasterLevel = word.pendingPuzzleMasterLevel || 0;
  const puzzleStats = word.puzzleStats || {};
  const puzzleSessions = puzzleStats.sessions ?? 0;
  const puzzleMasterLevel = puzzleStats.puzzleMasterLevel ?? 0;
  // s Perfect odulu alindi mi?
  const puzzleRewardClaimedPerfect = word.puzzleRewardClaimedPerfect === true;
  //  Master = puzzleMasterLevel > 0 VEYA pendingPuzzleMasterLevel > 0 (hasat bekleyen)
  const isMaster = puzzleMasterLevel > 0 || (readyForPuzzleHarvest && pendingPuzzleMasterLevel > 0);
  const seedVisual = useMemo(() => getPuzzleSeedVisual(puzzleSessions), [puzzleSessions]);
  //  HASAT HAZIR OLSA DA MEVCUT SEVIYEYI GOSTER! Yeni seviye SADECE envanterde gorunecek!
  const theme = useMemo(
    () => applyPuzzleThemeCustomization(getPuzzleTheme(puzzleSessions, puzzleMasterLevel), activeThemeId, safeCustomization),
    [puzzleSessions, puzzleMasterLevel, activeThemeId, safeCustomization]
  );

  //  Hasat fonksiyonu
  const handleHarvest = useCallback(() => {
    haptic.heavy();
    sound.playHarvest?.();
    harvestPuzzleWord(word.id);
  }, [word.id, harvestPuzzleWord]);

  // s Meyve sistemi - Master kartlar icin
  const fruitType: FruitType = useMemo(() => {
    if (!isMaster && !readyForPuzzleHarvest) return 'apple';
    return getFruitType(word.difficulty, !!word.isPhrasalVerb);
  }, [isMaster, readyForPuzzleHarvest, word.difficulty, word.isPhrasalVerb]);

  // Puzzle icin meyve buyume asamahesaplama
  // Master kartlarda session'a gore buyume goster
  const fruitGrowthStage = useMemo(() => {
    // Hasat hazirsa tam olgunlasmis goster
    if (readyForPuzzleHarvest) return 3;
    // Master desilse gosterme
    if (!isMaster) return 0;

    // Master kartlar icin: session'a gore buyume
    // 0 session = stage 1 (kucuk), 1 session = stage 2, 2 session = stage 3 (hasat hazir)
    return Math.min(puzzleSessions + 1, 3);
  }, [isMaster, readyForPuzzleHarvest, puzzleSessions]);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; //  Baslangicta 1 - tab desisiminde blur onleme
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    //  Animasyon devre di- kartlar hemen gorunur
    fadeAnim.setValue(1);
  }, [index]);

  useEffect(() => {
    if ((isMaster || readyForPuzzleHarvest) && config.enableShimmer) {
      const shimmer = Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear }));
      shimmer.start();
      return () => shimmer.stop();
    }
  }, [isMaster, readyForPuzzleHarvest, config.enableShimmer]);

  useEffect(() => {
    if ((isMaster || readyForPuzzleHarvest) && config.enableGlow) {
      const glow = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.9, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.sin) }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 900, useNativeDriver: true, easing: Easing.in(Easing.sin) }),
      ]));
      glow.start();
      return () => glow.stop();
    }
  }, [isMaster, readyForPuzzleHarvest, config.enableGlow]);

  useEffect(() => {
    if ((isMaster || readyForPuzzleHarvest) && config.enablePulseAnimations) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 560, useNativeDriver: true, easing: Easing.out(Easing.sin) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.in(Easing.sin) }),
      ]));
      pulse.start();
      return () => pulse.stop();
    }
  }, [isMaster, readyForPuzzleHarvest, config.enablePulseAnimations]);

  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [-1, 1], outputRange: [-cardWidth, cardWidth * 2] });

  // s Meyve boyutu hesaplama - UltimateWordCard ile ayni mantik!
  const fruitSize = useMemo(() => {
    if (!isMaster && !readyForPuzzleHarvest) return 0;

    // s Ekran boyutuna gore BASE meyve boyutu (UltimateWordCard ile ayni)
    const isTinyScreen = SCREEN_HEIGHT < 680;
    const isSmallScreen = SCREEN_HEIGHT >= 680 && SCREEN_HEIGHT < 750;

    let cardMaxSize: number;
    if (fruitType === 'watermelon') {
      //  KARPUZ - TUM SEVIYELERDE KUCUK
      cardMaxSize = isTinyScreen ? 180 : isSmallScreen ? 200 : 240;
    } else {
      // s DIER MEYVELER (Muz, Kiraz, Cilek, Uzum, Elma) - NORMAL BOYUT
      cardMaxSize = isTinyScreen ? 250 : isSmallScreen ? 290 : 340;
    }

    // s Perfect icin ozel boyut
    if (puzzleMasterLevel === 3) {
      let perfectMultiplier: number;
      if (fruitType === 'watermelon') {
        perfectMultiplier = readyForPuzzleHarvest ? 0.99 : 0.94;
      } else if (fruitType === 'banana') {
        perfectMultiplier = readyForPuzzleHarvest ? 0.90 : 0.82;
      } else {
        perfectMultiplier = readyForPuzzleHarvest ? 1.00 : 0.92;
      }
      return Math.round(cardMaxSize * perfectMultiplier);
    }

    // TIER 1-3: Growth multipliers (UltimateWordCard ile ayni)
    let growthMultipliers: number[];
    if (fruitType === 'watermelon') {
      growthMultipliers = [0.62, 0.78, 0.94, 1.08];
    } else {
      growthMultipliers = [0.8, 0.98, 1.14, 1.28];
    }
    const currentMultiplier = growthMultipliers[Math.min(fruitGrowthStage, 3)];
    return Math.round(cardMaxSize * currentMultiplier);
  }, [isMaster, readyForPuzzleHarvest, fruitGrowthStage, puzzleMasterLevel, fruitType]);

  return (
    <Animated.View style={[gridCardStyles.wrapper, { width: cardWidth, opacity: fadeAnim, transform: [{ scale: scaleAnim }, { scale: config.enablePulseAnimations ? pulseAnim : 1 }] }]}>
      <TouchableOpacity activeOpacity={0.95} onPressIn={() => { haptic.light(); Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, friction: 8 }).start(); }} onPressOut={() => { Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7 }).start(); }} onPress={onPress}>
        <View
          style={[
            gridCardStyles.card,
            {
              borderColor: theme.border,
              shadowColor: theme.glow,
              borderRadius: borderPreset.borderRadius,
              borderWidth: borderPreset.borderWidth,
              minHeight: dynamicCardMinHeight,
              padding: dynamicCardPadding,
            },
          ]}
        >
          <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
          {(isMaster || readyForPuzzleHarvest) && config.enableShimmer && <Animated.View style={[gridCardStyles.shimmerEffect, { transform: [{ translateX: shimmerTranslate }], opacity: config.enableGlow ? glowAnim : 0.6 }]} />}

          {/* FEEDBACK ANIMASYONU - "BUYUYOR!" + damla efekti */}
          {showFeedback === 'levelUp' && config.enableCardFeedbackText && (
            <Animated.View style={[gridCardStyles.feedbackOverlay, { opacity: feedbackAnim }]}>
              <Text style={gridCardStyles.feedbackText}>BÜYÜYOR!</Text>
            </Animated.View>
          )}

          <TouchableOpacity style={gridCardStyles.favorite} onPress={() => { haptic.light(); toggleFavorite(word.id); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Star size={14} color={isFavorite ? '#fbbf24' : 'rgba(255,255,255,0.5)'} fill={isFavorite ? '#fbbf24' : 'transparent'} />
          </TouchableOpacity>
          <View style={[gridCardStyles.badge, { backgroundColor: `${theme.accent}30` }]}>
            <Text style={[gridCardStyles.badgeText, fontStyleOverride]}>
              {safeCustomization.showEmoji ? `${theme.emoji} ` : ''}{theme.label}
            </Text>
          </View>

          {/* s MEYVE veya  BUDAY - UltimateWordCard gibi DEV! */}
          {(isMaster || readyForPuzzleHarvest) ? (
            <View style={[gridCardStyles.seedling, { opacity: 0.9 }]}>
              <Image
                source={getFruitImageSource(fruitType, puzzleMasterLevel === 0 ? 1 : puzzleMasterLevel + 1)}
                style={{ width: fruitSize, height: fruitSize }}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                transition={0}
              />
            </View>
          ) : (
            <View style={[gridCardStyles.seedling, { opacity: seedVisual.opacity }]}>
              <Image
                source={seedVisual.source}
                style={{ width: seedVisual.size, height: seedVisual.size }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={0}
              />
            </View>
          )}

          <Text style={[gridCardStyles.word, { color: theme.textMain }, fontStyleOverride]} numberOfLines={2}>{normalizeDisplayText(word.text)}</Text>
          {safeCustomization.showProgressBar && (
            <View style={[gridCardStyles.sessionCounter, { backgroundColor: `${theme.accent}25`, borderColor: theme.border }]}>
              <Puzzle size={14} color={theme.accent} />
              <Text style={[gridCardStyles.sessionText, { color: theme.textMain }, fontStyleOverride]}>{getSessionDisplay(puzzleSessions, puzzleMasterLevel, readyForPuzzleHarvest, puzzleRewardClaimedPerfect)}</Text>
              {safeCustomization.showEmoji && (isMaster || readyForPuzzleHarvest) && <Text style={gridCardStyles.masterIcon}>{'\u{1F3C6}'}</Text>}
            </View>
          )}

          {/*  HASAT HAZIR - Manuel hasat butonu */}
          {readyForPuzzleHarvest ? (
            <TouchableOpacity onPress={handleHarvest} activeOpacity={0.85}>
              <LinearGradient colors={['#22c55e', '#16a34a']} style={gridCardStyles.button}>
                <Text style={[gridCardStyles.buttonText, fontStyleOverride]}>{safeCustomization.showEmoji ? '\u{1F33E} HASAT ET' : 'HASAT ET'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onQuizPress} activeOpacity={0.85}>
              <LinearGradient colors={[theme.accent, theme.border]} style={gridCardStyles.button}>
                <Text style={[gridCardStyles.buttonText, fontStyleOverride]}>{safeCustomization.showEmoji ? '\u{1F9E9} YAPBOZ' : 'YAPBOZ'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const gridCardStyles = StyleSheet.create({
  wrapper: { marginBottom: 8, marginHorizontal: 4 },
  card: { borderRadius: 16, borderWidth: 1.5, padding: 12, minHeight: 180, overflow: 'hidden', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  shimmerEffect: { position: 'absolute', top: 0, bottom: 0, width: 40, backgroundColor: 'rgba(255, 255, 255, 0.15)', transform: [{ skewX: '-20deg' }] },
  favorite: { position: 'absolute', top: 8, right: 8, zIndex: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  seedling: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 0 }, // UltimateWordCard gibi ortalanmis
  word: { fontSize: 18, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  sessionCounter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 6 },
  sessionText: { fontSize: 22, fontWeight: '800' },
  masterIcon: { fontSize: 14, marginLeft: 2 },
  button: { paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontSize: 11, fontWeight: '700', color: '#000' },
  // FEEDBACK ANIMASYONU STILLERI
  feedbackOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34, 197, 94, 0.3)', zIndex: 100, borderRadius: 14 },
  feedbackText: { fontSize: 16, fontWeight: '900', color: '#22c55e', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});

// s Puzzle Feed Card - HASAT VE REPLANT DESTEI!
const PuzzleFeedCard: React.FC<{
  word: any;
  isQuizActive: boolean;
  onQuizStart: (word: any) => void;
  onToggleFavorite: (id: string) => void;
  onHarvest: (word: any) => void;
  justHarvested?: boolean;
  onReplant?: (word: any) => void;
  activeThemeId: string;
  cardCustomization?: CardCustomization;
}> = React.memo(({ word, isQuizActive, onQuizStart, onToggleFavorite, onHarvest, justHarvested = false, onReplant, activeThemeId, cardCustomization }) => {
  // si Dinamik ekran boyutu - tablet rotation destekli
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
  const cardScaleMultiplier = getCardSizeMultiplier(!!safeCustomization.compactMode, !!safeCustomization.largeMode);
  const borderPreset = BORDER_STYLES[safeCustomization.borderStyle || 'default'] || BORDER_STYLES.default;
  const fontStyleOverride = getFontStyle(safeCustomization.fontStyle || 'default');
  const feedCardMaxWidth = (isTablet ? 500 : windowWidth - 40) * (safeCustomization.largeMode ? 1.04 : safeCustomization.compactMode ? 0.92 : 1);

  const puzzleStats = word.puzzleStats || { sessions: 0, puzzleMasterLevel: 0 };
  const puzzleSessions = puzzleStats.sessions || 0;
  const puzzleMasterLevel = puzzleStats.puzzleMasterLevel || 0;
  const isMaster = puzzleMasterLevel > 0;
  const readyForPuzzleHarvest = word.readyForPuzzleHarvest || false;
  const pendingPuzzleMasterLevel = word.pendingPuzzleMasterLevel || 0;
  // s Perfect odulu alindi mi? (0/3 vs 0/1 icin)
  const puzzleRewardClaimedPerfect = word.puzzleRewardClaimedPerfect === true;
  const hasTriggeredRef = useRef(false);

  //  HASAT EDILMISE SIYAH TEMA!
  const HARVESTED_THEME = {
    gradient: ['#1a1a1a', '#2d2d2d'] as const,
    accent: '#6b7280',
    border: '#404040',
    glow: '#525252',
    textMain: '#e5e5e5',
    textSecondary: '#a3a3a3',
    emoji: '\u{1F4E6}',
    label: 'Envanterde'
  };

  // Hasat edilmisse siyah tema, desilse kisisellestirilmis puzzle temasi
  const theme = useMemo(() => {
    if (justHarvested) return HARVESTED_THEME;
    return applyPuzzleThemeCustomization(getPuzzleTheme(puzzleSessions, puzzleMasterLevel), activeThemeId, safeCustomization);
  }, [justHarvested, puzzleSessions, puzzleMasterLevel, activeThemeId, safeCustomization]);
  const turkishMeaning = useMemo(() => getTurkishMeaning(word.text), [word.text]);
  const turkishExample = useMemo(() => {
    const customOrLocalExample = normalizeDisplayText((word as any).example_tr);
    if (customOrLocalExample) return customOrLocalExample;
    return getTurkishExample(word.text);
  }, [word.text, (word as any).example_tr]);

  const config = usePerformanceStore(s => s.config);
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { if ((isMaster || readyForPuzzleHarvest) && config.enableShimmer) { const s = Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear })); s.start(); return () => s.stop(); } }, [isMaster, readyForPuzzleHarvest, config.enableShimmer]);
  useEffect(() => { if ((isMaster || readyForPuzzleHarvest) && config.enableGlow) { const g = Animated.loop(Animated.sequence([Animated.timing(glowAnim, { toValue: 0.9, duration: 900, useNativeDriver: true }), Animated.timing(glowAnim, { toValue: 0.4, duration: 900, useNativeDriver: true })])); g.start(); return () => g.stop(); } }, [isMaster, readyForPuzzleHarvest, config.enableGlow]);
  useEffect(() => { if ((isMaster || readyForPuzzleHarvest) && config.enablePulseAnimations) { const p = Animated.loop(Animated.sequence([Animated.timing(pulseAnim, { toValue: 1.07, duration: 560, useNativeDriver: true }), Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })])); p.start(); return () => p.stop(); } }, [isMaster, readyForPuzzleHarvest, config.enablePulseAnimations]);

  //  Swipe handler - hasat hazirsa hasat et, hasat edilmisse replant, desilse quiz ac
  const handleSwipeAction = useCallback(() => {
    if (justHarvested && onReplant) {
      // Hasat edilmisse: Sasa kaydir = Tarlaya geri ek
      onReplant(word);
    } else if (readyForPuzzleHarvest) {
      onHarvest(word);
    } else {
      onQuizStart(word);
    }
  }, [justHarvested, readyForPuzzleHarvest, word, onHarvest, onQuizStart, onReplant]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isQuizActive,
    onMoveShouldSetPanResponder: (_, gesture) => !isQuizActive && gesture.dx > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 3,
    onPanResponderGrant: () => { hasTriggeredRef.current = false; haptic.light(); },
    onPanResponderMove: (_, gesture) => { if (gesture.dx > 50 && !hasTriggeredRef.current) { hasTriggeredRef.current = true; haptic.heavy(); handleSwipeAction(); } },
    onPanResponderRelease: () => { hasTriggeredRef.current = false; },
    onPanResponderTerminate: () => { hasTriggeredRef.current = false; },
  }), [handleSwipeAction, isQuizActive]);

  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [-1, 1], outputRange: [-windowWidth, windowWidth * 2] });

  return (
    <View style={[styles.feedItem, { width: windowWidth, height: windowHeight, justifyContent: 'center', alignItems: 'center' }]}>
      <Animated.View style={[styles.appleCard, {
        width: Math.min(windowWidth - 24, feedCardMaxWidth),
        borderColor: theme.border,
        shadowColor: theme.glow,
        borderRadius: borderPreset.borderRadius + 4,
        borderWidth: borderPreset.borderWidth + 0.5,
        padding: Math.max(14, Math.round(24 * cardScaleMultiplier)),
        transform: [{ scale: config.enablePulseAnimations ? pulseAnim : 1 }],
      }]} {...panResponder.panHandlers}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {(isMaster || readyForPuzzleHarvest) && !justHarvested && config.enableShimmer && <Animated.View style={[styles.shimmerEffect, { transform: [{ translateX: shimmerTranslate }], opacity: config.enableGlow ? glowAnim : 0.6 }]} />}

        <TouchableOpacity style={styles.appleFavorite} onPress={() => { haptic.medium(); onToggleFavorite(word.id); }} activeOpacity={0.7}>
          <Heart size={24} color={word.isFavorite ? '#ff375f' : 'rgba(255,255,255,0.5)'} fill={word.isFavorite ? '#ff375f' : 'transparent'} />
        </TouchableOpacity>
        <View style={[styles.appleBadge, { backgroundColor: `${theme.accent}25` }]}>
          {safeCustomization.showEmoji && <Text style={styles.appleBadgeEmoji}>{theme.emoji}</Text>}
          <Text style={[styles.appleBadgeText, { color: theme.textSecondary }, fontStyleOverride]}>{theme.label}</Text>
          {safeCustomization.showEmoji && (isMaster || readyForPuzzleHarvest) && !justHarvested && <Text style={{ fontSize: 10 }}>{'\u{1F3C6}'}</Text>}
          {(word as any).isCustom && <Text style={{ fontSize: 10 }}>{'✏️'}</Text>}
        </View>
        <Text style={[styles.appleWord, { color: theme.textMain }, fontStyleOverride]}>{normalizeDisplayText(word.text)}</Text>
        <Text style={[styles.appleMeaning, { color: theme.textSecondary }, fontStyleOverride]}>{normalizeDisplayText(turkishMeaning || word.meaning || 'Anlam yükleniyor...')}</Text>
        {turkishExample && <Text style={[styles.appleExample, { color: `${theme.textSecondary}cc` }, fontStyleOverride]} numberOfLines={3}>"{turkishExample}"</Text>}
        {!turkishExample && word.example && <Text style={[styles.appleExample, { color: `${theme.textSecondary}cc`, opacity: 0.7 }, fontStyleOverride]} numberOfLines={3}>"{normalizeDisplayText(word.example)}"</Text>}
        {/* s Envanterde (justHarvested) iken session gosterme */}
        {!justHarvested && safeCustomization.showProgressBar && (
          <View style={[styles.appleSessionCounter, { backgroundColor: `${theme.accent}25`, borderColor: theme.border }]}>
            <Puzzle size={18} color={theme.accent} />
            <Text style={[styles.appleSessionNum, { color: theme.textMain }, fontStyleOverride]}>{getSessionDisplay(puzzleSessions, puzzleMasterLevel, readyForPuzzleHarvest, puzzleRewardClaimedPerfect)}</Text>
            {safeCustomization.showEmoji && (isMaster || readyForPuzzleHarvest) && <Text style={{ fontSize: 14, marginLeft: 4 }}>{'\u{1F3C6}'}</Text>}
          </View>
        )}
        {/* s Stats - Envanterde iken gizle */}
        {!justHarvested && (
          <View style={styles.appleStats}>
            <View style={styles.appleStat}>
              <Text style={[styles.appleStatNum, { color: '#22c55e' }, fontStyleOverride]}>{puzzleStats.totalCorrect || 0}</Text>
              <Text style={[styles.appleStatLabel, { color: theme.textSecondary }, fontStyleOverride]}>doğru</Text>
            </View>
          </View>
        )}

        {/*  Hasat hazirsa Hasat Et, envanterde ise Tekrar Ek, desilse Yapboz */}
        {readyForPuzzleHarvest ? (
          <TouchableOpacity style={[styles.appleButton, { backgroundColor: '#22c55e' }]} activeOpacity={0.8} onPress={() => { haptic.harvestCelebration ? haptic.harvestCelebration() : haptic.heavy(); onHarvest(word); }}>
            <Text style={[styles.appleButtonText, fontStyleOverride]}>{safeCustomization.showEmoji ? '\u{1F33E} Hasat Et' : 'Hasat Et'}</Text>
          </TouchableOpacity>
        ) : justHarvested && onReplant ? (
          <TouchableOpacity style={[styles.appleButton, { backgroundColor: '#8b5cf6' }]} activeOpacity={0.8} onPress={() => { haptic.medium(); onReplant(word); }}>
            <Text style={[styles.appleButtonText, fontStyleOverride]}>{safeCustomization.showEmoji ? '\u{1F331} Tekrar Ek' : 'Tekrar Ek'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.appleButton, { backgroundColor: theme.accent }]} activeOpacity={0.8} onPress={() => { haptic.medium(); onQuizStart(word); }}>
            <Text style={[styles.appleButtonText, fontStyleOverride]}>{safeCustomization.showEmoji ? '\u{1F9E9} Yapboz' : 'Yapboz'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
});

//  Filter Types - FarmScreen ile UYUMLU!
type FilterType = 'all' | 'ready' | 'study' | 'master' | 'favorites';

//  Props - PhrasalVerbFarmScreen ile AYNI!
interface WordPuzzleScreenProps {
  embedded?: boolean;
  initialFilter?: FilterType;
  externalSearchVisible?: boolean;
  setExternalSearchVisible?: (visible: boolean) => void;
  onParentScroll?: (offsetY: number) => void;
}

//  Ana Component - FarmScreen'e TAM ENTEGRE!
export default function WordPuzzleScreen({
  embedded = false,
  initialFilter = 'all',
  externalSearchVisible,
  setExternalSearchVisible,
  onParentScroll,
}: WordPuzzleScreenProps) {
  const navigation = useNavigation<any>();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const GRID_PADDING = isLandscape ? 20 : 12;
  const CARD_OUTER_MARGIN = 8;

  useLayoutEffect(() => {
    if (!embedded) navigation.setOptions({ gestureEnabled: false });
  }, [navigation, embedded]);

  const farm = useFarmStore((state) => state.farm);
  const phrasalVerbFarm = useFarmStore((state) => state.phrasalVerbFarm);
  const toggleFavorite = useFarmStore((state) => state.toggleFavorite);
  const harvestPuzzleWord = useFarmStore((state) => state.harvestPuzzleWord);
  const plantFromInventory = useFarmStore((state) => state.plantFromInventory);
  const inventory = useFarmStore((state) => state.inventory);
  const phrasalVerbInventory = useFarmStore((state) => state.phrasalVerbInventory);
  const cloudTipsDismissed = useFarmStore((state) => state.cloudTipsDismissed);
  const setCloudTipDismissed = useFarmStore((state) => state.setCloudTipDismissed);
  const guidedModeActive = useFarmStore((state) => state.guidedModeActive);
  const guidedModeStep = useFarmStore((state) => state.guidedModeStep);
  const guidedModeTargetWordId = useFarmStore((state) => state.guidedModeTargetWordId);
  const guidedModeTargetWordText = useFarmStore((state) => state.guidedModeTargetWordText);
  const activeCardTheme = useFarmStore((state) => state.activeCardTheme);
  const cardCustomization = useFarmStore((state) => state.cardCustomization);
  const safeCustomization = cardCustomization || DEFAULT_CUSTOMIZATION;
  const isGuidedPuzzleStep = guidedModeActive && guidedModeStep === 'PUZZLE_PRACTICE';
  const guidedTargetWordKey = useMemo(
    () => normalizeDisplayText(guidedModeTargetWordText).toLowerCase(),
    [guidedModeTargetWordText]
  );
  const isGuidedTargetWord = useCallback((word: any) => {
    const safeId = typeof word?.id === 'string' ? word.id.trim() : '';
    if (guidedModeTargetWordId && safeId && safeId === guidedModeTargetWordId) return true;
    const safeText = normalizeDisplayText(word?.text || word?.verb).toLowerCase();
    return !!guidedTargetWordKey && !!safeText && safeText === guidedTargetWordKey;
  }, [guidedModeTargetWordId, guidedTargetWordKey]);
  const guidedTargetLabel = useMemo(
    () => normalizeDisplayText(guidedModeTargetWordText || 'hedef kelime'),
    [guidedModeTargetWordText]
  );
  const cardScaleMultiplier = getCardSizeMultiplier(!!safeCustomization.compactMode, !!safeCustomization.largeMode);
  const gridColumns = safeCustomization.largeMode ? 1 : safeCustomization.compactMode ? 3 : 2;
  const CALCULATED_CARD_WIDTH = useMemo(() => {
    const horizontalSpace = windowWidth - GRID_PADDING * 2 - gridColumns * CARD_OUTER_MARGIN;
    if (gridColumns === 1) return Math.max(160, horizontalSpace);
    const baseWidth = horizontalSpace / gridColumns;
    if (gridColumns === 3) return Math.max(96, baseWidth);
    return Math.max(132, baseWidth * cardScaleMultiplier);
  }, [windowWidth, GRID_PADDING, CARD_OUTER_MARGIN, gridColumns, cardScaleMultiplier]);

  // State - embedded modda disaridan gelen searchVisible kullan
  const [internalSearchVisible, setInternalSearchVisible] = useState(false);
  const searchVisible = embedded && externalSearchVisible !== undefined ? externalSearchVisible : internalSearchVisible;
  const setSearchVisible = embedded && setExternalSearchVisible ? setExternalSearchVisible : setInternalSearchVisible;

  const [searchQuery, setSearchQuery] = useState('');
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [feedQuizWordId, setFeedQuizWordId] = useState<string | null>(null);
  const [shuffledFeedData, setShuffledFeedData] = useState<any[]>([]);
  const [lastViewedWordId, setLastViewedWordId] = useState<string | null>(null);
  const [puzzleDialogVisible, setPuzzleDialogVisible] = useState(false);
  const [puzzleWords, setPuzzleWords] = useState<any[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [guidedPuzzleTipVisible, setGuidedPuzzleTipVisible] = useState(true);
  const [lastHarvestedWordId, setLastHarvestedWordId] = useState<string | null>(null);
  const [showReplantToast, setShowReplantToast] = useState(false);
  //  Feed'de hasat edilmis kelimeleri takip et - siyah tema icin!
  const [harvestedWordIds, setHarvestedWordIds] = useState<Set<string>>(new Set());

  // ˜ CloudTip - Persist state'den al
  const showCloudTip = !cloudTipsDismissed['puzzle'];

  //  Filter - embedded modda disaridan, standalone modda internal
  const [internalFilter, setInternalFilter] = useState<FilterType>('all');
  const filter = embedded ? initialFilter : internalFilter;
  const setFilter = embedded ? () => {} : setInternalFilter;

  const gridListRef = useRef<any>(null);
  const feedListRef = useRef<any>(null);
  const currentFeedIndexRef = useRef(0);
  const isQuizOpeningRef = useRef(false);
  const feedWordsRef = useRef<any[]>([]);

  // s Tum puzzle kelimeleri (farm + phrasal)
  //  Filtreler:
  // - puzzleHarvested: true -> GORUNMEZ (yapbozdan hasat edilmis)
  // - excludeFromPuzzle: true -> GORUNMEZ (envanterden dikilmis)
  // - forPuzzleOnly: true -> GORUNUR (yapboz envanterinden geri gelmis)
  // NOT: Sadece QUIZ ve TOHUM PAZARI'ndan gelen kelimeler puzzle'da gorunur!
  const puzzleWords_all = useMemo(() => {
    const farmWords = (farm || [])
      .filter(w => (w as any).isCustom || (w.example && w.example.length > 10)) // U Custom kelimeler ornek olmadan da yapboza girer
      .filter(w => !(w as any).puzzleHarvested) //  Hasat edilmisleri filtrele!
      .filter(w => !(w as any).excludeFromPuzzle); // sc© Envanterden dikilenleri filtrele!
    const phrasalWords = (phrasalVerbFarm || [])
      .filter(w => !(w as any).puzzleHarvested) //  Hasat edilmisleri filtrele!
      .filter(w => !(w as any).excludeFromPuzzle) // sc© Envanterden dikilenleri filtrele!
      .map(w => {
        const englishExample = (w as any).example || w.example;
        let turkishExample = (w as any).example_tr;
        if (!turkishExample) turkishExample = getPhrasalTurkishExample(w.id, w.text || (w as any).verb);
        return { ...w, isPhrasalVerb: true, text: w.text || (w as any).verb, example: englishExample, example_tr: turkishExample };
      }).filter(w => w.example && w.example.length > 10);
    const allWords = [...farmWords, ...phrasalWords];
    if (!isGuidedPuzzleStep) return allWords;
    const guidedWords = allWords.filter(isGuidedTargetWord);
    return guidedWords.slice(0, 1);
  }, [farm, phrasalVerbFarm, isGuidedPuzzleStep, isGuidedTargetWord]);

  //  Filter mapping - FarmScreen filter'lari -> Puzzle renkleri
  // all = tumu, ready = yesil (3+ session), study = kirmizi+turuncu (0-1 session), master = master, favorites = favoriler
  const puzzleWords_filtered = useMemo(() => {
    if (isGuidedPuzzleStep) {
      return [...puzzleWords_all];
    }

    let filtered = puzzleWords_all.filter(w => {
      const puzzleStats = (w as any).puzzleStats || { sessions: 0, puzzleMasterLevel: 0 };
      const sessions = puzzleStats.sessions || 0;
      const puzzleMasterLevel = puzzleStats.puzzleMasterLevel || 0;

      // s Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!w.text?.toLowerCase().includes(q) && !w.meaning?.toLowerCase().includes(q)) return false;
      }

      switch (filter) {
        case 'ready': // Yesil = 3+ session (hasat hazir)
          return puzzleMasterLevel === 0 && sessions >= 3;
        case 'study': // Calismaliyim = 0-2 session (kirmizi, turuncu, sari)
          return puzzleMasterLevel === 0 && sessions < 3;
        case 'master':
          return puzzleMasterLevel > 0;
        case 'favorites':
          return w.isFavorite === true;
        default:
          return true;
      }
    });

    if (filter === 'favorites') return filtered.sort((a, b) => (b.favoriteAddedAt || 0) - (a.favoriteAddedAt || 0));
    const favorites = filtered.filter(w => w.isFavorite).sort((a, b) => (b.favoriteAddedAt || 0) - (a.favoriteAddedAt || 0));
    const nonFavorites = filtered.filter(w => !w.isFavorite).sort((a, b) => (b.lastPlantedAt || 0) - (a.lastPlantedAt || 0));
    return [...favorites, ...nonFavorites];
  }, [puzzleWords_all, filter, searchQuery, isGuidedPuzzleStep]);

  // Stats - FarmScreen StatsHeader icin
  const stats = useMemo(() => {
    const total = puzzleWords_all.length;
    const ready = puzzleWords_all.filter(w => (((w as any).puzzleStats?.puzzleMasterLevel || 0) === 0) && (((w as any).puzzleStats?.sessions || 0) >= 3)).length;
    const study = puzzleWords_all.filter(w => (((w as any).puzzleStats?.puzzleMasterLevel || 0) === 0) && (((w as any).puzzleStats?.sessions || 0) < 3)).length;
    const master = puzzleWords_all.filter(w => ((w as any).puzzleStats?.puzzleMasterLevel || 0) > 0).length;
    return { total, ready, study, master };
  }, [puzzleWords_all]);

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const shown = await AsyncStorage.getItem('puzzle_hint_shown');
        if (!shown && puzzleWords_all.length > 0) { setShowHint(true); await AsyncStorage.setItem('puzzle_hint_shown', 'true'); setTimeout(() => setShowHint(false), 5000); }
      } catch {}
    };
    checkFirstTime();
  }, [puzzleWords_all.length]);

  useEffect(() => {
    if (isGuidedPuzzleStep) {
      setGuidedPuzzleTipVisible(true);
    }
  }, [isGuidedPuzzleStep, guidedModeTargetWordId]);

  useEffect(() => {
    if (!isGuidedPuzzleStep) return;
    if (searchVisible) {
      setSearchVisible(false);
      setSearchQuery('');
    }
    if (feedVisible) {
      setFeedVisible(false);
      setFeedQuizWordId(null);
    }
    if (puzzleDialogVisible && puzzleWords.length > 0 && !isGuidedTargetWord(puzzleWords[0])) {
      setPuzzleDialogVisible(false);
      setPuzzleWords([]);
    }
    if (!embedded && filter !== 'all') {
      setInternalFilter('all');
    }
  }, [isGuidedPuzzleStep, searchVisible, feedVisible, puzzleDialogVisible, puzzleWords, isGuidedTargetWord, embedded, filter, setSearchVisible, setSearchQuery, setInternalFilter]);

  const handleWordPress = useCallback((word: any) => {
    if (isGuidedPuzzleStep && !isGuidedTargetWord(word)) {
      haptic.light();
      return;
    }
    if (isGuidedPuzzleStep) {
      haptic.medium();
      const currentWord =
        farm?.find(w => w.id === word.id) ||
        phrasalVerbFarm?.find(w => w.id === word.id) ||
        word;
      setPuzzleWords([currentWord]);
      setPuzzleDialogVisible(true);
      return;
    }
    haptic.medium();

    //  Feed'e girerken konumu kaydet - cikinca buraya scroll et!
    setLastViewedWordId(word.id);

    // Tiklanan kelimeyi basa koy, diserlerini shuffle et
    const otherWords = puzzleWords_filtered.filter(w => w.id !== word.id);
    const shuffledOthers = [...otherWords];

    // Fisher-Yates shuffle for other words
    for (let i = shuffledOthers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
    }

    // Tiklanan kelime basta, sonra shuffle edilmis diserleri
    const feedData = [word, ...shuffledOthers];
    setShuffledFeedData(feedData);
    feedWordsRef.current = feedData;
    setFeedStartIndex(0);
    currentFeedIndexRef.current = 0;
    InteractionManager.runAfterInteractions(() => setFeedVisible(true));
  }, [puzzleWords_filtered, isGuidedPuzzleStep, isGuidedTargetWord, farm, phrasalVerbFarm]);

  const handleCloseFeed = useCallback(() => {
    haptic.light();
    setFeedVisible(false);
    setFeedQuizWordId(null);

    //  Feed'den knca grid'de tiklanan karta scroll et
    if (lastViewedWordId && gridListRef.current) {
      const wordIndex = puzzleWords_filtered.findIndex(w => w.id === lastViewedWordId);
      if (wordIndex >= 0) {
        // Modal kapatildiktan sonra interaction baslarsa scroll et
        InteractionManager.runAfterInteractions(() => {
          try {
            if (gridListRef.current) {
              gridListRef.current.scrollToIndex({ index: wordIndex, animated: true, viewPosition: 0.5 });
            }
          } catch (e) {
            // Scroll hatagormezden gel
          }
        });
      }
    }
  }, [lastViewedWordId, puzzleWords_filtered]);

  const handleFeedQuizStart = useCallback((wordId: string) => {
    if (isGuidedPuzzleStep) {
      haptic.light();
      return;
    }
    haptic.medium();
    setFeedQuizWordId(wordId);
  }, [isGuidedPuzzleStep]);

  const handleFeedHarvest = useCallback((word: any) => {
    //  Guclu hasat kutlama- FarmScreen ile ayni!
    haptic.harvestCelebration ? haptic.harvestCelebration() : haptic.heavy();
    sound.playEpicHarvest ? sound.playEpicHarvest() : sound.playHarvest?.();
    const result = harvestPuzzleWord(word.id);
    if (result?.success) {
      // Hasat basarili - envantere gitti
      setLastHarvestedWordId(word.id);
      //  Feed'de siyah tema iin harvestedWordIds'e ekle!
      setHarvestedWordIds(prev => new Set([...prev, word.id]));

      // sI Toast goster - Coin veya XP varsa goster, ikide 0 sa default mesaj goster
      const hasCoinOrXp = (result.coins ?? 0) > 0 || (result.xp ?? 0) > 0;

      if (result.coins > 0) {
        showRewardToast('coin', result.coins, `\u{1F33E} Hasat! +${result.coins} coin`);
        setTimeout(() => {
          showRewardToast('coin', result.coins, `\u{1F33E} Hasat! +${result.coins} coin`);
        }, 100);
      }
      if (result.xp > 0) {
        showRewardToast('xp', result.xp, `\u{2728} +${result.xp} XP`);
        setTimeout(() => {
          showRewardToast('xp', result.xp, `\u{2728} +${result.xp} XP`);
        }, 150);
      }

      // Eser ne coin ne xp yoksa, basari mesaji goster
      if (!hasCoinOrXp) {
        showRewardToast('harvest', 1, '\u{1F33E} Hasat tamamlandı!');
      }

      setShowReplantToast(true);
      setTimeout(() => setShowReplantToast(false), 4000);
    }
  }, [harvestPuzzleWord]);

  // Tekrar Ek - hasat edilen kelimeyi tarlaya geri gonder
  const handleReplant = useCallback(() => {
    if (!lastHarvestedWordId) return;
    // Envanterdeki en yeni puzzle kelimesini bul (az once hasat ettik)
    const allPuzzleInventory = [...inventory, ...phrasalVerbInventory].filter((w: any) => w.isPuzzleHarvested);
    const latestHarvested = allPuzzleInventory.find((w: any) => w.originalWordId === lastHarvestedWordId);
    if (latestHarvested) {
      haptic.heavy();
      sound.playPlant?.();
      plantFromInventory(latestHarvested.id);
      //  harvestedWordIds'den cikar!
      setHarvestedWordIds(prev => {
        const next = new Set(prev);
        next.delete(lastHarvestedWordId);
        return next;
      });
    }
    setShowReplantToast(false);
    setLastHarvestedWordId(null);
  }, [lastHarvestedWordId, inventory, phrasalVerbInventory, plantFromInventory]);

  // Feed icinden Tekrar Ek - word parametresiyle
  const handleFeedReplant = useCallback((word: any) => {
    // Envanterdeki en yeni puzzle kelimesini bul (az once hasat ettik)
    const allPuzzleInventory = [...inventory, ...phrasalVerbInventory].filter((w: any) => w.isPuzzleHarvested);
    const latestHarvested = allPuzzleInventory.find((w: any) => w.originalWordId === word.id);
    if (latestHarvested) {
      haptic.heavy();
      sound.playPlant?.();
      plantFromInventory(latestHarvested.id);
      //  harvestedWordIds'den cikar!
      setHarvestedWordIds(prev => {
        const next = new Set(prev);
        next.delete(word.id);
        return next;
      });
    }
    setShowReplantToast(false);
    setLastHarvestedWordId(null);
  }, [inventory, phrasalVerbInventory, plantFromInventory]);

  const handleQuizStart = useCallback((word: any) => {
    if (isQuizOpeningRef.current) return;
    isQuizOpeningRef.current = true;
    haptic.medium();
    const currentWord = farm?.find(w => w.id === word.id) || word;
    setPuzzleWords([currentWord]);
    setPuzzleDialogVisible(true);
    setTimeout(() => { isQuizOpeningRef.current = false; }, 500);
  }, [farm]);

  //  Grid swipe - hasat hazirsa hasat et, desilse quiz ac -  GUCLENDIRILMI HAPTIK!
  const handleGridSwipeQuiz = useCallback((word: any) => {
    if (isGuidedPuzzleStep && !isGuidedTargetWord(word)) {
      haptic.light();
      return;
    }
    const currentWord = farm?.find(w => w.id === word.id) || phrasalVerbFarm?.find(w => w.id === word.id) || word;
    if (currentWord.readyForPuzzleHarvest) {
      //  Guclu hasat kutlama- FarmScreen ile ayni!
      haptic.harvestCelebration ? haptic.harvestCelebration() : haptic.heavy();
      sound.playEpicHarvest ? sound.playEpicHarvest() : sound.playHarvest?.();
      harvestPuzzleWord(currentWord.id);
    } else {
      handleQuizStart(word);
    }
  }, [farm, phrasalVerbFarm, harvestPuzzleWord, handleQuizStart, isGuidedPuzzleStep, isGuidedTargetWord]);

  const handleToggleFavorite = useCallback((wordId: string) => { haptic.medium(); toggleFavorite(wordId); }, [toggleFavorite]);

  const handleFeedViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) {
      const newIndex = viewableItems[0].index;
      const currentItem = viewableItems[0].item;

      if (newIndex !== currentFeedIndexRef.current) {
        currentFeedIndexRef.current = newIndex;
        haptic.light();
        if (feedQuizWordId) setFeedQuizWordId(currentItem?.id);
      }

      //  O anda gorunen karti kaydet - feed cikinca buraya scroll et!
      if (currentItem?.id) {
        setLastViewedWordId(currentItem.id);
      }
    }
  }, [feedQuizWordId]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const handleQuizClose = useCallback(() => { setPuzzleDialogVisible(false); setPuzzleWords([]); }, []);
  const isPuzzleUiLocked = isGuidedPuzzleStep;

  const renderWordCard = useCallback(({ item, index }: { item: any; index: number }) => {
    const isLocked = isGuidedPuzzleStep && !isGuidedTargetWord(item);
    return (
      <GridSwipeWrapper disabled={feedVisible || puzzleDialogVisible || isLocked} onSwipeRight={() => handleGridSwipeQuiz(item)}>
        <View style={isLocked ? { opacity: 0.35 } : undefined}>
          <PuzzleGridCard
            word={item}
            onPress={() => !isLocked && handleWordPress(item)}
            onQuizPress={() => !isLocked && handleGridSwipeQuiz(item)}
            index={index}
            cardWidth={CALCULATED_CARD_WIDTH}
            activeThemeId={activeCardTheme}
            cardCustomization={safeCustomization}
          />
        </View>
      </GridSwipeWrapper>
    );
  }, [handleWordPress, handleGridSwipeQuiz, feedVisible, puzzleDialogVisible, CALCULATED_CARD_WIDTH, activeCardTheme, safeCustomization, isGuidedPuzzleStep, isGuidedTargetWord]);

  const renderFeedItem = useCallback(({ item }: { item: any }) => {
    const currentWord = farm?.find(w => w.id === item.id) || phrasalVerbFarm?.find(w => w.id === item.id) || inventory?.find(w => w.id === item.id || (w as any).originalWordId === item.id) || phrasalVerbInventory?.find(w => w.id === item.id || (w as any).originalWordId === item.id) || item;
    const isQuizActive = feedQuizWordId === item.id;
    //  Bu kelime hasat edilmis mi? Feed'de siyah tema ve replant icin!
    const justHarvested = harvestedWordIds.has(item.id);
    return (
      <View style={[styles.feedItem, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
        <PuzzleFeedCard
          word={currentWord}
          isQuizActive={isQuizActive}
          onQuizStart={(word) => handleFeedQuizStart(word.id)}
          onToggleFavorite={handleToggleFavorite}
          onHarvest={handleFeedHarvest}
          justHarvested={justHarvested}
          onReplant={handleFeedReplant}
          activeThemeId={activeCardTheme}
          cardCustomization={safeCustomization}
        />
        {isQuizActive && !currentWord.readyForPuzzleHarvest && !justHarvested && <WordPuzzleDialog key={`feed-${currentWord.id}`} words={[currentWord]} visible={true} onClose={() => setFeedQuizWordId(null)} />}
      </View>
    );
  }, [farm, phrasalVerbFarm, inventory, phrasalVerbInventory, feedQuizWordId, handleFeedQuizStart, handleToggleFavorite, handleFeedHarvest, harvestedWordIds, handleFeedReplant, activeCardTheme, safeCustomization]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const handleEmbeddedGridScroll = useCallback((event: any) => {
    if (!onParentScroll) return;
    const rawY = Number(event?.nativeEvent?.contentOffset?.y ?? 0);
    const y = Number.isFinite(rawY) ? Math.max(0, rawY) : 0;
    onParentScroll(y);
  }, [onParentScroll]);

  // s EMBEDDED MODE - FarmScreen'deki tab icin (PhrasalVerbFarmScreen gibi)
  if (embedded) {
    return (
      <View style={styles.embeddedContainer}>
        {/* s Inline Search */}
        {searchVisible && (
          <View style={styles.searchBarContainer}>
            <View style={styles.inlineSearchWrapper}>
              <Search size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
              <TextInput style={styles.inlineSearchInput} placeholder="Kelime ara..." placeholderTextColor="rgba(255,255,255,0.3)" value={searchQuery} onChangeText={setSearchQuery} autoFocus selectionColor="#a855f7" />
              {searchQuery.length > 0 && <TouchableOpacity style={styles.inlineSearchClear} onPress={() => setSearchQuery('')}><Text style={styles.inlineSearchClearIcon}>{'✕'}</Text></TouchableOpacity>}
              <TouchableOpacity style={styles.inlineSearchClose} onPress={() => { setSearchVisible(false); setSearchQuery(''); }}><Text style={styles.inlineSearchCloseIcon}>{'✕'}</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* s Grid */}
        {isGuidedPuzzleStep && (
          <CuteCloudTip
            visible={guidedPuzzleTipVisible}
            message={`Hedef kelime: "${guidedTargetLabel}".\nBu adımda yalnızca bu kart aktif.\nCümleyi doğru kurunca bir sonraki aşamaya geçeceğiz.`}
            onDismiss={() => setGuidedPuzzleTipVisible(false)}
            accentColor="#f97316"
          />
        )}
        {showCloudTip && !isGuidedPuzzleStep && (
          <CuteCloudTip
            visible={showCloudTip}
            message={"Tarlana ekmi\u015F oldu\u011Fun kelimeler ayn\u0131 s\u0131rayla buradad\u0131r. Ekti\u011Fin kelimelerin c\u00FCmle prati\u011Fini burada yapars\u0131n."}
            onDismiss={() => setCloudTipDismissed('puzzle', true)}
            accentColor="#f97316"
          />
        )}
        {puzzleWords_filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Puzzle size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{puzzleWords_all.length === 0 ? 'Yapboz İçin Kelime Yok' : 'Bu filtrede kelime yok'}</Text>
            <Text style={styles.emptySubtitle}>{puzzleWords_all.length === 0 ? 'Tarlana örnek cümleli kelimeler eklemelisin' : 'Başka bir filtre deneyin'}</Text>
          </View>
        ) : (
          <FlashList
            key={`puzzle-grid-${gridColumns}`}
            ref={gridListRef}
            data={puzzleWords_filtered}
            keyExtractor={keyExtractor}
            numColumns={gridColumns}
            renderItem={renderWordCard}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 100, paddingHorizontal: GRID_PADDING }}
            showsVerticalScrollIndicator={false}
            extraData={[CALCULATED_CARD_WIDTH, gridColumns, safeCustomization]}
            scrollEventThrottle={16}
            onScroll={handleEmbeddedGridScroll}
          />
        )}

        {/* sO Feed Modal */}
        <Modal visible={feedVisible} transparent animationType="fade" onRequestClose={handleCloseFeed}>
          <View style={styles.feedContainer}>
            <RewardToastContainer />
            <LinearGradient colors={[COLORS.background, COLORS.backgroundAlt]} style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={styles.feedCloseBtn} onPress={handleCloseFeed}><X size={24} color="#fff" /></TouchableOpacity>
            <FlashList
              ref={feedListRef}
              data={shuffledFeedData}
              keyExtractor={keyExtractor}
              renderItem={renderFeedItem}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              extraData={[feedQuizWordId, farm, phrasalVerbFarm, harvestedWordIds, activeCardTheme, safeCustomization]}
              drawDistance={SCREEN_HEIGHT}
              initialScrollIndex={feedStartIndex}
              onViewableItemsChanged={handleFeedViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />
          </View>
        </Modal>

        {/* sc© Grid Puzzle Dialog */}
        {puzzleDialogVisible && puzzleWords.length > 0 && <WordPuzzleDialog words={puzzleWords} visible={puzzleDialogVisible} onClose={handleQuizClose} />}
      </View>
    );
  }

  //  STANDALONE MODE - Ayri ekran olarak acildisinda
  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.backgroundAlt, COLORS.background]} style={StyleSheet.absoluteFillObject} />

      {/* s· Header - Standalone modda */}
      <View style={styles.header}>
        <LinearGradient colors={['rgba(18, 18, 20, 0.98)', 'rgba(28, 28, 30, 0.95)', 'rgba(18, 18, 20, 0.98)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.premiumFilterScroll}>
          <TouchableOpacity
            style={[styles.premiumFilterBtn, isPuzzleUiLocked && { opacity: 0.45 }]}
            disabled={isPuzzleUiLocked}
            onPress={() => {
              if (isPuzzleUiLocked) return;
              navigation.navigate('Home');
            }}
          ><X size={IS_SMALL_SCREEN ? 14 : 16} color="#fff" strokeWidth={2.5} /></TouchableOpacity>
          <TouchableOpacity style={[styles.premiumFilterBtn, filter === 'all' && styles.premiumFilterBtnActive, isPuzzleUiLocked && { opacity: 0.45 }]} disabled={isPuzzleUiLocked} onPress={() => { if (isPuzzleUiLocked) return; setFilter('all'); haptic.light(); }}>
            <Sprout size={IS_SMALL_SCREEN ? 14 : 16} color={filter === 'all' ? "#34C759" : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'all' && styles.premiumFilterCountActive]}>{stats.total}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.premiumFilterBtn, filter === 'ready' && styles.premiumFilterBtnActive, isPuzzleUiLocked && { opacity: 0.45 }]} disabled={isPuzzleUiLocked} onPress={() => { if (isPuzzleUiLocked) return; setFilter('ready'); haptic.light(); }}>
            <Wheat size={IS_SMALL_SCREEN ? 14 : 16} color={filter === 'ready' ? "#FFCC00" : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'ready' && { color: '#FFCC00' }]}>{stats.ready}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.premiumFilterBtn, filter === 'study' && styles.premiumFilterBtnActive, isPuzzleUiLocked && { opacity: 0.45 }]} disabled={isPuzzleUiLocked} onPress={() => { if (isPuzzleUiLocked) return; setFilter('study'); haptic.light(); }}>
            <AlertCircle size={IS_SMALL_SCREEN ? 14 : 16} color={filter === 'study' ? "#FF453A" : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'study' && { color: '#FF453A' }]}>{stats.study}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.premiumFilterBtn, filter === 'master' && styles.premiumFilterBtnActive, isPuzzleUiLocked && { opacity: 0.45 }]} disabled={isPuzzleUiLocked} onPress={() => { if (isPuzzleUiLocked) return; setFilter('master'); haptic.light(); }}>
            <Crown size={IS_SMALL_SCREEN ? 14 : 16} color={filter === 'master' ? "#BF5AF2" : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'master' && { color: '#BF5AF2' }]}>{stats.master}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.premiumFilterBtn, filter === 'favorites' && styles.premiumFilterBtnActive, isPuzzleUiLocked && { opacity: 0.45 }]} disabled={isPuzzleUiLocked} onPress={() => { if (isPuzzleUiLocked) return; setFilter('favorites'); haptic.light(); }}>
            <Heart size={IS_SMALL_SCREEN ? 14 : 16} color={filter === 'favorites' ? "#FF2D55" : "#888"} strokeWidth={2.5} fill={filter === 'favorites' ? "#FF2D55" : "transparent"} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isGuidedPuzzleStep && (
        <CuteCloudTip
          visible={guidedPuzzleTipVisible}
          message={`Hedef kelime: "${guidedTargetLabel}".\nSadece bu kart açık.\nDoğru cümle kurunca SesYap adımına geçeceğiz.`}
          onDismiss={() => setGuidedPuzzleTipVisible(false)}
          accentColor="#f97316"
        />
      )}
      {showCloudTip && !isGuidedPuzzleStep && (
        <CuteCloudTip
          visible={showCloudTip}
          message={"Tarlana ekmi\u015F oldu\u011Fun kelimeler ayn\u0131 s\u0131rayla buradad\u0131r. Ekti\u011Fin kelimelerin c\u00FCmle prati\u011Fini burada yapars\u0131n."}
          onDismiss={() => setCloudTipDismissed('puzzle', true)}
          accentColor="#f97316"
        />
      )}
      {showHint && <View style={styles.hintBanner}><Text style={styles.hintText}>Karta tıkla, detay gör | Sağa kaydır, yapboz çöz</Text></View>}

      {puzzleWords_filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Puzzle size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{filter === 'all' ? 'Yapboz İçin Kelime Yok' : 'Bu filtrede kelime yok'}</Text>
          <Text style={styles.emptySubtitle}>{filter === 'all' ? 'Tarlana örnek cümleli kelimeler eklemelisin' : 'Başka bir filtre deneyin'}</Text>
          {filter !== 'all' && <TouchableOpacity style={styles.resetFilterBtn} onPress={() => setFilter('all')}><RotateCcw size={16} color="#fff" /><Text style={styles.resetFilterText}>Filtreyi Sıfırla</Text></TouchableOpacity>}
        </View>
      ) : (
        <FlashList
          key={`puzzle-grid-${gridColumns}`}
          ref={gridListRef}
          data={puzzleWords_filtered}
          keyExtractor={keyExtractor}
          numColumns={gridColumns}
          renderItem={renderWordCard}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100, paddingHorizontal: GRID_PADDING }}
          showsVerticalScrollIndicator={false}
          extraData={[CALCULATED_CARD_WIDTH, gridColumns, safeCustomization]}
        />
      )}

      <Modal visible={feedVisible} transparent animationType="fade" onRequestClose={handleCloseFeed}>
        <View style={styles.feedContainer}>
          <RewardToastContainer />
          <LinearGradient colors={[COLORS.background, COLORS.backgroundAlt]} style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={styles.feedCloseBtn} onPress={handleCloseFeed}><X size={24} color="#fff" /></TouchableOpacity>
          <FlashList
            ref={feedListRef}
            data={shuffledFeedData}
            keyExtractor={keyExtractor}
            renderItem={renderFeedItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            extraData={[feedQuizWordId, harvestedWordIds, activeCardTheme, safeCustomization]}
            drawDistance={SCREEN_WIDTH}
            initialScrollIndex={feedStartIndex}
            onViewableItemsChanged={handleFeedViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
        </View>
      </Modal>

      {puzzleDialogVisible && puzzleWords.length > 0 && <WordPuzzleDialog words={puzzleWords} visible={puzzleDialogVisible} onClose={handleQuizClose} />}
    </View>
  );
}

// s¨ Export stats for FarmScreen
export function usePuzzleStats() {
  const farm = useFarmStore((state) => state.farm);
  const phrasalVerbFarm = useFarmStore((state) => state.phrasalVerbFarm);

  return useMemo(() => {
    const farmWords = (farm || []).filter(w => w.example && w.example.length > 10);
    const phrasalWords = (phrasalVerbFarm || []).filter(w => (w as any).example && (w as any).example.length > 10);
    const all = [...farmWords, ...phrasalWords];

    const total = all.length;
    const ready = all.filter(w => (((w as any).puzzleStats?.puzzleMasterLevel || 0) === 0) && (((w as any).puzzleStats?.sessions || 0) >= 3)).length;
    const study = all.filter(w => (((w as any).puzzleStats?.puzzleMasterLevel || 0) === 0) && (((w as any).puzzleStats?.sessions || 0) < 3)).length;
    const master = all.filter(w => ((w as any).puzzleStats?.puzzleMasterLevel || 0) > 0).length;

    return { total, ready, study, master };
  }, [farm, phrasalVerbFarm]);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  embeddedContainer: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? (IS_SMALL_SCREEN ? 38 : 46) : (IS_SMALL_SCREEN ? 22 : 26), paddingBottom: IS_SMALL_SCREEN ? 8 : 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
  premiumFilterScroll: { paddingHorizontal: IS_SMALL_SCREEN ? 10 : 14, gap: IS_SMALL_SCREEN ? 6 : 8, alignItems: 'center' },
  premiumFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: IS_SMALL_SCREEN ? 4 : 5, paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12, paddingVertical: IS_SMALL_SCREEN ? 8 : 10, borderRadius: IS_SMALL_SCREEN ? 12 : 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  premiumFilterBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
  premiumFilterCount: { fontSize: IS_SMALL_SCREEN ? 12 : 14, fontWeight: '800', color: '#888' },
  premiumFilterCountActive: { color: '#34C759' },
  searchBarContainer: { paddingHorizontal: 14, paddingVertical: 8 },
  inlineSearchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  inlineSearchInput: { flex: 1, color: '#fff', fontSize: 15 },
  inlineSearchClear: { padding: 4, marginRight: 8 },
  inlineSearchClearIcon: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  inlineSearchClose: { padding: 4 },
  inlineSearchCloseIcon: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hintBanner: { backgroundColor: 'rgba(168, 85, 247, 0.15)', paddingVertical: 8, paddingHorizontal: 16, marginHorizontal: 14, marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' },
  hintText: { color: '#c4b5fd', fontSize: 12, textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  resetFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  resetFilterText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  feedContainer: { flex: 1, backgroundColor: COLORS.background },
  feedCloseBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 100, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  replantToast: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, overflow: 'hidden', zIndex: 200 },
  replantToastText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  replantToastBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  replantToastBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  feedItem: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  appleCard: { borderRadius: 24, borderWidth: 2, padding: 24, overflow: 'hidden', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  shimmerEffect: { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255, 255, 255, 0.15)', transform: [{ skewX: '-20deg' }] },
  appleFavorite: { position: 'absolute', top: 16, left: 16, zIndex: 10 },
  appleBadge: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  appleBadgeEmoji: { fontSize: 14 },
  appleBadgeText: { fontSize: 12, fontWeight: '700' },
  appleWord: { fontSize: 36, fontWeight: '800', marginTop: 20, marginBottom: 8, letterSpacing: -1 },
  appleMeaning: { fontSize: 18, fontWeight: '600', marginBottom: 12, lineHeight: 24 },
  appleExample: { fontSize: 15, fontStyle: 'italic', marginBottom: 20, lineHeight: 22 },
  appleSessionCounter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 8 },
  appleSessionNum: { fontSize: 28, fontWeight: '800' },
  appleStats: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  appleStat: { alignItems: 'center' },
  appleStatNum: { fontSize: 24, fontWeight: '800' },
  appleStatLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  appleButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  appleButtonText: { fontSize: 18, fontWeight: '700', color: '#000' },
  appleButtonHint: { fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 4 },
});
