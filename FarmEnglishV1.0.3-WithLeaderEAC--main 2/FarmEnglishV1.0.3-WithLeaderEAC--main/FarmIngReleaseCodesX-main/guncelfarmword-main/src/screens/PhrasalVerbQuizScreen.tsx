import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Flame, X, Check, Zap, Star, Coins, Award } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { showRewardToast } from '../components/RewardToast';
import { useMilestoneToastStore, MilestoneToastContainer } from '../components/MilestoneToast';
import { ComboDisplay } from '../components/ComboDisplay';
import { CorrectCelebration } from '../components/Confetti';
import { usePerformanceStore } from '../store/performanceStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 📱 RESPONSIVE SYSTEM
const getScreenType = () => {
  if (SCREEN_HEIGHT < 700) return 'small';
  if (SCREEN_HEIGHT < 850) return 'medium';
  if (SCREEN_HEIGHT < 1100) return 'large';
  return 'tablet';
};

const SCREEN_TYPE = getScreenType();

// Responsive değerler
const RS = {
  questionFont: { small: 28, medium: 36, large: 42, tablet: 52 }[SCREEN_TYPE],
  optionFont: { small: 14, medium: 16, large: 17, tablet: 18 }[SCREEN_TYPE],
  labelFont: { small: 9, medium: 11, large: 12, tablet: 13 }[SCREEN_TYPE],
  comboFont: { small: 10, medium: 11, large: 12, tablet: 14 }[SCREEN_TYPE],
  headerPadding: { small: 10, medium: 12, large: 16, tablet: 20 }[SCREEN_TYPE],
  questionPaddingV: { small: 20, medium: 30, large: 40, tablet: 50 }[SCREEN_TYPE],
  optionPaddingV: { small: 12, medium: 14, large: 16, tablet: 18 }[SCREEN_TYPE],
  optionPaddingH: { small: 14, medium: 16, large: 18, tablet: 22 }[SCREEN_TYPE],
  containerPaddingH: { small: 12, medium: 14, large: 16, tablet: 24 }[SCREEN_TYPE],
  optionGap: { small: 8, medium: 10, large: 12, tablet: 14 }[SCREEN_TYPE],
  headerGap: { small: 8, medium: 10, large: 12, tablet: 16 }[SCREEN_TYPE],
  exitButtonSize: { small: 28, medium: 32, large: 36, tablet: 40 }[SCREEN_TYPE],
  timerHeight: { small: 4, medium: 5, large: 6, tablet: 8 }[SCREEN_TYPE],
  comboIconSize: { small: 10, medium: 12, large: 14, tablet: 16 }[SCREEN_TYPE],
  resultIconSize: { small: 24, medium: 28, large: 32, tablet: 36 }[SCREEN_TYPE],
  resultEmoji: { small: 48, medium: 64, large: 80, tablet: 100 }[SCREEN_TYPE],
  resultTitle: { small: 22, medium: 28, large: 36, tablet: 44 }[SCREEN_TYPE],
  statNumber: { small: 26, medium: 36, large: 48, tablet: 56 }[SCREEN_TYPE],
  statLabel: { small: 11, medium: 13, large: 16, tablet: 18 }[SCREEN_TYPE],
  accuracyValue: { small: 28, medium: 38, large: 48, tablet: 56 }[SCREEN_TYPE],
  coinsFont: { small: 15, medium: 18, large: 22, tablet: 26 }[SCREEN_TYPE],
  streakFont: { small: 13, medium: 15, large: 18, tablet: 20 }[SCREEN_TYPE],
  buttonFont: { small: 14, medium: 16, large: 18, tablet: 20 }[SCREEN_TYPE],
  resultGap: { small: 10, medium: 16, large: 24, tablet: 32 }[SCREEN_TYPE],
  statsGap: { small: 14, medium: 20, large: 32, tablet: 40 }[SCREEN_TYPE],
};

const isSmallScreen = SCREEN_TYPE === 'small';
const TIMER_DURATION = 12000; // 12 seconds - phrasal verb için biraz daha uzun
const MIN_POOL_SIZE = 3;

// Difficulty multipliers
type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
const DIFFICULTY_MULTIPLIER: Record<DifficultyLevel, number> = {
  A1: 1,
  A2: 1.2,
  B1: 1.5,
  B2: 2,
  C1: 3,
  C2: 5,
};

interface QuizQuestion {
  id: string;
  verb: string;
  correctMeaning: string;
  example: string;
  options: { text: string; isCorrect: boolean }[];
  difficulty: DifficultyLevel;
}

