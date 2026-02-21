import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, CommonActions, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform, Animated, PanResponder, Dimensions, AppState, AppStateStatus, Modal, Alert, Easing } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, ShoppingCart, Lock, Puzzle, MoreHorizontal } from 'lucide-react-native';
import { Asset } from 'expo-asset';
import { getAllFruitImages } from './src/utils/fruitSystem';
import { getAllAppImages, CIFTLIK_TAB_YENI_IMAGES, ENVANTER_TAB_YENI_IMAGES } from './src/utils/assetPreloader';

// 🖼️ Custom Splash Screen
const SPLASH_IMAGE = require('./assets/splash_screen.png');
import { HomeScreen } from './src/screens/HomeScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { FarmScreen } from './src/screens/FarmScreen';
import InventoryScreenNew from './src/screens/InventoryScreenNew';
import PhrasalVerbScreen from './src/screens/PhrasalVerbScreen';
import PhrasalVerbsMenuScreen from './src/screens/PhrasalVerbsMenuScreen';
import PhrasalVerbFarmScreenNew from './src/screens/PhrasalVerbFarmScreenNew';
import PhrasalVerbQuizScreen from './src/screens/PhrasalVerbQuizScreen';
import PhrasalVerbListScreen from './src/screens/PhrasalVerbListScreen';
import SeedMarketScreen from './src/screens/SeedMarketScreen';
import WordListScreen from './src/screens/WordListScreen';
import StoreScreen from './src/screens/StoreScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MarketScreen from './src/screens/MarketScreen';
import WordPuzzleScreen from './src/screens/WordPuzzleScreen';
// ⚔ Battle Mode Screens
import AuthScreen from './src/screens/AuthScreen';
import BattleScreen from './src/screens/BattleScreen';
import BattleMenuScreen from './src/screens/BattleMenuScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import SesYapScreen from './src/screens/SesYapScreen';
// 📚 Pratik Merkezi Ekranları
import WordMatchScreen from './src/screens/WordMatchScreen';
import FillBlankScreen from './src/screens/FillBlankScreen';
import CollocationsScreen from './src/screens/CollocationsScreen';
import IdiomsScreen from './src/screens/IdiomsScreen';
import YDSQuizScreen from './src/screens/YDSQuizScreen';
import YDSWordFormsScreen from './src/screens/YDSWordFormsScreen';
import CustomWordCardScreen from './src/screens/CustomWordCardScreen';
import { RewardToastContainer, showRewardToast } from './src/components/RewardToast';
import DailyStreakModal from './src/components/DailyStreakModal';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { useFarmStore } from './src/store/farmStore';
import { usePerformanceStore, initAutoPerformance } from './src/store/performanceStore';
import { loadWordsFromJSON } from './src/utils/loadWords';
import { NEON_BACKGROUND } from './src/utils/theme';
import { haptic, sound } from './src/utils/sound';
import { traceEvent } from './src/utils/debugTrace';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Global navigation ref for tracking current route
const navigationRef = React.createRef<any>();

// 🎯 Alt tab bar navigasyon sırası (soldan sağa) - YENİ: Home, Quiz, Market
const TAB_ORDER = ['Home', 'Quiz', 'Market'] as const;
type TabRoute = typeof TAB_ORDER[number];

// 🔒 Global swipe kilidi - tüm swipe'lar için tek kontrol
let globalSwipeLock = false;
let lastSwipeTime = 0;

// 📱 Instagram/Twitter Style Swipe Navigation
// - Velocity-based detection (hız tabanlı)
// - Edge swipe only (sadece kenarlardan)
// - MiniQuiz/Feed açıkken devre dışı
const SCREEN_WIDTH = Dimensions.get('window').width;

// 🔒 Global blocking state - PanResponder closure sorununu çözmek için
let isSwipeBlocked = false;

const withSwipeNavigation = (WrappedComponent: React.ComponentType<any>, routeName: TabRoute) => {
  return memo((props: any) => {
    const navigation = useNavigation();
    const hasTriggered = useRef(false);
    const gestureStartX = useRef(0);
    const gestureStartTime = useRef(0);
    const currentIndex = TAB_ORDER.indexOf(routeName);

    // 🔒 MiniQuiz, Feed veya Quiz ekranında swipe yapma - store'dan oku
    const { useFarmStore } = require('./src/store/farmStore');
    const miniQuizFor = useFarmStore((s: any) => s.miniQuizFor);
    const feedVisible = useFarmStore((s: any) => s.feedVisible);
    const quizActive = useFarmStore((s: any) => s.quizActive);

    // 🔒 Quiz ekranında HER ZAMAN swipe block!
    const isQuizScreen = routeName === 'Quiz';

    // 🔄 Combo reset fonksiyonları
    const resetQuizCombo = useFarmStore((s: any) => s.resetQuizCombo);
    const resetPhrasalCombo = useFarmStore((s: any) => s.resetPhrasalCombo);

    // Global blocking state güncelle (PanResponder closure için)
    useEffect(() => {
      isSwipeBlocked = !!miniQuizFor || !!feedVisible || !!quizActive || isQuizScreen;
    }, [miniQuizFor, feedVisible, quizActive, isQuizScreen]);

    // 🚀 Anında navigasyon
    const navigateInstant = useCallback((route: TabRoute) => {
      const now = Date.now();
      if (globalSwipeLock || now - lastSwipeTime < 400 || isSwipeBlocked) return;

      globalSwipeLock = true;
      lastSwipeTime = now;
      hasTriggered.current = true;

      haptic.medium();

      // 🔄 Tab değiştiğinde combo'ları sıfırla
      resetQuizCombo();
      resetPhrasalCombo();

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: route }],
        })
      );

      setTimeout(() => {
        globalSwipeLock = false;
      }, 400);
    }, [navigation, resetQuizCombo, resetPhrasalCombo]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,

        onMoveShouldSetPanResponder: (evt, gesture) => {
          // 🔒 MiniQuiz/Feed açıkken veya global kilit varsa NO
          if (globalSwipeLock || isSwipeBlocked) return false;

          const touchX = evt.nativeEvent.pageX;

          // 📱 Instagram style: Sadece ekran kenarlarından (ilk 30px)
          const isLeftEdge = touchX < 30;
          const isRightEdge = touchX > SCREEN_WIDTH - 30;
          if (!isLeftEdge && !isRightEdge) return false;

          // Yatay hareket mi?
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
          const hasMovement = Math.abs(gesture.dx) > 10;

          return isHorizontal && hasMovement;
        },

        onPanResponderGrant: (evt) => {
          gestureStartX.current = evt.nativeEvent.pageX;
          gestureStartTime.current = Date.now();
          hasTriggered.current = false;
        },

        onPanResponderMove: (_, gesture) => {
          if (hasTriggered.current || globalSwipeLock || isSwipeBlocked) return;

          const { dx, dy, vx } = gesture;

          // Dikey scroll önceliği - scroll yapıyorsa iptal
          if (Math.abs(dy) > Math.abs(dx) * 0.7) return;

          const canGoLeft = currentIndex > 0;
          const canGoRight = currentIndex < TAB_ORDER.length - 1;

          // 📱 Velocity-based trigger (Instagram/Twitter style)
          // - Hızlı swipe: 0.5 velocity + 50px yeterli
          // - Yavaş swipe: 100px gerekli
          const absVx = Math.abs(vx);
          const absDx = Math.abs(dx);

          const velocityTrigger = absVx > 0.5 && absDx > 50;
          const distanceTrigger = absDx > 100;

          if ((velocityTrigger || distanceTrigger) && !hasTriggered.current) {
            if (dx > 0 && canGoLeft) {
              navigateInstant(TAB_ORDER[currentIndex - 1]);
            } else if (dx < 0 && canGoRight) {
              navigateInstant(TAB_ORDER[currentIndex + 1]);
            }
          }
        },

        onPanResponderRelease: () => {
          hasTriggered.current = false;
        },

        onPanResponderTerminate: () => {
          hasTriggered.current = false;
        },
      })
    ).current;

    return (
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <WrappedComponent {...props} />
      </View>
    );
  });
};

