import React, { memo, useCallback, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Coins, Zap, Sparkles, Clock, Gift, ShoppingBag, Star } from 'lucide-react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { StoreItem } from '../models/types';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import JuicyModal from '../components/JuicyModal';

const { height } = Dimensions.get('window');
const IS_SMALL_SCREEN = height < 700;

type StoreSection = {
  type: 'header' | 'item';
  key: string;
  title?: string;
  subtitle?: string;
  item?: StoreItem;
};

const STORE_ITEMS: Array<{ section: { key: string; title: string; subtitle: string }; items: StoreItem[] }> = [
  {
    section: {
      key: 'consumables',
      title: '🧠 Yardımcılar',
      subtitle: 'Zorlandığında nefes aldırır. Hints, quizde 1 yanlış şıkkı siler.',
    },
    items: [
      {
        id: 'hint_pack_1',
        name: 'Hint (1)',
        description: 'Tek atımlık kurtarıcı. Zor soruda nefes al.',
        icon: '💡',
        price: 360,
        type: 'consumable',
      },
      {
        id: 'hint_pack_3',
        name: 'Hint Paketi (3)',
        description: 'Quizde "Hint" kullanıp 1 yanlış şıkkı elersin.',
        icon: '💡',
        price: 900,
        type: 'consumable',
      },
      {
        id: 'hint_pack_10',
        name: 'Hint Paketi (10)',
        description: 'Daha ucuza gelir. Seri quiz için ideal.',
        icon: '🔦',
        price: 2700,
        type: 'consumable',
      },
      {
        id: 'hint_pack_25',
        name: 'Hint Paketi (25)',
        description: 'Uzun süre rahat ettirir. “Hint sıkışması” çözümü.',
        icon: '🧠',
        price: 6000,
        type: 'consumable',
      },
      {
        id: 'hint_pack_60',
        name: 'Hint Kasası (60)',
        description: 'Hint’i asla bitirme. Büyük paket = büyük rahatlık.',
        icon: '🧰',
        price: 13500,
        type: 'consumable',
      },      // 🛡️ Combo Shield
      {
        id: 'combo_shield_1',
        name: 'Combo Kalkanı (1)',
        description: 'Yanlış yaptığında combo kırılmaz, quiz devam eder!',
        icon: '🛡️',
        price: 1500,
        type: 'consumable',
      },
      {
        id: 'combo_shield_3',
        name: 'Combo Kalkanı (3)',
        description: '3 yanlışa kadar combo koruma. Uzun seri için güvenlik.',
        icon: '🛡️',
        price: 3900,
        type: 'consumable',
      },
      {
        id: 'combo_shield_5',
        name: 'Combo Kalkanı (5)',
        description: '5 kalkan ile combo serinı garanti altına al.',
        icon: '🔰',
        price: 6000,
        type: 'consumable',
      },
      {
        id: 'combo_shield_10',
        name: 'Combo Zırhı (10)',
        description: 'Mega koruma! 10 yanlışa kadar combo korunur.',
        icon: '⚔️',
        price: 10500,
        type: 'consumable',
      },],
  },
  {
    section: {
      key: 'bundles',
      title: '🎁 Paketler',
      subtitle: 'Tek tıkla “tam set”. Hint + boost birlikte gelir.',
    },
    items: [
      {
        id: 'bundle_quiz_starter',
        name: 'Quiz Starter Paketi',
        description: '+5 Hint + Oturumluk Coin Yağmuru (ilk yanlışa kadar %50 coin).',
        icon: '🎁',
        price: 3300,
        type: 'consumable',
      },
      {
        id: 'bundle_grind_pack',
        name: 'Grind Paketi',
        description: '+10 Hint + Oturumluk XP Turbo (ilk yanlışa kadar %50 XP).',
        icon: '📦',
        price: 6600,
        type: 'consumable',
      },
      {
        id: 'bundle_power_kit',
        name: 'Power Kit',
        description: '+15 Hint + Oturumluk Mega Boost (ilk yanlışa kadar hem coin hem XP %50).',
        icon: '🧨',
        price: 11700,
        type: 'consumable',
      },
    ],
  },
  {
    section: {
      key: 'permanent',
      title: '✨ Kalıcı Avantajlar',
      subtitle: 'Bir kere al, uzun vadede kâr. Coin’ini “yatırım” gibi düşün.',
    },
    items: [
      {
        id: 'seed_discount_10',
        name: 'Tohum Pazarı İndirimi %10',
        description: 'Tohum Pazarı’nda her alışveriş %10 daha ucuz. Başlangıç yatırımı.',
        icon: '🌱',
        price: 4000,
        type: 'permanent',
      },
      {
        id: 'seed_discount_15',
        name: 'Tohum Pazarı İndirimi %15',
        description: 'Tohum Pazarı’nda her alışveriş %15 daha ucuz. Sürekli tohum alanlar için S-tier.',
        icon: '🌱',
        price: 10000,
        type: 'permanent',
      },
      {
        id: 'seed_discount_30',
        name: 'Tohum Pazarı İndirimi %30',
        description: 'Tohum Pazarı’nda her alışveriş %30 daha ucuz. "Tohum manyağı" mod.',
        icon: '🌿',
        price: 18000,
        type: 'permanent',
      },

      {
        id: 'phrasal_discount_10',
        name: 'Phrasal İndirimi %10',
        description: 'Phrasal Verb açma fiyatları %10 daha ucuz. Küçük ama sürekli kazanç.',
        icon: '📘',
        price: 4000,
        type: 'permanent',
      },
      {
        id: 'phrasal_discount_15',
        name: 'Phrasal İndirimi %15',
        description: 'Phrasal Verb açma fiyatları %15 daha ucuz. Paket açanlara çok değer.',
        icon: '📗',
        price: 10000,
        type: 'permanent',
      },
      {
        id: 'phrasal_discount_30',
        name: 'Phrasal İndirimi %30',
        description: 'Phrasal Verb açma fiyatları %30 daha ucuz. Uzun vadeli büyük yatırım.',
        icon: '📚',
        price: 18000,
        type: 'permanent',
      },

      {
        id: 'hint_bonus_30',
        name: 'Hint Bonusu +%30',
        description: 'Hint paketi aldığında %30 daha fazla hint kazanırsın (kalıcı).',
        icon: '🔋',
        price: 8000,
        type: 'permanent',
      },
      {
        id: 'hint_bonus_75',
        name: 'Hint Bonusu +%75',
        description: 'Hint paketi aldığında %75 daha fazla hint kazanırsın (kalıcı).',
        icon: '⚗️',
        price: 17000,
        type: 'permanent',
      },


      {
        id: 'coin_charm_10',
        name: 'Coin Tılsımı +%10',
        description: 'Quiz coin kazancın kalıcı olarak %10 artar.',
        icon: '🪙',
        price: 8000,
        type: 'permanent',
      },
      {
        id: 'coin_charm_20',
        name: 'Coin Tılsımı +%20',
        description: 'Quiz coin kazancın kalıcı olarak %20 artar.',
        icon: '💰',
        price: 18000,
        type: 'permanent',
      },
      {
        id: 'xp_charm_10',
        name: 'XP Rozeti +%10',
        description: 'Quiz XP kazancın kalıcı olarak %10 artar.',
        icon: '📈',
        price: 8000,
        type: 'permanent',
      },
      {
        id: 'xp_charm_20',
        name: 'XP Rozeti +%20',
        description: 'Quiz XP kazancın kalıcı olarak %20 artar.',
        icon: '🏅',
        price: 18000,
        type: 'permanent',
      },
    ],
  },
];

