import { Animated, Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// ============== SÜPER JUICY HAPTIC SYSTEM ==============

export const juicyHaptic = {
  // Hafif dokunuş
  tap: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Buton basma
  buttonPress: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Doğru cevap - çift vuruş
  correct: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 100);
  },

  // Yanlış cevap - güçlü titreşim
  wrong: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 100, 50, 100]);
    } else {
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 100);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
    }
  },

  // Combo! Ritimli titreşim
  combo: async (level: number) => {
    const count = Math.min(level, 5);
    for (let i = 0; i < count; i++) {
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, i * 80);
    }
  },

  // LEGENDARY COMBO! Delilik
  legendaryCombo: async () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 100, 50, 100, 50, 100, 50, 200]);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      for (let i = 0; i < 6; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 60);
      }
    }
  },

  // 🌟 25 COMBO - Telefonu titreten ağır haptic (2-3 saniye)
  combo25: async () => {
    if (Platform.OS === 'android') {
      // 2.5 saniye boyunca titreşim pattern'i
      const pattern = [];
      for (let i = 0; i < 25; i++) {
        pattern.push(50, 50); // 50ms titre, 50ms dur
      }
      Vibration.vibrate(pattern);
    } else {
      // iOS için 2.5 saniye boyunca sürekli güçlü haptic
      for (let i = 0; i < 25; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 100);
      }
    }
  },

  // 🔥 50 COMBO - Telefonu titreten ağır haptic (2-3 saniye)
  combo50: async () => {
    if (Platform.OS === 'android') {
      // 2.5 saniye boyunca titreşim pattern'i
      const pattern = [];
      for (let i = 0; i < 25; i++) {
        pattern.push(50, 50); // 50ms titre, 50ms dur
      }
      Vibration.vibrate(pattern);
    } else {
      // iOS için 2.5 saniye boyunca sürekli güçlü haptic
      for (let i = 0; i < 25; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 100);
      }
    }
  },

  // 🎯 75 COMBO - 4 saniye ağır haptic
  combo75: async () => {
    if (Platform.OS === 'android') {
      // 4 saniye boyunca titreşim pattern'i
      const pattern = [];
      for (let i = 0; i < 40; i++) {
        pattern.push(50, 50); // 50ms titre, 50ms dur
      }
      Vibration.vibrate(pattern);
    } else {
      // iOS için 4 saniye boyunca sürekli güçlü haptic
      for (let i = 0; i < 40; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 100);
      }
    }
  },

  // 🔥 100 COMBO - OUWWWW! 5 saniye dehşet güçlü titreşim
  combo100: async () => {
    if (Platform.OS === 'android') {
      // 5 saniye boyunca titreşim pattern'i
      const pattern = [];
      for (let i = 0; i < 50; i++) {
        pattern.push(50, 50); // 50ms titre, 50ms dur
      }
      Vibration.vibrate(pattern);
    } else {
      // iOS için 5 saniye boyunca sürekli güçlü haptic
      for (let i = 0; i < 50; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 100);
      }
    }
  },

  // 🌟 150 COMBO - 6 saniye delirtici haptic
  combo150: async () => {
    if (Platform.OS === 'android') {
      // 6 saniye boyunca hızlı titreşim pattern'i (delirtici)
      const pattern = [];
      for (let i = 0; i < 60; i++) {
        pattern.push(30, 30); // Daha hızlı titre
      }
      Vibration.vibrate(pattern);
    } else {
      // iOS için 6 saniye boyunca hızlı haptic (delirtici)
      for (let i = 0; i < 60; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 100);
      }
    }
  },

  // 💥 200 COMBO - MEGA EARTHQUAKE! 8 saniye titreşim
  combo200: async () => {
    if (Platform.OS === 'android') {
      // 8 saniye boyunca titreşim pattern'i
      const pattern = [];
      for (let i = 0; i < 80; i++) {
        pattern.push(50, 50); // 50ms titre, 50ms dur
      }
      Vibration.vibrate(pattern);
    } else {
      // iOS için 8 saniye boyunca sürekli güçlü haptic
      for (let i = 0; i < 80; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, i * 100);
      }
    }
  },

  // Hasat
  harvest: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 150);
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 300);
  },

  // Level up
  levelUp: async () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 150, 100, 150, 100, 300]);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      for (let i = 0; i < 4; i++) {
        setTimeout(async () => {
          await Haptics.impactAsync(i === 3 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
        }, i * 120);
      }
    }
  },

  // Başarı
  achievement: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 100);
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 200);
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 300);
  },

  // Coin kazanma
  coin: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Seçim değişikliği
  selection: async () => {
    await Haptics.selectionAsync();
  },
};