// 🎯 Swipeable versiyonlar - ANA TAB ekranları
const SwipeableHomeScreen = withSwipeNavigation(HomeScreen, 'Home');
const SwipeableQuizScreen = withSwipeNavigation(QuizScreen, 'Quiz');
const SwipeableMarketScreen = withSwipeNavigation(MarketScreen, 'Market');

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('Home');
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [streakData, setStreakData] = useState({ count: 0, reward: 0 });
  const [pendingStreak, setPendingStreak] = useState<{ count: number; reward: number } | null>(null);
  const loadWords = useFarmStore(s => s.loadWords);
  const fixDuplicates = useFarmStore(s => s.fixDuplicates);
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const setTutorialInterrupted = useFarmStore(s => s.setTutorialInterrupted);
  const config = usePerformanceStore(s => s.config);
  const nickname = useFarmStore(s => s.nickname);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const errorUtils = (global as any)?.ErrorUtils;
    if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) return;

    const defaultHandler = errorUtils.getGlobalHandler();
    const handler = (error: any, isFatal?: boolean) => {
      try {
        traceEvent(
          'global_js_error',
          {
            message: error?.message || String(error),
            stack: error?.stack ? String(error.stack).slice(0, 1000) : undefined,
            isFatal: !!isFatal,
            route: navigationRef.current?.getCurrentRoute?.()?.name,
          },
          'error',
        );
      } catch {}

      if (__DEV__) {
        try { defaultHandler?.(error, !!isFatal); } catch {}
        return;
      }

      // Production: swallow fatal rethrow to avoid hard restart loop
      try {
        showRewardToast('quest', 1, 'Bir hata yakalandi. Devam ediliyor.');
      } catch {}
    };

    try {
      errorUtils.setGlobalHandler(handler);
    } catch {}

    return () => {
      try {
        errorUtils.setGlobalHandler(defaultHandler);
      } catch {}
    };
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        //  Cihaza göre otomatik performans ayarı (ilk açılışta)
        await initAutoPerformance();

        // 🖼️ Önce splash görselini yükle (anında gösterilsin)
        await Asset.loadAsync([SPLASH_IMAGE]);

        // 🖼️ Preload all fruit images with Asset.loadAsync (for local require() images)
        const fruitImages = getAllFruitImages();
        await Asset.loadAsync(fruitImages);

        // 🖼️ Preload ALL app images (homepage, market, filters, mascot, tabs)
        const appImages = getAllAppImages();
        await Asset.loadAsync(appImages);

        // Load all words from JSON (5000+ words!)
        const allWords = loadWordsFromJSON();
        loadWords(allWords);
        fixDuplicates(); // Clean up any mess

        // 🔊 Ses sistemini ısıt - bazı telefonlarda ilk ses gecikmiyor
        await sound.warmup();

        // ⏱️ Minimum 1.5 saniye splash screen göster
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsReady(true);
      } catch (error) {
        setIsReady(true);
      } finally {
        // Hide the splash screen
        await SplashScreen.hideAsync();
      }
    };

    initialize();
  }, []);

  // Handle navigation state changes
  const onStateChange = useCallback(() => {
    const route = navigationRef.current?.getCurrentRoute();
    if (route?.name) {
      setCurrentRoute(route.name);
    }
  }, []);

  // 🔥 DAILY STREAK - App başlangıcında bir kez kontrol et (takvim günü bazlı)
  useEffect(() => {
    if (!isReady) return;

    // Store'dan streak fonksiyonunu al
    const { checkDailyStreak } = useFarmStore.getState();
    const result = checkDailyStreak();

    const currentNickname = useFarmStore.getState().nickname;

    // Yeni gün ve ödül varsa şatafatlı modal göster
    if (result.isNewDay && result.reward > 0 && !result.alreadyChecked) {
      const data = { count: result.currentStreak, reward: result.reward };
      if (currentNickname && currentNickname.trim().length > 0) {
        setTimeout(() => {
          setStreakData(data);
          setStreakModalVisible(true);
        }, 1500); // 1.5 saniye bekle, app yüklensin
      } else {
        setPendingStreak(data);
      }
    }
  }, [isReady]); // isReady true olduktan sonra bir kez çalış

  useEffect(() => {
    if (!isReady || !pendingStreak) return;
    if (!nickname || nickname.trim().length === 0) return;

    const timer = setTimeout(() => {
      setStreakData(pendingStreak);
      setStreakModalVisible(true);
      setPendingStreak(null);
    }, 600);

    return () => clearTimeout(timer);
  }, [isReady, nickname, pendingStreak]);

  if (!isReady) {
    // 🖼️ Custom splash screen göster - tüm görseller yüklenene kadar
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <Image
          source={SPLASH_IMAGE}
          style={{ flex: 1, width: '100%', height: '100%' }}
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppErrorBoundary>
        <NavigationContainer ref={navigationRef} onStateChange={onStateChange}>
          <Stack.Navigator screenOptions={{
            headerShown: false,
            animation: config.enableTransitionAnimations ? 'fade' : 'none',
            animationDuration: config.enableTransitionAnimations ? 150 : 0,
            freezeOnBlur: true, // 🚀 Blur'da ekranları dondur - performans
            contentStyle: { backgroundColor: '#0a0a1a' }, // 🎨 Flaş önleme
            // 🚀 LOW mod için agresif optimizasyon
            ...(config.reduceMotion && {
              animationTypeForReplace: 'pop',
              presentation: 'transparentModal',
            }),
          }}>
            <Stack.Screen name="Home" component={SwipeableHomeScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="Quiz" component={SwipeableQuizScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Market" component={SwipeableMarketScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Farm" component={FarmScreen} />
            <Stack.Screen name="Inventory" component={InventoryScreenNew} />
            <Stack.Screen name="WordPuzzle" component={WordPuzzleScreen} />
            <Stack.Screen name="PhrasalVerbs" component={PhrasalVerbScreen} />
            <Stack.Screen name="PhrasalVerbsMenu" component={PhrasalVerbsMenuScreen} />
            <Stack.Screen name="PhrasalVerbFarm" component={PhrasalVerbFarmScreenNew} />
            <Stack.Screen name="PhrasalVerbQuiz" component={PhrasalVerbQuizScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="PhrasalVerbList" component={PhrasalVerbListScreen} />
            <Stack.Screen name="SeedMarket" component={SeedMarketScreen} />
            <Stack.Screen name="Store" component={StoreScreen} />
            <Stack.Screen name="WordList" component={WordListScreen} />
            {/* ⚔ Battle Mode Screens */}
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="BattleMenu" component={BattleMenuScreen} />
            <Stack.Screen name="Battle" component={BattleScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            {/* 🎤 SesYap Mode */}
            <Stack.Screen name="SesYap" component={SesYapScreen} />
            {/* 📚 Pratik Merkezi */}
            <Stack.Screen name="WordMatch" component={WordMatchScreen} />
            <Stack.Screen name="FillBlank" component={FillBlankScreen} />
            <Stack.Screen name="Collocations" component={CollocationsScreen} />
            <Stack.Screen name="Idioms" component={IdiomsScreen} />
            {/* 🎓 YDS Quiz */}
            <Stack.Screen name="YDSQuiz" component={YDSQuizScreen} />
            <Stack.Screen name="YDSWordForms" component={YDSWordFormsScreen} />
            {/* 🌱 Kendi Kelime Kartı */}
            <Stack.Screen name="CustomWordCard" component={CustomWordCardScreen} />
          </Stack.Navigator>
          <FixedBottomTabBar currentRoute={currentRoute} />
          <TutorialOverlayWrapper />
          <GuidedModeOverlayWrapper />
          <TutorialSkipButton />
          <RewardToastContainer />
          
          {/* 🔥 GÜNLÜK SERİ MODAL */}
          <DailyStreakModal
            visible={streakModalVisible}
            onClose={() => setStreakModalVisible(false)}
            streakCount={streakData.count}
            reward={streakData.reward}
          />
        </NavigationContainer>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// 🎓 Tutorial Overlay Wrapper - useTutorialInit hook'unu çağırır
const TutorialOverlayWrapper = memo(() => {
  const navigation = useNavigation<any>();
  const tutorialStep = useTutorialInit();
  const isVisible = tutorialStep !== 'NOT_STARTED' && tutorialStep !== 'COMPLETED';

  // 🎯 Tutorial aktifse ve ekran değiştiyse, doğru ekrana yönlendir
  useEffect(() => {
    if (tutorialStep !== 'NOT_STARTED' && tutorialStep !== 'COMPLETED') {
      const correctRoute = getTutorialRoute(tutorialStep);
      const currentRoute = navigationRef.current?.getCurrentRoute()?.name;

      // Sadece yanlış ekrandaysa navigate et
      if (currentRoute && currentRoute !== correctRoute) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: correctRoute }],
          })
        );
      }
    }
  }, [tutorialStep, navigation]);

  return <TutorialOverlay visible={isVisible} />;
});

