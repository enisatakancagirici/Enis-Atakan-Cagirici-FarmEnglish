import React, { useMemo, useCallback, memo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Trophy, Zap, Crown, Star, Flame, Gift, ChevronLeft, Sparkles, Award } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';

const { width, height } = Dimensions.get('window');
const IS_SMALL_SCREEN = height < 700;
const IS_TINY_SCREEN = height < 600;

interface ProgressMeta {
  current: number;
  required: number;
  percent: number;
}

interface CategoryHeaderProps {
  title: string;
  count: string;
  icon: string;
}

// 🎯 UNIVERSAL PROGRESS CALCULATOR
const getProgressValue = (
  ach: any,
  totals: {
    totalCorrect: number;
    totalWrong: number;
    bestStreak: number;
    level: number;
    harvested: number;
    totalWords: number;
    totalQuizzes: number;
    masterWords: number;
    perfectMasters: number;
    streak: number;
    learnedWords: number;
    phrasalVerbs: number;
    coins: number;
  }
): ProgressMeta => {
  const { id, requirement } = ach;
  let current = 0;

  if (id.startsWith('combo_')) current = totals.bestStreak;
  else if (id.startsWith('level_')) current = totals.level;
  else if (id.startsWith('harvest_')) current = totals.harvested;
  else if (id.startsWith('words_')) current = totals.learnedWords;
  else if (id.startsWith('master_')) current = totals.masterWords;
  else if (id.startsWith('perfect_')) current = totals.perfectMasters;
  else if (id.startsWith('phrasal_')) current = totals.phrasalVerbs;
  else if (id.startsWith('coins_')) current = totals.coins;
  else if (id === 'first_correct') current = totals.totalCorrect;
  else if (id === 'first_wrong') current = totals.totalWrong;
  else if (id === 'first_harvest') current = totals.harvested;
  else if (id === 'first_quiz') current = totals.totalQuizzes;
  else if (id === 'first_master') current = totals.masterWords;

  const percent = Math.min(100, Math.round((current / requirement) * 100));
  return { current, required: requirement, percent };
};

