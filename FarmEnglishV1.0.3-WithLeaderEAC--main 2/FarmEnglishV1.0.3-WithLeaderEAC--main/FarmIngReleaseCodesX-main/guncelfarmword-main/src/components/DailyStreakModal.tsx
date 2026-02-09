import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { haptic, sound } from '../utils/sound';
import { Flame } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface DailyStreakModalProps {
  visible: boolean;
  onClose: () => void;
  streakCount: number;
  reward: number;
}

const DailyStreakModal: React.FC<DailyStreakModalProps> = ({
  visible,
  onClose,
  streakCount,
  reward,
}) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      haptic.heavy?.();
      sound.playSuccess?.();
      
      // 🎯 Pop-in animasyonu
      scale.value = withSpring(1, { damping: 10, stiffness: 100 });
      
      // 🔄 Yavaş rotasyon
      rotate.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      );
      
      // ✨ Parlama efekti
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      scale.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

        {/* 🎆 Arka plan confetti */}
        <View style={styles.confettiContainer}>
          <LottieView
            source={require('../../assets/lottie/success.json')}
            autoPlay
            loop={false}
            style={styles.confettiLottie}
          />
        </View>

        <Animated.View style={[styles.content, containerStyle]}>
          {/* 🔥 Dış halka - rotate */}
          <Animated.View style={[styles.outerRing, rotateStyle]}>
            <LinearGradient
              colors={['#ff6b35', '#ff9500', '#ffcc00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ringGradient}
            />
          </Animated.View>

          {/* ✨ Parlama efekti */}
          <Animated.View style={[styles.glowLayer, glowStyle]}>
            <LinearGradient
              colors={['rgba(255, 107, 53, 0.6)', 'rgba(255, 149, 0, 0.4)', 'rgba(255, 204, 0, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glowGradient}
            />
          </Animated.View>

          {/* 🎨 Ana kart */}
          <LinearGradient
            colors={['#1a0f0a', '#2d1810', '#1a0f0a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.card}
          >
            {/* 🔥 Flame ikonu */}
            <View style={styles.flameContainer}>
              <Flame size={80} color="#ff6b35" fill="#ff9500" strokeWidth={2} />
            </View>

            {/* 📅 Streak sayısı */}
            <Text style={styles.streakNumber}>{streakCount}</Text>
            <Text style={styles.streakLabel}>GÜN ARDIŞIK GİRİŞ</Text>

            {/* 💰 Ödül */}
            <View style={styles.rewardContainer}>
              <LinearGradient
                colors={['#fbbf24', '#f59e0b', '#d97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rewardBadge}
              >
                <Text style={styles.rewardText}>+{reward}</Text>
                <Text style={styles.coinIcon}>💰</Text>
              </LinearGradient>
            </View>

            {/* 🎉 Motivasyon mesajı */}
            <Text style={styles.motivationText}>
              {streakCount === 1 && "Harika bir başlangıç! 🔥"}
              {streakCount >= 2 && streakCount < 7 && "Devam et, çiftçi! 🚀"}
              {streakCount >= 7 && streakCount < 30 && "İnanılmaz disiplin! 🌟"}
              {streakCount >= 30 && "Efsanesin! 👑"}
            </Text>

            {/* ✅ Kapat butonu */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                haptic.light?.();
                sound.playTap?.();
                onClose();
              }}
              style={styles.closeButton}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.closeButtonGradient}
              >
                <Text style={styles.closeButtonText}>Harika! 🎉</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiLottie: {
    width: width * 1.5,
    height: height * 1.5,
  },
  content: {
    width: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    overflow: 'hidden',
  },
  ringGradient: {
    flex: 1,
    opacity: 0.3,
  },
  glowLayer: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: (width * 0.95) / 2,
    overflow: 'hidden',
  },
  glowGradient: {
    flex: 1,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 107, 53, 0.5)',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  flameContainer: {
    marginBottom: 16,
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#ff6b35',
    textShadowColor: 'rgba(255, 107, 53, 0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    marginBottom: 8,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 2,
    marginBottom: 24,
  },
  rewardContainer: {
    marginBottom: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  rewardText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  coinIcon: {
    fontSize: 28,
  },
  motivationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
  },
  closeButton: {
    width: '100%',
    marginTop: 8,
  },
  closeButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
});

export default DailyStreakModal;