type GuidedNavigationTarget = { name: string; params?: Record<string, any> };

const GUIDED_STEP_TARGETS: Record<GuidedModeStep, GuidedNavigationTarget | null> = {
  QUIZ_UNTIL_WRONG: { name: 'Quiz' },
  FARM_MASTER_TARGET: { name: 'Farm', params: { tab: 'words' } },
  PUZZLE_PRACTICE: { name: 'Farm', params: { tab: 'puzzle' } },
  SESYAP_PRACTICE: { name: 'SesYap' },
  COMPLETED: null,
};

function isGuidedRouteSatisfied(step: GuidedModeStep, routeName?: string, params?: any): boolean {
  if (!routeName) return false;
  if (step === 'QUIZ_UNTIL_WRONG') return routeName === 'Quiz';
  if (step === 'FARM_MASTER_TARGET') return routeName === 'Farm';
  if (step === 'PUZZLE_PRACTICE') return routeName === 'Farm' && params?.tab === 'puzzle';
  if (step === 'SESYAP_PRACTICE') return routeName === 'SesYap';
  return true;
}

function getGuidedNarrative(step: GuidedModeStep, targetWordText?: string) {
  const targetWord = targetWordText && targetWordText.trim().length > 0 ? targetWordText.trim() : 'hedef kelime';
  switch (step) {
    case 'QUIZ_UNTIL_WRONG':
      return {
        stage: 'Aşama 1/4',
        title: 'Prolog: Tohum Topla',
        body: 'Önce Quiz ekranında ilerle. İlk yanlışın seni hikayedeki hedef kelimeye götürecek.',
        cta: 'Quize Git',
      };
    case 'FARM_MASTER_TARGET':
      return {
        stage: 'Aşama 2/4',
        title: 'Görev: Hedef Hasat',
        body: `${targetWord} kelimesini çiftlikte hasat et. Bu adım tamamlanmadan sonraki perde açılmaz.`,
        cta: 'Çiftliğe Git',
      };
    case 'PUZZLE_PRACTICE':
      return {
        stage: 'Aşama 3/4',
        title: 'Bölüm: Yapboz Çalışması',
        body: 'Şimdi Yapboz sekmesinde bir doğru kurgu yap. Hikaye burada cümle pratiğiyle devam ediyor.',
        cta: 'Yapboza Git',
      };
    case 'SESYAP_PRACTICE':
      return {
        stage: 'Aşama 4/4',
        title: 'Final: SesYap',
        body: 'Son adımda SesYap ile bir doğru telaffuz yap ve lineer müfredatı tamamla.',
        cta: 'SesYapa Git',
      };
    default:
      return {
        stage: 'Tamamlandı',
        title: 'Müfredat Bitti',
        body: 'Yönlendirmeli akış tamamlandı.',
        cta: 'Devam',
      };
  }
}

