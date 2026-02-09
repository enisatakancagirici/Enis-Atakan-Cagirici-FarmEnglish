import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { CONFETTI_COLORS } from '../utils/effects';
import { usePerformanceStore } from '../store/performanceStore';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700; // iPhone SE 2020 detection

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  emoji: string;
  color: string;
  size: number;
}

interface ConfettiProps {
  trigger: number;
  emoji?: string;
  count?: number;
  x?: number;
  y?: number;
  spread?: 'burst' | 'rain' | 'firework';
}

const EMOJIS = ['⭐', '✨', '💫', '🌟', '💥', '🔥', '💖', '🎉', '🎊', '⚡'];

const ParticleItem: React.FC<{ particle: Particle; duration: number }> = ({ particle, duration }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  // SE: Daha kısa animasyon süresi
  const effectiveDuration = isSmallScreen ? duration * 0.7 : duration;

  useEffect(() => {
    Animated.parallel([
      // Hareket
      Animated.timing(translateX, {
        toValue: particle.vx,
        duration: effectiveDuration,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: particle.vy,
        duration: effectiveDuration,
        useNativeDriver: true,
      }),
      // Scale in then out - SE için basitleştirilmiş
      Animated.sequence([
        Animated.spring(scale, {
          toValue: isSmallScreen ? 1.0 : 1.2, // SE: daha az scale
          speed: 20,
          bounciness: isSmallScreen ? 8 : 15, // SE: daha az bounce
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.3,
          duration: effectiveDuration * 0.6,
          useNativeDriver: true,
        }),
      ]),
      // Fade out
      Animated.sequence([
        Animated.delay(effectiveDuration * 0.5),
        Animated.timing(opacity, {
          toValue: 0,
          duration: effectiveDuration * 0.5,
          useNativeDriver: true,
        }),
      ]),
      // Rotation - SE için devre dışı
      ...(!isSmallScreen ? [Animated.timing(rotate, {
        toValue: particle.rotation,
        duration: effectiveDuration,
        useNativeDriver: true,
      })] : []),
    ]).start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
          fontSize: particle.size,
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate: rotateInterpolate },
          ],
          opacity,
        },
      ]}
    >
      {particle.emoji}
    </Animated.Text>
  );
};

export const ConfettiExplosion: React.FC<ConfettiProps> = ({
  trigger,
  emoji,
  count = 20,
  x = width / 2,
  y = height / 3,
  spread = 'burst',
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger <= 0) return;

    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      let vx: number, vy: number;

      switch (spread) {
        case 'rain':
          vx = (Math.random() - 0.5) * 200;
          vy = Math.random() * 400 + 100;
          break;
        case 'firework':
          const angle = (i / count) * Math.PI * 2;
          const distance = 150 + Math.random() * 100;
          vx = Math.cos(angle) * distance;
          vy = Math.sin(angle) * distance;
          break;
        case 'burst':
        default:
          vx = (Math.random() - 0.5) * 300;
          vy = (Math.random() - 0.5) * 300;
          break;
      }

      newParticles.push({
        id: i,
        x: x - 15,
        y: y - 15,
        vx,
        vy,
        rotation: Math.random() * 720 - 360,
        emoji: emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 20 + Math.random() * 20,
      });
    }

    setParticles(newParticles);

    // Clear after animation
    const timer = setTimeout(() => setParticles([]), 1200);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map(p => (
        <ParticleItem key={p.id} particle={p} duration={1000} />
      ))}
    </View>
  );
};

// Correct answer celebration - ULTRA OPTIMIZED for iPhone SE
// 🎮 Performans ayarlarına göre particle sayısı dinamik
export const CorrectCelebration: React.FC<{ trigger: number }> = ({ trigger }) => {
  const { config, getConfettiCount } = usePerformanceStore();
  
  // Performans ayarlarına göre hesapla
  const starCount = getConfettiCount(15);
  const sparkleCount = getConfettiCount(10);
  
  // LOW modda hiç confetti gösterme
  if (config.celebrationIntensity === 0) return null;
  
  // SE: Tek minimal konfeti, iPad/yeni: full effect
  return (
    <>
      <ConfettiExplosion 
        trigger={trigger} 
        emoji="⭐" 
        count={isSmallScreen ? Math.min(3, starCount) : starCount}
        spread="burst" 
      />
      {!isSmallScreen && config.celebrationIntensity >= 0.5 && sparkleCount > 0 && (
        <ConfettiExplosion 
          trigger={trigger} 
          emoji="✨" 
          count={sparkleCount}
          spread="firework"
          y={height / 2.5}
        />
      )}
    </>
  );
};

