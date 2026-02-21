import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
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
  ImageBackground,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { CommonActions, useFocusEffect, useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Coins,
  Award,
  Flame,
  ChevronRight,
} from "lucide-react-native";
import { Asset } from "expo-asset";
import { useFarmStore } from "../store/farmStore";
import { usePerformanceStore } from "../store/performanceStore";
import { sound, haptic } from "../utils/sound";
import { RewardToastContainer } from "../components/RewardToast";
import { MiniQuizDialog } from "../components/MiniQuizDialog";
import { DailyQuestsPanel } from "../components/DailyQuestsPanel";
import { CardShopPanel } from "../components/CardShopPanel";
import JuicyModal from "../components/JuicyModal";
import {
  TutorialFinalQuizDialog,
  NicknameModal,
  TUTORIAL_DIALOGS,
} from "../components/TutorialManagerFixed";
import { TutorialFinalQuizPremium } from "../components/TutorialFinalQuizPremium";
import {
  configureNotifications,
  getNotificationPermission,
  hasPromptedNotificationPermission,
  markNotificationPermissionPrompted,
  requestNotificationPermission,
  scheduleComebackNotifications,
  scheduleNotificationPreview,
} from "../utils/notifications";
import { estimateCefrLevel } from "../utils/cefrEstimator";
import { normalizeDisplayText } from "../utils/textNormalization";
import { traceEvent } from "../utils/debugTrace";
import { getCardHeaderThemePreset } from "../data/cardThemes";
import NetInfo from "@react-native-community/netinfo";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 📱 RESPONSIVE SİSTEM - Apple Style
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const IS_MEDIUM_DEVICE = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850;
const IS_TABLET_DEVICE = SCREEN_WIDTH >= 768;
const IS_LARGE_TABLET = SCREEN_WIDTH >= 1024;
const IS_NARROW_DEVICE = SCREEN_WIDTH <= 430;

// Grid card sizes based on screen
const GRID_GAP = 8;
const CARD_BORDER_RADIUS = 20;
const LARGE_CARD_FLEX = 2;
const SMALL_CARD_FLEX = 1;

// Premium spacing values - Apple Human Interface Guidelines inspired
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

let homeVisualsPreloaded = false;

// 🖼️ PRELOAD ALL IMAGES - Optimized webp format for fast loading
const PRELOADED_IMAGES = {
  logo: require("../../assets/logo.webp"),
  quiz: require("../../assets/images/maskot/yeniTasar\u0131mlar/Quiz.webp"),
  farm: require("../../assets/images/maskot/yeniTasar\u0131mlar/Ciftlik.webp"),
  envanter: require("../../assets/images/maskot/yeniTasar\u0131mlar/Envanter.webp"),
  puzzle: require("../../assets/images/maskot/yeniTasar\u0131mlar/Puzzle.webp"),
  phrasal: require("../../assets/images/maskot/phrasal.webp"),
  soruIsareti: require("../../assets/images/maskot/soru_isareti.webp"),
  market: require("../../assets/images/maskot/market_anasayfa.webp"),
  cardShop: require("../../assets/images/maskot/yeniTasar\u0131mlar/KartPazari.webp"),
  battle: require("../../assets/images/maskot/yeniTasar\u0131mlar/Savas.webp"),
  sesyap: require("../../assets/images/maskot/yeniTasar\u0131mlar/SesYap.webp"),
  pratik: require("../../assets/images/maskot/yeniTasar\u0131mlar/PratikMerkezi.webp"),
  customWord: require("../../assets/images/maskot/yeniTasar\u0131mlar/yfxnanurut0zfbr7p3vy.webp"),
  // Market/Store visual assets
  marketGuc: require("../../assets/images/maskot/guc_magazasi.webp"),
  marketTohum: require("../../assets/images/maskot/tohum_pazar\u0131.webp"),
};