// ============== SCREEN SHAKE SYSTEM ==============

export class ScreenShake {
  private shakeX: Animated.Value;
  private shakeY: Animated.Value;

  constructor() {
    this.shakeX = new Animated.Value(0);
    this.shakeY = new Animated.Value(0);
  }

  getStyle() {
    return {
      transform: [
        { translateX: this.shakeX },
        { translateY: this.shakeY },
      ],
    };
  }

  // Hafif sallama
  light() {
    const sequence = [];
    const intensity = 3;
    const duration = 50;

    for (let i = 0; i < 4; i++) {
      sequence.push(
        Animated.parallel([
          Animated.timing(this.shakeX, {
            toValue: i % 2 === 0 ? intensity : -intensity,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(this.shakeY, {
            toValue: i % 2 === 0 ? -intensity / 2 : intensity / 2,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    }

    sequence.push(
      Animated.parallel([
        Animated.timing(this.shakeX, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(this.shakeY, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );

    Animated.sequence(sequence).start();
  }

  // Orta sallama
  medium() {
    const sequence = [];
    const intensity = 6;
    const duration = 40;

    for (let i = 0; i < 6; i++) {
      sequence.push(
        Animated.parallel([
          Animated.timing(this.shakeX, {
            toValue: i % 2 === 0 ? intensity : -intensity,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(this.shakeY, {
            toValue: i % 2 === 0 ? -intensity / 2 : intensity / 2,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    }

    sequence.push(
      Animated.parallel([
        Animated.timing(this.shakeX, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(this.shakeY, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );

    Animated.sequence(sequence).start();
  }

  // Güçlü sallama (yanlış cevap, büyük combo)
  heavy() {
    const sequence = [];
    const intensity = 12;
    const duration = 35;

    for (let i = 0; i < 8; i++) {
      const factor = 1 - (i / 8); // Yavaşça azalan
      sequence.push(
        Animated.parallel([
          Animated.timing(this.shakeX, {
            toValue: (i % 2 === 0 ? intensity : -intensity) * factor,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(this.shakeY, {
            toValue: (i % 2 === 0 ? -intensity / 2 : intensity / 2) * factor,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    }

    sequence.push(
      Animated.parallel([
        Animated.timing(this.shakeX, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(this.shakeY, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );

    Animated.sequence(sequence).start();
  }

  // EPIC COMBO sallama
  epic() {
    const sequence = [];
    const duration = 30;

    // Başlangıç patlaması
    sequence.push(
      Animated.parallel([
        Animated.timing(this.shakeX, { toValue: 15, duration, useNativeDriver: true }),
        Animated.timing(this.shakeY, { toValue: -10, duration, useNativeDriver: true }),
      ])
    );

    // Yoğun sallama
    for (let i = 0; i < 10; i++) {
      const factor = 1 - (i / 10);
      const intensity = 15 * factor;
      sequence.push(
        Animated.parallel([
          Animated.timing(this.shakeX, {
            toValue: i % 2 === 0 ? intensity : -intensity,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(this.shakeY, {
            toValue: i % 2 === 0 ? -intensity / 2 : intensity / 2,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    }

    sequence.push(
      Animated.parallel([
        Animated.spring(this.shakeX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(this.shakeY, { toValue: 0, useNativeDriver: true }),
      ])
    );

    Animated.sequence(sequence).start();
  }
}

// ============== BUTTON ANIMATION HELPERS ==============

export const createButtonAnimation = () => {
  const scale = new Animated.Value(1);
  const shadowOpacity = new Animated.Value(0.3);

  const pressIn = () => {
    juicyHaptic.tap();
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 0.1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, shadowOpacity, pressIn, pressOut };
};

// ============== PULSE ANIMATION ==============

export const createPulseAnimation = (value: Animated.Value, minScale = 0.95, maxScale = 1.05) => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: maxScale,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: minScale,
        duration: 1000,
        useNativeDriver: true,
      }),
    ])
  );

  return {
    start: () => animation.start(),
    stop: () => animation.stop(),
  };
};

// ============== GLOW ANIMATION ==============

export const createGlowAnimation = (value: Animated.Value) => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 0.3,
        duration: 1500,
        useNativeDriver: true,
      }),
    ])
  );

  return {
    start: () => animation.start(),
    stop: () => animation.stop(),
  };
};

// ============== BOUNCE IN ANIMATION ==============

export const bounceIn = (value: Animated.Value, delay = 0) => {
  value.setValue(0);
  Animated.sequence([
    Animated.delay(delay),
    Animated.spring(value, {
      toValue: 1,
      speed: 12,
      bounciness: 15,
      useNativeDriver: true,
    }),
  ]).start();
};

// ============== SLIDE & FADE ==============

export const slideInFromBottom = (translateY: Animated.Value, opacity: Animated.Value, delay = 0) => {
  translateY.setValue(50);
  opacity.setValue(0);
  
  Animated.parallel([
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(translateY, {
        toValue: 0,
        speed: 12,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]),
  ]).start();
};

// ============== CONFETTI COLORS ==============

export const CONFETTI_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1',
  '#5f27cd', '#ff9f43', '#00d2d3', '#54a0ff', '#c8d6e5',
];

// ============== COMBO TIERS ==============

export const getComboTier = (streak: number) => {
  if (streak >= 50) return { 
    tier: 'EFSANE+', 
    color: '#ff0000', 
    emoji: '🌟',
    gradient: ['#ff0000', '#ff6b00', '#ffff00'],
    message: 'EFSANE SERİ! 🌟',
    multiplier: 10,
  };
  if (streak >= 30) return { 
    tier: 'UNSTOPPABLE', 
    color: '#ff00ff', 
    emoji: '⚡',
    gradient: ['#ff00ff', '#ff69b4', '#ff1493'],
    message: 'UNSTOPPABLE! ⚡⚡',
    multiplier: 7,
  };
  if (streak >= 20) return { 
    tier: 'LEGENDARY', 
    color: '#f472b6', 
    emoji: '👑',
    gradient: ['#ec4899', '#f472b6', '#f9a8d4'],
    message: 'LEGENDARY! 👑',
    multiplier: 5,
  };
  if (streak >= 15) return { 
    tier: 'AMAZING', 
    color: '#a855f7', 
    emoji: '💎',
    gradient: ['#8b5cf6', '#a855f7', '#c084fc'],
    message: 'AMAZING! 💎',
    multiplier: 4,
  };
  if (streak >= 10) return { 
    tier: 'EPIC', 
    color: '#6366f1', 
    emoji: '🔥',
    gradient: ['#4f46e5', '#6366f1', '#818cf8'],
    message: 'EPIC! 🔥',
    multiplier: 3,
  };
  if (streak >= 5) return { 
    tier: 'GREAT', 
    color: '#22c55e', 
    emoji: '✨',
    gradient: ['#16a34a', '#22c55e', '#4ade80'],
    message: 'GREAT! ✨',
    multiplier: 2,
  };
  if (streak >= 3) return { 
    tier: 'GOOD', 
    color: '#3b82f6', 
    emoji: '🎯',
    gradient: ['#2563eb', '#3b82f6', '#60a5fa'],
    message: 'GOOD! 🎯',
    multiplier: 1.5,
  };
  return { 
    tier: '', 
    color: '#6b7280', 
    emoji: '',
    gradient: ['#4b5563', '#6b7280', '#9ca3af'],
    message: '',
    multiplier: 1,
  };
};
