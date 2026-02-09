import React, { memo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MASCOT_IMAGE } from '../utils/assetPreloader';
import { haptic } from '../utils/sound';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = Dimensions.get('window').height < 700;

const MASCOT = {
  image: MASCOT_IMAGE,
};

// ☁️ CUTE CLOUD TIP - HomeScreen stili, koyu tema, tatlı bulut görünümlü
export const CuteCloudTip = memo(({ 
  message, 
  visible = true, 
  onDismiss,
  accentColor = '#22c55e',
}: { 
  message: string; 
  visible?: boolean;
  onDismiss: () => void;
  accentColor?: string;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      ]).start();
    }
    return () => {
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    haptic.light();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [onDismiss, fadeAnim, scaleAnim]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.container,
      { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
    ]}>
      <LinearGradient
        colors={[`${accentColor}22`, `${accentColor}11`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={[styles.mascotContainer, { borderColor: `${accentColor}50` }]}>
            <Image source={MASCOT.image} style={styles.mascot} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.text}>{message}</Text>
          </View>
          <Pressable onPress={handleDismiss} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        {/* Cloud tail */}
        <View style={[styles.tail, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}40` }]} />
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    zIndex: 100,
  },
  gradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    overflow: 'visible',
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: IS_SMALL_SCREEN ? 12 : 14,
    paddingHorizontal: IS_SMALL_SCREEN ? 12 : 14,
    paddingRight: 36,
    gap: IS_SMALL_SCREEN ? 10 : 12,
  },
  mascotContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
  },
  mascot: {
    width: 64,
    height: 64,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    lineHeight: IS_SMALL_SCREEN ? 18 : 20,
  },
  closeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  tail: {
    position: 'absolute',
    bottom: -8,
    left: 32,
    width: 16,
    height: 16,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
});

export default CuteCloudTip;