const GuidedModeOverlayWrapper = memo(() => {
  const navigation = useNavigation<any>();
  const guidedModeActive = useFarmStore((s) => s.guidedModeActive);
  const guidedModeStep = useFarmStore((s) => s.guidedModeStep) as GuidedModeStep;
  const guidedModeTargetWordText = useFarmStore((s) => s.guidedModeTargetWordText);
  const stopGuidedMode = useFarmStore((s) => s.stopGuidedMode);

  const [pendingStep, setPendingStep] = useState<GuidedModeStep | null>(null);
  const [acknowledgedStep, setAcknowledgedStep] = useState<GuidedModeStep | null>(null);
  const [isEnforcingRoute, setIsEnforcingRoute] = useState(false);
  const lastObservedStepRef = useRef<GuidedModeStep | null>(null);
  const lastEnforcedStepRef = useRef<GuidedModeStep | null>(null);

  useEffect(() => {
    if (!guidedModeActive || guidedModeStep === 'COMPLETED') {
      setPendingStep(null);
      setAcknowledgedStep(null);
      setIsEnforcingRoute(false);
      lastObservedStepRef.current = null;
      lastEnforcedStepRef.current = null;
      return;
    }

    if (lastObservedStepRef.current !== guidedModeStep) {
      lastObservedStepRef.current = guidedModeStep;
      lastEnforcedStepRef.current = null;
      setPendingStep(guidedModeStep);
      setAcknowledgedStep(null);
      setIsEnforcingRoute(false);
    }
  }, [guidedModeActive, guidedModeStep]);

  useEffect(() => {
    if (!guidedModeActive || guidedModeStep === 'COMPLETED') return;
    if (!isEnforcingRoute) return;
    if (acknowledgedStep !== guidedModeStep) return;

    const target = GUIDED_STEP_TARGETS[guidedModeStep];
    if (!target) {
      setIsEnforcingRoute(false);
      return;
    }

    const current = navigationRef.current?.getCurrentRoute?.();
    if (isGuidedRouteSatisfied(guidedModeStep, current?.name, current?.params)) {
      setIsEnforcingRoute(false);
      return;
    }
    if (lastEnforcedStepRef.current === guidedModeStep) {
      setIsEnforcingRoute(false);
      return;
    }

    lastEnforcedStepRef.current = guidedModeStep;
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: target.name, params: target.params }],
      })
    );
    setIsEnforcingRoute(false);
  }, [acknowledgedStep, guidedModeActive, guidedModeStep, isEnforcingRoute, navigation]);

  const handleContinue = useCallback(() => {
    if (!guidedModeActive || guidedModeStep === 'COMPLETED') {
      setPendingStep(null);
      return;
    }

    haptic.medium();
    setPendingStep(null);
    setAcknowledgedStep(guidedModeStep);
    setIsEnforcingRoute(true);
  }, [guidedModeActive, guidedModeStep]);

  const handleExitGuided = useCallback(() => {
    Alert.alert(
      'Müfredatı Sonlandır',
      'Yönlendirmeli akış kapanacak. Serbest moda geçeceksin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: () => {
            haptic.medium();
            stopGuidedMode();
            traceEvent('guided_mode_stop_by_user', {
              source: 'guided_overlay',
              step: guidedModeStep,
            });
          },
        },
      ]
    );
  }, [guidedModeStep, stopGuidedMode]);

  if (!guidedModeActive || guidedModeStep === 'COMPLETED' || pendingStep !== guidedModeStep) {
    return null;
  }

  const narrative = getGuidedNarrative(guidedModeStep, guidedModeTargetWordText);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <View style={styles.guidedOverlayBackdrop}>
        <View style={styles.guidedOverlayCard}>
          <Text style={styles.guidedOverlayStage}>{narrative.stage}</Text>
          <Text style={styles.guidedOverlayTitle}>{narrative.title}</Text>
          <Text style={styles.guidedOverlayBody}>{narrative.body}</Text>

          <View style={styles.guidedOverlayButtonStack}>
            <Pressable onPress={handleContinue} style={styles.guidedOverlayButton}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.guidedOverlayButtonGradient}
              >
                <Text style={styles.guidedOverlayButtonText}>{narrative.cta}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={handleExitGuided} style={styles.guidedOverlaySecondaryButton}>
              <Text style={styles.guidedOverlaySecondaryButtonText}>Müfredatı Sonlandır</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