// 🎯 OPTION BUTTON COMPONENT - OPTIMIZED WITH MEMO + PERFORMANS AYARLARI
const OptionButton = memo(({
  text,
  index,
  isSelected,
  isCorrect,
  showResult,
  disabled,
  onPress,
  opacity,
  translateY,
  enableJuicyButtons = true,
  enableGlow = true,
}: {
  text: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  showResult: boolean;
  disabled: boolean;
  onPress: () => void;
  opacity: Animated.Value;
  translateY: Animated.AnimatedInterpolation<number>;
  enableJuicyButtons?: boolean;
  enableGlow?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showResult && isSelected && !isCorrect && enableJuicyButtons) {
      // Wrong - fast shake
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();
    } else if (showResult && isCorrect && enableJuicyButtons) {
      // Correct - MEGA PULSE
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.05, friction: 8, tension: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 9, tension: 180, useNativeDriver: true }),
      ]).start();

      if (enableGlow) {
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [showResult, isSelected, isCorrect, enableJuicyButtons, enableGlow]);

  const handlePressIn = useCallback(() => {
    haptic.selection();
    if (enableJuicyButtons) {
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        friction: 10,
        tension: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [enableJuicyButtons]);

  const handlePressOut = useCallback(() => {
    if (enableJuicyButtons) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [enableJuicyButtons]);

  const backgroundColor = useMemo(() => {
    if (!showResult && disabled) return 'rgba(28, 28, 30, 0.35)';
    if (!showResult) return 'rgba(28, 28, 30, 0.95)';
    if (isCorrect) return 'rgba(52, 199, 89, 0.2)';
    if (isSelected) return 'rgba(255, 69, 58, 0.2)';
    return 'rgba(28, 28, 30, 0.6)';
  }, [showResult, disabled, isCorrect, isSelected]);

  const borderColor = useMemo(() => {
    if (!showResult && disabled) return 'rgba(255, 255, 255, 0.06)';
    if (!showResult) return 'rgba(255, 255, 255, 0.12)';
    if (isCorrect) return 'rgba(52, 199, 89, 0.8)';
    if (isSelected) return 'rgba(255, 69, 58, 0.8)';
    return 'rgba(255, 255, 255, 0.08)';
  }, [showResult, disabled, isCorrect, isSelected]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <Animated.View
          style={[
            styles.optionButton,
            {
              backgroundColor,
              borderColor,
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
              opacity: (showResult && !isSelected && !isCorrect) || (!showResult && disabled) ? 0.5 : 1,
            },
          ]}
        >
          <Text style={styles.optionText} numberOfLines={2}>
            {text}
          </Text>
          {showResult && isCorrect && (
            <View style={styles.resultIconContainer}>
              <Check color="#34c759" size={22} strokeWidth={3} />
            </View>
          )}
          {showResult && isSelected && !isCorrect && (
            <View style={[styles.resultIconContainer, { backgroundColor: 'rgba(255, 69, 58, 0.2)' }]}>
              <X color="#ff453a" size={22} strokeWidth={3} />
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// 🔥 TIMER BAR COMPONENT
const TimerBar = memo(({ duration, onTimeUp, timerKey, isPaused }: {
  duration: number;
  onTimeUp: () => void;
  timerKey: number;
  isPaused: boolean;
}) => {
  const widthAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const remainingTime = useRef(duration);
  const startTime = useRef(Date.now());

  useEffect(() => {
    widthAnim.setValue(1);
    remainingTime.current = duration;
    startTime.current = Date.now();
  }, [timerKey, duration]);

  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      const elapsed = Date.now() - startTime.current;
      remainingTime.current = Math.max(0, remainingTime.current - elapsed);
      return;
    }

    startTime.current = Date.now();
    const currentProgress = remainingTime.current / duration;
    widthAnim.setValue(currentProgress);

    animationRef.current = Animated.timing(widthAnim, {
      toValue: 0,
      duration: remainingTime.current,
      useNativeDriver: false,
      easing: Easing.linear,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        onTimeUp();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [isPaused, timerKey]);

  const widthInterpolate = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const colorInterpolate = widthAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#ef4444', '#f59e0b', '#22c55e'],
  });

  return (
    <View style={styles.timerBarContainer}>
      <Animated.View
        style={[
          styles.timerBarFill,
          {
            width: widthInterpolate,
            backgroundColor: colorInterpolate,
          },
        ]}
      />
    </View>
  );
});

// 🏆 MAIN COMPONENT
export default function PhrasalVerbQuizScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const level = (route.params?.level?.toUpperCase() || 'A1') as DifficultyLevel;

  // 🎮 PERFORMANS AYARLARI
  const config = usePerformanceStore(s => s.config);

  // Store selectors
  const phrasalVerbs = useFarmStore(s => s.phrasalVerbs);
  const unlockedPhrasalVerbs = useFarmStore(s => s.unlockedPhrasalVerbs);
  const addCoins = useFarmStore(s => s.addCoins);
  const addQuizReward = useFarmStore(s => s.addQuizReward);
  const addWrongStat = useFarmStore(s => s.addWrongStat);
  const addPhrasalVerbToFarm = useFarmStore(s => s.addPhrasalVerbToFarm);
  const updatePhrasalVerbProgress = useFarmStore(s => s.updatePhrasalVerbProgress);
  const bestStreak = useFarmStore(s => s.bestStreak);

  // 💡 Hint & Shield selectors
  const hintTokens = useFarmStore(s => s.hintTokens);
  const useHintToken = useFarmStore(s => s.useHintToken);
  const comboShields = useFarmStore(s => s.comboShields);
  const useComboShield = useFarmStore(s => s.useComboShield);

  // Persisted combo - Phrasal Verb Quiz uses currentPhrasalCombo
  const currentCombo = useFarmStore(s => s.currentPhrasalCombo);
  const incrementCombo = useFarmStore(s => s.incrementPhrasalCombo);
  const resetCombo = useFarmStore(s => s.resetPhrasalCombo);

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 💡 Hint state (disables 1 wrong option)
  const [disabledOptionIndexes, setDisabledOptionIndexes] = useState<number[]>([]);

  // Dopamine state
  const combo = currentCombo;
  const [maxCombo, setMaxCombo] = useState(currentCombo);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [showComboDisplay, setShowComboDisplay] = useState(false);

  // Animations
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const optionAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const comboScaleAnim = useRef(new Animated.Value(1)).current;
  const screenFlashAnim = useRef(new Animated.Value(0)).current;
  const screenShakeAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const nextQuestionTimeout = useRef<NodeJS.Timeout | null>(null);
  const comboDisplayTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasGeneratedQuestions = useRef(false);
  const isAnswering = useRef(false);
  const isFocused = useRef(true);

  // Optional: Selected verb IDs from route
  const selectedVerbIds: string[] | undefined = Array.isArray(route.params?.verbIds)
    ? route.params.verbIds
    : undefined;

  // Shuffle helper
  const shuffle = useCallback(<T,>(arr: T[]) => {
    return [...arr].sort(() => Math.random() - 0.5);
  }, []);

  // Unique strings helper
  const uniqueStrings = useCallback((arr: string[]) => {
    const seen = new Set<string>();
    return arr.filter(v => {
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    });
  }, []);

  // 🎓 CEFR Kontrolü: Tüm kartları açılmış mı kontrol et
  // Phrasal quiz sadece o CEFR'in tüm kartları açıldığında geçerli
  const isCefrFullyUnlocked = useCallback((cefrLevel: string): boolean => {
    const cardsInCefr = phrasalVerbs.filter(pv => pv.difficulty === cefrLevel);
    if (cardsInCefr.length === 0) return true; // Boş seviye, geçerli
    return cardsInCefr.every(pv => unlockedPhrasalVerbs.includes(pv.id));
  }, [phrasalVerbs, unlockedPhrasalVerbs]);

  // Generate more questions - ENDLESS MODE
  const generateMoreQuestions = useCallback((): QuizQuestion[] => {
    const basePool = phrasalVerbs.filter(
      pv => unlockedPhrasalVerbs.includes(pv.id) && pv.difficulty === level
    );

    const filteredBySelection = selectedVerbIds?.length
      ? basePool.filter(pv => selectedVerbIds.includes(pv.id))
      : basePool;

    const pool = filteredBySelection;
    if (pool.length < MIN_POOL_SIZE) return [];

    const generatedQuestions: QuizQuestion[] = [];
    const shuffledPool = shuffle(pool);

    // Generate 10 questions at a time
    for (let i = 0; i < Math.min(10, shuffledPool.length); i++) {
      const correct = shuffledPool[i];

      // 🎯 Yanlış anlamları TÜM phrasal verbs'ten çek (sadece açık olanlardan değil!)
      const candidateWrongMeanings = uniqueStrings(
        phrasalVerbs
          .filter(pv => pv.id !== correct.id && pv.meaning !== correct.meaning)
          .map(pv => pv.meaning)
      );

      const wrongMeanings = shuffle(candidateWrongMeanings).slice(0, 3);
      if (wrongMeanings.length < 3) continue;

      const options = shuffle([
        { text: correct.meaning, isCorrect: true },
        ...wrongMeanings.map(text => ({ text, isCorrect: false })),
      ]);

      generatedQuestions.push({
        id: correct.id,
        verb: correct.verb,
        correctMeaning: correct.meaning,
        example: correct.example || '',
        options,
        difficulty: correct.difficulty as DifficultyLevel,
      });
    }

    return generatedQuestions;
  }, [phrasalVerbs, unlockedPhrasalVerbs, level, selectedVerbIds, shuffle, uniqueStrings]);

  // Focus/blur handling
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      setIsPaused(false);

      return () => {
        isFocused.current = false;
        setIsPaused(true);

        if (nextQuestionTimeout.current) {
          clearTimeout(nextQuestionTimeout.current);
          nextQuestionTimeout.current = null;
        }
        if (comboDisplayTimeout.current) {
          clearTimeout(comboDisplayTimeout.current);
        }

        cardOpacity.stopAnimation();
        cardTranslateY.stopAnimation();
        cardScale.stopAnimation();
        comboScaleAnim.stopAnimation();
        screenFlashAnim.stopAnimation();
        screenShakeAnim.stopAnimation();
        optionAnims.forEach(anim => anim.stopAnimation());
      };
    }, [])
  );

  // Animate options on question change
  useEffect(() => {
    if (!isFocused.current) return;

    optionAnims.forEach(anim => anim.setValue(0));

    const animations = optionAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        delay: index * 40,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, [currentQuestionIndex]);

  // Generate initial questions
  useEffect(() => {
    if (hasGeneratedQuestions.current || !isFocused.current) return;

    const generatedQuestions = generateMoreQuestions();
    if (generatedQuestions.length === 0) return;

    setQuestions(generatedQuestions);
    hasGeneratedQuestions.current = true;
  }, [phrasalVerbs.length, unlockedPhrasalVerbs.length, questions.length]);

  // ♾️ ENDLESS MODE: Sorular azaldığında yenilerini ekle (Infinite Scroll mantığı)
  useEffect(() => {
    if (!isFocused.current || questions.length === 0) return;

    // Eğer kalan soru sayısı 3 veya daha az ise yeni sorular ekle
    if (questions.length - currentQuestionIndex <= 3) {
      // console.log('🔄 Generating more questions for endless mode...');
      const moreQuestions = generateMoreQuestions();
      if (moreQuestions.length > 0) {
        setQuestions(prev => [...prev, ...moreQuestions]);
      }
    }
  }, [currentQuestionIndex, questions.length, isFocused, generateMoreQuestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (nextQuestionTimeout.current) {
        clearTimeout(nextQuestionTimeout.current);
      }
      cardOpacity.stopAnimation();
      cardTranslateY.stopAnimation();
      cardScale.stopAnimation();
      comboScaleAnim.stopAnimation();
      screenFlashAnim.stopAnimation();
      screenShakeAnim.stopAnimation();
      optionAnims.forEach(anim => anim.stopAnimation());
    };
  }, []);

  const currentQuestion = questions[currentQuestionIndex];

  // 💡 Disabled options memo
  const disabledOptionSet = useMemo(() => new Set(disabledOptionIndexes), [disabledOptionIndexes]);

  // 💡 Hint handler
  const handleHint = useCallback(() => {
    if (showResult || !currentQuestion) return;
    if (disabledOptionIndexes.length > 0) {
      haptic.light();
      return;
    }

    const ok = useHintToken?.();
    if (!ok) {
      haptic.light();
      return;
    }

    const wrongIndexes = currentQuestion.options
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.isCorrect)
      .map(({ i }) => i);

    const shuffled = [...wrongIndexes].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 1); // Sadece 1 yanlış şık elenir
    setDisabledOptionIndexes(picked);
    haptic.selection();
  }, [showResult, currentQuestionIndex, disabledOptionIndexes.length, useHintToken, currentQuestion]);

  // Get combo color
  const getComboColor = useCallback(() => {
    if (combo >= 100) return '#FFD700';
    if (combo >= 50) return '#FF1493';
    if (combo >= 30) return '#00FFFF';
    if (combo >= 20) return '#9D00FF';
    if (combo >= 15) return '#FF00FF';
    if (combo >= 10) return '#FF0099';
    if (combo >= 7) return '#FF4444';
    if (combo >= 5) return '#FF8800';
    if (combo >= 3) return '#f59e0b';
    return '#f59e0b';
  }, [combo]);

  // 🎯 HANDLE ANSWER - MEGA DOPAMIN
  const handleAnswer = useCallback((index: number) => {
    const question = questions[currentQuestionIndex];
    if (isAnswering.current || showResult || !question) return;

    isAnswering.current = true;

    const selectedOption = question.options[index];
    const isCorrect = selectedOption?.isCorrect === true;

    setSelectedIndex(index);
    setShowResult(true);

    if (isCorrect) {
      // 💥 DELİRTİCİ HAPTIC + SES - QuizScreen ile AYNI!
      const newCombo = incrementCombo();
      haptic.correctAnswer(newCombo);
      sound.playStreak(newCombo);
      
      setCorrectCount(prev => prev + 1);
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo);
      }

      // 🎯 COMBO MILESTONES - Özel haptic + toast
      const milestones = {
        25: { text: 'Güzelll', duration: 2000, hapticKey: 'combo25' },
        50: { text: 'Fennna', duration: 3000, hapticKey: 'combo50' },
        75: { text: 'Noluyooo', duration: 4000, hapticKey: 'combo75' },
        100: { text: 'Oyyy', duration: 5000, hapticKey: 'combo100' },
        150: { text: 'İngilizce Hocasııı', duration: 6000, hapticKey: 'combo150' },
        200: { text: 'Yapıyosun bu işi:D', duration: 8000, hapticKey: 'combo200' },
        225: { text: 'Deliriyooo', duration: 9000, hapticKey: 'combo225' },
        250: { text: 'Efsaneeee', duration: 10000, hapticKey: 'combo250' },
        275: { text: 'İmkansııız', duration: 11000, hapticKey: 'combo275' },
        300: { text: 'Bune böyleeee', duration: 12000, hapticKey: 'combo300' },
      };

      // 300'den sonra her 25'te milestone (325, 350, 375, vs.)
      let milestone = milestones[newCombo as keyof typeof milestones];
      if (!milestone && newCombo > 300 && (newCombo - 200) % 25 === 0) {
        const durationSeconds = Math.min(8 + Math.floor((newCombo - 200) / 25), 15);
        milestone = {
          text: `${newCombo} COMBO! 🔥`,
          duration: durationSeconds * 1000,
          hapticKey: 'comboMega',
        };
      }

      if (milestone) {
        // Haptic feedback
        if (milestone.hapticKey === 'combo25') haptic.combo25?.();
        else if (milestone.hapticKey === 'combo50') haptic.combo50?.();
        else if (milestone.hapticKey === 'combo75') haptic.combo75?.();
        else if (milestone.hapticKey === 'combo100') haptic.combo100?.();
        else if (milestone.hapticKey === 'combo150') haptic.combo150?.();
        else if (milestone.hapticKey === 'combo200') haptic.combo200?.();
        else if (milestone.hapticKey === 'combo225') haptic.combo225?.();
        else if (milestone.hapticKey === 'combo250') haptic.combo250?.();
        else if (milestone.hapticKey === 'combo275') haptic.combo275?.();
        else if (milestone.hapticKey === 'combo300') haptic.combo300?.();
        else if (milestone.hapticKey === 'comboMega') haptic.comboMega?.(milestone.duration / 1000);
        
        // Milestone toast - PERFORMANS KONTROLÜ
        if (config.enableMilestoneToast) {
          const addMilestoneToast = useMilestoneToastStore.getState().addToast;
          addMilestoneToast({
            combo: newCombo,
            text: milestone.text,
            duration: milestone.duration,
          });
        }
      }

      // 💰 REWARD CALCULATION - ENHANCED COMBO MULTIPLIERS
      let comboMultiplier = 1;
      if (newCombo >= 100) comboMultiplier = 10;
      else if (newCombo >= 50) comboMultiplier = 7;
      else if (newCombo >= 30) comboMultiplier = 5.5;
      else if (newCombo >= 20) comboMultiplier = 4.5;
      else if (newCombo >= 15) comboMultiplier = 3.5;
      else if (newCombo >= 10) comboMultiplier = 3;
      else if (newCombo >= 7) comboMultiplier = 2.5;
      else if (newCombo >= 5) comboMultiplier = 2;
      else if (newCombo >= 3) comboMultiplier = 1.5;

      const diffMult = DIFFICULTY_MULTIPLIER[question.difficulty] || 1;
      const baseCoin = 15 * diffMult * comboMultiplier;
      const coinReward = Math.floor(baseCoin);
      const xpReward = Math.floor(coinReward * 2);

      addCoins?.(coinReward);
      setTotalCoinsEarned(prev => prev + coinReward);

      // Show reward toast - PERFORMANS KONTROLÜ
      if (newCombo >= 3 && config.enableRewardToast) {
        requestAnimationFrame(() => {
          showRewardToast('coin', coinReward);
        });
      }

      // Update store
      addQuizReward(xpReward);

      // 🎉 CONFETTI on big milestones - PERFORMANS KONTROLÜ
      if (config.celebrationIntensity > 0 && (newCombo === 10 || newCombo === 20 || newCombo === 30 || newCombo === 50 || newCombo === 100)) {
        setConfettiKey(k => k + 1);
        sound.playCombo?.(newCombo);
      } else if (newCombo >= 5 && newCombo % 5 === 0) {
        sound.playCombo?.(newCombo);
      }

      // Combo display - PERFORMANS AYARINA GÖRE
      if (config.enableComboToast && newCombo >= config.comboToastThreshold) {
        setShowComboDisplay(true);
        if (comboDisplayTimeout.current) clearTimeout(comboDisplayTimeout.current);
        comboDisplayTimeout.current = setTimeout(() => setShowComboDisplay(false), isSmallScreen ? 1500 : 2000);
      }

      // 🌋 SCREEN SHAKE + PERFORMANS KONTROLÜ
      if (newCombo >= 5 && config.enableScreenShake) {
        const baseIntensity = newCombo >= 20 ? 2 + Math.floor((newCombo - 20) / 10) : 1.5;
        const intensity = Math.min(12, baseIntensity + (newCombo % 10 === 0 ? 4 : 0));
        const shakeDuration = 40;
        const shakeCount = newCombo % 10 === 0 ? Math.min(8, 3 + Math.floor(newCombo / 10)) : 2;

        const shakeSequence: Animated.CompositeAnimation[] = [];
        for (let i = 0; i < shakeCount; i++) {
          shakeSequence.push(
            Animated.timing(screenShakeAnim, {
              toValue: intensity * (i % 2 === 0 ? 1 : -1),
              duration: shakeDuration,
              useNativeDriver: true,
            })
          );
        }
        shakeSequence.push(
          Animated.timing(screenShakeAnim, {
            toValue: 0,
            duration: shakeDuration,
            useNativeDriver: true,
          })
        );
        Animated.sequence(shakeSequence).start();
      }

      // 💥 COMBO SCALE animation
      if (newCombo === 10 || newCombo === 20 || newCombo === 30 || newCombo === 50) {
        Animated.spring(comboScaleAnim, {
          toValue: 1.15,
          friction: 10,
          tension: 180,
          useNativeDriver: true,
        }).start(() => {
          Animated.spring(comboScaleAnim, {
            toValue: 1,
            friction: 10,
            tension: 150,
            useNativeDriver: true,
          }).start();
        });
      }

      // 🌟 SCREEN FLASH + PERFORMANS KONTROLÜ
      if ((newCombo === 10 || newCombo === 20 || newCombo === 30 || newCombo === 50) && config.enableScreenFlash) {
        Animated.sequence([
          Animated.timing(screenFlashAnim, {
            toValue: 0.12,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(screenFlashAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Add to phrasal verb farm
      const pv = phrasalVerbs.find(p => p.id === question.id);
      if (pv) {
        updatePhrasalVerbProgress?.(pv.id, true);
        addPhrasalVerbToFarm?.({ ...pv, wasCorrect: true });
      }

    } else {
      // ❌ WRONG ANSWER
      sound.playWrong();
      haptic.shake();
      setWrongCount(prev => prev + 1);

      // 🛡️ COMBO SHIELD CHECK - Kalkan varsa combo kırılmaz, quiz devam eder!
      const hasShield = comboShields > 0;

      if (hasShield) {
        // Kalkan kullan - combo korundu!
        useComboShield();

        // 🛡️ Shield kullanıldı animasyonu - mavi flash + PERFORMANS KONTROLÜ
        if (config.enableScreenFlash) {
          Animated.sequence([
            Animated.timing(screenFlashAnim, {
              toValue: 0.15,
              duration: 50,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(screenFlashAnim, {
              toValue: 0,
              duration: 150,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start();
        }

        addWrongStat();

        const pv = phrasalVerbs.find(p => p.id === question.id);
        if (pv) {
          updatePhrasalVerbProgress?.(pv.id, false);
          addPhrasalVerbToFarm?.({ ...pv, wasCorrect: false });
        }

        // Shield ile quiz devam ediyor - sonraki soruya geç
        if (nextQuestionTimeout.current) {
          clearTimeout(nextQuestionTimeout.current);
        }
        nextQuestionTimeout.current = setTimeout(() => {
          cardOpacity.setValue(0);
          cardScale.setValue(1);
          cardTranslateY.setValue(0);

          sound.playNextQuestion?.();
          haptic.nextQuestion?.();

          const fadeInDuration = Math.max(80, 180 - (combo * 3));

          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setTimerKey(prev => prev + 1);
            setSelectedIndex(null);
            setShowResult(false);
            setDisabledOptionIndexes([]);
            isAnswering.current = false;

            Animated.timing(cardOpacity, {
              toValue: 1,
              duration: fadeInDuration,
              useNativeDriver: true,
            }).start();
          } else {
            // Generate more questions
            const newQuestions = generateMoreQuestions();
            if (newQuestions.length > 0) {
              setQuestions(newQuestions);
              setCurrentQuestionIndex(0);
              setTimerKey(prev => prev + 1);
              setSelectedIndex(null);
              setShowResult(false);
              setDisabledOptionIndexes([]);
              isAnswering.current = false;

              Animated.timing(cardOpacity, {
                toValue: 1,
                duration: fadeInDuration,
                useNativeDriver: true,
              }).start();
            } else {
              isAnswering.current = false;
              setQuizFinished(true);
            }
          }
        }, 200);
        return;
      }

      // 💔 COMBO BREAK - Shield yoksa
      resetCombo();

      Animated.sequence([
        Animated.spring(comboScaleAnim, {
          toValue: 0.7,
          friction: 7,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(comboScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();

      // Red flash + PERFORMANS KONTROLÜ
      if (config.enableScreenFlash) {
        Animated.sequence([
          Animated.timing(screenFlashAnim, {
            toValue: 0.12,
            duration: 50,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(screenFlashAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }

      addWrongStat();

      const pv = phrasalVerbs.find(p => p.id === question.id);
      if (pv) {
        updatePhrasalVerbProgress?.(pv.id, false);
        addPhrasalVerbToFarm?.({ ...pv, wasCorrect: false });
      }

      // ♾️ ENDLESS MODE: Yanlış yapınca quiz bitir
      if (nextQuestionTimeout.current) {
        clearTimeout(nextQuestionTimeout.current);
      }
      nextQuestionTimeout.current = setTimeout(() => {
        isAnswering.current = false;
        setQuizFinished(true);
      }, 800);
      return;
    }

    // Clear existing timeout
    if (nextQuestionTimeout.current) {
      clearTimeout(nextQuestionTimeout.current);
    }

    // 🚀 DYNAMIC TRANSITION - Combo arttıkça hızlan
    const dynamicDelay = Math.max(80, 200 - (combo * 4));

    nextQuestionTimeout.current = setTimeout(() => {
      cardOpacity.setValue(0);
      cardScale.setValue(1);
      cardTranslateY.setValue(0);

      sound.playNextQuestion?.();
      haptic.nextQuestion?.();

      const fadeInDuration = Math.max(80, 180 - (combo * 3));

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimerKey(prev => prev + 1);
        setSelectedIndex(null);
        setShowResult(false);
        setDisabledOptionIndexes([]);
        isAnswering.current = false;

        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: fadeInDuration,
          useNativeDriver: true,
        }).start();
      } else {
        // ♾️ ENDLESS MODE: Generate more questions
        const newQuestions = generateMoreQuestions();
        if (newQuestions.length > 0) {
          setQuestions(newQuestions);
          setCurrentQuestionIndex(0);
          setTimerKey(prev => prev + 1);
          setSelectedIndex(null);
          setShowResult(false);
          setDisabledOptionIndexes([]);
          isAnswering.current = false;

          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: fadeInDuration,
            useNativeDriver: true,
          }).start();
        } else {
          isAnswering.current = false;
          setQuizFinished(true);
        }
      }
    }, dynamicDelay);
  }, [currentQuestion, combo, showResult, currentQuestionIndex, questions.length, addCoins, incrementCombo, maxCombo, generateMoreQuestions, phrasalVerbs, updatePhrasalVerbProgress, addPhrasalVerbToFarm, resetCombo, comboShields, useComboShield]);

  // Stable option handlers
  const optionHandlers = useMemo(() => [
    () => handleAnswer(0),
    () => handleAnswer(1),
    () => handleAnswer(2),
    () => handleAnswer(3),
  ], [handleAnswer]);

  // Time up handler
  const handleTimeUp = useCallback(() => {
    if (showResult || !currentQuestion) return;
    setWrongCount(prev => prev + 1);
    
    // 🛡️ COMBO SHIELD CHECK - Kalkan varsa combo kırılmaz!
    const hasShield = comboShields > 0;
    
    if (hasShield) {
      // Kalkan kullan - combo korundu!
      useComboShield();
    } else {
      // Kalkan yok - combo sıfırla
      resetCombo();
    }
    
    setSelectedIndex(-1);
    setShowResult(true);

    sound.playWrong();
    haptic.shake();

    addWrongStat();

    if (nextQuestionTimeout.current) {
      clearTimeout(nextQuestionTimeout.current);
    }

    if (hasShield) {
      // Kalkan aktif - next question (quiz devam)
      nextQuestionTimeout.current = setTimeout(() => {
        setCurrentQuestionIndex((prev) => (prev + 1 < questions.length ? prev + 1 : 0));
        setSelectedIndex(null);
        setShowResult(false);
        isAnswering.current = false;
        setTimerKey((k) => k + 1);
      }, 600);
    } else {
      // ENDLESS MODE: Kalkan yoksa quiz bitsin
      nextQuestionTimeout.current = setTimeout(() => {
        isAnswering.current = false;
        setQuizFinished(true);
      }, 800);
    }
  }, [currentQuestion, showResult, resetCombo, comboShields, useComboShield, questions.length]);

  // Exit handler
  const isExiting = useRef(false);
  const handleExit = useCallback(() => {
    if (isExiting.current) return;
    isExiting.current = true;

    haptic.heavy();
    
    // 🔄 Combo'yu sıfırla (Phrasal Quiz çıkışında)
    resetCombo();

    // Phrasal Verb quiz'den çıktığında PhrasalVerbsMenu'ye git
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'PhrasalVerbsMenu' }],
      })
    );
  }, [navigation, resetCombo]);

  // Restart handler
  const handleRestart = useCallback(() => {
    haptic.heavy();
    sound.playTap?.();

    setQuizFinished(false);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSelectedIndex(null);
    setShowResult(false);
    setTimerKey(prev => prev + 1);
    setTotalCoinsEarned(0);
    setMaxCombo(currentCombo);

    cardOpacity.setValue(1);
    cardTranslateY.setValue(0);
    cardScale.setValue(1);
    comboScaleAnim.setValue(1);
    screenFlashAnim.setValue(0);

    hasGeneratedQuestions.current = false;
    setQuestions([]);
    isExiting.current = false;
  }, [currentCombo]);

  // 🏆 QUIZ FINISHED SCREEN
  if (quizFinished) {
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const isGreat = accuracy >= 80;
    const isGood = accuracy >= 60;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <MilestoneToastContainer />
        <ScrollView 
          contentContainerStyle={styles.resultsScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.resultsContainer}>
            {/* Trophy/Medal */}
            <Text style={styles.resultEmoji}>
              {isGreat ? '🏆' : isGood ? '🎯' : '📚'}
            </Text>

            {/* Title */}
            <Text style={styles.resultTitle}>
              {isGreat ? 'Mükemmel!' : isGood ? 'İyi İş!' : 'Devam Et!'}
            </Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{correctCount}</Text>
                <Text style={styles.statLabel}>Doğru ✓</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#ef4444' }]}>{wrongCount}</Text>
                <Text style={styles.statLabel}>Yanlış ✗</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{maxCombo}</Text>
                <Text style={styles.statLabel}>Combo 🔥</Text>
              </View>
            </View>

            {/* 💰 Coins + Accuracy Row */}
            <View style={styles.coinsAccuracyRow}>
              <View style={styles.coinsEarnedContainerCompact}>
                <Coins color="#FFD700" size={RS.labelFont + 2} fill="#FFD700" />
                <Text style={styles.coinsEarnedTextCompact}>+{totalCoinsEarned}</Text>
              </View>
              <View style={styles.accuracyContainerCompact}>
                <Text style={[styles.accuracyValueCompact, { color: isGreat ? '#22c55e' : isGood ? '#f59e0b' : '#ef4444' }]}>
                  %{accuracy}
                </Text>
              </View>
              <View style={styles.streakContainerCompact}>
                <Flame color="#f59e0b" size={RS.labelFont + 2} fill="#f59e0b" />
                <Text style={styles.streakTextCompact}>{bestStreak}</Text>
              </View>
            </View>

            {/* 🌱 Tarla Açıklama - Kompakt */}
            <View style={styles.farmExplanationContainer}>
              <Text style={styles.farmExplanationText}>
                🌱 Phrasal verb'ler tarlana ekildi! <Text style={{ color: '#22c55e' }}>✓ Meyve</Text> • <Text style={{ color: '#f59e0b' }}>✗ Tohum</Text>
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <Pressable style={styles.continueButton} onPress={handleRestart}>
                <Text style={styles.continueButtonText}>Tekrar Oyna</Text>
              </Pressable>
              <Pressable style={styles.goToFarmButton} onPress={() => {
                haptic.medium();
                navigation.navigate('Farm', { tab: 'phrasal' });
              }}>
                <Text style={styles.goToFarmButtonText}>🌾 Tarlana Git</Text>
              </Pressable>
            </View>
            <Pressable style={styles.exitButtonResult} onPress={handleExit}>
              <Text style={styles.exitButtonText}>Ana Menü</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>⏳</Text>
          <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <MilestoneToastContainer />

      {/* DOPAMINE BOOST COMPONENTS */}
      <ComboDisplay combo={combo} maxCombo={maxCombo} visible={showComboDisplay} />
      <CorrectCelebration trigger={confettiKey} />

      {/* SCREEN FLASH OVERLAY */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: combo > 0 ? getComboColor() : '#ef4444',
            opacity: screenFlashAnim,
            zIndex: 100,
          },
        ]}
      />

      {/* HEADER */}
      <View style={styles.header}>
        {/* Combo Badge */}
        {combo > 0 ? (
          <View
            style={[
              styles.comboBadge,
              combo >= 5 && styles.comboBadgeEpic,
              combo >= 7 && styles.comboBadgeOnFire,
              combo >= 10 && styles.comboBadgeLegendary,
              { borderColor: combo >= 3 ? getComboColor() : 'rgba(245, 158, 11, 0.4)' },
            ]}
          >
            {combo >= 7 ? (
              <Zap color={getComboColor()} size={RS.comboIconSize} fill={getComboColor()} />
            ) : combo >= 5 ? (
              <Star color={getComboColor()} size={RS.comboIconSize} fill={getComboColor()} />
            ) : (
              <Flame color={getComboColor()} size={RS.comboIconSize} fill={getComboColor()} />
            )}
            <Text style={[styles.comboText, { color: getComboColor() }]}>x{combo}</Text>
          </View>
        ) : (
          <View style={styles.comboPlaceholder} />
        )}

        {/* Timer Bar */}
        <View style={styles.timerWrapper}>
          <TimerBar
            key={timerKey}
            duration={TIMER_DURATION}
            onTimeUp={handleTimeUp}
            timerKey={timerKey}
            isPaused={showResult}
          />
        </View>

        {/* Level Badge + Hint + Shield + Exit */}
        <View style={styles.rightControls}>
          <View style={styles.levelBadge}>
            <Award color="#c4b5fd" size={14} />
            <Text style={styles.levelText}>{level}</Text>
          </View>

          {/* 🛡️ Combo Shield Göstergesi */}
          {comboShields > 0 && (
            <View style={styles.shieldIndicator}>
              <Text style={styles.shieldEmoji}>🛡️</Text>
              <Text style={styles.shieldText}>{comboShields}</Text>
            </View>
          )}

          {/* 💡 Hint Button */}
          <TouchableOpacity
            onPress={handleHint}
            disabled={showResult || hintTokens <= 0 || disabledOptionIndexes.length > 0}
            style={[
              styles.hintButton,
              (showResult || hintTokens <= 0 || disabledOptionIndexes.length > 0) && styles.hintButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.hintEmoji}>💡</Text>
            <Text style={styles.hintText}>{hintTokens}</Text>
          </TouchableOpacity>

          <Pressable onPress={handleExit} style={styles.exitButton}>
            <X color="#fff" size={RS.exitButtonSize * 0.6} />
          </Pressable>
        </View>
      </View>

      {/* CONTENT AREA */}
      <Animated.View
        style={[
          styles.contentArea,
          {
            transform: [{ translateX: screenShakeAnim }],
          },
        ]}
      >
        {/* QUESTION CARD */}
        <Animated.View
          style={[
            styles.questionArea,
            {
              opacity: cardOpacity,
              transform: [
                { translateY: cardTranslateY },
                { scale: cardScale },
              ],
            },
          ]}
        >
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>Phrasal Verb • Anlam</Text>
          </View>
          <Text style={[styles.questionText, { textShadowColor: getComboColor(), textShadowRadius: combo > 5 ? 15 : 0 }]}>
            {currentQuestion.verb}
          </Text>
          {!!currentQuestion.example && (
            <Text style={styles.exampleText}>"{currentQuestion.example}"</Text>
          )}
        </Animated.View>

        {/* OPTIONS */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const optionAnim = optionAnims[index];
            const isHintDisabled = disabledOptionSet.has(index);
            return (
              <OptionButton
                key={`${currentQuestionIndex}-${index}`}
                text={option.text}
                index={index}
                isSelected={selectedIndex === index}
                isCorrect={option.isCorrect}
                showResult={showResult}
                disabled={showResult || isHintDisabled}
                onPress={optionHandlers[index]}
                opacity={optionAnim}
                translateY={optionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })}
                enableJuicyButtons={config.enableJuicyButtons}
                enableGlow={config.enableOptionGlow}
              />
            );
          })}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingEmoji: {
    fontSize: 48,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: RS.headerPadding,
    paddingTop: isSmallScreen ? 8 : 12,
    paddingBottom: RS.headerPadding / 2,
    gap: RS.headerGap,
    zIndex: 1,
  },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: 'rgba(245, 158, 11, 0.9)',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  comboText: {
    fontSize: RS.comboFont + 3,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: '#f59e0b',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    letterSpacing: 0.5,
  },
  comboPlaceholder: {
    width: RS.exitButtonSize + 10,
  },
  comboBadgeEpic: {
    backgroundColor: 'rgba(255, 136, 0, 0.4)',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 136, 0, 0.95)',
    shadowColor: '#ff8800',
    shadowOpacity: 0.9,
  },
  comboBadgeOnFire: {
    backgroundColor: 'rgba(255, 68, 68, 0.45)',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 68, 68, 0.95)',
    shadowColor: '#ff4444',
    shadowOpacity: 1,
  },
  comboBadgeLegendary: {
    backgroundColor: 'rgba(255, 0, 255, 0.5)',
    borderWidth: 3,
    borderColor: 'rgba(255, 0, 255, 1)',
    shadowColor: '#ff00ff',
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  timerWrapper: {
    flex: 1,
  },
  timerBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  levelText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '800',
  },
  // 🛡️ Shield Indicator
  shieldIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  shieldEmoji: {
    fontSize: 14,
  },
  shieldText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  // 💡 Hint Button
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  hintButtonDisabled: {
    opacity: 0.4,
  },
  hintEmoji: {
    fontSize: 14,
  },
  hintText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  exitButton: {
    width: RS.exitButtonSize,
    height: RS.exitButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RS.exitButtonSize / 2,
  },
  // CONTENT
  contentArea: {
    flex: 1,
    zIndex: 0,
  },
  questionArea: {
    paddingTop: RS.questionPaddingV / 2,
    paddingBottom: RS.questionPaddingV / 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: RS.containerPaddingH + 8,
    gap: RS.optionGap + 4,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 180,
  },
  labelPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: RS.headerPadding * 1.2,
    paddingVertical: RS.headerPadding / 1.8,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1,
  },
  labelText: {
    color: '#c4b5fd',
    fontSize: RS.labelFont,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  questionText: {
    fontSize: RS.questionFont,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
    zIndex: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    maxWidth: '100%',
  },
  exampleText: {
    fontSize: RS.optionFont - 1,
    color: 'rgba(196, 181, 253, 0.8)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    paddingHorizontal: RS.containerPaddingH,
    paddingBottom: RS.containerPaddingH / 2,
    gap: RS.optionGap,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RS.optionPaddingH,
    paddingVertical: RS.optionPaddingV,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: RS.optionGap,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  optionText: {
    flex: 1,
    fontSize: RS.optionFont,
    fontWeight: '700',
    color: '#ffffff',
    zIndex: 1,
  },
  resultIconContainer: {
    width: RS.resultIconSize,
    height: RS.resultIconSize,
    borderRadius: RS.resultIconSize / 2,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // RESULTS SCREEN
  resultsScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: RS.containerPaddingH,
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: RS.containerPaddingH * 1.5,
    gap: RS.resultGap / 1.5,
  },
  resultEmoji: {
    fontSize: RS.resultEmoji,
  },
  resultTitle: {
    fontSize: RS.resultTitle,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: RS.statsGap,
  },
  statBox: {
    alignItems: 'center',
    gap: RS.resultGap / 3,
  },
  statNumber: {
    fontSize: RS.statNumber,
    fontWeight: '900',
    color: '#22c55e',
  },
  statLabel: {
    fontSize: RS.statLabel,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Kompakt coin/accuracy/streak satırı
  coinsAccuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: RS.headerGap * 1.5,
    width: '100%',
  },
  coinsEarnedContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: RS.containerPaddingH * 0.8,
    paddingVertical: RS.headerPadding / 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinsEarnedTextCompact: {
    fontSize: RS.labelFont + 2,
    fontWeight: '800',
    color: '#FFD700',
  },
  accuracyContainerCompact: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: RS.containerPaddingH * 0.8,
    paddingVertical: RS.headerPadding / 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  accuracyValueCompact: {
    fontSize: RS.labelFont + 2,
    fontWeight: '800',
  },
  streakContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: RS.containerPaddingH * 0.8,
    paddingVertical: RS.headerPadding / 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakTextCompact: {
    fontSize: RS.labelFont + 2,
    fontWeight: '800',
    color: '#f59e0b',
  },
  coinsEarnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: RS.headerGap,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: RS.containerPaddingH * 1.2,
    paddingVertical: RS.headerPadding / 1.5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    marginVertical: RS.resultGap / 4,
  },
  coinsEarnedText: {
    fontSize: RS.coinsFont,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  accuracyContainer: {
    alignItems: 'center',
    gap: RS.resultGap / 3,
    paddingVertical: RS.resultGap / 2,
    paddingHorizontal: RS.containerPaddingH * 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  accuracyLabel: {
    fontSize: RS.labelFont,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accuracyValue: {
    fontSize: RS.accuracyValue,
    fontWeight: '900',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: RS.headerGap / 2,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: RS.containerPaddingH,
    paddingVertical: RS.headerPadding / 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakText: {
    fontSize: RS.streakFont,
    fontWeight: '800',
    color: '#f59e0b',
  },
  farmExplanationContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingHorizontal: RS.containerPaddingH,
    paddingVertical: RS.headerPadding / 1.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    marginTop: RS.resultGap / 4,
    width: '100%',
  },
  farmExplanationText: {
    fontSize: RS.labelFont,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: RS.resultGap / 3,
    width: '100%',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: RS.containerPaddingH,
    paddingVertical: RS.headerPadding,
    borderRadius: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: RS.buttonFont,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  goToFarmButton: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: RS.containerPaddingH,
    paddingVertical: RS.headerPadding,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    alignItems: 'center',
  },
  goToFarmButtonText: {
    fontSize: RS.buttonFont,
    fontWeight: '800',
    color: '#22c55e',
    textAlign: 'center',
  },
  exitButtonResult: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: RS.containerPaddingH * 1.5,
    paddingVertical: RS.headerPadding,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: RS.resultGap / 4,
    width: '100%',
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: RS.buttonFont,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
