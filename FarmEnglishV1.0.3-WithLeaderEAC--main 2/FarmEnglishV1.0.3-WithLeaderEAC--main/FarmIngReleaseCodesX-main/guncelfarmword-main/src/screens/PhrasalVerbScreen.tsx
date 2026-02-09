import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRoute, RouteProp } from '@react-navigation/native';
import { NEON_BACKGROUND } from '../utils/theme';

type PhrasalVerbScreenParams = {
  PhrasalVerbs: {
    filterLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============= TYPES =============

interface PhrasalVerb {
  id: string;
  verb: string;
  definition: string;
  example: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// ============= ANIMATED COMPONENTS =============

// Animated Header
const AnimatedHeader = memo(({ searchQuery, onSearchChange }: {
  searchQuery: string;
  onSearchChange: (text: string) => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <Text style={styles.title}>🔥 Phrasal Verbs</Text>
      <Text style={styles.subtitle}>İngilizce deyimsel fiiller</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Ara..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>
    </Animated.View>
  );
});

const HeroSection = ({
  total,
  filtered,
  onQuickQuiz,
  onRandomHighlight,
}: {
  total: number;
  filtered: number;
  onQuickQuiz: () => void;
  onRandomHighlight: () => void;
}) => {
  return (
    <LinearGradient
      colors={['#312e81', '#1e1b4b', '#111827'] as const}
      style={styles.heroCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.heroTopRow}>
        <View>
          <Text style={styles.heroEyebrow}>Premium Hasat Alanı</Text>
          <Text style={styles.heroTitle}>Phrasal Master</Text>
          <Text style={styles.heroSubtitle}>Filtrelediğin {filtered} kelime hazır.</Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>⚡ {total}</Text>
          <Text style={styles.heroBadgeLabel}>Toplam</Text>
        </View>
      </View>

      <View style={styles.heroStatsRow}>
        <View style={styles.heroStatBox}>
          <Text style={styles.heroStatLabel}>Filtreli</Text>
          <Text style={styles.heroStatValue}>{filtered}</Text>
          <Text style={styles.heroStatHint}>aktif</Text>
        </View>
        <View style={styles.heroStatBox}>
          <Text style={styles.heroStatLabel}>Günlük hedef</Text>
          <Text style={styles.heroStatValue}>{Math.min(12, Math.max(4, Math.round(filtered / 3)))}x</Text>
          <Text style={styles.heroStatHint}>öneri</Text>
        </View>
        <View style={styles.heroStatBox}>
          <Text style={styles.heroStatLabel}>Serbest mod</Text>
          <Text style={styles.heroStatValue}>∞</Text>
          <Text style={styles.heroStatHint}>incele</Text>
        </View>
      </View>

      <View style={styles.heroActions}>
        <TouchableOpacity activeOpacity={0.9} onPress={onQuickQuiz} style={styles.heroActionPrimary}>
          <LinearGradient
            colors={['#f43f5e', '#ec4899', '#c084fc'] as const}
            style={styles.heroActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.heroActionText}>🎯 Hızlı Quiz</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={onRandomHighlight} style={styles.heroActionGhost}>
          <Text style={styles.heroActionGhostText}>🔀 Keşfet</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

// Difficulty Badge
const DifficultyBadge = ({ difficulty }: { difficulty?: string }) => {
  const config = {
    easy: { color: '#4CAF50', emoji: '🟢', label: 'Kolay' },
    medium: { color: '#FF9800', emoji: '🟡', label: 'Orta' },
    hard: { color: '#F44336', emoji: '🔴', label: 'Zor' },
  };

  const current = config[difficulty as keyof typeof config] || config.medium;

  return (
    <View style={[styles.difficultyBadge, { backgroundColor: current.color + '30' }]}>
      <Text style={styles.difficultyText}>
        {current.emoji} {current.label}
      </Text>
    </View>
  );
};

// Animated Phrasal Verb Card
const PhrasalVerbCard = memo(({ 
  item, 
  index, 
  onPress 
}: { 
  item: PhrasalVerb; 
  index: number; 
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 50),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: opacityAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, pressScale) },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)'] as const}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.verbText}>{item.verb}</Text>
            <DifficultyBadge difficulty={item.difficulty} />
          </View>
          
          <Text style={styles.definitionText} numberOfLines={2}>
            {item.definition}
          </Text>
          
          {!!item.example && (
            <Text style={styles.examplePreview} numberOfLines={1}>
              💬 {item.example}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Filter Tab
const FilterTab = memo(({ 
  label, 
  isActive, 
  onPress,
  emoji,
  index,
}: { 
  label: string; 
  isActive: boolean; 
  onPress: () => void;
  emoji: string;
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100 + index * 40),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isActive 
            ? ['rgba(139,92,246,0.4)', 'rgba(139,92,246,0.2)'] as const
            : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] as const
          }
          style={[
            styles.filterTab,
            isActive && styles.filterTabActive,
          ]}
        >
          <Text style={styles.filterEmoji}>{emoji}</Text>
          <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
            {label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Detail Modal
const DetailModal = ({ 
  verb, 
  visible, 
  onClose,
  onQuiz,
}: { 
  verb: PhrasalVerb | null; 
  visible: boolean; 
  onClose: () => void;
  onQuiz: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!verb) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
        <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
        
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={onClose} 
          activeOpacity={1} 
        />
        
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#2d1f4e', '#1a1a2e'] as const}
            style={styles.modalGradient}
          >
            <DifficultyBadge difficulty={verb.difficulty} />
            
            <Text style={styles.modalVerb}>{verb.verb}</Text>
            
            <View style={styles.modalDivider} />
            
            <Text style={styles.modalLabel}>📖 Tanım</Text>
            <Text style={styles.modalDefinition}>{verb.definition}</Text>
            
            <Text style={styles.modalLabel}>💬 Örnek Cümle</Text>
            <View style={styles.exampleBox}>
              <Text style={styles.modalExample}>"{verb.example}"</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.quizButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onQuiz();
                }}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED'] as const}
                  style={styles.quizButtonGradient}
                >
                  <Text style={styles.quizButtonText}>🎯 Quiz Yap</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <Text style={styles.closeButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Mini Quiz Modal
const MiniQuizModal = ({ 
  verb, 
  visible, 
  onClose 
}: { 
  verb: PhrasalVerb | null; 
  visible: boolean; 
  onClose: () => void;
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      setUserAnswer('');
      setShowResult(false);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const checkAnswer = () => {
    const correct = userAnswer.toLowerCase().trim() === verb?.verb.toLowerCase().trim();
    setIsCorrect(correct);
    setShowResult(true);
    
    Haptics.notificationAsync(
      correct 
        ? Haptics.NotificationFeedbackType.Success 
        : Haptics.NotificationFeedbackType.Error
    );
  };

  if (!verb) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.quizModalOverlay}>
        <BlurView intensity={70} style={StyleSheet.absoluteFill} tint="dark" />
        
        <Animated.View style={[styles.quizModalContent, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#1e1e3f', '#151528'] as const}
            style={styles.quizModalGradient}
          >
            <Text style={styles.quizTitle}>🎯 Phrasal Verb Quiz</Text>
            
            <View style={styles.quizDivider} />
            
            <Text style={styles.quizPrompt}>Bu tanıma uyan phrasal verb nedir?</Text>
            
            <View style={styles.quizDefinitionBox}>
              <Text style={styles.quizDefinitionText}>{verb.definition}</Text>
            </View>
            
            {!showResult ? (
              <>
                <TextInput
                  style={styles.quizInput}
                  placeholder="Cevabını yaz..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={checkAnswer}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669'] as const}
                    style={styles.submitButtonGradient}
                  >
                    <Text style={styles.submitButtonText}>Kontrol Et</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.resultContainer}>
                <Text style={styles.resultEmoji}>
                  {isCorrect ? '🎉' : '😅'}
                </Text>
                <Text style={[
                  styles.resultText,
                  { color: isCorrect ? '#10B981' : '#EF4444' }
                ]}>
                  {isCorrect ? 'Doğru!' : 'Yanlış!'}
                </Text>
                {!isCorrect && (
                  <Text style={styles.correctAnswer}>
                    Doğru cevap: <Text style={styles.answerHighlight}>{verb.verb}</Text>
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.quizCloseButton}
              onPress={onClose}
            >
              <Text style={styles.quizCloseText}>
                {showResult ? 'Devam Et' : 'Vazgeç'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============= MAIN COMPONENT =============

// CEFR level to difficulty mapping
const cefrToDifficulty: Record<string, 'easy' | 'medium' | 'hard'> = {
  'A1': 'easy',
  'A2': 'easy', 
  'B1': 'medium',
  'B2': 'medium',
  'C1': 'hard',
};

export default function PhrasalVerbScreen() {
  const route = useRoute<RouteProp<PhrasalVerbScreenParams, 'PhrasalVerbs'>>();
  const filterLevel = route.params?.filterLevel;
  
  const [phrasalVerbs, setPhrasalVerbs] = useState<PhrasalVerb[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>(() => {
    // If filterLevel is provided, set initial filter based on CEFR level
    if (filterLevel && cefrToDifficulty[filterLevel]) {
      return cefrToDifficulty[filterLevel];
    }
    return 'all';
  });
  const [selectedVerb, setSelectedVerb] = useState<PhrasalVerb | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    loadPhrasalVerbs();
  }, []);

  const loadPhrasalVerbs = async () => {
    try {
      // 🎯 PHARASAL_VERBS_EXAMPLE.json kullan - example_tr içeriyor!
      const data = require('../../assets/data/PHARASAL_VERBS_EXAMPLE.json');
      
      // Assign difficulties based on index for variety
      const verbs = data.map((item: any, index: number) => ({
        id: item.id || index.toString(),
        verb: item.verb,
        definition: item.meaning || item.definition,
        example: item.example,
        example_tr: item.example_tr, // 🎯 Türkçe örnek cümle
        difficulty: item.difficulty || (index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard'),
      }));
      
      setPhrasalVerbs(verbs);
    } catch (error) {
      // Silently fail
    }
  };

  const filteredVerbs = phrasalVerbs.filter(v => {
    const matchesSearch = v.verb.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.definition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || v.difficulty === filter;
    return matchesSearch && matchesFilter;
  });

  const handleVerbPress = useCallback((verb: PhrasalVerb) => {
    setSelectedVerb(verb);
    setShowDetail(true);
  }, []);

  const handleQuiz = useCallback(() => {
    setShowDetail(false);
    setTimeout(() => setShowQuiz(true), 200);
  }, []);

  const handleQuickQuiz = useCallback(() => {
    if (!filteredVerbs.length) return;
    const randomVerb = filteredVerbs[Math.floor(Math.random() * filteredVerbs.length)];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVerb(randomVerb);
    setShowDetail(false);
    setShowQuiz(true);
  }, [filteredVerbs]);

  const handleRandomHighlight = useCallback(() => {
    if (!filteredVerbs.length) return;
    const randomVerb = filteredVerbs[Math.floor(Math.random() * filteredVerbs.length)];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVerb(randomVerb);
    setShowDetail(true);
  }, [filteredVerbs]);

  const renderItem = useCallback(({ item, index }: { item: PhrasalVerb; index: number }) => (
    <PhrasalVerbCard
      item={item}
      index={index % 10}
      onPress={() => handleVerbPress(item)}
    />
  ), [handleVerbPress]);

  const keyExtractor = useCallback((item: PhrasalVerb) => item.id, []);

  const filters = [
    { key: 'all', label: 'Tümü', emoji: '📚' },
    { key: 'easy', label: 'Kolay', emoji: '🟢' },
    { key: 'medium', label: 'Orta', emoji: '🟡' },
    { key: 'hard', label: 'Zor', emoji: '🔴' },
  ] as const;

  const listHeader = useMemo(() => (
    <>
      <HeroSection
        total={phrasalVerbs.length}
        filtered={filteredVerbs.length}
        onQuickQuiz={handleQuickQuiz}
        onRandomHighlight={handleRandomHighlight}
      />
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          📊 {filteredVerbs.length} / {phrasalVerbs.length} phrasal verb
        </Text>
      </View>
      <View style={styles.filtersContainer}>
        {filters.map((f, i) => (
          <FilterTab
            key={f.key}
            label={f.label}
            emoji={f.emoji}
            isActive={filter === f.key}
            onPress={() => setFilter(f.key)}
            index={i}
          />
        ))}
      </View>
    </>
  ), [filter, filteredVerbs.length, phrasalVerbs.length, handleQuickQuiz, handleRandomHighlight, setFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Dark Background - HomeScreen Style */}
      <LinearGradient
        colors={['#13131A', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Subtle green accent glow */}
      <LinearGradient
        colors={['rgba(34, 197, 94, 0.05)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: '25%' }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <AnimatedHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Verb List */}
      <FlatList
        data={filteredVerbs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListHeaderComponent={listHeader}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <DetailModal
        verb={selectedVerb}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        onQuiz={handleQuiz}
      />

      {/* Quiz Modal */}
      <MiniQuizModal
        verb={selectedVerb}
        visible={showQuiz}
        onClose={() => setShowQuiz(false)}
      />
    </SafeAreaView>
  );
}

// ============= STYLES =============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  searchIcon: {
    fontSize: 18,
  },
  statsBar: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  filterTabActive: {
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listHeader: {
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    fontSize: 14,
  },
  heroBadge: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f5f3ff',
  },
  heroBadgeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroStatBox: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 4,
  },
  heroStatHint: {
    fontSize: 12,
    color: 'rgba(248,250,252,0.6)',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroActionPrimary: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroActionGradient: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  heroActionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  heroActionGhost: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroActionGhostText: {
    color: '#e0e7ff',
    fontWeight: '700',
  },
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verbText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  definitionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: 8,
  },
  examplePreview: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  // Detail Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalVerb: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginVertical: 20,
  },
  modalLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  modalDefinition: {
    fontSize: 17,
    color: '#fff',
    lineHeight: 26,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  exampleBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  modalExample: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  quizButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  quizButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  quizButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  // Quiz Modal
  quizModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quizModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
  },
  quizModalGradient: {
    padding: 24,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  quizDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  quizPrompt: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  quizDefinitionBox: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  quizDefinitionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  quizInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 24,
    fontWeight: '800',
  },
  correctAnswer: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  answerHighlight: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  quizCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  quizCloseText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
});
