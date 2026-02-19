import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  Platform,
  PanResponder,
  Modal,
  InteractionManager,
  ScrollView,
  Animated as RNAnimated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BookOpen, Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { getFirstMeaning } from '../utils/loadWords';
import { MiniQuizDialog } from '../components/MiniQuizDialog';
import { showRewardToast, RewardToastContainer } from '../components/RewardToast';
import { UltimateWordCard } from '../components/UltimateWordCard';
import type { WordModel } from '../models/types';
import { usePerformanceStore } from '../store/performanceStore';
import { CuteCloudTip } from '../components/CuteCloudTip';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const SCREEN_HEIGHT = height;
const IS_SMALL_SCREEN = height < 700;
const IS_TINY_SCREEN = height < 600;

// Tablet detection
const IS_TABLET = width > 768;
const FEED_CARD_MAX_WIDTH = IS_TABLET ? 500 : width - 40;

// Filter tipi - FarmScreen ile birebir aynı
type FilterType = 'all' | 'ready' | 'study' | 'master' | 'favorites';
type SortMode = 'newest' | 'oldest' | 'a-z' | 'z-a' | null;

// TEMA SİSTEMİ - UltimateWordCard ile senkronize
const FEED_THEMES = {
  red: {
    gradient: ['rgba(127, 29, 29, 0.95)', 'rgba(153, 27, 27, 0.9)', 'rgba(127, 29, 29, 0.95)'] as const,
    border: 'rgba(239, 68, 68, 0.8)',
    glow: '#ef4444',
    textMain: '#fecaca',
    textSecondary: '#fca5a5',
    accent: '#ef4444',
    emoji: '\u{1F534}',
  },
  orange: {
    gradient: ['rgba(124, 45, 18, 0.95)', 'rgba(154, 52, 18, 0.9)', 'rgba(124, 45, 18, 0.95)'] as const,
    border: 'rgba(249, 115, 22, 0.8)',
    glow: '#f97316',
    textMain: '#fed7aa',
    textSecondary: '#fdba74',
    accent: '#f97316',
    emoji: '\u{1F7E0}',
  },
  yellow: {
    gradient: ['rgba(113, 63, 18, 0.95)', 'rgba(133, 77, 14, 0.9)', 'rgba(113, 63, 18, 0.95)'] as const,
    border: 'rgba(234, 179, 8, 0.8)',
    glow: '#eab308',
    textMain: '#fef08a',
    textSecondary: '#fde047',
    accent: '#eab308',
    emoji: '\u{1F7E1}',
  },
  green: {
    gradient: ['rgba(20, 83, 45, 0.95)', 'rgba(6, 95, 70, 0.9)', 'rgba(20, 83, 45, 0.95)'] as const,
    border: 'rgba(34, 197, 94, 0.8)',
    glow: '#22c55e',
    textMain: '#dcfce7',
    textSecondary: '#bbf7d0',
    accent: '#22c55e',
    emoji: '\u{2705}',
  },
  master: {
    gradient: ['rgba(161, 98, 7, 0.95)', 'rgba(202, 138, 4, 0.9)', 'rgba(161, 98, 7, 0.95)'] as const,
    border: 'rgba(250, 204, 21, 0.9)',
    glow: '#ffd700',
    textMain: '#fef9c3',
    textSecondary: '#fef08a',
    accent: '#facc15',
    emoji: '\u{1F3C6}',
  },
  ultra: {
    gradient: ['rgba(8, 145, 178, 0.95)', 'rgba(6, 182, 212, 0.9)', 'rgba(59, 130, 246, 0.95)'] as const,
    border: 'rgba(34, 211, 238, 0.9)',
    glow: '#22d3ee',
    textMain: '#cffafe',
    textSecondary: '#a5f3fc',
    accent: '#22d3ee',
    emoji: '\u{1F48E}',
  },
  perfect: {
    gradient: ['rgba(168, 85, 247, 0.95)', 'rgba(192, 132, 252, 0.9)', 'rgba(139, 92, 246, 0.95)'] as const,
    border: 'rgba(192, 132, 252, 0.95)',
    glow: '#c084fc',
    textMain: '#f3e8ff',
    textSecondary: '#e9d5ff',
    accent: '#c084fc',
    emoji: '\u{1F451}',
  },
};

