import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Trophy, Gem, Crown, AlertTriangle, CheckCircle, XCircle, Sparkles, Shield, ArrowDown, ChevronRight, SprayCan } from 'lucide-react-native';
import { haptic, sound } from '../utils/sound';
import { WordModel } from '../models/types';
import { useFarmStore } from '../store/farmStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 700;

// 🎨 RENKLER
const COLORS = {
  background: '#0a0f1a',
  surface: 'rgba(15, 23, 42, 0.98)',
  correct: '#22c55e',
  wrong: '#ef4444',
  gold: '#fbbf24',
  cyan: '#22d3ee',
  purple: '#a855f7',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
};

// Master level config
const LEVEL_CONFIG = {
  0: { label: 'YEŞİL', color: '#22c55e', Icon: AlertTriangle, emoji: '🌱' },
  1: { label: 'MASTER', color: COLORS.gold, Icon: Trophy, emoji: '🏆' },
  2: { label: 'ULTRA', color: COLORS.cyan, Icon: Gem, emoji: '💎' },
  3: { label: 'PERFECT', color: COLORS.purple, Icon: Crown, emoji: '👑' },
};

interface QuizQuestion {
  word: WordModel;
  options: string[];
  correctIndex: number;
}

interface QuizResult {
  word: WordModel;
  wasCorrect: boolean;
  oldLevel: number;
  newLevel: number;
  protected: boolean; // Master seviyede korunan kartlar
}

interface InventoryQuizDialogProps {
  visible: boolean;
  onClose: () => void;
  words: WordModel[]; // Master, Ultra, Perfect kartlar (10 veya 10'un katı)
  allWords: WordModel[]; // Tüm kelimeler (yanlış seçenekler için)
  onQuizComplete: (results: QuizResult[]) => void;
}

// 🎯 Quiz soru oluşturucu
const generateQuestions = (words: WordModel[], allWords: WordModel[]): QuizQuestion[] => {
  // Rastgele 10 kelime seç
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const selectedWords = shuffled.slice(0, 10);
  
  return selectedWords.map(word => {
    // 3 yanlış seçenek oluştur (farklı kelimelerden)
    const wrongOptions = allWords
      .filter(w => w.id !== word.id && w.meaning !== word.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaning);
    
    // Tüm seçenekleri karıştır
    const allOptions = [word.meaning, ...wrongOptions].sort(() => Math.random() - 0.5);
    const correctIndex = allOptions.indexOf(word.meaning);
    
    return {
      word,
      options: allOptions,
      correctIndex,
    };
  });
};

