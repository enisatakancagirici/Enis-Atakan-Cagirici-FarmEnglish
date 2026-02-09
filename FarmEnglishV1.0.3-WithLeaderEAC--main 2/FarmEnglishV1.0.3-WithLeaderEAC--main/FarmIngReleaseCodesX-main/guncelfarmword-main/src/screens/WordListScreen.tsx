import React, { useMemo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Heart, Search, X, ArrowLeft, Sparkles } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import JuicyModal from '../components/JuicyModal';
import type { WordModel } from '../models/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type RouteParams = {
  WordListScreen: {
    type: 'wrong' | 'favorite' | 'all' | 'farm';
    title: string;
    initialQuery?: string;
  };
};

// 🎨 TEMA SİSTEMİ - FarmScreen ile senkronize
const CARD_THEMES = {
  red: {
    gradient: ['rgba(127, 29, 29, 0.95)', 'rgba(153, 27, 27, 0.9)', 'rgba(127, 29, 29, 0.95)'] as const,
    border: 'rgba(239, 68, 68, 0.8)',
    glow: '#ef4444',
    accent: '#ef4444',
    emoji: '🔴',
    label: 'Kırmızı',
  },
  orange: {
    gradient: ['rgba(124, 45, 18, 0.95)', 'rgba(154, 52, 18, 0.9)', 'rgba(124, 45, 18, 0.95)'] as const,
    border: 'rgba(249, 115, 22, 0.8)',
    glow: '#f97316',
    accent: '#f97316',
    emoji: '🟠',
    label: 'Turuncu',
  },
  yellow: {
    gradient: ['rgba(113, 63, 18, 0.95)', 'rgba(133, 77, 14, 0.9)', 'rgba(113, 63, 18, 0.95)'] as const,
    border: 'rgba(234, 179, 8, 0.8)',
    glow: '#eab308',
    accent: '#eab308',
    emoji: '🟡',
    label: 'Sarı',
  },
  green: {
    gradient: ['rgba(20, 83, 45, 0.95)', 'rgba(6, 95, 70, 0.9)', 'rgba(20, 83, 45, 0.95)'] as const,
    border: 'rgba(34, 197, 94, 0.8)',
    glow: '#22c55e',
    accent: '#22c55e',
    emoji: '🟢',
    label: 'Yeşil',
  },
  master: {
    gradient: ['rgba(161, 98, 7, 0.95)', 'rgba(202, 138, 4, 0.9)', 'rgba(161, 98, 7, 0.95)'] as const,
    border: 'rgba(250, 204, 21, 0.9)',
    glow: '#ffd700',
    accent: '#facc15',
    emoji: '🏆',
    label: 'Usta',
  },
  ultra: {
    gradient: ['rgba(8, 145, 178, 0.95)', 'rgba(6, 182, 212, 0.9)', 'rgba(59, 130, 246, 0.95)'] as const,
    border: 'rgba(34, 211, 238, 0.9)',
    glow: '#22d3ee',
    accent: '#22d3ee',
    emoji: '💎',
    label: 'Elmas',
  },
  perfect: {
    gradient: ['rgba(168, 85, 247, 0.95)', 'rgba(192, 132, 252, 0.9)', 'rgba(139, 92, 246, 0.95)'] as const,
    border: 'rgba(192, 132, 252, 0.95)',
    glow: '#c084fc',
    accent: '#c084fc',
    emoji: '👑',
    label: 'Kraliyet',
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
  return CARD_THEMES.red;
};

// 🎨 Seviye renkleri
const LEVEL_COLORS: Record<string, string> = {
  A1: '#22c55e',
  A2: '#84cc16',
  B1: '#eab308',
  B2: '#f97316',
  C1: '#ef4444',
  C2: '#dc2626',
};

// 🃏 Swipeable Word Card Component
const SwipeableWordCard = React.memo(({
  word,
  onStudy,
  onToggleFavorite,
}: {
  word: WordModel;
  onStudy: (word: WordModel) => void;
  onToggleFavorite: (id: string) => void;
}) => {
  const theme = getWordTheme(word);
  const levelColor = LEVEL_COLORS[word.difficulty] || '#6b7280';
  
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderGrant: () => {
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx * 0.8, 100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        
        if (gestureState.dx > 60) {
          // Sağa kaydırma - Quiz başlat
          haptic.medium();
          sound.playCorrect();
          
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
          
          onStudy(word);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const totalAnswers = (word.quizCorrect || 0) + (word.quizWrong || 0);
  const successRate = totalAnswers > 0 ? Math.round((word.quizCorrect || 0) / totalAnswers * 100) : 0;

  return (
    <View style={styles.cardContainer}>
      {/* Swipe hint background */}
      <View style={[styles.swipeHintBg, { backgroundColor: theme.accent + '30' }]}>
        <Text style={styles.swipeHintText}>📖 Çalış</Text>
      </View>
      
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.cardWrapper,
          {
            transform: [
              { translateX },
              { scale },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: theme.border }]}
        >
          {/* Glass overlay */}
          <View style={styles.glassOverlay} />

          {/* Header Row */}
          <View style={styles.cardHeader}>
            {/* Left: Level badge */}
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelBadgeText}>{word.difficulty}</Text>
            </View>
            
            {/* Center: Status */}
            <View style={[styles.statusBadge, { backgroundColor: theme.accent + '30' }]}>
              <Text style={[styles.statusBadgeText, { color: theme.accent }]}>
                {theme.emoji} {theme.label}
              </Text>
            </View>
            
            {/* Right: Favorite */}
            <TouchableOpacity 
              style={styles.favButton}
              onPress={() => {
                haptic.medium();
                onToggleFavorite(word.id);
              }}
            >
              <Heart
                size={20}
                color={word.isFavorite ? '#ff375f' : 'rgba(255,255,255,0.5)'}
                fill={word.isFavorite ? '#ff375f' : 'transparent'}
              />
            </TouchableOpacity>
          </View>

          {/* Word Content */}
          <Text style={styles.wordText} numberOfLines={1}>{word.text}</Text>
          <Text style={styles.meaningText} numberOfLines={2}>{word.meaning}</Text>

          {/* Example if exists */}
          {!!word.example && (
            <Text style={styles.exampleText} numberOfLines={2}>
              "{word.example}"
            </Text>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>✓{word.quizCorrect || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>✗{word.quizWrong || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>%{successRate}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${successRate}%`, backgroundColor: theme.accent }
                ]} 
              />
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.accent + '40' }]}
              onPress={() => {
                haptic.medium();
                onStudy(word);
              }}
            >
              <Sparkles size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Çalış</Text>
            </TouchableOpacity>
            
            <Text style={styles.swipeHint}>→ Kaydır</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
});

export default function WordListScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'WordListScreen'>>();
  const type = route.params?.type || 'favorite';
  const initialQuery = route.params?.initialQuery;

  const farm = useFarmStore(s => s.farm);
  const inventory = useFarmStore(s => s.inventory);
  const phrasalVerbFarm = useFarmStore(s => s.phrasalVerbFarm);
  const phrasalVerbInventory = useFarmStore(s => s.phrasalVerbInventory);
  const toggleFavorite = useFarmStore(s => s.toggleFavorite);
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const openMiniQuiz = useFarmStore(s => s.openMiniQuiz);

  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [sortBy, setSortBy] = useState<'recent' | 'text'>('recent');
  
  // 🎯 Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    titleEmoji?: string;
    message: string;
    secondaryMessage?: string;
    secondaryEmoji?: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'purchase';
  } | null>(null);

  // Favori kelimeler listesi
  const favoriteWords = useMemo(() => {
    let list: WordModel[] = [];
    
    // Tüm kaynaklardan favorileri topla
    const allWords = [...farm, ...inventory, ...phrasalVerbFarm, ...phrasalVerbInventory];
    list = allWords.filter(w => w.isFavorite === true);

    // 🎯 DEDUPLICATION: Aynı orijinal kelimeyi 2 kere gösterme
    // Farm/Phrasal'daki original + Inventory'deki copy'den sadece biri göster
    const seenOriginals = new Set<string>();
    const deduplicatedList: WordModel[] = [];
    
    for (const word of list) {
      // Orijinal ID: kendisi veya originalWordId
      const originalId = (word as any).originalWordId || word.id;
      
      if (!seenOriginals.has(originalId)) {
        seenOriginals.add(originalId);
        deduplicatedList.push(word);
      }
    }
    
    list = deduplicatedList;

    // Arama
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(w => 
        w.text.toLowerCase().includes(query) ||
        w.meaning.toLowerCase().includes(query)
      );
    }

    // Sıralama
    if (sortBy === 'text') {
      list.sort((a, b) => a.text.localeCompare(b.text));
    }
    // 'recent' için zaten son eklenen sırada

    return list;
  }, [farm, inventory, phrasalVerbFarm, phrasalVerbInventory, searchQuery, sortBy]);

  const handleStudy = useCallback((word: WordModel) => {
    haptic.medium();
    // Farm veya Phrasal farm'da mı kontrol et
    const inFarm = farm.some(w => w.id === word.id);
    const inPhrasalFarm = phrasalVerbFarm.some(w => w.id === word.id);
    
    if (inFarm || inPhrasalFarm) {
      // Mini quiz aç
      openMiniQuiz(word.id);
      (navigation as any).navigate('Farm', { quizWordId: word.id });
    } else {
      // Envanterde - bilgi göster
      setModalConfig({
        title: word.text,
        titleEmoji: '📚',
        message: word.meaning,
        secondaryMessage: `✓ ${word.quizCorrect || 0} doğru  ✗ ${word.quizWrong || 0} yanlış\n\nBu kelime envanterde. Çalışmak için tarlaya ekle.`,
        secondaryEmoji: '📊',
        type: 'info',
      });
      setModalVisible(true);
    }
  }, [farm, phrasalVerbFarm, openMiniQuiz, navigation]);

  const handleToggleFavorite = useCallback((wordId: string) => {
    // 🔒 Tutorial sırasında favori butonu kilitli
    if (tutorialStep !== 'COMPLETED') {
      haptic.error();
      return;
    }
    haptic.medium();
    toggleFavorite(wordId);
  }, [toggleFavorite, tutorialStep]);

  const renderItem = useCallback(({ item }: { item: WordModel }) => {
    return (
      <SwipeableWordCard
        word={item}
        onStudy={handleStudy}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }, [handleStudy, handleToggleFavorite]);

  const keyExtractor = useCallback((item: WordModel) => item.id, []);

  return (
    <LinearGradient
      colors={['#0f0a1f', '#1a0a2e', '#0f0a1f']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              haptic.medium();
              navigation.goBack();
            }}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Heart size={24} color="#ff375f" fill="#ff375f" />
            <Text style={styles.headerTitle}>Favorilerim</Text>
          </View>
          
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{favoriteWords.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Kelime ara..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort buttons */}
        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
            onPress={() => setSortBy('recent')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]}>
              ⭐ Son Eklenen
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'text' && styles.sortButtonActive]}
            onPress={() => setSortBy('text')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'text' && styles.sortButtonTextActive]}>
              🔤 Alfabetik
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlashList
        data={favoriteWords}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Heart size={64} color="#444" />
            <Text style={styles.emptyTitle}>Henüz favori kelimen yok</Text>
            <Text style={styles.emptyText}>
              Tarlada veya envanterde bir kelimeye ❤️ basarak favorilere ekleyebilirsin
            </Text>
          </View>
        }
      />

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
          buttons={[
            {
              text: 'Kapat',
              type: 'primary',
              onPress: () => setModalVisible(false),
            },
          ]}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 55, 95, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 55, 95, 0.5)',
  },
  countText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ff375f',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(255, 55, 95, 0.2)',
    borderColor: 'rgba(255, 55, 95, 0.4)',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  sortButtonTextActive: {
    color: '#ff375f',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 100,
  },
  cardContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  swipeHintBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHintText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  favButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 55, 95, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    paddingVertical: 8,
  },
  statItem: {
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  swipeHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});
