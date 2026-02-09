import Animated, {
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';

// 🎨 APPLE-STYLE SPRING CONFIGS
export const SPRING_CONFIGS = {
  // Bouncy - Duolingo style
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 0.5,
  },
  // Snappy - Quick response
  snappy: {
    damping: 15,
    stiffness: 400,
    mass: 0.3,
  },
  // Gentle - Smooth ease
  gentle: {
    damping: 20,
    stiffness: 150,
    mass: 0.8,
  },
  // Wobbly - Fun effect
  wobbly: {
    damping: 8,
    stiffness: 180,
    mass: 0.4,
  },
  // Stiff - Minimal bounce
  stiff: {
    damping: 25,
    stiffness: 300,
    mass: 0.5,
  },
};

// 🚀 STAGGER DELAY HELPER
export const getStaggerDelay = (index: number, baseDelay: number = 100) => {
  return index * baseDelay;
};

// 💫 PULSE ANIMATION
export const usePulseAnimation = () => {
  const scale = useSharedValue(1);
  
  const pulse = () => {
    scale.value = withSequence(
      withSpring(1.15, SPRING_CONFIGS.snappy),
      withSpring(1, SPRING_CONFIGS.bouncy)
    );
  };
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return { pulse, pulseStyle, scale };
};

// 🔴 SHAKE ANIMATION (for wrong answers)
export const useShakeAnimation = () => {
  const translateX = useSharedValue(0);
  
  const shake = () => {
    translateX.value = withSequence(
      withTiming(-15, { duration: 50 }),
      withTiming(15, { duration: 50 }),
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };
  
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  
  return { shake, shakeStyle, translateX };
};

// ✨ SHIMMER ANIMATION
export const useShimmerAnimation = () => {
  const shimmer = useSharedValue(0);
  
  const startShimmer = () => {
    shimmer.value = 0;
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  };
  
  const stopShimmer = () => {
    shimmer.value = 0;
  };
  
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [0.3, 1, 0.3]
    ),
  }));
  
  return { startShimmer, stopShimmer, shimmerStyle, shimmer };
};

// 🎯 BOUNCE SCALE (for buttons)
export const useBounceScale = () => {
  const scale = useSharedValue(1);
  
  const pressIn = () => {
    scale.value = withSpring(0.95, SPRING_CONFIGS.stiff);
  };
  
  const pressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIGS.bouncy);
  };
  
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return { pressIn, pressOut, bounceStyle, scale };
};

// 🌟 FADE IN UP
export const useFadeInUp = (delay: number = 0) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  
  const animate = () => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIGS.gentle));
  };
  
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  
  return { animate, fadeStyle, opacity, translateY };
};

// 🎊 SUCCESS CELEBRATION
export const useSuccessCelebration = () => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  
  const celebrate = () => {
    scale.value = withSequence(
      withSpring(1.3, SPRING_CONFIGS.bouncy),
      withSpring(1, SPRING_CONFIGS.gentle)
    );
    rotate.value = withSequence(
      withTiming(10, { duration: 100 }),
      withTiming(-10, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
  };
  
  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));
  
  return { celebrate, celebrationStyle, scale, rotate };
};

// 🔥 COMBO ANIMATION
export const useComboAnimation = () => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  
  const triggerCombo = (comboCount: number) => {
    const intensity = Math.min(comboCount / 10, 1);
    
    scale.value = withSequence(
      withSpring(1 + intensity * 0.3, SPRING_CONFIGS.wobbly),
      withSpring(1, SPRING_CONFIGS.bouncy)
    );
    
    glow.value = withSequence(
      withTiming(intensity, { duration: 200 }),
      withTiming(0, { duration: 500 })
    );
  };
  
  const comboStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
    shadowRadius: glow.value * 20,
  }));
  
  return { triggerCombo, comboStyle, scale, glow };
};

// 📱 PARALLAX EFFECT
export const createParallaxStyle = (scrollY: SharedValue<number>, factor: number = 0.5) => {
  return useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-100, 0, 100],
          [factor * 50, 0, -factor * 50],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));
};

// 🎪 CARD FLIP
export const useCardFlip = () => {
  const rotateY = useSharedValue(0);
  const isFlipped = useSharedValue(false);
  
  const flip = () => {
    const newValue = isFlipped.value ? 0 : 180;
    rotateY.value = withSpring(newValue, SPRING_CONFIGS.gentle);
    isFlipped.value = !isFlipped.value;
  };
  
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value}deg` }],
    backfaceVisibility: 'hidden',
    opacity: rotateY.value < 90 ? 1 : 0,
  }));
  
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value + 180}deg` }],
    backfaceVisibility: 'hidden',
    opacity: rotateY.value >= 90 ? 1 : 0,
  }));
  
  return { flip, frontStyle, backStyle, rotateY, isFlipped };
};

// 🌊 WAVE EFFECT
export const useWaveEffect = () => {
  const wave = useSharedValue(0);
  
  const startWave = () => {
    wave.value = 0;
    wave.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  };
  
  const waveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(wave.value, [0, 1], [0, -10]) },
      { scale: interpolate(wave.value, [0, 0.5, 1], [1, 1.05, 1]) },
    ],
  }));
  
  return { startWave, waveStyle, wave };
};

// 💎 GLOW PULSE
export const useGlowPulse = (color: string = '#fbbf24') => {
  const glow = useSharedValue(0);
  
  const startGlow = () => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  };
  
  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: color,
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(glow.value, [0, 1], [5, 20]),
    elevation: interpolate(glow.value, [0, 1], [5, 15]),
  }));
  
  return { startGlow, glowStyle, glow };
};

// 🎬 SLIDE IN BOTTOM
export const useSlideInBottom = () => {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);
  
  const slideIn = () => {
    translateY.value = withSpring(0, SPRING_CONFIGS.snappy);
    opacity.value = withTiming(1, { duration: 300 });
  };
  
  const slideOut = () => {
    translateY.value = withSpring(300, SPRING_CONFIGS.gentle);
    opacity.value = withTiming(0, { duration: 200 });
  };
  
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
  
  return { slideIn, slideOut, slideStyle, translateY, opacity };
};

// Export all animation utilities
export {
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
};

export default Animated;
