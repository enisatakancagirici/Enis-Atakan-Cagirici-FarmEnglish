import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Search, X, Sprout, Package, Lock, Unlock, Sparkles } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import type { PhrasalVerb } from '../models/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 🎨 Seviye renkleri
const LEVEL_COLORS: Record<string, { gradient: readonly [string, string, string]; border: string; text: string; glow: string }> = {
  A1: { gradient: ['#065f46', '#047857', '#065f46'], border: '#10b981', text: '#a7f3d0', glow: '#10b981' },
  A2: { gradient: ['#1e3a8a', '#1d4ed8', '#1e3a8a'], border: '#3b82f6', text: '#93c5fd', glow: '#3b82f6' },
  B1: { gradient: ['#78350f', '#b45309', '#78350f'], border: '#f59e0b', text: '#fde68a', glow: '#f59e0b' },
  B2: { gradient: ['#7c2d12', '#c2410c', '#7c2d12'], border: '#f97316', text: '#fed7aa', glow: '#f97316' },
  C1: { gradient: ['#7f1d1d', '#b91c1c', '#7f1d1d'], border: '#ef4444', text: '#fecaca', glow: '#ef4444' },
  C2: { gradient: ['#581c87', '#7c3aed', '#581c87'], border: '#a855f7', text: '#e9d5ff', glow: '#a855f7' },
};

// 💰 Seviye fiyatları
const LEVEL_PRICES: Record<string, number> = {
  A1: 50,
  A2: 100,
  B1: 200,
  B2: 400,
  C1: 800,
  C2: 1500,
};

type RouteParams = {
  PhrasalVerbList: {
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  };
};

