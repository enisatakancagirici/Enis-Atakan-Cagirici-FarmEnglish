import React, { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  Easing,
  InteractionManager,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { Sprout, Wheat, Star, Zap, TrendingUp, ShoppingCart, Search, Sparkles, X, Heart, AlertCircle, Crown, BookOpen, Leaf, Lock, Link2, Puzzle, Settings, RotateCcw } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { TransferToast } from '../components/TransferToast';
import { showRewardToast, RewardToastContainer } from '../components/RewardToast';
import { useFarmStore, type TransferEvent } from '../store/farmStore';
import { MiniQuizDialog } from '../components/MiniQuizDialog';
import { UltimateWordCard } from '../components/UltimateWordCard';
import { SkeletonCardGrid } from '../components/SkeletonCard';
import { TutorialFinalQuizPremium } from '../components/TutorialFinalQuizPremium';
import { isTutorialFullScreenActive, FarmMascotCloudTip } from '../components/TutorialManagerFixed';
import { CuteCloudTip } from '../components/CuteCloudTip';
import { DailyQuestsPanel } from '../components/DailyQuestsPanel';
import { CardShopPanel } from '../components/CardShopPanel';
import { FlashList } from '@shopify/flash-list';
import { haptic, sound } from '../utils/sound';
import { getFirstMeaning } from '../utils/loadWords';
import PhrasalVerbFarmScreen from './PhrasalVerbFarmScreenNew';
import WordPuzzleScreen, { usePuzzleStats } from './WordPuzzleScreen';
import { globalTabState } from '../navigation/globalTabState';
import { usePerformanceStore } from '../store/performanceStore';
import { traceEvent } from '../utils/debugTrace';
import { normalizeDisplayText } from '../utils/textNormalization';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ?? Responsive sizing for small screens (4.7" = ~667px height)
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 700;
const IS_TABLET = SCREEN_WIDTH > 768;
const FEED_CARD_MAX_WIDTH = IS_TABLET ? 500 : SCREEN_WIDTH - 40;

// ? iftlik Tab Resimleri (yeni)
const TAB_IMAGES = {
  words: require('../../assets/images/maskot/kelimeler_ciftlik_tab_yeni.webp'),
  phrasal: require('../../assets/images/maskot/pharasal_ciftlik_tab_yeni.webp'),
  puzzle: require('../../assets/images/maskot/yapboz_ciftlik_tab_yeni.webp'),
};

// ?? PREMIUM RENK PALET
const COLORS = {
  // Arka plan - derin koyu
  background: '#050810',
  backgroundAlt: '#0a0f1a',

  // Yzeyler
  surface: 'rgba(15, 23, 42, 0.8)',
  surfaceLight: 'rgba(30, 41, 59, 0.6)',

  // Vurgular
  accent: '#22c55e',
  accentGlow: 'rgba(34, 197, 94, 0.3)',

  // Tehlike
  danger: '#ef4444',
  dangerGlow: 'rgba(239, 68, 68, 0.3)',

  // Altn
  gold: '#fbbf24',
  goldGlow: 'rgba(251, 191, 36, 0.3)',

  // Mor
  purple: '#a855f7',
  purpleGlow: 'rgba(168, 85, 247, 0.3)',

  // Metinler
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Kenarlklar
  border: 'rgba(51, 65, 85, 0.5)',
  borderLight: 'rgba(71, 85, 105, 0.3)',
};

// ?? Apple-smooth tiny action pill
const ActionPill = ({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => {
          haptic.light();
          Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, friction: 10, tension: 260 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 220 }).start();
        }}
        onPress={() => {
          haptic.selection();
          onPress();
        }}
        style={styles.actionPill}
      >
        <View style={styles.actionPillIcon}>{icon}</View>
        <Text style={styles.actionPillText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ?? Feed Card Component - SAA KAYDIR = QUIZ A (saf gesture, animasyon yok)
// ?? TEMA SSTEM - UltimateWordCard ile senkronize
const FEED_THEMES = {
  red: {
    gradient: ['rgba(127, 29, 29, 0.95)', 'rgba(153, 27, 27, 0.9)', 'rgba(127, 29, 29, 0.95)'] as const,
    border: 'rgba(239, 68, 68, 0.8)',
    glow: '#ef4444',
    textMain: '#fecaca',
    textSecondary: '#fca5a5',
    accent: '#ef4444',
    emoji: '🔴',
  },
  orange: {
    gradient: ['rgba(124, 45, 18, 0.95)', 'rgba(154, 52, 18, 0.9)', 'rgba(124, 45, 18, 0.95)'] as const,
    border: 'rgba(249, 115, 22, 0.8)',
    glow: '#f97316',
    textMain: '#fed7aa',
    textSecondary: '#fdba74',
    accent: '#f97316',
    emoji: '🟠',
  },
  yellow: {
    gradient: ['rgba(113, 63, 18, 0.95)', 'rgba(133, 77, 14, 0.9)', 'rgba(113, 63, 18, 0.95)'] as const,
    border: 'rgba(234, 179, 8, 0.8)',
    glow: '#eab308',
    textMain: '#fef08a',
    textSecondary: '#fde047',
    accent: '#eab308',
    emoji: '🟡',
  },
  green: {
    gradient: ['rgba(20, 83, 45, 0.95)', 'rgba(6, 95, 70, 0.9)', 'rgba(20, 83, 45, 0.95)'] as const,
    border: 'rgba(34, 197, 94, 0.8)',
    glow: '#22c55e',
    textMain: '#dcfce7',
    textSecondary: '#bbf7d0',
    accent: '#22c55e',
    emoji: '✅',
  },
  master: {
    gradient: ['rgba(161, 98, 7, 0.95)', 'rgba(202, 138, 4, 0.9)', 'rgba(161, 98, 7, 0.95)'] as const,
    border: 'rgba(250, 204, 21, 0.9)',
    glow: '#ffd700',
    textMain: '#fef9c3',
    textSecondary: '#fef08a',
    accent: '#facc15',
    emoji: '🏆',
  },
  ultra: {
    gradient: ['rgba(8, 145, 178, 0.95)', 'rgba(6, 182, 212, 0.9)', 'rgba(59, 130, 246, 0.95)'] as const,
    border: 'rgba(34, 211, 238, 0.9)',
    glow: '#22d3ee',
    textMain: '#cffafe',
    textSecondary: '#a5f3fc',
    accent: '#22d3ee',
    emoji: '💎',
  },
  perfect: {
    gradient: ['rgba(168, 85, 247, 0.95)', 'rgba(192, 132, 252, 0.9)', 'rgba(139, 92, 246, 0.95)'] as const,
    border: 'rgba(192, 132, 252, 0.95)',
    glow: '#c084fc',
    textMain: '#f3e8ff',
    textSecondary: '#e9d5ff',
    accent: '#c084fc',
    emoji: '👑',
  },
};

//  Tema seçici fonksiyon (TURUNCU KALDIRILDI)
const getWordTheme = (word: any) => {
  const masterLevel = word.masterLevel || 0;
  const wrongCount = word.wrongCount || 0;

  if (masterLevel === 3) return FEED_THEMES.perfect;
  if (masterLevel === 2) return FEED_THEMES.ultra;
  if (masterLevel === 1) return FEED_THEMES.master;
  if (wrongCount >= 2) return FEED_THEMES.green;  // YENİ: >=2 yeşil
  if (wrongCount >= 1) return FEED_THEMES.yellow; // YENİ: =1 sarı
  return FEED_THEMES.red;
};

// 📦 Envanter tema (koyu gri)
const INVENTORY_THEME = {
  gradient: ['rgba(26, 26, 46, 0.95)', 'rgba(22, 33, 62, 0.9)', 'rgba(26, 26, 46, 0.95)'] as const,
  border: 'rgba(74, 85, 104, 0.8)',
  glow: '#4a5568',
  textMain: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#22c55e',
  emoji: '📦',
};

// ?? Apple-Style Minimal FeedCard - Clean, Smooth, Juicy ?
const FeedCard: React.FC<{
  word: any;
  isQuizActive: boolean;
  isInInventory: boolean;
  onQuizStart: (id: string) => void;
  onQuizAnswer: (correct: boolean, count?: number) => void;
  onQuizClose: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSwipeStateChange: (isSwiping: boolean) => void;
  onPlantToFarm?: (id: string) => void;
  onHarvest?: (id: string) => void;
  onReplant?: (id: string) => void; // ?? Tekrar Ek fonksiyonu
  justHarvested?: boolean; // ?? Az önce hasat edildi mi?
  pool: any[];
  isTutorialBlocking?: boolean; // ?? Tutorial fullscreen açıkken swipe engelle
  performanceConfig?: any; // ?? Parent'tan gelen config  hook bypass
  screenWidth?: number; // ?? Parent'tan gelen boyut  hook bypass
  screenHeight?: number;
}> = ({ word, isQuizActive, isInInventory, onQuizStart, onQuizAnswer, onQuizClose, onToggleFavorite, onSwipeStateChange, onPlantToFarm, onHarvest, onReplant, justHarvested, pool, isTutorialBlocking = false, performanceConfig, screenWidth, screenHeight }) => {
  // ?? PERFORMANS AYARLARI — parent'tan prop olarak gelir, hook çağrısı YOK
  const config = performanceConfig || { enableShimmer: true, enablePulseAnimations: true };

  // ?? Ekran boyutu  parent'tan prop olarak gelir, useWindowDimensions hook'u YOK
  const windowWidth = screenWidth || SCREEN_WIDTH;
  const windowHeight = screenHeight || SCREEN_HEIGHT;
  const isTablet = windowWidth > 768;
  const feedCardMaxWidth = isTablet ? 500 : windowWidth - 40;

  const hasTriggeredRef = useRef(false);
  // ?? Tema: Hasat edildiyse veya Envanterdeyse  gri/siyah premium tema
  const HARVESTED_THEME = {
    gradient: ['rgba(20, 20, 25, 0.98)', 'rgba(35, 35, 45, 0.95)', 'rgba(20, 20, 25, 0.98)'] as const,
    border: 'rgba(100, 116, 139, 0.6)',
    glow: '#475569',
    textMain: '#cbd5e1',
    textSecondary: '#94a3b8',
    accent: '#64748b',
    emoji: '(',
  };
  const theme = (justHarvested || isInInventory) ? HARVESTED_THEME : getWordTheme(word);

  // ? Master kartlar iin shimmer + bounce animasyonu (UltimateWordCard gibi)
  const masterLevel = word.masterLevel || 0;
  const isMaster = masterLevel >= 1 && !isInInventory && !justHarvested;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ? SHIMMER - Kartın içinde kayan ışık + PERFORMANS KONTROLÜ + Quiz sırasında durdur
  useEffect(() => {
    if (isMaster && config.enableShimmer && !isQuizActive) {
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
    } else if (isQuizActive) {
      shimmerAnim.setValue(-1);
    }
  }, [isMaster, shimmerAnim, config.enableShimmer, isQuizActive]);

  // ?? BOUNCE/PULSE - Hafif zıplama animasyonu + PERFORMANS KONTROLÜ + Quiz sırasında durdur
  useEffect(() => {
    if (isMaster && config.enablePulseAnimations && !isQuizActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
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
    } else if (isQuizActive) {
      // Quiz aktifken pulse'ı 1'e sıfırla
      pulseAnim.setValue(1);
    }
  }, [isMaster, pulseAnim, config.enablePulseAnimations, isQuizActive]);

  // Shimmer translate interpolation
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-400, 400],
  });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isQuizActive && !isTutorialBlocking,
    onMoveShouldSetPanResponder: (_, gesture) => {
      // ?? Tutorial fullscreen akken swipe engelle
      if (isTutorialBlocking) return false;
      // Daha fazla yatay bias - dikey scroll engelleme
      return !isQuizActive && gesture.dx > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 3;
    },
    onPanResponderGrant: () => {
      if (isTutorialBlocking) return; // ?? Double check
      hasTriggeredRef.current = false;
      haptic.light();
    },
    onPanResponderMove: (_, gesture) => {
      if (isTutorialBlocking) return; // ?? Double check
      if (gesture.dx > 50 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        haptic.heavy();
        // ? Az nce hasat edilmise  Tarlaya geri ek (onReplant)
        if (justHarvested && onReplant) {
          if (haptic.plantToFarm) { haptic.plantToFarm(); } else { haptic.heavy(); }
          sound.playPlant?.();
          onReplant(word.id);
        }
        // ?? Hasat hazrsa  HASAT ET (miniquiz ama!)
        else if (word.isHarvestReady && !isInInventory) {
          haptic.harvestCelebration?.();
          sound.playEpicHarvest?.();
          onHarvest?.(word.id);
        }
        // ?? Envanterdeyse  Tarlaya ekle
        else if (isInInventory && onPlantToFarm) {
          sound.playPlant?.();
          onPlantToFarm(word.id);
        }
        // ?? Tarlada ve hasat hazr deilse  Quiz balat
        else if (!isInInventory && !word.isHarvestReady) {
          onQuizStart(word.id);
        }
      }
    },
    onPanResponderRelease: () => { hasTriggeredRef.current = false; },
    onPanResponderTerminate: () => { hasTriggeredRef.current = false; },
  }), [isQuizActive, isInInventory, onQuizStart, onPlantToFarm, onHarvest, onReplant, justHarvested, word.id, word.isHarvestReady, isTutorialBlocking]);

  const streak = word.consecutiveCorrect || 0;

  return (
    <View style={[styles.feedItem, { width: windowWidth, height: windowHeight, justifyContent: 'center', alignItems: 'center' }]}>
      <Animated.View
        style={[
          styles.appleCard,
          {
            width: feedCardMaxWidth,
            borderColor: theme.border,
            shadowColor: theme.glow,
            // Master kartlar iin gl statik shadow (native driver uyumu iin)
            shadowOpacity: isQuizActive ? 0 : (isMaster ? 0.7 : 0.35),
            shadowRadius: isQuizActive ? 0 : (isMaster ? 20 : 12),
            // ?? Bounce animasyonu
            transform: [{ scale: isQuizActive ? 1 : (isMaster ? pulseAnim : 1) }],
          }
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ? SHIMMER EFFECT - Master kartlar iin kartn iinde kayan k + PERFORMANS KONTROL */}
        {isMaster && config.enableShimmer && !isQuizActive && (
          <Animated.View
            style={[
              styles.feedShimmerEffect,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* ?? Favorite - st sol */}
        <TouchableOpacity
          style={styles.appleFavorite}
          onPress={() => { haptic.medium(); onToggleFavorite(word.id); }}
          activeOpacity={0.7}
        >
          <Heart
            size={24}
            color={word.isFavorite ? '#ff375f' : 'rgba(255,255,255,0.5)'}
            fill={word.isFavorite ? '#ff375f' : 'transparent'}
          />
          {/* ?? PV Badge - Phrasal Verb ise gster */}
          {word.isPhrasalVerb && (
            <View style={styles.pvMiniBadgeFeed}>
              <Text style={styles.pvMiniBadgeFeedText}>PV</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ? Badge - st sa */}
        <View style={[styles.appleBadge, { backgroundColor: `${theme.accent}25` }]}>
          <Text style={styles.appleBadgeEmoji}>{(justHarvested || isInInventory) ? '\u{1F331}' : theme.emoji}</Text>
          <Text style={[styles.appleBadgeText, { color: theme.textSecondary }]}>
            {justHarvested ? 'Envanterde' : isInInventory ? 'Envanter' : masterLevel >= 3 ? 'Kraliyet' : masterLevel === 2 ? 'Elmas' : masterLevel === 1 ? 'Usta' : (word.wrongCount || 0) >= 2 ? 'Yeşil' : (word.wrongCount || 0) >= 1 ? 'Sarı' : 'Kırmızı'}
          </Text>
        </View>

        {/* ?? Kelime */}
        <Text style={[styles.appleWord, { color: theme.textMain }]}>{normalizeDisplayText(word.text)}</Text>

        {/* ?? rnek cmle */}
        {!!word.example && (
          <Text style={[styles.appleExample, { color: `${theme.textSecondary}cc` }]}>
            "{normalizeDisplayText(word.example)}"
          </Text>
        )}

        {/* ?? Mini stats - Quiz istatistikleri */}
        <View style={styles.appleStats}>
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: '#22c55e' }]}>{'✓'}{word.quizCorrect || 0}</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>doğru</Text>
          </View>
          <View style={[styles.appleStatDivider, { backgroundColor: theme.accent }]} />
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: '#ef4444' }]}>{'✗'}{word.quizWrong || 0}</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>yanlış</Text>
          </View>
          <View style={[styles.appleStatDivider, { backgroundColor: theme.accent }]} />
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: theme.textMain }]}>%{
              ((word.quizCorrect || 0) + (word.quizWrong || 0)) > 0
                ? Math.round(((word.quizCorrect || 0) / ((word.quizCorrect || 0) + (word.quizWrong || 0))) * 100)
                : 0
            }</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>başarı</Text>
          </View>
        </View>

        {/* ?? Buton - justHarvested ise "Tekrar Ek", Hasat hazrsa "Hasat Et", Envanterdeyse "Tarlaya Ekle", deilse "al" */}
        {!isQuizActive && (
          justHarvested ? (
            // ?? TEKRAR EK BUTONU - Premium tasarm
            <TouchableOpacity
              style={[
                styles.appleButton,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderWidth: 2,
                  borderColor: '#10b981',
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]}
              activeOpacity={0.85}
              onPress={() => {
                if (haptic.plantToFarm) { haptic.plantToFarm(); } else { haptic.heavy(); }
                sound.playPlant?.();
                onReplant?.(word.id);
              }}
            >
              <Text style={[styles.appleButtonText, { fontSize: 14, color: '#10b981', fontWeight: '700' }]}>Tarlaya Geri Ek</Text>
              <Text style={[styles.appleButtonHint, { color: 'rgba(16, 185, 129, 0.7)', fontSize: 11 }]}>kaydir veya dokun</Text>
            </TouchableOpacity>
          ) : word.isHarvestReady && !isInInventory ? (
            // ?? HASAT ET BUTONU - Altn premium
            <TouchableOpacity
              style={[
                styles.appleButton,
                {
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderWidth: 2,
                  borderColor: '#f59e0b',
                  shadowColor: '#f59e0b',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]}
              activeOpacity={0.8}
              onPress={() => {
                haptic.heavy();
                sound.playHarvest?.();
                onHarvest?.(word.id);
              }}
            >
              <Text style={[styles.appleButtonText, { fontSize: 14, color: '#f59e0b', fontWeight: '700' }]}>Hasat Et</Text>
              <Text style={[styles.appleButtonHint, { color: 'rgba(245, 158, 11, 0.7)', fontSize: 11 }]}>kaydir veya dokun</Text>
            </TouchableOpacity>
          ) : isInInventory ? (
            // ?? ENVANTER  TARLAYA EKLE BUTONU
            <TouchableOpacity
              style={[
                styles.appleButton,
                {
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  borderWidth: 2,
                  borderColor: '#22c55e',
                  shadowColor: '#22c55e',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]}
              activeOpacity={0.8}
              onPress={() => {
                haptic.heavy();
                sound.playPlant?.();
                onPlantToFarm?.(word.id);
              }}
            >
              <Text style={[styles.appleButtonText, { fontSize: 14, color: '#22c55e', fontWeight: '700' }]}>Tarlaya Ekle</Text>
              <Text style={[styles.appleButtonHint, { color: 'rgba(34, 197, 94, 0.7)', fontSize: 11 }]}>kaydir veya dokun</Text>
            </TouchableOpacity>
          ) : (
            // ?? ALI BUTONU - Normal kart
            <TouchableOpacity
              style={[styles.appleButton, { backgroundColor: theme.accent }]}
              activeOpacity={0.8}
              onPress={() => {
                haptic.medium();
                onQuizStart(word.id);
              }}
            >
              <Text style={styles.appleButtonText}>Çalış</Text>
              <Text style={styles.appleButtonHint}>kaydir veya dokun</Text>
            </TouchableOpacity>
          )
        )}

        {/* Quiz aktifse - SADECE tarlada ve hasat edilmemisse */}
        {isQuizActive && !isInInventory && !justHarvested && (
          <View style={styles.appleQuizWrap}>
            <MiniQuizDialog
              key={word.id}
              word={word}
              allWords={pool}
              onAnswer={onQuizAnswer}
              onClose={() => onQuizClose(word.id)}
              feedMode={true}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// ⚡ React.memo  sadece anlaml prop deişikliinde yeniden render
const MemoFeedCard = React.memo(FeedCard, (prev, next) => {
  // word.id, quiz durumu, envanter durumu, hasat durumu deişmediyse re-render yapma
  return (
    prev.word?.id === next.word?.id &&
    prev.word?.masterLevel === next.word?.masterLevel &&
    prev.word?.quizCorrect === next.word?.quizCorrect &&
    prev.isQuizActive === next.isQuizActive &&
    prev.isInInventory === next.isInInventory &&
    prev.justHarvested === next.justHarvested &&
    prev.isTutorialBlocking === next.isTutorialBlocking
  );
});

// ?? Farm Grid Swipe Wrapper - SOLA KAYDIR = QUIZ (animasyonsuz, saf gesture)
const GridSwipeWrapper: React.FC<{
  disabled?: boolean;
  onSwipeRight: () => void;
  children: React.ReactNode;
}> = ({ disabled, onSwipeRight, children }) => {
  const hasTriggeredRef = useRef(false);
  const isProcessingRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !isProcessingRef.current,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (disabled || isProcessingRef.current) return false;
          // Saa hareket + yatay (2x fark olmal - dikey kaymay engelle)
          return gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2;
        },
        onPanResponderGrant: () => {
          if (disabled || isProcessingRef.current) return;
          hasTriggeredRef.current = false;
          haptic.light();
        },
        onPanResponderMove: (_, gesture) => {
          if (disabled || isProcessingRef.current) return;
          // Saa 30px+ gidince tetikle (daha kesin)
          if (gesture.dx > 30 && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            isProcessingRef.current = true;
            haptic.heavy();

            // ? Async olarak altr - UI donmasn nle
            InteractionManager.runAfterInteractions(() => {
              try {
                onSwipeRight();
              } finally {
                // Ksa gecikme ile sfrla
                setTimeout(() => {
                  isProcessingRef.current = false;
                }, 100);
              }
            });
          }
        },
        onPanResponderRelease: () => {
          hasTriggeredRef.current = false;
        },
        onPanResponderTerminate: () => {
          hasTriggeredRef.current = false;
          isProcessingRef.current = false;
        },
      }),
    [disabled, onSwipeRight]
  );

  return (
    <View {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

// ?? Stats Header Component - PREMIUM FILTER BAR
const StatsHeader: React.FC<{
  totalWords: number;
  harvestReady: number;
  studyCount: number;
  masterCount: number;
  onPressSearch: () => void;
  onPressSeedMarket?: () => void;
  onPressPhrasalMenu?: () => void;
  onPressPuzzle?: () => void;
  onPressCardShop?: () => void;
  activeTab: 'words' | 'phrasal' | 'puzzle';
  filter: 'all' | 'ready' | 'study' | 'master' | 'favorites' | 'custom';
  onFilterChange: (filter: 'all' | 'ready' | 'study' | 'master' | 'favorites' | 'custom') => void;
  tutorialStep?: string; // ?? Tutorial kilitli filtre kontrol
  guidedLocked?: boolean;
}> = ({ totalWords, harvestReady, studyCount, masterCount, onPressSearch, onPressSeedMarket, onPressPhrasalMenu, onPressPuzzle, onPressCardShop, activeTab, filter, onFilterChange, tutorialStep, guidedLocked = false }) => {
  // ?? Tutorial srasnda sadece "all" filtreaktif
  const isFilterLocked = Boolean(guidedLocked || (tutorialStep && tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED'));

  return (
    <View style={styles.statsHeader}>
      <LinearGradient
        colors={['rgba(18, 18, 20, 0.98)', 'rgba(28, 28, 30, 0.95)', 'rgba(18, 18, 20, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Premium Filter Bar - Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.premiumFilterScroll}
      >
        {/* ?? Tm - Her zaman aktif */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, filter === 'all' && styles.premiumFilterBtnActive]}
          onPress={() => { onFilterChange('all'); haptic.light(); }}
        >
          <Sprout size={IS_SMALL_SCREEN ? 14 : 16} color={filter === 'all' ? "#34C759" : "#888"} strokeWidth={2.5} />
          <Text style={[styles.premiumFilterCount, filter === 'all' && styles.premiumFilterCountActive]}>{totalWords}</Text>
        </TouchableOpacity>

        {/* ?? Hasat Hazr - Tutorial'da kilitli */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, filter === 'ready' && styles.premiumFilterBtnActive, isFilterLocked && styles.premiumFilterBtnLocked]}
          onPress={() => {
            if (isFilterLocked) return;
            onFilterChange('ready');
            haptic.light();
          }}
          disabled={isFilterLocked}
        >
          {isFilterLocked && <Lock size={10} color="#666" style={{ position: 'absolute', top: 2, right: 2 }} />}
          <Wheat size={IS_SMALL_SCREEN ? 14 : 16} color={isFilterLocked ? "#444" : (filter === 'ready' ? "#FFCC00" : "#888")} strokeWidth={2.5} />
          <Text style={[styles.premiumFilterCount, filter === 'ready' && { color: '#FFCC00' }, isFilterLocked && { color: '#444' }]}>{harvestReady}</Text>
        </TouchableOpacity>

        {/* ?? almalym - Tutorial'da kilitli */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, filter === 'study' && styles.premiumFilterBtnActive, isFilterLocked && styles.premiumFilterBtnLocked]}
          onPress={() => {
            if (isFilterLocked) return;
            onFilterChange('study');
            haptic.light();
          }}
          disabled={isFilterLocked}
        >
          {isFilterLocked && <Lock size={10} color="#666" style={{ position: 'absolute', top: 2, right: 2 }} />}
          <AlertCircle size={IS_SMALL_SCREEN ? 14 : 16} color={isFilterLocked ? "#444" : (filter === 'study' ? "#FF453A" : "#888")} strokeWidth={2.5} />
          <Text style={[styles.premiumFilterCount, filter === 'study' && { color: '#FF453A' }, isFilterLocked && { color: '#444' }]}>{studyCount}</Text>
        </TouchableOpacity>

        {/* ? Master - Tutorial'da kilitli */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, filter === 'master' && styles.premiumFilterBtnActive, isFilterLocked && styles.premiumFilterBtnLocked]}
          onPress={() => {
            if (isFilterLocked) return;
            onFilterChange('master');
            haptic.light();
          }}
          disabled={isFilterLocked}
        >
          {isFilterLocked && <Lock size={10} color="#666" style={{ position: 'absolute', top: 2, right: 2 }} />}
          <Crown size={IS_SMALL_SCREEN ? 14 : 16} color={isFilterLocked ? "#444" : (filter === 'master' ? "#BF5AF2" : "#888")} strokeWidth={2.5} />
          <Text style={[styles.premiumFilterCount, filter === 'master' && { color: '#BF5AF2' }, isFilterLocked && { color: '#444' }]}>{masterCount}</Text>
        </TouchableOpacity>

        {/* ?? Favoriler - Tutorial'da kilitli */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, filter === 'favorites' && styles.premiumFilterBtnActive, isFilterLocked && styles.premiumFilterBtnLocked]}
          onPress={() => {
            if (isFilterLocked) return;
            onFilterChange('favorites');
            haptic.light();
          }}
          disabled={isFilterLocked}
        >
          {isFilterLocked && <Lock size={10} color="#666" style={{ position: 'absolute', top: 2, right: 2 }} />}
          <Heart size={IS_SMALL_SCREEN ? 14 : 16} color={isFilterLocked ? "#444" : (filter === 'favorites' ? "#FF2D55" : "#888")} strokeWidth={2.5} fill={filter === 'favorites' ? "#FF2D55" : "transparent"} />
        </TouchableOpacity>

        {/* Kendi Kelimelerim - Tutorial'da kilitli */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, filter === 'custom' && styles.premiumFilterBtnActive, isFilterLocked && styles.premiumFilterBtnLocked]}
          onPress={() => {
            if (isFilterLocked) return;
            onFilterChange('custom');
            haptic.light();
          }}
          disabled={isFilterLocked}
        >
          {isFilterLocked && <Lock size={10} color="#666" style={{ position: 'absolute', top: 2, right: 2 }} />}
          <Text style={{ fontSize: IS_SMALL_SCREEN ? 14 : 16 }}>{'✏️'}</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.premiumFilterDivider} />

        {/* ? Seed Market (only words tab) */}
        {activeTab === 'words' && onPressSeedMarket && (
          <TouchableOpacity
            style={[styles.premiumFilterBtn, isFilterLocked && { opacity: 0.3 }]}
            onPress={() => {
              if (isFilterLocked) {
                haptic.light();
                return;
              }
              onPressSeedMarket();
              haptic.medium();
            }}
            disabled={isFilterLocked}
          >
            <ShoppingCart size={IS_SMALL_SCREEN ? 14 : 16} color="#22c55e" strokeWidth={2.5} />
            {isFilterLocked && <Lock size={8} color="#22c55e" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>
        )}

        {/* ?? Phrasal Menu (only phrasal tab) */}
        {activeTab === 'phrasal' && onPressPhrasalMenu && (
          <TouchableOpacity
            style={[styles.premiumFilterBtn, isFilterLocked && { opacity: 0.3 }]}
            onPress={() => {
              if (isFilterLocked) {
                haptic.light();
                return;
              }
              onPressPhrasalMenu();
              haptic.medium();
            }}
            disabled={isFilterLocked}
          >
            <Sparkles size={IS_SMALL_SCREEN ? 14 : 16} color="#10b981" strokeWidth={2.5} />
            {isFilterLocked && <Lock size={8} color="#10b981" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>
        )}

        {/* ?? Search */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, isFilterLocked && { opacity: 0.3 }]}
          onPress={() => {
            if (isFilterLocked) {
              haptic.light();
              return;
            }
            onPressSearch();
            haptic.light();
          }}
          disabled={isFilterLocked}
        >
          <Search size={IS_SMALL_SCREEN ? 14 : 16} color="#fff" strokeWidth={2.5} />
          {isFilterLocked && <Lock size={8} color="#fff" style={{ position: 'absolute', top: 2, right: 2 }} />}
        </TouchableOpacity>

        {/* s¨ Card Shop */}
        <TouchableOpacity
          style={[styles.premiumFilterBtn, isFilterLocked && { opacity: 0.3 }]}
          onPress={() => {
            if (isFilterLocked) {
              haptic.light();
              return;
            }
            onPressCardShop?.();
            haptic.light();
          }}
          disabled={isFilterLocked}
        >
          <Text style={{ fontSize: IS_SMALL_SCREEN ? 14 : 16 }}>{'\u{1F3A8}'}</Text>
          {isFilterLocked && <Lock size={8} color="#fff" style={{ position: 'absolute', top: 2, right: 2 }} />}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ? Filter Tab Component - OPTIMIZED (no idle loops)
const FilterTab: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
  glowColor?: string;
}> = ({ label, active, onPress, count, glowColor }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ?? NO IDLE LOOPS - Only press animation

  const handlePressIn = () => {
    haptic.light(); // Premium subtle
    Animated.spring(scaleAnim, {
      toValue: 0.94, // Subtle premium
      useNativeDriver: true,
      friction: 6,
      tension: 220,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 180,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          haptic.heavy(); // MEGA haptic
          onPress();
        }}
        activeOpacity={1}
      >
        <View style={styles.filterTabWrapper}>
          {/* ?? STATIC GLOW LAYER - Active only (no animation) */}
          {active && (
            <View
              style={[
                styles.filterGlow,
                {
                  opacity: 0.6,
                  backgroundColor: glowColor || '#34C759',
                },
              ]}
            />
          )}

          <LinearGradient
            colors={
              active
                ? [glowColor || '#34C759', glowColor ? `${glowColor}CC` : '#2ea34a']
                : ['rgba(40, 40, 42, 0.8)', 'rgba(28, 28, 30, 0.8)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.filterTab,
              active && styles.filterTabActive,
            ]}
          >
            {/* ? STATIC SHIMMER HIGHLIGHT - Active tabs only (no animation) */}
            {active && (
              <View style={styles.staticFilterShimmer} />
            )}

            <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
              {label}
            </Text>
            {count !== undefined && count > 0 && (
              <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ?? Main Farm Screen
export function FarmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  // ⚡ Selector bazlı abonelik: coin/xp gibi alakasız store güncellemelerinde
  // tüm FarmScreen'in yeniden render olmasını önler (MiniQuiz kasması için kritik).
  const farm = useFarmStore(state => state.farm);
  const inventory = useFarmStore(state => state.inventory);
  const pool = useFarmStore(state => state.pool);
  const answerMiniQuiz = useFarmStore(state => state.answerMiniQuiz);
  const toggleFavorite = useFarmStore(state => state.toggleFavorite);
  const plantFromInventory = useFarmStore(state => state.plantFromInventory);
  const phrasalVerbFarm = useFarmStore(state => state.phrasalVerbFarm);
  const harvestWord = useFarmStore(state => state.harvestWord);
  const cardCustomization = useFarmStore(state => state.cardCustomization);
  const transferEvent = useFarmStore(state => state.transferEvent);
  const consumeTransferEvent = useFarmStore(state => state.consumeTransferEvent);
  const setStoreFeedVisible = useFarmStore(state => state.setFeedVisible); // Swipe block için
  const activeCardTheme = useFarmStore(state => state.activeCardTheme);
  const ownedCardThemes = useFarmStore(state => state.ownedCardThemes);
  const setActiveCardTheme = useFarmStore(state => state.setActiveCardTheme);
  const updateCardCustomization = useFarmStore(state => state.updateCardCustomization);

  // ⚡ PERFORMANS  FeedCard'a prop olarak geçilecek (hook bypass)
  const feedPerformanceConfig = usePerformanceStore(s => s.config);

  //  GÜNLÜK GÖREVLER
  const checkAndResetDailyQuests = useFarmStore(state => state.checkAndResetDailyQuests);
  const queueQuestProgress = useFarmStore(state => state.queueQuestProgress);

  //  TUTORIAL STATE
  const tutorialStep = useFarmStore(state => state.tutorialStep);
  const tutorialFirstWrongWord = useFarmStore(state => state.tutorialFirstWrongWord);
  const tutorialHighlightedWordId = useFarmStore(state => state.tutorialHighlightedWordId);
  const setTutorialStep = useFarmStore(state => state.setTutorialStep);
  const setTutorialHighlightedWordId = useFarmStore(state => state.setTutorialHighlightedWordId);
  const isTutorialOverlayActive = useFarmStore(state => state.isTutorialOverlayActive);
  const guidedModeActive = useFarmStore(state => state.guidedModeActive);
  const guidedModeStep = useFarmStore(state => state.guidedModeStep);
  const guidedModeTargetWordId = useFarmStore(state => state.guidedModeTargetWordId);
  const guidedModeTargetWordText = useFarmStore(state => state.guidedModeTargetWordText);

  // ?? TAB SYSTEM - Kelimeler | Phrasal | Yapboz
  const [activeTab, setActiveTab] = useState<'words' | 'phrasal' | 'puzzle'>(globalTabState.current);

  const [filter, setFilter] = useState<'all' | 'ready' | 'study' | 'master' | 'favorites' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [guidedFarmTipVisible, setGuidedFarmTipVisible] = useState(true);
  const isGuidedFarmStep = guidedModeActive && guidedModeStep === 'FARM_MASTER_TARGET';
  const guidedTargetWordKey = useMemo(
    () => normalizeDisplayText(guidedModeTargetWordText).toLowerCase(),
    [guidedModeTargetWordText]
  );
  const isGuidedTargetWord = useCallback((word: any) => {
    const safeId = typeof word?.id === 'string' ? word.id.trim() : '';
    if (guidedModeTargetWordId && safeId && safeId === guidedModeTargetWordId) return true;
    const safeWordText = normalizeDisplayText(word?.text || word?.verb).toLowerCase();
    return !!guidedTargetWordKey && !!safeWordText && safeWordText === guidedTargetWordKey;
  }, [guidedModeTargetWordId, guidedTargetWordKey]);
  const guidedTargetLabel = useMemo(
    () => normalizeDisplayText(guidedModeTargetWordText || 'hedef kelime'),
    [guidedModeTargetWordText]
  );
  const gridColumns = cardCustomization?.largeMode ? 1 : cardCustomization?.compactMode ? 3 : 2;
  const isSoilQuickThemeActive = cardCustomization?.backgroundStyle === 'soil' || activeCardTheme === 'soil';
  const handleQuickThemeSwitch = useCallback((mode: 'default' | 'soil') => {
    if (mode === 'soil') {
      updateCardCustomization({ backgroundStyle: 'soil' });
      if (Array.isArray(ownedCardThemes) && ownedCardThemes.includes('soil')) {
        setActiveCardTheme('soil');
      }
      return;
    }
    updateCardCustomization({ backgroundStyle: 'default' });
    setActiveCardTheme('default');
  }, [ownedCardThemes, setActiveCardTheme, updateCardCustomization]);

  //  GÜNLÜK GÖREVLER PANEL
  const [questsPanelVisible, setQuestsPanelVisible] = useState(false);

  // s¨ KART MAAZASI
  const [cardShopVisible, setCardShopVisible] = useState(false);

  // ?? Grid MiniQuiz (standalone)
  const [quizWordId, setQuizWordId] = useState<string | null>(null);

  // ?? Feed - Instagram kefet ak + Quiz Feed
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [feedQuizWordId, setFeedQuizWordId] = useState<string | null>(null);
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);

  // ?? HASAT SONRASI "TEKRAR EK" STATE
  // Hasat edilen kelimeler burada tutulur, "Tekrar Ek" butonu gsterilir
  const [harvestedWordIds, setHarvestedWordIds] = useState<Set<string>>(new Set());

  // ?? Store'dan gncel quizWord' ek
  const quizWord = useMemo(() => {
    if (!quizWordId) return null;
    // ?? FIX: nce AKTF (grnr) kart bul, yoksa herhangi birini al
    return farm.find(w => w.id === quizWordId && !(w as any).normalHarvested) || farm.find(w => w.id === quizWordId) || null;
  }, [quizWordId, farm]);

  const [suspendHeavyEffectsForQuiz, setSuspendHeavyEffectsForQuiz] = useState(false);
  useEffect(() => {
    let suspendTimeout: NodeJS.Timeout | null = null;
    if (quizWordId) {
      suspendTimeout = setTimeout(() => setSuspendHeavyEffectsForQuiz(true), 120);
    } else {
      setSuspendHeavyEffectsForQuiz(false);
    }
    return () => {
      if (suspendTimeout) clearTimeout(suspendTimeout);
    };
  }, [quizWordId]);

  const [lastViewedWordId, setLastViewedWordId] = useState<string | null>(null);
  const [shuffledFeedData, setShuffledFeedData] = useState<any[]>([]);
  const gridListRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lastMeaningSpokenRef = useRef<{ meaning: string; time: number } | null>(null);
  const [activeToast, setActiveToast] = useState<TransferEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedMarketDisabled, setIsSeedMarketDisabled] = useState(false);
  const seedMarketScale = useRef(new Animated.Value(1)).current;
  const seedMarketShimmer = useRef(new Animated.Value(0)).current; // Shimmer for seed market
  const [isTopTabVisible, setIsTopTabVisible] = useState(true);
  const topTabVisibleRef = useRef(true);
  const lastScrollOffsetRef = useRef(0);
  const lastTopTabToggleAtRef = useRef(0);
  const topTabAnim = useRef(new Animated.Value(1)).current;

  // ?? FOCUS EFFECT - Reset seed market guard
  useFocusEffect(
    useCallback(() => {
      setIsSeedMarketDisabled(false);
      return () => { };
    }, [])
  );

  // ? PRELOAD TAB IMAGES - Avoid reload on tab switch
  useEffect(() => {
    Asset.loadAsync([
      TAB_IMAGES.words,
      TAB_IMAGES.phrasal,
      TAB_IMAGES.puzzle,
    ]);
  }, []);

  useEffect(() => {
    // Shimmer animation for seed market button
    const shimmerLoop = Animated.loop(
      Animated.timing(seedMarketShimmer, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );
    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
    };
  }, []);

  const shimmerTranslate = seedMarketShimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const setTopTabVisibility = useCallback((visible: boolean, force = false) => {
    const now = Date.now();
    if (!force && now - lastTopTabToggleAtRef.current < 140) return;
    if (!force && topTabVisibleRef.current === visible) return;

    lastTopTabToggleAtRef.current = now;
    topTabVisibleRef.current = visible;
    setIsTopTabVisible(visible);
    Animated.spring(topTabAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: false,
      damping: 22,
      stiffness: 240,
      mass: 0.45,
      overshootClamping: true,
    }).start();
  }, [topTabAnim]);

  const handleSharedContentOffset = useCallback((offsetY: number) => {
    const y = Number.isFinite(offsetY) ? Math.max(0, offsetY) : 0;
    const prevY = lastScrollOffsetRef.current;
    const delta = y - prevY;

    if (y <= 24) {
      setTopTabVisibility(true);
      lastScrollOffsetRef.current = y;
      return;
    }

    if (y > 140 && delta > 10) {
      setTopTabVisibility(false);
    } else if (delta < -8) {
      setTopTabVisibility(true);
    }

    lastScrollOffsetRef.current = y;
  }, [setTopTabVisibility]);

  const handleFarmContentScroll = useCallback((event: any) => {
    const rawY = Number(event?.nativeEvent?.contentOffset?.y ?? 0);
    const y = Number.isFinite(rawY) ? Math.max(0, rawY) : 0;
    handleSharedContentOffset(y);
  }, [handleSharedContentOffset]);

  const handleEmbeddedTabScroll = useCallback((offsetY: number) => {
    handleSharedContentOffset(offsetY);
  }, [handleSharedContentOffset]);

  useEffect(() => {
    setTopTabVisibility(true, true);
    lastScrollOffsetRef.current = 0;
  }, [activeTab, setTopTabVisibility]);

  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout | null = null;
    // Veri yklenince loading'i kapat - INSTANT
    if (farm && farm.length >= 0) {
      loadingTimeout = setTimeout(() => setIsLoading(false), 50); // 100ms  50ms
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200, // 300ms -> 200ms ultra hizli
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [farm]);

  //  Günlük görevleri kontrol et ve gerekirse yenile
  useEffect(() => {
    checkAndResetDailyQuests();
  }, []); // Sadece ilk mount'da çalş

  //  Route params ile gelen quizWordId'yi işle - Direkt MiniQuiz aç
  useEffect(() => {
    let openQuizTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;
    const params = route.params as { quizWordId?: string; filter?: 'all' | 'ready' | 'study' | 'master' | 'favorites' } | undefined;
    if (params?.quizWordId && farm.length > 0) {
      // Animasyon bittikten sonra quiz'i a
      const interactionTask = InteractionManager.runAfterInteractions(() => {
        if (isCancelled) return;
        const word = farm.find(w => w.id === params.quizWordId);
        if (word) {
          openQuizTimeout = setTimeout(() => {
            if (isCancelled) return;
            setQuizWordId(word.id);
            haptic.medium();
          }, 150);
        }
        // Parametreyi temizle
        navigation.setParams({ quizWordId: undefined } as any);
      });
      return () => {
        isCancelled = true;
        interactionTask.cancel?.();
        if (openQuizTimeout) clearTimeout(openQuizTimeout);
      };
    }
    return () => {
      isCancelled = true;
      if (openQuizTimeout) clearTimeout(openQuizTimeout);
    };
  }, [route.params, farm, navigation, setStoreFeedVisible]);

  // ?? Route params ile gelen filter ve tab'i ile - SADECE params deitiinde
  useEffect(() => {
    const params = route.params as { filter?: 'all' | 'ready' | 'study' | 'master' | 'favorites'; tab?: 'words' | 'phrasal' | 'puzzle'; fromOnboarding?: boolean } | undefined;
    if (params?.filter) {
      setFilter(params.filter);
      // Parametreyi temizle (bir kere uygulandktan sonra)
      navigation.setParams({ filter: undefined } as any);
    }
    if (params?.tab) {
      setActiveTab(params.tab);
      globalTabState.current = params.tab;
      // Parametreyi temizle
      navigation.setParams({ tab: undefined } as any);
    }

    // ?? TUTORIAL: STEP_6 - Krmz kart highlight (veya en dk seviyeli)
    if (tutorialStep === 'STEP_6_FARM_INTRO') {
      // ?? TM KELIMELER filtresine zorla
      if (filter !== 'all') {
        setFilter('all');
      }

      const normalFarmFiltered = farm.filter(w =>
        !(w as any).forPuzzleOnly && !(w as any).normalHarvested
      );

      if (tutorialFirstWrongWord) {
        // lk yanl kelimeyi highlight et (krmz kart)
        setTutorialHighlightedWordId(tutorialFirstWrongWord.id);
      } else if (normalFarmFiltered.length > 0) {
        // En DK wrongCount'lu kelimeyi se (krmz=0, turuncu=1, sar=2, yeil=3)
        const sortedByWrongCount = [...normalFarmFiltered]
          .sort((a, b) => (a.wrongCount || 0) - (b.wrongCount || 0));
        setTutorialHighlightedWordId(sortedByWrongCount[0].id);
      }
    }

    // ?? TUTORIAL: STEP_11'de (hasat bekleme) highlight korunmal ve ready filtresine gemeli
    if (tutorialStep === 'STEP_11_HARVEST' && tutorialHighlightedWordId) {
      // Ready filtresine zorla
      if (filter !== 'ready') {
        setFilter('ready');
      }
    }

    // ?? TUTORIAL: STEP_14'te Envanter'den geldiyse kart highlight et - dialog gsterilecek
    if (tutorialStep === 'STEP_14_REPLANT') {
      // ?? TM KELIMELER filtresine zorla - kelime kaybolmasn
      if (filter !== 'all') {
        setFilter('all');
      }
      // Kart highlight et - kullanc grsn
      if (tutorialFirstWrongWord) {
        setTutorialHighlightedWordId(tutorialFirstWrongWord.id);
      }
      // Dialog gsterilecek (fullScreen: true), kullanc "Anladm" deyince Home'a gidecek
    }

    // ?? TUTORIAL: STEP_19'da (Final Quiz) highlight kelimesini ayarla
    if (tutorialStep === 'STEP_19_FINAL_QUIZ' && tutorialFirstWrongWord) {
      // ?? TM KELIMELER filtresine zorla - kelime kaybolmasn
      if (filter !== 'all') {
        setFilter('all');
      }
      // Quiz iin kelimeyi hazrla
      if (tutorialHighlightedWordId !== tutorialFirstWrongWord.id) {
        setTutorialHighlightedWordId(tutorialFirstWrongWord.id);
      }
    }
  }, [route.params, navigation, tutorialStep, tutorialFirstWrongWord, setTutorialHighlightedWordId, tutorialHighlightedWordId, filter]);

  useEffect(() => {
    if (isGuidedFarmStep) {
      setGuidedFarmTipVisible(true);
    }
  }, [isGuidedFarmStep, guidedModeTargetWordId]);

  useEffect(() => {
    if (!isGuidedFarmStep) return;
    if (activeTab !== 'words') {
      setActiveTab('words');
      globalTabState.current = 'words';
    }
    if (filter !== 'all') setFilter('all');
    if (searchVisible) {
      setSearchVisible(false);
      setSearchQuery('');
    }
    if (feedVisible) {
      setFeedVisible(false);
      setStoreFeedVisible(false);
      setFeedQuizWordId(null);
    }
    if (quizWordId) setQuizWordId(null);
  }, [isGuidedFarmStep, activeTab, filter, searchVisible, feedVisible, quizWordId, setStoreFeedVisible]);

  useEffect(() => {
    if (transferEvent?.type === 'harvest') {
      // Feed açkken TransferToast gösterme  Feed kendi RewardToast'n gösteriyor
      if (!feedVisible) {
        setActiveToast(transferEvent);
      }
      // requestAnimationFrame ile ertele  ayn render cycle'da çift set() crash'i önle
      requestAnimationFrame(() => {
        consumeTransferEvent();
      });
    }
  }, [transferEvent, consumeTransferEvent, feedVisible]);

  const filteredWords = useMemo(() => {
    if (!farm) return [];

    // ?? Normal tarla filtresi:
    // - forPuzzleOnly olanlar gsterme (yapboz envanterinden gelmi)
    // - normalHarvested olanlar gsterme (normal tarladan hasat edilmi, ama yapboz iin farm'da)
    const normalFarm = farm.filter(w =>
      !(w as any).forPuzzleOnly &&
      !(w as any).normalHarvested
    );

    let result: any[];
    switch (filter) {
      case 'ready':
        // Hasat: Sadece yeşil (wrongCount >= 2, masterLevel = 0) ve master kartlar (masterLevel > 0)
        result = normalFarm.filter(w => (w.wrongCount >= 2 && w.masterLevel === 0) || w.masterLevel > 0);

        // ?? TUTORIAL FIX: Eer tutorial srasnda kart yeilden derse bile listede kalsn
        if (tutorialStep === 'STEP_11_HARVEST' && tutorialHighlightedWordId) {
          const tutorialWord = normalFarm.find(w => w.id === tutorialHighlightedWordId);
          // Eer kelime listede yoksa ve normalFarm'da varsa ekle
          if (tutorialWord && !result.find(w => w.id === tutorialHighlightedWordId)) {
            result = [tutorialWord, ...result];
          }
        }
        break;
      case 'study':
        // almalym: Sadece krmz/sar/turuncu (wrongCount < 3, masterLevel = 0)
        result = normalFarm.filter(w => w.wrongCount < 3 && w.masterLevel === 0);
        break;
      case 'master':
        result = normalFarm.filter(w => w.masterLevel > 0);
        break;
      case 'favorites':
        // FAVORLER: En son eklenen en stte (favoriteAddedAt timestamp'e gre LIFO)
        result = normalFarm.filter(w => w.isFavorite === true)
          .sort((a, b) => (b.favoriteAddedAt || 0) - (a.favoriteAddedAt || 0));
        return result; // Favorilerde ek sralama yapma
      case 'custom':
        //  Kendi oluşturduun kelimeler
        result = normalFarm.filter(w => (w as any).isCustom === true);
        break;
      default:
        result = [...normalFarm];
    }

    // ?? Smart search with score-based ranking
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      // Filter & score
      const scored = result
        .map(w => {
          const text = w.text.toLowerCase();
          const meaning = w.meaning.toLowerCase();

          let score = 0;

          // Exact match (highest priority)
          if (text === query || meaning === query) score = 100;
          // Starts with query
          else if (text.startsWith(query)) score = 50;
          else if (meaning.startsWith(query)) score = 40;
          // Contains query
          else if (text.includes(query)) score = 30;
          else if (meaning.includes(query)) score = 20;

          return { word: w, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ word }) => word);

      return scored;
    }

    // ?? SIRALAMA ALGORTMASI:
    // 1. Favoriler her zaman en stte (FIFO - ilk eklenen favori en stte)
    // 2. Non-favoriler: Quiz, tohum, envanter, coin pazarndan yeni gelenler EN BATA (lastPlantedAt'e gre)

    // ? FAVORLER - favoriteAddedAt'e gre FIFO sralama (ilk eklenen stte)
    const favorites = result.filter(w => w.isFavorite)
      .sort((a, b) => (a.favoriteAddedAt || 0) - (b.favoriteAddedAt || 0));

    // ?? DER KELMELER - lastPlantedAt'e gre (en yeni stte)
    // Quiz sonucu lastPlantedAt deimez, sadece tarlaya eklenme annda gncellenir
    const nonFavorites = result.filter(w => !w.isFavorite)
      .sort((a, b) => {
        const aPlanted = a.lastPlantedAt || 0;
        const bPlanted = b.lastPlantedAt || 0;
        if (aPlanted !== bPlanted) return bPlanted - aPlanted;
        return a.id.localeCompare(b.id);
      });

    return [...favorites, ...nonFavorites];
  }, [farm, filter, searchQuery, tutorialStep, tutorialHighlightedWordId]);

  // ?? Normal tarla iin forPuzzleOnly olanlar kar
  const normalFarmForStats = useMemo(() => {
    return farm?.filter(w =>
      !(w as any).forPuzzleOnly &&
      !(w as any).normalHarvested
    ) || [];
  }, [farm]);

  const stats = useMemo(() => ({
    total: normalFarmForStats.length,
    ready: normalFarmForStats.filter(w => (w.wrongCount >= 2 && w.masterLevel === 0) || w.masterLevel > 0).length,
    study: normalFarmForStats.filter(w => w.wrongCount < 3 && w.masterLevel === 0).length,
    master: normalFarmForStats.filter(w => w.masterLevel > 0).length,
    favorites: normalFarmForStats.filter(w => w.isFavorite === true).length,
  }), [normalFarmForStats]);

  // ?? Phrasal iin de forPuzzleOnly ve normalHarvested kontrol
  const normalPhrasalFarmForStats = useMemo(() => {
    return phrasalVerbFarm?.filter(w =>
      !(w as any).forPuzzleOnly &&
      !(w as any).normalHarvested
    ) || [];
  }, [phrasalVerbFarm]);

  // ?? Phrasal Verb Stats - PhrasalVerbFarmScreenNew ile birebir ayn
  const phrasalStats = useMemo(() => ({
    total: normalPhrasalFarmForStats.length,
    ready: normalPhrasalFarmForStats.filter(w => ((w.wrongCount || 0) >= 2 && (w.masterLevel || 0) === 0) || (w.masterLevel || 0) > 0).length,
    study: normalPhrasalFarmForStats.filter(w => (w.wrongCount || 0) < 3 && (w.masterLevel || 0) === 0).length,
    master: normalPhrasalFarmForStats.filter(w => (w.masterLevel || 0) > 0).length,
    favorites: normalPhrasalFarmForStats.filter(w => w.isFavorite === true).length,
  }), [normalPhrasalFarmForStats]);

  // ?? Puzzle Stats - usePuzzleStats hook'undan
  const puzzleStats = usePuzzleStats();

  const handleWordPress = useCallback((word: any) => {
    if (isGuidedFarmStep) {
      haptic.light();
      return;
    }
    if (tutorialStep && tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED') {
      return;
    }

    haptic.medium();
    const clickedWord = word;
    const otherWords = filteredWords.filter(w => w.id !== word.id);
    const shuffledOthers = [...otherWords];
    for (let i = shuffledOthers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
    }

    const feedDataWithClickedFirst = [clickedWord, ...shuffledOthers];
    setShuffledFeedData(feedDataWithClickedFirst);
    feedWordsRef.current = feedDataWithClickedFirst;
    setFeedStartIndex(0);
    setFeedVisible(true);
    setStoreFeedVisible(true);
  }, [filteredWords, isGuidedFarmStep, setStoreFeedVisible, tutorialStep]);

  const handleCloseFeed = useCallback(() => {
    haptic.light();
    setFeedVisible(false);
    setStoreFeedVisible(false); // Store'a bildir - swipe enable
    setFeedQuizWordId(null);

    // Scroll grid to last viewed word
    if (lastViewedWordId && gridListRef.current) {
      const wordIndex = filteredWords.findIndex(w => w.id === lastViewedWordId);
      if (wordIndex >= 0) {
        setTimeout(() => {
          gridListRef.current?.scrollToIndex({
            index: wordIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }, 300);
      }
    }
  }, [lastViewedWordId, filteredWords]);

  const handleFeedQuizStart = useCallback((wordId: string) => {
    haptic.medium();
    setFeedQuizWordId(wordId);
  }, []);

  const handleToggleFavorite = useCallback((wordId: string) => {
    haptic.medium();
    toggleFavorite(wordId);
  }, [toggleFavorite]);

  const handleSwipeStateChange = useCallback((isSwiping: boolean) => {
    setFeedScrollEnabled(!isSwiping);
  }, []);

  const handleFeedQuizAnswer = useCallback((correct: boolean, count?: number) => {
    if (!feedQuizWordId) return;

    // ?? NCE quiz'i kapat - store gncellemesinden NCE
    // Bu sayede store gncellemeFlatList'i re-render ettiinde isQuizActive zaten false olur
    const wordIdToAnswer = feedQuizWordId;
    setFeedQuizWordId(null);

    // Sonra quiz cevabn ile
    answerMiniQuiz(wordIdToAnswer, correct, count || 1);
    haptic.light();
  }, [feedQuizWordId, answerMiniQuiz]);

  const currentFeedIndexRef = useRef(0);

  const feedWordsRef = useRef<any[]>([]);

  // ?? Feed'de kart deitiinde MiniQuiz de otomatik gesin
  const handleFeedViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== currentFeedIndexRef.current) {
        currentFeedIndexRef.current = newIndex;
        haptic.medium();

        // ?? Quiz akken kart deiirse, yeni kartn quiz'ini a
        const viewedWord = feedWordsRef.current[newIndex];
        if (viewedWord && feedQuizWordId) {
          // Quiz zaten aksa, yeni karta geince de quiz ak kalsn
          setFeedQuizWordId(viewedWord.id);
        }
      }
      // Track last viewed word
      const viewedWord = feedWordsRef.current[newIndex];
      if (viewedWord) {
        setLastViewedWordId(viewedWord.id);
      }
    }
  }, [feedQuizWordId]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // ?? Grid'den quiz'e tklandnda SADECE MiniQuiz a (Feed almaz)
  const handleQuizPress = useCallback((word: any) => {
    if (isGuidedFarmStep && !isGuidedTargetWord(word)) {
      haptic.light();
      return;
    }
    haptic.medium();
    setQuizWordId(word.id);
  }, [isGuidedFarmStep, isGuidedTargetWord]);

  // ?? Grid MiniQuiz cevap handler
  const handleQuizAnswer = useCallback((correct: boolean, count?: number, wordId?: string) => {
    // Cevabi kaydet  TTS onClose'da speakFirstMeaning ile yapiliyor
    const targetWordId = wordId || quizWordId;
    if (targetWordId) {
      answerMiniQuiz(targetWordId, correct, count || 1);
    }
    setQuizWordId(null);
  }, [quizWordId, answerMiniQuiz]);

  const speakFirstMeaning = useCallback((meaning?: string) => {
    const firstMeaning = getFirstMeaning(meaning || '');
    if (!firstMeaning) return;
    const now = Date.now();
    const last = lastMeaningSpokenRef.current;
    if (last && last.meaning === firstMeaning && now - last.time < 1000) return;
    lastMeaningSpokenRef.current = { meaning: firstMeaning, time: now };
    sound.speakWord(firstMeaning, 'tr-TR');
  }, []);

  // ⚡ Feed callback'leri  renderItem dşnda tanml, MemoFeedCard re-render' önler
  const handleFeedQuizClose = useCallback((wordId: string) => {
    haptic.light();
    // Store'dan güncel meaning al (closure stale olmasn)
    const state = useFarmStore.getState();
    const w = state.farm.find((f: any) => f.id === wordId) || state.inventory.find((f: any) => f.id === wordId);
    speakFirstMeaning(w?.meaning);
    setFeedQuizWordId(null);
  }, [speakFirstMeaning]);

  const handleFeedPlant = useCallback((wordId: string) => {
    haptic.heavy();
    sound.playPlant();
    plantFromInventory(wordId);
    queueQuestProgress('PLANT_WORDS', 1, 'add');
    const inv = useFarmStore.getState().inventory;
    const invWord = inv.find((w: any) => w.id === wordId || (w as any).originalWordId === wordId);
    speakFirstMeaning(invWord?.meaning);
  }, [plantFromInventory, queueQuestProgress, speakFirstMeaning]);

  const handleFeedHarvest = useCallback((wordId: string) => {
    try {
      traceEvent('farm_feed_harvest_start', { wordId });
      const result = harvestWord(wordId);
      if (!result?.success) {
        traceEvent('farm_feed_harvest_skip', { wordId, reason: 'not_success' }, 'warn');
        return;
      }

      const safeCoins = Number.isFinite(result.coins) ? Math.max(0, Math.floor(result.coins)) : 0;
      const safeXp = Number.isFinite(result.xp) ? Math.max(0, Math.floor(result.xp)) : 0;

      const state = useFarmStore.getState();
      const w = state.inventory.find((f: any) => f.id === wordId || (f as any).originalWordId === wordId);
      speakFirstMeaning(w?.meaning);

      setTimeout(() => {
        try {
          if (safeCoins > 0) {
            showRewardToast('coin', safeCoins, 'Envantere gönderildi!');
          } else if (safeXp > 0) {
            showRewardToast('xp', safeXp, 'Envantere gönderildi!');
          } else {
            showRewardToast('harvest', 0, 'Envantere gönderildi!');
          }
        } catch (toastError) {
          traceEvent('farm_feed_harvest_toast_error', { wordId, error: String(toastError) }, 'error');
        }
      }, 100);

      setHarvestedWordIds(prev => new Set(prev).add(wordId));
      if (tutorialStep === 'STEP_10_TO_GREEN' || tutorialStep === 'STEP_11_HARVEST') {
        setTimeout(() => setTutorialStep('STEP_12_INVENTORY'), 500);
      }
      traceEvent('farm_feed_harvest_success', { wordId, coins: safeCoins, xp: safeXp });
    } catch (error) {
      traceEvent('farm_feed_harvest_error', { wordId, error: String(error) }, 'error');
      console.error('[FarmScreen] handleFeedHarvest failed:', error);
    }
  }, [harvestWord, speakFirstMeaning, tutorialStep, setTutorialStep]);

  const handleFeedReplant = useCallback((wordId: string) => {
    const currentInventory = useFarmStore.getState().inventory;
    const invWord = currentInventory.find((w: any) =>
      w.originalWordId === wordId || w.id === wordId || w.id.startsWith(`${wordId}-inv-`)
    );
    if (invWord) {
      if (haptic.plantToFarm) { haptic.plantToFarm(); } else { haptic.heavy(); }
      sound.playPlant?.();
      plantFromInventory(invWord.id);
      speakFirstMeaning(invWord.meaning);
      setHarvestedWordIds(prev => { const s = new Set(prev); s.delete(wordId); return s; });
    } else {
      setTimeout(() => {
        const latest = useFarmStore.getState().inventory;
        const retry = latest.find((w: any) => w.originalWordId === wordId || w.id.startsWith(`${wordId}-inv-`));
        if (retry) {
          if (haptic.plantToFarm) { haptic.plantToFarm(); } else { haptic.heavy(); }
          sound.playPlant?.();
          plantFromInventory(retry.id);
          speakFirstMeaning(retry.meaning);
          setHarvestedWordIds(prev => { const s = new Set(prev); s.delete(wordId); return s; });
        }
      }, 100);
    }
  }, [plantFromInventory, speakFirstMeaning]);

  // ⚡ Feed word lookup Map  O(1) erişim, renderItem'da find() yaplmaz
  const feedWordMap = useMemo(() => {
    const map = new Map<string, { word: any; isInInventory: boolean }>();
    if (!shuffledFeedData) return map;
    for (const item of shuffledFeedData) {
      let farmWord: any = farm.find(w => w.id === item.id && !(w as any).normalHarvested)
        || farm.find(w => w.id === item.id)
        || farm.find(w => ((w as any).originalWordId === item.id || w.id === (item as any).originalWordId) && !(w as any).normalHarvested)
        || farm.find(w => (w as any).originalWordId === item.id || w.id === (item as any).originalWordId);
      const inventoryWord = inventory.find(w => w.id === item.id || (w as any).originalWordId === item.id);
      map.set(item.id, {
        word: farmWord || inventoryWord || item,
        isInInventory: !farmWord && !!inventoryWord,
      });
    }
    return map;
  }, [shuffledFeedData, farm, inventory]);

  // ⚡ Stabilized extraData  yeni array her render'da oluşmasn
  const feedExtraData = useMemo(
    () => [feedQuizWordId, harvestedWordIds.size, farm.length, inventory.length],
    [feedQuizWordId, harvestedWordIds.size, farm.length, inventory.length]
  );

  // ?? Swipe ile hasat handler
  const handleSwipeHarvest = useCallback((item: any) => {
    if (isGuidedFarmStep && !isGuidedTargetWord(item)) {
      haptic.light();
      return;
    }
    if (item.isHarvestReady) {
      haptic.harvestCelebration();
      sound.playEpicHarvest?.();
      harvestWord?.(item.id);
      speakFirstMeaning(item.meaning);

      // ?? TUTORIAL: Hasat edilince STEP_12'ye ge (envantere ynlendir)
      if (tutorialStep === 'STEP_10_TO_GREEN' || tutorialStep === 'STEP_11_HARVEST') {
        setTimeout(() => setTutorialStep('STEP_12_INVENTORY'), 500);
      }
    }
  }, [harvestWord, tutorialStep, setTutorialStep, speakFirstMeaning, isGuidedFarmStep, isGuidedTargetWord]);

  // STEP_16 CloudTip - "Anladim" butonu handler
  const handleCloudTipContinue = useCallback(() => {
    setTutorialStep('STEP_15_MASTER_GRIND');
  }, [setTutorialStep]);

  // ?? TUTORIAL: Aktif tutorial step'leri - dier kartlar kilitli
  // Tutorial tamamlanmadan TM kartlar kilitli (sadece highlight edilen hari)
  const isTutorialCardLockActive = useMemo(() => {
    // Tutorial tamamlandysa kilit yok
    if (tutorialStep === 'COMPLETED' || tutorialStep === 'NOT_STARTED') {
      return false;
    }
    // Tutorial devam ediyorsa tm kartlar kilitli (highlight hari)
    return true;
  }, [tutorialStep]);

  // ?? Memoized renderItem for FlashList performance
  const renderWordCard = useCallback(({ item, index }: { item: any; index: number }) => {
    // ?? TUTORIAL: Sadece highlight edilen kart aktif, dierleri kilitli
    const tutorialHighlighted = tutorialHighlightedWordId === item.id;
    const guidedHighlighted = isGuidedFarmStep && isGuidedTargetWord(item);
    const isHighlighted = tutorialHighlighted || guidedHighlighted;
    const tutorialLocked = isTutorialCardLockActive && !tutorialHighlighted;
    const guidedLocked = isGuidedFarmStep && !guidedHighlighted;
    const isLocked = tutorialLocked || guidedLocked;

    return (
      <GridSwipeWrapper
        disabled={!!quizWordId || !!feedVisible || isLocked}
        onSwipeRight={() => item.isHarvestReady ? handleSwipeHarvest(item) : handleQuizPress(item)}
      >
        <View style={isLocked ? { opacity: 0.4 } : undefined}>
          <UltimateWordCard
            word={item}
            onPress={() => !isLocked && handleWordPress(item)}
            onQuizPress={() => !isLocked && handleQuizPress(item)}
            index={index}
            suspendHeavyEffects={suspendHeavyEffectsForQuiz}
            isHighlighted={isHighlighted}
          />
        </View>
      </GridSwipeWrapper>
    );
  }, [handleWordPress, handleQuizPress, handleSwipeHarvest, feedVisible, tutorialHighlightedWordId, isTutorialCardLockActive, isGuidedFarmStep, isGuidedTargetWord, suspendHeavyEffectsForQuiz]);

  // ?? Memoized keyExtractor
  const keyExtractor = useCallback((item: any, index?: number) => {
    const safeId = typeof item?.id === 'string' ? item.id.trim() : '';
    if (safeId) return safeId;
    const safeOriginalId = typeof item?.originalWordId === 'string' ? item.originalWordId.trim() : '';
    if (safeOriginalId) return `${safeOriginalId}-${index ?? 0}`;
    const safeText = typeof item?.text === 'string' ? item.text.trim() : 'word';
    return `${safeText}-${index ?? 0}`;
  }, []);

  const handleOpenStore = useCallback(() => {
    (navigation as any).navigate('Store');
  }, [navigation]);

  const handleOpenFarmSearch = useCallback(() => {
    setSearchVisible(true);
  }, []);

  // Phrasal search iin state
  const [phrasalSearchVisible, setPhrasalSearchVisible] = useState(false);

  // Puzzle search iin state
  const [puzzleSearchVisible, setPuzzleSearchVisible] = useState(false);

  useEffect(() => {
    if (!isGuidedFarmStep) return;
    if (phrasalSearchVisible) setPhrasalSearchVisible(false);
    if (puzzleSearchVisible) setPuzzleSearchVisible(false);
    if (cardShopVisible) setCardShopVisible(false);
  }, [isGuidedFarmStep, phrasalSearchVisible, puzzleSearchVisible, cardShopVisible]);

  const handleOpenPhrasalSearch = useCallback(() => {
    setPhrasalSearchVisible(true);
  }, []);

  const handleOpenPuzzleSearch = useCallback(() => {
    setPuzzleSearchVisible(true);
  }, []);

  // ?? Tab'a gre search handler se
  const getCurrentSearchHandler = useCallback(() => {
    if (activeTab === 'words') return handleOpenFarmSearch;
    if (activeTab === 'phrasal') return handleOpenPhrasalSearch;
    return handleOpenPuzzleSearch;
  }, [activeTab, handleOpenFarmSearch, handleOpenPhrasalSearch, handleOpenPuzzleSearch]);

  // ?? Tab'a gre stats se
  const getCurrentStats = useCallback(() => {
    if (activeTab === 'words') return stats;
    if (activeTab === 'phrasal') return phrasalStats;
    return puzzleStats;
  }, [activeTab, stats, phrasalStats, puzzleStats]);
  const embeddedFilter = filter === 'custom' ? 'all' : filter;

  const isSegmentLocked = tutorialStep !== 'COMPLETED' || isGuidedFarmStep;

  return (
    <View style={styles.container}>
      {/* Animated background gradient */}
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundAlt, COLORS.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Stats Header - Premium Filter Bar - TM TABLAR N */}
      <StatsHeader
        totalWords={getCurrentStats().total}
        harvestReady={getCurrentStats().ready}
        studyCount={getCurrentStats().study}
        masterCount={getCurrentStats().master}
        onPressSearch={getCurrentSearchHandler()}
        onPressSeedMarket={() => (navigation as any).navigate('SeedMarket')}
        onPressPhrasalMenu={() => (navigation as any).navigate('PhrasalVerbsMenu')}
        onPressCardShop={() => setCardShopVisible(true)}
        activeTab={activeTab}
        filter={filter}
        onFilterChange={setFilter}
        tutorialStep={tutorialStep}
        guidedLocked={isGuidedFarmStep}
      />

      {/*  APPLE SEGMENT CONTROL - Premium Tab Bar */}
      <Animated.View
        style={[
          styles.topTabsAnimatedContainer,
          {
            opacity: topTabAnim,
            maxHeight: topTabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 180],
            }),
            transform: [
              {
                translateY: topTabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 0],
                }),
              },
            ],
            marginBottom: topTabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 8],
            }),
          },
        ]}
        pointerEvents={isTopTabVisible ? 'auto' : 'none'}
      >
      <View style={styles.segmentContainer}>
        <View style={styles.segmentTrack}>
          {/*  Kelimeler Tab */}
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'words' && styles.segmentTabActive]}
            onPress={() => { setActiveTab('words'); globalTabState.current = 'words'; setSearchVisible(false); setPhrasalSearchVisible(false); setPuzzleSearchVisible(false); haptic.selection(); sound.playTap(); }}
            activeOpacity={0.8}
          >
            {activeTab === 'words' && (
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentActiveBackground}
              />
            )}
            <Sprout size={IS_SMALL_SCREEN ? 18 : 20} color={activeTab === 'words' ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth={2.5} />
            <Text style={[styles.segmentLabel, activeTab === 'words' && styles.segmentLabelActive]}>Kelimeler</Text>
          </TouchableOpacity>

          {/* s Phrasal Tab */}
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'phrasal' && styles.segmentTabActive, isSegmentLocked && styles.segmentTabLocked]}
            onPress={() => {
              if (isSegmentLocked) { haptic.light(); return; }
              setActiveTab('phrasal'); globalTabState.current = 'phrasal'; setSearchVisible(false); setPhrasalSearchVisible(false); setPuzzleSearchVisible(false); haptic.selection(); sound.playTap();
            }}
            disabled={isSegmentLocked}
            activeOpacity={0.8}
          >
            {activeTab === 'phrasal' && !isSegmentLocked && (
              <LinearGradient
                colors={['#ec4899', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentActiveBackground}
              />
            )}
            <Link2 size={IS_SMALL_SCREEN ? 18 : 20} color={activeTab === 'phrasal' ? '#fff' : isSegmentLocked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)'} strokeWidth={2.5} />
            <Text style={[styles.segmentLabel, activeTab === 'phrasal' && styles.segmentLabelActive, isSegmentLocked && { opacity: 0.35 }]}>Phrasal</Text>
            {isSegmentLocked && <View style={styles.segmentLockIcon}><Lock size={10} color="rgba(255,255,255,0.5)" /></View>}
          </TouchableOpacity>

          {/* sc© Yapboz Tab */}
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'puzzle' && styles.segmentTabActive, isSegmentLocked && styles.segmentTabLocked]}
            onPress={() => {
              if (isSegmentLocked) { haptic.light(); return; }
              setActiveTab('puzzle'); globalTabState.current = 'puzzle'; setSearchVisible(false); setPhrasalSearchVisible(false); setPuzzleSearchVisible(false); haptic.selection(); sound.playTap();
            }}
            disabled={isSegmentLocked}
            activeOpacity={0.8}
          >
            {activeTab === 'puzzle' && !isSegmentLocked && (
              <LinearGradient
                colors={['#f97316', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentActiveBackground}
              />
            )}
            <Puzzle size={IS_SMALL_SCREEN ? 18 : 20} color={activeTab === 'puzzle' ? '#fff' : isSegmentLocked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)'} strokeWidth={2.5} />
            <Text style={[styles.segmentLabel, activeTab === 'puzzle' && styles.segmentLabelActive, isSegmentLocked && { opacity: 0.35 }]}>Yapboz</Text>
            {isSegmentLocked && <View style={styles.segmentLockIcon}><Lock size={10} color="rgba(255,255,255,0.5)" /></View>}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.quickThemeRow}>
        <TouchableOpacity
          style={[
            styles.quickThemeChip,
            !isSoilQuickThemeActive && styles.quickThemeChipActive,
            isGuidedFarmStep && { opacity: 0.45 },
          ]}
          activeOpacity={isGuidedFarmStep ? 1 : 0.85}
          disabled={isGuidedFarmStep}
          onPress={() => {
            if (isGuidedFarmStep) {
              haptic.light();
              return;
            }
            haptic.selection();
            sound.playTap();
            handleQuickThemeSwitch('default');
          }}
        >
          <Text
            style={[
              styles.quickThemeChipText,
              !isSoilQuickThemeActive && styles.quickThemeChipTextActive,
            ]}
          >
            Varsayilan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickThemeChip,
            isSoilQuickThemeActive && styles.quickThemeChipActive,
            isSoilQuickThemeActive && styles.quickThemeChipActiveSoil,
            isGuidedFarmStep && { opacity: 0.45 },
          ]}
          activeOpacity={isGuidedFarmStep ? 1 : 0.85}
          disabled={isGuidedFarmStep}
          onPress={() => {
            if (isGuidedFarmStep) {
              haptic.light();
              return;
            }
            haptic.selection();
            sound.playTap();
            handleQuickThemeSwitch('soil');
          }}
        >
          <Text
            style={[
              styles.quickThemeChipText,
              isSoilQuickThemeActive && styles.quickThemeChipTextActive,
            ]}
          >
            Toprak
          </Text>
        </TouchableOpacity>
      </View>
      </Animated.View>

      {/* ?? TAB CONTENT */}
      {activeTab === 'words' ? (
        <>
          {/* ?? Inline Search - Filter'larn stnde ayr satr */}
          {searchVisible && (
            <View style={styles.searchBarContainer}>
              <View style={styles.inlineSearchWrapper}>
                <Search size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inlineSearchInput}
                  placeholder="Kelime ara..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  selectionColor={COLORS.accent}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.inlineSearchClear}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={styles.inlineSearchClearIcon}>?</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.inlineSearchClose}
                  onPress={() => {
                    setSearchVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.inlineSearchCloseIcon}>?</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Cards Grid - Optimized FlatList for 1000+ items */}
          <Animated.View style={[styles.scrollContainer, { opacity: fadeAnim }]}>
            {isLoading ? (
              <SkeletonCardGrid count={8} />
            ) : filteredWords.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={filter === 'custom' ? ['rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.05)', 'transparent'] : ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)', 'transparent']}
                  style={styles.emptyGlow}
                />
                <View style={styles.emptyIconContainer}>
                  <LinearGradient
                    colors={filter === 'custom' ? ['rgba(168, 85, 247, 0.3)', 'rgba(168, 85, 247, 0.1)'] : ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.1)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  {filter === 'custom' ? (
                    <Text style={{ fontSize: 48 }}>{'✏️'}</Text>
                  ) : (
                    <Sprout size={56} color="#22c55e" />
                  )}
                </View>
                <Text style={styles.emptyTitle}>
                  {filter === 'custom'
                    ? '✏️ Kendi Kelime Kartın Yok'
                    : farm.length === 0
                      ? '🌱 Tarlana Kelime Ekle!'
                      : '🔍 Kelime Bulunamadı'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {filter === 'custom'
                    ? 'Kendi kelime kartını oluşturarak özel kelimeler ekleyebilirsin!'
                    : farm.length === 0
                    ? 'Quiz çözerek kelime ekleyebilirsin.\nYanlış bile olsa buraya ekilir!'
                    : 'Bu filtrede kelime yok. Farklı bir kategori dene!'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyQuizButton}
                  onPress={() => filter === 'custom' ? (navigation as any).navigate('CustomWordCard') : (navigation as any).navigate('Quiz')}
                >
                  <LinearGradient
                    colors={filter === 'custom' ? ['#a855f7', '#9333ea', '#7e22ce'] : ['#22c55e', '#16a34a', '#15803d']}
                    style={styles.emptyQuizButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.emptyQuizButtonText}>
                      {filter === 'custom' ? '✏️ Kelime Kartı Oluştur' : '🎯 Quiz Çöz'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <FlashList
                ref={gridListRef}
                data={filteredWords}
                keyExtractor={keyExtractor}
                numColumns={gridColumns}
                key={`farm-grid-${gridColumns}`}
                renderItem={renderWordCard}
                contentContainerStyle={styles.flashListContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleFarmContentScroll}
                drawDistance={250}
                removeClippedSubviews={true}
              />
            )}
          </Animated.View>

          {/*  Feed Modal - Instagram keşfet akş */}
          <Modal
            visible={feedVisible}
            transparent
            animationType="fade"
            onRequestClose={handleCloseFeed}
          >
            <View style={styles.feedContainer}>
              {/* ?? Feed iinde XP/Coin Toast gster */}
              <RewardToastContainer />

              <TouchableOpacity
                style={styles.feedCloseBtn}
                activeOpacity={0.7}
                onPress={() => {
                  haptic.light();
                  handleCloseFeed();
                }}
              >
                <X size={28} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>

              <FlatList
                data={shuffledFeedData}
                renderItem={({ item }) => {
                  const isQuizActive = feedQuizWordId === item.id;
                  // ⚡ feedWordMap ile O(1) lookup  renderItem'da find() yok
                  const lookup = feedWordMap.get(item.id);
                  const currentWord = lookup?.word || item;
                  const isInInventory = lookup?.isInInventory || false;

                  return (
                    <View style={[styles.feedItem, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }]}>
                      <MemoFeedCard
                        word={currentWord}
                        isQuizActive={isQuizActive}
                        isInInventory={isInInventory}
                        onQuizStart={handleFeedQuizStart}
                        onQuizAnswer={handleFeedQuizAnswer}
                        onQuizClose={handleFeedQuizClose}
                        onToggleFavorite={handleToggleFavorite}
                        onSwipeStateChange={handleSwipeStateChange}
                        onPlantToFarm={handleFeedPlant}
                        onHarvest={handleFeedHarvest}
                        onReplant={handleFeedReplant}
                        justHarvested={harvestedWordIds.has(item.id)}
                        pool={pool || []}
                        isTutorialBlocking={isTutorialFullScreenActive(tutorialStep as any) || isTutorialOverlayActive}
                        performanceConfig={feedPerformanceConfig}
                        screenWidth={SCREEN_WIDTH}
                        screenHeight={SCREEN_HEIGHT}
                      />
                    </View>
                  );
                }}
                keyExtractor={(item) => item.id}
                pagingEnabled
                snapToInterval={SCREEN_HEIGHT}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                scrollEnabled={feedScrollEnabled}
                initialScrollIndex={feedStartIndex}
                getItemLayout={(data, index) => ({
                  length: SCREEN_HEIGHT,
                  offset: SCREEN_HEIGHT * index,
                  index,
                })}
                onViewableItemsChanged={handleFeedViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                extraData={feedExtraData}
                windowSize={3}
                removeClippedSubviews={true}
              />
            </View>
          </Modal>

          {/*  Grid MiniQuiz Dialog (standalone - Feed dşnda) */}
          {quizWord && (
            <MiniQuizDialog
              key={quizWord.id}
              word={quizWord}
              allWords={pool || []}
              onAnswer={handleQuizAnswer}
              onClose={() => {
                //  MiniQuiz kapanrken Türkçe anlamn seslendir (hasat ile birebir ayn)
                speakFirstMeaning(quizWord?.meaning);
                setQuizWordId(null);
              }}
            />
          )}

          {/* ?? TUTORIAL FINAL QUIZ PREMIUM - STEP_19'da gster */}
          <TutorialFinalQuizPremium
            visible={tutorialStep === 'STEP_19_FINAL_QUIZ'}
            onComplete={() => {
              // Final quiz tamamland, celebration step'e geilecek
            }}
          />
        </>
      ) : activeTab === 'phrasal' ? (
        /* ?? PHRASAL TAB CONTENT */
        <PhrasalVerbFarmScreen
          embedded={true}
          initialFilter={embeddedFilter}
          externalSearchVisible={phrasalSearchVisible}
          setExternalSearchVisible={setPhrasalSearchVisible}
          onParentScroll={handleEmbeddedTabScroll}
        />
      ) : (
        /* ?? YAPBOZ TAB CONTENT */
        <WordPuzzleScreen
          embedded={true}
          initialFilter={embeddedFilter}
          externalSearchVisible={puzzleSearchVisible}
          setExternalSearchVisible={setPuzzleSearchVisible}
          onParentScroll={handleEmbeddedTabScroll}
        />
      )}

      <TransferToast event={activeToast} onHide={() => setActiveToast(null)} />

      {/* STEP_16 CloudTip - Master kartin eklendi mesaji */}
      <FarmMascotCloudTip onContinue={handleCloudTipContinue} />

      {isGuidedFarmStep && (
        <CuteCloudTip
          visible={guidedFarmTipVisible}
          message={`Hedefin: "${guidedTargetLabel}" kartını çalışıp hasat et.\nNeden: Bu adım kelimeyi pekiştirir ve yapbozu açar.\nBaşarı: Yalnızca bu kelime hasat edildiğinde bir sonraki adıma geçilir.`}
          onDismiss={() => setGuidedFarmTipVisible(false)}
          accentColor="#22c55e"
        />
      )}

      {/* s¨ Card Shop Modal */}
      <Modal visible={cardShopVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
            <CardShopPanel onClose={() => setCardShopVisible(false)} />
          </View>
        </View>
      </Modal>

      {/*  ONBOARDING HIGHLIGHT - Gerekirse ileride implement edilebilir */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  topTabsAnimatedContainer: {
    overflow: 'hidden',
  },

  //  APPLE SEGMENT CONTROL STYLES - iOS Native Feel
  segmentContainer: {
    marginHorizontal: IS_TABLET ? 20 : IS_SMALL_SCREEN ? 12 : 16,
    marginTop: IS_TABLET ? 10 : IS_SMALL_SCREEN ? 6 : 8,
    marginBottom: IS_TABLET ? 10 : IS_SMALL_SCREEN ? 6 : 8,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: IS_SMALL_SCREEN ? 12 : 14,
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: IS_SMALL_SCREEN ? 6 : 8,
    paddingVertical: IS_SMALL_SCREEN ? 10 : 12,
    paddingHorizontal: IS_SMALL_SCREEN ? 8 : 12,
    borderRadius: IS_SMALL_SCREEN ? 10 : 12,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  segmentTabLocked: {
    opacity: 0.5,
  },
  segmentActiveBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: IS_SMALL_SCREEN ? 10 : 12,
  },
  segmentLabel: {
    fontSize: IS_SMALL_SCREEN ? 12 : 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
  },
  segmentLabelActive: {
    color: '#fff',
    fontWeight: '800',
  },
  segmentLockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  quickThemeRow: {
    marginHorizontal: IS_TABLET ? 20 : IS_SMALL_SCREEN ? 12 : 16,
    marginBottom: IS_TABLET ? 10 : IS_SMALL_SCREEN ? 8 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  quickThemeChip: {
    minWidth: IS_SMALL_SCREEN ? 112 : 126,
    paddingVertical: IS_SMALL_SCREEN ? 8 : 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickThemeChipActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.55)',
  },
  quickThemeChipActiveSoil: {
    backgroundColor: 'rgba(105, 62, 31, 0.33)',
    borderColor: 'rgba(145, 93, 57, 0.75)',
  },
  quickThemeChipText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: IS_SMALL_SCREEN ? 12 : 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  quickThemeChipTextActive: {
    color: '#fff',
  },

  // ?? Animated Filter Tabs - Scroll ile gizlenir
  animatedFilterTabs: {
    zIndex: 10,
    overflow: 'hidden',
  },

  // Stats Header - PREMIUM FILTER BAR ??
  statsHeader: {
    paddingTop: Platform.OS === 'ios' ? (IS_SMALL_SCREEN ? 38 : 46) : (IS_SMALL_SCREEN ? 22 : 26),
    paddingBottom: IS_SMALL_SCREEN ? 8 : 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  premiumFilterScroll: {
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 14,
    gap: IS_SMALL_SCREEN ? 6 : 8,
    alignItems: 'center',
  },
  premiumFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 4 : 5,
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
    paddingVertical: IS_SMALL_SCREEN ? 8 : 10,
    borderRadius: IS_SMALL_SCREEN ? 12 : 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  premiumFilterBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumFilterBtnLocked: {
    opacity: 0.4,
    backgroundColor: 'rgba(50,50,50,0.3)',
  },
  premiumFilterCount: {
    fontSize: IS_SMALL_SCREEN ? 12 : 14,
    fontWeight: '800',
    color: '#888',
  },
  premiumFilterCountActive: {
    color: '#34C759',
  },
  premiumFilterDivider: {
    width: 1,
    height: IS_SMALL_SCREEN ? 20 : 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: IS_SMALL_SCREEN ? 4 : 6,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 8 : 12,
    flexShrink: 1,
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 2 : 3,
  },
  compactStatValue: {
    fontSize: IS_SMALL_SCREEN ? 12 : 14,
    fontWeight: '800',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 5 : 6,
    flexShrink: 0,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 3 : 4,
    paddingHorizontal: IS_SMALL_SCREEN ? 6 : 8,
    paddingVertical: IS_SMALL_SCREEN ? 5 : 6,
    borderRadius: IS_SMALL_SCREEN ? 10 : 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  actionPillIcon: {
    width: IS_SMALL_SCREEN ? 16 : 18,
    height: IS_SMALL_SCREEN ? 16 : 18,
    borderRadius: IS_SMALL_SCREEN ? 8 : 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  actionPillText: {
    color: '#fff',
    fontSize: IS_SMALL_SCREEN ? 10 : 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Filter Tabs - COMPACT ??
  filterContainer: {
    backgroundColor: 'rgba(18, 18, 20, 0.7)',
    paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterScroll: {
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 14,
    gap: IS_SMALL_SCREEN ? 6 : 8,
  },
  filterTabWrapper: {
    position: 'relative',
  },
  filterGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 12,
    opacity: 0.4,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 14,
    paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  filterTabActive: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  filterShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 50,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  staticFilterShimmer: {
    position: 'absolute',
    top: -5,
    right: 10,
    width: 30,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 15,
    transform: [{ skewX: '-15deg' }, { rotate: '15deg' }],
  },
  filterTabText: {
    fontSize: IS_SMALL_SCREEN ? 12 : 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  filterBadge: {
    marginLeft: IS_SMALL_SCREEN ? 5 : 7,
    paddingHorizontal: IS_SMALL_SCREEN ? 5 : 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.3,
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Cards Grid - FlashList styles
  scrollContainer: {
    flex: 1,
  },
  columnWrapper: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 10 : 12,
    justifyContent: 'space-between',
    marginBottom: SCREEN_WIDTH < 375 ? 10 : 12,
  },
  flatListContent: {
    paddingTop: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingBottom: SCREEN_WIDTH < 375 ? 80 : 100,
  },
  flashListContent: {
    paddingTop: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingBottom: SCREEN_WIDTH < 375 ? 80 : 100,
    paddingHorizontal: 8,
  },

  // Empty State - Premium Design
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SCREEN_WIDTH < 375 ? 40 : 60,
    paddingHorizontal: 24,
  },
  emptyGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '20%',
  },
  emptyIconContainer: {
    width: SCREEN_WIDTH < 375 ? 100 : 120,
    height: SCREEN_WIDTH < 375 ? 100 : 120,
    borderRadius: SCREEN_WIDTH < 375 ? 30 : 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_WIDTH < 375 ? 20 : 24,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 22 : 26,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyQuizButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyQuizButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  emptyQuizButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Seed Market Button - ULTRA DOPAMINE ??
  seedMarketButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  seedMarketGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    position: 'relative',
  },
  seedMarketShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  seedMarketIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedMarketText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seedMarketCoinsWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  seedMarketCoins: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // ?? Search Bar Container - Ayr satr
  searchBarContainer: {
    paddingVertical: IS_SMALL_SCREEN ? 4 : 6,
    backgroundColor: 'rgba(18, 18, 20, 0.9)',
  },

  // ?? Inline Search Styles
  inlineSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: IS_SMALL_SCREEN ? 8 : 12,
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 12,
    paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: IS_SMALL_SCREEN ? 10 : 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  inlineSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  inlineSearchClear: {
    width: IS_SMALL_SCREEN ? 22 : 24,
    height: IS_SMALL_SCREEN ? 22 : 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: IS_SMALL_SCREEN ? 11 : 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 6,
  },
  inlineSearchClearIcon: {
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    color: '#fff',
    fontWeight: '600',
  },
  inlineSearchClose: {
    width: IS_SMALL_SCREEN ? 26 : 28,
    height: IS_SMALL_SCREEN ? 26 : 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: IS_SMALL_SCREEN ? 13 : 14,
    backgroundColor: COLORS.danger,
    marginLeft: 6,
  },
  inlineSearchCloseIcon: {
    fontSize: IS_SMALL_SCREEN ? 12 : 14,
    color: '#fff',
    fontWeight: '700',
  },

  //  Feed Styles
  feedContainer: {
    flex: 1,
    backgroundColor: '#0a0f1a',
  },
  feedCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  feedItem: {
    height: SCREEN_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // ? SHIMMER EFFECT - Master kartlar iin kartn iinde kayan k
  feedShimmerEffect: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
    zIndex: 1,
  },
  feedQuizOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 1000,
  },
  // ?? Apple-Style Feed Card - Clean & Juicy
  appleCard: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  appleFavorite: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  // ?? PV MINI BADGE - Feed kart iin (favori butonunun yannda)
  pvMiniBadgeFeed: {
    position: 'absolute',
    bottom: -3,
    left: -3,
    backgroundColor: '#a855f7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c084fc',
    zIndex: 25,
  },
  pvMiniBadgeFeedText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  appleBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  appleBadgeEmoji: {
    fontSize: 14,
  },
  appleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  appleWord: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    marginTop: 48,
    marginBottom: 12,
  },
  appleExample: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
    opacity: 0.75,
  },
  appleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  appleStat: {
    alignItems: 'center',
  },
  appleStatNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  appleStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'lowercase',
    marginTop: 2,
  },
  appleStatDivider: {
    width: 1,
    height: 24,
    opacity: 0.25,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 16,
    gap: 8,
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  appleButtonHint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  appleQuizWrap: {
    marginTop: 16,
    width: '100%',
  },
  // Eski stiller (backward compat)
  feedCard: {
    width: '90%',
    maxWidth: 420,
    padding: 40,
    alignItems: 'center',
    gap: 28,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  feedContent: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  feedWordContainer: {
    alignItems: 'center',
    gap: 12,
  },
  feedFavoriteBtnContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
  },
  feedWord: {
    fontSize: 46,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 52,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  feedMeaning: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
    paddingHorizontal: 8,
  },
  feedStatsContainer: {
    width: '100%',
    gap: 8,
    marginTop: 12,
  },
  feedStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedStatCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
    minHeight: 70,
  },
  feedQuizBtn: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  feedQuizBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 48,
  },
  feedQuizBtnIcon: {
    fontSize: 24,
    borderColor: 'rgba(34, 197, 94, 0.6)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  feedQuizBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 0.5,
  },

  // ?? ONBOARDING HIGHLIGHT STYLES
  onboardingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  onboardingContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  onboardingCardHighlight: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 32,
  },
  onboardingCard: {
    width: 200,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.8)',
  },
  onboardingCardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  onboardingCardWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fecaca',
    textAlign: 'center',
    marginBottom: 8,
  },
  onboardingCardMeaning: {
    fontSize: 16,
    color: 'rgba(254, 202, 202, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  onboardingTextContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  onboardingDesc: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 26,
  },
  onboardingButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  onboardingButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  onboardingButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default FarmScreen;