// 🔥 ULTRA JUICY ACHIEVEMENT CARD - Tamamen yeniden tasarlandı
const AchievementCard = memo(({
  title,
  description,
  icon,
  unlocked,
  claimed,
  reward,
  progress,
  onClaim,
  index,
}: {
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  claimed: boolean;
  reward: { coins: number; xp: number };
  progress: ProgressMeta;
  onClaim: () => void;
  index: number;
}) => {
  const percent = progress.percent;
  
  // 🎯 REANIMATED - Pulse animasyonu
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.3);
  
  // 🎭 Unlocked ama claimed değilse pulse animasyonu
  useEffect(() => {
    if (unlocked && !claimed) {
      pulse.value = withRepeat(
        withTiming(1.03, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      glow.value = withRepeat(
        withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulse.value = 1;
      glow.value = 0;
    }
  }, [unlocked, claimed]);

  // 🎯 Kategori rengi
  const getCardColors = (): readonly [string, string] => {
    if (claimed) return ['#065f46', '#047857'] as const;
    if (unlocked) return ['#7c3aed', '#a855f7'] as const;
    return ['#1e1e2e', '#2d2d44'] as const;
  };

  // 🔥 Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  // 🎁 CLAIM BUTONU - Ayrı bir component gibi davranıyor
  const ClaimButton = useCallback(() => {
    const handlePress = () => {
      haptic.harvestCelebration?.();
      sound.playEpicHarvest?.();
      onClaim();
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.6}
        style={styles.claimBtnWrapper}
      >
        <LinearGradient 
          colors={['#22c55e', '#15803d']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.claimBtn}
        >
          <Gift size={20} color="#fff" />
          <Text style={styles.claimText}>AL</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [onClaim]);

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index, 8) * 40).springify()}
    >
      <Animated.View
        style={unlocked && !claimed ? animatedCardStyle : undefined}
      >
      <LinearGradient
        colors={getCardColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          unlocked && !claimed && styles.cardGlow,
        ]}
      >
        {/* 🌟 GLOW PULSE - Unlocked kartlar için */}
        {unlocked && !claimed && (
          <Animated.View style={[styles.glowOverlay, animatedGlowStyle]} />
        )}

        {/* ✨ Claimed check overlay */}
        {claimed && (
          <View style={styles.claimedOverlay}>
            <Text style={styles.claimedCheck}>✓</Text>
          </View>
        )}
        
        {/* 🎯 Header */}
        <View style={styles.cardHeader}>
          <View style={[
            styles.iconCircle,
            unlocked && styles.iconCircleUnlocked,
            claimed && styles.iconCircleClaimed,
          ]}>
            <Text style={styles.iconEmoji}>{icon}</Text>
          </View>
          
          <View style={styles.cardInfo}>
            <Text style={[
              styles.cardTitle,
              unlocked && styles.cardTitleUnlocked,
              claimed && styles.cardTitleClaimed,
            ]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.cardDesc} numberOfLines={1}>{description}</Text>
          </View>

          {/* 🎁 Action Button Area */}
          {claimed ? (
            <View style={styles.claimedBadge}>
              <Sparkles size={16} color="#22c55e" />
            </View>
          ) : unlocked ? (
            <ClaimButton />
          ) : (
            <View style={styles.lockedBadge}>
              <Text style={styles.lockEmoji}>🔒</Text>
            </View>
          )}
        </View>

        {/* 💰 Rewards Row */}
        <View style={styles.rewardsRow}>
          <View style={styles.rewardChip}>
            <Text style={styles.rewardEmoji}>💰</Text>
            <Text style={styles.rewardValue}>+{reward.coins}</Text>
          </View>
          <View style={styles.rewardChip}>
            <Zap size={12} color="#22d3ee" />
            <Text style={styles.rewardValue}>+{reward.xp}</Text>
          </View>
          <View style={styles.progressChip}>
            <Text style={styles.progressValueText}>
              {progress.current}/{progress.required}
            </Text>
          </View>
        </View>

        {/* 📊 Progress Bar */}
        <View style={styles.progressBg}>
          <LinearGradient
            colors={claimed ? ['#22c55e', '#16a34a'] : unlocked ? ['#a855f7', '#7c3aed'] : ['#3b82f6', '#1d4ed8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${percent}%` }]}
          />
        </View>
      </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
});

// 🏆 HERO STATS SECTION - Animated entrance
const HeroStats = memo(({ level, bestStreak, unlocked, total, coins, xp }: any) => (
  <Animated.View entering={FadeInUp.delay(100).springify()}>
    <LinearGradient 
      colors={['rgba(124, 58, 237, 0.3)', 'rgba(59, 130, 246, 0.2)', 'rgba(34, 197, 94, 0.1)']} 
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroContent}>
        <View style={styles.heroLeft}>
          <View style={styles.heroBadge}>
            <Award size={14} color="#fbbf24" />
            <Text style={styles.heroBadgeText}>BAŞARIM MERKEZİ</Text>
          </View>
          <Text style={styles.heroTitle}>
            {unlocked}/{total} Açık
          </Text>
          <Text style={styles.heroSubtitle}>
            Lv.{level} • {bestStreak}x Max Combo
          </Text>
        </View>
        
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatEmoji}>💰</Text>
            <Text style={styles.heroStatValue}>{coins >= 1000 ? `${(coins/1000).toFixed(1)}k` : coins}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatEmoji}>⚡</Text>
            <Text style={styles.heroStatValue}>{xp >= 1000 ? `${(xp/1000).toFixed(1)}k` : xp}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
));

