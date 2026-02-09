import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { getPhrasalDiscountFactor } from '../utils/storePerks';
import JuicyModal from '../components/JuicyModal';
import { CuteCloudTip } from '../components/CuteCloudTip';
import type { PhrasalVerb } from '../models/types';

const { width, height } = Dimensions.get('window');

// 💰 Seviye fiyatları
const LEVEL_PRICES: Record<string, number> = {
  A1: 50,
  A2: 100,
  B1: 200,
  B2: 400,
  C1: 800,
  C2: 1500,
};

// 📊 Format coin display
const formatCoin = (n: number) => {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

// 🎨 Seviye renkleri
const LEVEL_COLORS: Record<string, { gradient: readonly [string, string]; border: string; text: string; glow: string }> = {
  A1: { gradient: ['#065f46', '#047857'], border: '#10b981', text: '#a7f3d0', glow: '#10b981' },
  A2: { gradient: ['#1e3a8a', '#1d4ed8'], border: '#3b82f6', text: '#93c5fd', glow: '#3b82f6' },
  B1: { gradient: ['#78350f', '#b45309'], border: '#f59e0b', text: '#fde68a', glow: '#f59e0b' },
  B2: { gradient: ['#7c2d12', '#c2410c'], border: '#f97316', text: '#fed7aa', glow: '#f97316' },
  C1: { gradient: ['#7f1d1d', '#b91c1c'], border: '#ef4444', text: '#fecaca', glow: '#ef4444' },
  C2: { gradient: ['#581c87', '#7c3aed'], border: '#a855f7', text: '#e9d5ff', glow: '#a855f7' },
};

const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// 🃏 Level Card Component
const LevelCard = React.memo(({
  difficulty,
  totalCount,
  unlockedCount,
  price,
  coins,
  onUnlockAll,
  onStartQuiz,
  onViewList,
}: {
  difficulty: string;
  totalCount: number;
  unlockedCount: number;
  price: number;
  coins: number;
  onUnlockAll: () => void;
  onStartQuiz: () => void;
  onViewList: () => void;
}) => {
  const colors = LEVEL_COLORS[difficulty];
  const isAllUnlocked = unlockedCount === totalCount;
  const canQuiz = isAllUnlocked; // 🎯 Quiz sadece TÜM kartlar açıldığında aktif
  const lockedCount = totalCount - unlockedCount;
  const totalCost = lockedCount * price;
  const canAfford = coins >= totalCost;

  const scale = useSharedValue(1);

  // Animations removed for performance - only press feedback

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 10, stiffness: 300 });
    haptic.heavy();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8, stiffness: 250 });
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(DIFFICULTIES.indexOf(difficulty) * 80).springify()}
      style={styles.levelCard}
    >
      <Animated.View style={animatedScale}>
        {/* Glow/shimmer removed for performance */}

        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {
            haptic.heavy();
            onViewList();
          }}
        >
          <LinearGradient
            colors={colors.gradient}
            style={[styles.levelCardGradient, { borderColor: colors.border }]}
          >
          {/* Shimmer/glow removed for performance */}

          {/* Level Badge - Static */}
          <View style={[styles.levelBadge, { backgroundColor: colors.border + '50' }]}>
            <Text style={[styles.levelBadgeText, { color: colors.text }]}>{difficulty}</Text>
          </View>

          {/* Stats */}
          <View style={styles.levelStats}>
            <Text style={[styles.levelStatsText, { color: colors.text, textShadowColor: colors.glow, textShadowRadius: 10 }]}>
              {unlockedCount}/{totalCount}
            </Text>
            <Text style={[styles.levelStatsLabel, { color: colors.text + '99' }]}>
              Açık
            </Text>
          </View>

          {/* Progress Bar - ENHANCED */}
          <View style={[styles.progressBarBg, { borderColor: colors.border + '40' }]}>
            <LinearGradient
              colors={[colors.border, colors.glow]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill, 
                { width: `${(unlockedCount / totalCount) * 100}%` },
              ]} 
            />
          </View>

          {/* Action Buttons - GRADIENT */}
          <View style={styles.levelActions}>
            {!isAllUnlocked && (
              <TouchableOpacity
                style={styles.unlockAllBtnWrapper}
                onPress={() => {
                  haptic.heavy();
                  onUnlockAll();
                }}
                disabled={!canAfford || lockedCount === 0}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={canAfford ? ['#facc15', '#eab308'] : ['#4b5563', '#374151']}
                  style={styles.unlockAllBtn}
                >
                  <Text style={styles.unlockAllBtnText}>
                    🔓 {lockedCount}x = {totalCost} 💰
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.quizBtnWrapper}
              onPress={(e) => {
                e.stopPropagation();
                haptic.heavy();
                if (canQuiz) onStartQuiz();
              }}
              disabled={!canQuiz}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={canQuiz ? [colors.border, colors.glow] : ['#374151', '#1f2937']}
                style={styles.quizBtn}
              >
                <Text style={[styles.quizBtnText, { opacity: canQuiz ? 1 : 0.5 }]}>
                  {canQuiz ? '💪 QUIZ' : '🔒 QUIZ'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* 🎯 Quiz Açılma Bilgisi */}
          {!canQuiz && (
            <View style={styles.quizHintContainer}>
              <Text style={[styles.quizHintText, { color: colors.text + 'CC' }]}>
                ⚡ Tüm kartları aç → Quiz aktif olsun!
              </Text>
            </View>
          )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

// 📊 Stat Card - MEGA DOPAMINE 🔥
const StatCard = ({ icon, value, label, gradient }: {
  icon: string;
  value: string | number;
  label: string;
  gradient: readonly [string, string];
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.3);
  const shimmer = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // ✨ SHIMMER
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

    // 🌀 ROTATION
    rotate.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // 🌟 GLOW PULSE
    glow.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * 150 - 75 }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(rotate.value - 0.5) * 8}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={scaleStyle}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 10, stiffness: 300 });
          haptic.heavy();
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 8, stiffness: 250 });
        }}
      >
        <LinearGradient colors={gradient} style={styles.statCard}>
          {/* ✨ SHIMMER */}
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
          
          {/* 🌟 GLOW */}
          <Animated.View style={[styles.statGlow, glowStyle]} />

          <Animated.View style={rotateStyle}>
            <Text style={styles.statIcon}>{icon}</Text>
          </Animated.View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 🏠 Main Screen