// Tema seçici fonksiyon
const getWordTheme = (word: WordModel) => {
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

// Apple-Style Minimal FeedCard - Clean, Smooth, Juicy ✨ (FarmScreen ile birebir aynı)
const PhrasalFeedCard: React.FC<{
  word: WordModel;
  isQuizActive: boolean;
  isInInventory: boolean;
  onQuizStart: (id: string) => void;
  onQuizAnswer: (correct: boolean, count?: number, wordId?: string) => void;
  onQuizClose: (wordId: string, meaning?: string) => void;
  onToggleFavorite: (id: string) => void;
  onPlantToFarm?: (id: string) => void;
  onHarvest?: (id: string, meaning?: string) => void;
  onReplant?: (id: string) => void; // Tekrar Ek fonksiyonu
  justHarvested?: boolean; // Az önce hasat edildi mi?
  pool: WordModel[];
  suspendAmbientEffects?: boolean; // Feed quiz açıkken arka plan animasyonlarını durdur
  performanceConfig?: any;
  screenWidth?: number;
  screenHeight?: number;
}> = ({ word, isQuizActive, isInInventory, onQuizStart, onQuizAnswer, onQuizClose, onToggleFavorite, onPlantToFarm, onHarvest, onReplant, justHarvested, pool, suspendAmbientEffects = false, performanceConfig, screenWidth, screenHeight }) => {
  // PERFORMANS AYARLARI
  const config = performanceConfig || { enableShimmer: true, enablePulseAnimations: true };
  const windowWidth = screenWidth || width;
  const windowHeight = screenHeight || SCREEN_HEIGHT;
  const isTablet = windowWidth > 768;
  const feedCardMaxWidth = isTablet ? 500 : windowWidth - 40;
  
  const hasTriggeredRef = useRef(false);
  // Tema: Hasat edildiyse veya Envanterdeyse → gri/siyah premium tema
  const HARVESTED_THEME = {
    gradient: ['rgba(20, 20, 25, 0.98)', 'rgba(35, 35, 45, 0.95)', 'rgba(20, 20, 25, 0.98)'] as const,
    border: 'rgba(100, 116, 139, 0.6)',
    glow: '#475569',
    textMain: '#cbd5e1',
    textSecondary: '#94a3b8',
    accent: '#64748b',
    emoji: '\u{1F4E6}',
  };
  const theme = (justHarvested || isInInventory) ? HARVESTED_THEME : getWordTheme(word);
  
  // ✨ Master kartlar için shimmer + bounce animasyonu
  const masterLevel = word.masterLevel || 0;
  const isMaster = masterLevel >= 1 && !isInInventory && !justHarvested;
  const allowMasterAmbientFx = isMaster && !isQuizActive && !suspendAmbientEffects;
  const shimmerAnim = useRef(new RNAnimated.Value(-1)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  
  // ✨ SHIMMER - Kartın içinde kayan ışık + PERFORMANS KONTROLÜ
  useEffect(() => {
    if (allowMasterAmbientFx && config.enableShimmer) {
      const shimmer = RNAnimated.loop(
        RNAnimated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      );
      shimmer.start();
      return () => shimmer.stop();
    } else if (isQuizActive || suspendAmbientEffects) {
      shimmerAnim.setValue(-1);
    }
  }, [allowMasterAmbientFx, shimmerAnim, config.enableShimmer, isQuizActive, suspendAmbientEffects]);
  
  // BOUNCE/PULSE - Hafif zıplama animasyonu + PERFORMANS KONTROLÜ
  useEffect(() => {
    if (allowMasterAmbientFx && config.enablePulseAnimations) {
      const pulse = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.sin),
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.in(Easing.sin),
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else if (isQuizActive || suspendAmbientEffects) {
      pulseAnim.setValue(1);
    }
  }, [allowMasterAmbientFx, pulseAnim, config.enablePulseAnimations, isQuizActive, suspendAmbientEffects]);
  
  // Shimmer translate interpolation
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-400, 400],
  });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isQuizActive,
    onMoveShouldSetPanResponder: (_, gesture) => {
      // Daha fazla yatay bias - dikey scroll engelleme
      return !isQuizActive && gesture.dx > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 3;
    },
    onPanResponderGrant: () => {
      hasTriggeredRef.current = false;
      haptic.light();
    },
    onPanResponderMove: (_, gesture) => {
      if (gesture.dx > 50 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        haptic.heavy();
        //  Az önce hasat edilmişse → Tarlaya geri ek (onReplant)
        if (justHarvested && onReplant) {
          if (haptic.plantToFarm) { haptic.plantToFarm(); } else { haptic.heavy(); }
          sound.playPlant?.();
          onReplant(word.id);
        }
        // Hasat hazırsa → HASAT ET (miniquiz açma!)
        else if (word.isHarvestReady && !isInInventory) {
          haptic.harvestCelebration?.();
          sound.playEpicHarvest?.();
          onHarvest?.(word.id);
          const firstMeaning = getFirstMeaning(word.meaning || '');
          if (firstMeaning) sound.speakWord(firstMeaning, 'tr-TR');
        }
        // Envanterdeyse → Tarlaya ekle
        else if (isInInventory && onPlantToFarm) {
          sound.playPlant?.();
          onPlantToFarm(word.id);
        }
        // Tarlada ve hasat hazır değilse → Quiz başlat
        else if (!isInInventory && !word.isHarvestReady) {
          onQuizStart(word.id);
        }
      }
    },
    onPanResponderRelease: () => { hasTriggeredRef.current = false; },
    onPanResponderTerminate: () => { hasTriggeredRef.current = false; },
  }), [isQuizActive, isInInventory, onQuizStart, onPlantToFarm, onHarvest, onReplant, justHarvested, word.id, word.isHarvestReady]);

  const streak = word.consecutiveCorrect || 0;
  const sessionCurrent = Math.max(0, word.consecutiveMasterSessions || 0);
  const sessionRequired = useMemo(() => {
    const level = word.masterLevel || 0;
    if (level === 0) {
      const wrongCount = word.wrongCount || 0;
      if (wrongCount <= 0) return 1;
      if (wrongCount === 1) return 2;
      return 3;
    }
    if (level === 1) return 4;
    if (level === 2) return 5;
    return word.rewardClaimedPerfect ? 1 : 6;
  }, [word.masterLevel, word.wrongCount, word.rewardClaimedPerfect]);

  return (
    <View style={[styles.feedItem, { width: windowWidth, height: windowHeight, justifyContent: 'center', alignItems: 'center' }]}>
      <RNAnimated.View 
        style={[
          styles.appleCard, 
          { 
            width: feedCardMaxWidth,
            borderColor: theme.border, 
            shadowColor: theme.glow,
            // Master kartlar için güçlü statik shadow (native driver uyumu için)
            shadowOpacity: isQuizActive ? 0 : (allowMasterAmbientFx ? 0.7 : 0.35),
            shadowRadius: isQuizActive ? 0 : (allowMasterAmbientFx ? 20 : 12),
            // Bounce animasyonu
            transform: [{ scale: isQuizActive ? 1 : (allowMasterAmbientFx ? pulseAnim : 1) }],
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
        
        {/* ✨ SHIMMER EFFECT - Master kartlar için kartın içinde kayan ışık + PERFORMANS KONTROLÜ */}
        {allowMasterAmbientFx && config.enableShimmer && (
          <RNAnimated.View
            style={[
              styles.feedShimmerEffect,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* ❤️ Favorite - üst sol */}
        <TouchableOpacity
          style={styles.appleFavorite}
          onPress={() => { haptic.medium(); onToggleFavorite(word.id); }}
          activeOpacity={0.7}
        >
          <Heart
            size={22}
            color={word.isFavorite ? '#ff375f' : 'rgba(255,255,255,0.5)'}
            fill={word.isFavorite ? '#ff375f' : 'transparent'}
          />
          {/* PV mini badge - favori butonunun sağ alt köşesi */}
          <View style={styles.pvMiniBadge}>
            <Text style={styles.pvMiniBadgeText}>PV</Text>
          </View>
        </TouchableOpacity>

        {/* Badge - üst sağ */}
        <View style={[styles.appleBadge, { backgroundColor: `${theme.accent}25` }]}>
          <Text style={styles.appleBadgeEmoji}>{(justHarvested || isInInventory) ? '\u{1F331}' : theme.emoji}</Text>
          <Text style={[styles.appleBadgeText, { color: theme.textSecondary }]}>
            {justHarvested ? 'Envanterde' : isInInventory ? 'Envanter' : masterLevel >= 3 ? 'Kraliyet' : masterLevel === 2 ? 'Elmas' : masterLevel === 1 ? 'Usta' : (word.wrongCount || 0) >= 2 ? 'Ye\u015Fil' : (word.wrongCount || 0) >= 1 ? 'Sar\u0131' : 'K\u0131rm\u0131z\u0131'}
          </Text>
        </View>

        <View style={styles.feedSessionBadge}>
          <Text style={styles.feedSessionText}>{`Session ${sessionCurrent}/${sessionRequired}`}</Text>
        </View>

        {/* Kelime (Phrasal Verb) */}
        <Text style={[styles.appleWord, { color: theme.textMain }]}>{word.text || word.verb}</Text>

        {/* Örnek cümle */}
        {!!word.example && (
          <Text style={[styles.appleExample, { color: `${theme.textSecondary}cc` }]}>
            "{word.example}"
          </Text>
        )}

        {/* Mini stats - Quiz istatistikleri (normal kelime gibi) */}
        <View style={styles.appleStats}>
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: '#22c55e' }]}>✓{word.quizCorrect || 0}</Text>
            <Text style={[styles.appleStatLabel, { color: theme.textSecondary }]}>doğru</Text>
          </View>
          <View style={[styles.appleStatDivider, { backgroundColor: theme.accent }]} />
          <View style={styles.appleStat}>
            <Text style={[styles.appleStatNum, { color: '#ef4444' }]}>✗{word.quizWrong || 0}</Text>
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

        {/* Buton - justHarvested ise "Tekrar Ek", Hasat hazırsa "Hasat Et", Envanterdeyse "Tarlaya Ekle", değilse "Çalış" */}
        {!isQuizActive && (
          justHarvested ? (
            // TEKRAR EK BUTONU - Premium tasarım
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
          ) : (word as any).isHarvestReady && !isInInventory ? (
            // HASAT ET BUTONU - Altın premium
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
                onHarvest?.(word.id, word.meaning);
              }}
            >
              <Text style={[styles.appleButtonText, { fontSize: 14, color: '#f59e0b', fontWeight: '700' }]}>Hasat Et</Text>
              <Text style={[styles.appleButtonHint, { color: 'rgba(245, 158, 11, 0.7)', fontSize: 11 }]}>kaydir veya dokun</Text>
            </TouchableOpacity>
          ) : isInInventory ? (
            // ENVANTER → TARLAYA EKLE BUTONU
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
            // ÇALI?? BUTONU - Normal kart
            <TouchableOpacity
              style={[styles.appleButton, { backgroundColor: theme.accent }]}
              activeOpacity={0.8}
              onPress={() => {
                haptic.medium();
                onQuizStart(word.id);
              }}
            >
              <Text style={styles.appleButtonText}>{"\u00C7al\u0131\u015F"}</Text>
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
              onClose={() => onQuizClose(word.id, word.meaning)}
              feedMode={true}
            />
          </View>
        )}
      </RNAnimated.View>
    </View>
  );
};

// Feed kart re-render'larını azalt
const MemoPhrasalFeedCard = memo(PhrasalFeedCard, (prev, next) => {
  return (
    prev.word?.id === next.word?.id &&
    prev.word?.masterLevel === next.word?.masterLevel &&
    prev.word?.consecutiveMasterSessions === next.word?.consecutiveMasterSessions &&
    prev.word?.rewardClaimedPerfect === next.word?.rewardClaimedPerfect &&
    prev.word?.wrongCount === next.word?.wrongCount &&
    prev.word?.consecutiveCorrect === next.word?.consecutiveCorrect &&
    prev.word?.isFavorite === next.word?.isFavorite &&
    prev.word?.isHarvestReady === next.word?.isHarvestReady &&
    prev.isQuizActive === next.isQuizActive &&
    prev.isInInventory === next.isInInventory &&
    prev.justHarvested === next.justHarvested &&
    prev.suspendAmbientEffects === next.suspendAmbientEffects
  );
});

// GridSwipeWrapper - SOLA KAYDIR = QUIZ
const GridSwipeWrapper: React.FC<{
  disabled?: boolean;
  onSwipeRight: () => void;
  children: React.ReactNode;
}> = ({ disabled, onSwipeRight, children }) => {
  const hasTriggeredRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (disabled) return false;
          return gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2;
        },
        onPanResponderGrant: () => {
          if (disabled) return;
          hasTriggeredRef.current = false;
          haptic.light();
        },
        onPanResponderMove: (_, gesture) => {
          if (disabled) return;
          if (gesture.dx > 30 && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            haptic.heavy();
            onSwipeRight();
          }
        },
        onPanResponderRelease: () => {
          hasTriggeredRef.current = false;
        },
        onPanResponderTerminate: () => {
          hasTriggeredRef.current = false;
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

// Main Screen
export default function PhrasalVerbFarmScreenNew({ 
  embedded = false,
  initialFilter = 'all' as FilterType,
  externalSearchVisible,
  setExternalSearchVisible,
  onParentScroll,
}: { 
  embedded?: boolean;
  initialFilter?: FilterType;
  externalSearchVisible?: boolean;
  setExternalSearchVisible?: (visible: boolean) => void;
  onParentScroll?: (offsetY: number) => void;
} = {}) {
  const navigation = useNavigation<any>();

  // Store
  const phrasalVerbFarm = useFarmStore(s => s.phrasalVerbFarm);
  const phrasalVerbInventory = useFarmStore(s => s.phrasalVerbInventory);
  const answerMiniQuiz = useFarmStore(s => s.answerMiniQuiz);
  const toggleFavorite = useFarmStore(s => s.toggleFavorite);
  const plantFromInventory = useFarmStore(s => s.plantFromInventory);
  const harvestWord = useFarmStore(s => s.harvestWord);
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const setStoreFeedVisible = useFarmStore(s => s.setFeedVisible); // Swipe block için
  const cardCustomization = useFarmStore(s => s.cardCustomization);
  const feedPerformanceConfig = usePerformanceStore(s => s.config);
  
  // ☁️ CloudTip state - persist edilmiş
  const cloudTipsDismissed = useFarmStore(s => s.cloudTipsDismissed);
  const setCloudTipDismissed = useFarmStore(s => s.setCloudTipDismissed);
  const showPhrasalFarmCloudTip = !cloudTipsDismissed['phrasalFarm'];
  const deferredMeaningSpeakTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (deferredMeaningSpeakTimeoutRef.current) {
        clearTimeout(deferredMeaningSpeakTimeoutRef.current);
        deferredMeaningSpeakTimeoutRef.current = null;
      }
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

  const speakFirstMeaningDeferred = useCallback((meaning?: string) => {
    if (deferredMeaningSpeakTimeoutRef.current) {
      clearTimeout(deferredMeaningSpeakTimeoutRef.current);
    }
    deferredMeaningSpeakTimeoutRef.current = setTimeout(() => {
      speakFirstMeaning(meaning);
      deferredMeaningSpeakTimeoutRef.current = null;
    }, 70);
  }, [speakFirstMeaning]);

  // State - embedded modda dışarıdan gelen searchVisible kullan
  const [internalSearchVisible, setInternalSearchVisible] = useState(false);
  const searchVisible = embedded && externalSearchVisible !== undefined ? externalSearchVisible : internalSearchVisible;
  const setSearchVisible = embedded && setExternalSearchVisible ? setExternalSearchVisible : setInternalSearchVisible;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [sortMode, setSortMode] = useState<SortMode>(null);
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [shuffledFeedData, setShuffledFeedData] = useState<WordModel[]>([]);
  const [quizWordId, setQuizWordId] = useState<string | null>(null);
  const [feedQuizWordId, setFeedQuizWordId] = useState<string | null>(null);
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);
  const [lastViewedWordId, setLastViewedWordId] = useState<string | null>(null);
  const gridColumns = cardCustomization?.largeMode ? 1 : cardCustomization?.compactMode ? 3 : 2;
  
  // HASAT SONRASI "TEKRAR EK" STATE
  const [harvestedWordIds, setHarvestedWordIds] = useState<Set<string>>(new Set());

  const feedWordsRef = useRef<any[]>([]);
  const currentFeedIndexRef = useRef(0);
  const gridListRef = useRef<any>(null);
  const lastMeaningSpokenRef = useRef<{ meaning: string; time: number } | null>(null);

  // Target word for quiz
  const targetWord = useMemo(
    () => phrasalVerbFarm.find(f => f.id === quizWordId),
    [phrasalVerbFarm, quizWordId]
  );

  const [suspendHeavyEffectsForQuiz, setSuspendHeavyEffectsForQuiz] = useState(false);
  useEffect(() => {
    let suspendTimeout: NodeJS.Timeout | null = null;
    if (quizWordId || feedQuizWordId) {
      suspendTimeout = setTimeout(() => setSuspendHeavyEffectsForQuiz(true), 120);
    } else {
      setSuspendHeavyEffectsForQuiz(false);
    }
    return () => {
      if (suspendTimeout) clearTimeout(suspendTimeout);
    };
  }, [quizWordId, feedQuizWordId]);

  // Ready to harvest count
  const readyCount = useMemo(() => {
    return phrasalVerbFarm.filter(w => {
      const streak = w.consecutiveCorrect || 0;
      const masterLevel = w.masterLevel || 0;
      const wrongCount = w.wrongCount || 0;
      
      let streakNeeded = 3;
      if (masterLevel > 0) streakNeeded = 3;
      else if (wrongCount >= 5) streakNeeded = 5;
      
      return streak >= streakNeeded;
    }).length;
  }, [phrasalVerbFarm]);

  // Glow animation removed for performance
  
  const massHarvestGlow = useAnimatedStyle(() => ({
    // Static - no idle animation
  }));

  //  initialFilter değişirse filter'ı güncelle (FarmScreen'den geliyor olabilir)
  useEffect(() => {
    if (initialFilter !== filter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  // Filtering - FarmScreen ile birebir aynı
  const filteredFarmCacheRef = useRef<WordModel[] | null>(null);
  const filteredFarm = useMemo(() => {
    if (feedVisible && filteredFarmCacheRef.current) {
      return filteredFarmCacheRef.current;
    }
    if (!phrasalVerbFarm) {
      filteredFarmCacheRef.current = [];
      return [];
    }
    
    // Normal tarla filtresi:
    // - forPuzzleOnly olanları gösterme (yapboz envanterinden gelmiş)
    // - normalHarvested olanları gösterme (normal tarladan hasat edilmiş, ama yapboz için farm'da)
    const normalFarm = phrasalVerbFarm.filter(w => 
      !(w as any).forPuzzleOnly && 
      !(w as any).normalHarvested
    );
    
    let result: WordModel[];
    switch (filter) {
      case 'ready':
        // Hasat: Sadece yeşil (wrongCount >= 2, masterLevel = 0) ve master kartlar (masterLevel > 0)
        result = normalFarm.filter(w => (w.wrongCount >= 2 && w.masterLevel === 0) || w.masterLevel > 0);
        break;
      case 'study':
        // Çalışmalıyım: Sadece kırmızı/sarı/turuncu (wrongCount < 3, masterLevel = 0)
        result = normalFarm.filter(w => (w.wrongCount || 0) < 3 && (w.masterLevel || 0) === 0);
        break;
      case 'master':
        result = normalFarm.filter(w => (w.masterLevel || 0) > 0);
        break;
      case 'favorites':
        // FAVORİLER: En son eklenen en üstte (favoriteAddedAt timestamp'e göre LIFO)
        result = normalFarm.filter(w => w.isFavorite === true)
          .sort((a, b) => (b.favoriteAddedAt || 0) - (a.favoriteAddedAt || 0));
        filteredFarmCacheRef.current = result;
        return result; // Favorilerde ek sıralama yapma
      default:
        result = [...normalFarm];
    }
    
    // Smart search with score-based ranking
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      
      const scored = result
        .map(w => {
          const text = (w.text || w.verb || '').toLowerCase();
          const meaning = w.meaning.toLowerCase();
          
          let score = 0;
          
          if (text === query || meaning === query) score = 100;
          else if (text.startsWith(query)) score = 50;
          else if (meaning.startsWith(query)) score = 40;
          else if (text.includes(query)) score = 30;
          else if (meaning.includes(query)) score = 20;
          
          return { word: w, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ word }) => word);
      
      filteredFarmCacheRef.current = scored;
      return scored;
    }
    
    // SIRALAMA ALGORİTMASI:
    // 1. Favoriler her zaman en üstte (FIFO - ilk eklenen favori en üstte)
    // 2. Non-favoriler: Quiz, tohum, envanter, coin pazarından yeni gelenler EN BA??TA (lastPlantedAt'e göre)
    
    // ⭐ FAVORİLER - favoriteAddedAt'e göre FIFO sıralama (ilk eklenen üstte)
    const favorites = result.filter(w => w.isFavorite)
      .sort((a, b) => (a.favoriteAddedAt || 0) - (b.favoriteAddedAt || 0));
    
    // Dİ??ER KELİMELER - lastPlantedAt'e göre (en yeni üstte)
    // Quiz sonucu lastPlantedAt değişmez, sadece tarlaya eklenme anında güncellenir
    const nonFavorites = result.filter(w => !w.isFavorite)
      .sort((a, b) => {
        const aPlanted = a.lastPlantedAt || 0;
        const bPlanted = b.lastPlantedAt || 0;
        if (aPlanted !== bPlanted) return bPlanted - aPlanted;
        return (a.id || '').localeCompare(b.id || '');
      });
    
    const merged = [...favorites, ...nonFavorites];
    filteredFarmCacheRef.current = merged;
    return merged;
  }, [phrasalVerbFarm, filter, searchQuery, sortMode, feedVisible]);

  // Normal tarla için forPuzzleOnly ve normalHarvested olanları çıkar
  const normalFarmForStats = useMemo(() => {
    return phrasalVerbFarm?.filter(w => 
      !(w as any).forPuzzleOnly && 
      !(w as any).normalHarvested
    ) || [];
  }, [phrasalVerbFarm]);

  // Stats - FarmScreen ile birebir aynı
  const stats = useMemo(() => ({
    total: normalFarmForStats.length,
    ready: normalFarmForStats.filter(w => ((w.wrongCount || 0) >= 2 && (w.masterLevel || 0) === 0) || (w.masterLevel || 0) > 0).length,
    study: normalFarmForStats.filter(w => (w.wrongCount || 0) < 3 && (w.masterLevel || 0) === 0).length,
    master: normalFarmForStats.filter(w => (w.masterLevel || 0) > 0).length,
    favorites: normalFarmForStats.filter(w => w.isFavorite === true).length,
  }), [normalFarmForStats]);

  // Harvest handler - UPDATED for harvest support
  const handleHarvest = useCallback((item: WordModel) => {
    if (item.isHarvestReady) {
      // Hasat zamanı gelmiş - direkt hasat et
      haptic?.heavy?.();
      sound.playHarvest?.();
      harvestWord?.(item.id);
      speakFirstMeaning(item.meaning);
    } else {
      // Henüz hasat zamanı değil - quiz aç
      haptic?.light?.();
      setQuizWordId(item.id);
    }
  }, [harvestWord, speakFirstMeaning]);

  // Open Feed
  const handleWordPress = useCallback((word: WordModel) => {
    haptic.medium();
    
    // FEED: Tıklanan kart ilk sırada, geri kalanı rastgele
    // 1. Tıklanan kelimeyi ayır
    const clickedWord = word;
    const otherWords = filteredFarm.filter(w => w.id !== word.id);
    
    // 2. Diğer kelimeleri shuffle et (Fisher-Yates)
    const shuffledOthers = [...otherWords];
    for (let i = shuffledOthers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
    }
    
    // 3. Tıklanan kelime başta, sonra shuffle edilmiş diğerleri
    const feedDataWithClickedFirst = [clickedWord, ...shuffledOthers];
    
    setShuffledFeedData(feedDataWithClickedFirst);
    feedWordsRef.current = feedDataWithClickedFirst;
    setFeedStartIndex(0); // İlk kart her zaman index 0
    setFeedVisible(true);
    setStoreFeedVisible(true); // Store'a bildir - swipe block
  }, [filteredFarm, setStoreFeedVisible]);

  // Close Feed
  const handleCloseFeed = useCallback(() => {
    haptic.light();
    setFeedVisible(false);
    setStoreFeedVisible(false); // Store'a bildir - swipe enable
    setFeedQuizWordId(null);
    
    if (lastViewedWordId && gridListRef.current) {
      const wordIndex = filteredFarm.findIndex(w => w.id === lastViewedWordId);
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
  }, [lastViewedWordId, filteredFarm]);

  // Feed Quiz Start
  const handleFeedQuizStart = useCallback((wordId: string) => {
    haptic.medium();
    setFeedQuizWordId(wordId);
  }, []);

  // Feed Quiz Answer - FarmScreen ile aynı
  const handleFeedQuizAnswer = useCallback((correct: boolean, count?: number, wordId?: string) => {
    const wordIdToAnswer = wordId || feedQuizWordId;
    if (!wordIdToAnswer) return;
    
    // ÖNCE quiz'i kapat - store güncellemesinden ÖNCE
    // Bu sayede store güncellemesi FlatList'i re-render ettiğinde isQuizActive zaten false olur
    setFeedQuizWordId(null);
    
    // Sonra quiz cevabını işle
    answerMiniQuiz(wordIdToAnswer, correct, count || 1);
    haptic.light();
  }, [feedQuizWordId, answerMiniQuiz]);

  // ❤️ Feed Toggle Favorite - haptic ekle
  const handleFeedToggleFavorite = useCallback((wordId: string) => {
    // Tutorial sırasında favori butonu kilitli
    if (tutorialStep !== 'COMPLETED') {
      haptic.error();
      return;
    }
    haptic.medium();
    toggleFavorite(wordId);
  }, [toggleFavorite, tutorialStep]);

  // Feed Plant to Farm (envanterdeki PV'ler için)
  const handleFeedPlantToFarm = useCallback((wordId: string) => {
    plantFromInventory?.(wordId);
    haptic.heavy();
    sound.playPlant();
  }, [plantFromInventory]);

  // Feed Viewable Items Changed
  const handleFeedQuizClose = useCallback((_wordId: string, meaning?: string) => {
    haptic.light();
    setFeedQuizWordId(null);
    speakFirstMeaningDeferred(meaning);
  }, [speakFirstMeaningDeferred]);

  const handleFeedHarvest = useCallback((wordId: string, meaning?: string) => {
    const result = harvestWord(wordId);
    if (!result?.success) return;

    speakFirstMeaning(meaning);
    setTimeout(() => {
      if (result.coins > 0) {
        showRewardToast('coin', result.coins, `?? Hasat! +${result.coins} coin`);
      }
      if (result.xp > 0) {
        showRewardToast('xp', result.xp, `?? +${result.xp} XP`);
      }
    }, 300);

    setHarvestedWordIds(prev => {
      const next = new Set(prev);
      next.add(wordId);
      return next;
    });
  }, [harvestWord, speakFirstMeaning]);

  const handleFeedReplant = useCallback((wordId: string) => {
    const currentInventory = useFarmStore.getState().phrasalVerbInventory;
    const invWord = currentInventory.find((w: any) =>
      w.originalWordId === wordId ||
      w.id === wordId ||
      w.id.startsWith(`${wordId}-inv-`)
    );

    if (invWord) {
      if (haptic.plantToFarm) { haptic.plantToFarm(); } else { haptic.heavy(); }
      sound.playPlant?.();
      plantFromInventory(invWord.id);
      setHarvestedWordIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });
      return;
    }

    setTimeout(() => {
      const latestInventory = useFarmStore.getState().phrasalVerbInventory;
      const retryWord = latestInventory.find((w: any) =>
        w.originalWordId === wordId ||
        w.id.startsWith(`${wordId}-inv-`)
      );
      if (!retryWord) return;

      if (haptic.plantToFarm) { haptic.plantToFarm(); } else { haptic.heavy(); }
      sound.playPlant?.();
      plantFromInventory(retryWord.id);
      setHarvestedWordIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });
    }, 100);
  }, [plantFromInventory]);

  const feedFarmLookup = useMemo(() => {
    const byId = new Map<string, WordModel>();
    const byOriginalId = new Map<string, WordModel>();
    for (const word of phrasalVerbFarm) {
      if (word.id && !byId.has(word.id)) {
        byId.set(word.id, word);
      }
      const originalId = (word as any).originalWordId;
      if (typeof originalId === 'string' && originalId.length > 0 && !byOriginalId.has(originalId)) {
        byOriginalId.set(originalId, word);
      }
    }
    return { byId, byOriginalId };
  }, [phrasalVerbFarm]);

  const feedInventoryLookup = useMemo(() => {
    const byId = new Map<string, WordModel>();
    const byOriginalId = new Map<string, WordModel>();
    for (const word of phrasalVerbInventory) {
      if (word.id && !byId.has(word.id)) {
        byId.set(word.id, word);
      }
      const originalId = (word as any).originalWordId;
      if (typeof originalId === 'string' && originalId.length > 0 && !byOriginalId.has(originalId)) {
        byOriginalId.set(originalId, word);
      }
    }
    return { byId, byOriginalId };
  }, [phrasalVerbInventory]);

  const resolveFeedLookup = useCallback((item: WordModel) => {
    const originalItemId = (item as any).originalWordId;
    const farmWord =
      feedFarmLookup.byId.get(item.id) ||
      (typeof originalItemId === 'string' ? feedFarmLookup.byId.get(originalItemId) : undefined) ||
      feedFarmLookup.byOriginalId.get(item.id);
    const inventoryWord =
      feedInventoryLookup.byId.get(item.id) ||
      feedInventoryLookup.byOriginalId.get(item.id);

    return {
      word: farmWord || inventoryWord || item,
      isInInventory: !farmWord && !!inventoryWord,
    };
  }, [feedFarmLookup, feedInventoryLookup]);

  const feedExtraData = useMemo(
    () => `${feedQuizWordId || ''}-${harvestedWordIds.size}-${phrasalVerbFarm.length}-${phrasalVerbInventory.length}`,
    [feedQuizWordId, harvestedWordIds.size, phrasalVerbFarm.length, phrasalVerbInventory.length]
  );
  const isFeedQuizOpen = !!feedQuizWordId;

  const renderFeedItem = useCallback(({ item }: { item: WordModel }) => {
    const lookup = resolveFeedLookup(item);
    const currentWord = lookup.word || item;
    const isInInventory = lookup.isInInventory;

    return (
      <MemoPhrasalFeedCard
        word={currentWord}
        isQuizActive={feedQuizWordId === item.id}
        isInInventory={isInInventory}
        onQuizStart={handleFeedQuizStart}
        onQuizAnswer={handleFeedQuizAnswer}
        onQuizClose={handleFeedQuizClose}
        onToggleFavorite={handleFeedToggleFavorite}
        onPlantToFarm={handleFeedPlantToFarm}
        onHarvest={handleFeedHarvest}
        onReplant={handleFeedReplant}
        justHarvested={harvestedWordIds.has(item.id)}
        pool={shuffledFeedData}
        suspendAmbientEffects={isFeedQuizOpen}
        performanceConfig={feedPerformanceConfig}
        screenWidth={width}
        screenHeight={SCREEN_HEIGHT}
      />
    );
  }, [
    feedQuizWordId,
    feedPerformanceConfig,
    handleFeedQuizStart,
    handleFeedQuizAnswer,
    handleFeedQuizClose,
    handleFeedToggleFavorite,
    handleFeedPlantToFarm,
    handleFeedHarvest,
    handleFeedReplant,
    harvestedWordIds,
    isFeedQuizOpen,
    shuffledFeedData,
    resolveFeedLookup,
  ]);

  const handleFeedViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (feedQuizWordId) return;
    if (viewableItems && viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== currentFeedIndexRef.current) {
        currentFeedIndexRef.current = newIndex;
        haptic.medium();
      }
      const viewedWord = feedWordsRef.current[newIndex];
      if (viewedWord) {
        setLastViewedWordId(viewedWord.id);
      }
    }
  }, [feedQuizWordId]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // ⚡ Mass Harvest
  const handleMassHarvest = useCallback(() => {
    if (readyCount === 0) return;
    const firstReady = phrasalVerbFarm.find(w => {
      const streak = w.consecutiveCorrect || 0;
      const masterLevel = w.masterLevel || 0;
      const wrongCount = w.wrongCount || 0;
      let streakNeeded = masterLevel > 0 || wrongCount < 5 ? 3 : 5;
      return streak >= streakNeeded;
    });
    if (firstReady) {
      haptic?.medium?.();
      sound?.playTap?.();
      setQuizWordId(firstReady.id);
    }
  }, [readyCount, phrasalVerbFarm]);

  // Quiz answer handler
  const handleQuizAnswer = useCallback((correct: boolean, count?: number, wordId?: string) => {
    const targetId = wordId || quizWordId;
    if (!targetId) return;
    answerMiniQuiz?.(targetId, correct, count || 1);
    setQuizWordId(null);
  }, [quizWordId, answerMiniQuiz]);

  const handleEmbeddedGridScroll = useCallback((event: any) => {
    if (!onParentScroll) return;
    const rawY = Number(event?.nativeEvent?.contentOffset?.y ?? 0);
    const y = Number.isFinite(rawY) ? Math.max(0, rawY) : 0;
    onParentScroll(y);
  }, [onParentScroll]);

  // Render item for FlashList with swipe wrapper
  const renderItem = useCallback(({ item, index }: { item: WordModel; index: number }) => (
    <GridSwipeWrapper
      disabled={!!quizWordId}
      onSwipeRight={() => handleHarvest(item)}
    >
      <UltimateWordCard
        word={item}
        onPress={() => handleWordPress(item)}
        onQuizPress={() => handleHarvest(item)}
        index={index}
        suspendHeavyEffects={suspendHeavyEffectsForQuiz}
      />
    </GridSwipeWrapper>
  ), [handleHarvest, handleWordPress, suspendHeavyEffectsForQuiz]);

  // Filter Tab Component - FarmScreen ile birebir aynı
  const FilterTab = ({ label, active, onPress, count, glowColor }: {
    label: string;
    active: boolean;
    onPress: () => void;
    count: number;
    glowColor: string;
  }) => (
    <View style={styles.filterTabWrapper}>
      {active && (
        <LinearGradient
          colors={[`${glowColor}30`, `${glowColor}10`]}
          style={styles.filterGlow}
        />
      )}
      <TouchableOpacity
        style={[
          styles.filterTab,
          active && styles.filterTabActive,
          active && { borderColor: `${glowColor}80` },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {active && <View style={styles.staticFilterShimmer} />}
        <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
          {label}
        </Text>
        <View style={[
          styles.filterBadge,
          active && styles.filterBadgeActive,
          active && { backgroundColor: `${glowColor}40` },
        ]}>
          <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Empty State Mesajları - Quiz'e yönlendirme dahil
  const getEmptyStateMessage = () => {
    if (searchQuery.trim()) {
      return {
        icon: '\u{1F50D}',
        title: 'Sonuç Bulunamadı',
        subtitle: `"${searchQuery}" için phrasal verb bulunamadı`,
        buttonText: null,
        onPress: null,
      };
    }
    switch (filter) {
      case 'ready':
        return {
          icon: '\u{1F33E}',
          title: 'Hasat Hazır Phrasal Verb Yok',
          subtitle: 'Kartları çalışarak hasat zamanını bekle!',
          buttonText: '\u{1F4D6} Quiz Çöz',
          onPress: () => navigation.navigate('PhrasalVerbsMenu'),
        };
      case 'study':
        return {
          icon: '\u{1F4DA}',
          title: 'Tebrikler! \u{1F389}',
          subtitle: 'Çalışman gereken phrasal verb yok!',
          buttonText: null,
          onPress: null,
        };
      case 'master':
        return {
          icon: '⭐',
          title: 'Henüz Master Phrasal Verb Yok',
          subtitle: 'Doğru cevaplarla master seviyesine ulaş!',
          buttonText: '\u{1F4D6} Quiz Çöz',
          onPress: () => navigation.navigate('PhrasalVerbsMenu'),
        };
      case 'favorites':
        return {
          icon: '❤️',
          title: 'Favori Phrasal Verb Yok',
          subtitle: 'Kartlara tıklayarak favorilere ekle!',
          buttonText: null,
          onPress: null,
        };
      default:
        return {
          icon: '\u{1F331}',
          title: '\u{1F331} Tarlana Phrasal Verb Ek!',
          subtitle: 'Menüden quiz çözerek phrasal verb ekleyebilirsin.\nYanlış bile olsa buraya ekilir!',
          buttonText: '\u{1F4D6} Phrasal Verb Menüsü',
          onPress: () => navigation.navigate('PhrasalVerbsMenu'),
        };
    }
  };

  // Embedded mode için (FarmScreen'de tab olarak)
  if (embedded) {
    const emptyState = getEmptyStateMessage();
    
    return (
      <View style={styles.embeddedContainer}>
        {/*  Inline Search - Filter'ların üstünde ayrı satır */}
        {searchVisible && (
          <View style={styles.searchBarContainer}>
            <View style={styles.inlineSearchWrapper}>
              <TextInput
                style={styles.inlineSearchInput}
                placeholder="Phrasal verb ara..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                selectionColor="#22c55e"
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
          </View>
        )}

        {/* Content - Filter tabs artık FarmScreen header'da */}
        {phrasalVerbFarm.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIconText}>{emptyState.icon}</Text>
            </View>
            <Text style={styles.emptyTitle}>{emptyState.title}</Text>
            <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
            {emptyState.buttonText && emptyState.onPress && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={emptyState.onPress}
              >
                <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.emptyButtonGradient}>
                  <Text style={styles.emptyButtonText}>{emptyState.buttonText}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : filteredFarm.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIconText}>{emptyState.icon}</Text>
            </View>
            <Text style={styles.emptyTitle}>{emptyState.title}</Text>
            <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
            {emptyState.buttonText && emptyState.onPress && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={emptyState.onPress}
              >
                <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.emptyButtonGradient}>
                  <Text style={styles.emptyButtonText}>{emptyState.buttonText}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlashList
            ref={gridListRef}
            data={filteredFarm}
            renderItem={renderItem}
            numColumns={gridColumns}
            key={`phrasal-grid-embedded-${gridColumns}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleEmbeddedGridScroll}
          />
        )}

        {/* MiniQuiz Dialog */}
        {targetWord && (
          <MiniQuizDialog
            key={targetWord.id}
            word={targetWord}
            allWords={phrasalVerbFarm}
            onAnswer={handleQuizAnswer}
            onClose={() => {
              const meaning = targetWord?.meaning;
              setQuizWordId(null);
              speakFirstMeaningDeferred(meaning);
            }}
          />
        )}

        {/* Feed Modal */}
        <Modal
          visible={feedVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseFeed}
        >
          <View style={styles.feedContainer}>
            <RewardToastContainer />
            <TouchableOpacity 
              style={styles.feedCloseBtn}
              activeOpacity={0.7}
              onPress={handleCloseFeed}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <FlashList
              data={shuffledFeedData}
              renderItem={renderFeedItem}
              keyExtractor={(item) => item.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isFeedQuizOpen}
              extraData={feedExtraData}
              drawDistance={isFeedQuizOpen ? 120 : SCREEN_HEIGHT}
              initialScrollIndex={feedStartIndex}
              onViewableItemsChanged={handleFeedViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1a1625', '#2d1f47', '#1a1625']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>{'\u2728 Phrasal Tarla \u{1F33E}'}</Text>
            <Text style={styles.subtitle}>{phrasalVerbFarm.length} phrasal verb</Text>
          </View>

          {/* Mass Harvest Button */}
          {readyCount > 0 && (
            <Animated.View style={massHarvestGlow}>
              <TouchableOpacity onPress={handleMassHarvest}>
                <LinearGradient
                  colors={['#7c3aed', '#ec4899']}
                  style={styles.massHarvestButton}
                >
                  <Text style={styles.massHarvestIcon}>⚡</Text>
                  <Text style={styles.massHarvestText}>HASAT</Text>
                  <View style={styles.massHarvestBadge}>
                    <Text style={styles.massHarvestCount}>{readyCount}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* ☁️ PHRASAL FARM CLOUDTIP */}
      {showPhrasalFarmCloudTip && tutorialStep === 'COMPLETED' && (
        <CuteCloudTip
          message="Phrasal verb kartlarını çalışarak büyüt! Çalışa bas veya kartı sağa kaydır → Kartın üzerindeki rakamlar seviye atlaması için gereken doğru oturum sayısını ifade eder."
          visible={showPhrasalFarmCloudTip}
          onDismiss={() => setCloudTipDismissed('phrasalFarm', true)}
          accentColor="#22c55e"
        />
      )}

      {/* Content */}
      {phrasalVerbFarm.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{'\u{1F331}'}</Text>
          <Text style={styles.emptyTitle}>Tarlaya Eklemek İçin Quiz Çöz!</Text>
          <Text style={styles.emptySubtitle}>{'Phrasal verb menüsünden quiz başlat \u{1F3AF}'}</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate('PhrasalVerbsMenu')}
          >
            <LinearGradient colors={['#7c3aed', '#a855f7']} style={styles.emptyButtonGradient}>
              <Text style={styles.emptyButtonText}>{'\u{1F4D6} Phrasal Verb Menüsü'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          ref={gridListRef}
          data={filteredFarm}
          renderItem={renderItem}
          numColumns={gridColumns}
          key={`phrasal-grid-${gridColumns}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(() => {
            const emptyState = getEmptyStateMessage();
            return (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>{emptyState.icon}</Text>
                <Text style={styles.emptyTitle}>{emptyState.title}</Text>
                <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
              </View>
            );
          })()}
        />
      )}

      {/* MiniQuiz Dialog */}
      {targetWord && (
        <MiniQuizDialog
          key={targetWord.id}
          word={targetWord}
          allWords={phrasalVerbFarm}
          onAnswer={handleQuizAnswer}
          onClose={() => {
            const meaning = targetWord?.meaning;
            setQuizWordId(null);
            speakFirstMeaningDeferred(meaning);
          }}
        />
      )}

      {/* Feed Modal */}
      <Modal
        visible={feedVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseFeed}
      >
        <View style={styles.feedContainer}>
          <RewardToastContainer />
          <TouchableOpacity 
            style={styles.feedCloseBtn}
            activeOpacity={0.7}
            onPress={handleCloseFeed}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <FlashList
            data={shuffledFeedData}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isFeedQuizOpen}
            extraData={feedExtraData}
            drawDistance={isFeedQuizOpen ? 120 : SCREEN_HEIGHT}
            initialScrollIndex={feedStartIndex}
            onViewableItemsChanged={handleFeedViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1625',
  },
  embeddedContainer: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f3e8ff',
  },
  subtitle: {
    fontSize: 14,
    color: '#c4b5fd',
    marginTop: 4,
  },
  massHarvestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  massHarvestIcon: {
    fontSize: 20,
  },
  massHarvestText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  massHarvestBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  massHarvestCount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  listHeader: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  xpContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpLevelIcon: {
    fontSize: 20,
  },
  xpLevelText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f3e8ff',
  },
  xpText: {
    fontSize: 14,
    color: '#c4b5fd',
  },
  xpBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#a855f7',
    borderRadius: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  // Filter & Sort Styles - FarmScreen ile birebir aynı
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
    fontSize: IS_SMALL_SCREEN ? 10 : 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.3,
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  // Sort Styles - Tutarlı boyut ve padding (FarmScreen ile aynı)
  sortContainer: {
    marginTop: 6,
    marginBottom: 6,
  },
  sortScroll: {
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 14,
    gap: IS_SMALL_SCREEN ? 6 : 8,
  },
  sortButton: {
    paddingHorizontal: IS_SMALL_SCREEN ? 10 : 14,
    paddingVertical: IS_SMALL_SCREEN ? 6 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: '#a855f7',
  },
  sortButtonText: {
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  // Search Bar Container - Ayrı satır
  searchBarContainer: {
    paddingVertical: IS_SMALL_SCREEN ? 4 : 6,
    backgroundColor: 'rgba(18, 18, 20, 0.9)',
  },
  // Inline Search - FarmScreen ile aynı
  inlineSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  inlineSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  inlineSearchClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 6,
  },
  inlineSearchClearIcon: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  inlineSearchClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#ef4444',
    marginLeft: 6,
  },
  inlineSearchCloseIcon: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  // Menu Button - Tohum Pazarı gibi - RESPONSIVE
  menuButton: {
    borderRadius: IS_SMALL_SCREEN ? 10 : 14,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: IS_SMALL_SCREEN ? 3 : 6 },
    shadowOpacity: IS_SMALL_SCREEN ? 0.4 : 0.6,
    shadowRadius: IS_SMALL_SCREEN ? 8 : 16,
    elevation: IS_SMALL_SCREEN ? 6 : 12,
  },
  menuGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
    position: 'relative',
    minHeight: 44,
  },
  menuGradient_small: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 3,
    minHeight: 32,
  },
  menuShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  menuIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuIconWrapper_small: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flexShrink: 1,
  },
  menuText_small: {
    fontSize: 11,
  },
  menuCoinsWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexShrink: 0,
  },
  menuCoinsWrapper_small: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  menuCoins: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  menuCoins_small: {
    fontSize: 9,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  filterIcon: {
    fontSize: 14,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
  filterLabelActive: {
    color: '#f3e8ff',
  },
  listContent: {
    paddingTop: IS_SMALL_SCREEN ? 12 : 16,
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  cardContainer: {
    width: CARD_WIDTH,
    margin: 8,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    minHeight: 200,
    position: 'relative',
  },
  readyBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  readyText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  wordText: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  streakCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  readyEmoji: {
    fontSize: 14,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  // Empty State - Premium Design
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    overflow: 'hidden',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyIconText: {
    fontSize: 56,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f3e8ff',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#c4b5fd',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
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
  // Feed Modal Styles
  feedContainer: {
    flex: 1,
    backgroundColor: '#0a0612',
  },
  feedCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  feedItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // ✨ SHIMMER EFFECT - Master kartlar için kartın içinde kayan ışık
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
  // Apple-Style Feed Card - Clean & Juicy
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
  // ❤️ Favorite button - sol üst
  appleFavorite: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // PV Mini Badge - favori butonunun sağ alt köşesi
  pvMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#a855f7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#c084fc',
  },
  pvMiniBadgeText: {
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
  feedSessionBadge: {
    position: 'absolute',
    right: 20,
    top: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  feedSessionText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  appleWord: {
    fontSize: 36,
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
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    minHeight: 400,
  },
  feedContent: {
    marginBottom: 24,
  },
  feedWordContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  feedWord: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f3e8ff',
    textAlign: 'center',
    marginBottom: 8,
  },
  feedMeaning: {
    fontSize: 18,
    color: '#e9d5ff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  feedExample: {
    fontSize: 14,
    color: '#c4b5fd',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  feedStatsContainer: {
    marginBottom: 20,
  },
  feedStatsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  feedStatCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  feedQuizBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  feedQuizBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  feedQuizBtnIcon: {
    fontSize: 20,
  },
  feedQuizBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
});