// 🃏 Phrasal Verb Kart Bileşeni
const PhrasalVerbCard = React.memo(({
  item,
  isUnlocked,
  levelColor,
  onUnlock,
  price,
  canAfford,
  isInFarm,
  isInInventory,
}: {
  item: PhrasalVerb;
  isUnlocked: boolean;
  levelColor: typeof LEVEL_COLORS['A1'];
  onUnlock: () => void;
  price: number;
  canAfford: boolean;
  isInFarm: boolean;
  isInInventory: boolean;
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(50).springify()}
      style={styles.cardContainer}
    >
      <LinearGradient
        colors={isUnlocked ? levelColor.gradient : ['#1a1a2e', '#16213e', '#1a1a2e']}
        style={[
          styles.card,
          { borderColor: isUnlocked ? levelColor.border : '#333' },
        ]}
      >
        {/* Üst kısım: Fiil ve Seviye */}
        <View style={styles.cardHeader}>
          <Text style={[styles.verbText, { color: isUnlocked ? levelColor.text : '#666' }]}>
            {item.verb}
          </Text>
          <View style={[styles.levelBadge, { backgroundColor: levelColor.border + '40' }]}>
            <Text style={[styles.levelBadgeText, { color: levelColor.text }]}>
              {item.difficulty}
            </Text>
          </View>
        </View>

        {/* 🌱 Farm/Inventory Status Badge */}
        {isUnlocked && (isInFarm || isInInventory) && (
          <View style={[
            styles.statusBadge,
            { backgroundColor: isInFarm ? 'rgba(34, 197, 94, 0.25)' : 'rgba(168, 85, 247, 0.25)' }
          ]}>
            {isInFarm ? (
              <>
                <Sprout size={12} color="#22c55e" />
                <Text style={[styles.statusBadgeText, { color: '#22c55e' }]}>Tarlada</Text>
              </>
            ) : (
              <>
                <Package size={12} color="#a855f7" />
                <Text style={[styles.statusBadgeText, { color: '#a855f7' }]}>Envanterde</Text>
              </>
            )}
          </View>
        )}

        {/* Orta kısım: Anlam ve Örnek */}
        {isUnlocked ? (
          <>
            <View style={styles.definitionRow}>
              <Text style={styles.definitionIcon}>📖</Text>
              <Text style={[styles.definitionText, { color: levelColor.text }]}>
                {item.meaning}
              </Text>
            </View>
            {!!item.example && (
              <View style={styles.exampleRow}>
                <Text style={styles.exampleIcon}>💬</Text>
                <Text style={[styles.exampleText, { color: levelColor.text + 'cc' }]}>
                  "{item.example}"
                </Text>
              </View>
            )}
            {/* Kategori */}
            {!!item.category && (
              <View style={styles.categoryRow}>
                <Text style={[styles.categoryTag, { backgroundColor: levelColor.border + '30', color: levelColor.text }]}>
                  ◈ {item.category}
                </Text>
              </View>
            )}
            {/* Açık işareti */}
            <View style={[styles.unlockedBadge, { backgroundColor: levelColor.border }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          </>
        ) : (
          <>
            {/* Kilitli içerik */}
            <View style={styles.lockedContent}>
              <Ionicons name="lock-closed" size={32} color="#666" />
              <Text style={styles.lockedText}>Kilitli</Text>
            </View>
            {/* Aç butonu */}
            <TouchableOpacity
              style={[
                styles.unlockButton,
                { backgroundColor: canAfford ? levelColor.border : '#444' },
              ]}
              onPress={onUnlock}
              disabled={!canAfford}
            >
              <Ionicons name="lock-open" size={14} color="#fff" />
              <Text style={styles.unlockButtonText}>{price} 💰</Text>
            </TouchableOpacity>
          </>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

export default function PhrasalVerbListScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'PhrasalVerbList'>>();
  const level = route.params?.level || 'A1';
  
  const phrasalVerbs = useFarmStore(s => s.phrasalVerbs);
  const unlockedPhrasalVerbs = useFarmStore(s => s.unlockedPhrasalVerbs);
  const phrasalVerbFarm = useFarmStore(s => s.phrasalVerbFarm);
  const phrasalVerbInventory = useFarmStore(s => s.phrasalVerbInventory);
  const coins = useFarmStore(s => s.coins);
  const unlockPhrasalVerb = useFarmStore(s => s.unlockPhrasalVerb);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  
  const levelColor = LEVEL_COLORS[level];
  const price = LEVEL_PRICES[level];

  // Farm ve Inventory ID'leri
  const farmIds = useMemo(() => new Set(phrasalVerbFarm.map(p => p.id)), [phrasalVerbFarm]);
  const inventoryIds = useMemo(() => new Set(phrasalVerbInventory?.map(p => p.id) || []), [phrasalVerbInventory]);

  // Bu seviyedeki phrasal verb'leri filtrele
  const levelVerbs = useMemo(() => {
    return phrasalVerbs.filter(pv => pv.difficulty === level);
  }, [phrasalVerbs, level]);

  // Arama filtresi
  const filteredVerbs = useMemo(() => {
    if (!searchQuery.trim()) return levelVerbs;
    const query = searchQuery.toLowerCase();
    return levelVerbs.filter(pv =>
      pv.verb.toLowerCase().includes(query) ||
      pv.meaning.toLowerCase().includes(query)
    );
  }, [levelVerbs, searchQuery]);

  // İstatistikler
  const stats = useMemo(() => {
    const unlockedSet = new Set(unlockedPhrasalVerbs);
    const unlockedCount = levelVerbs.filter(pv => unlockedSet.has(pv.id)).length;
    return {
      total: levelVerbs.length,
      unlocked: unlockedCount,
      locked: levelVerbs.length - unlockedCount,
    };
  }, [levelVerbs, unlockedPhrasalVerbs]);

  // Kilit açma
  const handleUnlock = useCallback((pvId: string) => {
    if (coins < price) {
      Alert.alert('Yetersiz Coin', `Bu phrasal verb'ü açmak için ${price} coin gerekiyor.`);
      return;
    }

    Alert.alert(
      'Phrasal Verb Aç',
      `${price} coin karşılığında bu phrasal verb'ü açmak istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Aç',
          onPress: () => {
            const success = unlockPhrasalVerb(pvId, level);
            if (success) {
              haptic.success();
              sound?.playCorrect?.();
            }
          },
        },
      ]
    );
  }, [coins, price, unlockPhrasalVerb, level]);

  // Tümünü aç
  const handleUnlockAll = useCallback(() => {
    const unlockedSet = new Set(unlockedPhrasalVerbs);
    const lockedVerbs = levelVerbs.filter(pv => !unlockedSet.has(pv.id));
    const totalCost = lockedVerbs.length * price;

    if (totalCost === 0) {
      Alert.alert('Bilgi', 'Bu seviyedeki tüm phrasal verb\'ler zaten açık!');
      return;
    }

    if (coins < totalCost) {
      Alert.alert('Yetersiz Coin', `Tümünü açmak için ${totalCost} coin gerekiyor.\nMevcut: ${coins} coin`);
      return;
    }

    Alert.alert(
      'Tümünü Aç',
      `${lockedVerbs.length} phrasal verb'ü ${totalCost} coin ile açmak istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tümünü Aç',
          onPress: () => {
            let successCount = 0;
            lockedVerbs.forEach(pv => {
              if (unlockPhrasalVerb(pv.id, level)) {
                successCount++;
              }
            });
            if (successCount > 0) {
              haptic.success();
              sound?.playCorrect?.();
              Alert.alert('Başarılı', `${successCount} phrasal verb açıldı!`);
            }
          },
        },
      ]
    );
  }, [levelVerbs, unlockedPhrasalVerbs, coins, price, unlockPhrasalVerb, level]);

  const renderItem = useCallback(({ item }: { item: PhrasalVerb }) => {
    const isUnlocked = unlockedPhrasalVerbs.includes(item.id);
    const isInFarm = farmIds.has(item.id);
    const isInInventory = inventoryIds.has(item.id);
    return (
      <PhrasalVerbCard
        item={item}
        isUnlocked={isUnlocked}
        levelColor={levelColor}
        onUnlock={() => handleUnlock(item.id)}
        price={price}
        canAfford={coins >= price}
        isInFarm={isInFarm}
        isInInventory={isInInventory}
      />
    );
  }, [unlockedPhrasalVerbs, levelColor, handleUnlock, price, coins, farmIds, inventoryIds]);

  const keyExtractor = useCallback((item: PhrasalVerb) => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={levelColor.gradient}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              haptic.heavy(); // 🔥 MEGA HAPTIC
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: levelColor.text }]}>
            {level} Phrasal Verbs
          </Text>
          
          <View style={styles.coinBadge}>
            <Text style={styles.coinText}>💰 {coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: levelColor.text }]}>{stats.unlocked}</Text>
            <Text style={[styles.statLabel, { color: levelColor.text + '99' }]}>Açık</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: levelColor.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: levelColor.text }]}>{stats.locked}</Text>
            <Text style={[styles.statLabel, { color: levelColor.text + '99' }]}>Kilitli</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: levelColor.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: levelColor.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: levelColor.text + '99' }]}>Toplam</Text>
          </View>
        </View>

        {/* Arama */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Phrasal Verb ara..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tümünü Aç Butonu */}
        {stats.locked > 0 && (
          <TouchableOpacity
            style={[styles.unlockAllButton, { backgroundColor: levelColor.border }]}
            onPress={handleUnlockAll}
          >
            <Ionicons name="lock-open" size={18} color="#fff" />
            <Text style={styles.unlockAllText}>
              Tüm {level} Seviyesini Aç ({stats.locked} × {price} = {stats.locked * price} 💰)
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Liste */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredVerbs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#444" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Sonuç bulunamadı' : 'Bu seviyede phrasal verb yok'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  coinBadge: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  coinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
    opacity: 0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 12,
  },
  unlockAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  unlockAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  cardContainer: {
    flex: 1,
    padding: 4,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    minHeight: 160,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  verbText: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  definitionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  definitionIcon: {
    fontSize: 12,
  },
  definitionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  exampleIcon: {
    fontSize: 12,
  },
  exampleText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unlockedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 🌱 Status Badge - Tarlada/Envanterde
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  lockedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockedText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  unlockButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
});