export default function PhrasalVerbsMenuScreen() {
  const navigation = useNavigation<any>();

  // Store
  const phrasalVerbs = useFarmStore(s => s.phrasalVerbs);
  const unlockedPhrasalVerbs = useFarmStore(s => s.unlockedPhrasalVerbs);
  const coins = useFarmStore(s => s.coins);
  const ownedItems = useFarmStore(s => s.ownedItems);
  const unlockPhrasalVerb = useFarmStore(s => s.unlockPhrasalVerb);
  const loadPhrasalVerbs = useFarmStore(s => s.loadPhrasalVerbs);
  const phrasalVerbFarm = useFarmStore(s => s.phrasalVerbFarm);
  const phrasalVerbInventory = useFarmStore(s => s.phrasalVerbInventory);
  const phrasalHintShown = useFarmStore(s => s.phrasalHintShown);
  const setPhrasalHintShown = useFarmStore(s => s.setPhrasalHintShown);
  const cloudTipsDismissed = useFarmStore(s => s.cloudTipsDismissed);
  const setCloudTipDismissed = useFarmStore(s => s.setCloudTipDismissed);
  
  // 🎓 İlk giriş hint durumu
  const [showHint, setShowHint] = useState(false);
  
  // ☁️ CloudTip - Persist state'den al
  const showCloudTip = !cloudTipsDismissed['phrasalMenu'];

  // Load phrasal verbs on mount
  useEffect(() => {
    if (phrasalVerbs.length === 0) {
      loadPhrasalVerbs?.();
    }
  }, []);
  
  // 🎓 İlk giriş hintini göster
  useEffect(() => {
    if (!phrasalHintShown) {
      const timer = setTimeout(() => {
        setShowHint(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phrasalHintShown]);

  // 📊 Stats by difficulty
  const stats = useMemo(() => {
    const byDifficulty = DIFFICULTIES.map(diff => ({
      difficulty: diff,
      total: phrasalVerbs.filter(pv => pv.difficulty === diff).length,
      unlocked: phrasalVerbs.filter(
        pv => pv.difficulty === diff && unlockedPhrasalVerbs.includes(pv.id)
      ).length,
    }));

    return {
      total: phrasalVerbs.length,
      unlocked: unlockedPhrasalVerbs.length,
      inFarm: phrasalVerbFarm.length,
      mastered: phrasalVerbInventory.length,
      byDifficulty,
    };
  }, [phrasalVerbs, unlockedPhrasalVerbs, phrasalVerbFarm, phrasalVerbInventory]);

  const phrasalDiscountFactor = getPhrasalDiscountFactor(ownedItems);
  const phrasalDiscountPercent = Math.round((1 - phrasalDiscountFactor) * 100);
  const hasPhrasalDiscount = phrasalDiscountPercent > 0;

  // 🎯 Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    titleEmoji?: string;
    message: string;
    secondaryMessage?: string;
    secondaryEmoji?: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'purchase';
    onConfirm?: () => void;
    confirmText?: string;
  } | null>(null);

  // 🔓 Unlock all for a difficulty
  const handleUnlockAll = useCallback((difficulty: string) => {
    const verbsToUnlock = phrasalVerbs.filter(
      pv => pv.difficulty === difficulty && !unlockedPhrasalVerbs.includes(pv.id)
    );

    if (verbsToUnlock.length === 0) {
      setModalConfig({
        title: 'Bilgi',
        titleEmoji: 'ℹ️',
        message: 'Bu seviyedeki tüm verb\'ler zaten açık!',
        type: 'info',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }

    const basePrice = LEVEL_PRICES[difficulty];
    const price = Math.max(1, Math.floor(basePrice * phrasalDiscountFactor));
    const totalCost = verbsToUnlock.length * price;

    if (coins < totalCost) {
      haptic?.light?.();
      setModalConfig({
        title: 'Yetersiz Coin',
        titleEmoji: '❌',
        message: `Tümü için ${totalCost.toLocaleString()} coin gerekiyor.`,
        secondaryMessage: `Mevcut bakiyen: ${coins.toLocaleString()} coin`,
        secondaryEmoji: '💰',
        type: 'error',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }

    setModalConfig({
      title: `${difficulty} Seviyesini Aç`,
      titleEmoji: '🔓',
      message: `${verbsToUnlock.length} phrasal verb için ${totalCost.toLocaleString()} coin harcamak istiyor musunuz?`,
      secondaryMessage: hasPhrasalDiscount ? `İndirim aktif: %${phrasalDiscountPercent}` : undefined,
      secondaryEmoji: hasPhrasalDiscount ? '✨' : undefined,
      type: 'purchase',
      confirmText: 'Tümünü Aç',
      onConfirm: () => {
        setModalVisible(false);
        verbsToUnlock.forEach(pv => {
          unlockPhrasalVerb?.(pv.id, difficulty);
        });
        haptic?.harvestCelebration?.();
        sound?.playUnlock?.();
      },
    });
    setModalVisible(true);
  }, [phrasalVerbs, unlockedPhrasalVerbs, coins, unlockPhrasalVerb, phrasalDiscountFactor, hasPhrasalDiscount]);

  // 🎮 Start Quiz
  const handleStartQuiz = useCallback((difficulty: string) => {
    const diffStats = stats.byDifficulty.find(d => d.difficulty === difficulty);
    if (!diffStats || diffStats.unlocked < 4) {
      setModalConfig({
        title: 'Yetersiz Verb',
        titleEmoji: '⚠️',
        message: 'Quiz için en az 4 phrasal verb açmanız gerekiyor.',
        type: 'warning',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }
    haptic?.heavy?.(); // 🔥 MEGA HAPTIC
    navigation.navigate('PhrasalVerbQuiz', { level: difficulty });
  }, [stats, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#13131A', '#000000']} style={StyleSheet.absoluteFill} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ☁️ CloudTip - Phrasal Verbs intro */}
        {showCloudTip && (
          <CuteCloudTip
            message="Phrasal verblerle günlük konuşma gücünü artır! 💪 Seviye seç, quiz çöz, tarlana ek."
            visible={showCloudTip}
            onDismiss={() => setCloudTipDismissed('phrasalMenu', true)}
            accentColor="#22c55e"
          />
        )}

        {/* Header - PREMIUM TASARIM 🔥 - Çiftlik/Envanter ile uyumlu */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          {/* 🎯 Premium Header Card - Yeşil accent */}
          <LinearGradient
            colors={['rgba(34, 197, 94, 0.2)', 'rgba(22, 163, 74, 0.15)', 'rgba(21, 128, 61, 0.25)']}
            style={styles.headerCard}
          >
            {/* Glow effect - Yeşil */}
            <View style={[styles.headerGlow, { backgroundColor: 'rgba(34, 197, 94, 0.25)' }]} />
            
            <View style={styles.headerTop}>
              <View style={styles.headerTitleSection}>
                <Text style={styles.headerEmoji}>📚</Text>
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.title}>PHRASAL VERBS</Text>
                  <Text style={styles.subtitleText}>Tarlana phrasal verb ekle! 🌱</Text>
                </View>
              </View>
              
              {/* 💰 Premium Coin Display */}
              <TouchableOpacity activeOpacity={0.8} style={styles.coinWrapper}>
                <LinearGradient
                  colors={['#fbbf24', '#f59e0b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coinContainer}
                >
                  <View style={styles.coinInner}>
                    <Text style={styles.coinIcon}>💰</Text>
                    <Text style={styles.coinText}>{formatCoin(coins)}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.statsRow}>
          <StatCard
            icon="✅"
            value={`${stats.unlocked}/${stats.total}`}
            label="Açık"
            gradient={['rgba(22,163,74,0.4)', 'rgba(21,128,61,0.4)']}
          />
          <StatCard
            icon="🌱"
            value={stats.inFarm}
            label="Tarlada"
            gradient={['rgba(139,92,246,0.4)', 'rgba(126,34,206,0.4)']}
          />
          <StatCard
            icon="🏆"
            value={stats.mastered}
            label="Master"
            gradient={['rgba(234,179,8,0.4)', 'rgba(202,138,4,0.4)']}
          />
        </Animated.View>

        {/* Level Cards Grid */}
        <View style={styles.levelGrid}>
          {stats.byDifficulty.map(({ difficulty, total, unlocked }) => (
            <LevelCard
              key={difficulty}
              difficulty={difficulty}
              totalCount={total}
              unlockedCount={unlocked}
              price={Math.max(1, Math.floor(LEVEL_PRICES[difficulty] * phrasalDiscountFactor))}
              coins={coins}
              onUnlockAll={() => handleUnlockAll(difficulty)}
              onStartQuiz={() => handleStartQuiz(difficulty)}
              onViewList={() => {
                haptic?.light?.();
                navigation.navigate('PhrasalVerbList' as never, { level: difficulty } as never);
              }}
            />
          ))}
        </View>

        {/* Bottom Padding for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 🎯 Juicy Modal */}
      {modalConfig && (
        <JuicyModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={modalConfig.title}
          titleEmoji={modalConfig.titleEmoji}
          message={modalConfig.message}
          secondaryMessage={modalConfig.secondaryMessage}
          secondaryEmoji={modalConfig.secondaryEmoji}
          type={modalConfig.type}
          buttons={modalConfig.onConfirm ? [
            {
              text: 'İptal',
              type: 'cancel',
              onPress: () => setModalVisible(false),
            },
            {
              text: modalConfig.confirmText || 'Tamam',
              type: 'primary',
              onPress: modalConfig.onConfirm,
            },
          ] : [
            {
              text: modalConfig.confirmText || 'Tamam',
              type: 'primary',
              onPress: () => setModalVisible(false),
            },
          ]}
        />
      )}
      
      {/* 🎓 İlk Giriş Hint Modal */}
      <JuicyModal
        visible={showHint}
        onClose={() => {
          setShowHint(false);
          setPhrasalHintShown(true);
        }}
        title="PHRASAL VERBS"
        titleEmoji="📚"
        message="Phrasal Verb'ler ayrı bir sistemdir. Quiz'den farklı olarak burada phrasal verb seviyeleri satın alınır ve tarlaya ekilir."
        secondaryMessage="Seviye kartlarından Quiz'e gir, yanlış yaptıkların tarlana ekilir!"
        secondaryEmoji="🌱"
        type="info"
        buttons={[
          {
            text: 'Anladım! 👍',
            type: 'primary',
            onPress: () => {
              setShowHint(false);
              setPhrasalHintShown(true);
            },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13131A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
  },
  header: {
    marginBottom: 20,
  },
  headerCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  headerGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerEmoji: {
    fontSize: 36,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(34, 197, 94, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    flexShrink: 0,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  subtitleCount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#a855f7',
  },
  subtitleText: {
    fontSize: 12,
    color: '#a7f3d0',
    fontWeight: '600',
  },
  subtitleFire: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 13,
    color: '#e9d5ff',
    marginTop: 4,
    fontWeight: '600',
  },
  coinWrapper: {
    borderRadius: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  coinInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinIcon: {
    fontSize: 18,
  },
  coinText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1f2937',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonFull: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  farmButtonGlow: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 30,
    zIndex: 0,
  },
  actionButtonIcon: {
    fontSize: 24,
    zIndex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    zIndex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 110,
  },
  statGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    zIndex: 0,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 6,
    zIndex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowRadius: 8,
    zIndex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d1d5db',
    marginTop: 2,
    zIndex: 1,
  },
  farmButton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  farmButtonSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  farmButtonWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  farmButtonGradientLarge: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  farmButtonGlowLarge: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  farmButtonIconLarge: {
    fontSize: 36,
  },
  farmButtonTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  farmButtonTitleLarge: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  farmButtonSubtitleLarge: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  farmButtonArrow: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    opacity: 0.8,
  },
  farmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  farmButtonIcon: {
    fontSize: 32,
  },
  farmButtonContent: {
    flex: 1,
  },
  farmButtonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  farmButtonSubtitle: {
    fontSize: 13,
    color: '#e9d5ff',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  levelCard: {
    width: (width - 48) / 2,
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    opacity: 0.3,
    zIndex: -1,
  },
  levelCardGradient: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ translateX: -100 }, { skewX: '-20deg' }],
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.3,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  levelBadgeText: {
    fontSize: 20,
    fontWeight: '900',
  },
  levelStats: {
    marginBottom: 10,
  },
  levelStatsText: {
    fontSize: 24,
    fontWeight: '900',
  },
  levelStatsLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  levelActions: {
    gap: 8,
  },
  unlockAllBtnWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  unlockAllBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  unlockAllBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1f2937',
  },
  quizBtnWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  quizBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quizBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  quizHintContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    alignSelf: 'center',
  },
  quizHintText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
});
