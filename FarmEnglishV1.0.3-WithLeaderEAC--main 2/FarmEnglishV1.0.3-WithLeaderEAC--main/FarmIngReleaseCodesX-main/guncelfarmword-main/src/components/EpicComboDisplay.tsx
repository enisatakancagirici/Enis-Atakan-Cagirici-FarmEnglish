import React, { useEffect, useRef, useState, memo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getComboTier, juicyHaptic, ScreenShake } from '../utils/effects';

const { width, height } = Dimensions.get('window');

interface EpicComboDisplayProps {
  combo: number;
  visible: boolean;
  screenShake?: ScreenShake;
}

// 🚀 OPTIMIZED with React.memo
export const EpicComboDisplay: React.FC<EpicComboDisplayProps> = memo(({ 
  combo, 
  visible,
  screenShake 
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const [lastCombo, setLastCombo] = useState(0);

  const comboTier = getComboTier(combo);

  // Responsive scaling for smaller screens (e.g., 4.7")
  const baseH = 812;
  const uiScale = Math.max(height / baseH, 0.55);
  // Move it higher up to avoid covering the question
  const topOffset = height < 700 ? Math.max(height * 0.04, 20) : height * 0.08;

  // Pulse animation for glow
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    if (visible && combo > 0) {
      pulseAnimation.start();
      glowAnimation.start();
    }

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [visible, combo]);

  // Entry animation and combo change effects
  useEffect(() => {
    if (visible && combo > 0) {
      // 🔥 MEGA COMBO HAP TICS - 50/100/200
      if (combo >= 200) {
        juicyHaptic.combo200(); // 8 saniye deprem!
        screenShake?.epic();
      } else if (combo >= 100) {
        juicyHaptic.combo100(); // 5 saniye OUWWWW!
        screenShake?.epic();
      } else if (combo >= 50) {
        juicyHaptic.combo50(); // 2 saniye telefon titreşimi
        screenShake?.epic();
      } else if (combo >= 20) {
        juicyHaptic.legendaryCombo();
        screenShake?.epic();
      } else if (combo >= 10) {
        juicyHaptic.combo(4);
        screenShake?.heavy();
      } else if (combo >= 5) {
        juicyHaptic.combo(3);
        screenShake?.medium();
      } else if (combo > lastCombo) {
        juicyHaptic.combo(1);
        screenShake?.light();
      }

      // Animate in with bounce (Splash)
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            speed: 20,
            bounciness: 12,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            speed: 12,
            bounciness: 8,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Wait a bit then move to top right
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.4, // Shrink
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -height * 0.05, // Move up slightly relative to container
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, { // Move to right
            toValue: width * 0.35,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ]).start();

      // Rotation wiggle for high combos
      if (combo >= 10) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: -1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ).start();
      }

      setLastCombo(combo);
    } else {
      // Reset position when hidden
      translateX.setValue(0);
      translateY.setValue(-100);
      scale.setValue(0);
      
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, combo]);

  if (!visible || combo <= 0) return null;

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
            { scale: uiScale },
            { rotate: rotateInterpolate },
          ],
        },
      ]}
      pointerEvents="none"
    >
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale: pulseScale }, { scale: uiScale }],
            backgroundColor: comboTier.color,
          },
        ]}
      />

      <LinearGradient
        colors={comboTier.gradient as any}
        style={[
          styles.badge,
          { paddingHorizontal: 40 * uiScale, paddingVertical: 25 * uiScale, borderRadius: 25 * uiScale },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Crown/emoji for high combos */}
        {combo >= 5 && (
          <Text style={[styles.crownEmoji, { fontSize: 50 * uiScale }]}>
            {combo >= 200 ? '💀' : combo >= 100 ? '🤯' : combo >= 50 ? '🌟' : combo >= 30 ? '⚡' : combo >= 20 ? '👑' : combo >= 10 ? '💎' : '🔥'}
          </Text>
        )}

        {/* 🔥 OUWWWW! 100+ combo için özel yazı */}
        {combo >= 100 && (
          <Text style={[styles.ouwwwText, { fontSize: 32 * uiScale }]}>
            {combo >= 200 ? 'EARTHQUAKE!!!' : 'OUWWWW!!!'}
          </Text>
        )}

        {/* Combo number */}
        <Animated.Text
          style={[
            styles.comboNumber,
            { transform: [{ scale: pulseScale }, { scale: uiScale }] },
            { fontSize: 72 * uiScale },
          ]}
        >
          {combo}
        </Animated.Text>

        {/* COMBO text */}
        <Text style={[styles.comboText, { fontSize: 28 * uiScale }]}>COMBO!</Text>

        {/* Tier badge */}
        {comboTier.tier && (
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15 * uiScale, paddingHorizontal: 15 * uiScale, paddingVertical: 5 * uiScale }]}>
            <Text style={[styles.tierText, { fontSize: 16 * uiScale }]}>{comboTier.tier}</Text>
            <Text style={[styles.multiplierText, { fontSize: 18 * uiScale }]}>×{comboTier.multiplier}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Sparkles around */}
      {combo >= 10 && (
        <>
          <Animated.Text style={[styles.sparkle, styles.sparkle1, { opacity: glowOpacity }]}>✨</Animated.Text>
          <Animated.Text style={[styles.sparkle, styles.sparkle2, { opacity: glowOpacity }]}>⭐</Animated.Text>
          <Animated.Text style={[styles.sparkle, styles.sparkle3, { opacity: glowOpacity }]}>💫</Animated.Text>
          <Animated.Text style={[styles.sparkle, styles.sparkle4, { opacity: glowOpacity }]}>✨</Animated.Text>
        </>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none', // Allow clicks to pass through
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  badge: {
    paddingHorizontal: 40,
    paddingVertical: 25,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  crownEmoji: {
    fontSize: 50,
    marginBottom: 5,
  },
  ouwwwText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF0000',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 3,
    marginBottom: 5,
  },
  comboNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 10,
  },
  comboText: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  tierText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 2,
  },
  multiplierText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffd700',
    marginLeft: 10,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 24,
  },
  sparkle1: {
    top: -10,
    left: width / 2 - 100,
  },
  sparkle2: {
    top: 20,
    right: width / 2 - 100,
  },
  sparkle3: {
    bottom: -10,
    left: width / 2 - 80,
  },
  sparkle4: {
    bottom: 20,
    right: width / 2 - 80,
  },
});
