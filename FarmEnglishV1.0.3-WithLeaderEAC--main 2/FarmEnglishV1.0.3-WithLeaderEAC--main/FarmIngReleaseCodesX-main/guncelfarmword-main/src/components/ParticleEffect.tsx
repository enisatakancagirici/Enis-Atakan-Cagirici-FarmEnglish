import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { usePerformanceStore } from '../store/performanceStore';

const { width, height } = Dimensions.get('window');
const EMOJI_POOL = ['⭐', '💥', '✨', '🌟', '💖', '🔥', '⚡'];
const PARTICLE_DURATION = 600;
const BASE_PARTICLE_COUNT = 12;

interface Particle {
  id: number;
  dx: number;
  dy: number;
  delay: number;
  emoji: string;
}

interface ParticleEffectProps {
  trigger: boolean;
  emoji?: string;
  x?: number;
  y?: number;
}

const ParticleItem: React.FC<{ particle: Particle; x: number; y: number }> = ({ particle, x, y }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: particle.dx,
        duration: PARTICLE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: particle.dy,
        duration: PARTICLE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: PARTICLE_DURATION,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: PARTICLE_DURATION * 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.6,
          duration: PARTICLE_DURATION * 0.7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const animatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale },
    ],
    opacity,
  };

  return (
    <Animated.Text
      style={[
        styles.particle,
        { left: x, top: y },
        animatedStyle,
      ]}
    >
      {particle.emoji}
    </Animated.Text>
  );
};

export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  trigger,
  emoji = '⭐',
  x = width / 2,
  y = height / 2,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const { config, getParticleCount } = usePerformanceStore();

  useEffect(() => {
    if (!trigger) return;
    
    // 🎮 LOW modda particle gösterme
    if (config.particleCount === 0) return;

    const pool = emoji && !EMOJI_POOL.includes(emoji)
      ? [emoji, ...EMOJI_POOL]
      : EMOJI_POOL;

    // 🎮 Performans ayarlarına göre particle sayısı
    const particleCount = getParticleCount(BASE_PARTICLE_COUNT);
    
    if (particleCount === 0) return;

    const newParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: Date.now() + i,
        dx: (Math.random() - 0.5) * 140,
        dy: (Math.random() - 0.5) * 120 - 40,
        delay: Math.random() * 80,
        emoji: pool[Math.floor(Math.random() * pool.length)],
      });
    }
    setParticles(newParticles);

    const timeout = setTimeout(() => setParticles([]), PARTICLE_DURATION + 200);
    return () => clearTimeout(timeout);
  }, [trigger, emoji, config.particleCount]);

  if (particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <ParticleItem key={p.id} particle={p} x={x} y={y} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  particle: {
    position: 'absolute',
    fontSize: 24,
  },
});
