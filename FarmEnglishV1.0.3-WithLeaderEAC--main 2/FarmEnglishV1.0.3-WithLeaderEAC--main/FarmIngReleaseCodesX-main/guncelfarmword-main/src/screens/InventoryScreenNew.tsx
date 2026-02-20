import React, { useState, useCallback, useMemo, useRef, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  PanResponder,
  Modal,
  ScrollView,
  Easing,
  useWindowDimensions,
  Image as RNImage,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { Package, Star, Crown, Search, X, Gem, Trophy, Heart, Filter, Sparkles, Puzzle, Lock, BookOpen, Link2, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFarmStore } from '../store/farmStore';
import { CuteCloudTip } from '../components/CuteCloudTip';
import { WordModel } from '../models/types';
import { haptic, sound } from '../utils/sound';
import { getFirstMeaning } from '../utils/loadWords';
import { showRewardToast } from '../components/RewardToast';
import { WordCardRN } from '../ui/cards/WordCardRN';
import { globalTabState } from '../navigation/globalTabState';
import { InventoryQuizDialog } from '../components/InventoryQuizDialog';
import { usePerformanceStore } from '../store/performanceStore';
import { getCardHeaderThemePreset } from '../data/cardThemes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

//  Tablet algılama
const IS_TABLET = SCREEN_WIDTH > 768;

// 🖼️ PRELOAD INVENTORY TAB IMAGES
const INVENTORY_IMAGES = {
  kelimeler: require('../../assets/images/maskot/kelimeler_envanter_tab_yeni.webp'),
  phrasal: require('../../assets/images/maskot/pharasal_envanter_tab_yeni.webp'),
  yapboz: require('../../assets/images/maskot/yapboz_envanter_tab_yeni.webp'),
};

// 📱 RESPONSIVE SİSTEM - TÜM iPHONE MODELLERİ İÇİN
// iPhone SE 1/2/3: 667px (tiny)
// iPhone 11/12/13/14: 844-852px (small)  
// iPhone 11/12/13/14 Pro: 844-852px (medium)
// iPhone 12/13/14 Pro Max, 14 Plus: 926-932px (large)
const IS_TINY_SCREEN = SCREEN_HEIGHT < 680;
const IS_SMALL_SCREEN = SCREEN_HEIGHT >= 680 && SCREEN_HEIGHT < 750;
const IS_MEDIUM_SCREEN = SCREEN_HEIGHT >= 750 && SCREEN_HEIGHT < 900;
const IS_LARGE_SCREEN = SCREEN_HEIGHT >= 900;

// 🎨 RESPONSIVE SİSTEMİ - Tüm değerler tek yerden kontrol
const RS = {
  // Grid Kartları
  card: {
    minHeight: IS_TINY_SCREEN ? 120 : IS_SMALL_SCREEN ? 135 : IS_MEDIUM_SCREEN ? 145 : 160,
    padding: IS_TINY_SCREEN ? 8 : IS_SMALL_SCREEN ? 10 : 12,
    borderRadius: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 12 : 14,
    wordSize: IS_TINY_SCREEN ? 12 : IS_SMALL_SCREEN ? 13 : 14,
    meaningSize: IS_TINY_SCREEN ? 9 : IS_SMALL_SCREEN ? 9 : 10,
    badgeSize: IS_TINY_SCREEN ? 8 : IS_SMALL_SCREEN ? 9 : 10,
    statSize: IS_TINY_SCREEN ? 9 : IS_SMALL_SCREEN ? 10 : 11,
  },
  // Wrapper
  wrapper: {
    minHeight: IS_TINY_SCREEN ? 130 : IS_SMALL_SCREEN ? 145 : IS_MEDIUM_SCREEN ? 155 : 170,
    padding: IS_TINY_SCREEN ? 3 : 4,
  },
  // Header
  header: {
    titleSize: IS_TINY_SCREEN ? 20 : IS_SMALL_SCREEN ? 22 : 24,
    subtitleSize: IS_TINY_SCREEN ? 11 : IS_SMALL_SCREEN ? 12 : 13,
    paddingTop: IS_TINY_SCREEN ? 50 : IS_SMALL_SCREEN ? 56 : 64,
    paddingHorizontal: IS_TINY_SCREEN ? 16 : 20,
    marginBottom: IS_TINY_SCREEN ? 12 : IS_SMALL_SCREEN ? 16 : 20,
  },
  // Filter Tabs
  filter: {
    paddingH: IS_TINY_SCREEN ? 8 : IS_SMALL_SCREEN ? 10 : 14,
    paddingV: IS_TINY_SCREEN ? 5 : IS_SMALL_SCREEN ? 7 : 10,
    fontSize: IS_TINY_SCREEN ? 11 : IS_SMALL_SCREEN ? 12 : 14,
    borderRadius: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 12 : 16,
    gap: IS_TINY_SCREEN ? 4 : IS_SMALL_SCREEN ? 5 : 8,
    badgePaddingH: IS_TINY_SCREEN ? 5 : IS_SMALL_SCREEN ? 6 : 8,
    badgePaddingV: IS_TINY_SCREEN ? 2 : IS_SMALL_SCREEN ? 2 : 3,
    badgeSize: IS_TINY_SCREEN ? 9 : IS_SMALL_SCREEN ? 10 : 12,
    badgeRadius: IS_TINY_SCREEN ? 6 : IS_SMALL_SCREEN ? 8 : 10,
  },
  // Search
  search: {
    height: IS_TINY_SCREEN ? 36 : IS_SMALL_SCREEN ? 40 : 44,
    fontSize: IS_TINY_SCREEN ? 13 : IS_SMALL_SCREEN ? 14 : 15,
    iconSize: IS_TINY_SCREEN ? 16 : IS_SMALL_SCREEN ? 18 : 20,
    paddingH: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 12 : 14,
    borderRadius: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 12 : 14,
  },
  // Quick Send Button
  quickSend: {
    paddingV: IS_TINY_SCREEN ? 5 : IS_SMALL_SCREEN ? 6 : 8,
    fontSize: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 11 : 12,
    borderRadius: IS_TINY_SCREEN ? 6 : IS_SMALL_SCREEN ? 8 : 10,
  },
  // Feed/Preview
  feed: {
    padding: IS_TINY_SCREEN ? 12 : IS_SMALL_SCREEN ? 16 : 24,
    maxWidth: IS_TINY_SCREEN ? 300 : IS_SMALL_SCREEN ? 340 : 380,
    borderRadius: IS_TINY_SCREEN ? 20 : IS_SMALL_SCREEN ? 24 : 32,
    cardPadding: IS_TINY_SCREEN ? 16 : IS_SMALL_SCREEN ? 20 : 28,
    wordSize: IS_TINY_SCREEN ? 28 : IS_SMALL_SCREEN ? 34 : 38,
    meaningSize: IS_TINY_SCREEN ? 14 : IS_SMALL_SCREEN ? 16 : 18,
  },
};

// 📱 Responsive kart genişliği - küçük ekranlarda daha küçük
const getCardWidth = () => {
  const screenWidth = Dimensions.get('window').width;
  if (screenWidth < 360) return (screenWidth - 28) / 2; // Çok küçük ekranlar
  if (IS_TINY_SCREEN) return (screenWidth - 32) / 2;
  return (screenWidth - 40) / 2;
};
const CARD_WIDTH = getCardWidth();
// Swipe should be intentional but feel responsive
const SWIPE_THRESHOLD = Math.max(56, Math.round(SCREEN_WIDTH * 0.14));
const SWIPE_VELOCITY_THRESHOLD = 1.1;

// 🎨 RENK SİSTEMİ
const COLORS = {
  background: '#050810',
  surface: 'rgba(15, 23, 42, 0.9)',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: 'rgba(51, 65, 85, 0.5)',
  
  // Tarla Renkleri (wrongCount bazlı)
  red: '#ef4444',
  redBg: 'rgba(185, 28, 28, 0.95)',
  orange: '#f97316',
  orangeBg: 'rgba(194, 65, 12, 0.95)',
  yellow: '#eab308',
  yellowBg: 'rgba(161, 98, 7, 0.95)',
  green: '#22c55e',
  greenBg: 'rgba(22, 101, 52, 0.95)',
  
  // Master Seviyeleri
  gold: '#fbbf24',
  goldGlow: 'rgba(251, 191, 36, 0.4)',
  cyan: '#22d3ee',
  cyanGlow: 'rgba(34, 211, 238, 0.4)',
  purple: '#a855f7',
  purpleGlow: 'rgba(168, 85, 247, 0.4)',
};

// 🏆 MASTER SEVİYELERİ (totalHarvests bazlı)
// Sıralama: Kırmızı → Turuncu → Sarı → Yeşil → ALTIN → ELMAS → KRALİYET
// masterLevel: 0 = normal, 1 = ALTIN (3+ hasat), 2 = ELMAS (8+ hasat), 3 = KRALİYET (13+ hasat)
const MASTER_CONFIG: Record<number, { label: string | null; color: string; glow: string; Icon: any }> = {
  0: { label: null, color: COLORS.green, glow: 'transparent', Icon: null },
  1: { label: 'ALTIN', color: COLORS.gold, glow: COLORS.goldGlow, Icon: Trophy },
  2: { label: 'ELMAS', color: COLORS.cyan, glow: COLORS.cyanGlow, Icon: Gem },
  3: { label: 'KRALİYET', color: COLORS.purple, glow: COLORS.purpleGlow, Icon: Crown },
};

// 🎨 Renk belirleme (wrongCount bazlı)
const getCardColor = (wrongCount: number) => {
  if (wrongCount >= 15) return { bg: COLORS.redBg, border: COLORS.red, name: 'Kırmızı' };
  if (wrongCount >= 10) return { bg: COLORS.orangeBg, border: COLORS.orange, name: 'Turuncu' };
  if (wrongCount >= 5) return { bg: COLORS.yellowBg, border: COLORS.yellow, name: 'Sarı' };
  return { bg: COLORS.greenBg, border: COLORS.green, name: 'Yeşil' };
};

// 🎨 FEED THEMES - Her wrongCount seviyesi için
const FEED_THEMES = {
  red: {
    gradient: ['rgba(185, 28, 28, 0.95)', 'rgba(220, 38, 38, 0.9)', 'rgba(185, 28, 28, 0.95)'] as const,
    border: 'rgba(248, 113, 113, 0.8)',
    glow: '#ef4444',
    textMain: '#fecaca',
    textSecondary: '#fca5a5',
    accent: '#ef4444',
    emoji: '🔴',
  },
  orange: {
    gradient: ['rgba(194, 65, 12, 0.95)', 'rgba(234, 88, 12, 0.9)', 'rgba(194, 65, 12, 0.95)'] as const,
    border: 'rgba(251, 146, 60, 0.8)',
    glow: '#f97316',
    textMain: '#fed7aa',
    textSecondary: '#fdba74',
    accent: '#f97316',
    emoji: '🟠',
  },
  yellow: {
    gradient: ['rgba(161, 98, 7, 0.95)', 'rgba(202, 138, 4, 0.9)', 'rgba(161, 98, 7, 0.95)'] as const,
    border: 'rgba(250, 204, 21, 0.8)',
    glow: '#eab308',
    textMain: '#fef9c3',
    textSecondary: '#fef08a',
    accent: '#eab308',
    emoji: '🟡',
  },
  green: {
    gradient: ['rgba(22, 101, 52, 0.95)', 'rgba(34, 197, 94, 0.9)', 'rgba(22, 101, 52, 0.95)'] as const,
    border: 'rgba(74, 222, 128, 0.8)',
    glow: '#22c55e',
    textMain: '#dcfce7',
    textSecondary: '#bbf7d0',
    accent: '#22c55e',
    emoji: '🟢',
  },
  master: {
    gradient: ['rgba(161, 98, 7, 0.95)', 'rgba(250, 204, 21, 0.9)', 'rgba(161, 98, 7, 0.95)'] as const,
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

// 🎨 Tema seçici fonksiyon
const getWordTheme = (word: any) => {
  const masterLevel = word.masterLevel || 0;
  const wrongCount = word.wrongCount || 0;

  if (masterLevel === 3) return FEED_THEMES.perfect;
  if (masterLevel === 2) return FEED_THEMES.ultra;
  if (masterLevel === 1) return FEED_THEMES.master;
  if (wrongCount >= 2) return FEED_THEMES.green;
  if (wrongCount >= 2) return FEED_THEMES.yellow;
  if (wrongCount >= 1) return FEED_THEMES.orange;
  return FEED_THEMES.red;
};

// 📱 Apple-Style Feed Card - WordCardRN'nin büyütülmüş hali (glow, bounce, animasyonlu)
const FeedCard: React.FC<{
  word: any;
  onPlantToFarm: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}> = ({ word, onPlantToFarm, onToggleFavorite }) => {
  // 🎮 PERFORMANS AYARLARI
  const config = usePerformanceStore(s => s.config);
  const hasTriggeredRef = useRef(false);
  const theme = getWordTheme(word);
  const isPuzzleHarvested = word.isPuzzleHarvested === true;
  const puzzleStats = word.puzzleStats as { totalCorrect?: number; totalWrong?: number; puzzleTotalHarvests?: number } | undefined;

  // 🎬 Animasyonlar - WordCardRN ile aynı
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🚀 Giriş animasyonu - PERFORMANS KONTROLÜ
    if (config.enableCardEntryAnimation) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }

    // ✨ Glow pulse animasyonu + PERFORMANS KONTROLÜ
    if (config.enableGlow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }

    // 🎾 Bounce animasyonu - nefes alıp veriyor gibi + PERFORMANS KONTROLÜ
    if (config.enablePulseAnimations) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.012, duration: 1800, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    }

    // 💫 Shimmer animasyonu (premium kartlar için) + PERFORMANS KONTROLÜ
    const masterLevel = word.masterLevel || 0;
    if (masterLevel >= 1 && config.enableShimmer) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [config.enableGlow, config.enablePulseAnimations, config.enableShimmer, config.enableCardEntryAnimation]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => {
      // KAYDIRma - Tarla feed ile aynı hassaslık (20px threshold, 3x yatay bias)
      return gesture.dx < -20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 3;
    },
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      // Capture ile FlatList scroll'u engelle - aynı threshold
      return gesture.dx < -20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 3;
    },
    onPanResponderGrant: () => {
      hasTriggeredRef.current = false;
      haptic.light(); // İlk dokunuşta hafif titreşim
    },
    onPanResponderMove: (_, gesture) => {
      // SOLA 50px gidince tetikle - Tarla feed ile aynı (50px)
      if (gesture.dx < -50 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        haptic.heavy(); // Tetiklendiğinde güçlü titreşim
        onPlantToFarm(word.id);
      }
    },
    onPanResponderRelease: () => { hasTriggeredRef.current = false; },
    onPanResponderTerminate: () => { hasTriggeredRef.current = false; },
  }), [onPlantToFarm, word.id]);

  const streak = word.consecutiveCorrect || 0;
  const masterLevel = word.masterLevel || 0;
  
  // 📊 Stats - Puzzle için ayrı istatistikler
  const quizCorrect = isPuzzleHarvested ? (puzzleStats?.totalCorrect ?? 0) : (word.quizCorrect || 0);
  const quizWrong = isPuzzleHarvested ? (puzzleStats?.totalWrong ?? 0) : (word.quizWrong || 0);
  const totalHarvests = isPuzzleHarvested ? (puzzleStats?.puzzleTotalHarvests ?? 1) : (word.totalHarvests || 0);

  // 🎨 Glow shadow style - animasyonlu
  const glowShadowStyle = {
    shadowColor: theme.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: glowAnim,
    shadowRadius: 16,
    elevation: 12,
  };

  return (
    <View style={[styles.feedItem, { justifyContent: 'center', alignItems: 'center' }]}>
      {/* Wrapper for layout animation */}
      <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', maxWidth: RS.feed.maxWidth }}>
        <Animated.View
          style={[
            styles.appleCard, 
            { 
              borderColor: theme.border, 
              overflow: 'hidden',
            },
            glowShadowStyle,
            { transform: [{ scale: Animated.multiply(scaleAnim, bounceAnim) }] }
          ]}
          {...panResponder.panHandlers}
        >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ❤️ Favorite - sol üst */}
        <TouchableOpacity
          style={styles.appleFavorite}
          onPress={() => { haptic.medium(); onToggleFavorite(word.id); }}
          activeOpacity={0.7}
        >
          <Heart
            size={IS_TINY_SCREEN ? 18 : IS_SMALL_SCREEN ? 20 : 24}
            color={word.isFavorite ? '#ff375f' : 'rgba(255,255,255,0.5)'}
            fill={word.isFavorite ? '#ff375f' : 'transparent'}
          />
        </TouchableOpacity>

        {/* 🏷️ Badge + 📍 Envanterde etiketi */}
        <View style={styles.badgeRow}>
          <View style={[styles.appleBadge, { backgroundColor: `${theme.accent}25` }]}>
            <Text style={styles.appleBadgeEmoji}>{theme.emoji}</Text>
            <Text style={[styles.appleBadgeText, { color: theme.textSecondary }]}>
              {masterLevel >= 3 ? 'Kraliyet' : masterLevel === 2 ? 'Elmas' : masterLevel === 1 ? 'Usta' : 'Envanter'}
            </Text>
          </View>
          
          {/* 📍 Envanterde etiketi */}
          <View style={styles.inventoryBadge}>
            <Text style={styles.inventoryBadgeText}>📦 Envanterde</Text>
          </View>
          
          {/* 🧩 Puzzle Badge */}
          {isPuzzleHarvested && (
            <View style={styles.puzzleFeedBadge}>
              <Text style={styles.puzzleFeedBadgeText}>🧩</Text>
            </View>
          )}
        </View>

        {/* 📝 Kelime + PV Badge + Puzzle Badge inline */}
        <View style={styles.wordWithPvContainer}>
          <Text style={[styles.appleWord, { color: theme.textMain }]}>{word.text || word.verb}</Text>
          {word.isPhrasalVerb && (
            <View style={styles.inlinePvBadge}>
              <Text style={styles.inlinePvBadgeText}>PV</Text>
            </View>
          )}
          {(word as any).isCustom && (
            <View style={[styles.inlinePvBadge, { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' }]}>
              <Text style={[styles.inlinePvBadgeText, { color: '#6366f1' }]}>✏️</Text>
            </View>
          )}
          {isPuzzleHarvested && (
            <View style={[styles.inlinePvBadge, { backgroundColor: 'rgba(168,85,247,0.3)', borderColor: 'rgba(168,85,247,0.6)' }]}>
              <Text style={[styles.inlinePvBadgeText, { color: '#a855f7' }]}>🧩</Text>
            </View>
          )}
        </View>

        {/* 📖 Anlam */}
        <Text style={[styles.appleMeaning, { color: `${theme.textSecondary}ee` }]}>
          {word.meaning}
        </Text>

        {/* 📖 Örnek cümle */}
        {!!word.example && (
          <Text style={[styles.appleExample, { color: `${theme.textSecondary}cc` }]} numberOfLines={2}>
            "{word.example}"
          </Text>
        )}

        {/* 🔢 Mini stats */}
        <View style={styles.appleStats}>
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: '#22c55e' }]}>✓{quizCorrect}</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>doğru</Text>
          </View>
          <View style={[styles.appleStatDivider, { backgroundColor: theme.accent }]} />
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: '#ef4444' }]}>✗{quizWrong}</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>yanlış</Text>
          </View>
          <View style={[styles.appleStatDivider, { backgroundColor: theme.accent }]} />
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: theme.textMain }]}>%{
              (quizCorrect + quizWrong) > 0
                ? Math.round((quizCorrect / (quizCorrect + quizWrong)) * 100)
                : 0
            }</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>başarı</Text>
          </View>
          <View style={[styles.appleStatDivider, { backgroundColor: theme.accent }]} />
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: theme.textMain }]}>🌾{totalHarvests}</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>hasat</Text>
          </View>
        </View>

        {/* 🎯 Tarlaya Gönder Butonu */}
        <TouchableOpacity
          style={[styles.appleButton, { backgroundColor: '#22c55e' }]}
          activeOpacity={0.8}
          onPress={() => {
            haptic.medium();
            onPlantToFarm(word.id);
          }}
        >
          <Text style={styles.appleButtonText}>🌱 {isPuzzleHarvested ? 'Yapboz Tarlasına' : 'Tarlaya'} Gönder</Text>
          <Text style={styles.appleButtonHint}>← KAYDIR</Text>
        </TouchableOpacity>

        {/* ✨ Shimmer overlay - premium kartlar için + PERFORMANS KONTROLÜ */}
        {(word.masterLevel || 0) >= 1 && config.enableShimmer && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: shimmerAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.15, 0],
                }),
                backgroundColor: 'white',
              },
            ]}
            pointerEvents="none"
          />
        )}
        </Animated.View>
      </View>
    </View>
  );
};