// Premium Header with Logo - FULL COVERAGE
const PremiumHeader = ({ coins, level, streak, onProfilePress, themePreset }: any) => {
  const config = usePerformanceStore(s => s.config);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0.3)).current;
  const headerTheme = themePreset || getCardHeaderThemePreset();

  useEffect(() => {
    let shimmerLoop: Animated.CompositeAnimation | null = null;
    let logoGlowLoop: Animated.CompositeAnimation | null = null;

    if (config.enableShimmer) {
      shimmerLoop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      );
      shimmerLoop.start();
    } else {
      shimmerAnim.setValue(0);
    }

    if (config.enablePulseAnimations) {
      logoGlowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(logoGlow, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(logoGlow, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );
      logoGlowLoop.start();
    } else {
      logoGlow.setValue(0.3);
    }

    return () => {
      shimmerLoop?.stop();
      logoGlowLoop?.stop();
    };
  }, [config.enableShimmer, config.enablePulseAnimations, shimmerAnim, logoGlow]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View style={styles.premiumHeader}>
      <LinearGradient
        colors={headerTheme.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.headerFrame,
          IS_NARROW_DEVICE && styles.headerFrameCompact,
          { borderColor: headerTheme.headerBorderColor },
        ]}
      >
        <LinearGradient
          colors={headerTheme.headerGlowGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerFrameGlow}
          pointerEvents="none"
        />

        <Pressable
          onPress={onProfilePress}
          style={[styles.headerLeftSection, IS_NARROW_DEVICE && styles.headerLeftSectionCompact]}
        >
          <LinearGradient
            colors={headerTheme.brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.brandChip,
              IS_NARROW_DEVICE && styles.brandChipCompact,
              { borderColor: headerTheme.brandBorderColor },
            ]}
          >
            <View style={styles.logoWrapper}>
              {config.enableGlow && (
                <Animated.View
                  style={[
                    styles.logoGlow,
                    {
                      opacity: logoGlow,
                      backgroundColor: headerTheme.logoGlowColor,
                      shadowColor: headerTheme.logoGlowColor,
                    },
                  ]}
                />
              )}
              <View style={[styles.logoContainer, IS_NARROW_DEVICE && styles.logoContainerCompact]}>
                <Image
                  source={PRELOADED_IMAGES.logo}
                  style={styles.logoImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={0}
                />
              </View>
            </View>
            <View
              style={[
                styles.headerTitleContainer,
                IS_NARROW_DEVICE && styles.headerTitleContainerCompact,
              ]}
            >
              <Text
                style={[styles.headerTitle, IS_NARROW_DEVICE && styles.headerTitleCompact]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                FarmEnglish
              </Text>
              <Text
                style={[styles.headerSubtitle, IS_NARROW_DEVICE && styles.headerSubtitleCompact]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Kelime Çiftliğin
              </Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={[styles.headerRightSection, IS_NARROW_DEVICE && styles.headerRightSectionCompact]}>
          <LinearGradient
            colors={["rgba(255, 215, 0, 0.26)", "rgba(250, 204, 21, 0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.statPill,
              styles.coinPill,
              IS_NARROW_DEVICE && styles.statPillCompact,
            ]}
          >
            {config.enableShimmer && (
              <Animated.View
                style={[
                  styles.pillShimmer,
                  { transform: [{ translateX: shimmerTranslate }] },
                ]}
              />
            )}
            <Coins color="#FDE047" size={IS_NARROW_DEVICE ? 14 : 16} strokeWidth={2.5} />
            <Text style={[styles.statPillText, IS_NARROW_DEVICE && styles.statPillTextCompact]}>
              {coins >= 10000
                ? `${(coins / 1000).toFixed(0)}k`
                : coins >= 1000
                  ? `${(coins / 1000).toFixed(1)}k`
                  : coins}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={["rgba(245, 158, 11, 0.26)", "rgba(251, 191, 36, 0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.statPill,
              styles.levelPill,
              IS_NARROW_DEVICE && styles.statPillCompact,
            ]}
          >
            <Award color="#FBBF24" size={IS_NARROW_DEVICE ? 14 : 16} strokeWidth={2.5} />
            <Text
              style={[
                styles.statPillText,
                styles.levelPillText,
                IS_NARROW_DEVICE && styles.statPillTextCompact,
              ]}
            >
              {level}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={["rgba(249, 115, 22, 0.26)", "rgba(245, 158, 11, 0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.statPill,
              styles.streakPill,
              IS_NARROW_DEVICE && styles.statPillCompact,
            ]}
          >
            <Flame color="#FB923C" size={IS_NARROW_DEVICE ? 14 : 16} strokeWidth={2.5} />
            <Text
              style={[
                styles.statPillText,
                styles.streakPillText,
                IS_NARROW_DEVICE && styles.statPillTextCompact,
              ]}
            >
              {Math.max(0, Number(streak || 0))}
            </Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
};
const TutorialDialog = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      icon: "\u{1F44B}",
      title: "Hoş Geldin Farmer!",
      description:
        "FarmEnglish ile kelime öğrenme döngüsü basit: quiz çöz, tarlaya ek, çalış, hasat et, envanterden tekrar tarlaya gönder.",
      color: "#22C55E",
      tip: "Her kelime bir tohum gibi büyür.",
    },
    {
      icon: "\u{1F3AF}",
      title: "1. Quiz ile Başla",
      description:
        "Quiz'de doğru seçersen kartın güçlü başlar. Yanlış seçersen tohum olarak ekilir ve çalıştıkça gelişir.",
      color: "#A855F7",
      tip: "Bilmediğin kelimeler de sistemli şekilde tarlana eklenir.",
    },
    {
      icon: "\u{1F33F}",
      title: "2. Çiftlikte Büyüt",
      description:
        "Çiftlikte kartlar çalışıldıkça ilerler. Kırmızı kartlar daha fazla tekrar ister, yeşiller hasada daha yakındır.",
      color: "#F97316",
      tip: "Kısa ama düzenli tekrar en hızlı gelişimi verir.",
    },
    {
      icon: "\u{1F69C}",
      title: "3. Hasat Et",
      description:
        "Olgunlaşan kartları hasat ederek envantere alırsın. Sonra tekrar tarlaya gönderip seviyeyi yükseltebilirsin.",
      color: "#22C55E",
      tip: "Döngü: büyüt -> hasat et -> geliştir -> öğren.",
    },
    {
      icon: "\u{1F525}",
      title: "4. Combo Bonus",
      description:
        "Ardışık doğru cevaplar combo oluşturur. Combo arttıkça coin ve XP kazancı da artar.",
      color: "#EF4444",
      tip: "Yanlışlar comboyu kırabilir; dikkatli ve hızlı oyna.",
    },
    {
      icon: "\u{1F4E6}",
      title: "5. Envanter",
      description:
        "Hasat edilen kartlar envanterde tutulur. Buradan tarlaya geri göndererek öğrenme sürecini devam ettirirsin.",
      color: "#60A5FA",
      tip: "Tekrar ekilen kartlar kaldığı seviyeden devam eder.",
    },
    {
      icon: "\u{1F9E9}",
      title: "6. Puzzle",
      description:
        "Cümle parçalarını doğru sıraya diz. 5300+ örnek cümleyle bağlam içinde öğrenmeyi güçlendir.",
      color: "#EC4899",
      tip: "Kelimeleri cümle içinde görmek kalıcılığı ciddi artırır.",
    },
    {
      icon: "\u{1F517}",
      title: "7. Phrasal Verbs",
      description:
        "Give up, look after gibi yapilar icin ayri calisma akivar. Gundelik Ingilizce icin kritik bir bolum.",
      color: "#10B981",
      tip: "Kısa tekrarlar akıcılığı hızlandırır.",
    },
    {
      icon: "\u{1F6D2}",
      title: "8. Market",
      description:
        "Coin ile güçlendirme ve tohum satın alabilirsin. Kazandığın coinleri stratejik kullan.",
      color: "#FBBF24",
      tip: "Doğru cevaplar uzun vadede güçlü ekonomi kurar.",
    },
    {
      icon: "\u{1F4A1}",
      title: "9. Performans Ayarları",
      description:
        "Cihazına göre efekt seviyesini ayarlayabilirsin: düşük, orta veya yüksek.",
      color: "#64748B",
      tip: "Kasma hissedersen bir seviye düşür.",
    },
    {
      icon: "\u{1F680}",
      title: "Hazırsın!",
      description:
        "Şimdi Quiz'e gir ve ilk hedefini koy: 3 kartı yeşile getirip hasat et.",
      color: "#22C55E",
      tip: "Her gün kısa ve düzenli çalışma en hızlı ilerlemeyi verir.",
    },
  ];

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNext = () => {
    haptic.light();
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    haptic.light();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentTutorial = tutorialSteps[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={tutorialStyles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            tutorialStyles.container,
            {
              transform: [
                {
                  scale: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: slideAnim,
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header Glow */}
            <View
              style={[
                tutorialStyles.iconGlow,
                { backgroundColor: currentTutorial.color },
              ]}
            />

            {/* Close Button */}
            <TouchableOpacity
              style={tutorialStyles.closeButton}
              onPress={onClose}
            >
              <Text style={tutorialStyles.closeButtonText}>{'\\u2715'}</Text>
            </TouchableOpacity>

            {/* Icon */}
            <View style={tutorialStyles.iconContainer}>
              <Text style={tutorialStyles.icon}>{normalizeDisplayText(currentTutorial.icon)}</Text>
            </View>

            {/* Content */}
            <Text
              style={[tutorialStyles.title, { color: currentTutorial.color }]}
            >
              {normalizeDisplayText(currentTutorial.title)}
            </Text>
            <Text style={tutorialStyles.description}>
              {normalizeDisplayText(currentTutorial.description)}
            </Text>

            {/* Tip Box */}
            {!!currentTutorial.tip && (
              <View
                style={[
                  tutorialStyles.tipBox,
                  { borderColor: currentTutorial.color },
                ]}
                >
                  <Text style={tutorialStyles.tipText}>
                    {normalizeDisplayText(currentTutorial.tip)}
                  </Text>
                </View>
              )}

            {/* Progress Dots */}
            <View style={tutorialStyles.dotsContainer}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    tutorialStyles.dot,
                    index === currentStep && {
                      backgroundColor: currentTutorial.color,
                      width: 24,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Navigation Buttons */}
            <View style={tutorialStyles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={tutorialStyles.prevButton}
                  onPress={handlePrev}
                >
                  <Text style={tutorialStyles.prevButtonText}>Geri</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  tutorialStyles.nextButton,
                  { backgroundColor: currentTutorial.color },
                ]}
                onPress={handleNext}
              >
                <Text style={tutorialStyles.nextButtonText}>
                  {currentStep === tutorialSteps.length - 1
                    ? "Başla!"
                    : "İleri"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step Counter */}
            <Text style={tutorialStyles.stepCounter}>
              {currentStep + 1} / {tutorialSteps.length}
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const tutorialStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#1A1A24",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 25,
    overflow: "hidden",
  },
  iconGlow: {
    position: "absolute",
    top: -80,
    left: "50%",
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  closeButton: {
    position: "absolute",
    top: -12,
    right: -12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 18,
    fontWeight: "600",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  icon: {
    fontSize: 52,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tipBox: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  tipText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontStyle: "italic",
    textAlign: "left",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  prevButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  prevButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 15,
    fontWeight: "700",
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  stepCounter: {
    marginTop: 16,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "600",
  },
});

// 🎥 PREMIUM MENU CARD - Full Image Coverage + Shine + Glow + Bounce
const PremiumMenuCard = ({
  onPress,
  imageSource,
  title,
  subtitle,
  size = "medium",
  textAlign = "left",
  imageFit = "cover",
  imagePosition,
  hideImage = false,
  accentColor = "#FFFFFF",
  delay = 0,
  hasBounce = false,
  helpText,
  onHelpPress,
  disableEffects = false,
  wrapperStyleOverride,
}: any) => {
  const config = usePerformanceStore(s => s.config);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let fadeInAnimation: Animated.CompositeAnimation | null = null;
    let shineLoop: Animated.CompositeAnimation | null = null;
    let glowLoop: Animated.CompositeAnimation | null = null;
    let bounceLoop: Animated.CompositeAnimation | null = null;

    // Fade in - only if card entry animations enabled
    if (config.enableCardEntryAnimation && !disableEffects) {
      fadeInAnimation = Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      });
      fadeInAnimation.start();
    } else {
      opacityAnim.setValue(1);
    }

    // Shine effect - only if shimmer enabled
    if (config.enableShimmer && !disableEffects) {
      shineLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
          Animated.timing(shineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      shineLoop.start();
    } else {
      shineAnim.setValue(0);
    }

    // Glow pulse - only if glow and pulse enabled
    if (config.enableGlow && config.enablePulseAnimations && !disableEffects) {
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      glowLoop.start();
    } else {
      glowAnim.setValue(0.4);
    }

    // Bounce for Quiz and Farm - only if pulse enabled
    if (hasBounce && config.enablePulseAnimations && !disableEffects) {
      bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.03,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      bounceLoop.start();
    } else {
      bounceAnim.setValue(1);
    }

    return () => {
      fadeInAnimation?.stop();
      shineLoop?.stop();
      glowLoop?.stop();
      bounceLoop?.stop();
    };
  }, [
    config.enableCardEntryAnimation,
    config.enableShimmer,
    config.enableGlow,
    config.enablePulseAnimations,
    delay,
    hasBounce,
    disableEffects,
    opacityAnim,
    shineAnim,
    glowAnim,
    bounceAnim,
  ]);

  const handlePressIn = () => {
    haptic.medium();
    if (config.enableButtonScale) {
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        friction: 5,
        tension: 400,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (config.enableButtonScale) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 300,
      }).start();
    }
  };

  const cardHeight = (() => {
    if (size === "halfSquare") {
      const base = Math.floor((SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2);
      if (IS_LARGE_TABLET) return Math.max(220, Math.min(300, base));
      if (IS_TABLET_DEVICE) return Math.max(190, Math.min(260, base));
      return IS_SMALL_DEVICE ? Math.max(146, Math.min(176, base)) : Math.max(160, Math.min(196, base));
    }
    if (size === "wideXXL") {
      const horizontalInset = IS_TABLET_DEVICE ? 44 : 24;
      const availableWidth = SCREEN_WIDTH - horizontalInset;
      const responsiveHeight = Math.round(availableWidth * (IS_TABLET_DEVICE ? 0.58 : 0.72));
      if (IS_LARGE_TABLET) return Math.max(300, Math.min(380, responsiveHeight));
      if (IS_TABLET_DEVICE) return Math.max(258, Math.min(332, responsiveHeight));
      return IS_SMALL_DEVICE ? Math.max(214, Math.min(272, responsiveHeight)) : Math.max(232, Math.min(292, responsiveHeight));
    }
    if (size === "wideXL") {
      if (IS_LARGE_TABLET) return 264;
      if (IS_TABLET_DEVICE) return 236;
      return IS_SMALL_DEVICE ? 184 : 208;
    }
    if (size === "wide") {
      if (IS_LARGE_TABLET) return 236;
      if (IS_TABLET_DEVICE) return 214;
      return IS_SMALL_DEVICE ? 166 : 188;
    }
    if (IS_LARGE_TABLET) {
      return size === "medium" ? 300 : 340;
    }
    if (IS_TABLET_DEVICE) {
      return size === "medium" ? 260 : 296;
    }
    if (size === "large" || size === "small") {
      return IS_SMALL_DEVICE ? 212 : 236;
    }
    return IS_SMALL_DEVICE ? 198 : 222;
  })();

  const cardWidth = (() => {
    if (size === "halfSquare") {
      return Math.floor((SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2);
    }
    if (size === "wideXXL" || size === "wideXL" || size === "wide") {
      const horizontalInset = IS_TABLET_DEVICE ? 44 : 24;
      return Math.max(280, SCREEN_WIDTH - horizontalInset);
    }
    return Math.floor((SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2);
  })();
  const isHeroShineCard = size === "wideXXL";
  const shineBandWidth = isHeroShineCard ? 42 : 80;
  const shineBandHeight = isHeroShineCard ? cardHeight + 88 : 300;
  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isHeroShineCard
      ? [-(cardWidth + shineBandWidth), cardWidth + shineBandWidth]
      : [-200, 300],
  });

  const wrapperStyle =
    size === "large"
      ? styles.cardWrapperLarge
      : size === "halfSquare"
        ? styles.cardWrapperMedium
      : size === "wideXXL"
        ? styles.cardWrapperWide
      : size === "wideXL"
        ? styles.cardWrapperWide
      : size === "wide"
        ? styles.cardWrapperWide
      : size === "small"
        ? styles.cardWrapperSmall
        : styles.cardWrapperMedium;
  const safeTitle = normalizeDisplayText(title);
  const safeSubtitle = normalizeDisplayText(subtitle);
  const safeHelpText = normalizeDisplayText(helpText);
  const normalizedTitleUpper = safeTitle.toLocaleUpperCase("tr-TR");
  const normalizedTitleAscii = normalizedTitleUpper
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, "");
  const imageContentPosition =
    imagePosition ||
    (normalizedTitleAscii.includes("CIFTLIK") ||
    normalizedTitleAscii.includes("SESYAP")
      ? "top"
      : "center");
  const contentContainerStyle = hideImage
    ? styles.cardTextContainerCenteredFill
    : textAlign === "center"
      ? styles.cardTextContainerCentered
      : styles.cardTextContainer;
  const overlayColors: readonly [string, string, string] = hideImage
    ? ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.35)"]
    : ["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"];

  return (
    <Animated.View
      style={[
        wrapperStyle,
        {
          transform: [{ scale: scaleAnim }, { scale: bounceAnim }],
          opacity: opacityAnim,
        },
        wrapperStyleOverride,
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[styles.cardContainer, { height: cardHeight }]}
      >
        {/* Outer Glow - only if enabled */}
        {config.enableGlow && !disableEffects && (
          <Animated.View
            style={[
              styles.outerGlow,
              {
                backgroundColor: accentColor,
                opacity: glowAnim,
                shadowColor: accentColor,
              },
            ]}
          />
        )}

        {/* Card Background with Gradient Border */}
        <LinearGradient
          colors={[`${accentColor}40`, `${accentColor}15`, `${accentColor}05`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          {/* Inner Card */}
          <View style={styles.innerCard}>
            {/* Background Image - FULL COVERAGE */}
            {!hideImage && imageSource ? (
              <Image
                source={imageSource}
                style={styles.fullImageCover}
                contentFit={imageFit}
                contentPosition={imageContentPosition}
                cachePolicy="memory-disk"
                priority="high"
                transition={0}
              />
            ) : (
              <LinearGradient
                colors={[`${accentColor}66`, `${accentColor}26`, "rgba(15, 23, 42, 0.95)"]}
                style={styles.fullImageCover}
              />
            )}

            {/* Gradient Overlay for Text Readability */}
            <LinearGradient
              colors={overlayColors}
              style={styles.imageOverlay}
            />

            {/* Shine Effect - only if enabled */}
            {config.enableShimmer && (
              <Animated.View
                style={[
                  styles.shineEffect,
                  {
                    top: isHeroShineCard ? -Math.round(shineBandHeight * 0.28) : -50,
                    width: shineBandWidth,
                    height: shineBandHeight,
                    backgroundColor: isHeroShineCard
                      ? "rgba(255, 255, 255, 0.10)"
                      : "rgba(255, 255, 255, 0.15)",
                    transform: [
                      { translateX: shineTranslate },
                      { rotate: isHeroShineCard ? "18deg" : "25deg" },
                    ],
                  },
                ]}
              />
            )}

            {/*  Help Icon - Top Right */}
            {helpText && (
              <TouchableOpacity
                style={styles.helpIconContainer}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation?.();
                  haptic.light();
                  if (typeof onHelpPress === "function") {
                    onHelpPress(safeTitle || "Bilgi", safeHelpText);
                  } else {
                    Alert.alert(safeTitle || "Bilgi", safeHelpText);
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.helpIconText}>?</Text>
              </TouchableOpacity>
            )}

            {/* Content */}
            {(safeTitle || safeSubtitle) && (
              <View style={contentContainerStyle}>
                {safeTitle && (
                  <Text style={[styles.cardTitle, textAlign === "center" && styles.cardTitleCentered, hideImage && styles.cardTitleHero, { color: accentColor }]}>
                    {safeTitle}
                  </Text>
                )}
                {safeSubtitle && (
                  <Text style={[styles.cardSubtitle, textAlign === "center" && styles.cardSubtitleCentered, hideImage && styles.cardSubtitleHero]}>{safeSubtitle}</Text>
                )}
              </View>
            )}
          </View>
        </LinearGradient>
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
  onRandomPress,
  onMarketPress,
  onBattlePress,
  onSesYapPress,
  onHelpPress,
  disableEffects = false,
}: any) => {
  return (
    <View style={styles.gridContainer}>
      {/* Row 1: QUIZ (large) | ? (small) */}
      <View style={styles.gridRow}>
        <PremiumMenuCard
          onPress={onQuizPress}
          imageSource={PRELOADED_IMAGES.quiz}
          title="QUIZ"
          subtitle="Kelime topla tarlana ek!"
          size="large"
          accentColor="#A855F7"
          delay={0}
          hasBounce={true}
          disableEffects={disableEffects}
          onHelpPress={onHelpPress}
          helpText="Quiz çözdürüp tarlana otomatik ekim yaparsın. Bilmediklerin tohum olur, çalıştıkça büyür. Bildiklerin ise otomatik meyve olarak ekilir."
        />
        <PremiumMenuCard
          onPress={onRandomPress}
          imageSource={PRELOADED_IMAGES.soruIsareti}
          title="NASIL?"
          subtitle="Oynanır"
          size="small"
          accentColor="#FBBF24"
          delay={50}
          disableEffects={disableEffects}
        />
      </View>

      {/* Row 2: ENVANTER (small) | FARM (large) */}
      <View style={styles.gridRow}>
        <PremiumMenuCard
          onPress={onInventoryPress}
          imageSource={PRELOADED_IMAGES.envanter}
          title="ENVANTER"
          subtitle="Hasat Hazır"
          size="small"
          accentColor="#60A5FA"
          delay={100}
          disableEffects={disableEffects}
          onHelpPress={onHelpPress}
          helpText="Hasatlarını buradan yönetirsin. Burası senin koleksiyon ve takip yerindir. Tekrar çalışmak istediğin kelimeyi buradan tekrar tarlana dikip çalışabilir, elde ettiğin hasatları güçlendirebilirsin!"
        />
        <PremiumMenuCard
          onPress={onFarmPress}
          imageSource={PRELOADED_IMAGES.farm}
          title="ÇİFTLİK"
          subtitle="Kelimelerini büyüt, hasat et!"
          size="large"
          accentColor="#22C55E"
          delay={150}
          hasBounce={true}
          disableEffects={disableEffects}
          onHelpPress={onHelpPress}
          helpText="Kelimelerini burada büyütür, hasat eder ve görsel geri bildirimle kalıcı öğrenme sağlarsın."
        />
      </View>

      {/* Row 3: PUZZLE | PHRASAL */}
      <View style={styles.gridRow}>
        <PremiumMenuCard
          onPress={onPuzzlePress}
          imageSource={PRELOADED_IMAGES.puzzle}
          title="PUZZLE"
          subtitle="Cümle pratiği"
          size="medium"
          accentColor="#F97316"
          delay={200}
          disableEffects={disableEffects}
          onHelpPress={onHelpPress}
          helpText="Cümledeki kelimeleri doğru sıraya diz. 5300+ örnek cümle ile pratik yap."
        />
        <PremiumMenuCard
          onPress={onPhrasalPress}
          imageSource={PRELOADED_IMAGES.phrasal}
          title="PHRASAL"
          subtitle="Deyimleri öğren"
          size="medium"
          accentColor="#EC4899"
          delay={250}
          disableEffects={disableEffects}
          onHelpPress={onHelpPress}
          helpText="Give up, look after gibi deyimsel fiilleri öğren. Ayrıca tarla ve quiz akışı bulunur."
        />
      </View>

      {/* Row 4: BATTLE - Savaş Modu Butonu */}
      <TouchableOpacity
        style={[styles.marketContainer, { marginBottom: SPACING.md, height: IS_LARGE_TABLET ? 360 : IS_TABLET_DEVICE ? 300 : IS_SMALL_DEVICE ? 210 : 240 }]}
        onPress={onBattlePress}
        activeOpacity={0.9}
      >
        <Image
          source={PRELOADED_IMAGES.battle}
          style={styles.marketFullImage}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.80)"]}
          locations={[0, 0.4, 0.75, 1]}
          style={styles.marketOverlay}
        />

        {/* Content */}
        <View style={[styles.marketContent, { alignItems: "flex-end", paddingBottom: 18 }]}>
          <View style={styles.marketTextContainer}>
            <Text style={styles.marketTitle}>SAVAŞ MODU</Text>
            <Text style={styles.marketSubtitle}>
              Rakiplerle yarış • Liderlik tablosu • Ödüller
            </Text>
          </View>
          <ChevronRight size={24} color="#c4b5fd" />
        </View>
      </TouchableOpacity>

      {/* Row 5: SesYap - Konuşma Modu */}
      <TouchableOpacity
        style={[styles.marketContainer, { marginBottom: SPACING.md }]}
        onPress={onSesYapPress}
        activeOpacity={0.9}
      >
        <Image
          source={PRELOADED_IMAGES.sesyap}
          style={styles.marketFullImage}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.65)"]}
          style={styles.marketOverlay}
        />

        {/* Content */}
        <View style={styles.marketContent}>
          <View style={styles.marketTextContainer}>
            <Text style={styles.marketTitle}>SESYAP</Text>
            <Text style={styles.marketSubtitle}>
              Konuş • Doğruluk kontrolü • Telaffuz pratiği
            </Text>
          </View>
          <ChevronRight size={24} color="#5EEAD4" />
        </View>
      </TouchableOpacity>

      {/* Row 5: MARKET - Tam genişlikte, Premium Görünüm */}
      <TouchableOpacity
        style={styles.marketContainer}
        onPress={onMarketPress}
        activeOpacity={0.9}
      >
        {/* Background Image - FULL COVERAGE */}
        <Image
          source={PRELOADED_IMAGES.market}
          style={styles.marketFullImage}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />

        {/* Gradient Overlay for Text Readability */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
          style={styles.marketOverlay}
        />

        {/* Content */}
        <View style={styles.marketContent}>
          <View style={styles.marketTextContainer}>
            <Text style={styles.marketTitle}>MARKET</Text>
            <Text style={styles.marketSubtitle}>
              Güçlen • Tohum Pazarı • Güç Mağazası
            </Text>
          </View>
          <ChevronRight size={24} color="#a78bfa" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const isHomeFocused = useIsFocused();
  const farm = useFarmStore((state) =>
    Array.isArray(state.farm) ? state.farm : [],
  );
  const inventory = useFarmStore((state) =>
    Array.isArray(state.inventory) ? state.inventory : [],
  );
  const phrasalVerbFarm = useFarmStore((state) =>
    Array.isArray(state.phrasalVerbFarm) ? state.phrasalVerbFarm : [],
  );
  const phrasalVerbInventory = useFarmStore(
    (state) =>
      Array.isArray(state.phrasalVerbInventory) ? state.phrasalVerbInventory : [],
  );
  const pool = useFarmStore((state) => (Array.isArray(state.pool) ? state.pool : []));
  const xp = useFarmStore((state) => state.xp);
  const level = useFarmStore((state) => state.level);
  const coins = useFarmStore((state) => state.coins);
  const totalCorrect = useFarmStore((state) => state.totalCorrect);
  const totalWrong = useFarmStore((state) => state.totalWrong);
  const lifetimeQuizAnswered = useFarmStore((state) => state.lifetimeQuizAnswered);
  const lifetimePuzzlesCompleted = useFarmStore((state) => state.lifetimePuzzlesCompleted);
  const lifetimeSpeechPractice = useFarmStore((state) => state.lifetimeSpeechPractice);
  const puzzleScore = useFarmStore((state) => state.puzzleScore);
  const sesyapScore = useFarmStore((state) => state.sesyapScore);
  const sesyapHistory = useFarmStore((state) =>
    Array.isArray(state.sesyapHistory) ? state.sesyapHistory : [],
  );
  const dailyStreak = useFarmStore((state) => state.dailyStreak);
  const cardCustomization = useFarmStore((state) => state.cardCustomization);
  const achievements = useFarmStore((state) =>
    Array.isArray(state.achievements) ? state.achievements : [],
  );
  const dailyGoal = useFarmStore((state) => state.dailyGoal);
  const dailyProgress = useFarmStore((state) => state.dailyProgress);
  const resetProgress = useFarmStore((state) => state.resetProgress);
  const answerMiniQuiz = useFarmStore((state) => state.answerMiniQuiz);
  const activeBoosts = useFarmStore((state) =>
    Array.isArray(state.activeBoosts) ? state.activeBoosts : [],
  );
  // s Tutorial
  const tutorialStep = useFarmStore((state) => state.tutorialStep);
  const skipTutorial = useFarmStore((state) => state.skipTutorial);
  const tutorialInterrupted = useFarmStore((state) => state.tutorialInterrupted);
  const setTutorialInterrupted = useFarmStore((state) => state.setTutorialInterrupted);
  const guidedModeActive = useFarmStore((state) => state.guidedModeActive);
  const guidedModeStep = useFarmStore((state) => state.guidedModeStep);
  const stopGuidedMode = useFarmStore((state) => state.stopGuidedMode);
  const setCloudTipDismissed = useFarmStore((state) => state.setCloudTipDismissed);
  const utilityRailHintDismissed = useFarmStore((state) => !!state.cloudTipsDismissed?.homeUtilityRailHint);
  const showNicknameModal = useFarmStore((state) => !!state.showNicknameModal);
  const nickname = useFarmStore((state) => state.nickname);
  
  //  Günlük Görevler
  const dailyQuests = useFarmStore((state) =>
    Array.isArray(state.dailyQuests) ? state.dailyQuests : [],
  );
  const checkAndResetDailyQuests = useFarmStore((state) => state.checkAndResetDailyQuests);
  const homeHeaderTheme = useMemo(
    () => getCardHeaderThemePreset(cardCustomization?.headerTheme),
    [cardCustomization?.headerTheme],
  );

  // 🗂️ Preload images on mount for performance
  useEffect(() => {
    if (homeVisualsPreloaded) return;
    const preloadImages = async () => {
      const imageSources = [
        PRELOADED_IMAGES.logo,
        PRELOADED_IMAGES.quiz,
        PRELOADED_IMAGES.farm,
        PRELOADED_IMAGES.envanter,
        PRELOADED_IMAGES.puzzle,
        PRELOADED_IMAGES.phrasal,
        PRELOADED_IMAGES.soruIsareti,
        PRELOADED_IMAGES.market,
        PRELOADED_IMAGES.marketGuc,
        PRELOADED_IMAGES.marketTohum,
        PRELOADED_IMAGES.cardShop,
        PRELOADED_IMAGES.battle,
        PRELOADED_IMAGES.sesyap,
        PRELOADED_IMAGES.pratik,
        PRELOADED_IMAGES.customWord,
      ];

      await Promise.allSettled(imageSources.map((source) => Asset.loadAsync(source)));
      homeVisualsPreloaded = true;
    };
    preloadImages();
  }, []);

  // MiniQuiz State
  const [quizWordId, setQuizWordId] = useState<string | null>(null);

  //  Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  //  Quest Panel State
  const [questsPanelVisible, setQuestsPanelVisible] = useState(false);
  const [isCefrDetailsVisible, setIsCefrDetailsVisible] = useState(false);
  const [cardShopVisible, setCardShopVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [helpModalTitle, setHelpModalTitle] = useState("Bilgi");
  const [helpModalMessage, setHelpModalMessage] = useState("");
  const [questGuideModalVisible, setQuestGuideModalVisible] = useState(false);
  const [questGuideTitle, setQuestGuideTitle] = useState("Göreve Başla");
  const [questGuideMessage, setQuestGuideMessage] = useState("");
  const [questGuideButtonText, setQuestGuideButtonText] = useState("Yönlendir");
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const [notificationPromptArmed, setNotificationPromptArmed] = useState(false);
  const [meaningfulActionCount, setMeaningfulActionCount] = useState(0);
  const [practiceCenterVisible, setPracticeCenterVisible] = useState(false);
  const showUtilityRailHint = !utilityRailHintDismissed;
  const questGuideTargetRef = useRef<{ route: string; params?: any } | null>(null);
  const questGuideNavigateFrameRef = useRef<number | null>(null);
  const notificationRequestInFlightRef = useRef(false);
  const notificationPromptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigationUnlockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questPanelNavigateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const utilityRailLastIndexRef = useRef(0);
  const utilityRailLastTickAtRef = useRef(0);
  const utilityRailHintAnim = useRef(new Animated.Value(0)).current;

  const utilityRailItemWidth = useMemo(() => {
    const base = Math.floor((SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2);
    if (IS_LARGE_TABLET) return Math.max(230, Math.min(320, base));
    if (IS_TABLET_DEVICE) return Math.max(205, Math.min(276, base));
    return IS_SMALL_DEVICE ? Math.max(156, Math.min(188, base)) : Math.max(170, Math.min(208, base));
  }, []);

  const utilityRailSnapStep = useMemo(
    () => utilityRailItemWidth + GRID_GAP,
    [utilityRailItemWidth],
  );

  const markUtilityRailHintSeen = useCallback(() => {
    if (!utilityRailHintDismissed) {
      setCloudTipDismissed('homeUtilityRailHint', true);
    }
  }, [utilityRailHintDismissed, setCloudTipDismissed]);

  useEffect(() => {
    if (!showUtilityRailHint) {
      utilityRailHintAnim.stopAnimation();
      utilityRailHintAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(utilityRailHintAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(utilityRailHintAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [showUtilityRailHint, utilityRailHintAnim]);

  const utilityRailHintOpacity = utilityRailHintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  const utilityRailHintTranslateY = utilityRailHintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  const handleUtilityRailDragStart = useCallback(() => {
    if (showUtilityRailHint) markUtilityRailHintSeen();
    haptic.selection();
    sound.playSwipe();
  }, [showUtilityRailHint, markUtilityRailHintSeen]);

  const handleUtilityRailScroll = useCallback((event: any) => {
    const offsetX = Number(event?.nativeEvent?.contentOffset?.x ?? 0);
    if (!Number.isFinite(offsetX) || utilityRailSnapStep <= 0) return;
    if (showUtilityRailHint && offsetX > 10) markUtilityRailHintSeen();

    const nextIndex = Math.max(0, Math.round(offsetX / utilityRailSnapStep));
    if (nextIndex === utilityRailLastIndexRef.current) return;

    const now = Date.now();
    if (now - utilityRailLastTickAtRef.current < 70) return;

    utilityRailLastIndexRef.current = nextIndex;
    utilityRailLastTickAtRef.current = now;
    haptic.selection();
    sound.playTick();
  }, [utilityRailSnapStep, showUtilityRailHint, markUtilityRailHintSeen]);

  const clearQuestGuideNavigateTask = useCallback(() => {
    if (questGuideNavigateFrameRef.current !== null) {
      cancelAnimationFrame(questGuideNavigateFrameRef.current);
      questGuideNavigateFrameRef.current = null;
    }
  }, []);

  const showHomeHelpModal = useCallback((title: string, message: string) => {
    setHelpModalTitle(title || "Bilgi");
    setHelpModalMessage(message || "");
    setHelpModalVisible(true);
  }, []);

  const closeQuestGuideModal = useCallback(() => {
    clearQuestGuideNavigateTask();
    setQuestGuideModalVisible(false);
    questGuideTargetRef.current = null;
  }, [clearQuestGuideNavigateTask]);

  const openQuestGuideModal = useCallback(
    (
      title: string,
      message: string,
      buttonText: string,
      target: { route: string; params?: any },
    ) => {
      setQuestGuideTitle(title || "Görev Yönlendirmesi");
      setQuestGuideMessage(message || "");
      setQuestGuideButtonText(buttonText || "Yönlendir");
      questGuideTargetRef.current = target;
      setQuestGuideModalVisible(true);
    },
    [],
  );

  const clearNotificationPromptTimer = useCallback(() => {
    if (notificationPromptTimerRef.current) {
      clearTimeout(notificationPromptTimerRef.current);
      notificationPromptTimerRef.current = null;
    }
  }, []);

  const clearNavigationUnlockTimer = useCallback(() => {
    if (navigationUnlockTimerRef.current) {
      clearTimeout(navigationUnlockTimerRef.current);
      navigationUnlockTimerRef.current = null;
    }
  }, []);

  const clearQuestPanelNavigateTimer = useCallback(() => {
    if (questPanelNavigateTimerRef.current) {
      clearTimeout(questPanelNavigateTimerRef.current);
      questPanelNavigateTimerRef.current = null;
    }
  }, []);

  const registerMeaningfulAction = useCallback(() => {
    setMeaningfulActionCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    try {
      configureNotifications();
    } catch {
      // notification module can fail in edge runtimes; keep home screen alive
    }
  }, []);

  useEffect(() => {
    return () => {
      clearQuestGuideNavigateTask();
      clearNotificationPromptTimer();
      clearNavigationUnlockTimer();
      clearQuestPanelNavigateTimer();
    };
  }, [
    clearQuestGuideNavigateTask,
    clearNotificationPromptTimer,
    clearNavigationUnlockTimer,
    clearQuestPanelNavigateTimer,
  ]);

  const allHomeWords = useMemo(
    () => [
      ...farm,
      ...inventory,
      ...phrasalVerbFarm,
      ...phrasalVerbInventory,
    ],
    [farm, inventory, phrasalVerbFarm, phrasalVerbInventory],
  );

  const miniQuizOptionPool = useMemo(
    () => (pool && pool.length > 0 ? pool : [...farm, ...phrasalVerbFarm]),
    [pool, farm, phrasalVerbFarm],
  );

  const quizWord = useMemo(() => {
    if (!quizWordId) return null;
    return allHomeWords.find((w) => w.id === quizWordId) || null;
  }, [quizWordId, allHomeWords]);

  const cefrEstimate = useMemo(() => {
    const sourceWords = [
      ...farm,
      ...inventory,
      ...phrasalVerbFarm,
      ...phrasalVerbInventory,
    ];
    return estimateCefrLevel(sourceWords, sesyapHistory, {
      quizAnswered: lifetimeQuizAnswered,
      quizCorrect: totalCorrect,
      quizWrong: totalWrong,
      puzzleCompleted: lifetimePuzzlesCompleted,
      speechPracticeCount: lifetimeSpeechPractice,
      puzzleScore,
      sesyapScore,
      xp,
    });
  }, [
    farm,
    inventory,
    phrasalVerbFarm,
    phrasalVerbInventory,
    sesyapHistory,
    lifetimeQuizAnswered,
    totalCorrect,
    totalWrong,
    lifetimePuzzlesCompleted,
    lifetimeSpeechPractice,
    puzzleScore,
    sesyapScore,
    xp,
  ]);

  const cefrSignalSummary = useMemo(() => {
    const signalRows = [
      { label: "Kelime hakimiyeti", value: cefrEstimate.signals.lexicalMasteryPct },
      { label: "Quiz doğruluğu", value: cefrEstimate.signals.quizAccuracyPct },
      { label: "SesYap doğruluğu", value: cefrEstimate.signals.speechAccuracyPct },
      { label: "Yapboz doğruluğu", value: cefrEstimate.signals.puzzleMasteryPct },
      { label: "Kapsam", value: cefrEstimate.signals.coveragePct },
      { label: "XP ilerlemesi", value: cefrEstimate.signals.xpProgressPct },
    ];

    const sorted = [...signalRows].sort((a, b) => b.value - a.value);
    const topTwo = sorted.slice(0, 2);
    const weakestTwo = sorted.slice(-2);

    const actionMap: Record<string, string> = {
      "Kelime hakimiyeti": "Çiftlikte kırmızı/sarı kartları kısa ama düzenli tekrarlarla yeşile taşı.",
      "Quiz doğruluğu": "Quizde hız yerine doğruluğu öne al; yanlışlardan sonra aynı tip soruları tekrar çöz.",
      "SesYap doğruluğu": "SesYapta kısa cümlelerle başla, günlük 8-10 doğru telaffuz hedefi koy.",
      "Yapboz doğruluğu": "Yapbozda cümleyi önce anlam bloklarına ayır, sonra sırayı kur.",
      "Kapsam": "Yeni kelime havuzunu genişletmek için quiz ve pratik merkezini dönüşümlü kullan.",
      "XP ilerlemesi": "Günlük görev + hasat + kısa pratik döngüsüyle XP ivmesini artır.",
    };

    return {
      topText: topTwo.map((item) => `${item.label} %${item.value}`).join(" | "),
      weakText: weakestTwo.map((item) => `${item.label} %${item.value}`).join(" • "),
      actionText: weakestTwo.map((item) => actionMap[item.label]).join(" "),
    };
  }, [cefrEstimate]);

  const featuredDailyQuest = useMemo(() => {
    const unclaimed = dailyQuests.filter((q: any) => q && !q.claimed);
    if (unclaimed.length === 0) return null;
    return unclaimed.find((q: any) => !q.completed) || unclaimed[0];
  }, [dailyQuests]);

  const featuredDailyQuestProgressPct = useMemo(() => {
    if (!featuredDailyQuest) return 0;
    const target = Math.max(1, Number(featuredDailyQuest.target || 1));
    const progress = Math.max(0, Number(featuredDailyQuest.progress || 0));
    return Math.max(0, Math.min((progress / target) * 100, 100));
  }, [featuredDailyQuest]);

  const unlockedAchievementCount = useMemo(
    () => achievements.filter((item: any) => item?.unlocked || item?.claimed).length,
    [achievements],
  );

  // Navigation Guard
  const isNavigating = useRef(false);
  const lastNavigationTime = useRef(0);

  useFocusEffect(
    useCallback(() => {
      clearNavigationUnlockTimer();
      isNavigating.current = false;
      lastNavigationTime.current = 0;
      
      //  Günlük görevleri kontrol et ve yenile
      try {
        checkAndResetDailyQuests();
      } catch (error) {
      }
      
      return () => {
        clearNavigationUnlockTimer();
        isNavigating.current = false;
      };
    }, [checkAndResetDailyQuests, clearNavigationUnlockTimer]),
  );

  const progressPercent = useMemo(() => {
    if (!dailyGoal) return 0;
    return Math.min(100, Math.round((dailyProgress / dailyGoal) * 100));
  }, [dailyGoal, dailyProgress]);

  const tutorialDialog = useMemo(
    () => TUTORIAL_DIALOGS[tutorialStep] || { lines: [] },
    [tutorialStep],
  );
  const isTutorialActive = tutorialStep !== "NOT_STARTED" && tutorialStep !== "COMPLETED";
  const isFullScreenTutorial = tutorialDialog.fullScreen === true;
  //  Sadece uygulama arka plana gidip dönüldüyse kilit overlay'i göster; devam et tklannca kalksn
  const showHomeTutorialLock = isTutorialActive && !isFullScreenTutorial && tutorialInterrupted;
  const tutorialLockMessage = useMemo(() => {
    const lineText = (tutorialDialog.lines || []).filter(Boolean).join(" ");
    return lineText || "Egitim devam ediyor. Ilgili sekmeye gecerek adimi tamamla.";
  }, [tutorialDialog.lines]);

  useEffect(() => {
    if (tutorialStep === "COMPLETED" && tutorialInterrupted) {
      setTutorialInterrupted(false);
    }
  }, [tutorialStep, tutorialInterrupted, setTutorialInterrupted]);

  useEffect(() => {
    if (guidedModeActive) {
      stopGuidedMode();
    }
  }, [guidedModeActive, stopGuidedMode]);

  const getGuidedRouteBlockReason = useCallback((route: string, params?: any): string | null => {
    if (!guidedModeActive) return null;
    if (route === "Home") return null;

    switch (guidedModeStep) {
      case "QUIZ_UNTIL_WRONG":
        if (route !== "Quiz") {
          return "Müfredat aktif: önce yanlış yapana kadar Quiz çözmelisin.";
        }
        return null;
      case "FARM_MASTER_TARGET":
        if (route !== "Farm") {
          return "Şimdi çiftlik adımındasın. Hedef kelimeyi hasat ederek ilerleyebilirsin.";
        }
        return null;
      case "PUZZLE_PRACTICE":
        if (route !== "Farm" || params?.tab !== "puzzle") {
          return "Sıradaki adım Yapboz. Çiftlik > Yapboz sekmesine geçerek devam et.";
        }
        return null;
      case "SESYAP_PRACTICE":
        if (route !== "SesYap") {
          return "Son adım SesYap. Bir doğru telaffuzla müfredatı tamamlayabilirsin.";
        }
        return null;
      default:
        return null;
    }
  }, [guidedModeActive, guidedModeStep]);

  const ensureInternetForRoute = useCallback(async (route: string) => {
    const internetRequiredRoutes = new Set(["SesYap", "BattleMenu", "Leaderboard"]);
    if (!internetRequiredRoutes.has(route)) return true;

    try {
      const netState = await NetInfo.fetch();
      const connected = netState.isConnected !== false;
      const reachable = netState.isInternetReachable !== false;
      const hasInternet = connected && reachable;

      if (!hasInternet) {
        const message =
          route === "SesYap"
            ? "SesYap moduna girmek için internet bağlantısı gerekir. Bağlantını kontrol edip tekrar dene."
            : "Savaş modu ve liderlik tablosuna girmek için internet bağlantısı gerekir. Bağlantını kontrol edip tekrar dene.";
        Alert.alert("İnternet Gerekli", message);
        haptic.error();
        return false;
      }
      return true;
    } catch {
      // NetInfo beklenmedik hata verirse kullanıcıyı bloklamayalım.
      return true;
    }
  }, []);

  const handleNav = useCallback(async (route: string, params?: any) => {
    const now = Date.now();
    if (isNavigating.current || now - lastNavigationTime.current < 500) {
      return;
    }

    const guidedBlockReason = getGuidedRouteBlockReason(route, params);
    if (guidedBlockReason) {
      traceEvent("guided_nav_blocked", { route, step: guidedModeStep });
      showHomeHelpModal("Müfredat Aktif", guidedBlockReason);
      haptic.warning();
      return;
    }

    isNavigating.current = true;

    const canNavigate = await ensureInternetForRoute(route);
    if (!canNavigate) {
      lastNavigationTime.current = now;
      isNavigating.current = false;
      return;
    }

    lastNavigationTime.current = Date.now();
    registerMeaningfulAction();

    haptic.medium();
    traceEvent("home_nav", {
      route,
      tab: params?.tab,
      guidedModeActive,
      guidedModeStep,
    });
    // Heavy screens routed from Home can stack and trigger jank; reset for clean transition.
    if (route === "Farm" || route === "Quiz") {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: route, params }],
        }),
      );
    } else {
      // Navigate immediately to keep touch feedback snappy.
      navigation.navigate(route, params);
    }

    clearNavigationUnlockTimer();
    navigationUnlockTimerRef.current = setTimeout(() => {
      isNavigating.current = false;
      navigationUnlockTimerRef.current = null;
    }, 500);
  }, [
    navigation,
    ensureInternetForRoute,
    getGuidedRouteBlockReason,
    guidedModeActive,
    guidedModeStep,
    showHomeHelpModal,
    registerMeaningfulAction,
    clearNavigationUnlockTimer,
  ]);

  const handleOpenDailyQuests = useCallback(() => {
    registerMeaningfulAction();
    haptic.light();
    setQuestsPanelVisible(true);
  }, [registerMeaningfulAction]);

  const handleQuestGuideNavigate = useCallback(() => {
    const target = questGuideTargetRef.current;
    clearQuestGuideNavigateTask();
    setQuestGuideModalVisible(false);
    questGuideTargetRef.current = null;
    if (!target) return;
    questGuideNavigateFrameRef.current = requestAnimationFrame(() => {
      questGuideNavigateFrameRef.current = null;
      void handleNav(target.route, target.params);
    });
  }, [handleNav, clearQuestGuideNavigateTask]);

  const resolveDailyQuestTarget = useCallback((quest: any): { route: string; params?: any } => {
    const screenMap: Record<string, { route: string; params?: any }> = {
      Quiz: { route: "Quiz" },
      Home: { route: "Home" },
      Farm: { route: "Farm" },
      Puzzle: { route: "Farm", params: { tab: "puzzle" } },
      PhrasalVerbFarm: { route: "Farm", params: { tab: "phrasal" } },
      SesYap: { route: "SesYap" },
      WordMatch: { route: "WordMatch" },
      FillBlank: { route: "FillBlank" },
      Collocations: { route: "Collocations" },
      Idioms: { route: "Idioms" },
      YDSQuiz: { route: "YDSQuiz" },
      YDSWordForms: { route: "YDSWordForms" },
      Battle: { route: "BattleMenu" },
    };
    const typeMap: Record<string, { route: string; params?: any }> = {
      SPEECH_PRACTICE: { route: "SesYap" },
      MATCH_WORDS: { route: "WordMatch" },
      FILL_BLANK: { route: "FillBlank" },
      LEARN_COLLOCATIONS: { route: "Collocations" },
      LEARN_IDIOMS: { route: "Idioms" },
      YDS_QUIZ: { route: "YDSQuiz" },
      COMPLETE_PUZZLE: { route: "Farm", params: { tab: "puzzle" } },
      HARVEST_PHRASAL: { route: "Farm", params: { tab: "phrasal" } },
      WIN_BATTLE: { route: "BattleMenu" },
    };

    const safeScreen = typeof quest?.screen === "string" ? quest.screen.trim() : "";
    const byScreen = screenMap[safeScreen];
    const byType = typeMap[String(quest?.type || "")];
    const preferTypeRoute =
      quest?.type === "SPEECH_PRACTICE" ||
      quest?.type === "MATCH_WORDS" ||
      quest?.type === "FILL_BLANK" ||
      quest?.type === "LEARN_COLLOCATIONS" ||
      quest?.type === "LEARN_IDIOMS" ||
      quest?.type === "YDS_QUIZ";

    return (preferTypeRoute ? (byType || byScreen) : (byScreen || byType)) || {
      route: "Home",
    };
  }, []);

  const resolveFeaturedQuestGuide = useCallback(
    (quest: any, fallbackTarget: { route: string; params?: any }) => {
      const questType = String(quest?.type || "").toUpperCase();
      const normalizedTitle = normalizeDisplayText(String(quest?.title || "")).toLowerCase();
      const targetCount = Math.max(1, Number(quest?.target || 1));

      if (
        questType === "PLANT_WORDS" ||
        questType === "COMPLETE_QUIZ" ||
        normalizedTitle.includes("kelime topla")
      ) {
        return {
          title: "Göreve Hazırlık",
          message: `Bu görevde hedefin ${targetCount} kelime toplamak. Quiz çözerek ve Tohum Pazarı'ndan tarlana kelime ekip biçip öğrenebilirsin. Biz seni şimdi Quiz'e yönlendiriyoruz.`,
          buttonText: "Quiz'e Git",
          target: { route: "Quiz" as string },
        };
      }

      return {
        title: "Göreve Hazırlık",
        message: "Bu görevi en hızlı şekilde tamamlayabilmen için seni doğru ekrana yönlendiriyoruz.",
        buttonText: "Göreve Git",
        target: fallbackTarget,
      };
    },
    [],
  );

  const handleFeaturedDailyQuestPress = useCallback(() => {
    if (!featuredDailyQuest) return;

    if (featuredDailyQuest.completed && !featuredDailyQuest.claimed) {
      handleOpenDailyQuests();
      return;
    }

    const target = resolveDailyQuestTarget(featuredDailyQuest);
    const questGuide = resolveFeaturedQuestGuide(featuredDailyQuest, target);
    openQuestGuideModal(
      questGuide.title,
      questGuide.message,
      questGuide.buttonText,
      questGuide.target,
    );
  }, [
    featuredDailyQuest,
    handleOpenDailyQuests,
    openQuestGuideModal,
    resolveDailyQuestTarget,
    resolveFeaturedQuestGuide,
  ]);

  const notificationDisplayName = useMemo(() => {
    const safeNickname = typeof nickname === "string" ? nickname.trim() : "";
    return safeNickname || "Farmer";
  }, [nickname]);

  const isNotificationPromptBlocked =
    tutorialStep !== "COMPLETED" ||
    !isHomeFocused ||
    showNicknameModal ||
    showHomeTutorialLock ||
    helpModalVisible ||
    questGuideModalVisible ||
    questsPanelVisible ||
    practiceCenterVisible ||
    cardShopVisible ||
    !!quizWordId ||
    notificationPromptVisible ||
    notificationRequestInFlightRef.current;

  useEffect(() => {
    if (tutorialStep !== "COMPLETED") {
      setNotificationPromptArmed(false);
      setMeaningfulActionCount(0);
      return;
    }
    setMeaningfulActionCount(0);

    let mounted = true;
    (async () => {
      try {
        const [prompted, permission] = await Promise.all([
          hasPromptedNotificationPermission(),
          getNotificationPermission(),
        ]);
        if (!mounted) return;
        setNotificationPromptArmed(!prompted && !permission.granted);
      } catch {
        if (mounted) setNotificationPromptArmed(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tutorialStep]);

  useEffect(() => {
    if (!notificationPromptArmed) {
      clearNotificationPromptTimer();
      return;
    }
    if (meaningfulActionCount < 1) return;
    if (isNotificationPromptBlocked) return;

    clearNotificationPromptTimer();
    notificationPromptTimerRef.current = setTimeout(() => {
      setNotificationPromptVisible(true);
    }, 280);

    return () => {
      clearNotificationPromptTimer();
    };
  }, [
    notificationPromptArmed,
    meaningfulActionCount,
    isNotificationPromptBlocked,
    clearNotificationPromptTimer,
  ]);

  const handleRequestNotifications = useCallback(async () => {
    if (notificationRequestInFlightRef.current) return;
    notificationRequestInFlightRef.current = true;

    try {
      clearNotificationPromptTimer();
      setNotificationPromptVisible(false);
      setNotificationPromptArmed(false);

      const result = await requestNotificationPermission();
      await markNotificationPermissionPrompted();

      if (result.granted) {
        const scheduledCount = await scheduleComebackNotifications({ nickname, force: true });
        showHomeHelpModal(
          "Bildirimler Hazır",
          scheduledCount > 0
            ? `${notificationDisplayName}, hatırlatıcılar aktif. Quiz serisi, hasat zamanı ve pratik odakları için ${scheduledCount} bildirim planlandı.`
            : `${notificationDisplayName}, izin açık. Bildirimler zaten planlı olduğu için tekrar spam oluşmadı.`
        );
        return;
      }

      showHomeHelpModal(
        "Bildirim İzni Kapalı",
        result.canAskAgain
          ? `${notificationDisplayName}, şimdilik izin verilmedi. Uygun olduğunda tekrar deneyebilirsin.`
          : `${notificationDisplayName}, sistem izni kapalı. Ayarlar > Bildirimler > FarmEnglish adımından açabilirsin.`
      );
    } catch {
      showHomeHelpModal(
        "Bildirim Ayarı Başarısız",
        "Bildirim izni şu an alınamadı. Oyun etkilenmez; daha sonra tekrar deneyebilirsin."
      );
    } finally {
      notificationRequestInFlightRef.current = false;
    }
  }, [showHomeHelpModal, nickname, notificationDisplayName, clearNotificationPromptTimer]);

  const handleSkipNotifications = useCallback(async () => {
    clearNotificationPromptTimer();
    setNotificationPromptVisible(false);
    setNotificationPromptArmed(false);
    notificationRequestInFlightRef.current = false;
    try {
      await markNotificationPermissionPrompted();
    } catch {
      // no-op
    }
  }, [clearNotificationPromptTimer]);

  useEffect(() => {
    return () => {
      clearNotificationPromptTimer();
    };
  }, [clearNotificationPromptTimer]);

  const handleNotificationPreview = useCallback(async () => {
    const ok = await scheduleNotificationPreview(5);
    showHomeHelpModal(
      ok ? "Bildirim Testi Planlandı" : "Bildirim Testi Başarısız",
      ok
        ? "5 saniye içinde test bildirimi gelecek. Gelmezse cihaz ayarlarında izin durumunu kontrol et."
        : "Test bildirimi zamanlanamadı. Ayarlar > Bildirimler içinde izin verdiğinden emin ol."
    );
  }, [showHomeHelpModal]);

  const handlePracticeNavigate = useCallback((route: string) => {
    setPracticeCenterVisible(false);
    handleNav(route);
  }, [handleNav]);

  //  PUZZLE -> Farm puzzle sekmesine yönlendir
  const handlePuzzlePress = () => {
    handleNav("Farm", { tab: "puzzle" });
  };

  const handleQuizAnswer = useCallback(
    (correct: boolean, count?: number, wordId?: string) => {
      const targetWordId = wordId || quizWordId;
      if (targetWordId) {
        answerMiniQuiz(targetWordId, correct, count || 1);
      }
      setQuizWordId(null);
    },
    [quizWordId, answerMiniQuiz],
  );

  const handleHomeTutorialResume = useCallback(() => {
    haptic.light();
    setTutorialInterrupted(false);
  }, [setTutorialInterrupted]);

  const handleHomeTutorialSkip = useCallback(() => {
    haptic.medium();
    skipTutorial();
    setTutorialInterrupted(false);
  }, [skipTutorial, setTutorialInterrupted]);

  const scrollPaddingBottom = 140;

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={["#0A0A0F", "#0F0F1A", "#0A0A0F"]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollPaddingBottom },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
          {/* Premium Header */}
          <PremiumHeader
            coins={coins}
            level={level}
            streak={dailyStreak}
            themePreset={homeHeaderTheme}
            onProfilePress={() => handleNav("Profile")}
          />

          <View
            style={[
              styles.dailyQuestTopSection,
              {
                borderColor: homeHeaderTheme.questPanelBorderColor,
                backgroundColor: homeHeaderTheme.questPanelBackground,
              },
            ]}
          >
            <View style={styles.dailyQuestTopHeader}>
              <Text style={[styles.dailyQuestTopTitle, { color: homeHeaderTheme.questTitleColor }]}>Sıradaki Görev</Text>
              <TouchableOpacity
                style={styles.dailyQuestMoreButton}
                onPress={handleOpenDailyQuests}
                activeOpacity={0.8}
              >
                <Text style={[styles.dailyQuestMoreText, { color: homeHeaderTheme.questMoreTextColor }]}>Daha da görüntüle</Text>
                <ChevronRight size={14} color={homeHeaderTheme.questMoreTextColor} />
              </TouchableOpacity>
            </View>

            {featuredDailyQuest ? (
              <TouchableOpacity
                style={[
                  styles.dailyQuestTopCard,
                  { borderColor: homeHeaderTheme.questCardBorderColor },
                ]}
                onPress={handleFeaturedDailyQuestPress}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={homeHeaderTheme.questCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dailyQuestTopGradient}
                >
                  <View style={styles.dailyQuestTopRow}>
                    <Text style={styles.dailyQuestTopIcon}>
                      {normalizeDisplayText(String(featuredDailyQuest.icon || "\u{1F3AF}"))}
                    </Text>
                    <View style={styles.dailyQuestTopTextWrap}>
                      <Text
                        style={[
                          styles.dailyQuestTopQuestTitle,
                          { color: homeHeaderTheme.questPrimaryTextColor },
                        ]}
                        numberOfLines={1}
                      >
                        {normalizeDisplayText(String(featuredDailyQuest.title || "G\u00F6rev"))}
                      </Text>
                      <Text
                        style={[
                          styles.dailyQuestTopQuestDesc,
                          { color: homeHeaderTheme.questSecondaryTextColor },
                        ]}
                        numberOfLines={2}
                      >
                        {normalizeDisplayText(String(featuredDailyQuest.description || ""))}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.dailyQuestTopAction,
                        { color: homeHeaderTheme.questActionTextColor },
                      ]}
                    >
                      {featuredDailyQuest.completed && !featuredDailyQuest.claimed ? "\u00D6d\u00FCl Al" : "G\u00F6reve Git"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.dailyQuestTopProgressTrack,
                      {
                        borderColor: homeHeaderTheme.questProgressTrackBorderColor,
                        backgroundColor: homeHeaderTheme.questProgressTrackColor,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dailyQuestTopProgressFill,
                        {
                          width: `${featuredDailyQuestProgressPct}%`,
                          backgroundColor: homeHeaderTheme.questProgressFillColor,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.dailyQuestTopProgressText,
                      { color: homeHeaderTheme.questSecondaryTextColor },
                    ]}
                  >
                    {`${Math.max(0, Number(featuredDailyQuest.progress || 0))}/${Math.max(1, Number(featuredDailyQuest.target || 1))}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.dailyQuestTopEmpty,
                  {
                    borderColor: homeHeaderTheme.questEmptyBorderColor,
                    backgroundColor: homeHeaderTheme.questEmptyBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dailyQuestTopEmptyText,
                    { color: homeHeaderTheme.questEmptyTextColor },
                  ]}
                >
                  Bugünün görevleri tamamlandı.
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.gridContainer}>
            <PremiumMenuCard
              onPress={() => handleNav("Quiz")}
              imageSource={PRELOADED_IMAGES.quiz}
              title="QUIZ"
              subtitle="Kelime topla, tarlana ek"
              size="wideXXL"
              textAlign="center"
              accentColor="#A855F7"
              delay={0}
              hasBounce={true}
              onHelpPress={showHomeHelpModal}
              helpText="Quiz çözdükçe tarlana otomatik ekim yapılır. Bilmediklerin tohum olur ve çalıştıkça büyür. Bildiklerin ise otomatik meyve olarak ekilir."
            />

            <View style={styles.gridRow}>
              <PremiumMenuCard
                onPress={() => handleNav("Farm")}
                imageSource={PRELOADED_IMAGES.farm}
                title="ÇİFTLİK"
                subtitle="Büyüt, çalış, hasat et"
                size="medium"
                textAlign="center"
                accentColor="#22C55E"
                delay={40}
                hasBounce={true}
                onHelpPress={showHomeHelpModal}
                helpText="Kelimelerini burada büyütür, hasat eder ve kalıcı öğrenme sağlarsın."
              />
              <PremiumMenuCard
                onPress={() => handleNav("Inventory")}
                imageSource={PRELOADED_IMAGES.envanter}
                title="ENVANTER"
                subtitle="Hasatların burada"
                size="medium"
                textAlign="center"
                accentColor="#60A5FA"
                delay={80}
                hasBounce={true}
                onHelpPress={showHomeHelpModal}
                helpText="Hasatlarını buradan yönetirsin. Burası senin koleksiyon ve takip yerindir. Tekrar çalışmak istediğin kelimeyi buradan tekrar tarlana dikip çalışabilir, elde ettiğin hasatları güçlendirebilirsin!"
              />
            </View>

            <View style={styles.gridRow}>
              <PremiumMenuCard
                onPress={() => handleNav("SesYap")}
                imageSource={PRELOADED_IMAGES.sesyap}
                title="SESYAP"
                subtitle="Konuş, telaffuzunu geliştir"
                size="medium"
                textAlign="center"
                accentColor="#5EEAD4"
                delay={120}
                hasBounce={true}
                onHelpPress={showHomeHelpModal}
                helpText="SesYap modunda telaffuz ve doğruluk çalışırsın."
              />
              <PremiumMenuCard
                onPress={handlePuzzlePress}
                imageSource={PRELOADED_IMAGES.puzzle}
                title="PUZZLE"
                subtitle="Cümle pratiği"
                size="medium"
                textAlign="center"
                accentColor="#F97316"
                delay={160}
                hasBounce={true}
                onHelpPress={showHomeHelpModal}
                helpText="Cümle parçalarını doğru sıraya dizerek bağlamlı tekrar yaparsın."
              />
            </View>

            <PremiumMenuCard
              onPress={() => handleNav("BattleMenu")}
              imageSource={PRELOADED_IMAGES.battle}
              title={'SAVA\u015E MODU'}
              subtitle={'Rakiplerle yar\u0131\u015F'}
              size="wideXXL"
              textAlign="center"
              imageFit="cover"
              imagePosition="top"
              accentColor="#EF4444"
              delay={200}
              hasBounce={true}
              wrapperStyleOverride={styles.battleHeroCard}
              onHelpPress={showHomeHelpModal}
              helpText={'Sava\u015F modunda rakiplerle yar\u0131\u015F\u0131r, liderlik tablosunda y\u00FCkselirsin.'}
            />

            <View style={styles.utilityRailSection}>
              {showUtilityRailHint && (
                <Animated.View
                  style={[
                    styles.utilityRailHintWrap,
                    {
                      opacity: utilityRailHintOpacity,
                      transform: [{ translateY: utilityRailHintTranslateY }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <LinearGradient
                    colors={["rgba(56, 189, 248, 0.2)", "rgba(30, 64, 175, 0.22)"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.utilityRailHintPill}
                  >
                    <Text style={styles.utilityRailHintArrow}>{"\u2190"}</Text>
                    <Text style={styles.utilityRailHintText}>{'Daha fazla kart i\u00E7in sa\u011Fa kayd\u0131r'}</Text>
                    <Text style={styles.utilityRailHintArrow}>{"\u2192"}</Text>
                  </LinearGradient>
                </Animated.View>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={utilityRailSnapStep}
                decelerationRate="fast"
                disableIntervalMomentum
                contentContainerStyle={styles.utilityRailContent}
                onScrollBeginDrag={handleUtilityRailDragStart}
                onScroll={handleUtilityRailScroll}
                scrollEventThrottle={16}
              >
                <PremiumMenuCard
                  onPress={() => handleNav("CustomWordCard")}
                  imageSource={PRELOADED_IMAGES.customWord}
                  title="KENDİ KELİME KARTIN"
                  subtitle="Kendi tohumunu ek"
                  size="halfSquare"
                  textAlign="center"
                  imageFit="cover"
                  accentColor="#22C55E"
                  delay={240}
                  hasBounce={true}
                  wrapperStyleOverride={[styles.utilityRailCard, { width: utilityRailItemWidth }]}
                  onHelpPress={showHomeHelpModal}
                  helpText="Kendi kelimeni, örnek cümleni ekleyip oyuna dahil edebilirsin."
                />
                <PremiumMenuCard
                  onPress={() => {
                    registerMeaningfulAction();
                    haptic.medium();
                    setCardShopVisible(true);
                  }}
                  imageSource={PRELOADED_IMAGES.cardShop}
                  title="KART PAZARI"
                  subtitle="Tema ve kişiselleştir"
                  size="halfSquare"
                  textAlign="center"
                  imageFit="cover"
                  accentColor="#C4B5FD"
                  delay={280}
                  hasBounce={true}
                  wrapperStyleOverride={[styles.utilityRailCard, { width: utilityRailItemWidth }]}
                  onHelpPress={showHomeHelpModal}
                  helpText="Kart pazarında kart temalarını açar ve kartlarını kişiselleştirirsin."
                />
                <PremiumMenuCard
                  onPress={() => handleNav("PhrasalVerbsMenu")}
                  imageSource={PRELOADED_IMAGES.phrasal}
                  title="PHRASAL"
                  subtitle="Deyimleri öğren"
                  size="halfSquare"
                  textAlign="center"
                  imageFit="cover"
                  accentColor="#EC4899"
                  delay={320}
                  hasBounce={true}
                  wrapperStyleOverride={[styles.utilityRailCard, { width: utilityRailItemWidth }]}
                  onHelpPress={showHomeHelpModal}
                  helpText="Phrasal verbs bölümünde gündelik kalıpları çalışırsın."
                />
                <PremiumMenuCard
                  onPress={() => {
                    registerMeaningfulAction();
                    haptic.light();
                    setPracticeCenterVisible(true);
                  }}
                  imageSource={PRELOADED_IMAGES.pratik}
                  title="PRATİK MERKEZİ"
                  subtitle="Eşleştir, doldur, YDS"
                  size="halfSquare"
                  textAlign="center"
                  imageFit="cover"
                  accentColor="#38BDF8"
                  delay={340}
                  hasBounce={true}
                  wrapperStyleOverride={[styles.utilityRailCard, { width: utilityRailItemWidth }]}
                  onHelpPress={showHomeHelpModal}
                  helpText="Pratik merkezinde modüllerle sistemli ilerlersin."
                />
                <PremiumMenuCard
                  onPress={() => handleNav("Store")}
                  imageSource={PRELOADED_IMAGES.marketGuc}
                  title="GÜÇ MAĞAZASI"
                  subtitle="Boost, hint, paket"
                  size="halfSquare"
                  textAlign="center"
                  imageFit="cover"
                  accentColor="#A78BFA"
                  delay={360}
                  hasBounce={true}
                  wrapperStyleOverride={[styles.utilityRailCard, { width: utilityRailItemWidth }]}
                  onHelpPress={showHomeHelpModal}
                  helpText="Güç mağazasından boost, hint ve paket alırsın."
                />
                <PremiumMenuCard
                  onPress={() => handleNav("SeedMarket")}
                  imageSource={PRELOADED_IMAGES.marketTohum}
                  title="TOHUM PAZARI"
                  subtitle="4000+ premium tohum"
                  size="halfSquare"
                  textAlign="center"
                  imageFit="cover"
                  accentColor="#22C55E"
                  delay={380}
                  hasBounce={true}
                  wrapperStyleOverride={[styles.utilityRailCard, { width: utilityRailItemWidth }]}
                  onHelpPress={showHomeHelpModal}
                  helpText="Tohum pazarından yeni tohumlar alıp çiftliğine ekersin."
                />
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cefrSummaryCard}
            activeOpacity={0.9}
            onPress={() => setIsCefrDetailsVisible((prev) => !prev)}
          >
            <LinearGradient
              colors={["rgba(55, 48, 163, 0.88)", "rgba(49, 46, 129, 0.92)", "rgba(30, 41, 59, 0.94)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cefrSummaryGradient}
            >
              <View style={styles.cefrSummaryHeader}>
                <Text style={styles.cefrSummaryLabel}>TAHMİNİ CEFR</Text>
                <Text style={styles.cefrSummaryLevel}>{cefrEstimate.level}</Text>
              </View>
              <Text style={styles.cefrSummaryMessage}>
                {`Şu an tahmini ${cefrEstimate.level} seviyesindesin.`}
              </Text>
              <Text style={styles.cefrSummaryHint}>
                {isCefrDetailsVisible ? "Detayları gizle" : "Detayları görmek için dokun"}
              </Text>
              {isCefrDetailsVisible && (
                <>
                  <Text style={styles.cefrSummaryMeta}>
                    Bu tahmin dinamik. Quiz, SesYap, Puzzle ve Çiftlik verilerin güncellendikçe anlık olarak değişir.
                  </Text>
                  <Text style={styles.cefrSummarySignals}>
                    {`Bu seviyedesin çünkü en güçlü sinyallerin: ${cefrSignalSummary.topText}.`}
                  </Text>
                  <Text style={styles.cefrSummaryWeights}>
                    {`Gelişim önceliğin: ${cefrSignalSummary.weakText}. Güven: %${cefrEstimate.confidence}.`}
                  </Text>
                  <Text style={styles.cefrSummaryWeights}>
                    {`Öneri: ${cefrSignalSummary.actionText}`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.achievementsSection}
            activeOpacity={0.9}
            onPress={() => handleNav("Achievements")}
          >
            <LinearGradient
              colors={["rgba(180, 83, 9, 0.82)", "rgba(120, 53, 15, 0.86)", "rgba(30, 41, 59, 0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.achievementsCard}
            >
              <View style={styles.achievementsLeft}>
                <View style={styles.achievementsIconWrap}>
                  <Award size={21} color="#facc15" strokeWidth={2.4} />
                </View>
                <View style={styles.achievementsTextWrap}>
                  <Text style={styles.achievementsTitle}>Başarımlar</Text>
                  <Text style={styles.achievementsSubtitle}>
                    {`${unlockedAchievementCount}/${achievements.length} açıldı`}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#fde68a" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {!questsPanelVisible && <RewardToastContainer />}

      {showHomeTutorialLock && (
        <View style={styles.homeTutorialLock} pointerEvents="auto">
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.homeTutorialCard}>
            <Text style={styles.homeTutorialTitle}>Eğitim kilidi aktif</Text>
            <Text style={styles.homeTutorialText}>{tutorialLockMessage}</Text>
            {tutorialInterrupted && (
              <Text style={styles.homeTutorialSubtext}>
                Uygulamadan çıkmışsın. Devam etmek veya serbest kalmak için seçim yap.
              </Text>
            )}
            <View style={styles.homeTutorialActions}>
              <TouchableOpacity
                style={[styles.homeTutorialButton, styles.homeTutorialSkip]}
                onPress={handleHomeTutorialSkip}
                activeOpacity={0.85}
              >
                <Text style={styles.homeTutorialSkipText}>Serbest birak</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.homeTutorialButton, styles.homeTutorialResume]}
                onPress={handleHomeTutorialResume}
                activeOpacity={0.85}
              >
                <Text style={styles.homeTutorialResumeText}>Egitime devam et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MiniQuiz Dialog */}
      {quizWord && (
        <MiniQuizDialog
          key={quizWord.id}
          word={quizWord}
          allWords={miniQuizOptionPool}
          onAnswer={handleQuizAnswer}
          onClose={() => setQuizWordId(null)}
        />
      )}
      
      {/*  Günlük Görevler Modal */}
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
            <RewardToastContainer />
            <DailyQuestsPanel 
              onClose={() => setQuestsPanelVisible(false)} 
              onNavigate={(screen: string, params?: any) => {
                setQuestsPanelVisible(false);
                clearQuestPanelNavigateTimer();
                questPanelNavigateTimerRef.current = setTimeout(() => {
                  questPanelNavigateTimerRef.current = null;
                  void handleNav(screen, params);
                }, 120);
              }}
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

      {/* 🛒 Card Shop Modal */}
      <Modal
        visible={cardShopVisible}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setCardShopVisible(false)}
      >
        <View style={styles.cardShopFullScreen}>
          <CardShopPanel onClose={() => setCardShopVisible(false)} />
        </View>
      </Modal>
      <Modal
        visible={practiceCenterVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPracticeCenterVisible(false)}
      >
        <View style={styles.practiceModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setPracticeCenterVisible(false)}
          />
          <View style={styles.practiceModalCard}>
            <LinearGradient
              colors={["#111827", "#0F172A", "#111827"]}
              style={styles.practiceModalGradient}
            >
              <View style={styles.practiceModalHeader}>
                <Text style={styles.practiceModalTitle}>Pratik Merkezi</Text>
                <Text style={styles.practiceModalSubtitle}>Hedefini seç, doğru modülle net pratik yap.</Text>
              </View>

              <TouchableOpacity
                style={styles.practiceModalButton}
                onPress={() => handlePracticeNavigate("WordMatch")}
                activeOpacity={0.85}
              >
                <Text style={styles.practiceModalButtonTitle}>Kelime Eşleştir</Text>
                <Text style={styles.practiceModalButtonDesc}>Karışık kartlarda İngilizce-Türkçe çiftleri bularak hız ve doğruluk reflekkazan.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.practiceModalButton}
                onPress={() => handlePracticeNavigate("FillBlank")}
                activeOpacity={0.85}
              >
                <Text style={styles.practiceModalButtonTitle}>Boşluk Doldur</Text>
                <Text style={styles.practiceModalButtonDesc}>Cümlede bağlama en uygun kelimeyi seçerek dilbilgive anlam doğruluğunu geliştir.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.practiceModalButton}
                onPress={() => handlePracticeNavigate("Idioms")}
                activeOpacity={0.85}
              >
                <Text style={styles.practiceModalButtonTitle}>Deyimler</Text>
                <Text style={styles.practiceModalButtonDesc}>Gerçek hayatta kullanılan deyimleri örneklerle öğren, yanlış kullanımları ayıkla.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.practiceModalButton}
                onPress={() => handlePracticeNavigate("YDSQuiz")}
                activeOpacity={0.85}
              >
                <Text style={styles.practiceModalButtonTitle}>YDS Soruları</Text>
                <Text style={styles.practiceModalButtonDesc}>Sınav formatındaki sorularla zaman yönetimi çalış; cevaptan sonra çözüm mantığını gör.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.practiceModalButton}
                onPress={() => handlePracticeNavigate("YDSWordForms")}
                activeOpacity={0.85}
              >
                <Text style={styles.practiceModalButtonTitle}>Kelime Formları</Text>
                <Text style={styles.practiceModalButtonDesc}>Noun-verb-adjective-adverb dönüşümlerini cümle ipuçlarına göre doğru seçmeyi öğren.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.practiceModalButton, styles.practiceModalButtonSecondary]}
                onPress={() => handlePracticeNavigate("Collocations")}
                activeOpacity={0.85}
              >
                <Text style={styles.practiceModalButtonTitle}>Collocations</Text>
                <Text style={styles.practiceModalButtonDesc}>Birlikte doğal kullanılan kelime gruplarını ayırt et; akıcı ve doğru ifade kur.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.practiceModalClose}
                onPress={() => setPracticeCenterVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.practiceModalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ℹ️ Tutorial Final Quiz Dialog */}
      <JuicyModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
        title={helpModalTitle}
        titleEmoji={"ℹ️"}
        message={helpModalMessage}
        type="info"
        buttons={[
          {
            text: "Tamam",
            type: "primary",
            onPress: () => setHelpModalVisible(false),
          },
        ]}
      />
      <JuicyModal
        visible={questGuideModalVisible}
        onClose={closeQuestGuideModal}
        title={questGuideTitle}
        titleEmoji={"🗺️"}
        message={questGuideMessage}
        type="info"
        buttons={[
          {
            text: questGuideButtonText,
            type: "primary",
            onPress: handleQuestGuideNavigate,
          },
          {
            text: "Şimdilik Kalsın",
            type: "cancel",
            onPress: closeQuestGuideModal,
          },
        ]}
      />
      <JuicyModal
        visible={notificationPromptVisible}
        onClose={handleSkipNotifications}
        title="Bildirim İzni"
        titleEmoji={'\u{1F514}'}
        message={`${notificationDisplayName}, yeni güncellemedeki akıllı hatırlatıcıları açmak ister misin?`}
        secondaryMessage="İzin verirsen quiz serisi, hasat zamanı ve pratik odakları için nokta atışı bildirimler gelir."
        type="warning"
        buttons={[
          {
            text: "İzni Aç",
            type: "primary",
            onPress: handleRequestNotifications,
          },
          {
            text: "Şimdilik Geç",
            type: "cancel",
            onPress: handleSkipNotifications,
          },
        ]}
      />
      <TutorialFinalQuizDialog
        visible={tutorialStep === "STEP_18_PERFECT_DONE"}
      />

      {/*  Tutorial Final Quiz Premium - STEP_19 */}
      <TutorialFinalQuizPremium
        visible={tutorialStep === "STEP_19_FINAL_QUIZ"}
        onComplete={() => {
          // Final quiz tamamlandi
        }}
      />

      {/* s Nickname Modal - Tutorial sonraisim isteme */}
      <NicknameModal />

      {/*  Tutorial Dialog */}
      <TutorialDialog
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />


      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === "ios" ? SPACING.md : SPACING.xl,
  },

  // Premium Header Styles
  premiumHeader: {
    marginBottom: SPACING.sm,
  },
  headerFrame: {
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#01040A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 10,
  },
  headerFrameCompact: {
    paddingHorizontal: 9,
    paddingVertical: 9,
  },
  headerFrameGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  headerLeftSection: {
    flex: 1,
    flexGrow: 1,
    marginRight: 6,
    minWidth: 0,
    flexBasis: 0,
  },
  headerLeftSectionCompact: {
    marginRight: 4,
  },
  brandChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    maxWidth: "100%",
    paddingVertical: 5,
    paddingHorizontal: 6,
    minWidth: 0,
  },
  brandChipCompact: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  logoWrapper: {
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 22,
    backgroundColor: "#f59e0b",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(251, 191, 36, 0.65)",
    backgroundColor: "#2e1f0a",
  },
  logoContainerCompact: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.22 }],
  },
  headerTitleContainer: {
    justifyContent: "center",
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  headerTitleContainerCompact: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: IS_TABLET_DEVICE ? 20 : 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.45,
    flexShrink: 1,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerTitleCompact: {
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: IS_TABLET_DEVICE ? 12.5 : 9.5,
    fontWeight: "700",
    color: "rgba(253, 230, 138, 0.88)",
    marginTop: 1,
    letterSpacing: 0.25,
  },
  headerSubtitleCompact: {
    fontSize: 9,
  },
  headerRightSection: {
    flexDirection: "row",
    gap: 5,
    flexShrink: 1,
    maxWidth: "52%",
    marginLeft: 4,
    justifyContent: "flex-end",
    minWidth: 0,
  },
  headerRightSectionCompact: {
    gap: 4,
    maxWidth: "56%",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    gap: 4,
    minWidth: 0,
  },
  statPillCompact: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 3,
  },
  coinPill: {
    borderColor: "rgba(250, 204, 21, 0.55)",
  },
  levelPill: {
    borderColor: "rgba(245, 158, 11, 0.55)",
  },
  streakPill: {
    borderColor: "rgba(249, 115, 22, 0.55)",
  },
  pillShimmer: {
    position: "absolute",
    top: 0,
    left: -8,
    width: 52,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    transform: [{ skewX: "-20deg" }],
  },
  statPillText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FDE047",
    letterSpacing: 0.3,
  },
  statPillTextCompact: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  levelPillText: {
    color: "#FDE68A",
  },
  streakPillText: {
    color: "#fdba74",
  },

  // Grid Container
  gridContainer: {
    gap: GRID_GAP,
    marginBottom: SPACING.xxl,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  utilityRailSection: {
    marginTop: GRID_GAP,
  },
  utilityRailHintWrap: {
    alignSelf: "center",
    marginBottom: 8,
  },
  utilityRailHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.45)",
  },
  utilityRailHintArrow: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "900",
  },
  utilityRailHintText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.25,
  },
  utilityRailContent: {
    paddingHorizontal: 2,
    gap: GRID_GAP,
  },
  utilityRailCard: {
    flexGrow: 0,
    flexShrink: 0,
  },
  battleHeroCard: {
    width: "100%",
    borderRadius: CARD_BORDER_RADIUS,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.65)",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.52,
    shadowRadius: 22,
    elevation: 14,
  },

  // Card Wrappers
  cardWrapperLarge: {
    flex: LARGE_CARD_FLEX,
  },
  cardWrapperSmall: {
    flex: SMALL_CARD_FLEX,
  },
  cardWrapperMedium: {
    flex: 1,
  },
  cardWrapperWide: {
    width: "100%",
  },

  // Card Container
  cardContainer: {
    borderRadius: CARD_BORDER_RADIUS,
    overflow: "hidden",
    position: "relative",
  },

  // Outer Glow
  outerGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: CARD_BORDER_RADIUS + 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },

  // Gradient Border
  gradientBorder: {
    flex: 1,
    borderRadius: CARD_BORDER_RADIUS,
    padding: 2,
  },

  // Inner Card
  innerCard: {
    flex: 1,
    borderRadius: CARD_BORDER_RADIUS - 2,
    overflow: "hidden",
    backgroundColor: "#0D0D12",
  },

  // Full Image Layers
  fullImageCover: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 1,
  },

  // Image Overlay
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Shine Effect
  shineEffect: {
    position: "absolute",
    top: -50,
    left: 0,
    width: 80,
    height: 300,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },

  // Help Icon
  helpIconContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    justifyContent: "center",
    alignItems: "center",
  },
  helpIconText: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
  },

  // Card Text Container
  cardTextContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  cardTextContainerCentered: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  cardTextContainerCenteredFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },

  // Card Title
  cardTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: 1.2,
    includeFontPadding: true,
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  cardTitleCentered: {
    textAlign: "center",
    fontSize: IS_TABLET_DEVICE ? 24 : 18,
    lineHeight: IS_TABLET_DEVICE ? 28 : 22,
    letterSpacing: 1.0,
  },
  cardTitleHero: {
    fontSize: IS_TABLET_DEVICE ? 30 : 23,
    letterSpacing: 1.4,
  },

  // Card Subtitle
  cardSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardSubtitleCentered: {
    textAlign: "center",
    fontSize: IS_TABLET_DEVICE ? 13 : 11,
    marginTop: 4,
  },
  cardSubtitleHero: {
    marginTop: 8,
    fontSize: IS_TABLET_DEVICE ? 14 : 12,
    color: "rgba(255, 255, 255, 0.92)",
  },

  // Dashboard Container
  dailyQuestTopSection: {
    marginTop: 0,
    marginBottom: SPACING.md,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.54)",
  },
  dailyQuestTopHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dailyQuestTopTitle: {
    color: "#fef3c7",
    fontSize: 14,
    fontWeight: "800",
  },
  dailyQuestMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
  },
  dailyQuestMoreText: {
    color: "#fde68a",
    fontSize: 10,
    fontWeight: "700",
  },
  dailyQuestTopCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.2)",
  },
  dailyQuestTopGradient: {
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  dailyQuestTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  dailyQuestTopIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  dailyQuestTopTextWrap: {
    flex: 1,
  },
  dailyQuestTopQuestTitle: {
    color: "#fff8d6",
    fontSize: 12,
    fontWeight: "800",
  },
  dailyQuestTopQuestDesc: {
    marginTop: 2,
    color: "rgba(255, 247, 208, 0.88)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
  },
  dailyQuestTopAction: {
    color: "#fde68a",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
  },
  dailyQuestTopProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(253, 224, 71, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.76)",
  },
  dailyQuestTopProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#f59e0b",
  },
  dailyQuestTopProgressText: {
    marginTop: 3,
    color: "rgba(254, 243, 199, 0.92)",
    fontSize: 9,
    fontWeight: "700",
    textAlign: "right",
  },
  dailyQuestTopEmpty: {
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(253, 224, 71, 0.18)",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  dailyQuestTopEmptyText: {
    color: "rgba(254, 243, 199, 0.9)",
    fontSize: 11,
    fontWeight: "700",
  },
  simpleMenuButton: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  simpleMenuGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
  },
  simpleMenuTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  simpleMenuTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.7,
  },
  simpleMenuSubtitle: {
    marginTop: 2,
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 12,
    fontWeight: "600",
  },

  // Achievements Section
  achievementsSection: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  achievementsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.34)",
  },
  achievementsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  achievementsTextWrap: {
    gap: 2,
  },
  achievementsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(253, 224, 71, 0.46)",
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  achievementsSubtitle: {
    fontSize: 12,
    color: "rgba(254, 243, 199, 0.86)",
    fontWeight: "700",
  },

  // Debug Section
  debugSection: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.md,
    marginTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  debugMainButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(168, 85, 247, 0.3)",
    gap: 8,
  },
  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: 5,
  },
  debugButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF4444",
  },
  debugMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  debugMenuButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  debugMenuButtonSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },

  //  Market Container - Ana sayfa butonu (Premium Full Image)
  marketContainer: {
    marginTop: GRID_GAP,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    height: IS_LARGE_TABLET ? 300 : IS_TABLET_DEVICE ? 248 : IS_SMALL_DEVICE ? 172 : 196,
    position: "relative",
  },
  cardShopHero: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    borderColor: "rgba(196, 181, 253, 0.45)",
    height: IS_LARGE_TABLET ? 320 : IS_TABLET_DEVICE ? 266 : IS_SMALL_DEVICE ? 184 : 210,
  },
  marketFullImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  marketOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  marketContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: IS_TABLET_DEVICE ? 24 : 16,
  },
  marketTextContainer: {
    flex: 1,
  },
  marketTitle: {
    fontSize: IS_TABLET_DEVICE ? 24 : 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  marketSubtitle: {
    fontSize: IS_TABLET_DEVICE ? 15 : 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  //  Market Modal Styles - Premium 3-Card Layout
  marketModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "flex-end",
  },
  marketModalContent: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
    borderBottomWidth: 0,
  },
  marketModalGradient: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  marketModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  marketModalHeaderLeft: {
    flex: 1,
  },
  marketModalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  marketModalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 4,
  },
  marketModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  marketModalCloseText: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  marketCardsContainer: {
    gap: 12,
  },
  marketPremiumCard: {
    borderRadius: 20,
    overflow: "hidden",
    height: 100,
  },
  marketCardImageWrapper: {
    flex: 1,
    position: "relative",
  },
  marketFullCoverImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  marketImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  marketCardTextOverlay: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 50,
  },
  marketPremiumGradient: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  marketPremiumGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.15,
  },
  marketPremiumContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marketPremiumLeft: {
    flex: 1,
    paddingRight: 12,
  },
  marketPremiumTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  marketPremiumSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  marketPremiumSloganWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  marketPremiumSlogan: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontStyle: "italic",
  },
  marketPremiumImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  marketPremiumIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  marketPremiumEmoji: {
    fontSize: 28,
  },
  marketPremiumArrow: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -12,
  },
  tutorialResetButton: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  tutorialResetGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  tutorialResetText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3B82F6",
    letterSpacing: 0.5,
  },
  //  Tutorial güvenlik kilidi (Home)
  homeTutorialLock: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 20,
  },
  homeTutorialCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  homeTutorialTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  homeTutorialText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  homeTutorialSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },
  homeTutorialActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  homeTutorialButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  homeTutorialSkip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  homeTutorialResume: {
    backgroundColor: "#22c55e",
  },
  homeTutorialSkipText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    fontSize: 14,
  },
  homeTutorialResumeText: {
    color: "#0b1118",
    fontWeight: "800",
    fontSize: 14,
  },
  
  //  Günlük Görevler Buton
  cefrSummaryCard: {
    marginBottom: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.32)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  cefrSummaryGradient: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cefrSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cefrSummaryLabel: {
    color: '#c4b5fd',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  cefrSummaryLevel: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 21,
  },
  cefrSummaryMessage: {
    color: '#ede9fe',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  cefrSummaryHint: {
    marginTop: 4,
    color: 'rgba(196, 181, 253, 0.92)',
    fontSize: 10,
    fontWeight: '700',
  },
  cefrSummaryMeta: {
    marginTop: 6,
    color: '#ddd6fe',
    fontSize: 11,
    fontWeight: '600',
  },
  cefrSummarySignals: {
    marginTop: 4,
    color: 'rgba(221, 214, 254, 0.9)',
    fontSize: 10,
    fontWeight: '600',
  },
  cefrSummaryWeights: {
    marginTop: 3,
    color: 'rgba(196, 181, 253, 0.86)',
    fontSize: 10,
    fontWeight: '500',
  },
  
  //  Günlük Görevler Modal
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
  cardShopFullScreen: {
    flex: 1,
    backgroundColor: '#101418',
  },

  practiceHubCard: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    height: IS_LARGE_TABLET ? 326 : IS_TABLET_DEVICE ? 272 : IS_SMALL_DEVICE ? 198 : 224,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  practiceHubImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  practiceHubOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  practiceHubContent: {
    position: 'absolute',
    left: IS_TABLET_DEVICE ? 24 : 16,
    right: IS_TABLET_DEVICE ? 68 : 56,
    top: IS_TABLET_DEVICE ? 18 : 12,
    bottom: IS_TABLET_DEVICE ? 18 : 12,
    justifyContent: 'flex-end',
  },
  practiceHubBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.65)',
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    marginBottom: 8,
  },
  practiceHubBadgeText: {
    color: '#67E8F9',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  practiceHubTitle: {
    color: '#FFFFFF',
    fontSize: IS_TABLET_DEVICE ? 28 : 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  practiceHubSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    fontSize: IS_TABLET_DEVICE ? 14 : 12,
    fontWeight: '600',
    lineHeight: IS_TABLET_DEVICE ? 19 : 16,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  practiceHubArrow: {
    position: 'absolute',
    right: IS_TABLET_DEVICE ? 16 : 12,
    top: '50%',
    marginTop: -14,
  },
  practiceModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    paddingHorizontal: 16,
  },
  practiceModalCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.35)',
  },
  practiceModalGradient: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 10,
  },
  practiceModalHeader: {
    marginBottom: 2,
    paddingHorizontal: 6,
  },
  practiceModalTitle: {
    color: '#FFFFFF',
    fontSize: IS_TABLET_DEVICE ? 26 : 21,
    fontWeight: '900',
  },
  practiceModalSubtitle: {
    marginTop: 2,
    color: 'rgba(191, 219, 254, 0.9)',
    fontSize: IS_TABLET_DEVICE ? 14 : 12,
    fontWeight: '600',
  },
  practiceModalButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  practiceModalButtonSecondary: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(5, 46, 22, 0.42)',
  },
  practiceModalButtonTitle: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 15,
  },
  practiceModalButtonDesc: {
    color: 'rgba(226, 232, 240, 0.82)',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  practiceModalClose: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  practiceModalCloseText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  customWordBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 1,
  },
});

export default HomeScreen;




