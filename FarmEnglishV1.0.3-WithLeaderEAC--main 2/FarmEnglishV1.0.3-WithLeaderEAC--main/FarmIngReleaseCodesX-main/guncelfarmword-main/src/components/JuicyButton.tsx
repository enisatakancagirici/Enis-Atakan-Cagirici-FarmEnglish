import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { juicyHaptic } from '../utils/effects';

interface JuicyButtonProps {
  title: string;
  emoji?: string;
  onPress: () => void;
  colors?: string[];
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  pulse?: boolean;
  glow?: boolean;
}

export const JuicyButton: React.FC<JuicyButtonProps> = ({
  title,
  emoji,
  onPress,
  colors = ['#6366f1', '#8b5cf6'],
  style,
  textStyle,
  disabled = false,
  size = 'medium',
  pulse = false,
  glow = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const shadowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    if (pulse) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [pulse]);

  // Glow animation
  useEffect(() => {
    if (glow) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [glow]);

  const handlePressIn = () => {
    juicyHaptic.tap();
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.92,
        speed: 50,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(shadowScale, {
        toValue: 0.5,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        speed: 15,
        bounciness: 12,
        useNativeDriver: true,
      }),
      Animated.spring(shadowScale, {
        toValue: 1,
        speed: 15,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    juicyHaptic.buttonPress();
    onPress();
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 };
      case 'large':
        return { paddingHorizontal: 32, paddingVertical: 18, fontSize: 20 };
      default:
        return { paddingHorizontal: 24, paddingVertical: 14, fontSize: 16 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: Animated.multiply(scale, pulseScale) },
          ],
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {/* Glow effect */}
      {glow && (
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              backgroundColor: colors[0],
            },
          ]}
        />
      )}

      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={1}
      >
        <LinearGradient
          colors={colors as any}
          style={[
            styles.button,
            {
              paddingHorizontal: sizeStyles.paddingHorizontal,
              paddingVertical: sizeStyles.paddingVertical,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <Text
            style={[
              styles.text,
              { fontSize: sizeStyles.fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Shadow */}
      <Animated.View
        style={[
          styles.shadow,
          {
            backgroundColor: colors[1] || colors[0],
            transform: [{ scaleY: shadowScale }],
          },
        ]}
      />
    </Animated.View>
  );
};

// Özel buton varyasyonları
export const QuizButton: React.FC<Omit<JuicyButtonProps, 'colors'>> = (props) => (
  <JuicyButton {...props} colors={['#22c55e', '#16a34a']} />
);

export const FarmButton: React.FC<Omit<JuicyButtonProps, 'colors'>> = (props) => (
  <JuicyButton {...props} colors={['#10b981', '#059669']} />
);

export const HarvestButton: React.FC<Omit<JuicyButtonProps, 'colors'>> = (props) => (
  <JuicyButton {...props} colors={['#f59e0b', '#d97706']} pulse glow />
);

export const DangerButton: React.FC<Omit<JuicyButtonProps, 'colors'>> = (props) => (
  <JuicyButton {...props} colors={['#ef4444', '#dc2626']} />
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 25,
    opacity: 0.3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  text: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 1,
  },
  shadow: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: -4,
    height: 8,
    borderRadius: 12,
    opacity: 0.3,
    zIndex: -1,
  },
});
