import React, { useEffect, useRef, memo, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Easing,
  InteractionManager,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useFarmStore, TutorialStep } from '../store/farmStore';
import { haptic } from '../utils/sound';
import { ChevronRight, Lock, Sparkles, User } from 'lucide-react-native';
import { MASCOT_IMAGE } from '../utils/assetPreloader';
import { isNicknameClean } from '../utils/nicknameModeration';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 700;

// 🌱 Maskot Bilgileri
const MASCOT = {
  name: 'Fidan',
  image: MASCOT_IMAGE,
};

// 🎯 FULL-SCREEN TUTORİAL DİYALOGLARI - DETAYLI AKIŞ
export const TUTORIAL_DIALOGS: Record<TutorialStep, { 
  lines: string[]; 
  cta?: string; 
  ctaAction?: string;
  fullScreen?: boolean;
  waitForAction?: string;
  highlightTab?: string;
  emoji?: string;
}> = {
  NOT_STARTED: { lines: [] },
  
  STEP_1_WELCOME: {
    lines: [
      '👋 Merhaba! Ben Fidan!',
      'Seninle birlikte binlerce kelime öğreneceğiz.',
      'Sana bu ÖZGÜN sistemi adım adım göstereceğim!',
    ],
    cta: 'Başlayalım! 🚀',
    ctaAction: 'NEXT',
    fullScreen: true,
    emoji: '🌱',
  },
  
  STEP_2_NO_SEED: {
    lines: [
      '⚡ Quiz hızlı ve eğlencelidir! Süreye dikkat et!',
      'Hemen şıklara dokun ve cevapla! Her combo\'da zevkin katlanarak artar.',
      '',
      'Kelimeler, tarlana verdiğin cevabın doğruluğuna göre ekilir.',
    ],
    cta: "BAŞLAAA⚡",
    ctaAction: 'GO_QUIZ',
    fullScreen: true,
    emoji: '⚡',
  },
  
  STEP_3_FIRST_QUIZ: { 
    lines: [
      '🎯 Şıklara dokun ve cevapla!',
      '',
      '🔴 Yanlışlar = Tohum',
      '🍎 Doğrular = Direkt Meyve',
    ],
    waitForAction: 'ANY_ANSWER',
    emoji: '📝',
  },
  
  STEP_4_HOME_UNLOCK: {
    lines: [
      '🎉 Harika! Kelimeler ekildi!',
      '',
      '🔴 Kırmızı Kartlar = Yanlış yaptıkların',
      '🍎 Yeşil Kartlar = Bildiklerin',
      '',
      'Çiftlikte TOHUMLARINI geliştirebilirsin!',
    ],
    cta: 'Çiftliğe Git 🚜',
    ctaAction: 'GO_FARM',
    fullScreen: true,
    emoji: '🌾',
  },
  
  STEP_5_FARM_ONLY: {
    lines: [
      '👇 Aşağıdaki ÇİFTLİK sekmesine dokun!',
    ],
    highlightTab: 'farm',
    waitForAction: 'TAB_FARM',
    emoji: '👆',
  },
  
  STEP_6_FARM_INTRO: {
    lines: [
      '🌾 Burası senin tarlan!',
      '',
      '🔴 KIRMIZI KARTLAR = Tohum',
      '🟡 SARI KARTLAR = Büyüyor, gelişiyor',
      '🍎 YEŞİL KARTLAR = Hasata hazır durumda',
      '',
      '👉 Vurgulanan kartta "Çalış"a bas! veya sağa doğru KAYDIR!(Önerilen)',
    ],
    cta: 'Anlaşıldı! 💪',
    ctaAction: 'WAIT_CARD_TAP',
    fullScreen: true,
    emoji: '🌾',
  },
  
  STEP_7_MINI_QUIZ: { 
    lines: [
      '⚡ Mini Quiz açıldı!',
      '3 doğru cevap = 1 renk ilerlemesi',
      'Tohumun büyüyor',
      '🔴 → 🟡 → 🟢',
      '',
      'Yeşil yapana kadar devam!',
    ],
    waitForAction: 'COLOR_CHANGE',
    emoji: '⚡',
  },
  
  STEP_8_CARD_PROGRESS: { 
    lines: [
      '🟡 SARI oldu! Harika!',
      'TOHUMUN BÜYÜYÜP MEYVE OLMAYA BAŞLADI',
      '',
      '',
      'Yeşil yapana kadar devam! 💪',
    ],
    cta: 'Hadi Devammm',
    ctaAction: 'CONTINUE_QUIZ',
    fullScreen: true,
    emoji: '🟡',
  },
  
  // STEP_9 atlandı - button lock STEP_8'de yapılıyor
  STEP_9_SWIPE: { lines: [], fullScreen: false, emoji: '' },

  STEP_10_TO_GREEN: { 
    lines: [
      '🟢 YEŞİL OLDU! ARTIK BİLMEDİĞİN O KELİME BİR MEYVE!',
      '',
      'Çalışmaya devam et!',
      '0/1 → 1/1 olunca HASAT!',
      'Hasat vakti gelince KAYDIR ve HASAT ET!',
      '',
    ],
    cta: 'Çok iyiymiş🌾',
    ctaAction: 'GO_READY_FILTER',
    fullScreen: true,
    emoji: '🟢',
  },
  
  STEP_11_HARVEST: { 
    lines: [
      '🌾 Hasat Edilebilir!',
      '',
      'Yeşil kartına dokun!',
      '1 session tamamla (0/1 → 1/1)',
      '',
      '👉 Sağa kaydırarak da hasat!',
      '',
      'Sonra HASAT butonu aktif olur!',
    ],
    waitForAction: 'SESSION_COMPLETE',
    fullScreen: false,
    emoji: '🌾',
  },
  
  STEP_12_INVENTORY: { 
    lines: [
      '🏆İLK HASADIN WUHUUUUU!',
      '',
      'Kelimeni Master yaptın! Kelimede uzmanlaşıyorsun!',
      'Şimdi envantere gidelim.',
    ],
    cta: 'Envantere Git 📦',
    ctaAction: 'GO_INVENTORY',
    fullScreen: true,
    emoji: '📦',
  },
  
  STEP_13_SELECT_CARD: { 
    lines: [
      '📦 ENVANTER',
      '',
      'Hasat ettiklerin burada gözükür!',
      '',
      '⭐ Master → 💎 Ultra → 👑 Perfect',
      'Her kartın farklı bir görünümü var!',
      '� Sola kaydırarak tarlaya gönder!',
      '',
      '',
    ],
    fullScreen: false,
    waitForAction: 'INVENTORY_SWIPE',
    emoji: '📦',
  },
  
  STEP_14_REPLANT: { 
    lines: [
      '🌱 MASTER KART EKİLDİ!',
      '',
      'Gördüğün gibi master kartın',
      'artık TARLANDA!',
      '',
      '💧 Tekrar çalışarak:',
      '⭐ → 💎 Ultra → 👑 Perfect → 🍎 Meyve',
      'hallerine getirebilirsin!',
      '',
      '💰 Hasat = Coin + XP kazanırsın!',
      '♾️ Hasatta sınır yok!',
    ],
    fullScreen: true,
    cta: 'Anladım! 👍',
    ctaAction: 'GO_HOME_FINAL',
    emoji: '🌱',
  },
  
  STEP_15_MASTER_GRIND: { 
    lines: [
      '🎉 SİSTEM HAZIR!',
      '',
      '📝 Quiz → Kelime toplarsın.',
      '🌱 Tarla → Kartları çalışırsın ve yükseltirsin.', 
      '📦 Envanter → Koleksiyonlarsın.',
      '',
      'Şimdi öğrendiğin kelimeyi',
      'hatırlıyor musun bakalım!',
    ],
    cta: 'Test Et! 🎯',
    ctaAction: 'START_FINAL_QUIZ',
    fullScreen: true,
    emoji: '🎉',
  },
  
  // STEP_16-17 atlandı - direkt quiz'e gidiyoruz
  STEP_16_ULTRA_REACHED: { 
    lines: [],
    fullScreen: false,
    emoji: '',
  },
  
  STEP_17_PERFECT_GRIND: { 
    lines: [],
    fullScreen: false,
    emoji: '',
  },
  
  STEP_18_PERFECT_DONE: { 
    lines: [],
    fullScreen: false,
    emoji: '',
  },
  
  STEP_19_FINAL_QUIZ: { 
    lines: [
      '✅ DOĞRU BİLDİN!',
      '',
      'Bak doğru bildin,',
      'işe yarıyor gibi sanki :D',
      '',
      '🎉 Artık hazırsın!',
    ],
    cta: 'Bitir 🎊',
    ctaAction: 'ASK_NICKNAME',
    fullScreen: true,
    emoji: '✅',
  },
  
  STEP_19_FINAL_QUIZ_WRONG: { 
    lines: [
      '💪 HİÇ SORUN DEĞİL!',
      '',
      'Tarladan kelimene çalışarak',
      'bu kelimeyi hafızana',
      'kazıyabilirsin!',
      'Sistem tam da bunun için var.',
      '',
    ],
    cta: 'Bitir 🎊',
    ctaAction: 'ASK_NICKNAME',
    fullScreen: true,
    emoji: '💪',
  },
  
  STEP_20_CELEBRATION: { 
    lines: [
      '🌟 HAZIRSIN!',
      '',
      'Artık özgürsün!',
      '',
      'Unuttuğun veya takıldığın',
      'bir nokta olursa:',
      '',
      '❓ Profil → Nasıl Oynanır?',
      '',
      'Çok kolay bir sistem!',
      'Bol öğrenmeler! 🚀',
    ],
    cta: 'Başla! 🚀',
    ctaAction: 'ASK_NICKNAME',
    fullScreen: true,
    emoji: '🌟',
  },
  
  COMPLETED: { lines: [] },
};

