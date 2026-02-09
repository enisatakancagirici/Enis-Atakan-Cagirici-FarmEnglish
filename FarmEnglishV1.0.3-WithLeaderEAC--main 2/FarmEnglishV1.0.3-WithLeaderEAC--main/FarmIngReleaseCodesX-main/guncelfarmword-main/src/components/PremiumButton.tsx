import React, { useRef, useEffect } from 'react';
import { Pressable, Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { haptic } from '../utils/sound';

interface PremiumButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: string;
  shimmer?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  shimmer = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shimmer) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const getColors = (): readonly [string, string, string] => {
    switch (variant) {
      case 'primary':
        return ['#3b82f6', '#2563eb', '#1d4ed8'] as const;
      case 'secondary':
        return ['#64748b', '#475569', '#334155'] as const;
      case 'success':
        return ['#22c55e', '#16a34a', '#15803d'] as const;
      case 'danger':
        return ['#ef4444', '#dc2626', '#b91c1c'] as const;
      default:
        return ['#3b82f6', '#2563eb', '#1d4ed8'] as const;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 10, paddingHorizontal: 16 };
      case 'large':
        return { paddingVertical: 18, paddingHorizontal: 32 };
      default:
        return { paddingVertical: 14, paddingHorizontal: 24 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const handlePressIn = () => {
    if (disabled) return;
    
    haptic.light();
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled) return;
    haptic.medium();
    onPress();
  };

  const colors = getColors();
  const padding = getPadding();
  const fontSize = getFontSize();

  const shadowStyle = {
    shadowOpacity: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.6],
    }),
    shadowRadius: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 16],
    }),
    elevation: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [5, 10],
    }),
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.5 : 1,
        },
        shadowStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={styles.pressable}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, padding]}
        >
          <View style={styles.content}>
            {icon && <Text style={[styles.icon, { fontSize: fontSize + 2 }]}>{icon}</Text>}
            <Text style={[styles.title, { fontSize }]}>{title}</Text>
          </View>
          {shimmer && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shimmer,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0.4, 0],
                  }),
                  transform: [
                    {
                      translateX: shimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-120, 120],
                      }),
                    },
                    { rotate: '20deg' },
                  ],
                },
              ]}
            />
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
  },
  pressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    color: '#ffffff',
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
