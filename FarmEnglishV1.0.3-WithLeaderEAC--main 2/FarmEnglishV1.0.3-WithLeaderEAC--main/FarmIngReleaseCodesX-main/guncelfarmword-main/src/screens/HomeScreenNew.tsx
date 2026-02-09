import React, { useMemo, useRef, useCallback, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Pressable, 
  Dimensions, 
  Alert, 
  Animated, 
  Platform, 
  InteractionManager,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Sprout, BookOpen, Target, Package, Coins, Award, TrendingUp, Zap, AlertCircle, Home, RotateCcw, Trophy, Sparkles, User, RefreshCw, Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFarmStore } from '../store/farmStore';
import { usePerformanceStore } from '../store/performanceStore';
import { sound, haptic } from '../utils/sound';
import { DashboardSection } from '../components/DashboardSection';
import { MiniQuizDialog } from '../components/MiniQuizDialog';
import { DailyQuestsPanel } from '../components/DailyQuestsPanel';
import { CardShopPanel } from '../components/CardShopPanel';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 📱 RESPONSIVE SİSTEM - Apple Style
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const IS_MEDIUM_DEVICE = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850;

// Premium spacing values
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Premium Header with Logo + PERFORMANS AYARLARI
const PremiumHeader = ({ coins, level, streak, onProfilePress }: any) => {
  const config = usePerformanceStore(s => s.config);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Subtle shimmer animation - PERFORMANS KONTROLÜ
    if (config.enableShimmer) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }

    // Subtle breathing animation for logo - PERFORMANS KONTROLÜ
    if (config.enablePulseAnimations) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [config.enableShimmer, config.enablePulseAnimations]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View style={styles.premiumHeader}>
      {/* Left: Logo + Title */}
      <Pressable onPress={onProfilePress} style={styles.headerLeftSection}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
          <Image 
            source={require('../../assets/logo.webp')} 
            style={styles.logoImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
        </Animated.View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>FarmEnglish</Text>
          <Text style={styles.headerSubtitle}>Kelime Çiftliğin</Text>
        </View>
      </Pressable>

      {/* Right: Stats Pills */}
      <View style={styles.headerRightSection}>
        {/* Coins */}
        <View style={styles.statPill}>
          {config.enableShimmer && <Animated.View style={[styles.pillShimmer, { transform: [{ translateX: shimmerTranslate }] }]} />}
          <Coins color="#FFD700" size={16} strokeWidth={2.5} />
          <Text style={styles.statPillText}>
            {coins >= 10000 ? `${(coins / 1000).toFixed(0)}k` : coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : coins}
          </Text>
        </View>

        {/* Level */}
        <View style={[styles.statPill, styles.levelPill]}>
          <Award color="#A855F7" size={16} strokeWidth={2.5} />
          <Text style={[styles.statPillText, { color: '#A855F7' }]}>{level}</Text>
        </View>
      </View>
    </View>
  );
};