// ============================================
// 📦 SWIPEABLE CARD (animasyonsuz, saf gesture)
// ============================================
const SwipeableCard = memo(({ 
  word, 
  index, 
  cardWidth,
  onSwipeComplete,
  onReview,
  onPreview,
  globalStreak,
  tutorialHighlight = false,
}: { 
  word: WordModel; 
  index: number; 
  cardWidth: number;
  onSwipeComplete: (word: WordModel) => void;
  onReview: (word: WordModel) => void;
  onPreview: (word: WordModel) => void;
  globalStreak: number;
  tutorialHighlight?: boolean;
}) => {
  const hasTriggeredRef = useRef(false);
  
  const masterLevel = word.masterLevel || 0;
  const masterConfig = MASTER_CONFIG[masterLevel as keyof typeof MASTER_CONFIG] || MASTER_CONFIG[0];
  const cardColor = getCardColor(word.wrongCount || 0);
  


  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
      // Sola hareket + yatay
      return gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
    },
    onPanResponderGrant: () => {
      hasTriggeredRef.current = false;
      haptic.light();
    },
    onPanResponderMove: (_, gesture) => {
      // Sola 25px+ gidince tetikle
      if (gesture.dx < -25 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        haptic.heavy();
        onSwipeComplete(word);
      }
    },
    onPanResponderRelease: () => {
      hasTriggeredRef.current = false;
    },
    onPanResponderTerminate: () => {
      hasTriggeredRef.current = false;
    },
  }), [onSwipeComplete, word]);

  const MasterIcon = masterConfig.Icon;
  const totalHarvests = word.totalHarvests || 0;
  // 📊 Quiz istatistikleri kullan
  const quizCorrect = word.quizCorrect || 0;
  const quizWrong = word.quizWrong || 0;
  const totalAnswers = quizCorrect + quizWrong;
  const successRate = totalAnswers > 0 
    ? Math.round((quizCorrect / totalAnswers) * 100) 
    : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        // 🎓 Tutorial sırasında karta tıklamayı engelle - sadece swipe veya buton çalışsın
        if (tutorialHighlight) return;
        onPreview(word);
      }}
      disabled={tutorialHighlight}
      style={[
        styles.cardWrapper,
        // 🎓 Tutorial vurgulama
        tutorialHighlight && {
          borderWidth: 3,
          borderColor: '#22c55e',
          borderRadius: RS.wrapper.padding + RS.card.borderRadius + 4,
          shadowColor: '#22c55e',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 10,
        }
      ]}
    >
      {/* 🎓 Tutorial badge */}
      {tutorialHighlight && (
        <View style={{
          position: 'absolute',
          top: -8,
          right: -8,
          backgroundColor: '#22c55e',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          zIndex: 10,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>↔ KAYDIR</Text>
        </View>
      )}
      {/* 🃏 Main Card */}
      <View
        style={styles.cardContainer}
        {...panResponder.panHandlers}
      >
        <WordCardRN
          w={word as any}
          index={index}
          cardWidth={Math.max(92, cardWidth - RS.wrapper.padding * 2)}
          globalStreak={globalStreak}
          ctaText="TARLAYA GÖNDER 🌱"
          onHarvest={(id) => {
            onReview(word);
          }}
          onPreview={(w) => {
            onPreview(w as any);
            haptic.light();
          }}
          onToggleFavorite={(id) => {
            useFarmStore.getState().toggleFavorite(id);
            haptic.light();
          }}
        />
      </View>
    </TouchableOpacity>
  );
});

