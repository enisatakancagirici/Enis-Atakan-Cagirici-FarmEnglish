import React, { useCallback, useRef, memo } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated, ViewStyle } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { haptic } from '../utils/sound';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 🎯 Alt tab bar navigasyon sırası (soldan sağa)
const TAB_ORDER = ['Home', 'Farm', 'Quiz', 'Inventory', 'PhrasalVerbsMenu'] as const;
type TabRoute = typeof TAB_ORDER[number];

interface SwipeableScreenWrapperProps {
  children: React.ReactNode;
  currentRoute: TabRoute;
  style?: ViewStyle;
  disabled?: boolean; // Quiz gibi özel durumlar için
}

/**
 * 🌊 SwipeableScreenWrapper
 * 
 * Ekranlar arası kaydırma ile geçiş sağlar.
 * - Sola kaydır → Sonraki ekran (sağdaki)
 * - Sağa kaydır → Önceki ekran (soldaki)
 * 
 * Stack yerine reset kullanır - performans için ekranlar üst üste binmez.
 */
export const SwipeableScreenWrapper = memo<SwipeableScreenWrapperProps>(({ 
  children, 
  currentRoute, 
  style,
  disabled = false,
}) => {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;
  const isNavigating = useRef(false);
  const hasTriggered = useRef(false);

  // 🎯 Mevcut ekranın index'ini bul
  const currentIndex = TAB_ORDER.indexOf(currentRoute);

  // 🔀 Navigasyon fonksiyonu - RESET ile stack temizlenir
  const navigateTo = useCallback((route: TabRoute) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    
    haptic.medium();
    
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: route }],
      })
    );

    // Reset state after navigation
    setTimeout(() => {
      isNavigating.current = false;
      translateX.setValue(0);
    }, 500);
  }, [navigation, translateX]);

  // 🎮 PanResponder - Kaydırma gesture'ı
  const panResponder = useRef(
    PanResponder.create({
      // Kaydırma başlangıcı
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (disabled) return false;
        
        // Yatay kaydırma olmalı ve yeterince güçlü olmalı
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
        const isSignificant = Math.abs(gesture.dx) > 15;
        
        return isHorizontal && isSignificant && !isNavigating.current;
      },
      
      onPanResponderGrant: () => {
        hasTriggered.current = false;
        haptic.light();
      },
      
      onPanResponderMove: (_, gesture) => {
        if (hasTriggered.current || isNavigating.current) return;
        
        const { dx } = gesture;
        
        // Sınırlı hareket - ekranın %30'u kadar
        const clampedDx = Math.max(-SCREEN_WIDTH * 0.3, Math.min(SCREEN_WIDTH * 0.3, dx));
        
        // Kenar direnci - gidecek yer yoksa hareket azalt
        const canGoLeft = currentIndex > 0; // Önceki ekrana gidebilir mi?
        const canGoRight = currentIndex < TAB_ORDER.length - 1; // Sonraki ekrana gidebilir mi?
        
        let resistedDx = clampedDx;
        if (dx > 0 && !canGoLeft) {
          resistedDx = dx * 0.2; // Sola gidemez, direnç
        } else if (dx < 0 && !canGoRight) {
          resistedDx = dx * 0.2; // Sağa gidemez, direnç
        }
        
        translateX.setValue(resistedDx);
        
        // 🚀 Threshold'u geçince navigasyon tetikle
        const threshold = SCREEN_WIDTH * 0.2; // %20 kaydırınca geçiş
        
        if (dx > threshold && canGoLeft && !hasTriggered.current) {
          // Sağa kaydırıldı → Önceki ekrana git (soldaki)
          hasTriggered.current = true;
          const prevRoute = TAB_ORDER[currentIndex - 1];
          navigateTo(prevRoute);
        } else if (dx < -threshold && canGoRight && !hasTriggered.current) {
          // Sola kaydırıldı → Sonraki ekrana git (sağdaki)
          hasTriggered.current = true;
          const nextRoute = TAB_ORDER[currentIndex + 1];
          navigateTo(nextRoute);
        }
      },
      
      onPanResponderRelease: () => {
        if (!hasTriggered.current) {
          // Threshold'a ulaşılmadı, geri dön
          Animated.spring(translateX, {
            toValue: 0,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
          }).start();
        }
      },
      
      onPanResponderTerminate: () => {
        if (!hasTriggered.current) {
          translateX.setValue(0);
        }
      },
    })
  ).current;

  return (
    <Animated.View 
      style={[
        styles.container, 
        style,
        { transform: [{ translateX }] }
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SwipeableScreenWrapper;