const formatTimeLeft = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// 🎯 ANIMATED SECTION HEADER - PhrasalVerbsMenuScreen gibi
const SectionHeader = memo(({ title, subtitle, index }: { title: string; subtitle: string; index?: number }) => (
  <Animated.View entering={FadeInUp.delay((index || 0) * 50).springify()}>
    <LinearGradient
      colors={['rgba(124, 58, 237, 0.15)', 'rgba(59, 130, 246, 0.08)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.sectionHeader}
    >
      <View style={styles.sectionIconWrap}>
        {title.includes('⚡') && <Zap size={18} color="#fbbf24" />}
        {title.includes('🧠') && <Sparkles size={18} color="#a855f7" />}
        {title.includes('🎁') && <Gift size={18} color="#f472b6" />}
        {title.includes('✨') && <Star size={18} color="#22c55e" />}
      </View>
      <View style={styles.sectionTextWrap}>
        <Text style={styles.sectionTitle}>{title.replace(/[⚡🧠🎁✨]\s*/g, '')}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  </Animated.View>
));

// 🔥 ULTRA JUICY STORE ITEM CARD - PhrasalVerbsMenuScreen gibi animasyonlu
const StoreItemCard = memo(({
  item,
  coins,
  hintTokens,
  comboShields,
  isOwned,
  isActive,
  timeLeftMs,
  onBuy,
  isSmall,
  index,
}: {
  item: StoreItem;
  coins: number;
  hintTokens: number;
  comboShields: number;
  isOwned: boolean;
  isActive: boolean;
  timeLeftMs?: number;
  onBuy: (item: StoreItem) => void;
  isSmall: boolean;
  index: number;
}) => {
  const canAfford = coins >= item.price;
  const disabled = (item.type === 'permanent' && isOwned) || (item.type === 'boost' && isActive) || !canAfford;

  // 🎯 REANIMATED - Press animation
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.3);
  const shimmer = useSharedValue(0);

  // 🎭 Glow animation for affordable items
  useEffect(() => {
    if (canAfford && !disabled) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.linear }),
        -1,
        false
      );
    }
    if (isActive) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [canAfford, disabled, isActive]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * 350 - 100 }],
    opacity: 0.25,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.5,
  }));

  const handlePressIn = () => {
    haptic.light?.();
    scale.value = withSpring(0.96, { damping: 12, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handleBuy = () => {
    scale.value = withSpring(1.05, { damping: 8, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    });
    onBuy(item);
  };

  // 🎨 Gradient colors based on type
  const bg = item.type === 'boost'
    ? isActive 
      ? (['#065f46', '#059669'] as const) // Active boost = green
      : (['#1e3a8a', '#3b82f6'] as const) // Boost = blue
    : item.type === 'consumable'
      ? (['#581c87', '#7c3aed'] as const) // Consumable = purple
      : isOwned
        ? (['#14532d', '#22c55e'] as const) // Owned permanent = green
        : (['#312e81', '#6366f1'] as const); // Permanent = indigo

  const badgeText = item.type === 'permanent'
    ? (isOwned ? '✓ SENDE VAR' : '♾️ KALICI')
    : item.type === 'boost'
      ? (isActive ? '🟢 AKTİF' : '⚡ QUIZ BOOST')
      : '🎯 KULLAN-AL';

  const badgeBg = item.type === 'permanent' && isOwned
    ? 'rgba(34, 197, 94, 0.3)'
    : item.type === 'boost' && isActive
      ? 'rgba(34, 197, 94, 0.3)'
      : 'rgba(0,0,0,0.25)';

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 15) * 40).springify()}>
      <Animated.View style={animatedCardStyle}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPressIn={handlePressIn} 
          onPressOut={handlePressOut}
          onPress={handleBuy}
          disabled={disabled}
        >
          <LinearGradient 
            colors={bg} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={[styles.itemCard, disabled && styles.itemCardDisabled]}
          >
            {/* 🌟 SHIMMER EFFECT */}
            {canAfford && !disabled && (
              <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]}>
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            )}

            {/* 🌟 ACTIVE GLOW for boosts */}
            {isActive && (
              <Animated.View style={[styles.activeGlow, animatedGlowStyle]} />
            )}

            <View style={styles.itemTop}>
              <View style={[styles.itemIconWrap, isActive && styles.itemIconActive]}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, isSmall && { fontSize: 14 }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </View>

            <View style={styles.itemBottom}>
              <View style={styles.itemBadges}>
                <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                  {item.type === 'boost' ? <Zap size={11} color="#fff" /> : item.type === 'consumable' ? <Sparkles size={11} color="#fff" /> : <Star size={11} color="#fff" />}
                  <Text style={styles.typeBadgeText}>{badgeText}</Text>
                </View>

                {item.id.startsWith('hint_pack') && (
                  <View style={styles.subBadge}>
                    <Text style={styles.subBadgeText}>💡 {hintTokens}</Text>
                  </View>
                )}

                {item.id.startsWith('combo_shield') && (
                  <View style={styles.subBadge}>
                    <Text style={styles.subBadgeText}>🛡️ {comboShields}</Text>
                  </View>
                )}

                {item.type === 'boost' && isActive && typeof timeLeftMs === 'number' && (
                  <View style={[styles.subBadge, { backgroundColor: 'rgba(34, 197, 94, 0.3)' }]}>
                    <Clock size={11} color="#22c55e" />
                    <Text style={[styles.subBadgeText, { color: '#22c55e' }]}>Quiz'de Aktif</Text>
                  </View>
                )}
              </View>

              <View style={[styles.buyBtn, disabled && styles.buyBtnDisabled, canAfford && !disabled && styles.buyBtnAffordable]}>
                <Coins size={13} color={disabled ? 'rgba(255,255,255,0.5)' : '#FFD700'} />
                <Text style={[styles.buyBtnText, disabled && { opacity: 0.5 }]}>{item.price.toLocaleString()}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

