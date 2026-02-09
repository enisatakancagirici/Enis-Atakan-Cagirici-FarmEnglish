import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  InteractionManager,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Flame, X, Check, AlertCircle, Zap, Star, Coins } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { getBoostMultiplier, getPermanentQuizRewardMultiplier } from '../utils/storePerks';
import { showRewardToast } from '../components/RewardToast';
import { useMilestoneToastStore, MilestoneToastContainer } from '../components/MilestoneToast';
import { ComboDisplay } from '../components/ComboDisplay';
import { CorrectCelebration } from '../components/Confetti';
import { TutorialTooltip, QuizMascotTip } from '../components/TutorialManagerFixed';
import { usePerformanceStore } from '../store/performanceStore';
import type { WordModel } from '../models/types';
import { formatMeaningForQuiz } from '../utils/loadWords';
import { CEFR_TO_FRUIT, type CEFRLevel } from '../utils/fruitSystem';

// 🍎 CEFR → Meyve Emojisi Mapping
const CEFR_TO_FRUIT_EMOJI: Record<string, string> = {
  'A1': '🍌',
  'A2': '🍒',
  'B1': '🍓',
  'B2': '🍇',
  'C1': '🍎',
  'C2': '🍉',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 📱 RESPONSIVE SYSTEM - Her ekran boyutu için optimal değerler
const getScreenType = () => {
  if (SCREEN_HEIGHT < 700) return 'small';      // 4.7" iPhone SE
  if (SCREEN_HEIGHT < 850) return 'medium';     // Normal telefonlar
  if (SCREEN_HEIGHT < 1100) return 'large';     // Büyük telefonlar
  return 'tablet';                               // Tabletler
};

const SCREEN_TYPE = getScreenType();

// Responsive değerler
const RS = {
  // Font sizes
  questionFont: { small: 24, medium: 36, large: 42, tablet: 52 }[SCREEN_TYPE],
  optionFont: { small: 14, medium: 16, large: 17, tablet: 18 }[SCREEN_TYPE],
  labelFont: { small: 9, medium: 11, large: 12, tablet: 13 }[SCREEN_TYPE],
  comboFont: { small: 10, medium: 11, large: 12, tablet: 14 }[SCREEN_TYPE],

  // Paddings
  headerPadding: { small: 10, medium: 12, large: 16, tablet: 20 }[SCREEN_TYPE],
  questionPaddingV: { small: 20, medium: 30, large: 40, tablet: 50 }[SCREEN_TYPE],
  optionPaddingV: { small: 12, medium: 14, large: 16, tablet: 18 }[SCREEN_TYPE],
  optionPaddingH: { small: 14, medium: 16, large: 18, tablet: 22 }[SCREEN_TYPE],
  containerPaddingH: { small: 12, medium: 14, large: 16, tablet: 24 }[SCREEN_TYPE],

  // Gaps
  optionGap: { small: 8, medium: 10, large: 12, tablet: 14 }[SCREEN_TYPE],
  headerGap: { small: 8, medium: 10, large: 12, tablet: 16 }[SCREEN_TYPE],

  // Sizes
  exitButtonSize: { small: 28, medium: 32, large: 36, tablet: 40 }[SCREEN_TYPE],
  timerHeight: { small: 4, medium: 5, large: 6, tablet: 8 }[SCREEN_TYPE],
  comboIconSize: { small: 10, medium: 12, large: 14, tablet: 16 }[SCREEN_TYPE],
  resultIconSize: { small: 24, medium: 28, large: 32, tablet: 36 }[SCREEN_TYPE],

  // Result screen
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
const TIMER_DURATION = 10000; // 10 seconds
const NEXT_QUESTION_DELAY = 140; // 🎮 GAME FEEL - 120-150ms kuralı! Hızlı akış.

// Difficulty multipliers (like PhrasalVerbQuizScreen)
const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  A1: 1,
  A2: 1.2,
  B1: 1.5,
  B2: 2,
  C1: 3,
  C2: 5,
};

interface Option {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  word: WordModel;
  prompt: string;
  options: Option[];
}

// Shimmer removed for performance
const QuestionCardShimmer = () => null;

// OPTION BUTTON COMPONENT - OPTIMIZED WITH MEMO + PERFORMANS AYARLARI
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

  // Simple shake for wrong answer - OPTIMIZED + PERFORMANS KONTROLÜ
  useEffect(() => {
    if (showResult && isSelected && !isCorrect && enableJuicyButtons) {
      // Wrong - fast shake
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();
    } else if (showResult && isCorrect && enableJuicyButtons) {
      // Correct - MEGA PULSE 🔥
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.05, friction: 8, tension: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 9, tension: 180, useNativeDriver: true }),
      ]).start();

      // 🌟 GLOW single burst - PERFORMANS KONTROLÜ
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
    haptic.selection(); // Instant press feedback
    if (enableJuicyButtons) {
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        friction: 10,
        tension: 400, // Daha snappy!
        useNativeDriver: true,
      }).start();
    }
  }, [enableJuicyButtons]);

  const handlePressOut = useCallback(() => {
    if (enableJuicyButtons) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 350, // Daha hızlı geri dönüş
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

  const combinedScale = scaleAnim;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {/* Glow removed for performance */}

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
                { scale: combinedScale },
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

// TIMER BAR COMPONENT - NOW WITH PAUSE SUPPORT
const TimerBar: React.FC<{ duration: number; onTimeUp: () => void; timerKey: number; isPaused: boolean }> = memo(({ duration, onTimeUp, timerKey, isPaused }) => {
  const widthAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const remainingTime = useRef(duration);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Reset on new question
    widthAnim.setValue(1);
    remainingTime.current = duration;
    startTime.current = Date.now();
  }, [timerKey, duration]);

  useEffect(() => {
    if (isPaused) {
      // Stop animation and save remaining time
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      const elapsed = Date.now() - startTime.current;
      remainingTime.current = Math.max(0, remainingTime.current - elapsed);
      return;
    }

    // Start/resume animation
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

// MAIN QUIZ SCREEN COMPONENT
export const QuizScreen = () => {
  const navigation = useNavigation();

  // 🎮 PERFORMANS AYARLARI
  const config = usePerformanceStore((s) => s.config);

  // 🔧 Individual selectors - stable and no infinite loop
  const farm = useFarmStore((s) => s.farm);
  const pool = useFarmStore((s) => s.pool);
  const answerQuiz = useFarmStore((s) => s.answerQuiz);
  const addCoins = useFarmStore((s) => s.addCoins);
  const bestStreak = useFarmStore((s) => s.bestStreak);
  const hintTokens = useFarmStore((s) => s.hintTokens);
  const useHintToken = useFarmStore((s) => s.useHintToken);
  const comboShields = useFarmStore((s) => s.comboShields);
  const useComboShield = useFarmStore((s) => s.useComboShield);
  const activeBoosts = useFarmStore((s) => s.activeBoosts);
  const ownedItems = useFarmStore((s) => s.ownedItems);
  
  // 🎓 TUTORIAL STATE
  const tutorialStep = useFarmStore((s) => s.tutorialStep);
  const setTutorialStep = useFarmStore((s) => s.setTutorialStep);
  const setTutorialFirstWrongWord = useFarmStore((s) => s.setTutorialFirstWrongWord);
  const totalWrong = useFarmStore((s) => s.totalWrong);

  // 🔥 Persisted combo from store - Regular Quiz uses currentQuizCombo
  const currentCombo = useFarmStore((s) => s.currentQuizCombo);
  const incrementCombo = useFarmStore((s) => s.incrementQuizCombo);
  const resetCombo = useFarmStore((s) => s.resetQuizCombo);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [timerKey, setTimerKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // 🔧 Pause state for screen focus
  const [tutorialTooltipMessage, setTutorialTooltipMessage] = useState<string | null>(null); // 🎓 Tutorial teşvik mesajları

  // 💡 Hint state (disables 1 wrong option)
  const [disabledOptionIndexes, setDisabledOptionIndexes] = useState<number[]>([]);

  // 🔥 Use store combo for persistence + local maxCombo for session tracking
  const combo = currentCombo; // Alias for easier use
  const [maxCombo, setMaxCombo] = useState(currentCombo); // Start from persisted value
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0); // 💰 Total coins this session

  // 🎉 Dopamine boost components
  const [confettiKey, setConfettiKey] = useState(0);
  const [showComboDisplay, setShowComboDisplay] = useState(false);

  // 🍎 APPLE-STYLE TRANSITION ANIMATIONS - useRef to prevent recreation
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const optionAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Combo animations
  const comboScaleAnim = useRef(new Animated.Value(1)).current;
  const comboGlowAnim = useRef(new Animated.Value(0)).current;
  const screenFlashAnim = useRef(new Animated.Value(0)).current;
  const screenShakeAnim = useRef(new Animated.Value(0)).current; // 🌋 MEGA SHAKE!
  const nextQuestionTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasGeneratedQuestions = useRef(false);
  const isAnswering = useRef(false);

  //  PAUSE EVERYTHING WHEN SCREEN LOSES FOCUS (fixes background running issue)
  const isFocused = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // Screen focused - resume everything
      isFocused.current = true;
      setIsPaused(false);

      return () => {
        // Screen blurred - STOP EVERYTHING!
        isFocused.current = false;
        setIsPaused(true);

        // Clear timeouts
        if (nextQuestionTimeout.current) {
          clearTimeout(nextQuestionTimeout.current);
          nextQuestionTimeout.current = null;
        }

        // Stop all animations
        cardOpacity.stopAnimation();
        cardTranslateY.stopAnimation();
        cardScale.stopAnimation();
        comboScaleAnim.stopAnimation();
        comboGlowAnim.stopAnimation();
        screenFlashAnim.stopAnimation();
        screenShakeAnim.stopAnimation();
        optionAnims.forEach(anim => anim.stopAnimation());
      };
    }, [])
  );

  // 🍎 Animate options entrance on question change - ONLY when focused!
  useEffect(() => {
    if (!isFocused.current) return;

    // Reset and animate options with stagger
    optionAnims.forEach((anim) => anim.setValue(0));

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

  // 🧹 Full cleanup on unmount - prevents lag on 2nd quiz
  useEffect(() => {
    return () => {
      if (nextQuestionTimeout.current) {
        clearTimeout(nextQuestionTimeout.current);
      }
      // Stop all animations
      cardOpacity.stopAnimation();
      cardTranslateY.stopAnimation();
      cardScale.stopAnimation();
      comboScaleAnim.stopAnimation();
      comboGlowAnim.stopAnimation();
      screenFlashAnim.stopAnimation();
      screenShakeAnim.stopAnimation();
      optionAnims.forEach(anim => anim.stopAnimation());
    };
  }, []);

  // 📊 Get total questions answered (persisted in store)
  const totalQuizzesAnswered = useFarmStore((s) => s.totalQuizzes);
  
  // 🆕 BEGINNER MODE: İlk 50 soru için sadece A1 (çok kolay) kelimeler
  const BEGINNER_THRESHOLD = 50;
  const isBeginnerMode = totalQuizzesAnswered < BEGINNER_THRESHOLD;

  // Generate questions - ONLY when focused! - ♾️ ENDLESS MODE: Generate more questions dynamically!
  const generateMoreQuestions = useCallback(() => {
    const allWords = [...farm, ...pool];
    if (allWords.length === 0) return [];

    // 🆕 BEGINNER MODE: İlk 50 soru için sadece A1 kelimeler
    // A1 = En kolay kelimeler (yes, no, baby, hello, good, bad vb.)
    let wordPool = allWords;
    
    if (isBeginnerMode) {
      const a1Words = allWords.filter(w => w.difficulty === 'A1');
      // A1 kelime yoksa A2'ye de bak, yine yoksa tümünü kullan
      if (a1Words.length >= 10) {
        wordPool = a1Words;
      } else {
        const easyWords = allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2');
        if (easyWords.length >= 10) {
          wordPool = easyWords;
        }
      }
    }

    const generatedQuestions: QuizQuestion[] = [];
    const shuffled = [...wordPool].sort(() => Math.random() - 0.5);

    // Generate 10 questions at a time for endless mode
    for (let i = 0; i < Math.min(10, shuffled.length); i++) {
      const word = shuffled[i];
      // ";" ile ayrılmış anlamları ", " ile göster
      const correctAnswer = formatMeaningForQuiz(word.meaning);
      
      // 🆕 BEGINNER MODE: Wrong options da aynı havuzdan gelsin (benzer zorluk)
      const wrongOptions = wordPool
        .filter((w) => w.id !== word.id && formatMeaningForQuiz(w.meaning) !== correctAnswer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => formatMeaningForQuiz(w.meaning));

      const options = [
        { text: correctAnswer, isCorrect: true },
        ...wrongOptions.map((text) => ({ text, isCorrect: false })),
      ].sort(() => Math.random() - 0.5);

      generatedQuestions.push({
        word,
        prompt: `"${word.text}" kelimesinin anlamı nedir?`,
        options,
      });
    }

    return generatedQuestions;
  }, [farm, pool, isBeginnerMode]);

  useEffect(() => {
    if (hasGeneratedQuestions.current || !isFocused.current) return;

    const generatedQuestions = generateMoreQuestions();
    if (generatedQuestions.length === 0) return;

    setQuestions(generatedQuestions);
    hasGeneratedQuestions.current = true;
    
    // 🎯 Quiz başlangıç sesi
    sound.playQuizStart();
  }, [farm.length, pool.length, questions.length]); // questions.length trigger'ı eklendi

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

  const currentQuestion = questions[currentQuestionIndex];

  // Reset hint when question changes
  useEffect(() => {
    setDisabledOptionIndexes([]);
  }, [currentQuestionIndex]);

  const disabledOptionSet = useMemo(() => new Set(disabledOptionIndexes), [disabledOptionIndexes]);

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
  }, [showResult, currentQuestionIndex, disabledOptionIndexes.length, useHintToken]);

  // 🔧 OPTIMIZED: Memoized handler to prevent child re-renders
  const handleAnswer = useCallback((index: number) => {
    const question = questions[currentQuestionIndex];
    if (isAnswering.current || showResult || !question) {
      return;
    }

    isAnswering.current = true;

    const selectedOption = question.options[index];
    const isCorrect = selectedOption?.isCorrect === true;

    setSelectedIndex(index);
    setShowResult(true);

    if (isCorrect) {
      // 💥 COMBO-BASED HAPTIC - MiniQuiz gibi dehşet!
      haptic.correctAnswer(combo + 1);

      // 🔊 SOUND
      sound.playStreak(combo + 1);
      setCorrectCount((prev) => prev + 1);
      const newCombo = incrementCombo();
      if (newCombo > maxCombo) {
        setMaxCombo(newCombo);
      }
      
      // 🎓 TUTORIAL: Doğru cevap - artık toast gösterme
      // (Daha az kalabalık UI için kaldırıldı)
      
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

      // 200'den sonra her 25'te milestone (325, 350, 375, vs.)
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

      //  Calculate rewards - ENHANCED COMBO MULTIPLIERS
      let comboMultiplier = 1;
      if (newCombo >= 100) comboMultiplier = 10;      // 🌟 LEGENDARY
      else if (newCombo >= 50) comboMultiplier = 7;   // 👑 ROYAL
      else if (newCombo >= 30) comboMultiplier = 5.5; // ⚡ UNSTOPPABLE
      else if (newCombo >= 20) comboMultiplier = 4.5; // 💎 MASTER
      else if (newCombo >= 15) comboMultiplier = 3.5; // 🔥 EPIC
      else if (newCombo >= 10) comboMultiplier = 3;   // 💥 MEGA
      else if (newCombo >= 7) comboMultiplier = 2.5;  // ⭐ SUPER
      else if (newCombo >= 5) comboMultiplier = 2;    // 🎯 GREAT
      else if (newCombo >= 3) comboMultiplier = 1.5;  // ✨ GOOD

      const difficulty = currentQuestion.word.difficulty || 'B1';
      const diffMult = DIFFICULTY_MULTIPLIER[difficulty] || 1;
      const coinBoostMult = getBoostMultiplier(activeBoosts, 'coin');
      const xpBoostMult = getBoostMultiplier(activeBoosts, 'xp');
      const coinPermMult = getPermanentQuizRewardMultiplier(ownedItems, 'coin');
      const xpPermMult = getPermanentQuizRewardMultiplier(ownedItems, 'xp');

      const baseCoin = 10 * diffMult * comboMultiplier;
      const baseXp = baseCoin * 2;
      const coinReward = Math.floor(baseCoin * coinBoostMult * coinPermMult);
      const xpReward = Math.floor(baseXp * xpBoostMult * xpPermMult);

      // Add coins to store
      addCoins?.(coinReward);
      setTotalCoinsEarned(prev => prev + coinReward);

      // 🎉 Show reward toasts - MINIMAL & OPTIMIZED + PERFORMANS KONTROLÜ
      // ⚡ Coin toast sadece 3+ combo'da göster (performans için)
      // Coin her zaman kazanılır ama toast spam olmasın
      if (newCombo >= 3 && config.enableRewardToast) {
        requestAnimationFrame(() => {
          showRewardToast('coin', coinReward);
        });
      }
      
      // 🔥 Combo toast - PERFORMANS AYARINA GÖRE GÖSTER
      // comboToastThreshold: LOW=999(hiç), MEDIUM=10, HIGH=5, ULTRA/PERFECT=2
      if (config.enableComboToast && newCombo >= config.comboToastThreshold && !milestone) {
        requestAnimationFrame(() => {
          showRewardToast('combo', newCombo);
        });
      }

      // Update XP and stats in store
      useFarmStore.setState(state => ({
        xp: state.xp + xpReward,
        totalCorrect: state.totalCorrect + 1,
        totalQuizzes: state.totalQuizzes + 1,
      }));

      // 🔥 CONFETTI - BÜYÜK MİLESTONE'LARDA + PERFORMANS KONTROLÜ
      if (config.celebrationIntensity > 0 && (newCombo === 10 || newCombo === 20 || newCombo === 30 || newCombo === 50 || newCombo === 100 || newCombo === 150 || newCombo === 200)) {
        requestAnimationFrame(() => {
          setConfettiKey(k => k + 1);
          sound.playCombo(newCombo);
        });
      } else if (newCombo >= 5 && newCombo % 5 === 0) {
        requestAnimationFrame(() => {
          sound.playCombo(newCombo);
        });
      }

      // Combo display göster - PERFORMANS AYARINA GÖRE
      if (config.enableComboToast && newCombo >= config.comboToastThreshold) {
        setShowComboDisplay(true);
        // Daha uzun süre görünsün - takılma oluyor çünkü animasyon henüz bitmeden kayboluyordu
        setTimeout(() => setShowComboDisplay(false), isSmallScreen ? 2200 : 2500);
      }

      // 🎉 MILESTONE HAPTICS - 🌋 MEGA DOPAMIN ESCALATION!
      if (newCombo === 200) {
        // 👨‍🏫 İngilizce Hocasıııı - 5 saniye mega vibration
        haptic.megaVibration(5);
      } else if (newCombo === 150) {
        // 🌋 fennnna - 5 saniye mega vibration
        haptic.megaVibration(5);
      } else if (newCombo === 100) {
        // 💥 NOLUYA YAAA - 4 saniye mega vibration
        haptic.megaVibration(4);
      } else if (newCombo === 50) {
        // 🔥 Yok artıkk - 2.5 saniye ağır titreşim
        haptic.combo50();
      } else if (newCombo === 40) {
        haptic.masterCelebration();
      } else if (newCombo === 30) {
        haptic.epicHarvestSuccess();
      } else if (newCombo === 25) {
        // 🌟 25 combo - 2.5 saniye ağır titreşim
        haptic.combo25();
      } else if (newCombo === 20) {
        haptic.celebration();
      } else if (newCombo === 10) {
        haptic.progressMilestone();
      }

      // 🌋 SCREEN SHAKE - Her combo'da hafif, 10'un katlarında DAHA GÜÇLÜ! + PERFORMANS KONTROLÜ
      if (newCombo >= 5 && config.enableScreenShake) {
        requestAnimationFrame(() => {
          // Her 5+ combo'da hafif shake
          const baseIntensity = newCombo >= 20 ? 2 + Math.floor((newCombo - 20) / 10) : 1.5;
          const intensity = Math.min(12, baseIntensity + (newCombo % 10 === 0 ? 4 : 0)); // 10'un katlarında +4
          const shakeDuration = 40;
          const shakeCount = newCombo % 10 === 0 ? Math.min(8, 3 + Math.floor(newCombo / 10)) : 2;

          const shakeSequence = [];
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
        });
      }

      // 💥 COMBO SCALE - SADECE BÜYÜK MİLESTONE'LARDA (FPS optimize)
      if (newCombo === 10 || newCombo === 20 || newCombo === 30 || newCombo === 50) {
        requestAnimationFrame(() => {
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
        });
      }

      // 🌟 SCREEN FLASH - SADECE BÜYÜK MİLESTONE'LARDA (FPS optimize) + PERFORMANS KONTROLÜ
      if ((newCombo === 10 || newCombo === 20 || newCombo === 30 || newCombo === 50) && config.enableScreenFlash) {
        requestAnimationFrame(() => {
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
        });
      }

      answerQuiz(currentQuestion.word.id, true);
      useFarmStore.getState().updateQuestProgress('COMPLETE_QUIZ', 1);
      
      // 🍎 CEFR Toast kaldırıldı - performans için
    } else {
      // 🔊 WRONG SOUND + POWERFUL HAPTIC
      sound.playWrong();
      haptic.shake(); // Shake pattern!
      setWrongCount((prev) => prev + 1);

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

        answerQuiz(currentQuestion.word.id, false);
        useFarmStore.getState().updateQuestProgress('COMPLETE_QUIZ', 1);

        // Shield ile quiz devam ediyor - sonraki soruya geç
        if (nextQuestionTimeout.current) {
          clearTimeout(nextQuestionTimeout.current);
        }
        nextQuestionTimeout.current = setTimeout(() => {
          // Instant state reset
          cardOpacity.setValue(0);
          cardScale.setValue(1);
          cardTranslateY.setValue(0);

          sound.playNextQuestion();
          haptic.nextQuestion();

          setCurrentQuestionIndex((prev) => prev + 1);
          setSelectedIndex(null);
          setShowResult(false);
          setDisabledOptionIndexes([]);
          isAnswering.current = false;
          setTimerKey((k) => k + 1);

          // Kart giriş animasyonu
          Animated.parallel([
            Animated.timing(cardOpacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.spring(cardScale, {
              toValue: 1,
              friction: 10,
              tension: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }, 600);
        return;
      }

      // 💔 COMBO BREAK - Kalkan yok, combo kırılıyor
      resetCombo();
      
      // 🎓 TUTORIAL: Yanlış cevap - tarlaya kırmızı olarak ekildi
      if (tutorialStep === 'STEP_3_FIRST_QUIZ') {
        // İlk yanlış kelimeyi kaydet (çiftlikte highlight için)
        if (!useFarmStore.getState().tutorialFirstWrongWord) {
          setTutorialFirstWrongWord({
            id: currentQuestion.word.id,
            text: currentQuestion.word.text,
            meaning: currentQuestion.word.meaning,
          });
        }
        
        // 🎓 TUTORIAL: Yanlış cevap - artık toast gösterme
        // NOT: STEP_4'e geçiş quiz bitince yapılacak (quizFinished effect'te)
      }

      // 💔 COMBO BREAK - Slower shrink
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

      // Red flash - slower + PERFORMANS KONTROLÜ
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

      answerQuiz(currentQuestion.word.id, false);
      useFarmStore.getState().updateQuestProgress('COMPLETE_QUIZ', 1);
      
      // 🌱 Toast kaldırıldı - performans için

      // 🛡️ COMBO SHIELD CHECK - Kalkan varsa quiz devam ediyor!
      const hasWrongAnswerShield = comboShields > 0;
      
      if (hasWrongAnswerShield) {
        // Kalkan kullan - quiz devam et!
        useComboShield();
        
        // 🛡️ Shield flash + PERFORMANS KONTROLÜ
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

        // Kalkan ile devam - next question
        if (nextQuestionTimeout.current) {
          clearTimeout(nextQuestionTimeout.current);
        }
        nextQuestionTimeout.current = setTimeout(() => {
          cardOpacity.setValue(0);
          cardScale.setValue(1);
          cardTranslateY.setValue(0);

          sound.playNextQuestion();
          haptic.nextQuestion();

          setCurrentQuestionIndex((prev) => prev + 1);
          setSelectedIndex(null);
          setShowResult(false);
          setDisabledOptionIndexes([]);
          isAnswering.current = false;
          setTimerKey((k) => k + 1);

          Animated.parallel([
            Animated.timing(cardOpacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.spring(cardScale, {
              toValue: 1,
              friction: 10,
              tension: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }, 600);
        return;
      }

      // ♾️ ENDLESS MODE: Yanlış yapınca (kalkan yoksa) direkt quiz bitir!
      if (nextQuestionTimeout.current) {
        clearTimeout(nextQuestionTimeout.current);
      }
      nextQuestionTimeout.current = setTimeout(() => {
        isAnswering.current = false;
        setQuizFinished(true);
      }, 800); // Yanlış cevabı göster, sonra bitir
      return;
    }

    // Clear any existing timeout
    if (nextQuestionTimeout.current) {
      clearTimeout(nextQuestionTimeout.current);
    }

    // 🚀 DİNAMİK GEÇİŞ - Combo arttıkça HIZLAN!
    // Başlangıç: 200ms, Combo 10: 150ms, Combo 20: 120ms, Combo 30+: 100ms
    const dynamicDelay = Math.max(80, 200 - (combo * 4));

    nextQuestionTimeout.current = setTimeout(() => {
      // Instant state reset - no animation on fade out
      cardOpacity.setValue(0);
      cardScale.setValue(1);
      cardTranslateY.setValue(0);

      sound.playNextQuestion();
      haptic.nextQuestion();

      // Fade in süresi de combo'ya göre azalsın
      const fadeInDuration = Math.max(80, 180 - (combo * 3));

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setTimerKey((prev) => prev + 1);
        setSelectedIndex(null);
        setShowResult(false);
        isAnswering.current = false;

        // Dinamik opacity fade in
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: fadeInDuration,
          useNativeDriver: true,
        }).start();
      } else {
        // ♾️ ENDLESS MODE: Sorular bitince yeni sorular üret!
        const newQuestions = generateMoreQuestions();
        if (newQuestions.length > 0) {
          setQuestions(newQuestions);
          setCurrentQuestionIndex(0);
          setTimerKey((prev) => prev + 1);
          setSelectedIndex(null);
          setShowResult(false);
          isAnswering.current = false;

          // Dinamik opacity fade in
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
  }, [
    currentQuestion?.word.id, // Sadece word ID'yi dependency yap, tüm obje yerine
    combo,
    showResult,
    currentQuestionIndex,
    questions.length,
    addCoins,
    answerQuiz,
    incrementCombo,
    maxCombo,
    generateMoreQuestions,
    resetCombo,
    activeBoosts,
    ownedItems,
    tutorialStep,
  ]);

  // 🔧 OPTIMIZED: Stable callbacks for OptionButton to prevent re-renders
  const handleOption0 = useCallback(() => handleAnswer(0), [handleAnswer]);
  const handleOption1 = useCallback(() => handleAnswer(1), [handleAnswer]);
  const handleOption2 = useCallback(() => handleAnswer(2), [handleAnswer]);
  const handleOption3 = useCallback(() => handleAnswer(3), [handleAnswer]);
  
  const optionHandlers = useMemo(() => [
    handleOption0,
    handleOption1,
    handleOption2,
    handleOption3,
  ], [handleOption0, handleOption1, handleOption2, handleOption3]);

  const handleTimeUp = useCallback(() => {
    if (showResult || !currentQuestion) return;
    setWrongCount((prev) => prev + 1);
    
    // 🛡️ COMBO SHIELD CHECK - Kalkan varsa combo kırılmaz!
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
    } else {
      // Kalkan yok - combo sıfırla
      resetCombo();
    }
    
    setSelectedIndex(-1);
    setShowResult(true);

    // Güçlü wrong feedback
    sound.playWrong();
    haptic.shake(); // Shake pattern!
    answerQuiz(currentQuestion.word.id, false);
    useFarmStore.getState().updateQuestProgress('COMPLETE_QUIZ', 1);
    
    // 🎓 TUTORIAL: Süre doldu - Kırmızı tohum ekildi
    if (tutorialStep === 'STEP_3_FIRST_QUIZ') {
      // İlk yanlış kelimeyi kaydet
      if (!useFarmStore.getState().tutorialFirstWrongWord) {
        setTutorialFirstWrongWord({
          id: currentQuestion.word.id,
          text: currentQuestion.word.text,
          meaning: currentQuestion.word.meaning,
        });
      }
      
      // 🔴 KIRMIZI TOHUM EKİLDİ BİLDİRİMİ (süre dolduğunda)
      setTimeout(() => {
        showRewardToast('level', 1, `🔴 Süre doldu! "${currentQuestion.word.text}" tarlana ekildi! (Kırmızı)`);
      }, 300);
      // NOT: STEP_4'e geçiş quiz bitince yapılacak
    }

    // Timeout sonrası - shield varsa devam, yoksa bitir
    if (nextQuestionTimeout.current) {
      clearTimeout(nextQuestionTimeout.current);
    }

    if (hasShield) {
      // Kalkan aktif - next question (quiz devam)
      nextQuestionTimeout.current = setTimeout(() => {
        cardOpacity.setValue(0);
        cardScale.setValue(1);
        cardTranslateY.setValue(0);

        sound.playNextQuestion();
        haptic.nextQuestion();

        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedIndex(null);
        setShowResult(false);
        setDisabledOptionIndexes([]);
        isAnswering.current = false;
        setTimerKey((k) => k + 1);

        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 10,
            tension: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600);
    } else {
      // ♾️ ENDLESS MODE: Kalkan yoksa quiz bitir
      nextQuestionTimeout.current = setTimeout(() => {
        isAnswering.current = false;
        setQuizFinished(true);
      }, 800);
    }
  }, [currentQuestion, showResult, answerQuiz, resetCombo, tutorialStep, setTutorialFirstWrongWord, setTutorialStep, comboShields, useComboShield, screenFlashAnim, cardOpacity, cardScale]);

  // 🔒 Prevent double-tap exit
  const isExiting = useRef(false);

  const handleExit = useCallback(() => {
    // 🎓 Tutorial aktifken çıkışı engelle
    if (tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED') {
      haptic.light();
      return;
    }
    
    if (isExiting.current) return; // ⚠️ Prevent double-tap
    isExiting.current = true;

    haptic.heavy(); // 🔥 MEGA HAPTIC
    
    // 🔄 Combo'yu sıfırla (Quiz çıkışında)
    resetCombo();

    // 🔧 Stack'i temizle ve Home'a git (arka planda quiz çalışmasın)
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  }, [navigation, resetCombo, tutorialStep]);

  // 🏆 QUIZ FINISHED SCREEN - ♾️ ENDLESS MODE: Cevaplanan soru sayısına göre accuracy
  // 🎓 TUTORIAL: Quiz bittiğinde STEP_4'e geç (ilk yanlışta değil, quiz bitince)
  useEffect(() => {
    if (quizFinished && tutorialStep === 'STEP_3_FIRST_QUIZ') {
      // Quiz bitti - Tutorial'ı ilerlet
      setTimeout(() => {
        setTutorialStep('STEP_4_HOME_UNLOCK');
      }, 500);
    }
  }, [quizFinished, tutorialStep, setTutorialStep]);

  if (quizFinished) {
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const isGreat = accuracy >= 80;
    const isGood = accuracy >= 60;

    return (
      <SafeAreaView style={styles.container}>
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
              {isGreat ? 'Mükemmel!' : isGood ? 'İyi İş!' : 'Çalışmaya Devam!'}
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
                🌱 Kelimeler tarlana ekildi! <Text style={{ color: '#22c55e' }}>✓ Meyve</Text> • <Text style={{ color: '#f59e0b' }}>✗ Tohum</Text>
              </Text>
            </View>

            {/* Buttons Row */}
            <View style={styles.finishButtonsRow}>
              {/* Continue Button - INSTANT RESTART */}
              <Pressable
                style={[styles.continueButton, tutorialStep !== 'COMPLETED' && styles.buttonDisabled]}
                onPress={() => {
                  // Tutorial sırasında kilitle
                  if (tutorialStep !== 'COMPLETED') return;
                  
                  // Instant haptic feedback
                  haptic.heavy();
                  sound.playTap();

                  // Reset state for new quiz
                  setQuizFinished(false);
                  setCurrentQuestionIndex(0);
                  setCorrectCount(0);
                  setWrongCount(0);
                  setSelectedIndex(null);
                  setShowResult(false);
                  setTimerKey(prev => prev + 1);
                  setTotalCoinsEarned(0);
                  setMaxCombo(currentCombo);

                  // Reset animations
                  cardOpacity.setValue(1);
                  cardTranslateY.setValue(0);
                  cardScale.setValue(1);
                  comboScaleAnim.setValue(1);
                  comboGlowAnim.setValue(0);
                  screenFlashAnim.setValue(0);

                  // 🔥 YENİ SORULAR OLUŞTUR - Flag'i reset et!
                  hasGeneratedQuestions.current = false;
                  setQuestions([]); // Boşalt ki useEffect tetiklensin
                }}
              >
                <Text style={[styles.continueButtonText, tutorialStep !== 'COMPLETED' && styles.buttonTextDisabled]}>Devam Et</Text>
              </Pressable>

              {/* 🌾 Tarlana Git */}
              <Pressable
                style={[styles.goToFarmButton, tutorialStep !== 'COMPLETED' && styles.buttonDisabled]}
                onPress={() => {
                  // Tutorial sırasında kilitle
                  if (tutorialStep !== 'COMPLETED') return;
                  
                  haptic.medium();
                  sound.playTap();
                  navigation.navigate('Farm' as never);
                }}
              >
                <Text style={[styles.goToFarmButtonText, tutorialStep !== 'COMPLETED' && styles.buttonTextDisabled]}>🌾 Tarlana Git</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Sorular yükleniyor...</Text>
      </View>
    );
  }

  // Get combo color based on level - ENHANCED TIERS
  const getComboColor = () => {
    if (combo >= 100) return '#FFD700'; // 🌟 LEGENDARY GOLD
    if (combo >= 50) return '#FF1493';  // 👑 ROYAL PINK
    if (combo >= 30) return '#00FFFF';  // ⚡ UNSTOPPABLE CYAN
    if (combo >= 20) return '#9D00FF';  // 💎 MASTER VIOLET
    if (combo >= 15) return '#FF00FF';  // 🔥 EPIC MAGENTA
    if (combo >= 10) return '#FF0099';  // 💥 MEGA PINK
    if (combo >= 7) return '#FF4444';   // ⭐ SUPER RED
    if (combo >= 5) return '#FF8800';   // 🎯 GREAT ORANGE
    if (combo >= 3) return '#f59e0b';   // ✨ GOOD GOLDEN
    return '#f59e0b'; // DEFAULT
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 🎉 DOPAMINE BOOST COMPONENTS */}
      <ComboDisplay combo={combo} maxCombo={maxCombo} visible={showComboDisplay} />
      <CorrectCelebration trigger={confettiKey} />
      <MilestoneToastContainer />

      {/* 🌟 SCREEN FLASH OVERLAY */}
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

      {/* ===== FIXED HEADER ===== */}
      <View style={styles.header}>
        {/* 🔥 Combo Badge - Sol tarafta kompakt, SCALE ANİMASYONU YOK */}
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

        {/* Timer Bar - Ortada */}
        <View style={styles.timerWrapper}>
          <TimerBar
            key={timerKey}
            duration={TIMER_DURATION}
            onTimeUp={handleTimeUp}
            timerKey={timerKey}
            isPaused={showResult || disabledOptionIndexes.length > 0}
          />
        </View>

        {/* 🗡️ MODE TOGGLE + Exit Button - Sağda */}
        <View style={styles.rightControls}>
          {/* 🛡️ Combo Shield Göstergesi */}
          {comboShields > 0 && (
            <View style={styles.shieldIndicator}>
              <Text style={styles.shieldEmoji}>🛡️</Text>
              <Text style={styles.shieldText}>{comboShields}</Text>
            </View>
          )}

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

          <Pressable 
            onPress={handleExit} 
            style={[
              styles.exitButton,
              (tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED') && styles.exitButtonDisabled
            ]}
            disabled={tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED'}
          >
            <X color={(tutorialStep !== 'COMPLETED' && tutorialStep !== 'NOT_STARTED') ? '#666' : '#fff'} size={RS.exitButtonSize * 0.6} />
          </Pressable>
        </View>
      </View>

      {/* ===== CONTENT AREA (NO SCROLLVIEW - FIXED DROP ISSUE) ===== */}
      <Animated.View
        style={[
          styles.contentArea,
          {
            transform: [
              { translateX: screenShakeAnim }, // 🌋 MEGA SHAKE!
            ]
          }
        ]}
      >
        {/* 🍎 QUESTION CARD - MEGA DOPAMINE 🔥 */}
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
            <Text style={styles.labelText}>
              {currentQuestion.word.difficulty || 'B1'} • Kelime Anlamı
            </Text>
          </View>
          <Text style={[styles.questionText, { textShadowColor: getComboColor(), textShadowRadius: combo > 5 ? 15 : 0 }]}>
            {currentQuestion.word.text}
          </Text>
        </Animated.View>

        {/* 🍎 OPTIONS */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const optionAnim = optionAnims[index];
            return (
              <OptionButton
                key={`${currentQuestionIndex}-${index}`}
                text={option.text}
                index={index}
                isSelected={selectedIndex === index}
                isCorrect={option.isCorrect}
                showResult={showResult}
                disabled={showResult || disabledOptionSet.has(index)}
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

      {/*  Tutorial Teşvik Mesajları */}
      <TutorialTooltip 
        message={tutorialTooltipMessage || ''} 
        visible={!!tutorialTooltipMessage && tutorialStep === 'STEP_3_FIRST_QUIZ'} 
        position="top"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  // ===== HEADER =====
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
  exitButton: {
    width: RS.exitButtonSize,
    height: RS.exitButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RS.exitButtonSize / 2,
  },
  exitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    opacity: 0.4,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldIndicator: {
    height: RS.exitButtonSize,
    paddingHorizontal: 10,
    borderRadius: RS.exitButtonSize / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 150, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.3)',
  },
  shieldEmoji: {
    fontSize: 14,
  },
  shieldText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  hintButton: {
    height: RS.exitButtonSize,
    paddingHorizontal: 10,
    borderRadius: RS.exitButtonSize / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  hintButtonDisabled: {
    opacity: 0.45,
  },
  hintEmoji: {
    fontSize: 14,
  },
  hintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  // ===== CONTENT AREA (REPLACES SCROLLVIEW) =====
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
  questionShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 150,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    transform: [{ skewX: '-20deg' }],
  },
  labelPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: RS.headerPadding * 1.2,
    paddingVertical: RS.headerPadding / 1.8,
    borderRadius: SCREEN_TYPE === 'tablet' ? 28 : 24,
    borderWidth: SCREEN_TYPE === 'tablet' ? 2 : 1.5,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: SCREEN_TYPE === 'tablet' ? 12 : 8,
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
    fontSize: RS.questionFont + (SCREEN_TYPE === 'tablet' ? 4 : SCREEN_TYPE === 'small' ? 0 : 2),
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
    zIndex: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: SCREEN_TYPE === 'tablet' ? 12 : 8,
    maxWidth: SCREEN_TYPE === 'tablet' ? 500 : '100%',
  },
  optionsContainer: {
    paddingHorizontal: RS.containerPaddingH,
    paddingBottom: RS.containerPaddingH / 2,
    gap: RS.optionGap,
  },
  sliceContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    // Kristaller soru kartının etrafında - Apple tier layout
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none', // Allow touches through empty space
    zIndex: 10, // Kristaller en üstte
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
  optionGlowOuter: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    opacity: 0.4,
    zIndex: -1,
  },
  optionShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ skewX: '-20deg' }],
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
  // 🏆 Results Screen Styles
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
  farmExplanationContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingHorizontal: RS.containerPaddingH,
    paddingVertical: RS.headerPadding / 1.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    marginTop: RS.resultGap / 4,
  },
  farmExplanationText: {
    fontSize: RS.labelFont,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  finishButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: RS.resultGap / 3,
    width: '100%',
    justifyContent: 'center',
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
  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
  },
  buttonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
