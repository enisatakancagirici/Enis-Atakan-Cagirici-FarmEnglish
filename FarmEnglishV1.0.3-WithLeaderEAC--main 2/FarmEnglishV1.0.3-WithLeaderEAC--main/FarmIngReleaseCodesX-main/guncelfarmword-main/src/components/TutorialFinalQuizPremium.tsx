import React, { useEffect, useRef, useState, memo, useMemo, useCallback } from 'react';
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
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { Check, X, Sparkles, Trophy, Star, Crown, Zap, Award, Target } from 'lucide-react-native';
import { MASCOT_IMAGE } from '../utils/assetPreloader';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 📱 Responsive
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 700;

interface TutorialFinalQuizPremiumProps {
  visible: boolean;
  onComplete: () => void;
}

// 🎯 PREMIUM Final Quiz - MiniQuiz tarzı ama özel
export const TutorialFinalQuizPremium = memo(({ visible, onComplete }: TutorialFinalQuizPremiumProps) => {
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Animasyon değerleri
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const questionScale = useRef(new Animated.Value(0.8)).current;
  const optionAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const resultRotate = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const mascotBounce = useRef(new Animated.Value(0)).current;
  
  // Yanlış cevap havuzu - daha çeşitli
  const wrongOptionsPool = useMemo(() => [
    'Hızlı koşmak',
    'Yüksek sesle konuşmak', 
    'Yavaşça yürümek',
    'Dikkatli bakmak',
    'Sessizce beklemek',
    'Hızla kaçmak',
    'Derin düşünmek',
    'Güçlü olmak',
    'Sakin kalmak',
    'Neşeli olmak',
    'Dikkatli dinlemek',
    'Hızlıca okumak',
  ], []);
  
  // Seçenekleri oluştur
  const [options, setOptions] = useState<string[]>([]);
  
  useEffect(() => {
    if (visible && tutorialFirstWrongWord) {
      // Reset
      setShowResult(null);
      setSelectedAnswer(null);
      setIsAnimating(false);
      
      // Rastgele 3 yanlış seçenek
      const shuffled = [...wrongOptionsPool].sort(() => Math.random() - 0.5);
      const wrongOpts = shuffled.slice(0, 3);
      const allOptions = [tutorialFirstWrongWord.meaning, ...wrongOpts];
      setOptions(allOptions.sort(() => Math.random() - 0.5));
      
      // Reset animasyonlar
      backdropOpacity.setValue(0);
      cardScale.setValue(0.9);
      cardTranslateY.setValue(50);
      headerOpacity.setValue(0);
      questionScale.setValue(0.8);
      optionAnims.forEach(a => a.setValue(0));
      resultScale.setValue(0);
      
      // 🔊 Açılış sesi
      haptic.medium();
      sound.playPop?.();
      
      // Entrance animasyonları
      Animated.sequence([
        // 1. Backdrop fade in
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // 2. Card slide up
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.spring(cardTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      
      // Header fade
      setTimeout(() => {
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 200);
      
      // Question pop
      setTimeout(() => {
        haptic.light();
        Animated.spring(questionScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }).start();
      }, 350);
      
      // Options stagger
      optionAnims.forEach((anim, i) => {
        setTimeout(() => {
          haptic.light();
          Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            tension: 100,
            useNativeDriver: true,
          }).start();
        }, 500 + i * 100);
      });
      
      // Shimmer loop
      const shimmerLoop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerLoop.start();
      
      // Glow pulse
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop.start();
      
      // Mascot bounce
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(mascotBounce, {
            toValue: -8,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(mascotBounce, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      bounceLoop.start();
      
      return () => {
        shimmerLoop.stop();
        glowLoop.stop();
        bounceLoop.stop();
      };
    }
  }, [visible, tutorialFirstWrongWord]);
  
  const handleAnswer = useCallback((answer: string) => {
    if (showResult || isAnimating) return;
    setIsAnimating(true);
    
    setSelectedAnswer(answer);
    const isCorrect = answer === tutorialFirstWrongWord?.meaning;
    
    // 🔊 Cevap haptic + ses
    if (isCorrect) {
      haptic.success();
      sound.playSuccess?.();
    } else {
      haptic.error();
      sound.playError?.();
    }
    
    setShowResult(isCorrect ? 'correct' : 'wrong');
    
    // Sonuç animasyonu
    Animated.parallel([
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(resultRotate, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
    
    // Otomatik geçiş yok - kullanıcı "Bitir" butonuna basacak
  }, [showResult, isAnimating, tutorialFirstWrongWord, setTutorialStep, onComplete]);
  
  // 🎯 Bitir butonuna basıldığında - direkt nickname modal'ı aç
  const handleFinish = useCallback(() => {
    haptic.success();
    sound.playSuccess?.();
    // 🎯 Direkt ASK_NICKNAME flow'una geç - fazladan dialog yok
    // TutorialManager ASK_NICKNAME action'ını tetikleyecek
    const { setTutorialFirstWrongWord } = useFarmStore.getState();
    setTutorialFirstWrongWord(undefined); // Kelimeyi temizle
    useFarmStore.getState().setShowNicknameModal(true); // Modal'ı aç
    setTimeout(() => {
      setTutorialStep('COMPLETED'); // Tutorial'ı bitir
    }, 100);
    onComplete();
  }, [setTutorialStep, onComplete]);
  
  if (!visible || !tutorialFirstWrongWord) return null;
  
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });
  
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });
  
  const resultRotation = resultRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });
  
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
        
        {/* ✨ Floating Particles */}
        <View style={styles.particlesContainer}>
          {[...Array(20)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${5 + (i * 5) % 90}%`,
                  top: `${10 + (i * 7) % 80}%`,
                  opacity: glowOpacity,
                  transform: [{ scale: 0.5 + (i % 3) * 0.3 }],
                },
              ]}
            />
          ))}
        </View>
        
        {/* 🎴 Main Card */}
        <Animated.View 
          style={[
            styles.card,
            {
              transform: [
                { scale: cardScale },
                { translateY: cardTranslateY },
              ],
            }
          ]}
        >
          <LinearGradient
            colors={['#1e1b4b', '#312e81', '#1e1b4b']}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] }
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
          
          {/* 🎯 Header */}
          <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
            <LinearGradient
              colors={['#f59e0b', '#f97316']}
              style={styles.badge}
            >
              <Trophy size={16} color="#fff" />
              <Text style={styles.badgeText}>FİNAL SINAVI</Text>
            </LinearGradient>
            
            <Text style={styles.title}>🎓 Son Test!</Text>
            <Text style={styles.subtitle}>
              Bu kelimeyi öğrendin mi?
            </Text>
          </Animated.View>
          
          {/* 📝 Question Card */}
          <Animated.View 
            style={[
              styles.questionCard,
              { transform: [{ scale: questionScale }] }
            ]}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.1)']}
              style={StyleSheet.absoluteFill}
            />
            
            {/* Glow ring */}
            <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.4)', 'transparent']}
                style={styles.glowGradient}
              />
            </Animated.View>
            
            <View style={styles.wordBadge}>
              <Crown size={14} color="#fbbf24" />
              <Text style={styles.wordBadgeText}>PERFECT</Text>
              <Star size={14} color="#fbbf24" />
            </View>
            
            <Text style={styles.questionLabel}>Bu kelime ne anlama gelir?</Text>
            
            <Text style={styles.questionWord}>"{tutorialFirstWrongWord.text}"</Text>
            
            {/* Mascot */}
            <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: mascotBounce }] }]}>
              <Image source={MASCOT_IMAGE} style={styles.mascot} />
            </Animated.View>
          </Animated.View>
          
          {/* 🎚️ Options */}
          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === tutorialFirstWrongWord.meaning;
              const showCorrect = showResult && isCorrectOption;
              const showWrong = showResult && isSelected && !isCorrectOption;
              
              const optionScale = optionAnims[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              });
              
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.optionWrapper,
                    {
                      opacity: optionAnims[index],
                      transform: [{ scale: optionScale }],
                    }
                  ]}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionButton,
                      showCorrect && styles.optionCorrect,
                      showWrong && styles.optionWrong,
                      pressed && !showResult && styles.optionPressed,
                    ]}
                    onPress={() => handleAnswer(option)}
                    disabled={!!showResult}
                  >
                    <LinearGradient
                      colors={
                        showCorrect
                          ? ['#22c55e', '#16a34a']
                          : showWrong
                          ? ['#ef4444', '#dc2626']
                          : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                      }
                      style={StyleSheet.absoluteFill}
                    />
                    
                    <View style={[
                      styles.optionIndex,
                      showCorrect && { backgroundColor: '#22c55e' },
                      showWrong && { backgroundColor: '#ef4444' },
                    ]}>
                      {showCorrect ? (
                        <Check size={14} color="#fff" strokeWidth={3} />
                      ) : showWrong ? (
                        <X size={14} color="#fff" strokeWidth={3} />
                      ) : (
                        <Text style={styles.optionIndexText}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      )}
                    </View>
                    
                    <Text style={[
                      styles.optionText,
                      (showCorrect || showWrong) && styles.optionTextBold,
                    ]}>
                      {option}
                    </Text>
                    
                    {showCorrect && (
                      <View style={styles.optionCheck}>
                        <Sparkles size={16} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
        
        {/* 🎉 Result Overlay */}
        {showResult && (
          <Animated.View 
            style={[
              styles.resultOverlay,
              {
                opacity: resultScale,
                transform: [
                  { scale: resultScale },
                  { rotate: resultRotation },
                ],
              }
            ]}
          >
            {/* Lottie Confetti */}
            {showResult === 'correct' && (
              <LottieView
                source={require('../../assets/lottie/success.json')}
                autoPlay
                loop={false}
                style={styles.confetti}
              />
            )}
            
            <View style={[
              styles.resultCard,
              showResult === 'correct' ? styles.resultCorrectCard : styles.resultWrongCard,
            ]}>
              <LinearGradient
                colors={
                  showResult === 'correct'
                    ? ['#22c55e', '#16a34a', '#15803d']
                    : ['#f59e0b', '#ea580c', '#c2410c']
                }
                style={StyleSheet.absoluteFill}
              />
              
              <View style={styles.resultIconContainer}>
                {showResult === 'correct' ? (
                  <View style={styles.resultIcon}>
                    <Check size={36} color="#fff" strokeWidth={3} />
                  </View>
                ) : (
                  <View style={[styles.resultIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Target size={36} color="#fff" />
                  </View>
                )}
              </View>
              
              <Text style={styles.resultTitle}>
                {showResult === 'correct' 
                  ? '🎉 MUHTEŞEM!' 
                  : '💪 SORUN DEĞİL!'}
              </Text>
              
              <Text style={styles.resultMessage}>
                {showResult === 'correct'
                  ? 'Bak! sistem çalışıyor sanki :D'
                  : 'Her tekrar seni güçlendirir.\nDevam et!'}
              </Text>
              
              {/* 🎯 Bitir Butonu */}
              <TouchableOpacity
                style={styles.finishButton}
                onPress={handleFinish}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
                  style={styles.finishButtonGradient}
                >
                  <Text style={styles.finishButtonText}>Bitir 🎊</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.resultFooter}>
                <Award size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.resultFooterText}>
                  Tutorial Tamamlandı!
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
  },
  card: {
    width: SCREEN_WIDTH * 0.92,
    maxWidth: 400,
    borderRadius: 28,
    overflow: 'hidden',
    paddingVertical: IS_SMALL_SCREEN ? 20 : 28,
    paddingHorizontal: IS_SMALL_SCREEN ? 16 : 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 25,
  },
  shimmer: {
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
  header: {
    alignItems: 'center',
    marginBottom: IS_SMALL_SCREEN ? 16 : 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: IS_SMALL_SCREEN ? 22 : 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    color: 'rgba(255,255,255,0.7)',
  },
  questionCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 20,
    padding: IS_SMALL_SCREEN ? 16 : 24,
    marginBottom: IS_SMALL_SCREEN ? 16 : 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 100,
  },
  wordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  wordBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
  },
  questionLabel: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  questionWord: {
    fontSize: IS_SMALL_SCREEN ? 26 : 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  mascotContainer: {
    position: 'absolute',
    bottom: -15,
    right: -10,
  },
  mascot: {
    width: 50,
    height: 50,
    opacity: 0.4,
  },
  optionsContainer: {
    gap: IS_SMALL_SCREEN ? 8 : 10,
  },
  optionWrapper: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: IS_SMALL_SCREEN ? 12 : 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  optionCorrect: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  optionWrong: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIndexText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    color: '#fff',
    fontSize: IS_SMALL_SCREEN ? 14 : 15,
    fontWeight: '500',
  },
  optionTextBold: {
    fontWeight: '700',
  },
  optionCheck: {
    marginLeft: 8,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  confetti: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 99,
  },
  resultCard: {
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 101,
  },
  resultCorrectCard: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 25,
  },
  resultWrongCard: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 25,
  },
  resultIconContainer: {
    marginBottom: 16,
  },
  resultIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    lineHeight: 22,
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
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  finishButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  finishButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default TutorialFinalQuizPremium;