//  Tutorial'a geri dönme uyarısı - uygulama arka plana alındığında sor
const TutorialResumePrompt = memo(() => {
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const tutorialInterrupted = useFarmStore(s => s.tutorialInterrupted);
  const setTutorialInterrupted = useFarmStore(s => s.setTutorialInterrupted);
  const skipTutorial = useFarmStore(s => s.skipTutorial);

  const isActiveTutorial = tutorialStep !== 'NOT_STARTED' && tutorialStep !== 'COMPLETED';
  const shouldShow = tutorialInterrupted && isActiveTutorial;

  const handleResume = useCallback(() => {
    haptic.light();
    setTutorialInterrupted(false);
  }, [setTutorialInterrupted]);

  const handleSkip = useCallback(() => {
    haptic.medium();
    skipTutorial();
    setTutorialInterrupted(false);
  }, [skipTutorial, setTutorialInterrupted]);

  if (!shouldShow) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.resumeOverlay}>
        <View style={styles.resumeCard}>
          <Text style={styles.resumeTitle}>Eğitime devam?</Text>
          <Text style={styles.resumeText}>
            Tutorial yarıda kaldı. Kaldığın yerden devam etmek ister misin?
          </Text>
          <View style={styles.resumeButtons}>
            <Pressable style={[styles.resumeButton, styles.resumeSkip]} onPress={handleSkip}>
              <Text style={styles.resumeSkipText}>Serbest bırak</Text>
            </Pressable>
            <Pressable style={[styles.resumeButton, styles.resumeContinue]} onPress={handleResume}>
              <Text style={styles.resumeContinueText}>Devam et</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// FIXED BOTTOM TAB BAR (Global, Trendyol/Spotify Style)
const TAB_BAR_HEIGHT = 70; // Reduced from 100

// 🖼 Navbar Images - Optimized webp
const NAV_IMAGES = {
  home: require('./assets/navbar_anasayfa.png'),
  quiz: require('./assets/images/maskot/quiz_logo.webp'),
  market: require('./assets/images/maskot/market_anasayfa.webp'),
  farm: require('./assets/images/maskot/ciftlik_navbar.png'),
  inventory: require('./assets/images/maskot/envanter_navbar.png'),
  puzzle: require('./assets/images/maskot/puzzle.webp'),
  phrasal: require('./assets/images/maskot/phrasal.webp'),
  seedMarket: require('./assets/images/maskot/tohum_pazarı.webp'),
  powerStore: require('./assets/images/maskot/guc_magazasi.webp'),
};

//  Optimized Animated Nav Button with Emojis - ULTRA MODERN
interface NavButtonProps {
  onPress: () => void;
  emoji?: string;
  label: string;
  isCenter?: boolean;
  isActive?: boolean;
  isLocked?: boolean;
  imageSource?: any;
  isSmall?: boolean;
  IconComponent?: any; // New prop for Lucide icons
}

const NavButton = memo(({ onPress, emoji, label, isCenter, isActive, isLocked, imageSource, isSmall, IconComponent }: NavButtonProps) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const centerGlow = React.useRef(new Animated.Value(0.6)).current;
  const centerPulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Center button always glows and pulses
    if (isCenter && !isLocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(centerGlow, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(centerGlow, {
            toValue: 0.5,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(centerPulse, {
            toValue: 1.06,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(centerPulse, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isCenter]);

  // Clean press handlers
  const handlePressIn = useCallback(() => {
    haptic.light();
    Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, speed: 50, bounciness: 10 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 10 }).start();
  }, [scaleAnim]);

  // Center Button Render (Quiz)
  if (isCenter) {
    return (
      <View style={styles.centerNavColumn}>
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.navItemCenter}>
          <Animated.View style={[
            styles.centerButtonContainer,
            { transform: [{ scale: scaleAnim }, { scale: centerPulse }] },
            isLocked && styles.lockedOpacity
          ]}>
            <Image source={NAV_IMAGES.quiz} style={styles.centerButtonImage} contentFit="cover" cachePolicy="memory-disk" priority="high" transition={0} />
            {isLocked && <View style={styles.lockOverlay}><Lock size={16} color="#fbbf24" /></View>}
          </Animated.View>
        </Pressable>
      </View>
    );
  }

  // Normal Button Render
  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.navItem}>
      <Animated.View style={[styles.navItemInner, { transform: [{ scale: scaleAnim }] }, isLocked && styles.lockedOpacity]}>
        {isActive && !isLocked && <View style={[styles.activeIndicator, isSmall && styles.activeIndicatorSmall]} />}

        <View style={[
          styles.emojiContainer,
          isActive && !isLocked && styles.emojiContainerActive,
          isSmall && styles.emojiContainerSmall,
          isSmall && isActive && !isLocked && styles.emojiContainerSmallActive
        ]}>
          {IconComponent ? (
            // Support for Lucide Icons (New Home Icon)
            <IconComponent
              size={isSmall ? 18 : 22} // Reduced icon size
              color={isActive ? "#22c55e" : "rgba(255,255,255,0.7)"}
              strokeWidth={isActive ? 2.5 : 2}
            />
          ) : imageSource ? (
            <Image
              source={imageSource}
              style={[styles.navItemImage, isSmall && styles.navItemImageSmall, isLocked && { opacity: 0.4 }]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
            />
          ) : (
            <Text style={[styles.navEmoji, isSmall && styles.navEmojiSmall, isLocked && { opacity: 0.4 }]}>{emoji}</Text>
          )}

          {isLocked && (
            <View style={styles.lockIconSmall}>
              <Lock size={isSmall ? 10 : 12} color="#fbbf24" />
            </View>
          )}
        </View>

        {label ? (
          <Text style={[styles.navItemText, isSmall && styles.navItemTextSmall, isActive && !isLocked && styles.navItemTextActive, isLocked && { opacity: 0.4 }]}>
            {label}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

//  Global tab state - ayrı dosyada tanımlı (require cycle önlemek için)
import { globalTabState } from './src/navigation/globalTabState';
import { TUTORIAL_NAV_LOCKS, LOCK_TOOLTIPS, TutorialOverlay, useTutorialInit, getTutorialRoute, TutorialSkipButton } from './src/components/TutorialManagerFixed';
import type { TutorialStep, GuidedModeStep } from './src/store/farmStore';

//  Pazarlar Menü Popover (Updated: Compact Horizontal Bar)
const MarketsPopover = memo(({ visible, onClose, onPhrasalPress, onPuzzlePress, onSeedMarketPress, onPowerStorePress, onSesYapPress, onBattlePress }: any) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      // Staggered Item Animation
      Animated.stagger(50, itemAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 })
      )).start();

    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();

      // Reset items
      itemAnims.forEach(anim => anim.setValue(0));
    }
  }, [visible]);

  if (!visible) return null;

  const renderItem = (icon: string, onPress: () => void, color: string, index: number) => (
    <Animated.View style={{ transform: [{ scale: itemAnims[index] }], opacity: itemAnims[index] }}>
      <Pressable onPress={() => { haptic.medium(); onPress(); onClose(); }} style={styles.popoverItem}>
        <View style={[styles.popoverIconBox, { backgroundColor: `${color}33`, borderColor: `${color}66` }]}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.popoverOverlay} onPress={onClose}>
        {/* Floating Popover Container */}
        <Animated.View style={[styles.popoverContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: -20 }] }]}>
          <LinearGradient
            colors={['rgba(20, 25, 35, 0.95)', 'rgba(15, 20, 30, 0.98)']}
            style={styles.popoverGradient}
          >
            {renderItem("🌱", onSeedMarketPress, "#22c55e", 0)}
            {renderItem("⚡", onPowerStorePress, "#fbbf24", 1)}
            {renderItem("📚", onPhrasalPress, "#ec4899", 2)}
            {renderItem("🧩", onPuzzlePress, "#f97316", 3)}
            {renderItem("🎤", onSesYapPress, "#06b6d4", 4)}
            {renderItem("⚔️", onBattlePress, "#ef4444", 5)}
          </LinearGradient>

          {/* Arrow/Triangle pointing down */}
          <View style={styles.popoverArrow} />
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

