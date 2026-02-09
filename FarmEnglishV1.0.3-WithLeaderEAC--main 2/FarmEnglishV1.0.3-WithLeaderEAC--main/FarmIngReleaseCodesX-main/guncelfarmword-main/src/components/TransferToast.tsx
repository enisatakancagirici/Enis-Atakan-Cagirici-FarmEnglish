import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sprout, Wheat, Coins, Zap } from 'lucide-react-native';
import type { TransferEvent } from '../store/farmStore';

interface TransferToastProps {
  event: TransferEvent | null;
  onHide: () => void;
}

export const TransferToast: React.FC<TransferToastProps> = ({ event, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-60)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!event) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    translateY.setValue(-60);
    opacity.setValue(0);
    scaleAnim.setValue(0.8);

    // 🎮 ARCADE: Daha hızlı giriş animasyonu + bounce scale
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // 🎮 ARCADE: Daha kısa süre görünür
    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -40,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }, 1800);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [event, opacity, translateY, scaleAnim, onHide]);

  if (!event) return null;

  const isHarvest = event.type === 'harvest';
  const hasRewards = isHarvest && event.coins && event.xp;
  
  // 🎨 Hasat için altın gradient, dikim için yeşil gradient
  const gradient = isHarvest 
    ? ['#f59e0b', '#d97706', '#b45309'] as const
    : ['#22c55e', '#16a34a', '#15803d'] as const;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrapper, { opacity, transform: [{ translateY }, { scale: scaleAnim }] }]}
    >
      <LinearGradient colors={gradient} style={styles.toast} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.iconContainer}>
          {isHarvest ? <Wheat size={24} color="#fff" strokeWidth={2.5} /> : <Sprout size={24} color="#fff" strokeWidth={2.5} />}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {isHarvest ? `🎉 ${event.wordText}` : `🌱 ${event.wordText}`}
          </Text>
          {hasRewards ? (
            <>
              <View style={styles.rewardsRow}>
                <View style={styles.rewardBadge}>
                  <Coins size={14} color="#fef08a" strokeWidth={2.5} />
                  <Text style={styles.rewardText}>+{event.coins}</Text>
                </View>
                <View style={[styles.rewardBadge, styles.xpBadge]}>
                  <Zap size={14} color="#a5f3fc" strokeWidth={2.5} />
                  <Text style={[styles.rewardText, styles.xpText]}>+{event.xp} XP</Text>
                </View>
              </View>
              <Text style={styles.envantereText}>📦 Envantere gönderildi!</Text>
            </>
          ) : (
            <Text style={styles.subtitle} numberOfLines={1}>
              {isHarvest ? '📦 Envantere gönderildi!' : 'Tarlaya dikildi!'}
            </Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  xpBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  rewardText: {
    color: '#fef08a',
    fontSize: 14,
    fontWeight: '800',
  },
  xpText: {
    color: '#a5f3fc',
  },
  envantereText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
