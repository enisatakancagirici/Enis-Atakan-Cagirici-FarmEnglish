import * as Haptics from 'expo-haptics';

// 🎮 RATE-LIMITED HAPTIC ENGINE
// Prevents haptic spam and performance issues

let lastHapticTime = 0;
const HAPTIC_COOLDOWN = 50; // ms - minimum time between haptics

/**
 * Rate-limited haptic wrapper
 */
const rateLimitedHaptic = (hapticFn: () => void, cooldown = HAPTIC_COOLDOWN) => {
  const now = Date.now();
  if (now - lastHapticTime >= cooldown) {
    lastHapticTime = now;
    hapticFn();
  }
};

/**
 * 🎯 SLICE HAPTICS
 */
export const sliceHaptics = {
  // Slice başladığında - hafif dokunuş
  sliceStart: () => {
    rateLimitedHaptic(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  },

  // Şık parçalandığında - orta kuvvet
  sliceCut: () => {
    rateLimitedHaptic(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 30); // Daha sık olabilir
  },

  // Doğru cevap - success notification
  correct: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Yanlış cevap - error notification
  wrong: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Combo streak - ekstra light burst
  combo: () => {
    rateLimitedHaptic(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 80);
  },

  // Ultra combo (10+ streak) - heavy burst
  ultraCombo: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 60);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 120);
  },
};