// 🍎 ActionPill - FarmScreen tarzı
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
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
};

// 🏷️ Filter Tab - Premium glow efektli
const FilterTab: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
  glowColor?: string;
}> = ({ label, active, onPress, count, glowColor }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={() => {
          haptic.light();
          Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true, friction: 6, tension: 220 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 180 }).start();
        }}
        onPress={() => {
          haptic.heavy();
          onPress();
        }}
        activeOpacity={1}
      >
        <View style={styles.filterTabWrapper}>
          {active && (
            <View style={[styles.filterGlow, { opacity: 0.6, backgroundColor: glowColor || '#34C759' }]} />
          )}
          <LinearGradient
            colors={active ? [glowColor || '#34C759', glowColor ? `${glowColor}CC` : '#2ea34a'] : ['rgba(40, 40, 42, 0.8)', 'rgba(28, 28, 30, 0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.filterTab, active && styles.filterTabActive]}
          >
            {active && <View style={styles.staticFilterShimmer} />}
            <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{label}</Text>
            {count !== undefined && count > 0 && (
              <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>{count}</Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================
// 🏠 MAIN INVENTORY SCREEN - ULTRA DOPAMINE MODE
// ============================================
export default function InventoryScreenNew() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { inventory, phrasalVerbInventory, plantFromInventory, streak, toggleFavorite, pool, demoteWordLevel, lastInventoryQuizTime, setLastInventoryQuizTime, insecticideActive } = useFarmStore();
  const sectionVisibility = useFarmStore(s => s.sectionVisibility);
  const setSectionVisibility = useFarmStore(s => s.setSectionVisibility);
  const cardCustomization = useFarmStore(s => s.cardCustomization);
  const headerTheme = useMemo(
    () => getCardHeaderThemePreset(cardCustomization?.headerTheme),
    [cardCustomization?.headerTheme],
  );
  const themedActiveFilterStyle = useMemo(
    () => ({
      backgroundColor: headerTheme.filterActiveBackground,
      borderColor: headerTheme.filterActiveBorderColor,
    }),
    [headerTheme.filterActiveBackground, headerTheme.filterActiveBorderColor],
  );
  const lastMeaningSpokenRef = useRef<{ meaning: string; time: number } | null>(null);
  const windowDims = useWindowDimensions();
  const isSmallScreen = windowDims.height < 700;
  
  // 📱 RESPONSIVE LAYOUT - Dinamik sütun sayısı ve kart genişliği
  const numColumns = useMemo(() => {
    if (cardCustomization?.largeMode) return 1;
    if (cardCustomization?.compactMode) return 3;
    const screenWidth = windowDims.width;
    if (screenWidth > 900) return 4; // Tablet landscape - çok geniş
    if (screenWidth > 700) return 3; // Tablet portrait veya büyük telefon landscape
    if (screenWidth > 500) return 3; // Telefon landscape
    return 2; // Telefon portrait
  }, [windowDims.width, cardCustomization?.largeMode, cardCustomization?.compactMode]);
  
  const cardWidth = useMemo(() => {
    const screenWidth = windowDims.width;
    const horizontalPadding = screenWidth < 375 ? 8 : 12;
    return (screenWidth - horizontalPadding) / numColumns;
  }, [windowDims.width, numColumns]);
  
  // 🎓 TUTORIAL STATE
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  
  // ☁️ CloudTip state - persist edilmiş
  const cloudTipsDismissed = useFarmStore(s => s.cloudTipsDismissed);
  const setCloudTipDismissed = useFarmStore(s => s.setCloudTipDismissed);
  const showInventoryCloudTip = !cloudTipsDismissed['inventory'] && tutorialStep === 'COMPLETED';
  
  const [activeTab, setActiveTab] = useState<'words' | 'phrasal' | 'puzzle'>(globalTabState.current);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'master' | 'ultra' | 'perfect' | 'favorites' | 'custom'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHeaderVisible = sectionVisibility?.invHeader ?? true;
  const isTabsVisible = sectionVisibility?.invTabs ?? true;
  const isNavbarVisible = sectionVisibility?.navbar ?? true;
  const headerAnim = useRef(new Animated.Value(isHeaderVisible ? 1 : 0)).current;
  const tabsAnim = useRef(new Animated.Value(isTabsVisible ? 1 : 0)).current;
  
  // 🎓 Tutorial kartı vurgulama - STEP_13'te göster (ilk kart veya tutorialFirstWrongWord)
  const isTutorialCardSelectStep = tutorialStep === 'STEP_13_SELECT_CARD';
  // Eğer tutorialFirstWrongWord varsa ve envanterdeyse onu vurgula, yoksa ilk kartı vurgula
  const tutorialHighlightedWordId = useMemo(() => {
    if (!isTutorialCardSelectStep) return null;
    if (tutorialFirstWrongWord?.id && inventory.some(w => w.id === tutorialFirstWrongWord.id)) {
      return tutorialFirstWrongWord.id;
    }
    // Yoksa ilk kartı vurgula
    return inventory.length > 0 ? inventory[0].id : null;
  }, [isTutorialCardSelectStep, tutorialFirstWrongWord, inventory]);
  
  // 🎓 TUTORIAL STEP_13: Otomatik "Tüm Kelimeler" filtresine geç
  // Kullanıcı farklı filtrede olabilir ve kart görünmeyebilir
  useEffect(() => {
    if (isTutorialCardSelectStep && filter !== 'all') {
      setFilter('all');
    }
  }, [isTutorialCardSelectStep, filter]);
  
  // 🎓 TUTORIAL STEP_13: Envanterde kelime yoksa tutorial'ı atla
  useEffect(() => {
    if (isTutorialCardSelectStep && filter === 'all' && inventory.length === 0) {
      setTutorialStep('STEP_15_MASTER_GRIND');
      navigation.navigate('Home' as never);
    }
  }, [isTutorialCardSelectStep, filter, inventory.length, setTutorialStep, navigation]);

  // 🖼️ PRELOAD INVENTORY TAB IMAGES - Avoid reload on tab switch
  useEffect(() => {
    Asset.loadAsync([
      INVENTORY_IMAGES.kelimeler,
      INVENTORY_IMAGES.phrasal,
      INVENTORY_IMAGES.yapboz,
    ]);
  }, []);
  
  // 📖 Feed Modal - Instagram Reels tarzı
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [currentFeedCardId, setCurrentFeedCardId] = useState<string | null>(null); // 📌 Feed'de şu anda görünen kart
  const [shuffledFeedData, setShuffledFeedData] = useState<WordModel[]>([]); // 📌 Feed için shuffle edilmiş data
  
  // 📦 Envanter Quiz State
  const [showInventoryQuiz, setShowInventoryQuiz] = useState(false);
  
  // 🎬 Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gridListRef = useRef<any>(null); // 📌 Grid FlashList referansı
  
  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: isHeaderVisible ? 1 : 0,
      duration: isHeaderVisible ? 260 : 210,
      easing: isHeaderVisible
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isHeaderVisible, headerAnim]);

  useEffect(() => {
    Animated.timing(tabsAnim, {
      toValue: isTabsVisible ? 1 : 0,
      duration: isTabsVisible ? 250 : 210,
      easing: isTabsVisible
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isTabsVisible, tabsAnim]);

  const toggleNavbarVisibility = useCallback(() => {
    setSectionVisibility('navbar', !isNavbarVisible);
    haptic.selection();
  }, [isNavbarVisible, setSectionVisibility]);

  const toggleInventoryFiltersVisibility = useCallback(() => {
    const nextVisible = !(isHeaderVisible && isTabsVisible);
    setSectionVisibility('invHeader', nextVisible);
    setSectionVisibility('invTabs', nextVisible);
    haptic.selection();
  }, [isHeaderVisible, isTabsVisible, setSectionVisibility]);

  // 🎯 Route params ile gelen tab'ı işle - SADECE params değiştiğinde
  useEffect(() => {
    const params = route.params as { tab?: 'words' | 'phrasal' | 'puzzle' } | undefined;
    if (params?.tab) {
      setActiveTab(params.tab);
      globalTabState.current = params.tab;
      // Parametreyi temizle
      navigation.setParams({ tab: undefined } as any);
    }
  }, [route.params, navigation]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);
  
  // 📦 ENVANTER QUIZ - Master/Ultra/Perfect kartları hesapla (yapboz hariç)
  const masterCards = useMemo(() => {
    // Kelime envanteri - yapboz hariç, masterLevel >= 1
    const wordMasters = (inventory || [])
      .filter(w => !(w as any).isPuzzleHarvested && (w.masterLevel || 0) >= 1);
    
    // Phrasal verb envanteri - yapboz hariç, masterLevel >= 1
    const phrasalMasters = (phrasalVerbInventory || [])
      .filter(w => !(w as any).isPuzzleHarvested && (w.masterLevel || 0) >= 1)
      .map(w => ({ ...w, isPhrasalVerb: true }));
    
    return [...wordMasters, ...phrasalMasters];
  }, [inventory, phrasalVerbInventory]);
  
  // Tüm kelimeler (yanlış seçenekler için)
  const allWordsForOptions = useMemo(() => {
    const words = [...(inventory || []), ...(phrasalVerbInventory || []), ...(pool || [])];
    return words.filter(w => w.meaning && w.meaning.length > 0);
  }, [inventory, phrasalVerbInventory, pool]);
  
  // 📦 ENVANTER QUIZ - Toplam envanter sayısı 10 veya 10'un katına ulaştığında tetikle
  // Kelime + Phrasal toplamı (yapboz hariç)
  const totalInventoryCount = useMemo(() => {
    const wordCount = (inventory || []).filter(w => !(w as any).isPuzzleHarvested).length;
    const phrasalCount = (phrasalVerbInventory || []).filter(w => !(w as any).isPuzzleHarvested).length;
    return wordCount + phrasalCount;
  }, [inventory, phrasalVerbInventory]);
  
  // 🐛 Böcek Quiz Tetikleme
  const quizTriggeredRef = useRef(false);
  
  useEffect(() => {
    // Quiz zaten tetiklendiyse veya açıksa bir şey yapma
    if (quizTriggeredRef.current || showInventoryQuiz) return;
    
    // 🧪 Böcek ilacı aktifse böcek baskını ertelenir
    if (insecticideActive) {
      return;
    }
    
    // Her 10 YENİ kelime eklendiğinde quiz tetikle
    // lastInventoryQuizTime = son quiz yapıldığındaki toplam kart sayısı
    // Eğer 1000'den büyükse eski timestamp'tir, sıfırla
    let lastQuizCount = lastInventoryQuizTime || 0;
    if (lastQuizCount > 1000) {
      lastQuizCount = 0;
      setLastInventoryQuizTime(0);
    }
    
    const newCardsAdded = totalInventoryCount - lastQuizCount;

    // 10 veya daha fazla YENİ kart eklendiyse quiz göster
    if (newCardsAdded >= 10) {
      quizTriggeredRef.current = true;
      setTimeout(() => {
        setShowInventoryQuiz(true);
      }, 500);
    }
  }, [totalInventoryCount, lastInventoryQuizTime, showInventoryQuiz, insecticideActive]);
  
  // Quiz kapandığında ref'i sıfırla
  useEffect(() => {
    if (!showInventoryQuiz) {
      quizTriggeredRef.current = false;
    }
  }, [showInventoryQuiz]);
  
  // 📦 ENVANTER QUIZ - Tamamlandığında
  const handleInventoryQuizComplete = useCallback((results: any[]) => {
    // Seviyesi düşen kartları güncelle
    results.forEach(result => {
      if (!result.wasCorrect && !result.protected) {
        // Seviye düşür
        const isPhrasal = result.word.isPhrasalVerb === true;
        demoteWordLevel(result.word.id, isPhrasal);
      }
    });
    
    // Bocek korumasi aktifle
    useFarmStore.getState().activateInsecticide();
  }, [demoteWordLevel, totalInventoryCount]);
  
  // 🎯 Kelimeler tab'ı - isPuzzleHarvested OLMAYANLAR (yapbozdan gelmemişler)
  const wordsInventory = useMemo(() => {
    return (inventory || []).filter(w => !(w as any).isPuzzleHarvested);
  }, [inventory]);
  
  // 🎯 Phrasal tab'ı - isPuzzleHarvested OLMAYANLAR (yapbozdan gelmemişler)
  const phrasalInventoryFiltered = useMemo(() => {
    return (phrasalVerbInventory || []).filter(w => !(w as any).isPuzzleHarvested);
  }, [phrasalVerbInventory]);
  
  const currentInventory = activeTab === 'words' ? wordsInventory : phrasalInventoryFiltered;
  
  // 🧩 Puzzle tab'ı - SADECE isPuzzleHarvested: true olanlar
  const puzzleInventory = useMemo(() => {
    // Envanterdeki SADECE yapbozdan hasat edilmiş kelimeler
    const inventoryPuzzleMasters = (inventory || []).filter(w => (w as any).isPuzzleHarvested === true)
      .map(w => ({ ...w, isPuzzleMaster: true }));
    const phrasalInventoryPuzzleMasters = (phrasalVerbInventory || []).filter(w => (w as any).isPuzzleHarvested === true)
      .map(w => ({ ...w, isPuzzleMaster: true, isPhrasalVerb: true }));
    return [...inventoryPuzzleMasters, ...phrasalInventoryPuzzleMasters];
  }, [inventory, phrasalVerbInventory]);
  
  // Animations removed for performance - keep inventory static

  // Filtered words
  const filteredWords = useMemo(() => {
    // Puzzle tab için puzzle inventory kullan
    const sourceInventory = activeTab === 'puzzle' ? puzzleInventory : currentInventory;
    let result = [...sourceInventory];

    // Filter by master level or favorites
    // Puzzle tab'da puzzleMasterLevel'a göre filtrele
    if (activeTab === 'puzzle') {
      if (filter === 'favorites') {
        result = result.filter(w => w.isFavorite === true);
      } else if (filter === 'custom') {
        result = result.filter(w => (w as any).isCustom === true);
      } else if (filter !== 'all') {
        const levelMap = { master: 1, ultra: 2, perfect: 3 };
        result = result.filter(w => ((w as any).puzzleStats?.puzzleMasterLevel || 0) === levelMap[filter]);
      }
    } else {
      if (filter === 'favorites') {
        result = result.filter(w => w.isFavorite === true);
      } else if (filter === 'custom') {
        result = result.filter(w => (w as any).isCustom === true);
      } else if (filter !== 'all') {
        const levelMap = { master: 1, ultra: 2, perfect: 3 };
        result = result.filter(w => (w.masterLevel || 0) === levelMap[filter]);
      }
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w =>
        (w.text || w.verb || '').toLowerCase().includes(query) ||
        w.meaning.toLowerCase().includes(query)
      );
    }

    // Sort: newest first (harvestedAt timestamp - en yeni en üstte)
    result.sort((a, b) => ((b as any).harvestedAt || 0) - ((a as any).harvestedAt || 0));

    return result;
  }, [currentInventory, puzzleInventory, activeTab, filter, searchQuery]);

  // Stats - tab'a göre hesapla
  const stats = useMemo(() => {
    if (activeTab === 'puzzle') {
      const total = puzzleInventory.length;
      const master = puzzleInventory.filter(w => ((w as any).puzzleStats?.puzzleMasterLevel || 0) === 1).length;
      const ultra = puzzleInventory.filter(w => ((w as any).puzzleStats?.puzzleMasterLevel || 0) === 2).length;
      const perfect = puzzleInventory.filter(w => ((w as any).puzzleStats?.puzzleMasterLevel || 0) === 3).length;
      const favorites = puzzleInventory.filter(w => w.isFavorite === true).length;
      return { total, master, ultra, perfect, favorites };
    }
    const total = currentInventory.length;
    const master = currentInventory.filter(w => (w.masterLevel || 0) === 1).length;
    const ultra = currentInventory.filter(w => (w.masterLevel || 0) === 2).length;
    const perfect = currentInventory.filter(w => (w.masterLevel || 0) === 3).length;
    const favorites = currentInventory.filter(w => w.isFavorite === true).length;
    return { total, master, ultra, perfect, favorites };
  }, [currentInventory, puzzleInventory, activeTab]);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 1400);
  }, []);

  useEffect(() => {
    return () => {
      sound.stopSpeaking();
    };
  }, []);

  const speakFirstMeaning = useCallback((meaning?: string) => {
    const firstMeaning = getFirstMeaning(meaning || '');
    if (!firstMeaning) return;
    const now = Date.now();
    const last = lastMeaningSpokenRef.current;
    if (last && last.meaning === firstMeaning && now - last.time < 1000) return;
    lastMeaningSpokenRef.current = { meaning: firstMeaning, time: now };
    sound.speakWord(firstMeaning, 'tr-TR');
  }, []);

  // Swipe action = send back to farm
  const handleSwipeComplete = useCallback((word: WordModel) => {
    haptic.plantToFarm(); // 🌱 Premium dopamin pattern
    
    // 💰 Master/Ultra/Perfect kart ödülü hesapla
    const masterLevel = (word as any).masterLevel || 0;
    let rewardCoin = 0;
    let rewardXp = 0;
    if (masterLevel >= 3) { rewardCoin = 150; rewardXp = 150; } // Perfect
    else if (masterLevel >= 2) { rewardCoin = 100; rewardXp = 100; } // Ultra
    else if (masterLevel >= 1) { rewardCoin = 50; rewardXp = 50; } // Master
    
    plantFromInventory(word.id);
    sound.playPlant();
    speakFirstMeaning(word.meaning);
    
    // 💰 Ödül varsa toast göster
    if (rewardCoin > 0) {
      showRewardToast('coin', rewardCoin, `🌱 +${rewardCoin} coin!`);
      setTimeout(() => showRewardToast('xp', rewardXp, `⚡ +${rewardXp} XP!`), 200);
    }
    showToast('🌱 Tarlaya gönderildi!');
    
    // 🎓 Tutorial: STEP_13'te swipe yapınca STEP_14'e geç ve Farm'a git
    if (tutorialStep === 'STEP_13_SELECT_CARD') {
      setTutorialStep('STEP_14_REPLANT');
      // 🎯 Hemen Farm'a navigate et - STEP_14 dialog Farm'da gösterilecek
      setTimeout(() => {
        navigation.navigate('Farm' as never);
      }, 300);
    }
    
    // 🎓 Tutorial: STEP_14'te swipe yapınca STEP_16'ya geç ve Farm'a git
    if (tutorialStep === 'STEP_14_REPLANT') {
      setTimeout(() => {
        setTutorialStep('STEP_16_ULTRA_REACHED');
        navigation.navigate('Farm' as never);
      }, 500);
    }
  }, [plantFromInventory, showToast, tutorialStep, setTutorialStep, navigation, speakFirstMeaning]);

  // CTA button = send back to farm
  const handleReview = useCallback((word: WordModel) => {
    // 🎓 Tutorial: STEP_13 veya STEP_14'te butonu kilitle - sadece kaydırarak gönderebilsin!
    if (tutorialStep === 'STEP_13_SELECT_CARD' || tutorialStep === 'STEP_14_REPLANT') {
      haptic.warning();
      showToast('👈 Kaydırarak tarlaya gönder!');
      return; // Butonu engelle!
    }
    
    haptic.plantToFarm(); // 🌱 Premium dopamin pattern
    
    // 💰 Master/Ultra/Perfect kart ödülü hesapla
    const masterLevel = (word as any).masterLevel || 0;
    let rewardCoin = 0;
    let rewardXp = 0;
    if (masterLevel >= 3) { rewardCoin = 150; rewardXp = 150; } // Perfect
    else if (masterLevel >= 2) { rewardCoin = 100; rewardXp = 100; } // Ultra
    else if (masterLevel >= 1) { rewardCoin = 50; rewardXp = 50; } // Master
    
    plantFromInventory(word.id);
    sound.playPlant();
    speakFirstMeaning(word.meaning);
    
    // 💰 Ödül varsa toast göster
    if (rewardCoin > 0) {
      showRewardToast('coin', rewardCoin, `🌱 +${rewardCoin} coin!`);
      setTimeout(() => showRewardToast('xp', rewardXp, `⚡ +${rewardXp} XP!`), 200);
    }
    showToast('🌱 Tarlaya gönderildi!');
  }, [plantFromInventory, showToast, tutorialStep, speakFirstMeaning]);

  // Kartın tema rengini hesapla (UltimateWordCard ile aynı mantık)
  const getCardTheme = (word: any) => {
    const masterLevel = word.masterLevel || 0;
    const wrongCount = word.wrongCount || 0;
    
    if (masterLevel === 3) return 'perfect';
    if (masterLevel === 2) return 'ultra';
    if (masterLevel === 1) return 'master';
    if (wrongCount >= 2) return 'green';
    if (wrongCount >= 2) return 'yellow';
    if (wrongCount >= 1) return 'orange';
    return 'red';
  };

  // 📖 Kart tıklama - Feed aç
  const handleWordPress = useCallback((word: WordModel, index: number) => {
    // 🎓 Tutorial sırasında feed açmayı engelle - sadece swipe çalışsın
    if (tutorialStep === 'STEP_13_SELECT_CARD') {
      return;
    }
    
    // 🎯 FEED: Tıklanan kart ilk sırada, geri kalanı rastgele
    // 1. Tıklanan kelimeyi ayır
    const clickedWord = word;
    const otherWords = filteredWords.filter(w => w.id !== word.id);
    
    // 2. Diğer kelimeleri shuffle et (Fisher-Yates)
    const shuffledOthers = [...otherWords];
    for (let i = shuffledOthers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
    }
    
    // 3. Tıklanan kelime başta, sonra shuffle edilmiş diğerleri
    const feedDataWithClickedFirst = [clickedWord, ...shuffledOthers];
    
    // 4. Feed state'i güncelle
    setShuffledFeedData(feedDataWithClickedFirst);
    setFeedStartIndex(0); // İlk kart her zaman index 0
    setFeedVisible(true);
    haptic.medium();
  }, [tutorialStep, filteredWords]);

  // 📖 Kart önizleme - feed'e yönlendirme
  const handlePreview = useCallback((word: WordModel) => {
    const index = filteredWords.findIndex(w => w.id === word.id);
    handleWordPress(word, index >= 0 ? index : 0);
  }, [filteredWords, handleWordPress]);

  // Feed'de tarlaya gönder
  const handleFeedPlantToFarm = useCallback((wordId: string) => {
    haptic.plantToFarm(); // 🌱 Premium dopamin pattern
    
    // 💰 Kelimeyi bul ve ödül hesapla
    const word = shuffledFeedData.find(w => w.id === wordId);
    const masterLevel = (word as any)?.masterLevel || 0;
    let rewardCoin = 0;
    let rewardXp = 0;
    if (masterLevel >= 3) { rewardCoin = 150; rewardXp = 150; } // Perfect
    else if (masterLevel >= 2) { rewardCoin = 100; rewardXp = 100; } // Ultra
    else if (masterLevel >= 1) { rewardCoin = 50; rewardXp = 50; } // Master
    
    plantFromInventory(wordId);
    sound.playPlant();
    speakFirstMeaning(word?.meaning);
    
    // 💰 Ödül varsa toast göster
    if (rewardCoin > 0) {
      showRewardToast('coin', rewardCoin, `🌱 +${rewardCoin} coin!`);
      setTimeout(() => showRewardToast('xp', rewardXp, `⚡ +${rewardXp} XP!`), 200);
    }
    showToast('🌱 Tarlaya gönderildi!');
    
    // 🔄 Feed datasından kartı çıkar
    setShuffledFeedData(prev => prev.filter(w => w.id !== wordId));
    
    // 🎓 Tutorial: STEP_14'te "Tarlaya Gönder" basınca STEP_16'ya geç ve Farm'a git
    // Kaydırma ve buton aynı step'e gitmeli - STEP_16_ULTRA_REACHED (çiftlik açıklaması)
    if (tutorialStep === 'STEP_14_REPLANT') {
      setFeedVisible(false);
      setTimeout(() => {
        setTutorialStep('STEP_16_ULTRA_REACHED');
        navigation.navigate('Farm');
      }, 500);
    }
  }, [plantFromInventory, showToast, tutorialStep, setFeedVisible, setTutorialStep, navigation, shuffledFeedData, speakFirstMeaning]);

  // Feed kapat - feed'de seçili kartı grid'de locate et
  const handleCloseFeed = useCallback(() => {
    if (currentFeedCardId) {
      // 🎯 Şu anda görülen kartı grid'de bul
      const cardIndex = filteredWords.findIndex(w => w.id === currentFeedCardId);
      
      // 📌 Kartın hangi kategoride olduğunu tespit et
      let targetTab: 'words' | 'phrasal' | 'puzzle' = activeTab;
      const card = filteredWords[cardIndex];
      
      if (card) {
        // Puzzle'da mı?
        if ((card as any).isPuzzleHarvested === true) {
          targetTab = 'puzzle';
        } else if (card.isPhrasalVerb === true) {
          targetTab = 'phrasal';
        } else {
          targetTab = 'words';
        }
        
        // Tab değiştirme gerekiyorsa, değiştir
        if (targetTab !== activeTab) {
          setActiveTab(targetTab);
          // Tab değişirken filteredWords güncelleneceğinden, setTimeout ile bekleyin
          setTimeout(() => {
            // Tab değiştikten sonra, yeni filteredWords'de kartı bul ve kaydır
            if (gridListRef.current) {
              // Yeni tab'daki filtre ve sıralamaya göre index bul
              // Bunun için currentFeedCardId ile arama yap (kartın ID'si değişmez)
              const allInventory = targetTab === 'puzzle' ? puzzleInventory : 
                                   (targetTab === 'phrasal' ? phrasalInventoryFiltered : wordsInventory);
              const newIndex = allInventory.findIndex(w => w.id === currentFeedCardId);
              if (newIndex >= 0) {
                gridListRef.current.scrollToIndex({ index: newIndex, animated: true });
              }
            }
          }, 100);
        } else if (cardIndex >= 0 && gridListRef.current) {
          // Aynı tab'da, direkt scroll
          gridListRef.current.scrollToIndex({ index: cardIndex, animated: true });
        }
      }
    }
    
    setFeedVisible(false);
    setCurrentFeedCardId(null);
  }, [currentFeedCardId, filteredWords, activeTab, wordsInventory, phrasalInventoryFiltered, puzzleInventory]);

  const renderCard = useCallback(({ item, index }: { item: WordModel; index: number }) => {
    // 🎓 TUTORIAL: Vurgulanan kart mı?
    const isHighlighted = isTutorialCardSelectStep && item.id === tutorialHighlightedWordId;
    
    return (
      <View style={[styles.cardWrapper, { width: cardWidth }]}>
        <SwipeableCard
          word={item}
          index={index}
          cardWidth={cardWidth}
          onSwipeComplete={handleSwipeComplete}
          onReview={handleReview}
          onPreview={handlePreview}
          globalStreak={streak}
          tutorialHighlight={isHighlighted}
        />
      </View>
    );
  }, [handleReview, handleSwipeComplete, handlePreview, streak, isTutorialCardSelectStep, tutorialHighlightedWordId, cardWidth]);

  const keyExtractor = useCallback((item: WordModel) => item.id, []);

  const isFilterPanelVisible = isHeaderVisible && isTabsVisible;
  const headerOpacity = headerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.2, 1],
    extrapolate: 'clamp',
  });
  const headerMaxHeight = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 172],
    extrapolate: 'clamp',
  });
  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
    extrapolate: 'clamp',
  });
  const tabsOpacity = tabsAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.2, 1],
    extrapolate: 'clamp',
  });
  const tabsMaxHeight = tabsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, IS_TABLET ? 72 : IS_SMALL_SCREEN ? 56 : 60],
    extrapolate: 'clamp',
  });
  const tabsTranslateY = tabsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
    extrapolate: 'clamp',
  });
  const controlRowTopSpacing = Math.max(insets.top + 6, 10);


  return (
    <View style={styles.container}>
      {/* 📦 ENVANTER QUIZ DIALOG */}
      <InventoryQuizDialog
        visible={showInventoryQuiz}
        onClose={() => setShowInventoryQuiz(false)}
        words={masterCards}
        allWords={allWordsForOptions}
        onQuizComplete={handleInventoryQuizComplete}
      />
      
      {/* Animated background gradient */}
      <LinearGradient
        colors={[COLORS.background, '#0a0f1a', COLORS.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* 📊 STATS HEADER - Premium Filter Bar */}
      <Animated.View
        style={[
          styles.headerAnimatedContainer,
          {
            opacity: headerOpacity,
            maxHeight: headerMaxHeight,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
        pointerEvents={isHeaderVisible ? 'auto' : 'none'}
      >
      <View style={styles.statsHeader}>
        <LinearGradient
          colors={headerTheme.farmInventoryHeaderGradient}
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
          {/* 📦 Tümü */}
          <TouchableOpacity
            style={[
              styles.premiumFilterBtn,
              filter === 'all' && styles.premiumFilterBtnActive,
              filter === 'all' && themedActiveFilterStyle,
            ]}
            onPress={() => { setFilter('all'); haptic.light(); }}
          >
            <Package size={IS_TINY_SCREEN ? 14 : 16} color={filter === 'all' ? headerTheme.filterAllActiveColor : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'all' && { color: headerTheme.filterAllActiveColor }]}>{stats.total}</Text>
          </TouchableOpacity>

          {/* 🏆 Altın */}
          <TouchableOpacity
            style={[
              styles.premiumFilterBtn,
              filter === 'master' && styles.premiumFilterBtnActive,
              filter === 'master' && themedActiveFilterStyle,
              tutorialStep !== 'COMPLETED' && { opacity: 0.3 },
            ]}
            onPress={() => { 
              if (tutorialStep !== 'COMPLETED') {
                haptic.light();
                return;
              }
              setFilter('master'); 
              haptic.light(); 
            }}
            disabled={tutorialStep !== 'COMPLETED'}
          >
            <Trophy size={IS_TINY_SCREEN ? 14 : 16} color={filter === 'master' ? "#fbbf24" : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'master' && { color: '#fbbf24' }]}>{stats.master}</Text>
            {tutorialStep !== 'COMPLETED' && <Lock size={8} color="#888" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>

          {/* 💎 Elmas */}
          <TouchableOpacity
            style={[
              styles.premiumFilterBtn,
              filter === 'ultra' && styles.premiumFilterBtnActive,
              filter === 'ultra' && themedActiveFilterStyle,
              tutorialStep !== 'COMPLETED' && { opacity: 0.3 },
            ]}
            onPress={() => { 
              if (tutorialStep !== 'COMPLETED') {
                haptic.light();
                return;
              }
              setFilter('ultra'); 
              haptic.light(); 
            }}
            disabled={tutorialStep !== 'COMPLETED'}
          >
            <Gem size={IS_TINY_SCREEN ? 14 : 16} color={filter === 'ultra' ? "#22d3ee" : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'ultra' && { color: '#22d3ee' }]}>{stats.ultra}</Text>
            {tutorialStep !== 'COMPLETED' && <Lock size={8} color="#888" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>

          {/* 👑 Kraliyet */}
          <TouchableOpacity
            style={[
              styles.premiumFilterBtn,
              filter === 'perfect' && styles.premiumFilterBtnActive,
              filter === 'perfect' && themedActiveFilterStyle,
              tutorialStep !== 'COMPLETED' && { opacity: 0.3 },
            ]}
            onPress={() => { 
              if (tutorialStep !== 'COMPLETED') {
                haptic.light();
                return;
              }
              setFilter('perfect'); 
              haptic.light(); 
            }}
            disabled={tutorialStep !== 'COMPLETED'}
          >
            <Crown size={IS_TINY_SCREEN ? 14 : 16} color={filter === 'perfect' ? "#a855f7" : "#888"} strokeWidth={2.5} />
            <Text style={[styles.premiumFilterCount, filter === 'perfect' && { color: '#a855f7' }]}>{stats.perfect}</Text>
            {tutorialStep !== 'COMPLETED' && <Lock size={8} color="#888" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>

          {/* ❤️ Favoriler */}
          <TouchableOpacity
            style={[
              styles.premiumFilterBtn,
              filter === 'favorites' && styles.premiumFilterBtnActive,
              filter === 'favorites' && themedActiveFilterStyle,
              tutorialStep !== 'COMPLETED' && { opacity: 0.3 },
            ]}
            onPress={() => { 
              if (tutorialStep !== 'COMPLETED') {
                haptic.light();
                return;
              }
              setFilter('favorites'); 
              haptic.light(); 
            }}
            disabled={tutorialStep !== 'COMPLETED'}
          >
            <Heart size={IS_TINY_SCREEN ? 14 : 16} color={filter === 'favorites' ? "#FF2D55" : "#888"} strokeWidth={2.5} fill={filter === 'favorites' ? "#FF2D55" : "transparent"} />
            {tutorialStep !== 'COMPLETED' && <Lock size={8} color="#888" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>

          {/* ✏️ Kendi Kelimelerim */}
          <TouchableOpacity
            style={[
              styles.premiumFilterBtn,
              filter === 'custom' && styles.premiumFilterBtnActive,
              filter === 'custom' && themedActiveFilterStyle,
              tutorialStep !== 'COMPLETED' && { opacity: 0.3 },
            ]}
            onPress={() => { 
              if (tutorialStep !== 'COMPLETED') {
                haptic.light();
                return;
              }
              setFilter('custom'); 
              haptic.light(); 
            }}
            disabled={tutorialStep !== 'COMPLETED'}
          >
            <Text style={{ fontSize: IS_TINY_SCREEN ? 14 : 16 }}>✏️</Text>
            {tutorialStep !== 'COMPLETED' && <Lock size={8} color="#888" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.premiumFilterDivider} />

          {/* 🔍 Search */}
          <TouchableOpacity
            style={[styles.premiumFilterBtn, tutorialStep !== 'COMPLETED' && { opacity: 0.3 }]}
            onPress={() => { 
              if (tutorialStep !== 'COMPLETED') {
                haptic.light();
                return;
              }
              setSearchVisible(!searchVisible); 
              haptic.light(); 
            }}
            disabled={tutorialStep !== 'COMPLETED'}
          >
            <Search size={IS_TINY_SCREEN ? 14 : 16} color="#fff" strokeWidth={2.5} />
            {tutorialStep !== 'COMPLETED' && <Lock size={8} color="#fff" style={{ position: 'absolute', top: 2, right: 2 }} />}
          </TouchableOpacity>
        </ScrollView>
      </View>
      </Animated.View>

      <View style={[styles.sectionToggleRow, { top: controlRowTopSpacing }]} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.sectionToggleChip, isNavbarVisible && styles.sectionToggleChipActive]}
          onPress={toggleNavbarVisibility}
          activeOpacity={0.85}
        >
          {isNavbarVisible ? (
            <ChevronDown size={18} color="#ffffff" />
          ) : (
            <ChevronUp size={18} color="rgba(255,255,255,0.88)" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionToggleChip, isFilterPanelVisible && styles.sectionToggleChipActive]}
          onPress={toggleInventoryFiltersVisibility}
          activeOpacity={0.85}
        >
          {isFilterPanelVisible ? (
            <ChevronDown size={18} color="#ffffff" />
          ) : (
            <ChevronUp size={18} color="rgba(255,255,255,0.88)" />
          )}
        </TouchableOpacity>
      </View>

      {/* 🎯 TAB SWITCHER - Apple Segment Control */}
      <Animated.View
        style={[
          styles.tabsAnimatedContainer,
          {
            opacity: tabsOpacity,
            maxHeight: tabsMaxHeight,
            transform: [{ translateY: tabsTranslateY }],
            marginBottom: isTabsVisible ? 8 : 0,
          },
        ]}
        pointerEvents={isTabsVisible ? 'auto' : 'none'}
      >
      <View style={styles.tabContainer}>
        {/* WORDS TAB */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'words' && styles.tabButtonActive
          ]}
          onPress={() => { setActiveTab('words'); globalTabState.current = 'words'; navigation.setParams({ tab: 'words' } as any); haptic.light(); }}
          activeOpacity={0.7}
        >
          {activeTab === 'words' && (
            <LinearGradient
              colors={['#9333ea', '#7e22ce']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Package
            size={IS_TINY_SCREEN ? 16 : IS_SMALL_SCREEN ? 18 : 20}
            color={activeTab === 'words' ? '#fff' : '#6b7280'}
            strokeWidth={2.5}
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'words' && styles.tabButtonTextActive
          ]}>
            Kelimeler
          </Text>
        </TouchableOpacity>

        {/* PHRASAL TAB */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'phrasal' && styles.tabButtonActive,
          ]}
          onPress={() => { 
            if (tutorialStep !== 'COMPLETED') {
              haptic.light();
              return;
            }
            setActiveTab('phrasal'); globalTabState.current = 'phrasal'; navigation.setParams({ tab: 'phrasal' } as any); haptic.light(); 
          }}
          disabled={tutorialStep !== 'COMPLETED'}
          activeOpacity={0.7}
        >
          {activeTab === 'phrasal' && (
            <LinearGradient
              colors={['#9333ea', '#7e22ce']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={{ position: 'relative' }}>
            <BookOpen
              size={IS_TINY_SCREEN ? 16 : IS_SMALL_SCREEN ? 18 : 20}
              color={activeTab === 'phrasal' ? '#fff' : tutorialStep !== 'COMPLETED' ? '#4b5563' : '#6b7280'}
              strokeWidth={2.5}
            />
            {tutorialStep !== 'COMPLETED' && (
              <Lock size={10} color="#4b5563" style={{ position: 'absolute', top: -4, right: -4 }} />
            )}
          </View>
          <Text style={[
            styles.tabButtonText,
            activeTab === 'phrasal' && styles.tabButtonTextActive,
            tutorialStep !== 'COMPLETED' && { color: '#4b5563' }
          ]}>
            Phrasal
          </Text>
        </TouchableOpacity>

        {/* PUZZLE TAB */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'puzzle' && styles.tabButtonActive,
          ]}
          onPress={() => { 
            if (tutorialStep !== 'COMPLETED') {
              haptic.light();
              return;
            }
            setActiveTab('puzzle'); globalTabState.current = 'puzzle'; navigation.setParams({ tab: 'puzzle' } as any); haptic.light(); 
          }}
          disabled={tutorialStep !== 'COMPLETED'}
          activeOpacity={0.7}
        >
          {activeTab === 'puzzle' && (
            <LinearGradient
              colors={['#9333ea', '#7e22ce']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={{ position: 'relative' }}>
            <Puzzle
              size={IS_TINY_SCREEN ? 16 : IS_SMALL_SCREEN ? 18 : 20}
              color={activeTab === 'puzzle' ? '#fff' : tutorialStep !== 'COMPLETED' ? '#4b5563' : '#6b7280'}
              strokeWidth={2.5}
            />
            {tutorialStep !== 'COMPLETED' && (
              <Lock size={10} color="#4b5563" style={{ position: 'absolute', top: -4, right: -4 }} />
            )}
          </View>
          <Text style={[
            styles.tabButtonText,
            activeTab === 'puzzle' && styles.tabButtonTextActive,
            tutorialStep !== 'COMPLETED' && { color: '#4b5563' }
          ]}>
            Yapboz
          </Text>
        </TouchableOpacity>
      </View>
      </Animated.View>

      {/* ☁️ CloudTip - TABLARIN ALTINDA */}
      {showInventoryCloudTip && (
        <CuteCloudTip
          message={"Hasatlar\u0131n\u0131 burada y\u00F6netirsin. Buradan tekrar tarlaya dikip \u00E7al\u0131\u015Ft\u0131k\u00E7a meyvelerin b\u00FCy\u00FCr. Olgunla\u015F\u0131nca hasat edersin. Hasat ettik\u00E7e de \u00F6\u011Frenirsin."}
          visible={showInventoryCloudTip}
          onDismiss={() => setCloudTipDismissed('inventory', true)}
          accentColor="#22c55e"
        />
      )}

      {/* Inline Search */}
      <View style={styles.filterContainer}>
        {searchVisible && (
          <View style={styles.inlineSearchWrapper}>
            <TextInput
              style={styles.inlineSearchInput}
              placeholder="Kelime ara..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              selectionColor={COLORS.purple}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.inlineSearchClear}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.inlineSearchClearIcon}>✕</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.inlineSearchClose}
              onPress={() => {
                setSearchVisible(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.inlineSearchCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 🃏 Card Grid - Tüm tablar için aynı yapı */}
      <Animated.View style={[styles.scrollContainer, { opacity: fadeAnim }]}>
        {filteredWords.length > 0 ? (
          <GestureHandlerRootView style={{ flex: 1 }}>
            <FlashList
              ref={gridListRef}
              data={filteredWords}
              renderItem={renderCard}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              key={`inventory-${numColumns}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              extraData={`${activeTab}-${numColumns}`}
            />
          </GestureHandlerRootView>
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.05)', 'transparent']}
              style={styles.emptyGlow}
            />
            <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={['rgba(168, 85, 247, 0.3)', 'rgba(168, 85, 247, 0.1)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Package size={56} color="#a855f7" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'puzzle' 
                  ? (puzzleInventory.length === 0 ? '🧩 Yapboz Envanteri Boş' : '🔍 Kelime Bulunamadı')
                  : ((activeTab === 'words' ? inventory.length : phrasalVerbInventory.length) === 0 
                    ? '📦 Envanter Boş' 
                    : '🔍 Kelime Bulunamadı')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'puzzle'
                  ? (puzzleInventory.length === 0 
                    ? 'Yapboz oyununda kelimeleri Altın seviyeye getir! Her usta bir hazine.' 
                    : 'Bu filterede kelime yok. Farklı bir kategori dene!')
                  : ((activeTab === 'words' ? inventory.length : phrasalVerbInventory.length) === 0 
                    ? 'Tarlada kelimeleri usta seviyesine getir ve hasat et! Her hasat bir hazine.' 
                    : 'Bu filterede kelime yok. Farklı bir kategori dene!')}
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Farm' as never)}
              >
                <LinearGradient 
                  colors={['#a855f7', '#9333ea', '#7c3aed']} 
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.emptyButtonText}>✨ Tarlaya Git</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

      {/* 📖 Feed Modal - Instagram Reels tarzı */}
      <Modal
        visible={feedVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseFeed}
      >
        <View style={styles.feedContainer}>
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

          <FlashList
            data={shuffledFeedData}
            renderItem={({ item }) => (
              <FeedCard
                word={item}
                onPlantToFarm={handleFeedPlantToFarm}
                onToggleFavorite={toggleFavorite}
              />
            )}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            drawDistance={SCREEN_HEIGHT}
            initialScrollIndex={0}
            onViewableItemsChanged={({ viewableItems }) => {
              // 📌 Feed'de görünen kart değişirse, state'i güncelle
              if (viewableItems && viewableItems.length > 0) {
                setCurrentFeedCardId(viewableItems[0].item.id);
              }
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          />
        </View>
      </Modal>

      {/* Toast Message */}
      {toastMessage && (
        <Animated.View style={styles.toastContainer}>
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            style={styles.toast}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================
// 🎨 STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAnimatedContainer: {
    overflow: 'hidden',
  },
  sectionToggleRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionToggleChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(7, 12, 22, 0.5)',
  },
  sectionToggleChipActive: {
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(12, 20, 34, 0.66)',
  },

  // 📊 STATS HEADER - Premium Filter Bar (FarmScreen ile aynı)
  statsHeader: {
    paddingTop: Platform.OS === 'ios' ? (IS_TINY_SCREEN ? 38 : 46) : (IS_TINY_SCREEN ? 22 : 26),
    paddingBottom: IS_TINY_SCREEN ? 8 : 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  premiumFilterScroll: {
    paddingHorizontal: IS_TINY_SCREEN ? 10 : 14,
    gap: IS_TINY_SCREEN ? 6 : 8,
    alignItems: 'center',
  },
  premiumFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_TINY_SCREEN ? 4 : 5,
    paddingHorizontal: IS_TINY_SCREEN ? 10 : 12,
    paddingVertical: IS_TINY_SCREEN ? 8 : 10,
    borderRadius: IS_TINY_SCREEN ? 12 : 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  premiumFilterBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumFilterCount: {
    fontSize: IS_TINY_SCREEN ? 12 : 14,
    fontWeight: '800',
    color: '#888',
  },
  premiumFilterDivider: {
    width: 1,
    height: IS_TINY_SCREEN ? 20 : 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: IS_TINY_SCREEN ? 4 : 6,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    marginRight: 4,
  },
  tabsAnimatedContainer: {
    overflow: 'hidden',
  },

  // 🎯 TAB SWITCHER - Apple Segment Control
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: IS_TABLET ? 20 : IS_SMALL_SCREEN ? 12 : 16,
    marginTop: IS_TABLET ? 10 : IS_SMALL_SCREEN ? 6 : 8,
    marginBottom: IS_TABLET ? 10 : IS_SMALL_SCREEN ? 6 : 8,
    height: IS_TABLET ? 60 : IS_SMALL_SCREEN ? 44 : 48,
    backgroundColor: 'rgba(30, 30, 35, 0.95)',
    borderRadius: IS_TABLET ? 16 : IS_SMALL_SCREEN ? 12 : 14,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: IS_TINY_SCREEN ? 4 : 6,
    borderRadius: IS_TABLET ? 13 : IS_SMALL_SCREEN ? 9 : 11,
    overflow: 'hidden',
  },
  tabButtonActive: {
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabButtonText: {
    fontSize: IS_TINY_SCREEN ? 11 : IS_SMALL_SCREEN ? 12 : 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // 🔍 FILTER CONTAINER
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },

  // 🔎 INLINE SEARCH
  inlineSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    padding: 0,
  },
  inlineSearchClear: {
    marginLeft: 8,
    padding: 4,
  },
  inlineSearchClearIcon: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  inlineSearchClose: {
    marginLeft: 8,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  inlineSearchCloseIcon: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },

  // 📜 SCROLL CONTAINER
  scrollContainer: {
    flex: 1,
  },

  // 📖 FEED MODAL
  feedContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  feedCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  feedItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: RS.feed.padding,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // Arka planı kapat
  },

  // 🍎 APPLE CARD (Full Screen Feed Card)
  appleCard: {
    width: RS.feed.maxWidth,
    borderRadius: RS.feed.borderRadius,
    padding: RS.feed.cardPadding,
    borderWidth: 2,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden', // İçerik taşmasını engelle
  },
  appleFavorite: {
    position: 'absolute',
    top: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 12 : 16,
    left: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 12 : 16,
    width: IS_TINY_SCREEN ? 32 : IS_SMALL_SCREEN ? 36 : 44,
    height: IS_TINY_SCREEN ? 32 : IS_SMALL_SCREEN ? 36 : 44,
    borderRadius: IS_TINY_SCREEN ? 16 : IS_SMALL_SCREEN ? 18 : 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Kelime + PV inline container
  wordWithPvContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: IS_TINY_SCREEN ? 6 : 8,
    marginTop: IS_TINY_SCREEN ? 4 : 6,
  },
  inlinePvBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.6)',
    paddingHorizontal: IS_TINY_SCREEN ? 6 : IS_SMALL_SCREEN ? 7 : 8,
    paddingVertical: IS_TINY_SCREEN ? 2 : 3,
    borderRadius: IS_TINY_SCREEN ? 4 : 5,
  },
  inlinePvBadgeText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: IS_TINY_SCREEN ? 10 : IS_SMALL_SCREEN ? 11 : 12,
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  appleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  inventoryBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  inventoryBadgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  puzzleFeedBadge: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  puzzleFeedBadgeText: {
    fontSize: 14,
  },
  appleBadgeEmoji: {
    fontSize: 16,
  },
  appleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  appleWord: {
    fontSize: RS.feed.wordSize,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: IS_TINY_SCREEN ? 8 : 12,
  },
  appleMeaning: {
    fontSize: RS.feed.meaningSize,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: IS_TINY_SCREEN ? 12 : 20,
    lineHeight: IS_TINY_SCREEN ? 20 : 26,
  },
  appleExample: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  appleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  appleStat: {
    alignItems: 'center',
  },
  appleStatNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  appleStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  appleStatDivider: {
    width: 1,
    height: 24,
    opacity: 0.3,
  },
  appleButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  appleButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  appleButtonHint: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },

  // 🎯 ACTION PILL
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // 🏷️ FILTER TAB
  filterTabWrapper: {
    position: 'relative',
  },
  filterGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    opacity: 0.6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: RS.filter.paddingH,
    paddingVertical: RS.filter.paddingV,
    borderRadius: RS.filter.borderRadius,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: RS.filter.gap,
    overflow: 'hidden',
  },
  filterTabActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  staticFilterShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterTabText: {
    fontSize: RS.filter.fontSize,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  filterTabTextActive: {
    color: '#34C759',
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: RS.filter.badgePaddingH,
    paddingVertical: RS.filter.badgePaddingV,
    borderRadius: RS.filter.badgeRadius,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.25)',
  },
  filterBadgeText: {
    fontSize: RS.filter.badgeSize,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  filterBadgeTextActive: {
    color: '#34C759',
  },

  // Old styles for compatibility
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  tabTextActive: {
    color: '#22c55e',
    fontWeight: '700',
  },

  // Mini Stats Row
  miniStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    borderWidth: 1,
  },
  miniStatText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Filter Pills
  filterPillsContainer: {
    gap: 6,
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  filterPillTextActive: {
    color: COLORS.purple,
    fontWeight: '700',
  },

  // Search - Juicy FarmScreen style responsive

  // List
  columnWrapper: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 10 : 12,
    justifyContent: 'space-between',
    marginBottom: SCREEN_WIDTH < 375 ? 10 : 12,
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingHorizontal: SCREEN_WIDTH < 375 ? 4 : 6,
  },

  // Card Wrapper - responsive (dinamik olarak component'te hesaplanıyor)
  cardWrapper: {
    padding: RS.wrapper.padding,
    position: 'relative',
    minHeight: RS.wrapper.minHeight,
  },

  // 🌱 Swipe Action Container (Behind Card)
  swipeActionContainer: {
    ...StyleSheet.absoluteFillObject,
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeActionBg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  swipeActionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ✨ Shimmer Overlay
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: CARD_WIDTH * 2,
    opacity: 0.6,
  },

  // Card - responsive
  cardContainer: {
    flex: 1,
    zIndex: 1,
  },
  card: {
    borderRadius: RS.card.borderRadius,
    padding: RS.card.padding,
    minHeight: RS.card.minHeight,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  masterGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },

  // Master Badge
  masterBadge: {
    position: 'absolute',
    top: IS_TINY_SCREEN ? 6 : 8,
    right: IS_TINY_SCREEN ? 6 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_TINY_SCREEN ? 5 : 8,
    paddingVertical: IS_TINY_SCREEN ? 2 : 4,
    borderRadius: IS_TINY_SCREEN ? 6 : 8,
    borderWidth: 1,
    gap: IS_TINY_SCREEN ? 2 : 4,
  },
  masterBadgeText: {
    fontSize: IS_TINY_SCREEN ? 7 : 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Color Badge
  colorBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: IS_TINY_SCREEN ? 6 : 8,
    paddingVertical: IS_TINY_SCREEN ? 2 : 3,
    borderRadius: IS_TINY_SCREEN ? 4 : 6,
    marginBottom: IS_TINY_SCREEN ? 6 : 8,
    marginTop: IS_TINY_SCREEN ? 22 : 28, // harvestBadge ile çakışmasın
  },
  colorBadgeText: {
    fontSize: RS.card.badgeSize,
    fontWeight: '700',
    color: '#fff',
  },

  // Harvest Badge
  harvestBadge: {
    position: 'absolute',
    top: IS_TINY_SCREEN ? 6 : 8,
    left: IS_TINY_SCREEN ? 6 : 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: IS_TINY_SCREEN ? 4 : 6,
    paddingVertical: IS_TINY_SCREEN ? 1 : 2,
    borderRadius: IS_TINY_SCREEN ? 4 : 6,
  },
  harvestText: {
    fontSize: IS_TINY_SCREEN ? 8 : 9,
    fontWeight: '700',
    color: COLORS.gold,
  },

  // Word - responsive
  wordText: {
    fontSize: RS.card.wordSize,
    fontWeight: '800',
    color: '#fff',
    marginBottom: IS_TINY_SCREEN ? 2 : 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  meaningText: {
    fontSize: RS.card.meaningSize,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: IS_TINY_SCREEN ? 12 : 14,
    marginBottom: IS_TINY_SCREEN ? 4 : 6,
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: IS_TINY_SCREEN ? 4 : 6,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: RS.card.statSize,
    fontWeight: '700',
  },

  // Quick Send Button
  quickSendButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingVertical: RS.quickSend.paddingV,
    paddingHorizontal: IS_TINY_SCREEN ? 8 : 12,
    borderRadius: RS.quickSend.borderRadius,
    alignItems: 'center',
    marginTop: IS_TINY_SCREEN ? 2 : 4,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  quickSendText: {
    fontSize: RS.quickSend.fontSize,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Empty State - Premium Design
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '20%',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  emptyButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  emptyButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Toast styles
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  // 📖 Preview Modal Styles - ENHANCED JUICY DESIGN
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewCard: {
    width: '100%',
    maxWidth: 420,
    height: '85%',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 20,
    // Glass morphism effect
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  previewCardSmall: {
    maxWidth: 360,
    height: '90%',
  },
  previewGradient: {
    flex: 1,
    width: '100%',
  },
  previewClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // 🎯 Badge Styles
  previewBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignSelf: 'center',
  },
  previewDifficultyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  previewDifficultyText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  previewMasterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    borderWidth: 2,
    borderColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  previewMasterText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fef3c7',
    letterSpacing: 0.5,
  },
  previewWord: {
    fontSize: 46,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    marginBottom: 6,
  },
  previewWordSmall: {
    fontSize: 36,
  },
  previewTapHint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  previewSuccessRate: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 16,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  previewSuccessText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#86efac',
    letterSpacing: 0.5,
  },
  previewMeaningBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 10,
  },
  previewMeaningHeader: {
    alignItems: 'center',
  },
  previewMeaningLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  previewMeaning: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  previewMeaningSmall: {
    fontSize: 16,
  },
  previewExampleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  previewExampleText: {
    fontSize: 15,
    color: '#e2e8f0',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  // 📊 Stats Grid - Instagram Reels Style
  previewStatsGrid: {
    width: '100%',
    gap: 12,
  },
  previewStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewStatCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 6,
  },
  previewStatCardGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  previewStatCardLevel: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.5)',
  },
  previewStatCardGold: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  previewStatCardStreak: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  previewStatEmoji: {
    fontSize: 28,
  },
  previewStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  previewStatLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  previewFavoriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  previewFavoriteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
});