// Premium Menu Card Component + PERFORMANS AYARLARI
const MenuCard = ({ 
  onPress, 
  imageSource, 
  title, 
  subtitle,
  size = 'medium',
  accentColor = '#FFFFFF',
  delay = 0
}: any) => {
  const config = usePerformanceStore(s => s.config);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(config.enableCardEntryAnimation ? 0 : 1)).current;

  React.useEffect(() => {
    // Kart giriş animasyonu - PERFORMANS KONTROLÜ
    if (config.enableCardEntryAnimation) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, [config.enableCardEntryAnimation]);

  const handlePressIn = () => {
    haptic.light();
    // Buton press animasyonu - PERFORMANS KONTROLÜ
    if (config.enableButtonScale) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 8,
        tension: 300,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (config.enableButtonScale) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 200,
      }).start();
    }
  };

  const cardStyle = size === 'large' ? styles.menuCardLarge : 
                   size === 'small' ? styles.menuCardSmall : 
                   styles.menuCardMedium;

  const imageStyle = size === 'large' ? styles.menuImageLarge :
                    size === 'small' ? styles.menuImageSmall :
                    styles.menuImageMedium;

  return (
    <Animated.View style={[
      { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      size === 'large' ? styles.menuCardWrapperLarge : 
      size === 'small' ? styles.menuCardWrapperSmall : 
      styles.menuCardWrapperMedium
    ]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { backgroundColor: `${accentColor}08` }
        ]}
      >
        {/* Glass Effect Background */}
        <View style={[styles.cardGlassOverlay, { borderColor: `${accentColor}20` }]} />
        
        {/* Glow Effect - PERFORMANS KONTROLÜ */}
        {config.enableGlow && <View style={[styles.cardGlow, { backgroundColor: accentColor, opacity: 0.1 }]} />}

        {/* Content */}
        <View style={styles.cardContent}>
          <Image 
            source={imageSource} 
            style={imageStyle}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
          {title && (
            <Text style={[
              styles.cardTitle, 
              size === 'small' && styles.cardTitleSmall,
              { color: accentColor }
            ]}>
              {title}
            </Text>
          )}
          {subtitle && size !== 'small' && (
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

// Premium Grid Menu
const PremiumGridMenu = ({ 
  onQuizPress, 
  onFarmPress, 
  onInventoryPress, 
  onPuzzlePress, 
  onPhrasalPress, 
  onRandomPress 
}: any) => {
  return (
    <View style={styles.gridContainer}>
      {/* Row 1: QUIZ (large) | ? (small) */}
      <View style={styles.gridRow}>
        <MenuCard
          onPress={onQuizPress}
          imageSource={require('../../assets/images/maskot/quiz.webp')}
          title="QUIZ"
          subtitle="Öğrenmeye başla"
          size="large"
          accentColor="#8B5CF6"
          delay={0}
        />
        <MenuCard
          onPress={onRandomPress}
          imageSource={require('../../assets/images/maskot/soru_isareti.webp')}
          title=""
          size="small"
          accentColor="#FBBF24"
          delay={50}
        />
      </View>

      {/* Row 2: PUZZLE | PHRASAL */}
      <View style={styles.gridRow}>
        <MenuCard
          onPress={onPuzzlePress}
          imageSource={require('../../assets/images/maskot/puzzle.webp')}
          title="PUZZLE"
          subtitle="Yapboz çöz"
          size="medium"
          accentColor="#F97316"
          delay={100}
        />
        <MenuCard
          onPress={onPhrasalPress}
          imageSource={require('../../assets/images/maskot/phrasal.webp')}
          title="PHRASAL"
          subtitle="Verb öğren"
          size="medium"
          accentColor="#EC4899"
          delay={150}
        />
      </View>

      {/* Row 3: ENVANTER (small corner) | FARM (large corner) */}
      <View style={[styles.gridRow, { justifyContent: 'space-between' }]}>
        <MenuCard
          onPress={onInventoryPress}
          imageSource={require('../../assets/images/maskot/envanter.webp')}
          title="ENVANTER"
          size="small"
          accentColor="#60A5FA"
          delay={200}
        />
        <MenuCard
          onPress={onFarmPress}
          imageSource={require('../../assets/images/maskot/farm.webp')}
          title="FARM"
          subtitle="Çiftliğe git"
          size="large"
          accentColor="#22C55E"
          delay={250}
        />
      </View>
    </View>
  );
};

// Premium Bottom Nav Indicator
const BottomNavIndicator = () => {
  return (
    <View style={styles.bottomIndicator}>
      <View style={styles.bottomIndicatorBar} />
    </View>
  );
};

export const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const farm = useFarmStore(state => state.farm);
  const inventory = useFarmStore(state => state.inventory);
  const phrasalVerbFarm = useFarmStore(state => state.phrasalVerbFarm);
  const phrasalVerbInventory = useFarmStore(state => state.phrasalVerbInventory);
  const pool = useFarmStore(state => state.pool);
  const xp = useFarmStore(state => state.xp);
  const level = useFarmStore(state => state.level);
  const coins = useFarmStore(state => state.coins);
  const achievements = useFarmStore(state => state.achievements);
  const bestStreak = useFarmStore(state => state.bestStreak);
  const streak = useFarmStore(state => state.streak);
  const currentCombo = useFarmStore(state => state.currentCombo);
  const dailyGoal = useFarmStore(state => state.dailyGoal);
  const dailyProgress = useFarmStore(state => state.dailyProgress);
  const toggleFavorite = useFarmStore(state => state.toggleFavorite);
  const resetProgress = useFarmStore(state => state.resetProgress);
  const plantFromInventory = useFarmStore(state => state.plantFromInventory);
  const answerMiniQuiz = useFarmStore(state => state.answerMiniQuiz);
  const activeBoosts = useFarmStore(state => state.activeBoosts);
  const totalQuizzes = useFarmStore(state => state.totalQuizzes);
  const tutorialStep = useFarmStore(state => state.tutorialStep);
  
  // 🎯 Günlük Görevler
  const checkAndResetDailyQuests = useFarmStore(state => state.checkAndResetDailyQuests);
  
  // 🔄 Combo reset fonksiyonları - tab değiştiğinde sıfırla
  const resetQuizCombo = useFarmStore(state => state.resetQuizCombo);
  const resetPhrasalCombo = useFarmStore(state => state.resetPhrasalCombo);

  // MiniQuiz State
  const [quizWordId, setQuizWordId] = useState<string | null>(null);
  
  // 🎯 Quest Panel State
  const [questsPanelVisible, setQuestsPanelVisible] = useState(false);

  // 🎨 Card Shop State
  const [cardShopVisible, setCardShopVisible] = useState(false);

  // 🎯 Quest Navigation Handler - Navbar gibi davran (geri tuşu çalışmasın)
  const handleQuestNavigate = useCallback((screen: string, params?: any) => {
    setQuestsPanelVisible(false);
    
    // 🔄 Tab değiştiğinde combo'ları sıfırla
    resetQuizCombo();
    resetPhrasalCombo();
    
    // Modal kapansın sonra navbar gibi reset et
    setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: screen, params }],
        })
      );
    }, 100);
  }, [navigation, resetQuizCombo, resetPhrasalCombo]);

  
  const quizWord = useMemo(() => {
    if (!quizWordId) return null;
    const allWords = [...farm, ...inventory, ...phrasalVerbFarm, ...phrasalVerbInventory];
    return allWords.find(w => w.id === quizWordId) || null;
  }, [quizWordId, farm, inventory, phrasalVerbFarm, phrasalVerbInventory]);

  // Navigation Guard
  const isNavigating = useRef(false);
  const lastNavigationTime = useRef(0);

  useFocusEffect(
    useCallback(() => {
      isNavigating.current = false;
      lastNavigationTime.current = 0;
      
      // 🎯 Günlük görevleri kontrol et ve yenile
      checkAndResetDailyQuests();
      
      return () => {
        isNavigating.current = false;
      };
    }, [checkAndResetDailyQuests])
  );

  const progressPercent = useMemo(() => {
    if (!dailyGoal) return 0;
    return Math.min(100, Math.round((dailyProgress / dailyGoal) * 100));
  }, [dailyGoal, dailyProgress]);

  const unlockedAchievements = useMemo(() => achievements.filter(a => a.unlocked).length, [achievements]);

  // Word categories
  const learningWords = useMemo(() => {
    return [...farm, ...phrasalVerbFarm]
      .filter(w => (w.masterLevel || 0) === 0 && (w.wrongCount || 0) < 3)
      .sort((a, b) => (a.wrongCount || 0) - (b.wrongCount || 0))
      .slice(0, 10);
  }, [farm, phrasalVerbFarm]);

  const harvestWords = useMemo(() => {
    return [...farm, ...phrasalVerbFarm]
      .filter(w => (w.masterLevel || 0) === 0 && (w.wrongCount || 0) >= 2)
      .slice(0, 10);
  }, [farm, phrasalVerbFarm]);

  const masterWords = useMemo(() => {
    return [...farm, ...phrasalVerbFarm]
      .filter(w => (w.masterLevel || 0) > 0)
      .slice(0, 10);
  }, [farm, phrasalVerbFarm]);

  const favoriteWords = useMemo(() => {
    return [...farm, ...inventory, ...phrasalVerbFarm, ...phrasalVerbInventory]
      .filter(w => w.isFavorite === true)
      .slice(0, 10);
  }, [farm, inventory, phrasalVerbFarm, phrasalVerbInventory]);

  const handleNav = (route: string) => {
    const now = Date.now();
    if (isNavigating.current || now - lastNavigationTime.current < 500) {
      return;
    }
    
    isNavigating.current = true;
    lastNavigationTime.current = now;
    
    haptic.medium();
    
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate(route);
    });
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  const handleStudyWord = useCallback((word: any) => {
    const now = Date.now();
    if (now - lastNavigationTime.current < 300) {
      return;
    }
    lastNavigationTime.current = now;
    
    haptic.medium();
    
    const isInInventory = inventory.some(w => w.id === word.id) || 
                          phrasalVerbInventory.some(w => w.id === word.id);
    if (isInInventory) {
      plantFromInventory(word.id);
    }
    
    setQuizWordId(word.id);
  }, [inventory, phrasalVerbInventory, plantFromInventory]);

  const handleQuizAnswer = useCallback((correct: boolean, count?: number, wordId?: string) => {
    // 🎯 MiniQuizDialog'dan gelen wordId'yi öncelikli kullan (closure sorunu önlenir)
    const targetWordId = wordId || quizWordId;
    if (targetWordId) {
      answerMiniQuiz(targetWordId, correct, count || 1);
    }
    setQuizWordId(null);
  }, [quizWordId, answerMiniQuiz]);

  const handleToggleFavorite = useCallback((wordId: string) => {
    // 🔒 Tutorial sırasında favori butonu kilitli
    if (tutorialStep !== 'COMPLETED') {
      haptic.error();
      return;
    }
    haptic.light();
    toggleFavorite(wordId);
  }, [toggleFavorite, tutorialStep]);

  const scrollPaddingBottom = 140;

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0A0A0F', '#0F0F1A', '#0A0A0F']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
          {/* Premium Header */}
          <PremiumHeader 
            coins={coins} 
            level={level} 
            streak={currentCombo} 
            onProfilePress={() => handleNav('Profile')} 
          />
          
          {/* 🎯 Günlük Görevler Butonu */}
          <TouchableOpacity
            style={styles.questsButton}
            onPress={() => {
              haptic.light();
              setQuestsPanelVisible(true);
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.questsGradient}
            >
              <Text style={styles.questsButtonIcon}>🎯</Text>
              <Text style={styles.questsButtonText}>Günlük Görevler</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* 🎨 Kart Mağazası Butonu */}
          <TouchableOpacity
            style={styles.questsButton}
            onPress={() => {
              haptic.light();
              setCardShopVisible(true);
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.questsGradient}
            >
              <Text style={styles.questsButtonIcon}>🎨</Text>
              <Text style={styles.questsButtonText}>Kart Mağazası</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Premium Grid Menu */}
          <PremiumGridMenu
            onQuizPress={() => handleNav('Quiz')}
            onFarmPress={() => handleNav('Farm')}
            onInventoryPress={() => handleNav('Inventory')}
            onPuzzlePress={() => navigation.navigate('Farm' as never, { tab: 'puzzle' } as never)}
            onPhrasalPress={() => handleNav('PhrasalVerbsMenu')}
            onRandomPress={() => {
              const allFarmWords = [...farm, ...phrasalVerbFarm];
              if (allFarmWords.length > 0) {
                const randomWord = allFarmWords[Math.floor(Math.random() * allFarmWords.length)];
                handleStudyWord(randomWord);
              } else {
                handleNav('SeedMarket');
              }
            }}
          />

          {/* Dashboard Sections */}
          <View style={styles.dashboardContainer}>
            <DashboardSection
              title="Öğreniyorum"
              subtitle="Çalışmaya devam!"
              icon="flame"
              iconColor="#f97316"
              data={learningWords}
              type="learning"
              onSeeAll={() => {
                haptic.light();
                navigation.navigate('Farm' as never, { filter: 'study' } as never);
              }}
              onCardPress={handleStudyWord}
            />

            <DashboardSection
              title="Hasat Hazır"
              subtitle="Envantere gönderilebilir"
              icon="wheat"
              iconColor="#22c55e"
              data={harvestWords}
              type="harvest"
              onSeeAll={() => {
                haptic.light();
                navigation.navigate('Farm' as never, { filter: 'ready' } as never);
              }}
              onCardPress={handleStudyWord}
            />

            <DashboardSection
              title="Master Kartlar"
              subtitle="Altın seviye kartlar"
              icon="trophy"
              iconColor="#fbbf24"
              data={masterWords}
              type="master"
              onSeeAll={() => {
                haptic.light();
                navigation.navigate('Farm' as never, { filter: 'master' } as never);
              }}
              onCardPress={handleStudyWord}
            />

            <DashboardSection
              title="Favorilerim"
              subtitle="Özel kelimeler"
              icon="star"
              iconColor="#FFD700"
              data={favoriteWords}
              type="favorite"
              onSeeAll={() => {
                haptic.light();
                navigation.navigate('Farm' as never, { filter: 'favorites' } as never);
              }}
              onCardPress={handleStudyWord}
              onToggleFavorite={handleToggleFavorite}
            />
          </View>

          {/* Tutorial Sıfırla Butonu */}
          <View style={{ marginTop: SPACING.xxl, marginBottom: SPACING.xl }}>
            <TouchableOpacity
              style={styles.tutorialResetButton}
              onPress={() => {
                haptic.medium();
                Alert.alert(
                  '🎓 Tutorial\'ı Baştan Başlat',
                  'Tutorial baştan başlayacak. Devam etmek istiyor musunuz?',
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Başlat',
                      style: 'default',
                      onPress: () => {
                        haptic.heavy();
                        useFarmStore.getState().resetTutorial();
                        Alert.alert('✅ Tutorial Sıfırlandı', 'Tutorial baştan başlayacak.');
                      }
                    },
                  ]
                );
              }}
            >
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.2)']}
                style={styles.tutorialResetGradient}
              >
                <Sparkles color="#3B82F6" size={20} />
                <Text style={styles.tutorialResetText}>Tutorial'ı Baştan Başlat</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Tutorial Debug Butonu */}
            <TouchableOpacity
              style={[styles.tutorialResetButton, { marginTop: SPACING.md }]}
              onPress={() => {
                haptic.light();
                const step = useFarmStore.getState().tutorialStep;
                Alert.alert(
                  '🐛 Tutorial Debug',
                  `Mevcut Tutorial Adımı: ${step}\n\nTutorial Durumunu Görmek için OK'a tıklayın.`,
                  [{ text: 'OK', style: 'default' }]
                );
              }}
            >
              <LinearGradient
                colors={['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.2)']}
                style={styles.tutorialResetGradient}
              >
                <Settings color="#A855F7" size={20} />
                <Text style={[styles.tutorialResetText, { color: '#A855F7' }]}>Tutorial Debug</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>


        </ScrollView>
      </SafeAreaView>


      {/* MiniQuiz Dialog */}
      {quizWord && (
        <MiniQuizDialog
          key={quizWord.id}
          word={quizWord}
          allWords={pool && pool.length > 0 ? pool : [...farm, ...phrasalVerbFarm]}
          onAnswer={handleQuizAnswer}
          onClose={() => setQuizWordId(null)}
        />
      )}
      
      {/* 🎯 Günlük Görevler Modal */}
      <Modal
        visible={questsPanelVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuestsPanelVisible(false)}
      >
        <View style={styles.questsModalContainer}>
          <TouchableOpacity
            style={styles.questsModalOverlay}
            activeOpacity={1}
            onPress={() => {
              haptic.light();
              setQuestsPanelVisible(false);
            }}
          />
          <View style={styles.questsModalContent}>
            <DailyQuestsPanel 
              onClose={() => setQuestsPanelVisible(false)} 
              onNavigate={handleQuestNavigate}
            />
            <TouchableOpacity
              style={styles.questsCloseButton}
              onPress={() => {
                haptic.light();
                setQuestsPanelVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.questsCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🎨 Kart Mağazası Modal */}
      <Modal
        visible={cardShopVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCardShopVisible(false)}
      >
        <View style={styles.questsModalContainer}>
          <TouchableOpacity
            style={styles.questsModalOverlay}
            activeOpacity={1}
            onPress={() => {
              haptic.light();
              setCardShopVisible(false);
            }}
          />
          <View style={styles.questsModalContent}>
            <CardShopPanel onClose={() => setCardShopVisible(false)} />
            <TouchableOpacity
              style={styles.questsCloseButton}
              onPress={() => {
                haptic.light();
                setCardShopVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.questsCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? SPACING.md : SPACING.xl,
  },

  // Premium Header Styles
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingVertical: SPACING.sm,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  headerTitleContainer: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  headerRightSection: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    overflow: 'hidden',
    gap: 6,
  },
  levelPill: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  pillShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
  statPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },

  // Grid Container
  gridContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  gridRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },

  // Menu Card Wrappers
  menuCardWrapperLarge: {
    flex: 2,
  },
  menuCardWrapperSmall: {
    flex: 1,
  },
  menuCardWrapperMedium: {
    flex: 1,
  },

  // Menu Cards
  menuCardLarge: {
    borderRadius: 28,
    padding: SPACING.lg,
    minHeight: IS_SMALL_DEVICE ? 140 : 160,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  menuCardSmall: {
    borderRadius: 24,
    padding: SPACING.md,
    minHeight: IS_SMALL_DEVICE ? 140 : 160,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  menuCardMedium: {
    borderRadius: 20,
    padding: SPACING.sm,
    minHeight: IS_SMALL_DEVICE ? 100 : 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },

  // Card Glass Overlay
  cardGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    opacity: 0.5,
  },

  // Card Glow Effect
  cardGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 100,
  },

  // Card Content
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  // Menu Images
  menuImageLarge: {
    width: IS_SMALL_DEVICE ? 70 : 85,
    height: IS_SMALL_DEVICE ? 70 : 85,
    marginBottom: SPACING.sm,
  },
  menuImageSmall: {
    width: IS_SMALL_DEVICE ? 55 : 65,
    height: IS_SMALL_DEVICE ? 55 : 65,
    marginBottom: SPACING.xs,
  },
  menuImageMedium: {
    width: IS_SMALL_DEVICE ? 45 : 52,
    height: IS_SMALL_DEVICE ? 45 : 52,
    marginBottom: SPACING.xs,
  },

  // Card Text
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  cardTitleSmall: {
    fontSize: 13,
    letterSpacing: 1,
    maxWidth: 85,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    textAlign: 'center',
  },

  // Dashboard Container
  dashboardContainer: {
    gap: SPACING.lg,
  },

  // Bottom Indicator
  bottomIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomIndicatorBar: {
    width: 134,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },

  // Debug Section
  debugSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  debugMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    gap: 8,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 6,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    borderBottomWidth: 0,
  },
  modalGradient: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  
  // 🎯 Günlük Görevler Buton
  questsButton: {
    marginBottom: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  questsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  questsButtonIcon: {
    fontSize: 24,
  },
  questsButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  
  // 🎯 Günlük Görevler Modal
  questsModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  questsModalOverlay: {
    flex: 1,
  },
  questsModalContent: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34, // Safe area için
    maxHeight: '90%',
  },
  questsCloseButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    alignItems: 'center',
  },
  questsCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  debugMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  debugMenuButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  debugMenuButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  tutorialResetButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tutorialResetGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  tutorialResetText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
});

export default HomeScreen;
