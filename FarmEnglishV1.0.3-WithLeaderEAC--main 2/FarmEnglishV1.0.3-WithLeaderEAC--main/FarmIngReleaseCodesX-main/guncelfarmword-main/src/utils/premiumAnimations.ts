import { Animated } from 'react-native';

// Helper: spring config for a crisp Apple-like feel
export const spring = (
  value: Animated.Value | Animated.AnimatedValue,
  toValue: number,
  delay = 0,
  overshootClamping = false
) =>
  Animated.spring(value, {
    toValue,
    friction: 6,
    tension: 50,
    useNativeDriver: true,
    delay,
    overshootClamping,
  });

// Stagger utility: returns delays per index
export const staggerDelays = (count: number, base = 40, increment = 60) =>
  Array.from({ length: count }, (_, i) => base + i * increment);

// Sequence bounce (e.g., for word bounce)
export const bounceSequence = (value: Animated.Value, amplitude = 12) =>
  Animated.sequence([
    Animated.timing(value, { toValue: 1, duration: 320, useNativeDriver: true }),
    Animated.timing(value, { toValue: 0, duration: 360, useNativeDriver: true }),
  ]);

// Pulse utility
export const pulse = (value: Animated.Value, to = 1.2, duration = 500) =>
  Animated.sequence([
    Animated.timing(value, { toValue: to, duration: duration / 2, useNativeDriver: true }),
    Animated.timing(value, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
  ]);

// Fade in
export const fadeIn = (value: Animated.Value, duration = 300, delay = 0) =>
  Animated.timing(value, { toValue: 1, duration, delay, useNativeDriver: true });

// Slide up
export const slideUp = (value: Animated.Value, from: number, to: number = 0, delay = 0) =>
  Animated.spring(value, { toValue: to, delay, useNativeDriver: true, friction: 10, tension: 55 });

// Parallax mapping helper (simple)
export const mapParallax = (value: Animated.Value, distance = 10) =>
  value.interpolate({ inputRange: [0, 1], outputRange: [-distance, distance] });

// Easing-based gentle appear
export const gentleAppear = (scale: Animated.Value, opacity: Animated.Value, delay = 0) =>
  Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
    Animated.spring(scale, { toValue: 1, delay, friction: 7, tension: 45, useNativeDriver: true }),
  ]);
