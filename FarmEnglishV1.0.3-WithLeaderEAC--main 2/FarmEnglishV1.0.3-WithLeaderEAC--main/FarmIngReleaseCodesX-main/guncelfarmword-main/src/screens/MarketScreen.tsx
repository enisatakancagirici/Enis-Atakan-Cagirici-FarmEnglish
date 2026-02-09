import React, { useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Coins, Zap, Sprout, BookOpen, ChevronRight, ShoppingCart, Sparkles } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic } from '../utils/sound';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_TINY_SCREEN = SCREEN_HEIGHT < 680;
const IS_SMALL_SCREEN = SCREEN_HEIGHT >= 680 && SCREEN_HEIGHT < 750;

// 🏪 Market Item Card - FULL HEIGHT
const MarketItemCard = memo(({ 
  title, 
  subtitle, 
  slogan,
  icon: Icon, 
  iconEmoji,
  gradient, 
  borderColor, 
  glowColor,
  onPress 
}: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    haptic.medium();
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 200,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.marketItemWrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.marketItemTouchable}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.marketItemCard, { borderColor }]}
        >
          {/* Glow Effect */}
          <View style={[styles.marketItemGlow, { backgroundColor: glowColor }]} />
          
          <View style={styles.marketItemContent}>
            <View style={styles.marketItemLeft}>
              <Text style={styles.marketItemTitle}>{title}</Text>
              <Text style={styles.marketItemSubtitle}>{subtitle}</Text>
              <View style={styles.marketItemSloganWrap}>
                <Sparkles size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.marketItemSlogan}>{slogan}</Text>
              </View>
            </View>
            
            <View style={[styles.marketItemIconCircle, { backgroundColor: `${glowColor}30`, borderColor: `${glowColor}60` }]}>
              {iconEmoji ? (
                <Text style={styles.marketItemEmoji}>{iconEmoji}</Text>
              ) : (
                <Icon size={40} color={glowColor} />
              )}
            </View>
          </View>
          
          {/* Arrow */}
          <View style={styles.marketItemArrow}>
            <ChevronRight size={28} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// 🏪 MARKET SCREEN
export const MarketScreen = () => {
  const navigation = useNavigation();
  const coins = useFarmStore(state => state.coins);

  const handleNavigate = useCallback((route: string) => {
    haptic.medium();
    navigation.navigate(route as never);
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#13131A', '#0a0a0f', '#13131A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ShoppingCart size={32} color="#22c55e" />
            <View>
              <Text style={styles.headerTitle}>Market</Text>
              <Text style={styles.headerSubtitle}>Güçlen, Geliş, Kazan!</Text>
            </View>
          </View>
          
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.25)', 'rgba(255, 215, 0, 0.1)']}
            style={styles.coinsBadge}
          >
            <Coins color="#FFD700" size={18} />
            <Text style={styles.coinsText}>
              {coins >= 10000 ? `${(coins / 1000).toFixed(0)}k` : coins?.toLocaleString() || 0}
            </Text>
          </LinearGradient>
        </View>

        {/* 3 Market Items - Full Screen */}
        <View style={styles.marketItemsContainer}>
          {/* ⚡ Güç Mağazası */}
          <MarketItemCard
            title="⚡ Güç Mağazası"
            subtitle="Boost'lar, Hint'ler ve Paketler"
            slogan="Öğrenme hızını 2x'e çıkar!"
            icon={Zap}
            gradient={['#0a1628', '#162033', '#0a1628']}
            borderColor="rgba(34, 197, 94, 0.3)"
            glowColor="#22c55e"
            onPress={() => handleNavigate('Store')}
          />

          {/* 🌱 Tohum Pazarı */}
          <MarketItemCard
            title="🌱 Tohum Pazarı"
            subtitle="Toplam 4000+ kelime"
            slogan="Premium kelime tohumları seni bekliyor!"
            icon={Sprout}
            gradient={['#0f2922', '#1a3d36', '#0f2922']}
            borderColor="rgba(93, 245, 177, 0.3)"
            glowColor="#5DF5B1"
            onPress={() => handleNavigate('SeedMarket')}
          />

          {/* 📚 Phrasal Verbs */}
          <MarketItemCard
            title="📚 Phrasal Verbs"
            subtitle="İngilizce'nin Sihirli Dünyası"
            slogan="200+ phrasal verb ustası ol!"
            icon={BookOpen}
            gradient={['#1a0a3e', '#2d1260', '#1a0a3e']}
            borderColor="rgba(139, 0, 255, 0.3)"
            glowColor="#8B00FF"
            onPress={() => handleNavigate('PhrasalVerbsMenu')}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default MarketScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: IS_TINY_SCREEN ? 22 : 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 8,
  },
  coinsText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 16,
  },

  // Market Items Container - FULL SCREEN
  marketItemsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100, // navbar için
    justifyContent: 'space-between',
    paddingTop: 8,
  },

  // Market Item Card - FLEX 1 for equal height
  marketItemWrap: {
    flex: 1,
    marginBottom: 12,
  },
  marketItemTouchable: {
    flex: 1,
  },
  marketItemCard: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderWidth: 2.5,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  marketItemGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.25,
  },
  marketItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketItemLeft: {
    flex: 1,
    paddingRight: 16,
  },
  marketItemTitle: {
    fontSize: IS_TINY_SCREEN ? 24 : 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  marketItemSubtitle: {
    fontSize: IS_TINY_SCREEN ? 15 : 17,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    fontWeight: '600',
  },
  marketItemSloganWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marketItemSlogan: {
    fontSize: IS_TINY_SCREEN ? 13 : 14,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  marketItemIconCircle: {
    width: IS_TINY_SCREEN ? 70 : 85,
    height: IS_TINY_SCREEN ? 70 : 85,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  marketItemEmoji: {
    fontSize: IS_TINY_SCREEN ? 36 : 44,
  },
  marketItemArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -14,
    opacity: 0.7,
  },
});
