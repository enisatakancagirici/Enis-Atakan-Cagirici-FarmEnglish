import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { haptic, sound } from '../utils/sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CardFeedbackAnimationProps {
  type: 'levelUp' | 'levelDown' | 'protected';
  visible: boolean;
  onComplete?: () => void;
  intensity?: 'low' | 'medium' | 'high';
}

// 🌈 WATERING ANIMATION - Ultra hafif ve hızlı
const WateringAnimation = memo(({ onComplete, isProtected = false }: { onComplete?: () => void; isProtected?: boolean }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    // 💧 Haptic ve ses
    haptic.waterCelebration();
    sound.playWatering?.();

    // Hızlı fade in + scale up
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 200, useNativeDriver: true }),
    ]).start();

    // 400ms sonra kapat - HIZLI!
    const timeout = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true })
        .start(() => onComplete?.());
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      {/* Merkez mesaj - basit */}
      <Animated.View style={[styles.messageBox, { transform: [{ scale }] }]}>
        <Text style={styles.messageEmoji}>{isProtected ? '🛡️' : '💧'}</Text>
        <Text style={isProtected ? styles.protectedMessage : styles.growthMessage}>
          {isProtected ? 'Korundu!' : 'Büyüyor!'}
        </Text>
      </Animated.View>
    </Animated.View>
  );
});

// 🐛 BUG INFESTATION ANIMATION - Ultra hafif ve hızlı
const BugInfestationAnimation = memo(({ onComplete }: { onComplete?: () => void }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🐛 Haptic ve ses
    haptic.bugInfestation();
    sound.playWrong();

    // Hızlı fade in + scale up
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 200, useNativeDriver: true }),
    ]).start();

    // Tek kısa titreme
    Animated.sequence([
      Animated.timing(shake, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();

    // 350ms sonra kapat - HIZLI!
    const timeout = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true })
        .start(() => onComplete?.());
    }, 350);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateX: shake }] }]} pointerEvents="none">
      {/* Merkez mesaj - basit */}
      <Animated.View style={[styles.messageBox, styles.warningBox, { transform: [{ scale }] }]}>
        <Text style={styles.messageEmoji}>🐛</Text>
        <Text style={styles.warningMessage}>Dikkat!</Text>
      </Animated.View>
    </Animated.View>
  );
});

// 🎬 MAIN EXPORT COMPONENT
export const CardFeedbackAnimation: React.FC<CardFeedbackAnimationProps> = memo(({
  type,
  visible,
  onComplete,
}) => {
  if (!visible) return null;

  if (type === 'levelUp') {
    return <WateringAnimation onComplete={onComplete} isProtected={false} />;
  }
  
  if (type === 'protected') {
    return <WateringAnimation onComplete={onComplete} isProtected={true} />;
  }

  return <BugInfestationAnimation onComplete={onComplete} />;
});

// Export individual animations for direct use
export { WateringAnimation, BugInfestationAnimation };

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  warningBox: {
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  messageEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  growthMessage: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4ade80',
  },
  protectedMessage: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fbbf24',
  },
  warningMessage: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f87171',
  },
});

export default CardFeedbackAnimation;
