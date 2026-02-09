import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronRight, Flame, Star, RotateCcw, Heart, Sprout, Trophy, Puzzle, Wheat } from 'lucide-react-native';
import type { WordModel } from '../models/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 200;
const CARD_GAP = 12;

// 🎨 TEMA SİSTEMİ - FarmScreen ile senkronize
interface FavCardProps {
  word: WordModel;
  onToggleFavorite: () => void;
  index: number;
}

interface WrongCardProps {
  word: WordModel;
  onStudy: () => void;
  onHarvest?: () => void;
  index: number;
}

const CARD_THEMES = {
  red: {
    gradient: ['#7f1d1d', '#991b1b', '#7f1d1d'] as const,
    accent: '#ef4444',
    emoji: '🔴',
  },
  orange: {
    gradient: ['#7c2d12', '#9a3412', '#7c2d12'] as const,
    accent: '#f97316',
    emoji: '🟠',
  },
  yellow: {
    gradient: ['#713f12', '#854d0e', '#713f12'] as const,
    accent: '#eab308',
    emoji: '🟡',
  },
  green: {
    gradient: ['#14532d', '#065f46', '#14532d'] as const,
    accent: '#22c55e',
    emoji: '🟢',
  },
  master: {
    gradient: ['#a16207', '#ca8a04', '#a16207'] as const,
    accent: '#facc15',
    emoji: '🏆',
  },
  ultra: {
    gradient: ['#0891b2', '#06b6d4', '#3b82f6'] as const,
    accent: '#22d3ee',
    emoji: '💎',
  },
  perfect: {
    gradient: ['#a855f7', '#c084fc', '#8b5cf6'] as const,
    accent: '#c084fc',
    emoji: '👑',
  },
};

// 🎨 Tema seçici fonksiyon
const getWordTheme = (word: WordModel) => {
  const masterLevel = word.masterLevel || 0;
  const wrongCount = word.wrongCount || 0;

  if (masterLevel === 3) return CARD_THEMES.perfect;
  if (masterLevel === 2) return CARD_THEMES.ultra;
  if (masterLevel === 1) return CARD_THEMES.master;
  if (wrongCount >= 2) return CARD_THEMES.green;
  if (wrongCount >= 2) return CARD_THEMES.yellow;
  if (wrongCount >= 1) return CARD_THEMES.orange;
  return CARD_THEMES.red; // Default fallback
};

// ============================================================
// 🔥 WRONG CARD - Yanlış yapılan kelimeler için kart
// ============================================================