// Combo celebration - ULTRA OPTIMIZED
// 🎮 Performans ayarlarına göre particle sayısı dinamik
export const ComboCelebration: React.FC<{ trigger: number; combo: number }> = ({ trigger, combo }) => {
  const { config, getConfettiCount } = usePerformanceStore();
  
  const getEmoji = () => {
    if (combo >= 50) return '🌟';
    if (combo >= 30) return '⚡';
    if (combo >= 20) return '👑';
    if (combo >= 10) return '💎';
    if (combo >= 5) return '🔥';
    return '✨';
  };

  // LOW modda hiç confetti gösterme
  if (config.celebrationIntensity === 0) return null;

  // Performans ayarlarına göre hesapla
  const baseCount = Math.min(combo * 2, 40);
  const calculatedCount = getConfettiCount(baseCount);
  // SE: Çok minimal, iPad: full effect
  const count = isSmallScreen ? Math.min(5, Math.floor(calculatedCount * 0.3)) : calculatedCount;

  if (count === 0) return null;

  return (
    <ConfettiExplosion 
      trigger={trigger} 
      emoji={getEmoji()} 
      count={count} 
      spread="firework"
    />
  );
};

// Harvest celebration
// 🎮 Performans ayarlarına göre particle sayısı dinamik
export const HarvestCelebration: React.FC<{ trigger: number }> = ({ trigger }) => {
  const { config, getConfettiCount } = usePerformanceStore();
  
  // LOW modda hiç confetti gösterme
  if (config.celebrationIntensity === 0) return null;
  
  const burstCount = getConfettiCount(12);
  const rainCount = getConfettiCount(8);
  
  return (
    <>
      {burstCount > 0 && (
        <ConfettiExplosion 
          trigger={trigger} 
          emoji="🌾" 
          count={burstCount} 
          spread="burst"
        />
      )}
      {rainCount > 0 && config.celebrationIntensity >= 0.5 && (
        <ConfettiExplosion 
          trigger={trigger} 
          emoji="💰" 
          count={rainCount} 
          spread="rain"
          y={0}
        />
      )}
    </>
  );
};

// Level up mega celebration
// 🎮 Performans ayarlarına göre particle sayısı dinamik
export const LevelUpCelebration: React.FC<{ trigger: number }> = ({ trigger }) => {
  const { config, getConfettiCount } = usePerformanceStore();
  
  // LOW modda hiç confetti gösterme
  if (config.celebrationIntensity === 0) return null;
  
  const fireworkCount = getConfettiCount(30);
  const rainCount = getConfettiCount(20);
  const burstCount = getConfettiCount(25);
  
  return (
    <>
      {fireworkCount > 0 && (
        <ConfettiExplosion 
          trigger={trigger} 
          emoji="⭐" 
          count={fireworkCount} 
          spread="firework"
        />
      )}
      {rainCount > 0 && config.celebrationIntensity >= 0.5 && (
        <ConfettiExplosion 
          trigger={trigger} 
          emoji="🎉" 
          count={rainCount} 
          spread="rain"
          y={0}
        />
      )}
      {burstCount > 0 && config.celebrationIntensity >= 0.7 && (
        <>
          <ConfettiExplosion 
            trigger={trigger} 
            emoji="✨" 
            count={burstCount} 
            spread="burst"
            x={width / 4}
          />
          <ConfettiExplosion 
            trigger={trigger} 
            emoji="💫" 
            count={burstCount} 
            spread="burst"
            x={width * 3 / 4}
          />
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    textAlign: 'center',
  },
});
