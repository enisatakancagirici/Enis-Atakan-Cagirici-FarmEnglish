import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import JuicyModal from '../components/JuicyModal';

const { width } = Dimensions.get('window');

// 💰 Seviye fiyatları
const LEVEL_PRICES: Record<string, number> = {
  A1: 50,
  A2: 100,
  B1: 200,
  B2: 400,
  C1: 800,
  C2: 1500,
};

// 🎨 Seviye renkleri
const LEVEL_COLORS: Record<string, { gradient: string[]; border: string; text: string }> = {
  A1: { gradient: ['#065f46', '#047857'], border: '#10b981', text: '#a7f3d0' },
  A2: { gradient: ['#1e3a8a', '#1d4ed8'], border: '#3b82f6', text: '#93c5fd' },
  B1: { gradient: ['#78350f', '#b45309'], border: '#f59e0b', text: '#fde68a' },
  B2: { gradient: ['#7c2d12', '#c2410c'], border: '#f97316', text: '#fed7aa' },
  C1: { gradient: ['#7f1d1d', '#b91c1c'], border: '#ef4444', text: '#fecaca' },
  C2: { gradient: ['#581c87', '#7c3aed'], border: '#a855f7', text: '#e9d5ff' },
};

const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// 🔐 Unlock butonlu kart
const PhrasalVerbCard = ({
  pv,
  isUnlocked,
  price,
  coins,
  onUnlock,
  levelColors,
}: {
  pv: any;
  isUnlocked: boolean;
  price: number;
  coins: number;
  onUnlock: () => void;
  levelColors: typeof LEVEL_COLORS.A1;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <LinearGradient
        colors={isUnlocked ? levelColors.gradient as any : ['#1f2937', '#111827']}
        style={[styles.card, { borderColor: isUnlocked ? levelColors.border : '#374151' }]}
      >
        {/* Lock Overlay */}
        {!isUnlocked && (
          <View style={styles.lockOverlay}>
            <TouchableOpacity
              style={[
                styles.unlockButton,
                { backgroundColor: coins >= price ? '#eab308' : '#4b5563' },
              ]}
              onPress={onUnlock}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={coins < price}
            >
              <Text style={styles.unlockButtonText}>🔓 {price} Coin</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View style={[!isUnlocked && styles.blurredContent]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.verbText, { color: levelColors.text }]}>
              {pv.verb}
            </Text>
            <View style={[styles.difficultyBadge, { backgroundColor: levelColors.border + '40' }]}>
              <Text style={[styles.difficultyText, { color: levelColors.text }]}>
                {pv.difficulty}
              </Text>
            </View>
          </View>

          <Text style={styles.meaningText}>📖 {pv.meaning}</Text>
          
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleText}>💬 "{pv.example}"</Text>
          </View>

          {/* Mastery Progress */}
          {isUnlocked && pv.mastery !== undefined && (
            <View style={styles.masteryContainer}>
              <View style={styles.masteryHeader}>
                <Text style={styles.masteryLabel}>Öğrenme</Text>
                <Text style={styles.masteryPercent}>{pv.mastery || 0}%</Text>
              </View>
              <View style={styles.masteryBarBg}>
                <View
                  style={[
                    styles.masteryBarFill,
                    {
                      width: `${pv.mastery || 0}%`,
                      backgroundColor:
                        (pv.mastery || 0) >= 80
                          ? '#22c55e'
                          : (pv.mastery || 0) >= 50
                          ? '#eab308'
                          : '#ef4444',
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {isUnlocked && (
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedText}>✅</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

// 📊 Stats Card
const StatsCard = ({ icon, value, label, gradient }: {
  icon: string;
  value: string | number;
  label: string;
  gradient: string[];
}) => (
  <LinearGradient colors={gradient as any} style={styles.statsCard}>
    <Text style={styles.statsIcon}>{icon}</Text>
    <Text style={styles.statsValue}>{value}</Text>
    <Text style={styles.statsLabel}>{label}</Text>
  </LinearGradient>
);

// 🎮 Quiz Button
const QuizLevelButton = ({
  difficulty,
  unlockedCount,
  isDisabled,
  onPress,
}: {
  difficulty: string;
  unlockedCount: number;
  isDisabled: boolean;
  onPress: () => void;
}) => {
  const colors = LEVEL_COLORS[difficulty];

  return (
    <TouchableOpacity
      style={[
        styles.quizButton,
        isDisabled && styles.quizButtonDisabled,
        !isDisabled && { borderColor: colors.border },
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <LinearGradient
        colors={isDisabled ? ['#374151', '#1f2937'] : colors.gradient as any}
        style={styles.quizButtonGradient}
      >
        <Text style={styles.quizButtonIcon}>📖</Text>
        <Text style={[styles.quizButtonText, isDisabled && styles.quizButtonTextDisabled]}>
          {difficulty}
        </Text>
        <Text style={[styles.quizButtonCount, isDisabled && styles.quizButtonTextDisabled]}>
          {unlockedCount} verb
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// 🏠 Ana Ekran
export default function PhrasalVerbsScreen() {
  const navigation = useNavigation<any>();
  
  // Store
  const phrasalVerbs = useFarmStore(s => s.phrasalVerbs);
  const unlockedPhrasalVerbs = useFarmStore(s => s.unlockedPhrasalVerbs);
  const coins = useFarmStore(s => s.coins);
  const unlockPhrasalVerb = useFarmStore(s => s.unlockPhrasalVerb);
  const loadPhrasalVerbs = useFarmStore(s => s.loadPhrasalVerbs);

  // State
  const [selectedDifficulty, setSelectedDifficulty] = useState('A1');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Load phrasal verbs
  useEffect(() => {
    if (phrasalVerbs.length === 0) {
      loadPhrasalVerbs?.();
    }
  }, [phrasalVerbs, loadPhrasalVerbs]);

  // 📊 Stats hesaplama
  const stats = useMemo(() => {
    const total = phrasalVerbs.length;
    const unlocked = unlockedPhrasalVerbs.length;
    const byDifficulty = DIFFICULTIES.map(diff => ({
      difficulty: diff,
      total: phrasalVerbs.filter(pv => pv.difficulty === diff).length,
      unlocked: phrasalVerbs.filter(
        pv => pv.difficulty === diff && unlockedPhrasalVerbs.includes(pv.id)
      ).length,
    }));
    return { total, unlocked, byDifficulty };
  }, [phrasalVerbs, unlockedPhrasalVerbs]);

  // 🔍 Filtreleme
  const filteredVerbs = useMemo(() => {
    return phrasalVerbs
      .filter(pv => pv.difficulty === selectedDifficulty)
      .filter(pv => {
        if (!searchTerm) return true;
        return (
          pv.verb.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pv.meaning.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
  }, [phrasalVerbs, selectedDifficulty, searchTerm]);

  // 🔓 Tek kilit açma
  const handleUnlock = useCallback((verbId: string, difficulty: string) => {
    const price = LEVEL_PRICES[difficulty];
    if (coins < price) {
      haptic?.light?.();
      setModalConfig({
        title: 'Yetersiz Coin',
        titleEmoji: '❌',
        message: `Bu verb için ${price} coin gerekiyor.`,
        secondaryMessage: `Mevcut: ${coins} coin`,
        secondaryEmoji: '💰',
        type: 'error',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }

    setModalConfig({
      title: 'Kilit Aç',
      titleEmoji: '🔓',
      message: `${price} coin harcayarak bu phrasal verb'ü açmak istiyor musunuz?`,
      type: 'purchase',
      confirmText: 'Aç',
      onConfirm: () => {
        setModalVisible(false);
        unlockPhrasalVerb?.(verbId, difficulty);
        haptic?.harvestCelebration?.();
        sound?.playUnlock?.();
      },
    });
    setModalVisible(true);
  }, [coins, unlockPhrasalVerb]);

  // 🔓 Tümünü aç
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

    const totalCost = verbsToUnlock.length * LEVEL_PRICES[difficulty];
    if (coins < totalCost) {
      haptic?.light?.();
      setModalConfig({
        title: 'Yetersiz Coin',
        titleEmoji: '❌',
        message: `Tümü için ${totalCost.toLocaleString()} coin gerekiyor.`,
        secondaryMessage: `Mevcut: ${coins.toLocaleString()} coin`,
        secondaryEmoji: '💰',
        type: 'error',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }

    setModalConfig({
      title: 'Tümünü Aç',
      titleEmoji: '🔓',
      message: `${verbsToUnlock.length} phrasal verb için ${totalCost.toLocaleString()} coin harcamak istiyor musunuz?`,
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
  }, [phrasalVerbs, unlockedPhrasalVerbs, coins, unlockPhrasalVerb]);

  // 🎮 Quiz'e git
  const handleGoToQuiz = useCallback((difficulty: string) => {
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
    navigation.navigate('PhrasalVerbQuiz', { level: difficulty });
  }, [stats, navigation]);

  const lockedCount = filteredVerbs.filter(pv => !unlockedPhrasalVerbs.includes(pv.id)).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>📚 PHRASAL VERBS</Text>
          <Text style={styles.subtitle}>300 Phrasal Verb - Seviyene göre kilitle aç! 💰</Text>
        </Animated.View>

        {/* Quiz Buttons */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.quizSection}>
          <Text style={styles.sectionTitle}>Seviye Seç ve Quiz'e Başla:</Text>
          <View style={styles.quizButtonGrid}>
            {DIFFICULTIES.map(diff => {
              const diffStats = stats.byDifficulty.find(d => d.difficulty === diff);
              const unlockedCount = diffStats?.unlocked || 0;
              const isDisabled = unlockedCount < 4;
              return (
                <QuizLevelButton
                  key={diff}
                  difficulty={diff}
                  unlockedCount={unlockedCount}
                  isDisabled={isDisabled}
                  onPress={() => handleGoToQuiz(diff)}
                />
              );
            })}
          </View>
          <Text style={styles.quizHint}>En az 4 phrasal verb kilidini açmalısın!</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.statsRow}>
          <StatsCard
            icon="✅"
            value={`${stats.unlocked}/${stats.total}`}
            label="Unlocked"
            gradient={['rgba(22,163,74,0.4)', 'rgba(21,128,61,0.4)']}
          />
          <StatsCard
            icon="💰"
            value={coins}
            label="Coins"
            gradient={['rgba(234,179,8,0.4)', 'rgba(202,138,4,0.4)']}
          />
          <StatsCard
            icon="🏆"
            value={selectedDifficulty}
            label="Seviye"
            gradient={['rgba(147,51,234,0.4)', 'rgba(126,34,206,0.4)']}
          />
        </Animated.View>

        {/* Difficulty Tabs */}
        <Animated.View entering={FadeInUp.delay(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {DIFFICULTIES.map(diff => {
              const stat = stats.byDifficulty.find(s => s.difficulty === diff);
              const isSelected = diff === selectedDifficulty;
              const allUnlocked = stat && stat.unlocked === stat.total;
              const colors = LEVEL_COLORS[diff];

              return (
                <TouchableOpacity
                  key={diff}
                  onPress={() => setSelectedDifficulty(diff)}
                  style={[
                    styles.tab,
                    isSelected && styles.tabSelected,
                    allUnlocked && styles.tabCompleted,
                  ]}
                >
                  <LinearGradient
                    colors={
                      isSelected
                        ? ['#ec4899', '#8b5cf6']
                        : allUnlocked
                        ? colors.gradient as any
                        : ['#374151', '#1f2937']
                    }
                    style={styles.tabGradient}
                  >
                    <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                      {diff}
                    </Text>
                    <Text style={styles.tabCount}>
                      {stat?.unlocked}/{stat?.total} {allUnlocked && '✅'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Search */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Phrasal Verb ara... (örn: give up)"
            placeholderTextColor="#6b7280"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Unlock All Button */}
        {lockedCount > 0 && (
          <Animated.View entering={FadeInUp.delay(600)} style={styles.unlockAllContainer}>
            <TouchableOpacity onPress={() => handleUnlockAll(selectedDifficulty)}>
              <LinearGradient
                colors={['#eab308', '#f97316', '#ef4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.unlockAllButton}
              >
                <Text style={styles.unlockAllText}>
                  💰 Tüm {selectedDifficulty} Seviyesini Aç
                </Text>
                <Text style={styles.unlockAllPrice}>
                  ({lockedCount} x {LEVEL_PRICES[selectedDifficulty]} = {lockedCount * LEVEL_PRICES[selectedDifficulty]} coin)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Phrasal Verbs Grid */}
        <View style={styles.cardsGrid}>
          {filteredVerbs.map((pv, index) => (
            <Animated.View key={pv.id} entering={FadeIn.delay(100 + index * 30)}>
              <PhrasalVerbCard
                pv={pv}
                isUnlocked={unlockedPhrasalVerbs.includes(pv.id)}
                price={LEVEL_PRICES[pv.difficulty]}
                coins={coins}
                onUnlock={() => handleUnlock(pv.id, pv.difficulty)}
                levelColors={LEVEL_COLORS[pv.difficulty]}
              />
            </Animated.View>
          ))}
        </View>

        {filteredVerbs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>😢</Text>
            <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
          </View>
        )}

        {/* Farm'a Git Butonu */}
        <TouchableOpacity
          style={styles.farmButton}
          onPress={() => navigation.navigate('PhrasalVerbFarm')}
        >
          <LinearGradient
            colors={['#7c3aed', '#ec4899']}
            style={styles.farmButtonGradient}
          >
            <Text style={styles.farmButtonText}>🌱 Phrasal Verb Tarlasına Git</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#c4b5fd',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c4b5fd',
    textAlign: 'center',
    marginBottom: 16,
  },
  quizSection: {
    marginBottom: 24,
  },
  quizButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  quizButton: {
    width: (width - 64) / 3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  quizButtonDisabled: {
    opacity: 0.5,
  },
  quizButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  quizButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quizButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  quizButtonTextDisabled: {
    color: '#6b7280',
  },
  quizButtonCount: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 4,
  },
  quizHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statsIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statsLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  tabsContainer: {
    paddingVertical: 8,
    gap: 10,
  },
  tab: {
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 10,
  },
  tabSelected: {
    transform: [{ scale: 1.1 }],
  },
  tabCompleted: {},
  tabGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9ca3af',
  },
  tabTextSelected: {
    color: '#fff',
  },
  tabCount: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55,65,81,0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  unlockAllContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  unlockAllButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  unlockAllText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  unlockAllPrice: {
    fontSize: 12,
    color: '#fef3c7',
    marginTop: 4,
  },
  cardsGrid: {
    gap: 16,
  },
  cardContainer: {
    marginBottom: 0,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  unlockButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  blurredContent: {
    opacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verbText: {
    fontSize: 22,
    fontWeight: '800',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  meaningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  exampleContainer: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  exampleText: {
    fontSize: 14,
    color: '#c4b5fd',
    fontStyle: 'italic',
  },
  masteryContainer: {
    marginTop: 16,
  },
  masteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  masteryLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  masteryPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c4b5fd',
  },
  masteryBarBg: {
    height: 8,
    backgroundColor: '#1f2937',
    borderRadius: 4,
    overflow: 'hidden',
  },
  masteryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  unlockedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  unlockedText: {
    fontSize: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
  },
  farmButton: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  farmButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  farmButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
});