// 🚨 UYARI EKRANI - Quiz başlamadan önce
const WarningScreen: React.FC<{
  wordCount: number;
  onStart: () => void;
  onInsecticide: () => void;
}> = ({ wordCount, onStart, onInsecticide }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    
    haptic.warning();
  }, []);
  
  return (
    <Animated.View style={[styles.warningContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={['rgba(239, 68, 68, 0.15)', 'rgba(234, 179, 8, 0.08)', 'rgba(15, 23, 42, 0.98)']}
        style={styles.warningGradient}
      >
        {/* Header Icon */}
        <View style={styles.warningIconContainer}>
          <Text style={{ fontSize: 48 }}>🐛</Text>
        </View>
        
        {/* Title */}
        <Text style={styles.warningTitle}>🚨 EYVAHHH ŞEF!</Text>
        
        {/* Description */}
        <Text style={styles.warningDescription}>
          Envanterdeki <Text style={styles.warningHighlight}>{wordCount}</Text> hasadına{' '}
          <Text style={styles.warningHighlight}>böcekler</Text> dadandı!
        </Text>
        
        <Text style={styles.warningSubtext}>
          Koleksiyonunu korumak için quiz'e gir, <Text style={styles.warningHighlight}>böcekleri def et!</Text>
        </Text>
        
        {/* Rules */}
        <View style={styles.rulesContainer}>
          <View style={styles.ruleItem}>
            <Text style={{ fontSize: 18 }}>�</Text>
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>MASTER</Text> yanlış → Böcek ısırdı, tarlaya düşer
            </Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={{ fontSize: 18 }}>🐛</Text>
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>ULTRA</Text> yanlış → Böcek ısırdı, MASTER'a düşer
            </Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={{ fontSize: 18 }}>🐛</Text>
            <Text style={styles.ruleText}>
              <Text style={styles.ruleBold}>PERFECT</Text> yanlış → Böcek ısırdı, ULTRA'ya düşer
            </Text>
          </View>
        </View>
        
        {/* Buttons */}
        <View style={styles.warningButtons}>
          {/* Insecticide Button */}
          <TouchableOpacity 
            style={[styles.cancelButton, { flex: 1, backgroundColor: 'rgba(34, 211, 238, 0.15)', flexDirection: 'column', gap: 2, paddingVertical: 10 }]} 
            onPress={onInsecticide} 
            activeOpacity={0.8}
          >
            <Text style={{fontSize: 20}}>🧴</Text>
            <Text style={[styles.cancelButtonText, { color: '#22d3ee', fontWeight: '800', fontSize: 12 }]}>BÖCEK İLACI</Text>
            <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '700' }}>1500 🪙</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.startButton, { flex: 1.5 }]} onPress={onStart} activeOpacity={0.8}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>🛡️ DEF ET!</Text>
              <ChevronRight size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// 🎯 QUIZ EKRANI
