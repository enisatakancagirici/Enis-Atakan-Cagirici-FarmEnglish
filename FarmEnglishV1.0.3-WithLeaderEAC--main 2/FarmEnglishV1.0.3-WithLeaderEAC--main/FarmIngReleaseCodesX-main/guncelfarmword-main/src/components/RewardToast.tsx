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

interface RewardToast {
  id: string;
  type: 'xp' | 'coin' | 'level' | 'combo' | 'harvest' | 'quest';
  value: number;
  message?: string;
}

interface RewardToastStore {
  toasts: RewardToast[];
  addToast: (toast: Omit<RewardToast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const MAX_ACTIVE_TOASTS = 4;

export const useRewardToastStore = create<RewardToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const safeType: RewardToast['type'] =
      toast.type === 'xp' ||
      toast.type === 'coin' ||
      toast.type === 'level' ||
      toast.type === 'combo' ||
      toast.type === 'harvest' ||
      toast.type === 'quest'
        ? toast.type
        : 'quest';
    const safeValue = Number.isFinite(toast.value) ? Math.max(0, Math.floor(toast.value)) : 0;
    const safeMessage = typeof toast.message === 'string' ? toast.message : undefined;

    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { type: safeType, value: safeValue, message: safeMessage, id }].slice(-MAX_ACTIVE_TOASTS),
    }));

    const timeout = isSmallScreen ? 1500 : 2000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, timeout);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export const showRewardToast = (type: RewardToast['type'], value: number, message?: string) => {
  useRewardToastStore.getState().addToast({ type, value, message });
};

const TOAST_THEMES = {
  xp: {
    gradient: ['#8b5cf6', '#a855f7'] as const,
    icon: '\u26A1',
    label: 'XP',
    glow: '#a855f7',
  },
  coin: {
    gradient: ['#eab308', '#f59e0b'] as const,
    icon: '\uD83D\uDCB0',
    label: 'Coin',
    glow: '#eab308',
  },
  level: {
    gradient: ['#22c55e', '#10b981'] as const,
    icon: '\uD83C\uDF89',
    label: 'LEVEL UP!',
    glow: '#22c55e',
  },
  combo: {
    gradient: ['#f97316', '#ef4444'] as const,
    icon: '\uD83D\uDD25',
    label: 'COMBO',
    glow: '#f97316',
  },
  harvest: {
    gradient: ['#06b6d4', '#0ea5e9'] as const,
    icon: '\uD83C\uDF3E',
    label: 'HASAT',
    glow: '#06b6d4',
  },
  quest: {
    gradient: ['#ec4899', '#f472b6'] as const,
    icon: '\u2728',
    label: 'G\u00D6REV TAMAM!',
    glow: '#ec4899',
  },
};

const RewardToastItem = React.memo(({ toast, index, topInset }: { toast: RewardToast; index: number; topInset: number }) => {
  const DEFAULT_THEME = {
    gradient: ['#6b7280', '#4b5563'] as const,
    icon: '\u2728',
    label: 'REWARD',
    glow: '#6b7280',
  };

  const theme = TOAST_THEMES[toast.type] || DEFAULT_THEME;

  const scale = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(isSmallScreen ? 1.1 : 1.2, { damping: isSmallScreen ? 12 : 8 }),
      withSpring(1, { damping: isSmallScreen ? 14 : 10 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const topPosition = topInset + (isSmallScreen ? 2 : 8) + index * (isSmallScreen ? 36 : 44);

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100).springify()}
      exiting={FadeOutUp.duration(300)}
      style={[
        styles.toastContainer,
        { top: topPosition },
      ]}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.toast, { shadowColor: theme.glow }]}
        >
          <Text style={styles.toastIcon}>{theme.icon}</Text>
          <View>
            <Text style={styles.toastValue}>+{toast.value}</Text>
            {toast.message ? <Text style={styles.toastMessage}>{toast.message}</Text> : null}
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
});

export const RewardToastContainer = () => {
  const toasts = useRewardToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((toast, index) => (
        <RewardToastItem key={toast.id} toast={toast} index={index} topInset={insets.top} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
    gap: isSmallScreen ? 6 : 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIcon: {
    fontSize: isSmallScreen ? 14 : 18,
  },
  toastValue: {
    fontSize: isSmallScreen ? 13 : 16,
    fontWeight: '800',
    color: '#fff',
  },
  toastMessage: {
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
});

export default RewardToastContainer;
