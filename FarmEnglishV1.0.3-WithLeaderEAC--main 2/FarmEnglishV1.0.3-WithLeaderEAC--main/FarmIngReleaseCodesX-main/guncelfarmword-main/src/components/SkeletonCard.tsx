import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_MARGIN) / 2;

// 💀 Skeleton Loading Card - TikTok/Reels style shimmer
export const SkeletonCard: React.FC<{ index?: number }> = ({ index = 0 }) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered fade in
    const delay = (index % 10) * 30;
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      delay,
      useNativeDriver: true,
    }).start();

    // Shimmer loop
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [index]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-CARD_WIDTH * 2, CARD_WIDTH * 2],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        {/* Shimmer effect */}
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0)',
              'rgba(255, 255, 255, 0.08)',
              'rgba(255, 255, 255, 0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Content placeholders */}
        <View style={styles.content}>
          {/* Icon placeholder */}
          <View style={styles.iconPlaceholder} />
          
          {/* Title placeholder */}
          <View style={styles.titlePlaceholder} />
          
          {/* Subtitle placeholder */}
          <View style={styles.subtitlePlaceholder} />
          
          {/* Progress bar placeholder */}
          <View style={styles.progressPlaceholder} />
          
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statPlaceholder} />
            <View style={styles.statPlaceholder} />
            <View style={styles.statPlaceholder} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  card: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.3)',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: CARD_WIDTH * 2,
  },
  content: {
    padding: 14,
    flex: 1,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 116, 139, 0.25)',
    marginBottom: 10,
  },
  titlePlaceholder: {
    width: '70%',
    height: 18,
    borderRadius: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
    marginBottom: 8,
  },
  subtitlePlaceholder: {
    width: '50%',
    height: 14,
    borderRadius: 5,
    backgroundColor: 'rgba(100, 116, 139, 0.25)',
    marginBottom: 12,
  },
  progressPlaceholder: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  statPlaceholder: {
    width: 45,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.25)',
  },
});

// Grid of skeleton cards
export const SkeletonCardGrid: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <View style={gridStyles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} index={index} />
      ))}
    </View>
  );
};

const gridStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 16,
  },
});
