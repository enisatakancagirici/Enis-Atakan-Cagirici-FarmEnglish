import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  PanResponder,
  Animated as RNAnimated,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Heart, Search, X, Package, Sparkles, Star, Crown, Diamond, Zap, TrendingUp } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { TransferToast } from '../components/TransferToast';
import { NonFullScreenTip } from '../components/TutorialManagerFixed';
import { CuteCloudTip } from '../components/CuteCloudTip';
import { useFarmStore, type TransferEvent } from '../store/farmStore';
import { WordModel } from '../models/types';
import { haptic, sound } from '../utils/sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🖼️ Envanter Tab Resimleri
const TAB_IMAGES = {
  words: require('../../assets/images/maskot/sekme_kelimeler_envanter.webp'),
  phrasal: require('../../assets/images/maskot/sekme_phrasal_envanter.webp'),
  puzzle: require('../../assets/images/maskot/sekme_yapboz_envanter.webp'),
};

//  RESPONSIVE SYSTEM - Tüm iPhone modelleri için
const getScreenType = () => {
  if (SCREEN_HEIGHT < 680) return 'tiny';      // iPhone SE, 8, mini
  if (SCREEN_HEIGHT < 750) return 'small';     // iPhone 11/12/13/14 standart
  if (SCREEN_HEIGHT < 850) return 'medium';    // iPhone Pro modelleri
  return 'large';                               // Pro Max, Plus modelleri
};

const SCREEN_TYPE = getScreenType();
const IS_TABLET = SCREEN_WIDTH > 768;

// Responsive değerler
const RS = {
  // Header
  headerPaddingTop: { tiny: 50, small: 55, medium: 60, large: 65 }[SCREEN_TYPE],
  headerPaddingH: { tiny: 12, small: 14, medium: 16, large: 18 }[SCREEN_TYPE],
  headerPaddingB: { tiny: 8, small: 10, medium: 12, large: 14 }[SCREEN_TYPE],
  headerIconSize: { tiny: 36, small: 40, medium: 44, large: 48 }[SCREEN_TYPE],
  headerTitleFont: { tiny: 18, small: 20, medium: 24, large: 26 }[SCREEN_TYPE],
  headerSubFont: { tiny: 11, small: 12, medium: 13, large: 14 }[SCREEN_TYPE],
  
  // Grid cards
  gridCardPadding: { tiny: 10, small: 12, medium: 14, large: 16 }[SCREEN_TYPE],
  gridCardMinHeight: { tiny: 100, small: 115, medium: 130, large: 145 }[SCREEN_TYPE],
  gridCardRadius: { tiny: 12, small: 14, medium: 16, large: 18 }[SCREEN_TYPE],
  gridEmojiSize: { tiny: 18, small: 20, medium: 24, large: 26 }[SCREEN_TYPE],
  gridWordFont: { tiny: 13, small: 14, medium: 16, large: 17 }[SCREEN_TYPE],
  gridMeaningFont: { tiny: 10, small: 11, medium: 12, large: 13 }[SCREEN_TYPE],
  gridStatFont: { tiny: 10, small: 11, medium: 12, large: 12 }[SCREEN_TYPE],
  gridMargin: { tiny: 4, small: 5, medium: 6, large: 7 }[SCREEN_TYPE],
  
  // Feed card
  feedHeight: { tiny: 0.72, small: 0.73, medium: 0.75, large: 0.78 }[SCREEN_TYPE],
  feedPadding: { tiny: 14, small: 16, medium: 20, large: 24 }[SCREEN_TYPE],
  feedWordFont: { tiny: 24, small: 26, medium: 32, large: 36 }[SCREEN_TYPE],
  feedMeaningFont: { tiny: 14, small: 15, medium: 18, large: 20 }[SCREEN_TYPE],
  feedExampleFont: { tiny: 12, small: 13, medium: 14, large: 15 }[SCREEN_TYPE],
  feedStatFont: { tiny: 14, small: 15, medium: 18, large: 20 }[SCREEN_TYPE],
  feedButtonPadding: { tiny: 12, small: 14, medium: 16, large: 18 }[SCREEN_TYPE],
  feedButtonFont: { tiny: 14, small: 15, medium: 18, large: 20 }[SCREEN_TYPE],
  
  // Stats pills
  statPillPaddingH: { tiny: 8, small: 10, medium: 12, large: 14 }[SCREEN_TYPE],
  statPillPaddingV: { tiny: 5, small: 6, medium: 8, large: 9 }[SCREEN_TYPE],
  statPillFont: { tiny: 12, small: 13, medium: 14, large: 15 }[SCREEN_TYPE],
  statPillIconSize: { tiny: 12, small: 13, medium: 14, large: 15 }[SCREEN_TYPE],
  
  // Filter
  filterPaddingH: { tiny: 10, small: 12, medium: 16, large: 18 }[SCREEN_TYPE],
  filterPaddingV: { tiny: 6, small: 8, medium: 10, large: 11 }[SCREEN_TYPE],
  filterFont: { tiny: 11, small: 12, medium: 13, large: 14 }[SCREEN_TYPE],
  
  // Action pill
  actionPillPaddingH: { tiny: 10, small: 12, medium: 14, large: 16 }[SCREEN_TYPE],
  actionPillPaddingV: { tiny: 7, small: 8, medium: 10, large: 11 }[SCREEN_TYPE],
  actionPillFont: { tiny: 11, small: 12, medium: 13, large: 14 }[SCREEN_TYPE],
};

