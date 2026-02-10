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
  InteractionManager,
  ImageBackground,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, CommonActions } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Sprout,
  BookOpen,
  Target,
  Package,
  Coins,
  Award,
  TrendingUp,
  Zap,
  AlertCircle,
  Home,
  RotateCcw,
  Trophy,
  Sparkles,
  User,
  RefreshCw,
  ChevronRight,
  Settings,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { useFarmStore } from "../store/farmStore";
import { usePerformanceStore } from "../store/performanceStore";
import { sound, haptic } from "../utils/sound";
import { showRewardToast } from "../components/RewardToast";
import { DashboardSection } from "../components/DashboardSection";
import { MiniQuizDialog } from "../components/MiniQuizDialog";
import { DailyQuestsPanel } from "../components/DailyQuestsPanel";
import { CardShopPanel } from "../components/CardShopPanel";
import {
  TutorialFinalQuizDialog,
  NicknameModal,
  TUTORIAL_DIALOGS,
} from "../components/TutorialManagerFixed";
import { TutorialFinalQuizPremium } from "../components/TutorialFinalQuizPremium";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 📱 RESPONSIVE SİSTEM - Apple Style
const IS_SMALL_DEVICE = SCREEN_HEIGHT < 700;
const IS_MEDIUM_DEVICE = SCREEN_HEIGHT >= 700 && SCREEN_HEIGHT < 850;

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

// 🖼️ PRELOAD ALL IMAGES - Optimized webp format for fast loading
const PRELOADED_IMAGES = {
  logo: require("../../assets/logo.webp"),
  quiz: require("../../assets/images/maskot/quiz.webp"),
  farm: require("../../assets/images/maskot/farm.webp"),
  envanter: require("../../assets/images/maskot/envanter.webp"),
  puzzle: require("../../assets/images/maskot/puzzle.webp"),
  phrasal: require("../../assets/images/maskot/phrasal.webp"),
  soruIsareti: require("../../assets/images/maskot/soru_isareti.webp"),
  market: require("../../assets/images/maskot/market_anasayfa.webp"),
  // Market Modal Resimleri
  marketGuc: require("../../assets/images/maskot/guc_magazasi.webp"),
  marketTohum: require("../../assets/images/maskot/tohum_pazarı.webp"),
  marketPhrasal: require("../../assets/images/maskot/market_pharasal.webp"),
};