//  Fixed Bottom Tab Bar - MEMOIZED + TUTORIAL LOCKS
const FixedBottomTabBar = memo(({ currentRoute }: { currentRoute: string }) => {
  const { useNavigation, CommonActions } = require('@react-navigation/native');
  const { useSafeAreaInsets } = require('react-native-safe-area-context');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isNavigating = useRef(false);
  const lastNavigationTime = useRef(0);
  const [lockTooltip, setLockTooltip] = useState<string | null>(null);
  const [, forceUpdate] = useState(0); // forceUpdate için
  const [showMarketsMenu, setShowMarketsMenu] = useState(false); // Pazarlar/More menüsü state

  //  Tutorial state
  const tutorialStep = useFarmStore(s => s.tutorialStep) as TutorialStep;
  const tutorialNavLocks = TUTORIAL_NAV_LOCKS[tutorialStep] || TUTORIAL_NAV_LOCKS.COMPLETED;
  const guidedModeActive = useFarmStore(s => s.guidedModeActive);
  const guidedModeStep = useFarmStore(s => s.guidedModeStep) as GuidedModeStep;
  const sectionVisibility = useFarmStore(s => s.sectionVisibility);
  const isNavbarVisible = sectionVisibility?.navbar ?? true;
  const navbarAnim = useRef(new Animated.Value(isNavbarVisible ? 1 : 0)).current;

  const guidedNavLocks = useMemo(() => {
    if (!guidedModeActive) return null;
    switch (guidedModeStep) {
      case 'QUIZ_UNTIL_WRONG':
        return { home: true, quiz: true, farm: false, inventory: false, store: false, puzzle: false, phrasal: false };
      case 'FARM_MASTER_TARGET':
        return { home: true, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false };
      case 'PUZZLE_PRACTICE':
        return { home: true, quiz: false, farm: false, inventory: false, store: false, puzzle: true, phrasal: false };
      case 'SESYAP_PRACTICE':
        return { home: true, quiz: false, farm: false, inventory: false, store: false, puzzle: false, phrasal: false };
      default:
        return null;
    }
  }, [guidedModeActive, guidedModeStep]);

  const navLocks = useMemo(() => {
    if (!guidedNavLocks) return tutorialNavLocks;
    return {
      home: tutorialNavLocks.home && guidedNavLocks.home,
      quiz: tutorialNavLocks.quiz && guidedNavLocks.quiz,
      farm: tutorialNavLocks.farm && guidedNavLocks.farm,
      inventory: tutorialNavLocks.inventory && guidedNavLocks.inventory,
      store: tutorialNavLocks.store && guidedNavLocks.store,
      puzzle: tutorialNavLocks.puzzle && guidedNavLocks.puzzle,
      phrasal: tutorialNavLocks.phrasal && guidedNavLocks.phrasal,
    };
  }, [tutorialNavLocks, guidedNavLocks]);

  useEffect(() => {
    Animated.timing(navbarAnim, {
      toValue: isNavbarVisible ? 1 : 0,
      duration: isNavbarVisible ? 250 : 210,
      easing: isNavbarVisible
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isNavbarVisible, navbarAnim]);

  const getGuidedBlockMessage = useCallback((route: string, params?: any): string | null => {
    if (!guidedModeActive) return null;
    if (route === 'Home') return null;

    switch (guidedModeStep) {
      case 'QUIZ_UNTIL_WRONG':
        return route === 'Quiz' ? null : 'Müfredat aktif: önce yanlış yapana kadar Quiz çöz.';
      case 'FARM_MASTER_TARGET':
        return route === 'Farm' ? null : 'Müfredat aktif: hedef kelimeyi çiftlikte hasat et.';
      case 'PUZZLE_PRACTICE':
        return route === 'Farm' && params?.tab === 'puzzle'
          ? null
          : 'Müfredat aktif: şimdi Yapboz adımını tamamla.';
      case 'SESYAP_PRACTICE':
        return route === 'SesYap' ? null : 'Müfredat aktif: son adım SesYap pratiği.';
      default:
        return null;
    }
  }, [guidedModeActive, guidedModeStep]);

  // 🔄 Combo reset fonksiyonları
  const resetQuizCombo = useFarmStore(s => s.resetQuizCombo);
  const resetPhrasalCombo = useFarmStore(s => s.resetPhrasalCombo);

  //  Mevcut tab'ı route params'tan al (FarmScreen'den gelen)
  const currentTab = navigationRef.current?.getCurrentRoute()?.params?.tab || globalTabState.current;

  // 🔄 Navigation state değişikliklerini dinle
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      // Navigation state değiştiğinde forceUpdate tetikle
      forceUpdate(prev => prev + 1);
    });
    return unsubscribe;
  }, [navigation]);

  // 🔄 currentRoute değiştiğinde de forceUpdate tetikle
  useEffect(() => {
    forceUpdate(prev => prev + 1);
  }, [currentRoute]);

  // 🔒 Global nav guard for tab bar - RESET instead of navigate to clear stack!
  const guardedNavigate = useCallback(
    (route: string, lockKey: keyof typeof navLocks, params?: any) => {
      const guidedMessage = getGuidedBlockMessage(route, params);
      if (guidedMessage) {
        if (haptic.warning) {
          haptic.warning();
        } else {
          haptic.light();
        }
        setLockTooltip(guidedMessage);
        setTimeout(() => setLockTooltip(null), 2600);
        return;
      }

      //  Tutorial kilidi kontrolü
      if (!navLocks[lockKey]) {
        if (haptic.warning) {
          haptic.warning();
        } else {
          haptic.light();
        }
        setLockTooltip(LOCK_TOOLTIPS[lockKey] || 'Önce tutorialı tamamla.');
        setTimeout(() => setLockTooltip(null), 2500);
        return;
      }

      const now = Date.now();
      if (isNavigating.current || now - lastNavigationTime.current < 500) {
        return;
      }

      // Skip if already on this route AND no tab change needed
      if (currentRoute === route && !params?.tab) {
        return;
      }

      isNavigating.current = true;
      lastNavigationTime.current = now;
      haptic.selection();

      // 🔄 Tab değiştiğinde combo'ları sıfırla
      resetQuizCombo();
      resetPhrasalCombo();

      // 🚀 RESET stack instead of navigate - prevents memory buildup!
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: route, params }],
        })
      );

      setTimeout(() => {
        isNavigating.current = false;
      }, 500);
    },
    [navigation, currentRoute, navLocks, resetQuizCombo, resetPhrasalCombo, getGuidedBlockMessage]
  );

  //  Tab state'i koru - Farm/Inventory arası geçişlerde aynı sekmeyi aç
  const handleNavFarm = useCallback(() => {
    guardedNavigate('Farm', 'farm', { tab: globalTabState.current });
  }, [guardedNavigate]);

  const handleNavInventory = useCallback(() => {
    guardedNavigate('Inventory', 'inventory', { tab: globalTabState.current });
  }, [guardedNavigate]);

  const handleNavQuiz = useCallback(() => guardedNavigate('Quiz', 'quiz'), [guardedNavigate]);
  const handleNavHome = useCallback(() => guardedNavigate('Home', 'home'), [guardedNavigate]);
  const handleNavPuzzle = useCallback(() => guardedNavigate('Farm', 'puzzle', { tab: 'puzzle' }), [guardedNavigate]);
  const handleNavPhrasal = useCallback(() => guardedNavigate('PhrasalVerbsMenu', 'phrasal'), [guardedNavigate]);
  const handleNavSeedMarket = useCallback(() => guardedNavigate('SeedMarket', 'home'), [guardedNavigate]);
  const handleNavPowerStore = useCallback(() => guardedNavigate('Store', 'home'), [guardedNavigate]);
  const handleNavSesYap = useCallback(() => guardedNavigate('SesYap', 'home'), [guardedNavigate]);
  const handleNavBattle = useCallback(() => guardedNavigate('BattleMenu', 'home'), [guardedNavigate]);
  const handleNavMarketTab = useCallback(() => guardedNavigate('Market', 'home'), [guardedNavigate]);
  const navbarTranslateY = navbarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [TAB_BAR_HEIGHT + insets.bottom + 18, 0],
    extrapolate: 'clamp',
  });
  const navbarOpacity = navbarAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.15, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Animated.View
        style={{
          transform: [{ translateY: navbarTranslateY }],
          opacity: navbarOpacity,
        }}
        pointerEvents={isNavbarVisible ? 'auto' : 'none'}
      >
      <BlurView intensity={95} tint="dark" style={[styles.bottomTabBar, { paddingBottom: insets.bottom }]}>
        {/* Ciftlik (Sol) */}
        <View style={styles.tabItemContainer}>
          <NavButton
            onPress={handleNavFarm}
            emoji="🌱"
            label=""
            isActive={currentRoute === 'Farm'}
            isLocked={!navLocks.farm}
            imageSource={NAV_IMAGES.farm}
          />
        </View>

        {/* Center Stack Holder (Quiz, Home, More) */}
        <View style={styles.tabCenterContainer}>
          {/* 3. More (...) - Top Absolute */}
          <View style={styles.moreButtonPos}>
            <Pressable
              onPress={() => {
                haptic.medium();
                setShowMarketsMenu(true);
              }}
              style={styles.moreButton}
            >
              <MoreHorizontal size={20} color="#fff" />
            </Pressable>
          </View>

          {/* 2. Home - Middle Absolute */}
          <View style={styles.homeButtonPos}>
            <NavButton
              onPress={handleNavHome}
              emoji="🏠"
              label=""
              isCenter={false}
              isActive={currentRoute === 'Home'}
              isLocked={!navLocks.home}
              IconComponent={Home} // Use Lucide Home Icon
              isSmall={true}
            />
          </View>

          {/* 1. Quiz (Bottom - Static in Flow) */}
          <NavButton
            onPress={handleNavQuiz}
            emoji=""
            label=""
            isCenter
            isActive={currentRoute === 'Quiz'}
            isLocked={!navLocks.quiz}
          />
        </View>

        {/* Envanter (Sağ) */}
        <View style={styles.tabItemContainer}>
          <NavButton
            onPress={handleNavInventory}
            emoji="👜"
            label=""
            isActive={currentRoute === 'Inventory'}
            isLocked={!navLocks.inventory}
            imageSource={NAV_IMAGES.inventory}
          />
        </View>
      </BlurView>
      </Animated.View>

      {/*  More / Markets Popover Menu */}
      <MarketsPopover
        visible={showMarketsMenu}
        onClose={() => setShowMarketsMenu(false)}
        onPhrasalPress={handleNavPhrasal}
        onPuzzlePress={handleNavPuzzle}
        onSeedMarketPress={handleNavSeedMarket}
        onPowerStorePress={handleNavPowerStore}
        onSesYapPress={handleNavSesYap}
        onBattlePress={handleNavBattle}
      />

      {/* 🔒 Lock Tooltip */}
      {lockTooltip && (
        <Animated.View style={styles.lockTooltipContainer}>
          <Lock size={16} color="#fbbf24" />
          <Text style={styles.lockTooltipText}>{lockTooltip}</Text>
        </Animated.View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  // FIXED BOTTOM TAB BAR (Trendyol/Spotify Style)
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 0,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 9999,
    backgroundColor: Platform.OS === 'android' ? 'rgba(20, 20, 25, 0.95)' : 'transparent',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
  },
  navItemCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonContainer: {
    backgroundColor: 'transparent',
    borderRadius: 41,
    width: 82, // Slightly reduced from 90 (User requested "bir tık")
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 40, // Adjusted lift
    borderWidth: 0,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
  },
  centerNavColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 0,
    height: 60,
    width: 60,
    zIndex: 10,
  },
  // 👆 Top Buttons Row - Home + Market Buttons
  topButtonsRow: {
    display: 'none', // HIDDEN IN NEW DESIGN
  },
  // 🧩 Flex Grid for Bottom Tab Bar - 3 Columns now
  tabItemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    paddingTop: 8,
  },
  tabCenterContainer: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    paddingTop: 8,
    position: 'relative',
    height: 100,
    zIndex: 20,
  },
  moreButtonPos: {
    position: 'absolute',
    bottom: 135, // Adjusted for smaller stack
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  homeButtonPos: {
    position: 'absolute',
    bottom: 105, // Just above smaller Quiz
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  moreButton: {
    width: 32, // Smaller
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  tabItemContainerSmall: {
    flex: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    paddingTop: 8,
  },
  // 🌱⚡ Side market buttons
  sideMarketButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden',
  },
  seedMarketStyle: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    shadowColor: '#22c55e',
  },
  powerStoreStyle: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    shadowColor: '#fbbf24',
  },
  marketEmoji: {
    fontSize: 20,
  },
  sideMarketImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden',
  },
  sideButtonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22, // Matches container border radius
  },
  sideLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonContainer: {
    marginTop: 4,
  },
  homeButtonContainerAbove: {
    position: 'absolute',
    top: -65,
    alignItems: 'center',
    zIndex: 100,
  },
  homeButtonContainerBelow: {
    marginTop: -2,
    alignItems: 'center',
  },
  homeButtonContainerTop: {
    position: 'absolute',
    top: -32,
    alignItems: 'center',
    zIndex: 100,
  },
  homeButtonContainerBottom: {
    marginTop: -10,
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    width: 36, // Smaller
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emojiContainerSmall: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  emojiContainerActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  emojiContainerSmallActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  navEmoji: {
    fontSize: 24,
  },
  navEmojiSmall: {
    fontSize: 20,
  },
  navItemImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  navItemImageSmall: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  navItemText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '600',
  },
  navItemTextSmall: {
    fontSize: 9,
    marginTop: 3,
  },
  navItemTextActive: {
    color: '#22c55e',
    fontWeight: '700',
  },
  navItemInner: {
    alignItems: 'center',
    position: 'relative',
    padding: 0,
    margin: 0,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  activeIndicatorSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    top: -6,
  },
  centerButtonEmoji: {
    fontSize: 32,
  },
  navImage: {
    width: 48,
    height: 48,
  },
  centerButtonImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  centerButtonGlow: {
    display: 'none',
  },
  centerButtonGlowOuter: {
    display: 'none',
    position: 'absolute',
    width: 0,
    height: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    top: 0,
  },
  electricRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  centerButtonShine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 45,
  },

  // 🔒 LOCK STYLES
  lockedOpacity: {
    opacity: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 2,
  },
  lockTooltipContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  lockTooltipText: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '500',
  },
  //  Tutorial devam uyarısı
  resumeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resumeCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resumeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  resumeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  resumeButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  resumeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  resumeSkip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resumeContinue: {
    backgroundColor: '#22c55e',
  },
  resumeSkipText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    fontSize: 14,
  },
  resumeContinueText: {
    color: '#0b1118',
    fontWeight: '800',
    fontSize: 14,
  },
  guidedOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  guidedOverlayCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: '#0b1524',
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 14,
  },
  guidedOverlayStage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93c5fd',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  guidedOverlayTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  guidedOverlayBody: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(226, 232, 240, 0.95)',
    marginBottom: 16,
  },
  guidedOverlayButtonStack: {
    gap: 10,
  },
  guidedOverlayButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  guidedOverlayButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidedOverlayButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#04210f',
    letterSpacing: 0.2,
  },
  guidedOverlaySecondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  guidedOverlaySecondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.2,
  },

  //  Popover Styles (Compact)
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 170, // Perfectly aligned above the More button (135 bottom + 30 height + padding)
  },
  popoverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverGradient: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  popoverItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  popoverArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(15, 20, 30, 0.98)',
    marginTop: -1,
  },
});