const IS_SMALL_SCREEN = SCREEN_TYPE === 'tiny' || SCREEN_TYPE === 'small';
type FilterType = 'all' | 'master' | 'ultra' | 'perfect';

// 🏷️ Master level'a göre kategori belirleme
const getMasterCategory = (masterLevel: number): 'master' | 'ultra' | 'perfect' => {
  if (masterLevel >= 3) return 'perfect';
  if (masterLevel >= 2) return 'ultra';
  return 'master';
};

// 🎨 Envanter teması - Mor/Pembe premium
const INVENTORY_THEME = {
  gradient: ['#1a1a2e', '#16213e', '#0f0f23'] as const,
  accent: '#a855f7',
  border: 'rgba(168, 85, 247, 0.4)',
  glow: '#a855f7',
  textMain: '#fff',
  textSecondary: 'rgba(255,255,255,0.7)',
  emoji: '📦',
};

// 🍎 Apple-smooth Action Pill (FarmScreen tarzında)
const ActionPill = ({
  label,
  onPress,
  icon,
  active,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  active?: boolean;
}) => {
  const scale = useRef(new RNAnimated.Value(1)).current;

  return (
    <RNAnimated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => {
          haptic.light();
          RNAnimated.spring(scale, { toValue: 0.94, useNativeDriver: true, friction: 10, tension: 260 }).start();
        }}
        onPressOut={() => {
          RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 220 }).start();
        }}
        onPress={() => {
          haptic.selection();
          onPress();
        }}
        style={[
          styles.actionPill, 
          active && styles.actionPillActive,
          { paddingHorizontal: RS.actionPillPaddingH, paddingVertical: RS.actionPillPaddingV }
        ]}
      >
        <View style={styles.actionPillIcon}>{icon}</View>
        <Text style={[styles.actionPillText, active && styles.actionPillTextActive, { fontSize: RS.actionPillFont }]}>{label}</Text>
      </TouchableOpacity>
    </RNAnimated.View>
  );
};