// 📂 CATEGORY HEADER - Animated entrance
const CategoryHeader = memo(({ title, count, icon }: CategoryHeaderProps) => (
  <Animated.View entering={FadeInUp.springify()}>
    <LinearGradient
      colors={['rgba(124, 58, 237, 0.12)', 'rgba(59, 130, 246, 0.08)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.categoryHeader}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
      <Text style={styles.categoryTitle}>{title}</Text>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryCount}>{count}</Text>
      </View>
    </LinearGradient>
  </Animated.View>
));

const AchievementsScreen = () => {
  const navigation = useNavigation();
  const achievements = useFarmStore(s => s.achievements);
  const coins = useFarmStore(s => s.coins);
  const xp = useFarmStore(s => s.xp);
  const level = useFarmStore(s => s.level);
  const bestStreak = useFarmStore(s => s.bestStreak);
  const totalCorrect = useFarmStore(s => s.totalCorrect);
  const totalWrong = useFarmStore(s => s.totalWrong);
  const totalQuizzes = useFarmStore(s => s.totalQuizzes);
  const streak = useFarmStore(s => s.streak);
  const inventory = useFarmStore(s => s.inventory);
  const pool = useFarmStore(s => s.pool);
  const farm = useFarmStore(s => s.farm);
  const learnedWordIds = useFarmStore(s => s.learnedWordIds);
  const phrasalVerbQuizStats = useFarmStore(s => s.phrasalVerbQuizStats);
  const lifetimeHarvests = useFarmStore(s => s.lifetimeHarvests);
  const checkAchievements = useFarmStore(s => s.checkAchievements);
  const claimAchievementReward = useFarmStore(s => s.claimAchievementReward);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const claimedCount = achievements.filter(a => a.claimed).length;

  // Calculate stats
  const masterWords = useMemo(() => 
    [...pool, ...farm, ...inventory].filter(w => (w.masterLevel || 0) >= 1).length,
    [pool, farm, inventory]
  );

  const perfectMasters = useMemo(() =>
    [...pool, ...farm, ...inventory].filter(w => (w.masterLevel || 0) === 3).length,
    [pool, farm, inventory]
  );

  useFocusEffect(
    useCallback(() => {
      checkAchievements();
    }, [checkAchievements])
  );

  // 🎯 Kategorilere ayır
  const categorizedData = useMemo(() => {
    const totals = {
      totalCorrect,
      totalWrong,
      bestStreak,
      level,
      harvested: lifetimeHarvests || 0,
      totalWords: pool.length + farm.length + inventory.length,
      totalQuizzes,
      masterWords,
      perfectMasters,
      streak,
      learnedWords: learnedWordIds?.length || 0,
      phrasalVerbs: phrasalVerbQuizStats.perfectQuizzes || 0,
      coins,
    };

    const categories = [
      { key: 'first', title: 'Ilk Adimlar', icon: '🎯', prefix: 'first_' },
      { key: 'combo', title: 'Combo Serisi', icon: '🔥', prefix: 'combo_' },
      { key: 'level', title: 'Seviye', icon: '⭐', prefix: 'level_' },
      { key: 'harvest', title: 'Hasat', icon: '🌾', prefix: 'harvest_' },
      { key: 'words', title: 'Kelime Hazinesi', icon: '📚', prefix: 'words_' },
      { key: 'master', title: 'Master', icon: '🌟', prefix: 'master_' },
      { key: 'perfect', title: 'Perfect', icon: '💎', prefix: 'perfect_' },
      { key: 'phrasal', title: 'Phrasal Verb', icon: '📗', prefix: 'phrasal_' },
      { key: 'coins', title: 'Zenginlik', icon: '💰', prefix: 'coins_' },
    ];

    const data: any[] = [];

    categories.forEach(cat => {
      const items = achievements.filter(a => a.id.startsWith(cat.prefix));
      if (items.length > 0) {
        data.push({ type: 'header', ...cat, count: items.filter(i => i.unlocked).length + '/' + items.length });
        items.forEach(ach => {
          data.push({
            type: 'item',
            ...ach,
            progress: getProgressValue(ach, totals),
          });
        });
      }
    });

    return data;
  }, [achievements, totalCorrect, totalWrong, bestStreak, level, lifetimeHarvests, pool.length, farm.length, totalQuizzes, masterWords, perfectMasters, streak, learnedWordIds, phrasalVerbQuizStats, coins]);

  const handleClaim = useCallback((id: string) => {
    claimAchievementReward(id);
  }, [claimAchievementReward]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.type === 'header') {
      return <CategoryHeader title={item.title} count={item.count} icon={item.icon} />;
    }
    
    return (
      <AchievementCard
        title={item.title}
        description={item.description}
        icon={item.icon}
        unlocked={item.unlocked}
        claimed={item.claimed}
        reward={item.reward}
        progress={item.progress}
        onClaim={() => handleClaim(item.id)}
        index={index}
      />
    );
  }, [handleClaim]);

  const keyExtractor = useCallback((item: any) => 
    item.type === 'header' ? `header-${item.key}` : item.id,
  []);

  const ListHeader = useMemo(() => (
    <>
      {/* 🎯 TOP BAR */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <Trophy size={IS_SMALL_SCREEN ? 18 : 20} color="#fbbf24" />
              <Text style={styles.screenTitle}>Başarımlar</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <HeroStats
        level={level}
        bestStreak={bestStreak}
        unlocked={unlockedCount}
        total={achievements.length}
        coins={coins}
        xp={xp}
      />

      <Animated.View entering={FadeInUp.delay(150).springify()}>
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Crown size={14} color="#fbbf24" />
            <Text style={styles.quickStatText}>{unlockedCount} Açık</Text>
          </View>
          <View style={styles.quickStat}>
            <Trophy size={14} color="#22c55e" />
            <Text style={styles.quickStatText}>{claimedCount} Alındı</Text>
          </View>
          <View style={styles.quickStat}>
            <Star size={14} color="#a855f7" />
            <Text style={styles.quickStatText}>{achievements.length - unlockedCount} Kilitli</Text>
          </View>
        </View>
      </Animated.View>
    </>
  ), [level, bestStreak, unlockedCount, claimedCount, achievements.length, coins, xp, navigation]);

  return (
    <LinearGradient colors={['#05050b', '#0a0a12', '#0f0f18']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <FlashList
          data={categorizedData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: IS_SMALL_SCREEN ? 4 : 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: IS_SMALL_SCREEN ? 18 : 22,
    fontWeight: '900',
    color: '#fff',
  },

  // 🏆 HERO
  hero: {
    borderRadius: 18,
    padding: IS_SMALL_SCREEN ? 14 : 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: IS_SMALL_SCREEN ? 22 : 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: IS_SMALL_SCREEN ? 11 : 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
  },
  heroStat: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: IS_SMALL_SCREEN ? 10 : 12,
    alignItems: 'center',
    minWidth: IS_SMALL_SCREEN ? 52 : 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroStatEmoji: {
    fontSize: IS_SMALL_SCREEN ? 14 : 16,
  },
  heroStatValue: {
    fontSize: IS_SMALL_SCREEN ? 13 : 15,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },
  heroStatLabel: {
    fontSize: 14,
    marginTop: 2,
  },

  // 📊 QUICK STATS
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: IS_SMALL_SCREEN ? 10 : 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickStatText: {
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },

  // 📂 CATEGORY
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: IS_SMALL_SCREEN ? 14 : 16,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a855f7',
  },

  // 🎴 CARD
  card: {
    borderRadius: IS_SMALL_SCREEN ? 14 : 16,
    padding: IS_SMALL_SCREEN ? 12 : 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardGlow: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: IS_SMALL_SCREEN ? 14 : 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL_SCREEN ? 10 : 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: IS_SMALL_SCREEN ? 40 : 46,
    height: IS_SMALL_SCREEN ? 40 : 46,
    borderRadius: IS_SMALL_SCREEN ? 20 : 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconCircleUnlocked: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 2,
    borderColor: '#a855f7',
  },
  iconCircleClaimed: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  iconEmoji: {
    fontSize: IS_SMALL_SCREEN ? 18 : 20,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
  },
  cardTitleUnlocked: {
    color: '#fff',
  },
  cardTitleClaimed: {
    color: '#22c55e',
  },
  cardDesc: {
    fontSize: IS_SMALL_SCREEN ? 10 : 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },

  // 🎁 BUTTONS - BÜYÜK VE NET
  claimBtnWrapper: {
    // TouchableOpacity için geniş tıklama alanı
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 80,
    minHeight: 44,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  claimText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  claimedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  lockedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 16,
  },
  claimedOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedCheck: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '900',
  },

  // 💰 REWARDS
  rewardsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardEmoji: {
    fontSize: 11,
  },
  rewardValue: {
    fontSize: IS_SMALL_SCREEN ? 10 : 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  progressChip: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  progressValueText: {
    fontSize: IS_SMALL_SCREEN ? 10 : 11,
    fontWeight: '700',
    color: '#3b82f6',
  },

  // 📊 PROGRESS BAR
  progressBg: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default AchievementsScreen;
