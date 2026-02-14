import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  InteractionManager,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Search, Coins, ShoppingCart, Sprout, X } from 'lucide-react-native';
import { useFarmStore } from '../store/farmStore';
import { haptic, sound } from '../utils/sound';
import { getSeedDiscountFactor } from '../utils/storePerks';
import JuicyModal from '../components/JuicyModal';
import type { WordModel } from '../models/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 🏷️ Fiyatlandırma (4x)
const SEED_PRICES: Record<string, number> = {
  'A1': 400,
  'A2': 400,
  'B1': 800,
  'B2': 800,
  'C1': 1400,
  'C2': 1400,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  'A1': '#22c55e',
  'A2': '#84cc16',
  'B1': '#eab308',
  'B2': '#f97316',
  'C1': '#ef4444',
  'C2': '#dc2626',
};

const DIFFICULTY_LEVELS = ['Tümü', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface SeedItemProps {
  word: WordModel;
  price: number;
  coins: number;
  onBuy: (word: WordModel, price: number) => void;
  status?: 'available' | 'in-farm' | 'in-inventory';
}

const SeedItem = React.memo(({ word, price, coins, onBuy, status = 'available' }: SeedItemProps) => {
  const canAfford = coins >= price && status === 'available';
  const difficultyColor = DIFFICULTY_COLORS[word.difficulty] || '#888';
  const isOwned = status !== 'available';

  return (
    <View style={[styles.seedItem, isOwned && styles.seedItemOwned]}>
      {/* Sol: Kelime bilgisi */}
      <View style={styles.seedInfo}>
        <View style={styles.seedHeader}>
          <Text style={[styles.seedWord, isOwned && styles.seedWordOwned]}>{word.text}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
            <Text style={styles.difficultyText}>{word.difficulty}</Text>
          </View>
        </View>
        <Text style={[styles.seedMeaning, isOwned && styles.seedMeaningOwned]} numberOfLines={2}>{word.meaning}</Text>
      </View>

      {/* Sağ: Durum veya Satın al butonu */}
      {isOwned ? (
        <View style={[styles.ownedBadge, status === 'in-farm' ? styles.farmBadge : styles.inventoryBadge]}>
          <Text style={styles.ownedBadgeText}>
            {status === 'in-farm' ? '🌱 Tarlada' : '📦 Envanterde'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.buyButton,
            !canAfford && styles.buyButtonDisabled,
          ]}
          onPress={() => onBuy(word, price)}
          disabled={!canAfford}
          activeOpacity={0.7}
        >
          <Coins size={14} color={canAfford ? '#FFD700' : '#666'} />
          <Text style={[styles.buyButtonText, !canAfford && styles.buyButtonTextDisabled]}>
            {price}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Sadece bu proplar değiştiğinde re-render et
  return (
    prevProps.word.id === nextProps.word.id &&
    prevProps.price === nextProps.price &&
    prevProps.coins === nextProps.coins &&
    prevProps.status === nextProps.status
  );
});

export default function SeedMarketScreen() {
  const navigation = useNavigation();
  const pool = useFarmStore(s => s.pool);
  // 🔥 FIX: Sadece ID'leri takip et, tüm farm/inventory array'ini değil
  // Bu sayede sadece ID seti değiştiğinde re-render olur
  const farmLength = useFarmStore(s => s.farm.length);
  const inventoryLength = useFarmStore(s => s.inventory.length);
  const coins = useFarmStore(s => s.coins);
  const ownedItems = useFarmStore(s => s.ownedItems);
  const buySeed = useFarmStore(s => s.buySeed);
  
  // 🔥 Ref ile farm/inventory takibi - re-render tetiklemez
  const farmRef = useRef(useFarmStore.getState().farm);
  const inventoryRef = useRef(useFarmStore.getState().inventory);
  
  // Store değişikliklerini ref'e yaz (re-render tetiklemeden)
  useEffect(() => {
    const unsubscribe = useFarmStore.subscribe((state) => {
      farmRef.current = state.farm;
      inventoryRef.current = state.inventory;
    });
    return unsubscribe;
  }, []);

  const seedDiscountFactor = getSeedDiscountFactor(ownedItems);
  const seedDiscountPercent = Math.round((1 - seedDiscountFactor) * 100);
  const hasSeedDiscount = seedDiscountPercent > 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Tümü');
  
  // 🎯 Modal state'leri
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [lastPurchasedWord, setLastPurchasedWord] = useState<string | null>(null);
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

  // 🗂️ Farm ve inventory ID setleri - useRef ile stabil tut
  // 🔥 FIX: farmRef ve inventoryRef kullan, farm/inventory değil
  
  // UI için memoized versiyonlar (istatistikler için) - length değişikliğinde güncelle
  const farmIds = useMemo(() => new Set(farmRef.current.map(w => w.id)), [farmLength]);
  const inventoryIds = useMemo(() => new Set(inventoryRef.current.map(w => w.id)), [inventoryLength]);

  // 🔍 Tüm kelimeleri filtrele (status bilgisi ile birlikte)
  const availableSeeds = useMemo(() => {
    return pool.filter(word => {
      // Arama filtresi
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesText = word.text.toLowerCase().includes(query);
        const matchesMeaning = word.meaning.toLowerCase().includes(query);
        if (!matchesText && !matchesMeaning) return false;
      }
      
      // Zorluk filtresi
      if (selectedDifficulty !== 'Tümü' && word.difficulty !== selectedDifficulty) {
        return false;
      }
      
      return true;
    });
  }, [pool, searchQuery, selectedDifficulty]);

  // 📊 İstatistikler
  const stats = useMemo(() => {
    const total = pool.length;
    const owned = farmIds.size + inventoryIds.size;
    const available = total - owned;
    return { total, owned, available };
  }, [pool, farmIds, inventoryIds]);

  // 🛒 Satın alma işlemi
  const handleBuy = useCallback((word: WordModel, price: number) => {
    if (coins < price) {
      setModalConfig({
        title: 'Yetersiz Coin',
        titleEmoji: '❌',
        message: `Bu tohumu almak için ${price} coin gerekiyor.`,
        secondaryMessage: `Mevcut bakiyen: ${coins} coin`,
        secondaryEmoji: '💰',
        type: 'error',
        confirmText: 'Tamam',
        onConfirm: undefined, // Sadece kapat butonu
      });
      setModalVisible(true);
      return;
    }

    setModalConfig({
      title: 'Tohum Satın Al',
      titleEmoji: '🌱',
      message: `"${word.text}" kelimesini ${price} coin karşılığında satın almak istiyor musunuz?`,
      secondaryMessage: 'Kelime tarlana "solmuş" olarak eklenecek. Quiz\'lerde doğru cevap vererek onu canlandırmalısın!',
      secondaryEmoji: '⚠️',
      type: 'purchase',
      confirmText: 'Satın Al',
      onConfirm: () => {
        // Modal'ı hemen kapat
        setModalVisible(false);
        
        // State'i biraz geciktirerek temizle
        setTimeout(() => {
          setModalConfig(null);
          
          // Satın alma işlemini yap
          const success = buySeed(word.id, price);
          if (success) {
            haptic.harvestCelebration?.();
            sound.playCoin();
            sound.playPlant();
            
            // 🎉 Başarılı satın alma modalını göster
            setLastPurchasedWord(word.text);
            setSuccessModalVisible(true);
          } else {
            haptic.error();
            sound.playError();
          }
        }, 100);
      },
    });
    setModalVisible(true);
  }, [coins, buySeed]);

  // 📝 Liste öğesi render - Ref kullanarak bağımlılıkları azalt
  const renderItem = useCallback(({ item }: { item: WordModel }) => {
    const basePrice = SEED_PRICES[item.difficulty] || 200;
    const price = Math.max(1, Math.floor(basePrice * seedDiscountFactor));
    
    // 🔥 FIX: Doğrudan ref'lerden oku - re-render tetiklemez
    let status: 'available' | 'in-farm' | 'in-inventory' = 'available';
    const farmItems = farmRef.current;
    const invItems = inventoryRef.current;
    if (farmItems.some(w => w.id === item.id)) {
      status = 'in-farm';
    } else if (invItems.some(w => w.id === item.id)) {
      status = 'in-inventory';
    }
    
    return (
      <SeedItem
        word={item}
        price={price}
        coins={coins}
        onBuy={handleBuy}
        status={status}
      />
    );
  }, [coins, handleBuy, seedDiscountFactor]);

  const keyExtractor = useCallback((item: WordModel) => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              haptic.heavy(); // 🔥 MEGA HAPTIC
              navigation.navigate('Home' as never);
            }}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <ShoppingCart size={24} color="#22c55e" />
            <Text style={styles.headerTitle}>Tohum Pazarı</Text>
          </View>
          
          <View style={styles.coinBadge}>
            <Coins size={18} color="#FFD700" />
            <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.available.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Satılık</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.owned.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Sahip</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
        </View>

        {/* Arama Çubuğu */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Kelime veya anlam ara..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Zorluk Filtreleri */}
        <View style={styles.filterContainer}>
          {DIFFICULTY_LEVELS.map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.filterButton,
                selectedDifficulty === level && styles.filterButtonActive,
                level !== 'Tümü' && { borderColor: DIFFICULTY_COLORS[level] },
              ]}
              onPress={() => {
                haptic.light();
                setSelectedDifficulty(level);
              }}
            >
              <Text style={[
                styles.filterButtonText,
                selectedDifficulty === level && styles.filterButtonTextActive,
                level !== 'Tümü' && selectedDifficulty === level && { color: DIFFICULTY_COLORS[level] },
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Fiyat Bilgisi */}
      <View style={styles.priceInfo}>
        <Text style={styles.priceInfoTitle}>💰 Fiyatlar:</Text>
        {hasSeedDiscount && (
          <Text style={styles.priceInfoDiscount}>🌱 İndirim aktif: %{seedDiscountPercent}</Text>
        )}
        <View style={styles.priceRow}>
          <Text style={[styles.priceTag, { color: DIFFICULTY_COLORS['A1'] }]}>
            A1-A2: {Math.max(1, Math.floor(SEED_PRICES['A1'] * seedDiscountFactor))}
          </Text>
          <Text style={[styles.priceTag, { color: DIFFICULTY_COLORS['B1'] }]}>
            B1-B2: {Math.max(1, Math.floor(SEED_PRICES['B1'] * seedDiscountFactor))}
          </Text>
          <Text style={[styles.priceTag, { color: DIFFICULTY_COLORS['C1'] }]}>
            C1-C2: {Math.max(1, Math.floor(SEED_PRICES['C1'] * seedDiscountFactor))}
          </Text>
        </View>
      </View>

      {/* Kelime Listesi */}
      {availableSeeds.length > 0 ? (
        <FlashList
          data={availableSeeds}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          drawDistance={500}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          extraData={`${farmIds.size}-${inventoryIds.size}-${coins}`}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Sprout size={64} color="#333" />
          <Text style={styles.emptyText}>
            {searchQuery || selectedDifficulty !== 'Tümü'
              ? 'Arama kriterlerine uygun tohum bulunamadı.'
              : 'Tüm tohumları zaten satın aldınız! 🎉'}
          </Text>
        </View>
      )}

      {/* 🎯 Juicy Modal */}
      {modalConfig && (
        <JuicyModal
          visible={modalVisible}
          onClose={() => {
            setModalConfig(null);
            setModalVisible(false);
          }}
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
              onPress: () => {
                setModalConfig(null);
                setModalVisible(false);
              },
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
              onPress: () => {
                setModalConfig(null);
                setModalVisible(false);
              },
            },
          ]}
        />
      )}

      {/* 🎉 Satın Alma Başarılı Modal */}
      <JuicyModal
        visible={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
        title="Tohum Eklendi!"
        titleEmoji="🌱"
        message={`"${lastPurchasedWord}" tohumu tarlana ekildi!`}
        secondaryMessage="Quiz'lerde doğru cevap vererek tohumu büyüt ve meyve ver!"
        secondaryEmoji="💡"
        type="success"
        buttons={[
          {
            text: 'Tamam',
            type: 'cancel',
            onPress: () => setSuccessModalVisible(false),
          },
          {
            text: '🌾 Tarlana Git',
            type: 'primary',
            onPress: () => {
              setSuccessModalVisible(false);
              navigation.navigate('Farm' as never);
            },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  coinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    padding: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderColor: '#22c55e',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  filterButtonTextActive: {
    color: '#22c55e',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  priceInfoTitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  priceInfoDiscount: {
    fontSize: 11,
    color: 'rgba(255, 215, 0, 0.85)',
    fontWeight: '800',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 16,
  },
  priceTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },
  seedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seedInfo: {
    flex: 1,
    marginRight: 12,
  },
  seedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  seedWord: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  seedMeaning: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
  },
  seedType: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  buyButtonDisabled: {
    backgroundColor: 'rgba(100,100,100,0.2)',
    borderColor: '#444',
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  buyButtonTextDisabled: {
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  // 🏷️ Owned item styles
  seedItemOwned: {
    opacity: 0.6,
    backgroundColor: 'rgba(100,100,100,0.1)',
  },
  seedWordOwned: {
    color: '#888',
  },
  seedMeaningOwned: {
    color: '#666',
  },
  ownedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  farmBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: '#22c55e',
  },
  inventoryBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: '#3b82f6',
  },
  ownedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
  },
});