const WrongCard = React.memo(({ word, onStudy, onHarvest, index }: WrongCardProps) => {
  // Safety check - kelime geçersizse render etme
  if (!word || !word.text) {
    return null;
  }

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 🎨 Dinamik tema - fallback ile safe
  const theme = getWordTheme(word) || CARD_THEMES.red;
  
  // Tema null check (extra safety)
  if (!theme || !theme.gradient) {
    return null;
  }

  // 📊 Quiz istatistikleri - quizCorrect/quizWrong kullan (tüm sistemle tutarlı)
  const quizCorrect = word.quizCorrect || 0;
  const quizWrong = word.quizWrong || 0;
  const totalAnswers = quizCorrect + quizWrong;
  const successRate = totalAnswers > 0 ? Math.round((quizCorrect / totalAnswers) * 100) : 0;

  // 📝 Phrasal Verb kontrolü
  const isPhrasalVerb = word.isPhrasalVerb || false;

  // 🏆 Master kart mı?
  const masterLevel = word.masterLevel || 0;
  const isMasterCard = masterLevel > 0;
  const wrongCount = word.wrongCount || 0;
  
  // 🌾 HASAT HAZIR MI? Sadece isHarvestReady flag'ine bak
  const isHarvestReady = (word as any).isHarvestReady === true;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  // 🎨 Durum badge'i
  const statusText = masterLevel >= 3 ? 'Kraliyet' : masterLevel === 2 ? 'Elmas' : masterLevel === 1 ? 'Usta' : wrongCount >= 2 ? 'Yeşil' : wrongCount >= 1 ? 'Sarı' : 'Kırmızı';

  return (
    <View style={styles.cardWrapper}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onStudy}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wrongCard}
        >
          {/* Glass overlay */}
          <View style={styles.glassOverlay} />

          {/* 📚 PV Badge - Phrasal Verb ise göster */}
          {isPhrasalVerb && (
            <View style={styles.pvBadge}>
              <Text style={styles.pvBadgeText}>PV</Text>
            </View>
          )}

          {/* Status badge */}
          <View style={[styles.wrongBadge, { backgroundColor: theme.accent + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12 }}>{theme.emoji}</Text>
              <Text style={[styles.wrongBadgeText, { color: theme.accent }]}>{statusText}</Text>
            </View>
          </View>

          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(word.difficulty) }]}>
            <Text style={styles.levelBadgeText}>{word.difficulty}</Text>
          </View>

          {/* Word content */}
          <Text style={styles.wordText} numberOfLines={1}>{word.text}</Text>
          <Text style={styles.meaningText} numberOfLines={2}>{word.meaning}</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${successRate}%` }]} />
            </View>
            <Text style={styles.progressText}>{successRate}% başarı</Text>
          </View>

          {/* Action button - Hasat vakti geldiğinde hasat, yoksa çalış */}
          {isHarvestReady && onHarvest ? (
            <TouchableOpacity 
              style={[styles.actionButtonRed, { backgroundColor: theme.accent }]} 
              onPress={onHarvest}
            >
              <Text style={styles.actionButtonText}>🌾 HASAT</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButtonRed, { backgroundColor: theme.accent + '30' }]} onPress={onStudy}>
              <RotateCcw size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Çalış</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

// ============================================================
// ⭐ FAV CARD - Favori kelimeler için kart
// ============================================================

const FavCard = React.memo(({ word, onToggleFavorite, index }: FavCardProps) => {
  // Safety check - kelime geçersizse render etme
  if (!word || !word.text) {
    return null;
  }

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 📊 Quiz istatistikleri - quizCorrect/quizWrong kullan (tüm sistemle tutarlı)
  const quizCorrect = word.quizCorrect || 0;
  const quizWrong = word.quizWrong || 0;
  const totalAnswers = quizCorrect + quizWrong;
  const successRate = totalAnswers > 0 ? Math.round((quizCorrect / totalAnswers) * 100) : 0;

  // 📝 Phrasal Verb kontrolü
  const isPhrasalVerb = word.isPhrasalVerb || false;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.cardWrapper}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onToggleFavorite}
      >
        <LinearGradient
          colors={['#4c1d95', '#5b21b6', '#3730a3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.favCard}
        >
          {/* Glass overlay */}
          <View style={styles.glassOverlay} />

          {/* 📚 PV Badge - Phrasal Verb ise göster */}
          {isPhrasalVerb && (
            <View style={styles.pvBadge}>
              <Text style={styles.pvBadgeText}>PV</Text>
            </View>
          )}

          {/* Favorite star */}
          <View style={styles.favBadge}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
          </View>

          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(word.difficulty) }]}>
            <Text style={styles.levelBadgeText}>{word.difficulty}</Text>
          </View>

          {/* Word content */}
          <Text style={styles.wordText} numberOfLines={1}>{word.text}</Text>
          <Text style={styles.meaningText} numberOfLines={2}>{word.meaning}</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, styles.progressGreen, { width: `${successRate}%` }]} />
            </View>
            <Text style={styles.progressText}>{successRate}% ustalık</Text>
          </View>

          {/* Action button */}
          <TouchableOpacity style={styles.actionButtonGold} onPress={onToggleFavorite}>
            <Star size={14} color="#1a1a2e" fill="#FFD700" />
            <Text style={styles.actionButtonTextDark}>Favoride</Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

// ============================================================
// 📦 DASHBOARD SECTION - Yeniden kullanılabilir bölüm
// ============================================================
interface DashboardSectionProps {
  title: string;
  subtitle: string;
  icon: 'flame' | 'star' | 'sprout' | 'trophy' | 'wheat' | 'puzzle';
  iconColor: string;
  data: WordModel[];
  onSeeAll: () => void;
  onCardPress: (word: WordModel) => void;
  type: 'wrong' | 'favorite' | 'learning' | 'harvest' | 'master' | 'puzzle';
  onToggleFavorite?: (wordId: string) => void;
  onHarvest?: (wordId: string) => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  data,
  onSeeAll,
  onCardPress,
  type,
  onToggleFavorite,
  onHarvest,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 380;

  const renderItem = useCallback(({ item, index }: { item: WordModel; index: number }) => {
    if (type === 'learning' || type === 'harvest' || type === 'master' || type === 'wrong' || type === 'puzzle') {
      // Tüm öğrenme kartları için WrongCard kullan (kırmızı yerine uygun renk)
      return (
        <WrongCard
          word={item}
          onStudy={() => onCardPress(item)}
          onHarvest={onHarvest ? () => onHarvest(item.id) : undefined}
          index={index}
        />
      );
    }
    return (
      <FavCard
        word={item}
        onToggleFavorite={() => onToggleFavorite?.(item.id)}
        index={index}
      />
    );
  }, [type, onCardPress, onToggleFavorite]);

  const keyExtractor = useCallback((item: WordModel) => item.id, []);

  if (data.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '30' }]}>
            {icon === 'flame' ? (
              <Flame size={20} color={iconColor} fill={iconColor} />
            ) : icon === 'sprout' ? (
              <Sprout size={20} color={iconColor} />
            ) : icon === 'trophy' ? (
              <Trophy size={20} color={iconColor} />
            ) : icon === 'puzzle' ? (
              <Puzzle size={20} color={iconColor} />
            ) : icon === 'wheat' ? (
              <Wheat size={20} color={iconColor} />
            ) : (
              <Star size={20} color={iconColor} fill={iconColor} />
            )}
          </View>
          <View style={{ maxWidth: isSmallScreen ? 140 : undefined }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll} activeOpacity={0.7}>
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(139, 92, 246, 0.2)']}
            style={[
              styles.seeAllGradient,
              isSmallScreen && { paddingHorizontal: 8, paddingVertical: 4 }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.seeAllText, isSmallScreen && { fontSize: 11, fontWeight: '700' }]}>
              Tümü
            </Text>
            <ChevronRight size={isSmallScreen ? 12 : 12} color="#a855f7" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Horizontal List */}
      <FlatList
        data={data.slice(0, 10)}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
      />
    </View>
  );
};

// ============================================================
// 🎨 HELPER FUNCTIONS
// ============================================================
const getLevelColor = (difficulty: string): string => {
  const colors: Record<string, string> = {
    A1: '#22c55e',
    A2: '#84cc16',
    B1: '#eab308',
    B2: '#f97316',
    C1: '#ef4444',
    C2: '#dc2626',
  };
  return colors[difficulty] || '#6b7280';
};

// ============================================================
// 💅 STYLES
// ============================================================
const styles = StyleSheet.create({
  // Section
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700', // Reduced from 800
    color: '#fff',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  seeAllButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  seeAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  seeAllText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c084fc',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },

  // Card Wrapper
  cardWrapper: {
    width: CARD_WIDTH,
  },

  // Wrong Card
  wrongCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    minHeight: 190,
    position: 'relative',
    overflow: 'hidden',
  },

  // Fav Card
  favCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    minHeight: 190,
    position: 'relative',
    overflow: 'hidden',
  },

  // Glass overlay
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },

  // Badges
  pvBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 11,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.6)',
  },
  pvBadgeText: {
    fontSize: 11,
    fontWeight: '700', // Reduced from 900
    color: '#f3e8ff',
    letterSpacing: 0.5,
  },
  wrongBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  favBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Content
  wordText: {
    fontSize: 18,
    fontWeight: '700', // Reduced from 800 for safety
    color: '#fff',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: 12,
  },

  // Progress
  progressContainer: {
    marginBottom: 12,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressOrange: {
    backgroundColor: '#f97316',
  },
  progressGreen: {
    backgroundColor: '#22c55e',
  },
  progressText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },

  // Action Buttons
  actionButtonRed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  actionButtonGold: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  actionButtonTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
});

export default DashboardSection;