// 🎨 RENK GEÇİŞ TEŞVİK MESAJLARI
export const COLOR_TRANSITION_MESSAGES = {
  toOrange: [
    '🟠 Turuncu oldun! Harika!',
    '💪 İyi gidiyorsun, devam!',
    '🔥 Ateşledin! Sarıya rampa!',
  ],
  toYellow: [
    '🟡 Sarı! Yeşile az kaldı!',
    '⭐ Muhteşem! Son hamle!',
    '✨ Parlıyorsun! Yeşil yakın!',
  ],
  toGreen: [
    '🟢 YEŞİL! Öğrendin! 🎉',
    '🏆 Tebrikler! Kelime senin!',
    '🌟 Harika iş! Envantere git!',
  ],
  toMaster: [
    '🥇 MASTER! Efsanesin!',
    '💎 Master seviye! Devam!',
    '👑 Ustalaştın! Ultra kas!',
  ],
  toUltra: [
    '💎 ULTRA! Süpersin!',
    '💫 Süpersin! Perfect hedefle!',
    '⚡ Ultra güç! Son adım!',
  ],
  toPerfect: [
    '👑 PERFECT! KRALİYET! 🏆',
    '🌟 Efsane oldun!',
    '💎 Tam puan! Sen bir dehaysin!',
  ],
};

