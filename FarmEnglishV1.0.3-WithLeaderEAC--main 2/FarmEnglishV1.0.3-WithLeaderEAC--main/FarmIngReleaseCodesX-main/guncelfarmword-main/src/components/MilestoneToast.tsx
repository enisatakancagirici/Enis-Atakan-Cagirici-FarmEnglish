import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { create } from 'zustand';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

// 🎯 Milestone Toast Store
interface MilestoneToast {
  id: string;
  combo: number;
  text: string;
  duration: number; // milliseconds
}

interface MilestoneToastStore {
  toasts: MilestoneToast[];
  addToast: (toast: Omit<MilestoneToast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useMilestoneToastStore = create<MilestoneToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    // 🔒 Validation - skip invalid toasts
    if (!toast.combo || !toast.text || !toast.duration) {
      return;
    }

    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration + 300); // 300ms grace period
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

interface MilestoneToastItemProps {
  toast: MilestoneToast;
  onRemove: () => void;
}

const MILESTONE_COLORS: Record<number, { gradient: [string, string]; glow: string }> = {
  25: {
    gradient: ['#fbbf24', '#f59e0b'],
    glow: '#fbbf24',
  },
  50: {
    gradient: ['#ef4444', '#dc2626'],
    glow: '#ef4444',
  },
  75: {
    gradient: ['#8b5cf6', '#7c3aed'],
    glow: '#8b5cf6',
  },
  100: {
    gradient: ['#ec4899', '#db2777'],
    glow: '#ec4899',
  },
  150: {
    gradient: ['#06b6d4', '#0891b2'],
    glow: '#06b6d4',
  },
  200: {
    gradient: ['#3b82f6', '#1d4ed8'],
    glow: '#3b82f6',
  },
  225: {
    gradient: ['#a855f7', '#9333ea'],
    glow: '#a855f7',
  },
  250: {
    gradient: ['#14b8a6', '#0d9488'],
    glow: '#14b8a6',
  },
  275: {
    gradient: ['#f97316', '#ea580c'],
    glow: '#f97316',
  },
  300: {
    gradient: ['#eab308', '#ca8a04'],
    glow: '#eab308',
  },
};

// 300+ combo için renk seçici
const getColorForCombo = (combo: number): { gradient: [string, string]; glow: string } => {
  // 🔒 Default fallback for invalid combo values
  const DEFAULT_COLOR = { gradient: ['#fbbf24', '#f59e0b'] as [string, string], glow: '#fbbf24' };

  // Safety check for undefined/NaN combo
  if (combo === undefined || combo === null || isNaN(combo)) {
    return DEFAULT_COLOR;
  }

  if (MILESTONE_COLORS[combo]) {
    return MILESTONE_COLORS[combo];
  }

  // 🔒 Fallback colors for any combo value
  const rainbowColors: Array<{ gradient: [string, string]; glow: string }> = [
    { gradient: ['#ef4444', '#dc2626'], glow: '#ef4444' }, // Kırmızı
    { gradient: ['#f59e0b', '#d97706'], glow: '#f59e0b' }, // Turuncu
    { gradient: ['#eab308', '#ca8a04'], glow: '#eab308' }, // Sarı
    { gradient: ['#22c55e', '#16a34a'], glow: '#22c55e' }, // Yeşil
    { gradient: ['#06b6d4', '#0891b2'], glow: '#06b6d4' }, // Cyan
    { gradient: ['#3b82f6', '#2563eb'], glow: '#3b82f6' }, // Mavi
    { gradient: ['#8b5cf6', '#7c3aed'], glow: '#8b5cf6' }, // Mor
    { gradient: ['#ec4899', '#db2777'], glow: '#ec4899' }, // Pembe
  ];

  // Combo değerine göre renk döndür (hem 300+ hem de diğer tüm değerler için)
  const index = Math.abs(Math.floor(combo / 25)) % rainbowColors.length;
  return rainbowColors[index];
};

const MilestoneToastItem: React.FC<MilestoneToastItemProps> = ({ toast, onRemove }) => {
  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);

  const colors = getColorForCombo(toast.combo);

  useEffect(() => {
    // Animate in
    scaleAnim.value = withSpring(1, { damping: 5, mass: 0.8 });
    opacityAnim.value = withSpring(1, { damping: 5, mass: 0.8 });

    // Animate out after duration
    const timeout = setTimeout(() => {
      scaleAnim.value = withSpring(0, { damping: 5, mass: 0.8 });
      opacityAnim.value = withSpring(0, { damping: 5, mass: 0.8 });
      setTimeout(onRemove, 200);
    }, toast.duration);

    return () => clearTimeout(timeout);
  }, [toast.duration, scaleAnim, opacityAnim, onRemove]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          shadowColor: colors.glow,
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 20,
        },
      ]}
    >
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.comboLabel}>🔥 COMBO</Text>
          <Text style={styles.comboNumber}>{toast.combo}</Text>
          <Text style={styles.text}>{toast.text}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

interface MilestoneToastContainerProps {
  top?: number;
}

export const MilestoneToastContainer: React.FC<MilestoneToastContainerProps> = ({ top = 20 }) => {
  const insets = useSafeAreaInsets();
  const toasts = useMilestoneToastStore((state) => state.toasts);
  const removeToast = useMilestoneToastStore((state) => state.removeToast);

  return (
    <View style={[styles.toastContainer, { top: top + insets.top }]}>
      {toasts.map((toast) => (
        <MilestoneToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    alignItems: 'center',
  },
  comboLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  comboNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginVertical: 4,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