const QuizScreen: React.FC<{
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  combo: number;
  onAnswer: (correct: boolean) => void;
}> = ({ question, questionIndex, totalQuestions, combo, onAnswer }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8); // 8 saniye süre
  const cardAnim = useRef(new Animated.Value(0)).current;
  const optionAnims = useRef(question.options.map(() => new Animated.Value(0))).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Reset state for new question
    setSelectedIndex(null);
    setShowResult(false);
    setTimeLeft(8);
    
    // Animate card in
    cardAnim.setValue(0);
    Animated.spring(cardAnim, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }).start();
    
    // Animate options with stagger - DAHA HIZLI
    optionAnims.forEach((anim, i) => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 150,
        delay: 100 + i * 50,
        useNativeDriver: true,
      }).start();
    });
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Süre bitti - yanlış say
          clearInterval(timerRef.current!);
          haptic.wrongAnswer();
          sound.playWrong();
          setTimeout(() => onAnswer(false), 300);
          return 0;
        }
        // Son 3 saniyede alarm sesi + haptic
        if (prev <= 3) {
          sound.playAlarm();
          haptic.heavy();
        } else {
          // Normal tick sesi
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question.word.id]);
  
  const handleOptionPress = (index: number) => {
    if (selectedIndex !== null) return; // Already answered
    if (timerRef.current) clearInterval(timerRef.current); // Stop timer
    
    setSelectedIndex(index);
    setShowResult(true);
    
    const isCorrect = index === question.correctIndex;
    
    if (isCorrect) {
      // GÜÇLÜ HAPTIC - combo bazlı
      haptic.correctAnswer(combo + 1);
      sound.playCorrect();
    } else {
      haptic.wrongAnswer();
      sound.playWrong();
    }
    
    // DAHA HIZLI geçiş
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 600);
  };
  
  const masterLevel = question.word.masterLevel || 1;
  const levelConfig = LEVEL_CONFIG[masterLevel as 1 | 2 | 3] || LEVEL_CONFIG[1];
  
  // Timer rengi
  const timerColor = timeLeft <= 3 ? COLORS.wrong : timeLeft <= 5 ? COLORS.gold : COLORS.cyan;
  
  return (
    <View style={styles.quizContainer}>
      {/* Progress & Timer */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((questionIndex + 1) / totalQuestions) * 100}%` }]} />
        </View>
        <View style={styles.quizHeader}>
          <Text style={styles.progressText}>{questionIndex + 1} / {totalQuestions}</Text>
          
          {/* Timer */}
          <View style={[styles.timerContainer, { borderColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor }]}>⏱️ {timeLeft}s</Text>
          </View>
          
          {/* Combo Badge */}
          {combo > 0 && (
            <View style={styles.comboBadge}>
              <Text style={styles.comboText}>🔥 {combo}x</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Word Card */}
      <Animated.View style={[
        styles.wordCard,
        {
          opacity: cardAnim,
          transform: [
            { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
          ],
        },
      ]}>
        <LinearGradient
          colors={[`${levelConfig.color}20`, `${levelConfig.color}10`, 'rgba(15, 23, 42, 0.95)']}
          style={styles.wordCardGradient}
        >
          {/* Level Badge */}
          <View style={[styles.levelBadge, { backgroundColor: `${levelConfig.color}30`, borderColor: levelConfig.color }]}>
            <levelConfig.Icon size={14} color={levelConfig.color} />
            <Text style={[styles.levelBadgeText, { color: levelConfig.color }]}>{levelConfig.label}</Text>
          </View>
          
          {/* Word */}
          <Text style={styles.wordText}>{question.word.text || question.word.verb}</Text>
          
          {/* Example if available */}
          {question.word.example && (
            <Text style={styles.exampleText} numberOfLines={2}>"{question.word.example}"</Text>
          )}
        </LinearGradient>
      </Animated.View>
      
      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === question.correctIndex;
          const showCorrectHighlight = showResult && isCorrect;
          const showWrongHighlight = showResult && isSelected && !isCorrect;
          
          return (
            <Animated.View
              key={index}
              style={{
                opacity: optionAnims[index],
                transform: [
                  { translateX: optionAnims[index].interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  showCorrectHighlight && styles.optionCorrect,
                  showWrongHighlight && styles.optionWrong,
                ]}
                onPress={() => handleOptionPress(index)}
                disabled={selectedIndex !== null}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  showCorrectHighlight && styles.optionTextCorrect,
                  showWrongHighlight && styles.optionTextWrong,
                ]}>
                  {option}
                </Text>
                
                {showCorrectHighlight && <CheckCircle size={24} color={COLORS.correct} />}
                {showWrongHighlight && <XCircle size={24} color={COLORS.wrong} />}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

// 🏆 SONUÇ EKRANI
const ResultScreen: React.FC<{
  results: QuizResult[];
  onClose: () => void;
}> = ({ results, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    
    // Celebrate if good results
    const correctCount = results.filter(r => r.wasCorrect).length;
    if (correctCount >= 7) {
      haptic.celebration();
      sound.playLevelUp();
    } else if (correctCount >= 5) {
      haptic.success();
    }
  }, []);
  
  const correctCount = results.filter(r => r.wasCorrect).length;
  const protectedCount = results.filter(r => r.protected).length;
  const demotedCount = results.filter(r => !r.wasCorrect && !r.protected).length;
  
  const protectedCards = results.filter(r => r.wasCorrect || r.protected);
  const demotedCards = results.filter(r => !r.wasCorrect && !r.protected);
  
  return (
    <Animated.View style={[styles.resultContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={['rgba(34, 197, 94, 0.15)', 'rgba(15, 23, 42, 0.98)', 'rgba(15, 23, 42, 0.98)']}
        style={styles.resultGradient}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultScroll}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <Text style={styles.resultEmoji}>
              {correctCount >= 8 ? '🎉' : correctCount >= 5 ? '�️' : '🐛'}
            </Text>
            <Text style={styles.resultTitle}>
              {correctCount >= 8 ? 'BÖCEKLER KAÇTI!' : correctCount >= 5 ? 'İYİ SAVUNMA!' : 'BÖCEKLER ISIRDI!'}
            </Text>
            <Text style={styles.resultScore}>{correctCount}/10 Korundu</Text>
          </View>
          
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: COLORS.correct }]}>
              <Text style={{ fontSize: 24 }}>🛡️</Text>
              <Text style={styles.statValue}>{protectedCards.length}</Text>
              <Text style={styles.statLabel}>Korundu</Text>
            </View>
            <View style={[styles.statBox, { borderColor: COLORS.wrong }]}>
              <Text style={{ fontSize: 24 }}>🐛</Text>
              <Text style={styles.statValue}>{demotedCount}</Text>
              <Text style={styles.statLabel}>Isırıldı</Text>
            </View>
          </View>
          
          {/* Protected Cards */}
          {protectedCards.length > 0 && (
            <View style={styles.cardSection}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18 }}>🛡️</Text>
                <Text style={styles.sectionTitle}>Böceklerden Kurtuldu!</Text>
              </View>
              {protectedCards.map((result, index) => {
                const levelConfig = LEVEL_CONFIG[result.newLevel as 1 | 2 | 3] || LEVEL_CONFIG[1];
                return (
                  <View key={index} style={[styles.resultCard, { borderColor: COLORS.correct }]}>
                    <View style={styles.resultCardLeft}>
                      <Text style={styles.resultCardWord}>{result.word.text || result.word.verb}</Text>
                      <View style={[styles.miniLevelBadge, { backgroundColor: `${levelConfig.color}30` }]}>
                        <Text style={[styles.miniLevelText, { color: levelConfig.color }]}>
                          {levelConfig.emoji} {levelConfig.label}
                        </Text>
                      </View>
                    </View>
                    {result.protected && !result.wasCorrect && (
                      <View style={styles.shieldBadge}>
                        <Shield size={14} color={COLORS.gold} />
                        <Text style={styles.shieldText}>Korundu</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          
          {/* Demoted Cards */}
          {demotedCards.length > 0 && (
            <View style={styles.cardSection}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18 }}>🐛</Text>
                <Text style={[styles.sectionTitle, { color: COLORS.wrong }]}>Böcek Isırdı!</Text>
              </View>
              {demotedCards.map((result, index) => {
                const oldConfig = LEVEL_CONFIG[result.oldLevel as 0 | 1 | 2 | 3] || LEVEL_CONFIG[1];
                const newConfig = LEVEL_CONFIG[result.newLevel as 0 | 1 | 2 | 3] || LEVEL_CONFIG[0];
                const isPlantedToFarm = result.newLevel === 0;
                return (
                  <View key={index} style={[styles.resultCard, { borderColor: COLORS.wrong }]}>
                    <View style={styles.resultCardLeft}>
                      <Text style={styles.resultCardWord}>{result.word.text || result.word.verb}</Text>
                      <View style={styles.levelChange}>
                        <View style={[styles.miniLevelBadge, { backgroundColor: `${oldConfig.color}30` }]}>
                          <Text style={[styles.miniLevelText, { color: oldConfig.color }]}>
                            {oldConfig.emoji}
                          </Text>
                        </View>
                        <Text style={styles.levelArrow}>→</Text>
                        <View style={[styles.miniLevelBadge, { backgroundColor: `${newConfig.color}30` }]}>
                          <Text style={[styles.miniLevelText, { color: newConfig.color }]}>
                            {newConfig.emoji}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isPlantedToFarm && (
                      <View style={[styles.shieldBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <Text style={{ fontSize: 12, color: COLORS.wrong }}>🌱 Tarlaya</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          
          {/* Close Button */}
          <TouchableOpacity style={styles.closeResultButton} onPress={onClose} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.correct, '#16a34a']} style={styles.closeResultGradient}>
              <Text style={styles.closeResultText}>TAMAM</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  );
};

// 🎯 ANA COMPONENT
export const InventoryQuizDialog: React.FC<InventoryQuizDialogProps> = ({
  visible,
  onClose,
  words,
  allWords,
  onQuizComplete,
}) => {
  const [stage, setStage] = useState<'warning' | 'quiz' | 'result'>('warning');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [combo, setCombo] = useState(0);
  const [showComboToast, setShowComboToast] = useState(false);
  const [comboMessage, setComboMessage] = useState('');
  const comboAnim = useRef(new Animated.Value(0)).current;
  
  // Reset when dialog opens
  useEffect(() => {
    if (visible) {
      setStage('warning');
      setCurrentQuestionIndex(0);
      setResults([]);
      setQuestions([]);
      setCombo(0);
      setShowComboToast(false);
    }
  }, [visible]);
  
  // Combo toast animasyonu
  const showComboAnimation = useCallback((newCombo: number) => {
    let message = `🔥 ${newCombo}x COMBO!`;
    
    // Özel milestone mesajları
    if (newCombo === 3) message = '🔥 SÜPER! 3x COMBO!';
    else if (newCombo === 5) message = '⚡ HARİKA! 5x COMBO!';
    else if (newCombo === 7) message = '💥 EFSANE! 7x COMBO!';
    else if (newCombo >= 10) message = '🌟 MUHTEŞEM! 10x COMBO!';
    
    setComboMessage(message);
    setShowComboToast(true);
    
    comboAnim.setValue(0);
    Animated.sequence([
      Animated.spring(comboAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(comboAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowComboToast(false));
  }, []);
  
  const handleStart = useCallback(() => {
    haptic.heavy();
    const generatedQuestions = generateQuestions(words, allWords);
    setQuestions(generatedQuestions);
    setStage('quiz');
  }, [words, allWords]);
  
  const handleAnswer = useCallback((correct: boolean) => {
    const currentQuestion = questions[currentQuestionIndex];
    const word = currentQuestion.word;
    const oldLevel = word.masterLevel || 1;
    
    let newLevel = oldLevel;
    let isProtected = false;
    
    if (correct) {
      // Combo artır
      const newCombo = combo + 1;
      setCombo(newCombo);
      
      // 2+ combo'da toast göster
      if (newCombo >= 2) {
        showComboAnimation(newCombo);
      }
    } else {
      // Combo sıfırla
      setCombo(0);
      
      // Tüm kartlar bir seviye düşer:
      // Master (1) → Yeşil (0) - tarlaya ekilir
      // Ultra (2) → Master (1)
      // Perfect (3) → Ultra (2)
      newLevel = oldLevel - 1;
    }
    
    const result: QuizResult = {
      word,
      wasCorrect: correct,
      oldLevel,
      newLevel,
      protected: isProtected,
    };
    
    setResults(prev => [...prev, result]);
    
    // Next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Quiz complete
      setTimeout(() => {
        setStage('result');
        onQuizComplete([...results, result]);
      }, 500);
    }
  }, [questions, currentQuestionIndex, results, onQuizComplete, combo, showComboAnimation]);
  
  const handleClose = useCallback(() => {
    haptic.light();
    onClose();
  }, [onClose]);

  const handleInsecticide = useCallback(() => {
    const state = useFarmStore.getState();
    const price = 1500;
    
    if (state.coins < price) {
      haptic.error();
      Alert.alert('Yetersiz Bakiye', 'Böcek ilacı almak için 1500 altına ihtiyacın var!');
      return;
    }
    
    Alert.alert(
      'Böcek İlacı',
      '1500 altın karşılığında böcekleri kovmak istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Satın Al ve Kullan',
          onPress: () => {
            // Şu anki kart sayısını al (modal dışından, store'dan)
            const currentInventory = state.inventory || [];
            const currentPhrasalInventory = state.phrasalVerbInventory || [];
            const currentCount = 
              currentInventory.filter(w => !(w as any).isPuzzleHarvested).length +
              currentPhrasalInventory.filter(w => !(w as any).isPuzzleHarvested).length;
            
            // Bir sonraki 10'un katına kadar koruma sağla
            const nextProtectionUntil = Math.ceil(currentCount / 10) * 10;
            
            useFarmStore.getState().activateInsecticide(price);
            haptic.success();
            sound.playSpray();
            setTimeout(() => sound.playSuccess(), 200);
            
            // Böcek ilacı kullanıldı, modal'ı kapat
            onClose();
          }
        }
      ]
    );
  }, [handleStart]);
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Prevent closing with back button in warning stage
        if (stage !== 'warning') handleClose();
      }}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.95)', 'rgba(10, 15, 26, 0.98)']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Close button removed for warning stage */}
        
        {stage === 'warning' && (
          <WarningScreen
            wordCount={words.length}
            onStart={handleStart}
            onInsecticide={handleInsecticide}
          />
        )}
        
        {stage === 'quiz' && questions.length > 0 && (
          <QuizScreen
            question={questions[currentQuestionIndex]}
            questionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            combo={combo}
            onAnswer={handleAnswer}
          />
        )}
        
        {stage === 'result' && (
          <ResultScreen
            results={results}
            onClose={handleClose}
          />
        )}
        
        {/* Combo Toast */}
        {showComboToast && (
          <Animated.View style={[
            styles.comboToast,
            {
              opacity: comboAnim,
              transform: [
                { scale: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                { translateY: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
              ],
            },
          ]}>
            <LinearGradient
              colors={['#f97316', '#ea580c', '#c2410c']}
              style={styles.comboToastGradient}
            >
              <Text style={styles.comboToastText}>{comboMessage}</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: IS_SMALL_SCREEN ? 40 : 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  
  // Warning Screen
  warningContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
  },
  warningGradient: {
    padding: 28,
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  warningTitle: {
    fontSize: IS_SMALL_SCREEN ? 22 : 26,
    fontWeight: '900',
    color: COLORS.gold,
    marginBottom: 16,
    textAlign: 'center',
  },
  warningDescription: {
    fontSize: IS_SMALL_SCREEN ? 15 : 17,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  warningHighlight: {
    color: COLORS.gold,
    fontWeight: '700',
  },
  warningSubtext: {
    fontSize: IS_SMALL_SCREEN ? 14 : 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  rulesContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
  },
  ruleText: {
    flex: 1,
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    color: COLORS.textSecondary,
  },
  ruleBold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  warningButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  startButton: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  
  // Quiz Screen
  quizContainer: {
    width: '100%',
    maxWidth: 400,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  wordCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  wordCardGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  wordText: {
    fontSize: IS_SMALL_SCREEN ? 28 : 34,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: IS_SMALL_SCREEN ? 16 : 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: COLORS.correct,
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: COLORS.wrong,
  },
  optionText: {
    flex: 1,
    fontSize: IS_SMALL_SCREEN ? 15 : 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  optionTextCorrect: {
    color: COLORS.correct,
    fontWeight: '700',
  },
  optionTextWrong: {
    color: COLORS.wrong,
  },
  
  // Result Screen
  resultContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
  },
  resultGradient: {
    borderRadius: 24,
  },
  resultScroll: {
    padding: 24,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: IS_SMALL_SCREEN ? 26 : 32,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  resultScore: {
    fontSize: IS_SMALL_SCREEN ? 18 : 20,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cardSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.correct,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  resultCardLeft: {
    flex: 1,
  },
  resultCardWord: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  miniLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  miniLevelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  levelChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelArrow: {
    fontSize: 14,
    color: COLORS.wrong,
    fontWeight: '700',
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  shieldText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '600',
  },
  closeResultButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  closeResultGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeResultText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  
  // Quiz Header - Timer & Combo
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  timerContainer: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  comboBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  comboText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f97316',
  },
  
  // Combo Toast
  comboToast: {
    position: 'absolute',
    top: IS_SMALL_SCREEN ? 80 : 100,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  comboToastGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  comboToastText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default InventoryQuizDialog;