// 🔒 TAB KİLİTLERİ - Her adımda sadece o anki sekme açık
export const TUTORIAL_NAV_LOCKS: Record<TutorialStep, { home: boolean; quiz: boolean; farm: boolean; inventory: boolean; store: boolean; puzzle: boolean; phrasal: boolean }> = {
  NOT_STARTED: { home: false, quiz: false, farm: false, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_1_WELCOME: { home: true, quiz: false, farm: false, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_2_NO_SEED: { home: true, quiz: true, farm: false, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_3_FIRST_QUIZ: { home: false, quiz: true, farm: false, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_4_HOME_UNLOCK: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_5_FARM_ONLY: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_6_FARM_INTRO: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_7_MINI_QUIZ: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_8_CARD_PROGRESS: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_9_SWIPE: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_10_TO_GREEN: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_11_HARVEST: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_12_INVENTORY: { home: false, quiz: false, farm: false, inventory: true, store: false, puzzle: false, phrasal: false },
  STEP_13_SELECT_CARD: { home: false, quiz: false, farm: false, inventory: true, store: false, puzzle: false, phrasal: false },
  STEP_14_REPLANT: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_15_MASTER_GRIND: { home: true, quiz: false, farm: false, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_16_ULTRA_REACHED: { home: false, quiz: false, farm: true, inventory: false, store: false, puzzle: false, phrasal: false }, // Geçiş ara step - sadece tarla
  STEP_17_PERFECT_GRIND: { home: true, quiz: true, farm: true, inventory: true, store: true, puzzle: true, phrasal: true }, // Atlandı
  STEP_18_PERFECT_DONE: { home: true, quiz: true, farm: true, inventory: true, store: true, puzzle: true, phrasal: true }, // Atlandı
  STEP_19_FINAL_QUIZ: { home: true, quiz: false, farm: false, inventory: false, store: false, puzzle: false, phrasal: false },
  STEP_19_FINAL_QUIZ_WRONG: { home: true, quiz: true, farm: true, inventory: true, store: true, puzzle: true, phrasal: true },
  STEP_20_CELEBRATION: { home: true, quiz: true, farm: true, inventory: true, store: true, puzzle: true, phrasal: true },
  COMPLETED: { home: true, quiz: true, farm: true, inventory: true, store: true, puzzle: true, phrasal: true },
};

export const LOCK_TOOLTIPS: Record<string, string> = {
  home: 'Tutorial tamamla.',
  quiz: 'Şu an Quiz\'e gidemezsin.',
  farm: 'Önce Quiz çöz.',
  inventory: 'Önce bir kelime yeşil yap.',
  store: 'Tutorial tamamla.',
  puzzle: 'Önce Tutorial\'ı tamamla.',
  phrasal: 'Önce Tutorial\'ı tamamla.',
};

// 🎯 Tutorial step'ine göre doğru ekranı döndür
export const getTutorialRoute = (step: TutorialStep): string => {
  switch (step) {
    case 'NOT_STARTED':
    case 'STEP_1_WELCOME':
    case 'STEP_2_NO_SEED':
    case 'STEP_15_MASTER_GRIND':
    case 'STEP_19_FINAL_QUIZ':
    case 'STEP_19_FINAL_QUIZ_WRONG':
    case 'STEP_20_CELEBRATION':
      return 'Home';
    
    case 'STEP_3_FIRST_QUIZ':
      return 'Quiz';
    
    case 'STEP_4_HOME_UNLOCK':
    case 'STEP_5_FARM_ONLY':
    case 'STEP_6_FARM_INTRO':
    case 'STEP_7_MINI_QUIZ':
    case 'STEP_8_CARD_PROGRESS':
    case 'STEP_9_SWIPE':
    case 'STEP_10_TO_GREEN':
    case 'STEP_11_HARVEST':
    case 'STEP_14_REPLANT':
    case 'STEP_16_ULTRA_REACHED':
      return 'Farm';
    
    case 'STEP_12_INVENTORY':
    case 'STEP_13_SELECT_CARD':
      return 'Inventory';
    
    case 'COMPLETED':
    default:
      return 'Home';
  }
};

// 🔒 Full-screen tutorial dialog aktif mi kontrol et (kart swipe'larını disable etmek için)
export const isTutorialFullScreenActive = (step: TutorialStep): boolean => {
  const dialog = TUTORIAL_DIALOGS[step];
  return dialog?.fullScreen === true && dialog.lines.length > 0;
};

// 🎯 FULL-SCREEN TUTORIAL OVERLAY
export const TutorialOverlay = memo(({ visible }: { visible: boolean }) => {
  const navigation = useNavigation<any>();
  
  // 🚫 Çift render önleme - Geçiş sırasında modal'ı hemen kapat
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const lastAnimatedStep = useRef<string | null>(null);
  
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(0.3)).current;
  const mascotTranslateY = useRef(new Animated.Value(50)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // 👆 Swipe-to-dismiss gesture handling
  const swipeY = useRef(new Animated.Value(0)).current;
  const gestureStartY = useRef(0);

  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  const setTutorialFirstWrongWord = useFarmStore(s => s.setTutorialFirstWrongWord);
  const skipTutorial = useFarmStore(s => s.skipTutorial);

  // 🔒 Overlay açılırken tüm kartı interactions lock'la
  useEffect(() => {
    if (visible) {
      // Açılıyor - hemen lock'la
      useFarmStore.setState({ isTutorialOverlayActive: true });
    } else {
      // Kapanıyor - animasyon + biraz delay sonra unlock et (400ms)
      const timer = setTimeout(() => {
        useFarmStore.setState({ isTutorialOverlayActive: false });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // 🎯 Memoize dialog to prevent unnecessary re-renders
  const dialog = useMemo(() => TUTORIAL_DIALOGS[tutorialStep] || { lines: [] }, [tutorialStep]);
  const shouldShow = visible && dialog.lines.length > 0 && dialog.fullScreen && !isTransitioning;
  
  // � Swipe right to skip gesture - Instagram story style
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gesture) => {
        // Sağa veya yukarı kaydırma - kolay
        return gesture.dx > 20 || gesture.dy < -20;
      },
      onPanResponderGrant: (evt) => {
        gestureStartY.current = evt.nativeEvent.pageY;
        haptic.light();
      },
      onPanResponderMove: (evt, gesture) => {
        // Sağa veya yukarı kaydırma
        if (gesture.dx > 0 || gesture.dy < 0) {
          const movement = Math.max(gesture.dx, Math.abs(gesture.dy));
          swipeY.setValue(movement);
        }
      },
      onPanResponderRelease: (evt, gesture) => {
        // 80px+ hareket veya hızlı swipe
        const hasMovement = gesture.dx > 80 || Math.abs(gesture.dy) > 80;
        const hasFastSwipe = gesture.vx > 0.6 || Math.abs(gesture.vy) > 0.6;
        
        if (hasMovement || hasFastSwipe) {
          haptic.medium();
          Animated.parallel([
            Animated.timing(swipeY, { toValue: SCREEN_WIDTH, duration: 250, useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(mascotScale, { toValue: 0.5, duration: 250, useNativeDriver: true }),
          ]).start(() => {
            swipeY.setValue(0);
            // Tutorial bitir, Home'a git ve kullanıcı adı modal'ına geç
            setTutorialStep('COMPLETED');
            setTimeout(() => {
              // Home'a navigate et
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              );
              useFarmStore.getState().setShowNicknameModal(true);
            }, 100);
          });
        } else {
          Animated.spring(swipeY, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeY, {
          toValue: 0,
          friction: 7,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // 🎬 Modal ready durumunu geciktir - animasyonlar tamamlansın
  useEffect(() => {
    if (shouldShow && !isReady) {
      const timer = setTimeout(() => setIsReady(true), 20);
      return () => clearTimeout(timer);
    } else if (!shouldShow) {
      setIsReady(false);
      lastAnimatedStep.current = null; // Reset for next time
    }
  }, [shouldShow]);

  useEffect(() => {
    // 🚫 Aynı step için animasyonu tekrar çalıştırma
    if (shouldShow && isReady && lastAnimatedStep.current !== tutorialStep) {
      const isFirstShow = lastAnimatedStep.current === null;
      lastAnimatedStep.current = tutorialStep;
      
      if (isFirstShow) {
        // 🎬 İLK GÖSTERIM - Tüm animasyonları başlat
        overlayOpacity.setValue(0);
        mascotScale.setValue(0.3);
        mascotTranslateY.setValue(50);
        textOpacity.setValue(0);
        textTranslateY.setValue(20);
        buttonScale.setValue(0);
        buttonOpacity.setValue(0);

        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        Animated.parallel([
          Animated.spring(mascotScale, {
            toValue: 1,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.spring(mascotTranslateY, {
            toValue: 0,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();

        setTimeout(() => {
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.spring(textTranslateY, {
              toValue: 0,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }, 200);

        setTimeout(() => {
          Animated.parallel([
            Animated.timing(buttonScale, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.back(1.2)),
              useNativeDriver: true,
            }),
            Animated.timing(buttonOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }, 400);
      } else {
        // 🔄 STEP DEĞİŞİMİ - Sadece text güncelle, buton sabit kalsın
        // Buton zaten görünür, animasyonu sıfırlama!
        overlayOpacity.setValue(1);
        mascotScale.setValue(1);
        mascotTranslateY.setValue(0);
        buttonScale.setValue(1);
        buttonOpacity.setValue(1);
        
        // Sadece text kısa fade
        textOpacity.setValue(0.7);
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }

      const floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -12,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      floatLoop.start();

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      const shimmerLoop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerLoop.start();

      return () => {
        floatLoop.stop();
        pulseLoop.stop();
        shimmerLoop.stop();
      };
    }
  }, [shouldShow, isReady, tutorialStep]);

  const handleCTA = useCallback(() => {
    // 🚫 Zaten geçiş yapılıyorsa çık - çift tıklama önleme
    if (isTransitioning) return;
    
    haptic.medium();
    const action = dialog.ctaAction;
    
    // 🎬 Hemen geçiş moduna al - modal anında kapanır
    setIsTransitioning(true);

    // 💫 Hızlı fade-out animasyonu
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(mascotScale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
    ]).start();

    // ⚡ State değişikliği hemen yap - animasyon bitmesini bekleme
    InteractionManager.runAfterInteractions(() => {
      switch (action) {
        case 'NEXT':
          const steps: TutorialStep[] = [
            'NOT_STARTED', 'STEP_1_WELCOME', 'STEP_2_NO_SEED', 'STEP_3_FIRST_QUIZ',
            'STEP_4_HOME_UNLOCK', 'STEP_5_FARM_ONLY', 'STEP_6_FARM_INTRO', 'STEP_7_MINI_QUIZ',
            'STEP_8_CARD_PROGRESS', 'STEP_9_SWIPE', 'STEP_10_TO_GREEN', 'STEP_11_HARVEST',
            'STEP_12_INVENTORY', 'STEP_13_SELECT_CARD', 'STEP_14_REPLANT', 'STEP_15_MASTER_GRIND',
            'STEP_16_ULTRA_REACHED', 'STEP_17_PERFECT_GRIND', 'STEP_18_PERFECT_DONE',
            'STEP_19_FINAL_QUIZ', 'STEP_19_FINAL_QUIZ_WRONG', 'STEP_20_CELEBRATION', 'COMPLETED'
          ];
          const idx = steps.indexOf(tutorialStep);
          if (idx < steps.length - 1) setTutorialStep(steps[idx + 1]);
          break;
        
        case 'NEXT_FROM_WRONG':
          // Yanlış cevaptan sonra STEP_20'ye atla
          setTutorialStep('STEP_20_CELEBRATION');
          break;
          
        case 'GO_QUIZ':
          setTutorialStep('STEP_3_FIRST_QUIZ');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Quiz' }],
            })
          );
          break;
          
        case 'GO_FARM':
          setTutorialStep('STEP_6_FARM_INTRO');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Farm', params: { filter: 'all' } }],
            })
          );
          break;
          
        case 'WAIT_CARD_TAP':
          setTutorialStep('STEP_7_MINI_QUIZ');
          break;
          
        case 'CONTINUE_FARM':
          // STEP_9 atlandı - direkt quiz'e devam
          setTutorialStep('STEP_7_MINI_QUIZ');
          break;
          
        case 'CONTINUE_QUIZ':
          // STEP_8'den sonra quiz'e devam et (button lock step'i)
          if (tutorialStep === 'STEP_8_CARD_PROGRESS') {
            setTutorialStep('STEP_7_MINI_QUIZ');
          }
          break;
          
        case 'GO_READY_FILTER':
          setTutorialStep('STEP_11_HARVEST');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Farm', params: { filter: 'ready' } }],
            })
          );
          break;
          
        case 'WAIT_HARVEST':
          break;
          
        case 'GO_INVENTORY':
          setTutorialStep('STEP_13_SELECT_CARD');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Inventory' }],
            })
          );
          break;
          
        case 'WAIT_REPLANT':
          // Modal kapanır, kullanıcı "Tarlaya Gönder" butonuna dokununca STEP_14'e geçecek
          break;
          
        case 'GO_PUZZLE':
          setTutorialStep('STEP_15_MASTER_GRIND');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Farm', params: { tab: 'puzzle' } }],
            })
          );
          break;
        
        case 'GO_FARM_FINAL':
          setTutorialStep('STEP_16_ULTRA_REACHED');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Farm' }],
            })
          );
          break;
          
        case 'GO_HOME_FINAL':
          // STEP_14'ten → STEP_16'ya geç (ara step - FarmMascotCloudTip gösterilecek)
          // Zaten Farm'dayız, sadece step değiştir - navigation reset'e gerek yok
          setTutorialStep('STEP_16_ULTRA_REACHED');
          // Kullanıcı CloudTip'te "Anladım" deyince STEP_15'e geçecek
          break;
        
        case 'START_FINAL_QUIZ':
          // 🎯 Ana sayfadan tutorial quiz'i aç (TutorialFinalQuizPremium modal)
          setTutorialStep('STEP_19_FINAL_QUIZ');
          // Home'da kal, quiz modal otomatik açılacak (TutorialFinalQuizPremium component'inden)
          break;
          
        case 'ASK_NICKNAME':
          // 👤 Takma ad modal'ı aç - NicknameModal component'i açılacak
          setTutorialFirstWrongWord(undefined);
          // Önce Home'a git
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
          // Home tamamen render edildikten sonra modal'ı aç
          setTimeout(() => {
            setTutorialStep('COMPLETED');
            useFarmStore.getState().setShowNicknameModal(true); useFarmStore.setState({ tutorialHighlightedWordId: undefined });
          }, 800);
          break;
          
        case 'COMPLETE':
          setTutorialStep('COMPLETED');
          setTutorialFirstWrongWord(undefined); // 🎓 Kırmızı kelimeyi temizle
          useFarmStore.setState({ tutorialHighlightedWordId: undefined }); // 🎓 Yeşil border'ı kaldır
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
          break;
      }
      
      // 🔄 Geçiş bitti - yeni modal gösterilebilir
      setTimeout(() => setIsTransitioning(false), 100);
    });
  }, [isTransitioning, tutorialStep, dialog.ctaAction, navigation, setTutorialStep, setTutorialFirstWrongWord, skipTutorial]);

  if (!shouldShow || !isReady) return null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });
  
  // Swipe right opacity effect - sağa kaydırdıkça solan
  const swipeOpacity = swipeY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={shouldShow} transparent animationType="none" statusBarTranslucent>
      {/* 🚫 Tam ekran blocker - alttaki tüm touchları engelle */}
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View 
          style={[
            styles.fullScreenOverlay, 
            { 
              opacity: overlayOpacity,
            }
          ]}
        >
          <LinearGradient 
            colors={['#000000', '#0a0a0f', '#050510']} 
            style={StyleSheet.absoluteFill} 
        />
        
        {/* 👆 Swipe Hint - Maskot üzerinde */}
        <View style={styles.swipeHintContainer}>
          <View style={styles.swipeHintBar} />
          <Text style={styles.swipeHintText}>Atlamak için maskotu kaydır ↗️</Text>
        </View>
        
        <View style={styles.particlesContainer}>
          {[...Array(8)].map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.particle,
                { 
                  left: `${10 + (i * 12)}%`,
                  top: `${15 + (i % 3) * 25}%`,
                  opacity: 0.1 + (i * 0.05),
                }
              ]} 
            />
          ))}
        </View>

        <Animated.View 
          style={[
            styles.mascotWrapper,
            { 
              transform: [
                { scale: Animated.multiply(mascotScale, pulseAnim) },
                { translateY: Animated.add(mascotTranslateY, floatAnim) },
                { translateX: swipeY }, // Kaydırma animasyonu
              ],
              opacity: swipeY.interpolate({
                inputRange: [0, 200],
                outputRange: [1, 0.3],
                extrapolate: 'clamp',
              }),
            }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.glowRing}>
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.1)', 'transparent']}
              style={styles.glowGradient}
            />
          </View>
          
          <View style={styles.mascotImageContainer}>
            <Image source={MASCOT.image} style={styles.mascotImage} />
            
            <Animated.View 
              style={[
                styles.shimmerOverlay,
                { transform: [{ translateX: shimmerTranslate }] }
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.2)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.nameBadge, { opacity: textOpacity }]}>
          <Sparkles size={14} color="#22c55e" />
          <Text style={styles.nameText}>{MASCOT.name}</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.dialogBox,
            { 
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            }
          ]}
        >
          {dialog.lines.map((line, i) => (
            <Text 
              key={i} 
              style={[
                styles.dialogLine,
                line === '' && styles.dialogLineEmpty,
                line.startsWith('🔴') && styles.dialogLineRed,
                line.startsWith('🟠') && styles.dialogLineOrange,
                line.startsWith('🟡') && styles.dialogLineYellow,
                line.startsWith('🟢') && styles.dialogLineGreen,
                line.startsWith('💎') && styles.dialogLinePurple,
                line.startsWith('👑') && styles.dialogLineGold,
              ]}
            >
              {line}
            </Text>
          ))}
        </Animated.View>

        {dialog.cta && (
          <Animated.View 
            style={[
              styles.ctaWrapper,
              { 
                transform: [{ scale: buttonScale }],
                opacity: buttonOpacity,
              }
            ]}
          >
            <TouchableOpacity onPress={handleCTA} activeOpacity={0.85}>
              <LinearGradient 
                colors={['#22c55e', '#16a34a', '#15803d']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>{dialog.cta}</Text>
                <ChevronRight size={22} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.progressRow}>
          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map((step) => {
            const stepNum = parseInt(tutorialStep.split('_')[1] || '0');
            const isActive = step === stepNum;
            const isPast = step < stepNum;
            return (
              <View 
                key={step} 
                style={[
                  styles.progressDot,
                  isActive && styles.progressDotActive,
                  isPast && styles.progressDotPast,
                ]} 
              />
            );
          })}
        </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

export const TutorialTooltip = memo(({ message, visible, position = 'top' }: { message: string; visible: boolean; position?: 'top' | 'bottom' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.tooltip, position === 'bottom' && styles.tooltipBottom, { opacity: fadeAnim }]}>
      <LinearGradient colors={['rgba(34, 197, 94, 0.95)', 'rgba(22, 163, 74, 0.95)']} style={styles.tooltipContent}>
        <Image source={MASCOT.image} style={styles.tooltipMascot} />
        <Text style={styles.tooltipText}>{message}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

// ☁️ SCREEN CLOUDTIP - Reusable dismissible tip for all screens
export const ScreenCloudTip = memo(({ 
  message, 
  visible, 
  onDismiss,
  accentColor = '#8b5cf6',
}: { 
  message: string; 
  visible: boolean;
  onDismiss: () => void;
  accentColor?: string;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.screenCloudTip,
      { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
    ]}>
      <LinearGradient
        colors={[`${accentColor}22`, `${accentColor}11`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.screenCloudTipGradient, { borderColor: `${accentColor}40` }]}
      >
        <View style={styles.screenCloudTipContent}>
          <Image source={MASCOT.image} style={styles.screenCloudTipMascot} />
          <Text style={styles.screenCloudTipText}>{message}</Text>
          <TouchableOpacity onPress={handleDismiss} style={styles.screenCloudTipClose} activeOpacity={0.7}>
            <Text style={styles.screenCloudTipCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.screenCloudTipTail, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}40` }]} />
      </LinearGradient>
    </Animated.View>
  );
});

// 🎯 QuizMascotTip - Küçük, sağ alt köşede, tutorial bitince kaybolur
export const QuizMascotTip = memo(({ 
  message, 
  visible, 
  variant = 'info',
  position = 'bottom-right' 
}: { 
  message: string; 
  visible: boolean;
  variant?: 'success' | 'encourage' | 'info';
  position?: 'top' | 'bottom-right';
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  
  // Tutorial bitince gösterme
  const shouldShow = visible && tutorialStep !== 'COMPLETED';

  useEffect(() => {
    if (shouldShow) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }).start();
    } else {
      Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  // Variant'a göre renkler
  const colors: [string, string] = variant === 'success' 
    ? ['rgba(34, 197, 94, 0.92)', 'rgba(22, 163, 74, 0.92)']
    : variant === 'encourage'
    ? ['rgba(251, 191, 36, 0.92)', 'rgba(245, 158, 11, 0.92)']
    : ['rgba(59, 130, 246, 0.92)', 'rgba(37, 99, 235, 0.92)'];

  return (
    <Animated.View style={[
      styles.quizMascotMini, 
      position === 'top' && styles.quizMascotTop,
      { transform: [{ scale: scaleAnim }] }
    ]}>
      <LinearGradient colors={colors} style={styles.quizMascotMiniBubble}>
        <Image source={MASCOT.image} style={styles.quizMascotMiniImage} />
        <Text style={styles.quizMascotMiniText} numberOfLines={2}>{message}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

// 🌱 FarmMascotCloudTip - Tarla ekranında STEP_16'da gösterilen cloudtip
export const FarmMascotCloudTip = memo(({ 
  onContinue 
}: { 
  onContinue: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  
  const shouldShow = tutorialStep === 'STEP_16_ULTRA_REACHED';

  useEffect(() => {
    if (shouldShow) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }).start();
    } else {
      Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <Animated.View style={[
      styles.farmCloudTip,
      { transform: [{ scale: scaleAnim }] }
    ]}>
      <LinearGradient 
        colors={['rgba(34, 197, 94, 0.95)', 'rgba(22, 163, 74, 0.95)']} 
        style={styles.farmCloudTipBubble}
      >
        <Image source={MASCOT.image} style={styles.farmCloudTipMascot} />
        <View style={styles.farmCloudTipContent}>
          <Text style={styles.farmCloudTipTitle}>🌱 Master kartın eklendi!</Text>
          <Text style={styles.farmCloudTipText}>
            Kartlarını burada görüntüleyebilir ve çalışabilirsin.
          </Text>
          <TouchableOpacity 
            onPress={onContinue}
            activeOpacity={0.8}
            style={styles.farmCloudTipButton}
          >
            <Text style={styles.farmCloudTipButtonText}>Anladım 👍</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

export const LockTooltip = memo(({ message, visible }: { message: string; visible: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.lockTooltip, { opacity: fadeAnim }]}>
      <Lock size={16} color="#fbbf24" />
      <Text style={styles.lockTooltipText}>{message}</Text>
    </Animated.View>
  );
});

export const useTutorialInit = () => {
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  const farm = useFarmStore(s => s.farm);
  const inventory = useFarmStore(s => s.inventory);

  useEffect(() => {
    if (tutorialStep === 'NOT_STARTED') {
      const isNewUser = farm.length === 0 && inventory.length === 0;
      if (isNewUser) {
        const timer = setTimeout(() => setTutorialStep('STEP_1_WELCOME'), 500);
        return () => clearTimeout(timer);
      } else {
        setTutorialStep('COMPLETED');
      }
    }
  }, [tutorialStep, farm.length, inventory.length, setTutorialStep]);

  return tutorialStep;
};

const styles = StyleSheet.create({
  fullScreenOverlay: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 24,
  },
  swipeHintContainer: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  swipeHintBar: {
    width: 50,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  swipeHintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: IS_SMALL_SCREEN ? 200 : 240,
    height: IS_SMALL_SCREEN ? 200 : 240,
    borderRadius: IS_SMALL_SCREEN ? 100 : 120,
    overflow: 'hidden',
  },
  glowGradient: {
    flex: 1,
  },
  mascotImageContainer: {
    width: IS_SMALL_SCREEN ? 140 : 180,
    height: IS_SMALL_SCREEN ? 140 : 180,
    borderRadius: IS_SMALL_SCREEN ? 70 : 90,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#22c55e',
    backgroundColor: '#0a0a0f',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  nameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: 24,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  dialogBox: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  dialogLine: {
    fontSize: IS_SMALL_SCREEN ? 15 : 17,
    fontWeight: '600',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: IS_SMALL_SCREEN ? 22 : 26,
  },
  dialogLineEmpty: {
    marginBottom: 4,
    height: 8,
  },
  dialogLineRed: { color: '#f87171' },
  dialogLineOrange: { color: '#fb923c' },
  dialogLineYellow: { color: '#facc15' },
  dialogLineGreen: { color: '#4ade80' },
  dialogLinePurple: { color: '#a78bfa' },
  dialogLineGold: { color: '#fbbf24' },
  ctaWrapper: {
    marginBottom: 40,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: IS_SMALL_SCREEN ? 16 : 18,
    paddingHorizontal: 36,
    borderRadius: 28,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    fontSize: IS_SMALL_SCREEN ? 16 : 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    bottom: 50,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotActive: {
    backgroundColor: '#22c55e',
    transform: [{ scale: 1.4 }],
  },
  progressDotPast: {
    backgroundColor: 'rgba(34, 197, 94, 0.5)',
  },
  tooltip: {
    position: 'absolute',
    top: IS_SMALL_SCREEN ? 100 : 120,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  tooltipBottom: {
    top: undefined,
    bottom: IS_SMALL_SCREEN ? 100 : 120,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  tooltipMascot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tooltipText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  quizMascotContainer: {
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  quizMascotBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  quizMascotImage: {
    width: 45,
    height: 45,
    borderRadius: 22,
  },
  quizMascotText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  // 🎯 KÜÇÜK MASKOT TİP - Sağ alt köşe
  quizMascotMini: {
    position: 'absolute',
    bottom: IS_SMALL_SCREEN ? 110 : 130,
    right: 12,
    maxWidth: SCREEN_WIDTH * 0.55,
    zIndex: 999,
  },
  quizMascotTop: {
    bottom: undefined,
    top: IS_SMALL_SCREEN ? 50 : 60,
    right: 12,
    left: 12,
    maxWidth: undefined,
  },
  quizMascotMiniBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  quizMascotMiniImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  quizMascotMiniText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  // ☁️ SCREEN CLOUDTIP - Reusable dismissible tip styles
  screenCloudTip: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  screenCloudTipGradient: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'visible',
  },
  screenCloudTipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingRight: 36,
    gap: 10,
  },
  screenCloudTipMascot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  screenCloudTipText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    lineHeight: 18,
  },
  screenCloudTipClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenCloudTipCloseText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  screenCloudTipTail: {
    position: 'absolute',
    bottom: -7,
    left: 28,
    width: 14,
    height: 14,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  lockTooltip: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    zIndex: 9999,
  },
  lockTooltipText: {
    fontSize: 15,
    color: '#fbbf24',
    fontWeight: '600',
  },
  // 🌱 FARM CLOUD TIP - Tarla ekranında ara step için
  farmCloudTip: {
    position: 'absolute',
    bottom: IS_SMALL_SCREEN ? 180 : 220,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  farmCloudTipBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  farmCloudTipMascot: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  farmCloudTipContent: {
    flex: 1,
    gap: 6,
  },
  farmCloudTipTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '800',
  },
  farmCloudTipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    lineHeight: 18,
  },
  farmCloudTipButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  farmCloudTipButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  // 🎯 NON-FULLSCREEN TIP STYLES
  floatingTip: {
    position: 'absolute',
    bottom: IS_SMALL_SCREEN ? 110 : 130,
    left: 16,
    right: 16,
    zIndex: 9998,
  },
  floatingTipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  floatingTipEmoji: {
    fontSize: 24,
  },
  floatingTipText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 20,
  },
});

//  TUTORIAL SKIP BUTTON - Non-fullscreen tutorial'da tatlı atla butonu
export const TutorialSkipButton = memo(() => {
  const navigation = useNavigation<any>();
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const skipTutorial = useFarmStore(s => s.skipTutorial);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confirmScaleAnim = useRef(new Animated.Value(0.9)).current;
  const confirmOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Tutorial aktif mi ve fullscreen değil mi?
  const dialog = TUTORIAL_DIALOGS[tutorialStep] || { lines: [] };
  const isTutorialActive = tutorialStep !== 'NOT_STARTED' && tutorialStep !== 'COMPLETED';
  const isNonFullScreen = !dialog.fullScreen;
  // STEP_16 için özel durum - FarmMascotCloudTip görünürken de skip butonu göster
  const shouldShow = isTutorialActive && isNonFullScreen && (dialog.lines.length > 0 || tutorialStep === 'STEP_16_ULTRA_REACHED');
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: shouldShow ? 1 : 0,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [shouldShow]);
  
  useEffect(() => {
    if (showConfirm) {
      Animated.parallel([
        Animated.spring(confirmScaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.timing(confirmOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      confirmScaleAnim.setValue(0.9);
      confirmOpacityAnim.setValue(0);
    }
  }, [showConfirm]);
  
  const handleSkipPress = useCallback(() => {
    haptic.light();
    setShowConfirm(true);
  }, []);
  
  const handleConfirmSkip = useCallback(() => {
    haptic.medium();
    setShowConfirm(false);
    skipTutorial();
    useFarmStore.getState().setShowNicknameModal(true);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  }, [skipTutorial, navigation]);
  
  const handleContinue = useCallback(() => {
    haptic.light();
    setShowConfirm(false);
  }, []);
  
  if (!shouldShow && !showConfirm) return null;
  
  return (
    <>
      {/* Tatlı Skip Butonu */}
      <Animated.View style={[skipButtonStyles.container, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity 
          onPress={handleSkipPress}
          activeOpacity={0.7}
          style={skipButtonStyles.button}
        >
          <LinearGradient
            colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.08)']}
            style={skipButtonStyles.gradient}
          >
            <Text style={skipButtonStyles.emoji}>🙈</Text>
            <Text style={skipButtonStyles.text}>Eğitimi Atla</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Onay Modal */}
      <Modal visible={showConfirm} transparent animationType="none" statusBarTranslucent>
        <View style={skipButtonStyles.modalOverlay}>
          <Animated.View style={[skipButtonStyles.modalBackdrop, { opacity: confirmOpacityAnim }]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
          
          <Animated.View style={[
            skipButtonStyles.modalCard,
            { transform: [{ scale: confirmScaleAnim }], opacity: confirmOpacityAnim }
          ]}>
            <LinearGradient
              colors={['#1c1c1e', '#2c2c2e', '#1c1c1e']}
              style={skipButtonStyles.modalGradient}
            >
              {/* Mascot */}
              <View style={skipButtonStyles.mascotWrap}>
                <Image source={MASCOT.image} style={skipButtonStyles.mascot} />
              </View>
              
              {/* Title & Message */}
              <Text style={skipButtonStyles.modalTitle}>🌱 Emin misin?</Text>
              <Text style={skipButtonStyles.modalMessage}>
                Eğitimin bitmesine çok az kaldı!{'\n'}
                Bence devam etsen iyi olur 😊
              </Text>
              
              {/* Progress hint */}
              <View style={skipButtonStyles.progressHint}>
                <Text style={skipButtonStyles.progressText}>
                  ✨ Sistemi tam anlamak için birkaç adım daha var
                </Text>
              </View>
              
              {/* Buttons */}
              <TouchableOpacity 
                onPress={handleContinue}
                activeOpacity={0.85}
                style={skipButtonStyles.continueBtn}
              >
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={skipButtonStyles.continueBtnGradient}
                >
                  <Text style={skipButtonStyles.continueBtnText}>Tamam, Devam! 💪</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleConfirmSkip} style={skipButtonStyles.skipBtn}>
                <Text style={skipButtonStyles.skipBtnText}>Yine de atla 😔</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
});

const skipButtonStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: IS_SMALL_SCREEN ? 50 : 60,
    right: 16,
    zIndex: 9997,
  },
  button: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
  },
  mascotWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mascot: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  progressHint: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
    textAlign: 'center',
  },
  continueBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  continueBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: {
    paddingVertical: 10,
  },
  skipBtnText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});

// 🎯 NON-FULLSCREEN FLOATING TIP - Ekranı kapatmaz, sadece küçük bir ipucu gösterir
export const NonFullScreenTip = memo(({ visible, message, position = 'bottom' }: { visible: boolean; message?: string; position?: 'top' | 'bottom' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  
  const dialog = TUTORIAL_DIALOGS[tutorialStep] || { lines: [] };
  const shouldShow = visible && (message || (dialog.lines.length > 0 && dialog.fullScreen === false));
  const displayMessage = message || dialog.lines.filter(l => l).join(' ');
  const displayEmoji = dialog.emoji || '💡';
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [shouldShow]);
  
  if (!shouldShow) return null;
  
  return (
    <Animated.View style={[styles.floatingTip, position === 'top' && { top: IS_SMALL_SCREEN ? 110 : 130, bottom: 'auto' as any }, { opacity: fadeAnim }]} pointerEvents="none">
      <LinearGradient 
        colors={['rgba(30, 58, 95, 0.95)', 'rgba(26, 46, 74, 0.95)']} 
        style={styles.floatingTipContent}
      >
        <Text style={styles.floatingTipEmoji}>{displayEmoji}</Text>
        <Text style={styles.floatingTipText}>
          {displayMessage}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
});

// 🎯 TUTORIAL FINAL QUIZ DIALOG - Öğrenilen kelimeyi test eder
export const TutorialFinalQuizDialog = memo(({ visible }: { visible: boolean }) => {
  const tutorialStep = useFarmStore(s => s.tutorialStep);
  const tutorialFirstWrongWord = useFarmStore(s => s.tutorialFirstWrongWord);
  const setTutorialStep = useFarmStore(s => s.setTutorialStep);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Yanlış şıkları oluştur
  const wrongOptions = useMemo(() => {
    if (!tutorialFirstWrongWord) return [];
    // Basit yanlış şıklar - gerçek uygulamada pool'dan alınabilir
    const fakeOptions = [
      'yapmak', 'gitmek', 'almak', 'vermek', 'bilmek', 
      'görmek', 'duymak', 'söylemek', 'düşünmek', 'istemek'
    ].filter(opt => opt !== tutorialFirstWrongWord.meaning);
    
    // 3 rastgele yanlış şık seç
    const shuffled = fakeOptions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [tutorialFirstWrongWord]);
  
  // Tüm şıkları karıştır
  const options = useMemo(() => {
    if (!tutorialFirstWrongWord || wrongOptions.length === 0) return [];
    const allOptions = [...wrongOptions, tutorialFirstWrongWord.meaning];
    return allOptions.sort(() => 0.5 - Math.random());
  }, [tutorialFirstWrongWord, wrongOptions]);
  
  const shouldShow = visible && tutorialStep === 'STEP_18_PERFECT_DONE' && tutorialFirstWrongWord;
  
  const handleOptionSelect = useCallback((option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    
    setTimeout(() => {
      if (option === tutorialFirstWrongWord?.meaning) {
        setTutorialStep('STEP_19_FINAL_QUIZ');
      } else {
        setTutorialStep('STEP_19_FINAL_QUIZ_WRONG');
      }
    }, 1500);
  }, [showResult, tutorialFirstWrongWord, setTutorialStep]);
  
  if (!shouldShow || !tutorialFirstWrongWord) return null;
  
  const isCorrect = selectedOption === tutorialFirstWrongWord.meaning;
  
  return (
    <View style={finalQuizStyles.overlay}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.98)', 'rgba(30, 41, 59, 0.98)']}
        style={finalQuizStyles.container}
      >
        {/* Header */}
        <View style={finalQuizStyles.header}>
          <Text style={finalQuizStyles.headerEmoji}>🎯</Text>
          <Text style={finalQuizStyles.headerTitle}>FINAL TESTİ</Text>
          <Text style={finalQuizStyles.headerSubtitle}>Bakalım öğrendin mi?</Text>
        </View>
        
        {/* Soru */}
        <View style={finalQuizStyles.questionContainer}>
          <Text style={finalQuizStyles.wordText}>{tutorialFirstWrongWord.text}</Text>
          <Text style={finalQuizStyles.questionLabel}>Bu kelimenin anlamı nedir?</Text>
        </View>
        
        {/* Şıklar */}
        <View style={finalQuizStyles.optionsContainer}>
          {options.map((option: string, index: number) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option === tutorialFirstWrongWord.meaning;
            
            let optionStyleArr: any[] = [finalQuizStyles.option];
            let textStyleArr: any[] = [finalQuizStyles.optionText];
            
            if (showResult) {
              if (isCorrectOption) {
                optionStyleArr = [finalQuizStyles.option, finalQuizStyles.optionCorrect];
                textStyleArr = [finalQuizStyles.optionText, finalQuizStyles.optionTextCorrect];
              } else if (isSelected && !isCorrectOption) {
                optionStyleArr = [finalQuizStyles.option, finalQuizStyles.optionWrong];
                textStyleArr = [finalQuizStyles.optionText, finalQuizStyles.optionTextWrong];
              }
            } else if (isSelected) {
              optionStyleArr = [finalQuizStyles.option, finalQuizStyles.optionSelected];
            }
            
            return (
              <TouchableOpacity
                key={index}
                style={optionStyleArr}
                onPress={() => handleOptionSelect(option)}
                disabled={showResult}
                activeOpacity={0.7}
              >
                <Text style={finalQuizStyles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={textStyleArr}>{option}</Text>
                {showResult && isCorrectOption && (
                  <Text style={finalQuizStyles.checkMark}>✓</Text>
                )}
                {showResult && isSelected && !isCorrectOption && (
                  <Text style={finalQuizStyles.crossMark}>✗</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Sonuç Mesajı */}
        {showResult && (
          <Animated.View style={finalQuizStyles.resultContainer}>
            <Text style={[
              finalQuizStyles.resultText,
              isCorrect ? finalQuizStyles.resultCorrect : finalQuizStyles.resultWrong
            ]}>
              {isCorrect ? '🎉 Harika! Doğru!' : '💪 Tekrar çalış!'}
            </Text>
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
});

const finalQuizStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  wordText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#a5b4fc',
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionSelected: {
    borderColor: 'rgba(99, 102, 241, 0.6)',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  optionCorrect: {
    borderColor: 'rgba(34, 197, 94, 0.8)',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  optionWrong: {
    borderColor: 'rgba(239, 68, 68, 0.8)',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  optionTextCorrect: {
    color: '#22c55e',
  },
  optionTextWrong: {
    color: '#ef4444',
  },
  checkMark: {
    fontSize: 20,
    color: '#22c55e',
    fontWeight: '700',
  },
  crossMark: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: '700',
  },
  resultContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultCorrect: {
    color: '#22c55e',
  },
  resultWrong: {
    color: '#f59e0b',
  },
});

// 👤 NICKNAME MODAL - Tutorial bitince isim isteme
export const NicknameModal = memo(() => {
  const showNicknameModal = useFarmStore(s => s.showNicknameModal);
  const setShowNicknameModal = useFarmStore(s => s.setShowNicknameModal);
  const setNickname = useFarmStore(s => s.setNickname);
  const [name, setName] = useState('');
  
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (showNicknameModal) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [showNicknameModal]);
  
  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      Alert.alert('Hata', 'Takma ad en az 2 karakter olmalı.');
      return;
    }
    if (trimmedName.length > 15) {
      Alert.alert('Hata', 'Takma ad en fazla 15 karakter olabilir.');
      return;
    }
    if (!isNicknameClean(trimmedName)) {
      Alert.alert('Uygunsuz İsim', 'Bu isim uygunsuz ifade içeriyor. Lütfen farklı bir ad seçin.');
      return;
    }

    haptic.medium();
    setNickname(trimmedName);
    setShowNicknameModal(false);
  }, [name, setNickname, setShowNicknameModal]);
  
  if (!showNicknameModal) return null;
  
  return (
    <Modal
      visible={showNicknameModal}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={nicknameStyles.container}
      >
        <Animated.View style={[nicknameStyles.backdrop, { opacity: opacityAnim }]}>
          {/* 🚫 Arka plana tıklayınca kapanmasın - Zorunlu giriş */}
          <View style={StyleSheet.absoluteFill} />
        </Animated.View>
        
        <Animated.View style={[
          nicknameStyles.card,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
        ]}>
          <LinearGradient
            colors={['#1c1c1e', '#2c2c2e', '#1c1c1e']}
            style={nicknameStyles.cardGradient}
          >
            {/* Mascot */}
            <View style={nicknameStyles.mascotWrap}>
              <Image source={MASCOT_IMAGE} style={nicknameStyles.mascot} />
            </View>
            
            {/* Title */}
            <Text style={nicknameStyles.title}>🎉 Tebrikler!</Text>
            <Text style={nicknameStyles.subtitle}>Tutorial'ı tamamladın!</Text>
            <Text style={nicknameStyles.subtitle}>Sana nasıl hitap edelim?</Text>
            
            {/* Input */}
            <View style={nicknameStyles.inputWrap}>
              <User size={20} color="#888" />
              <TextInput
                style={nicknameStyles.input}
                placeholder="Takma adın..."
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
                maxLength={15}
                autoFocus
              />
            </View>
            
            {/* Buttons */}
            <TouchableOpacity 
              onPress={handleSave} 
              style={[nicknameStyles.saveBtn, name.trim().length === 0 && { opacity: 0.5 }]}
              disabled={name.trim().length === 0}
            >
              <LinearGradient
                colors={name.trim().length > 0 ? ['#22c55e', '#16a34a'] : ['#444', '#333']}
                style={nicknameStyles.saveBtnGradient}
              >
                <Text style={nicknameStyles.saveBtnText}>Kaydet ✓</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const nicknameStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
  },
  mascotWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mascot: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  saveBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  saveBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default TutorialOverlay;
