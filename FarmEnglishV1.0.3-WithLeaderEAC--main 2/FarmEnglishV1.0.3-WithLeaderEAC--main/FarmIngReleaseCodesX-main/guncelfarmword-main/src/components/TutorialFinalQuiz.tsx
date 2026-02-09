import React, { useEffect, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Modal,
  Image,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFarmStore } from '../store/farmStore';
import { haptic } from '../utils/sound';
import { Check, X, Sparkles, Trophy, Star, Crown, Zap } from 'lucide-react-native';
import { MASCOT_IMAGE } from '../utils/assetPreloader';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TutorialFinalQuizProps {
  visible: boolean;
  onComplete: () => void;
}

// 🎯 Şatafatlı Final Quiz - "X ne anlama gelir?" testi
export const TutorialFinalQuiz = memo(({ visible, onComplete }: TutorialFinalQuizProps) => {
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const questionSlide = useRef(new Animated.Value(50)).current;
  const optionsSlide = useRef(new Animated.Value(100)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Yanlış cevap seçenekleri (dummy)
  const wrongOptions = [
    'Hızlı koşmak',
    'Yüksek sesle konuşmak', 
    'Yavaşça yürümek',
    'Dikkatli bakmak',
    'Sessizce beklemek',
    'Hızla kaçmak',
  ];
  
  // Rastgele 3 yanlış seçenek al
  const getWrongOptions = () => {
    const shuffled = [...wrongOptions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };
  
  // Seçenekleri oluştur (1 doğru + 3 yanlış, karıştır)
  const [options, setOptions] = useState<string[]>([]);
  
  useEffect(() => {
    if (visible && tutorialFirstWrongWord) {
      const wrongOpts = getWrongOptions();
      const allOptions = [tutorialFirstWrongWord.meaning, ...wrongOpts];
      setOptions(allOptions.sort(() => Math.random() - 0.5));
      setShowResult(null);
      setSelectedAnswer(null);
      
      // Giriş animasyonları
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      questionSlide.setValue(50);
      optionsSlide.setValue(100);
      resultScale.setValue(0);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
      
      setTimeout(() => {
        Animated.spring(questionSlide, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();
      }, 200);
      
      setTimeout(() => {
        Animated.spring(optionsSlide, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();
      }, 400);
      
      // Shimmer loop
      const shimmerLoop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerLoop.start();
      
      return () => shimmerLoop.stop();
    }
  }, [visible, tutorialFirstWrongWord]);
  
  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    const isCorrect = answer === tutorialFirstWrongWord?.meaning;
    
    haptic.heavy();
    
    // Sonuç animasyonu
    setShowResult(isCorrect ? 'correct' : 'wrong');
    
    Animated.sequence([
      Animated.timing(resultScale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (isCorrect) {
      // Confetti göster
      Animated.timing(confettiOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Pulse animation
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    }
    
    // 2.5 saniye sonra devam
    setTimeout(() => {
      setTutorialStep('STEP_20_CELEBRATION');
      onComplete();
    }, 2500);
  };
  
  if (!visible || !tutorialFirstWrongWord) return null;
  
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });
  
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#0a0a1a', '#1a1a3a', '#0f0f2f']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* ✨ Particles */}
        <View style={styles.particlesContainer}>
          {[...Array(12)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${8 + (i * 8)}%`,
                  top: `${10 + (i % 4) * 22}%`,
                  opacity: 0.15 + (i * 0.03),
                  width: 4 + (i % 3) * 2,
                  height: 4 + (i % 3) * 2,
                },
              ]}
            />
          ))}
        </View>
        
        {/* 🎯 Header */}
        <Animated.View 
          style={[
            styles.header,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={['#f59e0b', '#f97316', '#ea580c']}
              style={styles.badge}
            >
              <Trophy size={20} color="#fff" />
              <Text style={styles.badgeText}>FINAL TEST</Text>
            </LinearGradient>
          </View>
          
          <Text style={styles.title}>🎯 Son Sınav!</Text>
          <Text style={styles.subtitle}>
            Tutorial boyunca öğrendiğin kelimeyi test edelim
          </Text>
        </Animated.View>
        
        {/* 📝 Soru Kartı */}
        <Animated.View 
          style={[
            styles.questionCard,
            { transform: [{ translateY: questionSlide }] }
          ]}
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.questionGradient}
          />
          
          {/* Shimmer */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              { transform: [{ translateX: shimmerTranslate }] }
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
          
          <View style={styles.wordBadge}>
            <Crown size={16} color="#fbbf24" />
            <Text style={styles.wordBadgeText}>PERFECT</Text>
          </View>
          
          <Text style={styles.questionLabel}>
            Bu kelime ne anlama gelir?
          </Text>
          
          <Text style={styles.questionWord}>
            "{tutorialFirstWrongWord.text}"
          </Text>
        </Animated.View>
        
        {/* 🎚️ Seçenekler */}
        <Animated.View 
          style={[
            styles.optionsContainer,
            { transform: [{ translateY: optionsSlide }] }
          ]}
        >
          {options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === tutorialFirstWrongWord.meaning;
            const showCorrectHighlight = showResult && isCorrectOption;
            const showWrongHighlight = showResult && isSelected && !isCorrectOption;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  showCorrectHighlight && styles.optionCorrect,
                  showWrongHighlight && styles.optionWrong,
                  isSelected && !showResult && styles.optionSelected,
                ]}
                onPress={() => handleAnswer(option)}
                disabled={!!showResult}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    showCorrectHighlight
                      ? ['#22c55e', '#16a34a']
                      : showWrongHighlight
                      ? ['#ef4444', '#dc2626']
                      : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                  }
                  style={styles.optionGradient}
                />
                
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionIndex,
                    showCorrectHighlight && { backgroundColor: '#22c55e' },
                    showWrongHighlight && { backgroundColor: '#ef4444' },
                  ]}>
                    {showCorrectHighlight ? (
                      <Check size={14} color="#fff" />
                    ) : showWrongHighlight ? (
                      <X size={14} color="#fff" />
                    ) : (
                      <Text style={styles.optionIndexText}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    )}
                  </View>
                  
                  <Text style={[
                    styles.optionText,
                    (showCorrectHighlight || showWrongHighlight) && styles.optionTextHighlight,
                  ]}>
                    {option}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
        
        {/* 🎉 Sonuç Modal */}
        {showResult && (
          <Animated.View 
            style={[
              styles.resultOverlay,
              { transform: [{ scale: resultScale }] }
            ]}
          >
            {/* Confetti Lottie */}
            {showResult === 'correct' && (
              <Animated.View style={[styles.confettiContainer, { opacity: confettiOpacity }]}>
                <LottieView
                  source={require('../../assets/lottie/success.json')}
                  autoPlay
                  loop={false}
                  style={styles.confetti}
                />
              </Animated.View>
            )}
            
            <Animated.View 
              style={[
                styles.resultCard,
                showResult === 'correct' ? styles.resultCorrect : styles.resultWrong,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <LinearGradient
                colors={
                  showResult === 'correct'
                    ? ['#22c55e', '#16a34a', '#15803d']
                    : ['#f59e0b', '#d97706', '#b45309']
                }
                style={StyleSheet.absoluteFill}
              />
              
              <View style={styles.resultIcon}>
                {showResult === 'correct' ? (
                  <View style={styles.resultIconCircle}>
                    <Check size={40} color="#fff" strokeWidth={3} />
                  </View>
                ) : (
                  <View style={[styles.resultIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Star size={40} color="#fff" />
                  </View>
                )}
              </View>
              
              <Text style={styles.resultTitle}>
                {showResult === 'correct' 
                  ? '🎉 SİSTEM ÇALIŞIYOR!' 
                  : '💪 SORUN DEĞİL!'}
              </Text>
              
              <Text style={styles.resultMessage}>
                {showResult === 'correct'
                  ? 'Tekrarlı öğrenme sistemi sayesinde kelimeyi artık biliyorsun!'
                  : 'Endişelenme! Kalıcılığı elde edene kadar çalışmaya devam et!'}
              </Text>
              
              <View style={styles.resultFooter}>
                <Sparkles size={18} color="rgba(255,255,255,0.8)" />
                <Text style={styles.resultFooterText}>
                  {showResult === 'correct'
                    ? 'Tebrikler, harikasın!'
                    : 'Her tekrar seni daha güçlü yapar!'}
                </Text>
              </View>
              
              {/* Mascot */}
              <Image source={MASCOT_IMAGE} style={styles.resultMascot} />
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: '#8b5cf6',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeContainer: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  questionCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  questionGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '200%',
  },
  shimmerGradient: {
    flex: 1,
  },
  wordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  wordBadgeText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  questionLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 12,
  },
  questionWord: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndexText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextHighlight: {
    fontWeight: '700',
  },
  optionSelected: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  optionCorrect: {
    borderColor: '#22c55e',
  },
  optionWrong: {
    borderColor: '#ef4444',
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 100,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 101,
  },
  confetti: {
    width: '100%',
    height: '100%',
  },
  resultCard: {
    width: SCREEN_WIDTH * 0.85,
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 102,
  },
  resultCorrect: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  resultWrong: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  resultIcon: {
    marginBottom: 16,
  },
  resultIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resultFooterText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  resultMascot: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 70,
    height: 70,
    opacity: 0.3,
  },
});

export default TutorialFinalQuiz;
