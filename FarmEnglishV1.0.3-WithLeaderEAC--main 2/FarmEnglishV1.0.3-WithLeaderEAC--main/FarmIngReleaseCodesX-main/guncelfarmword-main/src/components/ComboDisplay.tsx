import React, { useEffect, useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700; // iPhone SE 2020 detection

interface ComboDisplayProps {
  combo: number;
  maxCombo: number;
  visible: boolean;
}

// 🔥 ULTRA MEGA Premium Combo Levels - TOMB OF THE MASK STYLE
const getComboLevel = (combo: number) => {
  if (combo >= 20) return {
    level: 'LEGENDARY',
    colors: ['#fbbf24', '#f97316', '#ef4444'] as const,
    emoji: '👑',
    multiplier: 5,
    borderWidth: 5,
    glowIntensity: 2.5,
    pulseSpeed: 300,
    scaleMax: 1.25,
  };
  if (combo >= 15) return {
    level: 'EPIC',
    colors: ['#a855f7', '#ec4899', '#ef4444'] as const,
    emoji: '💎',
    multiplier: 4,
    borderWidth: 4,
    glowIntensity: 2,
    pulseSpeed: 350,
    scaleMax: 1.2,
  };
  if (combo >= 10) return {
    level: 'AMAZING',
    colors: ['#3b82f6', '#8b5cf6', '#ec4899'] as const,
    emoji: '⚡',
    multiplier: 3,
    borderWidth: 3.5,
    glowIntensity: 1.8,
    pulseSpeed: 400,
    scaleMax: 1.18,
  };
  if (combo >= 5) return {
    level: 'GREAT',
    colors: ['#22c55e', '#06b6d4'] as const,
    emoji: '🔥',
    multiplier: 2,
    borderWidth: 3,
    glowIntensity: 1.5,
    pulseSpeed: 450,
    scaleMax: 1.15,
  };
  return {
    level: 'NICE',
    colors: ['#f97316', '#fbbf24'] as const,
    emoji: '✨',
    multiplier: 1,
    borderWidth: 2.5,
    glowIntensity: 1.2,
    pulseSpeed: 500,
    scaleMax: 1.12,
  };
};

// 🚀 ULTRA PERFORMANSLI COMBO DISPLAY - Hızlı cevaplarda sapıtmaz!
export const ComboDisplay: React.FC<ComboDisplayProps> = memo(({ combo, maxCombo, visible }) => {
  // 🎯 Animation değerleri - useRef ile stable
  const translateY = useRef(new Animated.Value(-100)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // 🔒 Performans için ref'ler - re-render önle
  const prevComboRef = useRef(combo);
  const isVisibleRef = useRef(false);
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const bounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);

  // 🧹 Cleanup helper - tüm animasyonları güvenli durdur
  const stopAllAnimations = useCallback(() => {
    animationsRef.current.forEach(anim => {
      try { anim.stop(); } catch (e) {}
    });
    animationsRef.current = [];
    if (bounceTimeoutRef.current) {
      clearTimeout(bounceTimeoutRef.current);
      bounceTimeoutRef.current = null;
    }
    isAnimatingRef.current = false;
  }, []);

  // 🎬 Ana animasyon effect'i - optimize edildi
  useEffect(() => {
    if (visible && combo >= 3) {
      const info = getComboLevel(combo);
      const comboChanged = prevComboRef.current !== combo;
      const justBecameVisible = !isVisibleRef.current;
      
      isVisibleRef.current = true;
      
      // 💥 BOUNCE - Sadece combo değiştiğinde (hızlı cevaplarda biriktirme)
      if (comboChanged && !isAnimatingRef.current) {
        prevComboRef.current = combo;
        isAnimatingRef.current = true;
        
        // Önceki bounce'u iptal et
        if (bounceTimeoutRef.current) {
          clearTimeout(bounceTimeoutRef.current);
        }
        
        // Bounce animasyonu - kısa ve öz
        bounceAnim.setValue(0);
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.spring(bounceAnim, {
            toValue: 0,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }),
        ]).start(() => {
          isAnimatingRef.current = false;
        });
      }

      // 🚀 ENTRANCE - Sadece ilk gösterimde
      if (justBecameVisible) {
        // Animasyonları sıfırla
        translateY.setValue(-100);
        scale.setValue(0.8);
        opacity.setValue(0);
        
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            tension: 90,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        
        // 🔥 Loop animasyonlarını SADECE bir kez başlat
        stopAllAnimations();
        
        const pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: info.scaleMax,
              duration: info.pulseSpeed / 2,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: info.pulseSpeed / 2,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        );

        const glowLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: info.glowIntensity,
              duration: 350,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 350,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        );

        const shimmerLoop = Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );

        pulseLoop.start();
        glowLoop.start();
        shimmerLoop.start();
        
        animationsRef.current = [pulseLoop, glowLoop, shimmerLoop];
      }
    } else if (!visible || combo < 3) {
      // 🚀 EXIT - Hızlı ve temiz
      if (isVisibleRef.current) {
        isVisibleRef.current = false;
        stopAllAnimations();
        
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
    
    return () => {
      stopAllAnimations();
    };
  }, [visible, combo, stopAllAnimations]);

  if (!visible || combo < 3) return null;

  const info = getComboLevel(combo);
  const isRecord = maxCombo > 0 && combo > maxCombo;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: Animated.add(translateY, bounceAnim) }, 
            { scale: Animated.multiply(scale, pulseAnim) },
          ],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      {/* 🔥 OUTER GLOW LAYER - Pulsing intensity */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            opacity: glowAnim,
            transform: [{ scale: Animated.add(1, Animated.multiply(glowAnim, 0.3)) }],
          },
        ]}
      >
        <LinearGradient
          colors={[...info.colors, info.colors[0]]}
          style={styles.glowGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <LinearGradient
        colors={info.colors}
        style={[styles.badge, { 
          borderWidth: Math.max(info.borderWidth - 1, 1.5),
          borderColor: 'rgba(255, 255, 255, 0.85)',
        }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* ✨ SHIMMER OVERLAY */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        />

        <Text style={styles.emoji}>{info.emoji}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.comboNumber}>{combo}</Text>
          <Text style={styles.comboLabel}>COMBO</Text>
        </View>
        <View style={[styles.levelBadge, { 
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.4)',
        }]}>
          <Text style={styles.levelText}>{info.level}</Text>
          <Text style={styles.multiplier}>×{info.multiplier}</Text>
        </View>
        {isRecord && (
          <View style={styles.recordBadge}>
            <Text style={styles.record}>🏆 REKOR!</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: isSmallScreen ? 25 : 35,
    alignSelf: 'center',
    zIndex: 999,
  },
  outerGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 28,
    zIndex: -1,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 28,
    opacity: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 10 : 14,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 22,
    gap: isSmallScreen ? 6 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ skewX: '-20deg' }],
  },
  emoji: {
    fontSize: isSmallScreen ? 18 : 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  comboNumber: {
    fontSize: isSmallScreen ? 22 : 28,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: -1,
  },
  comboLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: isSmallScreen ? 7 : 10,
    paddingVertical: isSmallScreen ? 3 : 4,
    borderRadius: 12,
    gap: isSmallScreen ? 3 : 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  levelText: {
    fontSize: isSmallScreen ? 8 : 10,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  multiplier: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '900',
    color: '#fde047',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  recordBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  record: {
    fontSize: isSmallScreen ? 7 : 9,
    fontWeight: '900',
    color: '#fde047',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