export default function StoreScreen() {
  const navigation = useNavigation<any>();
  const { height } = useWindowDimensions();
  const isSmall = height < 700;

  const coins = useFarmStore(s => s.coins);
  const hintTokens = useFarmStore(s => s.hintTokens);
  const comboShields = useFarmStore(s => s.comboShields);
  const activeBoosts = useFarmStore(s => s.activeBoosts);
  const ownedItems = useFarmStore(s => s.ownedItems);
  const purchaseItem = useFarmStore(s => s.purchaseItem);
  const cleanExpiredBoosts = useFarmStore(s => s.cleanExpiredBoosts);

  // 🎯 Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    titleEmoji?: string;
    message: string;
    secondaryMessage?: string;
    secondaryEmoji?: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'purchase';
    onConfirm?: () => void;
    confirmText?: string;
  } | null>(null);

  const now = Date.now();
  const activeBoostMap = useMemo(() => {
    const map = new Map<string, number>();
    activeBoosts.forEach(b => {
      if (b.expiresAt > now) map.set(b.id, b.expiresAt);
    });
    return map;
  }, [activeBoosts, now]);

  const flatData: StoreSection[] = useMemo(() => {
    const data: StoreSection[] = [];
    STORE_ITEMS.forEach(group => {
      data.push({ type: 'header', key: `header-${group.section.key}`, title: group.section.title, subtitle: group.section.subtitle });
      group.items.forEach(item => {
        data.push({ type: 'item', key: item.id, item });
      });
    });
    return data;
  }, []);

  const handleBuy = useCallback((item: StoreItem) => {
    cleanExpiredBoosts?.();

    const isOwned = ownedItems.includes(item.id);
    const isActive = activeBoostMap.has(item.id);

    if (item.type === 'permanent' && isOwned) {
      haptic.light();
      setModalConfig({
        title: 'Zaten Sende',
        titleEmoji: '✅',
        message: 'Bu kalıcı avantaj zaten aktif.',
        type: 'info',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }

    if (item.type === 'boost' && isActive) {
      haptic.light();
      setModalConfig({
        title: 'Zaten Aktif',
        titleEmoji: '⏳',
        message: 'Bu boost şu an aktif. Süresi bitince tekrar alabilirsin.',
        type: 'info',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }

    if (item.type === 'permanent') {
      const tieredPrefixes = ['seed_discount_', 'phrasal_discount_', 'hint_bonus_', 'coin_charm_', 'xp_charm_'];
      for (const prefix of tieredPrefixes) {
        if (!item.id.startsWith(prefix)) continue;
        const newTier = Number.parseInt(item.id.slice(prefix.length), 10);
        if (!Number.isFinite(newTier) || newTier <= 0) break;

        let currentTier = 0;
        for (const ownedId of ownedItems) {
          if (!ownedId.startsWith(prefix)) continue;
          const t = Number.parseInt(ownedId.slice(prefix.length), 10);
          if (Number.isFinite(t)) currentTier = Math.max(currentTier, t);
        }

        if (currentTier >= newTier && currentTier > 0) {
          haptic.light();
          setModalConfig({
            title: 'Daha İyisi Sende',
            titleEmoji: '✅',
            message: 'Bu kalıcı avantajın daha güçlü versiyonu zaten sende.',
            type: 'success',
            confirmText: 'Tamam',
          });
          setModalVisible(true);
          return;
        }
      }
    }

    if (coins < item.price) {
      haptic.light();
      setModalConfig({
        title: 'Yetersiz Coin',
        titleEmoji: '❌',
        message: `Bu ürün için ${item.price.toLocaleString()} coin gerekiyor.`,
        secondaryMessage: `Mevcut bakiyen: ${coins.toLocaleString()} coin`,
        secondaryEmoji: '💰',
        type: 'error',
        confirmText: 'Tamam',
      });
      setModalVisible(true);
      return;
    }

    const confirmText = item.type === 'consumable'
      ? 'Satın Al'
      : item.type === 'boost'
        ? 'Aktifleştir'
        : 'Satın Al';

    setModalConfig({
      title: item.name,
      titleEmoji: item.icon,
      message: item.description,
      secondaryMessage: `Fiyat: ${item.price.toLocaleString()} coin`,
      secondaryEmoji: '💰',
      type: 'purchase',
      confirmText,
      onConfirm: () => {
        setModalVisible(false);
        const ok = purchaseItem?.(item.id, item.price, item.type, item.duration);
        if (ok) {
          haptic.harvestCelebration?.();
          sound.playCoin();
        } else {
          haptic.light();
          setTimeout(() => {
            setModalConfig({
              title: 'Olmadı',
              titleEmoji: '❌',
              message: 'Satın alma işlemi başarısız oldu.',
              type: 'error',
              confirmText: 'Tamam',
            });
            setModalVisible(true);
          }, 100);
        }
      },
    });
    setModalVisible(true);
  }, [coins, ownedItems, activeBoostMap, purchaseItem, cleanExpiredBoosts]);

  const renderItem = useCallback(({ item, index }: { item: StoreSection; index: number }) => {
    if (item.type === 'header') {
      return <SectionHeader title={item.title || ''} subtitle={item.subtitle || ''} index={index} />;
    }

    const storeItem = item.item!;
    const expiresAt = activeBoostMap.get(storeItem.id);
    const isActive = typeof expiresAt === 'number' && expiresAt > Date.now();
    const isOwned = ownedItems.includes(storeItem.id);

    return (
      <StoreItemCard
        item={storeItem}
        coins={coins}
        hintTokens={hintTokens}
        comboShields={comboShields}
        isOwned={isOwned}
        isActive={isActive}
        timeLeftMs={expiresAt ? expiresAt - Date.now() : undefined}
        onBuy={handleBuy}
        isSmall={isSmall}
        index={index}
      />
    );
  }, [coins, hintTokens, comboShields, ownedItems, activeBoostMap, handleBuy, isSmall]);

  return (
    <LinearGradient colors={['#05050b', '#0a0a12', '#0f0f18']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        {/* 🎯 HERO HEADER */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.2)', 'rgba(59, 130, 246, 0.1)', 'transparent']}
            style={styles.heroHeader}
          >
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => {
                  haptic.light();
                  navigation.navigate('Home' as never);
                }}
                style={styles.backBtn}
                activeOpacity={0.8}
              >
                <ArrowLeft size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.titleWrap}>
                <View style={styles.titleRow}>
                  <ShoppingBag size={IS_SMALL_SCREEN ? 18 : 22} color="#a855f7" />
                  <Text style={styles.title}>Mağaza</Text>
                </View>
                <Text style={styles.subtitle}>Coin harca → Gücünü hisset</Text>
              </View>

              <View style={styles.balancePill}>
                <Coins size={14} color="#FFD700" />
                <Text style={styles.balanceText}>{coins.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.motivationRow}>
              <View style={styles.motivationChip}>
                <Text style={styles.motivationEmoji}>💡</Text>
                <Text style={styles.motivationChipValue}>{hintTokens}</Text>
                <Text style={styles.motivationChipTitle}>Hint</Text>
              </View>
              <View style={styles.motivationChip}>
                <Text style={styles.motivationEmoji}>🛡️</Text>
                <Text style={styles.motivationChipValue}>{comboShields}</Text>
                <Text style={styles.motivationChipTitle}>Kalkan</Text>
              </View>
              <View style={[styles.motivationChip, activeBoostMap.size > 0 && styles.motivationChipActive]}>
                <Text style={styles.motivationEmoji}>⚡</Text>
                <Text style={styles.motivationChipValue}>{activeBoostMap.size}</Text>
                <Text style={styles.motivationChipTitle}>Boost</Text>
              </View>
              <View style={styles.motivationChip}>
                <Text style={styles.motivationEmoji}>✨</Text>
                <Text style={styles.motivationChipValue}>{ownedItems.length}</Text>
                <Text style={styles.motivationChipTitle}>Kalıcı</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <FlashList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={(i) => i.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        {/* 🎯 Juicy Modal */}
        {modalConfig && (
          <JuicyModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            title={modalConfig.title}
            titleEmoji={modalConfig.titleEmoji}
            message={modalConfig.message}
            secondaryMessage={modalConfig.secondaryMessage}
            secondaryEmoji={modalConfig.secondaryEmoji}
            type={modalConfig.type}
            buttons={modalConfig.onConfirm ? [
              {
                text: 'İptal',
                type: 'cancel',
                onPress: () => setModalVisible(false),
              },
              {
                text: modalConfig.confirmText || 'Tamam',
                type: 'primary',
                onPress: modalConfig.onConfirm,
              },
            ] : [
              {
                text: modalConfig.confirmText || 'Tamam',
                type: 'primary',
                onPress: () => setModalVisible(false),
              },
            ]}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  heroHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: IS_SMALL_SCREEN ? 4 : 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  titleWrap: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { color: '#fff', fontSize: IS_SMALL_SCREEN ? 18 : 22, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  balanceText: { color: '#FFD700', fontWeight: '900', fontSize: 13 },

  motivationRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  motivationChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: IS_SMALL_SCREEN ? 8 : 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  motivationChipActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  motivationEmoji: { fontSize: IS_SMALL_SCREEN ? 16 : 18 },
  motivationChipTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', marginTop: 2 },
  motivationChipValue: { color: '#fff', fontSize: IS_SMALL_SCREEN ? 14 : 16, fontWeight: '900' },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 120,
  },

  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTextWrap: { flex: 1 },
  sectionTitle: { color: '#fff', fontSize: IS_SMALL_SCREEN ? 14 : 16, fontWeight: '900' },
  sectionSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', marginTop: 2 },

  itemCard: {
    borderRadius: 16,
    padding: IS_SMALL_SCREEN ? 12 : 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  itemCardDisabled: {
    opacity: 0.65,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  activeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 16,
  },
  itemTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    zIndex: 2,
  },
  itemIconWrap: {
    width: IS_SMALL_SCREEN ? 40 : 44,
    height: IS_SMALL_SCREEN ? 40 : 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  itemIconActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  itemIcon: { fontSize: IS_SMALL_SCREEN ? 18 : 20 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: IS_SMALL_SCREEN ? 14 : 15, fontWeight: '800' },
  itemDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 3, lineHeight: 15 },

  itemBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  itemBadges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    paddingRight: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  typeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  subBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  buyBtnDisabled: {
    borderColor: 'rgba(255,255,255,0.05)',
  },
  buyBtnAffordable: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  buyBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});