// Premium Header with Logo - FULL COVERAGE
const PremiumHeader = ({ coins, level, streak, onProfilePress }: any) => {
  const config = usePerformanceStore(s => s.config);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Shimmer animation - only if enabled
    if (config.enableShimmer) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ).start();
    }

    // Logo glow pulse - only if enabled
    if (config.enablePulseAnimations) {
      Animated.loop(
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
        <View style={styles.logoWrapper}>
          {/* Glow Effect - only if enabled */}
          {config.enableGlow && (
            <Animated.View style={[styles.logoGlow, { opacity: logoGlow }]} />
          )}
          <View style={styles.logoContainer}>
            <Image
              source={PRELOADED_IMAGES.logo}
              style={styles.logoImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
            />
          </View>
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>FarmEnglish</Text>
          <Text style={styles.headerSubtitle}>Kelime Çiftliğin</Text>
        </View>
      </Pressable>

      {/* Right: Stats Pills */}
      <View style={styles.headerRightSection}>
        {/* Coins */}
        <View style={styles.statPill}>
          {config.enableShimmer && (
            <Animated.View
              style={[
                styles.pillShimmer,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            />
          )}
          <Coins color="#FFD700" size={16} strokeWidth={2.5} />
          <Text style={styles.statPillText}>
            {coins >= 10000
              ? `${(coins / 1000).toFixed(0)}k`
              : coins >= 1000
                ? `${(coins / 1000).toFixed(1)}k`
                : coins}
          </Text>
        </View>

        {/* Level */}
        <View style={[styles.statPill, styles.levelPill]}>
          <Award color="#A855F7" size={16} strokeWidth={2.5} />
          <Text style={[styles.statPillText, { color: "#A855F7" }]}>
            {level}
          </Text>
        </View>
      </View>
    </View>
  );
};

// 🎮 TUTORIAL DIALOG - Premium Oyun Tanıtımı
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
      icon: "�",
      title: "Hoş Geldin Farmer!",
      description:
        "FarmEnglish ile kelime öğrenmek çok kolay! Sana adım adım anlatayım. Bu tarla gibi - tohum ek, büyüt, hasat et!",
      color: "#22C55E",
      tip: "🌱 Her kelime bir tohum gibi büyüyecek!",
    },
    {
      icon: "📝",
      title: "1. QUIZ ile Başla",
      description:
        "Ana menüden QUIZ'e gir. Sana İngilizce kelimeler sorulacak, doğru Türkçe anlamını seç.\n\n✅ Doğru = Kelime tarlana eklenir!\n❌ Yanlış = Tarlana kırmızı olarak eklenir, tekrar çalışman gerekir.",
      color: "#A855F7",
      tip: "💡 Bilmediğin kelimeler de tarlana gider!",
    },
    {
      icon: "🌱",
      title: "2. Tarlana Bak",
      description:
        "Quiz'den sonra ÇİFTLİK'e git. Burada:\n\n🔴 KIRMIZI = Hiç doğru yapmadın (acil çalış!)\n🟡 Sarı = 1 doğru oturum.\n🟡 Sarı = 2 doğru oturum.\n🟢 YEŞİL = 3 doğru (HASAT HAZIR!)",
      color: "#F97316",
      tip: "🎯 Kırmızı kartlara dokun, quiz çöz!",
    },
    {
      icon: "🌾",
      title: "3. Hasat Et",
      description:
        'Bir kelimeyi tarlanda hasat hazır olana kadar büyüt.→ Yeterli olgunluğa ulaşınca hasat edebilirsin.\n\nHasat edersen kelime ENVANTER\'e gider ve artık öğrenildi sayılır. 🎉',
      color: "#22C55E",
      tip: "📦 Envanterdeki kelimeler senin hazinen!",
    },
    {
      icon: "🔥",
      title: "4. Combo Yap = Bonus Kazan",
      description:
        "Quiz'de üst üste doğru cevap verirsen COMBO artar:\n\n🔥 3+ combo = Ekstra coin\n💥 5+ combo = Daha fazla coin\n⚡ 10+ combo = Çok daha fazla!\n\n❌ Yanlış cevap combo'yu sıfırlar!",
      color: "#EF4444",
      tip: "🛡️ Combo Shield alırsan yanlışta combo kırılmaz!",
    },
    {
      icon: "📦",
      title: "5. Envanter",
      description:
        'Hasat edilen kelimeler ENVANTER\'e gider.\n\n⭐ 1x hasat = USTA\n💎 2x hasat = ELMAS\n👑 3x hasat = KRALİYET\n\n"Tarlaya Gönder" ile tekrar çalışabilirsin!',
      color: "#60A5FA",
      tip: "🔄 Aynı kelimeyi birden fazla hasat et!",
    },
    {
      icon: "🧩",
      title: "6. Yapboz Modu",
      description:
        "Örnek cümlelerdeki kelimeleri doğru sıraya diz! 4300+ örnek cümle! Her doğru yapboz = Puzzle puanı.\n\nYapboz leveli ayrıdır, normal quiz'den bağımsız çalışır.",
      color: "#EC4899",
      tip: "📖 Cümle içinde kelimeyi görmek akılda kalıcı!",
    },
    {
      icon: "🌳",
      title: "7. Phrasal Verbs",
      description:
        '"give up", "look after" gibi deyimsel fiiller.\n\nAyrı tarlaları var, ayrı quiz\'leri var. İngilizce\'nin en önemli parçası!',
      color: "#10B981",
      tip: "💬 Günlük konuşmada çok kullanılır!",
    },
    {
      icon: "🏪",
      title: "8. Market",
      description:
        "Coin harcayarak:\n\n🌱 Yeni kelime tohumları al\n⚡ Boost'lar satın al\n🛡️ Combo Shield al\n\nCoini Quiz'lerden ve hasatlardan kazanırsın!",
      color: "#FBBF24",
      tip: "💰 Her doğru cevap = Coin!",
    },
    {
      icon: "🌱",
      title: "9. Tohum Pazarı",
      description:
        "Ana sayfadaki TOHUM PAZARI'ndan quiz çözmeden direkt kelime ekleyebilirsin!\n\n💰 Coin harca, tohum al\n🌾 Direkt tarlana ekle\n📚 İstediğin kelimeyi seç\n\nQuiz beklemeden öğrenmeye başla!",
      color: "#8B5CF6",
      tip: "⚡ Hızlı başlamak istersen tohum pazarı ideal!",
    },
    {
      icon: "⚙️",
      title: "10. Performans Ayarları",
      description:
        "Uygulama kasıyorsa AYARLAR → PERFORMANS bölümüne git:\n\n🐢 DÜŞÜK = Animasyonlar kapalı (zayıf cihazlar)\n⚡ ORTA = Dengeli\n🚀 YÜKSEK = Tam performans\n\nKendi cihazına uygun seviyeyi seç!",
      color: "#64748B",
      tip: "💡 Kasma varsa DÜŞÜK modu dene!",
    },
    {
      icon: "🚀",
      title: "Hazırsın!",
      description:
        "Şimdi Quiz'e git ve ilk kelimelerini öğrenmeye başla!\n\n🎯 İlk hedef: 3 kelimeyi YEŞİL yap ve HASAT ET!\n\nHaydi, tarlana tohum ekme zamanı! 🌾",
      color: "#22C55E",
      tip: "💪 Her gün biraz çalış, büyük sonuçlar al!",
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
              <Text style={tutorialStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Icon */}
            <View style={tutorialStyles.iconContainer}>
              <Text style={tutorialStyles.icon}>{currentTutorial.icon}</Text>
            </View>

            {/* Content */}
            <Text
              style={[tutorialStyles.title, { color: currentTutorial.color }]}
            >
              {currentTutorial.title}
            </Text>
            <Text style={tutorialStyles.description}>
              {currentTutorial.description}
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
                  {currentTutorial.tip}
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
                  <Text style={tutorialStyles.prevButtonText}>← Geri</Text>
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
                    ? "Başla! 🚀"
                    : "İleri →"}
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

// 🔥 PREMIUM MENU CARD - Full Image Coverage + Shine + Glow + Bounce
const PremiumMenuCard = ({
  onPress,
  imageSource,
  title,
  subtitle,
  size = "medium",
  accentColor = "#FFFFFF",
  delay = 0,
  hasBounce = false,
  helpText,
}: any) => {
  const config = usePerformanceStore(s => s.config);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in - only if card entry animations enabled
    if (config.enableCardEntryAnimation) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(1);
    }

    // Shine effect - only if shimmer enabled
    if (config.enableShimmer) {
      Animated.loop(
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
      ).start();
    }

    // Glow pulse - only if glow and pulse enabled
    if (config.enableGlow && config.enablePulseAnimations) {
      Animated.loop(
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
      ).start();
    }

    // Bounce for Quiz and Farm - only if pulse enabled
    if (hasBounce && config.enablePulseAnimations) {
      Animated.loop(
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
      ).start();
    }
  }, [config.enableCardEntryAnimation, config.enableShimmer, config.enableGlow, config.enablePulseAnimations]);

  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 300],
  });

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

  const cardHeight =
    size === "large"
      ? IS_SMALL_DEVICE
        ? 170
        : 195
      : size === "small"
        ? IS_SMALL_DEVICE
          ? 170
          : 195
        : IS_SMALL_DEVICE
          ? 160
          : 180;

  const wrapperStyle =
    size === "large"
      ? styles.cardWrapperLarge
      : size === "small"
        ? styles.cardWrapperSmall
        : styles.cardWrapperMedium;

  return (
    <Animated.View
      style={[
        wrapperStyle,
        {
          transform: [{ scale: scaleAnim }, { scale: bounceAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[styles.cardContainer, { height: cardHeight }]}
      >
        {/* Outer Glow - only if enabled */}
        {config.enableGlow && (
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
            <Image
              source={imageSource}
              style={styles.fullImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
            />

            {/* Gradient Overlay for Text Readability */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"]}
              style={styles.imageOverlay}
            />

            {/* Shine Effect - only if enabled */}
            {config.enableShimmer && (
              <Animated.View
                style={[
                  styles.shineEffect,
                  {
                    transform: [
                      { translateX: shineTranslate },
                      { rotate: "25deg" },
                    ],
                  },
                ]}
              />
            )}

            {/* ❓ Help Icon - Top Right */}
            {helpText && (
              <TouchableOpacity
                style={styles.helpIconContainer}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation?.();
                  haptic.light();
                  Alert.alert(title || "Bilgi", helpText);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.helpIconText}>❓</Text>
              </TouchableOpacity>
            )}

            {/* Content */}
            {(title || subtitle) && (
              <View style={styles.cardTextContainer}>
                {title && (
                  <Text style={[styles.cardTitle, { color: accentColor }]}>
                    {title}
                  </Text>
                )}
                {subtitle && (
                  <Text style={styles.cardSubtitle}>{subtitle}</Text>
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
          helpText="Kelime quizü çöz, doğru bil tarlana tohum ek! Yanlış bilsen bile kelime tarlana eklenir."
        />
        <PremiumMenuCard
          onPress={onRandomPress}
          imageSource={PRELOADED_IMAGES.soruIsareti}
          title="NASIL?"
          subtitle="Oynanır"
          size="small"
          accentColor="#FBBF24"
          delay={50}
        />
      </View>

      {/* Row 2: ENVANTER (small) | FARM (large) */}
      <View style={styles.gridRow}>
        <PremiumMenuCard
          onPress={onInventoryPress}
          imageSource={PRELOADED_IMAGES.envanter}
          title="ENVANTER"
          subtitle="Hasatların için tarlaya ek!"
          size="small"
          accentColor="#60A5FA"
          delay={100}
          helpText="Hasat ettiğin kelimeler burada! Tarlaya geri göndererek tekrar çalışabilirsin."
        />
        <PremiumMenuCard
          onPress={onFarmPress}
          imageSource={PRELOADED_IMAGES.farm}
          title="ÇİFTLİK"
          subtitle="Kelimelerini büyüt hasat et!"
          size="large"
          accentColor="#22C55E"
          delay={150}
          hasBounce={true}
          helpText="Kelimelerini burada büyüt! Quiz çöz, yeşille, hasat et. Hasat = Öğrendin!"
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
          helpText="Cümlelerdeki kelimeleri doğru sıraya diz! 4300+ örnek cümle ile pratik yap."
        />
        <PremiumMenuCard
          onPress={onPhrasalPress}
          imageSource={PRELOADED_IMAGES.phrasal}
          title="PHRASAL"
          subtitle="Deyimleri öğren"
          size="medium"
          accentColor="#EC4899"
          delay={250}
          helpText="give up, look after gibi deyimsel fiilleri öğren! Ayrı tarla, ayrı quiz."
        />
      </View>

      {/* Row 4: BATTLE - Savaş Modu Butonu */}
      <TouchableOpacity
        style={[styles.marketContainer, { marginBottom: SPACING.md }]}
        onPress={onBattlePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#8b5cf6', '#6d28d9', '#4c1d95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.marketFullImage}
        />

        {/* Content */}
        <View style={styles.marketContent}>
          <View style={styles.marketTextContainer}>
            <Text style={styles.marketTitle}>⚔️ SAVAŞ MODU</Text>
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
        <LinearGradient
          colors={['#14B8A6', '#0D9488', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.marketFullImage}
        />

        {/* Content */}
        <View style={styles.marketContent}>
          <View style={styles.marketTextContainer}>
            <Text style={styles.marketTitle}>🎤 SESYAP</Text>
            <Text style={styles.marketSubtitle}>
              Konuş • Doğruluk kontrolü • Telaffuz pratik
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
            <Text style={styles.marketTitle}>🏪 MARKET</Text>
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
  const farm = useFarmStore((state) => state.farm);
  const inventory = useFarmStore((state) => state.inventory);
  const phrasalVerbFarm = useFarmStore((state) => state.phrasalVerbFarm);
  const phrasalVerbInventory = useFarmStore(
    (state) => state.phrasalVerbInventory,
  );
  const pool = useFarmStore((state) => state.pool);
  const xp = useFarmStore((state) => state.xp);
  const level = useFarmStore((state) => state.level);
  const coins = useFarmStore((state) => state.coins);
  const achievements = useFarmStore((state) => state.achievements);
  const bestStreak = useFarmStore((state) => state.bestStreak);
  const streak = useFarmStore((state) => state.streak);
  const currentCombo = useFarmStore((state) => state.currentCombo);
  const dailyGoal = useFarmStore((state) => state.dailyGoal);
  const dailyProgress = useFarmStore((state) => state.dailyProgress);
  const toggleFavorite = useFarmStore((state) => state.toggleFavorite);
  const resetProgress = useFarmStore((state) => state.resetProgress);
  const plantFromInventory = useFarmStore((state) => state.plantFromInventory);
  const answerMiniQuiz = useFarmStore((state) => state.answerMiniQuiz);
  const activeBoosts = useFarmStore((state) => state.activeBoosts);
  const totalQuizzes = useFarmStore((state) => state.totalQuizzes);
  const harvestWord = useFarmStore((state) => state.harvestWord);
  // 🎓 Tutorial
  const tutorialStep = useFarmStore((state) => state.tutorialStep);
  const resetTutorial = useFarmStore((state) => state.resetTutorial);
  const skipTutorial = useFarmStore((state) => state.skipTutorial);
  const tutorialInterrupted = useFarmStore((state) => state.tutorialInterrupted);
  const setTutorialInterrupted = useFarmStore((state) => state.setTutorialInterrupted);
  
  // 🎯 Günlük Görevler
  const checkAndResetDailyQuests = useFarmStore((state) => state.checkAndResetDailyQuests);

  // 🖼️ Preload images on mount for performance
  useEffect(() => {
    const preloadImages = async () => {
      try {
        await Promise.all([
          Asset.loadAsync(PRELOADED_IMAGES.logo),
          Asset.loadAsync(PRELOADED_IMAGES.quiz),
          Asset.loadAsync(PRELOADED_IMAGES.farm),
          Asset.loadAsync(PRELOADED_IMAGES.envanter),
          Asset.loadAsync(PRELOADED_IMAGES.puzzle),
          Asset.loadAsync(PRELOADED_IMAGES.phrasal),
          Asset.loadAsync(PRELOADED_IMAGES.soruIsareti),
          Asset.loadAsync(PRELOADED_IMAGES.market),
        ]);
      } catch (e) {
        // Fail silently
      }
    };
    preloadImages();
  }, []);

  // MiniQuiz State
  const [quizWordId, setQuizWordId] = useState<string | null>(null);

  // 🎮 Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  // 🏪 Market Modal State
  const [showMarket, setShowMarket] = useState(false);
  
  // 🎯 Quest Panel State
  const [questsPanelVisible, setQuestsPanelVisible] = useState(false);
  const [cardShopVisible, setCardShopVisible] = useState(false);

  const quizWord = useMemo(() => {
    if (!quizWordId) return null;
    const allWords = [
      ...farm,
      ...inventory,
      ...phrasalVerbFarm,
      ...phrasalVerbInventory,
    ];
    return allWords.find((w) => w.id === quizWordId) || null;
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
    }, [checkAndResetDailyQuests]),
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
  // 🔒 Sadece uygulama arka plana gidip dönüldüyse kilit overlay'i göster; devam et tıklanınca kalksın
  const showHomeTutorialLock = isTutorialActive && !isFullScreenTutorial && tutorialInterrupted;
  const tutorialLockMessage = useMemo(() => {
    const lineText = (tutorialDialog.lines || []).filter(Boolean).join(" ");
    return lineText || "Eğitim devam ediyor. İlgili sekmeye geçerek adımı tamamla.";
  }, [tutorialDialog.lines]);

  const unlockedAchievements = useMemo(
    () => achievements.filter((a) => a.unlocked).length,
    [achievements],
  );

  // Word categories
  const learningWords = useMemo(() => {
    return [...farm, ...phrasalVerbFarm]
      .filter((w) => (w.masterLevel || 0) === 0 && (w.wrongCount || 0) < 3)
      .sort((a, b) => (a.wrongCount || 0) - (b.wrongCount || 0))
      .slice(0, 10);
  }, [farm, phrasalVerbFarm]);

  const harvestWords = useMemo(() => {
    return [...farm, ...phrasalVerbFarm]
      .filter((w) => (w.masterLevel || 0) === 0 && (w.wrongCount || 0) >= 2)
      .slice(0, 10);
  }, [farm, phrasalVerbFarm]);

  const masterWords = useMemo(() => {
    return [...farm, ...phrasalVerbFarm]
      .filter((w) => (w.masterLevel || 0) > 0 && !(w as any).normalHarvested)
      .slice(0, 10);
  }, [farm, phrasalVerbFarm]);

  const favoriteWords = useMemo(() => {
    // 🎯 normalHarvested olanları filtrele (duplicate önleme)
    const activeFarm = [...farm, ...phrasalVerbFarm].filter(w => !(w as any).normalHarvested);
    return [...activeFarm, ...inventory, ...phrasalVerbInventory]
      .filter((w) => w.isFavorite === true)
      .slice(0, 10);
  }, [farm, inventory, phrasalVerbFarm, phrasalVerbInventory]);

  // 🧩 Puzzle kelimeleri - forPuzzleOnly olanlar
  const puzzleWords = useMemo(() => {
    return farm.filter((w) => (w as any).forPuzzleOnly === true).slice(0, 10);
  }, [farm]);

  const handleNav = (route: string, params?: any) => {
    const now = Date.now();
    if (isNavigating.current || now - lastNavigationTime.current < 500) {
      return;
    }

    isNavigating.current = true;
    lastNavigationTime.current = now;

    haptic.medium();

    InteractionManager.runAfterInteractions(() => {
      navigation.navigate(route, params);
    });

    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  // 🧩 PUZZLE -> Farm puzzle sekmesine yönlendir
  const handlePuzzlePress = () => {
    handleNav("Farm", { tab: "puzzle" });
  };

  const handleStudyWord = useCallback(
    (word: any) => {
      const now = Date.now();
      if (now - lastNavigationTime.current < 300) {
        return;
      }
      lastNavigationTime.current = now;

      haptic.medium();

      const isInInventory =
        inventory.some((w) => w.id === word.id) ||
        phrasalVerbInventory.some((w) => w.id === word.id);
      if (isInInventory) {
        plantFromInventory(word.id);
      }

      setQuizWordId(word.id);
    },
    [inventory, phrasalVerbInventory, plantFromInventory],
  );

  const handleQuizAnswer = useCallback(
    (correct: boolean, count?: number, wordId?: string) => {
      // 🎯 MiniQuizDialog'dan gelen wordId'yi öncelikli kullan (closure sorunu önlenir)
      const targetWordId = wordId || quizWordId;
      if (targetWordId) {
        answerMiniQuiz(targetWordId, correct, count || 1);
      }
      setQuizWordId(null);
    },
    [quizWordId, answerMiniQuiz],
  );

  const handleToggleFavorite = useCallback(
    (wordId: string) => {
      haptic.light();
      toggleFavorite(wordId);
    },
    [toggleFavorite],
  );

  // 🌾 HASAT İŞLEMİ - Haptic, ses ve ödül gösterimi
  const handleHarvestWord = useCallback(
    (wordId: string) => {
      if (!harvestWord) return;

      // Haptic feedback
      haptic.heavy();

      // Hasat işlemi
      const result = harvestWord(wordId);

      if (result && result.success) {
        // Başarılı hasat sesi
        sound.playHarvest();

        // Ödül göster
        const coinReward = result.coins || 0;
        const xpReward = result.xp || 0;

        // Toast notification'lar: önce coin, ardından XP (gecikmesiz)
        if (coinReward > 0) {
          showRewardToast('coin', coinReward);
        }
        if (xpReward > 0) {
          showRewardToast('xp', xpReward);
        }
      }
    },
    [harvestWord],
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
          pointerEvents={showHomeTutorialLock ? "none" : "auto"}
        >
          {/* Premium Header */}
          <PremiumHeader
            coins={coins}
            level={level}
            streak={currentCombo}
            onProfilePress={() => handleNav("Profile")}
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

          {/* 🎨 Kart Mağazası Butonu - GEÇİCİ OLARAK DEVRE DIŞI */}
          {/* <TouchableOpacity
            style={styles.questsButton}
            onPress={() => {
              haptic.light();
              setCardShopVisible(true);
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#A855F7', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.questsGradient}
            >
              <Text style={styles.questsButtonIcon}>🎨</Text>
              <Text style={styles.questsButtonText}>Kart Mağazası</Text>
            </LinearGradient>
          </TouchableOpacity> */}

          {/* Premium Grid Menu */}
          <PremiumGridMenu
            onQuizPress={() => handleNav("Quiz")}
            onFarmPress={() => handleNav("Farm")}
            onInventoryPress={() => handleNav("Inventory")}
            onPuzzlePress={handlePuzzlePress}
            onPhrasalPress={() => handleNav("PhrasalVerbsMenu")}
            onRandomPress={() => {
              haptic.medium();
              setShowTutorial(true);
            }}
            onMarketPress={() => {
              haptic.medium();
              setShowMarket(true);
            }}
            onBattlePress={() => handleNav("BattleMenu")}
            onSesYapPress={() => handleNav("SesYap")}
          />

          {/* 📚 Pratik Merkezi - Yeni Öğrenme Modülleri */}
          <View style={styles.pratikMerkeziContainer}>
            <View style={styles.pratikMerkeziHeader}>
              <Text style={styles.pratikMerkeziTitle}>📚 Pratik Merkezi</Text>
              <Text style={styles.pratikMerkeziSubtitle}>Dilbilgisi ve kelime pratiği</Text>
            </View>
            {/* İlk satır - 2 kart */}
            <View style={styles.pratikMerkeziGrid}>
              {/* Kelime Eşleştirme */}
              <TouchableOpacity 
                style={styles.pratikMerkeziCard} 
                onPress={() => handleNav("WordMatch")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.05)']}
                  style={styles.pratikMerkeziCardGradient}
                >
                  <Text style={styles.pratikMerkeziCardEmoji}>🔗</Text>
                  <Text style={styles.pratikMerkeziCardTitle}>Kelime Eşleştir</Text>
                  <Text style={styles.pratikMerkeziCardDesc}>İngilizce-Türkçe eşle</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Boşluk Doldurma */}
              <TouchableOpacity 
                style={styles.pratikMerkeziCard} 
                onPress={() => handleNav("FillBlank")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                  style={styles.pratikMerkeziCardGradient}
                >
                  <Text style={styles.pratikMerkeziCardEmoji}>📝</Text>
                  <Text style={styles.pratikMerkeziCardTitle}>Boşluk Doldur</Text>
                  <Text style={styles.pratikMerkeziCardDesc}>at, in, on kullanımı</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {/* İkinci satır - 2 kart */}
            <View style={[styles.pratikMerkeziGrid, { marginTop: 8 }]}>
              {/* Deyimler */}
              <TouchableOpacity 
                style={styles.pratikMerkeziCard} 
                onPress={() => handleNav("Idioms")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']}
                  style={styles.pratikMerkeziCardGradient}
                >
                  <Text style={styles.pratikMerkeziCardEmoji}>🎭</Text>
                  <Text style={styles.pratikMerkeziCardTitle}>Deyimler</Text>
                  <Text style={styles.pratikMerkeziCardDesc}>break the ice...</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {/* Üçüncü satır - YDS Quiz */}
            <View style={[styles.pratikMerkeziGrid, { marginTop: 8 }]}>
              {/* YDS Quiz */}
              <TouchableOpacity 
                style={styles.pratikMerkeziCard} 
                onPress={() => handleNav("YDSQuiz")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.3)', 'rgba(79, 70, 229, 0.15)']}
                  style={styles.pratikMerkeziCardGradient}
                >
                  <Text style={styles.pratikMerkeziCardEmoji}>🎓</Text>
                  <Text style={styles.pratikMerkeziCardTitle}>YDS Soruları</Text>
                  <Text style={styles.pratikMerkeziCardDesc}>200+ akademik soru</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Kelime Formları */}
              <TouchableOpacity 
                style={styles.pratikMerkeziCard} 
                onPress={() => handleNav("YDSWordForms")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.3)', 'rgba(5, 150, 105, 0.15)']}
                  style={styles.pratikMerkeziCardGradient}
                >
                  <Text style={styles.pratikMerkeziCardEmoji}>📝</Text>
                  <Text style={styles.pratikMerkeziCardTitle}>Kelime Formları</Text>
                  <Text style={styles.pratikMerkeziCardDesc}>160+ form dönüşümü</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* 🌱 Kendi Kelime Kartı */}
          <TouchableOpacity
            style={{
              marginHorizontal: 16,
              marginTop: 20,
              marginBottom: 8,
              borderRadius: 18,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: 'rgba(34, 197, 94, 0.35)',
              shadowColor: '#22C55E',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
            onPress={() => handleNav("CustomWordCard")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.08)', 'rgba(34, 197, 94, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 18,
                gap: 14,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 26 }}>🌱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#fff',
                  letterSpacing: 0.3,
                }}>
                  Kendi Kelime Kartını Oluştur
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.55)',
                  marginTop: 3,
                }}>
                  Kendi tohumlarını ek, büyüt, hasat et 🌾
                </Text>
              </View>
              <View style={{
                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(255, 215, 0, 0.25)',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFD700' }}>💰 2800</Text>
              </View>
              <ChevronRight size={20} color="rgba(34, 197, 94, 0.7)" />
            </LinearGradient>
          </TouchableOpacity>

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
                navigation.navigate(
                  "Farm" as never,
                  { filter: "study" } as never,
                );
              }}
              onCardPress={handleStudyWord}
              onHarvest={handleHarvestWord}
            />

            <DashboardSection
              title="Hasat Hazır"
              subtitle="Envantere gönderilebilir"
              icon="sprout"
              iconColor="#22c55e"
              data={harvestWords}
              type="harvest"
              onSeeAll={() => {
                haptic.light();
                navigation.navigate(
                  "Farm" as never,
                  { filter: "ready" } as never,
                );
              }}
              onCardPress={handleStudyWord}
              onHarvest={handleHarvestWord}
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
                navigation.navigate(
                  "Farm" as never,
                  { filter: "master" } as never,
                );
              }}
              onCardPress={handleStudyWord}
              onHarvest={handleHarvestWord}
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
                navigation.navigate(
                  "Farm" as never,
                  { filter: "favorites" } as never,
                );
              }}
              onCardPress={handleStudyWord}
              onToggleFavorite={handleToggleFavorite}
            />

            <DashboardSection
              title="🧩 Puzzle Kartları"
              subtitle="Yapboz tarlasındaki kelimeler"
              icon="puzzle"
              iconColor="#8B5CF6"
              data={puzzleWords}
              type="puzzle"
              onSeeAll={() => {
                haptic.light();
                navigation.navigate(
                  "Farm" as never,
                  { tab: "puzzle" } as never,
                );
              }}
              onCardPress={handleStudyWord}
            />

            {/* 🏆 Başarımlarım Bölümü */}
            <TouchableOpacity
              style={styles.achievementsSection}
              activeOpacity={0.85}
              onPress={() => {
                haptic.light();
                navigation.navigate("Achievements" as never);
              }}
            >
              <LinearGradient
                colors={["rgba(124, 58, 237, 0.2)", "rgba(34, 197, 94, 0.15)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.achievementsCard}
              >
                <View style={styles.achievementsLeft}>
                  <View style={styles.achievementsIconWrap}>
                    <Trophy size={28} color="#fbbf24" />
                  </View>
                  <View>
                    <Text style={styles.achievementsTitle}>
                      🏆 Başarımlarım
                    </Text>
                    <Text style={styles.achievementsSubtitle}>
                      {unlockedAchievements}/{achievements.length} başarım
                      açıldı
                    </Text>
                  </View>
                </View>
                <ChevronRight size={24} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Tutorial Debug Section */}
            <View style={{ marginTop: SPACING.xl, gap: SPACING.md }}>
              <TouchableOpacity
                style={styles.tutorialResetButton}
                onPress={() => {
                  haptic.medium();
                  Alert.alert(
                    "🎓 Tutorial'ı Baştan Başlat",
                    "Tutorial baştan başlayacak. Devam etmek istiyor musunuz?",
                    [
                      { text: "İptal", style: "cancel" },
                      {
                        text: "Başlat",
                        style: "default",
                        onPress: () => {
                          haptic.heavy();
                          resetTutorial();
                          Alert.alert(
                            "✅ Tutorial Sıfırlandı",
                            "Tutorial baştan başlayacak."
                          );
                        },
                      },
                    ]
                  );
                }}
              >
                <LinearGradient
                  colors={[
                    "rgba(59, 130, 246, 0.2)",
                    "rgba(37, 99, 235, 0.2)",
                  ]}
                  style={styles.tutorialResetGradient}
                >
                  <Sparkles color="#3B82F6" size={20} />
                  <Text style={styles.tutorialResetText}>
                    Tutorial'ı Baştan Başlat
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tutorialResetButton}
                onPress={() => {
                  haptic.light();
                  Alert.alert(
                    "🐛 Tutorial Debug",
                    `Mevcut Tutorial Adımı: ${tutorialStep}\n\nTutorial Durumunu Görmek için OK'a tıklayın.`,
                    [{ text: "OK", style: "default" }]
                  );
                }}
              >
                <LinearGradient
                  colors={[
                    "rgba(168, 85, 247, 0.2)",
                    "rgba(147, 51, 234, 0.2)",
                  ]}
                  style={styles.tutorialResetGradient}
                >
                  <Settings color="#A855F7" size={20} />
                  <Text style={[styles.tutorialResetText, { color: "#A855F7" }]}>
                    Tutorial Debug
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

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
                <Text style={styles.homeTutorialSkipText}>Serbest bırak</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.homeTutorialButton, styles.homeTutorialResume]}
                onPress={handleHomeTutorialResume}
                activeOpacity={0.85}
              >
                <Text style={styles.homeTutorialResumeText}>Eğitime devam et</Text>
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
              onNavigate={(screen: string, params?: any) => {
                setQuestsPanelVisible(false);
                setTimeout(() => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: screen, params }],
                    })
                  );
                }, 100);
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

      {/* 🎨 Card Shop Modal - GEÇİCİ OLARAK DEVRE DIŞI */}
      {/* <Modal
        visible={cardShopVisible}
        animationType="slide"
        transparent
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
      </Modal> */}

      {/* 📘 Tutorial Final Quiz Dialog */}
      <TutorialFinalQuizDialog
        visible={tutorialStep === "STEP_18_PERFECT_DONE"}
      />

      {/* 🎯 Tutorial Final Quiz Premium - STEP_19 */}
      <TutorialFinalQuizPremium
        visible={tutorialStep === "STEP_19_FINAL_QUIZ"}
        onComplete={() => {
          // Final quiz tamamlandı
        }}
      />

      {/* 👤 Nickname Modal - Tutorial sonrası isim isteme */}
      <NicknameModal />

      {/* 🎮 Tutorial Dialog */}
      <TutorialDialog
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />


      {/* 🏪 Market Modal - Premium 3-Card Layout */}
      <Modal
        visible={showMarket}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMarket(false)}
      >
        <View style={styles.marketModalOverlay}>
          <View style={styles.marketModalContent}>
            <LinearGradient
              colors={["#13131A", "#0a0a0f", "#13131A"]}
              style={styles.marketModalGradient}
            >
              {/* Header */}
              <View style={styles.marketModalHeader}>
                <View style={styles.marketModalHeaderLeft}>
                  <Text style={styles.marketModalTitle}>🏪 Market</Text>
                  <Text style={styles.marketModalSubtitle}>
                    Güçlen, Geliş, Kazan!
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowMarket(false)}
                  style={styles.marketModalCloseBtn}
                >
                  <Text style={styles.marketModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Premium Market Cards */}
              <View style={styles.marketCardsContainer}>
                {/* ⚡ Güç Mağazası */}
                <TouchableOpacity
                  style={styles.marketPremiumCard}
                  onPress={() => {
                    setShowMarket(false);
                    haptic.medium();
                    navigation.navigate("Store" as never);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.marketCardImageWrapper}>
                    <Image
                      source={PRELOADED_IMAGES.marketGuc}
                      style={styles.marketFullCoverImage}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={[
                        "transparent",
                        "rgba(0,0,0,0.7)",
                        "rgba(0,0,0,0.9)",
                      ]}
                      style={styles.marketImageOverlay}
                    />
                    <View style={styles.marketCardTextOverlay}>
                      <Text style={styles.marketPremiumTitle}>
                        ⚡ Güç Mağazası
                      </Text>
                      <Text style={styles.marketPremiumSubtitle}>
                        Boost'lar, Hint'ler ve Paketler
                      </Text>
                    </View>
                    <View style={styles.marketPremiumArrow}>
                      <ChevronRight size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* 🌱 Tohum Pazarı */}
                <TouchableOpacity
                  style={styles.marketPremiumCard}
                  onPress={() => {
                    setShowMarket(false);
                    haptic.medium();
                    navigation.navigate("SeedMarket" as never);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.marketCardImageWrapper}>
                    <Image
                      source={PRELOADED_IMAGES.marketTohum}
                      style={styles.marketFullCoverImage}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={[
                        "transparent",
                        "rgba(0,0,0,0.7)",
                        "rgba(0,0,0,0.9)",
                      ]}
                      style={styles.marketImageOverlay}
                    />
                    <View style={styles.marketCardTextOverlay}>
                      <Text style={styles.marketPremiumTitle}>
                        🌱 Tohum Pazarı
                      </Text>
                      <Text style={styles.marketPremiumSubtitle}>
                        4000+ premium kelime tohumu
                      </Text>
                    </View>
                    <View style={styles.marketPremiumArrow}>
                      <ChevronRight size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* 📚 Phrasal Verbs */}
                <TouchableOpacity
                  style={styles.marketPremiumCard}
                  onPress={() => {
                    setShowMarket(false);
                    haptic.medium();
                    navigation.navigate("PhrasalVerbsMenu" as never);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.marketCardImageWrapper}>
                    <Image
                      source={PRELOADED_IMAGES.marketPhrasal}
                      style={styles.marketFullCoverImage}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={[
                        "transparent",
                        "rgba(0,0,0,0.7)",
                        "rgba(0,0,0,0.9)",
                      ]}
                      style={styles.marketImageOverlay}
                    />
                    <View style={styles.marketCardTextOverlay}>
                      <Text style={styles.marketPremiumTitle}>
                        📚 Phrasal Verbs
                      </Text>
                      <Text style={styles.marketPremiumSubtitle}>
                        200+ phrasal verb ustası ol!
                      </Text>
                    </View>
                    <View style={styles.marketPremiumArrow}>
                      <ChevronRight size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.xs,
  },
  headerLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  logoWrapper: {
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 20,
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(34, 197, 94, 0.8)",
    backgroundColor: "#0A0A0F",
  },
  logoImage: {
    width: "260%",
    height: "260%",
    marginLeft: "-80%",
    marginTop: "-80%",
  },
  headerTitleContainer: {
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerRightSection: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 215, 0, 0.25)",
    overflow: "hidden",
    gap: 5,
  },
  levelPill: {
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    borderColor: "rgba(168, 85, 247, 0.25)",
  },
  pillShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 50,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    transform: [{ skewX: "-20deg" }],
  },
  statPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFD700",
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

  // Full Image
  fullImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
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
    top: 8,
    right: 8,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  helpIconText: {
    fontSize: 14,
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

  // Card Title
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
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

  // Dashboard Container
  dashboardContainer: {
    gap: SPACING.lg,
  },

  // Achievements Section
  achievementsSection: {
    marginTop: SPACING.md,
  },
  achievementsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(124, 58, 237, 0.3)",
  },
  achievementsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  achievementsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  achievementsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  achievementsSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
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

  // 🏪 Market Container - Ana sayfa butonu (Premium Full Image)
  marketContainer: {
    marginTop: GRID_GAP,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    height: IS_SMALL_DEVICE ? 100 : 120,
    position: "relative",
  },
  marketFullImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  marketOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  marketContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  marketTextContainer: {
    flex: 1,
  },
  marketTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  marketSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // 🏪 Market Modal Styles - Premium 3-Card Layout
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
  // 🎓 Tutorial güvenlik kilidi (Home)
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

  // 📚 Pratik Merkezi Styles
  pratikMerkeziContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  pratikMerkeziHeader: {
    marginBottom: SPACING.md,
  },
  pratikMerkeziTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pratikMerkeziSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  pratikMerkeziGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pratikMerkeziCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pratikMerkeziCardGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  pratikMerkeziCardEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  pratikMerkeziCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pratikMerkeziCardDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default HomeScreen;