// 🎴 Inventory Feed Card - Sola kaydırarak tarlaya gönder
const InventoryFeedCard: React.FC<{
  word: WordModel;
  onPlantToFarm: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}> = ({ word, onPlantToFarm, onToggleFavorite }) => {
  const hasTriggeredRef = useRef(false);

  // 👈 SOLA KAYDIR = Tarlaya gönder
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => {
      // Sola kaydırma - yatay bias
      return gesture.dx < -20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 3;
    },
    onPanResponderGrant: () => {
      hasTriggeredRef.current = false;
      haptic.light();
    },
    onPanResponderMove: (_, gesture) => {
      // Sola 50px kaydırınca tetikle
      if (gesture.dx < -50 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        haptic.heavy();
        onPlantToFarm(word.id);
      }
    },
    onPanResponderRelease: () => { hasTriggeredRef.current = false; },
    onPanResponderTerminate: () => { hasTriggeredRef.current = false; },
  }), [onPlantToFarm, word.id]);

  const masterLevel = word.masterLevel || 0;
  const categoryLabel = masterLevel >= 3 ? 'Kraliyet' : masterLevel >= 2 ? 'Elmas' : 'Usta';

  return (
    <View style={[styles.feedItem, { height: SCREEN_HEIGHT * RS.feedHeight }]}>
      <View
        style={[styles.feedCard, { padding: RS.feedPadding }]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={INVENTORY_THEME.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ❤️ Favorite - üst sol */}
        <TouchableOpacity
          style={styles.feedFavorite}
          onPress={() => { haptic.medium(); onToggleFavorite(word.id); }}
          activeOpacity={0.7}
        >
          <Heart
            size={24}
            color={word.isFavorite ? '#ff375f' : 'rgba(255,255,255,0.5)'}
            fill={word.isFavorite ? '#ff375f' : 'transparent'}
          />
        </TouchableOpacity>

        {/* 🏷️ Badge - üst sağ */}
        <View style={styles.feedBadge}>
          <Text style={styles.feedBadgeEmoji}>📦</Text>
          <Text style={styles.feedBadgeText}>{categoryLabel}</Text>
        </View>

        {/* 📝 Kelime */}
        <Text style={[styles.feedWord, { fontSize: RS.feedWordFont, marginTop: SCREEN_TYPE === 'tiny' ? 45 : 60 }]}>{word.text}</Text>

        {/* 📖 Anlam */}
        <Text style={[styles.feedMeaning, { fontSize: RS.feedMeaningFont }]}>{word.meaning}</Text>

        {/* 📖 Örnek cümle */}
        {!!word.example && (
          <Text style={[styles.feedExample, { fontSize: RS.feedExampleFont }]}>
            "{word.example}"
          </Text>
        )}

        {/* 🔢 Mini stats - Quiz istatistikleri */}
        <View style={[styles.feedStats, { paddingVertical: SCREEN_TYPE === 'tiny' ? 8 : 12 }]}>
          <View style={styles.feedStat}>
            <Text style={[styles.feedStatNum, { color: '#22c55e', fontSize: RS.feedStatFont }]}>✓{word.quizCorrect || 0}</Text>
            <Text style={styles.feedStatLabel}>doğru</Text>
          </View>
          <View style={styles.feedStatDivider} />
          <View style={styles.feedStat}>
            <Text style={[styles.feedStatNum, { color: '#ef4444', fontSize: RS.feedStatFont }]}>✗{word.quizWrong || 0}</Text>
            <Text style={styles.feedStatLabel}>yanlış</Text>
          </View>
          <View style={styles.feedStatDivider} />
          <View style={styles.feedStat}>
            <Text style={[styles.feedStatNum, { fontSize: RS.feedStatFont }]}>%{
              ((word.quizCorrect || 0) + (word.quizWrong || 0)) > 0
                ? Math.round(((word.quizCorrect || 0) / ((word.quizCorrect || 0) + (word.quizWrong || 0))) * 100)
                : 0
            }</Text>
            <Text style={styles.feedStatLabel}>başarı</Text>
          </View>
        </View>

        {/* 🎯 Buton - Tarlaya Gönder */}
        <TouchableOpacity
          style={[styles.feedButton, { paddingVertical: RS.feedButtonPadding }]}
          activeOpacity={0.8}
          onPress={() => {
            haptic.medium();
            onPlantToFarm(word.id);
          }}
        >
          <Text style={[styles.feedButtonText, { fontSize: RS.feedButtonFont }]}>Tarlaya Gönder</Text>
          <Text style={styles.feedButtonHint}>veya ← kaydır</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

//  Ana Ekran
export default function InventoryScreen() {
  const { inventory, plantFromInventory, toggleFavorite, phrasalVerbInventory } = useFarmStore();
  const transferEvent = useFarmStore(state => state.transferEvent);
  const consumeTransferEvent = useFarmStore(state => state.consumeTransferEvent);
  const cloudTipsDismissed = useFarmStore(state => state.cloudTipsDismissed);
  const setCloudTipDismissed = useFarmStore(state => state.setCloudTipDismissed);
  const navigation = useNavigation<any>();
  const windowDims = useWindowDimensions();
  
  // 📱 RESPONSIVE LAYOUT - Dinamik sütun sayısı ve kart genişliği
  const numColumns = useMemo(() => {
    const screenWidth = windowDims.width;
    if (screenWidth > 900) return 4;
    if (screenWidth > 700) return 3;
    if (screenWidth > 500) return 3;
    return 2;
  }, [windowDims.width]);
  
  const cardWidth = useMemo(() => {
    const screenWidth = windowDims.width;
    const horizontalPadding = 8;
    return (screenWidth - horizontalPadding) / numColumns;
  }, [windowDims.width, numColumns]);
  
  // 🎓 TUTORIAL STATE
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);

  // States
  const [activeTab, setActiveTab] = useState<'words' | 'phrasal' | 'puzzle'>('words');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [activeToast, setActiveToast] = useState<TransferEvent | null>(null);
  
  // ☁️ CloudTip - Persist state'den al
  const showCloudTip = !cloudTipsDismissed['inventory'];
  
  // 🎓 Tutorial kartı vurgulama - STEP_13'te göster
  const isTutorialCardSelectStep = tutorialStep === 'STEP_13_SELECT_CARD';
  const tutorialHighlightedWordId = isTutorialCardSelectStep ? tutorialFirstWrongWord?.id : null;

  useEffect(() => {
    if (transferEvent?.type === 'plant') {
      setActiveToast(transferEvent);
      haptic.medium();
      sound.playTap();
      consumeTransferEvent();
    }
  }, [transferEvent, consumeTransferEvent]);

  // 🔍 Filtrelenmiş ve aranmış kelimeler
  const filteredWords = useMemo(() => {
    let result = [...inventory];

    // Filter by category
    if (filter !== 'all') {
      result = result.filter(word => {
        const category = getMasterCategory(word.masterLevel || 1);
        return category === filter;
      });
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(word =>
        word.text.toLowerCase().includes(query) ||
        word.meaning.toLowerCase().includes(query)
      );
    }

    return result;
  }, [inventory, filter, searchQuery]);

  // 📊 Stats
  const stats = useMemo(() => {
    const total = inventory.length;
    const master = inventory.filter(w => getMasterCategory(w.masterLevel || 1) === 'master').length;
    const ultra = inventory.filter(w => getMasterCategory(w.masterLevel || 1) === 'ultra').length;
    const perfect = inventory.filter(w => getMasterCategory(w.masterLevel || 1) === 'perfect').length;
    return { total, master, ultra, perfect };
  }, [inventory]);

  // 🌱 Tarlaya gönder
  const handlePlantToFarm = useCallback((wordId: string) => {
    plantFromInventory(wordId);
    
    // 🎓 Tutorial: STEP_14'te "Tarlaya Gönder" basınca STEP_16'ya geç ve otomatik Farm'a git
    // Kaydırma ve buton aynı step'e gitmeli - STEP_16_ULTRA_REACHED (çiftlik açıklaması)
    if (tutorialStep === 'STEP_14_REPLANT') {
      setFeedVisible(false); // Feed'i kapat
      setTimeout(() => {
        setTutorialStep('STEP_16_ULTRA_REACHED');
        navigation.navigate('Farm');
      }, 500);
      return; // Feed logic'i atlayalım
    }
    
    // Feed'deyken bir sonraki karta geç veya feed'i kapat
    if (feedVisible) {
      const currentIndex = filteredWords.findIndex(w => w.id === wordId);
      if (currentIndex >= filteredWords.length - 1) {
        setFeedVisible(false);
      }
    }
  }, [plantFromInventory, feedVisible, filteredWords, tutorialStep, setTutorialStep, navigation]);

  // 📖 Feed aç - karta tıklayınca
  const handleOpenFeed = useCallback((index: number) => {
    setFeedStartIndex(index);
    setFeedVisible(true);
    haptic.medium();
    
    // 🎓 Tutorial: STEP_13'te karta tıklayınca STEP_14'e geç
    if (tutorialStep === 'STEP_13_SELECT_CARD') {
      setTutorialStep('STEP_14_REPLANT');
    }
  }, [tutorialStep, setTutorialStep]);

  // ❌ Feed kapat
  const handleCloseFeed = useCallback(() => {
    setFeedVisible(false);
    haptic.light();
  }, []);

  // 🔘 Filter Button
  const FilterButton: React.FC<{ type: FilterType; count: number; label: string }> = ({ type, count, label }) => {
    const isActive = filter === type;
    return (
      <TouchableOpacity
        style={[
          styles.filterButton, 
          isActive && styles.filterButtonActive,
          { paddingHorizontal: RS.filterPaddingH, paddingVertical: RS.filterPaddingV }
        ]}
        onPress={() => { haptic.light(); setFilter(type); }}
      >
        <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive, { fontSize: RS.filterFont }]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  // 📦 Grid Item - Karta tıklayınca feed aç
  const renderGridItem = ({ item, index }: { item: WordModel; index: number }) => {
    const masterLevel = item.masterLevel || 0;
    const categoryLabel = masterLevel >= 3 ? '👑' : masterLevel >= 2 ? '💎' : '⭐';
    
    // 🎓 TUTORIAL: Vurgulanan kart mı?
    const isHighlighted = isTutorialCardSelectStep && item.id === tutorialHighlightedWordId;

    return (
      <View style={[styles.gridItem, { width: cardWidth }]}>
        <TouchableOpacity
          style={[
            // 🎓 Tutorial vurgulama
            isHighlighted && {
              borderWidth: 3,
              borderColor: '#22c55e',
              borderRadius: RS.gridCardRadius + 4,
              shadowColor: '#22c55e',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 12,
              elevation: 10,
            }
          ]}
          activeOpacity={0.8}
          onPress={() => handleOpenFeed(index)}
        >
        <LinearGradient
          colors={isHighlighted ? ['#166534', '#15803d', '#14532d'] : INVENTORY_THEME.gradient}
          style={[styles.gridCard, { 
            padding: RS.gridCardPadding, 
            minHeight: RS.gridCardMinHeight,
            borderRadius: RS.gridCardRadius 
          }]}
        >
          {/* 🎓 Tutorial badge */}
          {isHighlighted && (
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
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>👆 DOKUN</Text>
            </View>
          )}
          <Text style={[styles.gridEmoji, { fontSize: RS.gridEmojiSize }]}>{categoryLabel}</Text>
          <Text style={[styles.gridWord, { fontSize: RS.gridWordFont }]} numberOfLines={1}>{item.text}</Text>
          <Text style={[styles.gridMeaning, { fontSize: RS.gridMeaningFont }]} numberOfLines={2}>{item.meaning}</Text>
          <View style={styles.gridStats}>
            <Text style={[styles.gridStatText, { fontSize: RS.gridStatFont }]}>✓{item.quizCorrect || 0}</Text>
            <Text style={[styles.gridStatText, { fontSize: RS.gridStatFont }]}>✗{item.quizWrong || 0}</Text>
          </View>
        </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // 📖 Feed Mode
  if (feedVisible) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          style={StyleSheet.absoluteFill}
        />

        {/* Feed Header */}
        <View style={styles.feedHeader}>
          <TouchableOpacity onPress={handleCloseFeed} style={styles.feedCloseButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.feedHeaderTitle}>📦 Envanter Akışı</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Feed List */}
        <FlashList
          data={filteredWords}
          renderItem={({ item }) => (
            <InventoryFeedCard
              word={item}
              onPlantToFarm={handlePlantToFarm}
              onToggleFavorite={toggleFavorite}
            />
          )}
          keyExtractor={item => item.id}
          initialScrollIndex={feedStartIndex}
          drawDistance={SCREEN_HEIGHT * 1.8}
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT * RS.feedHeight}
          decelerationRate="fast"
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        <TransferToast event={activeToast} onHide={() => setActiveToast(null)} />
      </View>
    );
  }

  // 📊 Grid Mode (Default)
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <LinearGradient
        colors={['#050810', '#0a0f1a', '#050810']}
        style={StyleSheet.absoluteFill}
      />

      {/* 🍎 PREMIUM JUICY HEADER - Her zaman görünür */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={[
        styles.juicyHeaderStats,
        { paddingTop: RS.headerPaddingTop, paddingHorizontal: RS.headerPaddingH, paddingBottom: RS.headerPaddingB }
      ]}>
        <LinearGradient
          colors={['rgba(18, 18, 20, 0.95)', 'rgba(28, 28, 30, 0.92)', 'rgba(18, 18, 20, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Top Row - Title & Actions */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleSection}>
            <View style={[styles.headerIconWrap, { width: RS.headerIconSize, height: RS.headerIconSize }]}>
              <Package size={RS.headerIconSize * 0.5} color="#a855f7" strokeWidth={2.5} />
            </View>
            <View>
              <Text style={[styles.headerTitleText, { fontSize: RS.headerTitleFont }]}>Envanter</Text>
              <Text style={[styles.headerSubtitleText, { fontSize: RS.headerSubFont }]}>{stats.total} kelime toplandı</Text>
            </View>
          </View>
          
          {/* Actions */}
          <View style={styles.headerActionsRow}>
            <ActionPill
              label="Ara"
              onPress={() => {
                setSearchVisible(!searchVisible);
                if (searchVisible) setSearchQuery('');
              }}
              icon={searchVisible ? <X size={14} color="#a855f7" strokeWidth={2.8} /> : <Search size={14} color="#fff" strokeWidth={2.8} />}
              active={searchVisible}
            />
          </View>
        </View>

        {/* Stats Pills Row */}
        <View style={styles.statsPillsRow}>
          <View style={[styles.statPill, { backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: RS.statPillPaddingH, paddingVertical: RS.statPillPaddingV }]}>
            <Star size={RS.statPillIconSize} color="#fbbf24" fill="#fbbf24" />
            <Text style={[styles.statPillText, { color: '#fbbf24', fontSize: RS.statPillFont }]}>{stats.master}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: 'rgba(34, 211, 238, 0.15)', paddingHorizontal: RS.statPillPaddingH, paddingVertical: RS.statPillPaddingV }]}>
            <Diamond size={RS.statPillIconSize} color="#22d3ee" />
            <Text style={[styles.statPillText, { color: '#22d3ee', fontSize: RS.statPillFont }]}>{stats.ultra}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: 'rgba(168, 85, 247, 0.15)', paddingHorizontal: RS.statPillPaddingH, paddingVertical: RS.statPillPaddingV }]}>
            <Crown size={RS.statPillIconSize} color="#a855f7" />
            <Text style={[styles.statPillText, { color: '#a855f7', fontSize: RS.statPillFont }]}>{stats.perfect}</Text>
          </View>
        </View>
      </Animated.View>

      {/*  APPLE SEGMENT CONTROL - Premium Tab Bar */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentTrack}>
          {/* 📚 Kelimeler Tab */}
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'words' && styles.segmentTabActive]}
            onPress={() => { setActiveTab('words'); setSearchVisible(false); haptic.selection(); sound.playTap(); }}
            activeOpacity={0.8}
          >
            {activeTab === 'words' && (
              <LinearGradient
                colors={['#a855f7', '#9333ea']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentActiveBackground}
              />
            )}
            <Package size={IS_SMALL_SCREEN ? 18 : 20} color={activeTab === 'words' ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth={2.5} />
            <Text style={[styles.segmentLabel, activeTab === 'words' && styles.segmentLabelActive]}>Kelimeler</Text>
          </TouchableOpacity>

          {/* 🔗 Phrasal Tab */}
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'phrasal' && styles.segmentTabActive]}
            onPress={() => { setActiveTab('phrasal'); setSearchVisible(false); haptic.selection(); sound.playTap(); }}
            activeOpacity={0.8}
          >
            {activeTab === 'phrasal' && (
              <LinearGradient
                colors={['#ec4899', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentActiveBackground}
              />
            )}
            <Zap size={IS_SMALL_SCREEN ? 18 : 20} color={activeTab === 'phrasal' ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth={2.5} />
            <Text style={[styles.segmentLabel, activeTab === 'phrasal' && styles.segmentLabelActive]}>Phrasal</Text>
          </TouchableOpacity>

          {/* 🧩 Yapboz Tab */}
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'puzzle' && styles.segmentTabActive]}
            onPress={() => { setActiveTab('puzzle'); setSearchVisible(false); haptic.selection(); sound.playTap(); }}
            activeOpacity={0.8}
          >
            {activeTab === 'puzzle' && (
              <LinearGradient
                colors={['#f97316', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.segmentActiveBackground}
              />
            )}
            <Sparkles size={IS_SMALL_SCREEN ? 18 : 20} color={activeTab === 'puzzle' ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth={2.5} />
            <Text style={[styles.segmentLabel, activeTab === 'puzzle' && styles.segmentLabelActive]}>Yapboz</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ☁️ CloudTip - TABLARIN ALTINDA */}
      {showCloudTip && (
        <CuteCloudTip
          message={"Hasatlar\u0131n\u0131 burada y\u00F6netirsin. Buradan tekrar tarlaya dikip \u00E7al\u0131\u015Ft\u0131k\u00E7a meyvelerin b\u00FCy\u00FCr. Olgunla\u015F\u0131nca hasat edersin. Hasat ettik\u00E7e de \u00F6\u011Frenirsin."}
          visible={showCloudTip}
          onDismiss={() => setCloudTipDismissed('inventory', true)}
          accentColor="#22c55e"
        />
      )}

      {/* 🔍 Search Bar - Her zaman görünür */}
      {searchVisible && (
        <Animated.View entering={FadeInUp.springify()} style={styles.searchBarContainer}>
          <View style={styles.searchBarInner}>
            <Search size={18} color="#a855f7" />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Kelime ara..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
        >
          <FilterButton type="all" count={stats.total} label="Tümü" />
          <FilterButton type="master" count={stats.master} label="⭐ Usta" />
          <FilterButton type="ultra" count={stats.ultra} label="💎 Elmas" />
          <FilterButton type="perfect" count={stats.perfect} label="👑 Kraliyet" />
        </ScrollView>
      </View>

      {/* Word Grid */}
      {filteredWords.length > 0 ? (
        <FlashList
          data={filteredWords}
          renderItem={renderGridItem}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          key={`inventory-${numColumns}`}
          drawDistance={SCREEN_HEIGHT * 1.1}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={80} color="#4b5563" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Kelime bulunamadı' : 'Envanter boş'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? 'Farklı bir arama deneyin'
              : 'Tarladan hasat edilen kelimeler burada görünecek'}
          </Text>
        </View>
      )}

      <TransferToast event={activeToast} onHide={() => setActiveToast(null)} />
      
      {/* 🎓 Tutorial STEP_13 Tip - Kart seç */}
      {tutorialStep === 'STEP_13_SELECT_CARD' && !feedVisible && (
        <NonFullScreenTip
          visible={true}
          message="📦 Koleksiyonun burası! ⭐Master → 💎Ultra → 👑Perfect | Vurgulanan karta tıkla!"
          position="bottom"
        />
      )}
      
      {/* 🎓 Tutorial STEP_14 Tip - Tarlaya Gönder butonu */}
      {tutorialStep === 'STEP_14_REPLANT' && feedVisible && (
        <NonFullScreenTip
          visible={true}
          message="🔄 Tekrar ek! 👆 'Tarlaya Gönder'e bas veya 👈 sola kaydır!"
          position="bottom"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050810',
  },

  // 🍎 JUICY HEADER STYLES
  juicyHeaderStats: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitleText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  // Action Pill Styles
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionPillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  actionPillIcon: {
    opacity: 0.9,
  },
  actionPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionPillTextActive: {
    color: '#a855f7',
  },
  // 🍎 APPLE SEGMENT CONTROL STYLES - iOS Native Feel
  segmentContainer: {
    marginHorizontal: IS_SMALL_SCREEN ? 12 : 16,
    marginTop: IS_SMALL_SCREEN ? 6 : 8,
    marginBottom: IS_SMALL_SCREEN ? 6 : 8,
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
  // Search Bar
  searchBarContainer: {
    marginBottom: 12,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  searchBarInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  // Stats Pills
  statsPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  statPillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  // Filter Tabs - Her zaman görünür
  filterTabsContainer: {
    backgroundColor: 'rgba(18, 18, 20, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterTabsContent: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  filterButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
  },
  filterButtonTextActive: {
    color: '#a855f7',
  },
  gridContent: {
    paddingHorizontal: 4,
    paddingBottom: 100,
  },
  gridItem: {
    padding: RS.gridMargin,
  },
  gridCard: {
    borderRadius: 16,
    padding: 14,
    minHeight: 140,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  gridEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  gridWord: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  gridMeaning: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 8,
  },
  gridStats: {
    flexDirection: 'row',
    gap: 12,
  },
  gridStatText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: IS_SMALL_SCREEN ? 20 : 40,
    paddingVertical: IS_SMALL_SCREEN ? 30 : 50,
  },
  emptyText: {
    fontSize: IS_SMALL_SCREEN ? 16 : 20,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: IS_SMALL_SCREEN ? 12 : 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: IS_SMALL_SCREEN ? 12 : 14,
    color: '#4b5563',
    marginTop: IS_SMALL_SCREEN ? 6 : 8,
    textAlign: 'center',
    lineHeight: IS_SMALL_SCREEN ? 18 : 20,
  },
  // Feed Styles
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  feedCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  feedItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
  },
  feedCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  feedFavorite: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  feedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  feedBadgeEmoji: {
    fontSize: 14,
  },
  feedBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  feedWord: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginTop: 60,
    marginBottom: 8,
  },
  feedMeaning: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  feedExample: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
    lineHeight: 20,
  },
  feedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  feedStat: {
    alignItems: 'center',
  },
  feedStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  feedStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  feedStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  feedButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  feedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  feedButtonHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
});
